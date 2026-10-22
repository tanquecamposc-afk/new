--!strict
-- Quests track server-validated gameplay events recorded through QuestService.record.
-- Adding a quest = adding a table entry; no other system needs to change.

export type Objective = { event: string, filter: { [string]: any }?, count: number, label: string }

local QuestConfig = {}

QuestConfig.Quests = {
	-- Main path (doubles as the onboarding tutorial)
	m01_steel = {
		id = "m01_steel",
		category = "Main",
		title = "Steel and Spark",
		description = "Head to the Training Arena east of the plaza and strike the training dummies.",
		hint = "Left Mouse = light combo. V = heavy attack.",
		objectives = { { event = "Hit", filter = { targetKind = "Training" }, count = 8, label = "Strike training targets" } },
		rewards = { coins = 50, xp = 60 },
	},
	m02_guard = {
		id = "m02_guard",
		category = "Main",
		title = "The Perfect Guard",
		description = "Face the Sparring Golem. Block right before its strike lands, and dodge through its slam.",
		hint = "Right Mouse = block (tap just before impact for a Perfect Parry). Shift = dodge.",
		requires = { "m01_steel" },
		objectives = {
			{ event = "PerfectParry", count = 1, label = "Perfect parry" },
			{ event = "DodgeTelegraph", count = 1, label = "Dodge through a telegraphed attack" },
		},
		rewards = { coins = 75, xp = 80, items = { EmberTonic = 2 } },
	},
	m03_rift = {
		id = "m03_rift",
		category = "Main",
		title = "Through the Rift",
		description = "Read the expedition briefing at the Rift Portal (south) and enter Emberfall Frontier.",
		hint = "Walk into the portal and press E/F on the prompt.",
		requires = { "m02_guard" },
		objectives = { { event = "EnterRegion", filter = { region = "Frontier" }, count = 1, label = "Reach the Frontier" } },
		rewards = { coins = 40, xp = 60 },
	},
	m04_ore = {
		id = "m04_ore",
		category = "Main",
		title = "Ore of the Frontier",
		description = "Mine Iron Veins (grey rock with pale glints). Mined ore goes into your Satchel.",
		hint = "Hold the prompt on an Iron Vein.",
		requires = { "m03_rift" },
		objectives = { { event = "Mine", filter = { item = "Iron" }, count = 4, label = "Mine Iron Ore" } },
		rewards = { coins = 60, xp = 80 },
	},
	m05_stalkers = {
		id = "m05_stalkers",
		category = "Main",
		title = "Stalker Cull",
		description = "Rift Stalkers hunt in packs near the outpost. Defeat three.",
		hint = "Their lunge is a straight red line. Step aside, then punish.",
		requires = { "m04_ore" },
		objectives = { { event = "Kill", filter = { archetype = "RiftStalker" }, count = 3, label = "Defeat Rift Stalkers" } },
		rewards = { coins = 100, xp = 140, essence = "Storm" },
	},
	m06_extract = {
		id = "m06_extract",
		category = "Main",
		title = "Bring It Home",
		description = "Return to the Camp Beacon and bank your Satchel before something takes it from you.",
		hint = "Unbanked loot is at risk if you fall.",
		requires = { "m05_stalkers" },
		objectives = { { event = "Extract", count = 1, label = "Extract with loot" } },
		rewards = { coins = 80, xp = 100 },
	},
	m07_forge = {
		id = "m07_forge",
		category = "Main",
		title = "Temper the Blade",
		description = "Visit the Forge in the Nexus and upgrade your katana.",
		hint = "Upgrade to +2 costs 6 Iron and 120 coins.",
		requires = { "m06_extract" },
		objectives = { { event = "Upgrade", count = 1, label = "Upgrade a weapon" } },
		rewards = { coins = 100, xp = 120, items = { Iron = 4 } },
	},
	m08_keep = {
		id = "m08_keep",
		category = "Main",
		title = "The Ashen Sentinel",
		description = "Cross the Cinder Ravine, enter the Ruined Keep and defeat its champion.",
		hint = "Heavy attacks break guards. Its Shockwave ring has a safe centre.",
		requires = { "m07_forge" },
		objectives = { { event = "Kill", filter = { archetype = "AshenSentinel" }, count = 1, label = "Defeat the Ashen Sentinel" } },
		rewards = { coins = 250, xp = 300, essence = "Gravity" },
	},
	m09_secret = {
		id = "m09_secret",
		category = "Main",
		title = "Whispers in Stone",
		description = "A mural on the Frontier's north cliff speaks of three flames. Find what it hides.",
		hint = "Look at the mural, then find the three braziers.",
		requires = { "m08_keep" },
		objectives = { { event = "Discover", filter = { id = "SunfallChamber" }, count = 1, label = "Find the hidden chamber" } },
		rewards = { coins = 200, xp = 250 },
	},
	m10_warden = {
		id = "m10_warden",
		category = "Main",
		title = "Break the Warden",
		description = "Beyond the Keep lies the Fracture Arena. Challenge the Fracture Warden, ideally with friends.",
		hint = "Study its attacks: some can be parried, and its back hides a weakness.",
		requires = { "m09_secret" },
		objectives = { { event = "BossDefeated", filter = { boss = "FractureWarden" }, count = 1, label = "Defeat the Fracture Warden" } },
		rewards = { coins = 500, xp = 600 },
	},

	-- Exploration / discovery contracts
	x_cartographer = {
		id = "x_cartographer",
		category = "Exploration",
		title = "Cartographer",
		description = "Chart Emberfall: reach the Ruined Keep and the Fracture Arena.",
		requires = { "m03_rift" },
		objectives = {
			{ event = "EnterRegion", filter = { region = "Keep" }, count = 1, label = "Enter the Ruined Keep" },
			{ event = "EnterRegion", filter = { region = "Arena" }, count = 1, label = "See the Fracture Arena" },
		},
		rewards = { coins = 120, xp = 150 },
	},
	x_delver = {
		id = "x_delver",
		category = "Exploration",
		title = "Deep Delver",
		description = "Extract from the Keep Beacon, deep inside the Ruined Keep.",
		requires = { "m06_extract" },
		objectives = { { event = "Extract", filter = { beacon = "Keep" }, count = 1, label = "Extract at the Keep Beacon" } },
		rewards = { coins = 200, xp = 200, items = { EssenceShard = 2 } },
	},
	-- Gathering
	g_cobalt = {
		id = "g_cobalt",
		category = "Gathering",
		title = "Blue Fire",
		description = "Craft a Cobalt Pick at the Artisan Bench and mine Cobalt Crystal in the Keep.",
		requires = { "m07_forge" },
		objectives = { { event = "Mine", filter = { item = "Cobalt" }, count = 5, label = "Mine Cobalt Crystal" } },
		rewards = { coins = 150, xp = 160 },
	},
	-- Mastery challenge
	w_parry = {
		id = "w_parry",
		category = "Mastery",
		title = "Blade Discipline",
		description = "Perfect-parry 10 enemy attacks anywhere.",
		requires = { "m02_guard" },
		objectives = { { event = "PerfectParry", count = 10, label = "Perfect parries" } },
		rewards = { coins = 150, xp = 150, weaponMastery = 120 },
	},
	-- Cooperative
	c_bond = {
		id = "c_bond",
		category = "Coop",
		title = "Resonant Bond",
		description = "Trigger a Cooperative Resonance with another player (e.g. their Gravity + your Ember).",
		requires = { "m05_stalkers" },
		objectives = { { event = "Coop", count = 1, label = "Cooperative Resonance" } },
		rewards = { coins = 200, xp = 200, items = { EssenceShard = 3 } },
	},
	-- Boss contract (repeatable once per day)
	b_warden = {
		id = "b_warden",
		category = "Boss",
		title = "Warden Contract",
		description = "The Nexus pays for every Warden that falls. Repeatable daily.",
		requires = { "m08_keep" },
		daily = true,
		objectives = { { event = "BossDefeated", filter = { boss = "FractureWarden" }, count = 1, label = "Defeat the Fracture Warden" } },
		rewards = { coins = 300, xp = 300, items = { BossSigil = 1 } },
	},
}

-- Daily challenges: 3 are picked deterministically from this pool each UTC day.
QuestConfig.DailyPool = {
	{ id = "d_hunter", title = "Rift Hunter", objectives = { { event = "Kill", count = 12, label = "Defeat enemies" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_miner", title = "Deep Veins", objectives = { { event = "Mine", count = 12, label = "Mine ore" } }, rewards = { coins = 100, xp = 100 } },
	{ id = "d_parry", title = "Iron Wall", objectives = { { event = "PerfectParry", count = 5, label = "Perfect parries" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_extract", title = "Safe Return", objectives = { { event = "Extract", count = 2, label = "Extractions" } }, rewards = { coins = 140, xp = 120 } },
	{ id = "d_fusion", title = "Impossible Arts", objectives = { { event = "FusionCast", count = 3, label = "Cast fusion techniques" } }, rewards = { coins = 150, xp = 150, items = { EssenceShard = 1 } } },
	{ id = "d_coop", title = "Together", objectives = { { event = "Coop", count = 1, label = "Cooperative Resonance" } }, rewards = { coins = 180, xp = 150 } },
	{ id = "d_awaken", title = "Resonate", objectives = { { event = "Awaken", count = 2, label = "Awakenings" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_dodge", title = "Untouchable", objectives = { { event = "DodgeTelegraph", count = 6, label = "Dodge telegraphed attacks" } }, rewards = { coins = 110, xp = 110 } },
}
QuestConfig.DailyCount = 3
QuestConfig.DailyLevel = 2

QuestConfig.Order = {
	"m01_steel",
	"m02_guard",
	"m03_rift",
	"m04_ore",
	"m05_stalkers",
	"m06_extract",
	"m07_forge",
	"m08_keep",
	"m09_secret",
	"m10_warden",
	"x_cartographer",
	"x_delver",
	"g_cobalt",
	"w_parry",
	"c_bond",
	"b_warden",
}

-- Returns the indices of today's daily challenges (deterministic per day key).
function QuestConfig.dailyPicks(dayKey: number): { number }
	local picks = {}
	local n = #QuestConfig.DailyPool
	local seed = dayKey
	while #picks < math.min(QuestConfig.DailyCount, n) do
		seed = (seed * 1103515245 + 12345) % 2147483648
		local idx = (seed % n) + 1
		if not table.find(picks, idx) then
			table.insert(picks, idx)
		end
	end
	return picks
end

function QuestConfig.matches(objective: Objective, event: string, data: { [string]: any }?): boolean
	if objective.event ~= event then
		return false
	end
	if objective.filter then
		if not data then
			return false
		end
		for key, value in objective.filter do
			if data[key] ~= value then
				return false
			end
		end
	end
	return true
end

return QuestConfig
