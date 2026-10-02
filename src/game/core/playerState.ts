import { StateMachine } from './StateMachine';

export type PlayerState =
  | 'IDLE'
  | 'AIMING'
  | 'SHOOTING'
  | 'BALL_MOVING'
  | 'BALL_STOPPED'
  | 'FINISHED'
  | 'SPECTATING'
  | 'DISCONNECTED'
  | 'RECONNECTED';

/**
 * Transiciones permitidas del jugador. Disparar sólo es posible desde AIMING,
 * y a AIMING sólo se llega desde IDLE: nunca con la bola en movimiento.
 */
export const PLAYER_TRANSITIONS: Record<PlayerState, readonly PlayerState[]> = {
  IDLE: ['AIMING', 'FINISHED', 'DISCONNECTED'],
  AIMING: ['IDLE', 'SHOOTING', 'DISCONNECTED'],
  SHOOTING: ['BALL_MOVING', 'DISCONNECTED'],
  BALL_MOVING: ['BALL_STOPPED', 'FINISHED', 'DISCONNECTED'],
  BALL_STOPPED: ['IDLE', 'FINISHED', 'DISCONNECTED'],
  FINISHED: ['SPECTATING', 'IDLE', 'DISCONNECTED'],
  SPECTATING: ['IDLE', 'DISCONNECTED'],
  DISCONNECTED: ['RECONNECTED'],
  RECONNECTED: ['IDLE', 'BALL_MOVING', 'FINISHED', 'SPECTATING'],
};

export const createPlayerStateMachine = () => new StateMachine<PlayerState>('IDLE', PLAYER_TRANSITIONS);
