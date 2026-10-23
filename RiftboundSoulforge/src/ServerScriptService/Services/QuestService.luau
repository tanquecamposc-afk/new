--!strict
-- Tracks server-validated gameplay events against QuestConfig. Rewards are claimed explicitly
-- and exactly once (the claim flag is written before any reward is granted).

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local QuestConfig = require(Shared.Config.QuestConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local QuestService = {}

local function data(player: Player): any
	return Registry.get("PlayerDataService").get(player)
end

local function dayKey(): number
	return os.time() // 86400
end

local function refreshDaily(profile: any)
	local key = dayKey()
	if profile.daily.dayKey ~= key then
		profile.daily.dayKey = key
		profile.daily.progress = {}
		profile.daily.claimed = {}
	end
end

local function requirementsMet(profile: any, def: any): boolean
	if def.requires then
		for _, req in def.requires do
			if not profile.quests.completed[req] then
				return false
			end
		end
	end
	return true
end

-- Returns the progress table + completion flags for a quest given the profile.
local function questSlot(profile: any, def: any): (any, boolean, boolean)
	if def.daily or def.dailyPick then
		local progress = profile.daily.progress[def.id]
		local claimed = profile.daily.claimed[def.id] == true
		local complete = profile.daily.claimed[def.id] ~= nil or (progress and progress.done == true) or false
		return progress, complete, claimed
	end
	local progress = profile.quests.progress[def.id]
	return progress, profile.quests.completed[def.id] == true, profile.quests.claimed[def.id] == true
end

local function advance(player: Player, profile: any, def: any, event: string, eventData: any, amount: number): boolean
	local progress, complete = questSlot(profile, def)
	if complete then
		return false
	end
	local changed = false
	for i, objective in def.objectives do
		if QuestConfig.matches(objective, event, eventData) then
			if not progress then
				-- Dense array of zeros: DataStores reject sparse arrays (e.g. { [2] = 1 }).
				local counts = table.create(#def.objectives, 0)
				progress = { counts = counts }
				if def.daily or def.dailyPick then
					profile.daily.progress[def.id] = progress
				else
					profile.quests.progress[def.id] = progress
				end
			end
			local current = progress.counts[i] or 0
			if current < objective.count then
				progress.counts[i] = math.min(objective.count, current + amount)
				changed = true
			end
		end
	end
	if not changed then
		return false
	end
	local done = true
	for i, objective in def.objectives do
		if (progress.counts[i] or 0) < objective.count then
			done = false
			break
		end
	end
	if done then
		if def.daily or def.dailyPick then
			progress.done = true
		else
			profile.quests.completed[def.id] = true
		end
		Net.event("Notify"):FireClient(player, "QuestComplete", def.title, { id = def.id })
		Net.event("Effect"):FireClient(player, "Sound", { name = "QuestComplete" })
	end
	return true
end

function QuestService.dailyDefs(): { any }
	local defs = {}
	for _, idx in QuestConfig.dailyPicks(dayKey()) do
		local entry = QuestConfig.DailyPool[idx]
		table.insert(defs, {
			id = entry.id,
			title = entry.title,
			category = "Daily",
			description = "Desafío diario. Se reinicia a las 00:00 UTC.",
			objectives = entry.objectives,
			rewards = entry.rewards,
			dailyPick = true,
		})
	end
	return defs
end

-- Record a gameplay event. Only server code calls this.
function QuestService.record(player: Player, event: string, eventData: any?, amount: number?)
	local profile = data(player)
	if not profile then
		return
	end
	refreshDaily(profile)
	local n = amount or 1
	local changed = false
	for _, id in QuestConfig.Order do
		local def = QuestConfig.Quests[id]
		if requirementsMet(profile, def) then
			if advance(player, profile, def, event, eventData, n) then
				changed = true
			end
		end
	end
	if profile.level >= QuestConfig.DailyLevel then
		for _, def in QuestService.dailyDefs() do
			if advance(player, profile, def, event, eventData, n) then
				changed = true
			end
		end
	end
	if changed then
		Registry.get("PlayerDataService").markDirty(player)
	end
	Registry.get("TrialService").onEvent(player, event, eventData)
end

local function grantRewards(player: Player, rewards: any)
	local Inventory = Registry.get("InventoryService")
	local Progression = Registry.get("ProgressionService")
	Inventory.grant(player, rewards)
	if rewards.xp then
		Progression.addXp(player, rewards.xp)
	end
	if rewards.weaponMastery then
		Progression.addWeaponMastery(player, "Katana", rewards.weaponMastery)
	end
	if rewards.essence then
		Progression.unlockEssence(player, rewards.essence, "Recompensa de contrato.")
	end
end

function QuestService.claim(player: Player, questId: string): (boolean, string?)
	local profile = data(player)
	if not profile then
		return false, "Perfil no cargado."
	end
	refreshDaily(profile)
	local def = QuestConfig.Quests[questId]
	if def and not def.daily then
		if not profile.quests.completed[questId] then
			return false, "Aún no completado."
		end
		if profile.quests.claimed[questId] then
			return false, "Ya reclamado."
		end
		profile.quests.claimed[questId] = true -- set BEFORE granting: duplicate requests fail here
		Registry.get("PlayerDataService").markDirty(player)
		grantRewards(player, def.rewards)
		return true, "Recompensa reclamada: " .. def.title
	end
	-- Daily quest or daily pick
	local dailyDef = def
	if not dailyDef then
		for _, d in QuestService.dailyDefs() do
			if d.id == questId then
				dailyDef = d
			end
		end
	end
	if not dailyDef then
		return false, "Contrato desconocido."
	end
	local progress = profile.daily.progress[questId]
	if not progress or not progress.done then
		return false, "Aún no completado."
	end
	if profile.daily.claimed[questId] then
		return false, "Ya reclamado hoy."
	end
	profile.daily.claimed[questId] = true
	Registry.get("PlayerDataService").markDirty(player)
	grantRewards(player, dailyDef.rewards)
	return true, "Recompensa reclamada: " .. dailyDef.title
end

function QuestService.Init() end

function QuestService.Start()
	local Requests = Registry.get("RequestService")
	Requests.on("ClaimQuest", "Request", function(player, args)
		if type(args.id) ~= "string" or #args.id > 40 then
			return false, "Contrato no válido."
		end
		return QuestService.claim(player, args.id)
	end)
	Registry.get("PlayerDataService").Loaded:Connect(function(_player, profile)
		refreshDaily(profile)
	end)
end

return QuestService
