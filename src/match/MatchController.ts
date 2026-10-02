import type { CourseData } from '@/game/courses/types';
import { calculateScore, compareResults, type HoleResult } from '@/game/scoring/score';
import type { MatchPlayer } from './types';

export interface PlayerHoleResult extends HoleResult {
  playerId: string;
  score: number;
}

export interface Standing {
  playerId: string;
  name: string;
  color: number;
  isBot: boolean;
  position: number;
  totalScore: number;
  totalStrokes: number;
  totalTimeMs: number;
  holesCompleted: number;
  /** Golpes por hoyo (null = hoyo aún no jugado). */
  perHole: (number | null)[];
}

/**
 * Lógica de una partida de varios hoyos, independiente de la red y del render
 * (en Phase 5 se ejecuta en el servidor). Registra resultados de forma
 * idempotente y calcula clasificaciones.
 */
export class MatchController {
  private results: Map<string, PlayerHoleResult>[];
  holeIndex = 0;

  constructor(
    readonly holes: readonly CourseData[],
    readonly players: readonly MatchPlayer[],
  ) {
    if (!holes.length) throw new Error('Una partida necesita al menos un hoyo');
    if (!players.length) throw new Error('Una partida necesita al menos un jugador');
    this.results = holes.map(() => new Map());
  }

  get currentHole(): CourseData {
    return this.holes[this.holeIndex]!;
  }

  get isLastHole(): boolean {
    return this.holeIndex >= this.holes.length - 1;
  }

  /** Registra el resultado de un jugador en un hoyo. Repetir el mismo registro no tiene efecto. */
  recordResult(holeIndex: number, playerId: string, result: HoleResult): boolean {
    const bucket = this.results[holeIndex];
    if (!bucket || bucket.has(playerId) || !this.players.some((p) => p.id === playerId)) return false;
    const course = this.holes[holeIndex]!;
    const score = calculateScore(result, { par: course.par }).total;
    bucket.set(playerId, { ...result, playerId, score });
    return true;
  }

  isHoleComplete(holeIndex = this.holeIndex): boolean {
    return this.results[holeIndex]!.size === this.players.length;
  }

  /** Avanza al siguiente hoyo. Devuelve false si era el último. */
  nextHole(): boolean {
    if (this.isLastHole) return false;
    this.holeIndex++;
    return true;
  }

  holeResults(holeIndex = this.holeIndex): PlayerHoleResult[] {
    return [...this.results[holeIndex]!.values()].sort(compareResults);
  }

  /** Clasificación general: más puntos; a igualdad, menos golpes y luego menos tiempo. */
  standings(): Standing[] {
    const rows = this.players.map((p) => {
      let totalScore = 0;
      let totalStrokes = 0;
      let totalTimeMs = 0;
      let holesCompleted = 0;
      const perHole = this.results.map((bucket) => {
        const r = bucket.get(p.id);
        if (!r) return null;
        totalScore += r.score;
        totalStrokes += r.strokes;
        totalTimeMs += r.timeMs;
        if (r.completed) holesCompleted++;
        return r.strokes;
      });
      return { playerId: p.id, name: p.name, color: p.color, isBot: p.isBot, position: 0, totalScore, totalStrokes, totalTimeMs, holesCompleted, perHole };
    });
    rows.sort((a, b) => b.totalScore - a.totalScore || a.totalStrokes - b.totalStrokes || a.totalTimeMs - b.totalTimeMs);
    rows.forEach((r, i) => {
      const prev = rows[i - 1];
      const tied = prev && prev.totalScore === r.totalScore && prev.totalStrokes === r.totalStrokes && prev.totalTimeMs === r.totalTimeMs;
      r.position = tied ? prev.position : i + 1;
    });
    return rows;
  }
}
