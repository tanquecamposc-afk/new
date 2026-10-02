import { BALL_Y, boxWalls, defineCourse, floor } from './builders';

/** COURSE 01 — BASIC: recto y sencillo, para aprender el disparo. */
export const course01 = defineCourse({
  id: 'c01-basic',
  name: 'Primer Green',
  difficulty: 1,
  par: 2,
  spawnPoints: [{ x: 0, y: BALL_Y, z: 8 }],
  hole: { position: { x: 0, y: 0, z: -8 } },
  surfaces: [floor(-2, -10, 2, 10)],
  walls: boxWalls(-2, -10, 2, 10),
  guide: [
    { x: 0, y: 0, z: 8 },
    { x: 0, y: 0, z: -8 },
  ],
  decorationSeed: 11,
});
