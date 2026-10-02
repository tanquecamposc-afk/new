/**
 * Bot de prueba — SOLO para tests/QA (nunca participa en partidas reales).
 * Elige cada tiro probando un abanico de direcciones y potencias con el
 * TrajectoryPredictor y se queda con el que más avanza por la guía del curso.
 */
import type { Simulation } from '@/game/core/Simulation';
import type { CourseData } from '@/game/courses/types';
import type { ShotInput } from '@/game/shooting/shot';
import type { TrajectoryPredictor } from '@/game/shooting/TrajectoryPredictor';
import type { Vec3 } from '@/utils/math';

/** Distancia restante por la guía desde p (proyección sobre la polilínea). */
export function guideCost(course: CourseData, p: Vec3): number {
  const g = course.guide;
  let best = Infinity;
  let tail = 0;
  const lens: number[] = [];
  for (let i = 0; i < g.length - 1; i++) lens.push(Math.hypot(g[i + 1]!.x - g[i]!.x, g[i + 1]!.z - g[i]!.z));
  for (let i = g.length - 2; i >= 0; i--) {
    const a = g[i]!;
    const b = g[i + 1]!;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const l2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2));
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const off = Math.hypot(p.x - px, p.z - pz);
    const cost = off * 1.5 + (1 - t) * lens[i]! + tail;
    best = Math.min(best, cost);
    tail += lens[i]!;
  }
  return best;
}

export function chooseShot(sim: Simulation, predictor: TrajectoryPredictor, playerId: string, dirs = 48, powers = 10): ShotInput {
  const course = sim.course;
  const origin = sim.getPlayer(playerId).ball.position;
  let best: { shot: ShotInput; cost: number } | null = null;
  for (let i = 0; i < dirs; i++) {
    const a = (i / dirs) * Math.PI * 2;
    const direction = { x: Math.sin(a), z: Math.cos(a) };
    for (let j = 1; j <= powers; j++) {
      const shot = { direction, power: j / powers };
      const r = predictor.predict(origin, shot, 10, sim.tick);
      let cost: number;
      if (r.outcome === 'holed') cost = -1 - (1 - shot.power);
      else if (r.outcome === 'water' || r.outcome === 'out_of_bounds') cost = 1e6;
      else cost = guideCost(course, r.end);
      if (!best || cost < best.cost) best = { shot, cost };
    }
  }
  return best!.shot;
}

/** Juega un hoyo completo con el bot. Devuelve los golpes o null si no termina. */
export function playHole(sim: Simulation, predictor: TrajectoryPredictor, playerId: string, maxShots = 8): { strokes: number; holed: boolean } {
  const p = sim.getPlayer(playerId);
  for (let s = 0; s < maxShots && !p.holed && p.fsm.state !== 'FINISHED'; s++) {
    const shot = chooseShot(sim, predictor, playerId);
    const r = sim.shoot(playerId, shot);
    if (!r.ok) throw new Error(`tiro rechazado: ${r.reason}`);
    for (let i = 0; i < 120 * 30; i++) {
      sim.step();
      const st: string = p.fsm.state;
      if (st === 'IDLE' || st === 'FINISHED') break;
    }
    // Deja pasar el intervalo mínimo entre tiros.
    for (let i = 0; i < 40 && p.fsm.state === 'IDLE'; i++) sim.step();
  }
  return { strokes: sim.strokes(playerId), holed: p.holed };
}
