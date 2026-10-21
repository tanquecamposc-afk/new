--[[
	Blockverse para Roblox · Progreso (cliente)
	Ventana PROGRESO (tecla P o botón del menú) con cinco pestañas:
	· Camino: los 50 niveles en fila; lo que ya puedes cobrar brilla.
	· Misiones: diarias y semanales con su barra y cuánto falta para que cambien.
	· Ruleta: un giro gratis al día (dos con VIP); la tira de premios se para en lo que toca.
	  Las probabilidades se ven al lado.
	· Colección: títulos y estelas; pulsa para ponértelos.
	· Ranking: los 10 con más experiencia.
	Además: avisos de misión cumplida y de nivel nuevo, y un botón con el número de cosas
	por cobrar mientras juegas.
]]
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp:WaitForChild("Registro"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))

local jugador = Players.LocalPlayer
local ProgresoVista = {}
ProgresoVista.enviar = function(...) end
ProgresoVista.alSonido = function(nombre, tono) end
ProgresoVista.alVisible = function(si) end
ProgresoVista.enMenu = function()
	return false
end

local FUENTE = Enum.Font.GothamBold
local FUENTE_N = Enum.Font.GothamBlack
local MORADO = Color3.fromRGB(150, 90, 255)
local VERDE = Color3.fromRGB(60, 180, 80)
local ORO = Color3.fromRGB(255, 200, 60)
local FONDO = Color3.fromRGB(24, 24, 38)
local TARJETA = Color3.fromRGB(40, 40, 60)
local GRIS = Color3.fromRGB(70, 72, 90)

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
local function idc(k)
	return Registro.B[k] or Registro.I[k]
end
local function reloj(seg)
	seg = math.max(0, math.floor(seg or 0))
	if seg >= 86400 then
		return ("%dd %02dh"):format(seg // 86400, (seg % 86400) // 3600)
	end
	return ("%02d:%02d"):format(seg // 3600, (seg % 3600) // 60)
end
local function boton(padre, txt, color, props, alClic)
	local b = nuevo("TextButton", { BackgroundColor3 = color, BorderSizePixel = 0, Text = txt, Font = FUENTE_N, TextSize = 15, TextColor3 = Color3.new(1, 1, 1),
		TextStrokeTransparency = 0.5, AutoButtonColor = alClic ~= nil }, padre)
	for k, v in props do
		b[k] = v
	end
	esquina(b, 8)
	if alClic then
		local esc = nuevo("UIScale", {}, b)
		b.Activated:Connect(function()
			esc.Scale = 0.92
			TweenService:Create(esc, TweenInfo.new(0.2, Enum.EasingStyle.Back), { Scale = 1 }):Play()
			alClic()
		end)
	end
	return b
end

------------------------------------------------------------------
-- Ventana
------------------------------------------------------------------
local gui = nuevo("ScreenGui", { Name = "Progreso", ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 29, ZIndexBehavior = Enum.ZIndexBehavior.Sibling })
local velo = nuevo("TextButton", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.35, BorderSizePixel = 0, Size = UDim2.fromScale(1, 1), Text = "",
	AutoButtonColor = false, Modal = true, Visible = false }, gui)
local ventana = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(900, 570), BackgroundColor3 = FONDO,
	BorderSizePixel = 0 }, velo)
esquina(ventana, 14)
nuevo("UIStroke", { Color = MORADO, Thickness = 3 }, ventana)
local escVentana = nuevo("UIScale", {}, ventana)

local cab = nuevo("Frame", { BackgroundColor3 = MORADO, BorderSizePixel = 0, Size = UDim2.new(1, 0, 0, 76) }, ventana)
esquina(cab, 14)
nuevo("UIGradient", { Rotation = 0, Color = ColorSequence.new(Color3.fromRGB(110, 60, 230), Color3.fromRGB(60, 140, 255)) }, cab)
nuevo("Frame", { BackgroundColor3 = Color3.fromRGB(80, 100, 240), BorderSizePixel = 0, Position = UDim2.new(0, 0, 1, -14), Size = UDim2.new(1, 0, 0, 14) }, cab)
-- Insignia con el nivel
local insignia = nuevo("Frame", { Position = UDim2.fromOffset(14, 8), Size = UDim2.fromOffset(60, 60), BackgroundColor3 = ORO, BorderSizePixel = 0 }, cab)
esquina(insignia, 30)
nuevo("UIStroke", { Color = Color3.fromRGB(110, 60, 0), Thickness = 3 }, insignia)
local insigniaT = texto({ Size = UDim2.fromScale(1, 1), Text = "1", TextSize = 28, Font = FUENTE_N, TextColor3 = Color3.fromRGB(80, 40, 0), TextStrokeTransparency = 1 }, insignia)
texto({ Position = UDim2.fromOffset(86, 8), Size = UDim2.fromOffset(400, 30), Text = "CAMINO DE BLOCKVERSE", TextSize = 24, Font = FUENTE_N,
	TextXAlignment = Enum.TextXAlignment.Left, TextStrokeTransparency = 0.3 }, cab)
local barraF = nuevo("Frame", { Position = UDim2.fromOffset(86, 42), Size = UDim2.fromOffset(380, 18), BackgroundColor3 = Color3.fromRGB(20, 20, 40), BorderSizePixel = 0 }, cab)
esquina(barraF, 9)
local barra = nuevo("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = Color3.fromRGB(120, 255, 120), BorderSizePixel = 0 }, barraF)
esquina(barra, 9)
nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.fromRGB(200, 255, 160), Color3.fromRGB(60, 200, 80)) }, barra)
local barraT = texto({ Size = UDim2.fromScale(1, 1), Text = "", TextSize = 12, Font = FUENTE_N, TextStrokeTransparency = 0.2 }, barraF)
local cerrar = boton(cab, "✕", Color3.fromRGB(200, 60, 60), { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -14, 0.5, 0), Size = UDim2.fromOffset(44, 44), TextSize = 22 },
	function()
		ProgresoVista.cerrar()
	end)
esquina(cerrar, 22)

local PESTANAS = { { "camino", "Camino" }, { "misiones", "Misiones" }, { "ruleta", "Ruleta" }, { "coleccion", "Colección" }, { "ranking", "Ranking" } }
local filaPest = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(20, 86), Size = UDim2.new(1, -40, 0, 38) }, ventana)
nuevo("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }, filaPest)
local botonesPest, avisosPest = {}, {}
local cuerpo = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(20, 134), Size = UDim2.new(1, -40, 1, -150), ClipsDescendants = true }, ventana)

local datos, pestana = nil, "camino"
local girando = false
local pintar

for i, p in PESTANAS do
	local b = boton(filaPest, p[2], TARJETA, { Size = UDim2.fromOffset(150, 38), LayoutOrder = i }, function()
		pestana = p[1]
		ProgresoVista.alSonido("poner", 1.3)
		pintar()
	end)
	esquina(b, 19)
	local av = nuevo("Frame", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 4, 0, -6), Size = UDim2.fromOffset(20, 20),
		BackgroundColor3 = Color3.fromRGB(230, 50, 60), BorderSizePixel = 0, Visible = false, ZIndex = 3 }, b)
	esquina(av, 10)
	local avT = texto({ Size = UDim2.fromScale(1, 1), Text = "!", TextSize = 12, Font = FUENTE_N, ZIndex = 4 }, av)
	botonesPest[p[1]] = b
	avisosPest[p[1]] = { av, avT }
end

------------------------------------------------------------------
-- Camino
------------------------------------------------------------------
local ICONO_TIPO = { monedas = "pepitaOro", titulo = "etiqueta", estela = "polvoBlaze" }

local function pintarCamino()
	local fila = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 50) }, cuerpo)
	local porCobrar = 0
	for n = 2, datos.nivel do
		if not datos.camino[n].cobrado then
			porCobrar += 1
		end
	end
	texto({ Size = UDim2.new(1, -230, 1, 0), Text = datos.nivel >= datos.max and "¡Has completado el Camino!" or
		("Juega a cualquier modo y cumple misiones para subir. Siguiente: %s"):format(datos.camino[math.min(datos.max, datos.nivel + 1)].texto),
		TextSize = 14, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(200, 200, 230), TextStrokeTransparency = 1 }, fila)
	if porCobrar > 0 then
		boton(fila, ("¡Cobrar todo (%d)!"):format(porCobrar), VERDE, { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 4), Size = UDim2.fromOffset(210, 42), TextSize = 17 },
			function()
				ProgresoVista.enviar("progresoCmd", "reclamarTodo")
			end)
	end
	local tira = nuevo("ScrollingFrame", { BackgroundTransparency = 1, BorderSizePixel = 0, Position = UDim2.fromOffset(0, 60), Size = UDim2.new(1, 0, 1, -60),
		ScrollBarThickness = 8, ScrollingDirection = Enum.ScrollingDirection.X, CanvasSize = UDim2.fromOffset(datos.max * 128 + 20, 0) }, cuerpo)
	for n = 1, datos.max do
		local c = datos.camino[n]
		local alcanzado = n <= datos.nivel
		local cobrable = alcanzado and not c.cobrado
		local col = c.grande and ORO or (c.tipo == "titulo" and Color3.fromRGB(120, 200, 255) or (c.tipo == "estela" and Color3.fromRGB(255, 120, 220) or MORADO))
		local f = nuevo("Frame", { Position = UDim2.fromOffset(10 + (n - 1) * 128, 10), Size = UDim2.fromOffset(118, 300), BorderSizePixel = 0,
			BackgroundColor3 = alcanzado and TARJETA or Color3.fromRGB(30, 30, 44) }, tira)
		esquina(f, 10)
		local borde = nuevo("UIStroke", { Color = cobrable and Color3.fromRGB(120, 255, 120) or (alcanzado and col or GRIS), Thickness = cobrable and 3 or 2 }, f)
		local cabN = nuevo("Frame", { Size = UDim2.new(1, 0, 0, 30), BackgroundColor3 = alcanzado and col or GRIS, BorderSizePixel = 0 }, f)
		esquina(cabN, 10)
		texto({ Size = UDim2.fromScale(1, 1), Text = "NIVEL " .. n, TextSize = 14, Font = FUENTE_N, TextStrokeTransparency = 0.4 }, cabN)
		-- Icono del premio (las estelas, con sus colores)
		local caja = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 44), Size = UDim2.fromOffset(76, 76), BorderSizePixel = 0,
			BackgroundColor3 = col:Lerp(Color3.new(0, 0, 0), 0.6) }, f)
		esquina(caja, 10)
		if c.tipo == "estela" then
			local e
			for _, x in datos.estelas do
				if x.id == c.valor then
					e = x
				end
			end
			if e then
				local franja = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(60, 18), BorderSizePixel = 0,
					BackgroundColor3 = Color3.new(1, 1, 1), Rotation = -30 }, caja)
				esquina(franja, 9)
				nuevo("UIGradient", { Color = ColorSequence.new(hex(e.c1, Color3.new(1, 1, 1)), hex(e.c2, Color3.new(0, 0, 0))) }, franja)
				franja.BackgroundColor3 = hex(e.c1, Color3.new(1, 1, 1))
			end
		else
			local im = nuevo("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(52, 52),
				ResampleMode = Enum.ResamplerMode.Pixelated, ImageTransparency = alcanzado and 0 or 0.5 }, caja)
			Iconos.poner(im, idc(c.grande and "bloqueOro" or ICONO_TIPO[c.tipo] or "esmeralda"))
		end
		texto({ Position = UDim2.fromOffset(6, 128), Size = UDim2.new(1, -12, 0, 60), Text = c.texto, TextSize = 14, TextWrapped = true, Font = FUENTE_N,
			TextColor3 = alcanzado and Color3.new(1, 1, 1) or Color3.fromRGB(140, 140, 160) }, f)
		if n == 1 or c.cobrado then
			texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -14), Size = UDim2.new(1, -12, 0, 30), Text = "✔ COBRADO", TextSize = 14, Font = FUENTE_N,
				TextColor3 = Color3.fromRGB(120, 255, 120) }, f)
		elseif cobrable then
			local b = boton(f, "¡COBRAR!", VERDE, { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -10), Size = UDim2.new(1, -16, 0, 40), TextSize = 16 }, function()
				ProgresoVista.enviar("progresoCmd", "reclamar", n)
			end)
			nuevo("UIGradient", { Rotation = 90, Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(170, 170, 170)) }, b)
			-- Late para que se vea
			local esc = nuevo("UIScale", {}, f)
			task.spawn(function()
				local t = 0
				while f.Parent do
					t += task.wait(0.05)
					esc.Scale = 1 + math.sin(t * 5) * 0.025
					borde.Transparency = 0.3 + math.sin(t * 5) * 0.3
				end
			end)
		else
			texto({ AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -14), Size = UDim2.new(1, -12, 0, 30), Text = "🔒 Nivel " .. n, TextSize = 13,
				TextColor3 = Color3.fromRGB(140, 140, 160) }, f)
		end
	end
	-- Se ve el nivel actual (o lo primero por cobrar)
	local primero = datos.nivel
	for n = 2, datos.nivel do
		if not datos.camino[n].cobrado then
			primero = n
			break
		end
	end
	tira.CanvasPosition = Vector2.new(math.max(0, (primero - 3) * 128), 0)
end

------------------------------------------------------------------
-- Misiones
------------------------------------------------------------------
local function columnaMisiones(padre, titulo, lista, cual, fin, x)
	local col = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.new(x, x > 0 and 8 or 0, 0, 0), Size = UDim2.new(0.5, -8, 1, 0) }, padre)
	texto({ Size = UDim2.new(1, 0, 0, 28), Text = titulo, TextSize = 20, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, col)
	texto({ Position = UDim2.fromOffset(0, 28), Size = UDim2.new(1, 0, 0, 18), Text = "Cambian en " .. reloj(fin), TextSize = 13,
		TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(180, 180, 210), TextStrokeTransparency = 1 }, col)
	for k, m in lista do
		local hecha = m.prog >= m.meta
		local f = nuevo("Frame", { Position = UDim2.fromOffset(0, 56 + (k - 1) * 106), Size = UDim2.new(1, 0, 0, 96), BackgroundColor3 = TARJETA, BorderSizePixel = 0 }, col)
		esquina(f, 10)
		nuevo("UIStroke", { Color = (hecha and not m.cobrada) and Color3.fromRGB(120, 255, 120) or GRIS, Thickness = 2 }, f)
		texto({ Position = UDim2.fromOffset(12, 8), Size = UDim2.new(1, -140, 0, 40), Text = m.t, TextSize = 16, Font = FUENTE_N, TextWrapped = true,
			TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top }, f)
		texto({ Position = UDim2.fromOffset(12, 48), Size = UDim2.fromOffset(200, 16), Text = ("+%d de experiencia"):format(m.xp), TextSize = 13,
			TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(150, 255, 150), TextStrokeTransparency = 1 }, f)
		local bf = nuevo("Frame", { Position = UDim2.fromOffset(12, 70), Size = UDim2.new(1, -140, 0, 16), BackgroundColor3 = Color3.fromRGB(20, 20, 34), BorderSizePixel = 0 }, f)
		esquina(bf, 8)
		local b = nuevo("Frame", { Size = UDim2.fromScale(math.clamp(m.prog / m.meta, 0, 1), 1), BackgroundColor3 = hecha and VERDE or MORADO, BorderSizePixel = 0 }, bf)
		esquina(b, 8)
		texto({ Size = UDim2.fromScale(1, 1), Text = ("%d / %d"):format(m.prog, m.meta), TextSize = 11, Font = FUENTE_N, TextStrokeTransparency = 0.3 }, bf)
		if m.cobrada then
			texto({ AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -12, 0.5, 0), Size = UDim2.fromOffset(110, 40), Text = "✔ HECHA", TextSize = 15, Font = FUENTE_N,
				TextColor3 = Color3.fromRGB(120, 255, 120) }, f)
		elseif hecha then
			boton(f, "¡Cobrar!", VERDE, { AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -12, 0.5, 0), Size = UDim2.fromOffset(110, 44), TextSize = 16 }, function()
				ProgresoVista.enviar("progresoCmd", "cobrar", cual, m.i)
			end)
		else
			texto({ AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -12, 0.5, 0), Size = UDim2.fromOffset(110, 40), Text = ("%d %%"):format(math.floor(m.prog / m.meta * 100)),
				TextSize = 20, Font = FUENTE_N, TextColor3 = Color3.fromRGB(180, 180, 210) }, f)
		end
	end
end

local function pintarMisiones()
	columnaMisiones(cuerpo, "Diarias", datos.diarias, "dia", datos.finDia, 0)
	columnaMisiones(cuerpo, "Semanales", datos.semanales, "sem", datos.finSemana, 0.5)
end

------------------------------------------------------------------
-- Ruleta (tira de premios que se para bajo la flecha)
------------------------------------------------------------------
local ANCHO_P = 112
local function tarjetaPremio(padre, r, x)
	local f = nuevo("Frame", { Position = UDim2.fromOffset(x, 10), Size = UDim2.fromOffset(ANCHO_P - 8, 130), BackgroundColor3 = r.raro and Color3.fromRGB(70, 50, 20) or TARJETA,
		BorderSizePixel = 0 }, padre)
	esquina(f, 10)
	nuevo("UIStroke", { Color = r.raro and ORO or (r.tipo == "xp" and Color3.fromRGB(120, 255, 120) or MORADO), Thickness = 2 }, f)
	local im = nuevo("ImageLabel", { BackgroundTransparency = 1, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 12), Size = UDim2.fromOffset(56, 56),
		ResampleMode = Enum.ResamplerMode.Pixelated }, f)
	Iconos.poner(im, idc(r.ico))
	texto({ Position = UDim2.fromOffset(4, 74), Size = UDim2.new(1, -8, 0, 50), Text = r.texto, TextSize = 14, Font = FUENTE_N, TextWrapped = true }, f)
	return f
end

local function pintarRuleta(resultado)
	local caja = nuevo("Frame", { Position = UDim2.fromOffset(0, 10), Size = UDim2.fromOffset(560, 150), BackgroundColor3 = Color3.fromRGB(16, 16, 28), BorderSizePixel = 0,
		ClipsDescendants = true }, cuerpo)
	esquina(caja, 12)
	nuevo("UIStroke", { Color = ORO, Thickness = 3 }, caja)
	local tira = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.fromOffset(ANCHO_P * 40, 150) }, caja)
	-- 40 premios al azar con el peso de cada uno; el 34 es el que toca
	local total = 0
	for _, r in datos.ruleta do
		total += r.p
	end
	local function alAzar()
		local x = math.random() * total
		for _, r in datos.ruleta do
			x -= r.p
			if x <= 0 then
				return r
			end
		end
		return datos.ruleta[1]
	end
	local FINAL = 34
	for i = 1, 40 do
		local r = (resultado and i == FINAL) and datos.ruleta[resultado] or alAzar()
		tarjetaPremio(tira, r, (i - 1) * ANCHO_P + 4)
	end
	-- Flecha en el centro
	local flecha = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.fromScale(0.5, 0), Size = UDim2.fromOffset(4, 150), BackgroundColor3 = ORO,
		BorderSizePixel = 0, ZIndex = 5 }, caja)
	texto({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, -8), Size = UDim2.fromOffset(30, 30), Text = "▼", TextSize = 26, TextColor3 = ORO, ZIndex = 6 }, caja)
	local _ = flecha
	local mensaje = texto({ Position = UDim2.fromOffset(0, 172), Size = UDim2.fromOffset(560, 40), Text = "", TextSize = 24, Font = FUENTE_N, TextColor3 = ORO }, cuerpo)
	-- Botón de girar
	local giros = datos.giros or 0
	if giros > 0 and not resultado then
		boton(cuerpo, ("¡GIRAR!  (%d %s)"):format(giros, giros == 1 and "giro" or "giros"), VERDE, { Position = UDim2.fromOffset(150, 226), Size = UDim2.fromOffset(260, 60), TextSize = 24 },
			function()
				if not girando then
					girando = true
					ProgresoVista.alSonido("poner", 1.5)
					ProgresoVista.enviar("progresoCmd", "girar")
				end
			end)
	elseif not resultado then
		boton(cuerpo, "Vuelve mañana · " .. reloj(datos.finDia), GRIS, { Position = UDim2.fromOffset(130, 226), Size = UDim2.fromOffset(300, 60), TextSize = 17 })
	end
	if not datos.vip then
		texto({ Position = UDim2.fromOffset(0, 296), Size = UDim2.fromOffset(560, 20), Text = "Con VIP tienes 2 giros al día", TextSize = 13,
			TextColor3 = ORO, TextStrokeTransparency = 1 }, cuerpo)
	end
	-- Probabilidades
	local tabla = nuevo("Frame", { Position = UDim2.fromOffset(580, 10), Size = UDim2.new(1, -580, 0, 330), BackgroundColor3 = TARJETA, BorderSizePixel = 0 }, cuerpo)
	esquina(tabla, 12)
	texto({ Position = UDim2.fromOffset(12, 8), Size = UDim2.new(1, -24, 0, 26), Text = "Probabilidades", TextSize = 18, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, tabla)
	for i, r in datos.ruleta do
		local y = 40 + (i - 1) * 40
		local im = nuevo("ImageLabel", { BackgroundTransparency = 1, Position = UDim2.fromOffset(12, y), Size = UDim2.fromOffset(30, 30), ResampleMode = Enum.ResamplerMode.Pixelated }, tabla)
		Iconos.poner(im, idc(r.ico))
		texto({ Position = UDim2.fromOffset(50, y), Size = UDim2.new(1, -120, 0, 30), Text = r.texto, TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left,
			TextColor3 = r.raro and ORO or Color3.new(1, 1, 1) }, tabla)
		texto({ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, y), Size = UDim2.fromOffset(60, 30), Text = ("%d %%"):format(math.floor(r.p / total * 100 + 0.5)),
			TextSize = 15, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Right }, tabla)
	end
	-- Animación: la tira corre y frena hasta dejar el premio bajo la flecha
	if resultado then
		local centro = 280
		local destino = -((FINAL - 1) * ANCHO_P + 4 + (ANCHO_P - 8) / 2 - centro) + math.random(-30, 30)
		tira.Position = UDim2.fromOffset(0, 0)
		local tw = TweenService:Create(tira, TweenInfo.new(4.2, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Position = UDim2.fromOffset(destino, 0) })
		-- Un «tic» por cada premio que pasa
		task.spawn(function()
			local ultimo = 0
			local t0 = os.clock()
			while os.clock() - t0 < 4.2 and tira.Parent do
				local f = math.clamp((os.clock() - t0) / 4.2, 0, 1)
				local pos = destino * (1 - (1 - f) ^ 4)
				local k = math.floor(-pos / ANCHO_P)
				if k ~= ultimo then
					ultimo = k
					ProgresoVista.alSonido("paso", 2)
				end
				task.wait(0.03)
			end
		end)
		tw:Play()
		task.delay(4.3, function()
			girando = false
			if tira.Parent then
				local r = datos.ruleta[resultado]
				mensaje.Text = "¡Has ganado " .. r.texto .. "!"
				ProgresoVista.alSonido("nivel", r.raro and 0.8 or 1.2)
				if r.raro then
					ProgresoVista.fiesta("¡PREMIO GORDO!", r.texto)
				end
				task.delay(1.5, function()
					if pestana == "ruleta" and velo.Visible and not girando then
						pintar()
					end
				end)
			end
		end)
	end
end

------------------------------------------------------------------
-- Colección
------------------------------------------------------------------
local function pintarColeccion()
	texto({ Size = UDim2.new(1, 0, 0, 26), Text = "Títulos", TextSize = 20, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, cuerpo)
	local g1 = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 30), Size = UDim2.new(1, 0, 0, 160) }, cuerpo)
	nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(158, 46), CellPadding = UDim2.fromOffset(8, 8), SortOrder = Enum.SortOrder.LayoutOrder }, g1)
	for i, t in datos.titulos do
		local col = hex(t.col, Color3.new(1, 1, 1))
		local b = boton(g1, "", t.puesto and Color3.fromRGB(70, 60, 30) or TARJETA, { LayoutOrder = i }, t.tiene and function()
			ProgresoVista.enviar("progresoCmd", "equipar", "titulo", t.id)
		end or nil)
		nuevo("UIStroke", { Color = t.puesto and ORO or (t.tiene and col or GRIS), Thickness = t.puesto and 3 or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
		texto({ Size = UDim2.new(1, 0, 0, 26), Position = UDim2.fromOffset(0, 4), Text = t.n, TextSize = 15, Font = FUENTE_N, TextColor3 = t.tiene and col or Color3.fromRGB(110, 110, 130) }, b)
		texto({ Size = UDim2.new(1, 0, 0, 14), Position = UDim2.fromOffset(0, 28), Text = t.puesto and "PUESTO" or (t.tiene and "Pulsa para ponértelo" or ("🔒 Nivel " .. t.nivel)),
			TextSize = 10, TextColor3 = t.puesto and ORO or Color3.fromRGB(170, 170, 200), TextStrokeTransparency = 1 }, b)
	end
	texto({ Position = UDim2.fromOffset(0, 196), Size = UDim2.new(1, -200, 0, 26), Text = "Estelas (la cola de color al moverte; la ven todos)", TextSize = 20, Font = FUENTE_N,
		TextXAlignment = Enum.TextXAlignment.Left }, cuerpo)
	boton(cuerpo, "Quitar estela", GRIS, { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 192), Size = UDim2.fromOffset(160, 32), TextSize = 13 }, function()
		ProgresoVista.enviar("progresoCmd", "equipar", "estela", "")
	end)
	local g2 = nuevo("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 230), Size = UDim2.new(1, 0, 0, 160) }, cuerpo)
	nuevo("UIGridLayout", { CellSize = UDim2.fromOffset(158, 66), CellPadding = UDim2.fromOffset(8, 8), SortOrder = Enum.SortOrder.LayoutOrder }, g2)
	for i, e in datos.estelas do
		local c1 = hex(e.c1, Color3.new(1, 1, 1))
		local b = boton(g2, "", e.puesto and Color3.fromRGB(70, 60, 30) or TARJETA, { LayoutOrder = i }, e.tiene and function()
			ProgresoVista.enviar("progresoCmd", "equipar", "estela", e.id)
		end or nil)
		nuevo("UIStroke", { Color = e.puesto and ORO or (e.tiene and c1 or GRIS), Thickness = e.puesto and 3 or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, b)
		local franja = nuevo("Frame", { Position = UDim2.fromOffset(10, 8), Size = UDim2.new(1, -20, 0, 14), BackgroundColor3 = c1, BorderSizePixel = 0,
			BackgroundTransparency = e.tiene and 0 or 0.6 }, b)
		esquina(franja, 7)
		nuevo("UIGradient", { Color = ColorSequence.new(c1, hex(e.c2, Color3.new(0, 0, 0))) }, franja)
		texto({ Position = UDim2.fromOffset(0, 26), Size = UDim2.new(1, 0, 0, 20), Text = e.n, TextSize = 14, Font = FUENTE_N,
			TextColor3 = e.tiene and Color3.new(1, 1, 1) or Color3.fromRGB(110, 110, 130) }, b)
		texto({ Position = UDim2.fromOffset(0, 46), Size = UDim2.new(1, 0, 0, 14), Text = e.puesto and "PUESTA" or (e.tiene and "Pulsa para ponértela" or ("🔒 Nivel " .. e.nivel)),
			TextSize = 10, TextColor3 = e.puesto and ORO or Color3.fromRGB(170, 170, 200), TextStrokeTransparency = 1 }, b)
	end
end

------------------------------------------------------------------
-- Ranking
------------------------------------------------------------------
local MEDALLA = { Color3.fromRGB(255, 205, 60), Color3.fromRGB(200, 210, 225), Color3.fromRGB(210, 140, 80) }
local function pintarRanking()
	texto({ Size = UDim2.new(1, 0, 0, 26), Text = "Los 10 con más experiencia de Blockverse", TextSize = 18, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left }, cuerpo)
	for i, r in datos.ranking do
		local f = nuevo("Frame", { Position = UDim2.fromOffset(0, 34 + (i - 1) * 36), Size = UDim2.new(1, 0, 0, 32), BorderSizePixel = 0,
			BackgroundColor3 = r.yo and Color3.fromRGB(60, 50, 100) or TARJETA }, cuerpo)
		esquina(f, 8)
		if r.yo then
			nuevo("UIStroke", { Color = MORADO, Thickness = 2 }, f)
		end
		local pos = nuevo("Frame", { Position = UDim2.fromOffset(6, 3), Size = UDim2.fromOffset(26, 26), BackgroundColor3 = MEDALLA[r.pos] or GRIS, BorderSizePixel = 0 }, f)
		esquina(pos, 13)
		texto({ Size = UDim2.fromScale(1, 1), Text = tostring(r.pos), TextSize = 14, Font = FUENTE_N, TextColor3 = r.pos <= 3 and Color3.fromRGB(60, 40, 0) or Color3.new(1, 1, 1),
			TextStrokeTransparency = 1 }, pos)
		texto({ Position = UDim2.fromOffset(44, 0), Size = UDim2.new(1, -300, 1, 0), Text = r.nombre .. (r.yo and "  (tú)" or ""), TextSize = 16, Font = FUENTE_N,
			TextXAlignment = Enum.TextXAlignment.Left }, f)
		texto({ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -150, 0, 0), Size = UDim2.fromOffset(100, 32), Text = "Nivel " .. r.nivel, TextSize = 15,
			TextColor3 = ORO }, f)
		texto({ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, 0), Size = UDim2.fromOffset(130, 32), Text = r.total .. " xp", TextSize = 14,
			TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = Color3.fromRGB(180, 180, 210) }, f)
	end
end

------------------------------------------------------------------
-- Pintar, abrir y cerrar
------------------------------------------------------------------
pintar = function(resultadoRuleta)
	if not datos then
		return
	end
	for k, b in botonesPest do
		b.BackgroundColor3 = k == pestana and MORADO or TARJETA
	end
	insigniaT.Text = tostring(datos.nivel)
	barra.Size = UDim2.fromScale(datos.nivel >= datos.max and 1 or math.clamp(datos.xp / datos.xpNec, 0, 1), 1)
	barraT.Text = datos.nivel >= datos.max and "¡NIVEL MÁXIMO!" or ("%d / %d xp para el nivel %d"):format(datos.xp, datos.xpNec, datos.nivel + 1)
	-- Avisos rojos en las pestañas con cosas por cobrar
	local porCobrar, misionesHechas = 0, 0
	for n = 2, datos.nivel do
		if not datos.camino[n].cobrado then
			porCobrar += 1
		end
	end
	for _, lista in { datos.diarias, datos.semanales } do
		for _, m in lista do
			if m.prog >= m.meta and not m.cobrada then
				misionesHechas += 1
			end
		end
	end
	local function aviso(k, n)
		avisosPest[k][1].Visible = n > 0
		avisosPest[k][2].Text = tostring(n)
	end
	aviso("camino", porCobrar)
	aviso("misiones", misionesHechas)
	aviso("ruleta", datos.giros or 0)
	aviso("coleccion", 0)
	aviso("ranking", 0)
	limpiar(cuerpo)
	if pestana == "camino" then
		pintarCamino()
	elseif pestana == "misiones" then
		pintarMisiones()
	elseif pestana == "ruleta" then
		pintarRuleta(resultadoRuleta)
	elseif pestana == "coleccion" then
		pintarColeccion()
	else
		pintarRanking()
	end
end

local function ajustar()
	local cam = workspace.CurrentCamera
	local v = cam and cam.ViewportSize
	if v and v.X and v.X > 0 then
		return math.min(1, (v.X - 20) / 900, (v.Y - 20) / 570)
	end
	return 1
end

local function mostrar()
	if velo.Visible then
		return
	end
	velo.Visible = true
	ProgresoVista.alVisible(true)
	local final = ajustar()
	escVentana.Scale = final * 0.85
	TweenService:Create(escVentana, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = final }):Play()
end

function ProgresoVista.abrir(p)
	pestana = p or pestana
	mostrar()
	if datos then
		pintar()
	end
	ProgresoVista.enviar("pedirProgreso")
end

function ProgresoVista.cerrar()
	if girando then
		return
	end
	velo.Visible = false
	ProgresoVista.alVisible(false)
end

function ProgresoVista.visible()
	return velo.Visible
end

function ProgresoVista.datos(d, extra)
	datos = d
	ProgresoVista.pendientes(d.pendientes or 0)
	if not velo.Visible then
		return
	end
	if extra and extra.ruleta then
		pestana = "ruleta"
		pintar(extra.ruleta)
	elseif not girando then
		pintar()
	end
	if extra and (extra.reclamado or extra.reclamadoTodo) then
		ProgresoVista.fiesta("¡RECOMPENSA!", extra.reclamadoTodo and (extra.reclamadoTodo .. " recompensas cobradas") or d.camino[extra.reclamado].texto)
	end
end

------------------------------------------------------------------
-- Avisos mientras juegas
------------------------------------------------------------------
-- Botón con el número de cosas por cobrar (a la izquierda)
local avisoBoton = nuevo("TextButton", { AnchorPoint = Vector2.new(0, 0.5), Position = UDim2.new(0, 10, 0.5, -40), Size = UDim2.fromOffset(150, 40),
	BackgroundColor3 = MORADO, BorderSizePixel = 0, Text = "", AutoButtonColor = true, Visible = false }, gui)
esquina(avisoBoton, 20)
nuevo("UIStroke", { Color = Color3.new(1, 1, 1), Thickness = 2, Transparency = 0.4 }, avisoBoton)
local avisoT = texto({ Size = UDim2.fromScale(1, 1), Text = "", TextSize = 14, Font = FUENTE_N }, avisoBoton)
local avisoEsc = nuevo("UIScale", {}, avisoBoton)
local nPendientes = 0
avisoBoton.Activated:Connect(function()
	ProgresoVista.abrir(nil)
end)
function ProgresoVista.pendientes(n)
	if n > nPendientes then
		avisoEsc.Scale = 1.3
		TweenService:Create(avisoEsc, TweenInfo.new(0.4, Enum.EasingStyle.Elastic), { Scale = 1 }):Play()
	end
	nPendientes = n
	avisoT.Text = ("★ Progreso (P) · %d"):format(n)
	if ProgresoVista.alPendientes then
		ProgresoVista.alPendientes(n)
	end
end

-- Cartel de misión cumplida (arriba)
local cartel = nuevo("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, -90), Size = UDim2.fromOffset(460, 64), BackgroundColor3 = Color3.fromRGB(30, 60, 30),
	BorderSizePixel = 0 }, gui)
esquina(cartel, 12)
nuevo("UIStroke", { Color = Color3.fromRGB(120, 255, 120), Thickness = 2 }, cartel)
local cartelT = texto({ Position = UDim2.fromOffset(14, 6), Size = UDim2.new(1, -28, 0, 26), Text = "", TextSize = 18, Font = FUENTE_N, TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = Color3.fromRGB(150, 255, 150) }, cartel)
local cartelS = texto({ Position = UDim2.fromOffset(14, 34), Size = UDim2.new(1, -28, 0, 22), Text = "", TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left }, cartel)
local cartelHilo = 0
local function mostrarCartel(t, sub)
	cartelHilo += 1
	local yo = cartelHilo
	cartelT.Text, cartelS.Text = t, sub
	TweenService:Create(cartel, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Position = UDim2.new(0.5, 0, 0, 14) }):Play()
	task.delay(4, function()
		if yo == cartelHilo then
			TweenService:Create(cartel, TweenInfo.new(0.3), { Position = UDim2.new(0.5, 0, 0, -90) }):Play()
		end
	end)
end

-- Fiesta en grande (nivel nuevo, premio gordo)
local fiestaF = nuevo("Frame", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 20 }, gui)
local fiestaT = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.34), Size = UDim2.fromOffset(800, 80), Text = "", TextSize = 64, Font = FUENTE_N,
	TextColor3 = ORO, TextStrokeColor3 = Color3.fromRGB(60, 20, 120), TextStrokeTransparency = 0, ZIndex = 22 }, fiestaF)
local fiestaEsc = nuevo("UIScale", {}, fiestaT)
local fiestaS = texto({ AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.44), Size = UDim2.fromOffset(800, 30), Text = "", TextSize = 24, Font = FUENTE_N,
	ZIndex = 22, TextStrokeTransparency = 0.3 }, fiestaF)
local fiestaHilo = 0
local COLORES = { Color3.fromRGB(255, 80, 80), Color3.fromRGB(255, 210, 60), Color3.fromRGB(80, 200, 255), Color3.fromRGB(120, 230, 120), Color3.fromRGB(190, 120, 255) }
function ProgresoVista.fiesta(t, sub)
	fiestaHilo += 1
	local yo = fiestaHilo
	fiestaF.Visible = true
	fiestaT.Text, fiestaS.Text = t, sub or ""
	fiestaEsc.Scale = 0.3
	TweenService:Create(fiestaEsc, TweenInfo.new(0.5, Enum.EasingStyle.Elastic), { Scale = 1 }):Play()
	for i = 1, 50 do
		local x0, giro = math.random(), math.random(0, 360)
		local c = nuevo("Frame", { BackgroundColor3 = COLORES[(i % #COLORES) + 1], BorderSizePixel = 0, Size = UDim2.fromOffset(math.random(8, 14), math.random(14, 22)),
			Position = UDim2.new(x0, 0, -0.05, -math.random(0, 200)), Rotation = giro, ZIndex = 21 }, fiestaF)
		local dur = 1.6 + math.random() * 1.2
		TweenService:Create(c, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
			{ Position = UDim2.new(x0 + (math.random() - 0.5) * 0.2, 0, 1.1, 0), Rotation = giro + math.random(-540, 540) }):Play()
		task.delay(dur + 0.1, function()
			c:Destroy()
		end)
	end
	task.delay(3, function()
		if yo == fiestaHilo then
			fiestaF.Visible = false
		end
	end)
end

-- Quita los avisos al momento (para las capturas)
function ProgresoVista.ocultarAvisos()
	fiestaHilo += 1
	cartelHilo += 1
	fiestaF.Visible = false
	cartel.Position = UDim2.new(0.5, 0, 0, -90)
end

function ProgresoVista.aviso(d)
	if d.tipo == "mision" then
		mostrarCartel("✔ ¡Misión cumplida!", ("%s · +%d xp · cóbrala con P"):format(d.texto or "", d.xp or 0))
		ProgresoVista.alSonido("xp", 1)
	elseif d.tipo == "nivel" then
		ProgresoVista.fiesta(("¡NIVEL %d!"):format(d.nivel or 0), "Camino de Blockverse · " .. (d.texto or "") .. " (cóbralo con P)")
		ProgresoVista.alSonido("nivel", 1)
	end
	if velo.Visible and not girando then
		ProgresoVista.enviar("pedirProgreso")
	end
end

function ProgresoVista.iniciar()
	gui.Parent = jugador:WaitForChild("PlayerGui")
	-- El botón de avisos solo se ve jugando (no en el menú) y si hay algo por cobrar
	RunService.RenderStepped:Connect(function()
		avisoBoton.Visible = nPendientes > 0 and not velo.Visible and not ProgresoVista.enMenu()
	end)
end

return ProgresoVista
