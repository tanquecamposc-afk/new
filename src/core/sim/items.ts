/**
 * Consumables. Values are the original prototype proposal of docs/03 §3.3: a small shield cell
 * that only tops up to half, a full battery, a bandage that stops at 75 and a medkit that needs a
 * long channel. Every use is a channel: it takes time, and switching away cancels it.
 */
import { secondsToTicks } from './config.js';

export interface ConsumableDef {
  id: string;
  /** i18n key of the display name. */
  nameKey: string;
  restores: 'health' | 'shield';
  amount: number;
  /** The item cannot raise the stat above this value. */
  cap: number;
  useTicks: number;
  maxStack: number;
}

export const CONSUMABLE_DEFS: Readonly<Record<string, Readonly<ConsumableDef>>> = Object.freeze({
  shield_cell: Object.freeze({
    id: 'shield_cell',
    nameKey: 'item.shield_cell',
    restores: 'shield',
    amount: 25,
    cap: 50,
    useTicks: secondsToTicks(2),
    maxStack: 6,
  }),
  shield_battery: Object.freeze({
    id: 'shield_battery',
    nameKey: 'item.shield_battery',
    restores: 'shield',
    amount: 50,
    cap: 100,
    useTicks: secondsToTicks(4),
    maxStack: 3,
  }),
  bandage: Object.freeze({
    id: 'bandage',
    nameKey: 'item.bandage',
    restores: 'health',
    amount: 15,
    cap: 75,
    useTicks: secondsToTicks(3),
    maxStack: 15,
  }),
  medkit: Object.freeze({
    id: 'medkit',
    nameKey: 'item.medkit',
    restores: 'health',
    amount: 100,
    cap: 100,
    useTicks: secondsToTicks(8),
    maxStack: 3,
  }),
});

export const CONSUMABLE_IDS: readonly string[] = Object.freeze(Object.keys(CONSUMABLE_DEFS));

export function getConsumableDef(id: string): Readonly<ConsumableDef> | undefined {
  return Object.prototype.hasOwnProperty.call(CONSUMABLE_DEFS, id) ? CONSUMABLE_DEFS[id] : undefined;
}

/** How much the item would actually restore from `current` (0 when it would do nothing). */
export function consumableGain(def: ConsumableDef, current: number, max: number): number {
  const limit = Math.min(def.cap, max);
  return Math.max(0, Math.min(def.amount, limit - current));
}
