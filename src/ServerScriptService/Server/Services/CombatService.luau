--!strict
--[[
	CombatService.luau
	Validacion autoritativa de combate. El cliente solo pide "atacar al enemigo
	X"; el servidor decide si el golpe es legal y cuanto dano hace.

	Defensas implementadas:
	1. Cooldown por jugador con tolerancia de latencia -> bloquea fast-attack.
	2. Ventana deslizante de peticiones por segundo -> bloquea macros de spam.
	3. Distancia validada con Magnitude contra la posicion real del personaje.
	4. Verificacion de que el enemigo existe, esta vivo y no es ya un cadaver.
	5. Acumulador de infracciones: tras N strikes el jugador es expulsado.
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local StatCalculator = require(Shared.Modules.StatCalculator)
local NetBridge = require(Shared.Network.NetBridge)

local DataService = require(script.Parent.DataService)
local EnemyNPC = require(script.Parent.Parent.Components.EnemyNPC)

local RATE_WINDOW = 1.0
local MAX_REQUESTS_PER_WINDOW = 6

export type AttackResult = {
	Accepted: boolean,
	Damage: number,
	Killed: boolean,
	Reason: string?,
}

local CombatService = {}

-- Estado anti-exploit por jugador.
type CombatState = {
	LastAttackAt: number,
	RecentRequests: { number },
	Strikes: number,
}

local states: { [Player]: CombatState } = {}
local connections: { any } = {}

-- Hook que ShadowServerService/DungeonService conectan sin crear ciclos de require.
CombatService.OnEnemyKilled = nil :: ((player: Player, enemy: any) -> ())?
CombatService.KickOnStrikeLimit = true

local function getState(player: Player): CombatState
	local state = states[player]
	if not state then
		state = { LastAttackAt = 0, RecentRequests = {}, Strikes = 0 }
		states[player] = state
	end
	return state
end

local function flagExploit(player: Player, reason: string)
	local state = getState(player)
	state.Strikes += 1
	warn(`[CombatService] {player.Name} strike {state.Strikes}: {reason}`)
	if state.Strikes >= Config.EXPLOIT_STRIKES_BEFORE_KICK and CombatService.KickOnStrikeLimit then
		player:Kick("Actividad de combate invalida detectada.")
	end
end

function CombatService.GetStrikes(player: Player): number
	return getState(player).Strikes
end

local function getCharacterPosition(player: Player): Vector3?
	local character = player.Character
	if not character then
		return nil
	end
	local root = character:FindFirstChild("HumanoidRootPart")
	return if root and root:IsA("BasePart") then root.Position else nil
end

--[[
	Punto de entrada unico para un intento de ataque.
	`now` y `attackerPosition` son inyectables para las pruebas de integracion.
]]
function CombatService.TryAttack(
	player: Player,
	enemyGuid: string,
	now: number?,
	attackerPosition: Vector3?
): AttackResult
	local timestamp = now or os.clock()
	local state = getState(player)

	-- 1. Ventana deslizante de peticiones.
	local requests = state.RecentRequests
	for index = #requests, 1, -1 do
		if timestamp - requests[index] > RATE_WINDOW then
			table.remove(requests, index)
		end
	end
	if #requests >= MAX_REQUESTS_PER_WINDOW then
		flagExploit(player, "rate limit excedido")
		return { Accepted = false, Damage = 0, Killed = false, Reason = "RateLimited" }
	end
	table.insert(requests, timestamp)

	-- 2. Cooldown (fast-attack).
	local elapsed = timestamp - state.LastAttackAt
	if elapsed < (Config.ATTACK_COOLDOWN - Config.ATTACK_COOLDOWN_TOLERANCE) then
		flagExploit(player, `cooldown {string.format("%.3f", elapsed)}s`)
		return { Accepted = false, Damage = 0, Killed = false, Reason = "Cooldown" }
	end

	-- 3. Validaciones de datos y objetivo.
	if typeof(enemyGuid) ~= "string" then
		return { Accepted = false, Damage = 0, Killed = false, Reason = "BadPayload" }
	end
	local profile = DataService.GetProfile(player)
	if not profile then
		return { Accepted = false, Damage = 0, Killed = false, Reason = "NoProfile" }
	end
	local enemy = EnemyNPC.Get(enemyGuid)
	if not enemy or not enemy:IsAlive() then
		return { Accepted = false, Damage = 0, Killed = false, Reason = "InvalidTarget" }
	end

	-- 4. Distancia real con Magnitude.
	local origin = attackerPosition or getCharacterPosition(player)
	if not origin then
		return { Accepted = false, Damage = 0, Killed = false, Reason = "NoCharacter" }
	end
	local distance = (enemy:GetPosition() - origin).Magnitude
	if distance > (Config.ATTACK_RANGE + Config.ATTACK_RANGE_TOLERANCE) then
		flagExploit(player, `distancia {string.format("%.1f", distance)}`)
		return { Accepted = false, Damage = 0, Killed = false, Reason = "OutOfRange" }
	end

	-- El golpe es legal: solo aqui se consume el cooldown.
	state.LastAttackAt = timestamp

	local damage = StatCalculator.GetProfileDamage(profile)
	local applied, killed = enemy:TakeDamage(damage, player.UserId)

	NetBridge.FireClient(NetBridge.Events.DamageDealt, player, enemyGuid, applied, false)

	if killed then
		DataService.GrantExperience(player, enemy.State.Definition.ExperienceReward)
		DataService.AddCurrency(player, "Gold", enemy.State.Definition.GoldReward)
		if CombatService.OnEnemyKilled then
			CombatService.OnEnemyKilled(player, enemy)
		end
	end

	return { Accepted = true, Damage = applied, Killed = killed }
end

-- Dano proveniente de una Sombra simulada (sin jugador en el origen del input).
function CombatService.ApplyShadowDamage(ownerUserId: number, enemyGuid: string, damage: number): AttackResult
	local enemy = EnemyNPC.Get(enemyGuid)
	if not enemy or not enemy:IsAlive() or damage <= 0 then
		return { Accepted = false, Damage = 0, Killed = false, Reason = "InvalidTarget" }
	end
	local applied, killed = enemy:TakeDamage(damage, ownerUserId)
	local player = Players:GetPlayerByUserId(ownerUserId)
	if player then
		NetBridge.FireClient(NetBridge.Events.DamageDealt, player, enemyGuid, applied, true)
		if killed then
			DataService.GrantExperience(player, enemy.State.Definition.ExperienceReward)
			DataService.AddCurrency(player, "Gold", enemy.State.Definition.GoldReward)
			if CombatService.OnEnemyKilled then
				CombatService.OnEnemyKilled(player, enemy)
			end
		end
	end
	return { Accepted = true, Damage = applied, Killed = killed }
end

function CombatService.SpawnEnemy(enemyId: string, position: Vector3, model: Model?): any?
	local definition = Config.Enemies[enemyId]
	if not definition then
		warn(`[CombatService] enemigo desconocido: {enemyId}`)
		return nil
	end
	return EnemyNPC.new(definition, position, model)
end

function CombatService.Init() end

function CombatService.Start()
	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.RequestAttack, function(player, enemyGuid)
		CombatService.TryAttack(player, enemyGuid)
	end))

	table.insert(connections, Players.PlayerRemoving:Connect(function(player)
		states[player] = nil
	end))
end

function CombatService.Stop()
	for _, connection in connections do
		if typeof(connection) == "RBXScriptConnection" then
			if connection.Connected then
				connection:Disconnect()
			end
		else
			connection:Disconnect()
		end
	end
	table.clear(connections)
	table.clear(states)
end

return CombatService
