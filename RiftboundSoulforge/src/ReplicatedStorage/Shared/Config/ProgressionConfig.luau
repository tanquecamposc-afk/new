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
	[2] = "Daily challenges appear on the Quest Board.",
	[3] = "Secondary essence slot.",
	[4] = "Second saved loadout slot.",
	[5] = "Gravity attunement available at the Fusion Chamber.",
}

ProgressionConfig.FreeLoadoutSlots = 2
ProgressionConfig.PassLoadoutSlots = 3 -- extra slots from the optional game pass

-- Achievements: unlocked by ProgressionService when the matching stat/event happens.
ProgressionConfig.Achievements = {
	FirstSteel = { id = "FirstSteel", name = "First Steel", description = "Land your first katana strike." },
	PerfectGuard = { id = "PerfectGuard", name = "Perfect Guard", description = "Perform a perfect parry." },
	Unbroken = { id = "Unbroken", name = "Unbroken", description = "Perform 25 perfect parries.", stat = "perfectParries", target = 25 },
	SecondSoul = { id = "SecondSoul", name = "Second Soul", description = "Unlock a second essence." },
	FirstFusion = { id = "FirstFusion", name = "Impossible Union", description = "Unlock your first fusion technique." },
	FirstAwakening = { id = "FirstAwakening", name = "Resonant", description = "Activate a Resonance Awakening." },
	Evolved = { id = "Evolved", name = "Living Steel", description = "Evolve your katana." },
	SecretKeeper = { id = "SecretKeeper", name = "Secret Keeper", description = "Discover the Sunfall Chamber." },
	Bonded = { id = "Bonded", name = "Bonded", description = "Trigger a Cooperative Resonance." },
	Extractor = { id = "Extractor", name = "Safe Hands", description = "Extract from 10 expeditions.", stat = "extractions", target = 10 },
	DeepDelver = { id = "DeepDelver", name = "Deep Delver", description = "Extract from the Keep Beacon." },
	WardenSlayer = { id = "WardenSlayer", name = "Seal Breaker", description = "Defeat the Fracture Warden." },
	Prospector = { id = "Prospector", name = "Prospector", description = "Mine 100 ore.", stat = "oreMined", target = 100 },
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
	Default = { id = "Default", name = "Riftsteel", color = nil, source = "Starter" },
	Wardenbane = {
		id = "Wardenbane",
		name = "Wardenbane Edge",
		color = Color3.fromRGB(255, 80, 120),
		source = "Achievement: Seal Breaker",
		achievement = "WardenSlayer",
	},
	Parrymaster = {
		id = "Parrymaster",
		name = "Mirror Edge",
		color = Color3.fromRGB(200, 255, 250),
		source = "Achievement: Unbroken",
		achievement = "Unbroken",
	},
	Prismatic = {
		id = "Prismatic",
		name = "Prismatic Edge",
		color = Color3.fromRGB(255, 140, 255),
		source = "Supporter Dye Pack (optional purchase)",
		product = "SupporterDye",
	},
}
ProgressionConfig.CosmeticOrder = { "Default", "Wardenbane", "Parrymaster", "Prismatic" }

return ProgressionConfig
