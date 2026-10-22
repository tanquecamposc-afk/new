--!strict
-- XP, levels, weapon/essence mastery, unlocks, achievements, codex and first-time moments.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local ProgressionConfig = require(Config.ProgressionConfig)
local WeaponConfig = require(Config.WeaponConfig)
local EssenceConfig = require(Config.EssenceConfig)
local Leveling = require(Shared.Progression.Leveling)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local ProgressionService = {}

local function data(player: Player): any
	return Registry.get("PlayerDataService").get(player)
end

local function dirty(player: Player)
	Registry.get("PlayerDataService").markDirty(player)
end

local function notify(player: Player, kind: string, text: string, extra: any?)
	Net.event("Notify"):FireClient(player, kind, text, extra)
end

function ProgressionService.Init() end
function ProgressionService.Start() end

-- First-time presentation moments (shown once per profile).
function ProgressionService.present(player: Player, momentId: string, payload: any)
	local profile = data(player)
	if not profile then
		return
	end
	if profile.tutorial.moments[momentId] then
		return
	end
	profile.tutorial.moments[momentId] = true
	dirty(player)
	Net.event("Present"):FireClient(player, momentId, payload)
end

function ProgressionService.addXp(player: Player, amount: number)
	local profile = data(player)
	if not profile or amount <= 0 then
		return
	end
	local result = Leveling.add(profile.level, profile.xp, amount, ProgressionConfig.levelXp, ProgressionConfig.MaxLevel)
	profile.level, profile.xp = result.level, result.xp
	dirty(player)
	if result.gained > 0 then
		local unlock = ProgressionConfig.LevelUnlocks[profile.level]
		notify(player, "LevelUp", "Level " .. profile.level .. "!", { unlock = unlock })
		Net.event("Effect"):FireAllClients("LevelUp", { player = player })
	end
end

function ProgressionService.addWeaponMastery(player: Player, weaponId: string, amount: number)
	local profile = data(player)
	if not profile or amount <= 0 then
		return
	end
	local weapon = profile.weapons[weaponId]
	local def = WeaponConfig.Weapons[weaponId]
	if not weapon or not def or not def.implemented then
		return
	end
	local result =
		Leveling.add(weapon.mastery, weapon.masteryXp, amount, ProgressionConfig.weaponMasteryXp, def.maxMastery)
	weapon.mastery, weapon.masteryXp = result.level, result.xp
	dirty(player)
	if result.gained > 0 then
		local unlock = def.masteryUnlocks[weapon.mastery]
		notify(
			player,
			"Mastery",
			string.format("%s mastery %d", def.displayName, weapon.mastery),
			{ unlock = unlock, color = def.trailColor }
		)
		if weapon.mastery >= def.evolutionMastery and weapon.evolution == "None" then
			if profile.trials[def.evolutionTrial] then
				ProgressionService.present(player, "EvolutionReady", { weapon = weaponId })
			else
				notify(player, "Info", "Complete the Katana Trial at the Training Arena to unlock evolution.")
			end
		end
	end
end

function ProgressionService.addEssenceXp(player: Player, essence: string, amount: number)
	local profile = data(player)
	if not profile or amount <= 0 then
		return
	end
	local record = profile.essences[essence]
	local def = EssenceConfig.Essences[essence]
	if not record or not record.unlocked or not def or not def.implemented then
		return
	end
	local result = Leveling.add(record.mastery, record.xp, amount, ProgressionConfig.essenceMasteryXp, def.maxMastery)
	record.mastery, record.xp = result.level, result.xp
	dirty(player)
	if result.gained > 0 then
		notify(
			player,
			"Mastery",
			string.format("%s mastery %d", def.displayName, record.mastery),
			{ unlock = def.masteryUnlocks[record.mastery], color = def.color }
		)
		Registry.get("FusionService").refreshResearchHints(player)
	end
end

function ProgressionService.unlockEssence(player: Player, essence: string, reason: string): boolean
	local profile = data(player)
	if not profile or not EssenceConfig.isPlayable(essence) then
		return false
	end
	local record = profile.essences[essence]
	if record.unlocked then
		return false
	end
	record.unlocked = true
	dirty(player)
	local def = EssenceConfig.Essences[essence]
	Registry.get("PlayerDataService").markDirty(player)
	ProgressionService.present(player, "Essence_" .. essence, {
		title = def.displayName .. " Essence Awakened",
		subtitle = def.theme,
		body = reason .. " Equip it in Loadout (Tab).",
		color = def.color,
	})
	notify(player, "Unlock", def.displayName .. " essence unlocked!", { color = def.color })
	local unlockedCount = 0
	for _, r in profile.essences do
		if r.unlocked then
			unlockedCount += 1
		end
	end
	if unlockedCount >= 2 then
		ProgressionService.achieve(player, "SecondSoul")
	end
	Registry.get("QuestService").record(player, "EssenceUnlocked", { essence = essence })
	return true
end

function ProgressionService.achieve(player: Player, id: string)
	local profile = data(player)
	local def = ProgressionConfig.Achievements[id]
	if not profile or not def or profile.achievements[id] then
		return
	end
	profile.achievements[id] = os.time()
	dirty(player)
	notify(player, "Achievement", def.name, { description = def.description })
	-- Achievement cosmetics
	for _, cosmetic in ProgressionConfig.Cosmetics do
		if cosmetic.achievement == id then
			profile.cosmetics.owned[cosmetic.id] = true
			notify(player, "Unlock", "Cosmetic unlocked: " .. cosmetic.name)
		end
	end
end

-- Increments a lifetime stat and checks stat-based achievements.
function ProgressionService.stat(player: Player, key: string, amount: number?)
	local profile = data(player)
	if not profile then
		return
	end
	profile.stats[key] = (profile.stats[key] or 0) + (amount or 1)
	dirty(player)
	for id, def in ProgressionConfig.Achievements do
		if def.stat == key and profile.stats[key] >= def.target then
			ProgressionService.achieve(player, id)
		end
	end
end

function ProgressionService.discover(player: Player, discoveryId: string): boolean
	local profile = data(player)
	if not profile or profile.codex.discoveries[discoveryId] then
		return false
	end
	profile.codex.discoveries[discoveryId] = os.time()
	dirty(player)
	Registry.get("QuestService").record(player, "Discover", { id = discoveryId })
	return true
end

function ProgressionService.recordEnemy(player: Player, archetype: string, defeated: boolean)
	local profile = data(player)
	if not profile then
		return
	end
	local entry = profile.codex.enemies[archetype]
	if not entry then
		entry = { seen = true, defeated = 0 }
		profile.codex.enemies[archetype] = entry
	end
	if defeated then
		entry.defeated += 1
	end
	dirty(player)
end

function ProgressionService.recordRegion(player: Player, regionId: string)
	local profile = data(player)
	if not profile or profile.codex.regions[regionId] then
		return
	end
	profile.codex.regions[regionId] = os.time()
	dirty(player)
end

return ProgressionService
