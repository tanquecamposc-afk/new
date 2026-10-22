--!strict
-- THE NEXUS: the social hub. Every system has a physical station with a readable sign,
-- a light landmark and a prompt. Positions come from WorldConfig.Points.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local WorldConfig = require(Shared.Config.WorldConfig)
local Build = require(script.Parent.Build)

local Nexus = {}

local P = WorldConfig.Points
local STONE = Color3.fromRGB(58, 54, 74)
local TRIM = Color3.fromRGB(96, 88, 120)
local MARBLE = Color3.fromRGB(196, 190, 214)
local GOLD = Color3.fromRGB(255, 205, 110)
local RIFT = Color3.fromRGB(170, 110, 255)

local function facing(from: Vector3, to: Vector3): CFrame
	return CFrame.lookAt(from, Vector3.new(to.X, from.Y, to.Z))
end

local function station(parent: Instance, name: string, position: Vector3, view: string, action: string, object: string, stationId: string?): BasePart
	local holder = Build.part(parent, {
		size = Vector3.new(3, 4, 3),
		cframe = CFrame.new(position + Vector3.new(0, 2, 0)),
		transparency = 1,
		collide = false,
		name = name,
	})
	local prompt = Build.prompt(holder, action, object, 0, 14)
	prompt:SetAttribute("View", view)
	if stationId then
		prompt:SetAttribute("Station", stationId)
	end
	return holder
end

local function path(parent: Instance, from: Vector3, to: Vector3, width: number)
	local delta = to - from
	local length = Vector3.new(delta.X, 0, delta.Z).Magnitude
	local mid = (from + to) / 2
	Build.part(parent, {
		size = Vector3.new(width, 0.3, length),
		cframe = CFrame.lookAt(Vector3.new(mid.X, 0.15, mid.Z), Vector3.new(to.X, 0.15, to.Z)),
		color = Color3.fromRGB(120, 112, 140),
		material = Enum.Material.Pavement,
		name = "Path",
		castShadow = false,
	})
	-- glowing edge lines guide the eye
	for _, side in { -1, 1 } do
		local cf = CFrame.lookAt(Vector3.new(mid.X, 0.32, mid.Z), Vector3.new(to.X, 0.32, to.Z)) * CFrame.new(side * (width / 2 - 0.3), 0, 0)
		Build.neon(parent, Vector3.new(0.3, 0.05, length), cf, RIFT, "PathGlow")
	end
end

local function buildPlaza(parent: Instance)
	-- base island
	Build.cylinder(parent, 340, 8, Vector3.new(0, -4, 0), STONE, Enum.Material.Slate, "Island")
	Build.cylinder(parent, 120, 0.4, Vector3.new(0, 0.2, 0), MARBLE, Enum.Material.Marble, "Plaza")
	Build.cylinder(parent, 92, 0.5, Vector3.new(0, 0.25, 0), Color3.fromRGB(150, 140, 175), Enum.Material.Marble, "PlazaInner")
	Build.cylinder(parent, 40, 0.6, Vector3.new(0, 0.3, 0), TRIM, Enum.Material.Slate, "SpireBase")
	-- (the island underside is sculpted in Smooth Terrain by TerrainGen)
	-- rim: crystal pillars + invisible safety wall
	for i = 1, 24 do
		local angle = i / 24 * math.pi * 2
		local pos = Vector3.new(math.cos(angle) * 166, 0, math.sin(angle) * 166)
		Build.part(parent, {
			size = Vector3.new(4, 40, 4),
			cframe = CFrame.lookAt(pos + Vector3.new(0, 20, 0), Vector3.new(0, 20, 0)),
			transparency = 1,
			name = "RimBarrier",
		})
		Build.part(parent, {
			size = Vector3.new(44, 40, 2),
			cframe = CFrame.lookAt(pos + Vector3.new(0, 20, 0), Vector3.new(0, 20, 0)),
			transparency = 1,
			name = "RimWall",
		})
		if i % 2 == 0 then
			Build.crystal(parent, pos, if i % 4 == 0 then RIFT else Color3.fromRGB(110, 190, 255), 1.4)
		end
	end
	-- spawn
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "NexusSpawn"
	spawn.Anchored = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(P.NexusSpawn.X, 0.1, P.NexusSpawn.Z)
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Parent = parent
end

local function buildSpire(parent: Instance)
	local model = Build.model(parent, "SoulforgeSpire")
	-- stepped marble plinth with gold inlay rings
	Build.cylinder(model, 22, 1.6, Vector3.new(0, 0.8, 0), MARBLE, Enum.Material.Marble, "Plinth1")
	Build.cylinder(model, 17, 1.6, Vector3.new(0, 2.4, 0), TRIM, Enum.Material.Slate, "Plinth2")
	Build.cylinder(model, 12, 1.4, Vector3.new(0, 3.9, 0), STONE, Enum.Material.Slate, "Plinth3")
	Build.cylinder(model, 17.4, 0.25, Vector3.new(0, 3.25, 0), GOLD, Enum.Material.Neon, "InlayRing")
	Build.cylinder(model, 22.4, 0.25, Vector3.new(0, 1.65, 0), RIFT, Enum.Material.Neon, "InlayRing")
	-- tapered obsidian obelisk with glowing veins
	local y = 4.6
	for i, w in { 4.2, 3.4, 2.6, 1.8 } do
		local h = 6 - i * 0.6
		Build.part(model, {
			size = Vector3.new(w, h, w),
			cframe = CFrame.new(0, y + h / 2, 0) * CFrame.Angles(0, math.rad(45), 0),
			color = Color3.fromRGB(30, 26, 42),
			material = Enum.Material.Basalt,
			name = "Obelisk" .. i,
		})
		for _, side in { 0, 90, 180, 270 } do
			Build.part(model, {
				size = Vector3.new(0.18, h * 0.8, 0.12),
				cframe = CFrame.new(0, y + h / 2, 0) * CFrame.Angles(0, math.rad(45 + side), 0) * CFrame.new(0, 0, -w / 2 - 0.02),
				color = RIFT,
				material = Enum.Material.Neon,
				collide = false,
				castShadow = false,
				name = "Vein",
			})
		end
		y += h
	end
	-- four slender crystal shards leaning outward, glass shell + thin neon core
	for i = 1, 4 do
		local angle = i / 4 * math.pi * 2 + math.pi / 4
		local base = CFrame.new(math.cos(angle) * 6.5, 0, math.sin(angle) * 6.5)
			* CFrame.Angles(0, -angle, 0)
			* CFrame.Angles(0, 0, math.rad(-14))
		local shell = Build.part(model, {
			size = Vector3.new(1.3, 14, 1.3),
			cframe = base * CFrame.new(0, 10, 0) * CFrame.Angles(0, math.rad(45), 0),
			color = Color3.fromRGB(150, 110, 230),
			material = Enum.Material.Glass,
			collide = false,
			name = "Shard",
		})
		shell.Transparency = 0.35
		Build.part(model, {
			size = Vector3.new(0.35, 13, 0.35),
			cframe = base * CFrame.new(0, 10, 0),
			color = RIFT,
			material = Enum.Material.Neon,
			collide = false,
			castShadow = false,
			name = "ShardCore",
		})
	end
	-- floating soul core: glass diamond around a smaller neon heart
	local core = Build.part(model, {
		size = Vector3.new(4.5, 4.5, 4.5),
		cframe = CFrame.new(0, 34, 0) * CFrame.Angles(math.rad(45), 0, math.rad(35)),
		color = Color3.fromRGB(190, 150, 255),
		material = Enum.Material.Glass,
		collide = false,
		name = "Core",
	})
	core.Transparency = 0.3
	local heart = Build.part(model, {
		size = Vector3.new(2.2, 2.2, 2.2),
		cframe = CFrame.new(0, 34, 0) * CFrame.Angles(math.rad(45), 0, math.rad(35)),
		color = Color3.fromRGB(210, 170, 255),
		material = Enum.Material.Neon,
		collide = false,
		castShadow = false,
		name = "CoreHeart",
	})
	Build.light(heart, Color3.fromRGB(190, 140, 255), 60, 3)
	Build.particles(heart, Color3.fromRGB(200, 160, 255), 18, {
		speed = NumberRange.new(3, 6),
		lifetime = NumberRange.new(1.5, 2.5),
		size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0) }),
	})
	core:SetAttribute("Spin", 0.6)
	heart:SetAttribute("Spin", -0.9)
	-- orbiting rune ring (rotated client-side)
	local ring = Build.model(model, "Ring")
	for i = 1, 24 do
		local angle = i / 24 * math.pi * 2
		Build.part(ring, {
			size = Vector3.new(0.5, 0.5, 2.2),
			cframe = CFrame.lookAt(Vector3.new(math.cos(angle) * 9, 34, math.sin(angle) * 9), Vector3.new(0, 34, 0)),
			color = if i % 3 == 0 then RIFT else GOLD,
			material = Enum.Material.Neon,
			collide = false,
			name = "RingShard",
			castShadow = false,
		})
	end
	ring:SetAttribute("SpinModel", 0.25)
	ring.PrimaryPart = ring:FindFirstChildWhichIsA("BasePart")
end

-- Scatter trees, rocks, flower beds and lanterns over the grass ring, away from paths/stations.
local function decorate(parent: Instance)
	local model = Build.model(parent, "Decoration")
	local rng = Random.new(4242)
	local blockers = {}
	for _, point in P do
		if typeof(point) == "Vector3" and point.Magnitude < 200 then
			table.insert(blockers, point)
		end
	end
	local function nearPath(pos: Vector3): boolean
		for _, target in blockers do
			local flatTarget = Vector3.new(target.X, 0, target.Z)
			local len = flatTarget.Magnitude
			if len > 1 then
				local along = math.clamp(pos:Dot(flatTarget.Unit), 0, len)
				if (pos - flatTarget.Unit * along).Magnitude < 9 then
					return true
				end
			end
			if (pos - flatTarget).Magnitude < 32 then
				return true
			end
		end
		return false
	end
	local placed = 0
	for _ = 1, 400 do
		if placed >= 70 then
			break
		end
		local angle = rng:NextNumber(0, math.pi * 2)
		local r = rng:NextNumber(66, 158)
		local pos = Vector3.new(math.cos(angle) * r, 0, math.sin(angle) * r)
		if not nearPath(pos) then
			placed += 1
			local roll = rng:NextNumber()
			if roll < 0.45 then
				Build.tree(model, pos, rng:NextNumber(0.8, 1.25), rng:NextNumber() < 0.6)
			elseif roll < 0.6 then
				Build.pine(model, pos, rng:NextNumber(0.8, 1.2))
			elseif roll < 0.75 then
				Build.rock(model, pos, rng:NextNumber(0.6, 1.1), Color3.fromRGB(110, 104, 120))
			elseif roll < 0.92 then
				Build.flowers(model, pos, rng)
			else
				Build.crystal(model, pos, if rng:NextNumber() < 0.5 then RIFT else Color3.fromRGB(110, 190, 255), 0.9)
			end
		end
	end
end

local function buildForge(parent: Instance)
	local model = Build.model(parent, "Forge")
	local c = P.Forge
	local base = CFrame.new(c) * CFrame.Angles(0, 0, 0) -- faces +Z (towards the plaza)
	Build.block(model, Vector3.new(34, 1, 22), base * CFrame.new(0, 0.5, -4), TRIM, Enum.Material.Slate, "Floor")
	Build.block(model, Vector3.new(34, 18, 2), base * CFrame.new(0, 9, -15), STONE, Enum.Material.Brick, "BackWall")
	Build.block(model, Vector3.new(2, 18, 22), base * CFrame.new(-17, 9, -4), STONE, Enum.Material.Brick, "SideWall")
	Build.block(model, Vector3.new(2, 18, 22), base * CFrame.new(17, 9, -4), STONE, Enum.Material.Brick, "SideWall")
	Build.part(model, { size = Vector3.new(38, 2, 26), cframe = base * CFrame.new(0, 19, -4) * CFrame.Angles(math.rad(-8), 0, 0), color = Color3.fromRGB(70, 40, 40), material = Enum.Material.WoodPlanks, name = "Roof" })
	-- furnace
	Build.block(model, Vector3.new(12, 12, 8), base * CFrame.new(-7, 6, -10), Color3.fromRGB(50, 44, 50), Enum.Material.Brick, "Furnace")
	local mouth = Build.neon(model, Vector3.new(6, 4, 0.5), base * CFrame.new(-7, 4, -5.8), Color3.fromRGB(255, 120, 40), "FurnaceMouth")
	Build.light(mouth, Color3.fromRGB(255, 140, 60), 30, 3)
	Build.particles(mouth, Color3.fromRGB(255, 150, 60), 10, { acceleration = Vector3.new(0, 8, 0), spread = Vector2.new(20, 20) })
	Build.block(model, Vector3.new(4, 16, 4), base * CFrame.new(-7, 20, -11), STONE, Enum.Material.Brick, "Chimney")
	-- anvil
	Build.block(model, Vector3.new(3, 2.5, 2), base * CFrame.new(6, 1.25, -4), Color3.fromRGB(40, 40, 46), Enum.Material.Metal, "AnvilBase")
	Build.block(model, Vector3.new(5, 1.2, 2.4), base * CFrame.new(6, 3.1, -4), Color3.fromRGB(70, 72, 82), Enum.Material.Metal, "AnvilTop")
	Build.neon(model, Vector3.new(0.3, 0.2, 3.5), base * CFrame.new(6, 3.9, -4) * CFrame.Angles(0, math.rad(70), 0), GOLD, "GlowingBlade")
	-- weapon rack showing planned families (not functional, clearly labelled)
	for i = 1, 5 do
		Build.block(model, Vector3.new(0.4, 6, 0.4), base * CFrame.new(10 + i * 1.2, 4, -13.6) * CFrame.Angles(0, 0, math.rad(8)), Color3.fromRGB(150, 150, 160), Enum.Material.Metal, "RackBlade")
	end
	Build.sign(model, "THE SOULFORGE", base * CFrame.new(0, 15, 7.2) * CFrame.Angles(0, math.rad(180), 0), Vector2.new(20, 3.5), Color3.fromRGB(30, 22, 30), GOLD)
	station(model, "ForgeStation", c + Vector3.new(6, 0, 0), "Forge", "Forge", "Upgrades & Tempers", "Forge")
end

local function buildBench(parent: Instance)
	local model = Build.model(parent, "ArtisanBench")
	local c = P.ArtisanBench
	local cf = facing(c, Vector3.zero)
	Build.block(model, Vector3.new(10, 1, 4), cf * CFrame.new(0, 3, 0), Color3.fromRGB(110, 76, 50), Enum.Material.WoodPlanks, "Table")
	for _, x in { -4.5, 4.5 } do
		Build.block(model, Vector3.new(0.8, 3, 3.5), cf * CFrame.new(x, 1.5, 0), Color3.fromRGB(80, 56, 40), Enum.Material.Wood, "Leg")
	end
	Build.neon(model, Vector3.new(1, 1, 1), cf * CFrame.new(-2, 4, 0), Color3.fromRGB(80, 150, 255), "Vial")
	Build.neon(model, Vector3.new(1, 1.4, 1), cf * CFrame.new(2, 4.2, 0), Color3.fromRGB(255, 140, 80), "Vial")
	Build.sign(model, "ARTISAN BENCH", cf * CFrame.new(0, 8, 1.5), Vector2.new(10, 2), nil, Color3.fromRGB(200, 230, 255))
	station(model, "BenchStation", c, "Forge", "Craft", "Artisan Bench", "Bench")
end

local function buildFusion(parent: Instance)
	local model = Build.model(parent, "FusionChamber")
	local c = P.FusionChamber
	Build.cylinder(model, 34, 1.2, c + Vector3.new(0, 0.6, 0), TRIM, Enum.Material.Marble, "Dais")
	Build.cylinder(model, 26, 0.3, c + Vector3.new(0, 1.3, 0), Color3.fromRGB(40, 30, 60), Enum.Material.Slate, "Inlay")
	local colors = { Color3.fromRGB(255, 106, 61), Color3.fromRGB(79, 195, 255), Color3.fromRGB(162, 123, 255) }
	for i, color in colors do
		local angle = i / 3 * math.pi * 2
		local pos = c + Vector3.new(math.cos(angle) * 11, 0, math.sin(angle) * 11)
		Build.cylinder(model, 2.4, 12, pos + Vector3.new(0, 7, 0), STONE, Enum.Material.Slate, "Pillar")
		local orb = Build.ball(model, 3, pos + Vector3.new(0, 15, 0), color, Enum.Material.Neon, "EssenceOrb")
		orb.CanCollide = false
		Build.light(orb, color, 18, 2)
		Build.neon(model, Vector3.new(0.4, 0.1, 11), CFrame.lookAt(c:Lerp(pos, 0.5) + Vector3.new(0, 1.5, 0), pos + Vector3.new(0, 1.5, 0)), color, "Channel")
	end
	local altar = Build.cylinder(model, 5, 3, c + Vector3.new(0, 2.7, 0), STONE, Enum.Material.Slate, "Altar")
	local heart = Build.part(model, {
		size = Vector3.new(2.5, 2.5, 2.5),
		cframe = CFrame.new(c + Vector3.new(0, 7, 0)) * CFrame.Angles(math.rad(45), 0, math.rad(45)),
		color = Color3.fromRGB(255, 220, 255),
		material = Enum.Material.Neon,
		collide = false,
		name = "FusionHeart",
	})
	heart:SetAttribute("Spin", 1.2)
	Build.light(heart, Color3.fromRGB(240, 200, 255), 24, 2)
	Build.sign(model, "FUSION CHAMBER", CFrame.lookAt(c + Vector3.new(0, 20, 0), Vector3.new(0, 20, 0)), Vector2.new(16, 3), nil, Color3.fromRGB(230, 200, 255))
	station(model, "FusionStation", c, "Fusion", "Open", "Fusion Codex & Attunement", "Fusion")
	local _ = altar
end

local function buildTraining(parent: Instance)
	local model = Build.model(parent, "TrainingArena")
	local c = P.TrainingArena
	Build.block(model, Vector3.new(58, 0.6, 58), CFrame.new(c + Vector3.new(0, 0.3, 0)), Color3.fromRGB(150, 120, 90), Enum.Material.WoodPlanks, "Floor")
	for _, side in { { Vector3.new(0, 0, -29), 0 }, { Vector3.new(0, 0, 29), 0 }, { Vector3.new(29, 0, 0), 90 }, { Vector3.new(-29, 0, 0), 90 } } do
		local offset, rot = side[1], side[2]
		local wall = CFrame.new(c + offset + Vector3.new(0, 1.5, 0)) * CFrame.Angles(0, math.rad(rot), 0)
		Build.block(model, Vector3.new(58, 3, 1.5), wall * CFrame.new(-16, 0, 0) * CFrame.new(0, 0, 0), TRIM, Enum.Material.Slate, "Rail")
		Build.block(model, Vector3.new(14, 3, 1.5), wall * CFrame.new(22, 0, 0), TRIM, Enum.Material.Slate, "Rail")
	end
	for _, corner in { Vector3.new(-29, 0, -29), Vector3.new(29, 0, -29), Vector3.new(-29, 0, 29), Vector3.new(29, 0, 29) } do
		Build.torch(model, c + corner, Color3.fromRGB(120, 255, 190))
	end
	Build.sign(model, "TRAINING ARENA", CFrame.new(c + Vector3.new(0, 10, -30)) * CFrame.Angles(0, math.rad(180), 0), Vector2.new(18, 3), nil, Color3.fromRGB(150, 255, 200))
	-- trial pedestal
	local t = P.TrialPedestal
	Build.cylinder(model, 5, 3, t + Vector3.new(0, 1.5, 0), STONE, Enum.Material.Slate, "TrialPedestal")
	local blade = Build.neon(model, Vector3.new(0.4, 6, 1), CFrame.new(t + Vector3.new(0, 6, 0)) * CFrame.Angles(0, 0, math.rad(10)), Color3.fromRGB(120, 230, 255), "TrialBlade")
	Build.light(blade, Color3.fromRGB(120, 230, 255), 14, 1.5)
	Build.label(blade, "KATANA TRIAL", Vector3.new(0, 5, 0), Color3.fromRGB(150, 235, 255))
	station(model, "TrialStation", t, "Trial", "Inspect", "Katana Trial", "Trial")
end

local function buildPortal(parent: Instance)
	local model = Build.model(parent, "RiftPortal")
	local c = P.ExpeditionPortal
	Build.block(model, Vector3.new(30, 1.2, 14), CFrame.new(c + Vector3.new(0, 0.6, 0)), TRIM, Enum.Material.Slate, "Steps")
	local radius = 11
	local center = c + Vector3.new(0, 13, 0)
	for i = 1, 28 do
		local angle = i / 28 * math.pi * 2
		local pos = center + Vector3.new(math.cos(angle) * radius, math.sin(angle) * radius, 0)
		Build.part(model, {
			size = Vector3.new(2.4, 2.8, 3),
			cframe = CFrame.new(pos) * CFrame.Angles(0, 0, angle),
			color = if i % 2 == 0 then STONE else Color3.fromRGB(255, 120, 60),
			material = if i % 2 == 0 then Enum.Material.Slate else Enum.Material.Neon,
			name = "RingStone",
		})
	end
	local disc = Build.part(model, {
		size = Vector3.new(0.4, radius * 2 - 2, radius * 2 - 2),
		cframe = CFrame.new(center) * CFrame.Angles(0, math.rad(90), 0),
		color = Color3.fromRGB(255, 120, 70),
		material = Enum.Material.Neon,
		shape = Enum.PartType.Cylinder,
		collide = false,
		name = "PortalSurface",
	})
	disc.Transparency = 0.35
	Build.light(disc, Color3.fromRGB(255, 130, 70), 40, 3)
	Build.particles(disc, Color3.fromRGB(255, 150, 90), 25, { speed = NumberRange.new(2, 5) })
	Build.sign(model, "RIFT PORTAL\nEMBERFALL FRONTIER", CFrame.new(c + Vector3.new(0, 28, 0)), Vector2.new(18, 4.5), nil, Color3.fromRGB(255, 180, 120))
	station(model, "PortalStation", c + Vector3.new(0, 0, -4), "Expedition", "Expedition", "Emberfall Frontier", "Portal")
end

local function buildQuestBoard(parent: Instance)
	local model = Build.model(parent, "QuestBoard")
	local c = P.QuestBoard
	local cf = facing(c, P.NexusSpawn)
	for _, x in { -5, 5 } do
		Build.block(model, Vector3.new(1, 10, 1), cf * CFrame.new(x, 5, 0), Color3.fromRGB(90, 62, 44), Enum.Material.Wood, "Post")
	end
	local board = Build.sign(model, "CONTRACTS\n\nMain path • Exploration\nGathering • Mastery\nCo-op • Boss • Daily", cf * CFrame.new(0, 6, 0.6), Vector2.new(10, 7), Color3.fromRGB(60, 44, 34), Color3.fromRGB(255, 230, 190))
	board.Name = "QuestBoardFace"
	station(model, "QuestStation", c, "Quests", "Read", "Quest & Bounty Board", "QuestBoard")
end

local function buildBossGate(parent: Instance)
	local model = Build.model(parent, "WardenGate")
	local c = P.BossGate
	local cf = facing(c, Vector3.zero)
	for _, x in { -7, 7 } do
		Build.block(model, Vector3.new(3, 22, 3), cf * CFrame.new(x, 11, 0), Color3.fromRGB(30, 26, 36), Enum.Material.Basalt, "Pillar")
		Build.neon(model, Vector3.new(0.4, 20, 0.4), cf * CFrame.new(x, 11, -1.6), Color3.fromRGB(255, 50, 120), "Vein")
	end
	Build.block(model, Vector3.new(18, 3, 3), cf * CFrame.new(0, 23, 0), Color3.fromRGB(30, 26, 36), Enum.Material.Basalt, "Lintel")
	local veil = Build.part(model, { size = Vector3.new(11, 20, 0.3), cframe = cf * CFrame.new(0, 11, 0), color = Color3.fromRGB(120, 20, 60), material = Enum.Material.ForceField, collide = false, name = "Veil" })
	veil.Transparency = 0.2
	Build.light(veil, Color3.fromRGB(255, 60, 120), 22, 2)
	Build.sign(model, "WARDEN GATE", cf * CFrame.new(0, 27, -1.6), Vector2.new(14, 2.5), nil, Color3.fromRGB(255, 120, 160))
	station(model, "BossGateStation", c, "BossGate", "Inspect", "The Fracture Warden", "BossGate")
end

local function buildGarden(parent: Instance)
	local model = Build.model(parent, "SocialGarden")
	local c = P.SocialGarden
	Build.cylinder(model, 44, 0.4, c + Vector3.new(0, 0.2, 0), Color3.fromRGB(80, 120, 70), Enum.Material.Grass, "Lawn")
	Build.cylinder(model, 12, 2, c + Vector3.new(0, 1, 0), MARBLE, Enum.Material.Marble, "FountainBase")
	local water = Build.cylinder(model, 10, 0.4, c + Vector3.new(0, 2.1, 0), Color3.fromRGB(90, 170, 255), Enum.Material.Glass, "Water")
	water.Transparency = 0.3
	local jet = Build.neon(model, Vector3.new(1, 6, 1), CFrame.new(c + Vector3.new(0, 5, 0)), Color3.fromRGB(150, 210, 255), "Jet")
	Build.particles(jet, Color3.fromRGB(180, 220, 255), 30, { acceleration = Vector3.new(0, -20, 0), speed = NumberRange.new(8, 12), spread = Vector2.new(25, 25) })
	for i = 1, 6 do
		local angle = i / 6 * math.pi * 2
		local pos = c + Vector3.new(math.cos(angle) * 14, 0, math.sin(angle) * 14)
		local cf = facing(pos, c)
		Build.block(model, Vector3.new(6, 0.6, 2), cf * CFrame.new(0, 1.6, 0), Color3.fromRGB(120, 86, 60), Enum.Material.WoodPlanks, "Bench")
		Build.block(model, Vector3.new(6, 2, 0.4), cf * CFrame.new(0, 2.6, 1), Color3.fromRGB(120, 86, 60), Enum.Material.WoodPlanks, "BenchBack")
		Build.tree(model, c + Vector3.new(math.cos(angle + 0.5) * 20, 0, math.sin(angle + 0.5) * 20), 0.8, i % 2 == 0)
	end
	Build.sign(model, "THE GATHERING GARDEN", CFrame.new(c + Vector3.new(0, 1.5, 22)) * CFrame.new(0, 3, 0), Vector2.new(12, 2), nil, Color3.fromRGB(190, 255, 200))
end

local function buildEchoes(parent: Instance)
	local model = Build.model(parent, "HallOfEchoes")
	local c = P.HallOfEchoes
	local cf = facing(c, Vector3.zero)
	Build.block(model, Vector3.new(30, 1, 16), cf * CFrame.new(0, 0.5, 0), TRIM, Enum.Material.Marble, "Floor")
	local board = Build.sign(model, "HALL OF ECHOES", cf * CFrame.new(0, 9, 7), Vector2.new(22, 12), Color3.fromRGB(24, 20, 34), Color3.fromRGB(230, 220, 255))
	board.Name = "EchoBoard"
	local label = board:FindFirstChildWhichIsA("SurfaceGui", true):FindFirstChildWhichIsA("TextLabel")
	if label then
		label.Name = "Text"
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
	end
	for i = -2, 2 do
		local pos = (cf * CFrame.new(i * 5, 0, 2)).Position
		Build.cylinder(model, 2.5, 3, pos + Vector3.new(0, 1.5, 0), MARBLE, Enum.Material.Marble, "Pedestal")
		local relic = Build.part(model, {
			size = Vector3.new(1.4, 1.4, 1.4),
			cframe = CFrame.new(pos + Vector3.new(0, 4.2, 0)) * CFrame.Angles(math.rad(45), math.rad(i * 20), 0),
			color = Color3.fromHSV((i + 2) / 5, 0.6, 1),
			material = Enum.Material.Neon,
			collide = false,
			name = "Relic",
		})
		relic:SetAttribute("Spin", 0.8)
	end
	station(model, "EchoStation", c, "Codex", "Open", "Codex & Achievements", "Codex")
end

local function buildKiosk(parent: Instance)
	local model = Build.model(parent, "CosmeticKiosk")
	local c = P.CosmeticKiosk
	local cf = facing(c, Vector3.zero)
	Build.block(model, Vector3.new(10, 3, 4), cf * CFrame.new(0, 1.5, 0), Color3.fromRGB(70, 50, 90), Enum.Material.WoodPlanks, "Counter")
	for _, x in { -4.5, 4.5 } do
		Build.block(model, Vector3.new(0.6, 9, 0.6), cf * CFrame.new(x, 4.5, 1.5), Color3.fromRGB(60, 40, 70), Enum.Material.Wood, "Pole")
	end
	Build.part(model, { size = Vector3.new(12, 0.6, 6), cframe = cf * CFrame.new(0, 9, 0.5) * CFrame.Angles(math.rad(10), 0, 0), color = Color3.fromRGB(200, 90, 200), material = Enum.Material.Fabric, name = "Canopy" })
	Build.sign(model, "STYLE KIOSK", cf * CFrame.new(0, 10.5, -2.2), Vector2.new(9, 1.6), nil, Color3.fromRGB(255, 190, 255))
	station(model, "KioskStation", c, "Store", "Browse", "Cosmetics", "Store")
end

local function buildAnnouncement(parent: Instance)
	local model = Build.model(parent, "Announcement")
	local p = P.Announcement
	local board = Build.part(model, {
		size = Vector3.new(36, 10, 0.6),
		cframe = CFrame.new(p),
		color = Color3.fromRGB(16, 14, 24),
		material = Enum.Material.SmoothPlastic,
		collide = false,
		name = "AnnouncementBoard",
	})
	Build.neon(model, Vector3.new(37, 0.4, 0.8), CFrame.new(p + Vector3.new(0, 5.2, 0)), RIFT, "Trim")
	Build.neon(model, Vector3.new(37, 0.4, 0.8), CFrame.new(p - Vector3.new(0, 5.2, 0)), RIFT, "Trim")
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.CanvasSize = Vector2.new(1440, 400)
	gui.LightInfluence = 0
	gui.Parent = board
	local label = Instance.new("TextLabel")
	label.Name = "Text"
	label.Size = UDim2.fromScale(0.94, 0.86)
	label.Position = UDim2.fromScale(0.03, 0.07)
	label.BackgroundTransparency = 1
	label.TextScaled = true
	label.Font = Enum.Font.GothamBlack
	label.TextColor3 = Color3.fromRGB(230, 225, 255)
	label.Text = "THE NEXUS"
	label.Parent = gui
	-- a duplicate face so it reads from both sides
	local back = gui:Clone()
	back.Face = Enum.NormalId.Front
	back.Parent = board
end

local function buildSignposts(parent: Instance)
	local model = Build.model(parent, "Signposts")
	local entries = {
		{ "FORGE", P.Forge },
		{ "FUSION", P.FusionChamber },
		{ "TRAINING", P.TrainingArena },
		{ "RIFT PORTAL", P.ExpeditionPortal },
		{ "WARDEN GATE", P.BossGate },
		{ "HALL OF ECHOES", P.HallOfEchoes },
	}
	for i, entry in entries do
		local target = entry[2]
		local dir = Vector3.new(target.X, 0, target.Z)
		dir = if dir.Magnitude > 0 then dir.Unit else Vector3.new(0, 0, 1)
		local pos = dir * 24
		Build.block(model, Vector3.new(0.6, 7, 0.6), CFrame.new(pos + Vector3.new(0, 3.5, 0)), Color3.fromRGB(90, 70, 50), Enum.Material.Wood, "Post")
		local sign = Build.sign(model, entry[1], CFrame.lookAt(pos + Vector3.new(0, 6.5, 0), pos + Vector3.new(0, 6.5, 0) - dir) * CFrame.new(0, 0, 0), Vector2.new(7, 1.4), Color3.fromRGB(50, 40, 34), Color3.fromRGB(255, 230, 180))
		sign.Name = "Signpost" .. i
	end
end

function Nexus.build(world: Instance)
	local folder = Build.folder(world, "Nexus")
	buildPlaza(folder)
	buildSpire(folder)
	for _, target in { P.Forge, P.FusionChamber, P.TrainingArena, P.ExpeditionPortal, P.QuestBoard, P.BossGate, P.SocialGarden, P.HallOfEchoes, P.CosmeticKiosk, P.ArtisanBench } do
		path(folder, Vector3.zero, target, 10)
	end
	decorate(folder)
	buildForge(folder)
	buildBench(folder)
	buildFusion(folder)
	buildTraining(folder)
	buildPortal(folder)
	buildQuestBoard(folder)
	buildBossGate(folder)
	buildGarden(folder)
	buildEchoes(folder)
	buildKiosk(folder)
	buildAnnouncement(folder)
	buildSignposts(folder)
	-- ambient lanterns along the plaza ring
	for i = 1, 12 do
		local angle = i / 12 * math.pi * 2 + 0.13
		Build.torch(folder, Vector3.new(math.cos(angle) * 58, 0, math.sin(angle) * 58), if i % 2 == 0 then GOLD else RIFT)
	end
end

return Nexus
