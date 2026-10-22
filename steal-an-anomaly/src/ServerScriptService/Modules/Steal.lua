-- Robos, capturas, anomalías fugadas, Imitadores, Escáner y Bate.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)

local Steal = {}
local ctx
local carriers = {} -- [player] = { Info, Kind, FromPlayer, FromPod, ToPod }
local roaming = {} -- [info] = true
local cooldowns = { Scan = {}, Swing = {} }
local toolTemplates

local FIELD_X = 210
local FIELD_Z = 32

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

local function hrpOf(player)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if hum and hrp and hum.Health > 0 then
		return hrp, hum
	end
	return nil
end

local function groundY(x, z)
	rayParams.FilterDescendantsInstances = { ctx.Anoms.Folder, workspace:FindFirstChild("Bases") }
	local hit = workspace:Raycast(Vector3.new(x, 60, z), Vector3.new(0, -120, 0), rayParams)
	return hit and hit.Position.Y or 0
end

local function baseSpeed(player)
	return Config.WalkSpeed * (player:GetAttribute("Pass_Speed") and 1.25 or 1)
end

---------------------------------------------------------------------------
-- Herramientas
---------------------------------------------------------------------------
local function weldTo(handle, part, offset)
	part.CFrame = handle.CFrame * offset
	part.Anchored = false
	part.CanCollide = false
	part.Massless = true
	local w = Instance.new("WeldConstraint")
	w.Part0 = handle
	w.Part1 = part
	w.Parent = part
	part.Parent = handle.Parent
end

local function buildTools()
	local folder = Instance.new("Folder")
	folder.Name = "ToolTemplates"

	-- Escáner
	local scanner = Instance.new("Tool")
	scanner.Name = "Escáner"
	scanner.ToolTip = "Apunta a una anomalía y haz clic para saber si es un IMITADOR"
	scanner.CanBeDropped = false
	scanner.Grip = CFrame.new(0, 0, -0.4, 0, 0, 1, 1, 0, 0, 0, 1, 0)
	local h = Instance.new("Part")
	h.Name = "Handle"
	h.Size = Vector3.new(0.5, 0.9, 1.6)
	h.Color = Color3.fromRGB(40, 40, 55)
	h.Material = Enum.Material.Metal
	h.Parent = scanner
	local screen = Instance.new("Part")
	screen.Name = "Screen"
	screen.Size = Vector3.new(0.52, 0.6, 0.7)
	screen.Color = Color3.fromRGB(80, 255, 170)
	screen.Material = Enum.Material.Neon
	weldTo(h, screen, CFrame.new(0, 0.2, 0.3))
	local lens = Instance.new("Part")
	lens.Name = "Lens"
	lens.Shape = Enum.PartType.Cylinder
	lens.Size = Vector3.new(0.3, 0.5, 0.5)
	lens.Color = Color3.fromRGB(160, 90, 255)
	lens.Material = Enum.Material.Neon
	weldTo(h, lens, CFrame.new(0, 0, 0.85) * CFrame.Angles(0, math.pi / 2, 0))
	local beamAtt = Instance.new("Attachment")
	beamAtt.Name = "Tip"
	beamAtt.Position = Vector3.new(0, 0, 0.95)
	beamAtt.Parent = h
	scanner.Parent = folder

	-- Bate
	local bat = Instance.new("Tool")
	bat.Name = "Bate"
	bat.ToolTip = "Golpea a los ladrones para que suelten tu anomalía"
	bat.CanBeDropped = false
	bat.Grip = CFrame.new(0, 0, -1.5, 0, 0, 1, 1, 0, 0, 0, 1, 0)
	local bh = Instance.new("Part")
	bh.Name = "Handle"
	bh.Size = Vector3.new(0.45, 0.45, 4.2)
	bh.Color = Color3.fromRGB(150, 100, 60)
	bh.Material = Enum.Material.Wood
	bh.Parent = bat
	local barrel = Instance.new("Part")
	barrel.Name = "Barrel"
	barrel.Size = Vector3.new(0.75, 0.75, 2.2)
	barrel.Color = Color3.fromRGB(170, 115, 70)
	barrel.Material = Enum.Material.Wood
	weldTo(bh, barrel, CFrame.new(0, 0, 1.1))
	for i = 0, 1 do
		local stripe = Instance.new("Part")
		stripe.Name = "Stripe"
		stripe.Size = Vector3.new(0.8, 0.8, 0.18)
		stripe.Color = Color3.fromRGB(255, 50, 90)
		stripe.Material = Enum.Material.Neon
		weldTo(bh, stripe, CFrame.new(0, 0, 0.5 + i * 0.9))
	end
	bat.Parent = folder

	folder.Parent = ServerStorage
	return folder
end

local function giveTools(player)
	local backpack = player:FindFirstChildOfClass("Backpack") or player:WaitForChild("Backpack", 5)
	if not backpack then
		return
	end
	for _, t in ipairs(toolTemplates:GetChildren()) do
		if not backpack:FindFirstChild(t.Name) and not (player.Character and player.Character:FindFirstChild(t.Name)) then
			t:Clone().Parent = backpack
		end
	end
end

---------------------------------------------------------------------------
-- Cargar anomalías sobre la cabeza
---------------------------------------------------------------------------
local function attach(player, info)
	local hrp, hum = hrpOf(player)
	if not hrp then
		return false
	end
	if info.Tween then
		info.Tween:Cancel()
	end
	local root = info.Model.Root
	root.Anchored = false
	root.Massless = true
	info.Model:PivotTo(hrp.CFrame * CFrame.new(0, 3.2, 0))
	local w = Instance.new("Weld")
	w.Name = "CarryWeld"
	w.Part0 = hrp
	w.Part1 = root
	w.C0 = CFrame.new(0, 3.2, 0)
	w.Parent = root
	hum.WalkSpeed = Config.CarrySpeed * (player:GetAttribute("Pass_Speed") and 1.25 or 1)
	player:SetAttribute("Carrying", Util.DisplayName(info.Record))
	return true
end

local function detach(player, info)
	local root = info.Model and info.Model:FindFirstChild("Root")
	if root then
		local w = root:FindFirstChild("CarryWeld")
		if w then
			w:Destroy()
		end
		root.Anchored = true
	end
	if player then
		local _, hum = hrpOf(player)
		if hum then
			hum.WalkSpeed = baseSpeed(player)
		end
		player:SetAttribute("Carrying", nil)
	end
end

function Steal.IsCarrying(player)
	return carriers[player] ~= nil
end

function Steal.MakeRoaming(info, position, originalOwner)
	info.State = "roaming"
	info.OwnerId = nil
	info.OriginalOwner = originalOwner
	info.RoamSince = os.clock()
	info.NextMove = 0
	local root = info.Model.Root
	root.Anchored = true
	local y = groundY(position.X, position.Z)
	info.Model:PivotTo(CFrame.new(position.X, y, position.Z))
	ctx.Anoms.SetState(info, "roaming")
	roaming[info] = true
end

local function reserveFree(player)
	local b = ctx.Bases.Get(player)
	local i = b and ctx.Bases.FreePod(b)
	if not i then
		ctx.Notify(player, "📦 ¡No tienes cápsulas libres!", Color3.fromRGB(255, 180, 80))
		return nil
	end
	b.Pods[i].Reserved = true
	return i
end

local function unreserve(player, i)
	local b = ctx.Bases.Get(player)
	if b and i and b.Pods[i] then
		b.Pods[i].Reserved = false
	end
end

function Steal.StartSteal(thief, info)
	if info.State ~= "pod" or carriers[thief] or not info.Base then
		return
	end
	local ownerBase = info.Base
	local owner = ownerBase.Player
	if not owner or owner == thief then
		return
	end
	if ctx.Bases.IsLocked(ownerBase) then
		ctx.Notify(thief, "🔒 Esa base está cerrada con láser", Color3.fromRGB(255, 90, 90))
		return
	end
	local hrp = hrpOf(thief)
	if not hrp or (hrp.Position - info.Model.Root.Position).Magnitude > 16 then
		return
	end
	local toPod = reserveFree(thief)
	if not toPod then
		return
	end
	local fromPod = info.PodIndex
	ctx.Bases.RemoveFromPod(ownerBase, fromPod)
	ctx.Bases.RefreshPods(ownerBase)
	carriers[thief] = { Info = info, Kind = "steal", FromPlayer = owner, FromPod = fromPod, ToPod = toPod }
	ctx.Anoms.SetState(info, "carried", thief.DisplayName)
	if not attach(thief, info) then
		Steal.Drop(thief, "fail")
		return
	end
	ctx.Remotes.Alert:FireClient(owner, thief, Util.DisplayName(info.Record))
	ctx.Notify(thief, "🏃 ¡Corre a tu base con " .. Util.DisplayName(info.Record) .. "!", Color3.fromRGB(255, 200, 80))
end

function Steal.Capture(player, info)
	if info.State ~= "roaming" or carriers[player] then
		return
	end
	if info.Record.Mimic and info.Revealed then
		Steal.CatchMimic(player, info)
		return
	end
	local toPod = reserveFree(player)
	if not toPod then
		return
	end
	roaming[info] = nil
	carriers[player] = { Info = info, Kind = "capture", FromPlayer = nil, ToPod = toPod, OriginalOwner = info.OriginalOwner }
	ctx.Anoms.SetState(info, "carried", player.DisplayName)
	if not attach(player, info) then
		Steal.Drop(player, "fail")
		return
	end
	ctx.Notify(player, "✋ ¡Atrapada! Llévala a tu base", Color3.fromRGB(255, 200, 80))
end

function Steal.CatchMimic(player, info)
	if info.State ~= "roaming" or not info.Record.Mimic then
		return
	end
	roaming[info] = nil
	local bounty = math.floor(Util.Value(info.Record) * Config.MimicBountyRatio * 0.5)
	ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
	ctx.Progression.AddCash(player, bounty)
	ctx.Progression.Progress(player, "Expose", 1)
	ctx.Notify(player, "☠ ¡Imitador atrapado! +" .. Util.Money(bounty), Color3.fromRGB(255, 120, 120))
end

function Steal.Deliver(player)
	local c = carriers[player]
	if not c then
		return
	end
	carriers[player] = nil
	local info = c.Info
	detach(player, info)
	local data = ctx.Data.Get(player)
	ctx.Bases.PlaceInPod(player, c.ToPod, info.Record, info)
	local name = Util.DisplayName(info.Record)
	if c.Kind == "steal" then
		data.Stats.Steals += 1
		ctx.Progression.Progress(player, "Steal", 1)
		ctx.Progression.UpdateLeaderstats(player)
		ctx.Notify(player, "😈 ¡Robaste " .. name .. "!", Color3.fromRGB(255, 200, 80))
		if c.FromPlayer and c.FromPlayer.Parent then
			ctx.Notify(c.FromPlayer, "😭 " .. player.DisplayName .. " te robó " .. name, Color3.fromRGB(255, 90, 90))
		end
		local rarity = Config.RarityById[info.Def.Rarity]
		if rarity.Order >= 4 then
			ctx.NotifyAll("🚨 " .. player.DisplayName .. " robó " .. name .. " (" .. rarity.Name .. ")" .. (c.FromPlayer and (" a " .. c.FromPlayer.DisplayName) or ""), rarity.Color)
		end
	else
		data.Stats.Captures += 1
		if c.OriginalOwner ~= player.UserId then
			ctx.Progression.Progress(player, "Capture", 1)
		end
		ctx.Notify(player, "✅ " .. name .. " contenida", Color3.fromRGB(120, 255, 150))
	end
end

function Steal.Drop(player, reason)
	local c = carriers[player]
	if not c then
		return
	end
	carriers[player] = nil
	local info = c.Info
	local hrp = hrpOf(player)
	local pos = (hrp and hrp.Position) or (info.Model.Parent and info.Model.Root.Position) or Vector3.zero
	detach(player, info)
	unreserve(player, c.ToPod)
	if info.Dead or not info.Model.Parent then
		return
	end
	local owner = c.FromPlayer
	if c.Kind == "steal" and owner and owner.Parent and ctx.Bases.Get(owner) then
		local ob = ctx.Bases.Get(owner)
		local pod = ob.Pods[c.FromPod]
		local idx = (pod and pod.Open and not pod.Info and not pod.Reserved) and c.FromPod or ctx.Bases.FreePod(ob)
		if idx then
			ctx.Effect("return", pos + Vector3.new(0, 3, 0), Color3.fromRGB(120, 200, 255))
			ctx.Bases.PlaceInPod(owner, idx, info.Record, info)
			ctx.Notify(owner, "🛡 ¡Recuperaste " .. Util.DisplayName(info.Record) .. "!", Color3.fromRGB(120, 255, 150))
			return
		end
	end
	Steal.MakeRoaming(info, pos, c.OriginalOwner or (owner and owner.UserId))
end

---------------------------------------------------------------------------
-- Apagón: fugas e Imitadores
---------------------------------------------------------------------------
function Steal.TriggerBreaches()
	for _, player in ipairs(Players:GetPlayers()) do
		local b = ctx.Bases.Get(player)
		local data = ctx.Data.Get(player)
		if b and data then
			local chance = math.max(0.03, Config.BreachChance - (data.BaseLevel or 0) * Config.BreachReducePerLevel)
			if math.random() < chance then
				local candidates = {}
				for i, pod in pairs(b.Pods) do
					if pod.Info and pod.Info.State == "pod" and not pod.Info.Record.Mimic then
						table.insert(candidates, i)
					end
				end
				if #candidates > 0 then
					local i = candidates[math.random(1, #candidates)]
					local pos = b.Pods[i].Anchor.Position
					local info = ctx.Bases.RemoveFromPod(b, i)
					ctx.Bases.RefreshPods(b)
					ctx.Effect("breach", pos + Vector3.new(0, 4, 0), Color3.fromRGB(255, 60, 60))
					Steal.MakeRoaming(info, pos, player.UserId)
					ctx.Notify(player, "⚠ ¡" .. Util.DisplayName(info.Record) .. " ESCAPÓ de tu base! ¡Atrápala!", Color3.fromRGB(255, 80, 80))
				end
			end
		end
	end
end

local function revealLook(info)
	for _, p in ipairs(info.Model:GetDescendants()) do
		if p:IsA("BasePart") and p.Name ~= "Root" then
			if p.Name == "Eye" or p.Name == "Pupil" or p.Name == "Iris" then
				p.Color = Color3.fromRGB(255, 20, 30)
				p.Material = Enum.Material.Neon
			else
				p.Color = Color3.fromRGB(15, 10, 15)
				p.Material = Enum.Material.SmoothPlastic
			end
		end
	end
	info.Model:SetAttribute("Glitch", true)
end

function Steal.RevealMimics()
	local any = false
	for _, b in ipairs(ctx.Bases.All()) do
		local owner = b.Player
		if owner then
			for i, pod in pairs(b.Pods) do
				local mimic = pod.Info
				if mimic and mimic.State == "pod" and mimic.Record.Mimic then
					any = true
					-- devora la anomalía más valiosa de la base
					local victimIndex, best = nil, -1
					for j, other in pairs(b.Pods) do
						if j ~= i and other.Info and other.Info.State == "pod" and not other.Info.Record.Mimic then
							local v = Util.Value(other.Info.Record)
							if v > best then
								best, victimIndex = v, j
							end
						end
					end
					if victimIndex then
						local victim = ctx.Bases.RemoveFromPod(b, victimIndex)
						local vname = Util.DisplayName(victim.Record)
						local target = victim.Model.Root.Position
						TweenService:Create(mimic.Model.Root, TweenInfo.new(0.6, Enum.EasingStyle.Back), { CFrame = CFrame.new(target) }):Play()
						task.delay(0.6, function()
							ctx.Anoms.Destroy(victim, "devour", Color3.fromRGB(255, 30, 50))
						end)
						ctx.Notify(owner, "☠ ¡Un IMITADOR devoró tu " .. vname .. "!", Color3.fromRGB(255, 60, 60))
					else
						ctx.Notify(owner, "☠ ¡Tenías un IMITADOR en tu base!", Color3.fromRGB(255, 60, 60))
					end
					local pos = pod.Anchor.Position
					ctx.Bases.RemoveFromPod(b, i)
					mimic.Revealed = true
					revealLook(mimic)
					task.delay(0.7, function()
						if not mimic.Dead then
							Steal.MakeRoaming(mimic, pos, nil)
						end
					end)
				end
			end
			ctx.Bases.RefreshPods(b)
		end
	end
	if any then
		ctx.Announce("☠ LOS IMITADORES DESPERTARON ☠", "Atrápalos para ganar recompensas", Color3.fromRGB(255, 40, 60))
	end
end

-- Amanecer: los imitadores vuelven a la Grieta y las fugadas regresan a casa
function Steal.OnDay()
	for info in pairs(roaming) do
		if info.Record.Mimic and info.Revealed then
			roaming[info] = nil
			ctx.Anoms.Destroy(info, "poof", Color3.fromRGB(140, 60, 255))
		end
	end
	task.delay(Config.BreachReturnDelay, function()
		for info in pairs(roaming) do
			if info.State == "roaming" and not info.Dead then
				local owner = info.OriginalOwner and Players:GetPlayerByUserId(info.OriginalOwner)
				local b = owner and ctx.Bases.Get(owner)
				local idx = b and ctx.Bases.FreePod(b)
				roaming[info] = nil
				if idx then
					ctx.Effect("return", info.Model.Root.Position + Vector3.new(0, 3, 0), Color3.fromRGB(120, 200, 255))
					ctx.Bases.PlaceInPod(owner, idx, info.Record, info)
					ctx.Notify(owner, "🏠 " .. Util.DisplayName(info.Record) .. " volvió a tu base", Color3.fromRGB(120, 200, 255))
				else
					ctx.Anoms.Destroy(info, "poof", Color3.fromRGB(140, 60, 255))
				end
			end
		end
	end)
end

local function roamStep()
	local t = os.clock()
	for info in pairs(roaming) do
		if info.Dead or not info.Model.Parent or info.State ~= "roaming" then
			roaming[info] = nil
		elseif t >= (info.NextMove or 0) then
			local root = info.Model.Root
			local x = math.clamp(root.Position.X + math.random(-60, 60), -FIELD_X, FIELD_X)
			local z = math.random(-FIELD_Z, FIELD_Z)
			local target = Vector3.new(x, groundY(x, z), z)
			local from = root.Position
			local dist = (target - from).Magnitude
			local speed = info.Revealed and 14 or 8
			local face = CFrame.lookAt(from, Vector3.new(target.X, from.Y, target.Z))
			root.CFrame = face
			local tween = TweenService:Create(root, TweenInfo.new(dist / speed, Enum.EasingStyle.Linear), { CFrame = face + (target - from) })
			info.Tween = tween
			tween:Play()
			info.NextMove = t + dist / speed + math.random(5, 25) / 10
		end
	end
end

---------------------------------------------------------------------------
-- Escáner y Bate
---------------------------------------------------------------------------
function Steal.Scan(player, model)
	if typeof(model) ~= "Instance" then
		return
	end
	local info = ctx.Anoms.Registry[model]
	if not info or info.Dead then
		return
	end
	local cd = player:GetAttribute("Pass_ScannerPro") and Config.ScanCooldownPro or Config.ScanCooldown
	if cooldowns.Scan[player] and os.clock() - cooldowns.Scan[player] < cd - 0.1 then
		return
	end
	if info.State ~= "conveyor" and info.State ~= "pod" and info.State ~= "roaming" then
		return
	end
	local hrp = hrpOf(player)
	if not hrp or (hrp.Position - info.Model.Root.Position).Magnitude > Config.ScanRange + 6 then
		return
	end
	cooldowns.Scan[player] = os.clock()
	ctx.Progression.Progress(player, "Scan", 1)
	local rec = info.Record
	if rec.Mimic then
		local bounty = math.floor(Util.Value(rec) * Config.MimicBountyRatio)
		if info.Revealed then
			bounty = math.floor(bounty * 0.5)
		end
		if info.State == "pod" and info.Base then
			local b = info.Base
			local owner = b.Player
			ctx.Bases.RemoveFromPod(b, info.PodIndex)
			ctx.Bases.RefreshPods(b)
			if owner and owner ~= player then
				ctx.Notify(owner, "🔬 " .. player.DisplayName .. " expuso un IMITADOR que tenías en tu base", Color3.fromRGB(255, 200, 80))
			end
		end
		roaming[info] = nil
		ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
		ctx.Progression.AddCash(player, bounty)
		ctx.Progression.Progress(player, "Expose", 1)
		local data = ctx.Data.Get(player)
		data.Stats.Exposed += 1
		ctx.Remotes.ScanResult:FireClient(player, { Mimic = true, Bounty = bounty, Name = info.Def.Name })
		ctx.NotifyAll("🔬 " .. player.DisplayName .. " expuso un IMITADOR disfrazado de " .. info.Def.Name, Color3.fromRGB(255, 120, 120))
	else
		ctx.Remotes.ScanResult:FireClient(player, {
			Mimic = false,
			Name = Util.DisplayName(rec),
			Rarity = info.Def.Rarity,
			Value = Util.Value(rec),
			Income = Util.Income(rec),
			Lore = info.Def.Lore,
		})
	end
end

function Steal.Swing(player)
	if cooldowns.Swing[player] and os.clock() - cooldowns.Swing[player] < Config.BatCooldown then
		return
	end
	local char = player.Character
	if not char or not char:FindFirstChild("Bate") then
		return
	end
	local hrp = hrpOf(player)
	if not hrp then
		return
	end
	cooldowns.Swing[player] = os.clock()
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player then
			local ohrp = hrpOf(other)
			if ohrp then
				local offset = ohrp.Position - hrp.Position
				local dist = offset.Magnitude
				if dist <= Config.BatRange and (dist < 4 or hrp.CFrame.LookVector:Dot(offset.Unit) > 0.2) then
					local dir = Vector3.new(offset.X, 0, offset.Z)
					dir = dir.Magnitude > 0.01 and dir.Unit or hrp.CFrame.LookVector
					ctx.Remotes.Knock:FireClient(other, dir, Config.BatForce)
					ctx.Effect("hit", ohrp.Position, Color3.fromRGB(255, 220, 120))
					if carriers[other] then
						ctx.Progression.Progress(player, "Hit", 1)
						ctx.Notify(player, "💥 ¡Le hiciste soltar el botín a " .. other.DisplayName .. "!", Color3.fromRGB(255, 220, 120))
						Steal.Drop(other, "hit")
					end
				end
			end
		end
	end
end

---------------------------------------------------------------------------
function Steal.OnCharacter(player, char)
	local hum = char:WaitForChild("Humanoid", 5)
	if hum then
		hum.WalkSpeed = baseSpeed(player)
		hum.Died:Connect(function()
			Steal.Drop(player, "died")
		end)
	end
	giveTools(player)
end

function Steal.OnLeave(player)
	Steal.Drop(player, "left")
	cooldowns.Scan[player] = nil
	cooldowns.Swing[player] = nil
end

function Steal.Init(c)
	ctx = c
	toolTemplates = buildTools()
	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc += dt
		if acc < 0.1 then
			return
		end
		acc = 0
		for player, c2 in pairs(carriers) do
			local hrp = hrpOf(player)
			if not hrp or c2.Info.Dead then
				Steal.Drop(player, "dead")
			elseif ctx.Bases.IsInside(ctx.Bases.Get(player), hrp.Position) then
				Steal.Deliver(player)
			end
		end
	end)
	task.spawn(function()
		while true do
			task.wait(0.5)
			roamStep()
		end
	end)
end

return Steal
