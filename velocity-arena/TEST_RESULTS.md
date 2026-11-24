# Resultados de tests

Entorno: contenedor Linux x86_64 (4 vCPU, sin GPU), Godot 4.4.1.stable.official
(49a5bc7b6), modo `--headless`. Fecha: 2026-11-24.

Comando:
```bash
godot --headless --path velocity-arena --script res://tests/run_tests.gd
```

## Salida literal

```
PASS test_arena_sdf (0 ms)
    · rest height 0.154, speed 0.0005, contacts 4
PASS test_car_rests_on_ground (24 ms)
    · throttle speed after 1s 9.98, after 4s 14.10 m/s
    · brake 14->0 in 0.40 s
PASS test_throttle_and_brake (73 ms)
    · supersonic after 1.60 s, speed 23.00, boost left 3.2
PASS test_boost_top_speed_and_consumption (36 ms)
    · heading after 1 s full right: (0.96514, 0.005962, 0.261667)
PASS test_steering_turns (18 ms)
    · jump heights: tap 0.84, full 2.36, double 4.89 m
PASS test_jump_heights (110 ms)
    · flip: forward speed 7.16 -> 12.41
PASS test_front_flip_and_cancel (82 ms)
PASS test_air_control_rates (18 ms)
    · wall drive: max height 14.81 m, up (-0.999998, -0.00206, 0.000052)
PASS test_wall_driving (41 ms)
    · bounce apexes: [3.97722434997559, 1.97396564483643, 1.2819756269455, 1.03588616847992]
PASS test_ball_bounce_and_rest (33 ms)
PASS test_ball_no_tunneling_at_max_speed (32 ms)
    · car 18.4 m/s -> ball 29.4 m/s
PASS test_car_hits_ball (18 ms)
PASS test_demolition_and_respawn (103 ms)
PASS test_bump_same_team_no_demo (62 ms)
    · pads: 36 total, 30 small
PASS test_boost_pads (105 ms)
PASS test_flip_reset_on_ball (0 ms)
PASS test_stability_soak (4411 ms)
    · snapshot divergence after 0.5 s: 0.000000 m
PASS test_snapshot_roundtrip (42 ms)
    · 8-car physics tick: 0.628 ms (budget at 120 Hz: 8.33 ms)
PASS test_performance_budget (151 ms)
    · 33 modes registered, 12 playable
PASS test_mode_registry (2 ms)
PASS test_kickoff_countdown_freezes_cars (77 ms)
PASS test_goal_scoring_and_reset (127 ms)
PASS test_own_goal_not_credited (65 ms)
PASS test_clock_and_end (137 ms)
PASS test_zero_second_rule_and_overtime (346 ms)
PASS test_assist_credit (159 ms)
PASS test_homing_ball_mode (247 ms)
    · bot 2v2, 2 simulated min: 37 touches, 1 goals, score 1-0, 11721 ms wall time
PASS test_bot_match_soak (11721 ms)

TOTAL: 135 checks passed, 0 failed, 18.2 s
```

## Verificación visual

Capturas reales generadas con `tools/screenshot.gd` bajo Xvfb con el
renderizador de compatibilidad (OpenGL por software, llvmpipe) en
`docs/screenshots/`:

| Captura | Qué demuestra |
|---|---|
| `main_menu.png` | Menú 3D, secciones futuras marcadas "EN DESARROLLO" |
| `match_3v3.png` | Partida 3v3 con bots, HUD, líneas del campo, nombres de bots |
| `match_1v1.png` | Partida 1v1 tras goles (marcador actualizado) |
| `free_play_sunset.png` | Juego libre, ambiente atardecer, vista frontal del coche |

## Sin verificar aquí
- Rendimiento con GPU real / Forward+ (SSAO no disponible en el renderizador por software).
- Audio (no hay dispositivo de sonido; se usó el driver nulo).
- Mandos físicos.
