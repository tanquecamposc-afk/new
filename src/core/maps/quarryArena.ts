/**
 * "Cantera Ámbar" — a compact combat arena for skirmishes: an old quarry floor closed in by a
 * rock rim, with four districts around a raised centre.
 *
 *   north-west  workshop: a building you can enter, with a walkable roof
 *   north-east  container yard: tall cover and a perch on top of a container
 *   south-west  scaffold: an upper deck reached by a ramp
 *   south-east  low-wall maze and a small shed
 *
 * Every lane between districts has chest-high barriers, so there is always cover within a sprint.
 * The layout is original and fully generated from this file (seeded, no external assets).
 */
import { makeRng } from '../rng.js';
import { smoothstep } from '../sim/math.js';
import { fractalNoise2D } from '../sim/noise.js';
import { terrainToHeightfield, type MapDefinition, type TerrainData } from '../sim/map.js';
import { sampleHeightfield } from '../sim/world.js';
import { MapBuilder } from './builder.js';

export const QUARRY_ARENA_ID = 'quarry_arena';

const SEED = 20261111;
const HALF_EXTENT = 64;
const CELL = 2;
const FLAT_RADIUS = 46;
const BOUNDS = 54;

function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rim = smoothstep(FLAT_RADIUS + 1, 62, r);
  return rim * (8.5 + 3.5 * fractalNoise2D(x * 0.05 + 11, z * 0.05 + 5, SEED, 3));
}

function buildTerrain(): TerrainData {
  const cols = (HALF_EXTENT * 2) / CELL;
  const rows = cols;
  const stride = cols + 1;
  const heights = new Float32Array(stride * (rows + 1));
  const surface = new Uint8Array(stride * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      heights[j * stride + i] = heightAt(-HALF_EXTENT + i * CELL, -HALF_EXTENT + j * CELL);
    }
  }
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = -HALF_EXTENT + i * CELL;
      const z = -HALF_EXTENT + j * CELL;
      const hx = heights[j * stride + Math.min(cols, i + 1)]! - heights[j * stride + Math.max(0, i - 1)]!;
      const hz = heights[Math.min(rows, j + 1) * stride + i]! - heights[Math.max(0, j - 1) * stride + i]!;
      const slope = Math.hypot(hx, hz) / (2 * CELL);
      const r = Math.hypot(x, z);
      const patch = fractalNoise2D(x * 0.09, z * 0.09, SEED + 3, 2);
      let index = 2; // sand: the quarry floor
      if (slope > 0.55) index = 3; // rock walls
      else if (r > FLAT_RADIUS + 6) index = 0; // grass on top of the rim
      else if (patch > 0.6 || r < 9) index = 1; // packed dirt patches and the centre
      surface[j * stride + i] = index;
    }
  }
  return { originX: -HALF_EXTENT, originZ: -HALF_EXTENT, cellSize: CELL, cols, rows, heights, surface };
}

export function buildQuarryArena(): MapDefinition {
  const terrain = buildTerrain();
  const heightfield = terrainToHeightfield(terrain);
  const groundY = (x: number, z: number): number => sampleHeightfield(heightfield, x, z);
  const b = new MapBuilder();

  /* ---- Centre: a raised round platform with four ramps and a tall core ----------------------- */
  b.cylinder(0, 0, 6, 0, 1.0, 'platform', 'stone');
  b.ramp(-1.6, -9.6, 1.6, -5.6, 0, 1.0, 'z+');
  b.ramp(-1.6, 5.6, 1.6, 9.6, 0, 1.0, 'z-');
  b.ramp(5.6, -1.6, 9.6, 1.6, 0, 1.0, 'x-');
  b.ramp(-9.6, -1.6, -5.6, 1.6, 0, 1.0, 'x+');
  b.cylinder(0, 0, 1.1, 1.0, 6.5, 'pillar', 'stone');
  b.barrier(3.1, -3.1, 2.4, 'x', 1.1, 0.4, 1.0);
  b.barrier(-3.1, 3.1, 2.4, 'x', 1.1, 0.4, 1.0);
  b.barrier(3.1, 3.1, 2.4, 'z', 1.1, 0.4, 1.0);
  b.barrier(-3.1, -3.1, 2.4, 'z', 1.1, 0.4, 1.0);

  /* ---- North-west: workshop with a roof deck -------------------------------------------------- */
  b.building({
    minX: -34,
    minZ: -32,
    maxX: -22,
    maxZ: -22,
    openings: [
      { side: 'east', at: -27, width: 1.4, kind: 'door' },
      { side: 'south', at: -24.4, width: 1.4, kind: 'door' },
      { side: 'north', at: -28, width: 3, kind: 'window' },
      { side: 'west', at: -27, width: 2.4, kind: 'window' },
    ],
  });
  // Outside ramp along the south wall up to a landing level with the roof.
  b.ramp(-34, -21.6, -27, -20, 0, 3.5, 'x-');
  b.box(-35.6, 0, -21.6, -34, 3.5, -20, 'platform', 'concrete');
  b.crate(-31.9, -30.2, 1.2, 1.0);
  b.crate(-24, -30.6, 1.2, 1.2);
  // Low parapet on the roof: cover for whoever holds it.
  b.box(-34.4, 3.5, -32.4, -21.6, 4.3, -32.1, 'trim', 'metal');
  b.box(-21.9, 3.5, -32.1, -21.6, 4.3, -26, 'trim', 'metal');

  /* ---- North-east: container yard ------------------------------------------------------------- */
  b.box(18, 0, -30, 24, 2.4, -27, 'container', 'metal');
  b.box(26, 0, -27.5, 29, 2.4, -21.5, 'container', 'metal');
  b.box(31, 0, -33, 34, 4.8, -30, 'container', 'metal');
  b.box(13, 0, -24.5, 16, 2.4, -18.5, 'container', 'metal');
  b.crate(17.2, -29, 1.2, 1.2); // the step up to the first container
  b.crate(21, -22, 1.2, 1.0);
  b.crate(22.4, -22.3, 1.4, 1.6);
  b.crate(30.5, -24, 1.2, 1.0);

  /* ---- South-west: scaffold deck -------------------------------------------------------------- */
  b.box(-30, 2.7, 20, -20, 3.0, 28, 'platform', 'metal');
  for (const [px, pz] of [
    [-29.5, 20.5],
    [-29.5, 27.5],
    [-20.5, 20.5],
    [-20.5, 27.5],
  ] as const) {
    b.cylinder(px, pz, 0.3, 0, 2.7, 'pillar', 'metal');
  }
  b.ramp(-20, 22, -15, 26, 0, 3.0, 'x-');
  b.box(-30, 3.0, 20, -29.8, 4.0, 28, 'trim', 'metal'); // west rail
  b.box(-29.8, 3.0, 27.8, -23, 4.0, 28, 'trim', 'metal'); // south rail (part)
  b.crate(-26, 24, 1.4, 1.2);
  b.crate(-23.2, 22.4, 1.2, 1.0);
  b.crate(-18.6, 30.5, 1.2, 1.0);
  b.barrier(-26, 15.5, 4, 'x');

  /* ---- South-east: low walls and a shed -------------------------------------------------------- */
  b.building({
    minX: 24,
    minZ: 22,
    maxX: 31,
    maxZ: 28,
    openings: [
      { side: 'west', at: 25, width: 1.4, kind: 'door' },
      { side: 'north', at: 27.5, width: 2.4, kind: 'window' },
    ],
  });
  b.box(12, 0, 16, 18, 1.2, 16.4, 'wall', 'concrete');
  b.box(14, 0, 22, 14.4, 1.2, 28, 'wall', 'concrete');
  b.box(18, 0, 30, 24, 1.2, 30.4, 'wall', 'concrete');
  b.box(8, 0, 24, 8.4, 1.2, 30, 'wall', 'concrete');
  b.box(19, 0, 19.5, 19.4, 1.2, 24, 'wall', 'concrete');
  b.crate(11, 21, 1.2, 1.0);

  /* ---- Lanes: chest-high barriers -------------------------------------------------------------- */
  b.barrier(0, -16.5, 4, 'x');
  b.barrier(0, 16.5, 4, 'x');
  b.barrier(-16.5, 0, 4, 'z');
  b.barrier(16.5, 0, 4, 'z');
  b.barrier(-12, -12, 3.2, 'x');
  b.barrier(12, 12, 3.2, 'x');
  b.barrier(-12, 12, 3.2, 'z');
  b.barrier(12, -12, 3.2, 'z');
  b.barrier(-5, -27, 3.6, 'z');
  b.barrier(5, 27, 3.6, 'z');
  b.barrier(-27, 5, 3.6, 'x');
  b.barrier(27, -5, 3.6, 'x');
  b.barrier(-8, -37, 4, 'x');
  b.barrier(8, 37, 4, 'x');
  b.barrier(-37, 8, 4, 'z');
  b.barrier(37, -8, 4, 'z');

  /* ---- Spawn ring: twelve points facing the centre --------------------------------------------- */
  const spawnRing: ReadonlyArray<readonly [number, number]> = [
    [0, 40],
    [20, 34.6],
    [34.6, 20],
    [40, 0],
    [34.6, -20],
    [20, -34.6],
    [0, -40],
    [-20, -35.6],
    [-39, -16],
    [-40, 0],
    [-34.6, 20],
    [-20, 34.6],
  ];
  for (const [x, z] of spawnRing) b.spawnFacing(x, 0, z, 0, 0);

  /* ---- Pickups ---------------------------------------------------------------------------------- */
  // Centre: the best gear, in the most exposed place.
  b.weapon('starter_ar', 0, 1.0, -3.6);
  b.item('shield_battery', 1, 3.8, 1.0, 0);
  b.item('medkit', 1, -3.8, 1.0, 0);
  b.ammo('medium', 0, 1.0, 3.6);
  // Workshop.
  b.weapon('starter_ar', -30, 0, -28);
  b.item('shield_cell', 2, -25.5, 0, -30.4);
  b.ammo('medium', -29, 0, -24.5);
  b.weapon('starter_shotgun', -28, 3.5, -27);
  b.ammo('shells', -31, 3.5, -29);
  // Container yard.
  b.weapon('starter_sniper', 21, 2.4, -28.5);
  b.ammo('heavy', 22.6, 2.4, -28.5);
  b.weapon('starter_smg', 22, 0, -24.6);
  b.ammo('light', 24.8, 0, -25);
  b.item('bandage', 3, 30.4, 0, -26);
  // Scaffold.
  b.weapon('starter_ar', -25, 3.0, 24.6);
  b.ammo('medium', -27.5, 3.0, 22);
  b.weapon('starter_shotgun', -24.6, 0, 25.6);
  b.ammo('shells', -27.6, 0, 22.2);
  b.item('shield_cell', 2, -22, 0, 30.5);
  // Shed and maze.
  b.weapon('starter_shotgun', 27.5, 0, 25);
  b.ammo('shells', 29.6, 0, 26.6);
  b.item('bandage', 3, 26, 0, 26.6);
  b.weapon('starter_smg', 16.4, 0, 25);
  b.ammo('light', 10.4, 0, 27);
  b.item('shield_cell', 2, 16, 0, 18.2);
  // Lanes.
  b.weapon('starter_pistol', 0, 0, 20);
  b.weapon('starter_smg', -20, 0, 0);
  b.item('bandage', 3, -16.5, 0, 3.4);
  b.item('bandage', 3, 16.5, 0, -3.4);
  b.item('shield_cell', 2, 0, 0, -19);
  b.item('medkit', 1, 20, 0, 0);
  b.ammo('medium', 10.4, 0, -13.4);
  b.ammo('light', -10.4, 0, 13.4);
  b.ammo('shells', -14.8, 0, -12);
  b.ammo('heavy', 14.8, 0, 12);
  b.ammo('light', 0, 0, 30);
  b.ammo('medium', 0, 0, -30);

  /* ---- Signs ------------------------------------------------------------------------------------ */
  b.label('zone.arena.core', 0, 8.2, 0);
  b.label('zone.arena.workshop', -28, 5.6, -27);
  b.label('zone.arena.yard', 22, 5.4, -25);
  b.label('zone.arena.scaffold', -25, 5.4, 24);
  b.label('zone.arena.shed', 27.5, 5.2, 25);

  scatterProps(b, groundY);

  return {
    schemaVersion: 1,
    id: QUARRY_ARENA_ID,
    nameKey: 'map.quarry_arena',
    bounds: { minX: -BOUNDS, maxX: BOUNDS, minZ: -BOUNDS, maxZ: BOUNDS },
    solidBounds: true,
    killY: -30,
    terrain,
    statics: b.statics,
    props: b.props,
    spawns: b.spawns,
    checkpoints: [],
    labels: b.labels,
    markings: b.markings,
    loot: b.loot,
  };
}

/** Rocks and a few trees on the quarry floor for soft cover, and a wooded rim around it. */
function scatterProps(b: MapBuilder, groundY: (x: number, z: number) => number): void {
  const rng = makeRng(SEED);
  // Cover on the floor: rocks mostly, the odd tree.
  for (let attempt = 0, placed = 0; attempt < 600 && placed < 26; attempt++) {
    const angle = rng() * Math.PI * 2;
    const radius = 12 + rng() * 32;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const roll = rng();
    const scale = 0.85 + rng() * 0.7;
    const rotation = rng() * Math.PI * 2;
    if (b.occupied(x, z, 3.2, 5)) continue;
    b.prop(roll < 0.62 ? 'rock' : roll < 0.82 ? 'tree_pine' : roll < 0.92 ? 'tree_round' : 'bush', x, groundY(x, z), z, scale, rotation);
    placed++;
  }
  // The rim.
  for (let attempt = 0, placed = 0; attempt < 900 && placed < 90; attempt++) {
    const angle = rng() * Math.PI * 2;
    const radius = FLAT_RADIUS + 4 + rng() * 13;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const roll = rng();
    const scale = 0.9 + rng() * 0.6;
    const rotation = rng() * Math.PI * 2;
    if (Math.abs(x) > HALF_EXTENT - 3 || Math.abs(z) > HALF_EXTENT - 3 || b.occupied(x, z, 2, 2.4)) continue;
    b.prop(roll < 0.6 ? 'tree_pine' : roll < 0.85 ? 'tree_round' : roll < 0.95 ? 'rock' : 'bush', x, groundY(x, z), z, scale, rotation);
    placed++;
  }
}
