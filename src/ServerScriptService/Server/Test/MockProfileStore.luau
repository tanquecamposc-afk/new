--!strict
--[[
	MockProfileStore.luau
	Implementacion minima y compatible con la interfaz de ProfileService que se
	usa cuando la libreria real no esta instalada (CI, pruebas, Studio limpio).
	Replica session locking dentro del mismo proceso para que las pruebas de
	integracion ejerciten las mismas rutas de codigo.
]]

local MockProfileStore = {}
MockProfileStore.__index = MockProfileStore

local MockProfile = {}
MockProfile.__index = MockProfile

local function deepCopy<T>(value: T): T
	if typeof(value) ~= "table" then
		return value
	end
	local copy = {}
	for key, inner in value :: any do
		copy[key] = deepCopy(inner)
	end
	return copy :: any
end

function MockProfile.new(store: any, key: string, data: any)
	local self = setmetatable({}, MockProfile)
	self._store = store
	self._key = key
	self._active = true
	self._releaseListeners = {}
	self.Data = data
	self.UserIds = {}
	return self
end

function MockProfile:IsActive(): boolean
	return self._active
end

function MockProfile:AddUserId(userId: number)
	table.insert(self.UserIds, userId)
end

function MockProfile:Reconcile()
	local function fill(target: any, template: any)
		for key, value in template do
			if target[key] == nil then
				target[key] = deepCopy(value)
			elseif typeof(value) == "table" and typeof(target[key]) == "table" then
				fill(target[key], value)
			end
		end
	end
	fill(self.Data, self._store._template)
end

function MockProfile:ListenToRelease(callback: () -> ())
	table.insert(self._releaseListeners, callback)
end

function MockProfile:Release()
	if not self._active then
		return
	end
	self._active = false
	self._store._saved[self._key] = deepCopy(self.Data)
	self._store._locks[self._key] = nil
	for _, callback in self._releaseListeners do
		task.spawn(callback)
	end
	table.clear(self._releaseListeners)
end

function MockProfileStore.new(template: any)
	local self = setmetatable({}, MockProfileStore)
	self._template = template
	self._saved = {}
	self._locks = {}
	self.Mock = self
	return self
end

function MockProfileStore:LoadProfileAsync(key: string, lockHandling: string?)
	local existing = self._locks[key]
	if existing then
		if lockHandling == "ForceLoad" then
			existing:Release() -- robo de sesion, igual que ProfileService
		else
			return nil
		end
	end
	local data = deepCopy(self._saved[key]) or deepCopy(self._template)
	local profile = MockProfile.new(self, key, data)
	self._locks[key] = profile
	return profile
end

function MockProfileStore:WipeProfileAsync(key: string): boolean
	self._saved[key] = nil
	return true
end

return MockProfileStore
