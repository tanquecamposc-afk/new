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
  | 'RESULTS'
  | 'REWARDS'
  | 'ERROR';

export const APP_TRANSITIONS: Record<AppState, readonly AppState[]> = {
  BOOT: ['LOADING', 'ERROR'],
  LOADING: ['MAIN_MENU', 'PLAYING', 'ERROR'],
  MAIN_MENU: ['QUICK_PLAY', 'PRIVATE_ROOM', 'PLAYING', 'ERROR'],
  QUICK_PLAY: ['MATCHMAKING', 'MAIN_MENU', 'ERROR'],
  PRIVATE_ROOM: ['LOBBY', 'MAIN_MENU', 'ERROR'],
  MATCHMAKING: ['LOBBY', 'MAIN_MENU', 'ERROR'],
  LOBBY: ['COUNTDOWN', 'MAIN_MENU', 'ERROR'],
  COUNTDOWN: ['PLAYING', 'LOBBY', 'ERROR'],
  PLAYING: ['FINISHED', 'RESULTS', 'MAIN_MENU', 'ERROR'],
  FINISHED: ['SPECTATING', 'RESULTS', 'MAIN_MENU', 'ERROR'],
  SPECTATING: ['RESULTS', 'MAIN_MENU', 'ERROR'],
  RESULTS: ['REWARDS', 'MAIN_MENU', 'PLAYING', 'ERROR'],
  REWARDS: ['MAIN_MENU', 'ERROR'],
  ERROR: ['BOOT', 'MAIN_MENU'],
};

export const createAppStateMachine = () => new StateMachine<AppState>('BOOT', APP_TRANSITIONS);
