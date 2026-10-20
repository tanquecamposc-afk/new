--!native
--!optimize 2
--[[
	Blockverse para Roblox · Estructuras de la Superficie
	Traducción a Luau de las estructuras del juego web, en el mismo orden
	en que las genera:
	· mundo.js: fortaleza (con el portal del End), mazmorras, portales
	  en ruinas, pozos del desierto y aldeas.
	· v120.js: Deep Dark (sculk), ciudades antiguas, ruinas de sendero.
	· v121.js: cámaras de prueba. final.js: monumentos oceánicos.
	· completo.js: minas abandonadas, iglús, templos de la jungla,
	  cabañas de bruja, puestos de saqueadores y naufragios.
	· v26.js: pirámides del desierto. estructuras27.js: rocas, geodas,
	  fósiles, tesoros, ruinas oceánicas, sótanos de iglú y mansiones.
	· biomas27.js: decoración de biomas y cuevas. estructuras28.js: desgaste.
	Con la misma semilla salen los mismos bloques que en la versión web.
	Los cofres se apuntan en `cofres` como {x, y, z, tipo} (coordenadas del mundo).
]]
local Registro = require(script.Parent.Registro)
local Ruido = require(script.Parent.Ruido)
local Biomas = require(script.Parent.Datos.Biomas)

local hash2, hash3, mulberry32 = Ruido.hash2, Ruido.hash3, Ruido.mulberry32
local valueNoise, valueNoise3, fbm = Ruido.valueNoise, Ruido.valueNoise3, Ruido.fbm
local redondear = Ruido.redondear
local floor, abs, sqrt, min, max = math.floor, math.abs, math.sqrt, math.min, math.max
local fmod = math.fmod

local CO = Biomas.constantes
local CX, CZ, CY, OY, NIVEL_MAR = CO.CX, CO.CZ, CO.CY, CO.OY, CO.NIVEL_MAR
local BIOMA = Biomas.claves
local BR = Registro.B
local B = setmetatable({}, {
	__index = function(_, k)
		local v = BR[k]
		if v == nil then
			error("Estructuras: falta el bloque " .. tostring(k))
		end
		return v
	end,
})
local BL = Registro.bloques
local SOLIDO, REEMPL = Registro.SOLIDO, Registro.REEMPL
local esAgua, esLiquido, esHojas, esTronco = Registro.esAgua, Registro.esLiquido, Registro.esHojas, Registro.esTronco
local DIRF = Registro.DIRF

local function idx(x, y, z)
	return x + z * CX + y * CX * CZ
end
local function rd(d, i)
	return buffer.readu16(d, i * 2)
end
local function wr(d, i, v)
	buffer.writeu16(d, i * 2, v)
end
local function esOceano(b)
	return b == 0 or b == 21 or b == 22 or b == 29
end
local function hypot(...)
	local t = 0
	for _, v in { ... } do
		t += v * v
	end
	return sqrt(t)
end
-- Colores (registro.js): lana, hormigón, vidrio tintado y alfombras
local function LANA_COLOR(k)
	return k == 0 and 37 or 1339 + k
end
local function HORMIGON(k)
	return 1355 + k
end
local function VIDRIO_COLOR(k)
	return 1371 + k
end
local function ALFOMBRA(k)
	return 1387 + k
end

local E = {}
E.LANA_COLOR, E.HORMIGON, E.VIDRIO_COLOR, E.ALFOMBRA = LANA_COLOR, HORMIGON, VIDRIO_COLOR, ALFOMBRA

------------------------------------------------------------------
-- Contexto de un chunk
------------------------------------------------------------------
-- c = {gen, s, datos, cx, cz, bx, bz, info, bioma (buffer), cofres}
local function infoH(c, x, z)
	local h = c.gen:infoColumna(x, z)
	return h
end
local function cofreReg(c, x, y, z, tipo)
	table.insert(c.cofres, { x, y, z, tipo })
end

------------------------------------------------------------------
-- Fortaleza (mundo.js)
------------------------------------------------------------------
function E.posFortaleza(s)
	local a = hash2(1, 2, s) * math.pi * 2
	local d = 520 + hash2(3, 4, s) * 260
	return { x = redondear(math.cos(a) * d), y = 40, z = redondear(math.sin(a) * d) }
end

local function bloqueFortaleza(x, y, z, f, s)
	local rx, ry, rz = x - f.x, y - f.y, z - f.z
	local function piedra()
		local h = hash3(x, y, z, s + 40)
		return h < 0.25 and B.ladrillosMusgo or B.ladrillosPiedra
	end
	if abs(rx) <= 5 and abs(rz) <= 8 and ry >= 0 and ry <= 7 then
		local borde = abs(rx) == 5 or abs(rz) == 8 or ry == 0 or ry == 7
		local puerta = (abs(rz) == 8 or abs(rx) == 5) and ry >= 1 and ry <= 3
			and ((abs(rx) <= 1 and abs(rz) == 8) or (abs(rz) <= 1 and abs(rx) == 5))
		if borde and not puerta then
			return piedra()
		end
		if ry == 1 and abs(rx) <= 2 and rz >= 1 and rz <= 5 then
			if abs(rx) <= 1 and rz >= 2 and rz <= 4 then
				return B.lava
			end
			return piedra()
		end
		if ry == 2 then
			local marco = (abs(rx) == 2 and rz >= 2 and rz <= 4) or ((rz == 1 or rz == 5) and abs(rx) <= 1)
			if marco then
				return hash3(x, y, z, s + 41) < 0.1 and B.marcoEndOjo or B.marcoEnd
			end
		end
		if ry == 1 and rz == -5 and rx == 3 then
			return B.generador
		end
		return 0
	end
	local function pasillo(u, v, len)
		if u < 0 or u > len then
			return -1
		end
		if abs(v) > 2 or ry < 0 or ry > 4 then
			return -1
		end
		return (abs(v) == 2 or ry == 0 or ry == 4) and piedra() or 0
	end
	local function salaFinal(u, v, len)
		local du = u - len - 3
		if abs(du) > 3 or abs(v) > 3 or ry < 0 or ry > 5 then
			return -1
		end
		if abs(du) == 3 or abs(v) == 3 or ry == 0 or ry == 5 then
			if du == -3 and abs(v) <= 1 and ry >= 1 and ry <= 3 then
				return 0
			end
			return piedra()
		end
		if du == 2 and v == 0 and ry == 1 then
			return B.cofre
		end
		return 0
	end
	for _, t in { { -rz - 9, rx, 26 }, { rx - 6, rz, 22 }, { -rx - 6, rz, 30 } } do
		local b = pasillo(t[1], t[2], t[3])
		if b >= 0 then
			return b
		end
		b = salaFinal(t[1], t[2], t[3])
		if b >= 0 then
			return b
		end
	end
	return -1
end

------------------------------------------------------------------
-- Aldeas (mundo.js)
------------------------------------------------------------------
local ESTILOS = {
	[BIOMA.llanura] = "llanura", [BIOMA.desierto] = "desierto", [BIOMA.sabana] = "sabana", [BIOMA.taiga] = "taiga",
	[BIOMA.nevado] = "taiga", [BIOMA.abedul] = "llanura", [BIOMA.taigaNevada] = "taiga", [BIOMA.prado] = "llanura",
}
local TAM_EDIF = { casa = { 5, 5 }, casaGrande = { 7, 6 }, granja = { 7, 9 }, herreria = { 6, 6 } }
local TIPOS_EDIF = { "casa", "casa", "casaGrande", "granja", "herreria", "casa" }

function E.aldeaEnRegion(gen, rx, rz)
	gen._aldeas = gen._aldeas or {}
	local k = rx .. "," .. rz
	local cache = gen._aldeas[k]
	if cache ~= nil then
		return cache or nil
	end
	local res = false
	local s = gen.semilla + 12000
	if hash2(rx, rz, s) < 0.6 then
		local x = rx * 320 + 60 + floor(hash2(rx, rz, s + 1) * 200)
		local z = rz * 320 + 60 + floor(hash2(rx, rz, s + 2) * 200)
		local h0, bio0 = gen:infoColumna(x, z)
		if ESTILOS[bio0] and h0 > NIVEL_MAR + 1 then
			local r = mulberry32(floor(hash2(rx, rz, s + 3) * 4294967296))
			local al = { x = x, z = z, y = h0, estilo = ESTILOS[bio0], brazos = {}, edificios = {}, farolas = {} }
			local ocupa = { { x - 3, z - 3, x + 3, z + 3 } }
			local function libre(a)
				for _, o in ocupa do
					if a[1] <= o[3] + 1 and a[3] >= o[1] - 1 and a[2] <= o[4] + 1 and a[4] >= o[2] - 1 then
						return false
					end
				end
				return true
			end
			for d = 0, 3 do
				local len = 16 + floor(r() * 12)
				table.insert(al.brazos, { d = d, len = len })
				local dx, dz = DIRF[d + 1][1], DIRF[d + 1][2]
				local px, pz = -dz, dx
				local dist = 7
				while dist < len - 2 do
					if r() < 0.35 then
						table.insert(al.farolas, { x + dx * dist + px * 2, z + dz * dist + pz * 2 })
					end
					for _, lado in { -1, 1 } do
						if r() > 0.8 then
							continue
						end
						local tipo = TIPOS_EDIF[floor(r() * 6) + 1]
						local w, p = TAM_EDIF[tipo][1], TAM_EDIF[tipo][2]
						local off = 3 + math.ceil(max(w, p) / 2)
						local ecx, ecz = x + dx * dist + px * lado * off, z + dz * dist + pz * lado * off
						local x0, z0 = ecx - floor(w / 2), ecz - floor(p / 2)
						local caja = { x0, z0, x0 + w - 1, z0 + p - 1 }
						if not libre(caja) then
							continue
						end
						local hc = gen:infoColumna(ecx, ecz)
						if hc <= NIVEL_MAR or abs(hc - h0) > 8 then
							continue
						end
						table.insert(ocupa, caja)
						local vx, vz = -px * lado, -pz * lado
						local puerta = vz < 0 and 0 or vx > 0 and 1 or vz > 0 and 2 or 3
						table.insert(al.edificios, { tipo = tipo, x0 = x0, z0 = z0, w = w, p = p, y = hc, puerta = puerta, r = floor(r() * 1e9) })
					end
					dist += 8
				end
			end
			local cj = { x - 30, z - 30, x + 30, z + 30 }
			for _, o in ocupa do
				cj = { min(cj[1], o[1]), min(cj[2], o[2]), max(cj[3], o[3]), max(cj[4], o[4]) }
			end
			al.caja = cj
			res = al
		end
	end
	gen._aldeas[k] = res
	return res or nil
end

function E.aldeasCerca(gen, x, z)
	local rx, rz = floor(x / 320), floor(z / 320)
	local res = {}
	for a = -1, 1 do
		for b = -1, 1 do
			local al = E.aldeaEnRegion(gen, rx + a, rz + b)
			if al then
				table.insert(res, al)
			end
		end
	end
	return res
end

local MATERIALES = {
	llanura = { pared = "tablones", esquina = "tronco", suelo = "roca", techo = "tablones", losa = "losaMadera" },
	desierto = { pared = "arenisca", esquina = "arenisca", suelo = "arenisca", techo = "arenisca", losa = "losaPiedra" },
	sabana = { pared = "tablones", esquina = "troncoAcacia", suelo = "roca", techo = "tablones", losa = "losaMadera" },
	taiga = { pared = "tablones", esquina = "troncoAbeto", suelo = "roca", techo = "tablones", losa = "losaMadera" },
}

local function construirEdificio(e, estilo, set, alt, cofre)
	local Mc = MATERIALES[estilo]
	local M = { pared = B[Mc.pared], esquina = B[Mc.esquina], suelo = B[Mc.suelo], techo = B[Mc.techo], losa = B[Mc.losa] }
	local x0, z0, w, p, y = e.x0, e.z0, e.w, e.p, e.y
	local x1, z1 = x0 + w - 1, z0 + p - 1
	local r = mulberry32(e.r)
	for x = x0, x1 do
		for z = z0, z1 do
			local h = alt(x, z)
			for yy = min(h, y - 1), y - 1 do
				set(x, yy, z, M.suelo)
			end
			for yy = y + 1, max(h, y) + 2 do
				set(x, yy, z, 0)
			end
		end
	end
	if e.tipo == "granja" then
		local mid = x0 + floor(w / 2)
		for x = x0, x1 do
			for z = z0, z1 do
				local borde = x == x0 or x == x1 or z == z0 or z == z1
				if borde then
					set(x, y, z, M.esquina == B.arenisca and B.arenisca or B.tronco)
				elseif x == mid then
					set(x, y, z, B.agua)
				else
					set(x, y, z, B.cultivo)
					local t = fmod(x * 7 + z * 3, 9)
					local cult = nil
					if BR.zanahorias0 ~= nil and t > 5 then
						cult = ({ B.zanahorias0, B.patatas0, B.remolachas0 })[t - 5]
					end
					set(x, y + 1, z, cult and cult + floor(r() * 4) or B.trigo0 + floor(r() * 8))
				end
			end
		end
		return
	end
	local alto = 4
	local pdx, pdz = DIRF[e.puerta + 1][1], DIRF[e.puerta + 1][2]
	local puertaX = pdx ~= 0 and (pdx > 0 and x1 or x0) or x0 + floor(w / 2)
	local puertaZ = pdz ~= 0 and (pdz > 0 and z1 or z0) or z0 + floor(p / 2)
	for x = x0, x1 do
		for z = z0, z1 do
			set(x, y, z, M.suelo)
			local bx, bz = x == x0 or x == x1, z == z0 or z == z1
			local esquina = bx and bz
			for yy = y + 1, y + alto - 1 do
				if esquina then
					set(x, yy, z, M.esquina)
				elseif bx or bz then
					local ventana = yy == y + 2 and ((bx and (z - z0) % 2 == 0 and z ~= z0 and z ~= z1) or (bz and (x - x0) % 2 == 0 and x ~= x0 and x ~= x1))
					set(x, yy, z, ventana and B.panel or (e.tipo == "herreria" and B.roca or M.pared))
				else
					set(x, yy, z, 0)
				end
			end
		end
	end
	for x = x0 - 1, x1 + 1 do
		for z = z0 - 1, z1 + 1 do
			local borde = x < x0 or x > x1 or z < z0 or z > z1
			set(x, y + alto, z, borde and M.losa or M.techo)
		end
	end
	for x = x0 + 1, x1 - 1 do
		for z = z0 + 1, z1 - 1 do
			set(x, y + alto + 1, z, M.losa)
		end
	end
	local fPuerta = ({ 2, 3, 0, 1 })[e.puerta + 1]
	set(puertaX, y + 1, puertaZ, 149 + fPuerta * 4)
	set(puertaX, y + 2, puertaZ, 149 + fPuerta * 4 + 1)
	set(puertaX + pdx, y, puertaZ + pdz, M.suelo)
	set(puertaX + pdx, y + 1, puertaZ + pdz, 0)
	set(puertaX + pdx, y + 2, puertaZ + pdz, 0)
	local ix, iz = x0 + 1, z0 + 1
	if e.tipo == "herreria" then
		set(x1 - 1, y + 1, z1 - 1, B.horno)
		set(x1 - 2, y + 1, z1 - 1, B.horno)
		set(x0 + 1, y, z1 - 1, B.lava)
		set(x0 + 1, y + 1, z0 + 1, B.cofre)
		cofre(x0 + 1, y + 1, z0 + 1, "herreria")
	else
		set(ix, y + 1, iz, B.cama)
		set(x1 - 1, y + 1, iz, B.mesa)
		if e.tipo == "casaGrande" then
			set(x1 - 1, y + 1, z1 - 1, B.cofre)
			cofre(x1 - 1, y + 1, z1 - 1, "aldea")
		end
	end
	set(x0 + floor(w / 2), y + 3, z0 + floor(p / 2), 0)
	set(x0 + floor(w / 2) + (pdx ~= 0 and -pdx or 0), y + 1, z0 + floor(p / 2) + (pdz ~= 0 and -pdz or 0), B.antorcha)
end

local function estampar(c, x0, z0, x1, z1, fn)
	local bx, bz = c.bx, c.bz
	if x1 < bx or x0 > bx + CX - 1 or z1 < bz or z0 > bz + CZ - 1 then
		return false
	end
	local datos = c.datos
	local function set(x, y, z, id)
		local lx, lz = x - bx, z - bz
		if lx < 0 or lz < 0 or lx >= CX or lz >= CZ or y < 1 or y >= CY then
			return
		end
		wr(datos, idx(lx, y, lz), id)
	end
	fn(set)
	return true
end

local function estructuraAldea(c, al)
	local bx, bz, datos = c.bx, c.bz, c.datos
	local function alt(x, z)
		if x >= bx and x < bx + CX and z >= bz and z < bz + CZ then
			return c.info[(z - bz) * CX + x - bx + 1][1]
		end
		return infoH(c, x, z)
	end
	local function cofre(x, y, z, t)
		if x >= bx and x < bx + CX and z >= bz and z < bz + CZ then
			cofreReg(c, x, y, z, t)
		end
	end
	for _, br in al.brazos do
		local dx, dz = DIRF[br.d + 1][1], DIRF[br.d + 1][2]
		local px, pz = -dz, dx
		for i = 2, br.len do
			for k = -1, 1 do
				local x, z = al.x + dx * i + px * k, al.z + dz * i + pz * k
				if x < bx or x >= bx + CX or z < bz or z >= bz + CZ then
					continue
				end
				local h = alt(x, z)
				local i2 = idx(x - bx, h, z - bz)
				local b = rd(datos, i2)
				if b == B.cesped or b == B.tierra or b == B.arena or b == B.cespedNevado or b == B.arenaRoja then
					wr(datos, i2, B.senda)
					local a = idx(x - bx, h + 1, z - bz)
					if REEMPL[rd(datos, a)] then
						wr(datos, a, 0)
					end
				elseif esAgua(b) then
					wr(datos, i2, B.tablones)
				end
			end
		end
	end
	estampar(c, al.x - 2, al.z - 2, al.x + 1, al.z + 1, function(set)
		local y = al.y
		for x = al.x - 2, al.x + 1 do
			for z = al.z - 2, al.z + 1 do
				local dentro = x > al.x - 2 and x < al.x + 1 and z > al.z - 2 and z < al.z + 1
				set(x, y - 2, z, B.roca)
				if dentro then
					set(x, y - 1, z, B.agua)
					set(x, y, z, B.agua)
					set(x, y + 1, z, 0)
				else
					set(x, y - 1, z, B.roca)
					set(x, y, z, B.roca)
					set(x, y + 1, z, B.roca)
				end
				local esq = (x == al.x - 2 or x == al.x + 1) and (z == al.z - 2 or z == al.z + 1)
				for yy = y + 2, y + 3 do
					set(x, yy, z, esq and B.valla or 0)
				end
				set(x, y + 4, z, B.losaRoca)
			end
		end
	end)
	for _, e in al.edificios do
		estampar(c, e.x0 - 1, e.z0 - 1, e.x0 + e.w, e.z0 + e.p, function(set)
			construirEdificio(e, al.estilo, set, alt, cofre)
		end)
	end
	for _, f in al.farolas do
		local fx, fz = f[1], f[2]
		estampar(c, fx, fz, fx, fz, function(set)
			local h = alt(fx, fz)
			set(fx, h + 1, fz, B.valla)
			set(fx, h + 2, fz, B.valla)
			set(fx, h + 3, fz, B.linternaCalabaza)
		end)
	end
end

------------------------------------------------------------------
-- estructurasSuperficie (mundo.js)
------------------------------------------------------------------
local function estructurasSuperficie(c)
	local datos, cx, cz, bx, bz, s, info = c.datos, c.cx, c.cz, c.bx, c.bz, c.s, c.info
	local f = E.posFortaleza(s)
	if bx + CX > f.x - 45 and bx < f.x + 45 and bz + CZ > f.z - 45 and bz < f.z + 45 then
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				for y = f.y, f.y + 7 do
					local b = bloqueFortaleza(bx + x, y, bz + z, f, s)
					if b >= 0 then
						wr(datos, idx(x, y, z), b)
						if b == B.cofre then
							cofreReg(c, bx + x, y, bz + z, "fortaleza")
						end
					end
				end
			end
		end
	end
	-- Mazmorra
	if hash2(cx, cz, s + 900) < 0.035 then
		local cy = 18 + floor(hash2(cx, cz, s + 901) * 50)
		local hx = hash2(cx, cz, s + 903) < 0.5 and 4 or 5
		local hz = hash2(cx, cz, s + 904) < 0.5 and 4 or 5
		for z = 8 - hz, 8 + hz do
			for x = 8 - hx, 8 + hx do
				for y = cy, cy + 5 do
					local rx, rz, ry = x - 8, z - 8, y - cy
					local i = idx(x, y, z)
					local borde = abs(rx) == hx or abs(rz) == hz or ry == 0 or ry == 5
					if borde then
						if rd(datos, i) ~= 0 then
							wr(datos, i, (ry == 0 and hash3(x, y, z, s + 44) < 0.5) and B.rocaMusgo or B.roca)
						end
					else
						wr(datos, i, 0)
					end
				end
			end
		end
		wr(datos, idx(8, cy + 1, 8), B.generador)
		local huecos = {}
		for x = 9 - hx, 7 + hx do
			table.insert(huecos, { x, 8 - hz + 1 })
			table.insert(huecos, { x, 8 + hz - 1 })
		end
		for z = 10 - hz, 6 + hz do
			table.insert(huecos, { 8 - hx + 1, z })
			table.insert(huecos, { 8 + hx - 1, z })
		end
		local ncof = hash2(cx, cz, s + 902) < 0.5 and 2 or 1
		for k = 0, ncof - 1 do
			local hq = huecos[floor(hash2(cx + k * 7, cz, s + 905) * #huecos) + 1]
			local x, z = hq[1], hq[2]
			if rd(datos, idx(x, cy + 1, z)) == B.cofre then
				continue
			end
			wr(datos, idx(x, cy + 1, z), B.cofre)
			cofreReg(c, bx + x, cy + 1, bz + z, "mazmorra")
		end
	end
	local centro = info[8 * CX + 8 + 1]
	local hC = centro[1]
	-- Portal en ruinas
	if hash2(cx, cz, s + 950) < 0.006 and hC > NIVEL_MAR then
		local rr = mulberry32(floor(hash2(cx, cz, s + 951) * 4294967296))
		for _ = 0, 29 do
			local x, z = 4 + floor(rr() * 8), 4 + floor(rr() * 8)
			local h = info[z * CX + x + 1][1]
			if abs(h - hC) < 3 then
				wr(datos, idx(x, h, z), rr() < 0.8 and B.netherrack or B.bloqueOro)
			end
		end
		for a = -1, 2 do
			for hh = 0, 4 do
				local marco = a == -1 or a == 2 or hh == 0 or hh == 4
				local x, y, z = 6 + a, hC + hh, 8
				if marco then
					if rr() < 0.72 then
						wr(datos, idx(x, y, z), rr() < 0.2 and B.obsidianaLlorosa or B.obsidiana)
					end
				else
					wr(datos, idx(x, y, z), 0)
				end
			end
		end
		for _ = 0, 2 do
			local x, z = 4 + floor(rr() * 8), 4 + floor(rr() * 8)
			local h = info[z * CX + x + 1][1]
			wr(datos, idx(x, h + 1, z), B.obsidiana)
		end
		wr(datos, idx(5, hC + 1, 11), B.cofre)
		cofreReg(c, bx + 5, hC + 1, bz + 11, "portalRuinas")
	end
	-- Pozo del desierto
	if centro[2] == BIOMA.desierto and hash2(cx, cz, s + 960) < 0.01 then
		for x = 6, 10 do
			for z = 6, 10 do
				wr(datos, idx(x, hC, z), B.arenisca)
				for y = hC + 1, hC + 5 do
					wr(datos, idx(x, y, z), 0)
				end
			end
		end
		wr(datos, idx(8, hC, 8), B.agua)
		wr(datos, idx(8, hC - 1, 8), B.agua)
		for x = 7, 9 do
			for z = 7, 9 do
				if x ~= 8 or z ~= 8 then
					wr(datos, idx(x, hC + 1, z), B.arenisca)
				end
				wr(datos, idx(x, hC + 4, z), B.arenisca)
			end
		end
		for _, q in { { 7, 7 }, { 9, 7 }, { 7, 9 }, { 9, 9 } } do
			for y = hC + 2, hC + 3 do
				wr(datos, idx(q[1], y, q[2]), B.arenisca)
			end
		end
	end
	for _, al in E.aldeasCerca(c.gen, bx + 8, bz + 8) do
		local cj = al.caja
		if bx + CX > cj[1] and bx <= cj[3] and bz + CZ > cj[2] and bz <= cj[4] then
			estructuraAldea(c, al)
		end
	end
end

------------------------------------------------------------------
-- 1.19 / 1.20 (v120.js): Deep Dark, ciudades antiguas y ruinas
------------------------------------------------------------------
local Y_CIUDAD = OY - 51
local R_CIUDAD = 288
local function esDeepDark(s, x, z)
	return fbm(x * 0.0032, z * 0.0032, s + 8800, 2) > 0.6
end
E.esDeepDark = esDeepDark
local ROCA_SCULK

function E.ciudadesAntiguasCerca(s, x0, z0, x1, z1)
	local res = {}
	for rx = floor((x0 - 48) / R_CIUDAD), floor((x1 + 48) / R_CIUDAD) do
		for rz = floor((z0 - 48) / R_CIUDAD), floor((z1 + 48) / R_CIUDAD) do
			if hash2(rx, rz, s + 8900) > 0.65 then
				continue
			end
			local x = rx * R_CIUDAD + 48 + floor(hash2(rx, rz, s + 8901) * (R_CIUDAD - 96))
			local z = rz * R_CIUDAD + 48 + floor(hash2(rx, rz, s + 8902) * (R_CIUDAD - 96))
			if not esDeepDark(s, x, z) then
				continue
			end
			table.insert(res, { x = x, z = z, y = Y_CIUDAD })
		end
	end
	return res
end

local function construirCiudadesAntiguas(c)
	local bx, bz, d, s = c.bx, c.bz, c.datos, c.s
	for _, ci in E.ciudadesAntiguasCerca(s, bx, bz, bx + CX - 1, bz + CZ - 1) do
		if bx + CX < ci.x - 44 or bx > ci.x + 44 or bz + CZ < ci.z - 36 or bz > ci.z + 36 then
			continue
		end
		local F = ci.y
		local function pon(x, y, z, b)
			if not (x >= bx and x < bx + CX and z >= bz and z < bz + CZ) or y < 1 or y >= CY then
				return
			end
			wr(d, idx(x - bx, y, z - bz), b)
			if b == B.cofre then
				cofreReg(c, x, y, z, "ciudadAntigua")
			end
		end
		local function get(x, y, z)
			return rd(d, idx(x - bx, y, z - bz))
		end
		for x = max(bx, ci.x - 42), min(bx + CX - 1, ci.x + 42) do
			for z = max(bz, ci.z - 34), min(bz + CZ - 1, ci.z + 34) do
				local dx, dz = x - ci.x, z - ci.z
				local e = (dx / 42) ^ 2 + (dz / 34) ^ 2
				if e > 1 then
					continue
				end
				local techo = F + 9 + redondear((1 - e) * 9 + hash2(x, z, s + 8910) * 2)
				for y = F, techo do
					pon(x, y, z, 0)
				end
				local t = get(x, techo + 1, z)
				if t == 0 or esLiquido(t) then
					pon(x, techo + 1, z, B.pizarra)
				end
				for y = F - 4, F - 2 do
					local b = get(x, y, z)
					if b == 0 or esLiquido(b) then
						pon(x, y, z, B.pizarra)
					end
				end
				local camino = abs(dz) <= 1 or abs(dx) <= 1
				local v = valueNoise(x * 0.18, z * 0.18, s + 8911)
				pon(x, F - 1, z, camino and B.baldosasPizarra or (v > 0.55 and B.sculk or (bit32.band(bit32.bxor(x, z), 7) == 0 and B.baldosasPizarra or B.ladrillosPizarra)))
				if not camino and v > 0.6 then
					local h = hash2(x, z, s + 8912)
					if h < 0.035 then
						pon(x, F, z, B.sensorSculk)
					elseif h < 0.05 then
						pon(x, F, z, B.chillador)
					elseif h < 0.14 then
						pon(x, F, z, B.vetaSculk)
					end
				end
				if (abs(dz) == 3 and dx % 8 == 0 and abs(dx) > 13) or (abs(dx) == 3 and dz % 8 == 0 and abs(dz) > 5) then
					pon(x, F, z, B.baldosasPizarra)
					pon(x, F + 1, z, B.baldosasPizarra)
					pon(x, F + 2, z, B.farolAlmas)
				end
			end
		end
		for dx = -12, 12 do
			for dz = -4, 4 do
				local x, z = ci.x + dx, ci.z + dz
				pon(x, F, z, (abs(dx) == 12 or abs(dz) == 4) and B.baldosasPizarra or B.ladrillosPizarra)
				for y = F + 1, F + 15 do
					pon(x, y, z, 0)
				end
			end
		end
		for dx = -9, 9 do
			for y = F + 1, F + 14 do
				local a = abs(dx)
				local marco = (a >= 7 and a <= 8) or (y >= F + 12 and a <= 8) or (y == F + 11 and a >= 5 and a <= 8) or (y == F + 13 and a == 9)
				if marco then
					pon(ci.x + dx, y, ci.z, B.pizarraReforzada)
				end
				if a == 9 and y <= F + 4 then
					for _, dz in { -1, 0, 1 } do
						pon(ci.x + dx, y, ci.z + dz, B.ladrillosPizarra)
					end
				end
			end
		end
		for _, o in { { -10, 2 }, { 10, -2 } } do
			pon(ci.x + o[1], F + 1, ci.z + o[2], B.cofre)
		end
		for _, o in { { -5, 3 }, { 5, -3 }, { -5, -3 }, { 5, 3 } } do
			pon(ci.x + o[1], F + 1, ci.z + o[2], B.farolAlmas)
		end
		for _, o in { { -26, -18 }, { 26, -18 }, { -26, 18 }, { 26, 18 }, { -34, 0 }, { 34, 0 }, { 0, -24 }, { 0, 24 } } do
			local ox, oz = o[1], o[2]
			if hash2(ci.x + ox, ci.z + oz, s + 8913) < 0.2 then
				continue
			end
			local x0, z0 = ci.x + ox - 3, ci.z + oz - 3
			for x = x0, x0 + 6 do
				for z = z0, z0 + 6 do
					local borde = x == x0 or x == x0 + 6 or z == z0 or z == z0 + 6
					local esq = (x == x0 or x == x0 + 6) and (z == z0 or z == z0 + 6)
					pon(x, F - 1, z, B.baldosasPizarra)
					for y = F, F + 4 do
						if y == F + 4 then
							pon(x, y, z, hash3(x, y, z, s + 8916) < 0.2 and 0 or B.ladrillosPizarra)
						elseif borde then
							pon(x, y, z, (hash3(x, y, z, s + 8914) < 0.15 and y > F + 1) and 0 or (esq and B.baldosasPizarra or B.ladrillosPizarra))
						else
							pon(x, y, z, 0)
						end
					end
				end
			end
			local px = ox == 0 and ci.x or (ox < 0 and x0 + 6 or x0)
			local pz = ox == 0 and (oz < 0 and z0 + 6 or z0) or ci.z + oz
			for y = F, F + 2 do
				pon(px, y, pz, 0)
			end
			pon(x0 + 3, F, z0 + 3, B.cofre)
			pon(x0 + 1, F, z0 + 1, B.farolAlmas)
			pon(x0 + 5, F, z0 + 1, B.farolAlmas)
			if hash2(x0, z0, s + 8915) < 0.6 then
				pon(x0 + 5, F, z0 + 5, B.chillador)
			end
			if hash2(x0, z0, s + 8917) < 0.5 then
				pon(x0 + 1, F, z0 + 5, B.sensorSculk)
			end
		end
	end
end

------------------------------------------------------------------
-- Cámaras de prueba (v121.js)
------------------------------------------------------------------
local R_CAMARA, F_CAMARA = 320, OY - 28
function E.camarasPruebaCerca(s, x0, z0, x1, z1)
	local res = {}
	for rx = floor((x0 - 48) / R_CAMARA), floor((x1 + 48) / R_CAMARA) do
		for rz = floor((z0 - 48) / R_CAMARA), floor((z1 + 48) / R_CAMARA) do
			if hash2(rx, rz, s + 9300) > 0.55 then
				continue
			end
			table.insert(res, {
				x = rx * R_CAMARA + 60 + floor(hash2(rx, rz, s + 9301) * (R_CAMARA - 120)),
				z = rz * R_CAMARA + 60 + floor(hash2(rx, rz, s + 9302) * (R_CAMARA - 120)),
				y = F_CAMARA,
			})
		end
	end
	return res
end

local function construirCamarasPrueba(c)
	local bx, bz, d, s = c.bx, c.bz, c.datos, c.s
	for _, cm in E.camarasPruebaCerca(s, bx, bz, bx + CX - 1, bz + CZ - 1) do
		if bx + CX < cm.x - 47 or bx > cm.x + 47 or bz + CZ < cm.z - 47 or bz > cm.z + 47 then
			continue
		end
		local F = cm.y
		local function pon(x, y, z, b)
			if x < bx or x >= bx + CX or z < bz or z >= bz + CZ or y < 1 or y >= CY then
				return
			end
			wr(d, idx(x - bx, y, z - bz), b)
			if b == B.cofre then
				cofreReg(c, x, y, z, "camaraPrueba")
			end
		end
		local function sala(x0, z0, x1, z1, alto, techoLuz)
			for x = x0, x1 do
				for z = z0, z1 do
					for y = F - 1, F + alto do
						local borde = x == x0 or x == x1 or z == z0 or z == z1 or y == F - 1 or y == F + alto
						local b = 0
						if borde then
							b = B.ladrillosToba
							if y == F - 1 and (x + z) % 6 == 0 then
								b = B.cobreCortado
							end
							if y == F + alto and techoLuz and (x - x0) % 5 == 2 and (z - z0) % 5 == 2 then
								b = B.bombillaCobre
							end
							if y > F - 1 and y < F + alto and (y - F) % 4 == 3 then
								b = B.cobreCortado
							end
						end
						pon(x, y, z, b)
					end
				end
			end
		end
		local DIRS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }
		for _, u2 in DIRS do
			local ux, uz = u2[1], u2[2]
			for u = 9, 35 do
				for v = -3, 3 do
					for y = F - 1, F + 5 do
						local x, z = cm.x + ux * u + uz * v, cm.z + uz * u + ux * v
						local borde = abs(v) == 3 or y == F - 1 or y == F + 5
						pon(x, y, z, borde and ((y == F + 5 and v == 0 and u % 7 == 0) and B.bombillaCobre or (y == F - 1 and B.toba or B.ladrillosToba)) or 0)
					end
				end
			end
		end
		sala(cm.x - 9, cm.z - 9, cm.x + 9, cm.z + 9, 9, true)
		for _, u2 in DIRS do
			local ux, uz = u2[1], u2[2]
			for v = -2, 2 do
				for y = F, F + 4 do
					pon(cm.x + ux * 9 + uz * v, y, cm.z + uz * 9 + ux * v, 0)
				end
			end
		end
		pon(cm.x, F, cm.z, B.ladrillosToba)
		pon(cm.x, F + 1, cm.z, B.generadorPruebas)
		pon(cm.x - 6, F, cm.z - 7, B.boveda)
		pon(cm.x + 6, F, cm.z - 7, B.boveda)
		pon(cm.x, F, cm.z + 7, B.cofre)
		for _, o in { { -7, 6 }, { 7, 6 }, { -7, -4 }, { 7, -4 } } do
			pon(cm.x + o[1], F, cm.z + o[2], B.vasija)
		end
		for _, u2 in DIRS do
			local ux, uz = u2[1], u2[2]
			local rx, rz = cm.x + ux * 41, cm.z + uz * 41
			sala(rx - 6, rz - 6, rx + 6, rz + 6, 7, true)
			for v = -2, 2 do
				for y = F, F + 4 do
					pon(rx - ux * 6 + uz * v, y, rz - uz * 6 + ux * v, 0)
				end
			end
			pon(rx, F, rz, B.generadorPruebas)
			pon(rx + uz * 4 + ux * 4, F, rz + ux * 4 + uz * 4, B.boveda)
			if hash2(rx, rz, s + 9303) < 0.6 then
				pon(rx - uz * 4 + ux * 4, F, rz - ux * 4 + uz * 4, B.cofre)
			end
			pon(rx + 3, F, rz - 4, B.vasija)
			pon(rx - 4, F, rz + 3, B.vasija)
		end
	end
end

------------------------------------------------------------------
-- Monumentos oceánicos (final.js)
------------------------------------------------------------------
local R_MON = 448
function E.monumentoEn(gen, rx, rz)
	gen._mon = gen._mon or {}
	local k = rx .. "," .. rz
	local cache = gen._mon[k]
	if cache ~= nil then
		return cache or nil
	end
	local s = gen.semilla
	local res = false
	if hash2(rx, rz, s + 9800) < 0.6 then
		local x = rx * R_MON + 60 + floor(hash2(rx, rz, s + 9801) * (R_MON - 120))
		local z = rz * R_MON + 60 + floor(hash2(rx, rz, s + 9802) * (R_MON - 120))
		local ok, hmin = true, 999
		for _, q in { { 0, 0 }, { -18, -18 }, { 18, -18 }, { -18, 18 }, { 18, 18 } } do
			local h, bio = gen:infoColumna(x + q[1], z + q[2])
			if not esOceano(bio) or h > NIVEL_MAR - 12 then
				ok = false
			end
			hmin = min(hmin, h)
		end
		if ok then
			local F = max(hmin + 1, NIVEL_MAR - 24)
			res = { x = x, z = z, F = F, H = NIVEL_MAR - 2 - F }
		end
	end
	gen._mon[k] = res
	return res or nil
end
function E.monumentosCerca(gen, x0, z0, x1, z1)
	local res = {}
	for rx = floor((x0 - 24) / R_MON), floor((x1 + 24) / R_MON) do
		for rz = floor((z0 - 24) / R_MON), floor((z1 + 24) / R_MON) do
			local m = E.monumentoEn(gen, rx, rz)
			if m then
				table.insert(res, m)
			end
		end
	end
	return res
end

local function bloqueMonumento(dx, y, dz, M)
	local rel, ax, az, H = y - M.F, abs(dx), abs(dz), M.H
	if ax > 20 or az > 20 then
		return -1
	end
	if rel == -1 then
		return B.ladrillosPrismarina
	end
	if rel < 0 then
		return -1
	end
	local alaTecho, salaTecho = 8, min(H - 5, 14)
	local techo
	if ax <= 5 and az <= 5 then
		techo = H
	elseif ax <= 11 and az <= 16 then
		techo = salaTecho
	else
		techo = alaTecho
	end
	if rel > techo then
		return -1
	end
	local agua = y <= NIVEL_MAR and B.agua or 0
	if dz <= -15 and ax <= 2 and rel <= 4 then
		return agua
	end
	if ax <= 2 and az <= 2 and rel <= 2 then
		if dx >= -1 and dx <= 0 and dz >= -1 and dz <= 0 and rel <= 1 then
			return B.bloqueOro
		end
		return B.prismarinaOscura
	end
	local muro = (ax == 20 or az == 20) or (rel > alaTecho and ((ax == 11 and az <= 16) or (az == 16 and ax <= 11)))
		or (rel > salaTecho and ((ax == 5 and az <= 5) or (az == 5 and ax <= 5)))
	if rel == techo then
		if ((dx + dz) % 5 + 5) % 5 == 0 and (ax + az) % 2 == 0 then
			return B.farolMarino
		end
		return techo == H and B.prismarinaOscura or B.prismarina
	end
	if muro then
		if ax % 5 == 0 and az % 5 == 0 then
			return B.prismarinaOscura
		end
		if rel % 4 == 2 and (dx % 3 == 0 or dz % 3 == 0) and not (ax == 20 and az == 20) then
			return agua
		end
		return (rel + dx + dz) % 3 == 0 and B.ladrillosPrismarina or B.prismarina
	end
	if rel == 6 and ax <= 11 and az <= 16 and not (ax <= 3 and az <= 3) and not (dx % 7 == 0 and dz % 5 == 0) then
		return B.ladrillosPrismarina
	end
	if rel < techo and ax % 6 == 3 and az % 6 == 3 and ax <= 17 then
		return B.prismarinaOscura
	end
	if rel == techo - 1 and ax % 4 == 0 and az % 4 == 0 then
		return B.farolMarino
	end
	if rel == 7 and ax >= 13 and ax <= 16 and az <= 2 then
		return B.esponjaMojada
	end
	return agua
end

local function construirMonumentos(c)
	local bx, bz, d = c.bx, c.bz, c.datos
	for _, M in E.monumentosCerca(c.gen, bx, bz, bx + CX - 1, bz + CZ - 1) do
		if bx + CX < M.x - 21 or bx > M.x + 21 or bz + CZ < M.z - 21 or bz > M.z + 21 then
			continue
		end
		for x = max(bx, M.x - 20), min(bx + CX - 1, M.x + 20) do
			for z = max(bz, M.z - 20), min(bz + CZ - 1, M.z + 20) do
				local lx, lz = x - bx, z - bz
				for y = M.F - 1, M.F + M.H do
					local b = bloqueMonumento(x - M.x, y, z - M.z, M)
					if b >= 0 then
						wr(d, idx(lx, y, lz), b)
					end
				end
				local y = M.F - 2
				while y > M.F - 14 and y > 1 do
					local b = rd(d, idx(lx, y, lz))
					if b ~= 0 and not esLiquido(b) then
						break
					end
					wr(d, idx(lx, y, lz), B.prismarina)
					y -= 1
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Ruinas de sendero (v120.js)
------------------------------------------------------------------
local function ruinasSendero(c, hC)
	local datos, info, bx, bz, s = c.datos, c.info, c.bx, c.bz, c.s
	for x = 3, 12 do
		for z = 3, 12 do
			local borde = x == 3 or x == 12 or z == 3 or z == 12
			local h = info[z * CX + x + 1][1]
			for y = hC - 6, min(h, hC) - 1 do
				local k = hash3(bx + x, y, bz + z, s + 9701)
				local i = idx(x, y, z)
				if borde then
					wr(datos, i, k < 0.5 and B.ladrillosBarro or k < 0.8 and B.terracota or B.terracota2)
				else
					wr(datos, i, k < 0.14 and B.gravaSospechosa or k < 0.62 and B.grava or k < 0.66 and B.ladrillosBarro or B.tierra)
				end
			end
			if borde and hash2(bx + x, bz + z, s + 9702) < 0.45 then
				local alto = 1 + floor(hash2(bx + x, bz + z, s + 9703) * 3)
				for y = h + 1, h + alto do
					wr(datos, idx(x, y, z), hash3(bx + x, y, bz + z, s + 9704) < 0.7 and B.ladrillosBarro or B.terracota)
				end
			end
		end
	end
	wr(datos, idx(7, hC - 4, 8), B.vasija)
end

------------------------------------------------------------------
-- Minas abandonadas (completo.js)
------------------------------------------------------------------
local function minaAbandonada(c)
	local datos, cx, cz, s = c.datos, c.cx, c.cz, c.s
	local rx, rz = floor(cx / 5), floor(cz / 5)
	if hash2(rx, rz, s + 9950) > 0.22 then
		return
	end
	local Y = OY - 8 + floor(hash2(rx, rz, s + 9951) * 36)
	local bx, bz = c.bx, c.bz
	local function P(x, y, z, b)
		if x >= 0 and x < CX and z >= 0 and z < CZ and y > 0 and y < CY then
			wr(datos, idx(x, y, z), b)
		end
	end
	local conX = hash2(cx, cz, s + 9952) < 0.75
	local conZ = hash2(cx, cz, s + 9953) < 0.75
	local function pasillo(eje)
		for u = 0, 15 do
			for v = 7, 9 do
				local x, z = eje and u or v, eje and v or u
				for y = Y, Y + 2 do
					P(x, y, z, 0)
				end
				local suelo = rd(datos, idx(x, Y - 1, z))
				if suelo == 0 or esLiquido(suelo) then
					P(x, Y - 1, z, B.tablones)
				end
				if v == 8 and (eje and abs(z - 8) or abs(x - 8)) == 0 and u ~= 8 and hash3(bx + x, Y, bz + z, s + 9954) < 0.7 then
					P(x, Y, z, eje and 1261 or 1260)
				end
				if hash3(bx + x, Y + 2, bz + z, s + 9955) < 0.05 and v ~= 8 then
					P(x, Y + 2, z, B.telarana)
				end
			end
			if u % 4 == 2 then
				local a, b
				if eje then
					a, b = { u, 7 }, { u, 9 }
				else
					a, b = { 7, u }, { 9, u }
				end
				for y = Y, Y + 1 do
					P(a[1], y, a[2], B.valla)
					P(b[1], y, b[2], B.valla)
				end
				for v = 7, 9 do
					P(eje and u or v, Y + 2, eje and v or u, B.tablones)
				end
				if hash3(bx + u, Y, bz, s + 9956) < 0.12 then
					P(eje and u or 8, Y + 1, eje and 8 or u, B.antorcha)
				end
			end
		end
	end
	if conX then
		pasillo(true)
	end
	if conZ then
		pasillo(false)
	end
	if (conX or conZ) and hash2(cx, cz, s + 9957) < 0.3 then
		local x, z = conX and 4 or 9, conX and 9 or 4
		P(x, Y, z, B.cofre)
		cofreReg(c, bx + x, Y, bz + z, "mina")
	end
end

------------------------------------------------------------------
-- Iglús, templos, brujas, puestos y naufragios (completo.js)
------------------------------------------------------------------
function E.esPuestoAvanzada(s, cx, cz)
	return hash2(cx, cz, s + 9940) < 0.004
end

local function estructurasCompletoBase(c)
	local datos, cx, cz, bx, bz, s, info = c.datos, c.cx, c.cz, c.bx, c.bz, c.s, c.info
	minaAbandonada(c)
	local centro = info[8 * CX + 8 + 1]
	local hC, bio = centro[1], centro[2]
	local function P(x, y, z, b)
		if x >= 0 and x < CX and z >= 0 and z < CZ and y > 0 and y < CY then
			wr(datos, idx(x, y, z), b)
		end
	end
	local function cofre(x, y, z, t)
		P(x, y, z, B.cofre)
		cofreReg(c, bx + x, y, bz + z, t)
	end
	local function plano()
		local mn, mx = 999, 0
		for z = 3, 12 do
			for x = 3, 12 do
				local h = info[z * CX + x + 1][1]
				mn = min(mn, h)
				mx = max(mx, h)
			end
		end
		return mx - mn <= 3
	end
	if bio == BIOMA.nevado and hash2(cx, cz, s + 9900) < 0.035 and hC > NIVEL_MAR and plano() then
		for x = 3, 12 do
			for z = 3, 12 do
				local dx, dz = x - 7.5, z - 7.5
				for y = hC - 2, hC do
					P(x, y, z, B.bloqueNieve)
				end
				for y = hC + 1, hC + 5 do
					local d = hypot(dx, dz, (y - hC - 0.5) * 1.1)
					if d <= 4.6 and d > 3.5 then
						P(x, y, z, B.bloqueNieve)
					elseif d <= 3.5 then
						P(x, y, z, 0)
					end
				end
			end
		end
		for y = hC + 1, hC + 2 do
			P(7, y, 3, 0)
			P(7, y, 4, 0)
		end
		P(9, hC + 1, 9, B.cama)
		P(5, hC + 1, 9, B.mesa)
		P(9, hC + 1, 6, B.horno)
		P(5, hC + 1, 6, B.antorcha)
		for x = 6, 9 do
			for z = 6, 9 do
				if rd(datos, idx(x, hC + 1, z)) == 0 then
					P(x, hC + 1, z, ALFOMBRA(0))
				end
			end
		end
		cofre(6, hC + 1, 10, "iglu")
	elseif bio == BIOMA.jungla and hash2(cx, cz, s + 9910) < 0.008 and hC > NIVEL_MAR then
		local function piedra(x, y, z)
			return hash3(bx + x, y, bz + z, s + 9911) < 0.4 and B.rocaMusgo or B.roca
		end
		for x = 2, 13 do
			for z = 1, 14 do
				for y = hC - 3, hC do
					P(x, y, z, piedra(x, y, z))
				end
				for y = hC + 1, hC + 7 do
					local nivel = y - hC
					local m = nivel > 4 and 2 or 0
					local borde = x == 2 + m or x == 13 - m or z == 1 + m or z == 14 - m
					if nivel > 7 then
						continue
					end
					if x < 2 + m or x > 13 - m or z < 1 + m or z > 14 - m then
						continue
					end
					P(x, y, z, (borde or y == hC + 4 or y == hC + 7) and piedra(x, y, z) or 0)
				end
			end
		end
		for y = hC + 1, hC + 3 do
			P(7, y, 1, 0)
			P(8, y, 1, 0)
		end
		for x = 4, 11, 7 do
			for y = hC + 1, hC + 3 do
				P(x, y, 7, B.ladrillosPiedra)
			end
		end
		cofre(4, hC + 1, 12, "templo")
		cofre(11, hC + 5, 10, "templo")
		for _, q in { { 5, 4 }, { 10, 4 } } do
			P(q[1], hC + 1, q[2], B.antorcha)
		end
		for z = 3, 11, 2 do
			P(7, hC + 1, z, B.escaleraRoca)
		end
	elseif (bio == BIOMA.pantano or bio == BIOMA.manglar) and hash2(cx, cz, s + 9920) < 0.018 then
		local base = max(hC, NIVEL_MAR) + 3
		for _, q in { { 5, 5 }, { 10, 5 }, { 5, 10 }, { 10, 10 } } do
			for y = min(hC, NIVEL_MAR) - 1, base - 1 do
				P(q[1], y, q[2], B.troncoAbeto)
			end
		end
		for x = 5, 10 do
			for z = 5, 10 do
				P(x, base, z, B.tablonesAbeto)
				local borde = x == 5 or x == 10 or z == 5 or z == 10
				for y = base + 1, base + 3 do
					P(x, y, z, borde and ((y == base + 2 and (x == 7 or z == 7)) and B.panel or B.tablonesAbeto) or 0)
				end
				P(x, base + 4, z, B.losaAbeto)
			end
		end
		for x = 4, 11 do
			P(x, base + 4, 4, B.losaAbeto)
			P(x, base + 4, 11, B.losaAbeto)
		end
		for y = base + 1, base + 2 do
			P(7, y, 5, 0)
		end
		P(9, base + 1, 9, B.mesa)
		P(6, base + 1, 9, B.champinonRojo)
		P(9, base + 1, 6, B.farol)
		cofre(6, base + 1, 6, "bruja")
	elseif (bio == BIOMA.llanura or bio == BIOMA.sabana or bio == BIOMA.taiga or bio == BIOMA.desierto) and E.esPuestoAvanzada(s, cx, cz) and plano() then
		local t = hC + 1
		for x = 5, 10 do
			for z = 5, 10 do
				local borde = x == 5 or x == 10 or z == 5 or z == 10
				local esq = (x == 5 or x == 10) and (z == 5 or z == 10)
				for y = hC - 2, hC do
					P(x, y, z, B.roca)
				end
				for y = t, t + 14 do
					if y == t + 5 or y == t + 10 then
						P(x, y, z, B.tablonesAbeto)
					elseif y == t + 14 then
						P(x, y, z, borde and B.valla or 0)
					elseif esq then
						P(x, y, z, B.troncoAbeto)
					elseif borde then
						P(x, y, z, ((y - t) % 5 == 2 and (x == 7 or z == 7)) and 0 or B.tablonesAbeto)
					else
						P(x, y, z, 0)
					end
				end
				P(x, t + 13, z, borde and B.tablonesAbeto or B.losaAbeto)
			end
		end
		for y = t, t + 12 do
			P(9, y, 6, 146)
		end
		P(7, t + 5, 7, 0)
		P(9, t + 5, 6, 146)
		P(9, t + 10, 6, 146)
		cofre(6, t + 11, 9, "puesto")
		P(8, t + 11, 8, B.farol)
		P(6, t + 1, 6, B.farol)
		for y = t, t + 2 do
			P(7, y, 5, 0)
		end
	elseif (bio == BIOMA.playa or esOceano(bio)) and hash2(cx, cz, s + 9930) < 0.012 and hC <= NIVEL_MAR + 1 and hC > NIVEL_MAR - 14 then
		local y0 = hC + 1
		local roto = hash2(cx, cz, s + 9931) < 0.5
		local madera = ({ B.tablones, B.tablonesAbeto, B.tablonesJungla })[floor(hash2(cx, cz, s + 9932) * 3) + 1]
		for x = 1, 14 do
			local f = min(x - 1, 14 - x)
			local ancho = min(3, 1 + floor(f / 1.5))
			for z = 8 - ancho, 8 + ancho do
				if roto and x > 10 and hash3(bx + x, 0, bz + z, s + 9933) < 0.6 then
					continue
				end
				P(x, y0, z, madera)
				local borde = z == 8 - ancho or z == 8 + ancho
				for y = y0 + 1, y0 + 2 do
					if borde and not (roto and hash3(bx + x, y, bz + z, s + 9934) < 0.3) then
						P(x, y, z, madera)
					elseif not borde then
						P(x, y, z, y <= NIVEL_MAR and B.agua or 0)
					end
				end
				if x >= 3 and x <= 12 and not borde then
					P(x, y0 + 3, z, x % 3 == 0 and 0 or madera)
				end
			end
		end
		for y = y0 + 1, y0 + 7 do
			P(7, y, 8, B.troncoAbeto)
		end
		cofre(3, y0 + 1, 8, "naufragio")
		cofre(11, y0 + 1, 8, "naufragio")
	end
end

------------------------------------------------------------------
-- Pirámides del desierto de 21 × 21 (v26.js)
------------------------------------------------------------------
function E.piramideEnRegion(gen, rx, rz)
	gen._pir = gen._pir or {}
	local k = rx .. "," .. rz
	local cache = gen._pir[k]
	if cache ~= nil then
		return cache or nil
	end
	local s = gen.semilla
	local res = false
	if hash2(rx, rz, s + 9810) < 0.5 then
		local x = rx * 256 + 30 + floor(hash2(rx, rz, s + 9811) * 190)
		local z = rz * 256 + 30 + floor(hash2(rx, rz, s + 9812) * 190)
		local ok, hs = true, {}
		for _, q in { { 10, 10 }, { 0, 0 }, { 20, 0 }, { 0, 20 }, { 20, 20 } } do
			local h, bio = gen:infoColumna(x + q[1], z + q[2])
			if bio ~= BIOMA.desierto then
				ok = false
			end
			table.insert(hs, h)
		end
		if ok and math.max(table.unpack(hs)) - math.min(table.unpack(hs)) <= 4 then
			res = { x = x, z = z, y = hs[1] }
		end
	end
	gen._pir[k] = res
	return res or nil
end
function E.piramidesCerca(gen, x, z)
	local rx, rz = floor(x / 256), floor(z / 256)
	local r = {}
	for a = -1, 1 do
		for b = -1, 1 do
			local p = E.piramideEnRegion(gen, rx + a, rz + b)
			if p then
				table.insert(r, p)
			end
		end
	end
	return r
end

local function bloquePiramide(dx, y, dz, h)
	local A, C = B.arenisca, BR.areniscaCortada or B.arenisca
	local N, Z = B.terracota0, HORMIGON(11)
	local R = h - 14
	local ry = y - h
	local torre = dz <= 4 and (dx <= 4 or dx >= 16)
	if torre then
		local tx = dx <= 4 and dx or dx - 16
		local borde = tx == 0 or tx == 4 or dz == 0 or dz == 4
		if ry < 0 and ry >= -4 then
			return A
		end
		if ry >= 0 and ry <= 12 then
			if ry == 12 then
				return (borde and (tx + dz) % 2 == 0) and (BR.losaArenisca or C) or (borde and 0 or C)
			end
			if not borde then
				return ry == 0 and A or 0
			end
			if dz == 0 and tx == 2 and ry >= 6 and ry <= 10 then
				return ry == 8 and Z or N
			end
			if dz == 0 and (tx == 1 or tx == 3) and ry == 8 then
				return N
			end
			if ry == 11 or ry == 5 then
				return C
			end
			if dz == 4 and tx == 2 and ry >= 1 and ry <= 2 then
				return 0
			end
			return A
		end
		return -1
	end
	if ry < 0 and ry >= -4 then
		return A
	end
	if ry >= 0 and ry <= 10 then
		local L = ry
		local dentro = dx >= L and dx <= 20 - L and dz >= L and dz <= 20 - L
		if not dentro then
			return -1
		end
		local borde = dx == L or dx == 20 - L or dz == L or dz == 20 - L
		if L == 0 then
			if dx == 10 and dz == 10 then
				return 0
			end
			local ax, az = abs(dx - 10), abs(dz - 10)
			if ax + az <= 1 then
				return Z
			end
			if (ax == 0 or az == 0) and ax + az <= 3 then
				return N
			end
			if ax == az and ax <= 2 then
				return N
			end
			return A
		end
		if borde then
			if dz == L and dx >= 9 and dx <= 11 and ry >= 1 and ry <= 3 then
				return 0
			end
			if dz == L and (dx == 8 or dx == 12) and ry <= 4 then
				return N
			end
			if dz == L and dx >= 8 and dx <= 12 and ry == 4 then
				return C
			end
			if (dx == L or dx == 20 - L) and dz >= 9 and dz <= 11 and ry >= 1 and ry <= 2 and L == 1 then
				return 0
			end
			return L % 3 == 2 and C or A
		end
		if ry <= 4 and (dx == 6 or dx == 14) and (dz == 6 or dz == 14) then
			return C
		end
		return 0
	end
	if y < h and y > R + 4 and dx == 10 and dz == 10 then
		return 0
	end
	if y >= R - 2 and y <= R + 4 and dx >= 6 and dx <= 14 and dz >= 6 and dz <= 14 then
		local borde = dx == 6 or dx == 14 or dz == 6 or dz == 14
		if y == R - 1 and dx >= 9 and dx <= 11 and dz >= 9 and dz <= 11 then
			return B.tnt
		end
		if y <= R or y == R + 4 then
			return y == R and (((abs(dx - 10) + abs(dz - 10)) % 3 == 0) and N or A) or A
		end
		if borde then
			return (y == R + 2 and (dx == 10 or dz == 10)) and N or C
		end
		if y == R + 1 and dx == 10 and dz == 10 then
			return B.placa
		end
		if y == R + 1 and ((dx == 10 and (dz == 7 or dz == 13)) or (dz == 10 and (dx == 7 or dx == 13))) then
			return B.cofre
		end
		return 0
	end
	return -1
end

local function construirPiramides(c)
	local bx, bz, d, s = c.bx, c.bz, c.datos, c.s
	for _, p in E.piramidesCerca(c.gen, bx + 8, bz + 8) do
		if p.x > bx + CX or p.x + 20 < bx or p.z > bz + CZ or p.z + 20 < bz then
			continue
		end
		for lx = 0, CX - 1 do
			for lz = 0, CZ - 1 do
				local dx, dz = bx + lx - p.x, bz + lz - p.z
				if dx < 0 or dx > 20 or dz < 0 or dz > 20 then
					continue
				end
				for y = p.y - 20, p.y + 13 do
					if y < 1 or y >= CY then
						continue
					end
					local b = bloquePiramide(dx, y, dz, p.y)
					if b < 0 then
						continue
					end
					wr(d, idx(lx, y, lz), b)
					if b == B.cofre then
						cofreReg(c, bx + lx, y, bz + lz, "piramide")
					end
				end
				if dx >= 3 and dx <= 17 and dz >= 6 and dz <= 17 and hash2(bx + lx, bz + lz, s + 9813) < 0.05 and rd(d, idx(lx, p.y, lz)) == B.arenisca then
					wr(d, idx(lx, p.y, lz), B.arenaSospechosa)
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Estructuras pequeñas de estructuras27.js
------------------------------------------------------------------
local function estructuras27(c)
	local datos, cx, cz, bx, bz, info = c.datos, c.cx, c.cz, c.bx, c.bz, c.info
	local s = c.s + 27000
	local function P(x, y, z, b)
		if x >= 0 and x < CX and z >= 0 and z < CZ and y > 0 and y < CY then
			wr(datos, idx(x, y, z), b)
		end
	end
	local function G(x, y, z)
		if x >= 0 and x < CX and z >= 0 and z < CZ and y > 0 and y < CY then
			return rd(datos, idx(x, y, z))
		end
		return 0
	end
	local function cofre(x, y, z, t)
		P(x, y, z, B.cofre)
		cofreReg(c, bx + x, y, bz + z, t)
	end
	local centro = info[8 * CX + 8 + 1]
	local hC, bio = centro[1], centro[2]
	local r = mulberry32(floor(hash2(cx, cz, s) * 4294967296))
	-- Roca del bosque
	if (bio == BIOMA.taiga or bio == BIOMA.taigaNevada) and r() < 0.12 then
		local x0, z0 = 3 + floor(r() * 10), 3 + floor(r() * 10)
		local h = info[z0 * CX + x0 + 1][1]
		for dx = -2, 2 do
			for dz = -2, 2 do
				for dy = 0, 2 do
					if dx * dx + dz * dz + dy * dy * 1.4 <= 4.5 + r() then
						P(x0 + dx, h + dy, z0 + dz, r() < 0.75 and B.rocaMusgo or B.roca)
					end
				end
			end
		end
	end
	-- Geoda de amatista
	if hash2(cx, cz, s + 1) < 0.035 then
		local cy = OY + 14 + floor(hash2(cx, cz, s + 2) * 40)
		if cy < hC - 10 then
			local brotes = { B.racimoAmatista, B.broteAmatistaGrande, B.broteAmatistaMediano, B.broteAmatistaPequeno }
			for x = 2, 13 do
				for z = 2, 13 do
					for y = cy - 6, cy + 6 do
						local d = hypot(x - 7.5, (y - cy) * 1.1, z - 7.5) + (hash3(bx + x, y, bz + z, s + 3) - 0.5) * 0.6
						if d > 5.6 then
							continue
						end
						if d > 5 then
							P(x, y, z, B.basaltoLiso)
						elseif d > 4.2 then
							P(x, y, z, B.calcita)
						elseif d > 3.4 then
							P(x, y, z, hash3(bx + x, y, bz + z, s + 4) < 0.1 and B.amatistaBrotante or B.bloqueAmatista)
						else
							local h = hash3(bx + x, y, bz + z, s + 5)
							P(x, y, z, (d > 2.6 and h < 0.18) and brotes[floor(h * 22) % 4 + 1] or 0)
						end
					end
				end
			end
		end
	end
	-- Fósiles
	if (bio == BIOMA.desierto or bio == BIOMA.pantano) and hash2(cx, cz, s + 6) < 0.03 then
		local y0 = hC - 10 - floor(r() * 8)
		local eje = r() < 0.5
		local largo = 6 + floor(r() * 4)
		for k = 0, largo - 1 do
			local x, z = eje and 4 + k or 8, eje and 8 or 4 + k
			P(x, y0, z, B.bloqueHueso)
			if k % 2 == 0 then
				for a = 1, 3 do
					local ox, oz = eje and 0 or a, eje and a or 0
					P(x + ox, y0 + min(a, 2), z + oz, B.bloqueHueso)
					P(x - ox, y0 + min(a, 2), z - oz, B.bloqueHueso)
				end
			end
			if r() < 0.12 then
				P(x, y0 - 1, z, B.menaCarbon)
			end
		end
	end
	-- Tesoro enterrado
	if bio == BIOMA.playa and hash2(cx, cz, s + 7) < 0.05 then
		local x, z = 4 + floor(r() * 8), 4 + floor(r() * 8)
		local h = info[z * CX + x + 1][1]
		for y = h - 3, h do
			if G(x, y, z) ~= 0 then
				P(x, y, z, B.arena)
			end
		end
		cofre(x, h - 2, z, "tesoroEnterrado")
	end
	-- Ruinas oceánicas
	if esOceano(bio) and hash2(cx, cz, s + 8) < 0.04 then
		local calida = bio == BIOMA.oceanoCalido
		local x0, z0 = 3, 3
		local w = 5 + floor(r() * 4)
		local p = 5 + floor(r() * 4)
		local fondo = hC
		while fondo > 2 and (esAgua(G(8, fondo, 8)) or G(8, fondo, 8) == 0) do
			fondo -= 1
		end
		local AC = BR.areniscaCortada or B.arenisca
		local LA = BR.ladrillosAgrietados or B.rocaMusgo
		local function mat()
			if calida then
				return r() < 0.7 and B.arenisca or AC
			end
			if r() < 0.5 then
				return B.ladrillosPiedra
			end
			return r() < 0.5 and B.ladrillosMusgo or LA
		end
		for x = x0, x0 + w - 1 do
			for z = z0, z0 + p - 1 do
				P(x, fondo, z, mat())
				local borde = x == x0 or x == x0 + w - 1 or z == z0 or z == z0 + p - 1
				if borde then
					for y = fondo + 1, fondo + 3 do
						if r() < 0.62 - (y - fondo) * 0.12 then
							P(x, y, z, mat())
						end
					end
				end
			end
		end
		if r() < 0.7 then
			cofre(x0 + 1, fondo + 1, z0 + 1, "ruinasOceano")
		end
		local CORALES = { "tubo", "cerebro", "burbuja", "fuego", "cuerno" }
		for k = 0, 5 do
			local x, z = floor(r() * 16), floor(r() * 16)
			local y = hC
			while y > 2 and (esAgua(G(x, y, z)) or G(x, y, z) == 0) do
				y -= 1
			end
			if esAgua(G(x, y + 1, z)) then
				P(x, y + 1, z, calida and BR["coral_" .. CORALES[k % 5 + 1]] or B.alga)
			end
		end
	end
	-- Sótano del iglú
	if bio == BIOMA.nevado and hash2(cx, cz, c.s + 9900) < 0.035 and hC > NIVEL_MAR and hash2(cx, cz, s + 9) < 0.5 and G(9, hC + 1, 9) == B.cama then
		local fondo = hC - 9
		for y = fondo + 1, hC do
			P(7, y, 7, 0)
			P(7, y, 6, B.piedra)
			P(8, y, 7, B.escaleraMano + 2)
		end
		for x = 3, 12 do
			for z = 3, 12 do
				for y = fondo - 4, fondo do
					local borde = x == 3 or x == 12 or z == 3 or z == 12 or y == fondo - 4 or y == fondo
					P(x, y, z, borde and (r() < 0.3 and B.rocaMusgo or B.ladrillosPiedra) or 0)
				end
			end
		end
		P(7, fondo, 7, 0)
		P(5, fondo - 3, 5, B.soporte)
		cofre(9, fondo - 3, 5, "igluSotano")
		P(6, fondo - 3, 9, B.antorcha)
		P(10, fondo - 3, 9, B.antorcha)
		for _, x0 in { 4, 9 } do
			for x = x0, x0 + 2 do
				for y = fondo - 3, fondo - 1 do
					P(x, y, 11, B.valla)
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Mansiones del bosque (estructuras27.js)
------------------------------------------------------------------
local MANS_W, MANS_P = 32, 24
function E.mansionEn(gen, rx, rz)
	local s = gen.semilla + 27500
	if hash2(rx, rz, s) > 0.5 then
		return nil
	end
	local x = rx * 480 + 80 + floor(hash2(rx, rz, s + 1) * 320)
	local z = rz * 480 + 80 + floor(hash2(rx, rz, s + 2) * 320)
	gen._mans = gen._mans or {}
	local k = rx .. "," .. rz
	local cache = gen._mans[k]
	if cache == nil then
		local h, bio = gen:infoColumna(x + 16, z + 12)
		cache = (bio == BIOMA.bosqueOscuro and h > NIVEL_MAR) and { x = x, z = z, y = h + 1 } or false
		gen._mans[k] = cache
	end
	return cache or nil
end
function E.mansionesCerca(gen, x, z)
	local rx, rz = floor(x / 480), floor(z / 480)
	local res = {}
	for a = -1, 1 do
		for b = -1, 1 do
			local m = E.mansionEn(gen, rx + a, rz + b)
			if m then
				table.insert(res, m)
			end
		end
	end
	return res
end

local function bloqueMansion(lx, y, lz, M, cofres, s)
	local y0 = M.y
	local rel = y - y0
	if rel < 0 then
		return y >= y0 - 4 and B.roca or -1
	end
	local piso = floor(rel / 6)
	local ry = rel % 6
	if piso >= 3 then
		local L = rel - 18
		if L > 6 then
			return -1
		end
		local bordeX = min(lx, MANS_W - 1 - lx)
		local bordeZ = min(lz, MANS_P - 1 - lz)
		local m = min(bordeX, bordeZ)
		if m < L then
			return -1
		end
		if m == L or L == 6 then
			return B.tablonesRobleOscuro
		end
		return 0
	end
	local perim = lx == 0 or lx == MANS_W - 1 or lz == 0 or lz == MANS_P - 1
	if ry == 0 then
		return piso == 0 and B.roca or B.tablonesRobleOscuro
	end
	if perim then
		local esquina = (lx % 6 == 0 or lx == MANS_W - 1) and (lz % 6 == 0 or lz == MANS_P - 1)
		if esquina then
			return B.troncoRobleOscuro
		end
		if piso == 0 and lz == 0 and (lx == 15 or lx == 16) and ry <= 3 then
			return 0
		end
		if (ry == 2 or ry == 3) and (lx % 6 == 3 or lz % 6 == 3) then
			return B.panel
		end
		return piso == 0 and B.roca or B.tablonesRobleOscuro
	end
	if (lx == 10 or lx == 21) and not (lz % 8 == 4 and ry <= 2) then
		return B.tablonesRobleOscuro
	end
	if lz == 12 and not (lx % 10 == 5 and ry <= 2) then
		return B.tablonesRobleOscuro
	end
	if ry == 1 then
		if piso == 1 and lx > 10 and lx < 21 then
			return ALFOMBRA(14)
		end
		if piso == 2 and lz < 12 and lx < 10 and (lx + lz) % 7 == 0 then
			return B.estanteria
		end
		local h = hash3(M.x + lx, y, M.z + lz, s + 27501)
		if h < 0.012 then
			table.insert(cofres, { lx, y, lz })
			return B.cofre
		end
		if h < 0.03 then
			return B.antorcha
		end
	end
	return 0
end

local function estampaMansiones(c)
	local bx, bz, d = c.bx, c.bz, c.datos
	for _, M in E.mansionesCerca(c.gen, bx + 8, bz + 8) do
		if bx + CX <= M.x or bx >= M.x + MANS_W or bz + CZ <= M.z or bz >= M.z + MANS_P then
			continue
		end
		local cofresM = {}
		for x = max(bx, M.x), min(bx + CX, M.x + MANS_W) - 1 do
			for z = max(bz, M.z), min(bz + CZ, M.z + MANS_P) - 1 do
				local y = M.y - 4
				while y <= M.y + 25 and y < CY do
					local b = bloqueMansion(x - M.x, y, z - M.z, M, cofresM, c.s)
					if b >= 0 then
						wr(d, idx(x - bx, y, z - bz), b)
					end
					y += 1
				end
			end
		end
		for _, q in cofresM do
			cofreReg(c, M.x + q[1], q[2], M.z + q[3], "mansion")
		end
	end
end

------------------------------------------------------------------
-- Decoración de biomas y cuevas (biomas27.js)
------------------------------------------------------------------
local function decorarBiomas(c)
	local datos, bx, bz = c.datos, c.bx, c.bz
	local s = c.s + 31000
	local function G(x, y, z)
		return rd(datos, idx(x, y, z))
	end
	local function P(x, y, z, b)
		if b and x >= 0 and x < CX and z >= 0 and z < CZ and y > 0 and y < CY then
			wr(datos, idx(x, y, z), b)
		end
	end
	local function cima(x, z)
		for y = CY - 2, 2, -1 do
			local b = G(x, y, z)
			if b ~= 0 and not esHojas(b) and not esLiquido(b) and BL[b].forma ~= "cruz" and not esTronco(b) then
				return y
			end
		end
		return 0
	end
	local FLORES = {}
	for _, k in { "florAmarilla", "florRoja", "aciano", "margarita", "orquidea", "floresSilvestres", "girasol" } do
		if BR[k] then
			table.insert(FLORES, BR[k])
		end
	end
	local agujas = {}
	for _, col in { "naranja", "amarillo", "blanco", "marron", "rojo", "grisClaro" } do
		if BR["terracota_" .. col] then
			table.insert(agujas, BR["terracota_" .. col])
		end
	end
	local CORALES = { "tubo", "cerebro", "burbuja", "fuego", "cuerno" }
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local bio = buffer.readu8(c.bioma, z * CX + x)
			local wx, wz = bx + x, bz + z
			local r, r2 = hash2(wx, wz, s), hash2(wx, wz, s + 1)
			local y = cima(x, z)
			if y == 0 then
				continue
			end
			local sup = G(x, y, z)
			local libre = G(x, y + 1, z) == 0
			if bio == BIOMA.champinones and sup == B.micelio and libre and r < 0.05 then
				P(x, y + 1, z, r2 < 0.5 and B.champinonRojo or B.champinonMarron)
			elseif bio == BIOMA.bosqueFlores and sup == B.cesped and libre and r < 0.3 then
				P(x, y + 1, z, FLORES[floor(r2 * #FLORES) + 1])
			elseif bio == BIOMA.llanuraGirasoles and sup == B.cesped and libre and r < 0.09 then
				P(x, y + 1, z, B.girasol)
			elseif bio == BIOMA.junglaBambu and (sup == B.cesped or sup == B.podzol) and libre and r < 0.16 then
				local h = 4 + floor(r2 * 10)
				local k = 1
				while k <= h and G(x, y + k, z) == 0 do
					P(x, y + k, z, B.bambu)
					k += 1
				end
			elseif bio == BIOMA.espigasHielo and r < 0.004 and x > 1 and x < 14 and z > 1 and z < 14 then
				local alto = 8 + floor(r2 * 22)
				local grosor = r2 > 0.7 and 2 or 1
				for k = 0, alto - 1 do
					local g = k < alto * 0.3 and grosor or k < alto * 0.7 and min(1, grosor) or 0
					for a = -g, g do
						for b = -g, g do
							if abs(a) + abs(b) <= g then
								P(x + a, y + 1 + k, z + b, B.hieloCompacto)
							end
						end
					end
				end
			elseif bio == BIOMA.badlandsErosionados and r < 0.006 and x > 0 and x < 15 and z > 0 and z < 15 then
				local alto = 10 + floor(r2 * 20)
				for k = 1, alto do
					local b = agujas[floor((y + k) / 2) % #agujas + 1] or B.terracota
					P(x, y + k, z, b)
					if k < alto * 0.5 then
						P(x + 1, y + k, z, b)
						P(x, y + k, z + 1, b)
					end
				end
			elseif bio == BIOMA.taigaGigante and sup == B.podzol and libre and r < 0.03 then
				P(x, y + 1, z, BR.helecho or B.hierbaAlta)
			end
			-- Océanos
			if esOceano(bio) and esAgua(G(x, y + 1, z)) and G(x, y + 2, z) ~= 0 and esAgua(G(x, y + 2, z)) then
				if bio == BIOMA.oceanoCalido then
					local rv = fbm(wx * 0.08, wz * 0.08, s + 5, 2)
					if rv > 0.52 then
						local k = floor(hash2(wx // 4, wz // 4, s + 6) * 5)
						local t = CORALES[k + 1]
						P(x, y, z, BR["bloqueCoral_" .. t])
						if r < 0.35 then
							P(x, y + 1, z, r2 < 0.5 and BR["coral_" .. t] or BR["abanicoCoral_" .. t])
						elseif r < 0.4 then
							P(x, y + 1, z, B.pepinoMar)
						end
						if r > 0.9 and esAgua(G(x, y + 2, z)) then
							P(x, y + 1, z, BR["bloqueCoral_" .. t])
							if esAgua(G(x, y + 3, z)) then
								P(x, y + 2, z, BR["coral_" .. t])
							end
						end
					elseif r < 0.2 then
						P(x, y + 1, z, B.pastoMarino)
					end
				elseif bio ~= BIOMA.oceanoHelado or r > 0.5 then
					if r < 0.06 then
						local prof = NIVEL_MAR - y
						local alto = max(1, floor(prof * (0.4 + r2 * 0.5)))
						local k = 1
						while k <= alto and esAgua(G(x, y + k, z)) do
							P(x, y + k, z, B.alga)
							k += 1
						end
					elseif r < 0.22 then
						P(x, y + 1, z, B.pastoMarino)
					end
				end
			end
		end
	end
	-- Cuevas frondosas y de espeleotemas
	local nc = fbm((bx + 8) * 0.006, (bz + 8) * 0.006, s + 7, 2)
	local tipo = nc > 0.63 and "frondosa" or nc < 0.35 and "espeleotema" or nil
	if not tipo then
		return
	end
	local PI, PZ, AN, DI, GR, TO = B.piedra, B.pizarra, B.andesita, B.diorita, B.granito, B.toba
	local function piedra(q)
		return q == PI or q == PZ or q == AN or q == DI or q == GR or q == TO
	end
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local wx, wz = bx + x, bz + z
			local techo = cima(x, z) - 8
			for y = 4, techo - 1 do
				local b = G(x, y, z)
				if b ~= 0 then
					continue
				end
				local abajo, arriba = G(x, y - 1, z), G(x, y + 1, z)
				local h = hash3(wx, y, wz, s + 8)
				if tipo == "frondosa" then
					if piedra(abajo) then
						P(x, y - 1, z, h < 0.12 and B.arcilla or B.bloqueMusgo)
						if h > 0.93 then
							P(x, y, z, h > 0.985 and B.azaleaFlorida or B.azalea)
						elseif h > 0.8 then
							P(x, y, z, B.alfombraMusgo)
						end
					elseif piedra(arriba) then
						if h < 0.5 then
							P(x, y + 1, z, B.bloqueMusgo)
						end
						if h > 0.97 then
							P(x, y, z, B.floresEsporas)
						elseif h > 0.86 then
							P(x, y, z, B.raicesColgantes)
						end
					end
				else
					if piedra(abajo) then
						if h < 0.45 then
							P(x, y - 1, z, B.bloqueEspeleotema)
						end
						if h > 0.9 then
							P(x, y, z, B.espeleotema)
						end
					elseif piedra(arriba) then
						if h < 0.45 then
							P(x, y + 1, z, B.bloqueEspeleotema)
						end
						if h > 0.88 then
							P(x, y, z, B.espeleotema)
						end
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Desgaste (estructuras28.js)
------------------------------------------------------------------
function E.desgastar(datos, cx, cz, semilla, sub)
	local s = semilla + 28000
	local bx, bz = cx * CX, cz * CZ
	local LP, LM, LA, R, RM, TEL, LN = B.ladrillosPiedra, B.ladrillosMusgo, BR.ladrillosAgrietados, B.roca, B.rocaMusgo, BR.telarana, B.ladrilloNether
	local LNA = BR.ladrillosNetherAgrietados
	local TA, VA = B.tablones, B.valla
	local bajo = NIVEL_MAR - 6
	for y = 1, CY - 2 do
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				local i = idx(x, y, z)
				local b = rd(datos, i)
				if b == 0 then
					continue
				end
				local h = hash3(bx + x, y, bz + z, s)
				if b == LP then
					if h < 0.14 then
						wr(datos, i, LM)
					elseif h < 0.24 and LA then
						wr(datos, i, LA)
					end
				elseif b == R and sub and y < bajo then
					if h < 0.18 then
						wr(datos, i, RM)
					end
				elseif b == LN and LNA and h < 0.08 then
					wr(datos, i, LNA)
				end
				if sub and TEL and y < bajo and (b == TA or b == VA) and h > 0.965 then
					local a = idx(x, y - 1, z)
					if y > 1 and rd(datos, a) == 0 then
						wr(datos, a, TEL)
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- generarV120 y la cadena completa
------------------------------------------------------------------
local function generarV120(c)
	local datos, cx, cz, bx, bz, s, info = c.datos, c.cx, c.cz, c.bx, c.bz, c.s, c.info
	if not ROCA_SCULK then
		ROCA_SCULK = { [B.pizarra] = true, [B.piedra] = true, [B.granito] = true, [B.diorita] = true, [B.andesita] = true, [B.grava] = true, [B.tierra] = true }
	end
	local hay = false
	local mask = table.create(256, false)
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			if esDeepDark(s, bx + x, bz + z) then
				mask[z * CX + x + 1] = true
				hay = true
			end
		end
	end
	if hay then
		local r = mulberry32(floor(hash2(cx, cz, s + 8801) * 4294967296))
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				if not mask[z * CX + x + 1] then
					continue
				end
				local wx, wz = bx + x, bz + z
				for y = 6, OY - 3 do
					local i = idx(x, y, z)
					if not ROCA_SCULK[rd(datos, i)] then
						continue
					end
					local arriba, abajo = rd(datos, idx(x, y + 1, z)), rd(datos, idx(x, y - 1, z))
					local v = valueNoise3(wx / 7, y / 7, wz / 7, s + 8802)
					if arriba == 0 then
						if v > 0.42 then
							wr(datos, i, B.sculk)
							local p = r()
							if p < 0.012 then
								wr(datos, idx(x, y + 1, z), B.sensorSculk)
							elseif p < 0.0155 then
								wr(datos, idx(x, y + 1, z), B.chillador)
							elseif p < 0.017 then
								wr(datos, i, B.catalizador)
							end
						elseif v > 0.35 then
							wr(datos, idx(x, y + 1, z), B.vetaSculk)
						end
					elseif abajo == 0 and v > 0.5 then
						wr(datos, i, B.sculk)
					end
				end
			end
		end
	end
	construirCiudadesAntiguas(c)
	construirCamarasPrueba(c)
	construirMonumentos(c)
	local centro = info[8 * CX + 8 + 1]
	local hC = centro[1]
	local pozo = centro[2] == BIOMA.desierto and hash2(cx, cz, s + 960) < 0.01
	if pozo then
		for _, q in { { 7, 7 }, { 9, 9 }, { 7, 9 }, { 9, 7 } } do
			if hash2(bx + q[1], bz + q[2], s + 961) < 0.6 then
				wr(datos, idx(q[1], hC - 1, q[2]), B.arenaSospechosa)
			end
		end
	end
	-- (La pirámide pequeña la sustituye la de 21×21 de v26.js)
	local b = centro[2]
	if (b == BIOMA.taiga or b == BIOMA.jungla or b == BIOMA.bosque or b == BIOMA.abedul or b == BIOMA.cerezo or b == BIOMA.bosqueOscuro or b == BIOMA.taigaNevada)
		and hash2(cx, cz, s + 9700) < 0.007 and hC > NIVEL_MAR + 1 then
		ruinasSendero(c, hC)
	end
	-- estructurasCompleto con sus añadidos (v26.js y estructuras27.js)
	estructurasCompletoBase(c)
	construirPiramides(c)
	estructuras27(c)
	estampaMansiones(c)
end

-- Todo lo que el juego web añade después del terreno de la Superficie
function E.superficie(gen, datos, cx, cz, info, biomasCh)
	local c = {
		gen = gen, s = gen.semilla, datos = datos, cx = cx, cz = cz, bx = cx * CX, bz = cz * CZ,
		info = info, bioma = biomasCh, cofres = {},
	}
	estructurasSuperficie(c)
	generarV120(c)
	decorarBiomas(c)
	E.desgastar(datos, cx, cz, gen.semilla, true)
	return c.cofres
end

return E
