--!strict
-- Quests track server-validated gameplay events recorded through QuestService.record.
-- Adding a quest = adding a table entry; no other system needs to change.

export type Objective = { event: string, filter: { [string]: any }?, count: number, label: string }

local QuestConfig = {}

QuestConfig.Quests = {
	-- Main path (doubles as the onboarding tutorial)
	m01_steel = {
		id = "m01_steel",
		category = "Main",
		title = "Acero y Chispa",
		description = "Ve a la Arena de Entrenamiento, al este de la plaza, y golpea los muñecos.",
		hint = "Clic izquierdo = combo ligero. V = ataque pesado.",
		objectives = { { event = "Hit", filter = { targetKind = "Training" }, count = 8, label = "Golpea los blancos de entrenamiento" } },
		rewards = { coins = 50, xp = 60 },
	},
	m02_guard = {
		id = "m02_guard",
		category = "Main",
		title = "La Guardia Perfecta",
		description = "Enfréntate al Gólem de Práctica. Bloquea justo antes de que impacte y esquiva a través de su golpe en el suelo.",
		hint = "Clic derecho = bloquear (justo antes del impacto para una Parada Perfecta). Shift = esquivar.",
		requires = { "m01_steel" },
		objectives = {
			{ event = "PerfectParry", count = 1, label = "Parada perfecta" },
			{ event = "DodgeTelegraph", count = 1, label = "Esquiva a través de un ataque anunciado" },
		},
		rewards = { coins = 75, xp = 80, items = { EmberTonic = 2 } },
	},
	m03_rift = {
		id = "m03_rift",
		category = "Main",
		title = "A través de la Grieta",
		description = "Lee el informe de expedición en el Portal de la Grieta (sur) y entra en la Frontera de Emberfall.",
		hint = "Entra en el portal y pulsa E/F en el aviso.",
		requires = { "m02_guard" },
		objectives = { { event = "EnterRegion", filter = { region = "Frontier" }, count = 1, label = "Llega a la Frontera" } },
		rewards = { coins = 40, xp = 60 },
	},
	m04_ore = {
		id = "m04_ore",
		category = "Main",
		title = "Mineral de la Frontera",
		description = "Mina Vetas de Hierro (roca gris con destellos claros). El mineral va a tu Mochila.",
		hint = "Mantén el aviso sobre una Veta de Hierro.",
		requires = { "m03_rift" },
		objectives = { { event = "Mine", filter = { item = "Iron" }, count = 4, label = "Mina Mineral de Hierro" } },
		rewards = { coins = 60, xp = 80 },
	},
	m05_stalkers = {
		id = "m05_stalkers",
		category = "Main",
		title = "Purga de Acechadores",
		description = "Los Acechadores de la Grieta cazan en manada cerca del puesto. Derrota a tres.",
		hint = "Su embestida es una línea roja recta. Apártate y castiga.",
		requires = { "m04_ore" },
		objectives = { { event = "Kill", filter = { archetype = "RiftStalker" }, count = 3, label = "Derrota Acechadores de la Grieta" } },
		rewards = { coins = 100, xp = 140, essence = "Storm" },
	},
	m06_extract = {
		id = "m06_extract",
		category = "Main",
		title = "Volver a casa",
		description = "Vuelve al Faro del Campamento y asegura tu Mochila antes de que algo te la arrebate.",
		hint = "El botín sin asegurar está en riesgo si caes.",
		requires = { "m05_stalkers" },
		objectives = { { event = "Extract", count = 1, label = "Extrae con botín" } },
		rewards = { coins = 80, xp = 100 },
	},
	m07_forge = {
		id = "m07_forge",
		category = "Main",
		title = "Templar la Hoja",
		description = "Visita la Forja del Nexo y mejora tu katana.",
		hint = "Mejorar a +2 cuesta 6 de Hierro y 120 monedas.",
		requires = { "m06_extract" },
		objectives = { { event = "Upgrade", count = 1, label = "Mejora un arma" } },
		rewards = { coins = 100, xp = 120, items = { Iron = 4 } },
	},
	m08_keep = {
		id = "m08_keep",
		category = "Main",
		title = "El Centinela Ceniciento",
		description = "Cruza el Barranco de Ceniza, entra en la Fortaleza en Ruinas y derrota a su campeón.",
		hint = "Los ataques pesados rompen la guardia. Su anillo de Onda tiene el centro seguro.",
		requires = { "m07_forge" },
		objectives = { { event = "Kill", filter = { archetype = "AshenSentinel" }, count = 1, label = "Derrota al Centinela Ceniciento" } },
		rewards = { coins = 250, xp = 300, essence = "Gravity" },
	},
	m09_secret = {
		id = "m09_secret",
		category = "Main",
		title = "Susurros en la Piedra",
		description = "Un mural en el acantilado norte de la Frontera habla de tres llamas. Descubre lo que oculta.",
		hint = "Mira el mural y encuentra los tres braseros.",
		requires = { "m08_keep" },
		objectives = { { event = "Discover", filter = { id = "SunfallChamber" }, count = 1, label = "Encuentra la cámara oculta" } },
		rewards = { coins = 200, xp = 250 },
	},
	m10_warden = {
		id = "m10_warden",
		category = "Main",
		title = "Quebrar al Celador",
		description = "Tras la Fortaleza está la Arena de la Fractura. Desafía al Celador de la Fractura, mejor con amigos.",
		hint = "Estudia sus ataques: algunos se pueden parar y su espalda oculta un punto débil.",
		requires = { "m09_secret" },
		objectives = { { event = "BossDefeated", filter = { boss = "FractureWarden" }, count = 1, label = "Derrota al Celador de la Fractura" } },
		rewards = { coins = 500, xp = 600 },
	},

	-- Exploration / discovery contracts
	x_cartographer = {
		id = "x_cartographer",
		category = "Exploration",
		title = "Cartographer",
		description = "Explora Emberfall: llega a la Fortaleza en Ruinas y a la Arena de la Fractura.",
		requires = { "m03_rift" },
		objectives = {
			{ event = "EnterRegion", filter = { region = "Keep" }, count = 1, label = "Entra en la Fortaleza en Ruinas" },
			{ event = "EnterRegion", filter = { region = "Arena" }, count = 1, label = "Contempla la Arena de la Fractura" },
		},
		rewards = { coins = 120, xp = 150 },
	},
	x_delver = {
		id = "x_delver",
		category = "Exploration",
		title = "Explorador de las Profundidades",
		description = "Extrae en el Faro de la Fortaleza, en lo profundo de la Fortaleza en Ruinas.",
		requires = { "m06_extract" },
		objectives = { { event = "Extract", filter = { beacon = "Keep" }, count = 1, label = "Extrae en el Faro de la Fortaleza" } },
		rewards = { coins = 200, xp = 200, items = { EssenceShard = 2 } },
	},
	-- Gathering
	g_cobalt = {
		id = "g_cobalt",
		category = "Gathering",
		title = "Fuego Azul",
		description = "Fabrica un Pico de Cobalto en el Banco del Artesano y mina Cristal de Cobalto en la Fortaleza.",
		requires = { "m07_forge" },
		objectives = { { event = "Mine", filter = { item = "Cobalt" }, count = 5, label = "Mina Cristal de Cobalto" } },
		rewards = { coins = 150, xp = 160 },
	},
	-- Mastery challenge
	w_parry = {
		id = "w_parry",
		category = "Mastery",
		title = "Disciplina de la Hoja",
		description = "Haz 10 paradas perfectas a ataques enemigos.",
		requires = { "m02_guard" },
		objectives = { { event = "PerfectParry", count = 10, label = "Paradas perfectas" } },
		rewards = { coins = 150, xp = 150, weaponMastery = 120 },
	},
	-- Cooperative
	c_bond = {
		id = "c_bond",
		category = "Coop",
		title = "Vínculo Resonante",
		description = "Activa una Resonancia Cooperativa con otro jugador (p. ej., su Gravedad + tu Brasa).",
		requires = { "m05_stalkers" },
		objectives = { { event = "Coop", count = 1, label = "Resonancia Cooperativa" } },
		rewards = { coins = 200, xp = 200, items = { EssenceShard = 3 } },
	},
	-- Boss contract (repeatable once per day)
	b_warden = {
		id = "b_warden",
		category = "Boss",
		title = "Contrato del Celador",
		description = "El Nexo paga por cada Celador que cae. Repetible a diario.",
		requires = { "m08_keep" },
		daily = true,
		objectives = { { event = "BossDefeated", filter = { boss = "FractureWarden" }, count = 1, label = "Derrota al Celador de la Fractura" } },
		rewards = { coins = 300, xp = 300, items = { BossSigil = 1 } },
	},
}

-- Daily challenges: 3 are picked deterministically from this pool each UTC day.
QuestConfig.DailyPool = {
	{ id = "d_hunter", title = "Cazador de Grietas", objectives = { { event = "Kill", count = 12, label = "Derrota enemigos" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_miner", title = "Vetas Profundas", objectives = { { event = "Mine", count = 12, label = "Mina mineral" } }, rewards = { coins = 100, xp = 100 } },
	{ id = "d_parry", title = "Muro de Hierro", objectives = { { event = "PerfectParry", count = 5, label = "Paradas perfectas" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_extract", title = "Regreso Seguro", objectives = { { event = "Extract", count = 2, label = "Extractions" } }, rewards = { coins = 140, xp = 120 } },
	{ id = "d_fusion", title = "Artes Imposibles", objectives = { { event = "FusionCast", count = 3, label = "Lanzar técnicas de fusión" } }, rewards = { coins = 150, xp = 150, items = { EssenceShard = 1 } } },
	{ id = "d_coop", title = "Together", objectives = { { event = "Coop", count = 1, label = "Resonancia Cooperativa" } }, rewards = { coins = 180, xp = 150 } },
	{ id = "d_awaken", title = "Resonate", objectives = { { event = "Awaken", count = 2, label = "Awakenings" } }, rewards = { coins = 120, xp = 120 } },
	{ id = "d_dodge", title = "Untouchable", objectives = { { event = "DodgeTelegraph", count = 6, label = "Esquiva ataques anunciados" } }, rewards = { coins = 110, xp = 110 } },
}
QuestConfig.DailyCount = 3
QuestConfig.DailyLevel = 2

QuestConfig.Order = {
	"m01_steel",
	"m02_guard",
	"m03_rift",
	"m04_ore",
	"m05_stalkers",
	"m06_extract",
	"m07_forge",
	"m08_keep",
	"m09_secret",
	"m10_warden",
	"x_cartographer",
	"x_delver",
	"g_cobalt",
	"w_parry",
	"c_bond",
	"b_warden",
}

-- Returns the indices of today's daily challenges (deterministic per day key).
function QuestConfig.dailyPicks(dayKey: number): { number }
	local picks = {}
	local n = #QuestConfig.DailyPool
	local seed = dayKey
	while #picks < math.min(QuestConfig.DailyCount, n) do
		seed = (seed * 1103515245 + 12345) % 2147483648
		local idx = (seed % n) + 1
		if not table.find(picks, idx) then
			table.insert(picks, idx)
		end
	end
	return picks
end

function QuestConfig.matches(objective: Objective, event: string, data: { [string]: any }?): boolean
	if objective.event ~= event then
		return false
	end
	if objective.filter then
		if not data then
			return false
		end
		for key, value in objective.filter do
			if data[key] ~= value then
				return false
			end
		end
	end
	return true
end

return QuestConfig
