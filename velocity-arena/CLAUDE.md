# CLAUDE.md — Guía para agentes que trabajen en VELOCITY ARENA

Juego 3D original de fútbol con coches (Godot 4.4, GDScript). Inspirado en la
profundidad jugable del género, pero con **código, nombres, vehículos, estadios,
sonidos y marca 100 % originales**. No usar assets, nombres de modos ni marcas
de juegos comerciales.

## Comandos

```bash
# Instalar Godot 4.4.1 (binario oficial, verificar SHA-512 con SHA512-SUMS.txt)
# https://github.com/godotengine/godot/releases/download/4.4.1-stable/
godot --headless --path velocity-arena --import          # genera .godot/ (class_name cache)
godot --headless --path velocity-arena --script res://tests/run_tests.gd   # tests (exit 0 = OK)
godot --path velocity-arena                               # jugar
# Capturas sin monitor (Xvfb + render por software):
python3 velocity-arena/tests/multiplayer/run_mp_tests.py   # multijugador real (servidor + 2 clientes)
xvfb-run -a -s "-screen 0 1600x900x24" godot --rendering-driver opengl3 --path velocity-arena \
  --script res://tools/screenshot.gd -- res://scenes/gameplay/match.tscn out.png 2.0 soccar_2v2 none night
```

Tras crear un script nuevo con `class_name`, ejecutar `--import` antes de los tests.

## Reglas de trabajo

1. **La física es la prioridad n.º 1.** Toda la simulación vive en
   `scripts/physics/` y es lógica pura (RefCounted, sin nodos). No meter lógica de
   juego en nodos visuales.
2. Todo parámetro de física va en `PhysicsConfig` (exportado, editable). Los modos
   sobreescriben valores con `physics_overrides` en `GameModeRegistry`.
3. Los bots **solo escriben `CarControls`**, igual que un cliente humano.
   En red, los clientes solo envían entradas; el servidor es la única autoridad.
   Todo mensaje nuevo se añade a `ServerHost.EXPECTED` (validación de tipos).
4. Nunca marcar una función como terminada sin test o verificación visual real.
   Si no se puede probar aquí (p. ej. mando físico, red real), marcarla "sin verificar".
5. Después de cada hito: tests en verde → actualizar `PROGRESS.md`, `TASKS.md`,
   `CHANGELOG.md`, `TEST_RESULTS.md` → commit.
6. Los modos no implementados se muestran deshabilitados con "EN DESARROLLO".
   Prohibido crear botones decorativos que aparenten funcionar.
7. Audio y gráficos se generan proceduralmente; cualquier asset externo debe
   registrarse en `ASSET_LICENSES.md` con autor, URL y licencia.

## Mapa rápido

| Carpeta | Contenido |
|---|---|
| `scripts/physics/` | `PhysicsConfig`, `ArenaShape` (SDF), `CarBody`, `BallBody`, `SimWorld`, `CarControls` |
| `scripts/gameplay/` | `MatchRules` (lógica pura), `match_scene.gd` (presentación) |
| `scripts/game_modes/` | `GameModeDef`, `GameModeRegistry` (33 modos, 12 jugables) |
| `scripts/bots/` | `BotController` (FSM + utilidad + predicción, 7 dificultades) |
| `scripts/visual/` | Estadio, coche, balón, efectos (todo procedural) |
| `scripts/ui/` | Menú, HUD, ajustes, estilos |
| `scripts/multiplayer/` | `NetProtocol`, `NetEndpoint` (RPC), `ServerHost`, `RoomManager`, `MatchRoom`, `ClientPrediction`, `network_manager.gd` (autoload `Net`) |
| `server/` | scripts de arranque/parada del servidor dedicado |
| `tests/` | `run_tests.gd` + suites física/juego/red; `tests/multiplayer/run_mp_tests.py` (3 procesos reales) |
| `tools/` | Capturas y scripts de depuración |

Convenciones: unidades en metros/segundos; adelante = -Z local; equipo 0 (azul)
defiende z<0 y ataca +Z; tick fijo de 120 Hz.
