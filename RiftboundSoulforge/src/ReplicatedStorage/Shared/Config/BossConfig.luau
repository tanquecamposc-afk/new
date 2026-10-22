--!strict
-- The Fracture Warden. Phases are health thresholds (fraction of max health).

local BossConfig = {}

BossConfig.FractureWarden = {
	id = "FractureWarden",
	displayName = "The Fracture Warden",
	title = "Keeper of the Broken Seal",
	lore = "It was built to hold the Rift shut. Now it guards the crack it failed to close.",
	baseHealth = 5200,
	healthPerExtraPlayer = 0.75, -- +75% health per additional participant
	moveSpeed = 13,
	enrageMoveSpeed = 18,
	countdown = 10, -- seconds after the seal is triggered before the arena closes
	resetDelay = 8,
	victoryCooldown = 30,
	phases = {
		{ id = 1, name = "Guarded Assault", threshold = 1.0 },
		{ id = 2, name = "Rift Fractures", threshold = 0.7 },
		{ id = 3, name = "Resonance Overload", threshold = 0.4 },
		{ id = 4, name = "The Last Fracture", threshold = 0.15 },
	},
	attacks = {
		Cleave = {
			id = "Cleave",
			name = "Warden's Cleave",
			shape = "Line",
			windup = 1.0,
			damage = 22,
			length = 18,
			width = 12,
			parryable = true,
			cooldown = 3,
		},
		Sweep = {
			id = "Sweep",
			name = "Sundering Sweep",
			shape = "Circle",
			windup = 1.3,
			damage = 20,
			radius = 15,
			parryable = false,
			cooldown = 6,
		},
		FractureSlam = {
			id = "FractureSlam",
			name = "Fracture Slam",
			shape = "CircleAtTarget",
			windup = 1.1,
			damage = 26,
			radius = 9,
			parryable = false,
			cooldown = 7,
			exposes = 3.5, -- weak point exposed for N seconds afterwards
		},
		RiftLance = {
			id = "RiftLance",
			name = "Rift Lance",
			shape = "Line",
			windup = 0.9,
			damage = 24,
			length = 28,
			width = 6,
			parryable = true,
			cooldown = 8,
			parryStagger = 2.5, -- a perfect parry staggers the Warden and exposes the weak point
		},
		Fractures = {
			id = "Fractures",
			name = "Rift Fractures",
			windup = 1.2,
			damage = 7,
			radius = 6,
			duration = 7,
			tick = 0.5,
			count = 4,
			cooldown = 11,
		},
		ShardVolley = {
			id = "ShardVolley",
			name = "Shard Volley",
			windup = 1.0,
			damage = 16,
			radius = 5,
			count = 5,
			cooldown = 9,
		},
		RiftStep = {
			id = "RiftStep",
			name = "Rift Step",
			windup = 0.9,
			radius = 8,
			damage = 14,
			cooldown = 10,
		},
		Overload = {
			id = "Overload",
			name = "Resonance Overload",
			channel = 5.5,
			interruptFraction = 0.06, -- of max health, dealt during the channel
			damage = 45,
			safeZones = 2,
			safeRadius = 7,
			cooldown = 22,
			stunOnInterrupt = 4,
			exposeOnInterrupt = 6,
		},
		Suppression = {
			id = "Suppression",
			name = "Suppression Pulse",
			shape = "Ring",
			windup = 1.2,
			damage = 12,
			radius = 26,
			inner = 8,
			cooldown = 14,
			endsAwakening = true,
		},
	},
	phaseAttacks = {
		[1] = { "Cleave", "Sweep", "FractureSlam", "RiftLance" },
		[2] = { "Cleave", "Sweep", "FractureSlam", "RiftLance", "Fractures", "ShardVolley", "RiftStep" },
		[3] = { "Cleave", "FractureSlam", "RiftLance", "Fractures", "ShardVolley", "Overload", "Suppression" },
	},
	attackGap = { 1.3, 1.0, 0.8 }, -- idle time between attacks per phase
	weakPointMultiplier = 2.0,
	finalPhase = {
		waves = 3,
		tilesPerWave = 5,
		warnTime = 2.2,
		damage = 50,
		openingTime = 10,
		openingMultiplier = 3.0,
	},
	breach = { damageFraction = 0.05, stagger = 3 },
	rewards = {
		coins = 400,
		xp = 600,
		mastery = 200,
		essenceXp = 60,
		materials = { BossSigil = 2, Cobalt = 3, EssenceShard = 3 },
		firstClear = { coins = 600, materials = { BossSigil = 2 } },
		fractureCoreChance = 0.25, -- guaranteed alternative: craft one from 4 Warden Sigils
		minimumContribution = 0.02, -- fraction of total damage OR any mechanic success
	},
}

return BossConfig
