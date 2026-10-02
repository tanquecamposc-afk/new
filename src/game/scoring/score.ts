import { ScoreConfig } from '@/config/scoring';
import { clamp } from '@/utils/math';

export interface HoleResult {
  strokes: number;
  timeMs: number;
  /** false si se agotó el límite de golpes o de tiempo. */
  completed: boolean;
}

export interface CourseModifiers {
  par: number;
  /** Escala la ventana de bonus por tiempo (hoyos largos → más tiempo). */
  timeMultiplier?: number;
  /** Multiplicador global (hoyos difíciles valen más). */
  pointMultiplier?: number;
}

export interface ScoreBreakdown {
  total: number;
  base: number;
  strokePoints: number;
  holeInOne: number;
  timeBonus: number;
}

type ScoreCfg = { [K in keyof typeof ScoreConfig]: number };

/** Puntuación interna configurable (ver config/scoring.ts). No es la fórmula del juego original. */
export function calculateScore(result: HoleResult, mods: CourseModifiers, cfg: ScoreCfg = ScoreConfig): ScoreBreakdown {
  if (!result.completed) return { total: cfg.dnfScore, base: 0, strokePoints: 0, holeInOne: 0, timeBonus: 0 };
  const delta = mods.par - result.strokes;
  const strokePoints = delta >= 0 ? delta * cfg.underParPoints : delta * cfg.overParPoints;
  const holeInOne = result.strokes === 1 ? cfg.holeInOneBonus : 0;
  const window = cfg.timeBonusWindowSec * (mods.timeMultiplier ?? 1);
  const timeBonus = Math.round(cfg.timeBonusMax * clamp(1 - result.timeMs / 1000 / window, 0, 1));
  const raw = (cfg.basePoints + strokePoints + holeInOne + timeBonus) * (mods.pointMultiplier ?? 1);
  return { total: Math.max(cfg.minScore, Math.round(raw)), base: cfg.basePoints, strokePoints, holeInOne, timeBonus };
}

/**
 * Orden de clasificación: completados primero, luego menos golpes y, a igualdad,
 * menos tiempo (el análisis describe ambas variables como determinantes).
 */
export function compareResults(a: HoleResult, b: HoleResult): number {
  if (a.completed !== b.completed) return a.completed ? -1 : 1;
  if (a.strokes !== b.strokes) return a.strokes - b.strokes;
  return a.timeMs - b.timeMs;
}

/** Nombre del resultado respecto al par. */
export function holeResultName(strokes: number, par: number, completed = true): string {
  if (!completed) return 'Sin terminar';
  if (strokes === 1) return '¡HOYO EN UNO!';
  const names: Record<number, string> = { [-3]: '¡Albatros!', [-2]: '¡Eagle!', [-1]: '¡Birdie!', 0: '¡Par!', 1: 'Bogey', 2: 'Doble bogey', 3: 'Triple bogey' };
  return names[strokes - par] ?? `${strokes} golpes`;
}
