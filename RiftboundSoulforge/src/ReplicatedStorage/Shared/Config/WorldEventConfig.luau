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
		displayName = "Oleada de la Grieta",
		duration = 180,
		weight = 3,
		color = Color3.fromRGB(200, 80, 255),
		description = "Los enemigos de Emberfall están potenciados: más duros, golpean más fuerte y sueltan Fragmentos de Esencia. Cristales de Grieta brotan por la Frontera.",
	},
	CrystalBloom = {
		id = "CrystalBloom",
		implemented = true,
		displayName = "Floración de Cristal",
		duration = 150,
		weight = 3,
		color = Color3.fromRGB(90, 170, 255),
		description = "Formaciones temporales de Cobalto y Piedra Ascua brotan por Emberfall. ¿Sin Pico de Cobalto? El cobalto de floración es lo bastante blando para cualquier pico.",
	},
	EclipseHunt = {
		id = "EclipseHunt",
		implemented = true,
		displayName = "Cacería del Eclipse",
		duration = 180,
		weight = 2,
		color = Color3.fromRGB(255, 210, 110),
		description = "Un raro Acechador del Eclipse ronda Emberfall. Suelta un Sello del Celador y Fragmentos de Esencia.",
	},
	-- Defined for future updates, never scheduled while implemented = false.
	DimensionalStorm = {
		id = "DimensionalStorm",
		implemented = false,
		displayName = "Tormenta Dimensional",
		description = "La gravedad y el desplazamiento cambian en zonas concretas.",
	},
	WorldBossAlert = {
		id = "WorldBossAlert",
		implemented = false,
		displayName = "Alerta de Jefe Mundial",
		description = "Un enemigo mayor aparece durante un tiempo limitado.",
	},
}

return WorldEventConfig
