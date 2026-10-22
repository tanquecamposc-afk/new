--!strict
-- Essences and their active abilities. Server behaviour for each ability id lives in
-- ServerScriptService/Server/Combat/Abilities.luau; this file only holds data.

local EssenceConfig = {}

EssenceConfig.Essences = {
	Ember = {
		id = "Ember",
		implemented = true,
		displayName = "Ember",
		theme = "Fire, explosive attacks, damage over time.",
		color = Color3.fromRGB(255, 106, 61),
		maxMastery = 5,
		abilities = {
			Q = "FlareBurst",
			E = "EmberNova",
		},
		masteryUnlocks = {
			[1] = "Flare Burst (Q).",
			[2] = "Ember Nova (E).",
			[3] = "Wildfire: enemies that die while burning spread their burn.",
			[4] = "Infernal Ascension awakening lasts 3s longer.",
			[5] = "Ember abilities +15% damage.",
		},
		unlockHint = "Your first essence. Always available.",
	},
	Storm = {
		id = "Storm",
		implemented = true,
		displayName = "Storm",
		theme = "Lightning, fast movement, linked attacks.",
		color = Color3.fromRGB(79, 195, 255),
		maxMastery = 5,
		abilities = {
			Q = "ArcBolt",
			E = "Thunderstep",
		},
		masteryUnlocks = {
			[1] = "Arc Bolt (Q).",
			[2] = "Thunderstep (E).",
			[3] = "Static Charge: Charged enemies take +10% damage.",
			[4] = "Tempest Sovereign awakening lasts 3s longer.",
			[5] = "Storm abilities +15% damage.",
		},
		unlockHint = "Complete the contract 'Stalker Cull' in Emberfall, or attune at the Fusion Chamber.",
		attuneCost = { EssenceShard = 6, Coins = 250 },
		attuneLevel = 3,
	},
	Gravity = {
		id = "Gravity",
		implemented = true,
		displayName = "Gravity",
		theme = "Attraction, displacement, battlefield control.",
		color = Color3.fromRGB(162, 123, 255),
		maxMastery = 5,
		abilities = {
			Q = "GravitonPull",
			E = "CrushingField",
		},
		masteryUnlocks = {
			[1] = "Graviton Pull (Q).",
			[2] = "Crushing Field (E).",
			[3] = "Event Pressure: Gathered enemies take +15% damage.",
			[4] = "Singularity Throne awakening lasts 3s longer.",
			[5] = "Gravity abilities +15% damage.",
		},
		unlockHint = "Defeat the Ashen Sentinel in the Ruined Keep, or attune at the Fusion Chamber.",
		attuneCost = { EssenceShard = 10, Coins = 400 },
		attuneLevel = 5,
	},
	-- Planned essences: data only, never equippable while implemented = false.
	Frost = {
		id = "Frost",
		implemented = false,
		displayName = "Frost",
		theme = "Freezing, defensive structures, area control.",
		color = Color3.fromRGB(170, 230, 255),
		unlockHint = "Sealed. Expected with the Frostgrave region.",
	},
	Umbra = {
		id = "Umbra",
		implemented = false,
		displayName = "Umbra",
		theme = "Shadows, deception, mobility.",
		color = Color3.fromRGB(120, 90, 160),
		unlockHint = "Sealed. Its whispers have not reached the Nexus yet.",
	},
	Verdant = {
		id = "Verdant",
		implemented = false,
		displayName = "Verdant",
		theme = "Roots, regeneration, battlefield manipulation.",
		color = Color3.fromRGB(110, 210, 120),
		unlockHint = "Sealed. Expected with the Verdant Reach region.",
	},
}

EssenceConfig.Order = { "Ember", "Storm", "Gravity", "Frost", "Umbra", "Verdant" }

-- Player level required before a secondary essence slot opens.
EssenceConfig.SecondarySlotLevel = 3

-- Ability definitions. `essence` drives mastery gain and fusion attunement.
EssenceConfig.Abilities = {
	FlareBurst = {
		id = "FlareBurst",
		essence = "Ember",
		displayName = "Flare Burst",
		description = "A cone of flame in front of you. Burns for 4s.",
		cooldown = 6,
		damage = 1.8,
		range = 14,
		width = 9,
		burnDps = 4,
		burnDuration = 4,
		resonance = 3,
		masteryRequired = 1,
	},
	EmberNova = {
		id = "EmberNova",
		essence = "Ember",
		displayName = "Ember Nova",
		description = "Detonate around yourself, knocking enemies back and burning them.",
		cooldown = 12,
		damage = 2.2,
		radius = 12,
		knockback = 12,
		burnDps = 3,
		burnDuration = 3,
		resonance = 4,
		masteryRequired = 2,
	},
	ArcBolt = {
		id = "ArcBolt",
		essence = "Storm",
		displayName = "Arc Bolt",
		description = "Lightning strikes the enemy you aim at and chains to 3 more. Applies Charged.",
		cooldown = 5,
		damage = 1.6,
		range = 32,
		chainRange = 14,
		chains = 3,
		chainFalloff = 0.85,
		chargedDuration = 4,
		resonance = 3,
		masteryRequired = 1,
	},
	Thunderstep = {
		id = "Thunderstep",
		essence = "Storm",
		displayName = "Thunderstep",
		description = "Blink forward in a bolt, damaging everything on the path. Brief invulnerability.",
		cooldown = 9,
		damage = 1.5,
		distance = 18,
		width = 6,
		iframes = 0.3,
		resonance = 3,
		masteryRequired = 2,
	},
	GravitonPull = {
		id = "GravitonPull",
		essence = "Gravity",
		displayName = "Graviton Pull",
		description = "Pull enemies around the aim point together. Applies Gathered for 3s.",
		cooldown = 8,
		damage = 1.0,
		range = 30,
		radius = 12,
		pullTime = 0.6,
		gatheredDuration = 3,
		resonance = 3,
		masteryRequired = 1,
	},
	CrushingField = {
		id = "CrushingField",
		essence = "Gravity",
		displayName = "Crushing Field",
		description = "A zone of heavy gravity: slows enemies by 50% and crushes them every 0.5s.",
		cooldown = 14,
		damage = 0.5,
		range = 30,
		radius = 10,
		duration = 4,
		tick = 0.5,
		slow = 0.5,
		resonance = 1,
		masteryRequired = 2,
	},
	-- Fusion techniques (slot R). Unlocked through FusionConfig.
	CollapsingSun = {
		id = "CollapsingSun",
		essence = "Fusion",
		displayName = "Collapsing Sun",
		description = "A compact gravity well drags enemies in, then erupts in a solar blast that burns.",
		cooldown = 20,
		damage = 4.0,
		range = 30,
		radius = 14,
		blastRadius = 12,
		pullTime = 1.2,
		burnDps = 6,
		burnDuration = 4,
		resonance = 8,
	},
	MagneticRift = {
		id = "MagneticRift",
		essence = "Fusion",
		displayName = "Magnetic Rift",
		description = "Tear a magnetic rift that holds enemies together and lashes them with chained lightning for 3s.",
		cooldown = 22,
		damage = 0.9,
		range = 30,
		radius = 13,
		duration = 3,
		tick = 0.5,
		chains = 3,
		resonance = 8,
	},
}

function EssenceConfig.isPlayable(id: any): boolean
	if type(id) ~= "string" then
		return false
	end
	local def = EssenceConfig.Essences[id]
	return def ~= nil and def.implemented == true
end

return EssenceConfig
