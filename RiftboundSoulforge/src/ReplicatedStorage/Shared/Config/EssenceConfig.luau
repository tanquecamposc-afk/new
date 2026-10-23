--!strict
-- Essences and their active abilities. Server behaviour for each ability id lives in
-- ServerScriptService/Server/Combat/Abilities.luau; this file only holds data.

local EssenceConfig = {}

EssenceConfig.Essences = {
	Ember = {
		id = "Ember",
		implemented = true,
		displayName = "Brasa",
		theme = "Fuego, ataques explosivos, daño en el tiempo.",
		color = Color3.fromRGB(255, 106, 61),
		maxMastery = 5,
		abilities = {
			Q = "FlareBurst",
			E = "EmberNova",
		},
		masteryUnlocks = {
			[1] = "Estallido Ígneo (Q).",
			[2] = "Nova de Brasas (E).",
			[3] = "Fuego Salvaje: los enemigos que mueren ardiendo propagan su quemadura.",
			[4] = "El despertar Ascensión Infernal dura 3 s más.",
			[5] = "Habilidades de Brasa +15% de daño.",
		},
		unlockHint = "Tu primera esencia. Siempre disponible.",
	},
	Storm = {
		id = "Storm",
		implemented = true,
		displayName = "Tormenta",
		theme = "Rayos, movimiento rápido, ataques encadenados.",
		color = Color3.fromRGB(79, 195, 255),
		maxMastery = 5,
		abilities = {
			Q = "ArcBolt",
			E = "Thunderstep",
		},
		masteryUnlocks = {
			[1] = "Rayo en Arco (Q).",
			[2] = "Paso Trueno (E).",
			[3] = "Carga Estática: los enemigos Cargados reciben +10% de daño.",
			[4] = "El despertar Soberano de la Tempestad dura 3 s más.",
			[5] = "Habilidades de Tormenta +15% de daño.",
		},
		unlockHint = "Completa el contrato 'Purga de Acechadores' en Emberfall, o sintonízala en la Cámara de Fusión.",
		attuneCost = { EssenceShard = 6, Coins = 250 },
		attuneLevel = 3,
	},
	Gravity = {
		id = "Gravity",
		implemented = true,
		displayName = "Gravedad",
		theme = "Atracción, desplazamiento, control del campo de batalla.",
		color = Color3.fromRGB(162, 123, 255),
		maxMastery = 5,
		abilities = {
			Q = "GravitonPull",
			E = "CrushingField",
		},
		masteryUnlocks = {
			[1] = "Atracción Gravitón (Q).",
			[2] = "Campo Aplastante (E).",
			[3] = "Presión de Evento: los enemigos Agrupados reciben +15% de daño.",
			[4] = "El despertar Trono de Singularidad dura 3 s más.",
			[5] = "Habilidades de Gravedad +15% de daño.",
		},
		unlockHint = "Derrota al Centinela Ceniciento en la Fortaleza en Ruinas, o sintonízala en la Cámara de Fusión.",
		attuneCost = { EssenceShard = 10, Coins = 400 },
		attuneLevel = 5,
	},
	-- Planned essences: data only, never equippable while implemented = false.
	Frost = {
		id = "Frost",
		implemented = false,
		displayName = "Escarcha",
		theme = "Congelación, estructuras defensivas, control de área.",
		color = Color3.fromRGB(170, 230, 255),
		unlockHint = "Sellado. Llegará con la región de Frostgrave.",
	},
	Umbra = {
		id = "Umbra",
		implemented = false,
		displayName = "Umbra",
		theme = "Sombras, engaño, movilidad.",
		color = Color3.fromRGB(120, 90, 160),
		unlockHint = "Sellado. Sus susurros aún no han llegado al Nexo.",
	},
	Verdant = {
		id = "Verdant",
		implemented = false,
		displayName = "Verdor",
		theme = "Raíces, regeneración, manipulación del campo de batalla.",
		color = Color3.fromRGB(110, 210, 120),
		unlockHint = "Sellado. Llegará con la región de Alcance Verdeante.",
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
		displayName = "Estallido Ígneo",
		description = "Un cono de fuego frente a ti. Quema durante 4 s.",
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
		displayName = "Nova de Brasas",
		description = "Detonas a tu alrededor, repeliendo y quemando a los enemigos.",
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
		displayName = "Rayo en Arco",
		description = "Un rayo golpea al enemigo apuntado y salta a 3 más. Aplica Cargado.",
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
		displayName = "Paso Trueno",
		description = "Te teletransportas como un rayo, dañando todo a tu paso. Breve invulnerabilidad.",
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
		displayName = "Atracción Gravitón",
		description = "Atrae a los enemigos alrededor del punto apuntado. Aplica Agrupado durante 3 s.",
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
		displayName = "Campo Aplastante",
		description = "Una zona de gravedad intensa: ralentiza a los enemigos un 50% y los aplasta cada 0,5 s.",
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
		displayName = "Sol Colapsante",
		description = "Un pozo de gravedad compacto atrae a los enemigos y estalla en una explosión solar que quema.",
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
		displayName = "Grieta Magnética",
		description = "Abre una grieta magnética que mantiene juntos a los enemigos y los azota con rayos encadenados durante 3 s.",
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

-- Display names for a list of essence ids, joined with " + ".
function EssenceConfig.names(ids: { string }): string
	local out = {}
	for _, id in ids do
		local def = EssenceConfig.Essences[id]
		table.insert(out, if def then def.displayName else id)
	end
	return table.concat(out, " + ")
end

return EssenceConfig
