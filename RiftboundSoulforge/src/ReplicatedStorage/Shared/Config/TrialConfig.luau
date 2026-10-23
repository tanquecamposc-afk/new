--!strict
-- Mastery trials teach a system; they never cost currency.

local TrialConfig = {}

TrialConfig.Trials = {
	KatanaTrial = {
		id = "KatanaTrial",
		displayName = "Prueba de la Katana: El Duelo del Eco",
		weapon = "Katana",
		masteryRequired = 4,
		timeLimit = 100,
		champion = "BladeWraith",
		description = "Demuestra que dominas la hoja: encadena golpes, lee al eco, para a la perfección y esquiva.",
		objectives = {
			{ key = "hits", label = "Acierta golpes de katana", count = 15 },
			{ key = "parry", label = "Parada perfecta", count = 1 },
			{ key = "dodge", label = "Esquiva un ataque anunciado", count = 1 },
			{ key = "kill", label = "Derrota al Espectro de Hoja", count = 1 },
		},
		reward = "Desbloquea la elección de evolución de la katana en maestría 5.",
	},
}

return TrialConfig
