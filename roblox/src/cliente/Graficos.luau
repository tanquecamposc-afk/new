--[[
	Blockverse para Roblox · Gráficos y shaders (cliente)
	· Estilos de imagen («shaders»): Clásico, Vívido, Cinemático, Fantasía, Invierno, Retro,
	  Blanco y negro o sin nada. Cada uno ajusta el bloom, los rayos de sol, el color, el
	  desenfoque lejano y la viñeta. La «fuerza» los suaviza o los exagera.
	· Color según la hora: tonos dorados al amanecer y al atardecer, azulados de noche.
	· Adaptación de los ojos: en cuevas la imagen se aclara un poco y pierde color,
	  bajo el agua se ve azul y borroso, y dentro de la lava, naranja.
	· Partículas del ambiente: motas de polvo de día, luciérnagas de noche, ceniza en el
	  Nether y chispas moradas en el End.
	· Calidad (baja, media, alta, ultra) y distancia de visión, para que vaya bien en móviles.
	Los efectos van en la cámara: solo los ve este jugador y no pisan los del servidor.
]]
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local DE = require(Comp:WaitForChild("DatosEstilo"))

local BS = Config.BLOQUE
local jugador = Players.LocalPlayer
local Graficos = {}
Graficos.md = nil -- datos del mundo (para saber si estás en una cueva o en el agua)
Graficos.dimension = function()
	return "superficie"
end
Graficos.ajustes = { shader = "clasico", calidad = "alta", distancia = Config.RADIO, fuerza = 100, exposicion = 0,
	colorDia = true, vineta = true, profundidad = true, rayosSol = true, particulas = true, nubes = true }
Graficos.alSombras = function(si) end -- para encender o apagar las sombras redondas

local fx = {} -- los efectos propios (en la cámara)
local estado = { cueva = 0, agua = 0, lava = 0, t = 0, mirarT = 0 }

local function color(hex)
	return Color3.fromHex(hex)
end
local BLANCO = Color3.new(1, 1, 1)
local DORADO = Color3.fromRGB(255, 212, 168)
local NOCHE = Color3.fromRGB(186, 204, 255)
local AGUA = Color3.fromRGB(90, 150, 255)
local LAVA = Color3.fromRGB(255, 120, 40)

local function crearEfectos()
	local cam = workspace.CurrentCamera
	if not cam then
		return
	end
	if fx.bloom and fx.bloom.Parent == cam then
		return
	end
	fx.bloom = Instance.new("BloomEffect")
	fx.bloom.Name = "ShaderBloom"
	fx.rayos = Instance.new("SunRaysEffect")
	fx.rayos.Name = "ShaderRayos"
	fx.color = Instance.new("ColorCorrectionEffect")
	fx.color.Name = "ShaderColor"
	fx.dof = Instance.new("DepthOfFieldEffect")
	fx.dof.Name = "ShaderDesenfoque"
	for _, e in { fx.bloom, fx.rayos, fx.color, fx.dof } do
		e.Parent = cam
	end
	-- Los del servidor (en Lighting) se apagan aquí: los sustituyen estos
	for _, c in Lighting:GetChildren() do
		if c:IsA("BloomEffect") or c:IsA("SunRaysEffect") or (c:IsA("ColorCorrectionEffect") and c.Name ~= "Relampago") then
			c.Enabled = false
		end
	end
end

------------------------------------------------------------------
-- Viñeta: cuatro degradados negros en los bordes de la pantalla
------------------------------------------------------------------
local vineta = {}
local function crearVineta()
	local pg = jugador:FindFirstChildOfClass("PlayerGui") or jugador:WaitForChild("PlayerGui", 10)
	if not pg then
		return
	end
	local g = Instance.new("ScreenGui")
	g.Name = "Vineta"
	g.IgnoreGuiInset = true
	g.ResetOnSpawn = false
	g.DisplayOrder = -5
	g.Parent = pg
	vineta.gui = g
	-- {posición, tamaño, giro del degradado}
	for _, b in {
		{ UDim2.fromScale(0, 0), UDim2.fromScale(0.28, 1), 0 },
		{ UDim2.fromScale(0.72, 0), UDim2.fromScale(0.28, 1), 180 },
		{ UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.3), 90 },
		{ UDim2.fromScale(0, 0.7), UDim2.fromScale(1, 0.3), 270 },
	} do
		local f = Instance.new("Frame")
		f.BackgroundColor3 = Color3.new(0, 0, 0)
		f.BorderSizePixel = 0
		f.Position = b[1]
		f.Size = b[2]
		f.Parent = g
		local gr = Instance.new("UIGradient")
		gr.Rotation = b[3]
		gr.Parent = f
		table.insert(vineta, gr)
	end
end
local vinetaActual = -1
local function ponerVineta(v)
	v = math.floor(v * 50 + 0.5) / 50
	if v == vinetaActual or not vineta.gui then
		return
	end
	vinetaActual = v
	vineta.gui.Enabled = v > 0.01
	-- Negro en el borde (más o menos) y transparente hacia el centro
	local seq = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1 - 0.55 * v),
		NumberSequenceKeypoint.new(0.45, 1 - 0.12 * v),
		NumberSequenceKeypoint.new(1, 1),
	})
	for _, gr in ipairs(vineta) do
		gr.Transparency = seq
	end
end

------------------------------------------------------------------
-- Partículas del ambiente alrededor de la cámara
------------------------------------------------------------------
local amb = {}
local TIPOS_PART = {
	polvo = { col = { "#fff6dc", "#fff6dc" }, tam = 0.12, vel = 0.4, vida = { 4, 7 }, ritmo = 5, luz = 0.2, trans = 0.45, acel = Vector3.new(0, 0.05, 0) },
	luciernaga = { col = { "#e8ff60", "#80ff40" }, tam = 0.22, vel = 0.8, vida = { 3, 6 }, ritmo = 6, luz = 1, trans = 0.05, parpadeo = true },
	ceniza = { col = { "#9a8a80", "#ff7030" }, tam = 0.14, vel = 0.6, vida = { 5, 8 }, ritmo = 22, luz = 0.4, trans = 0.2, acel = Vector3.new(0.3, -0.6, 0.2) },
	ender = { col = { "#e080ff", "#6020a0" }, tam = 0.16, vel = 0.5, vida = { 4, 7 }, ritmo = 12, luz = 1, trans = 0.15, acel = Vector3.new(0, 0.4, 0) },
	burbuja = { col = { "#e0f4ff", "#a0d8ff" }, tam = 0.15, vel = 0.3, vida = { 2, 4 }, ritmo = 10, luz = 0.3, trans = 0.3, acel = Vector3.new(0, 2.5, 0) },
}
local function crearParticulas()
	local p = Instance.new("Part")
	p.Name = "ParticulasAmbiente"
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Transparency = 1
	p.Size = Vector3.new(70, 30, 70)
	p.Parent = workspace
	amb.parte = p
	for nombre, T in TIPOS_PART do
		local e = Instance.new("ParticleEmitter")
		e.Name = nombre
		e.Texture = "rbxasset://textures/particles/sparkles_main.dds"
		e.Color = ColorSequence.new(color(T.col[1]), color(T.col[2]))
		e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(0.15, T.tam), NumberSequenceKeypoint.new(0.85, T.tam), NumberSequenceKeypoint.new(1, 0) })
		if T.parpadeo then
			e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.2, T.trans), NumberSequenceKeypoint.new(0.35, 0.7),
				NumberSequenceKeypoint.new(0.5, T.trans), NumberSequenceKeypoint.new(0.7, 0.6), NumberSequenceKeypoint.new(0.85, T.trans), NumberSequenceKeypoint.new(1, 1) })
		else
			e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.2, T.trans), NumberSequenceKeypoint.new(0.8, T.trans), NumberSequenceKeypoint.new(1, 1) })
		end
		e.Lifetime = NumberRange.new(T.vida[1], T.vida[2])
		e.Speed = NumberRange.new(T.vel * 0.3, T.vel)
		e.SpreadAngle = Vector2.new(180, 180)
		e.Acceleration = T.acel or Vector3.zero
		e.LightEmission = T.luz
		e.LightInfluence = 1 - T.luz
		e.RotSpeed = NumberRange.new(-40, 40)
		e.Rate = 0
		e.Parent = p
		amb[nombre] = e
	end
end

------------------------------------------------------------------
-- Lo que se ve cada fotograma
------------------------------------------------------------------
local function mult(a, b)
	return Color3.new(a.R * b.R, a.G * b.G, a.B * b.B)
end
local function campana(x, centro, ancho)
	local d = (x - centro) / ancho
	return math.exp(-d * d)
end

-- ¿Qué hay en el sitio de la cámara y encima? (cada pocos fotogramas)
local function mirarEntorno()
	local md = Graficos.md
	local cam = workspace.CurrentCamera
	if not md or not cam then
		return 0, 0, 0
	end
	local p = cam.CFrame.Position
	local bx, by, bz = math.floor(p.X / BS), math.floor(p.Y / BS), math.floor(p.Z / BS)
	local b = md:getSiCargado(bx, by, bz)
	local agua = (b and b > 0 and Registro.esAgua(b)) and 1 or 0
	local lava = (b and b > 0 and Registro.esLava(b)) and 1 or 0
	-- Cueva: techo de bloques opacos encima y poca altura (mira hasta 24 bloques)
	local techo = 0
	for y = by + 1, by + 24 do
		local o = md:getSiCargado(bx, y, bz)
		if o == nil or o < 0 then
			break
		end
		if o > 0 and Registro.OPACO[o] then
			techo += 1
			if techo >= 3 then
				break
			end
		end
	end
	local cueva = (techo >= 3 and by < 62) and 1 or 0
	return cueva, agua, lava
end

local function paso(dt)
	local A = Graficos.ajustes
	local S = DE.SHADER_ID[A.shader] or DE.SHADER_ID.clasico
	local Q = DE.CALIDAD_ID[A.calidad] or DE.CALIDAD_ID.alta
	crearEfectos()
	if not fx.bloom then
		return
	end
	estado.t += dt
	estado.mirarT -= dt
	if estado.mirarT <= 0 then
		estado.mirarT = 0.25
		estado.objCueva, estado.objAgua, estado.objLava = mirarEntorno()
	end
	local k = math.min(1, dt * 2.5) -- los ojos se acostumbran poco a poco
	estado.cueva += ((estado.objCueva or 0) - estado.cueva) * k * 0.6
	estado.agua += ((estado.objAgua or 0) - estado.agua) * math.min(1, dt * 10)
	estado.lava += ((estado.objLava or 0) - estado.lava) * math.min(1, dt * 10)

	local f = (A.fuerza or 100) / 100 * Q.efectos
	local dim = Graficos.dimension()
	local sup = dim == "superficie"
	-- Hora: dorado al salir y ponerse el sol, azul de noche (solo en la superficie)
	local h = Lighting.ClockTime
	local dorado, noche = 0, 0
	if sup and A.colorDia then
		dorado = math.max(campana(h, 6.6, 1.1), campana(h, 17.6, 1.1)) * S.dia
		noche = (h < 5.2 or h > 18.8) and 1 or ((h < 6.2 and (6.2 - h)) or (h > 17.8 and (h - 17.8)) or 0)
		noche = math.clamp(noche, 0, 1) * S.dia
	end
	-- Bloom
	fx.bloom.Enabled = f > 0 and S.bloom[1] > 0
	fx.bloom.Intensity = S.bloom[1] * f * (1 + dorado * 0.3)
	fx.bloom.Size = S.bloom[2]
	fx.bloom.Threshold = S.bloom[3] - estado.agua * 0.4
	-- Rayos de sol (más fuertes con el sol bajo)
	fx.rayos.Enabled = A.rayosSol and f > 0 and S.rayos[1] > 0 and sup and estado.cueva < 0.5
	fx.rayos.Intensity = (S.rayos[1] + dorado * 0.12) * math.min(f, 1.3)
	fx.rayos.Spread = S.rayos[2]
	-- Color
	local cc = S.color
	local tinte = color(cc[4])
	tinte = tinte:Lerp(BLANCO, 1 - math.clamp(f, 0, 1))
	tinte = tinte:Lerp(mult(tinte, DORADO), dorado * 0.55)
	tinte = tinte:Lerp(mult(tinte, NOCHE), noche * 0.5)
	tinte = tinte:Lerp(Color3.fromRGB(215, 220, 235), estado.cueva * 0.35)
	tinte = tinte:Lerp(AGUA, estado.agua * 0.75)
	tinte = tinte:Lerp(LAVA, estado.lava * 0.85)
	fx.color.Enabled = true
	fx.color.TintColor = tinte
	fx.color.Brightness = cc[1] * f + (A.exposicion or 0) * 0.025 + estado.cueva * 0.06 - noche * 0.02 * f
	fx.color.Contrast = cc[2] * f + estado.cueva * 0.05 + estado.agua * 0.05
	fx.color.Saturation = cc[3] * f - estado.cueva * 0.15 + dorado * 0.08 * f - estado.agua * 0.1
	-- Desenfoque: lo lejano según el estilo, y todo un poco bajo el agua
	local dof = A.profundidad and S.dof * f or 0
	fx.dof.Enabled = (dof > 0.01 or estado.agua > 0.05 or estado.lava > 0.05) and Q.efectos > 0
	fx.dof.FarIntensity = math.max(dof, estado.agua * 0.6, estado.lava * 0.8)
	fx.dof.FocusDistance = 40 * (1 - estado.agua * 0.9)
	fx.dof.InFocusRadius = 60 * (1 - estado.agua * 0.85) + 10
	fx.dof.NearIntensity = estado.agua * 0.3
	-- Viñeta (más cerrada bajo el agua y en cuevas)
	ponerVineta(A.vineta and math.clamp(S.vineta * math.min(f, 1.2) + estado.cueva * 0.15 + estado.agua * 0.3, 0, 1) or estado.agua * 0.3)
	-- Partículas alrededor de la cámara
	local cam = workspace.CurrentCamera
	if amb.parte and cam then
		amb.parte.CFrame = CFrame.new(cam.CFrame.Position)
		local m = A.particulas and Q.particulas or 0
		local tipo
		if estado.agua > 0.5 then
			tipo = "burbuja"
		elseif dim == "nether" then
			tipo = "ceniza"
		elseif dim == "end" then
			tipo = "ender"
		elseif sup and estado.cueva < 0.5 then
			tipo = noche > 0.5 and "luciernaga" or "polvo"
		end
		for nombre, T in TIPOS_PART do
			local e = amb[nombre]
			e.Rate = (nombre == tipo) and T.ritmo * m or 0
		end
	end
end

-- Lo que no cambia cada fotograma: distancia de visión, nubes y sombras redondas
function Graficos.aplicar()
	local A = Graficos.ajustes
	local Q = DE.CALIDAD_ID[A.calidad] or DE.CALIDAD_ID.alta
	Config.RADIO = math.clamp(math.floor(A.distancia or 5), 2, 8)
	Graficos.alSombras(Q.sombras)
	estado.mirarT = 0
end

function Graficos.iniciar()
	crearEfectos()
	crearVineta()
	crearParticulas()
	Graficos.aplicar()
	RunService.RenderStepped:Connect(paso)
	-- Las nubes se pueden quitar (solo en la superficie: el Nether y el End ya las quitan)
	task.spawn(function()
		while true do
			task.wait(0.5)
			local nubes = workspace.Terrain:FindFirstChildOfClass("Clouds")
			if nubes and Graficos.dimension() == "superficie" then
				nubes.Enabled = Graficos.ajustes.nubes ~= false
			end
		end
	end)
end

return Graficos
