class_name PhysicsConfig
extends Resource
## Every tunable physics parameter of VELOCITY ARENA.
##
## Units: metres, seconds, kilograms. Values are original design references
## tuned for an arcade car-football feel; they are NOT claims about the exact
## physics of any commercial game. Game modes / mutators duplicate this
## resource and override fields (see GameModeDef.physics_overrides).

@export_group("World")
@export var gravity: float = 6.5
@export var tick_rate: int = 120

@export_group("Arena")
@export var arena_half_width: float = 41.0
@export var arena_half_length: float = 51.2
@export var arena_height: float = 20.44
@export var arena_corner_radius: float = 11.0
@export var arena_edge_radius: float = 3.0
@export var goal_half_width: float = 8.93
@export var goal_height: float = 6.43
@export var goal_depth: float = 8.8

@export_group("Ball")
@export var ball_radius: float = 0.9125
@export var ball_mass: float = 30.0
@export var ball_restitution: float = 0.6
@export var ball_friction: float = 0.35
@export var ball_drag: float = 0.03
@export var ball_max_speed: float = 60.0
@export var ball_max_angular_speed: float = 6.0
@export var ball_gravity_scale: float = 1.0
## Multiplier for the extra "hit" impulse a car gives the ball.
@export var hit_power_scale: float = 1.0

@export_group("Car body")
@export var car_mass: float = 180.0
## Hitbox half extents in car-local space: x = right, y = up, z = length.
@export var hitbox_half_extents: Vector3 = Vector3(0.42, 0.18, 0.59)
## Hitbox centre relative to the car origin (forward is -Z).
@export var hitbox_offset: Vector3 = Vector3(0.0, 0.2, -0.14)
## Moment of inertia divided by mass, per local axis (pitch, yaw, roll).
@export var inertia_per_mass: Vector3 = Vector3(0.127, 0.175, 0.07)
@export var body_restitution: float = 0.1
@export var body_friction: float = 0.4

@export_group("Suspension")
## Local anchor of each wheel (FL, FR, RL, RR).
@export var wheel_anchors: PackedVector3Array = PackedVector3Array([
	Vector3(-0.36, 0.0, -0.50), Vector3(0.36, 0.0, -0.50),
	Vector3(-0.36, 0.0, 0.35), Vector3(0.36, 0.0, 0.35)])
@export var suspension_rest: float = 0.17
@export var suspension_max: float = 0.32
## Spring stiffness per wheel, as acceleration per metre of compression.
@export var suspension_stiffness: float = 156.0
@export var suspension_damping: float = 12.0
@export var wheel_radius: float = 0.2
@export var sticky_accel: float = 3.25
## Helps the chassis align with curved walls during transitions.
@export var align_stiffness: float = 40.0
@export var align_damping: float = 9.0

@export_group("Driving")
@export var max_speed: float = 23.0
@export var supersonic_speed: float = 22.0
@export var supersonic_exit_speed: float = 21.0
## Throttle acceleration curve: speeds (m/s) -> acceleration (m/s^2).
@export var throttle_curve_speeds: PackedFloat32Array = PackedFloat32Array([0.0, 14.0, 14.1, 23.0])
@export var throttle_curve_accels: PackedFloat32Array = PackedFloat32Array([16.0, 1.6, 0.0, 0.0])
@export var brake_accel: float = 35.0
@export var coast_decel: float = 5.25
## Turning curvature (1/m) by forward speed (m/s).
@export var steer_curve_speeds: PackedFloat32Array = PackedFloat32Array([0.0, 5.0, 10.0, 15.0, 17.5, 23.0])
@export var steer_curve_values: PackedFloat32Array = PackedFloat32Array([0.69, 0.398, 0.235, 0.1375, 0.11, 0.088])
@export var steer_response: float = 22.0
@export var lateral_friction: float = 30.0
@export var powerslide_friction: float = 1.6
@export var powerslide_turn_bonus: float = 1.35
@export var air_throttle_accel: float = 0.6667

@export_group("Boost")
@export var boost_accel: float = 9.9167
@export var boost_consumption: float = 33.3
@export var boost_start: float = 33.0
@export var unlimited_boost: bool = false
@export var small_pad_amount: float = 12.0
@export var small_pad_respawn: float = 4.0
@export var big_pad_respawn: float = 10.0
@export var small_pad_radius: float = 1.44
@export var big_pad_radius: float = 2.08

@export_group("Jump and dodge")
@export var jump_impulse: float = 2.9167
@export var jump_hold_accel: float = 14.583
@export var jump_hold_time: float = 0.2
@export var jump_min_time: float = 0.025
@export var double_jump_impulse: float = 2.9167
## Seconds after the first jump during which a second jump / dodge is allowed.
@export var flip_window: float = 1.45
@export var dodge_deadzone: float = 0.5
@export var dodge_impulse: float = 5.0
@export var backflip_impulse: float = 5.333
@export var side_dodge_speed_bonus: float = 0.9
@export var flip_torque_time: float = 0.65

@export_group("Landing assist")
## Seconds before touchdown at which the car starts turning its wheels toward the surface.
@export var land_assist_time: float = 0.6
## Only active this close (m) to a surface, so high aerials keep full control.
@export var land_assist_max_dist: float = 7.0
@export var land_assist_stiffness: float = 55.0
@export var land_assist_damping: float = 9.0
## Time stuck on the roof/side before the car rights itself.
@export var recover_delay: float = 0.35
@export var recover_impulse: float = 2.2
@export var recover_spin: float = 6.5
@export var flip_angular_speed: float = 5.5
@export var dodge_vertical_damp_time: float = 0.15
@export var dodge_vertical_damp: float = 0.65

@export_group("Air control")
@export var air_pitch_torque: float = 12.46
@export var air_yaw_torque: float = 9.11
@export var air_roll_torque: float = 38.34
@export var air_pitch_damping: float = 2.798
@export var air_yaw_damping: float = 1.886
@export var air_roll_damping: float = 4.47
@export var max_angular_speed: float = 5.5

@export_group("Car-ball interaction")
@export var car_ball_restitution: float = 0.0
## Relative-speed breakpoints (m/s) -> extra impulse scale.
@export var hit_scale_speeds: PackedFloat32Array = PackedFloat32Array([0.0, 23.0, 46.0])
@export var hit_scale_values: PackedFloat32Array = PackedFloat32Array([0.65, 0.65, 0.55])
## Vertical (car-local) component of the extra hit direction is scaled by this.
@export var hit_vertical_scale: float = 0.35

@export_group("Car-car interaction")
@export var car_capsule_radius: float = 0.38
@export var car_capsule_half_length: float = 0.38
@export var bump_restitution: float = 0.25
@export var bump_extra_speed: float = 6.0
@export var demolition_enabled: bool = true
@export var demolition_respawn_time: float = 3.0


## Piecewise-linear interpolation helper shared by all curves.
static func sample_curve(xs: PackedFloat32Array, ys: PackedFloat32Array, x: float) -> float:
	if xs.is_empty():
		return 0.0
	if x <= xs[0]:
		return ys[0]
	for i in range(1, xs.size()):
		if x <= xs[i]:
			var t: float = (x - xs[i - 1]) / maxf(xs[i] - xs[i - 1], 0.00001)
			return lerpf(ys[i - 1], ys[i], t)
	return ys[ys.size() - 1]


func throttle_accel_at(speed: float) -> float:
	return sample_curve(throttle_curve_speeds, throttle_curve_accels, speed)


func curvature_at(speed: float) -> float:
	return sample_curve(steer_curve_speeds, steer_curve_values, speed)


func hit_scale_at(rel_speed: float) -> float:
	return sample_curve(hit_scale_speeds, hit_scale_values, rel_speed)


## Returns a copy with the given property overrides applied.
func with_overrides(overrides: Dictionary) -> PhysicsConfig:
	var copy: PhysicsConfig = duplicate(true)
	for key in overrides.keys():
		if key in copy:
			copy.set(key, overrides[key])
		else:
			push_warning("PhysicsConfig: unknown override '%s'" % key)
	return copy
