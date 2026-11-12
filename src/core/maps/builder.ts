/**
 * Small construction kit for maps written as code: boxes, ramps, whole buildings with door and
 * window openings, spawn points and pickups. It only produces plain MapDefinition data.
 */
import type {
  GroundMarking,
  LootSpawnDef,
  PropPlacement,
  PropType,
  SpawnPoint,
  StaticDef,
  StaticStyle,
  ZoneLabel,
} from '../sim/map.js';
import { AMMO_BOX_SIZE } from '../sim/loot.js';
import { yawToward } from '../sim/math.js';
import type { AmmoType } from '../sim/weapons.js';
import type { RampDirection, SurfaceMaterial } from '../sim/world.js';

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface Opening {
  side: WallSide;
  /**
   * Centre of the opening along the wall (x for north/south walls, z for east/west walls).
   * Doors should be centred on a half metre (…, 24.5, 25.5, …) and be at least 1.6 m wide: bots
   * navigate on a 1 m grid whose lines fall on half metres, and one of them has to fit through.
   */
  at: number;
  width: number;
  kind: 'door' | 'window';
}

export interface BuildingSpec {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  baseY?: number;
  /** Interior height, floor to ceiling. */
  height?: number;
  wallThickness?: number;
  openings?: readonly Opening[];
  roof?: boolean;
  /** How far the roof slab sticks out past the walls. */
  roofOverhang?: number;
}

const DOOR_HEIGHT = 2.2;
const WINDOW_SILL = 1.0;
const WINDOW_TOP = 2.2;
const ROOF_THICKNESS = 0.3;

export class MapBuilder {
  readonly statics: StaticDef[] = [];
  readonly props: PropPlacement[] = [];
  readonly spawns: SpawnPoint[] = [];
  readonly loot: LootSpawnDef[] = [];
  readonly labels: ZoneLabel[] = [];
  readonly markings: GroundMarking[] = [];

  box(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, style: StaticStyle, material: SurfaceMaterial): void {
    if (!(maxX > minX && maxY > minY && maxZ > minZ)) throw new Error('map builder: degenerate box');
    this.statics.push({ shape: 'box', minX, minY, minZ, maxX, maxY, maxZ, style, material });
  }

  cylinder(x: number, z: number, radius: number, minY: number, maxY: number, style: StaticStyle, material: SurfaceMaterial): void {
    if (!(radius > 0 && maxY > minY)) throw new Error('map builder: degenerate cylinder');
    this.statics.push({ shape: 'cylinder', x, z, radius, minY, maxY, style, material });
  }

  /** Solid wedge rising from `lowY` to `highY` in direction `dir`. */
  ramp(
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    lowY: number,
    highY: number,
    dir: RampDirection,
    style: StaticStyle = 'ramp',
    material: SurfaceMaterial = 'concrete',
  ): void {
    if (!(maxX > minX && maxZ > minZ && highY > lowY)) throw new Error('map builder: degenerate ramp');
    this.statics.push({ shape: 'ramp', minX, minZ, maxX, maxZ, lowY, highY, dir, style, material });
  }

  /** Four walls with openings and, by default, a flat roof that can be walked on. */
  building(spec: BuildingSpec): void {
    const base = spec.baseY ?? 0;
    const height = spec.height ?? 3.2;
    const wall = spec.wallThickness ?? 0.4;
    const top = base + height;
    const openings = spec.openings ?? [];

    const side = (which: WallSide): void => {
      const alongX = which === 'north' || which === 'south';
      // North/south walls run the full width; east/west walls fit between them.
      const from = alongX ? spec.minX : spec.minZ + wall;
      const to = alongX ? spec.maxX : spec.maxZ - wall;
      const fixedMin = which === 'north' ? spec.minZ : which === 'south' ? spec.maxZ - wall : which === 'west' ? spec.minX : spec.maxX - wall;
      const fixedMax = fixedMin + wall;
      const piece = (a: number, b: number, y0: number, y1: number): void => {
        if (b - a < 0.02 || y1 - y0 < 0.02) return;
        if (alongX) this.box(a, y0, fixedMin, b, y1, fixedMax, 'wall', 'concrete');
        else this.box(fixedMin, y0, a, fixedMax, y1, b, 'wall', 'concrete');
      };
      const gaps = openings
        .filter((o) => o.side === which)
        .map((o) => ({ a: o.at - o.width / 2, b: o.at + o.width / 2, kind: o.kind }))
        .sort((p, q) => p.a - q.a);
      let cursor = from;
      for (const gap of gaps) {
        if (gap.a < cursor - 1e-6 || gap.b > to + 1e-6) throw new Error('map builder: opening outside its wall or overlapping another');
        piece(cursor, gap.a, base, top);
        if (gap.kind === 'door') {
          piece(gap.a, gap.b, base + DOOR_HEIGHT, top);
        } else {
          piece(gap.a, gap.b, base, base + WINDOW_SILL);
          piece(gap.a, gap.b, base + WINDOW_TOP, top);
        }
        cursor = gap.b;
      }
      piece(cursor, to, base, top);
    };
    side('north');
    side('south');
    side('west');
    side('east');

    if (spec.roof !== false) {
      const over = spec.roofOverhang ?? 0.4;
      this.box(spec.minX - over, top, spec.minZ - over, spec.maxX + over, top + ROOF_THICKNESS, spec.maxZ + over, 'roof', 'metal');
    }
  }

  crate(x: number, z: number, size: number, height: number, baseY = 0): void {
    this.box(x - size / 2, baseY, z - size / 2, x + size / 2, baseY + height, z + size / 2, 'crate', 'wood');
  }

  /** Chest-high concrete barrier centred on (x, z). */
  barrier(x: number, z: number, length: number, axis: 'x' | 'z', height = 1.1, thickness = 0.5, baseY = 0): void {
    const halfX = axis === 'x' ? length / 2 : thickness / 2;
    const halfZ = axis === 'z' ? length / 2 : thickness / 2;
    this.box(x - halfX, baseY, z - halfZ, x + halfX, baseY + height, z + halfZ, 'concrete', 'concrete');
  }

  spawn(x: number, y: number, z: number, yaw: number, role?: string): void {
    this.spawns.push(role === undefined ? { x, y, z, yaw } : { x, y, z, yaw, role });
  }

  /** Spawn point that faces a given spot (usually the middle of the map). */
  spawnFacing(x: number, y: number, z: number, lookX: number, lookZ: number, role?: string): void {
    this.spawn(x, y, z, yawToward(x, z, lookX, lookZ), role);
  }

  weapon(weaponId: string, x: number, y: number, z: number): void {
    this.loot.push({ kind: 'weapon', defId: weaponId, count: 1, x, y, z });
  }

  item(itemId: string, count: number, x: number, y: number, z: number): void {
    this.loot.push({ kind: 'consumable', defId: itemId, count, x, y, z });
  }

  ammo(type: AmmoType, x: number, y: number, z: number, count: number = AMMO_BOX_SIZE[type]): void {
    this.loot.push({ kind: 'ammo', defId: type, count, x, y, z });
  }

  label(key: string, x: number, y: number, z: number): void {
    this.labels.push({ key, x, y, z });
  }

  marking(minX: number, minZ: number, maxX: number, maxZ: number, color: GroundMarking['color']): void {
    this.markings.push({ minX, minZ, maxX, maxZ, color });
  }

  prop(type: PropType, x: number, y: number, z: number, scale: number, rotation: number): void {
    this.props.push({ type, x, y, z, scale, rotation });
  }

  /** True when (x, z) is within `clearance` of any piece, spawn point, pickup or earlier prop. */
  occupied(x: number, z: number, clearance: number, propSpacing = 2.6): boolean {
    for (const s of this.statics) {
      const minX = s.shape === 'cylinder' ? s.x - s.radius : s.minX;
      const maxX = s.shape === 'cylinder' ? s.x + s.radius : s.maxX;
      const minZ = s.shape === 'cylinder' ? s.z - s.radius : s.minZ;
      const maxZ = s.shape === 'cylinder' ? s.z + s.radius : s.maxZ;
      if (x > minX - clearance && x < maxX + clearance && z > minZ - clearance && z < maxZ + clearance) return true;
    }
    for (const s of this.spawns) if (Math.hypot(x - s.x, z - s.z) < clearance + 2.5) return true;
    for (const l of this.loot) if (Math.hypot(x - l.x, z - l.z) < clearance + 0.5) return true;
    for (const p of this.props) if (Math.hypot(x - p.x, z - p.z) < propSpacing) return true;
    return false;
  }
}
