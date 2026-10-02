import { GameConfig } from '@/config/game';
import { PhysicsConfig } from '@/config/physics';
import { Ball, type BallStepOutcome } from '@/game/ball/Ball';
import type { CourseData } from '@/game/courses/types';
import { PhysicsWorld } from '@/game/physics/PhysicsWorld';
import { loadRapier } from '@/game/physics/rapier';
import { validateShot, type ShotInput, type ShotRejection } from '@/game/shooting/shot';
import { copyVec, round, type Vec3 } from '@/utils/math';
import type { EventQueue } from '@dimforge/rapier3d-compat';
import { EventBus } from './EventBus';
import type { GameEvents, ShotResultKind } from './events';
import { createPlayerStateMachine, type PlayerState } from './playerState';
import type { StateMachine } from './StateMachine';

/** Registro completo de un tiro: puntuación, estadísticas, depuración y futuro replay. */
export interface ShotRecord {
  index: number;
  tick: number;
  origin: Vec3;
  direction: { x: number; z: number };
  power: number;
  result: ShotResultKind | 'pending';
  restPosition: Vec3 | null;
  durationMs: number;
}

export interface PlayerRuntime {
  id: string;
  name: string;
  ball: Ball;
  fsm: StateMachine<PlayerState>;
  shots: ShotRecord[];
  penalties: number;
  /** Última posición de reposo válida (para devolver la bola tras un hazard). */
  lastRest: Vec3;
  startTick: number;
  finishTick: number | null;
  holed: boolean;
  lastShotTick: number;
  /** Tick en el que la bola vuelve tras un hazard. */
  hazardReturnTick: number | null;
}

/**
 * Simulación de un hoyo: física + reglas. No depende de Three.js ni del DOM,
 * por lo que puede ejecutarse igual en el navegador, en tests y en el
 * servidor autoritativo de Phase 5.
 */
export class Simulation {
  readonly events = new EventBus<GameEvents>();
  readonly players = new Map<string, PlayerRuntime>();
  readonly dt = PhysicsConfig.fixedTimestep;
  tick = 0;
  private eventQueue: EventQueue;
  private ballByCollider = new Map<number, PlayerRuntime>();

  private constructor(
    readonly physics: PhysicsWorld,
    readonly course: CourseData,
  ) {
    this.eventQueue = new physics.R.EventQueue(true);
  }

  static async create(course: CourseData): Promise<Simulation> {
    const R = await loadRapier();
    const physics = new PhysicsWorld(R);
    physics.buildCourse(course);
    return new Simulation(physics, course);
  }

  get timeSeconds(): number {
    return this.tick * this.dt;
  }

  addPlayer(id: string, name: string): PlayerRuntime {
    if (this.players.has(id)) throw new Error(`Jugador duplicado: ${id}`);
    const spawns = this.course.spawnPoints;
    const spawn = copyVec(spawns[this.players.size % spawns.length] ?? spawns[0]!);
    const ball = new Ball(this.physics, spawn);
    const fsm = createPlayerStateMachine();
    const p: PlayerRuntime = {
      id,
      name,
      ball,
      fsm,
      shots: [],
      penalties: 0,
      lastRest: spawn,
      startTick: this.tick,
      finishTick: null,
      holed: false,
      lastShotTick: -Infinity,
      hazardReturnTick: null,
    };
    fsm.onChange((from, to) => this.events.emit('PLAYER_STATE_CHANGED', { playerId: id, from, to }));
    this.players.set(id, p);
    this.ballByCollider.set(ball.collider.handle, p);
    return p;
  }

  getPlayer(id: string): PlayerRuntime {
    const p = this.players.get(id);
    if (!p) throw new Error(`Jugador desconocido: ${id}`);
    return p;
  }

  /** Total de golpes (tiros + penalizaciones). */
  strokes(id: string): number {
    const p = this.getPlayer(id);
    return p.shots.length + p.penalties;
  }

  /** Tiempo en el hoyo (ms) — corriendo o final. Basado en ticks: determinista. */
  elapsedMs(id: string): number {
    const p = this.getPlayer(id);
    const end = p.finishTick ?? this.tick;
    return Math.round((end - p.startTick) * this.dt * 1000);
  }

  beginAim(id: string): boolean {
    return this.getPlayer(id).fsm.transition('AIMING');
  }

  cancelAim(id: string): boolean {
    const p = this.getPlayer(id);
    return p.fsm.state === 'AIMING' ? p.fsm.transition('IDLE') : false;
  }

  shoot(id: string, shot: ShotInput): { ok: true; record: ShotRecord } | { ok: false; reason: ShotRejection } {
    const p = this.getPlayer(id);
    const v = validateShot(shot, {
      state: p.fsm.state,
      ballMoving: p.ball.isMoving,
      shotsTaken: this.strokes(id),
      maxShots: GameConfig.maxShotsPerHole,
      sinceLastShot: (this.tick - p.lastShotTick) * this.dt,
    });
    if (!v.ok) return v;
    if (p.fsm.state === 'IDLE') p.fsm.force('AIMING');
    p.fsm.force('SHOOTING');
    const record: ShotRecord = {
      index: p.shots.length,
      tick: this.tick,
      origin: copyVec(p.ball.position),
      direction: { x: round(shot.direction.x, 5), z: round(shot.direction.z, 5) },
      power: round(shot.power, 4),
      result: 'pending',
      restPosition: null,
      durationMs: 0,
    };
    p.shots.push(record);
    p.lastShotTick = this.tick;
    p.ball.launch(shot.direction, shot.power);
    p.fsm.force('BALL_MOVING');
    this.events.emit('SHOT_STARTED', { playerId: id, shotIndex: record.index, power: record.power, direction: { x: shot.direction.x, y: 0, z: shot.direction.z }, origin: record.origin });
    return { ok: true, record };
  }

  /** Reinicio manual: devuelve la bola a la última posición de reposo, sin penalización. */
  resetBall(id: string): boolean {
    const p = this.getPlayer(id);
    if (p.holed || p.ball.phase === 'captured') return false;
    const pending = p.shots.at(-1);
    if (pending && pending.result === 'pending') this.finishShot(p, 'rest');
    p.ball.placeAt(p.lastRest);
    p.hazardReturnTick = null;
    this.toIdle(p);
    this.events.emit('BALL_RESET', { playerId: id, position: copyVec(p.lastRest), reason: 'manual' });
    return true;
  }

  /** Avanza un paso fijo de simulación. */
  step(): void {
    const hole = this.course.hole.position;
    for (const p of this.players.values()) p.ball.preStep(this.dt, hole);
    this.physics.step(this.eventQueue);
    this.tick++;
    this.drainCollisions();
    for (const p of this.players.values()) {
      const outcome = p.ball.postStep(this.dt, hole, this.course.boundaries.killY);
      if (outcome) this.handleOutcome(p, outcome);
      if (p.hazardReturnTick !== null && this.tick >= p.hazardReturnTick) {
        p.hazardReturnTick = null;
        p.ball.placeAt(p.lastRest);
        this.events.emit('BALL_RESET', { playerId: p.id, position: copyVec(p.lastRest), reason: 'hazard' });
        this.afterShotSettled(p);
      }
    }
  }

  private drainCollisions(): void {
    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const p = this.ballByCollider.get(h1) ?? this.ballByCollider.get(h2);
      if (!p) return;
      const other = this.ballByCollider.has(h1) && this.ballByCollider.has(h2);
      const otherHandle = this.ballByCollider.get(h1) === p ? h2 : h1;
      const info = this.physics.getInfo(otherHandle);
      if (!other && info?.role !== 'wall') return;
      this.events.emit('BALL_HIT', { playerId: p.id, speed: p.ball.speed, kind: other ? 'ball' : 'wall' });
    });
  }

  private handleOutcome(p: PlayerRuntime, outcome: NonNullable<BallStepOutcome>): void {
    switch (outcome) {
      case 'stopped':
      case 'timeout':
        p.lastRest = copyVec(p.ball.position);
        this.finishShot(p, outcome === 'stopped' ? 'rest' : 'timeout');
        this.afterShotSettled(p);
        break;
      case 'holed': {
        this.finishShot(p, 'hole');
        p.holed = true;
        p.finishTick = this.tick;
        p.fsm.force('FINISHED');
        const payload = { playerId: p.id, shots: this.strokes(p.id), timeMs: this.elapsedMs(p.id) };
        this.events.emit('BALL_IN_HOLE', payload);
        this.events.emit('PLAYER_FINISHED', payload);
        break;
      }
      case 'water':
      case 'out_of_bounds': {
        this.finishShot(p, outcome);
        p.penalties += GameConfig.hazardPenaltyShots;
        p.hazardReturnTick = this.tick + Math.round(GameConfig.hazardResetDelay / this.dt);
        const ev = outcome === 'water' ? 'BALL_IN_WATER' : 'BALL_OUT_OF_BOUNDS';
        this.events.emit(ev, { playerId: p.id, position: copyVec(p.ball.position) });
        break;
      }
    }
  }

  private finishShot(p: PlayerRuntime, result: ShotResultKind): void {
    const rec = p.shots.at(-1);
    if (!rec || rec.result !== 'pending') return;
    rec.result = result;
    rec.restPosition = copyVec(p.ball.position);
    rec.durationMs = Math.round((this.tick - rec.tick) * this.dt * 1000);
    this.events.emit('SHOT_FINISHED', { playerId: p.id, shotIndex: rec.index, result, restPosition: rec.restPosition });
  }

  /** Tras un tiro sin hoyo: vuelve a IDLE o termina el hoyo si se agotaron los tiros. */
  private afterShotSettled(p: PlayerRuntime): void {
    if (p.fsm.state === 'BALL_MOVING') p.fsm.force('BALL_STOPPED');
    if (this.strokes(p.id) >= GameConfig.maxShotsPerHole) {
      p.finishTick = this.tick;
      p.fsm.force('FINISHED');
      this.events.emit('PLAYER_FINISHED', { playerId: p.id, shots: this.strokes(p.id), timeMs: this.elapsedMs(p.id) });
      return;
    }
    this.toIdle(p);
  }

  private toIdle(p: PlayerRuntime): void {
    const s = p.fsm.state;
    if (s === 'BALL_MOVING') p.fsm.force('BALL_STOPPED');
    if (p.fsm.state === 'BALL_STOPPED' || p.fsm.state === 'AIMING') p.fsm.force('IDLE');
  }

  dispose(): void {
    this.events.clear();
    this.eventQueue.free();
    this.physics.free();
    this.players.clear();
  }
}
