-- Cliente: HUD, menús, notificaciones, efectos, herramientas y tutorial.
-- Toda la interfaz se construye por código para que el .rbxlx funcione tal cual.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local ProximityPromptService = game:GetService("ProximityPromptService")
local CollectionService = game:GetService("CollectionService")
local Debris = game:GetService("Debris")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("Config"))
local AnomalyData = require(Shared:WaitForChild("AnomalyData"))
local Util = require(Shared:WaitForChild("Util"))
local Builder = require(Shared:WaitForChild("AnomalyBuilder"))

local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local Request = Remotes:WaitForChild("Request")

local snapshot = nil

---------------------------------------------------------------------------
-- Tema y utilidades de UI
---------------------------------------------------------------------------
local T = {
	Panel = Color3.fromRGB(26, 16, 44),
	Panel2 = Color3.fromRGB(44, 28, 74),
	Accent = Color3.fromRGB(170, 90, 255),
	Accent2 = Color3.fromRGB(90, 220, 255),
	Green = Color3.fromRGB(80, 240, 130),
	Red = Color3.fromRGB(255, 70, 90),
	Gold = Color3.fromRGB(255, 210, 80),
	Text = Color3.fromRGB(255, 255, 255),
	Sub = Color3.fromRGB(205, 190, 235),
	Dark = Color3.fromRGB(12, 6, 22),
}

local function new(class, props, children)
	local o = Instance.new(class)
	local parent
	for k, v in pairs(props or {}) do
		if k == "Parent" then
			parent = v
		else
			o[k] = v
		end
	end
	for _, c in ipairs(children or {}) do
		c.Parent = o
	end
	if parent then
		o.Parent = parent
	end
	return o
end

local function corner(r)
	return new("UICorner", { CornerRadius = UDim.new(0, r or 12) })
end

local function stroke(color, th)
	return new("UIStroke", { Color = color or T.Dark, Thickness = th or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border })
end

local function tstroke(th)
	return new("UIStroke", { Color = T.Dark, Thickness = th or 2 })
end

local function gradient(c1, c2, rot)
	return new("UIGradient", { Color = ColorSequence.new(c1, c2), Rotation = rot or 90 })
end

local function label(props)
	local maxText = props.MaxText
	props.MaxText = nil
	props.BackgroundTransparency = 1
	props.Font = props.Font or Enum.Font.GothamBold
	props.TextScaled = props.TextScaled ~= false
	props.TextColor3 = props.TextColor3 or T.Text
	local l = new("TextLabel", props)
	if props.TextScaled then
		new("UITextSizeConstraint", { MaxTextSize = maxText or 48, Parent = l })
	end
	return l
end

-- Sonidos
local soundCache = {}
local function sfx(name, volume, pitch)
	local id = Config.Sounds[name]
	if not id or id == "" then
		return
	end
	local s = soundCache[name]
	if not s then
		s = new("Sound", { SoundId = id, Parent = SoundService })
		soundCache[name] = s
	end
	s.Volume = volume or 0.5
	s.PlaybackSpeed = pitch or 1
	SoundService:PlayLocalSound(s)
end

local function button(props, onClick)
	local color = props.Color or T.Accent
	local radius = props.Radius
	props.Color = nil
	props.Radius = nil
	props.AutoButtonColor = false
	props.BackgroundColor3 = Color3.new(1, 1, 1)
	props.Font = props.Font or Enum.Font.FredokaOne
	props.TextScaled = true
	props.TextColor3 = props.TextColor3 or T.Text
	local b = new("TextButton", props, {
		corner(radius or 12),
		stroke(T.Dark, 3),
		gradient(color, color:Lerp(Color3.new(0, 0, 0), 0.35)),
		new("UITextSizeConstraint", { MaxTextSize = 30 }),
		tstroke(2),
	})
	local scale = new("UIScale", { Parent = b })
	b.MouseEnter:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1.06 }):Play()
	end)
	b.MouseLeave:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1 }):Play()
	end)
	b.MouseButton1Down:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.06), { Scale = 0.93 }):Play()
	end)
	b.MouseButton1Up:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.1, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end)
	b.Activated:Connect(function()
		sfx("Click", 0.3, 1.4)
		onClick()
	end)
	return b
end

---------------------------------------------------------------------------
-- ScreenGui y escalado móvil
---------------------------------------------------------------------------
local playerGui = player:WaitForChild("PlayerGui")
local gui = new("ScreenGui", {
	Name = "HUD",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = playerGui,
})

local scalers = {}
local function scaled(obj)
	local s = new("UIScale", { Parent = obj })
	table.insert(scalers, s)
	return obj
end
local function updateScale()
	local vp = camera.ViewportSize
	local s = math.clamp(math.min(vp.X / 1280, vp.Y / 760), 0.55, 1.15)
	for _, sc in ipairs(scalers) do
		sc.Scale = s
	end
end
camera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)

---------------------------------------------------------------------------
-- Barra del ciclo (arriba)
---------------------------------------------------------------------------
local cycleBar = scaled(new("Frame", {
	Name = "Cycle",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 10),
	Size = UDim2.fromOffset(400, 66),
	BackgroundColor3 = Color3.new(1, 1, 1),
	Parent = gui,
}, { corner(16), stroke(T.Dark, 3) }))
local cycleGrad = gradient(T.Panel2, T.Panel)
cycleGrad.Parent = cycleBar
local cycleText = label({ Size = UDim2.new(1, -20, 0, 34), Position = UDim2.fromOffset(10, 6), Font = Enum.Font.FredokaOne, Text = "", Parent = cycleBar })
tstroke(2).Parent = cycleText
local cycleTrack = new("Frame", { Position = UDim2.new(0, 14, 1, -20), Size = UDim2.new(1, -28, 0, 10), BackgroundColor3 = T.Dark, Parent = cycleBar }, { corner(5) })
local cycleFill = new("Frame", { Size = UDim2.fromScale(0.5, 1), BackgroundColor3 = T.Gold, Parent = cycleTrack }, { corner(5) })

---------------------------------------------------------------------------
-- Panel de dinero (izquierda)
---------------------------------------------------------------------------
local isTouch = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
local left = scaled(new("Frame", {
	Name = "Left",
	AnchorPoint = Vector2.new(0, 0),
	Position = UDim2.new(0, 12, 0, 70),
	Size = UDim2.fromOffset(250, 440),
	BackgroundTransparency = 1,
	Parent = gui,
}))
local money = new("Frame", { Size = UDim2.fromOffset(250, 110), BackgroundColor3 = Color3.new(1, 1, 1), Parent = left }, {
	corner(16),
	stroke(T.Dark, 3),
	gradient(Color3.fromRGB(40, 90, 60), Color3.fromRGB(20, 45, 30)),
})
local cashText = label({ Size = UDim2.new(1, -16, 0, 50), Position = UDim2.fromOffset(8, 6), Font = Enum.Font.FredokaOne, Text = "$0", TextColor3 = T.Green, MaxText = 44, Parent = money })
tstroke(3).Parent = cashText
local cashScale = new("UIScale", { Parent = cashText })
local incomeText = label({ Size = UDim2.new(1, -16, 0, 24), Position = UDim2.fromOffset(8, 56), Text = "+$0/s", TextColor3 = Color3.fromRGB(200, 255, 210), Parent = money })
tstroke(2).Parent = incomeText
local multText = label({ Size = UDim2.new(1, -16, 0, 20), Position = UDim2.fromOffset(8, 82), Text = "", TextColor3 = T.Gold, Font = Enum.Font.GothamBlack, Parent = money })
tstroke(2).Parent = multText

local grid = new("Frame", { Position = UDim2.fromOffset(0, 122), Size = UDim2.fromOffset(250, 320), BackgroundTransparency = 1, Parent = left }, {
	new("UIGridLayout", {
		CellSize = isTouch and UDim2.fromOffset(56, 56) or UDim2.fromOffset(119, 72),
		CellPadding = isTouch and UDim2.fromOffset(8, 8) or UDim2.fromOffset(12, 10),
		SortOrder = Enum.SortOrder.LayoutOrder,
	}),
})

local badges = {}
local openMenu -- forward

local function menuButton(order, key, icon, text, color)
	local b = button({ Name = key, LayoutOrder = order, Text = "", Color = color, Parent = grid }, function()
		openMenu(key)
	end)
	label({ Size = isTouch and UDim2.fromScale(1, 0.9) or UDim2.new(1, 0, 0.6, 0), Position = UDim2.fromScale(0, 0.04), Text = icon, Font = Enum.Font.GothamBold, MaxText = 34, Parent = b })
	local l = label({ Size = UDim2.new(1, -6, 0.34, 0), Position = UDim2.new(0, 3, 0.62, 0), Text = text, Font = Enum.Font.FredokaOne, MaxText = 20, Visible = not isTouch, Parent = b })
	tstroke(2).Parent = l
	local badge = new("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(1, -6, 0, 6), Size = UDim2.fromOffset(22, 22), BackgroundColor3 = T.Red, Visible = false, ZIndex = 3, Parent = b }, {
		corner(11),
		stroke(Color3.new(1, 1, 1), 2),
	})
	label({ Size = UDim2.fromScale(1, 1), Text = "!", Font = Enum.Font.GothamBlack, ZIndex = 4, Parent = badge })
	badges[key] = badge
	return b
end

menuButton(1, "Shop", "🛒", "Tienda", Color3.fromRGB(255, 170, 40))
menuButton(2, "Index", "📖", "Índice", Color3.fromRGB(90, 160, 255))
menuButton(3, "Missions", "📋", "Misiones", Color3.fromRGB(80, 210, 120))
menuButton(4, "Upgrade", "🏗", "Mejorar", Color3.fromRGB(60, 200, 220))
menuButton(5, "Rebirth", "✦", "Ascender", Color3.fromRGB(230, 80, 200))
menuButton(6, "Daily", "📅", "Diario", Color3.fromRGB(255, 110, 90))
menuButton(7, "Codes", "🎁", "Códigos", Color3.fromRGB(150, 100, 255))
menuButton(8, "Invite", "👥", "Invitar", Color3.fromRGB(60, 200, 255))

---------------------------------------------------------------------------
-- Notificaciones (derecha) y anuncios (centro)
---------------------------------------------------------------------------
local toastHolder = scaled(new("Frame", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -12, 0, 90),
	Size = UDim2.fromOffset(360, 400),
	BackgroundTransparency = 1,
	Parent = gui,
}, {
	new("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder, HorizontalAlignment = Enum.HorizontalAlignment.Right }),
}))
local toastCount = 0

local function toast(text, color)
	color = color or T.Text
	toastCount += 1
	local holder = new("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundTransparency = 1, LayoutOrder = toastCount, Parent = toastHolder })
	local f = new("Frame", { Position = UDim2.fromScale(1.1, 0), Size = UDim2.fromScale(1, 1), BackgroundColor3 = T.Panel, BackgroundTransparency = 0.08, Parent = holder }, {
		corner(10),
		stroke(color, 2),
	})
	new("Frame", { Size = UDim2.new(0, 6, 1, -12), Position = UDim2.fromOffset(6, 6), BackgroundColor3 = color, Parent = f }, { corner(3) })
	local l = label({ Size = UDim2.new(1, -26, 1, -8), Position = UDim2.fromOffset(18, 4), Text = text, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = color, MaxText = 20, Parent = f })
	tstroke(1.5).Parent = l
	TweenService:Create(f, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Position = UDim2.fromScale(0, 0) }):Play()
	local kids = {}
	for _, c in ipairs(toastHolder:GetChildren()) do
		if c:IsA("Frame") then
			table.insert(kids, c)
		end
	end
	if #kids > 5 then
		table.sort(kids, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		kids[1]:Destroy()
	end
	task.delay(4.5, function()
		if f.Parent then
			TweenService:Create(f, TweenInfo.new(0.3), { Position = UDim2.fromScale(1.1, 0) }):Play()
			task.wait(0.3)
			holder:Destroy()
		end
	end)
end

local announce = new("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.27),
	Size = UDim2.fromOffset(800, 130),
	BackgroundTransparency = 1,
	Visible = false,
	Parent = gui,
})
local annScale = new("UIScale", { Parent = announce })
table.insert(scalers, annScale)
local annTitle = label({ Size = UDim2.new(1, 0, 0.62, 0), Font = Enum.Font.FredokaOne, Text = "", MaxText = 72, Parent = announce })
local annTitleStroke = tstroke(4)
annTitleStroke.Parent = annTitle
local annSub = label({ Position = UDim2.fromScale(0, 0.64), Size = UDim2.new(1, 0, 0.3, 0), Text = "", TextColor3 = T.Text, MaxText = 30, Parent = announce })
tstroke(2.5).Parent = annSub
local annToken = 0

local function showAnnounce(title, sub, color)
	annToken += 1
	local my = annToken
	annTitle.Text = title
	annTitle.TextColor3 = color or T.Gold
	annSub.Text = sub or ""
	annTitle.TextTransparency = 0
	annSub.TextTransparency = 0
	announce.Visible = true
	local inner = annTitle:FindFirstChild("Pop") or new("UIScale", { Name = "Pop", Parent = annTitle })
	inner.Scale = 0.3
	TweenService:Create(inner, TweenInfo.new(0.45, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	task.delay(3.2, function()
		if my ~= annToken then
			return
		end
		TweenService:Create(annTitle, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
		TweenService:Create(annSub, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
		task.wait(0.5)
		if my == annToken then
			announce.Visible = false
		end
	end)
end

-- Destello de pantalla
local flash = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = T.Red, BackgroundTransparency = 1, ZIndex = 0, Parent = gui })
local function screenFlash(color, strength)
	flash.BackgroundColor3 = color or T.Red
	flash.BackgroundTransparency = 1 - (strength or 0.35)
	TweenService:Create(flash, TweenInfo.new(0.8), { BackgroundTransparency = 1 }):Play()
end

-- Temblor de cámara
local shakeUntil, shakePower = 0, 0
RunService:BindToRenderStep("AnomalyShake", Enum.RenderPriority.Camera.Value + 1, function()
	if os.clock() < shakeUntil then
		camera.CFrame *= CFrame.new((math.random() - 0.5) * shakePower, (math.random() - 0.5) * shakePower, 0)
	end
end)
local function shake(duration, power)
	shakeUntil = os.clock() + duration
	shakePower = power or 0.4
end

---------------------------------------------------------------------------
-- Banner inferior (llevando anomalía / escáner)
---------------------------------------------------------------------------
local banner = scaled(new("Frame", {
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -110),
	Size = UDim2.fromOffset(520, 56),
	BackgroundColor3 = Color3.new(1, 1, 1),
	Visible = false,
	Parent = gui,
}, { corner(14), stroke(T.Dark, 3), gradient(Color3.fromRGB(255, 150, 50), Color3.fromRGB(190, 70, 30)) }))
local bannerText = label({ Size = UDim2.new(1, -20, 1, -10), Position = UDim2.fromOffset(10, 5), Font = Enum.Font.FredokaOne, Text = "", Parent = banner })
tstroke(2).Parent = bannerText

local scanCard = scaled(new("Frame", {
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -175),
	Size = UDim2.fromOffset(460, 110),
	BackgroundColor3 = Color3.new(1, 1, 1),
	Visible = false,
	Parent = gui,
}, { corner(14), stroke(T.Dark, 3) }))
local scanGrad = gradient(T.Green, Color3.fromRGB(20, 90, 50))
scanGrad.Parent = scanCard
local scanTitle = label({ Size = UDim2.new(1, -20, 0, 40), Position = UDim2.fromOffset(10, 6), Font = Enum.Font.FredokaOne, Text = "", Parent = scanCard })
tstroke(2.5).Parent = scanTitle
local scanBody = label({ Size = UDim2.new(1, -20, 0, 26), Position = UDim2.fromOffset(10, 48), Text = "", Parent = scanCard })
tstroke(2).Parent = scanBody
local scanLore = label({ Size = UDim2.new(1, -20, 0, 22), Position = UDim2.fromOffset(10, 78), Text = "", Font = Enum.Font.GothamMedium, TextColor3 = Color3.fromRGB(230, 230, 230), Parent = scanCard })
local scanToken = 0

---------------------------------------------------------------------------
-- Menús modales
---------------------------------------------------------------------------
local modal = scaled(new("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.52),
	Size = UDim2.fromOffset(620, 460),
	BackgroundColor3 = Color3.new(1, 1, 1),
	Visible = false,
	ZIndex = 5,
	Parent = gui,
}, { corner(18), stroke(T.Dark, 4), gradient(T.Panel2, T.Panel) }))
local modalPop = new("UIScale", { Name = "Pop", Parent = modal })
local modalTitle = label({ Size = UDim2.new(1, -120, 0, 50), Position = UDim2.fromOffset(20, 10), Font = Enum.Font.FredokaOne, Text = "", TextXAlignment = Enum.TextXAlignment.Left, MaxText = 40, ZIndex = 6, Parent = modal })
tstroke(3).Parent = modalTitle
local content = new("Frame", { Position = UDim2.fromOffset(16, 66), Size = UDim2.new(1, -32, 1, -82), BackgroundTransparency = 1, ZIndex = 6, Parent = modal })
local currentMenu = nil
button({ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -12, 0, 12), Size = UDim2.fromOffset(46, 46), Text = "✕", Color = T.Red, ZIndex = 7, Parent = modal }, function()
	openMenu(nil)
end)

local pages = {}

local function clearContent()
	for _, c in ipairs(content:GetChildren()) do
		c:Destroy()
	end
end

local function ask(action, arg)
	local ok, res = pcall(function()
		return Request:InvokeServer(action, arg)
	end)
	if not ok or type(res) ~= "table" then
		return nil
	end
	if res.Msg and res.Msg ~= "" then
		toast(res.Msg, res.Ok and T.Green or T.Red)
	end
	return res
end

local function inviteFriends()
	local SocialService = game:GetService("SocialService")
	local ok, can = pcall(function()
		return SocialService:CanSendGameInviteAsync(player)
	end)
	if ok and can then
		pcall(function()
			SocialService:PromptGameInvite(player)
		end)
	else
		toast("👥 Invita amigos desde el menú de Roblox: ¡+10% de dinero por cada uno!", T.Accent2)
	end
end

function openMenu(key)
	if key == "Invite" then
		task.spawn(inviteFriends)
		return
	end
	if key == currentMenu or key == nil then
		currentMenu = nil
		modal.Visible = false
		return
	end
	currentMenu = key
	clearContent()
	local page = pages[key]
	modalTitle.Text = page.Title
	page.Build(content)
	modal.Visible = true
	modalPop.Scale = 0.7
	TweenService:Create(modalPop, TweenInfo.new(0.3, Enum.EasingStyle.Back), { Scale = 1 }):Play()
end

local function rebuildMenu()
	if currentMenu then
		local key = currentMenu
		clearContent()
		pages[key].Build(content)
	end
end

local function card(parent, props)
	props.BackgroundColor3 = props.BackgroundColor3 or Color3.fromRGB(58, 38, 94)
	local f = new("Frame", props, { corner(12), stroke(T.Dark, 2) })
	f.Parent = parent
	return f
end

-- Tienda --------------------------------------------------------------------
pages.Shop = {
	Title = "🛒 Tienda",
	Build = function(root)
		local scroll = new("ScrollingFrame", {
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			ScrollBarThickness = 6,
			AutomaticCanvasSize = Enum.AutomaticSize.Y,
			CanvasSize = UDim2.new(),
			ZIndex = 6,
			Parent = root,
		}, {
			new("UIGridLayout", { CellSize = UDim2.fromOffset(280, 120), CellPadding = UDim2.fromOffset(12, 12), SortOrder = Enum.SortOrder.LayoutOrder }),
		})
		local order = 0
		local function item(kind, key, def)
			order += 1
			local owned = kind == "Pass" and snapshot and snapshot.Passes and snapshot.Passes[key]
			local c = card(scroll, { LayoutOrder = order, ZIndex = 6 })
			label({ Size = UDim2.fromOffset(60, 60), Position = UDim2.fromOffset(10, 10), Text = def.Icon, MaxText = 44, ZIndex = 7, Parent = c })
			local n = label({ Size = UDim2.new(1, -84, 0, 28), Position = UDim2.fromOffset(76, 8), Text = def.Name, Font = Enum.Font.FredokaOne, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, Parent = c })
			tstroke(2).Parent = n
			label({ Size = UDim2.new(1, -84, 0, 34), Position = UDim2.fromOffset(76, 36), Text = def.Desc, TextColor3 = T.Sub, Font = Enum.Font.GothamMedium, TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true, ZIndex = 7, Parent = c })
			button({ Position = UDim2.new(0, 10, 1, -42), Size = UDim2.new(1, -20, 0, 34), Text = owned and "✔ Lo tienes" or ("R$ " .. def.Price), Color = owned and Color3.fromRGB(70, 70, 90) or T.Green, ZIndex = 7, Parent = c }, function()
				if not owned then
					ask(kind, key)
				end
			end)
		end
		local keys = {}
		for key in pairs(Config.Products) do
			table.insert(keys, key)
		end
		table.sort(keys)
		for _, key in ipairs(keys) do
			item("Product", key, Config.Products[key])
		end
		keys = {}
		for key in pairs(Config.GamePasses) do
			table.insert(keys, key)
		end
		table.sort(keys)
		for _, key in ipairs(keys) do
			item("Pass", key, Config.GamePasses[key])
		end
	end,
}

-- Índice --------------------------------------------------------------------
local indexViewports = {}
pages.Index = {
	Title = "📖 Índice de Anomalías",
	Build = function(root)
		indexViewports = {}
		local found = 0
		for _, def in ipairs(AnomalyData.List) do
			if snapshot and snapshot.Index[def.Id] then
				found += 1
			end
		end
		label({ Size = UDim2.new(1, 0, 0, 24), Text = ("Descubiertas %d / %d  •  ¡Cada nueva te da un bonus!"):format(found, #AnomalyData.List), TextColor3 = T.Gold, ZIndex = 6, Parent = root })
		local scroll = new("ScrollingFrame", {
			Position = UDim2.fromOffset(0, 30),
			Size = UDim2.new(1, 0, 1, -30),
			BackgroundTransparency = 1,
			ScrollBarThickness = 6,
			AutomaticCanvasSize = Enum.AutomaticSize.Y,
			CanvasSize = UDim2.new(),
			ZIndex = 6,
			Parent = root,
		}, {
			new("UIGridLayout", { CellSize = UDim2.fromOffset(134, 172), CellPadding = UDim2.fromOffset(10, 10), SortOrder = Enum.SortOrder.LayoutOrder }),
		})
		for i, def in ipairs(AnomalyData.List) do
			local known = snapshot and snapshot.Index[def.Id]
			local rarity = Config.RarityById[def.Rarity]
			local c = card(scroll, { LayoutOrder = i, ZIndex = 6, BackgroundColor3 = known and Color3.fromRGB(58, 38, 94) or Color3.fromRGB(30, 22, 44) })
			local vp = new("ViewportFrame", {
				Size = UDim2.new(1, -12, 0, 104),
				Position = UDim2.fromOffset(6, 6),
				BackgroundColor3 = T.Dark,
				Ambient = Color3.fromRGB(180, 170, 200),
				LightColor = Color3.fromRGB(255, 255, 255),
				LightDirection = Vector3.new(-0.5, -1, 0.6),
				ZIndex = 7,
				Parent = c,
			}, { corner(10) })
			local model = Builder.Build(def.Id, nil, { NoFx = true })
			CollectionService:RemoveTag(model, "Anomaly")
			if not known then
				Builder.Silhouette(model)
			end
			model.Parent = vp
			local cam = new("Camera", { FieldOfView = 40, Parent = vp })
			vp.CurrentCamera = cam
			local h = model:GetAttribute("Height") or 6
			table.insert(indexViewports, { Camera = cam, Height = h, Phase = i })
			new("Frame", { Position = UDim2.new(0, 6, 0, 112), Size = UDim2.new(1, -12, 0, 4), BackgroundColor3 = rarity.Color, ZIndex = 7, Parent = c }, { corner(2) })
			local n = label({ Position = UDim2.fromOffset(6, 118), Size = UDim2.new(1, -12, 0, 24), Text = known and def.Name or "???", Font = Enum.Font.FredokaOne, ZIndex = 7, Parent = c })
			tstroke(2).Parent = n
			label({ Position = UDim2.fromOffset(6, 144), Size = UDim2.new(1, -12, 0, 20), Text = known and (rarity.Name .. " • +" .. Util.Money(def.Income) .. "/s") or rarity.Name, TextColor3 = rarity.Color, ZIndex = 7, Parent = c })
		end
	end,
}

-- Misiones -------------------------------------------------------------------
pages.Missions = {
	Title = "📋 Misiones diarias",
	Build = function(root)
		if not snapshot then
			return
		end
		for i, m in ipairs(snapshot.Missions) do
			local c = card(root, { Position = UDim2.fromOffset(0, (i - 1) * 104), Size = UDim2.new(1, 0, 0, 94), ZIndex = 6 })
			local t = label({ Position = UDim2.fromOffset(14, 8), Size = UDim2.new(1, -220, 0, 30), Text = m.Text, Font = Enum.Font.FredokaOne, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, Parent = c })
			tstroke(2).Parent = t
			local track = new("Frame", { Position = UDim2.fromOffset(14, 48), Size = UDim2.new(1, -220, 0, 18), BackgroundColor3 = T.Dark, ZIndex = 7, Parent = c }, { corner(9) })
			new("Frame", { Size = UDim2.fromScale(math.clamp(m.Progress / m.Target, 0, 1), 1), BackgroundColor3 = T.Green, ZIndex = 8, Parent = track }, { corner(9) })
			label({ Position = UDim2.fromOffset(14, 68), Size = UDim2.new(1, -220, 0, 20), Text = m.Progress .. " / " .. m.Target, TextColor3 = T.Sub, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, Parent = c })
			local done = m.Progress >= m.Target
			button({
				AnchorPoint = Vector2.new(1, 0.5),
				Position = UDim2.new(1, -12, 0.5, 0),
				Size = UDim2.fromOffset(190, 56),
				Text = m.Claimed and "✔ Reclamado" or ("Reclamar\n" .. Util.Money(m.Reward)),
				Color = m.Claimed and Color3.fromRGB(70, 70, 90) or (done and T.Green or Color3.fromRGB(110, 90, 140)),
				ZIndex = 7,
				Parent = c,
			}, function()
				if done and not m.Claimed then
					local res = ask("Mission", i)
					if res and res.Ok then
						sfx("Cash", 0.6, 1.2)
					end
				end
			end)
		end
		label({ Position = UDim2.new(0, 0, 1, -26), Size = UDim2.new(1, 0, 0, 24), Text = "Las misiones se renuevan cada día. ¡Vuelve mañana!", TextColor3 = T.Sub, ZIndex = 6, Parent = root })
	end,
}

-- Mejorar base -----------------------------------------------------------------
pages.Upgrade = {
	Title = "🏗 Mejorar base",
	Build = function(root)
		if not snapshot then
			return
		end
		local c = card(root, { Size = UDim2.new(1, 0, 0, 220), ZIndex = 6 })
		local t = label({ Position = UDim2.fromOffset(16, 12), Size = UDim2.new(1, -32, 0, 44), Text = ("Cápsulas: %d / %d"):format(snapshot.Unlocked, Config.MaxPods), Font = Enum.Font.FredokaOne, ZIndex = 7, Parent = c })
		tstroke(3).Parent = t
		label({ Position = UDim2.fromOffset(16, 64), Size = UDim2.new(1, -32, 0, 28), Text = "Nivel de base: " .. snapshot.BaseLevel, TextColor3 = T.Sub, ZIndex = 7, Parent = c })
		label({ Position = UDim2.fromOffset(16, 100), Size = UDim2.new(1, -32, 0, 26), Text = "+1 cápsula  •  +" .. Config.LockPerLevel .. "s de láser  •  menos fugas en el apagón", TextColor3 = T.Accent2, ZIndex = 7, Parent = c })
		local cost = snapshot.UpgradeCost
		button({ Position = UDim2.new(0.5, -150, 0, 146), Size = UDim2.fromOffset(300, 58), Text = cost and ("Mejorar • " .. Util.Money(cost)) or "¡BASE AL MÁXIMO!", Color = cost and T.Accent2 or Color3.fromRGB(70, 70, 90), ZIndex = 7, Parent = c }, function()
			if cost then
				local res = ask("Upgrade")
				if res and res.Ok then
					sfx("Buy", 0.6, 0.8)
				end
			end
		end)
		label({ Position = UDim2.fromOffset(0, 236), Size = UDim2.new(1, 0, 0, 60), Text = "💡 Cierra tu base con el botón láser (dura más con cada mejora).\nDurante el APAGÓN los láseres se caen: ¡defiéndela con el bate!", TextColor3 = T.Sub, Font = Enum.Font.GothamMedium, TextWrapped = true, ZIndex = 6, Parent = root })
	end,
}

-- Ascender ---------------------------------------------------------------------
pages.Rebirth = {
	Title = "✦ Ascender",
	Build = function(root)
		if not snapshot then
			return
		end
		local cur = 1 + snapshot.Rebirths * Config.RebirthBonus
		local nxt = 1 + (snapshot.Rebirths + 1) * Config.RebirthBonus
		local c = card(root, { Size = UDim2.new(1, 0, 0, 250), ZIndex = 6 })
		local t = label({ Position = UDim2.fromOffset(16, 10), Size = UDim2.new(1, -32, 0, 50), Text = ("x%.1f  ➜  x%.1f dinero"):format(cur, nxt), Font = Enum.Font.FredokaOne, TextColor3 = T.Gold, ZIndex = 7, Parent = c })
		tstroke(3).Parent = t
		label({ Position = UDim2.fromOffset(16, 66), Size = UDim2.new(1, -32, 0, 28), Text = "Ascensos actuales: " .. snapshot.Rebirths, TextColor3 = T.Sub, ZIndex = 7, Parent = c })
		label({ Position = UDim2.fromOffset(16, 100), Size = UDim2.new(1, -32, 0, 44), Text = "⚠ Perderás tu dinero y tus anomalías.\nConservas el Índice, las mejoras de base y obtienes un título.", TextColor3 = Color3.fromRGB(255, 160, 160), Font = Enum.Font.GothamMedium, TextWrapped = true, ZIndex = 7, Parent = c })
		local cash = player:GetAttribute("Cash") or 0
		local can = cash >= snapshot.RebirthCost
		button({ Position = UDim2.new(0.5, -160, 0, 168), Size = UDim2.fromOffset(320, 62), Text = "Ascender • " .. Util.Money(snapshot.RebirthCost), Color = can and Color3.fromRGB(230, 80, 200) or Color3.fromRGB(110, 90, 140), ZIndex = 7, Parent = c }, function()
			local res = ask("Rebirth")
			if res and res.Ok then
				screenFlash(T.Gold, 0.5)
				shake(0.6, 0.6)
				openMenu(nil)
			end
		end)
	end,
}

-- Diario -------------------------------------------------------------------------
pages.Daily = {
	Title = "📅 Recompensa diaria",
	Build = function(root)
		if not snapshot then
			return
		end
		local d = snapshot.Daily
		local row = new("Frame", { Size = UDim2.new(1, 0, 0, 150), BackgroundTransparency = 1, ZIndex = 6, Parent = root }, {
			new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), HorizontalAlignment = Enum.HorizontalAlignment.Center }),
		})
		for day = 1, 7 do
			local claimed = (not d.CanClaim and day <= d.Streak) or (d.CanClaim and day < d.Next)
			local isNext = d.CanClaim and day == d.Next
			local c = card(row, { Size = UDim2.fromOffset(74, 140), ZIndex = 6, BackgroundColor3 = isNext and Color3.fromRGB(255, 170, 60) or (claimed and Color3.fromRGB(50, 110, 70) or Color3.fromRGB(58, 38, 94)) })
			local t = label({ Size = UDim2.new(1, 0, 0, 26), Position = UDim2.fromOffset(0, 6), Text = "Día " .. day, Font = Enum.Font.FredokaOne, ZIndex = 7, Parent = c })
			tstroke(2).Parent = t
			label({ Size = UDim2.new(1, 0, 0, 44), Position = UDim2.fromOffset(0, 36), Text = day == 7 and "👤" or "💰", MaxText = 36, ZIndex = 7, Parent = c })
			local reward = Config.DailyRewards[day]
			label({ Size = UDim2.new(1, -6, 0, 36), Position = UDim2.fromOffset(3, 86), Text = day == 7 and AnomalyData.ById[Config.Day7Anomaly].Name or Util.Money(reward), TextWrapped = true, ZIndex = 7, Parent = c })
			if claimed then
				label({ Size = UDim2.new(1, 0, 0, 20), Position = UDim2.new(0, 0, 1, -22), Text = "✔", TextColor3 = T.Green, ZIndex = 7, Parent = c })
			end
		end
		button({ Position = UDim2.new(0.5, -150, 0, 176), Size = UDim2.fromOffset(300, 60), Text = d.CanClaim and "¡Reclamar!" or "Vuelve mañana", Color = d.CanClaim and T.Green or Color3.fromRGB(70, 70, 90), ZIndex = 7, Parent = root }, function()
			if d.CanClaim then
				local res = ask("Daily")
				if res and res.Ok then
					sfx("Cash", 0.7, 1)
					screenFlash(T.Gold, 0.3)
				end
			end
		end)
		label({ Position = UDim2.fromOffset(0, 256), Size = UDim2.new(1, 0, 0, 50), Text = "Entra cada día para no perder la racha.\nEl día 7 te regala una anomalía ÉPICA.", TextColor3 = T.Sub, Font = Enum.Font.GothamMedium, ZIndex = 6, Parent = root })
	end,
}

-- Códigos -------------------------------------------------------------------------
pages.Codes = {
	Title = "🎁 Códigos",
	Build = function(root)
		local box = new("TextBox", {
			Position = UDim2.new(0.5, -200, 0, 40),
			Size = UDim2.fromOffset(400, 60),
			BackgroundColor3 = T.Dark,
			Font = Enum.Font.FredokaOne,
			PlaceholderText = "Escribe un código...",
			PlaceholderColor3 = Color3.fromRGB(130, 120, 150),
			Text = "",
			TextColor3 = T.Text,
			TextScaled = true,
			ClearTextOnFocus = false,
			ZIndex = 7,
			Parent = root,
		}, { corner(12), stroke(T.Accent, 3), new("UITextSizeConstraint", { MaxTextSize = 30 }) })
		button({ Position = UDim2.new(0.5, -120, 0, 120), Size = UDim2.fromOffset(240, 56), Text = "Canjear", Color = T.Accent, ZIndex = 7, Parent = root }, function()
			if box.Text ~= "" then
				local res = ask("Redeem", box.Text)
				if res and res.Ok then
					sfx("Cash", 0.7, 1.1)
					box.Text = ""
				end
			end
		end)
		label({ Position = UDim2.fromOffset(0, 200), Size = UDim2.new(1, 0, 0, 60), Text = "Publicamos códigos nuevos en TikTok y Discord.\n¡Prueba con ANOMALIA!", TextColor3 = T.Sub, Font = Enum.Font.GothamMedium, ZIndex = 6, Parent = root })
	end,
}

---------------------------------------------------------------------------
-- Estado del jugador
---------------------------------------------------------------------------
local shownCash = 0
local cashValue = new("NumberValue", { Value = 0 })
cashValue.Changed:Connect(function(v)
	cashText.Text = Util.Money(v)
end)

local function refreshCash()
	local cash = player:GetAttribute("Cash") or 0
	local up = cash > shownCash
	shownCash = cash
	TweenService:Create(cashValue, TweenInfo.new(0.4, Enum.EasingStyle.Quad), { Value = cash }):Play()
	if up then
		cashScale.Scale = 1.15
		TweenService:Create(cashScale, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end
end

local function refreshStats()
	incomeText.Text = "+" .. Util.Money(player:GetAttribute("Income") or 0) .. "/s"
	local parts = {}
	local reb = player:GetAttribute("Rebirths") or 0
	if reb > 0 then
		table.insert(parts, ("✦ x%.1f"):format(1 + reb * Config.RebirthBonus))
	end
	local fb = player:GetAttribute("FriendBonus") or 0
	if fb > 0 then
		table.insert(parts, ("👥 +%d%%"):format(math.floor(fb * 100 + 0.5)))
	end
	if player:GetAttribute("Pass_VIP") then
		table.insert(parts, "👑 x2")
	end
	multText.Text = table.concat(parts, "   ")
end

player:GetAttributeChangedSignal("Cash"):Connect(refreshCash)
for _, attr in ipairs({ "Income", "Rebirths", "FriendBonus", "Pass_VIP" }) do
	player:GetAttributeChangedSignal(attr):Connect(refreshStats)
end
refreshCash()
refreshStats()

local function refreshBadges()
	if not snapshot then
		return
	end
	local claimable = false
	for _, m in ipairs(snapshot.Missions) do
		if m.Progress >= m.Target and not m.Claimed then
			claimable = true
		end
	end
	badges.Missions.Visible = claimable
	badges.Daily.Visible = snapshot.Daily.CanClaim
	badges.Upgrade.Visible = snapshot.UpgradeCost ~= nil and (player:GetAttribute("Cash") or 0) >= snapshot.UpgradeCost
	badges.Rebirth.Visible = (player:GetAttribute("Cash") or 0) >= snapshot.RebirthCost
end
player:GetAttributeChangedSignal("Cash"):Connect(refreshBadges)

---------------------------------------------------------------------------
-- Mundo: base propia, pantallas de tiempo, linterna
---------------------------------------------------------------------------
local function myBase()
	local idx = player:GetAttribute("BaseIndex")
	local bases = workspace:FindFirstChild("Bases")
	return idx and bases and bases:FindFirstChild("Base" .. idx)
end

local homeMarker
local function updateHomeMarker()
	if homeMarker then
		homeMarker:Destroy()
	end
	local base = myBase()
	local sign = base and base:FindFirstChild("Sign")
	if not sign then
		return
	end
	homeMarker = new("BillboardGui", {
		Size = UDim2.fromOffset(170, 44),
		StudsOffset = Vector3.new(0, 9, 0),
		AlwaysOnTop = true,
		MaxDistance = 2000,
		LightInfluence = 0,
		Adornee = sign,
		Parent = playerGui,
	}, {})
	local f = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), Parent = homeMarker }, {
		corner(12),
		stroke(T.Dark, 3),
		gradient(T.Green, Color3.fromRGB(30, 130, 70)),
	})
	local l = label({ Size = UDim2.new(1, -10, 1, -8), Position = UDim2.fromOffset(5, 4), Font = Enum.Font.FredokaOne, Text = "🏠 TU BASE", Parent = f })
	tstroke(2).Parent = l
end
player:GetAttributeChangedSignal("BaseIndex"):Connect(updateHomeMarker)
task.defer(updateHomeMarker)

local timerLabels = {}
task.spawn(function()
	local map = workspace:WaitForChild("Map", 30)
	if not map then
		return
	end
	for _, d in ipairs(map:GetDescendants()) do
		if d:IsA("BasePart") and d.Name == "TimerScreen" then
			local sg = new("SurfaceGui", {
				Face = Enum.NormalId.Front,
				SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud,
				PixelsPerStud = 30,
				LightInfluence = 0,
				Adornee = d,
				Parent = playerGui,
			})
			local bg = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), Parent = sg }, { gradient(T.Panel2, T.Dark) })
			local title = label({ Size = UDim2.new(1, -20, 0.4, 0), Position = UDim2.new(0, 10, 0.06, 0), Font = Enum.Font.FredokaOne, Text = "", MaxText = 200, Parent = bg })
			local time = label({ Size = UDim2.new(1, -20, 0.5, 0), Position = UDim2.new(0, 10, 0.45, 0), Font = Enum.Font.FredokaOne, Text = "", MaxText = 300, Parent = bg })
			table.insert(timerLabels, { Title = title, Time = time })
		end
	end
end)

local flashlight
local function setFlashlight(on)
	local char = player.Character
	local head = char and char:FindFirstChild("Head")
	if on and head then
		if not flashlight or not flashlight.Parent then
			flashlight = new("SpotLight", { Brightness = 3, Range = 45, Angle = 55, Color = Color3.fromRGB(255, 240, 210), Face = Enum.NormalId.Front, Parent = head })
		end
	elseif flashlight then
		flashlight:Destroy()
		flashlight = nil
	end
end

local lastPhase = workspace:GetAttribute("Phase")
local function onPhase()
	local phase = workspace:GetAttribute("Phase")
	if phase == lastPhase then
		return
	end
	lastPhase = phase
	if phase == "Blackout" then
		screenFlash(T.Red, 0.6)
		shake(0.9, 0.7)
		sfx("Alarm", 0.8, 0.5)
		setFlashlight(true)
	else
		screenFlash(T.Gold, 0.25)
		setFlashlight(false)
	end
end
workspace:GetAttributeChangedSignal("Phase"):Connect(onPhase)
player.CharacterAdded:Connect(function()
	task.wait(1)
	setFlashlight(workspace:GetAttribute("Phase") == "Blackout")
end)

RunService.RenderStepped:Connect(function()
	local phase = workspace:GetAttribute("Phase") or "Day"
	local ends = workspace:GetAttribute("PhaseEnds") or 0
	local left = math.max(0, ends - workspace:GetServerTimeNow())
	local total = phase == "Blackout" and Config.BlackoutDuration or (Config.CycleLength - Config.BlackoutDuration)
	local blink = math.floor(os.clock() * 2) % 2 == 0
	if phase == "Blackout" then
		cycleText.Text = "☾ ¡APAGÓN! " .. Util.Time(left) .. " ☽"
		cycleText.TextColor3 = blink and T.Red or Color3.fromRGB(255, 180, 180)
		cycleGrad.Color = ColorSequence.new(Color3.fromRGB(120, 10, 30), Color3.fromRGB(40, 0, 10))
		cycleFill.BackgroundColor3 = T.Red
	else
		cycleText.Text = "☀ Apagón en " .. Util.Time(left)
		cycleText.TextColor3 = (left <= Config.BlackoutWarning and blink) and Color3.fromRGB(255, 140, 60) or T.Text
		cycleGrad.Color = ColorSequence.new(T.Panel2, T.Panel)
		cycleFill.BackgroundColor3 = T.Gold
	end
	cycleFill.Size = UDim2.fromScale(math.clamp(left / total, 0, 1), 1)
	for _, tl in ipairs(timerLabels) do
		tl.Title.Text = phase == "Blackout" and "☾ APAGÓN ☽" or "PRÓXIMO APAGÓN"
		tl.Title.TextColor3 = phase == "Blackout" and T.Red or T.Gold
		tl.Time.Text = Util.Time(left)
		tl.Time.TextColor3 = phase == "Blackout" and Color3.fromRGB(255, 120, 120) or T.Text
	end
	if currentMenu == "Index" then
		local t = os.clock()
		for _, v in ipairs(indexViewports) do
			local h = v.Height
			local a = math.sin(t * 0.8 + v.Phase) * 0.5
			local dist = h * 1.5 + 3
			local pos = Vector3.new(math.sin(a) * dist, h * 0.6, -math.cos(a) * dist)
			v.Camera.CFrame = CFrame.lookAt(pos, Vector3.new(0, h * 0.45, 0))
		end
	end
end)

---------------------------------------------------------------------------
-- Guías (tutorial y regreso a casa)
---------------------------------------------------------------------------
local guide = {}
local function clearGuide()
	for _, o in ipairs(guide) do
		o:Destroy()
	end
	guide = {}
end

local function pointTo(position, text, color)
	clearGuide()
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end
	local target = new("Part", { Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.one, CFrame = CFrame.new(position), Parent = workspace })
	local a0 = new("Attachment", { Parent = hrp })
	local a1 = new("Attachment", { Parent = target })
	local beam = new("Beam", {
		Attachment0 = a0,
		Attachment1 = a1,
		Width0 = 0.6,
		Width1 = 0.6,
		FaceCamera = true,
		LightEmission = 1,
		Color = ColorSequence.new(color or T.Gold),
		Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0.1) }),
		Texture = "rbxasset://textures/particles/sparkles_main.dds",
		TextureMode = Enum.TextureMode.Wrap,
		TextureLength = 3,
		TextureSpeed = 2,
		Segments = 20,
		Parent = target,
	})
	local bb = new("BillboardGui", { Size = UDim2.fromOffset(260, 60), StudsOffset = Vector3.new(0, 4, 0), AlwaysOnTop = true, LightInfluence = 0, Adornee = target, Parent = playerGui })
	local f = new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), Parent = bb }, {
		corner(12),
		stroke(T.Dark, 3),
		gradient(color or T.Gold, (color or T.Gold):Lerp(Color3.new(0, 0, 0), 0.4)),
	})
	local l = label({ Size = UDim2.new(1, -10, 1, -8), Position = UDim2.fromOffset(5, 4), Font = Enum.Font.FredokaOne, Text = text, Parent = f })
	tstroke(2).Parent = l
	guide = { target, a0, bb, beam }
end

local guideState = nil
local function updateGuide()
	local carrying = player:GetAttribute("Carrying")
	local base = myBase()
	local state, pos, text, color
	if carrying and base then
		local c = base:FindFirstChild("Collector")
		state, pos, text, color = "home", c and c.Position or base:GetPivot().Position, "🏠 ¡Llévala aquí!", T.Green
	elseif snapshot and not snapshot.Tutorial and base then
		if (snapshot.Buys or 0) == 0 then
			local zone = base:FindFirstChild("Zone")
			local x = zone and zone.Position.X or 0
			state, pos, text, color = "buy", Vector3.new(x, 3, 0), "👇 Mantén E para comprar una anomalía", T.Gold
		elseif (snapshot.Collected or 0) == 0 then
			local c = base:FindFirstChild("Collector")
			state, pos, text, color = "collect", c and c.Position + Vector3.new(0, 2, 0), "💰 Pisa aquí para cobrar", T.Green
		else
			state = "done"
		end
	end
	if state == guideState then
		return
	end
	guideState = state
	clearGuide()
	if state == "done" then
		toast("🔬 Usa el ESCÁNER (tecla 1) para descubrir IMITADORES", T.Accent2)
		task.delay(2, function()
			toast("🏏 Usa el BATE (tecla 2) contra los ladrones", T.Gold)
		end)
		task.delay(4, function()
			toast("☾ En cada APAGÓN caen los láseres y despiertan los Imitadores", T.Red)
		end)
		task.spawn(ask, "Tutorial")
		snapshot.Tutorial = true
		guideState = nil
	elseif pos then
		pointTo(pos, text, color)
	end
end
player:GetAttributeChangedSignal("Carrying"):Connect(function()
	local c = player:GetAttribute("Carrying")
	banner.Visible = c ~= nil
	if c then
		bannerText.Text = "✋ Llevas " .. c .. " — ¡Corre a tu base!"
	end
	updateGuide()
end)
player.CharacterAdded:Connect(function()
	guideState = nil
	task.wait(1.5)
	updateGuide()
end)

---------------------------------------------------------------------------
-- Efectos
---------------------------------------------------------------------------
local function burst(pos, color, count, speed, size)
	local p = new("Part", { Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.one, CFrame = CFrame.new(pos), Parent = workspace })
	local att = new("Attachment", { Parent = p })
	local e = new("ParticleEmitter", {
		Texture = "rbxasset://textures/particles/sparkles_main.dds",
		Color = ColorSequence.new(color),
		Rate = 0,
		Lifetime = NumberRange.new(0.6, 1.2),
		Speed = NumberRange.new(speed * 0.5, speed),
		SpreadAngle = Vector2.new(180, 180),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, size or 1), NumberSequenceKeypoint.new(1, 0) }),
		LightEmission = 1,
		Drag = 3,
		Parent = att,
	})
	e:Emit(count)
	Debris:AddItem(p, 2)
end

local function ring(pos, color, size, time)
	local p = new("Part", {
		Anchored = true,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.Neon,
		Color = color,
		Transparency = 0.3,
		Size = Vector3.one,
		CFrame = CFrame.new(pos),
		Parent = workspace,
	})
	TweenService:Create(p, TweenInfo.new(time or 0.5, Enum.EasingStyle.Quad), { Size = Vector3.one * size, Transparency = 1 }):Play()
	Debris:AddItem(p, (time or 0.5) + 0.1)
end

local function floatText(pos, text, color)
	local p = new("Part", { Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.one, CFrame = CFrame.new(pos), Parent = workspace })
	local bb = new("BillboardGui", { Size = UDim2.fromOffset(200, 50), AlwaysOnTop = true, LightInfluence = 0, Parent = p })
	local l = label({ Size = UDim2.fromScale(1, 1), Text = text, Font = Enum.Font.FredokaOne, TextColor3 = color, Parent = bb })
	tstroke(3).Parent = l
	TweenService:Create(p, TweenInfo.new(1.2, Enum.EasingStyle.Quad), { CFrame = CFrame.new(pos + Vector3.new(0, 6, 0)) }):Play()
	TweenService:Create(l, TweenInfo.new(1.2), { TextTransparency = 1 }):Play()
	Debris:AddItem(p, 1.3)
end

Remotes:WaitForChild("Effect").OnClientEvent:Connect(function(kind, pos, color)
	if typeof(pos) ~= "Vector3" then
		return
	end
	color = color or T.Accent
	local near = (camera.CFrame.Position - pos).Magnitude < 250
	if not near then
		return
	end
	if kind == "spawn" then
		burst(pos, color, 12, 12, 0.8)
	elseif kind == "buy" then
		burst(pos, color, 25, 18, 1)
		ring(pos, color, 10)
		sfx("Buy", 0.6, 1.2)
	elseif kind == "place" or kind == "return" then
		burst(pos, color, 20, 12, 0.9)
		ring(pos, color, 9)
	elseif kind == "cash" then
		burst(pos, T.Green, 30, 20, 1)
		floatText(pos + Vector3.new(0, 3, 0), "💰", T.Green)
		sfx("Cash", 0.6, 1.3)
	elseif kind == "expose" or kind == "devour" then
		burst(pos, Color3.fromRGB(255, 30, 50), 50, 28, 1.4)
		burst(pos, Color3.fromRGB(20, 0, 10), 30, 10, 2)
		ring(pos, Color3.fromRGB(255, 30, 50), 16, 0.7)
		sfx("Hit", 0.7, 0.6)
	elseif kind == "breach" then
		burst(pos, Color3.fromRGB(255, 60, 60), 40, 25, 1.2)
		ring(pos, Color3.fromRGB(255, 60, 60), 14, 0.6)
	elseif kind == "hit" then
		burst(pos, T.Gold, 18, 20, 0.8)
		floatText(pos + Vector3.new(0, 2, 0), "¡PUM!", T.Gold)
		sfx("Hit", 0.6, 1)
	elseif kind == "poof" then
		burst(pos, color, 14, 8, 1)
	end
end)

Remotes:WaitForChild("Notify").OnClientEvent:Connect(function(text, color)
	toast(text, color)
	if typeof(color) == "Color3" and color == T.Green then
		sfx("Cash", 0.4, 1.4)
	end
end)

Remotes:WaitForChild("Announce").OnClientEvent:Connect(function(title, sub, color)
	showAnnounce(title, sub, color)
	sfx("Alarm", 0.5, 0.8)
end)

Remotes:WaitForChild("Sync").OnClientEvent:Connect(function(snap)
	snapshot = snap
	refreshBadges()
	rebuildMenu()
	updateGuide()
end)

Remotes:WaitForChild("Knock").OnClientEvent:Connect(function(dir, force)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hrp or not hum then
		return
	end
	hum.PlatformStand = true
	hrp.AssemblyLinearVelocity = dir * force + Vector3.new(0, force * 0.45, 0)
	hrp.AssemblyAngularVelocity = Vector3.new(math.random(-8, 8), 0, math.random(-8, 8))
	shake(0.4, 0.8)
	screenFlash(Color3.fromRGB(255, 255, 255), 0.4)
	task.delay(1, function()
		hum.PlatformStand = false
		hum:ChangeState(Enum.HumanoidStateType.GettingUp)
	end)
end)

Remotes:WaitForChild("Alert").OnClientEvent:Connect(function(thief, name)
	toast("🚨 ¡" .. (thief and thief.DisplayName or "Alguien") .. " está robando tu " .. name .. "! ¡Golpéalo con el bate!", T.Red)
	showAnnounce("🚨 ¡TE ESTÁN ROBANDO! 🚨", name, T.Red)
	screenFlash(T.Red, 0.45)
	for i = 0, 2 do
		task.delay(i * 0.35, function()
			sfx("Alarm", 0.8, 1.6)
		end)
	end
	local char = thief and thief.Character
	if char then
		local hl = new("Highlight", { FillColor = T.Red, OutlineColor = Color3.new(1, 1, 1), FillTransparency = 0.4, DepthMode = Enum.HighlightDepthMode.AlwaysOnTop, Parent = char })
		Debris:AddItem(hl, 10)
	end
end)

Remotes:WaitForChild("ScanResult").OnClientEvent:Connect(function(res)
	scanToken += 1
	local my = scanToken
	scanCard.Visible = true
	if res.Mimic then
		scanGrad.Color = ColorSequence.new(T.Red, Color3.fromRGB(90, 10, 20))
		scanTitle.Text = "☠ ¡IMITADOR EXPUESTO! ☠"
		scanBody.Text = "Se hacía pasar por " .. res.Name .. "  •  +" .. Util.Money(res.Bounty)
		scanLore.Text = "Los Imitadores devoran tus anomalías en el apagón."
		screenFlash(T.Red, 0.3)
		shake(0.3, 0.5)
		sfx("Cash", 0.7, 0.9)
	else
		scanGrad.Color = ColorSequence.new(T.Green, Color3.fromRGB(20, 90, 50))
		scanTitle.Text = "✔ AUTÉNTICA: " .. res.Name
		scanBody.Text = "Valor " .. Util.Money(res.Value) .. "  •  +" .. Util.Money(res.Income) .. "/s"
		scanLore.Text = res.Lore or ""
	end
	task.delay(3.5, function()
		if my == scanToken then
			scanCard.Visible = false
		end
	end)
end)

---------------------------------------------------------------------------
-- Visibilidad de prompts según dueño
---------------------------------------------------------------------------
ProximityPromptService.PromptShown:Connect(function(prompt)
	local kind = prompt:GetAttribute("Kind")
	local owner = prompt:GetAttribute("OwnerId")
	if kind == "Steal" and owner == player.UserId then
		prompt.Enabled = false
	elseif (kind == "Sell" or kind == "Lock") and owner ~= player.UserId then
		prompt.Enabled = false
	end
end)

---------------------------------------------------------------------------
-- Herramientas: Escáner y Bate
---------------------------------------------------------------------------
local ToolRemote = Remotes:WaitForChild("Tool")
local scanning = false
local lastScan = 0
local lastSwing = 0

local function findScanTarget()
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return nil
	end
	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
	local dir = ray.Direction.Unit
	local best, bestScore
	local nearest, nearestDist
	for _, model in ipairs(CollectionService:GetTagged("Anomaly")) do
		local root = model.PrimaryPart
		local st = model:GetAttribute("State")
		if root and model:IsDescendantOf(workspace) and (st == "conveyor" or st == "pod" or st == "roaming") then
			local center = root.Position + Vector3.new(0, (model:GetAttribute("Height") or 5) * 0.5, 0)
			local d = (center - hrp.Position).Magnitude
			if d <= Config.ScanRange then
				local toC = center - ray.Origin
				local along = toC:Dot(dir)
				if along > 0 then
					local perp = (toC - dir * along).Magnitude
					local score = perp / math.max(along, 1)
					if score < 0.18 and (not bestScore or score < bestScore) then
						best, bestScore = model, score
					end
				end
				if not nearestDist or d < nearestDist then
					nearest, nearestDist = model, d
				end
			end
		end
	end
	return best or (nearestDist and nearestDist < 14 and nearest) or nil
end

local function doScan(tool)
	local cd = player:GetAttribute("Pass_ScannerPro") and Config.ScanCooldownPro or Config.ScanCooldown
	if scanning or os.clock() - lastScan < cd then
		toast("🔬 Escáner recargando...", T.Sub)
		return
	end
	local target = findScanTarget()
	if not target then
		toast("🔬 Apunta a una anomalía cercana", T.Sub)
		return
	end
	scanning = true
	lastScan = os.clock()
	sfx("Scan", 0.6, 1.5)
	local handle = tool:FindFirstChild("Handle")
	local tip = handle and handle:FindFirstChild("Tip")
	local root = target.PrimaryPart
	local fx = root and root:FindFirstChild("FX")
	local beam
	if tip and fx then
		beam = new("Beam", {
			Attachment0 = tip,
			Attachment1 = fx,
			Width0 = 0.15,
			Width1 = 3,
			FaceCamera = true,
			LightEmission = 1,
			Color = ColorSequence.new(Color3.fromRGB(80, 255, 170)),
			Transparency = NumberSequence.new(0.3),
			Parent = handle,
		})
	end
	local hl = new("Highlight", { FillColor = Color3.fromRGB(80, 255, 170), FillTransparency = 0.6, OutlineColor = Color3.fromRGB(80, 255, 170), Parent = target })
	local hold = player:GetAttribute("Pass_ScannerPro") and 0.4 or 1
	task.wait(hold)
	if beam then
		beam:Destroy()
	end
	hl:Destroy()
	ToolRemote:FireServer("Scan", target)
	scanning = false
end

local function swingAnim(char)
	local motor
	local upper = char:FindFirstChild("RightUpperArm")
	if upper then
		motor = upper:FindFirstChild("RightShoulder")
	else
		local torso = char:FindFirstChild("Torso")
		motor = torso and torso:FindFirstChild("Right Shoulder")
	end
	if not motor or motor:GetAttribute("Swinging") then
		return
	end
	motor:SetAttribute("Swinging", true)
	local original = motor.C0
	local up = TweenService:Create(motor, TweenInfo.new(0.1), { C0 = original * CFrame.Angles(math.rad(120), 0, math.rad(-30)) })
	up:Play()
	up.Completed:Wait()
	local down = TweenService:Create(motor, TweenInfo.new(0.1, Enum.EasingStyle.Back), { C0 = original * CFrame.Angles(math.rad(-40), math.rad(30), math.rad(20)) })
	down:Play()
	down.Completed:Wait()
	TweenService:Create(motor, TweenInfo.new(0.2), { C0 = original }):Play()
	task.wait(0.2)
	motor.C0 = original
	motor:SetAttribute("Swinging", nil)
end

local function hookTool(tool)
	if not tool:IsA("Tool") or tool:GetAttribute("Hooked") then
		return
	end
	tool:SetAttribute("Hooked", true)
	if tool.Name == "Escáner" then
		tool.Activated:Connect(function()
			task.spawn(doScan, tool)
		end)
	elseif tool.Name == "Bate" then
		tool.Activated:Connect(function()
			if os.clock() - lastSwing < Config.BatCooldown then
				return
			end
			lastSwing = os.clock()
			sfx("Steal", 0.5, 1.2)
			task.spawn(swingAnim, player.Character)
			ToolRemote:FireServer("Swing")
		end)
	end
end

local function watchContainer(container)
	for _, c in ipairs(container:GetChildren()) do
		hookTool(c)
	end
	container.ChildAdded:Connect(hookTool)
end

player.CharacterAdded:Connect(function(char)
	watchContainer(char)
	watchContainer(player:WaitForChild("Backpack"))
end)
if player.Character then
	watchContainer(player.Character)
end
watchContainer(player:WaitForChild("Backpack"))

---------------------------------------------------------------------------
-- Arranque
---------------------------------------------------------------------------
updateScale()
task.spawn(function()
	local res = Request:InvokeServer("Sync")
	if type(res) == "table" and res.Index then
		snapshot = res
		refreshBadges()
		updateGuide()
		if snapshot.Daily.CanClaim then
			task.wait(2.5)
			openMenu("Daily")
		end
	end
end)
showAnnounce("STEAL AN ANOMALY", "Compra • Escanea • Roba • Sobrevive al apagón", T.Accent)
task.delay(600, function()
	toast("👍 ¿Te diviertes? ¡Dale LIKE y ⭐ favorito para más actualizaciones!", T.Gold)
end)
