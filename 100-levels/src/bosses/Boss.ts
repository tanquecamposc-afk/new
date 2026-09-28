/**
 * Boss framework. A boss is a Damageable entity driven by coroutines
 * (generator functions yielding wait-seconds or conditions). Each phase has its
 * own attack pool; phase changes trigger a cinematic transition; death triggers
 * a slow-motion explosion sequence before the level is won.
 */
import * as THREE from 'three';
import { Entity, Damageable, HitInfo } from '../entities/Entity';
import { Audio } from '../audio/AudioManager';
import { dampAngle, rand } from '../core/math';
import { useGame } from '../store/gameStore';
import type { Session } from '../levels/Session';
import type { BossModel } from './BossModels';

export type Co = Generator<number | (() => boolean) | undefined, void, unknown>;
export type AttackFn = (b: Boss) => Co;

export interface BossDef {
  id: string;
  name: string;
  subtitle: string;
  hp: number;
  phases: number;
  model: (s: Session) => BossModel;
  radius: number;
  height: number;
  speed: number;
  /** Hover height (flying bosses). */
  hover?: number;
  /** Attack pool per phase index (0-based). */
  attacks: AttackFn[][];
  /** Pause between attacks per phase (seconds). */
  rest?: number[];
  /** Keep this distance from the player while idle. */
  preferredDist?: number;
  onPhase?: (b: Boss, phase: number) => Co | void;
  color: number;
  deathColor?: number;
  /** Take no damage unless `vulnerable` (shielded bosses like The Master). */
  shielded?: boolean;
  /** Extra per-frame behaviour. */
  tick?: (b: Boss, dt: number) => void;
  arenaRadius?: number;
}

export class Boss extends Entity implements Damageable {
  readonly def: BossDef;
  model!: BossModel;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  hp: number;
  maxHp: number;
  phase = 0;
  center = new THREE.Vector3();
  radius: number;
  halfHeight: number;
  team: 'enemy' = 'enemy';
  priority = 3;
  private co: Co | null = null;
  private wait = 0;
  private cond: (() => boolean) | null = null;
  private restT = 2;
  private lastAttack = -1;
  invulnerable = false;
  vulnerable = false;
  dead = false;
  /** Movement target set by coroutines. */
  moveTarget: THREE.Vector3 | null = null;
  moveSpeed = 0;
  facePlayer = true;
  hoverY: number;
  groundY = 0;
  speedMul = 1;
  enraged = false;
  private hurtT = 0;
  private started = false;
  arenaCenter = new THREE.Vector3();
  arenaRadius: number;
  /** Extra data for per-boss logic. */
  data: Record<string, unknown> = {};
  onDefeated: (() => void) | null = null;
  /** Suppress automatic win on death (multi-stage levels). */
  noAutoWin = false;

  constructor(def: BossDef, pos: THREE.Vector3, hpMul = 1) {
    super();
    this.def = def;
    this.pos.copy(pos);
    this.groundY = pos.y;
    this.hp = this.maxHp = def.hp * hpMul;
    this.radius = def.radius;
    this.halfHeight = def.height / 2;
    this.hoverY = def.hover ?? 0;
    this.arenaRadius = def.arenaRadius ?? 20;
  }

  init(s: Session) {
    this.model = this.def.model(s);
    this.obj.add(this.model.root);
    s.scene.add(this.obj);
    this.hp = this.maxHp = this.maxHp * s.diff.enemyHp;
    this.arenaCenter.set(this.pos.x, this.groundY, this.pos.z);
    this.syncHud();
    this.updateTransform(0);
  }

  get player() {
    return this.session.player;
  }
  get playerPos() {
    return this.session.player.pos;
  }
  get forward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  get dmgMul() {
    return this.session.diff.enemyDmg * (this.enraged ? 1.25 : 1);
  }
  distToPlayer() {
    return Math.hypot(this.playerPos.x - this.pos.x, this.playerPos.z - this.pos.z);
  }
  yawToPlayer() {
    return Math.atan2(this.playerPos.x - this.pos.x, this.playerPos.z - this.pos.z);
  }

  /** Begin fighting (after intro). */
  start() {
    this.started = true;
    this.restT = 1.2;
  }

  run(co: Co) {
    this.co = co;
    this.wait = 0;
    this.cond = null;
  }

  private stepCo(dt: number) {
    if (!this.co) return;
    if (this.wait > 0) {
      this.wait -= dt * this.speedMul;
      if (this.wait > 0) return;
    }
    if (this.cond) {
      if (!this.cond()) return;
      this.cond = null;
    }
    // Run until the coroutine yields a wait
    for (let guard = 0; guard < 20; guard++) {
      const r = this.co.next();
      if (r.done) {
        this.co = null;
        return;
      }
      const v = r.value;
      if (typeof v === 'number') {
        this.wait = v;
        return;
      }
      if (typeof v === 'function') {
        if (!v()) {
          this.cond = v;
          return;
        }
      } else return; // undefined → next frame
    }
  }

  takeDamage(h: HitInfo) {
    if (this.dead || !this.started) return;
    const s = this.session;
    if (this.invulnerable || (this.def.shielded && !this.vulnerable)) {
      s.particles.emit('sparks', h.point ?? this.center, { count: 8, color: 0x80c0ff });
      Audio.play('shield', { pos: this.center, throttle: 0.2 });
      return;
    }
    let amt = h.amount * (this.vulnerable && !this.def.shielded ? 1.6 : 1);
    this.hp = Math.max(0, this.hp - amt);
    this.hurtT = 0.1;
    this.model.flash?.();
    Audio.play('hit', { pos: this.center, pitch: 0.7 });
    s.particles.emit('hit', h.point ?? this.center, { count: 10 });
    amt = 0;
    if (this.hp <= 0) return this.die();
    // Phase thresholds
    const next = Math.min(this.def.phases - 1, Math.floor((1 - this.hp / this.maxHp) * this.def.phases));
    if (next > this.phase) this.enterPhase(next);
    this.syncHud();
  }

  private enterPhase(p: number) {
    const s = this.session;
    this.phase = p;
    this.invulnerable = true;
    this.vulnerable = false;
    this.moveTarget = null;
    const prevState = s.state;
    if (prevState === 'playing') s.state = 'cutscene';
    Audio.play('roar', { pos: this.center });
    Audio.setMusicIntensity(Math.min(2, p));
    this.model.action?.('roar');
    s.fx.shockwave(this.pos, 14, this.def.color, 1);
    s.post.flashScreen(this.def.color, 0.3, 2);
    s.rig.shake(0.5);
    useGame.getState().showBanner({ title: `PHASE ${p + 1}`, subtitle: this.def.name, color: '#' + new THREE.Color(this.def.color).getHexString() }, 2200);
    // Push the player back
    const away = s.player.pos.clone().sub(this.pos).setY(0).normalize();
    s.player.impulse(new THREE.Vector3(away.x * 12, 6, away.z * 12));
    // Short cinematic shot of the boss
    const look = this.center.clone();
    const cp = this.pos.clone().addScaledVector(away, this.radius + 7).setY(this.pos.y + this.halfHeight * 1.2 + 1);
    s.rig.playShots([{ from: s.camera.position.clone(), to: cp, lookFrom: look, lookTo: look, duration: 0.7, fov: 50 }, { from: cp, to: cp.clone().addScaledVector(away, 1.5), lookFrom: look, lookTo: look, duration: 1.1, fov: 48 }]);
    const custom = this.def.onPhase?.(this, p);
    const self = this;
    this.run(
      (function* () {
        yield 1.9;
        if (custom) yield* custom;
        self.invulnerable = false;
        if (s.state === 'cutscene') s.state = 'playing';
        self.restT = 0.6;
      })(),
    );
    this.syncHud();
  }

  private die() {
    const s = this.session;
    this.dead = true;
    this.co = null;
    this.hp = 0;
    this.syncHud();
    s.removeDamageable(this);
    this.model.action?.('death');
    Audio.stopMusic(0.5);
    Audio.play('roar', { pos: this.center, pitch: 0.7 });
    s.engine.slowmo(0.2, 2.6);
    s.post.setDOF(true, 10, 0.004);
    const col = this.def.deathColor ?? this.def.color;
    let n = 0;
    const boom = () => {
      if (s.disposed) return;
      n++;
      const p = this.center.clone().add(new THREE.Vector3(rand(-1, 1) * this.radius, rand(-0.6, 0.8) * this.halfHeight * 2, rand(-1, 1) * this.radius));
      s.particles.emit('explosion', p, { count: 40, color2: col });
      s.fx.flash(p, col, 60, 0.3, 30);
      Audio.play('explosion', { pos: p, vol: 0.7 });
      s.rig.shake(0.35);
      if (n < 7) s.after(0.12, boom);
      else {
        s.post.flashScreen(0xffffff, 1, 1.2);
        s.particles.emit('explosion', this.center, { count: 150, velSpread: 18, size: [4, 0.5], color2: col });
        s.particles.emit('magic', this.center, { count: 120, velSpread: 12, color: col });
        this.model.root.visible = false;
        s.fx.shockwave(this.pos, 25, col, 1.2);
        s.post.setDOF(false);
        if (this.onDefeated) this.onDefeated();
        if (!this.noAutoWin) s.after(0.8, () => s.win());
      }
    };
    // Orbiting death camera
    const look = this.center.clone();
    const d = this.radius + 8;
    s.rig.playShots([
      { from: look.clone().add(new THREE.Vector3(d, 3, 0)), to: look.clone().add(new THREE.Vector3(0, 4, d)), lookFrom: look, lookTo: look, duration: 0.5, fov: 45 },
      { from: look.clone().add(new THREE.Vector3(0, 4, d)), to: look.clone().add(new THREE.Vector3(-d, 5, 0)), lookFrom: look, lookTo: look, duration: 0.5, fov: 50 },
    ]);
    s.after(0.05, boom);
    s.bus.emit('bossDefeated', this.def.id);
  }

  syncHud() {
    if (!this.session) return;
    this.session.setBoss(this.dead ? null : {
      name: this.def.name,
      subtitle: this.def.subtitle,
      hp: this.hp,
      maxHp: this.maxHp,
      phase: this.phase + 1,
      phases: this.def.phases,
      shield: this.invulnerable || (!!this.def.shielded && !this.vulnerable),
    });
  }

  private chooseAttack() {
    const pool = this.def.attacks[Math.min(this.phase, this.def.attacks.length - 1)];
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === this.lastAttack) i = (i + 1) % pool.length;
    this.lastAttack = i;
    this.run(pool[i](this));
  }

  private updateTransform(dt: number) {
    this.center.set(this.pos.x, this.pos.y + this.halfHeight, this.pos.z);
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    this.model.update(dt, this);
  }

  update(dt: number) {
    const s = this.session;
    this.hurtT -= dt;
    if (!this.dead) {
      if (this.started && (s.state === 'playing' || s.state === 'cutscene')) {
        if (this.co) this.stepCo(dt);
        else if (s.state === 'playing') {
          this.restT -= dt * this.speedMul;
          if (this.restT <= 0 && !s.player.dead) {
            this.chooseAttack();
            const r = this.def.rest?.[this.phase] ?? 1.2;
            this.restT = r * (this.enraged ? 0.6 : 1) * rand(0.8, 1.2);
          } else if (!this.moveTarget) {
            // Idle movement: keep preferred distance
            const pref = this.def.preferredDist ?? 5;
            const d = this.distToPlayer();
            if (Math.abs(d - pref) > 2) {
              const dir = new THREE.Vector3(this.playerPos.x - this.pos.x, 0, this.playerPos.z - this.pos.z).normalize();
              if (d < pref) dir.negate();
              this.pos.addScaledVector(dir, this.def.speed * 0.6 * dt * this.speedMul);
            }
          }
        }
      }
      // Coroutine-driven movement
      if (this.moveTarget) {
        const d = new THREE.Vector3(this.moveTarget.x - this.pos.x, 0, this.moveTarget.z - this.pos.z);
        const l = d.length();
        const step = this.moveSpeed * dt * this.speedMul;
        if (l <= step) {
          this.pos.x = this.moveTarget.x;
          this.pos.z = this.moveTarget.z;
          this.moveTarget = null;
        } else this.pos.addScaledVector(d.divideScalar(l), step);
      }
      // Stay inside the arena
      const off = new THREE.Vector3(this.pos.x - this.arenaCenter.x, 0, this.pos.z - this.arenaCenter.z);
      if (off.length() > this.arenaRadius - this.radius) {
        off.setLength(this.arenaRadius - this.radius);
        this.pos.x = this.arenaCenter.x + off.x;
        this.pos.z = this.arenaCenter.z + off.z;
      }
      // Hover
      if (!this.data.air) {
        const hy = this.groundY + (this.vulnerable ? Math.min(this.hoverY, 0.4) : this.hoverY);
        this.pos.y += (hy + (this.hoverY ? Math.sin(s.clock * 1.5) * 0.3 : 0) - this.pos.y) * Math.min(1, dt * 3);
      }
      if (this.facePlayer) this.yaw = dampAngle(this.yaw, this.yawToPlayer(), 4, dt);
      // Body contact damage
      if (this.started && s.state === 'playing' && this.distToPlayer() < this.radius * 0.8 && Math.abs(this.playerPos.y - this.pos.y) < this.halfHeight * 2) {
        s.player.damage(12 * this.dmgMul, this.pos, 10);
      }
      this.def.tick?.(this, dt);
    }
    this.updateTransform(dt);
  }

  dispose() {
    this.session.removeDamageable(this);
    this.model.dispose?.();
    super.dispose();
  }
}

/** Coroutine helpers. */
export const wait = (sec: number) => sec;
export function* waitUntil(fn: () => boolean): Co {
  yield fn;
}
