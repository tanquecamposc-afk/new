--!strict
-- Every persistent material has a defined purpose; see GAME_DESIGN.md "Economy".

export type ItemDef = {
	id: string,
	name: string,
	description: string,
	color: Color3,
	rarity: string,
	kind: string, -- "Material" | "Consumable" | "Component"
}

local ItemConfig = {}

ItemConfig.Items = {
	Iron = {
		id = "Iron",
		name = "Iron Ore",
		description = "Basic forging metal. Used for katana upgrades, tempers and the Cobalt Pick.",
		color = Color3.fromRGB(176, 170, 162),
		rarity = "Common",
		kind = "Material",
	},
	Cobalt = {
		id = "Cobalt",
		name = "Cobalt Crystal",
		description = "Resonant crystal for advanced upgrades and energy devices. Needs a Cobalt Pick.",
		color = Color3.fromRGB(72, 132, 255),
		rarity = "Uncommon",
		kind = "Material",
	},
	Emberstone = {
		id = "Emberstone",
		name = "Emberstone",
		description = "Smouldering stone. Fire tempers, Ember Tonics and high upgrades.",
		color = Color3.fromRGB(255, 112, 52),
		rarity = "Uncommon",
		kind = "Material",
	},
	EssenceShard = {
		id = "EssenceShard",
		name = "Essence Shard",
		description = "Condensed rift energy. Fuels essence attunement and fusion research.",
		color = Color3.fromRGB(190, 120, 255),
		rarity = "Rare",
		kind = "Material",
	},
	BossSigil = {
		id = "BossSigil",
		name = "Warden Sigil",
		description = "Torn from the Fracture Warden. High-level upgrades and the Fracture Core.",
		color = Color3.fromRGB(255, 70, 110),
		rarity = "Epic",
		kind = "Material",
	},
	FractureCore = {
		id = "FractureCore",
		name = "Fracture Core",
		description = "A stabilised shard of the Warden's heart. Required for the Fracture Temper.",
		color = Color3.fromRGB(255, 210, 90),
		rarity = "Legendary",
		kind = "Component",
	},
	EmberTonic = {
		id = "EmberTonic",
		name = "Ember Tonic",
		description = "Restores 40% health over 2 seconds. Press H (or the tonic button) to drink.",
		color = Color3.fromRGB(255, 150, 90),
		rarity = "Common",
		kind = "Consumable",
	},
} :: { [string]: ItemDef }

ItemConfig.Order = { "Iron", "Cobalt", "Emberstone", "EssenceShard", "BossSigil", "FractureCore", "EmberTonic" }

function ItemConfig.isValid(id: any): boolean
	return type(id) == "string" and ItemConfig.Items[id] ~= nil
end

return ItemConfig
