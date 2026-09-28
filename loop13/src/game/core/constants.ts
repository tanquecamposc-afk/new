/** Global tuning constants for LOOP 13. */

/** Loop length in in-game seconds: 12:47:00 → 13:00:00. */
export const LOOP_SECONDS = 13 * 60;
/** Clock at t = 0, in seconds since midnight (12:47:00). */
export const LOOP_START_CLOCK = 12 * 3600 + 47 * 60;

/** Convert an HH:MM(:SS) string (e.g. "12:52" or "12:59:30") into loop seconds. */
export function at(clock: string): number {
  const [h, m, s = 0] = clock.split(':').map(Number);
  return h * 3600 + m * 60 + s - LOOP_START_CLOCK;
}

export function formatClock(t: number, withSeconds = false): string {
  const total = Math.floor(LOOP_START_CLOCK + Math.max(0, t));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return withSeconds ? `${hm}:${String(s).padStart(2, '0')}` : hm;
}

export const PLAYER = {
  radius: 0.34,
  height: 1.78,
  crouchHeight: 1.15,
  walkSpeed: 2.6,
  runSpeed: 4.6,
  sprintSpeed: 6.4,
  crouchSpeed: 1.5,
  jumpVelocity: 5.4,
  gravity: 18,
  stepHeight: 0.38,
  maxHealth: 100,
  interactRange: 2.4,
};

export const FLASHLIGHT = {
  /** Battery drain per real second while on (100 = full). */
  drainPerSecond: 100 / 240,
  batteryRecharge: 60,
};

export const WALL_T = 0.25;

/** The number the loop has actually been running for. The true iteration count. */
export const TRUE_ITERATION = 4211;
export const CORE_AUTH_CODE = '4211';
export const SECURITY_CODE = '7391';
export const SYMBOL_SEQUENCE = ['tri', 'circle', 'diamond', 'cross'] as const;
export type SymbolId = 'tri' | 'circle' | 'diamond' | 'cross' | 'square' | 'wave';
export const SYMBOL_GLYPH: Record<SymbolId, string> = {
  tri: '△', circle: '○', diamond: '◇', cross: '✕', square: '□', wave: '∿',
};

/** Timed relay windows (Puzzle 5). */
export const RELAY_WINDOWS = {
  A: { start: at('12:50'), end: at('12:51'), room: 'LAB' },
  B: { start: at('12:54'), end: at('12:55'), room: 'ARCHIVES' },
  C: { start: at('12:58'), end: at('12:59'), room: 'REACTOR' },
} as const;
export type RelayId = keyof typeof RELAY_WINDOWS;

export const DEBUG = typeof location !== 'undefined' && /[?&]debug/.test(location.search);
