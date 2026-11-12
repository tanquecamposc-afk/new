/**
 * Navigation graph for bots, built from the same collision world the players walk on.
 *
 * It is not authored by hand: starting from the map's spawn points the builder "walks" outwards
 * in a grid, and an edge only exists where a character could really take that step — ground
 * within the step height, a slope it can stand on, a drop it can survive, and room for the whole
 * body along the way. Ramps, stairs, upper floors and doorways therefore come out by themselves,
 * and so does the fact that walls cannot be crossed.
 *
 * Deterministic: the same world always produces the same graph and the same paths.
 */
import type { MovementConfig } from './config.js';
import { TERRAIN_ID, makeGroundInfo, type World } from './world.js';

export interface NavGraph {
  readonly cellSize: number;
  readonly count: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** Outgoing edges of node i are edgeTo[edgeStart[i] .. edgeStart[i + 1]). */
  readonly edgeStart: Int32Array;
  readonly edgeTo: Int32Array;
  readonly edgeCost: Float32Array;
  /** Node ids per grid column, for position lookups. */
  readonly columns: ReadonlyMap<number, readonly number[]>;
}

export interface NavPoint {
  x: number;
  y: number;
  z: number;
}

export interface NavBuildOptions {
  /** Points known to be walkable; the graph covers everything reachable from them. */
  seeds: readonly NavPoint[];
  cellSize?: number;
  /** Highest ledge a bot will step down from. */
  maxDrop?: number;
  maxNodes?: number;
}

const DEFAULT_CELL = 1;
const DEFAULT_MAX_DROP = 2.6;
const DEFAULT_MAX_NODES = 80000;
/** Sampling distance of a simulated step. Small enough that no wall fits between two samples. */
const WALK_SAMPLE = 0.2;
/** Extra clearance around the body so paths do not scrape along walls. */
const BODY_MARGIN = 0.05;
/** Bots keep a little below the real slope limit. */
const SLOPE_MARGIN_DEGREES = 3;
/** Two surfaces in the same column closer than this are the same node. */
const SAME_LEVEL = 0.75;
const DROP_COST_PER_METER = 1.5;

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ground = makeGroundInfo();

function columnKey(ix: number, iz: number): number {
  return (ix + 32768) * 65536 + (iz + 32768);
}

/** True when a standing character fits at the given feet position. */
export function canStandAt(world: World, cfg: MovementConfig, x: number, y: number, z: number): boolean {
  return !world.overlapsSolid(x, z, cfg.radius + BODY_MARGIN, y + cfg.stepHeight + 0.02, y + cfg.standHeight);
}

/**
 * Simulates walking in a straight line from (x0, y0, z0) to (x1, z1) with the real movement
 * limits. Returns the feet height at the destination, or NaN when the way is blocked.
 */
export function walkSegment(
  world: World,
  cfg: MovementConfig,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
  maxDrop: number = DEFAULT_MAX_DROP,
): number {
  const distance = Math.hypot(x1 - x0, z1 - z0);
  if (distance < 1e-6) return y0;
  const bounds = world.bounds;
  const margin = cfg.radius + BODY_MARGIN;
  if (world.solidBounds && (x1 < bounds.minX + margin || x1 > bounds.maxX - margin || z1 < bounds.minZ + margin || z1 > bounds.maxZ - margin)) {
    return Number.NaN;
  }
  const steps = Math.max(1, Math.ceil(distance / WALK_SAMPLE));
  const stepLength = distance / steps;
  const climbLimit = Math.tan(((cfg.maxSlopeDegrees - SLOPE_MARGIN_DEGREES) * Math.PI) / 180);
  const standLimit = Math.tan((cfg.maxSlopeDegrees * Math.PI) / 180);
  let y = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const pz = z0 + (z1 - z0) * t;
    if (!world.groundAt(px, pz, y + cfg.stepHeight, cfg.supportRadius, ground)) return Number.NaN;
    const nextY = ground.y;
    if (ground.colliderId === TERRAIN_ID) {
      // Terrain is reported even when it is far above the feet: reject climbs that are too steep
      // and ground the character could not stand on.
      if (nextY - y > stepLength * climbLimit + 0.02) return Number.NaN;
      if (world.terrainSlope(px, pz) > standLimit) return Number.NaN;
    }
    if (y - nextY > maxDrop) return Number.NaN;
    if (nextY < world.killY + 1) return Number.NaN;
    if (!canStandAt(world, cfg, px, nextY, pz)) return Number.NaN;
    y = nextY;
  }
  return y;
}

/** Builds the graph by flood-filling walkable space from the seed points. */
export function buildNavGraph(world: World, cfg: MovementConfig, options: NavBuildOptions): NavGraph {
  const cell = options.cellSize ?? DEFAULT_CELL;
  const maxDrop = options.maxDrop ?? DEFAULT_MAX_DROP;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  if (!(cell > 0.3) || !(maxDrop >= 0) || !(maxNodes > 0)) throw new Error('invalid navigation options');

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const cellX: number[] = [];
  const cellZ: number[] = [];
  const columns = new Map<number, number[]>();
  const edgesFrom: number[][] = [];
  const costsFrom: number[][] = [];

  const findInColumn = (ix: number, iz: number, y: number): number => {
    const list = columns.get(columnKey(ix, iz));
    if (!list) return -1;
    for (const id of list) if (Math.abs(ys[id]! - y) < SAME_LEVEL) return id;
    return -1;
  };

  const addNode = (ix: number, iz: number, y: number): number => {
    const id = xs.length;
    xs.push((ix + 0.5) * cell);
    ys.push(y);
    zs.push((iz + 0.5) * cell);
    cellX.push(ix);
    cellZ.push(iz);
    edgesFrom.push([]);
    costsFrom.push([]);
    const key = columnKey(ix, iz);
    const list = columns.get(key);
    if (list) list.push(id);
    else columns.set(key, [id]);
    return id;
  };

  const queue: number[] = [];
  for (const seed of options.seeds) {
    const baseX = Math.floor(seed.x / cell);
    const baseZ = Math.floor(seed.z / cell);
    // The seed itself may sit off-centre next to a wall: try its cell and the ones around it.
    for (let n = -1; n < DIRECTIONS.length; n++) {
      const ix = baseX + (n < 0 ? 0 : DIRECTIONS[n]![0]);
      const iz = baseZ + (n < 0 ? 0 : DIRECTIONS[n]![1]);
      const x = (ix + 0.5) * cell;
      const z = (iz + 0.5) * cell;
      const endY = walkSegment(world, cfg, seed.x, seed.y, seed.z, x, z, maxDrop);
      if (Number.isNaN(endY)) continue;
      if (findInColumn(ix, iz, endY) === -1) queue.push(addNode(ix, iz, endY));
      break;
    }
  }

  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]!;
    const x = xs[id]!;
    const y = ys[id]!;
    const z = zs[id]!;
    for (let d = 0; d < DIRECTIONS.length; d++) {
      const ix = cellX[id]! + DIRECTIONS[d]![0];
      const iz = cellZ[id]! + DIRECTIONS[d]![1];
      const nx = (ix + 0.5) * cell;
      const nz = (iz + 0.5) * cell;
      const endY = walkSegment(world, cfg, x, y, z, nx, nz, maxDrop);
      if (Number.isNaN(endY)) continue;
      let target = findInColumn(ix, iz, endY);
      if (target === -1) {
        if (xs.length >= maxNodes) continue;
        target = addNode(ix, iz, endY);
        queue.push(target);
      }
      const drop = Math.max(0, y - endY);
      edgesFrom[id]!.push(target);
      costsFrom[id]!.push(Math.hypot(nx - x, nz - z, endY - y) + drop * DROP_COST_PER_METER);
    }
  }

  const count = xs.length;
  const edgeStart = new Int32Array(count + 1);
  let total = 0;
  for (let i = 0; i < count; i++) {
    edgeStart[i] = total;
    total += edgesFrom[i]!.length;
  }
  edgeStart[count] = total;
  const edgeTo = new Int32Array(total);
  const edgeCost = new Float32Array(total);
  for (let i = 0, k = 0; i < count; i++) {
    const list = edgesFrom[i]!;
    const costs = costsFrom[i]!;
    for (let j = 0; j < list.length; j++, k++) {
      edgeTo[k] = list[j]!;
      edgeCost[k] = costs[j]!;
    }
  }

  return {
    cellSize: cell,
    count,
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    z: Float32Array.from(zs),
    edgeStart,
    edgeTo,
    edgeCost,
    columns,
  };
}

/**
 * Node closest to a position, searching the surrounding columns and preferring nodes on the same
 * level. Returns -1 when nothing is within `maxDistance`.
 */
export function nearestNode(graph: NavGraph, x: number, y: number, z: number, maxDistance = 4): number {
  const cell = graph.cellSize;
  const baseX = Math.floor(x / cell);
  const baseZ = Math.floor(z / cell);
  const rings = Math.max(1, Math.ceil(maxDistance / cell));
  let best = -1;
  let bestScore = Infinity;
  for (let ring = 0; ring <= rings; ring++) {
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const list = graph.columns.get(columnKey(baseX + dx, baseZ + dz));
        if (!list) continue;
        for (const id of list) {
          const horizontal = Math.hypot(graph.x[id]! - x, graph.z[id]! - z);
          if (horizontal > maxDistance) continue;
          // A node on another floor is a poor match even when it is directly above or below.
          const score = horizontal + Math.abs(graph.y[id]! - y) * 3;
          if (score < bestScore) {
            bestScore = score;
            best = id;
          }
        }
      }
    }
    // One extra ring after the first match is enough to be sure nothing closer was skipped.
    if (best !== -1 && ring >= 1) break;
  }
  return best;
}

/** A* over a NavGraph. Reuses its buffers, so keep one instance per graph. */
export class PathFinder {
  private readonly g: Float32Array;
  private readonly parent: Int32Array;
  /** Search generation in which a node was opened / closed. */
  private readonly opened: Uint32Array;
  private readonly closed: Uint32Array;
  private generation = 0;
  private heapNode: Int32Array;
  private heapScore: Float32Array;
  private heapSize = 0;

  constructor(readonly graph: NavGraph) {
    this.g = new Float32Array(graph.count);
    this.parent = new Int32Array(graph.count);
    this.opened = new Uint32Array(graph.count);
    this.closed = new Uint32Array(graph.count);
    this.heapNode = new Int32Array(1024);
    this.heapScore = new Float32Array(1024);
  }

  /**
   * Shortest path between two nodes. On success `out` holds the node ids from start to goal
   * (inclusive) and the result is true.
   */
  find(start: number, goal: number, out: number[], maxExpansions = 60000): boolean {
    out.length = 0;
    const graph = this.graph;
    if (start < 0 || goal < 0 || start >= graph.count || goal >= graph.count) return false;
    if (start === goal) {
      out.push(start);
      return true;
    }
    const generation = ++this.generation;
    const gx = graph.x[goal]!;
    const gy = graph.y[goal]!;
    const gz = graph.z[goal]!;
    this.heapSize = 0;
    this.g[start] = 0;
    this.parent[start] = -1;
    this.opened[start] = generation;
    this.push(start, Math.hypot(graph.x[start]! - gx, graph.y[start]! - gy, graph.z[start]! - gz));

    let expansions = 0;
    while (this.heapSize > 0) {
      const node = this.pop();
      if (this.closed[node] === generation) continue;
      this.closed[node] = generation;
      if (node === goal) {
        for (let n = goal; n !== -1; n = this.parent[n]!) out.push(n);
        out.reverse();
        return true;
      }
      if (++expansions > maxExpansions) return false;
      const end = graph.edgeStart[node + 1]!;
      for (let e = graph.edgeStart[node]!; e < end; e++) {
        const next = graph.edgeTo[e]!;
        if (this.closed[next] === generation) continue;
        const cost = this.g[node]! + graph.edgeCost[e]!;
        if (this.opened[next] === generation && cost >= this.g[next]!) continue;
        this.opened[next] = generation;
        this.g[next] = cost;
        this.parent[next] = node;
        this.push(next, cost + Math.hypot(graph.x[next]! - gx, graph.y[next]! - gy, graph.z[next]! - gz));
      }
    }
    return false;
  }

  private push(node: number, score: number): void {
    if (this.heapSize === this.heapNode.length) {
      const nodes = new Int32Array(this.heapNode.length * 2);
      nodes.set(this.heapNode);
      this.heapNode = nodes;
      const scores = new Float32Array(this.heapScore.length * 2);
      scores.set(this.heapScore);
      this.heapScore = scores;
    }
    let i = this.heapSize++;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (this.heapScore[up]! <= score) break;
      this.heapNode[i] = this.heapNode[up]!;
      this.heapScore[i] = this.heapScore[up]!;
      i = up;
    }
    this.heapNode[i] = node;
    this.heapScore[i] = score;
  }

  private pop(): number {
    const top = this.heapNode[0]!;
    const size = --this.heapSize;
    if (size > 0) {
      const node = this.heapNode[size]!;
      const score = this.heapScore[size]!;
      let i = 0;
      for (;;) {
        let child = i * 2 + 1;
        if (child >= size) break;
        if (child + 1 < size && this.heapScore[child + 1]! < this.heapScore[child]!) child++;
        if (this.heapScore[child]! >= score) break;
        this.heapNode[i] = this.heapNode[child]!;
        this.heapScore[i] = this.heapScore[child]!;
        i = child;
      }
      this.heapNode[i] = node;
      this.heapScore[i] = score;
    }
    return top;
  }
}
