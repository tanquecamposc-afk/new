--!strict
-- The only code path that changes banked coins and materials. Everything is server-owned.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local ItemConfig = require(Shared.Config.ItemConfig)
local Costs = require(Shared.Inventory.Costs)
local Registry = require(script.Parent.Parent.Registry)

local InventoryService = {}

local MAX_STACK = 1_000_000

function InventoryService.Init() end
function InventoryService.Start() end

local function data(player: Player): any
	return Registry.get("PlayerDataService").get(player)
end

function InventoryService.addItem(player: Player, item: string, amount: number): boolean
	if not ItemConfig.isValid(item) or type(amount) ~= "number" or amount <= 0 or amount % 1 ~= 0 then
		return false
	end
	local profile = data(player)
	if not profile then
		return false
	end
	profile.materials[item] = math.min(MAX_STACK, (profile.materials[item] or 0) + amount)
	Registry.get("PlayerDataService").markDirty(player)
	return true
end

function InventoryService.addCoins(player: Player, amount: number): boolean
	if type(amount) ~= "number" or amount <= 0 or amount ~= amount then
		return false
	end
	local profile = data(player)
	if not profile then
		return false
	end
	profile.coins = math.min(1e12, profile.coins + math.floor(amount))
	Registry.get("PlayerDataService").markDirty(player)
	return true
end

-- rewards = { coins = n?, items = { [item] = n }? }
function InventoryService.grant(player: Player, rewards: any)
	if rewards.coins and rewards.coins > 0 then
		InventoryService.addCoins(player, rewards.coins)
	end
	if rewards.items then
		for item, amount in rewards.items do
			InventoryService.addItem(player, item, amount)
		end
	end
end

function InventoryService.count(player: Player, item: string): number
	local profile = data(player)
	if not profile then
		return 0
	end
	return Costs.have(profile, item)
end

function InventoryService.canAfford(player: Player, cost: any): (boolean, { string })
	local profile = data(player)
	if not profile then
		return false, { "profile" }
	end
	return Costs.canAfford(profile, cost)
end

-- Atomic check-and-spend (no yields between check and mutation).
function InventoryService.spend(player: Player, cost: any): boolean
	local profile = data(player)
	if not profile then
		return false
	end
	local ok = Costs.spend(profile, cost)
	if ok then
		Registry.get("PlayerDataService").markDirty(player)
	end
	return ok
end

return InventoryService
