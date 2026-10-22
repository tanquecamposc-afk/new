--!strict
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local FusionConfig = require(Config.FusionConfig)
local EnemyConfig = require(Config.EnemyConfig)
local BossConfig = require(Config.BossConfig)
local DiscoveryConfig = require(Config.DiscoveryConfig)
local ProgressionConfig = require(Config.ProgressionConfig)
local WeaponConfig = require(Config.WeaponConfig)
local WorldConfig = require(Config.WorldConfig)
local CoopConfig = require(Config.CoopConfig)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)

local C = Theme.Colors
local View = {}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, profile)
		local order = 0
		local function next(): number
			order += 1
			return order
		end
		ViewUtil.heading(body, "Fusion Codex", next())
		for _, id in FusionConfig.Order do
			local def = FusionConfig.Fusions[id]
			local record = profile.fusions[id]
			local card = Kit.card(body, def.displayName .. "  (" .. table.concat(def.essences, " + ") .. ")", next(), def.color)
			if not def.implemented then
				ViewUtil.para(card, def.summary, C.TextMuted, 1)
			elseif record and record.unlocked then
				ViewUtil.para(card, "UNLOCKED — " .. def.summary, C.Good, 1)
			else
				ViewUtil.para(card, def.summary, C.TextDim, 1)
				ViewUtil.para(card, "Hint: " .. def.hint, C.Accent, 2, 13)
				ViewUtil.para(card, if record and record.researched then string.format("Research done. Attunement %d/%d — %s", record.attunement, def.attunement.count, def.attunement.description) else "Research it at the Fusion Chamber in the Nexus.", C.Warn, 3, 13)
			end
		end
		ViewUtil.heading(body, "Cooperative Resonance", next())
		for _, id in CoopConfig.Order do
			local def = CoopConfig.Combos[id]
			local card = Kit.card(body, def.displayName, next(), def.color)
			ViewUtil.para(card, def.description, C.TextDim, 1)
		end
		ViewUtil.heading(body, "Bestiary", next())
		for _, id in EnemyConfig.BestiaryOrder do
			local entry = profile.codex.enemies[id]
			local def = EnemyConfig.Enemies[id] or BossConfig[id]
			local card = Kit.card(body, if entry then def.displayName else "??? (not yet encountered)", next())
			if entry then
				ViewUtil.para(card, def.lore, C.TextDim, 1)
				if def.tip then
					ViewUtil.para(card, "Tip: " .. def.tip, C.Accent, 2, 13)
				end
				ViewUtil.para(card, "Defeated: " .. entry.defeated, C.Text, 3, 13)
			end
			if id == "FractureWarden" then
				local boss = profile.bosses.FractureWarden
				ViewUtil.para(card, string.format("Clears: %d   Best time: %s", boss.clears, if boss.bestTime > 0 then string.format("%d:%02d", boss.bestTime // 60, boss.bestTime % 60) else "—"), C.Gold, 4, 13)
				for i, key in { "WardenLanceWeakness", "WardenBackCrystal" } do
					local d = DiscoveryConfig.Discoveries[key]
					ViewUtil.para(card, if profile.codex.discoveries[key] then "◆ " .. d.text else "◇ " .. d.hint, if profile.codex.discoveries[key] then C.Good else C.TextMuted, 4 + i, 13)
				end
			end
		end
		ViewUtil.heading(body, "Discoveries", next())
		for _, id in DiscoveryConfig.Order do
			local d = DiscoveryConfig.Discoveries[id]
			local found = profile.codex.discoveries[id] ~= nil
			local card = Kit.card(body, if found then d.displayName else "Undiscovered (" .. d.category .. ")", next(), if found then C.Gold else nil)
			ViewUtil.para(card, if found then d.text else "Hint: " .. d.hint, if found then C.TextDim else C.TextMuted, 1)
		end
		ViewUtil.heading(body, "Weapons", next())
		for _, id in WeaponConfig.Order do
			local def = WeaponConfig.Weapons[id]
			local card = Kit.card(body, def.displayName, next())
			ViewUtil.para(card, if def.implemented then def.description else "Not yet forged — planned for a future update.", if def.implemented then C.TextDim else C.TextMuted, 1)
		end
		ViewUtil.heading(body, "Regions", next())
		for _, region in WorldConfig.Regions do
			local seen = profile.codex.regions[region.id] ~= nil
			local card = Kit.card(body, if seen then region.name else "??? ", next())
			ViewUtil.para(card, if seen then "Depth " .. region.depth .. (if region.safe then " • safe" else "") else "Unexplored.", C.TextDim, 1)
		end
		for _, region in WorldConfig.FutureRegions do
			local card = Kit.card(body, region.name .. "  (coming later)", next())
			ViewUtil.para(card, region.teaser .. " Not playable in this version.", C.TextMuted, 1)
		end
		ViewUtil.heading(body, "Achievements", next())
		for _, id in ProgressionConfig.AchievementOrder do
			local def = ProgressionConfig.Achievements[id]
			local got = profile.achievements[id] ~= nil
			ViewUtil.para(body, string.format("%s <b>%s</b> — %s", if got then "★" else "☆", def.name, def.description), if got then C.Gold else C.TextMuted, next(), 14)
		end
	end, { "profile" })
end

return View
