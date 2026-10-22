-- Guardado de datos con DataStore (reintentos + guardado automático).
-- En Studio sin "Enable Studio Access to API Services" se juega sin guardar.
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Data = {}
local ctx
local store
local profiles = {}

local STORE_NAME = "StealAnAnomaly_v1"
local AUTOSAVE = 90

local function default()
	return {
		Cash = Config.StartCash,
		Rebirths = 0,
		BaseLevel = 0,
		Pods = {},
		Index = {},
		Codes = {},
		Daily = { Last = 0, Streak = 0 },
		Missions = nil,
		LastOnline = 0,
		Stats = { Buys = 0, Steals = 0, Exposed = 0, Captures = 0, Collected = 0 },
		Tutorial = false,
		Receipts = {},
	}
end

local function reconcile(t, d)
	for k, v in pairs(d) do
		if t[k] == nil then
			t[k] = v
		elseif type(v) == "table" and type(t[k]) == "table" and next(v) ~= nil then
			reconcile(t[k], v)
		end
	end
end

function Data.Init(c)
	ctx = c
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	else
		warn("[Data] DataStore no disponible:", result)
	end
	task.spawn(function()
		while true do
			task.wait(AUTOSAVE)
			for player in pairs(profiles) do
				task.spawn(Data.Save, player)
			end
		end
	end)
end

function Data.Load(player)
	local key = "u_" .. player.UserId
	local data
	local loaded = false
	if store then
		for attempt = 1, 3 do
			local ok, result = pcall(function()
				return store:GetAsync(key)
			end)
			if ok then
				data = result
				loaded = true
				break
			end
			warn(("[Data] Error cargando %s (intento %d): %s"):format(player.Name, attempt, tostring(result)))
			task.wait(1.5)
		end
	end
	if type(data) ~= "table" then
		data = default()
	else
		reconcile(data, default())
	end
	profiles[player] = { Data = data, CanSave = loaded }
	return data
end

function Data.Get(player)
	local p = profiles[player]
	return p and p.Data
end

function Data.Save(player)
	local p = profiles[player]
	if not p or not p.CanSave or not store then
		return
	end
	p.Data.LastOnline = os.time()
	local ok, err = pcall(function()
		store:SetAsync("u_" .. player.UserId, p.Data)
	end)
	if not ok then
		warn("[Data] Error guardando", player.Name, err)
	end
end

function Data.Release(player)
	Data.Save(player)
	profiles[player] = nil
end

function Data.SaveAll()
	local pending = 0
	for player in pairs(profiles) do
		pending += 1
		task.spawn(function()
			Data.Save(player)
			pending -= 1
		end)
	end
	local start = os.clock()
	while pending > 0 and os.clock() - start < 25 do
		task.wait(0.2)
	end
end

return Data
