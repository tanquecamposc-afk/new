/**
 * Procedural humanoid built from a joint hierarchy (hips → spine → chest → neck
 * → head, shoulders → elbows → hands, thighs → knees → feet). Skins swap
 * materials and accessories; weapons attach to hand sockets.
 */
import * as THREE from 'three';
import { SKINS, SkinDef } from './Skins';
import { cachedGeo } from '../gfx/Materials';

export const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'hdL', 'shR', 'elR', 'hdR', 'thL', 'knL', 'ftL', 'thR', 'knR', 'ftR'] as const;
export type JointName = (typeof JOINTS)[number];

const capsule = (r: number, len: number) =>
  cachedGeo(`cap${r}_${len}`, () => {
    const g = new THREE.CapsuleGeometry(r, len, 6, 12);
    g.translate(0, -len / 2 - r * 0.6, 0);
    return g;
  });
const sphere = (r: number) => cachedGeo(`sph${r}`, () => new THREE.SphereGeometry(r, 20, 16));
const rbox = (w: number, h: number, d: number) =>
  cachedGeo(`rbox${w}_${h}_${d}`, () => {
    const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
    // Round the corners a little by normalising towards an ellipsoid
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const nx = v.x / (w / 2), ny = v.y / (h / 2), nz = v.z / (d / 2);
      const k = 0.18;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      v.x = v.x * (1 - k) + (nx / len) * (w / 2) * k * 1.35;
      v.y = v.y * (1 - k) + (ny / len) * (h / 2) * k * 1.35;
      v.z = v.z * (1 - k) + (nz / len) * (d / 2) * k * 1.35;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });

interface SkinMats {
  suit: THREE.MeshStandardMaterial;
  suit2: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  cape: THREE.MeshStandardMaterial;
}

const skinMatCache = new Map<string, SkinMats>();

function skinMats(id: string, s: SkinDef): SkinMats {
  const hit = skinMatCache.get(id);
  if (hit) return hit;
  const transparent = (s.opacity ?? 1) < 1;
  const base = { transparent, opacity: s.opacity ?? 1 };
  const m: SkinMats = {
    suit: new THREE.MeshStandardMaterial({ color: s.suit, metalness: s.metal, roughness: s.rough, ...base }),
    suit2: new THREE.MeshStandardMaterial({ color: s.suit2, metalness: s.metal * 0.6, roughness: Math.min(1, s.rough + 0.15), ...base }),
    skin: new THREE.MeshStandardMaterial({ color: s.skin, metalness: s.head === 'robot' ? 0.9 : 0, roughness: s.head === 'robot' ? 0.25 : 0.55, ...base }),
    accent: new THREE.MeshStandardMaterial({ color: s.accent, emissive: s.accent, emissiveIntensity: s.accentGlow, metalness: 0.3, roughness: 0.3, ...base }),
    eye: new THREE.MeshStandardMaterial({ color: s.eyes ?? 0x101010, emissive: s.eyes ?? 0x000000, emissiveIntensity: s.eyes ? 4 : 0, roughness: 0.2 }),
    hair: new THREE.MeshStandardMaterial({ color: s.hair ?? 0x2a1a10, roughness: 0.8 }),
    cape: new THREE.MeshStandardMaterial({ color: s.cape ?? s.suit2, roughness: 0.8, side: THREE.DoubleSide, ...base }),
  };
  Object.values(m).forEach((mm) => (mm.userData.cached = true));
  skinMatCache.set(id, m);
  return m;
}

export class CharacterModel {
  readonly root = new THREE.Group();
  /** Tilt pivot at feet used for death falls / leaning. */
  readonly body = new THREE.Group();
  readonly joints = {} as Record<JointName, THREE.Group>;
  readonly weaponR = new THREE.Group();
  readonly weaponL = new THREE.Group();
  readonly back = new THREE.Group();
  private parts: THREE.Mesh[] = [];
  private cape: THREE.Mesh | null = null;
  private scarf: THREE.Mesh | null = null;
  skinId: string;
  height = 1.8;
  private flashT = 0;
  private flashMats: THREE.MeshStandardMaterial[] = [];

  constructor(skinId = 'skin_runner', public scale = 1) {
    this.skinId = skinId;
    this.root.add(this.body);
    this.build(skinId);
    this.root.scale.setScalar(scale);
  }

  private j(name: JointName, parent: THREE.Object3D, x: number, y: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    this.joints[name] = g;
    return g;
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = false;
    parent.add(m);
    this.parts.push(m);
    return m;
  }

  private build(skinId: string) {
    const s = SKINS[skinId] ?? SKINS.skin_runner;
    const m = skinMats(skinId, s);
    const bulk = s.bulk ?? 1;
    const ls = s.limbScale ?? 1;

    const hips = this.j('hips', this.body, 0, 0.97, 0);
    const spine = this.j('spine', hips, 0, 0.08, 0);
    const chest = this.j('chest', spine, 0, 0.22, 0);
    const neck = this.j('neck', chest, 0, 0.3, 0);
    const head = this.j('head', neck, 0, 0.08, 0);

    // Pelvis + belt
    this.mesh(rbox(0.32 * bulk, 0.2, 0.2), m.suit2, hips, 0, 0.02, 0);
    this.mesh(rbox(0.34 * bulk, 0.05, 0.22), m.accent, hips, 0, 0.1, 0);
    // Abdomen + chest
    this.mesh(rbox(0.28 * bulk, 0.22, 0.18), m.suit, spine, 0, 0.1, 0);
    this.mesh(rbox(0.4 * bulk, 0.32, 0.23), m.suit, chest, 0, 0.12, 0.0);
    // Chest plate / accent line
    this.mesh(rbox(0.26 * bulk, 0.16, 0.05), m.suit2, chest, 0, 0.16, 0.11);
    this.mesh(rbox(0.04, 0.2, 0.02), m.accent, chest, 0, 0.1, 0.14);
    // Neck
    this.mesh(cachedGeo('neck', () => new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10)), m.skin, neck, 0, 0.02, 0);

    // Head
    this.buildHead(head, s, m);

    // Arms
    const armSide = (side: 1 | -1) => {
      const L = side === 1 ? 'L' : 'R';
      const sh = this.j(`sh${L}` as JointName, chest, side * 0.25 * bulk, 0.25, 0);
      this.mesh(sphere(0.075), m.suit, sh, 0, 0, 0, bulk, 1, 1);
      if (s.shoulderPads) this.mesh(sphere(0.1), m.suit2, sh, side * 0.02, 0.03, 0, 1.1, 0.7, 1.1);
      this.mesh(capsule(0.055 * bulk, 0.2 * ls), m.suit, sh);
      const el = this.j(`el${L}` as JointName, sh, 0, -0.31 * ls, 0);
      this.mesh(capsule(0.05 * bulk, 0.19 * ls), m.suit, el);
      this.mesh(rbox(0.11 * bulk, 0.08, 0.11 * bulk), m.suit2, el, 0, -0.2 * ls, 0); // glove cuff
      const hd = this.j(`hd${L}` as JointName, el, 0, -0.3 * ls, 0);
      this.mesh(rbox(0.07, 0.1, 0.09), m.skin, hd, 0, -0.04, 0);
      this.mesh(sphere(0.025), m.skin, hd, -side * 0.0, -0.03, 0.05);
      return hd;
    };
    const hdL = armSide(1);
    const hdR = armSide(-1);
    this.weaponR.position.set(0, -0.07, 0.02);
    hdR.add(this.weaponR);
    this.weaponL.position.set(0, -0.07, 0.02);
    hdL.add(this.weaponL);

    // Legs
    const legSide = (side: 1 | -1) => {
      const L = side === 1 ? 'L' : 'R';
      const th = this.j(`th${L}` as JointName, hips, side * 0.1 * bulk, -0.04, 0);
      this.mesh(capsule(0.08 * bulk, 0.3), m.suit2, th);
      const kn = this.j(`kn${L}` as JointName, th, 0, -0.42, 0);
      this.mesh(sphere(0.07), m.accent, kn, 0, 0, 0.04, 0.9, 0.9, 0.5);
      this.mesh(capsule(0.065 * bulk, 0.3), m.suit2, kn);
      const ft = this.j(`ft${L}` as JointName, kn, 0, -0.43, 0);
      this.mesh(rbox(0.11, 0.08, 0.24), m.suit, ft, 0, -0.03, 0.05);
      this.mesh(rbox(0.115, 0.025, 0.25), m.accent, ft, 0, -0.07, 0.05);
    };
    legSide(1);
    legSide(-1);

    // Back socket for weapons carried / backpacks
    this.back.position.set(0, 0.15, -0.14);
    chest.add(this.back);

    if (s.backpack) {
      this.mesh(rbox(0.3, 0.36, 0.16), m.suit2, chest, 0, 0.12, -0.2);
      this.mesh(rbox(0.26, 0.08, 0.12), m.suit, chest, 0, 0.32, -0.2);
    }
    if (s.cape !== undefined) {
      const g = cachedGeo('cape', () => {
        const c = new THREE.PlaneGeometry(0.46, 0.9, 4, 8);
        c.translate(0, -0.45, 0);
        return c;
      });
      this.cape = this.mesh(g, m.cape, chest, 0, 0.36, -0.15);
      this.cape.castShadow = true;
    }
    if (s.scarf !== undefined) {
      const g = cachedGeo('scarf', () => {
        const c = new THREE.PlaneGeometry(0.1, 0.6, 1, 6);
        c.translate(0, -0.3, 0);
        return c;
      });
      const sm = new THREE.MeshStandardMaterial({ color: s.scarf, roughness: 0.8, side: THREE.DoubleSide });
      this.mesh(cachedGeo('scarfRing', () => new THREE.TorusGeometry(0.08, 0.03, 8, 16)), sm, neck, 0, 0.03, 0, 1, 1, 1).rotation.x = Math.PI / 2;
      this.scarf = this.mesh(g, sm, neck, 0.04, 0.03, -0.08);
    }
    this.flashMats = [m.suit, m.suit2, m.skin];
  }

  private buildHead(head: THREE.Group, s: SkinDef, m: SkinMats) {
    const headMesh = this.mesh(sphere(0.125), m.skin, head, 0, 0.13, 0.0, 1, 1.12, 1.05);
    void headMesh;
    const eyes = (y = 0.15, z = 0.11, r = 0.018) => {
      this.mesh(sphere(r), m.eye, head, 0.045, y, z);
      this.mesh(sphere(r), m.eye, head, -0.045, y, z);
    };
    switch (s.head) {
      case 'hair':
        eyes();
        this.mesh(sphere(0.135), m.hair, head, 0, 0.17, -0.015, 1.02, 0.95, 1.05);
        this.mesh(rbox(0.2, 0.05, 0.08), m.hair, head, 0, 0.26, 0.07);
        break;
      case 'helmet':
        this.mesh(sphere(0.145), m.suit, head, 0, 0.15, 0, 1, 1.1, 1.1);
        this.mesh(rbox(0.2, 0.03, 0.03), m.eye.emissiveIntensity ? m.eye : m.suit2, head, 0, 0.15, 0.14);
        this.mesh(rbox(0.03, 0.12, 0.26), m.accent, head, 0, 0.3, -0.01);
        break;
      case 'mask':
        eyes(0.155, 0.115, 0.016);
        this.mesh(sphere(0.135), m.suit, head, 0, 0.14, -0.005, 1.02, 1.1, 1.05);
        this.mesh(rbox(0.26, 0.04, 0.26), m.accent, head, 0, 0.22, 0);
        this.mesh(rbox(0.2, 0.05, 0.02), m.skin, head, 0, 0.155, 0.125);
        eyes(0.155, 0.135, 0.016);
        break;
      case 'hat':
        eyes();
        this.mesh(sphere(0.135), m.hair, head, 0, 0.16, -0.02, 1, 0.9, 1);
        this.mesh(cachedGeo('hatBrim', () => new THREE.CylinderGeometry(0.26, 0.26, 0.02, 20)), m.suit, head, 0, 0.25, 0);
        this.mesh(cachedGeo('hatTop', () => new THREE.CylinderGeometry(0.12, 0.14, 0.14, 16)), m.suit, head, 0, 0.32, 0);
        this.mesh(cachedGeo('hatBand', () => new THREE.CylinderGeometry(0.141, 0.141, 0.03, 16)), m.suit2, head, 0, 0.27, 0);
        break;
      case 'robot':
        this.mesh(rbox(0.24, 0.24, 0.24), m.skin, head, 0, 0.14, 0);
        this.mesh(rbox(0.2, 0.05, 0.02), m.eye, head, 0, 0.16, 0.125);
        this.mesh(rbox(0.05, 0.08, 0.08), m.suit2, head, 0.13, 0.14, 0);
        this.mesh(rbox(0.05, 0.08, 0.08), m.suit2, head, -0.13, 0.14, 0);
        if (s.antenna) {
          this.mesh(cachedGeo('ant', () => new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6)), m.suit2, head, 0.07, 0.33, 0);
          this.mesh(sphere(0.025), m.accent, head, 0.07, 0.42, 0);
        }
        break;
      case 'visor':
        this.mesh(sphere(0.135), m.hair, head, 0, 0.17, -0.02, 1, 0.95, 1);
        this.mesh(cachedGeo('visor', () => new THREE.CylinderGeometry(0.135, 0.135, 0.06, 20, 1, true, -1.2, 2.4)), m.eye, head, 0, 0.15, 0.005, 1, 1, 1.05);
        break;
      case 'hood':
        this.mesh(sphere(0.15), m.suit2, head, 0, 0.15, -0.02, 1.05, 1.15, 1.1);
        this.mesh(sphere(0.11), new THREE.MeshBasicMaterial({ color: 0x000000 }), head, 0, 0.13, 0.06, 1, 1, 0.6);
        eyes(0.14, 0.135, 0.016);
        break;
      case 'skull':
        eyes(0.15, 0.112, 0.022);
        this.mesh(rbox(0.16, 0.06, 0.06), m.suit2, head, 0, 0.05, 0.08);
        this.mesh(cachedGeo('hornS', () => new THREE.ConeGeometry(0.02, 0.08, 6)), m.accent, head, 0.05, 0.03, 0.1).rotation.x = Math.PI;
        this.mesh(cachedGeo('hornS', () => new THREE.ConeGeometry(0.02, 0.08, 6)), m.accent, head, -0.05, 0.03, 0.1).rotation.x = Math.PI;
        break;
      case 'bald':
        eyes(0.15, 0.108, 0.026);
        this.mesh(rbox(0.1, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 }), head, 0, 0.06, 0.115);
        break;
      case 'horns': {
        eyes(0.15, 0.112, 0.02);
        const hg = cachedGeo('horn', () => {
          const g = new THREE.ConeGeometry(0.035, 0.22, 8);
          g.translate(0, 0.11, 0);
          return g;
        });
        const h1 = this.mesh(hg, m.suit2, head, 0.08, 0.24, 0);
        h1.rotation.z = -0.6;
        const h2 = this.mesh(hg, m.suit2, head, -0.08, 0.24, 0);
        h2.rotation.z = 0.6;
        break;
      }
      case 'crown': {
        eyes(0.15, 0.11, 0.018);
        this.mesh(sphere(0.132), m.suit, head, 0, 0.17, -0.01, 1, 0.92, 1.03);
        const crown = this.mesh(cachedGeo('crown', () => new THREE.CylinderGeometry(0.12, 0.11, 0.07, 10, 1, true)), m.accent, head, 0, 0.3, 0);
        crown.material = m.accent;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.mesh(cachedGeo('crownSpike', () => new THREE.ConeGeometry(0.02, 0.07, 5)), m.accent, head, Math.sin(a) * 0.115, 0.36, Math.cos(a) * 0.115);
        }
        break;
      }
    }
  }

  /** Enemy / damage flash (white emissive pulse). */
  flash(d = 0.12) {
    this.flashT = d;
  }

  /** Secondary motion for capes and scarves. */
  updateCloth(time: number, speed: number, vy: number) {
    const sw = Math.min(1, speed / 8);
    if (this.cape) {
      this.cape.rotation.x = -0.1 - sw * 0.9 - Math.max(0, vy) * 0.03 + Math.sin(time * 9) * 0.05 * (0.3 + sw);
      this.cape.rotation.y = Math.sin(time * 3.3) * 0.05;
    }
    if (this.scarf) {
      this.scarf.rotation.x = -0.3 - sw * 1.1 + Math.sin(time * 12) * 0.12 * (0.3 + sw);
      this.scarf.rotation.z = Math.sin(time * 7) * 0.2;
    }
    if (this.flashT > 0) {
      this.flashT -= 1 / 60;
      const k = Math.max(0, this.flashT) * 8;
      for (const m of this.flashMats) {
        if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive.clone();
        m.emissive.setRGB(k, k * 0.9, k * 0.9);
      }
      if (this.flashT <= 0) for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive);
    }
  }

  setVisible(v: boolean) {
    this.root.visible = v;
  }

  setWeapon(mesh: THREE.Object3D | null, left: THREE.Object3D | null = null) {
    this.weaponR.clear();
    this.weaponL.clear();
    if (mesh) this.weaponR.add(mesh);
    if (left) this.weaponL.add(left);
  }

  dispose() {
    this.root.removeFromParent();
  }
}

/**
 * Enemies that share a skin share materials; clone materials for per-instance
 * flashing so hitting one grunt doesn't flash all of them.
 */
export function makeUniqueMaterials(model: CharacterModel) {
  const map = new Map<THREE.Material, THREE.Material>();
  model.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material;
    let c = map.get(mat);
    if (!c) {
      c = mat.clone();
      c.userData.cached = false;
      map.set(mat, c);
    }
    mesh.material = c;
  });
  const fm = (model as unknown as { flashMats: THREE.MeshStandardMaterial[] }).flashMats;
  for (let i = 0; i < fm.length; i++) fm[i] = (map.get(fm[i]) as THREE.MeshStandardMaterial) ?? fm[i];
  return () => map.forEach((m) => m.dispose());
}
