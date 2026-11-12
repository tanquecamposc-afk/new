/**
 * Everything the simulation knows about one participant: body, intent, inventory and combat
 * bookkeeping. Plain data — the systems that change it live in simulation.ts and gunplay.ts.
 */
import type { PlayerStats } from '../types.js';
import type { BotBrain } from './bot.js';
import type { CharacterState } from './character.js';
import type { CourseState } from './course.js';
import type { InputFrame } from './input.js';
import type { Inventory } from './inventory.js';
import type { SpawnPoint } from './map.js';
import type { LoadoutEntry } from './rules.js';
import type { AmmoType } from './weapons.js';

/** docs/02 §2.4. `knocked` and `spectating` arrive with team modes. */
export type AliveState = 'alive' | 'eliminated';

/**
 * Where a shot starts. Humans aim with the third-person camera, so their shots follow the
 * crosshair; bots have no camera and shoot from their eyes.
 */
export type AimMode = 'camera' | 'eye';

export interface CombatTotals {
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  damageTaken: number;
  eliminations: number;
  headshots: number;
}

export interface ReloadState {
  slot: number;
  instanceId: number;
  startTick: number;
  finishTick: number;
}

export interface UseState {
  slot: number;
  itemId: string;
  startTick: number;
  finishTick: number;
}

export interface CombatState {
  stats: PlayerStats;
  aliveState: AliveState;
  inventory: Inventory;
  /** 0 = hip, 1 = fully aiming down sights. */
  adsBlend: number;
  /** Extra spread built up by recent shots, in degrees. */
  bloomDegrees: number;
  fireHeld: boolean;
  reloadHeld: boolean;
  interactHeld: boolean;
  /** Ticks left during which a trigger press is still honoured (semi-automatic weapons). */
  fireBufferTicks: number;
  /** A dry-fire click was already reported for the current trigger press. */
  dryFireReported: boolean;
  /** The selected weapon cannot fire before this tick (it is still being drawn). */
  equipReadyTick: number;
  reload: ReloadState | null;
  use: UseState | null;
  lastShotTick: number;
  lastDamageTick: number;
  lastAttackerId: string | null;
  eliminatedAtTick: number | null;
  eliminatedBy: string | null;
  /** Final position in the match (1 = winner), set on elimination or when the match ends. */
  placement: number | null;
  respawnAtTick: number | null;
  protectedUntilTick: number;
  totals: CombatTotals;
}

export interface SimPlayer {
  readonly id: string;
  readonly name: string;
  readonly isBot: boolean;
  readonly teamId: number;
  readonly spawn: SpawnPoint;
  readonly char: CharacterState;
  /** Last sanitized input (look direction persists when no new input arrives). */
  readonly input: InputFrame;
  /** Per-player training course, when the mode has one. */
  readonly course: CourseState | null;
  respawnCount: number;
  readonly combat: CombatState;
  readonly aimMode: AimMode;
  /** Counts toward "last team alive". Target dummies do not. */
  readonly contender: boolean;
  /** Salt mixed into this player's random draws (spread, recoil). */
  readonly rngSalt: number;
  /** Decides the input of a bot each tick; null for humans. */
  readonly brain: BotBrain | null;
  /** Overrides of the mode's defaults for this participant. */
  readonly loadout: readonly LoadoutEntry[] | null;
  readonly startingAmmo: Readonly<Record<AmmoType, number>> | null;
  readonly healthOverride: { start: number; max: number } | null;
  readonly shieldOverride: { start: number; max: number } | null;
}

export function emptyTotals(): CombatTotals {
  return { shotsFired: 0, shotsHit: 0, damageDealt: 0, damageTaken: 0, eliminations: 0, headshots: 0 };
}
