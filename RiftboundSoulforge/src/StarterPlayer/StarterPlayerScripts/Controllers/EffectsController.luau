--!strict
-- All cosmetic effects. Driven by server "Effect" broadcasts and local feedback. Nothing here
-- affects gameplay. Effects scale with the Effects Intensity setting; Reduced Clutter hides
-- other players' minor effects but never hides telegraphs.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local ClientState = require(script.Parent.Parent.ClientState)
local CameraController = require(script.Parent.CameraController)
local AnimationController = require(script.Parent.AnimationController)
local SoundController = require(script.Parent.SoundController)

local EffectsController = {}

local player = Players.LocalPlayer
local folder: Folder

local function fxScale(): number
	return ClientState.settings().effects
end

local function part(props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Material = props.material or Enum.Material.Neon
	p.Color = props.color or Color3.new(1, 1, 1)
	p.Transparency = props.transparency or 0
	p.Size = props.size or Vector3.one
	p.Shape = props.shape or Enum.PartType.Block
	p.CFrame = props.cframe or CFrame.new()
	p.Parent = folder
	return p
end

local function tween(inst: Instance, time: number, goal: { [string]: any }, style: Enum.EasingStyle?)
	local t = TweenService:Create(inst, TweenInfo.new(time, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out), goal)
	t:Play()
	return t
end

function EffectsController.sphere(position: Vector3, fromSize: number, toSize: number, color: Color3, duration: number, startTransparency: number?)
	local p = part({ shape = Enum.PartType.Ball, size = Vector3.one * fromSize, cframe = CFrame.new(position), color = color, transparency = startTransparency or 0.2 })
	tween(p, duration, { Size = Vector3.one * toSize, Transparency = 1 })
	Debris:AddItem(p, duration + 0.05)
	return p
end

function EffectsController.ring(position: Vector3, radius: number, color: Color3, duration: number)
	local p = part({
		shape = Enum.PartType.Cylinder,
		size = Vector3.new(0.3, 1, 1),
		cframe = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90)),
		color = color,
		transparency = 0.2,
	})
	tween(p, duration, { Size = Vector3.new(0.3, radius * 2, radius * 2), Transparency = 1 })
	Debris:AddItem(p, duration + 0.05)
end

function EffectsController.beam(points: { Vector3 }, color: Color3, duration: number, width: number?, jagged: boolean?)
	for i = 1, #points - 1 do
		local a, b = points[i], points[i + 1]
		local segments = if jagged then 4 else 1
		local prev = a
		for s = 1, segments do
			local target = a:Lerp(b, s / segments)
			if jagged and s < segments then
				target += Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * 2.5
			end
			local length = (target - prev).Magnitude
			if length > 0.05 then
				local p = part({
					size = Vector3.new(width or 0.35, width or 0.35, length),
					cframe = CFrame.lookAt((prev + target) / 2, target),
					color = color,
				})
				tween(p, duration, { Transparency = 1, Size = Vector3.new(0.05, 0.05, length) })
				Debris:AddItem(p, duration + 0.05)
			end
			prev = target
		end
	end
end

function EffectsController.burst(position: Vector3, color: Color3, count: number, speed: number?)
	local n = math.floor(count * fxScale())
	if n <= 0 then
		return
	end
	local holder = part({ size = Vector3.one * 0.2, cframe = CFrame.new(position), transparency = 1 })
	local emitter = Instance.new("ParticleEmitter")
	emitter.Color = ColorSequence.new(color)
	emitter.LightEmission = 1
	emitter.Rate = 0
	emitter.Speed = NumberRange.new((speed or 14) * 0.5, speed or 14)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.Lifetime = NumberRange.new(0.25, 0.6)
	emitter.Drag = 4
	emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
	emitter.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) })
	emitter.Parent = holder
	emitter:Emit(n)
	Debris:AddItem(holder, 1)
end

function EffectsController.floatText(position: Vector3, text: string, color: Color3, size: number?, duration: number?)
	local holder = part({ size = Vector3.one * 0.2, cframe = CFrame.new(position), transparency = 1 })
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(200, size or 34)
	gui.AlwaysOnTop = true
	gui.LightInfluence = 0
	gui.MaxDistance = 120
	gui.Parent = holder
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = Enum.Font.LuckiestGuy
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.2
	label.Parent = gui
	local d = duration or 0.8
	tween(holder, d, { CFrame = CFrame.new(position + Vector3.new(math.random(-10, 10) / 10, 3, 0)) })
	tween(label, d, { TextTransparency = 1, TextStrokeTransparency = 1 }, Enum.EasingStyle.Quint)
	Debris:AddItem(holder, d + 0.05)
end

function EffectsController.damageNumber(position: Vector3, amount: number, color: Color3?, big: boolean?)
	EffectsController.floatText(position + Vector3.new(0, 2.5, 0), tostring(amount), color or Color3.new(1, 1, 1), if big then 40 else 28, 0.7)
end

local function flash(model: Instance?, color: Color3, duration: number)
	if not model or not model:IsA("Model") then
		return
	end
	local highlight = Instance.new("Highlight")
	highlight.FillColor = color
	highlight.OutlineColor = color
	highlight.FillTransparency = 0.4
	highlight.OutlineTransparency = 0
	highlight.DepthMode = Enum.HighlightDepthMode.Occluded
	highlight.Adornee = model
	highlight.Parent = folder
	tween(highlight, duration, { FillTransparency = 1, OutlineTransparency = 1 })
	Debris:AddItem(highlight, duration + 0.05)
end
EffectsController.flash = flash

local function rootOf(character: any): BasePart?
	if typeof(character) ~= "Instance" or not character.Parent then
		return nil
	end
	return character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function nearLocal(position: Vector3, range: number): number
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return 0
	end
	local d = (root.Position - position).Magnitude
	return math.clamp(1 - d / range, 0, 1)
end

local function isOther(character: any): boolean
	return character ~= player.Character
end

local function clutter(character: any): boolean
	return ClientState.settings().reducedClutter and isOther(character)
end

-- Anime-style crescent slash: a tapered neon arc swept around the character.
-- index picks the arc plane (matches the procedural animation of that strike).
local ARCS = {
	{ tilt = 0, from = -85, to = 85, radius = 6.5 }, -- 1 right -> left
	{ tilt = 12, from = 85, to = -85, radius = 6.5 }, -- 2 backhand
	{ tilt = -55, from = -80, to = 90, radius = 7 }, -- 3 rising diagonal
	{ tilt = 88, from = -70, to = 95, radius = 7.5 }, -- 4 overhead cleave
	{ tilt = 0, from = -25, to = 25, radius = 9 }, -- 5 thrust burst
}

function EffectsController.slash(character: any, index: number, color: Color3?, heavy: boolean?, delay: number?)
	local root = rootOf(character)
	if not root then
		return
	end
	local arc = if heavy then { tilt = 80, from = -100, to = 75, radius = 10 } else ARCS[((math.max(1, index) - 1) % #ARCS) + 1]
	local c = color or Color3.fromRGB(235, 240, 255)
	local segments = if fxScale() < 0.5 then 8 else 14
	local width = if heavy then 2.6 else 1.7
	task.delay(delay or 0, function()
		if not root.Parent then
			return
		end
		local base = root.CFrame * CFrame.new(0, 0.6, -0.5) * CFrame.Angles(0, 0, math.rad(arc.tilt))
		local normal = base.UpVector
		local function point(i: number): Vector3
			local theta = arc.from + (arc.to - arc.from) * (i / segments)
			return (base * CFrame.Angles(0, math.rad(theta), 0) * CFrame.new(0, 0, -arc.radius)).Position
		end
		local sweep = if heavy then 0.12 else 0.08
		for i = 0, segments - 1 do
			task.delay(sweep * i / segments, function()
				local a, b = point(i), point(i + 1)
				local length = (b - a).Magnitude + 0.15
				local taper = math.sin(math.pi * (i + 0.5) / segments)
				local cf = CFrame.lookAt((a + b) / 2, b, normal)
				local outer = part({ size = Vector3.new(width * taper + 0.15, 0.08, length), cframe = cf, color = c, transparency = 0.15 })
				tween(outer, 0.22, { Transparency = 1, Size = Vector3.new(0.05, 0.05, length) })
				Debris:AddItem(outer, 0.25)
				if fxScale() >= 0.5 then
					local core = part({ size = Vector3.new(width * taper * 0.35 + 0.05, 0.1, length), cframe = cf, color = Color3.new(1, 1, 1), transparency = 0 })
					tween(core, 0.16, { Transparency = 1 })
					Debris:AddItem(core, 0.2)
				end
			end)
		end
	end)
end

-- Handlers ----------------------------------------------------------------------------------

local handlers: { [string]: (any) -> () } = {}

handlers.Swing = function(d)
	if typeof(d.character) == "Instance" then
		AnimationController.swing(d.character, d.index, d.heavy)
		if not clutter(d.character) then
			EffectsController.slash(d.character, d.index, d.color, d.heavy, if d.heavy then 0.3 else 0.08)
		end
	end
end

handlers.Impacts = function(d)
	if ClientState.settings().reducedClutter then
		return
	end
	for _, hit in d.hits do
		EffectsController.burst(hit.position, d.color or Color3.new(1, 1, 1), 8)
	end
end

handlers.EnemyDeath = function(d)
	EffectsController.burst(d.position, Color3.fromRGB(200, 120, 255), 30, 20)
	EffectsController.ring(d.position - Vector3.new(0, 2, 0), 8, Color3.fromRGB(200, 120, 255), 0.5)
	local model = d.model
	if typeof(model) == "Instance" then
		for _, p in model:GetDescendants() do
			if p:IsA("BasePart") and p.Transparency < 1 then
				tween(p, 0.8, { Transparency = 1 })
			end
		end
	end
end

handlers.EnemyStrike = function(d)
	local color = d.color or Color3.fromRGB(255, 80, 60)
	local pos = d.position
	if typeof(pos) ~= "Vector3" then
		return
	end
	if d.shape == "Line" and typeof(d.dir) == "Vector3" then
		local finish = pos + d.dir * (d.length or 10)
		EffectsController.beam({ pos + Vector3.new(0, 0.5, 0), finish + Vector3.new(0, 0.5, 0) }, color, 0.25, 1.2)
	else
		EffectsController.ring(pos + Vector3.new(0, 0.3, 0), d.radius or 8, color, 0.35)
	end
	local near = nearLocal(pos, if d.big then 70 else 30)
	if near > 0 then
		CameraController.shake((if d.big then 0.5 else 0.2) * near)
	end
end

handlers.GuardBreak = function(d)
	EffectsController.burst(d.position, Color3.fromRGB(255, 255, 255), 20, 18)
	EffectsController.floatText(d.position + Vector3.new(0, 4, 0), "GUARDIA ROTA", Color3.fromRGB(255, 220, 120), 30, 0.9)
end

handlers.Parry = function(d)
	EffectsController.burst(d.position, Color3.fromRGB(255, 255, 230), 26, 24)
	EffectsController.ring(d.position, 6, Color3.fromRGB(255, 240, 200), 0.3)
end

handlers.Riposte = function(d)
	EffectsController.beam({ d.from, d.to }, Color3.fromRGB(255, 220, 120), 0.3, 0.6)
end

handlers.Dodge = function(d)
	if typeof(d.character) == "Instance" then
		AnimationController.play(d.character, "Dodge")
	end
	local root = rootOf(d.character)
	if root and not clutter(d.character) then
		EffectsController.burst(root.Position, Color3.fromRGB(200, 220, 255), 10, 8)
	end
end

handlers.Cast = function(d)
	if typeof(d.character) == "Instance" then
		AnimationController.cast(d.character)
	end
end

handlers.Awaken = function(d)
	local root = rootOf(d.character)
	if not root then
		return
	end
	EffectsController.sphere(root.Position, 2, 22, d.color, 0.6)
	EffectsController.ring(root.Position - Vector3.new(0, 2.5, 0), 18, d.color, 0.7)
	EffectsController.burst(root.Position, d.color, 40, 26)
	AnimationController.play(d.character, "Awaken")
	CameraController.shake(0.6 * nearLocal(root.Position, 60))
	if not isOther(d.character) then
		SoundController.play("Awakening")
		CameraController.punch(8)
		CameraController.flash(d.color, 0.45)
	end
end

handlers.AwakenEnd = function(d)
	local root = rootOf(d.character)
	if root then
		EffectsController.burst(root.Position, Color3.fromRGB(150, 150, 170), 16, 8)
		if d.suppressed then
			EffectsController.floatText(root.Position + Vector3.new(0, 4, 0), "SUPRIMIDO", Color3.fromRGB(255, 120, 160), 30, 1)
		end
	end
end

handlers.Lightning = function(d)
	if typeof(d.points) == "table" and #d.points >= 2 then
		EffectsController.beam(d.points, d.color or Color3.fromRGB(140, 210, 255), 0.25, 0.3, true)
		EffectsController.burst(d.points[#d.points], d.color or Color3.fromRGB(140, 210, 255), 8)
	end
end

handlers.Nova = function(d)
	EffectsController.sphere(d.position, 1, d.radius * 2, d.color or Color3.fromRGB(255, 140, 60), 0.4)
	EffectsController.ring(d.position - Vector3.new(0, 2.4, 0), d.radius, d.color or Color3.fromRGB(255, 140, 60), 0.45)
end

handlers.FlareBurst = function(d)
	local steps = 6
	for i = 1, steps do
		task.delay(i * 0.03, function()
			local pos = d.origin + d.dir * (d.length * i / steps)
			EffectsController.sphere(pos, 1, d.width * (0.4 + i / steps * 0.6), d.color, 0.35)
		end)
	end
end

handlers.Gravity = function(d)
	local p = part({ shape = Enum.PartType.Ball, size = Vector3.one * d.radius * 2, cframe = CFrame.new(d.position), color = d.color, transparency = 0.7 })
	tween(p, d.duration or 0.6, { Size = Vector3.one * 2, Transparency = 0.2 })
	Debris:AddItem(p, (d.duration or 0.6) + 0.1)
	EffectsController.ring(d.position, d.radius, d.color, 0.5)
end

handlers.Field = function(d)
	local p = part({
		shape = Enum.PartType.Cylinder,
		size = Vector3.new(0.3, d.radius * 2, d.radius * 2),
		cframe = CFrame.new(d.position - Vector3.new(0, 2.3, 0)) * CFrame.Angles(0, 0, math.rad(90)),
		color = d.color,
		transparency = 0.55,
	})
	Debris:AddItem(p, d.duration)
	task.delay(math.max(0, d.duration - 0.3), function()
		if p.Parent then
			tween(p, 0.3, { Transparency = 1 })
		end
	end)
end

handlers.CollapsingSun = function(d)
	local core = part({ shape = Enum.PartType.Ball, size = Vector3.one * d.radius * 2, cframe = CFrame.new(d.position), color = Color3.fromRGB(40, 10, 60), transparency = 0.5 })
	tween(core, d.pullTime, { Size = Vector3.one * 3, Transparency = 0 })
	Debris:AddItem(core, d.pullTime + 0.05)
	task.delay(d.pullTime, function()
		local color = if d.gravityOnly then Color3.fromRGB(170, 110, 255) else Color3.fromRGB(255, 170, 60)
		EffectsController.sphere(d.position, 2, d.blast * 2.2, color, 0.55, 0)
		EffectsController.ring(d.position - Vector3.new(0, 2.4, 0), d.blast * 1.2, color, 0.6)
		EffectsController.burst(d.position, color, 50, 30)
		CameraController.shake(0.5 * nearLocal(d.position, 60))
	end)
end

handlers.MagneticRift = function(d)
	local disc = part({
		shape = Enum.PartType.Cylinder,
		size = Vector3.new(0.3, d.radius * 2, d.radius * 2),
		cframe = CFrame.new(d.position - Vector3.new(0, 2.3, 0)) * CFrame.Angles(0, 0, math.rad(90)),
		color = Color3.fromRGB(110, 150, 255),
		transparency = 0.5,
	})
	local orb = part({ shape = Enum.PartType.Ball, size = Vector3.one * 3, cframe = CFrame.new(d.position + Vector3.new(0, 3, 0)), color = Color3.fromRGB(180, 210, 255) })
	Debris:AddItem(disc, d.duration)
	Debris:AddItem(orb, d.duration)
end

handlers.Cataclysm = function(d)
	EffectsController.sphere(d.position, 2, d.radius * 2.2, d.color, 0.8, 0)
	EffectsController.ring(d.position - Vector3.new(0, 2.4, 0), d.radius, d.color, 0.9)
	EffectsController.burst(d.position, d.color, 60, 40)
	CameraController.shake(0.8 * nearLocal(d.position, 90))
end

handlers.Thunderstep = function(d)
	EffectsController.beam({ d.from, d.to }, d.color or Color3.fromRGB(140, 210, 255), 0.35, 0.8, true)
end

handlers.Dash = function(d)
	EffectsController.beam({ d.from, d.to }, d.color or Color3.fromRGB(255, 255, 255), 0.3, 1)
end

handlers.Shield = function(d)
	if typeof(d.character) == "Instance" then
		local highlight = Instance.new("Highlight")
		highlight.FillColor = Color3.fromRGB(255, 210, 100)
		highlight.FillTransparency = 0.75
		highlight.OutlineColor = Color3.fromRGB(255, 230, 150)
		highlight.Adornee = d.character
		highlight.Parent = folder
		Debris:AddItem(highlight, d.duration or 3)
	end
end

handlers.Heal = function(d)
	local root = rootOf(d.character)
	if root then
		EffectsController.burst(root.Position, Color3.fromRGB(120, 255, 150), 20, 6)
	end
end

handlers.Mine = function(d)
	EffectsController.burst(d.position + Vector3.new(0, 3, 0), d.color, 18, 14)
	EffectsController.floatText(d.position + Vector3.new(0, 6, 0), "+" .. (d.item or "ore"), d.color, 24, 0.8)
end

handlers.MineSwing = function(d)
	if typeof(d.character) == "Instance" then
		AnimationController.play(d.character, "Mine")
	end
end

handlers.Craft = function(d)
	local root = rootOf(d.character)
	if root then
		EffectsController.burst(root.Position, Color3.fromRGB(255, 210, 120), 30, 10)
	end
end

handlers.Evolve = function(d)
	local root = rootOf(d.character)
	if root then
		EffectsController.beam({ root.Position - Vector3.new(0, 3, 0), root.Position + Vector3.new(0, 60, 0) }, d.color, 1.2, 3)
		EffectsController.sphere(root.Position, 2, 30, d.color, 0.9)
		CameraController.shake(0.6 * nearLocal(root.Position, 60))
	end
end

handlers.Extract = function(d)
	local root = rootOf(d.character)
	if root then
		EffectsController.beam({ root.Position - Vector3.new(0, 3, 0), root.Position + Vector3.new(0, 40, 0) }, Color3.fromRGB(110, 255, 210), 0.8, 2)
	end
end

handlers.LevelUp = function(d)
	local target = d.player
	local root = target and target.Character and rootOf(target.Character)
	if root then
		EffectsController.ring(root.Position - Vector3.new(0, 2.5, 0), 10, Color3.fromRGB(255, 220, 120), 0.8)
		EffectsController.burst(root.Position, Color3.fromRGB(255, 220, 120), 30, 10)
	end
end

handlers.Coop = function(d)
	EffectsController.sphere(d.position, 2, 30, d.color, 0.7, 0)
	EffectsController.ring(d.position - Vector3.new(0, 2.4, 0), 16, d.color, 0.8)
	EffectsController.burst(d.position, d.color, 60, 30)
	EffectsController.floatText(d.position + Vector3.new(0, 8, 0), "RESONANCIA COOPERATIVA", d.color, 44, 1.5)
	CameraController.shake(0.6 * nearLocal(d.position, 80))
end

handlers.WeakPoint = function(d)
	local model = d.model
	local weak = typeof(model) == "Instance" and model:FindFirstChild("WeakPoint")
	if weak then
		local gui = Instance.new("BillboardGui")
		gui.Size = UDim2.fromOffset(120, 40)
		gui.AlwaysOnTop = true
		gui.StudsOffset = Vector3.new(0, 4, 0)
		gui.Adornee = weak
		gui.Parent = folder
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Text = "◆ PUNTO DÉBIL ◆"
		label.TextScaled = true
		label.Font = Enum.Font.LuckiestGuy
		label.TextColor3 = Color3.fromRGB(255, 235, 140)
		label.TextStrokeTransparency = 0
		label.Parent = gui
		Debris:AddItem(gui, d.duration)
		EffectsController.burst(weak.Position, Color3.fromRGB(255, 230, 140), 20, 10)
	end
end

handlers.BossIntro = function(_d)
	CameraController.shake(0.8)
	SoundController.play("BossWarning")
end

handlers.BossPhase = function(d)
	CameraController.shake(0.7)
	SoundController.play("BossPhase")
	local model = d.model
	local root = typeof(model) == "Instance" and model:FindFirstChild("HumanoidRootPart")
	if root then
		EffectsController.ring(root.Position - Vector3.new(0, 8, 0), 40, Color3.fromRGB(255, 60, 150), 1.0)
	end
end

handlers.TileCollapse = function(d)
	EffectsController.burst(d.position + Vector3.new(0, 1, 0), Color3.fromRGB(255, 80, 120), 40, 30)
	CameraController.shake(0.3 * nearLocal(d.position, 80))
end

handlers.Projectile = function(d)
	local ball = part({ shape = Enum.PartType.Ball, size = Vector3.one * 2.5, cframe = CFrame.new(d.from), color = d.color })
	local start = os.clock()
	local connection
	connection = RunService.RenderStepped:Connect(function()
		local t = math.clamp((os.clock() - start) / d.duration, 0, 1)
		local pos = d.from:Lerp(d.to, t) + Vector3.new(0, math.sin(t * math.pi) * 18, 0)
		ball.CFrame = CFrame.new(pos)
		if t >= 1 then
			connection:Disconnect()
			ball:Destroy()
		end
	end)
end

handlers.FinalOpening = function(d)
	if typeof(d.model) == "Instance" then
		local highlight = Instance.new("Highlight")
		highlight.FillColor = Color3.fromRGB(255, 230, 140)
		highlight.FillTransparency = 0.6
		highlight.OutlineColor = Color3.fromRGB(255, 255, 200)
		highlight.Adornee = d.model
		highlight.Parent = folder
		Debris:AddItem(highlight, d.duration)
	end
end

handlers.BossDefeated = function(d)
	CameraController.flash(Color3.fromRGB(255, 240, 200), 0.6)
	EffectsController.sphere(d.position, 4, 80, Color3.fromRGB(255, 220, 160), 1.6, 0)
	EffectsController.burst(d.position, Color3.fromRGB(255, 200, 120), 120, 50)
	CameraController.shake(1)
end

handlers.Shake = function(d)
	CameraController.shake((d.intensity or 0.4) * nearLocal(d.position, 120))
end

handlers.Sound = function(d)
	SoundController.play(d.name)
end

-- ArenaTransform is handled by ZoneController via this hook.
EffectsController.onArenaTransform = function(_active: boolean) end
handlers.ArenaTransform = function(d)
	EffectsController.onArenaTransform(d.active == true)
end

-- Telegraph animation + accessibility ------------------------------------------------------------

local function animateTelegraph(model: Instance)
	if not model:IsA("Model") then
		return
	end
	local start = model:GetAttribute("Start") or ClientState.serverNow()
	local duration = model:GetAttribute("Duration") or 1
	local remaining = math.max(0.05, start + duration - ClientState.serverNow())
	local highContrast = ClientState.settings().highContrastTelegraphs
	if highContrast and model.Name ~= "Safe" then
		for _, p in model:GetChildren() do
			if p:IsA("BasePart") and (p.Name == "Area" or p.Name == "Fill") then
				p.Color = Color3.fromRGB(255, 235, 0)
				p.Transparency = math.max(0.15, p.Transparency - 0.25)
			end
		end
	end
	local fill = model:FindFirstChild("Fill") :: BasePart?
	if not fill or model:GetAttribute("Hazard") then
		return
	end
	local full = fill:GetAttribute("FullSize") :: Vector3?
	if not full then
		return
	end
	if fill:GetAttribute("Grow") == "Forward" then
		local cf = fill.CFrame
		local origin = cf.Position - cf.LookVector * (full.Z / 2)
		fill.Size = Vector3.new(full.X, full.Y, 0.1)
		fill.CFrame = CFrame.lookAt(origin + cf.LookVector * 0.05, origin + cf.LookVector) 
		tween(fill, remaining, { Size = full, CFrame = cf }, Enum.EasingStyle.Linear)
	else
		tween(fill, remaining, { Size = full }, Enum.EasingStyle.Linear)
	end
end

local function watchTelegraphs(container: Instance)
	container.ChildAdded:Connect(function(child)
		task.defer(animateTelegraph, child)
	end)
	for _, child in container:GetChildren() do
		animateTelegraph(child)
	end
end

-- Spinning decorations -----------------------------------------------------------------------------

local spinners: { { inst: Instance, speed: number } } = {}

local function collectSpinners(world: Instance)
	for _, inst in world:GetDescendants() do
		local speed = inst:GetAttribute("Spin") or inst:GetAttribute("SpinModel")
		if type(speed) == "number" and (inst:IsA("BasePart") or inst:IsA("Model")) then
			table.insert(spinners, { inst = inst, speed = speed })
		end
	end
end

-- Enemy status visuals -----------------------------------------------------------------------------

local function statusBillboard(model: Model, text: string, color: Color3, duration: number)
	local root = model:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(140, 26)
	gui.StudsOffset = Vector3.new(0, (model:GetAttribute("Height") or 6) - 1, 0)
	gui.AlwaysOnTop = true
	gui.Adornee = root
	gui.Parent = folder
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = Enum.Font.LuckiestGuy
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.2
	label.Parent = gui
	Debris:AddItem(gui, duration)
end

local function statusEmitter(model: Model, name: string, color: Color3, enabled: boolean)
	local root = model:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	local existing = root:FindFirstChild("FX_" .. name)
	if not enabled then
		if existing then
			existing:Destroy()
		end
		return
	end
	if existing then
		return
	end
	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = "FX_" .. name
	emitter.Color = ColorSequence.new(color)
	emitter.LightEmission = 1
	emitter.Rate = 12 * fxScale()
	emitter.Lifetime = NumberRange.new(0.4, 0.8)
	emitter.Speed = NumberRange.new(2, 4)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0) })
	emitter.Parent = root
end

local function watchEnemy(model: Instance)
	if not model:IsA("Model") then
		return
	end
	local function onAttr(attr: string)
		local value = model:GetAttribute(attr)
		if attr == "Burning" then
			statusEmitter(model, "Burning", Color3.fromRGB(255, 120, 40), value == true)
		elseif attr == "Charged" then
			statusEmitter(model, "Charged", Color3.fromRGB(120, 200, 255), value == true)
		elseif attr == "Gathered" then
			statusEmitter(model, "Gathered", Color3.fromRGB(170, 120, 255), value == true)
		elseif attr == "Surged" and value then
			local highlight = Instance.new("Highlight")
			highlight.FillColor = Color3.fromRGB(200, 80, 255)
			highlight.FillTransparency = 0.8
			highlight.OutlineColor = Color3.fromRGB(220, 120, 255)
			highlight.DepthMode = Enum.HighlightDepthMode.Occluded
			highlight.Parent = model
		elseif attr == "StaggeredUntil" and type(value) == "number" then
			statusBillboard(model, "ATURDIDO", Color3.fromRGB(255, 230, 120), math.max(0.3, value - ClientState.serverNow()))
		elseif attr == "GuardOpenUntil" and type(value) == "number" then
			statusBillboard(model, "¡ABIERTO! GOLPEA", Color3.fromRGB(120, 255, 170), math.max(0.3, value - ClientState.serverNow()))
		elseif attr == "Attacking" and type(value) == "string" then
			statusBillboard(model, value, Color3.fromRGB(255, 120, 100), 0.9)
		end
	end
	model.AttributeChanged:Connect(onAttr)
	for _, attr in { "Burning", "Charged", "Gathered", "Surged" } do
		if model:GetAttribute(attr) then
			onAttr(attr)
		end
	end
end

function EffectsController.init()
	folder = Instance.new("Folder")
	folder.Name = "ClientFX"
	folder.Parent = workspace

	Net.event("Effect").OnClientEvent:Connect(function(name, data)
		local handler = handlers[name]
		if handler and type(data) == "table" then
			local ok, err = pcall(handler, data)
			if not ok then
				warn("[FX] " .. tostring(name) .. ": " .. tostring(err))
			end
		end
	end)

	task.spawn(function()
		local telegraphs = workspace:FindFirstChild("Telegraphs")
		if telegraphs then
			watchTelegraphs(telegraphs)
		else
			local connection
			connection = workspace.ChildAdded:Connect(function(child)
				if child.Name == "Telegraphs" then
					connection:Disconnect()
					watchTelegraphs(child)
				end
			end)
		end
	end)

	task.spawn(function()
		local enemies = workspace:WaitForChild("Enemies", 30)
		if enemies then
			enemies.ChildAdded:Connect(watchEnemy)
			for _, child in enemies:GetChildren() do
				watchEnemy(child)
			end
		end
	end)

	task.spawn(function()
		local world = workspace:WaitForChild("World", 30)
		if world then
			task.wait(2)
			collectSpinners(world)
		end
	end)

	RunService.RenderStepped:Connect(function(dt)
		for _, entry in spinners do
			local inst = entry.inst
			if inst.Parent then
				if inst:IsA("BasePart") then
					inst.CFrame = inst.CFrame * CFrame.Angles(0, entry.speed * dt, 0)
				elseif inst:IsA("Model") then
					inst:PivotTo(inst:GetPivot() * CFrame.Angles(0, entry.speed * dt, 0))
				end
			end
		end
	end)
end

return EffectsController
