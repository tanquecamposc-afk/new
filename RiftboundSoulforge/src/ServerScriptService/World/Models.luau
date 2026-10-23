--!strict
-- Procedural character models: enemies, the Fracture Warden, the katana and resource nodes.
-- Gameplay code only relies on: HumanoidRootPart, Humanoid, the "HealthBar" billboard,
-- and named parts "WeakPoint" / "Blade" / "Vein*". Replace with authored models freely.
-- Creatures are sculpted from stretched ellipsoids (SpecialMesh spheres) and wedge spikes so
-- silhouettes read as muscles, plates and horns instead of boxes and balls.

local Build = require(script.Parent.Build)

local Models = {}

local function weldTo(part: BasePart, root: BasePart)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = root
	weld.Part1 = part
	weld.Parent = part
end

-- Turns a freshly built anchored part into a massless, welded, non-colliding body piece.
local function attach(part: BasePart, root: BasePart): BasePart
	part.Anchored = false
	part.Massless = true
	part.CanCollide = false
	part.CanTouch = false
	weldTo(part, root)
	return part
end

-- Small sculpting kit bound to one rig: every offset is relative to the ground point `g`.
local function sculptor(model: Model, root: BasePart, g: CFrame, s: number)
	local k = {}
	-- Ellipsoid "muscle" at offset (x, y, z) in rig units, optional rotation in degrees.
	function k.blob(name: string, size: Vector3, x: number, y: number, z: number, color: Color3, material: Enum.Material?, rx: number?, ry: number?, rz: number?): BasePart
		local cf = g * CFrame.new(x * s, y * s, z * s) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
		return attach(Build.ellipsoid(model, { size = size * s, cframe = cf, color = color, material = material or Enum.Material.SmoothPlastic, name = name, collide = false }), root)
	end
	-- Tapered horn / claw / shard rising along the rotated local +Y.
	function k.spike(name: string, width: number, h: number, x: number, y: number, z: number, color: Color3, material: Enum.Material?, rx: number?, ry: number?, rz: number?)
		local cf = g * CFrame.new(x * s, y * s, z * s) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
		for _, part in Build.spike(model, cf, width * s, h * s, { color = color, material = material or Enum.Material.SmoothPlastic, name = name, collide = false, castShadow = material ~= Enum.Material.Neon }) do
			attach(part, root)
		end
	end
	-- Sharp-edged plate (armour, blade) built from a wedge ridge.
	function k.ridge(name: string, width: number, h: number, depth: number, x: number, y: number, z: number, color: Color3, material: Enum.Material?, rx: number?, ry: number?, rz: number?)
		local cf = g * CFrame.new(x * s, y * s, z * s) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
		for _, part in Build.ridge(model, cf, width * s, h * s, depth * s, { color = color, material = material or Enum.Material.SmoothPlastic, name = name, collide = false }) do
			attach(part, root)
		end
	end
	function k.block(name: string, size: Vector3, x: number, y: number, z: number, color: Color3, material: Enum.Material?, rx: number?, ry: number?, rz: number?): BasePart
		local cf = g * CFrame.new(x * s, y * s, z * s) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
		return attach(Build.part(model, { size = size * s, cframe = cf, color = color, material = material or Enum.Material.SmoothPlastic, name = name, collide = false }), root)
	end
	return k
end

local function healthBar(model: Model, root: BasePart, height: number, name: string, color: Color3)
	local gui = Instance.new("BillboardGui")
	gui.Name = "HealthBar"
	gui.Adornee = root
	gui.Size = UDim2.fromOffset(150, 30)
	gui.StudsOffset = Vector3.new(0, height, 0)
	gui.MaxDistance = 80
	gui.AlwaysOnTop = false
	gui.LightInfluence = 0
	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.Size = UDim2.new(1, 0, 0.5, 0)
	title.BackgroundTransparency = 1
	title.Text = name
	title.TextScaled = true
	title.Font = Enum.Font.GothamBold
	title.TextColor3 = Color3.new(1, 1, 1)
	title.TextStrokeTransparency = 0.4
	title.Parent = gui
	local back = Instance.new("Frame")
	back.Name = "Back"
	back.Size = UDim2.new(1, 0, 0.32, 0)
	back.Position = UDim2.new(0, 0, 0.6, 0)
	back.BackgroundColor3 = Color3.fromRGB(20, 20, 26)
	back.BorderSizePixel = 0
	back.Parent = gui
	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = color
	fill.BorderSizePixel = 0
	fill.Parent = back
	gui.Parent = model
end

local function shade(c: Color3, amount: number): Color3
	return c:Lerp(Color3.new(0, 0, 0), amount)
end

-- Lean six-limbed hunter: deep chest, arched spine with glowing dorsal spines, long tail.
local function stalker(k: any, body: Color3, accent: Color3, material: Enum.Material)
	local dark = shade(body, 0.35)
	k.blob("Body", Vector3.new(2.3, 1.7, 4.6), 0, 2.6, 0.2, body, material, -6)
	k.blob("Chest", Vector3.new(2.7, 2.2, 2.4), 0, 2.85, -1.5, body, material, -10)
	k.blob("Haunch", Vector3.new(2.5, 2.0, 2.2), 0, 2.55, 1.9, body, material)
	k.blob("Belly", Vector3.new(1.6, 0.9, 3.4), 0, 2.0, 0, dark, material)
	k.blob("Neck", Vector3.new(1.2, 1.2, 2.0), 0, 3.25, -2.8, body, material, 28)
	k.blob("Head", Vector3.new(1.5, 1.2, 2.0), 0, 3.6, -3.75, body, material, -6)
	k.blob("Snout", Vector3.new(0.95, 0.65, 1.6), 0, 3.35, -4.75, dark, material, -8)
	k.blob("Jaw", Vector3.new(0.8, 0.35, 1.3), 0, 3.0, -4.55, dark, material, 6)
	for _, x in { -1, 1 } do
		k.blob("Eye", Vector3.new(0.32, 0.22, 0.5), x * 0.42, 3.75, -4.45, accent, Enum.Material.Neon, 0, x * 25, 0)
		k.spike("Ear", 0.55, 1.5, x * 0.45, 3.95, -3.45, dark, material, 55, 0, x * -20)
		k.spike("Fang", 0.22, 0.45, x * 0.25, 3.1, -5.2, Color3.fromRGB(235, 230, 220), Enum.Material.SmoothPlastic, 180)
		for _, z in { -1.6, 1.9 } do
			k.blob("Thigh", Vector3.new(0.9, 1.9, 1.2), x * 1.05, 2.0, z, body, material, if z < 0 then -15 else 20, 0, x * -8)
			k.blob("Shin", Vector3.new(0.5, 1.8, 0.55), x * 1.2, 0.85, z + (if z < 0 then -0.35 else 0.25), dark, material, if z < 0 then 12 else -18)
			k.spike("Claw", 0.45, 0.8, x * 1.2, 0.05, z - 0.5, accent, Enum.Material.Neon, -80)
		end
	end
	for i, z in { -1.8, -0.7, 0.4, 1.5 } do
		k.spike("Spine", 0.5, 1.5 - i * 0.2, 0, 3.6 - i * 0.05, z, accent, Enum.Material.Neon, 28)
	end
	for i = 1, 4 do
		local t = i / 4
		k.blob("Tail", Vector3.new(0.75 - t * 0.45, 0.75 - t * 0.45, 1.5), 0, 2.75 + t * 1.3, 2.9 + i * 1.05, body, material, -15 - t * 35)
	end
	k.spike("TailBlade", 0.6, 1.4, 0, 4.15, 7.4, accent, Enum.Material.Neon, 60)
	return 4.8
end

-- Animated keep-warden / sparring golem: heavy stone biped with plated shoulders.
local function construct(k: any, body: Color3, accent: Color3, material: Enum.Material, guardian: boolean)
	local dark = shade(body, 0.3)
	local light = body:Lerp(Color3.new(1, 1, 1), 0.12)
	for _, x in { -1, 1 } do
		k.blob("Foot", Vector3.new(1.5, 0.7, 2.0), x * 0.95, 0.35, -0.25, dark, material)
		k.blob("Shin", Vector3.new(1.3, 2.0, 1.4), x * 0.95, 1.25, 0, body, material, -4)
		k.blob("Thigh", Vector3.new(1.45, 2.0, 1.5), x * 0.9, 2.75, 0.05, body, material, 6)
		k.blob("Pauldron", Vector3.new(2.1, 1.5, 2.1), x * 2.25, 6.15, 0, light, material, 0, 0, x * -12)
		k.spike("PauldronSpike", 0.7, 1.4, x * 2.5, 6.6, 0, accent, Enum.Material.Neon, 0, 45, x * -25)
		k.blob("UpperArm", Vector3.new(1.1, 2.0, 1.1), x * 2.45, 5.0, 0.1, dark, material, 0, 0, x * 8)
		k.blob("Forearm", Vector3.new(1.35, 2.2, 1.35), x * 2.6, 3.45, -0.2, body, material, -12, 0, x * 4)
		k.blob("Fist", Vector3.new(1.5, 1.3, 1.6), x * 2.65, 2.2, -0.45, light, material)
		k.blob("Knuckle", Vector3.new(1.1, 0.25, 0.3), x * 2.65, 2.4, -1.2, accent, Enum.Material.Neon)
	end
	k.blob("Pelvis", Vector3.new(2.7, 1.3, 1.9), 0, 3.65, 0, dark, material)
	k.blob("Torso", Vector3.new(3.7, 3.1, 2.5), 0, 4.95, 0, body, material, -5)
	k.blob("Chest", Vector3.new(3.1, 1.6, 1.6), 0, 5.6, -0.55, light, material, -10)
	k.ridge("Keel", 0.5, 0.7, 1.2, 0, 4.4, -1.15, dark, material, -90)
	k.blob("Rune", Vector3.new(1.0, 1.0, 0.3), 0, 5.15, -1.28, accent, Enum.Material.Neon)
	k.blob("Back", Vector3.new(3.0, 2.4, 1.4), 0, 5.4, 0.8, dark, material)
	k.blob("Head", Vector3.new(1.4, 1.35, 1.5), 0, 6.75, -0.15, body, material)
	k.blob("Brow", Vector3.new(1.5, 0.45, 0.9), 0, 7.05, -0.5, dark, material, -15)
	k.blob("Eye", Vector3.new(1.0, 0.2, 0.35), 0, 6.85, -0.82, accent, Enum.Material.Neon)
	k.spike("Crest", 0.8, 1.6, 0, 7.2, 0.1, accent, Enum.Material.Neon, -20)
	if guardian then
		k.blob("Shield", Vector3.new(0.45, 3.6, 3.0), -3.05, 4.0, -1.0, dark, material, 0, -20, 0)
		k.blob("ShieldRim", Vector3.new(0.5, 3.0, 2.4), -3.12, 4.0, -1.05, light, material, 0, -20, 0)
		k.blob("ShieldRune", Vector3.new(0.55, 1.3, 1.1), -3.2, 4.0, -1.1, accent, Enum.Material.Neon, 0, -20, 0)
	else
		k.blob("Moss", Vector3.new(2.4, 0.5, 1.6), 0, 6.75, 0.3, Color3.fromRGB(86, 120, 60), Enum.Material.Grass)
	end
	return 7.8
end

-- Furnace beast: hunched magma bull with cracked hide, glowing vents and swept horns.
local function beast(k: any, body: Color3, accent: Color3, material: Enum.Material)
	local dark = shade(body, 0.35)
	k.blob("Body", Vector3.new(3.6, 2.9, 5.4), 0, 2.9, 0.4, body, material, -4)
	k.blob("Hump", Vector3.new(3.8, 3.4, 2.8), 0, 3.6, -1.4, body, material, -10)
	k.blob("Rump", Vector3.new(3.2, 2.6, 2.4), 0, 2.9, 2.6, body, material)
	k.blob("Head", Vector3.new(2.3, 1.9, 2.4), 0, 3.1, -3.8, body, material, 10)
	k.blob("Jaw", Vector3.new(1.9, 0.8, 1.9), 0, 2.3, -4.1, dark, material, -8)
	k.blob("Maw", Vector3.new(1.6, 0.35, 0.6), 0, 2.75, -4.85, accent, Enum.Material.Neon)
	for _, x in { -1, 1 } do
		k.blob("Eye", Vector3.new(0.4, 0.3, 0.3), x * 0.7, 3.45, -4.8, accent, Enum.Material.Neon)
		k.blob("HornBase", Vector3.new(0.8, 0.8, 1.2), x * 1.0, 3.9, -3.5, dark, material, 0, 0, x * -30)
		k.spike("Horn", 0.6, 1.9, x * 1.2, 4.0, -3.5, Color3.fromRGB(230, 210, 180), Enum.Material.SmoothPlastic, -15, 0, x * -35)
		for _, z in { -1.9, 2.3 } do
			k.blob("Leg", Vector3.new(1.4, 2.2, 1.5), x * 1.55, 1.25, z, body, material, 0, 0, x * -6)
			k.blob("Paw", Vector3.new(1.5, 0.65, 1.8), x * 1.6, 0.3, z - 0.25, dark, material)
		end
	end
	for i, z in { -2.0, -0.8, 0.5, 1.8 } do
		k.spike("Vent", 0.9, 1.3 + (i % 2) * 0.4, (i % 2 - 0.5) * 0.8, 4.6 - math.abs(z) * 0.25, z, accent, Enum.Material.Neon, 15)
	end
	for i = 1, 3 do
		k.blob("Crack", Vector3.new(3.3, 0.18, 0.35), 0, 3.0 + i * 0.35, -1.6 + i * 1.3, accent, Enum.Material.Neon, 0, 18 * (i - 2), 0)
	end
	k.blob("Tail", Vector3.new(0.7, 0.7, 2.2), 0, 3.0, 4.2, dark, material, 30)
	k.spike("TailFlame", 0.8, 1.2, 0, 2.55, 5.2, accent, Enum.Material.Neon, 110)
	return 5.4
end

local function dummy(k: any, body: Color3, accent: Color3)
	local wood = Color3.fromRGB(96, 70, 46)
	k.block("Post", Vector3.new(0.55, 6, 0.55), 0, 3, 0, wood, Enum.Material.Wood)
	k.blob("Base", Vector3.new(2.6, 0.7, 2.6), 0, 0.3, 0, Color3.fromRGB(110, 104, 96), Enum.Material.Slate)
	k.blob("Straw", Vector3.new(2.2, 3.0, 1.7), 0, 4.4, 0, body, Enum.Material.Fabric)
	k.blob("Rope", Vector3.new(2.3, 0.25, 1.8), 0, 3.6, 0, Color3.fromRGB(150, 110, 70), Enum.Material.Fabric)
	k.blob("Rope", Vector3.new(2.3, 0.25, 1.8), 0, 5.2, 0, Color3.fromRGB(150, 110, 70), Enum.Material.Fabric)
	k.block("Arms", Vector3.new(5, 0.45, 0.45), 0, 5.3, 0, wood, Enum.Material.Wood, 0, 0, 4)
	for _, x in { -1, 1 } do
		k.blob("Tuft", Vector3.new(0.7, 0.9, 0.7), x * 2.6, 5.3, 0, body, Enum.Material.Fabric)
	end
	k.blob("Head", Vector3.new(1.5, 1.6, 1.5), 0, 6.65, 0, body, Enum.Material.Fabric)
	k.blob("Target", Vector3.new(1.4, 1.4, 0.2), 0, 4.6, -0.86, accent, Enum.Material.Neon)
	k.blob("Bullseye", Vector3.new(0.6, 0.6, 0.24), 0, 4.6, -0.9, Color3.fromRGB(200, 40, 40), Enum.Material.Neon)
	return 8
end

-- Builds a standard enemy rig at `position` (ground level) facing -Z.
function Models.enemy(def: any, position: Vector3): Model
	local s = def.look.scale
	local body, accent = def.look.body, def.look.accent
	local model = Instance.new("Model")
	model.Name = def.id

	local hip = s
	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(2, 2, 2) * s
	root.Transparency = 1
	root.CanCollide = true
	root.CanTouch = false
	root.TopSurface = Enum.SurfaceType.Smooth
	root.BottomSurface = Enum.SurfaceType.Smooth
	root.CFrame = CFrame.new(position + Vector3.new(0, hip + s, 0))
	root.Parent = model
	model.PrimaryPart = root

	local g = root.CFrame * CFrame.new(0, -(hip + s), 0) -- ground point under the root
	local behaviour = def.behaviour
	local k = sculptor(model, root, g, if behaviour == "Dummy" then 1 else s)
	local material = def.look.material or Enum.Material.SmoothPlastic
	local height = 4 * s

	if behaviour == "Stalker" then
		height = stalker(k, body, accent, material) * s
	elseif behaviour == "Guardian" or behaviour == "Golem" then
		height = construct(k, body, accent, def.look.material or Enum.Material.Slate, behaviour == "Guardian") * s
	elseif behaviour == "Beast" then
		height = beast(k, body, accent, def.look.material or Enum.Material.Basalt) * s
		Build.light(model:FindFirstChild("Body") :: BasePart, accent, 14, 1.2)
	elseif behaviour == "Dummy" then
		height = dummy(k, body, accent)
	end

	local humanoid = Instance.new("Humanoid")
	humanoid.RigType = Enum.HumanoidRigType.R15 -- R15 honours HipHeight for limbless custom rigs
	humanoid.HipHeight = hip
	humanoid.WalkSpeed = def.moveSpeed
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
	humanoid.BreakJointsOnDeath = false
	humanoid.RequiresNeck = false
	humanoid:SetStateEnabled(Enum.HumanoidStateType.Dead, false)
	humanoid.Parent = model

	local barColor = if def.kind == "Champion" then Color3.fromRGB(255, 190, 60) else Color3.fromRGB(235, 70, 70)
	healthBar(model, root, height - (hip + s) + 1.5, def.displayName, barColor)
	model:SetAttribute("Height", height)
	return model
end

-- The Fracture Warden: a hulking obsidian colossus split by rift light, crystal crown,
-- crystal-studded pauldrons, a cleaver in the right hand and a rift orb in the left.
function Models.warden(position: Vector3): Model
	local model = Instance.new("Model")
	model.Name = "FractureWarden"
	local hip, half = 6, 3
	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(6, 6, 6)
	root.Transparency = 1
	root.CanCollide = true
	root.CanTouch = false
	root.CFrame = CFrame.new(position + Vector3.new(0, hip + half, 0))
	root.Parent = model
	model.PrimaryPart = root
	local g = root.CFrame * CFrame.new(0, -(hip + half), 0)
	local k = sculptor(model, root, g, 1)
	local stone = Color3.fromRGB(34, 30, 44)
	local trim = Color3.fromRGB(78, 68, 100)
	local rift = Color3.fromRGB(255, 60, 140)
	local crystal = Color3.fromRGB(150, 90, 255)
	local B, S = Enum.Material.Basalt, Enum.Material.Slate

	for _, x in { -1, 1 } do
		k.blob("Foot", Vector3.new(3.6, 1.6, 5), x * 3.2, 0.8, -0.6, trim, S)
		k.blob("Leg", Vector3.new(3.0, 4.6, 3.2), x * 3.2, 3.2, 0, stone, B, -6)
		k.blob("Thigh", Vector3.new(3.6, 4.6, 3.8), x * 3.1, 7.0, 0.2, stone, B, 8)
		k.blob("Greave", Vector3.new(3.4, 2.4, 2.2), x * 3.2, 5.2, -1.2, trim, S, -10)
		k.spike("KneeSpike", 1.2, 2.0, x * 3.2, 5.6, -2.0, crystal, Enum.Material.Neon, -70)
		-- shoulders, arms
		k.blob("Pauldron", Vector3.new(5.6, 3.6, 5.4), x * 7.2, 18.6, 0, trim, S, 0, 0, x * -14)
		k.spike("ShoulderShard", 1.6, 5.2, x * 7.6, 19.8, 0.4, crystal, Enum.Material.Neon, 10, 0, x * -24)
		k.spike("ShoulderShard", 1.1, 3.4, x * 8.6, 19.2, -1.2, crystal, Enum.Material.Neon, -20, 0, x * -48)
		k.blob("Arm", Vector3.new(3.0, 5.2, 3.0), x * 7.6, 15.0, 0, stone, B, 0, 0, x * 6)
		k.blob("Forearm", Vector3.new(3.4, 5.4, 3.4), x * 7.9, 10.6, -0.8, stone, B, -14)
		k.blob("Bracer", Vector3.new(3.8, 1.6, 3.8), x * 7.9, 11.6, -0.6, trim, S, -14)
		k.blob("Hand", Vector3.new(3.0, 2.6, 3.2), x * 8.0, 7.6, -1.5, trim, S)
	end
	k.blob("Pelvis", Vector3.new(8, 3.4, 5.2), 0, 9.6, 0, trim, S)
	k.blob("Torso", Vector3.new(10.5, 8.4, 6.6), 0, 14.6, 0, stone, B, -6)
	k.blob("Chest", Vector3.new(9, 4.2, 4.6), 0, 16.4, -1.2, stone:Lerp(trim, 0.4), B, -12)
	k.blob("Back", Vector3.new(8.4, 7, 4), 0, 15.6, 1.6, stone, B)
	for i, x in { -2.8, 0.4, 3.0 } do
		k.blob("Fracture" .. i, Vector3.new(0.45, 6.4, 0.5), x, 14.4, -3.15, rift, Enum.Material.Neon, -6, 0, 15 * (i - 2))
	end
	k.blob("Core", Vector3.new(2.6, 2.6, 0.9), 0, 15.4, -3.25, rift, Enum.Material.Neon)
	k.blob("Head", Vector3.new(3.8, 4.0, 4.2), 0, 20.6, -0.6, stone, B)
	k.blob("Jaw", Vector3.new(3.2, 1.4, 3.0), 0, 19.1, -1.2, trim, S)
	k.blob("Visor", Vector3.new(3.2, 0.55, 0.6), 0, 20.9, -2.6, rift, Enum.Material.Neon)
	k.spike("Crown", 1.2, 3.6, 0, 22.2, -0.6, crystal, Enum.Material.Neon)
	for _, x in { -1, 1 } do
		k.spike("Crown", 0.9, 2.6, x * 1.2, 21.9, -0.4, crystal, Enum.Material.Neon, -10, 0, x * -30)
		k.spike("Horn", 1.0, 3.2, x * 1.9, 21.4, 0, stone, B, -30, 0, x * -70)
	end
	-- Cleaver in the right hand: long, chipped, rift-edged
	k.blob("CleaverHilt", Vector3.new(1, 4.4, 1), 8.0, 7.2, -1.6, trim, S)
	k.block("Cleaver", Vector3.new(0.9, 13, 4.6), 8.0, 1.6, -3.6, Color3.fromRGB(58, 54, 70), Enum.Material.Metal, -20)
	k.block("CleaverEdge", Vector3.new(1.0, 13, 0.5), 8.0, 2.0, -6.1, rift, Enum.Material.Neon, -20)
	-- Rift orb in the left hand, caged by crystal shards
	local orb = k.blob("RiftOrb", Vector3.new(3, 3, 3), -8.0, 8.4, -1.4, crystal, Enum.Material.Neon)
	Build.light(orb, crystal, 20, 2)
	for i = 1, 3 do
		local a = i * 120
		k.spike("OrbShard", 0.6, 2.4, -8.0 + math.cos(math.rad(a)) * 1.6, 7.6, -1.4 + math.sin(math.rad(a)) * 1.6, crystal, Enum.Material.Neon, math.sin(math.rad(a)) * 25, 0, -math.cos(math.rad(a)) * 25)
	end
	-- Weak point: crystal growth on the back (dim until exposed)
	local weak = k.blob("WeakPoint", Vector3.new(3.4, 5, 1.8), 0, 15.2, 3.7, Color3.fromRGB(255, 230, 120), Enum.Material.Neon)
	weak.Transparency = 0.75
	Build.light(weak, Color3.fromRGB(255, 220, 120), 16, 0)
	for i, x in { -1.6, 0, 1.6 } do
		k.spike("BackShard", 0.9, 2.6 - math.abs(x) * 0.4, x, 17.4 + (i % 2) * 0.4, 3.0, crystal, Enum.Material.Neon, 35, 0, -x * 12)
	end
	Build.particles(model:FindFirstChild("Torso") :: BasePart, rift, 8, {
		speed = NumberRange.new(2, 5),
		lifetime = NumberRange.new(0.6, 1.2),
		size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0) }),
	})

	local humanoid = Instance.new("Humanoid")
	humanoid.RigType = Enum.HumanoidRigType.R15 -- R15 honours HipHeight for limbless custom rigs
	humanoid.HipHeight = hip
	humanoid.WalkSpeed = 13
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
	humanoid.BreakJointsOnDeath = false
	humanoid.RequiresNeck = false
	humanoid:SetStateEnabled(Enum.HumanoidStateType.Dead, false)
	humanoid.Parent = model
	model:SetAttribute("Height", 25)
	return model
end

-- Katana welded to a character's right hand. Returns the model (trail disabled by default).
function Models.katana(character: Model, trailColor: Color3): Model?
	local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
	if not hand or not hand:IsA("BasePart") then
		return nil
	end
	local old = character:FindFirstChild("Katana")
	if old then
		old:Destroy()
	end
	local isR6 = hand.Name == "Right Arm"
	local grip = hand.CFrame * CFrame.new(0, if isR6 then -1 else -0.2, 0)
	local model = Instance.new("Model")
	model.Name = "Katana"
	local function piece(name: string, size: Vector3, offset: CFrame, color: Color3, material: Enum.Material): BasePart
		local part = Instance.new("Part")
		part.Name = name
		part.Size = size
		part.CFrame = grip * offset
		part.Color = color
		part.Material = material
		part.CanCollide = false
		part.CanQuery = false
		part.CanTouch = false
		part.Massless = true
		part.CastShadow = false
		part.TopSurface = Enum.SurfaceType.Smooth
		part.BottomSurface = Enum.SurfaceType.Smooth
		part.Parent = model
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = hand :: BasePart
		weld.Part1 = part
		weld.Parent = part
		return part
	end
	-- Handle: dark wrap with diamond-pattern bands, gold pommel
	piece("Handle", Vector3.new(0.3, 0.3, 1.5), CFrame.new(0, 0, 0), Color3.fromRGB(30, 22, 36), Enum.Material.Fabric)
	for i = -2, 2 do
		piece("Wrap", Vector3.new(0.33, 0.33, 0.08), CFrame.new(0, 0, i * 0.28) * CFrame.Angles(0, 0, math.rad(45)), Color3.fromRGB(150, 30, 50), Enum.Material.Fabric)
	end
	piece("Pommel", Vector3.new(0.36, 0.36, 0.14), CFrame.new(0, 0, 0.8), Color3.fromRGB(220, 175, 80), Enum.Material.Metal)
	-- Tsuba (round guard) + habaki collar
	local guard = piece("Guard", Vector3.new(0.14, 1.0, 1.0), CFrame.new(0, 0, -0.8) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(215, 170, 75), Enum.Material.Metal)
	if guard:IsA("Part") then
		guard.Shape = Enum.PartType.Cylinder
	end
	piece("Collar", Vector3.new(0.16, 0.36, 0.25), CFrame.new(0, 0.02, -1.0), Color3.fromRGB(230, 190, 110), Enum.Material.Metal)
	-- Curved blade: four segments with a slight upward sori, a glowing hamon edge on each
	local blade
	local z, y, angle = -1.1, 0.02, 0
	for i = 1, 4 do
		local length = 1.15
		local center = CFrame.new(0, y, z) * CFrame.Angles(math.rad(angle), 0, 0) * CFrame.new(0, 0, -length / 2)
		local seg = piece(if i == 2 then "Blade" else "BladeSeg" .. i, Vector3.new(0.1, 0.3 - i * 0.025, length + 0.04), center, Color3.fromRGB(220, 226, 238), Enum.Material.Metal)
		seg.Reflectance = 0.25
		piece(if i == 2 then "Edge" else "EdgeSeg" .. i, Vector3.new(0.11, 0.07, length), center * CFrame.new(0, -0.13 + i * 0.01, 0), trailColor, Enum.Material.Neon)
		if i == 2 then
			blade = seg
		end
		local tip = center * CFrame.new(0, 0, -length / 2)
		z, y = tip.Position.Z, tip.Position.Y
		angle += 4
	end
	piece("Tip", Vector3.new(0.09, 0.18, 0.4), CFrame.new(0, y + 0.03, z - 0.15) * CFrame.Angles(math.rad(angle + 10), 0, 0), Color3.fromRGB(235, 240, 250), Enum.Material.Metal)
	local a0 = Instance.new("Attachment")
	a0.Name = "TrailBase"
	a0.Position = Vector3.new(0, 0, 1.2)
	a0.Parent = blade
	local a1 = Instance.new("Attachment")
	a1.Name = "TrailTip"
	a1.Position = Vector3.new(0, 0.1, -3.4)
	a1.Parent = blade
	local trail = Instance.new("Trail")
	trail.Name = "SwingTrail"
	trail.Attachment0 = a0
	trail.Attachment1 = a1
	trail.Lifetime = 0.22
	trail.MinLength = 0.05
	trail.LightEmission = 1
	trail.Color = ColorSequence.new(trailColor)
	trail.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
	trail.Enabled = false
	trail.Parent = blade
	model.Parent = character
	return model
end

-- Mineable node: a weathered boulder pile with crystal veins bursting out of it.
-- Returns the model + the part holding the prompt (the main boulder).
function Models.node(def: any, position: Vector3, parent: Instance): (Model, BasePart)
	local model = Instance.new("Model")
	model.Name = def.id
	local r = Build.rng
	local yaw = CFrame.Angles(0, r:NextNumber(0, math.pi * 2), 0)
	local base = Build.ellipsoid(model, {
		size = Vector3.new(6.4, 4.2, 5.6),
		cframe = CFrame.new(position + Vector3.new(0, 1.6, 0)) * yaw * CFrame.Angles(r:NextNumber(-0.15, 0.15), 0, r:NextNumber(-0.15, 0.15)),
		color = def.color,
		material = Enum.Material.Slate,
		name = "Base",
	})
	for i = 1, 3 do
		local a = i * 2.1 + r:NextNumber(-0.4, 0.4)
		Build.ellipsoid(model, {
			size = Vector3.new(r:NextNumber(2.2, 3.4), r:NextNumber(1.6, 2.6), r:NextNumber(2.2, 3.2)),
			cframe = CFrame.new(position + Vector3.new(math.cos(a) * 2.9, 0.7, math.sin(a) * 2.9)) * CFrame.Angles(r:NextNumber(-0.4, 0.4), a, r:NextNumber(-0.4, 0.4)),
			color = def.color:Lerp(Color3.new(0, 0, 0), 0.15),
			material = Enum.Material.Slate,
			name = "Rubble",
		})
	end
	for i = 1, 5 do
		local cf = base.CFrame * CFrame.new(r:NextNumber(-1.8, 1.8), 1.2, r:NextNumber(-1.6, 1.6)) * CFrame.Angles(r:NextNumber(-0.6, 0.6), r:NextNumber(0, math.pi), r:NextNumber(-0.6, 0.6))
		for _, shard in Build.spike(model, cf, r:NextNumber(0.9, 1.4), r:NextNumber(1.8, 3.6), { color = def.glow, material = Enum.Material.Neon, collide = false, castShadow = false }) do
			shard.Name = "Vein" .. i
		end
	end
	Build.light(base, def.glow, 10, 0.8)
	model.PrimaryPart = base
	model.Parent = parent
	return model, base
end

return Models
