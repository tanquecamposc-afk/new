# Arquitectura

```
            ┌─────────────── presentación (nodos Godot) ───────────────┐
 entrada →  │ PlayerInput ─┐                                            │
            │ BotController├─► CarControls ──┐                          │
            │              │                 ▼                          │
            │   match_scene.gd ──► MatchRules.step(dt) ──► SimWorld.step│
            │        │                    │ eventos            │        │
            │        ▼                    ▼                    ▼        │
            │ CarVisual / BallVisual / ArenaVisual / Fx / SynthAudio /  │
            │ Hud / CarCamera  (solo leen el estado de la simulación)   │
            └───────────────────────────────────────────────────────────┘
```

## Capas

1. **Simulación (`scripts/physics/`)** — objetos `RefCounted` sin dependencias de
   escena. Tick fijo de 120 Hz.
   - `PhysicsConfig` (Resource): todos los parámetros. Los modos crean copias con
     `with_overrides()`.
   - `ArenaShape`: campo de distancia con signo analítico (rectángulo redondeado
     extruido con bordes curvos + dos cajas de portería). Da distancia, normal,
     raycast por *sphere tracing* y detección de gol. La misma forma genera la
     malla visual → lo que se ve es exactamente lo que colisiona.
   - `CarBody`: cuerpo rígido (masa, inercia diagonal por eje), 4 rayos de
     suspensión, conducción, saltos, esquives, control aéreo, turbo y colisión de
     26 puntos del hitbox contra el SDF con impulsos y fricción de Coulomb.
   - `BallBody`: esfera con momento angular (I = 0.4 m r²), fricción en el punto de
     contacto, restitución con umbral de reposo, arrastre, límite de velocidad y
     modo "rastreador". `BallBody.predict()` reutiliza la misma integración para
     los bots.
   - `SimWorld`: coches + balón + pads. Colisión coche–balón (OBB–esfera con
     impulso rígido + impulso extra de "golpe"), coche–coche (cápsulas), choques,
     demoliciones, reaparición segura, pads con reaparición, *snapshots*.
     Emite eventos por tick (`ball_hit`, `demolition`, `boost_pickup`, …).
2. **Reglas (`scripts/gameplay/match_rules.gd`)** — máquina de estados
   COUNTDOWN → PLAYING → GOAL → ENDED, reloj, prórroga, regla de 0 s,
   estadísticas, tiros/paradas mediante predicción de trayectoria.
3. **Modos (`scripts/game_modes/`)** — `GameModeDef` describe equipo, duración,
   reglas y *overrides* de física; `GameModeRegistry` cataloga 33 modos con estado
   honesto (`playable`/`planned`).
4. **IA (`scripts/bots/`)** — ver sección de bots en `PHYSICS_SPECIFICATION.md`.
5. **Presentación** — visuales, audio, HUD y cámara solo leen estado y consumen
   eventos. Nada de esto afecta a la simulación.

## Por qué física propia y no `VehicleBody3D`/Jolt

- Control total y repetible de cada mecánica (esquives, flip reset, paredes).
- Mismo código en cliente, servidor *headless*, bots y tests.
- Estado serializable completo (`get_snapshot/apply_snapshot`) → base para
  servidor autoritativo, predicción/reconciliación y repeticiones.
- Medido: 0,6–1,0 ms por tick con 8 coches en GDScript (presupuesto 8,33 ms).

## Multijugador (diseño previsto, no implementado)

- Servidor dedicado Godot *headless* ejecutando `MatchRules` + `SimWorld`.
- Clientes envían solo `CarControls.to_array()` + número de secuencia.
- Snapshots (`SimWorld.get_snapshot`) a 30–60 Hz; el cliente predice su coche,
  reconcilia con el snapshot y reaplica entradas pendientes; los demás coches se
  interpolan. La determinación entre máquinas **no** se asume.
