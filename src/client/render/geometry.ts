/**
 * Geometry helpers that turn the map's collision primitives into renderable meshes. Faces are
 * emitted with world-scaled UVs (one texture repeat every `tile` metres) and a per-vertex colour,
 * so hundreds of pieces merge into a handful of draw calls.
 */
import * as THREE from 'three';
import type { RampDirection } from '../../core/sim/world.js';

type V3 = readonly [number, number, number];

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];
  private readonly color = new THREE.Color();

  constructor(private readonly tile = 2) {}

  get isEmpty(): boolean {
    return this.indices.length === 0;
  }

  /**
   * Quad with corners given counter-clockwise as seen from outside: a = bottom-left,
   * b = bottom-right, c = top-right, d = top-left. The normal comes from the winding.
   */
  quad(a: V3, b: V3, c: V3, d: V3, hex: number, shade = 1): void {
    const width = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / this.tile;
    const height = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / this.tile;
    const base = this.positions.length / 3;
    const n = normalOf(a, b, d);
    this.color.setHex(hex).multiplyScalar(shade);
    const { r, g, b: blue } = this.color;
    const corners: readonly V3[] = [a, b, c, d];
    const uv: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ];
    for (let i = 0; i < 4; i++) {
      const p = corners[i]!;
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
      this.uvs.push(uv[i]![0], uv[i]![1]);
      this.colors.push(r, g, blue);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Triangle, counter-clockwise from outside. UVs are projected from the first edge. */
  triangle(a: V3, b: V3, c: V3, hex: number, shade = 1): void {
    const base = this.positions.length / 3;
    const n = normalOf(a, b, c);
    this.color.setHex(hex).multiplyScalar(shade);
    const { r, g, b: blue } = this.color;
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ux = (b[0] - a[0]) / ab;
    const uy = (b[1] - a[1]) / ab;
    const uz = (b[2] - a[2]) / ab;
    const along = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy + (c[2] - a[2]) * uz;
    const across = Math.hypot(c[0] - a[0] - ux * along, c[1] - a[1] - uy * along, c[2] - a[2] - uz * along);
    const points: readonly V3[] = [a, b, c];
    const uv: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [ab / this.tile, 0],
      [along / this.tile, across / this.tile],
    ];
    for (let i = 0; i < 3; i++) {
      const p = points[i]!;
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
      this.uvs.push(uv[i]![0], uv[i]![1]);
      this.colors.push(r, g, blue);
    }
    this.indices.push(base, base + 1, base + 2);
  }

  /** Horizontal triangle with UVs projected straight down, so caps show an even grid. */
  planarTriangle(a: V3, b: V3, c: V3, hex: number, shade = 1): void {
    const base = this.positions.length / 3;
    const n = normalOf(a, b, c);
    this.color.setHex(hex).multiplyScalar(shade);
    const { r, g, b: blue } = this.color;
    for (const p of [a, b, c]) {
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
      this.uvs.push(p[0] / this.tile, p[2] / this.tile);
      this.colors.push(r, g, blue);
    }
    this.indices.push(base, base + 1, base + 2);
  }

  box(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, hex: number): void {
    // Slight per-face shading keeps flat-lit boxes readable even in shadow.
    this.quad([maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ], hex, 0.94);
    this.quad([minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ], hex, 0.9);
    this.quad([minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ], hex, 0.97);
    this.quad([maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ], hex, 0.88);
    this.quad([minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ], hex, 1.05);
    if (minY > 0.05) this.quad([minX, minY, minZ], [maxX, minY, minZ], [maxX, minY, maxZ], [minX, minY, maxZ], hex, 0.7);
  }

  /** Solid wedge: `lowY` at the start of the run, `highY` at the end, in direction `dir`. */
  wedge(minX: number, minZ: number, maxX: number, maxZ: number, lowY: number, highY: number, dir: RampDirection, hex: number): void {
    const run = dir === 'x+' || dir === 'x-' ? maxX - minX : maxZ - minZ;
    const width = dir === 'x+' || dir === 'x-' ? maxZ - minZ : maxX - minX;
    // Local frame: s along the ascent (0..run), t across (0..width). Each mapping is a proper
    // rotation about Y, so winding stays counter-clockwise.
    const point = (s: number, y: number, t: number): V3 => {
      switch (dir) {
        case 'x+':
          return [minX + s, y, minZ + t];
        case 'x-':
          return [maxX - s, y, maxZ - t];
        case 'z+':
          return [maxX - t, y, minZ + s];
        case 'z-':
          return [minX + t, y, maxZ - s];
      }
    };
    const l0 = point(0, lowY, 0);
    const l1 = point(0, lowY, width);
    const h0 = point(run, highY, 0);
    const h1 = point(run, highY, width);
    const b0 = point(run, lowY, 0);
    const b1 = point(run, lowY, width);
    this.quad(l1, h1, h0, l0, hex, 1.04); // walking surface
    this.quad(b1, b0, h0, h1, hex, 0.9); // tall back face
    this.triangle(l1, b1, h1, hex, 0.96); // side at t = width
    this.triangle(b0, l0, h0, hex, 0.88); // side at t = 0
  }

  cylinder(x: number, z: number, radius: number, minY: number, maxY: number, hex: number, segments = 18): void {
    const ring: Array<readonly [number, number]> = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      ring.push([x + Math.cos(angle) * radius, z + Math.sin(angle) * radius]);
    }
    for (let i = 0; i < segments; i++) {
      const p = ring[i]!;
      const q = ring[(i + 1) % segments]!;
      // Counter-clockwise from outside means going "backwards" around the ring.
      const shade = 0.86 + 0.14 * Math.max(0, Math.cos((i / segments) * Math.PI * 2 - 2.3));
      this.quad([q[0], minY, q[1]], [p[0], minY, p[1]], [p[0], maxY, p[1]], [q[0], maxY, q[1]], hex, shade);
    }
    for (let i = 0; i < segments; i++) {
      const p = ring[i]!;
      const q = ring[(i + 1) % segments]!;
      this.planarTriangle([x, maxY, z], [q[0], maxY, q[1]], [p[0], maxY, p[1]], hex, 1.05);
    }
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}

function normalOf(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

/** Collects line segments for the dark outlines that give pieces a crisp silhouette. */
export class EdgeBuilder {
  private readonly positions: number[] = [];

  get isEmpty(): boolean {
    return this.positions.length === 0;
  }

  segment(a: V3, b: V3): void {
    this.positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }

  box(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void {
    const xs = [minX, maxX] as const;
    const ys = [minY, maxY] as const;
    const zs = [minZ, maxZ] as const;
    for (const y of ys) {
      for (const z of zs) this.segment([minX, y, z], [maxX, y, z]);
      for (const x of xs) this.segment([x, y, minZ], [x, y, maxZ]);
    }
    for (const x of xs) for (const z of zs) this.segment([x, minY, z], [x, maxY, z]);
  }

  wedge(minX: number, minZ: number, maxX: number, maxZ: number, lowY: number, highY: number, dir: RampDirection): void {
    const run = dir === 'x+' || dir === 'x-' ? maxX - minX : maxZ - minZ;
    const width = dir === 'x+' || dir === 'x-' ? maxZ - minZ : maxX - minX;
    const point = (s: number, y: number, t: number): V3 => {
      switch (dir) {
        case 'x+':
          return [minX + s, y, minZ + t];
        case 'x-':
          return [maxX - s, y, maxZ - t];
        case 'z+':
          return [maxX - t, y, minZ + s];
        case 'z-':
          return [minX + t, y, maxZ - s];
      }
    };
    const l0 = point(0, lowY, 0);
    const l1 = point(0, lowY, width);
    const h0 = point(run, highY, 0);
    const h1 = point(run, highY, width);
    const b0 = point(run, lowY, 0);
    const b1 = point(run, lowY, width);
    this.segment(l0, l1);
    this.segment(h0, h1);
    this.segment(l0, h0);
    this.segment(l1, h1);
    this.segment(b0, h0);
    this.segment(b1, h1);
    this.segment(b0, b1);
    this.segment(l0, b0);
    this.segment(l1, b1);
  }

  circle(x: number, y: number, z: number, radius: number, segments = 18): void {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      this.segment([x + Math.cos(a0) * radius, y, z + Math.sin(a0) * radius], [x + Math.cos(a1) * radius, y, z + Math.sin(a1) * radius]);
    }
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}
