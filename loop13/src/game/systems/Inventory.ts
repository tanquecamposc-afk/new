/** Physical inventory for the current loop (cleared on reset). Knowledge of items persists in MEMORY. */
import { world } from '../core/world';
import type { ItemId } from '../core/types';
import { Memory } from './MemorySystem';
import { Audio } from '../audio/AudioEngine';
import { G } from '../core/store';
import { FLASHLIGHT, PLAYER } from '../core/constants';
import { ITEMS } from '../data/items';

export const Inventory = {
  has: (id: ItemId) => world.inventory.includes(id),
  count: (id: ItemId) => world.inventory.filter((i) => i === id).length,
  add(id: ItemId): void {
    world.inventory.push(id);
    Memory.itemFound(id);
    Audio.sfx('pickup', { pos: world.player.pos });
    if (G().run.itemsFound.includes(id)) G().pushNotification({ kind: 'item', title: 'PICKED UP', text: `${ITEMS[id].icon} ${ITEMS[id].name}` });
  },
  remove(id: ItemId): void {
    const i = world.inventory.indexOf(id);
    if (i >= 0) world.inventory.splice(i, 1);
  },
  use(id: ItemId): boolean {
    if (!Inventory.has(id)) return false;
    const p = world.player;
    if (id === 'battery') {
      p.battery = Math.min(100, p.battery + FLASHLIGHT.batteryRecharge);
      Inventory.remove('battery');
      G().pushNotification({ kind: 'item', title: 'BATTERY', text: 'Flashlight recharged.' });
      return true;
    }
    if (id === 'medkit') {
      if (p.health >= PLAYER.maxHealth) return false;
      p.health = Math.min(PLAYER.maxHealth, p.health + 60);
      Inventory.remove('medkit');
      G().pushNotification({ kind: 'item', title: 'MEDICAL KIT', text: 'Health restored.' });
      return true;
    }
    return false;
  },
};
