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
		displayName = "Archivo de Equipamientos",
		description = "+3 ranuras de equipamiento guardado. Pura comodidad.",
	},
	AuraPack = {
		id = 0,
		key = "AuraPack",
		displayName = "Pack de Auras Resonantes",
		description = "Cosmético: las auras de despertar ganan un brillo prismático.",
	},
}

MonetizationConfig.Products = {
	SupporterDye = {
		id = 0,
		key = "SupporterDye",
		displayName = "Pack de Tintes de Apoyo",
		description = "Cosmético: desbloquea la estela de katana Filo Prismático. Se concede una vez; recomprarlo no tiene efecto extra.",
		grant = { cosmetic = "Prismatic" },
	},
}

MonetizationConfig.PassOrder = { "ExtraLoadouts", "AuraPack" }
MonetizationConfig.ProductOrder = { "SupporterDye" }

function MonetizationConfig.isConfigured(entry: { id: number }): boolean
	return type(entry.id) == "number" and entry.id > 0
end

return MonetizationConfig
