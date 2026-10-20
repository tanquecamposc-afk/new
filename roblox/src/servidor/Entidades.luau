--[[
	Blockverse para Roblox · Entidades (servidor)
	Como entidades.js del juego web:
	· Objetos tirados: saltan al soltarse, caen, se juntan con los iguales
	  y los recoge el jugador al acercarse (desaparecen a los 5 minutos).
	· Orbes de experiencia que vuelan hacia el jugador.
	· Flechas (de esqueletos y del arco del jugador) y bolas de fuego.
	Cada entidad es una pieza invisible; cada cliente dibuja lo que se ve.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Fisica = require(Comp.Fisica)
local Mundo = require(script.Parent.Mundo)

local BS = Config.BLOQUE
local SOLIDO = Registro.SOLIDO
local esAgua, esLava = Registro.esAgua, Registro.esLava

local Entidades = {}
Entidades.lista = {}
Entidades.alRecoger = nil -- function(plr, pila) -> sobrante
Entidades.alXP = nil -- function(plr, valor)
Entidades.alImpacto = nil -- function(entidad, objetivo) para flechas y bolas
Entidades.mobsEn = nil -- function(x, y, z, radio) -> lista de criaturas cerca

local carpeta = Instance.new("Folder")
carpeta.Name = "Entidades"
carpeta.Parent = workspace

local function crearPieza(tipo)
	local p = Instance.new("Part")
	p.Name = tipo
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Transparency = 1
	p.Size = Vector3.new(0.4, 0.4, 0.4)
	return p
end

local function posicionar(e)
	local p = Vector3.new(e.x * BS, e.y * BS, e.z * BS)
	if not e.ultimaPos or (e.ultimaPos - p).Magnitude > 0.03 then
		e.ultimaPos = p
		e.pieza.CFrame = CFrame.new(p) * CFrame.Angles(0, e.giro or 0, 0)
	end
end

local function agregar(e)
	e.pieza.Parent = carpeta
	posicionar(e)
	table.insert(Entidades.lista, e)
	return e
end

local function quitar(e)
	e.muerta = true
	if e.pieza then
		e.pieza:Destroy()
	end
end

------------------------------------------------------------------
-- Objetos tirados
------------------------------------------------------------------
-- pila = {id, n, dur?}; x, y, z en bloques
function Entidades.soltarItem(pila, x, y, z, aleatorio, vel, espera)
	if not pila or not pila.id or (pila.n or 0) <= 0 then
		return nil
	end
	local p = crearPieza("Item")
	p:SetAttribute("id", pila.id)
	p:SetAttribute("n", pila.n)
	local vx, vy, vz = 0, 4, 0
	if aleatorio then
		vx, vy, vz = (math.random() - 0.5) * 4, 3 + math.random() * 2, (math.random() - 0.5) * 4
	end
	if vel then
		vx, vy, vz = vel.X, vel.Y, vel.Z
	end
	return agregar({
		tipo = "item", pila = pila, pieza = p, x = x, y = y, z = z, vx = vx, vy = vy, vz = vz,
		ancho = 0.125, alto = 0.25, edad = 0, espera = espera or 0.5, giro = math.random() * 6.28,
	})
end

function Entidades.soltarXP(valor, x, y, z)
	while valor > 0 do
		local v = valor >= 17 and 17 or valor >= 7 and 7 or valor >= 3 and 3 or 1
		valor -= v
		local p = crearPieza("Orbe")
		p:SetAttribute("valor", v)
		agregar({
			tipo = "xp", valor = v, pieza = p, x = x, y = y + 0.3, z = z,
			vx = (math.random() - 0.5) * 3, vy = 3 + math.random() * 2, vz = (math.random() - 0.5) * 3,
			ancho = 0.12, alto = 0.24, edad = 0,
		})
	end
end

------------------------------------------------------------------
-- Proyectiles
------------------------------------------------------------------
-- opc = {dueno = jugador o criatura, dano, tipo = "flecha" | "bolaFuego" | "bolaGhast", recogible}
function Entidades.disparar(tipo, x, y, z, dir, vel, opc)
	local p = crearPieza(tipo == "flecha" and "Flecha" or "Bola")
	p:SetAttribute("tipo", tipo)
	return agregar({
		tipo = tipo, pieza = p, x = x, y = y, z = z, vx = dir.X * vel, vy = dir.Y * vel, vz = dir.Z * vel,
		ancho = 0.1, alto = 0.1, edad = 0, opc = opc or {},
	})
end

------------------------------------------------------------------
-- Actualización
------------------------------------------------------------------
local function jugadorCerca(x, y, z, radio)
	local mejor, dm = nil, radio
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 then
			local p = r.Position / BS
			local pie = p.Y - 1
			local d = math.sqrt((p.X - x) ^ 2 + (pie + 0.9 - y) ^ 2 + (p.Z - z) ^ 2)
			if d < dm then
				mejor, dm = plr, d
			end
		end
	end
	return mejor, dm
end
Entidades.jugadorCerca = jugadorCerca

local function actualizarItem(e, dt)
	local md = Mundo.md
	local b = md:getSiCargado(math.floor(e.x), math.floor(e.y + 0.1), math.floor(e.z))
	if b < 0 then
		return
	end
	if esAgua(b) then
		e.vy = math.min(e.vy + 20 * dt, 1.5)
		e.vx *= 0.9
		e.vz *= 0.9
	else
		e.vy = math.max(-30, e.vy - 20 * dt)
	end
	if esLava(b) and not (Registro.objetos[e.pila.id] and Registro.objetos[e.pila.id].ignifugo) then
		quitar(e)
		return
	end
	Fisica.paso(md, e, dt)
	if e.suelo then
		e.vx *= 0.6 ^ (dt * 10)
		e.vz *= 0.6 ^ (dt * 10)
	end
	e.giro = (e.giro or 0) + dt * 1.5
	if e.edad > 300 then
		quitar(e)
		return
	end
	-- Juntarse con objetos iguales cercanos
	if e.edad % 1 < dt then
		for _, o in Entidades.lista do
			if o ~= e and not o.muerta and o.tipo == "item" and o.pila.id == e.pila.id and not o.pila.dur and not e.pila.dur
				and math.abs(o.x - e.x) < 1 and math.abs(o.y - e.y) < 0.6 and math.abs(o.z - e.z) < 1 then
				local max = Registro.maxPila(e.pila.id)
				if o.pila.n + e.pila.n <= max then
					o.pila.n += e.pila.n
					o.pieza:SetAttribute("n", o.pila.n)
					quitar(e)
					return
				end
			end
		end
	end
	-- Recoger
	if e.edad >= e.espera and Entidades.alRecoger then
		local plr, d = jugadorCerca(e.x, e.y, e.z, 1.6)
		if plr and d then
			local sobra = Entidades.alRecoger(plr, e.pila)
			if sobra <= 0 then
				quitar(e)
				return
			elseif sobra < e.pila.n then
				e.pila.n = sobra
				e.pieza:SetAttribute("n", sobra)
			end
		end
	end
	posicionar(e)
end

local function actualizarXP(e, dt)
	local md = Mundo.md
	local plr, d = jugadorCerca(e.x, e.y, e.z, 7)
	if plr and e.edad > 0.4 then
		local r = plr.Character.HumanoidRootPart.Position / BS
		local tx, ty, tz = r.X - e.x, r.Y - 0.5 - e.y, r.Z - e.z
		local l = math.sqrt(tx * tx + ty * ty + tz * tz)
		if l > 0.01 then
			local f = (1 - l / 8) * 12
			e.vx += tx / l * f * dt * 3
			e.vy += ty / l * f * dt * 3
			e.vz += tz / l * f * dt * 3
		end
		if d < 1 and Entidades.alXP then
			Entidades.alXP(plr, e.valor)
			quitar(e)
			return
		end
	end
	e.vy = math.max(-20, e.vy - 12 * dt)
	e.vx *= 0.95
	e.vz *= 0.95
	Fisica.paso(md, e, dt)
	if e.edad > 300 then
		quitar(e)
		return
	end
	posicionar(e)
end

local function actualizarProyectil(e, dt)
	local md = Mundo.md
	if e.clavada then
		e.edad += 0
		if e.edad > 60 then
			quitar(e)
			return
		end
		-- Recoger la flecha clavada
		if e.opc.recogible and Entidades.alRecoger then
			local plr = jugadorCerca(e.x, e.y, e.z, 1.4)
			if plr then
				local sobra = Entidades.alRecoger(plr, Registro.pila(Registro.I.flecha, 1))
				if sobra <= 0 then
					quitar(e)
				end
			end
		end
		return
	end
	local grav = e.tipo == "flecha" and 20 or 0
	e.vy -= grav * dt
	local pasos = math.ceil(math.max(math.abs(e.vx), math.abs(e.vy), math.abs(e.vz)) * dt / 0.2)
	if pasos < 1 then
		pasos = 1
	end
	local h = dt / pasos
	for _ = 1, pasos do
		e.x += e.vx * h
		e.y += e.vy * h
		e.z += e.vz * h
		-- ¿Bloque?
		local b = md:getSiCargado(math.floor(e.x), math.floor(e.y), math.floor(e.z))
		if b < 0 or e.y < -10 then
			quitar(e)
			return
		end
		if b ~= 0 and SOLIDO[b] then
			if e.tipo == "flecha" then
				e.clavada = true
				e.edad = 0
				e.x -= e.vx * h
				e.y -= e.vy * h
				e.z -= e.vz * h
			elseif Entidades.alImpacto then
				Entidades.alImpacto(e, nil)
				quitar(e)
			end
			posicionar(e)
			return
		end
		-- ¿Criatura o jugador?
		if Entidades.alImpacto and e.edad > 0.05 then
			local dano = Entidades.alImpacto(e, "buscar")
			if dano then
				quitar(e)
				return
			end
		end
	end
	local v = Vector3.new(e.vx, e.vy, e.vz)
	if v.Magnitude > 0.01 then
		e.pieza.CFrame = CFrame.lookAt(Vector3.new(e.x, e.y, e.z) * BS, (Vector3.new(e.x, e.y, e.z) + v.Unit) * BS)
	end
	if e.edad > 30 then
		quitar(e)
	end
end

function Entidades.iniciar()
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		local lista = Entidades.lista
		local i = 1
		while i <= #lista do
			local e = lista[i]
			if not e.muerta then
				e.edad += dt
				local ok, err = pcall(function()
					if e.tipo == "item" then
						actualizarItem(e, dt)
					elseif e.tipo == "xp" then
						actualizarXP(e, dt)
					else
						actualizarProyectil(e, dt)
					end
				end)
				if not ok then
					warn("[Blockverse] Entidad: " .. tostring(err))
					quitar(e)
				end
			end
			if e.muerta then
				lista[i] = lista[#lista]
				lista[#lista] = nil
			else
				i += 1
			end
		end
	end)
end

return Entidades
