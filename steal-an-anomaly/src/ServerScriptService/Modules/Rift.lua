-- La Grieta: genera anomalías que desfilan por la cinta. Los jugadores
-- las compran ("Contener") y caminan solas hasta su base.
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local AnomalyData = require(Shared.AnomalyData)
local Util = require(Shared.Util)

local Rift = {}
local ctx
local startPos, endPos

local function flat(v, y)
	return Vector3.new(v.X, y, v.Z)
end

function Rift.Init(c)
	ctx = c
	local map = workspace:WaitForChild("Map")
	startPos = map:WaitForChild("PathStart").Position
	endPos = map:WaitForChild("PathEnd").Position
	startPos = flat(startPos, 1)
	endPos = flat(endPos, 1)
	task.spawn(function()
		task.wait(2)
		while true do
			Rift.Spawn(Rift.RollRecord())
			task.wait(Config.SpawnInterval)
		end
	end)
end

-- minOrder: rareza mínima (para el surge del apagón). mutBoost multiplica las mutaciones.
function Rift.RollRecord(minOrder, mutBoost, allowMimic)
	local pool = {}
	for _, r in ipairs(Config.Rarities) do
		if r.Order >= (minOrder or 1) and AnomalyData.ByRarity[r.Id] then
			table.insert(pool, r)
		end
	end
	local rarity = Util.WeightedPick(pool, "Weight")
	local defs = AnomalyData.ByRarity[rarity.Id]
	local def = defs[math.random(1, #defs)]
	local mut
	for i = #Config.Mutations, 1, -1 do
		local m = Config.Mutations[i]
		if math.random() < m.Chance * (mutBoost or 1) then
			mut = m.Id
			break
		end
	end
	local record = { Id = def.Id, Mut = mut }
	if allowMimic ~= false and not minOrder and rarity.Order >= 2 and math.random() < Config.MimicChance then
		record.Mimic = true
		record.Tell = Config.MimicTells[math.random(1, #Config.MimicTells)]
	end
	return record
end

function Rift.Spawn(record)
	local look = CFrame.lookAt(startPos, endPos)
	if record.Mimic and record.Tell == "inverted" then
		look *= CFrame.Angles(0, math.pi, 0)
	end
	local info = ctx.Anoms.Create(record, look)
	ctx.Anoms.SetState(info, "conveyor")
	local dist = (endPos - startPos).Magnitude
	local goal = look + (endPos - startPos)
	local tween = TweenService:Create(info.Model.Root, TweenInfo.new(dist / Config.ConveyorSpeed, Enum.EasingStyle.Linear), { CFrame = goal })
	info.Tween = tween
	tween.Completed:Connect(function(state)
		if state == Enum.PlaybackState.Completed and info.State == "conveyor" then
			ctx.Anoms.Destroy(info, "poof", Color3.fromRGB(140, 60, 255))
		end
	end)
	tween:Play()
	ctx.Effect("spawn", startPos + Vector3.new(0, 4, 0), Config.RarityById[info.Def.Rarity].Color)
	local rarity = Config.RarityById[info.Def.Rarity]
	if rarity.Order >= 4 then
		ctx.NotifyAll("✦ ¡Una anomalía " .. rarity.Name:upper() .. " salió de la Grieta: " .. Util.DisplayName(record) .. "!", rarity.Color)
	end
	return info
end

function Rift.SpawnSurge()
	local record = Rift.RollRecord(4, 3, false)
	local info = Rift.Spawn(record)
	local rarity = Config.RarityById[info.Def.Rarity]
	ctx.Announce("¡SURGE EN LA GRIETA!", Util.DisplayName(record) .. " (" .. rarity.Name .. ")", rarity.Color)
	return info
end

local function walkTo(info, target, speed)
	local root = info.Model.Root
	local from = root.Position
	local to = Vector3.new(target.X, target.Y, target.Z)
	local dist = (to - from).Magnitude
	if dist < 0.1 then
		return true
	end
	local face = CFrame.lookAt(from, Vector3.new(to.X, from.Y, to.Z))
	if info.Record.Mimic and info.Record.Tell == "inverted" then
		face *= CFrame.Angles(0, math.pi, 0)
	end
	root.CFrame = face
	local tween = TweenService:Create(root, TweenInfo.new(dist / speed, Enum.EasingStyle.Linear), { CFrame = face + (to - from) })
	info.Tween = tween
	tween:Play()
	local state = tween.Completed:Wait()
	return state == Enum.PlaybackState.Completed and not info.Dead
end

function Rift.Buy(player, info)
	if info.State ~= "conveyor" or info.Dead then
		return
	end
	local b = ctx.Bases.Get(player)
	if not b then
		return
	end
	local podIndex = ctx.Bases.FreePod(b)
	if not podIndex then
		ctx.Notify(player, "📦 ¡Tus cápsulas están llenas! Vende o mejora tu base.", Color3.fromRGB(255, 180, 80))
		return
	end
	local price = Util.Value(info.Record)
	if not ctx.Progression.TrySpend(player, price) then
		ctx.Notify(player, "💸 Te faltan " .. Util.Money(price - ctx.Progression.GetCash(player)), Color3.fromRGB(255, 90, 90))
		return
	end
	local pod = b.Pods[podIndex]
	pod.Reserved = true
	if info.Tween then
		info.Tween:Cancel()
	end
	info.OwnerId = player.UserId
	ctx.Anoms.SetState(info, "walking", player.DisplayName)
	ctx.Progression.Progress(player, "Buy", 1)
	local data = ctx.Data.Get(player)
	data.Stats.Buys += 1
	ctx.Remotes.Effect:FireClient(player, "buy", info.Model.Root.Position + Vector3.new(0, 3, 0), Config.RarityById[info.Def.Rarity].Color)
	if data.Stats.Buys == 1 then
		ctx.Progression.Sync(player)
	end

	task.spawn(function()
		local door = b.Model:FindFirstChild("DoorPoint")
		local ok = true
		if door then
			ok = walkTo(info, Vector3.new(door.Position.X, 1, door.Position.Z), Config.WalkToBaseSpeed)
		end
		if ok and b.Player == player then
			ok = walkTo(info, pod.Anchor.Position, Config.WalkToBaseSpeed)
		end
		if info.Dead then
			pod.Reserved = false
			return
		end
		if not ok or b.Player ~= player then
			pod.Reserved = false
			ctx.Anoms.Destroy(info, "poof")
			return
		end
		ctx.Bases.PlaceInPod(player, podIndex, info.Record, info)
	end)
end

return Rift
