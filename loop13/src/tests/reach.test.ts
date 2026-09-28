import { describe, it, expect } from 'vitest';
import { findPath, isWalkable } from '../game/ai/nav';
import { INTERACTABLES } from '../game/systems/Interactables';
import { SPAWN } from '../game/data/level';

describe('reachability', () => {
  it('every interactable can be reached from the spawn', () => {
    const failures: string[] = [];
    for (const it of INTERACTABLES) {
      const p = it.pos();
      const range = (it.range ?? 2.4) * 0.8;
      let ok = false;
      for (let r = 0.3; r <= range && !ok; r += 0.2) {
        for (let a = 0; a < Math.PI * 2 && !ok; a += Math.PI / 12) {
          const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
          if (!isWalkable(x, z)) continue;
          if (Math.abs(p.y - 1.3) > 1.6 && it.id !== 'hub_storage_top') continue;
          if (findPath(SPAWN.x, SPAWN.z, x, z, () => true)) ok = true;
        }
      }
      if (!ok && it.id !== 'hub_storage_top') failures.push(it.id);
    }
    expect(failures).toEqual([]);
  });
});
