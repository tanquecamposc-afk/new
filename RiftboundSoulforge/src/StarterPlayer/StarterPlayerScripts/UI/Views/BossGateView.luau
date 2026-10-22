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
		ViewUtil.para(card, "Location: the Fracture Arena, beyond the Ruined Keep (depth 3). Break the Fracture Seal; the arena locks 10 seconds later with everyone inside.", C.Text, 2)
		for i, phase in def.phases do
			ViewUtil.para(card, string.format("Phase %d — %s (from %d%% health)", phase.id, phase.name, math.floor(phase.threshold * 100)), C.Warn, 2 + i, 13)
		end
		ViewUtil.para(card, "Scales with party size. Rewards go to everyone who contributed (damage, parries, interrupts or Breaches).", C.TextDim, 10, 13)
		local intel = Kit.card(body, "Your intel", 2)
		for i, key in { "WardenLanceWeakness", "WardenBackCrystal" } do
			local d = DiscoveryConfig.Discoveries[key]
			local found = profile.codex.discoveries[key] ~= nil
			ViewUtil.para(intel, if found then "◆ " .. d.text else "◇ " .. d.hint, if found then C.Good else C.TextMuted, i)
		end
		local record = profile.bosses.FractureWarden
		ViewUtil.para(intel, string.format("Clears: %d", record.clears), C.Gold, 5)
		local shortcut = Kit.card(body, "Warden Gate shortcut", 3, C.Accent)
		ViewUtil.para(shortcut, "Veterans can step straight to the Warden's Approach (depth 3 — your Satchel is at risk there).", C.TextDim, 1)
		local b = Kit.button({ parent = shortcut, text = "Step through the gate", color = Color3.fromRGB(255, 70, 140), order = 2, size = UDim2.fromOffset(240, 38), onClick = function()
			local ok = ClientState.request("WardenShortcut", {})
			if ok then
				ctx.close()
			end
		end })
		b.setEnabled(record.clears > 0, if record.clears == 0 then "Defeat the Warden once to unlock" else nil)
	end, { "profile" })
end

return View
