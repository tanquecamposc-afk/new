extends Node
## Persistent player preferences (autoload "Settings").
## Saved to user://settings.cfg. Emits `changed` after any update.

signal changed(section: String, key: String)

const PATH := "user://settings.cfg"

const DEFAULTS := {
	"video": {
		"preset": "high", "fullscreen": false, "vsync": true, "fps_limit": 0,
		"render_scale": 1.0, "msaa": 2, "shadows": true, "ssao": true, "glow": true,
		"particles": true,
	},
	"audio": {"master": 0.8, "music": 0.5, "sfx": 0.8, "crowd": 0.6, "ui": 0.7},
	"camera": {
		"fov": 100.0, "distance": 2.8, "height": 1.05, "angle": -4.0,
		"stiffness": 0.45, "swivel_speed": 5.0, "transition_speed": 1.2,
		"shake": true, "ball_cam_default": true, "invert_y": false,
	},
	"game": {
		"language": "es", "colorblind": false, "ui_scale": 1.0, "reduced_motion": false,
		"reduced_flashing": false, "show_debug": false, "high_contrast": false,
		"steer_deadzone": 0.1, "dodge_deadzone": 0.5, "controller_vibration": true,
	},
}

const PRESETS := {
	"low": {"render_scale": 0.75, "msaa": 0, "shadows": false, "ssao": false, "glow": false, "particles": false},
	"medium": {"render_scale": 1.0, "msaa": 0, "shadows": true, "ssao": false, "glow": true, "particles": true},
	"high": {"render_scale": 1.0, "msaa": 2, "shadows": true, "ssao": true, "glow": true, "particles": true},
	"ultra": {"render_scale": 1.0, "msaa": 4, "shadows": true, "ssao": true, "glow": true, "particles": true},
}

var _cfg := ConfigFile.new()


func _ready() -> void:
	load_settings()
	apply_video()


func load_settings() -> void:
	_cfg = ConfigFile.new()
	_cfg.load(PATH)  # Missing file is fine: defaults are used.


func save_settings() -> void:
	var err: int = _cfg.save(PATH)
	if err != OK:
		push_warning("Settings: could not save (%d)" % err)


func get_value(section: String, key: String) -> Variant:
	var def: Variant = DEFAULTS.get(section, {}).get(key, null)
	return _cfg.get_value(section, key, def)


func set_value(section: String, key: String, value: Variant, save: bool = true) -> void:
	_cfg.set_value(section, key, value)
	if save:
		save_settings()
	if section == "video":
		apply_video()
	changed.emit(section, key)


func apply_preset(preset: String) -> void:
	if not PRESETS.has(preset):
		return
	for k in PRESETS[preset].keys():
		_cfg.set_value("video", k, PRESETS[preset][k])
	_cfg.set_value("video", "preset", preset)
	save_settings()
	apply_video()
	changed.emit("video", "preset")


func apply_video() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var fs: bool = get_value("video", "fullscreen")
	var mode: int = DisplayServer.WINDOW_MODE_FULLSCREEN if fs else DisplayServer.WINDOW_MODE_WINDOWED
	if DisplayServer.window_get_mode() != mode:
		DisplayServer.window_set_mode(mode)
	var vs: bool = get_value("video", "vsync")
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if vs else DisplayServer.VSYNC_DISABLED)
	Engine.max_fps = int(get_value("video", "fps_limit"))
	var vp: Viewport = get_viewport()
	if vp:
		vp.scaling_3d_scale = float(get_value("video", "render_scale"))
		var msaa: int = int(get_value("video", "msaa"))
		vp.msaa_3d = {0: Viewport.MSAA_DISABLED, 2: Viewport.MSAA_2X, 4: Viewport.MSAA_4X, 8: Viewport.MSAA_8X}.get(msaa, Viewport.MSAA_DISABLED)
	_apply_audio()


func _apply_audio() -> void:
	var master_idx: int = AudioServer.get_bus_index("Master")
	if master_idx >= 0:
		AudioServer.set_bus_volume_db(master_idx, linear_to_db(maxf(0.0001, float(get_value("audio", "master")))))


func team_color(team: int) -> Color:
	if bool(get_value("game", "colorblind")):
		return Color(0.15, 0.55, 1.0) if team == 0 else Color(1.0, 0.85, 0.1)
	return Color(0.1, 0.45, 1.0) if team == 0 else Color(1.0, 0.45, 0.05)
