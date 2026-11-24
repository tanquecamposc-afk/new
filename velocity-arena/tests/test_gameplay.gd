extends RefCounted
## Match-rule, game-mode and bot tests.

const DT := 1.0 / 120.0
var runner: Object


func _match(mode_id: String, minutes: float = -1.0) -> MatchRules:
	var mode: GameModeDef = GameModeRegistry.get_mode(mode_id)
	if minutes >= 0.0:
		mode = GameModeRegistry.get_mode(mode_id)
		mode.match_minutes = minutes
	var w := SimWorld.new(mode.build_physics())
	for t in 2:
		for i in mode.team_size:
			w.add_car(t)
	var m := MatchRules.new(w, mode, 42)
	m.start()
	return m


func _steps(m: MatchRules, seconds: float) -> Array[Dictionary]:
	var all_events: Array[Dictionary] = []
	for i in int(round(seconds / DT)):
		m.step(DT)
		all_events.append_array(m.events)
	return all_events


func _has(events: Array[Dictionary], type: String) -> bool:
	for e in events:
		if e["type"] == type:
			return true
	return false


func test_mode_registry() -> void:
	var all: Array[GameModeDef] = GameModeRegistry.all()
	runner.info("%d modes registered, %d playable" % [all.size(), GameModeRegistry.playable().size()])
	runner.check(all.size() >= 30, "every planned mode is registered")
	var ids := {}
	for m in all:
		runner.check(not ids.has(m.id), "unique id " + m.id)
		ids[m.id] = true
		if m.is_playable():
			var cfg: PhysicsConfig = m.build_physics()
			runner.check(cfg != null, "builds physics for " + m.id)
	runner.check(GameModeRegistry.get_mode("pelota_playa").build_physics().ball_radius > 1.5, "mutator overrides apply")


func test_kickoff_countdown_freezes_cars() -> void:
	var m := _match("soccar_1v1")
	var car: CarBody = m.world.cars[0]
	var start: Vector3 = car.pos
	car.controls.throttle = 1.0
	car.controls.boost = true
	var ev := _steps(m, 2.9)
	runner.check(m.phase == MatchRules.Phase.COUNTDOWN, "still counting down at 2.9 s")
	runner.check(Vector2(car.pos.x, car.pos.z).distance_to(Vector2(start.x, start.z)) < 0.05, "cars frozen during countdown")
	ev = _steps(m, 0.2)
	runner.check(m.phase == MatchRules.Phase.PLAYING and _has(ev, "go"), "GO after 3 s")
	_steps(m, 0.5)
	runner.check(car.pos.distance_to(start) > 1.0, "cars move after GO")


func test_goal_scoring_and_reset() -> void:
	var m := _match("soccar_1v1")
	_steps(m, 3.1)
	var blue: CarBody = m.world.cars[0]
	m.world.last_touch_car = blue.id
	m.world.ball.pos = Vector3(0, 1.5, m.world.cfg.arena_half_length + 2.0)
	m.world.ball.vel = Vector3(0, 0, 5)
	var ev := _steps(m, 0.05)
	runner.check(_has(ev, "goal"), "goal event")
	runner.check(m.scores[0] == 1 and m.scores[1] == 0, "blue scored into +z goal")
	runner.check(m.stats[blue.id].goals == 1, "scorer credited")
	ev = _steps(m, 3.1)
	runner.check(_has(ev, "countdown") and m.phase == MatchRules.Phase.COUNTDOWN, "new kickoff after goal pause")
	runner.check(m.world.ball.pos.distance_to(Vector3(0, m.world.ball.radius, 0)) < 0.05, "ball reset to centre")


func test_own_goal_not_credited() -> void:
	var m := _match("soccar_1v1")
	_steps(m, 3.1)
	var orange: CarBody = m.world.cars[1]
	m.world.last_touch_car = orange.id
	m.world.ball.pos = Vector3(0, 1.5, m.world.cfg.arena_half_length + 2.0)
	_steps(m, 0.05)
	runner.check(m.scores[0] == 1, "own goal still counts for the other team")
	runner.check(m.stats[orange.id].goals == 0, "own-goal scorer gets no goal stat")


func test_clock_and_end() -> void:
	var m := _match("soccar_1v1", 0.05)  # 3-second match
	_steps(m, 3.1)
	m.world.last_touch_car = 0  # clock starts on first touch
	m.scores[0] = 1
	var ev := _steps(m, 3.5)
	runner.check(_has(ev, "match_end") and m.phase == MatchRules.Phase.ENDED, "match ends when time runs out")
	runner.check(m.winner == 0, "leading team wins")
	GameModeRegistry.get_mode("soccar_1v1").match_minutes = 5.0


func test_zero_second_rule_and_overtime() -> void:
	var m := _match("soccar_1v1", 0.05)
	_steps(m, 3.1)
	m.world.last_touch_car = 0
	m.world.ball.pos = Vector3(0, 15, 0)
	m.world.ball.vel = Vector3(0, 3, 0)
	_steps(m, 3.2)
	runner.check(m.phase == MatchRules.Phase.PLAYING and m.time_remaining == 0.0 and not m.overtime, "play continues at 0:00 while ball is airborne")
	var ev := _steps(m, 4.0)
	runner.check(m.overtime and _has(ev, "overtime"), "tied game goes to overtime after ball lands")
	_steps(m, 3.1)
	m.world.last_touch_car = 1
	m.world.ball.pos = Vector3(0, 1.5, -m.world.cfg.arena_half_length - 2.0)
	ev = _steps(m, 3.2)
	runner.check(m.phase == MatchRules.Phase.ENDED and m.winner == 1, "first overtime goal wins")
	GameModeRegistry.get_mode("soccar_1v1").match_minutes = 5.0


func test_assist_credit() -> void:
	var m := _match("soccar_2v2")
	_steps(m, 3.1)
	m.world.prev_touch_car = 0
	m.world.last_touch_car = 1
	m.world.last_touch_time = m.world.time
	runner.check(m.world.cars[0].team == m.world.cars[1].team, "cars 0 and 1 are teammates")
	m.world.ball.pos = Vector3(0, 1.5, m.world.cfg.arena_half_length + 2.0)
	_steps(m, 0.05)
	runner.check(m.stats[1].goals == 1 and m.stats[0].assists == 1, "assist credited to teammate")


func test_homing_ball_mode() -> void:
	var m := _match("rastreador")
	_steps(m, 3.1)
	var car: CarBody = m.world.cars[0]  # blue attacks +z
	car.set_transform(Vector3(0, 0.17, -6), Basis.looking_at(Vector3.BACK, Vector3.UP))
	car.controls.throttle = 1.0
	car.controls.boost = true
	car.boost = 100.0
	var hit: bool = false
	for i in 240:
		m.step(DT)
		for e in m.events:
			if e["type"] == "ball_hit":
				hit = true
		if hit:
			break
	car.controls.throttle = 0.0
	car.controls.boost = false
	_steps(m, 1.5)
	runner.check(hit, "car touched the homing ball")
	runner.check(m.world.ball.vel.z > 5.0 or m.scores[0] > 0, "ball homes toward the +z goal")


func test_bot_match_soak() -> void:
	var mode: GameModeDef = GameModeRegistry.get_mode("soccar_2v2")
	var w := SimWorld.new(mode.build_physics())
	var bots: Array[BotController] = []
	for t in 2:
		for i in 2:
			var c: CarBody = w.add_car(t)
			bots.append(BotController.new(c, w, 4 if t == 0 else 2, c.id))
	var m := MatchRules.new(w, mode, 7)
	m.start()
	var touches: int = 0
	var goals: int = 0
	var bad: bool = false
	var t0: int = Time.get_ticks_msec()
	for i in 120 * 120:  # two simulated minutes
		for b in bots:
			b.update(DT)
		m.step(DT)
		for e in m.events:
			if e["type"] == "ball_hit":
				touches += 1
			elif e["type"] == "goal":
				goals += 1
		if not w.ball.pos.is_finite():
			bad = true
	var ms: int = Time.get_ticks_msec() - t0
	runner.info("bot 2v2, 2 simulated min: %d touches, %d goals, score %d-%d, %d ms wall time" % [touches, goals, m.scores[0], m.scores[1], ms])
	runner.check(not bad, "no NaN during bot match")
	runner.check(touches > 30, "bots engage the ball (smoke test, not a quality bar)")
	runner.check(goals >= 1, "bots score goals")
