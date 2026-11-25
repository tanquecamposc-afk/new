class_name NetEndpoint
extends Node
## The single RPC surface of the game. The same script lives at the relative
## path "Endpoint" under both the server root and the client root, so RPC
## paths and checksums match. `s_*` methods run on the server (sent by any
## peer, validated here); `c_*` methods run on clients (sent by the server).

var is_server: bool = false
var server_handler: Object       ## ServerHost
var client_handler: Object       ## NetworkManager


func _sender() -> int:
	return multiplayer.get_remote_sender_id()


func _srv(method: String, args: Array) -> void:
	# Server-side dispatch with type safety: never trust the payload.
	if not is_server or server_handler == null:
		return
	server_handler.handle(_sender(), method, args)


func _cli(method: String, args: Array) -> void:
	if is_server or client_handler == null:
		return
	if _sender() != 1:
		return  # only the server may call client methods
	client_handler.handle(method, args)


# ------------------------------------------------------ client -> server
@rpc("any_peer", "call_remote", "reliable", 0)
func s_hello(version: int, player_name: String, token: String) -> void:
	_srv("hello", [version, player_name, token])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_list_rooms() -> void:
	_srv("list_rooms", [])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_create_room(cfg: Dictionary) -> void:
	_srv("create_room", [cfg])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_join_room(code: String, password: String, as_spectator: bool) -> void:
	_srv("join_room", [code, password, as_spectator])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_leave_room() -> void:
	_srv("leave_room", [])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_set_team(team: int) -> void:
	_srv("set_team", [team])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_set_ready(ready: bool) -> void:
	_srv("set_ready", [ready])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_update_room(cfg: Dictionary) -> void:
	_srv("update_room", [cfg])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_start_match() -> void:
	_srv("start_match", [])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_chat(text: String, team_only: bool) -> void:
	_srv("chat", [text, team_only])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_queue(playlist: String, join: bool) -> void:
	_srv("queue", [playlist, join])

@rpc("any_peer", "call_remote", "reliable", 0)
func s_debug(cmd: String, args: Array) -> void:
	_srv("debug", [cmd, args])

@rpc("any_peer", "call_remote", "unreliable_ordered", 1)
func s_input(data: PackedByteArray) -> void:
	_srv("input", [data])

@rpc("any_peer", "call_remote", "unreliable", 2)
func s_ping(t: float) -> void:
	_srv("ping", [t])


# ------------------------------------------------------ server -> client
@rpc("authority", "call_remote", "reliable", 0)
func c_welcome(info: Dictionary) -> void:
	_cli("welcome", [info])

@rpc("authority", "call_remote", "reliable", 0)
func c_error(code: String, msg: String) -> void:
	_cli("error", [code, msg])

@rpc("authority", "call_remote", "reliable", 0)
func c_room_list(rooms: Array) -> void:
	_cli("room_list", [rooms])

@rpc("authority", "call_remote", "reliable", 0)
func c_room_state(state: Dictionary) -> void:
	_cli("room_state", [state])

@rpc("authority", "call_remote", "reliable", 0)
func c_left_room(reason: String) -> void:
	_cli("left_room", [reason])

@rpc("authority", "call_remote", "reliable", 0)
func c_chat(msg: Dictionary) -> void:
	_cli("chat", [msg])

@rpc("authority", "call_remote", "reliable", 0)
func c_queue_status(d: Dictionary) -> void:
	_cli("queue_status", [d])

@rpc("authority", "call_remote", "reliable", 0)
func c_match_start(cfg: Dictionary) -> void:
	_cli("match_start", [cfg])

@rpc("authority", "call_remote", "reliable", 0)
func c_match_event(e: Dictionary) -> void:
	_cli("match_event", [e])

@rpc("authority", "call_remote", "unreliable_ordered", 1)
func c_snapshot(data: PackedByteArray) -> void:
	_cli("snapshot", [data])

@rpc("authority", "call_remote", "unreliable", 2)
func c_pong(t: float, server_tick: int) -> void:
	_cli("pong", [t, server_tick])
