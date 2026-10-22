--!strict
-- Persistent player profiles via DataStoreService.
--  * Session locking through UpdateAsync (one server owns a profile at a time).
--  * Versioned schema + migrations (Data/ProfileSchema).
--  * Bounded retries with exponential backoff, autosave, PlayerRemoving + BindToClose saves.
--  * A failed load NEVER falls back to blank data that could overwrite a real save:
--    the player gets a temporary, non-saving profile and a clear on-screen warning.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local ProfileSchema = require(script.Parent.Parent.Data.ProfileSchema)

type ProfileState = "Loading" | "Loaded" | "Temporary" | "Released"

type Profile = {
	data: any,
	state: ProfileState,
	reason: string?,
	dirty: boolean,
	syncDirty: boolean,
	saving: boolean,
	pendingSave: boolean,
	lastSave: number,
	joinedAt: number,
}

local PlayerDataService = {}
PlayerDataService.Loaded = Signal.new() -- (player, data)
PlayerDataService.Releasing = Signal.new() -- (player, data) fired before the final save

local CFG = GameConfig.Data
local profiles: { [Player]: Profile } = {}
local store: DataStore? = nil
local storeError: string? = nil
local JOB_ID = if game.JobId ~= "" then game.JobId else ("studio-" .. tostring(math.random(1, 1e9)))
local shuttingDown = false

local function keyFor(player: Player): string
	return CFG.KeyPrefix .. tostring(player.UserId)
end

local function backoff(attempt: number)
	task.wait(math.min(CFG.RetryBaseDelay * 2 ^ (attempt - 1), 8))
end

function PlayerDataService.Init()
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(CFG.DataStoreName)
	end)
	if ok then
		store = result
	else
		storeError = tostring(result)
		warn("[PlayerData] DataStore unavailable: " .. storeError)
	end
end

local function notifyState(player: Player, profile: Profile)
	local remote = Net.event("Notify")
	if profile.state == "Temporary" then
		remote:FireClient(
			player,
			"DataWarning",
			"Progress is NOT being saved this session: " .. (profile.reason or "data unavailable"),
			{ persistent = true }
		)
	end
end

-- Loads (or creates) the profile. Yields. Returns the data table.
function PlayerDataService.load(player: Player): any
	local profile: Profile = {
		data = nil,
		state = "Loading",
		dirty = false,
		syncDirty = true,
		saving = false,
		pendingSave = false,
		lastSave = os.clock(),
		joinedAt = os.clock(),
	}
	profiles[player] = profile

	if not store then
		profile.data = ProfileSchema.default()
		profile.state = "Temporary"
		profile.reason = if RunService:IsStudio()
			then "Studio has no DataStore access (enable 'Studio Access to API Services')"
			else "DataStore unavailable"
	else
		local loadedRaw: any = nil
		local lockedBy: any = nil
		local success = false
		local lastError = ""
		for attempt = 1, CFG.LoadAttempts do
			lockedBy = nil
			local ok, err = pcall(function()
				(store :: DataStore):UpdateAsync(keyFor(player), function(old)
					old = if type(old) == "table" then old else {}
					local lock = old.lock
					if
						type(lock) == "table"
						and lock.jobId ~= JOB_ID
						and type(lock.time) == "number"
						and os.time() - lock.time < CFG.SessionLockTimeout
					then
						lockedBy = lock
						return nil -- abort: another server owns this profile
					end
					loadedRaw = old.data
					old.lock = { jobId = JOB_ID, time = os.time() }
					return old
				end)
			end)
			if not player.Parent then
				profiles[player] = nil
				return nil
			end
			if ok and not lockedBy then
				success = true
				break
			end
			lastError = if ok then "profile is locked by another server" else tostring(err)
			-- Studio without API access (or an unpublished place) will never succeed: stop now.
			if
				not ok
				and (
					string.find(lastError, "StudioAccessToApisNotAllowed", 1, true)
					or string.find(lastError, "publish", 1, true)
				)
			then
				break
			end
			backoff(attempt)
		end

		if success then
			local data, reason = ProfileSchema.load(loadedRaw)
			if data then
				profile.data = data
				profile.state = "Loaded"
			else
				-- Data exists but is unusable (e.g. newer schema). Never overwrite it.
				profile.data = ProfileSchema.default()
				profile.state = "Temporary"
				profile.reason = reason
				-- Release our lock so the newer server can still use it.
				task.spawn(function()
					pcall(function()
						(store :: DataStore):UpdateAsync(keyFor(player), function(old)
							if type(old) == "table" and type(old.lock) == "table" and old.lock.jobId == JOB_ID then
								old.lock = nil
								return old
							end
							return nil
						end)
					end)
				end)
			end
		else
			profile.data = ProfileSchema.default()
			profile.state = "Temporary"
			profile.reason = lastError
		end
	end

	if profile.state == "Temporary" then
		warn(string.format("[PlayerData] %s using temporary profile: %s", player.Name, tostring(profile.reason)))
	end
	notifyState(player, profile)
	PlayerDataService.Loaded:Fire(player, profile.data)
	return profile.data
end

function PlayerDataService.get(player: Player): any
	local profile = profiles[player]
	if profile and (profile.state == "Loaded" or profile.state == "Temporary") then
		return profile.data
	end
	return nil
end

function PlayerDataService.state(player: Player): string?
	local profile = profiles[player]
	return profile and profile.state
end

function PlayerDataService.isSaving(player: Player): boolean
	local profile = profiles[player]
	return profile ~= nil and profile.state == "Loaded"
end

function PlayerDataService.markDirty(player: Player)
	local profile = profiles[player]
	if profile then
		profile.dirty = true
		profile.syncDirty = true
	end
end

-- Performs one save. Returns true on success. Yields.
local function doSave(player: Player, profile: Profile, release: boolean): boolean
	if profile.state ~= "Loaded" or not store then
		return profile.state == "Temporary" -- nothing to save, not an error
	end
	if profile.saving then
		profile.pendingSave = true
		local start = os.clock()
		while profile.saving and os.clock() - start < 30 do
			task.wait(0.1)
		end
	end
	profile.saving = true
	profile.pendingSave = false
	local snapshot = ProfileSchema.deepCopy(profile.data)
	snapshot.stats.playTime += math.floor(os.clock() - profile.joinedAt)
	local lostLock = false
	local success = false
	for attempt = 1, CFG.SaveAttempts do
		local ok, err = pcall(function()
			(store :: DataStore):UpdateAsync(keyFor(player), function(old)
				if type(old) == "table" and type(old.lock) == "table" and old.lock.jobId ~= JOB_ID then
					lostLock = true
					return nil
				end
				return {
					data = snapshot,
					lock = if release then nil else { jobId = JOB_ID, time = os.time() },
					savedAt = os.time(),
				}
			end)
		end)
		if ok then
			success = not lostLock
			break
		end
		warn(string.format("[PlayerData] save attempt %d for %s failed: %s", attempt, player.Name, tostring(err)))
		if attempt < CFG.SaveAttempts then
			backoff(attempt)
		end
	end
	if lostLock then
		profile.state = "Temporary"
		profile.reason = "another server took ownership of this profile"
		warn("[PlayerData] session lock lost for " .. player.Name)
		if player.Parent then
			notifyState(player, profile)
		end
	end
	if success then
		profile.dirty = false
		profile.lastSave = os.clock()
		-- playTime is accumulated in the snapshot; reset the baseline.
		profile.data.stats.playTime = snapshot.stats.playTime
		profile.joinedAt = os.clock()
	end
	profile.saving = false
	return success
end

function PlayerDataService.save(player: Player): boolean
	local profile = profiles[player]
	if not profile then
		return false
	end
	return doSave(player, profile, false)
end

local function release(player: Player)
	local profile = profiles[player]
	if not profile or profile.state == "Released" or profile.state == "Loading" then
		profiles[player] = nil
		return
	end
	PlayerDataService.Releasing:Fire(player, profile.data)
	doSave(player, profile, true)
	profile.state = "Released"
	profiles[player] = nil
end

function PlayerDataService.Start()
	-- Clients ask for a full snapshot once their listeners are connected.
	require(script.Parent.Parent.Registry).get("RequestService").on("Sync", "Request", function(player, _args)
		local profile = profiles[player]
		if profile then
			profile.syncDirty = true
		end
		return true, nil
	end, false)
	Players.PlayerRemoving:Connect(function(player)
		release(player)
	end)

	game:BindToClose(function()
		shuttingDown = true
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				release(player)
				pending -= 1
			end)
		end
		local start = os.clock()
		while pending > 0 and os.clock() - start < 25 do
			task.wait(0.1)
		end
	end)

	-- Autosave
	task.spawn(function()
		while not shuttingDown do
			task.wait(5)
			for player, profile in profiles do
				if
					profile.state == "Loaded"
					and profile.dirty
					and not profile.saving
					and os.clock() - profile.lastSave >= CFG.AutosaveInterval
				then
					task.spawn(doSave, player, profile, false)
				end
			end
		end
	end)

	-- Client sync (throttled)
	local remote = Net.event("ProfileSync")
	task.spawn(function()
		while true do
			task.wait(0.2)
			for player, profile in profiles do
				if profile.syncDirty and profile.data and player.Parent then
					profile.syncDirty = false
					remote:FireClient(player, ProfileSchema.publicView(profile.data), {
						state = profile.state,
						reason = profile.reason,
					})
				end
			end
		end
	end)
end

return PlayerDataService
