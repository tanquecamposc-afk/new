--!strict
-- Full-body procedural keyframe animator (no asset ids needed).
-- Poses are authored below as per-joint Euler offsets (degrees) applied on top of each
-- Motor6D's rest C0, interpolated with easing every frame. Every client animates every
-- character from replicated "Swing/Cast/Dodge/Awaken" effects, so all players see them.
-- If you upload real animations, put their ids in AudioConfig.Animations and they are used
-- instead (Animator tracks), keeping this file as the fallback.
--
-- R15 joint frames: +X on a shoulder/hip swings the limb forward/up, +Z on the right shoulder
-- raises it sideways (-Z for the left), +Y on Waist turns the chest to the character's left,
-- -X on knees/elbows bends them backwards/forwards respectively.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local AudioConfig = require(Shared.Config.AudioConfig)

local AnimationController = {}

type Pose = { [string]: { number } } -- joint -> { rx, ry, rz, px?, py?, pz? }
type Key = { t: number, pose: Pose, ease: string? }
type Clip = { keys: { Key }, hold: boolean? }

local R15_JOINTS = {
	Root = { "LowerTorso", "Root" },
	Waist = { "UpperTorso", "Waist" },
	Neck = { "Head", "Neck" },
	RShoulder = { "RightUpperArm", "RightShoulder" },
	RElbow = { "RightLowerArm", "RightElbow" },
	LShoulder = { "LeftUpperArm", "LeftShoulder" },
	LElbow = { "LeftLowerArm", "LeftElbow" },
	RHip = { "RightUpperLeg", "RightHip" },
	RKnee = { "RightLowerLeg", "RightKnee" },
	LHip = { "LeftUpperLeg", "LeftHip" },
	LKnee = { "LeftLowerLeg", "LeftKnee" },
}
-- R6 fallback: only the arms are driven (its joint frames differ), mapped approximately.
local R6_JOINTS = {
	RShoulder = { "Torso", "Right Shoulder" },
	LShoulder = { "Torso", "Left Shoulder" },
}

local REST: Pose = {}

-- Pose library ---------------------------------------------------------------------------------
local P = {
	-- Light 1: wide horizontal cut, right to left
	L1a = { Waist = { 0, -40, 0 }, RShoulder = { 70, 0, 75 }, RElbow = { 25, 0, 0 }, LShoulder = { 20, 0, -20 }, Root = { 0, 0, 0, 0, -0.2, 0 } },
	L1b = { Waist = { 5, 45, 0 }, RShoulder = { 85, 0, -35 }, RElbow = { 5, 0, 0 }, LShoulder = { -20, 0, -35 }, LHip = { 25, 0, 0 }, RHip = { -15, 0, 0 }, Root = { 0, 0, 0, 0, -0.35, 0 } },
	-- Light 2: backhand, left to right
	L2a = { Waist = { 0, 40, 0 }, RShoulder = { 90, 0, -45 }, RElbow = { 40, 0, 0 }, LShoulder = { 30, 0, -10 } },
	L2b = { Waist = { 5, -50, 0 }, RShoulder = { 75, 0, 85 }, RElbow = { 5, 0, 0 }, LShoulder = { -15, 0, -40 }, RHip = { 25, 0, 0 }, LHip = { -15, 0, 0 }, Root = { 0, 0, 0, 0, -0.3, 0 } },
	-- Light 3: rising diagonal
	L3a = { Waist = { 20, -25, 0 }, RShoulder = { 10, 0, 35 }, RElbow = { 15, 0, 0 }, Root = { 0, 0, 0, 0, -0.55, 0 }, RHip = { 35, 0, 0 }, RKnee = { -45, 0, 0 } },
	L3b = { Waist = { -12, 35, 0 }, RShoulder = { 165, 0, -25 }, RElbow = { 0, 0, 0 }, LShoulder = { 40, 0, -50 }, Neck = { -10, 0, 0 }, Root = { 0, 0, 0, 0, 0.1, 0 } },
	-- Light 4 (finisher): two-handed overhead cleave
	L4a = { Waist = { -18, 0, 0 }, RShoulder = { 172, 0, 5 }, LShoulder = { 165, 0, -5 }, RElbow = { 20, 0, 0 }, LElbow = { 20, 0, 0 }, Neck = { -15, 0, 0 }, Root = { 0, 0, 0, 0, 0.4, 0 } },
	L4b = { Waist = { 35, 0, 0 }, RShoulder = { 35, 0, 0 }, LShoulder = { 35, 0, 0 }, Neck = { 10, 0, 0 }, RHip = { 45, 0, 0 }, RKnee = { -60, 0, 0 }, LHip = { -30, 0, 0 }, Root = { 0, 0, 0, 0, -0.9, 0 } },
	-- Light 5 (Tempest): flurry thrust
	L5a = { Waist = { 0, -35, 0 }, RShoulder = { 60, 0, 15 }, RElbow = { 95, 0, 0 }, LShoulder = { 70, 0, -30 } },
	L5b = { Waist = { 10, 25, 0 }, RShoulder = { 92, 0, 0 }, RElbow = { 0, 0, 0 }, LShoulder = { -30, 0, -30 }, RHip = { 35, 0, 0 }, LHip = { -25, 0, 0 }, Root = { 0, 0, 0, 0, -0.4, -0.4 } },
	-- Heavy: crouch wind-up, explosive slam
	Ha = { Waist = { -25, -20, 0 }, RShoulder = { 178, 0, 15 }, LShoulder = { 150, 0, -25 }, RElbow = { 30, 0, 0 }, LElbow = { 30, 0, 0 }, RHip = { 30, 0, 0 }, RKnee = { -45, 0, 0 }, LHip = { 20, 0, 0 }, LKnee = { -35, 0, 0 }, Root = { 0, 0, 0, 0, -0.6, 0 } },
	Hb = { Waist = { 40, 10, 0 }, RShoulder = { 25, 0, 10 }, LShoulder = { 30, 0, -10 }, Neck = { 15, 0, 0 }, RHip = { 55, 0, 0 }, RKnee = { -70, 0, 0 }, LHip = { -35, 0, 0 }, Root = { 0, 0, 0, 0, -1.0, -0.3 } },
	-- Guard stance (blade across the body)
	Block = { Waist = { 5, -20, 0 }, RShoulder = { 75, 0, -15 }, RElbow = { 70, 0, 0 }, LShoulder = { 65, 0, -35 }, LElbow = { 55, 0, 0 }, RHip = { 15, 0, 0 }, RKnee = { -20, 0, 0 }, Root = { 0, 0, 0, 0, -0.35, 0 } },
	-- Dodge dash: low forward lean, arms trailing (ninja run)
	Dodge = { Waist = { 30, 0, 0 }, RShoulder = { -60, 0, 15 }, LShoulder = { -60, 0, -15 }, Neck = { -20, 0, 0 }, RHip = { 55, 0, 0 }, RKnee = { -75, 0, 0 }, LHip = { -25, 0, 0 }, LKnee = { -30, 0, 0 }, Root = { 0, 0, 0, 0, -0.7, 0 } },
	-- Essence cast: left palm thrust
	Ca = { Waist = { 0, 35, 0 }, LShoulder = { 40, 0, -60 }, LElbow = { 60, 0, 0 }, RShoulder = { -20, 0, 20 } },
	Cb = { Waist = { 5, -35, 0 }, LShoulder = { 95, 0, -5 }, LElbow = { 0, 0, 0 }, RShoulder = { -30, 0, 30 }, LHip = { 25, 0, 0 }, Root = { 0, 0, 0, 0, -0.3, 0 } },
	-- Awakening: gather then burst open
	Aa = { Waist = { 30, 0, 0 }, RShoulder = { 60, 0, -30 }, LShoulder = { 60, 0, 30 }, RElbow = { 90, 0, 0 }, LElbow = { 90, 0, 0 }, Neck = { 25, 0, 0 }, Root = { 0, 0, 0, 0, -0.8, 0 }, RHip = { 40, 0, 0 }, RKnee = { -60, 0, 0 }, LHip = { 40, 0, 0 }, LKnee = { -60, 0, 0 } },
	Ab = { Waist = { -25, 0, 0 }, RShoulder = { 30, 0, 130 }, LShoulder = { 30, 0, -130 }, Neck = { -30, 0, 0 }, Root = { 0, 0, 0, 0, 0.2, 0 } },
	-- Hit reaction
	Hurt = { Waist = { -18, 10, 0 }, Neck = { -20, 0, 0 }, RShoulder = { 20, 0, 40 }, LShoulder = { 20, 0, -40 }, Root = { 0, 0, 0, 0, 0, 0.3 } },
	-- Mining chop
	Ma = { Waist = { -15, -15, 0 }, RShoulder = { 160, 0, 10 }, LShoulder = { 140, 0, -10 }, RElbow = { 40, 0, 0 } },
	Mb = { Waist = { 30, 0, 0 }, RShoulder = { 30, 0, 0 }, LShoulder = { 35, 0, 0 }, Root = { 0, 0, 0, 0, -0.4, 0 } },
}

local function strike(a: Pose, b: Pose, windup: number, recover: number): Clip
	return {
		keys = {
			{ t = 0, pose = REST },
			{ t = windup * 0.85, pose = a, ease = "out" },
			{ t = windup + 0.07, pose = b, ease = "snap" },
			{ t = windup + 0.07 + recover * 0.5, pose = b, ease = "linear" },
			{ t = windup + 0.07 + recover, pose = REST, ease = "inout" },
		},
	}
end

local LIGHT = { { "L1a", "L1b" }, { "L2a", "L2b" }, { "L3a", "L3b" }, { "L4a", "L4b" }, { "L5a", "L5b" } }

local function clipFor(name: string, windup: number?): Clip
	local w = windup or 0.12
	if name:sub(1, 5) == "Light" then
		local index = tonumber(name:sub(6)) or 1
		local pair = LIGHT[((index - 1) % #LIGHT) + 1]
		return strike(P[pair[1]], P[pair[2]], w, if index >= 4 then 0.4 else 0.28)
	elseif name == "Heavy" then
		return strike(P.Ha, P.Hb, w, 0.45)
	elseif name == "Block" then
		return { keys = { { t = 0, pose = REST }, { t = 0.08, pose = P.Block, ease = "out" } }, hold = true }
	elseif name == "Dodge" then
		return { keys = { { t = 0, pose = REST }, { t = 0.06, pose = P.Dodge, ease = "out" }, { t = 0.22, pose = P.Dodge }, { t = 0.42, pose = REST, ease = "inout" } } }
	elseif name == "Cast" then
		return strike(P.Ca, P.Cb, 0.12, 0.35)
	elseif name == "Awaken" then
		return { keys = { { t = 0, pose = REST }, { t = 0.25, pose = P.Aa, ease = "out" }, { t = 0.45, pose = P.Aa }, { t = 0.55, pose = P.Ab, ease = "snap" }, { t = 1.1, pose = P.Ab }, { t = 1.5, pose = REST, ease = "inout" } } }
	elseif name == "Hurt" then
		return { keys = { { t = 0, pose = REST }, { t = 0.06, pose = P.Hurt, ease = "snap" }, { t = 0.3, pose = REST, ease = "inout" } } }
	elseif name == "Mine" then
		return strike(P.Ma, P.Mb, 0.35, 0.3)
	end
	return { keys = { { t = 0, pose = REST } } }
end

-- Engine -----------------------------------------------------------------------------------------

type Active = { clip: Clip, start: number, motors: { [string]: Motor6D }, releasing: number? }
local active: { [Model]: Active } = {}
local baseC0: { [Motor6D]: CFrame } = {}
local tracks: { [Humanoid]: { [string]: AnimationTrack } } = {}

local function offset(entry: { number }?): CFrame
	if not entry then
		return CFrame.identity
	end
	return CFrame.new(entry[4] or 0, entry[5] or 0, entry[6] or 0)
		* CFrame.Angles(math.rad(entry[1]), math.rad(entry[2]), math.rad(entry[3]))
end

local function ease(kind: string?, a: number): number
	if kind == "out" then
		return 1 - (1 - a) * (1 - a)
	elseif kind == "snap" then
		return 1 - (1 - a) ^ 4
	elseif kind == "inout" then
		return a * a * (3 - 2 * a)
	end
	return a
end

local function motorsOf(character: Model): { [string]: Motor6D }
	local map = if character:FindFirstChild("UpperTorso") then R15_JOINTS else R6_JOINTS
	local out = {}
	for joint, path in map do
		local part = character:FindFirstChild(path[1])
		local motor = part and part:FindFirstChild(path[2])
		if motor and motor:IsA("Motor6D") then
			out[joint] = motor
			if not baseC0[motor] then
				baseC0[motor] = motor.C0
			end
		end
	end
	return out
end

local function apply(entry: Active, pose: { [string]: CFrame })
	for joint, motor in entry.motors do
		local base = baseC0[motor]
		if base and motor.Parent then
			motor.C0 = base * (pose[joint] or CFrame.identity)
		end
	end
end

local function evaluate(clip: Clip, t: number): ({ [string]: CFrame }, boolean)
	local keys = clip.keys
	local last = keys[#keys]
	if t >= last.t then
		local out = {}
		for joint, e in last.pose do
			out[joint] = offset(e)
		end
		return out, not clip.hold
	end
	for i = 1, #keys - 1 do
		local a, b = keys[i], keys[i + 1]
		if t >= a.t and t < b.t then
			local alpha = ease(b.ease, (t - a.t) / math.max(1e-3, b.t - a.t))
			local out = {}
			for joint in R15_JOINTS do
				local from, to = a.pose[joint], b.pose[joint]
				if from or to then
					out[joint] = offset(from):Lerp(offset(to), alpha)
				end
			end
			return out, false
		end
	end
	return {}, true
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
	tracks[humanoid] = tracks[humanoid] or {}
	local track = tracks[humanoid][key]
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
		tracks[humanoid][key] = track
	end
	return track
end

-- Plays a named clip on a character. `windup` stretches the anticipation to match the server timing.
function AnimationController.play(character: Model, name: string, windup: number?)
	if typeof(character) ~= "Instance" or not character.Parent then
		return
	end
	local track = trackFor(character, name)
	if track then
		track:Play(0.05)
		return
	end
	local motors = motorsOf(character)
	if next(motors) == nil then
		return
	end
	active[character] = { clip = clipFor(name, windup), start = os.clock(), motors = motors }
end

function AnimationController.stop(character: Model, name: string?)
	local track = name and trackFor(character, name)
	if track then
		track:Stop(0.1)
		return
	end
	local entry = active[character]
	if entry and not entry.releasing then
		entry.releasing = os.clock()
	end
end

-- Compatibility helpers used by controllers.
function AnimationController.swing(character: Model, index: number, heavy: boolean?, windup: number?)
	local katana = character:FindFirstChild("Katana")
	local blade = katana and katana:FindFirstChild("Blade")
	local trail = blade and blade:FindFirstChild("SwingTrail") :: Trail?
	local w = windup or (if heavy then 0.35 else 0.1)
	if trail then
		task.delay(w * 0.6, function()
			trail.Enabled = true
			task.delay(0.35, function()
				trail.Enabled = false
			end)
		end)
	end
	AnimationController.play(character, if heavy then "Heavy" else ("Light" .. math.max(1, index)), w)
end

function AnimationController.block(character: Model, on: boolean)
	if on then
		AnimationController.play(character, "Block")
	else
		AnimationController.stop(character, "Block")
	end
end

function AnimationController.cast(character: Model)
	AnimationController.play(character, "Cast")
end

-- Brief freeze of animation tracks on impact (hit-stop feel).
function AnimationController.hitStop(character: Model, duration: number)
	local entry = active[character]
	if entry then
		entry.start += duration -- delays the procedural clip
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if animator then
		local playing = animator:GetPlayingAnimationTracks()
		for _, t in playing do
			t:AdjustSpeed(0.05)
		end
		task.delay(duration, function()
			for _, t in playing do
				t:AdjustSpeed(1)
			end
		end)
	end
end

function AnimationController.init()
	RunService.RenderStepped:Connect(function()
		local now = os.clock()
		for character, entry in active do
			if not character.Parent then
				active[character] = nil
				continue
			end
			local pose, finished = evaluate(entry.clip, now - entry.start)
			if entry.releasing then
				local alpha = math.clamp((now - entry.releasing) / 0.12, 0, 1)
				for joint, cf in pose do
					pose[joint] = cf:Lerp(CFrame.identity, alpha)
				end
				finished = alpha >= 1
			end
			apply(entry, pose)
			if finished then
				apply(entry, {})
				active[character] = nil
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		if player.Character then
			active[player.Character] = nil
		end
	end)
end

return AnimationController
