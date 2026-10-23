--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Format = require(Shared.Util.Format)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

local LABELS = {
	{ "kills", "Enemigos derrotados" },
	{ "bossKills", "Celadores de la Fractura derrotados" },
	{ "perfectParries", "Paradas perfectas" },
	{ "dodges", "Ataques anunciados esquivados" },
	{ "awakenings", "Awakenings" },
	{ "fusionsCast", "Fusiones lanzadas" },
	{ "coopCombos", "Resonancias cooperativas" },
	{ "oreMined", "Mineral extraído" },
	{ "crafts", "Objetos fabricados" },
	{ "extractions", "Extractions" },
	{ "lootLost", "Veces que perdiste botín" },
	{ "deaths", "Deaths" },
}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local card = Kit.card(body, "Estadísticas totales", 1)
		ViewUtil.para(card, string.format("Nivel %d  •  %s monedas  •  tiempo de juego %s", profile.level, Format.number(profile.coins), Format.time(profile.stats.playTime)), C.Text, 0, 15)
		for i, entry in LABELS do
			ViewUtil.para(card, entry[2] .. ": <b>" .. tostring(profile.stats[entry[1]] or 0) .. "</b>", C.TextDim, i, 14)
		end
		local meta = ClientState.meta
		local data = Kit.card(body, "Estado del guardado", 2)
		if meta and meta.state == "Loaded" then
			ViewUtil.para(data, "El progreso se guarda solo (cada 2 minutos, al salir y al cerrar el servidor).", C.Good, 1)
		else
			ViewUtil.para(data, "El progreso NO se está guardando: " .. tostring(meta and meta.reason or "loading"), C.Bad, 1)
		end
	end, { "profile" })
end

return View
