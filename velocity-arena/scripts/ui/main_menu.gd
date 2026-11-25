extends Node3D
## Main menu: live 3D stadium background with the player's car on a
## turntable, plus the menu panels (play setup, modes catalogue, training,
## profile, settings). Unimplemented features are shown disabled and
## clearly labelled "in development" — no fake functionality.

var _ui: CanvasLayer
var _content: Control
var _cam: Camera3D
var _cam_angle: float = 0.6
var _showcase: CarVisual
var _showcase_car: CarBody
var _ball_vis: BallVisual
var _sel_mode: String = "soccar_2v2"
var _audio: SynthAudio


func _ready() -> void:
	if Net.dedicated:
		# Dedicated server: no menus, no rendering work.
		set_process(false)
		return
	PlayerInput.register_actions()
	var cfg := PhysicsConfig.new()
	var world := SimWorld.new(cfg)
	var arena := ArenaVisual.new()
	add_child(arena)
	arena.build(world.arena, world.pads, GameState.lighting, [Settings.team_color(0), Settings.team_color(1)])
	arena.set_excitement(0.3)
	_showcase_car = world.add_car(0)
	_showcase_car.set_transform(Vector3(0, 0.15, 6.0), Basis.IDENTITY)
	_showcase = CarVisual.new()
	add_child(_showcase)
	_showcase.setup(_showcase_car, Settings.team_color(0), "", false, false)
	_showcase.scale = Vector3(1, 1, 1)
	world.ball.pos = Vector3(-3.0, world.ball.radius, 2.5)
	_ball_vis = BallVisual.new()
	add_child(_ball_vis)
	_ball_vis.setup(world.ball, false)
	_ball_vis.sync(0.0, world.arena, false)
	var spot := SpotLight3D.new()
	spot.position = Vector3(0, 8, 9)
	spot.look_at_from_position(spot.position, Vector3(0, 0, 6), Vector3.UP)
	spot.light_energy = 6.0
	spot.spot_angle = 25.0
	spot.spot_range = 20.0
	add_child(spot)
	_cam = Camera3D.new()
	_cam.fov = 55.0
	add_child(_cam)
	_cam.current = true
	_audio = SynthAudio.new()
	add_child(_audio)
	_build_ui()
	I18n.language_changed.connect(func(): _rebuild())
	_show_home()


func _process(dt: float) -> void:
	_cam_angle += dt * 0.08
	var center := Vector3(-0.5, 0.6, 5.0)
	_cam.position = center + Vector3(sin(_cam_angle) * 5.5, 1.5 + sin(_cam_angle * 0.7) * 0.3, cos(_cam_angle) * 5.5)
	_cam.look_at(center + Vector3(-1.4, 0.0, 0.0), Vector3.UP)
	_showcase_car.basis = Basis(Vector3.UP, sin(Time.get_ticks_msec() / 4000.0) * 0.4 + 0.6)
	_showcase.sync(dt)


func _rebuild() -> void:
	_ui.queue_free()
	_build_ui()
	_show_home()


func _build_ui() -> void:
	_ui = CanvasLayer.new()
	add_child(_ui)
	var root := Control.new()
	UiStyle.full_rect(root)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ui.add_child(root)
	var grad := TextureRect.new()
	var g := Gradient.new()
	g.set_color(0, Color(0.01, 0.02, 0.05, 0.92))
	g.set_color(1, Color(0.01, 0.02, 0.05, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(1, 0)
	grad.texture = gt
	grad.anchor_bottom = 1.0
	grad.anchor_right = 0.62
	grad.stretch_mode = TextureRect.STRETCH_SCALE
	grad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(grad)
	var title := UiStyle.label("VELOCITY ARENA", 64, Color.WHITE, 10)
	title.position = Vector2(60, 36)
	root.add_child(title)
	var sub := UiStyle.label("FÚTBOL DE COCHES · ALFA 0.3", 18, UiStyle.ACCENT)
	sub.position = Vector2(64, 118)
	root.add_child(sub)
	var prof := UiStyle.label("%s · %s" % [str(GameState.profile["name"]), I18n.t("level", [GameState.level()])], 18, UiStyle.TEXT_DIM)
	prof.anchor_left = 1.0
	prof.anchor_right = 1.0
	prof.offset_left = -360
	prof.offset_top = 40
	prof.offset_right = -40
	prof.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	root.add_child(prof)
	_content = Control.new()
	_content.position = Vector2(60, 170)
	_content.size = Vector2(760, 700)
	root.add_child(_content)


func _clear() -> VBoxContainer:
	for ch in _content.get_children():
		ch.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.custom_minimum_size = Vector2(420, 0)
	_content.add_child(v)
	return v


func _click() -> void:
	if _audio:
		_audio.play("ui", 0.5)


# ------------------------------------------------------------------ home
func _show_home() -> void:
	var v := _clear()
	var play := UiStyle.button("▶  " + I18n.t("play"), 30, true)
	play.custom_minimum_size = Vector2(420, 64)
	play.pressed.connect(func(): _click(); _show_play())
	v.add_child(play)
	var training := UiStyle.button(I18n.t("training"), 24)
	training.pressed.connect(func(): _click(); _show_training())
	v.add_child(training)
	var modes := UiStyle.button(I18n.t("modes"), 24)
	modes.pressed.connect(func(): _click(); _show_modes())
	v.add_child(modes)
	var profile := UiStyle.button(I18n.t("profile"), 24)
	profile.pressed.connect(func(): _click(); _show_profile())
	v.add_child(profile)
	var settings := UiStyle.button(I18n.t("settings"), 24)
	settings.pressed.connect(func(): _click(); _show_settings())
	v.add_child(settings)
	# Planned sections: visible on the roadmap, explicitly unavailable.
	var soon := HFlowContainer.new()
	soon.add_theme_constant_override("h_separation", 8)
	soon.add_theme_constant_override("v_separation", 8)
	soon.custom_minimum_size = Vector2(420, 0)
	for key in ["COMPETITIVO", "TORNEOS", "GARAJE", "PASE DE TEMPORADA", "DESAFÍOS", "TIENDA", "AMIGOS"]:
		var b := UiStyle.button(key + "  · " + I18n.t("coming_soon"), 13)
		b.disabled = true
		b.tooltip_text = I18n.t("not_available", [key])
		soon.add_child(b)
	v.add_child(UiStyle.label("", 6))
	v.add_child(soon)
	var exit := UiStyle.button(I18n.t("exit"), 20)
	exit.pressed.connect(func(): get_tree().quit())
	v.add_child(exit)
	play.grab_focus()


# ------------------------------------------------------------------ play
func _show_play() -> void:
	var v := _clear()
	v.add_child(UiStyle.label(I18n.t("exhibition"), 34, UiStyle.ACCENT))
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiStyle.panel_box())
	v.add_child(panel)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 12)
	panel.add_child(grid)
	# Mode (only playable match modes).
	grid.add_child(UiStyle.label(I18n.t("mode"), 20))
	var mode_ob := OptionButton.new()
	var ids: Array[String] = []
	for m in GameModeRegistry.playable():
		if m.category == "training":
			continue
		ids.append(m.id)
		mode_ob.add_item(m.display_name(I18n.language))
	mode_ob.selected = maxi(0, ids.find(_sel_mode))
	var desc := UiStyle.label("", 15, UiStyle.TEXT_DIM)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD
	desc.custom_minimum_size = Vector2(420, 44)
	var upd := func(i: int):
		_sel_mode = ids[i]
		var m: GameModeDef = GameModeRegistry.get_mode(_sel_mode)
		desc.text = m.description(I18n.language) + "  (%dv%d)" % [m.team_size, m.team_size]
	mode_ob.item_selected.connect(upd)
	upd.call(mode_ob.selected)
	grid.add_child(mode_ob)
	grid.add_child(UiStyle.label("", 4))
	grid.add_child(desc)
	# Difficulty.
	grid.add_child(UiStyle.label(I18n.t("difficulty"), 20))
	var diff_ob := OptionButton.new()
	for d in range(1, 8):
		diff_ob.add_item("%d · %s" % [d, BotController.difficulty_name(d, I18n.language)])
	diff_ob.selected = GameState.bot_difficulty - 1
	diff_ob.item_selected.connect(func(i: int): GameState.bot_difficulty = i + 1)
	grid.add_child(diff_ob)
	# Duration.
	grid.add_child(UiStyle.label(I18n.t("duration"), 20))
	var dur_ob := OptionButton.new()
	var durs := [2.0, 3.0, 5.0, 10.0, 0.0]
	for d in durs:
		dur_ob.add_item(I18n.t("unlimited") if d == 0.0 else I18n.t("minutes", [int(d)]))
	dur_ob.selected = maxi(0, durs.find(GameState.match_minutes))
	dur_ob.item_selected.connect(func(i: int): GameState.match_minutes = durs[i])
	grid.add_child(dur_ob)
	# Lighting.
	grid.add_child(UiStyle.label(I18n.t("time_of_day"), 20))
	var light_ob := OptionButton.new()
	var lights := ["night", "day", "sunset"]
	for l in lights:
		light_ob.add_item(I18n.t(l))
	light_ob.selected = maxi(0, lights.find(GameState.lighting))
	light_ob.item_selected.connect(func(i: int): GameState.lighting = lights[i])
	grid.add_child(light_ob)
	grid.add_child(UiStyle.label(I18n.t("arena"), 20))
	grid.add_child(UiStyle.label("Velocity Stadium", 20, UiStyle.TEXT_DIM))
	var start := UiStyle.button("▶  " + I18n.t("start_match"), 26, true)
	start.pressed.connect(func():
		_click()
		GameState.mode_id = _sel_mode
		GameState.free_play = false
		get_tree().change_scene_to_file("res://scenes/gameplay/match.tscn"))
	v.add_child(start)
	var back := UiStyle.button(I18n.t("back"), 20)
	back.pressed.connect(_show_home)
	v.add_child(back)
	v.add_child(UiStyle.label(I18n.t("controls_help"), 14, UiStyle.TEXT_DIM))
	start.grab_focus()


func _show_training() -> void:
	var v := _clear()
	v.add_child(UiStyle.label(I18n.t("training"), 34, UiStyle.ACCENT))
	var fp := UiStyle.button("▶  " + I18n.t("free_play"), 26, true)
	fp.pressed.connect(func():
		GameState.mode_id = "free_play"
		GameState.free_play = true
		get_tree().change_scene_to_file("res://scenes/gameplay/match.tscn"))
	v.add_child(fp)
	v.add_child(UiStyle.label(I18n.t("freeplay_help"), 14, UiStyle.TEXT_DIM))
	for id in ["custom_training", "online_free_play"]:
		var m: GameModeDef = GameModeRegistry.get_mode(id)
		var b := UiStyle.button(m.display_name(I18n.language) + "  · " + I18n.t("coming_soon"), 20)
		b.disabled = true
		v.add_child(b)
	var back := UiStyle.button(I18n.t("back"), 20)
	back.pressed.connect(_show_home)
	v.add_child(back)
	fp.grab_focus()


func _show_modes() -> void:
	var v := _clear()
	v.add_child(UiStyle.label(I18n.t("modes"), 34, UiStyle.ACCENT))
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(720, 520)
	v.add_child(sc)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	sc.add_child(list)
	for m in GameModeRegistry.all():
		var pc := PanelContainer.new()
		pc.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL if m.is_playable() else Color(0.04, 0.05, 0.08, 0.7), 8))
		pc.custom_minimum_size = Vector2(690, 0)
		var h := HBoxContainer.new()
		pc.add_child(h)
		var txt := VBoxContainer.new()
		txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		txt.add_child(UiStyle.label(m.display_name(I18n.language), 20, UiStyle.TEXT if m.is_playable() else UiStyle.DISABLED))
		var d := UiStyle.label(m.description(I18n.language), 14, UiStyle.TEXT_DIM)
		d.autowrap_mode = TextServer.AUTOWRAP_WORD
		txt.add_child(d)
		h.add_child(txt)
		if m.is_playable():
			var b := UiStyle.button(I18n.t("playable"), 15, true)
			var mid: String = m.id
			b.pressed.connect(func():
				if mid == "free_play":
					GameState.mode_id = "free_play"
					get_tree().change_scene_to_file("res://scenes/gameplay/match.tscn")
				else:
					_sel_mode = mid
					_show_play())
			h.add_child(b)
		else:
			h.add_child(UiStyle.label(I18n.t("coming_soon"), 14, Color(1, 0.7, 0.3)))
		list.add_child(pc)
	var back := UiStyle.button(I18n.t("back"), 20)
	back.pressed.connect(_show_home)
	v.add_child(back)
	back.grab_focus()


func _show_profile() -> void:
	var v := _clear()
	v.add_child(UiStyle.label(I18n.t("profile"), 34, UiStyle.ACCENT))
	var p: Dictionary = GameState.profile
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiStyle.panel_box())
	v.add_child(panel)
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 40)
	panel.add_child(g)
	var rows := [
		[I18n.t("level", [GameState.level()]), "%d XP" % int(p["xp"])],
		[I18n.t("matches_played"), str(p["matches"])],
		[I18n.t("wins_label"), str(p["wins"])],
		[I18n.t("total_goals"), str(p["goals"])],
		[I18n.t("assists"), str(p["assists"])],
		[I18n.t("saves"), str(p["saves"])],
		[I18n.t("shots"), str(p["shots"])],
		[I18n.t("demos"), str(p["demos"])],
	]
	for r in rows:
		g.add_child(UiStyle.label(r[0], 20))
		g.add_child(UiStyle.label(r[1], 20, UiStyle.ACCENT))
	v.add_child(UiStyle.label("Perfil local sin conexión (user://profile.cfg).", 14, UiStyle.TEXT_DIM))
	var back := UiStyle.button(I18n.t("back"), 20)
	back.pressed.connect(_show_home)
	v.add_child(back)
	back.grab_focus()


func _show_settings() -> void:
	for ch in _content.get_children():
		ch.queue_free()
	var sp := SettingsPanel.new()
	_content.add_child(sp)
	sp.closed.connect(_show_home)
