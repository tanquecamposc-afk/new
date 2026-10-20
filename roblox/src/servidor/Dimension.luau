--[[
	Blockverse para Roblox · Dimensiones (servidor)
	Como jugador.js, dragon.js y extras.js del juego web:
	· Portales del Nether: marco de obsidiana de 2×3 a 21×21 que se
	  enciende con el mechero; 4 s dentro (1 s en creativo) para viajar.
	  Las coordenadas se dividen o multiplican por 8 y, si no hay portal
	  cerca al otro lado, se construye uno.
	· Portal del End: los 12 marcos de la fortaleza con su ojo de Ender.
	  Lleva a la plataforma de obsidiana del End.
	· El Ender Dragon (200 de vida) con sus 10 cristales que lo curan:
	  rodea las columnas, embiste, se posa sobre el portal y lanza bolas.
	  Al morir suelta experiencia, abre el portal de salida, deja el huevo
	  y crea el portal de acceso a las islas exteriores.
	· Criaturas propias del Nether y del End.
	Cada dimensión está en su propia zona del mapa (ver Generador.dimensionDe).
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Generador = require(Comp.Generador)
local Dimensiones = require(Comp.Dimensiones)
local MundoDatos = require(Comp.MundoDatos)
local Mundo = require(script.Parent.Mundo)
local Mobs = require(script.Parent.Mobs)
local Entidades = require(script.Parent.Entidades)

local BS = Config.BLOQUE
local B = Registro.B
local SOLIDO, esLiquido = Registro.SOLIDO, Registro.esLiquido
local CX, CZ, CY, OY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY, Generador.OY
local NIVEL_MAR = Generador.NIVEL_MAR
local floor, abs, sqrt = math.floor, math.abs, math.sqrt
local END_TOP, EPY = Dimensiones.END_TOP, Dimensiones.EPY

local Dim = {}
Dim.estado = { dragonMuerto = false, cristalesRotos = {}, vidaDragon = 200, acceso = nil }
local ctx -- {teletransportar, Estado, estados, ganarXP, danar, aviso, supervivencia}

local NETHER_OFF = Generador.NETHER_CZ * CZ
local END_OFF = Generador.END_CZ * CZ

-- Dimensión de una posición del mapa (en bloques)
function Dim.de(z)
	return (Generador.dimensionBloque(floor(z)))
end
function Dim.offset(dim)
	return dim == "nether" and NETHER_OFF or dim == "end" and END_OFF or 0
end

local function get(x, y, z)
	return Mundo.get(x, y, z)
end
local function set(x, y, z, id)
	Mundo.set(x, y, z, id, { sinAviso = true })
end

------------------------------------------------------------------
-- Portal del Nether
------------------------------------------------------------------
function Dim.intentarPortalNether(x, y, z)
	if Dim.de(z) == "end" then
		return false
	end
	local OBS = B.obsidiana
	for _, eje in { "x", "z" } do
		local function g(a, yy)
			if eje == "x" then
				return get(a, yy, z)
			end
			return get(x, yy, a)
		end
		local c = eje == "x" and x or z
		local y0 = y
		while g(c, y0 - 1) == 0 and y - y0 < 22 do
			y0 -= 1
		end
		if g(c, y0 - 1) ~= OBS then
			continue
		end
		local a0 = c
		while (g(a0 - 1, y0) == 0 or g(a0 - 1, y0) == B.fuego) and c - a0 < 22 do
			a0 -= 1
		end
		if g(a0 - 1, y0) ~= OBS then
			continue
		end
		local a1 = c
		while (g(a1 + 1, y0) == 0 or g(a1 + 1, y0) == B.fuego) and a1 - c < 22 do
			a1 += 1
		end
		if g(a1 + 1, y0) ~= OBS then
			continue
		end
		local ancho = a1 - a0 + 1
		if ancho < 2 or ancho > 21 then
			continue
		end
		local h = 0
		while (g(a0, y0 + h) == 0 or g(a0, y0 + h) == B.fuego) and h < 22 do
			h += 1
		end
		if h < 3 or h > 21 then
			continue
		end
		local ok = true
		for a = a0, a1 do
			if not ok then
				break
			end
			if g(a, y0 - 1) ~= OBS or g(a, y0 + h) ~= OBS then
				ok = false
			end
			for yy = y0, y0 + h - 1 do
				local b = g(a, yy)
				if b ~= 0 and b ~= B.fuego then
					ok = false
					break
				end
			end
		end
		for yy = y0, y0 + h - 1 do
			if g(a0 - 1, yy) ~= OBS or g(a1 + 1, yy) ~= OBS then
				ok = false
			end
		end
		if not ok then
			continue
		end
		for a = a0, a1 do
			for yy = y0, y0 + h - 1 do
				if eje == "x" then
					set(a, yy, z, B.portalNether)
				else
					set(x, yy, a, B.portalNether)
				end
			end
		end
		return true
	end
	return false
end

-- Portal del End: un anillo de 12 marcos con ojo alrededor de un hueco de 3×3
function Dim.comprobarPortalEnd(x, y, z)
	for cx = x - 4, x + 4 do
		for cz = z - 4, z + 4 do
			local ok = true
			for a = -1, 1 do
				if not ok then
					break
				end
				for _, q in { { cx + a, cz - 2 }, { cx + a, cz + 2 }, { cx - 2, cz + a }, { cx + 2, cz + a } } do
					if get(q[1], y, q[2]) ~= B.marcoEndOjo then
						ok = false
						break
					end
				end
			end
			if ok then
				for a = -1, 1 do
					for b = -1, 1 do
						set(cx + a, y, cz + b, B.portalEnd)
					end
				end
				return true
			end
		end
	end
	return false
end

local function construirPortal(tx, tz, dim)
	local ymin = dim == "nether" and OY + 34 or OY + 2
	local ymax = dim == "nether" and OY + 110 or CY - 8
	local mejorY = -1
	local y = ymax
	while y >= ymin and mejorY < 0 do
		local abajo = get(tx, y - 1, tz)
		local ok = SOLIDO[abajo] and not esLiquido(abajo)
		for a = -1, 2 do
			for h = 0, 3 do
				if ok and get(tx + a, y + h, tz) ~= 0 then
					ok = false
				end
			end
		end
		if ok then
			mejorY = y
		end
		y -= 1
	end
	local y0 = mejorY > 0 and mejorY or (dim == "nether" and OY + 70 or NIVEL_MAR + 10)
	for a = -1, 2 do
		for h = -1, 3 do
			for dz = -1, 1 do
				local x, yy, z = tx + a, y0 + h, tz + dz
				if h == -1 then
					set(x, yy, z, B.obsidiana)
				elseif dz == 0 then
					local marco = a == -1 or a == 2 or h == 3
					set(x, yy, z, marco and B.obsidiana or B.portalNether)
				elseif h < 3 then
					set(x, yy, z, 0)
				end
			end
		end
	end
	return tx, y0, tz
end

local function viajarNether(plr, p)
	local origen = Dim.de(p.Z)
	local aNether = origen ~= "nether"
	local destino = aNether and "nether" or "superficie"
	local tx, tz
	if aNether then
		tx, tz = floor(p.X / 8), floor(p.Z / 8) + NETHER_OFF
	else
		tx, tz = floor(p.X * 8), floor((p.Z - NETHER_OFF) * 8)
	end
	-- ¿Hay un portal cerca al otro lado?
	local mejor, md = nil, math.huge
	local r = 16
	for x = tx - r, tx + r do
		for z = tz - r, tz + r do
			if (x - tx) ^ 2 + (z - tz) ^ 2 > r * r then
				continue
			end
			for y = 1, CY - 2 do
				if get(x, y, z) == B.portalNether then
					local d = (x - tx) ^ 2 + (z - tz) ^ 2 + (y - p.Y) ^ 2
					if d < md then
						md = d
						mejor = { x, y, z }
					end
					break
				end
			end
		end
	end
	local x, y, z
	if mejor then
		x, y, z = mejor[1], mejor[2], mejor[3]
		while get(x, y - 1, z) == B.portalNether do
			y -= 1
		end
	else
		x, y, z = construirPortal(tx, tz, destino)
	end
	ctx.teletransportar(plr, x + 0.5, y, z + 0.5, destino == "nether" and "El Nether" or "La Superficie")
end

local function irAlEnd(plr)
	local ox, oy, oz = 100, OY + 48, END_OFF
	for a = -2, 2 do
		for b = -2, 2 do
			set(ox + a, oy, oz + b, B.obsidiana)
			for h = 1, 3 do
				set(ox + a, oy + h, oz + b, 0)
			end
		end
	end
	ctx.teletransportar(plr, ox + 0.5, oy + 1, oz + 0.5, "El End")
	if not Dim.estado.dragonMuerto then
		task.delay(1, function()
			Dim.crearCristales()
			Dim.crearDragon()
		end)
	end
end

local function salirDelEnd(plr)
	local s = ctx.estados[plr]
	if s and s.cama then
		ctx.teletransportar(plr, s.cama[1] + 0.5, s.cama[2] + 1, s.cama[3] + 0.5, "La Superficie")
	else
		local x, z = workspace:GetAttribute("SpawnX") or 0, workspace:GetAttribute("SpawnZ") or 0
		ctx.teletransportar(plr, x + 0.5, Mundo.alturaSuelo(x, z) + 1, z + 0.5, "La Superficie")
	end
	ctx.aviso(plr, "Has vuelto a la Superficie. ¡Gracias por jugar!")
end

-- Portales de acceso a las islas exteriores
local function usarAcceso(plr, p)
	local zl = p.Z - END_OFF
	local lejos = sqrt(p.X ^ 2 + zl ^ 2) > 500
	local tx, tz
	if lejos then
		tx, tz = 0, 0
		local a = Dim.estado.acceso
		if a then
			tx, tz = a[1] * 0.6, a[3] * 0.6
		end
	else
		tx, tz = Dimensiones.salidaAcceso(Mundo.md.semilla)
	end
	tx, tz = floor(tx), floor(tz) + END_OFF
	local y = CY - 2
	while y > 1 and not SOLIDO[get(tx, y, tz)] do
		y -= 1
	end
	if y <= 1 then
		y = END_TOP
		for dx = -2, 2 do
			for dz = -2, 2 do
				set(tx + dx, y, tz + dz, B.piedraEnd)
			end
		end
	end
	if not lejos and get(tx, y + 10, tz) ~= B.portalAcceso then
		set(tx, y + 10, tz, B.portalAcceso)
		set(tx, y + 8, tz, B.lecho)
		set(tx, y + 12, tz, B.lecho)
	end
	ctx.teletransportar(plr, tx + 2.5, y + 1.01, tz + 0.5, lejos and "La isla principal del End" or "Las islas exteriores del End")
end

------------------------------------------------------------------
-- El Ender Dragon y los cristales
------------------------------------------------------------------
local VIDA_DRAGON = 200
local dragon = nil
local cristales = {}
local carpeta

local function pieza(nombre, tam)
	local p = Instance.new("Part")
	p.Name = nombre
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = true
	p.CanTouch = false
	p.Transparency = 1
	p.Size = tam
	return p
end

function Dim.crearCristales()
	carpeta = carpeta or workspace:FindFirstChild("Criaturas")
	for i, p in Dimensiones.PILARES do
		if Dim.estado.cristalesRotos[i] or cristales[i] then
			continue
		end
		local c = pieza("CristalEnd", Vector3.new(1.4, 1.4, 1.4) * BS)
		c.CFrame = CFrame.new((p.x + 0.5) * BS, (p.alto + 2) * BS, (p.z + 0.5 + END_OFF) * BS)
		c:SetAttribute("Cristal", i)
		c.Parent = carpeta
		cristales[i] = c
	end
end

function Dim.romperCristal(i)
	local c = cristales[i]
	if not c then
		return
	end
	cristales[i] = nil
	Dim.estado.cristalesRotos[i] = true
	local pos = c.Position / BS
	c:Destroy()
	if dragon and dragon.cristal == i then
		Dim.herirDragon(10, "cristal")
		dragon.cristal = nil
	end
	if ctx.explosion then
		ctx.explosion(pos.X, pos.Y, pos.Z, 6)
	end
end

function Dim.crearDragon()
	if dragon or Dim.estado.dragonMuerto then
		return
	end
	carpeta = carpeta or workspace:FindFirstChild("Criaturas")
	local p = pieza("EnderDragon", Vector3.new(3, 2.4, 7) * BS)
	p:SetAttribute("Dragon", true)
	p.Parent = carpeta
	dragon = {
		vida = Dim.estado.vidaDragon or VIDA_DRAGON, x = 0, y = END_TOP + 40, z = -40, vx = 0, vy = 0, vz = 0, yaw = 0,
		fase = "rodear", faseT = 12, ang = 0, muerto = false, muerteT = 0, cdAtaque = 0, cdBola = 6, inv = 0, pieza = p,
	}
end

function Dim.esDragon(parte)
	return dragon ~= nil and parte == dragon.pieza
end

function Dim.herirDragon(d, fuente)
	local dr = dragon
	if not dr or dr.muerto or dr.inv > 0 then
		return false
	end
	dr.vida -= d
	dr.inv = 0.4
	dr.pieza:SetAttribute("golpe", os.clock())
	if (fuente == "jugador" or fuente == "flecha") and dr.fase == "posar" then
		dr.faseT = math.min(dr.faseT, 1.5)
	end
	if dr.vida <= 0 then
		dr.vida = 0
		dr.muerto = true
		dr.muerteT = 0
		dr.pieza:SetAttribute("muerto", true)
	end
	return true
end

local function activarPortalSalida()
	for x = -3, 3 do
		for z = -3, 3 do
			local r = sqrt(x * x + z * z)
			if r < 2.5 and not (x == 0 and z == 0) then
				set(x, EPY + 1, z + END_OFF, B.portalEnd)
			end
		end
	end
	set(0, EPY + 5, END_OFF, B.huevoDragon)
	local a = (Mundo.md.semilla % 628) / 100
	local gx, gz, gy = math.round(math.cos(a) * 96), math.round(math.sin(a) * 96), END_TOP + 22
	set(gx, gy, gz + END_OFF, B.portalAcceso)
	set(gx, gy - 2, gz + END_OFF, B.lecho)
	set(gx, gy + 2, gz + END_OFF, B.lecho)
	Dim.estado.acceso = { gx, gy, gz }
end

local function jugadoresEnEnd()
	local t = {}
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 and Dim.de(r.Position.Z / BS) == "end" then
			table.insert(t, { plr = plr, x = r.Position.X / BS, y = r.Position.Y / BS - 1, z = r.Position.Z / BS - END_OFF, h = h })
		end
	end
	return t
end

local tiempo = 0
local function actualizarDragon(dt)
	local d = dragon
	if not d then
		return
	end
	local js = jugadoresEnEnd()
	d.inv = math.max(0, d.inv - dt)
	if d.muerto then
		d.muerteT += dt
		d.yaw += dt * 0.5
		d.y += dt * 2
		d.pieza.CFrame = CFrame.new(d.x * BS, d.y * BS, (d.z + END_OFF) * BS) * CFrame.Angles(0, d.yaw, 0)
		if d.muerteT > 6 then
			Dim.estado.dragonMuerto = true
			for _, j in js do
				ctx.ganarXP(j.plr, 12000)
				ctx.aviso(j.plr, "¡Has derrotado al Ender Dragon! Se abrió el portal de salida.")
			end
			activarPortalSalida()
			d.pieza:Destroy()
			dragon = nil
		end
		return
	end
	if #js == 0 then
		return
	end
	d.faseT -= dt
	d.cdAtaque -= dt
	d.cdBola -= dt
	-- Jugador más cercano
	local j, dj = js[1], math.huge
	for _, q in js do
		local dd = sqrt((q.x - d.x) ^ 2 + (q.y - d.y) ^ 2 + (q.z - d.z) ^ 2)
		if dd < dj then
			j, dj = q, dd
		end
	end
	local valido = j.plr:GetAttribute("Modo") ~= "creativo"
	local ox, oy, oz
	local alturaVuelo = END_TOP + 22 + math.sin(tiempo * 0.4) * 6
	if d.fase == "rodear" then
		d.ang += dt * 0.18
		ox, oy, oz = math.cos(d.ang) * 45, alturaVuelo, math.sin(d.ang) * 45
		if d.faseT <= 0 and valido then
			local r = math.random()
			if r < 0.45 then
				d.fase, d.faseT = "embestir", 7
			elseif r < 0.75 then
				d.fase, d.faseT = "posar", 14
			else
				d.faseT = 6 + math.random() * 6
			end
		end
		if d.cdBola <= 0 and valido and dj < 70 then
			d.cdBola = 8 + math.random() * 6
			local dir = Vector3.new(j.x - d.x, j.y + 1 - d.y, j.z - d.z).Unit
			local hx, hz = d.x + math.sin(d.yaw) * 9, d.z + math.cos(d.yaw) * 9
			Entidades.disparar("bolaFuego", hx, d.y, hz + END_OFF, dir, 18, { dano = 6, dueno = "dragon" })
		end
	elseif d.fase == "embestir" then
		ox, oy, oz = j.x, j.y + 1.5, j.z
		if d.faseT <= 0 or sqrt((ox - d.x) ^ 2 + (oy - d.y) ^ 2 + (oz - d.z) ^ 2) < 3 then
			d.fase, d.faseT = "rodear", 10 + math.random() * 8
		end
	else
		ox, oy, oz = 0, EPY + 6, 0
		if sqrt(d.x ^ 2 + (d.y - oy) ^ 2 + d.z ^ 2) < 3 then
			d.vx *= 0.1 ^ dt
			d.vy *= 0.1 ^ dt
			d.vz *= 0.1 ^ dt
		end
		if d.faseT <= 0 then
			d.fase, d.faseT = "rodear", 10
		end
	end
	local hx, hy, hz = ox - d.x, oy - d.y, oz - d.z
	local dist = sqrt(hx * hx + hy * hy + hz * hz)
	local velMax = d.fase == "embestir" and 19 or d.fase == "posar" and 10 or 13
	if dist > 0.5 then
		local f = math.min(1, dt * 1.5)
		d.vx += (hx / dist * velMax - d.vx) * f
		d.vy += (hy / dist * velMax - d.vy) * f
		d.vz += (hz / dist * velMax - d.vz) * f
	end
	d.x += d.vx * dt
	d.y += d.vy * dt
	d.z += d.vz * dt
	local yawObj = math.atan2(d.vx, d.vz)
	local giro = ((yawObj - d.yaw + math.pi * 3) % (math.pi * 2)) - math.pi
	d.yaw += giro * math.min(1, dt * 3)
	local inclinacion = -math.clamp(d.vy / velMax, -0.6, 0.6) * 0.6
	-- La pieza mira hacia -Z en su espacio (como las criaturas): giro de 180°
	d.pieza.CFrame = CFrame.new(d.x * BS, d.y * BS, (d.z + END_OFF) * BS) * CFrame.Angles(0, d.yaw + math.pi, 0) * CFrame.Angles(-inclinacion, 0, giro * 0.4)
	d.pieza:SetAttribute("fase", d.fase)
	-- Daño por contacto (cuerpo y cabeza)
	if valido and d.cdAtaque <= 0 then
		local cuerpo = sqrt((j.x - d.x) ^ 2 + (j.y + 1 - d.y) ^ 2 + (j.z - d.z) ^ 2)
		local cabX, cabZ = d.x + math.sin(d.yaw) * 9.8, d.z + math.cos(d.yaw) * 9.8
		local cabeza = sqrt((j.x - cabX) ^ 2 + (j.y + 1 - d.y) ^ 2 + (j.z - cabZ) ^ 2)
		if cuerpo < 4.1 or cabeza < 2.5 then
			d.cdAtaque = 1
			local dx, dz = j.x - d.x, j.z - d.z
			local l = math.max(0.01, sqrt(dx * dx + dz * dz))
			ctx.danar(j.plr, 10, "mob", { x = dx / l * 1.6, z = dz / l * 1.6 })
			if d.fase == "embestir" then
				d.fase, d.faseT = "rodear", 10
			end
		end
	end
	-- Curación con el cristal más cercano
	local mejor, mdist = nil, 32
	for i, c in cristales do
		local p = c.Position / BS
		local dd = sqrt((p.X - d.x) ^ 2 + (p.Y - d.y) ^ 2 + (p.Z - END_OFF - d.z) ^ 2)
		if dd < mdist then
			mejor, mdist = i, dd
		end
	end
	d.cristal = mejor
	d.pieza:SetAttribute("Cristal", mejor)
	if mejor then
		d.vida = math.min(VIDA_DRAGON, d.vida + dt * 2)
	end
	Dim.estado.vidaDragon = d.vida
end

------------------------------------------------------------------
-- Criaturas del Nether y del End (mobs.js)
------------------------------------------------------------------
local BN = Dimensiones.BN
local function aparicion(j, dim)
	local ang = math.random() * math.pi * 2
	local dd = 24 + math.random() * 24
	local x, zl = floor(j.x + math.cos(ang) * dd), floor(j.zl + math.sin(ang) * dd)
	local off = Dim.offset(dim)
	local z = zl + off
	if Mundo.md:getSiCargado(x, 100, z) < 0 then
		return
	end
	local function contar(t)
		return Mobs.contar(function(m)
			return m.tipo == t
		end)
	end
	if dim == "nether" then
		if #Mobs.lista >= 18 then
			return
		end
		local bn = Dimensiones.biomaNether(Mundo.md.semilla, x, zl)
		local y0 = math.clamp(floor(j.y + (math.random() - 0.4) * 40), OY + 6, CY - 8)
		if bn ~= BN.desierto and math.random() < 0.7 then
			local y2 = Mobs.buscarSuelo(x, y0, z, 24, 3)
			if y2 < 0 then
				return
			end
			local tipo = bn == BN.carmesi and (math.random() < 0.6 and "hoglin" or "piglin") or bn == BN.distorsionado and "enderman"
				or bn == BN.valle and (math.random() < 0.7 and "esqueleto" or "ghast") or (math.random() < 0.8 and "cuboMagma" or "ghast")
			if tipo == "ghast" then
				if contar("ghast") < 3 then
					Mobs.crear("ghast", x + 0.5, y2 + 6, z + 0.5)
				end
				return
			end
			if contar(tipo) >= 8 then
				return
			end
			Mobs.crear(tipo, x + 0.5, y2, z + 0.5, { tam = math.random(0, 2) })
			return
		end
		local y = Mobs.buscarSuelo(x, y0, z, 24, 3)
		if y < 0 then
			return
		end
		local enFort = false
		for _, f in Dimensiones.fortalezasCerca(Mundo.md.semilla, x, zl) do
			if abs(x - f.x) < 50 and abs(zl - f.z) < 50 and abs(y - f.y) < 12 then
				enFort = true
			end
		end
		if enFort and contar("blaze") < 6 and math.random() < 0.5 then
			Mobs.crear("blaze", x + 0.5, y + 0.5, z + 0.5)
			return
		end
		if math.random() < 0.15 and contar("ghast") < 3 then
			Mobs.crear("ghast", x + 0.5, y + 6, z + 0.5)
			return
		end
		if contar("piglin") < 12 then
			for k = 0, math.random(2, 4) - 1 do
				local oy = Mobs.buscarSuelo(x + k, y + 2, z, 6, 2)
				if oy > 0 then
					Mobs.crear("piglin", x + k + 0.5, oy, z + 0.5)
				end
			end
		end
	elseif dim == "end" then
		if contar("enderman") >= 12 then
			return
		end
		local y = Mobs.buscarSuelo(x, END_TOP + 10, z, 40, 3)
		if y > 0 then
			Mobs.crear("enderman", x + 0.5, y, z + 0.5)
		end
	end
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
local portalT = {} -- plr -> segundos dentro del portal
local bloqueo = {} -- plr -> true mientras no salga del portal

function Dim.iniciar(c)
	ctx = c
	local acum = 0
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		tiempo += dt
		pcall(actualizarDragon, dt)
		for _, plr in Players:GetPlayers() do
			local ch = plr.Character
			local r = ch and ch:FindFirstChild("HumanoidRootPart")
			local h = ch and ch:FindFirstChildOfClass("Humanoid")
			if not r or not h or h.Health <= 0 or r.Anchored then
				continue
			end
			local p = r.Position / BS
			local pies = Vector3.new(p.X, p.Y - 1, p.Z)
			local dim = Dim.de(p.Z)
			if plr:GetAttribute("Dimension") ~= dim then
				plr:SetAttribute("Dimension", dim)
			end
			local enNether, enEnd, enAcceso = false, false, false
			for _, dy in { 0.1, 1, 1.7 } do
				local b = Mundo.md:getSiCargado(floor(pies.X), floor(pies.Y + dy), floor(pies.Z))
				if b == B.portalNether then
					enNether = true
				elseif b == B.portalEnd then
					enEnd = true
				elseif b == B.portalAcceso then
					enAcceso = true
				end
			end
			if not enNether and not enEnd and not enAcceso then
				bloqueo[plr] = nil
				portalT[plr] = 0
				continue
			end
			if bloqueo[plr] then
				continue
			end
			if enAcceso and dim == "end" then
				bloqueo[plr] = true
				task.spawn(pcall, usarAcceso, plr, pies)
			elseif enEnd then
				bloqueo[plr] = true
				if dim == "end" then
					task.spawn(pcall, salirDelEnd, plr)
				else
					task.spawn(pcall, irAlEnd, plr)
				end
			elseif enNether then
				local creativo = plr:GetAttribute("Modo") == "creativo"
				portalT[plr] = (portalT[plr] or 0) + dt
				if portalT[plr] >= (creativo and 1 or 4) then
					portalT[plr] = 0
					bloqueo[plr] = true
					task.spawn(function()
						local ok, err = pcall(viajarNether, plr, pies)
						if not ok then
							warn("[Blockverse] Portal: " .. tostring(err))
						end
					end)
				end
			end
		end
		-- Criaturas del Nether y del End
		acum += dt
		if acum >= 0.5 then
			acum = 0
			for _, plr in Players:GetPlayers() do
				local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
				if r then
					local p = r.Position / BS
					local dim = Dim.de(p.Z)
					if dim == "nether" or dim == "end" then
						pcall(aparicion, { x = p.X, y = p.Y - 1, zl = p.Z - Dim.offset(dim) }, dim)
					end
				end
			end
			-- Barra del jefe para quien esté en el End
			for _, plr in Players:GetPlayers() do
				local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
				local enEnd = r and Dim.de(r.Position.Z / BS) == "end"
				if enEnd and dragon then
					ctx.Estado:FireClient(plr, "jefe", { nombre = "Ender Dragon", f = dragon.vida / VIDA_DRAGON, col = "#d050ff" })
				elseif plr:GetAttribute("VeJefe") then
					ctx.Estado:FireClient(plr, "jefe", nil)
				end
				plr:SetAttribute("VeJefe", (enEnd and dragon) and true or nil)
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(plr)
		portalT[plr] = nil
		bloqueo[plr] = nil
	end)
end

-- ¿Un proyectil en (x, y, z) (bloques) da al dragón o a un cristal?
function Dim.golpeProyectil(x, y, z, dano)
	for i, c in cristales do
		local p = c.Position / BS
		if math.abs(p.X - x) < 1 and math.abs(p.Y - y) < 1 and math.abs(p.Z - z) < 1 then
			Dim.romperCristal(i)
			return true
		end
	end
	local d = dragon
	if d and not d.muerto then
		local zl = z - END_OFF
		local cuerpo = sqrt((x - d.x) ^ 2 + (y - d.y) ^ 2 + (zl - d.z) ^ 2)
		local cabeza = sqrt((x - d.x - math.sin(d.yaw) * 9.8) ^ 2 + (y - d.y) ^ 2 + (zl - d.z - math.cos(d.yaw) * 9.8) ^ 2)
		if cuerpo < 3.6 or cabeza < 2 then
			Dim.herirDragon(dano or 4, "flecha")
			return true
		end
	end
	return false
end

-- Al apuntar con el mechero a un bloque: ¿enciende un portal?
function Dim.encender(x, y, z)
	return Dim.intentarPortalNether(x, y, z)
end

return Dim
