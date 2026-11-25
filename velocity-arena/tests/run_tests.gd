extends SceneTree
## Headless automated test runner.
## Usage: godot --headless --path velocity-arena --script res://tests/run_tests.gd
## Exit code 0 = all passed. Results also written to user://test_results.txt.

const DT := 1.0 / 120.0

var _passed: int = 0
var _failed: int = 0
var _lines: PackedStringArray = PackedStringArray()
var _current: String = ""


func _initialize() -> void:
	var t0: int = Time.get_ticks_msec()
	var suites: Array = [
		preload("res://tests/test_physics.gd").new(),
		preload("res://tests/test_gameplay.gd").new(),
		preload("res://tests/test_multiplayer.gd").new(),
	]
	for suite in suites:
		for m in suite.get_method_list():
			var mname: String = m["name"]
			if not mname.begins_with("test_"):
				continue
			_current = mname
			suite.runner = self
			var before: int = _failed
			var t_start: int = Time.get_ticks_msec()
			suite.call(mname)
			var ms: int = Time.get_ticks_msec() - t_start
			_log("%s %s (%d ms)" % ["PASS" if _failed == before else "FAIL", mname, ms])
	_log("")
	_log("TOTAL: %d checks passed, %d failed, %.1f s" % [_passed, _failed, (Time.get_ticks_msec() - t0) / 1000.0])
	var f := FileAccess.open("user://test_results.txt", FileAccess.WRITE)
	if f:
		f.store_string("\n".join(_lines))
	quit(0 if _failed == 0 else 1)


func _log(s: String) -> void:
	print(s)
	_lines.append(s)


func check(cond: bool, what: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		_log("    ✗ [%s] %s" % [_current, what])


func info(s: String) -> void:
	_log("    · " + s)
