--!strict
--[[
	ShadowServerService.luau
	Dos responsabilidades:

	A) Extraccion ("Arise"): maquina de estados del cadaver inerte, 3 intentos
	   maximos, reemplazo automatico del escuadron y conversion a gemas.

	B) Simulacion de Sombras: el servidor mantiene SOLO posiciones logicas
	   (Vector3) y una FSM por Sombra. No instancia modelos, no usa Humanoid ni
	   fisica. Cada 0.1 s emite un snapshot por UnreliableRemoteEvent; el cliente
	   interpola. Asi el Heartbeat del servidor no depende del numero de Sombras.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local StatCalculator = require(Shared.Modules.StatCalculator)
local NetBridge = require(Shared.Network.NetBridge)

local DataService = require(script.Parent.DataService)
local CombatService = require(script.Parent.CombatService)
local EnemyNPC = require(script.Parent.Parent.Components.EnemyNPC)

-- Codificacion compacta de la FSM para el snapshot (1 numero en vez de string).
local STATE_CODES: { [Types.ShadowFsmState]: number } = {
	Idle = 0, Follow = 1, Chase = 2, Attack = 3, Return = 4,
}

local ShadowServerService = {}

local runtimeByPlayer: { [Player]: { Types.ShadowRuntime } } = {}
local connections: { any } = {}
local accumulator = 0
local rng = Random.new(os.clock() * 1e6 % 2 ^ 31)

--[[
	Fuente de aleatoriedad inyectable. Las pruebas la sustituyen por una
	secuencia determinista en lugar de mutar el balance compartido de Config
	(lo que provocaria carreras entre jugadores simulados en paralelo).
]]
function ShadowServerService.SetRandomSource(source: { NextNumber: (any) -> number })
	rng = source :: any
end

-- Utilidades ---------------------------------------------------------------

local function getPlayerPosition(player: Player): Vector3?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	return if root and root:IsA("BasePart") then root.Position else nil
end

local function makeShadowData(definition: Types.ShadowDefinition): Types.ShadowData
	return {
		UUID = HttpService:GenerateGUID(false),
		Id = definition.Id,
		Name = definition.Name,
		Tier = definition.Tier,
		Level = 1,
		BaseDamage = definition.BaseDamage,
		Experience = 0,
	}
end

--[[
	Reemplazo automatico de escuadron.
	Si el escuadron esta lleno (4/4), desequipa la Sombra con MENOR BaseDamage
	efectivo y coloca la nueva en su lugar. Devuelve el UUID desplazado, o nil
	si no hizo falta reemplazar. Si la nueva es peor que todas las activas, no
	se reemplaza nada (se queda en el inventario).
]]
function ShadowServerService.AutoEquip(profile: Types.PlayerProfile, newShadow: Types.ShadowData): string?
	local equipped = profile.EquippedShadows

	if #equipped < Config.MAX_EQUIPPED_SHADOWS then
		table.insert(equipped, newShadow.UUID)
		return nil
	end

	local worstIndex: number? = nil
	local worstDamage = math.huge
	for index, uuid in equipped do
		local shadow = profile.ShadowsInventory[uuid]
		local damage = if shadow then StatCalculator.GetShadowDamage(shadow, profile.Stats) else -1
		if damage < worstDamage then
			worstDamage = damage
			worstIndex = index
		end
	end

	local newDamage = StatCalculator.GetShadowDamage(newShadow, profile.Stats)
	if worstIndex and newDamage > worstDamage then
		local replaced = equipped[worstIndex]
		equipped[worstIndex] = newShadow.UUID
		return replaced
	end
	return nil
end

-- Descartar el cadaver y pagar gemas.
local function convertToGems(player: Player, enemy: any): number
	local gems = StatCalculator.GetGemsForEnemy(enemy.State.Definition)
	DataService.AddCurrency(player, "Gems", gems)
	NetBridge.FireAllClients(NetBridge.Events.EnemyRemoved, enemy.State.Guid)
	enemy:Destroy()
	return gems
end

--[[
	Intento de extraccion. Devuelve siempre un AriseResult (nunca lanza) para
	que el cliente pueda mostrar el fallo sin ambiguedad.
]]
function ShadowServerService.AttemptArise(player: Player, enemyGuid: string): Types.AriseResult
	local profile = DataService.GetProfile(player)
	if not profile then
		return { Success = false, AttemptsLeft = 0, Chance = 0, Reason = "NoProfile" }
	end
	if typeof(enemyGuid) ~= "string" then
		return { Success = false, AttemptsLeft = 0, Chance = 0, Reason = "BadPayload" }
	end

	local enemy = EnemyNPC.Get(enemyGuid)
	if not enemy or not enemy.State.Inert then
		return { Success = false, AttemptsLeft = 0, Chance = 0, Reason = "InvalidTarget" }
	end
	-- Solo quien asesto el ultimo golpe puede extraer.
	if enemy.State.KillerUserId ~= player.UserId then
		return { Success = false, AttemptsLeft = 0, Chance = 0, Reason = "NotOwner" }
	end
	if enemy.State.AriseAttempts >= Config.MAX_ARISE_ATTEMPTS then
		return { Success = false, AttemptsLeft = 0, Chance = 0, Reason = "NoAttemptsLeft" }
	end

	-- Distancia validada en servidor (el ProximityPrompt del cliente no basta).
	local origin = getPlayerPosition(player)
	if origin then
		local distance = (enemy:GetPosition() - origin).Magnitude
		if distance > Config.ARISE_RANGE + Config.ATTACK_RANGE_TOLERANCE then
			return { Success = false, AttemptsLeft = Config.MAX_ARISE_ATTEMPTS - enemy.State.AriseAttempts, Chance = 0, Reason = "OutOfRange" }
		end
	end

	enemy.State.AriseAttempts += 1
	local attemptsLeft = Config.MAX_ARISE_ATTEMPTS - enemy.State.AriseAttempts

	local definition = Config.Shadows[enemy.State.Definition.ShadowId]
	if not definition then
		return { Success = false, AttemptsLeft = attemptsLeft, Chance = 0, Reason = "NoShadowDefinition" }
	end

	local chance = StatCalculator.GetAriseChance(definition.BaseAriseChance, StatCalculator.GetAriseLuck(profile))
	local roll = rng:NextNumber()

	if roll <= chance then
		local shadow = makeShadowData(definition)
		profile.ShadowsInventory[shadow.UUID] = shadow
		local replaced = ShadowServerService.AutoEquip(profile, shadow)

		NetBridge.FireAllClients(NetBridge.Events.EnemyRemoved, enemy.State.Guid)
		enemy:Destroy()

		ShadowServerService.RebuildRuntime(player)
		DataService.PushProfile(player)

		local result: Types.AriseResult = {
			Success = true,
			AttemptsLeft = attemptsLeft,
			Chance = chance,
			Shadow = shadow,
			ReplacedUUID = replaced,
		}
		NetBridge.FireClient(NetBridge.Events.AriseResult, player, result)
		return result
	end

	local result: Types.AriseResult = { Success = false, AttemptsLeft = attemptsLeft, Chance = chance }
	if attemptsLeft <= 0 then
		-- Agotados los 3 intentos: el cadaver se convierte en gemas.
		result.GemsAwarded = convertToGems(player, enemy)
		result.Reason = "Exhausted"
	end
	NetBridge.FireClient(NetBridge.Events.AriseResult, player, result)
	return result
end

-- El jugador rechaza el cadaver antes de gastar los intentos.
function ShadowServerService.DeclineArise(player: Player, enemyGuid: string): number
	local enemy = EnemyNPC.Get(enemyGuid)
	if not enemy or not enemy.State.Inert or enemy.State.KillerUserId ~= player.UserId then
		return 0
	end
	return convertToGems(player, enemy)
end

-- Equipar / desequipar manualmente ------------------------------------------

function ShadowServerService.EquipShadow(player: Player, uuid: string): boolean
	local profile = DataService.GetProfile(player)
	if not profile or typeof(uuid) ~= "string" then
		return false
	end
	local shadow = profile.ShadowsInventory[uuid]
	if not shadow or table.find(profile.EquippedShadows, uuid) then
		return false
	end
	if #profile.EquippedShadows >= Config.MAX_EQUIPPED_SHADOWS then
		return false
	end
	table.insert(profile.EquippedShadows, uuid)
	ShadowServerService.RebuildRuntime(player)
	DataService.PushProfile(player)
	return true
end

function ShadowServerService.UnequipShadow(player: Player, uuid: string): boolean
	local profile = DataService.GetProfile(player)
	if not profile then
		return false
	end
	local index = table.find(profile.EquippedShadows, uuid)
	if not index then
		return false
	end
	table.remove(profile.EquippedShadows, index)
	ShadowServerService.RebuildRuntime(player)
	DataService.PushProfile(player)
	return true
end

-- Simulacion ----------------------------------------------------------------

--[[ Reconstruye el estado en memoria a partir del escuadron equipado. ]]
function ShadowServerService.RebuildRuntime(player: Player)
	local profile = DataService.GetProfile(player)
	if not profile then
		runtimeByPlayer[player] = nil
		return
	end

	local previous = runtimeByPlayer[player] or {}
	local byUuid: { [string]: Types.ShadowRuntime } = {}
	for _, runtime in previous do
		byUuid[runtime.UUID] = runtime
	end

	local origin = getPlayerPosition(player) or Vector3.zero
	local list: { Types.ShadowRuntime } = {}

	for slot, uuid in profile.EquippedShadows do
		local shadow = profile.ShadowsInventory[uuid]
		if not shadow then
			continue
		end
		local runtime = byUuid[uuid]
		if runtime then
			runtime.SlotIndex = slot
			runtime.Damage = StatCalculator.GetShadowDamage(shadow, profile.Stats)
		else
			local angle = (slot / Config.MAX_EQUIPPED_SHADOWS) * math.pi * 2
			runtime = {
				UUID = uuid,
				Id = shadow.Id,
				OwnerUserId = player.UserId,
				SlotIndex = slot,
				State = "Follow",
				Position = origin + Vector3.new(math.cos(angle), 0, math.sin(angle)) * Config.SHADOW_FOLLOW_RADIUS,
				TargetGuid = nil,
				LastAttackAt = 0,
				Damage = StatCalculator.GetShadowDamage(shadow, profile.Stats),
			}
		end
		table.insert(list, runtime)
	end

	runtimeByPlayer[player] = list
	NetBridge.FireAllClients(NetBridge.Events.ShadowsEquippedChanged, player.UserId, profile.EquippedShadows)
end

-- Punto de formacion de una Sombra alrededor de su dueno.
local function getFormationPoint(origin: Vector3, slot: number): Vector3
	local angle = (slot / Config.MAX_EQUIPPED_SHADOWS) * math.pi * 2
	return origin + Vector3.new(math.cos(angle), 0, math.sin(angle)) * Config.SHADOW_FOLLOW_RADIUS
end

-- Busca el enemigo vivo mas cercano dentro del radio de agresion.
local function findTarget(position: Vector3): (string?, Vector3?)
	local bestGuid: string? = nil
	local bestPosition: Vector3? = nil
	local bestDistance = Config.SHADOW_AGGRO_RADIUS
	for guid, enemy in EnemyNPC.GetAll() do
		if not enemy:IsAlive() then
			continue
		end
		local enemyPosition = enemy:GetPosition()
		local distance = (enemyPosition - position).Magnitude
		if distance < bestDistance then
			bestDistance = distance
			bestGuid = guid
			bestPosition = enemyPosition
		end
	end
	return bestGuid, bestPosition
end

--[[
	Un paso de la FSM. Es determinista y sin Instances salvo la lectura de la
	posicion del dueno, por lo que puede ejecutarse en pruebas con dt fijo.
]]
function ShadowServerService.StepShadow(runtime: Types.ShadowRuntime, ownerPosition: Vector3, dt: number, now: number)
	local target = if runtime.TargetGuid then EnemyNPC.Get(runtime.TargetGuid) else nil
	if target and not target:IsAlive() then
		target = nil
		runtime.TargetGuid = nil
	end

	local distanceToOwner = (runtime.Position - ownerPosition).Magnitude

	-- Correa: demasiado lejos del dueno -> vuelve a formacion, ignora objetivos.
	if distanceToOwner > Config.SHADOW_LEASH_DISTANCE then
		runtime.State = "Return"
		runtime.TargetGuid = nil
		target = nil
	end

	if not target and runtime.State ~= "Return" then
		local guid, _ = findTarget(runtime.Position)
		if guid then
			runtime.TargetGuid = guid
			runtime.State = "Chase"
			target = EnemyNPC.Get(guid)
		end
	end

	local destination: Vector3
	if target then
		local targetPosition = target:GetPosition()
		local distance = (targetPosition - runtime.Position).Magnitude
		if distance <= Config.SHADOW_ATTACK_RANGE then
			runtime.State = "Attack"
			destination = runtime.Position
			if now - runtime.LastAttackAt >= Config.SHADOW_ATTACK_COOLDOWN then
				runtime.LastAttackAt = now
				CombatService.ApplyShadowDamage(runtime.OwnerUserId, target.State.Guid, runtime.Damage)
				local owner = Players:GetPlayerByUserId(runtime.OwnerUserId)
				if owner then
					-- El cliente reproduce animacion, particulas y numeros flotantes.
					NetBridge.FireAllClients(NetBridge.Events.ShadowAttack, runtime.UUID, target.State.Guid)
				end
			end
		else
			runtime.State = "Chase"
			destination = targetPosition
		end
	else
		local formation = getFormationPoint(ownerPosition, runtime.SlotIndex)
		destination = formation
		runtime.State = if (formation - runtime.Position).Magnitude < 1.5 then "Idle" else "Follow"
	end

	-- Integracion logica del movimiento (sin fisica ni Humanoid).
	local delta = destination - runtime.Position
	local length = delta.Magnitude
	if length > 0.05 then
		local step = math.min(Config.SHADOW_MOVE_SPEED * dt, length)
		runtime.Position += delta.Unit * step
	end
end

local function broadcastSnapshots()
	for player, list in runtimeByPlayer do
		if #list == 0 then
			continue
		end
		local snapshots: { Types.ShadowSnapshot } = table.create(#list)
		for _, runtime in list do
			table.insert(snapshots, {
				uuid = runtime.UUID,
				id = runtime.Id,
				slot = runtime.SlotIndex,
				px = runtime.Position.X,
				py = runtime.Position.Y,
				pz = runtime.Position.Z,
				st = STATE_CODES[runtime.State],
			})
		end
		-- Se envia a todos para que cada cliente renderice las Sombras ajenas;
		-- el paquete es no fiable: un snapshot perdido se corrige en 0.1 s.
		for _, receiver in Players:GetPlayers() do
			NetBridge.FireUnreliableClient(NetBridge.Unreliable.ShadowSnapshot, receiver, player.UserId, snapshots)
		end
	end
end

function ShadowServerService.Update(dt: number, now: number?)
	local timestamp = now or os.clock()
	for player, list in runtimeByPlayer do
		local ownerPosition = getPlayerPosition(player)
		if not ownerPosition then
			continue
		end
		for _, runtime in list do
			ShadowServerService.StepShadow(runtime, ownerPosition, dt, timestamp)
		end
	end
end

function ShadowServerService.GetRuntime(player: Player): { Types.ShadowRuntime }
	return runtimeByPlayer[player] or {}
end

function ShadowServerService.Init()
	-- Al morir un enemigo, avisar al cliente del duenno para que muestre el prompt.
	CombatService.OnEnemyKilled = function(player, enemy)
		enemy.OnDestroyed = function()
			NetBridge.FireAllClients(NetBridge.Events.EnemyRemoved, enemy.State.Guid)
		end
		NetBridge.FireClient(
			NetBridge.Events.EnemyInert,
			player,
			enemy.State.Guid,
			enemy.State.Definition.Id,
			Config.MAX_ARISE_ATTEMPTS
		)
	end
end

function ShadowServerService.Start()
	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.AttemptArise, function(player, guid)
		ShadowServerService.AttemptArise(player, guid)
	end))
	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.DeclineArise, function(player, guid)
		ShadowServerService.DeclineArise(player, guid)
	end))
	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.EquipShadow, function(player, uuid)
		ShadowServerService.EquipShadow(player, uuid)
	end))
	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.UnequipShadow, function(player, uuid)
		ShadowServerService.UnequipShadow(player, uuid)
	end))

	table.insert(connections, Players.PlayerAdded:Connect(function(player)
		task.spawn(function()
			if DataService.WaitForProfile(player, 20) then
				ShadowServerService.RebuildRuntime(player)
			end
		end)
		table.insert(connections, player.CharacterAdded:Connect(function()
			task.defer(ShadowServerService.RebuildRuntime, player)
		end))
	end))

	table.insert(connections, Players.PlayerRemoving:Connect(function(player)
		runtimeByPlayer[player] = nil
	end))

	table.insert(connections, RunService.Heartbeat:Connect(function(dt)
		ShadowServerService.Update(dt)
		accumulator += dt
		if accumulator >= Config.SHADOW_TICK_RATE then
			accumulator -= Config.SHADOW_TICK_RATE
			broadcastSnapshots()
		end
	end))
end

function ShadowServerService.Stop()
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
	table.clear(runtimeByPlayer)
end

return ShadowServerService
