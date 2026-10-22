--!strict
-- Reusable enemy framework: spawning, a data-driven state machine (Idle -> Chase -> Windup ->
-- Recover/Retreat -> ... / Return when leashed), statuses, guard/stagger rules, damage intake,
-- defeat rewards and respawns. Archetype differences come from EnemyConfig + behaviour hooks.
-- The Fracture Warden registers here as an "external" record so player attacks treat it uniformly.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local EnemyConfig = require(Shared.Config.EnemyConfig)
local WorldConfig = require(Shared.Config.WorldConfig)
local GameConfig = require(Shared.Config.GameConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)
local Telegraph = require(script.Parent.Parent.Combat.Telegraph)
local Hitbox = require(script.Parent.Parent.Combat.Hitbox)
local Models = require(script.Parent.Parent.World.Models)

local EnemyService = {}

export type Record = {
	id: number,
	archetype: string,
	def: any,
	model: Model,
	root: BasePart,
	humanoid: Humanoid?,
	health: number,
	maxHealth: number,
	radius: number,
	spawnPos: Vector3,
	spawner: any?,
	alive: boolean,
	external: boolean,
	state: string,
	stateUntil: number,
	target: Player?,
	cooldowns: { [string]: number },
	pending: any?,
	guardOpenUntil: number,
	stunUntil: number,
	controlledUntil: number,
	lastHitAt: number,
	damageBy: { [number]: number },
	mechanicsBy: { [number]: number },
	tags: { [number]: { essence: string, time: number, cast: number } },
	status: { [string]: any },
	surged: boolean,
	ownerUserId: number?,
	onDamage: ((Record, number, any) -> number)?,
	onDeath: ((Record) -> ())?,
	unyielding: boolean,
	kind: string,
}

local records: { [number]: Record } = {}
local byModel: { [Model]: Record } = {}
local nextId = 0
local folder: Folder
local surgeActive = false
local attackCounter = 0

function EnemyService.Init()
	folder = Instance.new("Folder")
	folder.Name = "Enemies"
	folder.Parent = workspace
end

function EnemyService.folder(): Folder
	return folder
end

local function now(): number
	return os.clock()
end

local function updateBar(record: Record)
	local bar = record.model:FindFirstChild("HealthBar")
	local fill = bar and bar:FindFirstChild("Back") and (bar :: any).Back:FindFirstChild("Fill")
	if fill then
		fill.Size = UDim2.fromScale(math.clamp(record.health / record.maxHealth, 0, 1), 1)
	end
	record.model:SetAttribute("Health", record.health)
	record.model:SetAttribute("MaxHealth", record.maxHealth)
end

local function planar(a: Vector3, b: Vector3): number
	return Vector3.new(a.X - b.X, 0, a.Z - b.Z).Magnitude
end

function EnemyService.spawn(archetype: string, position: Vector3, opts: any?): Record?
	local def = EnemyConfig.Enemies[archetype]
	if not def then
		warn("[Enemy] unknown archetype " .. archetype)
		return nil
	end
	local o = opts or {}
	local model = Models.enemy(def, position)
	nextId += 1
	local maxHealth = def.maxHealth
	local surged = surgeActive and def.kind == "Standard" and position.X > 500
	if surged then
		maxHealth *= EnemyConfig.Surge.healthMult
	end
	local root = model.PrimaryPart :: BasePart
	local record: Record = {
		id = nextId,
		archetype = archetype,
		def = def,
		model = model,
		root = root,
		humanoid = model:FindFirstChildOfClass("Humanoid"),
		health = maxHealth,
		maxHealth = maxHealth,
		radius = 1.5 * def.look.scale,
		spawnPos = position,
		spawner = o.spawner,
		alive = true,
		external = false,
		state = "Idle",
		stateUntil = 0,
		target = nil,
		cooldowns = {},
		pending = nil,
		guardOpenUntil = 0,
		stunUntil = 0,
		controlledUntil = 0,
		lastHitAt = 0,
		damageBy = {},
		mechanicsBy = {},
		tags = {},
		status = {},
		surged = surged,
		ownerUserId = o.ownerUserId,
		onDamage = nil,
		onDeath = o.onDeath,
		unyielding = def.unyielding == true,
		kind = def.kind,
	}
	model:SetAttribute("EnemyId", record.id)
	model:SetAttribute("Archetype", archetype)
	model:SetAttribute("Kind", def.kind)
	if surged then
		model:SetAttribute("Surged", true)
	end
	model.Parent = folder
	pcall(function()
		root:SetNetworkOwner(nil) -- server-owned physics: clients cannot move enemies
	end)
	records[record.id] = record
	byModel[model] = record
	updateBar(record)
	return record
end

function EnemyService.registerExternal(record: Record)
	nextId += 1
	record.id = nextId
	record.external = true
	records[record.id] = record
	byModel[record.model] = record
	record.model:SetAttribute("EnemyId", record.id)
end

function EnemyService.unregister(record: Record)
	records[record.id] = nil
	byModel[record.model] = nil
end

function EnemyService.fromModel(model: Instance?): Record?
	while model and model ~= workspace do
		if model:IsA("Model") and byModel[model :: Model] then
			return byModel[model :: Model]
		end
		model = model.Parent
	end
	return nil
end

function EnemyService.all(): { Record }
	local list = {}
	for _, record in records do
		if record.alive then
			table.insert(list, record)
		end
	end
	return list
end

-- Returns alive records whose root satisfies the predicate (position, radius) -> boolean.
function EnemyService.query(predicate: (Vector3, number) -> boolean, max: number?): { Record }
	local list = {}
	for _, record in records do
		if record.alive and record.root.Parent and predicate(record.root.Position, record.radius) then
			table.insert(list, record)
			if max and #list >= max then
				break
			end
		end
	end
	return list
end

local function cancelPending(record: Record)
	if record.pending then
		if record.pending.telegraph then
			record.pending.telegraph:destroy()
		end
		record.pending = nil
	end
	if record.state == "Windup" then
		record.state = "Recover"
		record.stateUntil = now() + 0.3
	end
end

-- Stagger. Returns true if it interrupted a windup.
function EnemyService.stagger(record: Record, seconds: number, force: boolean?): boolean
	if not record.alive or seconds <= 0 then
		return false
	end
	if record.unyielding and not force then
		return false
	end
	local interrupted = record.state == "Windup"
	cancelPending(record)
	record.stunUntil = math.max(record.stunUntil, now() + seconds)
	record.model:SetAttribute("StaggeredUntil", workspace:GetServerTimeNow() + seconds)
	if record.humanoid then
		record.humanoid:MoveTo(record.root.Position)
	end
	return interrupted
end

function EnemyService.openGuard(record: Record, seconds: number)
	record.guardOpenUntil = math.max(record.guardOpenUntil, now() + seconds)
	record.model:SetAttribute("GuardOpenUntil", workspace:GetServerTimeNow() + seconds)
end

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include

-- Moves an enemy toward a point over `duration` (pulls, knockbacks). Server-owned, wall-aware.
function EnemyService.displace(record: Record, target: Vector3, duration: number)
	if not record.alive or record.unyielding or record.external or record.def.moveSpeed == 0 then
		return
	end
	record.controlledUntil = now() + duration
	cancelPending(record)
	local start = record.root.Position
	local goal = Vector3.new(target.X, start.Y, target.Z)
	local world = workspace:FindFirstChild("World")
	if world then
		rayParams.FilterDescendantsInstances = { world, workspace.Terrain }
		local delta = goal - start
		if delta.Magnitude > 0.1 then
			local hit = workspace:Raycast(start, delta, rayParams)
			if hit then
				goal = hit.Position - delta.Unit * (record.radius + 1)
				goal = Vector3.new(goal.X, start.Y, goal.Z)
			end
		end
	end
	task.spawn(function()
		local steps = math.max(3, math.floor(duration / 0.05))
		for i = 1, steps do
			if not record.alive or not record.root.Parent then
				return
			end
			local current = record.root.CFrame
			local p = start:Lerp(goal, i / steps)
			record.root.CFrame = CFrame.new(Vector3.new(p.X, current.Position.Y, p.Z)) * current.Rotation
			task.wait(duration / steps)
		end
	end)
end

function EnemyService.applyStatus(record: Record, name: string, data: any)
	if not record.alive then
		return
	end
	data.time = now()
	record.status[name] = data
	record.model:SetAttribute(name, true)
end

function EnemyService.hasStatus(record: Record, name: string): any?
	local status = record.status[name]
	if status and status.expires > now() then
		return status
	end
	return nil
end

local function isBehind(record: Record, position: Vector3, arcDegrees: number): boolean
	local look = record.root.CFrame.LookVector
	local toAttacker = Vector3.new(position.X - record.root.Position.X, 0, position.Z - record.root.Position.Z)
	if toAttacker.Magnitude < 0.1 then
		return false
	end
	local dot = Vector3.new(look.X, 0, look.Z).Unit:Dot(toAttacker.Unit)
	return dot < math.cos(math.rad(arcDegrees / 2))
end
EnemyService.isOutsideFrontArc = isBehind

-- Damage intake. info = { player?, position?, guardBreak?, stagger?, kind, forceStagger?, mechanic? }
-- Returns { dealt, killed, guarded, interrupted }
function EnemyService.damage(record: Record, amount: number, info: any): any
	local result = { dealt = 0, killed = false, guarded = false, interrupted = false }
	if not record.alive or amount <= 0 or amount ~= amount then
		return result
	end
	local player: Player? = info.player
	if record.ownerUserId and (not player or player.UserId ~= record.ownerUserId) then
		return result -- trial champions only take damage from their challenger
	end
	local t = now()
	local def = record.def

	if def.guard and t >= record.guardOpenUntil and info.position and record.stunUntil < t then
		if not isBehind(record, info.position, def.guard.arc) then
			if info.guardBreak then
				EnemyService.openGuard(record, 1.4)
				result.interrupted = EnemyService.stagger(record, 0.8, true)
				Net.event("Effect"):FireAllClients("GuardBreak", { position = record.root.Position })
			elseif info.kind == "Weapon" then
				amount *= 1 - def.guard.frontalReduction
				result.guarded = true
			end
		end
	end

	if record.onDamage then
		amount = record.onDamage(record, amount, info)
		if amount <= 0 then
			return result
		end
	end

	-- Static Charge / Event Pressure mastery bonuses are applied by CombatService before this call.
	amount = math.min(amount, record.health)
	record.health -= amount
	record.lastHitAt = t
	result.dealt = amount
	if player then
		record.damageBy[player.UserId] = (record.damageBy[player.UserId] or 0) + amount
	end
	updateBar(record)

	if info.stagger and info.stagger > 0 and record.health > 0 then
		if EnemyService.stagger(record, info.stagger, info.forceStagger) then
			result.interrupted = true
		end
	end

	if record.health <= 0 then
		if def.regen then
			record.health = record.maxHealth -- training targets never die
			updateBar(record)
		else
			result.killed = true
			EnemyService.kill(record, player)
		end
	end
	return result
end

local function contributors(record: Record): { Player }
	local list = {}
	for userId, dealt in record.damageBy do
		local player = Players:GetPlayerByUserId(userId)
		if player and dealt > 0 then
			table.insert(list, player)
		end
	end
	for userId in record.mechanicsBy do
		local player = Players:GetPlayerByUserId(userId)
		if player and not table.find(list, player) then
			table.insert(list, player)
		end
	end
	return list
end
EnemyService.contributors = contributors

function EnemyService.kill(record: Record, killer: Player?)
	if not record.alive then
		return
	end
	record.alive = false
	record.state = "Dead"
	cancelPending(record)
	local def = record.def
	local position = record.root.Position

	if not record.external then
		local Progression = Registry.get("ProgressionService")
		local Quest = Registry.get("QuestService")
		local Expedition = Registry.get("ExpeditionService")
		local Party = Registry.get("PartyService")
		local credited: { [Player]: boolean } = {}
		for _, player in contributors(record) do
			credited[player] = true
			Progression.addXp(player, math.floor(def.xp * (if record.surged then 1.2 else 1)))
			Progression.recordEnemy(player, record.archetype, true)
			Progression.stat(player, "kills")
			Quest.record(player, "Kill", { archetype = record.archetype, kind = def.kind })
			-- Individual loot per contributor: no loot stealing between players.
			local items = {}
			for _, drop in def.drops do
				if math.random() <= drop.chance then
					items[drop.item] = (items[drop.item] or 0) + math.random(drop.min, drop.max)
				end
			end
			if record.surged then
				local extra = EnemyConfig.Surge.extraDrop
				if math.random() <= extra.chance then
					items[extra.item] = (items[extra.item] or 0) + math.random(extra.min, extra.max)
				end
			end
			local coins = if def.coins[2] > 0 then math.random(def.coins[1], def.coins[2]) else 0
			Expedition.giveLoot(player, items, coins, position)
			if def.kind == "Champion" then
				Progression.present(player, "Champion_" .. record.archetype, {
					title = def.displayName .. " Defeated",
					subtitle = "Champion",
					body = def.lore,
					color = def.look.accent,
				})
			end
		end
		-- Party members nearby share kill credit for contracts (not loot or XP).
		for player in table.clone(credited) do
			for _, member in Party.membersNear(player, position, GameConfig.Party.SharedCreditRadius) do
				if not credited[member] then
					credited[member] = true
					Quest.record(member, "Kill", { archetype = record.archetype, kind = def.kind })
				end
			end
		end
		-- Burn spread (Ember mastery 3) is handled by CombatService via this hook.
		Registry.get("CombatService").onEnemyKilled(record, killer)
	end

	if record.onDeath then
		task.spawn(record.onDeath, record)
	end

	Net.event("Effect"):FireAllClients("EnemyDeath", { model = record.model, position = position })
	local model = record.model
	task.delay(1.0, function()
		byModel[model] = nil
		records[record.id] = nil
		if model.Parent then
			model:Destroy()
		end
	end)

	local spawner = record.spawner
	if spawner and spawner.respawn and spawner.respawn > 0 then
		task.delay(spawner.respawn, function()
			EnemyService.spawn(spawner.archetype, spawner.position, { spawner = spawner })
		end)
	end
end

function EnemyService.despawn(record: Record)
	record.alive = false
	cancelPending(record)
	byModel[record.model] = nil
	records[record.id] = nil
	if record.model.Parent then
		record.model:Destroy()
	end
end

function EnemyService.setSurge(active: boolean)
	surgeActive = active
	if active then
		for _, record in records do
			if record.alive and not record.external and record.kind == "Standard" and record.spawnPos.X > 500 and not record.surged then
				record.surged = true
				record.maxHealth *= EnemyConfig.Surge.healthMult
				record.health *= EnemyConfig.Surge.healthMult
				record.model:SetAttribute("Surged", true)
				updateBar(record)
			end
		end
	end
end

-- AI ---------------------------------------------------------------------------------------

local function validTarget(record: Record, player: Player?): boolean
	if not player or not player.Parent then
		return false
	end
	if record.ownerUserId and player.UserId ~= record.ownerUserId then
		return false
	end
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not humanoid or not root or humanoid.Health <= 0 then
		return false
	end
	if math.abs(root.Position.Y - record.root.Position.Y) > 30 then
		return false
	end
	if record.kind ~= "Training" and not record.ownerUserId then
		local region = WorldConfig.regionAt(root.Position)
		if not region or region.safe then
			return false
		end
	end
	return planar(root.Position, record.root.Position) <= math.max(record.def.aggroRange * 1.6, 20)
end

local function acquire(record: Record): Player?
	local best, bestDistance = nil, record.def.aggroRange
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			local d = planar(root.Position, record.root.Position)
			if d <= bestDistance and validTarget(record, player) then
				best, bestDistance = player, d
			end
		end
	end
	return best
end

local function face(record: Record, position: Vector3)
	local p = record.root.Position
	local flat = Vector3.new(position.X, p.Y, position.Z)
	if (flat - p).Magnitude > 0.1 then
		record.root.CFrame = CFrame.lookAt(p, flat)
	end
end

local function shapeFor(record: Record, attack: any, targetPos: Vector3?): any
	local p = record.root.Position
	local ground = Vector3.new(p.X, Telegraph.groundY(p), p.Z)
	local look = record.root.CFrame.LookVector
	local dir = Vector3.new(look.X, 0, look.Z).Unit
	if attack.shape == "Line" then
		return { kind = "Line", origin = ground, dir = dir, length = attack.length, width = attack.width }
	elseif attack.shape == "Circle" then
		return { kind = "Circle", center = ground, radius = attack.radius }
	elseif attack.shape == "CircleAtTarget" then
		local c = targetPos or ground
		return { kind = "Circle", center = Vector3.new(c.X, ground.Y, c.Z), radius = attack.radius }
	elseif attack.shape == "Ring" then
		return { kind = "Ring", center = ground, inner = attack.inner, radius = attack.radius }
	end
	return nil
end
EnemyService.shapeFor = shapeFor

function EnemyService.telegraph(shape: any, duration: number, opts: any?): any
	if shape.kind == "Line" then
		return Telegraph.line(shape.origin, shape.dir, shape.length, shape.width, duration, opts)
	elseif shape.kind == "Circle" then
		return Telegraph.circle(shape.center, shape.radius, duration, opts)
	elseif shape.kind == "Ring" then
		return Telegraph.ring(shape.center, shape.inner, shape.radius, duration, opts)
	end
	return nil
end

function EnemyService.shapeContains(shape: any, position: Vector3, padding: number?): boolean
	if shape.kind == "Line" then
		return Hitbox.inLine(position, shape.origin, shape.dir, shape.length, shape.width, padding)
	elseif shape.kind == "Circle" then
		return Hitbox.inCircle(position, shape.center, shape.radius, padding)
	elseif shape.kind == "Ring" then
		return Hitbox.inRing(position, shape.center, shape.inner, shape.radius, padding)
	end
	return false
end

function EnemyService.newAttackKey(): string
	attackCounter += 1
	return "atk" .. attackCounter
end

local function startWindup(record: Record, attack: any, targetRoot: BasePart, repeatIndex: number)
	face(record, targetRoot.Position)
	if record.humanoid then
		record.humanoid:MoveTo(record.root.Position)
	end
	local shape = shapeFor(record, attack, targetRoot.Position)
	if not shape then
		return
	end
	local t = now()
	record.state = "Windup"
	record.stateUntil = t + attack.windup
	record.pending = {
		attack = attack,
		shape = shape,
		key = EnemyService.newAttackKey(),
		repeatIndex = repeatIndex,
		telegraph = EnemyService.telegraph(shape, attack.windup, { glyph = if attack.parryable then "!" else "⚠" }),
	}
	record.model:SetAttribute("Attacking", attack.name)
end

local function resolve(record: Record)
	local pending = record.pending
	record.pending = nil
	record.model:SetAttribute("Attacking", nil)
	if not pending or not record.alive then
		return
	end
	if pending.telegraph then
		pending.telegraph:destroy()
	end
	local attack = pending.attack
	local shape = pending.shape
	local t = now()
	if attack.dash and shape.kind == "Line" then
		local goal = shape.origin + shape.dir * (shape.length - 2)
		local saved = record.unyielding
		record.unyielding = false
		EnemyService.displace(record, goal, 0.25)
		record.unyielding = saved
	end
	local damage = attack.damage * (if record.surged then EnemyConfig.Surge.damageMult else 1)
	Net.event("Effect"):FireAllClients("EnemyStrike", {
		shape = shape.kind,
		position = shape.center or shape.origin,
		dir = shape.dir,
		length = shape.length,
		radius = shape.radius,
		color = record.def.look.accent,
	})
	Registry.get("CombatService").enemyStrike(record, attack, shape, pending.key, damage)
	if not record.alive then
		return
	end
	record.cooldowns[attack.id] = t + attack.cooldown
	if attack.repeats and pending.repeatIndex < attack.repeats and record.target then
		local root = record.target.Character and record.target.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			startWindup(record, attack, root, pending.repeatIndex + 1)
			return
		end
	end
	if attack.opensGuard and record.def.punishWindow then
		EnemyService.openGuard(record, record.def.punishWindow)
		record.state = "Recover"
		record.stateUntil = t + record.def.punishWindow
	elseif record.def.behaviour == "Stalker" then
		record.state = "Retreat"
		record.stateUntil = t + (record.def.retreatTime or 1)
	else
		record.state = "Recover"
		record.stateUntil = t + 0.6
	end
end

-- Called by CombatService when a player perfect-parries this enemy's attack.
function EnemyService.onParried(record: Record, player: Player)
	if not record.alive then
		return
	end
	record.mechanicsBy[player.UserId] = (record.mechanicsBy[player.UserId] or 0) + 1
	EnemyService.stagger(record, if record.unyielding then 1.0 else 1.6, true)
	EnemyService.openGuard(record, 1.6)
end

local function tick(record: Record, t: number)
	local def = record.def
	local humanoid = record.humanoid
	if not humanoid then
		return
	end
	if def.regen and t - record.lastHitAt > 4 and record.health < record.maxHealth then
		record.health = record.maxHealth
		updateBar(record)
	end
	if t < record.controlledUntil or t < record.stunUntil then
		return
	end
	if record.state == "Windup" then
		if t >= record.stateUntil then
			resolve(record)
		end
		return
	end
	if record.state == "Recover" or record.state == "Retreat" then
		if t < record.stateUntil then
			if record.state == "Retreat" and record.target then
				local tr = record.target.Character and record.target.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
				if tr then
					local away = record.root.Position - tr.Position
					away = Vector3.new(away.X, 0, away.Z)
					if away.Magnitude > 0.1 then
						humanoid.WalkSpeed = def.moveSpeed
						humanoid:MoveTo(record.root.Position + away.Unit * 10)
					end
				end
			end
			return
		end
		record.state = "Chase"
	end
	if record.state == "Return" then
		humanoid.WalkSpeed = def.moveSpeed * 1.4
		humanoid:MoveTo(record.spawnPos)
		if planar(record.root.Position, record.spawnPos) < 5 then
			record.state = "Idle"
			record.health = record.maxHealth
			record.damageBy = {}
			record.mechanicsBy = {}
			updateBar(record)
		end
		return
	end

	if not validTarget(record, record.target) then
		record.target = acquire(record)
	end
	local target = record.target
	if not target then
		record.state = "Idle"
		if def.moveSpeed > 0 and planar(record.root.Position, record.spawnPos) > 4 then
			humanoid.WalkSpeed = def.moveSpeed * 0.6
			humanoid:MoveTo(record.spawnPos)
		end
		return
	end
	if def.leashRange > 0 and planar(record.root.Position, record.spawnPos) > def.leashRange then
		record.state = "Return"
		record.target = nil
		return
	end
	local targetRoot = target.Character and target.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not targetRoot then
		return
	end
	local distance = planar(targetRoot.Position, record.root.Position)
	for _, attack in def.attacks do
		if t >= (record.cooldowns[attack.id] or 0) and distance <= attack.triggerRange and distance >= (attack.minRange or 0) then
			startWindup(record, attack, targetRoot, 1)
			return
		end
	end
	record.state = "Chase"
	if def.moveSpeed > 0 then
		local slow = EnemyService.hasStatus(record, "Slowed")
		humanoid.WalkSpeed = def.moveSpeed * (if slow then slow.mult else 1)
		local goal = targetRoot.Position
		local toward = Vector3.new(goal.X - record.root.Position.X, 0, goal.Z - record.root.Position.Z)
		if toward.Magnitude > 3 then
			humanoid:MoveTo(goal - toward.Unit * 2.5)
		else
			humanoid:MoveTo(record.root.Position)
			face(record, goal)
		end
	elseif distance < 40 then
		face(record, targetRoot.Position)
	end
end

local function anyPlayerNear(position: Vector3, range: number): boolean
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root and (root.Position - position).Magnitude <= range then
			return true
		end
	end
	return false
end

local function statusTick()
	local t = now()
	local Combat = Registry.get("CombatService")
	for _, record in records do
		if record.alive then
			for name, status in record.status do
				if status.expires <= t then
					record.status[name] = nil
					record.model:SetAttribute(name, nil)
				elseif name == "Burning" then
					local source = status.by and Players:GetPlayerByUserId(status.by)
					Combat.statusDamage(record, status.dps * 0.5, source, "Burn")
				end
			end
		end
	end
end

function EnemyService.Start()
	for _, spawner in WorldConfig.Spawners do
		EnemyService.spawn(spawner.archetype, spawner.position, { spawner = spawner })
	end
	local accumulator, statusAccumulator = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		statusAccumulator += dt
		if accumulator >= 0.1 then
			accumulator = 0
			local t = now()
			for _, record in records do
				if record.alive and not record.external and record.root.Parent then
					if record.state == "Windup" or anyPlayerNear(record.root.Position, 180) then
						local ok, err = pcall(tick, record, t)
						if not ok then
							warn("[Enemy] tick error: " .. tostring(err))
						end
					end
				end
			end
		end
		if statusAccumulator >= 0.5 then
			statusAccumulator = 0
			statusTick()
		end
	end)
end

return EnemyService
