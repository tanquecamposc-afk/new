# Resultados de tests

Entorno: contenedor Linux x86_64 (4 vCPU, sin GPU), Godot 4.4.1.stable.official
(49a5bc7b6), modo `--headless`. Fecha: 2026-11-25.

Comando:
```bash
godot --headless --path velocity-arena --script res://tests/run_tests.gd
```

## Salida literal

```
Godot Engine v4.4.1.stable.official.49a5bc7b6 - https://godotengine.org

PASS test_arena_sdf (0 ms)
    · rest height 0.154, speed 0.0005, contacts 4
PASS test_car_rests_on_ground (22 ms)
    · throttle speed after 1s 9.98, after 4s 14.10 m/s
    · brake 14->0 in 0.40 s
PASS test_throttle_and_brake (61 ms)
    · supersonic after 1.60 s, speed 23.00, boost left 3.2
PASS test_boost_top_speed_and_consumption (31 ms)
    · heading after 1 s full right: (0.96514, 0.005962, 0.261667)
PASS test_steering_turns (17 ms)
    · jump heights: tap 0.84, full 2.36, double 4.89 m
PASS test_jump_heights (96 ms)
    · flip: forward speed 7.16 -> 12.41
PASS test_front_flip_and_cancel (48 ms)
PASS test_air_control_rates (13 ms)
    · wall drive: max height 14.81 m, up (-0.999998, -0.00206, 0.000052)
PASS test_wall_driving (36 ms)
    · bounce apexes: [3.97722434997559, 1.97396564483643, 1.2819756269455, 1.03588616847992]
PASS test_ball_bounce_and_rest (28 ms)
PASS test_ball_no_tunneling_at_max_speed (31 ms)
    · car 18.4 m/s -> ball 29.4 m/s
PASS test_car_hits_ball (16 ms)
PASS test_demolition_and_respawn (93 ms)
PASS test_bump_same_team_no_demo (58 ms)
    · pads: 36 total, 30 small
PASS test_boost_pads (98 ms)
PASS test_flip_reset_on_ball (0 ms)
PASS test_stability_soak (4040 ms)
    · snapshot divergence after 0.5 s: 0.000000 m
PASS test_snapshot_roundtrip (38 ms)
    · 8-car physics tick: 0.587 ms (budget at 120 Hz: 8.33 ms)
PASS test_performance_budget (141 ms)
    · 33 modes registered, 12 playable
PASS test_mode_registry (1 ms)
PASS test_kickoff_countdown_freezes_cars (77 ms)
PASS test_goal_scoring_and_reset (130 ms)
PASS test_own_goal_not_credited (63 ms)
PASS test_clock_and_end (138 ms)
PASS test_zero_second_rule_and_overtime (348 ms)
PASS test_assist_credit (204 ms)
PASS test_homing_ball_mode (228 ms)
    · bot 2v2, 2 simulated min: 37 touches, 1 goals, score 1-0, 11410 ms wall time
PASS test_bot_match_soak (11411 ms)
PASS test_input_roundtrip_and_validation (0 ms)
    · snapshot size for 2 cars: 315 bytes
PASS test_snapshot_roundtrip_full_state (81 ms)
PASS test_room_codes_and_names (0 ms)
PASS test_lobby_rules (1 ms)
PASS test_inputs_and_authority (60 ms)
PASS test_chat_rate_limit (0 ms)
PASS test_reconnection (1 ms)
PASS test_matchmaking_queue (2 ms)
PASS test_input_buffer (0 ms)
    · prediction @100 ms: avg error 0.120 m, reconciliations 297, inputs late 23, lead 14 ticks
PASS test_prediction_with_simulated_latency (942 ms)

TOTAL: 185 checks passed, 0 failed, 18.6 s
```

Multijugador con procesos reales: ver `MULTIPLAYER_TEST_RESULTS.md`.

## Verificación visual

Capturas reales generadas con `tools/screenshot.gd` bajo Xvfb con el
renderizador de compatibilidad (OpenGL por software, llvmpipe) en
`docs/screenshots/`:

| Captura | Qué demuestra |
|---|---|
| `main_menu.png` | Menú 3D, secciones futuras marcadas "EN DESARROLLO" |
| `match_3v3.png` | Partida 3v3 con bots, HUD, líneas del campo, nombres de bots |
| `match_2v2.png` | Partida 2v2 con el estadio y coche v2 |
| `online_lobby.png` / `online_match.png` | Lobby y partida en red contra un servidor dedicado real |
| `car_velocity_x_v2.png` | Primer plano del vehículo original v2 |
| `free_play_sunset.png` | Juego libre, ambiente atardecer, vista frontal del coche |

## Sin verificar aquí
- Rendimiento con GPU real / Forward+ (SSAO no disponible en el renderizador por software).
- Audio (no hay dispositivo de sonido; se usó el driver nulo).
- Mandos físicos.

## Versión web 0.6.0 (Chromium + Playwright, render por software SwiftShader, sin GPU)

Pruebas en `/tmp` (no versionadas): carga, solo contra bots y sala simulada con 2 pestañas
(mock de `claude.use("room")` sobre BroadcastChannel, solo en test).

| Prueba | Resultado |
|---|---|
| Los 3 modelos cargan; la carrocería se dibuja | OK (`models: velocity_x, bastion, lancer`) |
| Partida solo: fase play, coche acelera | OK (13,2 m/s tras 3 s) |
| Sala: aparece en "salas abiertas" | OK |
| Cliente entra con código, el anfitrión ve su coche | OK |
| Predicción del cliente vs anfitrión (desfase visual) | 0,02–0,13 m tras reconciliar |
| Gol sincronizado anfitrión → cliente | OK (1-1 en ambos) |
| Errores JS | ninguno |

Física por tick (8 coches, 2400 ticks, 3 ejecuciones): antes 0,060–0,087 ms, ahora
0,059–0,088 ms → **igual** (ruido); ~1 % del presupuesto de 8,3 ms a 120 Hz.

Render a 640×360 con **SwiftShader (CPU)** — solo sirve para comparar costes, no son FPS reales:

| Versión / preset | FPS | 1 % low | draw calls | triángulos |
|---|---|---|---|---|
| 0.5 (antes) | 8,2 | 5,5 | 92 | 33k |
| 0.6 Bajo | 9,9 | 3,8 | 100 | 110k |
| 0.6 Competitivo | 8,3 | 4,3 | 219 | 307k |
| 0.6 Alto | 2,3 | 1,9 | 248 | 256k |

Sin verificar: FPS con GPU real (60/120/144), mandos físicos, sala real de Claude con
varias personas, móviles. Capturas en `docs/screenshots/web/`.

## Versión web 0.7.0 (coches deportivos + estadio)

| Prueba | Resultado |
|---|---|
| 3 modelos nuevos cargan, carrocería visible | OK |
| Solo contra bots | OK |
| Sala: listada, unirse con código, coche del cliente visible en anfitrión | OK |
| Gol sincronizado anfitrión → cliente | OK (1-1 en ambos) |
| Errores JS | ninguno |
| Tests Godot (con el nuevo `velocity_x.glb`) | 188/188 OK |

Render SwiftShader (CPU, sin GPU) a 640×360 — solo comparativo:
Competitivo 6,9 FPS, Bajo 8,0 FPS, Medio 1,3 FPS (público 3D + sombras: ~630k triángulos,
~300 draw calls). El estadio nuevo cuesta más; en GPU real no se ha medido (sin verificar).
Nota: la prueba de 2 pestañas usa el preset Competitivo porque ambas comparten una CPU.
