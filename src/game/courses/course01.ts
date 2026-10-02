import { PhysicsConfig } from '@/config/physics';
import { boxWalls, floor } from './builders';
import type { CourseData } from './types';

const R = PhysicsConfig.ball.radius;

/** COURSE 01 — BASIC: recto y sencillo, para aprender el disparo. */
export const course01: CourseData = {
  id: 'c01-basic',
  name: 'Primer Green',
  difficulty: 1,
  par: 2,
  spawnPoints: [{ x: 0, y: R, z: 8 }],
  hole: { position: { x: 0, y: 0, z: -8 } },
  surfaces: [floor(-2, -10, 2, 10, 0, 'green')],
  walls: boxWalls(-2, -10, 2, 10, 0),
  outOfBounds: [floor(-40, -40, 40, 40, -0.6, 'rough')],
  boundaries: { killY: -4, min: { x: -2, y: -1, z: -10 }, max: { x: 2, y: 2, z: 10 } },
  decorations: [
    { kind: 'tree', position: { x: -5, y: -0.6, z: -6 }, scale: 1.2 },
    { kind: 'tree', position: { x: 5.5, y: -0.6, z: 2 } },
    { kind: 'tree', position: { x: -6, y: -0.6, z: 7 }, scale: 0.9 },
    { kind: 'bush', position: { x: 3.4, y: -0.6, z: -9 } },
    { kind: 'bush', position: { x: -3.5, y: -0.6, z: 1 } },
    { kind: 'rock', position: { x: 4, y: -0.6, z: 9 } },
    { kind: 'flower', position: { x: -3, y: -0.6, z: -3 } },
    { kind: 'flower', position: { x: 3, y: -0.6, z: 5 } },
  ],
  lighting: { sunDirection: { x: -0.5, y: 1, z: 0.35 }, sunIntensity: 2.4, ambientIntensity: 0.9 },
};
