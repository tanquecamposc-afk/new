--[[
	Blockverse para Roblox · Datos del mundo
	Guarda los chunks (16 × 16 × 192 bloques) y los cambios que han hecho
	los jugadores. Lo usan el servidor y el cliente: los dos generan el
	terreno con la misma semilla y solo se envían los cambios.
]]
local Generador = require(script.Parent:WaitForChild("Generador"))
local Registro = require(script.Parent:WaitForChild("Registro"))

local CX, CZ, CY = Generador.CX, Generador.CZ, Generador.CY
local TAM = CX * CZ * CY * 2
local SOLIDO = Registro.SOLIDO

local MundoDatos = {}
MundoDatos.__index = MundoDatos
MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY = CX, CZ, CY

local function clave(cx, cz)
	return (cx + 32768) * 65536 + (cz + 32768)
end
MundoDatos.clave = clave
function MundoDatos.desclave(k)
	return k // 65536 - 32768, k % 65536 - 32768
end

function MundoDatos.new(semilla, opc)
	local self = setmetatable({}, MundoDatos)
	self.semilla = semilla
	self.gen = Generador.new(semilla)
	self.datos = {} -- clave -> buffer
	self.biomas = {} -- clave -> buffer de 256 (bioma de cada columna)
	self.ediciones = {} -- clave -> {[indice] = id}
	self.alGenerar = opc and opc.alGenerar or nil -- function(cx, cz, datos) para añadir estructuras o modos
	self.vacio = opc and opc.vacio or false -- mundo vacío (One Block, Bed Wars)
	self._ucx, self._ucz, self._ubuf = math.huge, math.huge, nil
	return self
end

function MundoDatos:existe(cx, cz)
	return self.datos[clave(cx, cz)] ~= nil
end

-- Datos del chunk (lo genera si hace falta). `ceder` se llama de vez en cuando para repartir el trabajo.
function MundoDatos:obtener(cx, cz, ceder)
	local k = clave(cx, cz)
	local d = self.datos[k]
	if d then
		return d
	end
	d = buffer.create(TAM)
	local biomas, cofres
	if not self.vacio then
		biomas, cofres = self.gen:llenar(d, cx, cz, ceder)
	else
		biomas = buffer.create(256)
	end
	-- Mientras se generaba (si cedió) otro pudo crearlo
	if self.datos[k] then
		return self.datos[k]
	end
	if self.alGenerar then
		self.alGenerar(cx, cz, d)
	end
	local ed = self.ediciones[k]
	if ed then
		for i, id in ed do
			buffer.writeu16(d, i * 2, id)
		end
	end
	self.datos[k] = d
	self.biomas[k] = biomas
	-- Generadores de criaturas (mazmorras, fortaleza y cámaras de prueba)
	if self.buscarGeneradores then
		local lista = nil
		local G1, G2, G3 = self.buscarGeneradores[1], self.buscarGeneradores[2], self.buscarGeneradores[3]
		for i = 0, TAM // 2 - 1 do
			local b = buffer.readu16(d, i * 2)
			if b == G1 or b == G2 or b == G3 then
				lista = lista or {}
				table.insert(lista, { cx * CX + i % CX, i // (CX * CZ), cz * CZ + (i // CX) % CZ })
			end
		end
		self.generadores = self.generadores or {}
		self.generadores[k] = lista
	end
	if cofres and #cofres > 0 then
		-- Cofres de las estructuras: {x, y, z, tipo} para darles botín al abrirlos
		self.cofresGen = self.cofresGen or {}
		for _, c in cofres do
			self.cofresGen[c[1] .. "," .. c[2] .. "," .. c[3]] = c[4]
		end
	end
	return d
end

function MundoDatos:descargar(cx, cz)
	local k = clave(cx, cz)
	self.datos[k] = nil
	self.biomas[k] = nil
	if self._ucx == cx and self._ucz == cz then
		self._ucx = math.huge
	end
end

function MundoDatos:get(x, y, z)
	if y < 0 then
		return Registro.B.lecho
	end
	if y >= CY then
		return 0
	end
	local cx, cz = x // CX, z // CZ
	local d
	if cx == self._ucx and cz == self._ucz then
		d = self._ubuf
	else
		d = self:obtener(cx, cz)
		self._ucx, self._ucz, self._ubuf = cx, cz, d
	end
	return buffer.readu16(d, ((x - cx * CX) + (z - cz * CZ) * CX + y * CX * CZ) * 2)
end

-- Como get, pero devuelve -1 si el chunk no está cargado
function MundoDatos:getSiCargado(x, y, z)
	if y < 0 or y >= CY then
		return 0
	end
	local cx, cz = x // CX, z // CZ
	local d = self.datos[clave(cx, cz)]
	if not d then
		return -1
	end
	return buffer.readu16(d, ((x - cx * CX) + (z - cz * CZ) * CX + y * CX * CZ) * 2)
end

-- Cambia un bloque y lo apunta como edición. Devuelve el bloque anterior.
function MundoDatos:set(x, y, z, id)
	if y < 0 or y >= CY then
		return 0
	end
	local cx, cz = x // CX, z // CZ
	local k = clave(cx, cz)
	local i = (x - cx * CX) + (z - cz * CZ) * CX + y * CX * CZ
	local ed = self.ediciones[k]
	if not ed then
		ed = {}
		self.ediciones[k] = ed
	end
	ed[i] = id
	local d = self.datos[k]
	local antes = 0
	if d then
		antes = buffer.readu16(d, i * 2)
		buffer.writeu16(d, i * 2, id)
	end
	return antes
end

-- Ediciones que llegan del servidor
function MundoDatos:aplicarEdiciones(cx, cz, lista)
	local k = clave(cx, cz)
	local ed = self.ediciones[k] or {}
	self.ediciones[k] = ed
	local d = self.datos[k]
	for i, id in lista do
		i = tonumber(i) :: number
		ed[i] = id
		if d then
			buffer.writeu16(d, i * 2, id)
		end
	end
end

function MundoDatos:bioma(x, z)
	local cx, cz = x // CX, z // CZ
	local b = self.biomas[clave(cx, cz)]
	if not b then
		self:obtener(cx, cz)
		b = self.biomas[clave(cx, cz)]
	end
	return buffer.readu8(b, (x - cx * CX) + (z - cz * CZ) * CX)
end

-- Altura del bloque sólido más alto (sin hojas)
function MundoDatos:alturaSuelo(x, z)
	for y = CY - 1, 0, -1 do
		local b = self:get(x, y, z)
		if b ~= 0 and SOLIDO[b] and not Registro.esHojas(b) then
			return y
		end
	end
	return 0
end

-- ¿Le da el cielo? (nada opaco por encima)
function MundoDatos:alCielo(x, y, z)
	local OPACO = Registro.OPACO
	for yy = y, CY - 1 do
		if OPACO[self:get(x, yy, z)] then
			return false
		end
	end
	return true
end

return MundoDatos
