import { describe, expect, it } from 'vitest';
import { course01 } from '@/game/courses/course01';
import { course02 } from '@/game/courses/course02';
import { MatchController } from './MatchController';

const players = [
  { id: 'a', name: 'Ana', color: 1, isBot: false },
  { id: 'b', name: 'Bot', color: 2, isBot: true },
];

describe('MatchController', () => {
  it('registra resultados de forma idempotente y detecta el hoyo completo', () => {
    const m = new MatchController([course01, course02], players);
    expect(m.recordResult(0, 'a', { strokes: 2, timeMs: 10000, completed: true })).toBe(true);
    expect(m.recordResult(0, 'a', { strokes: 1, timeMs: 1, completed: true })).toBe(false);
    expect(m.recordResult(0, 'zzz', { strokes: 1, timeMs: 1, completed: true })).toBe(false);
    expect(m.isHoleComplete()).toBe(false);
    m.recordResult(0, 'b', { strokes: 3, timeMs: 8000, completed: true });
    expect(m.isHoleComplete()).toBe(true);
    expect(m.holeResults().map((r) => r.playerId)).toEqual(['a', 'b']);
  });

  it('avanza hoyos y termina en el último', () => {
    const m = new MatchController([course01, course02], players);
    expect(m.isLastHole).toBe(false);
    expect(m.nextHole()).toBe(true);
    expect(m.currentHole.id).toBe(course02.id);
    expect(m.nextHole()).toBe(false);
  });

  it('clasificación general por puntos, con perHole y empates', () => {
    const m = new MatchController([course01, course02], players);
    m.recordResult(0, 'a', { strokes: 2, timeMs: 20000, completed: true });
    m.recordResult(0, 'b', { strokes: 4, timeMs: 20000, completed: true });
    m.nextHole();
    m.recordResult(1, 'a', { strokes: 12, timeMs: 120000, completed: false });
    m.recordResult(1, 'b', { strokes: 3, timeMs: 30000, completed: true });
    const s = m.standings();
    expect(s.map((r) => r.position)).toEqual([1, 2]);
    const ana = s.find((r) => r.playerId === 'a')!;
    expect(ana.perHole).toEqual([2, 12]);
    expect(ana.holesCompleted).toBe(1);
    expect(s[0]!.totalScore).toBeGreaterThanOrEqual(s[1]!.totalScore);

    const tie = new MatchController([course01], players);
    tie.recordResult(0, 'a', { strokes: 2, timeMs: 5000, completed: true });
    tie.recordResult(0, 'b', { strokes: 2, timeMs: 5000, completed: true });
    expect(tie.standings().map((r) => r.position)).toEqual([1, 1]);
  });

  it('valida la configuración', () => {
    expect(() => new MatchController([], players)).toThrow();
    expect(() => new MatchController([course01], [])).toThrow();
  });
});
