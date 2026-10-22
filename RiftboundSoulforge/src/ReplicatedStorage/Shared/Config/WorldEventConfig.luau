--!strict
-- Server-local world events. One event at a time; WorldEventService owns the timers.

local WorldEventConfig = {}

WorldEventConfig.Schedule = {
	firstDelay = 240, -- seconds after server start
	minGap = 420,
	maxGap = 600,
	warning = 60, -- announcement countdown before an event begins
}

WorldEventConfig.Events = {
	RiftSurge = {
		id = "RiftSurge",
		implemented = true,
		displayName = "Rift Surge",
		duration = 180,
		weight = 3,
		color = Color3.fromRGB(200, 80, 255),
		description = "Emberfall enemies are surged: tougher, hit harder, drop Essence Shards. Rift Crystals erupt across the Frontier.",
	},
	CrystalBloom = {
		id = "CrystalBloom",
		implemented = true,
		displayName = "Crystal Bloom",
		duration = 150,
		weight = 3,
		color = Color3.fromRGB(90, 170, 255),
		description = "Temporary Cobalt and Emberstone formations bloom across Emberfall. No Cobalt Pick? Bloom cobalt is soft enough for any pick.",
	},
	EclipseHunt = {
		id = "EclipseHunt",
		implemented = true,
		displayName = "Eclipse Hunt",
		duration = 180,
		weight = 2,
		color = Color3.fromRGB(255, 210, 110),
		description = "A rare Eclipse Stalker prowls Emberfall. It drops a Warden Sigil and Essence Shards.",
	},
	-- Defined for future updates, never scheduled while implemented = false.
	DimensionalStorm = {
		id = "DimensionalStorm",
		implemented = false,
		displayName = "Dimensional Storm",
		description = "Gravity and traversal behave differently in designated areas.",
	},
	WorldBossAlert = {
		id = "WorldBossAlert",
		implemented = false,
		displayName = "World Boss Alert",
		description = "A major enemy becomes available for a limited encounter.",
	},
}

return WorldEventConfig
