--[[
	Blockverse para Roblox · Criaturas (servidor)
	IA de mobs.js del juego web, para varios jugadores:
	· Hostiles cuerpo a cuerpo (zombi, araña que salta…), esqueletos que
	  disparan flechas, creepers que explotan, endermans que se
	  teletransportan, slimes que saltan y se dividen, ghasts y blazes con
	  bolas de fuego, gólems que defienden, aldeanos que huyen de los zombis.
	· Animales que pasean, huyen al recibir daño, siguen la comida en la
	  mano y tienen crías. Peces que nadan y criaturas que vuelan.
	· Se queman al sol, mueren en la lava, sueltan su botín y experiencia.
	La física es la del juego web (cajas contra bloques). Cada criatura es
	una pieza invisible que el cliente viste con el modelo del juego web.
]]
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Generador = require(Comp.Generador)
local Fisica = require(Comp.Fisica)
local Rayo = require(Comp.Rayo)
local DatosMobs = require(Comp.Datos.Mobs)
local Hornos = require(Comp.Datos.Hornos)
local Mundo = require(script.Parent.Mundo)
local Entidades = require(script.Parent.Entidades)

local BS = Config.BLOQUE
local B, I = Registro.B, Registro.I
local SOLIDO, OPACO = Registro.SOLIDO, Registro.OPACO
local esAgua, esLava, esLiquido = Registro.esAgua, Registro.esLava, Registro.esLiquido
local DEF = DatosMobs.defs

local Mobs = {}
Mobs.lista = {}
Mobs.DEF = DEF
Mobs.alDanarJugador = nil -- function(plr, dano, tipo, dir)
Mobs.alExplotar = nil -- function(x, y, z, potencia, fuente)
Mobs.esCreativo = nil -- function(plr) -> bool
Mobs.alComerciar = nil

local carpeta = Instance.new("Folder")
carpeta.Name = "Criaturas"
carpeta.Parent = workspace
Mobs.carpeta = carpeta

local tiempo = 0

------------------------------------------------------------------
-- Utilidades
------------------------------------------------------------------
local function esDeNoche()
	local t = Lighting.ClockTime
	return t < 5.6 or t > 18.4
end
Mobs.esDeNoche = esDeNoche

local function azar(a, b)
	return math.random(a, b)
end

-- Jugadores que pueden ser objetivo (vivos y en supervivencia)
local function jugadoresValidos()
	local r = {}
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local root = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if root and h and h.Health > 0 and not root.Anchored and not (Mobs.esCreativo and Mobs.esCreativo(plr)) then
			local p = root.Position / BS
			table.insert(r, { plr = plr, x = p.X, y = p.Y - 1.0, z = p.Z, h = h, root = root })
		end
	end
	return r
end

local function masCercano(m, lista, maxDist)
	local mejor, dm = nil, maxDist
	for _, j in lista do
		local d = math.sqrt((j.x - m.x) ^ 2 + (j.y - m.y) ^ 2 + (j.z - m.z) ^ 2)
		if d < dm then
			mejor, dm = j, d
		end
	end
	return mejor, dm
end

local function lineaVision(ax, ay, az, bx, by, bz)
	local d = Vector3.new(bx - ax, by - ay, bz - az)
	local l = d.Magnitude
	if l < 0.01 then
		return true
	end
	local r = Rayo.lanzar(Mundo.md, Vector3.new(ax, ay, az) * BS, d / l, l)
	return not r or r.t >= l - 0.3
end

local function expuestoAlCielo(m)
	local x, z = math.floor(m.x), math.floor(m.z)
	for y = math.floor(m.y + m.alto), Mundo.md.gen and 191 or 191 do
		local b = Mundo.md:getSiCargado(x, y, z)
		if b > 0 and OPACO[b] then
			return false
		end
	end
	return true
end

------------------------------------------------------------------
-- Crear y quitar
------------------------------------------------------------------
function Mobs.crear(tipo, x, y, z, opc)
	local def = DEF[tipo]
	if not def then
		return nil
	end
	opc = opc or {}
	local m = {
		tipo = tipo, def = def, x = x, y = y, z = z, vx = 0, vy = 0, vz = 0,
		ancho = def.ancho or 0.3, alto = def.alto or 1, vida = def.vida or 10, vidaMax = def.vida or 10,
		yaw = math.random() * 6.28, yawObj = 0, mover = false, velObj = def.vel or 1, t = 0, huir = 0, cd = math.random(), inv = 0,
		fuego = 0, fuegoT = 0, suelo = false, chocoH = false, subir = true, vuela = def.vuela == true, enfadado = 0, mecha = 0,
		amor = 0, bebe = opc.bebe and 300 or 0, ox = x, oy = y, oz = z, ataqueT = 0, rafaga = 0, golpeT = 0,
		variante = opc.variante, edad = 0,
	}
	if def.ia == "cubo" then
		local tam = opc.tam or 1
		local t = ({ 0.5, 1, 2 })[tam + 1]
		m.tam = tam
		m.ancho = t / 2 * 0.98
		m.alto = t
		m.vida = ({ 1, 4, 16 })[tam + 1]
		m.vidaMax = m.vida
	end
	if m.bebe > 0 then
		m.ancho *= 0.5
		m.alto *= 0.5
	end
	local p = Instance.new("Part")
	p.Name = tipo
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = true
	p.CanTouch = false
	p.CastShadow = false
	p.Transparency = 1
	p.Size = Vector3.new(math.max(0.4, m.ancho * 2 * BS), math.max(0.4, m.alto * BS), math.max(0.4, m.ancho * 2 * BS))
	p:SetAttribute("Mob", tipo)
	if m.tam then
		p:SetAttribute("tam", m.tam)
	end
	if m.bebe > 0 then
		p:SetAttribute("bebe", true)
	end
	if m.variante then
		p:SetAttribute("variante", m.variante)
	end
	p.CFrame = CFrame.new(x * BS, (y + m.alto / 2) * BS, z * BS)
	p.Parent = carpeta
	m.pieza = p
	table.insert(Mobs.lista, m)
	if tipo == "aldeano" and Mobs.alCrearAldeano then
		Mobs.alCrearAldeano(m, opc)
	end
	return m
end

function Mobs.quitar(m)
	if m.quitado then
		return
	end
	m.quitado = true
	m.muerto = true
	if m.pieza then
		m.pieza:SetAttribute("muerto", true)
		local p = m.pieza
		task.delay(1, function()
			p:Destroy()
		end)
	end
end

function Mobs.desdeParte(p)
	if not p then
		return nil
	end
	for _, m in Mobs.lista do
		if m.pieza == p and not m.muerto then
			return m
		end
	end
	return nil
end

------------------------------------------------------------------
-- Daño y muerte
------------------------------------------------------------------
local function teletransportar(m)
	for _ = 1, 16 do
		local x = math.floor(m.x + (math.random() - 0.5) * 32)
		local z = math.floor(m.z + (math.random() - 0.5) * 32)
		local y = math.floor(m.y + (math.random() - 0.5) * 16)
		for _ = 1, 16 do
			if y <= 1 then
				break
			end
			local md = Mundo.md
			local ab = md:getSiCargado(x, y - 1, z)
			if ab > 0 and SOLIDO[ab] and md:getSiCargado(x, y, z) == 0 and md:getSiCargado(x, y + 1, z) == 0 and md:getSiCargado(x, y + 2, z) == 0 and not esLiquido(ab) then
				m.x, m.y, m.z = x + 0.5, y, z + 0.5
				m.vx, m.vy, m.vz = 0, 0, 0
				m.pieza:SetAttribute("tele", tiempo)
				return true
			end
			y -= 1
		end
	end
	return false
end

function Mobs.matar(m, fuente, plr)
	if Mobs.alMorirExtra and not m.muerto then
		pcall(Mobs.alMorirExtra, m)
	end
	-- Criaturas de los modos de juego (bots de Bed Wars, enemigos de las Mazmorras…)
	if m.alMorir and not m.muerto then
		pcall(m.alMorir, m, fuente)
	end
	if m.muerto then
		return
	end
	m.muerto = true
	local def = m.def
	if m.bebe <= 0 and not (def.ia == "cubo" and m.tam and m.tam > 0) then
		for _, s in def.sueltaMuestra or {} do
			local id, mn, mx, p = s[1], s[2], s[3], s[4]
			if math.random() < p then
				local n = math.random(mn, mx)
				if n > 0 then
					local real = (m.fuego > 0 and Hornos.cocinado and Hornos.cocinado[id]) or id
					Entidades.soltarItem(Registro.pila(real, n), m.x, m.y + 0.5, m.z, true)
				end
			end
		end
		if plr or (tiempo - (m.ultimoGolpeJugador or -99) < 5) then
			local xp = def.xp or { 0, 0 }
			local v = math.random(xp[1] or 0, xp[2] or 0)
			if v > 0 then
				Entidades.soltarXP(v, m.x, m.y, m.z)
			end
		end
	end
	if def.ia == "cubo" and m.tam and m.tam > 0 then
		for _ = 1, azar(2, 4) do
			Mobs.crear(m.tipo, m.x + (math.random() - 0.5), m.y + 0.3, m.z + (math.random() - 0.5), { tam = m.tam - 1 })
		end
	end
	Mobs.quitar(m)
end

-- d: daño; dir: {x, z} empuje; fuente: "jugador" | "flechaJugador" | "fuego" | "lava" | "explosion" | …
function Mobs.herir(m, d, dir, fuente, empuje, plr)
	if m.muerto then
		return
	end
	local def = m.def
	if def.invulnerable then
		return
	end
	if m.inv > 0 and fuente ~= "fuego" then
		return
	end
	if m.alHerir then
		d = m.alHerir(m, d, fuente, plr)
		if not d or d <= 0 then
			return
		end
	end
	if def.inmuneFuego and (fuente == "fuego" or fuente == "lava") then
		return
	end
	m.vida -= d
	m.inv = fuente == "fuego" and 0 or 0.5
	m.pieza:SetAttribute("golpe", tiempo)
	if dir then
		local k = 7 + (empuje or 0) * 5
		m.vx += dir.x * k
		m.vz += dir.z * k
		m.vy = math.max(m.vy, 5.5)
	end
	if def.tipo == "pasivo" then
		m.huir = 5
	end
	if fuente == "jugador" or fuente == "flechaJugador" then
		m.ultimoGolpeJugador = tiempo
		m.atacante = plr
		if def.tipo == "neutral" then
			m.enfadado = 30
			if m.tipo == "piglin" then
				for _, o in Mobs.lista do
					if o.tipo == "piglin" and math.abs(o.x - m.x) + math.abs(o.z - m.z) < 24 then
						o.enfadado = 30
						o.atacante = plr
					end
				end
			end
		end
	end
	if m.tipo == "enderman" and fuente ~= "jugador" and m.vida > 0 and math.random() < 0.7 then
		teletransportar(m)
	end
	if m.vida <= 0 then
		Mobs.matar(m, fuente, (fuente == "jugador" or fuente == "flechaJugador") and plr or nil)
	end
end

------------------------------------------------------------------
-- IA (actualizarMob de mobs.js)
------------------------------------------------------------------
local function moverHacia(m, dx, dz, vel)
	if dx ~= 0 or dz ~= 0 then
		m.yawObj = math.atan2(dx, dz)
		m.mover = true
		m.velObj = vel
	else
		m.mover = false
	end
end

local IA_PASIVA = { lobo = true, gato = true, zorro = true, conejo = true, cabra = true, huyeGato = true, panda = true, llama = true,
	ocelote = true, sniffer = true, armadillo = true, golemNieve = true, loro = true, strider = true }
local IA_VUELA = { murcielago = true, phantom = true, vex = true, allay = true, abeja = true }
local IA_AGUA = { pez = true, calamar = true, ajolote = true, pezGlobo = true }

local function danarJugador(j, dano, tipo, dx, dz, dist)
	if Mobs.alDanarJugador then
		local l = dist and dist > 0 and dist or 1
		Mobs.alDanarJugador(j.plr, dano, tipo, { x = dx / l, z = dz / l })
	end
end

local function actualizarMob(m, dt, jugadores)
	local def = m.def
	local md = Mundo.md
	-- Si el chunk no está cargado, la criatura se queda quieta
	if md:getSiCargado(math.floor(m.x), math.floor(m.y), math.floor(m.z)) < 0 then
		return
	end
	m.edad += dt
	m.cd -= dt
	m.inv = math.max(0, m.inv - dt)
	m.velObj = def.vel or 1
	if m.enfadado > 0 then
		m.enfadado -= dt
	end
	if m.bebe > 0 then
		m.bebe -= dt
		if m.bebe <= 0 then
			m.ancho = def.ancho or 0.3
			m.alto = def.alto or 1
			m.pieza:SetAttribute("bebe", nil)
		end
	end
	if m.amor > 0 then
		m.amor -= dt
	end
	local noche = esDeNoche()
	local ia = def.ia
	local persigue = false
	-- Criaturas controladas por un modo de juego (bots de Bed Wars, Mazmorras, Leyendas…)
	if m.control then
		m.control(m, dt, jugadores)
		if m.muerto then
			return
		end
	else
	local hostil = def.tipo == "hostil" or (def.tipo == "neutral" and m.enfadado > 0)
	if def.neutralDia and not noche and not (m.enfadado > 0) then
		hostil = false
	end
	-- Objetivo: el jugador más cercano (o el que le pegó)
	local j, dist3 = masCercano(m, jugadores, def.ia == "ghast" and 64 or (m.enfadado > 0 and 40 or 24))
	if m.enfadado > 0 and m.atacante then
		for _, o in jugadores do
			if o.plr == m.atacante then
				j = o
				dist3 = math.sqrt((o.x - m.x) ^ 2 + (o.y - m.y) ^ 2 + (o.z - m.z) ^ 2)
			end
		end
	end
	local dx, dz, dy, dist = 0, 0, 0, math.huge
	if j then
		dx, dz, dy = j.x - m.x, j.z - m.z, j.y - m.y
		dist = math.sqrt(dx * dx + dz * dz)
	end
	persigue = hostil and j ~= nil
	local ex, ey, ez = m.x, m.y + m.alto * 0.85, m.z
	if persigue and ia == "arquero" then
		m.yawObj = math.atan2(dx, dz)
		if dist < 6 then
			moverHacia(m, -dx, -dz, def.vel)
		elseif dist > 12 then
			moverHacia(m, dx, dz, def.vel)
		else
			m.mover = true
			m.yawObj += math.pi / 2
			m.velObj = def.vel * 0.5
		end
		if m.cd <= 0 and dist3 < 16 and lineaVision(ex, ey, ez, j.x, j.y + 1.5, j.z) then
			m.cd = 1.5 + math.random()
			local dir = Vector3.new(dx, dy + 1.1 - m.alto * 0.85 + dist * 0.12, dz).Unit
			dir = Vector3.new(dir.X + (math.random() - 0.5) * 0.06, dir.Y, dir.Z + (math.random() - 0.5) * 0.06).Unit
			Entidades.disparar("flecha", ex + dir.X * 0.6, ey, ez + dir.Z * 0.6, dir, 30, { dueno = m, dano = 1 })
			m.pieza:SetAttribute("dispara", tiempo)
		end
	elseif persigue and ia == "creeper" then
		moverHacia(m, dx, dz, def.vel)
		local cerca = dist3 < 3 and lineaVision(ex, ey, ez, j.x, j.y + 1.5, j.z)
		if cerca or (m.mecha > 0 and dist3 < 7) then
			m.mecha += dt
			m.mover = false
		else
			m.mecha = math.max(0, m.mecha - dt)
		end
		m.pieza:SetAttribute("mecha", m.mecha)
		if m.mecha >= 1.5 then
			if Mobs.alExplotar then
				Mobs.alExplotar(m.x, m.y + 0.8, m.z, 3, m)
			end
			Mobs.quitar(m)
			return
		end
	elseif ia == "ghast" then
		if persigue then
			local ox, oy, oz = j.x - m.x, j.y + 8 - m.y, j.z - m.z
			if dist > 16 then
				local l = math.sqrt(ox * ox + oy * oy + oz * oz)
				m.vx += (ox / l * def.vel - m.vx) * dt
				m.vy += (oy / l * def.vel - m.vy) * dt
				m.vz += (oz / l * def.vel - m.vz) * dt
			else
				m.vx *= 0.3 ^ dt
				m.vy *= 0.3 ^ dt
				m.vz *= 0.3 ^ dt
			end
			m.yawObj = math.atan2(dx, dz)
			if m.cd <= 0 and lineaVision(ex, ey, ez, j.x, j.y + 1.5, j.z) then
				m.cd = 3
				local dir = Vector3.new(dx, dy + 1 - m.alto * 0.6, dz).Unit
				Entidades.disparar("bolaGhast", m.x + dir.X * 2.5, m.y + 2, m.z + dir.Z * 2.5, dir, 14, { dueno = m })
			end
		else
			m.t -= dt
			if m.t <= 0 then
				m.t = 3 + math.random() * 4
				m.obj = { m.ox + (math.random() - 0.5) * 30, m.oy + (math.random() - 0.5) * 10, m.oz + (math.random() - 0.5) * 30 }
			end
			if m.obj then
				local ox, oy, oz = m.obj[1] - m.x, m.obj[2] - m.y, m.obj[3] - m.z
				local l = math.sqrt(ox * ox + oy * oy + oz * oz)
				if l > 1 then
					m.vx += (ox / l * def.vel - m.vx) * dt
					m.vy += (oy / l * def.vel - m.vy) * dt
					m.vz += (oz / l * def.vel - m.vz) * dt
				end
				m.yawObj = math.atan2(ox, oz)
			end
		end
	elseif persigue and ia == "blaze" then
		local obj = j.y + 2.5 - m.y
		m.vy += (math.clamp(obj, -2, 2) - m.vy) * dt * 2
		if dist > 8 then
			moverHacia(m, dx, dz, def.vel)
		else
			m.mover = false
		end
		m.yawObj = math.atan2(dx, dz)
		m.ataqueT -= dt
		if m.ataqueT <= 0 and dist3 < 40 and lineaVision(ex, ey, ez, j.x, j.y + 1.5, j.z) then
			m.ataqueT = 5
			m.rafaga = 3
		end
		if m.rafaga > 0 and m.cd <= 0 then
			m.rafaga -= 1
			m.cd = 0.35
			local dir = Vector3.new(dx + (math.random() - 0.5) * dist * 0.1, dy + 1 - m.alto * 0.8, dz + (math.random() - 0.5) * dist * 0.1).Unit
			Entidades.disparar("bolaFuego", ex + dir.X * 0.6, ey + dir.Y * 0.6, ez + dir.Z * 0.6, dir, 16, { dueno = m })
		end
	elseif ia == "cubo" then
		m.mover = false
		if m.suelo then
			m.vx *= 0.5
			m.vz *= 0.5
			if m.cd <= 0 then
				m.cd = 0.8 + math.random() * 1.4
				local ang = persigue and math.atan2(dx, dz) or math.random() * math.pi * 2
				m.yawObj = ang
				local f = persigue and 3.4 or 1.6
				m.vx, m.vz = math.sin(ang) * f, math.cos(ang) * f
				m.vy = 5 + (m.tam or 1) * 1.2
				m.pieza:SetAttribute("salto", tiempo)
			end
		end
		local dano = type(def.dano) == "table" and def.dano[(m.tam or 1) + 1] or (def.dano or 0)
		if persigue and dano > 0 and dist < m.ancho + 0.55 and math.abs(dy) < m.alto and m.golpeT <= 0 then
			m.golpeT = 1
			danarJugador(j, dano, "mob", dx, dz, dist)
		end
	elseif ia == "golem" then
		local obj, dmin = nil, 18
		if m.enfadado > 0 and j then
			obj = { x = j.x, z = j.z, y = j.y, jugador = j }
		else
			for _, o in Mobs.lista do
				if not o.muerto and o.def.tipo == "hostil" then
					local d = math.sqrt((o.x - m.x) ^ 2 + (o.y - m.y) ^ 2 + (o.z - m.z) ^ 2)
					if d < dmin then
						dmin, obj = d, o
					end
				end
			end
		end
		if obj then
			local ox, oz = obj.x - m.x, obj.z - m.z
			local d = math.sqrt(ox * ox + oz * oz)
			moverHacia(m, d > 1.6 and ox or 0, d > 1.6 and oz or 0, def.vel * 1.3)
			if d <= 1.6 then
				m.yawObj = math.atan2(ox, oz)
			end
			if d < 2.2 and m.cd <= 0 then
				m.cd = 1.2
				m.golpeT = 0.35
				m.pieza:SetAttribute("ataca", tiempo)
				if obj.jugador then
					danarJugador(obj.jugador, azar(7, 21), "mob", ox, oz, d)
				else
					Mobs.herir(obj, azar(7, 21), { x = ox / (d > 0 and d or 1), z = oz / (d > 0 and d or 1) }, "golem")
					obj.vy = 9
				end
			end
		else
			m.t -= dt
			if m.t <= 0 then
				m.t = 3 + math.random() * 6
				local ox, oz = m.ox - m.x, m.oz - m.z
				if math.sqrt(ox * ox + oz * oz) > 16 then
					m.mover = true
					m.yawObj = math.atan2(ox, oz)
				else
					m.mover = math.random() < 0.4
					m.yawObj = math.random() * math.pi * 2
				end
			end
		end
	elseif ia == "aldeano" then
		local zombi, dz2 = nil, 8
		for _, o in Mobs.lista do
			if (o.tipo == "zombi" or o.tipo == "aldeanoZombi") and not o.muerto then
				local d = math.sqrt((o.x - m.x) ^ 2 + (o.z - m.z) ^ 2)
				if d < dz2 then
					dz2, zombi = d, o
				end
			end
		end
		if zombi then
			moverHacia(m, m.x - zombi.x, m.z - zombi.z, def.vel * 1.8)
		elseif m.huir > 0 then
			m.huir -= dt
			moverHacia(m, -dx, -dz, def.vel * 1.8)
		elseif m.comerciando and m.comerciando > tiempo then
			m.mover = false
			if j then
				m.yawObj = math.atan2(dx, dz)
			end
		else
			m.t -= dt
			if m.t <= 0 then
				m.t = 2 + math.random() * 5
				local ox, oz = m.ox - m.x, m.oz - m.z
				if math.sqrt(ox * ox + oz * oz) > 14 then
					m.mover = true
					m.yawObj = math.atan2(ox, oz)
				else
					m.mover = math.random() < 0.5
					m.yawObj = math.random() * math.pi * 2
				end
			end
		end
	elseif IA_AGUA[ia] then
		local b = md:get(math.floor(m.x), math.floor(m.y + 0.2), math.floor(m.z))
		if esAgua(b) then
			m.t -= dt
			if m.t <= 0 then
				m.t = 1 + math.random() * 3
				local a = math.random() * math.pi * 2
				m.vx, m.vz = math.sin(a) * (def.vel or 1), math.cos(a) * (def.vel or 1)
				m.vy = (math.random() - 0.5) * 1.5
				m.yawObj = a
			end
			m.vy *= 0.9
		else
			m.vy = math.max(-20, m.vy - 30 * dt)
			if m.suelo and math.random() < dt * 3 then
				m.vy = 4
				m.vx, m.vz = (math.random() - 0.5) * 3, (math.random() - 0.5) * 3
			end
			m.secoT = (m.secoT or 0) + dt
			if m.secoT > 1 then
				m.secoT = 0
				Mobs.herir(m, 1, nil, "seco")
			end
		end
	elseif IA_VUELA[ia] or (def.vuela and ia ~= "blaze") then
		if persigue and (def.dano or 0) > 0 then
			local ox, oy, oz = j.x - m.x, j.y + 1 - m.y, j.z - m.z
			local l = math.sqrt(ox * ox + oy * oy + oz * oz)
			local v = def.vel or 3
			m.vx += (ox / l * v - m.vx) * dt * 2
			m.vy += (oy / l * v - m.vy) * dt * 2
			m.vz += (oz / l * v - m.vz) * dt * 2
			m.yawObj = math.atan2(ox, oz)
			if l < 1.5 and m.cd <= 0 then
				m.cd = 1
				danarJugador(j, def.dano, "mob", ox, oz, l)
			end
		else
			m.t -= dt
			if m.t <= 0 then
				m.t = 1 + math.random() * 3
				m.obj = { m.x + (math.random() - 0.5) * 10, m.y + (math.random() - 0.4) * 4, m.z + (math.random() - 0.5) * 10 }
			end
			if m.obj then
				local ox, oy, oz = m.obj[1] - m.x, m.obj[2] - m.y, m.obj[3] - m.z
				local l = math.sqrt(ox * ox + oy * oy + oz * oz)
				if l > 0.5 then
					local v = (def.vel or 2) * 0.7
					m.vx += (ox / l * v - m.vx) * dt * 2
					m.vy += (oy / l * v - m.vy) * dt * 2
					m.vz += (oz / l * v - m.vz) * dt * 2
					m.yawObj = math.atan2(ox, oz)
				end
			end
		end
	elseif persigue and (def.dano or 0) > 0 then -- cuerpo a cuerpo
		moverHacia(m, dx, dz, def.vel * ((m.enfadado > 0 and m.tipo == "enderman") and 1.4 or 1))
		if def.trepa and m.chocoH then
			m.vy = math.max(m.vy, 3)
		end
		if m.tipo == "arana" and m.suelo and dist < 3.5 and dist > 1.4 and m.cd <= 0 and math.random() < dt * 2 then
			m.vy = 5
			m.vx += dx / dist * 4
			m.vz += dz / dist * 4
		end
		if dist < m.ancho + 1.1 and math.abs(dy) < 1.8 and m.cd <= 0 then
			m.cd = 1
			m.golpeT = 0.35
			m.pieza:SetAttribute("ataca", tiempo)
			danarJugador(j, def.dano, "mob", dx, dz, dist)
		end
		if m.tipo == "enderman" and dist > 12 and math.random() < dt * 0.3 then
			teletransportar(m)
		end
	elseif m.huir > 0 then
		m.huir -= dt
		if j then
			moverHacia(m, -dx, -dz, (def.vel or 1) * 2.2)
		else
			moverHacia(m, math.cos(m.yaw), math.sin(m.yaw), (def.vel or 1) * 2.2)
		end
	elseif def.tipo == "pasivo" and def.comida and j and dist < 10 and j.enMano == def.comida then
		moverHacia(m, dist > 2 and dx or 0, dist > 2 and dz or 0, def.vel)
		if dist <= 2 then
			m.yawObj = math.atan2(dx, dz)
		end
	elseif m.amor > 0 then
		local pareja, dmin = nil, 8
		for _, o in Mobs.lista do
			if o ~= m and not o.muerto and o.tipo == m.tipo and o.amor > 0 and o.bebe <= 0 then
				local d = math.sqrt((o.x - m.x) ^ 2 + (o.z - m.z) ^ 2)
				if d < dmin then
					dmin, pareja = d, o
				end
			end
		end
		if pareja then
			local ox, oz = pareja.x - m.x, pareja.z - m.z
			moverHacia(m, dmin > 1 and ox or 0, dmin > 1 and oz or 0, def.vel)
			if dmin < 1.3 then
				m.amor, pareja.amor = 0, 0
				Mobs.crear(m.tipo, m.x, m.y + 0.2, m.z, { bebe = true, variante = m.variante })
				Entidades.soltarXP(azar(1, 7), m.x, m.y, m.z)
			end
		end
	elseif not m.vuela then
		m.t -= dt
		if m.t <= 0 then
			m.t = 2 + math.random() * 5
			m.mover = math.random() < 0.5
			m.yawObj = math.random() * math.pi * 2
			if m.tipo == "enderman" and math.random() < 0.15 then
				teletransportar(m)
			end
		end
	end
	if ia == "blaze" and not persigue then
		m.vy *= 0.5 ^ dt
		m.mover = false
	end

	end

	-- Giro y movimiento
	local giro = ((m.yawObj - m.yaw + math.pi * 3) % (math.pi * 2)) - math.pi
	m.yaw += giro * math.min(1, dt * 8)
	local vel = m.velObj or def.vel or 1
	local vx = m.mover and math.sin(m.yawObj) * vel or 0
	local vz = m.mover and math.cos(m.yawObj) * vel or 0
	local aqui = md:get(math.floor(m.x), math.floor(m.y + 0.2), math.floor(m.z))
	local enAgua, enLava = esAgua(aqui), esLava(aqui)
	if not m.vuela or ia == "blaze" then
		if not IA_AGUA[ia] or not enAgua then
			local k = math.min(1, dt * (m.suelo and 10 or (m.mover and 6 or 2)))
			m.vx += (vx - m.vx) * k
			m.vz += (vz - m.vz) * k
		end
	end
	if not m.vuela and not (IA_AGUA[ia] and enAgua) then
		if enAgua or enLava then
			m.vy = math.min(m.vy + 28 * dt, 2)
			m.vx *= 0.9
			m.vz *= 0.9
		else
			m.vy = math.max(-50, m.vy - 30 * dt)
			if def.planea and m.vy < -2 then
				m.vy = -2
			end
		end
	end
	Fisica.paso(md, m, dt)
	if m.chocoH and m.suelo and m.mover and not m.vuela then
		m.vy = 8.2
		m.vx, m.vz = vx, vz
	end
	-- Fuego, lava, agua y sol
	m.fuegoT -= dt
	if m.fuegoT <= 0 then
		m.fuegoT = 1
		if def.quemaSol and not noche and not enAgua and expuestoAlCielo(m) then
			m.fuego = math.max(m.fuego, 8)
		end
		if m.fuego > 0 then
			Mobs.herir(m, 1, nil, "fuego")
			if m.muerto then
				return
			end
		end
		if def.odiaAgua and enAgua then
			Mobs.herir(m, 1, nil, "agua")
			if m.muerto then
				return
			end
			if m.tipo == "enderman" then
				teletransportar(m)
			end
		end
	end
	if enLava and not def.inmuneFuego then
		m.fuego = 15
		Mobs.herir(m, 4, nil, "lava")
		if m.muerto then
			return
		end
	end
	if enAgua then
		m.fuego = 0
	end
	if m.fuego > 0 then
		m.fuego -= dt
	end
	m.pieza:SetAttribute("fuego", m.fuego > 0)
	if m.y < -20 then
		Mobs.quitar(m)
		return
	end
	m.golpeT = math.max(0, m.golpeT - dt)
	-- Mover la pieza (los clientes la siguen y animan el modelo)
	local cf = CFrame.new(m.x * BS, (m.y + m.alto / 2) * BS, m.z * BS) * CFrame.Angles(0, m.yaw + math.pi, 0)
	if not m.ultimo or (m.ultimo.Position - cf.Position).Magnitude > 0.02 or math.abs(m.ultimoYaw - m.yaw) > 0.02 then
		m.pieza.CFrame = cf
		m.ultimo = cf
		m.ultimoYaw = m.yaw
	end
	if persigue ~= m.persigueAntes then
		m.persigueAntes = persigue
		m.pieza:SetAttribute("persigue", persigue)
	end
end

------------------------------------------------------------------
-- Aparición de criaturas
------------------------------------------------------------------
local function elegirPeso(lista)
	local t = 0
	for _, e in lista do
		t += e[2]
	end
	local r = math.random() * t
	for _, e in lista do
		r -= e[2]
		if r <= 0 then
			return e[1]
		end
	end
	return lista[1][1]
end

local function buscarSuelo(x, y0, z, rango, altoNec)
	local md = Mundo.md
	local y = y0
	while y > y0 - rango and y > 1 do
		local s = md:getSiCargado(x, y - 1, z)
		if s < 0 then
			return -1
		end
		if SOLIDO[s] and OPACO[s] and s ~= B.lecho then
			local libre = true
			for k = 0, altoNec - 1 do
				local b = md:get(x, y + k, z)
				if b ~= 0 and (SOLIDO[b] or esLiquido(b)) then
					libre = false
					break
				end
			end
			if libre then
				return y
			end
		end
		y -= 1
	end
	return -1
end

local function hayLuzCerca(x, y, z)
	local md = Mundo.md
	for dx = -6, 6, 2 do
		for dy = -3, 3 do
			for dz = -6, 6, 2 do
				local b = md:getSiCargado(x + dx, y + dy, z + dz)
				if b > 0 and (Registro.LUZ[b] or 0) >= 10 then
					return true
				end
			end
		end
	end
	return false
end

local BIOMAS_CALIDOS = { [4] = true, [10] = true, [9] = true, [12] = true, [15] = true }
local BIOMAS_FRIOS = { [5] = true, [7] = true, [6] = true, [18] = true, [20] = true }

local function contar(f)
	local n = 0
	for _, m in Mobs.lista do
		if not m.muerto and f(m) then
			n += 1
		end
	end
	return n
end

Mobs.buscarSuelo = buscarSuelo
Mobs.contar = contar
Mobs.hayLuzCerca = hayLuzCerca

local function intentoAparicion(jugadores)
	if #jugadores == 0 then
		return
	end
	local j = jugadores[math.random(1, #jugadores)]
	local ang = math.random() * math.pi * 2
	local d = 24 + math.random() * 24
	local x, z = math.floor(j.x + math.cos(ang) * d), math.floor(j.z + math.sin(ang) * d)
	local md = Mundo.md
	if md:getSiCargado(x, 100, z) < 0 then
		return
	end
	-- En el Nether y el End aparecen otras criaturas (Dimension.luau)
	if Generador.dimensionBloque(z) ~= "superficie" then
		return
	end
	local pasivos = contar(function(m)
		return m.def.tipo == "pasivo" and m.tipo ~= "aldeano"
	end)
	local hostiles = contar(function(m)
		return m.def.tipo ~= "pasivo"
	end)
	local bio = md:bioma(x, z)
	-- Animales en el césped de día
	if math.random() < 0.08 and pasivos < Config.MAX_PASIVOS then
		local y = 191
		while y > 0 and md:get(x, y, z) == 0 do
			y -= 1
		end
		local sup = md:get(x, y, z)
		if (sup ~= B.cesped and sup ~= B.cespedNevado and sup ~= B.arena) or not md:alCielo(x, y + 1, z) then
			return
		end
		local lista = { { "cerdo", 25 }, { "vaca", 20 }, { "oveja", 25 }, { "gallina", 20 } }
		if bio == 7 or bio == 18 or bio == 28 then
			table.insert(lista, { "lobo", 12 })
			table.insert(lista, { "zorro", 8 })
		end
		if bio == 4 then
			lista = { { "conejo", 30 }, { "camello", 5 } }
		end
		if bio == 9 or bio == 26 then
			table.insert(lista, { "loro", 15 })
			table.insert(lista, { "ocelote", 6 })
			table.insert(lista, { "panda", 6 })
		end
		if bio == 10 then
			table.insert(lista, { "llama", 10 })
			table.insert(lista, { "caballo", 10 })
		end
		if bio == 2 or bio == 31 then
			table.insert(lista, { "caballo", 8 })
			table.insert(lista, { "burro", 3 })
		end
		if bio == 5 or bio == 18 or bio == 25 then
			lista = { { "conejo", 20 }, { "osoPolar", 6 }, { "zorro", 6 } }
		end
		if bio == 11 or bio == 15 then
			table.insert(lista, { "rana", 20 })
		end
		if bio == 23 then
			lista = { { "champinaca", 1 } }
		end
		local tipo = elegirPeso(lista)
		if not DEF[tipo] then
			return
		end
		local variante = BIOMAS_CALIDOS[bio] and "calida" or BIOMAS_FRIOS[bio] and "fria" or nil
		for _ = 1, azar(2, 4) do
			local ox, oz = x + azar(-2, 2), z + azar(-2, 2)
			local oy = buscarSuelo(ox, y + 3, oz, 6, 2)
			if oy > 0 then
				Mobs.crear(tipo, ox + 0.5, oy, oz + 0.5, { variante = variante })
			end
		end
		return
	end
	-- Peces y calamares en el agua
	if math.random() < 0.05 and contar(function(m)
		return IA_AGUA[m.def.ia or ""] == true
	end) < Config.MAX_ACUATICOS then
		local y = 126
		if esAgua(md:get(x, y - 2, z)) then
			local tipo = elegirPeso({ { "bacalao", 30 }, { "salmon", 20 }, { "calamar", 15 }, { "pezTropical", bio == 21 and 40 or 5 }, { "delfin", 3 } })
			if DEF[tipo] then
				Mobs.crear(tipo, x + 0.5, y - 2, z + 0.5)
			end
		end
		return
	end
	-- Hostiles en la oscuridad (de noche en la superficie o en cuevas)
	if hostiles >= Config.MAX_HOSTILES then
		return
	end
	local y = buscarSuelo(x, math.clamp(math.floor(j.y + (math.random() - 0.4) * 40), 6, 188), z, 20, 3)
	if y < 0 then
		return
	end
	local cielo = md:alCielo(x, y, z)
	if cielo and not esDeNoche() then
		return
	end
	if hayLuzCerca(x, y, z) then
		return
	end
	if math.sqrt((x - j.x) ^ 2 + (y - j.y) ^ 2 + (z - j.z) ^ 2) < 24 then
		return
	end
	local pesos = { { "zombi", 95 }, { "esqueleto", 100 }, { "creeper", 100 }, { "arana", 100 }, { "enderman", 10 } }
	if bio == 11 or y < 104 then
		table.insert(pesos, { "slime", bio == 11 and 80 or 30 })
	end
	if bio == 4 then
		table.insert(pesos, { "momia", 80 })
	end
	if bio == 5 or bio == 18 then
		table.insert(pesos, { "esqueletoErrante", 80 })
	end
	if (bio == 11 or bio == 15) and esDeNoche() then
		table.insert(pesos, { "bruja", 10 })
	end
	local tipo = elegirPeso(pesos)
	if not DEF[tipo] then
		return
	end
	if tipo == "slime" then
		Mobs.crear("slime", x + 0.5, y, z + 0.5, { tam = azar(0, 2) })
		return
	end
	if tipo == "enderman" and md:get(x, y + 2, z) ~= 0 then
		return
	end
	Mobs.crear(tipo, x + 0.5, y, z + 0.5)
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
local spawnT = 0
function Mobs.iniciar()
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		tiempo += dt
		local jugadores = jugadoresValidos()
		-- Lo que tiene cada jugador en la mano (para que los animales le sigan)
		for _, j in jugadores do
			j.enMano = j.plr:GetAttribute("EnMano")
		end
		local lista = Mobs.lista
		local i = 1
		while i <= #lista do
			local m = lista[i]
			if not m.muerto then
				local ok, err = pcall(actualizarMob, m, dt, jugadores)
				if not ok then
					warn("[Blockverse] Criatura " .. m.tipo .. ": " .. tostring(err))
					Mobs.quitar(m)
				end
			end
			if m.muerto then
				lista[i] = lista[#lista]
				lista[#lista] = nil
			else
				i += 1
			end
		end
		-- Aparecer y desaparecer
		spawnT -= dt
		if spawnT <= 0 then
			spawnT = 0.5
			for _ = 1, 4 do
				pcall(intentoAparicion, jugadores)
			end
			local todos = {}
			for _, plr in Players:GetPlayers() do
				local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
				if r then
					table.insert(todos, r.Position / BS)
				end
			end
			for _, m in lista do
				if not m.muerto and not m.domado then
					local dm = math.huge
					for _, p in todos do
						dm = math.min(dm, math.sqrt((p.X - m.x) ^ 2 + (p.Y - m.y) ^ 2 + (p.Z - m.z) ^ 2))
					end
					if (m.def.tipo == "hostil" and dm > 80) or dm > ((m.tipo == "aldeano" or m.tipo == "golem") and 110 or 140) then
						Mobs.quitar(m)
					end
				end
			end
		end
	end)
end

return Mobs
