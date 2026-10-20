--[[
	Blockverse para Roblox · Script del cliente
	· Genera y dibuja el mundo en este equipo (la misma semilla que el
	  servidor) y aplica los cambios que llegan.
	· Cámara en primera persona (V: tercera), apuntar a bloques con el
	  rayo del juego web y a criaturas.
	· Picar con el tiempo de cada bloque y herramienta y las grietas del
	  juego web, poner, usar objetos, comer y beber, tensar el arco,
	  atacar con carga, correr, agacharse y volar en creativo.
	· Sonidos, partículas, explosiones, daño por caída y efectos.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")
local SoundService = game:GetService("SoundService")
local Debris = game:GetService("Debris")
local Lighting = game:GetService("Lighting")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local MundoDatos = require(Comp:WaitForChild("MundoDatos"))
local Rayo = require(Comp:WaitForChild("Rayo"))
local Interfaz = require(script:WaitForChild("Interfaz"))
local Iconos = require(script:WaitForChild("Iconos"))
local Render = require(script:WaitForChild("Render"))
local MobsVista = require(script:WaitForChild("MobsVista"))
local EntidadesVista = require(script:WaitForChild("EntidadesVista"))
local Imagenes = require(script:WaitForChild("Imagenes"))

local remotos = ReplicatedStorage:WaitForChild("Remotos")
local Accion = remotos:WaitForChild("Accion")
local Estado = remotos:WaitForChild("Estado")
local RBloques = remotos:WaitForChild("Bloques")
local Ediciones = remotos:WaitForChild("Ediciones")

local BS = Config.BLOQUE
local BL, OB = Registro.bloques, Registro.objetos
local esAgua, esLava = Registro.esAgua, Registro.esLava
local jugador = Players.LocalPlayer

pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Health, false)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
end)

local function enviar(...)
	Accion:FireServer(...)
end
Interfaz.enviar = enviar
local est = Interfaz.est

------------------------------------------------------------------
-- Sonidos (de los que trae Roblox)
------------------------------------------------------------------
local SND = {
	romper = { "rbxasset://sounds/action_footsteps_plastic.mp3", 0.7, 0.75 },
	poner = { "rbxasset://sounds/clickfast.wav", 0.4, 0.8 },
	golpe = { "rbxasset://sounds/swordslash.wav", 0.4, 1 },
	dano = { "rbxasset://sounds/uuhhh.mp3", 0.5, 1 },
	recoger = { "rbxasset://sounds/electronicpingshort.wav", 0.25, 1.6 },
	xp = { "rbxasset://sounds/electronicpingshort.wav", 0.25, 2.2 },
	nivel = { "rbxasset://sounds/electronicpingshort.wav", 0.5, 0.9 },
	explosion = { "rbxasset://sounds/collide.wav", 1, 0.45 },
	comer = { "rbxasset://sounds/splat.wav", 0.4, 1.2 },
	beber = { "rbxasset://sounds/action_swim.mp3", 0.4, 1.4 },
	arco = { "rbxasset://sounds/swordlunge.wav", 0.5, 1.3 },
	puerta = { "rbxasset://sounds/clickfast.wav", 0.5, 0.5 },
	rompeHerr = { "rbxasset://sounds/swordslash.wav", 0.6, 0.5 },
	agua = { "rbxasset://sounds/action_swim.mp3", 0.5, 1 },
	lava = { "rbxasset://sounds/action_swim.mp3", 0.5, 0.6 },
	armadura = { "rbxasset://sounds/unsheath.wav", 0.4, 1 },
	paso = { "rbxasset://sounds/action_footsteps_plastic.mp3", 0.15, 1 },
	caer = { "rbxasset://sounds/action_jump_land.mp3", 0.5, 1 },
	tnt = { "rbxasset://sounds/action_swim.mp3", 0.6, 0.5 },
}
local function sonido(nombre, pos, tono)
	local s = SND[nombre]
	if not s then
		return
	end
	local snd = Instance.new("Sound")
	snd.SoundId = s[1]
	snd.Volume = s[2]
	snd.PlaybackSpeed = (tono or 1) * s[3] * (0.92 + math.random() * 0.16)
	if pos then
		local a = Instance.new("Attachment")
		a.WorldPosition = pos
		a.Parent = workspace.Terrain
		snd.RollOffMaxDistance = 40 * BS
		snd.Parent = a
		Debris:AddItem(a, 4)
	else
		snd.Parent = SoundService
		Debris:AddItem(snd, 4)
	end
	snd:Play()
end

------------------------------------------------------------------
-- Partículas (trocitos que saltan, como emitirParticulas del juego web)
------------------------------------------------------------------
local particulas = Instance.new("Folder")
particulas.Name = "Particulas"
particulas.Parent = workspace
local vivas = {}
local function emitir(pos, color, n, vel, tam, grav)
	vel = vel or 4
	for _ = 1, n do
		if #vivas > 220 then
			break
		end
		local t = (tam or 0.12) * BS * (0.7 + math.random() * 0.6)
		local p = Instance.new("Part")
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.CastShadow = false
		p.Material = Enum.Material.SmoothPlastic
		p.Size = Vector3.new(t, t, t)
		local c = color
		if typeof(c) == "table" then
			c = c[math.random(1, #c)]
		end
		local h, s, v = c:ToHSV()
		p.Color = Color3.fromHSV(h, s, math.clamp(v * (0.8 + math.random() * 0.35), 0, 1))
		p.CFrame = CFrame.new(pos)
		p.Parent = particulas
		table.insert(vivas, {
			p = p, v = Vector3.new((math.random() - 0.5) * vel, math.random() * vel * 0.9 + 1, (math.random() - 0.5) * vel) * BS,
			vida = 0.5 + math.random() * 0.5, g = (grav or 20) * BS,
		})
	end
end
MobsVista.alParticulas = function(pos, color, n)
	emitir(pos, color, n, 1.5, 0.08, -2)
end

local function colorBloque(b)
	local d = BL[b]
	if d and d.tex then
		local c1 = Render.COLOR_TILE[d.tex[4]]
		local c2 = Render.COLOR_TILE[d.tex[1]]
		if c1 and c2 then
			return { c1, c2 }
		end
	end
	return { Iconos.color(b) }
end

local function trozos(x, y, z, b)
	local cols = colorBloque(b)
	-- Bloques que se tiñen según el bioma (césped, hojas)
	if Registro.TINTE[b] and est.md then
		local bio = est.md:bioma(x, z)
		local Bi = require(Comp.Datos:WaitForChild("Biomas"))
		local c = Bi.colores[bio + 1]
		local t = c and (Registro.esHojas(b) and c[2] or c[1])
		if t then
			cols = { Color3.new(t[1], t[2], t[3]) }
		end
	end
	emitir(Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS, cols, 14, 4, 0.12)
end

------------------------------------------------------------------
-- Mundo
------------------------------------------------------------------
Interfaz.iniciar()
Interfaz.carga(0.05, "Conectando…")
while workspace:GetAttribute("Semilla") == nil do
	task.wait(0.1)
end
local semilla = workspace:GetAttribute("Semilla")
Interfaz.carga(0.15, "Preparando texturas…")
Iconos.preparar()
Interfaz.carga(0.35, "Preparando criaturas…")
MobsVista.iniciar()
EntidadesVista.iniciar()
Interfaz.carga(0.5, "Generando el mundo…")
local md = MundoDatos.new(semilla)
est.md = md
-- Los chunks se cargan alrededor del personaje (también en tercera persona)
Render.foco = function()
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	if root then
		return root.Position
	end
	local cam = workspace.CurrentCamera
	return cam and cam.CFrame.Position or Vector3.zero
end
Render.iniciar(md, function(lote)
	return Ediciones:InvokeServer(lote)
end)

-- Cambios de bloques (lista plana x, y, z, id)
RBloques.OnClientEvent:Connect(function(plano)
	local cam = workspace.CurrentCamera
	local cp = cam and cam.CFrame.Position / BS or Vector3.zero
	for i = 1, #plano, 4 do
		local x, y, z, id = plano[i], plano[i + 1], plano[i + 2], plano[i + 3]
		local antes = md:getSiCargado(x, y, z)
		if id == 0 and antes > 0 and not Registro.esLiquido(antes) and math.abs(x - cp.X) + math.abs(z - cp.Z) < 40 then
			if not (est.yoRompi and est.yoRompi.x == x and est.yoRompi.y == y and est.yoRompi.z == z) then
				trozos(x, y, z, antes)
			end
		end
		Render.cambiarBloque(x, y, z, id)
	end
end)

------------------------------------------------------------------
-- Cámara
------------------------------------------------------------------
local tercera = false
local function aplicarCamara()
	local abierto = Interfaz.abierto() or Interfaz.menuVisible()
	if tercera then
		jugador.CameraMode = Enum.CameraMode.Classic
		jugador.CameraMinZoomDistance = 14
		jugador.CameraMaxZoomDistance = 14
	else
		jugador.CameraMode = Enum.CameraMode.LockFirstPerson
		jugador.CameraMinZoomDistance = 0.5
		jugador.CameraMaxZoomDistance = 0.5
	end
	Interfaz.mostrarMano(not tercera and not abierto)
	Interfaz.mostrarMira(not abierto)
end
aplicarCamara()

------------------------------------------------------------------
-- Apuntar
------------------------------------------------------------------
local marco = Instance.new("Part")
marco.Name = "Seleccion"
marco.Anchored = true
marco.CanCollide = false
marco.CanQuery = false
marco.CanTouch = false
marco.Transparency = 1
marco.Size = Vector3.new(BS, BS, BS)
marco.Parent = workspace
local caja = Instance.new("SelectionBox")
caja.Adornee = marco
caja.LineThickness = 0.03
caja.Color3 = Color3.new(0, 0, 0)
caja.Transparency = 0.45
caja.SurfaceTransparency = 1
caja.Parent = marco

-- Grietas: una caja un poco más grande con una calcomanía por cara
local grietas = Instance.new("Part")
grietas.Name = "Grietas"
grietas.Anchored = true
grietas.CanCollide = false
grietas.CanQuery = false
grietas.CanTouch = false
grietas.Transparency = 1
grietas.Size = Vector3.new(BS, BS, BS) * 1.006
grietas.Parent = workspace
local calcas = {}
for _, cara in Enum.NormalId:GetEnumItems() do
	local d = Instance.new("Decal")
	d.Face = cara
	d.Transparency = 1
	d.Parent = grietas
	table.insert(calcas, d)
end
local faseGrieta = -1
local function ponerGrietas(f)
	local fase = f and math.clamp(math.floor(f * 10), 0, 9) or -1
	if fase == faseGrieta then
		return
	end
	faseGrieta = fase
	local imgs = Iconos.grietas()
	for _, d in calcas do
		if fase < 0 or not imgs then
			d.Transparency = 1
		else
			Imagenes.enCalcomania(d, imgs[fase + 1])
			d.Transparency = 0
		end
	end
	if not imgs then
		caja.SurfaceColor3 = Color3.new(0, 0, 0)
		caja.SurfaceTransparency = fase < 0 and 1 or 1 - (fase + 1) / 10 * 0.6
	end
end

local filtroMobs = RaycastParams.new()
filtroMobs.FilterType = Enum.RaycastFilterType.Include
task.spawn(function()
	filtroMobs.FilterDescendantsInstances = { workspace:WaitForChild("Criaturas") }
end)

local function ojos()
	local ch = jugador.Character
	local cab = ch and ch:FindFirstChild("Head")
	return cab and cab.Position or nil
end

local objetivo = nil -- {tipo = "bloque", x, y, z, b, n} o {tipo = "mob", parte}
local function apuntar()
	local cam = workspace.CurrentCamera
	local e = ojos()
	if not cam or not e then
		return nil
	end
	local dir = cam.CFrame.LookVector
	if not tercera then
		e = cam.CFrame.Position
	end
	local r = Rayo.lanzar(md, e, dir, Config.ALCANCE, {})
	local dm = math.huge
	local mob
	local rr = workspace:Raycast(e, dir * (Config.ALCANCE + 1) * BS, filtroMobs)
	if rr then
		mob = rr.Instance
		dm = (rr.Position - e).Magnitude / BS
	end
	if mob and (not r or dm < (r.t or math.huge)) then
		return { tipo = "mob", parte = mob }
	end
	if r then
		return { tipo = "bloque", x = r.x, y = r.y, z = r.z, b = r.b, n = r.n }
	end
	return nil
end

------------------------------------------------------------------
-- Picar, atacar y usar
------------------------------------------------------------------
local picando, usando = false, false
local progreso, actual, espera = 0, nil, 0
local esperaUsar = 0
local comerDesde, arcoDesde = nil, nil
local ultimoAtaque = 0
local agachado, corriendo = false, false
local volando, vueloFuerza = false, nil

local function enMano()
	local p = est.inv[est.sel]
	return p and p.id or nil, p
end

local function creativo()
	return est.modo == "creativo"
end

local function cadencia()
	local id = enMano()
	local h = id and Registro.herramienta(id)
	return h and h.cad or 4
end

local function cargaAtaque()
	return math.clamp((os.clock() - ultimoAtaque) * cadencia(), 0, 1)
end

local function atacar()
	if not objetivo or objetivo.tipo ~= "mob" then
		return false
	end
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	local cayendo = root and root.AssemblyLinearVelocity.Y < -1 and hum and hum.FloorMaterial == Enum.Material.Air
	enviar("atacar", objetivo.parte, cargaAtaque(), cayendo == true, corriendo)
	ultimoAtaque = os.clock()
	Interfaz.balancear()
	return true
end

local function datosObjetivo()
	if objetivo and objetivo.tipo == "bloque" then
		return { x = objetivo.x, y = objetivo.y, z = objetivo.z, n = objetivo.n }
	end
	return nil
end

local function mirada()
	local cam = workspace.CurrentCamera
	return cam and cam.CFrame.LookVector or Vector3.new(0, 0, -1)
end

local function usar(inicio)
	local id, p = enMano()
	local o = id and OB[id]
	local mobParte = objetivo and objetivo.tipo == "mob" and objetivo.parte or nil
	-- Comer y beber
	if o and (o.comida or o.bebida) and not (objetivo and objetivo.tipo == "bloque" and BL[objetivo.b] and BL[objetivo.b].inter and not agachado) then
		if est.hambre < 20 or o.siempre or o.bebida or creativo() then
			if inicio or not comerDesde then
				comerDesde = os.clock()
				enviar("derecho", datosObjetivo(), mirada(), mobParte, agachado)
			end
			return
		end
	end
	-- Arco
	if id == Registro.I.arco then
		if inicio and not arcoDesde then
			arcoDesde = os.clock()
			enviar("derecho", nil, mirada(), nil, agachado)
		end
		return
	end
	enviar("derecho", datosObjetivo(), mirada(), mobParte, agachado)
	Interfaz.balancear()
	local _ = p
end

------------------------------------------------------------------
-- Vuelo (creativo)
------------------------------------------------------------------
local function ponerVuelo(si)
	volando = si and creativo()
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	if vueloFuerza then
		vueloFuerza:Destroy()
		vueloFuerza = nil
	end
	if volando and root then
		vueloFuerza = Instance.new("BodyVelocity")
		vueloFuerza.MaxForce = Vector3.new(1e7, 1e7, 1e7)
		vueloFuerza.Velocity = Vector3.zero
		vueloFuerza.P = 4000
		vueloFuerza.Parent = root
	end
end

------------------------------------------------------------------
-- Velocidad al andar (correr, agacharse)
------------------------------------------------------------------
local function velocidad()
	local ch = jugador.Character
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local v = 4.3
	if agachado then
		v = 1.3
	elseif corriendo and (creativo() or est.hambre > 6) then
		v = 5.6
	end
	if est.efectos and est.efectos.rapidez then
		v *= 1.2
	end
	if est.efectos and est.efectos.lentitud then
		v *= 0.85
	end
	hum.WalkSpeed = v * BS
	local cab = ch:FindFirstChild("Humanoid") and hum
	if cab then
		hum.CameraOffset = agachado and Vector3.new(0, -0.3 * BS, 0) or Vector3.zero
	end
end

local function ponerCorrer(si)
	if corriendo ~= si then
		corriendo = si
		enviar("correr", si)
	end
	velocidad()
end

------------------------------------------------------------------
-- Interfaz y teclas
------------------------------------------------------------------
local function elegir(i)
	if est.sel ~= i then
		est.sel = i
		Interfaz.seleccion(i)
		enviar("sel", i)
		progreso, actual = 0, nil
		comerDesde, arcoDesde = nil, nil
	end
end
Interfaz.alSeleccionar = elegir

Interfaz.alCerrar = function()
	enviar("cerrarUI")
	aplicarCamara()
end

Interfaz.alElegirModo = function(m)
	if m == "oneblock" then
		enviar("modoJuego", "oneblock")
		enviar("modo", "supervivencia")
	else
		if jugador:GetAttribute("OneBlock") then
			enviar("modoJuego", "normal")
		end
		enviar("modo", m)
	end
	Interfaz.menu(false)
	aplicarCamara()
end

local function alternarInventario()
	if Interfaz.abierto() then
		Interfaz.cerrar()
	else
		enviar("abrirInventario")
	end
	aplicarCamara()
end

local ultimoEspacio = 0
UserInputService.InputBegan:Connect(function(input, procesado)
	local t = input.UserInputType
	local bloqueado = Interfaz.abierto() or Interfaz.menuVisible()
	if t == Enum.UserInputType.MouseButton1 and not procesado and not bloqueado then
		picando = true
		if not atacar() then
			Interfaz.balancear()
		end
	elseif t == Enum.UserInputType.MouseButton2 and not procesado and not bloqueado then
		usando = true
		esperaUsar = 0.25
		usar(true)
	elseif t == Enum.UserInputType.MouseButton3 and not procesado and not bloqueado then
		if creativo() and objetivo and objetivo.tipo == "bloque" and OB[objetivo.b] then
			enviar("elegirBloque", objetivo.b)
		end
	elseif t == Enum.UserInputType.Keyboard then
		local k = input.KeyCode
		if k == Enum.KeyCode.Escape and Interfaz.abierto() then
			Interfaz.cerrar()
			return
		end
		if procesado then
			return
		end
		local n = k.Value - Enum.KeyCode.One.Value + 1
		if n >= 1 and n <= 9 and not Interfaz.menuVisible() then
			elegir(n)
		elseif k == Enum.KeyCode.E then
			if not Interfaz.menuVisible() then
				alternarInventario()
			end
		elseif k == Enum.KeyCode.V then
			tercera = not tercera
			aplicarCamara()
		elseif k == Enum.KeyCode.F then
			if creativo() then
				ponerVuelo(not volando)
				Interfaz.aviso(volando and "Volando: Espacio sube, Mayús baja" or "Ya no vuelas")
			end
		elseif k == Enum.KeyCode.Q and not bloqueado then
			enviar("tirar", UserInputService:IsKeyDown(Enum.KeyCode.LeftControl))
		elseif k == Enum.KeyCode.LeftControl then
			ponerCorrer(true)
		elseif k == Enum.KeyCode.LeftShift and not volando then
			agachado = true
			velocidad()
		elseif k == Enum.KeyCode.F3 then
			Interfaz.info(not Interfaz.infoVisible() and " " or nil)
		elseif k == Enum.KeyCode.Space and creativo() then
			if os.clock() - ultimoEspacio < 0.3 then
				ponerVuelo(not volando)
			end
			ultimoEspacio = os.clock()
		end
	end
end)

UserInputService.InputEnded:Connect(function(input)
	local t = input.UserInputType
	if t == Enum.UserInputType.MouseButton1 then
		picando = false
	elseif t == Enum.UserInputType.MouseButton2 then
		usando = false
		comerDesde = nil
		if arcoDesde then
			arcoDesde = nil
			enviar("soltarArco", mirada())
		end
	elseif input.KeyCode == Enum.KeyCode.LeftShift then
		agachado = false
		velocidad()
	end
end)

UserInputService.InputChanged:Connect(function(input, procesado)
	if input.UserInputType == Enum.UserInputType.MouseWheel and not procesado and not Interfaz.abierto() and not Interfaz.menuVisible() then
		local d = input.Position.Z > 0 and -1 or 1
		elegir((est.sel - 1 + d) % 9 + 1)
	end
end)

Interfaz.botonesMovil({
	picar = function(si)
		picando = si
		if si then
			atacar()
		end
	end,
	usar = function(si)
		usando = si
		if si then
			esperaUsar = 0.25
			usar(true)
		else
			comerDesde = nil
			if arcoDesde then
				arcoDesde = nil
				enviar("soltarArco", mirada())
			end
		end
	end,
	inventario = alternarInventario,
	volar = function()
		ponerVuelo(not volando)
	end,
	agachar = function(si)
		agachado = si
		velocidad()
	end,
	tirar = function()
		enviar("tirar", false)
	end,
})

------------------------------------------------------------------
-- Mensajes del servidor
------------------------------------------------------------------
local listoServidor = false
Estado.OnClientEvent:Connect(function(tipo, a, b, c)
	if tipo == "jugador" then
		local modoAntes = est.modo
		Interfaz.jugador(a)
		if a.modo ~= modoAntes then
			if a.modo ~= "creativo" and volando then
				ponerVuelo(false)
			end
			if Interfaz.botonVolar then
				Interfaz.botonVolar.Visible = a.modo == "creativo"
			end
		end
		velocidad()
		-- Luz de la antorcha en la mano
		local id = enMano()
		local luz = id and BL[id] and BL[id].luz or 0
		local ch = jugador.Character
		local cab = ch and ch:FindFirstChild("Head")
		if cab then
			local pl = cab:FindFirstChild("LuzMano")
			if luz > 0 then
				if not pl then
					pl = Instance.new("PointLight")
					pl.Name = "LuzMano"
					pl.Color = Color3.fromRGB(255, 200, 130)
					pl.Shadows = true
					pl.Parent = cab
				end
				pl.Range = luz * 1.1 * BS / 3 * 2
				pl.Brightness = 1.4
			elseif pl then
				pl:Destroy()
			end
		end
	elseif tipo == "ui" then
		Interfaz.ui(a)
		aplicarCamara()
	elseif tipo == "aviso" then
		Interfaz.aviso(a)
	elseif tipo == "titulo" then
		Interfaz.titulo(a, b, c)
	elseif tipo == "oneblock" then
		Interfaz.oneblock(a)
	elseif tipo == "sonido" then
		sonido(a, b)
	elseif tipo == "dano" then
		Interfaz.dano()
		sonido("dano")
		local root = jugador.Character and jugador.Character:FindFirstChild("HumanoidRootPart")
		if a and root then
			root.AssemblyLinearVelocity += a
		end
	elseif tipo == "golpeMob" then
		sonido("golpe", a, b and 1 or 1)
		if c then
			emitir(a, { Color3.fromRGB(255, 255, 255), Color3.fromRGB(200, 200, 255) }, 10, 3, 0.07, 4)
		end
	elseif tipo == "explosion" then
		sonido("explosion", a)
		emitir(a, { Color3.fromRGB(240, 240, 240), Color3.fromRGB(150, 150, 150), Color3.fromRGB(80, 80, 80) }, 40, 10, 0.3, 2)
		local ex = Instance.new("Explosion")
		ex.BlastPressure = 0
		ex.BlastRadius = (b or 3) * BS
		ex.DestroyJointRadiusPercent = 0
		ex.Position = a
		ex.Parent = workspace
		local cam = workspace.CurrentCamera
		if cam and (cam.CFrame.Position - a).Magnitude < 30 * BS then
			task.spawn(function()
				for i = 1, 8 do
					local hum = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
					if hum then
						hum.CameraOffset = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * (8 - i) * 0.08 * BS
					end
					task.wait(0.03)
				end
				velocidad()
			end)
		end
	elseif tipo == "tnt" then
		sonido("tnt", a)
		local p = Instance.new("Part")
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.Size = Vector3.new(BS, BS, BS) * 1.02
		p.Material = Enum.Material.Neon
		p.Color = Color3.new(1, 1, 1)
		p.Position = a
		p.Parent = workspace
		task.spawn(function()
			local t0 = os.clock()
			while os.clock() - t0 < 4 do
				local e = os.clock() - t0
				p.Transparency = math.floor(e * 4) % 2 == 0 and 0.3 or 0.9
				p.Size = Vector3.new(BS, BS, BS) * (1.02 + math.max(0, e - 3.6) * 0.3)
				task.wait(0.05)
			end
			p:Destroy()
		end)
	elseif tipo == "particulas" then
		emitir(a, Color3.fromRGB((b or 0x60ff60) // 65536, ((b or 0x60ff60) // 256) % 256, (b or 0x60ff60) % 256), 12, 2, 0.08, -1)
	elseif tipo == "pocion" then
		local col = b or 0xff00ff
		emitir(a, Color3.fromRGB(col // 65536, (col // 256) % 256, col % 256), 30, 6, 0.1, 6)
		sonido("rompeHerr", a, 1.6)
	elseif tipo == "dormir" then
		Interfaz.dormir()
	elseif tipo == "muerte" then
		Interfaz.muerte(a)
		picando, usando = false, false
		ponerVuelo(false)
	elseif tipo == "listo" then
		listoServidor = true
	end
end)

------------------------------------------------------------------
-- Personaje
------------------------------------------------------------------
local alturaCaida, ultimaY = nil, nil
local function alPersonaje(ch)
	local hum = ch:WaitForChild("Humanoid")
	listoServidor = false
	Interfaz.muerte(nil)
	local antes = hum.Health
	Interfaz.vida(hum.Health, hum.MaxHealth)
	hum.HealthChanged:Connect(function(h)
		antes = h
		Interfaz.vida(h, hum.MaxHealth)
	end)
	hum.StateChanged:Connect(function(_, nuevo)
		if nuevo == Enum.HumanoidStateType.Jumping then
			enviar("salto")
		end
	end)
	volando, vueloFuerza = false, nil
	alturaCaida, ultimaY = nil, nil
	velocidad()
	aplicarCamara()
	local _ = antes
end
if jugador.Character then
	task.spawn(alPersonaje, jugador.Character)
end
jugador.CharacterAdded:Connect(alPersonaje)

------------------------------------------------------------------
-- Bucle de cada fotograma
------------------------------------------------------------------
local menuMostrado = false
local tPaso = 0
local fps = 60

RunService.RenderStepped:Connect(function(dt)
	fps = fps * 0.95 + (1 / math.max(dt, 1e-3)) * 0.05
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")

	-- Pantalla de carga hasta que el mundo alrededor está dibujado
	if not menuMostrado then
		if (listoServidor or (root and not root.Anchored)) and root and Render.listoEn(root.Position) then
			menuMostrado = true
			Interfaz.carga(nil)
			Interfaz.menu(true)
			aplicarCamara()
		elseif root then
			Interfaz.carga(listoServidor and 0.85 or 0.65, listoServidor and "Dibujando el mundo…" or "Generando el mundo…")
		end
	end

	-- Partículas
	for i = #vivas, 1, -1 do
		local q = vivas[i]
		q.vida -= dt
		if q.vida <= 0 then
			q.p:Destroy()
			vivas[i] = vivas[#vivas]
			vivas[#vivas] = nil
		else
			q.v -= Vector3.new(0, q.g * dt, 0)
			q.p.Position += q.v * dt
		end
	end

	local bloqueado = Interfaz.abierto() or Interfaz.menuVisible()
	if bloqueado then
		objetivo = nil
		picando, usando = false, false
	else
		objetivo = apuntar()
	end

	-- Marco del bloque apuntado (ajustado a la forma del bloque)
	if objetivo and objetivo.tipo == "bloque" then
		local cj = Rayo.cajas(objetivo.b) or { { 0, 0, 0, 1, 1, 1 } }
		local x0, y0, z0, x1, y1, z1 = 1, 1, 1, 0, 0, 0
		for _, c in cj do
			x0, y0, z0 = math.min(x0, c[1]), math.min(y0, c[2]), math.min(z0, c[3])
			x1, y1, z1 = math.max(x1, c[4]), math.max(y1, c[5]), math.max(z1, c[6])
		end
		marco.Size = Vector3.new(x1 - x0, y1 - y0, z1 - z0) * BS + Vector3.new(0.02, 0.02, 0.02)
		marco.Position = Vector3.new(objetivo.x + (x0 + x1) / 2, objetivo.y + (y0 + y1) / 2, objetivo.z + (z0 + z1) / 2) * BS
		caja.Visible = true
	else
		caja.Visible = false
	end

	-- Carga del ataque
	Interfaz.cargaAtaque(cargaAtaque())

	-- Picar
	espera -= dt
	if picando and objetivo and objetivo.tipo == "bloque" and espera <= 0 then
		local o = objetivo
		if not actual or actual.x ~= o.x or actual.y ~= o.y or actual.z ~= o.z or actual.b ~= o.b then
			actual = { x = o.x, y = o.y, z = o.z, b = o.b }
			progreso = 0
			enviar("golpe", o.x, o.y, o.z)
		end
		local ojosB = ojos()
		local bajoAgua = ojosB and esAgua(md:get(math.floor(ojosB.X / BS), math.floor(ojosB.Y / BS), math.floor(ojosB.Z / BS)))
		local enAire = hum and hum.FloorMaterial == Enum.Material.Air and not volando and not bajoAgua
		local t = Registro.tiempoRomper(o.b, enMano(), creativo(), { bajoAgua = bajoAgua, enAire = enAire })
		if t == math.huge then
			progreso = 0
		else
			local antes = progreso
			progreso += dt / math.max(t, 0.001)
			if math.floor(progreso * 4) ~= math.floor(antes * 4) then
				Interfaz.balancear()
				sonido("paso", o and Vector3.new(o.x + 0.5, o.y + 0.5, o.z + 0.5) * BS, 1.3)
			end
			if progreso >= 1 then
				enviar("romper", o.x, o.y, o.z)
				est.yoRompi = { x = o.x, y = o.y, z = o.z }
				trozos(o.x, o.y, o.z, o.b)
				sonido("romper", Vector3.new(o.x + 0.5, o.y + 0.5, o.z + 0.5) * BS)
				progreso, actual = 0, nil
				espera = creativo() and 0.2 or 0.05
			end
		end
	elseif not picando or (objetivo and objetivo.tipo ~= "bloque") then
		progreso, actual = 0, nil
	end
	if progreso > 0 and actual then
		grietas.Position = Vector3.new(actual.x + 0.5, actual.y + 0.5, actual.z + 0.5) * BS
		ponerGrietas(progreso)
	else
		ponerGrietas(nil)
	end

	-- Usar manteniendo el botón: poner seguido, comer y tensar el arco
	if usando then
		if comerDesde then
			local f = (os.clock() - comerDesde) / 1.6
			Interfaz.uso(f)
			if math.floor(f * 8) % 2 == 0 then
				Interfaz.balancear()
			end
			if f >= 1 then
				enviar("terminarComer")
				comerDesde = nil
			end
		elseif arcoDesde then
			Interfaz.uso(math.min(1, os.clock() - arcoDesde))
		else
			Interfaz.uso(nil)
			esperaUsar -= dt
			if esperaUsar <= 0 then
				esperaUsar = 0.22
				usar(false)
			end
		end
	else
		Interfaz.uso(nil)
	end

	-- Vuelo
	if volando and vueloFuerza and hum then
		local subir = UserInputService:IsKeyDown(Enum.KeyCode.Space) or hum.Jump
		local bajar = UserInputService:IsKeyDown(Enum.KeyCode.LeftShift)
		local v = corriendo and 22 or 11
		vueloFuerza.Velocity = hum.MoveDirection * v * BS + Vector3.new(0, ((subir and 1 or 0) - (bajar and 1 or 0)) * 8 * BS, 0)
		if hum.FloorMaterial ~= Enum.Material.Air and bajar then
			ponerVuelo(false)
		end
	end

	-- Correr se acaba al pararse
	if corriendo and hum and hum.MoveDirection.Magnitude < 0.1 then
		ponerCorrer(false)
	end

	-- Daño por caída: altura desde la que se cae (en bloques)
	if hum and root then
		local y = root.Position.Y
		local estadoH = hum:GetState()
		local tele = ultimaY and math.abs(y - ultimaY) > 15
		ultimaY = y
		local pies = root.Position / BS
		local enLiquido = Registro.esLiquido(md:get(math.floor(pies.X), math.floor(pies.Y - 1), math.floor(pies.Z)))
		if tele or root.Anchored or volando or enLiquido or estadoH == Enum.HumanoidStateType.Swimming or creativo() then
			alturaCaida = nil
		elseif estadoH == Enum.HumanoidStateType.Freefall or estadoH == Enum.HumanoidStateType.Jumping then
			alturaCaida = math.max(alturaCaida or y, y)
		elseif alturaCaida then
			local bloques = (alturaCaida - y) / BS
			alturaCaida = nil
			if bloques > 3.5 then
				enviar("caida", bloques)
				sonido("caer")
			end
		end
		-- Pasos
		if hum.MoveDirection.Magnitude > 0.1 and hum.FloorMaterial ~= Enum.Material.Air and not agachado then
			tPaso -= dt * (corriendo and 1.3 or 1)
			if tPaso <= 0 then
				tPaso = 0.42
				sonido("paso", nil, 0.9)
			end
		end
	end

	-- Bajo el agua o la lava
	local cam = workspace.CurrentCamera
	if cam then
		local p = cam.CFrame.Position / BS
		local b = md:getSiCargado(math.floor(p.X), math.floor(p.Y), math.floor(p.Z))
		Interfaz.agua(b > 0 and esAgua(b))
		Interfaz.fuego(b > 0 and esLava(b))
	end

	-- Información F3
	if Interfaz.infoVisible() and root then
		local p = root.Position / BS
		local x, y, z = math.floor(p.X), math.floor(p.Y - 1.5), math.floor(p.Z)
		local bio = md:getSiCargado(x, 0, z) >= 0 and md:bioma(x, z) or -1
		local Bi = require(Comp.Datos:WaitForChild("Biomas"))
		Interfaz.info(("Blockverse para Roblox\nXYZ: %d / %d / %d\nChunk: %d, %d\nBioma: %s\nHora: %.1f\nFPS: %d · Render: %s\nSemilla: %d")
			:format(x, y, z, x // 16, z // 16, Bi.nombres and Bi.nombres[bio + 1] or tostring(bio), Lighting.ClockTime, fps, Render.modo, semilla))
	end
end)
