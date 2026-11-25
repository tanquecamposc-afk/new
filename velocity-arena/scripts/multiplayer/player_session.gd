class_name PlayerSession
extends RefCounted
## Server-side record of one connected (or temporarily disconnected) player.

var player_id: String = ""        ## stable id (survives reconnection)
var token: String = ""            ## secret reconnection token, never broadcast
var peer_id: int = 0              ## current ENet peer (0 while disconnected)
var name: String = "Jugador"
var room_code: String = ""
var team: int = 0                 ## 0 blue, 1 orange, -1 spectator
var ready: bool = false
var car_id: int = -1
var connected: bool = true
var disconnected_at: float = 0.0
var join_order: int = 0
var inputs := InputBuffer.new()
var queue_playlist: String = ""
var queue_since: float = 0.0
# Rate limiting (per-second windows).
var _window_start: float = 0.0
var _reliable_count: int = 0
var _input_count: int = 0
var _chat_times: Array[float] = []
var rejected_messages: int = 0


func allow_reliable(now: float, limit: int = 40) -> bool:
	_roll(now)
	_reliable_count += 1
	if _reliable_count > limit:
		rejected_messages += 1
		return false
	return true


func allow_input(now: float, limit: int = 260) -> bool:
	_roll(now)
	_input_count += 1
	if _input_count > limit:
		rejected_messages += 1
		return false
	return true


func allow_chat(now: float) -> bool:
	while not _chat_times.is_empty() and now - _chat_times[0] > 5.0:
		_chat_times.pop_front()
	if _chat_times.size() >= 4:
		rejected_messages += 1
		return false
	_chat_times.append(now)
	return true


func _roll(now: float) -> void:
	if now - _window_start >= 1.0:
		_window_start = now
		_reliable_count = 0
		_input_count = 0


func public_info(host_id: String) -> Dictionary:
	return {"id": player_id, "name": name, "team": team, "ready": ready,
		"connected": connected, "host": player_id == host_id}
