--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	local view
	view = ViewUtil.simple(container, function(body, _profile)
		local party = ClientState.party
		local me = Players.LocalPlayer
		local card = Kit.card(body, "Your party", 1, Color3.fromRGB(140, 200, 255))
		ViewUtil.para(card, "Server-local parties (max " .. GameConfig.Party.MaxSize .. "). Party members share contract kill credit and can launch expeditions together from the Rift Portal. Cross-server parties are not available.", C.TextDim, 1, 13)
		if party then
			for i, member in party.members do
				local row = Kit.row(card, 10 + i, 40)
				Kit.text({ parent = row, text = (if member.userId == party.leader then "★ " else "") .. member.name, size = UDim2.fromOffset(260, 36), order = 1 })
				if party.leader == me.UserId and member.userId ~= me.UserId then
					Kit.button({ parent = row, text = "Remove", size = UDim2.fromOffset(100, 34), color = C.Bad, order = 2, onClick = function()
						ClientState.request("PartyKick", { userId = member.userId })
					end })
				end
			end
			Kit.button({ parent = card, text = "Leave party", color = C.Bad, order = 50, onClick = function()
				ClientState.request("PartyLeave", {})
			end })
		else
			ViewUtil.para(card, "You are not in a party. Invite someone below.", C.Text, 2)
		end
		local invite = Kit.card(body, "Players in this server", 2)
		local count = 0
		for _, other in Players:GetPlayers() do
			if other ~= me then
				count += 1
				local row = Kit.row(invite, count, 40)
				Kit.text({ parent = row, text = other.DisplayName .. "  (@" .. other.Name .. ")", size = UDim2.fromOffset(300, 36), order = 1 })
				local canInvite = not party or party.leader == me.UserId
				local b = Kit.button({ parent = row, text = "Invite", size = UDim2.fromOffset(100, 34), order = 2, onClick = function()
					ClientState.request("PartyInvite", { userId = other.UserId })
				end })
				b.setEnabled(canInvite)
			end
		end
		if count == 0 then
			ViewUtil.para(invite, "Nobody else is here yet. Test with friends or Studio's multi-client test (see README).", C.TextDim, 1)
		end
	end, { "party", "profile" })
	return view
end

return View
