--!strict
-- Power Fusion recipes. A fusion becomes castable only when `implemented` is true AND the
-- player has completed every step: research (discovery + essences) and attunement (the
-- playable challenge: chain ability A into ability B on the same enemy).

local FusionConfig = {}

FusionConfig.Fusions = {
	CollapsingSun = {
		id = "CollapsingSun",
		implemented = true,
		displayName = "Collapsing Sun",
		essences = { "Ember", "Gravity" },
		ability = "CollapsingSun",
		color = Color3.fromRGB(255, 160, 70),
		summary = "Gravity well that implodes into a solar blast.",
		research = {
			discovery = "SunfallTablet",
			masteries = { Ember = 2, Gravity = 1 },
			cost = { EssenceShard = 4 },
		},
		attunement = {
			description = "Hit an enemy with a Gravity ability, then an Ember ability within 3s (or the reverse). 3 times.",
			count = 3,
			window = 3,
		},
		hint = "Three flames in Emberfall remember the order of the sky.",
	},
	MagneticRift = {
		id = "MagneticRift",
		implemented = true,
		displayName = "Magnetic Rift",
		essences = { "Storm", "Gravity" },
		ability = "MagneticRift",
		color = Color3.fromRGB(120, 170, 255),
		summary = "A held rift that chains lightning through grouped enemies.",
		research = {
			masteries = { Storm = 2, Gravity = 2 },
			cost = { EssenceShard = 6, Cobalt = 2 },
		},
		attunement = {
			description = "Hit an enemy with a Storm ability, then a Gravity ability within 3s (or the reverse). 3 times.",
			count = 3,
			window = 3,
		},
		hint = "Charge them, then pull them close. Lightning loves a crowd.",
	},
	-- Defined for the Codex, not castable: its moveset does not exist yet.
	PlasmaLance = {
		id = "PlasmaLance",
		implemented = false,
		displayName = "Plasma Lance",
		essences = { "Ember", "Storm" },
		color = Color3.fromRGB(255, 120, 200),
		summary = "Unstable. The Fusion Chamber cannot hold this resonance yet.",
		hint = "Research sealed until a future update.",
	},
}

FusionConfig.Order = { "CollapsingSun", "MagneticRift", "PlasmaLance" }

-- Returns the fusion id for an (unordered) essence pair, or nil.
function FusionConfig.forPair(a: string?, b: string?): string?
	if not a or not b or a == b then
		return nil
	end
	for id, def in FusionConfig.Fusions do
		local e = def.essences
		if (e[1] == a and e[2] == b) or (e[1] == b and e[2] == a) then
			return id
		end
	end
	return nil
end

return FusionConfig
