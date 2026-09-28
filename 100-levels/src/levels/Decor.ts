/**
 * Decorative set dressing (instanced where possible): skylines, forests,
 * rocks, water, columns, arena stands... Keeps worlds alive and distinct.
 */
import * as THREE from 'three';
import { Builder } from './Builder';
import { cachedGeo, glowMat, M, mat } from '../gfx/Materials';
import { rand } from '../core/math';
import { Entity } from '../entities/Entity';
import type { Session } from './Session';

let winTex: THREE.Texture | null = null;
function windowsTexture() {
  if (winTex) return winTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, 128, 256);
  const cols = ['#ffd890', '#90d8ff', '#ff90d0', '#ffffff', '#ffb060'];
  for (let yy = 4; yy < 256; yy += 10) {
    for (let xx = 4; xx < 128; xx += 9) {
      if (Math.random() < 0.38) {
        x.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        x.globalAlpha = 0.5 + Math.random() * 0.5;
        x.fillRect(xx, yy, 5, 6);
      }
    }
  }
  winTex = new THREE.CanvasTexture(c);
  winTex.colorSpace = THREE.SRGBColorSpace;
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  winTex.userData.cached = true;
  return winTex;
}

export function cityBackdrop(b: Builder, center: THREE.Vector3, rIn: number, rOut: number, count: number, tint = 0xffffff) {
  const geo = cachedGeo('bldg', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const m = mat('bldgMat' + tint, { color: 0x1a1e28, roughness: 0.6, metalness: 0.4, emissive: tint, emissiveIntensity: 1.3 });
  m.emissiveMap = windowsTexture();
  const items: { pos: THREE.Vector3; scale: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const a = b.rng.range(0, Math.PI * 2);
    const r = b.rng.range(rIn, rOut);
    const w = b.rng.range(8, 18), h = b.rng.range(25, 90), d = b.rng.range(8, 18);
    items.push({ pos: new THREE.Vector3(center.x + Math.cos(a) * r, center.y - 40, center.z + Math.sin(a) * r), scale: new THREE.Vector3(w, h + 40, d) });
  }
  b.instanced(geo, m, items, false);
  // Rooftop beacons
  const beacons = items.filter((_, i) => i % 3 === 0).map((it) => ({ pos: it.pos.clone().setY(it.pos.y + it.scale.y + 1), scale: new THREE.Vector3(0.6, 0.6, 0.6) }));
  b.instanced(cachedGeo('beaconSph', () => new THREE.SphereGeometry(1, 8, 6)), glowMat(0xff3040, 4), beacons, false);
}

export function forest(b: Builder, center: THREE.Vector3, rIn: number, rOut: number, count: number, dark = false, avoid?: (p: THREE.Vector3) => boolean) {
  const trunkGeo = cachedGeo('trunk', () => new THREE.CylinderGeometry(0.18, 0.3, 4, 7).translate(0, 2, 0));
  const leafGeo = cachedGeo('leaves', () => new THREE.ConeGeometry(1.8, 4.5, 8).translate(0, 5.2, 0));
  const leafGeo2 = cachedGeo('leaves2', () => new THREE.ConeGeometry(1.3, 3.4, 8).translate(0, 7, 0));
  const trunks: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const a = b.rng.range(0, Math.PI * 2);
    const r = b.rng.range(rIn, rOut);
    const p = new THREE.Vector3(center.x + Math.cos(a) * r, center.y, center.z + Math.sin(a) * r);
    if (avoid && avoid(p)) continue;
    const s = b.rng.range(0.8, 1.6);
    trunks.push({ pos: p, rot: new THREE.Euler(b.rng.range(-0.05, 0.05), b.rng.range(0, 6), b.rng.range(-0.05, 0.05)), scale: new THREE.Vector3(s, s * b.rng.range(0.9, 1.3), s) });
  }
  const bark = mat('bark' + dark, { tex: 'wood', color: dark ? 0x2a2018 : 0x6a4a30, roughness: 0.95 });
  const leaf = mat('leaf' + dark, { tex: 'grass', color: dark ? 0x1a2a1a : 0x3a7a30, roughness: 0.9 });
  b.instanced(trunkGeo, bark, trunks);
  b.instanced(leafGeo, leaf, trunks);
  b.instanced(leafGeo2, leaf, trunks);
  return trunks.map((t) => t.pos);
}

export function palms(b: Builder, positions: THREE.Vector3[]) {
  const trunkGeo = cachedGeo('palmTrunk', () => {
    const g = new THREE.CylinderGeometry(0.15, 0.28, 6, 7, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.pow((p.getY(i) + 3) / 6, 2) * 0.8);
    g.computeVertexNormals();
    return g.translate(0, 3, 0);
  });
  const frondGeo = cachedGeo('frond', () => {
    const g = new THREE.PlaneGeometry(0.8, 3.2, 1, 4).translate(0, 1.6, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getY(i) / 3.2, 2) * 1.2);
    g.rotateX(-1.1);
    g.computeVertexNormals();
    return g;
  });
  const items = positions.map((p) => ({ pos: p, rot: new THREE.Euler(0, rand(0, 6), 0), scale: new THREE.Vector3(1, rand(0.8, 1.2), 1) }));
  b.instanced(trunkGeo, mat('palmBark', { tex: 'wood', color: 0x8a6a48, roughness: 0.9 }), items);
  const fronds: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];
  for (const it of items) {
    const top = it.pos.clone().add(new THREE.Vector3(0.8 * Math.cos(it.rot.y), 6 * it.scale.y, -0.8 * Math.sin(it.rot.y)));
    for (let k = 0; k < 7; k++) fronds.push({ pos: top, rot: new THREE.Euler(0, (k / 7) * Math.PI * 2, 0, 'YXZ') });
  }
  b.instanced(frondGeo, mat('frond', { color: 0x3a8a30, roughness: 0.8, side: THREE.DoubleSide }), fronds);
}

export function rocks(b: Builder, center: THREE.Vector3, rIn: number, rOut: number, count: number, material = M.rock(), sizeRange: [number, number] = [0.5, 2.2]) {
  const geo = cachedGeo('rockDeco', () => new THREE.DodecahedronGeometry(1, 1));
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = b.rng.range(0, Math.PI * 2);
    const r = b.rng.range(rIn, rOut);
    const s = b.rng.range(sizeRange[0], sizeRange[1]);
    items.push({ pos: new THREE.Vector3(center.x + Math.cos(a) * r, center.y + s * 0.3, center.z + Math.sin(a) * r), rot: new THREE.Euler(rand(0, 3), rand(0, 3), rand(0, 3)), scale: new THREE.Vector3(s, s * rand(0.5, 0.9), s * rand(0.8, 1.2)) });
  }
  b.instanced(geo, material, items);
}

export function grassTufts(b: Builder, center: THREE.Vector3, radius: number, count: number, color = 0x5a9a40, avoid?: (p: THREE.Vector3) => boolean) {
  const geo = cachedGeo('tuft', () => {
    const g = new THREE.ConeGeometry(0.12, 0.6, 3).translate(0, 0.3, 0);
    return g;
  });
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = b.rng.range(0, Math.PI * 2);
    const r = Math.sqrt(b.rng.next()) * radius;
    const p = new THREE.Vector3(center.x + Math.cos(a) * r, center.y, center.z + Math.sin(a) * r);
    if (avoid && avoid(p)) continue;
    items.push({ pos: p, rot: new THREE.Euler(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3)), scale: new THREE.Vector3(1, rand(0.6, 1.4), 1) });
  }
  b.instanced(geo, mat('tuft' + color, { color, roughness: 0.9 }), items, false);
}

/** Animated water surface (vertex waves in the shader). */
export class Water extends Entity {
  private mat: THREE.MeshStandardMaterial;
  private shader: { uniforms: { uTime: { value: number } } } | null = null;
  constructor(private y: number, size: number, color = 0x1a5a8a, private center = new THREE.Vector3()) {
    super();
    this.mat = new THREE.MeshStandardMaterial({ color, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88, envMapIntensity: 1.4 });
    this.mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float w = sin(position.x * 0.15 + uTime * 1.2) * 0.25 + cos(position.y * 0.12 + uTime * 0.9) * 0.25;
         transformed.z += w;`,
      );
      this.shader = sh as unknown as { uniforms: { uTime: { value: number } } };
    };
    const g = new THREE.PlaneGeometry(size, size, 60, 60);
    const m = new THREE.Mesh(g, this.mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    this.obj.add(m);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.set(this.center.x, this.y, this.center.z);
  }
  update() {
    if (this.shader) this.shader.uniforms.uTime.value = this.session.clock;
  }
}

export function columns(b: Builder, positions: THREE.Vector3[], h: number, material: THREE.Material, r = 0.6, glow?: number) {
  const geo = cachedGeo(`col${r}`, () => new THREE.CylinderGeometry(r, r * 1.1, 1, 16).translate(0, 0.5, 0));
  b.instanced(geo, material, positions.map((p) => ({ pos: p, scale: new THREE.Vector3(1, h, 1) })));
  const capGeo = cachedGeo(`colCap${r}`, () => new THREE.BoxGeometry(r * 2.6, 0.4, r * 2.6));
  b.instanced(capGeo, material, positions.map((p) => ({ pos: p.clone().setY(p.y + h), scale: new THREE.Vector3(1, 1, 1) })));
  b.instanced(capGeo, material, positions.map((p) => ({ pos: p.clone().setY(p.y + 0.2), scale: new THREE.Vector3(1, 1, 1) })));
  if (glow !== undefined) {
    const ringGeo = cachedGeo(`colRing${r}`, () => new THREE.TorusGeometry(r * 1.05, 0.05, 6, 24).rotateX(Math.PI / 2));
    b.instanced(ringGeo, glowMat(glow, 3), positions.flatMap((p) => [0.3, 0.6].map((k) => ({ pos: p.clone().setY(p.y + h * k), scale: new THREE.Vector3(1, 1, 1) }))), false);
  }
  for (const p of positions) b.invisible(p.clone().setY(p.y + h / 2), new THREE.Vector3(r * 2, h, r * 2), 'column');
}

/** Ring of stands with an animated crowd. */
export class Crowd extends Entity {
  private mesh!: THREE.InstancedMesh;
  private base: THREE.Vector3[] = [];
  private t = 0;
  constructor(private b: Builder, private radius: number, private rows = 5, private y = 0) {
    super();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    const b = this.b;
    const stand = mat('stand', { tex: 'concrete', color: 0x8a7a68, roughness: 0.9 });
    for (let r = 0; r < this.rows; r++) {
      const rad = this.radius + r * 1.6;
      const geo = new THREE.CylinderGeometry(rad + 1.6, rad + 1.6, 0.8, 48, 1, true);
      const m = new THREE.Mesh(geo, stand);
      m.position.y = this.y + r * 1.1 + 0.4;
      this.obj.add(m);
      const top = new THREE.Mesh(new THREE.RingGeometry(rad, rad + 1.6, 48).rotateX(-Math.PI / 2), stand);
      top.position.y = this.y + r * 1.1 + 0.8;
      top.receiveShadow = true;
      this.obj.add(top);
      const n = Math.floor((rad * Math.PI * 2) / 1.1);
      for (let i = 0; i < n; i++) {
        if (b.rng.chance(0.25)) continue;
        const a = (i / n) * Math.PI * 2;
        this.base.push(new THREE.Vector3(Math.cos(a) * (rad + 0.8), this.y + r * 1.1 + 0.8, Math.sin(a) * (rad + 0.8)));
      }
    }
    const geo = cachedGeo('crowdPerson', () => new THREE.CapsuleGeometry(0.22, 0.5, 3, 6).translate(0, 0.5, 0));
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), this.base.length);
    const c = new THREE.Color();
    for (let i = 0; i < this.base.length; i++) this.mesh.setColorAt(i, c.setHSL(rand(0, 1), 0.5, rand(0.3, 0.6)));
    this.obj.add(this.mesh);
    this.update(0);
  }
  /** Excitement 0..1 (bounce amplitude). */
  hype = 0.3;
  update(dt: number) {
    this.t += dt;
    if (dt > 0 && Math.floor(this.t * 12) === Math.floor((this.t - dt) * 12)) return; // 12 Hz update
    const m = new THREE.Matrix4();
    for (let i = 0; i < this.base.length; i++) {
      const p = this.base[i];
      const j = Math.max(0, Math.sin(this.t * 8 + i * 1.7)) * 0.25 * this.hype;
      m.makeTranslation(p.x, p.y + j, p.z);
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Swaying foliage/flags helper: rotates a set of objects gently (wind). */
export class Sway extends Entity {
  constructor(private objs: THREE.Object3D[], private amount = 0.05, private speed = 1.5) {
    super();
  }
  init(s: Session) {
    this.session = s;
  }
  update() {
    const t = this.session.clock;
    this.objs.forEach((o, i) => {
      o.rotation.z = Math.sin(t * this.speed + i) * this.amount;
    });
  }
}
