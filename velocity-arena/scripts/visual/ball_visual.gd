class_name BallVisual
extends Node3D
## Ball mesh + ground shadow ring (depth cue) + speed trail.

const BALL_SHADER := preload("res://assets/shaders/ball.gdshader")

var ball: BallBody
var mesh_inst: MeshInstance3D
var _mat: ShaderMaterial
var _shadow: MeshInstance3D
var _shadow_mat: StandardMaterial3D
var _trail: GPUParticles3D
var _light: OmniLight3D
## Render-only offset used by online play to hide reconciliation corrections.
var visual_offset := Vector3.ZERO


func setup(p_ball: BallBody, particles: bool = true) -> void:
	ball = p_ball
	mesh_inst = MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = ball.radius
	sm.height = ball.radius * 2.0
	sm.radial_segments = 48
	sm.rings = 24
	mesh_inst.mesh = sm
	_mat = ShaderMaterial.new()
	_mat.shader = BALL_SHADER
	mesh_inst.material_override = _mat
	add_child(mesh_inst)
	_shadow = MeshInstance3D.new()
	var qm := QuadMesh.new()
	qm.size = Vector2(1, 1)
	_shadow.mesh = qm
	_shadow.rotation.x = -PI * 0.5
	_shadow_mat = StandardMaterial3D.new()
	_shadow_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_shadow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_shadow_mat.albedo_texture = _ring_texture()
	_shadow_mat.albedo_color = Color(0.3, 0.9, 1.0, 0.6)
	_shadow.material_override = _shadow_mat
	_shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_shadow)
	_light = OmniLight3D.new()
	_light.light_color = Color(0.4, 0.9, 1.0)
	_light.omni_range = 5.0
	_light.light_energy = 0.4
	add_child(_light)
	if particles:
		_trail = GPUParticles3D.new()
		_trail.amount = 60
		_trail.lifetime = 0.45
		_trail.local_coords = false
		var pm := ParticleProcessMaterial.new()
		pm.gravity = Vector3.ZERO
		pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
		pm.emission_sphere_radius = ball.radius * 0.6
		var grad := Gradient.new()
		grad.set_color(0, Color(0.6, 0.95, 1.0, 0.7))
		grad.set_color(1, Color(0.2, 0.5, 1.0, 0.0))
		var gt := GradientTexture1D.new()
		gt.gradient = grad
		pm.color_ramp = gt
		_trail.process_material = pm
		var q := QuadMesh.new()
		q.size = Vector2(ball.radius * 1.2, ball.radius * 1.2)
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.vertex_color_use_as_albedo = true
		m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		m.albedo_texture = _ring_texture(true)
		q.material = m
		_trail.draw_pass_1 = q
		_trail.emitting = false
		add_child(_trail)


static func _ring_texture(filled: bool = false) -> ImageTexture:
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y in 64:
		for x in 64:
			var d: float = Vector2(x - 31.5, y - 31.5).length() / 32.0
			var a: float
			if filled:
				a = clampf(1.0 - d, 0.0, 1.0)
				a *= a
			else:
				a = clampf(1.0 - absf(d - 0.85) * 10.0, 0.0, 1.0) + clampf(0.6 - d, 0.0, 1.0) * 0.4
			img.set_pixel(x, y, Color(1, 1, 1, a))
	return ImageTexture.create_from_image(img)


## Replay: place the ball directly from recorded data.
func show_at(p: Vector3, q: Quaternion) -> void:
	visible = true
	mesh_inst.global_transform = Transform3D(Basis(q), p)
	_light.global_position = p
	_shadow.global_position = Vector3(p.x, 0.03, p.z)
	if _trail:
		_trail.global_position = p


func sync(_dt: float, arena: ArenaShape, hidden: bool) -> void:
	visible = not hidden
	if hidden:
		return
	var bp: Vector3 = ball.pos + visual_offset
	mesh_inst.global_transform = Transform3D(ball.basis, bp)
	var spd: float = ball.vel.length()
	_mat.set_shader_parameter("speed_glow", clampf((spd - 15.0) / 35.0, 0.0, 1.0))
	_light.global_position = bp
	# Ground indicator under the ball (only on the floor).
	var h: float = ball.pos.y - ball.radius
	_shadow.visible = h > 0.4
	_shadow.global_position = Vector3(bp.x, 0.03, bp.z)
	var s: float = ball.radius * 2.2 * clampf(1.0 + h * 0.03, 1.0, 1.6)
	_shadow.scale = Vector3(s, s, s)
	_shadow_mat.albedo_color.a = clampf(0.75 - h * 0.03, 0.15, 0.75)
	if _trail:
		_trail.global_position = bp
		_trail.emitting = spd > 25.0
