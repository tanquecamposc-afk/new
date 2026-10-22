-- Unit tests for pure modules. Run: tools/luau-check/target/release/luau-check test tests/run.luau src
local Shared = ROOT.ReplicatedStorage.Shared
local Config = Shared.Config
local Leveling = require(Shared.Progression.Leveling)
local Costs = require(Shared.Inventory.Costs)
local CombatMath = require(Shared.Combat.CombatMath)
local ProfileSchema = require(ROOT.ServerScriptService.Data.ProfileSchema)
local ProgressionConfig = require(Config.ProgressionConfig)
local FusionConfig = require(Config.FusionConfig)
local QuestConfig = require(Config.QuestConfig)
local WorldConfig = require(Config.WorldConfig)
local EnemyConfig = require(Config.EnemyConfig)
local EssenceConfig = require(Config.EssenceConfig)
local ItemConfig = require(Config.ItemConfig)
local RecipeConfig = require(Config.RecipeConfig)
local MonetizationConfig = require(Config.MonetizationConfig)
local WeaponConfig = require(Config.WeaponConfig)
local AwakeningConfig = require(Config.AwakeningConfig)
local BossConfig = require(Config.BossConfig)
local AbilitiesSrc = __readfile(__SRC_ROOT .. "/ServerScriptService/Combat/Abilities.luau")

print("Leveling")
test("adds xp and levels up", function()
	local r = Leveling.add(1, 0, ProgressionConfig.levelXp(1) + 5, ProgressionConfig.levelXp, 40)
	eq(r.level, 2, "level")
	eq(r.xp, 5, "xp carry")
	eq(r.gained, 1, "gained")
end)
test("ignores NaN / negative / infinite xp", function()
	eq(Leveling.add(3, 10, 0 / 0, ProgressionConfig.levelXp, 40).xp, 10)
	eq(Leveling.add(3, 10, -50, ProgressionConfig.levelXp, 40).xp, 10)
	eq(Leveling.add(3, 10, math.huge, ProgressionConfig.levelXp, 40).level, 3)
end)
test("clamps at max level", function()
	local r = Leveling.add(9, 0, 1e9, ProgressionConfig.weaponMasteryXp, 10)
	eq(r.level, 10)
	eq(r.xp, 0)
end)

print("Costs")
test("canAfford + spend", function()
	local p = { coins = 100, materials = { Iron = 5 } }
	local ok = Costs.canAfford(p, { Iron = 5, Coins = 100 })
	expect(ok, "should afford")
	expect(Costs.spend(p, { Iron = 5, Coins = 100 }))
	eq(p.coins, 0)
	eq(p.materials.Iron, 0)
end)
test("spend fails atomically when short", function()
	local p = { coins = 10, materials = { Iron = 5 } }
	expect(not Costs.spend(p, { Iron = 5, Coins = 100 }))
	eq(p.materials.Iron, 5, "iron untouched")
	eq(p.coins, 10, "coins untouched")
	local _, missing = Costs.canAfford(p, { Iron = 6, Cobalt = 1 })
	eq(#missing, 2)
end)

print("ProfileSchema")
test("nil loads default at current version", function()
	local p = ProfileSchema.load(nil)
	eq(p.schemaVersion, ProfileSchema.Version)
	eq(p.essences.Ember.unlocked, true)
	eq(p.weapons.Katana.upgrade, 1)
end)
test("v1 data migrates unlockedEssences list", function()
	local p = ProfileSchema.load({ schemaVersion = 1, coins = 50, materials = { Iron = 3 }, unlockedEssences = { "Ember", "Storm" } })
	eq(p.essences.Storm.unlocked, true)
	eq(p.essences.Gravity.unlocked, false)
	eq(p.unlockedEssences, nil)
	eq(p.coins, 50)
	eq(p.materials.Iron, 3)
	eq(p.materials.Cobalt, 0, "reconciled default")
end)
test("unversioned prototype data migrates", function()
	local p = ProfileSchema.load({ coins = "12" })
	eq(p.coins, 12)
	eq(p.schemaVersion, ProfileSchema.Version)
end)
test("newer schema is refused (never overwritten)", function()
	local p, reason = ProfileSchema.load({ schemaVersion = 999 })
	eq(p, nil)
	expect(reason ~= nil)
end)
test("non-table is refused", function()
	local p = ProfileSchema.load("garbage")
	eq(p, nil)
end)
test("sanitises bad numbers and types", function()
	local p = ProfileSchema.load({ schemaVersion = 2, coins = -5, level = 0 / 0, materials = { Iron = 0 / 0, Cobalt = -3, Emberstone = 2.7 }, settings = "nope" })
	eq(p.coins, 0)
	eq(p.level, 1)
	eq(p.materials.Iron, 0)
	eq(p.materials.Cobalt, 0)
	eq(p.materials.Emberstone, 2)
	eq(type(p.settings), "table")
end)
test("receipt history is bounded", function()
	local receipts = {}
	for i = 1, 250 do
		receipts[i] = tostring(i)
	end
	local p = ProfileSchema.load({ schemaVersion = 2, receipts = receipts })
	eq(#p.receipts, 200)
	eq(p.receipts[200], "250", "keeps newest")
end)
test("public view strips receipts", function()
	local p = ProfileSchema.load(nil)
	table.insert(p.receipts, "x")
	eq(ProfileSchema.publicView(p).receipts, nil)
	eq(#p.receipts, 1, "original untouched")
end)

test("sparse quest counts are densified", function()
	local p = ProfileSchema.load({ schemaVersion = 2, quests = { progress = { m02_guard = { counts = { [2] = 1 } } }, completed = {}, claimed = {} } })
	local counts = p.quests.progress.m02_guard.counts
	eq(#counts, 2)
	eq(counts[1], 0)
	eq(counts[2], 1)
end)

print("CombatMath")
local function state(m, u, t, e)
	return { mastery = m, upgrade = u, temper = t, evolution = e }
end
test("mastery gates the 4th strike", function()
	eq(#CombatMath.weaponBuild("Katana", state(1, 1, "None", "None")).light, 3)
	eq(#CombatMath.weaponBuild("Katana", state(3, 1, "None", "None")).light, 4)
end)
test("Tempest adds 5th strike, speed, lunge heavy", function()
	local b = CombatMath.weaponBuild("Katana", state(5, 1, "None", "Tempest"))
	eq(#b.light, 5)
	eq(b.attackSpeed, 1.15)
	eq(b.heavy.name, "Gale Thrust")
	expect(b.dodgeCooldown < WeaponConfig.Weapons.Katana.dodge.cooldown)
end)
test("Aegis widens parry and adds riposte", function()
	local base = CombatMath.weaponBuild("Katana", state(5, 1, "None", "None"))
	local b = CombatMath.weaponBuild("Katana", state(5, 1, "None", "Aegis"))
	expect(b.parryWindow > base.parryWindow)
	expect(b.riposte ~= nil)
	expect(b.heavy.radius ~= nil, "slam")
end)
test("upgrades and tempers scale damage", function()
	local a = CombatMath.weaponBuild("Katana", state(1, 1, "None", "None"))
	local b = CombatMath.weaponBuild("Katana", state(1, 3, "None", "None"))
	expect(b.base > a.base)
	local swift = CombatMath.weaponBuild("Katana", state(1, 1, "Swift", "None"))
	expect(swift.attackSpeed > a.attackSpeed and swift.base < a.base)
	eq(#CombatMath.summary(a), 8)
end)
test("upgrade level is clamped", function()
	local b = CombatMath.weaponBuild("Katana", state(1, 99, "None", "None"))
	expect(b.base == CombatMath.weaponBuild("Katana", state(1, WeaponConfig.MaxUpgrade, "None", "None")).base)
end)

print("Fusion / Quests")
test("fusion pairs are symmetric", function()
	eq(FusionConfig.forPair("Ember", "Gravity"), "CollapsingSun")
	eq(FusionConfig.forPair("Gravity", "Ember"), "CollapsingSun")
	eq(FusionConfig.forPair("Storm", "Gravity"), "MagneticRift")
	eq(FusionConfig.forPair("Ember", "Ember"), nil)
	eq(FusionConfig.forPair("Ember", nil), nil)
end)
test("implemented fusions point at real abilities", function()
	for id, def in FusionConfig.Fusions do
		if def.implemented then
			expect(EssenceConfig.Abilities[def.ability], id .. " ability missing")
			expect(string.find(AbilitiesSrc, "impl." .. def.ability .. " =", 1, true), id .. " has no server implementation")
		end
	end
end)
test("every essence ability + signature has a server implementation", function()
	for id in EssenceConfig.Abilities do
		expect(string.find(AbilitiesSrc, "impl." .. id .. " =", 1, true), id)
	end
	for _, form in AwakeningConfig.Forms do
		expect(string.find(AbilitiesSrc, "impl." .. form.signature.id .. " =", 1, true), form.signature.id)
	end
end)
test("daily picks are deterministic and unique", function()
	local a = QuestConfig.dailyPicks(20000)
	local b = QuestConfig.dailyPicks(20000)
	eq(#a, QuestConfig.DailyCount)
	for i = 1, #a do
		eq(a[i], b[i])
		for j = i + 1, #a do
			expect(a[i] ~= a[j], "duplicate pick")
		end
	end
end)
test("objective matching respects filters", function()
	local o = { event = "Kill", filter = { archetype = "RiftStalker" }, count = 3 }
	expect(QuestConfig.matches(o, "Kill", { archetype = "RiftStalker" }))
	expect(not QuestConfig.matches(o, "Kill", { archetype = "EmberBeast" }))
	expect(not QuestConfig.matches(o, "Mine", { archetype = "RiftStalker" }))
	expect(QuestConfig.matches({ event = "Kill", count = 1 }, "Kill", nil))
end)
local KNOWN_EVENTS = { Hit = 1, PerfectParry = 1, DodgeTelegraph = 1, EnterRegion = 1, Mine = 1, Kill = 1, Extract = 1, Upgrade = 1, Craft = 1, Temper = 1, Discover = 1, BossDefeated = 1, Coop = 1, FusionCast = 1, Awaken = 1, Trial = 1, EssenceUnlocked = 1 }
test("all quest objectives use events the server emits", function()
	for id, def in QuestConfig.Quests do
		for _, o in def.objectives do
			expect(KNOWN_EVENTS[o.event], id .. " uses unknown event " .. o.event)
		end
		for _, req in def.requires or {} do
			expect(QuestConfig.Quests[req], id .. " requires unknown " .. req)
		end
		for item in def.rewards.items or {} do
			expect(ItemConfig.isValid(item), id .. " rewards unknown item " .. item)
		end
	end
	for _, d in QuestConfig.DailyPool do
		for _, o in d.objectives do
			expect(KNOWN_EVENTS[o.event], d.id)
		end
	end
	for _, id in QuestConfig.Order do
		expect(QuestConfig.Quests[id], "order lists unknown " .. id)
	end
end)

print("World / content integrity")
test("regionAt picks the most specific region", function()
	eq(WorldConfig.regionAt(Vector3.new(0, 5, 0)).id, "Nexus")
	eq(WorldConfig.regionAt(WorldConfig.Arena.center + Vector3.new(0, 3, 0)).id, "Arena")
	eq(WorldConfig.regionAt(WorldConfig.Points.SunfallTablet + Vector3.new(0, 3, 0)).id, "SunfallChamber")
	eq(WorldConfig.regionAt(WorldConfig.Points.CampArrival).id, "Camp")
	eq(WorldConfig.regionAt(Vector3.new(5000, 0, 0)), nil)
end)
test("every spawner, node and brazier is inside a region", function()
	for _, s in WorldConfig.Spawners do
		expect(WorldConfig.regionAt(s.position + Vector3.new(0, 2, 0)), "spawner " .. s.archetype)
		expect(EnemyConfig.Enemies[s.archetype], "unknown archetype " .. s.archetype)
	end
	for _, n in WorldConfig.Nodes do
		expect(WorldConfig.regionAt(n.position + Vector3.new(0, 2, 0)), "node " .. n.node)
	end
	for _, b in WorldConfig.Braziers do
		eq(WorldConfig.regionAt(b.position + Vector3.new(0, 2, 0)).id, "Frontier")
	end
end)
test("quest waypoints name real points", function()
	for quest, key in WorldConfig.QuestWaypoints do
		expect(WorldConfig.Points[key], quest .. " -> " .. key)
	end
end)
test("enemy attacks use supported shapes", function()
	local shapes = { Line = 1, Circle = 1, Ring = 1, CircleAtTarget = 1 }
	for id, def in EnemyConfig.Enemies do
		for _, a in def.attacks do
			expect(shapes[a.shape], id .. "." .. a.id)
			expect(a.windup >= 0.5, id .. "." .. a.id .. " windup too short to read")
		end
		for _, drop in def.drops do
			expect(ItemConfig.isValid(drop.item), id .. " drops unknown item")
		end
	end
end)
test("recipes only reference real items", function()
	local function check(cost, where)
		for key in cost do
			expect(key == "Coins" or ItemConfig.isValid(key), where .. ": " .. key)
		end
	end
	for level, r in RecipeConfig.Upgrades.Katana do
		check(r.cost, "upgrade " .. level)
	end
	for id, r in RecipeConfig.Tempers do
		check(r.cost, "temper " .. id)
		expect(WeaponConfig.Tempers[id], "temper def " .. id)
	end
	for id, r in RecipeConfig.Crafts do
		check(r.cost, "craft " .. id)
	end
end)
test("monetization ships unconfigured (no invented ids)", function()
	for _, p in MonetizationConfig.GamePasses do
		eq(MonetizationConfig.isConfigured(p), false)
	end
	for _, p in MonetizationConfig.Products do
		eq(MonetizationConfig.isConfigured(p), false)
	end
end)
test("boss phases are ordered and final phase exists", function()
	local phases = BossConfig.FractureWarden.phases
	for i = 2, #phases do
		expect(phases[i].threshold < phases[i - 1].threshold)
	end
	eq(phases[#phases].id, 4)
	for phase, list in BossConfig.FractureWarden.phaseAttacks do
		for _, id in list do
			expect(BossConfig.FractureWarden.attacks[id], "phase " .. phase .. " attack " .. id)
		end
	end
end)

return finish()
