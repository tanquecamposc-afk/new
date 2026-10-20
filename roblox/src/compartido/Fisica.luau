--!native
--[[
	Blockverse para Roblox · Física de entidades
	Igual que choca/moverEje/pasoFisico de jugador.js: cajas que chocan
	contra los bloques (con escaleras, losas, vallas…), suben escalones
	bajos y detectan el suelo. La usan las criaturas, los objetos tirados
	y las flechas. Unidades: bloques (pos = pies de la entidad).
]]
local Registro = require(script.Parent:WaitForChild("Registro"))

local BL = Registro.bloques
local SOLIDO, FORMA = Registro.SOLIDO, Registro.FORMA

local Fisica = {}

local CUBO = { { 0, 0, 0, 1, 1, 1 } }
local cacheCajas = {}
local function cajasColision(b)
	local c = cacheCajas[b]
	if c then
		return c
	end
	local def = BL[b]
	local f = FORMA[b]
	if f == 6 then
		c = def.cajas or CUBO
	elseif f == 7 then
		c = { { 0, 0, 0, 1, def.colAlta or 1, 1 } }
	elseif f == 1 then
		c = { { 0, 0, 0, 1, def.altura or 0.5, 1 } }
	else
		c = CUBO
	end
	cacheCajas[b] = c
	return c
end
Fisica.cajasColision = cajasColision

-- ¿La caja de la entidad en p (ancho = medio ancho, alto) choca con algo? Devuelve la caja del bloque.
function Fisica.choca(md, px, py, pz, a, h)
	local x0, x1 = math.floor(px - a), math.floor(px + a)
	local y0, y1 = math.floor(py), math.floor(py + h)
	local z0, z1 = math.floor(pz - a), math.floor(pz + a)
	for x = x0, x1 do
		for y = y0, y1 do
			for z = z0, z1 do
				local b = md:get(x, y, z)
				if b ~= 0 and SOLIDO[b] then
					for _, c in cajasColision(b) do
						local X0, Y0, Z0, X1, Y1, Z1 = x + c[1], y + c[2], z + c[3], x + c[4], y + c[5], z + c[6]
						if px - a < X1 - 1e-7 and px + a > X0 + 1e-7 and pz - a < Z1 - 1e-7 and pz + a > Z0 + 1e-7 and py < Y1 - 1e-7 and py + h > Y0 + 1e-7 then
							return X0, Y0, Z0, X1, Y1, Z1
						end
					end
				end
			end
		end
	end
	return nil
end
local choca = Fisica.choca

-- e = {x, y, z, vx, vy, vz, ancho, alto, suelo, subir}
local function moverEje(md, e, eje, d)
	if eje == 1 then
		e.x += d
	elseif eje == 2 then
		e.y += d
	else
		e.z += d
	end
	local hubo = false
	for _ = 1, 6 do
		local X0, Y0, Z0, X1, Y1, Z1 = choca(md, e.x, e.y, e.z, e.ancho, e.alto)
		if not X0 then
			return hubo
		end
		-- Subir escalones bajos (losas, escaleras, caminos)
		if eje ~= 2 and e.suelo and e.subir then
			local sub = Y1 - e.y
			if sub > 0 and sub <= 0.6 then
				local py = e.y
				e.y += sub + 1e-4
				if not choca(md, e.x, e.y, e.z, e.ancho, e.alto) then
					return hubo
				end
				e.y = py
			end
		end
		hubo = true
		if eje == 2 then
			e.y = d > 0 and Y0 - e.alto - 1e-4 or Y1 + 1e-4
		elseif eje == 1 then
			e.x = d > 0 and X0 - e.ancho - 1e-4 or X1 + e.ancho + 1e-4
		else
			e.z = d > 0 and Z0 - e.ancho - 1e-4 or Z1 + e.ancho + 1e-4
		end
	end
	return hubo
end

function Fisica.paso(md, e, dt)
	local pasos = math.ceil(math.max(math.abs(e.vx), math.abs(e.vy), math.abs(e.vz)) * dt / 0.25)
	if pasos < 1 then
		pasos = 1
	end
	local h = dt / pasos
	local suelo = false
	e.chocoH = false
	for _ = 1, pasos do
		if moverEje(md, e, 1, e.vx * h) then
			e.chocoH = true
			e.vx = 0
		end
		if moverEje(md, e, 3, e.vz * h) then
			e.chocoH = true
			e.vz = 0
		end
		local vy = e.vy
		if moverEje(md, e, 2, vy * h) then
			if vy < 0 then
				suelo = true
			end
			e.vy = 0
		end
	end
	e.suelo = suelo or (not e.vuela and e.vy <= 0 and choca(md, e.x, e.y - 0.02, e.z, e.ancho, e.alto) ~= nil)
end

return Fisica
