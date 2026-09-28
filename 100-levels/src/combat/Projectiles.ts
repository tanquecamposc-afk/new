/**
 * Pooled projectile system: arrows (with gravity), magic bolts, orbs (homing),
 * thrown stones (noise), rocks/meteors (explosive), turret bullets, ice spikes.
 */
import * as THREE from 'three';
import { Entity, Element } from '../entities/Entity';
import { cachedGeo, glowMat } from '../gfx/Materials';
import { Preset } from '../gfx/Particles';
import { Audio } from '../audio/AudioManager';
import { distPointSegment } from '../core/math';
import type { Session } from '../levels/Session';

export type ProjKind = 'arrow' | 'bolt' | 'orb' | 'stone' | 'rock' | 'bullet' | 'meteor' | 'spike' | 'feather';

export interface ProjOpts {
  kind: ProjKind;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  team: 'player' | 'enemy';
  damage: number;
  radius?: number;
  gravity?: number;
  life?: number;
  color?: number;
  element?: Element;
  homing?: number;
  target?: () => THREE.Vector3 | null;
  explode?: { radius: number; damage: number };
  knockback?: number;
  pierce?: number;
  scale?: number;
  trail?: Preset;
  onImpact?: (pos: THREE.Vector3, hitSomething: boolean) => void;
  /** Ignore level geometry (e.g. boss orbs that pass through pillars). */
  ghost?: boolean;
}

interface Proj extends ProjOpts {
  mesh: THREE.Object3D;
  age: number;
  alive: boolean;
  hitSet: Set<unknown>;
  trailT: number;
}

function makeMesh(kind: ProjKind, color: number): THREE.Object3D {
  switch (kind) {
    case 'arrow': {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(cachedGeo('arrowShaft', () => new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0x8a5a30 }));
      const head = new THREE.Mesh(cachedGeo('arrowHead', () => new THREE.ConeGeometry(0.04, 0.12, 6).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 1, roughness: 0.3 }));
      head.position.z = 0.45;
      const glow = new THREE.Mesh(cachedGeo('arrowGlow', () => new THREE.SphereGeometry(0.05, 6, 4)), glowMat(color, 3));
      glow.position.z = 0.42;
      g.add(shaft, head, glow);
      return g;
    }
    case 'bolt':
      return new THREE.Mesh(cachedGeo('bolt', () => new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1, 2.2)), glowMat(color, 4));
    case 'orb': {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(cachedGeo('orb', () => new THREE.IcosahedronGeometry(0.3, 1)), glowMat(color, 3)));
      g.add(new THREE.Mesh(cachedGeo('orbHalo', () => new THREE.SphereGeometry(0.5, 12, 8)), glowMat(color, 1, 0.25, true)));
      return g;
    }
    case 'stone':
      return new THREE.Mesh(cachedGeo('stone', () => new THREE.DodecahedronGeometry(0.1, 0)), new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 1 }));
    case 'rock': {
      const m = new THREE.Mesh(cachedGeo('rockP', () => new THREE.DodecahedronGeometry(0.6, 0)), new THREE.MeshStandardMaterial({ color: 0x5a4a40, roughness: 1, flatShading: true }));
      m.castShadow = true;
      return m;
    }
    case 'meteor': {
      const g = new THREE.Group();
      const r = new THREE.Mesh(cachedGeo('meteor', () => new THREE.DodecahedronGeometry(1, 1)), new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff4000, emissiveIntensity: 1.5, roughness: 1, flatShading: true }));
      r.castShadow = true;
      g.add(r);
      g.add(new THREE.Mesh(cachedGeo('meteorHalo', () => new THREE.SphereGeometry(1.5, 12, 8)), glowMat(0xff6020, 1.5, 0.35, true)));
      return g;
    }
    case 'bullet':
      return new THREE.Mesh(cachedGeo('bullet', () => new THREE.SphereGeometry(0.12, 8, 6).scale(1, 1, 2.5)), glowMat(color, 4));
    case 'spike':
      return new THREE.Mesh(cachedGeo('spikeP', () => new THREE.ConeGeometry(0.15, 0.9, 6).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0xc0f0ff, emissive: 0x60c0ff, emissiveIntensity: 1, roughness: 0.1, metalness: 0.2 }));
    case 'feather':
      return new THREE.Mesh(cachedGeo('featherP', () => new THREE.ConeGeometry(0.08, 0.7, 4).rotateX(Math.PI / 2)), glowMat(color, 2.5));
  }
}

export class Projectiles extends Entity {
  private list: Proj[] = [];
  private pool = new Map<string, THREE.Object3D[]>();

  init(s: Session) {
    this.session = s;
    s.scene.add(this.obj);
  }

  spawn(o: ProjOpts) {
    const color = o.color ?? 0xffffff;
    const key = o.kind + color;
    let mesh = this.pool.get(key)?.pop();
    if (!mesh) {
      mesh = makeMesh(o.kind, color);
      mesh.userData.poolKey = key;
    }
    mesh.visible = true;
    mesh.scale.setScalar(o.scale ?? 1);
    mesh.position.copy(o.pos);
    this.obj.add(mesh);
    const p: Proj = { radius: 0.25, gravity: 0, life: 4, knockback: 3, pierce: 0, ...o, pos: o.pos.clone(), vel: o.vel.clone(), mesh, age: 0, alive: true, hitSet: new Set(), trailT: 0 };
    this.list.push(p);
    return p;
  }

  private impact(p: Proj, hitSomething: boolean) {
    const s = this.session;
    p.alive = false;
    if (p.explode) {
      s.explode(p.pos, p.explode.radius, p.explode.damage, p.team, p.element ?? 'fire');
    } else {
      const preset: Preset = p.element === 'ice' ? 'ice' : p.element === 'electric' ? 'electric' : p.element === 'fire' ? 'fire' : p.element === 'shadow' || p.element === 'void' ? 'shadow' : p.kind === 'stone' || p.kind === 'rock' ? 'debris' : 'sparks';
      s.particles.emit(preset, p.pos, { count: 10 });
    }
    p.onImpact?.(p.pos.clone(), hitSomething);
  }

  update(dt: number) {
    const s = this.session;
    const player = s.player;
    const next = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (const p of this.list) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age > p.life!) {
        this.impact(p, false);
        continue;
      }
      // Homing
      if (p.homing && p.target) {
        const t = p.target();
        if (t) {
          const want = t.clone().sub(p.pos).normalize().multiplyScalar(p.vel.length());
          p.vel.lerp(want, Math.min(1, p.homing * dt));
        }
      }
      p.vel.y += (p.gravity ?? 0) * dt;
      next.copy(p.pos).addScaledVector(p.vel, dt);
      dir.subVectors(next, p.pos);
      const len = dir.length();
      let stop = false;
      // Level geometry
      if (!p.ghost && len > 0) {
        dir.divideScalar(len);
        const hit = s.physics.raycast(p.pos, dir, len + p.radius!, (c) => c.solid !== false);
        if (hit) {
          next.copy(hit.point);
          stop = true;
        }
      }
      // Targets
      if (p.team === 'player') {
        for (const d of s.damageables) {
          if (!d.alive || p.hitSet.has(d)) continue;
          const dist = distPointSegment(d.center, p.pos, next);
          if (dist < d.radius + p.radius! || (Math.abs(d.center.y - next.y) < d.halfHeight && Math.hypot(d.center.x - next.x, d.center.z - next.z) < d.radius + p.radius!)) {
            p.hitSet.add(d);
            const kd = p.vel.clone().setY(0).normalize();
            d.takeDamage({ amount: p.damage, dir: kd, knockback: p.knockback!, source: 'player', element: p.element, ranged: true, point: next.clone() });
            s.registerHit();
            if (p.pierce! > 0) p.pierce!--;
            else {
              stop = true;
              break;
            }
          }
        }
      } else if (!player.dead) {
        const pc = player.center;
        const segA = pc.clone().setY(player.pos.y + 0.3), segB = pc.clone().setY(player.pos.y + player.half.y * 2 - 0.2);
        // distance between projectile path and player capsule (sampled)
        let hitP = false;
        for (let k = 0; k <= 2; k++) {
          const q = p.pos.clone().lerp(next, k / 2);
          if (distPointSegment(q, segA, segB) < p.radius! + 0.35) {
            hitP = true;
            break;
          }
        }
        if (hitP && !player.hidden) {
          if (player.damage(p.damage, p.pos, p.knockback)) {
            s.particles.emit('hit', player.center);
          }
          stop = true;
        }
      }
      p.pos.copy(next);
      p.mesh.position.copy(p.pos);
      if (p.vel.lengthSq() > 0.01 && p.kind !== 'orb' && p.kind !== 'meteor') p.mesh.lookAt(p.pos.clone().add(p.vel));
      else p.mesh.rotation.y += dt * 4;
      // Trails
      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.03;
        if (p.trail) s.particles.emit(p.trail, p.pos, { count: 1, velSpread: 0.2, up: 0 });
        else if (p.kind === 'meteor') {
          s.particles.emit('fire', p.pos, { count: 3, size: [2, 0.2], velSpread: 1 });
          s.particles.emit('smoke', p.pos, { count: 1, size: [2, 4] });
        }
      }
      if (stop) this.impact(p, true);
    }
    // Recycle
    if (this.list.some((p) => !p.alive)) {
      this.list = this.list.filter((p) => {
        if (p.alive) return true;
        p.mesh.visible = false;
        this.obj.remove(p.mesh);
        const key = p.mesh.userData.poolKey as string;
        if (!this.pool.has(key)) this.pool.set(key, []);
        this.pool.get(key)!.push(p.mesh);
        return false;
      });
    }
  }

  clear() {
    for (const p of this.list) p.alive = false;
  }

  get count() {
    return this.list.length;
  }

  /** Play launch sound for a projectile kind. */
  static launchSound(kind: ProjKind, pos?: THREE.Vector3) {
    const name = kind === 'arrow' ? 'arrow' : kind === 'bolt' ? 'zap' : kind === 'orb' ? 'magic' : kind === 'bullet' ? 'shoot' : kind === 'meteor' ? 'whoosh' : 'whoosh';
    Audio.play(name, { pos, throttle: 0.06 });
  }
}
