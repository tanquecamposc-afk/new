import type { LiveRow } from '@/store/gameStore';

/** Orden de la clasificación en vivo (GameEngine.liveRows). */
export function compareLive(a: Pick<LiveRow, 'strokes' | 'finished' | 'completed' | 'timeMs'>, b: typeof a): number {
  const dnfA = a.finished && !a.completed;
  const dnfB = b.finished && !b.completed;
  if (dnfA !== dnfB) return dnfA ? 1 : -1;
  if (a.strokes !== b.strokes) return a.strokes - b.strokes;
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  return a.timeMs - b.timeMs;
}
