--!strict
-- Server-local world event scheduler. Exactly one event can be in Warning/Active at a time;
-- timers are server-authoritative and broadcast with absolute server timestamps.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local WorldEventConfig = require(Config.WorldEventConfig)
local WorldConfig = require(Config.WorldConfig)
local GameConfig = require(Config.GameConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local WorldEventService = {}

type State = { phase: string, eventId: string?, phaseEnds: number }
local state: State = { phase = "Idle", eventId = nil, phaseEnds = 0 }
local forced: string? = nil
local spawned: { any } = {}
local spawnedEnemies: { any } = {}

local scale = if RunService:IsStudio() then GameConfig.Dev.StudioEventScale else 1

local function serverTimeFor(clockTime: number): number
	return workspace:GetServerTimeNow() + math.max(0, clockTime - os.clock())
end

local function snapshot()
	local def = state.eventId and WorldEventConfig.Events[state.eventId]
	return {
		phase = state.phase,
		id = state.eventId,
		name = def and def.displayName,
		description = def and def.description,
		color = def and def.color,
		endsAt = serverTimeFor(state.phaseEnds),
	}
end

local function updateBoard()
	local world = workspace:FindFirstChild("World")
	local board = world and world:FindFirstChild("AnnouncementBoard", true)
	local label = board and board:FindFirstChild("Text", true)
	if not label or not label:IsA("TextLabel") then
		return
	end
	local def = state.eventId and WorldEventConfig.Events[state.eventId]
	local remaining = math.max(0, math.floor(state.phaseEnds - os.clock()))
	local timeText = string.format("%d:%02d", remaining // 60, remaining % 60)
	if state.phase == "Warning" and def then
		label.Text = string.format("⚠ %s EN %s\n%s", string.upper(def.displayName), timeText, def.description)
		label.TextColor3 = def.color
	elseif state.phase == "Active" and def then
		label.Text = string.format("★ %s ACTIVO — quedan %s\n%s", string.upper(def.displayName), timeText, def.description)
		label.TextColor3 = def.color
	else
		label.Text = string.format("EL NEXO\nPróxima perturbación de la grieta en ~%s", timeText)
		label.TextColor3 = Color3.fromRGB(230, 225, 255)
	end
end

local function broadcast()
	Net.event("WorldEvent"):FireAllClients(snapshot())
	updateBoard()
end

local function pickEvent(): string
	local total = 0
	for _, def in WorldEventConfig.Events do
		if def.implemented then
			total += def.weight
		end
	end
	local roll = math.random() * total
	for id, def in WorldEventConfig.Events do
		if def.implemented then
			roll -= def.weight
			if roll <= 0 then
				return id
			end
		end
	end
	return "RiftSurge"
end

local function begin(id: string)
	local Resource = Registry.get("ResourceService")
	local Enemy = Registry.get("EnemyService")
	if id == "RiftSurge" then
		Enemy.setSurge(true)
		for _, p in WorldConfig.RiftCrystalSites do
			local node = Resource.spawnNode("RiftCrystal", p, { temporary = true })
			if node then
				table.insert(spawned, node)
			end
		end
	elseif id == "CrystalBloom" then
		for i, p in WorldConfig.BloomSites do
			local nodeId = if i % 2 == 0 then "CobaltCluster" else "EmberstoneDeposit"
			local node = Resource.spawnNode(nodeId, p, { temporary = true, softTier = true })
			if node then
				table.insert(spawned, node)
			end
		end
	elseif id == "EclipseHunt" then
		local site = WorldConfig.EclipseSites[math.random(1, #WorldConfig.EclipseSites)]
		local record = Enemy.spawn("EclipseStalker", site)
		if record then
			table.insert(spawnedEnemies, record)
		end
	end
	Net.event("Notify"):FireAllClients("WorldEvent", WorldEventConfig.Events[id].displayName .. " ha comenzado.", { color = WorldEventConfig.Events[id].color })
end

local function finish(id: string)
	local Resource = Registry.get("ResourceService")
	local Enemy = Registry.get("EnemyService")
	if id == "RiftSurge" then
		Enemy.setSurge(false)
	end
	for _, node in spawned do
		Resource.removeNode(node)
	end
	spawned = {}
	for _, record in spawnedEnemies do
		if record.alive then
			Enemy.despawn(record)
		end
	end
	spawnedEnemies = {}
	Net.event("Notify"):FireAllClients("WorldEvent", WorldEventConfig.Events[id].displayName .. " ha terminado.")
end

-- Waits until the deadline unless an event is forced (dev). Returns true if forced.
local function waitUntil(deadline: number, interruptible: boolean): boolean
	while os.clock() < deadline do
		task.wait(1)
		updateBoard()
		if interruptible and forced then
			return true
		end
	end
	return false
end

local function loop()
	local schedule = WorldEventConfig.Schedule
	state.phase = "Idle"
	state.phaseEnds = os.clock() + schedule.firstDelay * scale
	broadcast()
	while true do
		waitUntil(state.phaseEnds, true)
		local id = forced or pickEvent()
		forced = nil
		local def = WorldEventConfig.Events[id]
		state.phase = "Warning"
		state.eventId = id
		state.phaseEnds = os.clock() + schedule.warning * scale
		broadcast()
		waitUntil(state.phaseEnds, false)
		state.phase = "Active"
		state.phaseEnds = os.clock() + def.duration * scale
		local ok, err = pcall(begin, id)
		if not ok then
			warn("[WorldEvent] begin failed: " .. tostring(err))
		end
		broadcast()
		waitUntil(state.phaseEnds, false)
		local ok2, err2 = pcall(finish, id)
		if not ok2 then
			warn("[WorldEvent] finish failed: " .. tostring(err2))
		end
		state.phase = "Idle"
		state.eventId = nil
		state.phaseEnds = os.clock() + math.random(schedule.minGap, schedule.maxGap) * scale
		broadcast()
	end
end

function WorldEventService.current()
	return snapshot()
end

function WorldEventService.Init() end

function WorldEventService.Start()
	task.spawn(loop)
	Players.PlayerAdded:Connect(function(player)
		task.delay(3, function()
			if player.Parent then
				Net.event("WorldEvent"):FireClient(player, snapshot())
			end
		end)
	end)
	Registry.get("RequestService").on("DevStartEvent", "Request", function(_player, args)
		if not (RunService:IsStudio() and GameConfig.Dev.AllowStudioCommands) then
			return false, "Los comandos de desarrollo solo funcionan en Studio."
		end
		local def = WorldEventConfig.Events[args.id or ""]
		if not def or not def.implemented then
			return false, "Evento desconocido o sin implementar."
		end
		if state.phase ~= "Idle" then
			return false, "Ya hay un evento programado o en curso."
		end
		forced = args.id
		return true, "Evento forzado: " .. def.displayName
	end)
end

return WorldEventService
