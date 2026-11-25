extends Node
## Visual check of online play: connects to a server, creates a room with
## bots, captures the lobby, starts the match, captures gameplay.
## godot --path . res://tools/online_shot.tscn -- --address 127.0.0.1 --port 7777 --outdir DIR
var outdir: String
var t: float = 0.0
var stage: int = 0
var menu: Node

var persistent: bool = false

func _ready() -> void:
	if not persistent:
		# Scene instance: show the real menu, and spawn a persistent driver
		# that survives the change to the online match scene.
		menu = load("res://scenes/main/main_menu.tscn").instantiate()
		add_child(menu)
		menu.call_deferred("_show_online")
		var driver = load("res://tools/online_shot.gd").new()
		driver.persistent = true
		driver.name = "OnlineShotDriver"
		get_tree().root.add_child.call_deferred(driver)
		set_process(false)
		return
	outdir = str(Net.cli_args.get("outdir", "user://"))
	Net.connect_to(str(Net.cli_args.get("address", "127.0.0.1")), int(Net.cli_args.get("port", 7777)), "Juan")
	Net.match_started.connect(_on_match)

func _on_match(_cfg: Dictionary) -> void:
	stage = 3

func _process(dt: float) -> void:
	t += dt
	if stage == 0 and Net.is_online():
		Net.create_room({"name": "Sala de prueba", "mode": "soccar_2v2", "bots": true, "minutes": 5.0, "password": "abc"})
		stage = 1
		t = 0.0
	elif stage == 1 and not Net.room.is_empty() and t > 1.5:
		stage = 2
		await _shot("online_lobby.png")
		Net.start_match()
	elif stage == 3:
		stage = 4
		t = 0.0
	elif stage == 4 and t > 2.5:
		stage = 5
		Net.debug_cmd("skip_countdown", [])
	elif stage == 5 and t > 4.0:
		stage = 6
		await _shot("online_match.png")
		get_tree().quit()
	if t > 60.0:
		get_tree().quit(1)

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	img.save_png(outdir.path_join(name))
	print("saved ", name)
