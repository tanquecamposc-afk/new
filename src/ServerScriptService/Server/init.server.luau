--!strict
--[[
	Server (init.server.luau)
	Arranque ordenado de servicios: Init() crea estado y engancha dependencias
	cruzadas; Start() conecta eventos y bucles. Separarlos evita condiciones de
	carrera cuando un servicio necesita a otro ya inicializado.
]]

local Services = script.Services

local DataService = require(Services.DataService)
local CombatService = require(Services.CombatService)
local ShadowServerService = require(Services.ShadowServerService)
local DungeonService = require(Services.DungeonService)

local ORDER = {
	{ Name = "DataService", Module = DataService },
	{ Name = "CombatService", Module = CombatService },
	{ Name = "ShadowServerService", Module = ShadowServerService },
	{ Name = "DungeonService", Module = DungeonService },
}

local startedAt = os.clock()

for _, entry in ORDER do
	local ok, err = pcall(entry.Module.Init)
	if not ok then
		warn(`[Bootstrap] Init de {entry.Name} fallo: {err}`)
	end
end

for _, entry in ORDER do
	local ok, err = pcall(entry.Module.Start)
	if not ok then
		warn(`[Bootstrap] Start de {entry.Name} fallo: {err}`)
	end
end

print(`[Bootstrap] Servidor listo en {string.format("%.2f", (os.clock() - startedAt) * 1000)} ms`)
