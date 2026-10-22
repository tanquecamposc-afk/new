--!strict
-- Cosmetic/convenience store. Unconfigured products (id 0) show "Unavailable" and never prompt.
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local MonetizationConfig = require(Shared.Config.MonetizationConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		ViewUtil.para(body, "Everything here is cosmetic or convenience. No power, no random rolls. Purchases are verified by the server.", C.TextDim, 0)
		local order = 1
		for _, key in MonetizationConfig.PassOrder do
			local pass = MonetizationConfig.GamePasses[key]
			order += 1
			local card = Kit.card(body, pass.displayName .. "  (Game Pass)", order, C.Gold)
			ViewUtil.para(card, pass.description, C.TextDim, 1)
			local owned = profile.passes[key] == true
			local b = Kit.button({ parent = card, text = if owned then "Owned" else "Buy", order = 2, onClick = function()
				MarketplaceService:PromptGamePassPurchase(Players.LocalPlayer, pass.id)
			end })
			if not MonetizationConfig.isConfigured(pass) then
				b.setEnabled(false, "Unavailable")
			elseif owned then
				b.setEnabled(false, "Owned")
			end
		end
		for _, key in MonetizationConfig.ProductOrder do
			local product = MonetizationConfig.Products[key]
			order += 1
			local card = Kit.card(body, product.displayName, order, C.Accent)
			ViewUtil.para(card, product.description, C.TextDim, 1)
			local owned = product.grant.cosmetic and profile.cosmetics.owned[product.grant.cosmetic]
			local b = Kit.button({ parent = card, text = "Buy", order = 2, onClick = function()
				MarketplaceService:PromptProductPurchase(Players.LocalPlayer, product.id)
			end })
			if not MonetizationConfig.isConfigured(product) then
				b.setEnabled(false, "Unavailable")
			elseif owned then
				b.setEnabled(false, "Owned")
			end
		end
	end, { "profile" })
end

return View
