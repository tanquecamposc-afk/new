--!strict
-- Client-side mirror of server state. Purely for display: the server owns every value here.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)

local ClientState = {}

ClientState.profile = nil :: any
ClientState.meta = nil :: any -- { state = "Loaded"|"Temporary", reason }
ClientState.expedition = { region = nil, depth = 0, expedition = false, satchel = { coins = 0, items = {} }, loss = 0 } :: any
ClientState.party = nil :: any
ClientState.boss = nil :: any
ClientState.worldEvent = nil :: any
ClientState.trial = nil :: any
ClientState.cooldowns = {} :: { [string]: { endsAt: number, duration: number } }
ClientState.lockTarget = nil :: Model?

ClientState.Changed = Signal.new() -- (key)

-- Notification sink is injected by NotificationController (avoids a require cycle).
ClientState.toast = function(_kind: string, _text: string, _extra: any?) end

local DEFAULT_SETTINGS = {
	cameraShake = 1,
	effects = 1,
	music = 0.5,
	sfx = 0.8,
	hudScale = 1,
	reducedClutter = false,
	highContrastTelegraphs = false,
}

function ClientState.settings(): any
	local profile = ClientState.profile
	return (profile and profile.settings) or DEFAULT_SETTINGS
end

function ClientState.set(key: string, value: any)
	(ClientState :: any)[key] = value
	ClientState.Changed:Fire(key)
end

-- Sends a request to the server. Shows a toast with the server's message.
function ClientState.request(kind: string, args: any?, silent: boolean?): (boolean, string?, any)
	local ok, a, b, c = pcall(function()
		return Net.func("Request"):InvokeServer(kind, args or {})
	end)
	if not ok then
		ClientState.toast("Error", "Connection problem. Try again.")
		return false, "Connection problem", nil
	end
	if not silent and b then
		ClientState.toast(if a then "Success" else "Error", b)
	end
	return a == true, b, c
end

function ClientState.serverNow(): number
	return workspace:GetServerTimeNow()
end

function ClientState.init()
	Net.event("ProfileSync").OnClientEvent:Connect(function(profile, meta)
		ClientState.profile = profile
		ClientState.meta = meta
		ClientState.Changed:Fire("profile")
	end)
	Net.event("ExpeditionSync").OnClientEvent:Connect(function(data)
		ClientState.expedition = data
		ClientState.Changed:Fire("expedition")
	end)
	Net.event("PartySync").OnClientEvent:Connect(function(data)
		ClientState.party = data
		ClientState.Changed:Fire("party")
	end)
	Net.event("BossState").OnClientEvent:Connect(function(data)
		ClientState.boss = data
		ClientState.Changed:Fire("boss")
	end)
	Net.event("WorldEvent").OnClientEvent:Connect(function(data)
		ClientState.worldEvent = data
		ClientState.Changed:Fire("worldEvent")
	end)
	Net.event("TrialSync").OnClientEvent:Connect(function(data)
		ClientState.trial = data
		ClientState.Changed:Fire("trial")
	end)
	task.spawn(function()
		task.wait(1)
		ClientState.request("Sync", {}, true)
	end)
	Net.event("Cooldown").OnClientEvent:Connect(function(slot, endsAt, duration)
		ClientState.cooldowns[slot] = { endsAt = endsAt, duration = duration }
		ClientState.Changed:Fire("cooldowns")
	end)
end

return ClientState
