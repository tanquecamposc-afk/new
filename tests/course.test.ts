import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROP_ARCHETYPES,
  SIM_EVENTS,
  Simulation,
  TICK_RATE,
  buildTrainingGrounds,
  buildWorld,
  courseElapsedTicks,
  createCourse,
  resetCourse,
  updateCourse,
  type CheckpointDef,
  type MatchEvent,
} from '../src/core/index.js';
import { CFG, drive, frame } from './helpers/sim.js';

const checkpoints: CheckpointDef[] = [
  { id: 'a', x: 10, y: 1, z: 0, radius: 2, hintKey: 'a' },
  { id: 'b', x: 20, y: 1, z: 0, radius: 2, hintKey: 'b' },
];

test('course: clock starts on the first move, checkpoints must be taken in order, finishes once', () => {
  const course = createCourse(checkpoints);
  // Standing still at the first checkpoint does nothing: the run has not started.
  assert.equal(updateCourse(course, 1, 10, 1, 0, false), null);
  assert.equal(course.startedAtTick, null);
  assert.equal(courseElapsedTicks(course, 50), 0);

  // Touching the second checkpoint first is ignored.
  assert.equal(updateCourse(course, 100, 20, 1, 0, true), null);
  assert.equal(course.startedAtTick, 100);
  assert.equal(course.nextIndex, 0);

  assert.deepEqual(updateCourse(course, 160, 10.5, 1, 0, true), { reachedIndex: 0, finished: false });
  // Still inside the first checkpoint on the next tick: no duplicate.
  assert.equal(updateCourse(course, 161, 10.5, 1, 0, true), null);
  assert.equal(courseElapsedTicks(course, 200), 100);

  assert.deepEqual(updateCourse(course, 400, 20, 1, 0.5, true), { reachedIndex: 1, finished: true });
  assert.equal(course.finishedAtTick, 400);
  assert.deepEqual(course.splits, [60, 300]);
  // Finished: the clock is frozen and nothing can be reached again.
  assert.equal(updateCourse(course, 500, 20, 1, 0, true), null);
  assert.equal(courseElapsedTicks(course, 9999), 300);

  resetCourse(course);
  assert.deepEqual([course.nextIndex, course.startedAtTick, course.finishedAtTick, course.splits.length], [0, null, null, 0]);
  // Height matters: hovering far above a checkpoint does not count.
  assert.equal(updateCourse(course, 1, 10, 9, 0, true), null);
});

test('training map: data is consistent and nothing blocks the spawn or the checkpoints', () => {
  const map = buildTrainingGrounds();
  const world = buildWorld(map);
  assert.equal(map.schemaVersion, 1);
  assert.equal(map.checkpoints.length, 8);
  assert.ok(map.statics.length > 30);
  assert.ok(map.props.length > 60, `expected a populated arena, got ${map.props.length} props`);
  assert.equal(new Set(map.checkpoints.map((c) => c.id)).size, map.checkpoints.length);

  // Same seed, same world: the generator is deterministic.
  const again = buildTrainingGrounds();
  assert.deepEqual(again.props, map.props);
  assert.deepEqual(Array.from(again.terrain!.heights), Array.from(map.terrain!.heights));

  for (const spawn of map.spawns) {
    assert.equal(world.overlapsSolid(spawn.x, spawn.z, CFG.radius, spawn.y + 0.05, spawn.y + CFG.standHeight), false, 'spawn is blocked');
  }
  for (const cp of map.checkpoints) {
    assert.equal(world.overlapsSolid(cp.x, cp.z, 0.2, cp.y - 0.2, cp.y + 0.2), false, `checkpoint ${cp.id} is inside geometry`);
    assert.ok(cp.x > map.bounds.minX && cp.x < map.bounds.maxX && cp.z > map.bounds.minZ && cp.z < map.bounds.maxZ);
  }
  // Props sit on the terrain and stay inside the playable area.
  for (const p of map.props) {
    assert.ok(Math.abs(p.y - world.terrainHeight(p.x, p.z)) < 1e-3, 'prop floating or buried');
    assert.ok(Math.abs(p.x) < 70 && Math.abs(p.z) < 70);
    assert.ok(p.type in PROP_ARCHETYPES);
  }
});

test('simulation rejects bad setup instead of starting a broken match', () => {
  const map = buildTrainingGrounds();
  assert.throws(() => new Simulation({ matchId: '', map }));
  assert.throws(() => new Simulation({ matchId: 'x', map: { ...map, spawns: [] } }));
  // A spawn inside the container must be refused.
  const blocked = { ...map, spawns: [{ x: 30, y: 0, z: -9, yaw: 0 }] };
  const sim = new Simulation({ matchId: 'x', map: blocked });
  assert.throws(() => sim.addPlayer({ id: 'p1', name: 'Blocked' }), /blocked/);

  const ok = new Simulation({ matchId: 'y', map });
  ok.addPlayer({ id: 'p1', name: 'One' });
  assert.throws(() => ok.addPlayer({ id: 'p1', name: 'Dup' }), /duplicate/);
  assert.throws(() => ok.addPlayer({ id: '', name: 'NoId' }));
});

test('integration: the whole training circuit can be completed with the real movement rules', () => {
  const sim = new Simulation({ matchId: 'course-run', map: buildTrainingGrounds() });
  const player = sim.addPlayer({ id: 'p1', name: 'Autopilot' });
  const events: MatchEvent[] = [];
  const collect = (): void => {
    events.push(...sim.drainEvents());
  };
  const reached = (): number => player.course!.nextIndex;

  // Idle before the start: the clock must not run.
  for (let i = 0; i < 30; i++) sim.step(() => frame());
  assert.equal(player.course!.startedAtTick, null);

  // 1. Sprint lane.
  drive(sim, 'p1', [{ x: 26, z: 26, tolerance: 1.2 }]);
  assert.equal(reached(), 1, 'sprint checkpoint');
  // 52 m at 7 m/s is about 7.5 s.
  assert.ok(player.course!.splits[0]! < 8.2 * TICK_RATE, `sprint split too slow: ${player.course!.splits[0]} ticks`);

  // 2. Kerb, steps and staircase up to the deck.
  drive(sim, 'p1', [
    { x: 30, z: 16, tolerance: 0.5 },
    { x: 30, z: 4, tolerance: 0.6 },
  ]);
  assert.equal(reached(), 2, 'steps checkpoint');
  assert.ok(Math.abs(player.char.y - 1.8) < 1e-6, `should be on the deck, y=${player.char.y}`);

  // 3. Drop off the deck and climb the 2.4 m container (jump + mantle).
  drive(sim, 'p1', [
    { x: 30.6, z: -5.2, tolerance: 0.5 },
    { x: 30, z: -9.2, tolerance: 0.8, sprint: false },
  ]);
  assert.equal(reached(), 3, 'container checkpoint');
  assert.ok(Math.abs(player.char.y - 2.4) < 1e-6, `should be on the container, y=${player.char.y}`);

  // 4. Up the walkable hill.
  drive(sim, 'p1', [
    { x: 30, z: -14, tolerance: 0.8 },
    { x: 30, z: -36, tolerance: 0.8 },
  ]);
  assert.equal(reached(), 4, 'hill checkpoint');
  assert.ok(player.char.y > 4.2, `should be on the hill top, y=${player.char.y}`);

  // 5. Through the doorway and into the crouch tunnel.
  drive(sim, 'p1', [
    { x: 14.5, z: -28.6, tolerance: 0.15, sprint: false },
    { x: 9.5, z: -28.6, tolerance: 0.3, sprint: false },
    { x: 7.8, z: -28.6, tolerance: 0.2, sprint: false },
    { x: 4.5, z: -28.6, tolerance: 0.4, sprint: false, crouch: true },
  ]);
  assert.equal(reached(), 5, 'tunnel checkpoint');
  assert.equal(player.char.crouching, true);
  drive(sim, 'p1', [{ x: 0.8, z: -28.6, tolerance: 0.3, sprint: false, crouch: true }]);

  // 6. Up the ramp, sprint across the deck and jump the 3 m gap.
  drive(sim, 'p1', [
    { x: -12.5, z: -16, tolerance: 0.4 },
    { x: -20, z: -16, tolerance: 0.5 },
    { x: -32, z: -16, tolerance: 1.0, jumpWhen: (c) => c.grounded && c.y > 2.9 && c.x < -25.3 && c.x > -26.2 },
  ]);
  assert.equal(reached(), 6, 'gap checkpoint');
  assert.ok(Math.abs(player.char.y - 3) < 1e-6, `should have landed on the far deck, y=${player.char.y}`);

  // 7. Down the second ramp, around to the house ramp and onto the roof.
  drive(sim, 'p1', [
    { x: -32, z: -11.6, tolerance: 0.4, sprint: false },
    { x: -32, z: -5, tolerance: 0.6 },
    { x: -24, z: -1, tolerance: 0.6 },
    { x: -26, z: 1.8, tolerance: 0.3, sprint: false },
    { x: -34.7, z: 1.8, tolerance: 0.3, sprint: false },
    { x: -30, z: 8, tolerance: 0.8, sprint: false },
  ]);
  assert.equal(reached(), 7, 'roof checkpoint');
  assert.ok(Math.abs(player.char.y - 3.5) < 1e-6, `should be on the roof, y=${player.char.y}`);

  // 8. Off the roof and up the central pedestal.
  drive(sim, 'p1', [
    { x: -22, z: 6, tolerance: 0.8 },
    { x: -9, z: -4, tolerance: 0.8 },
    { x: 0, z: 0, tolerance: 0.9, sprint: false },
  ]);
  assert.equal(reached(), 8, 'anchor checkpoint');
  collect();

  const course = player.course!;
  assert.notEqual(course.finishedAtTick, null);
  const completed = events.filter((e) => e.type === SIM_EVENTS.courseCompleted);
  assert.equal(completed.length, 1, 'exactly one completion event');
  assert.equal(events.filter((e) => e.type === SIM_EVENTS.checkpointReached).length, 8);
  assert.equal(new Set(events.map((e) => e.id)).size, events.length, 'event ids are unique');
  assert.equal(events.filter((e) => e.type === SIM_EVENTS.simulationError).length, 0);
  assert.ok(events.some((e) => e.type === SIM_EVENTS.mantleStarted), 'the route includes a ledge climb');
  const seconds = (completed[0]!.data!['ticks'] as number) / TICK_RATE;
  assert.ok(seconds > 20 && seconds < 150, `course time out of range: ${seconds}s`);

  // More play after finishing does not complete the course again.
  for (let i = 0; i < 120; i++) sim.step(() => frame({ moveZ: 1 }));
  assert.equal(sim.drainEvents().filter((e) => e.type === SIM_EVENTS.courseCompleted).length, 0);

  // Restart: back at the start line with a fresh clock.
  assert.equal(sim.restartCourse('p1'), true);
  assert.equal(course.nextIndex, 0);
  assert.equal(course.startedAtTick, null);
  assert.ok(Math.hypot(player.char.x + 28, player.char.z - 26) < 1e-9);
  assert.equal(sim.restartCourse('nobody'), false);
});
