-- Stubs minimos de Roblox para ejecutar los modulos con el CLI de Luau.
local M = {}

-- Vector3 -------------------------------------------------------------
local Vector3mt = {}
Vector3mt.__index = function(self, key)
	if key == "Magnitude" then
		return math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2)
	elseif key == "Unit" then
		local m = math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2)
		if m == 0 then m = 1 end
		return M.Vector3.new(self.X / m, self.Y / m, self.Z / m)
	end
	return rawget(Vector3mt, key)
end
Vector3mt.__add = function(a, b) return M.Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
Vector3mt.__sub = function(a, b) return M.Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
Vector3mt.__mul = function(a, b)
	if type(b) == "number" then return M.Vector3.new(a.X * b, a.Y * b, a.Z * b) end
	return M.Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
Vector3mt.__tostring = function(v) return `({v.X}, {v.Y}, {v.Z})` end

M.Vector3 = {}
function M.Vector3.new(x, y, z)
	return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, Vector3mt)
end
M.Vector3.zero = M.Vector3.new(0, 0, 0)
M.Vector3.one = M.Vector3.new(1, 1, 1)

-- Random --------------------------------------------------------------
M.Random = {}
function M.Random.new(seed)
	local state = { s = seed or 1 }
	function state:NextNumber(a, b)
		local r = math.random()
		if a and b then return a + r * (b - a) end
		return r
	end
	function state:NextInteger(a, b) return math.random(a, b) end
	return state
end

-- task ----------------------------------------------------------------
M.task = {
	spawn = function(fn, ...) fn(...) end,
	defer = function(fn, ...) fn(...) end,
	delay = function(_, _) end,
	wait = function(_) return 0 end,
	cancel = function(_) end,
}

-- typeof --------------------------------------------------------------
function M.typeof(value)
	local t = type(value)
	if t == "table" then
		if getmetatable(value) == Vector3mt then return "Vector3" end
		return "table"
	end
	return t
end

-- Servicios -----------------------------------------------------------
local function newSignal()
	local signal = {}
	function signal:Connect(fn)
		return { Connected = true, Disconnect = function(self) self.Connected = false end, _fn = fn }
	end
	return signal
end

local function newInstanceStub(className, name)
	local inst = {
		ClassName = className,
		Name = name or className,
		Parent = nil,
		_children = {},
		_attributes = {},
	}
	function inst:FindFirstChild(childName) return self._children[childName] end
	function inst:WaitForChild(childName) return self._children[childName] end
	function inst:FindFirstChildOfClass() return nil end
	function inst:FindFirstChildWhichIsA() return nil end
	function inst:GetChildren()
		local out = {}
		for _, child in self._children do table.insert(out, child) end
		return out
	end
	function inst:GetDescendants() return {} end
	function inst:IsA(class) return self.ClassName == class end
	function inst:SetAttribute(key, value) self._attributes[key] = value end
	function inst:GetAttribute(key) return self._attributes[key] end
	function inst:Destroy() self.Parent = nil end
	function inst:IsDescendantOf() return true end
	inst.AncestryChanged = newSignal()
	inst.Changed = newSignal()
	return inst
end
M.newInstanceStub = newInstanceStub

local services = {}
local function service(className, extra)
	local s = newInstanceStub(className, className)
	for key, value in extra or {} do s[key] = value end
	services[className] = s
	return s
end

service("ReplicatedStorage")
service("RunService", {
	IsServer = function() return true end,
	IsClient = function() return false end,
	IsStudio = function() return false end,
	IsRunning = function() return false end,
	Heartbeat = newSignal(),
	RenderStepped = newSignal(),
})
service("Players", {
	GetPlayers = function() return {} end,
	GetPlayerByUserId = function() return nil end,
	PlayerAdded = newSignal(),
	PlayerRemoving = newSignal(),
})
local guidCounter = 0
service("HttpService", {
	GenerateGUID = function()
		guidCounter += 1
		return `GUID-{guidCounter}`
	end,
})
service("CollectionService", {
	AddTag = function() end,
	GetTagged = function() return {} end,
})
service("Debris", { AddItem = function() end })
service("TeleportService", {})
service("Workspace", {})
service("TweenService", {})
service("ContextActionService", {})
service("UserInputService", {})

M.game = {
	PrivateServerId = "",
	PrivateServerOwnerId = 0,
	GetService = function(_, name)
		local s = services[name]
		if not s then s = service(name) end
		return s
	end,
	BindToClose = function() end,
}
M.services = services

M.Instance = {
	new = function(className) return newInstanceStub(className) end,
}

return M
