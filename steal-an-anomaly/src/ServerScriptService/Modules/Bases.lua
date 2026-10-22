-- Clínicas de contención: camas (pacientes que generan dinero), incubadoras
-- (huevos que eclosionan), caja, cafetera, láser de la puerta y ventas.
local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local AnomalyData = require(Shared.AnomalyData)
local Util = require(Shared.Util)

local Bases = {}
local ctx
local list = {}
local byPlayer = {}
local byModel = {}

local function now()
	return workspace:GetServerTimeNow()
end

local function billboard(parent, offset)
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(160, 50)
	bb.StudsOffset = offset
	bb.MaxDistance = 70
	bb.LightInfluence = 0
	local cash = Instance.new("TextLabel")
	cash.BackgroundTransparency = 1
	cash.Size = UDim2.new(1, 0, 0.62, 0)
	cash.Font = Enum.Font.FredokaOne
	cash.TextScaled = true
	cash.TextColor3 = Color3.fromRGB(110, 255, 140)
	cash.Text = ""
	local s1 = Instance.new("UIStroke")
	s1.Thickness = 2
	s1.Parent = cash
	cash.Parent = bb
	local sub = Instance.new("TextLabel")
	sub.BackgroundTransparency = 1
	sub.Position = UDim2.new(0, 0, 0.62, 0)
	sub.Size = UDim2.new(1, 0, 0.38, 0)
	sub.Font = Enum.Font.GothamBold
	sub.TextScaled = true
	sub.TextColor3 = Color3.fromRGB(230, 230, 255)
	sub.Text = ""
	local s2 = Instance.new("UIStroke")
	s2.Thickness = 1.5
	s2.Parent = sub
	sub.Parent = bb
	bb.Parent = parent
	return cash, sub
end

local function makeSign(b)
	local sign = b.Model:FindFirstChild("Sign")
	if not sign then
		return
	end
	local sg = Instance.new("SurfaceGui")
	sg.Name = "SignGui"
	sg.Face = Enum.NormalId.Front
	sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	sg.PixelsPerStud = 40
	sg.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.new(1, 0, 0.62, 0)
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.TextColor3 = Color3.new(1, 1, 1)
	t.Text = "CLÍNICA LIBRE"
	local st = Instance.new("UIStroke")
	st.Thickness = 3
	st.Parent = t
	t.Parent = sg
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Position = UDim2.new(0, 0, 0.62, 0)
	l.Size = UDim2.new(1, 0, 0.38, 0)
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	l.TextColor3 = Color3.fromRGB(120, 255, 150)
	l.Text = ""
	l.Parent = sg
	sg.Parent = sign
	b.OwnerLabel = t
	b.StatusLabel = l
end

local function setLaser(b, on)
	local laser = b.Model:FindFirstChild("Laser")
	if laser then
		for _, bar in ipairs(laser:GetChildren()) do
			if bar:IsA("BasePart") then
				bar.Transparency = on and 0.1 or 1
				bar.CanCollide = on
			end
		end
	end
	local button = b.Model:FindFirstChild("LockButton")
	if button then
		button.Color = on and Color3.fromRGB(255, 60, 80) or Color3.fromRGB(60, 255, 130)
	end
	b.Model:SetAttribute("LockedUntil", on and b.LockedUntil or 0)
end

local function updateSign(b)
	if not b.OwnerLabel then
		return
	end
	if b.Player then
		b.OwnerLabel.Text = "Clínica de " .. b.Player.DisplayName
		local left = b.LockedUntil - now()
		if left > 0 then
			b.StatusLabel.Text = "🔒 CERRADA " .. math.ceil(left) .. "s"
			b.StatusLabel.TextColor3 = Color3.fromRGB(255, 90, 100)
		else
			b.StatusLabel.Text = "🔓 ABIERTA"
			b.StatusLabel.TextColor3 = Color3.fromRGB(120, 255, 150)
		end
	else
		b.OwnerLabel.Text = "CLÍNICA LIBRE"
		b.StatusLabel.Text = ""
	end
end

local function ownerPrompt(parent, kind, action, object, hold)
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = kind .. "Prompt"
	prompt.ActionText = action
	prompt.ObjectText = object
	prompt.HoldDuration = hold
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = false
	prompt:SetAttribute("Kind", kind)
	prompt:SetAttribute("OwnerId", 0)
	prompt.Parent = parent
	return prompt
end

local function setupBase(model, index)
	local b = {
		Model = model,
		Index = index,
		Beds = {},
		Incs = {},
		LockedUntil = 0,
		Zone = model:FindFirstChild("Zone"),
		OwnerPrompts = {},
	}
	local beds = model:FindFirstChild("Beds")
	for i = 1, Config.MaxBeds do
		local m = beds and beds:FindFirstChild("Bed" .. i)
		if m then
			local bed = { Model = m, Anchor = m:FindFirstChild("Anchor"), Stored = 0, Index = i }
			bed.Cash, bed.Sub = billboard(m:FindFirstChild("Pillow") or bed.Anchor, Vector3.new(0, 4.5, 0))
			b.Beds[i] = bed
		end
	end
	local incs = model:FindFirstChild("Incubators")
	for i = 1, Config.MaxIncubators do
		local m = incs and incs:FindFirstChild("Inc" .. i)
		if m then
			b.Incs[i] = { Model = m, Anchor = m:FindFirstChild("Anchor"), Index = i }
		end
	end

	local laserGroup = "Laser" .. index
	local ownerGroup = "Owner" .. index
	pcall(function()
		PhysicsService:RegisterCollisionGroup(laserGroup)
		PhysicsService:RegisterCollisionGroup(ownerGroup)
		PhysicsService:CollisionGroupSetCollidable(laserGroup, ownerGroup, false)
	end)
	b.OwnerGroup = ownerGroup
	local laser = model:FindFirstChild("Laser")
	if laser then
		for _, bar in ipairs(laser:GetChildren()) do
			if bar:IsA("BasePart") then
				bar.CollisionGroup = laserGroup
			end
		end
	end

	local button = model:FindFirstChild("LockButton")
	if button then
		table.insert(b.OwnerPrompts, ownerPrompt(button, "Lock", "Cerrar clínica", "Láser", 0.3))
	end
	local coffee = model:FindFirstChild("Coffee")
	if coffee then
		table.insert(b.OwnerPrompts, ownerPrompt(coffee, "Coffee", "Tomar café", "+Cordura", 0.8))
	end

	local collector = model:FindFirstChild("Collector")
	if collector then
		local debounce = {}
		collector.Touched:Connect(function(hit)
			local char = hit.Parent
			local player = char and Players:GetPlayerFromCharacter(char)
			if not player or player ~= b.Player then
				return
			end
			if debounce[player] and os.clock() - debounce[player] < 1 then
				return
			end
			debounce[player] = os.clock()
			Bases.Collect(player)
		end)
	end

	makeSign(b)
	setLaser(b, false)
	updateSign(b)
	byModel[model] = b
	return b
end

function Bases.Init(c)
	ctx = c
	local folder = workspace:WaitForChild("Bases")
	for i = 1, 8 do
		local model = folder:FindFirstChild("Base" .. i)
		if model then
			table.insert(list, setupBase(model, i))
		end
	end
	for _, b in ipairs(list) do
		Bases.Refresh(b)
	end
	task.spawn(function()
		while true do
			task.wait(1)
			Bases.Tick()
		end
	end)
end

function Bases.Get(player)
	return byPlayer[player]
end

function Bases.All()
	return list
end

function Bases.ByModel(model)
	return byModel[model]
end

function Bases.Counts(player)
	local data = ctx.Data.Get(player)
	local level = data and data.BaseLevel or 0
	local beds = math.min(Config.MaxBeds, Config.BaseStartBeds + level)
	local incs = math.min(Config.MaxIncubators, Config.BaseStartIncubators + math.floor(level / 2))
	return beds, incs
end

-- Estado visible para los clientes (monitores e incubadoras se dibujan en el cliente)
local function bedStatus(bed)
	local m = bed.Model
	if not bed.Open then
		m:SetAttribute("Status", "locked")
		m:SetAttribute("Patient", "")
		return
	end
	local info = bed.Info
	if not info then
		m:SetAttribute("Status", "empty")
		m:SetAttribute("Patient", "")
	else
		m:SetAttribute("Patient", info.Def.Name)
		if info.Condition then
			m:SetAttribute("Status", info.Critical and "critical" or info.Condition)
		else
			m:SetAttribute("Status", "ok")
		end
	end
end
Bases.BedStatus = bedStatus

local function incStatus(inc)
	local m = inc.Model
	if not inc.Open then
		m:SetAttribute("Status", "locked")
	elseif not inc.Info then
		m:SetAttribute("Status", "empty")
	else
		m:SetAttribute("Status", inc.Waiting and "waiting" or "incubating")
		m:SetAttribute("HatchEnd", inc.HatchEnd or 0)
		m:SetAttribute("HatchTotal", inc.Info.Egg.Hatch)
		m:SetAttribute("EggName", inc.Info.Egg.Name)
	end
end

function Bases.Refresh(b)
	local nBeds, nIncs = Config.BaseStartBeds, Config.BaseStartIncubators
	if b.Player then
		nBeds, nIncs = Bases.Counts(b.Player)
	end
	for i, bed in pairs(b.Beds) do
		bed.Open = i <= nBeds
		if not bed.Open then
			bed.Cash.Text = "🔒"
			bed.Sub.Text = "Mejora tu clínica"
		elseif not bed.Info then
			bed.Cash.Text = bed.Stored > 0 and Util.Money(bed.Stored) or ""
			bed.Sub.Text = b.Player and "Cama libre" or ""
		end
		bedStatus(bed)
	end
	for i, inc in pairs(b.Incs) do
		inc.Open = i <= nIncs
		incStatus(inc)
	end
end

function Bases.FreeBed(b)
	for i = 1, Config.MaxBeds do
		local bed = b.Beds[i]
		if bed and bed.Open and not bed.Info and not bed.Reserved then
			return i
		end
	end
	return nil
end

function Bases.FreeInc(b)
	for i = 1, Config.MaxIncubators do
		local inc = b.Incs[i]
		if inc and inc.Open and not inc.Info and not inc.Reserved then
			return i
		end
	end
	return nil
end

function Bases.IsInside(b, position)
	if not b or not b.Zone then
		return false
	end
	local rel = b.Zone.CFrame:PointToObjectSpace(position)
	local half = b.Zone.Size / 2
	return math.abs(rel.X) <= half.X and math.abs(rel.Y) <= half.Y and math.abs(rel.Z) <= half.Z
end

local function hatchRate(player)
	return player:GetAttribute("Pass_FastHatch") and 2 or 1
end

---------------------------------------------------------------------------
-- Asignación
---------------------------------------------------------------------------
function Bases.Assign(player, offlineSeconds)
	for _, b in ipairs(list) do
		if not b.Player then
			b.Player = player
			b.OwnerId = player.UserId
			byPlayer[player] = b
			b.Model:SetAttribute("OwnerId", player.UserId)
			player:SetAttribute("BaseIndex", b.Index)
			for i, p in ipairs(b.OwnerPrompts) do
				local parent = p.Parent
				local clone = p:Clone()
				clone:SetAttribute("OwnerId", player.UserId)
				p:Destroy()
				clone.Parent = parent
				b.OwnerPrompts[i] = clone
			end
			b.LockedUntil = 0
			setLaser(b, false)
			for _, bed in pairs(b.Beds) do
				bed.Stored = 0
				bed.Reserved = false
			end
			for _, inc in pairs(b.Incs) do
				inc.Reserved = false
				inc.Waiting = false
			end
			Bases.Refresh(b)
			local data = ctx.Data.Get(player)
			for key, rec in pairs(data.Beds) do
				local i = tonumber(key)
				if i and b.Beds[i] and type(rec) == "table" and AnomalyData.ById[rec.Id] then
					Bases.SpawnInBed(b, i, rec)
				else
					data.Beds[key] = nil
				end
			end
			for key, rec in pairs(data.Incubators) do
				local i = tonumber(key)
				if i and b.Incs[i] and type(rec) == "table" and Config.EggById[rec.Egg] and rec.Result then
					rec.Remaining = math.max(0, (rec.Remaining or 0) - (offlineSeconds or 0))
					Bases.PlaceEgg(player, i, rec)
				else
					data.Incubators[key] = nil
				end
			end
			Bases.Refresh(b)
			updateSign(b)
			return true
		end
	end
	return false
end

function Bases.Release(player)
	local b = byPlayer[player]
	if not b then
		return
	end
	local data = ctx.Data.Get(player)
	for _, bed in pairs(b.Beds) do
		if bed.Info then
			ctx.Anoms.Destroy(bed.Info)
			bed.Info = nil
		end
		bed.Stored = 0
		bed.Reserved = false
	end
	for i, inc in pairs(b.Incs) do
		if inc.Info then
			if data and data.Incubators[tostring(i)] then
				data.Incubators[tostring(i)].Remaining = math.max(0, (inc.HatchEnd or now()) - now()) * hatchRate(player)
			end
			ctx.Anoms.Destroy(inc.Info)
			inc.Info = nil
		end
		inc.Reserved = false
		inc.Waiting = false
	end
	b.Player = nil
	b.OwnerId = nil
	b.LockedUntil = 0
	b.Model:SetAttribute("OwnerId", 0)
	for _, p in ipairs(b.OwnerPrompts) do
		p:SetAttribute("OwnerId", 0)
	end
	setLaser(b, false)
	byPlayer[player] = nil
	Bases.Refresh(b)
	updateSign(b)
end

-- Guarda el tiempo restante de las incubadoras en los datos (antes de guardar)
function Bases.SnapshotIncubators(player)
	local b = byPlayer[player]
	local data = ctx.Data.Get(player)
	if not b or not data then
		return
	end
	for i, inc in pairs(b.Incs) do
		local rec = data.Incubators[tostring(i)]
		if inc.Info and rec then
			rec.Remaining = math.max(0, (inc.HatchEnd or now()) - now()) * hatchRate(player)
		end
	end
end

---------------------------------------------------------------------------
-- Camas
---------------------------------------------------------------------------
function Bases.SpawnInBed(b, i, rec)
	local bed = b.Beds[i]
	local info = ctx.Anoms.Create(rec, bed.Anchor.CFrame)
	Bases.AdoptInBed(b, i, info)
	return info
end

function Bases.AdoptInBed(b, i, info)
	local bed = b.Beds[i]
	bed.Reserved = false
	local root = info.Model.Root
	root.Anchored = true
	info.Model:PivotTo(bed.Anchor.CFrame)
	info.OwnerId = b.OwnerId
	info.Base = b
	info.BedIndex = i
	info.Revealed = nil
	info.Condition = nil
	info.Critical = nil
	bed.Info = info
	ctx.Anoms.SetState(info, "bed")
	ctx.Care.Admit(info)
	bedStatus(bed)
end

function Bases.PlaceInBed(player, i, rec, info)
	local b = byPlayer[player]
	local data = ctx.Data.Get(player)
	if not b or not data then
		if info then
			ctx.Anoms.Destroy(info)
		end
		return nil
	end
	data.Beds[tostring(i)] = rec
	if info and info.Model.Parent then
		Bases.AdoptInBed(b, i, info)
	else
		info = Bases.SpawnInBed(b, i, rec)
	end
	ctx.Effect("place", b.Beds[i].Anchor.Position + Vector3.new(0, 3, 0), Config.RarityById[info.Def.Rarity].Color)
	ctx.Progression.Discover(player, rec.Id)
	return info
end

function Bases.RemoveFromBed(b, i)
	local bed = b.Beds[i]
	if not bed or not bed.Info then
		return nil
	end
	local info = bed.Info
	bed.Info = nil
	if b.Player then
		local data = ctx.Data.Get(b.Player)
		if data then
			data.Beds[tostring(i)] = nil
		end
	end
	info.Base = nil
	info.BedIndex = nil
	info.Condition = nil
	info.Critical = nil
	bedStatus(bed)
	return info
end

---------------------------------------------------------------------------
-- Incubadoras
---------------------------------------------------------------------------
function Bases.PlaceEgg(player, i, rec, info)
	local b = byPlayer[player]
	local data = ctx.Data.Get(player)
	if not b or not data then
		if info then
			ctx.Anoms.Destroy(info)
		end
		return nil
	end
	local inc = b.Incs[i]
	inc.Reserved = false
	local egg = Config.EggById[rec.Egg]
	if rec.Remaining == nil then
		rec.Remaining = egg.Hatch
	end
	data.Incubators[tostring(i)] = rec
	if info and info.Model.Parent then
		info.Model.Root.Anchored = true
		info.Model:PivotTo(inc.Anchor.CFrame)
	else
		info = ctx.Anoms.CreateEgg(rec, inc.Anchor.CFrame)
	end
	info.OwnerId = b.OwnerId
	info.Base = b
	info.IncIndex = i
	inc.Info = info
	inc.Waiting = false
	inc.HatchEnd = now() + rec.Remaining / hatchRate(player)
	info.Model:SetAttribute("HatchEnd", inc.HatchEnd)
	ctx.Anoms.SetState(info, "incubating")
	ctx.Effect("place", inc.Anchor.Position + Vector3.new(0, 2, 0), egg.Color)
	incStatus(inc)
	return info
end

function Bases.RemoveEgg(b, i)
	local inc = b.Incs[i]
	if not inc or not inc.Info then
		return nil
	end
	local info = inc.Info
	local rec = info.Record
	local rate = b.Player and hatchRate(b.Player) or 1
	rec.Remaining = math.max(0, (inc.HatchEnd or now()) - now()) * rate
	inc.Info = nil
	inc.Waiting = false
	if b.Player then
		local data = ctx.Data.Get(b.Player)
		if data then
			data.Incubators[tostring(i)] = nil
		end
	end
	info.Base = nil
	info.IncIndex = nil
	info.Model:SetAttribute("HatchEnd", nil)
	incStatus(inc)
	return info
end

-- Eclosión: el huevo se rompe y la anomalía camina a una cama libre
function Bases.Hatch(b, i)
	local player = b.Player
	local inc = b.Incs[i]
	local bedIndex = Bases.FreeBed(b)
	if not bedIndex then
		if not inc.Waiting then
			inc.Waiting = true
			incStatus(inc)
			ctx.Anoms.SetInfoText(inc.Info, "🛏 ¡Sin camas libres!", Color3.fromRGB(255, 170, 80))
			ctx.Notify(player, "🐣 ¡Un huevo está listo pero no tienes camas libres!", Color3.fromRGB(255, 180, 80))
		end
		return
	end
	local eggInfo = Bases.RemoveEgg(b, i)
	local result = eggInfo.Record.Result
	local egg = eggInfo.Egg
	local pos = inc.Anchor.CFrame
	ctx.Anoms.Destroy(eggInfo, "hatch", egg.Color)
	local bed = b.Beds[bedIndex]
	bed.Reserved = true
	local info = ctx.Anoms.Create(result, pos)
	info.OwnerId = b.OwnerId
	ctx.Anoms.SetState(info, "walking", player.DisplayName)
	-- Animación de nacimiento: crece desde pequeño
	local root = info.Model.Root
	info.Model:PivotTo(pos * CFrame.new(0, -3, 0))
	local rise = TweenService:Create(root, TweenInfo.new(0.5, Enum.EasingStyle.Back), { CFrame = pos })
	rise:Play()
	local data = ctx.Data.Get(player)
	data.Stats.Hatched = (data.Stats.Hatched or 0) + 1
	ctx.Progression.Progress(player, "Hatch", 1)
	if data.Stats.Hatched == 1 then
		ctx.Progression.Sync(player)
	end
	local rarity = Config.RarityById[info.Def.Rarity]
	ctx.Remotes.Hatched:FireClient(player, Util.DisplayName(result), rarity.Id, result.Mut, result.Id)
	if rarity.Order >= 4 then
		ctx.NotifyAll("🐣 " .. player.DisplayName .. " incubó " .. Util.DisplayName(result) .. " (" .. rarity.Name .. ")", rarity.Color)
	end
	task.spawn(function()
		task.wait(0.7)
		local ok = ctx.Steal.WalkTo(info, bed.Anchor.Position, Config.WalkToBedSpeed)
		if info.Dead then
			bed.Reserved = false
			return
		end
		if not ok or b.Player ~= player then
			bed.Reserved = false
			ctx.Anoms.Destroy(info, "poof")
			return
		end
		Bases.PlaceInBed(player, bedIndex, result, info)
	end)
end

function Bases.HatchAllNow(player)
	local b = byPlayer[player]
	if not b then
		return
	end
	for _, inc in pairs(b.Incs) do
		if inc.Info then
			inc.HatchEnd = now()
			inc.Info.Model:SetAttribute("HatchEnd", inc.HatchEnd)
			incStatus(inc)
		end
	end
end

-- Entrega directa de un huevo (diario, productos): va a una incubadora libre
function Bases.GrantEgg(player, eggId)
	local b = byPlayer[player]
	local i = b and Bases.FreeInc(b)
	if not i then
		local egg = Config.EggById[eggId]
		ctx.Progression.AddCash(player, egg.Price)
		ctx.Notify(player, "Sin incubadoras libres: recibiste " .. Util.Money(egg.Price), Color3.fromRGB(255, 200, 80))
		return false
	end
	Bases.PlaceEgg(player, i, Util.RollEgg(eggId, 1, false))
	return true
end

---------------------------------------------------------------------------
-- Ascender
---------------------------------------------------------------------------
function Bases.ClearAll(player)
	local b = byPlayer[player]
	if not b then
		return
	end
	for i, bed in pairs(b.Beds) do
		local info = Bases.RemoveFromBed(b, i)
		if info then
			ctx.Anoms.Destroy(info, "poof")
		end
		bed.Stored = 0
	end
	for i in pairs(b.Incs) do
		local info = Bases.RemoveEgg(b, i)
		if info then
			ctx.Anoms.Destroy(info, "poof")
		end
	end
	local data = ctx.Data.Get(player)
	data.Beds = {}
	data.Incubators = {}
	Bases.Refresh(b)
end

---------------------------------------------------------------------------
-- Caja, láser, café y ventas
---------------------------------------------------------------------------
function Bases.Collect(player, silent)
	local b = byPlayer[player]
	if not b then
		return 0
	end
	local total = 0
	for _, bed in pairs(b.Beds) do
		total += bed.Stored
		bed.Stored = 0
	end
	total = math.floor(total)
	if total > 0 then
		ctx.Progression.AddCash(player, total)
		local data = ctx.Data.Get(player)
		data.Stats.Collected = (data.Stats.Collected or 0) + 1
		if not silent then
			local collector = b.Model:FindFirstChild("Collector")
			ctx.Effect("cash", collector and collector.Position or Vector3.zero, Color3.fromRGB(110, 255, 140))
			ctx.Notify(player, "💰 +" .. Util.Money(total), Color3.fromRGB(110, 255, 140))
			if not data.Tutorial then
				ctx.Progression.Sync(player)
			end
		end
	end
	Bases.Refresh(b)
	return total
end

function Bases.Lock(player, model)
	local b = byModel[model]
	if not b or b.Player ~= player then
		return
	end
	if workspace:GetAttribute("Phase") == "Blackout" then
		ctx.Notify(player, "⚡ ¡No hay energía en el turno de noche!", Color3.fromRGB(255, 90, 90))
		return
	end
	if b.LockedUntil > now() then
		return
	end
	local data = ctx.Data.Get(player)
	b.LockedUntil = now() + Config.LockDuration + (data.BaseLevel or 0) * Config.LockPerLevel
	setLaser(b, true)
	updateSign(b)
	ctx.Notify(player, "🔒 Clínica cerrada con láser", Color3.fromRGB(255, 120, 140))
end

function Bases.IsLocked(b)
	return b.LockedUntil > now()
end

function Bases.UnlockAll()
	for _, b in ipairs(list) do
		b.LockedUntil = 0
		setLaser(b, false)
		updateSign(b)
	end
end

function Bases.Sell(player, info)
	if info.State ~= "bed" or info.OwnerId ~= player.UserId or not info.Base then
		return
	end
	local b = info.Base
	Bases.RemoveFromBed(b, info.BedIndex)
	local rec = info.Record
	if rec.Mimic then
		ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
		ctx.Notify(player, "☠ ¡Era un IMITADOR! No vale nada... sácale fotos antes 📸", Color3.fromRGB(255, 80, 80))
	else
		local value = math.floor(Util.Value(rec) * Config.SellRatio)
		ctx.Anoms.Destroy(info, "cash", Color3.fromRGB(110, 255, 140))
		ctx.Progression.AddCash(player, value)
		ctx.Notify(player, "Diste de alta a " .. Util.DisplayName(rec) .. " por " .. Util.Money(value), Color3.fromRGB(110, 255, 140))
	end
	Bases.Refresh(b)
end

---------------------------------------------------------------------------
-- Tick: ingresos, incubación y láser
---------------------------------------------------------------------------
function Bases.Tick()
	local t = now()
	for _, b in ipairs(list) do
		local player = b.Player
		if player then
			local mult = ctx.Progression.Multiplier(player)
			local total = 0
			for _, bed in pairs(b.Beds) do
				local info = bed.Info
				if info and info.State == "bed" then
					local inc = Util.Income(info.Record) * mult
					if info.Condition then
						bed.Cash.Text = Util.Money(bed.Stored)
						bed.Sub.Text = "⛔ Necesita tratamiento"
					else
						total += inc
						bed.Stored += inc
						bed.Cash.Text = Util.Money(bed.Stored)
						bed.Sub.Text = "+" .. Util.Money(inc) .. "/s"
					end
				end
			end
			player:SetAttribute("Income", math.floor(total))
			if player:GetAttribute("Pass_AutoCollect") then
				Bases.Collect(player, true)
			end
			for i, inc in pairs(b.Incs) do
				if inc.Info and inc.Info.State == "incubating" then
					local left = (inc.HatchEnd or t) - t
					if left <= 0 then
						Bases.Hatch(b, i)
					else
						ctx.Anoms.SetInfoText(inc.Info, "🐣 " .. Util.Time(left), Color3.fromRGB(200, 230, 255))
					end
				end
			end
			if b.LockedUntil > 0 and t >= b.LockedUntil then
				b.LockedUntil = 0
				setLaser(b, false)
			end
			updateSign(b)
		end
	end
end

---------------------------------------------------------------------------
local function setGroup(b, char)
	for _, d in ipairs(char:GetDescendants()) do
		if d:IsA("BasePart") then
			d.CollisionGroup = b.OwnerGroup
		end
	end
end

function Bases.OnCharacter(player, char)
	local b = byPlayer[player]
	if not b then
		return
	end
	setGroup(b, char)
	char.DescendantAdded:Connect(function(d)
		if d:IsA("BasePart") then
			d.CollisionGroup = b.OwnerGroup
		end
	end)
	task.defer(function()
		local hrp = char:WaitForChild("HumanoidRootPart", 5)
		local pad = b.Model:FindFirstChild("SpawnPad")
		if hrp and pad then
			char:PivotTo(pad.CFrame + Vector3.new(0, 4, 0))
		end
	end)
end

function Bases.Teleport(player)
	local b = byPlayer[player]
	local char = player.Character
	local pad = b and b.Model:FindFirstChild("SpawnPad")
	if char and pad then
		char:PivotTo(pad.CFrame + Vector3.new(0, 4, 0))
	end
end

return Bases
