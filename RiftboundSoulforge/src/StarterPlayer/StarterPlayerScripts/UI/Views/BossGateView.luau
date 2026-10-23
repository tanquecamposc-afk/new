--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local BossConfig = require(Shared.Config.BossConfig)
local DiscoveryConfig = require(Shared.Config.DiscoveryConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local def = BossConfig.FractureWarden
		local card = Kit.card(body, def.displayName .. " — " .. def.title, 1, Color3.fromRGB(255, 70, 140))
		ViewUtil.para(card, def.lore, C.TextDim, 1)
		ViewUtil.para(card, "Ubicación: la Arena de la Fractura, tras la Fortaleza en Ruinas (profundidad 3). Rompe el Sello de la Fractura; la arena se cierra 10 segundos después con todos dentro.", C.Text, 2)
		for i, phase in def.phases do
			ViewUtil.para(card, string.format("Fase %d — %s (desde %d%% de salud)", phase.id, phase.name, math.floor(phase.threshold * 100)), C.Warn, 2 + i, 13)
		end
		ViewUtil.para(card, "Escala con el tamaño del grupo. Las recompensas van a todos los que contribuyeron (daño, paradas, interrupciones o Brechas).", C.TextDim, 10, 13)
		local intel = Kit.card(body, "Tu información", 2)
		for i, key in { "WardenLanceWeakness", "WardenBackCrystal" } do
			local d = DiscoveryConfig.Discoveries[key]
			local found = profile.codex.discoveries[key] ~= nil
			ViewUtil.para(intel, if found then "◆ " .. d.text else "◇ " .. d.hint, if found then C.Good else C.TextMuted, i)
		end
		local record = profile.bosses.FractureWarden
		ViewUtil.para(intel, string.format("Victorias: %d", record.clears), C.Gold, 5)
		local shortcut = Kit.card(body, "Atajo de la Puerta del Celador", 3, C.Accent)
		ViewUtil.para(shortcut, "Los veteranos pueden ir directos a la Antesala del Celador (profundidad 3 — tu Mochila corre riesgo allí).", C.TextDim, 1)
		local b = Kit.button({ parent = shortcut, text = "Cruza la puerta", color = Color3.fromRGB(255, 70, 140), order = 2, size = UDim2.fromOffset(240, 38), onClick = function()
			local ok = ClientState.request("WardenShortcut", {})
			if ok then
				ctx.close()
			end
		end })
		b.setEnabled(record.clears > 0, if record.clears == 0 then "Derrota al Celador una vez para desbloquear" else nil)
	end, { "profile" })
end

return View
