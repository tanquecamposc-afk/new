/**
 * Static collision geometry derived from level data (walls + props), plus
 * dynamic door panels whose state is read from the world each query.
 */
import { DOORS, PROPS, PROP_SIZE, ROOMS, type DoorDef, type RoomDef } from '../data/level';
import { WALL_T } from '../core/constants';
import { world } from '../core/world';

export interface AABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  kind: 'wall' | 'prop' | 'door' | 'crate';
  id?: string;
  room?: string;
}

export interface WallSegment {
  room: string;
  side: 'n' | 's' | 'w' | 'e';
  box: AABB;
  /** Door lintel pieces above an opening are purely visual. */
  lintel?: boolean;
}

/** Split each room side into wall segments around door openings. */
export function buildWalls(): WallSegment[] {
  const segs: WallSegment[] = [];
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    const sides: { side: WallSegment['side']; line: number; a0: number; a1: number; axis: 'x' | 'z' }[] = [
      { side: 'n', line: z0, a0: x0, a1: x1, axis: 'x' },
      { side: 's', line: z1, a0: x0, a1: x1, axis: 'x' },
      { side: 'w', line: x0, a0: z0, a1: z1, axis: 'z' },
      { side: 'e', line: x1, a0: z0, a1: z1, axis: 'z' },
    ];
    for (const s of sides) {
      const gaps = DOORS.filter((d) => doorOnSide(d, r, s.axis, s.line))
        .map((d) => {
          const c = s.axis === 'x' ? d.x : d.z;
          return { from: c - d.width / 2, to: c + d.width / 2, door: d };
        })
        .sort((a, b) => a.from - b.from);
      let cursor = s.a0;
      const pushSeg = (from: number, to: number, y0: number, y1: number, lintel = false) => {
        if (to - from < 0.01) return;
        segs.push({ room: r.id, side: s.side, box: sideBox(r, s.side, from, to, y0, y1), lintel });
      };
      for (const g of gaps) {
        pushSeg(cursor, g.from, 0, r.height);
        const dh = g.door.height ?? 2.5;
        if (dh < r.height) pushSeg(g.from, g.to, dh, r.height, true);
        cursor = g.to;
      }
      pushSeg(cursor, s.a1, 0, r.height);
    }
  }
  return segs;
}

function doorOnSide(d: DoorDef, r: RoomDef, axis: 'x' | 'z', line: number): boolean {
  if (!d.rooms.includes(r.id)) return false;
  if (d.axis !== axis) return false;
  return Math.abs((axis === 'x' ? d.z : d.x) - line) < 0.01;
}

function sideBox(r: RoomDef, side: WallSegment['side'], from: number, to: number, y0: number, y1: number): AABB {
  const [x0, z0, x1, z1] = r.rect;
  const T = WALL_T;
  switch (side) {
    case 'n': return { minX: from, maxX: to, minZ: z0, maxZ: z0 + T, minY: y0, maxY: y1, kind: 'wall', room: r.id };
    case 's': return { minX: from, maxX: to, minZ: z1 - T, maxZ: z1, minY: y0, maxY: y1, kind: 'wall', room: r.id };
    case 'w': return { minX: x0, maxX: x0 + T, minZ: from, maxZ: to, minY: y0, maxY: y1, kind: 'wall', room: r.id };
    case 'e': return { minX: x1 - T, maxX: x1, minZ: from, maxZ: to, minY: y0, maxY: y1, kind: 'wall', room: r.id };
  }
}

export function propBox(p: (typeof PROPS)[number]): AABB | null {
  const size = PROP_SIZE[p.type];
  if (!size) return null;
  let [w, h, d] = size;
  if (p.type === 'pillar' && p.h) h = p.h;
  if ((p.rot ?? 0) % 2 === 1) [w, d] = [d, w];
  const y = p.y ?? 0;
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2, minY: y, maxY: y + h, kind: 'prop', id: p.id ?? p.type, room: p.room };
}

export const WALLS: WallSegment[] = buildWalls();

/** Static solid boxes (walls exclude visual-only lintels). */
export const STATIC_BOXES: AABB[] = [
  ...WALLS.filter((w) => !w.lintel).map((w) => w.box),
  ...PROPS.map(propBox).filter((b): b is AABB => b !== null),
];

/** Door panel boxes (solid while mostly closed). */
export const DOOR_BOXES: Record<string, AABB> = Object.fromEntries(
  DOORS.map((d) => {
    const half = d.width / 2;
    const t = 0.18;
    const box: AABB = d.axis === 'x'
      ? { minX: d.x - half, maxX: d.x + half, minZ: d.z - t, maxZ: d.z + t, minY: 0, maxY: d.height ?? 2.5, kind: 'door', id: d.id }
      : { minX: d.x - t, maxX: d.x + t, minZ: d.z - half, maxZ: d.z + half, minY: 0, maxY: d.height ?? 2.5, kind: 'door', id: d.id };
    return [d.id, box];
  }),
);

export function doorSolid(id: string): boolean {
  const s = world.doors[id];
  if (!s) return false;
  if (id === 'd_unknown') return !world.hiddenOpen;
  return s.open < 0.85;
}

/** All boxes currently solid for characters (static + closed doors + crates). */
export function solidBoxes(includeCrates = true, exclude?: AABB): AABB[] {
  const out = STATIC_BOXES.slice();
  for (const id in DOOR_BOXES) if (doorSolid(id)) out.push(DOOR_BOXES[id]);
  if (includeCrates) {
    world.crates.forEach((c, i) => {
      const b = crateBox(c.pos.x, c.pos.y, c.pos.z, c.size);
      b.id = `crate:${i}`;
      if (b !== exclude) out.push(b);
    });
  }
  return out;
}

export function crateBox(x: number, y: number, z: number, size: number): AABB {
  const h = size / 2;
  return { minX: x - h, maxX: x + h, minY: y - h, maxY: y + h, minZ: z - h, maxZ: z + h, kind: 'crate' };
}

/**
 * Segment vs boxes: returns the smallest hit fraction in [0,1] or 1 if clear.
 * Used for camera collision and line of sight.
 */
export function segmentCast(
  ax: number, ay: number, az: number, bx: number, by: number, bz: number, boxes: AABB[], pad = 0,
): number {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  let best = 1;
  for (const b of boxes) {
    let tmin = 0, tmax = best;
    const axes: [number, number, number, number][] = [
      [ax, dx, b.minX - pad, b.maxX + pad],
      [ay, dy, b.minY - pad, b.maxY + pad],
      [az, dz, b.minZ - pad, b.maxZ + pad],
    ];
    let hit = true;
    for (const [o, d, mn, mx] of axes) {
      if (Math.abs(d) < 1e-9) {
        if (o < mn || o > mx) { hit = false; break; }
      } else {
        let t1 = (mn - o) / d, t2 = (mx - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) { hit = false; break; }
      }
    }
    if (hit && tmin < best) best = tmin;
  }
  return best;
}

export function lineOfSight(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  return segmentCast(ax, ay, az, bx, by, bz, solidBoxes(false)) >= 0.999;
}
