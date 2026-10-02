import { StateMachine } from './StateMachine';

/** Estados globales de la aplicación (sección 7 del diseño). */
export type AppState =
  | 'BOOT'
  | 'LOADING'
  | 'MAIN_MENU'
  | 'QUICK_PLAY'
  | 'PRIVATE_ROOM'
  | 'MATCHMAKING'
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'FINISHED'
  | 'SPECTATING'
  | 'HOLE_RESULTS'
  | 'RESULTS'
  | 'REWARDS'
  | 'ERROR';

/**
 * Flujo: BOOT → LOADING → MAIN_MENU → (QUICK_PLAY → MATCHMAKING | PRIVATE_ROOM) → LOBBY
 * → COUNTDOWN → PLAYING → FINISHED → SPECTATING → HOLE_RESULTS → (COUNTDOWN del
 * siguiente hoyo | RESULTS) → REWARDS → MAIN_MENU. Desde cualquier estado de
 * partida se puede salir al menú; cualquier estado puede ir a ERROR.
 */
export const APP_TRANSITIONS: Record<AppState, readonly AppState[]> = {
  BOOT: ['LOADING', 'ERROR'],
  LOADING: ['MAIN_MENU', 'ERROR'],
  MAIN_MENU: ['QUICK_PLAY', 'PRIVATE_ROOM', 'LOBBY', 'ERROR'],
  QUICK_PLAY: ['MATCHMAKING', 'MAIN_MENU', 'ERROR'],
  PRIVATE_ROOM: ['LOBBY', 'MAIN_MENU', 'ERROR'],
  MATCHMAKING: ['LOBBY', 'MAIN_MENU', 'ERROR'],
  LOBBY: ['COUNTDOWN', 'MAIN_MENU', 'ERROR'],
  COUNTDOWN: ['PLAYING', 'MAIN_MENU', 'ERROR'],
  PLAYING: ['FINISHED', 'HOLE_RESULTS', 'MAIN_MENU', 'ERROR'],
  FINISHED: ['SPECTATING', 'HOLE_RESULTS', 'MAIN_MENU', 'ERROR'],
  SPECTATING: ['HOLE_RESULTS', 'MAIN_MENU', 'ERROR'],
  HOLE_RESULTS: ['COUNTDOWN', 'RESULTS', 'MAIN_MENU', 'ERROR'],
  RESULTS: ['REWARDS', 'LOBBY', 'MAIN_MENU', 'ERROR'],
  REWARDS: ['MAIN_MENU', 'LOBBY', 'ERROR'],
  ERROR: ['BOOT', 'MAIN_MENU'],
};

export const createAppStateMachine = () => new StateMachine<AppState>('BOOT', APP_TRANSITIONS);
