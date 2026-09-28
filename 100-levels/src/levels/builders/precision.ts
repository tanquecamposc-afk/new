/**
 * WORLD 7 — PRECISION (levels 61-70): a training center of minigames.
 * Aim (static targets), reaction (green-light only), memory (sequence),
 * speed (pop-ups), timing (pendulums through a ring), archery (drop + wind),
 * moving targets, dodge chamber (turrets) and the PERFECT SHOT series.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Entity, Damageable, HitInfo } from '../../entities/Entity';
import { Turret } from '../../enemies/Creatures';
import { M, glowMat, cachedGeo, mat } from '../../gfx/Materials';
import { Input } from '../../core/Input';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import { rand, clamp } from '../../core/math';
import { getTextTexture } from '../../gfx/Textures';

let targetTex: THREE.Texture | null = null;
function ringTexture() {
  if (targetTex) return targetTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const cols = ['#ffffff', '#e02030', '#ffffff', '#e02030', '#ffd23d'];
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    x.arc(128, 128, 126 - i * 25, 0, Math.PI * 2);
    x.fillStyle = cols[i];
    x.fill();
  }
  targetTex = new THREE.CanvasTexture(c);
  targetTex.colorSpace = THREE.SRGBColorSpace;
  targetTex.userData.cached = true;
  return targetTex;
}

export type TargetColor = 'normal' | 'green' | 'red' | 'blue';

/** Shootable disc target (can move, pop up, change colour). */
export class Target extends Entity implements Damageable {
  center = new THREE.Vector3();
  radius: number;
  halfHeight: number;
  team: 'neutral' = 'neutral';
  rangedOnly = true;
  color: TargetColor = 'normal';
  hitResult: number | null = null;
  life = Infinity;
  private face: THREE.Mesh;
  private rim: THREE.Mesh;
  private k = 0;
  private dying = false;
  motion: ((t: number, out: THREE.Vector3) => void) | null = null;
  private t = 0;
  onHit: ((ring: number, t: Target) => void) | null = null;
  onExpire: ((t: Target) => void) | null = null;
  label: THREE.Mesh | null = null;
  constructor(public base: THREE.Vector3, size = 0.8, public facing = Math.PI) {
    super();
    this.radius = size;
    this.halfHeight = size;
    this.face = new THREE.Mesh(cachedGeo('targetFace', () => new THREE.CircleGeometry(1, 40)), new THREE.MeshBasicMaterial({ map: ringTexture(), toneMapped: false }));
    this.face.scale.setScalar(size);
    this.rim = new THREE.Mesh(cachedGeo('targetRim', () => new THREE.TorusGeometry(1, 0.06, 8, 40)), glowMat(0xffffff, 2));
    this.rim.scale.setScalar(size);
    const back = new THREE.Mesh(cachedGeo('targetBack', () => new THREE.CylinderGeometry(1, 1, 0.1, 32).rotateX(Math.PI / 2).translate(0, 0, -0.06)), M.darkMetal());
    back.scale.set(size, size, 1);
    const pole = new THREE.Mesh(cachedGeo('targetPole', () => new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, -0.5, 0)), M.metal());
    pole.scale.y = Math.max(0.1, base.y - 0.1);
    pole.position.y = -size;
    this.obj.add(this.face, this.rim, back, pole);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    s.addDamageable(this);
    this.obj.position.copy(this.base);
    this.obj.rotation.y = this.facing;
    this.obj.scale.setScalar(0.01);
    Audio.play('whoosh', { pos: this.base, vol: 0.3, pitch: 1.6 });
  }
  setColor(c: TargetColor) {
    this.color = c;
    const col = c === 'green' ? 0x40ff60 : c === 'red' ? 0xff2030 : c === 'blue' ? 0x40a0ff : 0xffffff;
    this.rim.material = glowMat(col, c === 'normal' ? 2 : 4);
    (this.face.material as THREE.MeshBasicMaterial).color.set(c === 'normal' ? 0xffffff : col);
  }
  /** Normal of the face (world). */
  get normal() {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }
  /** Ring 5 (bullseye) .. 1 (edge) from a hit point. */
  ringAt(p: THREE.Vector3) {
    const d = p.distanceTo(this.center) / this.radius;
    return clamp(5 - Math.floor(d * 5), 1, 5);
  }
  takeDamage(h: HitInfo) {
    if (this.dying) return;
    const ring = h.point ? this.ringAt(h.point) : 3;
    this.hit(ring);
  }
  hit(ring: number) {
    if (this.dying) return;
    this.hitResult = ring;
    this.dying = true;
    this.session.particles.emit('sparks', this.center, { count: 20, color: ring >= 5 ? 0xffd23d : 0xffffff });
    this.session.particles.emit('debris', this.center, { count: 8, color: 0xffffff });
    this.onHit?.(ring, this);
  }
  expire() {
    if (this.dying) return;
    this.dying = true;
    this.onExpire?.(this);
  }
  update(dt: number) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0 && !this.dying) this.expire();
    if (this.motion) {
      const p = new THREE.Vector3();
      this.motion(this.t, p);
      this.obj.position.copy(this.base).add(p);
    }
    this.k += ((this.dying ? 0 : 1) - this.k) * Math.min(1, dt * 12);
    this.obj.scale.setScalar(Math.max(0.01, this.k));
    this.obj.rotation.x = this.dying ? (1 - this.k) * 1.4 : 0;
    this.center.copy(this.obj.position);
    if (this.dying && this.k < 0.02) this.destroy();
  }
  dispose() {
    this.session.removeDamageable(this);
    super.dispose();
  }
}

interface Stage {
  name: string;
  start(): void;
  update(dt: number): void;
  done: boolean;
  failed?: boolean;
}

export function buildPrecision(s: Session, variant: string): LevelLogic {
  const b = new Builder(s, s.meta.num * 61 + 3);
  const floor = M.grid();
  const wall = mat('trainWall', { tex: 'grid', color: 0xd8e0ec, roughness: 0.5 });
  // Shooting booth
  b.plat(0, 0, 0, 10, 6, M.darkMetal());
  b.box(new THREE.Vector3(0, 0.55, 3.2), new THREE.Vector3(10, 1.1, 0.3), mat('rail', { color: 0x3a4250, metalness: 0.5, roughness: 0.65 }));
  b.neon(new THREE.Vector3(-5, 1.12, 3.35), new THREE.Vector3(5, 1.12, 3.35), 0xff3d9a, 0.06);
  // Range
  b.plat(0, -0.5, 40, 60, 70, floor, 1, { tile: 4 });
  for (const x of [-30, 30]) b.box(new THREE.Vector3(x, 6, 40), new THREE.Vector3(1, 13, 72), wall, { tile: 4 });
  b.box(new THREE.Vector3(0, 6, 75.5), new THREE.Vector3(61, 13, 1), wall, { tile: 4 });
  b.box(new THREE.Vector3(0, 6, -3.5), new THREE.Vector3(12, 13, 1), wall, { tile: 4 });
  for (const x of [-5.5, 5.5]) b.box(new THREE.Vector3(x, 6, 0), new THREE.Vector3(1, 13, 6), wall, { tile: 4 });
  // Distance markers
  for (const z of [10, 20, 30, 45, 60]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: getTextTexture(`${z}m`, '#34d4ff', 'rgba(0,0,0,0)', 256, '900 110px Orbitron, Arial Black'), transparent: true, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI;
    m.position.set(-26, 0.02, z);
    b.deco(m);
    b.neon(new THREE.Vector3(-29.5, 0.05, z), new THREE.Vector3(29.5, 0.05, z), 0x34d4ff, 0.05);
  }
  for (let i = 0; i < 4; i++) b.light(new THREE.Vector3(-15 + i * 10, 11, 35), 0xffffff, 8, 40);

  let score = 0;
  let hits = 0;
  let shots = 0;
  let streak = 0;
  let wind = 0;
  const targets: Target[] = [];
  const spawnTarget = (p: THREE.Vector3, size = 0.8, life = Infinity) => {
    const t = s.add(new Target(p, size));
    t.life = life;
    targets.push(t);
    return t;
  };
  const cleanTargets = () => {
    for (const t of targets) if (t.alive) t.expire();
    targets.length = 0;
  };
  const addScore = (ring: number, mult = 1) => {
    hits++;
    streak++;
    const pts = Math.round(ring * 20 * mult * (1 + Math.min(streak, 10) * 0.1));
    score += pts;
    Audio.play('target', { pitch: 0.8 + ring * 0.1 });
    if (ring >= 5) s.toast('🎯', 'BULLSEYE', `+${pts}`);
  };
  const miss = () => {
    streak = 0;
    Audio.play('miss');
  };
  const rangePos = (zMin: number, zMax: number, spread = 12) => new THREE.Vector3(rand(-spread, spread), rand(1.4, 5), rand(zMin, zMax));

  // ── Stage factories ──────────────────────────────────────────────────────
  const aimStage = (n: number, zMin = 12, zMax = 35, size = 0.85): Stage => {
    let left = n;
    const st: Stage = {
      name: 'STATIC TARGETS', done: false,
      start() {
        for (let i = 0; i < Math.min(3, n); i++) spawnNext();
      },
      update() {},
    };
    const spawnNext = () => {
      const t = spawnTarget(rangePos(zMin, zMax), size);
      t.onHit = (ring) => {
        addScore(ring);
        left--;
        s.progress = `${st.name}: ${n - left}/${n}`;
        if (left <= 0) st.done = true;
        else if (left >= 3 || targets.filter((x) => x.alive && !x.hitResult).length < left) spawnNext();
      };
    };
    return st;
  };
  const movingStage = (n: number, speed: number): Stage => {
    let left = n;
    const st: Stage = {
      name: 'MOVING TARGETS', done: false,
      start() {
        for (let i = 0; i < 3; i++) spawn();
      },
      update() {},
    };
    const spawn = () => {
      const t = spawnTarget(rangePos(15, 40, 6), 0.8);
      const ph = rand(0, 6), amp = rand(6, 14), vy = rand(0, 1.5);
      t.motion = (tt, out) => out.set(Math.sin(tt * speed * 0.35 + ph) * amp, Math.sin(tt * speed * 0.5 + ph) * vy, 0);
      t.onHit = (ring) => {
        addScore(ring, 1.3);
        left--;
        s.progress = `${st.name}: ${n - left}/${n}`;
        if (left <= 0) st.done = true;
        else if (left >= 3) spawn();
      };
    };
    return st;
  };
  const popupStage = (n: number, need: number, life: number): Stage => {
    let spawned = 0, got = 0, t = 0;
    const st: Stage = {
      name: 'POP-UP', done: false, start() {},
      update(dt) {
        t -= dt;
        if (t <= 0 && spawned < n) {
          t = life * 0.75;
          spawned++;
          const tg = spawnTarget(rangePos(10, 30, 14), 0.7, life);
          tg.onHit = (ring) => {
            addScore(ring, 1.5);
            got++;
          };
          tg.onExpire = () => miss();
        }
        s.progress = `${st.name}: ${got}/${need} (${n - spawned} left)`;
        if (got >= need) st.done = true;
        else if (spawned >= n && !targets.some((x) => x.alive && x.hitResult === null && x.life > 0)) {
          st.failed = true;
          st.done = true;
        }
      },
    };
    return st;
  };
  const reactionStage = (rounds: number, window: number): Stage => {
    let round = 0, t = 0, phase: 'wait' | 'go' | 'gap' = 'gap', tg: Target | null = null, good = 0;
    const st: Stage = {
      name: 'REACTION', done: false, start() {},
      update(dt) {
        t -= dt;
        if (phase === 'gap' && t <= 0) {
          if (round >= rounds) {
            st.done = true;
            st.failed = good < Math.ceil(rounds * 0.6);
            return;
          }
          round++;
          tg = spawnTarget(rangePos(12, 22, 8), 1);
          tg.setColor('blue');
          phase = 'wait';
          t = rand(0.8, 2.4);
          const decoy = Math.random() < 0.3;
          tg.onHit = (ring) => {
            if (tg!.color === 'green') {
              addScore(ring, 2);
              good++;
            } else {
              miss();
              s.toast('✖', 'TOO EARLY', tg!.color === 'red' ? 'Never shoot red!' : 'Wait for green');
            }
            phase = 'gap';
            t = 0.8;
          };
          (tg as Target & { decoy?: boolean }).decoy = decoy;
        } else if (phase === 'wait' && t <= 0 && tg) {
          const decoy = (tg as Target & { decoy?: boolean }).decoy;
          tg.setColor(decoy ? 'red' : 'green');
          Audio.play('alert');
          phase = 'go';
          t = decoy ? 1.2 : window;
        } else if (phase === 'go' && t <= 0 && tg) {
          if (tg.color === 'green') miss();
          else good++;
          tg.expire();
          phase = 'gap';
          t = 0.8;
        }
        s.progress = `${st.name}: round ${round}/${rounds} · ${good} good`;
      },
    };
    return st;
  };
  const memoryStage = (lengths: number[]): Stage => {
    let li = 0, seq: number[] = [], showI = 0, t = 1, mode: 'show' | 'input' | 'idle' = 'idle', inputI = 0;
    const row: Target[] = [];
    const st: Stage = {
      name: 'RECALL', done: false,
      start() {
        for (let i = 0; i < 6; i++) {
          const tg = spawnTarget(new THREE.Vector3(-10 + i * 4, 3, 20), 0.9);
          tg.hit = (ring: number) => {
            if (mode !== 'input') return;
            if (i === seq[inputI]) {
              addScore(ring);
              inputI++;
              flash(tg, 'green');
              if (inputI >= seq.length) {
                li++;
                if (li >= lengths.length) {
                  st.done = true;
                  row.forEach((r) => r.expire());
                } else next();
              }
            } else {
              miss();
              flash(tg, 'red');
              mode = 'idle';
              t = 1;
              showI = 0;
              s.after(1, () => (mode = 'show'));
            }
          };
          tg.takeDamage = (h: HitInfo) => tg.hit(h.point ? tg.ringAt(h.point) : 3);
          row.push(tg);
        }
        next();
      },
      update(dt) {
        t -= dt;
        if (mode === 'show' && t <= 0) {
          if (showI < seq.length) {
            flash(row[seq[showI]], 'blue');
            Audio.play('bell', { pitch: 1 + seq[showI] * 0.12 });
            showI++;
            t = 0.7;
          } else {
            mode = 'input';
            inputI = 0;
            Audio.play('go');
          }
        }
        s.progress = `${st.name}: sequence ${li + 1}/${lengths.length} ${mode === 'input' ? '— SHOOT IN ORDER' : '— WATCH'}`;
      },
    };
    const flash = (tg: Target, c: 'green' | 'red' | 'blue') => {
      tg.setColor(c);
      s.after(0.45, () => tg.alive && tg.setColor('normal'));
    };
    const next = () => {
      seq = Array.from({ length: lengths[li] }, () => Math.floor(Math.random() * 6));
      mode = 'idle';
      showI = 0;
      s.after(1, () => {
        mode = 'show';
        t = 0;
      });
    };
    return st;
  };
  const timingStage = (need: number): Stage => {
    let got = 0;
    const ringZ = 22;
    const st: Stage = {
      name: 'TIMING', done: false,
      start() {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 8, 40), glowMat(0x3dffa2, 3));
        ring.position.set(0, 4, ringZ - 0.5);
        s.scene.add(ring);
        for (let i = 0; i < 3; i++) spawn(i);
      },
      update() {
        s.progress = `${st.name}: ${got}/${need} perfect hits (only inside the ring!)`;
      },
    };
    const spawn = (i: number) => {
      const tg = spawnTarget(new THREE.Vector3(0, 4, ringZ + i * 0.01), 0.7);
      const speed = rand(0.9, 1.6), ph = rand(0, 6), amp = 11;
      tg.motion = (tt, out) => out.set(Math.sin(tt * speed + ph) * amp, 0, 0);
      tg.onHit = (ring, t) => {
        if (Math.abs(t.center.x) < 1.9) {
          addScore(ring, 2);
          got++;
          if (got >= need) st.done = true;
        } else {
          miss();
          s.toast('⏱', 'OUTSIDE THE RING', 'Shoot as it crosses the green ring');
        }
        if (!st.done) spawn(i);
      };
    };
    return st;
  };
  const archeryStage = (need: number, minScore: number): Stage => {
    let got = 0;
    const st: Stage = {
      name: 'ARCHERY', done: false,
      start() {
        for (let i = 0; i < 3; i++) spawn();
        wind = rand(-3, 3);
      },
      update() {
        s.progress = `${st.name}: ${got}/${need} · wind ${wind > 0 ? '→' : '←'} ${Math.abs(wind).toFixed(1)}`;
        if (got >= need) st.done = true;
      },
    };
    const spawn = () => {
      const tg = spawnTarget(rangePos(20, 58, 12), 1.2);
      tg.onHit = (ring) => {
        addScore(ring, 2);
        got++;
        wind = rand(-4, 4);
        if (got + targets.filter((x) => x.alive && x.hitResult === null).length < need + 2) spawn();
      };
    };
    void minScore;
    return st;
  };

  // ── Dodge chamber (on foot) ───────────────────────────────────────────────
  const dodgeMode = variant === 'dodge';
  let survive = variant === 'dodge' ? 45 : 0;
  if (dodgeMode) {
    // Arena with turrets at the edges
    b.plat(0, 0, 25, 26, 26, M.grid(), 1, { tile: 4 });
    for (const [x, z] of [[-11, 14], [11, 14], [-11, 36], [11, 36], [0, 38]]) b.add(new Turret(new THREE.Vector3(x, 0, z), 1.3, 14, false, 16, x === 0 ? 'spin' : 'aim'));
    b.add(new Turret(new THREE.Vector3(0, 0, 12.5), 2.2, 12, false, 14, 'spread'));
  }

  const plans: Record<string, () => Stage[]> = {
    aim: () => [aimStage(12)],
    reaction: () => [reactionStage(10, 0.9)],
    memory: () => [memoryStage([3, 4, 5])],
    speed: () => [popupStage(30, 18, 1.4)],
    timing: () => [timingStage(8)],
    archery: () => [archeryStage(8, 0)],
    moving: () => [movingStage(15, 1.2)],
    dodge: () => [],
    gauntlet: () => [aimStage(6, 20, 45, 0.7), reactionStage(6, 0.8), movingStage(8, 1.6), popupStage(16, 10, 1.2)],
    boss: () => [aimStage(6, 30, 60, 0.6), movingStage(8, 1.8), popupStage(16, 11, 1.1), reactionStage(6, 0.7), timingStage(5), archeryStage(5, 0)],
  };
  const stages = (plans[variant] ?? plans.aim)();
  let si = -1;
  let startDelay = 1;
  const useBow = variant === 'archery' || variant === 'boss';
  const nextStage = () => {
    cleanTargets();
    si++;
    if (si >= stages.length) {
      s.win();
      return;
    }
    const st = stages[si];
    if (stages.length > 1) useGame.getState().showBanner({ title: `STAGE ${si + 1}/${stages.length}`, subtitle: st.name, color: '#ff3d9a' }, 1800);
    s.after(1.2, () => st.start());
  };

  // Shooting: hitscan blaster (or arrows with drop + wind for archery stages)
  const shoot = () => {
    const cam = s.camera;
    const dir = s.rig.aimDir();
    shots++;
    s.registerShot();
    const archery = useBow && stages[si]?.name === 'ARCHERY';
    s.rig.shake(0.05);
    if (archery) {
      const from = cam.position.clone().addScaledVector(dir, 1);
      const before = hits;
      s.projectiles.spawn({
        kind: 'arrow', pos: from, vel: dir.clone().multiplyScalar(70).add(new THREE.Vector3(wind, 0, 0)), team: 'player', damage: 1, gravity: -9.8, radius: 0.12, color: 0xffe0a0, life: 4,
        onImpact: () => {
          if (hits === before) miss();
        },
      });
      Audio.play('arrow');
      return;
    }
    Audio.play('shoot');
    s.fx.flash(s.player.getWeaponTip(new THREE.Vector3()), 0xff3d9a, 8, 0.08, 6);
    let best: Target | null = null, bestT = 200, bestP = new THREE.Vector3();
    for (const t of targets) {
      if (!t.alive || t.hitResult !== null) continue;
      const n = t.normal;
      const denom = dir.dot(n);
      if (Math.abs(denom) < 1e-4) continue;
      const tt = t.center.clone().sub(cam.position).dot(n) / denom;
      if (tt < 0 || tt > bestT) continue;
      const p = cam.position.clone().addScaledVector(dir, tt);
      if (p.distanceTo(t.center) <= t.radius) {
        best = t;
        bestT = tt;
        bestP = p;
      }
    }
    // Tracer
    const end = cam.position.clone().addScaledVector(dir, best ? bestT : 80);
    s.particles.line('sparks', s.player.getWeaponTip(new THREE.Vector3()), end, 10, { velSpread: 0.1, up: 0, gravity: 0, life: [0.08, 0.15], size: [0.12, 0.05], color: 0xff80c0 });
    if (best) {
      s.registerHit();
      best.takeDamage({ amount: 1, dir, knockback: 0, source: 'player', point: bestP, ranged: true });
    } else miss();
  };

  // Blaster model for the player's hand
  const blaster = new THREE.Group();
  const bb = new THREE.Mesh(cachedGeo('blasterBody', () => new THREE.BoxGeometry(0.1, 0.16, 0.5).translate(0, 0, 0.2)), mat('blaster', { color: 0xe0e4f0, metalness: 0.6, roughness: 0.3 }));
  const bl = new THREE.Mesh(cachedGeo('blasterGlow', () => new THREE.BoxGeometry(0.11, 0.04, 0.3).translate(0, 0.06, 0.25)), glowMat(0xff3d9a, 3));
  blaster.add(bb, bl);
  b.finalize();

  return {
    spawn: new THREE.Vector3(0, 0.05, dodgeMode ? 20 : 0),
    spawnYaw: 0,
    theme: 'training',
    music: variant === 'boss' ? 'perfect' : 'precision',
    ambient: ['hum'],
    objective: dodgeMode ? 'Survive the turrets for 45 seconds' : variant === 'boss' ? 'Clear all six stages' : 'Complete the drill',
    abilityMode: 'none',
    combat: dodgeMode,
    killY: -20,
    update: (dt) => {
      if (s.state !== 'playing') return;
      if (!dodgeMode) {
        s.player.forceAim = true;
        s.rig.mode = 'aim';
        if (s.player.model.weaponR.children[0] !== blaster) s.player.model.setWeapon(blaster);
        // Keep the player in the booth
        s.player.pos.z = clamp(s.player.pos.z, -2, 2.6);
        if (Input.wasPressed('attack')) shoot();
        if (startDelay > 0) {
          startDelay -= dt;
          if (startDelay <= 0) nextStage();
        } else if (si >= 0 && si < stages.length) {
          const st = stages[si];
          st.update(dt);
          if (st.done) {
            if (st.failed) s.fail(`${st.name} failed`);
            else {
              Audio.play('checkpoint');
              nextStage();
            }
          }
        }
      } else {
        survive -= dt;
        s.progress = `Survive: ${Math.max(0, Math.ceil(survive))}s`;
        if (survive <= 0) s.win();
      }
    },
    hud: () => ({ precision: dodgeMode ? null : { score, hits, shots, streak, stage: si >= 0 && si < stages.length ? `${stages[si].name} ${si + 1}/${stages.length}` : '' }, crosshair: !dodgeMode }),
    result: () => ({ accuracy: shots > 0 ? hits / shots : 1 }),
    challengeMet: () => (dodgeMode ? s.damageTaken === 0 : shots > 0 && hits / shots >= 0.85),
  };
}
