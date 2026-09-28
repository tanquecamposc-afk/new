/**
 * Weapon definitions (stats, combo chains, abilities) and procedural models.
 */
import * as THREE from 'three';
import { cachedGeo } from '../gfx/Materials';

export type WeaponKind = 'melee' | 'bow' | 'staff';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  heavyMul: number;
  range: number;
  arc: number;
  speed: number;
  knockback: number;
  combo: string[];
  heavy: string;
  ability: { id: string; name: string; cost: number };
  color: number;
  element?: 'fire' | 'ice' | 'electric' | 'void';
  staminaCost: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  wpn_sword: { id: 'wpn_sword', name: 'Sword', kind: 'melee', damage: 20, heavyMul: 2.2, range: 2.4, arc: 2.2, speed: 1, knockback: 5, combo: ['slash1', 'slash2', 'slash3'], heavy: 'heavy', ability: { id: 'whirlwind', name: 'Whirlwind', cost: 40 }, color: 0xcfe8ff, staminaCost: 8 },
  wpn_katana: { id: 'wpn_katana', name: 'Katana', kind: 'melee', damage: 18, heavyMul: 2, range: 2.8, arc: 2, speed: 1.3, knockback: 4, combo: ['slash1', 'slash2', 'thrust', 'slash3'], heavy: 'heavy', ability: { id: 'iaido', name: 'Iaido Dash', cost: 35 }, color: 0xff4d6d, staminaCost: 7 },
  wpn_axe: { id: 'wpn_axe', name: 'Axe', kind: 'melee', damage: 32, heavyMul: 2.4, range: 2.5, arc: 2.3, speed: 0.8, knockback: 9, combo: ['slash1', 'slash3'], heavy: 'heavy', ability: { id: 'earthsplitter', name: 'Earthsplitter', cost: 50 }, color: 0xffa050, staminaCost: 12 },
  wpn_daggers: { id: 'wpn_daggers', name: 'Daggers', kind: 'melee', damage: 11, heavyMul: 1.8, range: 1.9, arc: 1.8, speed: 1.65, knockback: 2.5, combo: ['thrust', 'stabL', 'slash1', 'stabL'], heavy: 'slash3', ability: { id: 'flurry', name: 'Flurry', cost: 35 }, color: 0x7cffc4, staminaCost: 5 },
  wpn_bow: { id: 'wpn_bow', name: 'Hunter Bow', kind: 'bow', damage: 18, heavyMul: 2, range: 60, arc: 0, speed: 1, knockback: 3, combo: ['bowRelease'], heavy: 'bowDraw', ability: { id: 'volley', name: 'Volley', cost: 40 }, color: 0xffe0a0, staminaCost: 4 },
  wpn_staff: { id: 'wpn_staff', name: 'Storm Staff', kind: 'staff', damage: 17, heavyMul: 2.5, range: 40, arc: 0, speed: 1, knockback: 4, combo: ['cast'], heavy: 'cast', ability: { id: 'chain', name: 'Chain Lightning', cost: 45 }, color: 0x7ab0ff, element: 'electric', staminaCost: 6 },
  wpn_flame: { id: 'wpn_flame', name: 'Flame Blade', kind: 'melee', damage: 26, heavyMul: 2.3, range: 2.6, arc: 2.3, speed: 1.05, knockback: 6, combo: ['slash1', 'slash2', 'slash3'], heavy: 'heavy', ability: { id: 'inferno', name: 'Inferno', cost: 45 }, color: 0xff7a1f, element: 'fire', staminaCost: 8 },
  wpn_void: { id: 'wpn_void', name: 'Void Edge', kind: 'melee', damage: 30, heavyMul: 2.4, range: 2.9, arc: 2.4, speed: 1.1, knockback: 7, combo: ['slash1', 'slash2', 'thrust', 'slash3'], heavy: 'heavy', ability: { id: 'rift', name: 'Rift', cost: 50 }, color: 0xb14dff, element: 'void', staminaCost: 8 },
};

const steel = () => new THREE.MeshStandardMaterial({ color: 0xd8e0ea, metalness: 1, roughness: 0.18 });
const dark = () => new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.2, roughness: 0.7 });
const gold = () => new THREE.MeshStandardMaterial({ color: 0xd8a830, metalness: 1, roughness: 0.3 });
const glow = (c: number, i = 3) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 });

function bladeGeo(len: number, width: number, curve = 0) {
  return cachedGeo(`blade${len}_${width}_${curve}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(-width / 2 + curve * 0.3, len * 0.85);
    s.lineTo(0 + curve, len);
    s.lineTo(width / 2 + curve * 0.5, len * 0.8);
    s.lineTo(width / 2, 0);
    s.lineTo(-width / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 });
    g.translate(0, 0, -0.007);
    // Blade along +Z (forward from the fist)
    g.rotateX(Math.PI / 2);
    g.rotateY(Math.PI / 2);
    return g;
  });
}

function sword(len: number, bladeMat: THREE.Material, guardMat: THREE.Material, width = 0.07, curve = 0) {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(cachedGeo('grip', () => new THREE.CylinderGeometry(0.02, 0.022, 0.2, 8).rotateX(Math.PI / 2)), dark());
  grip.position.z = -0.02;
  const guard = new THREE.Mesh(cachedGeo('guard', () => new THREE.BoxGeometry(0.2, 0.035, 0.04)), guardMat);
  guard.position.z = 0.09;
  const pommel = new THREE.Mesh(cachedGeo('pommel', () => new THREE.SphereGeometry(0.03, 8, 6)), guardMat);
  pommel.position.z = -0.13;
  const blade = new THREE.Mesh(bladeGeo(len, width, curve), bladeMat);
  blade.position.z = 0.1;
  g.add(grip, guard, pommel, blade);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  g.rotation.x = 0.5;
  return g;
}

/** Tip offset (in weapon local space) — used for trails. */
export function buildWeapon(id: string): { right: THREE.Object3D | null; left: THREE.Object3D | null; tip: THREE.Object3D | null } {
  const tip = new THREE.Object3D();
  switch (id) {
    case 'wpn_sword': {
      const s = sword(0.95, steel(), gold());
      tip.position.set(0, 0, 1.0);
      s.add(tip);
      return { right: s, left: null, tip };
    }
    case 'wpn_katana': {
      const bm = new THREE.MeshStandardMaterial({ color: 0xe8eef8, metalness: 1, roughness: 0.1 });
      const s = sword(1.1, bm, new THREE.MeshStandardMaterial({ color: 0xa01830, metalness: 0.5, roughness: 0.4 }), 0.045, 0.06);
      tip.position.set(0, 0, 1.2);
      s.add(tip);
      return { right: s, left: null, tip };
    }
    case 'wpn_flame': {
      const s = sword(1.0, glow(0xff5a10, 2.5), dark(), 0.08);
      tip.position.set(0, 0, 1.05);
      s.add(tip);
      return { right: s, left: null, tip };
    }
    case 'wpn_void': {
      const s = sword(1.15, glow(0x9a30ff, 3), new THREE.MeshStandardMaterial({ color: 0x100818, metalness: 0.8, roughness: 0.3 }), 0.09, 0.03);
      tip.position.set(0, 0, 1.2);
      s.add(tip);
      return { right: s, left: null, tip };
    }
    case 'wpn_axe': {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(cachedGeo('axeHandle', () => new THREE.CylinderGeometry(0.025, 0.03, 0.95, 8).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.8 }));
      handle.position.z = 0.35;
      const headShape = new THREE.Shape();
      headShape.moveTo(0, -0.06);
      headShape.quadraticCurveTo(0.22, -0.2, 0.28, -0.02);
      headShape.lineTo(0.28, 0.12);
      headShape.quadraticCurveTo(0.22, 0.28, 0, 0.1);
      headShape.lineTo(0, -0.06);
      const hg = cachedGeo('axeHead', () => {
        const x = new THREE.ExtrudeGeometry(headShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
        x.translate(0, 0, -0.015);
        x.rotateY(-Math.PI / 2);
        return x;
      });
      const head = new THREE.Mesh(hg, steel());
      head.position.set(0, 0.0, 0.72);
      head.rotation.z = Math.PI / 2;
      g.add(handle, head);
      g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      g.rotation.x = 0.5;
      tip.position.set(0, 0.25, 0.8);
      g.add(tip);
      return { right: g, left: null, tip };
    }
    case 'wpn_daggers': {
      const m = new THREE.MeshStandardMaterial({ color: 0xc0fff0, metalness: 1, roughness: 0.15, emissive: 0x20a070, emissiveIntensity: 0.4 });
      const a = sword(0.42, m, dark(), 0.05);
      const b = sword(0.42, m, dark(), 0.05);
      tip.position.set(0, 0, 0.5);
      a.add(tip);
      return { right: a, left: b, tip };
    }
    case 'wpn_bow': {
      const g = new THREE.Group();
      const arc = new THREE.Mesh(cachedGeo('bowArc', () => new THREE.TorusGeometry(0.62, 0.022, 6, 24, Math.PI * 0.8).rotateZ(Math.PI * 0.6)), new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.6 }));
      arc.rotation.y = Math.PI / 2;
      arc.position.z = -0.45;
      const stringGeo = cachedGeo('bowString', () => new THREE.CylinderGeometry(0.004, 0.004, 1.18, 4));
      const str = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
      str.position.z = -0.24;
      g.add(arc, str);
      g.rotation.x = -1.3;
      g.position.y = -0.02;
      g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      return { right: null, left: g, tip: null };
    }
    case 'wpn_staff': {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(cachedGeo('staffShaft', () => new THREE.CylinderGeometry(0.025, 0.03, 1.7, 8).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.5, metalness: 0.3 }));
      shaft.position.z = 0.35;
      const orb = new THREE.Mesh(cachedGeo('staffOrb', () => new THREE.IcosahedronGeometry(0.09, 1)), glow(0x7ab0ff, 4));
      orb.position.z = 1.25;
      const ring = new THREE.Mesh(cachedGeo('staffRing', () => new THREE.TorusGeometry(0.13, 0.012, 6, 20)), gold());
      ring.position.z = 1.25;
      g.add(shaft, orb, ring);
      g.rotation.x = -1.2;
      g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      tip.position.set(0, 0, 1.25);
      g.add(tip);
      g.userData.spin = ring;
      return { right: g, left: null, tip };
    }
  }
  return { right: null, left: null, tip: null };
}
