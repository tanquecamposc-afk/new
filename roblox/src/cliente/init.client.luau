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
local DimensionVista = require(script:WaitForChild("DimensionVista"))
local Generador = require(Comp:WaitForChild("Generador"))
local Arenas = require(Comp:WaitForChild("Arenas"))
task.spawn(Arenas.escuchar) -- arenas de Mazmorras y Leyendas que anuncia el servidor
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
	snd.Volume = s[2] * (Interfaz.ajustes.volumen or 100) / 100
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
		if typeof(c) == "table" and #c > 0 then
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
DimensionVista.md = md
DimensionVista.iniciar()
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
	local criaturas = workspace:WaitForChild("Criaturas")
	while true do
		local lista = { criaturas }
		for _, o in Players:GetPlayers() do
			if o ~= jugador and o.Character then
				table.insert(lista, o.Character)
			end
		end
		filtroMobs.FilterDescendantsInstances = lista
		task.wait(1)
	end
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
	-- Cohete mientras se planea con élitros
	if id == Registro.I.cohete and est.planeando then
		if inicio then
			est.coheteT = 1.5
			enviar("cohete")
		end
		return
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
	local ef = est.efectos or {}
	if ef.rapidez then
		v *= 1 + 0.2 * (ef.rapidez.n or 1)
	end
	if ef.lentitud then
		v *= math.max(0.2, 1 - 0.15 * (ef.lentitud.n or 1))
	end
	hum.WalkSpeed = v * BS
	-- Supersalto: medio bloque más por nivel
	hum.JumpHeight = (1.25 + (ef.salto and 0.5 * (ef.salto.n or 1) or 0)) * BS + 0.4
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
	Interfaz.enJuego = true
	if m == "oneblock" then
		enviar("modoJuego", "oneblock")
		enviar("modo", "supervivencia")
	elseif m == "bedwars" or m == "mazmorras" or m == "leyendas" then
		enviar("modoJuego", m)
	else
		if jugador:GetAttribute("OneBlock") or jugador:GetAttribute("BedWars") or jugador:GetAttribute("Mazmorras") or jugador:GetAttribute("Leyendas") then
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
		local leyendas = jugador:GetAttribute("Leyendas") == true and not Interfaz.menuVisible() and not Interfaz.abierto()
		if leyendas and n >= 1 and n <= 6 then
			-- Leyendas: 1-6 construyen (como en el web)
			enviar("modoCmd", "construir", n)
		elseif k == Enum.KeyCode.G and jugador:GetAttribute("BedWars") == true and not Interfaz.menuVisible() and not Interfaz.abierto() then
			-- Bed Wars: habilidad del kit
			enviar("modoCmd", "habilidad")
		elseif leyendas and (k == Enum.KeyCode.G or k == Enum.KeyCode.R or (k == Enum.KeyCode.F and not creativo())) then
			enviar("modoCmd", k == Enum.KeyCode.G and "cosechar" or (k == Enum.KeyCode.R and "atacar" or "seguir"))
		elseif k == Enum.KeyCode.M and not Interfaz.abierto() then
			-- Menú de modos de juego
			Interfaz.menu(not Interfaz.menuVisible())
			aplicarCamara()
		elseif n >= 1 and n <= 9 and not Interfaz.menuVisible() then
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
		if k == Enum.KeyCode.Space and not bloqueado then
			est.pedirPlaneo = true
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
------------------------------------------------------------------
-- Bed Wars: kits que se notan al moverse, habilidad, espectador, compañeros y efectos
------------------------------------------------------------------
local kitBW = nil -- {id, v, act}
local saltosExtra = 0
local saltoAireT = 0 -- JumpRequest se repite al mantener la tecla: entre saltos en el aire hay una pausa
local espectando = nil

-- Los impulsos vienen en bloques/s con la gravedad del juego web (32 bloques/s²)
local function vRoblox(v)
	return v * math.sqrt(workspace.Gravity * BS / 32)
end

local function impulso(tipo, fuerza)
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not root or not hum then
		return
	end
	if tipo == "embestida" then
		local cam = workspace.CurrentCamera
		local mira = cam and cam.CFrame.LookVector or root.CFrame.LookVector
		local dir = Vector3.new(mira.X, 0, mira.Z)
		dir = dir.Magnitude > 0.01 and dir.Unit or root.CFrame.LookVector
		hum:ChangeState(Enum.HumanoidStateType.Jumping)
		sonido("arco", root.Position, 1.6)
		task.spawn(function()
			local t0 = os.clock()
			while os.clock() - t0 < 0.25 and root.Parent do
				root.AssemblyLinearVelocity = dir * fuerza * BS + Vector3.new(0, 4 * BS, 0)
				emitir(root.Position, Color3.fromRGB(200, 200, 255), 2, 1, 0.1, 0)
				task.wait()
			end
		end)
	else
		hum:ChangeState(Enum.HumanoidStateType.Jumping)
		local v = root.AssemblyLinearVelocity
		root.AssemblyLinearVelocity = Vector3.new(v.X, vRoblox(fuerza), v.Z)
		emitir(root.Position - Vector3.new(0, 2.5 * BS / 3, 0), Color3.fromRGB(230, 230, 230), 10, 3, 0.1, 4)
	end
end

-- Doble salto (Saltarín): Espacio otra vez en el aire
local ultimoJR = 0
UserInputService.JumpRequest:Connect(function()
	-- Mantener Espacio repite el evento cada fotograma: solo cuenta una pulsación nueva
	local ahoraJR = os.clock()
	local seguido = ahoraJR - ultimoJR < 0.15
	ultimoJR = ahoraJR
	if seguido or not kitBW or kitBW.id ~= "saltarin" then
		return
	end
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not root or not hum or hum.Health <= 0 or hum.FloorMaterial ~= Enum.Material.Air then
		return
	end
	if saltosExtra > 0 and root.AssemblyLinearVelocity.Y < vRoblox(4) and os.clock() - saltoAireT > 0.25 then
		saltosExtra -= 1
		saltoAireT = os.clock()
		local v = root.AssemblyLinearVelocity
		root.AssemblyLinearVelocity = Vector3.new(v.X, math.sqrt(2 * workspace.Gravity * 1.3 * BS), v.Z)
		emitir(root.Position - Vector3.new(0, BS * 0.8, 0), Color3.fromRGB(255, 255, 255), 8, 2, 0.1, 2)
		sonido("paso", root.Position, 1.4)
	end
end)

-- Cada fotograma: recarga del doble salto, planear, compañeros resaltados y cámara de espectador
local tCompas = 0
RunService.Heartbeat:Connect(function(dt)
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if kitBW and root and hum and hum.Health > 0 then
		if hum.FloorMaterial ~= Enum.Material.Air then
			saltosExtra = kitBW.v and kitBW.v.extra or 1
		end
		if kitBW.id == "planeador" and hum.FloorMaterial == Enum.Material.Air and (UserInputService:IsKeyDown(Enum.KeyCode.Space) or hum.Jump) then
			local v = root.AssemblyLinearVelocity
			local max = -(kitBW.v and kitBW.v.caida or 2) * BS
			if v.Y < max then
				root.AssemblyLinearVelocity = Vector3.new(v.X, max, v.Z)
			end
		end
	end
	tCompas -= dt
	if tCompas <= 0 then
		tCompas = 0.5
		local mio = jugador:GetAttribute("EquipoBW")
		for _, otro in Players:GetPlayers() do
			local och = otro.Character
			if otro ~= jugador and och then
				local hl = och:FindFirstChild("CompaneroBW")
				local es = mio ~= nil and otro:GetAttribute("EquipoBW") == mio
				if es and not hl then
					hl = Instance.new("Highlight")
					hl.Name = "CompaneroBW"
					hl.FillTransparency = 1
					hl.OutlineTransparency = 0.1
					hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
					local ok, c = pcall(Color3.fromHex, otro:GetAttribute("ColorBW") or "#ffffff")
					hl.OutlineColor = ok and c or Color3.new(1, 1, 1)
					hl.Parent = och
				elseif not es and hl then
					hl:Destroy()
				end
			end
		end
	end
	-- Si el jugador al que miramos ya no está, la cámara vuelve
	if espectando and not espectando.Parent then
		espectando = nil
		local h = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
		if workspace.CurrentCamera and h then
			workspace.CurrentCamera.CameraSubject = h
		end
		aplicarCamara()
	end
end)

local function colorHex(n)
	return Color3.fromRGB(n // 65536, (n // 256) % 256, n % 256)
end
local function efectoBaja(tipo, pos)
	if tipo == "fuegos" then
		sonido("explosion", pos, 1.8)
		for k = 0, 2 do
			task.delay(k * 0.25, function()
				local p = pos + Vector3.new((math.random() - 0.5) * 2, 3 + k, (math.random() - 0.5) * 2) * BS
				emitir(p, { colorHex(0xff5555), colorHex(0x55ff55), colorHex(0x5599ff), colorHex(0xffff55) }, 30, 8, 0.12, 1)
			end)
		end
	elseif tipo == "corazones" then
		sonido("xp", pos, 0.8)
		emitir(pos + Vector3.new(0, BS, 0), { colorHex(0xff6fae), colorHex(0xff2e7a) }, 30, 2, 0.18, -3)
	elseif tipo == "rayo" then
		sonido("explosion", pos, 0.6)
		local r = Instance.new("Part")
		r.Anchored = true
		r.CanCollide = false
		r.CanQuery = false
		r.Material = Enum.Material.Neon
		r.Color = Color3.fromRGB(200, 220, 255)
		r.Size = Vector3.new(0.4 * BS, 40 * BS, 0.4 * BS)
		r.CFrame = CFrame.new(pos + Vector3.new(0, 20 * BS, 0))
		r.Parent = workspace
		local l = Instance.new("PointLight")
		l.Brightness = 6
		l.Range = 20 * BS
		l.Parent = r
		emitir(pos, colorHex(0xddeeff), 25, 6, 0.1, 6)
		task.delay(0.35, function()
			r:Destroy()
		end)
	elseif tipo == "fantasma" then
		sonido("dano", pos, 0.6)
		emitir(pos + Vector3.new(0, BS, 0), { colorHex(0xffffff), colorHex(0xbbccff) }, 35, 1.2, 0.2, -4)
	elseif tipo == "confeti" then
		sonido("nivel", pos, 1.2)
		emitir(pos + Vector3.new(0, 2 * BS, 0), { colorHex(0xff5555), colorHex(0xffd84a), colorHex(0x55ff55), colorHex(0x55aaff), colorHex(0xff77dd) }, 60, 7, 0.1, 5)
	end
end

local function espectar(ch)
	local cam = workspace.CurrentCamera
	local h = ch and ch:FindFirstChildOfClass("Humanoid")
	if h and cam then
		espectando = ch
		jugador.CameraMode = Enum.CameraMode.Classic
		jugador.CameraMinZoomDistance = 12
		jugador.CameraMaxZoomDistance = 30
		cam.CameraSubject = h
		Interfaz.mostrarMano(false)
	else
		espectando = nil
		local mio = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
		if cam and mio then
			cam.CameraSubject = mio
		end
		aplicarCamara()
	end
end
Interfaz.alMenu = aplicarCamara

-- Números de daño que saltan al golpear (amarillos y con «!» si es crítico)
local numerosVivos = 0
local function numeroDano(pos, dano, critico)
	if numerosVivos > 12 or not Interfaz.ajustes.numeros then
		return
	end
	numerosVivos += 1
	local ancla = Instance.new("Part")
	ancla.Anchored = true
	ancla.CanCollide = false
	ancla.CanQuery = false
	ancla.CanTouch = false
	ancla.Transparency = 1
	ancla.Size = Vector3.new(0.2, 0.2, 0.2)
	ancla.Position = pos + Vector3.new((math.random() - 0.5) * 0.6 * BS, 0.4 * BS, (math.random() - 0.5) * 0.6 * BS)
	ancla.Parent = workspace
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromOffset(80, 30)
	g.AlwaysOnTop = true
	g.LightInfluence = 0
	g.MaxDistance = 60 * BS
	g.Parent = ancla
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.fromScale(1, 1)
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	l.Text = ("%g%s"):format(math.floor(dano * 10 + 0.5) / 10, critico and "!" or "")
	l.TextColor3 = critico and Color3.fromRGB(255, 220, 60) or Color3.fromRGB(255, 255, 255)
	l.TextStrokeTransparency = 0.2
	l.Parent = g
	task.spawn(function()
		local t0 = os.clock()
		local p0 = ancla.Position
		while os.clock() - t0 < 0.7 and ancla.Parent do
			local e = (os.clock() - t0) / 0.7
			ancla.Position = p0 + Vector3.new(0, e * 1.2 * BS, 0)
			l.TextTransparency = math.max(0, e * 1.6 - 0.6)
			l.TextStrokeTransparency = math.max(0.2, e * 1.6 - 0.6)
			task.wait()
		end
		ancla:Destroy()
		numerosVivos -= 1
	end)
end

------------------------------------------------------------------
-- Ajustes del jugador y cámara
------------------------------------------------------------------
local ajustes = Interfaz.ajustes
local function aplicarAjustes()
	UserInputService.MouseDeltaSensitivity = ajustes.sensibilidad
end
local envioAjustes = 0
Interfaz.alCambiarAjuste = function()
	aplicarAjustes()
	-- Se guardan en el servidor (un poco después, por si se pulsan varias veces seguidas)
	envioAjustes += 1
	local yo = envioAjustes
	task.delay(1, function()
		if yo == envioAjustes then
			enviar("ajustes", ajustes)
		end
	end)
end
aplicarAjustes()

-- Tercera persona con ratón (PC): la cámara gira con el ratón sin mantener el clic derecho,
-- el personaje mira hacia donde apunta la cámara y la cámara no se mete dentro de los bloques.
-- En móvil se usa la cámara normal de Roblox.
local camYaw, camPitch = 0, -0.3
local camPropia = false
local function puedeCamaraPropia()
	return UserInputService.MouseEnabled and not (UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled)
end
RunService:BindToRenderStep("CamaraBlockverse", Enum.RenderPriority.Camera.Value + 1, function(dt)
	local cam = workspace.CurrentCamera
	if not cam then
		return
	end
	local ch = jugador.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	local cab = ch and ch:FindFirstChild("Head")
	local quiero = tercera and not espectando and puedeCamaraPropia() and root and hum and cab and hum.Health > 0
	if not quiero then
		if camPropia then
			camPropia = false
			cam.CameraType = Enum.CameraType.Custom
			if hum then
				hum.AutoRotate = true
			end
		end
	else
		if not camPropia then
			camPropia = true
			cam.CameraType = Enum.CameraType.Scriptable
			local look = cam.CFrame.LookVector
			camYaw = math.atan2(-look.X, -look.Z)
			camPitch = math.clamp(math.asin(math.clamp(look.Y, -1, 1)), -1.3, 1.2)
		end
		local libre = Interfaz.abierto() or Interfaz.menuVisible()
		if libre then
			UserInputService.MouseBehavior = Enum.MouseBehavior.Default
		else
			UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
			local d = UserInputService:GetMouseDelta()
			camYaw -= d.X * 0.0045
			camPitch = math.clamp(camPitch - d.Y * 0.0045, -1.3, 1.2)
			hum.AutoRotate = false
			root.CFrame = CFrame.new(root.Position) * CFrame.Angles(0, camYaw, 0)
		end
		local giro = CFrame.Angles(0, camYaw, 0) * CFrame.Angles(camPitch, 0, 0)
		local foco = cab.Position + Vector3.new(0, 0.25 * BS, 0) + giro.RightVector * 0.35 * BS
		local atras = -giro.LookVector
		local dist = 4.6
		local r = Rayo.lanzar(md, foco, atras, dist)
		if r and r.t then
			dist = math.max(0.4, r.t - 0.3)
		end
		cam.CFrame = CFrame.new(foco + atras * dist * BS) * giro
	end
	-- Campo de visión: el de los ajustes, un poco más abierto al correr (suave)
	local objetivoFov = ajustes.fov
	if ajustes.fovCorrer and corriendo and hum and hum.MoveDirection.Magnitude > 0.1 then
		objetivoFov *= 1.12
	end
	cam.FieldOfView += (objetivoFov - cam.FieldOfView) * math.min(1, dt * 10)
end)

------------------------------------------------------------------
-- Modelos 3D: la mano en primera persona y el objeto en la mano de los personajes
------------------------------------------------------------------
local Modelos3D = require(script:WaitForChild("Modelos3D"))
if Modelos3D.disponible() then
	Interfaz.mano3D = true
	Modelos3D.iniciarMano({
		enMano = function()
			return (enMano())
		end,
		visible = Interfaz.manoVisible,
		balanceo = Interfaz.balanceoMano,
		conBalanceo = function()
			return Interfaz.ajustes.balanceo
		end,
	})
	aplicarCamara()
end
Modelos3D.iniciarPersonajes(function()
	return tercera
end)

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
		if typeof(a) == "Vector3" and type(b) == "number" and b > 0 then
			numeroDano(a, b, c == true)
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
	elseif tipo == "viaje" then
		-- Cambio de dimensión o portal: pantalla de carga hasta que se vea el sitio
		est.viajando = true
		Interfaz.cerrar()
		Interfaz.carga(0.5, a and ("Entrando en " .. a .. "…") or "Viajando…")
	elseif tipo == "jefe" then
		Interfaz.jefe(a)
	elseif tipo == "panel" then
		Interfaz.panel(a)
	elseif tipo == "cerrarUI" then
		-- El servidor cierra la pantalla (alguien rompió el cofre que tenías abierto)
		if Interfaz.abierto() then
			Interfaz.cerrar()
		end
	elseif tipo == "menu" then
		Interfaz.menu(true)
		aplicarCamara()
	elseif tipo == "ajustes" then
		-- Los ajustes guardados llegan al entrar
		if type(a) == "table" then
			for k, v in a do
				if Interfaz.ajustes[k] ~= nil and type(v) == type(Interfaz.ajustes[k]) then
					Interfaz.ajustes[k] = v
				end
			end
			aplicarAjustes()
			Interfaz.pintarAjustes()
		end
	elseif tipo == "feed" then
		Interfaz.feed(a and a.t, a and a.c)
	elseif tipo == "finBW" then
		Interfaz.finBW(a)
		if a then
			sonido(a.gano and "nivel" or "dano")
			if a.gano then
				local root = jugador.Character and jugador.Character:FindFirstChild("HumanoidRootPart")
				if root then
					efectoBaja("confeti", root.Position)
				end
			end
		end
	elseif tipo == "kitBW" then
		kitBW = a
		saltosExtra = 0
		Interfaz.botonHabilidad(a ~= nil and a.act == true, function()
			enviar("modoCmd", "habilidad")
		end)
	elseif tipo == "impulso" then
		impulso(a, b or 10)
	elseif tipo == "habilidad" then
		local root = jugador.Character and jugador.Character:FindFirstChild("HumanoidRootPart")
		if root then
			emitir(root.Position, Color3.fromRGB(255, 220, 80), 14, 4, 0.1, 2)
		end
	elseif tipo == "efectoBaja" then
		if typeof(b) == "Vector3" then
			efectoBaja(a, b)
		end
	elseif tipo == "espectar" then
		espectar(a)
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

	-- Fin de un viaje entre dimensiones
	if est.viajando and root and not root.Anchored and Render.listoEn(root.Position) then
		est.viajando = false
		Interfaz.carga(nil)
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

	-- Planear con élitros (fisicaEspecial del juego web)
	if hum and root then
		local pecho = est.inv[38]
		local tiene = pecho and pecho.id == Registro.I.elitros and (pecho.dur or 2) > 1
		local pies = root.Position / BS
		local bAgua = md:getSiCargado(math.floor(pies.X), math.floor(pies.Y - 1), math.floor(pies.Z))
		local enAgua = bAgua > 0 and Registro.esLiquido(bAgua)
		local enAire = hum.FloorMaterial == Enum.Material.Air
		if est.pedirPlaneo then
			est.pedirPlaneo = false
			if not est.planeando and tiene and enAire and not volando and not enAgua and root.AssemblyLinearVelocity.Y < 0 then
				est.planeando = true
				est.acumPlaneo = 0
				est.velPlaneo = root.AssemblyLinearVelocity / BS / 20
				est.fuerzaPlaneo = Instance.new("BodyVelocity")
				est.fuerzaPlaneo.MaxForce = Vector3.new(1e7, 1e7, 1e7)
				est.fuerzaPlaneo.P = 6000
				est.fuerzaPlaneo.Velocity = root.AssemblyLinearVelocity
				est.fuerzaPlaneo.Parent = root
				est.planeoT = 0
			end
		end
		if est.planeando then
			if not tiene or not enAire or enAgua or volando or not est.fuerzaPlaneo or not est.fuerzaPlaneo.Parent then
				est.planeando = false
				if est.fuerzaPlaneo then
					est.fuerzaPlaneo:Destroy()
					est.fuerzaPlaneo = nil
				end
			else
				local cam = workspace.CurrentCamera
				local look = cam.CFrame.LookVector
				local pitch = math.asin(math.clamp(look.Y, -1, 1))
				local cp = math.cos(pitch)
				local h = math.sqrt(look.X ^ 2 + look.Z ^ 2)
				local lx, ly, lz = (h > 0 and look.X / h or 0) * cp, math.sin(pitch), (h > 0 and look.Z / h or 0) * cp
				local f = -pitch
				local v = est.velPlaneo
				local vx, vy, vz = v.X, v.Y, v.Z
				est.acumPlaneo += dt
				est.coheteT = math.max(0, (est.coheteT or 0) - dt)
				while est.acumPlaneo >= 0.05 do
					est.acumPlaneo -= 0.05
					local d = math.sqrt(lx * lx + lz * lz)
					local d1 = math.sqrt(vx * vx + vz * vz)
					local f1 = math.cos(f) ^ 2
					vy += -0.08 + f1 * 0.06
					if vy < 0 and d > 0 then
						local d5 = vy * -0.1 * f1
						vx += lx * d5 / d
						vy += d5
						vz += lz * d5 / d
					end
					if f < 0 and d > 0 then
						local d9 = d1 * -math.sin(f) * 0.04
						vx += -lx * d9 / d
						vy += d9 * 3.2
						vz += -lz * d9 / d
					end
					if d > 0 then
						vx += (lx / d * d1 - vx) * 0.1
						vz += (lz / d * d1 - vz) * 0.1
					end
					vx *= 0.99
					vy *= 0.98
					vz *= 0.99
					if est.coheteT > 0 then
						vx += lx * 0.1 + (lx * 1.5 - vx) * 0.5
						vy += ly * 0.1 + (ly * 1.5 - vy) * 0.5
						vz += lz * 0.1 + (lz * 1.5 - vz) * 0.5
					end
				end
				est.velPlaneo = Vector3.new(vx, vy, vz)
				est.fuerzaPlaneo.Velocity = est.velPlaneo * 20 * BS
				if est.coheteT > 0 and math.random() < dt * 30 then
					emitir(root.Position - Vector3.new(0, 1, 0), { Color3.fromRGB(255, 224, 112), Color3.fromRGB(255, 128, 48) }, 1, 0.8, 0.08, 0)
				end
				-- Desgaste de los élitros (1 por segundo en supervivencia)
				est.planeoT += dt
				if est.planeoT >= 1 then
					est.planeoT = 0
					enviar("planeo")
				end
			end
		end
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
		local Dm = require(Comp:WaitForChild("Dimensiones"))
		local dim, zl = Generador.dimensionBloque(z)
		local nomBio = bio >= 120 and "El End" or bio >= 100 and (Dm.NOMBRES_BIOMA_NETHER[bio - 99] or "Nether") or (Bi.nombres and Bi.nombres[bio + 1] or tostring(bio))
		local nomDim = ({ superficie = "Superficie", nether = "El Nether", ["end"] = "El End", vacio = "One Block" })[dim] or dim
		Interfaz.info(("Blockverse para Roblox\nDimensión: %s\nXYZ: %d / %d / %d\nChunk: %d, %d\nBioma: %s\nHora: %.1f\nFPS: %d · Render: %s\nSemilla: %d")
			:format(nomDim, x, y, zl, x // 16, zl // 16, nomBio, Lighting.ClockTime, fps, Render.modo, semilla))
	end
end)
