-- Bases de los jugadores: asignación, cápsulas (pods), ingresos,
-- recolector, cierre láser y ventas.
local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
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

local POD_GLASS = Color3.fromRGB(150, 210, 255)
local POD_LOCKED = Color3.fromRGB(255, 70, 90)

local function now()
	return workspace:GetServerTimeNow()
end

local function makePodGui(pod)
	local bb = Instance.new("BillboardGui")
	bb.Name = "PodGui"
	bb.Size = UDim2.fromOffset(160, 56)
	bb.StudsOffset = Vector3.new(0, 2.2, 0)
	bb.MaxDistance = 70
	bb.LightInfluence = 0
	local cash = Instance.new("TextLabel")
	cash.Name = "Cash"
	cash.BackgroundTransparency = 1
	cash.Size = UDim2.new(1, 0, 0.6, 0)
	cash.Font = Enum.Font.FredokaOne
	cash.TextScaled = true
	cash.TextColor3 = Color3.fromRGB(110, 255, 140)
	cash.Text = ""
	local s1 = Instance.new("UIStroke")
	s1.Thickness = 2
	s1.Parent = cash
	cash.Parent = bb
	local sub = Instance.new("TextLabel")
	sub.Name = "Sub"
	sub.BackgroundTransparency = 1
	sub.Position = UDim2.new(0, 0, 0.6, 0)
	sub.Size = UDim2.new(1, 0, 0.4, 0)
	sub.Font = Enum.Font.GothamBold
	sub.TextScaled = true
	sub.TextColor3 = Color3.fromRGB(230, 230, 255)
	sub.Text = ""
	local s2 = Instance.new("UIStroke")
	s2.Thickness = 1.5
	s2.Parent = sub
	sub.Parent = bb
	bb.Parent = pod.Model:FindFirstChild("Cap")
	pod.CashLabel = cash
	pod.SubLabel = sub
	return bb
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
	t.Name = "Owner"
	t.BackgroundTransparency = 1
	t.Size = UDim2.new(1, 0, 0.62, 0)
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.TextColor3 = Color3.new(1, 1, 1)
	t.Text = "LIBRE"
	local st = Instance.new("UIStroke")
	st.Thickness = 3
	st.Parent = t
	t.Parent = sg
	local l = Instance.new("TextLabel")
	l.Name = "Status"
	l.BackgroundTransparency = 1
	l.Position = UDim2.new(0, 0, 0.62, 0)
	l.Size = UDim2.new(1, 0, 0.38, 0)
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	l.TextColor3 = Color3.fromRGB(120, 255, 150)
	l.Text = ""
	l.Parent = sg
	sg.Parent = sign
	b.SignGui = sg
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
	if not b.SignGui then
		return
	end
	if b.Player then
		b.OwnerLabel.Text = "Base de " .. b.Player.DisplayName
		local left = b.LockedUntil - now()
		if left > 0 then
			b.StatusLabel.Text = "🔒 CERRADA " .. math.ceil(left) .. "s"
			b.StatusLabel.TextColor3 = Color3.fromRGB(255, 90, 100)
		else
			b.StatusLabel.Text = "🔓 ABIERTA"
			b.StatusLabel.TextColor3 = Color3.fromRGB(120, 255, 150)
		end
	else
		b.OwnerLabel.Text = "LIBRE"
		b.StatusLabel.Text = ""
	end
end

local function setupBase(model, index)
	local b = {
		Model = model,
		Index = index,
		Pods = {},
		LockedUntil = 0,
		Zone = model:FindFirstChild("Zone"),
	}
	local podsFolder = model:FindFirstChild("Pods")
	for i = 1, Config.MaxPods do
		local podModel = podsFolder and podsFolder:FindFirstChild("Pod" .. i)
		if podModel then
			local pod = { Model = podModel, Anchor = podModel:FindFirstChild("Anchor"), Stored = 0, Index = i }
			pod.Gui = makePodGui(pod)
			b.Pods[i] = pod
		end
	end

	-- Grupos de colisión: el dueño atraviesa su propio láser
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
		local prompt = Instance.new("ProximityPrompt")
		prompt.Name = "LockPrompt"
		prompt.ActionText = "Cerrar base"
		prompt.ObjectText = "Láser"
		prompt.HoldDuration = 0.3
		prompt.MaxActivationDistance = 10
		prompt.RequiresLineOfSight = false
		prompt:SetAttribute("Kind", "Lock")
		prompt:SetAttribute("OwnerId", 0)
		prompt.Parent = button
		b.LockPrompt = prompt
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
		Bases.RefreshPods(b)
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

function Bases.UnlockedCount(player)
	local data = ctx.Data.Get(player)
	return math.min(Config.MaxPods, Config.BaseStartPods + (data and data.BaseLevel or 0))
end

function Bases.RefreshPods(b)
	local unlocked = b.Player and Bases.UnlockedCount(b.Player) or Config.BaseStartPods
	for i, pod in pairs(b.Pods) do
		local open = i <= unlocked
		pod.Open = open
		local glass = pod.Model:FindFirstChild("Glass")
		if glass then
			glass.Color = open and POD_GLASS or POD_LOCKED
			glass.Transparency = open and 0.75 or 0.55
		end
		local ring = pod.Model:FindFirstChild("Ring")
		if ring then
			ring.Color = open and Color3.fromRGB(120, 200, 255) or POD_LOCKED
		end
		if not open then
			pod.CashLabel.Text = "🔒"
			pod.SubLabel.Text = "Mejora tu base"
		elseif not pod.Info then
			pod.CashLabel.Text = pod.Stored > 0 and Util.Money(pod.Stored) or ""
			pod.SubLabel.Text = b.Player and "Vacía" or ""
		end
	end
end

function Bases.FreePod(b)
	for i = 1, Config.MaxPods do
		local pod = b.Pods[i]
		if pod and pod.Open and not pod.Info and not pod.Reserved then
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

function Bases.Assign(player)
	for _, b in ipairs(list) do
		if not b.Player then
			b.Player = player
			b.OwnerId = player.UserId
			byPlayer[player] = b
			b.Model:SetAttribute("OwnerId", player.UserId)
			player:SetAttribute("BaseIndex", b.Index)
			if b.LockPrompt then
				b.LockPrompt:SetAttribute("OwnerId", player.UserId)
				-- Recrear el prompt para que los clientes reevalúen su visibilidad
				local clone = b.LockPrompt:Clone()
				b.LockPrompt:Destroy()
				clone.Parent = b.Model:FindFirstChild("LockButton")
				b.LockPrompt = clone
			end
			b.LockedUntil = 0
			setLaser(b, false)
			for _, pod in pairs(b.Pods) do
				pod.Stored = 0
				pod.Reserved = false
			end
			Bases.RefreshPods(b)
			local data = ctx.Data.Get(player)
			for key, rec in pairs(data.Pods) do
				local i = tonumber(key)
				local pod = i and b.Pods[i]
				if pod and type(rec) == "table" and AnomalyData.ById[rec.Id] then
					Bases.SpawnInPod(b, i, rec)
				else
					data.Pods[key] = nil
				end
			end
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
	for _, pod in pairs(b.Pods) do
		if pod.Info then
			ctx.Anoms.Destroy(pod.Info)
			pod.Info = nil
		end
		pod.Stored = 0
		pod.Reserved = false
	end
	b.Player = nil
	b.OwnerId = nil
	b.LockedUntil = 0
	b.Model:SetAttribute("OwnerId", 0)
	if b.LockPrompt then
		b.LockPrompt:SetAttribute("OwnerId", 0)
	end
	setLaser(b, false)
	byPlayer[player] = nil
	Bases.RefreshPods(b)
	updateSign(b)
end

function Bases.SpawnInPod(b, i, rec)
	local pod = b.Pods[i]
	local info = ctx.Anoms.Create(rec, pod.Anchor.CFrame)
	info.OwnerId = b.OwnerId
	info.Base = b
	info.PodIndex = i
	pod.Info = info
	ctx.Anoms.SetState(info, "pod")
	return info
end

-- Coloca un registro (y opcionalmente un modelo existente) en una cápsula del jugador
function Bases.PlaceInPod(player, i, rec, info)
	local b = byPlayer[player]
	local data = ctx.Data.Get(player)
	if not b or not data then
		if info then
			ctx.Anoms.Destroy(info)
		end
		return nil
	end
	local pod = b.Pods[i]
	pod.Reserved = false
	data.Pods[tostring(i)] = rec
	if info and info.Model.Parent then
		local root = info.Model.Root
		root.Anchored = true
		info.Model:PivotTo(pod.Anchor.CFrame)
		info.OwnerId = b.OwnerId
		info.Base = b
		info.PodIndex = i
		info.Revealed = nil
		pod.Info = info
		ctx.Anoms.SetState(info, "pod")
	else
		info = Bases.SpawnInPod(b, i, rec)
	end
	ctx.Effect("place", pod.Anchor.Position + Vector3.new(0, 3, 0), Config.RarityById[info.Def.Rarity].Color)
	ctx.Progression.Discover(player, rec.Id)
	return info
end

function Bases.RemoveFromPod(b, i)
	local pod = b.Pods[i]
	if not pod or not pod.Info then
		return nil
	end
	local info = pod.Info
	pod.Info = nil
	if b.Player then
		local data = ctx.Data.Get(b.Player)
		if data then
			data.Pods[tostring(i)] = nil
		end
	end
	info.Base = nil
	info.PodIndex = nil
	return info
end

-- Borra todas las anomalías del jugador (Ascender)
function Bases.ClearAll(player)
	local b = byPlayer[player]
	if not b then
		return
	end
	for i, pod in pairs(b.Pods) do
		local info = Bases.RemoveFromPod(b, i)
		if info then
			ctx.Anoms.Destroy(info, "poof")
		end
		pod.Stored = 0
	end
	local data = ctx.Data.Get(player)
	data.Pods = {}
	Bases.RefreshPods(b)
end

function Bases.Collect(player, silent)
	local b = byPlayer[player]
	if not b then
		return 0
	end
	local total = 0
	for _, pod in pairs(b.Pods) do
		total += pod.Stored
		pod.Stored = 0
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
	Bases.RefreshPods(b)
	return total
end

function Bases.Lock(player, model)
	local b = byModel[model]
	if not b or b.Player ~= player then
		return
	end
	if workspace:GetAttribute("Phase") == "Blackout" then
		ctx.Notify(player, "⚡ ¡No hay energía durante el APAGÓN!", Color3.fromRGB(255, 90, 90))
		return
	end
	if b.LockedUntil > now() then
		return
	end
	local data = ctx.Data.Get(player)
	b.LockedUntil = now() + Config.LockDuration + (data.BaseLevel or 0) * Config.LockPerLevel
	setLaser(b, true)
	updateSign(b)
	ctx.Notify(player, "🔒 Base cerrada con láser", Color3.fromRGB(255, 120, 140))
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
	if info.State ~= "pod" or info.OwnerId ~= player.UserId or not info.Base then
		return
	end
	local b = info.Base
	Bases.RemoveFromPod(b, info.PodIndex)
	local rec = info.Record
	if rec.Mimic then
		ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
		ctx.Notify(player, "☠ ¡Era un IMITADOR! No vale nada... escanéalos antes 🔬", Color3.fromRGB(255, 80, 80))
	else
		local value = math.floor(Util.Value(rec) * Config.SellRatio)
		ctx.Anoms.Destroy(info, "cash", Color3.fromRGB(110, 255, 140))
		ctx.Progression.AddCash(player, value)
		ctx.Notify(player, "Vendiste " .. Util.DisplayName(rec) .. " por " .. Util.Money(value), Color3.fromRGB(110, 255, 140))
	end
	Bases.RefreshPods(b)
end

function Bases.Tick()
	local t = now()
	for _, b in ipairs(list) do
		local player = b.Player
		if player then
			local mult = ctx.Progression.Multiplier(player)
			local total = 0
			for _, pod in pairs(b.Pods) do
				local info = pod.Info
				if info and info.State == "pod" then
					local inc = Util.Income(info.Record) * mult
					total += inc
					pod.Stored += inc
					pod.CashLabel.Text = Util.Money(pod.Stored)
					pod.SubLabel.Text = "+" .. Util.Money(inc) .. "/s"
				end
			end
			player:SetAttribute("Income", math.floor(total))
			if player:GetAttribute("Pass_AutoCollect") then
				Bases.Collect(player, true)
			end
			if b.LockedUntil > 0 and t >= b.LockedUntil then
				b.LockedUntil = 0
				setLaser(b, false)
			end
			updateSign(b)
		end
	end
end

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

return Bases
