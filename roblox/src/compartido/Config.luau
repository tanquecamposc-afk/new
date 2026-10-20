--[[
	Blockverse para Roblox · Ajustes generales
	Cambia estos números para ajustar el juego.
]]
local Config = {
	BLOQUE = 3, -- tamaño de un bloque en studs (el personaje de Roblox mide unos 2 bloques)

	RADIO = 5, -- distancia de visión en chunks (bájala a 3 o 4 si va lento en móvil)
	RADIO_FISICA = 2, -- chunks alrededor de cada jugador con colisiones en el servidor
	ALCANCE = 5, -- distancia para picar y poner bloques (en bloques), como en el juego web

	DIA_SEGUNDOS = 1200, -- un día completo dura 20 minutos, como en el original

	MAX_HOSTILES = 14,
	MAX_PASIVOS = 12,
	MAX_ACUATICOS = 6,

	PILA = 64,
}

return Config
