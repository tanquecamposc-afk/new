--[[
	Blockverse para Roblox · Interfaz (cliente)
	Con el aspecto del juego web (paneles grises con relieve, casillas
	hundidas y los iconos del juego):
	· HUD: barra rápida, corazones, comida, armadura, burbujas de aire,
	  barra y nivel de experiencia, nombre del objeto, mira, carga de
	  ataque, barra de uso (comer, arco), avisos, títulos y barra de
	  One Block.
	· Pantallas: inventario (armadura, mano izquierda y crafteo 2x2),
	  mesa de trabajo 3x3, horno, cofre, paleta creativa con buscador y
	  pestañas, y libro de recetas.
	· Menú de inicio, pantalla de carga, pantalla de muerte, efectos en
	  pantalla (daño, agua, fuego, dormir), información F3 y botones
	  táctiles.
	Los clics se envían al servidor, que es quien mueve los objetos.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp:WaitForChild("Registro"))
local Crafteo = require(Comp:WaitForChild("Crafteo"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))

local OB, BL = Registro.objetos, Registro.bloques
local jugador = Players.LocalPlayer

local Interfaz = {}
Interfaz.enviar = function(...) end
Interfaz.alSeleccionar = function(i) end
Interfaz.alElegirModo = function(m) end
Interfaz.alCerrar = function() end

------------------------------------------------------------------
-- Colores del juego web
------------------------------------------------------------------
local C = {
	panel = Color3.fromHex("c6c6c6"), luz = Color3.fromHex("ffffff"), sombra = Color3.fromHex("555555"),
	borde = Color3.fromHex("000000"), slot = Color3.fromHex("8b8b8b"), slotLuz = Color3.fromHex("ffffff"),
	slotSombra = Color3.fromHex("373737"), texto = Color3.fromHex("3f3f3f"), xp = Color3.fromHex("80ff20"),
	hover = Color3.fromHex("a8a8a8"),
}
local FUENTE = Enum.Font.GothamBold
local FUENTE_N = Enum.Font.GothamBlack
local S = 40 -- tamaño de una casilla

------------------------------------------------------------------
-- Utilidades
------------------------------------------------------------------
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
	local t = nuevo("TextLabel", {
		BackgroundTransparency = 1, Font = FUENTE, TextColor3 = Color3.new(1, 1, 1), TextSize = 16,
		TextStrokeTransparency = 0.4,
	}, padre)
	for k, v in props do
		t[k] = v
	end
	return t
end

-- Relieve (luz arriba-izquierda, sombra abajo-derecha) como los box-shadow del CSS
local function relieve(f, luz, sombra, g)
	g = g or 2
	nuevo("Frame", { Name = "L1", BorderSizePixel = 0, BackgroundColor3 = luz, Size = UDim2.new(1, 0, 0, g), ZIndex = f.ZIndex }, f)
	nuevo("Frame", { Name = "L2", BorderSizePixel = 0, BackgroundColor3 = luz, Size = UDim2.new(0, g, 1, 0), ZIndex = f.ZIndex }, f)
	nuevo("Frame", { Name = "S1", BorderSizePixel = 0, BackgroundColor3 = sombra, Position = UDim2.new(0, 0, 1, -g), Size = UDim2.new(1, 0, 0, g), ZIndex = f.ZIndex }, f)
	nuevo("Frame", { Name = "S2", BorderSizePixel = 0, BackgroundColor3 = sombra, Position = UDim2.new(1, -g, 0, 0), Size = UDim2.new(0, g, 1, 0), ZIndex = f.ZIndex }, f)
end

local function panel(props, padre)
	local p = nuevo("Frame", { BackgroundColor3 = C.panel, BorderSizePixel = 0 }, padre)
	for k, v in props do
		p[k] = v
	end
	nuevo("UIStroke", { Color = C.borde, Thickness = 2 }, p)
	nuevo("UICorner", { CornerRadius = UDim.new(0, 4) }, p)
	relieve(p, C.luz, C.sombra, 3)
	return p
end

local function boton(txt, props, padre, alClic)
	local b = nuevo("TextButton", {
		BackgroundColor3 = Color3.fromHex("6f6f6f"), BorderSizePixel = 0, Font = FUENTE, Text = txt, TextSize = 17,
		TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.5, AutoButtonColor = true,
	}, padre)
	for k, v in props do
		b[k] = v
	end
	nuevo("UIStroke", { Color = C.borde, Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
	relieve(b, Color3.fromHex("aaaaaa"), Color3.fromHex("3a3a3a"), 2)
	if alClic then
		b.Activated:Connect(alClic)
	end
	return b
end

local function shift()
	return UserInputService:IsKeyDown(Enum.KeyCode.LeftShift) or UserInputService:IsKeyDown(Enum.KeyCode.RightShift)
end

------------------------------------------------------------------
-- Pantalla
------------------------------------------------------------------
local gui = nuevo("ScreenGui", { Name = "Blockverse", ResetOnSpawn = false, IgnoreGuiInset = true, ZIndexBehavior = Enum.ZIndexBehavior.Sibling, DisplayOrder = 5 })
local escala = nuevo("UIScale", {}, gui)
local function ajustarEscala()
	local cam = workspace.CurrentCamera
	local v = cam and cam.ViewportSize or Vector2.new(1280, 800)
	escala.Scale = math.clamp(math.min(v.Y / 820, v.X / 1100), 0.55, 1.35)
end

------------------------------------------------------------------
-- Casillas
------------------------------------------------------------------
local tooltip
local cursorIcono

-- Crea una casilla. zona/i: a dónde se envía el clic
local function ranura(padre, zona, i, tam)
	tam = tam or S
	local b = nuevo("ImageButton", {
		Name = zona .. i, Size = UDim2.fromOffset(tam, tam), BackgroundColor3 = C.slot, BorderSizePixel = 0,
		AutoButtonColor = false, ImageTransparency = 1,
	}, padre)
	relieve(b, C.slotSombra, C.slotLuz, 2)
	local ic = nuevo("ImageLabel", {
		Name = "Icono", BackgroundTransparency = 1, Size = UDim2.new(1, -8, 1, -8), Position = UDim2.fromOffset(4, 4),
		ResampleMode = Enum.ResamplerMode.Pixelated, ImageTransparency = 1, ZIndex = 2,
	}, b)
	texto({ Name = "N", Size = UDim2.new(1, -3, 0, 16), Position = UDim2.new(0, 0, 1, -16), TextXAlignment = Enum.TextXAlignment.Right,
		Font = FUENTE_N, TextSize = 15, Text = "", ZIndex = 3, TextStrokeColor3 = Color3.fromHex("3f3f3f"), TextStrokeTransparency = 0 }, b)
	local dur = nuevo("Frame", { Name = "Dur", BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, Size = UDim2.new(1, -10, 0, 3),
		Position = UDim2.new(0, 5, 1, -6), Visible = false, ZIndex = 3 }, b)
	nuevo("Frame", { Name = "F", BackgroundColor3 = Color3.fromRGB(80, 255, 80), BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), ZIndex = 3 }, dur)
	b:SetAttribute("zona", zona)
	b:SetAttribute("i", i)
	b.MouseEnter:Connect(function()
		b.BackgroundColor3 = C.hover
		local id = b:GetAttribute("id")
		if id and tooltip then
			tooltip.Text = Registro.nombre(id)
			tooltip.Visible = true
		end
	end)
	b.MouseLeave:Connect(function()
		b.BackgroundColor3 = C.slot
		if tooltip then
			tooltip.Visible = false
		end
	end)
	local function clic(boton)
		local z = b:GetAttribute("zona")
		if z == "paleta" then
			return
		end
		Interfaz.enviar("click", z, b:GetAttribute("i"), (boton == 1 and shift()) and 3 or boton)
	end
	b.MouseButton1Click:Connect(function()
		clic(1)
	end)
	b.MouseButton2Click:Connect(function()
		clic(2)
	end)
	return b
end

-- Muestra una pila en una casilla
local function pintar(b, p)
	local ic = b.Icono
	if p then
		Iconos.poner(ic, p.id)
		b.N.Text = p.n > 1 and tostring(p.n) or ""
		b:SetAttribute("id", p.id)
		local o = OB[p.id]
		if p.dur and o and o.dur and p.dur < o.dur then
			local f = math.clamp(p.dur / o.dur, 0, 1)
			b.Dur.Visible = true
			b.Dur.F.Size = UDim2.fromScale(f, 1)
			b.Dur.F.BackgroundColor3 = Color3.fromHSV(f / 3, 1, 1)
		else
			b.Dur.Visible = false
		end
	else
		Iconos.poner(ic, nil)
		b.N.Text = ""
		b:SetAttribute("id", nil)
		b.Dur.Visible = false
	end
end

------------------------------------------------------------------
-- HUD
------------------------------------------------------------------
local hud = nuevo("Frame", { Name = "HUD", BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1) }, gui)

-- Mira
local mira = nuevo("Frame", { Name = "Mira", BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(22, 22) }, hud)
nuevo("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, Position = UDim2.fromOffset(10, 0), Size = UDim2.fromOffset(2, 22), BackgroundTransparency = 0.15 }, mira)
nuevo("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, Position = UDim2.fromOffset(0, 10), Size = UDim2.fromOffset(22, 2), BackgroundTransparency = 0.15 }, mira)
local cargaAtaque = nuevo("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.5, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0.5, 18), Size = UDim2.fromOffset(22, 4), Visible = false }, hud)
local cargaF = nuevo("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, cargaAtaque)
local barraUso = nuevo("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.5, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0.5, 30), Size = UDim2.fromOffset(80, 6), Visible = false }, hud)
nuevo("UICorner", { CornerRadius = UDim.new(0, 3) }, barraUso)
local usoF = nuevo("Frame", { BackgroundColor3 = Color3.fromHex("f0b34a"), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, barraUso)

-- Bloque inferior
local abajo = nuevo("Frame", { Name = "Abajo", BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -10),
	Size = UDim2.fromOffset(9 * 46 + 8, 120) }, hud)
local barra = nuevo("Frame", { Name = "Barra", BackgroundColor3 = Color3.fromRGB(20, 20, 20), BackgroundTransparency = 0.38, BorderSizePixel = 0,
	AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.fromScale(0.5, 1), Size = UDim2.fromOffset(9 * 46 + 4, 50) }, abajo)
nuevo("UIStroke", { Color = C.borde, Thickness = 2 }, barra)
local barraCas = {}
for i = 1, 9 do
	local b = nuevo("ImageButton", { BackgroundTransparency = 1, Size = UDim2.fromOffset(44, 44), Position = UDim2.fromOffset(3 + (i - 1) * 46, 3), ImageTransparency = 1 }, barra)
	nuevo("ImageLabel", { Name = "Icono", BackgroundTransparency = 1, Size = UDim2.new(1, -8, 1, -8), Position = UDim2.fromOffset(4, 4),
		ResampleMode = Enum.ResamplerMode.Pixelated, ImageTransparency = 1, ZIndex = 2 }, b)
	texto({ Name = "N", Size = UDim2.new(1, -3, 0, 16), Position = UDim2.new(0, 0, 1, -16), TextXAlignment = Enum.TextXAlignment.Right,
		Font = FUENTE_N, TextSize = 15, Text = "", ZIndex = 3, TextStrokeColor3 = Color3.fromHex("3f3f3f"), TextStrokeTransparency = 0 }, b)
	local dur = nuevo("Frame", { Name = "Dur", BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, Size = UDim2.new(1, -10, 0, 3),
		Position = UDim2.new(0, 5, 1, -6), Visible = false, ZIndex = 3 }, b)
	nuevo("Frame", { Name = "F", BackgroundColor3 = Color3.fromRGB(80, 255, 80), BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), ZIndex = 3 }, dur)
	texto({ Name = "Num", Size = UDim2.fromOffset(12, 12), Position = UDim2.fromOffset(3, 1), Text = tostring(i), TextSize = 10, TextTransparency = 0.35, ZIndex = 3 }, b)
	b.Activated:Connect(function()
		Interfaz.alSeleccionar(i)
	end)
	barraCas[i] = b
end
local selMarco = nuevo("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.78, BorderSizePixel = 0, Size = UDim2.fromOffset(48, 48), ZIndex = 4 }, barra)
nuevo("UIStroke", { Color = Color3.new(1, 1, 1), Thickness = 2 }, selMarco)

-- Experiencia
local barraXP = nuevo("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -56), Size = UDim2.new(1, -8, 0, 7) }, abajo)
nuevo("UIStroke", { Color = Color3.new(0, 0, 0), Thickness = 1, Transparency = 0.2 }, barraXP)
local xpF = nuevo("Frame", { BackgroundColor3 = C.xp, BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, barraXP)
local nivelXP = texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 0, -1), Size = UDim2.fromOffset(60, 18), TextColor3 = C.xp,
	Font = FUENTE_N, TextSize = 15, TextStrokeTransparency = 0, Text = "" }, barraXP)

-- Filas de corazones, comida, armadura y burbujas (10 iconos de 18 px)
local function fila(nombre, pos, derecha)
	local f = nuevo("Frame", { Name = nombre, BackgroundTransparency = 1, Size = UDim2.fromOffset(10 * 19, 18), Position = pos }, abajo)
	if derecha then
		f.AnchorPoint = Vector2.new(1, 0)
	end
	local lista = {}
	for k = 1, 10 do
		local x = derecha and (10 - k) * 19 or (k - 1) * 19
		local im = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(18, 18), Position = UDim2.fromOffset(x, 0),
			ResampleMode = Enum.ResamplerMode.Pixelated }, f)
		texto({ Name = "T", Size = UDim2.fromScale(1, 1), Text = "", TextSize = 14, Visible = false }, im)
		lista[k] = im
	end
	return f, lista
end
local filaVida, corazones = fila("Corazones", UDim2.new(0, 2, 1, -84))
local filaArm, armaduras = fila("Armadura", UDim2.new(0, 2, 1, -104))
local filaComida, comidas = fila("Comida", UDim2.new(1, -2, 1, -84), true)
local filaAire, burbujas = fila("Burbujas", UDim2.new(1, -2, 1, -104), true)

-- Respaldo de texto por si no hay imágenes editables
local RESPALDO = { vida = { "❤", Color3.fromRGB(224, 32, 44) }, veneno = { "❤", Color3.fromRGB(138, 154, 42) }, wither = { "❤", Color3.fromRGB(60, 60, 60) },
	comida = { "🍗", Color3.fromRGB(184, 112, 58) }, hambre = { "🍗", Color3.fromRGB(106, 138, 58) }, armadura = { "⛨", Color3.fromRGB(200, 200, 208) } }
local function icono(im, tipo, modo)
	if Iconos.hud(im, tipo .. "_" .. modo) then
		im.ImageTransparency = 0
		im.T.Visible = false
	else
		im.ImageTransparency = 1
		local r = RESPALDO[tipo]
		im.T.Visible = true
		im.T.Text = r and r[1] or "•"
		im.T.TextColor3 = modo == "vacio" and Color3.fromRGB(58, 52, 52) or r and r[2] or Color3.new(1, 1, 1)
		im.T.TextTransparency = modo == "medio" and 0.4 or 0
	end
end
local function pintarFila(lista, valor, tipo)
	for k = 1, 10 do
		local v = valor - (k - 1) * 2
		icono(lista[k], tipo, v >= 2 and "lleno" or v == 1 and "medio" or "vacio")
	end
end

local nombreObj = texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -128), Size = UDim2.fromOffset(400, 22), TextSize = 17,
	TextTransparency = 1, TextStrokeTransparency = 1, Text = "" }, hud)

-- Avisos, títulos y One Block
local mensaje = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.22), Size = UDim2.new(0.8, 0, 0, 26), TextSize = 19,
	TextWrapped = true, Text = "", TextTransparency = 1, TextStrokeTransparency = 1 }, hud)
local titulo = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.36), Size = UDim2.new(1, 0, 0, 70), TextSize = 64,
	Font = FUENTE_N, Text = "", TextTransparency = 1, TextStrokeTransparency = 1 }, hud)
local subtitulo = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.44), Size = UDim2.new(1, 0, 0, 30), TextSize = 24,
	Text = "", TextTransparency = 1, TextStrokeTransparency = 1 }, hud)
local jefe = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 12), Size = UDim2.fromOffset(420, 40), Visible = false }, hud)
local jefeT = texto({ Size = UDim2.new(1, 0, 0, 18), TextSize = 15, Text = "" }, jefe)
local jefeB = nuevo("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.4, BorderSizePixel = 0, Position = UDim2.fromOffset(0, 21), Size = UDim2.new(1, 0, 0, 8) }, jefe)
nuevo("UIStroke", { Color = Color3.new(1, 1, 1), Transparency = 0.6, Thickness = 1 }, jefeB)
local jefeF = nuevo("Frame", { BackgroundColor3 = Color3.fromHex("ffe060"), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, jefeB)
local jefeSig = texto({ Position = UDim2.fromOffset(0, 30), Size = UDim2.new(1, 0, 0, 14), TextSize = 12, Text = "", TextTransparency = 0.2 }, jefe)

-- Efectos en pantalla
local flash = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Image = "", ImageTransparency = 1, ZIndex = 0 }, hud)
local flashGrad = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(200, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), ZIndex = 0 }, hud)
nuevo("UIGradient", { Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(0.5, 1), NumberSequenceKeypoint.new(1, 0.3) }) }, flashGrad)
local aguaVista = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(30, 70, 170), BackgroundTransparency = 1, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), ZIndex = 0 }, hud)
local fuegoVista = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(255, 120, 20), BackgroundTransparency = 1, BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.fromScale(0, 1), Size = UDim2.fromScale(1, 0.4), ZIndex = 0 }, hud)
nuevo("UIGradient", { Rotation = -90, Transparency = NumberSequence.new(0.45, 1) }, fuegoVista)
local velo = nuevo("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), ZIndex = 20 }, gui)
local _ = flash

-- Mano (objeto en la mano en primera persona)
local mano = nuevo("Frame", { Name = "Mano", BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -40, 1, 30), Size = UDim2.fromOffset(230, 230) }, hud)
local manoIcono = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromScale(0.8, 0.8), Position = UDim2.fromScale(0.05, 0.05), ResampleMode = Enum.ResamplerMode.Pixelated,
	ImageTransparency = 1, Rotation = -12 }, mano)
local brazo = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(214, 170, 130), BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.62, 0.38),
	Size = UDim2.fromOffset(72, 260), Rotation = -28 }, mano)
nuevo("UIStroke", { Color = Color3.fromRGB(150, 110, 80), Thickness = 2 }, brazo)
local balanceo = 0

-- Información F3
local info = texto({ Position = UDim2.fromOffset(10, 10), Size = UDim2.fromOffset(420, 120), TextXAlignment = Enum.TextXAlignment.Left,
	TextYAlignment = Enum.TextYAlignment.Top, Font = Enum.Font.Code, TextSize = 14, BackgroundTransparency = 0.6, BackgroundColor3 = Color3.new(0, 0, 0),
	Visible = false, Text = "" }, hud)

------------------------------------------------------------------
-- Pantallas (inventario, mesa, horno, cofre)
------------------------------------------------------------------
local fondo = nuevo("TextButton", { Name = "Fondo", BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1),
	Text = "", AutoButtonColor = false, Visible = false, Modal = true, ZIndex = 5 }, gui)
fondo.MouseButton1Click:Connect(function()
	Interfaz.enviar("click", "fuera", 1, 1)
end)
fondo.MouseButton2Click:Connect(function()
	Interfaz.enviar("click", "fuera", 1, 2)
end)
local contenedor = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(1, 1), ZIndex = 6 }, fondo)

local function cabecera(p, txt, y)
	return texto({ Position = UDim2.fromOffset(14, y or 8), Size = UDim2.new(1, -28, 0, 20), Text = txt, TextColor3 = C.texto, TextStrokeTransparency = 1,
		TextXAlignment = Enum.TextXAlignment.Left, TextSize = 16 }, p)
end

-- Rejilla de casillas
local function rejilla(padre, zona, desde, n, cols, x, y)
	local t = {}
	for k = 0, n - 1 do
		local b = ranura(padre, zona, desde + k)
		b.Position = UDim2.fromOffset(x + (k % cols) * (S + 2), y + (k // cols) * (S + 2))
		t[desde + k] = b
	end
	return t
end

-- Inventario del jugador (mochila 10-36 y barra 1-9) dentro de un panel
local ANCHO = 9 * (S + 2) + 26
local function bloqueInventario(p, y)
	cabecera(p, "Inventario", y)
	local cas = rejilla(p, "inv", 10, 27, 9, 14, y + 24)
	local barraP = rejilla(p, "inv", 1, 9, 9, 14, y + 24 + 3 * (S + 2) + 8)
	for i, b in barraP do
		cas[i] = b
	end
	return cas, y + 24 + 4 * (S + 2) + 8
end

local function flecha(p, x, y)
	local f = texto({ Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(36, S), Text = "➜", TextColor3 = Color3.fromHex("6a6a6a"),
		TextStrokeTransparency = 1, TextSize = 30 }, p)
	return f
end

local pantallas = {}

-- Inventario de supervivencia
do
	local alto = 20 + 4 * (S + 2) + 30 + 4 * (S + 2) + 40
	local p = panel({ Name = "Inventario", Size = UDim2.fromOffset(ANCHO, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	cabecera(p, "Armadura")
	local arm = rejilla(p, "inv", 37, 4, 1, 14, 30)
	local fondoArm = { "Casco", "Pecho", "Piernas", "Botas" }
	for k, b in arm do
		texto({ Name = "Fondo", Size = UDim2.fromScale(1, 1), Text = fondoArm[k - 36], TextSize = 8, TextColor3 = Color3.fromRGB(60, 60, 60),
			TextStrokeTransparency = 1, TextTransparency = 0.4 }, b)
	end
	local izq = ranura(p, "inv", 41)
	izq.Position = UDim2.fromOffset(14 + S + 10, 30 + 3 * (S + 2))
	texto({ Name = "Fondo", Size = UDim2.fromScale(1, 1), Text = "Mano izq.", TextSize = 8, TextColor3 = Color3.fromRGB(60, 60, 60), TextStrokeTransparency = 1, TextTransparency = 0.4 }, izq)
	arm[41] = izq
	-- Muñeco
	local muneco = nuevo("ViewportFrame", { Name = "Muneco", BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, Position = UDim2.fromOffset(14 + S + 10, 30),
		Size = UDim2.fromOffset(110, 3 * (S + 2) - 6), Ambient = Color3.fromRGB(200, 200, 200), LightColor = Color3.new(1, 1, 1) }, p)
	nuevo("UIStroke", { Color = C.slotSombra, Thickness = 2 }, muneco)
	-- Crafteo 2x2
	local cx = ANCHO - 14 - 2 * (S + 2) - 46 - S
	texto({ Position = UDim2.fromOffset(cx, 8), Size = UDim2.fromOffset(160, 20), Text = "Fabricación", TextColor3 = C.texto, TextStrokeTransparency = 1,
		TextXAlignment = Enum.TextXAlignment.Left, TextSize = 16 }, p)
	local rej = rejilla(p, "rejilla", 1, 4, 2, cx, 40)
	flecha(p, cx + 2 * (S + 2) + 4, 40 + (S + 2) / 2)
	local sal = ranura(p, "salida", 1, S + 8)
	sal.Position = UDim2.fromOffset(cx + 2 * (S + 2) + 44, 36 + (S + 2) / 2)
	local libro = boton("📖", { Size = UDim2.fromOffset(S, S), Position = UDim2.fromOffset(cx, 40 + 2 * (S + 2) + 6), TextSize = 22, ZIndex = 7 }, p, function()
		Interfaz.alternarLibro()
	end)
	local cas, _ = bloqueInventario(p, 30 + 4 * (S + 2) + 10)
	pantallas.inventario = { panel = p, cas = cas, extra = arm, rejilla = rej, salida = sal, muneco = muneco, libro = libro, w = 2 }
end

-- Mesa de trabajo
do
	local alto = 36 + 3 * (S + 2) + 20 + 4 * (S + 2) + 40
	local p = panel({ Name = "Mesa", Size = UDim2.fromOffset(ANCHO, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	cabecera(p, "Mesa de trabajo")
	local rej = rejilla(p, "rejilla", 1, 9, 3, 50, 34)
	flecha(p, 50 + 3 * (S + 2) + 18, 34 + (S + 2))
	local sal = ranura(p, "salida", 1, S + 12)
	sal.Position = UDim2.fromOffset(50 + 3 * (S + 2) + 70, 28 + (S + 2))
	local libro = boton("📖", { Size = UDim2.fromOffset(S, S), Position = UDim2.fromOffset(ANCHO - 14 - S, 34), TextSize = 22, ZIndex = 7 }, p, function()
		Interfaz.alternarLibro()
	end)
	local cas = bloqueInventario(p, 34 + 3 * (S + 2) + 10)
	pantallas.mesa = { panel = p, cas = cas, rejilla = rej, salida = sal, libro = libro, w = 3 }
end

-- Horno
do
	local alto = 36 + 3 * (S + 2) + 20 + 4 * (S + 2) + 40
	local p = panel({ Name = "Horno", Size = UDim2.fromOffset(ANCHO, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	local tit = cabecera(p, "Horno")
	local x0 = 110
	local ent = ranura(p, "horno", 1)
	ent.Position = UDim2.fromOffset(x0, 36)
	local llama = nuevo("Frame", { BackgroundColor3 = Color3.fromHex("555555"), BorderSizePixel = 0, Position = UDim2.fromOffset(x0 + 8, 36 + S + 6), Size = UDim2.fromOffset(S - 16, S - 16) }, p)
	local llamaF = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(255, 140, 30), BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 1), Position = UDim2.fromScale(0, 1), Size = UDim2.fromScale(1, 0) }, llama)
	local comb = ranura(p, "horno", 2)
	comb.Position = UDim2.fromOffset(x0, 36 + 2 * (S + 2))
	local prog = nuevo("Frame", { BackgroundColor3 = Color3.fromHex("555555"), BorderSizePixel = 0, Position = UDim2.fromOffset(x0 + S + 24, 36 + S + 14), Size = UDim2.fromOffset(60, 10) }, p)
	local progF = nuevo("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, prog)
	local sal = ranura(p, "horno", 3, S + 12)
	sal.Position = UDim2.fromOffset(x0 + S + 100, 36 + S - 6)
	local cas = bloqueInventario(p, 36 + 3 * (S + 2) + 10)
	pantallas.horno = { panel = p, cas = cas, ent = ent, comb = comb, sal = sal, llamaF = llamaF, progF = progF, titulo = tit }
end

-- Cofre
do
	local alto = 34 + 3 * (S + 2) + 20 + 4 * (S + 2) + 40
	local p = panel({ Name = "Cofre", Size = UDim2.fromOffset(ANCHO, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	cabecera(p, "Cofre")
	local cof = rejilla(p, "cofre", 1, 27, 9, 14, 32)
	local cas = bloqueInventario(p, 32 + 3 * (S + 2) + 10)
	pantallas.cofre = { panel = p, cas = cas, cofre = cof }
end

-- Inventario creativo: paleta con buscador y pestañas
local paleta = {}
do
	local alto = 520
	local p = panel({ Name = "Creativo", Size = UDim2.fromOffset(ANCHO + 30, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	cabecera(p, "Creativo")
	local busca = nuevo("TextBox", { Position = UDim2.new(1, -214, 0, 6), Size = UDim2.fromOffset(200, 24), BackgroundColor3 = Color3.new(0, 0, 0),
		TextColor3 = Color3.new(1, 1, 1), PlaceholderText = "Buscar…", Text = "", Font = FUENTE, TextSize = 14, ClearTextOnFocus = false,
		TextXAlignment = Enum.TextXAlignment.Left }, p)
	nuevo("UIPadding", { PaddingLeft = UDim.new(0, 6) }, busca)
	nuevo("UIStroke", { Color = Color3.fromHex("a0a0a0"), Thickness = 1 }, busca)
	local pest = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(14, 34), Size = UDim2.new(1, -28, 0, 26) }, p)
	nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4) }, pest)
	local lista = nuevo("ScrollingFrame", { BackgroundColor3 = Color3.fromHex("8b8b8b"), BorderSizePixel = 0, Position = UDim2.fromOffset(14, 64),
		Size = UDim2.new(1, -28, 0, 5 * (S + 2) + 6), ScrollBarThickness = 8, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y }, p)
	nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(S, S), CellPadding = UDim2.fromOffset(2, 2), SortOrder = Enum.SortOrder.LayoutOrder }, lista)
	nuevo("UIPadding", { PaddingLeft = UDim.new(0, 3), PaddingTop = UDim.new(0, 3) }, lista)
	local yInv = 64 + 5 * (S + 2) + 14
	local cas = bloqueInventario(p, yInv)
	local arm = rejilla(p, "inv", 37, 4, 4, ANCHO + 30 - 14 - 5 * (S + 2) - 8, yInv)
	local borrar = ranura(p, "borrar", 1)
	borrar.Position = UDim2.fromOffset(ANCHO + 30 - 14 - S, yInv)
	texto({ Size = UDim2.fromScale(1, 1), Text = "🗑", TextSize = 22, TextStrokeTransparency = 1, TextColor3 = Color3.fromRGB(60, 60, 60) }, borrar)
	borrar.MouseButton1Click:Connect(function()
		if shift() then
			Interfaz.enviar("vaciarCreativo")
		end
	end)
	paleta.panel, paleta.lista, paleta.busca, paleta.pest = p, lista, busca, pest
	pantallas.creativo = { panel = p, cas = cas, extra = arm }
end

-- Libro de recetas (al lado del inventario o la mesa)
local libro = {}
do
	local p = panel({ Name = "Libro", Size = UDim2.fromOffset(5 * (S + 2) + 40, 420), AnchorPoint = Vector2.new(1, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	cabecera(p, "Recetas")
	local todas = boton("Todas", { Position = UDim2.new(1, -78, 0, 6), Size = UDim2.fromOffset(64, 22), TextSize = 13, ZIndex = 7 }, p)
	local lista = nuevo("ScrollingFrame", { BackgroundColor3 = Color3.fromHex("8b8b8b"), BorderSizePixel = 0, Position = UDim2.fromOffset(14, 34),
		Size = UDim2.new(1, -28, 1, -48), ScrollBarThickness = 8, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y }, p)
	nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(S, S), CellPadding = UDim2.fromOffset(2, 2), SortOrder = Enum.SortOrder.LayoutOrder }, lista)
	nuevo("UIPadding", { PaddingLeft = UDim.new(0, 3), PaddingTop = UDim.new(0, 3) }, lista)
	libro.panel, libro.lista, libro.botonTodas = p, lista, todas
	libro.verTodas = false
	todas.Activated:Connect(function()
		libro.verTodas = not libro.verTodas
		todas.Text = libro.verTodas and "Puedo" or "Todas"
		Interfaz.refrescarLibro()
	end)
end

-- Tooltip y objeto en el cursor
tooltip = texto({ Name = "Tooltip", BackgroundColor3 = Color3.fromRGB(16, 0, 16), BackgroundTransparency = 0.08, AutomaticSize = Enum.AutomaticSize.X,
	Size = UDim2.fromOffset(0, 24), TextSize = 14, Visible = false, ZIndex = 30, Text = "" }, gui)
nuevo("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 6) }, tooltip)
nuevo("UIStroke", { Color = Color3.fromRGB(40, 0, 110), Thickness = 2 }, tooltip)
cursorIcono = nuevo("ImageLabel", { Name = "Cursor", BackgroundTransparency = 1, Size = UDim2.fromOffset(S - 4, S - 4), AnchorPoint = Vector2.new(0.5, 0.5),
	ResampleMode = Enum.ResamplerMode.Pixelated, ImageTransparency = 1, Visible = false, ZIndex = 29 }, gui)
local cursorN = texto({ Size = UDim2.new(1, 0, 0, 16), Position = UDim2.new(0, 2, 1, -12), TextXAlignment = Enum.TextXAlignment.Right, Font = FUENTE_N,
	TextSize = 15, Text = "", ZIndex = 30, TextStrokeTransparency = 0 }, cursorIcono)

------------------------------------------------------------------
-- Menú de inicio, carga y muerte
------------------------------------------------------------------
local menu = nuevo("Frame", { Name = "Menu", BackgroundColor3 = Color3.fromRGB(10, 14, 24), BackgroundTransparency = 0.25, BorderSizePixel = 0,
	Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 10 }, gui)
nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(40, 70, 120), Color3.fromRGB(10, 14, 24)) }, menu)
nuevo("TextButton", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Text = "", Modal = true, ZIndex = 10 }, menu)
texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0.1), Size = UDim2.fromOffset(700, 90), Text = "BLOCKVERSE", Font = FUENTE_N,
	TextSize = 84, TextColor3 = Color3.fromRGB(255, 255, 255), TextStrokeTransparency = 0, TextStrokeColor3 = Color3.fromRGB(40, 40, 40), ZIndex = 11 }, menu)
texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0.1), Size = UDim2.fromOffset(700, 30), Text = "edición Roblox",
	TextColor3 = Color3.fromRGB(255, 255, 80), TextSize = 20, ZIndex = 11, Rotation = -8 }, menu).Position = UDim2.new(0.5, 230, 0.1, 80)
local menuCaja = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0.33), Size = UDim2.fromOffset(380, 330), ZIndex = 11 }, menu)
nuevo("UIListLayout", { Padding = UDim.new(0, 10), HorizontalAlignment = Enum.HorizontalAlignment.Center }, menuCaja)
local function opcionMenu(txt, sub, modo)
	local b = boton(txt, { Size = UDim2.fromOffset(380, 52), TextSize = 21, ZIndex = 12 }, menuCaja, function()
		Interfaz.alElegirModo(modo)
	end)
	texto({ Position = UDim2.new(0, 0, 1, -16), Size = UDim2.new(1, 0, 0, 14), Text = sub, TextSize = 11, TextTransparency = 0.25, ZIndex = 13 }, b)
	return b
end
opcionMenu("Supervivencia", "Recoge recursos, fabrica y sobrevive a la noche", "supervivencia")
opcionMenu("Creativo", "Todos los bloques y objetos, vuelo y sin daño", "creativo")
opcionMenu("One Block", "Empieza en un solo bloque que se regenera", "oneblock")
texto({ Size = UDim2.fromOffset(380, 100), Text = "WASD moverse · Espacio saltar · Ctrl correr · Mayús agacharse\nClic izq. picar / atacar · Clic der. usar / poner\n1-9 y rueda: barra · E inventario · Q tirar · F volar (creativo)\nV tercera persona · F3 información · Esc cerrar",
	TextSize = 13, TextWrapped = true, TextColor3 = Color3.fromRGB(220, 220, 220), ZIndex = 12 }, menuCaja)

local carga = nuevo("Frame", { Name = "Carga", BackgroundColor3 = Color3.fromRGB(40, 28, 20), BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), Visible = true, ZIndex = 15 }, gui)
local cargaT = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.45), Size = UDim2.fromOffset(600, 30), Text = "Cargando Blockverse…", TextSize = 22, ZIndex = 16 }, carga)
local cargaB = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(20, 20, 20), BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.52),
	Size = UDim2.fromOffset(360, 10), ZIndex = 16 }, carga)
local cargaBarra = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(110, 200, 60), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1), ZIndex = 17 }, cargaB)

local muerte = nuevo("Frame", { Name = "Muerte", BackgroundColor3 = Color3.fromRGB(120, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1),
	Visible = false, ZIndex = 12 }, gui)
texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.32), Size = UDim2.fromOffset(600, 70), Text = "¡Has muerto!", Font = FUENTE_N, TextSize = 56, ZIndex = 13 }, muerte)
local muerteT = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.42), Size = UDim2.fromOffset(700, 50), Text = "", TextSize = 18, TextWrapped = true, ZIndex = 13 }, muerte)
texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.52), Size = UDim2.fromOffset(600, 30), Text = "Reapareciendo…", TextSize = 18,
	TextColor3 = Color3.fromRGB(255, 230, 120), ZIndex = 13 }, muerte)

------------------------------------------------------------------
-- Estado
------------------------------------------------------------------
local est = { inv = table.create(41, false), sel = 1, modo = "supervivencia", hambre = 20, xp = { nivel = 0, puntos = 0 }, aire = 15, efectos = {}, cursor = false }
local abierta = nil -- nombre de la pantalla abierta
local uiDatos = nil
Interfaz.est = est

local function pantallaDe(tipo)
	if tipo == "inventario" and est.modo == "creativo" then
		return "creativo"
	end
	return tipo
end

local function xpNecesaria(n)
	return n <= 15 and 2 * n + 7 or n <= 30 and 5 * n - 38 or 9 * n - 158
end

local function pintarBarra()
	for i = 1, 9 do
		local b = barraCas[i]
		local p = est.inv[i]
		Iconos.poner(b.Icono, p and p.id or nil)
		b.N.Text = (p and p.n > 1) and tostring(p.n) or ""
		local o = p and OB[p.id]
		if p and p.dur and o and o.dur and p.dur < o.dur then
			local f = math.clamp(p.dur / o.dur, 0, 1)
			b.Dur.Visible = true
			b.Dur.F.Size = UDim2.fromScale(f, 1)
			b.Dur.F.BackgroundColor3 = Color3.fromHSV(f / 3, 1, 1)
		else
			b.Dur.Visible = false
		end
	end
	selMarco.Position = UDim2.fromOffset(1 + (est.sel - 1) * 46, 1)
	local p = est.inv[est.sel]
	if p then
		Iconos.poner(manoIcono, p.id)
		brazo.Visible = false
	else
		manoIcono.ImageTransparency = 1
		brazo.Visible = true
	end
end

local vidaActual, vidaMax = 20, 20
local function pintarEstado()
	local sup = est.modo ~= "creativo"
	filaVida.Visible = sup
	filaComida.Visible = sup
	barraXP.Visible = sup
	local tipoVida = est.efectos.veneno and "veneno" or est.efectos.wither and "wither" or "vida"
	pintarFila(corazones, math.ceil(vidaActual / vidaMax * 20), tipoVida)
	pintarFila(comidas, math.floor(est.hambre), est.efectos.hambre and "hambre" or "comida")
	local def = 0
	for i = 37, 40 do
		local p = est.inv[i]
		local o = p and OB[p.id]
		if o and o.armadura then
			def += o.armadura.def or 0
		end
	end
	filaArm.Visible = sup and def > 0
	if def > 0 then
		pintarFila(armaduras, def, "armadura")
	end
	local aire = est.aire or 15
	filaAire.Visible = sup and aire < 15
	if filaAire.Visible then
		local n = math.ceil(aire / 15 * 10)
		for k = 1, 10 do
			local im = burbujas[k]
			im.Visible = k <= n
			if not Iconos.hud(im, "burbuja") then
				im.ImageTransparency = 1
				im.T.Visible = true
				im.T.Text = "○"
				im.T.TextColor3 = Color3.fromRGB(106, 176, 255)
			end
		end
	end
	local x = est.xp or { nivel = 0, puntos = 0 }
	xpF.Size = UDim2.fromScale(math.clamp(x.puntos / xpNecesaria(x.nivel), 0, 1), 1)
	nivelXP.Text = x.nivel > 0 and tostring(x.nivel) or ""
end

------------------------------------------------------------------
-- Paleta creativa
------------------------------------------------------------------
local PESTANAS = {
	{ "Todo", function() return true end },
	{ "Bloques", function(id, o) return o.bloque == true end },
	{ "Herramientas", function(id, o) return o.herr ~= nil or o.armadura ~= nil or o.dur ~= nil end },
	{ "Comida", function(id, o) return o.comida ~= nil or o.pocion ~= nil or o.bebida ~= nil end },
	{ "Objetos", function(id, o) return not o.bloque and not o.herr and not o.armadura and not o.comida end },
}
local pestanaActual = 1
local paletaHecha = false
local paletaBotones = {}

local function filtrarPaleta()
	local q = string.lower(paleta.busca.Text or "")
	local f = PESTANAS[pestanaActual][2]
	for id, b in paletaBotones do
		local o = OB[id]
		local ok = f(id, o)
		if ok and q ~= "" then
			ok = string.find(string.lower(o.nombre or ""), q, 1, true) ~= nil
		end
		b.Visible = ok
	end
	paleta.lista.CanvasPosition = Vector2.zero
end

local function crearPaleta()
	if paletaHecha then
		return
	end
	paletaHecha = true
	for k, t in PESTANAS do
		local b = boton(t[1], { Size = UDim2.fromOffset(84, 24), TextSize = 12, ZIndex = 7 }, paleta.pest, function()
			pestanaActual = k
			filtrarPaleta()
		end)
		b.LayoutOrder = k
	end
	local ids = {}
	for id, o in OB do
		if not o.oculto then
			table.insert(ids, id)
		end
	end
	table.sort(ids)
	for n, id in ids do
		local b = ranura(paleta.lista, "paleta", id)
		b.LayoutOrder = n
		pintar(b, { id = id, n = 1 })
		b.MouseButton1Click:Connect(function()
			if est.cursor then
				Interfaz.enviar("click", "borrar", 1, 1)
			else
				Interfaz.enviar("creativo", id, shift() and "max" or 1)
			end
		end)
		b.MouseButton2Click:Connect(function()
			Interfaz.enviar("creativo", id, "max")
		end)
		paletaBotones[id] = b
		if n % 60 == 0 then
			task.wait()
		end
	end
	paleta.busca:GetPropertyChangedSignal("Text"):Connect(filtrarPaleta)
	filtrarPaleta()
end

------------------------------------------------------------------
-- Libro de recetas
------------------------------------------------------------------
local libroHecho = false
local libroBotones = {}
local function crearLibro()
	if libroHecho then
		return
	end
	libroHecho = true
	local vistos = {}
	for k, r in Crafteo.RECETAS do
		if (OB[r.id] or BL[r.id]) and not vistos[r.id] then
			vistos[r.id] = true
			local b = ranura(libro.lista, "receta", k)
			b:SetAttribute("zona", "paleta")
			b.LayoutOrder = k
			pintar(b, { id = r.id, n = r.n or 1 })
			b.MouseButton1Click:Connect(function()
				Interfaz.enviar("receta", k, shift())
			end)
			libroBotones[k] = b
		end
		if k % 60 == 0 then
			task.wait()
		end
	end
end

local function cuentaInv()
	local c = {}
	for i = 1, 36 do
		local p = est.inv[i]
		if p then
			c[p.id] = (c[p.id] or 0) + p.n
		end
	end
	if uiDatos and uiDatos.rejilla then
		for _, p in uiDatos.rejilla do
			if p then
				c[p.id] = (c[p.id] or 0) + p.n
			end
		end
	end
	return c
end

local function sePuede(r, c, w)
	if Crafteo.necesitaMesa(r) and w < 3 then
		return false
	end
	for id, n in Crafteo.ingredientes(r) do
		local tiene = 0
		for obj, m in c do
			if Crafteo.equivale(obj, id) then
				tiene += m
			end
		end
		if tiene < n then
			return false
		end
	end
	return true
end

function Interfaz.refrescarLibro()
	if not libro.panel.Visible then
		return
	end
	crearLibro()
	local c = cuentaInv()
	local w = (abierta == "mesa") and 3 or 2
	for k, b in libroBotones do
		local r = Crafteo.RECETAS[k]
		local ok = sePuede(r, c, w)
		b.Visible = ok or libro.verTodas
		b.BackgroundColor3 = ok and C.slot or Color3.fromRGB(150, 90, 90)
	end
end

function Interfaz.alternarLibro(si)
	if si == nil then
		si = not libro.panel.Visible
	end
	libro.panel.Visible = si and (abierta == "inventario" or abierta == "mesa")
	Interfaz.refrescarLibro()
	Interfaz.colocarPaneles()
end

------------------------------------------------------------------
-- Pintar la pantalla abierta
------------------------------------------------------------------
function Interfaz.colocarPaneles()
	local P = abierta and pantallas[abierta]
	if not P then
		return
	end
	if libro.panel.Visible then
		local ancho = P.panel.Size.X.Offset + libro.panel.Size.X.Offset + 10
		P.panel.Position = UDim2.fromOffset(ancho / 2 - P.panel.Size.X.Offset / 2, 0)
		libro.panel.Position = UDim2.fromOffset(-ancho / 2 + libro.panel.Size.X.Offset, 0)
	else
		P.panel.Position = UDim2.fromOffset(0, 0)
	end
end

local function pintarPantalla()
	local P = abierta and pantallas[abierta]
	if not P then
		return
	end
	for i, b in P.cas do
		pintar(b, est.inv[i])
	end
	if P.extra then
		for i, b in P.extra do
			pintar(b, est.inv[i])
		end
	end
	local d = uiDatos
	if not d then
		return
	end
	if P.rejilla then
		for i, b in P.rejilla do
			pintar(b, d.rejilla and d.rejilla[i] or nil)
		end
		pintar(P.salida, d.salida or nil)
	end
	if P.cofre and d.cofre then
		for i, b in P.cofre do
			pintar(b, d.cofre[i])
		end
	end
	if abierta == "horno" and d.horno then
		local h = d.horno
		pintar(P.ent, h.entrada or nil)
		pintar(P.comb, h.combustible or nil)
		pintar(P.sal, h.salida or nil)
		P.llamaF.Size = UDim2.fromScale(1, math.clamp(h.quema or 0, 0, 1))
		P.progF.Size = UDim2.fromScale(math.clamp(h.prog or 0, 0, 1), 1)
		P.titulo.Text = h.tipo == "ahumador" and "Ahumador" or h.tipo == "altoHorno" and "Alto horno" or "Horno"
	end
	Interfaz.refrescarLibro()
end

-- Muñeco del inventario: una copia del personaje en un ViewportFrame
local function pintarMuneco()
	local P = pantallas.inventario
	local vp = P.muneco
	vp:ClearAllChildren()
	local ch = jugador.Character
	if not ch then
		return
	end
	ch.Archivable = true
	local ok, copia = pcall(function()
		return ch:Clone()
	end)
	if not ok or not copia then
		return
	end
	for _, d in copia:GetDescendants() do
		if d:IsA("Script") or d:IsA("LocalScript") then
			d:Destroy()
		end
	end
	local wm = Instance.new("WorldModel")
	wm.Parent = vp
	copia.Parent = wm
	local raiz = copia:FindFirstChild("HumanoidRootPart")
	if raiz then
		copia:PivotTo(CFrame.new(0, 0, 0) * CFrame.Angles(0, math.pi + 0.5, 0))
	end
	local cam = Instance.new("Camera")
	cam.FieldOfView = 40
	cam.CFrame = CFrame.lookAt(Vector3.new(0, 0.6, -11), Vector3.new(0, 0.2, 0))
	cam.Parent = vp
	vp.CurrentCamera = cam
end

function Interfaz.abrir(tipo)
	local nombre = pantallaDe(tipo)
	for n, P in pantallas do
		P.panel.Visible = n == nombre
	end
	abierta = nombre
	fondo.Visible = true
	if nombre == "creativo" then
		task.spawn(crearPaleta)
	end
	if nombre == "inventario" then
		pintarMuneco()
	end
	if nombre ~= "inventario" and nombre ~= "mesa" then
		libro.panel.Visible = false
	end
	Interfaz.colocarPaneles()
	pintarPantalla()
end

function Interfaz.cerrar()
	if not abierta then
		return
	end
	abierta = nil
	uiDatos = nil
	fondo.Visible = false
	libro.panel.Visible = false
	tooltip.Visible = false
	for _, P in pantallas do
		P.panel.Visible = false
	end
	Interfaz.alCerrar()
end

function Interfaz.abierto()
	return abierta ~= nil
end

function Interfaz.menuVisible()
	return menu.Visible or carga.Visible or muerte.Visible
end

------------------------------------------------------------------
-- Mensajes del servidor
------------------------------------------------------------------
function Interfaz.jugador(d)
	local antesSel = est.sel
	est.inv = d.inv or est.inv
	est.sel = d.sel or est.sel
	est.cursor = d.cursor or false
	est.hambre = d.hambre or est.hambre
	est.xp = d.xp or est.xp
	est.aire = d.aire or est.aire
	est.efectos = d.efectos or {}
	if d.modo and d.modo ~= est.modo then
		est.modo = d.modo
		if abierta == "inventario" or abierta == "creativo" then
			Interfaz.abrir("inventario")
		end
	end
	pintarBarra()
	pintarEstado()
	pintarPantalla()
	Interfaz.pintarCursor()
	if antesSel ~= est.sel then
		Interfaz.mostrarNombre()
	end
end

function Interfaz.ui(d)
	uiDatos = d
	est.cursor = d.cursor or false
	if d.inv then
		est.inv = d.inv
	end
	local nombre = pantallaDe(d.tipo)
	if abierta ~= nombre then
		Interfaz.abrir(d.tipo)
	else
		pintarPantalla()
	end
	Interfaz.pintarCursor()
end

function Interfaz.pintarCursor()
	local p = est.cursor
	if p and abierta then
		cursorIcono.Visible = true
		Iconos.poner(cursorIcono, p.id)
		cursorN.Text = p.n > 1 and tostring(p.n) or ""
	else
		cursorIcono.Visible = false
	end
end

function Interfaz.vida(h, m)
	vidaActual, vidaMax = math.max(0, h), math.max(1, m)
	pintarEstado()
end

local nombreHilo = 0
function Interfaz.mostrarNombre()
	local p = est.inv[est.sel]
	nombreHilo += 1
	local yo = nombreHilo
	if not p then
		nombreObj.TextTransparency = 1
		nombreObj.TextStrokeTransparency = 1
		return
	end
	nombreObj.Text = Registro.nombre(p.id)
	nombreObj.TextTransparency = 0
	nombreObj.TextStrokeTransparency = 0.4
	task.delay(2, function()
		if yo == nombreHilo then
			TweenService:Create(nombreObj, TweenInfo.new(0.4), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		end
	end)
end

function Interfaz.seleccion(i)
	est.sel = i
	pintarBarra()
	Interfaz.mostrarNombre()
end

local avisoHilo = 0
function Interfaz.aviso(t)
	avisoHilo += 1
	local yo = avisoHilo
	mensaje.Text = t
	mensaje.TextTransparency = 0
	mensaje.TextStrokeTransparency = 0.3
	task.delay(3, function()
		if yo == avisoHilo then
			TweenService:Create(mensaje, TweenInfo.new(0.5), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		end
	end)
end

local tituloHilo = 0
function Interfaz.titulo(t, sub, col)
	tituloHilo += 1
	local yo = tituloHilo
	titulo.Text = t or ""
	subtitulo.Text = sub or ""
	local c = Color3.new(1, 1, 1)
	if type(col) == "string" then
		local ok, cc = pcall(Color3.fromHex, col)
		if ok then
			c = cc
		end
	end
	subtitulo.TextColor3 = c
	titulo.TextColor3 = (t ~= "" and sub ~= "") and Color3.new(1, 1, 1) or c
	for _, l in { titulo, subtitulo } do
		l.TextTransparency = 0
		l.TextStrokeTransparency = 0.2
	end
	task.delay(2.6, function()
		if yo == tituloHilo then
			for _, l in { titulo, subtitulo } do
				TweenService:Create(l, TweenInfo.new(0.6), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
			end
		end
	end)
end

function Interfaz.oneblock(d)
	if not d then
		jefe.Visible = false
		return
	end
	jefe.Visible = true
	jefeT.Text = ("One Block · Fase %d: %s · %d bloques"):format(d.fase or 1, d.nombre or "", d.n or 0)
	local ok, c = pcall(Color3.fromHex, d.col or "#ffe060")
	jefeF.BackgroundColor3 = ok and c or Color3.fromHex("ffe060")
	if d.hasta then
		local f = ((d.n or 0) - (d.desde or 0)) / math.max(1, d.hasta - (d.desde or 0))
		jefeF.Size = UDim2.fromScale(math.clamp(f, 0, 1), 1)
		jefeSig.Text = d.siguiente and ("Siguiente: " .. d.siguiente .. " en " .. (d.hasta - (d.n or 0)) .. " bloques") or ""
	else
		jefeF.Size = UDim2.fromScale(1, 1)
		jefeSig.Text = "¡Última fase!"
	end
end

function Interfaz.muerte(t)
	if t then
		muerteT.Text = t
		muerte.Visible = true
		Interfaz.cerrar()
	else
		muerte.Visible = false
	end
end

function Interfaz.menu(si)
	menu.Visible = si
end

function Interfaz.carga(f, t)
	if f == nil then
		carga.Visible = false
		return
	end
	carga.Visible = true
	cargaBarra.Size = UDim2.fromScale(math.clamp(f, 0, 1), 1)
	if t then
		cargaT.Text = t
	end
end

function Interfaz.cargando()
	return carga.Visible
end

function Interfaz.dano()
	flashGrad.BackgroundTransparency = 0.25
	TweenService:Create(flashGrad, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
end

function Interfaz.agua(si)
	aguaVista.BackgroundTransparency = si and 0.55 or 1
end

function Interfaz.fuego(si)
	fuegoVista.BackgroundTransparency = si and 0 or 1
	fuegoVista.Visible = si
end

function Interfaz.dormir()
	TweenService:Create(velo, TweenInfo.new(1), { BackgroundTransparency = 0 }):Play()
	task.delay(2.2, function()
		TweenService:Create(velo, TweenInfo.new(1), { BackgroundTransparency = 1 }):Play()
	end)
end

function Interfaz.cargaAtaque(f)
	cargaAtaque.Visible = f < 1
	cargaF.Size = UDim2.fromScale(math.clamp(f, 0, 1), 1)
end

function Interfaz.uso(f)
	barraUso.Visible = f ~= nil
	if f then
		usoF.Size = UDim2.fromScale(math.clamp(f, 0, 1), 1)
	end
end

function Interfaz.balancear()
	balanceo = 1
end

function Interfaz.mostrarMano(si)
	mano.Visible = si
end

function Interfaz.mostrarMira(si)
	mira.Visible = si
end

function Interfaz.info(t)
	if t then
		info.Visible = true
		info.Text = t
	else
		info.Visible = false
	end
end

function Interfaz.infoVisible()
	return info.Visible
end

------------------------------------------------------------------
-- Botones táctiles
------------------------------------------------------------------
function Interfaz.botonesMovil(cb)
	if not UserInputService.TouchEnabled then
		return
	end
	local caja = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -20, 1, -150), Size = UDim2.fromOffset(200, 200) }, hud)
	local function tactil(txt, pos, inicio, fin)
		local b = nuevo("TextButton", { Text = txt, Font = FUENTE, TextSize = 26, TextColor3 = Color3.new(1, 1, 1), BackgroundColor3 = Color3.new(0, 0, 0),
			BackgroundTransparency = 0.45, Size = UDim2.fromOffset(64, 64), Position = pos, AutoButtonColor = false }, caja)
		nuevo("UICorner", { CornerRadius = UDim.new(1, 0) }, b)
		nuevo("UIStroke", { Color = Color3.new(1, 1, 1), Transparency = 0.5, Thickness = 2 }, b)
		b.InputBegan:Connect(function(i)
			if i.UserInputType == Enum.UserInputType.Touch then
				inicio()
			end
		end)
		b.InputEnded:Connect(function(i)
			if i.UserInputType == Enum.UserInputType.Touch and fin then
				fin()
			end
		end)
		return b
	end
	tactil("⛏", UDim2.fromOffset(130, 60), function() cb.picar(true) end, function() cb.picar(false) end)
	tactil("✋", UDim2.fromOffset(60, 110), function() cb.usar(true) end, function() cb.usar(false) end)
	tactil("🎒", UDim2.fromOffset(130, -10), cb.inventario)
	Interfaz.botonVolar = tactil("🕊", UDim2.fromOffset(60, 30), cb.volar)
	tactil("⇩", UDim2.fromOffset(0, 70), function() cb.agachar(true) end, function() cb.agachar(false) end)
	tactil("⤓", UDim2.fromOffset(-10, 140), cb.tirar)
end

------------------------------------------------------------------
-- Cada fotograma: cursor, tooltip y balanceo de la mano
------------------------------------------------------------------
function Interfaz.iniciar()
	gui.Parent = jugador:WaitForChild("PlayerGui")
	ajustarEscala()
	local cam = workspace.CurrentCamera
	if cam then
		cam:GetPropertyChangedSignal("ViewportSize"):Connect(ajustarEscala)
	end
	pintarBarra()
	pintarEstado()
	local t = 0
	RunService.RenderStepped:Connect(function(dt)
		t += dt
		local m = UserInputService:GetMouseLocation()
		local e = escala.Scale
		if cursorIcono.Visible then
			cursorIcono.Position = UDim2.fromOffset(m.X / e, m.Y / e)
		end
		if tooltip.Visible then
			tooltip.Position = UDim2.fromOffset(m.X / e + 14, m.Y / e - 28)
			if not abierta then
				tooltip.Visible = false
			end
		end
		-- La mano se balancea al andar y al usar
		balanceo = math.max(0, balanceo - dt * 4)
		local ch = jugador.Character
		local hum = ch and ch:FindFirstChildOfClass("Humanoid")
		local andar = hum and hum.MoveDirection.Magnitude > 0.1 and 1 or 0
		local bob = math.sin(t * 9) * 6 * andar
		local giro = math.sin(balanceo * math.pi) * 40
		mano.Position = UDim2.new(1, -40 - giro, 1, 30 + bob + math.sin(balanceo * math.pi) * 30)
		mano.Rotation = -giro * 0.5
	end)
end

return Interfaz
