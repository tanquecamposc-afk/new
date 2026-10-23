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
		displayName = "Katana de Acero de Grieta",
		family = "Blade",
		description = "Una hoja rápida y precisa. Encadena golpes ligeros, castiga con un tajo pesado desenvainado y premia las guardias perfectas.",
		baseDamage = 12,
		comboResetTime = 0.9,
		light = {
			{ name = "Tajo Ascendente", damage = 1.0, windup = 0.12, recovery = 0.26, range = 8, width = 8, resonance = 2 },
			{ name = "Tajo de Retorno", damage = 1.0, windup = 0.11, recovery = 0.26, range = 8, width = 8, resonance = 2 },
			{ name = "Barrido Creciente", damage = 1.25, windup = 0.14, recovery = 0.34, range = 8.5, width = 11, resonance = 3 },
			{
				name = "Corte de Grieta",
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
			name = "Tajo Desenvainado",
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
			[2] = "Desenvaine Ascendente: los ataques pesados aturden más tiempo a los enemigos comunes.",
			[3] = "Corte de Grieta: un 4.º golpe ligero de remate.",
			[4] = "Prueba de la Katana desbloqueada en la Arena de Entrenamiento.",
			[5] = "Evolución: elige Filo Tempestad o Filo Égida (requiere la Prueba de la Katana).",
			[7] = "Resonancia del Filo: +15% de resonancia con golpes de katana.",
			[10] = "Maestro de la Grieta: +10% de daño de katana.",
		},
		maxMastery = 10,
		evolutionMastery = 5,
		evolutionTrial = "KatanaTrial",
		evolutions = {
			Tempest = {
				id = "Tempest",
				displayName = "Filo Tempestad",
				summary = "Combos rápidos, movilidad y contraataques precisos.",
				details = {
					"Velocidad de ataque +15%.",
					"5.º golpe ligero: Ráfaga de Vendaval.",
					"El pesado se convierte en Estocada de Vendaval: un tajo con embestida.",
					"Enfriamiento de esquiva -40%.",
				},
				trailColor = Color3.fromRGB(110, 230, 255),
				attackSpeed = 1.15,
				dodgeCooldownMult = 0.6,
				extraLight = {
					name = "Ráfaga de Vendaval",
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
					name = "Estocada de Vendaval",
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
				displayName = "Filo Égida",
				summary = "Paradas defensivas, castigos pesados y energía protectora.",
				details = {
					"Ventana de parada perfecta +0,08 s.",
					"Las paradas perfectas activan Réplica Égida (contraataque de daño x2).",
					"El pesado se convierte en Golpe Baluarte: un golpe en área que otorga un escudo del 30% del daño.",
					"Reducción de daño al bloquear +15%.",
				},
				trailColor = Color3.fromRGB(255, 205, 90),
				attackSpeed = 1.0,
				parryWindowBonus = 0.08,
				blockBonus = 0.15,
				riposteDamage = 2.0,
				heavy = {
					name = "Golpe Baluarte",
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
	Greatsword = { id = "Greatsword", implemented = false, displayName = "Mandoble", family = "Heavy" },
	DualBlades = { id = "DualBlades", implemented = false, displayName = "Doble Hoja", family = "Blade" },
	ArcaneStaff = { id = "ArcaneStaff", implemented = false, displayName = "Bastón Arcano", family = "Caster" },
	Gauntlets = { id = "Gauntlets", implemented = false, displayName = "Guanteletes", family = "Fist" },
	Spear = { id = "Spear", implemented = false, displayName = "Lanza", family = "Polearm" },
	Scythe = { id = "Scythe", implemented = false, displayName = "Guadaña", family = "Reaper" },
}

WeaponConfig.Order = { "Katana", "Greatsword", "DualBlades", "ArcaneStaff", "Gauntlets", "Spear", "Scythe" }

-- Upgrade level multipliers (forge). Level 1 is the base weapon.
WeaponConfig.UpgradeDamage = { 1.0, 1.08, 1.16, 1.25, 1.35 }
WeaponConfig.MaxUpgrade = 5

-- Tempers: one active modification per weapon, chosen at the forge.
WeaponConfig.Tempers = {
	None = { id = "None", displayName = "Sin temple", description = "Sin modificación." },
	Swift = {
		id = "Swift",
		displayName = "Temple Veloz",
		description = "Velocidad de ataque +10%, daño -5%.",
		attackSpeed = 1.1,
		damage = 0.95,
	},
	Heavy = {
		id = "Heavy",
		displayName = "Temple Pesado",
		description = "Ataques pesados +25% de daño y +0,3 s de aturdimiento.",
		heavyDamage = 1.25,
		heavyStagger = 0.3,
	},
	Guard = {
		id = "Guard",
		displayName = "Temple de Guardia",
		description = "Reducción al bloquear +15%, ventana de parada +0,03 s.",
		blockBonus = 0.15,
		parryWindowBonus = 0.03,
	},
	Resonant = {
		id = "Resonant",
		displayName = "Temple Resonante",
		description = "Habilidades de esencia +20% de daño, ganancia de resonancia +15%.",
		abilityDamage = 1.2,
		resonanceGain = 1.15,
	},
	Fracture = {
		id = "Fracture",
		displayName = "Temple de Fractura",
		description = "+12% de daño y los remates liberan una onda de grieta.",
		damage = 1.12,
		finisherShockwave = true,
	},
}

WeaponConfig.TemperOrder = { "None", "Swift", "Heavy", "Guard", "Resonant", "Fracture" }

return WeaponConfig
