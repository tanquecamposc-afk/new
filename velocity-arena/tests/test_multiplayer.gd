extends RefCounted
## Unit tests for the networking layer (no sockets): protocol encoding,
## validation, lobby/room rules, matchmaking, reconnection and prediction.
## Real-socket multi-process tests live in tests/multiplayer/run_mp_tests.py.

const DT := 1.0 / 120.0
var runner: Object


class FakeNet:
	var sent: Array = []      # [peer, method, args]
	var t: float = 0.0
	func send(peer: int, method: String, args: Array) -> void:
		sent.append([peer, method, args])
	func now() -> float:
		return t
	func last(method: String) -> Array:
		for i in range(sent.size() - 1, -1, -1):
			if sent[i][1] == method:
				return sent[i]
		return []
	func count(method: String) -> int:
		var n: int = 0
		for s in sent:
			if s[1] == method:
				n += 1
		return n


func _manager(fake: FakeNet, debug: bool = false) -> RoomManager:
	var m := RoomManager.new(fake.send, fake.now, Callable())
	m.allow_debug = debug
	return m


func test_input_roundtrip_and_validation() -> void:
	var hist := {}
	for t in range(10, 15):
		var c := CarControls.new()
		c.throttle = 0.5
		c.steer = -1.0
		c.jump = t % 2 == 0
		c.boost = true
		hist[t] = c
	var data: PackedByteArray = NetProtocol.encode_inputs(14, hist)
	var dec: Array = NetProtocol.decode_inputs(data)
	runner.check(dec.size() == NetProtocol.INPUT_REDUNDANCY, "redundant inputs decoded")
	runner.check(dec[dec.size() - 1][0] == 14 and absf(dec[0][1].throttle - 0.5) < 0.01 and dec[0][1].boost, "values survive encoding")
	runner.check(data.size() <= NetProtocol.MAX_INPUT_BYTES, "input packet small (%d bytes)" % data.size())
	runner.check(NetProtocol.decode_inputs(PackedByteArray([1, 2, 3])).is_empty(), "short packet rejected")
	var bogus := data.duplicate()
	bogus[4] = 9
	runner.check(NetProtocol.decode_inputs(bogus).is_empty(), "inconsistent count rejected")
	var huge := PackedByteArray()
	huge.resize(500)
	runner.check(NetProtocol.decode_inputs(huge).is_empty(), "oversized packet rejected")


func test_snapshot_roundtrip_full_state() -> void:
	var a := SimWorld.new(PhysicsConfig.new())
	var b := SimWorld.new(PhysicsConfig.new())
	for t in [0, 1]:
		a.add_car(t)
		b.add_car(t)
	var mode: GameModeDef = GameModeRegistry.get_mode("soccar_1v1")
	var rules := MatchRules.new(a, mode, 1)
	rules.start()
	rules.phase_timer = 0.0
	for i in 400:
		a.cars[0].controls.throttle = 1.0
		a.cars[0].controls.jump = i % 90 < 10
		a.cars[1].controls.steer = 0.5
		a.cars[1].controls.throttle = 1.0
		rules.step(DT)
	var data: PackedByteArray = NetProtocol.encode_snapshot(a, rules, 123)
	var s: Dictionary = NetProtocol.decode_snapshot(data)
	runner.check(not s.is_empty() and s["ack"] == 123 and s["tick"] == a.tick, "snapshot decodes")
	runner.info("snapshot size for 2 cars: %d bytes" % data.size())
	NetProtocol.apply_snapshot(b, s, [0, 1])
	for i in 60:
		a.step(DT)
		b.step(DT)
	var err: float = a.ball.pos.distance_to(b.ball.pos)
	for i in 2:
		err = maxf(err, a.cars[i].pos.distance_to(b.cars[i].pos))
	runner.check(err < 0.05, "restored snapshot continues identically (err %.4f m)" % err)
	var bad := data.duplicate()
	bad[0] = 7
	runner.check(NetProtocol.decode_snapshot(bad).is_empty(), "wrong message type rejected")
	runner.check(NetProtocol.decode_snapshot(data.slice(0, data.size() - 5)).is_empty(), "truncated snapshot rejected")


func test_room_codes_and_names() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	var c: String = NetProtocol.make_room_code(rng)
	runner.check(c.begins_with("VA-") and c.length() == 9, "code format " + c)
	runner.check(NetProtocol.normalize_code(" va-abc234 ") == "VA-ABC234", "code normalisation")
	runner.check(NetProtocol.normalize_code("abc234") == "VA-ABC234", "code without prefix")
	runner.check(NetProtocol.sanitize_name("  Juan\u0007  ") == "Juan", "control chars stripped")
	runner.check(NetProtocol.sanitize_name("a") == "Jugador", "too-short name replaced")
	runner.check(NetProtocol.sanitize_name("x".repeat(40)).length() == 16, "name length capped")
	runner.check(NetProtocol.hash_password("pw", "s1") != NetProtocol.hash_password("pw", "s2"), "salted hashes differ")


func test_lobby_rules() -> void:
	var f := FakeNet.new()
	var m := _manager(f)
	m.hello(10, NetProtocol.VERSION, "Host", "")
	m.hello(11, NetProtocol.VERSION, "Guest", "")
	m.hello(12, NetProtocol.VERSION - 1, "Old", "")
	runner.check(f.last("c_error")[2][0] == "version", "old client version rejected")
	var host: PlayerSession = m.session_for_peer(10)
	var guest: PlayerSession = m.session_for_peer(11)
	var room: MatchRoom = m.create_room(host, {"mode": "soccar_1v1", "password": "abc", "name": "Mi sala", "minutes": 3.0})
	runner.check(room.room_name == "Mi sala" and room.team_size == 1 and room.minutes == 3.0, "config applied")
	m.join_room(guest, room.code, "mal", false)
	runner.check(f.last("c_error")[2][0] == "bad_password" and not room.players.has(guest.player_id), "wrong password rejected")
	m.join_room(guest, room.code.to_lower(), "abc", false)
	runner.check(room.players.has(guest.player_id) and guest.team == 1, "joined with code + password, auto-balanced team")
	m.join_room(guest, "VA-ZZZZZZ", "", false)
	runner.check(f.last("c_error")[2][0] == "room_not_found", "unknown code rejected")
	m.update_room(guest, {"minutes": 10.0})
	runner.check(f.last("c_error")[2][0] == "not_host" and room.minutes == 3.0, "non-host cannot change settings")
	m.start_match(guest)
	runner.check(room.state == MatchRoom.State.LOBBY, "non-host cannot start")
	room.apply_config({"mode": "free_play", "minutes": 7.5, "team_size": 99, "lighting": "hack"})
	runner.check(room.mode_id == "soccar_1v1" and room.minutes == 5.0 and room.team_size == 4 and room.lighting == "night", "invalid config values sanitised")
	room.apply_config({"team_size": 1})
	m.set_team(guest, 0)
	runner.check(guest.team == 1, "full team rejected")
	m.start_match(host)
	runner.check(room.state == MatchRoom.State.MATCH and room.world.cars.size() == 2, "host starts match with 2 cars")
	runner.check(f.count("c_match_start") >= 2, "both players told the match started")


func test_inputs_and_authority() -> void:
	var f := FakeNet.new()
	var m := _manager(f)
	m.hello(10, NetProtocol.VERSION, "A", "")
	m.hello(11, NetProtocol.VERSION, "B", "")
	var a: PlayerSession = m.session_for_peer(10)
	var b: PlayerSession = m.session_for_peer(11)
	var room: MatchRoom = m.create_room(a, {"mode": "soccar_1v1"})
	m.join_room(b, room.code, "", false)
	m.start_match(a)
	room.rules.phase_timer = 0.0
	var car: CarBody = room.world.get_car(a.car_id)
	var start: Vector3 = car.pos
	var hist := {}
	for i in 240:
		var t: int = room.world.tick + 1
		var c := CarControls.new()
		c.throttle = 1.0
		hist[t] = c
		m.input(a, NetProtocol.encode_inputs(t, hist))
		m.tick(DT)
		f.t += DT
	runner.check(car.pos.distance_to(start) > 5.0, "server applies client inputs")
	var before: int = m.stats["rejected"]
	m.input(a, PackedByteArray([0, 0, 0]))
	runner.check(m.stats["rejected"] == before + 1, "malformed input counted and ignored")
	m.debug(b, "ball", [Vector3(0, 1, 50), Vector3.ZERO])
	runner.check(f.last("c_error")[2][0] == "forbidden", "debug commands refused without --allow-debug")
	# Flooding inputs beyond the rate limit is dropped.
	var accepted_before: int = a.inputs.received
	for i in 600:
		m.input(a, NetProtocol.encode_inputs(room.world.tick + 2 + i, {room.world.tick + 2 + i: CarControls.new()}))
	runner.check(a.inputs.received - accepted_before < 300, "input flood rate-limited")


func test_chat_rate_limit() -> void:
	var f := FakeNet.new()
	var m := _manager(f)
	m.hello(10, NetProtocol.VERSION, "A", "")
	var a: PlayerSession = m.session_for_peer(10)
	m.create_room(a, {})
	for i in 10:
		m.chat(a, "hola %d" % i, false)
	runner.check(f.count("c_chat") == 4, "chat limited to 4 messages per 5 s (%d)" % f.count("c_chat"))


func test_reconnection() -> void:
	var f := FakeNet.new()
	var m := _manager(f)
	m.hello(10, NetProtocol.VERSION, "A", "")
	m.hello(11, NetProtocol.VERSION, "B", "")
	var a: PlayerSession = m.session_for_peer(10)
	var b: PlayerSession = m.session_for_peer(11)
	var room: MatchRoom = m.create_room(a, {"mode": "soccar_1v1"})
	m.join_room(b, room.code, "", false)
	m.start_match(a)
	var token: String = b.token
	var car_id: int = b.car_id
	m.peer_disconnected(11)
	runner.check(not b.connected and room.players.has(b.player_id), "slot reserved after disconnect")
	m.hello(20, NetProtocol.VERSION, "B", token)
	var b2: PlayerSession = m.session_for_peer(20)
	runner.check(b2 == b and b2.car_id == car_id, "token restores the same player and car")
	runner.check(f.last("c_match_start")[0] == 20, "rejoining client receives the running match")
	m.peer_disconnected(20)
	f.t += RoomManager.RECONNECT_WINDOW + 2.0
	m.tick(1.0)
	runner.check(not room.players.has(b.player_id), "expired slot released")


func test_matchmaking_queue() -> void:
	var f := FakeNet.new()
	var m := _manager(f)
	for i in 3:
		m.hello(30 + i, NetProtocol.VERSION, "P%d" % i, "")
		m.queue(m.session_for_peer(30 + i), "casual_1v1", true)
	m.tick(1.0)
	var rooms: int = m.rooms.size()
	runner.check(rooms == 1, "two queued players matched into a room")
	var st: Array = f.last("c_queue_status")
	runner.check(st[2][0]["in_queue"] == 1, "remaining player sees the real queue size")
	f.t += RoomManager.QUEUE_BOT_FILL_AFTER + 1.0
	m.tick(1.0)
	var bot_room: MatchRoom = null
	for r in m.rooms.values():
		if r.bots:
			bot_room = r
	runner.check(bot_room != null and bot_room.world.cars.size() == 2, "after the wait a casual match is filled with labelled bots")
	runner.check(bot_room.car_names[1].ends_with("(BOT)") or bot_room.car_names[0].ends_with("(BOT)"), "bots are labelled")


func test_input_buffer() -> void:
	var ib := InputBuffer.new()
	var c := CarControls.new()
	c.throttle = 1.0
	ib.add(5, c, 0)
	runner.check(ib.take(4).throttle == 0.0 and ib.missing == 1, "missing tick repeats last input")
	runner.check(ib.take(5).throttle == 1.0, "input applied on its tick")
	var c2 := CarControls.new()
	c2.throttle = -1.0
	ib.take(10)
	ib.add(8, c2, 10)
	runner.check(ib.late == 1 and ib.last.throttle == -1.0, "genuinely late input counted and kept as latest intent")
	ib.add(5, c2, 10)
	runner.check(ib.late == 1, "redundant copy of an old input ignored")
	runner.check(not ib.add(500, c, 5), "absurdly future input ignored")


func test_prediction_with_simulated_latency() -> void:
	# Server and client worlds in-process; messages delayed by 6 ticks each way.
	var mode: GameModeDef = GameModeRegistry.get_mode("soccar_1v1")
	var server := SimWorld.new(mode.build_physics())
	var client := SimWorld.new(mode.build_physics())
	for t in [0, 1]:
		server.add_car(t)
		client.add_car(t)
	var rules := MatchRules.new(server, mode, 3)
	rules.start()
	rules.phase_timer = 0.0
	rules.step(DT)
	var pred := ClientPrediction.new(client, 0, server.tick)
	pred.rtt_ms = 100.0
	var buf := InputBuffer.new()
	var to_server: Array = []
	var to_client: Array = []
	var delay: int = 6
	for frame in 600:
		var c := CarControls.new()
		c.throttle = 1.0
		c.steer = sin(frame * 0.02)
		c.jump = frame % 200 < 15
		for k in pred.steps_this_frame():
			pred.step(c)
		to_server.append([frame + delay, NetProtocol.encode_inputs(pred.tick, pred.history)])
		while not to_server.is_empty() and to_server[0][0] <= frame:
			for item in NetProtocol.decode_inputs(to_server.pop_front()[1]):
				buf.add(item[0], item[1], server.tick)
		server.cars[0].controls.copy_from(buf.take(server.tick + 1))
		rules.step(DT)
		if frame % 2 == 0:
			to_client.append([frame + delay, NetProtocol.encode_snapshot(server, rules, 0)])
		while not to_client.is_empty() and to_client[0][0] <= frame:
			pred.on_snapshot(NetProtocol.decode_snapshot(to_client.pop_front()[1]))
	runner.info("prediction @100 ms: avg error %.3f m, reconciliations %d, inputs late %d, lead %d ticks" % [pred.avg_error, pred.reconcile_count, buf.late, pred.tick - pred.last_snapshot_tick])
	runner.check(pred.reconcile_count > 200, "client reconciles against snapshots")
	# Only the start-up transient (before the first snapshot sets the lead) may be late.
	runner.check(buf.late < 40, "client runs far enough ahead: inputs arrive in time (%d late of 600)" % buf.late)
	runner.check(pred.avg_error < 0.25, "prediction stays close to the server (avg %.3f m)" % pred.avg_error)
	runner.check(server.cars[0].pos.distance_to(Vector3(0, 0, -38)) > 10.0, "server car driven by client inputs")
