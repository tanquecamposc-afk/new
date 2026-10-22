--!strict
-- Central monetization configuration.
-- ALL IDS ARE 0 (UNSET) ON PURPOSE. Create the products on the Roblox Creator Dashboard
-- (Monetization > Passes / Developer Products), then paste the numeric ids here.
-- An id of 0 makes the store show "Unavailable" and no purchase prompt is ever opened.
-- Nothing here sells power or random rewards.

local MonetizationConfig = {}

MonetizationConfig.GamePasses = {
	ExtraLoadouts = {
		id = 0,
		key = "ExtraLoadouts",
		displayName = "Loadout Archive",
		description = "+3 saved loadout slots. Pure convenience.",
	},
	AuraPack = {
		id = 0,
		key = "AuraPack",
		displayName = "Resonant Aura Pack",
		description = "Cosmetic: awakening auras gain a prismatic shimmer.",
	},
}

MonetizationConfig.Products = {
	SupporterDye = {
		id = 0,
		key = "SupporterDye",
		displayName = "Supporter Dye Pack",
		description = "Cosmetic: unlocks the Prismatic Edge katana trail. Granted once; re-purchasing has no extra effect.",
		grant = { cosmetic = "Prismatic" },
	},
}

MonetizationConfig.PassOrder = { "ExtraLoadouts", "AuraPack" }
MonetizationConfig.ProductOrder = { "SupporterDye" }

function MonetizationConfig.isConfigured(entry: { id: number }): boolean
	return type(entry.id) == "number" and entry.id > 0
end

return MonetizationConfig
