import { expect, it } from 'vitest';
import { compareLive } from './liveRanking';

it('clasificación en vivo: golpes primero; a igualdad, terminado y más rápido; sin completar al final', () => {
  const rows = [
    { id: 'fin3', strokes: 3, finished: true, completed: true, timeMs: 9000 },
    { id: 'play1', strokes: 1, finished: false, completed: false, timeMs: 12000 },
    { id: 'dnf', strokes: 12, finished: true, completed: false, timeMs: 120000 },
    { id: 'fin2slow', strokes: 2, finished: true, completed: true, timeMs: 20000 },
    { id: 'play2', strokes: 2, finished: false, completed: false, timeMs: 12000 },
    { id: 'fin2fast', strokes: 2, finished: true, completed: true, timeMs: 10000 },
  ].sort(compareLive);
  expect(rows.map((r) => r.id)).toEqual(['play1', 'fin2fast', 'fin2slow', 'play2', 'fin3', 'dnf']);
});
