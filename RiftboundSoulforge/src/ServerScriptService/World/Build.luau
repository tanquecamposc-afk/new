--!strict
-- Procedural geometry primitives. Everything is built from Parts + built-in materials so the
-- game runs with zero external assets. Swap any generator for a modelled asset later: callers
-- only depend on the returned Model/Part and its attributes.

local Build = {}

export type PartProps = {
	size: Vector3,
	cframe: CFrame,
	color: Color3?,
	material: Enum.Material?,
	name: string?,
	transparency: number?,
	shape: Enum.PartType?,
	collide: boolean?,
	query: boolean?,
	reflectance: number?,
	castShadow: boolean?,
	class: string?,
}

function Build.part(parent: Instance, p: PartProps): BasePart
	local part: BasePart
	if p.class == "WedgePart" then
		part = Instance.new("WedgePart")
	elseif p.class == "CornerWedgePart" then
		part = Instance.new("CornerWedgePart")
	else
		local basic = Instance.new("Part")
		if p.shape then
			basic.Shape = p.shape
		end
		part = basic
	end
	part.Name = p.name or "Part"
	part.Anchored = true
	part.Size = p.size
	part.CFrame = p.cframe
	part.Color = p.color or Color3.fromRGB(120, 120, 120)
	part.Material = p.material or Enum.Material.SmoothPlastic
	part.Transparency = p.transparency or 0
	part.Reflectance = p.reflectance or 0
	part.CanCollide = if p.collide == nil then true else p.collide
	part.CanQuery = if p.query == nil then true else p.query
	part.CastShadow = if p.castShadow == nil then true else p.castShadow
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

function Build.block(parent: Instance, size: Vector3, cf: CFrame, color: Color3, material: Enum.Material?, name: string?): BasePart
	return Build.part(parent, { size = size, cframe = cf, color = color, material = material, name = name })
end

-- Upright cylinder (Roblox cylinders run along X, so rotate).
function Build.cylinder(parent: Instance, diameter: number, height: number, position: Vector3, color: Color3, material: Enum.Material?, name: string?): BasePart
	return Build.part(parent, {
		size = Vector3.new(height, diameter, diameter),
		cframe = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90)),
		color = color,
		material = material,
		shape = Enum.PartType.Cylinder,
		name = name,
	})
end

function Build.ball(parent: Instance, diameter: number, position: Vector3, color: Color3, material: Enum.Material?, name: string?): BasePart
	return Build.part(parent, {
		size = Vector3.new(diameter, diameter, diameter),
		cframe = CFrame.new(position),
		color = color,
		material = material,
		shape = Enum.PartType.Ball,
		name = name,
	})
end

function Build.neon(parent: Instance, size: Vector3, cf: CFrame, color: Color3, name: string?): BasePart
	local part = Build.part(parent, {
		size = size,
		cframe = cf,
		color = color,
		material = Enum.Material.Neon,
		name = name or "Glow",
		collide = false,
		castShadow = false,
	})
	return part
end

function Build.light(parent: Instance, color: Color3, range: number, brightness: number?)
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = range
	light.Brightness = brightness or 1.5
	light.Shadows = false
	light.Parent = parent
	return light
end

function Build.model(parent: Instance, name: string): Model
	local model = Instance.new("Model")
	model.Name = name
	model.Parent = parent
	return model
end

function Build.folder(parent: Instance, name: string): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

function Build.particles(parent: Instance, color: Color3, rate: number, props: any?): ParticleEmitter
	local p = props or {}
	local emitter = Instance.new("ParticleEmitter")
	emitter.Color = ColorSequence.new(color)
	emitter.Rate = rate
	emitter.Lifetime = p.lifetime or NumberRange.new(1, 2)
	emitter.Speed = p.speed or NumberRange.new(1, 3)
	emitter.SpreadAngle = p.spread or Vector2.new(180, 180)
	emitter.LightEmission = p.lightEmission or 1
	emitter.Size = p.size or NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 0) })
	emitter.Transparency = p.transparency
		or NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
	emitter.Acceleration = p.acceleration or Vector3.zero
	emitter.LockedToPart = p.locked or false
	emitter.Parent = parent
	return emitter
end

-- A sign with text on its front face (SurfaceGui, no assets).
function Build.sign(parent: Instance, text: string, cf: CFrame, size: Vector2, color: Color3?, textColor: Color3?): BasePart
	local board = Build.part(parent, {
		size = Vector3.new(size.X, size.Y, 0.4),
		cframe = cf,
		color = color or Color3.fromRGB(28, 30, 42),
		material = Enum.Material.SmoothPlastic,
		name = "Sign",
	})
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.CanvasSize = Vector2.new(size.X * 40, size.Y * 40)
	gui.LightInfluence = 0
	gui.Parent = board
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(0.92, 0.84)
	label.Position = UDim2.fromScale(0.04, 0.08)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = Enum.Font.GothamBlack
	label.TextColor3 = textColor or Color3.fromRGB(255, 236, 200)
	label.Parent = gui
	return board
end

-- Floating label that always faces the camera.
function Build.label(parent: Instance, text: string, offset: Vector3, color: Color3?, maxDistance: number?)
	local gui = Instance.new("BillboardGui")
	gui.Name = "Label"
	gui.Size = UDim2.fromOffset(220, 40)
	gui.StudsOffset = offset
	gui.MaxDistance = maxDistance or 90
	gui.LightInfluence = 0
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.TextColor3 = color or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.3
	label.Parent = gui
	gui.Parent = parent
	return gui
end

function Build.prompt(parent: Instance, action: string, object: string, hold: number?, distance: number?): ProximityPrompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = action
	prompt.ObjectText = object
	prompt.HoldDuration = hold or 0
	prompt.MaxActivationDistance = distance or 12
	prompt.RequiresLineOfSight = false
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	prompt.Parent = parent
	return prompt
end

-- Nature + ruins generators ------------------------------------------------------------------

local rng = Random.new(7331)
Build.rng = rng

local LEAVES_AUTUMN = {
	Color3.fromRGB(214, 104, 44),
	Color3.fromRGB(232, 150, 52),
	Color3.fromRGB(190, 70, 46),
	Color3.fromRGB(240, 186, 74),
}
local LEAVES_GREEN = { Color3.fromRGB(74, 132, 66), Color3.fromRGB(96, 150, 70), Color3.fromRGB(60, 112, 70) }

-- Broadleaf tree: tapered trunk, two branches and a clustered, colour-varied canopy.
function Build.tree(parent: Instance, position: Vector3, scale: number, autumn: boolean?)
	local model = Build.model(parent, "Tree")
	local h = 12 * scale
	local bark = Color3.fromRGB(86, 60, 44)
	Build.cylinder(model, 2.4 * scale, h * 0.55, position + Vector3.new(0, h * 0.275, 0), bark, Enum.Material.Wood, "Trunk")
	Build.cylinder(model, 1.6 * scale, h * 0.5, position + Vector3.new(0, h * 0.75, 0), bark, Enum.Material.Wood, "Trunk2")
	local palette = if autumn then LEAVES_AUTUMN else LEAVES_GREEN
	local lean = rng:NextNumber(0, math.pi * 2)
	for b = 1, 2 do
		local dir = lean + b * math.pi
		Build.part(model, {
			size = Vector3.new(0.8 * scale, 5 * scale, 0.8 * scale),
			cframe = CFrame.new(position + Vector3.new(0, h * 0.7, 0)) * CFrame.Angles(0, dir, 0) * CFrame.Angles(0, 0, math.rad(40)) * CFrame.new(0, 2 * scale, 0),
			color = bark,
			material = Enum.Material.Wood,
			name = "Branch",
		})
	end
	for i = 1, 6 do
		local a = i / 6 * math.pi * 2 + rng:NextNumber(-0.3, 0.3)
		local spread = if i == 6 then 0 else rng:NextNumber(2.2, 3.6)
		local center = position + Vector3.new(math.cos(a) * spread * scale, h + rng:NextNumber(-1, 2.5) * scale, math.sin(a) * spread * scale)
		if i == 6 then
			center = position + Vector3.new(0, h + 3 * scale, 0)
		end
		Build.ball(model, rng:NextNumber(4.5, 6.5) * scale, center, palette[rng:NextInteger(1, #palette)], Enum.Material.Grass, "Canopy")
	end
	return model
end

-- Stylised low-poly conifer: stacked, rotated tiers.
function Build.pine(parent: Instance, position: Vector3, scale: number)
	local model = Build.model(parent, "Pine")
	Build.cylinder(model, 1.4 * scale, 5 * scale, position + Vector3.new(0, 2.5 * scale, 0), Color3.fromRGB(80, 56, 42), Enum.Material.Wood, "Trunk")
	local y = 4 * scale
	for i = 1, 4 do
		local w = (9 - i * 1.8) * scale
		local h = 3.2 * scale
		Build.part(model, {
			size = Vector3.new(w, h, w),
			cframe = CFrame.new(position + Vector3.new(0, y + h / 2, 0)) * CFrame.Angles(0, math.rad(i * 25), 0),
			color = Color3.fromRGB(46, 92 + i * 8, 60),
			material = Enum.Material.Grass,
			name = "Tier",
		})
		y += h * 0.78
	end
	return model
end

-- Small flower bed: a mossy mound with coloured blossoms.
function Build.flowers(parent: Instance, position: Vector3, r: Random)
	local model = Build.model(parent, "Flowers")
	local colors = { Color3.fromRGB(255, 120, 160), Color3.fromRGB(255, 220, 110), Color3.fromRGB(180, 140, 255), Color3.fromRGB(255, 255, 255) }
	for _ = 1, 9 do
		local p = position + Vector3.new(r:NextNumber(-3, 3), 0, r:NextNumber(-3, 3))
		Build.part(model, { size = Vector3.new(0.15, 1, 0.15), cframe = CFrame.new(p + Vector3.new(0, 0.5, 0)), color = Color3.fromRGB(70, 130, 60), material = Enum.Material.Grass, name = "Stem", collide = false })
		local bloom = Build.ball(model, 0.55, p + Vector3.new(0, 1.05, 0), colors[r:NextInteger(1, #colors)], Enum.Material.SmoothPlastic, "Bloom")
		bloom.CanCollide = false
	end
	return model
end

function Build.rock(parent: Instance, position: Vector3, scale: number, color: Color3?)
	local model = Build.model(parent, "Rock")
	local c = color or Color3.fromRGB(92, 84, 80)
	for i = 1, 3 do
		local s = Vector3.new(rng:NextNumber(3, 6), rng:NextNumber(2, 5), rng:NextNumber(3, 6)) * scale
		Build.block(
			model,
			s,
			CFrame.new(position + Vector3.new(rng:NextNumber(-2, 2) * scale, s.Y / 2 - 0.5, rng:NextNumber(-2, 2) * scale))
				* CFrame.Angles(rng:NextNumber(-0.3, 0.3), rng:NextNumber(0, math.pi), rng:NextNumber(-0.3, 0.3)),
			c,
			Enum.Material.Slate,
			"Stone" .. i
		)
	end
	return model
end

function Build.crystal(parent: Instance, position: Vector3, color: Color3, scale: number, collide: boolean?)
	local model = Build.model(parent, "Crystal")
	for _ = 1, 4 do
		local h = rng:NextNumber(3, 7) * scale
		local part = Build.part(model, {
			size = Vector3.new(1.2 * scale, h, 1.2 * scale),
			cframe = CFrame.new(position + Vector3.new(rng:NextNumber(-1.5, 1.5) * scale, h / 2 - 0.3, rng:NextNumber(-1.5, 1.5) * scale))
				* CFrame.Angles(rng:NextNumber(-0.4, 0.4), rng:NextNumber(0, math.pi), rng:NextNumber(-0.4, 0.4)),
			color = color,
			material = Enum.Material.Neon,
			collide = collide == true,
			name = "Shard",
			castShadow = false,
		})
		part.Transparency = 0.15
	end
	return model
end

function Build.wall(parent: Instance, from: Vector3, to: Vector3, height: number, thickness: number, color: Color3, material: Enum.Material?, ruined: boolean?)
	local delta = to - from
	local length = Vector3.new(delta.X, 0, delta.Z).Magnitude
	local mid = (from + to) / 2
	local cf = CFrame.lookAt(Vector3.new(mid.X, from.Y + height / 2, mid.Z), Vector3.new(to.X, from.Y + height / 2, to.Z))
	if not ruined then
		return Build.block(parent, Vector3.new(thickness, height, length), cf, color, material or Enum.Material.Cobblestone, "Wall")
	end
	-- ruined: segmented, uneven heights
	local model = Build.model(parent, "RuinedWall")
	local segments = math.max(1, math.floor(length / 6))
	for i = 1, segments do
		local segLen = length / segments
		local h = height * rng:NextNumber(0.35, 1)
		local offset = -length / 2 + segLen * (i - 0.5)
		Build.block(model, Vector3.new(thickness, h, segLen - 0.2), cf * CFrame.new(0, (h - height) / 2, offset), color, material or Enum.Material.Cobblestone, "Segment")
	end
	return model
end

function Build.torch(parent: Instance, position: Vector3, color: Color3?)
	local model = Build.model(parent, "Torch")
	Build.cylinder(model, 0.6, 5, position + Vector3.new(0, 2.5, 0), Color3.fromRGB(60, 46, 36), Enum.Material.Wood, "Pole")
	local flame = Build.neon(model, Vector3.new(0.9, 1.2, 0.9), CFrame.new(position + Vector3.new(0, 5.4, 0)), color or Color3.fromRGB(255, 150, 60), "Flame")
	Build.light(flame, color or Color3.fromRGB(255, 160, 80), 18, 1.6)
	Build.particles(flame, color or Color3.fromRGB(255, 140, 50), 6, {
		speed = NumberRange.new(1, 2),
		spread = Vector2.new(10, 10),
		acceleration = Vector3.new(0, 4, 0),
		lifetime = NumberRange.new(0.5, 1),
	})
	return model
end

return Build
