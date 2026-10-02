/**
 * ScoreConfig — fórmula INTERNA de puntuación.
 *
 * El análisis sólo indica que el rendimiento combina número de golpes y tiempo.
 * NO existe una fórmula oficial documentada: ésta es propia y configurable.
 *
 *   score = (base + golpes + hoyoEnUno + bonusTiempo) × pointMultiplier
 *   golpes      = (par − strokes) × (bajo par ? underParPoints : overParPoints)
 *   bonusTiempo = timeBonusMax × clamp(1 − t / (timeBonusWindowSec × timeMultiplier), 0, 1)
 *
 * Si el hoyo no se completa (límite de golpes/tiempo) → dnfScore.
 */
export const ScoreConfig = {
  basePoints: 1000,
  underParPoints: 250,
  overParPoints: 150,
  holeInOneBonus: 500,
  timeBonusMax: 400,
  timeBonusWindowSec: 60,
  minScore: 50,
  dnfScore: 0,
} as const;
