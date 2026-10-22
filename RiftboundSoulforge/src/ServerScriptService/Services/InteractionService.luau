--!strict
-- Generic station prompts in the world (Forge, Fusion Chamber, Quest Board, ...). The world
-- builder tags a ProximityPrompt with a "View" attribute; triggering it opens that view on the
-- client after a server-side distance check. Stations never grant anything by themselves.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local InteractionService = {}

function InteractionService.Init() end

function InteractionService.Start()
	local world = workspace:WaitForChild("World")
	for _, prompt in world:GetDescendants() do
		if prompt:IsA("ProximityPrompt") and prompt:GetAttribute("View") then
			local holder = prompt.Parent :: BasePart
			prompt.Triggered:Connect(function(player)
				local Security = Registry.get("SecurityService")
				if not Security.allow(player, "Interact") then
					return
				end
				if not Security.within(player, holder.Position, prompt.MaxActivationDistance + 8) then
					Security.flag(player, "station out of range")
					return
				end
				Net.event("OpenView"):FireClient(player, prompt:GetAttribute("View"), { station = prompt:GetAttribute("Station") })
			end)
		end
	end
end

return InteractionService
