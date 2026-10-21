--[[
	Blockverse para Roblox · Gráficos y personalización (datos compartidos)
	· SHADERS: estilos de imagen (bloom, rayos de sol, color, desenfoque y viñeta).
	· CALIDADES: cuántos efectos se usan (para que vaya bien en móviles).
	· MIRAS y COLORES_MIRA: la mira del centro de la pantalla.
	· CAPAS, SOMBREROS y MASCOTAS: cosméticos que ven todos. Se desbloquean subiendo el
	  Camino de Blockverse (nivel) o con el pase VIP.
	El servidor usa estas listas para comprobar lo que llega del cliente.
]]
local D = {}

-- fuerza: bloom (intensidad, tamaño, umbral), rayos (intensidad, apertura), color (brillo, contraste,
-- saturación, tinte), desenfoque lejano (0 = no), viñeta (0..1), dia = tonos de amanecer y noche
D.SHADERS = {
	{ id = "ninguno", n = "Sin shaders", d = "La imagen tal cual, lo más ligero",
		bloom = { 0, 0, 3 }, rayos = { 0, 0 }, color = { 0, 0, 0, "#ffffff" }, dof = 0, vineta = 0, dia = 0 },
	{ id = "clasico", n = "Clásico", d = "El de siempre: un poco de brillo y color",
		bloom = { 0.35, 22, 1.8 }, rayos = { 0.05, 0.7 }, color = { 0, 0.05, 0.15, "#ffffff" }, dof = 0, vineta = 0.15, dia = 0.6 },
	{ id = "vivido", n = "Vívido", d = "Colores intensos y luz brillante",
		bloom = { 0.5, 24, 1.4 }, rayos = { 0.1, 0.75 }, color = { 0.02, 0.12, 0.38, "#ffffff" }, dof = 0, vineta = 0.2, dia = 0.8 },
	{ id = "cinematico", n = "Cinemático", d = "Rayos de sol, desenfoque lejano y tonos cálidos",
		bloom = { 0.6, 30, 1.2 }, rayos = { 0.18, 0.85 }, color = { 0, 0.18, 0.08, "#fff4e4" }, dof = 0.3, vineta = 0.5, dia = 1 },
	{ id = "fantasia", n = "Fantasía", d = "Brillo mágico y colores pastel",
		bloom = { 0.9, 40, 1.0 }, rayos = { 0.22, 0.9 }, color = { 0.03, 0.04, 0.42, "#f6ecff" }, dof = 0.15, vineta = 0.3, dia = 1 },
	{ id = "invierno", n = "Invierno", d = "Luz fría y limpia",
		bloom = { 0.45, 26, 1.5 }, rayos = { 0.08, 0.7 }, color = { 0.02, 0.1, 0.0, "#e4f0ff" }, dof = 0.1, vineta = 0.25, dia = 0.5 },
	{ id = "retro", n = "Retro", d = "Como una foto antigua",
		bloom = { 0.2, 18, 2 }, rayos = { 0.03, 0.6 }, color = { 0.01, 0.2, -0.35, "#ffe8c4" }, dof = 0, vineta = 0.7, dia = 0.3 },
	{ id = "noir", n = "Blanco y negro", d = "Cine negro, mucho contraste",
		bloom = { 0.4, 24, 1.6 }, rayos = { 0.1, 0.8 }, color = { 0, 0.35, -1, "#ffffff" }, dof = 0.1, vineta = 0.8, dia = 0 },
}

D.CALIDADES = {
	{ id = "baja", n = "Baja", d = "Para móviles: sin efectos ni partículas", efectos = 0, particulas = 0, sombras = false },
	{ id = "media", n = "Media", d = "Brillo y color, pocas partículas", efectos = 0.6, particulas = 0.5, sombras = true },
	{ id = "alta", n = "Alta", d = "Todos los efectos", efectos = 1, particulas = 1, sombras = true },
	{ id = "ultra", n = "Ultra", d = "Todo y más partículas", efectos = 1, particulas = 1.6, sombras = true },
}

D.MIRAS = {
	{ id = "cruz", n = "Cruz" },
	{ id = "hueco", n = "Cruz con hueco" },
	{ id = "punto", n = "Punto" },
	{ id = "circulo", n = "Círculo" },
	{ id = "grande", n = "Cruz grande" },
}
D.COLORES_MIRA = {
	{ id = "blanco", n = "Blanco", c = "#ffffff" },
	{ id = "verde", n = "Verde", c = "#60ff70" },
	{ id = "rojo", n = "Rojo", c = "#ff5050" },
	{ id = "cian", n = "Cian", c = "#50f0ff" },
	{ id = "amarillo", n = "Amarillo", c = "#ffe040" },
	{ id = "rosa", n = "Rosa", c = "#ff70d0" },
}

------------------------------------------------------------------
-- Cosméticos (todo hecho con cajas, como los modelos del juego)
-- Medidas de las capas en fracciones: x de 0 a 1 (izquierda a derecha), y de 0 a 1 (arriba a abajo)
------------------------------------------------------------------
D.CAPAS = {
	{ id = "roja", n = "Capa roja", nivel = 1, base = "#b02424",
		deco = { { 0, 0.9, 1, 1, "#ffd040" } } },
	{ id = "explorador", n = "Explorador", nivel = 2, base = "#2856b0",
		deco = { { 0, 0.3, 1, 0.38, "#f0f0f0" }, { 0, 0.62, 1, 0.7, "#f0f0f0" } } },
	{ id = "creeper", n = "Creeper", nivel = 6, base = "#4caf50",
		deco = { { 0.125, 0.15, 0.375, 0.3, "#102010" }, { 0.625, 0.15, 0.875, 0.3, "#102010" }, { 0.375, 0.3, 0.625, 0.5, "#102010" },
			{ 0.25, 0.38, 0.375, 0.6, "#102010" }, { 0.625, 0.38, 0.75, 0.6, "#102010" } } },
	{ id = "tablero", n = "Tablero", nivel = 10, base = "#f2f2f2", tablero = { 4, 6, "#202020" } },
	{ id = "fuego", n = "Fuego", nivel = 14, base = "#d02010",
		deco = { { 0, 0.55, 1, 0.75, "#ff7a10" }, { 0, 0.75, 1, 1, "#ffd030", true } } },
	{ id = "ender", n = "Ender", nivel = 20, base = "#141018",
		deco = { { 0.15, 0.25, 0.4, 0.33, "#e070ff", true }, { 0.6, 0.25, 0.85, 0.33, "#e070ff", true } } },
	{ id = "diamante", n = "Diamante", nivel = 26, base = "#1a8f9a",
		deco = { { 0.4, 0.2, 0.6, 0.28, "#bff8ff" }, { 0.3, 0.28, 0.7, 0.4, "#7ff0ff" }, { 0.2, 0.4, 0.8, 0.52, "#4fe0f0" },
			{ 0.3, 0.52, 0.7, 0.64, "#30c8d8" }, { 0.4, 0.64, 0.6, 0.74, "#20a8b8" } } },
	{ id = "arcoiris", n = "Arcoíris", nivel = 32, base = "#ff4040", arcoiris = true },
	{ id = "galaxia", n = "Galaxia", nivel = 40, base = "#120c40", estrellas = true,
		deco = { { 0, 0.6, 1, 1, "#3a1470" } } },
	{ id = "dragon", n = "Dragón", nivel = 50, base = "#0c0c10",
		deco = { { 0, 0, 0.06, 1, "#b040ff", true }, { 0.94, 0, 1, 1, "#b040ff", true }, { 0, 0.94, 1, 1, "#b040ff", true },
			{ 0.3, 0.3, 0.45, 0.36, "#d070ff", true }, { 0.55, 0.3, 0.7, 0.36, "#d070ff", true } } },
	{ id = "vip", n = "Capa VIP", vip = true, base = "#e0a010",
		deco = { { 0, 0, 1, 0.06, "#fff3a0", true }, { 0, 0.94, 1, 1, "#fff3a0", true }, { 0.4, 0.4, 0.6, 0.56, "#fff8d0", true } } },
}

-- Sombreros: cajas { tamaño (x, y, z), posición (x, y, z), color, neón? } en «cabezas» (1 = lo que mide la cabeza);
-- y = 0 es la parte de arriba de la cabeza
D.SOMBREROS = {
	{ id = "gorra", n = "Gorra roja", nivel = 1, cajas = {
		{ { 1.06, 0.32, 1.06 }, { 0, 0.02, 0 }, "#c62828" }, { { 1.06, 0.06, 0.5 }, { 0, -0.1, -0.7 }, "#a01818" },
		{ { 0.2, 0.08, 0.2 }, { 0, 0.21, 0 }, "#ffffff" } } },
	{ id = "calabaza", n = "Cabeza de calabaza", nivel = 3, cajas = {
		{ { 1.12, 1.12, 1.12 }, { 0, -0.5, 0 }, "#e07a10" }, { { 0.14, 0.18, 0.1 }, { 0, 0.12, 0 }, "#4a7a20" },
		{ { 0.22, 0.2, 0.04 }, { -0.22, -0.32, -0.57 }, "#ffd040", true }, { { 0.22, 0.2, 0.04 }, { 0.22, -0.32, -0.57 }, "#ffd040", true },
		{ { 0.6, 0.14, 0.04 }, { 0, -0.66, -0.57 }, "#ffd040", true } } },
	{ id = "hierba", n = "Bloque de hierba", nivel = 4, cajas = {
		{ { 0.7, 0.5, 0.7 }, { 0, 0.25, 0 }, "#8a5a32" }, { { 0.72, 0.2, 0.72 }, { 0, 0.42, 0 }, "#5cb040" } } },
	{ id = "corona", n = "Corona de oro", nivel = 12, cajas = {
		{ { 1.06, 0.22, 0.1 }, { 0, 0.1, -0.5 }, "#ffc828" }, { { 1.06, 0.22, 0.1 }, { 0, 0.1, 0.5 }, "#ffc828" },
		{ { 0.1, 0.22, 1.06 }, { -0.5, 0.1, 0 }, "#ffc828" }, { { 0.1, 0.22, 1.06 }, { 0.5, 0.1, 0 }, "#ffc828" },
		{ { 0.16, 0.2, 0.1 }, { -0.42, 0.3, -0.5 }, "#ffd84a" }, { { 0.16, 0.26, 0.1 }, { 0, 0.33, -0.5 }, "#ffd84a" },
		{ { 0.16, 0.2, 0.1 }, { 0.42, 0.3, -0.5 }, "#ffd84a" }, { { 0.16, 0.2, 0.1 }, { -0.42, 0.3, 0.5 }, "#ffd84a" },
		{ { 0.16, 0.2, 0.1 }, { 0.42, 0.3, 0.5 }, "#ffd84a" }, { { 0.14, 0.1, 0.04 }, { 0, 0.1, -0.56 }, "#ff2040", true } } },
	{ id = "mago", n = "Sombrero de mago", nivel = 18, cajas = {
		{ { 1.5, 0.08, 1.5 }, { 0, 0.02, 0 }, "#40208a" }, { { 0.9, 0.3, 0.9 }, { 0, 0.2, 0 }, "#5028a8" },
		{ { 0.66, 0.3, 0.66 }, { 0.04, 0.5, 0.02 }, "#5028a8" }, { { 0.42, 0.28, 0.42 }, { 0.1, 0.78, 0.05 }, "#5028a8" },
		{ { 0.2, 0.24, 0.2 }, { 0.18, 1.02, 0.08 }, "#5028a8" }, { { 0.12, 0.12, 0.04 }, { -0.2, 0.25, -0.46 }, "#fff060", true },
		{ { 0.08, 0.08, 0.04 }, { 0.15, 0.55, -0.34 }, "#fff060", true } } },
	{ id = "vikingo", n = "Casco vikingo", nivel = 24, cajas = {
		{ { 1.1, 0.4, 1.1 }, { 0, 0.05, 0 }, "#9aa0a8" }, { { 1.14, 0.08, 1.14 }, { 0, -0.12, 0 }, "#7a6040" },
		{ { 0.36, 0.16, 0.16 }, { -0.7, 0.12, 0 }, "#f0e8d0" }, { { 0.16, 0.36, 0.16 }, { -0.86, 0.36, 0 }, "#f0e8d0" },
		{ { 0.36, 0.16, 0.16 }, { 0.7, 0.12, 0 }, "#f0e8d0" }, { { 0.16, 0.36, 0.16 }, { 0.86, 0.36, 0 }, "#f0e8d0" } } },
	{ id = "diamante", n = "Casco de diamante", nivel = 30, cajas = {
		{ { 1.12, 0.36, 1.12 }, { 0, 0.04, 0 }, "#4fe0f0" }, { { 0.12, 0.6, 1.12 }, { -0.56, -0.3, 0 }, "#30c8d8" },
		{ { 0.12, 0.6, 1.12 }, { 0.56, -0.3, 0 }, "#30c8d8" }, { { 1.12, 0.6, 0.12 }, { 0, -0.3, 0.56 }, "#30c8d8" },
		{ { 0.3, 0.06, 0.04 }, { 0, 0.12, -0.57 }, "#c0ffff", true } } },
	{ id = "aureola", n = "Aureola", nivel = 36, gira = true, cajas = {
		{ { 0.9, 0.06, 0.1 }, { 0, 0.45, -0.4 }, "#fff080", true }, { { 0.9, 0.06, 0.1 }, { 0, 0.45, 0.4 }, "#fff080", true },
		{ { 0.1, 0.06, 0.9 }, { -0.4, 0.45, 0 }, "#fff080", true }, { { 0.1, 0.06, 0.9 }, { 0.4, 0.45, 0 }, "#fff080", true } } },
	{ id = "tnt", n = "TNT", nivel = 42, cajas = {
		{ { 0.8, 0.8, 0.8 }, { 0, 0.4, 0 }, "#d02828" }, { { 0.82, 0.26, 0.82 }, { 0, 0.4, 0 }, "#f0f0f0" },
		{ { 0.06, 0.2, 0.06 }, { 0, 0.9, 0 }, "#303030" }, { { 0.06, 0.06, 0.06 }, { 0, 1.02, 0 }, "#ffb020", true } } },
	{ id = "ender", n = "Corona del End", nivel = 48, cajas = {
		{ { 1.06, 0.18, 1.06 }, { 0, 0.08, 0 }, "#1c1424" }, { { 0.14, 0.34, 0.14 }, { -0.42, 0.32, -0.42 }, "#2a1c38" },
		{ { 0.14, 0.34, 0.14 }, { 0.42, 0.32, -0.42 }, "#2a1c38" }, { { 0.14, 0.34, 0.14 }, { -0.42, 0.32, 0.42 }, "#2a1c38" },
		{ { 0.14, 0.34, 0.14 }, { 0.42, 0.32, 0.42 }, "#2a1c38" }, { { 0.18, 0.18, 0.18 }, { 0, 0.4, -0.45 }, "#e070ff", true } } },
	{ id = "copa", n = "Sombrero de copa VIP", vip = true, cajas = {
		{ { 1.4, 0.08, 1.4 }, { 0, 0.02, 0 }, "#141414" }, { { 0.9, 0.8, 0.9 }, { 0, 0.44, 0 }, "#1c1c1c" },
		{ { 0.92, 0.14, 0.92 }, { 0, 0.14, 0 }, "#ffc828", true } } },
}

-- Mascotas: cajas en studs alrededor de su centro, partes que aletean (ala = 1 o -1) o giran
D.MASCOTAS = {
	{ id = "slime", n = "Slime", nivel = 3, salta = true, cajas = {
		{ { 1, 1, 1 }, { 0, 0, 0 }, "#70d060", trans = 0.35 }, { { 0.6, 0.6, 0.6 }, { 0, -0.05, 0 }, "#3a9a30" },
		{ { 0.16, 0.16, 0.04 }, { -0.22, 0.12, -0.51 }, "#102010" }, { { 0.16, 0.16, 0.04 }, { 0.22, 0.12, -0.51 }, "#102010" } } },
	{ id = "pollito", n = "Pollito", nivel = 7, cajas = {
		{ { 0.7, 0.6, 0.8 }, { 0, 0, 0 }, "#ffe050" }, { { 0.5, 0.5, 0.5 }, { 0, 0.45, -0.3 }, "#fff070" },
		{ { 0.2, 0.12, 0.2 }, { 0, 0.4, -0.62 }, "#ff9020" }, { { 0.08, 0.08, 0.04 }, { -0.14, 0.55, -0.56 }, "#101010" },
		{ { 0.08, 0.08, 0.04 }, { 0.14, 0.55, -0.56 }, "#101010" }, { { 0.1, 0.4, 0.5 }, { -0.38, 0.02, 0 }, "#f0d040", ala = 1 },
		{ { 0.1, 0.4, 0.5 }, { 0.38, 0.02, 0 }, "#f0d040", ala = -1 } } },
	{ id = "creeper", n = "Mini creeper", nivel = 11, cajas = {
		{ { 0.5, 0.75, 0.3 }, { 0, -0.1, 0 }, "#4caf50" }, { { 0.6, 0.6, 0.6 }, { 0, 0.55, 0 }, "#5cc060" },
		{ { 0.14, 0.14, 0.04 }, { -0.14, 0.62, -0.31 }, "#102010" }, { { 0.14, 0.14, 0.04 }, { 0.14, 0.62, -0.31 }, "#102010" },
		{ { 0.12, 0.2, 0.04 }, { 0, 0.46, -0.31 }, "#102010" }, { { 0.5, 0.2, 0.5 }, { 0, -0.55, 0 }, "#3a9a40" } } },
	{ id = "abeja", n = "Abeja", nivel = 16, cajas = {
		{ { 0.6, 0.55, 0.85 }, { 0, 0, 0 }, "#ffd030" }, { { 0.62, 0.57, 0.14 }, { 0, 0, 0.05 }, "#302010" },
		{ { 0.62, 0.57, 0.14 }, { 0, 0, 0.32 }, "#302010" }, { { 0.12, 0.12, 0.04 }, { -0.15, 0.08, -0.43 }, "#101010" },
		{ { 0.12, 0.12, 0.04 }, { 0.15, 0.08, -0.43 }, "#101010" }, { { 0.5, 0.04, 0.35 }, { -0.4, 0.32, 0 }, "#e8f8ff", ala = 1, trans = 0.4 },
		{ { 0.5, 0.04, 0.35 }, { 0.4, 0.32, 0 }, "#e8f8ff", ala = -1, trans = 0.4 } } },
	{ id = "fantasma", n = "Mini ghast", nivel = 22, cajas = {
		{ { 1, 1, 1 }, { 0, 0, 0 }, "#f4f4f4" }, { { 0.18, 0.1, 0.04 }, { -0.22, 0.12, -0.51 }, "#404040" },
		{ { 0.18, 0.1, 0.04 }, { 0.22, 0.12, -0.51 }, "#404040" }, { { 0.3, 0.1, 0.04 }, { 0, -0.18, -0.51 }, "#404040" },
		{ { 0.1, 0.5, 0.1 }, { -0.3, -0.75, -0.2 }, "#e8e8e8", ala = 1 }, { { 0.1, 0.6, 0.1 }, { 0.1, -0.8, 0.2 }, "#e8e8e8", ala = -1 },
		{ { 0.1, 0.45, 0.1 }, { 0.32, -0.72, -0.25 }, "#e8e8e8", ala = 1 } } },
	{ id = "golem", n = "Mini gólem", nivel = 28, cajas = {
		{ { 0.8, 0.6, 0.5 }, { 0, 0, 0 }, "#c8c0b0" }, { { 0.4, 0.42, 0.38 }, { 0, 0.5, -0.05 }, "#d8d0c0" },
		{ { 0.08, 0.16, 0.08 }, { 0, 0.42, -0.26 }, "#a08070" }, { { 0.06, 0.06, 0.04 }, { -0.1, 0.56, -0.25 }, "#c03030", true },
		{ { 0.06, 0.06, 0.04 }, { 0.1, 0.56, -0.25 }, "#c03030", true }, { { 0.2, 0.7, 0.2 }, { -0.5, -0.2, 0 }, "#b8b0a0", ala = 1 },
		{ { 0.2, 0.7, 0.2 }, { 0.5, -0.2, 0 }, "#b8b0a0", ala = -1 }, { { 0.5, 0.35, 0.3 }, { 0, -0.48, 0 }, "#a8a090" } } },
	{ id = "blaze", n = "Mini blaze", nivel = 34, gira = true, cajas = {
		{ { 0.6, 0.6, 0.6 }, { 0, 0.2, 0 }, "#ffc020" }, { { 0.12, 0.08, 0.04 }, { -0.13, 0.25, -0.31 }, "#402000" },
		{ { 0.12, 0.08, 0.04 }, { 0.13, 0.25, -0.31 }, "#402000" }, { { 0.12, 0.5, 0.12 }, { 0.4, -0.35, 0 }, "#ffd040", true, rota = true },
		{ { 0.12, 0.5, 0.12 }, { -0.4, -0.35, 0 }, "#ffd040", true, rota = true }, { { 0.12, 0.5, 0.12 }, { 0, -0.35, 0.4 }, "#ffd040", true, rota = true },
		{ { 0.12, 0.5, 0.12 }, { 0, -0.35, -0.4 }, "#ffd040", true, rota = true } } },
	{ id = "hada", n = "Hada", nivel = 40, luz = "#80d0ff", cajas = {
		{ { 0.45, 0.6, 0.35 }, { 0, 0, 0 }, "#70c8ff", true }, { { 0.4, 0.4, 0.4 }, { 0, 0.5, 0 }, "#a0e0ff", true },
		{ { 0.08, 0.08, 0.04 }, { -0.1, 0.52, -0.21 }, "#203060" }, { { 0.08, 0.08, 0.04 }, { 0.1, 0.52, -0.21 }, "#203060" },
		{ { 0.5, 0.6, 0.04 }, { -0.4, 0.2, 0.2 }, "#e0f4ff", ala = 1, trans = 0.45 }, { { 0.5, 0.6, 0.04 }, { 0.4, 0.2, 0.2 }, "#e0f4ff", ala = -1, trans = 0.45 } } },
	{ id = "dragon", n = "Mini dragón", nivel = 46, cajas = {
		{ { 0.5, 0.4, 0.9 }, { 0, 0, 0 }, "#1a1a20" }, { { 0.4, 0.36, 0.5 }, { 0, 0.15, -0.65 }, "#202028" },
		{ { 0.1, 0.06, 0.04 }, { -0.12, 0.24, -0.91 }, "#d060ff", true }, { { 0.1, 0.06, 0.04 }, { 0.12, 0.24, -0.91 }, "#d060ff", true },
		{ { 0.16, 0.16, 0.6 }, { 0, 0.05, 0.7 }, "#18181e" }, { { 0.9, 0.04, 0.6 }, { -0.65, 0.15, 0 }, "#2a2a34", ala = 1 },
		{ { 0.9, 0.04, 0.6 }, { 0.65, 0.15, 0 }, "#2a2a34", ala = -1 } } },
	{ id = "estrella", n = "Estrella VIP", vip = true, gira = true, luz = "#ffd84a", cajas = {
		{ { 0.6, 0.6, 0.6 }, { 0, 0, 0 }, "#ffd84a", true }, { { 0.25, 0.25, 0.25 }, { 0, 0.5, 0 }, "#fff3a0", true },
		{ { 0.25, 0.25, 0.25 }, { 0, -0.5, 0 }, "#fff3a0", true }, { { 0.25, 0.25, 0.25 }, { 0.5, 0, 0 }, "#fff3a0", true },
		{ { 0.25, 0.25, 0.25 }, { -0.5, 0, 0 }, "#fff3a0", true }, { { 0.12, 0.12, 0.04 }, { -0.12, 0.08, -0.31 }, "#604000" },
		{ { 0.12, 0.12, 0.04 }, { 0.12, 0.08, -0.31 }, "#604000" } } },
}

local function indice(lista)
	local t = {}
	for i, x in lista do
		t[x.id] = x
		x.orden = i
	end
	return t
end
D.SHADER_ID = indice(D.SHADERS)
D.CALIDAD_ID = indice(D.CALIDADES)
D.MIRA_ID = indice(D.MIRAS)
D.COLOR_MIRA_ID = indice(D.COLORES_MIRA)
D.CAPA_ID = indice(D.CAPAS)
D.SOMBRERO_ID = indice(D.SOMBREROS)
D.MASCOTA_ID = indice(D.MASCOTAS)

D.TIPOS = {
	capa = { lista = D.CAPAS, id = D.CAPA_ID, n = "Capas" },
	sombrero = { lista = D.SOMBREROS, id = D.SOMBRERO_ID, n = "Sombreros" },
	mascota = { lista = D.MASCOTAS, id = D.MASCOTA_ID, n = "Mascotas" },
}

-- ¿Puede ponérselo? (nivel del Camino y si es VIP)
function D.puede(cos, nivel, vip)
	if not cos then
		return false
	end
	if cos.vip then
		return vip == true
	end
	return (nivel or 1) >= (cos.nivel or 1)
end

return D
