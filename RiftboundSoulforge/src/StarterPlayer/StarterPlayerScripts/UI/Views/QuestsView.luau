--!strict
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local QuestLogic = require(script.Parent.Parent.QuestLogic)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

local CATEGORY_COLORS = {
	Main = C.Gold,
	Exploration = Color3.fromRGB(150, 220, 255),
	Gathering = Color3.fromRGB(180, 200, 140),
	Mastery = Color3.fromRGB(200, 170, 255),
	Coop = Color3.fromRGB(120, 230, 200),
	Boss = Color3.fromRGB(255, 110, 160),
	Daily = Color3.fromRGB(255, 190, 110),
}

local function rewardText(r: any): string
	local parts = {}
	if r.coins then
		table.insert(parts, r.coins .. " coins")
	end
	if r.xp then
		table.insert(parts, r.xp .. " XP")
	end
	for item, n in r.items or {} do
		table.insert(parts, n .. " " .. ViewUtil.itemName(item))
	end
	if r.essence then
		table.insert(parts, r.essence .. " essence")
	end
	if r.weaponMastery then
		table.insert(parts, r.weaponMastery .. " katana mastery")
	end
	return table.concat(parts, ", ")
end

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local order = 0
		local entries = QuestLogic.entries(profile)
		local sections = {
			{ "Ready to claim", function(e)
				return e.available and e.complete and not e.claimed
			end },
			{ "Active", function(e)
				return e.available and not e.complete
			end },
			{ "Locked", function(e)
				return not e.available
			end },
			{ "Completed", function(e)
				return e.claimed
			end },
		}
		for _, section in sections do
			local list = {}
			for _, e in entries do
				if section[2](e) then
					table.insert(list, e)
				end
			end
			if #list > 0 then
				order += 1
				ViewUtil.heading(body, section[1], order)
				for _, e in list do
					order += 1
					local def = e.def
					local color = CATEGORY_COLORS[def.category] or C.Text
					local card = Kit.card(body, def.title, order, color)
					Kit.chip(card, def.category .. (if e.daily then " • resets daily" else ""), color, 1)
					ViewUtil.para(card, def.description or "", C.TextDim, 2, 13)
					if section[1] == "Locked" then
						ViewUtil.para(card, "Requires: " .. table.concat(def.requires or {}, ", "), C.TextMuted, 3, 12)
					elseif not e.claimed then
						for j, objective in def.objectives do
							local n = math.min(e.counts[j] or 0, objective.count)
							ViewUtil.para(card, string.format("%s %s  %d/%d", if n >= objective.count then "✔" else "•", objective.label, n, objective.count), if n >= objective.count then C.Good else C.Text, 3 + j, 13)
						end
						if def.hint then
							ViewUtil.para(card, "Tip: " .. def.hint, C.TextMuted, 10, 12)
						end
					end
					ViewUtil.para(card, "Rewards: " .. rewardText(def.rewards), C.Gold, 11, 12)
					if e.complete and not e.claimed and e.available then
						Kit.button({ parent = card, text = "Claim reward", color = C.Good, order = 12, onClick = function()
							ClientState.request("ClaimQuest", { id = def.id })
						end })
					end
				end
			end
		end
	end, { "profile" })
end

return View
