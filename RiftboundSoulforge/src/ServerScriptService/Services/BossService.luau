--!strict
-- The Fracture Warden encounter: seal -> countdown -> arena lock -> 4 phases -> victory/reset.
-- Phase 1 Guarded Assault (melee, sweeps, slams), Phase 2 Rift Fractures (hazards, projectiles,
-- rift steps), Phase 3 Resonance Overload (interruptible channel, weak point, suppression),
-- Final: The Last Fracture (readable tile collapses, then a long vulnerable opening; it repeats
-- rather than wiping the party, so it is never a pure damage check).

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local BossConfig = require(Config.BossConfig)
local WorldConfig = require(Config.WorldConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)
local Telegraph = require(script.Parent.Parent.Combat.Telegraph)
local Hitbox = require(script.Parent.Parent.Combat.Hitbox)
local Models = require(script.Parent.Parent.World.Models)

local BossService = {}

local CFG = BossConfig.FractureWarden
local ARENA = WorldConfig.Arena

type Encounter = {
	id: number,
	state: string,
	countdownEnds: number,
	startedAt: number,
	participants: { [number]: Player },
	record: any?,
	phase: number,
	invulnerableUntil: number,
	finalActive: boolean,
	openingUntil: number,
	exposedUntil: number,
	nextAttackAt: number,
	busy: boolean,
	cooldowns: { [string]: number },
	targetUserId: number?,
	retargetAt: number,
	handles: { any },
	overload: any?,
	lastParry: any?,
	totalDamage: number,
}

local encounter: Encounter = {
	id = 0,
	state = "Dormant",
	countdownEnds = 0,
	startedAt = 0,
	participants = {},
	record = nil,
	phase = 1,
	invulnerableUntil = 0,
	finalActive = false,
	openingUntil = 0,
	exposedUntil = 0,
	nextAttackAt = 0,
	busy = false,
	cooldowns = {},
	targetUserId = nil,
	retargetAt = 0,
	handles = {},
	overload = nil,
	lastParry = nil,
	totalDamage = 0,
}
local rewarded: { [number]: { [number]: boolean } } = {}
local victoryBeaconUntil = 0
local readyAt = 0

local function now(): number
	return os.clock()
end

local function inArena(position: Vector3): boolean
	local c = ARENA.center
	local half = ARENA.size / 2
	return math.abs(position.X - c.X) <= half and math.abs(position.Z - c.Z) <= half and position.Y > c.Y - 20
end

local function rootOf(player: Player): BasePart?
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid or humanoid.Health <= 0 then
		return nil
	end
	return character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function activeParticipants(): { Player }
	local list = {}
	for _, player in encounter.participants do
		local root = player.Parent and rootOf(player)
		if root and inArena(root.Position) then
			table.insert(list, player)
		end
	end
	return list
end

local function setBarrier(closed: boolean)
	local barrier = workspace:FindFirstChild("World") and workspace.World:FindFirstChild("ArenaBarrier", true)
	if not barrier then
		return
	end
	for _, part in barrier:GetChildren() do
		if part:IsA("BasePart") then
			part.CanCollide = closed
			part.Transparency = if closed then 0.55 else 1
		end
	end
end

local function broadcastState()
	local record = encounter.record
	local overload = encounter.overload
	Net.event("BossState"):FireAllClients({
		state = encounter.state,
		name = CFG.displayName,
		title = CFG.title,
		health = record and record.health or 0,
		maxHealth = record and record.maxHealth or 1,
		phase = encounter.phase,
		phaseName = CFG.phases[encounter.phase] and CFG.phases[encounter.phase].name or "",
		exposed = now() < encounter.exposedUntil,
		opening = now() < encounter.openingUntil,
		countdownEnds = if encounter.state == "Countdown"
			then workspace:GetServerTimeNow() + math.max(0, encounter.countdownEnds - now())
			else 0,
		overload = overload and {
			progress = math.clamp(overload.damage / overload.threshold, 0, 1),
			endsAt = workspace:GetServerTimeNow() + math.max(0, overload.endsAt - now()),
		} or nil,
		participants = (function()
			local n = 0
			for _ in encounter.participants do
				n += 1
			end
			return n
		end)(),
	})
end

local function track(handle: any): any
	if handle then
		table.insert(encounter.handles, handle)
	end
	return handle
end

local function cleanupHandles()
	for _, handle in encounter.handles do
		pcall(function()
			if type(handle) == "table" and handle.destroy then
				handle:destroy()
			elseif typeof(handle) == "Instance" then
				handle:Destroy()
			end
		end)
	end
	encounter.handles = {}
end

local function valid(id: number): boolean
	return encounter.id == id and encounter.state == "Active" and encounter.record ~= nil and encounter.record.alive
end

local function stunned(): boolean
	local record = encounter.record
	return record ~= nil and now() < record.stunUntil
end

-- Waits for `seconds`; returns false if the encounter ended or the Warden was staggered.
local function windup(id: number, seconds: number, interruptible: boolean): boolean
	local finish = now() + seconds
	while now() < finish do
		task.wait(0.05)
		if not valid(id) then
			return false
		end
		if interruptible and stunned() then
			return false
		end
	end
	return true
end

local function exposeWeakPoint(seconds: number)
	local record = encounter.record
	if not record then
		return
	end
	encounter.exposedUntil = math.max(encounter.exposedUntil, now() + seconds)
	local weak = record.model:FindFirstChild("WeakPoint") :: BasePart?
	if weak then
		weak.Transparency = 0
		local light = weak:FindFirstChildOfClass("PointLight")
		if light then
			light.Brightness = 3
		end
	end
	Net.event("Effect"):FireAllClients("WeakPoint", { model = record.model, duration = seconds })
	task.delay(seconds, function()
		if encounter.record == record and now() >= encounter.exposedUntil and weak and weak.Parent then
			weak.Transparency = 0.75
			local light = weak:FindFirstChildOfClass("PointLight")
			if light then
				light.Brightness = 0
			end
		end
	end)
end

local function face(position: Vector3)
	local record = encounter.record
	if not record then
		return
	end
	local p = record.root.Position
	local flat = Vector3.new(position.X, p.Y, position.Z)
	if (flat - p).Magnitude > 0.5 then
		record.root.CFrame = CFrame.lookAt(p, flat)
	end
end

local function targetRoot(): BasePart?
	local list = activeParticipants()
	if #list == 0 then
		return nil
	end
	local t = now()
	local current = encounter.targetUserId and Players:GetPlayerByUserId(encounter.targetUserId)
	if not current or t >= encounter.retargetAt or not table.find(list, current) then
		current = list[math.random(1, #list)]
		encounter.targetUserId = current.UserId
		encounter.retargetAt = t + 6
	end
	return rootOf(current :: Player)
end

local function strike(attack: any, shape: any)
	local Combat = Registry.get("CombatService")
	local Enemy = Registry.get("EnemyService")
	Net.event("Effect"):FireAllClients("EnemyStrike", {
		shape = shape.kind,
		position = shape.center or shape.origin,
		dir = shape.dir,
		length = shape.length,
		radius = shape.radius,
		color = Color3.fromRGB(255, 70, 140),
		big = true,
	})
	Combat.enemyStrike(encounter.record, attack, shape, Enemy.newAttackKey(), attack.damage)
end

-- Attack implementations --------------------------------------------------------------------

local attacks: { [string]: (number, any, BasePart) -> () } = {}

local function standardAttack(id: number, attack: any, target: BasePart)
	local Enemy = Registry.get("EnemyService")
	local record = encounter.record
	face(target.Position)
	record.humanoid:MoveTo(record.root.Position)
	local shape = Enemy.shapeFor(record, attack, target.Position)
	local handle = track(Enemy.telegraph(shape, attack.windup, { glyph = if attack.parryable then "!" else "⚠" }))
	record.model:SetAttribute("Attacking", attack.name)
	local ok = windup(id, attack.windup, true)
	record.model:SetAttribute("Attacking", nil)
	if handle then
		handle:destroy()
	end
	if not ok then
		return
	end
	strike(attack, shape)
	if attack.exposes then
		exposeWeakPoint(attack.exposes)
	end
end

attacks.Cleave = standardAttack
attacks.Sweep = standardAttack
attacks.FractureSlam = standardAttack
attacks.RiftLance = standardAttack
attacks.Suppression = function(id, attack, target)
	local def = table.clone(attack)
	def.endsAwakening = true
	standardAttack(id, def, target)
end

attacks.Fractures = function(id, attack, _target)
	local positions = {}
	for _, player in activeParticipants() do
		local root = rootOf(player)
		if root then
			table.insert(positions, root.Position + Vector3.new(math.random(-6, 6), 0, math.random(-6, 6)))
		end
	end
	while #positions < attack.count do
		local c = ARENA.center
		table.insert(positions, c + Vector3.new(math.random(-45, 45), 0, math.random(-45, 45)))
	end
	for _, p in positions do
		track(Telegraph.circle(p, attack.radius, attack.windup, { glyph = "☠", color = Color3.fromRGB(190, 60, 255) }))
	end
	if not windup(id, attack.windup, false) then
		return
	end
	local zones = {}
	for _, p in positions do
		local zone = Telegraph.circle(p, attack.radius, attack.duration, { glyph = "☠", color = Color3.fromRGB(150, 40, 220) })
		zone.model:SetAttribute("Hazard", true)
		track(zone)
		table.insert(zones, p)
	end
	task.spawn(function()
		local ticks = math.floor(attack.duration / attack.tick)
		local Combat = Registry.get("CombatService")
		for _ = 1, ticks do
			if encounter.id ~= id or encounter.state ~= "Active" then
				return
			end
			for _, player in activeParticipants() do
				local root = rootOf(player)
				if root then
					for _, p in zones do
						if Hitbox.inCircle(root.Position, p, attack.radius, 1) then
							Combat.hazardDamage(player, attack.damage, { telegraphed = false })
							break
						end
					end
				end
			end
			task.wait(attack.tick)
		end
	end)
end

attacks.ShardVolley = function(id, attack, _target)
	local record = encounter.record
	local targets = {}
	for _, player in activeParticipants() do
		local root = rootOf(player)
		if root then
			table.insert(targets, root.Position)
		end
	end
	local c = ARENA.center
	while #targets < attack.count do
		table.insert(targets, c + Vector3.new(math.random(-40, 40), 0, math.random(-40, 40)))
	end
	for _, p in targets do
		track(Telegraph.circle(p, attack.radius, attack.windup, { glyph = "▼", color = Color3.fromRGB(255, 80, 180) }))
		Net.event("Effect"):FireAllClients("Projectile", {
			from = record.root.Position + Vector3.new(0, 14, 0),
			to = p,
			duration = attack.windup,
			color = Color3.fromRGB(255, 90, 200),
		})
	end
	if not windup(id, attack.windup, false) then
		return
	end
	local Combat = Registry.get("CombatService")
	local Enemy = Registry.get("EnemyService")
	for _, p in targets do
		local shape = { kind = "Circle", center = Vector3.new(p.X, Telegraph.groundY(p), p.Z), radius = attack.radius }
		Combat.enemyStrike(record, attack, shape, Enemy.newAttackKey(), attack.damage)
		Net.event("Effect"):FireAllClients("Nova", { position = p, radius = attack.radius, color = Color3.fromRGB(255, 90, 200) })
	end
end

attacks.RiftStep = function(id, attack, target)
	local record = encounter.record
	local offset = Vector3.new(math.random(-8, 8), 0, math.random(-8, 8))
	local destination = target.Position + offset
	local c = ARENA.center
	local half = ARENA.size / 2 - 8
	destination = Vector3.new(math.clamp(destination.X, c.X - half, c.X + half), c.Y, math.clamp(destination.Z, c.Z - half, c.Z + half))
	local handle = track(Telegraph.circle(destination, attack.radius, attack.windup, { glyph = "✦", color = Color3.fromRGB(255, 60, 160) }))
	if not windup(id, attack.windup, true) then
		if handle then
			handle:destroy()
		end
		return
	end
	Net.event("Effect"):FireAllClients("Dash", { from = record.root.Position, to = destination, color = Color3.fromRGB(255, 60, 160) })
	record.root.CFrame = CFrame.new(destination + Vector3.new(0, 9, 0)) * record.root.CFrame.Rotation
	strike(attack, { kind = "Circle", center = Vector3.new(destination.X, Telegraph.groundY(destination), destination.Z), radius = attack.radius })
end

attacks.Overload = function(id, attack, _target)
	local record = encounter.record
	local center = ARENA.center
	Net.event("Effect"):FireAllClients("Dash", { from = record.root.Position, to = center, color = Color3.fromRGB(255, 60, 160) })
	record.root.CFrame = CFrame.new(center + Vector3.new(0, 9, 0))
	local threshold = record.maxHealth * attack.interruptFraction
	encounter.overload = { damage = 0, threshold = threshold, endsAt = now() + attack.channel }
	record.model:SetAttribute("Attacking", attack.name)
	Net.event("Notify"):FireAllClients("Boss", "RESONANCE OVERLOAD: interrupt it with damage, or reach a SAFE zone!")
	local safe = {}
	for i = 1, attack.safeZones do
		local angle = (i / attack.safeZones) * math.pi * 2 + math.random()
		local p = center + Vector3.new(math.cos(angle) * 34, 0, math.sin(angle) * 34)
		table.insert(safe, p)
		track(Telegraph.safeZone(p, attack.safeRadius, attack.channel + 0.3))
	end
	local danger = track(Telegraph.circle(center, ARENA.size * 0.7, attack.channel, { glyph = "☢", color = Color3.fromRGB(255, 40, 120) }))
	local finish = now() + attack.channel
	local interrupted = false
	while now() < finish do
		task.wait(0.1)
		if not valid(id) then
			encounter.overload = nil
			return
		end
		if encounter.overload and encounter.overload.damage >= threshold then
			interrupted = true
			break
		end
	end
	encounter.overload = nil
	record.model:SetAttribute("Attacking", nil)
	if danger then
		danger:destroy()
	end
	if interrupted then
		Registry.get("EnemyService").stagger(record, attack.stunOnInterrupt, true)
		exposeWeakPoint(attack.exposeOnInterrupt)
		Net.event("Notify"):FireAllClients("Boss", "Overload interrupted! The Warden is exposed!")
		local Combat = Registry.get("CombatService")
		for _, player in activeParticipants() do
			Combat.addResonance(player, 10)
			record.mechanicsBy[player.UserId] = (record.mechanicsBy[player.UserId] or 0) + 1
		end
		return
	end
	local Combat = Registry.get("CombatService")
	local Enemy = Registry.get("EnemyService")
	local key = Enemy.newAttackKey()
	Net.event("Effect"):FireAllClients("Cataclysm", { position = center, radius = ARENA.size * 0.7, color = Color3.fromRGB(255, 40, 120) })
	for _, player in activeParticipants() do
		local root = rootOf(player)
		if root then
			local protected = false
			for _, p in safe do
				if Hitbox.inCircle(root.Position, p, attack.safeRadius, 1) then
					protected = true
				end
			end
			if not protected then
				Combat.damagePlayer(player, attack.damage, { attacker = record, attackKey = key, telegraphed = true, unblockable = true, position = center })
			end
		end
	end
end

-- Final phase -------------------------------------------------------------------------------

local function tileCenters(): { Vector3 }
	local list = {}
	local n = ARENA.tiles
	local size = ARENA.size / n
	local c = ARENA.center
	for ix = 0, n - 1 do
		for iz = 0, n - 1 do
			local x = c.X - ARENA.size / 2 + size * (ix + 0.5)
			local z = c.Z - ARENA.size / 2 + size * (iz + 0.5)
			table.insert(list, Vector3.new(x, c.Y, z))
		end
	end
	return list
end

local function finalSequence(id: number)
	local record = encounter.record
	local final = CFG.finalPhase
	local Combat = Registry.get("CombatService")
	local Enemy = Registry.get("EnemyService")
	encounter.finalActive = true
	Net.event("Effect"):FireAllClients("ArenaTransform", { active = true })
	while valid(id) do
		encounter.invulnerableUntil = math.huge
		record.root.Anchored = true
		record.root.CFrame = CFrame.new(ARENA.center + Vector3.new(0, 22, 0))
		for wave = 1, final.waves do
			if not valid(id) then
				return
			end
			local tiles = tileCenters()
			local half = (ARENA.size / ARENA.tiles) / 2
			-- shuffle and pick
			for i = #tiles, 2, -1 do
				local j = math.random(1, i)
				tiles[i], tiles[j] = tiles[j], tiles[i]
			end
			local doomed = {}
			for i = 1, math.min(final.tilesPerWave, #tiles - 2) do
				table.insert(doomed, tiles[i])
				track(Telegraph.square(tiles[i], half, final.warnTime, { glyph = "⚠" }))
			end
			Net.event("Notify"):FireAllClients("Boss", string.format("The floor fractures! (%d/%d)", wave, final.waves))
			if not windup(id, final.warnTime, false) then
				return
			end
			local key = Enemy.newAttackKey()
			for _, center in doomed do
				Net.event("Effect"):FireAllClients("TileCollapse", { position = center, half = half })
				for _, player in activeParticipants() do
					local root = rootOf(player)
					if root and Hitbox.inSquare(root.Position, center, half) then
						Combat.damagePlayer(player, final.damage, { attacker = record, attackKey = key, telegraphed = true, unblockable = true, position = center })
					end
				end
			end
			if not windup(id, 1.0, false) then
				return
			end
		end
		-- The opening
		record.root.Anchored = false
		record.root.CFrame = CFrame.new(ARENA.center + Vector3.new(0, 9, 0))
		encounter.invulnerableUntil = 0
		encounter.openingUntil = now() + final.openingTime
		Registry.get("EnemyService").stagger(record, final.openingTime, true)
		exposeWeakPoint(final.openingTime)
		Net.event("Notify"):FireAllClients("Boss", "THE CORE IS EXPOSED! Strike now!")
		Net.event("Effect"):FireAllClients("FinalOpening", { model = record.model, duration = final.openingTime })
		if not windup(id, final.openingTime, false) then
			return
		end
		encounter.openingUntil = 0
		Net.event("Notify"):FireAllClients("Boss", "The Warden pulls itself together...")
	end
end

-- Damage hooks --------------------------------------------------------------------------------

local function onDamage(record: any, amount: number, info: any): number
	local t = now()
	local player: Player? = info.player
	if t < encounter.invulnerableUntil then
		if player then
			Net.event("CombatFeedback"):FireClient(player, "Immune")
		end
		return 0
	end
	local mult = 1
	if t < encounter.openingUntil then
		mult *= CFG.finalPhase.openingMultiplier
	end
	if t < encounter.exposedUntil and info.position and Registry.get("EnemyService").isOutsideFrontArc(record, info.position, 200) then
		mult *= CFG.weakPointMultiplier
		if player then
			Registry.get("ProgressionService").discover(player, "WardenBackCrystal")
			Net.event("CombatFeedback"):FireClient(player, "WeakPoint")
			local parry = encounter.lastParry
			if parry and parry.by ~= player.UserId and t - parry.time <= 2.5 then
				encounter.lastParry = nil
				local partner = Players:GetPlayerByUserId(parry.by)
				amount += record.maxHealth * CFG.breach.damageFraction
				Registry.get("EnemyService").stagger(record, CFG.breach.stagger, true)
				record.mechanicsBy[player.UserId] = (record.mechanicsBy[player.UserId] or 0) + 1
				if partner then
					Registry.get("CoopService").reward({ player, partner }, "Breach", record.root.Position)
				end
			end
		end
	end
	amount *= mult
	if encounter.overload then
		encounter.overload.damage += amount
	end
	-- The final phase cannot be skipped: health is floored at the final threshold until the opening.
	local floor = record.maxHealth * CFG.phases[4].threshold
	if not encounter.finalActive and record.health - amount < floor then
		amount = math.max(0, record.health - floor)
	end
	encounter.totalDamage += amount
	return amount
end

local function onParried(record: any, player: Player, attack: any)
	record.mechanicsBy[player.UserId] = (record.mechanicsBy[player.UserId] or 0) + 1
	encounter.lastParry = { by = player.UserId, time = now() }
	local Enemy = Registry.get("EnemyService")
	if attack.id == "RiftLance" then
		Enemy.stagger(record, attack.parryStagger or 2.5, true)
		exposeWeakPoint(4)
		Registry.get("ProgressionService").discover(player, "WardenLanceWeakness")
		Net.event("Notify"):FireAllClients("Boss", player.DisplayName .. " turned the Rift Lance! Strike its back!")
	else
		Enemy.stagger(record, 0.6, true)
	end
end

-- Lifecycle -----------------------------------------------------------------------------------

local function reset(reason: string)
	if encounter.state ~= "Active" and encounter.state ~= "Countdown" then
		return
	end
	encounter.state = "Reset"
	encounter.finalActive = false
	encounter.overload = nil
	cleanupHandles()
	local record = encounter.record
	if record then
		Registry.get("EnemyService").despawn(record)
		encounter.record = nil
	end
	Net.event("Effect"):FireAllClients("ArenaTransform", { active = false })
	for _, player in encounter.participants do
		if player.Parent then
			Net.event("Notify"):FireClient(player, "Boss", "The Fracture Warden resets. " .. reason)
		end
	end
	setBarrier(false)
	broadcastState()
	task.delay(CFG.resetDelay, function()
		if encounter.state == "Reset" then
			encounter.state = "Dormant"
			encounter.participants = {}
			broadcastState()
		end
	end)
end

local function eligible(userId: number, record: any): boolean
	local dealt = record.damageBy[userId] or 0
	local mechanics = record.mechanicsBy[userId] or 0
	local presence = now() - encounter.startedAt
	return mechanics > 0
		or (encounter.totalDamage > 0 and dealt / encounter.totalDamage >= CFG.rewards.minimumContribution)
		or (presence >= 60 and dealt > 0)
end

local function victory(record: any)
	if encounter.state ~= "Active" then
		return
	end
	local id = encounter.id
	encounter.state = "Victory"
	encounter.finalActive = false
	cleanupHandles()
	setBarrier(false)
	Net.event("Effect"):FireAllClients("ArenaTransform", { active = false })
	Net.event("Effect"):FireAllClients("BossDefeated", { position = record.root.Position })
	victoryBeaconUntil = now() + 180
	local elapsed = math.floor(now() - encounter.startedAt)
	rewarded[id] = rewarded[id] or {}
	local Expedition = Registry.get("ExpeditionService")
	local Progression = Registry.get("ProgressionService")
	local Quest = Registry.get("QuestService")
	local PlayerData = Registry.get("PlayerDataService")
	local rewards = CFG.rewards
	for userId, player in encounter.participants do
		if player.Parent and not rewarded[id][userId] and eligible(userId, record) then
			rewarded[id][userId] = true -- set before granting: duplicate protection
			local profile = PlayerData.get(player)
			if profile then
				local items = table.clone(rewards.materials)
				local coins = rewards.coins
				local boss = profile.bosses.FractureWarden
				local firstClear = boss.clears == 0
				if firstClear then
					coins += rewards.firstClear.coins
					for item, n in rewards.firstClear.materials do
						items[item] = (items[item] or 0) + n
					end
				end
				if math.random() < rewards.fractureCoreChance then
					items.FractureCore = (items.FractureCore or 0) + 1
				end
				boss.clears += 1
				if firstClear then
					boss.firstClearAt = os.time()
				end
				if boss.bestTime == 0 or elapsed < boss.bestTime then
					boss.bestTime = elapsed
				end
				PlayerData.markDirty(player)
				Expedition.giveLoot(player, items, coins, record.root.Position, true)
				Progression.addXp(player, rewards.xp)
				Progression.addWeaponMastery(player, "Katana", rewards.mastery)
				Progression.addEssenceXp(player, profile.loadout.primary, rewards.essenceXp)
				Progression.stat(player, "bossKills")
				Progression.recordEnemy(player, "FractureWarden", true)
				Progression.achieve(player, "WardenSlayer")
				Quest.record(player, "BossDefeated", { boss = "FractureWarden" })
				Progression.present(player, "WardenDefeated", {
					title = "The Warden Falls",
					subtitle = string.format("Cleared in %s", string.format("%d:%02d", elapsed // 60, elapsed % 60)),
					body = "Rewards are in your Satchel. Extract at the Warden's Beacon to secure them!",
					color = Color3.fromRGB(255, 210, 120),
				})
				Net.event("Notify"):FireClient(player, "Boss", "Victory! Extract at the Warden's Beacon to bank your rewards.")
			end
		elseif player.Parent and not rewarded[id][userId] then
			Net.event("Notify"):FireClient(player, "Boss", "The Warden falls, but you did not contribute enough for rewards.")
		end
	end
	encounter.record = nil
	broadcastState()
	readyAt = now() + CFG.victoryCooldown
	task.delay(CFG.victoryCooldown, function()
		if encounter.state == "Victory" then
			encounter.state = "Dormant"
			encounter.participants = {}
			broadcastState()
		end
	end)
end

local function spawnWarden(count: number)
	local Enemy = Registry.get("EnemyService")
	local model = Models.warden(ARENA.center + Vector3.new(0, 0, -30))
	local maxHealth = CFG.baseHealth * (1 + CFG.healthPerExtraPlayer * (count - 1))
	local root = model.PrimaryPart :: BasePart
	local record = {
		archetype = "FractureWarden",
		def = {
			displayName = CFG.displayName,
			kind = "Boss",
			drops = {},
			xp = 0,
			coins = { 0, 0 },
			look = { accent = Color3.fromRGB(255, 70, 140), scale = 3 },
			moveSpeed = CFG.moveSpeed,
			attacks = {},
		},
		model = model,
		root = root,
		humanoid = model:FindFirstChildOfClass("Humanoid"),
		health = maxHealth,
		maxHealth = maxHealth,
		radius = 4.5,
		spawnPos = ARENA.center,
		alive = true,
		external = true,
		state = "Active",
		stateUntil = 0,
		cooldowns = {},
		guardOpenUntil = 0,
		stunUntil = 0,
		controlledUntil = 0,
		lastHitAt = 0,
		damageBy = {},
		mechanicsBy = {},
		tags = {},
		status = {},
		surged = false,
		unyielding = true,
		kind = "Boss",
		onDamage = onDamage,
		onParried = onParried,
		onDeath = victory,
	}
	model:SetAttribute("Boss", true)
	model.Parent = Enemy.folder()
	pcall(function()
		root:SetNetworkOwner(nil)
	end)
	Enemy.registerExternal(record)
	model:SetAttribute("Health", maxHealth)
	model:SetAttribute("MaxHealth", maxHealth)
	return record
end

local function begin()
	local list = {}
	for _, player in Players:GetPlayers() do
		local root = rootOf(player)
		if root and inArena(root.Position) then
			table.insert(list, player)
		end
	end
	if #list == 0 then
		encounter.state = "Dormant"
		broadcastState()
		return
	end
	encounter.participants = {}
	for _, player in list do
		encounter.participants[player.UserId] = player
	end
	encounter.state = "Active"
	encounter.startedAt = now()
	encounter.phase = 1
	encounter.invulnerableUntil = now() + 2.5
	encounter.finalActive = false
	encounter.openingUntil = 0
	encounter.exposedUntil = 0
	encounter.nextAttackAt = now() + 3
	encounter.busy = false
	encounter.cooldowns = {}
	encounter.lastParry = nil
	encounter.totalDamage = 0
	encounter.record = spawnWarden(#list)
	setBarrier(true)
	for _, player in list do
		Registry.get("ProgressionService").recordEnemy(player, "FractureWarden", false)
		Net.event("Present"):FireClient(player, "BossIntro", {
			title = CFG.displayName,
			subtitle = CFG.title,
			body = CFG.lore,
			color = Color3.fromRGB(255, 70, 140),
			always = true,
		})
	end
	Net.event("Effect"):FireAllClients("BossIntro", { model = encounter.record.model })
	broadcastState()
end

function BossService.trigger(player: Player): (boolean, string?)
	if encounter.state == "Countdown" then
		return false, "The seal is already breaking."
	end
	if encounter.state ~= "Dormant" then
		return false, "The arena is not ready."
	end
	if now() < readyAt then
		return false, "The Warden is reforming. Try again soon."
	end
	encounter.id += 1
	encounter.state = "Countdown"
	encounter.countdownEnds = now() + CFG.countdown
	encounter.participants = {}
	Net.event("Notify"):FireAllClients("Boss", player.DisplayName .. " broke the Fracture Seal! The arena locks in " .. CFG.countdown .. "s.")
	broadcastState()
	local id = encounter.id
	task.delay(CFG.countdown, function()
		if encounter.id == id and encounter.state == "Countdown" then
			begin()
		end
	end)
	return true, nil
end

local function phaseFor(fraction: number): number
	local phase = 1
	for _, p in CFG.phases do
		if fraction <= p.threshold then
			phase = p.id
		end
	end
	return phase
end

local function chooseAttack(target: BasePart): string?
	local record = encounter.record
	local options = CFG.phaseAttacks[math.min(encounter.phase, 3)]
	local distance = (Vector3.new(target.Position.X, 0, target.Position.Z) - Vector3.new(record.root.Position.X, 0, record.root.Position.Z)).Magnitude
	local candidates = {}
	local t = now()
	for _, id in options do
		local attack = CFG.attacks[id]
		if t >= (encounter.cooldowns[id] or 0) then
			local inRange = true
			if id == "Cleave" then
				inRange = distance <= 16
			elseif id == "Sweep" or id == "Suppression" then
				inRange = distance <= (attack.radius or 15)
			elseif id == "RiftLance" then
				inRange = distance <= 26
			end
			if inRange then
				table.insert(candidates, id)
			end
		end
	end
	if #candidates == 0 then
		return nil
	end
	return candidates[math.random(1, #candidates)]
end

local function tick()
	if encounter.state ~= "Active" then
		return
	end
	local record = encounter.record
	if not record or not record.alive then
		return
	end
	if #activeParticipants() == 0 then
		reset("Every challenger has fallen or left.")
		return
	end
	-- phase transitions
	local fraction = record.health / record.maxHealth
	local phase = phaseFor(fraction)
	if phase > encounter.phase then
		encounter.phase = phase
		encounter.invulnerableUntil = math.max(encounter.invulnerableUntil, now() + 2.5)
		local info = CFG.phases[phase]
		Net.event("Effect"):FireAllClients("BossPhase", { phase = phase, name = info.name, model = record.model })
		Net.event("Notify"):FireAllClients("BossPhase", string.format("Phase %d: %s", phase, info.name))
		if phase == 3 then
			record.humanoid.WalkSpeed = CFG.enrageMoveSpeed
		end
		if phase == 4 then
			local id = encounter.id
			encounter.busy = true
			task.spawn(function()
				finalSequence(id)
			end)
			return
		end
	end
	if encounter.finalActive or encounter.busy or stunned() then
		return
	end
	local target = targetRoot()
	if not target then
		return
	end
	local t = now()
	if t >= encounter.nextAttackAt then
		local attackId = chooseAttack(target)
		if attackId then
			local attack = CFG.attacks[attackId]
			encounter.cooldowns[attackId] = t + attack.cooldown
			encounter.busy = true
			local id = encounter.id
			task.spawn(function()
				local ok, err = pcall(attacks[attackId], id, attack, target)
				if not ok then
					warn("[Boss] attack " .. attackId .. " failed: " .. tostring(err))
				end
				if encounter.id == id then
					encounter.busy = false
					encounter.nextAttackAt = now() + CFG.attackGap[math.min(encounter.phase, 3)]
				end
			end)
			return
		end
	end
	-- approach
	local flat = Vector3.new(target.Position.X - record.root.Position.X, 0, target.Position.Z - record.root.Position.Z)
	if flat.Magnitude > 11 then
		record.humanoid:MoveTo(target.Position - flat.Unit * 9)
	else
		record.humanoid:MoveTo(record.root.Position)
		face(target.Position)
	end
end

-- Called by CombatService after every player hit (cheap for non-boss records).
function BossService.onPlayerHit(_player: Player, _record: any, _result: any)
	-- Contribution is tracked in record.damageBy / mechanicsBy; hook kept for future boss logic.
end

function BossService.victoryBeaconOpen(): boolean
	return now() < victoryBeaconUntil
end

function BossService.Init() end

function BossService.Start()
	-- Seal prompt
	local world = workspace:WaitForChild("World")
	local seal = world:FindFirstChild("WardenSeal", true)
	local prompt = seal and seal:FindFirstChildWhichIsA("ProximityPrompt", true)
	if prompt then
		prompt.Triggered:Connect(function(player)
			if not Registry.get("SecurityService").allow(player, "Interact") then
				return
			end
			local ok, message = BossService.trigger(player)
			if not ok and message then
				Net.event("Notify"):FireClient(player, "Error", message)
			end
		end)
	end
	local retreat = world:FindFirstChild("ArenaRetreat", true)
	local retreatPrompt = retreat and retreat:FindFirstChildWhichIsA("ProximityPrompt", true)
	if retreatPrompt then
		retreatPrompt.Triggered:Connect(function(player)
			Registry.get("ExpeditionService").teleport(player, WorldConfig.Points.CampArrival)
			Net.event("Notify"):FireClient(player, "Info", "You retreat to the camp. Your Satchel is safe for now.")
		end)
	end

	local Requests = Registry.get("RequestService")
	Requests.on("WardenShortcut", "Request", function(player, _args)
		local profile = Registry.get("PlayerDataService").get(player)
		if profile.bosses.FractureWarden.clears < 1 then
			return false, "Defeat the Warden once to unlock the shortcut."
		end
		if not Registry.get("SecurityService").within(player, WorldConfig.Points.BossGate, 25) then
			return false, "Use the Warden Gate in the Nexus."
		end
		Registry.get("ExpeditionService").teleport(player, WorldConfig.Points.WardenAntechamber)
		return true, "You step through the Warden Gate."
	end)

	local accumulator, broadcastAccumulator = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		broadcastAccumulator += dt
		if accumulator >= 0.1 then
			accumulator = 0
			local ok, err = pcall(tick)
			if not ok then
				warn("[Boss] tick error: " .. tostring(err))
			end
		end
		if broadcastAccumulator >= 0.25 and (encounter.state == "Active" or encounter.state == "Countdown") then
			broadcastAccumulator = 0
			broadcastState()
		end
	end)
	Players.PlayerAdded:Connect(function(player)
		task.delay(3, function()
			if player.Parent then
				broadcastState()
			end
		end)
	end)
end

return BossService
