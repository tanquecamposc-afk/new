-- Registro de todas las anomalías vivas en el mundo: modelo, estado,
-- etiquetas flotantes y ProximityPrompts según el estado.
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
	bb.Size = UDim2.fromOffset(220, 84)
	bb.StudsOffset = Vector3.new(0, 1.6, 0)
	bb.MaxDistance = 90
	bb.LightInfluence = 0
	bb.AlwaysOnTop = false
	local list = Instance.new("UIListLayout")
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.VerticalAlignment = Enum.VerticalAlignment.Bottom
	list.Parent = bb
	textLabel(bb, "Tag", 1, 18, Enum.Font.GothamBlack, Color3.new(1, 1, 1))
	textLabel(bb, "Title", 2, 26, Enum.Font.FredokaOne, Color3.new(1, 1, 1))
	textLabel(bb, "Rarity", 3, 18, Enum.Font.GothamBlack, Color3.new(1, 1, 1))
	textLabel(bb, "Info", 4, 20, Enum.Font.GothamBold, Color3.fromRGB(120, 255, 150))
	bb.Parent = top
	info.Label = bb
	return bb
end

function Anoms.SetLabel(info, tag, tagColor, infoText, infoColor)
	local bb = ensureLabel(info)
	local def = info.Def
	local rarity = Config.RarityById[def.Rarity]
	local mut = info.Record.Mut and Config.MutationById[info.Record.Mut]
	local title = bb:FindFirstChild("Title")
	local rar = bb:FindFirstChild("Rarity")
	local tagL = bb:FindFirstChild("Tag")
	local infoL = bb:FindFirstChild("Info")
	title.Text = def.Name
	rar.Text = rarity.Name .. (mut and ("  ✦ " .. mut.Name:upper() .. " x" .. mut.Mult) or "")
	rar.TextColor3 = mut and mut.Color or rarity.Color
	tagL.Text = tag or ""
	tagL.Visible = tag ~= nil
	tagL.TextColor3 = tagColor or Color3.new(1, 1, 1)
	infoL.Text = infoText or ""
	infoL.TextColor3 = infoColor or Color3.fromRGB(120, 255, 150)
end

function Anoms.Create(record, cframe)
	local model = Builder.Build(record.Id, record.Mut, { Tell = record.Mimic and record.Tell or nil })
	model:PivotTo(cframe)
	model.Parent = folder
	local info = {
		Model = model,
		Record = record,
		Def = AnomalyData.ById[record.Id],
		State = "none",
	}
	Registry[model] = info
	model.Destroying:Connect(function()
		Registry[model] = nil
	end)
	return info
end

local function addPrompt(info, kind, action, hold, key, ownerId)
	local p = Instance.new("ProximityPrompt")
	p.Name = kind
	p.ActionText = action
	p.ObjectText = Util.DisplayName(info.Record)
	p.HoldDuration = hold
	p.KeyboardKeyCode = key or Enum.KeyCode.E
	p.MaxActivationDistance = 11
	p.RequiresLineOfSight = false
	p.Style = Enum.ProximityPromptStyle.Default
	p:SetAttribute("Kind", kind)
	if ownerId then
		p:SetAttribute("OwnerId", ownerId)
	end
	p.Parent = info.Model.Root:FindFirstChild("PromptAtt")
	return p
end

function Anoms.ClearPrompts(info)
	local att = info.Model.Root:FindFirstChild("PromptAtt")
	if not att then
		return
	end
	for _, c in ipairs(att:GetChildren()) do
		if c:IsA("ProximityPrompt") then
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
	model:SetAttribute("Walking", state == "conveyor" or state == "walking" or state == "roaming")
	local value = Util.Value(rec)
	local income = Util.Income(rec)
	if state == "conveyor" then
		addPrompt(info, "Buy", "Contener " .. Util.Money(value), 0.25)
		Anoms.SetLabel(info, nil, nil, Util.Money(value) .. "  •  +" .. Util.Money(income) .. "/s", Color3.fromRGB(255, 225, 90))
	elseif state == "pod" then
		addPrompt(info, "Steal", "Robar", Config.StealHold, Enum.KeyCode.E, info.OwnerId)
		addPrompt(info, "Sell", "Vender " .. Util.Money(math.floor(value * Config.SellRatio)), 1.2, Enum.KeyCode.F, info.OwnerId)
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
		Anoms.SetLabel(info, extra and ("→ " .. extra) or nil, Color3.fromRGB(160, 220, 255), "+" .. Util.Money(income) .. "/s")
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
			ctx.Effect(effect, info.Model.Root.Position + Vector3.new(0, 3, 0), color or Config.RarityById[info.Def.Rarity].Color)
		end
		info.Model:Destroy()
	end
	Registry[info.Model] = nil
	info.Dead = true
end

return Anoms
