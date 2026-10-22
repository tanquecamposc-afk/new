--!strict
-- Controlled camera shake (scaled by the Camera Shake accessibility setting).

local RunService = game:GetService("RunService")

local ClientState = require(script.Parent.Parent.ClientState)

local CameraController = {}

local trauma = 0

function CameraController.shake(intensity: number)
	local scale = ClientState.settings().cameraShake
	trauma = math.min(1, trauma + intensity * scale)
end

function CameraController.init()
	RunService:BindToRenderStep("RiftShake", Enum.RenderPriority.Camera.Value + 1, function(dt)
		if trauma <= 0 then
			return
		end
		local camera = workspace.CurrentCamera
		local amount = trauma * trauma
		local t = os.clock() * 40
		local offset = CFrame.Angles(
			math.rad(math.noise(t, 0) * 2.2 * amount),
			math.rad(math.noise(0, t) * 2.2 * amount),
			math.rad(math.noise(t, t) * 1.2 * amount)
		)
		camera.CFrame = camera.CFrame * offset
		trauma = math.max(0, trauma - dt * 1.8)
	end)
end

return CameraController
