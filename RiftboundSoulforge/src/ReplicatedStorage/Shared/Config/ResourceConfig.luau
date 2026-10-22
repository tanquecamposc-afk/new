--!strict
-- Mineable nodes. `charges` = harvests before depletion; respawn in seconds.

local ResourceConfig = {}

ResourceConfig.Nodes = {
	IronVein = {
		id = "IronVein",
		displayName = "Iron Vein",
		item = "Iron",
		tier = 1,
		holdDuration = 1.1,
		yield = { 2, 3 },
		charges = 3,
		respawn = 60,
		color = Color3.fromRGB(150, 140, 130),
		glow = Color3.fromRGB(230, 220, 200),
		xp = 4,
	},
	EmberstoneDeposit = {
		id = "EmberstoneDeposit",
		displayName = "Emberstone Deposit",
		item = "Emberstone",
		tier = 1,
		holdDuration = 1.5,
		yield = { 1, 2 },
		charges = 2,
		respawn = 90,
		color = Color3.fromRGB(90, 40, 30),
		glow = Color3.fromRGB(255, 110, 40),
		xp = 6,
	},
	CobaltCluster = {
		id = "CobaltCluster",
		displayName = "Cobalt Cluster",
		item = "Cobalt",
		tier = 2,
		holdDuration = 1.9,
		yield = { 1, 2 },
		charges = 2,
		respawn = 120,
		color = Color3.fromRGB(30, 50, 110),
		glow = Color3.fromRGB(80, 150, 255),
		xp = 8,
	},
	RiftCrystal = {
		id = "RiftCrystal",
		displayName = "Rift Crystal",
		item = "EssenceShard",
		tier = 1,
		holdDuration = 1.6,
		yield = { 1, 2 },
		charges = 1,
		respawn = 0, -- event-only, never respawns
		color = Color3.fromRGB(70, 20, 110),
		glow = Color3.fromRGB(200, 90, 255),
		xp = 8,
	},
}

ResourceConfig.ToolTiers = {
	[1] = "Iron Pick",
	[2] = "Cobalt Pick",
}

return ResourceConfig
