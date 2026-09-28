/**
 * PBR material library + geometry helpers.
 * Materials are cached and shared across levels (never disposed per level) to
 * avoid shader recompilation and memory churn.
 */
import * as THREE from 'three';
import { getTex, TexKind } from './Textures';

export interface MatOpts {
  color?: THREE.ColorRepresentation;
  tex?: TexKind;
  /** World units covered by one texture tile. */
  roughness?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: boolean;
  bumpScale?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  envMapIntensity?: number;
  flatShading?: boolean;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(key: string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const k = key + JSON.stringify(o);
  let m = cache.get(k);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 0.7,
    metalness: o.metalness ?? 0,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    flatShading: o.flatShading ?? false,
  });
  if (o.tex) {
    const t = getTex(o.tex);
    m.map = t.map;
    m.bumpMap = t.bump;
    m.bumpScale = o.bumpScale ?? 1.2;
    if (o.emissiveMap && t.emissive) m.emissiveMap = t.emissive;
  }
  if (o.emissive !== undefined) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  if (o.envMapIntensity !== undefined) m.envMapIntensity = o.envMapIntensity;
  m.userData.cached = true;
  cache.set(k, m);
  return m;
}

/** Unlit glowing material (for lasers, neon, emissive signs) — bloom picks these up. */
const glowCache = new Map<string, THREE.MeshBasicMaterial>();
export function glowMat(color: THREE.ColorRepresentation, intensity = 1, opacity = 1, additive = false): THREE.MeshBasicMaterial {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  const k = c.getHexString() + intensity + opacity + additive;
  let m = glowCache.get(k);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({
    color: c,
    transparent: opacity < 1 || additive,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !additive && opacity >= 1,
    toneMapped: false,
  });
  m.userData.cached = true;
  glowCache.set(k, m);
  return m;
}

// ── Geometry helpers ───────────────────────────────────────────────────────
const geoCache = new Map<string, THREE.BufferGeometry>();

/**
 * Box whose UVs are scaled to world size so tiling textures keep a constant
 * texel density regardless of box dimensions.
 */
export function boxGeo(w: number, h: number, d: number, tile = 4): THREE.BufferGeometry {
  const k = `box${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}_${tile}`;
  let g = geoCache.get(k);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
  }
  uv.needsUpdate = true;
  g.userData.cached = true;
  geoCache.set(k, g);
  return g;
}

export function cachedGeo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    g.userData.cached = true;
    geoCache.set(key, g);
  }
  return g;
}

/** Scale UVs of an arbitrary geometry (e.g. large planes). */
export function planeGeo(w: number, d: number, tile = 4, segs = 1): THREE.BufferGeometry {
  return cachedGeo(`plane${w}_${d}_${tile}_${segs}`, () => {
    const g = new THREE.PlaneGeometry(w, d, segs, segs);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    return g;
  });
}

/** Common palette materials used across many worlds. */
export const M = {
  concrete: () => mat('concrete', { tex: 'concrete', roughness: 0.9, color: 0xb8bcc4 }),
  darkConcrete: () => mat('dconcrete', { tex: 'concrete', roughness: 0.92, color: 0x585c66 }),
  metal: () => mat('metal', { tex: 'metal', roughness: 0.35, metalness: 0.85, color: 0xaab4c4 }),
  darkMetal: () => mat('dmetal', { tex: 'metal', roughness: 0.4, metalness: 0.8, color: 0x3a404c }),
  tech: (c: THREE.ColorRepresentation = 0x3ad4ff) => mat('tech', { tex: 'tech', roughness: 0.45, metalness: 0.6, color: 0x9098a8, emissive: c, emissiveIntensity: 1.6, emissiveMap: true }),
  hex: (c: THREE.ColorRepresentation = 0xb48cff) => mat('hex', { tex: 'hex', roughness: 0.4, metalness: 0.5, color: 0xb0b0c8, emissive: c, emissiveIntensity: 1.2, emissiveMap: true }),
  marble: () => mat('marble', { tex: 'marble', roughness: 0.25, metalness: 0.05, color: 0xe8e4f0 }),
  darkMarble: () => mat('dmarble', { tex: 'marble', roughness: 0.2, metalness: 0.1, color: 0x3c3450 }),
  sand: () => mat('sand', { tex: 'sand', roughness: 0.95, color: 0xd8c098 }),
  rock: () => mat('rock', { tex: 'rock', roughness: 0.95, color: 0x8a8278 }),
  darkRock: () => mat('drock', { tex: 'rock', roughness: 0.95, color: 0x3a3430 }),
  grass: () => mat('grass', { tex: 'grass', roughness: 0.95, color: 0x9ac070 }),
  dirt: () => mat('dirt', { tex: 'dirt', roughness: 0.98, color: 0xa08868 }),
  wood: () => mat('wood', { tex: 'wood', roughness: 0.75, color: 0xc89868 }),
  planks: () => mat('planks', { tex: 'planks', roughness: 0.8, color: 0x8a6448 }),
  asphalt: () => mat('asphalt', { tex: 'asphalt', roughness: 0.85, metalness: 0.05, color: 0x9098a0 }),
  lava: () => mat('lava', { tex: 'lava', roughness: 0.9, color: 0x442218, emissive: 0xffffff, emissiveIntensity: 2.2, emissiveMap: true }),
  ice: () => mat('ice', { tex: 'ice', roughness: 0.12, metalness: 0.1, color: 0xd0f0ff, envMapIntensity: 1.6 }),
  brick: () => mat('brick', { tex: 'brick', roughness: 0.9, color: 0xc0a090 }),
  wallpaper: () => mat('wallpaper', { tex: 'wallpaper', roughness: 0.9, color: 0xa08880 }),
  tiles: () => mat('tiles', { tex: 'tiles', roughness: 0.3, metalness: 0.05, color: 0xe0e4ec }),
  grid: () => mat('grid', { tex: 'grid', roughness: 0.5, color: 0xdde4f0 }),
};
