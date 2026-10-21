--[[
	Blockverse para Roblox · Lo que se puede comprar con Robux

	CÓMO PONERLO EN MARCHA (lo hace el dueño del juego, una sola vez):
	1. Publica el juego (Archivo > Publicar en Roblox).
	2. En create.roblox.com > tu experiencia > Monetización:
	   · «Pases» (Passes): crea un pase por cada uno de PASES y copia su número (ID).
	   · «Productos de desarrollador» (Developer Products): crea uno por cada uno de PRODUCTOS y copia su ID.
	   Pon el precio que quieras: la tienda enseña el precio real que pongas allí.
	3. Pega cada ID en el campo `id` de abajo (donde pone 0).

	Mientras un `id` sea 0, ese producto no sale a los jugadores. En Roblox Studio sí sale,
	marcado como «SIN CONFIGURAR», y al pulsarlo se da gratis para que puedas probarlo.

	`precio` solo se usa si Roblox no contesta con el precio real.
]]
local P = {}

-- Pases: se compran una vez y duran para siempre
P.PASES = {
	{
		clave = "vip", id = 0, precio = 299, nombre = "VIP", icono = "bloqueOro", color = "#ffc83a", etiqueta = "★ EL MEJOR",
		desc = "Lo mejor de Blockverse para siempre.",
		ventajas = {
			"+50 % de monedas en Bed Wars",
			"Recompensa diaria doble",
			"Etiqueta [VIP] dorada en el chat y en tu tarjeta",
			"Estrella ★ junto a tu nombre en Bed Wars",
		},
	},
	{
		clave = "monedasX2", id = 0, precio = 199, nombre = "Monedas x2", icono = "pepitaOro", color = "#ffe066", etiqueta = "POPULAR",
		desc = "Gana el doble de monedas en Bed Wars, para siempre.",
		ventajas = {
			"x2 monedas al terminar cada partida de Bed Wars",
			"Se suma al VIP (x2,5 en total)",
			"Desbloquea kits mucho antes",
		},
	},
	{
		clave = "efectos", id = 0, precio = 149, nombre = "Todos los efectos", icono = "cohete", color = "#ff7ad9",
		desc = "Los 5 efectos de baja final desbloqueados.",
		ventajas = {
			"Fuegos artificiales, Corazones, Rayo, Alma en pena y Confeti",
			"Más los que salgan en el futuro",
			"Ahorras 1 500 monedas",
		},
	},
}

-- Productos: se pueden comprar las veces que se quiera
-- modo: dónde se pueden usar (nil = en cualquier sitio); monedas: lo que dan (o lo que se devuelve si ya no se puede usar)
P.PRODUCTOS = {
	-- Monedas de Bed Wars (sirven para kits y efectos)
	{ clave = "monedas500", id = 0, precio = 49, nombre = "500 monedas", icono = "pepitaOro", monedas = 500, grupo = "monedas",
		desc = "Un empujón para tu próximo kit." },
	{ clave = "monedas1200", id = 0, precio = 99, nombre = "1 200 monedas", icono = "lingoteOro", monedas = 1200, grupo = "monedas",
		extra = "+20 % EXTRA", etiqueta = "POPULAR", desc = "1 000 monedas + 200 de regalo." },
	{ clave = "monedas3000", id = 0, precio = 199, nombre = "3 000 monedas", icono = "bloqueOro", monedas = 3000, grupo = "monedas",
		extra = "+50 % EXTRA", desc = "2 000 monedas + 1 000 de regalo." },
	{ clave = "monedas7500", id = 0, precio = 399, nombre = "7 500 monedas", icono = "bloqueDiamante", monedas = 7500, grupo = "monedas",
		extra = "+88 % EXTRA", etiqueta = "MEJOR VALOR", desc = "Para desbloquear los kits legendarios." },
	-- De cada modo
	{ clave = "vidaMZ", id = 0, precio = 25, nombre = "Vida extra", icono = "totem", modo = "mazmorras", monedas = 150, grupo = "modos",
		desc = "Una vida más en la mazmorra en la que estás.", donde = "Dentro de una mazmorra" },
	{ clave = "recursosLY", id = 0, precio = 35, nombre = "Saco de recursos", icono = "cofre", modo = "leyendas", monedas = 200, grupo = "modos",
		desc = "+40 de madera, +40 de piedra y +10 de oro para tu aldea.", donde = "Dentro de Leyendas" },
	{ clave = "kitAventurero", id = 0, precio = 49, nombre = "Kit de aventurero", icono = "pico_hierro", modo = "supervivencia", monedas = 250, grupo = "modos",
		desc = "Pico, espada y hacha de hierro, 16 panes, 32 antorchas y una cama.", donde = "En Supervivencia o One Block" },
}

P.POR_CLAVE = {}
for _, x in P.PASES do
	x.tipo = "pase"
	P.POR_CLAVE[x.clave] = x
end
for _, x in P.PRODUCTOS do
	x.tipo = "producto"
	P.POR_CLAVE[x.clave] = x
end

return P
