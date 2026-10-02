import { BALL_Y, defineCourse, floor, rampZ, wall } from './builders';

const H = 0.9;
/** Las paredes laterales cubren también la altura de la meseta. */
const WALL_EXTRA = 0.45;

/** COURSE 03 — RAMPS: subida a una meseta y bajada al green. Sin fuerza suficiente, la bola vuelve rodando. */
export const course03 = defineCourse({
  id: 'c03-ramps',
  name: 'Las Colinas',
  difficulty: 2,
  par: 3,
  spawnPoints: [{ x: 0, y: BALL_Y, z: 10 }],
  hole: { position: { x: 0, y: 0, z: -10 } },
  surfaces: [
    floor(-2, 4, 2, 12),
    rampZ(-2, 2, 4, 0, 0, H),
    floor(-2, -3, 2, 0, H),
    rampZ(-2, 2, -3, H, -6, 0),
    floor(-2, -12, 2, -6),
  ],
  walls: [
    // Paredes laterales: normales en las zonas bajas, altas junto a rampas y meseta.
    wall(-2, 12, -2, 4.2),
    wall(2, 12, 2, 4.2),
    wall(-2, 4.2, -2, -6.2, 0, H + WALL_EXTRA),
    wall(2, 4.2, 2, -6.2, 0, H + WALL_EXTRA),
    wall(-2, -6.2, -2, -12),
    wall(2, -6.2, 2, -12),
    wall(-2, 12, 2, 12),
    wall(-2, -12, 2, -12),
    // Obstáculo lateral en la meseta: obliga a elegir lado.
    wall(-0.7, -1.5, 0.7, -1.5, H),
  ],
  guide: [
    { x: 0, y: 0, z: 10 },
    { x: 0, y: H, z: 0 },
    { x: 1.3, y: H, z: -1.5 },
    { x: 0, y: H, z: -3 },
    { x: 0, y: 0, z: -10 },
  ],
  decorationSeed: 37,
});

