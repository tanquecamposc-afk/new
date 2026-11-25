class_name ServerHost
extends Node
## Authoritative game server. Runs headless as a dedicated server, or inside
## a client process as a LAN/listen host. Owns its own SceneMultiplayer
## rooted at this node, so it can coexist with a local client.

signal started(port: int)
signal log_line(text: String)

const EXPECTED := {
	"hello": [TYPE_INT, TYPE_STRING, TYPE_STRING],
	"list_rooms": [],
	"create_room": [TYPE_DICTIONARY],
	"join_room": [TYPE_STRING, TYPE_STRING, TYPE_BOOL],
	"leave_room": [],
	"set_team": [TYPE_INT],
	"set_ready": [TYPE_BOOL],
	"update_room": [TYPE_DICTIONARY],
	"start_match": [],
	"chat": [TYPE_STRING, TYPE_BOOL],
	"queue": [TYPE_STRING, TYPE_BOOL],
	"debug": [TYPE_STRING, TYPE_ARRAY],
	"input": [TYPE_PACKED_BYTE_ARRAY],
	"ping": [TYPE_FLOAT],
}

var port: int = NetProtocol.DEFAULT_PORT
var snapshot_every: int = 2           ## 120 Hz / 2 = 60 Hz snapshots
var server_name: String = "Servidor Velocity Arena"
var allow_debug: bool = false
var region: String = "local"
var heartbeat_path: String = ""
var manager: RoomManager
var endpoint: NetEndpoint
var mp: SceneMultiplayer
var peer: ENetMultiplayerPeer
var tick_count: int = 0
var bytes_sent: int = 0
var _discovery: PacketPeerUDP
var _start_msec: int = 0
var _heartbeat_timer: float = 0.0
var _stats_timer: float = 0.0


func start(p_port: int) -> int:
	port = p_port
	peer = ENetMultiplayerPeer.new()
	var err: int = peer.create_server(port, NetProtocol.MAX_CLIENTS, 3)
	if err != OK:
		_log("ERROR: no se pudo abrir el puerto UDP %d (código %d)" % [port, err])
		return err
	mp = SceneMultiplayer.new()
	mp.allow_object_decoding = false
	mp.server_relay = false
	mp.max_sync_packet_size = 1350
	get_tree().set_multiplayer(mp, get_path())
	mp.multiplayer_peer = peer
	mp.peer_connected.connect(func(id: int): _log("peer connected %d" % id))
	mp.peer_disconnected.connect(func(id: int): manager.peer_disconnected(id))
	endpoint = NetEndpoint.new()
	endpoint.name = "Endpoint"
	endpoint.is_server = true
	endpoint.server_handler = self
	add_child(endpoint)
	manager = RoomManager.new(_send, func(): return float(Time.get_ticks_msec()) / 1000.0, _log)
	manager.region = region
	manager.allow_debug = allow_debug
	_start_msec = Time.get_ticks_msec()
	_start_discovery()
	_log("Servidor escuchando en UDP %d (protocolo v%d, región %s, debug=%s)" % [port, NetProtocol.VERSION, region, allow_debug])
	started.emit(port)
	return OK


func stop() -> void:
	if peer:
		peer.close()
	if _discovery:
		_discovery.close()
	_log("Servidor detenido")


func _log(msg: String) -> void:
	var line: String = "[server %s] %s" % [Time.get_time_string_from_system(), msg]
	print(line)
	log_line.emit(line)


func _send(peer_id: int, method: String, args: Array) -> void:
	if peer_id <= 0 or mp == null or not mp.get_peers().has(peer_id):
		return
	endpoint.callv("rpc_id", [peer_id, method] + args)


## Entry point for every client message (from NetEndpoint).
func handle(sender: int, method: String, args: Array) -> void:
	if not EXPECTED.has(method) or args.size() != EXPECTED[method].size():
		manager.stats["rejected"] += 1
		return
	for i in args.size():
		if typeof(args[i]) != EXPECTED[method][i]:
			manager.stats["rejected"] += 1
			return
	if method == "ping":
		endpoint.rpc_id(sender, "c_pong", args[0], tick_count)
		return
	if method == "hello":
		manager.hello(sender, args[0], str(args[1]).left(32), str(args[2]).left(64))
		return
	var s: PlayerSession = manager.session_for_peer(sender)
	if s == null:
		manager.stats["rejected"] += 1
		return  # must say hello first
	if method == "input":
		manager.input(s, args[0])
		return
	if not s.allow_reliable(float(Time.get_ticks_msec()) / 1000.0):
		manager.stats["rejected"] += 1
		return
	match method:
		"list_rooms": manager.list_rooms(sender)
		"create_room": manager.create_room(s, args[0])
		"join_room": manager.join_room(s, str(args[0]).left(16), str(args[1]).left(64), args[2])
		"leave_room": manager.leave_room(s)
		"set_team": manager.set_team(s, args[0])
		"set_ready": manager.set_ready(s, args[0])
		"update_room": manager.update_room(s, args[0])
		"start_match": manager.start_match(s)
		"chat": manager.chat(s, str(args[0]), args[1])
		"queue": manager.queue(s, str(args[0]).left(24), args[1])
		"debug": manager.debug(s, str(args[0]).left(24), args[1])


func _physics_process(delta: float) -> void:
	if manager == null:
		return
	var dt: float = 1.0 / 120.0
	tick_count += 1
	manager.tick(dt)
	if tick_count % snapshot_every == 0:
		_send_snapshots()
	_poll_discovery()
	_heartbeat_timer += delta
	if _heartbeat_timer >= 5.0:
		_heartbeat_timer = 0.0
		if heartbeat_path != "":
			var f := FileAccess.open(heartbeat_path, FileAccess.WRITE)
			if f:
				f.store_string(str(Time.get_unix_time_from_system()))
	_stats_timer += delta
	if _stats_timer >= 30.0:
		_stats_timer = 0.0
		_log("stats: peers=%d rooms=%d matches=%d rejected=%d sent=%.1f KB" % [mp.get_peers().size(), manager.rooms.size(), manager.stats["matches_started"], manager.stats["rejected"], bytes_sent / 1024.0])


func _send_snapshots() -> void:
	for room in manager.rooms.values():
		if room.world == null or room.rules == null:
			continue
		for s in room.players.values():
			if not s.connected or s.peer_id <= 0:
				continue
			var data: PackedByteArray = NetProtocol.encode_snapshot(room.world, room.rules, s.inputs.newest_received)
			bytes_sent += data.size()
			endpoint.rpc_id(s.peer_id, "c_snapshot", data)


# ------------------------------------------------------------ LAN discovery
func _start_discovery() -> void:
	_discovery = PacketPeerUDP.new()
	var err: int = _discovery.bind(NetProtocol.DISCOVERY_PORT)
	if err != OK:
		_log("Aviso: descubrimiento LAN no disponible (puerto %d ocupado)" % NetProtocol.DISCOVERY_PORT)
		_discovery = null


func _poll_discovery() -> void:
	if _discovery == null:
		return
	while _discovery.get_available_packet_count() > 0:
		var pkt: PackedByteArray = _discovery.get_packet()
		var ip: String = _discovery.get_packet_ip()
		var rport: int = _discovery.get_packet_port()
		if pkt.size() > 64 or pkt.get_string_from_utf8() != "VA_DISCOVER":
			continue
		var info := {"game": NetProtocol.GAME_ID, "version": NetProtocol.VERSION, "name": server_name,
			"port": port, "rooms": manager.rooms.size(), "players": manager.by_peer.size()}
		_discovery.set_dest_address(ip, rport)
		_discovery.put_packet(JSON.stringify(info).to_utf8_buffer())


func uptime() -> float:
	return float(Time.get_ticks_msec() - _start_msec) / 1000.0
