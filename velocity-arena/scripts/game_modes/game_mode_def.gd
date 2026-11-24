class_name GameModeDef
extends RefCounted
## Data description of a game mode / playlist. Modes are registered in
## GameModeRegistry and can be enabled, disabled or scheduled without
## touching gameplay code. `status` is honest: only "playable" modes can be
## started; "planned" modes are listed as in development.

var id: String = ""
var name_es: String = ""
var name_en: String = ""
var desc_es: String = ""
var desc_en: String = ""
var category: String = "standard"   ## standard, arcade, training, offline, online, competitive
var status: String = "planned"      ## playable | planned
var enabled: bool = true
var team_size: int = 3
var max_players: int = 6
var match_minutes: float = 5.0
var overtime: bool = true
var zero_second_rule: bool = true
var has_ball: bool = true
var arena: String = "standard"
## Overrides applied on top of the default PhysicsConfig.
var physics_overrides: Dictionary = {}
## Extra rule flags interpreted by MatchRules / SimWorld.
var rules: Dictionary = {}


func display_name(lang: String) -> String:
	return name_es if lang == "es" else name_en


func description(lang: String) -> String:
	return desc_es if lang == "es" else desc_en


func is_playable() -> bool:
	return status == "playable" and enabled


func build_physics() -> PhysicsConfig:
	return PhysicsConfig.new().with_overrides(physics_overrides)
