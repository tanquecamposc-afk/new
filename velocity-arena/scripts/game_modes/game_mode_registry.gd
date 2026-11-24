class_name GameModeRegistry
extends RefCounted
## Catalogue of every planned mode. Names are original to this project.
## Modes marked "playable" are implemented and covered by tests; the rest
## are shown in the UI as "in development" and cannot be started.

static var _modes: Array[GameModeDef] = []


static func _m(id: String, es: String, en: String, desc_es: String, desc_en: String,
		category: String, status: String, team_size: int, extra: Dictionary = {}) -> GameModeDef:
	var m := GameModeDef.new()
	m.id = id
	m.name_es = es
	m.name_en = en
	m.desc_es = desc_es
	m.desc_en = desc_en
	m.category = category
	m.status = status
	m.team_size = team_size
	m.max_players = team_size * 2
	for k in extra.keys():
		m.set(k, extra[k])
	return m


static func all() -> Array[GameModeDef]:
	if _modes.is_empty():
		_build()
	return _modes


static func get_mode(id: String) -> GameModeDef:
	for m in all():
		if m.id == id:
			return m
	return null


static func playable() -> Array[GameModeDef]:
	var out: Array[GameModeDef] = []
	for m in all():
		if m.is_playable():
			out.append(m)
	return out


static func _build() -> void:
	var P := "playable"
	var N := "planned"
	_modes = [
		# --- Standard car-football ---
		_m("soccar_1v1", "Duelo 1v1", "Duel 1v1", "Duelo individual de fútbol con coches.", "One-on-one car football.", "standard", P, 1),
		_m("soccar_2v2", "Dobles 2v2", "Doubles 2v2", "Partidas en parejas.", "Two-player teams.", "standard", P, 2),
		_m("soccar_3v3", "Estándar 3v3", "Standard 3v3", "La modalidad clásica de tres contra tres.", "The classic three-versus-three.", "standard", P, 3),
		_m("chaos_4v4", "Caos 4v4", "Chaos 4v4", "Ocho coches a la vez en el campo.", "Eight cars on the pitch at once.", "standard", P, 4),
		# --- Arcade mutator modes (implemented as physics/rule overrides) ---
		_m("rebote_extremo", "Rebote Extremo", "Mega Bounce", "Balón más rápido, golpes más potentes y rebotes enormes.", "Faster ball, stronger hits, huge bounces.", "arcade", P, 3,
			{"physics_overrides": {"ball_restitution": 0.85, "hit_power_scale": 1.6, "ball_max_speed": 80.0, "ball_drag": 0.0}}),
		_m("pelota_playa", "Pelota de Playa", "Beach Ball", "Balón enorme y ligero que flota en el aire.", "A huge, light ball that floats.", "arcade", P, 3,
			{"physics_overrides": {"ball_radius": 1.6, "ball_mass": 10.0, "ball_gravity_scale": 0.55, "ball_drag": 0.35, "ball_restitution": 0.7}}),
		_m("velocidad_extrema", "Velocidad Extrema", "Speed Fiend", "Turbo infinito y velocidad máxima aumentada.", "Unlimited boost and higher top speed.", "arcade", P, 3,
			{"physics_overrides": {"unlimited_boost": true, "max_speed": 30.0, "supersonic_speed": 28.0, "supersonic_exit_speed": 27.0, "boost_accel": 14.0, "demolition_respawn_time": 1.5}}),
		_m("baja_gravedad", "Baja Gravedad", "Low Gravity", "La gravedad se reduce a un tercio.", "Gravity is reduced to a third.", "arcade", P, 3,
			{"physics_overrides": {"gravity": 2.2}}),
		_m("balon_gigante", "Balón Gigante", "Giant Ball", "Un balón tres veces más grande.", "A ball three times the size.", "arcade", P, 3,
			{"physics_overrides": {"ball_radius": 2.7, "ball_mass": 60.0}}),
		_m("balon_mini", "Balón Mini", "Mini Ball", "Un balón diminuto y rápido.", "A tiny, quick ball.", "arcade", P, 3,
			{"physics_overrides": {"ball_radius": 0.45, "ball_mass": 15.0}}),
		_m("rastreador", "Balón Rastreador", "Homing Ball", "Tras un toque, el balón vuela solo hacia la portería rival y acelera con cada golpe.", "After a touch the ball homes toward the rival goal and speeds up every hit.", "arcade", P, 2,
			{"rules": {"homing": true}}),
		# --- Planned arcade / alternative modes ---
		_m("aros", "Aros", "Hoops", "Baloncesto con coches: canastas elevadas.", "Car basketball with raised hoops.", "arcade", N, 2),
		_m("hielo", "Hockey sobre hielo", "Ice Hockey", "Disco sobre una pista de hielo sin fricción.", "A puck on low-friction ice.", "arcade", N, 3),
		_m("suelo_roto", "Suelo Explosivo", "Shatter Floor", "Rompe el suelo hexagonal del rival para marcar.", "Break the rival's hexagonal floor to score.", "arcade", N, 3),
		_m("poderes", "Caos de Poderes", "Power Chaos", "Poderes aleatorios: imán, gancho, puñetazo, congelar...", "Random powers: magnet, grapple, punch, freeze...", "arcade", N, 3),
		_m("eliminacion", "Eliminación", "Knock-Off", "Todos contra todos sin balón; el último en pie gana.", "Free-for-all, no ball; last car standing wins.", "arcade", N, 1),
		_m("pinchos", "Pinchos", "Spike Grab", "El balón se pega a tu coche al tocarlo.", "The ball sticks to your car.", "arcade", N, 3),
		_m("futbol_americano", "Touchdown", "Touchdown", "Fútbol americano con coches.", "Car American football.", "arcade", N, 3),
		_m("campo_dividido", "Campo Dividido", "Split Field", "Cada equipo limitado a su mitad.", "Teams confined to their own half.", "arcade", N, 3),
		_m("laboratorio", "Laboratorio", "Lab Arenas", "Estadios y terrenos experimentales.", "Experimental arenas and terrain.", "arcade", N, 3),
		_m("efecto", "Balón con Efecto", "Curveball", "El balón curva su trayectoria según el giro.", "The ball curves with spin.", "arcade", N, 3),
		_m("multibalon", "Multibalón", "Multi-Ball", "Varios balones a la vez.", "Several balls at once.", "arcade", N, 3),
		# --- Training / offline / online ---
		_m("free_play", "Juego libre", "Free Play", "Entrenamiento libre sin reloj.", "Free training with no clock.", "training", P, 1,
			{"match_minutes": 0.0, "overtime": false}),
		_m("custom_training", "Entrenamiento personalizado", "Custom Training", "Packs de tiros, paradas y aéreos.", "Shot, save and aerial packs.", "training", N, 1),
		_m("online_free_play", "Juego libre en línea", "Online Free Play", "Entrena con amigos en una sala.", "Train with friends in a room.", "online", N, 2),
		_m("season", "Temporada", "Season", "Liga offline contra bots.", "Offline league against bots.", "offline", N, 3),
		_m("tournament_local", "Torneo local", "Local Tournament", "Eliminatorias offline.", "Offline knockout brackets.", "offline", N, 3),
		_m("casual", "Casual en línea", "Online Casual", "Partidas en línea sin rango.", "Unranked online matches.", "online", N, 3),
		_m("competitive", "Competitivo", "Competitive", "Partidas clasificatorias con rangos.", "Ranked matches.", "competitive", N, 3),
		_m("private_match", "Partida privada", "Private Match", "Salas privadas con código.", "Private rooms with codes.", "online", N, 3),
		_m("lan", "LAN", "LAN", "Multijugador en red local.", "Local network multiplayer.", "online", N, 3),
		_m("tournaments", "Torneos en línea", "Online Tournaments", "Torneos con brackets programados.", "Scheduled bracket tournaments.", "competitive", N, 3),
		_m("workshop", "Taller", "Workshop", "Mapas y desafíos de la comunidad.", "Community maps and challenges.", "offline", N, 1),
	]
