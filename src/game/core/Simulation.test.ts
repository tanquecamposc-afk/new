import { describe, expect, it } from 'vitest';
import { PhysicsConfig } from '@/config/physics';
import { course01 } from '@/game/courses/course01';
import { Simulation } from './Simulation';

const MAX_STEPS = 120 * 30;

function runUntilSettled(sim: Simulation, id: string) {
  const p = sim.getPlayer(id);
  for (let i = 0; i < MAX_STEPS; i++) {
    sim.step();
    if (p.fsm.state === 'IDLE' || p.fsm.state === 'FINISHED') return i;
  }
  throw new Error(`La bola no se detuvo (estado ${p.fsm.state}, fase ${p.ball.phase})`);
}

describe('Simulation (course01)', () => {
  it('la bola reposa estable en el tee sin moverse', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    const start = { ...p.ball.position };
    for (let i = 0; i < 240; i++) sim.step();
    expect(Math.abs(p.ball.body.translation().z - start.z)).toBeLessThan(1e-3);
    expect(p.fsm.state).toBe('IDLE');
    sim.dispose();
  });

  it('un tiro suave recorre distancia, se detiene y vuelve a IDLE', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    const z0 = p.ball.position.z;
    const r = sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 0.4 });
    expect(r.ok).toBe(true);
    expect(p.fsm.state).toBe('BALL_MOVING');
    const steps = runUntilSettled(sim, 'p1');
    const travelled = z0 - p.ball.position.z;
    expect(travelled).toBeGreaterThan(2);
    expect(steps * sim.dt).toBeLessThan(15);
    expect(p.shots[0]!.result).toBe('rest');
    expect(p.ball.position.y).toBeCloseTo(PhysicsConfig.ball.radius, 1);
    sim.dispose();
  });

  it('a más potencia, más distancia (antes de tocar paredes)', async () => {
    const dist = async (power: number) => {
      const sim = await Simulation.create(course01);
      const p = sim.addPlayer('p1', 'Test');
      const z0 = p.ball.position.z;
      sim.shoot('p1', { direction: { x: 0, z: -1 }, power });
      runUntilSettled(sim, 'p1');
      const d = z0 - p.ball.position.z;
      sim.dispose();
      return d;
    };
    const a = await dist(0.2);
    const b = await dist(0.35);
    expect(b).toBeGreaterThan(a * 1.5);
  });

  it('no se puede disparar mientras la bola se mueve', async () => {
    const sim = await Simulation.create(course01);
    sim.addPlayer('p1', 'Test');
    sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 0.5 });
    for (let i = 0; i < 30; i++) sim.step();
    const r = sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 0.5 });
    expect(r).toEqual({ ok: false, reason: 'invalid_state' });
    sim.dispose();
  });

  it('rebota contra la pared lateral', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    sim.shoot('p1', { direction: { x: 1, z: 0 }, power: 0.6 });
    let hits = 0;
    sim.events.on('BALL_HIT', () => hits++);
    let minVx = Infinity;
    for (let i = 0; i < 240; i++) {
      sim.step();
      minVx = Math.min(minVx, p.ball.velocity.x);
    }
    expect(hits).toBeGreaterThan(0);
    expect(minVx).toBeLessThan(-0.5);
    expect(Math.abs(p.ball.position.x)).toBeLessThan(2);
    sim.dispose();
  });

  it('un tiro recto bien dosificado entra en el hoyo y termina', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    let holed = 0;
    sim.events.on('BALL_IN_HOLE', () => holed++);
    // Busca la potencia mínima que llega al hoyo.
    let shots = 0;
    while (!p.holed && shots < 6) {
      const dz = course01.hole.position.z - p.ball.position.z;
      const dx = course01.hole.position.x - p.ball.position.x;
      const d = Math.hypot(dx, dz);
      // v² = 2·a·d  → potencia ajustada a la resistencia del green (+ margen).
      const v = Math.sqrt(2 * 1.45 * (d + 0.3));
      sim.shoot('p1', { direction: { x: dx / d, z: dz / d }, power: Math.min(1, v / PhysicsConfig.shot.maxSpeed) });
      runUntilSettled(sim, 'p1');
      shots++;
    }
    expect(p.holed).toBe(true);
    expect(holed).toBe(1);
    expect(p.fsm.state).toBe('FINISHED');
    expect(sim.elapsedMs('p1')).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) sim.step();
    expect(p.ball.position.y).toBeLessThan(course01.hole.position.y);
    const r = sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 0.5 });
    expect(r.ok).toBe(false);
    sim.dispose();
  });

  it('una bola demasiado rápida salta el hoyo sin entrar', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 1 });
    for (let i = 0; i < 120 * 1.2; i++) sim.step();
    expect(p.holed).toBe(false);
    sim.dispose();
  });

  it('el reset manual devuelve la bola a la última posición de reposo', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    const spawn = { ...p.ball.position };
    sim.shoot('p1', { direction: { x: 0, z: -1 }, power: 0.5 });
    for (let i = 0; i < 40; i++) sim.step();
    expect(sim.resetBall('p1')).toBe(true);
    expect(p.ball.position).toEqual(spawn);
    expect(p.fsm.state).toBe('IDLE');
    expect(p.shots.length).toBe(1);
    sim.dispose();
  });

  it('caer fuera del campo penaliza y devuelve la bola', async () => {
    const sim = await Simulation.create(course01);
    const p = sim.addPlayer('p1', 'Test');
    const spawn = { ...p.ball.position };
    // Sacamos la bola físicamente del recorrido (como si saltara la pared).
    p.ball.body.setTranslation({ x: 4, y: 1, z: 0 }, true);
    p.ball.phase = 'moving';
    p.fsm.force('AIMING');
    p.fsm.force('SHOOTING');
    p.fsm.force('BALL_MOVING');
    let oob = 0;
    sim.events.on('BALL_OUT_OF_BOUNDS', () => oob++);
    for (let i = 0; i < 400; i++) sim.step();
    expect(oob).toBe(1);
    expect(p.penalties).toBe(1);
    expect(p.ball.position.x).toBeCloseTo(spawn.x, 3);
    expect(p.ball.position.y).toBeCloseTo(spawn.y, 2);
    expect(p.ball.position.z).toBeCloseTo(spawn.z, 3);
    expect(p.fsm.state).toBe('IDLE');
    sim.dispose();
  });
});
