shader_type sky;
// Original procedural sky: gradient, sun glow, and a twinkling star field
// whose density fades with daylight. `night` = 1 at night, 0 by day.

uniform vec3 top_color : source_color = vec3(0.01, 0.015, 0.05);
uniform vec3 horizon_color : source_color = vec3(0.08, 0.1, 0.22);
uniform vec3 ground_color : source_color = vec3(0.01, 0.01, 0.02);
uniform vec3 glow_color : source_color = vec3(0.35, 0.45, 0.9);
uniform float night = 1.0;

float hash(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void sky() {
	vec3 d = normalize(EYEDIR);
	float h = d.y;
	vec3 col = mix(horizon_color, top_color, smoothstep(0.0, 0.6, h));
	col = mix(ground_color, col, smoothstep(-0.08, 0.02, h));
	// Light-pollution glow from the stadium near the horizon.
	col += glow_color * exp(-abs(h) * 9.0) * 0.35;
	// Sun / moon disc.
	if (LIGHT0_ENABLED) {
		float s = max(dot(d, LIGHT0_DIRECTION), 0.0);
		col += LIGHT0_COLOR * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.15) * (1.0 - night * 0.6);
	}
	// Stars.
	if (night > 0.01 && h > 0.0) {
		vec3 cell = floor(d * 220.0);
		float st = hash(cell);
		float star = step(0.9965, st);
		float tw = 0.6 + 0.4 * sin(TIME * (2.0 + st * 5.0) + st * 40.0);
		col += vec3(0.9, 0.95, 1.0) * star * tw * night * smoothstep(0.02, 0.25, h) * 1.6;
	}
	COLOR = col;
}
