-- Construye los modelos de las anomalías a partir de piezas.
-- Las animaciones se describen con atributos (A_Type, A_Speed...) que
-- interpreta el LocalScript AnomalyAnimator en cada cliente.
local CollectionService = game:GetService("CollectionService")

local Config = require(script.Parent.Config)
local AnomalyData = require(script.Parent.AnomalyData)

local Builder = {}

local CYL = Enum.PartType.Cylinder
local BALL = Enum.PartType.Ball
local BLOCK = Enum.PartType.Block
local NEON = Enum.Material.Neon
local SMOOTH = Enum.Material.SmoothPlastic

local V = Vector3.new
local CF = CFrame.new
local ANG = CFrame.Angles
local C = Color3.fromRGB
local TAU = math.pi * 2

local UP = ANG(0, 0, math.pi / 2) -- cilindro vertical
local FACE = ANG(0, math.pi / 2, 0) -- cilindro como disco mirando a -Z

local TEX_SPARK = "rbxasset://textures/particles/sparkles_main.dds"
local TEX_SMOKE = "rbxasset://textures/particles/smoke_main.dds"

local function make(b, name, shape, size, cf, role, material, anim, transparency)
	local p = Instance.new("Part")
	p.Name = name
	p.Shape = shape
	p.Size = size * b.s
	if typeof(role) == "Color3" then
		p.Color = role
		p:SetAttribute("Role", "X")
	else
		p.Color = b[role]
		p:SetAttribute("Role", role)
	end
	p.Material = material or SMOOTH
	p.Transparency = transparency or 0
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.Massless = true
	p.Anchored = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	local off = CF(cf.Position * b.s) * cf.Rotation
	p.CFrame = b.root.CFrame * off
	local w = Instance.new("Weld")
	w.Name = "W"
	w.Part0 = b.root
	w.Part1 = p
	w.C0 = off
	w.Parent = p
	p:SetAttribute("BaseC0", off)
	p:SetAttribute("BaseSize", p.Size)
	p:SetAttribute("BaseT", p.Transparency)
	if anim then
		for k, v in pairs(anim) do
			if k == "Pivot" then
				v = v * b.s
			end
			p:SetAttribute("A_" .. k, v)
		end
	end
	p.Parent = b.model
	table.insert(b.parts, p)
	return p
end

-- Disco pegado a la superficie de una esfera
local function onSphere(center, radius, dir)
	local n = dir.Unit
	local pos = center + n * radius
	return CFrame.lookAt(pos, pos + n) * FACE
end

local Archetypes = {}

function Archetypes.watcher(b)
	b.h = 5.8
	b.model:SetAttribute("BobAmp", 0.35)
	make(b, "Foot", CYL, V(0.6, 2.6, 2.6), CF(0, 0.3, 0) * UP, "P")
	make(b, "Stalk", CYL, V(2.4, 0.6, 0.6), CF(0, 1.5, 0) * UP, "P")
	for i = 1, 5 do
		local a = i / 5 * TAU
		make(b, "Tendril", BLOCK, V(0.25, 1.4, 0.25), CF(math.cos(a) * 1.0, 0.9, math.sin(a) * 1.0) * ANG(math.sin(a) * 0.5, 0, math.cos(a) * 0.5), "P", nil, { Type = "wiggle", Speed = 3, Amp = 0.25, Phase = i })
	end
	local look = { Type = "swing", Pivot = V(0, 4, 0), Axis = V(0, 1, 0), Speed = 0.7, Amp = 0.35 }
	make(b, "Ball", BALL, V(3.4, 3.4, 3.4), CF(0, 4, 0), "S", nil, look)
	make(b, "Eye", CYL, V(0.2, 1.9, 1.9), CF(0, 4, -1.62) * FACE, "E", NEON, look)
	make(b, "Pupil", CYL, V(0.25, 0.8, 0.8), CF(0, 4, -1.7) * FACE, C(10, 10, 10), nil, look)
	for i = 1, 4 do
		local a = i / 4 * TAU + 0.4
		make(b, "Vein", BLOCK, V(0.1, 0.9, 0.1), CF(math.cos(a) * 1.05, 4 + math.sin(a) * 1.05, -1.25) * ANG(0, 0, a + math.pi / 2), C(210, 40, 50), NEON, look)
	end
end

function Archetypes.tvhead(b)
	b.h = 7.2
	b.model:SetAttribute("BobAmp", 0.15)
	for x = -1, 1, 2 do
		make(b, "Leg", BLOCK, V(0.5, 1.6, 0.5), CF(x * 0.6, 0.8, 0), C(25, 25, 30), nil, { Type = "swing", Pivot = V(x * 0.6, 1.6, 0), Axis = V(1, 0, 0), Speed = 6, Amp = 0.3, Phase = x * 1.5 })
	end
	make(b, "Body", BLOCK, V(2, 2, 1.2), CF(0, 2.6, 0), "P")
	for x = -1, 1, 2 do
		make(b, "Arm", BLOCK, V(0.45, 1.8, 0.45), CF(x * 1.25, 2.6, 0), "P", nil, { Type = "swing", Pivot = V(x * 1.25, 3.4, 0), Axis = V(1, 0, 0), Speed = 4, Amp = 0.4, Phase = x })
	end
	make(b, "TV", BLOCK, V(3.4, 2.6, 2.2), CF(0, 4.9, 0), "S")
	make(b, "Screen", BLOCK, V(2.8, 2.0, 0.1), CF(0, 4.9, -1.11), "E", NEON, { Type = "flicker", Speed = 0.6 })
	make(b, "Eye", BLOCK, V(0.45, 0.45, 0.06), CF(-0.55, 5.15, -1.18), C(10, 10, 15))
	make(b, "Eye", BLOCK, V(0.45, 0.45, 0.06), CF(0.55, 5.15, -1.18), C(10, 10, 15))
	make(b, "Mouth", BLOCK, V(1.3, 0.15, 0.06), CF(0, 4.45, -1.18), C(10, 10, 15))
	for x = -1, 1, 2 do
		local theta = x > 0 and math.rad(60) or math.rad(120)
		local dir = V(math.cos(theta), math.sin(theta), 0)
		local base = V(x * 0.4, 6.2, 0)
		local mid = base + dir * 0.9
		make(b, "Antenna", CYL, V(1.8, 0.12, 0.12), CF(mid) * ANG(0, 0, theta), C(160, 160, 170), Enum.Material.Metal)
		make(b, "AntennaTip", BALL, V(0.4, 0.4, 0.4), CF(base + dir * 1.8), "E", NEON, { Type = "pulse", Speed = 5, Amp = 0.3, Phase = x })
	end
end

function Archetypes.hungrycube(b)
	b.h = 4.6
	b.model:SetAttribute("BobAmp", 0.25)
	for x = -1, 1, 2 do
		for z = -1, 1, 2 do
			make(b, "Leg", BLOCK, V(0.5, 0.8, 0.5), CF(x * 1.1, 0.4, z * 1.1), "S")
		end
	end
	make(b, "Body", BLOCK, V(3.2, 2.4, 3.2), CF(0, 2.0, 0), "P")
	make(b, "Inside", BLOCK, V(2.9, 0.3, 2.9), CF(0, 3.1, 0), C(130, 10, 30), NEON)
	for i = -1, 1 do
		make(b, "Tooth", BLOCK, V(0.45, 0.5, 0.25), CF(i * 1.0, 3.4, -1.42), C(250, 250, 240))
	end
	local lid = { Type = "swing", Pivot = V(0, 3.2, 1.6), Axis = V(1, 0, 0), Speed = 2.5, Amp = 0.45, Bias = 0.45 }
	make(b, "Lid", BLOCK, V(3.3, 0.8, 3.3), CF(0, 3.6, 0), "P", nil, lid)
	for i = -2, 1 do
		make(b, "Tooth", BLOCK, V(0.4, 0.45, 0.25), CF(i * 1.0 + 0.5, 3.0, -1.45), C(250, 250, 240), nil, lid)
	end
	for x = -1, 1, 2 do
		make(b, "Eye", BALL, V(0.75, 0.75, 0.75), CF(x * 0.8, 4.1, -1.5), "E", NEON, lid)
		make(b, "Pupil", BALL, V(0.32, 0.32, 0.32), CF(x * 0.8, 4.1, -1.85), C(10, 10, 10), nil, lid)
	end
end

function Archetypes.jelly(b)
	b.h = 6.6
	b.model:SetAttribute("BobAmp", 0.7)
	b.model:SetAttribute("BobSpeed", 1.6)
	make(b, "Dome", BALL, V(3.8, 3.8, 3.8), CF(0, 4.6, 0), "P", Enum.Material.Glass, nil, 0.3)
	make(b, "Core", BALL, V(1.6, 1.6, 1.6), CF(0, 4.7, 0), "E", NEON, { Type = "pulse", Speed = 3, Amp = 0.18 })
	make(b, "Skirt", CYL, V(0.5, 3.9, 3.9), CF(0, 3.4, 0) * UP, "S")
	for i = 1, 7 do
		local a = i / 7 * TAU
		make(b, "Tentacle", CYL, V(2.8, 0.28, 0.28), CF(math.cos(a) * 1.3, 1.9, math.sin(a) * 1.3) * UP, "S", NEON, { Type = "wiggle", Speed = 2.5, Amp = 0.3, Phase = i })
	end
	for x = -1, 1, 2 do
		make(b, "Eye", BALL, V(0.6, 0.6, 0.6), CF(x * 0.7, 4.8, -1.65), "E", NEON)
	end
end

function Archetypes.twocat(b)
	b.h = 4.6
	b.model:SetAttribute("BobAmp", 0.15)
	make(b, "Body", BLOCK, V(1.7, 1.5, 3.0), CF(0, 1.9, 0.3), "P")
	for x = -1, 1, 2 do
		for z = -1, 1, 2 do
			make(b, "Leg", BLOCK, V(0.45, 1.2, 0.45), CF(x * 0.55, 0.6, 0.3 + z * 1.1), "P", nil, { Type = "swing", Pivot = V(x * 0.55, 1.2, 0.3 + z * 1.1), Axis = V(1, 0, 0), Speed = 6, Amp = 0.25, Phase = x * z })
		end
	end
	make(b, "Stripe", BLOCK, V(1.75, 0.3, 0.4), CF(0, 2.3, 0.8), "S")
	make(b, "Stripe", BLOCK, V(1.75, 0.3, 0.4), CF(0, 2.3, -0.2), "S")
	make(b, "Tail", BLOCK, V(0.3, 2.0, 0.3), CF(0, 3.0, 2.0) * ANG(0.5, 0, 0), "S", nil, { Type = "swing", Pivot = V(0, 2.3, 1.75), Axis = V(0, 0, 1), Speed = 3, Amp = 0.45 })
	for x = -1, 1, 2 do
		local hx = x * 0.75
		local anim = { Type = "swing", Pivot = V(hx, 2.6, -1.2), Axis = V(0, 0, 1), Speed = 2, Amp = 0.25, Phase = x * 1.5 }
		make(b, "Head", BLOCK, V(1.3, 1.2, 1.2), CF(hx, 3.1, -1.4), "P", nil, anim)
		make(b, "Ear", BLOCK, V(0.35, 0.5, 0.2), CF(hx - 0.35, 3.85, -1.4) * ANG(0, 0, 0.3), "S", nil, anim)
		make(b, "Ear", BLOCK, V(0.35, 0.5, 0.2), CF(hx + 0.35, 3.85, -1.4) * ANG(0, 0, -0.3), "S", nil, anim)
		make(b, "Eye", BLOCK, V(0.25, 0.3, 0.06), CF(hx - 0.3, 3.2, -2.01), "E", NEON, anim)
		make(b, "Eye", BLOCK, V(0.25, 0.3, 0.06), CF(hx + 0.3, 3.2, -2.01), "E", NEON, anim)
		make(b, "Nose", BLOCK, V(0.2, 0.15, 0.06), CF(hx, 2.95, -2.01), C(255, 140, 160), nil, anim)
	end
end

function Archetypes.longneck(b)
	b.h = 9.2
	b.model:SetAttribute("BobAmp", 0.1)
	for x = -1, 1, 2 do
		make(b, "Leg", BLOCK, V(0.45, 2.6, 0.45), CF(x * 0.4, 1.3, 0), "P", nil, { Type = "swing", Pivot = V(x * 0.4, 2.6, 0), Axis = V(1, 0, 0), Speed = 3, Amp = 0.15, Phase = x * 1.5 })
	end
	make(b, "Torso", BLOCK, V(1.5, 2.0, 0.75), CF(0, 3.6, 0), "P")
	for x = -1, 1, 2 do
		make(b, "Arm", BLOCK, V(0.32, 3.6, 0.32), CF(x * 0.95, 2.9, 0), "P", nil, { Type = "swing", Pivot = V(x * 0.95, 4.5, 0), Axis = V(1, 0, 0), Speed = 1.5, Amp = 0.15, Phase = x * 2 })
	end
	local neck = { Type = "swing", Pivot = V(0, 4.6, 0), Axis = V(0, 0, 1), Speed = 1.2, Amp = 0.14 }
	make(b, "Neck", CYL, V(3.4, 0.35, 0.35), CF(0, 6.3, 0) * UP, "P", nil, neck)
	make(b, "Head", BLOCK, V(1.0, 1.2, 0.9), CF(0, 8.5, 0), "S", nil, neck)
	make(b, "Eye", BLOCK, V(0.2, 0.32, 0.06), CF(-0.22, 8.65, -0.46), C(10, 10, 10), nil, neck)
	make(b, "Eye", BLOCK, V(0.2, 0.32, 0.06), CF(0.22, 8.65, -0.46), C(10, 10, 10), nil, neck)
	make(b, "Mouth", BLOCK, V(0.5, 0.1, 0.06), CF(0, 8.15, -0.46), C(10, 10, 10), nil, neck)
end

function Archetypes.clock(b)
	b.h = 6.8
	b.model:SetAttribute("BobAmp", 0.2)
	for x = -1, 1, 2 do
		make(b, "Leg", BLOCK, V(0.3, 2.4, 0.3), CF(x * 0.75, 1.2, 0), "P", Enum.Material.Metal, { Type = "swing", Pivot = V(x * 0.75, 2.4, 0), Axis = V(1, 0, 0), Speed = 5, Amp = 0.25, Phase = x * 1.5 })
	end
	make(b, "Rim", CYL, V(0.5, 4.6, 4.6), CF(0, 4.4, 0.15) * FACE, "P", Enum.Material.Metal)
	make(b, "Face", CYL, V(0.3, 4.0, 4.0), CF(0, 4.4, -0.15) * FACE, "S")
	for i = 0, 11 do
		local a = i / 12 * TAU
		make(b, "Tick", BLOCK, V(0.18, i % 3 == 0 and 0.6 or 0.3, 0.06), CF(math.sin(a) * 1.65, 4.4 + math.cos(a) * 1.65, -0.32) * ANG(0, 0, -a), C(30, 30, 30))
	end
	make(b, "Hand", BLOCK, V(0.22, 1.2, 0.06), CF(0, 5.0, -0.36), C(20, 20, 20), nil, { Type = "rot", Pivot = V(0, 4.4, -0.36), Axis = V(0, 0, 1), Speed = -0.8 })
	make(b, "Hand", BLOCK, V(0.14, 1.7, 0.06), CF(0, 5.25, -0.4), "E", NEON, { Type = "rot", Pivot = V(0, 4.4, -0.4), Axis = V(0, 0, 1), Speed = -3 })
	make(b, "Eye", BALL, V(0.7, 0.7, 0.7), CF(0, 4.4, -0.35), "E", NEON)
	local pend = { Type = "swing", Pivot = V(0, 2.4, 0.3), Axis = V(0, 0, 1), Speed = 2.5, Amp = 0.5 }
	make(b, "Rod", BLOCK, V(0.12, 1.4, 0.12), CF(0, 1.7, 0.3), "P", Enum.Material.Metal, pend)
	make(b, "Weight", BALL, V(0.7, 0.7, 0.7), CF(0, 0.9, 0.3), "P", Enum.Material.Metal, pend)
end

function Archetypes.tree(b)
	b.h = 7.6
	b.model:SetAttribute("BobAmp", 0.05)
	make(b, "Trunk", CYL, V(4.0, 1.3, 1.3), CF(0, 2.0, 0) * UP, "P", Enum.Material.Wood)
	for x = -1, 1, 2 do
		make(b, "Root", BLOCK, V(0.4, 0.4, 1.6), CF(x * 0.6, 0.2, 0) * ANG(0, x * 0.6, 0), "P", Enum.Material.Wood)
		make(b, "Branch", BLOCK, V(0.35, 1.8, 0.35), CF(x * 0.9, 4.3, 0) * ANG(0, 0, -x * 0.7), "P", Enum.Material.Wood)
	end
	make(b, "Eye", BALL, V(0.3, 0.3, 0.3), CF(-0.3, 3.2, -0.62), C(10, 10, 10))
	make(b, "Eye", BALL, V(0.3, 0.3, 0.3), CF(0.3, 3.2, -0.62), C(10, 10, 10))
	make(b, "Mouth", BLOCK, V(0.6, 0.25, 0.1), CF(0, 2.6, -0.64), C(10, 10, 10))
	local sway = { Type = "swing", Pivot = V(0, 4, 0), Axis = V(0, 0, 1), Speed = 1.3, Amp = 0.07 }
	make(b, "Leaves", BALL, V(3.2, 3.2, 3.2), CF(0, 5.6, 0), "S", Enum.Material.Grass, sway)
	make(b, "Leaves", BALL, V(2.2, 2.2, 2.2), CF(-1.5, 5.0, 0.2), "S", Enum.Material.Grass, sway)
	make(b, "Leaves", BALL, V(2.2, 2.2, 2.2), CF(1.5, 5.0, 0.2), "S", Enum.Material.Grass, sway)
	make(b, "Leaves", BALL, V(2.0, 2.0, 2.0), CF(0, 6.6, 0.5), "S", Enum.Material.Grass, sway)
	make(b, "Eye", BALL, V(0.45, 0.45, 0.45), CF(-0.6, 5.7, -1.5), "E", NEON, sway)
	make(b, "Eye", BALL, V(0.45, 0.45, 0.45), CF(0.6, 5.7, -1.5), "E", NEON, sway)
	make(b, "Eye", BALL, V(0.4, 0.4, 0.4), CF(1.5, 5.0, -0.85), "E", NEON, sway)
	for i = 1, 3 do
		local a = i / 3 * TAU
		make(b, "Firefly", BALL, V(0.25, 0.25, 0.25), CF(math.cos(a) * 2.4, 4.2 + i * 0.4, math.sin(a) * 2.4), "E", NEON, { Type = "rot", Pivot = V(0, 4.5, 0), Axis = V(0, 1, 0), Speed = 1 })
	end
end

function Archetypes.faceless(b)
	b.h = 6.2
	b.model:SetAttribute("BobAmp", 0.08)
	for x = -1, 1, 2 do
		make(b, "Leg", BLOCK, V(0.6, 2.2, 0.6), CF(x * 0.4, 1.1, 0), "P", nil, { Type = "swing", Pivot = V(x * 0.4, 2.2, 0), Axis = V(1, 0, 0), Speed = 3, Amp = 0.15, Phase = x * 1.5 })
	end
	make(b, "Torso", BLOCK, V(1.8, 2.1, 0.9), CF(0, 3.25, 0), "P")
	make(b, "Shirt", BLOCK, V(0.5, 1.6, 0.05), CF(0, 3.5, -0.47), C(240, 240, 240))
	make(b, "Tie", BLOCK, V(0.22, 1.3, 0.06), CF(0, 3.4, -0.5), "E")
	for x = -1, 1, 2 do
		make(b, "Arm", BLOCK, V(0.5, 2.4, 0.5), CF(x * 1.15, 3.1, 0), "P", nil, { Type = "swing", Pivot = V(x * 1.15, 4.2, 0), Axis = V(1, 0, 0), Speed = 1.2, Amp = 0.1, Phase = x })
	end
	make(b, "Head", BALL, V(1.5, 1.5, 1.5), CF(0, 5.05, 0), "S")
	for i = 1, 4 do
		local x = (i <= 2) and -1 or 1
		local k = i % 2
		make(b, "Tendril", BLOCK, V(0.2, 3.0, 0.2), CF(x * 0.5, 4.3, 0.55) * ANG(0.4, 0, -x * (0.45 + k * 0.45)) * CF(0, 1.5, 0), C(15, 15, 18), nil, { Type = "wiggle", Speed = 2, Amp = 0.2, Phase = i })
	end
end

function Archetypes.skinwalker(b)
	b.h = 6.6
	b.model:SetAttribute("BobAmp", 0.12)
	make(b, "Body", BLOCK, V(1.3, 1.3, 3.8), CF(0, 3.4, 0.4), "P")
	for x = -1, 1, 2 do
		for _, z in ipairs({ -1.1, 1.9 }) do
			make(b, "Leg", BLOCK, V(0.32, 3.0, 0.32), CF(x * 0.5, 1.5, z), "P", nil, { Type = "swing", Pivot = V(x * 0.5, 3.0, z), Axis = V(1, 0, 0), Speed = 5, Amp = 0.3, Phase = x * (z > 0 and 1 or -1) * 1.5 })
		end
	end
	for i = 0, 3 do
		make(b, "Spine", BLOCK, V(0.2, 0.6, 0.2), CF(0, 4.2, -0.8 + i * 0.9), "S")
	end
	local head = { Type = "swing", Pivot = V(0, 3.9, -1.4), Axis = V(0, 1, 0), Speed = 1.1, Amp = 0.35 }
	make(b, "Neck", BLOCK, V(0.5, 0.5, 1.4), CF(0, 4.3, -1.9) * ANG(0.6, 0, 0), "P", nil, head)
	make(b, "Skull", BLOCK, V(0.9, 0.9, 1.5), CF(0, 4.7, -2.8), "S", nil, head)
	make(b, "Eye", BALL, V(0.35, 0.35, 0.35), CF(-0.3, 4.85, -3.5), "E", NEON, head)
	make(b, "Eye", BALL, V(0.35, 0.35, 0.35), CF(0.3, 4.85, -3.5), "E", NEON, head)
	for x = -1, 1, 2 do
		make(b, "Antler", BLOCK, V(0.15, 1.4, 0.15), CF(x * 0.45, 5.6, -2.6) * ANG(0, 0, -x * 0.5), "S", nil, head)
		make(b, "Antler", BLOCK, V(0.12, 0.8, 0.12), CF(x * 0.85, 6.0, -2.6) * ANG(0, 0, -x * 1.1), "S", nil, head)
	end
end

function Archetypes.angel(b)
	b.h = 7.0
	b.model:SetAttribute("BobAmp", 0.6)
	b.model:SetAttribute("BobSpeed", 1.4)
	make(b, "Robe", BLOCK, V(1.8, 3.2, 1.1), CF(0, 2.8, 0), "S")
	make(b, "Hem", CYL, V(0.5, 2.4, 2.4), CF(0, 1.3, 0) * UP, "S")
	make(b, "Head", BALL, V(1.3, 1.3, 1.3), CF(0, 5.05, 0), "P")
	make(b, "Eye", BLOCK, V(0.22, 0.22, 0.06), CF(-0.25, 5.15, -0.62), "E", NEON)
	make(b, "Eye", BLOCK, V(0.22, 0.22, 0.06), CF(0.25, 5.15, -0.62), "E", NEON)
	for i = 0, 9 do
		local a = i / 10 * TAU
		make(b, "Halo", BLOCK, V(0.5, 0.15, 0.2), CF(math.cos(a) * 0.85, 6.0, math.sin(a) * 0.85) * ANG(0, -a + math.pi / 2, 0), "E", NEON, { Type = "rot", Pivot = V(0, 6.0, 0), Axis = V(0, 1, 0), Speed = 1.5 })
	end
	for x = -1, 1, 2 do
		local flap = { Type = "swing", Pivot = V(x * 0.8, 4.0, 0.75), Axis = V(0, x, 0), Speed = 3, Amp = 0.35 }
		for j = 1, 3 do
			make(b, "Wing", BLOCK, V(0.2, 3.0 - j * 0.5, 0.9), CF(x * (0.7 + j * 0.55), 3.9 + j * 0.25, 0.8) * ANG(0, 0, -x * (0.25 + j * 0.25)), "S", nil, flap)
		end
	end
	for i = 1, 3 do
		local a = i / 3 * TAU
		make(b, "Glitch", BLOCK, V(0.35, 0.35, 0.35), CF(math.cos(a) * 1.6, 3 + i * 0.8, math.sin(a) * 1.6), C(255, 0, 200), NEON, { Type = "flicker", Speed = 1.5 })
	end
end

function Archetypes.smile(b)
	b.h = 7.2
	b.model:SetAttribute("BobAmp", 0.7)
	b.model:SetAttribute("BobSpeed", 1.1)
	local center = V(0, 4.6, 0)
	local r = 2.2
	make(b, "Moon", BALL, V(4.4, 4.4, 4.4), CF(center), "P", Enum.Material.Slate)
	for _, d in ipairs({ V(1.2, 1.2, -1.4), V(-1.5, -0.6, -1.2), V(1.6, -1.0, 0.6), V(-0.6, 1.6, 1.2) }) do
		make(b, "Crater", CYL, V(0.15, 0.8, 0.8), onSphere(center, r, d), "S")
	end
	for x = -1, 1, 2 do
		make(b, "Socket", CYL, V(0.15, 0.95, 0.95), onSphere(center, r, V(x * 0.75, 0.7, -1.95)), C(10, 10, 12))
		make(b, "Eye", CYL, V(0.18, 0.35, 0.35), onSphere(center, r + 0.03, V(x * 0.75, 0.7, -1.95)), "E", NEON)
	end
	for i = -4, 4 do
		local x = i * 0.32
		local y = -0.35 - (1 - (i / 4) ^ 2) * 0.45
		local z = -math.sqrt(math.max(0, r * r - x * x - y * y)) - 0.02
		local p = center + V(x, y, z)
		make(b, "Mouth", BLOCK, V(0.34, 0.2, 0.1), CF(p) * ANG(0, 0, -i * 0.12), C(220, 20, 40), NEON)
		if i % 2 == 0 then
			make(b, "Tooth", BLOCK, V(0.18, 0.18, 0.08), CF(p + V(0, 0.16, -0.01)), C(250, 250, 240))
		end
	end
	for i = 1, 4 do
		local a = i / 4 * TAU
		make(b, "Star", BALL, V(0.45, 0.45, 0.45), CF(math.cos(a) * 3.2, 4 + (i % 2) * 1.4, math.sin(a) * 3.2), "E", NEON, { Type = "rot", Pivot = center, Axis = V(0, 1, 0), Speed = 0.9 })
	end
end

function Archetypes.error404(b)
	b.h = 7.0
	b.model:SetAttribute("BobAmp", 0.5)
	local center = V(0, 4.4, 0)
	make(b, "Core", BLOCK, V(2.2, 2.2, 2.2), CF(center) * ANG(0.3, 0.6, 0.2), "P", nil, { Type = "rot", Pivot = center, Axis = V(0.3, 1, 0.2), Speed = 0.6 })
	make(b, "Eye", BLOCK, V(0.45, 0.45, 0.1), CF(-0.45, 4.7, -1.4), "E", NEON, { Type = "flicker", Speed = 0.3 })
	make(b, "Eye", BLOCK, V(0.45, 0.45, 0.1), CF(0.45, 4.7, -1.4), "E", NEON, { Type = "flicker", Speed = 0.3 })
	for i = -2, 2 do
		make(b, "Mouth", BLOCK, V(0.25, 0.2, 0.1), CF(i * 0.25, 4.05 + (i % 2) * 0.15, -1.4), "S", NEON)
	end
	local cubes = {
		{ 0.9, 2.4, 3.2, "S", 1.2 }, { 0.6, 2.8, 5.6, "E", -1.6 }, { 0.7, 2.2, 4.4, "P", 0.9 },
		{ 0.5, 3.0, 2.6, "S", -2.1 }, { 1.0, 2.6, 6.0, "E", 1.4 }, { 0.45, 2.0, 5.0, "S", 2.4 },
		{ 0.8, 3.1, 3.8, "P", -1.1 }, { 0.55, 2.5, 2.2, "E", 1.8 },
	}
	for i, c in ipairs(cubes) do
		local a = i / #cubes * TAU
		local mat = c[4] == "P" and SMOOTH or NEON
		local anim = { Type = "rot", Pivot = center, Axis = (i % 2 == 0) and V(0, 1, 0) or V(0.4, 1, 0).Unit, Speed = c[5] }
		make(b, "Shard", BLOCK, V(c[1], c[1], c[1]), CF(math.cos(a) * c[2], c[3], math.sin(a) * c[2]) * ANG(a, a * 2, 0), c[4], mat, anim)
	end
	for i = 1, 3 do
		make(b, "Scanline", BLOCK, V(3.6, 0.08, 0.08), CF(0, 3.4 + i * 0.6, -1.8), "S", NEON, { Type = "flicker", Speed = 2 })
	end
end

function Archetypes.entity(b)
	b.h = 8.0
	b.model:SetAttribute("BobAmp", 0.6)
	b.model:SetAttribute("BobSpeed", 0.9)
	local center = V(0, 4.8, 0)
	make(b, "Core", BALL, V(2.6, 2.6, 2.6), CF(center), "P", NEON)
	make(b, "Aura", BALL, V(3.6, 3.6, 3.6), CF(center), "E", Enum.Material.ForceField, { Type = "pulse", Speed = 2, Amp = 0.12 })
	make(b, "Eye", BALL, V(0.95, 0.95, 0.95), CF(0, 4.8, -1.0), "S")
	make(b, "Pupil", BALL, V(0.45, 0.45, 0.45), CF(0, 4.8, -1.4), "E", NEON)
	for i = 1, 8 do
		local a = i / 8 * TAU
		local anim = { Type = "rot", Pivot = center, Axis = V(0, 1, 0), Speed = 0.9 }
		make(b, "Eye", BALL, V(0.7, 0.7, 0.7), CF(math.cos(a) * 2.8, 4.8, math.sin(a) * 2.8), "S", nil, anim)
		make(b, "Iris", BALL, V(0.35, 0.35, 0.35), CF(math.cos(a) * 3.08, 4.8, math.sin(a) * 3.08), "E", NEON, anim)
	end
	for i = 1, 6 do
		local a = i / 6 * TAU
		make(b, "Orbit", BLOCK, V(0.4, 0.4, 0.4), CF(math.cos(a) * 2.2, 4.8 + math.sin(a) * 2.2, 0), "E", NEON, { Type = "rot", Pivot = center, Axis = V(0, 0, 1), Speed = -1.4 })
	end
	for i = 1, 6 do
		local a = i / 6 * TAU
		make(b, "Tentacle", BLOCK, V(0.3, 2.6, 0.3), CF(math.cos(a) * 0.8, 2.4, math.sin(a) * 0.8), "P", NEON, { Type = "wiggle", Speed = 2.2, Amp = 0.35, Phase = i })
	end
end

local function addEmitter(att, texture, color, rate, size, speed)
	local e = Instance.new("ParticleEmitter")
	e.Texture = texture
	e.Color = ColorSequence.new(color)
	e.Rate = rate
	e.Lifetime = NumberRange.new(1, 2)
	e.Speed = NumberRange.new(speed or 1.5)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, size), NumberSequenceKeypoint.new(1, 0) })
	e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) })
	e.LightEmission = 1
	e.Parent = att
	return e
end

local function applyMutation(b, mut)
	if not mut then
		return
	end
	b.model:SetAttribute("Mut", mut)
	for _, p in ipairs(b.parts) do
		local role = p:GetAttribute("Role")
		if mut == "Dorado" then
			if role == "P" then
				p.Color = C(255, 200, 50)
				p.Material = Enum.Material.Foil
			elseif role == "S" then
				p.Color = C(205, 150, 30)
				p.Material = Enum.Material.Metal
			end
		elseif mut == "Glitch" then
			if role == "E" then
				p.Color = C(255, 0, 200)
			elseif (role == "P" or role == "S") and math.random() < 0.3 and not p:GetAttribute("A_Type") then
				p:SetAttribute("A_Type", "flicker")
				p:SetAttribute("A_Speed", 0.8)
			end
		elseif mut == "Vacio" then
			if role == "P" then
				p.Color = C(20, 10, 35)
				p.Material = SMOOTH
			elseif role == "S" then
				p.Color = C(60, 25, 105)
				p.Material = SMOOTH
			elseif role == "E" then
				p.Color = C(190, 100, 255)
			end
		elseif mut == "Espectral" then
			if role == "P" or role == "S" then
				p.Material = Enum.Material.Glass
				p.Transparency = 0.25
				p:SetAttribute("BaseT", 0.25)
			end
		end
	end
	local m = Config.MutationById[mut]
	if mut == "Glitch" then
		b.model:SetAttribute("Glitch", true)
	elseif mut == "Espectral" then
		b.model:SetAttribute("Rainbow", true)
		addEmitter(b.fx, TEX_SPARK, m.Color, 8, 0.6, 2)
	elseif mut == "Dorado" then
		addEmitter(b.fx, TEX_SPARK, m.Color, 5, 0.5, 1.5)
	elseif mut == "Vacio" then
		local e = addEmitter(b.fx, TEX_SMOKE, m.Color, 6, 1.6, 1)
		e.LightEmission = 0.4
	end
end

-- Pistas visuales de los Imitadores (lo que el jugador atento puede notar)
local function applyTell(b, tell)
	if tell == "redeyes" then
		local found = false
		for _, p in ipairs(b.parts) do
			if p.Name == "Eye" then
				p.Color = C(255, 20, 20)
				p.Material = NEON
				found = true
			end
		end
		if not found then
			tell = "wrongcolor"
		end
	end
	if tell == "noshadow" then
		for _, p in ipairs(b.parts) do
			p.CastShadow = false
		end
		b.model:SetAttribute("TellFlicker", true)
	elseif tell == "inverted" then
		b.model:SetAttribute("Inverted", true)
	elseif tell == "flicker" then
		b.model:SetAttribute("TellFlicker", true)
	elseif tell == "wrongcolor" then
		for _, p in ipairs(b.parts) do
			if p:GetAttribute("Role") == "P" then
				local c = p.Color
				p.Color = Color3.new(1 - c.R, 1 - c.G, 1 - c.B)
			end
		end
	end
end

-- Construye una anomalía. opts: { Tell = string?, NoFx = bool? }
function Builder.Build(id, mut, opts)
	opts = opts or {}
	local def = AnomalyData.ById[id]
	assert(def, "Anomalía desconocida: " .. tostring(id))
	local rarity = Config.RarityById[def.Rarity]

	local model = Instance.new("Model")
	model.Name = def.Name

	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = V(2, 0.2, 2)
	root.Transparency = 1
	root.Anchored = true
	root.CanCollide = false
	root.CanTouch = false
	root.CanQuery = false
	root.CFrame = CFrame.new()
	root.Parent = model
	model.PrimaryPart = root

	local b = { model = model, root = root, parts = {}, s = def.Scale or 1, P = def.P, S = def.S, E = def.E, h = 6 }

	local fx = Instance.new("Attachment")
	fx.Name = "FX"
	fx.Parent = root
	b.fx = fx

	Archetypes[def.Archetype](b)

	make(b, "RarityRing", CYL, V(0.1, 4.6, 4.6), CF(0, 0.08, 0) * UP, rarity.Color, NEON, { Type = "pulse", Speed = 2, Amp = 0.08 }, 0.45)

	local height = b.h * b.s
	fx.Position = V(0, height * 0.5, 0)
	local promptAtt = Instance.new("Attachment")
	promptAtt.Name = "PromptAtt"
	promptAtt.Position = V(0, math.min(height * 0.5, 3.5), 0)
	promptAtt.Parent = root
	local topAtt = Instance.new("Attachment")
	topAtt.Name = "Top"
	topAtt.Position = V(0, height + 0.5, 0)
	topAtt.Parent = root

	if not opts.NoFx then
		applyMutation(b, mut)
		if rarity.Order >= 4 then
			local light = Instance.new("PointLight")
			light.Color = rarity.Color
			light.Range = 12
			light.Brightness = 2
			light.Parent = fx
		end
		if rarity.Order >= 5 then
			addEmitter(fx, TEX_SPARK, rarity.Color, 10, 0.5, 3)
		end
	elseif mut then
		model:SetAttribute("Mut", mut)
	end

	if opts.Tell then
		applyTell(b, opts.Tell)
	end

	model:SetAttribute("AnomalyId", id)
	model:SetAttribute("Height", height)
	CollectionService:AddTag(model, "Anomaly")
	return model
end

-- Silueta negra para el Índice (anomalías no descubiertas)
function Builder.Silhouette(model)
	for _, d in ipairs(model:GetDescendants()) do
		if d:IsA("BasePart") then
			d.Color = C(0, 0, 0)
			d.Material = SMOOTH
			if d.Name ~= "Root" then
				d.Transparency = 0
			end
		elseif d:IsA("ParticleEmitter") or d:IsA("Light") then
			d:Destroy()
		end
	end
	local ring = model:FindFirstChild("RarityRing")
	if ring then
		ring.Transparency = 1
	end
end

return Builder
