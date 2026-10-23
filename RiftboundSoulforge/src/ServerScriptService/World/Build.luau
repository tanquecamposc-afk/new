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

-- Ellipsoid: a part whose SpecialMesh stretches a sphere to the part's full box, so bodies,
-- canopies and boulders can be squashed and stretched instead of being perfect balls.
function Build.ellipsoid(parent: Instance, p: PartProps): BasePart
	local part = Build.part(parent, p)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere
	mesh.Parent = part
	return part
end

-- Triangular ridge (two back-to-back wedges): `cf` is the centre of the base, the ridge
-- runs along local X at height `h`. Width = X extent, depth = Z extent.
function Build.ridge(parent: Instance, cf: CFrame, width: number, h: number, depth: number, props: any?): { BasePart }
	local q: any = table.clone(props or {})
	local out = {}
	for side = -1, 1, 2 do
		q.class = "WedgePart"
		q.size = Vector3.new(width, h, depth / 2)
		-- a wedge's tall edge is at its back (+Z): mirror one half so both tall edges meet
		q.cframe = cf * CFrame.Angles(0, if side == 1 then math.pi else 0, 0) * CFrame.new(0, h / 2, -depth / 4)
		table.insert(out, Build.part(parent, q))
	end
	return out
end

-- Pointed spike / shard: two crossed ridges whose union tapers to a single tip.
function Build.spike(parent: Instance, cf: CFrame, width: number, h: number, props: any?): { BasePart }
	local out = Build.ridge(parent, cf, width * 0.42, h, width, props)
	for _, part in Build.ridge(parent, cf * CFrame.Angles(0, math.pi / 2, 0), width * 0.42, h, width, props) do
		table.insert(out, part)
	end
	return out
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
	label.Font = Enum.Font.Fondamento
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
	-- Canopy: overlapping squashed leaf clumps of varied tint, wider than tall, so the crown
	-- reads as foliage rather than a stack of balls.
	for i = 1, 14 do
		local a = i * 2.4 + rng:NextNumber(-0.35, 0.35)
		local layer = (i - 1) / 13 -- low wide clumps first, smaller ones towards the crown
		local spread = rng:NextNumber(1.2, 3.8) * (1 - layer * 0.6)
		local center = position + Vector3.new(math.cos(a) * spread * scale, h + (layer * 4.2 + rng:NextNumber(-1, 1)) * scale, math.sin(a) * spread * scale)
		local w = rng:NextNumber(3.6, 5.4) * (1 - layer * 0.3) * scale
		Build.ellipsoid(model, {
			size = Vector3.new(w, w * rng:NextNumber(0.7, 0.9), w * rng:NextNumber(0.85, 1.05)),
			cframe = CFrame.new(center) * CFrame.Angles(rng:NextNumber(-0.25, 0.25), a, rng:NextNumber(-0.25, 0.25)),
			color = palette[rng:NextInteger(1, #palette)],
			material = Enum.Material.Grass,
			name = "Canopy",
		})
	end
	return model
end

-- Stylised conifer: each tier is three crossed triangular ridges, giving a star-shaped cone
-- that narrows towards a pointed top.
function Build.pine(parent: Instance, position: Vector3, scale: number)
	local model = Build.model(parent, "Pine")
	Build.cylinder(model, 1.3 * scale, 5 * scale, position + Vector3.new(0, 2.5 * scale, 0), Color3.fromRGB(80, 56, 42), Enum.Material.Wood, "Trunk")
	local y = 3 * scale
	local twist = rng:NextNumber(0, math.pi)
	for i = 1, 4 do
		local w = (10 - i * 1.9) * scale
		local h = (4.6 - i * 0.35) * scale
		local color = Color3.fromRGB(40, 86 + i * 9, 56)
		for j = 0, 2 do
			Build.ridge(model, CFrame.new(position + Vector3.new(0, y, 0)) * CFrame.Angles(0, twist + i * 0.5 + j * math.pi / 3, 0), w * 0.34, h, w, {
				color = color,
				material = Enum.Material.Grass,
				name = "Tier",
			})
		end
		y += h * 0.62
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
		Build.ellipsoid(model, { size = Vector3.new(0.7, 0.35, 0.7), cframe = CFrame.new(p + Vector3.new(0, 1.05, 0)), color = colors[r:NextInteger(1, #colors)], name = "Bloom", collide = false })
	end
	return model
end

-- Weathered boulder pile: a large squashed boulder, smaller stones leaning on it and a
-- sharp broken chip, so outcrops look eroded instead of boxy.
function Build.rock(parent: Instance, position: Vector3, scale: number, color: Color3?)
	local model = Build.model(parent, "Rock")
	local c = color or Color3.fromRGB(92, 84, 80)
	local main = Vector3.new(rng:NextNumber(5, 7), rng:NextNumber(3, 4.5), rng:NextNumber(4.5, 6.5)) * scale
	Build.ellipsoid(model, {
		size = main,
		cframe = CFrame.new(position + Vector3.new(0, main.Y * 0.35, 0)) * CFrame.Angles(rng:NextNumber(-0.2, 0.2), rng:NextNumber(0, math.pi), rng:NextNumber(-0.2, 0.2)),
		color = c,
		material = Enum.Material.Slate,
		name = "Stone1",
	})
	for i = 2, 3 do
		local sz = Vector3.new(rng:NextNumber(2, 3.5), rng:NextNumber(1.5, 3), rng:NextNumber(2, 3.5)) * scale
		local a = rng:NextNumber(0, math.pi * 2)
		Build.ellipsoid(model, {
			size = sz,
			cframe = CFrame.new(position + Vector3.new(math.cos(a) * main.X * 0.45, sz.Y * 0.3, math.sin(a) * main.Z * 0.45)) * CFrame.Angles(rng:NextNumber(-0.5, 0.5), a, rng:NextNumber(-0.5, 0.5)),
			color = c:Lerp(Color3.new(0, 0, 0), rng:NextNumber(0, 0.15)),
			material = Enum.Material.Slate,
			name = "Stone" .. i,
		})
	end
	Build.spike(model, CFrame.new(position + Vector3.new(rng:NextNumber(-1, 1) * scale, main.Y * 0.45, rng:NextNumber(-1, 1) * scale)) * CFrame.Angles(rng:NextNumber(-0.4, 0.4), rng:NextNumber(0, math.pi), rng:NextNumber(-0.4, 0.4)), 2.2 * scale, main.Y * 0.8, {
		color = c:Lerp(Color3.new(1, 1, 1), 0.06),
		material = Enum.Material.Slate,
		name = "Chip",
	})
	return model
end

-- Crystal cluster: pointed shards fanning out from a shared root.
function Build.crystal(parent: Instance, position: Vector3, color: Color3, scale: number, collide: boolean?)
	local model = Build.model(parent, "Crystal")
	for i = 1, 5 do
		local h = (if i == 1 then rng:NextNumber(6, 8) else rng:NextNumber(2.5, 5.5)) * scale
		local tilt = if i == 1 then 0.1 else 0.55
		local cf = CFrame.new(position + Vector3.new(rng:NextNumber(-1, 1) * scale, -0.3, rng:NextNumber(-1, 1) * scale))
			* CFrame.Angles(rng:NextNumber(-tilt, tilt), rng:NextNumber(0, math.pi), rng:NextNumber(-tilt, tilt))
		for _, part in Build.spike(model, cf, (if i == 1 then 1.8 else 1.2) * scale, h, {
			color = color,
			material = Enum.Material.Neon,
			collide = collide == true,
			name = "Shard",
			castShadow = false,
			transparency = 0.15,
		}) do
			part.CanQuery = collide == true
		end
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
	Build.part(model, { size = Vector3.new(1.1, 0.5, 1.1), cframe = CFrame.new(position + Vector3.new(0, 5.05, 0)), color = Color3.fromRGB(70, 60, 54), material = Enum.Material.Metal, name = "Bowl" })
	local flame = Build.ellipsoid(model, {
		size = Vector3.new(0.9, 1.6, 0.9),
		cframe = CFrame.new(position + Vector3.new(0, 5.8, 0)),
		color = color or Color3.fromRGB(255, 150, 60),
		material = Enum.Material.Neon,
		name = "Flame",
		collide = false,
		castShadow = false,
	})
	Build.spike(model, CFrame.new(position + Vector3.new(0, 6.2, 0)), 0.6, 1.1, { color = Color3.fromRGB(255, 220, 140), material = Enum.Material.Neon, collide = false, castShadow = false, name = "FlameTip" })
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
