-- Mercado de la Grieta (estilo Steal an Egg): pedestales con huevos anómalos.
-- Cada minuto se rellenan los vacíos; en el turno de noche llega el GRAN RESTOCK
-- con huevos mucho mejores y todos los jugadores corren al centro.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)

local Market = {}
local ctx
local slots = {} -- [i] = { Pedestal = part, Info = info? }

local function now()
	return workspace:GetServerTimeNow()
end

local function pickEgg(boost)
	local pool = {}
	for _, e in ipairs(Config.Eggs) do
		local w = e.Weight
		if boost then
			w = w * e.Order ^ 1.6
		elseif e.Id == "vacio" then
			w = 0
		end
		if w > 0 then
			table.insert(pool, { Id = e.Id, W = w })
		end
	end
	return Util.WeightedPick(pool, "W").Id
end

local function fill(i, eggId, mutBoost)
	local slot = slots[i]
	if slot.Info and not slot.Info.Dead then
		ctx.Anoms.Destroy(slot.Info, "poof")
	end
	local rec = Util.RollEgg(eggId, mutBoost)
	local top = slot.Pedestal.CFrame * CFrame.new(0, slot.Pedestal.Size.Y / 2, 0)
	local info = ctx.Anoms.CreateEgg(rec, top)
	info.Slot = i
	slot.Info = info
	ctx.Anoms.SetState(info, "market")
	ctx.Effect("spawn", top.Position + Vector3.new(0, 2, 0), info.Egg.Color)
	return info
end

function Market.Restock(grand)
	local best
	for i, slot in ipairs(slots) do
		local empty = not slot.Info or slot.Info.Dead or slot.Info.State ~= "market"
		if grand or empty then
			local info = fill(i, pickEgg(grand), grand and 2 or 1)
			if not best or info.Egg.Order > best.Egg.Order then
				best = info
			end
		end
	end
	if grand then
		-- Siempre al menos un huevo Legendario o mejor en el Gran Restock
		if not best or best.Egg.Order < 4 then
			best = fill(math.random(1, #slots), math.random() < 0.15 and "mitico" or "legendario", 3)
		end
		ctx.Announce("🥚 ¡GRAN RESTOCK! 🥚", "El mejor huevo: " .. best.Egg.Name, best.Egg.Color)
	end
	workspace:SetAttribute("RestockAt", now() + Config.MiniRestock)
end

function Market.Take(info)
	if info.Slot and slots[info.Slot] and slots[info.Slot].Info == info then
		slots[info.Slot].Info = nil
	end
	info.Slot = nil
end

function Market.Buy(player, info)
	if info.State ~= "market" or info.Dead then
		return
	end
	if ctx.Steal.IsCarrying(player) then
		ctx.Notify(player, "✋ Ya llevas algo en las manos", Color3.fromRGB(255, 180, 80))
		return
	end
	local b = ctx.Bases.Get(player)
	if not b then
		return
	end
	local idx = ctx.Bases.FreeInc(b)
	if not idx then
		ctx.Notify(player, "🥚 ¡Tus incubadoras están llenas! Mejora tu clínica.", Color3.fromRGB(255, 180, 80))
		return
	end
	local price = info.Egg.Price
	if not ctx.Progression.TrySpend(player, price) then
		ctx.Notify(player, "💸 Te faltan " .. Util.Money(price - ctx.Progression.GetCash(player)), Color3.fromRGB(255, 90, 90))
		return
	end
	Market.Take(info)
	b.Incs[idx].Reserved = true
	local data = ctx.Data.Get(player)
	data.Stats.Buys += 1
	ctx.Progression.Progress(player, "Buy", 1)
	ctx.Remotes.Effect:FireClient(player, "buy", info.Model.Root.Position + Vector3.new(0, 2, 0), info.Egg.Color)
	ctx.Steal.CarryNew(player, info, "buy", idx)
	if data.Stats.Buys == 1 then
		ctx.Progression.Sync(player)
	end
	if info.Egg.Order >= 4 then
		ctx.NotifyAll("🥚 " .. player.DisplayName .. " compró un " .. info.Egg.Name .. ". ¡Roba el huevo antes de que llegue!", info.Egg.Color)
	end
end

-- Comandos de admin: pone un huevo concreto en un pedestal al azar
function Market.AdminSpawn(eggId, contaminated)
	local i = math.random(1, #slots)
	local info = fill(i, eggId, 2)
	if contaminated then
		local rec = info.Record
		ctx.Anoms.Destroy(info)
		rec.Result.Mimic = true
		rec.Result.Tell = Config.MimicTells[math.random(1, #Config.MimicTells)]
		local slot = slots[i]
		local top = slot.Pedestal.CFrame * CFrame.new(0, slot.Pedestal.Size.Y / 2, 0)
		info = ctx.Anoms.CreateEgg(rec, top)
		info.Slot = i
		slot.Info = info
		ctx.Anoms.SetState(info, "market")
	end
	return info
end

-- Reportar un huevo contaminado del mercado lo elimina y deja hueco
function Market.Remove(info)
	Market.Take(info)
end

function Market.Init(c)
	ctx = c
	local market = workspace:WaitForChild("Map"):WaitForChild("Market")
	for i = 1, Config.Pedestals do
		local p = market:FindFirstChild("Pedestal" .. i)
		if p then
			slots[i] = { Pedestal = p }
		end
	end
	task.spawn(function()
		task.wait(1)
		Market.Restock(false)
		while true do
			task.wait(0.5)
			if now() >= (workspace:GetAttribute("RestockAt") or 0) then
				Market.Restock(false)
			end
		end
	end)
end

return Market
