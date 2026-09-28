/**
 * Grid navigation for NPCs and The Observer: occupancy grid built from the
 * level (rooms, door gaps, props), A* with octile heuristic, and
 * line-of-sight path smoothing.
 */
import { DOORS, PROPS, ROOMS } from '../data/level';
import { WALL_T } from '../core/constants';
import { propBox } from '../physics/colliders';

const CELL = 0.4;
const AGENT_R = 0.32;

const minX = Math.min(...ROOMS.map((r) => r.rect[0])) - 1;
const minZ = Math.min(...ROOMS.map((r) => r.rect[1])) - 1;
const maxX = Math.max(...ROOMS.map((r) => r.rect[2])) + 1;
const maxZ = Math.max(...ROOMS.map((r) => r.rect[3])) + 1;
const W = Math.ceil((maxX - minX) / CELL);
const H = Math.ceil((maxZ - minZ) / CELL);

/** 0 = blocked, 1 = free. Also a per-cell door id for dynamic gating. */
const free = new Uint8Array(W * H);
const doorAt: (string | null)[] = new Array(W * H).fill(null);

const cx = (x: number) => Math.floor((x - minX) / CELL);
const cz = (z: number) => Math.floor((z - minZ) / CELL);
const wx = (i: number) => minX + (i + 0.5) * CELL;
const wz = (j: number) => minZ + (j + 0.5) * CELL;

function fillRect(x0: number, z0: number, x1: number, z1: number, v: number, door: string | null = null) {
  for (let i = Math.max(0, cx(x0)); i <= Math.min(W - 1, cx(x1)); i++) {
    for (let j = Math.max(0, cz(z0)); j <= Math.min(H - 1, cz(z1)); j++) {
      const px = wx(i), pz = wz(j);
      if (px < x0 || px > x1 || pz < z0 || pz > z1) continue;
      free[j * W + i] = v;
      if (door !== null) doorAt[j * W + i] = door;
    }
  }
}

(function build() {
  const m = WALL_T + AGENT_R;
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    fillRect(x0 + m, z0 + m, x1 - m, z1 - m, 1);
  }
  for (const d of DOORS) {
    const half = d.width / 2 - AGENT_R;
    if (half <= 0) continue;
    const depth = m + 0.3;
    if (d.axis === 'x') fillRect(d.x - half, d.z - depth, d.x + half, d.z + depth, 1, d.id);
    else fillRect(d.x - depth, d.z - half, d.x + depth, d.z + half, 1, d.id);
  }
  for (const p of PROPS) {
    const b = propBox(p);
    if (!b) continue;
    fillRect(b.minX - AGENT_R, b.minZ - AGENT_R, b.maxX + AGENT_R, b.maxZ + AGENT_R, 0);
  }
})();

export type DoorGate = (doorId: string) => boolean;

function passable(i: number, j: number, gate?: DoorGate): boolean {
  if (i < 0 || j < 0 || i >= W || j >= H) return false;
  const k = j * W + i;
  if (!free[k]) return false;
  const d = doorAt[k];
  if (d && gate && !gate(d)) return false;
  return true;
}

export function isWalkable(x: number, z: number, gate?: DoorGate): boolean {
  return passable(cx(x), cz(z), gate);
}

/** Nearest free cell centre to a world point. */
function nearestFree(x: number, z: number, gate?: DoorGate): [number, number] | null {
  const i0 = cx(x), j0 = cz(z);
  for (let r = 0; r < 8; r++) {
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (passable(i0 + di, j0 + dj, gate)) return [i0 + di, j0 + dj];
      }
    }
  }
  return null;
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() { return this.items.length; }
  push(item: number, p: number) {
    this.items.push(item); this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      [this.prio[parent], this.prio[i]] = [this.prio[i], this.prio[parent]];
      i = parent;
    }
  }
  pop(): number {
    const top = this.items[0];
    const li = this.items.pop()!, lp = this.prio.pop()!;
    if (this.items.length) {
      this.items[0] = li; this.prio[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let s = i;
        if (l < this.items.length && this.prio[l] < this.prio[s]) s = l;
        if (r < this.items.length && this.prio[r] < this.prio[s]) s = r;
        if (s === i) break;
        [this.items[s], this.items[i]] = [this.items[i], this.items[s]];
        [this.prio[s], this.prio[i]] = [this.prio[i], this.prio[s]];
        i = s;
      }
    }
    return top;
  }
}

const gScore = new Float32Array(W * H);
const cameFrom = new Int32Array(W * H);
const closed = new Uint8Array(W * H);

export function findPath(ax: number, az: number, bx: number, bz: number, gate?: DoorGate): { x: number; z: number }[] | null {
  const s = nearestFree(ax, az, gate);
  const e = nearestFree(bx, bz, gate);
  if (!s || !e) return null;
  const start = s[1] * W + s[0];
  const goal = e[1] * W + e[0];
  gScore.fill(Infinity);
  cameFrom.fill(-1);
  closed.fill(0);
  const open = new MinHeap();
  gScore[start] = 0;
  const h = (k: number) => {
    const dx = Math.abs((k % W) - e[0]), dz = Math.abs(Math.floor(k / W) - e[1]);
    return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  open.push(start, h(start));
  let found = false;
  let guard = 0;
  while (open.size && guard++ < 60000) {
    const cur = open.pop();
    if (cur === goal) { found = true; break; }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % W, cj = Math.floor(cur / W);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!passable(ni, nj, gate)) continue;
        if (di && dj && (!passable(ci + di, cj, gate) || !passable(ci, cj + dj, gate))) continue;
        const nk = nj * W + ni;
        if (closed[nk]) continue;
        const g = gScore[cur] + (di && dj ? Math.SQRT2 : 1);
        if (g < gScore[nk]) {
          gScore[nk] = g;
          cameFrom[nk] = cur;
          open.push(nk, g + h(nk));
        }
      }
    }
  }
  if (!found) return null;
  const cells: number[] = [];
  for (let k = goal; k !== -1; k = cameFrom[k]) cells.push(k);
  cells.reverse();
  // smooth with grid line-of-sight
  const pts = cells.map((k) => ({ x: wx(k % W), z: wz(Math.floor(k / W)) }));
  const out = [pts[0]];
  let anchor = 0;
  for (let i = 2; i < pts.length; i++) {
    if (!gridLOS(pts[anchor], pts[i], gate)) {
      out.push(pts[i - 1]);
      anchor = i - 1;
    }
  }
  out.push({ x: bx, z: bz });
  return out;
}

function gridLOS(a: { x: number; z: number }, b: { x: number; z: number }, gate?: DoorGate): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.ceil(d / (CELL * 0.5));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    // sample a small cross so corners don't get cut
    if (!passable(cx(x), cz(z), gate)) return false;
    if (!passable(cx(x + 0.15), cz(z), gate) || !passable(cx(x - 0.15), cz(z), gate)) return false;
    if (!passable(cx(x), cz(z + 0.15), gate) || !passable(cx(x), cz(z - 0.15), gate)) return false;
  }
  return true;
}

export const NAV_INFO = { W, H, CELL, minX, minZ };
