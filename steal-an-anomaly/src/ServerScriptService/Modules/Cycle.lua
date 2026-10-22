-- Ciclo global de 5 minutos: Día -> ¡APAGÓN! (45 s).
-- Durante el apagón se apagan los láseres, la Grieta escupe una anomalía
-- Legendaria+, los Imitadores despiertan y algunas anomalías se fugan.
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Cycle = {}
local ctx
local forced = false
local fx = {}
local lamps = {}

local function now()
	return workspace:GetServerTimeNow()
end

local function getOrMake(className, name, parent)
	local inst = parent:FindFirstChild(name)
	if not inst then
		inst = Instance.new(className)
		inst.Name = name
		inst.Parent = parent
	end
	return inst
end

local function setupWorld()
	Lighting.GlobalShadows = true
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.8
	Lighting.ClockTime = 17.4
	Lighting.GeographicLatitude = 30
	fx.Atmosphere = getOrMake("Atmosphere", "Atmosphere", Lighting)
	fx.Bloom = getOrMake("BloomEffect", "Bloom", Lighting)
	fx.Color = getOrMake("ColorCorrectionEffect", "ColorCorrection", Lighting)
	fx.SunRays = getOrMake("SunRaysEffect", "SunRays", Lighting)
	fx.Bloom.Intensity = 0.9
	fx.Bloom.Size = 30
	fx.Bloom.Threshold = 0.9
	fx.SunRays.Intensity = 0.08
	fx.Atmosphere.Offset = 0.15
	fx.Atmosphere.Glare = 0.3
	fx.Atmosphere.Haze = 1.6

	local map = workspace:WaitForChild("Map")
	for _, d in ipairs(map:GetDescendants()) do
		if d:IsA("BasePart") and d.Name == "LampBulb" then
			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(255, 200, 140)
			light.Range = 26
			light.Brightness = 1.6
			light.Shadows = false
			light.Parent = d
			table.insert(lamps, { Part = d, Light = light, Color = d.Color })
		end
	end

	-- Efectos de la Grieta
	local rift = map:FindFirstChild("Rift")
	local core = rift and rift:FindFirstChild("RiftCore")
	if core then
		local att = Instance.new("Attachment")
		att.Parent = core
		local e = Instance.new("ParticleEmitter")
		e.Texture = "rbxasset://textures/particles/sparkles_main.dds"
		e.Color = ColorSequence.new(Color3.fromRGB(190, 90, 255), Color3.fromRGB(60, 255, 220))
		e.Rate = 40
		e.Lifetime = NumberRange.new(1.5, 3)
		e.Speed = NumberRange.new(4, 9)
		e.SpreadAngle = Vector2.new(25, 25)
		e.EmissionDirection = Enum.NormalId.Right
		e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.2), NumberSequenceKeypoint.new(1, 0) })
		e.LightEmission = 1
		e.Parent = att
		local smoke = Instance.new("ParticleEmitter")
		smoke.Texture = "rbxasset://textures/particles/smoke_main.dds"
		smoke.Color = ColorSequence.new(Color3.fromRGB(90, 20, 160))
		smoke.Rate = 12
		smoke.Lifetime = NumberRange.new(2, 4)
		smoke.Speed = NumberRange.new(1, 3)
		smoke.SpreadAngle = Vector2.new(180, 180)
		smoke.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 4), NumberSequenceKeypoint.new(1, 10) })
		smoke.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 1) })
		smoke.LightEmission = 0.5
		smoke.Parent = att
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(170, 80, 255)
		light.Range = 45
		light.Brightness = 4
		light.Parent = core
		fx.RiftLight = light
	end
	local function sign(part, face, text, color)
		if not part then
			return
		end
		local sg = Instance.new("SurfaceGui")
		sg.Face = face
		sg.LightInfluence = 0
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 30
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Size = UDim2.fromScale(1, 1)
		t.Font = Enum.Font.FredokaOne
		t.TextScaled = true
		t.TextColor3 = color
		t.Text = text
		local s = Instance.new("UIStroke")
		s.Thickness = 4
		s.Parent = t
		t.Parent = sg
		sg.Parent = part
	end
	local void = map:FindFirstChild("VoidExit")
	sign(rift and rift:FindFirstChild("RiftSign"), Enum.NormalId.Right, "LA GRIETA", Color3.fromRGB(200, 120, 255))
	sign(void and void:FindFirstChild("VoidSign"), Enum.NormalId.Left, "EL VACÍO", Color3.fromRGB(255, 80, 100))
	local vcore = void and void:FindFirstChild("VoidCore")
	if vcore then
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 60, 80)
		light.Range = 30
		light.Brightness = 3
		light.Parent = vcore
	end
end

local function tween(obj, t, props)
	local tw = TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Sine), props)
	tw:Play()
	return tw
end

local function applyDay(t)
	tween(Lighting, t, {
		ClockTime = 17.4,
		Brightness = 2.4,
		Ambient = Color3.fromRGB(70, 60, 95),
		OutdoorAmbient = Color3.fromRGB(120, 100, 150),
		ExposureCompensation = 0.1,
	})
	tween(fx.Atmosphere, t, {
		Density = 0.32,
		Color = Color3.fromRGB(205, 170, 255),
		Decay = Color3.fromRGB(110, 70, 150),
	})
	tween(fx.Color, t, {
		TintColor = Color3.fromRGB(255, 245, 255),
		Saturation = 0.15,
		Contrast = 0.12,
		Brightness = 0.02,
	})
	for _, l in ipairs(lamps) do
		l.Light.Enabled = true
		l.Part.Material = Enum.Material.Neon
		l.Part.Color = l.Color
	end
	if fx.RiftLight then
		tween(fx.RiftLight, t, { Color = Color3.fromRGB(170, 80, 255), Brightness = 4 })
	end
end

local function applyNight(t)
	tween(Lighting, t, {
		ClockTime = 23.9,
		Brightness = 0.3,
		Ambient = Color3.fromRGB(40, 6, 12),
		OutdoorAmbient = Color3.fromRGB(55, 10, 18),
		ExposureCompensation = -0.2,
	})
	tween(fx.Atmosphere, t, {
		Density = 0.5,
		Color = Color3.fromRGB(110, 20, 35),
		Decay = Color3.fromRGB(40, 0, 10),
	})
	tween(fx.Color, t, {
		TintColor = Color3.fromRGB(255, 190, 190),
		Saturation = -0.25,
		Contrast = 0.3,
		Brightness = -0.03,
	})
	for _, l in ipairs(lamps) do
		l.Light.Enabled = false
		l.Part.Material = Enum.Material.SmoothPlastic
		l.Part.Color = Color3.fromRGB(40, 35, 30)
	end
	if fx.RiftLight then
		tween(fx.RiftLight, t, { Color = Color3.fromRGB(255, 40, 60), Brightness = 8 })
	end
end

local function setPhase(name, duration)
	workspace:SetAttribute("Phase", name)
	workspace:SetAttribute("PhaseEnds", now() + duration)
end

local function waitUntil(t, allowForce)
	while now() < t do
		if allowForce and forced then
			return
		end
		task.wait(0.2)
	end
end

function Cycle.ForceBlackout()
	if workspace:GetAttribute("Phase") == "Day" then
		forced = true
	end
end

function Cycle.Init(c)
	ctx = c
	setupWorld()
	applyDay(0.1)
	task.spawn(function()
		while true do
			-- DÍA
			forced = false
			local dayLen = Config.CycleLength - Config.BlackoutDuration
			setPhase("Day", dayLen)
			applyDay(4)
			ctx.Steal.OnDay()
			local ends = now() + dayLen
			waitUntil(ends - Config.BlackoutWarning, true)
			if forced then
				ends = now() + 5
				setPhase("Day", 5)
			end
			ctx.Announce("⚠ APAGÓN EN " .. math.max(1, math.floor(ends - now())) .. "s ⚠", "¡Protege tu base! La Grieta va a despertar", Color3.fromRGB(255, 120, 60))
			waitUntil(ends, false)

			-- APAGÓN
			setPhase("Blackout", Config.BlackoutDuration)
			applyNight(1.5)
			ctx.Bases.UnlockAll()
			ctx.Announce("☾ ¡APAGÓN! ☽", "Láseres caídos • Surge en la Grieta • Cuidado con los Imitadores", Color3.fromRGB(255, 40, 60))
			task.delay(1.5, function()
				ctx.Rift.SpawnSurge()
				ctx.Steal.RevealMimics()
				ctx.Steal.TriggerBreaches()
			end)
			waitUntil(now() + Config.BlackoutDuration, false)
			for _, player in ipairs(Players:GetPlayers()) do
				ctx.Progression.Progress(player, "Survive", 1)
			end
			ctx.Announce("☀ AMANECE ☀", "Sobreviviste al apagón", Color3.fromRGB(255, 220, 120))
		end
	end)
end

return Cycle
