--!strict
-- Client entry point. Controllers initialise in dependency order; each is isolated so one
-- failing (e.g. a missing optional asset) never stops the rest of the client.

local Controllers = script.Parent.Controllers
local ClientState = require(script.Parent.ClientState)

ClientState.init()

local ORDER = {
	"SoundController",
	"CameraController",
	"AnimationController",
	"EffectsController",
	"NotificationController",
	"CombatController",
	"InputController",
	"UIController",
	"HUDController",
	"ZoneController",
	"WaypointController",
}

for _, name in ORDER do
	local ok, err = pcall(function()
		local controller = require(Controllers:WaitForChild(name)) :: any
		controller.init()
	end)
	if not ok then
		warn(string.format("[Client] %s failed to start: %s", name, tostring(err)))
	end
end
