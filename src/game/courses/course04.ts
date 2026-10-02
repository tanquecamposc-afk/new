import { BALL_Y, boxWalls, defineCourse, floor, windmill } from './builders';

const mill = windmill('windmill-1', 0, 0, -2.5, 2.5, { angularSpeed: 1.2 });

/** COURSE 04 — WINDMILL: hay que pasar por el túnel cuando las aspas lo dejan libre. */
export const course04 = defineCourse({
  id: 'c04-windmill',
  name: 'El Molino',
  difficulty: 3,
  par: 3,
  spawnPoints: [{ x: 0, y: BALL_Y, z: 9 }],
  hole: { position: { x: 0, y: 0, z: -8 } },
  surfaces: [floor(-2.5, -11, 2.5, 11)],
  walls: [...boxWalls(-2.5, -11, 2.5, 11), ...mill.walls],
  obstacles: [mill.obstacle],
  guide: [
    { x: 0, y: 0, z: 9 },
    { x: 0, y: 0, z: 2.5 },
    { x: 0, y: 0, z: -1.5 },
    { x: 0, y: 0, z: -8 },
  ],
  decorationSeed: 41,
});
