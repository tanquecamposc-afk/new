/**
 * Builds every static visual of a map from its MapDefinition — the same data the simulation
 * turns into colliders — so what the player sees is exactly what they collide with.
 */
import * as THREE from 'three';
import { makeRng } from '../../core/rng.js';
import {
  PROP_ARCHETYPES,
  TERRAIN_SURFACES,
  type MapDefinition,
  type PropPlacement,
  type PropType,
  type StaticDef,
  type StaticStyle,
  type TerrainData,
} from '../../core/sim/map.js';
import { fractalNoise2D } from '../../core/sim/noise.js';
import { EdgeBuilder, MeshBuilder } from './geometry.js';
import { PALETTE } from './palette.js';
import { createLabelTexture, type DetailTexture } from './textures.js';

interface StyleLook {
  texture: DetailTexture;
  colors: readonly number[];
}

const STYLE_LOOK: Readonly<Record<StaticStyle, StyleLook>> = {
  concrete: { texture: 'panel', colors: [PALETTE.concrete] },
  wall: { texture: 'panel', colors: [PALETTE.wall] },
  platform: { texture: 'panel', colors: [PALETTE.platform] },
  pillar: { texture: 'panel', colors: [PALETTE.pillar] },
  ramp: { texture: 'panel', colors: [PALETTE.ramp] },
  stone: { texture: 'panel', colors: [PALETTE.stone] },
  trim: { texture: 'panel', colors: [PALETTE.turquoise] },
  roof: { texture: 'metal', colors: [PALETTE.roof] },
  container: { texture: 'metal', colors: [PALETTE.containerA, PALETTE.containerB] },
  crate: { texture: 'crate', colors: [PALETTE.crate, 0xd9963f, 0xecb866] },
};

export interface WorldViewOptions {
  textures: Record<DetailTexture, THREE.Texture>;
  shadows: boolean;
  /** 0..1 share of decorative props (bushes) to draw; colliding props are always drawn. */
  decorDensity: number;
  translate: (key: string) => string;
}

/** Shared uniform that drives the foliage sway. */
export interface WindUniform {
  value: number;
}

export class WorldView {
  readonly group = new THREE.Group();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly labelSprites: Array<{ sprite: THREE.Sprite; key: string; y: number }> = [];
  readonly wind: WindUniform = { value: 0 };

  constructor(
    private readonly map: MapDefinition,
    private readonly options: WorldViewOptions,
  ) {
    this.group.name = `world:${map.id}`;
    if (map.terrain) this.buildTerrain(map.terrain);
    this.buildStatics(map.statics);
    this.buildProps(map.props);
    this.buildMarkings();
    this.buildLabels();
  }

  /** Re-renders signpost text (after a language change). */
  setTranslator(translate: (key: string) => string): void {
    this.options.translate = translate;
    for (const entry of this.labelSprites) {
      const material = entry.sprite.material;
      material.map?.dispose();
      const { texture, aspect } = createLabelTexture(translate(entry.key));
      material.map = texture;
      material.needsUpdate = true;
      entry.sprite.scale.set(1.25 * aspect, 1.25, 1);
    }
  }

  update(timeSeconds: number): void {
    this.wind.value = timeSeconds;
  }

  dispose(): void {
    for (const entry of this.labelSprites) entry.sprite.material.map?.dispose();
    for (const item of this.disposables) item.dispose();
    this.group.removeFromParent();
  }

  /* ---- terrain ----------------------------------------------------------------------------- */

  private buildTerrain(terrain: TerrainData): void {
    const { cols, rows, cellSize, originX, originZ, heights, surface } = terrain;
    const stride = cols + 1;
    const count = stride * (rows + 1);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    const grassA = new THREE.Color(PALETTE.grassA);
    const grassB = new THREE.Color(PALETTE.grassB);
    const byIndex = [grassA, new THREE.Color(PALETTE.dirt), new THREE.Color(PALETTE.sand), new THREE.Color(PALETTE.rock)];

    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const index = j * stride + i;
        const x = originX + i * cellSize;
        const z = originZ + j * cellSize;
        const h = heights[index]!;
        positions[index * 3] = x;
        positions[index * 3 + 1] = h;
        positions[index * 3 + 2] = z;

        const kind = TERRAIN_SURFACES[surface[index] ?? 0] ?? 'grass';
        const variation = fractalNoise2D(x * 0.08, z * 0.08, 91, 3);
        if (kind === 'grass') {
          color.copy(grassA).lerp(grassB, variation);
          // Sun-kissed tops, cooler hollows.
          color.offsetHSL(0, 0, Math.min(0.08, h * 0.008));
        } else {
          color.copy(byIndex[surface[index] ?? 0] ?? grassA);
          color.multiplyScalar(0.9 + variation * 0.2);
        }
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    // Same triangle split as the simulation's heightfield: (00, 01, 10) and (10, 01, 11).
    const indices = new Uint32Array(cols * rows * 6);
    let cursor = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v00 = j * stride + i;
        const v10 = v00 + 1;
        const v01 = v00 + stride;
        const v11 = v01 + 1;
        indices[cursor++] = v00;
        indices[cursor++] = v01;
        indices[cursor++] = v10;
        indices[cursor++] = v10;
        indices[cursor++] = v01;
        indices[cursor++] = v11;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'terrain';
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.disposables.push(geometry, material);
  }

  /* ---- static pieces ----------------------------------------------------------------------- */

  private buildStatics(statics: readonly StaticDef[]): void {
    const builders: Record<DetailTexture, MeshBuilder> = {
      panel: new MeshBuilder(2),
      crate: new MeshBuilder(1.6),
      metal: new MeshBuilder(2),
    };
    const edges = new EdgeBuilder();
    const rng = makeRng(404);

    for (const s of statics) {
      const look = STYLE_LOOK[s.style];
      const builder = builders[look.texture];
      const hex = look.colors[Math.floor(rng() * look.colors.length)] ?? look.colors[0]!;
      if (s.shape === 'box') {
        if (s.style === 'crate') {
          // A crate repeats its texture exactly once per face, whatever its size.
          const local = new MeshBuilder(Math.max(s.maxX - s.minX, s.maxY - s.minY, s.maxZ - s.minZ));
          local.box(s.minX, s.minY, s.minZ, s.maxX, s.maxY, s.maxZ, hex);
          this.addMesh(local, look.texture, 0.9, 0);
        } else {
          builder.box(s.minX, s.minY, s.minZ, s.maxX, s.maxY, s.maxZ, hex);
        }
        edges.box(s.minX, s.minY, s.minZ, s.maxX, s.maxY, s.maxZ);
      } else if (s.shape === 'cylinder') {
        builder.cylinder(s.x, s.z, s.radius, s.minY, s.maxY, hex);
        edges.circle(s.x, s.maxY, s.z, s.radius);
        if (s.minY > 0.05) edges.circle(s.x, s.minY, s.z, s.radius);
      } else {
        builder.wedge(s.minX, s.minZ, s.maxX, s.maxZ, s.lowY, s.highY, s.dir, hex);
        edges.wedge(s.minX, s.minZ, s.maxX, s.maxZ, s.lowY, s.highY, s.dir);
      }
    }

    this.addMesh(builders.panel, 'panel', 0.92, 0);
    this.addMesh(builders.crate, 'crate', 0.9, 0);
    this.addMesh(builders.metal, 'metal', 0.55, 0.35);

    if (!edges.isEmpty) {
      const geometry = edges.build();
      const material = new THREE.LineBasicMaterial({ color: PALETTE.outline, transparent: true, opacity: 0.55 });
      const lines = new THREE.LineSegments(geometry, material);
      lines.name = 'outlines';
      this.group.add(lines);
      this.disposables.push(geometry, material);
    }
  }

  private addMesh(builder: MeshBuilder, texture: DetailTexture, roughness: number, metalness: number): void {
    if (builder.isEmpty) return;
    const geometry = builder.build();
    const material = new THREE.MeshStandardMaterial({
      map: this.options.textures[texture],
      vertexColors: true,
      roughness,
      metalness,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `statics:${texture}`;
    mesh.castShadow = this.options.shadows;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.disposables.push(geometry, material);
  }

  /* ---- props (instanced) ------------------------------------------------------------------- */

  private buildProps(props: readonly PropPlacement[]): void {
    const byType = new Map<PropType, PropPlacement[]>();
    const rng = makeRng(808);
    for (const p of props) {
      // Decorative props thin out on low settings; anything with a collider always draws.
      if (!PROP_ARCHETYPES[p.type].collider && rng() > this.options.decorDensity) continue;
      const list = byType.get(p.type) ?? [];
      list.push(p);
      byType.set(p.type, list);
    }

    const trunkMaterial = this.track(new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 1, flatShading: true }));
    const foliageMaterial = this.track(this.makeFoliageMaterial());
    const rockMaterial = this.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }));

    const pines = byType.get('tree_pine');
    if (pines) {
      const trunk = this.track(new THREE.CylinderGeometry(0.15, 0.3, 2.4, 7).translate(0, 1.2, 0));
      this.addInstances(trunk, trunkMaterial, pines, () => 0xffffff, true);
      this.addInstances(this.track(pineFoliage()), foliageMaterial, pines, (r) => tint(PALETTE.pine, PALETTE.pineLight, r), true);
    }
    const rounds = byType.get('tree_round');
    if (rounds) {
      const trunk = this.track(new THREE.CylinderGeometry(0.2, 0.34, 2.6, 7).translate(0, 1.3, 0));
      this.addInstances(trunk, trunkMaterial, rounds, () => 0xffffff, true);
      this.addInstances(this.track(roundFoliage()), foliageMaterial, rounds, (r) => (r > 0.82 ? PALETTE.leafWarm : tint(PALETTE.leaf, PALETTE.pineLight, r)), true);
    }
    const rocks = byType.get('rock');
    if (rocks) {
      const geometry = this.track(new THREE.IcosahedronGeometry(1, 0).scale(0.98, 0.72, 0.9).translate(0, 0.34, 0));
      this.addInstances(geometry, rockMaterial, rocks, (r) => tint(PALETTE.rock, 0xa3a2ad, r), true);
    }
    const bushes = byType.get('bush');
    if (bushes) {
      const geometry = this.track(new THREE.IcosahedronGeometry(0.75, 1).scale(1, 0.7, 1).translate(0, 0.42, 0));
      this.addInstances(geometry, foliageMaterial, bushes, (r) => tint(PALETTE.bush, PALETTE.leaf, r), false);
    }
  }

  private addInstances(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    placements: readonly PropPlacement[],
    colorFor: (random: number) => number,
    castShadow: boolean,
  ): void {
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();
    const rng = makeRng(placements.length * 31 + 7);
    placements.forEach((p, i) => {
      position.set(p.x, p.y - 0.05, p.z);
      rotation.setFromAxisAngle(up, p.rotation);
      scale.setScalar(p.scale);
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
      mesh.setColorAt(i, color.setHex(colorFor(rng())));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && this.options.shadows;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    this.group.add(mesh);
    this.disposables.push(mesh);
  }

  /** Standard material with a gentle vertex sway so trees are never frozen. */
  private makeFoliageMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const wind = this.wind;
    material.onBeforeCompile = (shader) => {
      shader.uniforms['uWind'] = wind;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float swayPhase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
          #else
            float swayPhase = 0.0;
          #endif
          float sway = sin(uWind * 1.3 + swayPhase) * 0.05 + sin(uWind * 2.9 + swayPhase * 1.7) * 0.02;
          transformed.x += sway * transformed.y * 0.35;
          transformed.z += sway * transformed.y * 0.22;`,
        );
    };
    return material;
  }

  /* ---- ground markings and signposts -------------------------------------------------------- */

  private buildMarkings(): void {
    if (this.map.markings.length === 0) return;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const color = new THREE.Color();
    const hexFor = { lane: PALETTE.laneLine, start: PALETTE.laneStart, finish: PALETTE.laneFinish, zone: PALETTE.laneLine } as const;
    for (const m of this.map.markings) {
      const base = positions.length / 3;
      const y = 0.025;
      positions.push(m.minX, y, m.maxZ, m.maxX, y, m.maxZ, m.maxX, y, m.minZ, m.minX, y, m.minZ);
      color.setHex(hexFor[m.color]);
      for (let i = 0; i < 4; i++) colors.push(color.r, color.g, color.b);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'markings';
    this.group.add(mesh);
    this.disposables.push(geometry, material);
  }

  /** Floating holographic signs that name each training zone. */
  private buildLabels(): void {
    for (const label of this.map.labels) {
      const { texture, aspect } = createLabelTexture(this.options.translate(label.key));
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: true });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(label.x, label.y, label.z);
      sprite.scale.set(1.25 * aspect, 1.25, 1);
      this.group.add(sprite);
      this.disposables.push(material);
      this.labelSprites.push({ sprite, key: label.key, y: label.y });
    }
  }

  private track<T extends { dispose(): void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }
}

function tint(a: number, b: number, t: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

/** Three stacked cones merged into one geometry. */
function pineFoliage(): THREE.BufferGeometry {
  const parts = [
    new THREE.ConeGeometry(1.55, 2.3, 7).translate(0, 2.7, 0),
    new THREE.ConeGeometry(1.2, 2.0, 7).translate(0, 3.9, 0),
    new THREE.ConeGeometry(0.82, 1.7, 7).translate(0, 5.0, 0),
  ];
  return mergeSimple(parts);
}

function roundFoliage(): THREE.BufferGeometry {
  const parts = [
    new THREE.IcosahedronGeometry(1.55, 1).scale(1, 0.86, 1).translate(0, 3.5, 0),
    new THREE.IcosahedronGeometry(1.0, 1).translate(0.9, 2.9, 0.4),
    new THREE.IcosahedronGeometry(0.9, 1).translate(-0.8, 3.0, -0.5),
  ];
  return mergeSimple(parts);
}

/** Concatenates non-indexed copies of simple geometries (position + normal only). */
function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const part of parts) {
    const flat = part.index ? part.toNonIndexed() : part;
    positions.push(...(flat.getAttribute('position').array as ArrayLike<number> as number[]));
    normals.push(...(flat.getAttribute('normal').array as ArrayLike<number> as number[]));
    if (flat !== part) flat.dispose();
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
