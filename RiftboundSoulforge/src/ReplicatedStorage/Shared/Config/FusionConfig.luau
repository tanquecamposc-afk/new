--!strict
-- Power Fusion recipes. A fusion becomes castable only when `implemented` is true AND the
-- player has completed every step: research (discovery + essences) and attunement (the
-- playable challenge: chain ability A into ability B on the same enemy).

local FusionConfig = {}

FusionConfig.Fusions = {
	CollapsingSun = {
		id = "CollapsingSun",
		implemented = true,
		displayName = "Sol Colapsante",
		essences = { "Ember", "Gravity" },
		ability = "CollapsingSun",
		color = Color3.fromRGB(255, 160, 70),
		summary = "Pozo de gravedad que implosiona en una explosión solar.",
		research = {
			discovery = "SunfallTablet",
			masteries = { Ember = 2, Gravity = 1 },
			cost = { EssenceShard = 4 },
		},
		attunement = {
			description = "Golpea a un enemigo con una habilidad de Gravedad y luego con una de Brasa en 3 s (o al revés). 3 veces.",
			count = 3,
			window = 3,
		},
		hint = "Tres llamas de Emberfall recuerdan el orden del cielo.",
	},
	MagneticRift = {
		id = "MagneticRift",
		implemented = true,
		displayName = "Grieta Magnética",
		essences = { "Storm", "Gravity" },
		ability = "MagneticRift",
		color = Color3.fromRGB(120, 170, 255),
		summary = "Una grieta sostenida que encadena rayos entre enemigos agrupados.",
		research = {
			masteries = { Storm = 2, Gravity = 2 },
			cost = { EssenceShard = 6, Cobalt = 2 },
		},
		attunement = {
			description = "Golpea a un enemigo con una habilidad de Tormenta y luego con una de Gravedad en 3 s (o al revés). 3 veces.",
			count = 3,
			window = 3,
		},
		hint = "Cárgalos y luego atráelos. Al rayo le encantan las multitudes.",
	},
	-- Defined for the Codex, not castable: its moveset does not exist yet.
	PlasmaLance = {
		id = "PlasmaLance",
		implemented = false,
		displayName = "Lanza de Plasma",
		essences = { "Ember", "Storm" },
		color = Color3.fromRGB(255, 120, 200),
		summary = "Inestable. La Cámara de Fusión aún no puede contener esta resonancia.",
		hint = "Investigación sellada hasta una actualización futura.",
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
