--[[
	Blockverse para Roblox · Registro
	Junta los datos exportados del juego web (Datos/*) y prepara tablas
	rápidas para el resto del juego: qué bloques son sólidos, opacos,
	reemplazables, cuánto alumbran, qué herramienta los rompe, etc.
]]
local Datos = script.Parent:WaitForChild("Datos")
local BL = require(Datos:WaitForChild("Bloques"))
local OB = require(Datos:WaitForChild("Objetos"))
local CL = require(Datos:WaitForChild("Claves"))

local Registro = {}
Registro.bloques = BL
Registro.objetos = OB
Registro.B = CL.B
Registro.I = CL.I

-- Objetos propios de la versión de Roblox (Bed Wars); usan el icono de otro objeto
local EXTRA = {
	[900] = { nombre = "Globo salvavidas", max = 4, clave = "globoBW", icono = 220 },
	[901] = { nombre = "Escudo de cama", max = 1, clave = "escudoCamaBW", icono = 597 },
	[902] = { nombre = "Trampolín", max = 8, clave = "trampolinBW", icono = CL.B.heno },
	[903] = { nombre = "Mina terrestre", max = 8, clave = "minaBW", icono = 1219 },
	[904] = { nombre = "Torreta de nieve", max = 4, clave = "torretaBW", icono = 114 },
}
for id, o in EXTRA do
	if not OB[id] then
		OB[id] = o
		CL.I[o.clave] = id
	end
end

local B = CL.B
local SOLIDO, OPACO, REEMPL, TRANS, LUZ, FORMA, TINTE, OCLUYE, LIQUIDO = {}, {}, {}, {}, {}, {}, {}, {}, {}
local FORMAS = { cubo = 0, losa = 1, cruz = 2, antorcha = 3, liquido = 4, portal = 5, cajas = 6, conecta = 7, cable = 8, riel = 9 }
Registro.FORMAS = FORMAS
local MAX = 0
for id, b in BL do
	MAX = math.max(MAX, id)
	SOLIDO[id] = b.solido == true
	OPACO[id] = b.opaco == true
	REEMPL[id] = b.reemplazable == true
	TRANS[id] = b.trans == true
	LUZ[id] = b.luz or 0
	FORMA[id] = FORMAS[b.forma] or 0
	TINTE[id] = b.tinte
	OCLUYE[id] = b.forma == "cubo" and not b.sinSombra
	LIQUIDO[id] = b.liquido
end
SOLIDO[0], OPACO[0], REEMPL[0], TRANS[0], LUZ[0], FORMA[0], OCLUYE[0] = false, false, true, false, 0, -1, false
Registro.SOLIDO, Registro.OPACO, Registro.REEMPL, Registro.TRANS = SOLIDO, OPACO, REEMPL, TRANS
Registro.LUZ, Registro.FORMA, Registro.TINTE, Registro.OCLUYE, Registro.LIQUIDO = LUZ, FORMA, TINTE, OCLUYE, LIQUIDO
Registro.MAX_BLOQUE = MAX

-- Igual que en registro.js
function Registro.esTronco(id)
	return id == 4 or (id >= 94 and id <= 97) or id == 1294 or id == 1299 or id == 1321 or id == 1463
end
function Registro.esHojas(id)
	return id == 5 or (id >= 98 and id <= 101) or id == 1295 or id == 1300 or id == 1322 or id == 1464
end
function Registro.esAgua(id)
	return id >= 53 and id <= 60
end
function Registro.esLava(id)
	return id >= 61 and id <= 68
end
function Registro.esLiquido(id)
	return id >= 53 and id <= 68
end
function Registro.esPuerta(id)
	return id >= 149 and id <= 164
end
Registro.DIRF = { { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } }

------------------------------------------------------------------
-- Objetos
------------------------------------------------------------------
function Registro.nombre(id)
	local o = OB[id]
	if o then
		return o.nombre
	end
	local b = BL[id]
	return b and b.nombre or "?"
end

function Registro.maxPila(id)
	local o = OB[id]
	return o and o.max or 64
end

function Registro.esBloqueColocable(id)
	local o = OB[id]
	return o ~= nil and o.bloque == true and BL[id] ~= nil
end

-- Pila nueva (las herramientas guardan su durabilidad en `dur`)
function Registro.pila(id, n)
	local o = OB[id]
	if o and o.dur then
		return { id = id, n = 1, dur = o.dur }
	end
	return { id = id, n = n or 1 }
end

------------------------------------------------------------------
-- Romper bloques (como jugador.js: dureza, herramienta y nivel)
------------------------------------------------------------------
-- Datos de la herramienta en la mano: {tipo = "pico"|"hacha"|"pala"|"azada"|"espada", nivel, vel, dano, cad}
function Registro.herramienta(id)
	local o = id and OB[id]
	return o and o.herr or nil
end

-- Igual que puedeCosechar() de jugador.js: los bloques con nivel necesitan un pico de ese nivel
function Registro.puedeRecoger(b, herrId)
	local d = BL[b]
	if not d or not d.nivel or d.nivel <= 0 then
		return true
	end
	local h = Registro.herramienta(herrId)
	return h ~= nil and h.tipo == "pico" and (h.nivel or 0) >= d.nivel
end

-- Igual que tiempoRomper() de jugador.js (segundos)
function Registro.tiempoRomper(b, herrId, creativo, opc)
	local d = BL[b]
	if not d or d.dureza < 0 then
		return math.huge
	end
	if creativo then
		return 0
	end
	if d.dureza == 0 then
		return 0
	end
	local h = Registro.herramienta(herrId)
	local vel = 1
	if h and (d.herr == h.tipo or (h.tipo == "espada" and b == B.hojas)) then
		vel = h.vel or 1
	end
	if h and h.tipo == "espada" and b ~= B.hojas then
		vel = (b == B.telarana) and 15 or 1
	end
	if opc then
		if opc.bajoAgua then
			vel /= 5
		end
		if opc.enAire then
			vel /= 5
		end
	end
	local porTick = vel / d.dureza / (Registro.puedeRecoger(b, herrId) and 30 or 100)
	if porTick > 1 then
		return 0
	end
	return math.ceil(1 / porTick) / 20
end

-- Lo que suelta un bloque al romperlo: lista de {id, n}
function Registro.sueltaDe(b, herrId)
	local d = BL[b]
	if not d then
		return {}
	end
	if not Registro.puedeRecoger(b, herrId) then
		return {}
	end
	if d.sueltaMuestra then
		local r = {}
		for _, m in d.sueltaMuestra do
			local id, mn, mx, p = m[1], m[2], m[3], m[4]
			if math.random() < p and (OB[id] or BL[id]) then
				table.insert(r, { id, math.random(mn, mx) })
			end
		end
		return r
	end
	local s = d.suelta
	if s == nil then
		return OB[b] and { { b, 1 } } or {}
	end
	if s == 0 or s == false then
		return {}
	end
	return { { s, 1 } }
end

return Registro
