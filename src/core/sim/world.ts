/**
 * Collision world for the simulation: a heightfield terrain plus axis-aligned primitive colliders
 * (boxes, vertical cylinders and ramps) stored in a uniform XZ grid.
 *
 * It answers the queries gameplay needs — ground height, ceilings, wall push-out, volume overlap
 * and raycasts — with plain deterministic arithmetic, so the exact same code runs in the browser,
 * in Node tests and (later) on an authoritative server. It knows nothing about rendering.
 */
import { clamp } from './math.js';

export type SurfaceMaterial =
  | 'grass'
  | 'dirt'
  | 'sand'
  | 'rock'
  | 'wood'
  | 'stone'
  | 'metal'
  | 'concrete'
  | 'energy';

/** `colliderId` reported when a query hits the terrain instead of a collider. */
export const TERRAIN_ID = 0;

const EPS = 1e-4;

interface ColliderBase {
  readonly id: number;
  readonly material: SurfaceMaterial;
  /** Free-form gameplay tag (for example the id of the build piece that owns the collider). */
  readonly tag: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  /** Internal de-duplication marker for grid queries. */
  stamp: number;
}

export interface BoxCollider extends ColliderBase {
  readonly kind: 'box';
  readonly minY: number;
  readonly maxY: number;
}

export interface CylinderCollider extends ColliderBase {
  readonly kind: 'cylinder';
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Direction in which a ramp gains height. */
export type RampDirection = 'x+' | 'x-' | 'z+' | 'z-';

export interface RampCollider extends ColliderBase {
  readonly kind: 'ramp';
  readonly lowY: number;
  readonly highY: number;
  readonly dir: RampDirection;
  /** `Infinity` = solid wedge down to `baseY`; finite = thin slab you can walk under. */
  readonly thickness: number;
  readonly baseY: number;
}

export type Collider = BoxCollider | CylinderCollider | RampCollider;

export interface BoxInit {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  material?: SurfaceMaterial;
  tag?: string;
}

export interface CylinderInit {
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
  material?: SurfaceMaterial;
  tag?: string;
}

export interface RampInit {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  lowY: number;
  highY: number;
  dir: RampDirection;
  thickness?: number;
  baseY?: number;
  material?: SurfaceMaterial;
  tag?: string;
}

/* ------------------------------------------------------------------------------------------ */
/* Heightfield                                                                                 */
/* ------------------------------------------------------------------------------------------ */

export interface Heightfield {
  readonly originX: number;
  readonly originZ: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  /** (cols + 1) * (rows + 1) vertex heights, row-major (z outer, x inner). */
  readonly heights: Float32Array;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export function createHeightfield(
  originX: number,
  originZ: number,
  cellSize: number,
  cols: number,
  rows: number,
  heightAt: (x: number, z: number) => number,
): Heightfield {
  if (!(cellSize > 0) || cols < 1 || rows < 1) throw new Error('invalid heightfield size');
  const heights = new Float32Array((cols + 1) * (rows + 1));
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const h = heightAt(originX + i * cellSize, originZ + j * cellSize);
      if (!Number.isFinite(h)) throw new Error('heightfield produced a non-finite height');
      heights[j * (cols + 1) + i] = h;
      if (h < minHeight) minHeight = h;
      if (h > maxHeight) maxHeight = h;
    }
  }
  return { originX, originZ, cellSize, cols, rows, heights, minHeight, maxHeight };
}

/**
 * Height of the terrain surface. Each cell is split into two triangles along the (i+1,j)-(i,j+1)
 * diagonal — the renderer builds its mesh with the same split, so feet and pixels agree.
 * Outside the grid the border height is extended.
 */
export function sampleHeightfield(hf: Heightfield, x: number, z: number): number {
  const fx = clamp((x - hf.originX) / hf.cellSize, 0, hf.cols);
  const fz = clamp((z - hf.originZ) / hf.cellSize, 0, hf.rows);
  const i = Math.min(Math.floor(fx), hf.cols - 1);
  const j = Math.min(Math.floor(fz), hf.rows - 1);
  const u = fx - i;
  const v = fz - j;
  const stride = hf.cols + 1;
  const base = j * stride + i;
  const h00 = hf.heights[base]!;
  const h10 = hf.heights[base + 1]!;
  const h01 = hf.heights[base + stride]!;
  const h11 = hf.heights[base + stride + 1]!;
  if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
  return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}

export interface Gradient2 {
  gx: number;
  gz: number;
}

/** Slope of the terrain triangle under (x, z): dh/dx and dh/dz. */
export function heightfieldGradient(hf: Heightfield, x: number, z: number, out: Gradient2): Gradient2 {
  const fx = clamp((x - hf.originX) / hf.cellSize, 0, hf.cols);
  const fz = clamp((z - hf.originZ) / hf.cellSize, 0, hf.rows);
  const i = Math.min(Math.floor(fx), hf.cols - 1);
  const j = Math.min(Math.floor(fz), hf.rows - 1);
  const u = fx - i;
  const v = fz - j;
  const stride = hf.cols + 1;
  const base = j * stride + i;
  const h00 = hf.heights[base]!;
  const h10 = hf.heights[base + 1]!;
  const h01 = hf.heights[base + stride]!;
  const h11 = hf.heights[base + stride + 1]!;
  if (u + v <= 1) {
    out.gx = (h10 - h00) / hf.cellSize;
    out.gz = (h01 - h00) / hf.cellSize;
  } else {
    out.gx = (h11 - h01) / hf.cellSize;
    out.gz = (h11 - h10) / hf.cellSize;
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* Query result shapes                                                                         */
/* ------------------------------------------------------------------------------------------ */

export interface GroundInfo {
  found: boolean;
  y: number;
  colliderId: number;
  material: SurfaceMaterial;
}

export function makeGroundInfo(): GroundInfo {
  return { found: false, y: -Infinity, colliderId: -1, material: 'grass' };
}

export interface RayHit {
  t: number;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  colliderId: number;
  material: SurfaceMaterial;
}

export function makeRayHit(): RayHit {
  return { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, colliderId: -1, material: 'grass' };
}

export interface RaycastOptions {
  /** Colliders carrying this tag are ignored. */
  ignoreTag?: string;
  skipTerrain?: boolean;
}

/** Mutable point + velocity used by the wall resolver. */
export interface CircleMover {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Normal of the last wall that pushed the mover (valid when resolveCircle returned true). */
  hitNx: number;
  hitNz: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldOptions {
  terrain: Heightfield | null;
  bounds: WorldBounds;
  /** When true the bounds act as invisible walls; when false entities can fall off the map. */
  solidBounds: boolean;
  /** Anything below this height is in the void. */
  killY: number;
  gridCellSize?: number;
  terrainMaterialAt?: (x: number, z: number) => SurfaceMaterial;
}

/* ------------------------------------------------------------------------------------------ */
/* Ray primitives (module-level scratch keeps the hot path allocation free)                    */
/* ------------------------------------------------------------------------------------------ */

let hitNx = 0;
let hitNy = 0;
let hitNz = 0;
let boxExitT = 0;

/** Slab test. Returns entry `t` (0 when the origin is inside) or -1. Sets hitN* and boxExitT. */
function rayBox(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  maxT: number,
): number {
  let tmin = 0;
  let tmax = maxT;
  let axis = -1;
  let sign = 0;

  if (Math.abs(dx) < 1e-12) {
    if (ox < minX || ox > maxX) return -1;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv;
    let t2 = (maxX - ox) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 0;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }

  if (Math.abs(dy) < 1e-12) {
    if (oy < minY || oy > maxY) return -1;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv;
    let t2 = (maxY - oy) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 1;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }

  if (Math.abs(dz) < 1e-12) {
    if (oz < minZ || oz > maxZ) return -1;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - oz) * inv;
    let t2 = (maxZ - oz) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 2;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }

  boxExitT = tmax;
  if (axis === -1) {
    // Origin inside the box: report an immediate hit facing the ray.
    hitNx = -dx;
    hitNy = -dy;
    hitNz = -dz;
    return 0;
  }
  hitNx = axis === 0 ? sign : 0;
  hitNy = axis === 1 ? sign : 0;
  hitNz = axis === 2 ? sign : 0;
  return tmin;
}

function rayCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  c: CylinderCollider,
  maxT: number,
): number {
  const px = ox - c.x;
  const pz = oz - c.z;
  const r2 = c.radius * c.radius;
  const a = dx * dx + dz * dz;
  const insideRadius = px * px + pz * pz <= r2;

  if (insideRadius && oy >= c.minY && oy <= c.maxY) {
    hitNx = -dx;
    hitNy = -dy;
    hitNz = -dz;
    return 0;
  }

  let best = -1;
  if (a > 1e-12) {
    const b = px * dx + pz * dz;
    const disc = b * b - a * (px * px + pz * pz - r2);
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t0 = (-b - sq) / a;
    const t1 = (-b + sq) / a;
    if (t1 < 0) return -1;
    if (t0 >= 0 && t0 <= maxT) {
      const y = oy + dy * t0;
      if (y >= c.minY && y <= c.maxY) {
        hitNx = (px + dx * t0) / c.radius;
        hitNy = 0;
        hitNz = (pz + dz * t0) / c.radius;
        return t0;
      }
    }
  } else if (!insideRadius) {
    return -1;
  }

  // Caps.
  if (dy < -1e-12 && oy > c.maxY) {
    const t = (c.maxY - oy) / dy;
    const hx = px + dx * t;
    const hz = pz + dz * t;
    if (t <= maxT && hx * hx + hz * hz <= r2) {
      hitNx = 0;
      hitNy = 1;
      hitNz = 0;
      best = t;
    }
  } else if (dy > 1e-12 && oy < c.minY) {
    const t = (c.minY - oy) / dy;
    const hx = px + dx * t;
    const hz = pz + dz * t;
    if (t <= maxT && hx * hx + hz * hz <= r2) {
      hitNx = 0;
      hitNy = -1;
      hitNz = 0;
      best = t;
    }
  }
  return best;
}

/** Height of a ramp's walking surface at (x, z); the point is clamped to the footprint. */
export function rampSurfaceY(r: RampCollider, x: number, z: number): number {
  let u: number;
  switch (r.dir) {
    case 'x+':
      u = (x - r.minX) / (r.maxX - r.minX);
      break;
    case 'x-':
      u = (r.maxX - x) / (r.maxX - r.minX);
      break;
    case 'z+':
      u = (z - r.minZ) / (r.maxZ - r.minZ);
      break;
    case 'z-':
      u = (r.maxZ - z) / (r.maxZ - r.minZ);
      break;
  }
  return r.lowY + (r.highY - r.lowY) * clamp(u, 0, 1);
}

function rampRun(r: RampCollider): number {
  return r.dir === 'x+' || r.dir === 'x-' ? r.maxX - r.minX : r.maxZ - r.minZ;
}

function rayRamp(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  r: RampCollider,
  maxT: number,
): number {
  const slab = Number.isFinite(r.thickness);
  const bottomY = slab ? r.lowY - r.thickness : r.baseY;
  const tEnter = rayBox(ox, oy, oz, dx, dy, dz, r.minX, bottomY, r.minZ, r.maxX, r.highY, r.maxZ, maxT);
  if (tEnter < 0) return -1;
  const tExit = boxExitT;
  const faceNx = hitNx;
  const faceNy = hitNy;
  const faceNz = hitNz;

  const k = (r.highY - r.lowY) / rampRun(r);
  let q0: number;
  let qd: number;
  let pnx = 0;
  let pnz = 0;
  switch (r.dir) {
    case 'x+':
      q0 = ox - r.minX;
      qd = dx;
      pnx = -k;
      break;
    case 'x-':
      q0 = r.maxX - ox;
      qd = -dx;
      pnx = k;
      break;
    case 'z+':
      q0 = oz - r.minZ;
      qd = dz;
      pnz = -k;
      break;
    case 'z-':
      q0 = r.maxZ - oz;
      qd = -dz;
      pnz = k;
      break;
  }
  // f(t) = rayY(t) - surfaceY(t) is linear inside the footprint.
  const f0 = oy - r.lowY - k * q0;
  const f1 = dy - k * qd;
  const fEnter = f0 + f1 * tEnter;
  const invLen = 1 / Math.hypot(pnx, 1, pnz);

  const setPlane = (sign: number): void => {
    hitNx = pnx * invLen * sign;
    hitNy = invLen * sign;
    hitNz = pnz * invLen * sign;
  };
  const setFace = (): void => {
    hitNx = faceNx;
    hitNy = faceNy;
    hitNz = faceNz;
  };

  if (!slab) {
    if (fEnter <= EPS) {
      setFace();
      return tEnter;
    }
    if (f1 < 0) {
      const t = -f0 / f1;
      if (t >= tEnter && t <= tExit) {
        setPlane(1);
        return t;
      }
    }
    return -1;
  }

  if (fEnter <= EPS && fEnter >= -r.thickness - EPS) {
    setFace();
    return tEnter;
  }
  if (fEnter > 0) {
    if (f1 < 0) {
      const t = -f0 / f1;
      if (t >= tEnter && t <= tExit) {
        setPlane(1);
        return t;
      }
    }
    return -1;
  }
  if (f1 > 0) {
    const t = (-r.thickness - f0) / f1;
    if (t >= tEnter && t <= tExit) {
      setPlane(-1);
      return t;
    }
  }
  return -1;
}

/* ------------------------------------------------------------------------------------------ */
/* World                                                                                       */
/* ------------------------------------------------------------------------------------------ */

interface PushResult {
  px: number;
  pz: number;
  nx: number;
  nz: number;
}

export class World {
  readonly terrain: Heightfield | null;
  readonly bounds: WorldBounds;
  readonly solidBounds: boolean;
  readonly killY: number;
  /** Bumped whenever colliders are added or removed, so views can refresh. */
  revision = 0;

  private readonly cellSize: number;
  private readonly colliders = new Map<number, Collider>();
  private readonly grid = new Map<number, Collider[]>();
  private readonly terrainMaterialAt: ((x: number, z: number) => SurfaceMaterial) | null;
  private nextId = 1;
  private stamp = 0;
  private readonly scratch: Collider[] = [];
  private readonly push: PushResult = { px: 0, pz: 0, nx: 0, nz: 0 };
  private readonly gradient: Gradient2 = { gx: 0, gz: 0 };

  constructor(options: WorldOptions) {
    const { bounds } = options;
    if (!(bounds.maxX > bounds.minX) || !(bounds.maxZ > bounds.minZ)) throw new Error('invalid world bounds');
    this.terrain = options.terrain;
    this.bounds = { ...bounds };
    this.solidBounds = options.solidBounds;
    this.killY = options.killY;
    this.cellSize = options.gridCellSize ?? 4;
    this.terrainMaterialAt = options.terrainMaterialAt ?? null;
  }

  /* ---- editing ---------------------------------------------------------------------------- */

  addBox(init: BoxInit): BoxCollider {
    if (!(init.maxX > init.minX) || !(init.maxY > init.minY) || !(init.maxZ > init.minZ)) {
      throw new Error('box collider needs positive extents');
    }
    const collider: BoxCollider = {
      kind: 'box',
      id: this.nextId++,
      material: init.material ?? 'concrete',
      tag: init.tag ?? '',
      minX: init.minX,
      maxX: init.maxX,
      minY: init.minY,
      maxY: init.maxY,
      minZ: init.minZ,
      maxZ: init.maxZ,
      stamp: 0,
    };
    this.insert(collider);
    return collider;
  }

  addCylinder(init: CylinderInit): CylinderCollider {
    if (!(init.radius > 0) || !(init.maxY > init.minY)) throw new Error('cylinder collider needs positive size');
    const collider: CylinderCollider = {
      kind: 'cylinder',
      id: this.nextId++,
      material: init.material ?? 'stone',
      tag: init.tag ?? '',
      x: init.x,
      z: init.z,
      radius: init.radius,
      minY: init.minY,
      maxY: init.maxY,
      minX: init.x - init.radius,
      maxX: init.x + init.radius,
      minZ: init.z - init.radius,
      maxZ: init.z + init.radius,
      stamp: 0,
    };
    this.insert(collider);
    return collider;
  }

  addRamp(init: RampInit): RampCollider {
    if (!(init.maxX > init.minX) || !(init.maxZ > init.minZ) || !(init.highY > init.lowY)) {
      throw new Error('ramp collider needs positive extents and rise');
    }
    const thickness = init.thickness ?? Infinity;
    if (!(thickness > 0)) throw new Error('ramp thickness must be positive');
    const collider: RampCollider = {
      kind: 'ramp',
      id: this.nextId++,
      material: init.material ?? 'concrete',
      tag: init.tag ?? '',
      minX: init.minX,
      maxX: init.maxX,
      minZ: init.minZ,
      maxZ: init.maxZ,
      lowY: init.lowY,
      highY: init.highY,
      dir: init.dir,
      thickness,
      baseY: init.baseY ?? init.lowY,
      stamp: 0,
    };
    this.insert(collider);
    return collider;
  }

  remove(id: number): boolean {
    const collider = this.colliders.get(id);
    if (!collider) return false;
    this.colliders.delete(id);
    this.forEachCell(collider.minX, collider.minZ, collider.maxX, collider.maxZ, (key) => {
      const cell = this.grid.get(key);
      if (!cell) return;
      const index = cell.indexOf(collider);
      if (index >= 0) cell.splice(index, 1);
      if (cell.length === 0) this.grid.delete(key);
    });
    this.revision++;
    return true;
  }

  get(id: number): Collider | undefined {
    return this.colliders.get(id);
  }

  get colliderCount(): number {
    return this.colliders.size;
  }

  allColliders(): IterableIterator<Collider> {
    return this.colliders.values();
  }

  /* ---- terrain ---------------------------------------------------------------------------- */

  terrainHeight(x: number, z: number): number {
    return this.terrain ? sampleHeightfield(this.terrain, x, z) : -Infinity;
  }

  /** Slope magnitude (rise over run) of the terrain under (x, z); 0 when there is no terrain. */
  terrainSlope(x: number, z: number, out?: Gradient2): number {
    if (!this.terrain) {
      if (out) {
        out.gx = 0;
        out.gz = 0;
      }
      return 0;
    }
    const g = heightfieldGradient(this.terrain, x, z, out ?? this.gradient);
    return Math.hypot(g.gx, g.gz);
  }

  materialAt(x: number, z: number): SurfaceMaterial {
    return this.terrainMaterialAt ? this.terrainMaterialAt(x, z) : 'grass';
  }

  /* ---- queries ---------------------------------------------------------------------------- */

  /** Collects every collider whose XZ box touches the given rectangle. */
  queryAabb(minX: number, minZ: number, maxX: number, maxZ: number, out: Collider[]): Collider[] {
    out.length = 0;
    const stamp = ++this.stamp;
    const cs = this.cellSize;
    const ix0 = Math.floor(minX / cs);
    const ix1 = Math.floor(maxX / cs);
    const iz0 = Math.floor(minZ / cs);
    const iz1 = Math.floor(maxZ / cs);
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const cell = this.grid.get(cellKey(ix, iz));
        if (!cell) continue;
        for (let n = 0; n < cell.length; n++) {
          const c = cell[n]!;
          if (c.stamp === stamp) continue;
          c.stamp = stamp;
          if (c.maxX < minX || c.minX > maxX || c.maxZ < minZ || c.minZ > maxZ) continue;
          out.push(c);
        }
      }
    }
    return out;
  }

  /**
   * Highest walkable surface under the point. Collider tops only count when they are at or
   * below `maxY` (the feet plus the step height); the terrain always counts because it is solid
   * all the way down.
   */
  groundAt(x: number, z: number, maxY: number, supportRadius: number, out: GroundInfo): boolean {
    let bestY = -Infinity;
    let bestId = -1;
    let material: SurfaceMaterial = 'grass';

    if (this.terrain) {
      bestY = sampleHeightfield(this.terrain, x, z);
      bestId = TERRAIN_ID;
      material = this.materialAt(x, z);
    }

    const r2 = supportRadius * supportRadius;
    const list = this.queryAabb(x - supportRadius, z - supportRadius, x + supportRadius, z + supportRadius, this.scratch);
    for (let n = 0; n < list.length; n++) {
      const c = list[n]!;
      let top: number;
      if (c.kind === 'cylinder') {
        if (c.maxY > maxY + EPS || c.maxY <= bestY) continue;
        const dx = x - c.x;
        const dz = z - c.z;
        const reach = c.radius + supportRadius;
        if (dx * dx + dz * dz > reach * reach) continue;
        top = c.maxY;
      } else {
        const cx = clamp(x, c.minX, c.maxX);
        const cz = clamp(z, c.minZ, c.maxZ);
        const dx = x - cx;
        const dz = z - cz;
        if (dx * dx + dz * dz > r2) continue;
        top = c.kind === 'box' ? c.maxY : rampSurfaceY(c, cx, cz);
        if (top > maxY + EPS || top <= bestY) continue;
      }
      bestY = top;
      bestId = c.id;
      material = c.material;
    }

    out.found = bestId !== -1;
    out.y = bestY;
    out.colliderId = bestId;
    out.material = material;
    return out.found;
  }

  /** Lowest underside at or above `minY` over a circular footprint (Infinity when open sky). */
  ceilingAt(x: number, z: number, minY: number, radius: number): number {
    let best = Infinity;
    const r2 = radius * radius;
    const list = this.queryAabb(x - radius, z - radius, x + radius, z + radius, this.scratch);
    for (let n = 0; n < list.length; n++) {
      const c = list[n]!;
      let under: number;
      if (c.kind === 'cylinder') {
        const dx = x - c.x;
        const dz = z - c.z;
        const reach = c.radius + radius;
        if (dx * dx + dz * dz >= reach * reach) continue;
        under = c.minY;
      } else {
        const cx = clamp(x, c.minX, c.maxX);
        const cz = clamp(z, c.minZ, c.maxZ);
        const dx = x - cx;
        const dz = z - cz;
        if (dx * dx + dz * dz >= r2) continue;
        if (c.kind === 'box') {
          under = c.minY;
        } else if (Number.isFinite(c.thickness)) {
          // Lowest part of the slab over the footprint is toward the low end.
          let lx = x;
          let lz = z;
          if (c.dir === 'x+') lx = x - radius;
          else if (c.dir === 'x-') lx = x + radius;
          else if (c.dir === 'z+') lz = z - radius;
          else lz = z + radius;
          under = rampSurfaceY(c, clamp(lx, c.minX, c.maxX), clamp(lz, c.minZ, c.maxZ)) - c.thickness;
        } else {
          under = c.baseY;
        }
      }
      if (under >= minY - EPS && under < best) best = under;
    }
    return best;
  }

  /**
   * Pushes a vertical cylinder (the character) out of every collider that acts as a wall for it
   * and removes the velocity component going into those walls. Surfaces up to `stepHeight`
   * above the feet are not walls: the ground query lifts the character onto them instead.
   */
  resolveCircle(
    mover: CircleMover,
    radius: number,
    feetY: number,
    headY: number,
    stepHeight: number,
  ): boolean {
    let touched = false;
    const reach = radius + 0.5;
    const list = this.queryAabb(mover.x - reach, mover.z - reach, mover.x + reach, mover.z + reach, this.scratch);
    const push = this.push;

    for (let iteration = 0; iteration < 4; iteration++) {
      let moved = false;
      for (let n = 0; n < list.length; n++) {
        if (!this.pushOut(list[n]!, mover.x, mover.z, radius, feetY, headY, stepHeight, push)) continue;
        mover.x += push.px;
        mover.z += push.pz;
        const vn = mover.vx * push.nx + mover.vz * push.nz;
        if (vn < 0) {
          mover.vx -= vn * push.nx;
          mover.vz -= vn * push.nz;
        }
        mover.hitNx = push.nx;
        mover.hitNz = push.nz;
        moved = true;
        touched = true;
      }
      if (!moved) break;
    }

    // The map edge stops movement but is not reported as a wall: there is nothing to climb.
    if (this.solidBounds) {
      const b = this.bounds;
      if (mover.x < b.minX + radius) {
        mover.x = b.minX + radius;
        if (mover.vx < 0) mover.vx = 0;
      } else if (mover.x > b.maxX - radius) {
        mover.x = b.maxX - radius;
        if (mover.vx > 0) mover.vx = 0;
      }
      if (mover.z < b.minZ + radius) {
        mover.z = b.minZ + radius;
        if (mover.vz < 0) mover.vz = 0;
      } else if (mover.z > b.maxZ - radius) {
        mover.z = b.maxZ - radius;
        if (mover.vz > 0) mover.vz = 0;
      }
    }
    return touched;
  }

  /** True when a vertical cylinder of the given size intersects terrain or any collider. */
  overlapsSolid(x: number, z: number, radius: number, minY: number, maxY: number): boolean {
    if (this.terrain && sampleHeightfield(this.terrain, x, z) > minY + EPS) return true;
    const r2 = radius * radius;
    const list = this.queryAabb(x - radius, z - radius, x + radius, z + radius, this.scratch);
    for (let n = 0; n < list.length; n++) {
      const c = list[n]!;
      if (c.kind === 'cylinder') {
        if (c.maxY <= minY + EPS || c.minY >= maxY - EPS) continue;
        const dx = x - c.x;
        const dz = z - c.z;
        const reach = c.radius + radius;
        if (dx * dx + dz * dz < reach * reach) return true;
        continue;
      }
      const cx = clamp(x, c.minX, c.maxX);
      const cz = clamp(z, c.minZ, c.maxZ);
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz >= r2) continue;
      if (c.kind === 'box') {
        if (c.maxY > minY + EPS && c.minY < maxY - EPS) return true;
      } else {
        const top = rampSurfaceY(c, cx, cz);
        const bottom = Number.isFinite(c.thickness) ? top - c.thickness : c.baseY;
        if (top > minY + EPS && bottom < maxY - EPS) return true;
      }
    }
    return false;
  }

  /**
   * Nearest intersection of a ray with colliders and terrain. `(dx, dy, dz)` must be a unit
   * vector. Returns false when nothing is hit within `maxDistance`.
   */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDistance: number,
    out: RayHit,
    options?: RaycastOptions,
  ): boolean {
    const ignoreTag = options?.ignoreTag;
    let best = maxDistance;
    let bestId = -1;
    let bestNx = 0;
    let bestNy = 1;
    let bestNz = 0;
    let bestMaterial: SurfaceMaterial = 'grass';

    const cs = this.cellSize;
    const stamp = ++this.stamp;
    let ix = Math.floor(ox / cs);
    let iz = Math.floor(oz / cs);
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
    const tDeltaX = stepX !== 0 ? cs / Math.abs(dx) : Infinity;
    const tDeltaZ = stepZ !== 0 ? cs / Math.abs(dz) : Infinity;
    let tMaxX = stepX > 0 ? ((ix + 1) * cs - ox) / dx : stepX < 0 ? (ix * cs - ox) / dx : Infinity;
    let tMaxZ = stepZ > 0 ? ((iz + 1) * cs - oz) / dz : stepZ < 0 ? (iz * cs - oz) / dz : Infinity;

    for (let guard = 0; guard < 4096; guard++) {
      const cell = this.grid.get(cellKey(ix, iz));
      if (cell) {
        for (let n = 0; n < cell.length; n++) {
          const c = cell[n]!;
          if (c.stamp === stamp) continue;
          c.stamp = stamp;
          if (ignoreTag !== undefined && c.tag === ignoreTag) continue;
          let t: number;
          if (c.kind === 'box') {
            t = rayBox(ox, oy, oz, dx, dy, dz, c.minX, c.minY, c.minZ, c.maxX, c.maxY, c.maxZ, best);
          } else if (c.kind === 'cylinder') {
            t = rayCylinder(ox, oy, oz, dx, dy, dz, c, best);
          } else {
            t = rayRamp(ox, oy, oz, dx, dy, dz, c, best);
          }
          if (t >= 0 && t < best) {
            best = t;
            bestId = c.id;
            bestNx = hitNx;
            bestNy = hitNy;
            bestNz = hitNz;
            bestMaterial = c.material;
          }
        }
      }
      const tNext = Math.min(tMaxX, tMaxZ);
      if (tNext > best) break;
      if (tMaxX < tMaxZ) {
        ix += stepX;
        tMaxX += tDeltaX;
      } else {
        iz += stepZ;
        tMaxZ += tDeltaZ;
      }
    }

    if (this.terrain && !options?.skipTerrain) {
      const t = this.rayTerrain(ox, oy, oz, dx, dy, dz, best);
      if (t >= 0 && t < best) {
        best = t;
        bestId = TERRAIN_ID;
        const hx = ox + dx * t;
        const hz = oz + dz * t;
        const g = heightfieldGradient(this.terrain, hx, hz, this.gradient);
        const inv = 1 / Math.hypot(g.gx, 1, g.gz);
        bestNx = -g.gx * inv;
        bestNy = inv;
        bestNz = -g.gz * inv;
        bestMaterial = this.materialAt(hx, hz);
      }
    }

    if (bestId === -1) return false;
    out.t = best;
    out.x = ox + dx * best;
    out.y = oy + dy * best;
    out.z = oz + dz * best;
    out.nx = bestNx;
    out.ny = bestNy;
    out.nz = bestNz;
    out.colliderId = bestId;
    out.material = bestMaterial;
    return true;
  }

  /** True when nothing blocks the straight segment between two points. */
  hasLineOfSight(ax: number, ay: number, az: number, bx: number, by: number, bz: number, scratch: RayHit): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return true;
    return !this.raycast(ax, ay, az, dx / length, dy / length, dz / length, length - 1e-3, scratch);
  }

  /* ---- internals -------------------------------------------------------------------------- */

  private rayTerrain(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number): number {
    const hf = this.terrain!;
    let t = 0;
    if (oy > hf.maxHeight) {
      if (dy >= 0) return -1;
      t = (hf.maxHeight - oy) / dy;
      if (t > maxT) return -1;
    }
    let prevT = t;
    let prevF = oy + dy * t - sampleHeightfield(hf, ox + dx * t, oz + dz * t);
    if (prevF <= 0) return t;
    const horizontal = Math.hypot(dx, dz);
    const step = horizontal > 1e-6 ? Math.min(hf.cellSize * 0.5 / horizontal, 2) : 2;
    for (let guard = 0; guard < 8192; guard++) {
      if (prevT >= maxT) return -1;
      const nextT = Math.min(prevT + step, maxT);
      const y = oy + dy * nextT;
      if (dy > 0 && y > hf.maxHeight) return -1;
      const f = y - sampleHeightfield(hf, ox + dx * nextT, oz + dz * nextT);
      if (f <= 0) {
        let lo = prevT;
        let hi = nextT;
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) * 0.5;
          const fm = oy + dy * mid - sampleHeightfield(hf, ox + dx * mid, oz + dz * mid);
          if (fm <= 0) hi = mid;
          else lo = mid;
        }
        return hi;
      }
      prevT = nextT;
      prevF = f;
    }
    return prevF <= 0 ? prevT : -1;
  }

  private pushOut(
    c: Collider,
    x: number,
    z: number,
    radius: number,
    feetY: number,
    headY: number,
    stepHeight: number,
    out: PushResult,
  ): boolean {
    if (c.kind === 'cylinder') {
      if (c.maxY <= feetY + stepHeight + EPS || c.minY >= headY - EPS) return false;
      const dx = x - c.x;
      const dz = z - c.z;
      const reach = radius + c.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= reach * reach) return false;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        out.nx = dx / d;
        out.nz = dz / d;
        out.px = out.nx * (reach - d);
        out.pz = out.nz * (reach - d);
      } else {
        out.nx = 1;
        out.nz = 0;
        out.px = reach;
        out.pz = 0;
      }
      return true;
    }

    const cx = clamp(x, c.minX, c.maxX);
    const cz = clamp(z, c.minZ, c.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) return false;

    let underSlab = false;
    if (c.kind === 'box') {
      if (c.maxY <= feetY + stepHeight + EPS || c.minY >= headY - EPS) return false;
    } else {
      const top = rampSurfaceY(c, cx, cz);
      const slab = Number.isFinite(c.thickness);
      const bottom = slab ? top - c.thickness : c.baseY;
      if (top <= feetY + stepHeight + EPS || bottom >= headY - EPS) return false;
      underSlab = slab && d2 <= 1e-12;
    }

    if (d2 > 1e-12) {
      const d = Math.sqrt(d2);
      out.nx = dx / d;
      out.nz = dz / d;
      out.px = out.nx * (radius - d);
      out.pz = out.nz * (radius - d);
      return true;
    }

    if (underSlab && c.kind === 'ramp') {
      // Walking under a thin ramp toward its low end: stop where the underside meets the head.
      const rise = c.highY - c.lowY;
      const uRequired = (headY + c.thickness - c.lowY) / rise;
      if (uRequired <= 1) {
        const run = rampRun(c);
        let u: number;
        let nx = 0;
        let nz = 0;
        if (c.dir === 'x+') {
          u = (x - c.minX) / run;
          nx = 1;
        } else if (c.dir === 'x-') {
          u = (c.maxX - x) / run;
          nx = -1;
        } else if (c.dir === 'z+') {
          u = (z - c.minZ) / run;
          nz = 1;
        } else {
          u = (c.maxZ - z) / run;
          nz = -1;
        }
        const distance = (uRequired - u) * run + EPS;
        if (distance <= 0) return false;
        out.nx = nx;
        out.nz = nz;
        out.px = nx * distance;
        out.pz = nz * distance;
        return true;
      }
    }

    // Centre inside the footprint: leave through the nearest side.
    const left = x - c.minX;
    const right = c.maxX - x;
    const back = z - c.minZ;
    const front = c.maxZ - z;
    const nearest = Math.min(left, right, back, front);
    out.nx = 0;
    out.nz = 0;
    if (nearest === left) out.nx = -1;
    else if (nearest === right) out.nx = 1;
    else if (nearest === back) out.nz = -1;
    else out.nz = 1;
    out.px = out.nx * (nearest + radius);
    out.pz = out.nz * (nearest + radius);
    return true;
  }

  private insert(collider: Collider): void {
    this.colliders.set(collider.id, collider);
    this.forEachCell(collider.minX, collider.minZ, collider.maxX, collider.maxZ, (key) => {
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(collider);
    });
    this.revision++;
  }

  private forEachCell(minX: number, minZ: number, maxX: number, maxZ: number, fn: (key: number) => void): void {
    const cs = this.cellSize;
    const ix0 = Math.floor(minX / cs);
    const ix1 = Math.floor(maxX / cs);
    const iz0 = Math.floor(minZ / cs);
    const iz1 = Math.floor(maxZ / cs);
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) fn(cellKey(ix, iz));
    }
  }
}

function cellKey(ix: number, iz: number): number {
  return (ix + 32768) * 65536 + (iz + 32768);
}
