--!strict
-- Codex discoveries. Undiscovered entries show only their hint.

local DiscoveryConfig = {}

DiscoveryConfig.Discoveries = {
	SunfallChamber = {
		id = "SunfallChamber",
		displayName = "La Cámara del Ocaso Solar",
		category = "Secret",
		hint = "Tres llamas recuerdan el orden del cielo.",
		text = "Una cámara sellada tras los acantilados de la Frontera. Su tablilla describe un sol que colapsa sobre sí mismo.",
	},
	SunfallTablet = {
		id = "SunfallTablet",
		displayName = "Tablilla del Ocaso Solar",
		category = "Fusion",
		hint = "Hay algo legible en la Cámara del Ocaso Solar.",
		text = "Enseña la teoría del Sol Colapsante (Brasa + Gravedad) y el plano del Temple Resonante.",
	},
	WardenLanceWeakness = {
		id = "WardenLanceWeakness",
		displayName = "Debilidad del Celador: Lanza de la Grieta",
		category = "Boss",
		hint = "Uno de los ataques del Celador puede volverse en su contra.",
		text = "Una parada perfecta contra la Lanza de la Grieta aturde al Celador y expone el cristal de su espalda.",
	},
	WardenBackCrystal = {
		id = "WardenBackCrystal",
		displayName = "Debilidad del Celador: Cristal Dorsal",
		category = "Boss",
		hint = "El Celador oculta algo tras de sí.",
		text = "Cuando brilla el cristal de su espalda, los golpes por detrás hacen el doble de daño.",
	},
	RavineShortcut = {
		id = "RavineShortcut",
		displayName = "Puente Levadizo del Barranco",
		category = "World",
		hint = "Debe de haber un camino más fácil para cruzar el barranco.",
		text = "Una palanca al otro lado del Barranco de Ceniza baja un puente levadizo para todo el servidor.",
	},
}

DiscoveryConfig.Order = { "SunfallChamber", "SunfallTablet", "RavineShortcut", "WardenLanceWeakness", "WardenBackCrystal" }

return DiscoveryConfig
