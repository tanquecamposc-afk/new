# Changelog

## [0.9.0] — 2026-11-27 — siempre de pie, bloom y controles
### Añadido
- **Asistente de aterrizaje** (web y Godot, `_upright_assist` en `car_body.gd`): cerca de una
  superficie (suelo, pared o rampa; < 0,6 s para tocarla y < 7 m) el coche gira para caer
  sobre las ruedas respecto a esa superficie. A más altura el control aéreo no cambia y no
  actúa durante un esquive. Si queda de techo o de lado 0,35 s, se endereza solo.
  Medido: 60/60 caídas aleatorias en la web y 40/40 en Godot acaban sobre las ruedas
  (antes 50/60, 8 de techo); de techo a ruedas en 1,3 s (antes no se recuperaba solo).
- Bloom (Medio/Alto/Ultra): escena HDR → UnrealBloomPass → sRGB; reflejos en la pintura,
  cromados y cristales de los coches (entorno PMREM generado en código, solo coches).
- Porterías cerradas: marco grueso con núcleo de luz del color del equipo y LED blanco,
  paredes interiores iluminadas, galones en el suelo. Haces de focos nocturnos.
### Cambiado
- Controles: **Shift salta**, **Espacio turbo** (mando sin cambios).
- Césped más vivo y mitades con tinte de equipo suave.
### Corregido
- Con bloom los marcadores se veían negros (z-fighting por precisión de profundidad):
  pantallas separadas del marco, plano cercano de la cámara 0,12 m y depth texture de 32 bits.
- Nota técnica: three r147 aplica el tone mapping también dentro de render targets; el pase
  final solo codifica a sRGB (aplicar ACES otra vez lavaba la imagen).

## [0.8.1] — 2026-11-27 — los coches no cargaban dentro de Claude
### Corregido
- En el visor de Claude los coches 3D nunca cargaban y se veía la caja de emergencia: el
  glTF JSON llevaba la geometría en una URL `data:` y la política de seguridad del visor
  bloquea esas peticiones ("Fetch API cannot load data:…"). Reproducido con una CSP
  equivalente en Chromium. Ahora los tres coches van incrustados en la página como GLB en
  base64 y se decodifican en memoria (`tools/embed_models.py`), sin ninguna petición.
- Si un coche no carga, la pantalla de carga muestra el error en vez de fallar en silencio.
- Cámara del garaje más cerca para ver el coche.
### Pruebas
- La prueba web ahora sirve la página con una CSP como la del visor (`connect-src 'self'`).

## [0.8.0] — 2026-11-26 — carrocerías de verdad
### Cambiado
- Los coches ya no son una caja con ruedas: nueva carrocería continua (`car_shell` en
  `tools/blender/build_fleet.py`) muestreada en 56 secciones a partir de curvas suaves de
  perfil lateral, planta, línea de hombro y techo. Capó, habitáculo y maletero son una sola
  superficie; el habitáculo se estrecha sobre la línea de hombro y lleva parabrisas, luna
  trasera y ventanillas integradas; guardabarros elevados sobre cada rueda (el capó baja
  entre ellos), pasos de rueda recortados con booleanas y aletines de carbono.
- Detalles colocados sobre la superficie real (faros rasgados, pilotos en cuchilla,
  splitter, canards, tomas, difusor, alerones). Diseños originales; hitboxes sin cambios.
- No se copian modelos de juegos comerciales: las referencias se usaron solo como nivel de calidad.

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
