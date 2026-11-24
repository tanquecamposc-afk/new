class_name BoostMeter
extends Control
## Circular boost gauge drawn with arcs (no textures).

var value: float = 33.0
var color := Color(1.0, 0.6, 0.1)
var unlimited: bool = false


func _ready() -> void:
	custom_minimum_size = Vector2(170, 170)


func set_value(v: float, p_unlimited: bool = false) -> void:
	if absf(v - value) > 0.05 or p_unlimited != unlimited:
		value = v
		unlimited = p_unlimited
		queue_redraw()


func _draw() -> void:
	var c: Vector2 = size * 0.5
	var r: float = minf(size.x, size.y) * 0.5 - 8.0
	draw_circle(c, r + 6.0, Color(0.03, 0.05, 0.1, 0.8))
	var start: float = deg_to_rad(135.0)
	var sweep: float = deg_to_rad(270.0)
	draw_arc(c, r - 6.0, start, start + sweep, 64, Color(1, 1, 1, 0.12), 12.0, true)
	var frac: float = 1.0 if unlimited else clampf(value / 100.0, 0.0, 1.0)
	if frac > 0.0:
		var col: Color = color.lerp(Color(1.0, 0.95, 0.5), frac * 0.4)
		draw_arc(c, r - 6.0, start, start + sweep * frac, 64, col, 12.0, true)
	var font: Font = get_theme_default_font()
	var txt: String = "∞" if unlimited else str(int(round(value)))
	var fs: int = 52
	var ts: Vector2 = font.get_string_size(txt, HORIZONTAL_ALIGNMENT_CENTER, -1, fs)
	draw_string(font, c + Vector2(-ts.x * 0.5, ts.y * 0.32), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color.WHITE)
	var lbl: String = "TURBO"
	var ls: Vector2 = font.get_string_size(lbl, HORIZONTAL_ALIGNMENT_CENTER, -1, 14)
	draw_string(font, c + Vector2(-ls.x * 0.5, r * 0.62), lbl, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1, 1, 1, 0.6))
