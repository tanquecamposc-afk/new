class_name OnlineMenu
extends VBoxContainer
## Online play UI: connect to a server, create / join rooms (code + password),
## server browser, casual queue, LAN (discovery, manual IP, host), and the
## pre-match lobby. Everything shown comes from the real server; nothing is
## simulated. Features that need backend infrastructure are marked as such.

signal back

const PLAYLISTS := [["casual_1v1", "Casual 1v1"], ["casual_2v2", "Casual 2v2"], ["casual_3v3", "Casual 3v3"], ["casual_4v4", "Caos 4v4"]]

var _status_label: Label
var _body: VBoxContainer
var _view: String = ""
var _room_list: Array = []
var _lan_list: Array = []
var _chat_log: VBoxContainer


func _ready() -> void:
	add_theme_constant_override("separation", 10)
	custom_minimum_size = Vector2(760, 0)
	var head := HBoxContainer.new()
	head.add_child(UiStyle.label("EN LÍNEA", 34, UiStyle.ACCENT))
	_status_label = UiStyle.label("", 16, UiStyle.TEXT_DIM)
	_status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	head.add_child(_status_label)
	add_child(head)
	_body = VBoxContainer.new()
	_body.add_theme_constant_override("separation", 10)
	add_child(_body)
	Net.status_changed.connect(_on_status)
	Net.welcomed.connect(_on_welcomed)
	Net.net_error.connect(_on_error)
	Net.room_list_received.connect(_on_room_list)
	Net.room_state_changed.connect(_on_room_state)
	Net.left_room.connect(_on_left_room)
	Net.queue_status_changed.connect(_on_queue)
	Net.match_started.connect(_on_match_started)
	Net.chat_received.connect(_on_chat)
	Net.lan_servers_found.connect(_on_lan_found)
	if not Net.room.is_empty():
		_show_lobby()
	elif Net.is_online():
		_show_hub()
	else:
		_show_connect()


func _process(_dt: float) -> void:
	var s: String = {"offline": "Sin conexión", "connecting": "Conectando…", "online": "Conectado", "reconnecting": "Reconectando…"}.get(Net.status, Net.status)
	if Net.is_online():
		s += " · %s:%d · ping %d ms · región %s" % [Net.address, Net.port, int(Net.rtt_ms), Net.server_info.get("region", "?")]
	_status_label.text = s


func _clear() -> VBoxContainer:
	for c in _body.get_children():
		c.queue_free()
	return _body


func _panel(parent: Control) -> GridContainer:
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", UiStyle.panel_box())
	parent.add_child(pc)
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 20)
	g.add_theme_constant_override("v_separation", 10)
	pc.add_child(g)
	return g


func _field(g: GridContainer, label: String, ctrl: Control) -> Control:
	g.add_child(UiStyle.label(label, 18))
	ctrl.custom_minimum_size.x = 320
	g.add_child(ctrl)
	return ctrl


func _line(text: String, placeholder: String = "", secret: bool = false) -> LineEdit:
	var le := LineEdit.new()
	le.text = text
	le.placeholder_text = placeholder
	le.secret = secret
	le.max_length = 64
	return le


func _btn(parent: Control, text: String, cb: Callable, primary: bool = false, size: int = 20) -> Button:
	var b := UiStyle.button(text, size, primary)
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _toast(text: String, color: Color = Color(1, 0.6, 0.4)) -> void:
	var l := UiStyle.label(text, 16, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD
	_body.add_child(l)
	_body.move_child(l, 0)
	var tw := l.create_tween()
	tw.tween_interval(5.0)
	tw.tween_callback(l.queue_free)


# ------------------------------------------------------------ connect
func _show_connect() -> void:
	_view = "connect"
	var v := _clear()
	var g := _panel(v)
	var name_le: LineEdit = _field(g, "Nombre", _line(Net.player_name if Net.player_name != "Jugador" else str(GameState.profile["name"]))) as LineEdit
	var addr_le: LineEdit = _field(g, "Servidor (IP o dominio)", _line(str(Net.cli_args.get("address", Net.address)))) as LineEdit
	var port_le: LineEdit = _field(g, "Puerto UDP", _line(str(Net.cli_args.get("port", Net.port)))) as LineEdit
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	v.add_child(h)
	_btn(h, "Conectar", func(): Net.connect_to(addr_le.text, int(port_le.text), name_le.text), true, 22)
	_btn(h, "Hospedar partida LAN", func(): Net.host_lan(int(port_le.text), name_le.text), false, 18)
	_btn(h, "Buscar en LAN", func(): Net.discover_lan(1.5, ["127.0.0.1"]); _toast("Buscando servidores en la red local…", UiStyle.ACCENT), false, 18)
	if not _lan_list.is_empty():
		v.add_child(UiStyle.label("Servidores LAN encontrados:", 18, UiStyle.ACCENT))
		for srv in _lan_list:
			var a: String = str(srv.get("address", "?"))
			var p: int = int(srv.get("port", NetProtocol.DEFAULT_PORT))
			_btn(v, "%s  ·  %s:%d  ·  %d jugadores  ·  v%d" % [srv.get("name", "?"), a, p, int(srv.get("players", 0)), int(srv.get("version", 0))],
				func(): Net.connect_to(a, p, name_le.text), false, 16)
	v.add_child(UiStyle.label("Para jugar con amigos en otra casa hace falta un servidor dedicado accesible por internet (ver SERVER_DEPLOYMENT.md). En la misma red, uno pulsa «Hospedar partida LAN» y los demás «Buscar en LAN» o escriben su IP local.", 14, UiStyle.TEXT_DIM))
	(v.get_child(v.get_child_count() - 1) as Label).autowrap_mode = TextServer.AUTOWRAP_WORD
	_btn(v, I18n.t("back"), func(): back.emit())


# ------------------------------------------------------------ hub
func _show_hub() -> void:
	_view = "hub"
	var v := _clear()
	v.add_child(UiStyle.label("Hola, %s" % Net.player_name, 22))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	v.add_child(grid)
	_btn(grid, "Crear sala privada", _show_create, true, 22)
	_btn(grid, "Unirse con código", _show_join, true, 22)
	_btn(grid, "Navegador de salas", func(): _show_browser(); Net.request_rooms(), false, 20)
	_btn(grid, "Casual (emparejamiento)", _show_casual, false, 20)
	for t in ["Competitivo (requiere cuentas)", "Torneos en línea", "Juego libre en línea", "Amigos y grupos"]:
		var b := UiStyle.button(t + " · " + I18n.t("coming_soon"), 15)
		b.disabled = true
		grid.add_child(b)
	_btn(v, "Desconectar", func(): Net.disconnect_from_server(); Net.stop_local_server(); _show_connect())
	_btn(v, I18n.t("back"), func(): back.emit())


# ------------------------------------------------------------ create / join
func _mode_option(selected: String) -> OptionButton:
	var ob := OptionButton.new()
	var i: int = 0
	for m in GameModeRegistry.playable():
		if m.category == "training":
			continue
		ob.add_item("%s (%dv%d)" % [m.display_name(I18n.language), m.team_size, m.team_size])
		ob.set_item_metadata(i, m.id)
		if m.id == selected:
			ob.selected = i
		i += 1
	return ob


func _show_create() -> void:
	_view = "create"
	var v := _clear()
	v.add_child(UiStyle.label("Crear sala", 26, UiStyle.ACCENT))
	var g := _panel(v)
	var name_le: LineEdit = _field(g, "Nombre de la sala", _line("Sala de " + Net.player_name)) as LineEdit
	var mode_ob: OptionButton = _field(g, "Modo", _mode_option("soccar_1v1")) as OptionButton
	var size_ob := OptionButton.new()
	for n in [1, 2, 3, 4]:
		size_ob.add_item("%dv%d" % [n, n])
	_field(g, "Tamaño de equipo", size_ob)
	mode_ob.item_selected.connect(func(i): size_ob.selected = GameModeRegistry.get_mode(mode_ob.get_item_metadata(i)).team_size - 1)
	size_ob.selected = 0
	var dur_ob := OptionButton.new()
	var durs := [3.0, 5.0, 10.0, 2.0, 0.0]
	for d in durs:
		dur_ob.add_item("Ilimitado" if d == 0.0 else "%d min" % int(d))
	dur_ob.selected = 1
	_field(g, "Duración", dur_ob)
	var light_ob := OptionButton.new()
	for l in ["night", "day", "sunset"]:
		light_ob.add_item(I18n.t(l))
	_field(g, "Ambiente (Velocity Stadium)", light_ob)
	var pw_le: LineEdit = _field(g, "Contraseña (opcional)", _line("", "sin contraseña", true)) as LineEdit
	var bots_cb := CheckBox.new()
	bots_cb.text = "Rellenar huecos con bots"
	_field(g, "Bots", bots_cb)
	var pub_cb := CheckBox.new()
	pub_cb.text = "Visible en el navegador"
	pub_cb.button_pressed = true
	_field(g, "Visibilidad", pub_cb)
	var spec_cb := CheckBox.new()
	spec_cb.text = "Permitir espectadores"
	spec_cb.button_pressed = true
	_field(g, "Espectadores", spec_cb)
	g.add_child(UiStyle.label("Región", 18))
	g.add_child(UiStyle.label("La del servidor conectado: %s" % Net.server_info.get("region", "?"), 16, UiStyle.TEXT_DIM))
	var h := HBoxContainer.new()
	v.add_child(h)
	_btn(h, "Crear", func():
		Net.create_room({"name": name_le.text, "mode": mode_ob.get_item_metadata(mode_ob.selected),
			"team_size": size_ob.selected + 1, "minutes": durs[dur_ob.selected],
			"lighting": ["night", "day", "sunset"][light_ob.selected], "password": pw_le.text,
			"bots": bots_cb.button_pressed, "public": pub_cb.button_pressed, "spectators": spec_cb.button_pressed}), true, 22)
	_btn(h, I18n.t("back"), _show_hub)


func _show_join() -> void:
	_view = "join"
	var v := _clear()
	v.add_child(UiStyle.label("Unirse con código", 26, UiStyle.ACCENT))
	var g := _panel(v)
	var code_le: LineEdit = _field(g, "Código (VA-XXXXXX)", _line("", "VA-")) as LineEdit
	var pw_le: LineEdit = _field(g, "Contraseña", _line("", "si la sala la tiene", true)) as LineEdit
	var spec_cb := CheckBox.new()
	spec_cb.text = "Entrar como espectador"
	_field(g, "", spec_cb)
	var h := HBoxContainer.new()
	v.add_child(h)
	_btn(h, "Unirse", func(): Net.join_room(code_le.text, pw_le.text, spec_cb.button_pressed), true, 22)
	_btn(h, I18n.t("back"), _show_hub)


func _show_browser() -> void:
	_view = "browser"
	var v := _clear()
	v.add_child(UiStyle.label("Navegador de salas", 26, UiStyle.ACCENT))
	var h := HBoxContainer.new()
	v.add_child(h)
	_btn(h, "Actualizar", func(): Net.request_rooms(), false, 18)
	_btn(h, I18n.t("back"), _show_hub, false, 18)
	if _room_list.is_empty():
		v.add_child(UiStyle.label("No hay salas públicas en este servidor ahora mismo.", 17, UiStyle.TEXT_DIM))
	for r in _room_list:
		var code: String = str(r.get("code", ""))
		var mode: GameModeDef = GameModeRegistry.get_mode(str(r.get("mode", "")))
		var txt: String = "%s  ·  %s  ·  %d/%d  ·  %s%s  ·  %s" % [r.get("name", "?"), mode.display_name(I18n.language) if mode else "?",
			int(r.get("players", 0)), int(r.get("capacity", 0)), "en juego" if r.get("state") == "match" else "en lobby",
			"  · con contraseña" if r.get("password", false) else "", code]
		var row := HBoxContainer.new()
		v.add_child(row)
		var needs_pw: bool = r.get("password", false)
		var b := _btn(row, txt, func():
			if needs_pw:
				_show_join()
			else:
				Net.join_room(code, ""), false, 16)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_btn(row, "Ver", func(): Net.join_room(code, "", true), false, 16).tooltip_text = "Entrar como espectador"


func _show_casual() -> void:
	_view = "casual"
	var v := _clear()
	v.add_child(UiStyle.label("Casual", 26, UiStyle.ACCENT))
	var q: Dictionary = Net.queue_status
	if q.get("playlist", "") != "":
		var waited: float = float(q.get("waited", 0.0))
		v.add_child(UiStyle.label("En cola: %s · %d de %d jugadores en este servidor · %d s" % [q["playlist"], int(q.get("in_queue", 0)), int(q.get("needed", 0)), int(waited)], 19))
		v.add_child(UiStyle.label("Si no hay suficientes jugadores reales, tras %d s se completa con bots (marcados como BOT). Solo en casual." % int(q.get("bot_fill_after", 30)), 15, UiStyle.TEXT_DIM))
		_btn(v, "Salir de la cola", func(): Net.queue(str(q["playlist"]), false), true)
	else:
		for p in PLAYLISTS:
			var pl: String = p[0]
			_btn(v, "Buscar partida: " + p[1], func(): Net.queue(pl, true), false, 20)
	_btn(v, I18n.t("back"), func():
		if Net.queue_status.get("playlist", "") != "":
			Net.queue(str(Net.queue_status["playlist"]), false)
		_show_hub())


# ------------------------------------------------------------ lobby
func _show_lobby() -> void:
	_view = "lobby"
	var v := _clear()
	var r: Dictionary = Net.room
	var mode: GameModeDef = GameModeRegistry.get_mode(str(r.get("mode", "")))
	var title := HBoxContainer.new()
	title.add_theme_constant_override("separation", 14)
	v.add_child(title)
	title.add_child(UiStyle.label(str(r.get("name", "Sala")), 26, Color.WHITE))
	title.add_child(UiStyle.label(str(r.get("code", "")), 26, UiStyle.ACCENT))
	_btn(title, "Copiar código", func(): DisplayServer.clipboard_set(str(r.get("code", ""))); _toast("Código copiado", UiStyle.ACCENT), false, 15)
	var info: String = "%s · %dv%d · %s · %s%s%s" % [mode.display_name(I18n.language) if mode else "?", int(r.get("team_size", 1)), int(r.get("team_size", 1)),
		"ilimitado" if float(r.get("minutes", 5)) == 0.0 else "%d min" % int(r.get("minutes", 5)), I18n.t(str(r.get("lighting", "night"))),
		" · bots" if r.get("bots", false) else "", " · con contraseña" if r.get("password", false) else ""]
	v.add_child(UiStyle.label(info + ("   · PARTIDA EN CURSO" if r.get("state") == "match" else ""), 17, UiStyle.TEXT_DIM))
	var teams := HBoxContainer.new()
	teams.add_theme_constant_override("separation", 14)
	v.add_child(teams)
	var names_by_team := {0: [], 1: [], -1: []}
	for p in r.get("players", []):
		names_by_team[int(p.get("team", -1))].append(p)
	for team in [0, 1, -1]:
		var pc := PanelContainer.new()
		var col: Color = Settings.team_color(team) if team >= 0 else Color(0.4, 0.45, 0.55)
		pc.add_theme_stylebox_override("panel", UiStyle.panel_box(Color(col, 0.18), 10, Color(col, 0.7)))
		pc.custom_minimum_size = Vector2(240, 170)
		teams.add_child(pc)
		var tv := VBoxContainer.new()
		pc.add_child(tv)
		tv.add_child(UiStyle.label(["AZUL", "NARANJA", "ESPECTADORES"][[0, 1, -1].find(team)], 18, col.lightened(0.3)))
		for p in names_by_team[team]:
			var mark: String = ("[ANFITRIÓN] " if p.get("host", false) else "") + ("[LISTO] " if p.get("ready", false) else "") + ("[DESCONECTADO] " if not p.get("connected", true) else "")
			tv.add_child(UiStyle.label(mark + str(p.get("name", "?")) + ("  (tú)" if p.get("id", "") == Net.player_id else ""), 17))
		if team >= 0:
			for i in maxi(0, int(r.get("team_size", 1)) - names_by_team[team].size()):
				tv.add_child(UiStyle.label("— " + ("bot" if r.get("bots", false) else "libre") + " —", 15, UiStyle.TEXT_DIM))
		var tt: int = team
		_btn(tv, "Unirse", func(): Net.set_team(tt), false, 14)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	v.add_child(h)
	var me_ready: bool = false
	for p in r.get("players", []):
		if p.get("id", "") == Net.player_id:
			me_ready = p.get("ready", false)
	_btn(h, "No listo" if me_ready else "Listo", func(): Net.set_ready(not me_ready), false, 20)
	if Net.is_host() and r.get("state") == "lobby":
		_btn(h, "▶ Iniciar partida", func(): Net.start_match(), true, 22)
		_btn(h, "Ajustes de sala", _show_room_settings, false, 18)
	_btn(h, "Salir de la sala", func(): Net.leave_room(), false, 18)
	# Chat.
	var chat_panel := PanelContainer.new()
	chat_panel.add_theme_stylebox_override("panel", UiStyle.panel_box())
	chat_panel.custom_minimum_size = Vector2(740, 150)
	v.add_child(chat_panel)
	var cv := VBoxContainer.new()
	chat_panel.add_child(cv)
	_chat_log = VBoxContainer.new()
	_chat_log.custom_minimum_size.y = 90
	cv.add_child(_chat_log)
	var ce := _line("", "Escribe un mensaje y pulsa Intro")
	ce.max_length = 120
	ce.text_submitted.connect(func(t): Net.send_chat(t); ce.text = "")
	cv.add_child(ce)


func _show_room_settings() -> void:
	_view = "room_settings"
	var v := _clear()
	var r: Dictionary = Net.room
	v.add_child(UiStyle.label("Ajustes de sala (anfitrión)", 26, UiStyle.ACCENT))
	var g := _panel(v)
	var mode_ob: OptionButton = _field(g, "Modo", _mode_option(str(r.get("mode", "")))) as OptionButton
	var bots_cb := CheckBox.new()
	bots_cb.button_pressed = r.get("bots", false)
	bots_cb.text = "Rellenar con bots"
	_field(g, "Bots", bots_cb)
	var diff_ob := OptionButton.new()
	for d in range(1, 8):
		diff_ob.add_item(BotController.difficulty_name(d, I18n.language))
	diff_ob.selected = int(r.get("bot_difficulty", 3)) - 1
	_field(g, "Dificultad de bots", diff_ob)
	var dur_ob := OptionButton.new()
	var durs := [3.0, 5.0, 10.0, 2.0, 0.0]
	for d in durs:
		dur_ob.add_item("Ilimitado" if d == 0.0 else "%d min" % int(d))
	dur_ob.selected = maxi(0, durs.find(float(r.get("minutes", 5.0))))
	_field(g, "Duración", dur_ob)
	var pw_le: LineEdit = _field(g, "Nueva contraseña", _line("", "vacío = sin cambios", true)) as LineEdit
	var h := HBoxContainer.new()
	v.add_child(h)
	_btn(h, "Guardar", func():
		var cfg := {"mode": mode_ob.get_item_metadata(mode_ob.selected), "bots": bots_cb.button_pressed,
			"bot_difficulty": diff_ob.selected + 1, "minutes": durs[dur_ob.selected]}
		if pw_le.text != "":
			cfg["password"] = pw_le.text
		Net.update_room(cfg)
		_show_lobby(), true)
	_btn(h, I18n.t("back"), _show_lobby)


# ------------------------------------------------------------ signals
func _on_status(st: String) -> void:
	if st == "offline" and _view != "connect":
		_show_connect()
		_toast("Desconectado del servidor. " + Net.last_error)


func _on_welcomed(info: Dictionary) -> void:
	if not Net.room.is_empty():
		_show_lobby()
	else:
		_show_hub()
		if info.get("reconnected", false):
			_toast("Sesión restaurada", UiStyle.ACCENT)


func _on_error(_code: String, msg: String) -> void:
	_toast(msg)


func _on_room_list(rooms: Array) -> void:
	_room_list = rooms
	if _view == "browser":
		_show_browser()


func _on_room_state(_st: Dictionary) -> void:
	if _view != "room_settings":
		_show_lobby()


func _on_left_room(reason: String) -> void:
	_show_hub()
	if reason not in ["left", "queue"]:
		_toast("Has salido de la sala (%s)" % reason)


func _on_queue(_d: Dictionary) -> void:
	if _view == "casual":
		_show_casual()


func _on_match_started(_cfg: Dictionary) -> void:
	get_tree().change_scene_to_file("res://scenes/gameplay/online_match.tscn")


func _on_chat(msg: Dictionary) -> void:
	if _chat_log == null or not is_instance_valid(_chat_log):
		return
	_chat_log.add_child(UiStyle.label("%s: %s" % [msg.get("from", "?"), msg.get("text", "")], 15))
	while _chat_log.get_child_count() > 5:
		_chat_log.get_child(0).queue_free()


func _on_lan_found(servers: Array) -> void:
	_lan_list = servers
	if _view == "connect":
		_show_connect()
		if servers.is_empty():
			_toast("No se encontraron servidores en la red local.")
