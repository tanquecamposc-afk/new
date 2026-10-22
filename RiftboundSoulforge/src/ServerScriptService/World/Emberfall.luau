--!strict
-- EMBERFALL FRONTIER: camp (safe) -> forest & ruined outpost (depth 1) -> hidden Sunfall
-- Chamber -> Cinder Ravine traversal (pillar route / ledge route / drawbridge shortcut) ->
-- Ruined Keep interior (depth 2, Ashen Sentinel) -> Warden's Approach -> Fracture Arena (depth 3).

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local WorldConfig = require(Shared.Config.WorldConfig)
local Build = require(script.Parent.Build)

local Emberfall = {}

local E = WorldConfig.EmberfallOrigin
local P = WorldConfig.Points

local function at(x: number, z: number, y: number?): Vector3
	return E + Vector3.new(x, y or 0, z)
end

local GRASS = Color3.fromRGB(128, 106, 62)
local DIRT = Color3.fromRGB(112, 82, 56)
local CLIFF = Color3.fromRGB(92, 70, 60)
local KEEP = Color3.fromRGB(78, 74, 84)
local KEEP_DARK = Color3.fromRGB(46, 42, 52)
local LAVA = Color3.fromRGB(255, 90, 30)
local RIFT = Color3.fromRGB(255, 60, 150)

local function box(parent: Instance, x1: number, x2: number, z1: number, z2: number, y1: number, y2: number, color: Color3, material: Enum.Material, name: string): BasePart
	local size = Vector3.new(math.abs(x2 - x1), math.abs(y2 - y1), math.abs(z2 - z1))
	return Build.block(parent, size, CFrame.new(at((x1 + x2) / 2, (z1 + z2) / 2, (y1 + y2) / 2)), color, material, name)
end

local function holder(parent: Instance, name: string, position: Vector3, action: string, object: string, hold: number?): BasePart
	local part = Build.part(parent, {
		size = Vector3.new(3, 5, 3),
		cframe = CFrame.new(position + Vector3.new(0, 2.5, 0)),
		transparency = 1,
		collide = false,
		name = name,
	})
	Build.prompt(part, action, object, hold or 0, 12)
	return part
end

local function signFacing(parent: Instance, text: string, position: Vector3, toward: Vector3, size: Vector2, textColor: Color3?)
	return Build.sign(parent, text, CFrame.lookAt(position, Vector3.new(toward.X, position.Y, toward.Z)), size, Color3.fromRGB(34, 26, 24), textColor)
end

local function beacon(parent: Instance, name: string, position: Vector3, color: Color3, action: string, object: string, hold: number)
	local model = Build.model(parent, name .. "Model")
	Build.cylinder(model, 5, 2, position + Vector3.new(0, 1, 0), KEEP_DARK, Enum.Material.Slate, "Base")
	Build.part(model, { size = Vector3.new(1.6, 9, 1.6), cframe = CFrame.new(position + Vector3.new(0, 6.5, 0)), color = KEEP, material = Enum.Material.Slate, name = "Spire" })
	local crystal = Build.part(model, {
		size = Vector3.new(2.2, 3.2, 2.2),
		cframe = CFrame.new(position + Vector3.new(0, 12.5, 0)) * CFrame.Angles(0, math.rad(45), 0),
		color = color,
		material = Enum.Material.Neon,
		collide = false,
		name = "BeaconCrystal",
	})
	crystal:SetAttribute("Spin", 1)
	Build.light(crystal, color, 26, 2.5)
	Build.particles(crystal, color, 10, { acceleration = Vector3.new(0, 6, 0), speed = NumberRange.new(1, 2) })
	Build.label(crystal, "EXTRACTION", Vector3.new(0, 3.5, 0), color, 160)
	holder(model, name, position, action, object, hold)
end

-- Ground, boundaries --------------------------------------------------------------------------

local function terrain(parent: Instance)
	box(parent, -44, 262, -100, 100, -4, 0, GRASS, Enum.Material.Grass, "FrontierGround")
	Build.part(parent, { size = Vector3.new(306, 0.2, 12), cframe = CFrame.new(at(109, 0, 0.1)), color = DIRT, material = Enum.Material.Ground, name = "Trail", castShadow = false })
	box(parent, 340, 545, -100, 100, -4, 0, Color3.fromRGB(74, 64, 60), Enum.Material.Slate, "KeepGround")
	-- north cliff with the Sunfall doorway gap (x 194..206)
	box(parent, -44, 194, -108, -100, 0, 36, CLIFF, Enum.Material.Slate, "NorthCliff")
	box(parent, 206, 262, -108, -100, 0, 36, CLIFF, Enum.Material.Slate, "NorthCliff")
	box(parent, 194, 206, -108, -100, 18, 36, CLIFF, Enum.Material.Slate, "DoorLintel")
	box(parent, -44, 262, 100, 108, 0, 36, CLIFF, Enum.Material.Slate, "SouthCliff")
	box(parent, -52, -44, -108, 108, 0, 36, CLIFF, Enum.Material.Slate, "WestCliff")
	-- ravine cliffs and faces
	box(parent, 262, 340, -108, -100, -32, 36, CLIFF, Enum.Material.Slate, "RavineNorth")
	box(parent, 262, 340, 100, 108, -32, 36, CLIFF, Enum.Material.Slate, "RavineSouth")
	box(parent, 260, 262, -100, 100, -32, 0, Color3.fromRGB(70, 46, 36), Enum.Material.Basalt, "RavineFaceW")
	box(parent, 340, 342, -100, 100, -32, 0, Color3.fromRGB(70, 46, 36), Enum.Material.Basalt, "RavineFaceE")
	-- keep surroundings
	box(parent, 340, 545, -108, -100, 0, 36, CLIFF, Enum.Material.Slate, "KeepNorth")
	box(parent, 340, 545, 100, 108, 0, 36, CLIFF, Enum.Material.Slate, "KeepSouth")
	box(parent, 545, 553, -108, -12, 0, 36, CLIFF, Enum.Material.Slate, "KeepEast")
	box(parent, 545, 553, 12, 108, 0, 36, CLIFF, Enum.Material.Slate, "KeepEast")
	-- jagged cliff tops for silhouette
	for i = 1, 40 do
		local x = Build.rng:NextNumber(-40, 540)
		local z = if i % 2 == 0 then -104 else 104
		Build.part(parent, {
			size = Vector3.new(Build.rng:NextNumber(8, 16), Build.rng:NextNumber(6, 16), 8),
			cframe = CFrame.new(at(x, z, 38)) * CFrame.Angles(0, Build.rng:NextNumber(0, math.pi), 0),
			color = CLIFF:Lerp(Color3.new(0, 0, 0), 0.15),
			material = Enum.Material.Slate,
			class = "WedgePart",
			name = "CliffSpike",
		})
	end
end

-- Camp ---------------------------------------------------------------------------------------

local function tent(parent: Instance, position: Vector3, yaw: number, color: Color3)
	local cf = CFrame.new(position) * CFrame.Angles(0, math.rad(yaw), 0)
	Build.part(parent, { size = Vector3.new(8, 6, 5), cframe = cf * CFrame.new(0, 3, 2.5), color = color, material = Enum.Material.Fabric, class = "WedgePart", name = "TentSide" })
	Build.part(parent, { size = Vector3.new(8, 6, 5), cframe = cf * CFrame.new(0, 3, -2.5) * CFrame.Angles(0, math.rad(180), 0), color = color, material = Enum.Material.Fabric, class = "WedgePart", name = "TentSide" })
end

local function camp(parent: Instance)
	local model = Build.model(parent, "Camp")
	tent(model, at(-12, -34), 20, Color3.fromRGB(150, 70, 50))
	tent(model, at(8, -40), -10, Color3.fromRGB(70, 100, 140))
	tent(model, at(-18, 32), 160, Color3.fromRGB(120, 110, 70))
	-- campfire
	local fire = at(4, -20)
	for i = 1, 4 do
		Build.part(model, { size = Vector3.new(0.8, 0.8, 4), cframe = CFrame.new(fire + Vector3.new(0, 0.4, 0)) * CFrame.Angles(0, i * math.pi / 4, 0), color = Color3.fromRGB(70, 46, 30), material = Enum.Material.Wood, name = "Log" })
	end
	local flame = Build.neon(model, Vector3.new(1.6, 2.4, 1.6), CFrame.new(fire + Vector3.new(0, 1.6, 0)), Color3.fromRGB(255, 140, 50), "CampFlame")
	Build.light(flame, Color3.fromRGB(255, 150, 70), 34, 2.5)
	Build.particles(flame, Color3.fromRGB(255, 140, 50), 14, { acceleration = Vector3.new(0, 7, 0), spread = Vector2.new(15, 15) })
	for i = 1, 6 do
		Build.block(model, Vector3.new(3, 3, 3), CFrame.new(at(-30 + i * 2.5, 40 + (i % 2) * 3, 1.5)) * CFrame.Angles(0, i, 0), Color3.fromRGB(120, 90, 60), Enum.Material.WoodPlanks, "Crate")
	end
	-- palisade with a gap for the trail
	for z = -60, 60, 4 do
		if math.abs(z) > 10 then
			Build.part(model, { size = Vector3.new(1.4, 7, 1.4), cframe = CFrame.new(at(58, z, 3.5)) * CFrame.Angles(0, 0, math.rad((z % 8) - 4)), color = Color3.fromRGB(96, 70, 48), material = Enum.Material.Wood, name = "Stake" })
		end
	end
	beacon(model, "CampBeacon", P.CampBeacon, Color3.fromRGB(110, 255, 210), "Extract", "Bank your Satchel", 1)
	-- return portal
	local portal = P.CampReturnPortal
	for i = 1, 16 do
		local angle = i / 16 * math.pi * 2
		Build.part(model, {
			size = Vector3.new(1.4, 1.6, 1.6),
			cframe = CFrame.new(portal + Vector3.new(0, 7 + math.sin(angle) * 6, math.cos(angle) * 6)) * CFrame.Angles(angle, 0, 0),
			color = Color3.fromRGB(170, 110, 255),
			material = Enum.Material.Neon,
			name = "PortalStone",
			collide = false,
		})
	end
	local disc = Build.part(model, { size = Vector3.new(0.3, 11, 11), cframe = CFrame.new(portal + Vector3.new(0, 7, 0)), color = Color3.fromRGB(150, 100, 255), material = Enum.Material.Neon, shape = Enum.PartType.Cylinder, collide = false, name = "PortalSurface" })
	disc.Transparency = 0.4
	Build.light(disc, Color3.fromRGB(170, 120, 255), 24, 2)
	holder(model, "CampReturnPortal", portal + Vector3.new(3, 0, 0), "Return", "Nexus (banks your Satchel)", 0.5)
	signFacing(model, "EMBERFALL CAMP\nSAFE ZONE", at(40, -14, 6), at(0, -14), Vector2.new(10, 3.5), Color3.fromRGB(150, 255, 200))
	signFacing(model, "FRONTIER AHEAD\nDEPTH 1 • 25% SATCHEL RISK", at(60, 14, 6), at(0, 14), Vector2.new(12, 3.5), Color3.fromRGB(255, 180, 120))
end

-- Frontier -------------------------------------------------------------------------------------

local function clearOf(x: number, z: number): boolean
	if math.abs(z) < 12 then
		return false
	end
	if x > 142 and x < 210 and math.abs(z) < 34 then
		return false
	end
	if x > 176 and x < 224 and z < -82 then
		return false
	end
	local p = at(x, z)
	for _, placement in WorldConfig.Nodes do
		if (placement.position - p).Magnitude < 9 then
			return false
		end
	end
	for _, spawner in WorldConfig.Spawners do
		if (spawner.position - p).Magnitude < 7 then
			return false
		end
	end
	for _, b in WorldConfig.Braziers do
		if (b.position - p).Magnitude < 10 then
			return false
		end
	end
	for _, site in WorldConfig.RiftCrystalSites do
		if (site - p).Magnitude < 7 then
			return false
		end
	end
	for _, site in WorldConfig.BloomSites do
		if (site - p).Magnitude < 7 then
			return false
		end
	end
	return true
end

local function frontier(parent: Instance)
	local model = Build.model(parent, "Frontier")
	local rng = Random.new(2024)
	local placed = 0
	local attempts = 0
	while placed < 60 and attempts < 600 do
		attempts += 1
		local x = rng:NextNumber(66, 256)
		local z = rng:NextNumber(-94, 94)
		if clearOf(x, z) then
			placed += 1
			if placed % 3 == 0 then
				Build.rock(model, at(x, z), rng:NextNumber(0.8, 1.6), CLIFF)
			else
				Build.tree(model, at(x, z), rng:NextNumber(0.9, 1.4), true)
			end
		end
	end
	-- glowing rift cracks in the ground (environmental storytelling)
	for _ = 1, 10 do
		local x, z = rng:NextNumber(70, 250), rng:NextNumber(-90, 90)
		if clearOf(x, z) then
			Build.neon(model, Vector3.new(0.5, 0.1, rng:NextNumber(6, 14)), CFrame.new(at(x, z, 0.06)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0), Color3.fromRGB(200, 90, 255), "RiftCrack")
		end
	end
	-- ruined outpost
	local outpost = Build.model(model, "RuinedOutpost")
	local stone = Color3.fromRGB(120, 110, 100)
	Build.wall(outpost, at(148, -28), at(148, -8), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(148, 8), at(148, 28), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(204, -28), at(204, -8), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(204, 8), at(204, 28), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(148, -28), at(170, -28), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(182, -28), at(204, -28), 9, 2, stone, Enum.Material.Cobblestone, true)
	Build.wall(outpost, at(148, 28), at(204, 28), 9, 2, stone, Enum.Material.Cobblestone, true)
	-- watchtower
	local tower = at(196, 20)
	for _, o in { Vector3.new(-3, 0, -3), Vector3.new(3, 0, -3), Vector3.new(-3, 0, 3), Vector3.new(3, 0, 3) } do
		Build.block(outpost, Vector3.new(1, 14, 1), CFrame.new(tower + o + Vector3.new(0, 7, 0)), Color3.fromRGB(90, 66, 46), Enum.Material.Wood, "TowerPost")
	end
	Build.block(outpost, Vector3.new(8, 1, 8), CFrame.new(tower + Vector3.new(0, 12, 0)), Color3.fromRGB(110, 80, 56), Enum.Material.WoodPlanks, "TowerDeck")
	Build.part(outpost, { size = Vector3.new(9, 3, 9), cframe = CFrame.new(tower + Vector3.new(0, 16, 0)), color = Color3.fromRGB(140, 60, 40), material = Enum.Material.Fabric, name = "TowerRoof" })
	Build.torch(outpost, at(150, -10), Color3.fromRGB(255, 150, 70))
	Build.torch(outpost, at(150, 10), Color3.fromRGB(255, 150, 70))
	signFacing(outpost, "OLD WATCH OUTPOST", at(146, 14, 7), at(100, 14), Vector2.new(9, 2), Color3.fromRGB(255, 220, 180))
end

-- Sunfall secret ---------------------------------------------------------------------------------

local function brazier(parent: Instance, info: any)
	local model = Build.model(parent, "Brazier_" .. info.id)
	local p = info.position
	Build.cylinder(model, 4, 3, p + Vector3.new(0, 1.5, 0), Color3.fromRGB(70, 64, 60), Enum.Material.Slate, "Pedestal")
	Build.cylinder(model, 5.5, 1, p + Vector3.new(0, 3.5, 0), Color3.fromRGB(50, 46, 44), Enum.Material.Metal, "Bowl")
	local flame = Build.neon(model, Vector3.new(2, 2.6, 2), CFrame.new(p + Vector3.new(0, 5.3, 0)), Color3.fromRGB(255, 170, 70), "Flame")
	flame.Transparency = 1
	local light = Build.light(flame, Color3.fromRGB(255, 170, 70), 22, 2.5)
	light.Enabled = false
	local emitter = Build.particles(flame, Color3.fromRGB(255, 160, 60), 12, { acceleration = Vector3.new(0, 6, 0), spread = Vector2.new(15, 15) })
	emitter.Enabled = false
	Build.label(model:FindFirstChild("Pedestal") :: BasePart, info.symbol, Vector3.new(0, 6.5, 0), Color3.fromRGB(255, 230, 160), 70)
	holder(model, "BrazierHolder_" .. info.id, p, "Kindle", "Brazier of the " .. info.id, 0.6)
end

local function sunfall(parent: Instance)
	local model = Build.model(parent, "Sunfall")
	for _, b in WorldConfig.Braziers do
		brazier(model, b)
	end
	-- mural on the cliff face, beside the cracked wall
	local mural = Build.part(model, {
		size = Vector3.new(10, 8, 1),
		cframe = CFrame.new(P.SunfallMural + Vector3.new(0, 5, -2.5)),
		color = Color3.fromRGB(150, 130, 110),
		material = Enum.Material.Sandstone,
		name = "MuralStone",
	})
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.CanvasSize = Vector2.new(400, 320)
	gui.LightInfluence = 0.4
	gui.Parent = mural
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "☾   ☀   ✦\n\nThree flames remember\nthe order of the sky."
	label.TextScaled = true
	label.Font = Enum.Font.Fantasy
	label.TextColor3 = Color3.fromRGB(70, 40, 20)
	label.Parent = gui
	holder(model, "SunfallMural", P.SunfallMural, "Read", "Ancient Mural", 0)
	-- the cracked wall (slides down when solved)
	local wall = Build.block(model, Vector3.new(12, 18, 4), CFrame.new(at(200, -102, 9)), Color3.fromRGB(112, 92, 80), Enum.Material.Rock, "SunfallWall")
	wall:SetAttribute("ClosedCFrame", wall.CFrame)
	for i = 1, 3 do
		Build.neon(model, Vector3.new(0.2, 4 + i, 0.1), CFrame.new(at(196 + i * 2, -99.9, 6 + i)) * CFrame.Angles(0, 0, math.rad(20 * i - 40)), Color3.fromRGB(255, 200, 100), "Crack")
	end
	-- chamber interior (x 186..214, z -132..-104)
	box(model, 186, 214, -132, -104, -1, 0, Color3.fromRGB(150, 120, 80), Enum.Material.Sandstone, "ChamberFloor")
	box(model, 184, 186, -134, -100, 0, 24, Color3.fromRGB(120, 96, 70), Enum.Material.Sandstone, "ChamberWall")
	box(model, 214, 216, -134, -100, 0, 24, Color3.fromRGB(120, 96, 70), Enum.Material.Sandstone, "ChamberWall")
	box(model, 184, 216, -134, -132, 0, 24, Color3.fromRGB(120, 96, 70), Enum.Material.Sandstone, "ChamberWall")
	box(model, 184, 216, -134, -100, 18, 20, Color3.fromRGB(90, 70, 50), Enum.Material.Sandstone, "ChamberCeiling")
	for i = 1, 6 do
		local glyph = Build.neon(model, Vector3.new(0.2, 2, 2), CFrame.new(at(if i % 2 == 0 then 186.2 else 213.8, -106 - i * 4, 8)), Color3.fromRGB(255, 200, 90), "Glyph")
		glyph.Transparency = 0.2
	end
	local t = P.SunfallTablet
	Build.cylinder(model, 4, 3, t + Vector3.new(0, 1.5, 0), Color3.fromRGB(80, 60, 40), Enum.Material.Sandstone, "TabletBase")
	local slab = Build.neon(model, Vector3.new(4, 5, 0.6), CFrame.new(t + Vector3.new(0, 5.5, 0)), Color3.fromRGB(255, 210, 110), "TabletSlab")
	Build.light(slab, Color3.fromRGB(255, 200, 110), 30, 2.5)
	holder(model, "SunfallTablet", t, "Read", "Sunfall Tablet", 1.2)
	local c = P.SunfallChest
	Build.block(model, Vector3.new(4, 2.5, 3), CFrame.new(c + Vector3.new(0, 1.25, 0)), Color3.fromRGB(110, 70, 40), Enum.Material.WoodPlanks, "Cache")
	Build.neon(model, Vector3.new(4.1, 0.3, 3.1), CFrame.new(c + Vector3.new(0, 2.2, 0)), Color3.fromRGB(255, 210, 110), "CacheTrim")
	holder(model, "SunfallChest", c, "Open", "Forgotten Cache", 0.8)
end

-- Ravine -----------------------------------------------------------------------------------------

local function ravine(parent: Instance)
	local model = Build.model(parent, "CinderRavine")
	local lava = box(model, 262, 340, -100, 100, -33, -30, LAVA, Enum.Material.Neon, "Lava")
	lava:SetAttribute("Lava", true)
	for i = 1, 5 do
		local glow = Build.part(model, { size = Vector3.new(2, 2, 2), cframe = CFrame.new(at(270 + i * 13, (i % 2) * 40 - 20, -28)), transparency = 1, collide = false, name = "LavaGlow" })
		Build.light(glow, Color3.fromRGB(255, 110, 40), 60, 3)
		Build.particles(glow, Color3.fromRGB(255, 120, 40), 8, { acceleration = Vector3.new(0, 10, 0), speed = NumberRange.new(2, 6), lifetime = NumberRange.new(1.5, 3) })
	end
	-- main route: basalt pillars
	local pillars = { { 272, 0, 0 }, { 283, 3, 1 }, { 294, -3, 2 }, { 305, 2, 1.5 }, { 316, -2, 0.5 }, { 327, 0, 0 } }
	for i, p in pillars do
		local top = p[3]
		local h = top + 31
		Build.block(model, Vector3.new(5.5, h, 5.5), CFrame.new(at(p[1], p[2], top - h / 2)), Color3.fromRGB(60, 46, 44), Enum.Material.Basalt, "Pillar" .. i)
		Build.neon(model, Vector3.new(5.6, 0.15, 5.6), CFrame.new(at(p[1], p[2], top - 0.5)), Color3.fromRGB(255, 120, 50), "PillarGlow")
	end
	-- ledge route (south, longer)
	for _, seg in { { 262, 283 }, { 287, 309 }, { 313, 340 } } do
		box(model, seg[1], seg[2], 82, 87, -2, 0, Color3.fromRGB(90, 70, 60), Enum.Material.Slate, "Ledge")
	end
	-- drawbridge shortcut (lowered by the lever on the far side)
	local hinge = at(340, -30, -0.75)
	local down = CFrame.new(hinge) * CFrame.new(-39, 0, 0)
	local up = CFrame.new(hinge) * CFrame.Angles(0, 0, math.rad(-75)) * CFrame.new(-39, 0, 0)
	local bridge = Build.block(model, Vector3.new(78, 1.5, 10), up, Color3.fromRGB(100, 72, 50), Enum.Material.WoodPlanks, "Drawbridge")
	bridge.CanCollide = false
	bridge:SetAttribute("DownCFrame", down)
	bridge:SetAttribute("UpCFrame", up)
	local lever = P.ShortcutLever
	Build.block(model, Vector3.new(2, 3, 2), CFrame.new(lever + Vector3.new(0, 1.5, 0)), KEEP_DARK, Enum.Material.Metal, "LeverBase")
	Build.neon(model, Vector3.new(0.4, 3, 0.4), CFrame.new(lever + Vector3.new(0, 4, 0)) * CFrame.Angles(0, 0, math.rad(30)), Color3.fromRGB(255, 200, 80), "LeverHandle")
	holder(model, "ShortcutLever", lever, "Pull", "Drawbridge Lever", 0.8)
	signFacing(model, "CINDER RAVINE\nJump the pillars or take the south ledge", at(256, 16, 6), at(200, 16), Vector2.new(12, 3), Color3.fromRGB(255, 170, 110))
end

-- Keep --------------------------------------------------------------------------------------------

local function keep(parent: Instance)
	local model = Build.model(parent, "RuinedKeep")
	box(model, 342, 538, -48, 48, 0, 0.2, Color3.fromRGB(60, 56, 64), Enum.Material.Slate, "KeepFloor")
	-- perimeter walls (gates at z -7..7 on west and east)
	box(model, 340, 344, -52, -7, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 340, 344, 7, 52, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 340, 344, -7, 7, 14, 30, KEEP, Enum.Material.Cobblestone, "GateLintel")
	box(model, 536, 540, -52, -7, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 536, 540, 7, 52, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 536, 540, -7, 7, 14, 30, KEEP, Enum.Material.Cobblestone, "GateLintel")
	box(model, 340, 540, -52, -48, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 340, 540, 48, 52, 0, 30, KEEP, Enum.Material.Cobblestone, "KeepWall")
	box(model, 338, 542, -54, 54, 30, 32, KEEP_DARK, Enum.Material.Slate, "KeepRoof")
	-- inner walls: hall | corridor | court
	box(model, 419, 421, -48, -8, 0, 30, KEEP, Enum.Material.Cobblestone, "InnerWall")
	box(model, 419, 421, 8, 48, 0, 30, KEEP, Enum.Material.Cobblestone, "InnerWall")
	box(model, 449, 451, -48, -10, 0, 30, KEEP, Enum.Material.Cobblestone, "InnerWall")
	box(model, 449, 451, 10, 48, 0, 30, KEEP, Enum.Material.Cobblestone, "InnerWall")
	box(model, 421, 449, -10, -8, 0, 30, KEEP, Enum.Material.Cobblestone, "CorridorWall")
	box(model, 421, 449, 8, 10, 0, 30, KEEP, Enum.Material.Cobblestone, "CorridorWall")
	-- hall pillars
	for _, x in { 362, 392 } do
		for _, z in { -26, 26 } do
			Build.cylinder(model, 4, 30, at(x, z, 15), KEEP_DARK, Enum.Material.Cobblestone, "Pillar")
		end
	end
	-- torches & rune lights
	for _, p in { { 350, -44 }, { 350, 44 }, { 412, -44 }, { 412, 44 }, { 435, 6 }, { 458, -44 }, { 458, 44 }, { 534, -44 }, { 512, 45 } } do
		Build.torch(model, at(p[1], p[2]), Color3.fromRGB(150, 140, 255))
	end
	local rune = Build.cylinder(model, 30, 0.1, at(496, 0, 0.26), Color3.fromRGB(170, 120, 255), Enum.Material.Neon, "SentinelRune")
	rune.Transparency = 0.6
	rune.CanCollide = false
	Build.light(Build.part(model, { size = Vector3.new(1, 1, 1), cframe = CFrame.new(at(496, 0, 20)), transparency = 1, collide = false, name = "CourtLight" }), Color3.fromRGB(170, 130, 255), 50, 1.5)
	-- debris
	for i = 1, 12 do
		Build.rock(model, at(Build.rng:NextNumber(350, 530), if i % 2 == 0 then Build.rng:NextNumber(30, 44) else Build.rng:NextNumber(-44, -30)), 0.6, KEEP)
	end
	beacon(model, "KeepBeacon", P.KeepBeacon, Color3.fromRGB(90, 220, 255), "Extract", "Keep Beacon (deep extraction)", 4)
	signFacing(model, "THE RUINED KEEP\nDEPTH 2 • DROPS x1.3", at(336, 12, 18), at(300, 12), Vector2.new(12, 3.5), Color3.fromRGB(190, 180, 255))
	signFacing(model, "SENTINEL'S COURT", at(452, 14, 14), at(430, 14), Vector2.new(8, 2), Color3.fromRGB(210, 180, 255))
end

-- Approach & Arena -----------------------------------------------------------------------------

local function arena(parent: Instance)
	local model = Build.model(parent, "FractureArena")
	box(model, 545, 580, -12, 12, -4, 0, Color3.fromRGB(44, 36, 54), Enum.Material.Basalt, "Walkway")
	box(model, 545, 580, -12.5, -11.5, 0, 3, KEEP_DARK, Enum.Material.Slate, "Parapet")
	box(model, 545, 580, 11.5, 12.5, 0, 3, KEEP_DARK, Enum.Material.Slate, "Parapet")
	for _, x in { 552, 566 } do
		for _, z in { -10.5, 10.5 } do
			local obelisk = Build.part(model, { size = Vector3.new(1.6, 12, 1.6), cframe = CFrame.new(at(x, z, 6)) * CFrame.Angles(0, math.rad(45), 0), color = RIFT, material = Enum.Material.Neon, name = "Obelisk" })
			Build.light(obelisk, RIFT, 16, 1.2)
		end
	end
	-- seal
	local seal = P.ArenaSeal + Vector3.new(0, 0, -8)
	Build.cylinder(model, 4, 3, seal + Vector3.new(0, 1.5, 0), KEEP_DARK, Enum.Material.Slate, "SealBase")
	local sealCrystal = Build.part(model, { size = Vector3.new(2, 4, 2), cframe = CFrame.new(seal + Vector3.new(0, 5.5, 0)) * CFrame.Angles(0, math.rad(45), 0), color = RIFT, material = Enum.Material.Neon, collide = false, name = "SealCrystal" })
	sealCrystal:SetAttribute("Spin", 1.5)
	Build.label(sealCrystal, "FRACTURE SEAL", Vector3.new(0, 4, 0), RIFT, 120)
	holder(model, "WardenSeal", seal, "Break the Seal", "Challenge the Fracture Warden", 1.5)
	signFacing(model, "FRACTURE ARENA\nDEPTH 3 • DROPS x1.6", at(574, 11, 10), at(540, 11), Vector2.new(10, 3), Color3.fromRGB(255, 140, 200))

	-- arena tiles
	local c = WorldConfig.Arena.center
	local size = WorldConfig.Arena.size
	local n = WorldConfig.Arena.tiles
	local tile = size / n
	for ix = 0, n - 1 do
		for iz = 0, n - 1 do
			local x = c.X - size / 2 + tile * (ix + 0.5)
			local z = c.Z - size / 2 + tile * (iz + 0.5)
			local shade = if (ix + iz) % 2 == 0 then Color3.fromRGB(40, 34, 52) else Color3.fromRGB(54, 46, 68)
			Build.block(model, Vector3.new(tile - 0.4, 4, tile - 0.4), CFrame.new(Vector3.new(x, c.Y - 2, z)), shade, Enum.Material.Basalt, "ArenaTile")
		end
	end
	for i = 0, n do
		local offset = -size / 2 + tile * i
		Build.neon(model, Vector3.new(0.4, 0.1, size), CFrame.new(c + Vector3.new(offset, 0.02, 0)), Color3.fromRGB(150, 60, 220), "Seam")
		Build.neon(model, Vector3.new(size, 0.1, 0.4), CFrame.new(c + Vector3.new(0, 0.02, offset)), Color3.fromRGB(150, 60, 220), "Seam")
	end
	-- parapets (west edge open around the entrance)
	local half = size / 2
	Build.block(model, Vector3.new(size, 3, 1), CFrame.new(c + Vector3.new(0, 1.5, -half)), KEEP_DARK, Enum.Material.Slate, "ArenaParapet")
	Build.block(model, Vector3.new(size, 3, 1), CFrame.new(c + Vector3.new(0, 1.5, half)), KEEP_DARK, Enum.Material.Slate, "ArenaParapet")
	Build.block(model, Vector3.new(1, 3, size), CFrame.new(c + Vector3.new(half, 1.5, 0)), KEEP_DARK, Enum.Material.Slate, "ArenaParapet")
	Build.block(model, Vector3.new(1, 3, half - 12), CFrame.new(c + Vector3.new(-half, 1.5, -(half + 12) / 2)), KEEP_DARK, Enum.Material.Slate, "ArenaParapet")
	Build.block(model, Vector3.new(1, 3, half - 12), CFrame.new(c + Vector3.new(-half, 1.5, (half + 12) / 2)), KEEP_DARK, Enum.Material.Slate, "ArenaParapet")
	-- barrier (closed during the encounter)
	local barrier = Build.model(model, "ArenaBarrier")
	for _, spec in {
		{ Vector3.new(1, 40, size), Vector3.new(-half, 20, 0) },
		{ Vector3.new(1, 40, size), Vector3.new(half, 20, 0) },
		{ Vector3.new(size, 40, 1), Vector3.new(0, 20, -half) },
		{ Vector3.new(size, 40, 1), Vector3.new(0, 20, half) },
	} do
		local wall = Build.part(barrier, { size = spec[1], cframe = CFrame.new(c + spec[2]), color = RIFT, material = Enum.Material.ForceField, collide = false, name = "Barrier", castShadow = false })
		wall.Transparency = 1
	end
	-- corner pylons
	for _, corner in { Vector3.new(-half, 0, -half), Vector3.new(half, 0, -half), Vector3.new(-half, 0, half), Vector3.new(half, 0, half) } do
		Build.crystal(model, c + corner * 0.92, Color3.fromRGB(170, 90, 255), 2.4)
	end
	-- floating ruins around the platform (silhouette)
	for i = 1, 10 do
		local angle = i / 10 * math.pi * 2
		Build.part(model, {
			size = Vector3.new(Build.rng:NextNumber(8, 16), Build.rng:NextNumber(4, 10), Build.rng:NextNumber(8, 16)),
			cframe = CFrame.new(c + Vector3.new(math.cos(angle) * 95, Build.rng:NextNumber(-10, 30), math.sin(angle) * 95)) * CFrame.Angles(Build.rng:NextNumber(0, 1), Build.rng:NextNumber(0, 3), 0),
			color = Color3.fromRGB(50, 42, 60),
			material = Enum.Material.Basalt,
			name = "FloatingRuin",
		})
	end
	for i = 1, 8 do
		local angle = i / 8 * math.pi * 2
		Build.part(model, {
			size = Vector3.new(24, 30, 24),
			cframe = CFrame.new(c + Vector3.new(math.cos(angle) * 40, -20, math.sin(angle) * 40)) * CFrame.Angles(0, angle, math.rad(180)),
			color = Color3.fromRGB(40, 34, 48),
			material = Enum.Material.Basalt,
			class = "WedgePart",
			name = "Underside",
		})
	end
	-- retreat & victory beacon
	local retreat = P.ArenaRetreat
	Build.cylinder(model, 6, 0.4, retreat + Vector3.new(0, 0.2, 0), Color3.fromRGB(120, 255, 220), Enum.Material.Neon, "RetreatSigil")
	holder(model, "ArenaRetreat", retreat, "Retreat", "Teleport to camp", 1)
	beacon(model, "ArenaVictoryBeacon", P.ArenaVictoryBeacon, Color3.fromRGB(255, 215, 120), "Extract", "Warden's Beacon (after victory)", 2)
end

function Emberfall.build(world: Instance)
	local folder = Build.folder(world, "Emberfall")
	terrain(folder)
	camp(folder)
	frontier(folder)
	sunfall(folder)
	ravine(folder)
	keep(folder)
	arena(folder)
end

return Emberfall
