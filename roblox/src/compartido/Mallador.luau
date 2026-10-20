--[[
	Blockverse para Roblox · Mallador
	Decide qué piezas (Parts) hacen falta para dibujar una capa
	(una altura `y`) de un chunk:
	· Solo se dibujan los bloques que tienen alguna cara a la vista.
	· Los bloques iguales y pegados se juntan en rectángulos grandes,
	  así hay muchas menos piezas y el juego va más fluido.
	· Antorchas, flores y hierba se devuelven aparte (tienen otra forma).
	`get(x, y, z)` debe devolver el id del bloque en coordenadas del mundo.
]]
local Config = require(script.Parent.Config)
local Bloques = require(script.Parent.Bloques)

local C, ALTO = Config.CHUNK, Config.ALTO
local TRANSP = Bloques.TRANSP
local DEF = Bloques.porId

local Mallador = {}

local function visible(get, b, x, y, z)
	local function mira(n)
		return n == 0 or (TRANSP[n] and n ~= b)
	end
	if y + 1 >= ALTO or mira(get(x, y + 1, z)) then
		return true
	end
	if y > 0 and mira(get(x, y - 1, z)) then
		return true
	end
	return mira(get(x + 1, y, z)) or mira(get(x - 1, y, z)) or mira(get(x, y, z + 1)) or mira(get(x, y, z - 1))
end
Mallador.visible = visible

-- Devuelve: cajas = { {b, x0, z0, ancho, largo}, ... }, especiales = { {b, x, z}, ... }
-- (x0, z0, x, z en coordenadas locales del chunk)
function Mallador.capa(get, cx, cz, y)
	local x0, z0 = cx * C, cz * C
	local mascara = table.create(C * C, 0)
	local especiales = {}
	local hay = false
	for lz = 0, C - 1 do
		for lx = 0, C - 1 do
			local b = get(x0 + lx, y, z0 + lz)
			if b ~= 0 then
				local d = DEF[b]
				if d and d.forma == "cubo" then
					if visible(get, b, x0 + lx, y, z0 + lz) then
						mascara[lz * C + lx + 1] = b
						hay = true
					end
				elseif d and d.forma ~= "agua" then
					table.insert(especiales, { b, lx, lz })
				end
			end
		end
	end
	local cajas = {}
	if not hay then
		return cajas, especiales
	end
	-- Rectángulos voraces: se alarga en x y luego en z
	for lz = 0, C - 1 do
		local lx = 0
		while lx < C do
			local b = mascara[lz * C + lx + 1]
			if b == 0 then
				lx += 1
				continue
			end
			local ancho = 1
			while lx + ancho < C and mascara[lz * C + lx + ancho + 1] == b do
				ancho += 1
			end
			local largo = 1
			local sigue = true
			-- Los bloques más estrechos (cactus) no se juntan
			if DEF[b].ancho then
				ancho = 1
				sigue = false
			end
			while sigue and lz + largo < C do
				for k = 0, ancho - 1 do
					if mascara[(lz + largo) * C + lx + k + 1] ~= b then
						sigue = false
						break
					end
				end
				if sigue then
					largo += 1
				end
			end
			for dz = 0, largo - 1 do
				for k = 0, ancho - 1 do
					mascara[(lz + dz) * C + lx + k + 1] = 0
				end
			end
			table.insert(cajas, { b, lx, lz, ancho, largo })
			lx += ancho
		end
	end
	return cajas, especiales
end

return Mallador
