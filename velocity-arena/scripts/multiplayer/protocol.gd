class_name NetProtocol
extends RefCounted
## Wire format shared by client and server.
##
## * Inputs (client -> server, unreliable ordered): the last INPUT_REDUNDANCY
##   inputs are packed together so a lost packet rarely loses an input.
##   6 bytes per input (5 axes as int8 + 1 flag byte).
## * Snapshots (server -> client, unreliable ordered): full simulation state
##   needed to rewind and re-simulate (cars incl. jump/flip timers, ball,
##   pads, match clock). Stale snapshots are dropped by tick number.
## Every decoder validates sizes and ranges; malformed data returns {} / [].

const VERSION := 3
const GAME_ID := "VELOCITY_ARENA"
const DEFAULT_PORT := 7777
const DISCOVERY_PORT := 7778
const MAX_CLIENTS := 64

const CH_RELIABLE := 0
const CH_STATE := 1
const CH_PING := 2

const INPUT_REDUNDANCY := 4
const MAX_INPUT_BYTES := 4 + 1 + INPUT_REDUNDANCY * 6
const MAX_SNAPSHOT_BYTES := 8192

const MSG_SNAPSHOT := 1


# ------------------------------------------------------------------ inputs
static func encode_controls(buf: StreamPeerBuffer, c: CarControls) -> void:
	buf.put_8(int(round(clampf(c.throttle, -1, 1) * 127.0)))
	buf.put_8(int(round(clampf(c.steer, -1, 1) * 127.0)))
	buf.put_8(int(round(clampf(c.pitch, -1, 1) * 127.0)))
	buf.put_8(int(round(clampf(c.yaw, -1, 1) * 127.0)))
	buf.put_8(int(round(clampf(c.roll, -1, 1) * 127.0)))
	buf.put_u8((1 if c.jump else 0) | (2 if c.boost else 0) | (4 if c.handbrake else 0))


static func decode_controls(buf: StreamPeerBuffer) -> CarControls:
	var c := CarControls.new()
	c.throttle = clampf(buf.get_8() / 127.0, -1.0, 1.0)
	c.steer = clampf(buf.get_8() / 127.0, -1.0, 1.0)
	c.pitch = clampf(buf.get_8() / 127.0, -1.0, 1.0)
	c.yaw = clampf(buf.get_8() / 127.0, -1.0, 1.0)
	c.roll = clampf(buf.get_8() / 127.0, -1.0, 1.0)
	var f: int = buf.get_u8()
	c.jump = (f & 1) != 0
	c.boost = (f & 2) != 0
	c.handbrake = (f & 4) != 0
	return c


## `history` maps tick -> CarControls. Packs ticks newest_tick-N+1 .. newest_tick.
static func encode_inputs(newest_tick: int, history: Dictionary) -> PackedByteArray:
	var buf := StreamPeerBuffer.new()
	var count: int = 0
	for t in range(newest_tick - INPUT_REDUNDANCY + 1, newest_tick + 1):
		if history.has(t):
			count += 1
	buf.put_u32(newest_tick)
	buf.put_u8(count)
	# Inputs are contiguous by construction; store oldest-first.
	var first: int = newest_tick - count + 1
	for t in range(first, newest_tick + 1):
		encode_controls(buf, history.get(t, CarControls.new()))
	return buf.data_array


## Returns [[tick, CarControls], ...] or [] if malformed.
static func decode_inputs(data: PackedByteArray) -> Array:
	if data.size() < 5 or data.size() > MAX_INPUT_BYTES:
		return []
	var buf := StreamPeerBuffer.new()
	buf.data_array = data
	var newest: int = buf.get_u32()
	var count: int = buf.get_u8()
	if count < 1 or count > INPUT_REDUNDANCY or data.size() != 5 + count * 6:
		return []
	var out: Array = []
	for i in count:
		out.append([newest - count + 1 + i, decode_controls(buf)])
	return out


# ------------------------------------------------------------------ snapshots
static func _put_v3(b: StreamPeerBuffer, v: Vector3) -> void:
	b.put_float(v.x)
	b.put_float(v.y)
	b.put_float(v.z)


static func _get_v3(b: StreamPeerBuffer) -> Vector3:
	return Vector3(b.get_float(), b.get_float(), b.get_float())


static func encode_snapshot(world: SimWorld, rules: MatchRules, ack_tick: int) -> PackedByteArray:
	var b := StreamPeerBuffer.new()
	b.put_u8(MSG_SNAPSHOT)
	b.put_u32(world.tick)
	b.put_u32(maxi(ack_tick, 0))
	b.put_float(world.time)
	# Match state.
	b.put_u8(rules.phase)
	b.put_float(rules.phase_timer)
	b.put_float(rules.time_remaining)
	b.put_float(rules.overtime_elapsed)
	b.put_u8((1 if rules.overtime else 0) | (2 if world.cars_frozen else 0) | (4 if world.ball_frozen else 0) | (8 if rules.unlimited_time else 0))
	b.put_u16(rules.scores[0])
	b.put_u16(rules.scores[1])
	b.put_8(world.last_touch_car)
	b.put_8(world.prev_touch_car)
	# Ball.
	_put_v3(b, world.ball.pos)
	_put_v3(b, world.ball.vel)
	_put_v3(b, world.ball.ang_vel)
	b.put_float(world.ball.homing_strength)
	b.put_float(world.ball.homing_target_z)
	b.put_float(world.ball.homing_speed)
	# Pads: respawn timers in decaseconds.
	b.put_u8(world.pads.size())
	for p in world.pads:
		b.put_u8(clampi(int(ceil(maxf(p.timer, 0.0) * 10.0)), 0, 255))
	# Cars.
	b.put_u8(world.cars.size())
	for c in world.cars:
		encode_car(b, c)
	return b.data_array


static func encode_car(b: StreamPeerBuffer, c: CarBody) -> void:
	b.put_u8(c.id)
	b.put_u8(c.team)
	var f1: int = (1 if c.demolished else 0) | (2 if c.has_jumped else 0) | (4 if c.is_jumping else 0) \
		| (8 if c.has_flip else 0) | (16 if c.flip_reset else 0) | (32 if c.is_flipping else 0) \
		| (64 if c.flip_cancelled else 0) | (128 if c.supersonic else 0)
	var f2: int = (1 if c.has_double_jumped else 0) | (2 if c._prev_jump else 0) | (4 if c.boosting else 0)
	b.put_u8(f1)
	b.put_u8(f2)
	_put_v3(b, c.pos)
	var q: Quaternion = c.basis.get_rotation_quaternion()
	b.put_float(q.x)
	b.put_float(q.y)
	b.put_float(q.z)
	b.put_float(q.w)
	_put_v3(b, c.vel)
	_put_v3(b, c.ang_vel)
	b.put_float(c.boost)
	b.put_float(c.jump_timer)
	b.put_float(c.time_since_jump)
	b.put_float(c.flip_time)
	b.put_float(c.flip_dir.x)
	b.put_float(c.flip_dir.y)
	b.put_float(c.airborne_time)
	b.put_float(c.ground_time)
	b.put_float(c.respawn_timer)
	encode_controls(b, c.controls)


## Decodes a snapshot into a Dictionary. Returns {} when malformed.
static func decode_snapshot(data: PackedByteArray) -> Dictionary:
	if data.size() < 64 or data.size() > MAX_SNAPSHOT_BYTES:
		return {}
	var b := StreamPeerBuffer.new()
	b.data_array = data
	if b.get_u8() != MSG_SNAPSHOT:
		return {}
	var s := {}
	s["tick"] = b.get_u32()
	s["ack"] = b.get_u32()
	s["time"] = b.get_float()
	s["phase"] = b.get_u8()
	s["phase_timer"] = b.get_float()
	s["time_remaining"] = b.get_float()
	s["overtime_elapsed"] = b.get_float()
	var fl: int = b.get_u8()
	s["overtime"] = (fl & 1) != 0
	s["cars_frozen"] = (fl & 2) != 0
	s["ball_frozen"] = (fl & 4) != 0
	s["unlimited"] = (fl & 8) != 0
	s["score0"] = b.get_u16()
	s["score1"] = b.get_u16()
	s["last_touch"] = b.get_8()
	s["prev_touch"] = b.get_8()
	s["ball_pos"] = _get_v3(b)
	s["ball_vel"] = _get_v3(b)
	s["ball_ang"] = _get_v3(b)
	s["homing_strength"] = b.get_float()
	s["homing_target_z"] = b.get_float()
	s["homing_speed"] = b.get_float()
	var n_pads: int = b.get_u8()
	if b.get_available_bytes() < n_pads + 1:
		return {}
	var pads := PackedFloat32Array()
	for i in n_pads:
		pads.append(b.get_u8() / 10.0)
	s["pads"] = pads
	var n_cars: int = b.get_u8()
	if n_cars > 16 or b.get_available_bytes() != n_cars * CAR_BYTES:
		return {}
	var cars: Array = []
	for i in n_cars:
		cars.append(decode_car(b))
	s["cars"] = cars
	for k in ["ball_pos", "ball_vel", "ball_ang"]:
		if not (s[k] as Vector3).is_finite():
			return {}
	return s


const CAR_BYTES := 4 + 12 + 16 + 12 + 12 + 4 * 9 + 6


static func decode_car(b: StreamPeerBuffer) -> Dictionary:
	var d := {}
	d["id"] = b.get_u8()
	d["team"] = b.get_u8()
	var f1: int = b.get_u8()
	var f2: int = b.get_u8()
	d["demolished"] = (f1 & 1) != 0
	d["has_jumped"] = (f1 & 2) != 0
	d["is_jumping"] = (f1 & 4) != 0
	d["has_flip"] = (f1 & 8) != 0
	d["flip_reset"] = (f1 & 16) != 0
	d["is_flipping"] = (f1 & 32) != 0
	d["flip_cancelled"] = (f1 & 64) != 0
	d["supersonic"] = (f1 & 128) != 0
	d["has_double_jumped"] = (f2 & 1) != 0
	d["prev_jump"] = (f2 & 2) != 0
	d["boosting"] = (f2 & 4) != 0
	d["pos"] = _get_v3(b)
	var q := Quaternion(b.get_float(), b.get_float(), b.get_float(), b.get_float())
	d["rot"] = q.normalized() if q.length_squared() > 0.0001 else Quaternion.IDENTITY
	d["vel"] = _get_v3(b)
	d["ang_vel"] = _get_v3(b)
	d["boost"] = clampf(b.get_float(), 0.0, 100.0)
	d["jump_timer"] = b.get_float()
	d["time_since_jump"] = b.get_float()
	d["flip_time"] = b.get_float()
	d["flip_dir"] = Vector2(b.get_float(), b.get_float())
	d["airborne_time"] = b.get_float()
	d["ground_time"] = b.get_float()
	d["respawn_timer"] = b.get_float()
	d["controls"] = decode_controls(b)
	return d


static func apply_car(c: CarBody, d: Dictionary) -> void:
	c.pos = d["pos"]
	c.basis = Basis(d["rot"] as Quaternion)
	c.vel = d["vel"]
	c.ang_vel = d["ang_vel"]
	c.boost = d["boost"]
	c.demolished = d["demolished"]
	c.has_jumped = d["has_jumped"]
	c.is_jumping = d["is_jumping"]
	c.has_flip = d["has_flip"]
	c.flip_reset = d["flip_reset"]
	c.is_flipping = d["is_flipping"]
	c.flip_cancelled = d["flip_cancelled"]
	c.supersonic = d["supersonic"]
	c.has_double_jumped = d["has_double_jumped"]
	c._prev_jump = d["prev_jump"]
	c.boosting = d["boosting"]
	c.jump_timer = d["jump_timer"]
	c.time_since_jump = d["time_since_jump"]
	c.flip_time = d["flip_time"]
	c.flip_dir = d["flip_dir"]
	c.airborne_time = d["airborne_time"]
	c.ground_time = d["ground_time"]
	c.respawn_timer = d["respawn_timer"]


## Writes a decoded snapshot into a SimWorld (cars matched by id).
static func apply_snapshot(world: SimWorld, s: Dictionary, apply_controls_for_ids: Array = []) -> void:
	world.tick = s["tick"]
	world.time = s["time"]
	world.cars_frozen = s["cars_frozen"]
	world.ball_frozen = s["ball_frozen"]
	world.last_touch_car = s["last_touch"]
	world.prev_touch_car = s["prev_touch"]
	world.ball.pos = s["ball_pos"]
	world.ball.vel = s["ball_vel"]
	world.ball.ang_vel = s["ball_ang"]
	world.ball.homing_strength = s["homing_strength"]
	world.ball.homing_target_z = s["homing_target_z"]
	world.ball.homing_speed = s["homing_speed"]
	var pads: PackedFloat32Array = s["pads"]
	for i in mini(pads.size(), world.pads.size()):
		world.pads[i].timer = pads[i]
	for cd in s["cars"]:
		var c: CarBody = world.get_car(int(cd["id"]))
		if c == null:
			continue
		apply_car(c, cd)
		if apply_controls_for_ids.has(c.id):
			c.controls.copy_from(cd["controls"])


# ------------------------------------------------------------------ helpers
const CODE_ALPHABET := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


static func make_room_code(rng: RandomNumberGenerator) -> String:
	var s := "VA-"
	for i in 6:
		s += CODE_ALPHABET[rng.randi_range(0, CODE_ALPHABET.length() - 1)]
	return s


static func normalize_code(code: String) -> String:
	var c: String = code.strip_edges().to_upper().replace(" ", "")
	if not c.begins_with("VA-") and c.length() == 6:
		c = "VA-" + c
	return c


static func sanitize_name(n: String, fallback: String = "Jugador") -> String:
	var out := ""
	for ch in n.strip_edges():
		var code: int = ch.unicode_at(0)
		if code >= 32 and code != 127 and out.length() < 16:
			out += ch
	return out if out.length() >= 2 else fallback


static func hash_password(password: String, salt: String) -> String:
	return (salt + ":" + password).sha256_text()
