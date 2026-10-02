import * as THREE from 'three';
import { AppEnv } from '@/config/game';
import { PhysicsConfig } from '@/config/physics';
import { CameraRig } from '@/game/camera/CameraRig';
import { FixedStepAccumulator } from '@/game/core/FixedStepLoop';
import { Simulation } from '@/game/core/Simulation';
import type { CourseData } from '@/game/courses/types';
import { InputController } from '@/game/input/InputController';
import { AimView } from '@/game/render/AimView';
import { BallView } from '@/game/render/BallView';
import { CourseView } from '@/game/render/CourseView';
import { SceneRenderer } from '@/game/render/SceneRenderer';
import { computeShotFromScreenDrag, maxDragPixels, type ShotInput } from '@/game/shooting/shot';
import { useGameStore } from '@/store/gameStore';

export const LOCAL_PLAYER_ID = 'local';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  course: CourseData;
  playerName: string;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Orquesta simulación (física + reglas), render, cámara e input con un único
 * bucle requestAnimationFrame. La física corre a paso fijo; el render interpola.
 */
export class GameEngine {
  private sim!: Simulation;
  private view!: SceneRenderer;
  private courseView!: CourseView;
  private ballView!: BallView;
  private aim!: AimView;
  private rig = new CameraRig();
  private input!: InputController;
  private loop = new FixedStepAccumulator(PhysicsConfig.fixedTimestep, PhysicsConfig.maxSubSteps);
  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private disposed = false;
  private currentShot: ShotInput | null = null;
  private resizeObserver?: ResizeObserver;
  private viewport = { w: 1, h: 1 };
  private unsubs: (() => void)[] = [];
  private fps = { frames: 0, acc: 0, value: 0, frameMs: 0 };
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
    if (this.disposed) return;
    onProgress?.(0.7, `Construyendo «${course.name}»…`);
    this.courseView = new CourseView(course);
    this.view.scene.add(this.courseView.group);
    this.view.configureForCourse(course);

    this.sim.addPlayer(LOCAL_PLAYER_ID, this.opts.playerName);
    this.ballView = new BallView();
    this.aim = new AimView();
    this.view.scene.add(this.ballView.mesh, this.aim.group);

    const spawn = course.spawnPoints[0]!;
    this.rig.snapBehind(spawn, course.hole.position, spawn.y);

    this.input = new InputController(canvas, {
      canAim: () => this.canAim(),
      ballScreenPosition: () => this.ballScreenPosition(),
      aimStart: () => this.sim.beginAim(LOCAL_PLAYER_ID),
      aimMove: (drag) => this.onAimMove(drag),
      aimRelease: () => this.onAimRelease(),
      aimCancel: () => this.onAimCancel(),
      rotateCamera: (y, p) => this.rig.rotate(y, p),
      zoomCamera: (f) => this.rig.zoom(f),
      resetBall: () => this.resetBall(),
      toggleDebug: () => AppEnv.debugEnabled && useGameStore.getState().toggleDebug(),
    });

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
    const toast = (text: string, tone: 'info' | 'good' | 'bad') =>
      useGameStore.getState().patchHud({ lastEvent: { text, tone, id: ++this.eventId } });
    this.unsubs.push(
      ev.on('PLAYER_STATE_CHANGED', ({ playerId, to }) => {
        if (playerId === LOCAL_PLAYER_ID) useGameStore.getState().patchHud({ playerState: to as never });
      }),
      ev.on('BALL_IN_HOLE', ({ playerId, shots }) => {
        if (playerId !== LOCAL_PLAYER_ID) return;
        useGameStore.getState().patchHud({ holed: true });
        toast(holeName(shots, this.opts.course.par), 'good');
        this.publishHud();
      }),
      ev.on('BALL_OUT_OF_BOUNDS', ({ playerId }) => playerId === LOCAL_PLAYER_ID && toast('¡Fuera del campo! +1 golpe', 'bad')),
      ev.on('BALL_IN_WATER', ({ playerId }) => playerId === LOCAL_PLAYER_ID && toast('¡Al agua! +1 golpe', 'bad')),
      ev.on('SHOT_FINISHED', ({ playerId }) => playerId === LOCAL_PLAYER_ID && this.publishHud()),
    );
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
      this.tick(dt, now);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private tick(dt: number, now: number): void {
    const t0 = performance.now();
    this.elapsed += dt;
    this.input.update(dt);
    const steps = this.loop.advance(dt);
    for (let i = 0; i < steps; i++) this.sim.step();

    const p = this.sim.getPlayer(LOCAL_PLAYER_ID);
    this.ballView.update(p.ball, this.loop.alpha);
    const ballPos = this.ballView.mesh.position;
    if (this.currentShot && p.fsm.state === 'AIMING') this.aim.show(p.ball.position, this.currentShot);
    else this.aim.hide();

    const hole = this.opts.course.hole.position;
    this.courseView.update(this.elapsed, dt, Math.hypot(ballPos.x - hole.x, ballPos.z - hole.z));
    this.rig.update(dt, { x: ballPos.x, y: Math.max(ballPos.y, hole.y - 0.1), z: ballPos.z });
    this.view.render(this.rig.camera);

    this.hudAcc += dt;
    if (this.hudAcc > 0.1) {
      this.hudAcc = 0;
      this.publishHud();
    }
    this.measure(dt, performance.now() - t0, now);
  }

  private publishHud(): void {
    const s = useGameStore.getState();
    const p = this.sim.getPlayer(LOCAL_PLAYER_ID);
    s.patchHud({ shots: this.sim.strokes(LOCAL_PLAYER_ID), penalties: p.penalties, timeMs: this.sim.elapsedMs(LOCAL_PLAYER_ID) });
  }

  private measure(dt: number, frameMs: number, _now: number): void {
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
        });
      }
    }
  }

  private canAim(): boolean {
    const s = this.sim.getPlayer(LOCAL_PLAYER_ID).fsm.state;
    return s === 'IDLE' || s === 'AIMING';
  }

  private onAimMove(drag: { x: number; y: number }): void {
    if (this.sim.getPlayer(LOCAL_PLAYER_ID).fsm.state !== 'AIMING') return;
    this.currentShot = computeShotFromScreenDrag(drag, this.rig.groundBasis(), maxDragPixels(this.viewport.w, this.viewport.h));
    useGameStore.getState().patchHud({ aiming: true, power: this.currentShot?.power ?? 0 });
  }

  private onAimRelease(): void {
    const shot = this.currentShot;
    this.currentShot = null;
    useGameStore.getState().patchHud({ aiming: false, power: 0 });
    if (!shot || shot.power < PhysicsConfig.shot.minPower) {
      this.sim.cancelAim(LOCAL_PLAYER_ID);
      return;
    }
    const r = this.sim.shoot(LOCAL_PLAYER_ID, shot);
    if (!r.ok) this.sim.cancelAim(LOCAL_PLAYER_ID);
    this.publishHud();
  }

  private onAimCancel(): void {
    this.currentShot = null;
    this.sim.cancelAim(LOCAL_PLAYER_ID);
    useGameStore.getState().patchHud({ aiming: false, power: 0 });
  }

  resetBall(): void {
    this.onAimCancel();
    this.sim.resetBall(LOCAL_PLAYER_ID);
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
    this.view?.dispose();
    this.sim?.dispose();
    const w = window as unknown as { __minigolf?: GameEngine };
    if (w.__minigolf === this) delete w.__minigolf;
  }
}

function holeName(strokes: number, par: number): string {
  if (strokes === 1) return '¡HOYO EN UNO!';
  const diff = strokes - par;
  const names: Record<number, string> = { [-3]: '¡Albatros!', [-2]: '¡Eagle!', [-1]: '¡Birdie!', 0: '¡Par!', 1: 'Bogey', 2: 'Doble bogey' };
  return names[diff] ?? `¡Dentro! (${strokes} golpes)`;
}
