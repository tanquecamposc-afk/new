extends Node
## Headless multiplayer integration client. Two of these run as separate OS
## processes against a real dedicated server (see run_mp_tests.py).
## Args (after --): --test-role host|guest --address A --port P --out result.json
##                  --code-file path [--lag ms --jitter ms --loss %] [--quick]

var role: String = "host"
var out_path: String = ""
var code_file: String = ""
var quick: bool = false
var results := {"role": "", "checks": {}, "metrics": {}, "log": []}
var phase: String = "connect"
var t: float = 0.0
var phase_t: float = 0.0
var my_car_start := Vector3.ZERO
var remote_start := Vector3.ZERO
var goal_events: int = 0
var match_end_seen: bool = false
var errors: Array = []
var _reconnected: bool = false
var _did_bad_input: bool = false
var _start_requested: bool = false
var _match_starts: int = 0
var _left_lobby_event: bool = false


func _ready() -> void:
	var a: Dictionary = Net.cli_args
	role = str(a.get("test-role", "host"))
	out_path = str(a.get("out", "user://mp_%s.json" % role))
	code_file = str(a.get("code-file", "/tmp/va_code.txt"))
	quick = a.has("quick")
	results["role"] = role
	Net.welcomed.connect(func(info): _log("welcome %s" % info.get("player_id", "")))
	Net.net_error.connect(func(c, m): errors.append(c); _log("error %s: %s" % [c, m]))
	Net.match_started.connect(func(cfg): _match_starts += 1; _log("match_start car=%s" % cfg.get("your_car")))
	Net.match_event.connect(_on_event)
	Net.connect_to(str(a.get("address", "127.0.0.1")), int(a.get("port", 7777)), "Test_" + role)


func _log(s: String) -> void:
	var line: String = "[%s %.2f] %s" % [role, t, s]
	print(line)
	results["log"].append(line)


func _check(name: String, ok: bool) -> void:
	results["checks"][name] = ok
	_log(("OK   " if ok else "FAIL ") + name)


func _on_event(e: Dictionary) -> void:
	match e.get("type", ""):
		"goal":
			goal_events += 1
			_log("goal event team=%s" % e.get("team"))
		"match_end":
			match_end_seen = true
			_capture_metrics()
			_log("match_end winner=%s" % e.get("winner"))
		"lobby":
			_left_lobby_event = true


func _goto(p: String) -> void:
	phase = p
	phase_t = 0.0
	_log("phase -> " + p)


func _physics_process(delta: float) -> void:
	t += delta
	phase_t += delta
	var c := CarControls.new()
	if Net.prediction and phase in ["drive", "goal", "after_goal", "reconnect_wait", "end"]:
		c.throttle = 1.0
		c.steer = 0.3 if role == "host" else -0.3
	Net.client_tick(c)
	if t > (90.0 if not quick else 40.0):
		_finish("timeout in phase " + phase)
	match phase:
		"connect":
			if Net.is_online():
				_check("connected_and_welcomed", true)
				if role == "host":
					Net.create_room({"name": "Prueba", "mode": "soccar_1v1", "password": "secreto", "minutes": 1.0, "public": true})
					_goto("wait_room")
				else:
					_goto("guest_wait_code")
			elif phase_t > 10.0:
				_check("connected_and_welcomed", false)
				_finish("could not connect")
		"wait_room":
			if not Net.room.is_empty():
				var code: String = Net.room["code"]
				_check("room_code_format", code.begins_with("VA-") and code.length() == 9)
				var f := FileAccess.open(code_file, FileAccess.WRITE)
				f.store_string(code)
				f.close()
				_goto("wait_guest")
		"wait_guest":
			if Net.room.get("players", []).size() >= 2:
				_check("guest_visible_in_lobby", true)
				Net.start_match()
				_goto("wait_match")
			elif phase_t > 30.0:
				_check("guest_visible_in_lobby", false)
				_finish("guest never joined")
		"guest_wait_code":
			if FileAccess.file_exists(code_file):
				var code: String = FileAccess.get_file_as_string(code_file).strip_edges()
				if code != "":
					Net.join_room(code, "incorrecta")
					_goto("guest_bad_pw")
		"guest_bad_pw":
			if errors.has("bad_password"):
				_check("wrong_password_rejected", Net.room.is_empty())
				Net.join_room(FileAccess.get_file_as_string(code_file).strip_edges(), "secreto")
				_goto("guest_joined")
			elif phase_t > 5.0:
				_check("wrong_password_rejected", false)
				_goto("guest_joined")
		"guest_joined":
			if not Net.room.is_empty() and not _start_requested:
				_start_requested = true
				_check("joined_with_code_and_password", true)
				Net.start_match()  # guest is not host: must be refused
			if Net.prediction:
				_goto("wait_match")
		"wait_match":
			if Net.prediction and Net.prediction.last_snapshot_tick > 0:
				_check("match_started_and_snapshots", true)
				var p: ClientPrediction = Net.prediction
				_check("two_cars_in_match", p.world.cars.size() == 2)
				_check("has_own_car", p.local_car_id in [0, 1])
				results["metrics"]["your_car"] = p.local_car_id
				if role == "host":
					Net.debug_cmd("skip_countdown", [])
				_goto("countdown")
			elif phase_t > 15.0:
				_check("match_started_and_snapshots", false)
				_finish("no snapshots")
		"countdown":
			if Net.prediction.match_state.get("phase", 0) == MatchRules.Phase.PLAYING:
				var p: ClientPrediction = Net.prediction
				my_car_start = _snap_car(p.local_car_id)
				remote_start = _snap_car(1 - p.local_car_id)
				_goto("drive")
			elif phase_t > 8.0:
				_finish("countdown never ended")
		"drive":
			if phase_t > 2.0:
				var p: ClientPrediction = Net.prediction
				var mine: Vector3 = _snap_car(p.local_car_id)
				var other: Vector3 = _snap_car(1 - p.local_car_id)
				_check("own_car_moves_on_server", mine.distance_to(my_car_start) > 5.0)
				_check("remote_car_movement_visible", other.distance_to(remote_start) > 5.0)
				results["metrics"]["avg_prediction_error_m"] = p.avg_error
				if role == "guest" and not _did_bad_input:
					_did_bad_input = true
					# Malformed packets straight to the server: must be ignored.
					Net._rpc("s_input", [PackedByteArray([1, 2, 3])], false)
					Net._rpc("s_input", [PackedByteArray()], false)
				if role == "host":
					Net.debug_cmd("ball", [Vector3(0, 2.0, 47.0), Vector3(0, 0, 25.0)])
				_goto("goal")
		"goal":
			if goal_events > 0 and Net.prediction and int(Net.prediction.match_state.get("score0", 0)) == 1:
				_check("goal_event_received", true)
				_check("score_synchronized_1_0", int(Net.prediction.match_state["score1"]) == 0)
				_goto("after_goal")
			elif phase_t > 10.0:
				_check("goal_event_received", goal_events > 0)
				_check("score_synchronized_1_0", false)
				_goto("after_goal")
		"after_goal":
			if role == "guest" and not _reconnected and phase_t > 4.0:
				_reconnected = true
				_log("simulating connection loss")
				Net._close_transport()
				Net._set_status("reconnecting")
				Net._reconnect_timer = 0.5
				Net._want_connection = true
				_goto("reconnect_wait")
			elif role == "host" and phase_t > 9.0:
				Net.debug_cmd("end_time", [])
				_goto("end")
		"reconnect_wait":
			if Net.is_online() and _match_starts >= 2 and Net.prediction and Net.prediction.last_snapshot_tick > 0:
				_check("reconnected_into_same_match", true)
				_goto("end")
			elif phase_t > 12.0:
				_check("reconnected_into_same_match", false)
				_goto("end")
		"end":
			if match_end_seen:
				_check("match_end_received", true)
				_goto("wait_lobby")
			elif phase_t > 20.0:
				_check("match_end_received", false)
				_finish("no match end")
		"wait_lobby":
			if _left_lobby_event or phase_t > 12.0:
				_check("returned_to_lobby", _left_lobby_event)
				_finish("done")


func _capture_metrics() -> void:
	var p: ClientPrediction = Net.prediction
	if p == null:
		return
	results["metrics"]["reconciliations"] = p.reconcile_count
	results["metrics"]["avg_prediction_error_m"] = p.avg_error
	results["metrics"]["snapshots"] = p.snapshots_received
	results["metrics"]["snapshots_missing"] = p.snapshots_missing
	results["metrics"]["resim_ticks_avg"] = float(p.resim_ticks_total) / maxf(1.0, p.reconcile_count)
	results["metrics"]["final_score"] = "%d-%d" % [p.match_state.get("score0", -1), p.match_state.get("score1", -1)]


func _snap_car(id: int) -> Vector3:
	var s: Dictionary = Net.prediction.last_snapshot
	for c in s.get("cars", []):
		if int(c["id"]) == id:
			return c["pos"]
	return Vector3.ZERO


func _finish(reason: String) -> void:
	if phase == "finished":
		return
	phase = "finished"
	_log("finish: " + reason)
	results["reason"] = reason
	if role == "guest":
		_check("non_host_cannot_start", errors.has("not_host") or errors.has("not_in_lobby"))
	results["metrics"]["rtt_ms"] = Net.rtt_ms
	results["metrics"]["jitter_ms"] = Net.jitter_ms
	_capture_metrics()
	results["metrics"]["bw_in_kbps"] = Net.bw_in_kbps
	results["metrics"]["bytes_in"] = Net.bytes_in
	results["metrics"]["bytes_out"] = Net.bytes_out
	var f := FileAccess.open(out_path, FileAccess.WRITE)
	f.store_string(JSON.stringify(results, "  "))
	f.close()
	Net.disconnect_from_server()
	get_tree().quit(0)
