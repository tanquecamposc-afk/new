import { describe, expect, it } from 'vitest';
import { Simulation } from '@/game/core/Simulation';
import { course01 } from '@/game/courses/course01';
import { course02 } from '@/game/courses/course02';
import { TrajectoryPredictor } from '@/game/shooting/TrajectoryPredictor';
import { BotDriver, PracticeBot } from './PracticeBot';

async function runMatch(course: typeof course01, botCount: number, skill: number, maxSeconds = 120) {
  const sim = await Simulation.create(course, false);
  const pred = await TrajectoryPredictor.create(course);
  const bots = Array.from({ length: botCount }, (_, i) => {
    sim.addPlayer(`bot-${i}`, `Bot ${i}`);
    return new PracticeBot(`bot-${i}`, skill, 1000 + i);
  });
  const driver = new BotDriver(bots, pred);
  sim.startHole();
  let now = 0;
  for (let i = 0; i < maxSeconds * 120 && !sim.allFinished; i++) {
    sim.step();
    now += 1000 / 120;
    // Presupuesto infinito en tests: el bot piensa dentro del mismo frame.
    if (i % 2 === 0) driver.update(sim, Infinity, now);
  }
  const res = bots.map((b) => ({ holed: sim.getPlayer(b.playerId).holed, strokes: sim.strokes(b.playerId) }));
  pred.dispose();
  sim.dispose();
  return res;
}

describe('PracticeBot', () => {
  it('varios bots completan el hoyo básico con las reglas normales', async () => {
    const res = await runMatch(course01, 3, 0.8);
    expect(res.every((r) => r.holed)).toBe(true);
    expect(res.every((r) => r.strokes >= 1 && r.strokes <= 6)).toBe(true);
  });

  it('un bot completa el codo con rebote', { timeout: 60_000 }, async () => {
    const res = await runMatch(course02, 1, 0.9);
    expect(res[0]!.holed).toBe(true);
  });

  it('no tira antes de que empiece el hoyo', async () => {
    const sim = await Simulation.create(course01, false);
    const pred = await TrajectoryPredictor.create(course01);
    sim.addPlayer('b', 'B');
    const bot = new PracticeBot('b', 1, 1);
    const driver = new BotDriver([bot], pred);
    for (let i = 0; i < 600; i++) {
      sim.step();
      driver.update(sim, Infinity, i * 10);
    }
    expect(sim.getPlayer('b').shots.length).toBe(0);
    pred.dispose();
    sim.dispose();
  });
});
