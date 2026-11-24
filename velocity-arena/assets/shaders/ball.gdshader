shader_type spatial;
// Original ball look: pearl-white shell with glowing seams along three great
// circles and soft panel shading. Glow intensifies with speed.

uniform vec3 shell : source_color = vec3(0.92, 0.93, 0.97);
uniform vec3 seam_color : source_color = vec3(0.25, 0.85, 1.0);
uniform float speed_glow = 0.0;

varying vec3 local_pos;

void vertex() {
	local_pos = normalize(VERTEX);
}

float seam(float d) {
	float aa = fwidth(d) * 1.5;
	return 1.0 - smoothstep(0.025 - aa, 0.025 + aa, abs(d));
}

void fragment() {
	vec3 p = local_pos;
	float s = 0.0;
	s = max(s, seam(p.x));
	s = max(s, seam(p.y));
	s = max(s, seam(p.z));
	// Panel pattern: subtle darkening on alternating octants.
	float oct = step(0.0, p.x) + step(0.0, p.y) + step(0.0, p.z);
	float panel = mod(oct, 2.0) * 0.06;
	ALBEDO = mix(shell * (1.0 - panel), seam_color, s);
	EMISSION = seam_color * s * (0.6 + speed_glow * 2.5);
	ROUGHNESS = mix(0.35, 0.2, s);
	METALLIC = 0.15;
	RIM = 0.4;
}
