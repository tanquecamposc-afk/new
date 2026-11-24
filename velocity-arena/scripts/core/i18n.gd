extends Node
## Minimal string table for Spanish (default) and English (autoload "I18n").
## Use I18n.t("key") or I18n.t("key", [args]) for "%s"-style formatting.

signal language_changed

const STRINGS := {
	"play": {"es": "JUGAR", "en": "PLAY"},
	"training": {"es": "ENTRENAMIENTO", "en": "TRAINING"},
	"free_play": {"es": "Juego libre", "en": "Free Play"},
	"modes": {"es": "MODOS DE JUEGO", "en": "GAME MODES"},
	"settings": {"es": "AJUSTES", "en": "SETTINGS"},
	"profile": {"es": "PERFIL", "en": "PROFILE"},
	"exit": {"es": "SALIR DEL JUEGO", "en": "EXIT GAME"},
	"exhibition": {"es": "Exhibición contra bots", "en": "Exhibition vs bots"},
	"start_match": {"es": "COMENZAR PARTIDA", "en": "START MATCH"},
	"back": {"es": "VOLVER", "en": "BACK"},
	"resume": {"es": "CONTINUAR", "en": "RESUME"},
	"restart": {"es": "REINICIAR", "en": "RESTART"},
	"main_menu": {"es": "MENÚ PRINCIPAL", "en": "MAIN MENU"},
	"rematch": {"es": "REVANCHA", "en": "REMATCH"},
	"paused": {"es": "PAUSA", "en": "PAUSED"},
	"goal": {"es": "¡GOL!", "en": "GOAL!"},
	"overtime": {"es": "PRÓRROGA", "en": "OVERTIME"},
	"blue": {"es": "AZUL", "en": "BLUE"},
	"orange": {"es": "NARANJA", "en": "ORANGE"},
	"wins": {"es": "¡%s GANA!", "en": "%s WINS!"},
	"draw": {"es": "EMPATE", "en": "DRAW"},
	"difficulty": {"es": "Dificultad de los bots", "en": "Bot difficulty"},
	"team_size": {"es": "Formato", "en": "Format"},
	"mode": {"es": "Modo", "en": "Mode"},
	"duration": {"es": "Duración", "en": "Duration"},
	"unlimited": {"es": "Ilimitado", "en": "Unlimited"},
	"minutes": {"es": "%d min", "en": "%d min"},
	"coming_soon": {"es": "EN DESARROLLO", "en": "IN DEVELOPMENT"},
	"playable": {"es": "JUGABLE", "en": "PLAYABLE"},
	"language": {"es": "Idioma", "en": "Language"},
	"video": {"es": "Gráficos", "en": "Graphics"},
	"audio": {"es": "Audio", "en": "Audio"},
	"camera": {"es": "Cámara", "en": "Camera"},
	"gameplay": {"es": "Juego y accesibilidad", "en": "Gameplay & accessibility"},
	"controls": {"es": "Controles", "en": "Controls"},
	"scoreboard": {"es": "MARCADOR", "en": "SCOREBOARD"},
	"player": {"es": "Jugador", "en": "Player"},
	"score": {"es": "Puntos", "en": "Score"},
	"goals": {"es": "Goles", "en": "Goals"},
	"assists": {"es": "Asist.", "en": "Assists"},
	"saves": {"es": "Paradas", "en": "Saves"},
	"shots": {"es": "Tiros", "en": "Shots"},
	"demos": {"es": "Demol.", "en": "Demos"},
	"ping": {"es": "Ping", "en": "Ping"},
	"ball_cam": {"es": "Cámara balón", "en": "Ball cam"},
	"car_cam": {"es": "Cámara coche", "en": "Car cam"},
	"demolished": {"es": "%s DEMOLIÓ A %s", "en": "%s DEMOLISHED %s"},
	"you": {"es": "Tú", "en": "You"},
	"xp_earned": {"es": "+%d XP", "en": "+%d XP"},
	"level": {"es": "Nivel %d", "en": "Level %d"},
	"match_stats": {"es": "Estadísticas", "en": "Match stats"},
	"freeplay_help": {
		"es": "Retroceso: reiniciar coche · T: balón hacia ti · Y: tiro a portería · H: balón sobre el coche · B: turbo infinito · G: gravedad · F3: depuración",
		"en": "Backspace: reset car · T: ball at you · Y: shot at goal · H: ball on car · B: unlimited boost · G: gravity · F3: debug"},
	"controls_help": {
		"es": "W/S acelerar/frenar · A/D girar · Espacio saltar · Shift turbo · Ctrl derrape/giro aéreo · Q/E giro aéreo · C cámara balón · R vista trasera · Tab marcador · Esc pausa",
		"en": "W/S throttle/brake · A/D steer · Space jump · Shift boost · Ctrl powerslide/air roll · Q/E air roll · C ball cam · R rear view · Tab scoreboard · Esc pause"},
	"fov": {"es": "Campo de visión", "en": "Field of view"},
	"cam_distance": {"es": "Distancia", "en": "Distance"},
	"cam_height": {"es": "Altura", "en": "Height"},
	"cam_stiffness": {"es": "Rigidez", "en": "Stiffness"},
	"cam_shake": {"es": "Vibración de cámara", "en": "Camera shake"},
	"preset": {"es": "Calidad", "en": "Quality"},
	"fullscreen": {"es": "Pantalla completa", "en": "Fullscreen"},
	"vsync": {"es": "Sincronización vertical", "en": "VSync"},
	"render_scale": {"es": "Escala de renderizado", "en": "Render scale"},
	"master_volume": {"es": "Volumen general", "en": "Master volume"},
	"sfx_volume": {"es": "Efectos", "en": "Effects"},
	"crowd_volume": {"es": "Público", "en": "Crowd"},
	"colorblind": {"es": "Colores para daltonismo", "en": "Colorblind team colors"},
	"reduced_motion": {"es": "Reducir movimiento", "en": "Reduced motion"},
	"reduced_flashing": {"es": "Reducir destellos", "en": "Reduced flashing"},
	"show_debug": {"es": "Panel de físicas (F3)", "en": "Physics debug (F3)"},
	"apply": {"es": "Aplicar", "en": "Apply"},
	"low": {"es": "Baja", "en": "Low"},
	"medium": {"es": "Media", "en": "Medium"},
	"high": {"es": "Alta", "en": "High"},
	"ultra": {"es": "Ultra", "en": "Ultra"},
	"kickoff": {"es": "SAQUE", "en": "KICKOFF"},
	"go": {"es": "¡YA!", "en": "GO!"},
	"supersonic": {"es": "SUPERSÓNICO", "en": "SUPERSONIC"},
	"matches_played": {"es": "Partidas jugadas", "en": "Matches played"},
	"wins_label": {"es": "Victorias", "en": "Wins"},
	"total_goals": {"es": "Goles totales", "en": "Total goals"},
	"not_available": {"es": "No disponible todavía: %s", "en": "Not available yet: %s"},
	"arena": {"es": "Estadio", "en": "Arena"},
	"time_of_day": {"es": "Ambiente", "en": "Lighting"},
	"night": {"es": "Noche", "en": "Night"},
	"day": {"es": "Día", "en": "Day"},
	"sunset": {"es": "Atardecer", "en": "Sunset"},
}

var language: String = "es"


func _ready() -> void:
	var s: Node = get_node_or_null("/root/Settings")
	if s:
		language = str(s.get_value("game", "language"))


func set_language(lang: String) -> void:
	language = lang
	var s: Node = get_node_or_null("/root/Settings")
	if s:
		s.set_value("game", "language", lang)
	language_changed.emit()


func t(key: String, args: Array = []) -> String:
	var entry: Dictionary = STRINGS.get(key, {})
	var text: String = str(entry.get(language, entry.get("en", key)))
	if not args.is_empty():
		text = text % args
	return text
