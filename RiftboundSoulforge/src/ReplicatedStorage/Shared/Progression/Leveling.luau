--!strict
-- Pure XP maths shared by server (authoritative) and client (display).

local Leveling = {}

export type Result = { level: number, xp: number, gained: number }

-- Adds xp to (level, xp) using curve(level) = xp needed to go from level to level+1.
function Leveling.add(level: number, xp: number, amount: number, curve: (number) -> number, maxLevel: number): Result
	if amount ~= amount or amount <= 0 or amount == math.huge then
		return { level = level, xp = xp, gained = 0 }
	end
	local startLevel = level
	xp += amount
	while level < maxLevel do
		local need = curve(level)
		if xp < need then
			break
		end
		xp -= need
		level += 1
	end
	if level >= maxLevel then
		level = maxLevel
		xp = 0
	end
	return { level = level, xp = xp, gained = level - startLevel }
end

function Leveling.progress(level: number, xp: number, curve: (number) -> number, maxLevel: number): number
	if level >= maxLevel then
		return 1
	end
	return math.clamp(xp / curve(level), 0, 1)
end

return Leveling
