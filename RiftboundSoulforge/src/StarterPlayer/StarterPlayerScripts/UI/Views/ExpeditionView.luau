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
		local card = Kit.card(body, "Frontera de Emberfall", 1, Color3.fromRGB(255, 140, 80))
		ViewUtil.para(card, "Una frontera en llamas: puesto en ruinas, Barranco de Ceniza, la Fortaleza en Ruinas y la Arena de la Fractura. Mina, caza, explora y extrae.", C.TextDim, 1)
		ViewUtil.heading(card, "Antes de partir", 2, C.Warn)
		for i, rule in ExpeditionConfig.Rules do
			ViewUtil.para(card, "• " .. rule, C.Text, 2 + i, 14)
		end
		ViewUtil.para(card, "Salir del juego a mitad de expedición cuenta como caída en tu profundidad actual; el resto se asegura.", C.TextMuted, 20, 12)
		local row = Kit.row(card, 30, 44)
		Kit.button({ parent = row, text = "Lanzar expedición", color = Color3.fromRGB(255, 120, 60), size = UDim2.fromOffset(220, 40), order = 1, onClick = function()
			local ok = ClientState.request("EnterExpedition", { withParty = false })
			if ok then
				ctx.close()
			end
		end })
		local party = Kit.button({ parent = row, text = "Lanzar con el grupo", color = Color3.fromRGB(110, 170, 255), size = UDim2.fromOffset(220, 40), order = 2, onClick = function()
			local ok = ClientState.request("EnterExpedition", { withParty = true })
			if ok then
				ctx.close()
			end
		end })
		party.setEnabled(ClientState.party ~= nil, if ClientState.party == nil then "Sin grupo" else nil)
		ViewUtil.para(card, "El lanzamiento en grupo lleva a los miembros que estén en el portal contigo.", C.TextMuted, 31, 12)
		local loadout = Kit.card(body, "Tu build", 2)
		ViewUtil.para(loadout, string.format("Katana +%d • %s%s • Tónicos x%d", profile.weapons.Katana.upgrade - 1, profile.loadout.primary, if profile.loadout.secondary ~= "" then " + " .. profile.loadout.secondary else "", profile.materials.EmberTonic or 0), C.Text, 1)
		Kit.button({ parent = loadout, text = "Cambiar equipamiento", color = C.PanelLight, order = 2, onClick = function()
			ctx.open("Loadout")
		end })
	end, { "profile", "party" })
end

return View
