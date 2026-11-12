/**
 * "Campo de Pruebas" — the first playable map. A compact arena that exercises every movement
 * rule from docs/03-GAMEPLAY_NUMEROS.md: a sprint lane, steps at and above the step height,
 * climbable crates, a walkable hill, a doorway with a lintel, a crouch tunnel, ramps with a gap
 * jump, a house with a roof deck, stepping pillars and one mound that is too steep to climb.
 *
 * The layout is original and fully generated from this file (seeded, no external assets).
 */
import { makeRng } from '../rng.js';
import { smoothstep } from '../sim/math.js';
import { fractalNoise2D } from '../sim/noise.js';
import {
  terrainToHeightfield,
  type CheckpointDef,
  type GroundMarking,
  type MapDefinition,
  type PropPlacement,
  type PropType,
  type StaticDef,
  type StaticStyle,
  type TerrainData,
  type ZoneLabel,
} from '../sim/map.js';
import { sampleHeightfield, type RampDirection, type SurfaceMaterial } from '../sim/world.js';

export const TRAINING_GROUNDS_ID = 'training_grounds';

const SEED = 20261110;
const HALF_EXTENT = 80;
const CELL = 2;
const FLAT_RADIUS = 46;

const HILL = { x: 30, z: -36, radius: 13, height: 4.5 };
const MOUND = { x: -46, z: -40, radius: 7, height: 8 };

function cosineBump(x: number, z: number, cx: number, cz: number, radius: number, height: number): number {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= radius) return 0;
  return height * 0.5 * (1 + Math.cos((Math.PI * d) / radius));
}

/** Steeper profile than a cosine: stays above the 45 degree limit over most of its side. */
function steepMound(x: number, z: number, cx: number, cz: number, radius: number, height: number): number {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= radius) return 0;
  const t = 1 - d / radius;
  return height * Math.min(1, t * 1.25);
}

export function trainingHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h = 0;
  // Rolling ground outside the flat plaza, then a rim of hills that closes the arena.
  h += smoothstep(FLAT_RADIUS, 60, r) * (fractalNoise2D(x * 0.06, z * 0.06, SEED, 3) - 0.5) * 1.6;
  h += smoothstep(54, 80, r) * (6.5 + 3 * fractalNoise2D(x * 0.04 + 31, z * 0.04 + 17, SEED + 7, 3));
  h += cosineBump(x, z, HILL.x, HILL.z, HILL.radius, HILL.height);
  h += steepMound(x, z, MOUND.x, MOUND.z, MOUND.radius, MOUND.height);
  return h;
}

function buildTerrain(): TerrainData {
  const cols = (HALF_EXTENT * 2) / CELL;
  const rows = cols;
  const stride = cols + 1;
  const heights = new Float32Array(stride * (rows + 1));
  const surface = new Uint8Array(stride * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = -HALF_EXTENT + i * CELL;
      const z = -HALF_EXTENT + j * CELL;
      heights[j * stride + i] = trainingHeightAt(x, z);
    }
  }
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = -HALF_EXTENT + i * CELL;
      const z = -HALF_EXTENT + j * CELL;
      const r = Math.hypot(x, z);
      const h = heights[j * stride + i]!;
      const hx = heights[j * stride + Math.min(cols, i + 1)]! - heights[j * stride + Math.max(0, i - 1)]!;
      const hz = heights[Math.min(rows, j + 1) * stride + i]! - heights[Math.max(0, j - 1) * stride + i]!;
      const slope = Math.hypot(hx, hz) / (2 * CELL);
      const edge = FLAT_RADIUS - 2 + (fractalNoise2D(x * 0.15, z * 0.15, SEED + 3, 2) - 0.5) * 6;
      let index = 0; // grass
      if (slope > 0.85) index = 3; // rock
      else if (r < edge && h < 0.2) index = 1; // packed dirt plaza
      surface[j * stride + i] = index;
    }
  }
  return { originX: -HALF_EXTENT, originZ: -HALF_EXTENT, cellSize: CELL, cols, rows, heights, surface };
}

export function buildTrainingGrounds(): MapDefinition {
  const terrain = buildTerrain();
  // Everything that rests on the ground uses the sampled terrain (what the simulation and the
  // renderer actually use), not the analytic height function it was generated from.
  const heightfield = terrainToHeightfield(terrain);
  const groundY = (x: number, z: number): number => sampleHeightfield(heightfield, x, z);

  const statics: StaticDef[] = [];
  const box = (
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
    style: StaticStyle,
    material: SurfaceMaterial,
  ): void => {
    statics.push({ shape: 'box', minX, minY, minZ, maxX, maxY, maxZ, style, material });
  };
  const cylinder = (x: number, z: number, radius: number, minY: number, maxY: number, style: StaticStyle, material: SurfaceMaterial): void => {
    statics.push({ shape: 'cylinder', x, z, radius, minY, maxY, style, material });
  };
  const ramp = (minX: number, minZ: number, maxX: number, maxZ: number, lowY: number, highY: number, dir: RampDirection): void => {
    statics.push({ shape: 'ramp', minX, minZ, maxX, maxZ, lowY, highY, dir, style: 'ramp', material: 'concrete' });
  };

  /* ---- Steps: a kerb, the exact step limit (0.30 m), then a staircase to a deck -------------- */
  box(26, 0, 13, 34, 0.15, 14, 'concrete', 'concrete');
  box(26, 0, 12, 34, 0.3, 13, 'concrete', 'concrete');
  box(26, 0, 11, 34, 0.55, 12, 'concrete', 'concrete');
  box(26, 0, 10, 34, 0.8, 11, 'concrete', 'concrete');
  box(26, 0, 9, 34, 1.05, 10, 'concrete', 'concrete');
  box(26, 0, 8, 34, 1.3, 9, 'concrete', 'concrete');
  box(26, 0, 7, 34, 1.55, 8, 'concrete', 'concrete');
  box(26, 0, 1, 34, 1.8, 7, 'platform', 'concrete');
  // A 0.5 m ledge: higher than the step height, so it needs a jump.
  box(22.5, 0, 9, 24.5, 0.5, 12, 'stone', 'stone');

  /* ---- Crates: jumpable, climbable and one that is too tall from the ground ------------------ */
  box(26.6, 0, -4.4, 27.8, 1.0, -3.2, 'crate', 'wood');
  box(28.2, 0, -5.8, 29.8, 1.6, -4.2, 'crate', 'wood');
  box(28.5, 0, -12, 31.5, 2.4, -6.4, 'container', 'metal');
  box(33, 0, -10.5, 35, 3.4, -8.5, 'container', 'metal');

  /* ---- Wall with a doorway (the lintel is a ceiling) ---------------------------------------- */
  box(12, 0, -36, 12.4, 3, -29.2, 'wall', 'concrete');
  box(12, 0, -28, 12.4, 3, -22, 'wall', 'concrete');
  box(12, 2.2, -29.2, 12.4, 3, -28, 'wall', 'concrete');

  /* ---- Crouch tunnel: 1.35 m of headroom ---------------------------------------------------- */
  box(2, 1.35, -29.7, 7, 1.7, -27.5, 'roof', 'metal');
  box(2, 0, -29.7, 7, 1.35, -29.4, 'wall', 'concrete');
  box(2, 0, -27.8, 7, 1.35, -27.5, 'wall', 'concrete');

  /* ---- Ramp, two decks on pillars and a 3 m gap -------------------------------------------- */
  ramp(-18, -18, -14, -14, 0, 3, 'x-');
  box(-26, 2.7, -20, -18, 3, -12, 'platform', 'metal');
  for (const [px, pz] of [
    [-25.5, -19.5],
    [-25.5, -12.5],
    [-18.5, -19.5],
    [-18.5, -12.5],
  ] as const) {
    cylinder(px, pz, 0.3, 0, 2.7, 'pillar', 'metal');
  }
  box(-35, 2.7, -20, -29, 3, -12, 'platform', 'metal');
  for (const [px, pz] of [
    [-34.5, -19.5],
    [-34.5, -12.5],
    [-29.5, -19.5],
    [-29.5, -12.5],
  ] as const) {
    cylinder(px, pz, 0.3, 0, 2.7, 'pillar', 'metal');
  }
  ramp(-34, -12, -30, -8, 0, 3, 'z-');

  /* ---- House: door, window, roof deck and an outside ramp ----------------------------------- */
  box(-35, 0, 3, -25, 3.2, 3.4, 'wall', 'concrete'); // north
  box(-35, 0, 12.6, -31.5, 3.2, 13, 'wall', 'concrete'); // south, left of window
  box(-28.5, 0, 12.6, -25, 3.2, 13, 'wall', 'concrete'); // south, right of window
  box(-31.5, 0, 12.6, -28.5, 1.0, 13, 'wall', 'concrete'); // window sill
  box(-31.5, 2.2, 12.6, -28.5, 3.2, 13, 'wall', 'concrete'); // window lintel
  box(-35, 0, 3.4, -34.6, 3.2, 12.6, 'wall', 'concrete'); // west
  box(-25.4, 0, 3.4, -25, 3.2, 7.4, 'wall', 'concrete'); // east, left of door
  box(-25.4, 0, 8.6, -25, 3.2, 12.6, 'wall', 'concrete'); // east, right of door
  box(-25.4, 2.2, 7.4, -25, 3.2, 8.6, 'wall', 'concrete'); // door lintel
  box(-35.4, 3.2, 2.6, -24.6, 3.5, 13.4, 'roof', 'metal');
  // Outside ramp up to a landing that is level with the roof deck.
  ramp(-34, 1, -27, 2.6, 0, 3.5, 'x-');
  box(-35.4, 0, 1, -34, 3.5, 2.6, 'platform', 'concrete');
  box(-34, 0, 10, -32.8, 1.0, 11.2, 'crate', 'wood');
  box(-33.4, 0, 4.2, -31.8, 1.6, 5.8, 'crate', 'wood');

  /* ---- Central anchor: stepping pillars up to a pedestal ----------------------------------- */
  cylinder(-7.2, 1.2, 1.0, 0, 0.3, 'pillar', 'stone');
  cylinder(-5.4, -0.9, 0.9, 0, 0.9, 'pillar', 'stone');
  cylinder(-3.7, 1.3, 0.9, 0, 1.6, 'pillar', 'stone');
  cylinder(0, 0, 2.2, 0, 2.4, 'pillar', 'stone');

  /* ---- Course -------------------------------------------------------------------------------- */
  const hillTop = groundY(HILL.x, HILL.z);
  const checkpoints: CheckpointDef[] = [
    { id: 'cp_sprint', x: 26, y: 1.0, z: 26, radius: 2.2, hintKey: 'hint.sprint' },
    { id: 'cp_steps', x: 30, y: 2.8, z: 4, radius: 1.8, hintKey: 'hint.steps' },
    { id: 'cp_crates', x: 30, y: 3.4, z: -9.2, radius: 1.6, hintKey: 'hint.mantle' },
    { id: 'cp_hill', x: HILL.x, y: hillTop + 1.0, z: HILL.z, radius: 2.2, hintKey: 'hint.hill' },
    { id: 'cp_tunnel', x: 4.5, y: 0.6, z: -28.6, radius: 1.0, hintKey: 'hint.crouch' },
    { id: 'cp_gap', x: -32, y: 4.0, z: -16, radius: 1.8, hintKey: 'hint.gap' },
    { id: 'cp_roof', x: -30, y: 4.5, z: 8, radius: 2.0, hintKey: 'hint.roof' },
    { id: 'cp_anchor', x: 0, y: 3.4, z: 0, radius: 1.8, hintKey: 'hint.anchor' },
  ];

  const labels: ZoneLabel[] = [
    { key: 'zone.sprint', x: -22, y: 3.2, z: 23 },
    { key: 'zone.steps', x: 24.5, y: 3.4, z: 15.5 },
    { key: 'zone.crates', x: 24.5, y: 3.6, z: -3 },
    { key: 'zone.hill', x: 20, y: 3.8, z: -30 },
    { key: 'zone.door', x: 12.2, y: 4.0, z: -28.6 },
    { key: 'zone.tunnel', x: 4.5, y: 2.9, z: -28.6 },
    { key: 'zone.ramps', x: -14, y: 4.6, z: -20 },
    { key: 'zone.house', x: -30, y: 5.4, z: 14.5 },
    { key: 'zone.anchor', x: 0, y: 5.2, z: 0 },
    { key: 'zone.slope', x: -40, y: 6.5, z: -32 },
  ];

  const markings: GroundMarking[] = [
    { minX: -26, minZ: 24.6, maxX: 26, maxZ: 24.8, color: 'lane' },
    { minX: -26, minZ: 27.2, maxX: 26, maxZ: 27.4, color: 'lane' },
    { minX: -25.2, minZ: 24.6, maxX: -24.8, maxZ: 27.4, color: 'start' },
    { minX: 24.8, minZ: 24.6, maxX: 25.2, maxZ: 27.4, color: 'finish' },
  ];
  for (let x = -20; x <= 20; x += 5) markings.push({ minX: x - 0.05, minZ: 25.6, maxX: x + 0.05, maxZ: 26.4, color: 'zone' });

  return {
    schemaVersion: 1,
    id: TRAINING_GROUNDS_ID,
    nameKey: 'map.training_grounds',
    bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
    solidBounds: true,
    killY: -30,
    terrain,
    statics,
    props: scatterProps(statics, groundY),
    spawns: [{ x: -28, y: 0, z: 26, yaw: -Math.PI / 2 }],
    checkpoints,
    labels,
    markings,
    loot: [],
  };
}

/** Trees, rocks and bushes: a ring around the plaza plus a grove, never on top of the course. */
function scatterProps(statics: readonly StaticDef[], groundY: (x: number, z: number) => number): PropPlacement[] {
  const rng = makeRng(SEED);
  const props: PropPlacement[] = [];

  const blocked = (x: number, z: number, clearance: number): boolean => {
    for (const s of statics) {
      const minX = s.shape === 'cylinder' ? s.x - s.radius : s.minX;
      const maxX = s.shape === 'cylinder' ? s.x + s.radius : s.maxX;
      const minZ = s.shape === 'cylinder' ? s.z - s.radius : s.minZ;
      const maxZ = s.shape === 'cylinder' ? s.z + s.radius : s.maxZ;
      if (x > minX - clearance && x < maxX + clearance && z > minZ - clearance && z < maxZ + clearance) return true;
    }
    if (Math.hypot(x - HILL.x, z - HILL.z) < 5) return true;
    if (Math.hypot(x - MOUND.x, z - MOUND.z) < MOUND.radius + 2.5) return true;
    // Keep the sprint lane and the spawn clear.
    if (z > 22.5 && z < 29.5 && x > -32 && x < 30) return true;
    for (const p of props) {
      if (Math.hypot(x - p.x, z - p.z) < 2.6) return true;
    }
    return false;
  };

  const place = (type: PropType, x: number, z: number, scale: number): void => {
    props.push({ type, x, y: groundY(x, z), z, scale, rotation: rng() * Math.PI * 2 });
  };

  // Ring of trees around the plaza.
  for (let attempt = 0, placed = 0; attempt < 900 && placed < 110; attempt++) {
    const angle = rng() * Math.PI * 2;
    const radius = 47 + rng() * 21;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const roll = rng();
    const scale = 0.85 + rng() * 0.5;
    if (Math.abs(x) > 67 || Math.abs(z) > 67 || blocked(x, z, 3)) continue;
    place(roll < 0.55 ? 'tree_pine' : roll < 0.8 ? 'tree_round' : roll < 0.92 ? 'rock' : 'bush', x, z, scale);
    placed++;
  }
  // Grove south-west of the plaza.
  for (let attempt = 0, placed = 0; attempt < 300 && placed < 16; attempt++) {
    const x = -44 + rng() * 15;
    const z = 31 + rng() * 11;
    const roll = rng();
    const scale = 0.9 + rng() * 0.45;
    if (blocked(x, z, 3)) continue;
    place(roll < 0.5 ? 'tree_round' : roll < 0.85 ? 'tree_pine' : 'bush', x, z, scale);
    placed++;
  }
  // A few rocks inside the plaza as landmarks and cover.
  for (let attempt = 0, placed = 0; attempt < 300 && placed < 9; attempt++) {
    const x = -40 + rng() * 80;
    const z = -40 + rng() * 80;
    const scale = 0.8 + rng() * 0.7;
    if (Math.hypot(x, z) > 42 || blocked(x, z, 4)) continue;
    place('rock', x, z, scale);
    placed++;
  }
  return props;
}
