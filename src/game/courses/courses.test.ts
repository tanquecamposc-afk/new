import { describe, expect, it } from 'vitest';
import { Simulation } from '@/game/core/Simulation';
import { TrajectoryPredictor } from '@/game/shooting/TrajectoryPredictor';
import { playHole } from '@/game/testing/solver';
import { COURSES } from './index';
import { validateCourse } from './validate';

describe('cursos', () => {
  it('hay 6 cursos de prueba con ids únicos', () => {
    expect(COURSES.length).toBe(6);
    expect(new Set(COURSES.map((c) => c.id)).size).toBe(6);
  });

  for (const course of COURSES) {
    it(`${course.id}: datos válidos`, () => {
      expect(validateCourse(course)).toEqual([]);
    });

    it(`${course.id}: la bola reposa estable en la salida`, async () => {
      const sim = await Simulation.create(course);
      const p = sim.addPlayer('p', 'P');
      const s0 = { ...p.ball.position };
      for (let i = 0; i < 360; i++) sim.step();
      expect(Math.hypot(p.ball.position.x - s0.x, p.ball.position.z - s0.z)).toBeLessThan(0.01);
      expect(p.fsm.state).toBe('IDLE');
      sim.dispose();
    });

    it(`${course.id}: se puede completar (bot de prueba + física real)`, { timeout: 180_000 }, async () => {
      const sim = await Simulation.create(course);
      const pred = await TrajectoryPredictor.create(course);
      sim.addPlayer('bot', 'Bot');
      const r = playHole(sim, pred, 'bot');
      expect(r.holed).toBe(true);
      expect(r.strokes).toBeLessThanOrEqual(course.par + 3);
      pred.dispose();
      sim.dispose();
    });
  }
});
