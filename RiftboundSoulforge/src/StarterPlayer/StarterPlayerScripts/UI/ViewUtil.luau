--!strict
-- Small helpers shared by views: a re-renderable scroll body and paragraph text.

local Kit = require(script.Parent.Kit)
local Theme = require(script.Parent.Theme)
local ClientState = require(script.Parent.Parent.ClientState)
local Costs = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared").Inventory.Costs)
local ItemConfig = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared").Config.ItemConfig)

local C = Theme.Colors
local ViewUtil = {}

-- Creates a scroll body and returns a view object that re-renders via `render(body, profile)`.
function ViewUtil.simple(container: Instance, render: (ScrollingFrame, any) -> (), keys: { string }?)
	local body = Kit.scroll({ parent = container })
	local function draw()
		Kit.clear(body)
		local profile = ClientState.profile
		if not profile then
			Kit.text({ parent = body, text = "Loading your profile...", color = C.TextDim })
			return
		end
		render(body, profile)
	end
	draw()
	return {
		refresh = function(key: string)
			if not keys or table.find(keys, key) then
				draw()
			end
		end,
		destroy = function()
			body:Destroy()
		end,
		redraw = draw,
	}
end

function ViewUtil.para(parent: Instance, text: string, color: Color3?, order: number?, size: number?)
	return Kit.text({
		parent = parent,
		text = text,
		color = color or C.TextDim,
		textSize = size or 14,
		order = order,
		size = UDim2.new(1, 0, 0, 0),
		autoSize = Enum.AutomaticSize.Y,
		rich = true,
	})
end

function ViewUtil.heading(parent: Instance, text: string, order: number?, color: Color3?)
	return Kit.text({ parent = parent, text = text, font = Theme.Fonts.Title, textSize = 20, color = color or C.Text, order = order })
end

local function itemName(key: string): string
	if key == "Coins" then
		return "Coins"
	end
	local def = ItemConfig.Items[key]
	return def and def.name or key
end

-- Requirement lines for a cost table against the current profile.
function ViewUtil.costLines(profile: any, cost: any): { { text: string, met: boolean } }
	local lines = {}
	local keys = {}
	for key in cost do
		table.insert(keys, key)
	end
	table.sort(keys)
	for _, key in keys do
		local have = Costs.have(profile, key)
		table.insert(lines, { text = string.format("%s %d/%d", itemName(key), have, cost[key]), met = have >= cost[key] })
	end
	return lines
end

ViewUtil.itemName = itemName

return ViewUtil
