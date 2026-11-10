/**
 * Third-person, over-the-shoulder camera placement. Pure geometry: given where the character is
 * and where they look, find a camera position that never sits inside the world.
 *
 * It lives in the domain layer (not the renderer) because aiming depends on it: a shot is traced
 * from this camera through the crosshair, so a future server must be able to recompute it.
 */
import type { CameraConfig } from './config.js';
import { lerp } from './math.js';
import { makeRayHit, type RayHit, type World } from './world.js';

export interface CameraRig {
  /** Point the camera orbits (above the character's shoulder). */
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  /** Camera position. */
  x: number;
  y: number;
  z: number;
  /** Unit view direction. */
  fx: number;
  fy: number;
  fz: number;
  /** Actual pivot-to-camera distance after collision. */
  distance: number;
  desiredDistance: number;
  blocked: boolean;
}

export function makeCameraRig(): CameraRig {
  return {
    pivotX: 0,
    pivotY: 0,
    pivotZ: 0,
    x: 0,
    y: 0,
    z: 0,
    fx: 0,
    fy: 0,
    fz: -1,
    distance: 0,
    desiredDistance: 0,
    blocked: false,
  };
}

const hit: RayHit = makeRayHit();

/**
 * @param feetX,feetY,feetZ character feet position
 * @param eye   eye height above the feet for the current stance
 * @param aim   0 = hip camera, 1 = fully aiming down sights
 */
export function computeCameraRig(
  world: World,
  feetX: number,
  feetY: number,
  feetZ: number,
  eye: number,
  yaw: number,
  pitch: number,
  cfg: CameraConfig,
  aim: number,
  out: CameraRig,
): CameraRig {
  const cosPitch = Math.cos(pitch);
  const fx = -Math.sin(yaw) * cosPitch;
  const fy = Math.sin(pitch);
  const fz = -Math.cos(yaw) * cosPitch;
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  const headX = feetX;
  const headY = feetY + eye + cfg.pivotRaise;
  const headZ = feetZ;

  // Slide the pivot toward the shoulder, but not through a wall.
  let shoulder = cfg.shoulderOffset;
  if (shoulder > 0 && world.raycast(headX, headY, headZ, rightX, 0, rightZ, shoulder + cfg.collisionMargin, hit)) {
    shoulder = Math.max(0, hit.t - cfg.collisionMargin);
  }
  const pivotX = headX + rightX * shoulder;
  const pivotY = headY;
  const pivotZ = headZ + rightZ * shoulder;

  const desired = lerp(cfg.distance, cfg.adsDistance, aim < 0 ? 0 : aim > 1 ? 1 : aim);
  let distance = desired;
  let blocked = false;
  if (world.raycast(pivotX, pivotY, pivotZ, -fx, -fy, -fz, desired + cfg.collisionMargin, hit)) {
    distance = Math.min(desired, Math.max(cfg.minDistance, hit.t - cfg.collisionMargin));
    blocked = distance < desired - 1e-4;
  }

  let camX = pivotX - fx * distance;
  let camY = pivotY - fy * distance;
  let camZ = pivotZ - fz * distance;

  // Keep the camera inside the playable volume.
  if (world.solidBounds) {
    const b = world.bounds;
    if (camX < b.minX) camX = b.minX;
    else if (camX > b.maxX) camX = b.maxX;
    if (camZ < b.minZ) camZ = b.minZ;
    else if (camZ > b.maxZ) camZ = b.maxZ;
  }

  // Never let a grazing angle leave the camera under the terrain.
  const floor = world.terrainHeight(camX, camZ) + 0.12;
  if (camY < floor) {
    camY = floor;
    blocked = true;
  }

  out.pivotX = pivotX;
  out.pivotY = pivotY;
  out.pivotZ = pivotZ;
  out.x = camX;
  out.y = camY;
  out.z = camZ;
  out.fx = fx;
  out.fy = fy;
  out.fz = fz;
  out.distance = distance;
  out.desiredDistance = desired;
  out.blocked = blocked;
  return out;
}
