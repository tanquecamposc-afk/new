shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never;
// Glowing pickup halo; `active` fades it out while the pad respawns.

uniform vec3 color : source_color = vec3(1.0, 0.75, 0.2);
uniform float active = 1.0;

void fragment() {
	float pulse = 0.75 + 0.25 * sin(TIME * 4.0);
	vec2 c = UV - 0.5;
	float r = length(c) * 2.0;
	float ring = smoothstep(1.0, 0.75, r) * smoothstep(0.35, 0.7, r);
	float core = smoothstep(0.5, 0.0, r);
	ALBEDO = color * (ring + core * 0.6) * pulse * mix(0.12, 1.0, active);
}
