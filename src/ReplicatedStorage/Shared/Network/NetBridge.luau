--!strict
--[[
	NetBridge.luau
	Envoltura tipada sobre RemoteEvent / UnreliableRemoteEvent / RemoteFunction.

	- El servidor crea las instancias de forma perezosa; el cliente las espera.
	- Toda conexion devuelve un objeto con :Disconnect() y queda registrada para
	  poder limpiarla en bloque (evita memory leaks al recargar controladores).
	- Los paquetes de alta frecuencia (posiciones de sombras) usan
	  UnreliableRemoteEvent: no bloquean la cola ordenada y descartan datos viejos.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local IS_SERVER = RunService:IsServer()
local FOLDER_NAME = "NetBridgeRemotes"

local NetBridge = {}

--[[
	TestMode: en pruebas de integracion los "jugadores" son tablas simuladas y
	no pueden recibir remotes. Con TestMode = true los envios al cliente son
	no-ops, de modo que el resto de la logica de servidor corre sin cambios.
]]
NetBridge.TestMode = false

export type Connection = { Disconnect: (Connection) -> () }

-- Canales fiables (orden garantizado) --------------------------------------
NetBridge.Events = {
	RequestAttack = "RequestAttack",
	AttemptArise = "AttemptArise",
	DeclineArise = "DeclineArise",
	AllocateStats = "AllocateStats",
	EquipShadow = "EquipShadow",
	UnequipShadow = "UnequipShadow",
	ProfileUpdated = "ProfileUpdated",
	AriseResult = "AriseResult",
	EnemyInert = "EnemyInert",
	EnemyRemoved = "EnemyRemoved",
	DamageDealt = "DamageDealt",
	ShadowAttack = "ShadowAttack",
	ShadowsEquippedChanged = "ShadowsEquippedChanged",
	PortalSpawned = "PortalSpawned",
	PortalRemoved = "PortalRemoved",
	EnterPortal = "EnterPortal",
	DungeonPhaseChanged = "DungeonPhaseChanged",
	Notify = "Notify",
}

-- Canales no fiables (estado que se reemplaza cada tick) --------------------
NetBridge.Unreliable = {
	ShadowSnapshot = "ShadowSnapshot",
}

local function getFolder(): Instance
	local existing = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
	if existing then
		return existing
	end
	if IS_SERVER then
		local folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
		folder.Parent = ReplicatedStorage
		return folder
	end
	return ReplicatedStorage:WaitForChild(FOLDER_NAME, 30) or error("NetBridge: remotes no replicados")
end

local function getRemote(name: string, className: string): Instance
	local folder = getFolder()
	local existing = folder:FindFirstChild(name)
	if existing then
		return existing
	end
	if IS_SERVER then
		local remote = Instance.new(className)
		remote.Name = name
		remote.Parent = folder
		return remote
	end
	return folder:WaitForChild(name, 30) or error(`NetBridge: remote {name} ausente`)
end

function NetBridge.GetEvent(name: string): RemoteEvent
	return getRemote(name, "RemoteEvent") :: RemoteEvent
end

function NetBridge.GetUnreliable(name: string): UnreliableRemoteEvent
	return getRemote(name, "UnreliableRemoteEvent") :: UnreliableRemoteEvent
end

function NetBridge.GetFunction(name: string): RemoteFunction
	return getRemote(name, "RemoteFunction") :: RemoteFunction
end

-- Registro central de conexiones -------------------------------------------
local connections: { RBXScriptConnection } = {}

local function track(connection: RBXScriptConnection): Connection
	table.insert(connections, connection)
	local handle = {}
	function handle.Disconnect(_self)
		if connection.Connected then
			connection:Disconnect()
		end
		local index = table.find(connections, connection)
		if index then
			table.remove(connections, index)
		end
	end
	return handle :: any
end

--[[ Servidor: escucha peticiones del cliente. ]]
function NetBridge.OnServerEvent(name: string, callback: (Player, ...any) -> ()): Connection
	assert(IS_SERVER, "OnServerEvent solo puede usarse en el servidor")
	local remote = NetBridge.GetEvent(name)
	return track(remote.OnServerEvent:Connect(function(player, ...)
		-- Aisla errores de un jugador para que no maten el servicio entero.
		local ok, err = pcall(callback, player, ...)
		if not ok then
			warn(`[NetBridge] {name} fallo para {player.Name}: {err}`)
		end
	end))
end

function NetBridge.OnServerUnreliable(name: string, callback: (Player, ...any) -> ()): Connection
	assert(IS_SERVER, "OnServerUnreliable solo puede usarse en el servidor")
	local remote = NetBridge.GetUnreliable(name)
	return track(remote.OnServerEvent:Connect(function(player, ...)
		local ok, err = pcall(callback, player, ...)
		if not ok then
			warn(`[NetBridge] {name} fallo para {player.Name}: {err}`)
		end
	end))
end

--[[ Cliente: escucha al servidor. ]]
function NetBridge.OnClientEvent(name: string, callback: (...any) -> ()): Connection
	assert(not IS_SERVER, "OnClientEvent solo puede usarse en el cliente")
	return track(NetBridge.GetEvent(name).OnClientEvent:Connect(callback))
end

function NetBridge.OnClientUnreliable(name: string, callback: (...any) -> ()): Connection
	assert(not IS_SERVER, "OnClientUnreliable solo puede usarse en el cliente")
	return track(NetBridge.GetUnreliable(name).OnClientEvent:Connect(callback))
end

function NetBridge.FireClient(name: string, player: Player, ...: any)
	if NetBridge.TestMode then
		return
	end
	NetBridge.GetEvent(name):FireClient(player, ...)
end

function NetBridge.FireAllClients(name: string, ...: any)
	if NetBridge.TestMode then
		return
	end
	NetBridge.GetEvent(name):FireAllClients(...)
end

function NetBridge.FireUnreliableClient(name: string, player: Player, ...: any)
	if NetBridge.TestMode then
		return
	end
	NetBridge.GetUnreliable(name):FireClient(player, ...)
end

function NetBridge.FireServer(name: string, ...: any)
	NetBridge.GetEvent(name):FireServer(...)
end

-- Limpieza en bloque (hot reload / teardown de pruebas).
function NetBridge.DisconnectAll()
	for _, connection in connections do
		if connection.Connected then
			connection:Disconnect()
		end
	end
	table.clear(connections)
end

return NetBridge
