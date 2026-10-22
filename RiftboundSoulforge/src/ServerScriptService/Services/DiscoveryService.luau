--!strict
-- World secrets & mechanisms: the Sunfall Chamber brazier puzzle, its tablet and cache,
-- the Cinder Ravine drawbridge lever, lava hazards and the Hall of Echoes displays.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local WorldConfig = require(Config.WorldConfig)
local DiscoveryConfig = require(Config.DiscoveryConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local DiscoveryService = {}

local sequence: { string } = {}
local wallOpen = false
local bridgeDownUntil = 0

local function world(): Instance
	return workspace:WaitForChild("World")
end

local function find(name: string): Instance?
	return world():FindFirstChild(name, true)
end

local function promptOf(inst: Instance?): ProximityPrompt?
	return inst and inst:FindFirstChildWhichIsA("ProximityPrompt", true)
end

local function setBrazier(id: string, lit: boolean)
	local brazier = find("Brazier_" .. id)
	if not brazier then
		return
	end
	local flame = brazier:FindFirstChild("Flame", true) :: BasePart?
	if flame then
		flame.Transparency = if lit then 0 else 1
		local light = flame:FindFirstChildOfClass("PointLight")
		if light then
			light.Enabled = lit
		end
		local emitter = flame:FindFirstChildOfClass("ParticleEmitter")
		if emitter then
			emitter.Enabled = lit
		end
	end
end

local function playersInChamber(): boolean
	local region = WorldConfig.regionById("SunfallChamber")
	if not region then
		return false
	end
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			local p = root.Position
			if p.X >= region.min.X and p.X <= region.max.X and p.Z >= region.min.Z and p.Z <= region.max.Z then
				return true
			end
		end
	end
	return false
end

local function moveWall(open: boolean)
	local wall = find("SunfallWall") :: BasePart?
	if not wall then
		return
	end
	local closed = wall:GetAttribute("ClosedCFrame") :: CFrame?
	if not closed then
		closed = wall.CFrame
		wall:SetAttribute("ClosedCFrame", closed)
	end
	local goal = if open then (closed :: CFrame) * CFrame.new(0, -19, 0) else closed :: CFrame
	TweenService:Create(wall, TweenInfo.new(2.5, Enum.EasingStyle.Quad), { CFrame = goal }):Play()
end

local function openWall(opener: Player)
	if wallOpen then
		return
	end
	wallOpen = true
	moveWall(true)
	Net.event("Effect"):FireAllClients("Shake", { position = WorldConfig.Points.SunfallWall, intensity = 0.6 })
	Net.event("Notify"):FireAllClients("Discovery", "Stone grinds in the Frontier cliffs... (" .. opener.DisplayName .. ")")
	local function scheduleClose()
		task.delay(WorldConfig.SunfallOpenTime, function()
			if playersInChamber() then
				scheduleClose()
				return
			end
			wallOpen = false
			moveWall(false)
			sequence = {}
			for _, b in WorldConfig.Braziers do
				setBrazier(b.id, false)
			end
		end)
	end
	scheduleClose()
end

local function kindle(player: Player, id: string)
	if wallOpen then
		Net.event("Notify"):FireClient(player, "Info", "The flames already burn. The way is open.")
		return
	end
	if table.find(sequence, id) then
		return
	end
	table.insert(sequence, id)
	setBrazier(id, true)
	local expected = WorldConfig.BrazierOrder[#sequence]
	if expected ~= id then
		sequence = {}
		task.delay(0.8, function()
			for _, b in WorldConfig.Braziers do
				setBrazier(b.id, false)
			end
		end)
		Net.event("Notify"):FireClient(player, "Info", "The flames gutter out. The order was wrong.")
		return
	end
	if #sequence == #WorldConfig.BrazierOrder then
		openWall(player)
	else
		Net.event("Notify"):FireClient(player, "Info", "The flame holds.")
	end
end

local function readTablet(player: Player)
	local profile = Registry.get("PlayerDataService").get(player)
	if not profile then
		return
	end
	local Progression = Registry.get("ProgressionService")
	local first = Progression.discover(player, "SunfallChamber")
	Progression.discover(player, "SunfallTablet")
	if not profile.blueprints.SunfallBlueprint then
		profile.blueprints.SunfallBlueprint = true
		Registry.get("PlayerDataService").markDirty(player)
	end
	Progression.achieve(player, "SecretKeeper")
	Progression.present(player, "SunfallTablet", {
		title = "The Sunfall Tablet",
		subtitle = "Secret Discovered",
		body = "You learned the theory of COLLAPSING SUN (Ember + Gravity) and the Resonant Temper blueprint. Research the fusion at the Fusion Chamber.",
		color = Color3.fromRGB(255, 200, 90),
	})
	if not first then
		Net.event("Notify"):FireClient(player, "Info", "You already know what the tablet teaches.")
	end
	Net.event("Effect"):FireClient(player, "Sound", { name = "ItemDiscovery" })
end

local function openCache(player: Player)
	local profile = Registry.get("PlayerDataService").get(player)
	if not profile then
		return
	end
	if profile.codex.discoveries.SunfallCache then
		Net.event("Notify"):FireClient(player, "Info", "The cache is empty for you.")
		return
	end
	profile.codex.discoveries.SunfallCache = os.time() -- claimed flag first (idempotent)
	Registry.get("PlayerDataService").markDirty(player)
	Registry.get("ExpeditionService").giveLoot(player, { EssenceShard = 3, Emberstone = 2 }, 50, WorldConfig.Points.SunfallChest, true)
end

local function pullLever(player: Player)
	local t = os.clock()
	Registry.get("ProgressionService").discover(player, "RavineShortcut")
	if t < bridgeDownUntil then
		Net.event("Notify"):FireClient(player, "Info", "The drawbridge is already down.")
		return
	end
	bridgeDownUntil = t + 600
	local bridge = find("Drawbridge") :: BasePart?
	if bridge then
		local down = bridge:GetAttribute("DownCFrame") :: CFrame?
		local up = bridge:GetAttribute("UpCFrame") :: CFrame?
		if down and up then
			bridge.CanCollide = true
			TweenService:Create(bridge, TweenInfo.new(2.5, Enum.EasingStyle.Quart), { CFrame = down, Transparency = 0 }):Play()
			task.delay(600, function()
				if os.clock() >= bridgeDownUntil - 1 then
					bridge.CanCollide = false
					TweenService:Create(bridge, TweenInfo.new(2), { CFrame = up, Transparency = 1 }):Play()
				end
			end)
		end
	end
	Net.event("Notify"):FireAllClients("Discovery", player.DisplayName .. " lowered the Cinder Ravine drawbridge (10 min).")
end

local lavaDebounce: { [Player]: number } = {}

local function connectLava()
	for _, part in world():GetDescendants() do
		if part:IsA("BasePart") and part:GetAttribute("Lava") then
			part.Touched:Connect(function(hit)
				local character = hit.Parent
				local player = character and Players:GetPlayerFromCharacter(character)
				if not player then
					return
				end
				local t = os.clock()
				if (lavaDebounce[player] or 0) > t then
					return
				end
				lavaDebounce[player] = t + 1.5
				local humanoid = (character :: Model):FindFirstChildOfClass("Humanoid")
				if humanoid and humanoid.Health > 0 then
					humanoid:TakeDamage(humanoid.MaxHealth * 0.3)
					if humanoid.Health > 0 then
						Registry.get("ExpeditionService").teleport(player, WorldConfig.Points.RavineCheckpoint)
						Net.event("Notify"):FireClient(player, "Info", "Scorched! You scramble back to the ravine edge.")
					end
				end
			end)
		end
	end
end

local function updateEchoes()
	local PlayerData = Registry.get("PlayerDataService")
	local entries = {}
	for _, player in Players:GetPlayers() do
		local profile = PlayerData.get(player)
		if profile then
			local achievements = 0
			for _ in profile.achievements do
				achievements += 1
			end
			table.insert(entries, {
				name = player.DisplayName,
				level = profile.level,
				mastery = profile.weapons.Katana.mastery,
				clears = profile.bosses.FractureWarden.clears,
				achievements = achievements,
			})
		end
	end
	table.sort(entries, function(a, b)
		if a.mastery ~= b.mastery then
			return a.mastery > b.mastery
		end
		return a.level > b.level
	end)
	local lines = { "HALL OF ECHOES", "" }
	for i = 1, math.min(6, #entries) do
		local e = entries[i]
		table.insert(lines, string.format("%d. %s  Lv %d  Katana M%d  Warden x%d  ★%d", i, e.name, e.level, e.mastery, e.clears, e.achievements))
	end
	if #entries == 0 then
		table.insert(lines, "No echoes yet.")
	end
	for _, board in world():GetDescendants() do
		if board.Name == "EchoBoard" then
			local label = board:FindFirstChild("Text", true)
			if label and label:IsA("TextLabel") then
				label.Text = table.concat(lines, "\n")
			end
		end
	end
end

function DiscoveryService.Init() end

function DiscoveryService.Start()
	for _, b in WorldConfig.Braziers do
		local prompt = promptOf(find("Brazier_" .. b.id))
		setBrazier(b.id, false)
		if prompt then
			prompt.Triggered:Connect(function(player)
				if Registry.get("SecurityService").allow(player, "Interact") and Registry.get("SecurityService").within(player, b.position, 16) then
					kindle(player, b.id)
				end
			end)
		end
	end
	local tablet = promptOf(find("SunfallTablet"))
	if tablet then
		tablet.Triggered:Connect(function(player)
			if Registry.get("SecurityService").within(player, WorldConfig.Points.SunfallTablet, 16) then
				readTablet(player)
			end
		end)
	end
	local cache = promptOf(find("SunfallChest"))
	if cache then
		cache.Triggered:Connect(function(player)
			if Registry.get("SecurityService").allow(player, "Interact") and Registry.get("SecurityService").within(player, WorldConfig.Points.SunfallChest, 16) then
				openCache(player)
			end
		end)
	end
	local mural = promptOf(find("SunfallMural"))
	if mural then
		mural.Triggered:Connect(function(player)
			Net.event("Notify"):FireClient(player, "Lore", DiscoveryConfig.Discoveries.SunfallChamber.hint .. " First the Moon that rises, then the Sun at its height, last the Star that never sets.")
		end)
	end
	local lever = promptOf(find("ShortcutLever"))
	if lever then
		lever.Triggered:Connect(function(player)
			if Registry.get("SecurityService").within(player, WorldConfig.Points.ShortcutLever, 16) then
				pullLever(player)
			end
		end)
	end
	connectLava()
	Players.PlayerRemoving:Connect(function(player)
		lavaDebounce[player] = nil
	end)
	task.spawn(function()
		while true do
			pcall(updateEchoes)
			task.wait(30)
		end
	end)
end

return DiscoveryService
