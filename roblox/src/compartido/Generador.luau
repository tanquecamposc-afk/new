--[[
	Blockverse para Roblox · Generador del mundo
	Crea el terreno de cada chunk con ruido: llanuras, bosques,
	desiertos, nieve y montañas, cuevas, menas, árboles, cactus,
	flores, lagos y mares. Siempre da lo mismo con la misma semilla.
	Los datos de un chunk son un buffer de 16 × 16 × ALTO bytes:
	índice = (y * 16 + z) * 16 + x
]]
local Config = require(script.Parent.Config)
local Bloques = require(script.Parent.Bloques)

local C, ALTO, MAR = Config.CHUNK, Config.ALTO, Config.NIVEL_MAR
local ID = Bloques.porClave

local Generador = {}
Generador.__index = Generador

local function idx(x, y, z)
	return (y * C + z) * C + x
end
Generador.idx = idx

-- Número pseudoaleatorio fijo para cada posición (0 a 1)
local function hash(x, y, z, s)
	local h = (x * 73856093) % 4294967296
	h = bit32.bxor(h, (y * 19349663) % 4294967296)
	h = bit32.bxor(h, (z * 83492791) % 4294967296)
	h = bit32.bxor(h, s)
	h = bit32.bxor(h, bit32.rshift(h, 13))
	h = (h * 1664525 + 1013904223) % 4294967296
	h = bit32.bxor(h, bit32.rshift(h, 16))
	h = (h * 1664525 + 1013904223) % 4294967296
	return h / 4294967296
end
Generador.hash = hash

function Generador.new(semilla)
	local self = setmetatable({}, Generador)
	self.semilla = semilla % 1000000
	self.s32 = (semilla * 2654435761) % 4294967296
	-- Desplazamientos del ruido según la semilla
	local r = self.semilla
	self.o1 = (r % 997) * 3.17 + 0.5
	self.o2 = (r % 773) * 2.71 + 0.5
	self.o3 = (r % 541) * 1.93 + 0.5
	return self
end

-- Datos de una columna: altura del suelo y bioma
function Generador:columna(x, z)
	local o1, o2, o3 = self.o1, self.o2, self.o3
	local cont = math.noise(x / 190 + o1, z / 190 - o1, o3)
	local mont = math.noise(x / 95 - o2, z / 95 + o2, o1)
	local det = math.noise(x / 26 + o3, z / 26 + o3, o2)
	local temp = math.noise(x / 300 + o2, z / 300 + o1, 7.7)
	local hum = math.noise(x / 260 - o3, z / 260 + o2, 3.3)

	local h = 26 + cont * 26 + det * 4
	if mont > 0.12 then
		h += (mont - 0.12) * (mont - 0.12) * 260
	end
	h = math.clamp(math.floor(h), 4, ALTO - 12)

	local bioma
	if h >= 44 then
		bioma = "montana"
	elseif h <= MAR + 1 then
		bioma = temp < -0.3 and "nieve" or "playa"
	elseif temp > 0.12 and hum < 0.05 then
		bioma = "desierto"
	elseif temp < -0.28 then
		bioma = "nieve"
	elseif hum > 0.12 then
		bioma = "bosque"
	else
		bioma = "llanura"
	end
	return h, bioma
end

local function esCueva(self, x, y, z)
	local a = math.noise(x / 17 + self.o1, y / 13, z / 17 - self.o2)
	if math.abs(a) > 0.085 then
		return false
	end
	local b = math.noise(x / 21 - self.o3, y / 15 + 40, z / 21 + self.o1)
	return math.abs(b) < 0.085
end

local function mena(self, x, y, z)
	-- Las menas salen en grupitos: se decide por celdas de 2 × 2 × 2
	local cx, cy, cz = x // 2, y // 2, z // 2
	local g = hash(cx, cy, cz, self.s32)
	local p = hash(x, y, z, self.s32 + 17)
	if p > 0.62 then
		return nil
	end
	if y < 12 and g < 0.003 then
		return ID.menaDiamante
	elseif y < 22 and g < 0.012 then
		return ID.menaOro
	elseif y < 42 and g < 0.035 then
		return ID.menaHierro
	elseif y < 55 and g < 0.06 then
		return ID.menaCarbon
	end
	return nil
end

-- Rellena el buffer `datos` con el chunk (cx, cz)
function Generador:llenar(datos, cx, cz)
	local x0, z0 = cx * C, cz * C
	local alturas, biomas = table.create(C * C), table.create(C * C)
	for lz = 0, C - 1 do
		for lx = 0, C - 1 do
			local wx, wz = x0 + lx, z0 + lz
			local h, bioma = self:columna(wx, wz)
			alturas[lz * C + lx + 1] = h
			biomas[lz * C + lx + 1] = bioma

			local arriba, debajo
			if bioma == "desierto" then
				arriba, debajo = ID.arena, ID.arenisca
			elseif bioma == "playa" then
				arriba, debajo = (h < MAR - 2) and ID.grava or ID.arena, ID.arena
			elseif bioma == "nieve" then
				arriba, debajo = ID.cespedNevado, ID.tierra
			elseif bioma == "montana" then
				arriba, debajo = (h >= 52) and ID.nieve or ID.piedra, ID.piedra
			else
				arriba, debajo = ID.cesped, ID.tierra
			end
			if h < MAR and arriba == ID.cesped then
				arriba = ID.tierra
			end
			if h < MAR and arriba == ID.cespedNevado then
				arriba = ID.grava
			end

			for y = 0, h do
				local b
				if y == 0 or (y <= 2 and hash(wx, y, wz, self.s32) < 0.5) then
					b = ID.lecho
				elseif y == h then
					b = arriba
				elseif y >= h - 3 then
					b = debajo
				else
					b = mena(self, wx, y, wz) or ID.piedra
				end
				-- Cuevas (no debajo del agua ni muy cerca de la superficie)
				if Config.CUEVAS and y >= 4 and y <= h - 4 and b ~= ID.lecho and esCueva(self, wx, y, wz) then
					b = 0
				end
				buffer.writeu8(datos, idx(lx, y, lz), b)
			end
			-- Agua hasta el nivel del mar
			if h < MAR then
				for y = h + 1, MAR do
					local b = ID.agua
					if y == MAR and bioma == "nieve" then
						b = ID.hielo
					end
					buffer.writeu8(datos, idx(lx, y, lz), b)
				end
			end
		end
	end

	-- Decoración: árboles, cactus, flores (solo si cabe dentro del chunk)
	local s = self.s32 + 991
	for lz = 0, C - 1 do
		for lx = 0, C - 1 do
			local wx, wz = x0 + lx, z0 + lz
			local h = alturas[lz * C + lx + 1]
			local bioma = biomas[lz * C + lx + 1]
			local suelo = buffer.readu8(datos, idx(lx, h, lz))
			local r = hash(wx, 7, wz, s)
			local dentro = lx >= 2 and lx <= C - 3 and lz >= 2 and lz <= C - 3 and h + 10 < ALTO
			if (suelo == ID.cesped or suelo == ID.cespedNevado) and h >= MAR then
				local pArbol = (bioma == "bosque" and 0.045) or (bioma == "nieve" and 0.025) or (bioma == "llanura" and 0.005) or 0
				if dentro and r < pArbol then
					if bioma == "nieve" or (bioma == "bosque" and hash(wx, 3, wz, s) < 0.25) then
						self:abeto(datos, lx, h + 1, lz, wx, wz)
					else
						self:roble(datos, lx, h + 1, lz, wx, wz)
					end
					buffer.writeu8(datos, idx(lx, h, lz), ID.tierra)
				elseif suelo == ID.cesped and buffer.readu8(datos, idx(lx, h + 1, lz)) == 0 then
					local f = hash(wx, 11, wz, s)
					if f < 0.012 then
						buffer.writeu8(datos, idx(lx, h + 1, lz), ID.florRoja)
					elseif f < 0.024 then
						buffer.writeu8(datos, idx(lx, h + 1, lz), ID.florAmarilla)
					elseif f < 0.07 and bioma ~= "bosque" then
						buffer.writeu8(datos, idx(lx, h + 1, lz), ID.hierba)
					elseif f > 0.9985 then
						buffer.writeu8(datos, idx(lx, h + 1, lz), ID.calabaza)
					end
				end
			elseif bioma == "desierto" and suelo == ID.arena and r < 0.006 and h + 4 < ALTO then
				local alto = 1 + math.floor(hash(wx, 5, wz, s) * 3)
				for k = 1, alto do
					buffer.writeu8(datos, idx(lx, h + k, lz), ID.cactus)
				end
			end
		end
	end
end

local function ponSiAire(datos, x, y, z, b)
	if x < 0 or x >= C or z < 0 or z >= C or y < 0 or y >= ALTO then
		return
	end
	local i = idx(x, y, z)
	local a = buffer.readu8(datos, i)
	if a == 0 or a == ID.hierba or a == ID.florRoja or a == ID.florAmarilla then
		buffer.writeu8(datos, i, b)
	end
end

function Generador:roble(datos, x, y, z, wx, wz)
	local alto = 4 + math.floor(hash(wx, 1, wz, self.s32) * 3)
	local top = y + alto - 1
	for dy = -2, 1 do
		local r = (dy <= -1) and 2 or 1
		for dx = -r, r do
			for dz = -r, r do
				local esquina = math.abs(dx) == r and math.abs(dz) == r
				if not esquina or (dy <= -1 and hash(wx + dx, top + dy, wz + dz, self.s32) < 0.5) then
					ponSiAire(datos, x + dx, top + dy, z + dz, ID.hojas)
				end
			end
		end
	end
	for k = 0, alto - 1 do
		buffer.writeu8(datos, idx(x, y + k, z), ID.tronco)
	end
end

function Generador:abeto(datos, x, y, z, wx, wz)
	local alto = 6 + math.floor(hash(wx, 2, wz, self.s32) * 3)
	local top = y + alto
	ponSiAire(datos, x, top, z, ID.hojasAbeto)
	for dy = 1, alto - 2 do
		local r = (dy % 2 == 1) and 1 or math.min(2, 1 + dy // 3)
		for dx = -r, r do
			for dz = -r, r do
				if math.abs(dx) + math.abs(dz) <= r + 1 and not (math.abs(dx) == r and math.abs(dz) == r and r > 1) then
					ponSiAire(datos, x + dx, top - dy, z + dz, ID.hojasAbeto)
				end
			end
		end
	end
	for k = 0, alto - 1 do
		buffer.writeu8(datos, idx(x, y + k, z), ID.troncoAbeto)
	end
end

-- Altura del suelo según el generador (sin cambios de los jugadores)
function Generador:altura(x, z)
	local h = self:columna(x, z)
	return h
end

return Generador
