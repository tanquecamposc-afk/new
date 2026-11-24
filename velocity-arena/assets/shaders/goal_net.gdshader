shader_type spatial;
render_mode blend_mix, cull_disabled;
// Goal interior: glowing net grid in team colour.

uniform vec3 team_color : source_color = vec3(0.1, 0.45, 1.0);
uniform float glow = 1.2;

varying vec3 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec3 n = abs((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
	vec2 uv = n.y > 0.6 ? wpos.xz : (n.x > n.z ? wpos.zy : wpos.xy);
	vec2 g = abs(fract(uv / 0.55) - 0.5);
	float lineMask = step(0.45, max(g.x, g.y));
	ALBEDO = team_color * 0.15;
	EMISSION = team_color * (lineMask * glow + 0.08);
	ALPHA = 0.35 + lineMask * 0.5;
	ROUGHNESS = 0.6;
}
