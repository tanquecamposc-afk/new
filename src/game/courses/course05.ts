import type { SliderDef } from '@/game/obstacles/types';
import { BALL_Y, boxWalls, defineCourse, floor, wall } from './builders';

const slider = (id: string, z: number, amplitude: number, length: number, period: number, phase: number): SliderDef => ({
  id,
  kind: 'slider',
  center: { x: 0, y: 0.26, z },
  size: { x: 0.32, y: 0.5, z: length },
  axis: { x: 1, z: 0 },
  amplitude,
  period,
  phase,
});

/** COURSE 05 — MOVING BARRIERS: barreras que cruzan la calle y una puerta vigilada. */
export const course05 = defineCourse({
  id: 'c05-barriers',
  name: 'Hora Punta',
  difficulty: 3,
  par: 3,
  spawnPoints: [{ x: 0, y: BALL_Y, z: 11 }],
  hole: { position: { x: 0, y: 0, z: -10 } },
  surfaces: [floor(-2.5, -13, 2.5, 13)],
  walls: [...boxWalls(-2.5, -13, 2.5, 13), wall(-2.5, -4, -0.65, -4), wall(0.65, -4, 2.5, -4)],
  obstacles: [slider('slider-1', 6, 1.4, 1.8, 3.2, 0), slider('slider-2', 1, 1.4, 1.8, 2.4, 0.5), slider('gate', -4.7, 1, 1.2, 2, 0.25)],
  guide: [
    { x: 0, y: 0, z: 11 },
    { x: 0, y: 0, z: -3 },
    { x: 0, y: 0, z: -10 },
  ],
  decorationSeed: 53,
});
