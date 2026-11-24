class_name PlayerInput
extends RefCounted
## Maps keyboard / gamepad actions to CarControls. Actions are registered at
## runtime (and can be re-bound by editing InputMap), so no hand-written
## [input] section is needed in project.godot.

const BINDINGS := {
	"va_throttle": {"keys": [KEY_W, KEY_UP], "axis": [JOY_AXIS_TRIGGER_RIGHT, 1.0]},
	"va_reverse": {"keys": [KEY_S, KEY_DOWN], "axis": [JOY_AXIS_TRIGGER_LEFT, 1.0]},
	"va_left": {"keys": [KEY_A, KEY_LEFT], "axis": [JOY_AXIS_LEFT_X, -1.0]},
	"va_right": {"keys": [KEY_D, KEY_RIGHT], "axis": [JOY_AXIS_LEFT_X, 1.0]},
	"va_pitch_down": {"keys": [], "axis": [JOY_AXIS_LEFT_Y, -1.0]},
	"va_pitch_up": {"keys": [], "axis": [JOY_AXIS_LEFT_Y, 1.0]},
	"va_jump": {"keys": [KEY_SPACE], "buttons": [JOY_BUTTON_A], "mouse": [MOUSE_BUTTON_RIGHT]},
	"va_boost": {"keys": [KEY_SHIFT], "buttons": [JOY_BUTTON_B], "mouse": [MOUSE_BUTTON_LEFT]},
	"va_slide": {"keys": [KEY_CTRL], "buttons": [JOY_BUTTON_X]},
	"va_roll_left": {"keys": [KEY_Q], "buttons": [JOY_BUTTON_LEFT_SHOULDER]},
	"va_roll_right": {"keys": [KEY_E], "buttons": [JOY_BUTTON_RIGHT_SHOULDER]},
	"va_ball_cam": {"keys": [KEY_C], "buttons": [JOY_BUTTON_Y]},
	"va_rear_view": {"keys": [KEY_R], "buttons": [JOY_BUTTON_RIGHT_STICK]},
	"va_scoreboard": {"keys": [KEY_TAB], "buttons": [JOY_BUTTON_BACK]},
	"va_pause": {"keys": [KEY_ESCAPE], "buttons": [JOY_BUTTON_START]},
	"va_debug": {"keys": [KEY_F3]},
	"va_fp_reset": {"keys": [KEY_BACKSPACE, KEY_F5], "buttons": [JOY_BUTTON_DPAD_DOWN]},
	"va_fp_ball_to_me": {"keys": [KEY_T], "buttons": [JOY_BUTTON_DPAD_UP]},
	"va_fp_shot": {"keys": [KEY_Y], "buttons": [JOY_BUTTON_DPAD_RIGHT]},
	"va_fp_unlimited": {"keys": [KEY_B], "buttons": [JOY_BUTTON_DPAD_LEFT]},
	"va_fp_gravity": {"keys": [KEY_G]},
	"va_fp_ball_on_car": {"keys": [KEY_H]},
}

var steer_deadzone: float = 0.1
var dodge_deadzone: float = 0.5


static func register_actions() -> void:
	for action in BINDINGS.keys():
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action, 0.2)
		var b: Dictionary = BINDINGS[action]
		for k in b.get("keys", []):
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(action, ev)
		for btn in b.get("buttons", []):
			var jb := InputEventJoypadButton.new()
			jb.button_index = btn
			InputMap.action_add_event(action, jb)
		for mb in b.get("mouse", []):
			var me := InputEventMouseButton.new()
			me.button_index = mb
			InputMap.action_add_event(action, me)
		if b.has("axis"):
			var ja := InputEventJoypadMotion.new()
			ja.axis = b["axis"][0]
			ja.axis_value = b["axis"][1]
			InputMap.action_add_event(action, ja)


func read(c: CarControls) -> void:
	var fwd: float = Input.get_action_strength("va_throttle")
	var back: float = Input.get_action_strength("va_reverse")
	var steer: float = Input.get_action_strength("va_right") - Input.get_action_strength("va_left")
	if absf(steer) < steer_deadzone:
		steer = 0.0
	c.throttle = fwd - back
	c.steer = steer
	# Pitch: keyboard W/S, or the stick's vertical axis (up = nose down).
	var stick_pitch: float = Input.get_action_strength("va_pitch_up") - Input.get_action_strength("va_pitch_down")
	var key_pitch: float = 0.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):
		key_pitch -= 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):
		key_pitch += 1.0
	c.pitch = clampf(stick_pitch + key_pitch, -1.0, 1.0)
	var slide: bool = Input.is_action_pressed("va_slide")
	c.handbrake = slide
	var dir_roll: float = Input.get_action_strength("va_roll_right") - Input.get_action_strength("va_roll_left")
	if slide:
		c.yaw = 0.0
		c.roll = clampf(steer + dir_roll, -1.0, 1.0)
	else:
		c.yaw = steer
		c.roll = dir_roll
	c.jump = Input.is_action_pressed("va_jump")
	c.boost = Input.is_action_pressed("va_boost")
	c.clamp_values()
