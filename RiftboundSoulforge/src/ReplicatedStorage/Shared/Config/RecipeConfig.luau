--!strict
-- Deterministic forge and crafting recipes. Costs may include "Coins".
-- CraftingService validates every requirement server-side; the client only previews.

local RecipeConfig = {}

-- Katana upgrade costs indexed by the TARGET level (2..5).
RecipeConfig.Upgrades = {
	Katana = {
		[2] = { cost = { Iron = 6, Coins = 120 }, level = 1 },
		[3] = { cost = { Iron = 10, Cobalt = 3, Coins = 280 }, level = 3 },
		[4] = { cost = { Cobalt = 8, Emberstone = 6, Coins = 600 }, level = 6 },
		[5] = { cost = { Cobalt = 10, BossSigil = 2, Coins = 1000 }, level = 9 },
	},
}

RecipeConfig.Tempers = {
	Swift = { cost = { Iron = 8, Emberstone = 3, Coins = 200 } },
	Heavy = { cost = { Iron = 12, Coins = 220 } },
	Guard = { cost = { Cobalt = 5, Coins = 260 } },
	Resonant = { cost = { EssenceShard = 6, Emberstone = 4, Coins = 300 }, blueprint = "SunfallBlueprint" },
	Fracture = { cost = { FractureCore = 1, BossSigil = 2, Coins = 800 } },
	None = { cost = {} },
}

RecipeConfig.Crafts = {
	CobaltPick = {
		id = "CobaltPick",
		displayName = "Cobalt Pick",
		description = "Mining tool tier 2. Lets you harvest Cobalt Crystal.",
		cost = { Iron = 10, Coins = 120 },
		result = { kind = "Tool", tier = 2 },
		once = true,
	},
	EmberTonic = {
		id = "EmberTonic",
		displayName = "Ember Tonic x2",
		description = "Two healing tonics (40% health each).",
		cost = { Emberstone = 2, EssenceShard = 1 },
		result = { kind = "Item", item = "EmberTonic", amount = 2 },
	},
	FractureCore = {
		id = "FractureCore",
		displayName = "Fracture Core",
		description = "Guaranteed alternative to the Warden's rare drop.",
		cost = { BossSigil = 4, Cobalt = 6 },
		result = { kind = "Item", item = "FractureCore", amount = 1 },
	},
	ShardCondenser = {
		id = "ShardCondenser",
		displayName = "Condense Essence Shard",
		description = "Refine raw ore into one Essence Shard.",
		cost = { Iron = 6, Emberstone = 2, Coins = 60 },
		result = { kind = "Item", item = "EssenceShard", amount = 1 },
	},
}

RecipeConfig.CraftOrder = { "CobaltPick", "EmberTonic", "ShardCondenser", "FractureCore" }

-- Changing evolution branch never deletes mastery; it only costs coins.
RecipeConfig.EvolutionRespec = { cost = { Coins = 500 } }

return RecipeConfig
