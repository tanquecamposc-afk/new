--[[
	Blockverse para Roblox · Bloques y objetos
	Cada bloque tiene un color y un material de Roblox, su dureza,
	la herramienta que lo rompe mejor y lo que suelta.
	Los objetos (palos, herramientas, comida…) usan ids desde 100.
]]
local Bloques = {}

Bloques.porId = {} -- id -> definición
Bloques.porClave = {} -- clave -> id
Bloques.lista = {} -- todos los bloques, en orden (para el modo creativo)
Bloques.objetos = {} -- todos los objetos que no son bloques

local function rgb(r, g, b)
	return { r, g, b }
end

local function bloque(id, clave, nombre, d)
	d.id = id
	d.clave = clave
	d.nombre = nombre
	d.esBloque = true
	d.forma = d.forma or "cubo"
	if d.solido == nil then
		d.solido = d.forma == "cubo"
	end
	d.dureza = d.dureza or 1
	if d.suelta == nil then
		d.suelta = id
	end
	Bloques.porId[id] = d
	Bloques.porClave[clave] = id
	table.insert(Bloques.lista, d)
	return id
end

local function objeto(id, clave, nombre, d)
	d.id = id
	d.clave = clave
	d.nombre = nombre
	d.esBloque = false
	Bloques.porId[id] = d
	Bloques.porClave[clave] = id
	table.insert(Bloques.objetos, d)
	return id
end

------------------------------------------------------------------
-- Bloques
------------------------------------------------------------------
local TIERRA = rgb(134, 96, 67)

bloque(1, "cesped", "Bloque de césped", {
	color = TIERRA, material = "Ground", dureza = 0.9, herr = "pala", suelta = 2,
	capa = { color = rgb(98, 168, 58), material = "Grass" },
})
bloque(2, "tierra", "Tierra", { color = TIERRA, material = "Ground", dureza = 0.75, herr = "pala" })
bloque(3, "piedra", "Piedra", { color = rgb(128, 128, 128), material = "Slate", dureza = 2.2, herr = "pico", nivel = 1, suelta = 4 })
bloque(4, "roca", "Roca", { color = rgb(112, 112, 112), material = "Cobblestone", dureza = 2.5, herr = "pico", nivel = 1 })
bloque(5, "tronco", "Tronco de roble", {
	color = rgb(104, 78, 46), material = "Wood", dureza = 2.4, herr = "hacha",
	capa = { color = rgb(170, 136, 86), material = "WoodPlanks" }, capaArriba = true,
})
bloque(6, "tablones", "Tablones", { color = rgb(178, 140, 84), material = "WoodPlanks", dureza = 2, herr = "hacha" })
bloque(7, "hojas", "Hojas de roble", {
	color = rgb(62, 128, 42), material = "LeafyGrass", dureza = 0.3, herr = "hacha",
	transparente = true, suelta = 0, extra = { id = 104, prob = 0.08 },
})
bloque(8, "arena", "Arena", { color = rgb(220, 208, 160), material = "Sand", dureza = 0.75, herr = "pala" })
bloque(9, "grava", "Grava", { color = rgb(136, 128, 126), material = "Pebble", dureza = 0.9, herr = "pala" })
bloque(10, "vidrio", "Vidrio", {
	color = rgb(205, 232, 242), material = "Glass", dureza = 0.45, transparente = true, transp = 0.55,
})
bloque(11, "menaCarbon", "Mena de carbón", { color = rgb(92, 92, 96), material = "Slate", dureza = 3, herr = "pico", nivel = 1, suelta = 101, veta = rgb(30, 30, 30) })
bloque(12, "menaHierro", "Mena de hierro", { color = rgb(128, 120, 116), material = "Slate", dureza = 3.2, herr = "pico", nivel = 2, veta = rgb(214, 170, 140) })
bloque(13, "menaOro", "Mena de oro", { color = rgb(128, 124, 112), material = "Slate", dureza = 3.2, herr = "pico", nivel = 3, veta = rgb(250, 214, 70) })
bloque(14, "menaDiamante", "Mena de diamante", { color = rgb(120, 128, 132), material = "Slate", dureza = 3.5, herr = "pico", nivel = 3, suelta = 106, veta = rgb(90, 230, 225) })
bloque(15, "lecho", "Lecho de roca", { color = rgb(42, 42, 44), material = "Basalt", dureza = -1 })
bloque(16, "nieve", "Nieve", { color = rgb(242, 247, 252), material = "Snow", dureza = 0.5, herr = "pala" })
bloque(17, "cespedNevado", "Césped nevado", {
	color = TIERRA, material = "Ground", dureza = 0.9, herr = "pala", suelta = 2,
	capa = { color = rgb(240, 246, 252), material = "Snow" },
})
bloque(18, "cactus", "Cactus", { color = rgb(78, 140, 58), material = "Grass", dureza = 0.6, transparente = true, ancho = 0.85 })
bloque(19, "mesa", "Mesa de trabajo", {
	color = rgb(150, 104, 60), material = "WoodPlanks", dureza = 2.5, herr = "hacha",
	capa = { color = rgb(120, 80, 46), material = "Wood" }, capaArriba = true,
})
bloque(20, "horno", "Horno", {
	color = rgb(96, 96, 98), material = "Cobblestone", dureza = 3.5, herr = "pico", nivel = 1,
	capa = { color = rgb(70, 70, 72), material = "Slate" }, capaArriba = true,
})
bloque(21, "antorcha", "Antorcha", {
	color = rgb(120, 86, 50), material = "Wood", forma = "antorcha", dureza = 0,
	luz = { brillo = 2.2, rango = 18, color = rgb(255, 196, 120) },
})
bloque(22, "ladrillos", "Ladrillos", { color = rgb(150, 76, 60), material = "Brick", dureza = 2.5, herr = "pico", nivel = 1 })
bloque(23, "lana", "Lana", { color = rgb(236, 236, 236), material = "Fabric", dureza = 0.8 })
bloque(24, "obsidiana", "Obsidiana", { color = rgb(26, 16, 38), material = "Basalt", dureza = 25, herr = "pico", nivel = 4 })
bloque(25, "hielo", "Hielo", { color = rgb(150, 196, 255), material = "Ice", dureza = 0.6, herr = "pico", transparente = true, transp = 0.2 })
bloque(26, "arenisca", "Arenisca", { color = rgb(216, 200, 150), material = "Sandstone", dureza = 1.2, herr = "pico", nivel = 1 })
bloque(27, "piedraLuminosa", "Piedra luminosa", {
	color = rgb(255, 214, 120), material = "Neon", dureza = 0.4, luz = { brillo = 1.6, rango = 20, color = rgb(255, 220, 150) },
})
bloque(28, "ladrillosPiedra", "Ladrillos de piedra", { color = rgb(122, 122, 124), material = "Pavement", dureza = 2, herr = "pico", nivel = 1 })
bloque(29, "florRoja", "Amapola", { color = rgb(214, 40, 36), material = "SmoothPlastic", forma = "flor", dureza = 0 })
bloque(30, "florAmarilla", "Diente de león", { color = rgb(244, 216, 40), material = "SmoothPlastic", forma = "flor", dureza = 0 })
bloque(31, "hierba", "Hierba alta", { color = rgb(92, 150, 52), material = "Grass", forma = "cruz", dureza = 0, suelta = 0, extra = { id = 109, prob = 0.15 } })
bloque(32, "agua", "Agua", { color = rgb(40, 90, 200), material = "Water", forma = "agua", dureza = -1, suelta = 0, transparente = true })
bloque(33, "troncoAbeto", "Tronco de abeto", {
	color = rgb(66, 48, 32), material = "Wood", dureza = 2.4, herr = "hacha",
	capa = { color = rgb(120, 92, 60), material = "WoodPlanks" }, capaArriba = true,
})
bloque(34, "hojasAbeto", "Hojas de abeto", {
	color = rgb(44, 92, 56), material = "LeafyGrass", dureza = 0.3, herr = "hacha", transparente = true, suelta = 0,
})
bloque(35, "calabaza", "Calabaza", { color = rgb(220, 128, 30), material = "SmoothPlastic", dureza = 1, herr = "hacha" })
bloque(36, "musgo", "Roca musgosa", { color = rgb(96, 116, 88), material = "Cobblestone", dureza = 2.5, herr = "pico", nivel = 1 })

------------------------------------------------------------------
-- Objetos
------------------------------------------------------------------
objeto(100, "palo", "Palo", { icono = "🥢" })
objeto(101, "carbon", "Carbón", { icono = "⚫" })
objeto(102, "lingoteHierro", "Lingote de hierro", { icono = "🔩" })
objeto(103, "lingoteOro", "Lingote de oro", { icono = "🟨" })
objeto(104, "manzana", "Manzana", { icono = "🍎", comida = 4 })
objeto(105, "carneCruda", "Carne cruda", { icono = "🥩", comida = 3 })
objeto(106, "diamante", "Diamante", { icono = "💎" })
objeto(107, "carneCocida", "Filete", { icono = "🍖", comida = 8 })
objeto(108, "pan", "Pan", { icono = "🍞", comida = 5 })
objeto(109, "trigo", "Trigo", { icono = "🌾" })

-- Herramientas: 4 materiales × 4 tipos
Bloques.NIVELES = {
	{ clave = "madera", nombre = "de madera", nivel = 1, vel = 2, usos = 60, color = rgb(178, 140, 84), mat = 6 },
	{ clave = "piedra", nombre = "de piedra", nivel = 2, vel = 4, usos = 132, color = rgb(128, 128, 128), mat = 4 },
	{ clave = "hierro", nombre = "de hierro", nivel = 3, vel = 6, usos = 250, color = rgb(220, 220, 220), mat = 102 },
	{ clave = "diamante", nombre = "de diamante", nivel = 4, vel = 8, usos = 1561, color = rgb(90, 230, 225), mat = 106 },
}
Bloques.TIPOS_HERR = {
	{ clave = "pico", nombre = "Pico", icono = "⛏️", dano = 2 },
	{ clave = "hacha", nombre = "Hacha", icono = "🪓", dano = 3 },
	{ clave = "pala", nombre = "Pala", icono = "🥄", dano = 1.5 },
	{ clave = "espada", nombre = "Espada", icono = "🗡️", dano = 4 },
}
do
	local id = 110
	for _, t in Bloques.TIPOS_HERR do
		for _, n in Bloques.NIVELES do
			objeto(id, t.clave .. "_" .. n.clave, t.nombre .. " " .. n.nombre, {
				icono = t.icono,
				fondo = n.color,
				herr = t.clave,
				nivel = n.nivel,
				vel = n.vel,
				usos = n.usos,
				dano = t.dano + n.nivel,
				material = n.mat,
				maxPila = 1,
			})
			id += 1
		end
	end
end

------------------------------------------------------------------
-- Consultas
------------------------------------------------------------------
Bloques.AIRE = 0
Bloques.AGUA = Bloques.porClave.agua

-- ¿Se ve a través de este bloque? (para decidir qué caras dibujar)
local TRANSP = {}
local SOLIDO = {}
for id, d in Bloques.porId do
	if d.esBloque then
		TRANSP[id] = d.transparente == true or d.forma ~= "cubo" or d.ancho ~= nil
		SOLIDO[id] = d.solido
	end
end
TRANSP[0] = true
SOLIDO[0] = false
Bloques.TRANSP = TRANSP
Bloques.SOLIDO = SOLIDO

function Bloques.nombre(id)
	local d = Bloques.porId[id]
	return d and d.nombre or "?"
end

function Bloques.maxPila(id)
	local d = Bloques.porId[id]
	return (d and d.maxPila) or 64
end

-- Segundos para romper el bloque `b` con el objeto `herrId` en la mano
function Bloques.tiempoRomper(b, herrId)
	local d = Bloques.porId[b]
	if not d or d.dureza < 0 then
		return math.huge
	end
	if d.dureza == 0 then
		return 0.05
	end
	local h = herrId and Bloques.porId[herrId]
	local vel = 1
	if h and h.herr and h.herr == d.herr then
		vel = h.vel
	end
	local puede = Bloques.puedeRecoger(b, herrId)
	return d.dureza * (puede and 1.5 or 5) / vel
end

-- ¿Suelta algo al romperlo con esta herramienta? (la piedra y las menas necesitan pico)
function Bloques.puedeRecoger(b, herrId)
	local d = Bloques.porId[b]
	if not d or not d.nivel then
		return true
	end
	local h = herrId and Bloques.porId[herrId]
	return h ~= nil and h.herr == "pico" and h.nivel >= d.nivel
end

return Bloques
