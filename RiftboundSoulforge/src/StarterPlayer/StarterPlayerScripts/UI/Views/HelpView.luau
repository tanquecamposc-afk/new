--!strict
local UserInputService = game:GetService("UserInputService")
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)

local C = Theme.Colors
local View = {}

local SECTIONS = {
	{ "Primeros pasos", {
		"1. Sigue el haz dorado: apunta a tu contrato principal.",
		"2. Arena de Entrenamiento (este): golpea los muñecos, luego para y esquiva al Gólem de Práctica.",
		"3. Portal de la Grieta (sur): entra en la Frontera de Emberfall. Mina, caza y explora.",
		"4. Asegura tu Mochila en un Faro de Extracción y mejora tu arma en la Forja.",
	} },
	{ "Teclado y ratón", {
		"Clic izq. combo ligero (mantén para encadenar) • V pesado • Clic der. bloquear (justo antes del golpe = Parada Perfecta)",
		"Shift esquivar (invulnerable un instante) • Q / E habilidades de esencia • R técnica de fusión",
		"G Despertar con Resonancia llena (G otra vez = técnica firma) • H Tónico de Brasa • T fijar objetivo • M menú • F interactuar",
	} },
	{ "Gamepad", { "R2 ligero • R1 pesado • L2 bloquear • B esquivar • X / Y habilidades • L1 fusión • Cruceta arriba despertar • Cruceta abajo tónico • R3 fijar • Select menú" } },
	{ "Táctil", { "Botones en pantalla a la derecha: ATAQUE, PESADO, BLOQUEO (mantener), ESQUIVA, Q, E, R, DESPERTAR, FIJAR, TÓNICO. Toca los avisos para interactuar." } },
	{ "Leer los ataques", {
		"Las zonas rojas se llenan antes de golpear. '!' = se puede parar. '⚠' = esquiva o sal. Anillo '◎' = quédate en el centro o fuera.",
		"'¡ABIERTO! GOLPEA' sobre un enemigo = ventana de castigo. Los Guardianes bloquean golpes ligeros de frente: usa ataques pesados.",
	} },
	{ "Resonancia y Despertar", { "La resonancia crece con golpes, combos, paradas perfectas, esquivas de ataques anunciados e interrupciones. Llena = pulsa G. Tras un despertar quedas agotado 10 s. El Pulso Supresor del Celador termina los despertares." } },
	{ "Fusion", { "Consigue el conocimiento, investiga la unión en la Cámara de Fusión y sintonízala en combate encadenando una esencia tras la otra sobre el mismo enemigo." } },
	{ "Cooperativo", { "Si varios jugadores encadenan esencias complementarias sobre los mismos enemigos, se activa la Resonancia Cooperativa. Contra el Celador, una parada perfecta seguida del golpe de un compañero en su espalda abre una Brecha." } },
	{ "Risk", { "Las profundidades 1/2/3 pierden el 25/50/75% de la Mochila al morir. Maestría, EXP, desbloqueos, logros y compras nunca se pierden." } },
}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, _profile)
		for i, section in SECTIONS do
			local card = Kit.card(body, section[1], i)
			for j, line in section[2] do
				ViewUtil.para(card, line, C.TextDim, j, 14)
			end
		end
		if UserInputService.TouchEnabled then
			ViewUtil.para(body, "Dispositivo táctil detectado: controles táctiles activados.", C.Good, 99)
		end
	end, {})
end

return View
