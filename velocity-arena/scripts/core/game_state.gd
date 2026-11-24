extends Node
## Cross-scene state (autoload "GameState"): the requested match setup and
## the local offline profile (XP, level, career stats).

const PROFILE_PATH := "user://profile.cfg"

## Match setup consumed by the match scene.
var mode_id: String = "soccar_2v2"
var bot_difficulty: int = 3
var match_minutes: float = 5.0
var lighting: String = "night"
var free_play: bool = false

var profile := {
	"name": "Jugador", "xp": 0, "matches": 0, "wins": 0, "goals": 0,
	"assists": 0, "saves": 0, "shots": 0, "demos": 0, "mvps": 0,
}


func _ready() -> void:
	load_profile()


func load_profile() -> void:
	var cf := ConfigFile.new()
	if cf.load(PROFILE_PATH) != OK:
		return
	for k in profile.keys():
		profile[k] = cf.get_value("profile", k, profile[k])


func save_profile() -> void:
	var cf := ConfigFile.new()
	for k in profile.keys():
		cf.set_value("profile", k, profile[k])
	cf.save(PROFILE_PATH)


static func level_for_xp(xp: int) -> int:
	# Level n requires 1000 + 150*(n-1) XP more than level n-1.
	var lvl: int = 1
	var need: int = 1000
	var rest: int = xp
	while rest >= need:
		rest -= need
		lvl += 1
		need += 150
	return lvl


func level() -> int:
	return level_for_xp(int(profile["xp"]))


## Records a finished offline match. Returns XP earned.
func record_match(stats: Dictionary, won: bool, minutes_played: float) -> int:
	var xp: int = int(150.0 * clampf(minutes_played / 5.0, 0.2, 1.5)) + (100 if won else 0)
	xp += int(stats.get("score", 0)) / 4
	profile["xp"] = int(profile["xp"]) + xp
	profile["matches"] = int(profile["matches"]) + 1
	if won:
		profile["wins"] = int(profile["wins"]) + 1
	for k in ["goals", "assists", "saves", "shots", "demos"]:
		profile[k] = int(profile[k]) + int(stats.get(k, 0))
	save_profile()
	return xp
