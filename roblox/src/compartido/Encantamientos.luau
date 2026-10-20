--[[
	Blockverse para Roblox · Encantamientos
	Traducción de encantamientos.js del juego web (como en Java 1.21):
	peso y rango de poder de cada nivel, encantabilidad de cada objeto,
	incompatibilidades, la mesa de encantamientos (tres opciones según
	las librerías) y los libros encantados de los cofres.
]]
local Ruido = require(script.Parent.Ruido)
local Datos = require(script.Parent.Datos.Encantos)

local floor, max = math.floor, math.max
local redondear = Ruido.redondear

local Enc = {}
Enc.LISTA = Datos.lista
Enc.POR_CLAVE = {}
for _, d in Datos.lista do
	Enc.POR_CLAVE[d.k] = d
end
Enc.ROMANOS = { [0] = "", "I", "II", "III", "IV", "V" }
local PODER, SOLO_YUNQUE = Datos.poder, Datos.soloYunque
local CATS, ENCAB = Datos.categorias, Datos.encantabilidad
local LIBRO, LIBRO_ENC = 248, Datos.libroEncantado

local function tiene(lista, v)
	if not lista then
		return false
	end
	for _, x in lista do
		if x == v then
			return true
		end
	end
	return false
end
local function algunaEn(a, b)
	for _, x in a do
		if tiene(b, x) then
			return true
		end
	end
	return false
end

function Enc.categorias(id)
	return CATS[id] or {}
end
function Enc.encantabilidad(id)
	return ENCAB[id] or 0
end
function Enc.peso(k)
	return (PODER[k] or { 1 })[1]
end
function Enc.costeMin(k, l)
	local p = PODER[k] or { 1, 1, 10, 50, 10 }
	return p[2] + p[3] * (l - 1)
end
function Enc.costeMax(k, l)
	local p = PODER[k] or { 1, 1, 10, 50, 10 }
	return p[4] + p[5] * (l - 1)
end
function Enc.multRareza(k)
	return ({ [10] = 1, [5] = 2, [2] = 4, [1] = 8 })[Enc.peso(k)] or 8
end
function Enc.conflicto(a, b)
	return tiene(Enc.POR_CLAVE[a].excluye, b) or tiene(Enc.POR_CLAVE[b].excluye, a)
end
function Enc.nombre(k, l)
	local d = Enc.POR_CLAVE[k]
	if not d then
		return k
	end
	return d.max > 1 and (d.nombre .. " " .. (Enc.ROMANOS[l] or tostring(l))) or d.nombre
end

function Enc.admiteEnMesa(k, id, esArmaduraPecho)
	local d = Enc.POR_CLAVE[k]
	if not d or d.tesoro or d.maldicion then
		return false
	end
	local cats = Enc.categorias(id)
	if tiene(cats, "libro") then
		return true
	end
	if not algunaEn(d.para, cats) then
		return false
	end
	if SOLO_YUNQUE[k] and algunaEn(SOLO_YUNQUE[k], cats) then
		return false
	end
	if k == "espinas" and not esArmaduraPecho then
		return false
	end
	return true
end

-- ¿Se puede poner este encantamiento en este objeto (yunque)?
function Enc.admite(k, id)
	local d = Enc.POR_CLAVE[k]
	if not d then
		return false
	end
	local cats = Enc.categorias(id)
	return tiene(cats, "libro") or algunaEn(d.para, cats)
end

local function elegirPorPeso(lista, r)
	local t = 0
	for _, o in lista do
		t += Enc.peso(o.k)
	end
	local x = floor(r() * t)
	for _, o in lista do
		x -= Enc.peso(o.k)
		if x < 0 then
			return o
		end
	end
	return lista[#lista]
end

-- ¿Es una pechera? (la mesa solo pone Espinas en las pecheras)
local Registro = require(script.Parent.Registro)
local function piezaPecho(id)
	local o = Registro.objetos[id]
	return o ~= nil and o.armadura ~= nil and o.armadura.pieza == 1
end

function Enc.disponibles(id, poder, tesoro)
	local res = {}
	local cats = Enc.categorias(id)
	for _, d in Enc.LISTA do
		local k = d.k
		if tesoro then
			if d.maldicion or k == "velocidadAlmas" or k == "sigilo" or k == "rafaga" then
				continue
			end
			if not tiene(cats, "libro") and not algunaEn(d.para, cats) then
				continue
			end
		elseif not Enc.admiteEnMesa(k, id, piezaPecho(id)) then
			continue
		end
		for l = d.max, 1, -1 do
			if poder >= Enc.costeMin(k, l) and poder <= Enc.costeMax(k, l) then
				table.insert(res, { k = k, l = l })
				break
			end
		end
	end
	return res
end

-- Algoritmo del original: poder modificado por la encantabilidad y un ±15 % al azar
function Enc.elegir(id, nivel, r, tesoro)
	local e = max(1, Enc.encantabilidad(id))
	local poder = nivel + 1 + floor(r() * (floor(e / 4) + 1)) + floor(r() * (floor(e / 4) + 1))
	local f = (r() + r() - 1) * 0.15
	poder = max(1, redondear(poder + poder * f))
	local lista = Enc.disponibles(id, poder, tesoro)
	local res = {}
	if #lista == 0 then
		return res
	end
	table.insert(res, elegirPorPeso(lista, r))
	while floor(r() * 50) <= poder do
		local nueva = {}
		for _, o in lista do
			local ok = true
			for _, x in res do
				if x.k == o.k or Enc.conflicto(x.k, o.k) then
					ok = false
					break
				end
			end
			if ok then
				table.insert(nueva, o)
			end
		end
		lista = nueva
		if #lista == 0 then
			break
		end
		table.insert(res, elegirPorPeso(lista, r))
		poder = floor(poder / 2)
	end
	return res
end

function Enc.aObjeto(lista)
	local o = {}
	for _, e in lista do
		o[e.k] = e.l
	end
	return o
end

-- Libros de los cofres: nivel 5-30 con encantamientos de tesoro
function Enc.libroAleatorio(r)
	local l = Enc.elegir(LIBRO, 5 + floor(r() * 26), r, true)
	if #l > 0 then
		return Enc.aObjeto(l)
	end
	return { irrompibilidad = 1 }
end

-- Mesa de encantamientos: tres opciones (coste, lapislázuli, encantamientos y pista)
function Enc.opciones(id, librerias, semillaEnc)
	local e = Enc.encantabilidad(id)
	if e == 0 then
		return {}
	end
	local r = Ruido.mulberry32(semillaEnc)
	local base = 1 + floor(r() * 8) + bit32.rshift(librerias, 1) + floor(r() * (librerias + 1))
	local costes = { max(floor(base / 3), 1), floor(base * 2 / 3) + 1, max(base, librerias * 2) }
	local res = {}
	for i, c in costes do
		if c < i then
			res[i] = false
			continue
		end
		local rr = Ruido.mulberry32((semillaEnc + (i - 1) * 7919) % 4294967296)
		local lista = Enc.elegir(id, c, rr, false)
		if id == LIBRO and #lista > 1 then
			table.remove(lista, floor(rr() * #lista) + 1)
		end
		local pista = false
		if #lista > 0 then
			local rp = Ruido.mulberry32(bit32.bxor(semillaEnc, (i * 104729) % 4294967296))
			pista = lista[floor(rp() * #lista) + 1]
		end
		res[i] = { coste = c, lapis = i, niveles = i, enc = Enc.aObjeto(lista), pista = pista }
	end
	return res
end

Enc.LIBRO, Enc.LIBRO_ENC = LIBRO, LIBRO_ENC
function Enc.nivel(pila, k)
	return pila and pila.enc and pila.enc[k] or 0
end

return Enc
