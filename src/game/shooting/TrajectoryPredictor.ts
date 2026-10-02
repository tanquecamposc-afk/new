import { PhysicsConfig } from '@/config/physics';
import { TrajectoryConfig } from '@/config/trajectory';
import { Ball, type BallStepOutcome } from '@/game/ball/Ball';
import type { CourseData } from '@/game/courses/types';
import { PhysicsWorld } from '@/game/physics/PhysicsWorld';
import { loadRapier } from '@/game/physics/rapier';
import { copyVec, type Vec3 } from '@/utils/math';
import type { EventQueue } from '@dimforge/rapier3d-compat';
import type { ShotInput } from './shot';

export type PredictedOutcome = Exclude<BallStepOutcome, null> | 'unfinished';

export interface TrajectoryPrediction {
  /** Puntos muestreados del recorrido (incluye origen y final). */
  points: Vec3[];
  /** Posiciones de los rebotes previstos. */
  bounces: Vec3[];
  end: Vec3;
  outcome: PredictedOutcome;
  /** Distancia total recorrida (m). */
  distance: number;
  /** Coste de la predicción (ms), para el panel de rendimiento. */
  computeMs: number;
}

/**
 * Predice el recorrido de un tiro ejecutando la MISMA física (clase Ball +
 * Rapier) en un mundo auxiliar con los colliders estáticos del curso.
 * No es una aproximación visual: es una simulación adelantada, acotada en
 * tiempo (TrajectoryConfig.maxTime) y en frecuencia de recálculo.
 */
interface PredictionJob {
  points: Vec3[];
  bounces: Vec3[];
  outcome: PredictedOutcome;
  distance: number;
  step: number;
  startTick: number;
  maxSteps: number;
  computeMs: number;
  /** Número de llamadas a advance() (frames) que lleva la predicción. */
  frames: number;
}

export class TrajectoryPredictor {
  private ball: Ball;
  private readonly queue: EventQueue;

  private constructor(
    private readonly physics: PhysicsWorld,
    private readonly course: CourseData,
  ) {
    this.ball = new Ball(physics, course.spawnPoints[0]!);
    this.queue = new physics.R.EventQueue(true);
  }

  static async create(course: CourseData): Promise<TrajectoryPredictor> {
    const R = await loadRapier();
    const physics = new PhysicsWorld(R);
    physics.buildCourse(course);
    return new TrajectoryPredictor(physics, course);
  }

  private job: PredictionJob | null = null;

  /** Predicción completa síncrona (tests, servidor). */
  predict(origin: Vec3, shot: ShotInput, maxTime: number = TrajectoryConfig.maxTime, startTick = 0): TrajectoryPrediction {
    this.begin(origin, shot, maxTime, startTick);
    return this.advance(Infinity)!;
  }

  /**
   * Inicia una predicción incremental (descarta la anterior). `startTick` es el
   * tick actual de la simulación: los obstáculos se colocan donde estarán.
   */
  begin(origin: Vec3, shot: ShotInput, maxTime: number = TrajectoryConfig.maxTime, startTick = 0): void {
    // Bola nueva en cada predicción: elimina la caché de contactos (warm-start)
    // del tiro anterior, que hacía que dos predicciones iguales divergieran.
    this.ball.dispose();
    this.ball = new Ball(this.physics, origin);
    this.queue.clear();
    this.ball.launch(shot.direction, shot.power);
    this.job = {
      points: [copyVec(origin)],
      bounces: [],
      outcome: 'unfinished',
      distance: 0,
      step: 0,
      maxSteps: Math.ceil(maxTime / PhysicsConfig.fixedTimestep),
      startTick,
      computeMs: 0,
      frames: 0,
    };
  }

  get busy(): boolean {
    return this.job !== null;
  }

  /**
   * Avanza la predicción en curso hasta agotar `budgetMs`. Devuelve el
   * resultado cuando termina, o null si aún queda trabajo para otro frame.
   */
  advance(budgetMs: number): TrajectoryPrediction | null {
    const job = this.job;
    if (!job) return null;
    job.frames++;
    const t0 = performance.now();
    const dt = PhysicsConfig.fixedTimestep;
    const hole = this.course.hole.position;
    const killY = this.course.boundaries.killY;
    const ball = this.ball;
    let done = false;

    while (!done) {
      job.step++;
      ball.preStep(dt, hole);
      this.physics.obstacles?.setTarget((job.startTick + job.step) * dt);
      this.physics.step(this.queue);
      let bounced = false;
      this.queue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        const other = h1 === ball.collider.handle ? h2 : h2 === ball.collider.handle ? h1 : null;
        const role = other !== null ? this.physics.getInfo(other)?.role : undefined;
        if (role === 'wall' || role === 'obstacle') bounced = true;
      });
      const result = ball.postStep(dt, hole, killY);
      const a = ball.prevPosition;
      const b = ball.position;
      job.distance += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (bounced) job.bounces.push(copyVec(b));
      if (job.step % TrajectoryConfig.sampleEvery === 0) job.points.push(copyVec(b));
      if (result) {
        job.outcome = result;
        done = true;
      } else if (ball.phase === 'captured') {
        // Tras caer en la copa basta con mostrar la entrada.
        job.outcome = 'holed';
        done = true;
      } else if (job.step >= job.maxSteps) {
        done = true;
      }
      if (!done && (job.step & 7) === 0 && performance.now() - t0 >= budgetMs) break;
    }
    job.computeMs += performance.now() - t0;
    if (!done) return null;

    this.job = null;
    const end = copyVec(job.outcome === 'holed' ? hole : ball.position);
    const last = job.points.at(-1)!;
    if (last.x !== end.x || last.z !== end.z) job.points.push(end);
    return { points: job.points, bounces: job.bounces, end, outcome: job.outcome, distance: job.distance, computeMs: job.computeMs };
  }

  cancel(): void {
    this.job = null;
  }

  /** Tramo ya calculado de la predicción en curso (para dibujarla progresivamente). */
  partial(): { points: Vec3[]; bounces: Vec3[]; framesPending: number } | null {
    const j = this.job;
    return j ? { points: j.points, bounces: j.bounces, framesPending: j.frames } : null;
  }

  dispose(): void {
    this.queue.free();
    this.physics.free();
  }
}

/** Recorta una predicción para el modo "corto": hasta el N-ésimo rebote, sin punto final. */
export function truncateAtBounce(pred: Pick<TrajectoryPrediction, 'points' | 'bounces'>, maxBounces: number): Vec3[] {
  if (pred.bounces.length <= maxBounces) return pred.points;
  const stopAt = pred.bounces[maxBounces]!;
  const out: Vec3[] = [];
  for (const p of pred.points) {
    out.push(p);
    if (Math.hypot(p.x - stopAt.x, p.z - stopAt.z) < 0.35) break;
  }
  return out;
}
