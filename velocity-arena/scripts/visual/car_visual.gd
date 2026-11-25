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
## Render-only offset used by online play to hide reconciliation corrections.
var visual_offset := Vector3.ZERO

## Body cross-sections: [z, half_width, bottom_y, top_y]. Forward is -Z.
## Body cross-sections: [z, half_width, bottom_y, top_y]. Forward is -Z.
## Wedge nose, long hood, pronounced rear haunches (original "Velocity X" v2).
const BODY_SECTIONS := [
	[-0.765, 0.26, 0.10, 0.15],
	[-0.72, 0.36, 0.065, 0.205],
	[-0.62, 0.42, 0.045, 0.245],
	[-0.46, 0.445, 0.04, 0.275],
	[-0.28, 0.45, 0.04, 0.30],
	[-0.10, 0.445, 0.04, 0.335],
	[0.08, 0.455, 0.04, 0.365],
	[0.24, 0.47, 0.045, 0.38],
	[0.36, 0.46, 0.06, 0.375],
	[0.44, 0.43, 0.085, 0.36],
	[0.475, 0.37, 0.12, 0.33],
]
const CABIN_SECTIONS := [
	[-0.30, 0.25, 0.28, 0.30],
	[-0.20, 0.29, 0.29, 0.40],
	[-0.06, 0.315, 0.31, 0.50],
	[0.08, 0.315, 0.33, 0.535],
	[0.20, 0.30, 0.35, 0.51],
	[0.30, 0.27, 0.36, 0.45],
	[0.37, 0.22, 0.36, 0.38],
]


func setup(p_car: CarBody, color: Color, display_name: String = "", show_name: bool = false, particles: bool = true) -> void:
	car = p_car
	team_color = color
	_particles_enabled = particles
	body_root = Node3D.new()
	add_child(body_root)
	_make_team_materials()
	if ResourceLoader.exists(MODEL_PATH):
		_build_from_model()
	else:
		_build_procedural()
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


const MODEL_PATH := "res://assets/vehicles/velocity_x.glb"
var _led: StandardMaterial3D


func _make_team_materials() -> void:
	_paint = StandardMaterial3D.new()
	_paint.albedo_color = team_color
	_paint.metallic = 0.35
	_paint.metallic_specular = 0.6
	_paint.roughness = 0.3
	_paint.clearcoat_enabled = true
	_paint.clearcoat = 1.0
	_paint.clearcoat_roughness = 0.04
	_paint.rim_enabled = true
	_paint.rim = 0.3
	_led = StandardMaterial3D.new()
	_led.albedo_color = team_color.lightened(0.4)
	_led.emission_enabled = true
	_led.emission = team_color.lightened(0.2)
	_led.emission_energy_multiplier = 4.0


## Blender-built model (tools/blender/build_car.py): "Body" + one "Wheel".
func _build_from_model() -> void:
	var scene: Node = (load(MODEL_PATH) as PackedScene).instantiate()
	var body_mesh: Mesh = null
	var wheel_mesh: Mesh = null
	for n in scene.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi.name.begins_with("Body"):
			body_mesh = mi.mesh
		elif mi.name.begins_with("Wheel"):
			wheel_mesh = mi.mesh
	scene.free()
	var body := MeshInstance3D.new()
	body.mesh = body_mesh
	_retint(body)
	body_root.add_child(body)
	var r: float = car.cfg.wheel_radius if car else 0.2
	for i in 4:
		var w := Node3D.new()
		var anchor: Vector3 = car.cfg.wheel_anchors[i] if car else Vector3.ZERO
		w.position = anchor
		add_child(w)
		var spin := Node3D.new()
		spin.name = "Spin"
		w.add_child(spin)
		var wm := MeshInstance3D.new()
		wm.mesh = wheel_mesh
		wm.scale = Vector3.ONE * (r / 0.2)
		if anchor.x < 0.0:
			wm.rotation.y = PI  # outer face toward -X
		_retint(wm)
		spin.add_child(wm)
		wheels.append(w)


func _retint(mi: MeshInstance3D) -> void:
	if mi.mesh == null:
		return
	for i in mi.mesh.get_surface_count():
		var m: Material = mi.mesh.surface_get_material(i)
		var nm: String = m.resource_name if m else ""
		if nm.begins_with("Paint"):
			mi.set_surface_override_material(i, _paint)
		elif nm.begins_with("LED"):
			mi.set_surface_override_material(i, _led)
		elif nm.begins_with("Glass") and m is BaseMaterial3D:
			var g := (m as BaseMaterial3D).duplicate() as BaseMaterial3D
			g.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			g.metallic = 1.0
			g.roughness = 0.04
			g.albedo_color = Color(0.02, 0.03, 0.06, 0.88)
			mi.set_surface_override_material(i, g)


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
	tire_mat.albedo_color = Color(0.045, 0.045, 0.05)
	tire_mat.roughness = 0.85
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(0.62, 0.64, 0.68)
	rim_mat.metallic = 1.0
	rim_mat.roughness = 0.18
	var accent := StandardMaterial3D.new()
	accent.albedo_color = team_color
	accent.emission_enabled = true
	accent.emission = team_color
	accent.emission_energy_multiplier = 1.6
	var r: float = car.cfg.wheel_radius if car else 0.2
	for i in 4:
		var w := Node3D.new()
		var anchor: Vector3 = car.cfg.wheel_anchors[i] if car else Vector3.ZERO
		w.position = anchor
		add_child(w)
		var spin := Node3D.new()
		spin.name = "Spin"
		w.add_child(spin)
		var side: float = signf(anchor.x) if anchor.x != 0.0 else 1.0
		# Tread + rounded sidewalls.
		var tire := MeshInstance3D.new()
		var tm := CylinderMesh.new()
		tm.top_radius = r
		tm.bottom_radius = r
		tm.height = 0.15
		tm.radial_segments = 28
		tire.mesh = tm
		tire.rotation.z = PI * 0.5
		tire.material_override = tire_mat
		spin.add_child(tire)
		for sx in [-1.0, 1.0]:
			var wall := MeshInstance3D.new()
			var wm := TorusMesh.new()
			wm.inner_radius = r * 0.66
			wm.outer_radius = r * 0.98
			wm.rings = 28
			wm.ring_segments = 8
			wall.mesh = wm
			wall.rotation.z = PI * 0.5
			wall.scale = Vector3(1.0, 0.35, 1.0)
			wall.position.x = sx * 0.07
			wall.material_override = tire_mat
			spin.add_child(wall)
		# Rim barrel + 6 spokes + team-coloured centre cap (outer face only).
		var barrel := MeshInstance3D.new()
		var bm := CylinderMesh.new()
		bm.top_radius = r * 0.66
		bm.bottom_radius = r * 0.66
		bm.height = 0.13
		bm.radial_segments = 24
		barrel.mesh = bm
		barrel.rotation.z = PI * 0.5
		barrel.material_override = dark_rim()
		spin.add_child(barrel)
		for k in 6:
			var spoke := MeshInstance3D.new()
			var sm := BoxMesh.new()
			sm.size = Vector3(0.02, r * 1.22, 0.035)
			spoke.mesh = sm
			spoke.position.x = side * 0.07
			spoke.rotation.x = TAU * float(k) / 6.0
			spoke.material_override = rim_mat
			spin.add_child(spoke)
		var lip := MeshInstance3D.new()
		var lm := TorusMesh.new()
		lm.inner_radius = r * 0.6
		lm.outer_radius = r * 0.68
		lm.rings = 24
		lm.ring_segments = 6
		lip.mesh = lm
		lip.rotation.z = PI * 0.5
		lip.position.x = side * 0.072
		lip.material_override = rim_mat
		spin.add_child(lip)
		var hub := MeshInstance3D.new()
		var hm := CylinderMesh.new()
		hm.top_radius = r * 0.17
		hm.bottom_radius = r * 0.17
		hm.height = 0.02
		hub.mesh = hm
		hub.rotation.z = PI * 0.5
		hub.position.x = side * 0.08
		hub.material_override = accent
		spin.add_child(hub)
		wheels.append(w)


## Half-ring band (wheel arch) around the local X axis, covering the top
## of the wheel from just behind to just ahead of it.
static func _arch_mesh(radius: float, thickness: float, width: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var steps: int = 18
	var a0: float = deg_to_rad(-15.0)
	var a1: float = deg_to_rad(195.0)
	for k in steps:
		var t0: float = lerpf(a0, a1, float(k) / steps)
		var t1: float = lerpf(a0, a1, float(k + 1) / steps)
		var d0 := Vector3(0, sin(t0), cos(t0))
		var d1 := Vector3(0, sin(t1), cos(t1))
		var hw: float = width * 0.5
		var ri: float = radius
		var ro: float = radius + thickness
		var quads: Array = [
			[d0 * ro + Vector3(-hw, 0, 0), d1 * ro + Vector3(-hw, 0, 0), d1 * ro + Vector3(hw, 0, 0), d0 * ro + Vector3(hw, 0, 0)],
			[d0 * ri + Vector3(hw, 0, 0), d1 * ri + Vector3(hw, 0, 0), d1 * ri + Vector3(-hw, 0, 0), d0 * ri + Vector3(-hw, 0, 0)],
			[d0 * ri + Vector3(hw, 0, 0), d0 * ro + Vector3(hw, 0, 0), d1 * ro + Vector3(hw, 0, 0), d1 * ri + Vector3(hw, 0, 0)],
			[d0 * ri + Vector3(-hw, 0, 0), d1 * ri + Vector3(-hw, 0, 0), d1 * ro + Vector3(-hw, 0, 0), d0 * ro + Vector3(-hw, 0, 0)],
		]
		for q in quads:
			for idx in [0, 1, 2, 0, 2, 3]:
				st.add_vertex(q[idx])
	st.generate_normals()
	return st.commit()


func dark_rim() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.08, 0.085, 0.095)
	m.metallic = 0.9
	m.roughness = 0.3
	return m


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
	global_transform = Transform3D(car.basis, car.pos + visual_offset)
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


func _build_procedural() -> void:
	_paint = _paint if _paint else StandardMaterial3D.new()
	_paint.albedo_color = team_color
	_paint.metallic = 0.55
	_paint.metallic_specular = 0.6
	_paint.roughness = 0.25
	_paint.clearcoat_enabled = true
	_paint.clearcoat = 1.0
	_paint.clearcoat_roughness = 0.05
	_paint.rim_enabled = true
	_paint.rim = 0.25
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.035, 0.037, 0.045)
	dark.metallic = 0.6
	dark.roughness = 0.35
	var carbon := StandardMaterial3D.new()
	carbon.albedo_color = Color(0.06, 0.065, 0.075)
	carbon.metallic = 0.3
	carbon.roughness = 0.55
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.03, 0.05, 0.09, 0.9)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass.metallic = 1.0
	glass.roughness = 0.04
	glass.rim_enabled = true
	glass.rim = 0.6
	var led := StandardMaterial3D.new()
	led.albedo_color = team_color.lightened(0.4)
	led.emission_enabled = true
	led.emission = team_color.lightened(0.25)
	led.emission_energy_multiplier = 3.5
	_add_mesh(_loft(BODY_SECTIONS, 20, 2.6), _paint)
	_add_mesh(_loft(CABIN_SECTIONS, 16, 2.2), glass)
	# Wheel arches: curved fender flares over the top of each wheel.
	var arch_mesh: ArrayMesh = _arch_mesh(0.235, 0.05, 0.2)
	for i in 4:
		var anc: Vector3 = car.cfg.wheel_anchors[i] if car else Vector3.ZERO
		var arch := MeshInstance3D.new()
		arch.mesh = arch_mesh
		arch.position = Vector3(anc.x + signf(anc.x) * 0.02, 0.048, anc.z)
		arch.material_override = _paint
		body_root.add_child(arch)
		var lip := MeshInstance3D.new()
		lip.mesh = _arch_mesh(0.255, 0.018, 0.06)
		lip.position = Vector3(anc.x + signf(anc.x) * 0.085, 0.048, anc.z)
		lip.material_override = carbon
		body_root.add_child(lip)
	# Side skirts with team LED, front splitter, rear diffuser with fins.
	for sx in [-1.0, 1.0]:
		_add_box(Vector3(sx * 0.452, 0.075, -0.07), Vector3(0.035, 0.06, 0.62), carbon)
		_add_box(Vector3(sx * 0.452, 0.115, -0.07), Vector3(0.012, 0.012, 0.4), led)
		# Side intake behind the door.
		_add_box(Vector3(sx * 0.452, 0.2, 0.19), Vector3(0.02, 0.07, 0.14), dark)
		# Mirrors.
		_add_box(Vector3(sx * 0.32, 0.335, -0.2), Vector3(0.06, 0.03, 0.045), _paint)
	_add_box(Vector3(0, 0.055, -0.745), Vector3(0.68, 0.025, 0.09), carbon)
	_add_box(Vector3(0, 0.1, 0.465), Vector3(0.62, 0.07, 0.05), carbon)
	for fx in [-0.2, -0.07, 0.07, 0.2]:
		_add_box(Vector3(fx, 0.085, 0.47), Vector3(0.012, 0.06, 0.08), dark)
	# Hood vents and twin racing stripes.
	var stripe := StandardMaterial3D.new()
	stripe.albedo_color = Color(0.95, 0.96, 1.0)
	stripe.metallic = 0.5
	stripe.roughness = 0.25
	for sx in [-0.07, 0.07]:
		var st_box := _add_box(Vector3(sx, 0.287, -0.42), Vector3(0.05, 0.008, 0.5), stripe)
		st_box.rotation.x = deg_to_rad(-6.0)
	for vz in [-0.5, -0.43]:
		_add_box(Vector3(0, 0.272, vz), Vector3(0.22, 0.01, 0.025), dark).rotation.x = deg_to_rad(-6.0)
	# Rear wing on swan-neck supports.
	_add_box(Vector3(0, 0.5, 0.41), Vector3(0.86, 0.03, 0.15), carbon).rotation.x = deg_to_rad(-6.0)
	_add_box(Vector3(0, 0.513, 0.36), Vector3(0.86, 0.006, 0.02), led)
	for sx in [-1.0, 1.0]:
		_add_box(Vector3(sx * 0.22, 0.43, 0.43), Vector3(0.025, 0.13, 0.05), dark)
		_add_box(Vector3(sx * 0.43, 0.5, 0.41), Vector3(0.015, 0.11, 0.2), _paint)
	# Lights: slim LED headlights and full-width tail bar.
	var head := StandardMaterial3D.new()
	head.albedo_color = Color.WHITE
	head.emission_enabled = true
	head.emission = Color(0.85, 0.95, 1.0)
	head.emission_energy_multiplier = 4.0
	var tail := StandardMaterial3D.new()
	tail.albedo_color = Color(1, 0.2, 0.2)
	tail.emission_enabled = true
	tail.emission = Color(1.0, 0.08, 0.1)
	tail.emission_energy_multiplier = 3.0
	for sx in [-1.0, 1.0]:
		var hl := _add_box(Vector3(sx * 0.25, 0.165, -0.735), Vector3(0.17, 0.022, 0.03), head)
		hl.rotation.y = sx * deg_to_rad(10.0)
		_add_box(Vector3(sx * 0.3, 0.135, -0.725), Vector3(0.09, 0.012, 0.02), led)
	_add_box(Vector3(0, 0.28, 0.468), Vector3(0.7, 0.03, 0.015), tail)
	# Twin boost nozzles.
	for sx in [-0.12, 0.12]:
		var nozzle := MeshInstance3D.new()
		var nm := CylinderMesh.new()
		nm.top_radius = 0.055
		nm.bottom_radius = 0.07
		nm.height = 0.09
		nozzle.mesh = nm
		nozzle.rotation.x = PI * 0.5
		nozzle.position = Vector3(sx, 0.19, 0.49)
		nozzle.material_override = dark
		body_root.add_child(nozzle)
		var glow := MeshInstance3D.new()
		var gm := CylinderMesh.new()
		gm.top_radius = 0.04
		gm.bottom_radius = 0.04
		gm.height = 0.01
		glow.mesh = gm
		glow.rotation.x = PI * 0.5
		glow.position = Vector3(sx, 0.19, 0.535)
		glow.material_override = led
		body_root.add_child(glow)
	_build_wheels()
