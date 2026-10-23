--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local WeaponConfig = require(Config.WeaponConfig)
local EssenceConfig = require(Config.EssenceConfig)
local ProgressionConfig = require(Config.ProgressionConfig)
local Leveling = require(Shared.Progression.Leveling)
local CombatMath = require(Shared.Combat.CombatMath)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local def = WeaponConfig.Weapons.Katana
		local weapon = profile.weapons.Katana
		local card = Kit.card(body, def.displayName .. " — Maestría " .. weapon.mastery .. "/" .. def.maxMastery, 1, def.trailColor)
		local bar = Kit.bar({ parent = card, color = C.Gold, order = 1 })
		bar.set(Leveling.progress(weapon.mastery, weapon.masteryXp, ProgressionConfig.weaponMasteryXp, def.maxMastery), string.format("%d / %d EXP", math.floor(weapon.masteryXp), ProgressionConfig.weaponMasteryXp(weapon.mastery)))
		ViewUtil.para(card, "La maestría crece al acertar golpes de katana a enemigos reales (los blancos de entrenamiento dan poco) y al derrotar campeones y jefes.", C.TextDim, 2, 12)
		local levels = {}
		for level in def.masteryUnlocks do
			table.insert(levels, level)
		end
		table.sort(levels)
		for i, level in levels do
			local reached = weapon.mastery >= level
			ViewUtil.para(card, string.format("%s M%d — %s", if reached then "✔" else "○", level, def.masteryUnlocks[level]), if reached then C.Good else C.TextDim, 10 + i)
		end
		-- current stats
		local stats = Kit.card(body, "Movimientos actuales", 2)
		for i, entry in CombatMath.summary(CombatMath.weaponBuild("Katana", weapon)) do
			ViewUtil.para(stats, entry.label .. ": <b>" .. entry.value .. "</b>", C.Text, i)
		end
		-- evolution
		local evoCard = Kit.card(body, "Evolución del Arma", 3, C.Accent)
		local trialDone = profile.trials[def.evolutionTrial] ~= nil
		Kit.requirements(evoCard, {
			{ text = "Maestría de katana " .. def.evolutionMastery .. " (ahora " .. weapon.mastery .. ")", met = weapon.mastery >= def.evolutionMastery },
			{ text = "Prueba de la Katana completada (pedestal de la Arena de Entrenamiento)", met = trialDone },
		}, 1)
		local eligible = weapon.mastery >= def.evolutionMastery and trialDone
		for i, branch in { "Tempest", "Aegis" } do
			local evo = def.evolutions[branch]
			local c = Kit.card(evoCard, evo.displayName .. (if weapon.evolution == branch then "  (ACTUAL)" else ""), 10 + i, evo.trailColor)
			ViewUtil.para(c, evo.summary, C.Text, 1)
			for j, line in evo.details do
				ViewUtil.para(c, "• " .. line, C.TextDim, 1 + j, 13)
			end
			local label = if weapon.evolution == "None" then "Evolucionar" else "Cambiar (500 monedas, en la Forja)"
			local b = Kit.button({ parent = c, text = label, color = evo.trailColor, textColor = Color3.new(0, 0, 0), size = UDim2.fromOffset(240, 36), order = 20, onClick = function()
				ClientState.request("ChooseEvolution", { branch = branch })
			end })
			b.setEnabled(eligible and weapon.evolution ~= branch, if not eligible then "Locked" else nil)
		end
		-- essences
		for i, id in { "Ember", "Storm", "Gravity" } do
			local ess = EssenceConfig.Essences[id]
			local record = profile.essences[id]
			local c = Kit.card(body, ess.displayName .. " · maestría " .. (if record.unlocked then tostring(record.mastery) else "—"), 10 + i, ess.color)
			if record.unlocked then
				local b2 = Kit.bar({ parent = c, color = ess.color, order = 1 })
				b2.set(Leveling.progress(record.mastery, record.xp, ProgressionConfig.essenceMasteryXp, ess.maxMastery), string.format("%d EXP", math.floor(record.xp)))
				for level = 1, ess.maxMastery do
					ViewUtil.para(c, string.format("%s M%d — %s", if record.mastery >= level then "✔" else "○", level, ess.masteryUnlocks[level]), if record.mastery >= level then C.Good else C.TextDim, 1 + level)
				end
			else
				ViewUtil.para(c, "Bloqueado — " .. ess.unlockHint, C.Warn, 1)
			end
		end
	end, { "profile" })
end

return View
