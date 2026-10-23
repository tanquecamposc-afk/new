--!strict
-- The Fracture Warden. Phases are health thresholds (fraction of max health).

local BossConfig = {}

BossConfig.FractureWarden = {
	id = "FractureWarden",
	displayName = "El Celador de la Fractura",
	title = "Guardián del Sello Roto",
	lore = "Fue creado para mantener cerrada la Grieta. Ahora custodia la fisura que no logró sellar.",
	baseHealth = 5200,
	healthPerExtraPlayer = 0.75, -- +75% health per additional participant
	moveSpeed = 13,
	enrageMoveSpeed = 18,
	countdown = 10, -- seconds after the seal is triggered before the arena closes
	resetDelay = 8,
	victoryCooldown = 30,
	phases = {
		{ id = 1, name = "Asalto en Guardia", threshold = 1.0 },
		{ id = 2, name = "Fracturas de Grieta", threshold = 0.7 },
		{ id = 3, name = "Sobrecarga de Resonancia", threshold = 0.4 },
		{ id = 4, name = "La Última Fractura", threshold = 0.15 },
	},
	attacks = {
		Cleave = {
			id = "Cleave",
			name = "Hendidura del Celador",
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
			name = "Barrido Desgarrador",
			shape = "Circle",
			windup = 1.3,
			damage = 20,
			radius = 15,
			parryable = false,
			cooldown = 6,
		},
		FractureSlam = {
			id = "FractureSlam",
			name = "Golpe de Fractura",
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
			name = "Lanza de la Grieta",
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
			name = "Fracturas de Grieta",
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
			name = "Andanada de Esquirlas",
			windup = 1.0,
			damage = 16,
			radius = 5,
			count = 5,
			cooldown = 9,
		},
		RiftStep = {
			id = "RiftStep",
			name = "Paso de Grieta",
			windup = 0.9,
			radius = 8,
			damage = 14,
			cooldown = 10,
		},
		Overload = {
			id = "Overload",
			name = "Sobrecarga de Resonancia",
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
			name = "Pulso Supresor",
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
