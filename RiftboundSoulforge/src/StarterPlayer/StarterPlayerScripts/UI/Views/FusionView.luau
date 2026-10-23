--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local FusionConfig = require(Config.FusionConfig)
local EssenceConfig = require(Config.EssenceConfig)
local Costs = require(Shared.Inventory.Costs)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		ViewUtil.para(body, "Las fusiones son técnicas nuevas, no multiplicadores de daño. Paso 1: investiga aquí. Paso 2: sintoniza en combate encadenando las dos esencias sobre el mismo enemigo. Luego equipa ambas y pulsa R.", C.TextDim, 0)
		for i, id in FusionConfig.Order do
			local def = FusionConfig.Fusions[id]
			local record = profile.fusions[id]
			local card = Kit.card(body, def.displayName .. "  (" .. EssenceConfig.names(def.essences) .. ")", i, def.color)
			ViewUtil.para(card, def.summary, C.TextDim, 1)
			if not def.implemented then
				ViewUtil.para(card, "Esta resonancia aún no se puede estabilizar (actualización futura).", C.TextMuted, 2)
			elseif record.unlocked then
				ViewUtil.para(card, "✔ Desbloqueado. Equipa " .. EssenceConfig.names(def.essences) .. " y pulsa R.", C.Good, 2)
			elseif record.researched then
				ViewUtil.para(card, string.format("Investigación completa. Sintonía %d/%d: %s", record.attunement, def.attunement.count, def.attunement.description), C.Warn, 2)
			else
				local lines = {}
				for _, essence in def.essences do
					table.insert(lines, { text = essence .. " esencia desbloqueada", met = profile.essences[essence].unlocked })
				end
				for essence, level in def.research.masteries do
					table.insert(lines, { text = EssenceConfig.Essences[essence].displayName .. " · maestría " .. level, met = profile.essences[essence].mastery >= level and profile.essences[essence].unlocked })
				end
				if def.research.discovery then
					local found = profile.codex.discoveries[def.research.discovery] ~= nil
					table.insert(lines, { text = if found then "Tablilla del Ocaso Solar estudiada" else "Falta conocimiento — " .. def.hint, met = found })
				end
				for _, line in ViewUtil.costLines(profile, def.research.cost) do
					table.insert(lines, line)
				end
				Kit.requirements(card, lines, 3)
				local all = true
				for _, line in lines do
					all = all and line.met
				end
				local b = Kit.button({ parent = card, text = "Investigar", color = def.color, order = 4, onClick = function()
					ClientState.request("ResearchFusion", { id = id })
				end })
				b.setEnabled(all, if not all then "Faltan requisitos" else nil)
			end
		end
		local attune = Kit.card(body, "Sintonía de esencias", 10, C.Accent)
		ViewUtil.para(attune, "Las esencias también se ganan con contratos. La sintonía es la alternativa garantizada.", C.TextDim, 0, 13)
		for i, id in { "Storm", "Gravity" } do
			local def = EssenceConfig.Essences[id]
			local card = Kit.card(attune, def.displayName, i, def.color)
			if profile.essences[id].unlocked then
				ViewUtil.para(card, "✔ Sintonizada.", C.Good, 1)
			else
				local lines = ViewUtil.costLines(profile, def.attuneCost)
				table.insert(lines, 1, { text = "Nivel de jugador " .. def.attuneLevel, met = profile.level >= def.attuneLevel })
				Kit.requirements(card, lines, 1)
				local ok = profile.level >= def.attuneLevel and Costs.canAfford(profile, def.attuneCost)
				local b = Kit.button({ parent = card, text = "Sintonizar " .. def.displayName, color = def.color, order = 2, onClick = function()
					ClientState.request("AttuneEssence", { essence = id })
				end })
				b.setEnabled(ok, if not ok then "Faltan requisitos" else nil)
			end
		end
	end, { "profile" })
end

return View
