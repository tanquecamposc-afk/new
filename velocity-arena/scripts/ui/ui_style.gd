class_name UiStyle
extends RefCounted
## Shared visual language for the interface: dark glass panels, cyan accent,
## team colours, bold condensed headings.

const ACCENT := Color(0.18, 0.88, 1.0)
const PANEL := Color(0.04, 0.06, 0.11, 0.86)
const PANEL_LIGHT := Color(0.09, 0.12, 0.2, 0.92)
const TEXT := Color(0.93, 0.96, 1.0)
const TEXT_DIM := Color(0.6, 0.67, 0.8)
const DISABLED := Color(0.42, 0.46, 0.55)


static func panel_box(color: Color = PANEL, radius: int = 10, border: Color = Color(1, 1, 1, 0.08)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.set_corner_radius_all(radius)
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	return sb


static func label(text: String, size: int = 18, color: Color = TEXT, outline: int = 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	return l


static func button(text: String, size: int = 20, primary: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	b.add_theme_font_size_override("font_size", size)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	var normal := panel_box(Color(0.08, 0.11, 0.19, 0.85) if not primary else Color(0.05, 0.45, 0.65, 0.95), 8)
	var hover := panel_box(Color(0.12, 0.2, 0.33, 0.95) if not primary else Color(0.1, 0.6, 0.85, 1.0), 8, ACCENT)
	hover.set_border_width_all(2)
	var pressed := panel_box(Color(0.05, 0.55, 0.75, 1.0), 8, ACCENT)
	var disabled := panel_box(Color(0.06, 0.07, 0.1, 0.7), 8)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("focus", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("disabled", disabled)
	b.add_theme_color_override("font_color", TEXT)
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_color_override("font_disabled_color", DISABLED)
	return b


static func full_rect(c: Control) -> void:
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
