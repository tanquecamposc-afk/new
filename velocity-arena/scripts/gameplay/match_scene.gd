extends Node3D
## Match scene: owns the authoritative simulation (offline host), drives
## bots and player input at 120 Hz, and presents the result (visuals, audio,
## HUD, pause and post-match screens). Free play uses the same scene.

const BOT_NAMES := ["Rayo", "Cometa", "Chispa", "Nébula", "Halcón", "Tormenta", "Píxel", "Vórtice", "Zafiro", "Brasa"]

var mode: GameModeDef
var cfg: PhysicsConfig
var world: SimWorld
var rules: MatchRules
var bots: Array[BotController] = []
var player_car: CarBody
var player_input := PlayerInput.new()
var names: Array[String] = []
var team_colors: Array[Color] = []
var free_play: bool = false

var arena_visual: ArenaVisual
var car_visuals: Array[CarVisual] = []
var ball_visual: BallVisual
var cam: CarCamera
var hud: Hud
var fx: Fx
var audio: SynthAudio

var paused: bool = false
var _pause_layer: CanvasLayer
var _post_layer: CanvasLayer
var _phys_ms: float = 0.0
var _last_countdown: int = -1
var _recorded: bool = false
var _base_gravity: float = 6.5
var _demo_frames: int = 0


func _ready() -> void:
	PlayerInput.register_actions()
	BotController.clear_cache()
	mode = GameModeRegistry.get_mode(GameState.mode_id)
	if mode == null or not mode.is_playable():
		mode = GameModeRegistry.get_mode("soccar_2v2")
	free_play = mode.id == "free_play"
	cfg = mode.build_physics()
	_base_gravity = cfg.gravity
	world = SimWorld.new(cfg)
	team_colors = [Settings.team_color(0), Settings.team_color(1)]
	_spawn_cars()
	rules = MatchRules.new(world, mode, randi())
	if not free_play:
		rules.set_duration(GameState.match_minutes)
	rules.skip_countdown = free_play
	_build_presentation()
	rules.start()
	_handle_events()


func _spawn_cars() -> void:
	player_car = world.add_car(0)
	names.append(I18n.t("you"))
	if free_play:
		return
	var name_idx: int = randi() % BOT_NAMES.size()
	for team in [0, 1]:
		var count: int = mode.team_size - (1 if team == 0 else 0)
		for i in count:
			var c: CarBody = world.add_car(team)
			names.append(BOT_NAMES[name_idx % BOT_NAMES.size()])
			name_idx += 1
			bots.append(BotController.new(c, world, GameState.bot_difficulty, c.id + randi() % 1000))


func _build_presentation() -> void:
	var particles: bool = bool(Settings.get_value("video", "particles"))
	arena_visual = ArenaVisual.new()
	add_child(arena_visual)
	arena_visual.build(world.arena, world.pads, GameState.lighting, team_colors)
	for car in world.cars:
		var cv := CarVisual.new()
		add_child(cv)
		cv.setup(car, team_colors[car.team], names[car.id], car != player_car, particles)
		car_visuals.append(cv)
	ball_visual = BallVisual.new()
	add_child(ball_visual)
	ball_visual.setup(world.ball, particles)
	fx = Fx.new()
	fx.enabled = particles
	fx.reduced_flashing = bool(Settings.get_value("game", "reduced_flashing"))
	add_child(fx)
	cam = CarCamera.new()
	add_child(cam)
	cam.load_settings()
	cam.target = player_car
	cam.ball = world.ball
	cam.arena = world.arena
	cam.current = true
	cam.global_position = player_car.pos + Vector3(0, 3, 0)
	cam.near = 0.05
	cam.far = 600.0
	audio = SynthAudio.new()
	add_child(audio)
	hud = Hud.new()
	add_child(hud)
	hud.build(team_colors)
	hud.debug_label.visible = bool(Settings.get_value("game", "show_debug"))
	hud.help_label.text = I18n.t("freeplay_help") if free_play else I18n.t("controls_help")
	if free_play:
		hud.clock_label.text = "∞"


# ------------------------------------------------------------------ loop
func _physics_process(delta: float) -> void:
	if paused:
		return
	var dt: float = 1.0 / float(cfg.tick_rate)
	# Godot runs physics at 120 Hz (project setting); keep the sim fixed-step.
	if absf(delta - dt) > 0.002:
		dt = delta
	if rules.phase != MatchRules.Phase.ENDED:
		player_input.read(player_car.controls)
	else:
		player_car.controls.reset()
	for b in bots:
		b.update(dt)
	var t0: int = Time.get_ticks_usec()
	rules.step(dt)
	_phys_ms = lerpf(_phys_ms, float(Time.get_ticks_usec() - t0) / 1000.0, 0.1)
	_handle_events()


func _process(delta: float) -> void:
	for cv in car_visuals:
		cv.sync(delta)
	var ball_hidden: bool = rules.phase == MatchRules.Phase.GOAL and not free_play
	ball_visual.sync(delta, world.arena, ball_hidden)
	arena_visual.update_pads(world.pads, world.time)
	cam.update_camera(delta)
	hud.tick(delta)
	if free_play:
		hud.set_scores(rules.scores[0], rules.scores[1], "∞", false)
	else:
		hud.set_scores(rules.scores[0], rules.scores[1], rules.clock_text(), rules.overtime)
	hud.boost_meter.set_value(player_car.boost, cfg.unlimited_boost)
	hud.boost_meter.color = team_colors[0].lerp(Color(1, 0.6, 0.1), 0.6)
	var cam_txt: String = I18n.t("ball_cam") if cam.mode == CarCamera.Mode.BALL else I18n.t("car_cam")
	hud.cam_label.text = cam_txt + (" · " + I18n.t("supersonic") if player_car.supersonic else "")
	hud.set_debug(player_car, delta * 1000.0, _phys_ms)
	audio.update_vehicle(player_car.vel.length(), player_car.boosting, player_car.on_ground)
	# Countdown numbers.
	if rules.phase == MatchRules.Phase.COUNTDOWN and not free_play:
		var n: int = int(ceil(rules.phase_timer))
		if n != _last_countdown and n > 0:
			_last_countdown = n
			hud.show_center(str(n), I18n.t("overtime") if rules.overtime else I18n.t("kickoff"), 1.0)
			audio.play("beep", 0.8)
	if hud.scoreboard.visible:
		hud.update_scoreboard(rules, names, player_car.id)


func _handle_events() -> void:
	for e in rules.events:
		match e["type"]:
			"go":
				_last_countdown = -1
				if not free_play:
					hud.show_center(I18n.t("go"), "", 0.8, UiStyle.ACCENT)
					audio.play("go", 0.8)
			"ball_hit":
				var s: float = float(e["strength"])
				audio.play_at("hit" if s > 6.0 else "hit_soft", e["pos"], clampf(s / 18.0, 0.25, 1.2), randf_range(0.9, 1.1))
				if s > 8.0:
					fx.impact(e["pos"], s)
				if int(e["car"]) == player_car.id and s > 14.0:
					cam.add_shake(0.25)
			"ball_bounce":
				audio.play_at("bounce", e["pos"], clampf(float(e["speed"]) / 25.0, 0.1, 0.8))
			"goal":
				_on_goal(e)
			"demolition":
				var a: int = int(e["attacker"])
				var v: int = int(e["victim"])
				fx.demolition(e["pos"], team_colors[world.cars[v].team])
				audio.play_at("demo", e["pos"], 1.0)
				hud.add_feed(I18n.t("demolished", [names[a], names[v]]), team_colors[world.cars[a].team].lightened(0.3))
				if v == player_car.id or a == player_car.id:
					cam.add_shake(0.5)
				audio.excite_crowd(0.6)
			"boost_pickup":
				if int(e["car"]) == player_car.id:
					audio.play("pickup_big" if e["big"] else "pickup", 0.5)
				fx.pickup(e["pos"], e["big"])
			"save":
				var c: int = int(e["car"])
				hud.add_feed("🛡 " + names[c] + " · " + I18n.t("saves"), team_colors[world.cars[c].team].lightened(0.3))
				audio.excite_crowd(0.7)
			"shot":
				audio.excite_crowd(0.45)
			"overtime":
				hud.show_center(I18n.t("overtime"), "", 2.5, Color(1, 0.8, 0.3))
				audio.play("horn", 0.7)
			"match_end":
				_on_match_end(int(e["winner"]))
			"countdown":
				if not free_play:
					cam.mode = CarCamera.Mode.BALL if bool(Settings.get_value("camera", "ball_cam_default")) else CarCamera.Mode.CAR
					arena_visual.set_excitement(0.2)


func _on_goal(e: Dictionary) -> void:
	var team: int = int(e["team"])
	var col: Color = team_colors[team]
	fx.goal_explosion(e["pos"], col)
	audio.play("goal", 1.0)
	audio.excite_crowd(1.0)
	arena_visual.set_excitement(1.0)
	cam.add_shake(0.7)
	var scorer: int = int(e["scorer"])
	var who: String = names[scorer] if scorer >= 0 else ""
	var sub: String = ("%s · %.0f km/h" % [who, float(e["speed"]) * 3.6]) if who != "" else "%.0f km/h" % (float(e["speed"]) * 3.6)
	hud.show_center(I18n.t("goal"), sub, 2.8, col.lightened(0.25))
	if not free_play:
		cam.start_orbit(e["pos"])
	else:
		# Free play: put the ball back after the celebration, keep driving.
		get_tree().create_timer(1.2).timeout.connect(func():
			if rules.phase == MatchRules.Phase.GOAL:
				rules.phase_timer = 0.0)


func _on_match_end(winner: int) -> void:
	cam.start_orbit(Vector3(0, 2, 0))
	audio.play("horn", 0.9)
	var won: bool = winner == player_car.team
	var minutes: float = (rules._time_limit + rules.overtime_elapsed) / 60.0
	var xp: int = 0
	if not _recorded:
		_recorded = true
		xp = GameState.record_match(rules.stats[player_car.id].to_dict(), won, minutes)
	_show_post_match(winner, xp)


# ------------------------------------------------------------------ input
func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("va_pause"):
		if _post_layer == null:
			_toggle_pause()
		get_viewport().set_input_as_handled()
		return
	if paused:
		return
	if event.is_action_pressed("va_scoreboard"):
		hud.scoreboard.visible = true
	elif event.is_action_released("va_scoreboard"):
		hud.scoreboard.visible = false
	elif event.is_action_pressed("va_ball_cam"):
		if cam.mode != CarCamera.Mode.ORBIT:
			cam.mode = CarCamera.Mode.CAR if cam.mode == CarCamera.Mode.BALL else CarCamera.Mode.BALL
	elif event.is_action_pressed("va_rear_view"):
		cam.rear_view = true
	elif event.is_action_released("va_rear_view"):
		cam.rear_view = false
	elif event.is_action_pressed("va_debug"):
		hud.debug_label.visible = not hud.debug_label.visible
	elif free_play:
		_free_play_input(event)


func _free_play_input(event: InputEvent) -> void:
	var b: BallBody = world.ball
	var c: CarBody = player_car
	if event.is_action_pressed("va_fp_reset"):
		c.set_transform(Vector3(0, 0.17, -40), Basis.looking_at(Vector3.BACK, Vector3.UP))
		c.boost = 100.0
		b.reset()
	elif event.is_action_pressed("va_fp_ball_to_me"):
		var f: Vector3 = Vector3(c.forward().x, 0, c.forward().z).normalized()
		b.reset(c.pos + f * 22.0 + Vector3.UP * 3.0)
		_clamp_ball_inside()
		var to_car: Vector3 = c.pos + f * 4.0 - b.pos
		b.vel = Vector3(to_car.x, 0, to_car.z) / 1.6 + Vector3.UP * 6.0
	elif event.is_action_pressed("va_fp_shot"):
		b.reset(Vector3(randf_range(-15, 15), 1.0, -10.0))
		var goal := Vector3(randf_range(-6, 6), randf_range(1, 5), -cfg.arena_half_length - 2.0)
		b.vel = (goal - b.pos).normalized() * 22.0 + Vector3.UP * 4.0
	elif event.is_action_pressed("va_fp_unlimited"):
		cfg.unlimited_boost = not cfg.unlimited_boost
		hud.add_feed("Turbo infinito: %s" % ("SÍ" if cfg.unlimited_boost else "NO"))
	elif event.is_action_pressed("va_fp_gravity"):
		cfg.gravity = _base_gravity * 0.4 if cfg.gravity == _base_gravity else _base_gravity
		hud.add_feed("Gravedad: %.1f m/s²" % cfg.gravity)
	elif event.is_action_pressed("va_fp_ball_on_car"):
		b.reset(c.pos + c.up() * (0.55 + b.radius) + c.forward() * 0.1)
		b.vel = c.vel


func _clamp_ball_inside() -> void:
	var b: BallBody = world.ball
	b.pos.x = clampf(b.pos.x, -cfg.arena_half_width + 4.0, cfg.arena_half_width - 4.0)
	b.pos.z = clampf(b.pos.z, -cfg.arena_half_length + 4.0, cfg.arena_half_length - 4.0)


# ------------------------------------------------------------------ menus
func _toggle_pause() -> void:
	paused = not paused
	if paused:
		_pause_layer = CanvasLayer.new()
		_pause_layer.layer = 20
		add_child(_pause_layer)
		var dim := ColorRect.new()
		dim.color = Color(0, 0, 0, 0.55)
		UiStyle.full_rect(dim)
		_pause_layer.add_child(dim)
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 14))
		panel.set_anchors_preset(Control.PRESET_CENTER)
		panel.offset_left = -220
		panel.offset_right = 220
		panel.offset_top = -230
		panel.offset_bottom = 230
		_pause_layer.add_child(panel)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 12)
		panel.add_child(v)
		v.add_child(UiStyle.label(I18n.t("paused"), 40, UiStyle.ACCENT))
		v.add_child(UiStyle.label(mode.display_name(I18n.language), 18, UiStyle.TEXT_DIM))
		var resume := UiStyle.button(I18n.t("resume"), 22, true)
		resume.pressed.connect(_toggle_pause)
		v.add_child(resume)
		var restart := UiStyle.button(I18n.t("restart"), 22)
		restart.pressed.connect(func(): get_tree().reload_current_scene())
		v.add_child(restart)
		var settings := UiStyle.button(I18n.t("settings"), 22)
		settings.pressed.connect(_open_settings_from_pause)
		v.add_child(settings)
		var menu := UiStyle.button(I18n.t("main_menu"), 22)
		menu.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main/main_menu.tscn"))
		v.add_child(menu)
		resume.grab_focus()
	else:
		if _pause_layer:
			_pause_layer.queue_free()
			_pause_layer = null
		cam.load_settings()
		hud.debug_label.visible = bool(Settings.get_value("game", "show_debug")) or hud.debug_label.visible


func _open_settings_from_pause() -> void:
	var sp := SettingsPanel.new()
	sp.set_anchors_preset(Control.PRESET_CENTER)
	sp.offset_left = -400
	sp.offset_right = 400
	sp.offset_top = -300
	sp.offset_bottom = 300
	_pause_layer.add_child(sp)
	sp.closed.connect(func():
		sp.queue_free()
		cam.load_settings())


func _show_post_match(winner: int, xp: int) -> void:
	_post_layer = CanvasLayer.new()
	_post_layer.layer = 15
	add_child(_post_layer)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 14))
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -520
	panel.offset_right = 520
	panel.offset_top = -300
	panel.offset_bottom = 320
	_post_layer.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	panel.add_child(v)
	var title: String
	var col: Color = UiStyle.TEXT
	if winner < 0:
		title = I18n.t("draw")
	else:
		title = I18n.t("wins", [I18n.t("blue") if winner == 0 else I18n.t("orange")])
		col = team_colors[winner].lightened(0.3)
	v.add_child(UiStyle.label(title, 54, col, 8))
	v.add_child(UiStyle.label("%d - %d   ·   %s" % [rules.scores[0], rules.scores[1], mode.display_name(I18n.language)], 24, UiStyle.TEXT_DIM))
	var mvp: int = rules.mvp()
	if mvp >= 0:
		v.add_child(UiStyle.label("MVP: " + names[mvp], 22, Color(1, 0.85, 0.35)))
	var grid := GridContainer.new()
	grid.columns = 7
	grid.add_theme_constant_override("h_separation", 28)
	for h in [I18n.t("player"), I18n.t("score"), I18n.t("goals"), I18n.t("assists"), I18n.t("saves"), I18n.t("shots"), I18n.t("demos")]:
		grid.add_child(UiStyle.label(h, 16, UiStyle.TEXT_DIM))
	for team in [0, 1]:
		for i in world.cars.size():
			if world.cars[i].team != team:
				continue
			var st: MatchRules.PlayerStats = rules.stats[i]
			grid.add_child(UiStyle.label(names[i], 20, team_colors[team].lightened(0.35)))
			for val in [st.score, st.goals, st.assists, st.saves, st.shots, st.demos]:
				grid.add_child(UiStyle.label(str(val), 20))
	v.add_child(grid)
	v.add_child(UiStyle.label(I18n.t("xp_earned", [xp]) + "   ·   " + I18n.t("level", [GameState.level()]), 24, UiStyle.ACCENT))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 16)
	v.add_child(h)
	var again := UiStyle.button(I18n.t("rematch"), 22, true)
	again.pressed.connect(func(): get_tree().reload_current_scene())
	h.add_child(again)
	var menu := UiStyle.button(I18n.t("main_menu"), 22)
	menu.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main/main_menu.tscn"))
	h.add_child(menu)
	again.grab_focus()
