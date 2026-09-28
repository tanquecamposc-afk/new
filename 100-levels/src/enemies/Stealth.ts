/**
 * Stealth AI: guards with vision cones and a full state machine
 * (IDLE → PATROL → SUSPICIOUS → ALERT → CHASE → SEARCH → RETURN),
 * noise investigation, takedowns, security cameras and alarm panels.
 */
import * as THREE from 'three';
import { Entity, Damageable, HitInfo, Interactable } from '../entities/Entity';
import { CharacterModel, makeUniqueMaterials } from '../player/CharacterModel';
import { Animator } from '../player/Animator';
import { Audio } from '../audio/AudioManager';
import { boxGeo, glowMat, M } from '../gfx/Materials';
import { dampAngle, rand, wrapAngle } from '../core/math';
import type { Session } from '../levels/Session';

export type GuardState = 'IDLE' | 'PATROL' | 'SUSPICIOUS' | 'ALERT' | 'CHASE' | 'SEARCH' | 'RETURN' | 'DOWN';

/** Shared stealth director: alarm state, hiding zones, detection aggregation. */
export class StealthDirector {
  guards: Guard[] = [];
  cameras: SecurityCamera[] = [];
  alarm = false;
  alarmT = 0;
  grass: THREE.Box3[] = [];
  lastKnown = new THREE.Vector3();
  constructor(private s: Session) {}

  inGrass(p: THREE.Vector3) {
    return this.grass.some((b) => b.containsPoint(p.clone().setY(b.min.y + 0.1)));
  }
  /** Visibility multiplier of the player (0 = invisible). */
  visibility() {
    const p = this.s.player;
    if (p.hidden) return 0;
    let v = 1;
    if (p.crouching) v *= 0.45;
    if (p.crouching && this.inGrass(p.pos)) v = 0;
    if (p.sprinting) v *= 1.4;
    return v;
  }
  raiseAlarm(at: THREE.Vector3) {
    this.lastKnown.copy(at);
    this.s.detected = true;
    if (!this.alarm) {
      this.alarm = true;
      Audio.play('alarm');
      this.s.toast('🚨', 'ALARM', 'Reach an alarm panel to shut it down');
      this.s.post.flashScreen(0xff0000, 0.25, 2);
    }
    this.alarmT = 25;
    for (const g of this.guards) g.hearAlarm(at);
  }
  disableAlarm() {
    if (!this.alarm) return;
    this.alarm = false;
    this.alarmT = 0;
    for (const g of this.guards) if (g.state !== 'DOWN' && g.state !== 'CHASE') g.toSearch();
  }
  update(dt: number) {
    if (this.alarm) {
      this.alarmT -= dt;
      if (this.alarmT <= 0) this.disableAlarm();
      if (Math.floor(this.alarmT * 1.2) !== Math.floor((this.alarmT + dt) * 1.2)) Audio.play('alarm', { vol: 0.4 });
    }
  }
  get maxDetection() {
    return Math.max(0, ...this.guards.filter((g) => g.state !== 'DOWN').map((g) => g.detection), ...this.cameras.map((c) => c.detection));
  }
  get worstState(): string {
    const order: GuardState[] = ['DOWN', 'IDLE', 'PATROL', 'RETURN', 'SEARCH', 'SUSPICIOUS', 'ALERT', 'CHASE'];
    let w: GuardState = 'IDLE';
    for (const g of this.guards) if (order.indexOf(g.state) > order.indexOf(w)) w = g.state;
    return this.alarm ? 'ALARM' : w === 'DOWN' ? 'IDLE' : w;
  }
}

function coneGeo(range: number, fov: number) {
  const g = new THREE.CircleGeometry(range, 24, -fov / 2 + Math.PI / 2, fov);
  g.rotateX(-Math.PI / 2);
  return g;
}

export class Guard extends Entity implements Damageable {
  readonly model: CharacterModel;
  readonly anim: Animator;
  pos = new THREE.Vector3();
  yaw = 0;
  state: GuardState = 'PATROL';
  detection = 0;
  center = new THREE.Vector3();
  radius = 0.5;
  halfHeight = 0.9;
  team: 'enemy' = 'enemy';
  hp = 80;
  alive = true;
  private cone: THREE.Mesh;
  private coneMat: THREE.MeshBasicMaterial;
  private idx = 0;
  private waitT = 0;
  private target = new THREE.Vector3();
  private searchT = 0;
  private lookT = 0;
  private fireCd = 1;
  private half = new THREE.Vector3(0.32, 0.88, 0.32);
  private vel = new THREE.Vector3();
  private it!: Interactable;
  private disposeMats: () => void;
  private icon: THREE.Sprite;
  private baseYaw: number;
  range = 11;
  fov = 1.25;

  constructor(private dir: StealthDirector, start: THREE.Vector3, public route: THREE.Vector3[] = [], yaw = 0, private armed = true) {
    super();
    this.model = new CharacterModel('enemy_guard');
    this.disposeMats = makeUniqueMaterials(this.model);
    this.anim = new Animator(this.model);
    // Rifle
    const gun = new THREE.Group();
    const body = new THREE.Mesh(boxGeo(0.08, 0.12, 0.6), M.darkMetal());
    body.position.z = 0.2;
    const tip = new THREE.Mesh(boxGeo(0.03, 0.03, 0.05), glowMat(0xff3030, 3));
    tip.position.z = 0.52;
    gun.add(body, tip);
    this.model.setWeapon(gun);
    this.pos.copy(start);
    this.yaw = this.baseYaw = yaw;
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(coneGeo(this.range, this.fov), this.coneMat);
    this.cone.renderOrder = 5;
    this.icon = makeIcon();
    this.icon.visible = false;
    this.obj.add(this.model.root);
  }

  init(s: Session) {
    s.scene.add(this.obj, this.cone, this.icon);
    s.addDamageable(this);
    this.dir.guards.push(this);
    this.it = s.addInteractable({ pos: this.pos.clone(), radius: 1.9, prompt: 'Takedown', enabled: false, onInteract: () => this.takedown() });
    this.state = this.route.length > 1 ? 'PATROL' : 'IDLE';
    s.bus.on<{ pos: THREE.Vector3; radius: number; distraction: boolean }>('noise', (n) => this.hear(n.pos, n.radius));
  }

  private hear(pos: THREE.Vector3, radius: number) {
    if (this.state === 'DOWN' || this.state === 'CHASE' || this.state === 'ALERT') return;
    if (pos.distanceTo(this.pos) > radius) return;
    this.state = 'SUSPICIOUS';
    this.target.copy(pos);
    this.waitT = 1.2;
    this.searchT = 7;
    this.detection = Math.max(this.detection, 0.35);
    Audio.play('alert', { pos: this.pos, vol: 0.5 });
  }

  hearAlarm(at: THREE.Vector3) {
    if (this.state === 'DOWN') return;
    this.target.copy(at);
    if (this.state !== 'CHASE') {
      this.state = 'ALERT';
      this.waitT = 0.4;
    }
  }

  toSearch() {
    this.state = 'SEARCH';
    this.searchT = 6;
  }

  private takedown() {
    if (this.state === 'DOWN') return;
    const s = this.session;
    this.knockOut();
    s.player.anim.play('slash3', 1.4);
    Audio.play('hit', { pos: this.pos, pitch: 0.6 });
    s.particles.emit('hit', this.center);
    s.rig.shake(0.15);
    s.registerKill();
  }

  private knockOut() {
    this.state = 'DOWN';
    this.detection = 0;
    this.anim.play('death', 1.2);
    this.cone.visible = false;
    this.icon.visible = false;
    this.it.enabled = false;
    this.alive = false;
    this.session.removeDamageable(this);
  }

  takeDamage(h: HitInfo) {
    if (this.state === 'DOWN') return;
    this.hp -= h.amount;
    this.model.flash(0.1);
    Audio.play('hit', { pos: this.center });
    this.vel.addScaledVector(h.dir, h.knockback);
    if (this.hp <= 0) {
      this.knockOut();
      this.session.registerKill();
      return;
    }
    this.dir.raiseAlarm(this.session.player.pos);
    this.state = 'CHASE';
  }

  private sees(): number {
    const s = this.session;
    const p = s.player;
    const vis = this.dir.visibility();
    if (vis <= 0 || p.dead) return 0;
    const d = this.pos.distanceTo(p.pos);
    const range = this.range * (this.state === 'SEARCH' || this.state === 'ALERT' ? 1.25 : 1);
    if (d > range) return 0;
    const ang = Math.abs(wrapAngle(Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) - this.yaw));
    if (ang > this.fov / 2 && d > 1.6) return 0;
    const eye = this.pos.clone().setY(this.pos.y + 1.65);
    if (!s.physics.lineOfSight(eye, p.headPos.setY(p.pos.y + p.half.y * 1.6))) return 0;
    return vis * (1.4 - d / range);
  }

  update(dt: number) {
    const s = this.session;
    const p = s.player;
    this.center.set(this.pos.x, this.pos.y + 0.9, this.pos.z);
    let move = new THREE.Vector3();
    let speed = 0;
    if (this.state !== 'DOWN' && s.state === 'playing') {
      const seen = this.sees();
      const rate = 0.9 * s.diff.detection;
      if (seen > 0) {
        this.detection = Math.min(1, this.detection + seen * rate * dt * (this.state === 'SUSPICIOUS' || this.state === 'SEARCH' ? 1.8 : 1));
        this.target.copy(p.pos);
        this.dir.lastKnown.copy(p.pos);
      } else if (this.state !== 'CHASE' && this.state !== 'ALERT') this.detection = Math.max(0, this.detection - dt * 0.2);

      if (this.detection >= 1 && this.state !== 'CHASE') {
        this.state = 'CHASE';
        Audio.play('alert', { pos: this.pos });
        this.dir.raiseAlarm(p.pos);
      } else if (this.detection > 0.3 && (this.state === 'PATROL' || this.state === 'IDLE' || this.state === 'RETURN')) {
        this.state = 'SUSPICIOUS';
        this.waitT = 0.8;
        this.searchT = 6;
        Audio.play('alert', { pos: this.pos, vol: 0.5 });
      }

      switch (this.state) {
        case 'IDLE':
          this.lookT += dt;
          this.yaw = dampAngle(this.yaw, this.baseYaw + Math.sin(this.lookT * 0.6) * 1.1, 2, dt);
          break;
        case 'PATROL': {
          const tgt = this.route[this.idx];
          const d = new THREE.Vector3(tgt.x - this.pos.x, 0, tgt.z - this.pos.z);
          if (d.length() < 0.5) {
            this.waitT -= dt;
            if (this.waitT <= 0) {
              this.idx = (this.idx + 1) % this.route.length;
              this.waitT = rand(1, 2.2);
            }
            this.lookT += dt;
            this.yaw += Math.sin(this.lookT * 2) * dt * 0.8;
          } else {
            move = d.normalize();
            speed = 1.8;
          }
          break;
        }
        case 'SUSPICIOUS': {
          // Turn towards the disturbance, then walk there carefully
          const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
          this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), 3, dt);
          this.waitT -= dt;
          if (this.waitT <= 0 && d.length() > 1.2) {
            move = d.normalize();
            speed = 2;
          }
          this.searchT -= dt;
          if (this.searchT <= 0 || (d.length() < 1.2 && this.waitT < -2)) this.state = 'RETURN';
          break;
        }
        case 'ALERT': {
          const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
          this.waitT -= dt;
          if (this.waitT <= 0 && d.length() > 1.5) {
            move = d.normalize();
            speed = 4.5;
          } else if (d.length() <= 1.5) this.toSearch();
          break;
        }
        case 'CHASE': {
          const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
          const dist = d.length();
          this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), 8, dt);
          const see = seen > 0;
          if (see && this.armed && dist < 14) {
            this.fireCd -= dt;
            if (dist > 5) {
              move = d.normalize();
              speed = 2.5;
            }
            if (this.fireCd <= 0) {
              this.fireCd = rand(0.7, 1.1);
              const from = this.pos.clone().setY(this.pos.y + 1.4).addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.6);
              const aim = p.center.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.2, 0.3), rand(-0.4, 0.4))).sub(from).normalize();
              s.projectiles.spawn({ kind: 'bullet', pos: from, vel: aim.multiplyScalar(34), team: 'enemy', damage: 12 * s.diff.enemyDmg, color: 0xff4030, radius: 0.12 });
              Audio.play('shoot', { pos: this.pos });
              s.fx.flash(from, 0xff8040, 10, 0.08, 6);
            }
          } else if (dist > 1.2) {
            move = d.normalize();
            speed = 5.2;
          }
          if (!see) {
            this.searchT -= dt;
            if (dist < 1.5 || this.searchT < -4) this.toSearch();
          } else this.searchT = 0;
          break;
        }
        case 'SEARCH': {
          this.searchT -= dt;
          this.lookT += dt * 2;
          this.yaw += Math.sin(this.lookT) * dt * 2;
          if (this.searchT > 3) {
            const d = new THREE.Vector3(this.target.x - this.pos.x, 0, this.target.z - this.pos.z);
            if (d.length() > 1) {
              move = d.normalize();
              speed = 2.4;
            }
          }
          if (this.searchT <= 0) this.state = 'RETURN';
          this.detection = Math.max(this.detection, 0.2);
          break;
        }
        case 'RETURN': {
          const tgt = this.route[this.idx] ?? this.route[0];
          if (!tgt) {
            this.state = 'IDLE';
            break;
          }
          const d = new THREE.Vector3(tgt.x - this.pos.x, 0, tgt.z - this.pos.z);
          if (d.length() < 0.6) this.state = this.route.length > 1 ? 'PATROL' : 'IDLE';
          else {
            move = d.normalize();
            speed = 2;
          }
          break;
        }
      }
      if (move.lengthSq() > 0 && this.state !== 'CHASE' && this.state !== 'SUSPICIOUS') this.yaw = dampAngle(this.yaw, Math.atan2(move.x, move.z), 6, dt);
    }

    // Movement
    this.vel.x += (move.x * speed - this.vel.x) * Math.min(1, dt * 8);
    this.vel.z += (move.z * speed - this.vel.z) * Math.min(1, dt * 8);
    this.vel.y += s.physics.gravity * dt;
    const r = s.physics.moveCharacter(this.pos, this.half, this.vel.clone().multiplyScalar(dt), 0.45);
    if (r.grounded && this.vel.y < 0) this.vel.y = 0;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.anim.update(dt, { speed: this.state === 'DOWN' ? 0 : hs, grounded: true, vy: 0, crouch: false, sprint: false, aim: this.state === 'CHASE' });

    // Vision cone visual
    if (this.state !== 'DOWN') {
      this.cone.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
      this.cone.rotation.y = this.yaw;
      const col = this.state === 'CHASE' || this.state === 'ALERT' ? 0xff2020 : this.detection > 0.3 || this.state === 'SUSPICIOUS' || this.state === 'SEARCH' ? 0xffc020 : 0x40ff80;
      this.coneMat.color.set(col);
      this.coneMat.opacity = 0.14 + this.detection * 0.15;
      // Status icon
      this.icon.visible = this.state !== 'IDLE' && this.state !== 'PATROL' && this.state !== 'RETURN';
      this.icon.position.set(this.pos.x, this.pos.y + 2.4, this.pos.z);
      (this.icon.material as THREE.SpriteMaterial).color.set(col);
    }
    // Takedown availability: behind the guard and not alerted
    const toP = new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    const behind = Math.abs(wrapAngle(Math.atan2(toP.x, toP.z) - this.yaw)) > 1.9;
    this.it.pos.copy(this.center);
    this.it.enabled = this.state !== 'DOWN' && this.state !== 'CHASE' && behind && toP.length() < 1.9;
  }

  dispose() {
    this.session.removeInteractable(this.it);
    this.session.removeDamageable(this);
    this.cone.removeFromParent();
    this.cone.geometry.dispose();
    this.coneMat.dispose();
    this.icon.removeFromParent();
    this.disposeMats();
    super.dispose();
  }
}

let iconTex: THREE.Texture | null = null;
function makeIcon() {
  if (!iconTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    x.fillStyle = '#fff';
    x.font = '900 56px Arial';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('!', 32, 34);
    iconTex = new THREE.CanvasTexture(c);
    iconTex.userData.cached = true;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, depthTest: false, transparent: true }));
  s.scale.set(0.6, 0.6, 0.6);
  s.renderOrder = 30;
  return s;
}

/** Wall-mounted camera sweeping a vision cone; raises the alarm when it sees the player. */
export class SecurityCamera extends Entity {
  detection = 0;
  enabled = true;
  private head: THREE.Group;
  private cone: THREE.Mesh;
  private coneMat: THREE.MeshBasicMaterial;
  private t = rand(0, 5);
  private yaw = 0;
  constructor(private dir: StealthDirector, public pos: THREE.Vector3, private baseYaw: number, private sweep = 1.2, private range = 13, private tilt = 0.5) {
    super();
    this.head = new THREE.Group();
    const body = new THREE.Mesh(boxGeo(0.35, 0.3, 0.6), M.metal());
    const lens = new THREE.Mesh(boxGeo(0.2, 0.2, 0.05), glowMat(0xff2020, 3));
    lens.position.z = 0.32;
    this.head.add(body, lens);
    const mount = new THREE.Mesh(boxGeo(0.1, 0.5, 0.1), M.darkMetal());
    mount.position.y = 0.3;
    this.obj.add(this.head, mount);
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(coneGeo(1, 0.7), this.coneMat);
  }
  init(s: Session) {
    s.scene.add(this.obj, this.cone);
    this.obj.position.copy(this.pos);
    this.dir.cameras.push(this);
  }
  disable() {
    this.enabled = false;
    this.detection = 0;
    this.cone.visible = false;
    (this.head.children[1] as THREE.Mesh).material = glowMat(0x404040, 1);
  }
  update(dt: number) {
    if (!this.enabled) return;
    const s = this.session;
    this.t += dt;
    this.yaw = this.baseYaw + Math.sin(this.t * 0.6) * this.sweep;
    this.head.rotation.set(this.tilt, this.yaw, 0, 'YXZ');
    // Ground footprint of the view
    const groundY = s.physics.heightAt(this.pos.x, this.pos.z, this.pos.y - 0.5);
    const h = this.pos.y - (isFinite(groundY) ? groundY : this.pos.y - 3);
    const reach = Math.min(this.range, h / Math.tan(this.tilt) + 2);
    this.cone.position.set(this.pos.x, this.pos.y - h + 0.07, this.pos.z);
    this.cone.rotation.y = this.yaw;
    this.cone.scale.setScalar(reach);
    const p = s.player;
    const vis = this.dir.visibility();
    let seen = 0;
    if (vis > 0 && !p.dead && s.state === 'playing') {
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      const ang = Math.abs(wrapAngle(Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) - this.yaw));
      if (d < reach && ang < 0.38 && s.physics.lineOfSight(this.pos, p.center)) seen = vis;
    }
    this.detection = seen ? Math.min(1, this.detection + dt * 1.1 * s.diff.detection * seen) : Math.max(0, this.detection - dt * 0.4);
    this.coneMat.opacity = 0.1 + this.detection * 0.25;
    this.coneMat.color.set(this.detection > 0.3 ? 0xff2020 : 0xffa040);
    if (this.detection >= 1) {
      this.dir.raiseAlarm(p.pos);
      this.detection = 0.6;
    }
  }
  dispose() {
    this.cone.removeFromParent();
    this.cone.geometry.dispose();
    this.coneMat.dispose();
    super.dispose();
  }
}
