--!native
--!optimize 2
--[[
	Blockverse para Roblox · Generador del mundo
	Traducción a Luau de mundo.js del juego web: infoColumna (alturas,
	32 biomas, ríos, islas de champiñones), cuevas, vetas de mineral,
	los 13 tipos de árbol, lagos y la vegetación. Con la misma semilla
	sale el mismo terreno que en la versión web.
	Datos de un chunk: buffer de 16 × 16 × 192 enteros de 16 bits,
	índice = x + z * 16 + y * 256 (igual que en el juego web).
]]
local Registro = require(script.Parent.Registro)
local Ruido = require(script.Parent.Ruido)
local Biomas = require(script.Parent.Datos.Biomas)
local Estructuras = require(script.Parent.Estructuras)
local Dimensiones = require(script.Parent.Dimensiones)
local Arenas = require(script.Parent.Arenas)

local hash2, hash3, mulberry32 = Ruido.hash2, Ruido.hash3, Ruido.mulberry32
local valueNoise, valueNoise3, fbm, smooth = Ruido.valueNoise, Ruido.valueNoise3, Ruido.fbm, Ruido.smooth
local clamp, lerp, redondear = Ruido.clamp, Ruido.lerp, Ruido.redondear
local floor, ceil, abs, sqrt, sin, cos, pi = math.floor, math.ceil, math.abs, math.sqrt, math.sin, math.cos, math.pi

local CO = Biomas.constantes
local CX, CZ, CY, OY, NIVEL_MAR = CO.CX, CO.CZ, CO.CY, CO.OY, CO.NIVEL_MAR
local BIOMA = Biomas.claves
local B = setmetatable({}, {
	__index = function(_, k)
		local v = Registro.B[k]
		if v == nil then
			error("Generador: falta el bloque " .. tostring(k))
		end
		return v
	end,
})
local SOLIDO, OPACO, REEMPL = Registro.SOLIDO, Registro.OPACO, Registro.REEMPL
local esHojas, esTronco, esAgua = Registro.esHojas, Registro.esTronco, Registro.esAgua
local DIRF = Registro.DIRF

local Generador = {}
Generador.__index = Generador
Generador.CX, Generador.CZ, Generador.CY, Generador.OY, Generador.NIVEL_MAR = CX, CZ, CY, OY, NIVEL_MAR
Generador.BIOMA = BIOMA

local function idx(x, y, z)
	return x + z * CX + y * CX * CZ
end
Generador.idx = idx
local function rd(d, i)
	return buffer.readu16(d, i * 2)
end
local function wr(d, i, v)
	buffer.writeu16(d, i * 2, v)
end
Generador.leer, Generador.escribir = rd, wr

local function esOceano(b)
	return b == 0 or b == 21 or b == 22 or b == 29
end
local function esBiomaFrio(b)
	return b == 5 or b == 18 or b == 20 or b == 22 or b == 25
end
local function esBadlands(b)
	return b == 12 or b == 27
end
Generador.esOceano, Generador.esBiomaFrio, Generador.esBadlands = esOceano, esBiomaFrio, esBadlands

function Generador.new(semilla)
	local self = setmetatable({}, Generador)
	self.semilla = semilla
	-- Rejillas de cuevas (como _rejA y _rejV)
	self.GR = 4
	self.GNY = CY // 4 + 1
	self.rejA = table.create(25 * self.GNY, 0)
	self.rejV = table.create(25 * self.GNY, 0)
	return self
end

------------------------------------------------------------------
-- infoColumna
------------------------------------------------------------------
local function ssC(a, b, v)
	return smooth(clamp((v - a) / (b - a), 0, 1))
end

function Generador:infoColumna(x, z)
	local s = self.semilla
	local c = fbm(x * 0.0022, z * 0.0022, s, 4)
	local colinas = fbm(x * 0.012, z * 0.012, s + 50, 4)
	local montes = clamp((fbm(x * 0.005, z * 0.005, s + 90, 3) - 0.52) * 3.2, 0, 1)
	local temp = fbm(x * 0.0014, z * 0.0014, s + 500, 3) + (valueNoise(x * 0.05, z * 0.05, s + 510) - 0.5) * 0.03
	local hum = fbm(x * 0.0014, z * 0.0014, s + 600, 3) + (valueNoise(x * 0.05, z * 0.05, s + 610) - 0.5) * 0.03
	local rara = fbm(x * 0.003, z * 0.003, s + 1700, 2)
	local h
	if c < 0.43 then
		h = NIVEL_MAR - 1 - (0.43 - c) * 150 + (colinas - 0.5) * 6 * clamp((0.43 - c) / 0.02, 0, 1)
	else
		local k = smooth(clamp((c - 0.43) / 0.05, 0, 1))
		h = NIVEL_MAR - 1 + (c - 0.43) * 55 + ((colinas - 0.5) * 12 + 7) * k + montes * montes * 70 * k
	end
	local bioma
	local tierra = h >= NIVEL_MAR - 1
	local isla = fbm(x * 0.0028, z * 0.0028, s + 2100, 2)
	local kIsla = tierra and 0 or ssC(0.3, 0.32, c) * ssC(0.35, 0.37, temp) * (1 - ssC(0.62, 0.64, temp)) * ssC(0.715, 0.745, isla)
	if kIsla > 0 then
		h = lerp(h, NIVEL_MAR + 1 + math.min(7, math.max(0, isla - 0.73) * 120), kIsla)
	end
	if kIsla > 0 and h >= NIVEL_MAR - 0.5 then
		bioma = BIOMA.champinones
	elseif not tierra then
		bioma = temp < 0.33 and BIOMA.oceanoHelado or temp > 0.64 and BIOMA.oceanoCalido or c < 0.33 and BIOMA.oceanoProfundo or BIOMA.oceano
	elseif c < 0.452 and montes < 0.3 and h < NIVEL_MAR + 3.5 then
		bioma = temp < 0.33 and BIOMA.nevado or BIOMA.playa
	elseif montes > 0.45 and h > 150 then
		bioma = temp < 0.45 and BIOMA.picosNevados or (temp > 0.58 and h > 162) and BIOMA.picosPiedra or BIOMA.montana
	elseif temp < 0.33 then
		bioma = hum > 0.5 and BIOMA.taigaNevada or rara > 0.63 and BIOMA.espigasHielo or BIOMA.nevado
	elseif temp < 0.405 then
		bioma = (montes > 0.28 and h > NIVEL_MAR + 24 and hum < 0.46) and BIOMA.prado or (hum > 0.47 and rara > 0.52) and BIOMA.taigaGigante or BIOMA.taiga
	elseif temp < 0.6 then
		if montes > 0.18 and hum < 0.5 and h > NIVEL_MAR + 12 and rara < 0.47 then
			bioma = BIOMA.cerezo
		elseif montes > 0.22 and h > NIVEL_MAR + 20 and rara > 0.53 then
			bioma = BIOMA.prado
		elseif hum > 0.67 then
			bioma = BIOMA.pantano
		elseif hum > 0.55 then
			bioma = (rara > 0.64 and montes < 0.15) and BIOMA.jardinPalido or rara > 0.49 and BIOMA.bosqueOscuro or BIOMA.bosque
		elseif hum > 0.48 then
			bioma = rara < 0.36 and BIOMA.bosqueFlores or BIOMA.bosque
		elseif hum > 0.44 then
			bioma = BIOMA.abedul
		else
			bioma = rara > 0.62 and BIOMA.llanuraGirasoles or BIOMA.llanura
		end
	elseif temp < 0.67 then
		if hum > 0.64 and montes < 0.1 then
			bioma = BIOMA.manglar
		elseif hum > 0.55 then
			bioma = rara < 0.38 and BIOMA.junglaBambu or BIOMA.jungla
		else
			bioma = BIOMA.sabana
		end
	else
		if hum > 0.6 then
			bioma = BIOMA.jungla
		elseif rara > 0.6 or (montes > 0.2 and rara > 0.5) then
			bioma = rara > 0.68 and BIOMA.badlandsErosionados or BIOMA.badlands
		else
			bioma = BIOMA.desierto
		end
	end
	if tierra then
		local sinMonte = 1 - ssC(0.3, 0.45, montes)
		local templada = ssC(0.405, 0.425, temp) * (1 - ssC(0.58, 0.6, temp))
		local calida = ssC(0.6, 0.62, temp) * (1 - ssC(0.65, 0.67, temp))
		local arida = ssC(0.67, 0.69, temp)
		local fP = ssC(0.655, 0.69, hum) * templada * sinMonte
		local fM = ssC(0.625, 0.66, hum) * calida * (1 - ssC(0.07, 0.1, montes)) * sinMonte
		local seco = (1 - ssC(0.57, 0.6, hum)) * arida
		local fB = seco * math.max(ssC(0.58, 0.62, rara), ssC(0.48, 0.52, rara) * ssC(0.18, 0.22, montes)) * (1 - ssC(0.4, 0.5, montes))
		local fD = seco * (1 - fB) * sinMonte
		if fP > 0 then
			h = lerp(h, NIVEL_MAR + (h - NIVEL_MAR) * 0.22 - 0.4, fP)
		end
		if fM > 0 then
			h = lerp(h, NIVEL_MAR + (h - NIVEL_MAR) * 0.15 - 0.9, fM)
		end
		if fD > 0 then
			h = lerp(h, NIVEL_MAR + 1 + (h - NIVEL_MAR - 1) * 0.7, fD)
		end
		if fB > 0 then
			local hb = h + montes * 18 + colinas * 6
			local t = floor(hb / 5) * 5
			hb = t + math.min(5, (hb - t) * 2.5)
			h = lerp(h, hb, fB)
		end
	end
	local rio = abs(fbm(x * 0.0035, z * 0.0035, s + 70, 3) - 0.5)
	if tierra and bioma ~= BIOMA.champinones and rio < 0.022 then
		local f = 1 - rio / 0.022
		local sube = 1 - ssC(136, 164, h)
		if sube > 0 then
			h = h - (h - (NIVEL_MAR - 3)) * math.min(1, f * 2.2) * sube
			if h < NIVEL_MAR then
				bioma = BIOMA.rio
			end
		end
	end
	h = redondear(clamp(h, 70, 188))
	return h, bioma, montes, temp
end

------------------------------------------------------------------
-- Cuevas
------------------------------------------------------------------
function Generador:prepararCuevas(bx, bz)
	local s = self.semilla
	local GR, GNY, A, V = self.GR, self.GNY, self.rejA, self.rejV
	for gx = 0, 4 do
		for gz = 0, 4 do
			for gy = 0, GNY - 1 do
				local x, z, y = bx + gx * GR, bz + gz * GR, gy * GR
				local i = (gy * 5 + gz) * 5 + gx + 1
				A[i] = valueNoise3(x / 30, y / 18, z / 30, s + 300) * 0.65 + valueNoise3(x / 11, y / 11, z / 11, s + 301) * 0.35
				local b = valueNoise3(x / 26, y / 15, z / 26, s + 302)
				local c = valueNoise3(x / 26, y / 15, z / 26, s + 303)
				V[i] = 0.5 - math.max(abs(b - 0.5), abs(c - 0.5))
			end
		end
	end
end

local function muestraRejilla(rej, GR, GNY, x, y, z)
	local gx, gy, gz = x / GR, y / GR, z / GR
	local x0, y0, z0 = math.min(3, floor(gx)), math.min(GNY - 2, floor(gy)), math.min(3, floor(gz))
	local fx, fy, fz = gx - x0, gy - y0, gz - z0
	local b0 = (y0 * 5 + z0) * 5 + x0 + 1 -- (j=0, k=0, i=0)
	local b1 = b0 + 25 -- j=1
	local v000, v100, v001, v101 = rej[b0], rej[b0 + 1], rej[b0 + 5], rej[b0 + 6]
	local v010, v110, v011, v111 = rej[b1], rej[b1 + 1], rej[b1 + 5], rej[b1 + 6]
	local a0 = v000 + (v100 - v000) * fx
	local a1 = v001 + (v101 - v001) * fx
	local a = a0 + (a1 - a0) * fz
	local c0 = v010 + (v110 - v010) * fx
	local c1 = v011 + (v111 - v011) * fx
	local c = c0 + (c1 - c0) * fz
	return a + (c - a) * fy
end

function Generador:esCuevaLocal(lx, y, lz, h, oceano)
	if y < 5 then
		return false
	end
	if oceano and y > h - 6 then
		return false
	end
	local a = muestraRejilla(self.rejA, self.GR, self.GNY, lx, y, lz)
	local v = muestraRejilla(self.rejV, self.GR, self.GNY, lx, y, lz)
	if y > h - 4 then
		return a > 0.76 or v > 0.48
	end
	return a > 0.675 or v > 0.462
end

------------------------------------------------------------------
-- Vetas de mineral
------------------------------------------------------------------
local VETAS
local function vetas()
	if VETAS then
		return VETAS
	end
	VETAS = {
		{ B.menaCarbon, B.pCarbon, 20, 17, "tri", 0, 192 },
		{ B.menaCobre, B.pCobre, 16, 10, "tri", -16, 112 },
		{ B.menaHierro, B.pHierro, 10, 9, "tri", -24, 56 },
		{ B.menaHierro, B.pHierro, 10, 4, "uni", -64, 72 },
		{ B.menaOro, B.pOro, 3, 9, "tri", -64, 32 },
		{ B.menaOro, B.pOro, 0.5, 9, "uni", -64, -48 },
		{ B.menaRedstone, B.pRedstone, 4, 8, "uni", -64, 15 },
		{ B.menaRedstone, B.pRedstone, 8, 8, "tri", -96, -32 },
		{ B.menaLapis, B.pLapis, 2, 7, "tri", -32, 32 },
		{ B.menaLapis, B.pLapis, 2, 7, "uni", -64, 64 },
		{ B.menaDiamante, B.pDiamante, 7, 3, "tri", -144, 16 },
		{ B.menaDiamante, B.pDiamante, 0.11, 8, "tri", -144, 16 },
		{ B.menaDiamante, B.pDiamante, 1, 5, "tri", -144, 16 },
		{ B.tierra, B.tierra, 7, 33, "uni", 0, 160 },
		{ B.grava, B.grava, 14, 33, "uni", -64, 127 },
		{ B.granito, B.granito, 2, 64, "uni", 0, 60 },
		{ B.diorita, B.diorita, 2, 64, "uni", 0, 60 },
		{ B.andesita, B.andesita, 2, 64, "uni", 0, 60 },
	}
	return VETAS
end

local function colocarVeta(datos, r, lx, y, lz, tam, id, ds)
	local a = r() * pi
	local f = tam / 8
	local x0, x1 = lx + sin(a) * f, lx - sin(a) * f
	local z0, z1 = lz + cos(a) * f, lz - cos(a) * f
	local y0 = y + r() * 3 - 1
	local y1 = y + r() * 3 - 1
	local piedra, granito, diorita, andesita, pizarra, tierra = B.piedra, B.granito, B.diorita, B.andesita, B.pizarra, B.tierra
	for i = 0, tam - 1 do
		local t = i / tam
		local cx, cy, cz = lerp(x0, x1, t), lerp(y0, y1, t), lerp(z0, z1, t)
		local rad = ((sin(pi * t) + 1) * r() * tam / 16 + 1) / 2
		for X = floor(cx - rad), ceil(cx + rad) do
			if X >= 0 and X < CX then
				for Y = floor(cy - rad), ceil(cy + rad) do
					if Y >= 1 and Y < CY then
						for Z = floor(cz - rad), ceil(cz + rad) do
							if Z >= 0 and Z < CZ then
								local dx, dy, dz = (X + 0.5 - cx) / rad, (Y + 0.5 - cy) / rad, (Z + 0.5 - cz) / rad
								if dx * dx + dy * dy + dz * dz < 1 then
									local i2 = idx(X, Y, Z)
									local b = rd(datos, i2)
									if b == piedra or b == granito or b == diorita or b == andesita then
										wr(datos, i2, id)
									elseif b == pizarra and ds ~= tierra and ds ~= granito and ds ~= diorita and ds ~= andesita then
										wr(datos, i2, ds)
									end
								end
							end
						end
					end
				end
			end
		end
	end
end

function Generador:generarVetas(datos, cx, cz, montana)
	local r = mulberry32(floor(hash2(cx, cz, self.semilla + 4000) * 4294967296))
	local lista = vetas()
	if montana then
		lista = table.clone(lista)
		table.insert(lista, { B.menaEsmeralda, B.menaEsmeralda, 12, 3, "uni", -16, 127 })
		table.insert(lista, { B.menaHierro, B.pHierro, 90, 9, "tri", 80, 384 })
	end
	for _, v in lista do
		local id, ds, intentos, tam, forma, y0, y1 = v[1], v[2], v[3], v[4], v[5], v[6], v[7]
		local n = floor(intentos) + ((r() < intentos % 1) and 1 or 0)
		for _ = 1, n do
			local my
			if forma == "tri" then
				local a = r()
				local b = r()
				my = redondear(y0 + (a + b) / 2 * (y1 - y0))
			else
				my = redondear(y0 + r() * (y1 - y0))
			end
			local y = my + OY
			if y >= 1 and y < CY - 1 then
				local lx = floor(r() * 16)
				local lz = floor(r() * 16)
				colocarVeta(datos, r, lx, y, lz, tam, id, ds)
			end
		end
	end
end

------------------------------------------------------------------
-- Árboles
------------------------------------------------------------------
local function ponerArbolTipo(poner, tipo, wx, h, wz, r)
	local function tronco(x, y, z, id)
		poner(x, y, z, id, false)
	end
	local function hoja(x, y, z, id)
		poner(x, y, z, id, true)
	end
	local function bola(cx, cy, cz, rad, id)
		for dx = -ceil(rad), rad do
			for dy = -ceil(rad), rad do
				for dz = -ceil(rad), rad do
					if dx * dx + dy * dy * 1.6 + dz * dz <= rad * rad + r() * 0.8 then
						hoja(cx + dx, cy + dy, cz + dz, id)
					end
				end
			end
		end
	end
	local function copaRoble(cima, id)
		for y = cima - 2, cima + 1 do
			local rad = y >= cima and 1 or 2
			for dx = -rad, rad do
				for dz = -rad, rad do
					local saltar = abs(dx) == rad and abs(dz) == rad and (y == cima + 1 or r() < 0.5)
					if not saltar then
						hoja(wx + dx, y, wz + dz, id)
					end
				end
			end
		end
	end
	if tipo == "roble" or tipo == "abedul" or tipo == "pantano" then
		local alto = (tipo == "abedul" and 5 or 4) + floor(r() * 3)
		local cima = h + alto
		local hojaId = tipo == "abedul" and B.hojasAbedul or B.hojas
		if tipo == "pantano" then
			for y = cima - 2, cima + 1 do
				local rad = y >= cima and 2 or 3
				for dx = -rad, rad do
					for dz = -rad, rad do
						if not (abs(dx) == rad and abs(dz) == rad) then
							hoja(wx + dx, y, wz + dz, hojaId)
						end
					end
				end
			end
		else
			copaRoble(cima, hojaId)
		end
		for y = h + 1, cima do
			tronco(wx, y, wz, tipo == "abedul" and B.troncoAbedul or B.tronco)
		end
	elseif tipo == "robleGrande" then
		local alto = 7 + floor(r() * 4)
		local cima = h + alto
		for y = h + 1, cima do
			tronco(wx, y, wz, B.tronco)
		end
		bola(wx, cima, wz, 2.6, B.hojas)
		local ramas = 2 + floor(r() * 2)
		for k = 0, ramas - 1 do
			local a = r() * pi * 2
			local l = 2 + floor(r() * 2)
			local by = h + floor(alto * 0.55) + k
			local bx, bz = wx, wz
			for i = 1, l do
				bx = wx + redondear(cos(a) * i)
				bz = wz + redondear(sin(a) * i)
				tronco(bx, by + floor(i / 2), bz, B.tronco)
			end
			bola(bx, by + floor(l / 2) + 1, bz, 2, B.hojas)
		end
	elseif tipo == "abeto" then
		local alto = 7 + floor(r() * 5)
		local cima = h + alto
		local rad = 0
		local y = cima + 1
		while y >= h + 2 + floor(r() * 2) do
			for dx = -rad, rad do
				for dz = -rad, rad do
					if abs(dx) + abs(dz) <= rad + (rad > 1 and 1 or 0) then
						hoja(wx + dx, y, wz + dz, B.hojasAbeto)
					end
				end
			end
			if rad >= floor((cima - y) / 3) + 1 then
				rad = rad > 1 and rad - 1 or rad + 1
			else
				rad += 1
			end
			if rad > 3 then
				rad = 1
			end
			y -= 1
		end
		hoja(wx, cima + 2, wz, B.hojasAbeto)
		for yy = h + 1, cima do
			tronco(wx, yy, wz, B.troncoAbeto)
		end
	elseif tipo == "jungla" then
		local alto = 9 + floor(r() * 7)
		local cima = h + alto
		bola(wx, cima, wz, 3.2, B.hojasJungla)
		local y = h + 4
		while y < cima - 2 do
			local a = r() * pi * 2
			bola(wx + redondear(cos(a) * 2), y, wz + redondear(sin(a) * 2), 1.3, B.hojasJungla)
			y += 2 + floor(r() * 3)
		end
		for yy = h + 1, cima do
			tronco(wx, yy, wz, B.troncoJungla)
		end
	elseif tipo == "arbusto" then
		tronco(wx, h + 1, wz, B.troncoJungla)
		bola(wx, h + 2, wz, 1.8, B.hojasJungla)
	elseif tipo == "acacia" then
		local alto = 4 + floor(r() * 2)
		local a = floor(r() * 4)
		local dx, dz = DIRF[a + 1][1], DIRF[a + 1][2]
		local x, z, y = wx, wz, h
		for _ = 1, alto do
			y += 1
			tronco(x, y, z, B.troncoAcacia)
		end
		local i = 0
		while i < 2 + floor(r() * 2) do
			x += dx
			z += dz
			y += 1
			tronco(x, y, z, B.troncoAcacia)
			i += 1
		end
		for ddx = -3, 3 do
			for ddz = -3, 3 do
				local d = abs(ddx) + abs(ddz)
				if d <= 4 then
					hoja(x + ddx, y + 1, z + ddz, B.hojasAcacia)
				end
				if d <= 2 then
					hoja(x + ddx, y + 2, z + ddz, B.hojasAcacia)
				end
			end
		end
	elseif tipo == "cerezo" then
		local alto = 4 + floor(r() * 3)
		local y = h
		for _ = 1, alto do
			y += 1
			tronco(wx, y, wz, B.troncoCerezo)
		end
		local copas = { { wx, y, wz } }
		local nr = 1 + floor(r() * 2)
		local usadas = {}
		for _ = 1, nr do
			local d = floor(r() * 4)
			while usadas[d] do
				d = (d + 1) % 4
			end
			usadas[d] = true
			local dx, dz = DIRF[d + 1][1], DIRF[d + 1][2]
			local bx2, bz2 = wx, wz
			local by = y - 1 - floor(r() * 2)
			for i = 0, 2 do
				bx2 += dx
				bz2 += dz
				if i > 0 then
					by += 1
				end
				tronco(bx2, by, bz2, B.troncoCerezo)
			end
			table.insert(copas, { bx2, by, bz2 })
		end
		for _, cp in copas do
			local cx2, cy2, cz2 = cp[1], cp[2], cp[3]
			for dx = -3, 3 do
				for dz = -3, 3 do
					for dy = -1, 2 do
						local d = (dx * dx + dz * dz) / 10.5 + (dy - 0.5) * (dy - 0.5) / 2.2
						if d <= 1 + r() * 0.15 then
							hoja(cx2 + dx, cy2 + dy, cz2 + dz, B.hojasCerezo)
						end
					end
				end
			end
			for _ = 1, 5 do
				local ax = cx2 + floor(r() * 5) - 2
				local az = cz2 + floor(r() * 7) - 3
				hoja(ax, cy2 - 2, az, B.hojasCerezo)
			end
		end
	elseif tipo == "palido" then
		local alto = 6 + floor(r() * 3)
		local cima = h + alto
		for y = h + 1, cima do
			for _, ab in { { 0, 0 }, { 1, 0 }, { 0, 1 }, { 1, 1 } } do
				tronco(wx + ab[1], y, wz + ab[2], B.troncoPalido)
			end
		end
		if r() < 0.14 then
			local ax = wx + floor(r() * 2)
			local ay = h + 2 + floor(r() * 3)
			local az = wz + floor(r() * 2)
			tronco(ax, ay, az, B.corazonCreaking)
		end
		for dx = -3, 4 do
			for dz = -3, 4 do
				for dy = -1, 1 do
					local d = sqrt((dx - 0.5) ^ 2 + (dz - 0.5) ^ 2)
					if d <= 3.7 - (dy == 1 and 1.4 or 0) + r() * 0.4 then
						hoja(wx + dx, cima + dy, wz + dz, B.hojasPalidas)
					end
				end
			end
		end
		for _ = 1, 12 do
			local hx = wx + floor(r() * 8) - 3
			local hz = wz + floor(r() * 8) - 3
			local l = 1 + floor(r() * 3)
			for q = 0, l - 1 do
				hoja(hx, cima - 2 - q, hz, B.musgoColgante)
			end
		end
	elseif tipo == "robleOscuro" then
		local alto = 5 + floor(r() * 3)
		local cima = h + alto
		local H = B.hojasRobleOscuro
		for y = h + 1, cima do
			for _, ab in { { 0, 0 }, { 1, 0 }, { 0, 1 }, { 1, 1 } } do
				tronco(wx + ab[1], y, wz + ab[2], B.troncoRobleOscuro)
			end
		end
		local k = 0
		while k < 2 + floor(r() * 2) do
			local di = DIRF[floor(r() * 4) + 1]
			local dx, dz = di[1], di[2]
			local bx2 = wx + (dx > 0 and 2 or dx < 0 and -1 or floor(r() * 2))
			local bz2 = wz + (dz > 0 and 2 or dz < 0 and -1 or floor(r() * 2))
			tronco(bx2, cima - 1, bz2, B.troncoRobleOscuro)
			tronco(bx2 + dx, cima, bz2 + dz, B.troncoRobleOscuro)
			k += 1
		end
		for dx = -3, 4 do
			for dz = -3, 4 do
				local d = sqrt((dx - 0.5) ^ 2 + (dz - 0.5) ^ 2)
				if d <= 3.8 + r() * 0.5 then
					hoja(wx + dx, cima, wz + dz, H)
				end
				if d <= 2.8 + r() * 0.4 then
					hoja(wx + dx, cima + 1, wz + dz, H)
				end
				if d > 1.6 and d <= 3.4 and r() < 0.45 then
					hoja(wx + dx, cima - 1, wz + dz, H)
				end
			end
		end
	elseif tipo == "setaRoja" or tipo == "setaMarron" then
		local alto = 4 + floor(r() * 3)
		local cima = h + alto
		for y = h + 1, cima - 1 do
			tronco(wx, y, wz, B.talloSeta)
		end
		if tipo == "setaRoja" then
			for dx = -2, 2 do
				for dz = -2, 2 do
					if not (abs(dx) == 2 and abs(dz) == 2) then
						hoja(wx + dx, cima, wz + dz, B.setaRojaGigante)
						if abs(dx) == 2 or abs(dz) == 2 then
							for dy = 1, 3 do
								hoja(wx + dx, cima - dy, wz + dz, B.setaRojaGigante)
							end
						end
					end
				end
			end
		else
			for dx = -3, 3 do
				for dz = -3, 3 do
					if not (abs(dx) == 3 and abs(dz) == 3) then
						hoja(wx + dx, cima, wz + dz, B.setaMarronGigante)
					end
				end
			end
		end
	elseif tipo == "mangle" then
		local base = h + 2 + floor(r() * 2)
		local cima = base + 5 + floor(r() * 4)
		local nr = 4 + floor(r() * 3)
		for k = 0, nr - 1 do
			local a = k / nr * pi * 2 + r() * 0.6
			for y = base, h - 2, -1 do
				local t = (base - y) / (base - h + 2)
				tronco(wx + redondear(cos(a) * t * 2.4), y, wz + redondear(sin(a) * t * 2.4), B.raicesMangle)
			end
		end
		for y = base, cima do
			tronco(wx, y, wz, B.troncoMangle)
		end
		bola(wx, cima, wz, 2.8, B.hojasMangle)
		local ax = wx + redondear(r() * 2 - 1)
		local az = wz + redondear(r() * 2 - 1)
		bola(ax, cima - 2, az, 2.2, B.hojasMangle)
		for k = 0, 2 do
			if r() < 0.6 then
				local di = DIRF[floor(r() * 4) + 1]
				tronco(wx + di[1], cima - 1 - k, wz + di[2], B.troncoMangle)
			end
		end
	end
end
Generador.ponerArbolTipo = ponerArbolTipo

local ARBOLES_BIOMA = {
	[0] = false, false,
	{ 0.003, function(r) return r < 0.15 and "robleGrande" or "roble" end },
	{ 0.05, function(r) return r < 0.2 and "abedul" or r < 0.3 and "robleGrande" or "roble" end },
	false,
	{ 0.004, function() return "abeto" end },
	{ 0.006, function() return "abeto" end },
	{ 0.045, function() return "abeto" end },
	{ 0.05, function(r) return r < 0.08 and "roble" or "abedul" end },
	{ 0.1, function(r) return r < 0.45 and "arbusto" or r < 0.55 and "robleGrande" or "jungla" end },
	{ 0.006, function() return "acacia" end },
	{ 0.014, function() return "pantano" end },
	false, false,
	{ 0.012, function() return "cerezo" end },
	{ 0.075, function() return "mangle" end },
	{ 0.06, function() return "palido" end },
	{ 0.1, function(r) return r < 0.05 and "setaRoja" or r < 0.1 and "setaMarron" or r < 0.82 and "robleOscuro" or r < 0.95 and "roble" or "abedul" end },
	{ 0.035, function() return "abeto" end },
	{ 0.0012, function(r) return r < 0.6 and "roble" or "abedul" end },
	false, false, false,
	{ 0.012, function(r) return r < 0.5 and "setaRoja" or "setaMarron" end },
	{ 0.03, function(r) return r < 0.3 and "abedul" or r < 0.4 and "robleGrande" or "roble" end },
	false,
	{ 0.02, function(r) return r < 0.7 and "arbusto" or "jungla" end },
	false,
	{ 0.075, function() return "abeto" end },
	false, false,
	{ 0.0015, function() return "roble" end },
}

------------------------------------------------------------------
-- Lagos
------------------------------------------------------------------
local function lagos(datos, info, r)
	if r() < 0.035 then
		local cx = 5 + floor(r() * 6)
		local cz = 5 + floor(r() * 6)
		local inf = info[cz * CX + cx + 1]
		local h, bioma = inf[1], inf[2]
		if h <= NIVEL_MAR + 1 or bioma == BIOMA.desierto or bioma == BIOMA.badlands or bioma == BIOMA.montana then
			return
		end
		local lava = r() < 0.1
		local rx = 3 + r() * 2.5
		local rz = 3 + r() * 2.5
		local prof = 2 + floor(r() * 2)
		for x = 0, CX - 1 do
			for z = 0, CZ - 1 do
				local d = ((x - cx) / rx) ^ 2 + ((z - cz) / rz) ^ 2
				if d < 1 then
					local hh = info[z * CX + x + 1][1]
					if abs(hh - h) <= 3 then
						local fondo = h - 1 - floor((1 - d) * prof)
						for y = fondo, hh + 3 do
							if y >= 1 and y < CY then
								local i = idx(x, y, z)
								if y < h then
									wr(datos, i, lava and B.lava or ((esBiomaFrio(info[z * CX + x + 1][2]) and y == h - 1) and B.hielo or B.agua))
								elseif not esTronco(rd(datos, i)) then
									wr(datos, i, 0)
								end
							end
						end
						if lava then
							for _, ab in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
								local X, Z = x + ab[1], z + ab[2]
								if X >= 0 and Z >= 0 and X < CX and Z < CZ then
									local i = idx(X, h - 1, Z)
									local v = rd(datos, i)
									if v ~= 0 and v ~= B.lava then
										wr(datos, i, B.piedra)
									end
								end
							end
						end
						if not lava and fondo > 0 and rd(datos, idx(x, fondo - 1, z)) == B.tierra then
							wr(datos, idx(x, fondo - 1, z), r() < 0.3 and B.arcilla or B.arena)
						end
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Superficie (generarSuperficie)
------------------------------------------------------------------
local PASTO = { [2] = 0.25, [3] = 0.1, [8] = 0.1, [9] = 0.3, [10] = 0.3, [11] = 0.1, [7] = 0.05, [6] = 0.05, [13] = 0.1, [17] = 0.08, [19] = 0.2 }
local FLOR = { [2] = 0.03, [3] = 0.015, [8] = 0.02, [11] = 0.02, [9] = 0.01 }

-- Zona vacía (islas de One Block): todo aire
-- Zonas del mapa de Roblox (en chunks a lo largo de Z):
-- · cz >= 600: el Nether (su chunk 0 está en cz = 800)
-- · -600 >= cz > -760: vacío (islas de One Block y arenas de los modos)
-- · cz <= -760: el End (su chunk 0 está en cz = -900)
-- · el resto: la Superficie
Generador.ZONA_VACIA_CZ = -600
Generador.NETHER_DESDE, Generador.NETHER_CZ = 600, 800
Generador.END_HASTA, Generador.END_CZ = -760, -900
function Generador.dimensionDe(cz)
	if cz >= Generador.NETHER_DESDE then
		return "nether", Generador.NETHER_CZ
	elseif cz <= Generador.END_HASTA then
		return "end", Generador.END_CZ
	elseif cz <= Generador.ZONA_VACIA_CZ then
		return "vacio", 0
	end
	return "superficie", 0
end
-- Dimensión de un bloque (x, z) del mapa de Roblox y su z dentro de esa dimensión
function Generador.dimensionBloque(z)
	local d, off = Generador.dimensionDe(z // CZ)
	return d, z - off * CZ
end
function Generador.esZonaVacia(cx, cz)
	return Generador.dimensionDe(cz) == "vacio"
end
-- ¿Le da la luz del cielo? (no en el Nether ni en el End)
function Generador.conCielo(cz)
	local d = Generador.dimensionDe(cz)
	return d == "superficie" or d == "vacio"
end

-- Genera un chunk del Nether o del End (coordenadas de esa dimensión)
function Generador:llenarDim(dim, datos, cx, cz)
	if dim == "nether" then
		local bn, cofres = Dimensiones.generarNether(datos, cx, cz, self.semilla)
		local bio = buffer.create(256)
		for i = 0, 255 do
			buffer.writeu8(bio, i, 100 + buffer.readu8(bn, i))
		end
		return bio, cofres
	end
	local cofres = Dimensiones.generarEnd(datos, cx, cz, self.semilla)
	local bio = buffer.create(256)
	buffer.fill(bio, 0, 120)
	return bio, cofres
end

function Generador:llenar(datos, cx, cz, ceder)
	local dim, off = Generador.dimensionDe(cz)
	if dim == "vacio" then
		local bio = buffer.create(256)
		buffer.fill(bio, 0, 2)
		-- Arenas de Bed Wars, Mazmorras y Leyendas
		Arenas.llenar(datos, cx, cz)
		return bio
	elseif dim ~= "superficie" then
		local bio, cofres = self:llenarDim(dim, datos, cx, cz - off)
		for _, c in cofres do
			c[3] += off * CZ
		end
		return bio, cofres
	end
	local s = self.semilla
	local bx, bz = cx * CX, cz * CZ
	self:prepararCuevas(bx, bz)
	local info = table.create(256)
	local biomasCh = buffer.create(256)
	local montana = false
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local h, bioma, montes, temp = self:infoColumna(bx + x, bz + z)
			info[z * CX + x + 1] = { h, bioma, montes, temp }
			buffer.writeu8(biomasCh, z * CX + x, bioma)
			if bioma == BIOMA.montana then
				montana = true
			end
		end
	end
	local Bl = {
		lecho = B.lecho, agua = B.agua, hielo = B.hielo, lava = B.lava, arena = B.arena, arenaRoja = B.arenaRoja, barro = B.barro,
		cesped = B.cesped, musgoPalido = B.musgoPalido, arcilla = B.arcilla, grava = B.grava, bloqueNieve = B.bloqueNieve,
		piedra = B.piedra, hieloCompacto = B.hieloCompacto, micelio = B.micelio, calcita = B.calcita, podzol = B.podzol,
		cespedNevado = B.cespedNevado, arenisca = B.arenisca, terracota = B.terracota, tierra = B.tierra, terracota0 = B.terracota0,
		pizarra = B.pizarra,
	}
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local wx, wz = bx + x, bz + z
			local inf = info[z * CX + x + 1]
			local h, bioma = inf[1], inf[2]
			local agua = h < NIVEL_MAR
			local top = math.max(h, NIVEL_MAR)
			local frio = esBiomaFrio(bioma) or (bioma == BIOMA.rio and inf[4] < 0.33)
			local iceberg = 0
			if bioma == BIOMA.oceanoHelado then
				local v = fbm(wx * 0.035, wz * 0.035, s + 1800, 2)
				if v > 0.66 then
					iceberg = floor((v - 0.66) * 90)
				end
			end
			if iceberg > 0 then
				for y = NIVEL_MAR - math.min(6, iceberg), NIVEL_MAR + iceberg do
					if y > h then
						wr(datos, idx(x, y, z), (y > NIVEL_MAR + iceberg - 2 and hash3(wx, y, wz, s + 36) < 0.4) and Bl.bloqueNieve or Bl.hieloCompacto)
					end
				end
			end
			for y = 0, top do
				local id
				local saltar = false
				if y <= 4 and (y == 0 or hash3(wx, y, wz, s + 5) < (5 - y) / 5) then
					id = Bl.lecho
				elseif y > h then
					if rd(datos, idx(x, y, z)) ~= 0 then
						saltar = true
					else
						id = (frio and y == NIVEL_MAR and (bioma ~= BIOMA.oceanoHelado or fbm(wx * 0.07, wz * 0.07, s + 37, 2) < 0.64)) and Bl.hielo or Bl.agua
					end
				elseif self:esCuevaLocal(x, y, z, h, agua) then
					id = y <= 10 and Bl.lava or 0
				elseif y == h then
					if bioma == BIOMA.desierto or bioma == BIOMA.playa then
						id = Bl.arena
					elseif esBadlands(bioma) then
						id = Bl.arenaRoja
					elseif bioma == BIOMA.manglar then
						id = (h > NIVEL_MAR and hash2(wx, wz, s + 34) < 0.35) and Bl.cesped or Bl.barro
					elseif bioma == BIOMA.jardinPalido and not agua then
						id = hash2(wx, wz, s + 35) < 0.4 and Bl.musgoPalido or Bl.cesped
					elseif agua and bioma == BIOMA.oceanoCalido then
						id = Bl.arena
					elseif agua then
						if bioma == BIOMA.rio then
							id = hash2(wx, wz, s + 31) < 0.2 and Bl.arcilla or hash2(wx, wz, s + 32) < 0.5 and Bl.arena or Bl.grava
						else
							id = h < NIVEL_MAR - 8 and Bl.grava or Bl.arena
						end
					elseif bioma == BIOMA.montana then
						id = h > 172 and Bl.bloqueNieve or h > 158 and Bl.piedra or Bl.cesped
					elseif bioma == BIOMA.picosNevados then
						id = hash2(wx, wz, s + 38) < 0.1 and Bl.hieloCompacto or Bl.bloqueNieve
					elseif bioma == BIOMA.champinones then
						id = Bl.micelio
					elseif bioma == BIOMA.espigasHielo then
						id = Bl.bloqueNieve
					elseif bioma == BIOMA.picosPiedra then
						id = hash2(wx, wz, s + 39) < 0.25 and Bl.calcita or Bl.piedra
					elseif (bioma == BIOMA.taigaGigante and hash2(wx, wz, s + 40) < 0.6) or (bioma == BIOMA.junglaBambu and hash2(wx, wz, s + 41) < 0.35) then
						id = Bl.podzol
					elseif frio then
						id = Bl.cespedNevado
					else
						id = Bl.cesped
					end
				elseif y > h - 4 then
					if bioma == BIOMA.desierto then
						id = y > h - 3 and Bl.arena or Bl.arenisca
					elseif esBadlands(bioma) then
						id = Bl.terracota
					elseif bioma == BIOMA.manglar then
						id = Bl.barro
					elseif bioma == BIOMA.playa or agua then
						id = Bl.arena
					elseif bioma == BIOMA.montana and h > 158 then
						id = Bl.piedra
					elseif bioma == BIOMA.picosNevados then
						id = y > h - 2 and Bl.bloqueNieve or Bl.piedra
					elseif bioma == BIOMA.picosPiedra then
						id = Bl.piedra
					else
						id = Bl.tierra
					end
				elseif esBadlands(bioma) and y > h - 18 and y > NIVEL_MAR - 4 then
					local banda = floor(hash2(floor(y / 2), 7, s + 33) * 8)
					id = banda < 6 and Bl.terracota0 + banda or Bl.terracota
				else
					local pizarra = y < OY or (y < OY + 8 and hash3(wx, y, wz, s + 6) < (OY + 8 - y) / 8)
					id = pizarra and Bl.pizarra or Bl.piedra
				end
				if not saltar and id and id ~= 0 then
					wr(datos, idx(x, y, z), id)
				end
			end
		end
		if ceder then
			ceder()
		end
	end
	self:generarVetas(datos, cx, cz, montana)
	if ceder then
		ceder()
	end
	local rc = mulberry32(floor(hash2(cx, cz, s + 4100) * 4294967296))
	lagos(datos, info, rc)

	-- Árboles (también los de columnas vecinas que asoman a este chunk)
	local function poner(x, y, z, id, soloAire)
		local lx, lz = x - bx, z - bz
		if lx < 0 or lz < 0 or lx >= CX or lz >= CZ or y < 0 or y >= CY then
			return
		end
		local i = idx(lx, y, lz)
		local b = rd(datos, i)
		if soloAire and b ~= 0 and not REEMPL[b] then
			return
		end
		if not soloAire and b ~= 0 and SOLIDO[b] and not esHojas(b) and not esTronco(b) and b ~= Bl.tierra and b ~= Bl.cesped then
			return
		end
		wr(datos, i, id)
	end
	for wx = bx - 4, bx + CX + 3 do
		for wz = bz - 4, bz + CZ + 3 do
			local rh = hash2(wx, wz, s + 777)
			if rh <= 0.1 then
				local dentro = wx >= bx and wx < bx + CX and wz >= bz and wz < bz + CZ
				local h, bioma
				if dentro then
					local inf = info[(wz - bz) * CX + wx - bx + 1]
					h, bioma = inf[1], inf[2]
				else
					h, bioma = self:infoColumna(wx, wz)
				end
				local def = ARBOLES_BIOMA[bioma]
				if def and rh < def[1] then
					local mangle = bioma == BIOMA.manglar
					if h > NIVEL_MAR - (mangle and 3 or 0) then
						local ok = true
						if dentro then
							local sup = rd(datos, idx(wx - bx, h, wz - bz))
							if sup ~= Bl.cesped and sup ~= Bl.cespedNevado and sup ~= Bl.tierra and sup ~= Bl.barro and sup ~= Bl.musgoPalido and sup ~= Bl.micelio and sup ~= Bl.podzol then
								ok = false
							end
						end
						if ok then
							local r = mulberry32(floor(hash2(wx, wz, s + 778) * 4294967296))
							ponerArbolTipo(poner, def[2](r()), wx, h, wz, r)
							if dentro and not mangle then
								wr(datos, idx(wx - bx, h, wz - bz), Bl.tierra)
							end
						end
					end
				end
			end
		end
	end

	if ceder then
		ceder()
	end
	-- Vegetación
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local wx, wz = bx + x, bz + z
			local inf = info[z * CX + x + 1]
			local h, bioma = inf[1], inf[2]
			local sup = rd(datos, idx(x, h, z))
			local arriba = h + 1 < CY and rd(datos, idx(x, h + 1, z)) or 1
			local r2 = hash2(wx, wz, s + 779)
			local r3 = hash2(wx, wz, s + 780)
			local function poner1(id)
				if arriba == 0 then
					wr(datos, idx(x, h + 1, z), id)
				end
			end
			repeat -- (para poder usar «break» como el «continue» del original)
				if bioma == BIOMA.cerezo and sup == Bl.cesped and r2 < 0.16 then
					poner1(r3 < 0.85 and B.petalos or B.hierbaAlta)
					break
				end
				if esBiomaFrio(bioma) then
					for y = math.min(CY - 2, h + 24), h + 1, -1 do
						local b = rd(datos, idx(x, y, z))
						if b ~= 0 then
							if esHojas(b) and rd(datos, idx(x, y + 1, z)) == 0 then
								wr(datos, idx(x, y + 1, z), B.capaNieve)
							end
							break
						end
					end
				end
				if sup == Bl.cesped and arriba == 0 then
					if bioma == BIOMA.prado and r2 < 0.3 then
						local flores = { B.florAmarilla, B.florRoja, B.aciano, B.margarita, B.floresSilvestres, B.aciano }
						wr(datos, idx(x, h + 1, z), r3 < 0.45 and B.hierbaAlta or flores[floor(r3 * 13) % 6 + 1])
						break
					end
					if bioma == BIOMA.llanura and fbm(wx * 0.02, wz * 0.02, s + 1900, 2) > 0.64 and r2 < 0.12 then
						wr(datos, idx(x, h + 1, z), B.girasol)
						break
					end
					if bioma == BIOMA.bosqueOscuro and r2 < 0.03 then
						wr(datos, idx(x, h + 1, z), r3 < 0.5 and B.champinonRojo or B.champinonMarron)
						break
					end
				end
				if (bioma == BIOMA.pantano or bioma == BIOMA.manglar) and h < NIVEL_MAR and rd(datos, idx(x, NIVEL_MAR + 1, z)) == 0 and rd(datos, idx(x, NIVEL_MAR, z)) == Bl.agua and r2 < 0.08 then
					wr(datos, idx(x, NIVEL_MAR + 1, z), B.nenufar)
					break
				end
				local r4 = hash2(wx, wz, s + 781)
				if bioma == BIOMA.jardinPalido and (sup == Bl.cesped or sup == Bl.musgoPalido) and arriba == 0 then
					if r4 < 0.2 then
						wr(datos, idx(x, h + 1, z), B.alfombraMusgo)
						break
					end
					if r4 < 0.225 then
						wr(datos, idx(x, h + 1, z), B.floresOjo)
						break
					end
				end
				if sup == Bl.cesped and arriba == 0 then
					if bioma == BIOMA.bosque and r4 < 0.05 then
						wr(datos, idx(x, h + 1, z), B.hojarasca)
						break
					end
					if (bioma == BIOMA.abedul and r4 < 0.04) or (bioma == BIOMA.llanura and r4 < 0.008) then
						wr(datos, idx(x, h + 1, z), B.floresSilvestres)
						break
					end
					if (bioma == BIOMA.llanura or bioma == BIOMA.bosque or bioma == BIOMA.taiga) and r4 > 0.985 then
						wr(datos, idx(x, h + 1, z), B.arbusto)
						break
					end
					if (bioma == BIOMA.pantano or bioma == BIOMA.manglar or bioma == BIOMA.bosque) and r4 > 0.975 and h <= NIVEL_MAR + 3 then
						wr(datos, idx(x, h + 1, z), B.arbustoLuciernagas)
						break
					end
				end
				if sup == Bl.cesped then
					local pasto = PASTO[bioma] or 0.05
					local flor = FLOR[bioma] or 0
					if r2 < pasto then
						poner1((bioma == BIOMA.taiga or (bioma == BIOMA.jungla and r3 < 0.4)) and B.helecho or B.hierbaAlta)
					elseif r2 < pasto + flor then
						local f = bioma == BIOMA.pantano and B.orquidea or ({ B.florAmarilla, B.florRoja, B.aciano, B.margarita })[floor(r3 * 4) + 1]
						poner1(f)
					elseif (bioma == BIOMA.taiga or bioma == BIOMA.bosque or bioma == BIOMA.pantano) and r2 < pasto + flor + 0.008 then
						poner1(r3 < 0.5 and B.champinonRojo or B.champinonMarron)
					elseif bioma == BIOMA.llanura and r2 > 0.9985 then
						poner1(B.calabaza)
					elseif bioma == BIOMA.jungla and r2 > 0.996 then
						poner1(B.sandia)
					elseif bioma == BIOMA.taiga and r2 < 0.05 + pasto then
						poner1(B.helecho)
					end
				elseif sup == Bl.cespedNevado or ((bioma == BIOMA.nevado or bioma == BIOMA.taigaNevada) and SOLIDO[sup] and OPACO[sup]) then
					if arriba == 0 then
						wr(datos, idx(x, h + 1, z), B.capaNieve)
					end
				elseif (bioma == BIOMA.desierto or bioma == BIOMA.badlands) and (sup == Bl.arena or sup == Bl.arenaRoja) then
					if r2 < 0.008 then
						local a = 1 + floor(r3 * 3)
						local ok = true
						for k = 1, a do
							if rd(datos, idx(x, h + k, z)) ~= 0 then
								ok = false
							end
						end
						if ok and x > 0 and x < 15 and z > 0 and z < 15 then
							for k = 1, a do
								wr(datos, idx(x, h + k, z), B.cactus)
							end
						end
					elseif r2 < 0.02 then
						poner1(B.arbustoSeco)
					end
				end
				if h == NIVEL_MAR and (sup == Bl.arena or sup == Bl.cesped or sup == Bl.tierra) and r2 > 0.88 then
					local cerca = false
					for _, ab in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
						local X, Z = x + ab[1], z + ab[2]
						if X >= 0 and Z >= 0 and X < CX and Z < CZ and esAgua(rd(datos, idx(X, NIVEL_MAR, Z))) then
							cerca = true
							break
						end
					end
					if cerca then
						local a = 1 + floor(r3 * 3)
						for k = 1, a do
							if rd(datos, idx(x, h + k, z)) == 0 then
								wr(datos, idx(x, h + k, z), B.cana)
							end
						end
					end
				end
			until true
		end
	end
	if ceder then
		ceder()
	end
	-- Estructuras, decoración de biomas y desgaste (lo mismo que añade el juego web)
	local cofres = Estructuras.superficie(self, datos, cx, cz, info, biomasCh)
	return biomasCh, cofres
end

-- Altura del terreno sin cambios de los jugadores
function Generador:altura(x, z)
	local h = self:infoColumna(x, z)
	return h
end

return Generador
