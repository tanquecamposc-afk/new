-- Registro de todo lo que vive en el mundo: anomalías (pacientes) y huevos.
-- Gestiona el modelo, el estado, la etiqueta flotante y los ProximityPrompts.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local AnomalyData = require(Shared.AnomalyData)
local Builder = require(Shared.AnomalyBuilder)
local Util = require(Shared.Util)

local Anoms = {}
local ctx
local Registry = {}
Anoms.Registry = Registry

local folder

function Anoms.Init(c)
	ctx = c
	folder = workspace:FindFirstChild("Anomalies")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "Anomalies"
		folder.Parent = workspace
	end
	Anoms.Folder = folder
end

local function textLabel(parent, name, order, size, font, color)
	local t = Instance.new("TextLabel")
	t.Name = name
	t.LayoutOrder = order
	t.BackgroundTransparency = 1
	t.Size = UDim2.new(1, 0, 0, size)
	t.Font = font
	t.TextScaled = true
	t.TextColor3 = color
	t.Text = ""
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 2
	stroke.Color = Color3.fromRGB(10, 5, 20)
	stroke.Parent = t
	t.Parent = parent
	return t
end

local function ensureLabel(info)
	if info.Label and info.Label.Parent then
		return info.Label
	end
	local top = info.Model.Root:FindFirstChild("Top")
	local bb = Instance.new("BillboardGui")
	bb.Name = "Label"
	bb.Size = UDim2.fromOffset(220, 92)
	bb.StudsOffset = Vector3.new(0, 1.4, 0)
	bb.MaxDistance = 85
	bb.LightInfluence = 0
	local list = Instance.new("UIListLayout")
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.VerticalAlignment = Enum.VerticalAlignment.Bottom
	list.Parent = bb
	info.L = {
		Tag = textLabel(bb, "TagLabel", 1, 20, Enum.Font.GothamBlack, Color3.new(1, 1, 1)),
		Title = textLabel(bb, "TitleLabel", 2, 26, Enum.Font.FredokaOne, Color3.new(1, 1, 1)),
		Rarity = textLabel(bb, "RarityLabel", 3, 18, Enum.Font.GothamBlack, Color3.new(1, 1, 1)),
		Info = textLabel(bb, "InfoLabel", 4, 20, Enum.Font.GothamBold, Color3.fromRGB(120, 255, 150)),
	}
	bb.Parent = top
	info.Label = bb
	return bb
end

function Anoms.SetLabel(info, tag, tagColor, infoText, infoColor)
	ensureLabel(info)
	local L = info.L
	if info.Kind == "egg" then
		local egg = Config.EggById[info.Record.Egg]
		L.Title.Text = egg.Name
		L.Title.TextColor3 = egg.Order >= 6 and Color3.fromRGB(30, 255, 205) or Color3.new(1, 1, 1)
		L.Rarity.Text = "🥚 " .. Util.Time(egg.Hatch) .. " de incubación"
		L.Rarity.TextColor3 = egg.Color:Lerp(Color3.new(1, 1, 1), 0.3)
	else
		local def = info.Def
		local rarity = Config.RarityById[def.Rarity]
		local mut = info.Record.Mut and Config.MutationById[info.Record.Mut]
		L.Title.Text = def.Name
		L.Title.TextColor3 = Color3.new(1, 1, 1)
		L.Rarity.Text = rarity.Name .. (mut and ("  ✦ " .. mut.Name:upper() .. " x" .. mut.Mult) or "")
		L.Rarity.TextColor3 = mut and mut.Color or rarity.Color
	end
	L.Tag.Text = tag or ""
	L.Tag.Visible = tag ~= nil
	L.Tag.TextColor3 = tagColor or Color3.new(1, 1, 1)
	L.Info.Text = infoText or ""
	L.Info.Visible = infoText ~= nil
	L.Info.TextColor3 = infoColor or Color3.fromRGB(120, 255, 150)
end

function Anoms.SetInfoText(info, text, color)
	ensureLabel(info)
	info.L.Info.Text = text
	info.L.Info.Visible = true
	if color then
		info.L.Info.TextColor3 = color
	end
end

local function register(model, info)
	model.Parent = folder
	Registry[model] = info
	model.Destroying:Connect(function()
		Registry[model] = nil
	end)
	return info
end

function Anoms.Create(record, cframe)
	local model = Builder.Build(record.Id, record.Mut, { Tell = record.Mimic and record.Tell or nil })
	model:PivotTo(cframe)
	return register(model, {
		Kind = "anomaly",
		Model = model,
		Record = record,
		Def = AnomalyData.ById[record.Id],
		State = "none",
	})
end

-- record = { Egg = id, Result = {Id, Mut, Mimic, Tell}, Remaining = s? }
function Anoms.CreateEgg(record, cframe)
	local model = Builder.BuildEgg(record.Egg, { Contaminated = record.Result and record.Result.Mimic })
	model:PivotTo(cframe)
	return register(model, {
		Kind = "egg",
		Model = model,
		Record = record,
		Egg = Config.EggById[record.Egg],
		State = "none",
	})
end

function Anoms.Value(info)
	if info.Kind == "egg" then
		return info.Egg.Price
	end
	return Util.Value(info.Record)
end

function Anoms.IsMimic(info)
	if info.Kind == "egg" then
		return info.Record.Result and info.Record.Result.Mimic == true
	end
	return info.Record.Mimic == true
end

function Anoms.Name(info)
	if info.Kind == "egg" then
		return info.Egg.Name
	end
	return Util.DisplayName(info.Record)
end

local function addPrompt(info, kind, action, hold, key, ownerId)
	local p = Instance.new("ProximityPrompt")
	p.Name = kind
	p.ActionText = action
	p.ObjectText = Anoms.Name(info)
	p.HoldDuration = hold
	p.KeyboardKeyCode = key or Enum.KeyCode.E
	p.MaxActivationDistance = 11
	p.RequiresLineOfSight = false
	p:SetAttribute("Kind", kind)
	if ownerId then
		p:SetAttribute("OwnerId", ownerId)
	end
	p.Parent = info.Model.Root:FindFirstChild("PromptAtt")
	return p
end
Anoms.AddPrompt = addPrompt

function Anoms.ClearPrompts(info, onlyKind)
	local att = info.Model.Root:FindFirstChild("PromptAtt")
	if not att then
		return
	end
	for _, c in ipairs(att:GetChildren()) do
		if c:IsA("ProximityPrompt") and (not onlyKind or c:GetAttribute("Kind") == onlyKind) then
			c:Destroy()
		end
	end
end

function Anoms.SetState(info, state, extra)
	info.State = state
	Anoms.ClearPrompts(info)
	local model = info.Model
	local rec = info.Record
	model:SetAttribute("State", state)
	model:SetAttribute("Owner", info.OwnerId or 0)
	model:SetAttribute("Walking", state == "walking" or state == "roaming")
	model:SetAttribute("Condition", nil)
	model:SetAttribute("Critical", nil)

	if info.Kind == "egg" then
		local price = info.Egg.Price
		if state == "market" then
			addPrompt(info, "Buy", "Comprar " .. Util.Money(price), 0.3)
			Anoms.SetLabel(info, nil, nil, Util.Money(price), Color3.fromRGB(255, 225, 90))
		elseif state == "incubating" then
			addPrompt(info, "Steal", "Robar huevo", Config.StealHold, Enum.KeyCode.E, info.OwnerId)
			Anoms.SetLabel(info, nil, nil, "🐣 ...", Color3.fromRGB(200, 230, 255))
		elseif state == "dropped" then
			addPrompt(info, "Capture", "Recoger", 0.5)
			Anoms.SetLabel(info, "¡HUEVO TIRADO!", Color3.fromRGB(255, 200, 80), "¡Recógelo!", Color3.fromRGB(255, 200, 90))
		elseif state == "carried" then
			Anoms.SetLabel(info, extra and ("✋ " .. extra) or nil, Color3.fromRGB(255, 150, 80), nil)
		end
		return
	end

	local value = Util.Value(rec)
	local income = Util.Income(rec)
	if state == "bed" then
		addPrompt(info, "Steal", "Robar", Config.StealHold, Enum.KeyCode.E, info.OwnerId)
		addPrompt(info, "Sell", "Dar de alta " .. Util.Money(math.floor(value * Config.SellRatio)), 1.2, Enum.KeyCode.F, info.OwnerId)
		Anoms.SetLabel(info, nil, nil, "+" .. Util.Money(income) .. "/s")
	elseif state == "roaming" then
		if rec.Mimic and info.Revealed then
			addPrompt(info, "Catch", "Atrapar Imitador", 0.4)
			Anoms.SetLabel(info, "☠ IMITADOR ☠", Color3.fromRGB(255, 40, 60), "¡Atrápalo por recompensa!", Color3.fromRGB(255, 120, 120))
		else
			addPrompt(info, "Capture", "Capturar", Config.CaptureHold)
			Anoms.SetLabel(info, "⚠ ¡FUGADA! ⚠", Color3.fromRGB(255, 80, 80), "¡Captúrala gratis!", Color3.fromRGB(255, 200, 90))
		end
	elseif state == "walking" then
		Anoms.SetLabel(info, extra and ("🐣 ¡Recién nacida! → " .. extra) or nil, Color3.fromRGB(160, 220, 255), "+" .. Util.Money(income) .. "/s")
	elseif state == "carried" then
		Anoms.SetLabel(info, extra and ("✋ " .. extra) or nil, Color3.fromRGB(255, 150, 80), nil)
	end
end

function Anoms.Destroy(info, effect, color)
	if info.Tween then
		info.Tween:Cancel()
	end
	if info.Model and info.Model.Parent then
		if effect then
			local c = color
			if not c then
				c = info.Kind == "egg" and info.Egg.Color or Config.RarityById[info.Def.Rarity].Color
			end
			ctx.Effect(effect, info.Model.Root.Position + Vector3.new(0, 3, 0), c)
		end
		info.Model:Destroy()
	end
	Registry[info.Model] = nil
	info.Dead = true
end

return Anoms
