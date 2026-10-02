import { BALL_Y, booster, boxWalls, defineCourse, floor } from './builders';

/**
 * COURSE 06 — HAZARDS: lago en mitad del recorrido. La línea directa cae al
 * agua; la ruta segura va por el acelerador lateral. Arena delante del hoyo.
 */
export const course06 = defineCourse({
  id: 'c06-hazards',
  name: 'El Lago',
  difficulty: 4,
  par: 3,
  spawnPoints: [{ x: -1.5, y: BALL_Y, z: 10 }],
  hole: { position: { x: 0, y: 0, z: -9.5 } },
  surfaces: [
    floor(-3, 2, 3, 12),
    floor(-3, -2, 1.2, 2, -0.25, 'water'),
    booster(1.2, -2, 3, 2, { x: 0, z: -1 }, 5, 6.5),
    floor(-3, -5, 3, -2),
    floor(-3, -7, -1.2, -5),
    floor(-1.2, -7, 1.2, -5, 0, 'sand'),
    floor(1.2, -7, 3, -5),
    floor(-3, -12, 3, -7),
  ],
  walls: boxWalls(-3, -12, 3, 12),
  guide: [
    { x: -1.5, y: 0, z: 10 },
    { x: 2.1, y: 0, z: 3 },
    { x: 2.1, y: 0, z: -2.5 },
    { x: 0, y: 0, z: -9.5 },
  ],
  decorationSeed: 67,
});
