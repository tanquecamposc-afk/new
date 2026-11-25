class_name RoomManager
extends RefCounted
## Server-side lobby service: guest sessions, reconnection tokens, rooms
## resolved by code, server browser, and casual matchmaking queues.
## Talks to clients only through the `send` callable supplied by ServerHost:
##   send.call(peer_id, method_name, args_array)

const RECONNECT_WINDOW := 60.0
const QUEUE_BOT_FILL_AFTER := 30.0
const PLAYLISTS := {"casual_1v1": 1, "casual_2v2": 2, "casual_3v3": 3, "casual_4v4": 4}

var sessions: Dictionary = {}        # player_id -> PlayerSession
var by_peer: Dictionary = {}         # peer_id -> player_id
var by_token: Dictionary = {}        # token -> player_id
var rooms: Dictionary = {}           # code -> MatchRoom
var queues: Dictionary = {}          # playlist -> Array[player_id]
var send: Callable
var now_fn: Callable
var region: String = "local"
var allow_debug: bool = false
var log_fn: Callable
var stats := {"rejected": 0, "matches_started": 0}
var _rng := RandomNumberGenerator.new()
var _queue_timer: float = 0.0


func _init(p_send: Callable, p_now: Callable, p_log: Callable) -> void:
	send = p_send
	now_fn = p_now
	log_fn = p_log
	_rng.randomize()
	for p in PLAYLISTS.keys():
		queues[p] = []


func _log(msg: String) -> void:
	if log_fn.is_valid():
		log_fn.call(msg)


func _now() -> float:
	return float(now_fn.call())


func session_for_peer(peer_id: int) -> PlayerSession:
	var pid: String = by_peer.get(peer_id, "")
	return sessions.get(pid)


func _new_id(prefix: String, length: int) -> String:
	var s := prefix
	for i in length:
		s += "%x" % _rng.randi_range(0, 15)
	return s


# ------------------------------------------------------------ sessions
func hello(peer_id: int, version: int, player_name: String, token: String) -> void:
	if version != NetProtocol.VERSION:
		send.call(peer_id, "c_error", ["version", "Versión incompatible: servidor v%d, cliente v%d" % [NetProtocol.VERSION, version]])
		return
	var s: PlayerSession = null
	var reconnected: bool = false
	if token != "" and by_token.has(token):
		s = sessions.get(by_token[token])
		if s and not s.connected:
			reconnected = true
		elif s and s.connected:
			# Same token from a new peer: take over (e.g. client crashed).
			by_peer.erase(s.peer_id)
			reconnected = true
	if s == null:
		s = PlayerSession.new()
		s.player_id = _new_id("P", 8)
		s.token = _new_id("", 32)
		by_token[s.token] = s.player_id
		sessions[s.player_id] = s
	s.name = NetProtocol.sanitize_name(player_name)
	s.peer_id = peer_id
	s.connected = true
	by_peer[peer_id] = s.player_id
	_log("hello peer=%d player=%s name=%s reconnected=%s" % [peer_id, s.player_id, s.name, reconnected])
	send.call(peer_id, "c_welcome", [{"player_id": s.player_id, "token": s.token, "name": s.name,
		"server_version": NetProtocol.VERSION, "region": region, "reconnected": reconnected,
		"tick_rate": 120}])
	if reconnected and s.room_code != "" and rooms.has(s.room_code):
		var room: MatchRoom = rooms[s.room_code]
		room.restore_player(s)
		_broadcast_room(room)
		if room.state == MatchRoom.State.MATCH:
			send.call(peer_id, "c_match_start", [room.match_config_for(s)])


func peer_disconnected(peer_id: int) -> void:
	var s: PlayerSession = session_for_peer(peer_id)
	by_peer.erase(peer_id)
	if s == null:
		return
	s.connected = false
	s.peer_id = 0
	s.disconnected_at = _now()
	_leave_queue(s)
	_log("disconnect player=%s room=%s" % [s.player_id, s.room_code])
	if s.room_code != "" and rooms.has(s.room_code):
		var room: MatchRoom = rooms[s.room_code]
		if room.state == MatchRoom.State.LOBBY:
			_remove_from_room(s, "disconnected")
		else:
			room.on_player_disconnected(s)
			_broadcast_room(room)


func _expire_sessions() -> void:
	var t: float = _now()
	for pid in sessions.keys():
		var s: PlayerSession = sessions[pid]
		if not s.connected and t - s.disconnected_at > RECONNECT_WINDOW:
			if s.room_code != "" and rooms.has(s.room_code):
				_remove_from_room(s, "timeout")
			by_token.erase(s.token)
			sessions.erase(pid)


# ------------------------------------------------------------ rooms
func list_rooms(peer_id: int) -> void:
	var out: Array = []
	for r in rooms.values():
		if r.is_public and not r.from_matchmaking:
			out.append(r.browser_entry())
	send.call(peer_id, "c_room_list", [out])


func create_room(s: PlayerSession, cfg: Dictionary) -> MatchRoom:
	if s.room_code != "":
		_remove_from_room(s, "left")
	_leave_queue(s)
	var code: String = NetProtocol.make_room_code(_rng)
	while rooms.has(code):
		code = NetProtocol.make_room_code(_rng)
	var room := MatchRoom.new(code, _rng.randi())
	room.region = region
	room.created_at = _now()
	room.room_name = "Sala de " + s.name
	room.apply_config(cfg)
	rooms[code] = room
	room.add_player(s, false)
	_log("room created %s by %s (%s, public=%s, pw=%s)" % [code, s.player_id, room.mode_id, room.is_public, room.has_password()])
	_broadcast_room(room)
	return room


func join_room(s: PlayerSession, code: String, password: String, as_spectator: bool) -> void:
	var c: String = NetProtocol.normalize_code(code)
	var room: MatchRoom = rooms.get(c)
	if room == null:
		send.call(s.peer_id, "c_error", ["room_not_found", "No existe ninguna sala con el código %s" % c])
		return
	if not room.check_password(password):
		send.call(s.peer_id, "c_error", ["bad_password", "Contraseña incorrecta"])
		return
	if room.from_matchmaking and not room.players.has(s.player_id):
		send.call(s.peer_id, "c_error", ["private", "Esta partida es de emparejamiento"])
		return
	if s.room_code != "" and s.room_code != c:
		_remove_from_room(s, "left")
	_leave_queue(s)
	if not room.add_player(s, as_spectator or room.state != MatchRoom.State.LOBBY):
		send.call(s.peer_id, "c_error", ["room_full", "La sala está llena"])
		return
	_broadcast_room(room)
	if room.state == MatchRoom.State.MATCH:
		send.call(s.peer_id, "c_match_start", [room.match_config_for(s)])


func leave_room(s: PlayerSession) -> void:
	_remove_from_room(s, "left")


func _remove_from_room(s: PlayerSession, reason: String) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null:
		s.room_code = ""
		return
	room.remove_player(s.player_id)
	if s.connected:
		send.call(s.peer_id, "c_left_room", [reason])
	if room.players.is_empty():
		rooms.erase(room.code)
		_log("room closed %s" % room.code)
	else:
		_broadcast_room(room)


func _broadcast_room(room: MatchRoom) -> void:
	var st: Dictionary = room.public_state()
	for p in room.players.values():
		if p.connected:
			send.call(p.peer_id, "c_room_state", [st])


func update_room(s: PlayerSession, cfg: Dictionary) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or room.host_id != s.player_id or room.state != MatchRoom.State.LOBBY:
		send.call(s.peer_id, "c_error", ["not_host", "Solo el anfitrión puede cambiar la sala"])
		return
	room.apply_config(cfg)
	_broadcast_room(room)


func set_team(s: PlayerSession, team: int) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or not room.set_team(s, team):
		send.call(s.peer_id, "c_error", ["team", "No se puede cambiar a ese equipo"])
		return
	_broadcast_room(room)


func set_ready(s: PlayerSession, ready: bool) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or room.state != MatchRoom.State.LOBBY:
		return
	s.ready = ready
	_broadcast_room(room)


func start_match(s: PlayerSession) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null:
		return
	var why: String = room.can_start(s.player_id)
	if why != "":
		send.call(s.peer_id, "c_error", [why, "No se puede iniciar: %s" % why])
		return
	_start(room)


func _start(room: MatchRoom) -> void:
	room.start_match()
	stats["matches_started"] += 1
	_log("match start room=%s id=%s cars=%d" % [room.code, room.match_id, room.world.cars.size()])
	for p in room.players.values():
		if p.connected:
			send.call(p.peer_id, "c_match_start", [room.match_config_for(p)])
	_broadcast_room(room)


func chat(s: PlayerSession, text: String, team_only: bool) -> void:
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or not s.allow_chat(_now()):
		return
	var clean: String = text.strip_edges().left(120)
	if clean == "":
		return
	var msg := {"from": s.name, "text": clean, "team": s.team, "team_only": team_only}
	for p in room.players.values():
		if p.connected and (not team_only or p.team == s.team):
			send.call(p.peer_id, "c_chat", [msg])


# ------------------------------------------------------------ inputs
func input(s: PlayerSession, data: PackedByteArray) -> void:
	if not s.allow_input(_now()):
		return
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or room.state != MatchRoom.State.MATCH or s.car_id < 0:
		return
	var decoded: Array = NetProtocol.decode_inputs(data)
	if decoded.is_empty():
		s.rejected_messages += 1
		stats["rejected"] += 1
		return
	for item in decoded:
		s.inputs.add(int(item[0]), item[1], room.world.tick)


# ------------------------------------------------------------ matchmaking
func queue(s: PlayerSession, playlist: String, join: bool) -> void:
	if not PLAYLISTS.has(playlist):
		send.call(s.peer_id, "c_error", ["playlist", "Lista desconocida"])
		return
	_leave_queue(s)
	if join:
		if s.room_code != "":
			_remove_from_room(s, "queue")
		s.queue_playlist = playlist
		s.queue_since = _now()
		queues[playlist].append(s.player_id)
	_send_queue_status(playlist)
	if not join:
		send.call(s.peer_id, "c_queue_status", [{"playlist": "", "in_queue": 0}])


func _leave_queue(s: PlayerSession) -> void:
	if s.queue_playlist != "" and queues.has(s.queue_playlist):
		queues[s.queue_playlist].erase(s.player_id)
		var pl: String = s.queue_playlist
		s.queue_playlist = ""
		_send_queue_status(pl)


func _send_queue_status(playlist: String) -> void:
	var q: Array = queues[playlist]
	var needed: int = PLAYLISTS[playlist] * 2
	for pid in q:
		var s: PlayerSession = sessions.get(pid)
		if s and s.connected:
			send.call(s.peer_id, "c_queue_status", [{"playlist": playlist, "in_queue": q.size(),
				"needed": needed, "waited": _now() - s.queue_since, "bot_fill_after": QUEUE_BOT_FILL_AFTER}])


func _process_queues() -> void:
	for playlist in queues.keys():
		var q: Array = queues[playlist]
		var size: int = PLAYLISTS[playlist]
		while q.size() >= size * 2:
			_make_queue_match(playlist, q.slice(0, size * 2), false)
			q = queues[playlist]
		if q.size() > 0:
			var first: PlayerSession = sessions.get(q[0])
			if first and _now() - first.queue_since >= QUEUE_BOT_FILL_AFTER:
				# Casual only: fill the remaining slots with clearly labelled bots.
				_make_queue_match(playlist, q.duplicate(), true)
			else:
				_send_queue_status(playlist)


func _make_queue_match(playlist: String, ids: Array, fill_bots: bool) -> void:
	var size: int = PLAYLISTS[playlist]
	var room := MatchRoom.new(NetProtocol.make_room_code(_rng), _rng.randi())
	room.room_name = "Casual %dv%d" % [size, size]
	room.mode_id = "soccar_%dv%d" % [size, size] if size < 4 else "chaos_4v4"
	room.team_size = size
	room.bots = fill_bots
	room.is_public = false
	room.from_matchmaking = true
	room.playlist = playlist
	room.region = region
	rooms[room.code] = room
	var i: int = 0
	for pid in ids:
		var s: PlayerSession = sessions.get(pid)
		queues[playlist].erase(pid)
		if s == null:
			continue
		s.queue_playlist = ""
		room.add_player(s, false)
		s.team = i % 2
		i += 1
	_log("matchmaking %s -> room %s (%d players, bots=%s)" % [playlist, room.code, ids.size(), fill_bots])
	_start(room)


# ------------------------------------------------------------ loop
func tick(dt: float) -> void:
	for room in rooms.values():
		var evs: Array = room.tick(dt)
		for e in evs:
			if e["type"] == "lobby":
				_broadcast_room(room)
				for p in room.players.values():
					if p.connected:
						send.call(p.peer_id, "c_match_event", [e])
				if room.from_matchmaking:
					for p in room.players.values().duplicate():
						_remove_from_room(p, "match_over")
				continue
			for p in room.players.values():
				if p.connected:
					send.call(p.peer_id, "c_match_event", [e])
	_queue_timer += dt
	if _queue_timer >= 1.0:
		_queue_timer = 0.0
		_process_queues()
		_expire_sessions()


## Server debug commands (only with --allow-debug, used by integration tests).
func debug(s: PlayerSession, cmd: String, args: Array) -> void:
	if not allow_debug:
		s.rejected_messages += 1
		stats["rejected"] += 1
		send.call(s.peer_id, "c_error", ["forbidden", "Comando no permitido"])
		return
	var room: MatchRoom = rooms.get(s.room_code)
	if room == null or room.world == null:
		return
	match cmd:
		"ball":
			if args.size() >= 2 and args[0] is Vector3 and args[1] is Vector3:
				room.world.ball.pos = args[0]
				room.world.ball.vel = args[1]
				room.world.last_touch_car = s.car_id
		"skip_countdown":
			if room.rules.phase == MatchRules.Phase.COUNTDOWN:
				room.rules.phase_timer = 0.0
		"end_time":
			room.rules.time_remaining = 0.05
			room.world.last_touch_car = maxi(room.world.last_touch_car, 0)
