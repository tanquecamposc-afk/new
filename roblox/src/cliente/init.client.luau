--[[
	Blockverse para Roblox · Script del cliente
	Cámara en primera persona, apuntar a bloques y criaturas, picar
	(con el tiempo de cada bloque y herramienta), poner bloques, comer,
	elegir objeto, correr, volar en creativo y efectos al romper.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")
local SoundService = game:GetService("SoundService")
local Debris = game:GetService("Debris")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Bloques = require(Comp.Bloques)
local Interfaz = require(script:WaitForChild("Interfaz"))

local remotos = ReplicatedStorage:WaitForChild("Remotos")
local Accion = remotos:WaitForChild("Accion")
local Estado = remotos:WaitForChild("Estado")

local B = Config.BLOQUE
local DEF = Bloques.porId
local jugador = Players.LocalPlayer

pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Health, false)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
end)

local est = { inv = table.create(36, false), sel = 1, modo = nil, listo = false }
local tercera = false
local volando = false
local vueloFuerza = nil

local function enviar(...)
	Accion:FireServer(...)
end
Interfaz.alAccion = enviar

------------------------------------------------------------------
-- Sonidos (sonidos que ya trae Roblox)
------------------------------------------------------------------
local function sonido(id, vol, tono)
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = vol or 0.5
	s.PlaybackSpeed = tono or 1
	s.Parent = SoundService
	s:Play()
	Debris:AddItem(s, 3)
end
local SND_ROMPER = "rbxasset://sounds/action_footsteps_plastic.mp3"
local SND_PONER = "rbxasset://sounds/clickfast.wav"
local SND_GOLPE = "rbxasset://sounds/swordslash.wav"

------------------------------------------------------------------
-- Cámara
------------------------------------------------------------------
local function aplicarCamara()
	local abierto = Interfaz.abierto() or Interfaz.menuVisible()
	if tercera then
		jugador.CameraMode = Enum.CameraMode.Classic
		jugador.CameraMinZoomDistance = 12
		jugador.CameraMaxZoomDistance = 12
	else
		jugador.CameraMode = Enum.CameraMode.LockFirstPerson
		jugador.CameraMinZoomDistance = 0.5
		jugador.CameraMaxZoomDistance = 0.5
	end
	Interfaz.mostrarMano(not tercera and not abierto)
end
aplicarCamara()

------------------------------------------------------------------
-- Selección del bloque al que se apunta
------------------------------------------------------------------
local marco = Instance.new("Part")
marco.Name = "Seleccion"
marco.Anchored = true
marco.CanCollide = false
marco.CanQuery = false
marco.CanTouch = false
marco.Transparency = 1
marco.Size = Vector3.new(B + 0.06, B + 0.06, B + 0.06)
local caja = Instance.new("SelectionBox")
caja.Adornee = marco
caja.LineThickness = 0.04
caja.Color3 = Color3.fromRGB(20, 20, 20)
caja.Transparency = 0.35
caja.SurfaceColor3 = Color3.fromRGB(10, 10, 10)
caja.SurfaceTransparency = 1
caja.Parent = marco
marco.Parent = workspace.CurrentCamera or workspace

local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Include
local function actualizarFiltro()
	local lista = {}
	for _, n in { "Mundo", "Criaturas" } do
		local f = workspace:FindFirstChild(n)
		if f then
			table.insert(lista, f)
		end
	end
	params.FilterDescendantsInstances = lista
end
actualizarFiltro()
workspace.ChildAdded:Connect(actualizarFiltro)

local objetivo = nil -- { tipo = "bloque", x, y, z, b, nx, ny, nz } o { tipo = "mob", parte }
local function apuntar()
	local cam = workspace.CurrentCamera
	local ch = jugador.Character
	local cabeza = ch and ch:FindFirstChild("Head")
	if not cam or not cabeza then
		return nil
	end
	local v = cam.ViewportSize
	local rayo = cam:ViewportPointToRay(v.X / 2, v.Y / 2)
	local extra = (cam.CFrame.Position - cabeza.Position).Magnitude
	local r = workspace:Raycast(rayo.Origin, rayo.Direction * (Config.ALCANCE * B + extra), params)
	if not r then
		return nil
	end
	local criaturas = workspace:FindFirstChild("Criaturas")
	if criaturas and r.Instance:IsDescendantOf(criaturas) then
		return { tipo = "mob", parte = r.Instance }
	end
	local p = r.Position - r.Normal * 0.05
	local x, y, z = math.floor(p.X / B), math.floor(p.Y / B), math.floor(p.Z / B)
	local b = r.Instance:GetAttribute("b") or 0
	local n = r.Normal
	local nx, ny, nz = math.round(n.X), math.round(n.Y), math.round(n.Z)
	-- Las plantas se apuntan como su propio hueco
	local d = DEF[b]
	if d and d.forma ~= "cubo" then
		nx, ny, nz = 0, 0, 0
	end
	return { tipo = "bloque", x = x, y = y, z = z, b = b, nx = nx, ny = ny, nz = nz }
end

------------------------------------------------------------------
-- Picar, atacar, poner y comer
------------------------------------------------------------------
local picando = false
local progreso = 0
local actual = nil -- bloque que se está picando
local espera = 0
local esperaPoner = 0
local poniendo = false
local alturaCaida = nil
local ultimaY = nil

local function enMano()
	local p = est.inv[est.sel]
	return p and p.id or nil
end

local function trozos(x, y, z, b)
	local d = DEF[b]
	if not d then
		return
	end
	local col = Color3.fromRGB(d.color[1], d.color[2], d.color[3])
	local centro = Vector3.new((x + 0.5) * B, (y + 0.5) * B, (z + 0.5) * B)
	for _ = 1, 8 do
		local t = Instance.new("Part")
		t.Size = Vector3.new(0.4, 0.4, 0.4)
		t.Color = col
		t.Material = Enum.Material.SmoothPlastic
		t.CanCollide = false
		t.CanQuery = false
		t.CanTouch = false
		t.CFrame = CFrame.new(centro + Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * 2)
		t.Parent = workspace
		t.AssemblyLinearVelocity = Vector3.new(math.random() * 16 - 8, math.random() * 14 + 4, math.random() * 16 - 8)
		Debris:AddItem(t, 0.7)
	end
end

local function atacar()
	if objetivo and objetivo.tipo == "mob" then
		enviar("atacar", objetivo.parte)
		Interfaz.balancear()
		sonido(SND_GOLPE, 0.4, 0.9 + math.random() * 0.2)
	end
end

local function accionDerecha()
	local id = enMano()
	local d = id and DEF[id]
	if d and d.comida then
		enviar("usar")
		Interfaz.balancear()
		return
	end
	if d and d.esBloque and objetivo and objetivo.tipo == "bloque" then
		local o = objetivo
		local tx, ty, tz = o.x + o.nx, o.y + o.ny, o.z + o.nz
		if o.nx == 0 and o.ny == 0 and o.nz == 0 and DEF[o.b] and DEF[o.b].clave ~= "hierba" then
			ty += 1
		end
		enviar("poner", tx, ty, tz)
		Interfaz.balancear()
		sonido(SND_PONER, 0.35, 0.8)
	end
end

------------------------------------------------------------------
-- Vuelo (modo creativo)
------------------------------------------------------------------
local function ponerVuelo(si)
	volando = si and est.modo == "creativo"
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	if vueloFuerza then
		vueloFuerza:Destroy()
		vueloFuerza = nil
	end
	if volando and root then
		vueloFuerza = Instance.new("BodyVelocity")
		vueloFuerza.MaxForce = Vector3.new(1e6, 1e6, 1e6)
		vueloFuerza.Velocity = Vector3.zero
		vueloFuerza.Parent = root
	end
	Interfaz.aviso(volando and "Volando: Espacio sube, Ctrl o C baja" or "Ya no vuelas")
end

------------------------------------------------------------------
-- Entrada
------------------------------------------------------------------
local function elegir(i)
	est.sel = i
	Interfaz.seleccion(i)
	enviar("sel", i)
	progreso = 0
end
Interfaz.alSeleccionar = elegir

Interfaz.alModo = function(m)
	enviar("modo", m)
	Interfaz.mostrarMenu(false)
	aplicarCamara()
end

UserInputService.InputBegan:Connect(function(input, procesado)
	local t = input.UserInputType
	if t == Enum.UserInputType.MouseButton1 and not procesado then
		if Interfaz.abierto() or Interfaz.menuVisible() then
			return
		end
		picando = true
		atacar()
	elseif t == Enum.UserInputType.MouseButton2 and not procesado then
		if Interfaz.abierto() or Interfaz.menuVisible() then
			return
		end
		poniendo = true
		esperaPoner = 0.25
		accionDerecha()
	elseif t == Enum.UserInputType.Keyboard and not procesado then
		local k = input.KeyCode
		local n = k.Value - Enum.KeyCode.One.Value + 1
		if n >= 1 and n <= 9 then
			elegir(n)
		elseif k == Enum.KeyCode.E then
			if not Interfaz.menuVisible() then
				Interfaz.alternarInventario()
				aplicarCamara()
			end
		elseif k == Enum.KeyCode.V then
			tercera = not tercera
			aplicarCamara()
		elseif k == Enum.KeyCode.F then
			if est.modo == "creativo" then
				ponerVuelo(not volando)
			end
		elseif k == Enum.KeyCode.LeftShift then
			local h = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
			if h then
				h.WalkSpeed = 21
			end
		elseif k == Enum.KeyCode.Escape and Interfaz.abierto() then
			Interfaz.alternarInventario(false)
			aplicarCamara()
		end
	end
end)

UserInputService.InputEnded:Connect(function(input)
	local t = input.UserInputType
	if t == Enum.UserInputType.MouseButton1 then
		picando = false
	elseif t == Enum.UserInputType.MouseButton2 then
		poniendo = false
	elseif input.KeyCode == Enum.KeyCode.LeftShift then
		local h = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
		if h then
			h.WalkSpeed = 14
		end
	end
end)

UserInputService.InputChanged:Connect(function(input, procesado)
	if input.UserInputType == Enum.UserInputType.MouseWheel and not procesado and not Interfaz.abierto() then
		local d = input.Position.Z > 0 and -1 or 1
		elegir((est.sel - 1 + d) % 9 + 1)
	end
end)

Interfaz.botonesMovil(function(si)
	picando = si
	if si then
		atacar()
	end
end, function()
	accionDerecha()
end, function()
	Interfaz.alternarInventario()
	aplicarCamara()
end, function()
	ponerVuelo(not volando)
end)

------------------------------------------------------------------
-- Mensajes del servidor
------------------------------------------------------------------
Estado.OnClientEvent:Connect(function(tipo, a, b)
	if tipo == "inv" then
		est.inv = a
		est.sel = b or est.sel
		Interfaz.inventario(a, est.sel)
	elseif tipo == "hambre" then
		Interfaz.hambre(a)
	elseif tipo == "aviso" then
		Interfaz.aviso(a)
	elseif tipo == "listo" then
		est.listo = true
		alturaCaida = nil
		Interfaz.mundoListo(true)
	elseif tipo == "cerca" then
		Interfaz.cerca(a)
	elseif tipo == "modo" then
		est.modo = a
		Interfaz.modo(a)
		if Interfaz.botonVolar then
			Interfaz.botonVolar.Visible = a == "creativo"
		end
		if a ~= "creativo" and volando then
			ponerVuelo(false)
		end
		Interfaz.aviso(a == "creativo" and "Modo creativo" or "Modo supervivencia")
	elseif tipo == "empuje" then
		local root = jugador.Character and jugador.Character:FindFirstChild("HumanoidRootPart")
		if root then
			root.AssemblyLinearVelocity += a
		end
	end
end)

------------------------------------------------------------------
-- Personaje
------------------------------------------------------------------
local function alPersonaje(ch)
	local hum = ch:WaitForChild("Humanoid")
	local antes = hum.Health
	Interfaz.vida(hum.Health, hum.MaxHealth)
	hum.HealthChanged:Connect(function(h)
		if h < antes then
			Interfaz.dano()
		end
		antes = h
		Interfaz.vida(h, hum.MaxHealth)
	end)
	volando = false
	vueloFuerza = nil
	aplicarCamara()
end
if jugador.Character then
	task.spawn(alPersonaje, jugador.Character)
end
jugador.CharacterAdded:Connect(alPersonaje)

------------------------------------------------------------------
-- Bucle de cada fotograma
------------------------------------------------------------------
RunService.RenderStepped:Connect(function(dt)
	local abierto = Interfaz.abierto() or Interfaz.menuVisible()
	if abierto then
		objetivo = nil
		picando = false
		poniendo = false
	else
		objetivo = apuntar()
	end

	-- Marco del bloque apuntado
	if objetivo and objetivo.tipo == "bloque" then
		marco.CFrame = CFrame.new((objetivo.x + 0.5) * B, (objetivo.y + 0.5) * B, (objetivo.z + 0.5) * B)
		caja.Visible = true
	else
		caja.Visible = false
	end

	-- Picar
	espera -= dt
	if picando and objetivo and objetivo.tipo == "bloque" and espera <= 0 then
		local o = objetivo
		if not actual or actual.x ~= o.x or actual.y ~= o.y or actual.z ~= o.z then
			actual = { x = o.x, y = o.y, z = o.z, b = o.b }
			progreso = 0
			enviar("golpe", o.x, o.y, o.z)
		end
		local t = est.modo == "creativo" and 0 or Bloques.tiempoRomper(o.b, enMano())
		if t == math.huge then
			progreso = 0
		else
			progreso += dt / math.max(t, 0.001)
			if math.floor(progreso * 4) ~= math.floor((progreso - dt / math.max(t, 0.001)) * 4) then
				Interfaz.balancear()
			end
			if progreso >= 1 then
				enviar("romper", o.x, o.y, o.z)
				trozos(o.x, o.y, o.z, o.b)
				sonido(SND_ROMPER, 0.6, 0.7 + math.random() * 0.3)
				progreso = 0
				actual = nil
				espera = est.modo == "creativo" and 0.18 or 0.12
			end
		end
	elseif not picando then
		progreso = 0
		actual = nil
	end
	Interfaz.progreso(progreso)
	caja.SurfaceTransparency = progreso > 0 and (1 - progreso * 0.55) or 1

	-- Poner manteniendo el botón
	if poniendo then
		esperaPoner -= dt
		if esperaPoner <= 0 then
			esperaPoner = 0.22
			accionDerecha()
		end
	end

	-- Vuelo
	local ch = jugador.Character
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if volando and vueloFuerza and hum then
		local subir = UserInputService:IsKeyDown(Enum.KeyCode.Space) or hum.Jump
		local bajar = UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) or UserInputService:IsKeyDown(Enum.KeyCode.C)
		vueloFuerza.Velocity = hum.MoveDirection * 42 + Vector3.new(0, (subir and 30 or 0) - (bajar and 30 or 0), 0)
	end

	-- Daño por caída: se mide la altura desde la que se cae
	if hum and ch:FindFirstChild("HumanoidRootPart") then
		local y = ch.HumanoidRootPart.Position.Y
		local estadoH = hum:GetState()
		-- Un salto brusco de posición es un teletransporte (aparecer), no una caída
		local teletransporte = ultimaY and math.abs(y - ultimaY) > 15
		ultimaY = y
		if teletransporte or ch.HumanoidRootPart.Anchored or volando or estadoH == Enum.HumanoidStateType.Swimming or est.modo ~= "supervivencia" then
			alturaCaida = nil
		elseif estadoH == Enum.HumanoidStateType.Freefall or estadoH == Enum.HumanoidStateType.Jumping then
			alturaCaida = math.max(alturaCaida or y, y)
		elseif alturaCaida then
			local bloques = (alturaCaida - y) / B
			alturaCaida = nil
			if bloques > 3.5 then
				enviar("caida", bloques)
			end
		end
	end

	-- ¿La cámara está bajo el agua?
	local cam = workspace.CurrentCamera
	if cam then
		local p = cam.CFrame.Position
		local ok, mats = pcall(function()
			local r = Region3.new(p - Vector3.new(2, 2, 2), p + Vector3.new(2, 2, 2)):ExpandToGrid(4)
			return workspace.Terrain:ReadVoxels(r, 4)
		end)
		local agua = false
		if ok and mats and mats[1] and mats[1][1] and mats[1][1][1] then
			agua = mats[1][1][1] == Enum.Material.Water
		end
		Interfaz.agua(agua)
	end
end)

Interfaz.mostrarMenu(true)
Interfaz.hambre(20)
Interfaz.vida(20, 20)
