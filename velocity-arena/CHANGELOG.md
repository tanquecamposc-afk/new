# Changelog

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
