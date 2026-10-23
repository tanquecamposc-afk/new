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
		name = "Mineral de Hierro",
		description = "Metal de forja básico. Para mejoras de katana, temples y el Pico de Cobalto.",
		color = Color3.fromRGB(176, 170, 162),
		rarity = "Common",
		kind = "Material",
	},
	Cobalt = {
		id = "Cobalt",
		name = "Cristal de Cobalto",
		description = "Cristal resonante para mejoras avanzadas y dispositivos de energía. Requiere Pico de Cobalto.",
		color = Color3.fromRGB(72, 132, 255),
		rarity = "Uncommon",
		kind = "Material",
	},
	Emberstone = {
		id = "Emberstone",
		name = "Piedra Ascua",
		description = "Piedra humeante. Para temples de fuego, Tónicos de Brasa y mejoras altas.",
		color = Color3.fromRGB(255, 112, 52),
		rarity = "Uncommon",
		kind = "Material",
	},
	EssenceShard = {
		id = "EssenceShard",
		name = "Fragmento de Esencia",
		description = "Energía de grieta condensada. Alimenta la sintonía de esencias y la investigación de fusiones.",
		color = Color3.fromRGB(190, 120, 255),
		rarity = "Rare",
		kind = "Material",
	},
	BossSigil = {
		id = "BossSigil",
		name = "Sello del Celador",
		description = "Arrancado del Celador de la Fractura. Para mejoras de alto nivel y el Núcleo de Fractura.",
		color = Color3.fromRGB(255, 70, 110),
		rarity = "Epic",
		kind = "Material",
	},
	FractureCore = {
		id = "FractureCore",
		name = "Núcleo de Fractura",
		description = "Un fragmento estabilizado del corazón del Celador. Necesario para el Temple de Fractura.",
		color = Color3.fromRGB(255, 210, 90),
		rarity = "Legendary",
		kind = "Component",
	},
	EmberTonic = {
		id = "EmberTonic",
		name = "Tónico de Brasa",
		description = "Restaura el 40% de la salud en 2 segundos. Pulsa H (o el botón de tónico) para beber.",
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
