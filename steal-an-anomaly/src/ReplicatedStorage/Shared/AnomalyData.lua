-- Bestiario de anomalías. Cada una se construye con piezas (AnomalyBuilder),
-- así que no hace falta subir mallas: todo funciona al abrir el archivo.
local AnomalyData = {}

local C = Color3.fromRGB

AnomalyData.List = {
	{
		Id = "watcher", Name = "Ojo Vigilante", Rarity = "Comun", Price = 100, Income = 2,
		Archetype = "watcher", Scale = 1,
		P = C(120, 70, 90), S = C(240, 235, 225), E = C(80, 255, 140),
		Lore = "Nunca parpadea. Nadie sabe qué está esperando ver.",
	},
	{
		Id = "tvhead", Name = "Tele Viviente", Rarity = "Comun", Price = 250, Income = 5,
		Archetype = "tvhead", Scale = 1,
		P = C(70, 90, 140), S = C(45, 45, 50), E = C(120, 220, 255),
		Lore = "Transmite un canal que no existe desde 1987.",
	},
	{
		Id = "hungrycube", Name = "Cubo Hambriento", Rarity = "Comun", Price = 550, Income = 9,
		Archetype = "hungrycube", Scale = 1,
		P = C(200, 120, 60), S = C(150, 80, 40), E = C(255, 240, 90),
		Lore = "Se come las monedas que se te caen. Y a veces los dedos.",
	},
	{
		Id = "jelly", Name = "Medusa del Vacío", Rarity = "Raro", Price = 1600, Income = 22,
		Archetype = "jelly", Scale = 1,
		P = C(120, 200, 255), S = C(60, 90, 200), E = C(160, 255, 255),
		Lore = "Flota en el aire como si fuera agua. El aire no está de acuerdo.",
	},
	{
		Id = "twocat", Name = "Gato Duplicado", Rarity = "Raro", Price = 3200, Income = 40,
		Archetype = "twocat", Scale = 1,
		P = C(240, 170, 90), S = C(60, 45, 40), E = C(140, 255, 90),
		Lore = "Maúlla en dos idiomas a la vez. Uno de ellos no es humano.",
	},
	{
		Id = "longneck", Name = "Cuello Largo", Rarity = "Raro", Price = 6500, Income = 72,
		Archetype = "longneck", Scale = 0.9,
		P = C(25, 22, 30), S = C(235, 230, 220), E = C(255, 255, 255),
		Lore = "Mira por las ventanas del segundo piso. Desde el suelo.",
	},
	{
		Id = "clock", Name = "Reloj Sin Tiempo", Rarity = "Epico", Price = 16000, Income = 155,
		Archetype = "clock", Scale = 1,
		P = C(210, 170, 70), S = C(245, 235, 210), E = C(110, 160, 255),
		Lore = "Sus agujas van hacia atrás. Tú también, un poquito.",
	},
	{
		Id = "tree", Name = "Árbol Susurrante", Rarity = "Epico", Price = 32000, Income = 270,
		Archetype = "tree", Scale = 1,
		P = C(90, 60, 45), S = C(60, 120, 70), E = C(255, 230, 120),
		Lore = "Si te acercas, susurra tu contraseña.",
	},
	{
		Id = "faceless", Name = "Sin Rostro", Rarity = "Epico", Price = 58000, Income = 440,
		Archetype = "faceless", Scale = 1,
		P = C(30, 30, 38), S = C(240, 240, 245), E = C(200, 30, 50),
		Lore = "Lleva traje para tu funeral. Por si acaso.",
	},
	{
		Id = "skinwalker", Name = "Skinwalker", Rarity = "Legendario", Price = 160000, Income = 1050,
		Archetype = "skinwalker", Scale = 1,
		P = C(80, 65, 55), S = C(230, 220, 200), E = C(255, 140, 40),
		Lore = "Imita la voz de tu mejor amigo. Muy bien.",
	},
	{
		Id = "angel", Name = "Ángel Glitcheado", Rarity = "Legendario", Price = 320000, Income = 1900,
		Archetype = "angel", Scale = 1,
		P = C(250, 245, 230), S = C(255, 255, 255), E = C(255, 230, 90),
		Lore = "NO TE MUEVAS. NO TE MUEVAS. NO TE M̷U̷E̷V̷A̷S̷.",
	},
	{
		Id = "smile", Name = "Luna Sonriente", Rarity = "Mitico", Price = 1100000, Income = 5200,
		Archetype = "smile", Scale = 1,
		P = C(245, 235, 180), S = C(200, 190, 140), E = C(255, 250, 160),
		Lore = "Bajó del cielo una noche y no quiere volver.",
	},
	{
		Id = "error404", Name = "ERROR_404", Rarity = "Mitico", Price = 2600000, Income = 11500,
		Archetype = "error404", Scale = 1,
		P = C(20, 20, 25), S = C(255, 0, 180), E = C(0, 255, 120),
		Lore = "Anomalía no encontrada. Pero ella sí te encontró a ti.",
	},
	{
		Id = "entity", Name = "La Entidad ∞", Rarity = "Secreto", Price = 12000000, Income = 42000,
		Archetype = "entity", Scale = 1,
		P = C(10, 5, 20), S = C(240, 240, 255), E = C(30, 255, 205),
		Lore = "Estaba aquí antes de Roblox. Estará aquí después.",
	},
}

AnomalyData.ById = {}
AnomalyData.ByRarity = {}
for i, def in ipairs(AnomalyData.List) do
	def.Order = i
	AnomalyData.ById[def.Id] = def
	AnomalyData.ByRarity[def.Rarity] = AnomalyData.ByRarity[def.Rarity] or {}
	table.insert(AnomalyData.ByRarity[def.Rarity], def)
end

return AnomalyData
