--!strict
--[[
	DungeonService.luau
	Portales dinamicos + instancias privadas via TeleportService + evento
	"Double Dungeon".

	Servidor de mundo:
		- Temporizador maestro que genera un portal cada 15-30 min.
		- Al entrar un grupo: ReserveServer + TeleportPartyAsync.

	Servidor de mazmorra (misma clase, detectada por TeleportData):
		- Fase 1: jefe inicial.
		- Al caer el jefe -> Double Dungeon: reinicia el temporizador, respawnea
		  enemigos con estadisticas duplicadas y abre la camara de Statue of God.
		- Al caer Statue of God -> IsAwakened = true + titulo Awakened (+60% Rank Up Luck).
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TeleportService = game:GetService("TeleportService")
local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local NetBridge = require(Shared.Network.NetBridge)

local DataService = require(script.Parent.DataService)
local CombatService = require(script.Parent.CombatService)
local EnemyNPC = require(script.Parent.Parent.Components.EnemyNPC)

local MAP_BOUNDS = { Min = Vector3.new(-512, 8, -512), Max = Vector3.new(512, 8, 512) }
local TELEPORT_RETRIES = 4

local DungeonService = {}

export type DungeonPhase = "Lobby" | "Phase1" | "DoubleDungeon" | "Cleared"

DungeonService.IsDungeonServer = false
DungeonService.Phase = "Lobby" :: DungeonPhase
DungeonService.PhaseDeadline = 0

local activePortals: { [string]: { Guid: string, Position: Vector3, Part: BasePart?, ExpiresAt: number, Party: { Player } } } = {}
local connections: { any } = {}
local portalThread: thread? = nil
local rng = Random.new(os.time())

-- Portales ------------------------------------------------------------------

local function randomMapPosition(): Vector3
	return Vector3.new(
		rng:NextNumber(MAP_BOUNDS.Min.X, MAP_BOUNDS.Max.X),
		MAP_BOUNDS.Min.Y,
		rng:NextNumber(MAP_BOUNDS.Min.Z, MAP_BOUNDS.Max.Z)
	)
end

function DungeonService.SpawnPortal(position: Vector3?): string
	local guid = game:GetService("HttpService"):GenerateGUID(false)
	local finalPosition = position or randomMapPosition()

	local part: BasePart? = nil
	if not RunService:IsRunning() then
		part = nil
	else
		local portal = Instance.new("Part")
		portal.Name = `Portal_{guid}`
		portal.Shape = Enum.PartType.Cylinder
		portal.Size = Vector3.new(1, 16, 16)
		portal.CFrame = CFrame.new(finalPosition) * CFrame.Angles(0, 0, math.rad(90))
		portal.Anchored = true
		portal.CanCollide = false
		portal.Material = Enum.Material.Neon
		portal.Color = Color3.fromRGB(70, 120, 255)
		portal:SetAttribute("PortalGuid", guid)
		portal.Parent = Workspace

		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "ENTRAR"
		prompt.ObjectText = "Portal de Mazmorra"
		prompt.HoldDuration = 1
		prompt.MaxActivationDistance = 16
		prompt.Parent = portal
		table.insert(connections, prompt.Triggered:Connect(function(player)
			DungeonService.EnterPortal(player, guid)
		end))
		part = portal
	end

	activePortals[guid] = {
		Guid = guid,
		Position = finalPosition,
		Part = part,
		ExpiresAt = os.clock() + Config.PORTAL_LIFETIME,
		Party = {},
	}

	NetBridge.FireAllClients(NetBridge.Events.PortalSpawned, guid, finalPosition)

	task.delay(Config.PORTAL_LIFETIME, function()
		DungeonService.RemovePortal(guid)
	end)

	return guid
end

function DungeonService.RemovePortal(guid: string)
	local portal = activePortals[guid]
	if not portal then
		return
	end
	activePortals[guid] = nil
	if portal.Part then
		portal.Part:Destroy()
	end
	NetBridge.FireAllClients(NetBridge.Events.PortalRemoved, guid)
end

function DungeonService.GetPortals()
	return activePortals
end

--[[
	Entrada al portal: agrupa jugadores cercanos, reserva un servidor privado y
	teletransporta al grupo completo. Los reintentos cubren fallos transitorios
	del servicio de teleportacion.
]]
function DungeonService.EnterPortal(player: Player, guid: string): boolean
	local portal = activePortals[guid]
	if not portal then
		return false
	end
	if table.find(portal.Party, player) then
		return false
	end
	if #portal.Party >= Config.PORTAL_MAX_PARTY then
		NetBridge.FireClient(NetBridge.Events.Notify, player, "El grupo del portal esta lleno.")
		return false
	end
	if not DataService.GetProfile(player) then
		return false
	end
	table.insert(portal.Party, player)

	-- Sin PlaceId configurado no se teletransporta (evita expulsar al jugador
	-- a un lugar inexistente en desarrollo).
	if Config.DUNGEON_PLACE_ID == 0 then
		NetBridge.FireClient(NetBridge.Events.Notify, player, "Mazmorra no configurada (DUNGEON_PLACE_ID = 0).")
		return false
	end

	task.spawn(function()
		-- Pequena ventana para que se sume el resto del grupo.
		task.wait(3)
		local party = table.clone(portal.Party)
		DungeonService.RemovePortal(guid)
		DungeonService.TeleportParty(party)
	end)
	return true
end

function DungeonService.TeleportParty(party: { Player }): boolean
	if #party == 0 then
		return false
	end
	local reservedCode: string? = nil
	for attempt = 1, TELEPORT_RETRIES do
		local ok, code = pcall(function()
			return TeleportService:ReserveServer(Config.DUNGEON_PLACE_ID)
		end)
		if ok and code then
			reservedCode = code
			break
		end
		task.wait(2 ^ attempt)
	end
	if not reservedCode then
		for _, player in party do
			NetBridge.FireClient(NetBridge.Events.Notify, player, "No se pudo reservar la mazmorra. Intenta de nuevo.")
		end
		return false
	end

	local options = Instance.new("TeleportOptions")
	options.ReservedServerAccessCode = reservedCode
	options:SetTeleportData({ IsDungeon = true, Phase = "Phase1" })

	for attempt = 1, TELEPORT_RETRIES do
		local ok, err = pcall(function()
			TeleportService:TeleportPartyAsync(Config.DUNGEON_PLACE_ID, party, options)
		end)
		if ok then
			return true
		end
		warn(`[DungeonService] TeleportPartyAsync fallo ({attempt}): {err}`)
		task.wait(2 ^ attempt)
	end
	return false
end

-- Logica del servidor de mazmorra -------------------------------------------

local function spawnWave(multiplier: number)
	local enemies = { "BlueKnight", "IceWolf", "AntKing" }
	for index, enemyId in enemies do
		local base = Config.Enemies[enemyId]
		local scaled: Types.EnemyDefinition = {
			Id = base.Id,
			Name = base.Name,
			Level = math.floor(base.Level * multiplier),
			MaxHealth = base.MaxHealth * multiplier,
			Damage = base.Damage * multiplier,
			ShadowId = base.ShadowId,
			ExperienceReward = math.floor(base.ExperienceReward * multiplier),
			GoldReward = math.floor(base.GoldReward * multiplier),
		}
		EnemyNPC.new(scaled, Vector3.new(index * 12, 8, 0))
	end
end

function DungeonService.SetPhase(phase: DungeonPhase)
	DungeonService.Phase = phase
	DungeonService.PhaseDeadline = os.clock() + Config.DOUBLE_DUNGEON_TIMER
	NetBridge.FireAllClients(NetBridge.Events.DungeonPhaseChanged, phase, Config.DOUBLE_DUNGEON_TIMER)
end

--[[ Se dispara al morir el jefe de fase 1: arranca el Double Dungeon. ]]
function DungeonService.StartDoubleDungeon()
	if DungeonService.Phase == "DoubleDungeon" then
		return
	end
	DungeonService.SetPhase("DoubleDungeon")
	-- Reinicia el temporizador de instancia y respawnea con estadisticas dobles.
	spawnWave(Config.DOUBLE_DUNGEON_STAT_MULTIPLIER)
	-- Desbloquea la camara final del jefe.
	local chamber = Workspace:FindFirstChild("StatueChamberDoor")
	if chamber and chamber:IsA("BasePart") then
		chamber.CanCollide = false
		chamber.Transparency = 1
	end
	EnemyNPC.new(Config.Enemies.StatueOfGod, Vector3.new(0, 8, 120))
end

--[[ Recompensa final: despertar del jugador. ]]
function DungeonService.AwakenPlayer(player: Player)
	if DataService.SetAwakened(player, "Awakened") then
		NetBridge.FireClient(
			NetBridge.Events.Notify,
			player,
			`Has despertado. Titulo Awakened obtenido (+{math.floor(Config.AWAKENED_RANK_UP_LUCK * 100)}% Rank Up Luck).`
		)
	end
end

function DungeonService.HandleBossDefeat(player: Player, enemy: any)
	local enemyId = enemy.State.Definition.Id
	if enemyId == "StatueOfGod" then
		DungeonService.SetPhase("Cleared")
		-- Todo el grupo presente en la instancia despierta.
		for _, participant in Players:GetPlayers() do
			DungeonService.AwakenPlayer(participant)
		end
	elseif enemyId == "AntKing" or enemyId == "ShadowCommander" then
		DungeonService.StartDoubleDungeon()
	end
end

function DungeonService.Init()
	-- Encadena el hook de CombatService sin pisar al de ShadowServerService.
	local previous = CombatService.OnEnemyKilled
	CombatService.OnEnemyKilled = function(player, enemy)
		if previous then
			previous(player, enemy)
		end
		if DungeonService.IsDungeonServer then
			DungeonService.HandleBossDefeat(player, enemy)
		end
	end
end

function DungeonService.Start()
	-- Un servidor reservado (PrivateServerId no vacio y sin dueno) es una mazmorra.
	DungeonService.IsDungeonServer = game.PrivateServerId ~= "" and game.PrivateServerOwnerId == 0

	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.EnterPortal, function(player, guid)
		if typeof(guid) == "string" then
			DungeonService.EnterPortal(player, guid)
		end
	end))

	if DungeonService.IsDungeonServer then
		DungeonService.SetPhase("Phase1")
		spawnWave(1)
		return
	end

	-- Temporizador maestro de portales (solo en el mundo abierto).
	portalThread = task.spawn(function()
		while true do
			task.wait(rng:NextNumber(Config.PORTAL_MIN_INTERVAL, Config.PORTAL_MAX_INTERVAL))
			if #Players:GetPlayers() > 0 then
				DungeonService.SpawnPortal()
			end
		end
	end)
end

function DungeonService.Stop()
	if portalThread then
		task.cancel(portalThread)
		portalThread = nil
	end
	for guid in activePortals do
		DungeonService.RemovePortal(guid)
	end
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
end

return DungeonService
