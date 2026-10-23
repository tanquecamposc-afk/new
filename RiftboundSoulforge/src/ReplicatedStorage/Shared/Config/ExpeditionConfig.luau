--!strict
-- Risk and reward. Unbanked loot ("satchel") is only moved into the permanent inventory
-- at an extraction beacon. Death at a given depth forfeits a share of the satchel.
-- Permanent unlocks, mastery, XP, achievements and anything bought with Robux are NEVER at risk.

local ExpeditionConfig = {}

ExpeditionConfig.Depths = {
	[0] = { name = "Safe", lossOnDeath = 0, dropMultiplier = 1.0 },
	[1] = { name = "Frontier", lossOnDeath = 0.25, dropMultiplier = 1.0 },
	[2] = { name = "Deep", lossOnDeath = 0.5, dropMultiplier = 1.3 },
	[3] = { name = "Borde de la Grieta", lossOnDeath = 0.75, dropMultiplier = 1.6 },
}

ExpeditionConfig.Beacons = {
	Camp = { id = "Camp", displayName = "Faro del Campamento", holdDuration = 1.0, deep = false },
	Keep = { id = "Keep", displayName = "Faro de la Fortaleza", holdDuration = 4.0, deep = true },
	Arena = { id = "Arena", displayName = "Faro del Celador", holdDuration = 2.0, deep = true, requiresVictory = true },
}

-- Leaving the server mid-expedition is treated like a death at the current depth;
-- whatever remains is banked automatically. In a safe zone nothing is lost.
ExpeditionConfig.DisconnectRule = "death"

ExpeditionConfig.Rules = {
	"El botín de Emberfall va primero a tu Mochila.",
	"Asegúralo en un Faro de Extracción (Campamento, Fortaleza o tras caer el Celador).",
	"Morir te hace perder parte de la Mochila: 25% en la Frontera, 50% en la Fortaleza, 75% en el Borde de la Grieta.",
	"EXP, maestría, desbloqueos, logros y compras nunca se pierden.",
	"Las zonas profundas dan más: x1,3 en la Fortaleza, x1,6 en el Borde de la Grieta.",
}

return ExpeditionConfig
