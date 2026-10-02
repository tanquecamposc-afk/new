import * as THREE from 'three';
import { AudioService } from '@/audio/AudioService';
import { CameraConfig } from '@/config/camera';
import { AppEnv, GameConfig } from '@/config/game';
import { PhysicsConfig } from '@/config/physics';
import { TrajectoryConfig } from '@/config/trajectory';
import { CameraRig } from '@/game/camera/CameraRig';
import { FixedStepAccumulator } from '@/game/core/FixedStepLoop';
import { Simulation } from '@/game/core/Simulation';
import type { CourseData } from '@/game/courses/types';
import { InputController } from '@/game/input/InputController';
import { AimView } from '@/game/render/AimView';
import { BallView } from '@/game/render/BallView';
import { CourseView } from '@/game/render/CourseView';
import { HoleEffect } from '@/game/render/HoleEffect';
import { ObstacleView } from '@/game/render/ObstacleView';
import { SceneRenderer } from '@/game/render/SceneRenderer';
import { TrajectoryView } from '@/game/render/TrajectoryView';
import { calculateScore, holeResultName } from '@/game/scoring/score';
import { computeShotFromScreenDrag, maxDragPixels, type ShotInput } from '@/game/shooting/shot';
import { TrajectoryPredictor, truncateAtBounce, type TrajectoryPrediction } from '@/game/shooting/TrajectoryPredictor';
import { useSettings } from '@/settings/settingsStore';
import { useGameStore, type HoleSummary } from '@/store/gameStore';
import type { Vec3 } from '@/utils/math';

export const LOCAL_PLAYER_ID = 'local';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  course: CourseData;
  playerName: string;
  onProgress?: (progress: number, message: string) => void;
}

const RESULT_LABEL: Record<string, string> = {
  rest: 'Parada',
  hole: 'Hoyo',
  water: 'Agua',
  out_of_bounds: 'Fuera',
  timeout: 'Tiempo',
  pending: '…',
};

/**
 * Orquesta simulación (física + reglas), render, cámara, audio e input con un
 * único bucle requestAnimationFrame. La física corre a paso fijo; el render
 * interpola. El motor sólo publica en los stores lo que la UI necesita.
 */
export class GameEngine {
  private sim!: Simulation;
  private predictor!: TrajectoryPredictor;
  private view!: SceneRenderer;
  private courseView!: CourseView;
  private ballView!: BallView;
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
  private currentShot: ShotInput | null = null;
  private prediction: TrajectoryPrediction | null = null;
  private predicted = { shot: null as ShotInput | null, at: 0, mode: '' };
  private resizeObserver?: ResizeObserver;
  private viewport = { w: 1, h: 1 };
  private unsubs: (() => void)[] = [];
  private fps = { frames: 0, acc: 0, value: 0, frameMs: 0, predictionMs: 0 };
  private hudAcc = 0;
  private eventId = 0;

  private constructor(private readonly opts: EngineOptions) {}

  static async create(opts: EngineOptions): Promise<GameEngine> {
    const e = new GameEngine(opts);
    await e.init();
    return e;
  }

  private async init(): Promise<void> {
    const { canvas, container, course, onProgress } = this.opts;
    onProgress?.(0.15, 'Preparando gráficos 3D…');
    this.view = new SceneRenderer(canvas);
    onProgress?.(0.35, 'Cargando motor de física…');
    this.sim = await Simulation.create(course);
    this.predictor = await TrajectoryPredictor.create(course);
    if (this.disposed) return;
    onProgress?.(0.7, `Construyendo «${course.name}»…`);
    this.courseView = new CourseView(course);
    this.view.scene.add(this.courseView.group);
    this.view.configureForCourse(course);

    this.sim.addPlayer(LOCAL_PLAYER_ID, this.opts.playerName);
    this.ballView = new BallView();
    this.aim = new AimView();
    this.trajectory = new TrajectoryView();
    this.holeFx = new HoleEffect();
    this.obstacleView = new ObstacleView(course.obstacles);
    this.view.scene.add(this.obstacleView.group);
    this.view.scene.add(this.ballView.mesh, this.aim.group, this.trajectory.group, this.holeFx.group);

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
      remainingMs: this.sim.remainingMs(LOCAL_PLAYER_ID),
      timeLimitMs: this.sim.timeLimitSec === null ? null : this.sim.timeLimitSec * 1000,
      overview: false,
      result: null,
      playerState: 'IDLE',
      aiming: false,
      power: 0,
      lastEvent: null,
    });
    // Gancho de depuración/QA automatizado: sólo con VITE_ENABLE_DEBUG=true.
    if (AppEnv.debugEnabled) (window as unknown as { __minigolf?: GameEngine }).__minigolf = this;
    onProgress?.(1, '¡Listo!');
  }

  private bindEvents(): void {
    const ev = this.sim.events;
    const local = (id: string) => id === LOCAL_PLAYER_ID;
    const toast = (text: string, tone: 'info' | 'good' | 'bad') =>
      useGameStore.getState().patchHud({ lastEvent: { text, tone, id: ++this.eventId } });
    this.unsubs.push(
      ev.on('PLAYER_STATE_CHANGED', ({ playerId, to }) => {
        if (local(playerId)) useGameStore.getState().patchHud({ playerState: to as never });
      }),
      ev.on('SHOT_STARTED', ({ playerId, power }) => local(playerId) && this.audio.hit(power)),
      ev.on('BALL_HIT', ({ playerId, speed }) => local(playerId) && this.audio.bounce(speed)),
      ev.on('BALL_IN_HOLE', ({ playerId }) => {
        if (!local(playerId)) return;
        this.audio.hole();
        this.holeFx.trigger(this.opts.course.hole.position);
        useGameStore.getState().patchHud({ holed: true });
      }),
      ev.on('PLAYER_FINISHED', ({ playerId, completed }) => {
        if (!local(playerId)) return;
        this.publishHud();
        // Deja ver la bola caer y el confeti antes del resumen.
        const delay = completed ? 1100 : 600;
        setTimeout(() => !this.disposed && useGameStore.getState().patchHud({ result: this.buildSummary() }), delay);
      }),
      ev.on('TIME_UP', ({ playerId }) => {
        if (!local(playerId)) return;
        this.audio.hazard();
        toast('¡Se acabó el tiempo!', 'bad');
      }),
      ev.on('BALL_OUT_OF_BOUNDS', ({ playerId }) => {
        if (!local(playerId)) return;
        this.audio.hazard();
        toast(`¡Fuera del campo! +${GameConfig.hazardPenaltyShots} golpe`, 'bad');
      }),
      ev.on('BALL_IN_WATER', ({ playerId }) => {
        if (!local(playerId)) return;
        this.audio.hazard();
        toast(`¡Al agua! +${GameConfig.hazardPenaltyShots} golpe`, 'bad');
      }),
      ev.on('SHOT_FINISHED', ({ playerId }) => local(playerId) && this.publishHud()),
    );
  }

  private buildSummary(): HoleSummary {
    const p = this.sim.getPlayer(LOCAL_PLAYER_ID);
    const course = this.opts.course;
    const strokes = this.sim.strokes(LOCAL_PLAYER_ID);
    const timeMs = this.sim.elapsedMs(LOCAL_PLAYER_ID);
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

  private tick(dt: number): void {
    const t0 = performance.now();
    this.elapsed += dt;
    this.input.update(dt);
    const steps = this.loop.advance(dt);
    for (let i = 0; i < steps; i++) this.sim.step();

    const p = this.sim.getPlayer(LOCAL_PLAYER_ID);
    this.ballView.update(p.ball, this.loop.alpha);
    const ballPos = this.ballView.mesh.position;
    const aiming = !!this.currentShot && p.fsm.state === 'AIMING';
    if (aiming) {
      this.aim.show(p.ball.position, this.currentShot);
      this.updateTrajectory(p.ball.position, this.currentShot!);
    } else {
      this.aim.hide();
      this.trajectory.hide();
    }
    this.trajectory.update(dt, this.elapsed);
    // Mismo instante que la bola interpolada (entre el paso anterior y el actual).
    this.obstacleView.update((this.sim.tick - 1 + this.loop.alpha) * this.sim.dt);
    this.holeFx.update(dt);

    const hole = this.opts.course.hole.position;
    this.courseView.update(this.elapsed, dt, Math.hypot(ballPos.x - hole.x, ballPos.z - hole.z));
    this.rig.update(dt, this.cameraFocus(p.fsm.state, ballPos, aiming, dt));
    this.view.render(this.rig.camera);

    this.hudAcc += dt;
    if (this.hudAcc > 0.1) {
      this.hudAcc = 0;
      this.publishHud();
    }
    this.measure(dt, performance.now() - t0);
  }

  /** Foco de la cámara: bola; al apuntar, adelantado hacia el destino previsto; al terminar, el hoyo. */
  private cameraFocus(state: string, ball: THREE.Vector3, aiming: boolean, dt: number): Vec3 {
    const hole = this.opts.course.hole.position;
    if (state === 'FINISHED') {
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
   * Mientras se calcula, sigue visible la línea anterior.
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
      // Mientras se calcula, se dibuja el tramo ya simulado: la dirección se ve al instante.
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
    const p = this.sim.getPlayer(LOCAL_PLAYER_ID);
    s.patchHud({
      shots: this.sim.strokes(LOCAL_PLAYER_ID),
      penalties: p.penalties,
      timeMs: this.sim.elapsedMs(LOCAL_PLAYER_ID),
      remainingMs: this.sim.remainingMs(LOCAL_PLAYER_ID),
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
    const s = this.sim.getPlayer(LOCAL_PLAYER_ID).fsm.state;
    return s === 'IDLE' || s === 'AIMING';
  }

  private onAimStart(): void {
    if (this.rig.isOverview) this.toggleOverview();
    this.predicted.shot = null;
    this.sim.beginAim(LOCAL_PLAYER_ID);
  }

  private onAimMove(drag: { x: number; y: number }): void {
    if (this.sim.getPlayer(LOCAL_PLAYER_ID).fsm.state !== 'AIMING') return;
    const sens = useSettings.getState().aimSensitivity;
    this.currentShot = computeShotFromScreenDrag(drag, this.rig.groundBasis(), maxDragPixels(this.viewport.w, this.viewport.h), sens);
    useGameStore.getState().patchHud({ aiming: true, power: this.currentShot?.power ?? 0 });
  }

  private onAimRelease(): void {
    const shot = this.currentShot;
    this.clearAim();
    if (!shot || shot.power < PhysicsConfig.shot.minPower) {
      this.sim.cancelAim(LOCAL_PLAYER_ID);
      return;
    }
    const r = this.sim.shoot(LOCAL_PLAYER_ID, shot);
    if (!r.ok) this.sim.cancelAim(LOCAL_PLAYER_ID);
    this.publishHud();
  }

  private onAimCancel(): void {
    this.clearAim();
    this.sim.cancelAim(LOCAL_PLAYER_ID);
  }

  private clearAim(): void {
    this.currentShot = null;
    this.prediction = null;
    this.predicted.shot = null;
    this.predictor.cancel();
    this.trajectory.hide();
    useGameStore.getState().patchHud({ aiming: false, power: 0 });
  }

  resetBall(): void {
    this.onAimCancel();
    this.sim.resetBall(LOCAL_PLAYER_ID);
  }

  toggleOverview(): void {
    this.rig.setOverview(!this.rig.isOverview);
    this.audio.ui();
    this.publishHud();
  }

  private ballScreenPosition(): { x: number; y: number } | null {
    const v = new THREE.Vector3().copy(this.ballView.mesh.position).project(this.rig.camera);
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

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unsubs.forEach((u) => u());
    this.resizeObserver?.disconnect();
    this.input?.dispose();
    this.courseView?.dispose();
    this.ballView?.dispose();
    this.aim?.dispose();
    this.trajectory?.dispose();
    this.holeFx?.dispose();
    this.obstacleView?.dispose();
    this.audio.dispose();
    this.view?.dispose();
    this.predictor?.dispose();
    this.sim?.dispose();
    const w = window as unknown as { __minigolf?: GameEngine };
    if (w.__minigolf === this) delete w.__minigolf;
  }
}
