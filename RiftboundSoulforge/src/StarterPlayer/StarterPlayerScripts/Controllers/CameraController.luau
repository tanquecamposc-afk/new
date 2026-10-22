--!strict
-- Camera feel: trauma-based shake, FOV punches and brief screen flashes ("impact frames").
-- All scaled by the Camera Shake / Effects accessibility settings.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local ClientState = require(script.Parent.Parent.ClientState)

local CameraController = {}

local trauma = 0
local fovOffset = 0
local flashFrame: Frame? = nil

function CameraController.shake(intensity: number)
	local scale = ClientState.settings().cameraShake
	trauma = math.min(1, trauma + intensity * scale)
end

-- Quick field-of-view kick that springs back (heavy hits, awakenings).
function CameraController.punch(degrees: number)
	fovOffset = math.clamp(fovOffset + degrees * ClientState.settings().cameraShake, -12, 12)
end

function CameraController.flash(color: Color3, strength: number)
	local frame = flashFrame
	if not frame then
		return
	end
	local s = strength * ClientState.settings().effects
	if s <= 0.05 then
		return
	end
	frame.BackgroundColor3 = color
	frame.BackgroundTransparency = 1 - math.clamp(s, 0, 0.6)
	TweenService:Create(frame, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundTransparency = 1 }):Play()
end

function CameraController.init()
	local gui = Instance.new("ScreenGui")
	gui.Name = "ImpactFlash"
	gui.IgnoreGuiInset = true
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 50
	gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundTransparency = 1
	frame.BorderSizePixel = 0
	frame.Active = false
	frame.Parent = gui
	flashFrame = frame

	local baseFov = 70
	RunService:BindToRenderStep("RiftShake", Enum.RenderPriority.Camera.Value + 1, function(dt)
		local camera = workspace.CurrentCamera
		if math.abs(fovOffset) > 0.01 then
			camera.FieldOfView = baseFov + fovOffset
			fovOffset *= math.max(0, 1 - dt * 7)
		elseif camera.FieldOfView ~= baseFov then
			camera.FieldOfView = baseFov
		end
		if trauma <= 0 then
			return
		end
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
