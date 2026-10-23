--!strict
-- XP curves and level unlocks. The pure maths live in Shared/Progression/Leveling.luau.

local ProgressionConfig = {}

ProgressionConfig.MaxLevel = 40

function ProgressionConfig.levelXp(level: number): number
	return math.floor(100 * level ^ 1.45)
end

function ProgressionConfig.weaponMasteryXp(level: number): number
	return math.floor(60 * level ^ 1.4)
end

function ProgressionConfig.essenceMasteryXp(level: number): number
	return math.floor(45 * level ^ 1.35)
end

ProgressionConfig.LevelUnlocks = {
	[2] = "Los desafíos diarios aparecen en el Tablón de Contratos.",
	[3] = "Ranura de esencia secundaria.",
	[4] = "Segunda ranura de equipamiento guardado.",
	[5] = "Sintonía de Gravedad disponible en la Cámara de Fusión.",
}

ProgressionConfig.FreeLoadoutSlots = 2
ProgressionConfig.PassLoadoutSlots = 3 -- extra slots from the optional game pass

-- Achievements: unlocked by ProgressionService when the matching stat/event happens.
ProgressionConfig.Achievements = {
	FirstSteel = { id = "FirstSteel", name = "Primer Acero", description = "Acierta tu primer golpe de katana." },
	PerfectGuard = { id = "PerfectGuard", name = "Guardia Perfecta", description = "Haz una parada perfecta." },
	Unbroken = { id = "Unbroken", name = "Intacto", description = "Haz 25 paradas perfectas.", stat = "perfectParries", target = 25 },
	SecondSoul = { id = "SecondSoul", name = "Segunda Alma", description = "Desbloquea una segunda esencia." },
	FirstFusion = { id = "FirstFusion", name = "Unión Imposible", description = "Desbloquea tu primera técnica de fusión." },
	FirstAwakening = { id = "FirstAwakening", name = "Resonante", description = "Activa un Despertar de Resonancia." },
	Evolved = { id = "Evolved", name = "Acero Vivo", description = "Evoluciona tu katana." },
	SecretKeeper = { id = "SecretKeeper", name = "Guardián de Secretos", description = "Descubre la Cámara del Ocaso Solar." },
	Bonded = { id = "Bonded", name = "Vinculados", description = "Activa una Resonancia Cooperativa." },
	Extractor = { id = "Extractor", name = "Manos Seguras", description = "Extrae en 10 expediciones.", stat = "extractions", target = 10 },
	DeepDelver = { id = "DeepDelver", name = "Explorador de las Profundidades", description = "Extrae en el Faro de la Fortaleza." },
	WardenSlayer = { id = "WardenSlayer", name = "Rompesellos", description = "Derrota al Celador de la Fractura." },
	Prospector = { id = "Prospector", name = "Prospector", description = "Mina 100 minerales.", stat = "oreMined", target = 100 },
}

ProgressionConfig.AchievementOrder = {
	"FirstSteel",
	"PerfectGuard",
	"Unbroken",
	"SecondSoul",
	"FirstFusion",
	"FirstAwakening",
	"Evolved",
	"SecretKeeper",
	"Bonded",
	"Extractor",
	"DeepDelver",
	"WardenSlayer",
	"Prospector",
}

-- Cosmetics earned through play (no Robux). Paid cosmetics are listed in MonetizationConfig.
ProgressionConfig.Cosmetics = {
	Default = { id = "Default", name = "Acero de Grieta", color = nil, source = "Starter" },
	Wardenbane = {
		id = "Wardenbane",
		name = "Filo Matacelador",
		color = Color3.fromRGB(255, 80, 120),
		source = "Logro: Rompesellos",
		achievement = "WardenSlayer",
	},
	Parrymaster = {
		id = "Parrymaster",
		name = "Filo Espejo",
		color = Color3.fromRGB(200, 255, 250),
		source = "Logro: Intacto",
		achievement = "Unbroken",
	},
	Prismatic = {
		id = "Prismatic",
		name = "Filo Prismático",
		color = Color3.fromRGB(255, 140, 255),
		source = "Pack de Tintes de Apoyo (compra opcional)",
		product = "SupporterDye",
	},
}
ProgressionConfig.CosmeticOrder = { "Default", "Wardenbane", "Parrymaster", "Prismatic" }

return ProgressionConfig
