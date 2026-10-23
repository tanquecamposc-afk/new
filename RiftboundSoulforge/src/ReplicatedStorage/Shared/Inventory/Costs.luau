--!strict
-- Pure helpers for cost checks. "Coins" is a pseudo-item mapped to profile.coins.

local ItemConfig = require(script.Parent.Parent.Config.ItemConfig)

local Costs = {}

-- Player-facing name for a cost key.
function Costs.label(key: string): string
	if key == "Coins" then
		return "monedas"
	end
	local def = ItemConfig.Items[key]
	return if def then def.name else key
end

export type Cost = { [string]: number }

function Costs.have(profile: any, key: string): number
	if key == "Coins" then
		return profile.coins or 0
	end
	return (profile.materials and profile.materials[key]) or 0
end

function Costs.canAfford(profile: any, cost: Cost): (boolean, { string })
	local missing = {}
	for key, amount in cost do
		local have = Costs.have(profile, key)
		if have < amount then
			table.insert(missing, string.format("%s (%d/%d)", Costs.label(key), have, amount))
		end
	end
	table.sort(missing)
	return #missing == 0, missing
end

-- Mutates the profile. Callers must check canAfford first (done inside for safety).
function Costs.spend(profile: any, cost: Cost): boolean
	if not Costs.canAfford(profile, cost) then
		return false
	end
	for key, amount in cost do
		if key == "Coins" then
			profile.coins -= amount
		else
			profile.materials[key] -= amount
		end
	end
	return true
end

function Costs.describe(cost: Cost): string
	local parts = {}
	for key, amount in cost do
		table.insert(parts, string.format("%d %s", amount, Costs.label(key)))
	end
	table.sort(parts)
	return table.concat(parts, ", ")
end

return Costs
