/**
 * Hazards used across worlds and by bosses: lasers, spinning beams, spikes,
 * lava / kill zones, wind & gravity zones, telegraphed ground strikes,
 * shockwave rings, sweeping beams, meteors, tornadoes and fire pillars.
 */
import * as THREE from 'three';
import { Entity, Element } from './Entity';
import { boxGeo, cachedGeo, glowMat, M } from '../gfx/Materials';
import { distPointSegment, rand } from '../core/math';
import { Audio } from '../audio/AudioManager';
import { playerOverlaps } from './Platforms';
import type { Session } from '../levels/Session';

const beamGeo = () => cachedGeo('beamCyl', () => new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5));

/** Player capsule vs segment test. */
export function playerHitsSegment(s: Session, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const p = s.player;
  if (p.dead || p.hidden) return false;
  for (const h of [0.3, 0.9, 1.5]) {
    const q = new THREE.Vector3(p.pos.x, p.pos.y + Math.min(h, p.half.y * 2 - 0.1), p.pos.z);
    if (distPointSegment(q, a, b) < radius + p.half.x) return true;
  }
  return false;
}

/** Laser beam between two points; can sweep (offset oscillation) and blink. */
export class Laser extends Entity {
  private beam: THREE.Mesh;
  private glow: THREE.Mesh;
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  on = true;
  private t: number;
  constructor(
    private a0: THREE.Vector3,
    private b0: THREE.Vector3,
    private opts: { sweep?: THREE.Vector3; sweepSpeed?: number; blink?: [number, number]; color?: number; damage?: number; phase?: number } = {},
  ) {
    super();
    const c = opts.color ?? 0xff2030;
    this.beam = new THREE.Mesh(beamGeo(), glowMat(c, 5));
    this.glow = new THREE.Mesh(beamGeo(), glowMat(c, 1.5, 0.25, true));
    this.obj.add(this.beam, this.glow);
    this.t = (opts.phase ?? 0) * 10;
    // Emitters at both ends
    const em = new THREE.Mesh(boxGeo(0.35, 0.35, 0.35), M.darkMetal());
    const em2 = em.clone();
    em.userData.end = 'a';
    em2.userData.end = 'b';
    this.obj.add(em, em2);
  }
  init(s: Session) {
    s.scene.add(this.obj);
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    const o = this.opts;
    const off = o.sweep ? o.sweep.clone().multiplyScalar(Math.sin(this.t * (o.sweepSpeed ?? 1))) : new THREE.Vector3();
    this.a.copy(this.a0).add(off);
    this.b.copy(this.b0).add(off);
    if (o.blink) {
      const cyc = o.blink[0] + o.blink[1];
      const k = this.t % cyc;
      this.on = k < o.blink[0];
      // Warning flicker before turning on
      const warn = !this.on && k > cyc - 0.5;
      this.beam.visible = this.on || (warn && Math.sin(this.t * 60) > 0);
      this.glow.visible = this.on;
      this.beam.scale.x = this.beam.scale.y = warn ? 0.01 : 0.05;
    }
    const len = this.a.distanceTo(this.b);
    for (const m of [this.beam, this.glow]) {
      m.position.copy(this.a);
      m.lookAt(this.b);
      m.scale.z = len;
    }
    if (this.on) {
      this.beam.scale.x = this.beam.scale.y = 0.05 + Math.sin(this.t * 40) * 0.01;
      this.glow.scale.x = this.glow.scale.y = 0.18;
    }
    for (const c of this.obj.children) {
      if (c.userData.end === 'a') c.position.copy(this.a).addScaledVector(this.b.clone().sub(this.a).normalize(), -0.15);
      if (c.userData.end === 'b') c.position.copy(this.b).addScaledVector(this.a.clone().sub(this.b).normalize(), -0.15);
    }
    if (this.on && playerHitsSegment(s, this.a, this.b, 0.08)) {
      const mid = s.player.center;
      if (s.player.damage(o.damage ?? 25, mid.clone().add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1))), 7)) {
        s.particles.emit('sparks', mid, { count: 16 });
        Audio.play('laser');
      }
    }
  }
}

/** Rotating beam arm around a pivot — jump over or duck under it. */
export class SpinBeam extends Entity {
  private arm: THREE.Group;
  private angle: number;
  constructor(private pivot: THREE.Vector3, private length: number, private speed: number, private height = 0.6, private damage = 25, phase = 0, color = 0xff6020) {
    super();
    this.angle = phase;
    this.arm = new THREE.Group();
    const bar = new THREE.Mesh(boxGeo(length * 2, 0.3, 0.3), M.darkMetal());
    bar.castShadow = true;
    const stripe = new THREE.Mesh(boxGeo(length * 2 + 0.02, 0.1, 0.32), glowMat(color, 2.5));
    this.arm.add(bar, stripe);
    const hub = new THREE.Mesh(cachedGeo('hub', () => new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16)), M.metal());
    hub.position.y = -0.3;
    hub.castShadow = true;
    this.obj.add(this.arm, hub);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pivot);
    this.arm.position.y = this.height;
  }
  update(dt: number) {
    const s = this.session;
    this.angle += this.speed * dt;
    this.arm.rotation.y = this.angle;
    const dir = new THREE.Vector3(Math.cos(this.angle), 0, -Math.sin(this.angle));
    const c = this.pivot.clone().setY(this.pivot.y + this.height);
    const a = c.clone().addScaledVector(dir, -this.length), b = c.clone().addScaledVector(dir, this.length);
    if (playerHitsSegment(s, a, b, 0.15)) {
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sign(this.speed));
      const from = s.player.pos.clone().sub(tangent);
      if (s.player.damage(this.damage, from, 10)) Audio.play('hit', { pos: s.player.pos });
    }
  }
}

/** Spike strip (animated extend / retract optional). */
export class Spikes extends Entity {
  private spikes: THREE.InstancedMesh;
  private t: number;
  private up = true;
  constructor(private center: THREE.Vector3, private w: number, private d: number, private period = 0, phase = 0, private damage = 30) {
    super();
    const nx = Math.max(1, Math.round(w / 0.5)), nz = Math.max(1, Math.round(d / 0.5));
    const geo = cachedGeo('spike', () => new THREE.ConeGeometry(0.16, 0.6, 6).translate(0, 0.3, 0));
    this.spikes = new THREE.InstancedMesh(geo, M.metal(), nx * nz);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let x = 0; x < nx; x++)
      for (let z = 0; z < nz; z++) {
        m.makeTranslation(-w / 2 + (x + 0.5) * (w / nx), 0, -d / 2 + (z + 0.5) * (d / nz));
        this.spikes.setMatrixAt(i++, m);
      }
    this.spikes.castShadow = true;
    const base = new THREE.Mesh(boxGeo(w, 0.1, d), glowMat(0xff2020, 0.6, 0.6));
    this.obj.add(this.spikes, base);
    this.t = phase * period;
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
  }
  update(dt: number) {
    const s = this.session;
    if (this.period > 0) {
      this.t += dt;
      const k = (this.t % this.period) / this.period;
      this.up = k > 0.5;
      const target = this.up ? 1 : k > 0.4 ? 0.25 : 0.05;
      this.spikes.scale.y += (target - this.spikes.scale.y) * Math.min(1, dt * (this.up ? 25 : 6));
    }
    if (this.up) {
      const min = new THREE.Vector3(this.center.x - this.w / 2, this.center.y - 0.1, this.center.z - this.d / 2);
      const max = new THREE.Vector3(this.center.x + this.w / 2, this.center.y + 0.55, this.center.z + this.d / 2);
      if (playerOverlaps(s, min, max)) {
        if (s.player.damage(this.damage, s.player.pos.clone().setY(this.center.y - 1), 5)) s.player.vel.y = 9;
      }
    }
  }
}

/** Damage / kill volume (lava, acid, void). */
export class KillZone extends Entity {
  constructor(public min: THREE.Vector3, public max: THREE.Vector3, private dps: number, private instant = false, private element: Element = 'fire') {
    super();
  }
  init(s: Session) {
    this.session = s;
  }
  update(dt: number) {
    const s = this.session;
    if (!playerOverlaps(s, this.min, this.max)) return;
    if (this.instant) {
      s.fail(this.element === 'fire' ? 'Burned in lava' : 'Consumed');
      return;
    }
    s.player.damage(this.dps * Math.max(dt, 0.25), undefined, 0);
    s.player.vel.y = Math.max(s.player.vel.y, 10);
    if (Math.random() < 0.5) s.particles.emit(this.element === 'fire' ? 'fire' : 'magic', s.player.pos, { count: 4 });
  }
}

/** Constant push (wind, conveyors) inside a volume. */
export class ForceZone extends Entity {
  private t = 0;
  constructor(public min: THREE.Vector3, public max: THREE.Vector3, private force: THREE.Vector3, private visual: 'wind' | 'lift' | 'none' = 'wind', private gravityScale?: number) {
    super();
  }
  init(s: Session) {
    this.session = s;
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    if (this.visual !== 'none' && this.t > 0.05) {
      this.t = 0;
      const p = new THREE.Vector3(rand(this.min.x, this.max.x), rand(this.min.y, this.max.y), rand(this.min.z, this.max.z));
      s.particles.emit('magic', p, { count: 1, vel: this.force.clone().multiplyScalar(0.8), velSpread: 0.2, up: 0, gravity: 0, life: [0.6, 1.2], color: this.visual === 'lift' ? 0x80c0ff : 0xe0f0ff, size: [0.15, 0.05] });
    }
    const inside = playerOverlaps(s, this.min, this.max);
    if (inside) {
      s.player.externalVel.add(this.force);
      if (this.gravityScale !== undefined) s.player.gravityScale = this.gravityScale;
      if (this.visual === 'lift' && s.player.vel.y < this.force.y * 0.3) s.player.vel.y += (this.force.y - s.player.vel.y) * Math.min(1, dt * 3);
    } else if (this.gravityScale !== undefined && s.player.gravityScale === this.gravityScale) {
      s.player.gravityScale = 1;
    }
  }
}

/** Telegraphed ground strike (circle fills, then bursts). */
export class GroundStrike extends Entity {
  private t = 0;
  private fired = false;
  constructor(private pos: THREE.Vector3, private radius: number, private delay: number, private damage: number, private kind: 'fire' | 'ice' | 'electric' | 'shadow' | 'rock' | 'void' = 'fire', private onFire?: () => void) {
    super();
  }
  init(s: Session) {
    this.session = s;
    const col = { fire: 0xff4020, ice: 0x60d0ff, electric: 0x80a0ff, shadow: 0x9030ff, rock: 0xc08040, void: 0xb14dff }[this.kind];
    s.fx.telegraph(this.pos, this.radius, this.delay, col);
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    if (this.kind === 'electric' && this.t < this.delay && Math.random() < 0.2) s.particles.emit('electric', this.pos.clone().setY(this.pos.y + rand(3, 10)), { count: 2 });
    if (!this.fired && this.t >= this.delay) {
      this.fired = true;
      const p = this.pos;
      const d = Math.hypot(s.player.pos.x - p.x, s.player.pos.z - p.z);
      if (d < this.radius + 0.3 && s.player.pos.y < p.y + 2.5) s.player.damage(this.damage, p, 9);
      switch (this.kind) {
        case 'fire':
          s.particles.emit('fire', p, { count: 40, spread: this.radius * 0.6, up: 8, velSpread: 2, size: [1.4, 0.2] });
          s.particles.emit('smoke', p, { count: 8, spread: this.radius * 0.5 });
          Audio.play('fire', { pos: p });
          break;
        case 'ice':
          s.particles.emit('ice', p, { count: 50, spread: this.radius * 0.6, up: 6, velSpread: 3 });
          Audio.play('ice', { pos: p });
          break;
        case 'electric': {
          const top = p.clone().setY(p.y + 22);
          let prev = top;
          for (let i = 1; i <= 8; i++) {
            const q = top.clone().lerp(p, i / 8).add(new THREE.Vector3(rand(-0.8, 0.8), 0, rand(-0.8, 0.8)));
            s.particles.line('electric', prev, q, 6, { velSpread: 0.5, size: [0.5, 0.1], life: [0.2, 0.35] });
            prev = q;
          }
          s.particles.emit('electric', p, { count: 30, velSpread: 8 });
          s.fx.flash(p.clone().setY(p.y + 2), 0x9ab0ff, 60, 0.25, 30);
          s.post.flashScreen(0xc0d0ff, 0.15, 6);
          Audio.play('thunder', { pos: p, vol: 0.6 });
          break;
        }
        case 'shadow':
        case 'void':
          s.particles.emit('shadow', p, { count: 40, spread: this.radius * 0.5, up: 5, color: 0x8030ff });
          Audio.play('magic', { pos: p, pitch: 0.4 });
          break;
        case 'rock':
          s.particles.emit('debris', p, { count: 30, spread: this.radius * 0.5, velSpread: 6 });
          s.particles.emit('dust', p, { count: 20, spread: this.radius * 0.5 });
          Audio.play('slam', { pos: p });
          break;
      }
      s.fx.shockwave(p, this.radius * 1.2, 0xffffff, 0.3);
      if (d < 14) s.rig.shake(0.2);
      this.onFire?.();
      this.destroy();
    }
  }
}

/** Expanding ring on the ground that must be jumped over. */
export class ShockRing extends Entity {
  private r = 0.5;
  private mesh: THREE.Mesh;
  private hitDone = false;
  constructor(private center: THREE.Vector3, private maxR: number, private speed: number, private damage: number, color = 0xff8040, private height = 0.8) {
    super();
    this.mesh = new THREE.Mesh(
      cachedGeo('shockRingWall', () => new THREE.CylinderGeometry(1, 1, 1, 64, 1, true).translate(0, 0.5, 0)),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.add(this.mesh);
    this.obj.position.copy(this.center);
  }
  update(dt: number) {
    const s = this.session;
    this.r += this.speed * dt;
    this.mesh.scale.set(this.r, this.height, this.r);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - this.r / this.maxR);
    if (Math.random() < 0.6) {
      const a = rand(0, Math.PI * 2);
      s.particles.emit('dust', this.center.clone().add(new THREE.Vector3(Math.cos(a) * this.r, 0.1, Math.sin(a) * this.r)), { count: 1 });
    }
    if (!this.hitDone) {
      const p = s.player.pos;
      const d = Math.hypot(p.x - this.center.x, p.z - this.center.z);
      if (Math.abs(d - this.r) < 0.5 && p.y < this.center.y + this.height) {
        if (s.player.damage(this.damage, this.center.clone().setY(p.y), 10)) this.hitDone = true;
      }
    }
    if (this.r >= this.maxR) this.destroy();
  }
}

/** Rotating/sweeping boss beam from an origin. */
export class SweepBeam extends Entity {
  private beam: THREE.Mesh;
  private glow: THREE.Mesh;
  private t = 0;
  constructor(private origin: () => THREE.Vector3, private yaw0: number, private sweep: number, private duration: number, private length = 30, private damage = 25, color = 0xff3030, private pitch = 0, private warmup = 0.6) {
    super();
    this.beam = new THREE.Mesh(beamGeo(), glowMat(color, 5));
    this.glow = new THREE.Mesh(beamGeo(), glowMat(color, 1.5, 0.3, true));
    this.obj.add(this.beam, this.glow);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    Audio.play('charge');
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    const active = this.t > this.warmup;
    const k = Math.min(1, Math.max(0, (this.t - this.warmup) / this.duration));
    const yaw = this.yaw0 + this.sweep * k;
    const o = this.origin();
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(yaw) * Math.cos(this.pitch));
    // Stop the beam at level geometry
    const hit = s.physics.raycast(o, dir, this.length, (c) => c.tag !== 'boss');
    const len = hit ? hit.dist : this.length;
    const end = o.clone().addScaledVector(dir, len);
    for (const m of [this.beam, this.glow]) {
      m.position.copy(o);
      m.lookAt(end);
      m.scale.z = len;
    }
    const w = active ? 0.35 + Math.sin(this.t * 50) * 0.05 : 0.03;
    this.beam.scale.x = this.beam.scale.y = w;
    this.glow.scale.x = this.glow.scale.y = active ? 1 : 0.1;
    if (active) {
      if (Math.random() < 0.6) s.particles.emit('sparks', end, { count: 3 });
      if (playerHitsSegment(s, o, end, 0.35)) s.player.damage(this.damage, o, 8);
    }
    if (this.t > this.warmup + this.duration) this.destroy();
  }
}

/** Falling meteor / rock with a telegraph at the landing spot. */
export class Meteor extends Entity {
  constructor(private target: THREE.Vector3, private delay = 1.4, private radius = 3, private damage = 35, private kind: 'meteor' | 'rock' | 'ice' = 'meteor', private onLand?: (p: THREE.Vector3) => void) {
    super();
  }
  init(s: Session) {
    this.session = s;
    const start = this.target.clone().add(new THREE.Vector3(rand(-8, 8), 40, rand(-8, 8)));
    const vel = this.target.clone().sub(start).divideScalar(this.delay);
    s.fx.telegraph(this.target, this.radius, this.delay, this.kind === 'ice' ? 0x60c0ff : 0xff5020);
    s.projectiles.spawn({
      kind: this.kind === 'ice' ? 'spike' : this.kind === 'rock' ? 'rock' : 'meteor', pos: start, vel, team: 'enemy', damage: 0, ghost: true, life: this.delay + 0.1, scale: this.kind === 'meteor' ? 1 : 1.6,
    });
    s.after(this.delay, () => {
      if (s.disposed) return;
      s.explode(this.target, this.radius, this.damage, 'env', this.kind === 'ice' ? 'ice' : 'fire');
      this.onLand?.(this.target);
    });
    this.destroy();
  }
}

/** Wandering tornado that pulls and damages the player. */
export class Tornado extends Entity {
  private t = 0;
  private dir = new THREE.Vector3();
  constructor(private pos: THREE.Vector3, private life = 10, private speed = 3, private bounds = 18) {
    super();
    const mat = new THREE.MeshBasicMaterial({ color: 0xc0d0e0, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(cachedGeo('tornado', () => new THREE.CylinderGeometry(2.4, 0.5, 9, 16, 4, true).translate(0, 4.5, 0)), mat);
      m.scale.setScalar(1 - i * 0.2);
      this.obj.add(m);
    }
    this.dir.set(rand(-1, 1), 0, rand(-1, 1)).normalize();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    const toP = s.player.pos.clone().sub(this.pos).setY(0);
    this.dir.lerp(toP.clone().normalize(), dt * 0.4).normalize();
    this.pos.addScaledVector(this.dir, this.speed * dt);
    if (this.pos.length() > this.bounds) this.pos.setLength(this.bounds);
    this.obj.position.copy(this.pos);
    this.obj.children.forEach((c, i) => (c.rotation.y += dt * (6 + i * 2)));
    if (Math.random() < 0.8) s.particles.emit('dust', this.pos.clone().setY(this.pos.y + rand(0, 6)), { count: 1, vel: new THREE.Vector3(-this.dir.z, 2, this.dir.x).multiplyScalar(4) });
    const d = toP.length();
    if (d < 9) {
      const pull = toP.clone().normalize().multiplyScalar(-(9 - d) * 0.8);
      s.player.externalVel.add(pull);
      if (d < 2.4) s.player.damage(15, this.pos, 12);
    }
    const sc = this.t < 0.6 ? this.t / 0.6 : this.t > this.life - 0.6 ? (this.life - this.t) / 0.6 : 1;
    this.obj.scale.setScalar(Math.max(0.01, sc));
    if (this.t > this.life) this.destroy();
  }
}

/** Column of fire that erupts after a warning. */
export class FirePillar extends Entity {
  private t = 0;
  constructor(private pos: THREE.Vector3, private delay = 0.9, private duration = 1.6, private radius = 1.4, private damage = 20, private color: 'fire' | 'shadow' = 'fire') {
    super();
  }
  init(s: Session) {
    this.session = s;
    s.fx.telegraph(this.pos, this.radius, this.delay, this.color === 'fire' ? 0xff5010 : 0x9030ff);
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    if (this.t > this.delay) {
      s.particles.emit(this.color === 'fire' ? 'fire' : 'shadow', this.pos, { count: 6, spread: this.radius * 0.5, up: 12, size: [1.6, 0.3], life: [0.4, 0.8] });
      const p = s.player.pos;
      if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.radius && p.y < this.pos.y + 8) s.player.damage(this.damage, this.pos, 6);
      if (this.t - dt <= this.delay) Audio.play('fire', { pos: this.pos });
    }
    if (this.t > this.delay + this.duration) this.destroy();
  }
}
