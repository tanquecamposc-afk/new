extends Node3D
## Online match presentation. The authoritative simulation runs on the
## server; this scene renders the client's predicted world (Net.prediction),
## shows the server's match state, and sends only inputs.

const QUICK_CHAT_ES := ["¡Buen tiro!", "¡Gran pase!", "¡Es mía!", "¡Defiendo!", "¡Necesito turbo!", "¡Gracias!", "¡Perdón!", "¡Qué parada!"]

var prediction: ClientPrediction
var world: SimWorld
var cfg: Dictionary
var names: Array = []
var team_colors: Array[Color] = []
var my_car: CarBody
var spectator: bool = false

var arena_visual: ArenaVisual
var car_visuals: Array[CarVisual] = []
var ball_visual: BallVisual
var cam: CarCamera
var hud: Hud
var fx: Fx
var audio: SynthAudio
var player_input := PlayerInput.new()
var net_label: Label
var chat_box: VBoxContainer
var chat_input: LineEdit
var _menu_layer: CanvasLayer
var _post_layer: CanvasLayer
var _last_countdown: int = -1
var _last_phase: int = -1
var _spectate_index: int = 0


func _ready() -> void:
	PlayerInput.register_actions()
	prediction = Net.prediction
	cfg = Net.match_cfg
	if prediction == null:
		get_tree().change_scene_to_file.call_deferred("res://scenes/main/main_menu.tscn")
		return
	world = prediction.world
	names = cfg.get("names", [])
	my_car = prediction.local_car()
	spectator = my_car == null
	team_colors = [Settings.team_color(0), Settings.team_color(1)]
	_build()
	Net.match_event.connect(_on_net_event)
	Net.chat_received.connect(_on_chat)
	Net.left_room.connect(_on_left_room)
	Net.status_changed.connect(_on_status)
	Net.match_started.connect(_on_match_restart)


func _on_left_room(_reason: String) -> void:
	_to_menu()


func _on_match_restart(_cfg: Dictionary) -> void:
	get_tree().reload_current_scene()


func _build() -> void:
	var particles: bool = bool(Settings.get_value("video", "particles"))
	arena_visual = ArenaVisual.new()
	add_child(arena_visual)
	arena_visual.build(world.arena, world.pads, str(cfg.get("lighting", "night")), team_colors)
	for car in world.cars:
		var cv := CarVisual.new()
		add_child(cv)
		var nm: String = str(names[car.id]) if car.id < names.size() else "?"
		cv.setup(car, team_colors[car.team], nm, car != my_car, particles)
		car_visuals.append(cv)
	ball_visual = BallVisual.new()
	add_child(ball_visual)
	ball_visual.setup(world.ball, particles)
	fx = Fx.new()
	fx.enabled = particles
	add_child(fx)
	cam = CarCamera.new()
	add_child(cam)
	cam.load_settings()
	cam.target = my_car if my_car else world.cars[0]
	cam.ball = world.ball
	cam.arena = world.arena
	cam.current = true
	cam.near = 0.05
	cam.far = 600.0
	cam.global_position = cam.target.pos + Vector3(0, 3, 0)
	audio = SynthAudio.new()
	add_child(audio)
	hud = Hud.new()
	add_child(hud)
	hud.build(team_colors)
	hud.help_label.text = ("ESPECTADOR · Tab: cambiar coche · " if spectator else "") + "1-8 chat rápido · Intro: chat · F4: red · Esc: menú"
	# Network overlay.
	net_label = UiStyle.label("", 14, Color(0.75, 0.9, 1.0), 4)
	net_label.anchor_left = 1.0
	net_label.anchor_right = 1.0
	net_label.offset_left = -560
	net_label.offset_top = 200
	net_label.visible = false
	hud.root.add_child(net_label)
	var ping := UiStyle.label("", 15, UiStyle.TEXT_DIM, 4)
	ping.name = "Ping"
	ping.offset_left = 24
	ping.offset_top = 20
	hud.root.add_child(ping)
	# Chat.
	chat_box = VBoxContainer.new()
	chat_box.anchor_top = 1.0
	chat_box.anchor_bottom = 1.0
	chat_box.offset_left = 24
	chat_box.offset_top = -330
	chat_box.offset_right = 520
	chat_box.offset_bottom = -110
	chat_box.alignment = BoxContainer.ALIGNMENT_END
	chat_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.root.add_child(chat_box)
	chat_input = LineEdit.new()
	chat_input.anchor_top = 1.0
	chat_input.anchor_bottom = 1.0
	chat_input.offset_left = 24
	chat_input.offset_top = -104
	chat_input.offset_right = 520
	chat_input.offset_bottom = -72
	chat_input.max_length = 120
	chat_input.placeholder_text = "Escribe y pulsa Intro (Esc cancela)"
	chat_input.visible = false
	chat_input.text_submitted.connect(_send_chat)
	hud.root.add_child(chat_input)


func _physics_process(_delta: float) -> void:
	if prediction == null:
		return
	var c := CarControls.new()
	if not spectator and not chat_input.visible and _menu_layer == null:
		player_input.read(c)
	Net.client_tick(c)
	_present_local_events()


func _present_local_events() -> void:
	# Predicted, purely cosmetic events (hits, bounces, pickups).
	for e in prediction.events_local:
		match e["type"]:
			"ball_hit":
				var s: float = float(e["strength"])
				audio.play_at("hit" if s > 6.0 else "hit_soft", e["pos"], clampf(s / 18.0, 0.25, 1.2))
				if s > 8.0:
					fx.impact(e["pos"], s)
			"ball_bounce":
				audio.play_at("bounce", e["pos"], clampf(float(e["speed"]) / 25.0, 0.1, 0.8))
			"boost_pickup":
				if my_car and int(e["car"]) == my_car.id:
					audio.play("pickup_big" if e["big"] else "pickup", 0.5)
				fx.pickup(e["pos"], e["big"])
	prediction.events_local.clear()


func _process(delta: float) -> void:
	if prediction == null:
		return
	var ms: Dictionary = prediction.match_state
	for cv in car_visuals:
		cv.visual_offset = prediction.car_offsets.get(cv.car.id, Vector3.ZERO)
		cv.sync(delta)
	if spectator:
		_apply_interpolation()
	ball_visual.visual_offset = prediction.ball_offset
	var phase: int = int(ms.get("phase", 0))
	ball_visual.sync(delta, world.arena, phase == MatchRules.Phase.GOAL)
	arena_visual.update_pads(world.pads, world.time)
	cam.update_camera(delta)
	hud.tick(delta)
	var clock: String = _clock(ms)
	hud.set_scores(int(ms.get("score0", 0)), int(ms.get("score1", 0)), clock, bool(ms.get("overtime", false)))
	if my_car:
		hud.boost_meter.set_value(my_car.boost, world.cfg.unlimited_boost)
		audio.update_vehicle(my_car.vel.length(), my_car.boosting, my_car.on_ground)
	hud.boost_meter.visible = my_car != null
	hud.cam_label.text = I18n.t("ball_cam") if cam.mode == CarCamera.Mode.BALL else I18n.t("car_cam")
	(hud.root.get_node("Ping") as Label).text = "Ping %d ms · %s" % [int(Net.rtt_ms), Net.status]
	if net_label.visible:
		net_label.text = "\n".join(Net.debug_lines())
	if phase == MatchRules.Phase.COUNTDOWN:
		var n: int = int(ceil(float(ms.get("phase_timer", 0.0))))
		if n != _last_countdown and n > 0:
			_last_countdown = n
			hud.show_center(str(n), I18n.t("kickoff"), 1.0)
			audio.play("beep", 0.8)
	if phase != _last_phase:
		if phase == MatchRules.Phase.PLAYING and _last_phase == MatchRules.Phase.COUNTDOWN:
			hud.show_center(I18n.t("go"), "", 0.8, UiStyle.ACCENT)
			audio.play("go", 0.8)
			_last_countdown = -1
			if cam.mode == CarCamera.Mode.ORBIT:
				cam.load_settings()
		_last_phase = phase


func _clock(ms: Dictionary) -> String:
	if bool(ms.get("unlimited", false)):
		return "∞"
	if bool(ms.get("overtime", false)):
		var e: int = int(ms.get("overtime_elapsed", 0.0))
		return "+%d:%02d" % [e / 60, e % 60]
	var t: int = int(ceil(float(ms.get("time_remaining", 0.0))))
	return "%d:%02d" % [t / 60, t % 60]


func _apply_interpolation() -> void:
	var smp: Dictionary = prediction.interp.sample(float(prediction.last_snapshot_tick))
	if smp.is_empty():
		return
	for cv in car_visuals:
		var d: Array = smp["cars"].get(cv.car.id, [])
		if d.size() == 2 and not cv.car.demolished:
			cv.global_transform = Transform3D(Basis(d[1] as Quaternion), d[0])
	ball_visual.visual_offset = (smp["ball"] as Vector3) - world.ball.pos


func _on_net_event(e: Dictionary) -> void:
	match e.get("type", ""):
		"goal":
			var team: int = int(e["team"])
			var col: Color = team_colors[team]
			fx.goal_explosion(e["pos"], col)
			audio.play("goal", 1.0)
			audio.excite_crowd(1.0)
			arena_visual.set_excitement(1.0)
			cam.add_shake(0.6)
			var sc: int = int(e.get("scorer", -1))
			var who: String = str(names[sc]) if sc >= 0 and sc < names.size() else ""
			hud.show_center(I18n.t("goal"), "%s · %.0f km/h" % [who, float(e.get("speed", 0.0)) * 3.6], 2.8, col.lightened(0.25))
			cam.start_orbit(e["pos"])
		"demolition":
			var a: int = int(e["attacker"])
			var v: int = int(e["victim"])
			fx.demolition(e["pos"], team_colors[world.cars[v].team])
			audio.play_at("demo", e["pos"])
			hud.add_feed(I18n.t("demolished", [str(names[a]), str(names[v])]), team_colors[world.cars[a].team].lightened(0.3))
		"save":
			var c: int = int(e["car"])
			hud.add_feed("PARADA: " + str(names[c]))
		"overtime":
			hud.show_center(I18n.t("overtime"), "", 2.5, Color(1, 0.8, 0.3))
			audio.play("horn", 0.7)
		"countdown":
			arena_visual.set_excitement(0.2)
		"match_end":
			_show_post(e)
		"lobby":
			GameState.set_meta("open_online_lobby", true)
			_to_menu()


func _on_chat(msg: Dictionary) -> void:
	var team: int = int(msg.get("team", -1))
	var col: Color = team_colors[team].lightened(0.4) if team in [0, 1] else UiStyle.TEXT_DIM
	var l := UiStyle.label("%s%s: %s" % ["[EQUIPO] " if msg.get("team_only", false) else "", msg.get("from", "?"), msg.get("text", "")], 17, col, 5)
	chat_box.add_child(l)
	while chat_box.get_child_count() > 7:
		chat_box.get_child(0).queue_free()
	var tw := l.create_tween()
	tw.tween_interval(8.0)
	tw.tween_property(l, "modulate:a", 0.0, 1.0)


func _send_chat(text: String) -> void:
	if text.strip_edges() != "":
		Net.send_chat(text, false)
	chat_input.text = ""
	chat_input.visible = false
	chat_input.release_focus()


func _on_status(st: String) -> void:
	if st == "reconnecting":
		hud.show_center("RECONECTANDO…", "Conexión perdida con el servidor", 3.0, Color(1, 0.7, 0.3))
	elif st == "offline":
		hud.show_center("DESCONECTADO", Net.last_error, 4.0, Color(1, 0.4, 0.4))
		get_tree().create_timer(3.0).timeout.connect(_to_menu, CONNECT_ONE_SHOT)


func _unhandled_input(event: InputEvent) -> void:
	if chat_input.visible:
		if event.is_action_pressed("va_pause"):
			chat_input.visible = false
			get_viewport().set_input_as_handled()
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var k: int = (event as InputEventKey).physical_keycode
		if k >= KEY_1 and k <= KEY_8:
			Net.send_chat(QUICK_CHAT_ES[k - KEY_1], false)
			return
		if k == KEY_ENTER or k == KEY_KP_ENTER:
			chat_input.visible = true
			chat_input.grab_focus()
			get_viewport().set_input_as_handled()
			return
		if k == KEY_F4:
			net_label.visible = not net_label.visible
			return
	if event.is_action_pressed("va_pause"):
		_toggle_menu()
	elif event.is_action_pressed("va_ball_cam") and cam.mode != CarCamera.Mode.ORBIT:
		cam.mode = CarCamera.Mode.CAR if cam.mode == CarCamera.Mode.BALL else CarCamera.Mode.BALL
	elif event.is_action_pressed("va_rear_view"):
		cam.rear_view = true
	elif event.is_action_released("va_rear_view"):
		cam.rear_view = false
	elif event.is_action_pressed("va_debug"):
		hud.debug_label.visible = not hud.debug_label.visible
	elif event.is_action_pressed("va_scoreboard") and spectator:
		_spectate_index = (_spectate_index + 1) % world.cars.size()
		cam.target = world.cars[_spectate_index]
	if my_car:
		hud.set_debug(my_car, 0.0, 0.0)


func _toggle_menu() -> void:
	if _menu_layer:
		_menu_layer.queue_free()
		_menu_layer = null
		return
	# Online: the match keeps running while the menu is open.
	_menu_layer = CanvasLayer.new()
	_menu_layer.layer = 20
	add_child(_menu_layer)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 14))
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -230
	panel.offset_right = 230
	panel.offset_top = -170
	panel.offset_bottom = 170
	_menu_layer.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	panel.add_child(v)
	v.add_child(UiStyle.label("PARTIDA EN LÍNEA", 30, UiStyle.ACCENT))
	v.add_child(UiStyle.label("Sala %s · la partida sigue en curso" % cfg.get("room", "?"), 15, UiStyle.TEXT_DIM))
	var resume := UiStyle.button(I18n.t("resume"), 22, true)
	resume.pressed.connect(_toggle_menu)
	v.add_child(resume)
	var leave := UiStyle.button("Abandonar sala", 22)
	leave.pressed.connect(func():
		Net.leave_room()
		_to_menu())
	v.add_child(leave)
	var disc := UiStyle.button("Desconectar del servidor", 22)
	disc.pressed.connect(func():
		Net.disconnect_from_server()
		_to_menu())
	v.add_child(disc)
	resume.grab_focus()


func _show_post(e: Dictionary) -> void:
	cam.start_orbit(Vector3(0, 2, 0))
	audio.play("horn", 0.9)
	_post_layer = CanvasLayer.new()
	_post_layer.layer = 15
	add_child(_post_layer)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 14))
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -500
	panel.offset_right = 500
	panel.offset_top = -260
	panel.offset_bottom = 260
	_post_layer.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	panel.add_child(v)
	var winner: int = int(e.get("winner", -1))
	var title: String = I18n.t("draw") if winner < 0 else I18n.t("wins", [I18n.t("blue") if winner == 0 else I18n.t("orange")])
	v.add_child(UiStyle.label(title, 50, team_colors[winner].lightened(0.3) if winner >= 0 else UiStyle.TEXT, 8))
	var grid := GridContainer.new()
	grid.columns = 7
	grid.add_theme_constant_override("h_separation", 26)
	for h in [I18n.t("player"), I18n.t("score"), I18n.t("goals"), I18n.t("assists"), I18n.t("saves"), I18n.t("shots"), I18n.t("demos")]:
		grid.add_child(UiStyle.label(h, 16, UiStyle.TEXT_DIM))
	for st in e.get("stats", []):
		grid.add_child(UiStyle.label(str(st.get("name", "?")), 19, team_colors[int(st.get("team", 0))].lightened(0.35)))
		for k in ["score", "goals", "assists", "saves", "shots", "demos"]:
			grid.add_child(UiStyle.label(str(st.get(k, 0)), 19))
	v.add_child(grid)
	v.add_child(UiStyle.label("Resultado verificado por el servidor. Volviendo al lobby en unos segundos…", 16, UiStyle.TEXT_DIM))
	if my_car and winner >= 0:
		var mine: Dictionary = e.get("stats", [])[my_car.id] if my_car.id < e.get("stats", []).size() else {}
		var xp: int = GameState.record_match(mine, winner == my_car.team, float(cfg.get("minutes", 5.0)))
		v.add_child(UiStyle.label(I18n.t("xp_earned", [xp]), 22, UiStyle.ACCENT))


func _to_menu() -> void:
	if not is_inside_tree():
		return
	get_tree().change_scene_to_file("res://scenes/main/main_menu.tscn")
