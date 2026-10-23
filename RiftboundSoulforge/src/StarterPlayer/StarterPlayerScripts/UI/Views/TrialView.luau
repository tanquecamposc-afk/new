--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local TrialConfig = require(Shared.Config.TrialConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local def = TrialConfig.Trials.KatanaTrial
		local card = Kit.card(body, def.displayName, 1, Color3.fromRGB(120, 230, 255))
		ViewUtil.para(card, def.description, C.TextDim, 1)
		ViewUtil.para(card, string.format("Límite de tiempo: %ds. Salir de la arena o caer hace fallar la prueba (reintenta cuando quieras, sin coste).", def.timeLimit), C.Text, 2)
		for i, o in def.objectives do
			ViewUtil.para(card, "• " .. o.label .. (if o.count > 1 then " x" .. o.count else ""), C.Text, 2 + i)
		end
		ViewUtil.para(card, "Recompensa: " .. def.reward, C.Gold, 10)
		local mastery = profile.weapons[def.weapon].mastery
		local done = profile.trials[def.id] ~= nil
		Kit.requirements(card, { { text = "Maestría de katana " .. def.masteryRequired .. " (ahora " .. mastery .. ")", met = mastery >= def.masteryRequired } }, 11)
		if done then
			ViewUtil.para(card, "✔ Completado. Puedes repetirlo para practicar.", C.Good, 12)
		end
		if ClientState.trial then
			Kit.button({ parent = card, text = "Abandonar prueba", color = C.Bad, order = 20, onClick = function()
				ClientState.request("AbandonTrial", {})
			end })
		else
			local b = Kit.button({ parent = card, text = "Iniciar el Duelo del Eco", color = Color3.fromRGB(120, 230, 255), textColor = Color3.new(0, 0, 0), size = UDim2.fromOffset(240, 40), order = 20, onClick = function()
				local ok = ClientState.request("StartTrial", { id = def.id })
				if ok then
					ctx.close()
				end
			end })
			b.setEnabled(mastery >= def.masteryRequired, if mastery < def.masteryRequired then "Maestría insuficiente" else nil)
		end
	end, { "profile", "trial" })
end

return View
