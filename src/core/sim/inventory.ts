/**
 * Player inventory: five slots holding weapons or consumable stacks, plus a shared ammunition
 * reserve per ammo type. Pure data operations — nothing here knows about the world.
 *
 * Invariants (docs/02 §2.6): ammunition and stack counts are never negative, never NaN, and a
 * stack never exceeds its definition's `maxStack`.
 */
import { clamp } from './math.js';
import type { ConsumableDef } from './items.js';
import { AMMO_RESERVE_CAP, AMMO_TYPES, type AmmoType, type WeaponDef } from './weapons.js';

export const INVENTORY_SLOTS = 5;

export interface WeaponItem {
  kind: 'weapon';
  /** Unique within a match; lets a dropped weapon keep its magazine and spread sequence. */
  instanceId: number;
  weaponId: string;
  ammoInMag: number;
  /** Shots fired with this instance; seeds the spread of the next one. */
  shotsFired: number;
  /** Earliest (fractional) tick at which this weapon may fire again. */
  nextFireTick: number;
}

export interface ConsumableItem {
  kind: 'consumable';
  itemId: string;
  count: number;
}

export type InventoryItem = WeaponItem | ConsumableItem;

export interface Inventory {
  slots: Array<InventoryItem | null>;
  /** Index of the selected slot, always within range (the slot itself may be empty). */
  active: number;
  ammo: Record<AmmoType, number>;
}

export function emptyAmmo(): Record<AmmoType, number> {
  return { light: 0, medium: 0, shells: 0, heavy: 0 };
}

export function createInventory(): Inventory {
  const slots: Array<InventoryItem | null> = [];
  for (let i = 0; i < INVENTORY_SLOTS; i++) slots.push(null);
  return { slots, active: 0, ammo: emptyAmmo() };
}

export function clearInventory(inventory: Inventory): void {
  for (let i = 0; i < INVENTORY_SLOTS; i++) inventory.slots[i] = null;
  inventory.active = 0;
  for (const type of AMMO_TYPES) inventory.ammo[type] = 0;
}

export function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < INVENTORY_SLOTS;
}

export function activeItem(inventory: Inventory): InventoryItem | null {
  return inventory.slots[inventory.active] ?? null;
}

export function findFreeSlot(inventory: Inventory): number {
  for (let i = 0; i < INVENTORY_SLOTS; i++) if (!inventory.slots[i]) return i;
  return -1;
}

export function countFreeSlots(inventory: Inventory): number {
  let free = 0;
  for (let i = 0; i < INVENTORY_SLOTS; i++) if (!inventory.slots[i]) free++;
  return free;
}

export function makeWeaponItem(def: WeaponDef, instanceId: number, ammoInMag: number = def.magazine): WeaponItem {
  return {
    kind: 'weapon',
    instanceId,
    weaponId: def.id,
    ammoInMag: clamp(Math.floor(ammoInMag), 0, def.magazine),
    shotsFired: 0,
    nextFireTick: 0,
  };
}

/**
 * Adds ammunition to the reserve.
 * @returns how much was actually added (the rest does not fit)
 */
export function addAmmo(inventory: Inventory, type: AmmoType, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = inventory.ammo[type];
  const after = Math.min(AMMO_RESERVE_CAP, before + Math.floor(amount));
  inventory.ammo[type] = after;
  return after - before;
}

/**
 * Stacks a consumable into the inventory: existing stacks first, then free slots.
 * @returns how many units were stored (0 when there is no room at all) and the slot of the last
 *          stack touched (-1 when nothing was stored)
 */
export function addConsumable(inventory: Inventory, def: ConsumableDef, count: number): { added: number; slot: number } {
  let remaining = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  let added = 0;
  let slot = -1;
  for (let i = 0; i < INVENTORY_SLOTS && remaining > 0; i++) {
    const item = inventory.slots[i];
    if (!item || item.kind !== 'consumable' || item.itemId !== def.id || item.count >= def.maxStack) continue;
    const take = Math.min(remaining, def.maxStack - item.count);
    item.count += take;
    remaining -= take;
    added += take;
    slot = i;
  }
  for (let i = 0; i < INVENTORY_SLOTS && remaining > 0; i++) {
    if (inventory.slots[i]) continue;
    const take = Math.min(remaining, def.maxStack);
    inventory.slots[i] = { kind: 'consumable', itemId: def.id, count: take };
    remaining -= take;
    added += take;
    slot = i;
  }
  return { added, slot };
}

/** Index of the first slot holding a weapon, preferring `preferred` when it holds one. */
export function findWeaponSlot(inventory: Inventory, preferred = -1): number {
  if (isValidSlot(preferred) && inventory.slots[preferred]?.kind === 'weapon') return preferred;
  for (let i = 0; i < INVENTORY_SLOTS; i++) if (inventory.slots[i]?.kind === 'weapon') return i;
  return -1;
}

/** Next occupied slot in `direction` (+1 / -1), wrapping around; the current slot when alone. */
export function cycleSlot(inventory: Inventory, direction: number): number {
  const step = direction < 0 ? -1 : 1;
  for (let n = 1; n <= INVENTORY_SLOTS; n++) {
    const index = (((inventory.active + step * n) % INVENTORY_SLOTS) + INVENTORY_SLOTS) % INVENTORY_SLOTS;
    if (inventory.slots[index]) return index;
  }
  return inventory.active;
}
