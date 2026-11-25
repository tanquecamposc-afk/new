shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque;
// Semi-transparent arena shell with a hexagonal energy grid, team-tinted ends
// and the goal openings cut out (discarded) so the goal boxes show through.

uniform vec3 base_color : source_color = vec3(0.55, 0.75, 1.0);
uniform vec3 blue_tint : source_color = vec3(0.10, 0.45, 1.0);
uniform vec3 orange_tint : source_color = vec3(1.0, 0.45, 0.05);
uniform float half_length = 51.2;
uniform float edge_radius = 3.0;
uniform float goal_half_width = 8.93;
uniform float goal_height = 6.43;
uniform float alpha_base = 0.05;
uniform float grid_glow = 0.3;
uniform float is_ceiling = 0.0;
uniform float grid_alpha = 0.18;

varying vec3 wpos;

float hex_edge(vec2 p) {
	p /= 2.6;
	vec2 r = vec2(1.0, 1.7320508);
	vec2 h = r * 0.5;
	vec2 a = mod(p, r) - h;
	vec2 b = mod(p - h, r) - h;
	vec2 g = dot(a, a) < dot(b, b) ? a : b;
	vec2 q = abs(g);
	float d = max(dot(q, normalize(vec2(1.0, 1.7320508))), q.x);
	return smoothstep(0.42, 0.5, d);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	if (is_ceiling < 0.5 && abs(wpos.z) > half_length - edge_radius - 0.02 && abs(wpos.x) < goal_half_width && wpos.y < goal_height) {
		discard;
	}
	// Planar mapping choice by dominant normal.
	vec3 n = abs((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
	vec2 uv = n.y > 0.6 ? wpos.xz : (n.x > n.z ? wpos.zy : wpos.xy);
	float grid = hex_edge(uv);
	float team = smoothstep(-20.0, 20.0, wpos.z);
	vec3 tint = mix(blue_tint, orange_tint, team);
	float end_weight = smoothstep(25.0, 50.0, abs(wpos.z));
	vec3 col = mix(base_color, tint, 0.35 + end_weight * 0.5);
	float fres = pow(1.0 - clamp(abs(dot(normalize(NORMAL), normalize(VIEW))), 0.0, 1.0), 3.0);
	float low = 1.0 - smoothstep(0.0, 4.0, wpos.y);
	ALBEDO = col * 0.4;
	EMISSION = col * (grid * grid_glow * (0.5 + end_weight) + fres * 0.12 + low * 0.25) * (1.0 - is_ceiling * 0.8);
	ALPHA = clamp(alpha_base + grid * grid_alpha + fres * 0.08 * (1.0 - is_ceiling) + low * 0.3 * (1.0 - is_ceiling), 0.0, 0.85);
	ROUGHNESS = 0.2;
	METALLIC = 0.3;
}
