/**
 * Presentation state shared between the game loop and the React UI. It mirrors what the
 * simulation reports — it is never the source of truth for gameplay.
 */
import type { MoveState } from '../../core/sim/character.js';
import type { SaveFile } from '../../core/meta/save.js';
import type { GameSettings } from '../../core/meta/settings.js';
import { createStore } from './store.js';
import { loadSave } from './persistence.js';

export type Screen = 'lobby' | 'match';
export type Overlay = 'none' | 'clickToPlay' | 'pause' | 'settings' | 'results';
export type LookMode = 'locked' | 'drag';
export type FatalError = 'webgl';

export interface HudState {
  moveState: MoveState;
  /** Horizontal speed in m/s. */
  speed: number;
  /** Compass heading in degrees, 0 = north (-Z), clockwise. */
  heading: number;
  anchorsReached: number;
  anchorsTotal: number;
  timerTicks: number;
  timerRunning: boolean;
  nextHintKey: string | null;
  /** Bearing to the next anchor relative to the view, -180..180 (0 = dead ahead). */
  nextBearing: number | null;
  nextDistance: number | null;
  fps: number;
  frameMs: number;
}

export interface ResultState {
  ticks: number;
  splits: number[];
  isNewBest: boolean;
  previousBestTicks: number | null;
}

export interface Toast {
  id: number;
  text: string;
}

export interface AppState {
  screen: Screen;
  overlay: Overlay;
  /** Overlay to return to when the settings panel closes. */
  settingsReturn: Overlay;
  loading: boolean;
  lookMode: LookMode;
  showHelp: boolean;
  hud: HudState;
  result: ResultState | null;
  toast: Toast | null;
  save: SaveFile;
  /** Settings being edited in the panel; null when the panel is closed. */
  draftSettings: GameSettings | null;
  fatalError: FatalError | null;
  contextLost: boolean;
  /** True when the browser refused to persist the save (shown to the player). */
  storageBlocked: boolean;
}

export function initialHud(): HudState {
  return {
    moveState: 'idle',
    speed: 0,
    heading: 0,
    anchorsReached: 0,
    anchorsTotal: 0,
    timerTicks: 0,
    timerRunning: false,
    nextHintKey: null,
    nextBearing: null,
    nextDistance: null,
    fps: 0,
    frameMs: 0,
  };
}

export const appStore = createStore<AppState>({
  screen: 'lobby',
  overlay: 'none',
  settingsReturn: 'none',
  loading: false,
  lookMode: 'locked',
  showHelp: true,
  hud: initialHud(),
  result: null,
  toast: null,
  save: loadSave(),
  draftSettings: null,
  fatalError: null,
  contextLost: false,
  storageBlocked: false,
});

/** Settings currently in effect: the draft while the panel is open, otherwise the saved ones. */
export function activeSettings(state: AppState = appStore.get()): GameSettings {
  return state.draftSettings ?? state.save.settings;
}
