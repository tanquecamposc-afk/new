local Config = require(script.Parent.Config)
local AnomalyData = require(script.Parent.AnomalyData)

local Util = {}

local SUFFIXES = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx" }

function Util.Format(n)
	n = math.floor(tonumber(n) or 0)
	if math.abs(n) < 1000 then
		return tostring(n)
	end
	local i = 1
	local v = n
	while math.abs(v) >= 1000 and i < #SUFFIXES do
		v = v / 1000
		i += 1
	end
	if math.abs(v) >= 100 then
		return string.format("%d%s", math.floor(v), SUFFIXES[i])
	end
	return string.format("%.1f%s", math.floor(v * 10) / 10, SUFFIXES[i])
end

function Util.Money(n)
	return "$" .. Util.Format(n)
end

function Util.Time(sec)
	sec = math.max(0, math.floor(sec))
	return string.format("%d:%02d", math.floor(sec / 60), sec % 60)
end

function Util.MutMult(mutId)
	local m = mutId and Config.MutationById[mutId]
	return m and m.Mult or 1
end

-- Valor y producción de un registro {Id, Mut}
function Util.Value(record)
	local def = AnomalyData.ById[record.Id]
	if not def then
		return 0
	end
	return def.Price * Util.MutMult(record.Mut)
end

function Util.Income(record)
	local def = AnomalyData.ById[record.Id]
	if not def then
		return 0
	end
	return def.Income * Util.MutMult(record.Mut)
end

function Util.DisplayName(record)
	local def = AnomalyData.ById[record.Id]
	local name = def and def.Name or "???"
	local m = record.Mut and Config.MutationById[record.Mut]
	if m then
		return m.Name .. " " .. name
	end
	return name
end

function Util.WeightedPick(list, weightKey, rng)
	local total = 0
	for _, item in ipairs(list) do
		total += item[weightKey]
	end
	local roll = (rng and rng:NextNumber() or math.random()) * total
	for _, item in ipairs(list) do
		roll -= item[weightKey]
		if roll <= 0 then
			return item
		end
	end
	return list[#list]
end

return Util
