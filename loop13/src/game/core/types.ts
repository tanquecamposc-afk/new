/** Shared type definitions. */

export type GamePhase =
  | 'MENU' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'DIALOGUE' | 'PUZZLE' | 'CUTSCENE'
  | 'CHASE' | 'DANGER' | 'DEATH' | 'RESET' | 'ENDING' | 'NEW_GAME_PLUS';

/** Modal panels that can be shown on top of the game. */
export type Panel =
  | 'none' | 'memory' | 'document' | 'keypad' | 'cctv' | 'symbols' | 'terminal'
  | 'core' | 'dialogue' | 'inspect';

export type AreaId =
  | 'HUB' | 'LABORATORY' | 'SECURITY' | 'DORMITORY' | 'REACTOR' | 'TEMPORAL_CORE'
  | 'ARCHIVES' | 'MEDICAL' | 'MAINTENANCE' | 'RESTRICTED' | 'UNKNOWN';

export type Mood = 'EXPLORATION' | 'MYSTERY' | 'TENSION' | 'DANGER' | 'CHASE' | 'RESET' | 'ENDING' | 'SILENCE';

export type LightMode = 'normal' | 'blackout' | 'alarm' | 'observer' | 'core' | 'final';

export type ItemId =
  | 'keycard' | 'flashlight' | 'battery' | 'tool' | 'datadrive' | 'strangekey'
  | 'medkit' | 'accesscard' | 'sample';

export type EndingId = 'ESCAPE' | 'SACRIFICE' | 'OBSERVER' | 'TRUE';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  graphics: 'low' | 'medium' | 'high';
  shadows: 'off' | 'low' | 'high';
  particles: 'low' | 'medium' | 'high';
  postprocessing: boolean;
  cameraSensitivity: number;
  mouseSensitivity: number;
  fov: number;
  subtitles: boolean;
  aiVoice: boolean;
  invertY: boolean;
}

/** Lifetime profile: survives New Game / New Game+. */
export interface Profile {
  achievements: string[];
  endings: EndingId[];
  cluesEver: string[];
  docsEver: string[];
  secretsEver: string[];
  totalLoops: number;
  deaths: number;
  ngPlusUnlocked: boolean;
  playTime: number;
}

/** The current playthrough's memory. Survives loop resets, not New Game. */
export interface RunState {
  started: boolean;
  loop: number;
  ngPlus: number;
  clues: string[];
  docs: string[];
  secrets: string[];
  areas: string[];
  camsSeen: string[];
  anomalies: string[];
  mugStates: string[];
  itemsFound: string[];
  flags: string[];
  deaths: number;
  loopsCompleted: number;
}

export interface Notification {
  id: number;
  kind: 'clue' | 'document' | 'secret' | 'achievement' | 'item' | 'info' | 'ending' | 'memory';
  title: string;
  text: string;
  time: number;
}

export interface Subtitle {
  id: number;
  speaker: string;
  text: string;
  until: number;
}
