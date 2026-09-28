/**
 * Horror stalkers, survival beasts (quadruped) and turrets.
 */
import * as THREE from 'three';
import { Entity, Damageable, HitInfo } from '../entities/Entity';
import { CharacterModel, makeUniqueMaterials } from '../player/CharacterModel';
import { Animator } from '../player/Animator';
import { Audio } from '../audio/AudioManager';
import { boxGeo, cachedGeo, glowMat, M } from '../gfx/Materials';
import { dampAngle, rand, wrapAngle } from '../core/math';
import type { Session } from '../levels/Session';

/**
 * Horror stalker: wanders, hunts on sight, loses you when you hide,
 * is stunned by the flash burst, and jumpscares on contact.
 */
export class Stalker extends Entity {
  readonly model: CharacterModel;
  readonly anim: Animator;
  pos = new THREE.Vector3();
  yaw = 0;
  state: 'wander' | 'hunt' | 'search' | 'stunned' | 'retreat' = 'wander';
  private target = new THREE.Vector3();
  private t = 0;
  private half = new THREE.Vector3(0.3, 1.1, 0.3);
  private vel = new THREE.Vector3();
  private disposeMats: () => void;
  private hbT = 0;
  /** Chase speed (player walks 5.4, sprints 8.6). */
  speed = 6.2;
  damage = 40;
  sight = 16;
  /** When true the creature ignores hiding and never stops (THE WATCHER uses its own class). */
  constructor(start: THREE.Vector3, private area: { min: THREE.Vector3; max: THREE.Vector3 }, private waypoints: THREE.Vector3[] = []) {
    super();
    this.model = new CharacterModel('enemy_stalker', 1.25);
    this.disposeMats = makeUniqueMaterials(this.model);
    this.anim = new Animator(this.model);
    this.pos.copy(start);
    this.obj.add(this.model.root);
    this.pickWander();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.speed *= s.diff.enemySpeed;
    this.damage *= s.diff.enemyDmg;
    s.bus.on<THREE.Vector3>('flash', (from) => {
      const d = from.distanceTo(this.pos);
      const f = s.player.facing;
      const dir = this.pos.clone().sub(from).setY(0).normalize();
      if (d < 12 && dir.dot(f) > 0.3) {
        this.state = 'stunned';
        this.t = 3.5;
        this.anim.play('hit', 0.6);
        Audio.play('roar', { pos: this.pos, pitch: 2, vol: 0.6 });
      }
    });
    s.bus.on<{ pos: THREE.Vector3; radius: number }>('noise', (n) => {
      if (this.state === 'wander' && n.pos.distanceTo(this.pos) < n.radius * 1.6) {
        this.state = 'search';
        this.target.copy(n.pos);
        this.t = 6;
      }
    });
  }
  private pickWander() {
    if (this.waypoints.length) this.target.copy(this.waypoints[Math.floor(Math.random() * this.waypoints.length)]);
    else this.target.set(rand(this.area.min.x, this.area.max.x), this.pos.y, rand(this.area.min.z, this.area.max.z));
  }
  private canSee() {
    const s = this.session;
    const p = s.player;
    if (p.hidden || p.dead) return false;
    const d = this.pos.distanceTo(p.pos);
    const sight = p.crouching ? this.sight * 0.55 : this.sight;
    if (d > sight) return false;
    const ang = Math.abs(wrapAngle(Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) - this.yaw));
    if (ang > 1.2 && d > 3) return false;
    return s.physics.lineOfSight(this.pos.clone().setY(this.pos.y + 2), p.headPos);
  }
  get distToPlayer() {
    return this.pos.distanceTo(this.session.player.pos);
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    this.t -= dt;
    let speed = 0;
    const playing = s.state === 'playing';
    if (playing && this.state !== 'stunned' && this.state !== 'retreat' && this.canSee()) {
      if (this.state !== 'hunt') {
        Audio.play('roar', { pos: this.pos, pitch: 1.5, vol: 0.6 });
        s.rig.shake(0.1);
      }
      this.state = 'hunt';
      this.target.copy(p.pos);
      this.t = 4;
    }
    switch (this.state) {
      case 'wander':
        speed = 1.8;
        if (this.pos.distanceTo(this.target) < 1) this.pickWander();
        break;
      case 'hunt':
        speed = this.speed;
        if (!p.hidden) this.target.copy(p.pos);
        if (this.t <= 0 || p.hidden) {
          this.state = 'search';
          this.t = 5;
        }
        if (playing && this.pos.distanceTo(p.pos) < 1.3 && !p.hidden) this.attack();
        break;
      case 'search':
        speed = 3;
        if (this.pos.distanceTo(this.target) < 1) this.yaw += dt * 2;
        if (this.t <= 0) {
          this.state = 'wander';
          this.pickWander();
        }
        break;
      case 'stunned':
        if (Math.random() < 0.3) s.particles.emit('smoke', this.pos.clone().setY(this.pos.y + 2), { count: 1 });
        if (this.t <= 0) this.state = 'search';
        break;
      case 'retreat':
        speed = 7;
        if (this.t <= 0) {
          this.state = 'wander';
          this.pickWander();
        }
        break;
    }
    const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
    const mv = d.lengthSq() > 0.2 && speed > 0 ? d.normalize().multiplyScalar(speed) : new THREE.Vector3();
    this.vel.x += (mv.x - this.vel.x) * Math.min(1, dt * 6);
    this.vel.z += (mv.z - this.vel.z) * Math.min(1, dt * 6);
    this.vel.y += s.physics.gravity * dt;
    const r = s.physics.moveCharacter(this.pos, this.half, this.vel.clone().multiplyScalar(dt), 0.45);
    if (r.grounded && this.vel.y < 0) this.vel.y = 0;
    if (r.hitWall && this.state === 'wander') this.pickWander();
    if (mv.lengthSq() > 0.1) this.yaw = dampAngle(this.yaw, Math.atan2(mv.x, mv.z), 6, dt);
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.anim.update(dt, { speed: hs, grounded: true, vy: 0, crouch: false, sprint: this.state === 'hunt', stride: 1.4 });
    // Twitchy head
    this.model.joints.head.rotation.z += Math.sin(s.clock * 23) * 0.08;
    // Heartbeat when close
    const dist = this.distToPlayer;
    this.hbT -= dt;
    if (dist < 14 && this.hbT <= 0 && playing) {
      this.hbT = 0.35 + dist * 0.06;
      Audio.play('heartbeat', { vol: 1 - dist / 14 });
    }
  }
  private attack() {
    const s = this.session;
    const p = s.player;
    // Jumpscare
    Audio.play('jumpscare');
    s.post.flashScreen(0x600000, 0.7, 2);
    s.rig.shake(0.7);
    const f = p.facing;
    s.rig.playShots([{ from: p.headPos.addScaledVector(f, -0.2), to: p.headPos.addScaledVector(f, -0.3), lookFrom: this.pos.clone().setY(this.pos.y + 2.2), lookTo: this.pos.clone().setY(this.pos.y + 2.1), duration: 0.45, fov: 40 }]);
    p.damage(this.damage, this.pos, 12);
    this.state = 'retreat';
    this.t = 3;
    this.target.copy(this.pos).add(new THREE.Vector3(this.pos.x - p.pos.x, 0, this.pos.z - p.pos.z).normalize().multiplyScalar(18));
  }
  dispose() {
    this.disposeMats();
    super.dispose();
  }
}

/** Quadruped beast (wolves) for survival. */
export class Beast extends Entity implements Damageable {
  pos = new THREE.Vector3();
  center = new THREE.Vector3();
  radius = 0.6;
  halfHeight = 0.5;
  team: 'enemy' = 'enemy';
  hp = 45;
  private yaw = 0;
  private vel = new THREE.Vector3();
  private half = new THREE.Vector3(0.35, 0.45, 0.35);
  private legs: THREE.Object3D[] = [];
  private body: THREE.Group;
  private head: THREE.Object3D;
  private cd = 0;
  private phase = 0;
  private state: 'prowl' | 'chase' | 'flee' | 'dead' = 'prowl';
  private t = 0;
  private flash = 0;
  private mat: THREE.MeshStandardMaterial;
  fearsFire: THREE.Vector3[] = [];
  onDeath: (() => void) | null = null;
  constructor(start: THREE.Vector3, color = 0x4a4038, private dmg = 12, eyes = 0xffcc40) {
    super();
    this.pos.copy(start);
    this.mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    this.body = new THREE.Group();
    const torso = new THREE.Mesh(cachedGeo('beastTorso', () => new THREE.CapsuleGeometry(0.3, 0.8, 4, 10).rotateX(Math.PI / 2)), this.mat);
    torso.castShadow = true;
    torso.position.y = 0.7;
    this.head = new THREE.Group();
    const skull = new THREE.Mesh(cachedGeo('beastHead', () => new THREE.ConeGeometry(0.22, 0.55, 8).rotateX(Math.PI / 2)), this.mat);
    skull.castShadow = true;
    const e1 = new THREE.Mesh(cachedGeo('beastEye', () => new THREE.SphereGeometry(0.04, 6, 4)), glowMat(eyes, 4));
    e1.position.set(0.09, 0.07, 0.05);
    const e2 = e1.clone();
    e2.position.x = -0.09;
    const ear = new THREE.Mesh(cachedGeo('beastEar', () => new THREE.ConeGeometry(0.06, 0.18, 4)), this.mat);
    ear.position.set(0.1, 0.18, -0.1);
    const ear2 = ear.clone();
    ear2.position.x = -0.1;
    this.head.add(skull, e1, e2, ear, ear2);
    this.head.position.set(0, 0.95, 0.7);
    const tail = new THREE.Mesh(cachedGeo('beastTail', () => new THREE.ConeGeometry(0.07, 0.6, 5).rotateX(-2.2)), this.mat);
    tail.position.set(0, 0.8, -0.65);
    this.body.add(torso, this.head, tail);
    for (const [x, z] of [[0.18, 0.45], [-0.18, 0.45], [0.18, -0.45], [-0.18, -0.45]]) {
      const leg = new THREE.Group();
      const m = new THREE.Mesh(cachedGeo('beastLeg', () => new THREE.CylinderGeometry(0.06, 0.045, 0.6, 6).translate(0, -0.3, 0)), this.mat);
      m.castShadow = true;
      leg.add(m);
      leg.position.set(x, 0.62, z);
      this.legs.push(leg);
      this.body.add(leg);
    }
    this.obj.add(this.body);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    s.addDamageable(this);
    this.hp *= s.diff.enemyHp;
    this.dmg *= s.diff.enemyDmg;
  }
  takeDamage(h: HitInfo) {
    if (this.state === 'dead') return;
    const s = this.session;
    this.hp -= h.amount;
    this.flash = 0.12;
    this.vel.addScaledVector(h.dir, h.knockback * 1.2);
    s.particles.emit('blood', this.center, { count: 6 });
    Audio.play('hit', { pos: this.center });
    if (this.hp <= 0) {
      this.state = 'dead';
      this.t = 0;
      s.removeDamageable(this);
      s.registerKill();
      s.addCoin(this.center);
      Audio.play('death', { pos: this.center, pitch: 1.8, vol: 0.4 });
      this.onDeath?.();
    } else if (Math.random() < 0.3) {
      this.state = 'flee';
      this.t = 1.2;
    }
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    this.center.set(this.pos.x, this.pos.y + 0.7, this.pos.z);
    this.t -= dt;
    this.cd -= dt;
    if (this.flash > 0) {
      this.flash -= dt;
      this.mat.emissive.setScalar(this.flash > 0 ? 1 : 0);
    }
    if (this.state === 'dead') {
      this.body.rotation.z = Math.min(Math.PI / 2, this.body.rotation.z + dt * 5);
      if (this.t < -3) this.destroy();
      return;
    }
    const toP = new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    const dist = toP.length();
    // Fire keeps beasts away
    const nearFire = this.fearsFire.find((f) => f.distanceTo(this.pos) < 7);
    let move = new THREE.Vector3();
    let speed = 0;
    if (nearFire) {
      move = this.pos.clone().sub(nearFire).setY(0).normalize();
      speed = 5;
    } else if (this.state === 'flee') {
      move = toP.clone().normalize().negate();
      speed = 6;
      if (this.t <= 0) this.state = 'chase';
    } else if (dist < 30 && !p.dead) {
      this.state = 'chase';
      move = toP.clone().normalize();
      speed = dist > 2 ? 6.4 * s.diff.enemySpeed : 0;
      if (dist < 2 && this.cd <= 0 && s.state === 'playing') {
        this.cd = 1.3;
        this.head.position.z = 0.95;
        if (p.damage(this.dmg, this.pos, 6)) Audio.play('roar', { pos: this.pos, pitch: 2.4, vol: 0.4 });
      }
    } else {
      move.set(Math.sin(s.clock * 0.3 + this.pos.x), 0, Math.cos(s.clock * 0.3 + this.pos.z));
      speed = 1.5;
    }
    this.head.position.z += (0.7 - this.head.position.z) * Math.min(1, dt * 6);
    this.vel.x += (move.x * speed - this.vel.x) * Math.min(1, dt * 5);
    this.vel.z += (move.z * speed - this.vel.z) * Math.min(1, dt * 5);
    this.vel.y += s.physics.gravity * dt;
    const r = s.physics.moveCharacter(this.pos, this.half, this.vel.clone().multiplyScalar(dt), 0.5);
    if (r.grounded && this.vel.y < 0) this.vel.y = 0;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.3) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 8, dt);
    this.phase += hs * dt * 2.2;
    this.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * Math.min(0.8, hs * 0.15)));
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.05 * Math.min(1, hs / 3);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    if (this.pos.y < s.killY) this.destroy();
  }
  dispose() {
    this.session.removeDamageable(this);
    this.mat.dispose();
    super.dispose();
  }
}

/** Stationary turret that tracks and fires at the player. */
export class Turret extends Entity implements Damageable {
  center: THREE.Vector3;
  radius = 0.7;
  halfHeight = 0.8;
  team: 'enemy' = 'enemy';
  hp = 60;
  active = true;
  private head: THREE.Group;
  private cd: number;
  constructor(private pos: THREE.Vector3, private rate = 1.2, private dmg = 12, private destructible = true, private speed = 18, private pattern: 'aim' | 'spread' | 'spin' = 'aim') {
    super();
    this.center = pos.clone().setY(pos.y + 1);
    this.cd = rand(0, rate);
    const base = new THREE.Mesh(cachedGeo('turBase', () => new THREE.CylinderGeometry(0.5, 0.7, 0.8, 12)), M.darkMetal());
    base.position.y = 0.4;
    base.castShadow = true;
    this.head = new THREE.Group();
    const hb = new THREE.Mesh(boxGeo(0.7, 0.5, 0.7), M.metal());
    const barrel = new THREE.Mesh(cachedGeo('turBarrel', () => new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5)), M.darkMetal());
    const eye = new THREE.Mesh(boxGeo(0.3, 0.08, 0.02), glowMat(0xff3030, 3));
    eye.position.set(0, 0.1, 0.36);
    this.head.add(hb, barrel, eye);
    this.head.position.y = 1.05;
    this.obj.add(base, this.head);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (this.destructible) s.addDamageable(this);
  }
  takeDamage(h: HitInfo) {
    const s = this.session;
    this.hp -= h.amount;
    s.particles.emit('sparks', this.center, { count: 10 });
    if (this.hp <= 0) {
      s.explode(this.center, 2, 0, 'player', 'electric');
      s.removeDamageable(this);
      s.registerKill();
      this.destroy();
    }
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    if (!this.active || s.state !== 'playing') return;
    const to = p.center.clone().sub(this.center);
    let yaw = Math.atan2(to.x, to.z);
    if (this.pattern === 'spin') yaw = s.clock * 1.4;
    this.head.rotation.y = dampAngle(this.head.rotation.y, yaw, 6, dt);
    this.cd -= dt;
    if (this.cd <= 0 && to.length() < 40) {
      this.cd = this.rate;
      const from = this.center.clone().setY(this.pos.y + 1.05);
      const dirs: THREE.Vector3[] = [];
      const base = new THREE.Vector3(Math.sin(this.head.rotation.y), 0, Math.cos(this.head.rotation.y));
      if (this.pattern === 'aim') dirs.push(to.clone().add(p.vel.clone().multiplyScalar(to.length() / this.speed * 0.6)).normalize());
      else {
        const n = this.pattern === 'spread' ? 5 : 4;
        for (let i = 0; i < n; i++) dirs.push(base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.pattern === 'spread' ? (i - 2) * 0.22 : (i / n) * Math.PI * 2));
      }
      for (const d of dirs) s.projectiles.spawn({ kind: 'bullet', pos: from.clone().addScaledVector(d, 0.8), vel: d.multiplyScalar(this.speed), team: 'enemy', damage: this.dmg * s.diff.enemyDmg, color: 0xff5030, radius: 0.18, life: 3 });
      Audio.play('laser', { pos: this.pos, vol: 0.4, pitch: 1.6 });
    }
  }
  dispose() {
    this.session.removeDamageable(this);
    super.dispose();
  }
}
