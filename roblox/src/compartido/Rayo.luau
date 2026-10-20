--[[
	Blockverse para Roblox · Rayo
	Recorre los bloques en línea recta (como lanzarRayo del juego web)
	para saber a qué bloque se apunta y por qué cara. Respeta las formas:
	losas, escaleras, puertas, plantas, antorchas, vallas, raíles…
]]
local Registro = require(script.Parent:WaitForChild("Registro"))
local Config = require(script.Parent:WaitForChild("Config"))

local BL = Registro.bloques
local FORMA = Registro.FORMA
local esLiquido = Registro.esLiquido
local BS = Config.BLOQUE

local Rayo = {}

-- Cajas que se pueden apuntar de un bloque (coordenadas dentro del bloque)
function Rayo.cajas(b)
	local def = BL[b]
	if not def then
		return nil
	end
	local f = FORMA[b]
	if f == 0 then
		return { { 0, 0, 0, 1, 1, 1 } }
	elseif f == 1 then
		return { { 0, 0, 0, 1, def.altura or 0.5, 1 } }
	elseif f == 2 then
		return { { 0.15, 0, 0.15, 0.85, 0.8, 0.85 } }
	elseif f == 3 then
		return { { 0.35, 0, 0.35, 0.65, 0.65, 0.65 } }
	elseif f == 6 then
		return def.cajas
	elseif f == 7 then
		return { { 0.25, 0, 0.25, 0.75, 1, 0.75 } }
	elseif f == 8 or f == 9 then
		return { { 0, 0, 0, 1, 0.0625, 1 } }
	elseif f == 5 then
		return { { 0, 0, 0.375, 1, 1, 0.625 } }
	end
	return nil
end

-- Intersección rayo-caja (método de las placas). Devuelve t y el eje de la normal.
local function rayoCaja(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1)
	local tmin, tmax = -math.huge, math.huge
	local eje, signo = 0, 0
	local o = { ox, oy, oz }
	local d = { dx, dy, dz }
	local a = { x0, y0, z0 }
	local b = { x1, y1, z1 }
	for i = 1, 3 do
		if math.abs(d[i]) < 1e-9 then
			if o[i] < a[i] or o[i] > b[i] then
				return nil
			end
		else
			local t1 = (a[i] - o[i]) / d[i]
			local t2 = (b[i] - o[i]) / d[i]
			local s = -1
			if t1 > t2 then
				t1, t2 = t2, t1
				s = 1
			end
			if t1 > tmin then
				tmin = t1
				eje, signo = i, s
			end
			if t2 < tmax then
				tmax = t2
			end
			if tmin > tmax then
				return nil
			end
		end
	end
	if tmax < 0 then
		return nil
	end
	return math.max(tmin, 0), eje, signo
end

--[[
	md: MundoDatos (o algo con :get(x,y,z))
	origen: Vector3 en studs; dir: Vector3 unitario; alcance: en bloques
	Devuelve {x, y, z, b, n = {nx, ny, nz}, t = distancia en bloques} o nil
	opc.liquidos = true para apuntar también al agua y la lava
]]
function Rayo.lanzar(md, origen, dir, alcance, opc)
	local ox, oy, oz = origen.X / BS, origen.Y / BS, origen.Z / BS
	local dx, dy, dz = dir.X, dir.Y, dir.Z
	local x, y, z = math.floor(ox), math.floor(oy), math.floor(oz)
	local sx, sy, sz = dx > 0 and 1 or -1, dy > 0 and 1 or -1, dz > 0 and 1 or -1
	local tdx = dx ~= 0 and math.abs(1 / dx) or math.huge
	local tdy = dy ~= 0 and math.abs(1 / dy) or math.huge
	local tdz = dz ~= 0 and math.abs(1 / dz) or math.huge
	local tmx = dx ~= 0 and ((dx > 0 and (x + 1 - ox) or (ox - x)) * tdx) or math.huge
	local tmy = dy ~= 0 and ((dy > 0 and (y + 1 - oy) or (oy - y)) * tdy) or math.huge
	local tmz = dz ~= 0 and ((dz > 0 and (z + 1 - oz) or (oz - z)) * tdz) or math.huge
	local liquidos = opc and opc.liquidos
	for _ = 1, math.ceil(alcance * 3) + 3 do
		local b = md:get(x, y, z)
		if b ~= 0 and (liquidos or not esLiquido(b)) then
			local cajas = Rayo.cajas(b)
			if esLiquido(b) then
				cajas = { { 0, 0, 0, 1, 1, 1 } }
			end
			if cajas then
				local mejor, eje, signo
				for _, c in cajas do
					local t, e, s = rayoCaja(ox - x, oy - y, oz - z, dx, dy, dz, c[1], c[2], c[3], c[4], c[5], c[6])
					if t and (not mejor or t < mejor) then
						mejor, eje, signo = t, e, s
					end
				end
				if mejor and mejor <= alcance then
					local n = { 0, 0, 0 }
					if eje > 0 then
						n[eje] = signo
					end
					return { x = x, y = y, z = z, b = b, n = n, t = mejor }
				end
			end
		end
		-- Siguiente celda
		local t
		if tmx < tmy and tmx < tmz then
			t = tmx
			x += sx
			tmx += tdx
		elseif tmy < tmz then
			t = tmy
			y += sy
			tmy += tdy
		else
			t = tmz
			z += sz
			tmz += tdz
		end
		if t > alcance then
			break
		end
	end
	return nil
end

return Rayo
