/**
 * Lightweight deterministic physics:
 *  - axis-aligned box colliders (static, moving, one-way, triggers)
 *  - swept kinematic character movement with step-up, ground and ceiling detection
 *  - ray casting (camera collision, line of sight, hitscan)
 *  - simple dynamic rigid bodies (falling objects, debris, crates)
 */
import * as THREE from 'three';

export interface Collider {
  min: THREE.Vector3;
  max: THREE.Vector3;
  /** Movement applied this frame (moving platforms carry the player). */
  delta: THREE.Vector3;
  enabled: boolean;
  /** One-way platforms only collide from above. */
  oneWay?: boolean;
  /** Ice / low friction surfaces. */
  friction?: number;
  tag?: string;
  owner?: unknown;
  /** Called when a character lands on it. */
  onLand?: () => void;
  /** Blocks rays (camera / line of sight). Defaults to true. */
  blocksSight?: boolean;
  /** Excluded from character collision but still blocks rays when false. */
  solid?: boolean;
}

export interface MoveResult {
  grounded: boolean;
  ground: Collider | null;
  hitCeiling: boolean;
  hitWall: boolean;
  wallNormal: THREE.Vector3;
}

export interface RayHit {
  dist: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  collider: Collider;
}

const EPS = 0.001;

export function makeCollider(center: THREE.Vector3, size: THREE.Vector3, extra: Partial<Collider> = {}): Collider {
  return {
    min: new THREE.Vector3(center.x - size.x / 2, center.y - size.y / 2, center.z - size.z / 2),
    max: new THREE.Vector3(center.x + size.x / 2, center.y + size.y / 2, center.z + size.z / 2),
    delta: new THREE.Vector3(),
    enabled: true,
    ...extra,
  };
}

/** Move a collider so its centre is at `c` and record the delta. */
export function setColliderCenter(col: Collider, c: THREE.Vector3) {
  const hx = (col.max.x - col.min.x) / 2, hy = (col.max.y - col.min.y) / 2, hz = (col.max.z - col.min.z) / 2;
  const ox = (col.min.x + col.max.x) / 2, oy = (col.min.y + col.max.y) / 2, oz = (col.min.z + col.max.z) / 2;
  col.delta.set(c.x - ox, c.y - oy, c.z - oz);
  col.min.set(c.x - hx, c.y - hy, c.z - hz);
  col.max.set(c.x + hx, c.y + hy, c.z + hz);
}

export class DynamicBody {
  pos: THREE.Vector3;
  vel = new THREE.Vector3();
  half: THREE.Vector3;
  grounded = false;
  bounce = 0.25;
  friction = 4;
  alive = true;
  gravityScale = 1;
  onGround?: (b: DynamicBody, impact: number) => void;
  constructor(pos: THREE.Vector3, half: THREE.Vector3, public mesh?: THREE.Object3D, public angVel = new THREE.Vector3()) {
    this.pos = pos.clone();
    this.half = half.clone();
  }
}

export class PhysicsWorld {
  colliders: Collider[] = [];
  bodies: DynamicBody[] = [];
  gravity = -28;

  add(c: Collider) {
    this.colliders.push(c);
    return c;
  }
  remove(c: Collider) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
  }
  addBody(b: DynamicBody) {
    this.bodies.push(b);
    return b;
  }
  clear() {
    this.colliders = [];
    this.bodies = [];
  }

  /**
   * Swept AABB character move. `pos` is the feet centre; `half` the half-extents.
   * Resolves each axis separately (stable and cheap) with automatic step-up.
   */
  moveCharacter(pos: THREE.Vector3, half: THREE.Vector3, move: THREE.Vector3, stepHeight = 0.45, res?: MoveResult): MoveResult {
    const r: MoveResult = res ?? { grounded: false, ground: null, hitCeiling: false, hitWall: false, wallNormal: new THREE.Vector3() };
    r.grounded = false;
    r.ground = null;
    r.hitCeiling = false;
    r.hitWall = false;
    r.wallNormal.set(0, 0, 0);

    // Sub-step long moves to avoid tunnelling through thin geometry
    const len = Math.max(Math.abs(move.x), Math.abs(move.y), Math.abs(move.z));
    const steps = Math.min(8, Math.max(1, Math.ceil(len / (Math.min(half.x, half.y) * 0.9))));
    const sx = move.x / steps, sy = move.y / steps, sz = move.z / steps;
    for (let s = 0; s < steps; s++) {
      this.axis(pos, half, 0, sx, stepHeight, r);
      this.axis(pos, half, 2, sz, stepHeight, r);
      this.axis(pos, half, 1, sy, 0, r);
    }
    // Probe for ground when not moving down (so standing still stays grounded)
    if (!r.grounded && move.y <= 0) {
      const g = this.groundBelow(pos, half, 0.06);
      if (g) {
        r.grounded = true;
        r.ground = g;
      }
    }
    return r;
  }

  private overlaps(c: Collider, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
    return c.min.x < maxX && c.max.x > minX && c.min.y < maxY && c.max.y > minY && c.min.z < maxZ && c.max.z > minZ;
  }

  private axis(pos: THREE.Vector3, half: THREE.Vector3, ax: 0 | 1 | 2, d: number, stepHeight: number, r: MoveResult) {
    if (d === 0) return;
    const p = [pos.x, pos.y, pos.z];
    p[ax] += d;
    let minX = p[0] - half.x, maxX = p[0] + half.x;
    let minY = p[1], maxY = p[1] + half.y * 2;
    let minZ = p[2] - half.z, maxZ = p[2] + half.z;
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false) continue;
      if (!this.overlaps(c, minX, minY, minZ, maxX, maxY, maxZ)) continue;
      if (c.oneWay) {
        // Only block downward motion when feet were above the top surface
        if (!(ax === 1 && d < 0 && pos.y >= c.max.y - 0.05)) continue;
      }
      if (ax === 1) {
        if (d < 0) {
          p[1] = c.max.y + EPS;
          r.grounded = true;
          r.ground = c;
        } else {
          p[1] = c.min.y - half.y * 2 - EPS;
          r.hitCeiling = true;
        }
      } else {
        // Try step-up for small ledges
        const stepUp = c.max.y - pos.y;
        if (stepHeight > 0 && stepUp > 0 && stepUp <= stepHeight && !this.blocked(p[0], c.max.y + EPS, p[2], half)) {
          p[1] = c.max.y + EPS;
        } else if (ax === 0) {
          p[0] = d > 0 ? c.min.x - half.x - EPS : c.max.x + half.x + EPS;
          r.hitWall = true;
          r.wallNormal.set(d > 0 ? -1 : 1, 0, 0);
        } else {
          p[2] = d > 0 ? c.min.z - half.z - EPS : c.max.z + half.z + EPS;
          r.hitWall = true;
          r.wallNormal.set(0, 0, d > 0 ? -1 : 1);
        }
      }
      minX = p[0] - half.x; maxX = p[0] + half.x;
      minY = p[1]; maxY = p[1] + half.y * 2;
      minZ = p[2] - half.z; maxZ = p[2] + half.z;
    }
    pos.set(p[0], p[1], p[2]);
  }

  /** True if a box at feet position (x,y,z) would intersect a solid collider. */
  blocked(x: number, y: number, z: number, half: THREE.Vector3) {
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false || c.oneWay) continue;
      if (this.overlaps(c, x - half.x, y, z - half.z, x + half.x, y + half.y * 2, z + half.z)) return true;
    }
    return false;
  }

  groundBelow(pos: THREE.Vector3, half: THREE.Vector3, dist: number): Collider | null {
    let best: Collider | null = null;
    let bestY = -Infinity;
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false) continue;
      if (c.min.x >= pos.x + half.x || c.max.x <= pos.x - half.x || c.min.z >= pos.z + half.z || c.max.z <= pos.z - half.z) continue;
      if (c.max.y <= pos.y + 0.02 && c.max.y >= pos.y - dist && c.max.y > bestY) {
        best = c;
        bestY = c.max.y;
      }
    }
    return best;
  }

  /** Highest solid surface under (x,z) below height y. */
  heightAt(x: number, z: number, y = 1000): number {
    let best = -Infinity;
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false) continue;
      if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
      if (c.max.y <= y && c.max.y > best) best = c.max.y;
    }
    return best;
  }

  /** Push a character out of any collider it overlaps (e.g. after a moving platform moved into it). */
  depenetrate(pos: THREE.Vector3, half: THREE.Vector3): boolean {
    let pushed = false;
    for (const c of this.colliders) {
      if (!c.enabled || c.solid === false || c.oneWay) continue;
      const minX = pos.x - half.x, maxX = pos.x + half.x, minY = pos.y, maxY = pos.y + half.y * 2, minZ = pos.z - half.z, maxZ = pos.z + half.z;
      if (!this.overlaps(c, minX, minY, minZ, maxX, maxY, maxZ)) continue;
      const px1 = c.max.x - minX, px2 = maxX - c.min.x;
      const py1 = c.max.y - minY, py2 = maxY - c.min.y;
      const pz1 = c.max.z - minZ, pz2 = maxZ - c.min.z;
      const m = Math.min(px1, px2, py1, py2, pz1, pz2);
      if (m === py1) pos.y += py1 + EPS;
      else if (m === px1) pos.x += px1 + EPS;
      else if (m === px2) pos.x -= px2 + EPS;
      else if (m === pz1) pos.z += pz1 + EPS;
      else if (m === pz2) pos.z -= pz2 + EPS;
      else pos.y -= py2 + EPS;
      pushed = true;
    }
    return pushed;
  }

  /** Ray vs all colliders (slab test). */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, filter?: (c: Collider) => boolean): RayHit | null {
    let best: RayHit | null = null;
    let bestT = maxDist;
    const ix = 1 / (dir.x || 1e-9), iy = 1 / (dir.y || 1e-9), iz = 1 / (dir.z || 1e-9);
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (c.blocksSight === false) continue;
      if (filter && !filter(c)) continue;
      let t1 = (c.min.x - origin.x) * ix, t2 = (c.max.x - origin.x) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      let nAx = 0, nSign = t1 < t2 ? -1 : 1;
      t1 = (c.min.y - origin.y) * iy; t2 = (c.max.y - origin.y) * iy;
      const ty0 = Math.min(t1, t2);
      if (ty0 > tmin) { tmin = ty0; nAx = 1; nSign = t1 < t2 ? -1 : 1; }
      tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (c.min.z - origin.z) * iz; t2 = (c.max.z - origin.z) * iz;
      const tz0 = Math.min(t1, t2);
      if (tz0 > tmin) { tmin = tz0; nAx = 2; nSign = t1 < t2 ? -1 : 1; }
      tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax < Math.max(0, tmin)) continue;
      const t = tmin < 0 ? 0 : tmin;
      if (t < bestT) {
        bestT = t;
        const n = new THREE.Vector3();
        n.setComponent(nAx, nSign);
        best = { dist: t, point: origin.clone().addScaledVector(dir, t), normal: n, collider: c };
      }
    }
    return best;
  }

  /** Line of sight between two points (true = clear). */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3, ignore?: (c: Collider) => boolean): boolean {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.001) return true;
    dir.divideScalar(len);
    const hit = this.raycast(a, dir, len - 0.05, ignore ? (c) => !ignore(c) : undefined);
    return !hit;
  }

  overlapBox(min: THREE.Vector3, max: THREE.Vector3): Collider[] {
    return this.colliders.filter((c) => c.enabled && this.overlaps(c, min.x, min.y, min.z, max.x, max.y, max.z));
  }

  updateBodies(dt: number) {
    for (const b of this.bodies) {
      if (!b.alive) continue;
      b.vel.y += this.gravity * b.gravityScale * dt;
      const wasGrounded = b.grounded;
      const vy = b.vel.y;
      const res = this.moveCharacter(b.pos, b.half, b.vel.clone().multiplyScalar(dt), 0);
      b.grounded = res.grounded;
      if (res.grounded) {
        if (!wasGrounded && vy < -3) b.onGround?.(b, -vy);
        b.vel.y = vy < -4 ? -vy * b.bounce : 0;
        const f = Math.max(0, 1 - b.friction * dt);
        b.vel.x *= f;
        b.vel.z *= f;
        b.angVel.multiplyScalar(f);
      }
      if (res.hitWall) {
        if (res.wallNormal.x) b.vel.x *= -b.bounce;
        if (res.wallNormal.z) b.vel.z *= -b.bounce;
      }
      if (res.hitCeiling && b.vel.y > 0) b.vel.y = 0;
      if (b.mesh) {
        b.mesh.position.set(b.pos.x, b.pos.y + b.half.y, b.pos.z);
        b.mesh.rotation.x += b.angVel.x * dt;
        b.mesh.rotation.y += b.angVel.y * dt;
        b.mesh.rotation.z += b.angVel.z * dt;
      }
      if (b.pos.y < -80) b.alive = false;
    }
    if (this.bodies.some((b) => !b.alive)) this.bodies = this.bodies.filter((b) => b.alive);
  }

  /** Reset per-frame deltas of moving colliders. */
  clearDeltas() {
    for (const c of this.colliders) c.delta.set(0, 0, 0);
  }
}
