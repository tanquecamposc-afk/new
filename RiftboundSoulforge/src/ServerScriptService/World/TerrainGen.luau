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

local function hills(terrain: Terrain, rng: Random, x1: number, x2: number, z: number, step: number)
	for x = x1, x2, step do
		local r = rng:NextNumber(28, 46)
		local p = at(x + rng:NextNumber(-8, 8), z + rng:NextNumber(-10, 10), rng:NextNumber(4, 16))
		terrain:FillBall(p, r, M.Rock)
		terrain:FillBall(p + Vector3.new(0, r * 0.55, 0), r * 0.55, M.Grass)
		if rng:NextNumber() < 0.4 then
			terrain:FillBall(p + Vector3.new(rng:NextNumber(-15, 15), r * 0.9, 0), r * 0.35, M.LeafyGrass)
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
	for i = 1, 16 do
		local angle = i / 16 * math.pi * 2
		local r = rng:NextNumber(110, 150)
		terrain:FillBall(Vector3.new(math.cos(angle) * r, -46, math.sin(angle) * r), rng:NextNumber(26, 36), M.Rock)
	end
	terrain:FillBall(Vector3.new(0, -100, 0), 85, M.Rock)
	terrain:FillBall(Vector3.new(0, -170, 0), 55, M.Basalt)
	for i = 1, 8 do
		local angle = i / 8 * math.pi * 2 + 0.3
		local p = Vector3.new(math.cos(angle) * 260, rng:NextNumber(-10, 40), math.sin(angle) * 260)
		local r = rng:NextNumber(14, 24)
		terrain:FillBall(p, r, M.Rock)
		terrain:FillBall(p + Vector3.new(0, r * 0.6, 0), r * 0.6, M.Grass)
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
		local p = at(-90, z, 10)
		terrain:FillBall(p, 45, M.Rock)
		terrain:FillBall(p + Vector3.new(0, 26, 0), 24, M.Grass)
	end

	-- Cinder Ravine: cracked lava bed and basalt outcrops on the walls.
	terrain:FillBlock(CFrame.new(at(301, 0, -36)), Vector3.new(78, 8, 200), M.CrackedLava)
	for _ = 1, 14 do
		local side = if rng:NextNumber() < 0.5 then 262 else 340
		terrain:FillBall(at(side, rng:NextNumber(-95, 95), rng:NextNumber(-26, -6)), rng:NextNumber(5, 9), M.Basalt)
	end

	-- The Fracture Arena floats on a basalt mass with drifting shards.
	local arena = WorldConfig.Arena.center
	terrain:FillBall(arena + Vector3.new(0, -70, 0), 62, M.Basalt)
	terrain:FillBall(arena + Vector3.new(0, -130, 0), 34, M.Basalt)
	terrain:FillBall(at(562, 0, -26), 20, M.Basalt) -- under the approach walkway
	for i = 1, 6 do
		local angle = i / 6 * math.pi * 2
		terrain:FillBall(arena + Vector3.new(math.cos(angle) * 120, rng:NextNumber(-20, 25), math.sin(angle) * 120), rng:NextNumber(8, 14), M.Basalt)
	end

	-- Parts that the terrain now visually replaces (they keep their collision).
	hide(world, { "Island", "FrontierGround", "Trail", "KeepGround" })
end

return TerrainGen
