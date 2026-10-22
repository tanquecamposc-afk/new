--!strict
-- Single source of truth for remote names. The server creates them; clients wait for them.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Net = {}

Net.Events = {
	-- client -> server
	"CombatAction", -- (action: string, payload: table?)
	-- server -> client
	"ProfileSync", -- (snapshot)
	"Notify", -- (kind, text, extra)
	"Effect", -- (effectName, data) broadcast cosmetic effects
	"CombatFeedback", -- (kind, data) to the acting player only
	"Cooldown", -- (slot, endsAt, duration)
	"OpenView", -- (viewName, data)
	"BossState", -- (state table)
	"WorldEvent", -- (state table)
	"Present", -- (momentId, data) first-time presentation moments
	"PartySync", -- (party state)
	"ExpeditionSync", -- (satchel, depth, region)
	"TrialSync", -- (trial state)
}

Net.Functions = {
	"Request", -- (kind: string, args: table?) -> (ok: boolean, message: string?, data: any?)
}

local folder: Folder? = nil

local function getFolder(): Folder
	if folder then
		return folder
	end
	if RunService:IsServer() then
		local existing = ReplicatedStorage:FindFirstChild("Remotes")
		local f: Folder = if existing and existing:IsA("Folder") then existing else Instance.new("Folder")
		f.Name = "Remotes"
		for _, name in Net.Events do
			if not f:FindFirstChild(name) then
				local remote = Instance.new("RemoteEvent")
				remote.Name = name
				remote.Parent = f
			end
		end
		for _, name in Net.Functions do
			if not f:FindFirstChild(name) then
				local remote = Instance.new("RemoteFunction")
				remote.Name = name
				remote.Parent = f
			end
		end
		f.Parent = ReplicatedStorage
		folder = f
		return f
	else
		local f = ReplicatedStorage:WaitForChild("Remotes") :: Folder
		folder = f
		return f
	end
end

function Net.event(name: string): RemoteEvent
	assert(table.find(Net.Events, name), "Unknown remote event " .. name)
	return getFolder():WaitForChild(name) :: RemoteEvent
end

function Net.func(name: string): RemoteFunction
	assert(table.find(Net.Functions, name), "Unknown remote function " .. name)
	return getFolder():WaitForChild(name) :: RemoteFunction
end

-- Server helper: fire to everyone except one player.
function Net.fireAllExcept(name: string, except: Player?, ...: any)
	local remote = Net.event(name)
	for _, player in game:GetService("Players"):GetPlayers() do
		if player ~= except then
			remote:FireClient(player, ...)
		end
	end
end

return Net
