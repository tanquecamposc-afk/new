--!strict
-- Server implementations of essence abilities, fusions and awakening signatures.
-- Each receives a ctx built by CombatService.cast (damage goes through ctx.hit so every
-- hit is validated, scaled, credited and fed into fusion/co-op detection uniformly).

local Abilities = {}

local function groundOf(position: Vector3): Vector3
	return position - Vector3.new(0, 2.5, 0)
end

local impl: { [string]: (any) -> () } = {}

impl.FlareBurst = function(ctx)
	local def = ctx.def
	local origin = groundOf(ctx.origin)
	ctx.effect("FlareBurst", { origin = ctx.origin, dir = ctx.dir, length = def.range, width = def.width, color = ctx.color })
	local hits = ctx.hit({ kind = "Line", origin = origin, dir = ctx.dir, length = def.range, width = def.width }, def.damage)
	for _, h in hits do
		ctx.status(h.record, "Burning", { dps = def.burnDps * ctx.power / 12, expires = os.clock() + def.burnDuration })
	end
	ctx.finish()
end

impl.EmberNova = function(ctx)
	local def = ctx.def
	ctx.effect("Nova", { position = ctx.origin, radius = def.radius, color = ctx.color })
	local hits = ctx.hit({ kind = "Circle", center = groundOf(ctx.origin), radius = def.radius }, def.damage, { stagger = 0.4 })
	for _, h in hits do
		local away = h.record.root.Position - ctx.origin
		away = Vector3.new(away.X, 0, away.Z)
		if away.Magnitude > 0.1 then
			ctx.displace(h.record, h.record.root.Position + away.Unit * def.knockback, 0.25)
		end
		ctx.status(h.record, "Burning", { dps = def.burnDps * ctx.power / 12, expires = os.clock() + def.burnDuration })
	end
	ctx.finish()
end

impl.ArcBolt = function(ctx)
	local def = ctx.def
	local origin = ctx.origin
	local aim = ctx.aim
	-- primary: enemy closest to the aim point, in front of the caster, within range
	local candidates = ctx.query(function(position, _r)
		local to = position - origin
		local flat = Vector3.new(to.X, 0, to.Z)
		return flat.Magnitude <= def.range
			and (flat.Magnitude < 4 or flat.Unit:Dot(ctx.dir) > 0.35)
			and ctx.los(origin, position, 3)
	end, 20)
	table.sort(candidates, function(a, b)
		return (a.root.Position - aim).Magnitude < (b.root.Position - aim).Magnitude
	end)
	local primary = candidates[1]
	if not primary then
		ctx.effect("Lightning", { points = { origin + Vector3.new(0, 2, 0), aim + Vector3.new(0, 1, 0) }, color = ctx.color })
		return
	end
	local chain = { primary }
	local hitSet = { [primary] = true }
	local current = primary
	for _ = 1, def.chains do
		local nextTarget, best = nil, def.chainRange
		for _, record in ctx.query(function(position, _r)
			return (position - current.root.Position).Magnitude <= def.chainRange
		end, 20) do
			local d = (record.root.Position - current.root.Position).Magnitude
			if not hitSet[record] and d <= best then
				nextTarget, best = record, d
			end
		end
		if not nextTarget then
			break
		end
		hitSet[nextTarget] = true
		table.insert(chain, nextTarget)
		current = nextTarget
	end
	local points = { origin + Vector3.new(0, 2, 0) }
	local mult = def.damage
	local bonus = if ctx.mastery("Storm") >= 3 then 0.1 else 0
	for _, record in chain do
		table.insert(points, record.root.Position)
		local hits = ctx.hit({ kind = "Circle", center = groundOf(record.root.Position), radius = 0.5 }, mult)
		for _, h in hits do
			if h.record == record then
				ctx.status(record, "Charged", { expires = os.clock() + def.chargedDuration, bonus = bonus })
			end
		end
		mult *= def.chainFalloff
	end
	ctx.effect("Lightning", { points = points, color = ctx.color })
	ctx.finish()
end

impl.Thunderstep = function(ctx)
	local def = ctx.def
	local ps = ctx.ps
	local start = ctx.origin
	local distance = def.distance
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	local world = workspace:FindFirstChild("World")
	if world then
		params.FilterDescendantsInstances = { world, workspace.Terrain }
		local hit = workspace:Raycast(start, ctx.dir * distance, params)
		if hit then
			distance = math.max(0, (hit.Position - start).Magnitude - 2.5)
		end
	end
	local finish = start + ctx.dir * distance
	ps.iframesUntil = math.max(ps.iframesUntil, os.clock() + def.iframes)
	ps.character:PivotTo(CFrame.lookAt(finish, finish + ctx.dir))
	ctx.effect("Thunderstep", { from = start, to = finish, color = ctx.color })
	local bonus = if ctx.mastery("Storm") >= 3 then 0.1 else 0
	local hits = ctx.hit({ kind = "Line", origin = groundOf(start), dir = ctx.dir, length = distance + 2, width = def.width }, def.damage)
	for _, h in hits do
		ctx.status(h.record, "Charged", { expires = os.clock() + 3, bonus = bonus })
	end
	ctx.finish()
end

impl.GravitonPull = function(ctx)
	local def = ctx.def
	local center = ctx.aim
	ctx.effect("Gravity", { position = center, radius = def.radius, duration = def.pullTime, color = ctx.color })
	local bonus = if ctx.mastery("Gravity") >= 3 then 0.15 else 0
	local hits = ctx.hit({ kind = "Circle", center = groundOf(center), radius = def.radius }, def.damage)
	for _, h in hits do
		local offset = h.record.root.Position - center
		offset = Vector3.new(offset.X, 0, offset.Z)
		local goal = center + (if offset.Magnitude > 0.1 then offset.Unit * 2 else Vector3.zero)
		ctx.displace(h.record, goal, def.pullTime)
		ctx.status(h.record, "Gathered", { expires = os.clock() + def.gatheredDuration, bonus = bonus })
	end
	ctx.finish()
end

impl.CrushingField = function(ctx)
	local def = ctx.def
	local center = ctx.aim
	ctx.effect("Field", { position = center, radius = def.radius, duration = def.duration, color = ctx.color })
	local bonus = if ctx.mastery("Gravity") >= 3 then 0.15 else 0
	task.spawn(function()
		local ticks = math.floor(def.duration / def.tick)
		for _ = 1, ticks do
			if not ctx.alive() then
				break
			end
			local hits = ctx.hit({ kind = "Circle", center = groundOf(center), radius = def.radius }, def.damage)
			for _, h in hits do
				ctx.status(h.record, "Slowed", { expires = os.clock() + def.tick + 0.2, mult = def.slow })
				ctx.status(h.record, "Gathered", { expires = os.clock() + 1.5, bonus = bonus })
			end
			task.wait(def.tick)
		end
		ctx.finish()
	end)
end

impl.CollapsingSun = function(ctx)
	local def = ctx.def
	local center = ctx.aim
	ctx.effect("CollapsingSun", { position = center, radius = def.radius, pullTime = def.pullTime, blast = def.blastRadius })
	for _, record in ctx.query(function(position, r)
		return (Vector3.new(position.X - center.X, 0, position.Z - center.Z)).Magnitude <= def.radius + r
	end, 10) do
		local offset = record.root.Position - center
		offset = Vector3.new(offset.X, 0, offset.Z)
		ctx.displace(record, center + (if offset.Magnitude > 0.1 then offset.Unit * 1.5 else Vector3.zero), def.pullTime)
		ctx.status(record, "Gathered", { expires = os.clock() + def.pullTime + 1.5, bonus = 0 })
	end
	task.delay(def.pullTime, function()
		if not ctx.alive() then
			return
		end
		local hits = ctx.hit({ kind = "Circle", center = groundOf(center), radius = def.blastRadius }, def.damage, { stagger = 0.8 })
		for _, h in hits do
			ctx.status(h.record, "Burning", { dps = def.burnDps * ctx.power / 12, expires = os.clock() + def.burnDuration })
		end
		ctx.finish()
	end)
end

impl.MagneticRift = function(ctx)
	local def = ctx.def
	local center = ctx.aim
	ctx.effect("MagneticRift", { position = center, radius = def.radius, duration = def.duration })
	task.spawn(function()
		local ticks = math.floor(def.duration / def.tick)
		for _ = 1, ticks do
			if not ctx.alive() then
				break
			end
			local inside = ctx.query(function(position, r)
				return (Vector3.new(position.X - center.X, 0, position.Z - center.Z)).Magnitude <= def.radius + r
			end, 10)
			local points = {}
			for i, record in inside do
				local offset = record.root.Position - center
				offset = Vector3.new(offset.X, 0, offset.Z)
				if offset.Magnitude > 3 then
					ctx.displace(record, center + offset.Unit * 2.5, def.tick * 0.8)
				end
				ctx.status(record, "Gathered", { expires = os.clock() + 1.5, bonus = 0 })
				ctx.status(record, "Charged", { expires = os.clock() + 2, bonus = 0 })
				if i <= def.chains then
					table.insert(points, record)
				end
			end
			for _, record in points do
				ctx.hit({ kind = "Circle", center = groundOf(record.root.Position), radius = 0.5 }, def.damage)
				ctx.effect("Lightning", { points = { center + Vector3.new(0, 3, 0), record.root.Position }, color = Color3.fromRGB(140, 190, 255) })
			end
			task.wait(def.tick)
		end
		ctx.finish()
	end)
end

-- Awakening signatures ----------------------------------------------------------------------

impl.SolarCataclysm = function(ctx)
	local def = ctx.def
	ctx.effect("Cataclysm", { position = ctx.origin, radius = def.radius, color = Color3.fromRGB(255, 120, 40) })
	local hits = ctx.hit({ kind = "Circle", center = groundOf(ctx.origin), radius = def.radius }, def.damage, { stagger = 1.0 })
	for _, h in hits do
		ctx.status(h.record, "Burning", { dps = 6, expires = os.clock() + 4 })
	end
end

impl.ThousandBolts = function(ctx)
	local def = ctx.def
	local origin = ctx.origin
	local targets = ctx.query(function(position, _r)
		return (position - origin).Magnitude <= def.radius
	end, def.targets)
	task.spawn(function()
		for _, record in targets do
			if not ctx.alive() then
				break
			end
			if record.alive then
				ctx.effect("Lightning", { points = { record.root.Position + Vector3.new(0, 40, 0), record.root.Position }, color = Color3.fromRGB(150, 220, 255) })
				ctx.hit({ kind = "Circle", center = groundOf(record.root.Position), radius = 0.5 }, def.damage, { stagger = 0.4 })
				ctx.status(record, "Charged", { expires = os.clock() + 4, bonus = 0.1 })
			end
			task.wait(0.08)
		end
	end)
end

impl.EventHorizon = function(ctx)
	local def = ctx.def
	local center = ctx.origin
	ctx.effect("CollapsingSun", { position = center, radius = def.radius, pullTime = def.pullTime, blast = def.radius * 0.6, gravityOnly = true })
	for _, record in ctx.query(function(position, _r)
		return (position - center).Magnitude <= def.radius
	end, 12) do
		local offset = record.root.Position - center
		offset = Vector3.new(offset.X, 0, offset.Z)
		ctx.displace(record, center + (if offset.Magnitude > 0.1 then offset.Unit * 3 else Vector3.zero), def.pullTime)
		ctx.status(record, "Gathered", { expires = os.clock() + def.pullTime + 2, bonus = 0.15 })
	end
	task.delay(def.pullTime, function()
		if ctx.alive() then
			ctx.hit({ kind = "Circle", center = groundOf(center), radius = def.radius * 0.6 }, def.damage, { stagger = 1.2 })
		end
	end)
end

function Abilities.cast(id: string, ctx: any)
	local fn = impl[id]
	if not fn then
		error("no implementation for ability " .. id)
	end
	fn(ctx)
end

function Abilities.has(id: string): boolean
	return impl[id] ~= nil
end

return Abilities
