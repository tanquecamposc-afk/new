class_name SynthAudio
extends Node
## Procedurally synthesised sound effects (no external audio assets).
## Builds AudioStreamWAV buffers at startup and plays them through small
## player pools. Engine/boost/crowd are looping streams whose pitch/volume
## follow the simulation.

const RATE := 22050

var _streams: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _pool3d: Array[AudioStreamPlayer3D] = []
var engine_player: AudioStreamPlayer
var boost_player: AudioStreamPlayer
var crowd_player: AudioStreamPlayer
var sfx_volume: float = 0.8
var crowd_volume: float = 0.6
var _crowd_target: float = 0.25
var _crowd_level: float = 0.25
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = 99
	var s: Node = get_node_or_null("/root/Settings")
	if s:
		sfx_volume = float(s.get_value("audio", "sfx"))
		crowd_volume = float(s.get_value("audio", "crowd"))
	_streams["hit"] = _make_hit(90.0, 0.18, 0.5)
	_streams["hit_soft"] = _make_hit(140.0, 0.1, 0.25)
	_streams["bounce"] = _make_hit(70.0, 0.14, 0.15)
	_streams["goal"] = _make_goal()
	_streams["beep"] = _make_tone(880.0, 0.14, 0.4)
	_streams["go"] = _make_tone(1320.0, 0.35, 0.45)
	_streams["demo"] = _make_explosion(0.8)
	_streams["pickup"] = _make_chime(1046.0, 1568.0)
	_streams["pickup_big"] = _make_chime(784.0, 1318.0)
	_streams["jump"] = _make_whoosh(0.18, 0.25)
	_streams["ui"] = _make_tone(1600.0, 0.04, 0.2)
	_streams["horn"] = _make_horn()
	for i in 10:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_pool.append(p)
	for i in 8:
		var p3 := AudioStreamPlayer3D.new()
		p3.unit_size = 12.0
		p3.max_distance = 120.0
		add_child(p3)
		_pool3d.append(p3)
	engine_player = _loop_player(_make_engine(), -14.0)
	boost_player = _loop_player(_make_noise_loop(0.6, 0.35), -80.0)
	crowd_player = _loop_player(_make_crowd(), -18.0)


func _loop_player(stream: AudioStreamWAV, db: float) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = db
	p.autoplay = false
	add_child(p)
	if DisplayServer.get_name() != "headless":
		p.play()
	return p


func play(sound: String, volume: float = 1.0, pitch: float = 1.0) -> void:
	if not _streams.has(sound):
		return
	for p in _pool:
		if not p.playing:
			p.stream = _streams[sound]
			p.volume_db = linear_to_db(maxf(0.0001, volume * sfx_volume))
			p.pitch_scale = pitch
			p.play()
			return


func play_at(sound: String, pos: Vector3, volume: float = 1.0, pitch: float = 1.0) -> void:
	if not _streams.has(sound):
		return
	for p in _pool3d:
		if not p.playing:
			p.stream = _streams[sound]
			p.global_position = pos
			p.volume_db = linear_to_db(maxf(0.0001, volume * sfx_volume))
			p.pitch_scale = pitch
			p.play()
			return


func update_vehicle(speed: float, boosting: bool, on_ground: bool) -> void:
	var rpm: float = clampf(speed / 23.0, 0.0, 1.0)
	engine_player.pitch_scale = 0.6 + rpm * 1.4 + (0.15 if not on_ground else 0.0)
	engine_player.volume_db = linear_to_db(maxf(0.0001, sfx_volume * (0.18 + rpm * 0.22)))
	var bv: float = sfx_volume * 0.35 if boosting else 0.0
	boost_player.volume_db = lerpf(boost_player.volume_db, linear_to_db(maxf(0.0001, bv)), 0.3)


func excite_crowd(amount: float) -> void:
	_crowd_target = clampf(amount, 0.2, 1.0)


func _process(dt: float) -> void:
	_crowd_level = lerpf(_crowd_level, _crowd_target, clampf(dt * 1.5, 0.0, 1.0))
	_crowd_target = lerpf(_crowd_target, 0.25, clampf(dt * 0.25, 0.0, 1.0))
	if crowd_player:
		crowd_player.volume_db = linear_to_db(maxf(0.0001, crowd_volume * _crowd_level * 0.5))


# ------------------------------------------------------------ synthesis
func _wav(samples: PackedFloat32Array, loop: bool = false) -> AudioStreamWAV:
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		var v: int = int(clampf(samples[i], -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, v)
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = data
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = samples.size()
	return w


func _make_hit(freq: float, dur: float, noise_amt: float) -> AudioStreamWAV:
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var phase: float = 0.0
	for i in n:
		var t: float = float(i) / RATE
		var env: float = exp(-t * 28.0)
		phase += TAU * freq * (1.0 + 2.0 * exp(-t * 60.0)) / RATE
		s[i] = (sin(phase) * 0.9 + _rng.randf_range(-1, 1) * noise_amt * exp(-t * 80.0)) * env
	return _wav(s)


func _make_tone(freq: float, dur: float, amp: float) -> AudioStreamWAV:
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t: float = float(i) / RATE
		var env: float = minf(1.0, t * 200.0) * minf(1.0, (dur - t) * 40.0)
		s[i] = (sin(TAU * freq * t) * 0.7 + sin(TAU * freq * 2.0 * t) * 0.2) * env * amp
	return _wav(s)


func _make_chime(f1: float, f2: float) -> AudioStreamWAV:
	var dur: float = 0.25
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t: float = float(i) / RATE
		var f: float = f1 if t < 0.07 else f2
		s[i] = sin(TAU * f * t) * exp(-t * 14.0) * 0.35
	return _wav(s)


func _make_whoosh(dur: float, amp: float) -> AudioStreamWAV:
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var lp: float = 0.0
	for i in n:
		var t: float = float(i) / RATE
		lp = lerpf(lp, _rng.randf_range(-1, 1), 0.15)
		s[i] = lp * sin(PI * t / dur) * amp * 2.0
	return _wav(s)


func _make_explosion(dur: float) -> AudioStreamWAV:
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var lp: float = 0.0
	for i in n:
		var t: float = float(i) / RATE
		lp = lerpf(lp, _rng.randf_range(-1, 1), 0.08 + 0.3 * exp(-t * 10.0))
		s[i] = (lp * 2.2 + sin(TAU * 45.0 * t) * 0.6 * exp(-t * 6.0)) * exp(-t * 4.0) * 0.8
	return _wav(s)


func _make_goal() -> AudioStreamWAV:
	var dur: float = 2.2
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var lp: float = 0.0
	var chord := [220.0, 277.18, 329.63, 440.0]
	for i in n:
		var t: float = float(i) / RATE
		lp = lerpf(lp, _rng.randf_range(-1, 1), 0.06 + 0.25 * exp(-t * 6.0))
		var boom: float = lp * 2.0 * exp(-t * 2.5)
		var horn: float = 0.0
		if t > 0.15:
			for f in chord:
				horn += (fmod(t * f, 1.0) * 2.0 - 1.0) * 0.08
			horn *= minf(1.0, (t - 0.15) * 8.0) * exp(-(t - 0.15) * 1.2)
		s[i] = clampf(boom + horn, -1.0, 1.0) * 0.8
	return _wav(s)


func _make_horn() -> AudioStreamWAV:
	var dur: float = 1.4
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t: float = float(i) / RATE
		var env: float = minf(1.0, t * 20.0) * minf(1.0, (dur - t) * 4.0)
		var v: float = 0.0
		for f in [196.0, 246.94, 293.66]:
			v += (fmod(t * f, 1.0) * 2.0 - 1.0) * 0.12
		s[i] = v * env
	return _wav(s)


func _make_engine() -> AudioStreamWAV:
	# 0.5 s loop of a rich low tone; pitch_scale follows speed.
	var base: float = 60.0
	var n: int = int(RATE / base) * 30
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t: float = float(i) / RATE
		var v: float = 0.0
		for h in range(1, 7):
			v += sin(TAU * base * h * t + h) / float(h)
		v += (fmod(t * base * 0.5, 1.0) * 2.0 - 1.0) * 0.25
		s[i] = v * 0.22
	return _wav(s, true)


func _make_noise_loop(dur: float, smooth: float) -> AudioStreamWAV:
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var lp: float = 0.0
	for i in n:
		lp = lerpf(lp, _rng.randf_range(-1, 1), smooth)
		s[i] = lp * 0.9
	# Crossfade the loop seam.
	var fade: int = 400
	for i in fade:
		var a: float = float(i) / fade
		s[i] = s[i] * a + s[n - fade + i] * (1.0 - a)
	return _wav(s, true)


func _make_crowd() -> AudioStreamWAV:
	var dur: float = 3.0
	var n: int = int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var lp: float = 0.0
	var lp2: float = 0.0
	for i in n:
		var t: float = float(i) / RATE
		lp = lerpf(lp, _rng.randf_range(-1, 1), 0.05)
		lp2 = lerpf(lp2, lp, 0.3)
		var mod: float = 0.7 + 0.3 * sin(t * TAU / dur * 2.0) * sin(t * TAU / dur * 3.0)
		s[i] = lp2 * 3.0 * mod
	var fade: int = 2000
	for i in fade:
		var a: float = float(i) / fade
		s[i] = s[i] * a + s[n - fade + i] * (1.0 - a)
	return _wav(s, true)
