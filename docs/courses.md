# Cursos

Cada hoyo es un **objeto de datos** (`CourseData`, `src/game/courses/types.ts`). Añadir un mapa
no requiere tocar el motor: se crea un fichero `courseXX.ts` y se registra en `courses/index.ts`.

## Piezas (builders, base del futuro editor)

| Builder | Qué crea |
|---|---|
| `floor(x0,z0,x1,z1,topY,surface)` | Suelo plano (green, arena, agua, …) |
| `ramp(from,to,width)` / `rampZ(...)` | Rampa inclinada en cualquier dirección |
| `booster(...)` | Zona aceleradora con dirección, aceleración y velocidad máxima |
| `wall(a,b)` / `polyWalls(points)` / `boxWalls(...)` | Paredes rectas, polilíneas y rectángulos |
| `windmill(id, cx, cz, x0, x1, opts)` | Edificio con túnel + aspas giratorias |
| Obstáculos `slider`, `spinner`, `bumper` | Barreras móviles, barras giratorias, setas de rebote |
| `defineCourse(...)` | Calcula límites, terreno exterior (fuera de límites), luz y decoración |

`validateCourse(course)` comprueba salida apoyada, hoyo sobre un único bloque plano y lejos
del borde, ids de obstáculos únicos, guía y `killY`.

## Superficies (`src/config/surfaces.ts`)

| Superficie | Efecto |
|---|---|
| green | Rodadura estándar |
| sand | Resistencia muy alta: frena en seco |
| water | Hazard: +1 golpe y vuelta a la última posición |
| booster | Acelera en su dirección hasta una velocidad máxima |
| bumper | Rebote vivo (restitución > 1) |
| rough (exterior) | Fuera de límites |

## Obstáculos dinámicos

Cuerpos cinemáticos de Rapier cuya pose es una **función pura del tiempo de simulación**
(`obstaclePose(def, t)`). Física, render y predictor usan la misma función, y en
multijugador basta con sincronizar el tick: no hace falta enviar posiciones.

## Los 6 hoyos de prueba

| # | Nombre | Mecánica | Par |
|---|---|---|---|
| 1 | Primer Green | Recto (BASIC) | 2 |
| 2 | Carambola | Codo en L, chaflán y bumper (WALL BOUNCE) | 3 |
| 3 | Las Colinas | Subida a meseta con obstáculo y bajada (RAMPS) | 3 |
| 4 | El Molino | Túnel con aspas: timing (WINDMILL) | 3 |
| 5 | Hora Punta | Barreras móviles y puerta vigilada (MOVING BARRIERS) | 3 |
| 6 | El Lago | Lago, acelerador lateral y arena (HAZARDS) | 3 |

El campo `guide` (ruta orientativa) sólo lo usa el bot de prueba de los tests.
