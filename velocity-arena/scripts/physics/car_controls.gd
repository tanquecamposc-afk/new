class_name CarControls
extends RefCounted
## One tick of player / bot input. This is the only thing a client is allowed
## to send to an authoritative server; everything else is simulated.

var throttle: float = 0.0   ## -1 reverse/brake .. +1 forward
var steer: float = 0.0      ## -1 left .. +1 right (ground)
var pitch: float = 0.0      ## -1 nose down .. +1 nose up (air)
var yaw: float = 0.0        ## -1 left .. +1 right (air)
var roll: float = 0.0       ## -1 roll left .. +1 roll right (air)
var jump: bool = false
var boost: bool = false
var handbrake: bool = false ## powerslide on ground


func copy_from(o: CarControls) -> void:
	throttle = o.throttle
	steer = o.steer
	pitch = o.pitch
	yaw = o.yaw
	roll = o.roll
	jump = o.jump
	boost = o.boost
	handbrake = o.handbrake


func clamp_values() -> void:
	throttle = clampf(throttle, -1.0, 1.0)
	steer = clampf(steer, -1.0, 1.0)
	pitch = clampf(pitch, -1.0, 1.0)
	yaw = clampf(yaw, -1.0, 1.0)
	roll = clampf(roll, -1.0, 1.0)


func reset() -> void:
	throttle = 0.0
	steer = 0.0
	pitch = 0.0
	yaw = 0.0
	roll = 0.0
	jump = false
	boost = false
	handbrake = false


func to_array() -> Array:
	return [throttle, steer, pitch, yaw, roll, jump, boost, handbrake]


static func from_array(a: Array) -> CarControls:
	var c := CarControls.new()
	if a.size() >= 8:
		c.throttle = float(a[0])
		c.steer = float(a[1])
		c.pitch = float(a[2])
		c.yaw = float(a[3])
		c.roll = float(a[4])
		c.jump = bool(a[5])
		c.boost = bool(a[6])
		c.handbrake = bool(a[7])
	c.clamp_values()
	return c
