import { BALL_Y, defineCourse, floor, polyWalls, wall } from './builders';

/** COURSE 02 — WALL BOUNCE: codo en L; la ruta buena usa la pared del fondo y el chaflán. */
export const course02 = defineCourse({
  id: 'c02-bounce',
  name: 'Carambola',
  difficulty: 2,
  par: 3,
  spawnPoints: [{ x: 0, y: BALL_Y, z: 8 }],
  hole: { position: { x: 9, y: 0, z: -6 } },
  surfaces: [floor(-2, -8, 2, 10), floor(2, -8, 12, -4)],
  walls: [
    ...polyWalls([
      [-2, 10],
      [2, 10],
      [2, -4],
      [12, -4],
      [12, -8],
      [-2, -8],
    ]),
    // Chaflán a 45° en la esquina: devuelve la bola hacia el hoyo.
    wall(-2, -5.6, 0.4, -8),
  ],
  obstacles: [{ id: 'bumper-1', kind: 'bumper', center: { x: 5.6, y: 0.2, z: -6.3 }, radius: 0.38, height: 0.4 }],
  guide: [
    { x: 0, y: 0, z: 8 },
    { x: 0, y: 0, z: -5.8 },
    { x: 9, y: 0, z: -6 },
  ],
  decorationSeed: 23,
});
