import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERRAIN_ID,
  World,
  createHeightfield,
  heightfieldGradient,
  makeGroundInfo,
  makeRayHit,
  makeRng,
  sampleHeightfield,
  type Collider,
} from '../src/core/index.js';
import { makeWorld } from './helpers/sim.js';

const near = (actual: number, expected: number, tolerance = 1e-6, label = ''): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected} ± ${tolerance}, got ${actual}`);
};

test('heightfield: samples follow the two triangles of each cell and the gradient matches', () => {
  // h = 2x + 3z is a plane, so both triangles must reproduce it exactly.
  const plane = createHeightfield(0, 0, 2, 4, 4, (x, z) => 2 * x + 3 * z);
  near(sampleHeightfield(plane, 1.3, 0.4), 2 * 1.3 + 3 * 0.4);
  near(sampleHeightfield(plane, 5.9, 7.1), 2 * 5.9 + 3 * 7.1, 1e-5);
  const g = heightfieldGradient(plane, 3.3, 1.2, { gx: 0, gz: 0 });
  near(g.gx, 2);
  near(g.gz, 3);

  // A single raised vertex: the surface is continuous across the diagonal.
  const bump = createHeightfield(0, 0, 2, 2, 2, (x, z) => (x === 2 && z === 2 ? 1 : 0));
  near(sampleHeightfield(bump, 2, 2), 1);
  near(sampleHeightfield(bump, 1, 1), 0);
  near(sampleHeightfield(bump, 1.999, 1.999), sampleHeightfield(bump, 2.001, 2.001), 1e-2);
  // Outside the grid the border is extended instead of returning garbage.
  near(sampleHeightfield(plane, -5, -5), 0);
  assert.ok(Number.isFinite(sampleHeightfield(plane, 1e6, 1e6)));
});

test('ground query: collider tops count only within reach, terrain always counts', () => {
  const world = makeWorld();
  const low = world.addBox({ minX: 0, minY: 0, minZ: 0, maxX: 2, maxY: 0.3, maxZ: 2 });
  world.addBox({ minX: 4, minY: 0, minZ: 0, maxX: 6, maxY: 2, maxZ: 2 });
  const ground = makeGroundInfo();

  world.groundAt(1, 1, 0.3, 0.2, ground);
  assert.equal(ground.colliderId, low.id);
  near(ground.y, 0.3);

  // The 2 m box is above the feet + step, so the answer is the terrain under it.
  world.groundAt(5, 1, 0.3, 0.2, ground);
  assert.equal(ground.colliderId, TERRAIN_ID);
  near(ground.y, 0);

  // ...unless the feet are already up there.
  world.groundAt(5, 1, 2.1, 0.2, ground);
  near(ground.y, 2);

  // Support radius: just outside the footprint still counts, further out does not.
  world.groundAt(2.15, 1, 0.3, 0.2, ground);
  near(ground.y, 0.3);
  world.groundAt(2.25, 1, 0.3, 0.2, ground);
  near(ground.y, 0);
});

test('ramps: walking surface, solid sides and thin slabs you can walk under', () => {
  const world = makeWorld();
  const ground = makeGroundInfo();
  world.addRamp({ minX: 0, minZ: 0, maxX: 4, maxZ: 4, lowY: 0, highY: 3, dir: 'x+' });
  world.groundAt(2, 2, 1.8, 0.2, ground);
  near(ground.y, 1.5);
  world.groundAt(4, 2, 3.2, 0.2, ground);
  near(ground.y, 3);

  // Solid wedge: the body cannot enter from the side where the surface is above step height.
  assert.equal(world.overlapsSolid(3, 2, 0.3, 0.5, 1.5), true);
  // Thin slab: the space under the high end is free, the slab itself is not.
  world.addRamp({ minX: 10, minZ: 0, maxX: 14, maxZ: 4, lowY: 0, highY: 3, dir: 'x+', thickness: 0.2 });
  assert.equal(world.overlapsSolid(13.5, 2, 0.3, 0.1, 1.9), false);
  assert.equal(world.overlapsSolid(13.5, 2, 0.3, 2.3, 2.9), true);
  near(world.ceilingAt(13.5, 2, 1.8, 0.3), 3 * (13.2 / 4 - 2.5) - 0.2, 1e-6, 'slab underside');
});

test('ceiling query returns the lowest underside above the head', () => {
  const world = makeWorld();
  world.addBox({ minX: -1, minY: 2.2, minZ: -1, maxX: 1, maxY: 2.6, maxZ: 1 });
  world.addBox({ minX: -1, minY: 5, minZ: -1, maxX: 1, maxY: 6, maxZ: 1 });
  near(world.ceilingAt(0, 0, 1.8, 0.3), 2.2);
  near(world.ceilingAt(0, 0, 2.7, 0.3), 5);
  assert.equal(world.ceilingAt(10, 10, 0, 0.3), Infinity);
});

test('raycast: boxes, cylinders, ramps and terrain report distance and facing normal', () => {
  const world = makeWorld();
  const hit = makeRayHit();
  const box = world.addBox({ minX: 5, minY: 0, minZ: -1, maxX: 6, maxY: 2, maxZ: 1 });
  assert.equal(world.raycast(0, 1, 0, 1, 0, 0, 50, hit), true);
  assert.equal(hit.colliderId, box.id);
  near(hit.t, 5);
  assert.deepEqual([hit.nx, hit.ny, hit.nz], [-1, 0, 0]);

  // From above: top face.
  assert.equal(world.raycast(5.5, 10, 0, 0, -1, 0, 50, hit), true);
  near(hit.t, 8);
  assert.deepEqual([hit.nx, hit.ny, hit.nz], [0, 1, 0]);

  const cyl = world.addCylinder({ x: 0, z: -10, radius: 1, minY: 0, maxY: 3 });
  assert.equal(world.raycast(0, 1, 0, 0, 0, -1, 50, hit), true);
  assert.equal(hit.colliderId, cyl.id);
  near(hit.t, 9);
  near(hit.nz, 1);
  // Over the top of the cylinder, straight down onto its cap.
  assert.equal(world.raycast(0.3, 8, -10.2, 0, -1, 0, 50, hit), true);
  near(hit.t, 5);
  near(hit.ny, 1);

  const ramp = world.addRamp({ minX: -14, minZ: -2, maxX: -10, maxZ: 2, lowY: 0, highY: 4, dir: 'x-' });
  // Horizontal ray at y=1 travelling -x meets the 45 degree surface where it is 1 m high.
  assert.equal(world.raycast(0, 1, 0, -1, 0, 0, 50, hit), true);
  assert.equal(hit.colliderId, ramp.id);
  near(hit.t, 11);
  near(hit.nx, Math.SQRT1_2);
  near(hit.ny, Math.SQRT1_2);

  // Terrain: 45 degrees down from 10 m up lands 10 m away.
  assert.equal(world.raycast(40, 10, 40, Math.SQRT1_2, -Math.SQRT1_2, 0, 100, hit), true);
  assert.equal(hit.colliderId, TERRAIN_ID);
  near(hit.t, 10 * Math.SQRT2, 1e-3);
  near(hit.ny, 1);

  // Misses: too short, and pointing at the sky.
  assert.equal(world.raycast(0, 1, 0, 1, 0, 0, 4.9, hit), false);
  assert.equal(world.raycast(0, 1, 0, 0, 1, 0, 500, hit), false);
});

test('raycast grid traversal agrees with brute force over random scenes', () => {
  const rng = makeRng(77);
  const world = new World({ terrain: null, bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, solidBounds: false, killY: -100 });
  const colliders: Collider[] = [];
  for (let i = 0; i < 160; i++) {
    const x = -70 + rng() * 140;
    const z = -70 + rng() * 140;
    const y = rng() * 6;
    if (rng() < 0.6) {
      colliders.push(world.addBox({ minX: x, minY: y, minZ: z, maxX: x + 0.5 + rng() * 9, maxY: y + 0.5 + rng() * 5, maxZ: z + 0.5 + rng() * 9 }));
    } else {
      colliders.push(world.addCylinder({ x, z, radius: 0.3 + rng() * 2.5, minY: y, maxY: y + 0.5 + rng() * 6 }));
    }
  }
  // One world per collider (single huge grid cell) gives an independent reference answer.
  const solos = colliders.map((c) => {
    const solo = new World({ terrain: null, bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, solidBounds: false, killY: -100, gridCellSize: 1000 });
    if (c.kind === 'box') solo.addBox(c);
    else if (c.kind === 'cylinder') solo.addCylinder(c);
    return solo;
  });
  const hit = makeRayHit();
  const single = makeRayHit();
  let hits = 0;
  for (let i = 0; i < 600; i++) {
    const ox = -75 + rng() * 150;
    const oy = rng() * 9;
    const oz = -75 + rng() * 150;
    let dx = rng() * 2 - 1;
    let dy = (rng() * 2 - 1) * 0.4;
    let dz = rng() * 2 - 1;
    const len = Math.hypot(dx, dy, dz);
    dx /= len;
    dy /= len;
    dz /= len;
    const maxDistance = 20 + rng() * 150;

    // Brute force: test each collider alone.
    let expected = Infinity;
    for (const solo of solos) {
      if (solo.raycast(ox, oy, oz, dx, dy, dz, maxDistance, single) && single.t < expected) expected = single.t;
    }
    const found = world.raycast(ox, oy, oz, dx, dy, dz, maxDistance, hit);
    assert.equal(found, expected !== Infinity, `ray ${i}: hit/miss mismatch`);
    if (found) {
      hits++;
      near(hit.t, expected, 1e-9, `ray ${i}`);
    }
  }
  assert.ok(hits > 100, `scene should produce plenty of hits, got ${hits}`);
});

test('removing a collider removes it from every query', () => {
  const world = makeWorld();
  const hit = makeRayHit();
  const wall = world.addBox({ minX: 5, minY: 0, minZ: -20, maxX: 6, maxY: 3, maxZ: 20 });
  const before = world.revision;
  assert.equal(world.hasLineOfSight(0, 1, 0, 10, 1, 0, hit), false);
  assert.equal(world.overlapsSolid(5.5, 0, 0.3, 0.5, 1.5), true);
  assert.equal(world.remove(wall.id), true);
  assert.equal(world.remove(wall.id), false);
  assert.ok(world.revision > before);
  assert.equal(world.hasLineOfSight(0, 1, 0, 10, 1, 0, hit), true);
  assert.equal(world.overlapsSolid(5.5, 0, 0.3, 0.5, 1.5), false);
  assert.equal(world.colliderCount, 0);
});

test('invalid collider sizes are rejected', () => {
  const world = makeWorld();
  assert.throws(() => world.addBox({ minX: 1, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }));
  assert.throws(() => world.addCylinder({ x: 0, z: 0, radius: 0, minY: 0, maxY: 1 }));
  assert.throws(() => world.addRamp({ minX: 0, minZ: 0, maxX: 1, maxZ: 1, lowY: 1, highY: 1, dir: 'x+' }));
  assert.throws(() => new World({ terrain: null, bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 1 }, solidBounds: true, killY: -1 }));
});
