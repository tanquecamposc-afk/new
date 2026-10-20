--!native
--!optimize 2
--[[
	Blockverse para Roblox · Luz (cliente)
	Traducción de luz.js: luz del cielo y luz de bloques (0-15) con
	propagación. Cada chunk guarda su luz con un borde de un bloque
	(18 × 18 columnas), así el mallado no necesita la luz de los vecinos.
	Valor de cada celda: cielo * 16 + bloque.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp:WaitForChild("Registro"))
local MundoDatos = require(Comp:WaitForChild("MundoDatos"))

local CX, CZ, CY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY
local MARGEN = 8
local RW, RD = CX + 2 * MARGEN, CZ + 2 * MARGEN
local RCOL = RW * RD
local BW = CX + 2 -- ancho del borde guardado (18)
local BCOL = BW * BW

local Luz = {}
Luz.BW = BW
Luz.BCOL = BCOL

-- Tablas de opacidad y emisión por id (rellenas una vez)
local OPAC, EMITE = {}, {}
for id, b in Registro.bloques do
	OPAC[id] = b.opacidadLuz or 0
	EMITE[id] = b.luz or 0
end
OPAC[0], EMITE[0] = 0, 0
local MAXID = Registro.MAX_BLOQUE
local OPAC_B = buffer.create((MAXID + 1))
local EMITE_B = buffer.create((MAXID + 1))
for id = 0, MAXID do
	buffer.writeu8(OPAC_B, id, OPAC[id] or 0)
	buffer.writeu8(EMITE_B, id, EMITE[id] or 0)
end

local reg = buffer.create(RCOL * CY * 2)
local cielo = buffer.create(RCOL * CY)
local bloq = buffer.create(RCOL * CY)
local topes = table.create(RCOL, -1)
local cola = buffer.create(RCOL * CY * 4)
local COLA_MAX = RCOL * CY

local function ymaxDe(d)
	-- Altura máxima con bloques (de arriba abajo, por capas)
	for y = CY - 1, 0, -1 do
		local o = y * CX * CZ * 2
		for i = 0, CX * CZ - 1 do
			if buffer.readu16(d, o + i * 2) ~= 0 then
				return y
			end
		end
	end
	return 0
end
Luz.ymaxDe = ymaxDe

local function propagar(L, ini, fin, YM)
	local readu8, writeu8, readu16 = buffer.readu8, buffer.writeu8, buffer.readu16
	while ini < fin do
		local i = buffer.readi32(cola, ini * 4)
		ini += 1
		local l = readu8(L, i)
		if l > 1 then
			local y = i // RCOL
			local c = i - y * RCOL
			local z = c // RW
			local x = c - z * RW
			for k = 0, 5 do
				local n = -1
				if k == 0 then
					if x > 0 then
						n = i - 1
					end
				elseif k == 1 then
					if x < RW - 1 then
						n = i + 1
					end
				elseif k == 2 then
					if z > 0 then
						n = i - RW
					end
				elseif k == 3 then
					if z < RD - 1 then
						n = i + RW
					end
				elseif k == 4 then
					if y > 0 then
						n = i - RCOL
					end
				else
					if y < YM then
						n = i + RCOL
					end
				end
				if n >= 0 then
					local op = readu8(OPAC_B, readu16(reg, n * 2))
					if op < 15 then
						local nl = l - 1 - op
						if nl > readu8(L, n) then
							writeu8(L, n, nl)
							if fin < COLA_MAX then
								buffer.writei32(cola, fin * 4, n)
								fin += 1
							end
						end
					end
				end
			end
		end
	end
	return fin
end

-- Calcula la luz del chunk (cx, cz). `md` es un MundoDatos con los 3 × 3 chunks cargados.
-- Devuelve un buffer de BCOL * CY bytes (con borde de un bloque).
function Luz.calcular(md, cx, cz, conCielo, ceder)
	local readu16, writeu16, readu8, writeu8 = buffer.readu16, buffer.writeu16, buffer.readu8, buffer.writeu8
	local ymax = 0
	local vecinos = {}
	for dcx = -1, 1 do
		for dcz = -1, 1 do
			local d = md:obtener(cx + dcx, cz + dcz)
			local k = MundoDatos.clave(cx + dcx, cz + dcz)
			md._ymax = md._ymax or {}
			local ym = md._ymax[k]
			if not ym then
				ym = ymaxDe(d)
				md._ymax[k] = ym
			end
			vecinos[#vecinos + 1] = { dcx, dcz, d, ym }
			if ym > ymax then
				ymax = ym
			end
		end
	end
	local YM = math.min(CY - 1, ymax + 1)
	local tam = RCOL * (YM + 1)
	buffer.fill(reg, 0, 0, tam * 2)
	buffer.fill(cielo, 0, 0, tam)
	buffer.fill(bloq, 0, 0, tam)
	-- Copiar la región (chunk + margen de 8)
	for _, v in vecinos do
		local dcx, dcz, d, ym = v[1], v[2], v[3], v[4]
		local rx0 = dcx * CX + MARGEN
		local lx0, lx1 = math.max(0, -rx0), math.min(CX, RW - rx0)
		local rz0 = dcz * CZ + MARGEN
		local lz0, lz1 = math.max(0, -rz0), math.min(CZ, RD - rz0)
		if lx1 > lx0 and lz1 > lz0 then
			for y = 0, math.min(YM, ym) do
				for lz = lz0, lz1 - 1 do
					local src = (lx0 + lz * CX + y * CX * CZ) * 2
					local dst = ((y * RD + rz0 + lz) * RW + rx0 + lx0) * 2
					buffer.copy(reg, dst, d, src, (lx1 - lx0) * 2)
				end
			end
		end
	end
	if ceder then
		ceder()
	end
	local fin = 0
	if conCielo then
		for c = 0, RCOL - 1 do
			local l, tope = 15, -1
			for y = YM, 0, -1 do
				local i = y * RCOL + c
				local op = readu8(OPAC_B, readu16(reg, i * 2))
				if op > 0 then
					if tope < 0 then
						tope = y
					end
					l = op >= 15 and 0 or math.max(0, l - op)
				end
				writeu8(cielo, i, l)
			end
			topes[c + 1] = tope
		end
		for z = 0, RD - 1 do
			for x = 0, RW - 1 do
				local c = z * RW + x
				local m = -1
				if x > 0 then
					m = math.max(m, topes[c])
				end
				if x < RW - 1 then
					m = math.max(m, topes[c + 2])
				end
				if z > 0 then
					m = math.max(m, topes[c - RW + 1])
				end
				if z < RD - 1 then
					m = math.max(m, topes[c + RW + 1])
				end
				for y = math.min(m, YM), 0, -1 do
					local i = y * RCOL + c
					if readu8(cielo, i) > 1 and fin < COLA_MAX then
						buffer.writei32(cola, fin * 4, i)
						fin += 1
					end
				end
			end
		end
		propagar(cielo, 0, fin, YM)
	end
	if ceder then
		ceder()
	end
	fin = 0
	for i = 0, tam - 1 do
		local id = readu16(reg, i * 2)
		if id ~= 0 then
			local e = readu8(EMITE_B, id)
			if e > 0 then
				writeu8(bloq, i, e)
				buffer.writei32(cola, fin * 4, i)
				fin += 1
			end
		end
	end
	propagar(bloq, 0, fin, YM)
	-- Extraer el chunk con un borde de un bloque
	local luz = buffer.create(BCOL * CY)
	local arriba = conCielo and 240 or 0
	for y = 0, CY - 1 do
		if y > YM then
			buffer.fill(luz, y * BCOL, arriba, BCOL)
		else
			for bz = 0, BW - 1 do
				local r = (y * RD + bz - 1 + MARGEN) * RW + MARGEN - 1
				local o = y * BCOL + bz * BW
				for bx = 0, BW - 1 do
					writeu8(luz, o + bx, readu8(cielo, r + bx) * 16 + readu8(bloq, r + bx))
				end
			end
		end
	end
	return luz
end

-- Valor de luz guardado (lx, lz de -1 a 16)
function Luz.leer(luz, lx, y, lz)
	if y >= CY then
		return 240
	end
	if y < 0 then
		return 0
	end
	return buffer.readu8(luz, y * BCOL + (lz + 1) * BW + lx + 1)
end

return Luz
