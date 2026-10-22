--!strict
-- Procedural character models: enemies, the Fracture Warden, the katana and resource nodes.
-- Gameplay code only relies on: HumanoidRootPart, Humanoid, the "HealthBar" billboard,
-- and named parts "Shield" / "WeakPoint" / "Blade". Replace with authored models freely.

local Build = require(script.Parent.Build)

local Models = {}

local function weldTo(part: BasePart, root: BasePart)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = root
	weld.Part1 = part
	weld.Parent = part
end

local function bodyPart(model: Model, root: BasePart, base: CFrame, name: string, size: Vector3, offset: CFrame, color: Color3, material: Enum.Material?, class: string?): BasePart
	local part = Build.part(model, {
		size = size,
		cframe = base * offset,
		color = color,
		material = material or Enum.Material.SmoothPlastic,
		name = name,
		collide = false,
		class = class,
	})
	part.Anchored = false
	part.Massless = true
	part.CanTouch = false
	weldTo(part, root)
	return part
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
	local height = 4 * s

	if behaviour == "Stalker" then
		bodyPart(model, root, g, "Body", Vector3.new(3, 1.6, 5) * s, CFrame.new(0, 2.3 * s, 0), body, Enum.Material.Slate)
		bodyPart(model, root, g, "Head", Vector3.new(2, 1.4, 2.2) * s, CFrame.new(0, 2.8 * s, -3.1 * s), body, Enum.Material.Slate, "WedgePart")
		bodyPart(model, root, g, "EyeL", Vector3.new(0.3, 0.3, 0.3) * s, CFrame.new(-0.5 * s, 3.1 * s, -4 * s), accent, Enum.Material.Neon)
		bodyPart(model, root, g, "EyeR", Vector3.new(0.3, 0.3, 0.3) * s, CFrame.new(0.5 * s, 3.1 * s, -4 * s), accent, Enum.Material.Neon)
		for i = -1, 1 do
			bodyPart(model, root, g, "Spike", Vector3.new(0.4, 1.4, 1.2) * s, CFrame.new(0, 3.5 * s, i * 1.4 * s) * CFrame.Angles(math.rad(-25), 0, 0), accent, Enum.Material.Neon, "WedgePart")
		end
		for _, x in { -1.1, 1.1 } do
			for _, z in { -1.6, 1.6 } do
				bodyPart(model, root, g, "Leg", Vector3.new(0.5, 2, 0.5) * s, CFrame.new(x * s, 1 * s, z * s), body, Enum.Material.Slate)
			end
		end
		bodyPart(model, root, g, "Tail", Vector3.new(0.4, 0.4, 3) * s, CFrame.new(0, 2.6 * s, 3.8 * s) * CFrame.Angles(math.rad(20), 0, 0), accent, Enum.Material.Neon)
		height = 4.6 * s
	elseif behaviour == "Guardian" or behaviour == "Golem" then
		for _, x in { -0.8, 0.8 } do
			bodyPart(model, root, g, "Leg", Vector3.new(1.2, 2.4, 1.2) * s, CFrame.new(x * s, 1.2 * s, 0), body, Enum.Material.Slate)
		end
		bodyPart(model, root, g, "Torso", Vector3.new(3, 3, 2) * s, CFrame.new(0, 4 * s, 0), body, Enum.Material.Slate)
		bodyPart(model, root, g, "Rune", Vector3.new(1.2, 1.2, 0.2) * s, CFrame.new(0, 4.3 * s, -1.05 * s), accent, Enum.Material.Neon)
		bodyPart(model, root, g, "Head", Vector3.new(1.6, 1.4, 1.6) * s, CFrame.new(0, 6.2 * s, 0), body, Enum.Material.Slate)
		bodyPart(model, root, g, "Eye", Vector3.new(1.0, 0.25, 0.2) * s, CFrame.new(0, 6.3 * s, -0.82 * s), accent, Enum.Material.Neon)
		bodyPart(model, root, g, "ArmL", Vector3.new(1, 3, 1) * s, CFrame.new(-2.1 * s, 3.9 * s, 0), body, Enum.Material.Slate)
		bodyPart(model, root, g, "ArmR", Vector3.new(1, 3, 1) * s, CFrame.new(2.1 * s, 3.9 * s, 0), body, Enum.Material.Slate)
		bodyPart(model, root, g, "Shoulders", Vector3.new(5.2, 0.8, 1.6) * s, CFrame.new(0, 5.5 * s, 0), body:Lerp(Color3.new(0, 0, 0), 0.3), Enum.Material.Slate)
		if behaviour == "Guardian" then
			local shield = bodyPart(model, root, g, "Shield", Vector3.new(0.3, 3.2, 3.2) * s, CFrame.new(-2.3 * s, 3.9 * s, -1.2 * s) * CFrame.Angles(0, math.rad(90), 0), accent, Enum.Material.ForceField)
			if shield:IsA("Part") then
				shield.Shape = Enum.PartType.Cylinder
			end
			shield.Transparency = 0.2
		end
		height = 7.6 * s
	elseif behaviour == "Beast" then
		bodyPart(model, root, g, "Body", Vector3.new(4, 3, 6) * s, CFrame.new(0, 2.9 * s, 0), body, Enum.Material.Basalt)
		bodyPart(model, root, g, "Head", Vector3.new(2.6, 2.2, 2.6) * s, CFrame.new(0, 3.5 * s, -3.9 * s), body, Enum.Material.Basalt)
		bodyPart(model, root, g, "Maw", Vector3.new(1.8, 0.4, 0.3) * s, CFrame.new(0, 3.0 * s, -5.25 * s), accent, Enum.Material.Neon)
		bodyPart(model, root, g, "HornL", Vector3.new(0.5, 1.6, 0.5) * s, CFrame.new(-0.9 * s, 5 * s, -3.6 * s) * CFrame.Angles(math.rad(-20), 0, math.rad(15)), accent, Enum.Material.Neon)
		bodyPart(model, root, g, "HornR", Vector3.new(0.5, 1.6, 0.5) * s, CFrame.new(0.9 * s, 5 * s, -3.6 * s) * CFrame.Angles(math.rad(-20), 0, math.rad(-15)), accent, Enum.Material.Neon)
		for i = -1, 1 do
			bodyPart(model, root, g, "Crack", Vector3.new(3.4, 0.15, 0.3) * s, CFrame.new(0, 4.45 * s, i * 1.6 * s), accent, Enum.Material.Neon)
		end
		for _, x in { -1.4, 1.4 } do
			for _, z in { -2, 2 } do
				bodyPart(model, root, g, "Leg", Vector3.new(1, 1.8, 1) * s, CFrame.new(x * s, 0.9 * s, z * s), body, Enum.Material.Basalt)
			end
		end
		local core = model:FindFirstChild("Body") :: BasePart
		Build.light(core, accent, 14, 1.2)
		height = 5.2 * s
	elseif behaviour == "Dummy" then
		bodyPart(model, root, g, "Post", Vector3.new(0.6, 6, 0.6), CFrame.new(0, 3, 0), Color3.fromRGB(90, 66, 44), Enum.Material.Wood)
		bodyPart(model, root, g, "Straw", Vector3.new(2.2, 3, 1.6), CFrame.new(0, 4.4, 0), body, Enum.Material.Fabric)
		bodyPart(model, root, g, "Arms", Vector3.new(5, 0.6, 0.6), CFrame.new(0, 5.2, 0), Color3.fromRGB(90, 66, 44), Enum.Material.Wood)
		bodyPart(model, root, g, "Head", Vector3.new(1.6, 1.6, 1.6), CFrame.new(0, 6.6, 0), body, Enum.Material.Fabric)
		bodyPart(model, root, g, "Target", Vector3.new(1.4, 1.4, 0.15), CFrame.new(0, 4.6, -0.86), accent, Enum.Material.Neon)
		height = 8
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

-- The Fracture Warden.
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
	local stone = Color3.fromRGB(34, 30, 44)
	local trim = Color3.fromRGB(70, 62, 90)
	local rift = Color3.fromRGB(255, 60, 140)
	local crystal = Color3.fromRGB(150, 90, 255)

	for _, x in { -3, 3 } do
		bodyPart(model, root, g, "Leg", Vector3.new(3, 8, 3.4), CFrame.new(x, 4, 0), stone, Enum.Material.Basalt)
		bodyPart(model, root, g, "Greave", Vector3.new(3.4, 2, 3.8), CFrame.new(x, 6.5, -0.2), trim, Enum.Material.Slate)
	end
	bodyPart(model, root, g, "Pelvis", Vector3.new(8, 3, 5), CFrame.new(0, 9, 0), trim, Enum.Material.Slate)
	bodyPart(model, root, g, "Torso", Vector3.new(10, 8, 6), CFrame.new(0, 14.5, 0), stone, Enum.Material.Basalt)
	for i, x in { -3, 0.5, 3 } do
		bodyPart(model, root, g, "Fracture" .. i, Vector3.new(0.4, 6, 0.3), CFrame.new(x, 14.5, -3.05) * CFrame.Angles(0, 0, math.rad(15 * (i - 2))), rift, Enum.Material.Neon)
	end
	bodyPart(model, root, g, "Core", Vector3.new(2.4, 2.4, 0.6), CFrame.new(0, 15.5, -3.1) * CFrame.Angles(0, 0, math.rad(45)), rift, Enum.Material.Neon)
	bodyPart(model, root, g, "Head", Vector3.new(4, 4, 4), CFrame.new(0, 20.5, 0), stone, Enum.Material.Basalt)
	bodyPart(model, root, g, "Visor", Vector3.new(3.2, 0.6, 0.3), CFrame.new(0, 20.8, -2.05), rift, Enum.Material.Neon)
	bodyPart(model, root, g, "Crown", Vector3.new(1, 3, 1), CFrame.new(0, 23.5, 0) * CFrame.Angles(0, math.rad(45), 0), crystal, Enum.Material.Neon)
	for _, x in { -7, 7 } do
		bodyPart(model, root, g, "Pauldron", Vector3.new(5, 3, 5), CFrame.new(x, 18.5, 0), trim, Enum.Material.Slate)
		bodyPart(model, root, g, "ShoulderShard", Vector3.new(1.2, 5, 1.2), CFrame.new(x, 21.5, 0) * CFrame.Angles(0, 0, math.rad(x > 0 and -20 or 20)), crystal, Enum.Material.Neon)
		bodyPart(model, root, g, "Arm", Vector3.new(3, 9, 3), CFrame.new(x * 1.07, 13, 0), stone, Enum.Material.Basalt)
	end
	-- Cleaver in the right hand
	bodyPart(model, root, g, "CleaverHilt", Vector3.new(1, 4, 1), CFrame.new(7.5, 7.5, -1.5), trim, Enum.Material.Slate)
	bodyPart(model, root, g, "Cleaver", Vector3.new(1, 14, 5), CFrame.new(7.5, 2, -3.5) * CFrame.Angles(math.rad(-20), 0, 0), Color3.fromRGB(60, 56, 70), Enum.Material.Metal)
	bodyPart(model, root, g, "CleaverEdge", Vector3.new(1.1, 14, 0.5), CFrame.new(7.5, 2.4, -6.1) * CFrame.Angles(math.rad(-20), 0, 0), rift, Enum.Material.Neon)
	-- Rift orb in the left hand
	local orb = bodyPart(model, root, g, "RiftOrb", Vector3.new(3, 3, 3), CFrame.new(-7.5, 8, -1), crystal, Enum.Material.Neon)
	if orb:IsA("Part") then
		orb.Shape = Enum.PartType.Ball
	end
	Build.light(orb, crystal, 20, 2)
	-- Weak point on the back (dim until exposed)
	local weak = bodyPart(model, root, g, "WeakPoint", Vector3.new(3.4, 5, 1.6), CFrame.new(0, 15, 3.6), Color3.fromRGB(255, 230, 120), Enum.Material.Neon)
	weak.Transparency = 0.75
	Build.light(weak, Color3.fromRGB(255, 220, 120), 16, 0)
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

-- Mineable node: a rock base with glowing veins. Returns model + the part holding the prompt.
function Models.node(def: any, position: Vector3, parent: Instance): (Model, BasePart)
	local model = Instance.new("Model")
	model.Name = def.id
	local base = Build.part(model, {
		size = Vector3.new(6, 4, 6),
		cframe = CFrame.new(position + Vector3.new(0, 1.8, 0)) * CFrame.Angles(0, Build.rng:NextNumber(0, math.pi), 0),
		color = def.color,
		material = Enum.Material.Slate,
		name = "Base",
	})
	for i = 1, 5 do
		local h = Build.rng:NextNumber(1.5, 3.5)
		Build.part(model, {
			size = Vector3.new(0.8, h, 0.8),
			cframe = base.CFrame * CFrame.new(Build.rng:NextNumber(-2.2, 2.2), 1.5 + h / 2 - 0.6, Build.rng:NextNumber(-2.2, 2.2))
				* CFrame.Angles(Build.rng:NextNumber(-0.5, 0.5), 0, Build.rng:NextNumber(-0.5, 0.5)),
			color = def.glow,
			material = Enum.Material.Neon,
			name = "Vein" .. i,
			collide = false,
			castShadow = false,
		})
	end
	Build.light(base, def.glow, 10, 0.8)
	model.PrimaryPart = base
	model.Parent = parent
	return model, base
end

return Models
