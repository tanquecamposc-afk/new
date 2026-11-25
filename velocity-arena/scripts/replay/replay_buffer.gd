class_name ReplayBuffer
extends RefCounted
## Rolling recording of the last few seconds of a match (render state only:
## positions, rotations, boost/demolished flags), sampled at 60 Hz. Used for
## goal replays. Recording snapshots instead of re-simulating makes replays
## exact and independent of physics determinism.

const RATE := 60.0

var capacity: int = int(RATE * 7.0)
var frames: Array = []            # [time, ball_pos, ball_rot, [[pos, rot, flags], ...]]
var _accum: float = 0.0


func record(world: SimWorld, dt: float) -> void:
	_accum += dt
	if _accum < 1.0 / RATE:
		return
	_accum = 0.0
	var cars: Array = []
	for c in world.cars:
		var flags: int = (1 if c.boosting else 0) | (2 if c.demolished else 0) | (4 if c.supersonic else 0)
		cars.append([c.pos, c.basis.get_rotation_quaternion(), flags])
	frames.append([world.time, world.ball.pos, world.ball.basis.get_rotation_quaternion(), cars])
	if frames.size() > capacity:
		frames.pop_front()


func clear() -> void:
	frames.clear()


func duration() -> float:
	if frames.size() < 2:
		return 0.0
	return float(frames[frames.size() - 1][0]) - float(frames[0][0])


## Interpolated frame at `t` seconds from the start of the buffer.
func sample(t: float) -> Array:
	if frames.is_empty():
		return []
	var t0: float = float(frames[0][0])
	var target: float = t0 + t
	var i: int = 0
	while i < frames.size() - 2 and float(frames[i + 1][0]) < target:
		i += 1
	var a: Array = frames[i]
	var b: Array = frames[mini(i + 1, frames.size() - 1)]
	var span: float = maxf(0.0001, float(b[0]) - float(a[0]))
	var f: float = clampf((target - float(a[0])) / span, 0.0, 1.0)
	var cars: Array = []
	for k in mini(a[3].size(), b[3].size()):
		var ca: Array = a[3][k]
		var cb: Array = b[3][k]
		cars.append([(ca[0] as Vector3).lerp(cb[0], f), (ca[1] as Quaternion).slerp(cb[1], f), cb[2]])
	return [(a[1] as Vector3).lerp(b[1], f), (a[2] as Quaternion).slerp(b[2], f), cars]
