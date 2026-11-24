shader_type spatial;
// Cheap stylised crowd: a grid of coloured "spectators" that bob and flash.
// One draw call per stand block instead of thousands of meshes.

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
	vec2 cell = floor(vec2(wpos.x + wpos.z, wpos.y) / vec2(0.7, 0.8));
	float h = hash(cell);
	vec2 f = fract(vec2(wpos.x + wpos.z, wpos.y) / vec2(0.7, 0.8));
	float bob = sin(TIME * (3.0 + h * 4.0) + h * 30.0) * (0.04 + excitement * 0.12);
	float body = step(abs(f.x - 0.5), 0.28) * step(f.y, 0.75 + bob) * step(0.15, f.y);
	float team = step(0.0, wpos.z) ;
	vec3 shirt = mix(vec3(h, fract(h * 7.3), fract(h * 13.1)) * 0.6 + 0.2, mix(blue_tint, orange_tint, team), step(0.45, h));
	vec3 seat = vec3(0.07, 0.08, 0.11);
	float flash = step(0.995 - excitement * 0.02, hash(cell + floor(TIME * 6.0)));
	ALBEDO = mix(seat, shirt, body);
	EMISSION = vec3(1.0) * flash * 2.0 + shirt * body * 0.12;
	ROUGHNESS = 0.9;
}
