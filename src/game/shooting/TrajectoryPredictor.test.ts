import { describe, expect, it } from 'vitest';
import { PhysicsConfig } from '@/config/physics';
import { Simulation } from '@/game/core/Simulation';
import { course01 } from '@/game/courses/course01';
import { TrajectoryPredictor, truncateAtBounce } from './TrajectoryPredictor';

const settle = (sim: Simulation) => {
  const p = sim.getPlayer('p');
  for (let i = 0; i < 120 * 30 && p.fsm.state !== 'IDLE' && p.fsm.state !== 'FINISHED'; i++) sim.step();
};

describe('TrajectoryPredictor', () => {
  it('predice el punto de llegada real de un tiro recto', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p', 'P');
    const shot = { direction: { x: 0, z: -1 }, power: 0.4 };
    const r = pred.predict(p.ball.position, shot, 20);
    sim.shoot('p', shot);
    settle(sim);
    expect(r.outcome).toBe('stopped');
    expect(Math.hypot(r.end.x - p.ball.position.x, r.end.z - p.ball.position.z)).toBeLessThan(0.05);
    expect(r.distance).toBeGreaterThan(3);
    expect(r.points.length).toBeGreaterThan(5);
    pred.dispose();
    sim.dispose();
  });

  it('predicción con rebote ≈ tiro real, y repetible', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p', 'P');
    for (let i = 0; i < 30; i++) sim.step(); // la bola pasa unos frames en reposo, como en el juego
    const shot = { direction: { x: 0.3, z: -Math.sqrt(1 - 0.09) }, power: 0.8 };
    const a = pred.predict(p.ball.position, shot, 20);
    const b = pred.predict(p.ball.position, shot, 20);
    expect(b.end).toEqual(a.end);
    sim.shoot('p', shot);
    settle(sim);
    expect(a.bounces.length).toBeGreaterThan(0);
    expect(Math.hypot(a.end.x - p.ball.position.x, a.end.z - p.ball.position.z)).toBeLessThan(0.1);
    pred.dispose();
    sim.dispose();
  });

  it('detecta rebotes contra paredes', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const d = Math.SQRT1_2;
    const r = pred.predict({ x: 0, y: PhysicsConfig.ball.radius, z: 8 }, { direction: { x: d, z: -d }, power: 0.7 }, 20);
    expect(r.bounces.length).toBeGreaterThan(0);
    expect(truncateAtBounce(r, 1).length).toBeLessThanOrEqual(r.points.length);
    pred.dispose();
  });

  it('predice la entrada en el hoyo', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const origin = { x: 0, y: PhysicsConfig.ball.radius, z: -6 };
    let holed = false;
    for (let power = 0.15; power < 0.5 && !holed; power += 0.01) {
      holed = pred.predict(origin, { direction: { x: 0, z: -1 }, power }, 10).outcome === 'holed';
    }
    expect(holed).toBe(true);
    pred.dispose();
  });

  it('la predicción incremental da el mismo resultado que la síncrona', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const origin = { x: 0, y: PhysicsConfig.ball.radius, z: 8 };
    const shot = { direction: { x: 0.3, z: -Math.sqrt(1 - 0.09) }, power: 0.8 };
    const sync = pred.predict(origin, shot);
    pred.begin(origin, shot);
    let r = null;
    let frames = 0;
    while (!r) {
      r = pred.advance(0);
      frames++;
    }
    expect(frames).toBeGreaterThan(1);
    expect(r.end.x).toBeCloseTo(sync.end.x, 5);
    expect(r.end.z).toBeCloseTo(sync.end.z, 5);
    expect(r.bounces.length).toBe(sync.bounces.length);
    expect(pred.busy).toBe(false);
    pred.dispose();
  });

  it('el límite de tiempo acota la predicción', async () => {
    const pred = await TrajectoryPredictor.create(course01);
    const r = pred.predict({ x: 0, y: PhysicsConfig.ball.radius, z: 8 }, { direction: { x: 0, z: -1 }, power: 1 }, 0.3);
    expect(r.outcome).toBe('unfinished');
    pred.dispose();
  });
});
