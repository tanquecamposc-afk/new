class_name Hud
extends CanvasLayer
## In-match HUD: score bar, clock, boost meter, countdown / goal banners,
## event feed, scoreboard (Tab), physics debug overlay (F3), help line.

var score_blue: Label
var score_orange: Label
var clock_label: Label
var boost_meter: BoostMeter
var center_big: Label
var center_small: Label
var feed: VBoxContainer
var help_label: Label
var cam_label: Label
var debug_label: Label
var scoreboard: PanelContainer
var _sb_grid: GridContainer
var _center_timer: float = 0.0
var root: Control
var team_colors: Array[Color] = [Color(0.1, 0.45, 1.0), Color(1.0, 0.45, 0.05)]


func build(colors: Array) -> void:
	if colors.size() == 2:
		team_colors = [colors[0], colors[1]]
	layer = 5
	root = Control.new()
	UiStyle.full_rect(root)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_build_score_bar()
	# Boost meter bottom-right.
	boost_meter = BoostMeter.new()
	boost_meter.anchor_left = 1.0
	boost_meter.anchor_right = 1.0
	boost_meter.anchor_top = 1.0
	boost_meter.anchor_bottom = 1.0
	boost_meter.offset_left = -210
	boost_meter.offset_top = -210
	boost_meter.offset_right = -30
	boost_meter.offset_bottom = -30
	root.add_child(boost_meter)
	# Center banner.
	var center := VBoxContainer.new()
	center.set_anchors_preset(Control.PRESET_CENTER)
	center.anchor_top = 0.3
	center.anchor_bottom = 0.3
	center.offset_left = -500
	center.offset_right = 500
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(center)
	center_big = UiStyle.label("", 96, Color.WHITE, 14)
	center_big.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(center_big)
	center_small = UiStyle.label("", 28, UiStyle.TEXT, 8)
	center_small.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(center_small)
	# Feed top-right.
	feed = VBoxContainer.new()
	feed.anchor_left = 1.0
	feed.anchor_right = 1.0
	feed.offset_left = -460
	feed.offset_right = -24
	feed.offset_top = 24
	feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(feed)
	# Help line bottom-left.
	help_label = UiStyle.label("", 15, UiStyle.TEXT_DIM, 4)
	help_label.anchor_top = 1.0
	help_label.anchor_bottom = 1.0
	help_label.offset_left = 24
	help_label.offset_top = -64
	help_label.offset_right = 1200
	help_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	root.add_child(help_label)
	cam_label = UiStyle.label("", 16, UiStyle.ACCENT, 4)
	cam_label.anchor_top = 1.0
	cam_label.anchor_bottom = 1.0
	cam_label.anchor_left = 1.0
	cam_label.anchor_right = 1.0
	cam_label.offset_left = -205
	cam_label.offset_top = -30
	cam_label.offset_right = -30
	cam_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(cam_label)
	# Debug overlay.
	debug_label = UiStyle.label("", 14, Color(0.7, 1.0, 0.75), 4)
	debug_label.offset_left = 24
	debug_label.offset_top = 110
	debug_label.visible = false
	root.add_child(debug_label)
	_build_scoreboard()


func _build_score_bar() -> void:
	var bar := HBoxContainer.new()
	bar.set_anchors_preset(Control.PRESET_CENTER_TOP)
	bar.offset_left = -230
	bar.offset_right = 230
	bar.offset_top = 16
	bar.add_theme_constant_override("separation", 0)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bar)
	var mk := func(col: Color, w: int) -> PanelContainer:
		var pc := PanelContainer.new()
		pc.custom_minimum_size = Vector2(w, 64)
		pc.add_theme_stylebox_override("panel", UiStyle.panel_box(col, 6))
		return pc
	var pb: PanelContainer = mk.call(Color(team_colors[0], 0.9), 110)
	score_blue = UiStyle.label("0", 44, Color.WHITE, 6)
	score_blue.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pb.add_child(score_blue)
	bar.add_child(pb)
	var pc: PanelContainer = mk.call(Color(0.03, 0.05, 0.1, 0.92), 200)
	clock_label = UiStyle.label("5:00", 40, Color.WHITE, 6)
	clock_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pc.add_child(clock_label)
	bar.add_child(pc)
	var po: PanelContainer = mk.call(Color(team_colors[1], 0.9), 110)
	score_orange = UiStyle.label("0", 44, Color.WHITE, 6)
	score_orange.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	po.add_child(score_orange)
	bar.add_child(po)


func _build_scoreboard() -> void:
	scoreboard = PanelContainer.new()
	scoreboard.set_anchors_preset(Control.PRESET_CENTER)
	scoreboard.offset_left = -480
	scoreboard.offset_right = 480
	scoreboard.offset_top = -260
	scoreboard.offset_bottom = 260
	scoreboard.add_theme_stylebox_override("panel", UiStyle.panel_box(UiStyle.PANEL, 12))
	scoreboard.visible = false
	root.add_child(scoreboard)
	var v := VBoxContainer.new()
	scoreboard.add_child(v)
	v.add_child(UiStyle.label(I18n.t("scoreboard"), 30, UiStyle.ACCENT))
	_sb_grid = GridContainer.new()
	_sb_grid.columns = 8
	_sb_grid.add_theme_constant_override("h_separation", 26)
	_sb_grid.add_theme_constant_override("v_separation", 8)
	v.add_child(_sb_grid)


func update_scoreboard(rules: MatchRules, names: Array[String], player_id: int) -> void:
	for ch in _sb_grid.get_children():
		ch.queue_free()
	var headers := [I18n.t("player"), I18n.t("score"), I18n.t("goals"), I18n.t("assists"), I18n.t("saves"), I18n.t("shots"), I18n.t("demos"), I18n.t("ping")]
	for h in headers:
		_sb_grid.add_child(UiStyle.label(h, 16, UiStyle.TEXT_DIM))
	for team in [0, 1]:
		var ids: Array = []
		for i in rules.world.cars.size():
			if rules.world.cars[i].team == team:
				ids.append(i)
		ids.sort_custom(func(a, b): return rules.stats[a].score > rules.stats[b].score)
		for i in ids:
			var st: MatchRules.PlayerStats = rules.stats[i]
			var col: Color = team_colors[team].lightened(0.35)
			var nm: String = names[i] + ("  ◀" if i == player_id else "")
			for val in [nm, st.score, st.goals, st.assists, st.saves, st.shots, st.demos, "BOT" if i != player_id else "0"]:
				_sb_grid.add_child(UiStyle.label(str(val), 20, col if typeof(val) == TYPE_STRING and val == nm else UiStyle.TEXT))


func set_scores(a: int, b: int, clock: String, overtime: bool) -> void:
	score_blue.text = str(a)
	score_orange.text = str(b)
	clock_label.text = clock
	clock_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.3) if overtime else Color.WHITE)


func show_center(big: String, small: String = "", duration: float = 1.5, color: Color = Color.WHITE) -> void:
	center_big.text = big
	center_small.text = small
	center_big.add_theme_color_override("font_color", color)
	_center_timer = duration
	center_big.scale = Vector2(1.15, 1.15)
	center_big.pivot_offset = center_big.size * 0.5
	var tw := center_big.create_tween()
	tw.tween_property(center_big, "scale", Vector2.ONE, 0.25)


func add_feed(text: String, color: Color = UiStyle.TEXT) -> void:
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", UiStyle.panel_box(Color(0.03, 0.05, 0.1, 0.75), 6))
	var l := UiStyle.label(text, 18, color)
	pc.add_child(l)
	feed.add_child(pc)
	if feed.get_child_count() > 5:
		feed.get_child(0).queue_free()
	var tw := pc.create_tween()
	tw.tween_interval(4.0)
	tw.tween_property(pc, "modulate:a", 0.0, 0.6)
	tw.tween_callback(pc.queue_free)


func tick(dt: float) -> void:
	if _center_timer > 0.0:
		_center_timer -= dt
		if _center_timer <= 0.0:
			center_big.text = ""
			center_small.text = ""


func set_debug(car: CarBody, frame_ms: float, physics_ms: float) -> void:
	if not debug_label.visible:
		return
	var lw: Vector3 = car.basis.transposed() * car.ang_vel
	var lines := PackedStringArray([
		"FÍSICAS / PHYSICS (F3)",
		"pos       %s" % _v(car.pos),
		"vel       %s  |v| %.2f m/s  fwd %.2f" % [_v(car.vel), car.vel.length(), car.vel.dot(car.forward())],
		"accel     %s" % _v(car.dbg_accel),
		"ang_vel   local %s  |w| %.2f" % [_v(lw), car.ang_vel.length()],
		"wheels    contacts %d/4  on_ground %s  normal %s" % [car.wheel_contacts, car.on_ground, _v(car.contact_normal)],
		"suspens.  %.1f m/s² total  dist [%.3f %.3f %.3f %.3f]" % [car.dbg_susp_force, car.wheel_dist[0], car.wheel_dist[1], car.wheel_dist[2], car.wheel_dist[3]],
		"jump      jumped %s  jumping %s  flip avail %s  flipping %s  reset %s" % [car.has_jumped, car.is_jumping, car.has_flip, car.is_flipping, car.flip_reset],
		"boost     %.1f  boosting %s  supersonic %s  slide %s" % [car.boost, car.boosting, car.supersonic, car.powersliding],
		"collision body %s  normal %s" % [car.body_contact, _v(car.dbg_collision_normal)],
		"frame     %.2f ms   physics tick %.3f ms" % [frame_ms, physics_ms],
	])
	debug_label.text = "\n".join(lines)


static func _v(v: Vector3) -> String:
	return "(%6.2f %6.2f %6.2f)" % [v.x, v.y, v.z]
