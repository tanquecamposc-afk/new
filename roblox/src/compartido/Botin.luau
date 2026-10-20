--[[
	Blockverse para Roblox · Botín de los cofres
	Como estructuras28.js del juego web (botín por grupos, como en la
	edición Java): cada grupo hace un número de tiradas al azar y cada
	tirada elige una entrada según su peso. Las armas y armaduras pueden
	salir encantadas o gastadas, los libros salen encantados y las pilas
	se reparten en trozos por huecos al azar.
	El azar sale de la posición del cofre y de la semilla, así que el
	mismo cofre tiene lo mismo que en la versión web.
]]
local Ruido = require(script.Parent.Ruido)
local Registro = require(script.Parent.Registro)
local Enc = require(script.Parent.Encantamientos)
local LOOT = require(script.Parent.Datos.Botin)

local floor, min, max = math.floor, math.min, math.max
local OB = Registro.objetos

local Botin = {}
Botin.TABLAS = LOOT
if LOOT.iglu and not LOOT.igluSotano then
	LOOT.igluSotano = LOOT.iglu
end

local function crearPila(id, n)
	local o = OB[id]
	if o and o.dur then
		return { id = id, n = 1, dur = o.dur }
	end
	return { id = id, n = n }
end

local function tirarGrupo(g, rnd, res)
	local n = g.t[1] + floor(rnd() * (g.t[2] - g.t[1] + 1))
	local total = 0
	for _, x in g.e do
		total += x[4]
	end
	for _ = 1, n do
		local r = rnd() * total
		local e = g.e[1]
		for _, x in g.e do
			r -= x[4]
			if r < 0 then
				e = x
				break
			end
		end
		local id = e[1]
		if id == -1 or id == 0 or not OB[id] then
			continue
		end
		local p = crearPila(id, min(Registro.maxPila(id), e[2] + floor(rnd() * (e[3] - e[2] + 1))))
		local ex = e[5]
		if id == Enc.LIBRO_ENC or id == 546 then
			if type(ex) == "number" then
				p.enc = Enc.aObjeto(Enc.elegir(Enc.LIBRO, ex, rnd, true))
			else
				p.enc = Enc.libroAleatorio(rnd)
			end
		elseif ex == "enc" or type(ex) == "number" then
			local lista = Enc.elegir(id, type(ex) == "number" and ex or 5 + floor(rnd() * 26), rnd, true)
			if #lista > 0 then
				p.enc = Enc.aObjeto(ex == "enc" and { lista[1] } or lista)
			end
		end
		local o = OB[id]
		if o.dur and (ex == "gastado" or (ex == "enc" and rnd() < 0.6)) then
			p.dur = max(1, floor(o.dur * (0.15 + rnd() * 0.8)))
		end
		table.insert(res, p)
	end
end

local function repartirEnCofre(pilas, rnd)
	local cofre = table.create(27, false)
	local libres = {}
	for i = 0, 26 do
		libres[i + 1] = i
	end
	for i = 26, 1, -1 do
		local j = floor(rnd() * (i + 1))
		libres[i + 1], libres[j + 1] = libres[j + 1], libres[i + 1]
	end
	local lista = {}
	for i = 1, min(#pilas, 27) do
		lista[i] = pilas[i]
	end
	local huecos = 27 - #lista
	local k = 1
	while k <= #lista and huecos > 0 do
		local p = lista[k]
		while p.n > 1 and huecos > 0 and rnd() < 0.5 do
			local m = 1 + floor(rnd() * (p.n / 2))
			p.n -= m
			local q = crearPila(p.id, m)
			if p.enc then
				q.enc = p.enc
			end
			if p.dur ~= nil then
				q.dur = p.dur
			end
			table.insert(lista, q)
			huecos -= 1
		end
		k += 1
	end
	for i, p in lista do
		if i <= 27 then
			cofre[libres[i] + 1] = p
		end
	end
	return cofre
end

-- Botín de un tipo con un generador de números al azar dado
function Botin.de(tipo, rnd)
	local tabla = LOOT[tipo]
	if not tabla then
		return nil
	end
	local pilas = {}
	for _, g in tabla do
		tirarGrupo(g, rnd, pilas)
	end
	return repartirEnCofre(pilas, rnd)
end

-- Botín del cofre de una estructura en (x, y, z), igual que registrarCofre() del juego web
function Botin.generar(tipo, x, y, z, semilla)
	local rnd
	if x then
		rnd = Ruido.mulberry32(floor(Ruido.hash3(x, y, z, semilla) * 1e9))
	else
		rnd = Ruido.mulberry32(math.random(0, 2 ^ 31))
	end
	return Botin.de(tipo, rnd) or Botin.de("mazmorra", rnd)
end

return Botin
