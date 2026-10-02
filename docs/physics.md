# Física

Motor: **Rapier 3D** (`@dimforge/rapier3d-compat`), paso fijo 120 Hz, CCD en la bola.
Unidades: metros, segundos, kilogramos. Todos los valores están en `src/config/physics.ts`
y `src/config/surfaces.ts` y son **parámetros de tuning propios** (el análisis de referencia
no documenta los valores internos del juego original).

## Qué resuelve Rapier
Gravedad, contactos, fricción (que hace *rodar* a la bola: gira de verdad), restitución
(rebotes contra paredes, `CoefficientCombineRule.Max`), pendientes (bloques inclinados).

## Qué añade `Ball`
- **Golpe:** impulso real `J = m·v` (`launch`). Potencia 0–1 × `shot.maxSpeed`.
- **Resistencia a la rodadura** por superficie (`rollingResistance`, m/s²): un cuerpo rígido
  ideal rodaría para siempre. Escala velocidad lineal y angular en la misma proporción para
  no romper la condición de rodadura.
- **Detección de suelo:** rayo hacia abajo → collider → superficie (`SurfaceConfig`).
- **Parada:** velocidad lineal y angular bajo umbral durante `settleTime` **y** pendiente
  compatible con reposo (`g·sinθ·5/7 < rollingResistance`). Si no, la bola sigue rodando
  pendiente abajo.
- **Copa:** si el centro de la bola está sobre la boca y la velocidad horizontal es menor
  que `hole.captureSpeed`, la bola deja de colisionar con el green (grupos de colisión) y
  cae por gravedad hasta el fondo. Más rápida, salta el hoyo. En el labio hay una pequeña
  atracción (`lipPull`).
- **Hazards:** tocar terreno `out_of_bounds`, agua, o caer bajo `killY` → penalización
  (`GameConfig.hazardPenaltyShots`) y vuelta a la última posición de reposo.

## Sensación medida (curso 01, tiro recto)

| Potencia | Distancia | Tiempo hasta parar |
|---|---|---|
| 10 % | ~0,3 m | 0,8 s |
| 30 % | ~2,4 m | 1,9 s |
| 50 % | ~6,2 m | 2,9 s |

(Medido con `maxSpeed` 13; actualmente 14.)
