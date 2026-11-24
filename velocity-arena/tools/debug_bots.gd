extends SceneTree
func _initialize() -> void:
	var mode: GameModeDef = GameModeRegistry.get_mode("soccar_2v2")
	var w := SimWorld.new(mode.build_physics())
	var bots: Array[BotController] = []
	for t in 2:
		for i in 2:
			var c: CarBody = w.add_car(t)
			bots.append(BotController.new(c, w, 5, c.id))
	var m := MatchRules.new(w, mode, 7)
	m.start()
	var names := ["KICK","ATK","AIR","DEF","SUP","REC"]
	for i in 120 * 40:
		for b in bots: b.update(1.0/120.0)
		m.step(1.0/120.0)
		for e in m.events:
			if e["type"] in ["ball_hit","goal"]:
				print("t=%.2f %s %s" % [w.time, e["type"], str(e.get("car", e.get("team")))])
		if i % 60 == 0:
			var s := "t=%.1f ball=(%.0f,%.1f,%.0f) " % [w.time, w.ball.pos.x, w.ball.pos.y, w.ball.pos.z]
			for b in bots:
				s += "| c%d %s %s p=(%.0f,%.1f,%.0f) v=%.0f b=%.0f g=%d " % [b.car.id, names[b.state], b.role, b.car.pos.x, b.car.pos.y, b.car.pos.z, b.car.vel.length(), b.car.boost, b.car.wheel_contacts]
			print(s)
	quit()
