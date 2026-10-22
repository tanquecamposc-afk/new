--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local ItemConfig = require(Shared.Config.ItemConfig)
local ResourceConfig = require(Shared.Config.ResourceConfig)
local Format = require(Shared.Util.Format)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local bank = Kit.card(body, "Bank (permanent)", 1, C.Gold)
		ViewUtil.para(bank, string.format("<font color=\"#ffcd6e\"><b>◆ %s coins</b></font>", Format.number(profile.coins)), C.Text, 1, 16)
		for i, id in ItemConfig.Order do
			local def = ItemConfig.Items[id]
			local row = Kit.row(bank, 10 + i, 0)
			Kit.chip(row, def.rarity, def.color, 1)
			Kit.text({ parent = row, text = string.format("%s  x%d", def.name, profile.materials[id] or 0), font = Theme.Fonts.Bold, textSize = 15, size = UDim2.fromOffset(240, 24), order = 2, wrap = false })
			ViewUtil.para(bank, def.description, C.TextDim, 10 + i, 12)
		end
		local tool = Kit.card(body, "Tools", 2)
		ViewUtil.para(tool, "Mining pick: <b>" .. (ResourceConfig.ToolTiers[profile.tools.pickTier] or "?") .. "</b> (tier " .. profile.tools.pickTier .. ")", C.Text, 1)
		local e = ClientState.expedition
		local satchel = Kit.card(body, "Satchel (unbanked expedition loot)", 3, C.Warn)
		local any = false
		if e and e.satchel then
			if e.satchel.coins > 0 then
				any = true
				ViewUtil.para(satchel, "◆ " .. e.satchel.coins .. " coins", C.Text, 1)
			end
			for i, id in ItemConfig.Order do
				local n = e.satchel.items[id]
				if n and n > 0 then
					any = true
					ViewUtil.para(satchel, ItemConfig.Items[id].name .. " x" .. n, C.Text, 1 + i)
				end
			end
		end
		if not any then
			ViewUtil.para(satchel, "Empty.", C.TextDim, 1)
		end
		ViewUtil.para(satchel, "Bank the Satchel at an Extraction Beacon. Dying in Emberfall loses part of it.", C.Warn, 50, 12)
	end, { "profile", "expedition" })
end

return View
