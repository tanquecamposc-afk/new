class_name CarBody
extends RefCounted
## Custom arcade rigid-body vehicle.
##
## Forward is -Z in car-local space, up is +Y, right is +X.
## Ground handling uses four suspension rays against the arena SDF; jumps,
## dodges, flips, air control and boost are explicit, data-driven forces so
## advanced mechanics (fast aerials, half-flips, wave dashes, flip resets,
## flip cancels, wall play) emerge from consistent rules.

const WHEEL_COUNT := 4

var id: int = 0
var team: int = 0
var cfg: PhysicsConfig

var pos := Vector3.ZERO
var vel := Vector3.ZERO
var basis := Basis.IDENTITY
var ang_vel := Vector3.ZERO
var boost: float = 33.0
var controls := CarControls.new()
var _prev_jump: bool = false

# --- Wheel state (parallel arrays, index = wheel) ---
var wheel_hit := PackedByteArray([0, 0, 0, 0])
var wheel_dist := PackedFloat32Array([0, 0, 0, 0])
var wheel_normal: Array[Vector3] = [Vector3.UP, Vector3.UP, Vector3.UP, Vector3.UP]
var wheel_on_ball := PackedByteArray([0, 0, 0, 0])

# --- Movement state ---
var wheel_contacts: int = 0
var on_ground: bool = false
var contact_normal := Vector3.UP
var body_contact: bool = false
var body_contact_normal := Vector3.UP
var has_jumped: bool = false
var is_jumping: bool = false
var jump_timer: float = 0.0
var has_flip: bool = false
var time_since_jump: float = 0.0
var flip_reset: bool = false
var is_flipping: bool = false
var flip_time: float = 0.0
var flip_dir := Vector2.ZERO   ## x = forward component, y = right component
var flip_cancelled: bool = false
var has_double_jumped: bool = false
var airborne_time: float = 0.0
var ground_time: float = 0.0
var supersonic: bool = false
var boosting: bool = false
var powersliding: bool = false
var demolished: bool = false
var respawn_timer: float = 0.0

# --- Debug telemetry ---
var dbg_accel := Vector3.ZERO
var dbg_susp_force: float = 0.0
var dbg_collision_normal := Vector3.ZERO

var _hitbox_points: PackedVector3Array


func _init(p_cfg: PhysicsConfig, p_id: int = 0, p_team: int = 0) -> void:
	cfg = p_cfg
	id = p_id
	team = p_team
	boost = cfg.boost_start
	_build_hitbox_points()


func _build_hitbox_points() -> void:
	_hitbox_points = PackedVector3Array()
	var h: Vector3 = cfg.hitbox_half_extents
	for x in [-1.0, 0.0, 1.0]:
		for y in [-1.0, 0.0, 1.0]:
			for z in [-1.0, 0.0, 1.0]:
				if x == 0.0 and y == 0.0 and z == 0.0:
					continue
				_hitbox_points.append(cfg.hitbox_offset + Vector3(x * h.x, y * h.y, z * h.z))


# ---------------------------------------------------------------- helpers
func forward() -> Vector3:
	return -basis.z


func up() -> Vector3:
	return basis.y


func right() -> Vector3:
	return basis.x


func speed() -> float:
	return vel.length()


func hitbox_center() -> Vector3:
	return pos + basis * cfg.hitbox_offset


## Applies the inverse world-space inertia tensor (per unit mass) to `v`.
func inv_inertia(v: Vector3) -> Vector3:
	var local: Vector3 = basis.transposed() * v
	var i: Vector3 = cfg.inertia_per_mass
	return basis * Vector3(local.x / i.x, local.y / i.y, local.z / i.z)


## Velocity of a world point rigidly attached to the car.
func point_velocity(world_point: Vector3) -> Vector3:
	return vel + ang_vel.cross(world_point - pos)


## Applies an impulse (per unit car mass) at a world point.
func apply_impulse(impulse: Vector3, world_point: Vector3) -> void:
	vel += impulse
	ang_vel += inv_inertia((world_point - pos).cross(impulse))


func set_transform(p: Vector3, b: Basis) -> void:
	pos = p
	basis = b.orthonormalized()
	vel = Vector3.ZERO
	ang_vel = Vector3.ZERO
	_reset_air_state()


func _reset_air_state() -> void:
	has_jumped = false
	is_jumping = false
	has_flip = false
	flip_reset = false
	is_flipping = false
	flip_cancelled = false
	has_double_jumped = false
	jump_timer = 0.0
	time_since_jump = 0.0


func demolish() -> void:
	demolished = true
	respawn_timer = cfg.demolition_respawn_time
	vel = Vector3.ZERO
	ang_vel = Vector3.ZERO
	boosting = false
	supersonic = false


# ---------------------------------------------------------------- simulation
func step(dt: float, arena: ArenaShape, ball: BallBody) -> void:
	if demolished:
		respawn_timer -= dt
		return
	var c: CarControls = controls
	var jump_pressed: bool = c.jump and not _prev_jump
	_prev_jump = c.jump

	_update_wheels(arena, ball)
	var up_v: Vector3 = up()
	var fwd: Vector3 = forward()
	var rgt: Vector3 = right()

	var lin_acc := Vector3(0.0, -cfg.gravity, 0.0)
	var ang_acc := Vector3.ZERO

	# ---- Suspension ----
	dbg_susp_force = 0.0
	for i in WHEEL_COUNT:
		if wheel_hit[i] == 0:
			continue
		var anchor: Vector3 = pos + basis * cfg.wheel_anchors[i]
		var compression: float = cfg.suspension_rest - wheel_dist[i]
		var pv: Vector3 = point_velocity(anchor)
		var f: float = cfg.suspension_stiffness * compression - cfg.suspension_damping * pv.dot(up_v)
		if f <= 0.0:
			continue
		var force: Vector3 = up_v * f
		lin_acc += force
		ang_acc += inv_inertia((anchor - pos).cross(force))
		dbg_susp_force += f

	var grounded_now: bool = wheel_contacts >= 3
	# ---- Landing / leaving ground bookkeeping ----
	if grounded_now and not is_jumping:
		ground_time += dt
		if airborne_time > 0.05 or ground_time > 0.2:
			_reset_air_state()
		airborne_time = 0.0
	elif wheel_contacts == 0:
		if airborne_time == 0.0 and not has_jumped:
			# Rolled off a surface without jumping: one aerial jump/dodge allowed.
			has_flip = true
			time_since_jump = 0.0
		airborne_time += dt
		ground_time = 0.0
	on_ground = grounded_now

	# ---- Ground driving ----
	powersliding = false
	if wheel_contacts > 0:
		var frac: float = float(wheel_contacts) / float(WHEEL_COUNT)
		var n: Vector3 = contact_normal
		if not is_jumping:
			lin_acc -= n * cfg.sticky_accel
		var vf: float = vel.dot(fwd)
		var throttle: float = c.throttle
		if c.boost and (boost > 0.0 or cfg.unlimited_boost):
			throttle = 1.0
		var drive: float = 0.0
		if absf(throttle) > 0.01:
			if vf * throttle < 0.0 and absf(vf) > 0.05:
				drive = -signf(vf) * minf(cfg.brake_accel, absf(vf) / dt)
			else:
				drive = throttle * cfg.throttle_accel_at(absf(vf))
		else:
			drive = -signf(vf) * minf(cfg.coast_decel, absf(vf) / dt)
		lin_acc += fwd * drive * frac

		var vl: float = vel.dot(rgt)
		var fr: float = cfg.lateral_friction
		if c.handbrake:
			fr = cfg.powerslide_friction
			powersliding = absf(vl) > 2.0
		lin_acc -= rgt * vl * minf(fr, 1.0 / dt) * frac

		# Steering: drive yaw rate toward the speed-dependent target.
		var target_yaw: float = -c.steer * cfg.curvature_at(absf(vf)) * vf
		if c.handbrake:
			target_yaw *= cfg.powerslide_turn_bonus
		var w_up: float = ang_vel.dot(up_v)
		ang_vel += up_v * (target_yaw - w_up) * minf(1.0, cfg.steer_response * dt) * frac

		if grounded_now:
			# Surface alignment assist + damping of pitch/roll wobble.
			var axis: Vector3 = up_v.cross(n)
			var tilt_w: Vector3 = ang_vel - up_v * ang_vel.dot(up_v)
			ang_acc += axis * cfg.align_stiffness - tilt_w * cfg.align_damping

	# ---- Jumping ----
	if jump_pressed and grounded_now and not is_jumping and not has_jumped:
		vel += up_v * cfg.jump_impulse
		is_jumping = true
		has_jumped = true
		has_flip = true
		jump_timer = 0.0
		time_since_jump = 0.0
	elif jump_pressed and wheel_contacts == 0 and body_contact and up_v.dot(body_contact_normal) < 0.2:
		# Turtled / stuck on the roof or side: hop and roll back over.
		vel += body_contact_normal * 3.5
		ang_vel += fwd * 6.0
	elif jump_pressed and wheel_contacts == 0 and has_flip and (time_since_jump < cfg.flip_window or flip_reset):
		_start_second_jump(c, fwd, up_v)

	if is_jumping:
		jump_timer += dt
		if c.jump and jump_timer < cfg.jump_hold_time:
			lin_acc += up_v * cfg.jump_hold_accel
		elif jump_timer >= cfg.jump_min_time:
			is_jumping = false
	if has_jumped or has_flip:
		time_since_jump += dt

	# ---- Air control & flips ----
	if wheel_contacts == 0:
		ang_acc += _air_control(c, dt)
		lin_acc += fwd * c.throttle * cfg.air_throttle_accel
	if is_flipping:
		flip_time += dt
		if flip_time < cfg.dodge_vertical_damp_time and vel.y > 0.0:
			vel.y *= cfg.dodge_vertical_damp
		if flip_time >= cfg.flip_torque_time:
			is_flipping = false

	# ---- Boost ----
	boosting = c.boost and (boost > 0.0 or cfg.unlimited_boost)
	if boosting:
		lin_acc += fwd * cfg.boost_accel
		if not cfg.unlimited_boost:
			boost = maxf(0.0, boost - cfg.boost_consumption * dt)

	# ---- Integrate ----
	dbg_accel = lin_acc
	vel += lin_acc * dt
	ang_vel += ang_acc * dt
	if is_flipping:
		_apply_flip_rotation()
	if ang_vel.length() > cfg.max_angular_speed:
		ang_vel = ang_vel.normalized() * cfg.max_angular_speed
	if vel.length() > cfg.max_speed:
		vel = vel.normalized() * cfg.max_speed
	pos += vel * dt
	var w_len: float = ang_vel.length()
	if w_len > 1e-6:
		basis = Basis(ang_vel / w_len, w_len * dt) * basis
		basis = basis.orthonormalized()

	_resolve_arena(arena)

	var s: float = vel.length()
	if supersonic:
		supersonic = s >= cfg.supersonic_exit_speed
	else:
		supersonic = s >= cfg.supersonic_speed


func _start_second_jump(c: CarControls, fwd: Vector3, up_v: Vector3) -> void:
	has_flip = false
	flip_reset = false
	var d := Vector2(-c.pitch, c.yaw if absf(c.yaw) > absf(c.steer) else c.steer)
	if d.length() < cfg.dodge_deadzone:
		vel += up_v * cfg.double_jump_impulse
		has_double_jumped = true
		return
	d = d / maxf(absf(d.x), absf(d.y))  # map to unit square edge
	d = d.limit_length(1.0)
	var flat_fwd: Vector3 = Vector3(fwd.x, 0.0, fwd.z)
	if flat_fwd.length_squared() < 0.01:
		flat_fwd = Vector3(-up_v.x, 0.0, -up_v.z) * signf(fwd.y)
	if flat_fwd.length_squared() < 0.0001:
		flat_fwd = Vector3.FORWARD
	flat_fwd = flat_fwd.normalized()
	var flat_right: Vector3 = flat_fwd.cross(Vector3.UP).normalized()
	var fwd_speed: float = absf(vel.dot(flat_fwd))
	var fwd_imp: float = d.x * (cfg.dodge_impulse if d.x >= 0.0 else cfg.backflip_impulse)
	var side_imp: float = d.y * cfg.dodge_impulse * (1.0 + cfg.side_dodge_speed_bonus * fwd_speed / cfg.max_speed)
	vel += flat_fwd * fwd_imp + flat_right * side_imp
	if vel.y < 0.0:
		vel.y *= 0.5
	is_flipping = true
	flip_time = 0.0
	flip_dir = d
	flip_cancelled = false


func _apply_flip_rotation() -> void:
	var lw: Vector3 = basis.transposed() * ang_vel
	if not flip_cancelled and absf(flip_dir.x) > 0.1:
		# Front flip = nose down = negative rotation about local +X.
		lw.x = -flip_dir.x * cfg.flip_angular_speed
	if absf(flip_dir.y) > 0.1:
		lw.z = -flip_dir.y * cfg.flip_angular_speed
	ang_vel = basis * lw


func _air_control(c: CarControls, _dt: float) -> Vector3:
	var lw: Vector3 = basis.transposed() * ang_vel
	var p_in: float = c.pitch
	var y_in: float = c.yaw
	var r_in: float = c.roll
	if is_flipping:
		# Flip cancel: holding the stick opposite to the flip's pitch direction.
		if absf(flip_dir.x) > 0.1 and c.pitch * flip_dir.x > 0.5 * absf(flip_dir.x):
			flip_cancelled = true
	var a := Vector3.ZERO
	a.x = cfg.air_pitch_torque * p_in - cfg.air_pitch_damping * lw.x * (1.0 - absf(p_in))
	a.y = -cfg.air_yaw_torque * y_in - cfg.air_yaw_damping * lw.y * (1.0 - absf(y_in))
	a.z = -cfg.air_roll_torque * r_in - cfg.air_roll_damping * lw.z
	if is_flipping:
		if not flip_cancelled and absf(flip_dir.x) > 0.1:
			a.x = 0.0
		if absf(flip_dir.y) > 0.1:
			a.z = 0.0
	return basis * a


func _update_wheels(arena: ArenaShape, ball: BallBody) -> void:
	wheel_contacts = 0
	var n_sum := Vector3.ZERO
	var down: Vector3 = -up()
	for i in WHEEL_COUNT:
		var anchor: Vector3 = pos + basis * cfg.wheel_anchors[i]
		var d: float = arena.raycast(anchor, down, cfg.suspension_max)
		wheel_on_ball[i] = 0
		if ball != null:
			var bd: float = _ray_sphere(anchor, down, ball.pos, ball.radius)
			if bd >= 0.0 and bd <= cfg.suspension_max + 0.1:
				wheel_on_ball[i] = 1
		if d >= 0.0:
			wheel_hit[i] = 1
			wheel_dist[i] = d
			if d <= cfg.suspension_rest + 0.06:
				wheel_contacts += 1
				var nn: Vector3 = arena.normal(anchor + down * d)
				wheel_normal[i] = nn
				n_sum += nn
		else:
			wheel_hit[i] = 0
			wheel_dist[i] = cfg.suspension_max
	if wheel_contacts > 0:
		contact_normal = n_sum.normalized()
	else:
		contact_normal = up()
	# Flip reset: all four wheels touching the ball while airborne.
	if wheel_contacts == 0 and has_jumped and not has_flip:
		var on_ball: int = 0
		for i in WHEEL_COUNT:
			on_ball += wheel_on_ball[i]
		if on_ball >= 3:
			has_flip = true
			flip_reset = true


static func _ray_sphere(o: Vector3, d: Vector3, c: Vector3, r: float) -> float:
	var oc: Vector3 = o - c
	var b: float = oc.dot(d)
	var cc: float = oc.dot(oc) - r * r
	var disc: float = b * b - cc
	if disc < 0.0:
		return -1.0
	var t: float = -b - sqrt(disc)
	return t if t >= 0.0 else -1.0


func _resolve_arena(arena: ArenaShape) -> void:
	body_contact = false
	# Positional correction using the deepest penetrating hitbox sample.
	var deepest: float = 0.0
	var deep_n := Vector3.UP
	for lp in _hitbox_points:
		var wp: Vector3 = pos + basis * lp
		var d: float = arena.distance(wp)
		if d < deepest:
			deepest = d
			deep_n = arena.normal(wp)
	if deepest >= 0.0:
		return
	body_contact = true
	body_contact_normal = deep_n
	dbg_collision_normal = deep_n
	pos += deep_n * (-deepest)
	# Velocity response at every point that is touching.
	for lp in _hitbox_points:
		var wp: Vector3 = pos + basis * lp
		var d: float = arena.distance(wp)
		if d > 0.01:
			continue
		var n: Vector3 = arena.normal(wp)
		var r: Vector3 = wp - pos
		var pv: Vector3 = point_velocity(wp)
		var vn: float = pv.dot(n)
		if vn >= 0.0:
			continue
		var rn: Vector3 = r.cross(n)
		var denom: float = 1.0 + n.dot(inv_inertia(rn).cross(r))
		var j: float = -(1.0 + cfg.body_restitution) * vn / denom
		apply_impulse(n * j, wp)
		# Coulomb friction.
		var pv2: Vector3 = point_velocity(wp)
		var vt: Vector3 = pv2 - n * pv2.dot(n)
		var vt_len: float = vt.length()
		if vt_len > 1e-4:
			var t_dir: Vector3 = vt / vt_len
			var rt: Vector3 = r.cross(t_dir)
			var denom_t: float = 1.0 + t_dir.dot(inv_inertia(rt).cross(r))
			var jt: float = minf(vt_len / denom_t, cfg.body_friction * j)
			apply_impulse(-t_dir * jt, wp)


# ---------------------------------------------------------------- snapshots
func get_snapshot() -> Dictionary:
	return {
		"id": id, "team": team, "pos": pos, "vel": vel, "basis": basis,
		"ang_vel": ang_vel, "boost": boost, "demolished": demolished,
		"has_flip": has_flip, "has_jumped": has_jumped, "supersonic": supersonic,
		"boosting": boosting,
	}


func apply_snapshot(s: Dictionary) -> void:
	pos = s.get("pos", pos)
	vel = s.get("vel", vel)
	basis = s.get("basis", basis)
	ang_vel = s.get("ang_vel", ang_vel)
	boost = s.get("boost", boost)
	demolished = s.get("demolished", demolished)
	has_flip = s.get("has_flip", has_flip)
	has_jumped = s.get("has_jumped", has_jumped)
	supersonic = s.get("supersonic", supersonic)
	boosting = s.get("boosting", boosting)
