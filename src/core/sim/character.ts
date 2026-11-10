/**
 * Kinematic character controller. One call to `stepCharacter` advances a character by exactly one
 * fixed tick: intent -> velocity -> horizontal move with wall sliding -> vertical move with
 * ground / ceiling resolution -> state bookkeeping.
 *
 * It mutates the state object it is given (no per-tick allocation) but is fully deterministic:
 * same state + same input + same world => same result, independent of rendering frame rate.
 */
import type { MovementConfig } from './config.js';
import type { InputFrame } from './input.js';
import { clamp } from './math.js';
import {
  TERRAIN_ID,
  makeGroundInfo,
  type CircleMover,
  type Gradient2,
  type GroundInfo,
  type SurfaceMaterial,
  type World,
} from './world.js';

export type MoveState = 'idle' | 'walk' | 'sprint' | 'crouch' | 'slide' | 'air' | 'mantle';

export interface MantleState {
  ticks: number;
  total: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  colliderId: number;
}

export interface CharacterState {
  /** Feet position. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  /** Current collision height (standing or crouched). */
  height: number;
  grounded: boolean;
  crouching: boolean;
  sliding: boolean;
  onSteepSlope: boolean;
  moveState: MoveState;
  groundMaterial: SurfaceMaterial;
  /** Collider under the feet, TERRAIN_ID for terrain, -1 while airborne. */
  groundColliderId: number;
  ticksSinceGrounded: number;
  jumpBufferTicks: number;
  jumpHeld: boolean;
  crouchHeld: boolean;
  slideTicks: number;
  slideCooldownTicks: number;
  /** Highest feet height reached since leaving the ground; gives the fall height on landing. */
  peakY: number;
  mantle: MantleState | null;
  /** Metres travelled on foot; drives footsteps and the walk cycle. */
  strideMeters: number;
}

export type CharacterEvent =
  | { type: 'jump' }
  | { type: 'land'; fallHeight: number; impactSpeed: number; material: SurfaceMaterial }
  | { type: 'slide_start' }
  | { type: 'slide_end' }
  | { type: 'mantle_start'; height: number }
  | { type: 'mantle_end' }
  | { type: 'void' }
  | { type: 'invalid_state' };

export function createCharacter(x: number, y: number, z: number, yaw: number, cfg: MovementConfig): CharacterState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw,
    height: cfg.standHeight,
    grounded: false,
    crouching: false,
    sliding: false,
    onSteepSlope: false,
    moveState: 'air',
    groundMaterial: 'grass',
    groundColliderId: -1,
    ticksSinceGrounded: cfg.coyoteTicks + 1,
    jumpBufferTicks: 0,
    jumpHeld: false,
    crouchHeld: false,
    slideTicks: 0,
    slideCooldownTicks: 0,
    peakY: y,
    mantle: null,
    strideMeters: 0,
  };
}

/** Eye height above the feet for the current stance. */
export function eyeHeight(c: CharacterState, cfg: MovementConfig): number {
  return c.height < cfg.standHeight - 1e-6 ? cfg.crouchEyeHeight : cfg.standEyeHeight;
}

/** Applies an instantaneous velocity change (knockback, launch pads...). */
export function applyImpulse(c: CharacterState, ix: number, iy: number, iz: number): void {
  if (!Number.isFinite(ix) || !Number.isFinite(iy) || !Number.isFinite(iz)) return;
  c.vx += ix;
  c.vy += iy;
  c.vz += iz;
  if (iy > 0 && c.grounded) {
    c.grounded = false;
    c.ticksSinceGrounded = 1000;
    c.peakY = c.y;
  }
  if (c.mantle) c.mantle = null;
}

/* Module-level scratch objects keep the hot path allocation free. */
const ground: GroundInfo = makeGroundInfo();
const probe: GroundInfo = makeGroundInfo();
const gradient: Gradient2 = { gx: 0, gz: 0 };
const mover: CircleMover = { x: 0, z: 0, vx: 0, vz: 0, hitNx: 0, hitNz: 0 };

function canStand(c: CharacterState, world: World, cfg: MovementConfig): boolean {
  const ceiling = world.ceilingAt(c.x, c.z, c.y + cfg.crouchHeight - 0.02, cfg.radius * 0.9);
  return ceiling >= c.y + cfg.standHeight;
}

function endSlide(c: CharacterState, world: World, cfg: MovementConfig, events: CharacterEvent[], wantCrouch: boolean): void {
  c.sliding = false;
  c.slideTicks = 0;
  c.slideCooldownTicks = cfg.slideCooldownTicks;
  c.crouching = wantCrouch || !canStand(c, world, cfg);
  events.push({ type: 'slide_end' });
}

function advanceMantle(c: CharacterState, world: World, cfg: MovementConfig, events: CharacterEvent[]): void {
  const m = c.mantle!;
  if (!world.get(m.colliderId)) {
    // The ledge was destroyed mid-climb: drop.
    c.mantle = null;
    c.grounded = false;
    c.vx = 0;
    c.vy = 0;
    c.vz = 0;
    c.peakY = c.y;
    c.moveState = 'air';
    return;
  }
  m.ticks++;
  const t = m.ticks / m.total;
  // Strictly sequential — rise to the ledge, then step onto it — so the body never cuts
  // through the corner it is climbing.
  const up = clamp(t / 0.6, 0, 1);
  const forward = clamp((t - 0.6) / 0.4, 0, 1);
  const easeUp = 1 - (1 - up) * (1 - up);
  const easeForward = forward * forward * (3 - 2 * forward);
  c.x = m.fromX + (m.toX - m.fromX) * easeForward;
  c.z = m.fromZ + (m.toZ - m.fromZ) * easeForward;
  c.y = m.fromY + (m.toY - m.fromY) * easeUp;
  c.vx = 0;
  c.vy = 0;
  c.vz = 0;
  c.moveState = 'mantle';
  if (m.ticks >= m.total) {
    c.x = m.toX;
    c.y = m.toY;
    c.z = m.toZ;
    c.grounded = true;
    c.ticksSinceGrounded = 0;
    c.groundColliderId = m.colliderId;
    c.peakY = c.y;
    c.mantle = null;
    c.moveState = 'idle';
    events.push({ type: 'mantle_end' });
  }
}

/**
 * Starts a ledge climb when an airborne character is pressing into a wall whose top is within
 * reach and has standing room. Returns true when the mantle began.
 */
function tryStartMantle(
  c: CharacterState,
  world: World,
  cfg: MovementConfig,
  wishX: number,
  wishZ: number,
  wallNx: number,
  wallNz: number,
  events: CharacterEvent[],
): boolean {
  // Must be pushing toward the wall.
  const into = -(wishX * wallNx + wishZ * wallNz);
  if (into < 0.5) return false;

  const probeX = c.x - wallNx * (cfg.radius + 0.2);
  const probeZ = c.z - wallNz * (cfg.radius + 0.2);
  if (!world.groundAt(probeX, probeZ, c.y + cfg.mantleMaxReach, 0.05, probe)) return false;
  if (probe.colliderId === TERRAIN_ID) return false;

  const rise = probe.y - c.y;
  const remainingJump = c.vy > 0 ? (c.vy * c.vy) / (2 * -cfg.gravity) : 0;
  // If the current jump arc already clears the ledge, let physics do it.
  if (rise <= Math.max(cfg.stepHeight + 0.2, remainingJump - 0.05)) return false;

  const targetX = c.x - wallNx * (cfg.radius + cfg.mantleForward);
  const targetZ = c.z - wallNz * (cfg.radius + cfg.mantleForward);
  if (!world.groundAt(targetX, targetZ, probe.y + 0.1, cfg.supportRadius, ground)) return false;
  if (ground.colliderId === TERRAIN_ID || ground.y < probe.y - 0.1) return false;
  const topY = ground.y;

  // Standing room on top (at the destination and on the way there), and a clear column to rise through.
  if (world.overlapsSolid(targetX, targetZ, cfg.radius * 0.95, topY + 0.03, topY + cfg.standHeight)) return false;
  const midX = (c.x + targetX) * 0.5;
  const midZ = (c.z + targetZ) * 0.5;
  if (world.overlapsSolid(midX, midZ, cfg.radius * 0.95, topY + 0.03, topY + cfg.standHeight)) return false;
  if (world.ceilingAt(c.x, c.z, c.y + c.height - 0.05, cfg.radius * 0.85) < topY + cfg.standHeight) return false;

  c.mantle = {
    ticks: 0,
    total: cfg.mantleTicks,
    fromX: c.x,
    fromY: c.y,
    fromZ: c.z,
    toX: targetX,
    toY: topY,
    toZ: targetZ,
    colliderId: ground.colliderId,
  };
  c.vx = 0;
  c.vy = 0;
  c.vz = 0;
  c.sliding = false;
  c.crouching = false;
  c.height = cfg.standHeight;
  c.moveState = 'mantle';
  events.push({ type: 'mantle_start', height: topY - c.y });
  return true;
}

export function stepCharacter(
  c: CharacterState,
  input: InputFrame,
  world: World,
  cfg: MovementConfig,
  dt: number,
  events: CharacterEvent[],
): void {
  const prevX = c.x;
  const prevY = c.y;
  const prevZ = c.z;

  c.yaw = input.yaw;
  if (c.jumpBufferTicks > 0) c.jumpBufferTicks--;
  if (c.slideCooldownTicks > 0) c.slideCooldownTicks--;
  const jumpPressed = input.jump && !c.jumpHeld;
  const crouchPressed = input.crouch && !c.crouchHeld;
  c.jumpHeld = input.jump;
  c.crouchHeld = input.crouch;
  if (jumpPressed) c.jumpBufferTicks = cfg.jumpBufferTicks;

  if (c.mantle) {
    advanceMantle(c, world, cfg, events);
    return;
  }

  const tanMaxSlope = Math.tan((cfg.maxSlopeDegrees * Math.PI) / 180);

  // Camera-relative wish direction: forward = (-sin, -cos), right = (cos, -sin).
  const sinYaw = Math.sin(input.yaw);
  const cosYaw = Math.cos(input.yaw);
  const wishX = -sinYaw * input.moveZ + cosYaw * input.moveX;
  const wishZ = -cosYaw * input.moveZ - sinYaw * input.moveX;
  const wishLength = Math.hypot(wishX, wishZ);
  const hasInput = wishLength > 1e-3;

  /* ---- stance: crouch and slide --------------------------------------------------------- */
  const speedBefore = Math.hypot(c.vx, c.vz);
  if (c.sliding) {
    c.slideTicks++;
    if (!input.crouch || !c.grounded || speedBefore < cfg.slideEndSpeed || c.slideTicks >= cfg.slideMaxTicks) {
      endSlide(c, world, cfg, events, input.crouch && c.grounded);
    }
  } else if (c.grounded) {
    const canSlide =
      crouchPressed &&
      !c.crouching &&
      input.sprint &&
      speedBefore >= cfg.slideMinSpeed &&
      c.slideCooldownTicks === 0 &&
      !c.onSteepSlope;
    if (canSlide) {
      c.sliding = true;
      c.slideTicks = 0;
      const boost = Math.max(speedBefore, cfg.slideStartSpeed) / speedBefore;
      c.vx *= boost;
      c.vz *= boost;
      events.push({ type: 'slide_start' });
    } else if (input.crouch && !c.crouching) {
      c.crouching = true;
    }
  }
  if (c.crouching && !c.sliding && !input.crouch && canStand(c, world, cfg)) c.crouching = false;
  c.height = c.crouching || c.sliding ? cfg.crouchHeight : cfg.standHeight;

  /* ---- horizontal velocity -------------------------------------------------------------- */
  if (c.sliding) {
    let speed = Math.hypot(c.vx, c.vz);
    if (speed > 1e-6) {
      if (hasInput) {
        // Limited steering: rotate the slide direction toward the wish direction.
        const dirX = c.vx / speed;
        const dirZ = c.vz / speed;
        const cross = dirX * (wishZ / wishLength) - dirZ * (wishX / wishLength);
        const turn = clamp(cross, -1, 1) * cfg.slideSteerRadiansPerSecond * dt;
        const cosT = Math.cos(turn);
        const sinT = Math.sin(turn);
        c.vx = (dirX * cosT - dirZ * sinT) * speed;
        c.vz = (dirX * sinT + dirZ * cosT) * speed;
      }
      const next = Math.max(0, speed - cfg.slideFriction * dt);
      c.vx *= next / speed;
      c.vz *= next / speed;
      speed = next;
    }
    if (c.groundColliderId === TERRAIN_ID) {
      // Downhill keeps a slide alive, uphill kills it sooner.
      const slope = world.terrainSlope(c.x, c.z, gradient);
      const k = -cfg.gravity / (1 + slope * slope);
      c.vx -= gradient.gx * k * dt;
      c.vz -= gradient.gz * k * dt;
    }
  } else if (c.grounded && c.onSteepSlope) {
    // Too steep to stand on: gravity drags the character downhill.
    const slope = world.terrainSlope(c.x, c.z, gradient);
    const k = -cfg.gravity / (1 + slope * slope);
    c.vx -= gradient.gx * k * dt;
    c.vz -= gradient.gz * k * dt;
    const speed = Math.hypot(c.vx, c.vz);
    const limit = 10;
    if (speed > limit) {
      c.vx *= limit / speed;
      c.vz *= limit / speed;
    }
  } else if (c.grounded) {
    const sprinting = input.sprint && input.moveZ > 0.1 && !c.crouching;
    const maxSpeed = c.crouching ? cfg.crouchSpeed : sprinting ? cfg.sprintSpeed : cfg.walkSpeed;
    const targetX = hasInput ? wishX * maxSpeed : 0;
    const targetZ = hasInput ? wishZ * maxSpeed : 0;
    const rate = (hasInput ? cfg.groundAcceleration : cfg.groundDeceleration) * dt;
    const dvx = targetX - c.vx;
    const dvz = targetZ - c.vz;
    const dv = Math.hypot(dvx, dvz);
    if (dv <= rate) {
      c.vx = targetX;
      c.vz = targetZ;
    } else {
      c.vx += (dvx / dv) * rate;
      c.vz += (dvz / dv) * rate;
    }
  } else if (hasInput) {
    // Air control: add speed along the wish direction without ever exceeding what the character
    // already had, so jumps keep their momentum but cannot be used to gain speed.
    const ux = wishX / wishLength;
    const uz = wishZ / wishLength;
    const before = Math.hypot(c.vx, c.vz);
    const along = c.vx * ux + c.vz * uz;
    const add = clamp(cfg.airControlSpeed * wishLength - along, 0, cfg.airAcceleration * dt);
    c.vx += ux * add;
    c.vz += uz * add;
    const after = Math.hypot(c.vx, c.vz);
    const cap = Math.max(before, cfg.airControlSpeed);
    if (after > cap) {
      c.vx *= cap / after;
      c.vz *= cap / after;
    }
  }

  /* ---- jump ----------------------------------------------------------------------------- */
  let jumped = false;
  if (
    c.jumpBufferTicks > 0 &&
    !c.onSteepSlope &&
    (c.grounded || c.ticksSinceGrounded <= cfg.coyoteTicks)
  ) {
    let allowed = true;
    if (c.sliding) {
      endSlide(c, world, cfg, events, false);
      allowed = !c.crouching;
    } else if (c.crouching) {
      allowed = canStand(c, world, cfg);
      if (allowed) c.crouching = false;
    }
    if (allowed) {
      c.height = cfg.standHeight;
      c.vy = cfg.jumpVelocity;
      c.grounded = false;
      c.ticksSinceGrounded = cfg.coyoteTicks + 1;
      c.jumpBufferTicks = 0;
      c.peakY = c.y;
      jumped = true;
      events.push({ type: 'jump' });
    }
  }

  /* ---- horizontal move with wall sliding ------------------------------------------------ */
  mover.x = c.x;
  mover.z = c.z;
  mover.vx = c.vx;
  mover.vz = c.vz;
  let touchedWall = false;
  let wallNx = 0;
  let wallNz = 0;
  const travel = Math.hypot(c.vx, c.vz) * dt;
  const subSteps = Math.max(1, Math.ceil(travel / (cfg.radius * 0.5)));
  const subDt = dt / subSteps;
  for (let s = 0; s < subSteps; s++) {
    let nextX = mover.x + mover.vx * subDt;
    let nextZ = mover.z + mover.vz * subDt;

    if (world.terrain) {
      // Terrain steeper than the limit behaves like a wall for anything walking into it.
      const terrainY = world.terrainHeight(nextX, nextZ);
      if (terrainY >= c.y - 0.02) {
        const slope = world.terrainSlope(nextX, nextZ, gradient);
        if (slope > tanMaxSlope) {
          const upX = gradient.gx / slope;
          const upZ = gradient.gz / slope;
          const climb = (nextX - mover.x) * upX + (nextZ - mover.z) * upZ;
          if (climb > 0) {
            nextX -= upX * climb;
            nextZ -= upZ * climb;
            const vUp = mover.vx * upX + mover.vz * upZ;
            if (vUp > 0) {
              mover.vx -= upX * vUp;
              mover.vz -= upZ * vUp;
            }
          }
        }
      }
    }

    mover.x = nextX;
    mover.z = nextZ;
    if (world.resolveCircle(mover, cfg.radius, c.y, c.y + c.height, cfg.stepHeight)) {
      touchedWall = true;
      wallNx = mover.hitNx;
      wallNz = mover.hitNz;
    }
  }
  c.x = mover.x;
  c.z = mover.z;
  c.vx = mover.vx;
  c.vz = mover.vz;

  /* ---- vertical move: ground, ceiling, falling ------------------------------------------ */
  const wasGrounded = c.grounded;
  world.groundAt(c.x, c.z, c.y + cfg.stepHeight, cfg.supportRadius, ground);
  const groundY = ground.found ? ground.y : -Infinity;

  if (wasGrounded) {
    if (groundY >= c.y - cfg.snapDownDistance) {
      c.y = groundY;
      c.vy = 0;
    } else {
      // Walked off a ledge.
      c.grounded = false;
      c.ticksSinceGrounded = 1;
      c.peakY = c.y;
      c.y += 0.5 * cfg.gravity * dt * dt;
      c.vy = cfg.gravity * dt;
    }
  } else {
    const impactSpeed = -c.vy;
    let nextY = c.y + c.vy * dt + 0.5 * cfg.gravity * dt * dt;
    c.vy = Math.max(c.vy + cfg.gravity * dt, -cfg.terminalVelocity);
    if (!jumped) c.ticksSinceGrounded++;

    if (c.vy > 0 || nextY > c.y) {
      const ceiling = world.ceilingAt(c.x, c.z, c.y + c.height - 0.05, cfg.radius * 0.85);
      if (nextY + c.height > ceiling) {
        nextY = Math.max(c.y, ceiling - c.height);
        c.vy = Math.min(c.vy, 0);
      }
    }

    if (nextY <= groundY) {
      c.y = groundY;
      if (c.vy <= 0) {
        const fallHeight = Math.max(0, c.peakY - groundY);
        c.vy = 0;
        c.grounded = true;
        c.ticksSinceGrounded = 0;
        events.push({ type: 'land', fallHeight, impactSpeed: Math.max(0, impactSpeed), material: ground.material });
      }
    } else {
      c.y = nextY;
    }
    if (c.y > c.peakY) c.peakY = c.y;
  }

  if (c.grounded) {
    c.ticksSinceGrounded = 0;
    c.groundColliderId = ground.colliderId;
    c.groundMaterial = ground.material;
    c.onSteepSlope = ground.colliderId === TERRAIN_ID && world.terrainSlope(c.x, c.z) > tanMaxSlope;
    c.peakY = c.y;
  } else {
    c.groundColliderId = -1;
    c.onSteepSlope = false;
    if (c.sliding) endSlide(c, world, cfg, events, false);
  }

  // The feet moved: something that was a step a moment ago may now be a wall (dropping off a
  // ledge) — resolve again so every tick ends free of penetration.
  mover.x = c.x;
  mover.z = c.z;
  mover.vx = c.vx;
  mover.vz = c.vz;
  if (world.resolveCircle(mover, cfg.radius, c.y, c.y + c.height, cfg.stepHeight)) {
    c.x = mover.x;
    c.z = mover.z;
    c.vx = mover.vx;
    c.vz = mover.vz;
    if (!touchedWall) {
      touchedWall = true;
      wallNx = mover.hitNx;
      wallNz = mover.hitNz;
    }
    const terrainY = world.terrainHeight(c.x, c.z);
    if (c.y < terrainY) c.y = terrainY;
  }

  /* ---- ledge climb ---------------------------------------------------------------------- */
  if (!c.grounded && touchedWall && hasInput && !c.sliding) {
    tryStartMantle(c, world, cfg, wishX / wishLength, wishZ / wishLength, wallNx, wallNz, events);
  }

  /* ---- bookkeeping ---------------------------------------------------------------------- */
  if (
    !Number.isFinite(c.x) ||
    !Number.isFinite(c.y) ||
    !Number.isFinite(c.z) ||
    !Number.isFinite(c.vx) ||
    !Number.isFinite(c.vy) ||
    !Number.isFinite(c.vz)
  ) {
    c.x = prevX;
    c.y = prevY;
    c.z = prevZ;
    c.vx = 0;
    c.vy = 0;
    c.vz = 0;
    events.push({ type: 'invalid_state' });
  }

  if (c.grounded && !c.sliding) c.strideMeters += Math.hypot(c.x - prevX, c.z - prevZ);

  if (!c.mantle) {
    if (!c.grounded) c.moveState = 'air';
    else if (c.sliding) c.moveState = 'slide';
    else if (c.crouching) c.moveState = 'crouch';
    else {
      const speed = Math.hypot(c.vx, c.vz);
      c.moveState = speed < 0.2 ? 'idle' : speed > cfg.walkSpeed + 0.4 ? 'sprint' : 'walk';
    }
  }

  if (c.y < world.killY) events.push({ type: 'void' });
}
