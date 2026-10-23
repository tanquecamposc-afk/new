--!strict
-- Authoritative combat pipeline:
--   input request -> validation (rate, state, cooldown, ownership) -> attack state ->
--   delayed hit resolution (server geometry + line of sight) -> damage -> reactions/effects ->
--   progression (resonance, mastery, quests).
-- Clients only REQUEST actions; damage, targets, parries, cooldowns and rewards are decided here.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local GameConfig = require(Config.GameConfig)
local EssenceConfig = require(Config.EssenceConfig)
local FusionConfig = require(Config.FusionConfig)
local AwakeningConfig = require(Config.AwakeningConfig)
local CombatMath = require(Shared.Combat.CombatMath)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)
local Abilities = require(script.Parent.Parent.Combat.Abilities)

local CombatService = {}

local CFG = GameConfig.Combat
local PCFG = GameConfig.Player

type PState = {
	character: Model,
	humanoid: Humanoid,
	root: BasePart,
	build: any,
	busyUntil: number,
	actionStart: number,
	comboIndex: number,
	lastLightAt: number,
	blocking: boolean,
	blockStart: number,
	lastBlockStart: number,
	parryEligible: boolean,
	iframesUntil: number,
	dodgeReadyAt: number,
	stunUntil: number,
	stamina: number,
	lastStaminaUse: number,
	resonance: number,
	awakenedUntil: number,
	awakenForm: string?,
	signatureUsed: boolean,
	burnoutUntil: number,
	shieldUntil: number,
	shieldAmount: number,
	burnUntil: number,
	burnDps: number,
	evaded: { [string]: boolean },
	parried: { [string]: boolean },
	tonicReadyAt: number,
	healTicks: number,
	bookClearedAt: number,
	swingSerial: number,
	castSerial: number,
	aura: { Instance },
	combo: number,
	comboExpires: number,
	cancelAfter: number,
	flowUntil: number,
}

local states: { [Player]: PState } = {}
local cooldowns: { [Player]: { [string]: number } } = {}

local function now(): number
	return os.clock()
end

local function profileOf(player: Player): any
	return Registry.get("PlayerDataService").get(player)
end

local function feedback(player: Player, kind: string, data: any?)
	Net.event("CombatFeedback"):FireClient(player, kind, data)
end

local function setAttr(player: Player, key: string, value: any)
	player:SetAttribute(key, value)
end

-- Build ------------------------------------------------------------------------------------

function CombatService.buildFor(player: Player): any
	local profile = profileOf(player)
	local state = if profile then profile.weapons.Katana else { mastery = 1, upgrade = 1, temper = "None", evolution = "None" }
	return CombatMath.weaponBuild("Katana", state)
end

local function trailColorFor(player: Player, build: any): Color3
	local profile = profileOf(player)
	local cosmetics = require(Config.ProgressionConfig).Cosmetics
	if profile then
		local chosen = cosmetics[profile.cosmetics.trail]
		if chosen and chosen.color and profile.cosmetics.owned[chosen.id] then
			return chosen.color
		end
	end
	return build.trailColor
end

function CombatService.refresh(player: Player)
	local ps = states[player]
	if not ps then
		return
	end
	ps.build = CombatService.buildFor(player)
	local katana = ps.character:FindFirstChild("Katana")
	local color = trailColorFor(player, ps.build)
	if katana then
		for _, part in katana:GetChildren() do
			if part:IsA("BasePart") and part.Name:sub(1, 4) == "Edge" then
				part.Color = color
			end
		end
		local blade = katana:FindFirstChild("Blade")
		local trail = blade and blade:FindFirstChild("SwingTrail") :: Trail?
		if trail then
			trail.Color = ColorSequence.new(color)
		end
	end
	setAttr(player, "TrailColor", color)
	setAttr(player, "ComboLength", #ps.build.light)
	setAttr(player, "Evolution", ps.build.evolution)
end

-- Character lifecycle ----------------------------------------------------------------------

function CombatService.onCharacter(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid", 10) :: Humanoid?
	local root = character:WaitForChild("HumanoidRootPart", 10) :: BasePart?
	if not humanoid or not root then
		return
	end
	local ps: PState = {
		character = character,
		humanoid = humanoid,
		root = root,
		build = CombatService.buildFor(player),
		busyUntil = 0,
		actionStart = 0,
		comboIndex = 0,
		lastLightAt = 0,
		blocking = false,
		blockStart = 0,
		lastBlockStart = 0,
		parryEligible = false,
		iframesUntil = 0,
		dodgeReadyAt = 0,
		stunUntil = 0,
		stamina = PCFG.MaxStamina,
		lastStaminaUse = 0,
		resonance = 0,
		awakenedUntil = 0,
		awakenForm = nil,
		signatureUsed = false,
		burnoutUntil = 0,
		shieldUntil = 0,
		shieldAmount = 0,
		burnUntil = 0,
		burnDps = 0,
		evaded = {},
		parried = {},
		tonicReadyAt = 0,
		healTicks = 0,
		bookClearedAt = 0,
		swingSerial = 0,
		castSerial = 0,
		aura = {},
		combo = 0,
		comboExpires = 0,
		cancelAfter = math.huge,
		flowUntil = 0,
	}
	states[player] = ps
	cooldowns[player] = cooldowns[player] or {}
	humanoid.WalkSpeed = PCFG.BaseWalkSpeed
	setAttr(player, "Stamina", ps.stamina)
	setAttr(player, "MaxStamina", PCFG.MaxStamina)
	setAttr(player, "Resonance", 0)
	setAttr(player, "Awakened", false)
	setAttr(player, "AwakenEnds", 0)
	setAttr(player, "Blocking", false)
	setAttr(player, "BurnoutEnds", 0)
	setAttr(player, "Combo", 0)
	setAttr(player, "ComboEnds", 0)
	setAttr(player, "FlowEnds", 0)
	CombatService.refresh(player)
	humanoid.Died:Connect(function()
		if states[player] == ps then
			CombatService.endAwakening(player, false)
			states[player] = nil
		end
	end)
end

function CombatService.onLeave(player: Player)
	states[player] = nil
	cooldowns[player] = nil
end

function CombatService.state(player: Player): PState?
	return states[player]
end

local function alive(ps: PState?): boolean
	return ps ~= nil and ps.humanoid.Health > 0 and ps.character.Parent ~= nil
end

local function updateMovement(_player: Player, ps: PState)
	local t = now()
	local speed = PCFG.BaseWalkSpeed
	if t < ps.stunUntil then
		speed = 0
	elseif ps.blocking then
		speed = PCFG.BlockWalkSpeed
	elseif t < ps.awakenedUntil and ps.awakenForm == "Storm" then
		speed = PCFG.BaseWalkSpeed * 1.15
	end
	if ps.humanoid.WalkSpeed ~= speed then
		ps.humanoid.WalkSpeed = speed
	end
end

local function canAct(ps: PState, t: number): (boolean, string?)
	if not alive(ps) then
		return false, "dead"
	end
	if t < ps.stunUntil then
		return false, "stunned"
	end
	if t < ps.busyUntil - CFG.ActionTolerance then
		return false, "busy"
	end
	return true, nil
end

local function useStamina(player: Player, ps: PState, amount: number): boolean
	if ps.stamina < amount then
		return false
	end
	ps.stamina -= amount
	ps.lastStaminaUse = now()
	setAttr(player, "Stamina", math.floor(ps.stamina))
	return true
end

-- Resonance & Awakening -----------------------------------------------------------------------

function CombatService.addResonance(player: Player, amount: number)
	local ps = states[player]
	if not ps or amount <= 0 then
		return
	end
	local t = now()
	if t < ps.burnoutUntil or t < ps.awakenedUntil then
		return
	end
	local before = ps.resonance
	ps.resonance = math.min(CFG.ResonanceMax, ps.resonance + amount * ps.build.resonanceMult)
	setAttr(player, "Resonance", math.floor(ps.resonance))
	if before < CFG.ResonanceMax and ps.resonance >= CFG.ResonanceMax then
		feedback(player, "ResonanceFull")
	end
end

local function clearAura(ps: PState)
	for _, inst in ps.aura do
		if inst.Parent then
			inst:Destroy()
		end
	end
	ps.aura = {}
end

function CombatService.endAwakening(player: Player, suppressed: boolean)
	local ps = states[player]
	if not ps or ps.awakenedUntil == 0 then
		return
	end
	ps.awakenedUntil = 0
	ps.awakenForm = nil
	ps.burnoutUntil = now() + CFG.AwakeningBurnout
	clearAura(ps)
	setAttr(player, "Awakened", false)
	setAttr(player, "AwakenEnds", 0)
	setAttr(player, "BurnoutEnds", workspace:GetServerTimeNow() + CFG.AwakeningBurnout)
	Net.event("Effect"):FireAllClients("AwakenEnd", { character = ps.character, suppressed = suppressed })
	if suppressed then
		feedback(player, "Suppressed")
	end
	updateMovement(player, ps)
end

local function awaken(player: Player, ps: PState)
	local profile = profileOf(player)
	if not profile then
		return
	end
	local t = now()
	if t < ps.awakenedUntil then
		-- Second press: signature technique (once per awakening).
		if ps.signatureUsed then
			feedback(player, "Rejected", { action = "Awaken", reason = "Técnica firma ya usada" })
			return
		end
		local ok = canAct(ps, t)
		if not ok then
			return
		end
		ps.signatureUsed = true
		ps.busyUntil = t + 0.6
		local form = AwakeningConfig.Forms[ps.awakenForm or "Ember"]
		CombatService.cast(player, ps, form.signature.id, nil, { signature = true, essences = { form.id } })
		return
	end
	if ps.resonance < CFG.ResonanceMax then
		feedback(player, "Rejected", { action = "Awaken", reason = "Resonancia incompleta" })
		return
	end
	local primary = profile.loadout.primary
	local form = AwakeningConfig.Forms[primary]
	if not form then
		return
	end
	local duration = form.duration
	local essence = profile.essences[primary]
	if essence and essence.mastery >= 4 then
		duration += 3
	end
	ps.resonance = 0
	ps.awakenedUntil = t + duration
	ps.awakenForm = primary
	ps.signatureUsed = false
	setAttr(player, "Resonance", 0)
	setAttr(player, "Awakened", true)
	setAttr(player, "AwakenForm", primary)
	setAttr(player, "AwakenEnds", workspace:GetServerTimeNow() + duration)
	-- Visible to everyone: highlight + aura particles + light.
	clearAura(ps)
	local highlight = Instance.new("Highlight")
	highlight.Name = "AwakeningAura"
	highlight.FillColor = form.color
	highlight.OutlineColor = form.color
	highlight.FillTransparency = 0.78
	highlight.OutlineTransparency = 0.1
	highlight.Parent = ps.character
	table.insert(ps.aura, highlight)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = "AwakeningParticles"
	emitter.Color = ColorSequence.new(form.color)
	emitter.LightEmission = 1
	emitter.Rate = 18
	emitter.Lifetime = NumberRange.new(0.6, 1.1)
	emitter.Speed = NumberRange.new(2, 4)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.Acceleration = Vector3.new(0, 6, 0)
	emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
	emitter.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
	emitter.Parent = ps.root
	table.insert(ps.aura, emitter)
	local light = Instance.new("PointLight")
	light.Color = form.color
	light.Range = 14
	light.Brightness = 2
	light.Parent = ps.root
	table.insert(ps.aura, light)
	Net.event("Effect"):FireAllClients("Awaken", { character = ps.character, color = form.color, form = form.id })
	updateMovement(player, ps)

	local Progression = Registry.get("ProgressionService")
	Progression.stat(player, "awakenings")
	Progression.achieve(player, "FirstAwakening")
	Progression.present(player, "FirstAwakening", {
		title = form.displayName,
		subtitle = "Despertar de Resonancia",
		body = form.description .. " Pulsa G otra vez para " .. form.signature.displayName .. ". Dura " .. duration .. "s.",
		color = form.color,
	})
	Registry.get("QuestService").record(player, "Awaken", { form = form.id })
end

-- Hit resolution ----------------------------------------------------------------------------

local losParams = RaycastParams.new()
losParams.FilterType = Enum.RaycastFilterType.Include

local function lineOfSight(from: Vector3, to: Vector3, padding: number): boolean
	local world = workspace:FindFirstChild("World")
	if not world then
		return true
	end
	losParams.FilterDescendantsInstances = { world, workspace.Terrain }
	local origin = from + Vector3.new(0, 1.5, 0)
	local target = to + Vector3.new(0, 1.5, 0)
	local delta = target - origin
	if delta.Magnitude < 0.5 then
		return true
	end
	local hit = workspace:Raycast(origin, delta, losParams)
	if not hit then
		return true
	end
	return (hit.Position - origin).Magnitude >= delta.Magnitude - padding
end
CombatService.lineOfSight = lineOfSight

-- Damage bonus from statuses on the target (mastery passives).
local function statusBonus(record: any): number
	local Enemy = Registry.get("EnemyService")
	local bonus = 1
	local charged = Enemy.hasStatus(record, "Charged")
	if charged and charged.bonus then
		bonus += charged.bonus
	end
	local gathered = Enemy.hasStatus(record, "Gathered")
	if gathered and gathered.bonus then
		bonus += gathered.bonus
	end
	return bonus
end

local function awakenMult(ps: PState): number
	if now() < ps.awakenedUntil and ps.awakenForm then
		return AwakeningConfig.Forms[ps.awakenForm].damageMult
	end
	return 1
end

local function awakenOnHit(player: Player, ps: PState, record: any)
	if now() >= ps.awakenedUntil or not ps.awakenForm then
		return
	end
	local Enemy = Registry.get("EnemyService")
	local form = AwakeningConfig.Forms[ps.awakenForm]
	if form.onHit == "Burn" then
		Enemy.applyStatus(record, "Burning", { dps = 4, expires = now() + 3, by = player.UserId })
	elseif form.onHit == "Gather" then
		Enemy.applyStatus(record, "Gathered", { expires = now() + 3, by = player.UserId, bonus = 0 })
	elseif form.onHit == "Spark" then
		local origin = record.root.Position
		local others = Enemy.query(function(position, _r)
			return (position - origin).Magnitude <= 12
		end, 4)
		for _, other in others do
			if other ~= record then
				Enemy.damage(other, ps.build.base * 0.5, { player = player, kind = "Spark", position = ps.root.Position })
				Enemy.applyStatus(other, "Charged", { expires = now() + 3, by = player.UserId })
				Net.event("Effect"):FireAllClients("Lightning", { points = { origin, other.root.Position }, color = form.color })
				break
			end
		end
	end
end

-- Combo meter & offensive buffs ---------------------------------------------------------------

local rng = Random.new()

local function comboCount(ps: PState): number
	return if now() <= ps.comboExpires then ps.combo else 0
end

local function addCombo(player: Player, ps: PState, hits: number)
	local t = now()
	if t > ps.comboExpires then
		ps.combo = 0
	end
	local before = CombatMath.comboRank(ps.combo)
	ps.combo = math.min(999, ps.combo + hits)
	ps.comboExpires = t + CFG.ComboWindow
	setAttr(player, "Combo", ps.combo)
	setAttr(player, "ComboEnds", workspace:GetServerTimeNow() + CFG.ComboWindow)
	local after = CombatMath.comboRank(ps.combo)
	if after and after ~= before then
		feedback(player, "ComboRank", { rank = after, combo = ps.combo })
	end
end

local function breakCombo(player: Player, ps: PState)
	if comboCount(ps) >= 5 then
		feedback(player, "ComboBreak", { combo = ps.combo })
	end
	ps.combo = 0
	ps.comboExpires = 0
	setAttr(player, "Combo", 0)
	setAttr(player, "ComboEnds", 0)
end

-- Damage multiplier from the combo rank and the "Flujo" (perfect evade) buff.
local function offenseMult(ps: PState): number
	local _, bonus = CombatMath.comboRank(comboCount(ps))
	local mult = 1 + bonus
	if now() < ps.flowUntil then
		mult *= 1 + CFG.FlowBonus
	end
	return mult
end

-- Applies a weapon strike to every enemy inside `shape`. Returns hit list.
local function weaponHits(player: Player, ps: PState, shape: any, strike: any, mult: number, extra: any?): { any }
	local Enemy = Registry.get("EnemyService")
	local Quest = Registry.get("QuestService")
	local origin = ps.root.Position
	local targets = Enemy.query(function(position, radius)
		return Enemy.shapeContains(shape, position, radius)
	end, GameConfig.Combat.MaxTargetsPerSwing)
	local hits = {}
	local trainingHits, realHits = 0, 0
	for _, record in targets do
		if lineOfSight(origin, record.root.Position, record.radius + 1) then
			local amount = ps.build.base * strike.damage * mult * awakenMult(ps) * statusBonus(record) * offenseMult(ps)
			local crit = record.kind ~= "Training" and rng:NextNumber() < CombatMath.critChance(comboCount(ps))
			if crit then
				amount *= CFG.CritMult
			end
			local result = Enemy.damage(record, amount, {
				player = player,
				position = origin,
				guardBreak = strike.guardBreak,
				stagger = (strike.stagger or 0) + ((extra and extra.staggerBonus) or 0),
				kind = "Weapon",
				weakPointCheck = true,
			})
			if result.dealt > 0 or result.guarded then
				table.insert(hits, {
					position = record.root.Position,
					amount = math.floor(result.dealt + 0.5),
					guarded = result.guarded,
					killed = result.killed,
					crit = crit and not result.guarded,
				})
				if record.kind == "Training" then
					trainingHits += 1
				else
					realHits += 1
				end
				Quest.record(player, "Hit", { targetKind = record.kind, weapon = "Katana" })
				if result.interrupted then
					CombatService.addResonance(player, AwakeningConfig.Gains.Interrupt)
					feedback(player, "Interrupt", { position = record.root.Position })
				end
				awakenOnHit(player, ps, record)
				Registry.get("BossService").onPlayerHit(player, record, result)
			end
		end
	end
	if #hits > 0 then
		addCombo(player, ps, #hits)
		local _, comboBonus = CombatMath.comboRank(comboCount(ps))
		CombatService.addResonance(player, strike.resonance * (1 + comboBonus))
		local Progression = Registry.get("ProgressionService")
		local mastery = math.min(3, realHits) * 3 + (if trainingHits > 0 and realHits == 0 then 1 else 0)
		Progression.addWeaponMastery(player, "Katana", mastery)
		Progression.achieve(player, "FirstSteel")
		feedback(player, "Hits", { hits = hits, finisher = strike.finisher })
		Net.fireAllExcept("Effect", player, "Impacts", { hits = hits, color = ps.build.trailColor })
	end
	return hits
end

local function forwardShape(ps: PState, dir: Vector3, length: number, width: number): any
	local origin = ps.root.Position - dir * 1.5
	return { kind = "Line", origin = Vector3.new(origin.X, ps.root.Position.Y - 2.5, origin.Z), dir = dir, length = length + 1.5, width = width }
end

-- Light attack chain
local function lightAttack(player: Player, ps: PState, dir: Vector3)
	local t = now()
	local ok, reason = canAct(ps, t)
	if not ok or ps.blocking then
		feedback(player, "Rejected", { action = "Light", reason = reason or "blocking" })
		return
	end
	local build = ps.build
	local light = build.light
	local speed = build.attackSpeed
	if t < ps.awakenedUntil and ps.awakenForm then
		speed *= AwakeningConfig.Forms[ps.awakenForm].attackSpeed
	end
	local index = 1
	if t - ps.lastLightAt <= build.comboResetTime + 0.6 then
		index = (ps.comboIndex % #light) + 1
	end
	local strike = light[index]
	local duration = (strike.windup + strike.recovery) / speed
	ps.comboIndex = index
	ps.lastLightAt = t
	ps.busyUntil = t + duration
	ps.cancelAfter = t + strike.windup / speed -- recovery can be dodge-cancelled
	ps.actionStart = t
	ps.swingSerial += 1
	local serial = ps.swingSerial
	Net.fireAllExcept("Effect", player, "Swing", { character = ps.character, index = index, color = trailColorFor(player, build) })
	task.delay(strike.windup / speed, function()
		if states[player] ~= ps or not alive(ps) or ps.swingSerial ~= serial then
			return
		end
		if ps.stunUntil > ps.actionStart then
			return -- interrupted
		end
		weaponHits(player, ps, forwardShape(ps, dir, strike.range, strike.width), strike, 1)
		if strike.finisher and build.finisherShockwave then
			local center = ps.root.Position + dir * 4
			weaponHits(player, ps, { kind = "Circle", center = center - Vector3.new(0, 2.5, 0), radius = 8 }, {
				damage = 1.0,
				resonance = 1,
			}, 1)
			Net.event("Effect"):FireAllClients("Nova", { position = center, radius = 8, color = Color3.fromRGB(255, 210, 90) })
		end
	end)
end

local function heavyAttack(player: Player, ps: PState, dir: Vector3)
	local t = now()
	local ok, reason = canAct(ps, t)
	if not ok or ps.blocking then
		feedback(player, "Rejected", { action = "Heavy", reason = reason or "blocking" })
		return
	end
	local build = ps.build
	local heavy = build.heavy
	if not useStamina(player, ps, heavy.stamina) then
		feedback(player, "Rejected", { action = "Heavy", reason = "stamina" })
		return
	end
	local speed = build.attackSpeed
	ps.busyUntil = t + (heavy.windup + heavy.recovery) / speed
	ps.cancelAfter = t + heavy.windup / speed
	ps.actionStart = t
	ps.comboIndex = 0
	ps.swingSerial += 1
	local serial = ps.swingSerial
	Net.fireAllExcept("Effect", player, "Swing", { character = ps.character, index = 0, heavy = true, color = trailColorFor(player, build) })
	task.delay(heavy.windup / speed, function()
		if states[player] ~= ps or not alive(ps) or ps.swingSerial ~= serial or ps.stunUntil > ps.actionStart then
			return
		end
		local extra = { staggerBonus = build.heavyStaggerBonus }
		if heavy.lunge then
			-- Gale Thrust: dash forward (stopping at walls), damage along the path.
			local start = ps.root.Position
			local distance = heavy.lunge
			local world = workspace:FindFirstChild("World")
			if world then
				losParams.FilterDescendantsInstances = { world, workspace.Terrain }
				local hit = workspace:Raycast(start, dir * distance, losParams)
				if hit then
					distance = math.max(0, (hit.Position - start).Magnitude - 2)
				end
			end
			local finish = start + dir * distance
			ps.iframesUntil = math.max(ps.iframesUntil, now() + 0.25)
			ps.character:PivotTo(CFrame.lookAt(finish, finish + dir))
			Net.event("Effect"):FireAllClients("Dash", { from = start, to = finish, color = build.trailColor })
			weaponHits(player, ps, {
				kind = "Line",
				origin = start - Vector3.new(0, 2.5, 0),
				dir = dir,
				length = distance + heavy.range,
				width = heavy.width,
			}, heavy, build.heavyMult, extra)
		elseif heavy.radius then
			-- Bulwark Slam: area slam + protective shield.
			local center = ps.root.Position
			weaponHits(player, ps, { kind = "Circle", center = center - Vector3.new(0, 2.5, 0), radius = heavy.radius }, heavy, build.heavyMult, extra)
			ps.shieldUntil = now() + heavy.shieldDuration
			ps.shieldAmount = heavy.shield
			Net.event("Effect"):FireAllClients("Shield", { character = ps.character, duration = heavy.shieldDuration })
			Net.event("Effect"):FireAllClients("Nova", { position = center, radius = heavy.radius, color = build.trailColor })
		else
			weaponHits(player, ps, forwardShape(ps, dir, heavy.range, heavy.width), heavy, build.heavyMult, extra)
		end
	end)
end

local function blockStart(player: Player, ps: PState)
	local t = now()
	local ok = canAct(ps, t)
	if not ok or ps.blocking then
		return
	end
	ps.blocking = true
	ps.blockStart = t
	-- Parry spam guard: the perfect-parry window only opens if the previous block began >=0.7s ago.
	ps.parryEligible = t - ps.lastBlockStart >= 0.7
	ps.lastBlockStart = t
	setAttr(player, "Blocking", true)
	updateMovement(player, ps)
end

local function blockEnd(player: Player, ps: PState)
	if not ps.blocking then
		return
	end
	ps.blocking = false
	setAttr(player, "Blocking", false)
	updateMovement(player, ps)
end

local function dodge(player: Player, ps: PState, dir: Vector3)
	local t = now()
	local ok, reason = canAct(ps, t)
	if not ok and reason == "busy" and t >= ps.cancelAfter - CFG.ActionTolerance then
		ok = true -- dodge-cancel: the strike already landed, skip its recovery
	end
	if not ok then
		feedback(player, "Rejected", { action = "Dodge", reason = reason })
		return
	end
	if t < ps.dodgeReadyAt then
		feedback(player, "Rejected", { action = "Dodge", reason = "cooldown" })
		return
	end
	local d = ps.build.dodge
	if not useStamina(player, ps, d.stamina) then
		feedback(player, "Rejected", { action = "Dodge", reason = "stamina" })
		return
	end
	blockEnd(player, ps)
	local cooldown = ps.build.dodgeCooldown
	if t < ps.awakenedUntil and ps.awakenForm then
		cooldown *= AwakeningConfig.Forms[ps.awakenForm].dodgeCooldownMult or 1
	end
	ps.dodgeReadyAt = t + cooldown
	ps.iframesUntil = t + d.iframes + 0.05
	ps.busyUntil = t + d.duration
	ps.cancelAfter = math.huge
	ps.comboIndex = 0
	Net.fireAllExcept("Effect", player, "Dodge", { character = ps.character, dir = dir })
end

local function useTonic(player: Player, ps: PState)
	local t = now()
	if not alive(ps) or t < ps.tonicReadyAt then
		return
	end
	if ps.humanoid.Health >= ps.humanoid.MaxHealth then
		feedback(player, "Rejected", { action = "Tonic", reason = "La salud está llena" })
		return
	end
	if not Registry.get("InventoryService").spend(player, { EmberTonic = 1 }) then
		feedback(player, "Rejected", { action = "Tonic", reason = "No tienes Tónicos de Brasa (fabrícalos en el Banco del Artesano)" })
		return
	end
	ps.tonicReadyAt = t + 8
	ps.healTicks = 4
	Net.event("Cooldown"):FireClient(player, "H", workspace:GetServerTimeNow() + 8, 8)
	Net.event("Effect"):FireAllClients("Heal", { character = ps.character })
end

-- Abilities ----------------------------------------------------------------------------------

local function abilityForSlot(profile: any, slot: string): (string?, string?, { string }?)
	local primary = profile.loadout.primary
	if slot == "Q" or slot == "E" then
		local essence = EssenceConfig.Essences[primary]
		if not essence or not essence.implemented then
			return nil, "Sin esencia equipada", nil
		end
		local abilityId = essence.abilities[slot]
		local ability = EssenceConfig.Abilities[abilityId]
		local record = profile.essences[primary]
		if not record or not record.unlocked then
			return nil, "Esencia bloqueada", nil
		end
		if record.mastery < ability.masteryRequired then
			return nil, string.format("%s necesita %s maestría %d", ability.displayName, essence.displayName, ability.masteryRequired), nil
		end
		return abilityId, nil, { primary }
	elseif slot == "R" then
		local fusionId = FusionConfig.forPair(primary, profile.loadout.secondary)
		if not fusionId then
			return nil, "Equipa dos esencias compatibles para una fusión", nil
		end
		local def = FusionConfig.Fusions[fusionId]
		if not def.implemented then
			return nil, def.displayName .. " aún no se puede lanzar", nil
		end
		local record = profile.fusions[fusionId]
		if not record or not record.unlocked then
			return nil, def.displayName .. " no está desbloqueada (mira el Códice de Fusiones)", nil
		end
		return def.ability, nil, def.essences
	end
	return nil, "Ranura no válida", nil
end
CombatService.abilityForSlot = abilityForSlot

-- Shared context passed to ability implementations.
function CombatService.cast(player: Player, ps: PState, abilityId: string, aim: Vector3?, opts: any?): boolean
	local profile = profileOf(player)
	local def = EssenceConfig.Abilities[abilityId]
	local signature = nil
	if not def then
		for _, form in AwakeningConfig.Forms do
			if form.signature.id == abilityId then
				signature = form.signature
			end
		end
		if not signature then
			return false
		end
	end
	local essences: { string } = (opts and opts.essences) or { (def and def.essence) or "Ember" }
	local masteryBonus = 1
	if #essences == 1 then
		local record = profile.essences[essences[1]]
		masteryBonus = if record and record.mastery >= 5 then 1.15 else 1
	end
	local power = CombatMath.abilityPower(profile.level, 1, ps.build.abilityMult) * masteryBonus * awakenMult(ps)
	ps.castSerial += 1
	local castId = ps.castSerial
	local Enemy = Registry.get("EnemyService")
	local dir = ps.root.CFrame.LookVector
	dir = Vector3.new(dir.X, 0, dir.Z).Unit
	if aim then
		local flat = Vector3.new(aim.X - ps.root.Position.X, 0, aim.Z - ps.root.Position.Z)
		if flat.Magnitude > 1 then
			dir = flat.Unit
		end
	end
	local anyHit = false
	local hitCount = 0
	local affinityShown: { [any]: boolean } = {}
	local ctx = {
		player = player,
		ps = ps,
		def = def or signature,
		power = power,
		origin = ps.root.Position,
		dir = dir,
		aim = aim or (ps.root.Position + dir * 10),
		castId = castId,
		essences = essences,
		mastery = function(essence: string): number
			local record = profile.essences[essence]
			return if record then record.mastery else 1
		end,
	}
	-- Damage every enemy in a shape. Returns list of { record, result }.
	function ctx.hit(shape: any, mult: number, info: any?): { any }
		local out = {}
		local targets = Enemy.query(function(position, radius)
			return Enemy.shapeContains(shape, position, radius)
		end, 10)
		for _, record in targets do
			if lineOfSight(shape.center or shape.origin or ps.root.Position, record.root.Position, record.radius + 2) then
				local affinity, tag = CombatMath.affinity(record.def, essences)
				local amount = power * mult * statusBonus(record) * offenseMult(ps) * affinity
				local result = Enemy.damage(record, amount, {
					player = player,
					position = ps.root.Position,
					kind = "Ability",
					stagger = info and info.stagger,
					guardBreak = info and info.guardBreak,
				})
				if result.dealt > 0 then
					table.insert(out, { record = record, result = result })
					hitCount += 1
					addCombo(player, ps, 1)
					if tag and not affinityShown[record] then
						affinityShown[record] = true
						feedback(player, "Affinity", { position = record.root.Position, tag = tag })
					end
					if not anyHit then
						anyHit = true
						CombatService.addResonance(player, (def and def.resonance) or 4)
					end
					if result.interrupted then
						CombatService.addResonance(player, AwakeningConfig.Gains.Interrupt)
					end
					Net.event("Effect"):FireAllClients("Impacts", {
						hits = { { position = record.root.Position, amount = math.floor(result.dealt + 0.5) } },
						color = ctx.color,
					})
					if not (opts and opts.signature) then
						Registry.get("FusionService").onAbilityHit(player, record, essences, castId)
					end
					Registry.get("CoopService").onAbilityHit(player, record, essences, castId)
					Registry.get("BossService").onPlayerHit(player, record, result)
				end
			end
		end
		return out
	end
	function ctx.status(record: any, name: string, data: any)
		data.by = player.UserId
		Enemy.applyStatus(record, name, data)
	end
	function ctx.displace(record: any, position: Vector3, duration: number)
		Enemy.displace(record, position, duration)
	end
	function ctx.effect(name: string, data: any)
		Net.event("Effect"):FireAllClients(name, data)
	end
	ctx.los = lineOfSight
	function ctx.alive(): boolean
		return states[player] == ps and alive(ps)
	end
	function ctx.query(predicate: (Vector3, number) -> boolean, max: number?)
		return Enemy.query(predicate, max)
	end
	function ctx.finish()
		-- essence mastery for ability hits
		if hitCount > 0 and not (opts and opts.signature) then
			local Progression = Registry.get("ProgressionService")
			for _, essence in essences do
				Progression.addEssenceXp(player, essence, math.min(12, hitCount * 4))
			end
		end
	end
	ctx.color = if def and def.essence and EssenceConfig.Essences[def.essence]
		then EssenceConfig.Essences[def.essence].color
		else (if signature then AwakeningConfig.Forms[essences[1]].color else Color3.fromRGB(255, 200, 120))
	local ok, err = pcall(Abilities.cast, abilityId, ctx)
	if not ok then
		warn("[Combat] ability " .. abilityId .. " failed: " .. tostring(err))
		return false
	end
	return true
end

local function ability(player: Player, ps: PState, slot: string, aim: any)
	local profile = profileOf(player)
	if not profile then
		return
	end
	local t = now()
	local ok, reason = canAct(ps, t)
	if not ok or ps.blocking then
		feedback(player, "Rejected", { action = slot, reason = reason or "blocking" })
		return
	end
	local abilityId, why, essences = abilityForSlot(profile, slot)
	if not abilityId then
		feedback(player, "Rejected", { action = slot, reason = why })
		return
	end
	local def = EssenceConfig.Abilities[abilityId]
	local cds = cooldowns[player]
	if t < (cds[abilityId] or 0) - CFG.ActionTolerance then
		feedback(player, "Rejected", { action = slot, reason = "cooldown" })
		return
	end
	local Security = Registry.get("SecurityService")
	local aimPoint = Security.clampAim(player, aim, def.range or 20)
	cds[abilityId] = t + def.cooldown
	ps.busyUntil = t + 0.35
	ps.cancelAfter = t -- casts resolve immediately, so their short lock can be dodged out of
	ps.actionStart = t
	ps.comboIndex = 0
	Net.event("Cooldown"):FireClient(player, slot, workspace:GetServerTimeNow() + def.cooldown, def.cooldown)
	Net.fireAllExcept("Effect", player, "Cast", { character = ps.character, ability = abilityId })
	CombatService.cast(player, ps, abilityId, aimPoint, { essences = essences })
	if slot == "R" then
		local Progression = Registry.get("ProgressionService")
		Progression.stat(player, "fusionsCast")
		Registry.get("QuestService").record(player, "FusionCast", { fusion = abilityId })
		Net.event("Effect"):FireClient(player, "Sound", { name = "FusionActivation" })
	end
end

-- Incoming damage to players -----------------------------------------------------------------

-- src = { attacker = record?, attackKey, parryable, telegraphed, burn?, position?, endsAwakening?, unblockable? }
-- Returns "None" | "Evaded" | "Parried" | "Blocked" | "Hit"
function CombatService.damagePlayer(player: Player, amount: number, src: any): string
	local ps = states[player]
	if not ps or not alive(ps) then
		return "None"
	end
	local t = now()
	local key = src.attackKey
	if t <= ps.iframesUntil then
		if src.telegraphed and key and not ps.evaded[key] then
			ps.evaded[key] = true
			CombatService.addResonance(player, AwakeningConfig.Gains.DodgeTelegraph)
			Registry.get("QuestService").record(player, "DodgeTelegraph", {})
			Registry.get("ProgressionService").stat(player, "dodges")
			ps.flowUntil = t + CFG.FlowDuration
			setAttr(player, "FlowEnds", workspace:GetServerTimeNow() + CFG.FlowDuration)
			feedback(player, "Evaded", { flow = CFG.FlowDuration })
		end
		return "Evaded"
	end
	local inFront = true
	if src.position then
		local look = ps.root.CFrame.LookVector
		local to = Vector3.new(src.position.X - ps.root.Position.X, 0, src.position.Z - ps.root.Position.Z)
		if to.Magnitude > 0.5 then
			inFront = Vector3.new(look.X, 0, look.Z).Unit:Dot(to.Unit) > -0.3
		end
	end
	if ps.blocking and inFront and not src.unblockable then
		local window = ps.build.parryWindow + CFG.ParryLatencyAllowance
		if src.parryable and ps.parryEligible and t - ps.blockStart <= window then
			if key then
				if ps.parried[key] then
					return "Parried"
				end
				ps.parried[key] = true
			end
			CombatService.addResonance(player, AwakeningConfig.Gains.PerfectParry)
			local Progression = Registry.get("ProgressionService")
			Progression.stat(player, "perfectParries")
			Progression.achieve(player, "PerfectGuard")
			Registry.get("QuestService").record(player, "PerfectParry", {})
			feedback(player, "Parry")
			Net.event("Effect"):FireAllClients("Parry", { position = ps.root.Position + ps.root.CFrame.LookVector * 2, character = ps.character })
			if ps.build.riposte and src.attacker and src.attacker.alive then
				local Enemy = Registry.get("EnemyService")
				Enemy.damage(src.attacker, ps.build.base * ps.build.riposte, {
					player = player,
					position = ps.root.Position,
					kind = "Riposte",
				})
				Net.event("Effect"):FireAllClients("Riposte", { from = ps.root.Position, to = src.attacker.root.Position })
			end
			return "Parried"
		end
		amount *= 1 - ps.build.blockReduction
		ps.stamina -= ps.build.blockStamina
		ps.lastStaminaUse = t
		if ps.stamina <= 0 then
			ps.stamina = 0
			blockEnd(player, ps)
			ps.stunUntil = t + 1.0
			feedback(player, "GuardBroken")
		else
			feedback(player, "Blocked", { amount = math.floor(amount + 0.5) })
		end
		setAttr(player, "Stamina", math.floor(ps.stamina))
	else
		if t < ps.awakenedUntil and ps.awakenForm then
			amount *= AwakeningConfig.Forms[ps.awakenForm].damageTakenMult
		end
		if t < ps.shieldUntil then
			amount *= 1 - ps.shieldAmount
		end
		if amount >= 18 then
			ps.stunUntil = math.max(ps.stunUntil, t + 0.35)
		end
		if src.burn then
			ps.burnUntil = t + src.burn.duration
			ps.burnDps = src.burn.dps
		end
		feedback(player, "Hurt", { amount = math.floor(amount + 0.5) })
		breakCombo(player, ps)
	end
	if src.endsAwakening and t < ps.awakenedUntil then
		CombatService.endAwakening(player, true)
	end
	ps.humanoid:TakeDamage(amount)
	updateMovement(player, ps)
	return if ps.blocking then "Blocked" else "Hit"
end

-- Called by EnemyService/BossService when an attack resolves.
function CombatService.enemyStrike(record: any, attack: any, shape: any, key: string, damage: number)
	local Enemy = Registry.get("EnemyService")
	for player, ps in states do
		if alive(ps) and Enemy.shapeContains(shape, ps.root.Position, 1.2) then
			if record.ownerUserId and player.UserId ~= record.ownerUserId then
				continue
			end
			local outcome = CombatService.damagePlayer(player, damage, {
				attacker = record,
				attackKey = key,
				parryable = attack.parryable,
				telegraphed = true,
				burn = attack.burn,
				position = record.root.Position,
				endsAwakening = attack.endsAwakening,
			})
			if outcome == "Parried" then
				if record.onParried then
					record.onParried(record, player, attack)
				else
					Enemy.onParried(record, player)
				end
			end
		end
	end
end

-- Hazards (boss fractures, lava) that are not tied to an enemy attack key.
function CombatService.hazardDamage(player: Player, amount: number, src: any?): string
	return CombatService.damagePlayer(player, amount, src or { telegraphed = false })
end

function CombatService.statusDamage(record: any, amount: number, source: Player?, kind: string)
	Registry.get("EnemyService").damage(record, amount, { player = source, kind = kind })
end

function CombatService.onEnemyKilled(record: any, _killer: Player?)
	-- Ember mastery 3 "Wildfire": burning enemies spread their burn on death.
	local Enemy = Registry.get("EnemyService")
	local burning = Enemy.hasStatus(record, "Burning")
	if not burning or not burning.by then
		return
	end
	local source = Players:GetPlayerByUserId(burning.by)
	local profile = source and profileOf(source)
	if not profile or profile.essences.Ember.mastery < 3 then
		return
	end
	local center = record.root.Position
	for _, other in Enemy.query(function(position, _r)
		return (position - center).Magnitude <= 9
	end, 5) do
		if other ~= record then
			Enemy.applyStatus(other, "Burning", { dps = burning.dps, expires = os.clock() + 3, by = burning.by })
		end
	end
	Net.event("Effect"):FireAllClients("Nova", { position = center, radius = 9, color = Color3.fromRGB(255, 120, 50) })
end

-- Remote handling ----------------------------------------------------------------------------

local function onAction(player: Player, action: any, payload: any)
	local Security = Registry.get("SecurityService")
	if type(action) ~= "string" or #action > 16 then
		Security.flag(player, "bad combat action")
		return
	end
	if payload ~= nil and type(payload) ~= "table" then
		return
	end
	payload = payload or {}
	local category = if action == "Ability" or action == "Awaken" or action == "Tonic" then "Ability" else "Combat"
	if not Security.allow(player, category) then
		return
	end
	local ps = states[player]
	if not ps or not alive(ps) or not profileOf(player) then
		return
	end
	local dir = Security.direction(payload.dir)
	if not dir then
		local look = ps.root.CFrame.LookVector
		dir = Vector3.new(look.X, 0, look.Z).Unit
	end
	if action == "Light" then
		lightAttack(player, ps, dir :: Vector3)
	elseif action == "Heavy" then
		heavyAttack(player, ps, dir :: Vector3)
	elseif action == "BlockStart" then
		blockStart(player, ps)
	elseif action == "BlockEnd" then
		blockEnd(player, ps)
	elseif action == "Dodge" then
		dodge(player, ps, dir :: Vector3)
	elseif action == "Ability" then
		local slot = payload.slot
		if slot ~= "Q" and slot ~= "E" and slot ~= "R" then
			Security.flag(player, "bad ability slot")
			return
		end
		ability(player, ps, slot, payload.aim)
	elseif action == "Awaken" then
		awaken(player, ps)
	elseif action == "Tonic" then
		useTonic(player, ps)
	else
		Security.flag(player, "unknown combat action " .. action)
	end
end

function CombatService.Init() end

function CombatService.Start()
	Net.event("CombatAction").OnServerEvent:Connect(onAction)
	Players.PlayerRemoving:Connect(CombatService.onLeave)

	local accumulator, slow = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		slow += dt
		if accumulator < 0.1 then
			return
		end
		local step = accumulator
		accumulator = 0
		local t = now()
		for player, ps in states do
			if not alive(ps) then
				continue
			end
			-- stamina regen
			if t - ps.lastStaminaUse >= PCFG.StaminaRegenDelay and ps.stamina < PCFG.MaxStamina then
				local rate = PCFG.StaminaRegenPerSecond * (if ps.blocking then 0.4 else 1)
				ps.stamina = math.min(PCFG.MaxStamina, ps.stamina + rate * step)
				setAttr(player, "Stamina", math.floor(ps.stamina))
			end
			if ps.awakenedUntil > 0 and t >= ps.awakenedUntil then
				CombatService.endAwakening(player, false)
			end
			updateMovement(player, ps)
		end
		if slow >= 0.5 then
			slow = 0
			for _, ps in states do
				if alive(ps) then
					if t < ps.burnUntil then
						ps.humanoid:TakeDamage(ps.burnDps * 0.5)
					end
					if ps.healTicks > 0 then
						ps.healTicks -= 1
						ps.humanoid.Health = math.min(ps.humanoid.MaxHealth, ps.humanoid.Health + ps.humanoid.MaxHealth * 0.1)
					end
					-- bound the per-attack bookkeeping tables
					if t - ps.bookClearedAt > 20 then
						ps.bookClearedAt = t
						ps.evaded = {}
						ps.parried = {}
					end
				end
			end
		end
	end)
end

return CombatService
