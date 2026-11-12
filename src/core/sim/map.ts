/**
 * Data description of a playable map. A MapDefinition is plain data: the simulation turns it into
 * colliders (`buildWorld`) and the renderer turns the very same entries into meshes, so what you
 * see is exactly what you collide with.
 */
import {
  World,
  createHeightfield,
  type Heightfield,
  type RampDirection,
  type SurfaceMaterial,
  type WorldBounds,
} from './world.js';

/** Visual family of a static piece; the renderer picks colours and details from it. */
export type StaticStyle =
  | 'concrete'
  | 'crate'
  | 'container'
  | 'wall'
  | 'roof'
  | 'platform'
  | 'pillar'
  | 'ramp'
  | 'stone'
  | 'trim';

export interface StaticBox {
  shape: 'box';
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  material: SurfaceMaterial;
  style: StaticStyle;
}

export interface StaticCylinder {
  shape: 'cylinder';
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
  material: SurfaceMaterial;
  style: StaticStyle;
}

export interface StaticRamp {
  shape: 'ramp';
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  lowY: number;
  highY: number;
  dir: RampDirection;
  /** Omitted = solid wedge. */
  thickness?: number;
  material: SurfaceMaterial;
  style: StaticStyle;
}

export type StaticDef = StaticBox | StaticCylinder | StaticRamp;

export type PropType = 'tree_pine' | 'tree_round' | 'rock' | 'bush';

export interface PropArchetype {
  /** Collision cylinder relative to the prop base; null = decorative only (no collision). */
  collider: { radius: number; height: number; material: SurfaceMaterial } | null;
}

/** Sizes at scale 1. Foliage never collides; only trunks and rocks do. */
export const PROP_ARCHETYPES: Readonly<Record<PropType, PropArchetype>> = Object.freeze({
  tree_pine: { collider: { radius: 0.34, height: 5.2, material: 'wood' } },
  tree_round: { collider: { radius: 0.38, height: 3.6, material: 'wood' } },
  rock: { collider: { radius: 0.85, height: 1.0, material: 'rock' } },
  bush: { collider: null },
});

export interface PropPlacement {
  type: PropType;
  x: number;
  y: number;
  z: number;
  scale: number;
  /** Visual yaw only; collision is rotation-invariant. */
  rotation: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Who the point is meant for ('player', 'target', 'pacer'...); modes pick spawns by role. */
  role?: string;
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** i18n key for the HUD hint shown while this is the next target. */
  hintKey: string;
}

export interface ZoneLabel {
  /** i18n key rendered on a signpost. */
  key: string;
  x: number;
  y: number;
  z: number;
}

/** Flat painted rectangle on the ground (visual only). */
export interface GroundMarking {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  color: 'lane' | 'start' | 'finish' | 'zone';
}

/** Something lying on the ground at match start that a player can pick up. */
export interface LootSpawnDef {
  kind: 'weapon' | 'consumable' | 'ammo';
  /** Weapon id, consumable id or ammo type, depending on `kind`. */
  defId: string;
  /** Stack size or rounds; ignored for weapons. */
  count: number;
  x: number;
  y: number;
  z: number;
}

/** Palette index stored per terrain vertex. */
export const TERRAIN_SURFACES: readonly SurfaceMaterial[] = ['grass', 'dirt', 'sand', 'rock'];

export interface TerrainData {
  originX: number;
  originZ: number;
  cellSize: number;
  cols: number;
  rows: number;
  /** (cols + 1) * (rows + 1) heights, row-major. */
  heights: Float32Array;
  /** Per-vertex index into TERRAIN_SURFACES. */
  surface: Uint8Array;
}

export interface MapDefinition {
  schemaVersion: 1;
  id: string;
  /** i18n key of the display name. */
  nameKey: string;
  bounds: WorldBounds;
  solidBounds: boolean;
  killY: number;
  terrain: TerrainData | null;
  statics: StaticDef[];
  props: PropPlacement[];
  spawns: SpawnPoint[];
  checkpoints: CheckpointDef[];
  labels: ZoneLabel[];
  markings: GroundMarking[];
  /** Pickups placed by the map. Only used by modes with combat. */
  loot: LootSpawnDef[];
}

export function terrainToHeightfield(terrain: TerrainData): Heightfield {
  const stride = terrain.cols + 1;
  if (terrain.heights.length !== stride * (terrain.rows + 1)) throw new Error('terrain height array has the wrong size');
  return createHeightfield(terrain.originX, terrain.originZ, terrain.cellSize, terrain.cols, terrain.rows, (x, z) => {
    const i = Math.round((x - terrain.originX) / terrain.cellSize);
    const j = Math.round((z - terrain.originZ) / terrain.cellSize);
    return terrain.heights[j * stride + i]!;
  });
}

/** Surface material painted on the terrain vertex nearest to (x, z). */
export function terrainSurfaceAt(terrain: TerrainData, x: number, z: number): SurfaceMaterial {
  const i = Math.min(terrain.cols, Math.max(0, Math.round((x - terrain.originX) / terrain.cellSize)));
  const j = Math.min(terrain.rows, Math.max(0, Math.round((z - terrain.originZ) / terrain.cellSize)));
  return TERRAIN_SURFACES[terrain.surface[j * (terrain.cols + 1) + i] ?? 0] ?? 'grass';
}

/** Builds the collision world for a map. */
export function buildWorld(map: MapDefinition): World {
  const terrain = map.terrain;
  const world = new World({
    terrain: terrain ? terrainToHeightfield(terrain) : null,
    bounds: map.bounds,
    solidBounds: map.solidBounds,
    killY: map.killY,
    ...(terrain ? { terrainMaterialAt: (x: number, z: number) => terrainSurfaceAt(terrain, x, z) } : {}),
  });

  for (const s of map.statics) {
    if (s.shape === 'box') {
      world.addBox({ minX: s.minX, minY: s.minY, minZ: s.minZ, maxX: s.maxX, maxY: s.maxY, maxZ: s.maxZ, material: s.material, tag: 'static' });
    } else if (s.shape === 'cylinder') {
      world.addCylinder({ x: s.x, z: s.z, radius: s.radius, minY: s.minY, maxY: s.maxY, material: s.material, tag: 'static' });
    } else {
      world.addRamp({
        minX: s.minX,
        minZ: s.minZ,
        maxX: s.maxX,
        maxZ: s.maxZ,
        lowY: s.lowY,
        highY: s.highY,
        dir: s.dir,
        material: s.material,
        tag: 'static',
        ...(s.thickness !== undefined ? { thickness: s.thickness } : {}),
      });
    }
  }

  for (const p of map.props) {
    const collider = PROP_ARCHETYPES[p.type].collider;
    if (!collider) continue;
    world.addCylinder({
      x: p.x,
      z: p.z,
      radius: collider.radius * p.scale,
      minY: p.y - 0.5,
      maxY: p.y + collider.height * p.scale,
      material: collider.material,
      tag: 'prop',
    });
  }
  return world;
}
