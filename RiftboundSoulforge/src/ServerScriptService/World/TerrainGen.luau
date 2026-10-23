--!strict
-- Smooth Terrain dressing: grass with blade decoration, dirt trails, rolling hills, mountain
-- ranges, lava beds and floating rock. Gameplay floors stay as (now invisible) Parts at y = 0,
-- so collision and telegraph raycasts are unchanged; terrain surfaces sit flush on top.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local WorldConfig = require(Shared.Config.WorldConfig)

local TerrainGen = {}

local E = WorldConfig.EmberfallOrigin
local M = Enum.Material

local function at(x: number, z: number, y: number?): Vector3
	return E + Vector3.new(x, y or 0, z)
end

local function hide(world: Instance, names: { string })
	for _, inst in world:GetDescendants() do
		if inst:IsA("BasePart") and table.find(names, inst.Name) then
			inst.Transparency = 1
		end
	end
end

-- Fills a slab whose TOP is at y = 0 (terrain voxels are 4 studs; keep slabs >= 4 thick).
local function slab(terrain: Terrain, center: Vector3, sizeX: number, sizeZ: number, depth: number, material: Enum.Material)
	terrain:FillBlock(CFrame.new(center.X, center.Y - depth / 2, center.Z), Vector3.new(sizeX, depth, sizeZ), material)
end

-- Craggy rock mass: a randomly tilted terrain block. Overlapping tilted blocks read as layered,
-- faceted crags (smooth terrain softens their edges) instead of round blobs.
local function crag(terrain: Terrain, rng: Random, center: Vector3, size: Vector3, material: Enum.Material, maxTilt: number?)
	local m = maxTilt or 0.3
	local tilt = CFrame.Angles(rng:NextNumber(-m, m), rng:NextNumber(0, math.pi), rng:NextNumber(-m, m))
	terrain:FillBlock(CFrame.new(center) * tilt, size, material)
end

-- Floating rock: a grassy (or bare) top with tilted rock layers tapering downwards into a
-- jagged keel, like the underside of a torn-off island.
local function floatingRock(terrain: Terrain, rng: Random, top: Vector3, radius: number, cap: Enum.Material?)
	local layers = 5
	for i = 0, layers - 1 do
		local t = i / layers
		local w = radius * 2 * (1 - t * 0.8)
		local h = radius * 0.55
		local c = top - Vector3.new(rng:NextNumber(-1, 1) * radius * 0.12, h * 0.5 + i * h * 0.75, rng:NextNumber(-1, 1) * radius * 0.12)
		-- big slabs tilt less so their edges never rise through the floor above
		crag(terrain, rng, c, Vector3.new(w, h, w * rng:NextNumber(0.8, 1)), if i % 2 == 0 then M.Rock else M.Slate, math.min(0.3, 5 / radius))
	end
	if cap then
		terrain:FillBlock(CFrame.new(top - Vector3.new(0, 2, 0)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0), Vector3.new(radius * 1.8, 4, radius * 1.6), cap)
	end
end

local function hills(terrain: Terrain, rng: Random, x1: number, x2: number, z: number, step: number)
	for x = x1, x2, step do
		local r = rng:NextNumber(26, 40)
		local p = at(x + rng:NextNumber(-8, 8), z + rng:NextNumber(-10, 10), rng:NextNumber(0, 10))
		crag(terrain, rng, p, Vector3.new(r * 2, r * 1.3, r * 1.7), M.Rock)
		crag(terrain, rng, p + Vector3.new(rng:NextNumber(-10, 10), r * 0.8, rng:NextNumber(-6, 6)), Vector3.new(r * 1.3, r * 0.9, r * 1.1), if rng:NextNumber() < 0.5 then M.Slate else M.Rock)
		crag(terrain, rng, p + Vector3.new(rng:NextNumber(-8, 8), r * 1.35, 0), Vector3.new(r * 0.8, r * 0.45, r * 0.8), M.Rock)
		terrain:FillBall(p + Vector3.new(0, r * 0.55, 0), r * 0.5, M.Grass)
		if rng:NextNumber() < 0.4 then
			terrain:FillBall(p + Vector3.new(rng:NextNumber(-15, 15), r * 0.9, 0), r * 0.3, M.LeafyGrass)
		end
	end
end

-- Organic cliff face: a chain of stacked, jittered rock masses whose inner edge stays just
-- outside the playable boundary line a -> b. `normal` points away from the playfield.
local function cliffLine(terrain: Terrain, rng: Random, a: Vector2, b: Vector2, normal: Vector2, yBase: number, height: number)
	local length = (b - a).Magnitude
	local dir = (b - a).Unit
	local steps = math.max(1, math.floor(length / 12))
	for i = 0, steps do
		local p = a + dir * (length * i / steps) + dir * rng:NextNumber(-3, 3)
		local w = rng:NextNumber(18, 26) -- along the cliff
		local d = rng:NextNumber(14, 20) -- into the cliff
		local c = p + normal * (d * 0.75 + 2)
		local y = yBase
		local top = yBase + height + rng:NextNumber(-6, 10)
		while y < top do
			local h = rng:NextNumber(9, 15)
			local material = if rng:NextNumber() < 0.35 then M.Slate else M.Rock
			local size = Vector3.new(w, h, d)
			local yaw = math.atan2(dir.Y, dir.X)
			local cf = CFrame.new(at(c.X, c.Y, y + h / 2))
				* CFrame.Angles(0, -yaw, 0)
				* CFrame.Angles(rng:NextNumber(-0.18, 0.18), rng:NextNumber(-0.2, 0.2), rng:NextNumber(-0.22, 0.22))
			terrain:FillBlock(cf, size, material)
			y += h * rng:NextNumber(0.75, 0.95)
			w *= rng:NextNumber(0.78, 0.95)
			c += normal * rng:NextNumber(1.5, 4) + dir * rng:NextNumber(-3, 3)
		end
		if rng:NextNumber() < 0.4 then
			terrain:FillBall(at(c.X + rng:NextNumber(-3, 3), c.Y, y), rng:NextNumber(5, 8), if rng:NextNumber() < 0.5 then M.Grass else M.LeafyGrass)
		end
	end
end

function TerrainGen.build(world: Instance)
	local terrain = workspace.Terrain
	local rng = Random.new(99)

	-- Stylised autumn palette
	terrain:SetMaterialColor(M.Grass, Color3.fromRGB(126, 140, 62))
	terrain:SetMaterialColor(M.LeafyGrass, Color3.fromRGB(198, 122, 56))
	terrain:SetMaterialColor(M.Ground, Color3.fromRGB(116, 86, 60))
	terrain:SetMaterialColor(M.Rock, Color3.fromRGB(104, 90, 84))
	terrain:SetMaterialColor(M.Basalt, Color3.fromRGB(46, 40, 54))
	terrain:SetMaterialColor(M.CrackedLava, Color3.fromRGB(255, 110, 40))
	terrain:SetMaterialColor(M.Pebble, Color3.fromRGB(120, 112, 104))
	terrain:SetMaterialColor(M.Slate, Color3.fromRGB(88, 78, 76))
	terrain.WaterColor = Color3.fromRGB(70, 120, 170)
	terrain.WaterTransparency = 0.6
	terrain.WaterWaveSize = 0.1
	terrain.WaterReflectance = 0.4
	if not terrain:FindFirstChildOfClass("Clouds") then
		local clouds = Instance.new("Clouds")
		clouds.Cover = 0.55
		clouds.Density = 0.55
		clouds.Color = Color3.fromRGB(255, 226, 210)
		clouds.Parent = terrain
	end

	-- The Nexus: grass island with rocky underside and floating islets.
	terrain:FillCylinder(CFrame.new(0, -4, 0), 8, 168, M.Grass)
	-- underside: the island tapers into a craggy inverted mountain
	floatingRock(terrain, rng, Vector3.new(0, -10, 0), 112, nil)
	for i = 1, 10 do
		local angle = i / 10 * math.pi * 2
		local r = rng:NextNumber(90, 130)
		floatingRock(terrain, rng, Vector3.new(math.cos(angle) * r, -20, math.sin(angle) * r), rng:NextNumber(26, 38), nil)
	end
	for i = 1, 8 do
		local angle = i / 8 * math.pi * 2 + 0.3
		local p = Vector3.new(math.cos(angle) * 260, rng:NextNumber(-10, 40), math.sin(angle) * 260)
		floatingRock(terrain, rng, p, rng:NextNumber(12, 20), M.Grass)
	end

	-- Emberfall ground: grass with leafy autumn patches and a dirt trail.
	slab(terrain, at(109, 0), 306, 200, 12, M.Grass)
	for _ = 1, 40 do
		local x, z = rng:NextNumber(70, 255), rng:NextNumber(-92, 92)
		slab(terrain, at(x, z), rng:NextNumber(10, 24), rng:NextNumber(10, 24), 4, M.LeafyGrass)
	end
	slab(terrain, at(109, 0), 306, 12, 4, M.Ground)
	slab(terrain, at(10, 0), 80, 100, 4, M.Ground) -- camp clearing
	slab(terrain, at(176, 0), 60, 60, 4, M.Pebble) -- outpost courtyard

	-- Keep plateau
	slab(terrain, at(442, 0), 205, 200, 12, M.Ground)
	for _ = 1, 24 do
		slab(terrain, at(rng:NextNumber(345, 540), rng:NextNumber(-95, 95)), rng:NextNumber(8, 18), rng:NextNumber(8, 18), 4, M.Pebble)
	end

	-- Mountain ranges framing the valley (outside the playable cliffs).
	hills(terrain, rng, -60, 560, -165, 34)
	hills(terrain, rng, -60, 560, 165, 34)
	for z = -120, 120, 40 do
		local p = at(-95, z, 10)
		crag(terrain, rng, p, Vector3.new(60, 50, 50), M.Rock)
		crag(terrain, rng, p + Vector3.new(-6, 30, 0), Vector3.new(40, 26, 34), M.Slate)
		terrain:FillBall(p + Vector3.new(0, 30, 0), 18, M.Grass)
	end

	-- Rocky cliffs enclosing Emberfall (replace the old straight cliff walls visually).
	local V = Vector2.new
	cliffLine(terrain, rng, V(-44, -100), V(262, -100), V(0, -1), 0, 38)
	cliffLine(terrain, rng, V(-44, 100), V(262, 100), V(0, 1), 0, 38)
	cliffLine(terrain, rng, V(-44, -100), V(-44, 100), V(-1, 0), 0, 38)
	cliffLine(terrain, rng, V(262, -100), V(340, -100), V(0, -1), -32, 70)
	cliffLine(terrain, rng, V(262, 100), V(340, 100), V(0, 1), -32, 70)
	cliffLine(terrain, rng, V(340, -100), V(545, -100), V(0, -1), 0, 38)
	cliffLine(terrain, rng, V(340, 100), V(545, 100), V(0, 1), 0, 38)
	-- Ravine walls become rough basalt instead of flat slabs.
	terrain:FillBlock(CFrame.new(at(253, 0, -16)), Vector3.new(18, 32, 200), M.Basalt)
	terrain:FillBlock(CFrame.new(at(349, 0, -16)), Vector3.new(18, 32, 200), M.Basalt)
	-- Keep the hidden Sunfall Chamber and its doorway hollow inside the north cliff.
	terrain:FillBlock(CFrame.new(at(200, -118, 10)), Vector3.new(34, 20, 36), M.Air)
	terrain:FillBlock(CFrame.new(at(200, -101, 9)), Vector3.new(14, 18, 10), M.Air)

	-- Cinder Ravine: cracked lava bed and basalt outcrops on the walls.
	terrain:FillBlock(CFrame.new(at(301, 0, -36)), Vector3.new(78, 8, 200), M.CrackedLava)
	for _ = 1, 14 do
		local side = if rng:NextNumber() < 0.5 then 262 else 340
		terrain:FillBall(at(side, rng:NextNumber(-95, 95), rng:NextNumber(-26, -6)), rng:NextNumber(5, 9), M.Basalt)
	end

	-- The Fracture Arena floats on a basalt mass with drifting shards.
	local arena = WorldConfig.Arena.center
	floatingRock(terrain, rng, arena + Vector3.new(0, -10, 0), 62, nil)
	terrain:FillBall(at(562, 0, -26), 20, M.Basalt) -- under the approach walkway
	for i = 1, 6 do
		local angle = i / 6 * math.pi * 2
		floatingRock(terrain, rng, arena + Vector3.new(math.cos(angle) * 120, rng:NextNumber(-20, 25), math.sin(angle) * 120), rng:NextNumber(8, 13), nil)
	end

	-- Parts that the terrain now visually replaces (they keep their collision).
	hide(world, {
		"Island",
		"FrontierGround",
		"Trail",
		"KeepGround",
		"NorthCliff",
		"SouthCliff",
		"WestCliff",
		"RavineNorth",
		"RavineSouth",
		"RavineFaceW",
		"RavineFaceE",
		"KeepNorth",
		"KeepSouth",
		"CliffSpike",
	})
end

return TerrainGen
