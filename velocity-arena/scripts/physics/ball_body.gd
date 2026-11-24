class_name BallBody
extends RefCounted
## Spherical ball with linear + angular momentum, restitution, rolling
## friction and drag. Collides with the arena SDF; car contacts are resolved
## by SimWorld.

var cfg: PhysicsConfig
var pos := Vector3(0.0, 0.9125, 0.0)
var vel := Vector3.ZERO
var ang_vel := Vector3.ZERO
var basis := Basis.IDENTITY
var radius: float = 0.9125
var mass: float = 30.0
## Optional homing behaviour (used by the "Rastreador" mode). 0 = off.
var homing_target_z: float = 0.0
var homing_strength: float = 0.0
var homing_speed: float = 0.0

## Last arena impact speed this tick (for audio/FX); reset every step.
var last_bounce_speed: float = 0.0
var touching_ground: bool = false


func _init(p_cfg: PhysicsConfig) -> void:
	cfg = p_cfg
	radius = cfg.ball_radius
	mass = cfg.ball_mass
	pos = Vector3(0.0, radius, 0.0)


func reset(p: Vector3 = Vector3.INF) -> void:
	pos = Vector3(0.0, radius, 0.0) if p == Vector3.INF else p
	vel = Vector3.ZERO
	ang_vel = Vector3.ZERO
	homing_strength = 0.0
	homing_target_z = 0.0


func step(dt: float, arena: ArenaShape) -> void:
	last_bounce_speed = 0.0
	vel.y -= cfg.gravity * cfg.ball_gravity_scale * dt
	if homing_strength > 0.0:
		_apply_homing(dt)
	vel *= maxf(0.0, 1.0 - cfg.ball_drag * dt)
	pos += vel * dt
	touching_ground = false
	for _iter in 2:
		var d: float = arena.distance(pos) - radius
		if d >= 0.0:
			break
		var n: Vector3 = arena.normal(pos)
		pos += n * (-d)
		var vn: float = vel.dot(n)
		if n.y > 0.7:
			touching_ground = true
		if vn >= 0.0:
			continue
		last_bounce_speed = maxf(last_bounce_speed, -vn)
		var e: float = cfg.ball_restitution if -vn > 0.6 else 0.0
		vel -= n * vn * (1.0 + e)
		# Friction at the contact point couples linear and angular velocity
		# (solid sphere, I = 0.4 m r^2) so the ball rolls and spins naturally.
		var r_c: Vector3 = -n * radius
		var u: Vector3 = vel + ang_vel.cross(r_c)
		u -= n * u.dot(n)
		var u_len: float = u.length()
		if u_len > 1e-5:
			var j_max: float = cfg.ball_friction * (1.0 + e) * (-vn)
			var j: Vector3 = -u / 3.5
			if j.length() > j_max:
				j = j.normalized() * j_max
			vel += j
			ang_vel += r_c.cross(j) / (0.4 * radius * radius)
	_clamp()
	var w: float = ang_vel.length()
	if w > 1e-6:
		basis = Basis(ang_vel / w, w * dt) * basis
		basis = basis.orthonormalized()


func _apply_homing(dt: float) -> void:
	# Steer the velocity toward the target goal while keeping speed >= homing_speed.
	var target := Vector3(0.0, cfg.goal_height * 0.4, homing_target_z)
	var to_t: Vector3 = (target - pos).normalized()
	var s: float = maxf(vel.length(), homing_speed)
	var desired: Vector3 = to_t * s
	vel = vel.lerp(desired, clampf(homing_strength * dt, 0.0, 1.0))
	vel.y += cfg.gravity * cfg.ball_gravity_scale * dt * 0.85  # mostly cancels gravity


func _clamp() -> void:
	if vel.length() > cfg.ball_max_speed:
		vel = vel.normalized() * cfg.ball_max_speed
	if ang_vel.length() > cfg.ball_max_angular_speed:
		ang_vel = ang_vel.normalized() * cfg.ball_max_angular_speed


func get_snapshot() -> Dictionary:
	return {"pos": pos, "vel": vel, "ang_vel": ang_vel}


func apply_snapshot(s: Dictionary) -> void:
	pos = s.get("pos", pos)
	vel = s.get("vel", vel)
	ang_vel = s.get("ang_vel", ang_vel)


## Pure prediction of the ball path ignoring cars. Returns positions every
## `step_dt` seconds for `duration` seconds. Used by bots.
static func predict(cfg_p: PhysicsConfig, arena: ArenaShape, p: Vector3, v: Vector3, w: Vector3,
		duration: float, step_dt: float) -> PackedVector3Array:
	var b := BallBody.new(cfg_p)
	b.pos = p
	b.vel = v
	b.ang_vel = w
	var out := PackedVector3Array()
	var t: float = 0.0
	var sub: int = maxi(1, int(round(step_dt * 120.0)))
	var sub_dt: float = step_dt / float(sub)
	while t < duration:
		for i in sub:
			b.step(sub_dt, arena)
		out.append(b.pos)
		t += step_dt
	return out
