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
  /** Rebotes contra paredes/obstáculos/bolas durante el tiro. */
  bounces: number;
  /** Distancia recorrida (m). */
  distance: number;
  maxSpeed: number;
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
  /** true si terminó embocando; false si se agotó el límite de golpes o de tiempo. */
  completed: boolean;
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
  /**
   * El hoyo empieza al terminar la cuenta atrás (startHole). Antes, la física
   * corre (obstáculos en movimiento) pero nadie puede tirar ni corre el tiempo.
   */
  started = false;
  private eventQueue: EventQueue;
  private ballByCollider = new Map<number, PlayerRuntime>();

  private constructor(
    readonly physics: PhysicsWorld,
    readonly course: CourseData,
  ) {
    this.eventQueue = new physics.R.EventQueue(true);
  }

  /**
   * `autoStart` (por defecto) arranca el hoyo de inmediato: práctica y tests.
   * Las partidas lo arrancan tras la cuenta atrás con startHole().
   */
  static async create(course: CourseData, autoStart = true): Promise<Simulation> {
    const R = await loadRapier();
    const physics = new PhysicsWorld(R);
    physics.buildCourse(course);
    const sim = new Simulation(physics, course);
    sim.started = autoStart;
    return sim;
  }

  /** ¿Han terminado todos los jugadores (embocando o no)? */
  get allFinished(): boolean {
    if (this.players.size === 0) return false;
    for (const p of this.players.values()) if (p.finishTick === null) return false;
    return true;
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
      completed: false,
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

  /** Arranca el hoyo para todos a la vez (mismo tick = mismo cronómetro). */
  startHole(): void {
    if (this.started) return;
    this.started = true;
    for (const p of this.players.values()) {
      p.startTick = this.tick;
      p.lastShotTick = -Infinity;
    }
  }

  /** Tiempo en el hoyo (ms) — corriendo o final. Basado en ticks: determinista. */
  elapsedMs(id: string): number {
    if (!this.started) return 0;
    const p = this.getPlayer(id);
    const end = p.finishTick ?? this.tick;
    return Math.round((end - p.startTick) * this.dt * 1000);
  }

  beginAim(id: string): boolean {
    if (!this.started) return false;
    return this.getPlayer(id).fsm.transition('AIMING');
  }

  cancelAim(id: string): boolean {
    const p = this.getPlayer(id);
    return p.fsm.state === 'AIMING' ? p.fsm.transition('IDLE') : false;
  }

  shoot(id: string, shot: ShotInput): { ok: true; record: ShotRecord } | { ok: false; reason: ShotRejection } {
    const p = this.getPlayer(id);
    if (!this.started) return { ok: false, reason: 'invalid_state' };
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
      bounces: 0,
      distance: 0,
      maxSpeed: 0,
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
    // Obstáculos: pose objetivo al final de este paso (función pura del tick).
    this.physics.obstacles?.setTarget((this.tick + 1) * this.dt);
    this.physics.step(this.eventQueue);
    this.tick++;
    this.drainCollisions();
    for (const p of this.players.values()) {
      const outcome = p.ball.postStep(this.dt, hole, this.course.boundaries.killY);
      this.trackShotStats(p);
      if (outcome) this.handleOutcome(p, outcome);
      if (p.finishTick === null && p.ball.phase !== 'captured' && this.isOutOfTime(p)) {
        this.timeUp(p);
        continue;
      }
      if (p.hazardReturnTick !== null && this.tick >= p.hazardReturnTick) {
        p.hazardReturnTick = null;
        p.ball.placeAt(p.lastRest);
        this.events.emit('BALL_RESET', { playerId: p.id, position: copyVec(p.lastRest), reason: 'hazard' });
        this.afterShotSettled(p);
      }
    }
  }

  /** Tiempo restante (ms) o null si no hay límite. */
  remainingMs(id: string): number | null {
    const limit = this.timeLimitSec;
    if (limit === null) return null;
    return Math.max(0, limit * 1000 - this.elapsedMs(id));
  }

  /** Límite del hoyo: el del curso o, si no tiene, el general. */
  get timeLimitSec(): number | null {
    return this.course.timeLimitSec ?? GameConfig.holeTimeLimitSec;
  }

  private isOutOfTime(p: PlayerRuntime): boolean {
    if (!this.started) return false;
    const limit = this.timeLimitSec;
    return limit !== null && (this.tick - p.startTick) * this.dt >= limit;
  }

  /** Se agotó el tiempo: el hoyo termina sin completar, esté donde esté la bola. */
  private timeUp(p: PlayerRuntime): void {
    p.hazardReturnTick = null;
    if (p.ball.phase === 'moving' || p.ball.phase === 'hazard') {
      p.ball.placeAt(p.ball.phase === 'hazard' ? p.lastRest : p.ball.position);
    }
    this.finishShot(p, 'timeout');
    this.events.emit('TIME_UP', { playerId: p.id });
    this.finishPlayer(p, false);
  }

  private finishPlayer(p: PlayerRuntime, completed: boolean): void {
    p.finishTick = this.tick;
    p.completed = completed;
    p.fsm.force('FINISHED');
    this.events.emit('PLAYER_FINISHED', { playerId: p.id, shots: this.strokes(p.id), timeMs: this.elapsedMs(p.id), completed });
  }

  private trackShotStats(p: PlayerRuntime): void {
    const rec = p.shots.at(-1);
    if (!rec || rec.result !== 'pending') return;
    const a = p.ball.prevPosition;
    const b = p.ball.position;
    rec.distance += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    rec.maxSpeed = Math.max(rec.maxSpeed, p.ball.speed);
  }

  private drainCollisions(): void {
    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const p = this.ballByCollider.get(h1) ?? this.ballByCollider.get(h2);
      if (!p) return;
      const other = this.ballByCollider.has(h1) && this.ballByCollider.has(h2);
      const otherHandle = this.ballByCollider.get(h1) === p ? h2 : h1;
      const info = this.physics.getInfo(otherHandle);
      if (!other && info?.role !== 'wall' && info?.role !== 'obstacle') return;
      const rec = p.shots.at(-1);
      if (rec && rec.result === 'pending') rec.bounces++;
      const kind = other ? 'ball' : info?.role === 'obstacle' ? 'obstacle' : 'wall';
      this.events.emit('BALL_HIT', { playerId: p.id, speed: p.ball.speed, kind });
    });
  }

  private handleOutcome(p: PlayerRuntime, outcome: NonNullable<BallStepOutcome>): void {
    switch (outcome) {
      case 'disturbed':
        // Empujada por un obstáculo estando parada: se mueve sin consumir tiro.
        if (p.fsm.state === 'IDLE' || p.fsm.state === 'AIMING') p.fsm.force('BALL_MOVING');
        break;
      case 'stopped':
      case 'timeout':
        p.lastRest = copyVec(p.ball.position);
        this.finishShot(p, outcome === 'stopped' ? 'rest' : 'timeout');
        this.afterShotSettled(p);
        break;
      case 'holed': {
        this.finishShot(p, 'hole');
        p.holed = true;
        p.hazardReturnTick = null;
        this.events.emit('BALL_IN_HOLE', { playerId: p.id, shots: this.strokes(p.id), timeMs: this.tick === p.startTick ? 0 : Math.round((this.tick - p.startTick) * this.dt * 1000) });
        this.finishPlayer(p, true);
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
      this.finishPlayer(p, false);
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
