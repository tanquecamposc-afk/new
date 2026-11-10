/**
 * Character controller tests. They cover QA cases T01 (camera-relative movement that never
 * passes through walls) and T02 (jump height / landing independent of frame rate) plus every
 * row of the movement table in docs/03-GAMEPLAY_NUMEROS.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DT,
  FixedStepper,
  SIM_EVENTS,
  Simulation,
  TICK_RATE,
  buildTrainingGrounds,
  makeRng,
  sanitizeInput,
  type CharacterEvent,
  type CharacterState,
  type InputFrame,
} from '../src/core/index.js';
import { CFG, FACE, frame, horizontalSpeed, makeWorld, run, standAt } from './helpers/sim.js';

const near = (actual: number, expected: number, tolerance: number, label = ''): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected} ± ${tolerance}, got ${actual}`);
};
const has = (events: CharacterEvent[], type: CharacterEvent['type']): boolean => events.some((e) => e.type === type);

test('walk 5 m/s, sprint 7 m/s, crouch 2.5 m/s on flat ground', () => {
  const world = makeWorld();

  const walker = standAt(world, 0, 0);
  run(walker, world, TICK_RATE, frame({ moveZ: 1 }));
  near(horizontalSpeed(walker), CFG.walkSpeed, 1e-9, 'walk speed');
  // "5 m in ~1 s": a short acceleration ramp, then exactly 5 m/s.
  assert.ok(-walker.z > 4.6 && -walker.z <= 5.0, `walked ${-walker.z} m in the first second`);
  const before = walker.z;
  run(walker, world, TICK_RATE, frame({ moveZ: 1 }));
  near(before - walker.z, 5.0, 1e-9, 'metres per second at steady state');
  assert.equal(walker.moveState, 'walk');

  const sprinter = standAt(world, 0, 0);
  run(sprinter, world, TICK_RATE, frame({ moveZ: 1, sprint: true }));
  near(horizontalSpeed(sprinter), CFG.sprintSpeed, 1e-9, 'sprint speed');
  assert.equal(sprinter.moveState, 'sprint');
  assert.ok(CFG.sprintSpeed > CFG.walkSpeed);

  const croucher = standAt(world, 0, 0);
  run(croucher, world, TICK_RATE, frame({ moveZ: 1, crouch: true }));
  near(horizontalSpeed(croucher), CFG.crouchSpeed, 1e-9, 'crouch speed');
  assert.equal(croucher.moveState, 'crouch');
  near(croucher.height, CFG.crouchHeight, 1e-9, 'crouched hitbox height');

  // Releasing the stick stops the character quickly and completely.
  run(walker, world, 30, frame());
  assert.equal(horizontalSpeed(walker), 0);
  assert.equal(walker.moveState, 'idle');
});

test('T01 movement is relative to the camera yaw and diagonals are not faster', () => {
  const world = makeWorld();
  const cases: Array<{ yaw: number; moveX: number; moveZ: number; dx: number; dz: number }> = [
    { yaw: FACE.negZ, moveX: 0, moveZ: 1, dx: 0, dz: -1 },
    { yaw: FACE.negZ, moveX: 1, moveZ: 0, dx: 1, dz: 0 },
    { yaw: FACE.negZ, moveX: 0, moveZ: -1, dx: 0, dz: 1 },
    { yaw: FACE.posX, moveX: 0, moveZ: 1, dx: 1, dz: 0 },
    { yaw: FACE.posX, moveX: 1, moveZ: 0, dx: 0, dz: 1 },
    { yaw: FACE.negX, moveX: 0, moveZ: 1, dx: -1, dz: 0 },
    { yaw: FACE.posZ, moveX: 0, moveZ: 1, dx: 0, dz: 1 },
  ];
  for (const k of cases) {
    const c = standAt(world, 0, 0);
    run(c, world, 60, frame({ yaw: k.yaw, moveX: k.moveX, moveZ: k.moveZ }));
    const length = Math.hypot(c.x, c.z);
    near(c.x / length, k.dx, 1e-9, `yaw ${k.yaw} x`);
    near(c.z / length, k.dz, 1e-9, `yaw ${k.yaw} z`);
  }

  // Raw diagonal input (1, 1) is normalised by the sanitizer: same top speed as going straight.
  const diagonal = standAt(world, 0, 0);
  const input = sanitizeInput(frame({ moveX: 1, moveZ: 1 }));
  run(diagonal, world, 60, input);
  near(horizontalSpeed(diagonal), CFG.walkSpeed, 1e-9, 'diagonal speed');
});

test('T02 jump follows the parabola v=6.2 m/s, g=-18 m/s^2 and lands where it started', () => {
  const world = makeWorld();
  const c = standAt(world, 0, 0);
  let peak = 0;
  let landedTick = -1;
  const events = run(
    c,
    world,
    80,
    (tick) => frame({ jump: tick === 1 }),
    (state, tick) => {
      if (state.y > peak) peak = state.y;
      if (landedTick < 0 && tick > 1 && state.grounded) landedTick = tick;
      // Exact sample of y(t) = v t + g t^2 / 2 while airborne.
      if (!state.grounded) {
        const t = tick * DT;
        near(state.y, CFG.jumpVelocity * t + 0.5 * CFG.gravity * t * t, 1e-9, `height at tick ${tick}`);
      }
    },
  );
  const apex = (CFG.jumpVelocity * CFG.jumpVelocity) / (2 * -CFG.gravity);
  near(apex, 1.0678, 1e-3, 'analytic apex');
  near(peak, apex, 2e-3, 'simulated apex');
  const airTime = (2 * CFG.jumpVelocity) / -CFG.gravity;
  assert.equal(landedTick, Math.ceil(airTime * TICK_RATE), 'landing tick');
  assert.equal(c.y, 0);
  assert.equal(c.vy, 0);
  assert.equal(events.filter((e) => e.type === 'jump').length, 1);
  const land = events.find((e) => e.type === 'land');
  assert.ok(land && land.type === 'land');
  near(land.fallHeight, peak, 1e-9, 'fall height reported on landing');

  // Holding the button does not re-jump (no bunny hopping without a new press).
  const holder = standAt(world, 0, 0);
  const held = run(holder, world, 200, frame({ jump: true }));
  assert.equal(held.filter((e) => e.type === 'jump').length, 1);
});

test('T02 results do not depend on the rendering frame rate (30 / 60 / 120 / 144 / jittery)', () => {
  const script = (tick: number): InputFrame =>
    frame({
      seq: tick,
      yaw: Math.sin(tick * 0.013) * 2.5,
      moveZ: tick % 240 < 200 ? 1 : -1,
      moveX: tick % 97 < 30 ? 1 : 0,
      sprint: tick % 300 < 220,
      jump: tick % 71 === 0,
      crouch: tick % 400 > 360,
    });

  const simulate = (frameSeconds: (frameIndex: number) => number): { state: CharacterState; frames: number } => {
    const sim = new Simulation({ matchId: 'fps-test', map: buildTrainingGrounds() });
    sim.addPlayer({ id: 'p1', name: 'Runner' });
    const stepper = new FixedStepper(DT);
    const targetTicks = 10 * TICK_RATE;
    let frames = 0;
    while (sim.tick < targetTicks) {
      const plan = stepper.advance(frameSeconds(frames++));
      for (let s = 0; s < plan.steps && sim.tick < targetTicks; s++) {
        const input = script(sim.tick + 1);
        sim.step(() => input);
      }
    }
    return { state: { ...sim.getPlayer('p1')!.char }, frames };
  };

  const reference = simulate(() => 1 / 60);
  for (const fps of [30, 120, 144]) {
    const result = simulate(() => 1 / fps);
    assert.deepEqual(result.state, reference.state, `${fps} FPS diverged from 60 FPS`);
    assert.ok(Math.abs(result.frames - fps * 10) <= 2, `${fps} FPS needed ${result.frames} frames for 10 s`);
  }
  const rng = makeRng(5);
  const jittery = simulate(() => 0.004 + rng() * 0.03);
  assert.deepEqual(jittery.state, reference.state, 'irregular frame times diverged');
  assert.ok(Math.hypot(reference.state.x + 28, reference.state.z - 26) > 5, 'the script should actually move the character');
});

test('fixed stepper: whole ticks only, bounded catch-up, sane alpha', () => {
  const stepper = new FixedStepper(DT, 5);
  assert.equal(stepper.advance(DT * 0.5).steps, 0);
  const second = stepper.advance(DT * 0.5);
  assert.equal(second.steps, 1);
  near(second.alpha, 0, 1e-6, 'alpha after an exact tick');
  // A long hitch runs at most 5 ticks and reports the time it threw away.
  const hitch = stepper.advance(1.0);
  assert.equal(hitch.steps, 5);
  assert.ok(hitch.droppedSeconds > 0.7);
  assert.equal(stepper.advance(Number.NaN).steps, 0);
  assert.equal(stepper.advance(-1).steps, 0);
  assert.throws(() => new FixedStepper(0));
});

test('T01 walls stop the character and it slides along them', () => {
  const world = makeWorld();
  world.addBox({ minX: 3, minY: 0, minZ: -30, maxX: 3.4, maxY: 3, maxZ: 30 });

  const straight = standAt(world, 0, 0);
  run(straight, world, 180, frame({ yaw: FACE.posX, moveZ: 1, sprint: true }), (c) => {
    assert.ok(c.x <= 3 - CFG.radius + 1e-9, `penetrated the wall: x=${c.x}`);
  });
  near(straight.x, 3 - CFG.radius, 1e-9, 'rests against the wall');
  near(straight.vx, 0, 1e-9, 'velocity into the wall is removed');

  // 45 degrees into the wall: blocked on X, still travelling on Z.
  const sliding = standAt(world, 0, 0);
  run(sliding, world, 180, frame({ yaw: FACE.posX + Math.PI / 4, moveZ: 1 }), (c) => {
    assert.ok(c.x <= 3 - CFG.radius + 1e-9);
  });
  assert.ok(Math.abs(sliding.z) > 5, `should slide along the wall, moved ${sliding.z} on z`);

  // Fast movement cannot tunnel through a thin wall either.
  const fast = standAt(world, 0, 0);
  fast.vx = 45;
  run(fast, world, 30, frame({ yaw: FACE.posX }), (c) => {
    assert.ok(c.x <= 3 - CFG.radius + 1e-9, `tunnelled at high speed: x=${c.x}`);
  });

  // Solid map bounds.
  const edge = standAt(world, 95, 0);
  run(edge, world, 240, frame({ yaw: FACE.posX, moveZ: 1, sprint: true }));
  near(edge.x, 100 - CFG.radius, 1e-9, 'map edge');
});

test('step height: 0.30 m is walked up, 0.50 m blocks until you jump', () => {
  const world = makeWorld();
  world.addBox({ minX: 2, minY: 0, minZ: -2, maxX: 4, maxY: 0.3, maxZ: 2 });
  const stepper = standAt(world, 0, 0);
  let top = 0;
  run(stepper, world, 60, frame({ yaw: FACE.posX, moveZ: 1 }), (c) => {
    if (c.y > top) top = c.y;
    assert.equal(c.grounded, true, 'stays grounded over a small step');
  });
  near(top, 0.3, 1e-9, 'height reached on the step');
  assert.ok(stepper.x > 4, 'kept walking past the step');
  near(stepper.y, 0, 1e-9, 'stepped back down');

  const blockedWorld = makeWorld();
  blockedWorld.addBox({ minX: 2, minY: 0, minZ: -2, maxX: 4, maxY: 0.5, maxZ: 2 });
  const blocked = standAt(blockedWorld, 0, 0);
  run(blocked, blockedWorld, 120, frame({ yaw: FACE.posX, moveZ: 1 }));
  near(blocked.x, 2 - CFG.radius, 1e-9, 'stopped by the 0.5 m ledge');
  near(blocked.y, 0, 1e-9, 'still on the floor');

  const jumper = standAt(blockedWorld, 0, 0);
  run(jumper, blockedWorld, 60, (tick) => frame({ yaw: FACE.posX, moveZ: 1, jump: tick === 12 }));
  assert.ok(jumper.x > 2.5, `jump should clear the ledge, x=${jumper.x}`);
});

test('ceilings stop a jump and low passages need crouching', () => {
  const world = makeWorld();
  world.addBox({ minX: -2, minY: 2.2, minZ: -2, maxX: 2, maxY: 2.6, maxZ: 2 });
  const jumper = standAt(world, 0, 0);
  let peak = 0;
  run(
    jumper,
    world,
    90,
    (tick) => frame({ jump: tick === 1 }),
    (c) => {
      if (c.y > peak) peak = c.y;
      assert.ok(c.y + c.height <= 2.2 + 1e-9, `head went through the ceiling: ${c.y + c.height}`);
    },
  );
  near(peak, 2.2 - CFG.standHeight, 1e-9, 'head touches the slab');
  assert.equal(jumper.grounded, true);

  // Tunnel with 1.35 m of headroom between x = 2 and x = 7.
  const tunnel = makeWorld();
  tunnel.addBox({ minX: 2, minY: 1.35, minZ: -1.1, maxX: 7, maxY: 1.7, maxZ: 1.1 });
  tunnel.addBox({ minX: 2, minY: 0, minZ: -1.1, maxX: 7, maxY: 1.35, maxZ: -0.8 });
  tunnel.addBox({ minX: 2, minY: 0, minZ: 0.8, maxX: 7, maxY: 1.35, maxZ: 1.1 });

  const standing = standAt(tunnel, 0, 0);
  run(standing, tunnel, 120, frame({ yaw: FACE.posX, moveZ: 1 }));
  near(standing.x, 2 - CFG.radius, 1e-9, 'standing character is stopped at the mouth');

  const crawler = standAt(tunnel, 0, 0);
  run(crawler, tunnel, 100, frame({ yaw: FACE.posX, moveZ: 1, crouch: true }));
  assert.ok(crawler.x > 2.5 && crawler.x < 6.5, `should be inside the tunnel, x=${crawler.x}`);
  // Letting go of crouch inside: no room, so the character stays down and cannot jump.
  const inside = run(crawler, tunnel, 30, (tick) => frame({ yaw: FACE.posX, jump: tick === 5 }));
  assert.equal(crawler.crouching, true);
  near(crawler.height, CFG.crouchHeight, 1e-9, 'still crouched under the roof');
  assert.equal(has(inside, 'jump'), false);
  // Walking out the far end with crouch released: stands up as soon as there is headroom.
  run(crawler, tunnel, 240, frame({ yaw: FACE.posX, moveZ: 1 }));
  assert.ok(crawler.x > 7.5);
  assert.equal(crawler.crouching, false);
  near(crawler.height, CFG.standHeight, 1e-9, 'stood up after the tunnel');
});

test('slide: sprint + crouch on the ground only, speed boost then decay', () => {
  const world = makeWorld();
  const c = standAt(world, 0, 0);
  run(c, world, 60, frame({ moveZ: 1, sprint: true }));
  const start = run(c, world, 1, frame({ moveZ: 1, sprint: true, crouch: true }));
  assert.equal(has(start, 'slide_start'), true);
  assert.equal(c.moveState, 'slide');
  assert.ok(horizontalSpeed(c) > CFG.sprintSpeed + 1, `slide boost, speed=${horizontalSpeed(c)}`);
  near(c.height, CFG.crouchHeight, 1e-9, 'slide uses the low hitbox');

  const during = run(c, world, 120, frame({ moveZ: 1, sprint: true, crouch: true }));
  assert.equal(has(during, 'slide_end'), true);
  assert.equal(c.sliding, false);
  assert.equal(c.moveState, 'crouch', 'ends crouched while the key is held');
  // The slide must not be a faster way to travel than sprinting.
  assert.ok(horizontalSpeed(c) <= CFG.crouchSpeed + 1e-9);

  // Not in the air.
  const airborne = standAt(world, 0, 0);
  run(airborne, world, 60, frame({ moveZ: 1, sprint: true }));
  const air = run(airborne, world, 20, (tick) => frame({ moveZ: 1, sprint: true, jump: tick === 1, crouch: tick >= 4 }));
  assert.equal(has(air, 'slide_start'), false);

  // Not from a walk.
  const walker = standAt(world, 0, 0);
  run(walker, world, 60, frame({ moveZ: 1 }));
  const slow = run(walker, world, 5, frame({ moveZ: 1, crouch: true }));
  assert.equal(has(slow, 'slide_start'), false);
  assert.equal(walker.crouching, true);
});

test('slopes: 30 degrees is walkable, 60 degrees cannot be climbed and slides you down', () => {
  const gentle = makeWorld((x) => Math.max(0, x - 8) * Math.tan((30 * Math.PI) / 180));
  const walker = standAt(gentle, 0, 0);
  run(walker, gentle, 300, frame({ yaw: FACE.posX, moveZ: 1 }));
  assert.ok(walker.y > 6, `should climb the 30 degree slope, y=${walker.y}`);
  assert.equal(walker.onSteepSlope, false);

  const steep = makeWorld((x) => Math.max(0, x - 8) * Math.tan((60 * Math.PI) / 180));
  const climber = standAt(steep, 0, 0);
  run(climber, steep, 300, (tick) => frame({ yaw: FACE.posX, moveZ: 1, sprint: true, jump: tick % 30 === 0 }));
  assert.ok(climber.y < 1.2, `must not climb a 60 degree slope, y=${climber.y}`);

  // Dropped onto the steep face: gravity carries the character back to the bottom.
  const dropped = standAt(steep, 20, 0, 0, 100);
  const startY = dropped.y;
  run(dropped, steep, 240, frame());
  assert.ok(dropped.y < startY - 10, `should slide down, went from ${startY} to ${dropped.y}`);
  assert.ok(dropped.x < 9, `should end near the foot of the slope, x=${dropped.x}`);
});

test('ledges: walking off falls, landing reports the fall height, coyote time allows a late jump', () => {
  const world = makeWorld();
  world.addBox({ minX: -6, minY: 0, minZ: -2, maxX: 0, maxY: 2, maxZ: 2 });

  const faller = standAt(world, -3, 0, 0, 2);
  near(faller.y, 2, 1e-9, 'starts on the platform');
  const events = run(faller, world, 120, frame({ yaw: FACE.posX, moveZ: 1 }));
  const land = events.find((e) => e.type === 'land');
  assert.ok(land && land.type === 'land');
  near(land.fallHeight, 2, 1e-9, 'fall height');
  near(faller.y, 0, 1e-9, 'on the ground');
  assert.ok(faller.x > 0.4, 'clear of the platform');

  const late = standAt(world, -1, 0, 0, 2);
  let leftAt = -1;
  let peak = 0;
  const lateEvents = run(
    late,
    world,
    90,
    (tick, c) => {
      if (leftAt < 0 && !c.grounded) leftAt = tick;
      return frame({ yaw: FACE.posX, moveZ: 1, jump: leftAt > 0 && tick === leftAt + 3 });
    },
    (c) => {
      if (c.y > peak) peak = c.y;
    },
  );
  assert.equal(has(lateEvents, 'jump'), true, 'jump within coyote time');
  assert.ok(peak > 2.5, `coyote jump should rise above the platform, peak=${peak}`);

  // ...but not once the window has passed.
  const tooLate = standAt(world, -1, 0, 0, 2);
  let left = -1;
  const tooLateEvents = run(tooLate, world, 90, (tick, c) => {
    if (left < 0 && !c.grounded) left = tick;
    return frame({ yaw: FACE.posX, moveZ: 1, jump: left > 0 && tick === left + CFG.coyoteTicks + 3 });
  });
  assert.equal(has(tooLateEvents, 'jump'), false);
});

test('mantle: climbs a 2 m ledge, refuses a 3.4 m wall, leaves low crates to the jump arc', () => {
  const climbWorld = makeWorld();
  const crate = climbWorld.addBox({ minX: 2, minY: 0, minZ: -1, maxX: 4, maxY: 2, maxZ: 1 });
  const climber = standAt(climbWorld, 0, 0);
  // Push into the crate, tap jump, and let go of the stick once on top.
  const events = run(
    climber,
    climbWorld,
    120,
    (tick, c) => frame({ yaw: FACE.posX, moveZ: c.grounded && c.y > 1.9 ? 0 : 1, jump: tick === 40 }),
    (c) => {
      // The body never cuts through the corner of the crate while climbing.
      assert.equal(climbWorld.overlapsSolid(c.x, c.z, CFG.radius - 0.06, c.y + CFG.stepHeight + 0.03, c.y + c.height - 0.03), false);
    },
  );
  assert.equal(has(events, 'mantle_start'), true);
  assert.equal(has(events, 'mantle_end'), true);
  near(climber.y, 2, 1e-9, 'standing on the crate');
  assert.equal(climber.groundColliderId, crate.id);
  near(climber.x, 2 + CFG.mantleForward, 1e-9, 'stands just past the edge');
  assert.equal(climber.grounded, true);
  const start = events.find((e) => e.type === 'mantle_start');
  assert.ok(start && start.type === 'mantle_start' && start.height > 1.2 && start.height <= CFG.mantleMaxReach);

  const tallWorld = makeWorld();
  tallWorld.addBox({ minX: 2, minY: 0, minZ: -1, maxX: 4, maxY: 3.4, maxZ: 1 });
  const stuck = standAt(tallWorld, 0, 0);
  let peak = 0;
  const tallEvents = run(
    stuck,
    tallWorld,
    120,
    (tick) => frame({ yaw: FACE.posX, moveZ: 1, jump: tick === 40 }),
    (c) => {
      if (c.y > peak) peak = c.y;
    },
  );
  assert.equal(has(tallEvents, 'mantle_start'), false);
  assert.ok(peak < 1.1 && stuck.x < 2, 'a 3.4 m wall is not climbable from the ground');

  const lowWorld = makeWorld();
  lowWorld.addBox({ minX: 2, minY: 0, minZ: -1, maxX: 4, maxY: 1, maxZ: 1 });
  const hopper = standAt(lowWorld, 0, 0);
  const lowEvents = run(hopper, lowWorld, 90, (tick, c) =>
    frame({ yaw: FACE.posX, moveZ: c.grounded && c.y > 0.9 ? 0 : 1, jump: tick === 16 }),
  );
  assert.equal(has(lowEvents, 'mantle_start'), false, 'a plain jump already clears 1 m');
  near(hopper.y, 1, 1e-9, 'landed on the low crate');
  assert.ok(hopper.x > 1.8 && hopper.x < 4, `on the crate, x=${hopper.x}`);

  // No standing room on top: no mantle.
  const cramped = makeWorld();
  cramped.addBox({ minX: 2, minY: 0, minZ: -1, maxX: 4, maxY: 2, maxZ: 1 });
  cramped.addBox({ minX: 2, minY: 3, minZ: -1, maxX: 4, maxY: 3.4, maxZ: 1 });
  const refused = standAt(cramped, 0, 0);
  const crampedEvents = run(refused, cramped, 120, (tick) => frame({ yaw: FACE.posX, moveZ: 1, jump: tick === 40 }));
  assert.equal(has(crampedEvents, 'mantle_start'), false);
});

test('sanitizer: hostile or broken input never corrupts the simulation', () => {
  const world = makeWorld();
  const c = standAt(world, 0, 0);
  // Non-finite numbers and non-boolean buttons are neutralised.
  const hostile = { seq: Number.NaN, moveX: Infinity, moveZ: Number.NaN, yaw: 1e9, pitch: -Infinity, jump: 'yes', sprint: 1, crouch: null } as unknown as InputFrame;
  const clean = sanitizeInput(hostile);
  assert.deepEqual(
    { moveX: clean.moveX, moveZ: clean.moveZ, pitch: clean.pitch, jump: clean.jump, sprint: clean.sprint, crouch: clean.crouch, seq: clean.seq },
    { moveX: 0, moveZ: 0, pitch: 0, jump: false, sprint: false, crouch: false, seq: 0 },
  );
  assert.ok(clean.yaw > -Math.PI && clean.yaw <= Math.PI);

  // Oversized finite axes are clamped and normalised: no speed hack through the input.
  const greedy = sanitizeInput(frame({ moveX: 50, moveZ: 1e6, pitch: 99, sprint: true }));
  near(Math.hypot(greedy.moveX, greedy.moveZ), 1, 1e-12, 'input length');
  assert.ok(greedy.pitch <= 1.36);
  const events = run(c, world, 120, greedy);
  assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z));
  assert.equal(has(events, 'invalid_state'), false);
  assert.ok(horizontalSpeed(c) <= CFG.sprintSpeed + 1e-9, 'cannot exceed sprint speed with oversized input');

  // The raw hostile frame goes through Simulation.step untouched by the caller.
  const sim = new Simulation({ matchId: 'hostile', map: buildTrainingGrounds() });
  const player = sim.addPlayer({ id: 'p1', name: 'H' });
  for (let i = 0; i < 120; i++) sim.step(() => hostile);
  assert.ok(Number.isFinite(player.char.x) && Number.isFinite(player.char.y) && Number.isFinite(player.char.z));
  assert.equal(sim.drainEvents().filter((e) => e.type === SIM_EVENTS.simulationError).length, 0);
});

test('T01 property: 30 s of random input never leaves the character inside geometry', () => {
  const tolerance = 0.06;
  for (let seed = 1; seed <= 10; seed++) {
    const sim = new Simulation({ matchId: `fuzz-${seed}`, map: buildTrainingGrounds() });
    const player = sim.addPlayer({ id: 'p1', name: 'Fuzz' });
    const world = sim.world;
    const rng = makeRng(seed * 7919);
    let input = frame();
    let hold = 0;
    let errors = 0;
    for (let tick = 1; tick <= 30 * TICK_RATE; tick++) {
      if (hold-- <= 0) {
        hold = 8 + Math.floor(rng() * 50);
        input = frame({
          seq: tick,
          yaw: (rng() * 2 - 1) * Math.PI,
          pitch: (rng() * 2 - 1) * 1.2,
          moveZ: rng() < 0.75 ? 1 : rng() < 0.5 ? -1 : 0,
          moveX: rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) : 0,
          sprint: rng() < 0.6,
          crouch: rng() < 0.15,
          jump: rng() < 0.3,
        });
      } else if (input.jump && hold % 5 === 0) {
        input = { ...input, jump: false };
      }
      sim.step(() => input);
      const c = player.char;
      const where = `seed ${seed} tick ${tick} at (${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}) state=${c.moveState}`;
      assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z), `NaN: ${where}`);
      assert.ok(c.x >= -70 + CFG.radius - 1e-9 && c.x <= 70 - CFG.radius + 1e-9, `out of bounds: ${where}`);
      assert.ok(c.z >= -70 + CFG.radius - 1e-9 && c.z <= 70 - CFG.radius + 1e-9, `out of bounds: ${where}`);
      assert.ok(c.y >= world.terrainHeight(c.x, c.z) - 1e-6, `below the terrain: ${where}`);
      assert.equal(
        world.overlapsSolid(c.x, c.z, CFG.radius - tolerance, c.y + CFG.stepHeight + 0.03, c.y + c.height - 0.03),
        false,
        `inside a collider: ${where}`,
      );
      assert.ok(Math.hypot(c.vx, c.vz) <= 12 && Math.abs(c.vy) <= CFG.terminalVelocity + 1e-9, `runaway velocity: ${where}`);
    }
    for (const event of sim.drainEvents()) if (event.type === SIM_EVENTS.simulationError) errors++;
    assert.equal(errors, 0, `seed ${seed} produced simulation errors`);
  }
});

test('determinism: identical inputs give bit-identical results', () => {
  const play = (): CharacterState => {
    const sim = new Simulation({ matchId: 'det', map: buildTrainingGrounds() });
    sim.addPlayer({ id: 'p1', name: 'A' });
    const rng = makeRng(31337);
    let input = frame();
    for (let tick = 1; tick <= 1800; tick++) {
      if (tick % 17 === 1) {
        input = frame({ seq: tick, yaw: (rng() * 2 - 1) * Math.PI, moveZ: 1, moveX: rng() < 0.3 ? 1 : 0, sprint: rng() < 0.7, jump: rng() < 0.4, crouch: rng() < 0.1 });
      }
      sim.step(() => input);
    }
    return { ...sim.getPlayer('p1')!.char };
  };
  assert.deepEqual(play(), play());
});
