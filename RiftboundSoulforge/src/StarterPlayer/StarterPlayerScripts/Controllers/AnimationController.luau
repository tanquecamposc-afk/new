--!strict
-- Animation layer. If AudioConfig.Animations ids are set they are played through the
-- Animator; otherwise a procedural fallback poses the right arm via Motor6D C0 offsets
-- (local-only, applied to every character on every client so everyone sees swings).

local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local AudioConfig = require(Shared.Config.AudioConfig)

local AnimationController = {}

local baseC0: { [Motor6D]: CFrame } = {}
local loadedTracks: { [Humanoid]: { [string]: AnimationTrack } } = {}

local function shoulderOf(character: Model): Motor6D?
	local upper = character:FindFirstChild("RightUpperArm")
	local motor = upper and upper:FindFirstChild("RightShoulder")
	if motor and motor:IsA("Motor6D") then
		return motor
	end
	local torso = character:FindFirstChild("Torso")
	local r6 = torso and torso:FindFirstChild("Right Shoulder")
	if r6 and r6:IsA("Motor6D") then
		return r6
	end
	return nil
end

local function trackFor(character: Model, key: string): AnimationTrack?
	local id = (AudioConfig.Animations :: any)[key]
	if not id or id == "" then
		return nil
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if not humanoid or not animator then
		return nil
	end
	loadedTracks[humanoid] = loadedTracks[humanoid] or {}
	local track = loadedTracks[humanoid][key]
	if not track then
		local animation = Instance.new("Animation")
		animation.AnimationId = id
		local ok, result = pcall(function()
			return animator:LoadAnimation(animation)
		end)
		if not ok then
			return nil
		end
		track = result
		loadedTracks[humanoid][key] = track
	end
	return track
end

-- Swing poses (procedural): raise -> slash across.
local POSES = {
	CFrame.Angles(math.rad(-20), math.rad(60), math.rad(100)),
	CFrame.Angles(math.rad(-20), math.rad(-60), math.rad(100)),
	CFrame.Angles(math.rad(-80), 0, math.rad(60)),
	CFrame.Angles(math.rad(-120), 0, math.rad(20)),
	CFrame.Angles(math.rad(-40), math.rad(90), math.rad(110)),
}

local function pose(character: Model, from: CFrame, to: CFrame, windup: number, swing: number)
	local motor = shoulderOf(character)
	if not motor then
		return
	end
	local base = baseC0[motor]
	if not base then
		base = motor.C0
		baseC0[motor] = base
	end
	motor.C0 = base * from
	local tween = TweenService:Create(motor, TweenInfo.new(swing, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { C0 = base * to })
	task.delay(windup, function()
		if motor.Parent then
			tween:Play()
			task.delay(swing + 0.18, function()
				if motor.Parent then
					TweenService:Create(motor, TweenInfo.new(0.2), { C0 = base }):Play()
				end
			end)
		end
	end)
end

local function trail(character: Model, duration: number)
	local katana = character:FindFirstChild("Katana")
	local blade = katana and katana:FindFirstChild("Blade")
	local t = blade and blade:FindFirstChild("SwingTrail") :: Trail?
	if t then
		t.Enabled = true
		task.delay(duration, function()
			t.Enabled = false
		end)
	end
end

function AnimationController.swing(character: Model, index: number, heavy: boolean?, windup: number?)
	local key = if heavy then "Heavy" else ("Light" .. math.clamp(index, 1, 5))
	local track = trackFor(character, key)
	local w = windup or (if heavy then 0.35 else 0.1)
	trail(character, w + 0.3)
	if track then
		track:Play(0.05)
		return
	end
	if heavy then
		pose(character, CFrame.Angles(math.rad(-150), 0, math.rad(10)), CFrame.Angles(math.rad(-10), 0, math.rad(40)), w, 0.12)
	else
		local to = POSES[((index - 1) % #POSES) + 1]
		local from = CFrame.Angles(math.rad(-60), 0, math.rad(30))
		pose(character, from, to, w * 0.5, 0.1)
	end
end

function AnimationController.block(character: Model, active: boolean)
	local track = trackFor(character, "Block")
	if track then
		if active then
			track:Play(0.05)
		else
			track:Stop(0.1)
		end
		return
	end
	local motor = shoulderOf(character)
	if not motor then
		return
	end
	local base = baseC0[motor] or motor.C0
	baseC0[motor] = base
	TweenService:Create(motor, TweenInfo.new(0.08), { C0 = if active then base * CFrame.Angles(math.rad(-70), math.rad(-50), math.rad(80)) else base }):Play()
end

function AnimationController.cast(character: Model)
	local track = trackFor(character, "Cast")
	if track then
		track:Play(0.05)
		return
	end
	pose(character, CFrame.Angles(math.rad(-90), 0, 0), CFrame.Angles(math.rad(-100), 0, math.rad(-10)), 0, 0.15)
end

-- Brief freeze of animation tracks on impact (hit-stop feel).
function AnimationController.hitStop(character: Model, duration: number)
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if not animator then
		return
	end
	local tracks = animator:GetPlayingAnimationTracks()
	for _, track in tracks do
		track:AdjustSpeed(0.05)
	end
	task.delay(duration, function()
		for _, track in tracks do
			track:AdjustSpeed(1)
		end
	end)
end

function AnimationController.init() end

return AnimationController
