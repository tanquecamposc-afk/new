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
		displayName = "Ascensión Infernal",
		duration = 15,
		color = Color3.fromRGB(255, 96, 40),
		damageMult = 1.25,
		damageTakenMult = 1.0,
		attackSpeed = 1.0,
		onHit = "Burn",
		description = "+25% de daño. Cada golpe incendia.",
		signature = {
			id = "SolarCataclysm",
			displayName = "Cataclismo Solar",
			description = "Una detonación solar masiva a tu alrededor.",
			radius = 18,
			damage = 4.5,
		},
	},
	Storm = {
		id = "Storm",
		displayName = "Soberano de la Tempestad",
		duration = 15,
		color = Color3.fromRGB(110, 210, 255),
		damageMult = 1.1,
		damageTakenMult = 1.0,
		attackSpeed = 1.3,
		dodgeCooldownMult = 0.5,
		onHit = "Spark",
		description = "+30% velocidad de ataque, enfriamiento de esquiva a la mitad, los golpes saltan a un enemigo cercano.",
		signature = {
			id = "ThousandBolts",
			displayName = "Mil Relámpagos",
			description = "Rayos golpean hasta 8 enemigos a tu alrededor.",
			radius = 26,
			targets = 8,
			damage = 2.4,
		},
	},
	Gravity = {
		id = "Gravity",
		displayName = "Trono de Singularidad",
		duration = 15,
		color = Color3.fromRGB(170, 120, 255),
		damageMult = 1.1,
		damageTakenMult = 0.75,
		attackSpeed = 1.0,
		onHit = "Gather",
		description = "Recibes un 25% menos de daño. Los golpes marcan a los enemigos como Agrupados.",
		signature = {
			id = "EventHorizon",
			displayName = "Horizonte de Sucesos",
			description = "Colapsa el espacio a tu alrededor, atrayendo y aplastando a los enemigos.",
			radius = 20,
			pullTime = 1.2,
			damage = 3.8,
		},
	},
}

-- Counterplay: Warden's Suppression Pulse ends awakenings; afterwards a burnout period
-- prevents resonance gain (GameConfig.Combat.AwakeningBurnout).

return AwakeningConfig
