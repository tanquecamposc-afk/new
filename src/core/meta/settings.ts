/**
 * Player settings: schema, defaults and a validator that turns ANY stored value into a safe
 * settings object. Pure data logic — the client decides where it is stored and how each option
 * is applied.
 */
import { clamp } from '../sim/math.js';

export const SETTINGS_SCHEMA_VERSION = 1;

export type Locale = 'es-PE' | 'en';
export const LOCALES: readonly Locale[] = ['es-PE', 'en'];

export type QualityPreset = 'low' | 'medium' | 'high' | 'epic';
export const QUALITY_PRESETS: readonly QualityPreset[] = ['low', 'medium', 'high', 'epic'];

/** 0 means "no limit". */
export const FPS_LIMITS: readonly number[] = [30, 60, 120, 144, 0];

export type InputAction =
  | 'moveForward'
  | 'moveBack'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'sprint'
  | 'crouch'
  | 'pause'
  | 'restart'
  | 'help';

export const INPUT_ACTIONS: readonly InputAction[] = [
  'moveForward',
  'moveBack',
  'moveLeft',
  'moveRight',
  'jump',
  'sprint',
  'crouch',
  'pause',
  'restart',
  'help',
];

export type Bindings = Record<InputAction, string[]>;

export interface GameSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  locale: Locale;
  display: {
    qualityPreset: QualityPreset;
    /** Internal resolution multiplier, 0.5 .. 1. */
    renderScale: number;
    maxFps: number;
    /** Vertical field of view in degrees. */
    fov: number;
    showFps: boolean;
  };
  audio: {
    master: number;
    sfx: number;
    ambience: number;
    ui: number;
  };
  controls: {
    mouseSensitivity: number;
    invertY: boolean;
    toggleCrouch: boolean;
    bindings: Bindings;
  };
  accessibility: {
    reducedMotion: boolean;
    uiScale: number;
  };
}

export const SETTING_LIMITS = Object.freeze({
  renderScale: { min: 0.5, max: 1 },
  fov: { min: 60, max: 100 },
  volume: { min: 0, max: 1 },
  mouseSensitivity: { min: 0.1, max: 3 },
  uiScale: { min: 0.8, max: 1.4 },
});

export function defaultBindings(): Bindings {
  return {
    moveForward: ['KeyW'],
    moveBack: ['KeyS'],
    moveLeft: ['KeyA'],
    moveRight: ['KeyD'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    // Not Ctrl: in a browser Ctrl+W / Ctrl+S / Ctrl+D are shortcuts the page cannot block, and
    // crouch-walking would close the tab.
    crouch: ['KeyC'],
    pause: ['KeyP'],
    restart: ['Backspace'],
    help: ['KeyH'],
  };
}

export function defaultSettings(): GameSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    locale: 'es-PE',
    display: { qualityPreset: 'medium', renderScale: 1, maxFps: 60, fov: 75, showFps: false },
    audio: { master: 0.8, sfx: 0.9, ambience: 0.4, ui: 0.7 },
    controls: { mouseSensitivity: 0.7, invertY: false, toggleCrouch: false, bindings: defaultBindings() },
    accessibility: { reducedMotion: false, uiScale: 1 },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

const KEY_CODE_PATTERN = /^[A-Za-z0-9]{1,24}$/;

function sanitizeBindings(raw: unknown): Bindings {
  const result = defaultBindings();
  if (!isRecord(raw)) return result;
  for (const action of INPUT_ACTIONS) {
    const value = raw[action];
    if (!Array.isArray(value)) continue;
    const codes = value.filter((code): code is string => typeof code === 'string' && KEY_CODE_PATTERN.test(code));
    const unique = [...new Set(codes)].slice(0, 3);
    if (unique.length > 0) result[action] = unique;
  }
  return result;
}

/**
 * Builds a valid settings object from untrusted data (old saves, hand-edited storage, garbage).
 * Unknown keys are dropped, out-of-range numbers are clamped, wrong types fall back to defaults.
 */
export function sanitizeSettings(raw: unknown): GameSettings {
  const base = defaultSettings();
  if (!isRecord(raw)) return base;
  const display = isRecord(raw['display']) ? raw['display'] : {};
  const audio = isRecord(raw['audio']) ? raw['audio'] : {};
  const controls = isRecord(raw['controls']) ? raw['controls'] : {};
  const accessibility = isRecord(raw['accessibility']) ? raw['accessibility'] : {};
  const { volume } = SETTING_LIMITS;
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    locale: oneOf(raw['locale'], LOCALES, base.locale),
    display: {
      qualityPreset: oneOf(display['qualityPreset'], QUALITY_PRESETS, base.display.qualityPreset),
      renderScale: numberIn(display['renderScale'], SETTING_LIMITS.renderScale.min, SETTING_LIMITS.renderScale.max, base.display.renderScale),
      maxFps: oneOf(display['maxFps'], FPS_LIMITS, base.display.maxFps),
      fov: Math.round(numberIn(display['fov'], SETTING_LIMITS.fov.min, SETTING_LIMITS.fov.max, base.display.fov)),
      showFps: bool(display['showFps'], base.display.showFps),
    },
    audio: {
      master: numberIn(audio['master'], volume.min, volume.max, base.audio.master),
      sfx: numberIn(audio['sfx'], volume.min, volume.max, base.audio.sfx),
      ambience: numberIn(audio['ambience'], volume.min, volume.max, base.audio.ambience),
      ui: numberIn(audio['ui'], volume.min, volume.max, base.audio.ui),
    },
    controls: {
      mouseSensitivity: numberIn(
        controls['mouseSensitivity'],
        SETTING_LIMITS.mouseSensitivity.min,
        SETTING_LIMITS.mouseSensitivity.max,
        base.controls.mouseSensitivity,
      ),
      invertY: bool(controls['invertY'], base.controls.invertY),
      toggleCrouch: bool(controls['toggleCrouch'], base.controls.toggleCrouch),
      bindings: sanitizeBindings(controls['bindings']),
    },
    accessibility: {
      reducedMotion: bool(accessibility['reducedMotion'], base.accessibility.reducedMotion),
      uiScale: numberIn(accessibility['uiScale'], SETTING_LIMITS.uiScale.min, SETTING_LIMITS.uiScale.max, base.accessibility.uiScale),
    },
  };
}

/** Actions that share a key, e.g. { KeyC: ['crouch', 'help'] }. Empty object = no conflicts. */
export function findBindingConflicts(bindings: Bindings): Record<string, InputAction[]> {
  const byCode = new Map<string, InputAction[]>();
  for (const action of INPUT_ACTIONS) {
    for (const code of bindings[action]) {
      const list = byCode.get(code) ?? [];
      list.push(action);
      byCode.set(code, list);
    }
  }
  const conflicts: Record<string, InputAction[]> = {};
  for (const [code, actions] of byCode) if (actions.length > 1) conflicts[code] = actions;
  return conflicts;
}
