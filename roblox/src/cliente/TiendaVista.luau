--[[
	Blockverse para Roblox · Tienda con Robux (cliente)
	· Ventana con cuatro pestañas: Destacado (el VIP en grande y lo mejor de cada cosa),
	  Pases, Monedas y Modos (lo que se puede comprar dentro de cada modo).
	· Cada tarjeta dice claro qué das y qué recibes; si algo ya lo tienes o ahora no se
	  puede usar, el botón lo dice en vez de dejarte pagar.
	· Al comprar: confeti, «¡GRACIAS!» y lo que has recibido.
	· La etiqueta [VIP] dorada sale en el chat delante del nombre.
]]
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp:WaitForChild("Registro"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))

local jugador = Players.LocalPlayer
local TiendaVista = {}
TiendaVista.enviar = function(...) end
TiendaVista.alSonido = function(nombre, tono) end
TiendaVista.alVisible = function(si) end

local FUENTE = Enum.Font.GothamBold
local FUENTE_N = Enum.Font.GothamBlack
local ORO = Color3.fromRGB(255, 200, 60)
local VERDE = Color3.fromRGB(60, 180, 80)
local FONDO = Color3.fromRGB(26, 28, 40)
local TARJETA = Color3.fromRGB(40, 43, 58)
local COLOR_MODO = { mazmorras = Color3.fromRGB(128, 74, 200), leyendas = Color3.fromRGB(224, 150, 40), supervivencia = Color3.fromRGB(78, 160, 62) }
local NOMBRE_MODO = { mazmorras = "MAZMORRAS", leyendas = "LEYENDAS", supervivencia = "SUPERVIVENCIA" }

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
	return t
end
local function esquina(o, r)
	nuevo("UICorner", { CornerRadius = UDim.new(0, r or 8) }, o)
end
local function hex(c, def)
	local ok, v = pcall(Color3.fromHex, c or "")
	return ok and v or def
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
local gui = nuevo("ScreenGui", { Name = "TiendaRobux", ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 30, ZIndexBehavior = Enum.ZIndexBehavior.Sibling })
local velo = nuevo("TextButton", { Name = "Velo", BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.35, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1),
	Text = "", AutoButtonColor = false, Modal = true, Visible = false }, gui)
local ventana = nuevo("Frame", { Name = "Ventana", AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(880, 560),
	BackgroundColor3 = FONDO, BorderSizePixel = 0 }, velo)
esquina(ventana, 14)
nuevo("UIStroke", { Color = ORO, Thickness = 3 }, ventana)
local escVentana = nuevo("UIScale", {}, ventana)
-- Se encoge si la pantalla es pequeña (móviles)
local function ajustar()
	local cam = workspace.CurrentCamera
	local v = cam and cam.ViewportSize
	if v and v.X and v.X > 0 then
		return math.min(1, (v.X - 20) / 880, (v.Y - 20) / 560)
	end
	return 1
end

-- Cabecera dorada
local cab = nuevo("Frame", { BackgroundColor3 = ORO, BorderSizePixel = 0, Size = UDim2.new(1, 0, 0, 70) }, ventana)
esquina(cab, 14)
nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(255, 235, 140), Color3.fromRGB(235, 150, 25)) }, cab)
nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(235, 150, 25), BorderSizePixel = 0, Position = UDim2.new(0, 0, 1, -14), Size = UDim2.new(1, 0, 0, 14) }, cab)
local icCab = nuevo("ImageLabel", { BackgroundTransparency = 1, Position = UDim2.fromOffset(16, 9), Size = UDim2.fromOffset(52, 52), ResampleMode = Enum.ResamplerMode.Pixelated }, cab)
texto({ Position = UDim2.fromOffset(80, 8), Size = UDim2.fromOffset(400, 34), Text = "TIENDA", TextSize = 32, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left,
	TextStrokeColor3 = Color3.fromRGB(110, 60, 0), TextStrokeTransparency = 0 }, cab)
texto({ Position = UDim2.fromOffset(80, 42), Size = UDim2.fromOffset(500, 18), Text = "Consigue ventajas y apoya Blockverse", TextSize = 14,
	TextColor3 = Color3.fromRGB(90, 45, 0), TextStrokeTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left }, cab)
local monedasF = nuevo("Frame", { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -70, 0.5, 0), Size = UDim2.fromOffset(190, 38),
	BackgroundColor3 = Color3.fromRGB(60, 35, 0), BackgroundTransparency = 0.3, BorderSizePixel = 0 }, cab)
esquina(monedasF, 19)
local icMon = nuevo("ImageLabel", { BackgroundTransparency = 1, Position = UDim2.fromOffset(8, 5), Size = UDim2.fromOffset(28, 28), ResampleMode = Enum.ResamplerMode.Pixelated }, monedasF)
local monedasT = texto({ Position = UDim2.fromOffset(42, 0), Size = UDim2.new(1, -48, 1, 0), Text = "0", TextSize = 18, Font = FUENTE_N,
	TextColor3 = Color3.fromRGB(255, 225, 110), TextXAlignment = Enum.TextXAlignment.Left }, monedasF)
local cerrar = nuevo("TextButton", { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -14, 0.5, 0), Size = UDim2.fromOffset(44, 44), BackgroundColor3 = Color3.fromRGB(200, 60, 60),
	BorderSizePixel = 0, Text = "✕", Font = FUENTE_N, TextSize = 22, TextColor3 = Color3.new(1, 1, 1) }, cab)
esquina(cerrar, 22)

-- Pestañas
local PESTANAS = { { "destacado", "★ Destacado" }, { "pases", "Pases" }, { "monedas", "Monedas" }, { "modos", "Para cada modo" } }
local filaPest = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(20, 80), Size = UDim2.new(1, -40, 0, 38) }, ventana)
nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }, filaPest)
local botonesPest = {}
local cuerpo = nuevo("ScrollingFrame", { BackgroundTransparency = 1, BorderSizePixel = 0, Position = UDim2.fromOffset(20, 128), Size = UDim2.new(1, -40, 1, -164),
	ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y }, ventana)
local pie = texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -8), Size = UDim2.new(1, -40, 0, 20), TextSize = 12,
	TextColor3 = Color3.fromRGB(160, 165, 180), TextStrokeTransparency = 1,
	Text = "Pagas con Robux a través de Roblox. Las monedas solo sirven dentro de Blockverse." }, ventana)

local datos, pestana = nil, "destacado"
local pintar -- más abajo

for i, p in PESTANAS do
	local b = nuevo("TextButton", { Size = UDim2.fromOffset(i == 4 and 170 or 140, 38), BackgroundColor3 = TARJETA, BorderSizePixel = 0, Text = p[2], Font = FUENTE_N,
		TextSize = 15, TextColor3 = Color3.new(1, 1, 1), LayoutOrder = i, AutoButtonColor = true }, filaPest)
	esquina(b, 19)
	b.Activated:Connect(function()
		pestana = p[1]
		TiendaVista.alSonido("poner", 1.3)
		pintar()
	end)
	botonesPest[p[1]] = b
end

------------------------------------------------------------------
-- Piezas de las tarjetas
------------------------------------------------------------------
local function animarTarjeta(f, borde, colorBorde)
	local esc = nuevo("UIScale", {}, f)
	f.MouseEnter:Connect(function()
		TweenService:Create(esc, TweenInfo.new(0.15, Enum.EasingStyle.Back), { Scale = 1.03 }):Play()
		borde.Color = Color3.new(1, 1, 1)
		TiendaVista.alSonido("paso", 1.8)
	end)
	f.MouseLeave:Connect(function()
		TweenService:Create(esc, TweenInfo.new(0.15), { Scale = 1 }):Play()
		borde.Color = colorBorde
	end)
end

local function tarjeta(padre, tam, color, orden)
	local f = nuevo("Frame", { Size = tam, BackgroundColor3 = TARJETA, BorderSizePixel = 0, LayoutOrder = orden or 0 }, padre)
	esquina(f, 12)
	local borde = nuevo("UIStroke", { Color = color, Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, f)
	animarTarjeta(f, borde, color)
	return f
end

local function icono(padre, id, pos, tam, color)
	local caja = nuevo("Frame", { Position = pos, Size = UDim2.fromOffset(tam, tam), BackgroundColor3 = (color or ORO):Lerp(Color3.new(0, 0, 0), 0.6), BorderSizePixel = 0 }, padre)
	esquina(caja, 10)
	nuevo("UIStroke", { Color = color or ORO, Thickness = 2 }, caja)
	local im = nuevo("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromScale(0.72, 0.72), ResampleMode = Enum.ResamplerMode.Pixelated }, caja)
	Iconos.poner(im, id)
	return caja
end

local function cinta(padre, txt, color)
	local c = nuevo("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 6, 0, -10), Size = UDim2.fromOffset(math.max(70, #txt * 8 + 16), 22),
		BackgroundColor3 = color, BorderSizePixel = 0, ZIndex = 3 }, padre)
	esquina(c, 11)
	nuevo("UIStroke", { Color = Color3.new(0, 0, 0), Thickness = 1.5, Transparency = 0.4 }, c)
	texto({ Size = UDim2.fromScale(1, 1), Text = txt, TextSize = 11, Font = FUENTE_N, ZIndex = 4, TextStrokeTransparency = 0.5 }, c)
end

-- Botón de comprar: dice el precio, o por qué no se puede
local function botonCompra(padre, x, pos, tam)
	local txt, fondo, activo
	if x.tiene then
		txt, fondo, activo = "✔ YA ES TUYO", Color3.fromRGB(70, 74, 88), false
	elseif x.puede == false then
		txt, fondo, activo = x.motivo or "Ahora no", Color3.fromRGB(70, 74, 88), false
	else
		txt, fondo, activo = ("R$ %d"):format(x.precio or 0), VERDE, true
	end
	local b = nuevo("TextButton", { Position = pos, Size = tam, BackgroundColor3 = fondo, BorderSizePixel = 0, Text = txt, Font = FUENTE_N,
		TextSize = activo and 20 or 13, TextWrapped = true, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.5, AutoButtonColor = activo, ZIndex = 2 }, padre)
	esquina(b, 10)
	if activo then
		nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)) }, b)
		nuevo("UIStroke", { Color = Color3.fromRGB(20, 70, 20), Thickness = 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
		local esc = nuevo("UIScale", {}, b)
		b.Activated:Connect(function()
			esc.Scale = 0.92
			TweenService:Create(esc, TweenInfo.new(0.2, Enum.EasingStyle.Back), { Scale = 1 }):Play()
			TiendaVista.alSonido("poner", 1.1)
			TiendaVista.enviar("comprarRobux", x.clave)
		end)
	end
	if x.sinConfigurar then
		texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 1, 2), Size = UDim2.new(1, 0, 0, 14), Text = "SIN ID · gratis en Studio",
			TextSize = 10, TextColor3 = Color3.fromRGB(255, 160, 60), TextStrokeTransparency = 1 }, b)
	end
	return b
end

-- Ventajas una debajo de otra; las largas ocupan dos líneas sin pisar a la siguiente
local function lista(padre, x, px, py, ancho, tam)
	tam = tam or 14
	local porLinea = math.max(10, math.floor(ancho / (tam * 0.64)))
	local y = 0
	for _, v in x.ventajas or {} do
		local lineas = math.ceil((utf8.len(v) + 3) / porLinea)
		local alto = lineas * (tam + 3)
		texto({ Position = UDim2.fromOffset(px, py + y), Size = UDim2.fromOffset(ancho, alto), Text = "✔  " .. v, TextSize = tam,
			TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
			TextColor3 = Color3.fromRGB(215, 240, 215), TextStrokeTransparency = 1 }, padre)
		y += alto + 4
	end
	return y
end

local function buscar(clave)
	for _, x in datos and datos.lista or {} do
		if x.clave == clave then
			return x
		end
	end
	return nil
end

------------------------------------------------------------------
-- Pestañas
------------------------------------------------------------------
local function tarjetaPase(padre, x, orden, tam)
	local col = hex(x.color, ORO)
	local f = tarjeta(padre, tam or UDim2.fromOffset(266, 372), col, orden)
	if x.etiqueta then
		cinta(f, x.etiqueta, x.clave == "vip" and Color3.fromRGB(230, 50, 60) or Color3.fromRGB(40, 130, 230))
	end
	icono(f, x.icono, UDim2.new(0.5, -36, 0, 14), 72, col)
	texto({ Position = UDim2.fromOffset(10, 92), Size = UDim2.new(1, -20, 0, 30), Text = x.nombre, TextSize = 24, Font = FUENTE_N, TextColor3 = col }, f)
	texto({ Position = UDim2.fromOffset(14, 122), Size = UDim2.new(1, -28, 0, 36), Text = x.desc or "", TextSize = 13, TextWrapped = true,
		TextColor3 = Color3.fromRGB(200, 205, 220), TextStrokeTransparency = 1 }, f)
	lista(f, x, 16, 166, 236, 13)
	botonCompra(f, x, UDim2.new(0, 14, 1, -66), UDim2.new(1, -28, 0, 46))
	return f
end

local function tarjetaMonedas(padre, x, orden)
	local f = tarjeta(padre, UDim2.fromOffset(198, 300), ORO, orden)
	if x.etiqueta then
		cinta(f, x.etiqueta, x.etiqueta == "MEJOR VALOR" and Color3.fromRGB(230, 50, 60) or Color3.fromRGB(40, 130, 230))
	end
	icono(f, x.icono, UDim2.new(0.5, -40, 0, 18), 80, ORO)
	texto({ Position = UDim2.fromOffset(6, 106), Size = UDim2.new(1, -12, 0, 32), Text = x.nombre, TextSize = utf8.len(x.nombre) > 14 and 17 or 22, Font = FUENTE_N,
		TextColor3 = Color3.fromRGB(255, 225, 110) }, f)
	if x.extra then
		local e = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 142), Size = UDim2.fromOffset(120, 24), BackgroundColor3 = VERDE, BorderSizePixel = 0 }, f)
		esquina(e, 12)
		texto({ Size = UDim2.fromScale(1, 1), Text = x.extra, TextSize = 13, Font = FUENTE_N }, e)
	end
	texto({ Position = UDim2.fromOffset(10, 172), Size = UDim2.new(1, -20, 0, 50), Text = x.desc or "", TextSize = 13, TextWrapped = true,
		TextColor3 = Color3.fromRGB(200, 205, 220), TextStrokeTransparency = 1 }, f)
	botonCompra(f, x, UDim2.new(0, 12, 1, -62), UDim2.new(1, -24, 0, 44))
	return f
end

local function tarjetaModo(padre, x, orden)
	local col = COLOR_MODO[x.modo or ""] or ORO
	local f = tarjeta(padre, UDim2.new(1, -10, 0, 112), col, orden)
	icono(f, x.icono, UDim2.fromOffset(14, 14), 84, col)
	local insignia = nuevo("Frame", { Position = UDim2.fromOffset(112, 14), Size = UDim2.fromOffset(130, 20), BackgroundColor3 = col, BorderSizePixel = 0 }, f)
	esquina(insignia, 10)
	texto({ Size = UDim2.fromScale(1, 1), Text = NOMBRE_MODO[x.modo or ""] or "", TextSize = 11, Font = FUENTE_N }, insignia)
	texto({ Position = UDim2.fromOffset(112, 38), Size = UDim2.new(1, -330, 0, 28), Text = x.nombre, TextSize = 22, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, f)
	texto({ Position = UDim2.fromOffset(112, 68), Size = UDim2.new(1, -330, 0, 36), Text = x.desc or "", TextSize = 13, TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, TextColor3 = Color3.fromRGB(200, 205, 220), TextStrokeTransparency = 1 }, f)
	botonCompra(f, x, UDim2.new(1, -206, 0.5, -24), UDim2.fromOffset(190, 48))
	return f
end

local function rejilla(celda, sep)
	local g = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y }, cuerpo)
	nuevo("UIGridLayout", { CellSize = celda, CellPadding = UDim2.fromOffset(sep, sep + 6), HorizontalAlignment = Enum.HorizontalAlignment.Center,
		SortOrder = Enum.SortOrder.LayoutOrder }, g)
	nuevo("UIPadding", { PaddingTop = UDim.new(0, 14), PaddingBottom = UDim.new(0, 10) }, g)
	return g
end

local function pintarDestacado()
	local col = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, -10, 0, 0), AutomaticSize = Enum.AutomaticSize.Y }, cuerpo)
	nuevo("UIListLayout", { Padding = UDim.new(0, 18), SortOrder = Enum.SortOrder.LayoutOrder }, col)
	nuevo("UIPadding", { PaddingTop = UDim.new(0, 14), PaddingLeft = UDim.new(0, 4) }, col)
	-- El VIP en grande
	local vip = buscar("vip")
	if vip then
		local f = tarjeta(col, UDim2.new(1, 0, 0, 200), ORO, 1)
		f.BackgroundColor3 = Color3.fromRGB(58, 48, 20)
		nuevo("UIGradient", { Rotation = 0, Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(150, 150, 150)) }, f)
		cinta(f, vip.etiqueta or "★", Color3.fromRGB(230, 50, 60))
		icono(f, vip.icono, UDim2.fromOffset(24, 30), 140, ORO)
		texto({ Position = UDim2.fromOffset(188, 18), Size = UDim2.fromOffset(300, 44), Text = "VIP", TextSize = 42, Font = FUENTE_N, TextColor3 = ORO,
			TextXAlignment = Enum.TextXAlignment.Left, TextStrokeColor3 = Color3.fromRGB(90, 50, 0), TextStrokeTransparency = 0 }, f)
		texto({ Position = UDim2.fromOffset(190, 62), Size = UDim2.fromOffset(380, 20), Text = vip.desc or "", TextSize = 14,
			TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(255, 235, 180), TextStrokeTransparency = 1 }, f)
		lista(f, vip, 190, 90, 400)
		botonCompra(f, vip, UDim2.new(1, -230, 0.5, -30), UDim2.fromOffset(206, 60))
	end
	-- Debajo: el mejor paquete de monedas, Monedas x2 y lo que sirve en el modo en que estás
	local fila = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 2 }, col)
	nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 14), HorizontalAlignment = Enum.HorizontalAlignment.Center }, fila)
	nuevo("UIPadding", { PaddingTop = UDim.new(0, 10), PaddingBottom = UDim.new(0, 10) }, fila)
	local mejor = buscar("monedas7500") or buscar("monedas1200")
	if mejor then
		tarjetaMonedas(fila, mejor, 1)
	end
	local x2 = buscar("monedasX2")
	if x2 then
		tarjetaPase(fila, x2, 2, UDim2.fromOffset(266, 300))
	end
	for _, x in datos.lista do
		if x.grupo == "modos" and x.puede then
			tarjetaMonedas(fila, x, 3)
			break
		end
	end
end

pintar = function()
	if not datos then
		return
	end
	for k, b in botonesPest do
		b.BackgroundColor3 = k == pestana and ORO or TARJETA
		b.TextColor3 = k == pestana and Color3.fromRGB(60, 30, 0) or Color3.new(1, 1, 1)
	end
	monedasT.Text = ("%d monedas"):format(datos.monedas or 0)
	pie.Text = datos.studio and "En Studio: lo que no tiene ID se da gratis al pulsarlo, para probarlo. A los jugadores no les sale hasta que pongas su ID."
		or "Pagas con Robux a través de Roblox. Las monedas solo sirven dentro de Blockverse."
	limpiar(cuerpo)
	cuerpo.CanvasPosition = Vector2.new(0, 0)
	if pestana == "destacado" then
		pintarDestacado()
	elseif pestana == "pases" then
		local g = rejilla(UDim2.fromOffset(266, 372), 14)
		for i, x in datos.lista do
			if x.tipo == "pase" then
				tarjetaPase(g, x, i)
			end
		end
	elseif pestana == "monedas" then
		local g = rejilla(UDim2.fromOffset(198, 300), 12)
		for i, x in datos.lista do
			if x.grupo == "monedas" then
				tarjetaMonedas(g, x, i)
			end
		end
	else
		local g = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y }, cuerpo)
		nuevo("UIListLayout", { Padding = UDim.new(0, 14), SortOrder = Enum.SortOrder.LayoutOrder }, g)
		nuevo("UIPadding", { PaddingTop = UDim.new(0, 14), PaddingLeft = UDim.new(0, 4) }, g)
		for i, x in datos.lista do
			if x.grupo == "modos" then
				-- Primero lo que puedes usar ahora mismo
				tarjetaModo(g, x, (x.puede and 0 or 100) + i)
			end
		end
	end
	if #datos.lista == 0 then
		texto({ Size = UDim2.new(1, 0, 0, 80), Text = "La tienda abrirá muy pronto.", TextSize = 20, Font = FUENTE_N }, cuerpo)
	end
end

------------------------------------------------------------------
-- Abrir, cerrar y recibir
------------------------------------------------------------------
local function mostrar()
	if velo.Visible then
		return
	end
	Iconos.poner(icCab, Registro.B.bloqueOro or Registro.I.lingoteOro)
	Iconos.poner(icMon, Registro.I.pepitaOro)
	velo.Visible = true
	TiendaVista.alVisible(true)
	local final = ajustar()
	escVentana.Scale = final * 0.85
	TweenService:Create(escVentana, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = final }):Play()
end

function TiendaVista.abrir(p)
	pestana = p or pestana or "destacado"
	mostrar()
	if datos then
		pintar()
	end
	-- Pide los datos al servidor (precios, lo que ya tienes, lo que se puede usar ahora)
	TiendaVista.enviar("tiendaRobux", pestana)
end

function TiendaVista.cerrar()
	velo.Visible = false
	TiendaVista.alVisible(false)
end

function TiendaVista.visible()
	return velo.Visible
end

function TiendaVista.datos(d, p)
	datos = d
	if p then
		pestana = p
	end
	mostrar()
	pintar()
end

-- Al comprar: confeti y «¡GRACIAS!»
local fiesta = nuevo("Frame", { Name = "Gracias", BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 20 }, gui)
local graciasT = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.36), Size = UDim2.fromOffset(800, 80), Text = "¡GRACIAS!", TextSize = 72,
	Font = FUENTE_N, TextColor3 = ORO, TextStrokeColor3 = Color3.fromRGB(90, 50, 0), TextStrokeTransparency = 0, ZIndex = 22 }, fiesta)
local graciasEsc = nuevo("UIScale", {}, graciasT)
local graciasSub = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.46), Size = UDim2.fromOffset(800, 30), Text = "", TextSize = 24,
	Font = FUENTE_N, ZIndex = 22, TextStrokeTransparency = 0.3 }, fiesta)
local graciasHilo = 0
local CONFETI = { Color3.fromRGB(255, 80, 80), Color3.fromRGB(255, 210, 60), Color3.fromRGB(80, 200, 255), Color3.fromRGB(120, 230, 120), Color3.fromRGB(230, 120, 255) }

function TiendaVista.gracias(d)
	graciasHilo += 1
	local yo = graciasHilo
	fiesta.Visible = true
	graciasT.Text = "¡GRACIAS!"
	graciasSub.Text = (d and d.nombre or "") .. ((d and d.texto) and (" · " .. d.texto) or "")
	graciasEsc.Scale = 0.3
	TweenService:Create(graciasEsc, TweenInfo.new(0.5, Enum.EasingStyle.Elastic), { Scale = 1 }):Play()
	TiendaVista.alSonido("nivel", 1)
	for i = 1, 70 do
		local x0, giro = math.random(), math.random(0, 360)
		local c = nuevo("Frame", { BackgroundColor3 = CONFETI[(i % #CONFETI) + 1], BorderSizePixel = 0, Size = UDim2.fromOffset(math.random(8, 14), math.random(14, 22)),
			Position = UDim2.new(x0, 0, -0.05, -math.random(0, 200)), Rotation = giro, ZIndex = 21 }, fiesta)
		local dur = 1.6 + math.random() * 1.4
		TweenService:Create(c, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
			{ Position = UDim2.new(x0 + (math.random() - 0.5) * 0.2, 0, 1.1, 0), Rotation = giro + math.random(-540, 540) }):Play()
		task.delay(dur + 0.1, function()
			c:Destroy()
		end)
	end
	task.delay(3.2, function()
		if yo == graciasHilo then
			fiesta.Visible = false
		end
	end)
end

-- Quita el «¡GRACIAS!» al momento (para las capturas)
function TiendaVista.ocultarGracias()
	graciasHilo += 1
	fiesta.Visible = false
end

function TiendaVista.iniciar()
	gui.Parent = jugador:WaitForChild("PlayerGui")
	cerrar.Activated:Connect(function()
		TiendaVista.alSonido("poner", 0.9)
		TiendaVista.cerrar()
	end)
	-- Etiqueta [VIP] dorada en el chat
	pcall(function()
		local TCS = game:GetService("TextChatService")
		TCS.OnIncomingMessage = function(msg)
			local props = Instance.new("TextChatMessageProperties")
			local fuente = msg.TextSource
			local plr = fuente and Players:GetPlayerByUserId(fuente.UserId)
			if plr then
				-- Título del Camino de Blockverse y, delante, la etiqueta VIP
				local pre = msg.PrefixText
				local titulo = plr:GetAttribute("Titulo")
				if titulo then
					pre = ('<font color="%s">[%s]</font> '):format(plr:GetAttribute("TituloCol") or "#c8c8c8", titulo) .. pre
				end
				if plr:GetAttribute("VIP") then
					pre = '<font color="#ffc83a">[VIP]</font> ' .. pre
				end
				props.PrefixText = pre
			end
			return props
		end
	end)
end

return TiendaVista
