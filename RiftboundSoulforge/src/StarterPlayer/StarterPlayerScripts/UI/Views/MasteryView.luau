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
		local card = Kit.card(body, def.displayName .. " — Mastery " .. weapon.mastery .. "/" .. def.maxMastery, 1, def.trailColor)
		local bar = Kit.bar({ parent = card, color = C.Gold, order = 1 })
		bar.set(Leveling.progress(weapon.mastery, weapon.masteryXp, ProgressionConfig.weaponMasteryXp, def.maxMastery), string.format("%d / %d XP", math.floor(weapon.masteryXp), ProgressionConfig.weaponMasteryXp(weapon.mastery)))
		ViewUtil.para(card, "Mastery grows by landing katana strikes on real enemies (training targets give a trickle), defeating champions and bosses.", C.TextDim, 2, 12)
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
		local stats = Kit.card(body, "Current moveset", 2)
		for i, entry in CombatMath.summary(CombatMath.weaponBuild("Katana", weapon)) do
			ViewUtil.para(stats, entry.label .. ": <b>" .. entry.value .. "</b>", C.Text, i)
		end
		-- evolution
		local evoCard = Kit.card(body, "Weapon Evolution", 3, C.Accent)
		local trialDone = profile.trials[def.evolutionTrial] ~= nil
		Kit.requirements(evoCard, {
			{ text = "Katana mastery " .. def.evolutionMastery .. " (now " .. weapon.mastery .. ")", met = weapon.mastery >= def.evolutionMastery },
			{ text = "Katana Trial completed (Training Arena pedestal)", met = trialDone },
		}, 1)
		local eligible = weapon.mastery >= def.evolutionMastery and trialDone
		for i, branch in { "Tempest", "Aegis" } do
			local evo = def.evolutions[branch]
			local c = Kit.card(evoCard, evo.displayName .. (if weapon.evolution == branch then "  (CURRENT)" else ""), 10 + i, evo.trailColor)
			ViewUtil.para(c, evo.summary, C.Text, 1)
			for j, line in evo.details do
				ViewUtil.para(c, "• " .. line, C.TextDim, 1 + j, 13)
			end
			local label = if weapon.evolution == "None" then "Evolve" else "Switch (500 coins, at Forge)"
			local b = Kit.button({ parent = c, text = label, color = evo.trailColor, textColor = Color3.new(0, 0, 0), size = UDim2.fromOffset(240, 36), order = 20, onClick = function()
				ClientState.request("ChooseEvolution", { branch = branch })
			end })
			b.setEnabled(eligible and weapon.evolution ~= branch, if not eligible then "Locked" else nil)
		end
		-- essences
		for i, id in { "Ember", "Storm", "Gravity" } do
			local ess = EssenceConfig.Essences[id]
			local record = profile.essences[id]
			local c = Kit.card(body, ess.displayName .. " mastery " .. (if record.unlocked then tostring(record.mastery) else "—"), 10 + i, ess.color)
			if record.unlocked then
				local b2 = Kit.bar({ parent = c, color = ess.color, order = 1 })
				b2.set(Leveling.progress(record.mastery, record.xp, ProgressionConfig.essenceMasteryXp, ess.maxMastery), string.format("%d XP", math.floor(record.xp)))
				for level = 1, ess.maxMastery do
					ViewUtil.para(c, string.format("%s M%d — %s", if record.mastery >= level then "✔" else "○", level, ess.masteryUnlocks[level]), if record.mastery >= level then C.Good else C.TextDim, 1 + level)
				end
			else
				ViewUtil.para(c, "Locked — " .. ess.unlockHint, C.Warn, 1)
			end
		end
	end, { "profile" })
end

return View
