extends Node3D
## Close-up turntable renders of the car model (visual QA).
var shots := [[Vector3(2.2, 1.0, -2.2), "car_front34.png"], [Vector3(-2.4, 0.9, 1.9), "car_rear34.png"], [Vector3(3.0, 0.35, 0.0), "car_side.png"]]
var idx: int = 0
var frames: int = 0
var cam: Camera3D
var outdir: String

func _ready() -> void:
	outdir = str(Net.cli_args.get("outdir", "user://"))
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.12, 0.13, 0.16)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.5, 0.55, 0.65)
	e.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, 30, 0)
	sun.shadow_enabled = true
	add_child(sun)
	var floor := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(10, 10)
	floor.mesh = pm
	floor.position.y = -0.152
	add_child(floor)
	var cfg := PhysicsConfig.new()
	var car := CarBody.new(cfg)
	car.wheel_hit = PackedByteArray([1, 1, 1, 1])
	car.wheel_dist = PackedFloat32Array([0.152, 0.152, 0.152, 0.152])
	var cv := CarVisual.new()
	add_child(cv)
	cv.setup(car, Color(0.1, 0.45, 1.0), "", false, false)
	cv.sync(0.016)
	cam = Camera3D.new()
	cam.fov = 40
	add_child(cam)
	cam.current = true

func _process(_dt: float) -> void:
	frames += 1
	if idx >= shots.size():
		get_tree().quit()
		return
	cam.position = shots[idx][0]
	cam.look_at(Vector3(0, 0.15, -0.1), Vector3.UP)
	if frames % 4 == 0:
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(outdir.path_join(shots[idx][1]))
		idx += 1
