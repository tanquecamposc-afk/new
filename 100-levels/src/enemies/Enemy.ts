/**
 * Humanoid enemies with real AI: perception (range + line of sight), patrol,
 * chase, telegraphed attacks, ranged kiting, charges, healing casters,
 * exploders; hit reactions, knockback, simplified ragdoll death and loot.
 */
import * as THREE from 'three';
import { Entity, Damageable, HitInfo } from '../entities/Entity';
import { CharacterModel, makeUniqueMaterials } from '../player/CharacterModel';
import { Animator } from '../player/Animator';
import { buildWeapon } from '../combat/Weapons';
import { Audio } from '../audio/AudioManager';
import { dampAngle, rand, wrapAngle } from '../core/math';
import type { Session } from '../levels/Session';

export type EnemyKind = 'grunt' | 'brute' | 'archer' | 'charger' | 'shaman' | 'exploder' | 'zombie' | 'warrior' | 'clone' | 'knight';

interface EnemyStats {
  skin: string;
  weapon: string | null;
  hp: number;
  dmg: number;
  speed: number;
  range: number;
  cooldown: number;
  scale: number;
  sight: number;
  coins: number;
  style: 'melee' | 'ranged' | 'charger' | 'caster' | 'exploder';
  windup: number;
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  grunt: { skin: 'enemy_grunt', weapon: 'wpn_sword', hp: 60, dmg: 12, speed: 3.6, range: 2.1, cooldown: 1.4, scale: 1, sight: 18, coins: 2, style: 'melee', windup: 0.45 },
  knight: { skin: 'enemy_warrior', weapon: 'wpn_sword', hp: 110, dmg: 16, speed: 3.4, range: 2.3, cooldown: 1.2, scale: 1.05, sight: 20, coins: 4, style: 'melee', windup: 0.4 },
  brute: { skin: 'enemy_brute', weapon: 'wpn_axe', hp: 200, dmg: 28, speed: 2.4, range: 2.9, cooldown: 2.2, scale: 1.45, sight: 16, coins: 6, style: 'melee', windup: 0.8 },
  archer: { skin: 'enemy_archer', weapon: 'wpn_bow', hp: 45, dmg: 10, speed: 3.2, range: 18, cooldown: 2.0, scale: 0.95, sight: 26, coins: 3, style: 'ranged', windup: 0.7 },
  charger: { skin: 'enemy_charger', weapon: null, hp: 90, dmg: 22, speed: 3.8, range: 12, cooldown: 3, scale: 1.15, sight: 22, coins: 4, style: 'charger', windup: 0.8 },
  shaman: { skin: 'enemy_shaman', weapon: 'wpn_staff', hp: 70, dmg: 12, speed: 2.8, range: 15, cooldown: 2.6, scale: 1, sight: 24, coins: 5, style: 'caster', windup: 0.6 },
  exploder: { skin: 'enemy_zombie', weapon: null, hp: 35, dmg: 30, speed: 5.2, range: 1.8, cooldown: 1, scale: 0.9, sight: 22, coins: 2, style: 'exploder', windup: 0.7 },
  zombie: { skin: 'enemy_zombie', weapon: null, hp: 55, dmg: 12, speed: 2.4, range: 1.8, cooldown: 1.5, scale: 1, sight: 14, coins: 1, style: 'melee', windup: 0.5 },
  warrior: { skin: 'enemy_warrior', weapon: 'wpn_axe', hp: 140, dmg: 18, speed: 3.6, range: 2.5, cooldown: 1.3, scale: 1.1, sight: 22, coins: 5, style: 'melee', windup: 0.45 },
  clone: { skin: 'enemy_clone', weapon: 'wpn_void', hp: 40, dmg: 14, speed: 4.4, range: 2.2, cooldown: 1.3, scale: 1, sight: 30, coins: 1, style: 'melee', windup: 0.4 },
};

type State = 'idle' | 'patrol' | 'chase' | 'windup' | 'attack' | 'recover' | 'stagger' | 'charge' | 'dead';

export class Enemy extends Entity implements Damageable {
  readonly model: CharacterModel;
  readonly anim: Animator;
  readonly stats: EnemyStats;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  hp: number;
  maxHp: number;
  center = new THREE.Vector3();
  radius: number;
  halfHeight: number;
  team: 'enemy' = 'enemy';
  priority = 0;
  state: State = 'idle';
  private t = 0;
  private cd = 0;
  private half: THREE.Vector3;
  private grounded = false;
  private home = new THREE.Vector3();
  patrol: THREE.Vector3[] = [];
  private patrolIdx = 0;
  aware = false;
  /** Always hunts the player regardless of sight (arena waves). */
  aggressive = true;
  private hpBar: THREE.Group;
  private hpFill: THREE.Mesh;
  private hpShowT = 0;
  private disposeMats: () => void;
  private chargeDir = new THREE.Vector3();
  private healT = 3;
  private deathT = 0;
  onDeath: (() => void) | null = null;
  private strafe = rand(-1, 1) > 0 ? 1 : -1;
  private speed: number;
  private dmg: number;

  constructor(readonly kind: EnemyKind, pos: THREE.Vector3, yaw = 0, mult = 1) {
    super();
    this.stats = ENEMY_STATS[kind];
    this.model = new CharacterModel(this.stats.skin, this.stats.scale);
    this.disposeMats = makeUniqueMaterials(this.model);
    this.anim = new Animator(this.model);
    this.anim.smoothing = 16;
    if (this.stats.weapon) {
      const w = buildWeapon(this.stats.weapon);
      this.model.setWeapon(w.right, w.left);
    }
    this.pos.copy(pos);
    this.home.copy(pos);
    this.yaw = yaw;
    this.hp = this.maxHp = this.stats.hp * mult;
    this.speed = this.stats.speed;
    this.dmg = this.stats.dmg;
    this.radius = 0.5 * this.stats.scale;
    this.halfHeight = 0.9 * this.stats.scale;
    this.half = new THREE.Vector3(0.32 * this.stats.scale, 0.88 * this.stats.scale, 0.32 * this.stats.scale);
    this.obj.add(this.model.root);
    // Floating health bar
    this.hpBar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: 0xff3040, depthTest: false }));
    this.hpFill.position.x = -0.5;
    this.hpFill.position.z = 0.001;
    bg.renderOrder = this.hpFill.renderOrder = 20;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.visible = false;
  }

  init(s: Session) {
    s.scene.add(this.obj);
    s.scene.add(this.hpBar);
    s.addDamageable(this);
    this.hp = this.maxHp = this.maxHp * s.diff.enemyHp;
    this.dmg *= s.diff.enemyDmg;
    this.speed *= s.diff.enemySpeed;
    this.cd = rand(0.5, this.stats.cooldown);
    this.anim.onStep = () => {
      if (this.pos.distanceTo(s.player.pos) < 14) Audio.play('step', { pos: this.pos, vol: 0.5, throttle: 0.08 });
    };
    this.syncModel();
  }

  private syncModel() {
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    this.center.set(this.pos.x, this.pos.y + this.halfHeight, this.pos.z);
  }

  /** Can this enemy see the player right now? */
  canSee(range = this.stats.sight) {
    const s = this.session;
    const p = s.player;
    if (p.hidden || p.dead) return false;
    const d = this.pos.distanceTo(p.pos);
    if (d > range) return false;
    const eye = this.center.clone().setY(this.pos.y + this.halfHeight * 1.7);
    return s.physics.lineOfSight(eye, p.headPos, (c) => c.tag === 'crate' || c.tag === 'moving');
  }

  takeDamage(h: HitInfo) {
    if (this.state === 'dead') return;
    const s = this.session;
    let amt = h.amount;
    if (this.state === 'windup' && h.heavy) amt *= 1.3; // punish
    this.hp -= amt;
    this.aware = true;
    this.hpShowT = 4;
    this.model.flash(0.12);
    Audio.play('hit', { pos: this.center, pitch: rand(0.8, 1.2) });
    s.particles.emit('blood', this.center, { count: 6, color: 0xc02030 });
    const kb = h.knockback / Math.max(1, this.stats.scale * this.stats.scale * 0.8);
    this.vel.x += h.dir.x * kb;
    this.vel.z += h.dir.z * kb;
    if (h.element === 'fire') s.particles.emit('fire', this.center, { count: 10 });
    if (h.element === 'ice') this.speed *= 0.9;
    if (this.hp <= 0) return this.die(h);
    const poise = this.kind === 'brute' || this.kind === 'warrior';
    if (!poise || h.heavy) {
      if (this.state !== 'charge') {
        this.state = 'stagger';
        this.t = h.heavy ? 0.6 : 0.3;
        this.anim.play('hit', 1.2);
      }
    }
  }

  private die(h: HitInfo) {
    const s = this.session;
    this.state = 'dead';
    this.hp = 0;
    this.deathT = 0;
    this.hpBar.visible = false;
    this.anim.play('death', 1.1);
    // Simplified ragdoll: carry knockback momentum through the fall
    this.vel.x += h.dir.x * (h.heavy ? 9 : 5);
    this.vel.z += h.dir.z * (h.heavy ? 9 : 5);
    this.vel.y = h.heavy ? 5 : 2;
    this.yaw = Math.atan2(-h.dir.x, -h.dir.z);
    Audio.play('death', { pos: this.center, vol: 0.4, pitch: 1.4 });
    s.particles.emit('hit', this.center, { count: 20 });
    s.registerKill();
    for (let i = 0; i < this.stats.coins; i++) s.addCoin(this.center.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(0, 1), rand(-0.5, 0.5))));
    s.removeDamageable(this);
    if (this.kind === 'exploder') this.explode();
    this.onDeath?.();
  }

  private explode() {
    const s = this.session;
    s.explode(this.center, 3.2, this.dmg, 'enemy', 'fire');
    this.model.root.visible = false;
    this.deathT = 99;
  }

  update(dt: number) {
    const s = this.session;
    const p = s.player;
    this.t -= dt;
    this.cd -= dt;
    const toP = new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    const dist = toP.length();
    const yawToP = Math.atan2(toP.x, toP.z);
    const st = this.stats;
    let moveDir = new THREE.Vector3();
    let moveSpeed = 0;
    const playing = s.state === 'playing' && !p.dead;

    if (this.state === 'dead') {
      this.deathT += dt;
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 3));
      if (this.deathT > 2.5) {
        this.model.root.position.y -= dt * 0.6;
        if (this.deathT > 4) this.destroy();
      }
    } else {
      // Perception
      if (!this.aware && playing && (this.aggressive ? dist < st.sight * 1.5 : this.canSee())) {
        this.aware = true;
        if (this.state === 'idle' || this.state === 'patrol') this.state = 'chase';
      }
      switch (this.state) {
        case 'idle':
        case 'patrol':
          if (this.patrol.length) {
            const tgt = this.patrol[this.patrolIdx];
            const d = new THREE.Vector3(tgt.x - this.pos.x, 0, tgt.z - this.pos.z);
            if (d.length() < 0.8) this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
            moveDir = d.normalize();
            moveSpeed = this.speed * 0.4;
          }
          if (this.aware) this.state = 'chase';
          break;
        case 'chase': {
          if (!playing) break;
          this.yaw = dampAngle(this.yaw, yawToP, 8, dt);
          if (st.style === 'ranged' || st.style === 'caster') {
            // Keep preferred distance and strafe
            const pref = st.style === 'ranged' ? 12 : 10;
            const side = new THREE.Vector3(-toP.z, 0, toP.x).normalize().multiplyScalar(this.strafe);
            if (dist > pref + 3) moveDir.copy(toP).normalize();
            else if (dist < pref - 4) moveDir.copy(toP).normalize().negate();
            else moveDir.copy(side);
            moveSpeed = this.speed * 0.8;
            if (Math.random() < dt * 0.3) this.strafe *= -1;
            if (this.cd <= 0 && dist < st.range && this.canSee(st.range + 4)) this.beginAttack();
            if (st.style === 'caster') this.healAllies(dt);
          } else if (st.style === 'charger') {
            if (dist > 3.5 && dist < st.range && this.cd <= 0 && this.canSee()) this.beginAttack();
            else {
              moveDir.copy(toP).normalize();
              moveSpeed = this.speed;
              if (dist < 2.2 && this.cd <= 0) this.beginAttack();
            }
          } else {
            if (dist > st.range * 0.8) {
              moveDir.copy(toP).normalize();
              moveSpeed = this.speed * (dist > 8 ? 1.25 : 1);
            }
            if (dist < st.range + 0.4 && this.cd <= 0) this.beginAttack();
          }
          break;
        }
        case 'windup':
          this.yaw = dampAngle(this.yaw, yawToP, st.style === 'charger' ? 10 : 5, dt);
          if (st.style === 'exploder') {
            this.model.flash(0.05);
            if (this.t <= 0) {
              this.hp = 0;
              this.die({ amount: 0, dir: new THREE.Vector3(), knockback: 0, source: 'enemy' });
            }
          } else if (this.t <= 0) this.strike();
          break;
        case 'charge': {
          moveDir.copy(this.chargeDir);
          moveSpeed = this.speed * 4;
          if (Math.random() < 0.5) s.particles.emit('dust', this.pos, { count: 2 });
          const hitP = this.pos.distanceTo(p.pos) < 1.4;
          if (hitP) {
            p.damage(this.dmg, this.pos, 14);
            this.state = 'recover';
            this.t = 1;
          }
          if (this.t <= 0) {
            this.state = 'recover';
            this.t = 0.8;
          }
          break;
        }
        case 'attack':
          if (this.t <= 0) {
            this.state = 'recover';
            this.t = 0.35;
          }
          break;
        case 'recover':
        case 'stagger':
          if (this.t <= 0) this.state = this.aware ? 'chase' : 'idle';
          break;
      }
    }

    // Separation from other enemies
    if (this.state !== 'dead') {
      for (const d of s.damageables) {
        if (d === this || !(d instanceof Enemy) || d.state === 'dead') continue;
        const dx = this.pos.x - d.pos.x, dz = this.pos.z - d.pos.z;
        const dd = Math.hypot(dx, dz);
        const min = this.radius + d.radius + 0.2;
        if (dd < min && dd > 0.001) {
          moveDir.x += (dx / dd) * 0.8;
          moveDir.z += (dz / dd) * 0.8;
        }
      }
      if (dist < 1.1 && this.state !== 'charge') {
        moveDir.x -= (toP.x / (dist || 1)) * 1.2;
        moveDir.z -= (toP.z / (dist || 1)) * 1.2;
      }
    }

    // Physics
    const want = moveDir.lengthSq() > 0.0001 ? moveDir.clone().setY(0).normalize().multiplyScalar(moveSpeed) : new THREE.Vector3();
    const k = Math.min(1, dt * (this.state === 'charge' ? 20 : 8));
    const stunned = this.state === 'stagger' || this.state === 'dead';
    if (!stunned) {
      this.vel.x += (want.x - this.vel.x) * k;
      this.vel.z += (want.z - this.vel.z) * k;
    } else {
      this.vel.x *= Math.max(0, 1 - dt * 4);
      this.vel.z *= Math.max(0, 1 - dt * 4);
    }
    this.vel.y += s.physics.gravity * dt;
    const r = s.physics.moveCharacter(this.pos, this.half, this.vel.clone().multiplyScalar(dt), this.grounded ? 0.45 : 0.1);
    this.grounded = r.grounded;
    if (r.grounded && this.vel.y < 0) this.vel.y = 0;
    if (r.hitWall && this.state === 'charge') {
      this.state = 'stagger';
      this.t = 1.4;
      this.anim.play('hit');
      s.rig.shake(0.15);
      Audio.play('slam', { pos: this.pos, vol: 0.6 });
      s.particles.emit('debris', this.center, { count: 12 });
    }
    if (this.pos.y < s.killY) {
      if (this.state !== 'dead') this.die({ amount: 999, dir: new THREE.Vector3(), knockback: 0, source: 'env' });
      this.destroy();
    }
    if (moveSpeed > 0.2 && this.state !== 'charge' && this.state !== 'dead' && want.lengthSq() > 0.01 && this.state !== 'chase') this.yaw = dampAngle(this.yaw, Math.atan2(want.x, want.z), 8, dt);
    else if (this.state === 'chase' && moveSpeed > 0 && (st.style === 'melee' || st.style === 'exploder')) this.yaw = dampAngle(this.yaw, yawToP, 10, dt);

    this.syncModel();
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.anim.update(dt, { speed: this.state === 'dead' ? 0 : hs, grounded: this.grounded || this.state === 'dead', vy: this.vel.y, crouch: false, sprint: this.state === 'charge', stride: this.stats.scale });
    this.model.updateCloth(s.clock, hs, this.vel.y);

    // HP bar
    this.hpShowT -= dt;
    this.hpBar.visible = this.hpShowT > 0 && this.state !== 'dead';
    if (this.hpBar.visible) {
      this.hpBar.position.set(this.pos.x, this.pos.y + this.halfHeight * 2 + 0.45, this.pos.z);
      this.hpBar.quaternion.copy(s.camera.quaternion);
      this.hpFill.scale.x = Math.max(0.001, this.hp / this.maxHp);
    }
  }

  private beginAttack() {
    const st = this.stats;
    this.state = 'windup';
    this.t = st.windup;
    this.cd = st.cooldown * rand(0.85, 1.2);
    const s = this.session;
    if (st.style === 'ranged') this.anim.play('bowDraw', 1.4);
    else if (st.style === 'caster') this.anim.play('windup', 1.2);
    else if (st.style === 'charger') {
      this.anim.play('roar', 1.5);
      const f = new THREE.Vector3(s.player.pos.x - this.pos.x, 0, s.player.pos.z - this.pos.z).normalize();
      s.fx.telegraphLine(this.pos, Math.atan2(f.x, f.z), 14, 1.4, st.windup, 0xff3020);
      Audio.play('roar', { pos: this.pos, vol: 0.4, pitch: 1.6 });
    } else if (st.style === 'exploder') {
      Audio.play('charge', { pos: this.pos });
      s.fx.telegraph(this.pos, 3.2, st.windup, 0xff6020);
    } else this.anim.play('windup', 1 / Math.max(0.3, st.windup) * 0.5);
  }

  private strike() {
    const s = this.session;
    const p = s.player;
    const st = this.stats;
    if (st.style === 'ranged') {
      this.anim.release('bowDraw');
      this.anim.play('bowRelease', 1.4);
      const from = this.center.clone().setY(this.pos.y + this.halfHeight * 1.6);
      const target = p.center.clone().addScaledVector(p.vel, 0.35);
      const dir = target.sub(from).normalize();
      s.projectiles.spawn({ kind: 'arrow', pos: from, vel: dir.multiplyScalar(26), team: 'enemy', damage: this.dmg, gravity: -2, color: 0xff6030, radius: 0.15 });
      Audio.play('arrow', { pos: this.pos });
      this.state = 'recover';
      this.t = 0.6;
    } else if (st.style === 'caster') {
      this.anim.release('windup');
      this.anim.play('cast', 1.3);
      const from = this.center.clone().setY(this.pos.y + this.halfHeight * 1.8);
      const dir = p.center.clone().sub(from).normalize();
      s.projectiles.spawn({ kind: 'orb', pos: from, vel: dir.multiplyScalar(9), team: 'enemy', damage: this.dmg, color: 0xa040ff, homing: 1.2, target: () => p.center, life: 5, element: 'shadow', radius: 0.35 });
      Audio.play('magic', { pos: this.pos, pitch: 0.7 });
      this.state = 'recover';
      this.t = 0.8;
    } else if (st.style === 'charger') {
      this.chargeDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.state = 'charge';
      this.t = 1.0;
      Audio.play('whoosh', { pos: this.pos });
    } else {
      this.anim.release('windup');
      const act = this.kind === 'brute' ? 'slash3' : rand() < 0.5 ? 'slash1' : 'slash2';
      this.anim.play(act, 1.3, () => {
        if (this.state === 'dead') return;
        const d = this.pos.distanceTo(p.pos);
        const ang = Math.abs(wrapAngle(Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) - this.yaw));
        if (d < st.range + 0.6 && ang < 1.3 && Math.abs(p.pos.y - this.pos.y) < 2) p.damage(this.dmg, this.pos, this.kind === 'brute' ? 12 : 6);
        s.fx.slash(this.center.clone().addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.4), this.yaw, st.range, 0xff4020, act === 'slash3' ? -0.9 : 0, 0.18);
        if (this.kind === 'brute') {
          s.fx.shockwave(this.pos.clone().addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 2), 3, 0xff8040, 0.4);
          s.rig.shake(0.2);
          Audio.play('slam', { pos: this.pos, vol: 0.6 });
        } else Audio.play('swing', { pos: this.pos, pitch: 0.8 });
      });
      this.state = 'attack';
      this.t = 0.45;
    }
  }

  private healAllies(dt: number) {
    const s = this.session;
    this.healT -= dt;
    if (this.healT > 0) return;
    this.healT = 5;
    let healed = false;
    for (const d of s.damageables) {
      if (!(d instanceof Enemy) || d === this || d.state === 'dead') continue;
      if (d.pos.distanceTo(this.pos) < 9 && d.hp < d.maxHp) {
        d.hp = Math.min(d.maxHp, d.hp + d.maxHp * 0.25);
        s.particles.emit('heal', d.center, { count: 14 });
        healed = true;
      }
    }
    if (healed) {
      s.fx.shockwave(this.pos, 9, 0x40ff80, 0.8);
      Audio.play('magic', { pos: this.pos, pitch: 1.3 });
    }
  }

  dispose() {
    this.session.removeDamageable(this);
    this.hpBar.removeFromParent();
    this.hpBar.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    this.disposeMats();
    super.dispose();
  }
}
