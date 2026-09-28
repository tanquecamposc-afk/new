import { describe, it, expect } from 'vitest';
import { findPath, isWalkable } from '../game/ai/nav';
import { DOORS } from '../game/data/level';
import { STATIC_BOXES, WALLS } from '../game/physics/colliders';

const openAll = () => true;

describe('navigation grid', () => {
  it('builds walls with door gaps', () => {
    expect(WALLS.length).toBeGreaterThan(60);
    expect(STATIC_BOXES.length).toBeGreaterThan(WALLS.length);
  });
  it('key NPC spots are walkable', () => {
    const spots: [number, number][] = [[-12.2, 0.2], [-0.75, 12.1], [6.3, 14.35], [-4.1, -13.2], [5.5, -13.1], [-5.4, 13.6], [-20.2, 2.6], [-20.6, 2.4]];
    for (const [x, z] of spots) expect(isWalkable(x, z), `${x},${z}`).toBe(true);
  });
  it('Kane route is connected', () => {
    const route: [number, number][] = [[-12.2, 0.2], [-0.75, 12.1], [6.3, 14.35], [-4.1, -13.2], [5.5, -13.1]];
    for (let i = 0; i < route.length - 1; i++) {
      const p = findPath(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1], openAll);
      expect(p, `leg ${i}`).not.toBeNull();
    }
  });
  it('every door connects its rooms', () => {
    for (const d of DOORS) {
      const off = 1.2;
      const [ax, az, bx, bz] = d.axis === 'x' ? [d.x, d.z - off, d.x, d.z + off] : [d.x - off, d.z, d.x + off, d.z];
      const p = findPath(ax, az, bx, bz, openAll);
      expect(p, d.id).not.toBeNull();
    }
  });
  it('reactor reachable from the hub through maintenance', () => {
    expect(findPath(0, 4, 24, 13, (id) => id !== 'd_rr_top' && id !== 'd_restricted')).not.toBeNull();
    expect(findPath(-7, 13, 28, -2, openAll)).not.toBeNull();
  });
});
