--!strict
-- Codex discoveries. Undiscovered entries show only their hint.

local DiscoveryConfig = {}

DiscoveryConfig.Discoveries = {
	SunfallChamber = {
		id = "SunfallChamber",
		displayName = "The Sunfall Chamber",
		category = "Secret",
		hint = "Three flames remember the order of the sky.",
		text = "A sealed chamber behind the Frontier cliffs. Its tablet describes a sun that collapses into itself.",
	},
	SunfallTablet = {
		id = "SunfallTablet",
		displayName = "Sunfall Tablet",
		category = "Fusion",
		hint = "Something in the Sunfall Chamber can be read.",
		text = "Teaches the theory of Collapsing Sun (Ember + Gravity) and the Resonant Temper blueprint.",
	},
	WardenLanceWeakness = {
		id = "WardenLanceWeakness",
		displayName = "Warden Weakness: Rift Lance",
		category = "Boss",
		hint = "One of the Warden's attacks can be turned back on it.",
		text = "A perfect parry against Rift Lance staggers the Warden and exposes the crystal on its back.",
	},
	WardenBackCrystal = {
		id = "WardenBackCrystal",
		displayName = "Warden Weakness: Back Crystal",
		category = "Boss",
		hint = "The Warden hides something behind it.",
		text = "When the crystal on its back glows, strikes from behind deal double damage.",
	},
	RavineShortcut = {
		id = "RavineShortcut",
		displayName = "Ravine Drawbridge",
		category = "World",
		hint = "There must be an easier way back across the ravine.",
		text = "A lever on the far side of the Cinder Ravine lowers a drawbridge for everyone in the server.",
	},
}

DiscoveryConfig.Order = { "SunfallChamber", "SunfallTablet", "RavineShortcut", "WardenLanceWeakness", "WardenBackCrystal" }

return DiscoveryConfig
