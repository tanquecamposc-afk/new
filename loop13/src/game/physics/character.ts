/**
 * Kinematic capsule character controller: gravity, jumping, stepping,
 * circle-vs-AABB wall sliding, standing on props/crates, pushing crates.
 */
import { PLAYER } from '../core/constants';
import { crateBox, solidBoxes, type AABB } from './colliders';
import { world, type CrateState } from '../core/world';
import { clamp } from '../core/rng';

/** Push a circle (x,z,r) out of an AABB in XZ. Returns correction or null. */
export function circleVsBox(x: number, z: number, r: number, b: AABB): [number, number] | null {
  const cx = clamp(x, b.minX, b.maxX);
  const cz = clamp(z, b.minZ, b.maxZ);
  let dx = x - cx, dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const push = r - d;
    return [(dx / d) * push, (dz / d) * push];
  }
  // centre inside the box: push out along the smallest axis
  const left = x - b.minX, right = b.maxX - x, top = z - b.minZ, bottom = b.maxZ - z;
  const m = Math.min(left, right, top, bottom);
  if (m === left) dx = -(left + r); else if (m === right) dx = right + r; else dx = 0;
  if (m === top) dz = -(top + r); else if (m === bottom) dz = bottom + r; else dz = 0;
  return [dx, dz];
}

export interface MoveResult { grounded: boolean; hitCeiling: boolean; landedSpeed: number; }

/**
 * Integrate a vertical capsule. `pos.y` is the feet height.
 * Boxes whose top is within stepHeight of the feet are treated as floor.
 */
export function moveCharacter(
  pos: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  radius: number,
  height: number,
  dt: number,
  boxes: AABB[],
  onPush?: (box: AABB, nx: number, nz: number) => void,
): MoveResult {
  // horizontal
  pos.x += vel.x * dt;
  pos.z += vel.z * dt;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const b of boxes) {
      if (b.maxY <= pos.y + PLAYER.stepHeight || b.minY >= pos.y + height) continue;
      const c = circleVsBox(pos.x, pos.z, radius, b);
      if (c) {
        if (b.kind === 'crate' && onPush) onPush(b, -c[0], -c[1]);
        pos.x += c[0];
        pos.z += c[1];
        moved = true;
      }
    }
    if (!moved) break;
  }
  // vertical
  const wasY = pos.y;
  vel.y -= PLAYER.gravity * dt;
  pos.y += vel.y * dt;
  let ground = 0;
  let ceiling = Infinity;
  for (const b of boxes) {
    // overlap in XZ with a slightly smaller footprint so edges don't catch
    const r = radius * 0.7;
    if (pos.x + r <= b.minX || pos.x - r >= b.maxX || pos.z + r <= b.minZ || pos.z - r >= b.maxZ) continue;
    if (b.maxY <= wasY + PLAYER.stepHeight + 0.001) ground = Math.max(ground, b.maxY);
    else if (b.minY >= wasY + height - 0.05) ceiling = Math.min(ceiling, b.minY);
  }
  let grounded = false;
  let landedSpeed = 0;
  let hitCeiling = false;
  if (pos.y <= ground) {
    if (vel.y < -0.5) landedSpeed = -vel.y;
    pos.y = ground;
    vel.y = 0;
    grounded = true;
  } else if (pos.y - ground < 0.05 && vel.y <= 0) {
    pos.y = ground;
    vel.y = 0;
    grounded = true;
  }
  if (pos.y + height > ceiling) {
    pos.y = ceiling - height;
    if (vel.y > 0) vel.y = 0;
    hitCeiling = true;
  }
  return { grounded, hitCeiling, landedSpeed };
}

/** Simple rigid crates: gravity, friction, collision with statics and each other. */
export function updateCrates(dt: number): void {
  const statics = solidBoxes(false);
  for (const c of world.crates) {
    const h = c.size / 2;
    c.vel.y -= PLAYER.gravity * dt;
    const f = Math.exp(-6 * dt);
    c.vel.x *= f;
    c.vel.z *= f;
    const others = world.crates.filter((o) => o !== c).map((o) => crateBox(o.pos.x, o.pos.y, o.pos.z, o.size));
    const boxes = statics.concat(others);
    // horizontal
    c.pos.x += c.vel.x * dt;
    c.pos.z += c.vel.z * dt;
    for (const b of boxes) {
      if (b.maxY <= c.pos.y - h + 0.05 || b.minY >= c.pos.y + h) continue;
      const self = crateBox(c.pos.x, c.pos.y, c.pos.z, c.size);
      const ox = Math.min(self.maxX, b.maxX) - Math.max(self.minX, b.minX);
      const oz = Math.min(self.maxZ, b.maxZ) - Math.max(self.minZ, b.minZ);
      if (ox > 0 && oz > 0) {
        if (ox < oz) { c.pos.x += c.pos.x < (b.minX + b.maxX) / 2 ? -ox : ox; c.vel.x = 0; }
        else { c.pos.z += c.pos.z < (b.minZ + b.maxZ) / 2 ? -oz : oz; c.vel.z = 0; }
      }
    }
    // vertical
    c.pos.y += c.vel.y * dt;
    let ground = 0;
    for (const b of boxes) {
      if (c.pos.x + h * 0.9 <= b.minX || c.pos.x - h * 0.9 >= b.maxX || c.pos.z + h * 0.9 <= b.minZ || c.pos.z - h * 0.9 >= b.maxZ) continue;
      if (b.maxY <= c.pos.y - h + 0.3) ground = Math.max(ground, b.maxY);
    }
    if (c.pos.y - h <= ground) { c.pos.y = ground + h; c.vel.y = 0; }
  }
}

export function pushCrate(crate: CrateState, nx: number, nz: number, strength: number): void {
  crate.vel.x += nx * strength;
  crate.vel.z += nz * strength;
  const sp = Math.hypot(crate.vel.x, crate.vel.z);
  const max = 1.6;
  if (sp > max) { crate.vel.x *= max / sp; crate.vel.z *= max / sp; }
}
