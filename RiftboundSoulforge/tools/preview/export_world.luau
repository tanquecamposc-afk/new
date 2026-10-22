-- Runs the real world-generation modules in a stubbed Roblox environment and prints the
-- resulting parts/terrain as JSON (for the Three.js preview renderer).
-- Usage: luau-check test tools/preview/export_world.luau src > world.json

----------------------------------------------------------------- math types
local V3 = {}
V3.__index = function(v, k)
	if k == "Magnitude" then
		return math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z)
	elseif k == "Unit" then
		local m = math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z)
		if m == 0 then
			return Vector3.new(0, 0, 0)
		end
		return Vector3.new(v.X / m, v.Y / m, v.Z / m)
	elseif k == "Dot" then
		return function(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end
	elseif k == "Cross" then
		return function(a, b)
			return Vector3.new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X)
		end
	elseif k == "Lerp" then
		return function(a, b, t) return a + (b - a) * t end
	end
end
V3.__add = function(a, b) return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
V3.__sub = function(a, b) return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
V3.__mul = function(a, b)
	if type(a) == "number" then return Vector3.new(b.X * a, b.Y * a, b.Z * a) end
	if type(b) == "number" then return Vector3.new(a.X * b, a.Y * b, a.Z * b) end
	return Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V3.__div = function(a, b) return Vector3.new(a.X / b, a.Y / b, a.Z / b) end
V3.__unm = function(a) return Vector3.new(-a.X, -a.Y, -a.Z) end
Vector3 = { new = function(x, y, z) return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0, __v3 = true }, V3) end }
Vector3.zero = Vector3.new(0, 0, 0)
Vector3.one = Vector3.new(1, 1, 1)

-- CFrame: position + rotation matrix columns (r = right, u = up, b = back)
local CF = {}
local function cf(p, r, u, b)
	return setmetatable({ p = p, r = r, u = u, b = b }, CF)
end
local function rot(c, v)
	return c.r * v.X + c.u * v.Y + c.b * v.Z
end
CF.__index = function(c, k)
	if k == "Position" then return c.p
	elseif k == "X" then return c.p.X
	elseif k == "Y" then return c.p.Y
	elseif k == "Z" then return c.p.Z
	elseif k == "LookVector" then return -c.b
	elseif k == "UpVector" then return c.u
	elseif k == "RightVector" then return c.r
	elseif k == "Rotation" then return cf(Vector3.zero, c.r, c.u, c.b)
	elseif k == "Lerp" then
		return function(a, b2, t) return cf(a.p:Lerp(b2.p, t), a.r, a.u, a.b) end
	end
end
CF.__mul = function(a, b)
	if getmetatable(b) == V3 then
		return a.p + rot(a, b)
	end
	return cf(a.p + rot(a, b.p), rot(a, b.r), rot(a, b.u), rot(a, b.b))
end
CF.__add = function(a, v) return cf(a.p + v, a.r, a.u, a.b) end
CF.__sub = function(a, v) return cf(a.p - v, a.r, a.u, a.b) end
local X, Y, Z = Vector3.new(1, 0, 0), Vector3.new(0, 1, 0), Vector3.new(0, 0, 1)
CFrame = {}
CFrame.identity = cf(Vector3.zero, X, Y, Z)
function CFrame.new(a, b, c2)
	if a == nil then return CFrame.identity end
	if type(a) == "table" then return cf(a, X, Y, Z) end
	return cf(Vector3.new(a, b, c2), X, Y, Z)
end
local function rx(t) return cf(Vector3.zero, X, Vector3.new(0, math.cos(t), math.sin(t)), Vector3.new(0, -math.sin(t), math.cos(t))) end
local function ry(t) return cf(Vector3.zero, Vector3.new(math.cos(t), 0, -math.sin(t)), Y, Vector3.new(math.sin(t), 0, math.cos(t))) end
local function rz(t) return cf(Vector3.zero, Vector3.new(math.cos(t), math.sin(t), 0), Vector3.new(-math.sin(t), math.cos(t), 0), Z) end
function CFrame.Angles(a, b, c2) return rx(a) * ry(b) * rz(c2) end
CFrame.fromEulerAnglesXYZ = CFrame.Angles
function CFrame.lookAt(at, target, up)
	up = up or Y
	local look = (target - at).Unit
	local right = look:Cross(up)
	if right.Magnitude < 1e-6 then right = look:Cross(Z) end
	right = right.Unit
	local up2 = right:Cross(look).Unit
	return cf(at, right, up2, -look)
end

typeof = function(v)
	local mt = getmetatable(v)
	if mt == V3 then return "Vector3" elseif mt == CF then return "CFrame" end
	return type(v)
end
local C3 = {}
C3.__index = { Lerp = function(a, b, t)
	return Color3.new(a.R + (b.R - a.R) * t, a.G + (b.G - a.G) * t, a.B + (b.B - a.B) * t)
end }
Color3 = {
	new = function(r, g, b) return setmetatable({ R = r, G = g, B = b }, C3) end,
	fromRGB = function(r, g, b) return setmetatable({ R = r / 255, G = g / 255, B = b / 255 }, C3) end,
	fromHSV = function(h, s, v)
		local i = math.floor(h * 6)
		local f = h * 6 - i
		local p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
		local m = i % 6
		local r, g, b
		if m == 0 then r, g, b = v, t, p elseif m == 1 then r, g, b = q, v, p elseif m == 2 then r, g, b = p, v, t
		elseif m == 3 then r, g, b = p, q, v elseif m == 4 then r, g, b = t, p, v else r, g, b = v, p, q end
		return setmetatable({ R = r, G = g, B = b }, C3)
	end,
}

local function dummyCtor() return { new = function(...) return { ... } end, fromOffset = function(...) return { ... } end, fromScale = function(...) return { ... } end } end
UDim2, UDim, Vector2, NumberRange, NumberSequence, NumberSequenceKeypoint, ColorSequence, TweenInfo = dummyCtor(), dummyCtor(), dummyCtor(), dummyCtor(), dummyCtor(), dummyCtor(), dummyCtor(), dummyCtor()
Vector2.new = function(x, y) return { X = x or 0, Y = y or 0 } end
Vector2.zero = Vector2.new(0, 0)

Enum = setmetatable({}, { __index = function(_, t)
	return setmetatable({}, { __index = function(_, item) return item end })
end })

local RNG = {}
RNG.__index = RNG
function RNG:NextNumber(a, b)
	self.s = (self.s * 1103515245 + 12345) % 2147483648
	local f = self.s / 2147483648
	if a == nil then return f end
	return a + (b - a) * f
end
function RNG:NextInteger(a, b) return math.floor(self:NextNumber(a, b + 1)) end
Random = { new = function(seed) return setmetatable({ s = seed or 1 }, RNG) end }

----------------------------------------------------------------- Instances
local INST = {}
local BASEPART = { Part = true, WedgePart = true, CornerWedgePart = true, SpawnLocation = true }
local function newInstance(class)
	local o = { ClassName = class, Name = class, _children = {}, _attrs = {}, _parent = nil }
	if BASEPART[class] then
		o.Size = Vector3.new(4, 1, 2)
		o.CFrame = CFrame.identity
		o.Color = Color3.fromRGB(163, 162, 165)
		o.Material = "Plastic"
		o.Transparency = 0
		o.Shape = "Block"
	end
	return setmetatable(o, INST)
end
local function isA(o, class)
	if o.ClassName == class then return true end
	if class == "BasePart" then return BASEPART[o.ClassName] == true end
	if class == "Instance" then return true end
	if class == "GuiObject" then return o.ClassName == "TextLabel" or o.ClassName == "Frame" end
	return false
end
local methods = {}
function methods.GetChildren(o) return table.clone(o._children) end
function methods.GetDescendants(o)
	local out = {}
	local function walk(n) for _, c in n._children do table.insert(out, c); walk(c) end end
	walk(o)
	return out
end
function methods.FindFirstChild(o, name, rec)
	for _, c in o._children do if c.Name == name then return c end end
	if rec then for _, c in o._children do local f = methods.FindFirstChild(c, name, true) if f then return f end end end
	return nil
end
methods.WaitForChild = methods.FindFirstChild
function methods.FindFirstChildWhichIsA(o, class, rec)
	for _, c in o._children do if isA(c, class) then return c end end
	if rec then for _, c in o._children do local f = methods.FindFirstChildWhichIsA(c, class, true) if f then return f end end end
	return nil
end
function methods.FindFirstChildOfClass(o, class) for _, c in o._children do if c.ClassName == class then return c end end return nil end
function methods.IsA(o, class) return isA(o, class) end
function methods.SetAttribute(o, k, v) o._attrs[k] = v end
function methods.GetAttribute(o, k) return o._attrs[k] end
function methods.SetStateEnabled() end
function methods.Destroy(o) o.Parent = nil end
function methods.Clone(o)
	local c = newInstance(o.ClassName)
	for k, v in o do if k ~= "_children" and k ~= "_parent" and k ~= "_attrs" then rawset(c, k, v) end end
	for _, ch in o._children do local cc = methods.Clone(ch); cc.Parent = c end
	return c
end
function methods.GetPivot(o) return o.PrimaryPart and o.PrimaryPart.CFrame or CFrame.identity end
INST.__index = function(o, k)
	if k == "Parent" then return rawget(o, "_parent") end
	if methods[k] then return methods[k] end
	local child = methods.FindFirstChild(o, k)
	if child then return child end
	return nil
end
INST.__newindex = function(o, k, v)
	if k == "Parent" then
		local old = rawget(o, "_parent")
		if old then
			local i = table.find(old._children, o)
			if i then table.remove(old._children, i) end
		end
		rawset(o, "_parent", v)
		if v then table.insert(v._children, o) end
		return
	end
	rawset(o, k, v)
end
Instance = { new = newInstance }

----------------------------------------------------------------- services
local fills = {}
local materialColors = {}
local terrain = newInstance("Terrain")
terrain.Name = "Terrain"
function terrain:FillBlock(c, size, mat) table.insert(fills, { k = "block", cf = c, size = size, mat = mat }) end
function terrain:FillBall(center, r, mat) table.insert(fills, { k = "ball", p = center, r = r, mat = mat }) end
function terrain:FillCylinder(c, h, r, mat) table.insert(fills, { k = "cyl", cf = c, h = h, r = r, mat = mat }) end
function terrain:SetMaterialColor(mat, color) materialColors[mat] = color end
workspace = newInstance("Workspace")
terrain.Parent = workspace
local lighting = newInstance("Lighting")
game = { GetService = function(_, name)
	if name == "ReplicatedStorage" then return ROOT.ReplicatedStorage end
	if name == "Workspace" then return workspace end
	if name == "Lighting" then return lighting end
	return newInstance(name)
end }

----------------------------------------------------------------- build the real world
local Server = ROOT.ServerScriptService
local Build = require(Server.World.Build)
local Nexus = require(Server.World.Nexus)
local Emberfall = require(Server.World.Emberfall)
local Models = require(Server.World.Models)
local TerrainGen = require(Server.World.TerrainGen)
local WorldConfig = require(ROOT.ReplicatedStorage.Shared.Config.WorldConfig)
local EnemyConfig = require(ROOT.ReplicatedStorage.Shared.Config.EnemyConfig)
local ResourceConfig = require(ROOT.ReplicatedStorage.Shared.Config.ResourceConfig)

local world = Build.folder(workspace, "World")
Nexus.build(world)
Emberfall.build(world)
TerrainGen.build(world)

local extras = Build.folder(workspace, "Extras")
for _, s in WorldConfig.Spawners do
	local model = Models.enemy(EnemyConfig.Enemies[s.archetype], s.position)
	model.Parent = extras
end
local warden = Models.warden(WorldConfig.Arena.center + Vector3.new(0, 0, -20))
warden.Parent = extras
local resources = Build.folder(workspace, "Resources")
for _, n in WorldConfig.Nodes do
	Models.node(ResourceConfig.Nodes[n.node], n.position, resources)
end

-- A blocky R15-style adventurer holding the katana (stands in for a player avatar).
local function avatar(position, facing, shirt, pants)
	local model = Build.model(extras, "Avatar")
	local base = CFrame.lookAt(position, position + facing)
	local skin = Color3.fromRGB(234, 184, 146)
	local function p(name, size, off, color)
		local part = Build.part(model, { size = size, cframe = base * off, color = color, material = Enum.Material.SmoothPlastic, name = name })
		return part
	end
	p("LeftLeg", Vector3.new(1, 2, 1), CFrame.new(-0.5, 1, 0), pants)
	p("RightLeg", Vector3.new(1, 2, 1), CFrame.new(0.5, 1, 0), pants)
	p("Torso", Vector3.new(2, 2, 1), CFrame.new(0, 3, 0), shirt)
	p("Belt", Vector3.new(2.05, 0.3, 1.05), CFrame.new(0, 2.15, 0), Color3.fromRGB(40, 30, 30))
	p("LeftArm", Vector3.new(1, 2, 1), CFrame.new(-1.5, 3, 0), shirt)
	local hand = p("RightArm", Vector3.new(1, 2, 1), CFrame.new(1.5, 3, 0) , shirt)
	hand.Name = "RightHand"
	p("Head", Vector3.new(1.2, 1.2, 1.2), CFrame.new(0, 4.6, 0), skin)
	p("Hair", Vector3.new(1.3, 0.5, 1.3), CFrame.new(0, 5.25, 0.05), Color3.fromRGB(30, 26, 40))
	-- Models.katana grips relative to RightHand: R15 hands hang at the arm bottom
	local handPart = Build.part(model, { size = Vector3.new(0.9, 0.4, 0.9), cframe = base * CFrame.new(1.5, 2.0, 0), color = skin, name = "RightHand" })
	hand.Name = "RightArmUpper"
	Models.katana(model, Color3.fromRGB(110, 230, 255))
	return model, handPart
end
local E = WorldConfig.EmberfallOrigin
avatar(WorldConfig.Points.NexusSpawn + Vector3.new(0, -3, -6), Vector3.new(0, 0, -1), Color3.fromRGB(60, 70, 140), Color3.fromRGB(40, 40, 60))
avatar(E + Vector3.new(104, 0, -8), Vector3.new(0, 0, -1), Color3.fromRGB(150, 50, 50), Color3.fromRGB(40, 36, 50))
avatar(WorldConfig.Arena.center + Vector3.new(-8, 0, 6), Vector3.new(0.3, 0, -1).Unit, Color3.fromRGB(60, 120, 90), Color3.fromRGB(40, 40, 60))
avatar(WorldConfig.Arena.center + Vector3.new(10, 0, 8), Vector3.new(-0.3, 0, -1).Unit, Color3.fromRGB(150, 110, 40), Color3.fromRGB(50, 40, 40))

----------------------------------------------------------------- JSON out
local function num(n) return string.format("%.3f", n) end
local function color(c) return string.format("[%s,%s,%s]", num(c.R), num(c.G), num(c.B)) end
local function mat3(c)
	return string.format("[%s,%s,%s,%s,%s,%s,%s,%s,%s]", num(c.r.X), num(c.r.Y), num(c.r.Z), num(c.u.X), num(c.u.Y), num(c.u.Z), num(c.b.X), num(c.b.Y), num(c.b.Z))
end
local function esc(s) return (string.gsub(s, '[%c"\\]', function(ch) return string.format("\\u%04x", string.byte(ch)) end)) end

local out = {}
local function emitParts(container)
	for _, o in methods.GetDescendants(container) do
		if isA(o, "BasePart") and (o.Transparency or 0) < 0.99 then
			local text, textColor, face = "", nil, ""
			local gui = methods.FindFirstChildOfClass(o, "SurfaceGui")
			if gui then
				local label = methods.FindFirstChildOfClass(gui, "TextLabel")
				if label then
					text = label.Text or ""
					textColor = label.TextColor3
					face = tostring(gui.Face or "Front")
				end
			end
			local light = methods.FindFirstChildOfClass(o, "PointLight")
			table.insert(out, string.format(
				'{"n":"%s","c":"%s","s":"%s","sz":[%s,%s,%s],"p":[%s,%s,%s],"m":%s,"col":%s,"mat":"%s","t":%s%s%s}',
				esc(o.Name), o.ClassName, tostring(o.Shape or "Block"),
				num(o.Size.X), num(o.Size.Y), num(o.Size.Z),
				num(o.CFrame.p.X), num(o.CFrame.p.Y), num(o.CFrame.p.Z),
				mat3(o.CFrame), color(o.Color), tostring(o.Material), num(o.Transparency or 0),
				if text ~= "" then string.format(',"txt":"%s","tc":%s,"face":"%s"', esc(text), color(textColor or Color3.new(1, 1, 1)), face) else "",
				if light then string.format(',"light":{"c":%s,"r":%s,"b":%s}', color(light.Color), num(light.Range), num(light.Brightness)) else ""
			))
		end
	end
end
emitParts(workspace)
local tf = {}
for _, f in fills do
	if f.k == "ball" then
		table.insert(tf, string.format('{"k":"ball","p":[%s,%s,%s],"r":%s,"mat":"%s"}', num(f.p.X), num(f.p.Y), num(f.p.Z), num(f.r), f.mat))
	elseif f.k == "block" then
		table.insert(tf, string.format('{"k":"block","p":[%s,%s,%s],"m":%s,"sz":[%s,%s,%s],"mat":"%s"}', num(f.cf.p.X), num(f.cf.p.Y), num(f.cf.p.Z), mat3(f.cf), num(f.size.X), num(f.size.Y), num(f.size.Z), f.mat))
	else
		table.insert(tf, string.format('{"k":"cyl","p":[%s,%s,%s],"m":%s,"h":%s,"r":%s,"mat":"%s"}', num(f.cf.p.X), num(f.cf.p.Y), num(f.cf.p.Z), mat3(f.cf), num(f.h), num(f.r), f.mat))
	end
end
local mc = {}
for k, v in materialColors do table.insert(mc, string.format('"%s":%s', k, color(v))) end
print('JSONSTART{"parts":[' .. table.concat(out, ",") .. '],"terrain":[' .. table.concat(tf, ",") .. '],"terrainColors":{' .. table.concat(mc, ",") .. '}}JSONEND')
return 0
