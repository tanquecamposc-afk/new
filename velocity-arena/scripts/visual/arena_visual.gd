class_name ArenaVisual
extends Node3D
## Procedurally builds the "Velocity Stadium" from the same ArenaShape the
## physics uses: pitch, curved transparent shell, goals, stands, lights,
## screens and boost pads. Lighting presets: night / day / sunset.

const FIELD_SHADER := preload("res://assets/shaders/field.gdshader")
const WALL_SHADER := preload("res://assets/shaders/arena_wall.gdshader")
const NET_SHADER := preload("res://assets/shaders/goal_net.gdshader")
const CROWD_SHADER := preload("res://assets/shaders/crowd.gdshader")
const PAD_SHADER := preload("res://assets/shaders/boost_pad.gdshader")
const SKY_SHADER := preload("res://assets/shaders/sky.gdshader")

var shape: ArenaShape
var lighting: String = "night"
var crowd_materials: Array[ShaderMaterial] = []
var pad_nodes: Array[Node3D] = []
var _pad_mats: Array[ShaderMaterial] = []
var _pad_orbs: Array[MeshInstance3D] = []
var env: Environment
var _team_colors: Array[Color] = [Color(0.1, 0.45, 1.0), Color(1.0, 0.45, 0.05)]
var goal_lights: Array[OmniLight3D] = []


func build(p_shape: ArenaShape, pads: Array, p_lighting: String = "night", team_colors: Array = []) -> void:
	shape = p_shape
	lighting = p_lighting
	if team_colors.size() == 2:
		_team_colors = [team_colors[0], team_colors[1]]
	_build_environment()
	_build_floor()
	_build_shell()
	_build_structure()
	_build_goals()
	_build_stands()
	_build_lights()
	_build_pads(pads)


# --------------------------------------------------------------- geometry
## Points/normals around the "core" rounded rectangle (inset by edge radius).
func _core_perimeter(segments_per_corner: int = 10) -> Array:
	var hx: float = shape.half_width - shape.edge_radius
	var hz: float = shape.half_length - shape.edge_radius
	var r: float = shape.corner_radius - shape.edge_radius
	var pts: Array[Vector3] = []
	var nrm: Array[Vector3] = []
	var corners := [Vector2(hx - r, hz - r), Vector2(-(hx - r), hz - r), Vector2(-(hx - r), -(hz - r)), Vector2(hx - r, -(hz - r))]
	var start_angles := [0.0, PI * 0.5, PI, PI * 1.5]
	# Long straight edges get extra subdivisions so the goal cut-out lines up.
	for ci in 4:
		var c: Vector2 = corners[ci]
		for s in segments_per_corner + 1:
			var a: float = start_angles[ci] + (PI * 0.5) * float(s) / float(segments_per_corner)
			var n := Vector2(cos(a), sin(a))
			pts.append(Vector3(c.x + n.x * r, 0.0, c.y + n.y * r))
			nrm.append(Vector3(n.x, 0.0, n.y))
		# Straight segment toward the next corner.
		var nc: Vector2 = corners[(ci + 1) % 4]
		var a_end: float = start_angles[ci] + PI * 0.5
		var n_end := Vector2(cos(a_end), sin(a_end))
		var p0 := Vector2(c.x + n_end.x * r, c.y + n_end.y * r)
		var p1 := Vector2(nc.x + n_end.x * r, nc.y + n_end.y * r)
		var subdiv: int = int(p0.distance_to(p1) / 2.0)
		for k in range(1, subdiv):
			var q: Vector2 = p0.lerp(p1, float(k) / float(subdiv))
			pts.append(Vector3(q.x, 0.0, q.y))
			nrm.append(Vector3(n_end.x, 0.0, n_end.y))
	return [pts, nrm]


func _build_floor() -> void:
	var per: Array = _core_perimeter()
	var pts: Array[Vector3] = per[0]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_normal(Vector3.UP)
	for i in pts.size():
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[(i + 1) % pts.size()]
		st.add_vertex(Vector3.ZERO)
		st.add_vertex(a)
		st.add_vertex(b)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var mat := ShaderMaterial.new()
	mat.shader = FIELD_SHADER
	mat.set_shader_parameter("half_length", shape.half_length)
	mat.set_shader_parameter("half_width", shape.half_width)
	mat.set_shader_parameter("goal_half_width", shape.goal_half_width)
	mat.set_shader_parameter("blue_tint", _team_colors[0])
	mat.set_shader_parameter("orange_tint", _team_colors[1])
	mi.material_override = mat
	mi.name = "Pitch"
	add_child(mi)


func _build_shell() -> void:
	var per: Array = _core_perimeter()
	var pts: Array[Vector3] = per[0]
	var nrm: Array[Vector3] = per[1]
	var re: float = shape.edge_radius
	var h: float = shape.height
	# Profile: floor arc -> vertical wall -> ceiling arc. (offset_out, y, normal_out, normal_y)
	var prof: Array = []
	var arc_steps: int = 8
	for k in arc_steps + 1:
		var a: float = -PI * 0.5 + (PI * 0.5) * float(k) / float(arc_steps)
		prof.append([re * cos(a), re + re * sin(a), cos(a), sin(a)])
	for k in range(1, 6):
		var y: float = lerpf(re, h - re, float(k) / 5.0)
		prof.append([re, y, 1.0, 0.0])
	for k in arc_steps + 1:
		var a: float = (PI * 0.5) * float(k) / float(arc_steps)
		prof.append([re * cos(a), h - re + re * sin(a), cos(a), sin(a)])
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n_pts: int = pts.size()
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		for j in prof.size() - 1:
			var quad: Array[Vector3] = []
			var quad_n: Array[Vector3] = []
			for pair in [[i, j], [i2, j], [i2, j + 1], [i, j + 1]]:
				var pi_: int = pair[0]
				var pr: Array = prof[pair[1]]
				var base: Vector3 = pts[pi_]
				var n_out: Vector3 = nrm[pi_]
				quad.append(base + n_out * float(pr[0]) + Vector3.UP * float(pr[1]))
				quad_n.append(-(n_out * float(pr[2]) + Vector3.UP * float(pr[3])))
			for idx in [0, 2, 1, 0, 3, 2]:
				st.set_normal(quad_n[idx])
				st.add_vertex(quad[idx])
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = _wall_material(false)
	mi.name = "Shell"
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	# Ceiling plate.
	var st2 := SurfaceTool.new()
	st2.begin(Mesh.PRIMITIVE_TRIANGLES)
	st2.set_normal(Vector3.DOWN)
	for i in n_pts:
		var a: Vector3 = pts[i] + Vector3.UP * h
		var b: Vector3 = pts[(i + 1) % n_pts] + Vector3.UP * h
		st2.add_vertex(Vector3.UP * h)
		st2.add_vertex(a)
		st2.add_vertex(b)
	var ceil_mi := MeshInstance3D.new()
	ceil_mi.mesh = st2.commit()
	ceil_mi.material_override = _wall_material(true)
	ceil_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ceil_mi.name = "Ceiling"
	add_child(ceil_mi)


func _wall_material(ceiling: bool) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = WALL_SHADER
	mat.set_shader_parameter("half_length", shape.half_length)
	mat.set_shader_parameter("edge_radius", shape.edge_radius)
	mat.set_shader_parameter("goal_half_width", shape.goal_half_width)
	mat.set_shader_parameter("goal_height", shape.goal_height)
	mat.set_shader_parameter("blue_tint", _team_colors[0])
	mat.set_shader_parameter("orange_tint", _team_colors[1])
	mat.set_shader_parameter("is_ceiling", 1.0 if ceiling else 0.0)
	if ceiling:
		mat.set_shader_parameter("alpha_base", 0.04)
		mat.set_shader_parameter("grid_glow", 0.15)
	return mat


func _build_goals() -> void:
	var gw: float = shape.goal_half_width
	var gh: float = shape.goal_height
	var gd: float = shape.goal_depth
	var L: float = shape.half_length
	var re: float = shape.edge_radius
	for side in [-1.0, 1.0]:
		var team: int = 0 if side < 0.0 else 1  # goal defended by this team
		var col: Color = _team_colors[team]
		var root := Node3D.new()
		root.name = "Goal_%s" % ("blue" if team == 0 else "orange")
		add_child(root)
		# Flat goal floor covering the cut-out ramp.
		var floor_mi := MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(gw * 2.0, gd + re)
		floor_mi.mesh = pm
		floor_mi.position = Vector3(0.0, 0.003, side * (L - re + (gd + re) * 0.5))
		var fm := StandardMaterial3D.new()
		fm.albedo_color = Color(0.06, 0.07, 0.09)
		fm.roughness = 0.8
		floor_mi.material_override = fm
		root.add_child(floor_mi)
		# Net: back, sides and roof.
		var net_mat := ShaderMaterial.new()
		net_mat.shader = NET_SHADER
		net_mat.set_shader_parameter("team_color", col)
		var faces: Array = [
			[Vector3(0, gh * 0.5, side * (L + gd)), Vector2(gw * 2.0, gh), Vector3(0, 0, 0)],
			[Vector3(gw, gh * 0.5, side * (L + gd * 0.5)), Vector2(gd, gh), Vector3(0, PI * 0.5, 0)],
			[Vector3(-gw, gh * 0.5, side * (L + gd * 0.5)), Vector2(gd, gh), Vector3(0, PI * 0.5, 0)],
			[Vector3(0, gh, side * (L + gd * 0.5)), Vector2(gw * 2.0, gd), Vector3(PI * 0.5, 0, 0)],
		]
		for f in faces:
			var q := MeshInstance3D.new()
			var qm := QuadMesh.new()
			qm.size = f[1]
			q.mesh = qm
			q.position = f[0]
			q.rotation = f[2]
			q.material_override = net_mat
			q.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			root.add_child(q)
		# Side fills between the goal floor and the curved ramp beside it.
		for sx in [-1.0, 1.0]:
			var st := SurfaceTool.new()
			st.begin(Mesh.PRIMITIVE_TRIANGLES)
			st.set_normal(Vector3(-sx, 0, 0))
			var steps: int = 10
			for k in steps:
				var z0: float = L - re + re * float(k) / float(steps)
				var z1: float = L - re + re * float(k + 1) / float(steps)
				var y0: float = re - sqrt(maxf(0.0, re * re - pow(z0 - (L - re), 2.0)))
				var y1: float = re - sqrt(maxf(0.0, re * re - pow(z1 - (L - re), 2.0)))
				var a := Vector3(sx * gw, 0, side * z0)
				var b := Vector3(sx * gw, 0, side * z1)
				var c := Vector3(sx * gw, y1, side * z1)
				var d := Vector3(sx * gw, y0, side * z0)
				for v in [a, b, c, a, c, d]:
					st.add_vertex(v)
			var fill := MeshInstance3D.new()
			fill.mesh = st.commit()
			var fill_mat := StandardMaterial3D.new()
			fill_mat.albedo_color = Color(0.12, 0.13, 0.16)
			fill_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
			fill.material_override = fill_mat
			root.add_child(fill)
		# Glowing frame: posts + crossbar.
		var frame_mat := StandardMaterial3D.new()
		frame_mat.albedo_color = col
		frame_mat.emission_enabled = true
		frame_mat.emission = col
		frame_mat.emission_energy_multiplier = 2.5
		var parts: Array = [
			[Vector3(gw + 0.15, gh * 0.5, side * L), Vector3(0.3, gh, 0.3)],
			[Vector3(-gw - 0.15, gh * 0.5, side * L), Vector3(0.3, gh, 0.3)],
			[Vector3(0, gh + 0.15, side * L), Vector3(gw * 2.0 + 0.6, 0.3, 0.3)],
		]
		for part in parts:
			var b := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = part[1]
			b.mesh = bm
			b.position = part[0]
			b.material_override = frame_mat
			root.add_child(b)
		var gl := OmniLight3D.new()
		gl.light_color = col
		gl.light_energy = 1.5
		gl.omni_range = 18.0
		gl.position = Vector3(0, gh * 0.6, side * (L + 2.0))
		gl.shadow_enabled = false
		root.add_child(gl)
		goal_lights.append(gl)


func _build_stands() -> void:
	var hw: float = shape.half_width
	var hl: float = shape.half_length
	var seat_mat_list: Array[ShaderMaterial] = []
	var base_mat := StandardMaterial3D.new()
	base_mat.albedo_color = Color(0.09, 0.1, 0.13)
	base_mat.metallic = 0.4
	base_mat.roughness = 0.5
	# Long sides and ends: stepped tiers of seats.
	var blocks: Array = [
		[Vector3(hw + 4.0, 0, 0), hl * 1.6, 0.0],
		[Vector3(-hw - 4.0, 0, 0), hl * 1.6, PI],
		[Vector3(0, 0, hl + 13.0), hw * 1.5, -PI * 0.5],
		[Vector3(0, 0, -hl - 13.0), hw * 1.5, PI * 0.5],
	]
	for blk in blocks:
		var root := Node3D.new()
		root.position = blk[0]
		root.rotation.y = blk[2]
		add_child(root)
		var length: float = blk[1]
		var tiers: int = 9
		var cm := ShaderMaterial.new()
		cm.shader = CROWD_SHADER
		cm.set_shader_parameter("blue_tint", _team_colors[0])
		cm.set_shader_parameter("orange_tint", _team_colors[1])
		crowd_materials.append(cm)
		for t in tiers:
			var tier := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = Vector3(2.2, 1.0 + t * 1.6, length)
			tier.mesh = bm
			tier.position = Vector3(1.2 + t * 2.2, (1.0 + t * 1.6) * 0.5 + 2.0, 0)
			tier.material_override = cm
			tier.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			root.add_child(tier)
		# Roof canopy and support columns.
		var roof := MeshInstance3D.new()
		var rm := BoxMesh.new()
		rm.size = Vector3(24.0, 0.6, length + 6.0)
		roof.mesh = rm
		roof.position = Vector3(10.0, 22.5 + tiers * 0.2, 0)
		roof.rotation.z = deg_to_rad(-8.0)
		roof.material_override = base_mat
		root.add_child(roof)
		# Light strip under the roof edge.
		var strip := MeshInstance3D.new()
		var sm := BoxMesh.new()
		sm.size = Vector3(0.4, 0.25, length + 6.0)
		strip.mesh = sm
		strip.position = Vector3(-1.5, 23.6, 0)
		var strip_mat := StandardMaterial3D.new()
		strip_mat.emission_enabled = true
		strip_mat.emission = Color(0.85, 0.92, 1.0)
		strip_mat.emission_energy_multiplier = 4.0
		strip_mat.albedo_color = Color.WHITE
		strip.material_override = strip_mat
		root.add_child(strip)
		# Base wall below the seats.
		var base := MeshInstance3D.new()
		var bbm := BoxMesh.new()
		bbm.size = Vector3(22.0, 2.0, length)
		base.mesh = bbm
		base.position = Vector3(10.0, 1.0, 0)
		base.material_override = base_mat
		root.add_child(base)
	# Giant screens above each end.
	for side in [-1.0, 1.0]:
		var screen := MeshInstance3D.new()
		var qm := QuadMesh.new()
		qm.size = Vector2(26.0, 9.0)
		screen.mesh = qm
		screen.position = Vector3(0, 30.0, side * (hl + 24.0))
		screen.rotation.y = 0.0 if side < 0.0 else PI
		var sc_mat := StandardMaterial3D.new()
		sc_mat.albedo_color = Color(0.02, 0.03, 0.05)
		sc_mat.emission_enabled = true
		var tc: Color = _team_colors[0].lerp(_team_colors[1], 0.5)
		sc_mat.emission = tc * 0.35
		sc_mat.emission_energy_multiplier = 1.5
		screen.material_override = sc_mat
		screen.name = "Screen"
		add_child(screen)
	# Outer ground plane.
	var ground := MeshInstance3D.new()
	var gm := PlaneMesh.new()
	gm.size = Vector2(400, 400)
	ground.mesh = gm
	ground.position = Vector3(0, -0.05, 0)
	var g_mat := StandardMaterial3D.new()
	g_mat.albedo_color = Color(0.05, 0.06, 0.08)
	g_mat.roughness = 0.95
	ground.material_override = g_mat
	add_child(ground)


func _build_lights() -> void:
	var sun := DirectionalLight3D.new()
	sun.shadow_enabled = bool(_setting("video", "shadows", true))
	sun.directional_shadow_max_distance = 120.0
	match lighting:
		"day":
			sun.rotation_degrees = Vector3(-55, 35, 0)
			sun.light_energy = 1.3
			sun.light_color = Color(1.0, 0.97, 0.92)
		"sunset":
			sun.rotation_degrees = Vector3(-14, 70, 0)
			sun.light_energy = 1.1
			sun.light_color = Color(1.0, 0.62, 0.38)
		_:
			sun.rotation_degrees = Vector3(-70, 20, 0)
			sun.light_energy = 0.55
			sun.light_color = Color(0.75, 0.82, 1.0)
	add_child(sun)
	# Corner light towers.
	var tower_mat := StandardMaterial3D.new()
	tower_mat.albedo_color = Color(0.15, 0.16, 0.2)
	tower_mat.metallic = 0.6
	var lamp_mat := StandardMaterial3D.new()
	lamp_mat.emission_enabled = true
	lamp_mat.emission = Color(0.95, 0.97, 1.0)
	lamp_mat.emission_energy_multiplier = 8.0
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			var base := Vector3(sx * (shape.half_width + 30.0), 0, sz * (shape.half_length + 30.0))
			var pole := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.6
			cm.bottom_radius = 1.0
			cm.height = 42.0
			pole.mesh = cm
			pole.position = base + Vector3(0, 21.0, 0)
			pole.material_override = tower_mat
			add_child(pole)
			var lamp := MeshInstance3D.new()
			var lm := BoxMesh.new()
			lm.size = Vector3(7.0, 4.0, 0.8)
			lamp.mesh = lm
			lamp.position = base + Vector3(0, 43.0, 0)
			lamp.look_at_from_position(lamp.position, Vector3(0, 0, 0), Vector3.UP)
			lamp.material_override = lamp_mat
			add_child(lamp)
			if lighting != "day":
				var spot := SpotLight3D.new()
				spot.position = lamp.position
				spot.look_at_from_position(lamp.position, Vector3(sx * -8.0, 0, sz * -10.0), Vector3.UP)
				spot.spot_range = 140.0
				spot.spot_angle = 38.0
				spot.light_energy = 9.0 if lighting == "night" else 4.0
				spot.spot_attenuation = 0.6
				spot.shadow_enabled = false
				add_child(spot)


## Structural ribs along the shell and an LED ring where wall meets ceiling.
func _build_structure() -> void:
	var per: Array = _core_perimeter()
	var pts: Array[Vector3] = per[0]
	var nrm: Array[Vector3] = per[1]
	var re: float = shape.edge_radius
	var h: float = shape.height
	var rib_mat := StandardMaterial3D.new()
	rib_mat.albedo_color = Color(0.55, 0.6, 0.7)
	rib_mat.metallic = 0.9
	rib_mat.roughness = 0.25
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var step_len: float = 0.0
	var acc: float = 0.0
	for i in pts.size():
		if i > 0:
			acc += pts[i].distance_to(pts[i - 1])
		if acc < 9.0:
			continue
		acc = 0.0
		var base: Vector3 = pts[i]
		var n_out: Vector3 = nrm[i]
		var tangent: Vector3 = n_out.cross(Vector3.UP).normalized()
		# Skip ribs crossing the goal mouths.
		if absf(base.z) > shape.half_length - re - 0.5 and absf(base.x) < shape.goal_half_width + 1.0:
			continue
		var prof: Array = []
		for k in 7:
			var a: float = -PI * 0.5 + (PI * 0.5) * float(k) / 6.0
			prof.append(base + n_out * (re * cos(a) + 0.12) + Vector3.UP * (re + re * sin(a)))
		prof.append(base + n_out * (re + 0.12) + Vector3.UP * (h - re))
		for k in 7:
			var a2: float = (PI * 0.5) * float(k) / 6.0
			prof.append(base + n_out * (re * cos(a2) + 0.12) + Vector3.UP * (h - re + re * sin(a2)))
		for k in prof.size() - 1:
			var p0: Vector3 = prof[k]
			var p1: Vector3 = prof[k + 1]
			var w: Vector3 = tangent * 0.18
			var o: Vector3 = n_out * 0.25
			for quad in [[p0 - w, p1 - w, p1 + w, p0 + w], [p0 - w, p0 - w + o, p1 - w + o, p1 - w], [p0 + w, p1 + w, p1 + w + o, p0 + w + o]]:
				for idx in [0, 1, 2, 0, 2, 3]:
					st.add_vertex(quad[idx])
	st.generate_normals()
	var ribs := MeshInstance3D.new()
	ribs.mesh = st.commit()
	rib_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	ribs.material_override = rib_mat
	ribs.name = "Ribs"
	add_child(ribs)
	# LED ring.
	var ring_st := SurfaceTool.new()
	ring_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ring_y: float = h - re
	for i in pts.size():
		var a_p: Vector3 = pts[i] + nrm[i] * (re - 0.05)
		var b_p: Vector3 = pts[(i + 1) % pts.size()] + nrm[(i + 1) % pts.size()] * (re - 0.05)
		var lo := Vector3.UP * (ring_y - 0.35)
		var hi := Vector3.UP * (ring_y + 0.35)
		for v in [a_p + lo, b_p + lo, b_p + hi, a_p + lo, b_p + hi, a_p + hi]:
			ring_st.set_color(_team_colors[0].lerp(_team_colors[1], clampf(v.z / (shape.half_length * 2.0) + 0.5, 0.0, 1.0)))
			ring_st.add_vertex(v)
	var ring := MeshInstance3D.new()
	ring.mesh = ring_st.commit()
	var ring_mat := StandardMaterial3D.new()
	ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring_mat.vertex_color_use_as_albedo = true
	ring_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	ring_mat.emission_enabled = true
	ring_mat.emission_energy_multiplier = 2.0
	ring.material_override = ring_mat
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ring.name = "LedRing"
	add_child(ring)
	# Soft fill lights above the pitch so cars and ball read clearly.
	for z in [-28.0, 0.0, 28.0]:
		var fill := OmniLight3D.new()
		fill.position = Vector3(0, h - 2.0, z)
		fill.omni_range = 45.0
		fill.light_energy = 1.2 if lighting == "night" else 0.5
		fill.light_color = Color(0.9, 0.95, 1.0)
		fill.shadow_enabled = false
		add_child(fill)


func _build_pads(pads: Array) -> void:
	var small_base := CylinderMesh.new()
	small_base.top_radius = 0.6
	small_base.bottom_radius = 0.7
	small_base.height = 0.06
	var big_base := CylinderMesh.new()
	big_base.top_radius = 1.4
	big_base.bottom_radius = 1.55
	big_base.height = 0.08
	var base_mat := StandardMaterial3D.new()
	base_mat.albedo_color = Color(0.15, 0.15, 0.18)
	base_mat.metallic = 0.8
	base_mat.roughness = 0.3
	for p in pads:
		var node := Node3D.new()
		node.position = p.pos
		add_child(node)
		var base := MeshInstance3D.new()
		base.mesh = big_base if p.big else small_base
		base.position.y = 0.03
		base.material_override = base_mat
		node.add_child(base)
		var halo := MeshInstance3D.new()
		var hq := QuadMesh.new()
		hq.size = Vector2(3.6, 3.6) if p.big else Vector2(1.6, 1.6)
		halo.mesh = hq
		halo.rotation.x = -PI * 0.5
		halo.position.y = 0.09
		var hm := ShaderMaterial.new()
		hm.shader = PAD_SHADER
		hm.set_shader_parameter("color", Color(1.0, 0.72, 0.18) if p.big else Color(1.0, 0.85, 0.35))
		halo.material_override = hm
		halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.add_child(halo)
		var orb := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.55 if p.big else 0.2
		sm.height = sm.radius * 2.0
		orb.mesh = sm
		orb.position.y = 1.0 if p.big else 0.35
		var om := StandardMaterial3D.new()
		om.albedo_color = Color(1.0, 0.75, 0.25)
		om.emission_enabled = true
		om.emission = Color(1.0, 0.6, 0.1)
		om.emission_energy_multiplier = 3.0
		orb.material_override = om
		orb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.add_child(orb)
		pad_nodes.append(node)
		_pad_mats.append(hm)
		_pad_orbs.append(orb)


func update_pads(pads: Array, t: float) -> void:
	for i in mini(pads.size(), _pad_orbs.size()):
		var active: bool = pads[i].active()
		_pad_orbs[i].visible = active
		_pad_orbs[i].position.y = (1.0 if pads[i].big else 0.35) + sin(t * 2.5 + i) * 0.08
		_pad_mats[i].set_shader_parameter("active", 1.0 if active else 0.0)


func set_excitement(v: float) -> void:
	for m in crowd_materials:
		m.set_shader_parameter("excitement", v)


func _build_environment() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	var sky := Sky.new()
	var sky_mat := ShaderMaterial.new()
	sky_mat.shader = SKY_SHADER
	match lighting:
		"day":
			sky_mat.set_shader_parameter("top_color", Color(0.18, 0.4, 0.82))
			sky_mat.set_shader_parameter("horizon_color", Color(0.68, 0.8, 0.95))
			sky_mat.set_shader_parameter("ground_color", Color(0.3, 0.32, 0.36))
			sky_mat.set_shader_parameter("glow_color", Color(0.9, 0.95, 1.0))
			sky_mat.set_shader_parameter("night", 0.0)
			env.ambient_light_energy = 1.0
		"sunset":
			sky_mat.set_shader_parameter("top_color", Color(0.13, 0.15, 0.38))
			sky_mat.set_shader_parameter("horizon_color", Color(1.0, 0.5, 0.28))
			sky_mat.set_shader_parameter("ground_color", Color(0.12, 0.08, 0.1))
			sky_mat.set_shader_parameter("glow_color", Color(1.0, 0.55, 0.3))
			sky_mat.set_shader_parameter("night", 0.25)
			env.ambient_light_energy = 0.85
		_:
			sky_mat.set_shader_parameter("night", 1.0)
			env.ambient_light_energy = 0.6
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.0 if lighting != "night" else 1.15
	env.glow_enabled = bool(_setting("video", "glow", true))
	env.glow_intensity = 0.7
	env.glow_bloom = 0.05
	env.glow_hdr_threshold = 1.1
	env.ssao_enabled = bool(_setting("video", "ssao", true))
	env.ssao_radius = 1.2
	env.ssao_intensity = 1.5
	env.fog_enabled = true
	env.fog_light_color = Color(0.3, 0.35, 0.5) if lighting == "night" else Color(0.7, 0.75, 0.85)
	env.fog_density = 0.0015
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.1
	we.environment = env
	add_child(we)


func _setting(section: String, key: String, def: Variant) -> Variant:
	var s: Node = get_node_or_null("/root/Settings")
	if s == null:
		return def
	return s.get_value(section, key)
