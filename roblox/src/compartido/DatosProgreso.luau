--[[
	Blockverse para Roblox · Datos del progreso (los usan el servidor y la interfaz)
	· Camino de Blockverse: 50 niveles con experiencia de TODOS los modos. Cada nivel da
	  algo: monedas, un título o una estela; los múltiplos de 10 dan un premio grande.
	· Misiones: 3 diarias y 3 semanales, elegidas según el día y la semana.
	· Ruleta diaria gratis, con las probabilidades a la vista.
]]
local D = {}

D.NIVEL_MAX = 50
-- Experiencia para pasar del nivel n al n + 1
function D.xpNivel(n)
	return 100 + 25 * (n - 1)
end

-- Títulos (salen encima de la cabeza, en el chat y en la tarjeta del menú)
D.TITULOS = {
	{ id = "novato", n = "Novato", col = "#c8c8c8", nivel = 1 },
	{ id = "aventurero", n = "Aventurero", col = "#7fd17f", nivel = 5 },
	{ id = "minero", n = "Minero", col = "#9ab0c8", nivel = 10 },
	{ id = "cazador", n = "Cazador", col = "#e08a5a", nivel = 15 },
	{ id = "constructor", n = "Constructor", col = "#e0c060", nivel = 20 },
	{ id = "guerrero", n = "Guerrero", col = "#ff6060", nivel = 25 },
	{ id = "heroe", n = "Héroe", col = "#60b0ff", nivel = 30 },
	{ id = "leyenda", n = "Leyenda", col = "#ffaa30", nivel = 35 },
	{ id = "maestro", n = "Maestro", col = "#c080ff", nivel = 40 },
	{ id = "mitico", n = "Mítico", col = "#ff60c0", nivel = 45 },
	{ id = "blockverse", n = "★ Blockverse ★", col = "#ffd84a", nivel = 50 },
}

-- Estelas (una cola de color detrás del personaje al moverse; la ven todos)
D.ESTELAS = {
	{ id = "chispas", n = "Chispas verdes", c1 = "#80ff60", c2 = "#20a020", nivel = 3 },
	{ id = "fuego", n = "Fuego", c1 = "#ffd040", c2 = "#ff3010", nivel = 8 },
	{ id = "hielo", n = "Hielo", c1 = "#e0ffff", c2 = "#40a0ff", nivel = 13 },
	{ id = "arcoiris", n = "Arcoíris", c1 = "#ff4040", c2 = "#4040ff", arcoiris = true, nivel = 18 },
	{ id = "ender", n = "Ender", c1 = "#e080ff", c2 = "#300050", nivel = 23 },
	{ id = "oro", n = "Oro", c1 = "#fff0a0", c2 = "#d09000", nivel = 28 },
	{ id = "diamante", n = "Diamante", c1 = "#c0ffff", c2 = "#20c0c0", nivel = 33 },
	{ id = "galaxia", n = "Galaxia", c1 = "#ff80ff", c2 = "#2020a0", nivel = 38 },
	{ id = "lava", n = "Lava", c1 = "#ffa020", c2 = "#600000", nivel = 43 },
	{ id = "estelar", n = "Estelar", c1 = "#ffffff", c2 = "#ffd84a", nivel = 48 },
}

D.TITULO_ID, D.ESTELA_ID = {}, {}
for _, t in D.TITULOS do
	D.TITULO_ID[t.id] = t
end
for _, e in D.ESTELAS do
	D.ESTELA_ID[e.id] = e
end

-- Recompensa de cada nivel del camino: {tipo = "monedas"|"titulo"|"estela", valor, texto}
D.RECOMPENSAS = {}
for n = 1, D.NIVEL_MAX do
	local r
	for _, t in D.TITULOS do
		if t.nivel == n and n > 1 then
			r = { tipo = "titulo", valor = t.id, texto = "Título: " .. t.n }
		end
	end
	for _, e in D.ESTELAS do
		if e.nivel == n then
			r = { tipo = "estela", valor = e.id, texto = "Estela: " .. e.n }
		end
	end
	if not r then
		local m = n % 10 == 0 and (500 + n * 20) or (40 + n * 8)
		r = { tipo = "monedas", valor = m, texto = m .. " monedas", grande = n % 10 == 0 }
	end
	D.RECOMPENSAS[n] = r
end

-- Misiones: evento que cuenta, cuántas veces, experiencia y texto
D.DIARIAS = {
	{ id = "romper", ev = "romper", meta = 100, xp = 100, t = "Rompe 100 bloques" },
	{ id = "monstruos", ev = "monstruo", meta = 10, xp = 120, t = "Acaba con 10 monstruos" },
	{ id = "partidaBW", ev = "partidaBW", meta = 1, xp = 100, t = "Juega una partida de Bed Wars" },
	{ id = "bajasBW", ev = "bajaBW", meta = 3, xp = 120, t = "Consigue 3 bajas en Bed Wars" },
	{ id = "salasMZ", ev = "salaMZ", meta = 3, xp = 120, t = "Limpia 3 salas de una mazmorra" },
	{ id = "portalLY", ev = "portalLY", meta = 1, xp = 130, t = "Destruye un portal en Leyendas" },
	{ id = "comer", ev = "comer", meta = 5, xp = 80, t = "Come 5 veces" },
	{ id = "colocar", ev = "colocar", meta = 50, xp = 80, t = "Coloca 50 bloques" },
	{ id = "faseOB", ev = "faseOB", meta = 1, xp = 110, t = "Pasa de fase en One Block" },
}
D.SEMANALES = {
	{ id = "ganarBW", ev = "victoriaBW", meta = 3, xp = 450, t = "Gana 3 partidas de Bed Wars" },
	{ id = "jefesMZ", ev = "jefeMZ", meta = 2, xp = 450, t = "Derrota a 2 jefes de mazmorra" },
	{ id = "romperS", ev = "romper", meta = 1000, xp = 400, t = "Rompe 1 000 bloques" },
	{ id = "monstruosS", ev = "monstruo", meta = 60, xp = 400, t = "Acaba con 60 monstruos" },
	{ id = "aldeaLY", ev = "victoriaLY", meta = 1, xp = 500, t = "Salva la aldea en Leyendas" },
	{ id = "camasBW", ev = "camaBW", meta = 3, xp = 450, t = "Rompe 3 camas en Bed Wars" },
}

-- Ruleta diaria (gratis). Las probabilidades se enseñan en la ventana
D.RULETA = {
	{ tipo = "monedas", valor = 50, p = 35, texto = "50 monedas", ico = "pepitaOro" },
	{ tipo = "monedas", valor = 100, p = 25, texto = "100 monedas", ico = "pepitaOro" },
	{ tipo = "xp", valor = 150, p = 20, texto = "150 de experiencia", ico = "esmeralda" },
	{ tipo = "monedas", valor = 250, p = 10, texto = "250 monedas", ico = "lingoteOro" },
	{ tipo = "xp", valor = 300, p = 7, texto = "300 de experiencia", ico = "esmeralda" },
	{ tipo = "monedas", valor = 1000, p = 3, texto = "1 000 monedas", ico = "bloqueDiamante", raro = true },
}

return D
