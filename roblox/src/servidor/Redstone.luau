--[[
	Blockverse para Roblox · Redstone (servidor)
	Traducción de redstone.js del juego web:
	· El polvo lleva energía (0-15, pierde 1 por bloque, sube y baja
	  escalones). Fuentes: bloque de redstone, antorchas de redstone,
	  palancas, botones y placas de presión.
	· Energía fuerte (bajo palancas, botones y placas, y encima de las
	  antorchas) y débil (bajo el polvo y a su lado). Las antorchas se
	  apagan si su bloque tiene energía.
	· Consumidores: lámparas, puertas, dinamita, pistones (normales y
	  pegajosos, empujan hasta 12 bloques) y raíles propulsores.
	· Los botones se sueltan solos al segundo y las placas se activan
	  con jugadores, criaturas y objetos encima.
	· Forma automática de los raíles al ponerlos (curvas y rampas).
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Mundo = require(script.Parent.Mundo)
local Mobs = require(script.Parent.Mobs)
local Entidades = require(script.Parent.Entidades)

local BS = Config.BLOQUE
local BL, B = Registro.bloques, Registro.B
local SOLIDO, OPACO, REEMPL = Registro.SOLIDO, Registro.OPACO, Registro.REEMPL
local esLiquido = Registro.esLiquido
local DIRF = Registro.DIRF
local floor, min, max = math.floor, math.min, math.max
local CY = 192

local RS = {}
local Redstone = {}
local ctx -- {activarTNT(x, y, z), sonido(nombre, x, y, z), soltarBloque(b, x, y, z)}

for id, b in BL do
	if b.redstone or b.puerta or b.cabezaPiston or id == B.tnt then
		RS[id] = true
	end
end
local CABLE0 = B.cable0
local function esCable(id)
	return id >= CABLE0 and id <= CABLE0 + 15
end
local function potenciaCable(id)
	return id - CABLE0
end
local function esFuente(id)
	local b = BL[id]
	if not b or not b.redstone then
		return false
	end
	return id == B.bloqueRedstone or id == B.antorchaR
		or ((b.redstone == "palanca" or b.redstone == "boton" or b.redstone == "placa" or b.redstone == "sensor") and b.on == true)
end
local DIR6 = { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 0, 1 }, { 0, 0, -1 }, { 0, 1, 0 }, { 0, -1, 0 } }
local VEC6 = { [0] = { -1, 0, 0 }, { 1, 0, 0 }, { 0, -1, 0 }, { 0, 1, 0 }, { 0, 0, -1 }, { 0, 0, 1 } }

local function get(x, y, z)
	return Mundo.get(x, y, z)
end
local function getSC(x, y, z)
	return Mundo.md:getSiCargado(x, y, z)
end
local function set(x, y, z, id, aviso)
	Mundo.set(x, y, z, id, (not aviso) and { sinAviso = true } or nil)
end
local function clave(x, y, z)
	return x .. "," .. y .. "," .. z
end

------------------------------------------------------------------
-- Cola de cambios
------------------------------------------------------------------
local cola = {}
local nCola = 0
local rsT = 0

function Redstone.avisar(x, y, z, anterior, nuevo)
	local rel = RS[anterior] or RS[nuevo]
	if not rel then
		for _, d in DIR6 do
			local b = getSC(x + d[1], y + d[2], z + d[3])
			if b > 0 and RS[b] then
				rel = true
				break
			end
		end
	end
	if rel then
		local k = clave(x, y, z)
		if not cola[k] then
			nCola += 1
		end
		cola[k] = { x, y, z }
	end
end

------------------------------------------------------------------
-- Pistones
------------------------------------------------------------------
local INAMOVIBLE = {}
for _, k in { "obsidiana", "lecho", "portalNether", "portalEnd", "marcoEnd", "marcoEndOjo", "cofre", "horno", "soporte", "mesaEncantar", "generador", "obsidianaLlorosa", "portalAcceso" } do
	if B[k] then
		INAMOVIBLE[B[k]] = true
	end
end
local function inamovible(id)
	local d = BL[id]
	return INAMOVIBLE[id] or (d and (d.cabezaPiston or (d.piston and d.piston.ext))) or (d and d.dureza < 0 and not esLiquido(id))
end

local function moverCuerposEn(x, y, z, dx, dy, dz)
	for _, plr in Players:GetPlayers() do
		local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
		if r then
			local p = r.Position / BS
			local pies = p.Y - 1
			if floor(p.X) == x and floor(p.Z) == z and math.abs(pies - y) < 1.5 then
				r.CFrame += Vector3.new(dx, max(0, dy) * 1.01, dz) * BS
			end
		end
	end
	for _, m in Mobs.lista do
		if floor(m.x) == x and floor(m.z) == z and math.abs(m.y - y) < 1.5 then
			m.x += dx
			m.y += max(0, dy) * 1.01
			m.z += dz
		end
	end
end

local function extenderPiston(x, y, z, pi)
	local v = VEC6[pi.d]
	local dx, dy, dz = v[1], v[2], v[3]
	local linea = {}
	local cx, cy, cz = x + dx, y + dy, z + dz
	for k = 0, 12 do
		local b = get(cx, cy, cz)
		if b == 0 or REEMPL[b] then
			break
		end
		if k == 12 or inamovible(b) or cy <= 0 or cy >= CY - 1 then
			return
		end
		table.insert(linea, { cx, cy, cz, b })
		cx += dx
		cy += dy
		cz += dz
	end
	local fin = get(cx, cy, cz)
	if fin ~= 0 and REEMPL[fin] and ctx.soltarBloque then
		ctx.soltarBloque(fin, cx, cy, cz)
	end
	for k = #linea, 1, -1 do
		local q = linea[k]
		set(q[1] + dx, q[2] + dy, q[3] + dz, q[4])
	end
	local base = pi.peg ~= 0 and pi.peg and 1224 + 18 or 1224
	set(x + dx, y + dy, z + dz, base + 12 + pi.d)
	set(x, y, z, base + 6 + pi.d)
	moverCuerposEn(x + dx, y + dy, z + dz, dx, dy, dz)
	for _, q in linea do
		moverCuerposEn(q[1] + dx, q[2] + dy, q[3] + dz, dx, dy, dz)
	end
	if ctx.sonido then
		ctx.sonido("piston", x, y, z)
	end
end

local function retraerPiston(x, y, z, pi)
	local v = VEC6[pi.d]
	local dx, dy, dz = v[1], v[2], v[3]
	local peg = pi.peg and pi.peg ~= 0
	local base = peg and 1224 + 18 or 1224
	local cab = get(x + dx, y + dy, z + dz)
	if BL[cab] and BL[cab].cabezaPiston then
		set(x + dx, y + dy, z + dz, 0)
	end
	set(x, y, z, base + pi.d)
	if peg then
		local b = get(x + 2 * dx, y + 2 * dy, z + 2 * dz)
		if b ~= 0 and not REEMPL[b] and not inamovible(b) then
			set(x + 2 * dx, y + 2 * dy, z + 2 * dz, 0)
			set(x + dx, y + dy, z + dz, b, true)
		end
	end
	if ctx.sonido then
		ctx.sonido("piston", x, y, z)
	end
end

-- La cabeza se rompe si falta la base y viceversa
function Redstone.comprobarPiston(x, y, z)
	local b = get(x, y, z)
	local d = BL[b]
	if not d then
		return
	end
	if d.cabezaPiston then
		local v = VEC6[d.cabezaPiston.d]
		local base = BL[get(x - v[1], y - v[2], z - v[3])]
		if not base or not base.piston or not base.piston.ext then
			set(x, y, z, 0)
		end
	elseif d.piston and d.piston.ext then
		local v = VEC6[d.piston.d]
		local c = BL[get(x + v[1], y + v[2], z + v[3])]
		if not c or not c.cabezaPiston then
			set(x, y, z, ((d.piston.peg and d.piston.peg ~= 0) and 1242 or 1224) + d.piston.d)
		end
	end
end

------------------------------------------------------------------
-- Cálculo de la energía en una zona
------------------------------------------------------------------
local function esSolido(b)
	return SOLIDO[b] and OPACO[b]
end

local function calcular(x0, y0, z0, x1, y1, z1)
	local W, H, D = x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1
	local N = W * H * D
	local blq = buffer.create(N * 2)
	local nivel = buffer.create(N)
	local function ix(x, y, z)
		return ((y - y0) * D + (z - z0)) * W + (x - x0)
	end
	local function dentro(x, y, z)
		return x >= x0 and x <= x1 and y >= y0 and y <= y1 and z >= z0 and z <= z1
	end
	local cables, antorchas, consumidores, conRS = {}, {}, {}, {}
	for y = y0, y1 do
		for z = z0, z1 do
			for x = x0, x1 do
				local b = getSC(x, y, z)
				if b <= 0 then
					continue
				end
				buffer.writeu16(blq, ix(x, y, z) * 2, b)
				if not RS[b] then
					continue
				end
				table.insert(conRS, { x, y, z })
				if esCable(b) then
					table.insert(cables, { x, y, z })
				elseif b == B.antorchaR or b == B.antorchaROff then
					table.insert(antorchas, { x, y, z })
				elseif not esFuente(b) or BL[b].redstone == "lampara" then
					table.insert(consumidores, { x, y, z })
				end
			end
		end
	end
	local function bq(x, y, z)
		return buffer.readu16(blq, ix(x, y, z) * 2)
	end
	local function g(x, y, z)
		if dentro(x, y, z) then
			return bq(x, y, z)
		end
		return max(0, getSC(x, y, z))
	end
	local potFuerte, potDebil
	for _ = 1, 6 do
		potFuerte = {}
		for _, q in conRS do
			local x, y, z = q[1], q[2], q[3]
			local b = bq(x, y, z)
			local d = BL[b]
			if d then
				if d.on and (d.redstone == "palanca" or d.redstone == "boton" or d.redstone == "placa") then
					potFuerte[clave(x, y - 1, z)] = true
				end
				if b == B.antorchaR then
					potFuerte[clave(x, y + 1, z)] = true
				end
			end
		end
		buffer.fill(nivel, 0, 0)
		local fila, ini = {}, 1
		for _, q in cables do
			local x, y, z = q[1], q[2], q[3]
			local src = false
			for _, d in DIR6 do
				local n = g(x + d[1], y + d[2], z + d[3])
				if esFuente(n) and not (n == B.antorchaR and d[2] == 1) then
					src = true
					break
				end
				if esSolido(n) and potFuerte[clave(x + d[1], y + d[2], z + d[3])] then
					src = true
					break
				end
			end
			if src then
				buffer.writeu8(nivel, ix(x, y, z), 15)
				table.insert(fila, q)
			end
		end
		while ini <= #fila do
			local q = fila[ini]
			ini += 1
			local x, y, z = q[1], q[2], q[3]
			local l = buffer.readu8(nivel, ix(x, y, z))
			if l <= 1 then
				continue
			end
			for k = 1, 4 do
				local d = DIR6[k]
				for _, dy in { 0, 1, -1 } do
					local nx, ny, nz = x + d[1], y + dy, z + d[3]
					if not dentro(nx, ny, nz) then
						continue
					end
					if not esCable(bq(nx, ny, nz)) then
						continue
					end
					if dy == 1 and esSolido(g(x, y + 1, z)) then
						continue
					end
					if dy == -1 and esSolido(g(nx, y, nz)) then
						continue
					end
					local kk = ix(nx, ny, nz)
					if buffer.readu8(nivel, kk) < l - 1 then
						buffer.writeu8(nivel, kk, l - 1)
						table.insert(fila, { nx, ny, nz })
					end
				end
			end
		end
		potDebil = table.clone(potFuerte)
		for _, q in cables do
			local x, y, z = q[1], q[2], q[3]
			if buffer.readu8(nivel, ix(x, y, z)) == 0 then
				continue
			end
			potDebil[clave(x, y - 1, z)] = true
			for k = 1, 4 do
				local d = DIR6[k]
				if esSolido(g(x + d[1], y, z + d[3])) then
					potDebil[clave(x + d[1], y, z + d[3])] = true
				end
			end
		end
		local cambio = false
		for _, q in antorchas do
			local x, y, z = q[1], q[2], q[3]
			local b = bq(x, y, z)
			local nuevo = potDebil[clave(x, y - 1, z)] and B.antorchaROff or B.antorchaR
			if b ~= nuevo then
				buffer.writeu16(blq, ix(x, y, z) * 2, nuevo)
				cambio = true
			end
		end
		if not cambio then
			break
		end
	end
	for _, q in antorchas do
		local b = bq(q[1], q[2], q[3])
		if get(q[1], q[2], q[3]) ~= b then
			set(q[1], q[2], q[3], b)
		end
	end
	for _, q in cables do
		local b = CABLE0 + buffer.readu8(nivel, ix(q[1], q[2], q[3]))
		if get(q[1], q[2], q[3]) ~= b then
			set(q[1], q[2], q[3], b)
		end
	end
	local function recibe(x, y, z)
		for _, d in DIR6 do
			local nx, ny, nz = x + d[1], y + d[2], z + d[3]
			local n = g(nx, ny, nz)
			if esFuente(n) then
				return true
			end
			if esCable(n) and (dentro(nx, ny, nz) and buffer.readu8(nivel, ix(nx, ny, nz)) or potenciaCable(n)) > 0 then
				return true
			end
			if potDebil[clave(nx, ny, nz)] then
				return true
			end
		end
		return false
	end
	for _, q in consumidores do
		local x, y, z = q[1], q[2], q[3]
		local b = get(x, y, z)
		local d = BL[b]
		if not d then
			continue
		end
		if d.redstone == "lampara" then
			local nuevo = recibe(x, y, z) and B.lamparaOn or B.lampara
			if b ~= nuevo then
				set(x, y, z, nuevo)
			end
		elseif d.puerta and (d.puerta.m or 0) == 0 then
			local on = recibe(x, y, z) or recibe(x, y + 1, z)
			local pu = d.puerta
			if (pu.ab and pu.ab ~= 0 and true or false) ~= on then
				local base = 149 + pu.f * 4 + (on and 1 or 0) * 2
				set(x, y, z, base)
				set(x, y + 1, z, base + 1)
				if ctx.sonido then
					ctx.sonido("puerta", x, y, z)
				end
			end
		elseif b == B.tnt then
			if recibe(x, y, z) then
				set(x, y, z, 0)
				if ctx.activarTNT then
					ctx.activarTNT(x, y, z)
				end
			end
		elseif d.piston then
			local on = recibe(x, y, z)
			if on and not d.piston.ext then
				extenderPiston(x, y, z, d.piston)
			elseif not on and d.piston.ext then
				retraerPiston(x, y, z, d.piston)
			end
		elseif d.propulsor then
			local on = recibe(x, y, z)
			if on ~= (d.encendido == true) then
				local recto = d.riel[1] == 0 or d.riel[1] == 2
				set(x, y, z, on and (recto and B.riel12 or B.riel13) or (recto and B.riel10 or B.riel11))
			end
		end
	end
end

local function procesar(dt)
	rsT -= dt
	if rsT > 0 or nCola == 0 then
		return
	end
	rsT = 0.1
	local puntos = {}
	for _, p in cola do
		table.insert(puntos, p)
	end
	cola, nCola = {}, 0
	local x0, y0, z0, x1, y1, z1 = math.huge, math.huge, math.huge, -math.huge, -math.huge, -math.huge
	for _, p in puntos do
		x0, y0, z0 = min(x0, p[1]), min(y0, p[2]), min(z0, p[3])
		x1, y1, z1 = max(x1, p[1]), max(y1, p[2]), max(z1, p[3])
	end
	local R = 16
	x0 -= R
	z0 -= R
	x1 += R
	z1 += R
	y0, y1 = max(0, y0 - 6), min(CY - 1, y1 + 6)
	if x1 - x0 > 80 or z1 - z0 > 80 then
		for _, p in puntos do
			local k = clave(p[1], p[2], p[3])
			if not cola[k] then
				nCola += 1
			end
			cola[k] = p
		end
		x1, z1 = x0 + 80, z0 + 80
	end
	calcular(x0, y0, z0, x1, y1, z1)
end

------------------------------------------------------------------
-- Palancas, botones y placas
------------------------------------------------------------------
local botones = {}
function Redstone.usar(x, y, z, b)
	local d = BL[b]
	if not d or not d.redstone then
		return false
	end
	if d.redstone == "palanca" then
		Mundo.set(x, y, z, d.on and B.palanca or B.palancaOn)
		if ctx.sonido then
			ctx.sonido("puerta", x, y, z)
		end
		return true
	end
	if d.redstone == "boton" and not d.on then
		Mundo.set(x, y, z, B.botonOn)
		table.insert(botones, { x = x, y = y, z = z, t = 1 })
		if ctx.sonido then
			ctx.sonido("puerta", x, y, z)
		end
		return true
	end
	return false
end

local placasActivas = {}
local placaT = 0
local function actualizarPlacas(dt)
	for i = #botones, 1, -1 do
		local bt = botones[i]
		bt.t -= dt
		if bt.t <= 0 then
			if get(bt.x, bt.y, bt.z) == B.botonOn then
				Mundo.set(bt.x, bt.y, bt.z, B.boton)
			end
			table.remove(botones, i)
		end
	end
	placaT -= dt
	if placaT > 0 then
		return
	end
	placaT = 0.15
	local ocupadas = {}
	local function marcar(x, y, z)
		x, y, z = floor(x), floor(y + 0.05), floor(z)
		local b = getSC(x, y, z)
		if b == B.placa or b == B.placaOn then
			ocupadas[clave(x, y, z)] = { x, y, z }
		end
	end
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 then
			local p = r.Position / BS
			marcar(p.X, p.Y - 1, p.Z)
		end
	end
	for _, m in Mobs.lista do
		if not m.muerto then
			marcar(m.x, m.y, m.z)
		end
	end
	for _, e in Entidades.lista do
		if not e.muerta and e.tipo == "item" then
			marcar(e.x, e.y, e.z)
		end
	end
	for k, q in ocupadas do
		if not placasActivas[k] then
			if get(q[1], q[2], q[3]) == B.placa then
				Mundo.set(q[1], q[2], q[3], B.placaOn)
			end
			placasActivas[k] = q
		end
	end
	for k, q in placasActivas do
		if not ocupadas[k] then
			placasActivas[k] = nil
			if get(q[1], q[2], q[3]) == B.placaOn then
				Mundo.set(q[1], q[2], q[3], B.placa)
			end
		end
	end
end

------------------------------------------------------------------
-- Forma de los raíles
------------------------------------------------------------------
local function esRiel(id)
	return id >= 1260 and id <= 1273
end
local function rielEn(x, y, z)
	for _, dy in { 0, -1, 1 } do
		local b = get(x, y + dy, z)
		if esRiel(b) then
			return y + dy, b
		end
	end
	return nil
end
local function formaRiel(x, y, z, dirPreferida)
	local b = get(x, y, z)
	if not esRiel(b) then
		return
	end
	local prop = BL[b].propulsor
	local vecinos = {}
	for d = 0, 3 do
		local ry = rielEn(x + DIRF[d + 1][1], y, z + DIRF[d + 1][2])
		if ry then
			table.insert(vecinos, { d = d, y = ry })
		end
	end
	local id
	local function sube(v)
		return v.y > y
	end
	if #vecinos >= 2 then
		local a, c = vecinos[1], vecinos[2]
		for i = 1, #vecinos do
			for j = i + 1, #vecinos do
				if (vecinos[i].d + 2) % 4 == vecinos[j].d then
					a, c = vecinos[i], vecinos[j]
				end
			end
		end
		if (a.d + 2) % 4 == c.d then
			local up = sube(a) and a or sube(c) and c or nil
			id = (up and not prop) and 1266 + up.d or (a.d % 2 == 0 and 1260 or 1261)
		elseif prop then
			id = a.d % 2 == 0 and 1260 or 1261
		else
			local p1, p2 = math.min(a.d, c.d), math.max(a.d, c.d)
			id = ({ ["01"] = 1262, ["12"] = 1263, ["23"] = 1264, ["03"] = 1265 })[p1 .. p2]
		end
	elseif #vecinos == 1 then
		local v = vecinos[1]
		id = (sube(v) and not prop) and 1266 + v.d or (v.d % 2 == 0 and 1260 or 1261)
	else
		id = (dirPreferida or 0) % 2 == 0 and 1260 or 1261
	end
	if not id then
		return
	end
	if prop then
		local recto = id == 1260 or (id >= 1266 and (id - 1266) % 2 == 0)
		id = recto and 1270 or 1271
		if BL[b].encendido then
			id += 2
		end
	end
	if id ~= b then
		set(x, y, z, id)
	end
end
function Redstone.colocarRiel(x, y, z, dirPreferida)
	formaRiel(x, y, z, dirPreferida)
	for d = 0, 3 do
		local dx, dz = DIRF[d + 1][1], DIRF[d + 1][2]
		local ry, rb = rielEn(x + dx, y, z + dz)
		if ry then
			local cn = BL[rb].riel or { 0, 2 }
			local a, c = DIRF[cn[1] + 1], DIRF[cn[2] + 1]
			local conectado = (x + dx + a[1] == x and z + dz + a[2] == z) or (x + dx + c[1] == x and z + dz + c[2] == z)
			if not conectado then
				formaRiel(x + dx, ry, z + dz)
			end
		end
	end
end
Redstone.esRiel = esRiel

function Redstone.iniciar(c)
	ctx = c
	Mundo.alCambiar(function(x, y, z, antes, nuevo)
		Redstone.avisar(x, y, z, antes, nuevo)
		-- Pistones: la cabeza y la base van juntas
		local da, dn = BL[antes], BL[nuevo]
		if (da and (da.piston or da.cabezaPiston)) or (dn and (dn.piston or dn.cabezaPiston)) then
			for _, v in DIR6 do
				local b = getSC(x + v[1], y + v[2], z + v[3])
				local d = BL[b]
				if d and (d.cabezaPiston or (d.piston and d.piston.ext)) then
					Redstone.comprobarPiston(x + v[1], y + v[2], z + v[3])
				end
			end
		end
	end)
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		local ok, err = pcall(procesar, dt)
		if not ok then
			warn("[Blockverse] Redstone: " .. tostring(err))
		end
		pcall(actualizarPlacas, dt)
	end)
end

return Redstone
