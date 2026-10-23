--!strict
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

local NUMBERS = {
	{ key = "cameraShake", label = "Temblor de cámara", min = 0, max = 1, step = 0.25 },
	{ key = "effects", label = "Intensidad de efectos", min = 0.2, max = 1, step = 0.2 },
	{ key = "music", label = "Volumen de música", min = 0, max = 1, step = 0.1 },
	{ key = "sfx", label = "Volumen de efectos", min = 0, max = 1, step = 0.1 },
	{ key = "hudScale", label = "Escala de la interfaz", min = 0.7, max = 1.3, step = 0.1 },
}

local TOGGLES = {
	{ key = "reducedClutter", label = "Menos ruido visual (oculta efectos menores de otros jugadores)" },
	{ key = "highContrastTelegraphs", label = "Avisos de ataque de alto contraste (amarillo brillante)" },
}

local function apply(key: string, value: any)
	local profile = ClientState.profile
	if profile then
		profile.settings[key] = value -- optimistic; the server validates and re-syncs
		ClientState.Changed:Fire("profile")
	end
	ClientState.request("UpdateSettings", { [key] = value }, true)
end

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local s = profile.settings
		local card = Kit.card(body, "Accesibilidad y audio", 1)
		for i, opt in NUMBERS do
			local row = Kit.row(card, i, 40)
			Kit.text({ parent = row, text = string.format("%s: %d%%", opt.label, math.floor(s[opt.key] * 100 + 0.5)), size = UDim2.fromOffset(260, 36), order = 1 })
			Kit.button({ parent = row, text = "−", size = UDim2.fromOffset(44, 34), color = C.PanelLight, order = 2, onClick = function()
				apply(opt.key, math.clamp(s[opt.key] - opt.step, opt.min, opt.max))
			end })
			Kit.button({ parent = row, text = "+", size = UDim2.fromOffset(44, 34), color = C.PanelLight, order = 3, onClick = function()
				apply(opt.key, math.clamp(s[opt.key] + opt.step, opt.min, opt.max))
			end })
		end
		for i, opt in TOGGLES do
			local row = Kit.row(card, 20 + i, 40)
			Kit.button({ parent = row, text = if s[opt.key] then "SÍ" else "NO", size = UDim2.fromOffset(70, 34), color = if s[opt.key] then C.Good else C.PanelLight, order = 1, onClick = function()
				apply(opt.key, not s[opt.key])
			end })
			Kit.text({ parent = row, text = opt.label, size = UDim2.fromOffset(460, 36), order = 2 })
		end
		ViewUtil.para(body, "Los avisos de ataque siempre combinan color con forma, un relleno creciente y un símbolo (! se puede parar, ⚠ no se puede parar, ◎ anillo con centro seguro, ☠ peligro), así que nunca dependen solo del color.", C.TextDim, 2, 13)
	end, { "profile" })
end

return View
