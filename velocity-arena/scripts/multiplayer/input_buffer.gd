class_name InputBuffer
extends RefCounted
## Server-side per-player input queue keyed by simulation tick.
## Inputs for future ticks wait; inputs for ticks already simulated are
## counted as late and dropped; a missing tick repeats the last input.

const WINDOW_AHEAD := 120

var _inputs: Dictionary = {}       # tick -> CarControls
var last := CarControls.new()
var last_applied_tick: int = -1
var newest_received: int = -1
var received: int = 0
var late: int = 0
var missing: int = 0


func add(tick: int, c: CarControls, server_tick: int) -> bool:
	# Redundant copies of inputs we already have (every packet repeats the
	# last few) are ignored silently.
	if tick <= newest_received and (tick <= last_applied_tick or _inputs.has(tick)):
		return false
	if tick <= last_applied_tick:
		late += 1
		# Too late to simulate, but it is still the player's latest intent.
		newest_received = tick
		last = c
		return false
	if tick > server_tick + WINDOW_AHEAD:
		return false  # absurdly far ahead: ignore (bogus or desynced client)
	if not _inputs.has(tick):
		_inputs[tick] = c
		received += 1
	newest_received = maxi(newest_received, tick)
	return true


## Returns the controls to use for simulating `tick`.
func take(tick: int) -> CarControls:
	if _inputs.has(tick):
		last = _inputs[tick]
	else:
		missing += 1
	last_applied_tick = tick
	for k in _inputs.keys():
		if int(k) <= tick:
			_inputs.erase(k)
	return last


func reset() -> void:
	_inputs.clear()
	last = CarControls.new()
	last_applied_tick = -1
	newest_received = -1
