extends SceneTree
func _initialize() -> void:
	var w := SimWorld.new(PhysicsConfig.new())
	var car := w.add_car(0)
	car.set_transform(Vector3(0, 0.4, 0), Basis.IDENTITY)
	for i in 60: w.step(1.0/120.0)
	car.controls.jump = true
	for i in 40:
		w.step(1.0/120.0)
		print("%d y=%.3f vy=%.3f contacts=%d jumping=%s t=%.3f acc=%.2f" % [i, car.pos.y, car.vel.y, car.wheel_contacts, car.is_jumping, car.jump_timer, car.dbg_accel.y])
	quit()
