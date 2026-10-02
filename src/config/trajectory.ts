/** TrajectoryConfig — trayectoria predictiva (valores de tuning propios). */
export const TrajectoryConfig = {
  /** Tiempo máximo simulado por predicción (s). */
  maxTime: 6,
  /** Se guarda un punto cada N pasos fijos (120 Hz / 4 = 30 puntos por segundo). */
  sampleEvery: 4,
  /** No se recalcula si la potencia cambia menos que esto… */
  minPowerDelta: 0.004,
  /** …y la dirección menos que esto (rad). */
  minAngleDelta: 0.004,
  /** Intervalo mínimo entre predicciones (ms) para no saturar CPUs débiles. */
  minIntervalMs: 50,
  /**
   * Presupuesto de CPU por frame (ms). La predicción se reparte entre varios
   * frames para no provocar tirones en Chromebooks (medido: 10–25 ms en total).
   */
  frameBudgetMs: 3,
  /** Si una predicción lleva varios frames pendiente, el presupuesto crece hasta este máximo. */
  maxFrameBudgetMs: 8,
  /** Modo "corto": la línea termina en el primer rebote y no muestra el punto final. */
  shortMaxBounces: 1,
  /** Separación entre puntos dibujados (m). */
  dotSpacing: 0.32,
  maxDots: 160,
} as const;

export type TrajectoryMode = 'off' | 'short' | 'full';
