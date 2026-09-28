/** Shared PBR materials + world-scaled box geometry (UVs in metres so textures never stretch). */
import * as THREE from 'three';
import { buildTextures, type TexName } from './textures';

const geoCache = new Map<string, THREE.BufferGeometry>();

/** BoxGeometry whose UVs are scaled to real dimensions / `scale` metres per texture repeat. */
export function worldBox(w: number, h: number, d: number, scale = 2): THREE.BufferGeometry {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${scale}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / scale, (uv.getY(i) * dims[f][1]) / scale);
    }
  }
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

export type MatName =
  | 'concrete' | 'concreteDark' | 'tile' | 'labTile' | 'panel' | 'labPanel' | 'darkPanel' | 'grate' | 'plate'
  | 'carpet' | 'wallpaper' | 'tally' | 'wood' | 'ceiling' | 'metal' | 'steel' | 'blackMetal' | 'plastic'
  | 'whitePlastic' | 'rubber' | 'glass' | 'fabric' | 'mattress' | 'paper' | 'brass' | 'yellow' | 'red' | 'screenOff' | 'copper';

let mats: Record<MatName, THREE.MeshStandardMaterial> | null = null;

function pbr(t: Record<TexName, ReturnType<typeof buildTextures>[TexName]>, name: TexName, params: THREE.MeshStandardMaterialParameters = {}) {
  const s = t[name];
  return new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0, ...params });
}

export function getMaterials(q: 'low' | 'medium' | 'high' = 'high'): Record<MatName, THREE.MeshStandardMaterial> {
  if (mats) return mats;
  const t = buildTextures(q);
  mats = {
    concrete: pbr(t, 'concrete'),
    concreteDark: pbr(t, 'concreteDark'),
    tile: pbr(t, 'tile', { metalness: 0.05 }),
    labTile: pbr(t, 'labTile', { metalness: 0.05 }),
    panel: pbr(t, 'panel', { metalness: 0.5 }),
    labPanel: pbr(t, 'labPanel', { metalness: 0.2 }),
    darkPanel: pbr(t, 'darkPanel', { metalness: 0.6 }),
    grate: pbr(t, 'grate', { metalness: 0.7 }),
    plate: pbr(t, 'plate', { metalness: 0.8 }),
    carpet: pbr(t, 'carpet'),
    wallpaper: pbr(t, 'wallpaper'),
    tally: pbr(t, 'tally'),
    wood: pbr(t, 'wood'),
    ceiling: pbr(t, 'ceiling'),
    metal: pbr(t, 'metal', { metalness: 0.85, color: '#c8ccd0' }),
    steel: new THREE.MeshStandardMaterial({ color: '#8d9399', metalness: 0.9, roughness: 0.32 }),
    blackMetal: new THREE.MeshStandardMaterial({ color: '#1c1e21', metalness: 0.7, roughness: 0.45 }),
    plastic: new THREE.MeshStandardMaterial({ color: '#2c3034', metalness: 0.05, roughness: 0.55 }),
    whitePlastic: new THREE.MeshStandardMaterial({ color: '#d7dadc', metalness: 0.02, roughness: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
    glass: new THREE.MeshStandardMaterial({ color: '#9fc4d0', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
    fabric: new THREE.MeshStandardMaterial({ color: '#3b4750', roughness: 1 }),
    mattress: new THREE.MeshStandardMaterial({ color: '#c9ccc8', roughness: 0.95 }),
    paper: new THREE.MeshStandardMaterial({ color: '#e6e0cf', roughness: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 1, roughness: 0.3 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#c99a14', metalness: 0.3, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: '#7c1c18', metalness: 0.3, roughness: 0.5 }),
    screenOff: new THREE.MeshStandardMaterial({ color: '#05070a', metalness: 0.5, roughness: 0.15 }),
    copper: new THREE.MeshStandardMaterial({ color: '#8a5a3a', metalness: 0.9, roughness: 0.4 }),
  };
  return mats;
}

export const FLOOR_MAT: Record<string, MatName> = { concrete: 'concrete', tile: 'tile', grate: 'grate', carpet: 'carpet', lab: 'labTile', metal: 'plate' };
export const WALL_MAT: Record<string, MatName> = { panel: 'panel', concrete: 'concrete', lab: 'labPanel', dark: 'darkPanel', tally: 'tally', warm: 'wallpaper' };

/** Unlit emissive material (bloom-friendly). */
export function glow(color: string, intensity = 1): THREE.MeshBasicMaterial {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}
