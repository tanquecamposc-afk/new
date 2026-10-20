--[[
	Blockverse para Roblox · Recetas
	En vez de la cuadrícula 3 × 3 se usa un libro de recetas: si tienes
	los ingredientes, pulsas «Crear». Algunas recetas necesitan una mesa
	de trabajo o un horno cerca (a 5 bloques o menos).
]]
local Bloques = require(script.Parent.Bloques)
local ID = Bloques.porClave

local Recetas = {}

local function receta(resultado, n, ingredientes, donde)
	table.insert(Recetas, { resultado = resultado, n = n, ingredientes = ingredientes, donde = donde })
end

-- A mano
receta(ID.tablones, 4, { [ID.tronco] = 1 })
receta(ID.tablones, 4, { [ID.troncoAbeto] = 1 })
receta(ID.palo, 4, { [ID.tablones] = 2 })
receta(ID.mesa, 1, { [ID.tablones] = 4 })
receta(ID.antorcha, 4, { [ID.palo] = 1, [ID.carbon] = 1 })

-- Herramientas (mesa de trabajo)
for _, n in Bloques.NIVELES do
	local m = n.mat
	receta(ID["pico_" .. n.clave], 1, { [m] = 3, [ID.palo] = 2 }, "mesa")
	receta(ID["hacha_" .. n.clave], 1, { [m] = 3, [ID.palo] = 2 }, "mesa")
	receta(ID["pala_" .. n.clave], 1, { [m] = 1, [ID.palo] = 2 }, "mesa")
	receta(ID["espada_" .. n.clave], 1, { [m] = 2, [ID.palo] = 1 }, "mesa")
end

-- Bloques (mesa de trabajo)
receta(ID.horno, 1, { [ID.roca] = 8 }, "mesa")
receta(ID.ladrillosPiedra, 4, { [ID.piedra] = 4 }, "mesa")
receta(ID.arenisca, 1, { [ID.arena] = 4 }, "mesa")
receta(ID.musgo, 1, { [ID.roca] = 1, [ID.hojas] = 1 }, "mesa")
receta(ID.pan, 1, { [ID.trigo] = 3 }, "mesa")
receta(ID.piedraLuminosa, 1, { [ID.antorcha] = 4, [ID.vidrio] = 1 }, "mesa")

-- Horno
receta(ID.vidrio, 1, { [ID.arena] = 1 }, "horno")
receta(ID.piedra, 1, { [ID.roca] = 1 }, "horno")
receta(ID.lingoteHierro, 1, { [ID.menaHierro] = 1 }, "horno")
receta(ID.lingoteOro, 1, { [ID.menaOro] = 1 }, "horno")
receta(ID.carneCocida, 1, { [ID.carneCruda] = 1 }, "horno")
receta(ID.ladrillos, 1, { [ID.grava] = 2, [ID.arena] = 2 }, "horno")
receta(ID.carbon, 1, { [ID.tronco] = 1 }, "horno")

for i, r in Recetas do
	assert(r.resultado, "receta " .. i .. " sin resultado")
	for id in r.ingredientes do
		assert(Bloques.porId[id], "receta " .. i .. ": ingrediente desconocido " .. tostring(id))
	end
end

return Recetas
