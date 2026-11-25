extends Node
## Autoload "Net": client side of online play + command-line bootstrap.
##
## Command line (after `--`):
##   --server [--port 7777] [--region sa] [--allow-debug] [--heartbeat path]
##   --client --address 1.2.3.4 [--port 7777] [--name Juan]
##   --lag 100 --jitter 10 --loss 2     (client-side network simulation)

signal status_changed(status: String)
signal welcomed(info: Dictionary)
signal net_error(code: String, msg: String)
signal room_list_received(rooms: Array)
signal room_state_changed(state: Dictionary)
signal left_room(reason: String)
signal chat_received(msg: Dictionary)
signal queue_status_changed(d: Dictionary)
signal match_started(cfg: Dictionary)
signal match_event(e: Dictionary)
signal lan_servers_found(servers: Array)

const TOKEN_PATH := "user://net_session.cfg"

var status: String = "offline"   ## offline | connecting | online | reconnecting
var address: String = "127.0.0.1"
var port: int = NetProtocol.DEFAULT_PORT
var player_name: String = "Jugador"
var player_id: String = ""
var token: String = ""
var room: Dictionary = {}
var match_cfg: Dictionary = {}
var prediction: ClientPrediction
var queue_status: Dictionary = {}
var server_info: Dictionary = {}
var last_error: String = ""

# Diagnostics.
var rtt_ms: float = 0.0
var jitter_ms: float = 0.0
var packet_loss: float = 0.0
var bytes_in: int = 0
var bytes_out: int = 0
var bw_in_kbps: float = 0.0
var bw_out_kbps: float = 0.0
var server_tick: int = 0
var lag := LagSimulator.new(7)

# Command-line state.
var dedicated: bool = false
var cli_args: Dictionary = {}
var local_server: ServerHost

var _client_root: Node
var _endpoint: NetEndpoint
var _mp: SceneMultiplayer
var _peer: ENetMultiplayerPeer
var _ping_timer: float = 0.0
var _bw_timer: float = 0.0
var _bytes_in_mark: int = 0
var _bytes_out_mark: int = 0
var _reconnect_attempts: int = 0
var _reconnect_timer: float = 0.0
var _want_connection: bool = false
var _pings_sent: int = 0
var _pongs: int = 0
var _discovery: PacketPeerUDP
var _discovery_until: int = 0
var _found: Dictionary = {}


func _ready() -> void:
	cli_args = _parse_args(OS.get_cmdline_user_args())
	_load_token()
	lag.latency_ms = float(cli_args.get("lag", 0.0))
	lag.jitter_ms = float(cli_args.get("jitter", 0.0))
	lag.loss_percent = float(cli_args.get("loss", 0.0))
	if cli_args.has("name"):
		player_name = NetProtocol.sanitize_name(str(cli_args["name"]))
	if cli_args.has("server"):
		dedicated = true
		call_deferred("_start_dedicated")


static func _parse_args(args: PackedStringArray) -> Dictionary:
	var out := {}
	var i: int = 0
	while i < args.size():
		var a: String = args[i]
		if a.begins_with("--"):
			var key: String = a.substr(2)
			if i + 1 < args.size() and not args[i + 1].begins_with("--"):
				out[key] = args[i + 1]
				i += 1
			else:
				out[key] = true
		i += 1
	return out


func _start_dedicated() -> void:
	var srv := ServerHost.new()
	srv.name = "DedicatedServer"
	srv.allow_debug = cli_args.has("allow-debug")
	srv.region = str(cli_args.get("region", "local"))
	srv.heartbeat_path = str(cli_args.get("heartbeat", ""))
	srv.server_name = str(cli_args.get("server-name", "Servidor Velocity Arena"))
	if cli_args.has("snapshot-rate"):
		srv.snapshot_every = clampi(int(120 / int(cli_args["snapshot-rate"])), 1, 6)
	get_tree().root.add_child(srv)
	var err: int = srv.start(int(cli_args.get("port", NetProtocol.DEFAULT_PORT)))
	if err != OK:
		get_tree().quit(2)


# ------------------------------------------------------------ connection
func connect_to(p_address: String, p_port: int, p_name: String) -> int:
	disconnect_from_server(false)
	address = p_address.strip_edges()
	port = p_port
	player_name = NetProtocol.sanitize_name(p_name)
	_want_connection = true
	_set_status("connecting")
	call_deferred("_open")
	return OK


func _open() -> int:
	_peer = ENetMultiplayerPeer.new()
	var err: int = _peer.create_client(address, port, 3)
	if err != OK:
		_set_status("offline")
		net_error.emit("connect", "No se pudo crear la conexión (%d)" % err)
		return err
	_client_root = Node.new()
	_client_root.name = "ClientRoot"
	get_tree().root.add_child(_client_root)
	_endpoint = NetEndpoint.new()
	_endpoint.name = "Endpoint"
	_endpoint.client_handler = self
	_client_root.add_child(_endpoint)
	_mp = SceneMultiplayer.new()
	_mp.allow_object_decoding = false
	get_tree().set_multiplayer(_mp, _client_root.get_path())
	_mp.multiplayer_peer = _peer
	_mp.connected_to_server.connect(_on_connected)
	_mp.connection_failed.connect(_on_failed)
	_mp.server_disconnected.connect(_on_server_lost)
	_set_status("connecting" if status != "reconnecting" else "reconnecting")
	return OK


func _close_transport() -> void:
	if _peer:
		_peer.close()
	if _client_root and is_instance_valid(_client_root):
		if _client_root.get_parent():
			_client_root.get_parent().remove_child(_client_root)
		_client_root.queue_free()
	_client_root = null
	_endpoint = null
	_mp = null
	_peer = null


func disconnect_from_server(clear_room: bool = true) -> void:
	_want_connection = false
	_close_transport()
	if clear_room:
		room = {}
		match_cfg = {}
		prediction = null
	_set_status("offline")


func host_lan(p_port: int, p_name: String) -> int:
	stop_local_server()
	local_server = ServerHost.new()
	local_server.name = "LocalServer"
	local_server.server_name = "Partida LAN de " + NetProtocol.sanitize_name(p_name)
	get_tree().root.add_child(local_server)
	var err: int = local_server.start(p_port)
	if err != OK:
		local_server.queue_free()
		local_server = null
		net_error.emit("host", "No se pudo abrir el puerto %d" % p_port)
		return err
	return connect_to("127.0.0.1", p_port, p_name)


func stop_local_server() -> void:
	if local_server and is_instance_valid(local_server):
		local_server.stop()
		local_server.queue_free()
	local_server = null


func is_online() -> bool:
	return status == "online"


func _on_connected() -> void:
	_reconnect_attempts = 0
	_rpc("s_hello", [NetProtocol.VERSION, player_name, token])


func _on_failed() -> void:
	_close_transport()
	if _want_connection and _reconnect_attempts < 5 and status == "reconnecting":
		return
	_set_status("offline")
	net_error.emit("connect", "No se pudo conectar a %s:%d" % [address, port])


func _on_server_lost() -> void:
	_close_transport()
	if _want_connection:
		_set_status("reconnecting")
		_reconnect_timer = 1.0
	else:
		_set_status("offline")


func _set_status(s: String) -> void:
	if s != status:
		status = s
		status_changed.emit(s)


func _save_token() -> void:
	var cf := ConfigFile.new()
	cf.set_value("session", "token", token)
	cf.set_value("session", "player_id", player_id)
	cf.save(TOKEN_PATH)


func _load_token() -> void:
	var cf := ConfigFile.new()
	if cf.load(TOKEN_PATH) == OK and not cli_args.has("fresh"):
		token = str(cf.get_value("session", "token", ""))
		player_id = str(cf.get_value("session", "player_id", ""))


# ------------------------------------------------------------ sending
func _rpc(method: String, args: Array, reliable: bool = true) -> void:
	if _endpoint == null or _mp == null or _mp.multiplayer_peer == null:
		return
	if _peer.get_connection_status() != MultiplayerPeer.CONNECTION_CONNECTED:
		return
	var ep: NetEndpoint = _endpoint
	lag.push(func():
		if is_instance_valid(ep) and ep.is_inside_tree():
			ep.callv("rpc_id", [1, method] + args), reliable)


func request_rooms() -> void: _rpc("s_list_rooms", [])
func create_room(cfg: Dictionary) -> void: _rpc("s_create_room", [cfg])
func join_room(code: String, password: String = "", spectator: bool = false) -> void: _rpc("s_join_room", [code, password, spectator])
func leave_room() -> void:
	_rpc("s_leave_room", [])
func set_team(team: int) -> void: _rpc("s_set_team", [team])
func set_ready(r: bool) -> void: _rpc("s_set_ready", [r])
func update_room(cfg: Dictionary) -> void: _rpc("s_update_room", [cfg])
func start_match() -> void: _rpc("s_start_match", [])
func send_chat(text: String, team_only: bool = false) -> void: _rpc("s_chat", [text, team_only])
func queue(playlist: String, join: bool) -> void: _rpc("s_queue", [playlist, join])
func debug_cmd(cmd: String, args: Array) -> void: _rpc("s_debug", [cmd, args])


func is_host() -> bool:
	return not room.is_empty() and room.get("host", "") == player_id


## Called every physics tick by the online match (or tests): predicts and
## sends the local input. Returns the number of steps simulated.
func client_tick(controls: CarControls) -> int:
	if prediction == null:
		return 0
	var n: int = prediction.steps_this_frame()
	for i in n:
		prediction.step(controls)
	if n > 0 and prediction.local_car_id >= 0:
		var data: PackedByteArray = NetProtocol.encode_inputs(prediction.tick, prediction.history)
		bytes_out += data.size()
		_rpc("s_input", [data], false)
	return n


# ------------------------------------------------------------ receiving
func handle(method: String, args: Array) -> void:
	# Incoming messages go through the lag simulator too (snapshots droppable).
	var reliable: bool = method != "snapshot" and method != "pong"
	lag.push(func(): _dispatch(method, args), reliable)


func _dispatch(method: String, args: Array) -> void:
	match method:
		"welcome":
			var info: Dictionary = args[0]
			player_id = str(info.get("player_id", ""))
			token = str(info.get("token", ""))
			player_name = str(info.get("name", player_name))
			server_info = info
			_save_token()
			_set_status("online")
			welcomed.emit(info)
		"error":
			last_error = str(args[1])
			net_error.emit(str(args[0]), str(args[1]))
			if str(args[0]) == "version":
				disconnect_from_server()
		"room_list":
			room_list_received.emit(args[0])
		"room_state":
			room = args[0]
			room_state_changed.emit(room)
		"left_room":
			room = {}
			match_cfg = {}
			prediction = null
			left_room.emit(str(args[0]))
		"chat":
			chat_received.emit(args[0])
		"queue_status":
			queue_status = args[0]
			queue_status_changed.emit(queue_status)
		"match_start":
			_begin_match(args[0])
		"match_event":
			var e: Dictionary = args[0]
			if e.get("type", "") == "lobby":
				prediction = null
				match_cfg = {}
			match_event.emit(e)
		"snapshot":
			var data: PackedByteArray = args[0]
			bytes_in += data.size()
			if prediction == null:
				return
			var s: Dictionary = NetProtocol.decode_snapshot(data)
			if s.is_empty():
				return
			server_tick = int(s["tick"])
			prediction.rtt_ms = rtt_ms
			prediction.jitter_ms = jitter_ms
			prediction.on_snapshot(s)
		"pong":
			_pongs += 1
			var sample: float = float(Time.get_ticks_usec()) / 1000.0 - float(args[0])
			if rtt_ms <= 0.0:
				rtt_ms = sample
			jitter_ms = lerpf(jitter_ms, absf(sample - rtt_ms), 0.1)
			rtt_ms = lerpf(rtt_ms, sample, 0.15)


func _begin_match(cfg: Dictionary) -> void:
	var mode: GameModeDef = GameModeRegistry.get_mode(str(cfg.get("mode", "soccar_2v2")))
	if mode == null:
		net_error.emit("mode", "Modo desconocido")
		return
	match_cfg = cfg
	var w := SimWorld.new(mode.build_physics())
	for t in cfg.get("teams", []):
		w.add_car(int(t))
	var your: int = int(cfg.get("your_car", -1))
	prediction = ClientPrediction.new(w, your, int(cfg.get("tick", 0)))
	match_started.emit(cfg)


func _physics_process(_delta: float) -> void:
	# Network delivery runs at the fixed 120 Hz tick, independent of render FPS.
	lag.flush()


func _process(delta: float) -> void:
	lag.flush()
	if prediction:
		prediction.decay_offsets(delta)
	if status == "online":
		_ping_timer += delta
		if _ping_timer >= 0.5:
			_ping_timer = 0.0
			_pings_sent += 1
			_rpc("s_ping", [float(Time.get_ticks_usec()) / 1000.0], false)
			if _pings_sent >= 10:
				packet_loss = clampf(1.0 - float(_pongs) / float(_pings_sent), 0.0, 1.0)
				if _pings_sent > 40:
					_pings_sent = 0
					_pongs = 0
	_bw_timer += delta
	if _bw_timer >= 1.0:
		bw_in_kbps = float(bytes_in - _bytes_in_mark) * 8.0 / 1000.0 / _bw_timer
		bw_out_kbps = float(bytes_out - _bytes_out_mark) * 8.0 / 1000.0 / _bw_timer
		_bytes_in_mark = bytes_in
		_bytes_out_mark = bytes_out
		_bw_timer = 0.0
	if status == "reconnecting" and _want_connection:
		_reconnect_timer -= delta
		if _reconnect_timer <= 0.0:
			_reconnect_attempts += 1
			if _reconnect_attempts > 15:
				_want_connection = false
				_set_status("offline")
				net_error.emit("reconnect", "No se pudo reconectar con el servidor")
			else:
				_reconnect_timer = 2.0
				_close_transport()
				_open()
	_poll_lan()


# ------------------------------------------------------------ LAN discovery
func discover_lan(seconds: float = 1.5, extra_hosts: Array = []) -> void:
	_found.clear()
	if _discovery:
		_discovery.close()
	_discovery = PacketPeerUDP.new()
	_discovery.set_broadcast_enabled(true)
	if _discovery.bind(0) != OK:
		net_error.emit("lan", "No se pudo iniciar la búsqueda LAN")
		return
	var msg: PackedByteArray = "VA_DISCOVER".to_utf8_buffer()
	for host in ["255.255.255.255"] + extra_hosts:
		_discovery.set_dest_address(host, NetProtocol.DISCOVERY_PORT)
		_discovery.put_packet(msg)
	_discovery_until = Time.get_ticks_msec() + int(seconds * 1000.0)


func _poll_lan() -> void:
	if _discovery == null:
		return
	while _discovery.get_available_packet_count() > 0:
		var pkt: PackedByteArray = _discovery.get_packet()
		var ip: String = _discovery.get_packet_ip()
		var parsed: Variant = JSON.parse_string(pkt.get_string_from_utf8())
		if parsed is Dictionary and parsed.get("game", "") == NetProtocol.GAME_ID:
			parsed["address"] = ip
			_found["%s:%s" % [ip, parsed.get("port", 0)]] = parsed
	if Time.get_ticks_msec() >= _discovery_until:
		_discovery.close()
		_discovery = null
		lan_servers_found.emit(_found.values())


func debug_lines() -> PackedStringArray:
	var p: ClientPrediction = prediction
	var lines := PackedStringArray([
		"RED / NETWORK (F4)",
		"estado %s  servidor %s:%d  jugador %s" % [status, address, port, player_id],
		"ping %.0f ms  jitter %.1f ms  pérdida %.1f %%" % [rtt_ms, jitter_ms, packet_loss * 100.0],
		"subida %.1f kbps  bajada %.1f kbps" % [bw_out_kbps, bw_in_kbps],
		"tick servidor %d  sim 120 Hz  snapshots ~60 Hz" % server_tick,
		"sala %s  partida %s" % [room.get("code", "-"), match_cfg.get("match_id", "-")],
	])
	if p:
		lines.append("tick cliente %d  adelanto %d ticks  re-sim total %d" % [p.tick, p.tick - p.last_snapshot_tick, p.resim_ticks_total])
		lines.append("reconciliaciones %d  error predicción %.3f m (media %.3f)" % [p.reconcile_count, p.last_error, p.avg_error])
		lines.append("snapshots %d  descartados (viejos) %d  perdidos ~%d" % [p.snapshots_received, p.snapshots_dropped_stale, p.snapshots_missing])
	if lag.active():
		lines.append("SIMULADOR: +%.0f ms  ±%.0f ms  pérdida %.0f %%  (descartados %d)" % [lag.latency_ms, lag.jitter_ms, lag.loss_percent, lag.dropped])
	return lines
