--!optimize 2
--[[
	Blockverse para Roblox · Arenas de los modos de juego
	Los mapas de Bed Wars (bedwars2.js), las mazmorras (modos53.js) y la
	isla de Leyendas se generan en la zona vacía del mapa (entre One
	Block y el End) como parte del terreno: el servidor y los clientes
	los crean igual a partir de unos pocos números, así que no hace falta
	enviar miles de bloques por la red.
	· Bed Wars: 8 arenas fijas (4 mapas × 8 o 4 equipos), siempre listas.
	· Mazmorras y Leyendas: cada partida tiene su sitio nuevo; el servidor
	  la apunta en ReplicatedStorage.ArenasActivas y los clientes la leen.
]]
local Registro = require(script.Parent.Registro)
local Ruido = require(script.Parent.Ruido)
local Biomas = require(script.Parent.Datos.Biomas)

local CO = Biomas.constantes
local CX, CZ, CY = CO.CX, CO.CZ, CO.CY
local mulberry32, hash2, fbm, redondear = Ruido.mulberry32, Ruido.hash2, Ruido.fbm, Ruido.redondear
local floor, abs, max, min, sqrt, cos, sin, pi = math.floor, math.abs, math.max, math.min, math.sqrt, math.cos, math.sin, math.pi
local RB = Registro.B

local Arenas = {}
Arenas.BW_Y = 140
Arenas.BW_Z = -640 * CZ
Arenas.MZ_Y = 100
Arenas.MZ_Z = -680 * CZ
Arenas.LY_Y = 70
Arenas.LY_Z = -722 * CZ
local BW_Y, MZ_Y, LY_Y = Arenas.BW_Y, Arenas.MZ_Y, Arenas.LY_Y

-- Primer bloque que exista de la lista (como b53 y blq52 del juego web)
local function K(...)
	for i = 1, select("#", ...) do
		local k = select(i, ...)
		if k and RB[k] then
			return RB[k]
		end
	end
	return RB.piedra
end
Arenas.K = K

local function signo(v)
	return v > 0 and 1 or (v < 0 and -1 or 0)
end

------------------------------------------------------------------
-- Mapa de bloques (coordenadas relativas al origen de la arena)
------------------------------------------------------------------
local function clave(x, y, z)
	return ((x + 512) * 1024 + (z + 512)) * 256 + y
end
local function nuevoMapa()
	local d = {}
	local M = { d = d }
	function M.pon(x, y, z, b)
		if y >= 0 and y < CY then
			d[clave(x, y, z)] = b
		end
	end
	function M.quita(x, y, z)
		d[clave(x, y, z)] = nil
	end
	function M.hay(x, y, z)
		return d[clave(x, y, z)]
	end
	return M
end

-- Reparte los bloques por chunks (en coordenadas del mundo)
local function porChunks(M, ox, oz)
	local res = {}
	local cx0, cx1, cz0, cz1 = math.huge, -math.huge, math.huge, -math.huge
	for k, b in M.d do
		local y = k % 256
		local r = k // 256
		local z = r % 1024 - 512 + oz
		local x = r // 1024 - 512 + ox
		local cx, cz = x // CX, z // CZ
		local ck = cx .. "," .. cz
		local l = res[ck]
		if not l then
			l = {}
			res[ck] = l
		end
		local n = #l
		l[n + 1], l[n + 2], l[n + 3], l[n + 4] = x - cx * CX, y, z - cz * CZ, b
		cx0, cx1, cz0, cz1 = min(cx0, cx), max(cx1, cx), min(cz0, cz), max(cz1, cz)
	end
	return res, cx0, cx1, cz0, cz1
end

------------------------------------------------------------------
-- Registro de arenas
------------------------------------------------------------------
-- a = {id, tipo, cx0, cx1, cz0, cz1, construir = fn(a), terreno = fn(a, datos, cx, cz)?, porChunk?}
local lista = {}
Arenas.lista = lista

local function asegurar(a)
	if not a.hecha then
		a.hecha = true
		a.construir(a)
	end
	return a
end
Arenas.asegurar = asegurar

-- Escribe en el chunk los bloques de las arenas que lo tocan
function Arenas.llenar(datos, cx, cz)
	local algo = false
	for _, a in lista do
		if cx >= a.cx0 and cx <= a.cx1 and cz >= a.cz0 and cz <= a.cz1 then
			asegurar(a)
			if a.terreno then
				a.terreno(a, datos, cx, cz)
				algo = true
			end
			local l = a.porChunk and a.porChunk[cx .. "," .. cz]
			if l then
				for i = 1, #l, 4 do
					buffer.writeu16(datos, (l[i] + l[i + 2] * CX + l[i + 1] * CX * CZ) * 2, l[i + 3])
				end
				algo = true
			end
		end
	end
	return algo
end

function Arenas.buscar(id)
	for _, a in lista do
		if a.id == id then
			return a
		end
	end
	return nil
end

local function quitar(id)
	for i, a in lista do
		if a.id == id then
			table.remove(lista, i)
			return
		end
	end
end

------------------------------------------------------------------
-- BED WARS (construirMapaBW de bedwars2.js)
------------------------------------------------------------------
local EQUIPOS_TODOS = {
	{ nombre = "Rojo", letra = "R", lana = "rojo", col = "#ff5555" },
	{ nombre = "Azul", letra = "A", lana = "azul", col = "#5577ff" },
	{ nombre = "Verde", letra = "V", lana = "lima", col = "#55ff55" },
	{ nombre = "Amarillo", letra = "Am", lana = "amarillo", col = "#ffff55" },
	{ nombre = "Aguamarina", letra = "Ag", lana = "cian", col = "#55ffff" },
	{ nombre = "Blanco", letra = "B", lana = "blanco", col = "#ffffff" },
	{ nombre = "Rosa", letra = "Ro", lana = "rosa", col = "#ff77dd" },
	{ nombre = "Gris", letra = "G", lana = "gris", col = "#aaaaaa" },
}
local TEMAS_BW = {
	jardin = { nombre = "Jardín", sup = "cesped", sub = "tierra", roca = "piedra", deco = "arbol", medio = "ladrillosPiedra", luz = "farol", hora = 0.25 },
	invierno = { nombre = "Invierno", sup = "bloqueNieve", sub = "hieloCompacto", roca = "piedra", deco = "abeto", medio = "hieloCompacto", luz = "farol", hora = 0.3 },
	infierno = { nombre = "Infierno", sup = "netherrack", sub = "netherrack", roca = "piedraNegra", deco = "hongo", medio = "ladrilloNether", luz = "piedraLuminosa", hora = 0.47 },
	desierto = { nombre = "Desierto", sup = "arena", sub = "arenisca", roca = "arenisca", deco = "cactus", medio = "areniscaCortada", luz = "farol", hora = 0.22 },
}
Arenas.TEMAS_BW = TEMAS_BW
Arenas.ORDEN_TEMAS_BW = { "jardin", "invierno", "infierno", "desierto" }

function Arenas.equiposBW(n)
	local R = n == 8 and 62 or 48
	local t = {}
	for i = 0, n - 1 do
		local a = i * 2 * pi / n - pi / 2
		local E = table.clone(EQUIPOS_TODOS[i + 1])
		E.id = i
		E.isla = { redondear(cos(a) * R), redondear(sin(a) * R) }
		E.lanaId = RB["lana_" .. E.lana] or RB.lana
		E.terracotaId = RB["terracota_" .. E.lana] or E.lanaId
		E.vidrioId = RB["vidrio_" .. E.lana] or RB.vidrio
		t[i + 1] = E
	end
	return t
end

local function construirBW(a)
	local n, T = a.equipos, TEMAS_BW[a.tema]
	local M = nuevoMapa()
	local function pon(x, y, z, b)
		if b and b ~= 0 then
			M.pon(x, y, z, b)
		end
	end
	local function Kb(k)
		return RB[k] or RB.piedra
	end
	local Y = BW_Y
	local gens, camas, tiendas, cofres = {}, {}, {}, {}
	local equipos = Arenas.equiposBW(n)
	local function decorar(x, z, tipo)
		local y = Y + 1
		if tipo == "arbol" then
			for k = 0, 3 do
				pon(x, y + k, z, RB.tronco)
			end
			for dx = -2, 2 do
				for dz = -2, 2 do
					for dy = 2, 4 do
						if abs(dx) + abs(dz) + (dy == 4 and 2 or 0) <= 3 and not (dx == 0 and dz == 0 and dy < 4) then
							pon(x + dx, y + dy, z + dz, RB.hojas)
						end
					end
				end
			end
			pon(x, y + 5, z, RB.hojas)
		elseif tipo == "abeto" then
			for k = 0, 4 do
				pon(x, y + k, z, RB.troncoAbeto)
			end
			for dy = 1, 5 do
				local r = dy < 3 and 2 or (dy < 5 and 1 or 0)
				for dx = -r, r do
					for dz = -r, r do
						if abs(dx) + abs(dz) <= r and (dx ~= 0 or dz ~= 0) then
							pon(x + dx, y + dy, z + dz, RB.hojasAbeto)
						end
					end
				end
			end
			pon(x, y + 5, z, RB.hojasAbeto)
			pon(x, y + 6, z, RB.capaNieve or RB.hojasAbeto)
		elseif tipo == "hongo" then
			for k = 0, 3 do
				pon(x, y + k, z, RB.talloCarmesi)
			end
			for dx = -2, 2 do
				for dz = -2, 2 do
					if abs(dx) + abs(dz) <= 3 then
						pon(x + dx, y + 4, z + dz, RB.verrugaBloque)
					end
				end
			end
			pon(x, y + 5, z, RB.verrugaBloque)
			pon(x + 1, y + 3, z, RB.luzHongo)
		elseif tipo == "cactus" then
			for k = 0, 2 do
				pon(x, y + k, z, RB.cactus)
			end
			pon(x + 1, y, z + 1, RB.arbustoSeco or RB.cactus)
		end
	end
	local function farola(x, z)
		if T.luz == "piedraLuminosa" then
			pon(x, Y, z, RB.piedraLuminosa)
			return
		end
		pon(x, Y + 1, z, RB.valla)
		pon(x, Y + 2, z, RB.valla)
		pon(x, Y + 3, z, RB.farol or RB.antorcha)
	end
	for _, E in equipos do
		local cx, cz = E.isla[1], E.isla[2]
		local ux, uz = -cx, -cz
		local f = abs(ux) >= abs(uz) and { signo(ux), 0 } or { 0, signo(uz) }
		local sd = { -f[2], f[1] }
		local function W(p, q)
			return cx + p * f[1] + q * sd[1], cz + p * f[2] + q * sd[2]
		end
		local L, TC = E.lanaId, E.terracotaId
		local rnd = mulberry32(E.id * 977 + 4242)
		-- Plataforma con los bordes redondeados y la parte de abajo colgando
		for p = -8, 8 do
			for q = -8, 8 do
				local d = max(abs(p), abs(q))
				if not (d > 8 or abs(p) + abs(q) > 13) then
					local x, z = W(p, q)
					pon(x, Y, z, Kb(T.sup))
					for k = 1, 7 do
						if d <= 8 - k + (rnd() < 0.45 and 1 or 0) then
							pon(x, Y - k, z, k <= 2 and Kb(T.sub) or Kb(T.roca))
						end
					end
				end
			end
		end
		-- Aparición: losa de lana del equipo con un anillo de terracota
		for p = -2, 2 do
			for q = -2, 2 do
				local x, z = W(p, q)
				pon(x, Y, z, max(abs(p), abs(q)) == 2 and TC or L)
			end
		end
		-- Cama de dos bloques (cabecera mirando al centro) sobre terracota
		for p = 3, 6 do
			for q = -1, 1 do
				local x, z = W(p, q)
				pon(x, Y, z, TC)
			end
		end
		local hx, hz = W(5, 0)
		local px, pz = W(4, 0)
		pon(hx, Y + 1, hz, RB["camaBW_" .. E.lana .. "_cab"] or RB.cama)
		pon(px, Y + 1, pz, RB["camaBW_" .. E.lana .. "_pie"] or RB.cama)
		table.insert(camas, { equipo = E.id, x = hx, y = Y + 1, z = hz, x2 = px, z2 = pz,
			b = RB["camaBW_" .. E.lana .. "_cab"] or RB.cama, b2 = RB["camaBW_" .. E.lana .. "_pie"] or RB.cama })
		-- Generador detrás, vallado
		local gx, gz = W(-5, 0)
		for p = -6, -4 do
			for q = -1, 1 do
				local x, z = W(p, q)
				pon(x, Y, z, RB.bloqueHierro)
			end
		end
		for _, c in { { -7, -2 }, { -7, 2 }, { -3, -2 }, { -3, 2 } } do
			local x, z = W(c[1], c[2])
			pon(x, Y + 1, z, RB.valla)
		end
		for _, q in { -2, -1, 1, 2 } do
			local x, z = W(-7, q)
			pon(x, Y + 1, z, RB.valla)
		end
		table.insert(gens, { tipo = "equipo", equipo = E.id, x = gx + 0.5, y = Y + 1.2, z = gz + 0.5 })
		-- Casetas de las tiendas con techo del color del equipo
		for _, lt in { { 5, "objetos" }, { -5, "mejoras" } } do
			local lado = lt[1]
			for p = -2, 0 do
				for q = lado - 1, lado + 1 do
					local x, z = W(p, q)
					pon(x, Y, z, RB.tablones)
					pon(x, Y + 3, z, TC)
				end
			end
			for _, c in { { -2, lado - 1 }, { -2, lado + 1 }, { 0, lado - 1 }, { 0, lado + 1 } } do
				local x, z = W(c[1], c[2])
				pon(x, Y + 1, z, RB.valla)
				pon(x, Y + 2, z, RB.valla)
			end
			local tx, tz = W(-1, lado)
			table.insert(tiendas, { equipo = E.id, tipo = lt[2], x = tx + 0.5, z = tz + 0.5 })
		end
		-- Cofre del equipo, farolas y decoración
		do
			local x, z = W(-3, 3)
			pon(x, Y + 1, z, RB.cofre)
			table.insert(cofres, { x, Y + 1, z })
		end
		for _, c in { { 2, 4 }, { 2, -4 } } do
			local x, z = W(c[1], c[2])
			farola(x, z)
		end
		for _, c in { { -6, 6 }, { -6, -6 }, { 6, -6 } } do
			local x, z = W(c[1], c[2])
			decorar(x, z, T.deco)
		end
		for _ = 0, 9 do
			local p, q = floor(rnd() * 13) - 6, floor(rnd() * 13) - 6
			if not ((abs(p) <= 2 and abs(q) <= 2) or (abs(q) >= 4 and p <= 0 and p >= -2)) then
				local x, z = W(p, q)
				if not M.hay(x, Y + 1, z) and M.hay(x, Y, z) == Kb(T.sup) then
					local b
					if T.deco == "arbol" then
						b = rnd() < 0.5 and RB.florAmarilla or RB.hierbaAlta
					elseif T.deco == "abeto" then
						b = RB.capaNieve
					elseif T.deco == "hongo" then
						b = RB.raicesCarmesi
					else
						b = RB.arbustoSeco
					end
					pon(x, Y + 1, z, b)
				end
			end
		end
	end
	-- Islas de diamante
	for k = 0, 3 do
		local ang = (k * 90 + (n == 8 and 22.5 or 45)) * pi / 180
		local R = n == 8 and 38 or 30
		local cx, cz = redondear(cos(ang) * R), redondear(sin(ang) * R)
		local rnd = mulberry32(k * 31 + 777)
		for dx = -4, 4 do
			for dz = -4, 4 do
				local d = sqrt(dx * dx + dz * dz)
				if d <= 4.3 then
					pon(cx + dx, Y, cz + dz, Kb(T.sup))
					for q = 1, 4 do
						if d <= 4.3 - q + rnd() then
							pon(cx + dx, Y - q, cz + dz, Kb(T.roca))
						end
					end
				end
			end
		end
		for dx = -1, 1 do
			for dz = -1, 1 do
				pon(cx + dx, Y, cz + dz, RB.bloqueDiamante)
			end
		end
		pon(cx + 3, Y + 1, cz, Kb(T.roca))
		pon(cx + 3, Y + 2, cz, Kb(T.roca))
		pon(cx - 3, Y + 1, cz + 1, Kb(T.roca))
		table.insert(gens, { tipo = "diamante", x = cx + 0.5, y = Y + 1.2, z = cz + 0.5 })
	end
	-- Centro: dos alturas, generadores de esmeralda y un faro
	for dx = -12, 12 do
		for dz = -12, 12 do
			local d = sqrt(dx * dx + dz * dz)
			if d <= 12.3 then
				pon(dx, Y, dz, d < 6 and Kb(T.medio) or Kb(T.sup))
				for q = 1, 6 do
					if d <= 12.3 - q * 1.6 then
						pon(dx, Y - q, dz, Kb(T.roca))
					end
				end
				if d < 5.3 then
					for q = 1, 3 do
						pon(dx, Y + q, dz, q == 3 and Kb(T.medio) or Kb(T.roca))
					end
				end
			end
		end
	end
	pon(0, Y + 4, 0, RB.farolMarino or RB.piedraLuminosa)
	for q = 5, 7 do
		pon(0, Y + q, 0, RB.vidrio)
	end
	local esm = n == 8 and { { 8, 0 }, { -8, 0 }, { 0, 8 }, { 0, -8 } } or { { 8, 0 }, { -8, 0 } }
	for _, e in esm do
		for p = -1, 1 do
			for q = -1, 1 do
				pon(e[1] + p, Y, e[2] + q, RB.bloqueEsmeralda)
			end
		end
		table.insert(gens, { tipo = "esmeralda", x = e[1] + 0.5, y = Y + 1.2, z = e[2] + 0.5 })
	end
	-- Sala de espera de cristal muy por encima del centro
	local SY = Y + 46
	for dx = -6, 6 do
		for dz = -6, 6 do
			local borde = abs(dx) == 6 or abs(dz) == 6
			pon(dx, SY, dz, borde and RB.vidrio or ((dx + dz) % 2 == 1 and (RB.piedraLisa or RB.piedra) or RB.ladrillosPiedra))
			pon(dx, SY + 5, dz, RB.vidrio)
			if borde then
				for q = 1, 4 do
					pon(dx, SY + q, dz, RB.vidrio)
				end
			end
		end
	end
	for _, c in { { -5, -5 }, { 5, -5 }, { -5, 5 }, { 5, 5 } } do
		pon(c[1], SY + 1, c[2], RB.farol or RB.antorcha)
	end
	-- Todo pasa a coordenadas del mundo
	local ox, oz = a.ox, a.oz
	a.mapa = M
	a.porChunk = porChunks(M, ox, oz)
	for _, g in gens do
		g.x += ox
		g.z += oz
	end
	for _, c in camas do
		c.x += ox
		c.z += oz
		c.x2 += ox
		c.z2 += oz
	end
	for _, t in tiendas do
		t.x += ox
		t.z += oz
	end
	for _, c in cofres do
		c[1] += ox
		c[3] += oz
	end
	for _, E in equipos do
		E.isla = { E.isla[1] + ox, E.isla[2] + oz }
	end
	a.gens, a.camas, a.tiendas, a.cofres, a.equiposInfo = gens, camas, tiendas, cofres, equipos
	a.sala = { x = ox + 0.5, y = SY + 1.01, z = oz + 0.5 }
	a.centro = { x = ox, z = oz }
end

-- Bloque que había en el mapa original de la arena (para rehacerla)
function Arenas.bloqueOriginal(a, x, y, z)
	asegurar(a)
	return a.mapa and a.mapa.hay(x - a.ox, y, z - a.oz) or 0
end

local arenasBW = {}
for i, n in { 8, 4 } do
	for j, tema in Arenas.ORDEN_TEMAS_BW do
		local k = (i - 1) * 4 + (j - 1)
		local ox, oz = -1200 - k * 320, Arenas.BW_Z
		local a = { id = "bw_" .. n .. "_" .. tema, tipo = "bw", equipos = n, tema = tema, ox = ox, oz = oz,
			cx0 = (ox - 90) // CX, cx1 = (ox + 90) // CX, cz0 = (oz - 90) // CZ, cz1 = (oz + 90) // CZ, construir = construirBW }
		arenasBW[n .. "_" .. tema] = a
		table.insert(lista, a)
	end
end

function Arenas.bw(n, tema)
	return asegurar(arenasBW[n .. "_" .. tema])
end

------------------------------------------------------------------
-- MAZMORRAS (generarMazmorra52 de modos53.js)
------------------------------------------------------------------
local TEMAS_MZ = {
	{ n = "Catacumbas", suelo = { "ladrillosPiedra", "ladrillosPiedra", "ladrillosMusgo", "ladrillosAgrietados", "rocaMusgo" },
		pared = { "ladrillosPiedra", "ladrillosPiedra", "ladrillosMusgo", "ladrillosAgrietados", "rocaMusgo" },
		borde = "roca", centro = "pizarraPulida", pilar = "ladrillosPiedra", luz = "farol", deco = { "estanteria", "barril", "telarana", "alfombraMusgo" },
		tipos = { "zombi", "zombi", "esqueleto", "arana", "slime" }, elite = { "vindicador" }, jefe = "vindicador", jefeN = "Rey Vindicador", col = "#9a9a9a" },
	{ n = "Cripta", suelo = { "baldosasPizarra", "ladrillosPizarra", "pizarraPulida", "baldosasPizarra" },
		pared = { "ladrillosPizarra", "ladrillosPizarra", "pizarraAdoquinada", "baldosasPizarra" },
		borde = "pizarraPulida", centro = "bloqueHueso", pilar = "bloqueHueso", luz = "farolAlmas", deco = { "bloqueHueso", "telarana", "estanteria", "telarana" },
		tipos = { "esqueleto", "esqueletoErrante", "zombi", "aldeanoZombi", "arana" }, elite = { "vindicador", "esqueleto" }, jefe = "evocador", jefeN = "Nigromante", col = "#7fd8ff" },
	{ n = "Fortaleza del Nether", suelo = { "ladrillosNether", "ladrillosNether", "ladrilloNether", "piedraNegra" },
		pared = { "ladrillosNether", "ladrilloNether", "piedraNegra", "ladrillosNether" },
		borde = "piedraNegra", centro = "bloqueMagma", pilar = "basaltoLiso", luz = "luzHongo", deco = { "barril", "piedraNegra", "luzHongo", "telarana" },
		tipos = { "piglin", "esqueletoWither", "cuboMagma", "piglin", "blaze" }, elite = { "piglinBruto" }, jefe = "piglinBruto", jefeN = "Señor de la Forja", col = "#ff7a30" },
}
Arenas.TEMAS_MZ = TEMAS_MZ

local function construirMZ(a)
	local nivel = a.nivel
	local T = TEMAS_MZ[(nivel - 1) % #TEMAS_MZ + 1]
	local r = mulberry32(a.semilla)
	local M = nuevoMapa()
	local pon, quita, hay = M.pon, M.quita, M.hay
	local function elige(t)
		return K(t[floor(r() * #t) + 1])
	end
	-- Camino principal de salas en una rejilla (celdas de 26 bloques) y salas de tesoro a un lado
	local n = 5 + min(nivel, 5)
	local celdas = { { 0, 0 } }
	local usadas = { ["0,0"] = true }
	local DIRS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }
	while #celdas < n do
		local u = celdas[#celdas]
		local op = {}
		for _, d in DIRS do
			if not usadas[(u[1] + d[1]) .. "," .. (u[2] + d[2])] then
				table.insert(op, d)
			end
		end
		if #op == 0 then
			break
		end
		local d = op[floor(r() * #op) + 1]
		table.insert(celdas, { u[1] + d[1], u[2] + d[2] })
		usadas[(u[1] + d[1]) .. "," .. (u[2] + d[2])] = true
	end
	local formas = { "cuadrada", "redonda", "cruz" }
	local camino = {}
	for k0, c in celdas do
		local k = k0 - 1
		local ultima = k == #celdas - 1
		-- (el orden de las llamadas a r() es el del original: primero el radio, luego la forma)
		local rr = ultima and 10 or 5 + floor(r() * 3)
		local forma = k == 0 and "cuadrada" or (ultima and "redonda" or formas[floor(r() * 3) + 1])
		table.insert(camino, { x = c[1] * 26, z = c[2] * 26, i = c[1], j = c[2], r = rr, forma = forma,
			tipo = k == 0 and "inicio" or (ultima and "jefe" or "normal"), activada = k == 0, limpia = k == 0, puertas = {} })
	end
	local enlaces = {}
	for k = 2, #camino do
		table.insert(enlaces, { camino[k - 1], camino[k] })
	end
	local extra = {}
	local k = 2
	while k <= #camino - 1 and #extra < 1 + nivel // 3 do
		if r() >= 0.5 then
			local s = camino[k]
			local op = {}
			for _, d in DIRS do
				if not usadas[(s.i + d[1]) .. "," .. (s.j + d[2])] then
					table.insert(op, d)
				end
			end
			if #op > 0 then
				local d = op[floor(r() * #op) + 1]
				usadas[(s.i + d[1]) .. "," .. (s.j + d[2])] = true
				local t = { x = (s.i + d[1]) * 26, z = (s.j + d[2]) * 26, i = s.i + d[1], j = s.j + d[2], r = 4, forma = "redonda", tipo = "tesoro",
					activada = false, limpia = false, puertas = {} }
				table.insert(extra, t)
				table.insert(enlaces, { s, t })
			end
		end
		k += 1
	end
	local salas = {}
	for i = 1, #camino - 1 do
		table.insert(salas, camino[i])
	end
	for _, s in extra do
		table.insert(salas, s)
	end
	table.insert(salas, camino[#camino])
	local function dentro(s, dx, dz)
		local ax, bz = abs(dx), abs(dz)
		if s.forma == "redonda" then
			return dx * dx + dz * dz <= (s.r + 0.5) * (s.r + 0.5)
		elseif s.forma == "cruz" then
			return max(ax, bz) <= s.r and (min(ax, bz) <= math.ceil(s.r * 0.5) or max(ax, bz) <= math.ceil(s.r * 0.55))
		end
		return ax <= s.r and bz <= s.r
	end
	local function enSala(x, z)
		for _, s in salas do
			if dentro(s, x - s.x, z - s.z) then
				return true
			end
		end
		return false
	end
	local function suelo(x, z, b)
		pon(x, MZ_Y, z, b or elige(T.suelo))
		pon(x, MZ_Y - 1, z, RB.piedra)
		pon(x, MZ_Y - 2, z, K(T.borde))
	end
	for _, s in salas do
		local R = s.r + 1
		-- En Roblox la cámara es libre: todas las paredes son altas (en el web las del lado de la cámara eran bajas)
		local alta = s.tipo == "jefe" and 6 or 5
		for dx = -R, R do
			for dz = -R, R do
				local x, z = s.x + dx, s.z + dz
				if dentro(s, dx, dz) then
					local d = s.forma == "redonda" and sqrt(dx * dx + dz * dz) or max(abs(dx), abs(dz))
					local b = nil
					if d <= 1.2 then
						b = K(T.centro)
					elseif abs(d - redondear(s.r * 0.55)) < 0.5 then
						b = K(T.borde)
					elseif s.tipo == "jefe" and abs(d - 3.2) < 0.5 and (abs(dx) < 1 or abs(dz) < 1 or abs(abs(dx) - abs(dz)) < 1) then
						b = K("piedraLuminosa")
					end
					suelo(x, z, b)
				else
					local pegada = false
					for p = -1, 1 do
						for q = -1, 1 do
							if dentro(s, dx + p, dz + q) then
								pegada = true
							end
						end
					end
					if pegada then
						suelo(x, z)
						local h = alta
						local pilar = (dx + dz) % 4 == 0 and h > 1
						for y = 1, h do
							pon(x, MZ_Y + y, z, pilar and K(T.pilar) or elige(T.pared))
						end
						if h > 1 and not pilar and (dx + dz) % 2 == 1 then
							pon(x, MZ_Y + h + 1, z, elige(T.pared))
						end
						if pilar then
							pon(x, MZ_Y + h + 1, z, K(T.luz))
						end
					end
				end
			end
		end
		-- Pilares interiores con farol
		if s.r >= 7 or s.tipo == "jefe" then
			local p = s.tipo == "jefe" and 6 or 3
			local pts = {}
			if s.tipo == "jefe" then
				for q = 0, 7 do
					table.insert(pts, { redondear(cos(q * pi / 4 + 0.39) * p), redondear(sin(q * pi / 4 + 0.39) * p) })
				end
			else
				pts = { { -p, -p }, { p, p }, { -p, p }, { p, -p } }
			end
			for _, c in pts do
				local h = s.tipo == "jefe" and 4 or 3
				for y = 1, h do
					pon(s.x + c[1], MZ_Y + y, s.z + c[2], K(T.pilar))
				end
				pon(s.x + c[1], MZ_Y + h + 1, s.z + c[2], K(T.luz))
			end
		else
			for _, c in { { -1, -1 }, { 1, 1 }, { -1, 1 }, { 1, -1 } } do
				local X, Z = s.x + c[1] * (s.r - 1), s.z + c[2] * (s.r - 1)
				if dentro(s, X - s.x, Z - s.z) and not (c[1] == 1 and c[2] == 1) then
					pon(X, MZ_Y + 1, Z, K(T.luz))
				end
			end
		end
		-- Decoración junto a las paredes (lejos de las puertas, que están en los ejes)
		for dx = -s.r, s.r do
			for dz = -s.r, s.r do
				if dentro(s, dx, dz) and abs(dx) > 2 and abs(dz) > 2 then
					local junto = false
					for _, d in DIRS do
						if not dentro(s, dx + d[1], dz + d[2]) then
							junto = true
						end
					end
					if junto and not hay(s.x + dx, MZ_Y + 1, s.z + dz) and r() <= 0.3 then
						local kd = T.deco[floor(r() * #T.deco) + 1]
						pon(s.x + dx, MZ_Y + 1, s.z + dz, K(kd))
						if kd == "estanteria" and dx + dz < 0 then
							pon(s.x + dx, MZ_Y + 2, s.z + dz, K(kd))
						end
					end
				end
			end
		end
		-- Cofre sobre un pedestal en una esquina
		if s.tipo ~= "inicio" and (s.tipo ~= "normal" or r() < 0.6) then
			local q = s.forma == "redonda" and max(2, floor(s.r * 0.62)) or (s.forma == "cruz" and max(2, math.ceil(s.r * 0.5)) or s.r - 1)
			local c = ({ { -1, -1 }, { -1, 1 }, { 1, -1 } })[floor(r() * 3) + 1]
			local X, Z = s.x + c[1] * q, s.z + c[2] * q
			pon(X, MZ_Y, Z, K("bloqueOro"))
			for _, d in DIRS do
				if dentro(s, X + d[1] - s.x, Z + d[2] - s.z) then
					quita(X + d[1], MZ_Y + 1, Z + d[2])
				end
			end
			pon(X, MZ_Y + 1, Z, RB.cofre)
			s.cofre = { X, MZ_Y + 1, Z }
		end
		if s.tipo == "inicio" then
			for _, c in { { -2, -2 }, { 2, -2 }, { -2, 2 } } do
				pon(s.x + c[1], MZ_Y + 1, s.z + c[2], K(T.luz))
			end
		end
	end
	-- Pasillos de 3 de ancho; las puertas de cada sala quedan apuntadas para poder cerrarlas
	for _, e in enlaces do
		local A, Bs = e[1], e[2]
		local pasos = abs(Bs.x - A.x) + abs(Bs.z - A.z)
		local sx, sz = signo(Bs.x - A.x), signo(Bs.z - A.z)
		for t = 0, pasos do
			local x, z = A.x + sx * t, A.z + sz * t
			for w = -2, 2 do
				local X, Z = x + (sz ~= 0 and w or 0), z + (sx ~= 0 and w or 0)
				if abs(w) <= 1 then
					if not enSala(X, Z) then
						suelo(X, Z, (t % 4 == 0 and w == 0) and K(T.borde) or nil)
					end
					for y = 1, 7 do
						quita(X, MZ_Y + y, Z)
					end
				elseif not enSala(X, Z) then
					suelo(X, Z)
					for y = 1, 4 do
						pon(X, MZ_Y + y, Z, elige(T.pared))
					end
					if t % 6 == 3 then
						pon(X, MZ_Y + 5, Z, K(T.luz))
					end
				end
			end
		end
		for _, s in { A, Bs } do
			local o = s == A and Bs or A
			local ex, ez = signo(o.x - s.x), signo(o.z - s.z)
			local d = 1
			while d < s.r + 3 and dentro(s, ex * d, ez * d) do
				d += 1
			end
			table.insert(s.puertas, { s.x + ex * d, s.z + ez * d, ez ~= 0 and 1 or 0 })
		end
	end
	local ox, oz = a.ox, a.oz
	a.porChunk = porChunks(M, ox, oz)
	for _, s in salas do
		s.x += ox
		s.z += oz
		if s.cofre then
			s.cofre[1] += ox
			s.cofre[3] += oz
		end
		for _, p in s.puertas do
			p[1] += ox
			p[2] += oz
		end
	end
	a.salas, a.tema = salas, T
end

------------------------------------------------------------------
-- LEYENDAS: isla con la aldea y tres portales piglin (modos53.js)
------------------------------------------------------------------
local RADIO_LY = 124
local function alturaLY(a, rx, rz)
	local d = sqrt(rx * rx + rz * rz)
	if d > RADIO_LY then
		return nil
	end
	local h = (fbm(rx * 0.022, rz * 0.022, a.semilla, 3) - 0.5) * 16
	-- La aldea queda en llano
	local llano = math.clamp((d - 18) / 14, 0, 1)
	h *= llano
	-- Los bordes de la isla bajan un poco
	h -= max(0, d - (RADIO_LY - 10)) * 0.5
	return LY_Y + floor(h)
end
Arenas.alturaLY = alturaLY

local function cercaDe(a, rx, rz)
	if rx * rx + rz * rz < 24 * 24 then
		return true
	end
	for _, b in a.basesRel do
		local dx, dz = rx - b[1], rz - b[2]
		if dx * dx + dz * dz < 16 * 16 then
			return true
		end
	end
	return false
end

local function construirLY(a)
	local M = nuevoMapa()
	local pon, hay = M.pon, M.hay
	local r = mulberry32(a.semilla + 99)
	local function suelo(x, z)
		return alturaLY(a, x, z) or LY_Y
	end
	-- Rellena por debajo hasta tocar el terreno (rellenarHasta53)
	local function rellenar(x, y, z, b)
		local h = suelo(x, z)
		for yy = y - 1, max(h + 1, y - 5), -1 do
			pon(x, yy, z, b)
		end
	end
	-- La plaza con el pozo-corazón
	local x0, z0 = 0, 0
	local y0 = suelo(0, 0)
	for p = -4, 4 do
		for q = -4, 4 do
			local d = max(abs(p), abs(q))
			pon(x0 + p, y0, z0 + q, d == 4 and K("senda") or (d == 3 and RB.ladrillosPiedra or ((p + q) % 2 == 1 and RB.ladrillosPiedra or K("ladrillosAgrietados", "ladrillosPiedra"))))
			rellenar(x0 + p, y0, z0 + q, RB.roca)
			for y = 1, 7 do
				pon(x0 + p, y0 + y, z0 + q, 0)
			end
		end
	end
	for _, c in { { -2, -2 }, { 2, 2 }, { -2, 2 }, { 2, -2 } } do
		for y = 1, 3 do
			pon(x0 + c[1], y0 + y, z0 + c[2], y == 1 and RB.ladrillosPiedra or RB.valla)
		end
	end
	for p = -2, 2 do
		for q = -2, 2 do
			pon(x0 + p, y0 + 4, z0 + q, K("losaMadera", "tablones"))
			if max(abs(p), abs(q)) <= 1 then
				pon(x0 + p, y0 + 5, z0 + q, K("tablonesAbeto", "tablones"))
			end
		end
	end
	for _, c in { { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 }, { -1, -1 }, { 1, 1 }, { -1, 1 }, { 1, -1 } } do
		pon(x0 + c[1], y0 + 1, z0 + c[2], RB.ladrillosPiedra)
	end
	pon(x0, y0 + 1, z0, K("bloqueOro"))
	pon(x0, y0 + 2, z0, K("piedraLuminosa"))
	pon(x0, y0 + 3, z0, K("cadena", "valla"))
	for _, c in { { -3, -3 }, { 3, 3 }, { -3, 3 }, { 3, -3 } } do
		pon(x0 + c[1], y0 + 1, z0 + c[2], RB.valla)
		pon(x0 + c[1], y0 + 2, z0 + c[2], K("farol"))
	end
	-- Casas con la puerta mirando a la plaza
	local casas = {}
	local function casa(X, Z)
		local Y = suelo(X, Z)
		local ladoX = abs(x0 - X) > abs(z0 - Z)
		local sg = ladoX and signo(x0 - X) or signo(z0 - Z)
		for p = -3, 3 do
			for q = -3, 3 do
				pon(X + p, Y, Z + q, (abs(p) == 3 or abs(q) == 3) and RB.roca or RB.tablones)
				rellenar(X + p, Y, Z + q, RB.roca)
				for y = 1, 9 do
					pon(X + p, Y + y, Z + q, 0)
				end
			end
		end
		for p = -3, 3 do
			for q = -3, 3 do
				if abs(p) == 3 or abs(q) == 3 then
					local esq = abs(p) == 3 and abs(q) == 3
					for y = 1, 4 do
						local puerta = (ladoX and (p == 3 * sg and q == 0) or (not ladoX and q == 3 * sg and p == 0)) and y <= 2
						local ventana = y == 2 and not esq and ((abs(p) == 3 and abs(q) == 1) or (abs(q) == 3 and abs(p) == 1))
							and not (ladoX and p == 3 * sg or (not ladoX and q == 3 * sg))
						pon(X + p, Y + y, Z + q, puerta and 0 or (esq and RB.tronco or (ventana and RB.vidrio or (y == 4 and RB.tronco or RB.tablones))))
					end
				end
			end
		end
		-- Tejado a cuatro aguas con alero
		local teja = K("tablonesAbeto", "tablonesRobleOscuro", "tablones")
		for i = 0, 4 do
			local h = 4 - i
			for p = -h, h do
				for q = -h, h do
					if max(abs(p), abs(q)) == h or i == 4 then
						pon(X + p, Y + 5 + i, Z + q, i == 0 and K("losaMadera", "tablones") or teja)
					end
				end
			end
		end
		local chx, chz = X + 2 * (ladoX and -sg or 1), Z + 2 * (ladoX and 1 or -sg)
		pon(chx, Y + 7, chz, RB.ladrillos)
		pon(chx, Y + 8, chz, RB.ladrillos)
		pon(X - (ladoX and sg or 1), Y + 1, Z - (ladoX and 1 or sg), K("mesa"))
		pon(X + (ladoX and -sg or -1), Y + 1, Z + (ladoX and 1 or sg), K("barril"))
		pon(X, Y + 4, Z, K("farol"))
		local dX, dZ = ladoX and X + 4 * sg or X + 1, ladoX and Z + 1 or Z + 4 * sg
		local yd = suelo(dX, dZ)
		pon(dX, yd + 1, dZ, RB.valla)
		pon(dX, yd + 2, dZ, K("farol"))
		table.insert(casas, { X + 0.5, Y + 1.1, Z + 0.5 })
		if ladoX then
			return X + 4 * sg, Z
		end
		return X, Z + 4 * sg
	end
	local function camino(xa, za, xb, zb)
		local n = max(abs(xb - xa), abs(zb - za))
		for t = 0, n do
			local x, z = redondear(xa + (xb - xa) * t / n), redondear(za + (zb - za) * t / n)
			for _, c in { { 0, 0 }, { 1, 0 }, { 0, 1 } } do
				local X, Z = x + c[1], z + c[2]
				local Y = suelo(X, Z)
				if not hay(X, Y, Z) then
					pon(X, Y, Z, r() < 0.85 and K("senda") or RB.grava)
				end
			end
			if t % 7 == 4 then
				local X, Z = x + 2, z + 2
				local Y = suelo(X, Z)
				if not hay(X, Y + 1, Z) and not hay(X, Y, Z) then
					pon(X, Y + 1, Z, RB.valla)
					pon(X, Y + 2, Z, RB.valla)
					pon(X, Y + 3, Z, K("farol"))
				end
			end
		end
	end
	local function huerto(X, Z)
		local Y = suelo(X, Z)
		for p = -3, 3 do
			for q = -2, 2 do
				local borde = abs(p) == 3 or abs(q) == 2
				pon(X + p, Y, Z + q, borde and RB.tronco or K("cultivoHumedo", "cultivo"))
				rellenar(X + p, Y, Z + q, RB.tierra)
				for y = 1, 3 do
					pon(X + p, Y + y, Z + q, 0)
				end
				if not borde then
					pon(X + p, Y + 1, Z + q, K(r() < 0.7 and "trigo7" or "trigo5", "trigo7"))
				end
			end
		end
		pon(X + 3, Y + 1, Z + 2, RB.heno or RB.tronco)
		pon(X - 3, Y + 1, Z - 2, RB.heno or RB.tronco)
	end
	-- Portales piglin con torres y el terreno corrompido alrededor
	local function portal(X, Y, Z)
		for p = -14, 14 do
			for q = -14, 14 do
				local d = sqrt(p * p + q * q)
				if d >= 6 and d <= 14 and r() <= 1.15 - d / 14 then
					local y = suelo(X + p, Z + q)
					pon(X + p, y, Z + q, r() < 0.6 and RB.netherrack or K("nilioCarmesi", "netherrack"))
					if r() < 0.03 then
						pon(X + p, y + 1, Z + q, K("raicesCarmesi", "hongoCarmesi"))
					end
				end
			end
		end
		for p = -6, 6 do
			for q = -6, 6 do
				local d = max(abs(p), abs(q))
				pon(X + p, Y, Z + q, d == 6 and K("ladrillosNether") or ((p * 7 + q * 3) % 5 == 0 and K("bloqueMagma") or (r() < 0.25 and K("piedraNegra") or RB.netherrack)))
				rellenar(X + p, Y, Z + q, RB.netherrack)
				for y = 1, 9 do
					pon(X + p, Y + y, Z + q, 0)
				end
			end
		end
		for _, c in { { -5, -5 }, { 5, 5 }, { -5, 5 }, { 5, -5 } } do
			for u = -1, 1 do
				for v = -1, 1 do
					for y = 1, 6 do
						if abs(u) + abs(v) < 2 or y < 5 then
							pon(X + c[1] + u, Y + y, Z + c[2] + v, y == 6 and K("ladrillosNether") or (r() < 0.3 and K("piedraNegra") or K("ladrillosNether")))
						end
					end
				end
			end
			pon(X + c[1], Y + 7, Z + c[2], K("luzHongo"))
			for _, e in { { -1, -1 }, { 1, 1 }, { -1, 1 }, { 1, -1 } } do
				pon(X + c[1] + e[1], Y + 7, Z + c[2] + e[2], K("ladrillosNether"))
			end
		end
		for y = 1, 5 do
			for _, p in { -2, 2 } do
				pon(X + p, Y + y, Z, K("obsidiana"))
			end
		end
		for _, p in { -1, 0, 1 } do
			pon(X + p, Y + 1, Z, K("obsidiana"))
			pon(X + p, Y + 5, Z, K("obsidiana"))
		end
		for y = 2, 4 do
			for _, p in { -1, 0, 1 } do
				pon(X + p, Y + y, Z, K("bloqueAmatista", "verrugaBloque"))
			end
		end
		for _, c in { { -3, 2 }, { 3, -2 }, { 2, 3 } } do
			pon(X + c[1], Y + 1, Z + c[2], K("bloqueOro"))
		end
		for _, c in { { -3, -3 }, { 3, 3 } } do
			for y = 1, 3 do
				pon(X + c[1], Y + y, Z + c[2], y == 3 and K("bloqueMagma") or RB.netherrack)
			end
		end
	end
	for _, b in a.basesRel do
		portal(b[1], suelo(b[1], b[2]), b[2])
	end
	for _, c in { { 11, -1 }, { -11, 2 }, { 1, 12 }, { -2, -12 } } do
		local px, pz = casa(x0 + c[1], z0 + c[2])
		camino(x0, z0, px, pz)
	end
	huerto(x0 + 11, z0 + 11)
	huerto(x0 - 11, z0 - 11)
	local ox, oz = a.ox, a.oz
	a.porChunk = porChunks(M, ox, oz)
	a.aldea = { x = ox, y = y0, z = oz }
	a.bases = {}
	for _, b in a.basesRel do
		table.insert(a.bases, { x = b[1] + ox, y = suelo(b[1], b[2]), z = b[2] + oz })
	end
	a.casas = {}
	for _, c in casas do
		table.insert(a.casas, { c[1] + ox, c[2], c[3] + oz })
	end
end

-- Terreno de la isla: hierba, tierra y piedra, árboles y rocas para recoger
local function terrenoLY(a, datos, cx, cz)
	local ox, oz = a.ox, a.oz
	local s = a.semilla
	local function wr(x, y, z, b)
		if x >= 0 and x < CX and z >= 0 and z < CZ and y >= 0 and y < CY then
			buffer.writeu16(datos, (x + z * CX + y * CX * CZ) * 2, b)
		end
	end
	local bx, bz = cx * CX, cz * CZ
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local rx, rz = bx + x - ox, bz + z - oz
			local h = alturaLY(a, rx, rz)
			if h then
				local d = sqrt(rx * rx + rz * rz)
				local fondo = LY_Y - 8 - floor((1 - d / RADIO_LY) * 10) - floor(hash2(rx, rz, s + 3) * 3)
				local roca = not cercaDe(a, rx, rz) and fbm(rx * 0.06, rz * 0.06, s + 500, 2) > 0.66
				for y = fondo, h do
					local b
					if y == h then
						b = roca and (hash2(rx, rz, s + 9) < 0.5 and RB.piedra or K("andesita", "piedra")) or RB.cesped
					elseif y >= h - 3 then
						b = roca and RB.piedra or RB.tierra
					else
						b = RB.piedra
					end
					wr(x, y, z, b)
				end
				if roca and hash2(rx, rz, s + 11) < 0.35 then
					wr(x, h + 1, z, RB.piedra)
				elseif not roca and not cercaDe(a, rx, rz) then
					local f = hash2(rx, rz, s + 13)
					if f < 0.08 then
						wr(x, h + 1, z, RB.hierbaAlta)
					elseif f < 0.095 then
						wr(x, h + 1, z, RB.florAmarilla)
					end
				end
			end
		end
	end
	-- Árboles (los de los chunks vecinos también pueden asomar aquí)
	for z = -3, CZ + 2 do
		for x = -3, CX + 2 do
			local rx, rz = bx + x - ox, bz + z - oz
			if hash2(rx, rz, s + 7) < 0.014 and not cercaDe(a, rx, rz) and rx * rx + rz * rz < (RADIO_LY - 5) ^ 2 then
				local h = alturaLY(a, rx, rz)
				if h and fbm(rx * 0.06, rz * 0.06, s + 500, 2) <= 0.66 then
					local alto = 4 + floor(hash2(rx, rz, s + 8) * 2)
					for dy = -2, 1 do
						local rad = dy <= -1 and 2 or 1
						for dx = -rad, rad do
							for dz = -rad, rad do
								if not (abs(dx) == rad and abs(dz) == rad and (dy == 1 or hash2(rx + dx, rz + dz, s + dy) < 0.5)) then
									wr(x + dx, h + alto + dy, z + dz, RB.hojas)
								end
							end
						end
					end
					for k = 1, alto do
						wr(x, h + k, z, RB.tronco)
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Arenas por partida (Mazmorras y Leyendas)
------------------------------------------------------------------
local function crearDinamica(tipo, id, ox, oz, n1, n2)
	local a
	if tipo == "mz" then
		a = { id = id, tipo = "mz", ox = ox, oz = oz, nivel = n1, semilla = n2,
			cx0 = (ox - 300) // CX, cx1 = (ox + 300) // CX, cz0 = (oz - 300) // CZ, cz1 = (oz + 300) // CZ, construir = construirMZ }
	else
		a = { id = id, tipo = "ly", ox = ox, oz = oz, semilla = n1,
			cx0 = (ox - RADIO_LY - 4) // CX, cx1 = (ox + RADIO_LY + 4) // CX, cz0 = (oz - RADIO_LY - 4) // CZ, cz1 = (oz + RADIO_LY + 4) // CZ,
			construir = construirLY, terreno = terrenoLY }
		-- Los portales hacen falta para saber dónde no poner árboles
		local r = mulberry32(a.semilla + 7)
		a.basesRel = {}
		for k = 0, 2 do
			local ang = k / 3 * pi * 2 + r() * 0.5
			table.insert(a.basesRel, { redondear(cos(ang) * 70), redondear(sin(ang) * 70) })
		end
	end
	return a
end

local carpeta = nil
local function carpetaActivas(crear)
	if carpeta and carpeta.Parent then
		return carpeta
	end
	local ok, RS = pcall(function()
		return game:GetService("ReplicatedStorage")
	end)
	if not ok or not RS then
		return nil
	end
	carpeta = RS:FindFirstChild("ArenasActivas")
	if not carpeta and crear then
		carpeta = Instance.new("Folder")
		carpeta.Name = "ArenasActivas"
		carpeta.Parent = RS
	end
	return carpeta
end

local contador = 0
-- Servidor: crea una arena nueva (en un sitio por estrenar) y la anuncia a los clientes
function Arenas.nueva(tipo, n1, n2)
	contador += 1
	local id = tipo .. contador
	local ox, oz
	if tipo == "mz" then
		ox, oz = -1200 - contador * 600, Arenas.MZ_Z
	else
		ox, oz = -1200 - contador * 300, Arenas.LY_Z
	end
	local a = crearDinamica(tipo, id, ox, oz, n1, n2)
	table.insert(lista, a)
	local c = carpetaActivas(true)
	if c then
		local v = Instance.new("StringValue")
		v.Name = id
		v.Value = table.concat({ tipo, ox, oz, n1, n2 or 0 }, "|")
		v.Parent = c
	end
	return asegurar(a)
end

function Arenas.borrar(id)
	quitar(id)
	local c = carpetaActivas(false)
	local v = c and c:FindFirstChild(id)
	if v then
		v:Destroy()
	end
end

-- Cliente: lee las arenas que anuncia el servidor
local function leer(v)
	if Arenas.buscar(v.Name) then
		return
	end
	local p = string.split(v.Value, "|")
	if #p < 5 then
		return
	end
	table.insert(lista, crearDinamica(p[1], v.Name, tonumber(p[2]), tonumber(p[3]), tonumber(p[4]), tonumber(p[5])))
end
function Arenas.escuchar()
	local RS = game:GetService("ReplicatedStorage")
	local c = RS:WaitForChild("ArenasActivas", 30)
	if not c then
		return
	end
	for _, v in c:GetChildren() do
		leer(v)
	end
	c.ChildAdded:Connect(function(v)
		if v:IsA("StringValue") then
			leer(v)
		end
	end)
	c.ChildRemoved:Connect(function(v)
		quitar(v.Name)
	end)
end

return Arenas
