extends RefCounted
## Physics test suite. Each test_* method builds its own SimWorld.

const DT := 1.0 / 120.0
var runner: Object


func _world(n_cars: int = 1) -> SimWorld:
	var w := SimWorld.new(PhysicsConfig.new())
	for i in n_cars:
		w.add_car(i % 2)
	# Keep the ball out of the way unless a test places it explicitly.
	w.ball.reset(Vector3(35.0, 0.9125, -40.0))
	return w


func _place(car: CarBody, p: Vector3, facing: Vector3 = Vector3.FORWARD) -> void:
	car.set_transform(p, Basis.looking_at(facing.normalized(), Vector3.UP))


func _run(w: SimWorld, seconds: float, per_tick: Callable = Callable()) -> void:
	var ticks: int = int(round(seconds / DT))
	for i in ticks:
		if per_tick.is_valid():
			per_tick.call(i)
		w.step(DT)


# ------------------------------------------------------------------ arena
func test_arena_sdf() -> void:
	var cfg := PhysicsConfig.new()
	var a := ArenaShape.new(cfg)
	runner.check(absf(a.distance(Vector3(0, 1, 0)) - 1.0) < 0.01, "floor distance at centre")
	runner.check(a.distance(Vector3(0, -0.5, 0)) < 0.0, "below floor is solid")
	runner.check(absf(a.distance(Vector3(0, 10, 0)) - 10.0) < 0.05, "mid-height distance")
	runner.check(a.distance(Vector3(cfg.arena_half_width + 1.0, 8, 0)) < 0.0, "outside side wall is solid")
	runner.check(a.distance(Vector3(0, 2, cfg.arena_half_length + 3.0)) > 0.5, "goal interior is free")
	runner.check(a.distance(Vector3(0, 2, cfg.arena_half_length + cfg.goal_depth + 1.0)) < 0.0, "behind goal is solid")
	runner.check(a.distance(Vector3(15, 2, cfg.arena_half_length + 2.0)) < 0.0, "end wall beside goal is solid")
	var n: Vector3 = a.normal(Vector3(0, 0.5, 0))
	runner.check(n.distance_to(Vector3.UP) < 0.01, "floor normal points up")
	var nw: Vector3 = a.normal(Vector3(cfg.arena_half_width - 0.5, 10, 0))
	runner.check(nw.distance_to(Vector3.LEFT) < 0.01, "+x wall normal points -x")
	var hit: float = a.raycast(Vector3(0, 5, 0), Vector3.DOWN, 10.0)
	runner.check(absf(hit - 5.0) < 0.01, "raycast to floor (%.3f)" % hit)
	runner.check(a.goal_side(Vector3(0, 1, cfg.arena_half_length + 1.0), 0.9125) == 1, "goal +z detected")
	runner.check(a.goal_side(Vector3(0, 1, -cfg.arena_half_length - 1.0), 0.9125) == -1, "goal -z detected")
	runner.check(a.goal_side(Vector3(0, 1, cfg.arena_half_length + 0.5), 0.9125) == 0, "ball on the line is not a goal")


# ------------------------------------------------------------------ car
func test_car_rests_on_ground() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.4, 0))
	_run(w, 2.0)
	runner.info("rest height %.3f, speed %.4f, contacts %d" % [car.pos.y, car.vel.length(), car.wheel_contacts])
	runner.check(car.on_ground, "car is grounded")
	runner.check(car.vel.length() < 0.05, "car is at rest")
	runner.check(car.pos.y > 0.1 and car.pos.y < 0.25, "rest height within suspension range")
	runner.check(car.up().dot(Vector3.UP) > 0.999, "car stays upright")


func test_throttle_and_brake() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.17, 30), Vector3.FORWARD)
	car.controls.throttle = 1.0
	_run(w, 1.0)
	var s1: float = car.vel.length()
	_run(w, 3.0)
	var s4: float = car.vel.length()
	runner.info("throttle speed after 1s %.2f, after 4s %.2f m/s" % [s1, s4])
	runner.check(s1 > 9.0 and s1 < 15.0, "1 s throttle reaches 9-15 m/s")
	runner.check(s4 > 13.5 and s4 < 14.3, "throttle-only top speed ~14 m/s")
	car.controls.throttle = -1.0
	var t: float = 0.0
	while car.vel.dot(car.forward()) > 0.1 and t < 3.0:
		w.step(DT)
		t += DT
	runner.info("brake 14->0 in %.2f s" % t)
	runner.check(t < 0.7, "braking stops the car in < 0.7 s")
	_run(w, 1.0)
	runner.check(car.vel.dot(car.forward()) < -3.0, "holding brake reverses")


func test_boost_top_speed_and_consumption() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(-5, 0.17, -45), Vector3.BACK)
	car.boost = 100.0
	car.controls.throttle = 1.0
	car.controls.boost = true
	var t_super: float = -1.0
	var t: float = 0.0
	while t < 2.9:
		w.step(DT)
		t += DT
		if t_super < 0.0 and car.supersonic:
			t_super = t
	runner.info("supersonic after %.2f s, speed %.2f, boost left %.1f" % [t_super, car.vel.length(), car.boost])
	runner.check(t_super > 0.0 and t_super < 2.6, "reaches supersonic with boost")
	runner.check(car.vel.length() <= 23.0001, "speed capped at max")
	runner.check(car.boost < 5.0, "~3 s of boost empties the tank")


func test_steering_turns() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.17, 0), Vector3.FORWARD)
	car.controls.throttle = 1.0
	car.controls.steer = 1.0
	_run(w, 1.0)
	var f: Vector3 = car.forward()
	runner.info("heading after 1 s full right: %s" % str(f))
	runner.check(f.x > 0.3, "steering right turns toward +x")
	var speed_before: float = car.vel.length()
	car.controls.handbrake = true
	_run(w, 0.5)
	runner.check(car.powersliding or car.vel.length() < speed_before, "handbrake powerslides")


func test_jump_heights() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.17, 0))
	_run(w, 0.5)
	var base: float = car.pos.y
	car.controls.jump = true
	var max_y: float = base
	for i in 240:
		w.step(DT)
		max_y = maxf(max_y, car.pos.y)
	var full: float = max_y - base
	car.controls.jump = false
	_run(w, 1.0)
	# Tap jump.
	car.controls.jump = true
	w.step(DT)
	w.step(DT)
	w.step(DT)
	car.controls.jump = false
	max_y = car.pos.y
	for i in 240:
		w.step(DT)
		max_y = maxf(max_y, car.pos.y)
	var tap: float = max_y - base
	_run(w, 1.0)
	# Double jump.
	car.controls.jump = true
	_run(w, 0.25)
	car.controls.jump = false
	w.step(DT)
	car.controls.jump = true
	w.step(DT)
	max_y = car.pos.y
	for i in 300:
		w.step(DT)
		max_y = maxf(max_y, car.pos.y)
	var dbl: float = max_y - base
	runner.info("jump heights: tap %.2f, full %.2f, double %.2f m" % [tap, full, dbl])
	runner.check(full > 2.0 and full < 2.7, "full jump ~2.3 m")
	runner.check(tap < full - 0.6, "tap jump lower than full jump (variable height)")
	runner.check(dbl > full + 1.2, "double jump clearly higher")
	runner.check(car.on_ground or car.pos.y < 0.5, "car lands again")


func test_front_flip_and_cancel() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.17, 30), Vector3.FORWARD)
	_run(w, 0.3)
	car.controls.throttle = 1.0
	_run(w, 0.6)
	var v0: float = car.vel.dot(car.forward())
	car.controls.jump = true
	_run(w, 0.1)
	car.controls.jump = false
	w.step(DT)
	car.controls.pitch = -1.0
	car.controls.jump = true
	w.step(DT)
	car.controls.jump = false
	var v1: float = car.vel.dot(Vector3.FORWARD)
	runner.info("flip: forward speed %.2f -> %.2f" % [v0, v1])
	runner.check(car.is_flipping, "dodge started")
	runner.check(v1 - v0 > 4.0, "front flip adds ~5 m/s")
	runner.check(not car.has_flip, "dodge consumed")
	_run(w, 0.3)
	runner.check(car.ang_vel.length() > 4.0, "car is rotating during flip")
	# Landing: should end upright on the ground after settling.
	car.controls.pitch = 0.0
	_run(w, 2.5)
	runner.check(car.on_ground and car.up().y > 0.95, "front flip lands on wheels")

	# Flip cancel: start a backflip, then push forward -> pitch rotation stops.
	_place(car, Vector3(0, 0.17, 0), Vector3.FORWARD)
	_run(w, 0.3)
	car.controls.jump = true
	_run(w, 0.1)
	car.controls.jump = false
	w.step(DT)
	car.controls.pitch = 1.0
	car.controls.jump = true
	w.step(DT)
	car.controls.jump = false
	_run(w, 0.08)
	car.controls.pitch = -1.0
	w.step(DT)
	runner.check(car.flip_cancelled, "flip cancel detected")


func test_air_control_rates() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 16, 0))
	car.controls.roll = 1.0
	_run(w, 0.5)
	var w_roll: float = (car.basis.transposed() * car.ang_vel).z
	runner.check(absf(w_roll) > 5.0 and car.ang_vel.length() <= 5.5001, "air roll reaches max angular speed")
	car.controls.roll = 0.0
	_run(w, 1.0)
	runner.check(car.ang_vel.length() < 0.2, "angular velocity damps without input")
	car.controls.pitch = 1.0
	_run(w, 0.3)
	runner.check((car.basis.transposed() * car.ang_vel).x > 2.0, "pitch up rotates nose up")


func test_wall_driving() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(20, 0.17, 0), Vector3.RIGHT)
	car.boost = 100.0
	car.controls.throttle = 1.0
	var climbed: bool = false
	var max_y: float = 0.0
	var min_contacts_on_wall: int = 4
	for i in 360:
		car.controls.boost = i < 160
		w.step(DT)
		if car.pos.y > 3.0 and car.up().x < -0.8:
			climbed = true
			min_contacts_on_wall = mini(min_contacts_on_wall, car.wheel_contacts)
		max_y = maxf(max_y, car.pos.y)
	runner.info("wall drive: max height %.2f m, up %s" % [max_y, str(car.up())])
	runner.check(climbed, "car transitions onto the vertical wall")
	runner.check(max_y > 6.0, "car drives up the wall (> 6 m)")
	runner.check(min_contacts_on_wall >= 3, "wheels keep contact while on the wall")


func test_ball_bounce_and_rest() -> void:
	var w := _world(0)
	w.ball.pos = Vector3(0, 10, 0)
	var apexes: Array[float] = []
	var prev_vy: float = 0.0
	for i in 1200:
		w.step(DT)
		if prev_vy > 0.0 and w.ball.vel.y <= 0.0:
			apexes.append(w.ball.pos.y)
		prev_vy = w.ball.vel.y
	runner.info("bounce apexes: %s" % str(apexes.slice(0, 4)))
	runner.check(apexes.size() >= 2, "ball bounces")
	if apexes.size() >= 1:
		runner.check(apexes[0] > 3.6 and apexes[0] < 4.6, "first bounce ~ restitution 0.6")
	_run(w, 10.0)
	runner.check(w.ball.vel.length() < 0.05, "ball comes to rest (no infinite bounce)")
	runner.check(absf(w.ball.pos.y - w.ball.radius) < 0.02, "ball rests on the floor")


func test_ball_no_tunneling_at_max_speed() -> void:
	var w := _world(0)
	var a: ArenaShape = w.arena
	var ok: bool = true
	var dirs: Array[Vector3] = [Vector3(1, 0.1, 0), Vector3(0, 1, 0), Vector3(1, 0, 1), Vector3(0.2, -1, 0.3), Vector3(0.3, 0.1, 1)]
	for d in dirs:
		w.ball.reset(Vector3(0, 8, 0))
		w.ball.vel = d.normalized() * 60.0
		for i in 600:
			w.step(DT)
			if a.distance(w.ball.pos) < w.ball.radius - 0.05:
				ok = false
			if a.goal_side(w.ball.pos, w.ball.radius) != 0:
				break
	runner.check(ok, "ball never penetrates walls at 60 m/s")


func test_car_hits_ball() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	_place(car, Vector3(0, 0.17, 20), Vector3.FORWARD)
	w.ball.reset(Vector3(0, 0.9125, 0))
	car.boost = 100.0
	car.controls.throttle = 1.0
	car.controls.boost = true
	var hit: bool = false
	var car_speed_at_hit: float = 0.0
	for i in 300:
		w.step(DT)
		for e in w.events:
			if e["type"] == "ball_hit":
				hit = true
				car_speed_at_hit = car.vel.length()
		if hit:
			break
	_run(w, 0.05)
	runner.info("car %.1f m/s -> ball %.1f m/s" % [car_speed_at_hit, w.ball.vel.length()])
	runner.check(hit, "ball_hit event emitted")
	runner.check(w.ball.vel.length() > car_speed_at_hit * 1.2, "ball leaves faster than the car")
	runner.check(w.ball.vel.z < -10.0, "ball travels in the car's direction")
	runner.check(w.last_touch_car == 0, "last touch recorded")


func test_demolition_and_respawn() -> void:
	var w := _world(2)
	var a: CarBody = w.cars[0]
	var b: CarBody = w.cars[1]
	_place(a, Vector3(0, 0.17, 30), Vector3.FORWARD)
	_place(b, Vector3(0, 0.17, -5), Vector3.RIGHT)
	w.ball.reset(Vector3(30, 0.9125, 0))
	a.boost = 100.0
	a.controls.throttle = 1.0
	a.controls.boost = true
	var demo: bool = false
	for i in 400:
		w.step(DT)
		for e in w.events:
			if e["type"] == "demolition":
				demo = true
		if demo:
			break
	runner.check(demo and b.demolished, "supersonic hit demolishes opponent")
	_run(w, 3.2)
	runner.check(not b.demolished, "victim respawns after delay")
	runner.check(w.arena.distance(b.pos) > 0.0, "respawn location is inside the arena")


func test_bump_same_team_no_demo() -> void:
	var w := _world(2)
	w.cars[1].team = 0
	var a: CarBody = w.cars[0]
	var b: CarBody = w.cars[1]
	_place(a, Vector3(0, 0.17, 30), Vector3.FORWARD)
	_place(b, Vector3(0, 0.17, -5), Vector3.RIGHT)
	w.ball.reset(Vector3(30, 0.9125, 0))
	a.boost = 100.0
	a.controls.throttle = 1.0
	a.controls.boost = true
	_run(w, 3.0)
	runner.check(not b.demolished, "teammates are bumped, not demolished")
	runner.check(b.vel.length() > 3.0 or b.pos.distance_to(Vector3(0, 0.17, -5)) > 2.0, "bump transfers momentum")


func test_boost_pads() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	car.boost = 0.0
	var big: SimWorld.BoostPad = null
	for p in w.pads:
		if p.big:
			big = p
			break
	_place(car, big.pos + Vector3(0, 0.17, 0))
	w.step(DT)
	runner.check(car.boost == 100.0, "big pad fills boost")
	runner.check(not big.active(), "pad goes on cooldown")
	_run(w, 10.1)
	runner.check(big.active(), "big pad respawns after 10 s")
	var smalls: int = 0
	for p in w.pads:
		if not p.big:
			smalls += 1
	runner.info("pads: %d total, %d small" % [w.pads.size(), smalls])
	runner.check(w.pads.size() - smalls == 6, "six big pads")


func test_flip_reset_on_ball() -> void:
	var w := _world()
	var car: CarBody = w.cars[0]
	# Car upside-down just under a floating ball: wheels touch the ball.
	w.cfg.ball_gravity_scale = 0.0
	w.ball.reset(Vector3(0, 8.0, 0))
	_place(car, Vector3(0, 8.0 - 0.9125 - 0.04, 0))
	car.basis = Basis(Vector3.RIGHT, PI)
	car.has_jumped = true
	car.has_flip = false
	car.airborne_time = 1.0
	car.vel = Vector3(0, 0.0, 0)
	w.step(DT)
	runner.check(car.has_flip and car.flip_reset, "wheels on ball restore the dodge (flip reset)")


func test_stability_soak() -> void:
	var w := _world(8)
	w.setup_kickoff(0)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1234
	var bad: bool = false
	var outside: int = 0
	for i in 120 * 60:
		if i % 30 == 0:
			for c in w.cars:
				c.controls.throttle = rng.randf_range(-0.3, 1.0)
				c.controls.steer = rng.randf_range(-1, 1)
				c.controls.pitch = rng.randf_range(-1, 1)
				c.controls.yaw = rng.randf_range(-1, 1)
				c.controls.roll = rng.randf_range(-1, 1)
				c.controls.jump = rng.randf() < 0.3
				c.controls.boost = rng.randf() < 0.4
				c.controls.handbrake = rng.randf() < 0.1
		w.step(DT)
		if not w.ball.pos.is_finite() or not w.ball.vel.is_finite():
			bad = true
		for c in w.cars:
			if not c.pos.is_finite() or not c.vel.is_finite():
				bad = true
			elif not c.demolished and w.arena.distance(c.pos) < -0.5:
				outside += 1
		if w.arena.goal_side(w.ball.pos, w.ball.radius) != 0:
			w.ball.reset()
	runner.check(not bad, "no NaN/Inf after 60 s of 8-car chaos")
	runner.check(outside == 0, "cars never escape the arena (%d samples outside)" % outside)


func test_snapshot_roundtrip() -> void:
	var a := _world(2)
	var b := _world(2)
	a.setup_kickoff(1)
	for c in a.cars:
		c.controls.throttle = 1.0
	_run(a, 1.0)
	var snap: Dictionary = a.get_snapshot()
	b.apply_snapshot(snap)
	for i in a.cars.size():
		b.cars[i].controls.copy_from(a.cars[i].controls)
		b.cars[i]._prev_jump = a.cars[i]._prev_jump
	_run(a, 0.5)
	_run(b, 0.5)
	var err: float = a.ball.pos.distance_to(b.ball.pos)
	for i in a.cars.size():
		err = maxf(err, a.cars[i].pos.distance_to(b.cars[i].pos))
	runner.info("snapshot divergence after 0.5 s: %.6f m" % err)
	runner.check(err < 0.01, "restored snapshot reproduces the simulation")


func test_performance_budget() -> void:
	var w := _world(8)
	w.setup_kickoff(0)
	for c in w.cars:
		c.controls.throttle = 1.0
	var t0: int = Time.get_ticks_usec()
	_run(w, 2.0)
	var per_tick_ms: float = float(Time.get_ticks_usec() - t0) / 240.0 / 1000.0
	runner.info("8-car physics tick: %.3f ms (budget at 120 Hz: 8.33 ms)" % per_tick_ms)
	runner.check(per_tick_ms < 4.0, "8-car tick under 4 ms")
