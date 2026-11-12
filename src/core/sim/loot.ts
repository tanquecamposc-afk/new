/**
 * Items lying in the world. A LootItem is claimed by exactly one player: the simulation removes
 * it from the map in the same step that puts it into an inventory (docs/02 §2.6).
 */
import type { WeaponItem } from './inventory.js';
import type { LootSpawnDef } from './map.js';
import { getConsumableDef } from './items.js';
import { AMMO_RESERVE_CAP, AMMO_TYPES, getWeaponDef, type AmmoType } from './weapons.js';

export type LootKind = 'weapon' | 'consumable' | 'ammo';

export interface LootItem {
  readonly id: number;
  readonly kind: LootKind;
  /** Weapon id, consumable id or ammo type. */
  readonly defId: string;
  /** Stack size or rounds; 1 for weapons. */
  count: number;
  /** The weapon itself (magazine and spread sequence travel with it). */
  readonly weapon: WeaponItem | null;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Index of the map spawn it came from, -1 for dropped items. */
  readonly spawnIndex: number;
}

/** A player must be this close (horizontally) to pick something up with the interact key. */
export const PICKUP_RADIUS = 2.0;
/** Ammunition is collected just by walking over it. */
export const AMMO_AUTO_PICKUP_RADIUS = 1.4;
export const PICKUP_MAX_HEIGHT_DIFFERENCE = 1.8;

/** Rounds in one ammo box found in the world, per type. */
export const AMMO_BOX_SIZE: Readonly<Record<AmmoType, number>> = Object.freeze({ light: 36, medium: 30, shells: 8, heavy: 6 });

export function isAmmoType(value: string): value is AmmoType {
  return (AMMO_TYPES as readonly string[]).includes(value);
}

/** Throws when a map pickup refers to something that does not exist or has a nonsense count. */
export function validateLootSpawn(spawn: LootSpawnDef): void {
  if (![spawn.x, spawn.y, spawn.z].every(Number.isFinite)) throw new Error('loot spawn has a non-finite position');
  if (spawn.kind === 'weapon') {
    if (!getWeaponDef(spawn.defId)) throw new Error(`loot spawn: unknown weapon "${spawn.defId}"`);
    return;
  }
  if (spawn.kind === 'consumable') {
    const def = getConsumableDef(spawn.defId);
    if (!def) throw new Error(`loot spawn: unknown item "${spawn.defId}"`);
    if (!Number.isInteger(spawn.count) || spawn.count < 1 || spawn.count > def.maxStack) throw new Error(`loot spawn: bad count for "${spawn.defId}"`);
    return;
  }
  if (spawn.kind === 'ammo') {
    if (!isAmmoType(spawn.defId)) throw new Error(`loot spawn: unknown ammo type "${spawn.defId}"`);
    if (!Number.isInteger(spawn.count) || spawn.count < 1 || spawn.count > AMMO_RESERVE_CAP) throw new Error('loot spawn: bad ammo count');
    return;
  }
  throw new Error('loot spawn: unknown kind');
}
