/**
 * A Session is one run of one level: it owns the scene, physics world, player,
 * camera rig, entities and level logic, and implements the level lifecycle
 * (intro → playing → victory / death) with anti-duplication guards.
 */
import * as THREE from 'three';
import { Engine } from '../core/Engine';
import { Input } from '../core/Input';
import { EventBus } from '../core/EventBus';
import { PhysicsWorld } from '../physics/Physics';
import { Particles } from '../gfx/Particles';
import { Effects } from '../gfx/Effects';
import { Environment, THEMES } from '../gfx/Environment';
import { PostFX } from '../gfx/PostFX';
import { CameraRig, CamMode, Shot } from '../camera/CameraRig';
import { Player, AbilityMode, Equipment } from '../player/Player';
import { Projectiles } from '../combat/Projectiles';
import { Entity, Damageable, Interactable, Element } from '../entities/Entity';
import { Audio, AmbientName } from '../audio/AudioManager';
import { LevelMeta } from '../data/levels';
import { worldOf } from '../data/worlds';
import { DIFFICULTIES, DifficultyMods, Mutation, resolveMutations } from '../data/modes';
import { Rarity } from '../data/items';
import { useGame, HudState, emptyHud } from '../store/gameStore';
import { useProfile } from '../store/profileStore';
import { WEAPONS } from '../combat/Weapons';
import { buildLevel } from './LevelRegistry';

export interface LevelLogic {
  spawn: THREE.Vector3;
  spawnYaw: number;
  theme: string;
  music: string;
  ambient: AmbientName[];
  objective: string;
  abilityMode: AbilityMode;
  combat?: boolean;
  timeLimit?: number;
  killY?: number;
  cameraMode?: CamMode;
  /** Level handles its own intro shots; otherwise a default fly-in is used. */
  intro?: (s: Session) => Shot[];
  update?(dt: number): void;
  hud?(): Partial<HudState>;
  challengeMet?(): boolean;
  onPlayerFell?(): boolean;
  onWin?(): void;
  cameraTarget?(): THREE.Vector3;
  /** Extra data included in the result (race win, accuracy...). */
  result?(): { raceWon?: boolean; accuracy?: number; bossDefeated?: string };
  dispose?(): void;
  /** Parkour course: ledge climbing from jumps is allowed. */
  parkour?: boolean;
  /** Hide the player's model (vehicle / first-person-ish modes). */
  hidePlayer?: boolean;
  /** Boss music intensity follows boss phase. */
  bossId?: string;
  /** Survival crafting. */
  recipes?(): { id: string; name: string; icon: string; cost: string; can: boolean }[];
  craft?(id: string): void;
}

export type SessionState = 'loading' | 'intro' | 'playing' | 'cutscene' | 'won' | 'dead';

interface Timer {
  t: number;
  fn: () => void;
}

export interface SessionOptions {
  meta: LevelMeta;
  equip: Equipment;
  owned: string[];
  potions: number;
  revives: number;
  difficulty: keyof typeof DIFFICULTIES;
  mutations: Mutation[];
  speedrun: boolean;
  quality: 'low' | 'medium' | 'high';
  shake: number;
  sensitivity: number;
  invertY: boolean;
}

export class Session {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly physics = new PhysicsWorld();
  readonly particles: Particles;
  readonly fx: Effects;
  readonly env: Environment;
  readonly rig: CameraRig;
  readonly bus = new EventBus();
  readonly post: PostFX;
  player!: Player;
  projectiles!: Projectiles;
  logic!: LevelLogic;
  readonly meta: LevelMeta;
  readonly diff: DifficultyMods;
  readonly muts: Set<Mutation>;
  state: SessionState = 'loading';
  entities: Entity[] = [];
  damageables: Damageable[] = [];
  interactables: Interactable[] = [];
  private timers: Timer[] = [];
  time = 0;
  /** Seconds elapsed since the session started (including intro), for animations. */
  clock = 0;
  timeLimit: number | null = null;
  killY = -30;
  checkpoint = new THREE.Vector3();
  checkpointYaw = 0;
  coins = 0;
  totalCoins = 0;
  damageTaken = 0;
  kills = 0;
  enemiesTotal = 0;
  shots = 0;
  hitsLanded = 0;
  secretsFound: string[] = [];
  chestsFound: Rarity[] = [];
  detected = false;
  stats = { jumps: 0 };
  hudFlash: string | null = null;
  private hudT = 0;
  private comboCount = 0;
  private comboT = 0;
  private damageDir: number | null = null;
  private damageDirT = 0;
  readonly runToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private finished = false;
  disposed = false;
  private potions: number;
  private readonly opts: SessionOptions;
  objective = '';
  progress = '';
  bossHud: HudState['boss'] = null;
  private introSkippable = false;

  constructor(readonly engine: Engine, opts: SessionOptions) {
    this.opts = opts;
    this.meta = opts.meta;
    this.diff = DIFFICULTIES[opts.difficulty];
    this.muts = resolveMutations(opts.mutations);
    this.potions = opts.potions;
    this.camera = new THREE.PerspectiveCamera(62, engine.camera.aspect, 0.1, 900);
    this.particles = new Particles(opts.quality === 'low' ? 3000 : 7000);
    this.particles.quality = opts.quality === 'low' ? 0.5 : opts.quality === 'medium' ? 0.8 : 1;
    this.fx = new Effects(opts.quality === 'low' ? 2 : 4);
    this.env = new Environment(this.particles, opts.quality === 'high' ? 2048 : 1024);
    this.post = engine.post;
    this.rig = new CameraRig(this.camera, this.physics);
    this.rig.shakeScale = opts.shake;
    this.rig.sensitivity = opts.sensitivity;
    this.rig.invertY = opts.invertY;
    this.scene.add(this.particles.group, this.fx.group, this.env.group);
    if (this.muts.has('lowgrav')) this.physics.gravity = -13;
  }

  /** Build the level asynchronously, reporting progress for the loading screen. */
  async build(progress: (p: number, label: string) => void) {
    const tick = () => new Promise<void>((r) => setTimeout(r, 16));
    progress(0.08, 'Generating world');
    await tick();
    this.projectiles = new Projectiles();
    this.add(this.projectiles);
    const owned = this.opts.owned;
    this.player = new Player(this, this.opts.equip, owned);
    this.player.potions = this.potions;
    this.player.hasRevive = this.opts.revives > 0;
    progress(0.25, 'Building geometry');
    await tick();
    this.logic = buildLevel(this, this.meta);
    this.enemiesTotal = Math.max(this.enemiesTotal, 0);
    progress(0.55, 'Lighting the scene');
    await tick();
    const theme = THEMES[this.logic.theme] ?? THEMES.city;
    this.env.apply(this.scene, theme, this.engine.envMap, this.diff.darkness, this.engine.renderer);
    this.engine.renderer.toneMappingExposure = theme.exposure;
    this.post.resetTransient();
    this.post.setGrade(theme.grade);
    if (this.muts.has('darkness')) this.post.darkness = 0.75;
    else if (this.diff.darkness) this.post.darkness = this.diff.darkness;
    if (this.meta.variant === 'classic') this.post.setPixelate(4);
    this.killY = this.logic.killY ?? -30;
    this.timeLimit = this.logic.timeLimit ? Math.round(this.logic.timeLimit * this.diff.timeLimit) : null;
    this.player.abilityMode = this.logic.abilityMode;
    this.player.combatEnabled = this.logic.combat !== false;
    this.player.climbEnabled = this.logic.abilityMode === 'airdash' || this.logic.parkour === true;
    this.player.spawn(this.logic.spawn, this.logic.spawnYaw);
    if (this.logic.hidePlayer) this.player.model.root.visible = false;
    this.checkpoint.copy(this.logic.spawn);
    this.checkpointYaw = this.logic.spawnYaw;
    this.rig.mode = this.logic.cameraMode ?? 'follow';
    this.rig.reset(this.cameraTarget(), this.logic.spawnYaw);
    this.objective = this.logic.objective;
    this.engine.speedMul = this.muts.has('speed') ? 1.35 : 1;
    // Count coins placed by builders
    progress(0.75, 'Compiling shaders');
    await tick();
    this.camera.aspect = this.engine.camera.aspect;
    this.camera.updateProjectionMatrix();
    this.rig.update(0.016, 0.016, this.cameraTarget(), false);
    await this.engine.precompile(this.scene, this.camera);
    progress(0.95, 'Spawning entities');
    await tick();
    this.particles.setViewport(this.engine.viewportHeight, this.camera.fov);
    progress(1, 'Ready');
  }

  /** Enter the level: intro cinematic then gameplay. */
  start() {
    this.engine.setScene(this.scene, this.camera);
    this.engine.resetTime();
    Audio.playMusic(this.logic.music);
    Audio.setAmbient(this.logic.ambient);
    Audio.setPaused(false);
    const w = worldOf(Math.min(100, this.meta.num));
    const firstOfWorld = this.meta.num <= 100 && (this.meta.num - 1) % 10 === 0;
    const g = useGame.getState();
    const shots = this.logic.intro ? this.logic.intro(this) : this.defaultIntro();
    this.state = 'intro';
    this.introSkippable = false;
    this.after(0.4, () => (this.introSkippable = true));
    this.post.letterboxTarget = 0.09;
    if (this.meta.world === 0) g.showBanner({ title: this.meta.name, subtitle: this.meta.blurb, color: '#ffe066', big: true }, 3500);
    else if (firstOfWorld) g.showBanner({ title: `WORLD ${w.id} — ${w.name}`, subtitle: `${w.setting} · ${w.subtitle}`, color: w.color, big: true }, 3800);
    else if (this.meta.boss) g.showBanner({ title: this.meta.name, subtitle: this.meta.blurb, color: '#ff4d4d', big: true }, 3500);
    else g.showBanner({ title: `LEVEL ${this.meta.num} — ${this.meta.name}`, subtitle: this.meta.blurb, color: w.color }, 3000);
    this.rig.playShots(shots, () => this.beginPlay());
  }

  private defaultIntro(): Shot[] {
    const p = this.logic.spawn.clone();
    const f = new THREE.Vector3(Math.sin(this.logic.spawnYaw), 0, Math.cos(this.logic.spawnYaw));
    const r = new THREE.Vector3(f.z, 0, -f.x);
    const look = p.clone().setY(p.y + 1.4);
    return [
      {
        from: p.clone().addScaledVector(f, 9).addScaledVector(r, 6).setY(p.y + 7),
        to: p.clone().addScaledVector(f, 3).addScaledVector(r, 2.5).setY(p.y + 2),
        lookFrom: look.clone().addScaledVector(f, 10),
        lookTo: look,
        duration: 2.4,
        fov: 55,
      },
      {
        from: p.clone().addScaledVector(f, 3).addScaledVector(r, 2.5).setY(p.y + 2),
        to: p.clone().addScaledVector(f, -4.6).setY(p.y + 3),
        lookFrom: look,
        lookTo: look.clone().addScaledVector(f, 4),
        duration: 0.8,
        fov: 62,
      },
    ];
  }

  private beginPlay() {
    if (this.state !== 'intro') return;
    this.state = 'playing';
    this.post.letterboxTarget = 0;
    this.post.setDOF(false);
    this.rig.reset(this.cameraTarget(), this.logic.spawnYaw);
    Input.requestPointerLock();
    if (this.objective) useGame.getState().notify({ icon: '🎯', title: 'OBJECTIVE', text: this.objective, color: worldOf(Math.min(100, this.meta.num)).color });
  }

  // ── Entities ──────────────────────────────────────────────────────────────
  add<T extends Entity>(e: T): T {
    e.session = this;
    this.entities.push(e);
    e.init(this);
    return e;
  }

  addDamageable(d: Damageable) {
    this.damageables.push(d);
  }
  removeDamageable(d: Damageable) {
    const i = this.damageables.indexOf(d);
    if (i >= 0) this.damageables.splice(i, 1);
  }
  addInteractable(i: Interactable) {
    this.interactables.push(i);
    return i;
  }
  removeInteractable(i: Interactable) {
    const k = this.interactables.indexOf(i);
    if (k >= 0) this.interactables.splice(k, 1);
  }

  /** Schedule a callback in session time (respects pause & slow-mo). */
  after(sec: number, fn: () => void) {
    this.timers.push({ t: sec, fn });
  }

  cameraTarget() {
    if (this.logic?.cameraTarget) return this.logic.cameraTarget();
    const p = this.player.pos;
    return new THREE.Vector3(p.x, p.y + (this.player.crouching ? 1.1 : 1.55), p.z);
  }

  // ── Frame update ─────────────────────────────────────────────────────────
  update(dt: number, rawDt: number) {
    if (this.disposed) return;
    const screen = useGame.getState().screen;
    if (screen === 'paused' || screen === 'loading') return;
    this.clock += dt;

    if (this.state === 'intro' && this.introSkippable && (Input.wasPressed('jump') || Input.wasPressed('attack') || Input.wasPressed('interact'))) {
      this.rig.skipShots();
    }
    if (this.state === 'playing') {
      this.time += dt;
      if (this.timeLimit !== null && this.time >= this.timeLimit) this.fail('TIME UP');
      if (Input.wasPressed('potion')) this.player.usePotion();
      if (Input.wasPressed('craft') && this.logic.recipes) {
        const g = useGame.getState();
        g.set({ craftOpen: !g.craftOpen });
        if (!g.craftOpen) Input.exitPointerLock();
        else Input.requestPointerLock();
      }
    }

    // Timers
    if (this.timers.length) {
      const due: Timer[] = [];
      for (const t of this.timers) {
        t.t -= dt;
        if (t.t <= 0) due.push(t);
      }
      if (due.length) {
        this.timers = this.timers.filter((t) => t.t > 0);
        for (const t of due) t.fn();
      }
    }

    this.physics.clearDeltas();
    this.logic.update?.(dt);
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.alive) e.update(dt);
    }
    if (this.entities.some((e) => !e.alive)) {
      this.entities = this.entities.filter((e) => {
        if (e.alive) return true;
        e.dispose();
        return false;
      });
    }
    this.player.update(dt);
    this.physics.updateBodies(dt);
    this.particles.camPos.copy(this.camera.position);
    this.particles.update(dt);
    this.fx.update(dt);

    const allowCam = this.state === 'playing' || this.state === 'dead' || this.state === 'won';
    this.rig.update(dt, rawDt, this.cameraTarget(), allowCam && this.state === 'playing');
    this.env.update(dt, this.clock, this.player.pos, this.camera.position);
    Audio.setListener(this.camera.position, this.rig.right());

    // Low health pulse
    this.post.lowHp = this.player.hp < this.player.maxHp * 0.3 && !this.player.dead ? 0.7 : 0;

    this.comboT -= dt;
    if (this.comboT <= 0) this.comboCount = 0;
    this.damageDirT -= dt;
    if (this.damageDirT <= 0) this.damageDir = null;

    this.hudT -= rawDt;
    if (this.hudT <= 0) {
      this.hudT = 1 / 15;
      this.syncHud();
    }
  }

  private syncHud() {
    const p = this.player;
    const w = p.weapon;
    const extra = this.logic.hud?.() ?? {};
    const it = p.currentInteract;
    const hud: HudState = {
      ...emptyHud(),
      hp: Math.max(0, p.hp),
      maxHp: p.maxHp,
      stamina: p.stamina,
      energy: p.energy,
      coins: this.coins,
      totalCoins: this.totalCoins,
      time: this.time,
      timeLimit: this.timeLimit,
      objective: this.objective,
      progress: this.progress,
      prompt: it && this.state === 'playing' ? `${it.hold ? 'HOLD ' : ''}[E] ${it.prompt}${it.hold ? ` ${Math.round(p.interactProgress * 100)}%` : ''}` : null,
      boss: this.bossHud,
      weapon: w.id,
      weapons: p.combatEnabled && p.abilityMode === 'weapon' ? p.ownedWeapons : [],
      potions: this.potions,
      abilityName: abilityLabel(p),
      abilityCost: abilityCost(p),
      mode: p.aiming ? 'aim' : 'foot',
      crosshair: p.aiming || (p.combatEnabled && (w.kind === 'bow' || w.kind === 'staff') && p.abilityMode === 'weapon'),
      damageDir: this.damageDir,
      secretsInLevel: this.meta.hasSecret ? 1 : 0,
      secretsFoundInLevel: this.secretsFound.length,
      noDamage: this.damageTaken === 0,
      combo: this.comboCount,
      ...extra,
    };
    useGame.getState().setHud(hud);
  }

  // ── Gameplay events ──────────────────────────────────────────────────────
  onPlayerDamaged(amount: number, from?: THREE.Vector3) {
    this.damageTaken += amount;
    this.post.hit(Math.min(2, amount / 15));
    this.post.flashScreen(0xff0000, Math.min(0.35, amount / 80), 5);
    this.rig.shake(Math.min(0.5, 0.15 + amount / 60));
    if (from) {
      const d = new THREE.Vector3().subVectors(from, this.player.pos);
      const ang = Math.atan2(d.x, d.z) - this.rig.yaw;
      this.damageDir = ang;
      this.damageDirT = 1;
    }
  }

  onPlayerDeath() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'dead';
    this.engine.slowmo(0.25, 1.4);
    this.post.flashScreen(0x400000, 0.5, 1);
    this.rig.shake(0.4);
    Audio.stopMusic(1.5);
    Audio.play('defeat');
    Input.exitPointerLock();
    const sr = useGame.getState().speedrun;
    if (sr?.active) useGame.getState().set({ speedrun: { ...sr, total: sr.total + this.time } });
    this.after(1.1, () => {
      const g = useGame.getState();
      useProfile.getState().recordDeath();
      g.set({ death: { levelId: this.meta.id, levelName: this.meta.name, time: this.time, coins: this.coins, reason: this.deathReason } });
      g.setScreen('dead');
    });
  }

  private deathReason = 'You were defeated';

  fail(reason: string) {
    if (this.finished || this.player.dead) return;
    this.deathReason = reason;
    this.player.die();
  }

  /** Called by the player when it drops below the kill plane. */
  playerFell() {
    if (this.logic.onPlayerFell?.()) return;
    if (this.muts.has('onelife')) {
      this.deathReason = 'You fell';
      this.player.die();
      return;
    }
    this.deathReason = 'You fell';
    const dmg = 20 * (this.diff.id === 'normal' ? 1 : 1.5);
    this.player.hp -= dmg;
    this.damageTaken += dmg;
    this.post.flashScreen(0x000000, 0.9, 2);
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.die();
      return;
    }
    this.respawnAtCheckpoint();
  }

  respawnAtCheckpoint() {
    this.player.spawn(this.checkpoint.clone().setY(this.checkpoint.y + 0.2), this.checkpointYaw);
    this.player.invuln = 1;
    this.rig.reset(this.cameraTarget(), this.checkpointYaw);
    Audio.play('checkpoint', { vol: 0.5 });
  }

  setCheckpoint(p: THREE.Vector3, yaw: number) {
    if (p.distanceTo(this.checkpoint) < 0.5) return;
    this.checkpoint.copy(p);
    this.checkpointYaw = yaw;
    Audio.play('checkpoint');
    this.toast('🚩', 'CHECKPOINT', 'Progress saved');
  }

  /** Level victory. Guarded so rewards can only be granted once. */
  win() {
    if (this.finished || this.state !== 'playing') return;
    this.finished = true;
    this.state = 'won';
    this.logic.onWin?.();
    Input.exitPointerLock();
    this.player.anim.play('victory');
    this.player.controlEnabled = false;
    this.engine.slowmo(0.35, 0.9);
    Audio.stopMusic(0.8);
    Audio.play('victory');
    this.post.flashScreen(0xffffff, 0.35, 2);
    this.post.setDOF(true, 4.5, 0.003);
    const p = this.player.pos;
    const f = this.player.facing;
    const look = p.clone().setY(p.y + 1.2);
    if (!this.logic.hidePlayer) {
      this.rig.playShots([
        { from: this.camera.position.clone(), to: p.clone().addScaledVector(f, 3.2).setY(p.y + 1.6), lookFrom: look, lookTo: look, duration: 1.2, fov: 50 },
        { from: p.clone().addScaledVector(f, 3.2).setY(p.y + 1.6), to: p.clone().addScaledVector(f, 2.6).add(new THREE.Vector3(f.z * 2, 0, -f.x * 2)).setY(p.y + 1.9), lookFrom: look, lookTo: look, duration: 2.5, fov: 45 },
      ]);
    }
    if (this.meta.id === '100') s_playEnding();
    const delay = this.meta.id === '100' ? 3 : 2.2;
    this.after(delay, () => this.finishVictory());
  }

  private finishVictory() {
    const res = this.logic.result?.() ?? {};
    const ch = this.meta.challenge;
    let challengeMet = this.logic.challengeMet?.() ?? false;
    if (!this.logic.challengeMet) {
      if (ch === 'nodamage') challengeMet = this.damageTaken === 0;
      else if (ch === 'allcoins') challengeMet = this.totalCoins > 0 ? this.coins >= this.totalCoins : this.damageTaken === 0;
      else if (ch === 'secret') challengeMet = this.secretsFound.length > 0;
      else if (ch === 'undetected') challengeMet = !this.detected;
      else if (ch === 'kills') challengeMet = this.enemiesTotal > 0 ? this.kills >= this.enemiesTotal : true;
      else if (ch === 'first') challengeMet = !!res.raceWon;
      else if (ch === 'accuracy') challengeMet = (res.accuracy ?? this.accuracy) >= 0.85;
    }
    const prof = useProfile.getState();
    const summary = prof.completeLevel({
      runToken: this.runToken,
      levelId: this.meta.id,
      time: this.time,
      coins: this.coins,
      damageTaken: this.damageTaken,
      challengeMet,
      kills: this.kills,
      bossDefeated: res.bossDefeated ?? this.meta.boss,
      accuracy: res.accuracy ?? (this.shots > 0 ? this.accuracy : undefined),
      secretsFound: this.secretsFound,
      raceWon: res.raceWon,
      chestsFound: this.chestsFound,
    });
    const g = useGame.getState();
    const sr = g.speedrun;
    if (summary && sr?.active) {
      const splits = [...sr.splits, this.time];
      const total = sr.total + this.time;
      const finished = sr.index >= sr.ids.length - 1;
      const best = prof.data.speedrun.best[sr.runId] ?? Infinity;
      const newRecord = finished ? useProfile.getState().saveSpeedrun(sr.runId, total, splits) : false;
      g.set({ speedrun: { ...sr, splits, total } });
      summary.speedrun = { total, best: Math.min(best, finished ? total : best), split: this.time, nextId: finished ? null : sr.ids[sr.index + 1], finished, newRecord };
    }
    if (summary) {
      g.set({ summary });
      g.setScreen(this.meta.id === '100' ? 'ending' : 'victory');
    }
  }

  get accuracy() {
    return this.shots > 0 ? Math.min(1, this.hitsLanded / this.shots) : 1;
  }

  addCoin(pos: THREE.Vector3, value = 1) {
    this.coins += value;
    Audio.play('coin', { throttle: 0.04 });
    this.particles.emit('coin', pos);
  }

  foundSecret(id: string, pos: THREE.Vector3) {
    if (this.secretsFound.includes(id)) return;
    this.secretsFound.push(id);
    const isNew = useProfile.getState().findSecret(id);
    Audio.play('secret');
    this.particles.emit('magic', pos, { count: 60, velSpread: 6, color: 0xffe066, color2: 0xff8020 });
    this.fx.flash(pos, 0xffe066, 40, 0.8);
    this.engine.slowmo(0.4, 0.6);
    this.post.flashScreen(0xffe8a0, 0.3, 2);
    const total = useProfile.getState().data.secrets.length;
    useGame.getState().showBanner({ title: 'SECRET FOUND!', subtitle: `${isNew ? '+100 coins · ' : ''}Relics: ${total}`, color: '#ffe066' }, 2600);
  }

  foundChest(r: Rarity, pos: THREE.Vector3) {
    this.chestsFound.push(r);
    Audio.play('chest');
    this.particles.emit('coin', pos, { count: 40, velSpread: 5 });
    this.toast('📦', 'CHEST FOUND', `${r.toUpperCase()} chest — added when you finish the level`);
  }

  registerShot() {
    this.shots++;
  }
  registerHit() {
    this.hitsLanded++;
  }

  registerKill() {
    this.kills++;
  }

  combo(hits: number) {
    this.comboCount += hits;
    this.comboT = 2.2;
  }

  emitNoise(pos: THREE.Vector3, radius: number, distraction = false) {
    this.bus.emit('noise', { pos: pos.clone(), radius, distraction });
  }

  /** Explosion: damage, knockback, particles, light, shake, sound. */
  explode(pos: THREE.Vector3, radius: number, damage: number, team: 'player' | 'enemy' | 'env', element: Element = 'fire') {
    this.particles.emit('explosion', pos, { count: Math.round(30 + radius * 8), velSpread: 4 + radius * 2 });
    this.particles.emit('smoke', pos, { count: 10, size: [radius * 0.8, radius * 2] });
    this.particles.emit('debris', pos, { count: 12 });
    if (element === 'ice') this.particles.emit('ice', pos, { count: 30 });
    if (element === 'electric') this.particles.emit('electric', pos, { count: 30 });
    this.fx.shockwave(pos, radius * 1.3, element === 'ice' ? 0x9be8ff : element === 'electric' ? 0x80a0ff : 0xff8030, 0.5);
    this.fx.flash(pos, 0xff8030, 50, 0.4, radius * 5);
    const d = pos.distanceTo(this.player.pos);
    this.rig.shake(Math.max(0, 0.6 - d * 0.03));
    Audio.play('explosion', { pos, vol: 0.8 });
    if (team !== 'player' && d < radius + 0.5) this.player.damage(damage * (1 - (d / (radius + 0.5)) * 0.5), pos, 10);
    if (team !== 'enemy') {
      for (const t of this.damageables) {
        if (!t.alive) continue;
        const dd = t.center.distanceTo(pos);
        if (dd < radius + t.radius) t.takeDamage({ amount: damage, dir: t.center.clone().sub(pos).setY(0).normalize(), knockback: 8, source: 'player', element, heavy: true });
      }
    }
  }

  toast(icon: string, title: string, text: string) {
    useGame.getState().notify({ icon, title, text });
  }

  consumePotion() {
    if (this.potions <= 0) return false;
    if (!useProfile.getState().consumePotion()) return false;
    this.potions--;
    return true;
  }

  consumeRevive() {
    useProfile.getState().consumeRevive();
  }

  setBoss(b: HudState['boss']) {
    this.bossHud = b;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const e of this.entities) e.dispose();
    this.entities = [];
    this.logic?.dispose?.();
    this.player?.dispose();
    this.bus.clear();
    this.timers = [];
    this.physics.clear();
    // Dispose level-specific GPU resources (shared cached ones are kept)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !m.geometry.userData.cached) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => !x.userData.cached && x.dispose());
    });
    this.particles.dispose();
    this.fx.dispose();
    this.env.dispose();
    this.scene.clear();
    this.engine.speedMul = 1;
    this.engine.resetTime();
    Audio.setEngine(-1);
  }
}

function s_playEnding() {
  setTimeout(() => Audio.playMusic('ending'), 1200);
}

function abilityLabel(p: Player): string {
  switch (p.abilityMode) {
    case 'airdash': return 'Air Dash';
    case 'pulse': return 'Reveal Pulse';
    case 'flash': return 'Flash Burst';
    case 'throw': return 'Throw Stone';
    case 'weapon': return p.combatEnabled ? WEAPONS[p.weapon.id].ability.name : '';
    default: return '';
  }
}
function abilityCost(p: Player): number {
  switch (p.abilityMode) {
    case 'airdash': return 30;
    case 'pulse': return 35;
    case 'flash': return 50;
    case 'throw': return 20;
    case 'weapon': return p.weapon.ability.cost;
    default: return 0;
  }
}
