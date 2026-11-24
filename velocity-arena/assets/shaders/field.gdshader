shader_type spatial;
// Procedural pitch: mowed turf stripes, field markings and team-tinted halves.
// Everything is computed from world position, so no texture assets are needed.

uniform vec3 grass_a : source_color = vec3(0.10, 0.30, 0.13);
uniform vec3 grass_b : source_color = vec3(0.12, 0.36, 0.15);
uniform vec3 blue_tint : source_color = vec3(0.10, 0.35, 1.0);
uniform vec3 orange_tint : source_color = vec3(1.0, 0.45, 0.05);
uniform vec3 line_color : source_color = vec3(0.92, 0.96, 1.0);
uniform float half_length = 51.2;
uniform float half_width = 41.0;
uniform float goal_half_width = 8.93;
uniform float line_width = 0.22;
uniform float tint_strength = 0.12;

varying vec3 wpos;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float line_band(float d, float w) {
	float aa = fwidth(d) * 1.5;
	return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, abs(d));
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = wpos.xz;
	float stripe = step(0.5, fract(p.y / 8.0));
	vec3 col = mix(grass_a, grass_b, stripe);
	float n = noise(p * 3.0) * 0.5 + noise(p * 17.0) * 0.5;
	col *= 0.85 + 0.3 * n;
	// Team halves.
	float side = smoothstep(-2.0, 2.0, p.y);
	col = mix(col, mix(blue_tint, orange_tint, side), tint_strength);

	float lines = 0.0;
	lines = max(lines, line_band(p.y, line_width));                                  // halfway line
	lines = max(lines, line_band(length(p) - 9.0, line_width));                       // centre circle
	lines = max(lines, line_band(length(p) - 0.35, 0.7));                             // centre spot
	// Goal areas (6 m deep rectangles in front of each goal).
	for (int s = -1; s <= 1; s += 2) {
		float z0 = float(s) * half_length;
		float zin = z0 - float(s) * 7.0;
		bool inside_x = abs(p.x) < goal_half_width + 4.0;
		bool between = (float(s) * (p.y - zin)) > 0.0 && (float(s) * (p.y - z0)) < 0.0;
		if (between) {
			lines = max(lines, line_band(abs(p.x) - (goal_half_width + 4.0), line_width));
		}
		if (inside_x) {
			lines = max(lines, line_band(p.y - zin, line_width));
			lines = max(lines, line_band(p.y - z0 + float(s) * 0.3, line_width * 1.6));  // goal line
		}
	}
	col = mix(col, line_color, lines * 0.85);
	ALBEDO = col;
	ROUGHNESS = 0.85 - lines * 0.4;
	METALLIC = 0.0;
	EMISSION = line_color * lines * 0.08;
}
