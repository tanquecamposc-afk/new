class_name ClientPrediction
extends RefCounted
## Client-side simulation of an online match.
##
## * The local car is predicted immediately from local input (no wait for the
##   server). Every input is stored by tick.
## * When an authoritative snapshot for tick T arrives, the whole world is
##   rewound to T and re-simulated to the current client tick, replaying the
##   stored local inputs and the remote cars' last known inputs
##   ("server reconciliation" + dead reckoning, like modern physics sports
##   games). Simulations are NOT assumed to be identical across machines; the
##   snapshot always wins.
## * Corrections are hidden visually with decaying render offsets; the
##   simulated (collision) state is never smoothed.
## * The client runs ahead of the server by ~RTT/2 + a small buffer so its
##   inputs arrive before the server simulates their tick.
## * Spectators (no local car) render through an interpolation buffer.

const MAX_RESIM := 45
const SNAP_DISTANCE := 4.0
const OFFSET_DECAY := 14.0

var world: SimWorld
var local_car_id: int = -1
var tick: int = 0
var dt: float = 1.0 / 120.0
var history: Dictionary = {}          # tick -> CarControls
var last_snapshot_tick: int = -1
var last_snapshot: Dictionary = {}
var match_state: Dictionary = {}       # phase, scores, clock (from snapshots)
var rtt_ms: float = 60.0
var jitter_ms: float = 0.0
var extra_buffer_ticks: int = 3
var step_bias: int = 0                ## +1 = run an extra step, -1 = skip one

var car_offsets: Dictionary = {}       # car id -> Vector3 visual offset
var ball_offset := Vector3.ZERO
var reconcile_count: int = 0
var resim_ticks_total: int = 0
var last_error: float = 0.0
var avg_error: float = 0.0
var snapshots_received: int = 0
var snapshots_dropped_stale: int = 0
var snapshots_missing: int = 0
var events_local: Array[Dictionary] = []

var interp := SnapshotInterpolator.new()


func _init(p_world: SimWorld, p_local_car: int, start_tick: int) -> void:
	world = p_world
	local_car_id = p_local_car
	tick = start_tick
	world.tick = start_tick
	for c in world.cars:
		car_offsets[c.id] = Vector3.ZERO


func local_car() -> CarBody:
	return world.get_car(local_car_id)


## Advances the predicted world by one tick with the given local input.
func step(controls: CarControls) -> void:
	events_local.clear()
	tick += 1
	var c := CarControls.new()
	c.copy_from(controls)
	history[tick] = c
	var car: CarBody = local_car()
	if car:
		car.controls.copy_from(c)
	world.step(dt)
	events_local.append_array(world.events)
	history.erase(tick - 300)


## How far ahead of the snapshot tick the client must simulate: the snapshot
## took ~RTT/2 to arrive and our input needs another ~RTT/2 to reach the
## server, so the client runs a full RTT (+ jitter margin) ahead of it.
func lead_ticks() -> int:
	return int(ceil((rtt_ms + jitter_ms * 2.0) / 1000.0 / dt)) + extra_buffer_ticks


## Applies an authoritative snapshot (already decoded). Returns false if stale.
func on_snapshot(s: Dictionary) -> bool:
	var st: int = int(s["tick"])
	if st <= last_snapshot_tick:
		snapshots_dropped_stale += 1
		return false
	if last_snapshot_tick >= 0 and st - last_snapshot_tick > 2:
		snapshots_missing += maxi(0, (st - last_snapshot_tick) / 2 - 1)
	last_snapshot_tick = st
	last_snapshot = s
	snapshots_received += 1
	match_state = {"phase": s["phase"], "phase_timer": s["phase_timer"], "time_remaining": s["time_remaining"],
		"overtime": s["overtime"], "overtime_elapsed": s["overtime_elapsed"], "unlimited": s["unlimited"],
		"score0": s["score0"], "score1": s["score1"]}
	interp.add(s)
	if local_car_id < 0:
		# Spectator: no prediction, just keep the world at the latest snapshot.
		NetProtocol.apply_snapshot(world, s, _all_ids())
		tick = st
		return true
	# Record rendered positions to hide the correction.
	var before_cars: Dictionary = {}
	for c in world.cars:
		before_cars[c.id] = c.pos + car_offsets.get(c.id, Vector3.ZERO)
	var before_ball: Vector3 = world.ball.pos + ball_offset
	var lc: CarBody = local_car()
	# Rewind.
	var remote_ids: Array = _all_ids()
	remote_ids.erase(local_car_id)
	NetProtocol.apply_snapshot(world, s, remote_ids)
	# Tick synchronisation.
	var desired: int = st + lead_ticks()
	if tick < st or absi(tick - desired) > 30:
		tick = desired
	elif tick < desired - 2:
		step_bias = 1
	elif tick > desired + 4:
		step_bias = -1
	else:
		step_bias = 0
	# Re-simulate from st+1 to tick with stored local inputs.
	var n: int = mini(tick - st, MAX_RESIM)
	if tick - st > MAX_RESIM:
		tick = st + MAX_RESIM
	var last_c := CarControls.new()
	for t in range(st + 1, tick + 1):
		var hc: CarControls = history.get(t, null)
		if hc != null:
			last_c = hc
		if lc:
			lc.controls.copy_from(last_c)
		world.step(dt)
	resim_ticks_total += n
	reconcile_count += 1
	# Visual smoothing: keep the rendered position continuous.
	for c in world.cars:
		var off: Vector3 = before_cars.get(c.id, c.pos) - c.pos
		car_offsets[c.id] = off if off.length() < SNAP_DISTANCE and not c.demolished else Vector3.ZERO
	var boff: Vector3 = before_ball - world.ball.pos
	ball_offset = boff if boff.length() < SNAP_DISTANCE else Vector3.ZERO
	if lc:
		last_error = car_offsets.get(local_car_id, Vector3.ZERO).length()
		avg_error = lerpf(avg_error, last_error, 0.1)
	return true


func decay_offsets(frame_dt: float) -> void:
	var k: float = exp(-OFFSET_DECAY * frame_dt)
	for id in car_offsets.keys():
		car_offsets[id] = car_offsets[id] * k
	ball_offset *= k


func _all_ids() -> Array:
	var ids: Array = []
	for c in world.cars:
		ids.append(c.id)
	return ids


## How many simulation steps to run this physics frame (tick sync).
func steps_this_frame() -> int:
	var n: int = 1 + step_bias
	step_bias = 0
	return n


# ------------------------------------------------------------------------
class SnapshotInterpolator:
	extends RefCounted
	## Keeps recent snapshots and samples positions at a delayed render time.
	var buf: Array = []
	var delay_ticks: int = 8

	func add(s: Dictionary) -> void:
		buf.append(s)
		while buf.size() > 30:
			buf.pop_front()

	## Returns {"ball": Vector3, "cars": {id: [pos, quat]}} or {} if empty.
	func sample(latest_tick_f: float) -> Dictionary:
		if buf.is_empty():
			return {}
		var t: float = latest_tick_f - delay_ticks
		var a: Dictionary = buf[0]
		var b: Dictionary = buf[buf.size() - 1]
		for i in range(buf.size() - 1):
			if float(buf[i]["tick"]) <= t and float(buf[i + 1]["tick"]) >= t:
				a = buf[i]
				b = buf[i + 1]
				break
		var span: float = maxf(1.0, float(b["tick"]) - float(a["tick"]))
		var f: float = clampf((t - float(a["tick"])) / span, 0.0, 1.0)
		var out := {"ball": (a["ball_pos"] as Vector3).lerp(b["ball_pos"], f), "cars": {}}
		for ca in a["cars"]:
			for cb in b["cars"]:
				if cb["id"] == ca["id"]:
					out["cars"][ca["id"]] = [(ca["pos"] as Vector3).lerp(cb["pos"], f), (ca["rot"] as Quaternion).slerp(cb["rot"], f)]
		return out
