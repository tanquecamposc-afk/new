-- Minimal Roblox-like environment for testing pure modules outside Roblox.

-- Vector3 stub -------------------------------------------------------------------------
local V = {}
V.__index = function(v, key)
	if key == "Magnitude" then
		return math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z)
	elseif key == "Unit" then
		local m = math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z)
		return Vector3.new(v.X / m, v.Y / m, v.Z / m)
	elseif key == "Dot" then
		return function(a, b)
			return a.X * b.X + a.Y * b.Y + a.Z * b.Z
		end
	elseif key == "Lerp" then
		return function(a, b, t)
			return a + (b - a) * t
		end
	end
	return nil
end
V.__add = function(a, b)
	return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z)
end
V.__sub = function(a, b)
	return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
end
V.__mul = function(a, b)
	if type(a) == "number" then
		return Vector3.new(b.X * a, b.Y * a, b.Z * a)
	elseif type(b) == "number" then
		return Vector3.new(a.X * b, a.Y * b, a.Z * b)
	end
	return Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V.__div = function(a, b)
	return Vector3.new(a.X / b, a.Y / b, a.Z / b)
end
V.__unm = function(a)
	return Vector3.new(-a.X, -a.Y, -a.Z)
end
V.__eq = function(a, b)
	return a.X == b.X and a.Y == b.Y and a.Z == b.Z
end
V.__tostring = function(a)
	return string.format("Vector3(%g, %g, %g)", a.X, a.Y, a.Z)
end
Vector3 = {
	new = function(x, y, z)
		return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V)
	end,
}
Vector3.zero = Vector3.new(0, 0, 0)
Vector3.one = Vector3.new(1, 1, 1)

Color3 = {
	fromRGB = function(r, g, b)
		return { R = r / 255, G = g / 255, B = b / 255, __color = true }
	end,
	new = function(r, g, b)
		return { R = r, G = g, B = b, __color = true }
	end,
	fromHSV = function(h, s, v)
		return { H = h, S = s, V = v, __color = true }
	end,
}

typeof = function(v)
	if type(v) == "table" and getmetatable(v) == V then
		return "Vector3"
	end
	return type(v)
end

-- Fake instance tree over the filesystem ----------------------------------------------------
local Node = {}
local cache = {}

local function node(path, name, parent, file)
	return setmetatable({ __path = path, __name = name, __parent = parent, __file = file, Name = name }, Node)
end

Node.__index = function(self, key)
	if key == "Parent" then
		return rawget(self, "__parent")
	end
	if key == "WaitForChild" or key == "FindFirstChild" then
		return function(this, childName)
			return this[childName]
		end
	end
	local path = rawget(self, "__path")
	local dir = path .. "/" .. key
	if __isdir(dir) then
		local child = node(dir, key, self, nil)
		rawset(self, key, child)
		return child
	end
	for _, ext in ipairs({ ".luau", ".lua" }) do
		if __isfile(dir .. ext) then
			local child = node(dir, key, self, dir .. ext)
			rawset(self, key, child)
			return child
		end
	end
	error("no child '" .. tostring(key) .. "' under " .. path, 2)
end

local realRequire = require
function require(target)
	if type(target) ~= "table" or not rawget(target, "__file") then
		return realRequire(target)
	end
	local file = rawget(target, "__file")
	if cache[file] ~= nil then
		return cache[file]
	end
	local src = __readfile(file)
	local env = setmetatable({ script = target }, { __index = _G })
	local chunk = __loadchunk(src, file, env)
	local result = chunk()
	cache[file] = result
	return result
end

ROOT = node(__SRC_ROOT, "src", nil, nil)

-- Tiny test framework --------------------------------------------------------------------------
local results = { passed = 0, failed = 0 }
function test(name, fn)
	local ok, err = pcall(fn)
	if ok then
		results.passed += 1
		print("  ok   " .. name)
	else
		results.failed += 1
		print("  FAIL " .. name .. "\n       " .. tostring(err))
	end
end
function expect(cond, message)
	if not cond then
		error(message or "expectation failed", 2)
	end
end
function eq(a, b, message)
	if a ~= b then
		error(string.format("%s: expected %s, got %s", message or "eq", tostring(b), tostring(a)), 2)
	end
end
function finish()
	print(string.format("\n%d passed, %d failed", results.passed, results.failed))
	return results.failed
end
