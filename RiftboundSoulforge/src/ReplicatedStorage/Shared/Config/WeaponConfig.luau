--!strict
-- Weapon families. A new weapon = a new entry here + a moveset table. The server combat
-- pipeline (CombatService) reads only this data; nothing is hardcoded per weapon there.

export type Strike = {
	name: string,
	damage: number, -- multiplier on weapon base damage
	windup: number, -- seconds before the hit resolves
	recovery: number, -- seconds after the hit before the next action
	range: number, -- hitbox length (studs) in front of the player
	width: number, -- hitbox width (studs)
	resonance: number,
	masteryRequired: number?,
	finisher: boolean?,
	stagger: number?,
}

local WeaponConfig = {}

WeaponConfig.Weapons = {
	Katana = {
		id = "Katana",
		implemented = true,
		displayName = "Riftsteel Katana",
		family = "Blade",
		description = "A fast, precise blade. Chains light strikes, punishes with a drawn heavy cut and rewards perfect guards.",
		baseDamage = 12,
		comboResetTime = 0.9,
		light = {
			{ name = "Rising Cut", damage = 1.0, windup = 0.12, recovery = 0.26, range = 8, width = 8, resonance = 2 },
			{ name = "Return Cut", damage = 1.0, windup = 0.11, recovery = 0.26, range = 8, width = 8, resonance = 2 },
			{ name = "Crescent Sweep", damage = 1.25, windup = 0.14, recovery = 0.34, range = 8.5, width = 11, resonance = 3 },
			{
				name = "Rift Severance",
				damage = 1.8,
				windup = 0.2,
				recovery = 0.5,
				range = 9.5,
				width = 12,
				resonance = 5,
				finisher = true,
				masteryRequired = 3,
				stagger = 0.6,
			},
		} :: { Strike },
		heavy = {
			name = "Drawn Cut",
			damage = 2.6,
			windup = 0.42,
			recovery = 0.55,
			range = 10,
			width = 7,
			resonance = 5,
			stamina = 20,
			guardBreak = true,
			stagger = 0.4,
		},
		block = { damageReduction = 0.7, staminaPerHit = 14, parryWindow = 0.22 },
		dodge = { stamina = 22, iframes = 0.35, cooldown = 0.55, speed = 70, duration = 0.2 },
		trailColor = Color3.fromRGB(235, 240, 255),
		-- Mastery level -> human readable unlock. Mechanics read the numbers on the moves themselves.
		masteryUnlocks = {
			[2] = "Rising Draw: heavy attacks stagger standard enemies for longer.",
			[3] = "Rift Severance: a 4th light strike finisher.",
			[4] = "Katana Trial unlocked at the Training Arena.",
			[5] = "Evolution: choose Tempest Edge or Aegis Edge (requires the Katana Trial).",
			[7] = "Edge Resonance: +15% resonance from katana hits.",
			[10] = "Rift Master: +10% katana damage.",
		},
		maxMastery = 10,
		evolutionMastery = 5,
		evolutionTrial = "KatanaTrial",
		evolutions = {
			Tempest = {
				id = "Tempest",
				displayName = "Tempest Edge",
				summary = "Rapid combos, mobility and precise counters.",
				details = {
					"Attack speed +15%.",
					"5th light strike: Gale Flurry.",
					"Heavy becomes Gale Thrust: a lunging dash strike.",
					"Dodge cooldown -40%.",
				},
				trailColor = Color3.fromRGB(110, 230, 255),
				attackSpeed = 1.15,
				dodgeCooldownMult = 0.6,
				extraLight = {
					name = "Gale Flurry",
					damage = 1.6,
					windup = 0.12,
					recovery = 0.45,
					range = 9,
					width = 12,
					resonance = 4,
					finisher = true,
					stagger = 0.3,
				},
				heavy = {
					name = "Gale Thrust",
					damage = 2.3,
					windup = 0.25,
					recovery = 0.5,
					range = 6,
					width = 7,
					resonance = 5,
					stamina = 18,
					guardBreak = true,
					stagger = 0.4,
					lunge = 16,
				},
			},
			Aegis = {
				id = "Aegis",
				displayName = "Aegis Edge",
				summary = "Defensive parries, heavy punishments and protective energy.",
				details = {
					"Perfect parry window +0.08s.",
					"Perfect parries trigger Aegis Riposte (2x damage counter).",
					"Heavy becomes Bulwark Slam: an area slam that grants a 30% damage shield.",
					"Block damage reduction +15%.",
				},
				trailColor = Color3.fromRGB(255, 205, 90),
				attackSpeed = 1.0,
				parryWindowBonus = 0.08,
				blockBonus = 0.15,
				riposteDamage = 2.0,
				heavy = {
					name = "Bulwark Slam",
					damage = 2.4,
					windup = 0.5,
					recovery = 0.6,
					range = 0,
					width = 0,
					radius = 12,
					resonance = 6,
					stamina = 22,
					guardBreak = true,
					stagger = 0.8,
					shield = 0.3,
					shieldDuration = 3,
				},
			},
		},
	},

	-- Planned families. They are listed so the Codex can tease them, but `implemented = false`
	-- keeps them out of every equip / craft path until a real moveset exists.
	Greatsword = { id = "Greatsword", implemented = false, displayName = "Greatsword", family = "Heavy" },
	DualBlades = { id = "DualBlades", implemented = false, displayName = "Dual Blades", family = "Blade" },
	ArcaneStaff = { id = "ArcaneStaff", implemented = false, displayName = "Arcane Staff", family = "Caster" },
	Gauntlets = { id = "Gauntlets", implemented = false, displayName = "Gauntlets", family = "Fist" },
	Spear = { id = "Spear", implemented = false, displayName = "Spear", family = "Polearm" },
	Scythe = { id = "Scythe", implemented = false, displayName = "Scythe", family = "Reaper" },
}

WeaponConfig.Order = { "Katana", "Greatsword", "DualBlades", "ArcaneStaff", "Gauntlets", "Spear", "Scythe" }

-- Upgrade level multipliers (forge). Level 1 is the base weapon.
WeaponConfig.UpgradeDamage = { 1.0, 1.08, 1.16, 1.25, 1.35 }
WeaponConfig.MaxUpgrade = 5

-- Tempers: one active modification per weapon, chosen at the forge.
WeaponConfig.Tempers = {
	None = { id = "None", displayName = "Untempered", description = "No modification." },
	Swift = {
		id = "Swift",
		displayName = "Swift Temper",
		description = "Attack speed +10%, damage -5%.",
		attackSpeed = 1.1,
		damage = 0.95,
	},
	Heavy = {
		id = "Heavy",
		displayName = "Heavy Temper",
		description = "Heavy attacks +25% damage and +0.3s stagger.",
		heavyDamage = 1.25,
		heavyStagger = 0.3,
	},
	Guard = {
		id = "Guard",
		displayName = "Guard Temper",
		description = "Block reduction +15%, parry window +0.03s.",
		blockBonus = 0.15,
		parryWindowBonus = 0.03,
	},
	Resonant = {
		id = "Resonant",
		displayName = "Resonant Temper",
		description = "Essence abilities +20% damage, resonance gain +15%.",
		abilityDamage = 1.2,
		resonanceGain = 1.15,
	},
	Fracture = {
		id = "Fracture",
		displayName = "Fracture Temper",
		description = "+12% damage and finishers release a rift shockwave.",
		damage = 1.12,
		finisherShockwave = true,
	},
}

WeaponConfig.TemperOrder = { "None", "Swift", "Heavy", "Guard", "Resonant", "Fracture" }

return WeaponConfig
