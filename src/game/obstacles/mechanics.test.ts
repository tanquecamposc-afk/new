import { describe, expect, it } from 'vitest';
import { PhysicsConfig } from '@/config/physics';
import { Simulation } from '@/game/core/Simulation';
import { course03 } from '@/game/courses/course03';
import { course04 } from '@/game/courses/course04';
import { course05 } from '@/game/courses/course05';
import { course06 } from '@/game/courses/course06';
import { TrajectoryPredictor } from '@/game/shooting/TrajectoryPredictor';
import { obstaclePose } from './poses';

const R = PhysicsConfig.ball.radius;

function settle(sim: Simulation, id = 'p', max = 120 * 30) {
  const p = sim.getPlayer(id);
  for (let i = 0; i < max; i++) {
    sim.step();
    if (p.fsm.state === 'IDLE' || p.fsm.state === 'FINISHED') return;
  }
}

describe('poses deterministas', () => {
  it('misma t → misma pose; el slider oscila dentro de su amplitud', () => {
    const s = course05.obstacles[0]!;
    expect(obstaclePose(s, 1.234)).toEqual(obstaclePose(s, 1.234));
    for (let t = 0; t < 10; t += 0.1) {
      const p = obstaclePose(s, t).position;
      expect(Math.abs(p.x - (s as { center: { x: number } }).center.x)).toBeLessThanOrEqual(1.4 + 1e-9);
    }
  });
});

describe('molino', () => {
  it('según el momento del tiro, las aspas bloquean o dejan pasar', async () => {
    const outcomes = new Set<string>();
    for (let wait = 0; wait < 160; wait += 20) {
      const sim = await Simulation.create(course04);
      const p = sim.addPlayer('p', 'P');
      for (let i = 0; i < 40 + wait; i++) sim.step();
      sim.shoot('p', { direction: { x: 0, z: -1 }, power: 0.62 });
      let hitBlade = false;
      sim.events.on('BALL_HIT', (e) => e.kind === 'obstacle' && (hitBlade = true));
      settle(sim);
      outcomes.add(p.ball.position.z < -0.8 ? 'pasa' : hitBlade ? 'bloqueada' : 'corta');
      sim.dispose();
    }
    expect(outcomes.has('pasa')).toBe(true);
    expect(outcomes.has('bloqueada')).toBe(true);
  });

  it('el predictor tiene en cuenta la posición de las aspas', async () => {
    const sim = await Simulation.create(course04);
    const pred = await TrajectoryPredictor.create(course04);
    const p = sim.addPlayer('p', 'P');
    for (let i = 0; i < 97; i++) sim.step();
    const shot = { direction: { x: 0, z: -1 }, power: 0.62 };
    const r = pred.predict(p.ball.position, shot, 20, sim.tick);
    sim.shoot('p', shot);
    settle(sim);
    expect(Math.hypot(r.end.x - p.ball.position.x, r.end.z - p.ball.position.z)).toBeLessThan(0.1);
    pred.dispose();
    sim.dispose();
  });
});

describe('barreras móviles', () => {
  it('una barrera empuja a la bola parada sin consumir tiro', async () => {
    const sim = await Simulation.create(course05);
    const p = sim.addPlayer('p', 'P');
    // Bola parada en el recorrido de la barrera 1 (z = 6), lejos del centro.
    p.ball.placeAt({ x: -1.3, y: R, z: 6 });
    let disturbed = false;
    sim.events.on('PLAYER_STATE_CHANGED', (e) => e.to === 'BALL_MOVING' && (disturbed = true));
    for (let i = 0; i < 120 * 5; i++) sim.step();
    expect(disturbed).toBe(true);
    expect(Math.hypot(p.ball.position.x + 1.3, p.ball.position.z - 6)).toBeGreaterThan(0.2);
    expect(p.shots.length).toBe(0);
    settle(sim);
    expect(['IDLE', 'BALL_MOVING']).toContain(p.fsm.state);
    sim.dispose();
  });
});

describe('superficies y hazards', () => {
  it('agua: penaliza y devuelve la bola', async () => {
    const sim = await Simulation.create(course06);
    const p = sim.addPlayer('p', 'P');
    const start = { ...p.ball.position };
    let water = 0;
    sim.events.on('BALL_IN_WATER', () => water++);
    sim.shoot('p', { direction: { x: 0, z: -1 }, power: 0.7 });
    for (let i = 0; i < 120 * 10 && p.fsm.state !== 'IDLE'; i++) sim.step();
    expect(water).toBe(1);
    expect(p.penalties).toBe(1);
    expect(p.shots[0]!.result).toBe('water');
    expect(Math.hypot(p.ball.position.x - start.x, p.ball.position.z - start.z)).toBeLessThan(0.01);
    sim.dispose();
  });

  it('arena: frena mucho más que el green', async () => {
    const roll = async (z: number, x: number) => {
      const sim = await Simulation.create(course06);
      const p = sim.addPlayer('p', 'P');
      p.ball.placeAt({ x, y: R, z });
      sim.shoot('p', { direction: { x: 1, z: 0 }, power: 0.12 });
      settle(sim);
      const d = p.ball.position.x - x;
      sim.dispose();
      return d;
    };
    const sand = await roll(-6, -1);
    const green = await roll(-10, -1);
    expect(sand).toBeLessThan(green * 0.6);
  });

  it('acelerador: la bola sale más rápida de lo que entró', async () => {
    const sim = await Simulation.create(course06);
    const p = sim.addPlayer('p', 'P');
    p.ball.placeAt({ x: 2.1, y: R, z: 1.6 }); // sobre el acelerador
    sim.shoot('p', { direction: { x: 0, z: -1 }, power: 0.15 });
    const v0 = 0.15 * PhysicsConfig.shot.maxSpeed;
    let maxV = 0;
    for (let i = 0; i < 240; i++) {
      sim.step();
      maxV = Math.max(maxV, p.ball.speed);
    }
    expect(maxV).toBeGreaterThan(v0 * 1.5);
    expect(maxV).toBeLessThanOrEqual(7);
    sim.dispose();
  });

  it('rampa: sin fuerza suficiente la bola vuelve cuesta abajo', async () => {
    const sim = await Simulation.create(course03);
    const p = sim.addPlayer('p', 'P');
    sim.shoot('p', { direction: { x: 0, z: -1 }, power: 0.6 });
    let maxY = 0;
    for (let i = 0; i < 120 * 15 && p.fsm.state !== 'IDLE'; i++) {
      sim.step();
      maxY = Math.max(maxY, p.ball.position.y);
    }
    expect(maxY).toBeGreaterThan(R + 0.1); // llegó a subir
    expect(p.ball.position.z).toBeGreaterThan(4); // y acabó abajo
    expect(p.ball.position.y).toBeCloseTo(R, 1);
    sim.dispose();
  });
});
