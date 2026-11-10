/** Shared fixtures for simulation tests. */
import assert from 'node:assert/strict';
import {
  DEFAULT_MOVEMENT,
  DT,
  World,
  createCharacter,
  createHeightfield,
  makeGroundInfo,
  stepCharacter,
  yawToward,
  type CharacterEvent,
  type CharacterState,
  type InputFrame,
  type Simulation,
} from '../../src/core/index.js';

export const CFG = DEFAULT_MOVEMENT;

/** Yaw values for the four axis directions (forward = (-sin yaw, -cos yaw)). */
export const FACE = Object.freeze({
  negZ: 0,
  posX: -Math.PI / 2,
  posZ: Math.PI,
  negX: Math.PI / 2,
});

/** Flat terrain at height 0 with solid bounds, or a custom height function. */
export function makeWorld(heightAt: (x: number, z: number) => number = () => 0, half = 100, cell = 4): World {
  return new World({
    terrain: createHeightfield(-half, -half, cell, (half * 2) / cell, (half * 2) / cell, heightAt),
    bounds: { minX: -half, maxX: half, minZ: -half, maxZ: half },
    solidBounds: true,
    killY: -50,
  });
}

/** A character standing on whatever is under (x, z) at or below `nearY`. */
export function standAt(world: World, x: number, z: number, yaw = 0, nearY = 0): CharacterState {
  const ground = makeGroundInfo();
  assert.ok(world.groundAt(x, z, nearY + CFG.stepHeight, CFG.supportRadius, ground), 'no ground under the test character');
  const c = createCharacter(x, ground.y, z, yaw, CFG);
  c.grounded = true;
  c.ticksSinceGrounded = 0;
  c.groundColliderId = ground.colliderId;
  c.moveState = 'idle';
  return c;
}

export function frame(partial: Partial<InputFrame> = {}): InputFrame {
  return { seq: 0, moveX: 0, moveZ: 0, yaw: 0, pitch: 0, jump: false, sprint: false, crouch: false, ...partial };
}

export type InputSource = InputFrame | ((tick: number, c: CharacterState) => InputFrame);

/** Steps a lone character `ticks` times and returns every event it produced. */
export function run(
  c: CharacterState,
  world: World,
  ticks: number,
  source: InputSource,
  onTick?: (c: CharacterState, tick: number) => void,
): CharacterEvent[] {
  const all: CharacterEvent[] = [];
  const events: CharacterEvent[] = [];
  for (let tick = 1; tick <= ticks; tick++) {
    events.length = 0;
    const input = typeof source === 'function' ? source(tick, c) : source;
    stepCharacter(c, input, world, CFG, DT, events);
    all.push(...events);
    onTick?.(c, tick);
  }
  return all;
}

export function horizontalSpeed(c: CharacterState): number {
  return Math.hypot(c.vx, c.vz);
}

export interface Leg {
  x: number;
  z: number;
  tolerance?: number;
  sprint?: boolean;
  crouch?: boolean;
  jumpWhen?: (c: CharacterState) => boolean;
  maxTicks?: number;
}

/**
 * Minimal autopilot used to prove that a route is actually traversable with the real movement
 * rules: face the next waypoint, hold forward and tap jump when stuck against something.
 */
export function drive(sim: Simulation, playerId: string, legs: readonly Leg[]): void {
  let seq = 0;
  for (const leg of legs) {
    const tolerance = leg.tolerance ?? 0.6;
    const maxTicks = leg.maxTicks ?? 1500;
    let stuck = 0;
    for (let ticks = 0; ; ticks++) {
      const c = sim.getPlayer(playerId)!.char;
      if (Math.hypot(leg.x - c.x, leg.z - c.z) <= tolerance) break;
      assert.ok(
        ticks < maxTicks,
        `autopilot timed out heading to (${leg.x}, ${leg.z}); stuck at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}) state=${c.moveState}`,
      );
      stuck = c.grounded && Math.hypot(c.vx, c.vz) < 0.8 ? stuck + 1 : 0;
      const jump = (leg.jumpWhen?.(c) ?? false) || (stuck > 8 && stuck % 30 === 9);
      const input = frame({
        seq: seq++,
        moveZ: 1,
        yaw: yawToward(c.x, c.z, leg.x, leg.z),
        jump,
        sprint: leg.sprint ?? true,
        crouch: leg.crouch ?? false,
      });
      sim.step(() => input);
    }
  }
}
