--!strict
-- Mastery trials (Katana Trial). Teaches the moveset: strikes, a perfect parry, a dodge,
-- and defeating a champion inside a time limit. No currency cost.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local TrialConfig = require(Config.TrialConfig)
local WorldConfig = require(Config.WorldConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local TrialService = {}

type Active = { id: string, deadline: number, counts: { [string]: number }, record: any?, done: boolean }
local active: { [Player]: Active } = {}

local function sync(player: Player)
	local a = active[player]
	if not a then
		Net.event("TrialSync"):FireClient(player, nil)
		return
	end
	local def = TrialConfig.Trials[a.id]
	local objectives = {}
	for _, o in def.objectives do
		table.insert(objectives, { label = o.label, count = o.count, current = math.min(o.count, a.counts[o.key] or 0) })
	end
	Net.event("TrialSync"):FireClient(player, {
		id = a.id,
		name = def.displayName,
		endsAt = workspace:GetServerTimeNow() + math.max(0, a.deadline - os.clock()),
		objectives = objectives,
	})
end

local function finish(player: Player, success: boolean, reason: string?)
	local a = active[player]
	if not a or a.done then
		return
	end
	a.done = true
	active[player] = nil
	if a.record and a.record.alive then
		Registry.get("EnemyService").despawn(a.record)
	end
	if success then
		local profile = Registry.get("PlayerDataService").get(player)
		if profile then
			profile.trials[a.id] = os.time()
			Registry.get("PlayerDataService").markDirty(player)
		end
		Registry.get("QuestService").record(player, "Trial", { id = a.id })
		Registry.get("ProgressionService").present(player, "Trial_" .. a.id, {
			title = "Trial Complete",
			subtitle = TrialConfig.Trials[a.id].displayName,
			body = TrialConfig.Trials[a.id].reward,
			color = Color3.fromRGB(120, 230, 255),
		})
		Net.event("Notify"):FireClient(player, "QuestComplete", "Katana Trial complete!")
	else
		Net.event("Notify"):FireClient(player, "Error", "Trial failed: " .. (reason or "time ran out"))
	end
	sync(player)
end

local function complete(a: Active): boolean
	local def = TrialConfig.Trials[a.id]
	for _, o in def.objectives do
		if (a.counts[o.key] or 0) < o.count then
			return false
		end
	end
	return true
end

local function spawnChampion(player: Player, a: Active)
	local def = TrialConfig.Trials[a.id]
	a.record = Registry.get("EnemyService").spawn(def.champion, WorldConfig.Points.TrainingArena + Vector3.new(0, 0, 6), {
		ownerUserId = player.UserId,
		onDeath = function()
			if active[player] ~= a then
				return
			end
			a.counts.kill = (a.counts.kill or 0) + 1
			if complete(a) then
				finish(player, true)
			else
				Net.event("Notify"):FireClient(player, "Info", "The echo reforms. Finish your remaining objectives!")
				task.delay(1.5, function()
					if active[player] == a then
						spawnChampion(player, a)
					end
				end)
			end
			sync(player)
		end,
	})
end

function TrialService.onEvent(player: Player, event: string, data: any?)
	local a = active[player]
	if not a then
		return
	end
	if event == "Hit" and data and data.weapon == "Katana" then
		a.counts.hits = (a.counts.hits or 0) + 1
	elseif event == "PerfectParry" then
		a.counts.parry = (a.counts.parry or 0) + 1
	elseif event == "DodgeTelegraph" then
		a.counts.dodge = (a.counts.dodge or 0) + 1
	else
		return
	end
	if complete(a) then
		finish(player, true)
	else
		sync(player)
	end
end

function TrialService.fail(player: Player, reason: string)
	finish(player, false, reason)
end

function TrialService.Init() end

function TrialService.Start()
	local Requests = Registry.get("RequestService")
	Requests.on("StartTrial", "Request", function(player, args)
		local def = TrialConfig.Trials[args.id or ""]
		if not def then
			return false, "Unknown trial."
		end
		if active[player] then
			return false, "You are already in a trial."
		end
		if not Registry.get("SecurityService").within(player, WorldConfig.Points.TrialPedestal, 25) then
			return false, "Start the trial at the Training Arena pedestal."
		end
		local profile = Registry.get("PlayerDataService").get(player)
		if profile.weapons[def.weapon].mastery < def.masteryRequired then
			return false, string.format("Requires %s mastery %d.", def.weapon, def.masteryRequired)
		end
		local a: Active = { id = def.id, deadline = os.clock() + def.timeLimit, counts = {}, record = nil, done = false }
		active[player] = a
		spawnChampion(player, a)
		sync(player)
		task.delay(def.timeLimit, function()
			if active[player] == a then
				finish(player, false, "time ran out")
			end
		end)
		return true, "The Echo Duel begins!"
	end)
	Requests.on("AbandonTrial", "Request", function(player, _args)
		if not active[player] then
			return false, "No active trial."
		end
		finish(player, false, "abandoned")
		return true, nil
	end)
	-- leaving the arena area fails the trial
	task.spawn(function()
		while true do
			task.wait(1)
			for player, a in active do
				local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
				if not root or (root.Position - WorldConfig.Points.TrainingArena).Magnitude > 70 then
					finish(player, false, "you left the Training Arena")
				elseif not a.done and os.clock() > a.deadline then
					finish(player, false, "time ran out")
				end
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		local a = active[player]
		if a then
			a.done = true
			active[player] = nil
			if a.record and a.record.alive then
				Registry.get("EnemyService").despawn(a.record)
			end
		end
	end)
end

return TrialService
