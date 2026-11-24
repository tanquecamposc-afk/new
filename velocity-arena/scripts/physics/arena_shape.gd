class_name ArenaShape
extends RefCounted
## Analytic signed-distance description of a car-football arena.
##
## The playable volume is the union of:
##  * the field: a rounded-rectangle extrusion (rounded vertical corners with
##    radius `corner_radius`) whose floor/wall/ceiling edges are rounded with
##    `edge_radius`, giving smooth curved wall transitions;
##  * two goal boxes cut into the end walls.
##
## `distance(p)` is positive inside free space and negative inside walls.
## The same description drives physics, bots, camera collision and the
## procedural arena mesh, so visuals and collisions always match.

var half_width: float
var half_length: float
var height: float
var corner_radius: float
var edge_radius: float
var goal_half_width: float
var goal_height: float
var goal_depth: float
## How far the goal boxes extend into the field (covers the curved floor edge).
var goal_overlap: float
var goal_rounding: float = 0.25


func _init(cfg: PhysicsConfig) -> void:
	half_width = cfg.arena_half_width
	half_length = cfg.arena_half_length
	height = cfg.arena_height
	corner_radius = cfg.arena_corner_radius
	edge_radius = cfg.arena_edge_radius
	goal_half_width = cfg.goal_half_width
	goal_height = cfg.goal_height
	goal_depth = cfg.goal_depth
	goal_overlap = edge_radius + 0.5


## Exact SDF of a 2D rounded rectangle (negative inside).
static func _sd_round_rect(px: float, pz: float, hx: float, hz: float, r: float) -> float:
	var qx: float = absf(px) - hx + r
	var qz: float = absf(pz) - hz + r
	var ox: float = maxf(qx, 0.0)
	var oz: float = maxf(qz, 0.0)
	return sqrt(ox * ox + oz * oz) + minf(maxf(qx, qz), 0.0) - r


## SDF of the 2D shape extruded along y in [0, h] and rounded by `round_r`.
static func _sd_rounded_extrusion(d2: float, y: float, h: float, round_r: float) -> float:
	var wx: float = d2 + round_r
	var wy: float = absf(y - h * 0.5) - h * 0.5 + round_r
	var ox: float = maxf(wx, 0.0)
	var oy: float = maxf(wy, 0.0)
	return sqrt(ox * ox + oy * oy) + minf(maxf(wx, wy), 0.0) - round_r


func _sd_field(p: Vector3) -> float:
	var d2: float = _sd_round_rect(p.x, p.z, half_width, half_length, corner_radius)
	return _sd_rounded_extrusion(d2, p.y, height, edge_radius)


func _sd_goal(p: Vector3, side: float) -> float:
	# Box from z = side*(L - overlap) to z = side*(L + depth).
	var z_near: float = half_length - goal_overlap
	var z_far: float = half_length + goal_depth
	var cz: float = side * (z_near + z_far) * 0.5
	var hz: float = (z_far - z_near) * 0.5
	var d2: float = _sd_round_rect(p.x, p.z - cz, goal_half_width, hz, goal_rounding)
	return _sd_rounded_extrusion(d2, p.y, goal_height, goal_rounding)


## Signed distance from `p` to the nearest arena surface.
## Positive = inside the playable volume.
func distance(p: Vector3) -> float:
	var sd: float = _sd_field(p)
	if absf(p.z) > half_length - goal_overlap - 2.0 and absf(p.x) < goal_half_width + 2.0 and p.y < goal_height + 2.0:
		sd = minf(sd, _sd_goal(p, signf(p.z) if p.z != 0.0 else 1.0))
	return -sd


## Surface normal pointing into the playable volume.
func normal(p: Vector3) -> Vector3:
	var e: float = 0.01
	var n := Vector3(
		distance(p + Vector3(e, 0, 0)) - distance(p - Vector3(e, 0, 0)),
		distance(p + Vector3(0, e, 0)) - distance(p - Vector3(0, e, 0)),
		distance(p + Vector3(0, 0, e)) - distance(p - Vector3(0, 0, e)))
	if n.length_squared() < 1e-12:
		return Vector3.UP
	return n.normalized()


## Sphere-traces a ray. Returns the hit distance along `dir`, or -1.0 on miss.
func raycast(origin: Vector3, dir: Vector3, max_dist: float) -> float:
	var t: float = 0.0
	for i in 48:
		var d: float = distance(origin + dir * t)
		if d < 0.002:
			return t
		t += maxf(d, 0.004)
		if t > max_dist:
			return -1.0
	return -1.0


## True when the ball centre at `p` (radius r) has fully crossed a goal line.
## Returns +1 if it is inside the +Z goal, -1 for the -Z goal, 0 otherwise.
func goal_side(p: Vector3, r: float) -> int:
	if absf(p.x) > goal_half_width or p.y > goal_height:
		return 0
	if p.z > half_length + r:
		return 1
	if p.z < -half_length - r:
		return -1
	return 0
