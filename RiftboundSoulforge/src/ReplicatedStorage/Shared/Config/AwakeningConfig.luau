--!strict
-- Resonance Awakening per primary essence. CombatService applies these generically.

local AwakeningConfig = {}

AwakeningConfig.Gains = {
	-- Resonance gained for meaningful actions (multiplied by tempers etc.).
	PerfectParry = 15,
	DodgeTelegraph = 8,
	Interrupt = 10,
	CoopResonance = 15,
	Breach = 20,
}

AwakeningConfig.Forms = {
	Ember = {
		id = "Ember",
		displayName = "Infernal Ascension",
		duration = 15,
		color = Color3.fromRGB(255, 96, 40),
		damageMult = 1.25,
		damageTakenMult = 1.0,
		attackSpeed = 1.0,
		onHit = "Burn",
		description = "+25% damage. Every strike ignites.",
		signature = {
			id = "SolarCataclysm",
			displayName = "Solar Cataclysm",
			description = "A massive solar detonation around you.",
			radius = 18,
			damage = 4.5,
		},
	},
	Storm = {
		id = "Storm",
		displayName = "Tempest Sovereign",
		duration = 15,
		color = Color3.fromRGB(110, 210, 255),
		damageMult = 1.1,
		damageTakenMult = 1.0,
		attackSpeed = 1.3,
		dodgeCooldownMult = 0.5,
		onHit = "Spark",
		description = "+30% attack speed, halved dodge cooldown, strikes arc to a nearby enemy.",
		signature = {
			id = "ThousandBolts",
			displayName = "Thousand Bolts",
			description = "Lightning strikes up to 8 enemies around you.",
			radius = 26,
			targets = 8,
			damage = 2.4,
		},
	},
	Gravity = {
		id = "Gravity",
		displayName = "Singularity Throne",
		duration = 15,
		color = Color3.fromRGB(170, 120, 255),
		damageMult = 1.1,
		damageTakenMult = 0.75,
		attackSpeed = 1.0,
		onHit = "Gather",
		description = "Take 25% less damage. Strikes mark enemies as Gathered.",
		signature = {
			id = "EventHorizon",
			displayName = "Event Horizon",
			description = "Collapse space around you, dragging enemies in and crushing them.",
			radius = 20,
			pullTime = 1.2,
			damage = 3.8,
		},
	},
}

-- Counterplay: Warden's Suppression Pulse ends awakenings; afterwards a burnout period
-- prevents resonance gain (GameConfig.Combat.AwakeningBurnout).

return AwakeningConfig
