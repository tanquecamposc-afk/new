--!strict
-- Static world layout shared by the world builder (geometry), services (spawns, regions)
-- and the client (waypoints, zone lighting). All positions are ground-level (y = 0).

local WorldConfig = {}

local E = Vector3.new(1000, 0, 0) -- Emberfall origin
WorldConfig.EmberfallOrigin = E

local function e(x: number, z: number): Vector3
	return E + Vector3.new(x, 0, z)
end
WorldConfig.e = e

-- Axis-aligned regions. depth drives expedition risk (0 = safe).
WorldConfig.Regions = {
	{ id = "Nexus", name = "The Nexus", min = Vector3.new(-170, -50, -170), max = Vector3.new(170, 200, 170), depth = 0, safe = true, expedition = false },
	{ id = "Camp", name = "Emberfall Camp", min = e(-40, -70) - Vector3.new(0, 50, 0), max = e(60, 70) + Vector3.new(0, 200, 0), depth = 0, safe = true, expedition = true },
	{ id = "Frontier", name = "Emberfall Frontier", min = e(60, -100) - Vector3.new(0, 50, 0), max = e(262, 100) + Vector3.new(0, 200, 0), depth = 1, expedition = true },
	{ id = "SunfallChamber", name = "Sunfall Chamber", min = e(180, -135) - Vector3.new(0, 50, 0), max = e(220, -100) + Vector3.new(0, 200, 0), depth = 1, expedition = true },
	{ id = "Ravine", name = "Cinder Ravine", min = e(262, -100) - Vector3.new(0, 80, 0), max = e(340, 100) + Vector3.new(0, 200, 0), depth = 1, expedition = true },
	{ id = "Keep", name = "Ruined Keep", min = e(340, -60) - Vector3.new(0, 50, 0), max = e(542, 60) + Vector3.new(0, 200, 0), depth = 2, expedition = true },
	{ id = "Approach", name = "Warden's Approach", min = e(542, -40) - Vector3.new(0, 50, 0), max = e(580, 40) + Vector3.new(0, 200, 0), depth = 3, expedition = true },
	{ id = "Arena", name = "Fracture Arena", min = e(580, -60) - Vector3.new(0, 50, 0), max = e(700, 60) + Vector3.new(0, 200, 0), depth = 3, expedition = true },
}

-- Visual mood per region (client ZoneController).
WorldConfig.Moods = {
	Nexus = { fog = Color3.fromRGB(120, 110, 170), haze = 1.2, density = 0.28, tint = Color3.fromRGB(235, 230, 255), clock = 17.4 },
	Camp = { fog = Color3.fromRGB(200, 120, 80), haze = 1.6, density = 0.3, tint = Color3.fromRGB(255, 235, 220), clock = 17.8 },
	Frontier = { fog = Color3.fromRGB(190, 100, 70), haze = 2.0, density = 0.34, tint = Color3.fromRGB(255, 225, 205), clock = 17.9 },
	SunfallChamber = { fog = Color3.fromRGB(255, 190, 90), haze = 2.5, density = 0.4, tint = Color3.fromRGB(255, 240, 200), clock = 17.9 },
	Ravine = { fog = Color3.fromRGB(220, 80, 40), haze = 2.6, density = 0.4, tint = Color3.fromRGB(255, 215, 195), clock = 18.0 },
	Keep = { fog = Color3.fromRGB(60, 50, 80), haze = 2.2, density = 0.45, tint = Color3.fromRGB(215, 210, 240), clock = 18.2 },
	Approach = { fog = Color3.fromRGB(110, 40, 90), haze = 2.4, density = 0.4, tint = Color3.fromRGB(240, 210, 235), clock = 18.4 },
	Arena = { fog = Color3.fromRGB(90, 30, 110), haze = 2.8, density = 0.42, tint = Color3.fromRGB(245, 215, 255), clock = 18.5 },
}

-- Teleport destinations and points of interest.
WorldConfig.Points = {
	NexusSpawn = Vector3.new(0, 3, 26),
	Forge = Vector3.new(0, 0, -80),
	ArtisanBench = Vector3.new(-30, 0, -72),
	FusionChamber = Vector3.new(74, 0, -44),
	TrainingArena = Vector3.new(100, 0, 40),
	TrialPedestal = Vector3.new(124, 0, 40),
	ExpeditionPortal = Vector3.new(0, 0, 92),
	QuestBoard = Vector3.new(-26, 0, 30),
	BossGate = Vector3.new(-72, 0, 52),
	SocialGarden = Vector3.new(-92, 0, -8),
	HallOfEchoes = Vector3.new(-62, 0, -62),
	CosmeticKiosk = Vector3.new(44, 0, 32),
	Announcement = Vector3.new(0, 30, -34),

	CampArrival = e(12, 0) + Vector3.new(0, 3, 0),
	CampBeacon = e(26, -18),
	CampReturnPortal = e(-22, 0),
	RavineCheckpoint = e(255, 0) + Vector3.new(0, 3, 0),
	ShortcutLever = e(336, -12),
	KeepGate = e(340, 0),
	KeepBeacon = e(528, 38),
	ArenaSeal = e(570, 0),
	ArenaCenter = e(640, 0),
	ArenaRetreat = e(590, 50),
	ArenaVictoryBeacon = e(640, -48),
	WardenAntechamber = e(556, 0) + Vector3.new(0, 3, 0),
	SunfallMural = e(184, -96),
	SunfallWall = e(200, -100),
	SunfallTablet = e(200, -122),
	SunfallChest = e(190, -116),
	IronHint = e(86, 26),
	FrontierGate = e(70, 0),
	StalkerHint = e(112, -24),
}

WorldConfig.Arena = {
	center = e(640, 0),
	size = 120,
	tiles = 3,
}

-- Hidden chamber puzzle: kindle the braziers in this order.
WorldConfig.Braziers = {
	{ id = "Moon", symbol = "☾", position = e(100, -72) },
	{ id = "Sun", symbol = "☀", position = e(168, -12) },
	{ id = "Star", symbol = "✦", position = e(236, -62) },
}
WorldConfig.BrazierOrder = { "Moon", "Sun", "Star" }
WorldConfig.SunfallOpenTime = 90

-- Enemy spawners: archetype, position, respawn seconds.
WorldConfig.Spawners = {
	-- Nexus training arena
	{ archetype = "TrainingDummy", position = Vector3.new(88, 0, 26), respawn = 5 },
	{ archetype = "TrainingDummy", position = Vector3.new(100, 0, 24), respawn = 5 },
	{ archetype = "TrainingDummy", position = Vector3.new(112, 0, 26), respawn = 5 },
	{ archetype = "SparringGolem", position = Vector3.new(100, 0, 58), respawn = 5 },
	-- Frontier
	{ archetype = "RiftStalker", position = e(110, -30), respawn = 35 },
	{ archetype = "RiftStalker", position = e(120, -22), respawn = 35 },
	{ archetype = "RiftStalker", position = e(104, -18), respawn = 35 },
	{ archetype = "EmberBeast", position = e(150, 62), respawn = 50 },
	{ archetype = "RiftStalker", position = e(192, 40), respawn = 35 },
	{ archetype = "RiftStalker", position = e(200, 50), respawn = 35 },
	{ archetype = "EmberBeast", position = e(228, -36), respawn = 50 },
	{ archetype = "RuneGuardian", position = e(176, 0), respawn = 60 },
	{ archetype = "RiftStalker", position = e(244, 22), respawn = 35 },
	-- Keep
	{ archetype = "RuneGuardian", position = e(380, -22), respawn = 60 },
	{ archetype = "RuneGuardian", position = e(380, 22), respawn = 60 },
	{ archetype = "RiftStalker", position = e(402, 0), respawn = 40 },
	{ archetype = "RiftStalker", position = e(412, -28), respawn = 40 },
	{ archetype = "EmberBeast", position = e(436, 0), respawn = 55 },
	{ archetype = "AshenSentinel", position = e(496, 0), respawn = 240 },
}

-- Resource node placements.
WorldConfig.Nodes = {
	{ node = "IronVein", position = e(86, 26) },
	{ node = "IronVein", position = e(132, -62) },
	{ node = "IronVein", position = e(176, 72) },
	{ node = "IronVein", position = e(222, -72) },
	{ node = "IronVein", position = e(252, 56) },
	{ node = "IronVein", position = e(40, 40) },
	{ node = "EmberstoneDeposit", position = e(142, 32) },
	{ node = "EmberstoneDeposit", position = e(206, 76) },
	{ node = "EmberstoneDeposit", position = e(246, -14) },
	{ node = "EmberstoneDeposit", position = e(400, 40) },
	{ node = "CobaltCluster", position = e(362, -44) },
	{ node = "CobaltCluster", position = e(362, 44) },
	{ node = "CobaltCluster", position = e(470, -44) },
	{ node = "CobaltCluster", position = e(470, 44) },
}

-- World-event sites.
WorldConfig.RiftCrystalSites = { e(96, 52), e(160, -44), e(214, 18), e(250, -50), e(390, 28), e(462, -30) }
WorldConfig.BloomSites = { e(70, -40), e(124, 70), e(188, -30), e(232, 70), e(396, -40), e(506, 40) }
WorldConfig.EclipseSites = { e(160, 0), e(220, 40), e(410, 0) }

-- Tutorial waypoint targets keyed by quest id (client draws a guide beam).
WorldConfig.QuestWaypoints = {
	m01_steel = "TrainingArena",
	m02_guard = "TrainingArena",
	m03_rift = "ExpeditionPortal",
	m04_ore = "IronHint",
	m05_stalkers = "StalkerHint",
	m06_extract = "CampBeacon",
	m07_forge = "Forge",
	m08_keep = "KeepGate",
	m09_secret = "SunfallMural",
	m10_warden = "ArenaSeal",
}

function WorldConfig.regionAt(position: Vector3)
	-- Returns the most specific region (smallest volume) containing the position.
	local best, bestVolume = nil, math.huge
	for _, region in WorldConfig.Regions do
		local mn, mx = region.min, region.max
		if
			position.X >= mn.X
			and position.X <= mx.X
			and position.Y >= mn.Y
			and position.Y <= mx.Y
			and position.Z >= mn.Z
			and position.Z <= mx.Z
		then
			local size = mx - mn
			local volume = size.X * size.Y * size.Z
			if volume < bestVolume then
				best, bestVolume = region, volume
			end
		end
	end
	return best
end

function WorldConfig.regionById(id: string)
	for _, region in WorldConfig.Regions do
		if region.id == id then
			return region
		end
	end
	return nil
end

-- Planned regions (Codex only; none of these exist in the world yet).
WorldConfig.FutureRegions = {
	{ id = "Frostgrave", name = "Frostgrave", teaser = "Glaciers, frozen ruins and defensive magic." },
	{ id = "VerdantReach", name = "Verdant Reach", teaser = "Ancient forests, living ruins and nature powers." },
	{ id = "ObsidianCrown", name = "Obsidian Crown", teaser = "Volcanoes, dangerous mining and heavy weapons." },
	{ id = "HollowSky", name = "The Hollow Sky", teaser = "Floating ruins, unusual gravity and dimensional puzzles." },
	{ id = "LastRift", name = "The Last Rift", teaser = "Advanced dungeons, rare materials and endgame encounters." },
}

return WorldConfig
