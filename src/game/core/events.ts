import type { Vec3 } from '@/utils/math';

/** Catálogo tipado de eventos de juego. */
export interface GameEvents {
  SHOT_STARTED: { playerId: string; shotIndex: number; power: number; direction: Vec3; origin: Vec3 };
  SHOT_FINISHED: { playerId: string; shotIndex: number; result: ShotResultKind; restPosition: Vec3 };
  BALL_HIT: { playerId: string; speed: number; kind: 'wall' | 'ball' | 'obstacle' };
  BALL_IN_WATER: { playerId: string; position: Vec3 };
  BALL_OUT_OF_BOUNDS: { playerId: string; position: Vec3 };
  BALL_IN_HOLE: { playerId: string; shots: number; timeMs: number };
  BALL_RESET: { playerId: string; position: Vec3; reason: 'manual' | 'hazard' };
  PLAYER_STATE_CHANGED: { playerId: string; from: string; to: string };
  PLAYER_FINISHED: { playerId: string; shots: number; timeMs: number; completed: boolean };
  TIME_UP: { playerId: string };
}

export type ShotResultKind = 'rest' | 'hole' | 'water' | 'out_of_bounds' | 'timeout';
export type GameEventName = keyof GameEvents;
