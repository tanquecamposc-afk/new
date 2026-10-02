import { PhysicsConfig } from '@/config/physics';
import type { Simulation } from '@/game/core/Simulation';
import type { ShotInput } from '@/game/shooting/shot';
import type { TrajectoryPredictor } from '@/game/shooting/TrajectoryPredictor';
import { clamp, type Vec3 } from '@/utils/math';
import { guideCost, upcomingGuidePoints } from './guide';

/**
 * BOT DE PRÁCTICA — sólo para la práctica local sin servidor (probar lobby,
 * espectador y clasificación). Nunca se mezcla con jugadores reales en
 * partidas online y siempre se muestra etiquetado como bot.
 *
 * Juega con las mismas reglas y la misma física que un humano: elige el tiro
 * evaluando candidatos con el TrajectoryPredictor (repartido entre frames con
 * un presupuesto de CPU) y aplica un error aleatorio según su nivel.
 */
export class PracticeBot {
  private state: 'waiting' | 'thinking' | 'aiming' = 'waiting';
  private candidates: ShotInput[] = [];
  private evaluated = 0;
  private best: { shot: ShotInput; cost: number } | null = null;
  private aimUntil = 0;
  private startTick = 0;
  private rngState: number;

  constructor(
    readonly playerId: string,
    /** 0..1: 1 = sin error. */
    readonly skill: number,
    seed: number,
  ) {
    this.rngState = (seed % 2147483646) + 1;
  }

  private rnd(): number {
    this.rngState = (this.rngState * 16807) % 2147483647;
    return this.rngState / 2147483647;
  }

  /** Gaussiana aproximada (suma de uniformes). */
  private gauss(): number {
    return this.rnd() + this.rnd() + this.rnd() - 1.5;
  }

  get busy(): boolean {
    return this.state === 'thinking';
  }

  /** ¿Necesita CPU de predicción en este frame? */
  wantsPredictor(sim: Simulation): boolean {
    if (this.state === 'thinking') return true;
    const p = sim.getPlayer(this.playerId);
    return this.state === 'waiting' && sim.started && p.fsm.state === 'IDLE' && !p.ball.isMoving;
  }

  /**
   * Avanza el "pensamiento" del bot. `predictor` es compartido: sólo un bot lo
   * usa a la vez (el BotDriver reparte los turnos).
   */
  update(sim: Simulation, predictor: TrajectoryPredictor | null, budgetMs: number, nowMs: number): void {
    const p = sim.getPlayer(this.playerId);
    if (p.fsm.state === 'FINISHED') return;

    if (this.state === 'waiting') {
      if (!predictor || !this.wantsPredictor(sim)) return;
      this.candidates = this.generateCandidates(sim.course, p.ball.position);
      this.evaluated = 0;
      this.best = null;
      this.startTick = sim.tick;
      this.state = 'thinking';
      predictor.begin(p.ball.position, this.candidates[0]!, 5, this.startTick);
    }

    if (this.state === 'thinking') {
      if (!predictor) return;
      const t0 = performance.now();
      while (this.evaluated < this.candidates.length) {
        const left = budgetMs - (performance.now() - t0);
        if (left <= 0) return;
        const r = predictor.advance(left);
        if (!r) return;
        const shot = this.candidates[this.evaluated]!;
        const cost =
          r.outcome === 'holed' ? -10 + shot.power : r.outcome === 'water' || r.outcome === 'out_of_bounds' ? 1e6 : guideCost(sim.course, r.end);
        if (!this.best || cost < this.best.cost) this.best = { shot, cost };
        this.evaluated++;
        const next = this.candidates[this.evaluated];
        if (next) predictor.begin(p.ball.position, next, 5, this.startTick);
      }
      this.state = 'aiming';
      this.aimUntil = nowMs + 400 + this.rnd() * 700;
      return;
    }

    if (this.state === 'aiming' && nowMs >= this.aimUntil) {
      const shot = this.applyError(this.best!.shot);
      const r = sim.shoot(this.playerId, shot);
      // Si se rechaza (p. ej. la bola fue empujada), vuelve a pensar.
      this.state = 'waiting';
      if (!r.ok) this.best = null;
    }
  }

  private applyError(shot: ShotInput): ShotInput {
    const err = 1 - clamp(this.skill, 0, 1);
    const a = Math.atan2(shot.direction.x, shot.direction.z) + this.gauss() * err * 0.12;
    const power = clamp(shot.power * (1 + this.gauss() * err * 0.18), PhysicsConfig.shot.minPower, 1);
    return { direction: { x: Math.sin(a), z: Math.cos(a) }, power };
  }

  /** Candidatos: hacia los próximos puntos de la guía y el hoyo, con varios ángulos y potencias. */
  private generateCandidates(course: Simulation['course'], origin: Vec3): ShotInput[] {
    const targets = [...upcomingGuidePoints(course, origin, 2), course.hole.position];
    const out: ShotInput[] = [];
    const seen = new Set<string>();
    for (const t of targets) {
      const dx = t.x - origin.x;
      const dz = t.z - origin.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) continue;
      const base = Math.atan2(dx, dz);
      // v² ≈ 2·a·d con margen por la pérdida al pasar de deslizar a rodar.
      const est = Math.sqrt(2 * 1.6 * (d + 0.4)) * 1.2 / PhysicsConfig.shot.maxSpeed;
      for (const off of [-0.32, -0.16, 0, 0.16, 0.32]) {
        for (const k of [0.85, 1.25]) {
          const power = clamp(est * k, 0.06, 1);
          const key = `${(base + off).toFixed(2)}:${power.toFixed(2)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ direction: { x: Math.sin(base + off), z: Math.cos(base + off) }, power });
        }
      }
    }
    return out;
  }
}

/** Reparte el predictor compartido entre los bots: uno a la vez, con presupuesto por frame. */
export class BotDriver {
  private current: PracticeBot | null = null;

  constructor(
    readonly bots: PracticeBot[],
    private readonly predictor: TrajectoryPredictor,
  ) {}

  update(sim: Simulation, budgetMs: number, nowMs: number): void {
    if (this.current && !this.current.busy) this.current = null;
    if (!this.current) this.current = this.bots.find((b) => b.wantsPredictor(sim)) ?? null;
    for (const b of this.bots) b.update(sim, b === this.current ? this.predictor : null, budgetMs, nowMs);
  }
}
