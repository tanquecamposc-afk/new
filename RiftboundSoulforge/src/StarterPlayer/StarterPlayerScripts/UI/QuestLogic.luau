--!strict
-- Derives quest display state from the synced profile (display only; server is authoritative).

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local QuestConfig = require(Shared.Config.QuestConfig)

local QuestLogic = {}

export type Entry = {
	def: any,
	counts: { number },
	complete: boolean,
	claimed: boolean,
	available: boolean,
	daily: boolean,
}

local function dayKey(): number
	return math.floor(workspace:GetServerTimeNow() / 86400)
end

function QuestLogic.dailyDefs(): { any }
	local defs = {}
	for _, idx in QuestConfig.dailyPicks(dayKey()) do
		local entry = QuestConfig.DailyPool[idx]
		table.insert(defs, {
			id = entry.id,
			title = entry.title,
			category = "Daily",
			description = "Daily challenge. Resets at 00:00 UTC.",
			objectives = entry.objectives,
			rewards = entry.rewards,
			dailyPick = true,
		})
	end
	return defs
end

local function requirementsMet(profile: any, def: any): boolean
	for _, req in def.requires or {} do
		if not profile.quests.completed[req] then
			return false
		end
	end
	return true
end

function QuestLogic.entries(profile: any): { Entry }
	local list = {}
	local sameDay = profile.daily.dayKey == dayKey()
	for _, id in QuestConfig.Order do
		local def = QuestConfig.Quests[id]
		local isDaily = def.daily == true
		local progress, complete, claimed
		if isDaily then
			progress = sameDay and profile.daily.progress[id] or nil
			claimed = sameDay and profile.daily.claimed[id] == true
			complete = progress ~= nil and progress.done == true
		else
			progress = profile.quests.progress[id]
			complete = profile.quests.completed[id] == true
			claimed = profile.quests.claimed[id] == true
		end
		table.insert(list, {
			def = def,
			counts = (progress and progress.counts) or {},
			complete = complete,
			claimed = claimed,
			available = requirementsMet(profile, def),
			daily = isDaily,
		})
	end
	if profile.level >= QuestConfig.DailyLevel then
		for _, def in QuestLogic.dailyDefs() do
			local progress = sameDay and profile.daily.progress[def.id] or nil
			table.insert(list, {
				def = def,
				counts = (progress and progress.counts) or {},
				complete = progress ~= nil and progress.done == true,
				claimed = sameDay and profile.daily.claimed[def.id] == true,
				available = true,
				daily = true,
			})
		end
	end
	return list
end

-- Short list for the HUD tracker: claimable first, then the main path, then others.
function QuestLogic.tracked(profile: any, max: number): { Entry }
	local out = {}
	local entries = QuestLogic.entries(profile)
	for _, e in entries do
		if e.available and e.complete and not e.claimed then
			table.insert(out, e)
		end
	end
	for _, e in entries do
		if #out >= max then
			break
		end
		if e.available and not e.complete and e.def.category == "Main" then
			table.insert(out, e)
			break
		end
	end
	for _, e in entries do
		if #out >= max then
			break
		end
		if e.available and not e.complete and not table.find(out, e) and next(e.counts) then
			table.insert(out, e)
		end
	end
	while #out > max do
		table.remove(out)
	end
	return out
end

return QuestLogic
