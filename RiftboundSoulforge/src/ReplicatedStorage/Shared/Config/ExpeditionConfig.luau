--!strict
-- Risk and reward. Unbanked loot ("satchel") is only moved into the permanent inventory
-- at an extraction beacon. Death at a given depth forfeits a share of the satchel.
-- Permanent unlocks, mastery, XP, achievements and anything bought with Robux are NEVER at risk.

local ExpeditionConfig = {}

ExpeditionConfig.Depths = {
	[0] = { name = "Safe", lossOnDeath = 0, dropMultiplier = 1.0 },
	[1] = { name = "Frontier", lossOnDeath = 0.25, dropMultiplier = 1.0 },
	[2] = { name = "Deep", lossOnDeath = 0.5, dropMultiplier = 1.3 },
	[3] = { name = "Rift Edge", lossOnDeath = 0.75, dropMultiplier = 1.6 },
}

ExpeditionConfig.Beacons = {
	Camp = { id = "Camp", displayName = "Camp Beacon", holdDuration = 1.0, deep = false },
	Keep = { id = "Keep", displayName = "Keep Beacon", holdDuration = 4.0, deep = true },
	Arena = { id = "Arena", displayName = "Warden's Beacon", holdDuration = 2.0, deep = true, requiresVictory = true },
}

-- Leaving the server mid-expedition is treated like a death at the current depth;
-- whatever remains is banked automatically. In a safe zone nothing is lost.
ExpeditionConfig.DisconnectRule = "death"

ExpeditionConfig.Rules = {
	"Loot found in Emberfall goes into your Satchel first.",
	"Bank it at an Extraction Beacon (Camp, Keep, or after the Warden falls).",
	"Dying loses part of the Satchel: 25% in the Frontier, 50% in the Keep, 75% at the Rift Edge.",
	"XP, mastery, unlocks, achievements and purchases are never lost.",
	"Deeper zones drop more: x1.3 in the Keep, x1.6 at the Rift Edge.",
}

return ExpeditionConfig
