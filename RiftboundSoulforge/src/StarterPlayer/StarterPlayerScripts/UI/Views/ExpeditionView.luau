--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local ExpeditionConfig = require(Shared.Config.ExpeditionConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local card = Kit.card(body, "Emberfall Frontier", 1, Color3.fromRGB(255, 140, 80))
		ViewUtil.para(card, "A burning frontier: ruined outpost, Cinder Ravine, the Ruined Keep and the Fracture Arena. Mine, hunt, explore, then extract.", C.TextDim, 1)
		ViewUtil.heading(card, "Before you go", 2, C.Warn)
		for i, rule in ExpeditionConfig.Rules do
			ViewUtil.para(card, "• " .. rule, C.Text, 2 + i, 14)
		end
		ViewUtil.para(card, "Leaving the game mid-expedition counts as a fall at your current depth; the rest is banked.", C.TextMuted, 20, 12)
		local row = Kit.row(card, 30, 44)
		Kit.button({ parent = row, text = "Launch expedition", color = Color3.fromRGB(255, 120, 60), size = UDim2.fromOffset(220, 40), order = 1, onClick = function()
			local ok = ClientState.request("EnterExpedition", { withParty = false })
			if ok then
				ctx.close()
			end
		end })
		local party = Kit.button({ parent = row, text = "Launch with party", color = Color3.fromRGB(110, 170, 255), size = UDim2.fromOffset(220, 40), order = 2, onClick = function()
			local ok = ClientState.request("EnterExpedition", { withParty = true })
			if ok then
				ctx.close()
			end
		end })
		party.setEnabled(ClientState.party ~= nil, if ClientState.party == nil then "No party" else nil)
		ViewUtil.para(card, "Party launch brings members standing at the portal with you.", C.TextMuted, 31, 12)
		local loadout = Kit.card(body, "Your build", 2)
		ViewUtil.para(loadout, string.format("Katana +%d • %s%s • Tonics x%d", profile.weapons.Katana.upgrade - 1, profile.loadout.primary, if profile.loadout.secondary ~= "" then " + " .. profile.loadout.secondary else "", profile.materials.EmberTonic or 0), C.Text, 1)
		Kit.button({ parent = loadout, text = "Change loadout", color = C.PanelLight, order = 2, onClick = function()
			ctx.open("Loadout")
		end })
	end, { "profile", "party" })
end

return View
