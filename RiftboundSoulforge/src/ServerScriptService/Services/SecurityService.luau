--!strict
-- Untrusted-input helpers: token-bucket rate limits, type validation, state checks and
-- bounded diagnostics. Malformed requests are rejected quietly; nobody is kicked for them.

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)

local SecurityService = {}

type Bucket = { tokens: number, last: number }
local buckets: { [Player]: { [string]: Bucket } } = {}
local strikes: { [Player]: { count: number, lastWarn: number } } = {}

function SecurityService.Init() end

function SecurityService.Start()
	Players.PlayerRemoving:Connect(function(player)
		buckets[player] = nil
		strikes[player] = nil
	end)
end

-- Returns true if the player may perform an action in this category now.
function SecurityService.allow(player: Player, category: string): boolean
	local limits = GameConfig.RateLimits[category]
	if not limits then
		return false
	end
	local perPlayer = buckets[player]
	if not perPlayer then
		perPlayer = {}
		buckets[player] = perPlayer
	end
	local now = os.clock()
	local bucket = perPlayer[category]
	if not bucket then
		bucket = { tokens = limits.burst, last = now }
		perPlayer[category] = bucket
	end
	bucket.tokens = math.min(limits.burst, bucket.tokens + (now - bucket.last) * limits.rate)
	bucket.last = now
	if bucket.tokens < 1 then
		SecurityService.flag(player, "rate limit: " .. category)
		return false
	end
	bucket.tokens -= 1
	return true
end

-- Bounded diagnostic logging: counts everything, prints at most every 10s per player.
function SecurityService.flag(player: Player, reason: string)
	local entry = strikes[player]
	if not entry then
		entry = { count = 0, lastWarn = 0 }
		strikes[player] = entry
	end
	entry.count += 1
	if os.clock() - entry.lastWarn > 10 then
		entry.lastWarn = os.clock()
		warn(string.format("[Security] %s (%d): %s [total flags: %d]", player.Name, player.UserId, reason, entry.count))
	end
end

function SecurityService.flagCount(player: Player): number
	local entry = strikes[player]
	return entry and entry.count or 0
end

-- Validators -----------------------------------------------------------------------------

function SecurityService.isFiniteNumber(v: any): boolean
	return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

function SecurityService.isVector3(v: any): boolean
	return typeof(v) == "Vector3"
		and SecurityService.isFiniteNumber(v.X)
		and SecurityService.isFiniteNumber(v.Y)
		and SecurityService.isFiniteNumber(v.Z)
end

-- A direction must be a finite vector with a sane magnitude; returns a flattened unit vector.
function SecurityService.direction(v: any): Vector3?
	if not SecurityService.isVector3(v) then
		return nil
	end
	local flat = Vector3.new(v.X, 0, v.Z)
	if flat.Magnitude < 0.2 or v.Magnitude > 2 then
		return nil
	end
	return flat.Unit
end

function SecurityService.isString(v: any, maxLength: number?): boolean
	return type(v) == "string" and #v <= (maxLength or 64)
end

function SecurityService.isInteger(v: any, min: number, max: number): boolean
	return SecurityService.isFiniteNumber(v) and v % 1 == 0 and v >= min and v <= max
end

-- Character helpers -----------------------------------------------------------------------

function SecurityService.alive(player: Player): (BasePart?, Humanoid?)
	local character = player.Character
	if not character or not character.Parent then
		return nil, nil
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local root = character:FindFirstChild("HumanoidRootPart")
	if not humanoid or not root or humanoid.Health <= 0 then
		return nil, nil
	end
	return root :: BasePart, humanoid
end

function SecurityService.within(player: Player, position: Vector3, maxDistance: number): boolean
	local root = SecurityService.alive(player)
	if not root then
		return false
	end
	return (root.Position - position).Magnitude <= maxDistance
end

-- Clamp an aim point to a maximum range from the player (prevents casting at the far side of the map).
function SecurityService.clampAim(player: Player, point: any, maxRange: number): Vector3?
	local root = SecurityService.alive(player)
	if not root then
		return nil
	end
	if not SecurityService.isVector3(point) then
		return root.Position + root.CFrame.LookVector * math.min(maxRange, 12)
	end
	local offset = point - root.Position
	local flat = Vector3.new(offset.X, 0, offset.Z)
	if flat.Magnitude > maxRange then
		flat = flat.Unit * maxRange
	end
	return root.Position + flat
end

return SecurityService
