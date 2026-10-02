# Puntuación y tiempo

El análisis indica que el rendimiento depende de **número de golpes** y **tiempo**, pero no
documenta ninguna fórmula. La de este proyecto es **interna y configurable**
(`src/config/scoring.ts`, `src/game/scoring/score.ts`):

```
score = (base + golpes + hoyoEnUno + bonusTiempo) × pointMultiplier
golpes      = (par − strokes) × (bajo par ? underParPoints : overParPoints)
bonusTiempo = timeBonusMax × clamp(1 − t / (timeBonusWindowSec × timeMultiplier), 0, 1)
sin completar → dnfScore
```

Clasificación (`compareResults`): completados primero → menos golpes → menos tiempo.

**Tiempo:** cada jugador tiene `startTick` y `finishTick`; el tiempo se mide en ticks de
simulación (no en reloj de pared), así es idéntico en cliente y servidor.
Límite por hoyo: `GameConfig.holeTimeLimitSec` (120 s, valor de tuning; `null` = sin límite).
Golpes = tiros + penalizaciones (agua / fuera de límites). Límite de golpes:
`GameConfig.maxShotsPerHole`.
