shader_type spatial;
// Stylised crowd for the seating bowl. UV.x = metres along the row,
// UV.y = tier index (+0.5 on the seat tread). Each 0.6 m cell is a seat with
// a spectator silhouette (body + head) that bobs; some seats are empty.

uniform float excitement = 0.0;
uniform vec3 blue_tint : source_color = vec3(0.10, 0.45, 1.0);
uniform vec3 orange_tint : source_color = vec3(1.0, 0.45, 0.05);

varying vec3 wpos;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float tier = floor(UV.y);
	float face = fract(UV.y) * 2.0;           // 0..1 riser, 1..2 tread
	vec2 cell = vec2(floor(UV.x / 0.62), tier);
	float h = hash(cell);
	float fx = fract(UV.x / 0.62);
	vec3 seat = mix(vec3(0.05, 0.055, 0.07), vec3(0.11, 0.12, 0.15), step(0.5, fract(tier * 0.5)));
	vec3 col = seat;
	float occupied = step(0.12, h);
	// On the riser face we see the spectator standing in front of the seat.
	float fy = clamp(face, 0.0, 1.0);
	float bob = sin(TIME * (2.5 + h * 3.0) + h * 40.0) * (0.03 + excitement * 0.12);
	float body = step(abs(fx - 0.5), 0.27) * step(fy, 0.62 + bob) * step(0.0, fy);
	float head = step(length(vec2((fx - 0.5) * 1.3, fy - (0.78 + bob))), 0.15);
	float person = max(body, head) * occupied * step(face, 1.0);
	float team = step(0.0, wpos.z);
	vec3 shirt = mix(vec3(h, fract(h * 7.3), fract(h * 13.1)) * 0.55 + 0.25, mix(blue_tint, orange_tint, team), step(0.4, fract(h * 3.7)));
	vec3 skin = mix(vec3(0.35, 0.22, 0.15), vec3(0.85, 0.65, 0.5), fract(h * 11.0));
	col = mix(col, mix(shirt, skin, head), person);
	// Tread: seat rows with a subtle stripe.
	if (face > 1.0) {
		col = seat * (0.8 + 0.2 * step(0.5, fract(UV.x / 0.62)));
	}
	float flash = step(0.997 - excitement * 0.01, hash(cell + floor(TIME * 5.0))) * occupied;
	ALBEDO = col;
	EMISSION = vec3(1.0) * flash * 3.0 + col * 0.06;
	ROUGHNESS = 0.85;
}
