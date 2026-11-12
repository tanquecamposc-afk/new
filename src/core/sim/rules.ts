/**
 * Per-mode rules of a match. One simulation engine runs every experience; what changes between a
 * movement course, a firing range and a skirmish is only this data. Later modes (Royale, Recarga,
 * Pilares) add fields here instead of forking the engine.
 */
import { secondsToTicks } from './config.js';
import { AMMO_RESERVE_CAP, AMMO_TYPES, getWeaponDef, type AmmoType } from './weapons.js';
import { getConsumableDef } from './items.js';

export const RULES_SCHEMA_VERSION = 1;

export type LoadoutEntry = { weaponId: string } | { itemId: string; count: number };

export interface MatchRules {
  schemaVersion: typeof RULES_SCHEMA_VERSION;
  modeId: string;
  ruleSetVersion: number;
  /** Weapons, damage, inventory and loot are active. */
  combat: boolean;
  /** The map's checkpoint course is active. */
  course: boolean;
  /** Countdown before the match goes live: nobody moves or shoots during it. */
  warmupTicks: number;
  win: 'none' | 'last_team_alive';
  respawn: 'none' | 'timer';
  respawnDelayTicks: number;
  /** What happens to someone who falls out of the world. */
  voidOutcome: 'respawn' | 'eliminate';
  health: { start: number; max: number };
  shield: { start: number; max: number };
  fallDamage: { enabled: boolean; startMeters: number; perMeter: number };
  friendlyFire: boolean;
  /**
   * Multiplier on the damage one bot deals to another (1 = no change). Practice modes lower it so
   * bots do not wipe each other out before the human has had a fight.
   */
  botVsBotDamageScale: number;
  switchCancelsReload: boolean;
  /** An empty magazine reloads by itself when there is reserve ammunition. */
  autoReload: boolean;
  dropLootOnElimination: boolean;
  /** Ticks until a taken map pickup comes back; 0 = never. */
  lootRespawnTicks: number;
  loadout: readonly LoadoutEntry[];
  startingAmmo: Readonly<Record<AmmoType, number>>;
  /** Ticks of invulnerability after (re)spawning. */
  spawnProtectionTicks: number;
  /**
   * End-game reveal for modes without a closing zone: once few contenders are left (or the match
   * has gone on long enough) everyone's position is revealed at regular intervals, so the last
   * runners always find each other.
   */
  showdown: { enabled: boolean; contendersAtMost: number; afterTicks: number; pingEveryTicks: number };
}

const NO_AMMO: Readonly<Record<AmmoType, number>> = Object.freeze({ light: 0, medium: 0, shells: 0, heavy: 0 });
const NO_SHOWDOWN = Object.freeze({ enabled: false, contendersAtMost: 0, afterTicks: 0, pingEveryTicks: 1 });

/** Phase 1 mode: run the checkpoint course. No weapons at all. */
export const TRAINING_COURSE_RULES: Readonly<MatchRules> = Object.freeze({
  schemaVersion: RULES_SCHEMA_VERSION,
  modeId: 'training_course',
  ruleSetVersion: 1,
  combat: false,
  course: true,
  warmupTicks: 0,
  win: 'none',
  respawn: 'none',
  respawnDelayTicks: 0,
  voidOutcome: 'respawn',
  health: { start: 100, max: 100 },
  shield: { start: 0, max: 100 },
  fallDamage: { enabled: false, startMeters: 8, perMeter: 14 },
  friendlyFire: false,
  botVsBotDamageScale: 1,
  switchCancelsReload: true,
  autoReload: true,
  dropLootOnElimination: false,
  lootRespawnTicks: 0,
  loadout: [],
  startingAmmo: NO_AMMO,
  spawnProtectionTicks: 0,
  showdown: NO_SHOWDOWN,
});

/**
 * Free practice against target dummies. The runner starts hurt and without shield so that every
 * consumable can be tried; pickups come back and nobody is out for long.
 */
export const FIRING_RANGE_RULES: Readonly<MatchRules> = Object.freeze({
  schemaVersion: RULES_SCHEMA_VERSION,
  modeId: 'firing_range',
  ruleSetVersion: 1,
  combat: true,
  course: false,
  warmupTicks: 0,
  win: 'none',
  respawn: 'timer',
  respawnDelayTicks: secondsToTicks(3),
  voidOutcome: 'respawn',
  health: { start: 60, max: 100 },
  shield: { start: 0, max: 100 },
  fallDamage: { enabled: true, startMeters: 8, perMeter: 14 },
  friendlyFire: false,
  botVsBotDamageScale: 1,
  switchCancelsReload: true,
  autoReload: true,
  dropLootOnElimination: false,
  lootRespawnTicks: secondsToTicks(12),
  loadout: [{ weaponId: 'starter_ar' }, { weaponId: 'starter_shotgun' }, { weaponId: 'starter_pistol' }],
  startingAmmo: Object.freeze({ light: 96, medium: 120, shells: 20, heavy: 0 }),
  spawnProtectionTicks: 0,
  showdown: NO_SHOWDOWN,
});

/** Every runner for themselves against practice bots; the last one standing wins. */
export const SKIRMISH_RULES: Readonly<MatchRules> = Object.freeze({
  schemaVersion: RULES_SCHEMA_VERSION,
  modeId: 'skirmish',
  ruleSetVersion: 1,
  combat: true,
  course: false,
  warmupTicks: secondsToTicks(3),
  win: 'last_team_alive',
  respawn: 'none',
  respawnDelayTicks: 0,
  voidOutcome: 'eliminate',
  health: { start: 100, max: 100 },
  shield: { start: 50, max: 100 },
  fallDamage: { enabled: true, startMeters: 8, perMeter: 14 },
  friendlyFire: false,
  botVsBotDamageScale: 0.4,
  switchCancelsReload: true,
  autoReload: true,
  dropLootOnElimination: true,
  lootRespawnTicks: 0,
  loadout: [{ weaponId: 'starter_pistol' }, { itemId: 'bandage', count: 3 }],
  startingAmmo: Object.freeze({ light: 48, medium: 0, shells: 0, heavy: 0 }),
  spawnProtectionTicks: 0,
  showdown: Object.freeze({ enabled: true, contendersAtMost: 2, afterTicks: secondsToTicks(150), pingEveryTicks: secondsToTicks(6) }),
});

/** Throws when a ruleset is malformed, so bad data never reaches a running match. */
export function validateRules(rules: MatchRules): void {
  const fail = (message: string): never => {
    throw new Error(`rules "${rules.modeId}": ${message}`);
  };
  if (rules.schemaVersion !== RULES_SCHEMA_VERSION) fail('unsupported schemaVersion');
  if (!/^[a-z0-9_]{1,48}$/.test(rules.modeId)) fail('invalid modeId');
  const ticks: Array<[string, number]> = [
    ['warmupTicks', rules.warmupTicks],
    ['respawnDelayTicks', rules.respawnDelayTicks],
    ['lootRespawnTicks', rules.lootRespawnTicks],
    ['spawnProtectionTicks', rules.spawnProtectionTicks],
  ];
  for (const [name, value] of ticks) {
    if (!Number.isInteger(value) || value < 0 || value > 60 * 60 * 60) fail(`${name} out of range`);
  }
  for (const [name, pool] of [
    ['health', rules.health],
    ['shield', rules.shield],
  ] as const) {
    if (!Number.isFinite(pool.max) || pool.max < 0 || pool.max > 1000) fail(`${name}.max out of range`);
    if (!Number.isFinite(pool.start) || pool.start < 0 || pool.start > pool.max) fail(`${name}.start out of range`);
  }
  if (rules.health.max <= 0 || rules.health.start <= 0) fail('a player must start alive');
  const fall = rules.fallDamage;
  if (!Number.isFinite(fall.startMeters) || fall.startMeters < 0 || !Number.isFinite(fall.perMeter) || fall.perMeter < 0) {
    fail('invalid fall damage');
  }
  if (rules.respawn === 'timer' && rules.win !== 'none') fail('timed respawn cannot be combined with last-team-alive');
  if (!Number.isFinite(rules.botVsBotDamageScale) || rules.botVsBotDamageScale < 0 || rules.botVsBotDamageScale > 1) {
    fail('botVsBotDamageScale out of range');
  }
  const showdown = rules.showdown;
  if (!Number.isInteger(showdown.pingEveryTicks) || showdown.pingEveryTicks < 1) fail('showdown.pingEveryTicks out of range');
  if (!Number.isInteger(showdown.afterTicks) || showdown.afterTicks < 0) fail('showdown.afterTicks out of range');
  if (!Number.isInteger(showdown.contendersAtMost) || showdown.contendersAtMost < 0) fail('showdown.contendersAtMost out of range');
  for (const type of AMMO_TYPES) {
    const amount = rules.startingAmmo[type];
    if (!Number.isInteger(amount) || amount < 0 || amount > AMMO_RESERVE_CAP) fail(`startingAmmo.${type} out of range`);
  }
  for (const entry of rules.loadout) {
    if ('weaponId' in entry) {
      if (!getWeaponDef(entry.weaponId)) fail(`unknown weapon in loadout: ${entry.weaponId}`);
    } else {
      const def = getConsumableDef(entry.itemId);
      if (!def) fail(`unknown item in loadout: ${entry.itemId}`);
      else if (!Number.isInteger(entry.count) || entry.count <= 0 || entry.count > def.maxStack) fail(`bad count for ${entry.itemId}`);
    }
  }
}
