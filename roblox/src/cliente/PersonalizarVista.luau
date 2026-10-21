--[[
	Blockverse para Roblox · Personalizar (cliente)
	Ventana con cuatro pestañas: Capas, Sombreros, Mascotas y Mira.
	· Cada tarjeta enseña el cosmético de frente (dibujado con cajas), su nombre y si está
	  puesto, si se puede poner o qué nivel del Camino (o VIP) hace falta.
	· La mira se elige por forma y color y se ve al momento.
	Lo que eliges lo comprueba y lo guarda el servidor (Progreso); la mira va en los ajustes.
]]
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local DE = require(Comp:WaitForChild("DatosEstilo"))
local Cos = require(script.Parent:WaitForChild("Cosmeticos"))

local jugador = Players.LocalPlayer
local PV = {}
PV.enviar = function(...) end
PV.alSonido = function(nombre, tono) end
PV.alVisible = function(si) end
PV.ajustes = { mira = "cruz", colorMira = "blanco" }
PV.alCambiarAjuste = function(k, v) end

local FT = require(Comp:WaitForChild("Fuentes"))
local FUENTE = FT.TEXTO
local FUENTE_N = FT.CABECERA
local TURQUESA = Color3.fromRGB(40, 200, 190)
local VERDE = Color3.fromRGB(60, 180, 80)
local ORO = Color3.fromRGB(255, 200, 60)
local FONDO = Color3.fromRGB(22, 32, 40)
local TARJETA = Color3.fromRGB(36, 48, 58)
local GRIS = Color3.fromRGB(70, 74, 88)

local function nuevo(clase, props, padre)
	local o = Instance.new(clase)
	for k, v in props do
		o[k] = v
	end
	if padre then
		o.Parent = padre
	end
	return o
end
local function texto(props, padre)
	local t = nuevo("TextLabel", { BackgroundTransparency = 1, Font = FUENTE, TextColor3 = Color3.new(1, 1, 1), TextSize = 16, TextStrokeTransparency = 0.6 }, padre)
	for k, v in props do
		t[k] = v
	end
	if t.Font == FT.TITULO and t.TextStrokeTransparency < 1 then
		FT.contorno(t, t.TextStrokeColor3, math.max(2, math.floor(t.TextSize / 16)))
	end
	return t
end
local function esquina(o, r)
	nuevo("UICorner", { CornerRadius = UDim.new(0, r or 8) }, o)
end
local function limpiar(f)
	for _, h in f:GetChildren() do
		if h:IsA("GuiObject") then
			h:Destroy()
		end
	end
end

------------------------------------------------------------------
-- Ventana
------------------------------------------------------------------
local gui = nuevo("ScreenGui", { Name = "Personalizar", ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 30, ZIndexBehavior = Enum.ZIndexBehavior.Sibling })
local velo = nuevo("TextButton", { Name = "Velo", BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.35, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1),
	Text = "", AutoButtonColor = false, Modal = true, Visible = false }, gui)
local ventana = nuevo("Frame", { Name = "Ventana", AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(880, 560),
	BackgroundColor3 = FONDO, BorderSizePixel = 0 }, velo)
esquina(ventana, 14)
nuevo("UIStroke", { Color = TURQUESA, Thickness = 3 }, ventana)
local escVentana = nuevo("UIScale", {}, ventana)
local function ajustar()
	local cam = workspace.CurrentCamera
	local v = cam and cam.ViewportSize
	if v and v.X and v.X > 0 then
		return math.min(1, (v.X - 20) / 880, (v.Y - 20) / 560)
	end
	return 1
end

local cab = nuevo("Frame", { BackgroundColor3 = TURQUESA, BorderSizePixel = 0, Size = UDim2.new(1, 0, 0, 70) }, ventana)
esquina(cab, 14)
nuevo("UIGradient", { Rotation = 0, Color = ColorSequence.new(Color3.fromRGB(60, 220, 200), Color3.fromRGB(60, 120, 230)) }, cab)
nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(50, 150, 215), BorderSizePixel = 0, Position = UDim2.new(0, 0, 1, -14), Size = UDim2.new(1, 0, 0, 14) }, cab)
texto({ Position = UDim2.fromOffset(22, 8), Size = UDim2.fromOffset(500, 34), Text = "PERSONALIZAR", TextSize = 36, Font = FT.TITULO, TextXAlignment = Enum.TextXAlignment.Left,
	TextStrokeColor3 = Color3.fromRGB(10, 60, 80), TextStrokeTransparency = 0 }, cab)
local subT = texto({ Position = UDim2.fromOffset(22, 42), Size = UDim2.fromOffset(620, 18), Text = "", TextSize = 14,
	TextColor3 = Color3.fromRGB(220, 250, 255), TextStrokeTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left }, cab)
local cerrar = nuevo("TextButton", { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -14, 0.5, 0), Size = UDim2.fromOffset(44, 44), BackgroundColor3 = Color3.fromRGB(200, 60, 60),
	BorderSizePixel = 0, Text = "✕", Font = FUENTE_N, TextSize = 22, TextColor3 = Color3.new(1, 1, 1) }, cab)
esquina(cerrar, 22)

local PESTANAS = { { "capa", "Capas" }, { "sombrero", "Sombreros" }, { "mascota", "Mascotas" }, { "mira", "Mira" } }
local filaPest = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(20, 80), Size = UDim2.new(1, -40, 0, 38) }, ventana)
nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }, filaPest)
local botonesPest = {}
local cuerpo = nuevo("ScrollingFrame", { BackgroundTransparency = 1, BorderSizePixel = 0, Position = UDim2.fromOffset(20, 128), Size = UDim2.new(1, -40, 1, -164),
	ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y }, ventana)
texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -8), Size = UDim2.new(1, -40, 0, 20), TextSize = 12,
	TextColor3 = Color3.fromRGB(160, 175, 185), TextStrokeTransparency = 1,
	Text = "Todos ven tu capa, tu sombrero y tu mascota. Sube el Camino de Blockverse (tecla P) para desbloquear más." }, ventana)

local datos, pestana = nil, "capa"
local pintar

for i, p in PESTANAS do
	local b = nuevo("TextButton", { Size = UDim2.fromOffset(150, 38), BackgroundColor3 = TARJETA, BorderSizePixel = 0, Text = p[2], Font = FUENTE_N,
		TextSize = 16, TextColor3 = Color3.new(1, 1, 1), LayoutOrder = i, AutoButtonColor = true }, filaPest)
	esquina(b, 19)
	b.Activated:Connect(function()
		pestana = p[1]
		PV.alSonido("poner", 1.3)
		pintar()
	end)
	botonesPest[p[1]] = b
end

------------------------------------------------------------------
-- Dibujos de frente
------------------------------------------------------------------
local function dibujoCapa(padre, c, ancho, alto)
	local base = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(ancho, alto),
		BackgroundColor3 = Color3.fromHex(c.base), BorderSizePixel = 0, ZIndex = 3 }, padre)
	nuevo("UIStroke", { Color = Color3.new(0, 0, 0), Thickness = 2, Transparency = 0.5 }, base)
	for _, d in Cos.rectangulosCapa(c) do
		local col = type(d[5]) == "string" and Color3.fromHex(d[5]) or d[5]
		nuevo("Frame", { Position = UDim2.fromScale(d[1], d[2]), Size = UDim2.fromScale(d[3] - d[1], d[4] - d[2]), BackgroundColor3 = col,
			BorderSizePixel = 0, ZIndex = 4 }, base)
	end
	-- Los hombros (de dónde cuelga)
	nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 0, 2), Size = UDim2.new(1, 8, 0, 6), BackgroundColor3 = Color3.fromRGB(60, 60, 70),
		BorderSizePixel = 0, ZIndex = 5 }, base)
end

local function dibujoSombrero(padre, s, escala)
	local zona = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 14), Size = UDim2.fromOffset(10, 10), BackgroundTransparency = 1, ZIndex = 3 }, padre)
	-- Una cabeza de muestra debajo
	local cara = { { { 1, 1, 1 }, { 0, -0.5, 0.6 }, "#e0b088" }, { { 0.14, 0.14, 0.02 }, { -0.2, -0.45, -0.51 }, "#2a3a6a" },
		{ { 0.14, 0.14, 0.02 }, { 0.2, -0.45, -0.51 }, "#2a3a6a" }, { { 0.3, 0.06, 0.02 }, { 0, -0.75, -0.51 }, "#a06048" } }
	local todo = {}
	for _, b in cara do
		table.insert(todo, b)
	end
	for _, b in s.cajas do
		table.insert(todo, b)
	end
	Cos.dibujarFrente(zona, todo, escala, 4)
end

local function dibujoMascota(padre, m, escala)
	local zona = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(10, 10), BackgroundTransparency = 1, ZIndex = 3 }, padre)
	Cos.dibujarFrente(zona, m.cajas, escala, 4)
end

------------------------------------------------------------------
-- Tarjetas
------------------------------------------------------------------
local function tarjeta(padre, orden, color)
	local f = nuevo("Frame", { BackgroundColor3 = TARJETA, BorderSizePixel = 0, LayoutOrder = orden }, padre)
	esquina(f, 12)
	local borde = nuevo("UIStroke", { Color = color, Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, f)
	local esc = nuevo("UIScale", {}, f)
	f.MouseEnter:Connect(function()
		TweenService:Create(esc, TweenInfo.new(0.15, Enum.EasingStyle.Back), { Scale = 1.04 }):Play()
		borde.Color = Color3.new(1, 1, 1)
		PV.alSonido("paso", 1.8)
	end)
	f.MouseLeave:Connect(function()
		TweenService:Create(esc, TweenInfo.new(0.15), { Scale = 1 }):Play()
		borde.Color = color
	end)
	return f
end

local function boton(padre, txt, fondo, activo, alPulsar)
	local b = nuevo("TextButton", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -8), Size = UDim2.new(1, -16, 0, 30), BackgroundColor3 = fondo,
		BorderSizePixel = 0, Text = txt, Font = FUENTE_N, TextSize = 14, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.5, AutoButtonColor = activo, ZIndex = 5 }, padre)
	esquina(b, 8)
	if activo then
		b.Activated:Connect(function()
			PV.alSonido("poner", 1.2)
			alPulsar()
		end)
	end
	return b
end

local function pintarCosmeticos(tipo)
	local T = DE.TIPOS[tipo]
	local puesto = datos and datos.estilo and datos.estilo[tipo]
	local nivel, vip = datos and datos.nivel or 1, datos and datos.vip
	nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(196, 186), CellPadding = UDim2.fromOffset(10, 10), SortOrder = Enum.SortOrder.LayoutOrder }, cuerpo)
	-- «Nada»
	do
		local f = tarjeta(cuerpo, 0, puesto == nil and VERDE or GRIS)
		texto({ Position = UDim2.fromOffset(0, 40), Size = UDim2.new(1, 0, 0, 60), Text = "✕", TextSize = 48, Font = FUENTE_N,
			TextColor3 = Color3.fromRGB(150, 160, 170), ZIndex = 3 }, f)
		texto({ Position = UDim2.fromOffset(0, 116), Size = UDim2.new(1, 0, 0, 20), Text = "Sin " .. T.n:lower():sub(1, -2), TextSize = 16, Font = FUENTE_N, ZIndex = 3 }, f)
		if puesto == nil then
			boton(f, "✔ PUESTO", VERDE, false)
		else
			boton(f, "Quitar", Color3.fromRGB(150, 70, 70), true, function()
				PV.enviar("progresoCmd", "equipar", tipo, "")
			end)
		end
	end
	for i, c in T.lista do
		local tiene = DE.puede(c, nivel, vip)
		local es = puesto == c.id
		local color = es and VERDE or (c.vip and ORO) or (tiene and TURQUESA) or GRIS
		local f = tarjeta(cuerpo, i, color)
		local vista = nuevo("Frame", { Position = UDim2.fromOffset(8, 8), Size = UDim2.new(1, -16, 0, 104), BackgroundColor3 = Color3.fromRGB(26, 34, 42),
			BorderSizePixel = 0, ClipsDescendants = true, ZIndex = 2 }, f)
		esquina(vista, 8)
		if tipo == "capa" then
			dibujoCapa(vista, c, 56, 86)
		elseif tipo == "sombrero" then
			dibujoSombrero(vista, c, 36)
		else
			dibujoMascota(vista, c, 46)
		end
		if not tiene then
			-- Candado encima
			nuevo("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, ZIndex = 6 }, vista)
			texto({ Size = UDim2.fromScale(1, 1), Text = "🔒", TextSize = 30, ZIndex = 7 }, vista)
		end
		if c.vip then
			local cinta = nuevo("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 4, 0, -8), Size = UDim2.fromOffset(52, 20),
				BackgroundColor3 = ORO, BorderSizePixel = 0, ZIndex = 8 }, f)
			esquina(cinta, 10)
			texto({ Size = UDim2.fromScale(1, 1), Text = "VIP", TextSize = 12, Font = FUENTE_N, TextColor3 = Color3.fromRGB(80, 40, 0), TextStrokeTransparency = 1, ZIndex = 9 }, cinta)
		end
		texto({ Position = UDim2.fromOffset(8, 116), Size = UDim2.new(1, -16, 0, 22), Text = c.n, TextSize = 16, Font = FUENTE_N, TextScaled = false, ZIndex = 3 }, f)
		if es then
			boton(f, "✔ PUESTO", VERDE, false)
		elseif tiene then
			boton(f, "Ponérmelo", TURQUESA, true, function()
				PV.enviar("progresoCmd", "equipar", tipo, c.id)
			end)
		elseif c.vip then
			boton(f, "Consíguelo con VIP", Color3.fromRGB(190, 130, 20), true, function()
				PV.cerrar()
				PV.alAbrirTienda("pases")
			end)
		else
			boton(f, ("Nivel %d del Camino"):format(c.nivel), GRIS, false)
		end
	end
end

------------------------------------------------------------------
-- Mira
------------------------------------------------------------------
-- Dibuja una mira (para la tarjeta y para el juego)
function PV.dibujarMira(padre, estilo, col, z)
	limpiar(padre)
	local function barra(x, y, w, h)
		local f = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, x, 0.5, y), Size = UDim2.fromOffset(w, h), BackgroundColor3 = col,
			BorderSizePixel = 0, BackgroundTransparency = 0.1, ZIndex = z }, padre)
		nuevo("UIStroke", { Color = Color3.new(0, 0, 0), Thickness = 1, Transparency = 0.6, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, f)
		return f
	end
	if estilo == "punto" then
		esquina(barra(0, 0, 6, 6), 3)
	elseif estilo == "circulo" then
		local c = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(18, 18), BackgroundTransparency = 1, ZIndex = z }, padre)
		esquina(c, 9)
		nuevo("UIStroke", { Color = col, Thickness = 2 }, c)
		esquina(barra(0, 0, 3, 3), 2)
	elseif estilo == "hueco" then
		barra(0, -7, 2, 7)
		barra(0, 7, 2, 7)
		barra(-7, 0, 7, 2)
		barra(7, 0, 7, 2)
	elseif estilo == "grande" then
		barra(0, 0, 2, 34)
		barra(0, 0, 34, 2)
	else
		barra(0, 0, 2, 22)
		barra(0, 0, 22, 2)
	end
end

local function pintarMira()
	local lista = nuevo("UIListLayout", { Padding = UDim.new(0, 12), SortOrder = Enum.SortOrder.LayoutOrder }, cuerpo)
	local _ = lista
	local col = Color3.fromHex((DE.COLOR_MIRA_ID[PV.ajustes.colorMira] or DE.COLORES_MIRA[1]).c)
	texto({ Size = UDim2.new(1, 0, 0, 24), Text = "Forma", TextSize = 20, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 1 }, cuerpo)
	local fila = nuevo("Frame", { Size = UDim2.new(1, 0, 0, 130), BackgroundTransparency = 1, LayoutOrder = 2 }, cuerpo)
	nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, fila)
	for i, m in DE.MIRAS do
		local es = PV.ajustes.mira == m.id
		local f = tarjeta(fila, i, es and VERDE or GRIS)
		f.Size = UDim2.fromOffset(156, 126)
		local vista = nuevo("Frame", { Position = UDim2.fromOffset(8, 8), Size = UDim2.new(1, -16, 0, 64), BackgroundColor3 = Color3.fromRGB(90, 140, 200), BorderSizePixel = 0, ZIndex = 2 }, f)
		esquina(vista, 8)
		nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(130, 180, 240), Color3.fromRGB(80, 140, 70)) }, vista)
		PV.dibujarMira(vista, m.id, col, 3)
		local b = nuevo("TextButton", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -8), Size = UDim2.new(1, -16, 0, 34), BackgroundColor3 = es and VERDE or TARJETA,
			BorderSizePixel = 0, Text = (es and "✔ " or "") .. m.n, Font = FUENTE_N, TextSize = 14, TextColor3 = Color3.new(1, 1, 1), ZIndex = 4 }, f)
		esquina(b, 8)
		b.Activated:Connect(function()
			PV.alSonido("poner", 1.2)
			PV.ajustes.mira = m.id
			PV.alCambiarAjuste("mira", m.id)
			pintar()
		end)
	end
	texto({ Size = UDim2.new(1, 0, 0, 24), Text = "Color", TextSize = 20, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 3 }, cuerpo)
	local filaC = nuevo("Frame", { Size = UDim2.new(1, 0, 0, 70), BackgroundTransparency = 1, LayoutOrder = 4 }, cuerpo)
	nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, filaC)
	for i, c in DE.COLORES_MIRA do
		local es = PV.ajustes.colorMira == c.id
		local b = nuevo("TextButton", { Size = UDim2.fromOffset(124, 60), BackgroundColor3 = TARJETA, BorderSizePixel = 0, Text = "", LayoutOrder = i, AutoButtonColor = true }, filaC)
		esquina(b, 10)
		nuevo("UIStroke", { Color = es and Color3.new(1, 1, 1) or GRIS, Thickness = es and 3 or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
		local m = nuevo("Frame", { Position = UDim2.fromOffset(10, 15), Size = UDim2.fromOffset(30, 30), BackgroundColor3 = Color3.fromHex(c.c), BorderSizePixel = 0 }, b)
		esquina(m, 15)
		texto({ Position = UDim2.fromOffset(46, 0), Size = UDim2.new(1, -50, 1, 0), Text = c.n, TextSize = 15, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, b)
		b.Activated:Connect(function()
			PV.alSonido("poner", 1.2)
			PV.ajustes.colorMira = c.id
			PV.alCambiarAjuste("colorMira", c.id)
			pintar()
		end)
	end
end

pintar = function()
	limpiar(cuerpo)
	for _, h in cuerpo:GetChildren() do
		if h:IsA("UIGridLayout") or h:IsA("UIListLayout") then
			h:Destroy()
		end
	end
	for k, b in botonesPest do
		b.BackgroundColor3 = k == pestana and TURQUESA or TARJETA
	end
	local nivel = datos and datos.nivel or 1
	subT.Text = ("Nivel %d del Camino%s · %s"):format(nivel, (datos and datos.vip) and " · VIP" or "",
		pestana == "mira" and "La mira del centro de la pantalla" or "Lo que te pones lo ve todo el mundo")
	if pestana == "mira" then
		pintarMira()
	else
		pintarCosmeticos(pestana)
	end
end

------------------------------------------------------------------
-- API
------------------------------------------------------------------
PV.alAbrirTienda = function(p) end

local function mostrar()
	escVentana.Scale = ajustar() * 0.85
	velo.Visible = true
	PV.alVisible(true)
	TweenService:Create(escVentana, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = ajustar() }):Play()
end

function PV.abrir(p)
	pestana = p or pestana
	mostrar()
	pintar()
	PV.enviar("pedirProgreso")
end

function PV.cerrar()
	velo.Visible = false
	PV.alVisible(false)
end

function PV.visible()
	return velo.Visible
end

function PV.datos(d)
	datos = d
	if velo.Visible then
		pintar()
	end
end

function PV.iniciar()
	gui.Parent = jugador:WaitForChild("PlayerGui")
	cerrar.Activated:Connect(function()
		PV.alSonido("poner", 0.9)
		PV.cerrar()
	end)
end

return PV
