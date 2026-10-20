--!native
--!optimize 2
--[[
	Blockverse para Roblox · El Nether y el End
	Traducción de generarNether() y generarEnd() de mundo.js del juego web,
	con sus estructuras: fortalezas del Nether, bastiones en ruinas
	(estructuras27.js), ciudades del End con barco (mundo.js y v26.js) y el
	desgaste de estructuras28.js. Con la misma semilla sale lo mismo.
	Trabaja con coordenadas «locales» de cada dimensión; MundoDatos coloca
	cada dimensión en su propia zona del mapa de Roblox.
]]
local Registro = require(script.Parent.Registro)
local Ruido = require(script.Parent.Ruido)
local Biomas = require(script.Parent.Datos.Biomas)
local Estructuras = require(script.Parent.Estructuras)

local hash2, hash3, mulberry32 = Ruido.hash2, Ruido.hash3, Ruido.mulberry32
local valueNoise3, fbm = Ruido.valueNoise3, Ruido.fbm
local redondear = Ruido.redondear
local floor, abs, sqrt, min, max = math.floor, math.abs, math.sqrt, math.min, math.max

local CO = Biomas.constantes
local CX, CZ, CY, OY = CO.CX, CO.CZ, CO.CY, CO.OY
local BR = Registro.B
local B = setmetatable({}, {
	__index = function(_, k)
		local v = BR[k]
		if v == nil then
			error("Dimensiones: falta el bloque " .. tostring(k))
		end
		return v
	end,
})
local esLiquido = Registro.esLiquido
local DIRF = Registro.DIRF
local LANA_COLOR, VIDRIO_COLOR = Estructuras.LANA_COLOR, Estructuras.VIDRIO_COLOR

local function idx(x, y, z)
	return x + z * CX + y * CX * CZ
end
local function rd(d, i)
	return buffer.readu16(d, i * 2)
end
local function wr(d, i, v)
	buffer.writeu16(d, i * 2, v)
end
local function hypot(a, b)
	return sqrt(a * a + b * b)
end

local D = {}
D.BN = { desierto = 0, carmesi = 1, distorsionado = 2, valle = 3, deltas = 4 }
D.NOMBRES_BIOMA_NETHER = { "Desiertos del Nether", "Bosque carmesí", "Bosque distorsionado", "Valle de almas", "Deltas de basalto" }
D.NIEBLA_NETHER = { 0x3a100a, 0x4a0808, 0x0e2a30, 0x1a2a36, 0x3a3440 }
local BN = D.BN

------------------------------------------------------------------
-- Rejilla de densidad (Float32Array en el juego web)
------------------------------------------------------------------
local GR = 4
local GNY = CY // GR + 1
local rejN = buffer.create(5 * 5 * GNY * 4)
local function rej(i)
	return buffer.readf32(rejN, i * 4)
end
local function muestraRejilla(x, y, z)
	local gx, gy, gz = x / GR, y / GR, z / GR
	local x0, y0, z0 = min(3, floor(gx)), min(GNY - 2, floor(gy)), min(3, floor(gz))
	local fx, fy, fz = gx - x0, gy - y0, gz - z0
	local b0 = (y0 * 5 + z0) * 5 + x0
	local b1 = b0 + 25
	local v000, v100, v001, v101 = rej(b0), rej(b0 + 1), rej(b0 + 5), rej(b0 + 6)
	local v010, v110, v011, v111 = rej(b1), rej(b1 + 1), rej(b1 + 5), rej(b1 + 6)
	local a0 = v000 + (v100 - v000) * fx
	local a1 = v001 + (v101 - v001) * fx
	local a = a0 + (a1 - a0) * fz
	local c0 = v010 + (v110 - v010) * fx
	local c1 = v011 + (v111 - v011) * fx
	local c = c0 + (c1 - c0) * fz
	return a + (c - a) * fy
end

------------------------------------------------------------------
-- Nether
------------------------------------------------------------------
function D.biomaNether(semilla, x, z)
	local s = semilla + 7100
	local v1, v2 = fbm(x * 0.009, z * 0.009, s, 3), fbm(x * 0.009, z * 0.009, s + 1, 3)
	if v1 > 0.57 then
		return BN.carmesi
	end
	if v1 < 0.43 then
		return BN.distorsionado
	end
	if v2 > 0.57 then
		return BN.valle
	end
	if v2 < 0.43 then
		return BN.deltas
	end
	return BN.desierto
end

function D.fortalezaNetherEn(semilla, rx, rz)
	local s = semilla + 8000
	if hash2(rx, rz, s) > 0.8 then
		return nil
	end
	return { x = rx * 176 + 40 + floor(hash2(rx, rz, s + 1) * 96), y = OY + 64, z = rz * 176 + 40 + floor(hash2(rx, rz, s + 2) * 96) }
end
function D.fortalezasCerca(semilla, x, z)
	local rx, rz = floor(x / 176), floor(z / 176)
	local res = {}
	for a = -1, 1 do
		for b = -1, 1 do
			local f = D.fortalezaNetherEn(semilla, rx + a, rz + b)
			if f then
				table.insert(res, f)
			end
		end
	end
	return res
end

local function bloqueFortalezaNether(x, y, z, f, semilla)
	local rx, ry, rz = x - f.x, y - f.y, z - f.z
	local L = 46
	local enX = abs(rz) <= 2 and abs(rx) <= L
	local enZ = abs(rx) <= 2 and abs(rz) <= L
	local plaza = abs(rx) <= 7 and abs(rz) <= 7
	if not (enX or enZ or plaza) then
		return -1
	end
	if ry == 0 then
		return (plaza and rx <= -4 and rx >= -6 and rz >= 4 and rz <= 6) and B.arenaAlmas or B.ladrilloNether
	end
	if ry < 0 then
		local pilar = (enX and abs(rz) <= 1 and rx % 8 == 0) or (enZ and abs(rx) <= 1 and rz % 8 == 0) or (plaza and abs(rx) == 7 and abs(rz) == 7)
		return (pilar and ry > -60) and B.ladrilloNether or -1
	end
	if ry > 5 then
		return -1
	end
	if plaza then
		local borde = abs(rx) == 7 or abs(rz) == 7
		local abertura = (abs(rx) <= 2 and abs(rz) == 7) or (abs(rz) <= 2 and abs(rx) == 7)
		if borde and not abertura then
			return ry <= 2 and B.ladrilloNether or 0
		end
		if ry == 1 and rx == 0 and rz == 0 then
			return B.generador
		end
		if ry == 1 and rx == 5 and rz == 5 then
			return B.cofre
		end
		if ry == 1 and rx <= -4 and rx >= -6 and rz >= 4 and rz <= 6 then
			return B.verruga0 + floor(hash3(x, y, z, semilla) * 4)
		end
		if ry == 5 then
			return B.ladrilloNether
		end
		return 0
	end
	local lado = enX and abs(rz) == 2 or (not enX and abs(rx) == 2)
	if lado then
		return ry == 1 and B.ladrilloNether or 0
	end
	local extremo = enX and abs(rx) == L or (not enX and abs(rz) == L)
	if extremo and ry == 1 and (rx == 0 or rz == 0) then
		return B.generador
	end
	return 0
end

-- Bastión en ruinas (estructuras27.js)
local BAST = 26
function D.bastionEn(semilla, rx, rz)
	local s = semilla + 27600
	if hash2(rx, rz, s) > 0.45 then
		return nil
	end
	return { x = rx * 240 + 60 + floor(hash2(rx, rz, s + 1) * 120), z = rz * 240 + 60 + floor(hash2(rx, rz, s + 2) * 120), y = OY + 36 }
end
function D.bastionesCerca(semilla, x, z)
	local rx, rz = floor(x / 240), floor(z / 240)
	local res = {}
	for a = -1, 1 do
		for b = -1, 1 do
			local m = D.bastionEn(semilla, rx + a, rz + b)
			if m then
				table.insert(res, m)
			end
		end
	end
	return res
end
local function bloqueBastion(lx, y, lz, Bs, cofres, semilla)
	local rel = y - Bs.y
	local h = hash3(Bs.x + lx, y, Bs.z + lz, semilla + 27601)
	if rel < -3 or rel > 16 then
		return -1
	end
	if rel < 0 then
		return B.piedraNegra
	end
	local perim = lx == 0 or lx == BAST - 1 or lz == 0 or lz == BAST - 1
	local dentroPatio = lx > 7 and lx < 18 and lz > 7 and lz < 18
	if rel == 0 then
		return (dentroPatio and lx > 10 and lx < 15 and lz > 10 and lz < 15) and (h < 0.5 and B.bloqueOro or B.piedraNegra) or B.piedraNegra
	end
	if perim then
		if h < 0.08 and rel > 6 then
			return 0
		end
		return rel % 5 == 0 and B.basalto or B.piedraNegra
	end
	if rel == 6 or rel == 11 then
		if dentroPatio then
			return 0
		end
		return h < 0.05 and 0 or B.piedraNegra
	end
	if (lx == 7 or lx == 18 or lz == 7 or lz == 18) and not ((lx == 12 or lx == 13 or lz == 12 or lz == 13) and (rel % 6) < 4) then
		return (rel > 11 and h < 0.3) and 0 or B.piedraNegra
	end
	if dentroPatio and rel == 1 and lx == 12 and lz == 12 then
		table.insert(cofres, { lx, y, lz })
		return B.cofre
	end
	if rel == 1 and not dentroPatio and h < 0.01 then
		table.insert(cofres, { lx, y, lz })
		return B.cofre
	end
	if rel == 1 and dentroPatio and h < 0.1 then
		return B.bloqueOro
	end
	if rel == 7 and not dentroPatio and h < 0.02 then
		return B.lava
	end
	return 0
end

local function estructurasNether(datos, cx, cz, semilla, cofres)
	local bx, bz = cx * CX, cz * CZ
	for _, f in D.fortalezasCerca(semilla, bx + 8, bz + 8) do
		if bx + CX < f.x - 50 or bx > f.x + 50 or bz + CZ < f.z - 50 or bz > f.z + 50 then
			continue
		end
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				for y = f.y - 60, f.y + 5 do
					local b = bloqueFortalezaNether(bx + x, y, bz + z, f, semilla)
					if b >= 0 then
						wr(datos, idx(x, y, z), b)
						if b == B.cofre then
							table.insert(cofres, { bx + x, y, bz + z, "fortalezaNether" })
						end
					end
				end
			end
		end
	end
	for _, Bs in D.bastionesCerca(semilla, bx + 8, bz + 8) do
		if bx + CX <= Bs.x or bx >= Bs.x + BAST or bz + CZ <= Bs.z or bz >= Bs.z + BAST then
			continue
		end
		local cf = {}
		for x = max(bx, Bs.x), min(bx + CX, Bs.x + BAST) - 1 do
			for z = max(bz, Bs.z), min(bz + CZ, Bs.z + BAST) - 1 do
				for y = Bs.y - 3, Bs.y + 16 do
					local b = bloqueBastion(x - Bs.x, y, z - Bs.z, Bs, cf, semilla)
					if b >= 0 then
						wr(datos, idx(x - bx, y, z - bz), b)
					end
				end
			end
		end
		for _, q in cf do
			table.insert(cofres, { Bs.x + q[1], q[2], Bs.z + q[3], "bastion" })
		end
	end
end

function D.generarNether(datos, cx, cz, semilla)
	local bx, bz = cx * CX, cz * CZ
	local s = semilla + 7000
	local cofres = {}
	for gx = 0, 4 do
		for gz = 0, 4 do
			for gy = 0, GNY - 1 do
				local x, z, y = bx + gx * GR, bz + gz * GR, gy * GR
				buffer.writef32(rejN, ((gy * 5 + gz) * 5 + gx) * 4, valueNoise3(x / 26, y / 16, z / 26, s) * 0.7 + valueNoise3(x / 9, y / 9, z / 9, s + 1) * 0.3)
			end
		end
	end
	local biomaN = buffer.create(256)
	local Bl = {
		lecho = B.lecho, netherrack = B.netherrack, basalto = B.basalto, piedraNegra = B.piedraNegra, arenaAlmas = B.arenaAlmas,
		sueloAlmas = B.sueloAlmas, menaCuarzo = B.menaCuarzo, menaOroNether = B.menaOroNether, bloqueMagma = B.bloqueMagma, lava = B.lava,
	}
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local wx, wz = bx + x, bz + z
			local bio = D.biomaNether(semilla, wx, wz)
			buffer.writeu8(biomaN, z * CX + x, bio)
			local almas = fbm(wx * 0.04, wz * 0.04, s + 5, 2) > 0.6
			for y = OY, CY - 1 do
				local id = 0
				if y <= OY + 4 and (y == OY or hash3(wx, y, wz, s + 2) < (OY + 5 - y) / 5) then
					id = Bl.lecho
				elseif y >= CY - 5 and (y == CY - 1 or hash3(wx, y, wz, s + 3) < (y - (CY - 6)) / 5) then
					id = Bl.lecho
				else
					local t = (y - OY) / 127
					local d = muestraRejilla(x, y, z) + max(0, 0.24 - t) * 3 + max(0, t - 0.8) * 3
					if d > 0.6 then
						id = Bl.netherrack
						local r = hash3(wx, y, wz, s + 4)
						if bio == BN.deltas then
							id = r < 0.45 and Bl.basalto or r < 0.9 and Bl.piedraNegra or Bl.netherrack
						elseif bio == BN.valle and y < OY + 60 then
							id = r < 0.5 and Bl.arenaAlmas or Bl.sueloAlmas
						elseif almas and y < OY + 45 and bio == BN.desierto then
							id = Bl.arenaAlmas
						end
						if id == Bl.netherrack or id == Bl.piedraNegra then
							if hash3(wx // 2, y // 2, wz // 2, s + 6) < 0.03 and r < 0.6 then
								id = Bl.menaCuarzo
							elseif hash3(wx // 2, y // 2, wz // 2, s + 7) < 0.012 and r < 0.5 then
								id = Bl.menaOroNether
							end
						end
					elseif y <= OY + 31 then
						id = (bio == BN.deltas and hash3(wx, y, wz, s + 9) < 0.3 and y == OY + 31) and Bl.bloqueMagma or Bl.lava
					end
				end
				if id ~= 0 then
					wr(datos, idx(x, y, z), id)
				end
			end
		end
	end
	-- Restos ancestrales
	local rdm = mulberry32(floor(hash2(cx, cz, s + 60) * 4294967296))
	for _ = 0, 1 do
		local x, z = floor(rdm() * 16), floor(rdm() * 16)
		local y = OY + 8 + redondear((rdm() + rdm()) / 2 * 14)
		local n = rdm() < 0.35 and 2 or 1
		for q = 0, n - 1 do
			local X = min(15, x + q)
			local i = idx(X, y, z)
			local b = rd(datos, i)
			if b == B.netherrack or b == B.basalto or b == B.piedraNegra then
				wr(datos, i, B.restosAncestrales)
			end
		end
	end
	-- Superficies y vegetación
	local r = mulberry32(floor(hash2(cx, cz, s + 50) * 4294967296))
	local function hongoGigante(x, y, z, dist)
		local alto = 4 + floor(r() * 5)
		local tallo = dist and B.talloDistorsionado or B.talloCarmesi
		local verr = dist and B.verrugaDistBloque or B.verrugaBloque
		local function set(X, Y, Z, id, solo)
			if X < 0 or Z < 0 or X >= CX or Z >= CZ or Y >= CY - 5 then
				return
			end
			local i = idx(X, Y, Z)
			if solo and rd(datos, i) ~= 0 then
				return
			end
			wr(datos, i, id)
		end
		for k = 1, alto do
			set(x, y + k, z, tallo, false)
		end
		local rad = 2 + floor(r() * 2)
		for dy = -2, 1 do
			for dx = -rad, rad do
				for dz = -rad, rad do
					local borde = abs(dx) == rad or abs(dz) == rad
					if dy == 1 and (abs(dx) > rad - 1 or abs(dz) > rad - 1) then
						continue
					end
					if dy < 1 and not borde then
						continue
					end
					if dy < 0 and r() < 0.4 then
						continue
					end
					set(x + dx, y + alto + dy, z + dz, r() < 0.08 and B.luzHongo or verr, true)
				end
			end
		end
	end
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local bio = buffer.readu8(biomaN, z * CX + x)
			for y = OY + 6, CY - 9 do
				local i = idx(x, y, z)
				local abajo = rd(datos, idx(x, y - 1, z))
				if rd(datos, i) ~= 0 or abajo == 0 or esLiquido(abajo) or abajo == B.lecho then
					continue
				end
				if bio == BN.carmesi and abajo == B.netherrack then
					wr(datos, idx(x, y - 1, z), B.nilioCarmesi)
				end
				if bio == BN.distorsionado and abajo == B.netherrack then
					wr(datos, idx(x, y - 1, z), B.nilioDistorsionado)
				end
				local rr = r()
				if bio == BN.carmesi or bio == BN.distorsionado then
					local dist = bio == BN.distorsionado
					local libre = x > 2 and x < 13 and z > 2 and z < 13 and rr < 0.065
					local k = 0
					while libre and k < 11 do
						if y + k >= CY - 6 or rd(datos, idx(x, y + k, z)) ~= 0 then
							libre = false
						end
						k += 1
					end
					if libre then
						hongoGigante(x, y - 1, z, dist)
					elseif rr < 0.15 then
						wr(datos, i, dist and B.raicesDist or B.raicesCarmesi)
					elseif rr < 0.2 then
						wr(datos, i, dist and B.hongoDist or B.hongoCarmesi)
					end
				elseif bio == BN.deltas then
					if rr < 0.03 then
						local h = 2 + floor(r() * 5)
						local k = 0
						while k < h and rd(datos, idx(x, y + k, z)) == 0 do
							wr(datos, idx(x, y + k, z), B.basalto)
							k += 1
						end
					elseif rr < 0.12 and abajo ~= B.lava then
						wr(datos, idx(x, y - 1, z), B.bloqueMagma)
					end
				elseif bio == BN.valle then
					if rr < 0.006 then
						local h = 3 + floor(r() * 4)
						local k = 0
						while k < h and rd(datos, idx(x, y + k, z)) == 0 do
							wr(datos, idx(x, y + k, z), B.bloqueHueso)
							k += 1
						end
					elseif rr < 0.02 and (abajo == B.arenaAlmas or abajo == B.sueloAlmas) then
						wr(datos, i, B.fuegoAlmas)
					end
				elseif rr < 0.004 and abajo == B.netherrack then
					wr(datos, i, B.fuego)
				end
			end
		end
	end
	-- Piedra luminosa colgando del techo
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			for y = OY + 80, CY - 7 do
				local i = idx(x, y, z)
				if rd(datos, i) == 0 and rd(datos, idx(x, y + 1, z)) == B.netherrack and hash3(bx + x, y, bz + z, s + 8) < 0.006 then
					local n = 2 + floor(hash3(bx + x, y, bz + z, s + 9) * 5)
					for k = 0, n - 1 do
						local dx = k ~= 0 and floor(hash3(k, x, y, s) * 3) - 1 or 0
						local dz = k ~= 0 and floor(hash3(k, z, y, s + 1) * 3) - 1 or 0
						local dy = -floor(k / 2)
						local X, Z, Y = x + dx, z + dz, y + dy
						if X < 0 or Z < 0 or X >= CX or Z >= CZ then
							continue
						end
						if rd(datos, idx(X, Y, Z)) == 0 then
							wr(datos, idx(X, Y, Z), B.piedraLuminosa)
						end
					end
				end
			end
		end
	end
	-- Cascadas de lava
	for k = 0, 1 do
		if hash2(cx * 7 + k, cz, s + 80) > 0.28 then
			continue
		end
		local x = 1 + floor(hash2(cx, cz * 5 + k, s + 81) * 14)
		local z = 1 + floor(hash2(cx + k, cz, s + 82) * 14)
		for y = CY - 7, OY + 41, -1 do
			local i = idx(x, y, z)
			if rd(datos, i) ~= 0 or rd(datos, idx(x, y + 1, z)) ~= B.netherrack then
				continue
			end
			local fondo = y
			while fondo > OY + 6 and rd(datos, idx(x, fondo - 1, z)) == 0 do
				fondo -= 1
			end
			if y - fondo < 6 then
				break
			end
			wr(datos, idx(x, y + 1, z), B.lava)
			for yy = y, fondo, -1 do
				wr(datos, idx(x, yy, z), B.lava + 1)
			end
			break
		end
	end
	estructurasNether(datos, cx, cz, semilla, cofres)
	-- Ghasts secos en el valle de almas
	if hash2(cx, cz, s + 70) < 0.12 then
		local x = 2 + floor(hash2(cx, cz, s + 71) * 12)
		local z = 2 + floor(hash2(cx, cz, s + 72) * 12)
		if buffer.readu8(biomaN, z * CX + x) == BN.valle then
			for y = OY + 34, OY + 89 do
				local a, b = rd(datos, idx(x, y, z)), rd(datos, idx(x, y + 1, z))
				if (a == B.arenaAlmas or a == B.sueloAlmas) and b == 0 then
					wr(datos, idx(x, y + 1, z), B.ghastSeco)
					break
				end
			end
		end
	end
	Estructuras.desgastar(datos, cx, cz, semilla, false)
	return biomaN, cofres
end

------------------------------------------------------------------
-- End
------------------------------------------------------------------
local END_TOP = OY + 60
local EPY = END_TOP + 3
D.END_TOP, D.EPY = END_TOP, EPY
local PILARES = {}
for i = 0, 9 do
	local a = math.pi * 2 * i / 10 + 0.3
	PILARES[i + 1] = { x = redondear(math.cos(a) * 42), z = redondear(math.sin(a) * 42), r = 2 + (i * 7) % 4, alto = OY + 76 + 3 * ((i * 3) % 10) }
end
D.PILARES = PILARES

function D.salidaAcceso(semilla)
	local a = (semilla % 628) / 100
	return redondear(math.cos(a) * 1000), redondear(math.sin(a) * 1000)
end

local function columnaEnd(wx, wz, semilla)
	local s = semilla + 9100
	local m = fbm(wx * 0.011, wz * 0.011, s, 3) * 1.25 - 0.62 + fbm(wx * 0.04, wz * 0.04, s + 3, 2) * 0.12
	local px, pz = D.salidaAcceso(semilla)
	local dp = hypot(wx - px, wz - pz)
	if dp < 24 then
		m = max(m, 0.28 * (1 - dp / 24) + 0.05)
	end
	if m <= 0 then
		return nil
	end
	local top = END_TOP - 4 + redondear(m * 14 + fbm(wx * 0.06, wz * 0.06, s + 5, 2) * 2)
	return { top = top, bot = top - redondear(3 + m * 55), m = m }
end
D.columnaEnd = columnaEnd

local function generarIslaExterior(datos, x, z, wx, wz, semilla)
	local c = columnaEnd(wx, wz, semilla)
	if not c then
		return
	end
	for y = max(1, c.bot), c.top do
		wr(datos, idx(x, y, z), B.piedraEnd)
	end
	if c.m > 0.08 and hash2(wx, wz, semilla + 77) < 0.004 then
		local r = mulberry32(floor(hash2(wx, wz, semilla + 78) * 1e9))
		local alto = 3 + floor(r() * 5)
		for y = 1, alto do
			wr(datos, idx(x, c.top + y, z), B.plantaCoro)
		end
		wr(datos, idx(x, c.top + alto + 1, z), B.florCoro)
		for _ = 0, 2 do
			if r() < 0.5 then
				continue
			end
			local d = DIRF[floor(r() * 4) + 1]
			local nx, nz = x + d[1], z + d[2]
			if nx < 0 or nx >= CX or nz < 0 or nz >= CZ then
				continue
			end
			local y0 = c.top + 2 + floor(r() * (alto - 1))
			local l = 1 + floor(r() * 3)
			for y = y0, y0 + l - 1 do
				wr(datos, idx(nx, y, nz), B.plantaCoro)
			end
			wr(datos, idx(nx, y0 + l, nz), B.florCoro)
		end
	end
end

function D.ciudadesCerca(semilla, cx, cz)
	local res = {}
	local R = 96
	local x0, x1 = floor((cx * CX - 60) / R), floor((cx * CX + CX + 60) / R)
	local z0, z1 = floor((cz * CZ - 60) / R), floor((cz * CZ + CZ + 60) / R)
	for rx = x0, x1 do
		for rz = z0, z1 do
			local h = hash2(rx, rz, semilla + 555)
			if h > 0.55 then
				continue
			end
			local x = rx * R + 16 + floor(hash2(rx, rz, semilla + 556) * 64)
			local z = rz * R + 16 + floor(hash2(rx, rz, semilla + 557) * 64)
			if hypot(x, z) < 750 then
				continue
			end
			local c = columnaEnd(x, z, semilla)
			if not c or c.m < 0.1 then
				continue
			end
			table.insert(res, { x = x, z = z, y = c.top + 1, alto = 14 + floor(hash2(rx, rz, semilla + 558) * 14) })
		end
	end
	return res
end
function D.datosCiudadEnd(c, semilla)
	local t = c.y + 4 + c.alto
	local barco = hash2(c.x, c.z, semilla + 559) < 0.65
	return { t = t, barco = barco, bx = c.x - 26, by = t + 8, bz = c.z }
end

local function construirCiudadEnd(datos, cx, cz, semilla, cofres)
	local bx, bz = cx * CX, cz * CZ
	for _, c in D.ciudadesCerca(semilla, cx, cz) do
		local function pon(x, y, z, b)
			local lx, lz = x - bx, z - bz
			if lx < 0 or lx >= CX or lz < 0 or lz >= CZ or y < 1 or y >= CY then
				return
			end
			wr(datos, idx(lx, y, lz), b)
			if b == B.cofre then
				table.insert(cofres, { x, y, z, "ciudadEnd" })
			end
		end
		local function caja(x0, y0, z0, x1, y1, z1, borde, dentro)
			for x = x0, x1 do
				for y = y0, y1 do
					for z = z0, z1 do
						local b = x == x0 or x == x1 or z == z0 or z == z1 or y == y0 or y == y1
						pon(x, y, z, b and borde or dentro)
					end
				end
			end
		end
		local VM = VIDRIO_COLOR(10)
		local Dt = D.datosCiudadEnd(c, semilla)
		local t = Dt.t
		local function esquinas(x0, z0, x1, z1, y0, y1, b)
			for y = y0, y1 do
				for _, q in { { x0, z0 }, { x1, z0 }, { x0, z1 }, { x1, z1 } } do
					pon(q[1], y, q[2], b)
				end
			end
		end
		local function varas(x0, z0, x1, z1, y)
			for _, q in { { x0, z0, -1, -1 }, { x1, z0, 1, -1 }, { x0, z1, -1, 1 }, { x1, z1, 1, 1 } } do
				pon(q[1] + q[3], y, q[2], B.varaEnd)
				pon(q[1], y, q[2] + q[4], B.varaEnd)
			end
		end
		for x = c.x - 7, c.x + 7 do
			for z = c.z - 7, c.z + 7 do
				local d = max(abs(x - c.x), abs(z - c.z))
				for y = c.y - 6, c.y - 1 do
					if d <= 7 - max(0, c.y - 1 - y) then
						pon(x, y, z, B.ladrillosEnd)
					end
				end
			end
		end
		caja(c.x - 5, c.y, c.z - 5, c.x + 5, c.y + 4, c.z + 5, B.purpur, 0)
		esquinas(c.x - 5, c.z - 5, c.x + 5, c.z + 5, c.y, c.y + 4, B.pilarPurpur)
		for x = c.x - 4, c.x + 4 do
			for z = c.z - 4, c.z + 4 do
				pon(x, c.y, z, bit32.band(x + z, 1) ~= 0 and B.ladrillosEnd or B.purpur)
			end
		end
		for _, dx in { -2, 2 } do
			for _, dz in { -5, 5 } do
				pon(c.x + dx, c.y + 2, c.z + dz, VM)
				pon(c.x + dx, c.y + 3, c.z + dz, VM)
			end
		end
		for y = c.y + 1, c.y + 3 do
			pon(c.x, y, c.z - 5, 0)
			pon(c.x - 1, y, c.z - 5, 0)
		end
		varas(c.x - 5, c.z - 5, c.x + 5, c.z + 5, c.y + 4)
		local r, y0 = 3, c.y + 4
		caja(c.x - r, y0, c.z - r, c.x + r, t, c.z + r, B.purpur, 0)
		esquinas(c.x - r, c.z - r, c.x + r, c.z + r, y0, t, B.pilarPurpur)
		for y = y0, t - 1 do
			pon(c.x + r - 1, y, c.z, 146)
		end
		local y = y0 + 5
		while y < t do
			for x = c.x - r + 1, c.x + r - 1 do
				for z = c.z - r + 1, c.z + r - 1 do
					if x ~= c.x + r - 1 or z ~= c.z then
						pon(x, y, z, B.purpur)
					end
				end
			end
			for _, q in { { c.x - r, c.z }, { c.x, c.z + r }, { c.x, c.z - r } } do
				pon(q[1], y + 2, q[2], VM)
				pon(q[1], y + 3, q[2], VM)
			end
			varas(c.x - r, c.z - r, c.x + r, c.z + r, y)
			y += 5
		end
		local ym = y0 + 5 * max(1, floor(c.alto / 10))
		for x = c.x + r, c.x + r + 9 do
			for z = c.z - 1, c.z + 1 do
				pon(x, ym, z, B.purpur)
				if abs(z - c.z) == 1 then
					pon(x, ym + 1, z, B.ladrillosEnd)
				end
			end
		end
		for yy = ym + 1, ym + 2 do
			pon(c.x + r, yy, c.z, 0)
		end
		local sx = c.x + r + 12
		caja(sx - 2, ym - 6, c.z - 2, sx + 2, ym + 6, c.z + 2, B.purpur, 0)
		esquinas(sx - 2, c.z - 2, sx + 2, c.z + 2, ym - 6, ym + 6, B.pilarPurpur)
		for yy = ym + 1, ym + 2 do
			pon(sx - 2, yy, c.z, 0)
		end
		for x = sx - 1, sx + 1 do
			for z = c.z - 1, c.z + 1 do
				pon(x, ym, z, B.purpur)
			end
		end
		pon(sx, ym + 1, c.z + 1, B.cofre)
		pon(sx + 1, ym + 1, c.z - 1, B.varaEnd)
		for yy = ym + 7, ym + 9 do
			pon(sx, yy, c.z, yy == ym + 9 and B.varaEnd or B.pilarPurpur)
		end
		varas(sx - 2, c.z - 2, sx + 2, c.z + 2, ym + 6)
		caja(c.x - 5, t, c.z - 5, c.x + 5, t + 6, c.z + 5, B.purpur, 0)
		for x = c.x - 4, c.x + 4 do
			for z = c.z - 4, c.z + 4 do
				pon(x, t, z, (abs(x - c.x) + abs(z - c.z)) % 3 == 0 and B.purpur or B.ladrillosEnd)
			end
		end
		pon(c.x + r - 1, t, c.z, 0)
		for k = -3, 3 do
			for _, q in { { c.x + k, c.z - 5 }, { c.x + k, c.z + 5 }, { c.x - 5, c.z + k }, { c.x + 5, c.z + k } } do
				pon(q[1], t + 3, q[2], VM)
				if abs(k) <= 1 then
					pon(q[1], t + 4, q[2], VM)
				end
			end
		end
		esquinas(c.x - 5, c.z - 5, c.x + 5, c.z + 5, t, t + 6, B.pilarPurpur)
		for L = 0, 5 do
			for x = c.x - 5 + L, c.x + 5 - L do
				for z = c.z - 5 + L, c.z + 5 - L do
					if x == c.x - 5 + L or x == c.x + 5 - L or z == c.z - 5 + L or z == c.z + 5 - L then
						pon(x, t + 7 + L, z, B.purpur)
					end
				end
			end
		end
		for yy = t + 13, t + 15 do
			pon(c.x, yy, c.z, B.varaEnd)
		end
		for _, q in { { -4, -4 }, { 4, -4 }, { -4, 4 }, { 4, 4 } } do
			pon(c.x + q[1], t + 1, c.z + q[2], B.varaEnd)
		end
		pon(c.x - 2, t + 1, c.z + 4, B.cofre)
		pon(c.x + 2, t + 1, c.z + 4, B.cofre)
		if not Dt.barco then
			pon(c.x, t + 1, c.z, B.obsidiana)
			pon(c.x, t + 2, c.z, B.cofre)
			-- Este cofre guarda los élitros
			if c.x - bx >= 0 and c.x - bx < CX and c.z - bz >= 0 and c.z - bz < CZ then
				cofres[#cofres][4] = "elitros"
			end
		end
		if Dt.barco then
			local X0, Y, Z = Dt.bx - 10, Dt.by, Dt.bz
			for u = 0, 21 do
				local w = u < 3 and 1 or u > 17 and max(0, 21 - u) or 3
				local x = X0 + u
				for v = -w, w do
					pon(x, Y, Z + v, B.purpur)
					if abs(v) == w then
						pon(x, Y + 1, Z + v, B.purpur)
						if u % 3 == 0 then
							pon(x, Y + 2, Z + v, B.varaEnd)
						end
					else
						pon(x, Y + 1, Z + v, 0)
					end
					if abs(v) < w and u > 2 and u < 18 then
						pon(x, Y - 1, Z + v, B.purpur)
						if abs(v) < w - 1 then
							pon(x, Y - 2, Z + v, B.obsidiana)
						end
					end
				end
			end
			for x = X0 + 6, X0 + 14 do
				for z = Z - 2, Z + 2 do
					for yy = Y - 3, Y - 1 do
						local borde = x == X0 + 6 or x == X0 + 14 or abs(z - Z) == 2 or yy == Y - 3
						pon(x, yy, z, borde and B.ladrillosEnd or 0)
					end
				end
			end
			pon(X0 + 10, Y, Z, 0)
			for yy = Y - 2, Y do
				pon(X0 + 10, yy, Z + 1, 146)
			end
			pon(X0 + 8, Y - 2, Z - 1, B.cofre)
			pon(X0 + 12, Y - 2, Z - 1, B.cofre)
			pon(X0 + 7, Y - 2, Z + 1, B.varaEnd)
			pon(X0 + 13, Y - 2, Z + 1, B.varaEnd)
			for yy = Y + 1, Y + 12 do
				pon(X0 + 10, yy, Z, B.pilarPurpur)
			end
			for yy = Y + 5, Y + 10 do
				for v = -3, 3 do
					if v ~= 0 then
						pon(X0 + 10, yy, Z + v, LANA_COLOR(15))
					end
				end
			end
			for yy = Y + 1, Y + 4 do
				pon(X0 + 17, yy, Z, B.pilarPurpur)
			end
			for yy = Y + 2, Y + 4 do
				for v = -2, 2 do
					if v ~= 0 then
						pon(X0 + 17, yy, Z + v, LANA_COLOR(15))
					end
				end
			end
			pon(X0 + 21, Y + 1, Z, B.cabezaDragon)
		end
		-- Segunda rama con sala colgante y estandartes (v26.js)
		local MAG = LANA_COLOR(2)
		local ym2 = min(t - 4, y0 + 5 * max(2, floor(c.alto / 7)))
		for z = c.z - r - 10, c.z - r do
			for x = c.x - 1, c.x + 1 do
				pon(x, ym2, z, B.purpur)
				if abs(x - c.x) == 1 then
					pon(x, ym2 + 1, z, B.ladrillosEnd)
				end
			end
		end
		for yy = ym2 + 1, ym2 + 2 do
			pon(c.x, yy, c.z - r, 0)
		end
		local sz = c.z - r - 14
		for x = c.x - 3, c.x + 3 do
			for z = sz - 3, sz + 3 do
				for yy = ym2, ym2 + 5 do
					local borde = abs(x - c.x) == 3 or abs(z - sz) == 3
					local techo, suelo = yy == ym2 + 5, yy == ym2
					local b
					if suelo then
						b = bit32.band(x + z, 1) ~= 0 and B.ladrillosEnd or B.purpur
					elseif techo or borde then
						b = (abs(x - c.x) == 3 and abs(z - sz) == 3) and B.pilarPurpur or B.purpur
					else
						b = 0
					end
					pon(x, yy, z, b)
				end
			end
		end
		for k = -1, 1 do
			pon(c.x + k, ym2 + 2, sz - 3, VM)
			pon(c.x + k, ym2 + 3, sz - 3, VM)
			pon(c.x - 3, ym2 + 2, sz + k, VM)
			pon(c.x + 3, ym2 + 2, sz + k, VM)
		end
		for yy = ym2 + 1, ym2 + 2 do
			pon(c.x, yy, sz + 3, 0)
		end
		pon(c.x + 2, ym2 + 1, sz - 2, B.cofre)
		pon(c.x - 2, ym2 + 1, sz - 2, B.varaEnd)
		local negra = BR.lanaNegra or MAG
		for _, q in { { c.x - 3, sz - 4 }, { c.x + 3, sz - 4 }, { c.x - 4, sz }, { c.x + 4, sz } } do
			for yy = ym2 + 1, ym2 + 3 do
				pon(q[1], yy, q[2], yy == ym2 + 1 and negra or MAG)
			end
		end
		for _, q in { { c.x - 6, c.z }, { c.x + 6, c.z }, { c.x, c.z + 6 } } do
			for yy = t + 2, t + 4 do
				pon(q[1], yy, q[2], yy == t + 2 and LANA_COLOR(15) or MAG)
			end
		end
		for yy = ym2 - 3, ym2 - 1 do
			pon(c.x, yy, sz, B.varaEnd)
		end
	end
end

function D.generarEnd(datos, cx, cz, semilla)
	local bx, bz = cx * CX, cz * CZ
	local s = semilla + 9000
	local cofres = {}
	for z = 0, CZ - 1 do
		for x = 0, CX - 1 do
			local wx, wz = bx + x, bz + z
			local d = hypot(wx, wz)
			local R = 76 + fbm(wx * 0.02, wz * 0.02, s, 2) * 26
			if d < R then
				local f = 1 - d / R
				local top = END_TOP + redondear(f * 3 + fbm(wx * 0.08, wz * 0.08, s + 1, 2) * 2)
				local bot = top - redondear(4 + f * 46 * (0.6 + 0.4 * fbm(wx * 0.05, wz * 0.05, s + 2, 2)))
				for y = bot, top do
					wr(datos, idx(x, y, z), B.piedraEnd)
				end
			end
			for _, p in PILARES do
				local dd = (wx - p.x) ^ 2 + (wz - p.z) ^ 2
				if dd <= p.r * p.r + p.r * 0.5 then
					for y = END_TOP - 20, p.alto do
						wr(datos, idx(x, y, z), B.obsidiana)
					end
				end
				if wx == p.x and wz == p.z then
					wr(datos, idx(x, p.alto + 1, z), B.lecho)
				end
			end
			local r = hypot(wx, wz)
			if r < 3.5 then
				wr(datos, idx(x, EPY, z), B.lecho)
				for y = EPY + 1, EPY + 8 do
					wr(datos, idx(x, y, z), 0)
				end
				if r >= 2.5 then
					wr(datos, idx(x, EPY + 1, z), B.lecho)
				end
				if wx == 0 and wz == 0 then
					for y = EPY + 1, EPY + 4 do
						wr(datos, idx(x, y, z), B.lecho)
					end
				end
			end
			if d > 600 then
				generarIslaExterior(datos, x, z, wx, wz, semilla)
			end
			if abs(wx - 100) <= 2 and abs(wz) <= 2 then
				wr(datos, idx(x, OY + 48, z), B.obsidiana)
				for y = OY + 49, OY + 51 do
					wr(datos, idx(x, y, z), 0)
				end
			end
		end
	end
	if hypot(bx + 8, bz + 8) > 620 then
		construirCiudadEnd(datos, cx, cz, semilla, cofres)
	end
	return cofres
end

return D
