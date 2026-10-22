--!strict
-- Robux monetization. Purely cosmetic / convenience. All ids live in MonetizationConfig and
-- are UNSET (0) until configured. Fulfilment is server-side and idempotent:
--  * Developer Products: ProcessReceipt records PurchaseId in the profile and only returns
--    PurchaseGranted after a successful save.
--  * Game Passes: ownership is checked with UserOwnsGamePassAsync (never trusted from client).

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local MonetizationConfig = require(Shared.Config.MonetizationConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local EconomyService = {}

local function productById(id: number): any?
	for _, product in MonetizationConfig.Products do
		if MonetizationConfig.isConfigured(product) and product.id == id then
			return product
		end
	end
	return nil
end

local function passById(id: number): any?
	for _, pass in MonetizationConfig.GamePasses do
		if MonetizationConfig.isConfigured(pass) and pass.id == id then
			return pass
		end
	end
	return nil
end

local function grantProduct(player: Player, profile: any, product: any)
	local grant = product.grant
	if grant.cosmetic then
		profile.cosmetics.owned[grant.cosmetic] = true
	end
	Registry.get("PlayerDataService").markDirty(player)
	Net.event("Notify"):FireClient(player, "Unlock", "Thank you! " .. product.displayName .. " unlocked.")
end

local function processReceipt(receipt: any): Enum.ProductPurchaseDecision
	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	if not player then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local PlayerData = Registry.get("PlayerDataService")
	local profile = PlayerData.get(player)
	-- Only grant into a profile that can actually be saved; otherwise Roblox retries later.
	if not profile or PlayerData.state(player) ~= "Loaded" then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local product = productById(receipt.ProductId)
	if not product then
		warn("[Economy] receipt for unknown product " .. tostring(receipt.ProductId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local purchaseId = tostring(receipt.PurchaseId)
	if not table.find(profile.receipts, purchaseId) then
		grantProduct(player, profile, product)
		table.insert(profile.receipts, purchaseId)
	end
	-- Persist before acknowledging. If the save fails, Roblox calls again and the recorded
	-- PurchaseId prevents a second grant.
	if PlayerData.save(player) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end
	return Enum.ProductPurchaseDecision.NotProcessedYet
end

local function refreshPasses(player: Player)
	local profile = Registry.get("PlayerDataService").get(player)
	if not profile then
		return
	end
	for key, pass in MonetizationConfig.GamePasses do
		if MonetizationConfig.isConfigured(pass) then
			local ok, owns = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, pass.id)
			if ok then
				profile.passes[key] = owns == true
			end
		else
			profile.passes[key] = nil
		end
	end
	Registry.get("PlayerDataService").markDirty(player)
end

function EconomyService.ownsPass(player: Player, key: string): boolean
	local profile = Registry.get("PlayerDataService").get(player)
	return profile ~= nil and profile.passes[key] == true
end

function EconomyService.Init() end

function EconomyService.Start()
	MarketplaceService.ProcessReceipt = processReceipt
	Registry.get("PlayerDataService").Loaded:Connect(function(player)
		task.spawn(refreshPasses, player)
	end)
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		if purchased and passById(passId) then
			refreshPasses(player)
			Net.event("Notify"):FireClient(player, "Unlock", "Thank you! Game pass active.")
		end
	end)
end

return EconomyService
