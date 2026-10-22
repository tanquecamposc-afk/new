--!strict
-- Mastery trials teach a system; they never cost currency.

local TrialConfig = {}

TrialConfig.Trials = {
	KatanaTrial = {
		id = "KatanaTrial",
		displayName = "Katana Trial: The Echo Duel",
		weapon = "Katana",
		masteryRequired = 4,
		timeLimit = 100,
		champion = "BladeWraith",
		description = "Prove you understand the blade: chain strikes, read the echo, guard perfectly and evade.",
		objectives = {
			{ key = "hits", label = "Land katana strikes", count = 15 },
			{ key = "parry", label = "Perfect parry", count = 1 },
			{ key = "dodge", label = "Dodge a telegraphed attack", count = 1 },
			{ key = "kill", label = "Defeat the Blade Wraith", count = 1 },
		},
		reward = "Unlocks the katana evolution choice at mastery 5.",
	},
}

return TrialConfig
