import { describe, expect, it } from 'vitest';
import { ScoreConfig } from '@/config/scoring';
import { calculateScore, compareResults, holeResultName } from './score';

describe('calculateScore', () => {
  const mods = { par: 3 };
  it('menos golpes = más puntos', () => {
    const a = calculateScore({ strokes: 2, timeMs: 20000, completed: true }, mods).total;
    const b = calculateScore({ strokes: 4, timeMs: 20000, completed: true }, mods).total;
    expect(a).toBeGreaterThan(b);
  });
  it('a igualdad de golpes, menos tiempo = más puntos', () => {
    const a = calculateScore({ strokes: 3, timeMs: 10000, completed: true }, mods).total;
    const b = calculateScore({ strokes: 3, timeMs: 40000, completed: true }, mods).total;
    expect(a).toBeGreaterThan(b);
  });
  it('par sin bonus de tiempo = puntos base', () => {
    const s = calculateScore({ strokes: 3, timeMs: 999999, completed: true }, mods);
    expect(s.total).toBe(ScoreConfig.basePoints);
    expect(s.timeBonus).toBe(0);
  });
  it('hoyo en uno suma bonus', () => {
    expect(calculateScore({ strokes: 1, timeMs: 999999, completed: true }, mods).holeInOne).toBe(ScoreConfig.holeInOneBonus);
  });
  it('sin terminar = dnfScore', () => {
    expect(calculateScore({ strokes: 12, timeMs: 5000, completed: false }, mods).total).toBe(ScoreConfig.dnfScore);
  });
  it('nunca baja del mínimo y aplica modificadores', () => {
    expect(calculateScore({ strokes: 30, timeMs: 999999, completed: true }, mods).total).toBe(ScoreConfig.minScore);
    const x1 = calculateScore({ strokes: 3, timeMs: 999999, completed: true }, mods).total;
    const x2 = calculateScore({ strokes: 3, timeMs: 999999, completed: true }, { par: 3, pointMultiplier: 2 }).total;
    expect(x2).toBe(x1 * 2);
  });
  it('es configurable', () => {
    const cfg = { ...ScoreConfig, basePoints: 10, timeBonusMax: 0 };
    expect(calculateScore({ strokes: 3, timeMs: 0, completed: true }, mods, cfg).total).toBe(Math.max(10, cfg.minScore));
  });
});

describe('compareResults', () => {
  it('ordena por completado, golpes y tiempo', () => {
    const list = [
      { strokes: 3, timeMs: 9000, completed: true },
      { strokes: 2, timeMs: 30000, completed: true },
      { strokes: 1, timeMs: 1000, completed: false },
      { strokes: 3, timeMs: 5000, completed: true },
    ].sort(compareResults);
    expect(list.map((r) => `${r.strokes}/${r.timeMs}`)).toEqual(['2/30000', '3/5000', '3/9000', '1/1000']);
  });
});

it('holeResultName', () => {
  expect(holeResultName(1, 3)).toBe('¡HOYO EN UNO!');
  expect(holeResultName(2, 3)).toBe('¡Birdie!');
  expect(holeResultName(5, 3)).toBe('Doble bogey');
  expect(holeResultName(9, 2)).toBe('9 golpes');
  expect(holeResultName(3, 3, false)).toBe('Sin terminar');
});
