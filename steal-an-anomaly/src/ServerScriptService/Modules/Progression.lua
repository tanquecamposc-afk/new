-- Dinero, multiplicadores, Índice, misiones diarias, racha diaria,
-- códigos, mejoras, Ascensos, bonus de amigos, monetización y comandos admin.
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local AnomalyData = require(Shared.AnomalyData)
local Util = require(Shared.Util)

local Progression = {}
local ctx
local friends = {} -- [userId] = { [otherUserId] = true }

local function today()
	return math.floor(os.time() / 86400)
end

local function isAdmin(player)
	if RunService:IsStudio() then
		return true
	end
	if game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId then
		return true
	end
	return table.find(Config.Admins, player.UserId) ~= nil
end

---------------------------------------------------------------------------
-- Dinero
---------------------------------------------------------------------------
function Progression.GetCash(player)
	local data = ctx.Data.Get(player)
	return data and data.Cash or 0
end

function Progression.UpdateLeaderstats(player)
	local data = ctx.Data.Get(player)
	local ls = player:FindFirstChild("leaderstats")
	if not data or not ls then
		return
	end
	ls.Dinero.Value = Util.Money(data.Cash)
	ls.Ascensos.Value = data.Rebirths
	ls.Robos.Value = data.Stats.Steals
end

local function setCash(player, amount)
	local data = ctx.Data.Get(player)
	if not data then
		return
	end
	data.Cash = math.max(0, math.floor(amount))
	player:SetAttribute("Cash", data.Cash)
	Progression.UpdateLeaderstats(player)
end

function Progression.AddCash(player, amount)
	setCash(player, Progression.GetCash(player) + amount)
end

function Progression.TrySpend(player, amount)
	local cash = Progression.GetCash(player)
	if cash < amount then
		return false
	end
	setCash(player, cash - amount)
	return true
end

function Progression.Multiplier(player, ignoreFriends)
	local data = ctx.Data.Get(player)
	if not data then
		return 1
	end
	local m = 1 + data.Rebirths * Config.RebirthBonus
	if player:GetAttribute("Pass_VIP") then
		m *= 2
	end
	if not ignoreFriends then
		m *= 1 + (player:GetAttribute("FriendBonus") or 0)
	end
	return m
end

local function rawIncome(player)
	local data = ctx.Data.Get(player)
	local total = 0
	for _, rec in pairs(data.Beds) do
		total += Util.Income(rec)
	end
	return total
end

---------------------------------------------------------------------------
-- Índice, misiones y diario
---------------------------------------------------------------------------
function Progression.Discover(player, id)
	local data = ctx.Data.Get(player)
	if not data or data.Index[id] then
		return
	end
	data.Index[id] = true
	local def = AnomalyData.ById[id]
	local bonus = math.floor(def.Price * 0.25)
	Progression.AddCash(player, bonus)
	ctx.Notify(player, "📖 ¡Nueva en tu Índice: " .. def.Name .. "! +" .. Util.Money(bonus), Config.RarityById[def.Rarity].Color)
	Progression.Sync(player)
end

local function ensureMissions(data)
	local d = today()
	if data.Missions and data.Missions.Day == d then
		return
	end
	local pool = table.clone(Config.Missions)
	local list = {}
	for _ = 1, 3 do
		local i = math.random(1, #pool)
		local m = table.remove(pool, i)
		table.insert(list, { Type = m.Type, Target = m.Target, Progress = 0, Claimed = false })
	end
	data.Missions = { Day = d, List = list }
end

local function missionDef(type_)
	for _, m in ipairs(Config.Missions) do
		if m.Type == type_ then
			return m
		end
	end
end

local function missionReward(player, m)
	local def = missionDef(m.Type)
	local perSec = rawIncome(player) * Progression.Multiplier(player, true)
	return math.floor(math.max(400, perSec * 150) * (def and def.Reward or 1))
end

function Progression.Progress(player, type_, amount)
	local data = ctx.Data.Get(player)
	if not data then
		return
	end
	ensureMissions(data)
	local changed = false
	for _, m in ipairs(data.Missions.List) do
		if m.Type == type_ and m.Progress < m.Target then
			m.Progress = math.min(m.Target, m.Progress + amount)
			changed = true
			if m.Progress >= m.Target then
				ctx.Notify(player, "📋 ¡Misión completada! Reclama tu premio", Color3.fromRGB(255, 220, 90))
			end
		end
	end
	if changed then
		Progression.Sync(player)
	end
end

local function dailyState(data)
	local d = today()
	local canClaim = (data.Daily.Last or 0) < d
	local nextStreak = 1
	if (data.Daily.Last or 0) == d - 1 then
		nextStreak = (data.Daily.Streak % 7) + 1
	elseif not canClaim then
		nextStreak = data.Daily.Streak
	end
	return canClaim, nextStreak
end

---------------------------------------------------------------------------
-- Sincronización con el cliente
---------------------------------------------------------------------------
function Progression.Snapshot(player)
	local data = ctx.Data.Get(player)
	if not data then
		return nil
	end
	ensureMissions(data)
	local canClaim, nextStreak = dailyState(data)
	local missions = {}
	for i, m in ipairs(data.Missions.List) do
		local def = missionDef(m.Type)
		missions[i] = {
			Text = def and string.format(def.Text, m.Target) or m.Type,
			Progress = m.Progress,
			Target = m.Target,
			Claimed = m.Claimed,
			Reward = missionReward(player, m),
		}
	end
	local passes = {}
	for key in pairs(Config.GamePasses) do
		passes[key] = player:GetAttribute("Pass_" .. key) == true
	end
	return {
		Index = data.Index,
		Missions = missions,
		Daily = { CanClaim = canClaim, Next = nextStreak, Streak = data.Daily.Streak },
		BaseLevel = data.BaseLevel,
		Beds = select(1, ctx.Bases.Counts(player)),
		Incubators = select(2, ctx.Bases.Counts(player)),
		UpgradeCost = Config.BaseUpgradeCost[data.BaseLevel + 1],
		Rebirths = data.Rebirths,
		RebirthCost = Config.RebirthCost(data.Rebirths),
		Multiplier = Progression.Multiplier(player),
		Passes = passes,
		Tutorial = data.Tutorial,
		Buys = data.Stats.Buys,
		Collected = data.Stats.Collected or 0,
		Hatched = data.Stats.Hatched or 0,
		Treated = data.Stats.Treated or 0,
	}
end

function Progression.Sync(player)
	local snap = Progression.Snapshot(player)
	if snap then
		ctx.Remotes.Sync:FireClient(player, snap)
	end
end

---------------------------------------------------------------------------
-- Bonus de amigos (co-juego)
---------------------------------------------------------------------------
local function updateFriendBonus(player)
	local count = 0
	for otherId in pairs(friends[player.UserId] or {}) do
		if Players:GetPlayerByUserId(otherId) then
			count += 1
		end
	end
	player:SetAttribute("FriendBonus", math.min(Config.MaxFriendBonus, count * Config.FriendBonus))
end

local function registerFriends(player)
	friends[player.UserId] = friends[player.UserId] or {}
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player then
			local ok, isFriend = pcall(function()
				return player:IsFriendsWith(other.UserId)
			end)
			if ok and isFriend then
				friends[player.UserId][other.UserId] = true
				friends[other.UserId] = friends[other.UserId] or {}
				friends[other.UserId][player.UserId] = true
				updateFriendBonus(other)
				ctx.Notify(other, "👥 ¡Tu amigo " .. player.DisplayName .. " llegó! +10% dinero", Color3.fromRGB(120, 200, 255))
			end
		end
	end
	updateFriendBonus(player)
end

---------------------------------------------------------------------------
-- Ciclo de vida del jugador
---------------------------------------------------------------------------
function Progression.Setup(player, data)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	local cash = Instance.new("StringValue")
	cash.Name = "Dinero"
	cash.Parent = ls
	local reb = Instance.new("IntValue")
	reb.Name = "Ascensos"
	reb.Parent = ls
	local steals = Instance.new("IntValue")
	steals.Name = "Robos"
	steals.Parent = ls
	ls.Parent = player

	player:SetAttribute("Cash", data.Cash)
	player:SetAttribute("Rebirths", data.Rebirths)
	Progression.UpdateLeaderstats(player)
	ensureMissions(data)

	-- Pases
	for key, pass in pairs(Config.GamePasses) do
		if pass.Id and pass.Id > 0 then
			task.spawn(function()
				local ok, owns = pcall(function()
					return MarketplaceService:UserOwnsGamePassAsync(player.UserId, pass.Id)
				end)
				if ok and owns then
					player:SetAttribute("Pass_" .. key, true)
					Progression.Sync(player)
				end
			end)
		end
	end

	task.spawn(registerFriends, player)

	-- Ganancias offline
	if data.LastOnline and data.LastOnline > 0 then
		local secs = math.min(os.time() - data.LastOnline, Config.OfflineMaxSeconds)
		local earned = math.floor(rawIncome(player) * Progression.Multiplier(player, true) * Config.OfflineRatio * math.max(0, secs))
		if earned > 0 then
			Progression.AddCash(player, earned)
			task.delay(5, function()
				if player.Parent then
					ctx.Notify(player, "🌙 Mientras no estabas ganaste " .. Util.Money(earned), Color3.fromRGB(160, 140, 255))
				end
			end)
		end
	end

	player.Chatted:Connect(function(msg)
		Progression.OnChat(player, msg)
	end)
end

function Progression.OnLeave(player)
	friends[player.UserId] = nil
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player and friends[other.UserId] and friends[other.UserId][player.UserId] then
			friends[other.UserId][player.UserId] = nil
			updateFriendBonus(other)
		end
	end
end

function Progression.OnCharacter(player, char)
	local head = char:WaitForChild("Head", 5)
	if not head then
		return
	end
	local data = ctx.Data.Get(player)
	local tags = {}
	if player:GetAttribute("Pass_VIP") then
		table.insert(tags, "👑 VIP")
	end
	if data and data.Rebirths > 0 then
		table.insert(tags, "✦ Ascendido " .. data.Rebirths)
	end
	if #tags == 0 then
		return
	end
	local bb = Instance.new("BillboardGui")
	bb.Name = "Title"
	bb.Size = UDim2.fromOffset(200, 30)
	bb.StudsOffset = Vector3.new(0, 2.6, 0)
	bb.MaxDistance = 60
	bb.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(255, 215, 90)
	t.Text = table.concat(tags, "  ")
	local s = Instance.new("UIStroke")
	s.Thickness = 2
	s.Parent = t
	t.Parent = bb
	bb.Parent = head
end

---------------------------------------------------------------------------
-- Peticiones del cliente (menús)
---------------------------------------------------------------------------
local function reply(ok, msg)
	return { Ok = ok, Msg = msg }
end

local handlers = {}

function handlers.Sync(player)
	return Progression.Snapshot(player)
end

function handlers.Upgrade(player)
	local data = ctx.Data.Get(player)
	local cost = Config.BaseUpgradeCost[data.BaseLevel + 1]
	if not cost then
		return reply(false, "Tu base ya está al máximo")
	end
	if not Progression.TrySpend(player, cost) then
		return reply(false, "Necesitas " .. Util.Money(cost))
	end
	data.BaseLevel += 1
	local b = ctx.Bases.Get(player)
	if b then
		ctx.Bases.Refresh(b)
		local zone = b.Model:FindFirstChild("Collector")
		ctx.Effect("place", zone and zone.Position or Vector3.zero, Color3.fromRGB(120, 200, 255))
	end
	Progression.Sync(player)
	local beds, incs = ctx.Bases.Counts(player)
	return reply(true, ("🏗 ¡Clínica mejorada! %d camas y %d incubadoras"):format(beds, incs))
end

function handlers.Rebirth(player)
	local data = ctx.Data.Get(player)
	local cost = Config.RebirthCost(data.Rebirths)
	if data.Cash < cost then
		return reply(false, "Necesitas " .. Util.Money(cost) .. " para Ascender")
	end
	if ctx.Steal.IsCarrying(player) then
		ctx.Steal.Drop(player, "rebirth")
	end
	ctx.Bases.ClearAll(player)
	data.Rebirths += 1
	setCash(player, Config.StartCash)
	player:SetAttribute("Rebirths", data.Rebirths)
	ctx.Announce("✦ " .. player.DisplayName .. " ASCENDIÓ ✦", "Nivel " .. data.Rebirths .. " • x" .. (1 + data.Rebirths * Config.RebirthBonus) .. " dinero para siempre", Color3.fromRGB(255, 215, 90))
	Progression.Sync(player)
	if player.Character then
		local old = player.Character:FindFirstChild("Head") and player.Character.Head:FindFirstChild("Title")
		if old then
			old:Destroy()
		end
		task.spawn(Progression.OnCharacter, player, player.Character)
	end
	return reply(true, "✦ ¡Ascendiste! Multiplicador x" .. (1 + data.Rebirths * Config.RebirthBonus))
end

function handlers.Redeem(player, code)
	if type(code) ~= "string" then
		return reply(false, "Código inválido")
	end
	code = code:upper():gsub("%s+", "")
	local data = ctx.Data.Get(player)
	local reward = Config.Codes[code]
	if not reward then
		return reply(false, "❌ Ese código no existe (o expiró)")
	end
	if data.Codes[code] then
		return reply(false, "Ya usaste ese código")
	end
	data.Codes[code] = true
	Progression.AddCash(player, reward)
	return reply(true, "🎉 ¡Código canjeado! +" .. Util.Money(reward))
end

function handlers.Daily(player)
	local data = ctx.Data.Get(player)
	local canClaim, nextStreak = dailyState(data)
	if not canClaim then
		return reply(false, "Vuelve mañana para el día " .. ((data.Daily.Streak % 7) + 1))
	end
	data.Daily.Last = today()
	data.Daily.Streak = nextStreak
	local cash = Config.DailyRewards[nextStreak] or 0
	if cash > 0 then
		Progression.AddCash(player, cash)
	end
	if nextStreak == 7 then
		ctx.Bases.GrantEgg(player, Config.Day7Egg)
		Progression.Sync(player)
		return reply(true, "🎁 ¡Día 7! Recibiste un " .. Config.EggById[Config.Day7Egg].Name)
	end
	Progression.Sync(player)
	return reply(true, "🎁 Día " .. nextStreak .. ": +" .. Util.Money(cash))
end

function handlers.Mission(player, index)
	local data = ctx.Data.Get(player)
	ensureMissions(data)
	local m = type(index) == "number" and data.Missions.List[index]
	if not m then
		return reply(false, "Misión inválida")
	end
	if m.Claimed or m.Progress < m.Target then
		return reply(false, "Aún no está completa")
	end
	m.Claimed = true
	local reward = missionReward(player, m)
	Progression.AddCash(player, reward)
	Progression.Sync(player)
	return reply(true, "📋 ¡Premio de misión! +" .. Util.Money(reward))
end

function handlers.Tutorial(player)
	local data = ctx.Data.Get(player)
	data.Tutorial = true
	return reply(true)
end

function handlers.Pass(player, key)
	local pass = Config.GamePasses[key]
	if not pass then
		return reply(false, "Pase inválido")
	end
	if player:GetAttribute("Pass_" .. key) then
		return reply(false, "Ya tienes este pase")
	end
	if not pass.Id or pass.Id <= 0 then
		return reply(false, "⚙ Configura el Id de este pase en Shared/Config.lua")
	end
	MarketplaceService:PromptGamePassPurchase(player, pass.Id)
	return reply(true)
end

function handlers.Product(player, key)
	local product = Config.Products[key]
	if not product then
		return reply(false, "Producto inválido")
	end
	if not product.Id or product.Id <= 0 then
		return reply(false, "⚙ Configura el Id de este producto en Shared/Config.lua")
	end
	MarketplaceService:PromptProductPurchase(player, product.Id)
	return reply(true)
end

function Progression.HandleRequest(player, action, arg)
	local h = handlers[action]
	if not h or not ctx.Data.Get(player) then
		return reply(false, "")
	end
	local ok, result = pcall(h, player, arg)
	if not ok then
		warn("[Progression]", action, result)
		return reply(false, "Error")
	end
	return result
end

---------------------------------------------------------------------------
-- Monetización
---------------------------------------------------------------------------
local function grantProduct(player, product)
	if product.Cash then
		Progression.AddCash(player, product.Cash)
	end
	if product.Minutes then
		local amount = math.max(product.Min or 0, math.floor(rawIncome(player) * Progression.Multiplier(player) * 60 * product.Minutes))
		Progression.AddCash(player, amount)
		ctx.Notify(player, "💼 +" .. Util.Money(amount), Color3.fromRGB(110, 255, 140))
	end
	if product.Egg then
		ctx.Bases.GrantEgg(player, product.Egg)
	end
	if product.HatchAll then
		ctx.Bases.HatchAllNow(player)
	end
	if product.Blackout then
		ctx.Announce("🌑 " .. player.DisplayName .. " PROVOCÓ UN APAGÓN", "¡Prepárense!", Color3.fromRGB(255, 60, 60))
		ctx.Cycle.ForceBlackout()
	end
end

local function processReceipt(receipt)
	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	local data = player and ctx.Data.Get(player)
	if not data then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	if data.Receipts[receipt.PurchaseId] then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end
	for _, product in pairs(Config.Products) do
		if product.Id == receipt.ProductId then
			grantProduct(player, product)
			data.Receipts[receipt.PurchaseId] = true
			ctx.Data.Save(player)
			Progression.Sync(player)
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
	end
	return Enum.ProductPurchaseDecision.NotProcessedYet
end

---------------------------------------------------------------------------
-- Comandos de admin ("admin abuse" en vivo)
---------------------------------------------------------------------------
function Progression.OnChat(player, msg)
	if not isAdmin(player) or msg:sub(1, 1) ~= "/" then
		return
	end
	local args = string.split(msg:sub(2), " ")
	local cmd = (args[1] or ""):lower()
	if cmd == "apagon" then
		ctx.Cycle.ForceBlackout()
	elseif cmd == "restock" then
		ctx.Market.Restock(true)
	elseif cmd == "huevo" and args[2] and Config.EggById[args[2]] then
		ctx.Bases.GrantEgg(player, args[2])
	elseif cmd == "secreto" then
		ctx.Market.AdminSpawn("vacio")
		ctx.Announce("👁 ADMIN ABUSE 👁", "¡Un Huevo del Vacío apareció en el mercado!", Color3.fromRGB(30, 255, 205))
	elseif cmd == "imitador" then
		ctx.Market.AdminSpawn("legendario", true)
	elseif cmd == "eclosionar" then
		ctx.Bases.HatchAllNow(player)
	elseif cmd == "dinero" then
		Progression.AddCash(player, tonumber(args[2]) or 100000)
	elseif cmd == "lluvia" then
		ctx.Announce("💸 LLUVIA DE HUEVOS 💸", "¡Admin abuse en el mercado!", Color3.fromRGB(255, 220, 90))
		for _ = 1, 6 do
			ctx.Market.AdminSpawn(math.random() < 0.3 and "mitico" or "legendario")
		end
	end
end

function Progression.Init(c)
	ctx = c
	MarketplaceService.ProcessReceipt = processReceipt
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		if not purchased then
			return
		end
		for key, pass in pairs(Config.GamePasses) do
			if pass.Id == passId then
				player:SetAttribute("Pass_" .. key, true)
				ctx.Notify(player, "✅ ¡Gracias! " .. pass.Name .. " activado", Color3.fromRGB(255, 215, 90))
				if key == "Speed" and player.Character then
					local hum = player.Character:FindFirstChildOfClass("Humanoid")
					if hum then
						hum.WalkSpeed = Config.WalkSpeed * 1.25
					end
				end
				Progression.Sync(player)
			end
		end
	end)
	-- Comprobación de cambio de día para las misiones
	task.spawn(function()
		local last = today()
		while true do
			task.wait(30)
			if today() ~= last then
				last = today()
				for _, p in ipairs(Players:GetPlayers()) do
					Progression.Sync(p)
				end
			end
		end
	end)
end

return Progression
