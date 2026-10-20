--[[
	Blockverse para Roblox · Criaturas (servidor)
	· Zombis: salen de noche, persiguen al jugador y se queman al sol.
	· Cerdos, vacas y ovejas: pasean de día y huyen si les pegas.
	Los modelos se arman con piezas (estilo cúbico) y las patas se
	mueven al caminar.
]]
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Bloques = require(Comp.Bloques)
local Mundo = require(script.Parent.Mundo)

local B = Config.BLOQUE
local ID = Bloques.porClave

local Mobs = {}
local lista = {}
Mobs.lista = lista
Mobs.alSoltar = nil -- function(jugador, id, n): lo pone el script principal
Mobs.alEmpujar = nil -- function(jugador, vector)

local carpeta = Instance.new("Folder")
carpeta.Name = "Criaturas"
carpeta.Parent = workspace

local function rgb(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local TIPOS = {
	zombi = { nombre = "Zombi", vida = 20, vel = 9, dano = 3, hostil = true, bipedo = true,
		piel = rgb(98, 150, 86), camisa = rgb(0, 160, 168), pantalon = rgb(58, 60, 150) },
	cerdo = { nombre = "Cerdo", vida = 10, vel = 7, cuerpo = rgb(240, 162, 160), cabeza = rgb(244, 172, 170),
		hocico = rgb(222, 120, 130), suelta = { ID.carneCruda, 1, 3 }, tam = Vector3.new(2.2, 1.8, 3) },
	vaca = { nombre = "Vaca", vida = 10, vel = 7, cuerpo = rgb(74, 52, 36), cabeza = rgb(80, 58, 40),
		mancha = rgb(236, 236, 236), hocico = rgb(200, 170, 160), suelta = { ID.carneCruda, 1, 3 }, tam = Vector3.new(2.4, 2.2, 3.4) },
	oveja = { nombre = "Oveja", vida = 8, vel = 7, cuerpo = rgb(236, 236, 236), cabeza = rgb(214, 190, 170),
		suelta = { ID.lana, 1, 2 }, tam = Vector3.new(2.4, 2.2, 3.2) },
}
Mobs.TIPOS = TIPOS

local function pieza(modelo, nombre, tam, col, mat)
	local p = Instance.new("Part")
	p.Name = nombre
	p.Size = tam
	p.Color = col
	p.Material = mat or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CanCollide = false
	p.Massless = true
	p.Parent = modelo
	return p
end

local function soldar(raiz, p, offset)
	p.CFrame = raiz.CFrame * offset
	local w = Instance.new("WeldConstraint")
	w.Part0 = raiz
	w.Part1 = p
	w.Parent = p
end

-- Pata o brazo que se balancea (Motor6D desde la raíz)
local function articulacion(raiz, p, pivote, largo)
	local m = Instance.new("Motor6D")
	m.Part0 = raiz
	m.Part1 = p
	m.C0 = pivote
	m.C1 = CFrame.new(0, largo / 2, 0)
	m.Parent = raiz
	return m
end

local function crearModelo(tipo, pos)
	local T = TIPOS[tipo]
	local modelo = Instance.new("Model")
	modelo.Name = T.nombre
	modelo:SetAttribute("Mob", tipo)
	local raiz = pieza(modelo, "HumanoidRootPart", Vector3.new(2, 2, 1), Color3.new(), nil)
	raiz.Transparency = 1
	raiz.Massless = false
	raiz.CanCollide = true -- la raíz choca con las paredes
	local motores = {}
	local alto -- altura de las patas (HipHeight)
	if T.bipedo then
		raiz.Size = Vector3.new(2, 2.4, 1.1)
		alto = 2.4
		raiz.CFrame = CFrame.new(pos + Vector3.new(0, alto + 1.2, 0))
		local torso = pieza(modelo, "Torso", Vector3.new(2, 2.4, 1.1), T.camisa)
		soldar(raiz, torso, CFrame.new())
		local cabeza = pieza(modelo, "Head", Vector3.new(1.7, 1.7, 1.7), T.piel)
		soldar(raiz, cabeza, CFrame.new(0, 2.05, 0))
		for _, s in { -1, 1 } do
			local ojo = pieza(modelo, "Ojo", Vector3.new(0.34, 0.22, 0.05), rgb(20, 30, 20))
			soldar(raiz, ojo, CFrame.new(0.4 * s, 2.15, -0.86))
		end
		for i, s in { -1, 1 } do
			local pierna = pieza(modelo, "Pierna" .. i, Vector3.new(0.95, alto, 1.05), T.pantalon)
			motores["p" .. i] = articulacion(raiz, pierna, CFrame.new(0.5 * s, -1.2, 0), alto)
			local brazo = pieza(modelo, "Brazo" .. i, Vector3.new(0.85, 2.3, 0.85), T.piel)
			-- Brazos estirados hacia delante (como en el original)
			motores["b" .. i] = articulacion(raiz, brazo, CFrame.new(1.43 * s, 1.0, 0) * CFrame.Angles(math.rad(90), 0, 0), 2.3)
		end
	else
		local tam = T.tam
		alto = 1.3
		raiz.Size = tam
		raiz.CFrame = CFrame.new(pos + Vector3.new(0, alto + tam.Y / 2 + 0.2, 0))
		local cuerpo = pieza(modelo, "Cuerpo", tam, T.cuerpo, tipo == "oveja" and Enum.Material.Fabric or nil)
		soldar(raiz, cuerpo, CFrame.new())
		local cabeza = pieza(modelo, "Head", Vector3.new(1.6, 1.6, 1.4), T.cabeza)
		soldar(raiz, cabeza, CFrame.new(0, tam.Y * 0.3, -tam.Z / 2 - 0.5))
		if T.hocico then
			local h = pieza(modelo, "Hocico", Vector3.new(0.9, 0.6, 0.3), T.hocico)
			soldar(raiz, h, CFrame.new(0, tam.Y * 0.3 - 0.3, -tam.Z / 2 - 1.3))
		end
		if T.mancha then
			local m = pieza(modelo, "Mancha", Vector3.new(tam.X + 0.04, 1, 1.2), T.mancha)
			soldar(raiz, m, CFrame.new(0, 0.3, 0.4))
			for _, s in { -1, 1 } do
				local c = pieza(modelo, "Cuerno", Vector3.new(0.25, 0.5, 0.25), rgb(230, 225, 210))
				soldar(raiz, c, CFrame.new(0.65 * s, tam.Y * 0.3 + 0.95, -tam.Z / 2 - 0.4))
			end
		end
		for _, s in { -1, 1 } do
			local ojo = pieza(modelo, "Ojo", Vector3.new(0.25, 0.25, 0.05), rgb(20, 20, 20))
			soldar(raiz, ojo, CFrame.new(0.45 * s, tam.Y * 0.3 + 0.2, -tam.Z / 2 - 1.22))
		end
		local i = 0
		for _, sx in { -1, 1 } do
			for _, sz in { -1, 1 } do
				i += 1
				local pata = pieza(modelo, "Pata" .. i, Vector3.new(0.75, alto, 0.75), tipo == "oveja" and T.cabeza or T.cuerpo)
				motores["p" .. i] = articulacion(raiz, pata, CFrame.new(sx * (tam.X / 2 - 0.4), -tam.Y / 2, sz * (tam.Z / 2 - 0.45)), alto)
			end
		end
	end
	local hum = Instance.new("Humanoid")
	hum.RigType = Enum.HumanoidRigType.R15
	hum.HipHeight = alto
	hum.MaxHealth = T.vida
	hum.Health = T.vida
	hum.WalkSpeed = T.vel
	hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	hum.BreakJointsOnDeath = false
	hum.Parent = modelo
	modelo.PrimaryPart = raiz
	modelo.Parent = carpeta
	pcall(function()
		raiz:SetNetworkOwner(nil)
	end)
	return modelo, hum, raiz, motores
end

local function jugadorMasCerca(pos, maxDist)
	local mejor, dm = nil, maxDist
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 and not r.Anchored then
			local d = (r.Position - pos).Magnitude
			if d < dm then
				mejor, dm = plr, d
			end
		end
	end
	return mejor, dm
end

function Mobs.crear(tipo, x, y, z)
	local pos = Vector3.new((x + 0.5) * B, (y + 1) * B, (z + 0.5) * B)
	local modelo, hum, raiz, motores = crearModelo(tipo, pos)
	local m = {
		tipo = tipo, T = TIPOS[tipo], modelo = modelo, hum = hum, raiz = raiz, motores = motores,
		fase = 0, cd = 0, pensar = 0, huir = 0, quema = 0, ultimo = nil, atasco = 0,
	}
	hum.Died:Connect(function()
		Mobs.morir(m)
	end)
	table.insert(lista, m)
	return m
end

function Mobs.morir(m)
	if m.muerto then
		return
	end
	m.muerto = true
	local s = m.T.suelta
	if s and m.ultimo and Mobs.alSoltar then
		Mobs.alSoltar(m.ultimo, s[1], math.random(s[2], s[3]))
	end
	-- Se cae de lado y desaparece con humo
	local raiz = m.raiz
	if raiz and raiz.Parent then
		raiz.Anchored = true
		local cf = raiz.CFrame
		for i = 1, 8 do
			task.delay(i * 0.04, function()
				if raiz.Parent then
					raiz.CFrame = cf * CFrame.Angles(0, 0, math.rad(i * 11))
				end
			end)
		end
		local humo = Instance.new("Smoke")
		humo.Size = 2
		humo.RiseVelocity = 3
		humo.Color = Color3.fromRGB(230, 230, 230)
		humo.Parent = raiz
	end
	task.delay(0.9, function()
		m.modelo:Destroy()
	end)
	local i = table.find(lista, m)
	if i then
		table.remove(lista, i)
	end
end

-- Un jugador le pega a una criatura
function Mobs.golpear(m, plr, dano)
	if m.muerto then
		return
	end
	m.ultimo = plr
	m.hum:TakeDamage(dano)
	local ch = plr.Character
	local r = ch and ch:FindFirstChild("HumanoidRootPart")
	if r and m.raiz.Parent then
		local dir = (m.raiz.Position - r.Position) * Vector3.new(1, 0, 1)
		if dir.Magnitude > 0.01 then
			m.raiz.AssemblyLinearVelocity = dir.Unit * 26 + Vector3.new(0, 18, 0)
		end
	end
	if not m.T.hostil then
		m.huir = 4
	end
	-- Destello rojo
	local h = Instance.new("Highlight")
	h.FillColor = Color3.fromRGB(255, 40, 40)
	h.FillTransparency = 0.35
	h.OutlineTransparency = 1
	h.Parent = m.modelo
	task.delay(0.25, function()
		h:Destroy()
	end)
end

function Mobs.desdeParte(p)
	for _, m in lista do
		if p:IsDescendantOf(m.modelo) then
			return m
		end
	end
	return nil
end

local function esDeNoche()
	local t = Lighting.ClockTime
	return t < 6 or t > 18.3
end
Mobs.esDeNoche = esDeNoche

-- Hace saltar a la criatura si tiene un bloque delante
local function obstaculo(m)
	local r = m.raiz
	local dir = m.hum.MoveDirection
	if dir.Magnitude < 0.1 then
		return false
	end
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	params.FilterDescendantsInstances = { Mundo.carpeta }
	local pie = r.Position - Vector3.new(0, m.hum.HipHeight + r.Size.Y / 2 - 0.8, 0)
	return workspace:Raycast(pie, dir.Unit * (r.Size.Z / 2 + 1.6), params) ~= nil
end

local function actualizar(m, dt)
	local r = m.raiz
	if not r.Parent or m.muerto then
		return
	end
	local pos = r.Position
	-- Patas
	local mov = m.hum.MoveDirection.Magnitude > 0.1 and 1 or 0
	m.fase += dt * 9 * mov
	local a = math.sin(m.fase) * 0.7 * mov
	for k, mo in m.motores do
		local base = mo:GetAttribute("base")
		if not base then
			mo:SetAttribute("base", mo.C0)
			base = mo.C0
		end
		local signo = (k == "p1" or k == "p4" or k == "b2") and 1 or -1
		if k:sub(1, 1) == "b" then
			mo.C0 = base * CFrame.Angles(a * 0.25 * signo, 0, 0)
		else
			mo.C0 = base * CFrame.Angles(a * signo, 0, 0)
		end
	end
	m.cd -= dt
	m.pensar -= dt
	m.huir -= dt
	if m.pensar > 0 then
		return
	end
	m.pensar = 0.25
	if obstaculo(m) then
		m.hum.Jump = true
	end
	local T = m.T
	if T.hostil then
		local plr, d = jugadorMasCerca(pos, 16 * B)
		if plr then
			local pr = plr.Character.HumanoidRootPart
			m.hum:MoveTo(pr.Position)
			if d < 4.2 and m.cd <= 0 then
				m.cd = 1
				local h = plr.Character:FindFirstChildOfClass("Humanoid")
				if h then
					h:TakeDamage(T.dano)
					if Mobs.alEmpujar then
						local dir = (pr.Position - pos) * Vector3.new(1, 0, 1)
						Mobs.alEmpujar(plr, (dir.Magnitude > 0.01 and dir.Unit or Vector3.zero) * 30 + Vector3.new(0, 20, 0))
					end
				end
			end
		elseif math.random() < 0.15 then
			m.hum:MoveTo(pos + Vector3.new(math.random(-20, 20), 0, math.random(-20, 20)))
		end
		-- Al sol se queman
		m.quema -= 0.25
		if not esDeNoche() and m.quema <= 0 then
			m.quema = 1
			local x, y, z = math.floor(pos.X / B), math.floor(pos.Y / B), math.floor(pos.Z / B)
			if Mundo.alCielo(x, y + 1, z) then
				if not r:FindFirstChildOfClass("Fire") then
					local f = Instance.new("Fire")
					f.Size = 3
					f.Parent = r
				end
				m.hum:TakeDamage(2)
			end
		end
	else
		if m.huir > 0 then
			local plr = jugadorMasCerca(pos, 30 * B)
			if plr then
				local dir = (pos - plr.Character.HumanoidRootPart.Position) * Vector3.new(1, 0, 1)
				if dir.Magnitude > 0.01 then
					m.hum:MoveTo(pos + dir.Unit * 12)
				end
			end
			m.hum.WalkSpeed = T.vel * 1.8
		else
			m.hum.WalkSpeed = T.vel
			if math.random() < 0.06 then
				m.hum:MoveTo(pos + Vector3.new(math.random(-18, 18), 0, math.random(-18, 18)))
			end
		end
	end
end

-- Aparecen criaturas cerca de los jugadores
local function generar()
	local zombis, animales = 0, 0
	for _, m in lista do
		if m.T.hostil then
			zombis += 1
		else
			animales += 1
		end
	end
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		if r and not r.Anchored then
			local a = math.random() * math.pi * 2
			local dist = math.random(12, 26)
			local x = math.floor(r.Position.X / B + math.cos(a) * dist)
			local z = math.floor(r.Position.Z / B + math.sin(a) * dist)
			if Mundo.listo(x // Config.CHUNK, z // Config.CHUNK) then
				local y = Mundo.alturaSuelo(x, z)
				local suelo = Mundo.get(x, y, z)
				local libre = Mundo.get(x, y + 1, z) == 0 and Mundo.get(x, y + 2, z) == 0
				if libre and y > Config.NIVEL_MAR then
					if esDeNoche() and zombis < Config.MAX_ZOMBIS then
						Mobs.crear("zombi", x, y, z)
						zombis += 1
					elseif not esDeNoche() and animales < Config.MAX_ANIMALES and suelo == ID.cesped and math.random() < 0.5 then
						local t = ({ "cerdo", "vaca", "oveja" })[math.random(1, 3)]
						for _ = 1, math.random(1, 3) do
							Mobs.crear(t, x + math.random(-1, 1), y, z + math.random(-1, 1))
							animales += 1
						end
					end
				end
			end
		end
	end
	-- Quitar las que quedan muy lejos o se caen del mundo
	local lejos = (Config.RADIO + 1) * Config.CHUNK * B
	for i = #lista, 1, -1 do
		local m = lista[i]
		local p = m.raiz.Position
		local _, d = jugadorMasCerca(p, math.huge)
		if p.Y < -20 or (d and d > lejos) or (not d) then
			m.muerto = true
			m.modelo:Destroy()
			table.remove(lista, i)
		end
	end
end

function Mobs.iniciar()
	RunService.Heartbeat:Connect(function(dt)
		for i = #lista, 1, -1 do
			local m = lista[i]
			if m then
				actualizar(m, dt)
			end
		end
	end)
	task.spawn(function()
		while true do
			task.wait(2)
			pcall(generar)
		end
	end)
end

return Mobs
