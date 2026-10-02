import * as THREE from 'three';
import { AudioService } from '@/audio/AudioService';
import { CameraConfig } from '@/config/camera';
import { AppEnv, GameConfig } from '@/config/game';
import type { QualityPreset } from '@/config/graphics';
import { PhysicsConfig } from '@/config/physics';
import { TrajectoryConfig } from '@/config/trajectory';
import { BotDriver, PracticeBot } from '@/game/bots/PracticeBot';
import { CameraRig } from '@/game/camera/CameraRig';
import { FixedStepAccumulator } from '@/game/core/FixedStepLoop';
import { Simulation } from '@/game/core/Simulation';
import type { CourseData } from '@/game/courses/types';
import { InputController } from '@/game/input/InputController';
import { AimView } from '@/game/render/AimView';
import { BallView } from '@/game/render/BallView';
import { CourseView } from '@/game/render/CourseView';
import { HoleEffect } from '@/game/render/HoleEffect';
import { NameLabel } from '@/game/render/NameLabel';
import { ObstacleView } from '@/game/render/ObstacleView';
import { SceneRenderer } from '@/game/render/SceneRenderer';
import { TrajectoryView } from '@/game/render/TrajectoryView';
import { calculateScore, holeResultName, type HoleResult } from '@/game/scoring/score';
import { computeShotFromScreenDrag, maxDragPixels, type ShotInput } from '@/game/shooting/shot';
import { TrajectoryPredictor, truncateAtBounce, type TrajectoryPrediction } from '@/game/shooting/TrajectoryPredictor';
import { compareLive } from '@/match/liveRanking';
import type { MatchPlayer } from '@/match/types';
import type { OnlineLink } from '@/multiplayer/OnlineLink';
import type { PlayerNetState } from '@/multiplayer/protocol';
import { NetworkConfig } from '@/config/network';
import { useSettings } from '@/settings/settingsStore';
import { useGameStore, type HoleSummary, type LiveRow } from '@/store/gameStore';
import type { Vec3 } from '@/utils/math';

export interface PlayerHoleOutcome extends HoleResult {
  playerId: string;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  course: CourseData;
  players: MatchPlayer[];
  localPlayerId: string;
  /** Pausa sólo permitida en partidas locales (en red el tiempo es del servidor). */
  allowPause: boolean;
  quality?: QualityPreset;
  onProgress?: (progress: number, message: string) => void;
  /** Cuenta atrás terminada: empieza el juego. */
  onStart?: () => void;
  onLocalFinished?: () => void;
  onSpectate?: () => void;
  /** Todos han terminado: resultados del hoyo (una sola vez). Sólo partidas locales. */
  onHoleEnd?: (results: PlayerHoleOutcome[]) => void;
  /** Online: el servidor corrigió una "embocada" predicha que no fue tal. */
  onLocalUnfinished?: () => void;
  /**
   * Partida online: el servidor es la autoridad. La simulación local sólo
   * contiene la bola propia (predicción); las demás se interpolan.
   */
  online?: OnlineLink;
}

const RESULT_LABEL: Record<string, string> = {
  rest: 'Parada',
  hole: 'Hoyo',
  water: 'Agua',
  out_of_bounds: 'Fuera',
  timeout: 'Tiempo',
  pending: '…',
};

type Phase = 'ready' | 'countdown' | 'playing' | 'ended';

interface PlayerVisual {
  player: MatchPlayer;
  ball: BallView;
  label: NameLabel | null;
}

/**
 * Motor de un hoyo: simulación (física + reglas), render, cámara, audio,
 * input, bots de práctica y espectador, con un único bucle rAF. La física corre
 * a paso fijo; el render interpola. Sólo publica en los stores lo que la UI
 * necesita.
 */
export class GameEngine {
  private sim!: Simulation;
  private predictor!: TrajectoryPredictor;
  private botDriver: BotDriver | null = null;
  private botPredictor: TrajectoryPredictor | null = null;
  private view!: SceneRenderer;
  private courseView!: CourseView;
  private visuals = new Map<string, PlayerVisual>();
  private aim!: AimView;
  private trajectory!: TrajectoryView;
  private holeFx!: HoleEffect;
  private obstacleView!: ObstacleView;
  private readonly audio = new AudioService();
  private rig = new CameraRig();
  private input!: InputController;
  private loop = new FixedStepAccumulator(PhysicsConfig.fixedTimestep, PhysicsConfig.maxSubSteps);
  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private disposed = false;
  private phase: Phase = 'ready';
  private paused = false;
  private countdownLeft = 0;
  private lastCountdownShown: number | 'GO' | null = null;
  private goShownUntil = 0;
  private spectateTarget: string | null = null;
  private spectateAt: number | null = null;
  private holeEndAt: number | null = null;
  private currentShot: ShotInput | null = null;
  private prediction: TrajectoryPrediction | null = null;
  private predicted = { shot: null as ShotInput | null, at: 0, mode: '' };
  private resizeObserver?: ResizeObserver;
  private viewport = { w: 1, h: 1 };
  private unsubs: (() => void)[] = [];
  private fps = { frames: 0, acc: 0, value: 0, frameMs: 0, predictionMs: 0 };
  private hudAcc = 0;
  private eventId = 0;
  /** Online: la bola propia se dibuja desde el servidor hasta resincronizar (reconexión). */
  private followServer = false;
  private mismatchSince: number | null = null;

  private constructor(private readonly opts: EngineOptions) {}

  static async create(opts: EngineOptions): Promise<GameEngine> {
    const e = new GameEngine(opts);
    await e.init();
    return e;
  }

  private get localId(): string {
    return this.opts.localPlayerId;
  }

  private async init(): Promise<void> {
    const { canvas, container, course, onProgress, players } = this.opts;
    onProgress?.(0.15, 'Preparando gráficos 3D…');
    this.view = new SceneRenderer(canvas, this.opts.quality);
    onProgress?.(0.35, 'Cargando motor de física…');
    this.sim = await Simulation.create(course, false);
    this.predictor = await TrajectoryPredictor.create(course);
    const bots = players.filter((p) => p.isBot);
    if (bots.length) {
      this.botPredictor = await TrajectoryPredictor.create(course);
      this.botDriver = new BotDriver(
        bots.map((b, i) => new PracticeBot(b.id, b.botSkill ?? 0.75, 7919 * (i + 1) + course.id.length)),
        this.botPredictor,
      );
    }
    if (this.disposed) return;
    onProgress?.(0.7, `Construyendo «${course.name}»…`);
    this.courseView = new CourseView(course);
    this.view.scene.add(this.courseView.group);
    this.view.configureForCourse(course);

    const online = this.opts.online;
    for (const p of players) {
      // Online: cada jugador tiene su propio mundo; aquí sólo se simula la bola propia.
      if (!online || p.id === this.localId) this.sim.addPlayer(p.id, p.name);
      const ball = new BallView(p.color, p.id !== this.localId);
      if (p.id !== this.localId) ball.mesh.castShadow = false;
      const label = p.id === this.localId ? null : new NameLabel(p.name, p.color, p.isBot);
      this.view.scene.add(ball.mesh);
      if (label) this.view.scene.add(label.sprite);
      this.visuals.set(p.id, { player: p, ball, label });
    }
    this.aim = new AimView();
    this.trajectory = new TrajectoryView();
    this.holeFx = new HoleEffect();
    this.obstacleView = new ObstacleView(course.obstacles);
    this.view.scene.add(this.obstacleView.group, this.aim.group, this.trajectory.group, this.holeFx.group);

    const spawn = course.spawnPoints[0]!;
    this.rig.setBounds(course.boundaries.min, course.boundaries.max);
    this.rig.snapBehind(spawn, course.hole.position, spawn.y);

    this.input = new InputController(canvas, {
      canAim: () => this.canAim(),
      ballScreenPosition: () => this.ballScreenPosition(),
      aimStart: () => this.onAimStart(),
      aimMove: (drag) => this.onAimMove(drag),
      aimRelease: () => this.onAimRelease(),
      aimCancel: () => this.onAimCancel(),
      rotateCamera: (y, p) => this.rig.rotate(y, useSettings.getState().invertCameraY ? -p : p),
      zoomCamera: (f) => this.rig.zoom(f),
      resetBall: () => this.resetBall(),
      toggleDebug: () => AppEnv.debugEnabled && useGameStore.getState().toggleDebug(),
      toggleOverview: () => this.toggleOverview(),
      userGesture: () => this.audio.unlock(),
      cycleSpectate: (dir) => this.spectateNext(dir),
    });

    const applyVolumes = () => {
      const s = useSettings.getState();
      this.audio.setVolumes(s.masterVolume, s.sfxVolume, s.musicVolume);
    };
    applyVolumes();
    this.unsubs.push(useSettings.subscribe(applyVolumes));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.bindEvents();
    useGameStore.getState().patchHud({
      courseName: course.name,
      par: course.par,
      shots: 0,
      penalties: 0,
      timeMs: 0,
      holed: false,
      remainingMs: this.sim.remainingMs(this.localId),
      timeLimitMs: this.sim.timeLimitSec === null ? null : this.sim.timeLimitSec * 1000,
      overview: false,
      result: null,
      playerState: 'IDLE',
      aiming: false,
      power: 0,
      lastEvent: null,
    });
    this.publishLive();
    // Gancho de depuración/QA automatizado: sólo con VITE_ENABLE_DEBUG=true.
    if (AppEnv.debugEnabled) (window as unknown as { __minigolf?: GameEngine }).__minigolf = this;
    if (online) {
      this.followServer = true;
      online.onSnapshot = (self) => this.onServerSnapshot(self);
      online.onEvent = (e) => this.onServerEvent(e);
      online.onShot = (m) => m.playerId === this.spectateTarget && this.audio.hit(m.power);
      online.onShotAck = (a) => {
        if (a.ok) return;
        // Tiro rechazado por el servidor: se deshace la predicción.
        const self = online.states.get(this.localId);
        if (self && !self.finished) this.sim.resyncPlayer(this.localId, { position: { x: self.x, y: self.y, z: self.z }, finished: false, completed: false, holed: false });
      };
      if (online.hole) online.sendHoleReady(online.hole.index);
    }
    onProgress?.(1, '¡Listo!');
  }

  private bindEvents(): void {
    const ev = this.sim.events;
    const local = (id: string) => id === this.localId;
    const audible = (id: string) => local(id) || id === this.spectateTarget;
    const toast = (text: string, tone: 'info' | 'good' | 'bad') =>
      useGameStore.getState().patchHud({ lastEvent: { text, tone, id: ++this.eventId } });
    this.unsubs.push(
      ev.on('PLAYER_STATE_CHANGED', ({ playerId, to }) => {
        if (local(playerId)) useGameStore.getState().patchHud({ playerState: to as never });
      }),
      ev.on('SHOT_STARTED', ({ playerId, power }) => audible(playerId) && this.audio.hit(power)),
      ev.on('BALL_HIT', ({ playerId, speed }) => audible(playerId) && this.audio.bounce(speed)),
      ev.on('BALL_IN_HOLE', ({ playerId }) => {
        if (audible(playerId)) {
          this.audio.hole();
          this.holeFx.trigger(this.opts.course.hole.position);
        }
        if (local(playerId)) useGameStore.getState().patchHud({ holed: true });
        else {
          const v = this.visuals.get(playerId);
          if (v) toast(`${v.player.name} ha embocado`, 'info');
        }
      }),
      ev.on('PLAYER_FINISHED', ({ playerId }) => {
        this.publishLive();
        if (local(playerId)) {
          this.publishHud();
          this.handleLocalFinished();
        } else if (playerId === this.spectateTarget) {
          // El jugador observado terminó: pasar al siguiente tras un momento.
          this.spectateAt = this.elapsed + GameConfig.spectateDelaySec;
        }
        if (!this.opts.online && this.sim.allFinished && this.holeEndAt === null) this.holeEndAt = this.elapsed + GameConfig.holeEndDelaySec;
      }),
      ev.on('TIME_UP', ({ playerId }) => {
        if (!local(playerId)) return;
        this.audio.hazard();
        toast('¡Se acabó el tiempo!', 'bad');
      }),
      ev.on('BALL_OUT_OF_BOUNDS', ({ playerId }) => {
        if (audible(playerId)) this.audio.hazard();
        if (local(playerId)) toast(`¡Fuera del campo! +${GameConfig.hazardPenaltyShots} golpe`, 'bad');
      }),
      ev.on('BALL_IN_WATER', ({ playerId }) => {
        if (audible(playerId)) this.audio.hazard();
        if (local(playerId)) toast(`¡Al agua! +${GameConfig.hazardPenaltyShots} golpe`, 'bad');
      }),
      ev.on('SHOT_FINISHED', ({ playerId }) => {
        if (local(playerId)) this.publishHud();
        this.publishLive();
      }),
    );
  }

  private handleLocalFinished(): void {
    useGameStore.getState().patchHud({ result: this.buildSummary() });
    this.opts.onLocalFinished?.();
    if (!this.everyoneFinished()) this.spectateAt = this.elapsed + GameConfig.spectateDelaySec;
  }

  /** Datos de un jugador: simulación local o, para rivales online, el servidor. */
  private info(id: string): { strokes: number; finished: boolean; completed: boolean; timeMs: number; inHole: boolean } {
    const online = this.opts.online;
    if (online && id !== this.localId) {
      const st = online.states.get(id);
      return st
        ? { strokes: st.strokes, finished: st.finished, completed: st.completed, timeMs: st.timeMs, inHole: st.phase === 'in_hole' }
        : { strokes: 0, finished: false, completed: false, timeMs: 0, inHole: false };
    }
    const p = this.sim.getPlayer(id);
    const st = online?.states.get(id);
    return {
      // Tras reconectar, la simulación local no conoce los golpes previos: manda el servidor.
      strokes: Math.max(this.sim.strokes(id), st?.strokes ?? 0),
      finished: p.finishTick !== null,
      completed: p.completed,
      timeMs: this.sim.elapsedMs(id),
      inHole: p.ball.phase === 'in_hole',
    };
  }

  private everyoneFinished(): boolean {
    return this.opts.players.every((p) => this.info(p.id).finished);
  }

  // ---------------- Online ----------------

  /**
   * Reconciliación de la bola propia con el estado autoritativo. Se tolera el
   * desfase temporal de la red (la predicción va por delante) y sólo se corrige
   * si la diferencia persiste con la bola parada.
   */
  private onServerSnapshot(self: PlayerNetState | undefined): void {
    if (!self) return;
    const p = this.sim.getPlayer(this.localId);
    const pos = { x: self.x, y: self.y, z: self.z };
    const resync = () => this.sim.resyncPlayer(this.localId, { position: pos, finished: self.finished, completed: self.completed, holed: self.holed });
    if (this.followServer) {
      if (self.finished || self.phase === 'rest') {
        const wasFinished = p.finishTick !== null;
        resync();
        this.followServer = false;
        if (self.finished && !wasFinished) this.handleLocalFinished();
      }
      return;
    }
    const localFinished = p.finishTick !== null;
    const off = Math.hypot(p.ball.position.x - pos.x, p.ball.position.z - pos.z);
    const mismatch =
      self.finished !== localFinished || (!self.finished && self.phase === 'rest' && p.ball.phase === 'rest' && off > NetworkConfig.correctionThreshold);
    if (!mismatch) {
      this.mismatchSince = null;
      return;
    }
    if (p.ball.isMoving || (!self.finished && self.phase !== 'rest')) return;
    this.mismatchSince ??= this.elapsed;
    if (this.elapsed - this.mismatchSince < 0.6) return;
    this.mismatchSince = null;
    resync();
    if (self.finished && !localFinished) this.handleLocalFinished();
    if (!self.finished && localFinished) {
      this.spectateTarget = null;
      this.spectateAt = null;
      useGameStore.getState().patchHud({ holed: false, result: null });
      this.opts.onLocalUnfinished?.();
    }
  }

  private onServerEvent(e: { kind: string; playerId: string }): void {
    if (e.playerId === this.localId) return;
    const v = this.visuals.get(e.playerId);
    const watched = e.playerId === this.spectateTarget;
    if (e.kind === 'holed') {
      if (watched) {
        this.audio.hole();
        this.holeFx.trigger(this.opts.course.hole.position);
      }
      if (v) useGameStore.getState().patchHud({ lastEvent: { text: `${v.player.name} ha embocado`, tone: 'info', id: ++this.eventId } });
    } else if ((e.kind === 'water' || e.kind === 'out_of_bounds') && watched) {
      this.audio.hazard();
    } else if (e.kind === 'finished') {
      this.publishLive();
      if (watched) this.spectateAt = this.elapsed + GameConfig.spectateDelaySec;
    }
  }

  /** Online: el reloj de la simulación sigue al del servidor; la cuenta atrás termina en su goTick. */
  private onlineTick(): number {
    const link = this.opts.online!;
    const h = link.hole;
    const store = useGameStore.getState();
    const est = link.estimatedTick();
    if (!h) return 1;
    if (h.goTick === null) {
      if (this.phase !== 'ready') this.phase = 'ready';
    } else if (est < h.goTick) {
      if (this.phase === 'ready') {
        this.phase = 'countdown';
        store.patchMatch({ phase: 'countdown' });
      }
      const shown = Math.max(1, Math.ceil(((h.goTick - est) * this.sim.dt)));
      if (shown !== this.lastCountdownShown) {
        this.lastCountdownShown = shown;
        this.audio.countdown(false);
        store.patchMatch({ countdown: shown });
      }
    } else if (this.phase === 'ready' || this.phase === 'countdown') {
      this.phase = 'playing';
      const late = est - h.goTick > 1 / this.sim.dt; // incorporación tardía: sin "GO"
      if (!late) {
        this.audio.countdown(true);
        store.patchMatch({ countdown: 'GO' });
        this.goShownUntil = this.elapsed + 0.8;
      }
      store.patchMatch({ phase: 'playing' });
      this.opts.onStart?.();
    }

    const target = Math.floor(est);
    const local = this.sim.getPlayer(this.localId);
    // Muy por detrás (reconexión, pestaña en segundo plano): saltar al tick actual.
    if (target - this.sim.tick > 240 && !local.ball.isMoving) this.sim.syncTick(target);
    let n = 0;
    while (this.sim.tick < target && n < 16) {
      if (!this.sim.started && h.goTick !== null && this.sim.tick >= h.goTick) this.sim.startHole(h.goTick);
      this.sim.step();
      n++;
    }
    if (!this.sim.started && h.goTick !== null && this.sim.tick >= h.goTick) this.sim.startHole(h.goTick);
    return Math.min(1, Math.max(0, est - (this.sim.tick - 1)));
  }

  private buildSummary(): HoleSummary {
    const p = this.sim.getPlayer(this.localId);
    const course = this.opts.course;
    const strokes = this.sim.strokes(this.localId);
    const timeMs = this.sim.elapsedMs(this.localId);
    return {
      completed: p.completed,
      title: holeResultName(strokes, course.par, p.completed),
      strokes,
      penalties: p.penalties,
      par: course.par,
      timeMs,
      score: calculateScore({ strokes, timeMs, completed: p.completed }, { par: course.par }),
      shots: p.shots.map((s) => ({
        index: s.index + 1,
        power: s.power,
        distance: Math.round(s.distance * 10) / 10,
        bounces: s.bounces,
        result: RESULT_LABEL[s.result] ?? s.result,
      })),
    };
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Cuenta atrás 3-2-1-GO. Nadie puede tirar ni corre el cronómetro hasta el GO. */
  startCountdown(seconds: number = GameConfig.countdownSec): void {
    if (this.phase !== 'ready') return;
    this.phase = 'countdown';
    this.countdownLeft = seconds;
    this.lastCountdownShown = null;
    useGameStore.getState().patchMatch({ phase: 'countdown' });
  }

  setPaused(paused: boolean): void {
    if (!this.opts.allowPause || this.phase === 'ended') return;
    this.paused = paused;
    if (paused) this.onAimCancel();
    this.lastTime = performance.now();
    useGameStore.getState().patchMatch({ paused });
  }

  private tick(dt: number): void {
    const t0 = performance.now();
    this.elapsed += dt;
    this.input.update(dt);
    const online = this.opts.online;
    let alpha = this.loop.alpha;
    if (online) {
      alpha = this.onlineTick();
      this.updateSpectateTimers();
    } else if (!this.paused) {
      this.updatePhase(dt);
      const steps = this.loop.advance(dt);
      for (let i = 0; i < steps; i++) this.sim.step();
      if (this.botDriver && this.phase === 'playing') this.botDriver.update(this.sim, GameConfig.botBudgetMs, performance.now());
      alpha = this.loop.alpha;
    }

    const renderTick = online?.renderTick() ?? 0;
    for (const [id, v] of this.visuals) {
      if (online && (id !== this.localId || this.followServer)) {
        const s = online.buffers.get(id)?.sample(renderTick);
        if (s) v.ball.setPose(s.x, s.y, s.z, s.qx, s.qy, s.qz, s.qw);
      } else {
        v.ball.update(this.sim.getPlayer(id).ball, alpha);
      }
    }
    const local = this.sim.getPlayer(this.localId);
    const mine = this.visuals.get(this.localId)!.ball.mesh.position;
    const localPlaying = local.fsm.state !== 'FINISHED';
    for (const [id, v] of this.visuals) {
      if (!v.label) continue;
      const b = v.ball.mesh.position;
      v.label.sprite.position.set(b.x, b.y + 0.55, b.z);
      // Etiquetas ocultas si tapan tu bola mientras juegas.
      const crowding = localPlaying && Math.hypot(b.x - mine.x, b.z - mine.z) < 0.9;
      v.label.sprite.visible = !this.info(id).inHole && !crowding;
    }
    const aiming = !!this.currentShot && local.fsm.state === 'AIMING';
    if (aiming) {
      this.aim.show(local.ball.position, this.currentShot);
      this.updateTrajectory(local.ball.position, this.currentShot!);
    } else {
      this.aim.hide();
      this.trajectory.hide();
    }
    this.trajectory.update(dt, this.elapsed);
    // Mismo instante que las bolas interpoladas (entre el paso anterior y el actual).
    this.obstacleView.update((this.sim.tick - 1 + alpha) * this.sim.dt);
    this.holeFx.update(dt);

    const focusBall = this.visuals.get(this.spectateTarget ?? this.localId)!.ball.mesh.position;
    const hole = this.opts.course.hole.position;
    this.courseView.update(this.elapsed, dt, Math.hypot(focusBall.x - hole.x, focusBall.z - hole.z));
    this.rig.update(dt, this.cameraFocus(local.fsm.state, focusBall, aiming, dt));
    this.view.render(this.rig.camera);

    this.hudAcc += dt;
    if (this.hudAcc > 0.15) {
      this.hudAcc = 0;
      this.publishHud();
      this.publishLive();
    }
    this.measure(dt, performance.now() - t0);
  }

  private updatePhase(dt: number): void {
    const store = useGameStore.getState();
    if (this.phase === 'countdown') {
      this.countdownLeft -= dt;
      const shown: number | 'GO' = this.countdownLeft > 0 ? Math.ceil(this.countdownLeft) : 'GO';
      if (shown !== this.lastCountdownShown) {
        this.lastCountdownShown = shown;
        this.audio.countdown(shown === 'GO');
        store.patchMatch({ countdown: shown });
      }
      if (shown === 'GO') {
        this.phase = 'playing';
        this.sim.startHole();
        this.goShownUntil = this.elapsed + 0.8;
        store.patchMatch({ phase: 'playing' });
        this.opts.onStart?.();
      }
      return;
    }
    if (this.phase === 'playing') {
      if (this.goShownUntil && this.elapsed >= this.goShownUntil) {
        this.goShownUntil = 0;
        store.patchMatch({ countdown: null });
      }
      this.updateSpectateTimers();
      if (this.holeEndAt !== null && this.elapsed >= this.holeEndAt) {
        this.phase = 'ended';
        this.spectateTarget = null;
        store.patchMatch({ phase: 'ended', spectate: null });
        this.opts.onHoleEnd?.(this.collectResults());
      }
    }
  }

  private updateSpectateTimers(): void {
    if (this.goShownUntil && this.elapsed >= this.goShownUntil) {
      this.goShownUntil = 0;
      useGameStore.getState().patchMatch({ countdown: null });
    }
    if (this.spectateAt !== null && this.elapsed >= this.spectateAt) {
      this.spectateAt = null;
      if (!this.everyoneFinished()) {
        const wasSpectating = this.spectateTarget !== null;
        this.spectateNext(1);
        if (!wasSpectating && this.spectateTarget) this.opts.onSpectate?.();
      }
    }
  }

  private collectResults(): PlayerHoleOutcome[] {
    return [...this.sim.players.values()].map((p) => ({
      playerId: p.id,
      strokes: this.sim.strokes(p.id),
      timeMs: this.sim.elapsedMs(p.id),
      completed: p.completed,
    }));
  }

  /** Cambia el jugador observado (sólo entre los que siguen jugando). */
  spectateNext(dir: 1 | -1): void {
    const local = this.sim.getPlayer(this.localId);
    if (local.fsm.state !== 'FINISHED') return;
    const active = this.opts.players.filter((p) => p.id !== this.localId && !this.info(p.id).finished).map((p) => p.id);
    if (!active.length) {
      this.spectateTarget = null;
    } else {
      const i = this.spectateTarget ? active.indexOf(this.spectateTarget) : -1;
      this.spectateTarget = active[(i + dir + active.length) % active.length]!;
      if (this.rig.isOverview) this.rig.setOverview(false);
    }
    this.publishLive();
  }

  /**
   * Clasificación en vivo: por golpes (los de quien sigue jugando son
   * provisionales); a igualdad, primero quien ya terminó y después el más rápido.
   * Los que no completaron el hoyo van al final.
   */
  private liveRows(): LiveRow[] {
    const rows = this.opts.players.map((pl) => {
      const i = this.info(pl.id);
      return {
        id: pl.id,
        name: pl.name,
        color: pl.color,
        isBot: pl.isBot,
        isLocal: pl.id === this.localId,
        strokes: i.strokes,
        finished: i.finished,
        completed: i.completed,
        timeMs: i.timeMs,
        position: 0,
      };
    });
    rows.sort(compareLive);
    rows.forEach((r, i) => (r.position = i + 1));
    return rows;
  }

  private publishLive(): void {
    const live = this.liveRows();
    const me = live.find((r) => r.isLocal)!;
    const t = this.spectateTarget ? live.find((r) => r.id === this.spectateTarget) : null;
    useGameStore.getState().patchMatch({
      live,
      playersRemaining: live.filter((r) => !r.finished).length,
      position: me.position,
      spectate: t ? { targetId: t.id, name: t.name, strokes: t.strokes, position: t.position, color: t.color } : null,
    });
  }

  /** Foco de la cámara: bola propia u observada; al apuntar, adelantado; tras terminar sin nadie a quien mirar, el hoyo. */
  private cameraFocus(state: string, ball: THREE.Vector3, aiming: boolean, dt: number): Vec3 {
    const hole = this.opts.course.hole.position;
    if (state === 'FINISHED' && !this.spectateTarget) {
      this.rig.rotate(CameraConfig.finishedOrbitSpeed * dt, 0);
      return { x: hole.x, y: hole.y, z: hole.z };
    }
    const focus = { x: ball.x, y: Math.max(ball.y, hole.y - 0.1), z: ball.z };
    if (aiming && this.prediction) {
      const e = this.prediction.end;
      const dx = (e.x - ball.x) * CameraConfig.aimLookAhead;
      const dz = (e.z - ball.z) * CameraConfig.aimLookAhead;
      const len = Math.hypot(dx, dz);
      const k = len > CameraConfig.maxLookAhead ? CameraConfig.maxLookAhead / len : 1;
      focus.x += dx * k;
      focus.z += dz * k;
    }
    return focus;
  }

  /**
   * Inicia una nueva predicción sólo si el tiro cambió lo suficiente (con un
   * intervalo mínimo) y la avanza cada frame con un presupuesto de CPU fijo.
   * Mientras se calcula, se dibuja el tramo ya simulado.
   */
  private updateTrajectory(origin: Vec3, shot: ShotInput): void {
    const mode = useSettings.getState().trajectory;
    if (mode === 'off') {
      this.predictor.cancel();
      this.trajectory.hide();
      return;
    }
    const now = performance.now();
    const prev = this.predicted.shot;
    const changed =
      !prev ||
      this.predicted.mode !== mode ||
      Math.abs(prev.power - shot.power) > TrajectoryConfig.minPowerDelta ||
      Math.abs(Math.atan2(prev.direction.x, prev.direction.z) - Math.atan2(shot.direction.x, shot.direction.z)) > TrajectoryConfig.minAngleDelta;
    if (changed && now - this.predicted.at >= TrajectoryConfig.minIntervalMs) {
      this.predictor.begin(origin, shot, undefined, this.sim.tick);
      this.predicted = { shot: { direction: { ...shot.direction }, power: shot.power }, at: now, mode };
    }
    const pending = this.predictor.partial()?.framesPending ?? 0;
    const budget = Math.min(TrajectoryConfig.maxFrameBudgetMs, TrajectoryConfig.frameBudgetMs * (1 + pending * 0.5));
    const pred = this.predictor.advance(budget);
    if (!pred) {
      const part = this.predictor.partial();
      if (part && part.points.length > 2) {
        const pts = mode === 'short' ? truncateAtBounce(part, TrajectoryConfig.shortMaxBounces) : part.points;
        this.trajectory.setPath(pts, part.bounces.slice(0, mode === 'short' ? TrajectoryConfig.shortMaxBounces : undefined), null);
      }
      return;
    }
    this.prediction = pred;
    this.fps.predictionMs = this.fps.predictionMs * 0.7 + pred.computeMs * 0.3;
    if (mode === 'short') {
      this.trajectory.setPath(truncateAtBounce(pred, TrajectoryConfig.shortMaxBounces), pred.bounces.slice(0, TrajectoryConfig.shortMaxBounces), null);
    } else {
      this.trajectory.setPath(pred.points, pred.bounces, pred.end);
    }
  }

  private publishHud(): void {
    const s = useGameStore.getState();
    const p = this.sim.getPlayer(this.localId);
    const st = this.opts.online?.states.get(this.localId);
    s.patchHud({
      shots: this.info(this.localId).strokes,
      penalties: Math.max(p.penalties, st?.penalties ?? 0),
      timeMs: this.sim.elapsedMs(this.localId),
      remainingMs: this.sim.remainingMs(this.localId),
      overview: this.rig.isOverview,
    });
  }

  private measure(dt: number, frameMs: number): void {
    const f = this.fps;
    f.frames++;
    f.acc += dt;
    f.frameMs = f.frameMs * 0.9 + frameMs * 0.1;
    if (f.acc >= 0.5) {
      f.value = Math.round(f.frames / f.acc);
      f.frames = 0;
      f.acc = 0;
      const store = useGameStore.getState();
      if (store.showDebug) {
        const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        store.setDebug({
          fps: f.value,
          frameMs: Math.round(f.frameMs * 100) / 100,
          ...this.view.stats,
          bodies: this.sim.physics.bodyCount,
          colliders: this.sim.physics.colliderCount,
          memoryMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
          predictionMs: Math.round(f.predictionMs * 100) / 100,
        });
      }
    }
  }

  private canAim(): boolean {
    if (this.paused || this.phase !== 'playing' || this.followServer) return false;
    const s = this.sim.getPlayer(this.localId).fsm.state;
    return s === 'IDLE' || s === 'AIMING';
  }

  private onAimStart(): void {
    if (this.rig.isOverview) this.toggleOverview();
    this.predicted.shot = null;
    this.sim.beginAim(this.localId);
  }

  private onAimMove(drag: { x: number; y: number }): void {
    if (this.sim.getPlayer(this.localId).fsm.state !== 'AIMING') return;
    const sens = useSettings.getState().aimSensitivity;
    this.currentShot = computeShotFromScreenDrag(drag, this.rig.groundBasis(), maxDragPixels(this.viewport.w, this.viewport.h), sens);
    useGameStore.getState().patchHud({ aiming: true, power: this.currentShot?.power ?? 0 });
  }

  private onAimRelease(): void {
    const shot = this.currentShot;
    this.clearAim();
    if (!shot || shot.power < PhysicsConfig.shot.minPower) {
      this.sim.cancelAim(this.localId);
      return;
    }
    const r = this.sim.shoot(this.localId, shot);
    if (!r.ok) this.sim.cancelAim(this.localId);
    // Online: la predicción local ya está en marcha; el servidor valida y aplica en el mismo tick.
    else this.opts.online?.sendShot(shot, r.record.tick);
    this.publishHud();
  }

  private onAimCancel(): void {
    this.clearAim();
    this.sim?.cancelAim(this.localId);
  }

  private clearAim(): void {
    this.currentShot = null;
    this.prediction = null;
    this.predicted.shot = null;
    this.predictor?.cancel();
    this.trajectory?.hide();
    useGameStore.getState().patchHud({ aiming: false, power: 0 });
  }

  resetBall(): void {
    if (this.phase !== 'playing' || this.paused) return;
    this.onAimCancel();
    if (this.sim.resetBall(this.localId)) this.opts.online?.sendReset();
  }

  toggleOverview(): void {
    this.rig.setOverview(!this.rig.isOverview);
    this.audio.ui();
    this.publishHud();
  }

  private ballScreenPosition(): { x: number; y: number } | null {
    const v = new THREE.Vector3().copy(this.visuals.get(this.localId)!.ball.mesh.position).project(this.rig.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.viewport.w, y: ((1 - v.y) / 2) * this.viewport.h };
  }

  private resize(): void {
    const r = this.opts.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    this.viewport = { w, h };
    this.view.resize(w, h);
    this.rig.setAspect(w / h);
  }

  /** Acceso de solo lectura para tests/depuración. */
  get simulation(): Simulation {
    return this.sim;
  }

  get currentPrediction(): TrajectoryPrediction | null {
    return this.prediction;
  }

  /** true mientras hay una predicción calculándose (QA). */
  get predicting(): boolean {
    return this.predictor.busy;
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unsubs.forEach((u) => u());
    this.opts.online?.detachEngine();
    this.resizeObserver?.disconnect();
    this.input?.dispose();
    this.courseView?.dispose();
    for (const v of this.visuals.values()) {
      v.ball.dispose();
      v.label?.dispose();
    }
    this.aim?.dispose();
    this.trajectory?.dispose();
    this.holeFx?.dispose();
    this.obstacleView?.dispose();
    this.audio.dispose();
    this.view?.dispose();
    this.predictor?.dispose();
    this.botPredictor?.dispose();
    this.sim?.dispose();
    const w = window as unknown as { __minigolf?: GameEngine };
    if (w.__minigolf === this) delete w.__minigolf;
  }
}
