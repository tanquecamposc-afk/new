class_name BotController
extends RefCounted
## Computer-controlled player.
##
## Bots only ever write CarControls, exactly like a human client, so they
## obey the same physics (no teleporting, no hidden information beyond the
## shared world state). Decision making combines:
##  * a shared ball-trajectory prediction (per world, refreshed ~20 Hz);
##  * team role assignment (attacker / support / defender);
##  * a finite-state machine (kickoff, attack, aerial, defend, support,
##    recover) whose states are scored by simple utilities.
## Difficulty (1..7) changes reaction time, aim error, boost use, and which
## mechanics (dodges, jump shots, aerials) the bot is allowed to attempt.

enum State { KICKOFF, ATTACK, AERIAL, DEFEND, SUPPORT, RECOVER }

const DIFFICULTY_NAMES_ES := ["", "Principiante", "Novato", "Intermedio", "Profesional", "Experto", "Élite", "Maestro"]
const DIFFICULTY_NAMES_EN := ["", "Beginner", "Rookie", "Intermediate", "Professional", "Expert", "Elite", "Master"]
const REACTION := [0.0, 0.40, 0.30, 0.22, 0.15, 0.11, 0.08, 0.05]
const AIM_ERROR := [0.0, 0.55, 0.40, 0.28, 0.17, 0.10, 0.05, 0.02]
const BOOST_USE := [0.0, 0.15, 0.35, 0.6, 0.8, 0.9, 1.0, 1.0]
const MAX_THROTTLE := [0.0, 0.75, 0.85, 1.0, 1.0, 1.0, 1.0, 1.0]

const PRED_STEP := 1.0 / 30.0
const PRED_TIME := 4.0

var car: CarBody
var world: SimWorld
var difficulty: int = 3
var state: int = State.KICKOFF
var role: String = "attack"
var c := CarControls.new()

var _rng := RandomNumberGenerator.new()
var _replan_timer: float = 0.0
var _target := Vector3.ZERO
var _target_time: float = 1.0
var _aim_offset: float = 0.0
var _jump_timer: float = -1.0
var _dodge_dir := Vector2.ZERO
var _aerial_timer: float = 0.0
var _stuck_timer: float = 0.0
var _kickoff_flipped: bool = false

# Shared ball prediction per world: world -> {"tick": int, "path": PackedVector3Array}
static var _pred_cache: Dictionary = {}


func _init(p_car: CarBody, p_world: SimWorld, p_difficulty: int = 3, seed_value: int = 0) -> void:
	car = p_car
	world = p_world
	difficulty = clampi(p_difficulty, 1, 7)
	_rng.seed = seed_value * 7919 + 17


static func difficulty_name(d: int, lang: String) -> String:
	d = clampi(d, 1, 7)
	return DIFFICULTY_NAMES_ES[d] if lang == "es" else DIFFICULTY_NAMES_EN[d]


# ------------------------------------------------------------ helpers
func _own_goal_z() -> float:
	return -world.cfg.arena_half_length if car.team == 0 else world.cfg.arena_half_length


func _opp_goal_z() -> float:
	return -_own_goal_z()


func _attack_sign() -> float:
	return 1.0 if car.team == 0 else -1.0


func prediction() -> PackedVector3Array:
	var key: int = world.get_instance_id()
	var entry: Dictionary = _pred_cache.get(key, {})
	if entry.is_empty() or world.tick - int(entry["tick"]) >= 6 or world.tick < int(entry["tick"]):
		var path: PackedVector3Array = BallBody.predict(world.cfg, world.arena, world.ball.pos,
			world.ball.vel, world.ball.ang_vel, PRED_TIME, PRED_STEP)
		entry = {"tick": world.tick, "path": path}
		_pred_cache[key] = entry
	return entry["path"]


static func clear_cache() -> void:
	_pred_cache.clear()


func _local(p: Vector3) -> Vector3:
	return car.basis.transposed() * (p - car.pos)


func _angle_to(p: Vector3) -> float:
	var l: Vector3 = _local(p)
	return atan2(l.x, -l.z)


func _is_kickoff() -> bool:
	var b: BallBody = world.ball
	return Vector2(b.pos.x, b.pos.z).length() < 0.5 and b.vel.length() < 0.5


# ------------------------------------------------------------ main loop
func update(dt: float) -> void:
	if car.demolished:
		car.controls.reset()
		return
	_replan_timer -= dt
	if _replan_timer <= 0.0:
		_replan_timer = REACTION[difficulty] * _rng.randf_range(0.7, 1.3)
		_plan()
	c.reset()
	match state:
		State.KICKOFF:
			_do_kickoff(dt)
		State.ATTACK:
			_do_attack(dt)
		State.AERIAL:
			_do_aerial(dt)
		State.DEFEND:
			_do_defend(dt)
		State.SUPPORT:
			_do_support(dt)
		State.RECOVER:
			_do_recover()
	_handle_jump_sequence(dt)
	_unstick(dt)
	c.clamp_values()
	car.controls.copy_from(c)


func _plan() -> void:
	if state == State.AERIAL and _aerial_timer > 0.0:
		return
	if car.wheel_contacts == 0 and not car.on_ground and car.pos.y > 1.2 and state != State.AERIAL:
		state = State.RECOVER
		return
	_assign_role()
	if _is_kickoff():
		state = State.KICKOFF if role == "attack" else State.SUPPORT
		if role == "defend":
			state = State.DEFEND
		return
	_kickoff_flipped = false
	var threat: bool = _ball_threatens_own_goal()
	if role == "attack":
		state = State.ATTACK
		if threat and _is_wrong_side() and difficulty >= 3:
			state = State.DEFEND
	elif role == "defend" or threat:
		state = State.DEFEND if not (threat and role == "attack") else State.ATTACK
	else:
		state = State.SUPPORT
	_aim_offset = _rng.randf_range(-AIM_ERROR[difficulty], AIM_ERROR[difficulty])
	if state == State.ATTACK:
		_choose_intercept()


func _assign_role() -> void:
	var mates: Array[CarBody] = []
	for other in world.cars:
		if other.team == car.team and not other.demolished:
			mates.append(other)
	if mates.size() <= 1:
		role = "attack"
		return
	# Rank by "time" to the ball, penalising cars that are on the wrong side.
	var ranked: Array = []
	for m in mates:
		var d: float = m.pos.distance_to(world.ball.pos)
		var wrong: float = (world.ball.pos.z - m.pos.z) * _attack_sign()
		var penalty: float = 0.0 if wrong > -2.0 else 15.0
		ranked.append([d + penalty - m.vel.dot((world.ball.pos - m.pos).normalized()) * 0.5, m.id])
	ranked.sort_custom(func(a, b): return a[0] < b[0])
	var idx: int = 0
	for i in ranked.size():
		if ranked[i][1] == car.id:
			idx = i
	if idx == 0:
		role = "attack"
	elif idx == ranked.size() - 1:
		role = "defend"
	else:
		role = "support"


func _ball_threatens_own_goal() -> bool:
	var path: PackedVector3Array = prediction()
	var own_side: int = -1 if car.team == 0 else 1
	for i in range(0, path.size(), 3):
		if world.arena.goal_side(path[i], world.ball.radius) == own_side:
			return true
	var b: Vector3 = world.ball.pos
	return (b.z - _own_goal_z()) * _attack_sign() < 25.0 and world.ball.vel.z * _attack_sign() < -5.0


func _is_wrong_side() -> bool:
	return (world.ball.pos.z - car.pos.z) * _attack_sign() < -1.0


# ------------------------------------------------------------ intercept
func _choose_intercept() -> void:
	var path: PackedVector3Array = prediction()
	if path.is_empty():
		_target = world.ball.pos
		_target_time = 0.1
		return
	var boost_ok: bool = car.boost > 10.0 and BOOST_USE[difficulty] > 0.3
	var speed_est: float = minf(23.0, maxf(car.vel.length(), 11.0) + (5.0 if boost_ok else 1.5))
	# Fixed-point iteration: time to reach the ball <-> where the ball will be.
	var t: float = 0.0
	var p: Vector3 = world.ball.pos
	for k in 5:
		var flat: float = Vector2(p.x - car.pos.x, p.z - car.pos.z).length()
		t = clampf(flat / speed_est + absf(_angle_to(p)) * 0.25, 0.0, PRED_TIME - PRED_STEP)
		p = _pred_at(path, t)
	# Ball too high for a ground touch: wait for a lower point, or go aerial.
	if p.y > 2.6:
		var aerial_ok: bool = difficulty >= 4 and car.boost > 35.0 and car.on_ground
		var i0: int = clampi(int(t / PRED_STEP), 0, path.size() - 1)
		for i in range(i0, path.size()):
			var ti: float = (i + 1) * PRED_STEP
			if aerial_ok and path[i].y < 11.0 and ti < 3.0 and _aerial_feasible(path[i], ti):
				_target = path[i]
				_target_time = ti
				state = State.AERIAL
				_aerial_timer = ti + 0.3
				_start_jump(false, true)
				return
			if path[i].y < 2.4:
				p = path[i]
				t = ti
				break
	_target = p
	_target_time = maxf(t, 0.05)


func _pred_at(path: PackedVector3Array, t: float) -> Vector3:
	var idx: int = clampi(int(round(t / PRED_STEP)) - 1, 0, path.size() - 1)
	if t < PRED_STEP * 0.5:
		return world.ball.pos
	return path[idx]


func _aerial_feasible(p: Vector3, t: float) -> bool:
	if absf(_angle_to(p)) > 0.5:
		return false
	var g := Vector3(0, -world.cfg.gravity, 0)
	var delta: Vector3 = p - car.pos - car.vel * t - 0.5 * g * t * t
	var needed: float = 2.0 * delta.length() / (t * t)
	var boost_time: float = car.boost / world.cfg.boost_consumption
	return needed < world.cfg.boost_accel * 0.8 and boost_time > t * 0.6


# ------------------------------------------------------------ behaviours
func _do_kickoff(_dt: float) -> void:
	var b: Vector3 = world.ball.pos
	var shot_dir := Vector3(0, 0, _attack_sign())
	var aim: Vector3 = b - shot_dir * 1.1
	_drive_to(aim, 23.0, true)
	var d: float = car.pos.distance_to(b)
	if difficulty >= 3 and not _kickoff_flipped and d < 6.5 + car.vel.length() * 0.05 and car.on_ground:
		_kickoff_flipped = true
		_start_jump(true, false, Vector2(1, 0))


func _do_attack(_dt: float) -> void:
	var opp_goal := Vector3(0.0, 1.0, _opp_goal_z())
	var b: Vector3 = _target
	var shot_dir: Vector3 = (opp_goal - b)
	shot_dir.y = 0.0
	shot_dir = shot_dir.normalized().rotated(Vector3.UP, _aim_offset)
	var dist: float = Vector2(b.x - car.pos.x, b.z - car.pos.z).length()
	# Approach from behind the ball relative to the shot direction.
	# If we're badly placed (ball between us and our goal is fine; ball behind us
	# is not), low-skill bots just hit it; better bots swing wider to line up.
	var facing_ok: float = (b - car.pos).normalized().dot(shot_dir)
	var offset: float = clampf(dist * 0.3, 0.4, 4.5) * clampf(1.0 - facing_ok, 0.25, 1.0)
	if difficulty <= 2:
		offset *= 0.4
	var approach: Vector3 = b - shot_dir * (world.ball.radius * 0.7 + offset)
	if dist < 6.0:
		approach = b - shot_dir * world.ball.radius * 0.5
	approach.x = clampf(approach.x, -world.cfg.arena_half_width + 2.0, world.cfg.arena_half_width - 2.0)
	approach.z = clampf(approach.z, -world.cfg.arena_half_length + 1.0, world.cfg.arena_half_length - 1.0)
	var desired_speed: float = clampf(dist / maxf(_target_time, 0.15), 6.0, 23.0)
	if dist < 8.0:
		desired_speed = 23.0
	_drive_to(approach, desired_speed, true)
	# Finishing touches: dodge into the ball or jump for a bouncing ball.
	var ball_now: Vector3 = world.ball.pos
	var close: float = car.pos.distance_to(ball_now)
	var ang: float = absf(_angle_to(ball_now))
	if car.on_ground and _jump_timer < 0.0:
		if difficulty >= 2 and close < 3.6 and ang < 0.35 and ball_now.y < 1.6 and car.vel.length() > 6.0:
			var l: Vector3 = _local(ball_now)
			_start_jump(true, false, Vector2(1.0, clampf(l.x * 0.8, -1.0, 1.0)))
		elif difficulty >= 2 and close < 4.0 and ball_now.y > 1.8 and ball_now.y < 4.0 and ang < 0.4:
			_start_jump(difficulty >= 4, false, Vector2(1, 0))


func _do_aerial(dt: float) -> void:
	_aerial_timer -= dt
	if _aerial_timer <= 0.0 or (car.on_ground and _jump_timer < 0.0 and _aerial_timer < _target_time - 0.5):
		state = State.RECOVER if not car.on_ground else State.ATTACK
		return
	var t: float = maxf(_aerial_timer - 0.3, 0.05)
	# Re-target onto the live prediction for the same time.
	var path: PackedVector3Array = prediction()
	var idx: int = clampi(int(t / PRED_STEP) - 1, 0, path.size() - 1)
	var p: Vector3 = path[idx] if path.size() > 0 else world.ball.pos
	var opp_goal := Vector3(0.0, 3.0, _opp_goal_z())
	p -= (opp_goal - p).normalized() * world.ball.radius * 0.7
	var g := Vector3(0, -world.cfg.gravity, 0)
	var delta: Vector3 = p - car.pos - car.vel * t - 0.5 * g * t * t
	var dir: Vector3 = delta.normalized() if delta.length() > 0.3 else (p - car.pos).normalized()
	if car.wheel_contacts == 0:
		_orient_toward(dir, Vector3.UP)
		c.boost = car.forward().dot(dir) > 0.75 and delta.length() > 0.5
	c.throttle = 1.0


func _do_defend(_dt: float) -> void:
	var goal := Vector3(0.0, 0.0, _own_goal_z())
	var b: Vector3 = world.ball.pos
	var inside: Vector3 = goal + Vector3(clampf(b.x * 0.3, -6.0, 6.0), 0.0, _attack_sign() * 4.0)
	var car_to_goal: float = car.pos.distance_to(goal)
	var ball_to_goal: float = b.distance_to(goal)
	if car_to_goal < ball_to_goal - 3.0 and car.pos.distance_to(b) < 18.0:
		# Goal-side and close: challenge / clear toward the side wall.
		var clear_dir := Vector3(signf(b.x) if absf(b.x) > 1.0 else 1.0, 0.0, _attack_sign()).normalized()
		_drive_to(b - clear_dir * (world.ball.radius + 0.8), 23.0, true)
		var ang: float = absf(_angle_to(b))
		if car.on_ground and _jump_timer < 0.0 and car.pos.distance_to(b) < 3.5 and ang < 0.5 and difficulty >= 2:
			if b.y < 1.8:
				_start_jump(true, false, Vector2(1, 0))
			elif b.y < 4.0:
				_start_jump(false, false)
	elif (b.z - _own_goal_z()) * _attack_sign() > 55.0 and not _ball_threatens_own_goal():
		# Ball far away in the rival half: hold a deep "last man" spot and refuel.
		_do_support(_dt, 34.0)
	else:
		# Retreat to the goal, then face the ball.
		var d: float = Vector2(inside.x - car.pos.x, inside.z - car.pos.z).length()
		if d > 3.0:
			_drive_to(inside, 23.0, d > 20.0)
		else:
			c.throttle = 0.0
			var ang: float = _angle_to(b)
			if absf(ang) > 0.4:
				c.throttle = 0.4
				c.steer = signf(ang)
				c.handbrake = absf(ang) > 1.5


func _do_support(_dt: float, depth: float = 22.0) -> void:
	var b: Vector3 = world.ball.pos
	# Low on boost: grab the nearest active pad on our side of the ball.
	if car.boost < 40.0 and BOOST_USE[difficulty] > 0.3:
		var best: SimWorld.BoostPad = null
		var best_d: float = 1e9
		for pad in world.pads:
			if not pad.active():
				continue
			var d: float = pad.pos.distance_to(car.pos) * (1.0 if pad.big else 2.2)
			if d < best_d and (pad.pos.z - b.z) * _attack_sign() < 5.0:
				best_d = d
				best = pad
		if best != null and best_d < 45.0:
			_drive_to(best.pos, 23.0, false)
			return
	var spot := Vector3(b.x * 0.5, 0.0, b.z - _attack_sign() * depth)
	spot.z = clampf(spot.z, -world.cfg.arena_half_length + 6.0, world.cfg.arena_half_length - 6.0)
	var d2: float = car.pos.distance_to(spot)
	if d2 > 4.0:
		_drive_to(spot, clampf(d2, 5.0, 20.0), d2 > 25.0)
	else:
		c.throttle = 0.2
		c.steer = clampf(_angle_to(b) * 2.0, -1.0, 1.0)


func _do_recover() -> void:
	if car.wheel_contacts > 0 or car.on_ground:
		state = State.ATTACK
		_plan()
		return
	var flat_v := Vector3(car.vel.x, 0.0, car.vel.z)
	var fwd_target: Vector3 = flat_v.normalized() if flat_v.length() > 2.0 else Vector3(car.forward().x, 0.0, car.forward().z).normalized()
	if fwd_target.length_squared() < 0.1:
		fwd_target = Vector3.FORWARD
	# Land on whatever surface is below / ahead.
	var land_up := Vector3.UP
	var probe: Vector3 = car.pos + car.vel * 0.4
	if world.arena.distance(probe) < 3.0:
		land_up = world.arena.normal(probe)
	fwd_target = (fwd_target - land_up * fwd_target.dot(land_up)).normalized()
	_orient_toward(fwd_target, land_up)
	c.throttle = 1.0


# ------------------------------------------------------------ low level
func _drive_to(p: Vector3, desired_speed: float, allow_boost: bool) -> void:
	var ang: float = _angle_to(p)
	var dist: float = car.pos.distance_to(p)
	c.steer = clampf(ang * 3.2, -1.0, 1.0)
	var fwd_speed: float = car.vel.dot(car.forward())
	c.throttle = clampf((desired_speed - fwd_speed) * 0.6 + 0.3, -1.0, 1.0) * MAX_THROTTLE[difficulty]
	if absf(ang) > 1.7 and fwd_speed > 6.0 and dist < 25.0:
		c.handbrake = true
	if absf(ang) > 2.6 and dist < 4.0:
		# Target right behind: reverse toward it.
		c.throttle = -1.0
		c.steer = -signf(ang)
	var want_boost: bool = allow_boost and absf(ang) < 0.25 and desired_speed > fwd_speed + 2.0 and fwd_speed < 22.5
	if want_boost and car.on_ground and _rng.randf() < BOOST_USE[difficulty] + 0.05:
		c.boost = true
	if car.wheel_contacts == 0 and state != State.AERIAL:
		_do_recover()


## PD orientation control: nose along `fwd_dir`, roof toward `up_dir`.
func _orient_toward(fwd_dir: Vector3, up_dir: Vector3) -> void:
	var cur_f: Vector3 = car.forward()
	var cur_u: Vector3 = car.up()
	var err_f: Vector3 = cur_f.cross(fwd_dir)
	var err_u: Vector3 = cur_u.cross(up_dir) * 0.6
	var err_local: Vector3 = car.basis.transposed() * (err_f + err_u * maxf(0.2, cur_f.dot(fwd_dir)))
	var w_local: Vector3 = car.basis.transposed() * car.ang_vel
	var kp: float = 4.5
	var kd: float = 0.9
	c.pitch = clampf(kp * err_local.x - kd * w_local.x, -1.0, 1.0)
	c.yaw = clampf(-(kp * err_local.y - kd * w_local.y), -1.0, 1.0)
	c.roll = clampf(-(kp * err_local.z - kd * w_local.z) * 0.6, -1.0, 1.0)


## Starts a jump sequence: optional dodge (`dodge`), or a double jump for aerials.
func _start_jump(dodge: bool, double_jump: bool, dodge_dir: Vector2 = Vector2(1, 0)) -> void:
	if _jump_timer >= 0.0:
		return
	_jump_timer = 0.0
	_dodge_dir = dodge_dir if dodge else Vector2.ZERO
	_aerial_jump = double_jump


var _aerial_jump: bool = false


func _handle_jump_sequence(dt: float) -> void:
	if _jump_timer < 0.0:
		return
	_jump_timer += dt
	var t: float = _jump_timer
	if _aerial_jump:
		# Hold first jump 0.2 s, release, double jump, then aerial control.
		c.jump = t < 0.2 or (t > 0.25 and t < 0.3)
		if t > 0.35:
			_jump_timer = -1.0
		return
	if _dodge_dir == Vector2.ZERO:
		c.jump = t < 0.18
		if t > 0.6:
			_jump_timer = -1.0
		return
	# Dodge: short jump, release, then jump again with stick direction.
	if t < 0.08:
		c.jump = true
	elif t < 0.12:
		c.jump = false
	elif t < 0.17:
		c.jump = true
		c.pitch = -_dodge_dir.x
		c.yaw = _dodge_dir.y
		c.steer = _dodge_dir.y
	else:
		c.jump = false
		c.pitch = -_dodge_dir.x
		if t > 0.75:
			_jump_timer = -1.0


var _unstick_phase: float = 0.0


func _unstick(dt: float) -> void:
	# "No progress" detector: wheels down, trying to move, but barely moving.
	if _unstick_phase > 0.0:
		_unstick_phase -= dt
		c.throttle = -1.0
		c.steer = 1.0
		c.boost = false
		if _unstick_phase < 0.25 and car.on_ground:
			_start_jump(false, false)
		return
	var trying: bool = absf(c.throttle) > 0.3 or state == State.ATTACK
	if car.wheel_contacts > 0 and car.vel.length() < 2.0 and trying:
		_stuck_timer += dt
	else:
		_stuck_timer = maxf(0.0, _stuck_timer - dt * 2.0)
	if _stuck_timer > 0.9:
		_stuck_timer = 0.0
		_unstick_phase = 0.9
	# Turtled on the roof: jump to flip back.
	if car.body_contact and car.wheel_contacts == 0 and car.up().dot(car.body_contact_normal) < 0.2:
		c.jump = int(world.time * 4.0) % 2 == 0
