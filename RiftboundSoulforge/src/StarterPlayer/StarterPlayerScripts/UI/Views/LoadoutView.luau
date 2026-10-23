--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local EssenceConfig = require(Config.EssenceConfig)
local FusionConfig = require(Config.FusionConfig)
local ProgressionConfig = require(Config.ProgressionConfig)
local MonetizationConfig = require(Config.MonetizationConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		ViewUtil.para(body, "Cambia de esencias en el Nexo o en el campamento. Tu build = Katana + esencia principal (Q/E + Despertar) + esencia secundaria (fusión en R).", C.TextDim, 0)
		local slots = Kit.card(body, "Ranuras de esencia", 1, C.Accent)
		local primary = EssenceConfig.Essences[profile.loadout.primary]
		local secondary = EssenceConfig.Essences[profile.loadout.secondary]
		ViewUtil.para(slots, "Principal: <b>" .. (primary and primary.displayName or "—") .. "</b>   Secundaria: <b>" .. (secondary and secondary.displayName or "—") .. "</b>", C.Text, 1, 16)
		local fusionId = FusionConfig.forPair(profile.loadout.primary, profile.loadout.secondary)
		if fusionId then
			local f = FusionConfig.Fusions[fusionId]
			local unlocked = profile.fusions[fusionId] and profile.fusions[fusionId].unlocked
			ViewUtil.para(slots, "Pareja de fusión: <b>" .. f.displayName .. "</b> " .. (if unlocked then " (lista en R)" else " (bloqueada — mira el Códice de Fusiones)"), if unlocked then C.Good else C.Warn, 2)
		end
		if profile.level < EssenceConfig.SecondarySlotLevel then
			ViewUtil.para(slots, "La ranura secundaria se desbloquea en el nivel " .. EssenceConfig.SecondarySlotLevel .. ".", C.Warn, 3)
		end
		for i, id in EssenceConfig.Order do
			local def = EssenceConfig.Essences[id]
			local record = profile.essences[id]
			local card = Kit.card(body, def.displayName, 10 + i, def.color)
			ViewUtil.para(card, def.theme, C.TextDim, 1)
			if not def.implemented then
				ViewUtil.para(card, "Sellado — " .. def.unlockHint, C.TextMuted, 2)
			elseif not record or not record.unlocked then
				ViewUtil.para(card, "Bloqueado — " .. def.unlockHint, C.Warn, 2)
			else
				ViewUtil.para(card, "Maestría " .. record.mastery .. "/" .. def.maxMastery, C.Text, 2)
				local row = Kit.row(card, 3, 40)
				local isPrimary = profile.loadout.primary == id
				local isSecondary = profile.loadout.secondary == id
				local p = Kit.button({ parent = row, text = if isPrimary then "Principal ✔" else "Hacer principal", color = def.color, order = 1, onClick = function()
					ClientState.request("EquipEssence", { slot = "primary", essence = id })
				end })
				p.setEnabled(not isPrimary)
				local s = Kit.button({ parent = row, text = if isSecondary then "Quitar secundaria" else "Hacer secundaria", color = C.PanelLight, order = 2, onClick = function()
					ClientState.request("EquipEssence", { slot = "secondary", essence = if isSecondary then "" else id })
				end })
				s.setEnabled(not isPrimary and profile.level >= EssenceConfig.SecondarySlotLevel)
			end
		end
		-- saved loadouts
		local saved = Kit.card(body, "Equipamientos guardados", 30)
		local extra = profile.passes and profile.passes.ExtraLoadouts
		local count = ProgressionConfig.FreeLoadoutSlots + (if extra then ProgressionConfig.PassLoadoutSlots else 0)
		for i = 1, count do
			local entry = profile.loadouts[tostring(i)]
			local row = Kit.row(saved, i, 40)
			local label = if entry then string.format("Ranura %d: %s + %s", i, entry.primary, if entry.secondary ~= "" then entry.secondary else "—") else string.format("Ranura %d: vacía", i)
			Kit.text({ parent = row, text = label, size = UDim2.fromOffset(260, 36), order = 1 })
			Kit.button({ parent = row, text = "Guardar actual", size = UDim2.fromOffset(130, 34), color = C.PanelLight, order = 2, onClick = function()
				ClientState.request("SaveLoadout", { index = i })
			end })
			local apply = Kit.button({ parent = row, text = "Aplicar", size = UDim2.fromOffset(90, 34), order = 3, onClick = function()
				ClientState.request("ApplyLoadout", { index = i })
			end })
			apply.setEnabled(entry ~= nil)
		end
		if not extra then
			local pass = MonetizationConfig.GamePasses.ExtraLoadouts
			ViewUtil.para(saved, if MonetizationConfig.isConfigured(pass) then "Más ranuras: " .. pass.displayName .. " (pestaña Tienda)." else "Más ranuras: pase Archivo de Equipamientos (aún no disponible).", C.TextMuted, 99, 12)
		end
		-- cosmetics
		local cos = Kit.card(body, "Estelas cosméticas de katana", 40, C.Gold)
		for i, id in ProgressionConfig.CosmeticOrder do
			local def = ProgressionConfig.Cosmetics[id]
			local owned = profile.cosmetics.owned[id] == true
			local row = Kit.row(cos, i, 40)
			Kit.text({ parent = row, text = def.name .. "  •  " .. def.source, size = UDim2.fromOffset(380, 36), order = 1, color = if owned then C.Text else C.TextMuted })
			local b = Kit.button({ parent = row, text = if profile.cosmetics.trail == id then "Equipado" else "Equipar", size = UDim2.fromOffset(110, 34), order = 2, onClick = function()
				ClientState.request("SelectCosmetic", { id = id })
			end })
			b.setEnabled(owned and profile.cosmetics.trail ~= id, if not owned then "Locked" else nil)
		end
	end, { "profile" })
end

return View
