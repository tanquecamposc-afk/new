class_name Fx
extends Node3D
## One-shot visual effects: goal explosions, demolitions, impact sparks,
## boost pickups. Uses pooled CPU-free GPUParticles3D bursts.

var enabled: bool = true
var reduced_flashing: bool = false


func _burst(pos: Vector3, color: Color, amount: int, speed: float, size: float, lifetime: float, gravity: float = -4.0) -> void:
	if not enabled:
		return
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = lifetime
	p.one_shot = true
	p.explosiveness = 0.95
	p.local_coords = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3.UP
	pm.spread = 180.0
	pm.initial_velocity_min = speed * 0.4
	pm.initial_velocity_max = speed
	pm.gravity = Vector3(0, gravity, 0)
	pm.damping_min = 1.0
	pm.damping_max = 3.0
	pm.scale_min = 0.5
	pm.scale_max = 1.4
	var grad := Gradient.new()
	grad.set_color(0, Color(1, 1, 1, 1))
	grad.add_point(0.25, color)
	grad.set_color(grad.get_point_count() - 1, Color(color.r, color.g, color.b, 0.0))
	var gt := GradientTexture1D.new()
	gt.gradient = grad
	pm.color_ramp = gt
	p.process_material = pm
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.vertex_color_use_as_albedo = true
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_texture = BallVisual._ring_texture(true)
	q.material = m
	p.draw_pass_1 = q
	add_child(p)
	p.global_position = pos
	p.emitting = true
	get_tree().create_timer(lifetime + 0.5).timeout.connect(p.queue_free)


func _flash(pos: Vector3, color: Color, energy: float, radius: float, duration: float) -> void:
	if reduced_flashing:
		energy *= 0.3
	var l := OmniLight3D.new()
	l.light_color = color
	l.light_energy = energy
	l.omni_range = radius
	add_child(l)
	l.global_position = pos
	var tw := create_tween()
	tw.tween_property(l, "light_energy", 0.0, duration)
	tw.tween_callback(l.queue_free)


func goal_explosion(pos: Vector3, color: Color) -> void:
	_burst(pos, color, 220, 26.0, 0.9, 2.2, -6.0)
	_burst(pos, Color(1, 0.95, 0.8), 80, 12.0, 0.5, 1.2, 0.0)
	_flash(pos, color, 16.0, 45.0, 1.6)


func demolition(pos: Vector3, color: Color) -> void:
	_burst(pos, Color(1.0, 0.55, 0.15), 120, 14.0, 0.7, 1.4, -5.0)
	_burst(pos, color, 50, 8.0, 0.5, 1.0, -2.0)
	_flash(pos, Color(1.0, 0.6, 0.2), 10.0, 20.0, 0.8)


func impact(pos: Vector3, strength: float) -> void:
	var n: int = int(clampf(strength * 2.0, 6.0, 50.0))
	_burst(pos, Color(0.6, 0.9, 1.0), n, clampf(strength * 0.6, 3.0, 16.0), 0.25, 0.5, -3.0)


func pickup(pos: Vector3, big: bool) -> void:
	_burst(pos + Vector3.UP * 0.4, Color(1.0, 0.75, 0.2), 30 if big else 10, 5.0 if big else 3.0, 0.3, 0.5, 2.0)
