--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Format = require(Shared.Util.Format)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

local LABELS = {
	{ "kills", "Enemies defeated" },
	{ "bossKills", "Fracture Wardens defeated" },
	{ "perfectParries", "Perfect parries" },
	{ "dodges", "Telegraphs dodged" },
	{ "awakenings", "Awakenings" },
	{ "fusionsCast", "Fusions cast" },
	{ "coopCombos", "Co-op resonances" },
	{ "oreMined", "Ore mined" },
	{ "crafts", "Items crafted" },
	{ "extractions", "Extractions" },
	{ "lootLost", "Times loot was lost" },
	{ "deaths", "Deaths" },
}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local card = Kit.card(body, "Lifetime statistics", 1)
		ViewUtil.para(card, string.format("Level %d  •  %s coins  •  play time %s", profile.level, Format.number(profile.coins), Format.time(profile.stats.playTime)), C.Text, 0, 15)
		for i, entry in LABELS do
			ViewUtil.para(card, entry[2] .. ": <b>" .. tostring(profile.stats[entry[1]] or 0) .. "</b>", C.TextDim, i, 14)
		end
		local meta = ClientState.meta
		local data = Kit.card(body, "Save status", 2)
		if meta and meta.state == "Loaded" then
			ViewUtil.para(data, "Progress is saved automatically (every 2 minutes, on leave and on server shutdown).", C.Good, 1)
		else
			ViewUtil.para(data, "Progress is NOT being saved: " .. tostring(meta and meta.reason or "loading"), C.Bad, 1)
		end
	end, { "profile" })
end

return View
