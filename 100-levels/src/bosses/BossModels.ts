/**
 * Procedural boss models: giant humanoids (animated with the shared Animator),
 * mechs, floating orb constructs, a storm bird and a segmented serpent.
 */
import * as THREE from 'three';
import { CharacterModel, makeUniqueMaterials } from '../player/CharacterModel';
import { Animator } from '../player/Animator';
import { buildWeapon } from '../combat/Weapons';
import { boxGeo, cachedGeo, glowMat, M } from '../gfx/Materials';
import { Preset } from '../gfx/Particles';
import { rand } from '../core/math';
import type { Session } from '../levels/Session';
import type { Boss } from './Boss';

export interface BossModel {
  root: THREE.Group;
  update(dt: number, b: Boss): void;
  action?(name: string): void;
  flash?(): void;
  dispose?(): void;
  /** World position of a named point (eye, hand, mouth). */
  anchor?(name: string): THREE.Vector3;
}

export interface HumanoidOpts {
  weapon?: string;
  aura?: Preset;
  auraColor?: number;
  wings?: number;
  halo?: number;
  crownGlow?: number;
  extraArms?: boolean;
}

export function humanoidBoss(s: Session, skin: string, scale: number, o: HumanoidOpts = {}): BossModel {
  const cm = new CharacterModel(skin, scale);
  const disposeMats = makeUniqueMaterials(cm);
  const anim = new Animator(cm);
  anim.smoothing = 12;
  if (o.weapon) {
    const w = buildWeapon(o.weapon);
    cm.setWeapon(w.right, w.left);
  }
  const root = new THREE.Group();
  root.add(cm.root);
  const extras: THREE.Object3D[] = [];
  if (o.wings !== undefined) {
    const wingGeo = cachedGeo('bossWing', () => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(0.9, 0.6, 1.6, 0.9);
      sh.lineTo(1.3, 0.3);
      sh.lineTo(1.5, -0.1);
      sh.lineTo(1.1, -0.2);
      sh.lineTo(1.2, -0.6);
      sh.quadraticCurveTo(0.5, -0.4, 0, 0);
      return new THREE.ShapeGeometry(sh);
    });
    const wm = new THREE.MeshStandardMaterial({ color: o.wings, side: THREE.DoubleSide, roughness: 0.6, emissive: o.wings, emissiveIntensity: 0.3 });
    for (const side of [1, -1]) {
      const w = new THREE.Mesh(wingGeo, wm);
      w.scale.set(side, 1, 1);
      w.position.set(side * 0.1, 0.2, -0.15);
      cm.joints.chest.add(w);
      extras.push(w);
    }
  }
  if (o.halo !== undefined) {
    const h = new THREE.Mesh(cachedGeo('halo', () => new THREE.TorusGeometry(0.35, 0.025, 8, 40)), glowMat(o.halo, 4));
    h.position.set(0, 0.55, -0.1);
    h.rotation.x = Math.PI / 2 - 0.3;
    cm.joints.head.add(h);
    extras.push(h);
  }
  let prev = new THREE.Vector3();
  let auraT = 0;
  return {
    root,
    update(dt, b) {
      const sp = prev.distanceTo(b.pos) / Math.max(dt, 1e-4);
      prev = b.pos.clone();
      anim.update(dt, { speed: Math.min(12, sp) / scale, grounded: true, vy: 0, crouch: false, sprint: sp > 8, stride: 1 });
      cm.updateCloth(s.clock, sp, 0);
      extras.forEach((e, i) => {
        if (o.wings !== undefined && i < 2) e.rotation.y = (i === 0 ? 1 : -1) * (0.3 + Math.sin(s.clock * 3) * 0.25);
      });
      if (o.aura) {
        auraT -= dt;
        if (auraT <= 0) {
          auraT = 0.03;
          const p = b.center.clone().add(new THREE.Vector3(rand(-0.4, 0.4) * scale, rand(-0.8, 0.9) * scale, rand(-0.4, 0.4) * scale));
          s.particles.emit(o.aura, p, { count: 1, color: o.auraColor, size: [0.25 * scale, 0.05] });
        }
      }
    },
    action(name) {
      if (name === 'death') anim.play('death', 0.6);
      else anim.play(name, 1);
    },
    flash() {
      cm.flash(0.1);
    },
    dispose() {
      disposeMats();
    },
    anchor(name) {
      const v = new THREE.Vector3();
      if (name === 'handR') return cm.weaponR.getWorldPosition(v);
      if (name === 'handL') return cm.weaponL.getWorldPosition(v);
      return cm.joints.head.getWorldPosition(v);
    },
  };
}

/** Giant mech (Guardian / Destroyer). */
export function mechBoss(s: Session, scale: number, color: number, eyeColor: number): BossModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.3 });
  const dark = M.darkMetal();
  const glow = glowMat(eyeColor, 4);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const hips = new THREE.Group();
  hips.position.y = 1.6 * scale;
  body.add(hips);
  add(boxGeo(1.4 * scale, 0.6 * scale, 1 * scale), dark, hips, 0, 0, 0);
  const torso = new THREE.Group();
  torso.position.y = 0.4 * scale;
  hips.add(torso);
  add(boxGeo(2.2 * scale, 1.5 * scale, 1.4 * scale), metal, torso, 0, 0.8 * scale, 0);
  add(boxGeo(1.2 * scale, 0.5 * scale, 0.1 * scale), glow, torso, 0, 0.9 * scale, 0.72 * scale);
  const head = new THREE.Group();
  head.position.y = 1.75 * scale;
  torso.add(head);
  add(boxGeo(0.9 * scale, 0.7 * scale, 0.9 * scale), metal, head, 0, 0.3 * scale, 0);
  const eye = add(boxGeo(0.6 * scale, 0.14 * scale, 0.05 * scale), glow, head, 0, 0.35 * scale, 0.46 * scale);
  const arms: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const sh = new THREE.Group();
    sh.position.set(side * 1.35 * scale, 1.3 * scale, 0);
    torso.add(sh);
    add(boxGeo(0.8 * scale, 0.8 * scale, 0.9 * scale), dark, sh, 0, 0, 0);
    add(boxGeo(0.55 * scale, 1.2 * scale, 0.55 * scale), metal, sh, 0, -0.8 * scale, 0);
    const fore = new THREE.Group();
    fore.position.y = -1.4 * scale;
    sh.add(fore);
    add(boxGeo(0.7 * scale, 1.1 * scale, 0.7 * scale), metal, fore, 0, -0.5 * scale, 0);
    add(boxGeo(0.9 * scale, 0.6 * scale, 0.9 * scale), dark, fore, 0, -1.2 * scale, 0);
    add(boxGeo(0.72 * scale, 0.08 * scale, 0.72 * scale), glow, fore, 0, -0.2 * scale, 0);
    arms.push(sh);
  }
  const legs: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const th = new THREE.Group();
    th.position.set(side * 0.55 * scale, 0, 0);
    hips.add(th);
    add(boxGeo(0.6 * scale, 0.9 * scale, 0.7 * scale), metal, th, 0, -0.45 * scale, 0);
    add(boxGeo(0.7 * scale, 0.8 * scale, 0.8 * scale), dark, th, 0, -1.2 * scale, 0);
    add(boxGeo(0.8 * scale, 0.2 * scale, 1.1 * scale), metal, th, 0, -1.55 * scale, 0.15 * scale);
    legs.push(th);
  }
  let phase = 0;
  let act = '';
  let actT = 0;
  let prev = new THREE.Vector3();
  const mats = [metal];
  let flashT = 0;
  return {
    root,
    update(dt, b) {
      const sp = prev.distanceTo(b.pos) / Math.max(dt, 1e-4);
      prev = b.pos.clone();
      phase += Math.min(sp, 10) * dt * 0.6 / scale;
      legs[0].rotation.x = Math.sin(phase) * 0.4 * Math.min(1, sp / 2);
      legs[1].rotation.x = -Math.sin(phase) * 0.4 * Math.min(1, sp / 2);
      hips.position.y = 1.6 * scale + Math.abs(Math.cos(phase)) * 0.08 * scale * Math.min(1, sp / 2);
      actT += dt;
      let ax = [Math.sin(phase) * 0.2, -Math.sin(phase) * 0.2];
      let tr = 0;
      if (act === 'punch') {
        const k = Math.min(1, actT / 0.35);
        ax = [-1.6 * Math.sin(k * Math.PI), 0];
        tr = -0.3 * Math.sin(k * Math.PI);
        if (actT > 0.7) act = '';
      } else if (act === 'slam') {
        const k = Math.min(1, actT / 0.9);
        const up = k < 0.6 ? k / 0.6 : 1 - (k - 0.6) / 0.4;
        ax = [-3 * up, -3 * up];
        tr = k > 0.6 ? 0.4 : -0.2 * up;
        if (actT > 1.2) act = '';
      } else if (act === 'roar') {
        ax = [-0.6, -0.6];
        tr = -0.3;
        arms[0].rotation.z = 0.8;
        arms[1].rotation.z = -0.8;
        if (actT > 1.5) {
          act = '';
          arms[0].rotation.z = arms[1].rotation.z = 0;
        }
      } else if (act === 'death') {
        body.rotation.x = Math.min(1.4, actT * 0.8);
        root.position.y -= dt * 0.5;
      }
      arms[0].rotation.x += (ax[0] - arms[0].rotation.x) * Math.min(1, dt * 12);
      arms[1].rotation.x += (ax[1] - arms[1].rotation.x) * Math.min(1, dt * 12);
      torso.rotation.x += (tr - torso.rotation.x) * Math.min(1, dt * 8);
      eye.scale.x = 1 + Math.sin(s.clock * 8) * 0.1;
      if (flashT > 0) {
        flashT -= dt;
        mats.forEach((m) => m.emissive.setScalar(flashT > 0 ? 0.8 : 0));
      }
      if (Math.random() < 0.1) s.particles.emit('sparks', b.center.clone().add(new THREE.Vector3(rand(-1, 1) * scale, rand(-1, 1) * scale, 0)), { count: 1 });
    },
    action(n) {
      act = n;
      actT = 0;
    },
    flash() {
      flashT = 0.1;
    },
    dispose() {
      metal.dispose();
    },
    anchor(name) {
      const v = new THREE.Vector3();
      if (name === 'handR') return arms[1].children[3].getWorldPosition(v);
      if (name === 'handL') return arms[0].children[3].getWorldPosition(v);
      return eye.getWorldPosition(v);
    },
  };
}

/** Floating orb construct (The Master / Voltara / chaos cores). */
export function orbBoss(s: Session, color: number, size: number, satellites = 3, ringColor = color): BossModel {
  const root = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x101018, emissive: color, emissiveIntensity: 2, metalness: 0.8, roughness: 0.2 });
  const core = new THREE.Mesh(cachedGeo('orbCore', () => new THREE.IcosahedronGeometry(1, 2)), coreMat);
  core.scale.setScalar(size);
  core.position.y = size * 1.4;
  core.castShadow = true;
  const shell = new THREE.Mesh(cachedGeo('orbShell', () => new THREE.IcosahedronGeometry(1, 1)), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.4 }));
  shell.scale.setScalar(size * 1.35);
  shell.position.copy(core.position);
  const rings = [0, 1, 2].map((i) => {
    const r = new THREE.Mesh(cachedGeo('orbRing', () => new THREE.TorusGeometry(1, 0.03, 8, 64)), glowMat(ringColor, 3));
    r.scale.setScalar(size * (1.8 + i * 0.35));
    r.position.copy(core.position);
    root.add(r);
    return r;
  });
  const sats = Array.from({ length: satellites }, () => {
    const m = new THREE.Mesh(cachedGeo('orbSat', () => new THREE.OctahedronGeometry(0.4, 0)), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 }));
    m.scale.setScalar(size * 0.6);
    root.add(m);
    return m;
  });
  const eye = new THREE.Mesh(cachedGeo('orbEye', () => new THREE.SphereGeometry(0.3, 12, 8)), glowMat(0xffffff, 5));
  eye.scale.setScalar(size);
  eye.position.set(0, core.position.y, size * 0.9);
  root.add(core, shell, eye);
  let flashT = 0;
  let dying = 0;
  return {
    root,
    update(dt, b) {
      const t = s.clock;
      core.rotation.y += dt * 0.5;
      shell.rotation.y -= dt * 0.3;
      shell.rotation.x += dt * 0.2;
      rings.forEach((r, i) => {
        r.rotation.x = t * (0.5 + i * 0.3);
        r.rotation.y = t * (0.3 + i * 0.2);
      });
      sats.forEach((m, i) => {
        const a = t * 1.2 + (i / sats.length) * Math.PI * 2;
        m.position.set(Math.cos(a) * size * 2.6, core.position.y + Math.sin(t * 2 + i) * size * 0.6, Math.sin(a) * size * 2.6);
        m.rotation.y += dt * 3;
      });
      coreMat.emissiveIntensity = (b.vulnerable ? 4 : 2) + Math.sin(t * 5) * 0.5 + (flashT > 0 ? 4 : 0);
      (shell.material as THREE.MeshBasicMaterial).opacity = b.def.shielded && !b.vulnerable ? 0.6 : 0.15;
      flashT -= dt;
      if (dying > 0) {
        dying += dt;
        root.scale.setScalar(Math.max(0.01, 1 + dying * 0.5));
      }
      if (Math.random() < 0.3) s.particles.emit('magic', core.getWorldPosition(new THREE.Vector3()), { count: 1, color, velSpread: size * 2 });
    },
    action(n) {
      if (n === 'death') dying = 0.01;
    },
    flash() {
      flashT = 0.1;
    },
    anchor() {
      return eye.getWorldPosition(new THREE.Vector3());
    },
  };
}

/** Storm bird. */
export function birdBoss(s: Session, color: number, size: number): BossModel {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, emissive: 0x203040, emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(cachedGeo('birdBody', () => new THREE.CapsuleGeometry(0.6, 1.6, 6, 12).rotateX(Math.PI / 2)), mat);
  body.scale.setScalar(size);
  body.position.y = size * 1.5;
  body.castShadow = true;
  const head = new THREE.Mesh(cachedGeo('birdHead', () => new THREE.SphereGeometry(0.5, 12, 10)), mat);
  head.scale.setScalar(size);
  head.position.set(0, size * 1.9, size * 1.3);
  const beak = new THREE.Mesh(cachedGeo('birdBeak', () => new THREE.ConeGeometry(0.18, 0.7, 6).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0xffc040, metalness: 0.6, roughness: 0.3 }));
  beak.scale.setScalar(size);
  beak.position.set(0, size * 1.85, size * 1.85);
  const eyes = [1, -1].map((x) => {
    const e = new THREE.Mesh(cachedGeo('birdEye', () => new THREE.SphereGeometry(0.08, 8, 6)), glowMat(0x80e0ff, 5));
    e.scale.setScalar(size);
    e.position.set(x * size * 0.25, size * 2.05, size * 1.7);
    return e;
  });
  const wingGeo = cachedGeo('birdWing', () => {
    const g = new THREE.PlaneGeometry(3.2, 1.4, 6, 2).translate(1.6, 0, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - Math.pow(p.getX(i) / 3.2, 2) * 0.4);
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const wm = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7, emissive: 0x4080c0, emissiveIntensity: 0.25 });
  const wings = [1, -1].map((side) => {
    const w = new THREE.Mesh(wingGeo, wm);
    w.scale.set(side * size, size, size);
    w.position.set(side * size * 0.4, size * 1.7, 0);
    w.castShadow = true;
    return w;
  });
  const tail = new THREE.Mesh(cachedGeo('birdTail', () => new THREE.ConeGeometry(0.6, 1.8, 4).rotateX(-Math.PI / 2)), wm);
  tail.scale.setScalar(size);
  tail.position.set(0, size * 1.5, -size * 1.8);
  root.add(body, head, beak, tail, ...eyes, ...wings);
  let flap = 0;
  let flashT = 0;
  return {
    root,
    update(dt, b) {
      flap += dt * (b.vulnerable ? 2 : 7);
      wings[0].rotation.z = Math.sin(flap) * 0.6;
      wings[1].rotation.z = -Math.sin(flap) * 0.6;
      body.rotation.x = b.moveTarget ? 0.3 : 0;
      flashT -= dt;
      mat.emissiveIntensity = flashT > 0 ? 3 : 0.4;
      if (Math.random() < 0.2) s.particles.emit('electric', wings[Math.random() < 0.5 ? 0 : 1].getWorldPosition(new THREE.Vector3()), { count: 1 });
    },
    flash() {
      flashT = 0.1;
    },
    anchor() {
      return beak.getWorldPosition(new THREE.Vector3());
    },
  };
}

/** Segmented serpent; the body follows the head's trail. */
export function serpentBoss(s: Session, color: number, segments = 14, size = 1.2): BossModel {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3, emissive: 0x104020, emissiveIntensity: 0.4 });
  const scaleMat = new THREE.MeshStandardMaterial({ color: 0xd0c060, roughness: 0.3, metalness: 0.6 });
  const head = new THREE.Group();
  const skull = new THREE.Mesh(cachedGeo('serpHead', () => new THREE.SphereGeometry(1, 16, 12).scale(0.9, 0.7, 1.4)), mat);
  skull.castShadow = true;
  const jaw = new THREE.Mesh(cachedGeo('serpJaw', () => new THREE.ConeGeometry(0.6, 1.2, 8).rotateX(Math.PI / 2)), mat);
  jaw.position.set(0, -0.3, 1);
  const eyes = [1, -1].map((x) => {
    const e = new THREE.Mesh(cachedGeo('serpEye', () => new THREE.SphereGeometry(0.15, 8, 6)), glowMat(0xffe040, 5));
    e.position.set(x * 0.55, 0.3, 0.8);
    return e;
  });
  const hornGeo = cachedGeo('serpHorn', () => new THREE.ConeGeometry(0.12, 0.8, 6).rotateX(-0.8));
  const horns = [1, -1].map((x) => {
    const h = new THREE.Mesh(hornGeo, scaleMat);
    h.position.set(x * 0.5, 0.6, -0.3);
    return h;
  });
  head.add(skull, jaw, ...eyes, ...horns);
  head.scale.setScalar(size);
  root.add(head);
  const segs: THREE.Mesh[] = [];
  for (let i = 0; i < segments; i++) {
    const r = size * (0.95 - (i / segments) * 0.6);
    const m = new THREE.Mesh(cachedGeo('serpSeg', () => new THREE.SphereGeometry(1, 12, 10)), i % 2 ? mat : scaleMat);
    m.scale.set(r, r * 0.9, r * 1.2);
    m.castShadow = true;
    segs.push(m);
    s.scene.add(m);
  }
  const trail: THREE.Vector3[] = [];
  let flashT = 0;
  return {
    root,
    update(dt, b) {
      // Head follows boss position; y handled by boss (burrowing)
      head.position.set(0, size * 1.1, 0);
      const hp = head.getWorldPosition(new THREE.Vector3());
      if (!trail.length || trail[0].distanceTo(hp) > 0.25) trail.unshift(hp);
      if (trail.length > segments * 6) trail.pop();
      segs.forEach((m, i) => {
        const p = trail[Math.min(trail.length - 1, (i + 1) * 5)] ?? hp;
        m.position.lerp(p, Math.min(1, dt * 12));
        m.position.y += Math.sin(s.clock * 4 + i) * 0.02;
      });
      jaw.rotation.x = Math.max(0, Math.sin(s.clock * 3)) * 0.3;
      flashT -= dt;
      mat.emissiveIntensity = flashT > 0 ? 3 : 0.4;
      void b;
    },
    flash() {
      flashT = 0.1;
    },
    dispose() {
      segs.forEach((m) => m.removeFromParent());
      mat.dispose();
      scaleMat.dispose();
    },
    anchor() {
      return jaw.getWorldPosition(new THREE.Vector3());
    },
  };
}
