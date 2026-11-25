extends Node
## Captures screenshots of real game scenes (needs a display, e.g. xvfb-run).
## Usage: godot --path . res://tools/screenshot.tscn -- <scene> <out.png> <seconds> [mode] [setup] [lighting]
## (Runs as a scene so autoloads exist, exactly like the real game.)
## setup can be: none | kickoff | wall | aerial | goal

var _scene: Node
var _out: String
var _secs: float
var _setup: String
var _t: float = 0.0
var _shot_done: bool = false
var _applied: bool = false

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var scene_path: String = args[0] if args.size() > 0 else "res://scenes/main/main_menu.tscn"
	_out = args[1] if args.size() > 1 else "user://shot.png"
	_secs = float(args[2]) if args.size() > 2 else 2.0
	var gs: Node = get_node_or_null("/root/GameState")
	if args.size() > 3 and gs:
		gs.mode_id = args[3]
	_setup = args[4] if args.size() > 4 else "none"
	if gs and args.size() > 5:
		gs.lighting = args[5]
	_scene = load(scene_path).instantiate()
	add_child(_scene)
	get_tree().process_frame.connect(_on_frame)

func _on_frame() -> void:
	_t += 1.0 / 60.0
	if _setup != "none" and not _applied and _t > 0.05:
		_applied = true
		_apply_setup()
	if _t >= _secs and not _shot_done:
		_shot_done = true
		await RenderingServer.frame_post_draw
		var img: Image = get_viewport().get_texture().get_image()
		img.save_png(_out)
		print("saved ", _out, " ", img.get_size())
		get_tree().quit()

func _apply_setup() -> void:
	var w: SimWorld = _scene.world
	var c: CarBody = _scene.player_car
	match _setup:
		"wall":
			_scene.rules.phase = MatchRules.Phase.PLAYING
			w.cars_frozen = false
			w.ball_frozen = false
			c.set_transform(Vector3(38.4, 8.0, 0), Basis(Vector3(0,0,1), PI*0.5) * Basis.looking_at(Vector3(0,0,1), Vector3.UP))
			c.vel = Vector3(0, 0, 15)
			w.ball.pos = Vector3(30, 6, 18)
		"aerial":
			_scene.rules.phase = MatchRules.Phase.PLAYING
			w.cars_frozen = false
			w.ball_frozen = false
			c.set_transform(Vector3(0, 6.0, -10), Basis(Vector3.RIGHT, 0.6) * Basis.IDENTITY.rotated(Vector3.UP, PI))
			c.vel = Vector3(0, 4, 14)
			c.boost = 80
			w.ball.pos = Vector3(0, 9.0, 4)
		"goal":
			_scene.rules.phase = MatchRules.Phase.PLAYING
			w.cars_frozen = false
			w.ball_frozen = false
			w.last_touch_car = 0
			w.ball.pos = Vector3(0, 2.0, w.cfg.arena_half_length - 0.5)
			w.ball.vel = Vector3(0, 0, 20)
			c.set_transform(Vector3(0, 0.17, 30), Basis.looking_at(Vector3.BACK, Vector3.UP))
