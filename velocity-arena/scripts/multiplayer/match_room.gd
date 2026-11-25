class_name MatchRoom
extends RefCounted
## One server-side room: lobby (teams, ready, host settings) and, while
## playing, the authoritative SimWorld + MatchRules. Every client action is
## validated here; clients only ever influence the match through inputs.

enum State { LOBBY, MATCH, POST }

const POST_MATCH_TIME := 10.0
const MAX_NAME := 24

var code: String = ""
var room_name: String = "Sala"
var state: int = State.LOBBY
var host_id: String = ""
var mode_id: String = "soccar_2v2"
var team_size: int = 2
var bots: bool = false
var minutes: float = 5.0
var lighting: String = "night"
var is_public: bool = true
var allow_spectators: bool = true
var bot_difficulty: int = 3
var region: String = "local"
var password_hash: String = ""
var salt: String = ""
var from_matchmaking: bool = false
var playlist: String = ""

var players: Dictionary = {}          # player_id -> PlayerSession
var world: SimWorld
var rules: MatchRules
var bots_ctl: Array[BotController] = []
var bot_for_car: Dictionary = {}      # car_id -> BotController (bots and stand-ins)
var car_names: Array[String] = []
var car_owner: Dictionary = {}        # car_id -> player_id ("" for bots)
var match_id: String = ""
var post_timer: float = 0.0
var created_at: float = 0.0
var _join_counter: int = 0
var _rng := RandomNumberGenerator.new()

const BOT_NAMES := ["Rayo", "Cometa", "Chispa", "Nébula", "Halcón", "Tormenta", "Píxel", "Vórtice"]


func _init(p_code: String, seed_value: int) -> void:
	code = p_code
	_rng.seed = seed_value


func has_password() -> bool:
	return password_hash != ""


func set_password(pw: String) -> void:
	if pw == "":
		password_hash = ""
		return
	salt = str(_rng.randi()) + str(Time.get_ticks_usec())
	password_hash = NetProtocol.hash_password(pw.left(64), salt)


func check_password(pw: String) -> bool:
	return password_hash == "" or NetProtocol.hash_password(pw.left(64), salt) == password_hash


## Applies a (client supplied) config dictionary after validating every field.
func apply_config(cfg: Dictionary) -> void:
	if cfg.has("name") and typeof(cfg["name"]) == TYPE_STRING:
		room_name = NetProtocol.sanitize_name(str(cfg["name"]).left(MAX_NAME), "Sala")
	if cfg.has("mode") and typeof(cfg["mode"]) == TYPE_STRING:
		var m: GameModeDef = GameModeRegistry.get_mode(cfg["mode"])
		if m != null and m.is_playable() and m.category != "training":
			mode_id = m.id
			team_size = m.team_size
	if cfg.has("team_size") and typeof(cfg["team_size"]) == TYPE_INT:
		team_size = clampi(int(cfg["team_size"]), 1, 4)
	if cfg.has("bots") and typeof(cfg["bots"]) == TYPE_BOOL:
		bots = cfg["bots"]
	if cfg.has("bot_difficulty") and typeof(cfg["bot_difficulty"]) == TYPE_INT:
		bot_difficulty = clampi(int(cfg["bot_difficulty"]), 1, 7)
	if cfg.has("minutes") and (typeof(cfg["minutes"]) == TYPE_FLOAT or typeof(cfg["minutes"]) == TYPE_INT):
		var mins: float = float(cfg["minutes"])
		minutes = mins if mins in [0.0, 1.0, 2.0, 3.0, 5.0, 10.0] else 5.0
	if cfg.has("lighting") and cfg["lighting"] in ["night", "day", "sunset"]:
		lighting = cfg["lighting"]
	if cfg.has("public") and typeof(cfg["public"]) == TYPE_BOOL:
		is_public = cfg["public"]
	if cfg.has("spectators") and typeof(cfg["spectators"]) == TYPE_BOOL:
		allow_spectators = cfg["spectators"]
	if cfg.has("password") and typeof(cfg["password"]) == TYPE_STRING:
		set_password(cfg["password"])
	# Keep teams within the new size.
	for team in [0, 1]:
		var members: Array = team_members(team)
		while members.size() > team_size:
			var s: PlayerSession = members.pop_back()
			s.team = -1 if allow_spectators else (1 - team)


func team_members(team: int) -> Array:
	var out: Array = []
	for s in players.values():
		if s.team == team:
			out.append(s)
	out.sort_custom(func(a, b): return a.join_order < b.join_order)
	return out


func human_count() -> int:
	return players.size()


func capacity() -> int:
	return team_size * 2


func add_player(s: PlayerSession, as_spectator: bool) -> bool:
	if players.has(s.player_id):
		return true
	_join_counter += 1
	s.join_order = _join_counter
	s.room_code = code
	s.ready = false
	if as_spectator:
		if not allow_spectators:
			return false
		s.team = -1
	else:
		var a: int = team_members(0).size()
		var b: int = team_members(1).size()
		if a >= team_size and b >= team_size:
			if not allow_spectators:
				return false
			s.team = -1
		else:
			s.team = 0 if a <= b and a < team_size else 1
	players[s.player_id] = s
	if host_id == "" or not players.has(host_id):
		host_id = s.player_id
	return true


func remove_player(player_id: String) -> void:
	var s: PlayerSession = players.get(player_id)
	if s == null:
		return
	players.erase(player_id)
	s.room_code = ""
	s.car_id = -1
	if state == State.MATCH and world != null:
		# Their car stays: a bot takes over in casual rooms, else it idles.
		for cid in car_owner.keys():
			if car_owner[cid] == player_id:
				car_owner[cid] = ""
				if bots or from_matchmaking:
					_attach_standin(int(cid))
	if host_id == player_id:
		host_id = ""
		var best: PlayerSession = null
		for p in players.values():
			if p.connected and (best == null or p.join_order < best.join_order):
				best = p
		if best:
			host_id = best.player_id


func set_team(s: PlayerSession, team: int) -> bool:
	if state != State.LOBBY or team < -1 or team > 1:
		return false
	if team == -1 and not allow_spectators:
		return false
	if team >= 0 and team_members(team).size() >= team_size and s.team != team:
		return false
	s.team = team
	s.ready = false
	return true


func can_start(by: String) -> String:
	if state != State.LOBBY:
		return "not_in_lobby"
	if by != host_id:
		return "not_host"
	var playing: int = team_members(0).size() + team_members(1).size()
	if playing == 0:
		return "no_players"
	return ""


# ------------------------------------------------------------------ match
func start_match() -> void:
	var mode: GameModeDef = GameModeRegistry.get_mode(mode_id)
	world = SimWorld.new(mode.build_physics())
	bots_ctl.clear()
	bot_for_car.clear()
	car_names.clear()
	car_owner.clear()
	BotController.clear_cache()
	var name_idx: int = _rng.randi() % BOT_NAMES.size()
	for team in [0, 1]:
		var members: Array = team_members(team)
		for i in team_size:
			if i < members.size():
				var s: PlayerSession = members[i]
				var c: CarBody = world.add_car(team)
				s.car_id = c.id
				s.inputs.reset()
				car_names.append(s.name)
				car_owner[c.id] = s.player_id
				if not s.connected:
					_attach_standin(c.id)
			elif bots:
				var c2: CarBody = world.add_car(team)
				car_names.append(BOT_NAMES[name_idx % BOT_NAMES.size()] + " (BOT)")
				name_idx += 1
				car_owner[c2.id] = ""
				_attach_standin(c2.id)
	for s in players.values():
		if s.team == -1:
			s.car_id = -1
	rules = MatchRules.new(world, mode, _rng.randi())
	rules.set_duration(minutes)
	rules.start()
	match_id = "%s-%d" % [code, Time.get_ticks_msec()]
	state = State.MATCH


func _attach_standin(car_id: int) -> void:
	var c: CarBody = world.get_car(car_id)
	if c == null or bot_for_car.has(car_id):
		return
	var b := BotController.new(c, world, bot_difficulty, car_id + 31)
	bots_ctl.append(b)
	bot_for_car[car_id] = b


func _detach_standin(car_id: int) -> void:
	if not bot_for_car.has(car_id):
		return
	var b: BotController = bot_for_car[car_id]
	bots_ctl.erase(b)
	bot_for_car.erase(car_id)


## Called when a player reconnects into a running match.
func restore_player(s: PlayerSession) -> void:
	if state == State.MATCH and s.car_id >= 0:
		car_owner[s.car_id] = s.player_id
		_detach_standin(s.car_id)
		s.inputs.reset()


func on_player_disconnected(s: PlayerSession) -> void:
	if state == State.MATCH and s.car_id >= 0 and (bots or from_matchmaking):
		_attach_standin(s.car_id)


## Advances the authoritative match one tick. Returns events worth sending
## reliably to clients.
func tick(dt: float) -> Array:
	var out: Array = []
	if state == State.POST:
		post_timer -= dt
		if post_timer <= 0.0:
			_back_to_lobby()
			out.append({"type": "lobby"})
		return out
	if state != State.MATCH:
		return out
	var next_tick: int = world.tick + 1
	for cid in car_owner.keys():
		var pid: String = car_owner[cid]
		var car: CarBody = world.get_car(int(cid))
		if pid == "" or bot_for_car.has(cid):
			continue
		var s: PlayerSession = players.get(pid)
		if s == null or not s.connected:
			car.controls.reset()
			continue
		car.controls.copy_from(s.inputs.take(next_tick))
	for b in bots_ctl:
		b.update(dt)
	rules.step(dt)
	for e in rules.events:
		match e["type"]:
			"goal", "demolition", "overtime", "countdown", "go", "save", "shot":
				out.append(e.duplicate())
			"match_end":
				var ev: Dictionary = e.duplicate()
				ev["stats"] = _stats_array()
				ev["mvp"] = rules.mvp()
				out.append(ev)
				state = State.POST
				post_timer = POST_MATCH_TIME
	return out


func _stats_array() -> Array:
	var arr: Array = []
	for i in world.cars.size():
		var d: Dictionary = rules.stats[i].to_dict()
		d["name"] = car_names[i]
		d["team"] = world.cars[i].team
		arr.append(d)
	return arr


func _back_to_lobby() -> void:
	state = State.LOBBY
	world = null
	rules = null
	bots_ctl.clear()
	bot_for_car.clear()
	for s in players.values():
		s.ready = false
		s.car_id = -1


func match_config_for(s: PlayerSession) -> Dictionary:
	var teams: Array = []
	for c in world.cars:
		teams.append(c.team)
	return {"mode": mode_id, "lighting": lighting, "names": car_names, "teams": teams,
		"your_car": s.car_id, "match_id": match_id, "minutes": minutes, "room": code,
		"tick": world.tick}


func public_state() -> Dictionary:
	var plist: Array = []
	for s in players.values():
		plist.append(s.public_info(host_id))
	plist.sort_custom(func(a, b): return a["name"] < b["name"])
	return {"code": code, "name": room_name, "state": ["lobby", "match", "post"][state],
		"host": host_id, "mode": mode_id, "team_size": team_size, "bots": bots,
		"bot_difficulty": bot_difficulty, "minutes": minutes, "lighting": lighting,
		"public": is_public, "spectators": allow_spectators, "password": has_password(),
		"region": region, "players": plist, "matchmaking": from_matchmaking}


func browser_entry() -> Dictionary:
	var playing: int = team_members(0).size() + team_members(1).size()
	return {"code": code, "name": room_name, "mode": mode_id, "team_size": team_size,
		"players": playing, "capacity": capacity(), "spectators": team_members(-1).size(),
		"password": has_password(), "state": ["lobby", "match", "post"][state], "region": region}
