/**
 * Presentation state shared between the game loop and the React UI. It mirrors what the
 * simulation reports — it is never the source of truth for gameplay.
 */
import type { MoveState } from '../../core/sim/character.js';
import type { PlayableMode, SaveFile } from '../../core/meta/save.js';
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

export interface SlotHud {
  kind: 'weapon' | 'consumable' | 'empty';
  /** Weapon id or item id. */
  id: string | null;
  /** Rounds in the magazine, or units in the stack. */
  count: number;
}

export interface PickupHud {
  kind: 'weapon' | 'consumable' | 'ammo';
  defId: string;
  count: number;
  /** Taking it will drop what is in hand (the inventory is full). */
  swap: boolean;
}

export interface TargetHud {
  name: string;
  isBot: boolean;
  dummy: boolean;
  distance: number;
  /** Health bars are only shown for practice dummies. */
  showBars: boolean;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
}

/** Everything the combat HUD shows, straight from the simulation's state. */
export interface CombatHud {
  enabled: boolean;
  alive: boolean;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  slots: SlotHud[];
  active: number;
  /** Selected weapon, or null when the hands hold something else. */
  weaponId: string | null;
  ammoInMag: number;
  magazine: number;
  reserve: number;
  /** 0..1 progress, or -1 when not reloading / not using an item. */
  reload: number;
  use: number;
  useItemId: string | null;
  /** Half-gap of the crosshair as a percentage of the view height. */
  spread: number;
  /** Looking through a scope: the HUD darkens the edges and hides the crosshair lines. */
  scope: boolean;
  pickup: PickupHud | null;
  target: TargetHud | null;
  aliveCount: number;
  totalCount: number;
  eliminations: number;
  phase: 'warmup' | 'active' | 'results';
  /** Whole seconds left of the countdown (0 once live). */
  countdown: number;
  /** Bearings (-180..180, relative to the view) of rivals revealed by the end-game pulse. */
  pings: number[];
}

/** Confirmation, by the simulation, that a shot of the player landed. */
export interface HitMarker {
  id: number;
  kind: 'body' | 'head' | 'shield' | 'kill';
}

export interface DamageArc {
  id: number;
  /** Where the damage came from relative to the view, -180..180. */
  bearing: number;
}

export interface DamageNumber {
  id: number;
  /** Screen position, 0..1. */
  x: number;
  y: number;
  amount: number;
  kind: 'body' | 'head' | 'shield';
}

export interface FeedEntry {
  id: number;
  killer: string | null;
  killerBot: boolean;
  victim: string;
  victimBot: boolean;
  weaponId: string | null;
  cause: string;
  headshot: boolean;
  /** How the entry relates to the player, for highlighting. */
  own: 'killer' | 'victim' | null;
}

export interface Banner {
  id: number;
  kind: 'go' | 'elimination' | 'eliminated' | 'victory';
  text: string;
}

export interface CourseResult {
  kind: 'course';
  ticks: number;
  splits: number[];
  isNewBest: boolean;
  previousBestTicks: number | null;
}

export interface PlacementRow {
  name: string;
  isBot: boolean;
  placement: number;
  eliminations: number;
  local: boolean;
}

export interface SkirmishResult {
  kind: 'skirmish';
  won: boolean;
  placement: number;
  total: number;
  eliminations: number;
  damageDealt: number;
  /** 0..1, shots that hit over shots fired. */
  accuracy: number;
  headshots: number;
  activeTicks: number;
  /** Who took the player out, when it was somebody. */
  eliminatedBy: string | null;
  isBestPlacement: boolean;
  standings: PlacementRow[];
}

export type ResultState = CourseResult | SkirmishResult;

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
  /** A touch screen is in use: show the on-screen controls. */
  touch: boolean;
  showHelp: boolean;
  /** Mode of the match in progress (or the last one played). */
  mode: PlayableMode;
  hud: HudState;
  combat: CombatHud;
  hitMarker: HitMarker | null;
  /** Increments every time the player takes damage (drives the screen flash). */
  hurtPulse: number;
  damageArcs: DamageArc[];
  damageNumbers: DamageNumber[];
  feed: FeedEntry[];
  banner: Banner | null;
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

export function initialCombat(): CombatHud {
  return {
    enabled: false,
    alive: true,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    slots: [],
    active: 0,
    weaponId: null,
    ammoInMag: 0,
    magazine: 0,
    reserve: 0,
    reload: -1,
    use: -1,
    useItemId: null,
    spread: 0,
    scope: false,
    pickup: null,
    target: null,
    aliveCount: 0,
    totalCount: 0,
    eliminations: 0,
    phase: 'active',
    countdown: 0,
    pings: [],
  };
}

const save = loadSave();

export const appStore = createStore<AppState>({
  screen: 'lobby',
  overlay: 'none',
  settingsReturn: 'none',
  loading: false,
  lookMode: 'locked',
  touch: false,
  showHelp: true,
  mode: save.profile.lastMode,
  hud: initialHud(),
  combat: initialCombat(),
  hitMarker: null,
  hurtPulse: 0,
  damageArcs: [],
  damageNumbers: [],
  feed: [],
  banner: null,
  result: null,
  toast: null,
  save,
  draftSettings: null,
  fatalError: null,
  contextLost: false,
  storageBlocked: false,
});

/** Settings currently in effect: the draft while the panel is open, otherwise the saved ones. */
export function activeSettings(state: AppState = appStore.get()): GameSettings {
  return state.draftSettings ?? state.save.settings;
}
