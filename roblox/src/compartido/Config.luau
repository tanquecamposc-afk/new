--[[
	Blockverse para Roblox · Ajustes generales
	Cambia estos números para ajustar el juego.
]]
local Config = {
	BLOQUE = 3, -- tamaño de un bloque en studs
	CHUNK = 16, -- un chunk mide 16 x 16 bloques
	ALTO = 80, -- altura del mundo en bloques
	NIVEL_MAR = 22,

	RADIO = 4, -- chunks visibles alrededor de cada jugador (bájalo a 3 si va lento en móvil)
	ALCANCE = 6, -- distancia máxima para romper o poner bloques (en bloques)

	DIA_SEGUNDOS = 1200, -- un día completo dura 20 minutos, como en el original
	CUEVAS = true,

	MAX_ZOMBIS = 10,
	MAX_ANIMALES = 12,

	HAMBRE_CADA = 40, -- segundos para perder un punto de hambre
	PILA = 64,
}

return Config
