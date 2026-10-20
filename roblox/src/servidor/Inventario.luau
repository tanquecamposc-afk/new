--[[
	Blockverse para Roblox · Inventario (servidor)
	Casillas como en el juego web:
	· 1-9 barra rápida, 10-36 mochila, 37-40 armadura (casco, pechera,
	  pantalones, botas), 41 mano izquierda.
	· Un «cursor» que sostiene la pila que se está moviendo.
	· Clic izquierdo: coger / dejar / juntar / cambiar. Clic derecho: coger
	  la mitad / dejar una. Mayúsculas + clic: mover rápido.
	· Rejilla de crafteo 2x2 (inventario) o 3x3 (mesa de trabajo).
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)
local Crafteo = require(Comp.Crafteo)

local OB = Registro.objetos

local Inv = {}
Inv.TAM = 41
Inv.ARMADURA = 37

function Inv.nuevo()
	return table.create(Inv.TAM, false)
end

local function maxPila(id)
	return Registro.maxPila(id)
end

local function copia(p)
	if not p then
		return false
	end
	return { id = p.id, n = p.n, dur = p.dur, enc = p.enc, nombre = p.nombre }
end
Inv.copia = copia

local function iguales(a, b)
	return a and b and a.id == b.id and not a.dur and not b.dur and not a.enc and not b.enc
end
Inv.iguales = iguales

-- Mete una pila en una lista de casillas (primero junta con las iguales). Devuelve lo que sobra.
function Inv.meter(inv, pila, desde, hasta, orden)
	if not pila or pila.n <= 0 then
		return 0
	end
	local n = pila.n
	local max = maxPila(pila.id)
	local paso = orden == "inverso" and -1 or 1
	local a, b = desde, hasta
	if paso == -1 then
		a, b = hasta, desde
	end
	if not pila.dur then
		for i = a, b, paso do
			local p = inv[i]
			if p and iguales(p, pila) and p.n < max then
				local k = math.min(max - p.n, n)
				p.n += k
				n -= k
				if n <= 0 then
					return 0
				end
			end
		end
	end
	for i = a, b, paso do
		if not inv[i] then
			local k = math.min(max, n)
			local nueva = copia(pila)
			nueva.n = k
			inv[i] = nueva
			n -= k
			if n <= 0 then
				return 0
			end
		end
	end
	return n
end

-- Añade al inventario del jugador (barra rápida primero). Devuelve lo que sobra.
function Inv.dar(inv, pila)
	if not pila then
		return 0
	end
	local resto = copia(pila)
	-- Primero junta con lo que ya hay en todo el inventario
	local n = resto.n
	if not resto.dur then
		local max = maxPila(resto.id)
		for i = 1, 36 do
			local p = inv[i]
			if p and iguales(p, resto) and p.n < max then
				local k = math.min(max - p.n, n)
				p.n += k
				n -= k
				if n <= 0 then
					return 0
				end
			end
		end
	end
	resto.n = n
	n = Inv.meter(inv, resto, 1, 9)
	if n <= 0 then
		return 0
	end
	resto.n = n
	return Inv.meter(inv, resto, 10, 36)
end

function Inv.contar(inv, id)
	local t = 0
	for i = 1, 36 do
		local p = inv[i]
		if p and p.id == id then
			t += p.n
		end
	end
	return t
end

function Inv.quitar(inv, id, n)
	for i = 36, 1, -1 do
		local p = inv[i]
		if p and p.id == id then
			local k = math.min(p.n, n)
			p.n -= k
			n -= k
			if p.n <= 0 then
				inv[i] = false
			end
			if n <= 0 then
				return true
			end
		end
	end
	return n <= 0
end

------------------------------------------------------------------
-- Clics en casillas
------------------------------------------------------------------
-- ¿Se puede poner esta pila en esta casilla del inventario? (armadura)
function Inv.acepta(i, pila)
	if not pila then
		return true
	end
	if i >= 37 and i <= 40 then
		local o = OB[pila.id]
		if not o then
			return false
		end
		if o.armadura then
			return o.armadura.pieza == i - 37
		end
		-- Calabaza o cabezas en el casco
		return i == 37 and (pila.id == Registro.B.calabaza or (o.clave and o.clave:find("cabeza") ~= nil))
	end
	return true
end

-- Clic en una casilla (lista `cas`, índice `i`). s.cursor es la pila en el cursor.
-- boton: 1 izquierdo, 2 derecho. aceptar(i, pila) opcional.
function Inv.clic(s, cas, i, boton, aceptar)
	local p = cas[i]
	local c = s.cursor
	aceptar = aceptar or function()
		return true
	end
	if boton == 2 then
		if not c and p then
			local mitad = math.ceil(p.n / 2)
			s.cursor = copia(p)
			s.cursor.n = mitad
			p.n -= mitad
			if p.n <= 0 then
				cas[i] = false
			end
		elseif c and aceptar(i, c) then
			if not p then
				local una = copia(c)
				una.n = 1
				cas[i] = una
				c.n -= 1
			elseif iguales(p, c) and p.n < maxPila(p.id) then
				p.n += 1
				c.n -= 1
			end
			if c.n <= 0 then
				s.cursor = false
			end
		end
		return
	end
	if not c then
		if p then
			s.cursor = p
			cas[i] = false
		end
	elseif not p then
		if aceptar(i, c) then
			cas[i] = c
			s.cursor = false
		end
	elseif iguales(p, c) then
		local max = maxPila(p.id)
		local k = math.min(max - p.n, c.n)
		p.n += k
		c.n -= k
		if c.n <= 0 then
			s.cursor = false
		end
	elseif aceptar(i, c) then
		cas[i], s.cursor = c, p
	end
end

------------------------------------------------------------------
-- Crafteo
------------------------------------------------------------------
-- Resultado de la rejilla (w = 2 o 3)
function Inv.resultado(rejilla, w)
	local g = table.create(w * w, 0)
	for k = 1, w * w do
		local p = rejilla[k]
		g[k] = p and p.id or 0
	end
	local r = Crafteo.buscar(g, w)
	if not r then
		return nil, nil
	end
	return Registro.pila(r.id, r.n), r
end

-- Gasta un objeto de cada casilla de la rejilla (los cubos devuelven el cubo vacío)
function Inv.gastarRejilla(rejilla, w, inv)
	for k = 1, w * w do
		local p = rejilla[k]
		if p then
			local o = OB[p.id]
			p.n -= 1
			if p.n <= 0 then
				rejilla[k] = false
			end
			if o and o.devuelve then
				local dev = Registro.pila(o.devuelve, 1)
				if not rejilla[k] then
					rejilla[k] = dev
				elseif inv then
					Inv.dar(inv, dev)
				end
			end
		end
	end
end

return Inv
