/**
 * Platform entities: moving, vanishing, falling, crushers, pads, doors, crates.
 */
import * as THREE from 'three';
import { Entity } from './Entity';
import { makeCollider, setColliderCenter, Collider } from '../physics/Physics';
import { boxGeo, glowMat } from '../gfx/Materials';
import { Audio } from '../audio/AudioManager';
import { rand } from '../core/math';
import type { Session } from '../levels/Session';

export function playerOverlaps(s: Session, min: THREE.Vector3, max: THREE.Vector3, pad = 0) {
  const p = s.player.pos, h = s.player.half;
  return p.x + h.x > min.x - pad && p.x - h.x < max.x + pad && p.y + h.y * 2 > min.y - pad && p.y < max.y + pad && p.z + h.z > min.z - pad && p.z - h.z < max.z + pad;
}

function boxMesh(size: THREE.Vector3, mat: THREE.Material, tile = 4) {
  const m = new THREE.Mesh(boxGeo(size.x, size.y, size.z, tile), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Platform moving along waypoints (ping-pong or loop), carrying the player. */
export class MovingPlatform extends Entity {
  private t = 0;
  private col!: Collider;
  private mesh: THREE.Mesh;
  private segLens: number[] = [];
  private total = 0;
  private pos = new THREE.Vector3();
  constructor(private points: THREE.Vector3[], private size: THREE.Vector3, mat: THREE.Material, private speed = 3, private loop = false, private phase = 0, private pause = 0.4) {
    super();
    this.mesh = boxMesh(size, mat);
    this.obj.add(this.mesh);
    // Glowing edge strip so moving platforms read clearly
    const strip = new THREE.Mesh(boxGeo(size.x + 0.02, 0.06, size.z + 0.02), glowMat(0x40e0ff, 2));
    strip.position.y = size.y / 2 - 0.03;
    this.obj.add(strip);
    const pts = loop ? [...points, points[0]] : points;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      this.segLens.push(l);
      this.total += l;
    }
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.pos.copy(this.points[0]);
    this.col = this.addCollider(makeCollider(this.pos, this.size, { tag: 'moving' }));
    this.t = this.phase * (this.total / this.speed);
    this.sample(this.t, this.pos);
    setColliderCenter(this.col, this.pos);
    this.col.delta.set(0, 0, 0);
  }
  private sample(t: number, out: THREE.Vector3) {
    const pts = this.loop ? [...this.points, this.points[0]] : this.points;
    const travel = this.total / this.speed;
    let d: number;
    if (this.loop) d = ((t % travel) / travel) * this.total;
    else {
      const cycle = travel * 2 + this.pause * 2;
      let k = t % cycle;
      if (k < this.pause) d = 0;
      else if (k < this.pause + travel) d = ((k - this.pause) / travel) * this.total;
      else if (k < this.pause * 2 + travel) d = this.total;
      else {
        k -= this.pause * 2 + travel;
        d = this.total - (k / travel) * this.total;
      }
      // Ease at the ends
      const e = d / this.total;
      d = (e * e * (3 - 2 * e)) * this.total;
    }
    for (let i = 0; i < this.segLens.length; i++) {
      if (d <= this.segLens[i] || i === this.segLens.length - 1) {
        out.lerpVectors(pts[i], pts[i + 1], Math.min(1, d / (this.segLens[i] || 1)));
        return out;
      }
      d -= this.segLens[i];
    }
    return out;
  }
  update(dt: number) {
    this.t += dt;
    this.sample(this.t, this.pos);
    setColliderCenter(this.col, this.pos);
    this.obj.position.copy(this.pos);
  }
}

/** Crumbles shortly after the player lands on it, then respawns. */
export class VanishingPlatform extends Entity {
  private col!: Collider;
  private mesh: THREE.Mesh;
  private state: 'idle' | 'shaking' | 'gone' = 'idle';
  private t = 0;
  private base = new THREE.Vector3();
  constructor(private center: THREE.Vector3, private size: THREE.Vector3, mat: THREE.Material, private delay = 0.55, private respawn = 3) {
    super();
    this.mesh = boxMesh(size, mat);
    this.obj.add(this.mesh);
    const edge = new THREE.Mesh(boxGeo(size.x + 0.04, 0.05, size.z + 0.04), glowMat(0xff8040, 1.6));
    edge.position.y = size.y / 2 - 0.02;
    this.obj.add(edge);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
    this.base.copy(this.center);
    this.col = this.addCollider(makeCollider(this.center, this.size, { onLand: () => this.trigger() }));
  }
  trigger() {
    if (this.state !== 'idle') return;
    this.state = 'shaking';
    this.t = this.delay;
    Audio.play('break', { pos: this.center, vol: 0.4 });
  }
  update(dt: number) {
    const s = this.session;
    if (this.state === 'shaking') {
      this.t -= dt;
      this.obj.position.set(this.base.x + rand(-0.05, 0.05), this.base.y + rand(-0.03, 0.03), this.base.z + rand(-0.05, 0.05));
      if (this.t <= 0) {
        this.state = 'gone';
        this.t = this.respawn;
        this.col.enabled = false;
        s.particles.emit('debris', this.center, { count: 18, spread: this.size.x / 2 });
        s.particles.emit('dust', this.center, { count: 10, spread: this.size.x / 2 });
      }
    } else if (this.state === 'gone') {
      this.t -= dt;
      this.obj.position.y -= dt * 12;
      this.obj.visible = this.t < this.respawn - 0.4 ? false : true;
      if (this.t <= 0 && !playerOverlaps(s, this.col.min, this.col.max, 0.1)) {
        this.state = 'idle';
        this.col.enabled = true;
        this.obj.visible = true;
        this.obj.position.copy(this.base);
        this.obj.scale.setScalar(0.01);
      }
    } else {
      this.obj.position.copy(this.base);
      this.obj.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 10));
    }
  }
}

/** Industrial piston that slams down periodically. */
export class Crusher extends Entity {
  private col!: Collider;
  private t: number;
  private top: number;
  private bottom: number;
  private pos = new THREE.Vector3();
  private warn: THREE.Mesh;
  constructor(private x: number, private z: number, floorY: number, private size: THREE.Vector3, mat: THREE.Material, private period = 2.6, phase = 0, private rise = 4.2) {
    super();
    this.bottom = floorY + size.y / 2;
    this.top = this.bottom + rise;
    this.t = phase * period;
    const m = boxMesh(size, mat);
    this.obj.add(m);
    const stripe = new THREE.Mesh(boxGeo(size.x + 0.02, 0.2, size.z + 0.02), glowMat(0xffc020, 1.5));
    stripe.position.y = -size.y / 2 + 0.15;
    this.obj.add(stripe);
    const rod = new THREE.Mesh(boxGeo(0.4, 12, 0.4), mat);
    rod.position.y = size.y / 2 + 6;
    this.obj.add(rod);
    this.warn = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0, depthWrite: false }));
    this.warn.rotation.x = -Math.PI / 2;
    this.warn.position.set(x, floorY + 0.03, z);
  }
  init(s: Session) {
    s.scene.add(this.obj, this.warn);
    this.pos.set(this.x, this.top, this.z);
    this.col = this.addCollider(makeCollider(this.pos, this.size));
  }
  update(dt: number) {
    const s = this.session;
    this.t += dt;
    const k = (this.t % this.period) / this.period;
    // 0-0.55 up (hold), 0.55-0.65 slam, 0.65-0.8 hold down, 0.8-1 rise
    let y: number;
    if (k < 0.55) y = this.top;
    else if (k < 0.62) y = this.top - ((k - 0.55) / 0.07) * this.rise;
    else if (k < 0.8) y = this.bottom;
    else y = this.bottom + ((k - 0.8) / 0.2) * this.rise;
    const prevY = this.pos.y;
    this.pos.y = y;
    (this.warn.material as THREE.MeshBasicMaterial).opacity = k > 0.35 && k < 0.62 ? 0.25 + Math.sin(this.t * 30) * 0.15 : 0;
    // Crush check: player under the piston while it comes down
    if (y < prevY - 0.001) {
      const min = new THREE.Vector3(this.x - this.size.x / 2, y - this.size.y / 2, this.z - this.size.z / 2);
      const max = new THREE.Vector3(this.x + this.size.x / 2, y + this.size.y / 2, this.z + this.size.z / 2);
      if (playerOverlaps(s, min, max, -0.05)) {
        s.player.damage(45, new THREE.Vector3(this.x, s.player.pos.y, this.z), 14);
        // Push the player out sideways
        const d = new THREE.Vector3(s.player.pos.x - this.x, 0, s.player.pos.z - this.z);
        if (d.lengthSq() < 0.01) d.set(1, 0, 0);
        d.normalize();
        s.player.pos.x = this.x + d.x * (this.size.x / 2 + 0.5);
        s.player.pos.z = this.z + d.z * (this.size.z / 2 + 0.5);
      }
    }
    if (prevY > this.bottom + 0.01 && y <= this.bottom + 0.01) {
      Audio.play('slam', { pos: this.pos, vol: 0.6 });
      s.particles.emit('dust', new THREE.Vector3(this.x, this.bottom - this.size.y / 2, this.z), { count: 14, spread: this.size.x / 2 });
      if (this.pos.distanceTo(s.player.pos) < 10) s.rig.shake(0.12);
    }
    setColliderCenter(this.col, this.pos);
    this.obj.position.copy(this.pos);
  }
}

/** Launch pad (speed pad or jump pad). */
export class LaunchPad extends Entity {
  private cool = 0;
  private min: THREE.Vector3;
  private max: THREE.Vector3;
  private arrows: THREE.Mesh;
  constructor(private center: THREE.Vector3, private dir: THREE.Vector3, private power: number, private up: number, private color = 0x40ff90, size = 2) {
    super();
    this.min = new THREE.Vector3(center.x - size / 2, center.y - 0.2, center.z - size / 2);
    this.max = new THREE.Vector3(center.x + size / 2, center.y + 0.6, center.z + size / 2);
    const base = new THREE.Mesh(boxGeo(size, 0.12, size), glowMat(color, 1.2, 0.9));
    this.obj.add(base);
    const tex = arrowTexture();
    this.arrows = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color, toneMapped: false, depthWrite: false }));
    this.arrows.rotation.x = -Math.PI / 2;
    this.arrows.rotation.z = up > power ? 0 : Math.atan2(dir.x, dir.z) + Math.PI;
    this.arrows.position.y = 0.08;
    this.obj.add(this.arrows);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
  }
  update(dt: number) {
    const s = this.session;
    this.cool -= dt;
    const tex = (this.arrows.material as THREE.MeshBasicMaterial).map!;
    tex.offset.y -= dt * 1.5;
    if (this.cool <= 0 && playerOverlaps(s, this.min, this.max)) {
      this.cool = 0.5;
      const v = this.dir.clone().setY(0).normalize().multiplyScalar(this.power);
      v.y = this.up;
      s.player.impulse(v.lengthSq() > 0 ? v : new THREE.Vector3(0, this.up, 0));
      Audio.play(this.up > this.power ? 'jump' : 'boost', { pitch: 1.4 });
      s.particles.emit('magic', this.center, { count: 25, color: this.color, velSpread: 4 });
      s.fx.shockwave(this.center, 2.5, this.color, 0.35);
    }
  }
}

let arrowTex: THREE.Texture | null = null;
function arrowTexture() {
  if (arrowTex) return arrowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#fff';
  x.lineWidth = 12;
  x.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const y = 30 + i * 64;
    x.beginPath();
    x.moveTo(24, y + 30);
    x.lineTo(64, y);
    x.lineTo(104, y + 30);
    x.stroke();
  }
  arrowTex = new THREE.CanvasTexture(c);
  arrowTex.wrapS = arrowTex.wrapT = THREE.RepeatWrapping;
  arrowTex.userData.cached = true;
  return arrowTex;
}

/** Sliding door. Opening is idempotent. */
export class Door extends Entity {
  private col!: Collider;
  isOpen = false;
  private k = 0;
  private panel: THREE.Mesh;
  private light: THREE.Mesh;
  constructor(private center: THREE.Vector3, private size: THREE.Vector3, mat: THREE.Material, private color = 0xff3040) {
    super();
    this.panel = boxMesh(size, mat, 2);
    this.obj.add(this.panel);
    this.light = new THREE.Mesh(boxGeo(Math.max(0.2, size.x * 0.9), 0.12, Math.max(0.2, size.z * 0.9)), glowMat(color, 2));
    this.light.position.y = size.y / 2 + 0.1;
    this.obj.add(this.light);
    // Frame
    const fm = new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.8, roughness: 0.4 });
    const horiz = size.x > size.z;
    const post = (sx: number) => {
      const p = new THREE.Mesh(boxGeo(horiz ? 0.4 : size.x + 0.3, size.y + 0.6, horiz ? size.z + 0.3 : 0.4), fm);
      if (horiz) p.position.x = sx * (size.x / 2 + 0.2);
      else p.position.z = sx * (size.z / 2 + 0.2);
      p.position.y = 0.3;
      p.castShadow = true;
      this.obj.add(p);
    };
    post(1);
    post(-1);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
    this.col = this.addCollider(makeCollider(this.center, this.size, { tag: 'door' }));
  }
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.col.enabled = false;
    this.light.material = glowMat(0x40ff80, 2);
    Audio.play('door', { pos: this.center });
    this.session.particles.emit('dust', this.center.clone().setY(this.center.y - this.size.y / 2), { count: 10, spread: 1 });
  }
  close() {
    if (!this.isOpen) return;
    if (playerOverlaps(this.session, this.col.min, this.col.max)) return;
    this.isOpen = false;
    this.col.enabled = true;
    this.light.material = glowMat(this.color, 2);
    Audio.play('door', { pos: this.center });
  }
  update(dt: number) {
    const target = this.isOpen ? 1 : 0;
    this.k += (target - this.k) * Math.min(1, dt * 5);
    this.panel.position.y = this.k * (this.size.y - 0.15);
    this.panel.scale.y = 1 - this.k * 0.02;
  }
}

/** Crate the player can push by walking into it; used on pressure plates. */
export class PushCrate extends Entity {
  col!: Collider;
  pos = new THREE.Vector3();
  private vy = 0;
  private half = new THREE.Vector3(0.6, 0.6, 0.6);
  constructor(start: THREE.Vector3, mat: THREE.Material) {
    super();
    this.pos.copy(start);
    const m = boxMesh(new THREE.Vector3(1.2, 1.2, 1.2), mat, 1.2);
    this.obj.add(m);
    const band = new THREE.Mesh(boxGeo(1.24, 0.12, 1.24), glowMat(0xb48cff, 1.5));
    this.obj.add(band);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.col = this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 0.6), new THREE.Vector3(1.2, 1.2, 1.2), { tag: 'crate' }));
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    // Push detection: player adjacent & moving towards the crate
    const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z;
    const reach = 0.6 + p.half.x + 0.08;
    const vx = p.vel.x, vz = p.vel.z;
    let push: THREE.Vector3 | null = null;
    if (p.pos.y < this.pos.y + 1.0 && p.pos.y + p.half.y * 2 > this.pos.y) {
      if (Math.abs(dz) < 0.55 && Math.abs(dx) < reach && Math.sign(dx) === Math.sign(vx) && Math.abs(vx) > 0.5) push = new THREE.Vector3(Math.sign(dx), 0, 0);
      else if (Math.abs(dx) < 0.55 && Math.abs(dz) < reach && Math.sign(dz) === Math.sign(vz) && Math.abs(vz) > 0.5) push = new THREE.Vector3(0, 0, Math.sign(dz));
    }
    this.col.enabled = false; // don't collide with ourselves
    if (push) {
      const step = 2.4 * dt;
      const nx = this.pos.x + push.x * step, nz = this.pos.z + push.z * step;
      if (!s.physics.blocked(nx, this.pos.y + 0.02, nz, this.half)) {
        this.pos.x = nx;
        this.pos.z = nz;
        if (Math.random() < 0.1) s.particles.emit('dust', this.pos, { count: 2 });
      }
    }
    // Gravity
    const ground = s.physics.heightAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    if (this.pos.y > ground + 0.001) {
      this.vy -= 25 * dt;
      this.pos.y = Math.max(ground, this.pos.y + this.vy * dt);
      if (this.pos.y === ground) this.vy = 0;
    }
    if (this.pos.y < -30) this.pos.y = -30;
    this.col.enabled = true;
    setColliderCenter(this.col, this.pos.clone().setY(this.pos.y + 0.6));
    this.obj.position.copy(this.pos).setY(this.pos.y + 0.6);
  }
}

/** Plain decorative helper: gently bobbing / spinning object. */
export class Spinner extends Entity {
  constructor(private target: THREE.Object3D, private spin = 1, private bob = 0) {
    super();
  }
  init(s: Session) {
    this.session = s;
    this.target.userData.baseY = this.target.position.y;
  }
  update(dt: number) {
    this.target.rotation.y += dt * this.spin;
    if (this.bob) this.target.position.y = this.target.userData.baseY + Math.sin(this.session.clock * 2) * this.bob;
  }
}
