class_name LagSimulator
extends RefCounted
## Development tool: adds artificial latency, jitter and packet loss on top
## of a REAL network connection (both outgoing and incoming on the client).
## Reliable traffic is delayed but never dropped (ENet would retransmit it).

var latency_ms: float = 0.0     ## round-trip latency to add (split in halves)
var jitter_ms: float = 0.0
var loss_percent: float = 0.0
var _queue: Array = []          # [due_msec, Callable]
var _rng := RandomNumberGenerator.new()
var dropped: int = 0


func _init(seed_value: int = 1) -> void:
	_rng.seed = seed_value


func active() -> bool:
	return latency_ms > 0.0 or jitter_ms > 0.0 or loss_percent > 0.0


## Schedules `fn`; unreliable messages may be dropped.
func push(fn: Callable, reliable: bool) -> void:
	if not active():
		fn.call()
		return
	if not reliable and _rng.randf() * 100.0 < loss_percent:
		dropped += 1
		return
	var delay: float = latency_ms * 0.5 + _rng.randf_range(-jitter_ms, jitter_ms)
	var due: int = Time.get_ticks_msec() + int(maxf(delay, 0.0))
	# Keep reliable messages ordered: never schedule before the last one.
	if reliable and not _queue.is_empty():
		due = maxi(due, int(_queue[_queue.size() - 1][0]))
	_queue.append([due, fn])
	_queue.sort_custom(func(a, b): return a[0] < b[0])


func flush() -> void:
	var now: int = Time.get_ticks_msec()
	while not _queue.is_empty() and int(_queue[0][0]) <= now:
		var item: Array = _queue.pop_front()
		(item[1] as Callable).call()
