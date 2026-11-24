class_name SimWorld
extends RefCounted
## Deterministic-per-machine simulation of one arena: cars, ball, boost pads.
##
## Pure logic (no scene nodes) so it runs identically in the client, a
## headless dedicated server, bots' look-ahead and automated tests.
## Every tick it fills `events` with gameplay events for the presentation,
## audio, statistics and replay layers to consume.

class BoostPad:
	var pos: Vector3
	var big: bool
	var radius: float
	var respawn: float
	var timer: float = 0.0

	func active() -> bool:
		return timer <= 0.0


var cfg: PhysicsConfig
var arena: ArenaShape
var ball: BallBody
var cars: Array[CarBody] = []
var pads: Array[BoostPad] = []
var time: float = 0.0
var tick: int = 0
var events: Array[Dictionary] = []
## When false, cars can't move (kickoff countdown) but physics still settles.
var cars_frozen: bool = false
var ball_frozen: bool = false
## Heatseeker-style homing (set by the game mode).
var homing_enabled: bool = false
var homing_base_speed: float = 18.0
var homing_speed_step: float = 2.0

## Last car that touched the ball, and the previous one (for assists).
var last_touch_car: int = -1
var prev_touch_car: int = -1
var last_touch_time: float = -100.0
var _touch_cooldown: Dictionary = {}  # car id -> ticks remaining


func _init(p_cfg: PhysicsConfig) -> void:
	cfg = p_cfg
	arena = ArenaShape.new(cfg)
	ball = BallBody.new(cfg)
	_build_default_pads()


func add_car(team: int) -> CarBody:
	var car := CarBody.new(cfg, cars.size(), team)
	cars.append(car)
	return car


func get_car(car_id: int) -> CarBody:
	if car_id >= 0 and car_id < cars.size():
		return cars[car_id]
	return null


# ------------------------------------------------------------------ pads
func _build_default_pads() -> void:
	pads.clear()
	# Original layout for the standard arena (mirror-symmetric in x and z).
	var big_spots: Array[Vector2] = [Vector2(30.7, 41.0), Vector2(35.8, 0.0)]
	for s in big_spots:
		for sx in [-1.0, 1.0]:
			for sz in ([1.0] if s.y == 0.0 else [-1.0, 1.0]):
				_add_pad(Vector3(s.x * sx, 0.0, s.y * sz), true)
	var small_spots: Array[Vector2] = [
		Vector2(0.0, 43.0), Vector2(18.0, 43.0), Vector2(9.0, 29.0), Vector2(29.0, 28.0),
		Vector2(0.0, 33.0), Vector2(20.0, 15.0), Vector2(0.0, 15.0), Vector2(36.0, 20.0),
		Vector2(10.5, 0.0), Vector2(23.0, 0.0)]
	for s in small_spots:
		for sx in ([1.0] if s.x == 0.0 else [-1.0, 1.0]):
			for sz in ([1.0] if s.y == 0.0 else [-1.0, 1.0]):
				_add_pad(Vector3(s.x * sx, 0.0, s.y * sz), false)


func _add_pad(p: Vector3, big: bool) -> void:
	var pad := BoostPad.new()
	pad.pos = p
	pad.big = big
	pad.radius = cfg.big_pad_radius if big else cfg.small_pad_radius
	pad.respawn = cfg.big_pad_respawn if big else cfg.small_pad_respawn
	pads.append(pad)


func reset_pads() -> void:
	for p in pads:
		p.timer = 0.0


# ------------------------------------------------------------------ step
func step(dt: float) -> void:
	events.clear()
	time += dt
	tick += 1
	for car in cars:
		if car.demolished:
			car.step(dt, arena, ball)
			if car.respawn_timer <= 0.0:
				_respawn(car)
			continue
		if cars_frozen:
			var saved := CarControls.new()
			saved.copy_from(car.controls)
			car.controls.reset()
			car.step(dt, arena, ball)
			car.controls.copy_from(saved)
			car.vel = Vector3(0.0, minf(car.vel.y, 0.0), 0.0)
			car.ang_vel = Vector3.ZERO
		else:
			car.step(dt, arena, ball)
	if not ball_frozen:
		ball.step(dt, arena)
		if ball.last_bounce_speed > 2.0:
			events.append({"type": "ball_bounce", "speed": ball.last_bounce_speed, "pos": ball.pos})
	for k in _touch_cooldown.keys():
		_touch_cooldown[k] = int(_touch_cooldown[k]) - 1
		if int(_touch_cooldown[k]) <= 0:
			_touch_cooldown.erase(k)
	for car in cars:
		if not car.demolished:
			_collide_car_ball(car)
	_collide_cars()
	_update_pads(dt)


func _respawn(car: CarBody) -> void:
	car.demolished = false
	var side: float = -1.0 if car.team == 0 else 1.0
	var best := Vector3.ZERO
	var best_score: float = -1.0
	for x in [-24.0, -12.0, 0.0, 12.0, 24.0]:
		var p := Vector3(x, 0.17, side * (cfg.arena_half_length - 8.0))
		var score: float = 1000.0
		for other in cars:
			if other != car and not other.demolished:
				score = minf(score, other.pos.distance_to(p))
		if score > best_score:
			best_score = score
			best = p
	var facing := Basis.looking_at(Vector3(0, 0, -side), Vector3.UP)
	car.set_transform(best, facing)
	car.boost = cfg.boost_start
	events.append({"type": "respawn", "car": car.id})


# ------------------------------------------------------------ car vs ball
func _collide_car_ball(car: CarBody) -> void:
	var h: Vector3 = cfg.hitbox_half_extents
	var center: Vector3 = car.hitbox_center()
	var local: Vector3 = car.basis.transposed() * (ball.pos - center)
	var closest := Vector3(clampf(local.x, -h.x, h.x), clampf(local.y, -h.y, h.y), clampf(local.z, -h.z, h.z))
	var diff_local: Vector3 = local - closest
	var dist: float = diff_local.length()
	var n_local: Vector3
	if dist < 1e-5:
		# Ball centre inside the box: push out through the nearest face.
		var pen := Vector3(h.x - absf(local.x), h.y - absf(local.y), h.z - absf(local.z))
		if pen.x < pen.y and pen.x < pen.z:
			n_local = Vector3(signf(local.x), 0, 0)
		elif pen.y < pen.z:
			n_local = Vector3(0, signf(local.y), 0)
		else:
			n_local = Vector3(0, 0, signf(local.z))
		dist = 0.0
	else:
		if dist >= ball.radius:
			return
		n_local = diff_local / dist
	var n: Vector3 = car.basis * n_local
	var contact: Vector3 = center + car.basis * closest
	var penetration: float = ball.radius - dist
	var mb: float = ball.mass
	var mc: float = cfg.car_mass
	ball.pos += n * penetration * (mc / (mb + mc))
	car.pos -= n * penetration * (mb / (mb + mc))

	var r_car: Vector3 = contact - car.pos
	var v_car: Vector3 = car.point_velocity(contact)
	var v_rel: Vector3 = ball.vel - v_car
	var vn: float = v_rel.dot(n)
	if vn >= 0.0:
		return
	# Rigid-body impulse (car inertia scaled by mass).
	var rn: Vector3 = r_car.cross(n)
	var ang_term: float = n.dot(car.inv_inertia(rn).cross(r_car)) / mc
	var j: float = -(1.0 + cfg.car_ball_restitution) * vn / (1.0 / mb + 1.0 / mc + ang_term)
	ball.vel += n * (j / mb)
	car.apply_impulse(-n * (j / mc), contact)
	# Spin from tangential slip.
	var vt: Vector3 = v_rel - n * vn
	ball.ang_vel += (-n * ball.radius).cross(vt * 0.35) / (0.4 * ball.radius * ball.radius) * 0.1

	# Extra "hit" impulse that gives the game its punchy, controllable feel.
	var fresh_touch: bool = not _touch_cooldown.has(car.id)
	if fresh_touch:
		var dir_local: Vector3 = car.basis.transposed() * (ball.pos - car.pos)
		dir_local.y *= cfg.hit_vertical_scale
		var hit_dir: Vector3 = (car.basis * dir_local).normalized()
		var rel_speed: float = minf(v_rel.length(), 46.0)
		var extra: float = rel_speed * cfg.hit_scale_at(rel_speed) * cfg.hit_power_scale
		ball.vel += hit_dir * extra
	_touch_cooldown[car.id] = 2
	ball._clamp()

	if fresh_touch:
		if last_touch_car != car.id:
			prev_touch_car = last_touch_car
		last_touch_car = car.id
		last_touch_time = time
		events.append({"type": "ball_hit", "car": car.id, "team": car.team,
			"strength": -vn, "pos": contact})
		if homing_enabled:
			ball.homing_target_z = (cfg.arena_half_length + 4.0) * (1.0 if car.team == 0 else -1.0)
			ball.homing_speed = maxf(homing_base_speed, ball.homing_speed + homing_speed_step)
			ball.homing_strength = 1.6


# ------------------------------------------------------------- car vs car
static func _closest_segments(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3) -> Array:
	var d1: Vector3 = q1 - p1
	var d2: Vector3 = q2 - p2
	var r: Vector3 = p1 - p2
	var a: float = d1.dot(d1)
	var e: float = d2.dot(d2)
	var f: float = d2.dot(r)
	var s: float = 0.0
	var t: float = 0.0
	var c: float = d1.dot(r)
	var b: float = d1.dot(d2)
	var denom: float = a * e - b * b
	if denom > 1e-8:
		s = clampf((b * f - c * e) / denom, 0.0, 1.0)
	t = (b * s + f) / e
	if t < 0.0:
		t = 0.0
		s = clampf(-c / a, 0.0, 1.0)
	elif t > 1.0:
		t = 1.0
		s = clampf((b - c) / a, 0.0, 1.0)
	return [p1 + d1 * s, p2 + d2 * t]


func _capsule(car: CarBody) -> Array:
	var c: Vector3 = car.hitbox_center()
	var f: Vector3 = car.forward() * cfg.car_capsule_half_length
	return [c - f, c + f]


func _collide_cars() -> void:
	var n_cars: int = cars.size()
	for i in n_cars:
		var a: CarBody = cars[i]
		if a.demolished:
			continue
		for k in range(i + 1, n_cars):
			var b: CarBody = cars[k]
			if b.demolished:
				continue
			if a.pos.distance_squared_to(b.pos) > 9.0:
				continue
			var ca: Array = _capsule(a)
			var cb: Array = _capsule(b)
			var pts: Array = _closest_segments(ca[0], ca[1], cb[0], cb[1])
			var pa: Vector3 = pts[0]
			var pb: Vector3 = pts[1]
			var diff: Vector3 = pb - pa
			var dist: float = diff.length()
			var min_d: float = cfg.car_capsule_radius * 2.0
			if dist >= min_d:
				continue
			var n: Vector3 = diff / dist if dist > 1e-5 else Vector3.UP
			var pen: float = min_d - dist
			a.pos -= n * pen * 0.5
			b.pos += n * pen * 0.5
			var vrel: float = (b.vel - a.vel).dot(n)
			if vrel >= 0.0:
				continue
			# Demolition / bump: the car driving into the other with its nose.
			if _try_demo_or_bump(a, b, n):
				continue
			if _try_demo_or_bump(b, a, -n):
				continue
			var j: float = -(1.0 + cfg.bump_restitution) * vrel * 0.5
			a.vel -= n * j
			b.vel += n * j


## `n` points from attacker to victim. Returns true if handled.
func _try_demo_or_bump(attacker: CarBody, victim: CarBody, n: Vector3) -> bool:
	var fwd: Vector3 = attacker.forward()
	if fwd.dot(n) < 0.6:
		return false
	var closing: float = (attacker.vel - victim.vel).dot(n)
	if closing < 4.0:
		return false
	if cfg.demolition_enabled and attacker.supersonic and attacker.team != victim.team:
		victim.demolish()
		events.append({"type": "demolition", "attacker": attacker.id, "victim": victim.id, "pos": victim.pos})
		return true
	var extra: float = cfg.bump_extra_speed * clampf(closing / cfg.max_speed, 0.0, 1.0)
	victim.vel += n * (closing * 0.8 + extra) + Vector3.UP * extra * 0.35
	attacker.vel -= n * closing * 0.35
	events.append({"type": "bump", "attacker": attacker.id, "victim": victim.id, "pos": victim.pos})
	return true


# ------------------------------------------------------------------ pads
func _update_pads(dt: float) -> void:
	for pad in pads:
		if not pad.active():
			pad.timer -= dt
			continue
		for car in cars:
			if car.demolished or (car.boost >= 100.0 and not cfg.unlimited_boost):
				continue
			var dx: float = car.pos.x - pad.pos.x
			var dz: float = car.pos.z - pad.pos.z
			if dx * dx + dz * dz > pad.radius * pad.radius or car.pos.y > (1.68 if pad.big else 1.65):
				continue
			car.boost = 100.0 if pad.big else minf(100.0, car.boost + cfg.small_pad_amount)
			pad.timer = pad.respawn
			events.append({"type": "boost_pickup", "car": car.id, "big": pad.big, "pos": pad.pos})
			break


# ------------------------------------------------------------------ setup
## Standard kickoff spots for one team (z negative side for team 0).
static func kickoff_spots(team: int) -> Array[Vector3]:
	var s: float = -1.0 if team == 0 else 1.0
	return [
		Vector3(-20.48 * s, 0.17, 25.6 * s), Vector3(20.48 * s, 0.17, 25.6 * s),
		Vector3(-2.56 * s, 0.17, 38.4 * s), Vector3(2.56 * s, 0.17, 38.4 * s),
		Vector3(0.0, 0.17, 46.08 * s)]


## Places all cars in kickoff positions. `variant` picks the spot permutation.
func setup_kickoff(variant: int) -> void:
	ball.reset()
	reset_pads()
	last_touch_car = -1
	prev_touch_car = -1
	ball.homing_speed = 0.0
	for team in [0, 1]:
		var spots: Array[Vector3] = kickoff_spots(team)
		var order: Array = [variant % 5, (variant + 2) % 5, (variant + 4) % 5, (variant + 1) % 5, (variant + 3) % 5]
		var idx: int = 0
		for car in cars:
			if car.team != team:
				continue
			var p: Vector3
			if idx < 5:
				p = spots[order[idx]]
			else:
				p = Vector3((idx - 4) * 6.0, 0.17, (cfg.arena_half_length - 6.0) * (-1.0 if team == 0 else 1.0))
			idx += 1
			var to_ball := Vector3(-p.x, 0.0, -p.z)
			var b := Basis.looking_at(to_ball.normalized(), Vector3.UP)
			car.set_transform(p, b)
			car.boost = cfg.boost_start
			car.demolished = false
			car.controls.reset()


func get_snapshot() -> Dictionary:
	var cs: Array = []
	for c in cars:
		cs.append(c.get_snapshot())
	var ps: PackedFloat32Array = PackedFloat32Array()
	for p in pads:
		ps.append(p.timer)
	return {"tick": tick, "time": time, "ball": ball.get_snapshot(), "cars": cs, "pads": ps}


func apply_snapshot(s: Dictionary) -> void:
	tick = s.get("tick", tick)
	time = s.get("time", time)
	ball.apply_snapshot(s.get("ball", {}))
	var cs: Array = s.get("cars", [])
	for i in mini(cs.size(), cars.size()):
		cars[i].apply_snapshot(cs[i])
	var ps: PackedFloat32Array = s.get("pads", PackedFloat32Array())
	for i in mini(ps.size(), pads.size()):
		pads[i].timer = ps[i]
