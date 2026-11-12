/**
 * Weapon catalogue. The combat numbers (damage, headshot multiplier, magazine, rate of fire,
 * reload time, base range) are the ORIGINAL prototype values of docs/03 §3.2 and mirror
 * data/weapons.example.json; the handling numbers (spread, recoil, equip time) are original feel
 * parameters. None of them are the stats of any existing game.
 *
 * A client never sends any of these values: it only says "fire" and the simulation looks the
 * weapon up here.
 */
import type { WeaponSpec } from '../types.js';

export type AmmoType = 'light' | 'medium' | 'shells' | 'heavy';
export const AMMO_TYPES: readonly AmmoType[] = ['light', 'medium', 'shells', 'heavy'];

/** Most ammunition of one type a player can carry in reserve. */
export const AMMO_RESERVE_CAP = 999;

export interface WeaponDef extends WeaponSpec {
  /** i18n key of the display name. */
  nameKey: string;
  ammoType: AmmoType;
  /** Holding the trigger keeps firing. Otherwise every shot needs a new press. */
  automatic: boolean;
  /** Rays per shot (shotguns fire several pellets, each with `baseDamage`). */
  pellets: number;
  /** Half-angle of the spread cone, in degrees, standing still. */
  hipSpreadDegrees: number;
  adsSpreadDegrees: number;
  /** Spread added by each shot, recovered over time. */
  bloomPerShotDegrees: number;
  bloomMaxDegrees: number;
  bloomRecoverDegreesPerSecond: number;
  /** Spread added at full sprint speed (scaled by speed below that). */
  moveSpreadDegrees: number;
  airSpreadDegrees: number;
  /** Beyond this distance the shot does not travel at all. */
  maxRangeMeters: number;
  /** Ticks after selecting the weapon before it can fire. */
  equipTicks: number;
  adsFovDegrees: number;
  /** View kick per shot reported to the shooter's client. */
  recoilPitchDegrees: number;
  recoilYawDegrees: number;
  /** How far the shot can be heard by bots. */
  noiseRadius: number;
  /** Distance at which a bot likes to fight with this weapon. */
  idealRangeMeters: number;
}

function define(def: WeaponDef): Readonly<WeaponDef> {
  validateWeaponDef(def);
  return Object.freeze(def);
}

/** Throws when a definition would let the simulation misbehave (zero rate of fire, NaN...). */
export function validateWeaponDef(def: WeaponDef): void {
  const positive: Array<[string, number]> = [
    ['baseDamage', def.baseDamage],
    ['headshotMultiplier', def.headshotMultiplier],
    ['magazine', def.magazine],
    ['reloadSeconds', def.reloadSeconds],
    ['shotsPerSecond', def.shotsPerSecond],
    ['rangeMeters', def.rangeMeters],
    ['maxRangeMeters', def.maxRangeMeters],
    ['pellets', def.pellets],
    ['adsFovDegrees', def.adsFovDegrees],
  ];
  for (const [name, value] of positive) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`weapon ${def.id}: ${name} must be a positive number`);
  }
  const nonNegative: Array<[string, number]> = [
    ['hipSpreadDegrees', def.hipSpreadDegrees],
    ['adsSpreadDegrees', def.adsSpreadDegrees],
    ['bloomPerShotDegrees', def.bloomPerShotDegrees],
    ['bloomMaxDegrees', def.bloomMaxDegrees],
    ['bloomRecoverDegreesPerSecond', def.bloomRecoverDegreesPerSecond],
    ['moveSpreadDegrees', def.moveSpreadDegrees],
    ['airSpreadDegrees', def.airSpreadDegrees],
    ['equipTicks', def.equipTicks],
    ['recoilPitchDegrees', def.recoilPitchDegrees],
    ['recoilYawDegrees', def.recoilYawDegrees],
    ['noiseRadius', def.noiseRadius],
    ['idealRangeMeters', def.idealRangeMeters],
  ];
  for (const [name, value] of nonNegative) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`weapon ${def.id}: ${name} must be zero or more`);
  }
  if (!Number.isInteger(def.magazine) || !Number.isInteger(def.pellets) || !Number.isInteger(def.equipTicks)) {
    throw new Error(`weapon ${def.id}: magazine, pellets and equipTicks must be integers`);
  }
  if (def.shotsPerSecond > 30) throw new Error(`weapon ${def.id}: rate of fire above the tick budget`);
  if (def.maxRangeMeters < def.rangeMeters) throw new Error(`weapon ${def.id}: maxRangeMeters below rangeMeters`);
  if (!AMMO_TYPES.includes(def.ammoType)) throw new Error(`weapon ${def.id}: unknown ammo type`);
}

export const WEAPON_DEFS: Readonly<Record<string, Readonly<WeaponDef>>> = Object.freeze({
  starter_ar: define({
    id: 'starter_ar',
    category: 'ar',
    baseDamage: 25,
    headshotMultiplier: 1.8,
    magazine: 30,
    reloadSeconds: 2.0,
    shotsPerSecond: 8,
    rangeMeters: 60,
    nameKey: 'weapon.starter_ar',
    ammoType: 'medium',
    automatic: true,
    pellets: 1,
    hipSpreadDegrees: 1.5,
    adsSpreadDegrees: 0.4,
    bloomPerShotDegrees: 0.32,
    bloomMaxDegrees: 2.4,
    bloomRecoverDegreesPerSecond: 9,
    moveSpreadDegrees: 1.2,
    airSpreadDegrees: 2.0,
    maxRangeMeters: 220,
    equipTicks: 18,
    adsFovDegrees: 55,
    recoilPitchDegrees: 0.55,
    recoilYawDegrees: 0.3,
    noiseRadius: 55,
    idealRangeMeters: 24,
  }),
  starter_smg: define({
    id: 'starter_smg',
    category: 'smg',
    baseDamage: 18,
    headshotMultiplier: 1.5,
    magazine: 32,
    reloadSeconds: 2.4,
    shotsPerSecond: 11,
    rangeMeters: 30,
    nameKey: 'weapon.starter_smg',
    ammoType: 'light',
    automatic: true,
    pellets: 1,
    hipSpreadDegrees: 2.2,
    adsSpreadDegrees: 1.1,
    bloomPerShotDegrees: 0.26,
    bloomMaxDegrees: 2.8,
    bloomRecoverDegreesPerSecond: 11,
    moveSpreadDegrees: 0.7,
    airSpreadDegrees: 1.4,
    maxRangeMeters: 110,
    equipTicks: 14,
    adsFovDegrees: 60,
    recoilPitchDegrees: 0.38,
    recoilYawDegrees: 0.34,
    noiseRadius: 45,
    idealRangeMeters: 11,
  }),
  starter_shotgun: define({
    id: 'starter_shotgun',
    category: 'shotgun',
    baseDamage: 10,
    headshotMultiplier: 1.5,
    magazine: 5,
    reloadSeconds: 3.6,
    shotsPerSecond: 0.85,
    rangeMeters: 12,
    nameKey: 'weapon.starter_shotgun',
    ammoType: 'shells',
    automatic: false,
    pellets: 8,
    hipSpreadDegrees: 4.0,
    adsSpreadDegrees: 3.2,
    bloomPerShotDegrees: 0,
    bloomMaxDegrees: 0,
    bloomRecoverDegreesPerSecond: 0,
    moveSpreadDegrees: 0.5,
    airSpreadDegrees: 1.0,
    maxRangeMeters: 45,
    equipTicks: 22,
    adsFovDegrees: 62,
    recoilPitchDegrees: 2.6,
    recoilYawDegrees: 0.9,
    noiseRadius: 60,
    idealRangeMeters: 6,
  }),
  starter_sniper: define({
    id: 'starter_sniper',
    category: 'sniper',
    baseDamage: 90,
    headshotMultiplier: 2.0,
    magazine: 1,
    reloadSeconds: 2.8,
    shotsPerSecond: 0.65,
    rangeMeters: 160,
    nameKey: 'weapon.starter_sniper',
    ammoType: 'heavy',
    automatic: false,
    pellets: 1,
    hipSpreadDegrees: 3.2,
    adsSpreadDegrees: 0,
    bloomPerShotDegrees: 0,
    bloomMaxDegrees: 0,
    bloomRecoverDegreesPerSecond: 0,
    moveSpreadDegrees: 2.4,
    airSpreadDegrees: 3.5,
    maxRangeMeters: 500,
    equipTicks: 30,
    adsFovDegrees: 28,
    recoilPitchDegrees: 3.4,
    recoilYawDegrees: 0.6,
    noiseRadius: 90,
    idealRangeMeters: 55,
  }),
  starter_pistol: define({
    id: 'starter_pistol',
    category: 'pistol',
    baseDamage: 32,
    headshotMultiplier: 1.75,
    magazine: 12,
    reloadSeconds: 1.6,
    shotsPerSecond: 4,
    rangeMeters: 40,
    nameKey: 'weapon.starter_pistol',
    ammoType: 'light',
    automatic: false,
    pellets: 1,
    hipSpreadDegrees: 1.2,
    adsSpreadDegrees: 0.45,
    bloomPerShotDegrees: 0.5,
    bloomMaxDegrees: 2.0,
    bloomRecoverDegreesPerSecond: 8,
    moveSpreadDegrees: 0.6,
    airSpreadDegrees: 1.4,
    maxRangeMeters: 150,
    equipTicks: 12,
    adsFovDegrees: 58,
    recoilPitchDegrees: 1.1,
    recoilYawDegrees: 0.4,
    noiseRadius: 45,
    idealRangeMeters: 15,
  }),
});

export const WEAPON_IDS: readonly string[] = Object.freeze(Object.keys(WEAPON_DEFS));

export function getWeaponDef(id: string): Readonly<WeaponDef> | undefined {
  return Object.prototype.hasOwnProperty.call(WEAPON_DEFS, id) ? WEAPON_DEFS[id] : undefined;
}

/** Ticks between two shots; fractional, so 8 shots/s is exactly 8 shots/s on a 60 Hz clock. */
export function fireIntervalTicks(def: WeaponDef, tickRate: number): number {
  return tickRate / def.shotsPerSecond;
}
