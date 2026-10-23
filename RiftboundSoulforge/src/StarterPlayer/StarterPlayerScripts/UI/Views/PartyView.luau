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
		local card = Kit.card(body, "Tu grupo", 1, Color3.fromRGB(140, 200, 255))
		ViewUtil.para(card, "Grupos locales del servidor (máx. " .. GameConfig.Party.MaxSize .. "). Los miembros comparten las bajas de los contratos y pueden lanzar expediciones juntos desde el Portal de la Grieta. No hay grupos entre servidores.", C.TextDim, 1, 13)
		if party then
			for i, member in party.members do
				local row = Kit.row(card, 10 + i, 40)
				Kit.text({ parent = row, text = (if member.userId == party.leader then "★ " else "") .. member.name, size = UDim2.fromOffset(260, 36), order = 1 })
				if party.leader == me.UserId and member.userId ~= me.UserId then
					Kit.button({ parent = row, text = "Expulsar", size = UDim2.fromOffset(100, 34), color = C.Bad, order = 2, onClick = function()
						ClientState.request("PartyKick", { userId = member.userId })
					end })
				end
			end
			Kit.button({ parent = card, text = "Salir del grupo", color = C.Bad, order = 50, onClick = function()
				ClientState.request("PartyLeave", {})
			end })
		else
			ViewUtil.para(card, "No estás en un grupo. Invita a alguien abajo.", C.Text, 2)
		end
		local invite = Kit.card(body, "Jugadores en este servidor", 2)
		local count = 0
		for _, other in Players:GetPlayers() do
			if other ~= me then
				count += 1
				local row = Kit.row(invite, count, 40)
				Kit.text({ parent = row, text = other.DisplayName .. "  (@" .. other.Name .. ")", size = UDim2.fromOffset(300, 36), order = 1 })
				local canInvite = not party or party.leader == me.UserId
				local b = Kit.button({ parent = row, text = "Invitar", size = UDim2.fromOffset(100, 34), order = 2, onClick = function()
					ClientState.request("PartyInvite", { userId = other.UserId })
				end })
				b.setEnabled(canInvite)
			end
		end
		if count == 0 then
			ViewUtil.para(invite, "Aún no hay nadie más. Prueba con amigos o con la prueba multicliente de Studio (ver README).", C.TextDim, 1)
		end
	end, { "party", "profile" })
	return view
end

return View
