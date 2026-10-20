--[[
	Blockverse para Roblox · Cofres y hornos (servidor)
	· Cofres, barriles y cofres de cobre: 27 casillas cada uno.
	· Hornos (y ahumadores / altos hornos): entrada, combustible y salida,
	  con los tiempos y combustibles del juego web.
	Al romper el bloque, lo que hay dentro cae al suelo.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)
local Crafteo = require(Comp.Crafteo)
local Entidades = require(script.Parent.Entidades)
local Botin = require(Comp.Botin)

local BL = Registro.bloques
local Cont = {}
Cont.cofres = {}
Cont.hornos = {}
Cont.alCambiarHorno = nil -- function(clave)

local function clave(x, y, z)
	return x .. "," .. y .. "," .. z
end
Cont.clave = clave

function Cont.esCofre(id)
	local d = BL[id]
	return d ~= nil and d.inter == "cofre"
end

function Cont.esHorno(id)
	local d = BL[id]
	return d ~= nil and d.inter == "horno"
end

-- md: datos del mundo (para saber si el cofre es de una estructura y darle su botín)
Cont.md = nil
function Cont.cofre(x, y, z)
	local k = clave(x, y, z)
	local c = Cont.cofres[k]
	if not c then
		local md = Cont.md
		local tipo = md and md.cofresGen and md.cofresGen[k]
		if tipo then
			md.cofresGen[k] = nil
			c = Botin.generar(tipo, x, y, z, md.semilla)
		else
			c = table.create(27, false)
		end
		Cont.cofres[k] = c
	end
	return c
end

function Cont.horno(x, y, z, tipo)
	local k = clave(x, y, z)
	local h = Cont.hornos[k]
	if not h then
		h = { entrada = false, combustible = false, salida = false, quema = 0, quemaMax = 0, prog = 0, tipo = tipo or "horno", x = x, y = y, z = z }
		Cont.hornos[k] = h
	end
	return h
end

-- Al romper el bloque: lo de dentro cae al suelo
function Cont.vaciar(x, y, z)
	local k = clave(x, y, z)
	local c = Cont.cofres[k]
	if not c and Cont.md and Cont.md.cofresGen and Cont.md.cofresGen[k] then
		c = Cont.cofre(x, y, z)
	end
	if c then
		for _, p in c do
			if p then
				Entidades.soltarItem(p, x + 0.5, y + 0.5, z + 0.5, true)
			end
		end
		Cont.cofres[k] = nil
	end
	local h = Cont.hornos[k]
	if h then
		for _, nom in { "entrada", "combustible", "salida" } do
			if h[nom] then
				Entidades.soltarItem(h[nom], x + 0.5, y + 0.5, z + 0.5, true)
			end
		end
		Cont.hornos[k] = nil
	end
end

-- Qué puede fundir cada tipo de horno
local function sirve(h, id)
	local res = Crafteo.FUNDIR[id]
	if not res then
		return nil
	end
	local o = Registro.objetos[id]
	if h.tipo == "ahumador" then
		return (o and o.comida) and res or nil
	elseif h.tipo == "altoHorno" then
		local c = (o and o.clave) or ""
		if c:find("mena") or c:find("Bruto") or c:find("^p[A-Z]") then
			return res
		end
		return nil
	end
	return res
end
Cont.sirve = sirve

local function tickHorno(h, dt)
	local cambio = false
	local vel = (h.tipo == "ahumador" or h.tipo == "altoHorno") and 2 or 1
	local res = h.entrada and sirve(h, h.entrada.id)
	local cabe = res and (not h.salida or (h.salida.id == res and h.salida.n < Registro.maxPila(res)))
	if h.quema > 0 then
		h.quema -= dt * vel
		cambio = true
	end
	if h.quema <= 0 and cabe and h.combustible and Crafteo.COMBUSTIBLE[h.combustible.id] then
		h.quemaMax = Crafteo.COMBUSTIBLE[h.combustible.id]
		h.quema = h.quemaMax
		local o = Registro.objetos[h.combustible.id]
		h.combustible.n -= 1
		if h.combustible.n <= 0 then
			h.combustible = (o and o.devuelve) and Registro.pila(o.devuelve, 1) or false
		end
		cambio = true
	end
	if h.quema > 0 and cabe then
		h.prog += dt * vel
		if h.prog >= Crafteo.TIEMPO_FUNDIR then
			h.prog = 0
			h.entrada.n -= 1
			if h.entrada.n <= 0 then
				h.entrada = false
			end
			if h.salida then
				h.salida.n += 1
			else
				h.salida = Registro.pila(res, 1)
			end
		end
		cambio = true
	elseif h.prog > 0 then
		h.prog = math.max(0, h.prog - dt * 2)
		cambio = true
	end
	return cambio
end

function Cont.iniciar()
	local acum = 0
	RunService.Heartbeat:Connect(function(dt)
		acum += dt
		if acum < 0.1 then
			return
		end
		local paso = acum
		acum = 0
		for k, h in Cont.hornos do
			if (h.entrada or h.quema > 0 or h.prog > 0) and tickHorno(h, paso) and Cont.alCambiarHorno then
				Cont.alCambiarHorno(k)
			end
		end
	end)
end

return Cont
