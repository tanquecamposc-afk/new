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
	var nt := NoiseTexture2D.new()
	nt.width = 512
	nt.height = 512
	nt.seamless = true
	nt.as_normal_map = true
	nt.bump_strength = 6.0
	var fn := FastNoiseLite.new()
	fn.frequency = 0.09
	fn.fractal_octaves = 3
	nt.noise = fn
	mat.set_shader_parameter("turf_normal", nt)
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
		mat.set_shader_parameter("alpha_base", 0.0)
		mat.set_shader_parameter("grid_glow", 0.03)
		mat.set_shader_parameter("grid_alpha", 0.04)
	else:
		mat.set_shader_parameter("grid_glow", 0.14)
		mat.set_shader_parameter("grid_alpha", 0.1)
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


## Continuous stepped seating bowl around the whole arena + roof ring.
func _build_stands() -> void:
	var per: Array = _core_perimeter(14)
	var pts: Array[Vector3] = per[0]
	var nrm: Array[Vector3] = per[1]
	var re: float = shape.edge_radius
	var tiers: int = 26
	var start_off: float = re + 12.5          # outside the goal boxes
	var tread: float = 0.95
	var rise: float = 0.62
	var base_h: float = 2.4
	var cm := ShaderMaterial.new()
	cm.shader = CROWD_SHADER
	cm.set_shader_parameter("blue_tint", _team_colors[0])
	cm.set_shader_parameter("orange_tint", _team_colors[1])
	crowd_materials.append(cm)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n_pts: int = pts.size()
	# Cumulative perimeter distance -> U coordinate (seat columns).
	var dist := PackedFloat32Array()
	var acc: float = 0.0
	for i in n_pts:
		if i > 0:
			acc += pts[i].distance_to(pts[i - 1])
		dist.append(acc)
	var total: float = acc + pts[n_pts - 1].distance_to(pts[0])
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		var u0: float = dist[i]
		var u1: float = total if i2 == 0 else dist[i2]
		for t in tiers:
			var off0: float = start_off + t * tread
			var off1: float = off0 + tread
			var y0: float = base_h + t * rise
			var y1: float = y0 + rise
			# Riser (vertical face) then tread (horizontal seat row).
			var r0a: Vector3 = pts[i] + nrm[i] * off0
			var r0b: Vector3 = pts[i2] + nrm[i2] * off0
			var r1a: Vector3 = pts[i] + nrm[i] * off1
			var r1b: Vector3 = pts[i2] + nrm[i2] * off1
			var quads: Array = [
				[r0a + Vector3.UP * y0, r0b + Vector3.UP * y0, r0b + Vector3.UP * y1, r0a + Vector3.UP * y1, -nrm[i], t, 0.0],
				[r0a + Vector3.UP * y1, r0b + Vector3.UP * y1, r1b + Vector3.UP * y1, r1a + Vector3.UP * y1, Vector3.UP, t, 1.0],
			]
			for q in quads:
				var uvs := [Vector2(u0, q[5] + q[6] * 0.5), Vector2(u1, q[5] + q[6] * 0.5), Vector2(u1, q[5] + q[6] * 0.5 + 0.5), Vector2(u0, q[5] + q[6] * 0.5 + 0.5)]
				for idx in [0, 2, 1, 0, 3, 2]:
					st.set_normal(q[4])
					st.set_uv(uvs[idx])
					st.add_vertex(q[idx])
	var bowl := MeshInstance3D.new()
	bowl.mesh = st.commit()
	bowl.material_override = cm
	bowl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	bowl.name = "Bowl"
	add_child(bowl)
	# Concourse wall below the first tier and the outer back wall.
	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.07, 0.075, 0.09)
	wall_mat.metallic = 0.3
	wall_mat.roughness = 0.6
	var outer_off: float = start_off + tiers * tread
	var top_y: float = base_h + tiers * rise
	var wst := SurfaceTool.new()
	wst.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		for spec in [[start_off, 0.0, base_h], [outer_off, 0.0, top_y + 6.0]]:
			var a_p: Vector3 = pts[i] + nrm[i] * spec[0]
			var b_p: Vector3 = pts[i2] + nrm[i2] * spec[0]
			var q := [a_p + Vector3.UP * spec[1], b_p + Vector3.UP * spec[1], b_p + Vector3.UP * spec[2], a_p + Vector3.UP * spec[2]]
			for idx in [0, 2, 1, 0, 3, 2]:
				wst.add_vertex(q[idx])
	wst.generate_normals()
	var walls := MeshInstance3D.new()
	walls.mesh = wst.commit()
	wall_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	walls.material_override = wall_mat
	add_child(walls)
	# LED advertising ribbon along the front of the first tier (team gradient).
	var rst := SurfaceTool.new()
	rst.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		var a_p: Vector3 = pts[i] + nrm[i] * (start_off - 0.05)
		var b_p: Vector3 = pts[i2] + nrm[i2] * (start_off - 0.05)
		var q := [a_p + Vector3.UP * (base_h - 1.1), b_p + Vector3.UP * (base_h - 1.1), b_p + Vector3.UP * (base_h - 0.1), a_p + Vector3.UP * (base_h - 0.1)]
		var uvq := [Vector2(dist[i], 0), Vector2(total if i2 == 0 else dist[i2], 0), Vector2(total if i2 == 0 else dist[i2], 1), Vector2(dist[i], 1)]
		for idx in [0, 2, 1, 0, 3, 2]:
			rst.set_uv(uvq[idx])
			rst.set_color(_team_colors[0].lerp(_team_colors[1], clampf(q[idx].z / (shape.half_length * 2.4) + 0.5, 0.0, 1.0)))
			rst.add_vertex(q[idx])
	var ribbon := MeshInstance3D.new()
	ribbon.mesh = rst.commit()
	var rib_sh := Shader.new()
	rib_sh.code = """shader_type spatial;
render_mode unshaded, cull_disabled;
void fragment() {
	float scroll = fract(UV.x / 14.0 - TIME * 0.12);
	float band = smoothstep(0.0, 0.05, scroll) * smoothstep(0.55, 0.5, scroll);
	float chevron = step(0.5, fract((UV.x + abs(UV.y - 0.5) * 2.0) / 1.2 - TIME * 0.8));
	vec3 c = COLOR.rgb * (0.35 + band * 1.6 + chevron * 0.25);
	ALBEDO = c;
}"""
	var rib_mat := ShaderMaterial.new()
	rib_mat.shader = rib_sh
	ribbon.material_override = rib_mat
	ribbon.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(ribbon)
	# Roof ring: cantilevered canopy over the upper tiers with a light strip.
	var roof_mat := StandardMaterial3D.new()
	roof_mat.albedo_color = Color(0.12, 0.13, 0.16)
	roof_mat.metallic = 0.7
	roof_mat.roughness = 0.35
	roof_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var lst := SurfaceTool.new()
	lst.begin(Mesh.PRIMITIVE_TRIANGLES)
	var roof_in: float = start_off + tiers * tread * 0.45
	var roof_y: float = top_y + 5.5
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		var a_in: Vector3 = pts[i] + nrm[i] * roof_in + Vector3.UP * (roof_y + 1.5)
		var b_in: Vector3 = pts[i2] + nrm[i2] * roof_in + Vector3.UP * (roof_y + 1.5)
		var a_out: Vector3 = pts[i] + nrm[i] * (outer_off + 1.0) + Vector3.UP * roof_y
		var b_out: Vector3 = pts[i2] + nrm[i2] * (outer_off + 1.0) + Vector3.UP * roof_y
		for v in [a_in, b_out, b_in, a_in, a_out, b_out]:
			lst.add_vertex(v)
	lst.generate_normals()
	var roof := MeshInstance3D.new()
	roof.mesh = lst.commit()
	roof.material_override = roof_mat
	add_child(roof)
	var strip_st := SurfaceTool.new()
	strip_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in n_pts:
		var i2: int = (i + 1) % n_pts
		var a_p: Vector3 = pts[i] + nrm[i] * (roof_in - 0.1) + Vector3.UP * (roof_y + 1.5)
		var b_p: Vector3 = pts[i2] + nrm[i2] * (roof_in - 0.1) + Vector3.UP * (roof_y + 1.5)
		for v in [a_p, b_p + Vector3.DOWN * 0.5, b_p, a_p, a_p + Vector3.DOWN * 0.5, b_p + Vector3.DOWN * 0.5]:
			strip_st.add_vertex(v)
	var strip := MeshInstance3D.new()
	strip.mesh = strip_st.commit()
	var strip_mat := StandardMaterial3D.new()
	strip_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	strip_mat.albedo_color = Color(1.6, 1.7, 2.0)
	strip_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	strip.material_override = strip_mat
	add_child(strip)
	# Giant screens above each end, hung under the roof.
	for side in [-1.0, 1.0]:
		var screen := MeshInstance3D.new()
		var qm := QuadMesh.new()
		qm.size = Vector2(30.0, 11.0)
		screen.mesh = qm
		screen.position = Vector3(0, top_y + 1.0, side * (shape.half_length + start_off + 6.0))
		screen.rotation.y = 0.0 if side < 0.0 else PI
		var sc_sh := Shader.new()
		sc_sh.code = """shader_type spatial;
render_mode unshaded;
uniform vec3 a : source_color;
uniform vec3 b : source_color;
void fragment() {
	vec2 uv = UV;
	float g = smoothstep(0.0, 1.0, uv.x + sin(TIME * 0.6 + uv.y * 3.0) * 0.15);
	vec3 c = mix(a, b, g) * 0.55;
	float px = step(0.12, fract(uv.x * 120.0)) * step(0.12, fract(uv.y * 44.0));
	float frame = step(0.02, uv.x) * step(uv.x, 0.98) * step(0.04, uv.y) * step(uv.y, 0.96);
	ALBEDO = mix(vec3(0.02), c * (0.6 + 0.4 * px) + vec3(0.9) * step(0.47, abs(uv.y - 0.5)) * 0.0, frame);
}"""
		var sc_mat := ShaderMaterial.new()
		sc_mat.shader = sc_sh
		sc_mat.set_shader_parameter("a", _team_colors[0])
		sc_mat.set_shader_parameter("b", _team_colors[1])
		screen.material_override = sc_mat
		screen.name = "Screen"
		add_child(screen)
	# Outer ground plane.
	var ground := MeshInstance3D.new()
	var gm := PlaneMesh.new()
	gm.size = Vector2(500, 500)
	ground.mesh = gm
	ground.position = Vector3(0, -0.05, 0)
	var g_mat := StandardMaterial3D.new()
	g_mat.albedo_color = Color(0.04, 0.045, 0.055)
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
			var base := Vector3(sx * (shape.half_width + 46.0), 0, sz * (shape.half_length + 46.0))
			var pole := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.6
			cm.bottom_radius = 1.0
			cm.height = 52.0
			pole.mesh = cm
			pole.position = base + Vector3(0, 26.0, 0)
			pole.material_override = tower_mat
			add_child(pole)
			var lamp := MeshInstance3D.new()
			var lm := BoxMesh.new()
			lm.size = Vector3(7.0, 4.0, 0.8)
			lamp.mesh = lm
			lamp.position = base + Vector3(0, 53.0, 0)
			lamp.look_at_from_position(lamp.position, Vector3(0, 0, 0), Vector3.UP)
			lamp.material_override = lamp_mat
			add_child(lamp)
			if lighting != "day":
				var spot := SpotLight3D.new()
				spot.position = lamp.position
				spot.look_at_from_position(lamp.position, Vector3(sx * -8.0, 0, sz * -10.0), Vector3.UP)
				spot.spot_range = 170.0
				spot.spot_angle = 30.0
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
	# Neutral ambient: the sky colour must not tint the whole stadium.
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.6, 0.7) if lighting == "night" else Color(0.75, 0.78, 0.85)
	env.ambient_light_energy = 0.35 if lighting == "night" else 0.6
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.15 if lighting == "night" else 1.0
	env.glow_enabled = bool(_setting("video", "glow", true))
	env.glow_intensity = 0.55
	env.glow_strength = 1.0
	env.glow_bloom = 0.02
	env.glow_hdr_threshold = 1.2
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	var hq: bool = bool(_setting("video", "ssao", true))
	env.ssao_enabled = hq
	env.ssao_radius = 1.0
	env.ssao_intensity = 2.0
	env.ssao_power = 1.6
	env.ssil_enabled = hq
	env.ssil_intensity = 0.8
	env.ssr_enabled = hq
	env.ssr_max_steps = 48
	env.ssr_fade_in = 0.15
	env.ssr_fade_out = 2.0
	env.fog_enabled = true
	env.fog_light_color = Color(0.12, 0.14, 0.2) if lighting == "night" else Color(0.7, 0.76, 0.86)
	env.fog_density = 0.0004
	env.fog_sky_affect = 0.2
	env.volumetric_fog_enabled = hq and lighting == "night"
	env.volumetric_fog_density = 0.006
	env.volumetric_fog_albedo = Color(0.9, 0.92, 1.0)
	env.volumetric_fog_length = 160.0
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 1.12
	we.environment = env
	add_child(we)
	# Reflection probe so the car paint and glass reflect the stadium.
	var probe := ReflectionProbe.new()
	probe.size = Vector3(shape.half_width * 2.0 + 60.0, 60.0, shape.half_length * 2.0 + 60.0)
	probe.position = Vector3(0, 6.0, 0)
	probe.update_mode = ReflectionProbe.UPDATE_ONCE
	probe.box_projection = true
	probe.intensity = 0.9
	probe.max_distance = 300.0
	add_child(probe)


func _setting(section: String, key: String, def: Variant) -> Variant:
	var s: Node = get_node_or_null("/root/Settings")
	if s == null:
		return def
	return s.get_value(section, key)
