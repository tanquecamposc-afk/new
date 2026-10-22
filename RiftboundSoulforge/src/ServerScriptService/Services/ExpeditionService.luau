--!strict
-- Expedition risk & extraction: region tracking, the unbanked Satchel, depth-based drop
-- multipliers, death penalties, idempotent banking at beacons, and teleports.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local WorldConfig = require(Config.WorldConfig)
local ExpeditionConfig = require(Config.ExpeditionConfig)
local ItemConfig = require(Config.ItemConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local ExpeditionService = {}

type Satchel = { coins: number, items: { [string]: number } }
type PlayerState = { region: string?, depth: number, expedition: boolean, satchel: Satchel, banking: boolean }

local states: { [Player]: PlayerState } = {}

local function stateOf(player: Player): PlayerState
	local s = states[player]
	if not s then
		s = { region = nil, depth = 0, expedition = false, satchel = { coins = 0, items = {} }, banking = false }
		states[player] = s
	end
	return s
end

local function sync(player: Player)
	local s = stateOf(player)
	Net.event("ExpeditionSync"):FireClient(player, {
		region = s.region,
		depth = s.depth,
		expedition = s.expedition,
		satchel = s.satchel,
		loss = ExpeditionConfig.Depths[s.depth] and ExpeditionConfig.Depths[s.depth].lossOnDeath or 0,
	})
end

local function satchelEmpty(s: PlayerState): boolean
	if s.satchel.coins > 0 then
		return false
	end
	for _, n in s.satchel.items do
		if n > 0 then
			return false
		end
	end
	return true
end

function ExpeditionService.regionOf(player: Player): string?
	return stateOf(player).region
end

function ExpeditionService.depthOf(player: Player): number
	return stateOf(player).depth
end

-- Loot from enemies/nodes/bosses. Inside Emberfall it goes to the Satchel (with the depth
-- multiplier), elsewhere straight to the bank. `noMultiplier` for fixed rewards (boss).
function ExpeditionService.giveLoot(player: Player, items: { [string]: number }, coins: number, position: Vector3?, noMultiplier: boolean?)
	local s = stateOf(player)
	local depthInfo = ExpeditionConfig.Depths[s.depth] or ExpeditionConfig.Depths[0]
	local mult = if noMultiplier then 1 else depthInfo.dropMultiplier
	local function scale(n: number): number
		local scaled = n * mult
		local whole = math.floor(scaled)
		if math.random() < scaled - whole then
			whole += 1
		end
		return whole
	end
	local granted = {}
	if s.expedition then
		s.satchel.coins += scale(coins)
		for item, n in items do
			if ItemConfig.isValid(item) and n > 0 then
				local amount = scale(n)
				s.satchel.items[item] = (s.satchel.items[item] or 0) + amount
				granted[item] = amount
			end
		end
		sync(player)
	else
		local Inventory = Registry.get("InventoryService")
		if coins > 0 then
			Inventory.addCoins(player, coins)
		end
		for item, n in items do
			if n > 0 then
				Inventory.addItem(player, item, n)
				granted[item] = n
			end
		end
	end
	if next(granted) or coins > 0 then
		Net.event("Notify"):FireClient(player, "Loot", "", {
			items = granted,
			coins = coins,
			satchel = s.expedition,
			position = position,
		})
	end
end

-- Moves the Satchel into the permanent inventory. Idempotent: the Satchel is swapped out
-- before anything is granted, so duplicate requests find it empty.
function ExpeditionService.bank(player: Player, beaconId: string): (boolean, string?)
	local s = stateOf(player)
	if s.banking then
		return false, "Already banking."
	end
	if satchelEmpty(s) then
		return false, "Your Satchel is empty."
	end
	s.banking = true
	local satchel = s.satchel
	s.satchel = { coins = 0, items = {} }
	local Inventory = Registry.get("InventoryService")
	Inventory.grant(player, { coins = satchel.coins, items = satchel.items })
	s.banking = false
	local Progression = Registry.get("ProgressionService")
	Progression.stat(player, "extractions")
	if beaconId == "Keep" or beaconId == "Arena" then
		Progression.achieve(player, "DeepDelver")
	end
	Registry.get("QuestService").record(player, "Extract", { beacon = beaconId })
	Registry.get("PartyService").onExtract(player)
	Net.event("Notify"):FireClient(player, "Extract", "Loot secured!", { items = satchel.items, coins = satchel.coins })
	Net.event("Effect"):FireAllClients("Extract", { character = player.Character })
	Progression.present(player, "FirstExtraction", {
		title = "Loot Secured",
		subtitle = "Extraction",
		body = "Banked loot is permanent. Spend it at the Forge and Artisan Bench in the Nexus.",
		color = Color3.fromRGB(120, 255, 190),
	})
	sync(player)
	return true, nil
end

-- Applies the death penalty for the player's current depth. Returns what was lost.
function ExpeditionService.applyLoss(player: Player): (number, { [string]: number })
	local s = stateOf(player)
	local info = ExpeditionConfig.Depths[s.depth]
	local loss = info and info.lossOnDeath or 0
	local lostItems = {}
	local lostCoins = 0
	if loss > 0 and not satchelEmpty(s) then
		lostCoins = math.floor(s.satchel.coins * loss)
		s.satchel.coins -= lostCoins
		for item, n in s.satchel.items do
			local lost = math.floor(n * loss + 0.5)
			if lost > 0 then
				lostItems[item] = lost
				s.satchel.items[item] = n - lost
			end
		end
		Registry.get("ProgressionService").stat(player, "lootLost")
	end
	return lostCoins, lostItems
end

function ExpeditionService.onDeath(player: Player)
	local s = stateOf(player)
	if not s.expedition then
		return
	end
	local lostCoins, lostItems = ExpeditionService.applyLoss(player)
	Net.event("Notify"):FireClient(player, "Death", "", {
		depth = s.depth,
		lostCoins = lostCoins,
		lostItems = lostItems,
	})
	sync(player)
end

function ExpeditionService.respawnPoint(player: Player): Vector3
	local s = stateOf(player)
	if s.expedition then
		return WorldConfig.Points.CampArrival
	end
	return WorldConfig.Points.NexusSpawn
end

function ExpeditionService.teleport(player: Player, position: Vector3)
	local character = player.Character
	if character and character.PrimaryPart then
		character:PivotTo(CFrame.new(position + Vector3.new(0, 3, 0)))
	end
end

local function updateRegion(player: Player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	local s = stateOf(player)
	local region = WorldConfig.regionAt(root.Position)
	local id = region and region.id or nil
	if id == s.region then
		return
	end
	s.region = id
	s.depth = region and region.depth or 0
	local wasExpedition = s.expedition
	s.expedition = region ~= nil and region.expedition == true
	player:SetAttribute("Region", id or "")
	player:SetAttribute("Depth", s.depth)
	if region then
		local Progression = Registry.get("ProgressionService")
		Progression.recordRegion(player, region.id)
		Registry.get("QuestService").record(player, "EnterRegion", { region = region.id })
		if region.id == "Frontier" then
			Progression.present(player, "Region_Frontier", {
				title = "Emberfall Frontier",
				subtitle = "Depth 1 - 25% of your Satchel is lost if you fall",
				body = "Mine ore, hunt Rift Stalkers and find what the cliffs hide.",
				color = Color3.fromRGB(255, 140, 80),
			})
		elseif region.id == "Keep" then
			Progression.present(player, "Region_Keep", {
				title = "The Ruined Keep",
				subtitle = "Depth 2 - drops x1.3, 50% Satchel loss on death",
				body = "Rune Guardians block light strikes from the front. Break them with heavy attacks.",
				color = Color3.fromRGB(150, 140, 255),
			})
		elseif region.id == "Arena" or region.id == "Approach" then
			Progression.present(player, "Region_Arena", {
				title = "The Rift Edge",
				subtitle = "Depth 3 - drops x1.6, 75% Satchel loss on death",
				body = "The Fracture Warden waits beyond the seal.",
				color = Color3.fromRGB(255, 80, 160),
			})
		end
	end
	-- Leaving Emberfall through any safe route banks nothing automatically except via portals.
	if wasExpedition and not s.expedition and not satchelEmpty(s) then
		-- e.g. Warden Gate shortcut never leaves Emberfall; this only happens via teleports
		ExpeditionService.bank(player, "Camp")
	end
	sync(player)
end

function ExpeditionService.Init() end

local function connectBeacon(prompt: ProximityPrompt, beaconId: string, position: Vector3)
	prompt.Triggered:Connect(function(player)
		local Security = Registry.get("SecurityService")
		if not Security.allow(player, "Interact") then
			return
		end
		if not Security.within(player, position, prompt.MaxActivationDistance + 6) then
			Security.flag(player, "beacon out of range")
			return
		end
		local beacon = ExpeditionConfig.Beacons[beaconId]
		if beacon.requiresVictory and not Registry.get("BossService").victoryBeaconOpen() then
			Net.event("Notify"):FireClient(player, "Error", "The Warden's Beacon only ignites after the Warden falls.")
			return
		end
		local ok, message = ExpeditionService.bank(player, beaconId)
		if not ok and message then
			Net.event("Notify"):FireClient(player, "Info", message)
		end
	end)
end

function ExpeditionService.Start()
	local world = workspace:WaitForChild("World")
	local points = WorldConfig.Points
	local function promptAt(name: string): ProximityPrompt?
		local holder = world:FindFirstChild(name, true)
		return holder and holder:FindFirstChildWhichIsA("ProximityPrompt", true)
	end
	local camp = promptAt("CampBeacon")
	if camp then
		connectBeacon(camp, "Camp", points.CampBeacon)
	end
	local keep = promptAt("KeepBeacon")
	if keep then
		connectBeacon(keep, "Keep", points.KeepBeacon)
	end
	local arena = promptAt("ArenaVictoryBeacon")
	if arena then
		connectBeacon(arena, "Arena", points.ArenaVictoryBeacon)
	end
	local returnPortal = promptAt("CampReturnPortal")
	if returnPortal then
		returnPortal.Triggered:Connect(function(player)
			if not Registry.get("SecurityService").within(player, points.CampReturnPortal, 16) then
				return
			end
			local s = stateOf(player)
			if not satchelEmpty(s) then
				ExpeditionService.bank(player, "Camp") -- the camp is safe: returning banks your Satchel
			end
			ExpeditionService.teleport(player, points.NexusSpawn)
		end)
	end

	local Requests = Registry.get("RequestService")
	Requests.on("EnterExpedition", "Request", function(player, args)
		if not Registry.get("SecurityService").within(player, points.ExpeditionPortal, 22) then
			return false, "Stand at the Rift Portal to launch."
		end
		local moved = { player }
		if args.withParty == true then
			for _, member in Registry.get("PartyService").membersNear(player, points.ExpeditionPortal, 30) do
				table.insert(moved, member)
			end
		end
		for _, p in moved do
			ExpeditionService.teleport(p, points.CampArrival + Vector3.new(math.random(-4, 4), 0, math.random(-4, 4)))
			if p ~= player then
				Net.event("Notify"):FireClient(p, "Info", player.DisplayName .. " launched the expedition with your party.")
			end
		end
		return true, "Entering Emberfall Frontier..."
	end)

	-- Region tracking (cheap: a handful of AABB checks per player twice a second).
	task.spawn(function()
		while true do
			task.wait(0.5)
			for _, player in Players:GetPlayers() do
				local ok, err = pcall(updateRegion, player)
				if not ok then
					warn("[Expedition] region update failed: " .. tostring(err))
				end
			end
		end
	end)

	-- Disconnect rule: treated like a death at the current depth; the rest is banked.
	Registry.get("PlayerDataService").Releasing:Connect(function(player)
		local s = states[player]
		if s and not satchelEmpty(s) then
			ExpeditionService.applyLoss(player)
			local satchel = s.satchel
			s.satchel = { coins = 0, items = {} }
			Registry.get("InventoryService").grant(player, { coins = satchel.coins, items = satchel.items })
		end
		states[player] = nil
	end)
end

return ExpeditionService
