/**
 * "Galería de Tiro" — a practice range. One covered firing line with gear laid out on benches,
 * and target dummies at marked distances down a long lane, one of them pacing from side to side
 * and one standing behind a wall (to see for yourself that shots do not go through cover).
 *
 * The layout is original and fully generated from this file (no external assets).
 */
import { makeRng } from '../rng.js';
import { smoothstep } from '../sim/math.js';
import { fractalNoise2D } from '../sim/noise.js';
import { terrainToHeightfield, type MapDefinition, type TerrainData } from '../sim/map.js';
import { sampleHeightfield } from '../sim/world.js';
import { MapBuilder } from './builder.js';

export const FIRING_RANGE_ID = 'firing_range';

const SEED = 20261112;
const CELL = 2;
const ORIGIN_X = -44;
const ORIGIN_Z = -116;
const COLS = 44;
const ROWS = 72;
/** Z of the firing line; targets stand at negative offsets from it. */
export const FIRING_LINE_Z = 4;

function heightAt(x: number, z: number): number {
  // A berm behind the last target and low banks along both sides.
  const back = smoothstep(-92, -108, z) * (7 + 2 * fractalNoise2D(x * 0.07, z * 0.07, SEED, 2));
  const sides = smoothstep(24, 38, Math.abs(x)) * (4.5 + 1.5 * fractalNoise2D(x * 0.08 + 9, z * 0.05, SEED + 1, 2));
  const front = smoothstep(18, 26, z) * 4;
  return Math.max(back, sides, front);
}

function buildTerrain(): TerrainData {
  const stride = COLS + 1;
  const heights = new Float32Array(stride * (ROWS + 1));
  const surface = new Uint8Array(stride * (ROWS + 1));
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const x = ORIGIN_X + i * CELL;
      const z = ORIGIN_Z + j * CELL;
      const h = heightAt(x, z);
      heights[j * stride + i] = h;
      let index = 1; // packed dirt lane
      if (h > 0.4) index = h > 3.5 ? 3 : 0; // grassy banks, rock where they get tall
      else if (Math.abs(x) > 14) index = 0;
      surface[j * stride + i] = index;
    }
  }
  return { originX: ORIGIN_X, originZ: ORIGIN_Z, cellSize: CELL, cols: COLS, rows: ROWS, heights, surface };
}

export function buildFiringRange(): MapDefinition {
  const terrain = buildTerrain();
  const heightfield = terrainToHeightfield(terrain);
  const groundY = (x: number, z: number): number => sampleHeightfield(heightfield, x, z);
  const b = new MapBuilder();
  const line = FIRING_LINE_Z;

  /* ---- Firing line: corner posts and two benches with a gap to walk downrange ------------------- */
  // No roof on purpose: from the third-person camera a canopy would cover half of the view.
  for (const [px, pz] of [
    [-10.5, line - 2.5],
    [10.5, line - 2.5],
    [-10.5, line + 7.5],
    [10.5, line + 7.5],
  ] as const) {
    b.cylinder(px, pz, 0.28, 0, 3.3, 'pillar', 'metal');
    b.box(px - 0.5, 3.3, pz - 0.5, px + 0.5, 3.5, pz + 0.5, 'trim', 'metal');
  }
  b.box(-9, 0, line - 0.9, -1.6, 0.9, line - 0.1, 'crate', 'wood');
  b.box(1.6, 0, line - 0.9, 9, 0.9, line - 0.1, 'crate', 'wood');
  b.marking(-11, line - 0.05, 11, line + 0.1, 'start');

  // Player.
  b.spawn(0, 0, line + 4, 0, 'player');

  /* ---- Gear on the benches and ammunition behind the line --------------------------------------- */
  const benchY = 0.9;
  const benchZ = line - 0.5;
  b.weapon('starter_smg', -7.6, benchY, benchZ);
  b.weapon('starter_sniper', -5.2, benchY, benchZ);
  b.item('shield_cell', 3, -2.8, benchY, benchZ);
  b.item('shield_battery', 1, 2.8, benchY, benchZ);
  b.item('bandage', 5, 5.2, benchY, benchZ);
  b.item('medkit', 1, 7.6, benchY, benchZ);
  b.ammo('light', -7.5, 0, line + 6.4);
  b.ammo('medium', -2.5, 0, line + 6.4);
  b.ammo('shells', 2.5, 0, line + 6.4);
  b.ammo('heavy', 7.5, 0, line + 6.4);

  /* ---- Targets ------------------------------------------------------------------------------------ */
  const facingLine = Math.PI; // dummies look back at the shooter (+Z)
  b.spawn(-5, 0, line - 10, facingLine, 'target');
  b.spawn(5, 0, line - 18, facingLine, 'pacer');
  b.spawn(0, 0, line - 25, facingLine, 'target');
  b.spawn(-6, 0, line - 50, facingLine, 'target');
  b.spawn(5, 0, line - 80, facingLine, 'target');
  // Behind cover: a wall between this dummy and the firing line.
  b.spawn(9, 0, line - 33, facingLine, 'target');
  b.box(6.5, 0, line - 31.6, 11.5, 2.6, line - 31.2, 'wall', 'concrete');

  /* ---- Distance marks ------------------------------------------------------------------------------ */
  for (const distance of [10, 25, 50, 80]) {
    const z = line - distance;
    b.marking(-12, z - 0.06, 12, z + 0.06, 'lane');
    b.label(`range.distance.${distance}`, -13.5, 2.4, z);
  }
  b.marking(-12.1, line - 86, -11.9, line, 'zone');
  b.marking(11.9, line - 86, 12.1, line, 'zone');
  b.label('zone.range.line', 0, 4.6, line + 2.5);
  b.label('zone.range.cover', 9, 3.8, line - 31.4);

  /* ---- Low cover downrange to practise peeking ------------------------------------------------------ */
  b.barrier(-8, line - 16, 3.2, 'x');
  b.barrier(2, line - 38, 3.2, 'x');
  b.crate(-9.5, line - 40, 1.2, 1.0);
  b.crate(8.4, line - 58, 1.4, 1.2);

  /* ---- Trees on the banks --------------------------------------------------------------------------- */
  const rng = makeRng(SEED);
  for (let attempt = 0, placed = 0; attempt < 700 && placed < 70; attempt++) {
    const x = ORIGIN_X + 3 + rng() * (COLS * CELL - 6);
    const z = ORIGIN_Z + 3 + rng() * (ROWS * CELL - 6);
    const roll = rng();
    const scale = 0.9 + rng() * 0.6;
    const rotation = rng() * Math.PI * 2;
    const h = groundY(x, z);
    if (h < 1.2 || b.occupied(x, z, 2, 2.4)) continue;
    b.prop(roll < 0.55 ? 'tree_pine' : roll < 0.85 ? 'tree_round' : roll < 0.95 ? 'rock' : 'bush', x, h, z, scale, rotation);
    placed++;
  }

  return {
    schemaVersion: 1,
    id: FIRING_RANGE_ID,
    nameKey: 'map.firing_range',
    bounds: { minX: -30, maxX: 30, minZ: -104, maxZ: 22 },
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
