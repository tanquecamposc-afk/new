import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CAMERA,
  Simulation,
  buildTrainingGrounds,
  computeCameraRig,
  eyeHeight,
  makeCameraRig,
  makeRayHit,
  makeRng,
} from '../src/core/index.js';
import { CFG, FACE, frame, makeWorld } from './helpers/sim.js';

const near = (actual: number, expected: number, tolerance: number, label = ''): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected} ± ${tolerance}, got ${actual}`);
};

test('camera sits 4 m behind the shoulder in the open and looks where the player looks', () => {
  const world = makeWorld();
  const rig = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 0, DEFAULT_CAMERA, 0, makeCameraRig());
  near(rig.distance, DEFAULT_CAMERA.distance, 1e-9, 'distance');
  assert.equal(rig.blocked, false);
  // Looking toward -Z: the camera is at +Z, shifted to the right shoulder (+X).
  near(rig.z, DEFAULT_CAMERA.distance, 1e-9, 'behind');
  near(rig.x, DEFAULT_CAMERA.shoulderOffset, 1e-9, 'shoulder');
  near(rig.y, CFG.standEyeHeight + DEFAULT_CAMERA.pivotRaise, 1e-9, 'height');
  near(rig.fx, 0, 1e-12, 'forward x');
  near(rig.fy, 0, 1e-12, 'forward y');
  near(rig.fz, -1, 1e-12, 'forward z');

  // Aiming pulls the camera in.
  const ads = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 0, DEFAULT_CAMERA, 1, makeCameraRig());
  near(ads.distance, DEFAULT_CAMERA.adsDistance, 1e-9, 'ADS distance');
  const half = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 0, DEFAULT_CAMERA, 0.5, makeCameraRig());
  near(half.distance, (DEFAULT_CAMERA.distance + DEFAULT_CAMERA.adsDistance) / 2, 1e-9, 'half ADS');

  // Looking down raises the camera, looking up lowers it but never below the ground.
  const down = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, -1.0, DEFAULT_CAMERA, 0, makeCameraRig());
  assert.ok(down.y > rig.y + 2);
  const up = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 1.2, DEFAULT_CAMERA, 0, makeCameraRig());
  assert.ok(up.y >= 0.1, `camera under the floor: ${up.y}`);
});

test('camera is pulled in front of a wall instead of going through it', () => {
  const world = makeWorld();
  // Wall 1.5 m behind a player who looks toward -Z.
  world.addBox({ minX: -10, minY: 0, minZ: 1.5, maxX: 10, maxY: 6, maxZ: 2 });
  const rig = computeCameraRig(world, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 0, DEFAULT_CAMERA, 0, makeCameraRig());
  assert.equal(rig.blocked, true);
  assert.ok(rig.z < 1.5 - DEFAULT_CAMERA.collisionMargin + 1e-9, `camera inside the wall: z=${rig.z}`);
  near(rig.distance, 1.5 - DEFAULT_CAMERA.collisionMargin, 1e-9, 'shortened boom');

  // Wall on the right: the shoulder offset shrinks so the pivot stays on the player's side.
  const side = makeWorld();
  side.addBox({ minX: 0.45, minY: 0, minZ: -10, maxX: 1, maxY: 6, maxZ: 10 });
  const hugging = computeCameraRig(side, 0, 0, 0, CFG.standEyeHeight, FACE.negZ, 0, DEFAULT_CAMERA, 0, makeCameraRig());
  assert.ok(hugging.pivotX <= 0.45 - DEFAULT_CAMERA.collisionMargin + 1e-9, `pivot in the wall: ${hugging.pivotX}`);
  assert.ok(hugging.x < 0.45, `camera in the wall: ${hugging.x}`);
});

test('property: along random runs the camera is never inside geometry or under the terrain', () => {
  const sim = new Simulation({ matchId: 'camera-fuzz', map: buildTrainingGrounds() });
  const player = sim.addPlayer({ id: 'p1', name: 'Cam' });
  const world = sim.world;
  const rig = makeCameraRig();
  const hit = makeRayHit();
  const rng = makeRng(2026);
  let input = frame();
  let blockedFrames = 0;
  for (let tick = 1; tick <= 60 * 60; tick++) {
    if (tick % 23 === 1) {
      input = frame({
        seq: tick,
        yaw: (rng() * 2 - 1) * Math.PI,
        pitch: (rng() * 2 - 1) * 1.3,
        moveZ: rng() < 0.8 ? 1 : 0,
        moveX: rng() < 0.3 ? 1 : 0,
        sprint: rng() < 0.6,
        jump: rng() < 0.3,
        crouch: rng() < 0.1,
      });
    }
    sim.step(() => input);
    const c = player.char;
    const aim = tick % 200 < 60 ? 1 : 0;
    computeCameraRig(world, c.x, c.y, c.z, eyeHeight(c, CFG), player.input.yaw, player.input.pitch, DEFAULT_CAMERA, aim, rig);
    if (rig.blocked) blockedFrames++;
    const where = `tick ${tick} player (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}) cam (${rig.x.toFixed(2)}, ${rig.y.toFixed(2)}, ${rig.z.toFixed(2)})`;
    assert.ok(Number.isFinite(rig.x) && Number.isFinite(rig.y) && Number.isFinite(rig.z), `NaN camera: ${where}`);
    assert.ok(rig.y >= world.terrainHeight(rig.x, rig.z) + 0.05, `camera under the terrain: ${where}`);
    assert.equal(world.overlapsSolid(rig.x, rig.z, 0.05, rig.y - 0.05, rig.y + 0.05), false, `camera inside a collider: ${where}`);
    assert.ok(rig.distance <= rig.desiredDistance + 1e-9 && rig.distance >= 0, `bad boom length: ${where}`);
    // Nothing solid between the pivot and the camera.
    if (rig.distance > 0.35) {
      const blocked = world.raycast(rig.pivotX, rig.pivotY, rig.pivotZ, -rig.fx, -rig.fy, -rig.fz, rig.distance - 0.05, hit);
      assert.equal(blocked, false, `geometry between pivot and camera: ${where}`);
    }
  }
  assert.ok(blockedFrames > 20, `the run should exercise camera collision (blocked ${blockedFrames} times)`);
});
