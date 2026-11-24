class_name CarVisual
extends Node3D
## Original "Velocity X" vehicle model, generated procedurally (lofted body,
## glass canopy, spoiler, wheels) so it can be re-painted per team/cosmetic.
## The body is sized to sit just around the physics hitbox.

var car: CarBody
var team_color := Color(0.1, 0.45, 1.0)
var accent_color := Color(0.06, 0.06, 0.08)
var body_root: Node3D
var wheels: Array[Node3D] = []
var _wheel_spin: Array[float] = [0.0, 0.0, 0.0, 0.0]
var boost_particles: GPUParticles3D
var super_particles: GPUParticles3D
var drift_particles: GPUParticles3D
var name_label: Label3D
var _paint: StandardMaterial3D
var _boost_light: OmniLight3D
var _particles_enabled: bool = true

## Body cross-sections: [z, half_width, bottom_y, top_y]. Forward is -Z.
const BODY_SECTIONS := [
	[-0.75, 0.28, 0.10, 0.21],
	[-0.66, 0.38, 0.06, 0.27],
	[-0.45, 0.43, 0.04, 0.33],
	[-0.15, 0.44, 0.04, 0.37],
	[0.15, 0.44, 0.04, 0.39],
	[0.38, 0.43, 0.06, 0.39],
	[0.47, 0.38, 0.10, 0.35],
]
const CABIN_SECTIONS := [
	[-0.28, 0.28, 0.33, 0.36],
	[-0.12, 0.31, 0.35, 0.53],
	[0.08, 0.31, 0.37, 0.56],
	[0.24, 0.29, 0.38, 0.50],
	[0.34, 0.25, 0.38, 0.40],
]


func setup(p_car: CarBody, color: Color, display_name: String = "", show_name: bool = false, particles: bool = true) -> void:
	car = p_car
	team_color = color
	_particles_enabled = particles
	body_root = Node3D.new()
	add_child(body_root)
	_paint = StandardMaterial3D.new()
	_paint.albedo_color = team_color
	_paint.metallic = 0.75
	_paint.roughness = 0.28
	_paint.clearcoat_enabled = true
	_paint.clearcoat = 1.0
	_paint.clearcoat_roughness = 0.08
	var dark := StandardMaterial3D.new()
	dark.albedo_color = accent_color
	dark.metallic = 0.5
	dark.roughness = 0.45
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.04, 0.06, 0.1, 0.85)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass.metallic = 0.9
	glass.roughness = 0.05
	_add_mesh(_loft(BODY_SECTIONS, 14, 1.6), _paint)
	_add_mesh(_loft(CABIN_SECTIONS, 12, 2.2), glass)
	# Side skirts / splitter in carbon.
	for sx in [-1.0, 1.0]:
		_add_box(Vector3(sx * 0.445, 0.09, -0.12), Vector3(0.03, 0.07, 0.9), dark)
	_add_box(Vector3(0, 0.07, -0.74), Vector3(0.6, 0.03, 0.08), dark)
	# Racing stripe.
	var stripe := StandardMaterial3D.new()
	stripe.albedo_color = Color(0.95, 0.96, 1.0)
	stripe.metallic = 0.4
	stripe.roughness = 0.3
	_add_box(Vector3(0, 0.395, 0.0), Vector3(0.12, 0.012, 0.8), stripe).rotation.x = deg_to_rad(-1.0)
	# Spoiler.
	_add_box(Vector3(0, 0.53, 0.42), Vector3(0.84, 0.035, 0.16), dark)
	for sx in [-1.0, 1.0]:
		_add_box(Vector3(sx * 0.3, 0.45, 0.42), Vector3(0.03, 0.14, 0.08), dark)
		_add_box(Vector3(sx * 0.42, 0.53, 0.42), Vector3(0.02, 0.09, 0.2), _paint)
	# Lights.
	var head := StandardMaterial3D.new()
	head.emission_enabled = true
	head.emission = Color(0.85, 0.95, 1.0)
	head.emission_energy_multiplier = 3.0
	var tail := StandardMaterial3D.new()
	tail.emission_enabled = true
	tail.emission = Color(1.0, 0.1, 0.12)
	tail.emission_energy_multiplier = 2.5
	for sx in [-1.0, 1.0]:
		_add_box(Vector3(sx * 0.26, 0.2, -0.735), Vector3(0.16, 0.035, 0.03), head)
		_add_box(Vector3(sx * 0.27, 0.27, 0.47), Vector3(0.14, 0.04, 0.02), tail)
	# Boost nozzle.
	var nozzle := MeshInstance3D.new()
	var nm := CylinderMesh.new()
	nm.top_radius = 0.075
	nm.bottom_radius = 0.09
	nm.height = 0.1
	nozzle.mesh = nm
	nozzle.rotation.x = PI * 0.5
	nozzle.position = Vector3(0, 0.2, 0.5)
	nozzle.material_override = dark
	body_root.add_child(nozzle)
	_build_wheels()
	_build_particles()
	_boost_light = OmniLight3D.new()
	_boost_light.position = Vector3(0, 0.2, 0.8)
	_boost_light.light_color = team_color.lerp(Color(1, 0.8, 0.4), 0.5)
	_boost_light.omni_range = 4.0
	_boost_light.light_energy = 0.0
	add_child(_boost_light)
	if show_name and display_name != "":
		name_label = Label3D.new()
		name_label.text = display_name
		name_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		name_label.font_size = 48
		name_label.pixel_size = 0.004
		name_label.outline_size = 10
		name_label.modulate = team_color.lightened(0.4)
		name_label.no_depth_test = true
		name_label.fixed_size = false
		add_child(name_label)


func set_paint(color: Color) -> void:
	team_color = color
	if _paint:
		_paint.albedo_color = color


func _add_mesh(mesh: Mesh, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	body_root.add_child(mi)
	return mi


func _add_box(p: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.position = p
	mi.material_override = mat
	body_root.add_child(mi)
	return mi


## Lofts superellipse rings through the given sections.
static func _loft(sections: Array, ring: int, exponent: float) -> ArrayMesh:
	var rings: Array = []
	for s in sections:
		var pts: Array[Vector3] = []
		var z: float = s[0]
		var hw: float = s[1]
		var y0: float = s[2]
		var y1: float = s[3]
		var cy: float = (y0 + y1) * 0.5
		var hh: float = (y1 - y0) * 0.5
		for k in ring:
			var a: float = TAU * float(k) / float(ring)
			var ca: float = cos(a)
			var sa: float = sin(a)
			var x: float = signf(ca) * pow(absf(ca), 2.0 / exponent) * hw
			var y: float = signf(sa) * pow(absf(sa), 2.0 / exponent) * hh
			# Flatter underside.
			if y < 0.0:
				y *= 0.85
			pts.append(Vector3(x, cy + y, z))
		rings.append(pts)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for r in rings.size() - 1:
		var a: Array = rings[r]
		var b: Array = rings[r + 1]
		for k in ring:
			var k2: int = (k + 1) % ring
			for v in [a[k], b[k], b[k2], a[k], b[k2], a[k2]]:
				st.add_vertex(v)
	# End caps.
	for cap in [0, rings.size() - 1]:
		var pts: Array = rings[cap]
		var center := Vector3.ZERO
		for p in pts:
			center += p
		center /= float(pts.size())
		for k in ring:
			var k2: int = (k + 1) % ring
			if cap == 0:
				for v in [center, pts[k2], pts[k]]:
					st.add_vertex(v)
			else:
				for v in [center, pts[k], pts[k2]]:
					st.add_vertex(v)
	st.generate_normals()
	return st.commit()


func _build_wheels() -> void:
	var tire_mat := StandardMaterial3D.new()
	tire_mat.albedo_color = Color(0.05, 0.05, 0.06)
	tire_mat.roughness = 0.9
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(0.75, 0.77, 0.8)
	rim_mat.metallic = 1.0
	rim_mat.roughness = 0.25
	var accent := StandardMaterial3D.new()
	accent.albedo_color = team_color
	accent.emission_enabled = true
	accent.emission = team_color
	accent.emission_energy_multiplier = 1.2
	var r: float = car.cfg.wheel_radius if car else 0.2
	for i in 4:
		var w := Node3D.new()
		var anchor: Vector3 = car.cfg.wheel_anchors[i] if car else Vector3.ZERO
		w.position = anchor
		add_child(w)
		var spin := Node3D.new()
		spin.name = "Spin"
		w.add_child(spin)
		var tire := MeshInstance3D.new()
		var tm := CylinderMesh.new()
		tm.top_radius = r
		tm.bottom_radius = r
		tm.height = 0.17
		tm.radial_segments = 20
		tire.mesh = tm
		tire.rotation.z = PI * 0.5
		tire.material_override = tire_mat
		spin.add_child(tire)
		var rim := MeshInstance3D.new()
		var rm := CylinderMesh.new()
		rm.top_radius = r * 0.62
		rm.bottom_radius = r * 0.62
		rm.height = 0.175
		rm.radial_segments = 6
		rim.mesh = rm
		rim.rotation.z = PI * 0.5
		rim.material_override = rim_mat
		spin.add_child(rim)
		var hub := MeshInstance3D.new()
		var hm := CylinderMesh.new()
		hm.top_radius = r * 0.2
		hm.bottom_radius = r * 0.2
		hm.height = 0.18
		hub.mesh = hm
		hub.rotation.z = PI * 0.5
		hub.material_override = accent
		spin.add_child(hub)
		wheels.append(w)


func _make_particle_mat(color_a: Color, color_b: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.vertex_color_use_as_albedo = true
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_color = Color(1, 1, 1)
	return m


func _build_particles() -> void:
	if not _particles_enabled:
		return
	boost_particles = _particles(80, 0.32, Color(1.0, 0.95, 0.75), team_color.lerp(Color(1, 0.5, 0.1), 0.35), 0.22, 7.0)
	boost_particles.position = Vector3(0, 0.2, 0.55)
	add_child(boost_particles)
	super_particles = _particles(40, 0.5, Color(1, 1, 1, 0.6), team_color, 0.08, 2.0)
	super_particles.position = Vector3(0, 0.3, 0.4)
	add_child(super_particles)
	drift_particles = _particles(60, 0.9, Color(0.8, 0.8, 0.85, 0.35), Color(0.6, 0.6, 0.65, 0.0), 0.5, 1.5)
	drift_particles.position = Vector3(0, -0.05, 0.35)
	add_child(drift_particles)


func _particles(amount: int, lifetime: float, c0: Color, c1: Color, size: float, speed: float) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = lifetime
	p.local_coords = false
	p.emitting = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 0, 1)
	pm.spread = 10.0
	pm.initial_velocity_min = speed * 0.7
	pm.initial_velocity_max = speed
	pm.gravity = Vector3.ZERO
	pm.damping_min = 2.0
	pm.damping_max = 4.0
	pm.scale_min = 0.7
	pm.scale_max = 1.2
	var grad := Gradient.new()
	grad.set_color(0, c0)
	grad.set_color(1, Color(c1.r, c1.g, c1.b, 0.0))
	var gt := GradientTexture1D.new()
	gt.gradient = grad
	pm.color_ramp = gt
	var curve := Curve.new()
	curve.add_point(Vector2(0, 0.6))
	curve.add_point(Vector2(0.3, 1.0))
	curve.add_point(Vector2(1, 0.2))
	var ct := CurveTexture.new()
	ct.curve = curve
	pm.scale_curve = ct
	p.process_material = pm
	var qm := QuadMesh.new()
	qm.size = Vector2(size, size)
	qm.material = _make_particle_mat(c0, c1)
	p.draw_pass_1 = qm
	return p


func sync(dt: float) -> void:
	if car == null:
		return
	visible = not car.demolished
	if car.demolished:
		if boost_particles:
			boost_particles.emitting = false
		return
	global_transform = Transform3D(car.basis, car.pos)
	var fwd_speed: float = car.vel.dot(car.forward())
	for i in 4:
		var w: Node3D = wheels[i]
		var anchor: Vector3 = car.cfg.wheel_anchors[i]
		var d: float = car.wheel_dist[i] if car.wheel_hit[i] == 1 else car.cfg.suspension_rest + 0.06
		w.position = anchor + Vector3(0, -d + car.cfg.wheel_radius, 0)
		if i < 2:
			w.rotation.y = -car.controls.steer * 0.45 * clampf(1.0 - absf(fwd_speed) / 30.0, 0.4, 1.0)
		_wheel_spin[i] = wrapf(_wheel_spin[i] - fwd_speed / car.cfg.wheel_radius * dt, -TAU, TAU)
		(w.get_node("Spin") as Node3D).rotation.x = _wheel_spin[i]
	if boost_particles:
		boost_particles.emitting = car.boosting
		super_particles.emitting = car.supersonic
		drift_particles.emitting = car.powersliding and car.on_ground
	_boost_light.light_energy = 2.0 if car.boosting else 0.0
	if name_label:
		name_label.position = car.basis.transposed() * Vector3(0, 1.3, 0)
