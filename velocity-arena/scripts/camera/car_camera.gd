class_name CarCamera
extends Camera3D
## Third-person chase camera with ball-cam, wall-aware up vector, arena
## collision avoidance, goal/replay orbit and optional shake.

enum Mode { CAR, BALL, ORBIT, FREE }

var target: CarBody
var ball: BallBody
var arena: ArenaShape
var mode: int = Mode.BALL
var rear_view: bool = false

var cam_distance: float = 2.8
var cam_height: float = 1.05
var cam_angle_deg: float = -4.0
var stiffness: float = 0.45
var swivel_speed: float = 5.0
var base_fov: float = 100.0
var shake_enabled: bool = true
var reduced_motion: bool = false

var _cam_up := Vector3.UP
var _dir := Vector3.FORWARD
var _shake: float = 0.0
var _orbit_center := Vector3.ZERO
var _orbit_angle: float = 0.0
var _rng := RandomNumberGenerator.new()


func load_settings() -> void:
	var s: Node = get_node_or_null("/root/Settings")
	if s == null:
		return
	base_fov = float(s.get_value("camera", "fov"))
	cam_distance = float(s.get_value("camera", "distance"))
	cam_height = float(s.get_value("camera", "height"))
	cam_angle_deg = float(s.get_value("camera", "angle"))
	stiffness = float(s.get_value("camera", "stiffness"))
	swivel_speed = float(s.get_value("camera", "swivel_speed"))
	shake_enabled = bool(s.get_value("camera", "shake"))
	reduced_motion = bool(s.get_value("game", "reduced_motion"))
	mode = Mode.BALL if bool(s.get_value("camera", "ball_cam_default")) else Mode.CAR
	fov = base_fov


func add_shake(amount: float) -> void:
	if shake_enabled and not reduced_motion:
		_shake = maxf(_shake, amount)


func start_orbit(center: Vector3) -> void:
	mode = Mode.ORBIT
	_orbit_center = center
	_orbit_angle = atan2(global_position.x - center.x, global_position.z - center.z)


func update_camera(dt: float) -> void:
	if mode == Mode.ORBIT:
		_update_orbit(dt)
		return
	if target == null:
		return
	var car_pos: Vector3 = target.pos
	# Camera "up" follows the car on walls, world up in the air.
	var desired_up: Vector3 = target.contact_normal if target.on_ground else Vector3.UP
	_cam_up = _cam_up.slerp(desired_up, clampf(dt * 4.0, 0.0, 1.0)).normalized()
	var look_dir: Vector3
	if mode == Mode.BALL and ball != null and not rear_view:
		look_dir = ball.pos - car_pos
	else:
		look_dir = target.forward() if target.vel.length() < 2.0 or target.on_ground else target.vel
		if target.on_ground:
			look_dir = target.forward() * (1.0 if target.vel.dot(target.forward()) > -3.0 else -1.0)
		if rear_view:
			look_dir = -look_dir
	var flat: Vector3 = look_dir - _cam_up * look_dir.dot(_cam_up)
	if flat.length_squared() < 0.01:
		flat = _dir
	flat = flat.normalized()
	var turn: float = clampf(dt * swivel_speed * (2.0 if mode == Mode.BALL else 1.6), 0.0, 1.0)
	_dir = _dir.slerp(flat, turn).normalized() if _dir.dot(flat) > -0.99 else flat
	var desired: Vector3 = car_pos - _dir * cam_distance + _cam_up * cam_height
	desired = _avoid_walls(car_pos + _cam_up * 0.5, desired)
	var follow: float = clampf(dt * lerpf(8.0, 30.0, stiffness), 0.0, 1.0)
	global_position = global_position.lerp(desired, follow) if global_position.distance_to(desired) < 15.0 else desired
	var look_at_pt: Vector3 = car_pos + _cam_up * 0.6 + _dir * 3.0
	if mode == Mode.BALL and ball != null and not rear_view:
		var to_ball: Vector3 = ball.pos - global_position
		var flat_look: Vector3 = car_pos + _cam_up * 0.6 + _dir * 3.0 - global_position
		# Look toward the ball but never let the car drop out of frame.
		look_at_pt = global_position + flat_look.normalized().slerp(to_ball.normalized(), 0.35) * 5.0
	look_at_pt += _angle_offset()
	if global_position.distance_to(look_at_pt) > 0.01:
		look_at(look_at_pt, _cam_up)
	var target_fov: float = base_fov + (5.0 if target.supersonic and not reduced_motion else 0.0)
	fov = lerpf(fov, target_fov, clampf(dt * 3.0, 0.0, 1.0))
	_apply_shake(dt)


func _angle_offset() -> Vector3:
	return _cam_up * tan(deg_to_rad(cam_angle_deg)) * 3.0


func _avoid_walls(from: Vector3, to: Vector3) -> Vector3:
	if arena == null:
		return to
	if arena.distance(to) > 0.35:
		return to
	var dir: Vector3 = to - from
	var len: float = dir.length()
	if len < 0.01:
		return to
	dir /= len
	var t: float = 0.0
	while t < len:
		if arena.distance(from + dir * t) < 0.4:
			break
		t += 0.1
	return from + dir * maxf(0.3, t - 0.1)


func _update_orbit(dt: float) -> void:
	_orbit_angle += dt * 0.35
	var r: float = 16.0
	var p: Vector3 = _orbit_center + Vector3(sin(_orbit_angle) * r, 6.0, cos(_orbit_angle) * r)
	if arena:
		p = _avoid_walls(_orbit_center + Vector3.UP * 2.0, p)
	global_position = global_position.lerp(p, clampf(dt * 2.0, 0.0, 1.0))
	look_at(_orbit_center, Vector3.UP)
	_apply_shake(dt)


func _apply_shake(dt: float) -> void:
	if _shake <= 0.001:
		return
	h_offset = _rng.randf_range(-1.0, 1.0) * _shake * 0.3
	v_offset = _rng.randf_range(-1.0, 1.0) * _shake * 0.3
	_shake = maxf(0.0, _shake - dt * 1.5)
	if _shake <= 0.001:
		h_offset = 0.0
		v_offset = 0.0
