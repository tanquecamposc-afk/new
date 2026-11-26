# Changelog

## [0.7.0] — 2026-11-25 — coches deportivos y estadio nuevo
### Cambiado
- Coches rediseñados (`tools/blender/build_fleet.py`): carrocería con secciones de aristas
  marcadas (pliegue de hombro, cintura de botella), morro en cuña, carrocería baja con pasos
  de rueda reales recortados con booleanas, techo pintado y ventanas tintadas, splitter con
  canards, faros rasgados, capó con abultamiento y rejillas, tomas laterales, difusor con
  aletas, escapes dobles. Velocity X con alerón cuello de cisne y toma en el techo; Bastion
  estilo rally-raid (barra de luces, snorkel, defensa, placa); Lancer con aletas de tiburón y
  alerón de doble plano. Mismas hitboxes que antes.
- Estadio web reconstruido: pared inferior sólida con paneles y color de equipo, vidrio con
  rejilla hexagonal animada, dos anillos de gradas escalonadas con asientos, palcos
  iluminados, público 3D instanciado que se balancea y salta con los goles, cubo marcador
  colgante y pantallas en los fondos con el marcador en vivo, techo con batería de focos,
  emblema central original y zonas de fondo hexagonales en el césped.
- Densidad de público por preset (Medio 55 %, Alto 85 %, Ultra 100 %; Bajo/Competitivo sin público).
### Corregido
- La cámara (muelle) se volvía inestable por debajo de ~10 FPS y podía meterse en la pared:
  ahora usa la solución exacta del muelle críticamente amortiguado.
### Herramientas
- `tools/glb_to_gltf_json.py`: convierte .glb a glTF JSON con buffer embebido (para la web).

## [0.6.0] — 2026-11-25 — versión web: gráficos, física y rendimiento
### Añadido
- Flota de 3 coches originales en Blender (`tools/blender/build_fleet.py`): **Velocity X**
  (equilibrado), **Bastion** (alto y compacto) y **Lancer** (largo y bajo), cada uno con su
  propia hitbox, inercia, posición y radio de ruedas en la física web. Garaje para elegir coche;
  el coche viaja en la presencia de la sala y el anfitrión lo aplica.
- Fluidez: física fija a 120 Hz con **interpolación de render** entre ticks; cámara con muelle
  críticamente amortiguado y giro con velocidad angular limitada; rutas calientes sin
  asignaciones (vectores temporales reutilizados); balón con subpasos anti-túnel.
- Efectos con partículas en pool: llama y partículas de turbo, estela supersónica, humo de
  neumáticos, marcas de derrape, chispas contra paredes, impacto del balón con onda,
  demolición, explosión de gol (partículas + onda + destello + sacudida de cámara).
- Estadio: césped 2048 con mapa de normales, costillas estructurales, anillos LED, porterías
  tubulares con red hexagonal, cinta LED animada, público animado, cubierta, torres de luz,
  skyline, sombras de contacto, ambiente noche/día/atardecer.
- Balón con paneles hexagonales y costuras emisivas que brillan con la velocidad.
- Presets gráficos Competitivo/Bajo/Medio/Alto/Ultra y medidor de rendimiento (F3):
  FPS medio, 1 % low, frame time, coste de física por tick, draw calls.
- Pantalla de carga con progreso y límite de 20 s.
### Corregido
- La carrocería del coche no se dibujaba en la versión web (se buscaba un Mesh "Body" y
  GLTFLoader crea un Group con hijos).

## [0.5.0] — 2026-11-25 — pasada de calidad
### Añadido
- Vehículo "Velocity X" v3 modelado en **Blender** con superficies de subdivisión
  (`tools/blender/build_car.py` → `assets/vehicles/velocity_x.glb`), pintura por equipo.
- Estadio: graderío continuo de 26 filas alrededor del campo con público por asiento,
  cinta LED animada, cubierta con tira de luz y pantallas gigantes.
- Iluminación: tonemapping AgX, SSAO, SSIL, SSR, niebla volumétrica nocturna, sonda de
  reflexión, luz ambiente neutra; césped con mapa de normales; cielo con estrellas finas.
- Repeticiones de gol (búfer de 7 s, cámara lenta, cámara cinematográfica) en partidas offline.
- Líneas de velocidad en supersónico (desactivadas con "reducir movimiento").
- Capturas con Forward+ real (Vulkan por software) mediante `tools/screenshot.tscn`.
### Corregido
- La herramienta de capturas no aplicaba el ambiente (se ejecutaba sin autoloads).

## [0.4.0] — 2026-11-25
### Añadido
- **Multijugador real**:
  - servidor dedicado autoritativo (`--server`) sobre ENet/UDP, simulación a 120 Hz y snapshots a 60 Hz;
  - los clientes envían solo entradas, con redundancia;
  - predicción del coche local con rebobinado y re-simulación, y suavizado visual;
  - sincronización de ticks por RTT;
  - salas con código `VA-XXXXXX` y contraseña, anfitrión, equipos, listo, espectadores y chat (texto y rápido);
  - navegador de salas, cola casual con conteo real y relleno con bots etiquetados;
  - reconexión con token (plaza reservada 60 s), LAN con descubrimiento UDP y host desde el juego;
  - simulador de latencia/jitter/pérdida, overlay de red (F4) y validación de todos los mensajes en el servidor.
- Menú EN LÍNEA, lobby y escena de partida online.
- Despliegue: `Dockerfile`, `docker-compose.yml`, `.env.example`, `server/start_server.sh`, `server/stop_server.sh`.
- Tests: 11 unitarios de red y un test de integración con 3 procesos reales en 3 condiciones de red.
- Visual: vehículo "Velocity X" v2 (pasos de rueda, llantas de radios, LED), césped mejorado, costillas estructurales, anillo LED, cielo nocturno estrellado y luces de relleno.
### Corregido
- Emojis que la fuente no podía mostrar, sustituidos por texto.

## [0.3.0] — 2026-11-24
### Añadido
- Proyecto Godot 4.4 `velocity-arena/` con arquitectura modular.
- Motor de física propio a 120 Hz: estadio SDF con paredes curvas, coche con
  suspensión por rayos, saltos variables, doble salto, esquives, cancelación,
  flip reset, control aéreo, derrape, turbo, supersónico, demoliciones, pads.
- Balón con giro, fricción, restitución y predicción de trayectoria.
- `MatchRules`: saque, reloj, regla de 0 s, prórroga, goles, asistencias,
  paradas, tiros, demoliciones, MVP.
- Registro de 33 modos (12 jugables: 1v1, 2v2, 3v3, 4v4, Rebote Extremo, Pelota
  de Playa, Velocidad Extrema, Baja Gravedad, Balón Gigante, Balón Mini, Balón
  Rastreador, Juego libre).
- Bots con 7 dificultades, roles de equipo, aéreos y recuperación.
- Estadio "Velocity Stadium" procedural (noche/día/atardecer), vehículo
  "Velocity X", efectos de partículas, audio sintetizado.
- Menú principal 3D, HUD, marcador, pausa, fin de partida, ajustes, ES/EN,
  perfil local con XP.
- 31 tests automáticos (135 comprobaciones) y herramienta de capturas con Xvfb.
