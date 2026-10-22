-- Robos y transporte (huevos y pacientes), fotos Polaroid y reportes de
-- Imitadores, fugas del turno de noche, Imitadores despiertos y el Bate.
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
local carriers = {} -- [player] = { Info, Kind, FromPlayer, FromIndex, ToIndex, OriginalOwner }
local roaming = {} -- [info] = true (anomalías sueltas)
local loose = {} -- [info] = expiración (huevos tirados)
local lastPhoto = {} -- [player] = { Info, T }
local cooldowns = { Photo = {}, Swing = {} }
local toolTemplates

local FIELD_X = 205
local FIELD_Z = 32
local LOOSE_TIME = 120

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

-- Camina (tween) hasta un punto; devuelve false si se canceló
function Steal.WalkTo(info, target, speed)
	local root = info.Model.Root
	local from = root.Position
	local dist = (target - from).Magnitude
	if dist < 0.1 then
		return true
	end
	local face = CFrame.lookAt(from, Vector3.new(target.X, from.Y, target.Z))
	if info.Record.Mimic and info.Record.Tell == "inverted" then
		face *= CFrame.Angles(0, math.pi, 0)
	end
	root.CFrame = face
	local tween = TweenService:Create(root, TweenInfo.new(dist / speed, Enum.EasingStyle.Linear), { CFrame = face + (target - from) })
	info.Tween = tween
	tween:Play()
	local state = tween.Completed:Wait()
	return state == Enum.PlaybackState.Completed and not info.Dead
end

---------------------------------------------------------------------------
-- Herramientas: Cámara Polaroid y Bate
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

	local cam = Instance.new("Tool")
	cam.Name = "Cámara"
	cam.ToolTip = "Fotografía anomalías y huevos: la foto revela las señales de un IMITADOR"
	cam.CanBeDropped = false
	cam.Grip = CFrame.new(0, -0.2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1)
	local h = Instance.new("Part")
	h.Name = "Handle"
	h.Size = Vector3.new(1.3, 0.95, 0.7)
	h.Color = Color3.fromRGB(245, 240, 230)
	h.Material = Enum.Material.SmoothPlastic
	h.Parent = cam
	local stripe = Instance.new("Part")
	stripe.Size = Vector3.new(1.32, 0.18, 0.72)
	stripe.Color = Color3.fromRGB(60, 200, 220)
	stripe.Material = Enum.Material.SmoothPlastic
	weldTo(h, stripe, CFrame.new(0, 0.12, 0))
	local lens = Instance.new("Part")
	lens.Shape = Enum.PartType.Cylinder
	lens.Size = Vector3.new(0.3, 0.6, 0.6)
	lens.Color = Color3.fromRGB(25, 25, 30)
	lens.Material = Enum.Material.Glass
	weldTo(h, lens, CFrame.new(0, -0.05, -0.45) * CFrame.Angles(0, math.pi / 2, 0))
	local flash = Instance.new("Part")
	flash.Name = "Flash"
	flash.Size = Vector3.new(0.3, 0.2, 0.05)
	flash.Color = Color3.fromRGB(255, 255, 220)
	flash.Material = Enum.Material.Neon
	weldTo(h, flash, CFrame.new(0.4, 0.3, -0.36))
	local tip = Instance.new("Attachment")
	tip.Name = "Tip"
	tip.Position = Vector3.new(0, 0, -0.65)
	tip.Parent = h
	cam.Parent = folder

	local bat = Instance.new("Tool")
	bat.Name = "Bate"
	bat.ToolTip = "Golpea a los ladrones para que suelten el botín"
	bat.CanBeDropped = false
	bat.Grip = CFrame.new(0, 0, -1.5, 0, 0, 1, 1, 0, 0, 0, 1, 0)
	local bh = Instance.new("Part")
	bh.Name = "Handle"
	bh.Size = Vector3.new(0.45, 0.45, 4.2)
	bh.Color = Color3.fromRGB(150, 100, 60)
	bh.Material = Enum.Material.Wood
	bh.Parent = bat
	local barrel = Instance.new("Part")
	barrel.Size = Vector3.new(0.75, 0.75, 2.2)
	barrel.Color = Color3.fromRGB(170, 115, 70)
	barrel.Material = Enum.Material.Wood
	weldTo(bh, barrel, CFrame.new(0, 0, 1.1))
	for i = 0, 1 do
		local s = Instance.new("Part")
		s.Size = Vector3.new(0.8, 0.8, 0.18)
		s.Color = Color3.fromRGB(255, 50, 90)
		s.Material = Enum.Material.Neon
		weldTo(bh, s, CFrame.new(0, 0, 0.5 + i * 0.9))
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
-- Cargar cosas sobre la cabeza
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
	local offset = CFrame.new(0, info.Kind == "egg" and 2.8 or 3.2, 0)
	info.Model:PivotTo(hrp.CFrame * offset)
	local w = Instance.new("Weld")
	w.Name = "CarryWeld"
	w.Part0 = hrp
	w.Part1 = root
	w.C0 = offset
	w.Parent = root
	hum.WalkSpeed = Config.CarrySpeed * (player:GetAttribute("Pass_Speed") and 1.25 or 1)
	player:SetAttribute("Carrying", ctx.Anoms.Name(info))
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

local function reserve(player, info)
	local b = ctx.Bases.Get(player)
	if not b then
		return nil
	end
	if info.Kind == "egg" then
		local i = ctx.Bases.FreeInc(b)
		if not i then
			ctx.Notify(player, "🥚 ¡No tienes incubadoras libres!", Color3.fromRGB(255, 180, 80))
			return nil
		end
		b.Incs[i].Reserved = true
		return i
	end
	local i = ctx.Bases.FreeBed(b)
	if not i then
		ctx.Notify(player, "🛏 ¡No tienes camas libres!", Color3.fromRGB(255, 180, 80))
		return nil
	end
	b.Beds[i].Reserved = true
	return i
end

local function unreserve(player, info, i)
	local b = ctx.Bases.Get(player)
	if not b or not i then
		return
	end
	local slot = info.Kind == "egg" and b.Incs[i] or b.Beds[i]
	if slot then
		slot.Reserved = false
	end
end

function Steal.MakeRoaming(info, position, originalOwner)
	info.State = "roaming"
	info.OwnerId = nil
	info.OriginalOwner = originalOwner
	info.NextMove = 0
	local root = info.Model.Root
	root.Anchored = true
	local y = groundY(position.X, position.Z)
	info.Model:PivotTo(CFrame.new(position.X, y, position.Z))
	ctx.Anoms.SetState(info, "roaming")
	roaming[info] = true
end

function Steal.MakeDropped(info, position, originalOwner)
	info.OwnerId = nil
	info.OriginalOwner = originalOwner
	local root = info.Model.Root
	root.Anchored = true
	local y = groundY(position.X, position.Z)
	info.Model:PivotTo(CFrame.new(position.X, y, position.Z))
	ctx.Anoms.SetState(info, "dropped")
	loose[info] = os.clock() + LOOSE_TIME
end

-- Empieza a cargar algo nuevo (huevo recién comprado)
function Steal.CarryNew(player, info, kind, toIndex)
	carriers[player] = { Info = info, Kind = kind, ToIndex = toIndex }
	ctx.Anoms.SetState(info, "carried", player.DisplayName)
	if not attach(player, info) then
		Steal.Drop(player, "fail")
		return
	end
	ctx.Notify(player, "🏃 ¡Lleva el " .. ctx.Anoms.Name(info) .. " a tu incubadora!", Color3.fromRGB(255, 200, 80))
end

function Steal.StartSteal(thief, info)
	if carriers[thief] or not info.Base then
		return
	end
	if not ((info.Kind == "egg" and info.State == "incubating") or (info.Kind == "anomaly" and info.State == "bed")) then
		return
	end
	local ownerBase = info.Base
	local owner = ownerBase.Player
	if not owner or owner == thief then
		return
	end
	if ctx.Bases.IsLocked(ownerBase) then
		ctx.Notify(thief, "🔒 Esa clínica está cerrada con láser", Color3.fromRGB(255, 90, 90))
		return
	end
	local hrp = hrpOf(thief)
	if not hrp or (hrp.Position - info.Model.Root.Position).Magnitude > 16 then
		return
	end
	local toIndex = reserve(thief, info)
	if not toIndex then
		return
	end
	local fromIndex
	if info.Kind == "egg" then
		fromIndex = info.IncIndex
		ctx.Bases.RemoveEgg(ownerBase, fromIndex)
	else
		fromIndex = info.BedIndex
		ctx.Bases.RemoveFromBed(ownerBase, fromIndex)
	end
	ctx.Bases.Refresh(ownerBase)
	carriers[thief] = { Info = info, Kind = "steal", FromPlayer = owner, FromIndex = fromIndex, ToIndex = toIndex }
	ctx.Anoms.SetState(info, "carried", thief.DisplayName)
	if not attach(thief, info) then
		Steal.Drop(thief, "fail")
		return
	end
	ctx.Remotes.Alert:FireClient(owner, thief, ctx.Anoms.Name(info))
	ctx.Notify(thief, "🏃 ¡Corre a tu clínica con " .. ctx.Anoms.Name(info) .. "!", Color3.fromRGB(255, 200, 80))
end

function Steal.Capture(player, info)
	if carriers[player] then
		return
	end
	if info.Kind == "anomaly" and info.State == "roaming" and info.Record.Mimic and info.Revealed then
		Steal.CatchMimic(player, info)
		return
	end
	if not ((info.Kind == "anomaly" and info.State == "roaming") or (info.Kind == "egg" and info.State == "dropped")) then
		return
	end
	local toIndex = reserve(player, info)
	if not toIndex then
		return
	end
	roaming[info] = nil
	loose[info] = nil
	carriers[player] = { Info = info, Kind = "capture", ToIndex = toIndex, OriginalOwner = info.OriginalOwner }
	ctx.Anoms.SetState(info, "carried", player.DisplayName)
	if not attach(player, info) then
		Steal.Drop(player, "fail")
		return
	end
	ctx.Notify(player, "✋ ¡Lo tienes! Llévalo a tu clínica", Color3.fromRGB(255, 200, 80))
end

function Steal.CatchMimic(player, info)
	if info.State ~= "roaming" or not info.Record.Mimic then
		return
	end
	roaming[info] = nil
	local bounty = math.floor(Util.Value(info.Record) * Config.ReportBountyRatio * 0.5)
	ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
	ctx.Progression.AddCash(player, bounty)
	ctx.Progression.Progress(player, "Report", 1)
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
	local name = ctx.Anoms.Name(info)
	if info.Kind == "egg" then
		ctx.Bases.PlaceEgg(player, c.ToIndex, info.Record, info)
	else
		ctx.Bases.PlaceInBed(player, c.ToIndex, info.Record, info)
	end
	if c.Kind == "buy" then
		ctx.Notify(player, "🥚 " .. name .. " incubando. ¡Protégelo!", Color3.fromRGB(150, 220, 255))
		if not data.Tutorial then
			ctx.Progression.Sync(player)
		end
	elseif c.Kind == "steal" then
		data.Stats.Steals += 1
		ctx.Progression.Progress(player, "Steal", 1)
		ctx.Progression.UpdateLeaderstats(player)
		ctx.Notify(player, "😈 ¡Robaste " .. name .. "!", Color3.fromRGB(255, 200, 80))
		if c.FromPlayer and c.FromPlayer.Parent then
			ctx.Notify(c.FromPlayer, "😭 " .. player.DisplayName .. " te robó " .. name, Color3.fromRGB(255, 90, 90))
		end
		local order = info.Kind == "egg" and info.Egg.Order or Config.RarityById[info.Def.Rarity].Order
		if order >= 4 then
			ctx.NotifyAll("🚨 " .. player.DisplayName .. " robó " .. name .. (c.FromPlayer and (" a " .. c.FromPlayer.DisplayName) or ""), Color3.fromRGB(255, 200, 80))
		end
	else
		data.Stats.Captures += 1
		if c.OriginalOwner ~= player.UserId then
			ctx.Progression.Progress(player, "Capture", 1)
		end
		ctx.Notify(player, "✅ " .. name .. " asegurado", Color3.fromRGB(120, 255, 150))
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
	unreserve(player, info, c.ToIndex)
	if info.Dead or not info.Model.Parent then
		return
	end
	local owner = c.FromPlayer
	if c.Kind == "steal" and owner and owner.Parent and ctx.Bases.Get(owner) then
		local ob = ctx.Bases.Get(owner)
		local idx
		if info.Kind == "egg" then
			local inc = ob.Incs[c.FromIndex]
			idx = (inc and inc.Open and not inc.Info and not inc.Reserved) and c.FromIndex or ctx.Bases.FreeInc(ob)
		else
			local bed = ob.Beds[c.FromIndex]
			idx = (bed and bed.Open and not bed.Info and not bed.Reserved) and c.FromIndex or ctx.Bases.FreeBed(ob)
		end
		if idx then
			ctx.Effect("return", pos + Vector3.new(0, 3, 0), Color3.fromRGB(120, 200, 255))
			if info.Kind == "egg" then
				ctx.Bases.PlaceEgg(owner, idx, info.Record, info)
			else
				ctx.Bases.PlaceInBed(owner, idx, info.Record, info)
			end
			ctx.Notify(owner, "🛡 ¡Recuperaste " .. ctx.Anoms.Name(info) .. "!", Color3.fromRGB(120, 255, 150))
			return
		end
	end
	local orig = c.OriginalOwner or (owner and owner.UserId) or (c.Kind == "buy" and player.UserId) or nil
	if info.Kind == "egg" then
		Steal.MakeDropped(info, pos, orig)
		if c.Kind == "buy" then
			ctx.Notify(player, "🥚 ¡Se te cayó el huevo! ¡Recógelo antes que otro!", Color3.fromRGB(255, 120, 90))
		end
	else
		Steal.MakeRoaming(info, pos, orig)
	end
end

---------------------------------------------------------------------------
-- Fotos Polaroid y reportes
---------------------------------------------------------------------------
local BENIGN = { "luz", "grano", "borrosa" }

local function pickSigns(n)
	local pool = table.clone(Config.PhotoSigns)
	local out = {}
	for _ = 1, n do
		table.insert(out, table.remove(pool, math.random(1, #pool)))
	end
	return out
end

function Steal.Photo(player, model)
	if typeof(model) ~= "Instance" then
		return
	end
	local info = ctx.Anoms.Registry[model]
	if not info or info.Dead or info.State == "carried" then
		return
	end
	local cd = player:GetAttribute("Pass_CameraPro") and Config.PhotoCooldownPro or Config.PhotoCooldown
	if cooldowns.Photo[player] and os.clock() - cooldowns.Photo[player] < cd - 0.15 then
		return
	end
	local hrp = hrpOf(player)
	if not hrp or (hrp.Position - info.Model.Root.Position).Magnitude > Config.PhotoRange + 6 then
		return
	end
	cooldowns.Photo[player] = os.clock()
	ctx.Progression.Progress(player, "Photo", 1)
	local mimic = ctx.Anoms.IsMimic(info)
	local subject = info.Kind == "egg" and info.Record.Result or info.Record
	-- Las señales se deciden una vez por objeto para que dos fotos coincidan
	if mimic and not info.Signs then
		info.Signs = pickSigns(math.random(1, 2))
	end
	lastPhoto[player] = { Info = info, T = os.clock() }
	ctx.Remotes.PhotoResult:FireClient(player, {
		Kind = info.Kind,
		Id = subject.Id,
		Mut = subject.Mut,
		EggId = info.Kind == "egg" and info.Record.Egg or nil,
		Name = ctx.Anoms.Name(info),
		Signs = mimic and info.Signs or {},
		Benign = (not mimic and math.random() < 0.45) and BENIGN[math.random(1, #BENIGN)] or nil,
		Value = ctx.Anoms.Value(info),
	})
end

function Steal.Report(player)
	local lp = lastPhoto[player]
	lastPhoto[player] = nil
	if not lp or os.clock() - lp.T > 45 then
		ctx.Notify(player, "📸 Primero saca una foto", Color3.fromRGB(200, 200, 220))
		return
	end
	local info = lp.Info
	if info.Dead or not info.Model.Parent or info.State == "carried" then
		ctx.Notify(player, "Ese objetivo ya no está", Color3.fromRGB(200, 200, 220))
		return
	end
	local value = ctx.Anoms.Value(info)
	if ctx.Anoms.IsMimic(info) then
		local bounty = math.floor(value * Config.ReportBountyRatio)
		if info.Revealed then
			bounty = math.floor(bounty * 0.5)
		end
		local b = info.Base
		if info.State == "bed" and b then
			ctx.Bases.RemoveFromBed(b, info.BedIndex)
			ctx.Bases.Refresh(b)
		elseif info.State == "incubating" and b then
			ctx.Bases.RemoveEgg(b, info.IncIndex)
			ctx.Bases.Refresh(b)
		elseif info.State == "market" then
			ctx.Market.Remove(info)
		end
		if b and b.Player and b.Player ~= player then
			ctx.Notify(b.Player, "📸 " .. player.DisplayName .. " reportó un IMITADOR en tu clínica", Color3.fromRGB(255, 200, 80))
		end
		roaming[info] = nil
		loose[info] = nil
		ctx.Anoms.Destroy(info, "expose", Color3.fromRGB(255, 40, 60))
		ctx.Progression.AddCash(player, bounty)
		ctx.Progression.Progress(player, "Report", 1)
		local data = ctx.Data.Get(player)
		data.Stats.Exposed += 1
		ctx.Remotes.ReportResult:FireClient(player, true, bounty)
		ctx.NotifyAll("📸 " .. player.DisplayName .. " desenmascaró un IMITADOR (" .. ctx.Anoms.Name(info) .. ")", Color3.fromRGB(255, 120, 120))
	else
		local fine = math.min(ctx.Progression.GetCash(player), math.floor(value * Config.FalseReportFine))
		ctx.Progression.TrySpend(player, fine)
		ctx.Sanity.Add(player, -15)
		ctx.Remotes.ReportResult:FireClient(player, false, fine)
	end
end

---------------------------------------------------------------------------
-- Turno de noche: fugas e Imitadores
---------------------------------------------------------------------------
function Steal.TriggerBreaches()
	for _, player in ipairs(Players:GetPlayers()) do
		local b = ctx.Bases.Get(player)
		local data = ctx.Data.Get(player)
		if b and data then
			local escaped = {}
			local stable = {}
			for i, bed in pairs(b.Beds) do
				local info = bed.Info
				if info and info.State == "bed" and not info.Record.Mimic then
					if info.Critical then
						table.insert(escaped, i)
					else
						table.insert(stable, i)
					end
				end
			end
			local chance = math.max(0.02, Config.BreachChance - (data.BaseLevel or 0) * Config.BreachReducePerLevel)
			if #stable > 0 and math.random() < chance then
				table.insert(escaped, stable[math.random(1, #stable)])
			end
			for _, i in ipairs(escaped) do
				local pos = b.Beds[i].Anchor.Position
				local info = ctx.Bases.RemoveFromBed(b, i)
				ctx.Effect("breach", pos + Vector3.new(0, 4, 0), Color3.fromRGB(255, 60, 60))
				Steal.MakeRoaming(info, pos, player.UserId)
				ctx.Notify(player, "⚠ ¡" .. Util.DisplayName(info.Record) .. " ESCAPÓ! ¡Atrápala!", Color3.fromRGB(255, 80, 80))
			end
			ctx.Bases.Refresh(b)
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
	info.Model:SetAttribute("Revealed", true)
end

function Steal.RevealMimics()
	local any = false
	for _, b in ipairs(ctx.Bases.All()) do
		local owner = b.Player
		if owner then
			for i, bed in pairs(b.Beds) do
				local mimic = bed.Info
				if mimic and mimic.State == "bed" and mimic.Record.Mimic then
					any = true
					local victimIndex, best = nil, -1
					for j, other in pairs(b.Beds) do
						if j ~= i and other.Info and other.Info.State == "bed" and not other.Info.Record.Mimic then
							local v = Util.Value(other.Info.Record)
							if v > best then
								best, victimIndex = v, j
							end
						end
					end
					if victimIndex then
						local victim = ctx.Bases.RemoveFromBed(b, victimIndex)
						local vname = Util.DisplayName(victim.Record)
						TweenService:Create(mimic.Model.Root, TweenInfo.new(0.6, Enum.EasingStyle.Back), { CFrame = CFrame.new(victim.Model.Root.Position) }):Play()
						task.delay(0.6, function()
							ctx.Anoms.Destroy(victim, "devour", Color3.fromRGB(255, 30, 50))
						end)
						ctx.Notify(owner, "☠ ¡Un IMITADOR devoró a tu " .. vname .. "!", Color3.fromRGB(255, 60, 60))
					else
						ctx.Notify(owner, "☠ ¡Tenías un IMITADOR en tu clínica!", Color3.fromRGB(255, 60, 60))
					end
					local pos = bed.Anchor.Position
					ctx.Bases.RemoveFromBed(b, i)
					mimic.Revealed = true
					revealLook(mimic)
					task.delay(0.7, function()
						if not mimic.Dead then
							Steal.MakeRoaming(mimic, pos, nil)
						end
					end)
				end
			end
			ctx.Bases.Refresh(b)
		end
	end
	if any then
		ctx.Announce("☠ LOS IMITADORES DESPERTARON ☠", "Atrápalos para ganar recompensas", Color3.fromRGB(255, 40, 60))
	end
end

function Steal.RevealedNear(position, radius)
	for info in pairs(roaming) do
		if info.Revealed and not info.Dead and (info.Model.Root.Position - position).Magnitude <= radius then
			return true
		end
	end
	return false
end

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
				local idx = b and ctx.Bases.FreeBed(b)
				roaming[info] = nil
				if idx then
					ctx.Effect("return", info.Model.Root.Position + Vector3.new(0, 3, 0), Color3.fromRGB(120, 200, 255))
					ctx.Bases.PlaceInBed(owner, idx, info.Record, info)
					ctx.Notify(owner, "🏠 " .. Util.DisplayName(info.Record) .. " volvió a su cama", Color3.fromRGB(120, 200, 255))
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
			local tween = TweenService:Create(root, TweenInfo.new(math.max(0.1, dist / speed), Enum.EasingStyle.Linear), { CFrame = face + (target - from) })
			info.Tween = tween
			tween:Play()
			info.NextMove = t + dist / speed + math.random(5, 25) / 10
		end
	end
	for info, expires in pairs(loose) do
		if info.Dead or info.State ~= "dropped" then
			loose[info] = nil
		elseif t >= expires then
			loose[info] = nil
			ctx.Anoms.Destroy(info, "poof")
		end
	end
end

---------------------------------------------------------------------------
-- Bate
---------------------------------------------------------------------------
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
						ctx.Notify(player, "💥 ¡" .. other.DisplayName .. " soltó el botín!", Color3.fromRGB(255, 220, 120))
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
	cooldowns.Photo[player] = nil
	cooldowns.Swing[player] = nil
	lastPhoto[player] = nil
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
