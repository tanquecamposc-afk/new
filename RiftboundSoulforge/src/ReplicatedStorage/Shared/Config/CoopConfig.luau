--!strict
-- Cooperative Resonance: two different players, complementary abilities, short window.
-- Fully server-validated in CombatService (CoopResonance section).

local CoopConfig = {}

CoopConfig.Window = 3.0 -- seconds between primer and detonator
CoopConfig.PairCooldown = 6 -- seconds before the same two players can trigger the same combo again
CoopConfig.MaxDistance = 60 -- both players must be within this distance of the target

CoopConfig.Combos = {
	SingularityDetonation = {
		id = "SingularityDetonation",
		displayName = "Detonación de Singularidad",
		description = "Un jugador Agrupa a los enemigos con Gravedad y otro los detona con Brasa.",
		primerTag = "Gathered",
		detonatorEssence = "Ember",
		effect = "Explosion",
		radius = 12,
		damage = 40,
		color = Color3.fromRGB(255, 140, 60),
	},
	ConductiveCollapse = {
		id = "ConductiveCollapse",
		displayName = "Colapso Conductor",
		description = "Un jugador Carga a los enemigos con Tormenta y otro los agrupa con Gravedad.",
		primerTag = "Charged",
		detonatorEssence = "Gravity",
		effect = "ChainBurst",
		radius = 14,
		damage = 32,
		color = Color3.fromRGB(120, 200, 255),
	},
	Breach = {
		id = "Breach",
		displayName = "Brecha del Celador",
		description = "Un jugador hace una parada perfecta al Celador y otro golpea su punto débil expuesto en 2,5 s.",
		boss = true,
		window = 2.5,
		damage = 0, -- resolved by BossService (percentage of max health)
		color = Color3.fromRGB(255, 230, 120),
	},
}

CoopConfig.Order = { "SingularityDetonation", "ConductiveCollapse", "Breach" }

return CoopConfig
