--!strict
--[[
	DataService.luau
	Persistencia atomica con ProfileService (session locking) y unica puerta de
	entrada para modificar el perfil de un jugador.

	Decisiones clave:
	- Session locking: ProfileService no permite dos servidores con el mismo
	  perfil activo. Si otro servidor lo tiene tomado, :LoadProfileAsync con
	  "ForceLoad" reintenta hasta robar la sesion o expirar; si expira, el
	  jugador es expulsado en lugar de jugar con datos vacios (anti-duplicacion).
	- Toda mutacion pasa por funciones que validan EN EL SERVIDOR. El cliente
	  nunca envia valores numericos de dano, vida u oro.
	- PlayerRemoving guarda y libera la clave del perfil atomicamente.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local StatCalculator = require(Shared.Modules.StatCalculator)
local NetBridge = require(Shared.Network.NetBridge)

local PROFILE_STORE_KEY = "PlayerProfiles_v1"
local FORCE_LOAD_TIMEOUT = 30

local DEFAULT_PROFILE: Types.PlayerProfile = {
	Level = 1,
	Experience = 0,
	Rank = "E",
	Gold = 0,
	Gems = 0,
	Tickets = 0,
	Stats = {
		STR = 0,
		INT = 0,
		SDW = 0,
		VIT = 0,
		AGI = 0,
		MNA = 0,
		UnassignedPoints = 5,
	},
	EquippedWeapon = Config.DEFAULT_WEAPON,
	EquippedTitle = "Novato",
	IsAwakened = false,
	ShadowsInventory = {},
	EquippedShadows = {},
	UnlockedIslands = { "StarterVillage" },
}

local VALID_STATS: { [string]: boolean } = {
	STR = true, INT = true, SDW = true, VIT = true, AGI = true, MNA = true,
}

--[[
	Carga de ProfileService. Si la libreria no esta presente (Studio limpio,
	pruebas de integracion, CI) se usa un store en memoria con la misma
	interfaz para que el resto del codigo no tenga ramas especiales.
]]
local function resolveProfileStore()
	local moduleScript = script.Parent.Parent:FindFirstChild("Packages")
	moduleScript = moduleScript and moduleScript:FindFirstChild("ProfileService")
	if moduleScript and moduleScript:IsA("ModuleScript") then
		local ok, library = pcall(require, moduleScript)
		if ok and library then
			return (library :: any).GetProfileStore(PROFILE_STORE_KEY, DEFAULT_PROFILE), false
		end
		warn("[DataService] ProfileService presente pero no cargable; usando store en memoria")
	end
	local MockProfileStore = require(script.Parent.Parent.Test.MockProfileStore)
	return MockProfileStore.new(DEFAULT_PROFILE), true
end

type Profile = {
	Data: Types.PlayerProfile,
	IsActive: (Profile) -> boolean,
	Reconcile: (Profile) -> (),
	ListenToRelease: (Profile, () -> ()) -> (),
	Release: (Profile) -> (),
	AddUserId: (Profile, number) -> (),
}

local DataService = {}
DataService.Profiles = {} :: { [Player]: Profile }
DataService.ProfileStore = nil :: any
DataService.IsMockStore = false

local connections: { RBXScriptConnection } = {}
local loadingPlayers: { [Player]: boolean } = {}

-- Reconciliacion adicional: campos anidados que ProfileService:Reconcile()
-- no rellena en profundidad (Stats nuevas anadidas en una actualizacion).
local function reconcileNested(data: Types.PlayerProfile)
	for statName, defaultValue in DEFAULT_PROFILE.Stats :: any do
		if typeof((data.Stats :: any)[statName]) ~= "number" then
			(data.Stats :: any)[statName] = defaultValue
		end
	end
	if typeof(data.ShadowsInventory) ~= "table" then
		data.ShadowsInventory = {}
	end
	if typeof(data.EquippedShadows) ~= "table" then
		data.EquippedShadows = {}
	end
	-- Poda de UUIDs equipados que ya no existen en el inventario (datos viejos).
	for index = #data.EquippedShadows, 1, -1 do
		local uuid = data.EquippedShadows[index]
		if not data.ShadowsInventory[uuid] then
			table.remove(data.EquippedShadows, index)
		end
	end
	while #data.EquippedShadows > Config.MAX_EQUIPPED_SHADOWS do
		table.remove(data.EquippedShadows)
	end
end

function DataService.GetProfile(player: Player): Types.PlayerProfile?
	local profile = DataService.Profiles[player]
	if profile and profile:IsActive() then
		return profile.Data
	end
	return nil
end

-- Espera bloqueante con timeout, para servicios que corren antes de la carga.
function DataService.WaitForProfile(player: Player, timeout: number?): Types.PlayerProfile?
	local deadline = os.clock() + (timeout or 10)
	while os.clock() < deadline do
		local data = DataService.GetProfile(player)
		if data then
			return data
		end
		if not player:IsDescendantOf(Players) then
			return nil
		end
		task.wait(0.1)
	end
	return nil
end

function DataService.PushProfile(player: Player)
	local data = DataService.GetProfile(player)
	if data then
		NetBridge.FireClient(NetBridge.Events.ProfileUpdated, player, data)
	end
end

--[[
	Asignacion de atributos. Valida en el servidor que existan puntos
	suficientes; devuelve false ante cualquier entrada invalida sin lanzar.
]]
function DataService.AllocateStats(player: Player, statName: string, points: number): boolean
	local data = DataService.GetProfile(player)
	if not data then
		return false
	end
	if not VALID_STATS[statName] then
		return false
	end
	if typeof(points) ~= "number" or points ~= points then -- NaN
		return false
	end
	points = math.floor(points)
	if points <= 0 or points > Config.MAX_STAT_POINTS_PER_REQUEST then
		return false
	end
	if data.Stats.UnassignedPoints < points then
		return false
	end

	data.Stats.UnassignedPoints -= points
	;(data.Stats :: any)[statName] += points

	DataService.ApplyCharacterStats(player)
	DataService.PushProfile(player)
	return true
end

-- Traduce atributos del perfil al Humanoid del jugador (solo el jugador usa Humanoid).
function DataService.ApplyCharacterStats(player: Player)
	local data = DataService.GetProfile(player)
	local character = player.Character
	if not data or not character then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return
	end
	local maxHealth = StatCalculator.GetMaxHealth(data.Stats)
	local ratio = if humanoid.MaxHealth > 0 then humanoid.Health / humanoid.MaxHealth else 1
	humanoid.MaxHealth = maxHealth
	humanoid.Health = math.clamp(maxHealth * ratio, 1, maxHealth)
	humanoid.WalkSpeed = StatCalculator.GetWalkSpeed(data.Stats)
end

function DataService.AddCurrency(player: Player, currency: "Gold" | "Gems" | "Tickets", amount: number): boolean
	local data = DataService.GetProfile(player)
	if not data or typeof(amount) ~= "number" or amount ~= amount then
		return false
	end
	amount = math.floor(amount)
	local current = (data :: any)[currency] :: number
	if current + amount < 0 then
		return false -- nunca permitir saldo negativo
	end
	;(data :: any)[currency] = current + amount
	DataService.PushProfile(player)
	return true
end

function DataService.GrantExperience(player: Player, amount: number): boolean
	local data = DataService.GetProfile(player)
	if not data or amount <= 0 then
		return false
	end
	data.Experience += math.floor(amount)
	local leveled = false
	while data.Experience >= StatCalculator.GetExperienceForLevel(data.Level) do
		data.Experience -= StatCalculator.GetExperienceForLevel(data.Level)
		data.Level += 1
		data.Stats.UnassignedPoints += Config.STAT_POINTS_PER_LEVEL
		leveled = true
	end
	if leveled then
		DataService.ApplyCharacterStats(player)
	end
	DataService.PushProfile(player)
	return true
end

function DataService.SetAwakened(player: Player, title: string?): boolean
	local data = DataService.GetProfile(player)
	if not data then
		return false
	end
	data.IsAwakened = true
	data.EquippedTitle = title or "Awakened"
	DataService.PushProfile(player)
	return true
end

-- Carga -------------------------------------------------------------------
local function onPlayerAdded(player: Player)
	if loadingPlayers[player] then
		return
	end
	loadingPlayers[player] = true

	local profile = DataService.ProfileStore:LoadProfileAsync(`Player_{player.UserId}`, "ForceLoad")
	loadingPlayers[player] = nil

	if not profile then
		-- La sesion sigue bloqueada en otro servidor tras el tiempo de espera:
		-- expulsar es preferible a jugar sobre datos que no se van a guardar.
		player:Kick("No se pudo cargar tu perfil (sesion activa en otro servidor). Reintenta en unos segundos.")
		return
	end

	profile:AddUserId(player.UserId)
	profile:Reconcile()
	reconcileNested(profile.Data)

	profile:ListenToRelease(function()
		DataService.Profiles[player] = nil
		if player:IsDescendantOf(Players) then
			player:Kick("Tu perfil fue liberado por otra sesion.")
		end
	end)

	if not player:IsDescendantOf(Players) then
		-- Se fue durante la carga: liberar de inmediato, sin dejar la clave tomada.
		profile:Release()
		return
	end

	DataService.Profiles[player] = profile
	DataService.ApplyCharacterStats(player)
	DataService.PushProfile(player)
end

local function onPlayerRemoving(player: Player)
	local profile = DataService.Profiles[player]
	if profile then
		DataService.Profiles[player] = nil
		-- Release guarda de forma atomica y libera la clave de sesion.
		profile:Release()
	end
end

function DataService.Init()
	local store, isMock = resolveProfileStore()
	DataService.ProfileStore = store
	DataService.IsMockStore = isMock
	if isMock then
		warn("[DataService] Usando MockProfileStore: los datos NO se persisten entre sesiones.")
	end
	if RunService:IsStudio() and not isMock then
		-- ProfileService recomienda mock en Studio para no tocar DataStores reales.
		pcall(function()
			DataService.ProfileStore = DataService.ProfileStore.Mock
		end)
	end
	DataService.ForceLoadTimeout = FORCE_LOAD_TIMEOUT
end

function DataService.Start()
	table.insert(connections, Players.PlayerAdded:Connect(onPlayerAdded))
	table.insert(connections, Players.PlayerRemoving:Connect(onPlayerRemoving))

	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end

	table.insert(connections, NetBridge.OnServerEvent(NetBridge.Events.AllocateStats, function(player, statName, points)
		if typeof(statName) ~= "string" or typeof(points) ~= "number" then
			return
		end
		DataService.AllocateStats(player, statName, points)
	end) :: any)

	-- Reaplica atributos cuando reaparece el personaje.
	table.insert(connections, Players.PlayerAdded:Connect(function(player)
		table.insert(connections, player.CharacterAdded:Connect(function()
			task.defer(DataService.ApplyCharacterStats, player)
		end))
	end))

	-- Cierre limpio del servidor: liberar cada perfil antes del apagado.
	game:BindToClose(function()
		for player, profile in DataService.Profiles do
			DataService.Profiles[player] = nil
			profile:Release()
		end
		if not RunService:IsStudio() then
			task.wait(3)
		end
	end)
end

function DataService.Stop()
	for _, connection in connections do
		if typeof(connection) == "RBXScriptConnection" then
			if connection.Connected then
				connection:Disconnect()
			end
		elseif typeof(connection) == "table" then
			(connection :: any):Disconnect()
		end
	end
	table.clear(connections)
end

return DataService
