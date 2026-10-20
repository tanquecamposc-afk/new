--[[
	Blockverse para Roblox · Interfaz (cliente)
	Barra rápida, corazones y hambre, punto de mira, inventario con
	libro de recetas, paleta del modo creativo, menú de inicio, avisos,
	el objeto en la mano y los botones para móvil.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Bloques = require(Comp.Bloques)
local Recetas = require(Comp.Recetas)

local DEF = Bloques.porId
local jugador = Players.LocalPlayer

local Interfaz = {}
Interfaz.alAccion = function(...) end -- lo pone el script del cliente
Interfaz.alModo = function(m) end
Interfaz.alSeleccionar = function(i) end

local estado = { inv = table.create(36, false), sel = 1, cerca = { mesa = false, horno = false }, modo = nil }

------------------------------------------------------------------
-- Utilidades
------------------------------------------------------------------
local FUENTE = Enum.Font.GothamBold
local FUENTE_TIT = Enum.Font.Arcade

local function crear(clase, props, padre)
	local o = Instance.new(clase)
	for k, v in props do
		(o :: any)[k] = v
	end
	o.Parent = padre
	return o
end

local function esquinas(o, r)
	crear("UICorner", { CornerRadius = UDim.new(0, r or 8) }, o)
	return o
end

local function borde(o, col, grosor, transp)
	crear("UIStroke", { Color = col or Color3.new(1, 1, 1), Thickness = grosor or 1, Transparency = transp or 0.7, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }, o)
	return o
end

local function rgb(t)
	return Color3.fromRGB(t[1], t[2], t[3])
end

local MATS = {}
local function material(nombre)
	if MATS[nombre] == nil then
		local ok, v = pcall(function()
			return (Enum.Material :: any)[nombre]
		end)
		MATS[nombre] = ok and v or Enum.Material.SmoothPlastic
	end
	return MATS[nombre]
end

local ICONO_ESPECIAL = { antorcha = "🔥", florRoja = "🌹", florAmarilla = "🌼", hierba = "🌿", agua = "💧" }

-- Dibuja el icono de un objeto dentro de `marco` (bloque en 3D o emoji)
local function icono(marco, id)
	marco:ClearAllChildren()
	if not id then
		return
	end
	local d = DEF[id]
	if not d then
		return
	end
	if d.esBloque and d.forma == "cubo" then
		local vp = crear("ViewportFrame", {
			Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1,
			Ambient = Color3.fromRGB(170, 170, 170), LightColor = Color3.fromRGB(255, 255, 255),
			LightDirection = Vector3.new(-1, -2, -0.6),
		}, marco)
		local p = crear("Part", { Anchored = true, Size = Vector3.new(2, 2, 2), Color = rgb(d.color), Material = material(d.material), CFrame = CFrame.new() }, vp)
		if d.transp then
			p.Transparency = d.transp * 0.6
		end
		if d.capa then
			crear("Part", {
				Anchored = true, Size = d.capaArriba and Vector3.new(1.7, 0.08, 1.7) or Vector3.new(2.04, 0.4, 2.04),
				Color = rgb(d.capa.color), Material = material(d.capa.material),
				CFrame = CFrame.new(0, d.capaArriba and 1.02 or 0.82, 0),
			}, vp)
		end
		if d.veta then
			for k, off in { Vector3.new(0.5, 0.4, -1.0), Vector3.new(-0.4, -0.3, -1.0), Vector3.new(1.0, 0.2, 0.4), Vector3.new(1.0, -0.5, -0.4), Vector3.new(-0.3, 1.0, 0.3) } do
				crear("Part", { Anchored = true, Size = Vector3.new(0.45, 0.45, 0.45), Color = rgb(d.veta), CFrame = CFrame.new(off), Name = "Veta" .. k }, vp)
			end
		end
		local cam = crear("Camera", { FieldOfView = 30 }, vp)
		cam.CFrame = CFrame.lookAt(Vector3.new(5.2, 4.2, -5.2), Vector3.zero)
		vp.CurrentCamera = cam
	else
		local txt = d.icono or ICONO_ESPECIAL[d.clave] or "❔"
		crear("TextLabel", {
			Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Text = txt, TextScaled = true,
			Font = Enum.Font.SourceSans, TextColor3 = Color3.new(1, 1, 1),
		}, marco)
		if d.fondo then
			esquinas(crear("Frame", {
				Size = UDim2.new(0.7, 0, 0, 4), Position = UDim2.new(0.15, 0, 1, -3),
				BackgroundColor3 = rgb(d.fondo), BorderSizePixel = 0,
			}, marco), 2)
		end
	end
end
Interfaz.icono = icono

------------------------------------------------------------------
-- Pantalla
------------------------------------------------------------------
local gui = crear("ScreenGui", { Name = "Blockverse", ResetOnSpawn = false, IgnoreGuiInset = true, ZIndexBehavior = Enum.ZIndexBehavior.Sibling }, jugador:WaitForChild("PlayerGui"))
local escala = crear("UIScale", { Scale = 1 }, gui)
local function ajustarEscala()
	local cam = workspace.CurrentCamera
	if cam then
		local v = cam.ViewportSize
		escala.Scale = math.clamp(math.min(v.X / 1100, v.Y / 680), 0.55, 1.25)
	end
end
ajustarEscala()
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(ajustarEscala)
if workspace.CurrentCamera then
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(ajustarEscala)
end

-- Punto de mira
local mira = crear("Frame", { Size = UDim2.fromOffset(22, 22), Position = UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundTransparency = 1 }, gui)
crear("Frame", { Size = UDim2.fromOffset(2, 22), Position = UDim2.fromOffset(10, 0), BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, BackgroundTransparency = 0.15 }, mira)
crear("Frame", { Size = UDim2.fromOffset(22, 2), Position = UDim2.fromOffset(0, 10), BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, BackgroundTransparency = 0.15 }, mira)
local barraRomper = esquinas(crear("Frame", { Size = UDim2.fromOffset(60, 5), Position = UDim2.new(0.5, 0, 0.5, 22), AnchorPoint = Vector2.new(0.5, 0), BackgroundColor3 = Color3.fromRGB(20, 20, 20), BackgroundTransparency = 0.4, Visible = false }, gui), 3)
local barraRomperRel = esquinas(crear("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = Color3.fromRGB(255, 255, 255), BorderSizePixel = 0 }, barraRomper), 3)

function Interfaz.progreso(f)
	barraRomper.Visible = f > 0
	barraRomperRel.Size = UDim2.fromScale(math.clamp(f, 0, 1), 1)
end

-- Fondo rojo al recibir daño y azul bajo el agua
local destello = crear("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(200, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 0 }, gui)
local bajoAgua = crear("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(20, 60, 160), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 0 }, gui)
function Interfaz.dano()
	destello.BackgroundTransparency = 0.6
	TweenService:Create(destello, TweenInfo.new(0.45), { BackgroundTransparency = 1 }):Play()
end
function Interfaz.agua(si)
	bajoAgua.BackgroundTransparency = si and 0.55 or 1
end

------------------------------------------------------------------
-- Barra rápida, vida y hambre
------------------------------------------------------------------
local abajo = crear("Frame", { Size = UDim2.fromOffset(9 * 58 + 8 * 4, 120), Position = UDim2.new(0.5, 0, 1, -10), AnchorPoint = Vector2.new(0.5, 1), BackgroundTransparency = 1 }, gui)
local barra = crear("Frame", { Size = UDim2.new(1, 0, 0, 58), Position = UDim2.new(0, 0, 1, 0), AnchorPoint = Vector2.new(0, 1), BackgroundTransparency = 1 }, abajo)
crear("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), HorizontalAlignment = Enum.HorizontalAlignment.Center }, barra)

local function nuevaRanura(padre, tam)
	local r = esquinas(crear("TextButton", {
		Size = UDim2.fromOffset(tam, tam), BackgroundColor3 = Color3.fromRGB(28, 30, 40), BackgroundTransparency = 0.25,
		AutoButtonColor = false, Text = "",
	}, padre), 7)
	local st = borde(r, Color3.new(1, 1, 1), 1.5, 0.75)
	local ic = crear("Frame", { Size = UDim2.new(1, -12, 1, -12), Position = UDim2.fromOffset(6, 6), BackgroundTransparency = 1 }, r)
	local n = crear("TextLabel", {
		Size = UDim2.new(1, -6, 0, 16), Position = UDim2.new(0, 0, 1, -18), BackgroundTransparency = 1, Text = "",
		Font = FUENTE, TextSize = 15, TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = Color3.new(1, 1, 1),
		TextStrokeTransparency = 0.3, ZIndex = 3,
	}, r)
	local uso = esquinas(crear("Frame", { Size = UDim2.new(0.8, 0, 0, 3), Position = UDim2.new(0.1, 0, 1, -5), BackgroundColor3 = Color3.fromRGB(90, 230, 90), BorderSizePixel = 0, Visible = false, ZIndex = 3 }, r), 2)
	return { boton = r, borde = st, icono = ic, n = n, uso = uso, id = nil }
end

local function pintarRanura(R, p)
	local id = p and p.id or nil
	if R.id ~= id then
		R.id = id
		icono(R.icono, id)
	end
	R.n.Text = (p and p.n > 1) and tostring(p.n) or ""
	local d = id and DEF[id]
	if p and p.u and d and d.usos then
		R.uso.Visible = p.u < d.usos
		local f = p.u / d.usos
		R.uso.Size = UDim2.new(0.8 * f, 0, 0, 3)
		R.uso.BackgroundColor3 = Color3.fromHSV(f * 0.33, 0.9, 0.9)
	else
		R.uso.Visible = false
	end
end

local ranurasBarra = {}
for i = 1, 9 do
	local R = nuevaRanura(barra, 58)
	R.boton.LayoutOrder = i
	crear("TextLabel", { Size = UDim2.fromOffset(14, 14), Position = UDim2.fromOffset(4, 2), BackgroundTransparency = 1, Text = tostring(i), Font = FUENTE, TextSize = 11, TextColor3 = Color3.fromRGB(200, 200, 200), TextTransparency = 0.3, ZIndex = 3 }, R.boton)
	R.boton.MouseButton1Click:Connect(function()
		Interfaz.alSeleccionar(i)
	end)
	ranurasBarra[i] = R
end

local filaVida = crear("Frame", { Size = UDim2.new(0.5, -6, 0, 22), Position = UDim2.new(0, 0, 1, -64), AnchorPoint = Vector2.new(0, 1), BackgroundTransparency = 1 }, abajo)
local filaHambre = crear("Frame", { Size = UDim2.new(0.5, -6, 0, 22), Position = UDim2.new(1, 0, 1, -64), AnchorPoint = Vector2.new(1, 1), BackgroundTransparency = 1 }, abajo)
crear("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 1) }, filaVida)
crear("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 1), HorizontalAlignment = Enum.HorizontalAlignment.Right }, filaHambre)
local corazones, muslos = {}, {}
for i = 1, 10 do
	corazones[i] = crear("TextLabel", { Size = UDim2.fromOffset(25, 22), BackgroundTransparency = 1, Text = "♥", Font = Enum.Font.GothamBlack, TextSize = 24, TextColor3 = Color3.fromRGB(230, 40, 50), TextStrokeTransparency = 0.4, LayoutOrder = i }, filaVida)
	muslos[i] = crear("TextLabel", { Size = UDim2.fromOffset(25, 22), BackgroundTransparency = 1, Text = "🍗", Font = Enum.Font.SourceSans, TextSize = 19, LayoutOrder = 11 - i }, filaHambre)
end
local nombreObjeto = crear("TextLabel", { Size = UDim2.new(1, 0, 0, 24), Position = UDim2.new(0, 0, 1, -92), AnchorPoint = Vector2.new(0, 1), BackgroundTransparency = 1, Text = "", Font = FUENTE, TextSize = 18, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.3, TextTransparency = 1 }, abajo)

function Interfaz.vida(h, max)
	local v = h / max * 20
	for i = 1, 10 do
		local c = corazones[i]
		if v >= i * 2 then
			c.TextColor3 = Color3.fromRGB(230, 40, 50)
			c.TextTransparency = 0
		elseif v >= i * 2 - 1 then
			c.TextColor3 = Color3.fromRGB(240, 120, 130)
			c.TextTransparency = 0
		else
			c.TextColor3 = Color3.fromRGB(40, 40, 46)
			c.TextTransparency = 0.2
		end
	end
end

function Interfaz.hambre(n)
	for i = 1, 10 do
		local m = muslos[i]
		m.TextTransparency = (n >= i * 2) and 0 or (n >= i * 2 - 1) and 0.45 or 0.85
	end
end

function Interfaz.modo(m)
	estado.modo = m
	filaVida.Visible = m ~= "creativo"
	filaHambre.Visible = m ~= "creativo"
end

------------------------------------------------------------------
-- Objeto en la mano (abajo a la derecha)
------------------------------------------------------------------
local mano = crear("Frame", { Size = UDim2.fromOffset(170, 170), Position = UDim2.new(1, -40, 1, 20), AnchorPoint = Vector2.new(1, 1), BackgroundTransparency = 1, ZIndex = 0 }, gui)
local manoIcono = crear("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Rotation = -12 }, mano)
local balanceo = 0
function Interfaz.balancear()
	balanceo = 1
end
RunService.RenderStepped:Connect(function(dt)
	balanceo = math.max(0, balanceo - dt * 4)
	local t = os.clock()
	local hum = jugador.Character and jugador.Character:FindFirstChildOfClass("Humanoid")
	local anda = hum and hum.MoveDirection.Magnitude > 0.1 and 1 or 0
	local b = math.sin(balanceo * math.pi)
	manoIcono.Position = UDim2.fromOffset(math.sin(t * 7) * 6 * anda - b * 50, math.abs(math.cos(t * 7)) * 6 * anda + b * 30)
	manoIcono.Rotation = -12 - b * 35
end)
function Interfaz.mostrarMano(si)
	mano.Visible = si
end

------------------------------------------------------------------
-- Avisos
------------------------------------------------------------------
local avisos = crear("Frame", { Size = UDim2.fromOffset(380, 300), Position = UDim2.new(0, 14, 0.5, 0), AnchorPoint = Vector2.new(0, 0.5), BackgroundTransparency = 1 }, gui)
crear("UIListLayout", { Padding = UDim.new(0, 4), VerticalAlignment = Enum.VerticalAlignment.Bottom }, avisos)
function Interfaz.aviso(texto)
	local a = esquinas(crear("TextLabel", {
		Size = UDim2.new(0, 0, 0, 30), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = Color3.fromRGB(16, 18, 26), BackgroundTransparency = 0.25,
		Text = "  " .. texto .. "  ", Font = FUENTE, TextSize = 16, TextColor3 = Color3.new(1, 1, 1),
	}, avisos), 6)
	task.delay(3, function()
		TweenService:Create(a, TweenInfo.new(0.4), { BackgroundTransparency = 1, TextTransparency = 1 }):Play()
		task.wait(0.45)
		a:Destroy()
	end)
	local hijos = {}
	for _, c in avisos:GetChildren() do
		if c:IsA("TextLabel") then
			table.insert(hijos, c)
		end
	end
	if #hijos > 6 then
		hijos[1]:Destroy()
	end
end

------------------------------------------------------------------
-- Inventario y recetas
------------------------------------------------------------------
local panel = esquinas(crear("Frame", {
	Size = UDim2.fromOffset(980, 520), Position = UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5),
	BackgroundColor3 = Color3.fromRGB(22, 24, 34), BackgroundTransparency = 0.06, Visible = false, ZIndex = 5,
}, gui), 14)
borde(panel, Color3.fromRGB(255, 255, 255), 1.5, 0.8)
-- Un botón «Modal» libera el ratón mientras el inventario está abierto
crear("TextButton", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Text = "", Modal = true, AutoButtonColor = false, ZIndex = 4 }, panel)
crear("TextLabel", { Size = UDim2.new(0, 400, 0, 34), Position = UDim2.fromOffset(20, 12), BackgroundTransparency = 1, Text = "INVENTARIO", Font = FUENTE_TIT, TextSize = 26, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(255, 216, 74), ZIndex = 6 }, panel)
local cerrar = esquinas(crear("TextButton", { Size = UDim2.fromOffset(36, 36), Position = UDim2.new(1, -14, 0, 12), AnchorPoint = Vector2.new(1, 0), BackgroundColor3 = Color3.fromRGB(60, 30, 36), Text = "✕", Font = FUENTE, TextSize = 20, TextColor3 = Color3.new(1, 1, 1), ZIndex = 6 }, panel), 8)

local rejilla = crear("Frame", { Size = UDim2.fromOffset(9 * 50 + 8 * 4, 4 * 50 + 3 * 4 + 14), Position = UDim2.fromOffset(20, 60), BackgroundTransparency = 1, ZIndex = 6 }, panel)
local ranurasInv = {}
for i = 1, 36 do
	local R = nuevaRanura(rejilla, 50)
	local fila = (i <= 9) and 3 or (i - 10) // 9
	local col = (i <= 9) and (i - 1) or (i - 10) % 9
	R.boton.Position = UDim2.fromOffset(col * 54, fila * 54 + (fila == 3 and 14 or 0))
	R.boton.ZIndex = 6
	for _, c in R.boton:GetDescendants() do
		if c:IsA("GuiObject") then
			c.ZIndex = 7
		end
	end
	ranurasInv[i] = R
end
local textoAyuda = crear("TextLabel", {
	Size = UDim2.fromOffset(9 * 54, 70), Position = UDim2.fromOffset(20, 60 + 4 * 54 + 22), BackgroundTransparency = 1, TextWrapped = true,
	Text = "Toca una casilla y luego otra para moverla. Arriba: mochila · Abajo: barra rápida.\n🛠 = necesita mesa de trabajo cerca · 🔥 = necesita horno cerca",
	Font = Enum.Font.Gotham, TextSize = 13, TextColor3 = Color3.fromRGB(170, 176, 196), TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 6,
}, panel)
local tirar = esquinas(crear("TextButton", { Size = UDim2.fromOffset(150, 34), Position = UDim2.fromOffset(20, 60 + 4 * 54 + 96), BackgroundColor3 = Color3.fromRGB(90, 40, 44), Text = "🗑  Tirar lo elegido", Font = FUENTE, TextSize = 14, TextColor3 = Color3.new(1, 1, 1), ZIndex = 6, Visible = false }, panel), 8)

local derecha = crear("Frame", { Size = UDim2.new(0, 440, 1, -72), Position = UDim2.new(1, -20, 0, 60), AnchorPoint = Vector2.new(1, 0), BackgroundTransparency = 1, ZIndex = 6 }, panel)
local tituloDer = crear("TextLabel", { Size = UDim2.new(1, 0, 0, 24), BackgroundTransparency = 1, Text = "RECETAS", Font = FUENTE, TextSize = 17, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(220, 224, 240), ZIndex = 6 }, derecha)
local lista = crear("ScrollingFrame", { Size = UDim2.new(1, 0, 1, -30), Position = UDim2.fromOffset(0, 30), BackgroundTransparency = 1, ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, BorderSizePixel = 0, ZIndex = 6 }, derecha)
crear("UIListLayout", { Padding = UDim.new(0, 5), SortOrder = Enum.SortOrder.LayoutOrder }, lista)
local paleta = crear("ScrollingFrame", { Size = UDim2.new(1, 0, 1, -30), Position = UDim2.fromOffset(0, 30), BackgroundTransparency = 1, ScrollBarThickness = 6, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, BorderSizePixel = 0, Visible = false, ZIndex = 6 }, derecha)
crear("UIGridLayout", { CellSize = UDim2.fromOffset(50, 50), CellPadding = UDim2.fromOffset(4, 4) }, paleta)

local elegida = nil
local function marcar()
	for i, R in ranurasInv do
		R.borde.Transparency = (elegida == i) and 0 or 0.75
		R.borde.Color = (elegida == i) and Color3.fromRGB(255, 216, 74) or Color3.new(1, 1, 1)
	end
	tirar.Visible = elegida ~= nil
end
for i, R in ranurasInv do
	R.boton.MouseButton1Click:Connect(function()
		if elegida == nil then
			if estado.inv[i] then
				elegida = i
			end
		else
			if elegida ~= i then
				Interfaz.alAccion("mover", elegida, i)
			end
			elegida = nil
		end
		marcar()
	end)
end
tirar.MouseButton1Click:Connect(function()
	if elegida then
		Interfaz.alAccion("tirar", elegida)
		elegida = nil
		marcar()
	end
end)

local function contar(id)
	local t = 0
	for i = 1, 36 do
		local p = estado.inv[i]
		if p and p.id == id then
			t += p.n
		end
	end
	return t
end

local filasReceta = {}
for i, r in Recetas do
	local fila = esquinas(crear("Frame", { Size = UDim2.new(1, -10, 0, 52), BackgroundColor3 = Color3.fromRGB(34, 37, 52), LayoutOrder = i, ZIndex = 6 }, lista), 8)
	local ic = crear("Frame", { Size = UDim2.fromOffset(40, 40), Position = UDim2.fromOffset(6, 6), BackgroundTransparency = 1, ZIndex = 7 }, fila)
	icono(ic, r.resultado)
	for _, c in ic:GetDescendants() do
		if c:IsA("GuiObject") then
			c.ZIndex = 7
		end
	end
	local partes = {}
	for id, n in r.ingredientes do
		table.insert(partes, n .. " " .. Bloques.nombre(id))
	end
	local donde = r.donde == "mesa" and "🛠 " or r.donde == "horno" and "🔥 " or ""
	crear("TextLabel", { Size = UDim2.new(1, -150, 0, 22), Position = UDim2.fromOffset(54, 4), BackgroundTransparency = 1, Text = donde .. Bloques.nombre(r.resultado) .. (r.n > 1 and (" ×" .. r.n) or ""), Font = FUENTE, TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.new(1, 1, 1), ZIndex = 7, TextTruncate = Enum.TextTruncate.AtEnd }, fila)
	crear("TextLabel", { Size = UDim2.new(1, -150, 0, 20), Position = UDim2.fromOffset(54, 26), BackgroundTransparency = 1, Text = table.concat(partes, " · "), Font = Enum.Font.Gotham, TextSize = 12, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(170, 176, 196), ZIndex = 7, TextTruncate = Enum.TextTruncate.AtEnd }, fila)
	local b1 = esquinas(crear("TextButton", { Size = UDim2.fromOffset(56, 32), Position = UDim2.new(1, -72, 0.5, 0), AnchorPoint = Vector2.new(0.5, 0.5), Text = "Crear", Font = FUENTE, TextSize = 13, TextColor3 = Color3.new(1, 1, 1), ZIndex = 7 }, fila), 6)
	local b5 = esquinas(crear("TextButton", { Size = UDim2.fromOffset(40, 32), Position = UDim2.new(1, -24, 0.5, 0), AnchorPoint = Vector2.new(0.5, 0.5), Text = "×5", Font = FUENTE, TextSize = 13, TextColor3 = Color3.new(1, 1, 1), ZIndex = 7 }, fila), 6)
	b1.MouseButton1Click:Connect(function()
		Interfaz.alAccion("craftear", i, 1)
	end)
	b5.MouseButton1Click:Connect(function()
		Interfaz.alAccion("craftear", i, 5)
	end)
	filasReceta[i] = { fila = fila, b1 = b1, b5 = b5, r = r }
end

local function pintarRecetas()
	for _, F in filasReceta do
		local r = F.r
		local veces = math.huge
		for id, n in r.ingredientes do
			veces = math.min(veces, contar(id) // n)
		end
		local lugar = not r.donde or estado.cerca[r.donde]
		local puede = veces >= 1 and lugar
		F.b1.BackgroundColor3 = puede and Color3.fromRGB(60, 160, 80) or Color3.fromRGB(70, 72, 84)
		F.b5.BackgroundColor3 = (puede and veces >= 5) and Color3.fromRGB(60, 140, 160) or Color3.fromRGB(70, 72, 84)
		F.fila.BackgroundColor3 = puede and Color3.fromRGB(40, 50, 58) or Color3.fromRGB(34, 37, 52)
		-- Las que se pueden hacer van primero
		F.fila.LayoutOrder = (puede and 0 or (veces >= 1 and 1000 or 2000)) + table.find(Recetas, r)
	end
end

-- Paleta del modo creativo
for _, d in Bloques.lista do
	if d.forma ~= "agua" then
		local R = nuevaRanura(paleta, 50)
		pintarRanura(R, { id = d.id, n = 1 })
		R.boton.MouseButton1Click:Connect(function()
			Interfaz.alAccion("creativo", d.id)
		end)
	end
end
for _, d in Bloques.objetos do
	local R = nuevaRanura(paleta, 50)
	pintarRanura(R, { id = d.id, n = 1 })
	R.boton.MouseButton1Click:Connect(function()
		Interfaz.alAccion("creativo", d.id)
	end)
end
for _, c in paleta:GetDescendants() do
	if c:IsA("GuiObject") then
		c.ZIndex = 7
	end
end

function Interfaz.inventario(inv, sel)
	estado.inv = inv
	estado.sel = sel or estado.sel
	for i = 1, 9 do
		pintarRanura(ranurasBarra[i], inv[i])
	end
	for i = 1, 36 do
		pintarRanura(ranurasInv[i], inv[i])
	end
	Interfaz.seleccion(estado.sel, true)
	if panel.Visible then
		pintarRecetas()
	end
end

function Interfaz.seleccion(i, callado)
	estado.sel = i
	for k, R in ranurasBarra do
		R.borde.Transparency = (k == i) and 0 or 0.75
		R.borde.Thickness = (k == i) and 3 or 1.5
		R.boton.BackgroundTransparency = (k == i) and 0.05 or 0.25
	end
	local p = estado.inv[i]
	icono(manoIcono, p and p.id or nil)
	if not callado then
		nombreObjeto.Text = p and Bloques.nombre(p.id) or ""
		nombreObjeto.TextTransparency = 0
		nombreObjeto:SetAttribute("t", os.clock())
		task.delay(1.6, function()
			if os.clock() - (nombreObjeto:GetAttribute("t") or 0) >= 1.5 then
				TweenService:Create(nombreObjeto, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
			end
		end)
	end
end

function Interfaz.cerca(c)
	estado.cerca = c
	if panel.Visible then
		pintarRecetas()
	end
end

function Interfaz.abierto()
	return panel.Visible
end

function Interfaz.alternarInventario(forzar)
	local ver = forzar
	if ver == nil then
		ver = not panel.Visible
	end
	panel.Visible = ver
	elegida = nil
	marcar()
	local creativo = estado.modo == "creativo"
	paleta.Visible = creativo
	lista.Visible = not creativo
	tituloDer.Text = creativo and "TODOS LOS BLOQUES Y OBJETOS (se ponen en la casilla elegida)" or "RECETAS"
	textoAyuda.Visible = true
	if ver then
		Interfaz.alAccion("abrirInv")
		pintarRecetas()
	end
	mira.Visible = not ver
end
cerrar.MouseButton1Click:Connect(function()
	Interfaz.alternarInventario(false)
end)

------------------------------------------------------------------
-- Menú de inicio
------------------------------------------------------------------
local menu = crear("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(12, 14, 22), BackgroundTransparency = 0.15, ZIndex = 20 }, gui)
crear("UIGradient", { Color = ColorSequence.new(Color3.fromRGB(40, 70, 40), Color3.fromRGB(12, 14, 22)), Rotation = 90 }, menu)
crear("TextButton", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Text = "", Modal = true, AutoButtonColor = false, ZIndex = 20 }, menu)
local caja = crear("Frame", { Size = UDim2.fromOffset(560, 470), Position = UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundTransparency = 1, ZIndex = 21 }, menu)
crear("TextLabel", { Size = UDim2.new(1, 0, 0, 80), BackgroundTransparency = 1, Text = "BLOCKVERSE", Font = FUENTE_TIT, TextSize = 72, TextColor3 = Color3.fromRGB(255, 216, 74), TextStrokeColor3 = Color3.fromRGB(60, 40, 0), TextStrokeTransparency = 0, ZIndex = 21 }, caja)
crear("TextLabel", { Size = UDim2.new(1, 0, 0, 24), Position = UDim2.fromOffset(0, 82), BackgroundTransparency = 1, Text = "Construye, explora y sobrevive", Font = Enum.Font.Gotham, TextSize = 18, TextColor3 = Color3.fromRGB(210, 220, 230), ZIndex = 21 }, caja)
local cargando = crear("TextLabel", { Size = UDim2.new(1, 0, 0, 22), Position = UDim2.fromOffset(0, 116), BackgroundTransparency = 1, Text = "Generando el mundo…", Font = FUENTE, TextSize = 15, TextColor3 = Color3.fromRGB(150, 230, 150), ZIndex = 21 }, caja)

local function botonMenu(texto, sub, y, col, fn)
	local b = esquinas(crear("TextButton", { Size = UDim2.new(1, -80, 0, 66), Position = UDim2.fromOffset(40, y), BackgroundColor3 = col, Text = "", AutoButtonColor = true, ZIndex = 22 }, caja), 12)
	borde(b, Color3.new(1, 1, 1), 2, 0.6)
	crear("TextLabel", { Size = UDim2.new(1, 0, 0, 32), Position = UDim2.fromOffset(0, 8), BackgroundTransparency = 1, Text = texto, Font = FUENTE, TextSize = 24, TextColor3 = Color3.new(1, 1, 1), ZIndex = 23 }, b)
	crear("TextLabel", { Size = UDim2.new(1, 0, 0, 18), Position = UDim2.fromOffset(0, 40), BackgroundTransparency = 1, Text = sub, Font = Enum.Font.Gotham, TextSize = 13, TextColor3 = Color3.fromRGB(230, 236, 240), ZIndex = 23 }, b)
	b.MouseButton1Click:Connect(fn)
	return b
end
botonMenu("Supervivencia", "Consigue recursos, fabrica herramientas y sobrevive a la noche", 158, Color3.fromRGB(60, 140, 70), function()
	Interfaz.alModo("supervivencia")
end)
botonMenu("Creativo", "Todos los bloques, sin daño y puedes volar (F)", 236, Color3.fromRGB(60, 110, 170), function()
	Interfaz.alModo("creativo")
end)
local controles = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
	and "Mantén ⛏ para picar · ✋ para poner o comer · 🎒 inventario"
	or "Clic izq.: picar / atacar · Clic dcho.: poner / comer · 1-9 o rueda: elegir\nE: inventario · V: cámara · Shift: correr · F: volar (creativo)"
crear("TextLabel", { Size = UDim2.new(1, 0, 0, 60), Position = UDim2.fromOffset(0, 320), BackgroundTransparency = 1, Text = controles, TextWrapped = true, Font = Enum.Font.Gotham, TextSize = 14, TextColor3 = Color3.fromRGB(190, 196, 214), ZIndex = 21 }, caja)

function Interfaz.mostrarMenu(si)
	menu.Visible = si
	mira.Visible = not si
end
function Interfaz.menuVisible()
	return menu.Visible
end
function Interfaz.mundoListo(si)
	cargando.Text = si and "¡Mundo listo! Elige un modo" or "Generando el mundo…"
end

-- Botón de menú (arriba a la derecha) para cambiar de modo
local botonPausa = esquinas(crear("TextButton", { Size = UDim2.fromOffset(44, 44), Position = UDim2.new(1, -14, 0, 60), AnchorPoint = Vector2.new(1, 0), BackgroundColor3 = Color3.fromRGB(22, 24, 34), BackgroundTransparency = 0.3, Text = "☰", Font = FUENTE, TextSize = 22, TextColor3 = Color3.new(1, 1, 1) }, gui), 10)
botonPausa.MouseButton1Click:Connect(function()
	Interfaz.alternarInventario(false)
	Interfaz.mostrarMenu(true)
end)

------------------------------------------------------------------
-- Botones táctiles
------------------------------------------------------------------
function Interfaz.botonesMovil(alPicar, alPoner, alInventario, alVolar)
	if not UserInputService.TouchEnabled then
		return
	end
	local function boton(txt, pos, tam)
		local b = esquinas(crear("TextButton", { Size = UDim2.fromOffset(tam, tam), Position = pos, AnchorPoint = Vector2.new(1, 1), BackgroundColor3 = Color3.fromRGB(20, 22, 32), BackgroundTransparency = 0.35, Text = txt, TextSize = tam * 0.45, Font = Enum.Font.SourceSans, TextColor3 = Color3.new(1, 1, 1), AutoButtonColor = true }, gui), tam // 2)
		borde(b, Color3.new(1, 1, 1), 2, 0.6)
		return b
	end
	local picar = boton("⛏️", UDim2.new(1, -150, 1, -200), 78)
	local poner = boton("✋", UDim2.new(1, -240, 1, -130), 64)
	local inv = boton("🎒", UDim2.new(1, -14, 0, 112), 50)
	local volar = boton("🕊️", UDim2.new(1, -14, 0, 168), 50)
	picar.MouseButton1Down:Connect(function()
		alPicar(true)
	end)
	picar.MouseButton1Up:Connect(function()
		alPicar(false)
	end)
	picar.MouseLeave:Connect(function()
		alPicar(false)
	end)
	poner.MouseButton1Click:Connect(alPoner)
	inv.MouseButton1Click:Connect(alInventario)
	volar.MouseButton1Click:Connect(alVolar)
	Interfaz.botonVolar = volar
	volar.Visible = false
end

return Interfaz
