--!strict
-- Server-local parties (max 4): invite, accept/decline, leave, kick, leader hand-off and
-- cleanup on disconnect. Parties share contract kill credit and can launch expeditions together.
-- Cross-server parties are NOT implemented.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local PartyService = {}

type Party = { id: number, leader: Player, members: { Player } }
local parties: { [number]: Party } = {}
local membership: { [Player]: number } = {}
local invites: { [Player]: { [Player]: number } } = {} -- invitee -> inviter -> expiry
local nextId = 0

local function partyOf(player: Player): Party?
	local id = membership[player]
	return id and parties[id] or nil
end

local function syncParty(party: Party?)
	if not party then
		return
	end
	local members = {}
	for _, m in party.members do
		table.insert(members, { userId = m.UserId, name = m.DisplayName })
	end
	for _, m in party.members do
		Net.event("PartySync"):FireClient(m, { id = party.id, leader = party.leader.UserId, members = members })
	end
end

local function clearFor(player: Player)
	Net.event("PartySync"):FireClient(player, nil)
end

local function removeMember(player: Player, reason: string?)
	local party = partyOf(player)
	if not party then
		return
	end
	membership[player] = nil
	local index = table.find(party.members, player)
	if index then
		table.remove(party.members, index)
	end
	if player.Parent then
		clearFor(player)
		if reason then
			Net.event("Notify"):FireClient(player, "Party", reason)
		end
	end
	if #party.members <= 1 then
		for _, m in party.members do
			membership[m] = nil
			clearFor(m)
			Net.event("Notify"):FireClient(m, "Party", "Your party was disbanded.")
		end
		parties[party.id] = nil
		return
	end
	if party.leader == player then
		party.leader = party.members[1]
		Net.event("Notify"):FireClient(party.leader, "Party", "You are now the party leader.")
	end
	syncParty(party)
end

function PartyService.membersNear(player: Player, position: Vector3, radius: number): { Player }
	local party = partyOf(player)
	local list = {}
	if not party then
		return list
	end
	for _, m in party.members do
		if m ~= player then
			local root = m.Character and m.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			local humanoid = m.Character and m.Character:FindFirstChildOfClass("Humanoid")
			if root and humanoid and humanoid.Health > 0 and (root.Position - position).Magnitude <= radius then
				table.insert(list, m)
			end
		end
	end
	return list
end

function PartyService.onExtract(_player: Player)
	-- hook for future party objectives
end

function PartyService.Init() end

function PartyService.Start()
	local Requests = Registry.get("RequestService")

	Requests.on("PartyInvite", "Party", function(player, args)
		local target = type(args.userId) == "number" and Players:GetPlayerByUserId(args.userId)
		if not target or target == player then
			return false, "Player not found."
		end
		local party = partyOf(player)
		if party and party.leader ~= player then
			return false, "Only the leader can invite."
		end
		if party and #party.members >= GameConfig.Party.MaxSize then
			return false, "Party is full (max " .. GameConfig.Party.MaxSize .. ")."
		end
		if partyOf(target) then
			return false, target.DisplayName .. " is already in a party."
		end
		invites[target] = invites[target] or {}
		invites[target][player] = os.clock() + GameConfig.Party.InviteTimeout
		Net.event("Notify"):FireClient(target, "PartyInvite", player.DisplayName .. " invited you to a party.", { from = player.UserId, name = player.DisplayName })
		return true, "Invite sent to " .. target.DisplayName .. "."
	end)

	Requests.on("PartyRespond", "Party", function(player, args)
		local inviter = type(args.userId) == "number" and Players:GetPlayerByUserId(args.userId)
		local pending = invites[player]
		if not inviter or not pending or not pending[inviter] or pending[inviter] < os.clock() then
			return false, "That invite expired."
		end
		pending[inviter] = nil
		if args.accept ~= true then
			Net.event("Notify"):FireClient(inviter, "Party", player.DisplayName .. " declined your invite.")
			return true, "Invite declined."
		end
		if partyOf(player) then
			return false, "Leave your current party first."
		end
		local party = partyOf(inviter)
		if not party then
			nextId += 1
			party = { id = nextId, leader = inviter, members = { inviter } }
			parties[party.id] = party
			membership[inviter] = party.id
		end
		if #party.members >= GameConfig.Party.MaxSize then
			return false, "Party is full."
		end
		table.insert(party.members, player)
		membership[player] = party.id
		invites[player] = nil
		syncParty(party)
		for _, m in party.members do
			Net.event("Notify"):FireClient(m, "Party", player.DisplayName .. " joined the party.")
		end
		return true, "Joined " .. inviter.DisplayName .. "'s party."
	end)

	Requests.on("PartyLeave", "Party", function(player, _args)
		if not partyOf(player) then
			return false, "You are not in a party."
		end
		removeMember(player, "You left the party.")
		return true, nil
	end)

	Requests.on("PartyKick", "Party", function(player, args)
		local party = partyOf(player)
		local target = type(args.userId) == "number" and Players:GetPlayerByUserId(args.userId)
		if not party or party.leader ~= player then
			return false, "Only the leader can remove members."
		end
		if not target or partyOf(target) ~= party or target == player then
			return false, "Not in your party."
		end
		removeMember(target, "You were removed from the party.")
		return true, target.DisplayName .. " removed."
	end)

	Players.PlayerRemoving:Connect(function(player)
		removeMember(player, nil)
		invites[player] = nil
		for _, pending in invites do
			pending[player] = nil
		end
	end)
end

return PartyService
