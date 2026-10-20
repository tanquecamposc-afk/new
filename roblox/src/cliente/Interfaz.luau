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
local Enc = require(Comp:WaitForChild("Encantamientos"))

local OB, BL = Registro.objetos, Registro.bloques
local jugador = Players.LocalPlayer

local Interfaz = {}
local obActivo = false -- la barra de arriba la usa One Block
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
			local extra = b:GetAttribute("enc")
			tooltip.Text = Registro.nombre(id) .. (extra and extra ~= "" and ("\n" .. extra) or "")
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
-- Texto de los encantamientos de una pila
local function textoEnc(p)
	if not p or not p.enc then
		return nil
	end
	local t = {}
	for k, l in p.enc do
		table.insert(t, Enc.nombre(k, l))
	end
	table.sort(t)
	return table.concat(t, "\n")
end
Interfaz.textoEnc = textoEnc

local function pintar(b, p)
	local ic = b.Icono
	local brillo = b:FindFirstChild("Brillo")
	if p and p.enc and not brillo then
		brillo = nuevo("Frame", { Name = "Brillo", BackgroundColor3 = Color3.fromRGB(170, 90, 255), BackgroundTransparency = 0.72, BorderSizePixel = 0,
			Size = UDim2.new(1, -6, 1, -6), Position = UDim2.fromOffset(3, 3), ZIndex = 2 }, b)
	end
	if brillo then
		brillo.Visible = p ~= nil and p ~= false and p.enc ~= nil
	end
	if p then
		Iconos.poner(ic, p.id)
		b.N.Text = p.n > 1 and tostring(p.n) or ""
		b:SetAttribute("id", p.id)
		b:SetAttribute("enc", textoEnc(p))
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
		b:SetAttribute("enc", nil)
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

-- Panel lateral de los modos (marcador de Bed Wars, Mazmorras, Leyendas)
local lateral = nuevo("Frame", { Name = "PanelModo", BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.5, BorderSizePixel = 0,
	AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -10, 0.45, 0), Size = UDim2.fromOffset(270, 60), AutomaticSize = Enum.AutomaticSize.Y, Visible = false }, hud)
nuevo("UICorner", { CornerRadius = UDim.new(0, 6) }, lateral)
nuevo("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 8) }, lateral)
nuevo("UIListLayout", { Padding = UDim.new(0, 2), SortOrder = Enum.SortOrder.LayoutOrder }, lateral)

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
	local cab = cabecera(p, "Inventario", y)
	local cas = rejilla(p, "inv", 10, 27, 9, 14, y + 24)
	local barraP = rejilla(p, "inv", 1, 9, 9, 14, y + 24 + 3 * (S + 2) + 8)
	for i, b in barraP do
		cas[i] = b
	end
	return cas, y + 24 + 4 * (S + 2) + 8, cab
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

-- Mesas (encantar, yunque, afiladora, herrería, pociones) y comercio con aldeanos
local extra = {}
do
	local alto = 40 + 170 + 4 * (S + 2) + 40
	local p = panel({ Name = "Extra", Size = UDim2.fromOffset(ANCHO + 60, alto), AnchorPoint = Vector2.new(0.5, 0.5), Visible = false, ZIndex = 6 }, contenedor)
	extra.titulo = cabecera(p, "")
	extra.zona = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(14, 32), Size = UDim2.new(1, -28, 0, 170) }, p)
	local cas, _, cab = bloqueInventario(p, 32 + 170 + 6)
	extra.cas, extra.cabInv = cas, cab
	extra.panel = p
	pantallas.extra = { panel = p, cas = cas }
end

local function construirExtra(d)
	local z = extra.zona
	z:ClearAllChildren()
	extra.sub = d.sub
	extra.slots, extra.salida, extra.opciones, extra.ofertas = {}, nil, {}, {}
	extra.texto, extra.barras = nil, {}
	-- La tienda usa todo el panel (el dinero ya se ve arriba); las demás pantallas muestran el inventario
	local tienda = d.sub == "tienda"
	for _, b in extra.cas do
		b.Visible = not tienda
	end
	extra.cabInv.Visible = not tienda
	z.Size = UDim2.new(1, -28, 0, tienda and 170 + 4 * (S + 2) + 30 or 170)
	local function casilla(i, x, y, rotulo)
		local b = ranura(z, "mesa", i)
		b.Position = UDim2.fromOffset(x, y)
		if rotulo then
			texto({ Name = "Fondo", Size = UDim2.fromScale(1, 1), Text = rotulo, TextSize = 8, TextColor3 = Color3.fromRGB(60, 60, 60),
				TextStrokeTransparency = 1, TextTransparency = 0.4, ZIndex = 1 }, b)
		end
		extra.slots[i] = b
		return b
	end
	local function salida(x, y)
		local b = ranura(z, "mesaSalida", 1, S + 8)
		b.Position = UDim2.fromOffset(x, y)
		extra.salida = b
	end
	local function aviso(x, y, w)
		extra.texto = texto({ Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w or 320, 40), Text = "", TextColor3 = C.texto, TextStrokeTransparency = 1,
			TextSize = 13, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left }, z)
	end
	local function barra(x, y, w, h, col)
		local f = nuevo("Frame", { BackgroundColor3 = Color3.fromHex("555555"), BorderSizePixel = 0, Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, h) }, z)
		local fi = nuevo("Frame", { BackgroundColor3 = col, BorderSizePixel = 0, Size = UDim2.fromScale(0, 1) }, f)
		table.insert(extra.barras, fi)
		return fi
	end
	if d.sub == "encantar" then
		casilla(1, 10, 40, "Objeto")
		casilla(2, 10 + S + 6, 40, "Lapis")
		for i = 1, 3 do
			local b = boton("", { Size = UDim2.fromOffset(300, 40), Position = UDim2.fromOffset(110, 2 + (i - 1) * 46), TextSize = 13,
				BackgroundColor3 = Color3.fromHex("6a4a9a"), ZIndex = 7, TextXAlignment = Enum.TextXAlignment.Left }, z, function()
				Interfaz.enviar("encantar", i)
			end)
			nuevo("UIPadding", { PaddingLeft = UDim.new(0, 10) }, b)
			extra.opciones[i] = b
		end
		aviso(10, 150, 400)
	elseif d.sub == "yunque" or d.sub == "afiladora" then
		casilla(1, 40, 50)
		casilla(2, 40 + S + 30, 50)
		texto({ Position = UDim2.fromOffset(40 + 2 * S + 40, 50), Size = UDim2.fromOffset(40, S), Text = "➜", TextColor3 = Color3.fromHex("6a6a6a"),
			TextStrokeTransparency = 1, TextSize = 30 }, z)
		salida(40 + 2 * S + 90, 46)
		aviso(40, 110, 400)
	elseif d.sub == "herreria" then
		casilla(1, 30, 50, "Plantilla")
		casilla(2, 30 + S + 8, 50, "Objeto")
		casilla(3, 30 + 2 * (S + 8), 50, "Lingote")
		texto({ Position = UDim2.fromOffset(30 + 3 * (S + 8), 50), Size = UDim2.fromOffset(40, S), Text = "➜", TextColor3 = Color3.fromHex("6a6a6a"),
			TextStrokeTransparency = 1, TextSize = 30 }, z)
		salida(30 + 3 * (S + 8) + 50, 46)
		aviso(30, 110, 420)
		extra.texto.Text = "Plantilla de mejora + herramienta o armadura de diamante + lingote de netherite"
	elseif d.sub == "pociones" then
		casilla(5, 20, 10, "Blaze")
		barra(20, 10 + S + 6, S, 6, Color3.fromRGB(255, 160, 40))
		casilla(4, 180, 10, "Ingred.")
		barra(180 + S + 8, 20, 8, 70, Color3.fromRGB(255, 255, 255))
		for i = 1, 3 do
			casilla(i, 120 + (i - 1) * (S + 20), 100, "Frasco")
		end
	elseif d.sub == "tienda" then
		-- Tienda de Bed Wars: pestañas con icono, tu dinero, cuadrícula de ofertas y una línea de ayuda
		local alto = 170 + 4 * (S + 2) + 30
		extra.tabs = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 28) }, z)
		nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 3) }, extra.tabs)
		extra.monedas = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 0), Size = UDim2.fromOffset(176, 28) }, z)
		nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 0) }, extra.monedas)
		local lista = nuevo("ScrollingFrame", { BackgroundColor3 = Color3.fromHex("8b8b8b"), BorderSizePixel = 0, Position = UDim2.fromOffset(0, 32), Size = UDim2.new(1, 0, 0, alto - 58),
			ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y }, z)
		nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(210, 44), CellPadding = UDim2.fromOffset(3, 3), SortOrder = Enum.SortOrder.LayoutOrder }, lista)
		nuevo("UIPadding", { PaddingLeft = UDim.new(0, 3), PaddingTop = UDim.new(0, 3) }, lista)
		extra.lista = lista
		aviso(0, alto - 22, 436)
		extra.texto.Size = UDim2.fromOffset(436, 20)
		extra.texto.TextSize = 12
	elseif d.sub == "aldeano" then
		extra.nivel = barra(0, 4, 300, 6, Color3.fromRGB(96, 224, 96))
		local lista = nuevo("ScrollingFrame", { BackgroundTransparency = 1, BorderSizePixel = 0, Position = UDim2.fromOffset(0, 16), Size = UDim2.new(1, 0, 1, -16),
			ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y }, z)
		nuevo("UIListLayout", { Padding = UDim.new(0, 4) }, lista)
		extra.lista = lista
	end
end

local function pintarExtra(d)
	if not d then
		return
	end
	if extra.sub ~= d.sub then
		construirExtra(d)
	end
	extra.titulo.Text = d.nombre or ""
	for i, b in extra.slots do
		pintar(b, d.slots and d.slots[i] or nil)
	end
	if extra.salida then
		pintar(extra.salida, d.salida or nil)
	end
	if d.sub == "encantar" then
		local nivel = Interfaz.est.xp and Interfaz.est.xp.nivel or 0
		for i, b in extra.opciones do
			local o = d.opciones and d.opciones[i]
			if o then
				b.Text = ("%s   · nivel %d · %d lapislázuli"):format(o.pista or "", o.coste, o.lapis)
				local puede = Interfaz.est.modo == "creativo" or (nivel >= o.coste and d.slots[2] and d.slots[2].n >= o.lapis)
				b.TextTransparency = puede and 0 or 0.5
				b.Visible = true
			else
				b.Text = ""
				b.Visible = d.opciones ~= nil and i <= 3
				b.TextTransparency = 0.5
			end
		end
		if extra.texto then
			extra.texto.Text = d.opciones and ("Librerías alrededor: " .. (d.librerias or 0) .. " (pon hasta 15 a dos bloques de la mesa)")
				or "Coloca una herramienta, arma, armadura o libro, y lapislázuli."
		end
	elseif d.sub == "yunque" and extra.texto then
		extra.texto.Text = d.coste and ("Coste: " .. d.coste .. " niveles de experiencia") or "Pon el objeto y el material, otro igual o un libro encantado."
		extra.texto.TextColor3 = (d.coste and Interfaz.est.modo ~= "creativo" and (Interfaz.est.xp.nivel or 0) < d.coste) and Color3.fromRGB(200, 40, 40) or C.texto
	elseif d.sub == "afiladora" and extra.texto then
		extra.texto.Text = d.salida and "Quita los encantamientos (no las maldiciones) y devuelve experiencia, o une dos objetos iguales."
			or "Pon un objeto encantado o dos objetos iguales dañados."
	elseif d.sub == "pociones" then
		if extra.barras[1] then
			extra.barras[1].Size = UDim2.fromScale(math.clamp(d.comb or 0, 0, 1), 1)
		end
		if extra.barras[2] then
			extra.barras[2].Size = UDim2.fromScale(1, math.clamp(d.prog or 0, 0, 1))
		end
	elseif d.sub == "tienda" then
		for _, h in extra.tabs:GetChildren() do
			if h:IsA("GuiObject") then
				h:Destroy()
			end
		end
		for i, t in d.pestanas or {} do
			local b = boton("", { Size = UDim2.fromOffset(28, 28), LayoutOrder = i, ZIndex = 7,
				BackgroundColor3 = i == d.pestana and Color3.fromHex("c0a040") or Color3.fromHex("6f6f6f") }, extra.tabs, function()
				Interfaz.enviar("pestana", i)
			end)
			local ic = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(22, 22), Position = UDim2.fromOffset(3, 3),
				ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 8 }, b)
			Iconos.poner(ic, t.icono)
			b.MouseEnter:Connect(function()
				extra.texto.Text = t.nombre
			end)
		end
		for _, h in extra.monedas:GetChildren() do
			if h:IsA("GuiObject") then
				h:Destroy()
			end
		end
		for i, mo in d.monedas or {} do
			local f = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.fromOffset(44, 28), LayoutOrder = i }, extra.monedas)
			local ic = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(20, 20), Position = UDim2.fromOffset(0, 4),
				ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 8 }, f)
			Iconos.poner(ic, mo[1])
			texto({ Position = UDim2.fromOffset(21, 4), Size = UDim2.fromOffset(23, 20), Text = tostring(mo[2]), TextSize = 13, Font = FUENTE_N,
				TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8 }, f)
		end
		local lista = extra.lista
		for _, h in lista:GetChildren() do
			if h:IsA("GuiObject") then
				h:Destroy()
			end
		end
		for i, o in d.ofertas or {} do
			local fondoC = o.tiene and Color3.fromHex("4f7a4f") or (o.puede and Color3.fromHex("727272") or Color3.fromHex("5a4a4a"))
			local b = boton("", { Size = UDim2.fromOffset(210, 44), BackgroundColor3 = fondoC, ZIndex = 7, LayoutOrder = i }, lista, function()
				Interfaz.enviar("comprar", i, shift() and 8 or 1)
			end)
			b.TextTransparency = 1
			local ic = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(34, 34), Position = UDim2.fromOffset(5, 6),
				ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 8 }, b)
			Iconos.poner(ic, o.id)
			if (o.n or 1) > 1 then
				texto({ Size = UDim2.new(1, 0, 0, 14), Position = UDim2.new(0, 0, 1, -12), Text = tostring(o.n), TextSize = 13, Font = FUENTE_N,
					TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 9 }, ic)
			end
			texto({ Position = UDim2.fromOffset(44, 3), Size = UDim2.fromOffset(160, 26), Text = o.nombre or "", TextSize = 11, TextWrapped = true,
				TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 8 }, b)
			local precio = o.tiene and (o.tieneTxt or "✔ Ya lo tienes") or (o.precioTxt or ((o.precio and o.precio[2] or 0) .. " " .. Registro.nombre(o.precio and o.precio[1] or 0)))
			local colP = o.tiene and Color3.fromRGB(120, 255, 120) or (o.puede and Color3.fromRGB(255, 230, 120) or Color3.fromRGB(255, 110, 110))
			texto({ Position = UDim2.fromOffset(44, 28), Size = UDim2.fromOffset(160, 14), Text = precio, TextSize = 11, TextColor3 = colP,
				TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8 }, b)
			b.MouseEnter:Connect(function()
				extra.texto.Text = o.desc or o.nombre or ""
			end)
		end
		extra.texto.Text = d.pie or ""
	elseif d.sub == "aldeano" then
		if extra.nivel then
			extra.nivel.Size = UDim2.fromScale(math.clamp(d.xpNivel or 0, 0, 1), 1)
		end
		local lista = extra.lista
		for _, h in lista:GetChildren() do
			if h:IsA("GuiObject") then
				h:Destroy()
			end
		end
		for i, o in d.ofertas or {} do
			local b = boton("", { Size = UDim2.new(1, -10, 0, S + 6), BackgroundColor3 = Color3.fromHex("727272"), ZIndex = 7, LayoutOrder = i }, lista, function()
				Interfaz.enviar("comerciar", i)
			end)
			b.TextTransparency = 1
			local x = 6
			local function icono(id, n)
				local c = nuevo("ImageLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(S - 6, S - 6), Position = UDim2.fromOffset(x, 6),
					ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 8 }, b)
				Iconos.poner(c, id)
				if n > 1 then
					texto({ Size = UDim2.new(1, 0, 0, 14), Position = UDim2.new(0, 0, 1, -12), Text = tostring(n), TextSize = 13, Font = FUENTE_N,
						TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 9 }, c)
				end
				x += S
			end
			icono(o.costo[1], o.costo[2])
			if o.costo2 then
				icono(o.costo2[1], o.costo2[2])
			end
			texto({ Position = UDim2.fromOffset(x, 6), Size = UDim2.fromOffset(30, S - 6), Text = "➜", TextSize = 22, ZIndex = 8 }, b)
			x += 30
			icono(o.da[1], o.da[2])
			texto({ Position = UDim2.fromOffset(x + 6, 6), Size = UDim2.new(1, -x - 12, 0, S - 6), Text = o.agotada and "Agotado" or (o.nombre or Registro.nombre(o.da[1])),
				TextSize = 13, TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true, ZIndex = 8,
				TextColor3 = o.agotada and Color3.fromRGB(255, 120, 120) or Color3.new(1, 1, 1) }, b)
		end
	end
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
local function idDe(k)
	return Registro.B[k] or Registro.I[k]
end
-- Menú principal: el mundo se ve desenfocado detrás
local menu = nuevo("Frame", { Name = "Menu", BackgroundColor3 = Color3.fromRGB(8, 12, 22), BackgroundTransparency = 0.35, BorderSizePixel = 0,
	Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 10 }, gui)
nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(60, 90, 140), Color3.fromRGB(8, 12, 22)),
	Transparency = NumberSequence.new(0.35, 0) }, menu)
nuevo("TextButton", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Text = "", Modal = true, ZIndex = 10, AutoButtonColor = false }, menu)
local desenfoque = Instance.new("BlurEffect")
desenfoque.Name = "DesenfoqueMenu"
desenfoque.Size = 0
desenfoque.Parent = game:GetService("Lighting")
-- Título con sombra y la frase amarilla que late (como en Minecraft)
texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 5, 0.06, 5), Size = UDim2.fromOffset(700, 90), Text = "BLOCKVERSE", Font = FUENTE_N,
	TextSize = 84, TextColor3 = Color3.fromRGB(30, 30, 40), TextStrokeTransparency = 1, TextTransparency = 0.3, ZIndex = 11 }, menu)
texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0.06), Size = UDim2.fromOffset(700, 90), Text = "BLOCKVERSE", Font = FUENTE_N,
	TextSize = 84, TextColor3 = Color3.fromRGB(255, 255, 255), TextStrokeTransparency = 0, TextStrokeColor3 = Color3.fromRGB(40, 40, 40), ZIndex = 12 }, menu)
local FRASES = { "¡Edición Roblox!", "¡Ahora con kits!", "¡Cuidado con los creepers!", "¡Protege tu cama!", "¡Hecho bloque a bloque!",
	"¡Con Mazmorras y Leyendas!", "¡Los bots ya tienden puentes!", "¡Dale a la G!" }
local frase = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 250, 0.06, 88), Size = UDim2.fromOffset(320, 30),
	Text = FRASES[math.random(1, #FRASES)], TextColor3 = Color3.fromRGB(255, 255, 80), TextSize = 20, Font = FUENTE_N, ZIndex = 13, Rotation = -12,
	TextStrokeColor3 = Color3.fromRGB(60, 60, 0), TextStrokeTransparency = 0 }, menu)
local fraseEscala = nuevo("UIScale", {}, frase)

-- Tarjetas de los modos: icono, nombre y una línea de explicación
local menuCaja = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0.25), Size = UDim2.fromOffset(568, 250), ZIndex = 11 }, menu)
nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(278, 74), CellPadding = UDim2.fromOffset(12, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center,
	SortOrder = Enum.SortOrder.LayoutOrder }, menuCaja)
local iconosMenu = {} -- se vuelven a poner al abrir el menú (al principio aún no están cargados)
local function tarjeta(padre, txt, sub, icono, orden, alClic, tam)
	local b = nuevo("TextButton", { Text = "", AutoButtonColor = false, BackgroundColor3 = Color3.fromRGB(52, 54, 62), BackgroundTransparency = 0.08,
		BorderSizePixel = 0, LayoutOrder = orden, ZIndex = 12, Size = tam or UDim2.fromOffset(278, 74) }, padre)
	nuevo("UICorner", { CornerRadius = UDim.new(0, 6) }, b)
	local borde = nuevo("UIStroke", { Color = Color3.fromRGB(20, 20, 24), Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
	local esc = nuevo("UIScale", {}, b)
	local hay = icono ~= nil
	if hay then
		local fondoIc = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(30, 31, 36), BorderSizePixel = 0, Position = UDim2.fromOffset(10, 10),
			Size = UDim2.new(0, 54, 1, -20), ZIndex = 13 }, b)
		nuevo("UICorner", { CornerRadius = UDim.new(0, 4) }, fondoIc)
		local ic = nuevo("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5),
			Size = UDim2.fromOffset(40, 40), ResampleMode = Enum.ResamplerMode.Pixelated, ZIndex = 14 }, fondoIc)
		Iconos.poner(ic, icono)
		iconosMenu[ic] = icono
	end
	local x = hay and 76 or 12
	texto({ Position = UDim2.fromOffset(x, sub and 12 or 0), Size = UDim2.new(1, -x - 8, 0, sub and 24 or 1), Text = txt, TextSize = 20, Font = FUENTE_N,
		TextXAlignment = hay and Enum.TextXAlignment.Left or Enum.TextXAlignment.Center, ZIndex = 13 }, b).Size = sub and UDim2.new(1, -x - 8, 0, 24) or UDim2.new(1, -x - 8, 1, 0)
	if sub then
		texto({ Position = UDim2.fromOffset(x, 38), Size = UDim2.new(1, -x - 10, 0, 28), Text = sub, TextSize = 11, TextWrapped = true, Font = FUENTE,
			TextColor3 = Color3.fromRGB(200, 205, 215), TextStrokeTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left,
			TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 13 }, b)
	end
	b.MouseEnter:Connect(function()
		b.BackgroundColor3 = Color3.fromRGB(78, 82, 96)
		borde.Color = Color3.fromRGB(255, 220, 80)
		esc.Scale = 1.03
	end)
	b.MouseLeave:Connect(function()
		b.BackgroundColor3 = Color3.fromRGB(52, 54, 62)
		borde.Color = Color3.fromRGB(20, 20, 24)
		esc.Scale = 1
	end)
	b.Activated:Connect(alClic)
	return b
end
local function opcionMenu(txt, sub, modo, icono, orden)
	return tarjeta(menuCaja, txt, sub, idDe(icono), orden, function()
		Interfaz.enJuego = true
		Interfaz.alElegirModo(modo)
	end)
end
opcionMenu("Supervivencia", "Recoge recursos, fabrica y sobrevive a la noche", "supervivencia", "pico_hierro", 1)
opcionMenu("Creativo", "Todos los bloques y objetos, vuelo y sin daño", "creativo", "cesped", 2)
opcionMenu("One Block", "Empieza en un solo bloque que se regenera", "oneblock", "tierra", 3)
opcionMenu("Bed Wars", "Equipos en islas: protege tu cama y rompe las demás", "bedwars", "cama", 4)
opcionMenu("Mazmorras", "Salas con enemigos, botín, artefactos y un jefe", "mazmorras", "espada_diamante", 5)
opcionMenu("Leyendas", "Defiende la aldea, construye y manda a tus golems", "leyendas", "escudo", 6)
-- Fila de abajo: ajustes, controles y volver al juego
local filaMenu = nuevo("Frame", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0.25, 266),
	Size = UDim2.fromOffset(568, 46), ZIndex = 11 }, menu)
nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center,
	SortOrder = Enum.SortOrder.LayoutOrder }, filaMenu)
local abrirAjustes, abrirControles -- se definen más abajo
tarjeta(filaMenu, "Ajustes", nil, nil, 1, function()
	abrirAjustes()
end, UDim2.fromOffset(176, 46))
tarjeta(filaMenu, "Controles", nil, nil, 2, function()
	abrirControles()
end, UDim2.fromOffset(176, 46))
local botonVolver = tarjeta(filaMenu, "Volver al juego", nil, nil, 3, function()
	Interfaz.menu(false)
	if Interfaz.alMenu then
		Interfaz.alMenu()
	end
end, UDim2.fromOffset(192, 46))
botonVolver.Visible = false
texto({ AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 14, 1, -10), Size = UDim2.fromOffset(400, 18), Text = "Blockverse · edición Roblox",
	TextSize = 13, TextXAlignment = Enum.TextXAlignment.Left, TextTransparency = 0.3, ZIndex = 11 }, menu)
texto({ AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -14, 1, -10), Size = UDim2.fromOffset(420, 18), Text = "M abre este menú en cualquier momento",
	TextSize = 13, TextXAlignment = Enum.TextXAlignment.Right, TextTransparency = 0.3, ZIndex = 11 }, menu)

-- Ventana sencilla (ajustes, controles) por encima del menú
local function ventana(nombre, titulo, alto)
	local fondo = nuevo("TextButton", { Name = nombre, Text = "", AutoButtonColor = false, Modal = true, BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.45, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 20 }, gui)
	local caja = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(36, 38, 46), BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(470, alto), ZIndex = 21 }, fondo)
	nuevo("UICorner", { CornerRadius = UDim.new(0, 8) }, caja)
	nuevo("UIStroke", { Color = Color3.fromRGB(255, 220, 80), Thickness = 2 }, caja)
	texto({ Position = UDim2.fromOffset(0, 12), Size = UDim2.new(1, 0, 0, 30), Text = titulo, Font = FUENTE_N, TextSize = 24, ZIndex = 22 }, caja)
	local lista = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(20, 54), Size = UDim2.new(1, -40, 1, -120), ZIndex = 22 }, caja)
	nuevo("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, lista)
	local listo = tarjeta(caja, "Listo", nil, nil, 0, function()
		fondo.Visible = false
	end, UDim2.fromOffset(160, 42))
	listo.AnchorPoint = Vector2.new(0.5, 1)
	listo.Position = UDim2.new(0.5, 0, 1, -14)
	return fondo, lista
end

-- Ajustes: valores que guarda el cliente (y el servidor en el DataStore)
Interfaz.ajustes = { sensibilidad = 1, fov = 70, fovCorrer = true, balanceo = true, numeros = true, volumen = 100 }
Interfaz.alCambiarAjuste = function(clave, valor) end
local AJUSTES = {
	{ k = "sensibilidad", n = "Sensibilidad del ratón", min = 0.2, max = 3, paso = 0.1, fmt = function(v) return ("%.1fx"):format(v) end },
	{ k = "fov", n = "Campo de visión", min = 50, max = 110, paso = 5, fmt = function(v) return ("%d°"):format(v) end },
	{ k = "volumen", n = "Volumen", min = 0, max = 100, paso = 10, fmt = function(v) return ("%d %%"):format(v) end },
	{ k = "fovCorrer", n = "Efecto de velocidad al correr" },
	{ k = "balanceo", n = "Balanceo de la mano" },
	{ k = "numeros", n = "Números de daño" },
}
local ventanaAjustes, listaAjustes = ventana("Ajustes", "AJUSTES", 400)
local valoresAj = {}
local function pintarAjustes()
	for _, A in AJUSTES do
		local v = Interfaz.ajustes[A.k]
		local l = valoresAj[A.k]
		if l then
			if A.fmt then
				l.Text = A.fmt(v)
			else
				l.Text = v and "Sí" or "No"
				l.TextColor3 = v and Color3.fromRGB(120, 255, 120) or Color3.fromRGB(255, 120, 120)
			end
		end
	end
end
Interfaz.pintarAjustes = pintarAjustes
for i, A in AJUSTES do
	local fila = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(28, 29, 35), BorderSizePixel = 0, Size = UDim2.new(1, 0, 0, 38), LayoutOrder = i, ZIndex = 22 }, listaAjustes)
	nuevo("UICorner", { CornerRadius = UDim.new(0, 4) }, fila)
	texto({ Position = UDim2.fromOffset(12, 0), Size = UDim2.new(1, -170, 1, 0), Text = A.n, TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 23 }, fila)
	local function cambiar(dir)
		local v = Interfaz.ajustes[A.k]
		if A.fmt then
			v = math.clamp(math.floor((v + dir * A.paso) / A.paso + 0.5) * A.paso, A.min, A.max)
		else
			v = not v
		end
		Interfaz.ajustes[A.k] = v
		pintarAjustes()
		Interfaz.alCambiarAjuste(A.k, v)
	end
	if A.fmt then
		local menos = tarjeta(fila, "−", nil, nil, 0, function() cambiar(-1) end, UDim2.fromOffset(32, 30))
		menos.Position = UDim2.new(1, -152, 0, 4)
		valoresAj[A.k] = texto({ Position = UDim2.new(1, -116, 0, 0), Size = UDim2.fromOffset(76, 38), Text = "", TextSize = 15, Font = FUENTE_N, ZIndex = 23 }, fila)
		local mas = tarjeta(fila, "+", nil, nil, 0, function() cambiar(1) end, UDim2.fromOffset(32, 30))
		mas.Position = UDim2.new(1, -38, 0, 4)
	else
		local b = tarjeta(fila, "", nil, nil, 0, function() cambiar(0) end, UDim2.fromOffset(76, 30))
		b.Position = UDim2.new(1, -82, 0, 4)
		valoresAj[A.k] = texto({ Size = UDim2.fromScale(1, 1), Text = "", TextSize = 15, Font = FUENTE_N, ZIndex = 14 }, b)
	end
end
pintarAjustes()
abrirAjustes = function()
	pintarAjustes()
	ventanaAjustes.Visible = true
end
Interfaz.abrirAjustes = abrirAjustes

-- Controles
local ventanaControles, listaControles = ventana("Controles", "CONTROLES", 520)
local CONTROLES = {
	{ "WASD", "Moverse" }, { "Espacio", "Saltar (doble: volar en creativo)" }, { "Ctrl / Mayús", "Correr / agacharse" },
	{ "Clic izquierdo", "Picar y atacar" }, { "Clic derecho", "Usar, poner, comer, tensar el arco" }, { "1-9 y rueda", "Elegir objeto" },
	{ "E", "Inventario" }, { "Q", "Tirar (Ctrl: toda la pila)" }, { "V", "Primera o tercera persona" }, { "F", "Volar (creativo)" },
	{ "G", "Habilidad del kit (Bed Wars)" }, { "M", "Este menú" }, { "F3", "Información" },
}
for i, c in CONTROLES do
	local fila = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 26), LayoutOrder = i, ZIndex = 22 }, listaControles)
	local tecla = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(70, 72, 84), BorderSizePixel = 0, Size = UDim2.fromOffset(130, 24), ZIndex = 22 }, fila)
	nuevo("UICorner", { CornerRadius = UDim.new(0, 4) }, tecla)
	texto({ Size = UDim2.fromScale(1, 1), Text = c[1], TextSize = 13, Font = FUENTE_N, ZIndex = 23 }, tecla)
	texto({ Position = UDim2.fromOffset(142, 0), Size = UDim2.new(1, -142, 1, 0), Text = c[2], TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 23 }, fila)
end
abrirControles = function()
	ventanaControles.Visible = true
end

-- La frase amarilla late
RunService.RenderStepped:Connect(function()
	if menu.Visible then
		fraseEscala.Scale = 1 + math.abs(math.sin(os.clock() * 4)) * 0.08
	end
end)

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
	if abierta == "extra" then
		pintarExtra(d.extra)
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
	return menu.Visible or carga.Visible or muerte.Visible or ventanaAjustes.Visible or ventanaControles.Visible
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
	obActivo = d ~= nil
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

-- Panel lateral de un modo: d = {titulo, col, lineas = {{t, c}}, botones = {{t, cmd, arg, activo}}} o nil
function Interfaz.panel(d)
	if not d then
		lateral.Visible = false
		return
	end
	lateral.Visible = true
	for _, h in lateral:GetChildren() do
		if h:IsA("GuiObject") then
			h:Destroy()
		end
	end
	local function color(c, def)
		local ok, v = pcall(Color3.fromHex, c or def)
		return ok and v or Color3.new(1, 1, 1)
	end
	local orden = 0
	local function o()
		orden += 1
		return orden
	end
	texto({ Size = UDim2.new(1, 0, 0, 22), Text = d.titulo or "", Font = FUENTE_N, TextSize = 17, TextColor3 = color(d.col, "#ffff55"), LayoutOrder = o() }, lateral)
	for _, l in d.lineas or {} do
		-- Las líneas largas pasan a la siguiente sin pisar a las de abajo
		texto({ Size = UDim2.new(1, 0, 0, l.t == "" and 8 or 16), AutomaticSize = l.t ~= "" and Enum.AutomaticSize.Y or Enum.AutomaticSize.None, Text = l.t or "",
			TextSize = 13, Font = Enum.Font.Code, TextColor3 = color(l.c, "#ffffff"), TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true,
			LayoutOrder = o() }, lateral)
	end
	if d.botones and #d.botones > 0 then
		nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 4), LayoutOrder = o() }, lateral)
	end
	for _, bt in d.botones or {} do
		-- Botón con el nombre y, debajo y más pequeño, lo que cuesta
		local b = boton(bt.sub and "" or (bt.t or ""), { Size = UDim2.new(1, 0, 0, bt.sub and 34 or 22), TextSize = 12, LayoutOrder = o(),
			BackgroundColor3 = bt.activo and Color3.fromHex("4f6f4f") or Color3.fromHex("555555"), TextXAlignment = Enum.TextXAlignment.Left }, lateral, function()
			Interfaz.enviar("modoCmd", bt.cmd, bt.arg)
		end)
		b.TextTransparency = bt.activo and 0 or 0.4
		nuevo("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 4) }, b)
		if bt.sub then
			texto({ Position = UDim2.fromOffset(0, 3), Size = UDim2.new(1, 0, 0, 15), Text = bt.t or "", TextSize = 12, TextXAlignment = Enum.TextXAlignment.Left,
				TextTransparency = bt.activo and 0 or 0.4 }, b)
			texto({ Position = UDim2.fromOffset(0, 18), Size = UDim2.new(1, 0, 0, 13), Text = bt.sub, TextSize = 10, Font = Enum.Font.Code,
				TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = bt.activo and Color3.fromRGB(200, 255, 200) or Color3.fromRGB(255, 160, 160) }, b)
		end
	end
end

-- Registro de bajas de Bed Wars (arriba a la derecha): cada línea se borra sola a los 6 s
local feed = nuevo("Frame", { Name = "RegistroBajas", BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -10, 0, 60),
	Size = UDim2.fromOffset(330, 140) }, hud)
nuevo("UIListLayout", { Padding = UDim.new(0, 2), SortOrder = Enum.SortOrder.LayoutOrder, HorizontalAlignment = Enum.HorizontalAlignment.Right }, feed)
local feedN = 0
function Interfaz.feed(t, col)
	if not t then
		for _, h in feed:GetChildren() do
			if h:IsA("GuiObject") then
				h:Destroy()
			end
		end
		return
	end
	feedN += 1
	local ok, c = pcall(Color3.fromHex, col or "#ffffff")
	local l = texto({ Size = UDim2.fromOffset(330, 18), AutomaticSize = Enum.AutomaticSize.X, Text = "  " .. t .. "  ", TextSize = 13, BackgroundTransparency = 0.55,
		BackgroundColor3 = Color3.new(0, 0, 0), TextColor3 = ok and c or Color3.new(1, 1, 1), TextXAlignment = Enum.TextXAlignment.Right, LayoutOrder = feedN }, feed)
	local lineas = {}
	for _, h in feed:GetChildren() do
		if h:IsA("GuiObject") then
			table.insert(lineas, h)
		end
	end
	table.sort(lineas, function(a, b)
		return a.LayoutOrder < b.LayoutOrder
	end)
	for i = 1, #lineas - 6 do
		lineas[i]:Destroy()
	end
	task.delay(6, function()
		if l.Parent then
			TweenService:Create(l, TweenInfo.new(0.5), { TextTransparency = 1, TextStrokeTransparency = 1, BackgroundTransparency = 1 }):Play()
			task.delay(0.6, function()
				l:Destroy()
			end)
		end
	end)
end

-- Pantalla final de Bed Wars: resultado, estadísticas, MVP, monedas, nivel y misiones
local fin = nuevo("Frame", { Name = "FinBW", BackgroundColor3 = Color3.fromRGB(8, 10, 18), BackgroundTransparency = 0.06, BorderSizePixel = 0,
	AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(440, 380), Visible = false, ZIndex = 20 }, gui)
nuevo("UICorner", { CornerRadius = UDim.new(0, 10) }, fin)
local finBorde = nuevo("UIStroke", { Color = Color3.fromRGB(255, 220, 80), Thickness = 3 }, fin)
local finT = texto({ Position = UDim2.fromOffset(0, 14), Size = UDim2.new(1, 0, 0, 44), Text = "", Font = FUENTE_N, TextSize = 38, ZIndex = 21 }, fin)
local finSub = texto({ Position = UDim2.fromOffset(0, 58), Size = UDim2.new(1, 0, 0, 20), Text = "", TextSize = 15, ZIndex = 21 }, fin)
local finStats = texto({ Position = UDim2.fromOffset(20, 88), Size = UDim2.new(1, -40, 0, 92), Text = "", TextSize = 14, Font = Enum.Font.Code, TextWrapped = true,
	TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 21 }, fin)
local finPremio = texto({ Position = UDim2.fromOffset(20, 182), Size = UDim2.new(1, -40, 0, 22), Text = "", TextSize = 17, TextColor3 = Color3.fromRGB(255, 216, 74),
	TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, fin)
local finNivelT = texto({ Position = UDim2.fromOffset(20, 206), Size = UDim2.new(1, -40, 0, 18), Text = "", TextSize = 13, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, fin)
local finNivelB = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(30, 30, 40), BorderSizePixel = 0, Position = UDim2.fromOffset(20, 226), Size = UDim2.new(1, -40, 0, 8), ZIndex = 21 }, fin)
local finNivelF = nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(110, 200, 255), BorderSizePixel = 0, Size = UDim2.fromScale(0, 1), ZIndex = 22 }, finNivelB)
local finMis = texto({ Position = UDim2.fromOffset(20, 242), Size = UDim2.new(1, -40, 0, 56), Text = "", TextSize = 12, TextWrapped = true, TextColor3 = Color3.fromRGB(150, 255, 150),
	TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 21 }, fin)
local finHilo = 0
boton("Jugar otra vez", { Position = UDim2.new(0, 20, 1, -62), Size = UDim2.new(0.5, -26, 0, 44), TextSize = 17, ZIndex = 22,
	BackgroundColor3 = Color3.fromRGB(70, 140, 70) }, fin, function()
	fin.Visible = false
	if jugador:GetAttribute("BedWars") then
		Interfaz.enviar("modoCmd", "otraVez")
		Interfaz.aviso("Entrarás en la siguiente partida de Bed Wars")
	else
		-- La partida ya se cerró: se entra en una nueva
		Interfaz.alElegirModo("bedwars")
	end
end)
boton("Volver al menú", { Position = UDim2.new(0.5, 6, 1, -62), Size = UDim2.new(0.5, -26, 0, 44), TextSize = 17, ZIndex = 22 }, fin, function()
	fin.Visible = false
	Interfaz.menu(true)
	if Interfaz.alMenu then
		Interfaz.alMenu()
	end
end)
function Interfaz.finBW(d)
	finHilo += 1
	if not d then
		fin.Visible = false
		return
	end
	local yo = finHilo
	local ok, c = pcall(Color3.fromHex, d.colGanador or "#aaaaaa")
	finT.Text = d.gano and "¡VICTORIA!" or (d.ganador and "DERROTA" or "EMPATE")
	finT.TextColor3 = d.gano and Color3.fromRGB(255, 230, 80) or Color3.fromRGB(255, 90, 90)
	finBorde.Color = d.gano and Color3.fromRGB(255, 220, 80) or Color3.fromRGB(120, 120, 140)
	finSub.Text = d.ganador and ("Gana el equipo " .. d.ganador) or "Nadie gana esta vez"
	finSub.TextColor3 = ok and c or Color3.new(1, 1, 1)
	finStats.Text = ("Bajas: %d    Bajas finales: %d\nCamas rotas: %d    Muertes: %d\nMejor racha: %d    Tiempo: %s\nMVP: %s"):format(d.bajas or 0, d.finales or 0,
		d.camas or 0, d.muertes or 0, d.mejorRacha or 0, d.tiempo or "", d.mvp and (d.mvp .. (d.soyMvp and "  (¡tú!)" or "")) or "nadie")
	if d.jugo then
		finPremio.Text = ("+%d monedas · +%d xp   (tienes %d)"):format(d.monedas or 0, d.xp or 0, d.totalMonedas or 0)
		finNivelT.Text = ("Nivel %d★%s%s"):format(d.nivel or 1, d.subeNivel and "  ¡SUBES DE NIVEL!" or "", (d.racha or 0) >= 2 and ("  · %d victorias seguidas"):format(d.racha) or "")
		finNivelF.Size = UDim2.fromScale(0, 1)
		TweenService:Create(finNivelF, TweenInfo.new(1.2, Enum.EasingStyle.Quad), { Size = UDim2.fromScale(math.clamp(d.progresoNivel or 0, 0, 1), 1) }):Play()
	else
		finPremio.Text = "Has mirado la partida: juega la siguiente para ganar monedas"
		finNivelT.Text = ""
	end
	finNivelB.Visible = d.jugo == true
	-- El título grande de la partida se quita: la pantalla final ya lo dice
	tituloHilo += 1
	for _, l in { titulo, subtitulo } do
		l.TextTransparency = 1
		l.TextStrokeTransparency = 1
	end
	finMis.Text = d.misiones and #d.misiones > 0 and ("Misiones completadas:\n· " .. table.concat(d.misiones, "\n· ")) or ""
	fin.Visible = true
	task.delay(20, function()
		if yo == finHilo then
			fin.Visible = false
		end
	end)
end

-- Botón táctil de la habilidad del kit (Bed Wars)
local botonHab
function Interfaz.botonHabilidad(si, alPulsar)
	if not UserInputService.TouchEnabled then
		return
	end
	if not botonHab then
		botonHab = nuevo("TextButton", { Text = "G", Font = FUENTE_N, TextSize = 24, TextColor3 = Color3.fromRGB(255, 220, 80), BackgroundColor3 = Color3.new(0, 0, 0),
			BackgroundTransparency = 0.4, Size = UDim2.fromOffset(60, 60), AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -240, 1, -170), AutoButtonColor = true }, hud)
		nuevo("UICorner", { CornerRadius = UDim.new(1, 0) }, botonHab)
		nuevo("UIStroke", { Color = Color3.fromRGB(255, 220, 80), Thickness = 2 }, botonHab)
		botonHab.Activated:Connect(function()
			if botonHab:GetAttribute("activo") and alPulsar then
				alPulsar()
			end
		end)
	end
	botonHab.Visible = si
	botonHab:SetAttribute("activo", si)
end

-- Barra de un jefe (el Ender Dragon): d = {nombre, f (0-1), col} o nil
function Interfaz.jefe(d)
	if not d then
		if not obActivo then
			jefe.Visible = false
		end
		return
	end
	jefe.Visible = true
	jefeT.Text = d.nombre or ""
	local ok, c = pcall(Color3.fromHex, d.col or "#d050ff")
	jefeF.BackgroundColor3 = ok and c or Color3.fromRGB(208, 80, 255)
	jefeF.Size = UDim2.fromScale(math.clamp(d.f or 0, 0, 1), 1)
	jefeSig.Text = ""
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
	if si then
		for ic, id in iconosMenu do
			Iconos.poner(ic, id)
		end
	end
	-- Debajo del menú no se ve la barra ni los corazones, y el mundo se desenfoca
	hud.Visible = not si
	desenfoque.Size = si and 14 or 0
	botonVolver.Visible = si and Interfaz.enJuego == true
	if not si then
		ventanaAjustes.Visible = false
		ventanaControles.Visible = false
	end
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

local manoVisible = false
function Interfaz.mostrarMano(si)
	manoVisible = si
	-- Con la mano 3D (Modelos3D) la de dibujo no hace falta
	mano.Visible = si and not Interfaz.mano3D
end
function Interfaz.manoVisible()
	return manoVisible and not Interfaz.menuVisible() and not Interfaz.abierto()
end
function Interfaz.balanceoMano()
	return balanceo
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
		local bob = math.sin(t * 9) * 6 * andar * (Interfaz.ajustes.balanceo and 1 or 0)
		local giro = math.sin(balanceo * math.pi) * 40
		mano.Position = UDim2.new(1, -40 - giro, 1, 30 + bob + math.sin(balanceo * math.pi) * 30)
		mano.Rotation = -giro * 0.5
	end)
end

return Interfaz
