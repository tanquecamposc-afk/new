class_name SettingsPanel
extends PanelContainer
## Tabbed settings editor bound directly to the Settings autoload.
## Every control writes through immediately and is persisted.

signal closed

var _tabs: TabContainer


func _ready() -> void:
	add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 12))
	custom_minimum_size = Vector2(760, 560)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	v.add_child(UiStyle.label(I18n.t("settings"), 34, UiStyle.ACCENT))
	_tabs = TabContainer.new()
	_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(_tabs)
	_build_video()
	_build_audio()
	_build_camera()
	_build_game()
	_build_controls()
	var back := UiStyle.button(I18n.t("back"), 20, true)
	back.pressed.connect(func(): closed.emit())
	v.add_child(back)


func _page(title: String) -> VBoxContainer:
	var sc := ScrollContainer.new()
	sc.name = title
	_tabs.add_child(sc)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 12)
	sc.add_child(v)
	return v


func _row(parent: Control, text: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	var l := UiStyle.label(text, 18)
	l.custom_minimum_size.x = 280
	h.add_child(l)
	parent.add_child(h)
	return h


func _slider(parent: Control, text: String, section: String, key: String, lo: float, hi: float, step: float) -> void:
	var h := _row(parent, text)
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = step
	s.custom_minimum_size.x = 300
	s.value = float(Settings.get_value(section, key))
	var val := UiStyle.label("%.2f" % s.value, 16, UiStyle.TEXT_DIM)
	s.value_changed.connect(func(x: float):
		val.text = "%.2f" % x
		Settings.set_value(section, key, x))
	h.add_child(s)
	h.add_child(val)


func _check(parent: Control, text: String, section: String, key: String) -> void:
	var h := _row(parent, text)
	var c := CheckButton.new()
	c.button_pressed = bool(Settings.get_value(section, key))
	c.toggled.connect(func(on: bool): Settings.set_value(section, key, on))
	h.add_child(c)


func _build_video() -> void:
	var p := _page(I18n.t("video"))
	var h := _row(p, I18n.t("preset"))
	var ob := OptionButton.new()
	var presets := ["low", "medium", "high", "ultra"]
	for i in presets.size():
		ob.add_item(I18n.t(presets[i]), i)
	ob.selected = maxi(0, presets.find(str(Settings.get_value("video", "preset"))))
	ob.item_selected.connect(func(i: int): Settings.apply_preset(presets[i]))
	h.add_child(ob)
	_check(p, I18n.t("fullscreen"), "video", "fullscreen")
	_check(p, I18n.t("vsync"), "video", "vsync")
	_slider(p, I18n.t("render_scale"), "video", "render_scale", 0.5, 1.0, 0.05)
	_check(p, "Sombras / Shadows", "video", "shadows")
	_check(p, "Oclusión ambiental (SSAO)", "video", "ssao")
	_check(p, "Resplandor / Bloom", "video", "glow")
	_check(p, "Partículas / Particles", "video", "particles")
	p.add_child(UiStyle.label("* Algunos cambios se aplican en la siguiente partida.", 14, UiStyle.TEXT_DIM))


func _build_audio() -> void:
	var p := _page(I18n.t("audio"))
	_slider(p, I18n.t("master_volume"), "audio", "master", 0.0, 1.0, 0.05)
	_slider(p, I18n.t("sfx_volume"), "audio", "sfx", 0.0, 1.0, 0.05)
	_slider(p, I18n.t("crowd_volume"), "audio", "crowd", 0.0, 1.0, 0.05)


func _build_camera() -> void:
	var p := _page(I18n.t("camera"))
	_slider(p, I18n.t("fov"), "camera", "fov", 70.0, 115.0, 1.0)
	_slider(p, I18n.t("cam_distance"), "camera", "distance", 2.0, 4.5, 0.05)
	_slider(p, I18n.t("cam_height"), "camera", "height", 0.6, 2.0, 0.05)
	_slider(p, "Ángulo / Angle", "camera", "angle", -12.0, 2.0, 0.5)
	_slider(p, I18n.t("cam_stiffness"), "camera", "stiffness", 0.0, 1.0, 0.05)
	_slider(p, "Giro / Swivel", "camera", "swivel_speed", 1.0, 10.0, 0.1)
	_check(p, I18n.t("cam_shake"), "camera", "shake")
	_check(p, I18n.t("ball_cam") + " (inicio)", "camera", "ball_cam_default")


func _build_game() -> void:
	var p := _page(I18n.t("gameplay"))
	var h := _row(p, I18n.t("language"))
	var ob := OptionButton.new()
	ob.add_item("Español", 0)
	ob.add_item("English", 1)
	ob.selected = 0 if I18n.language == "es" else 1
	ob.item_selected.connect(func(i: int): I18n.set_language("es" if i == 0 else "en"))
	h.add_child(ob)
	_check(p, I18n.t("colorblind"), "game", "colorblind")
	_check(p, I18n.t("reduced_motion"), "game", "reduced_motion")
	_check(p, I18n.t("reduced_flashing"), "game", "reduced_flashing")
	_check(p, I18n.t("show_debug"), "game", "show_debug")
	_slider(p, "Zona muerta dirección / Steer deadzone", "game", "steer_deadzone", 0.0, 0.4, 0.01)


func _build_controls() -> void:
	var p := _page(I18n.t("controls"))
	var rows := [
		["Acelerar / Throttle", "W · RT"], ["Frenar-reversa / Brake", "S · LT"],
		["Girar / Steer", "A D · Stick izq."], ["Cabeceo aire / Pitch", "W S · Stick izq."],
		["Saltar / Jump", "Espacio · Clic der. · A"], ["Turbo / Boost", "Shift · Clic izq. · B"],
		["Derrape + giro aéreo / Powerslide + air roll", "Ctrl · X"], ["Giro aéreo dir. / Directional roll", "Q E · LB RB"],
		["Cámara balón / Ball cam", "C · Y"], ["Vista trasera / Rear view", "R · R3"],
		["Marcador / Scoreboard", "Tab · Back"], ["Pausa / Pause", "Esc · Start"],
		["Depuración físicas / Physics debug", "F3"],
	]
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 40)
	for r in rows:
		g.add_child(UiStyle.label(r[0], 17))
		g.add_child(UiStyle.label(r[1], 17, UiStyle.ACCENT))
	p.add_child(g)
	p.add_child(UiStyle.label("Reasignación de controles en el juego: en desarrollo (las acciones ya son remapeables vía InputMap).", 14, UiStyle.TEXT_DIM))
