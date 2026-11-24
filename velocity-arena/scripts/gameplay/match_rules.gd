class_name MatchRules
extends RefCounted
## Authoritative match flow on top of a SimWorld: kickoff countdown, clock,
## goals, zero-second rule, sudden-death overtime, statistics and scoring.
## Pure logic so it runs the same on a client, a server, or in tests.

enum Phase { COUNTDOWN, PLAYING, GOAL, ENDED }

const COUNTDOWN_TIME := 3.0
const GOAL_PAUSE := 3.0
const ASSIST_WINDOW := 5.0

const POINTS := {"goal": 100, "assist": 50, "save": 50, "shot": 20, "demo": 25, "touch": 2, "epic_save": 75}

class PlayerStats:
	var goals: int = 0
	var assists: int = 0
	var saves: int = 0
	var shots: int = 0
	var demos: int = 0
	var touches: int = 0
	var score: int = 0

	func to_dict() -> Dictionary:
		return {"goals": goals, "assists": assists, "saves": saves, "shots": shots,
			"demos": demos, "touches": touches, "score": score}


var world: SimWorld
var mode: GameModeDef
var phase: int = Phase.COUNTDOWN
var phase_timer: float = COUNTDOWN_TIME
var time_remaining: float = 300.0
var unlimited_time: bool = false
var overtime: bool = false
var overtime_elapsed: float = 0.0
var scores: PackedInt32Array = PackedInt32Array([0, 0])
var stats: Array[PlayerStats] = []
var kickoff_index: int = 0
var winner: int = -1
var last_goal_team: int = -1
var last_scorer: int = -1
var events: Array[Dictionary] = []
## Free play: kickoffs start immediately with no countdown.
var skip_countdown: bool = false
var _time_limit: float = 300.0
var _rng := RandomNumberGenerator.new()
## Ball heading into a goal before a touch (for save detection).
var _threat_team: int = -1


func _init(p_world: SimWorld, p_mode: GameModeDef, seed_value: int = 0) -> void:
	world = p_world
	mode = p_mode
	_rng.seed = seed_value
	set_duration(mode.match_minutes)
	world.homing_enabled = bool(mode.rules.get("homing", false))
	for c in world.cars:
		stats.append(PlayerStats.new())


## Minutes <= 0 means no clock (free play / unlimited).
func set_duration(minutes: float) -> void:
	unlimited_time = minutes <= 0.0
	_time_limit = maxf(minutes, 0.0) * 60.0
	time_remaining = _time_limit


func start() -> void:
	_begin_kickoff()


func _begin_kickoff() -> void:
	kickoff_index = _rng.randi_range(0, 4)
	world.setup_kickoff(kickoff_index)
	world.cars_frozen = true
	world.ball_frozen = true
	phase = Phase.COUNTDOWN
	phase_timer = 0.0 if skip_countdown else COUNTDOWN_TIME
	_threat_team = -1
	events.append({"type": "countdown"})


func step(dt: float) -> void:
	events.clear()
	world.step(dt)
	_consume_world_events()
	match phase:
		Phase.COUNTDOWN:
			phase_timer -= dt
			if phase_timer <= 0.0:
				phase = Phase.PLAYING
				world.cars_frozen = false
				world.ball_frozen = false
				events.append({"type": "go"})
		Phase.PLAYING:
			_update_clock(dt)
			_check_goal()
		Phase.GOAL:
			phase_timer -= dt
			if phase_timer <= 0.0:
				if _match_should_end():
					_end_match()
				else:
					_begin_kickoff()
		Phase.ENDED:
			pass


func _update_clock(dt: float) -> void:
	if unlimited_time:
		return
	if overtime:
		overtime_elapsed += dt
		return
	if world.last_touch_car < 0 and time_remaining >= _time_limit - 0.01:
		return  # clock starts on first touch after kickoff
	time_remaining = maxf(0.0, time_remaining - dt)
	if time_remaining <= 0.0:
		# Zero-second rule: play continues until the ball touches the ground.
		if mode.zero_second_rule and not world.ball.touching_ground:
			return
		if scores[0] == scores[1] and mode.overtime:
			overtime = true
			events.append({"type": "overtime"})
			_begin_kickoff()
		else:
			_end_match()


func _check_goal() -> void:
	var side: int = world.arena.goal_side(world.ball.pos, world.ball.radius)
	if side == 0:
		return
	# Ball in +z goal = scored by team 0 (blue attacks +z).
	var team: int = 0 if side == 1 else 1
	scores[team] += 1
	last_goal_team = team
	var scorer: int = world.last_touch_car
	last_scorer = -1
	var assister: int = -1
	if scorer >= 0 and world.cars[scorer].team == team:
		last_scorer = scorer
		stats[scorer].goals += 1
		stats[scorer].score += POINTS["goal"]
		var prev: int = world.prev_touch_car
		if prev >= 0 and prev != scorer and world.cars[prev].team == team and world.time - world.last_touch_time < ASSIST_WINDOW:
			assister = prev
			stats[prev].assists += 1
			stats[prev].score += POINTS["assist"]
	events.append({"type": "goal", "team": team, "scorer": last_scorer, "assister": assister,
		"pos": world.ball.pos, "speed": world.ball.vel.length()})
	world.ball_frozen = true
	world.ball.vel = Vector3.ZERO
	phase = Phase.GOAL
	phase_timer = GOAL_PAUSE


func _match_should_end() -> bool:
	if unlimited_time:
		return false
	if overtime:
		return true
	return time_remaining <= 0.0 and scores[0] != scores[1]


func _end_match() -> void:
	phase = Phase.ENDED
	world.cars_frozen = true
	world.ball_frozen = true
	winner = -1 if scores[0] == scores[1] else (0 if scores[0] > scores[1] else 1)
	events.append({"type": "match_end", "winner": winner})


func _consume_world_events() -> void:
	for e in world.events:
		events.append(e)
		match e["type"]:
			"ball_hit":
				_on_touch(int(e["car"]))
			"demolition":
				var a: int = int(e["attacker"])
				stats[a].demos += 1
				stats[a].score += POINTS["demo"]


func _on_touch(car_id: int) -> void:
	var car: CarBody = world.cars[car_id]
	var st: PlayerStats = stats[car_id]
	st.touches += 1
	st.score += POINTS["touch"]
	if phase != Phase.PLAYING:
		return
	# Predict where the ball goes now.
	var path: PackedVector3Array = BallBody.predict(world.cfg, world.arena, world.ball.pos,
		world.ball.vel, world.ball.ang_vel, 3.0, 1.0 / 30.0)
	var goal_side: int = 0
	for p in path:
		goal_side = world.arena.goal_side(p, world.ball.radius)
		if goal_side != 0:
			break
	var own_side: int = -1 if car.team == 0 else 1
	if _threat_team == car.team and goal_side != own_side:
		st.saves += 1
		st.score += POINTS["save"]
		events.append({"type": "save", "car": car_id})
	if goal_side == -own_side:
		st.shots += 1
		st.score += POINTS["shot"]
		events.append({"type": "shot", "car": car_id})
	# Which team is threatened after this touch?
	if goal_side == -1:
		_threat_team = 0
	elif goal_side == 1:
		_threat_team = 1
	else:
		_threat_team = -1


func team_score_total(team: int) -> int:
	var total: int = 0
	for i in world.cars.size():
		if world.cars[i].team == team:
			total += stats[i].score
	return total


func mvp() -> int:
	var best: int = -1
	var best_score: int = -1
	for i in world.cars.size():
		if winner >= 0 and world.cars[i].team != winner:
			continue
		if stats[i].score > best_score:
			best_score = stats[i].score
			best = i
	return best


func clock_text() -> String:
	if unlimited_time:
		return "∞"
	var t: float = overtime_elapsed if overtime else time_remaining
	var secs: int = int(ceil(t)) if not overtime else int(floor(t))
	return "%s%d:%02d" % ["+" if overtime else "", secs / 60, secs % 60]
