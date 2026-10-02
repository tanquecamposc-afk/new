/** GameConfig — reglas generales de la partida (valores de tuning propios). */
export const GameConfig = {
  /** Límite de tiros por hoyo antes de terminarlo automáticamente. */
  maxShotsPerHole: 12,
  /** Tiros de penalización al caer al agua / fuera del campo. */
  hazardPenaltyShots: 1,
  /** Pausa (s) antes de devolver la bola tras un hazard. */
  hazardResetDelay: 0.9,
  /** Límite de tiempo por hoyo (s). null = sin límite. Valor de tuning propio. */
  holeTimeLimitSec: 120 as number | null,
  /** Segundos finales en los que el HUD avisa del límite. */
  timeWarningSec: 20,
  /** Cuenta atrás antes de cada hoyo (s). */
  countdownSec: 3,
  /** Espera tras embocar antes de pasar a modo espectador (s). */
  spectateDelaySec: 1.6,
  /** Espera tras terminar todos antes de mostrar los resultados del hoyo (s). */
  holeEndDelaySec: 2,
  /** Pasar al siguiente hoyo automáticamente tras los resultados (s). */
  autoNextHoleSec: 12,
  /** Bots de práctica: máximo en sala local (coste de CPU del predictor). */
  maxPracticeBots: 7,
  /** Presupuesto de CPU por frame para los bots (ms). */
  botBudgetMs: 2.5,
} as const;

export const AppEnv = {
  env: (import.meta.env?.VITE_APP_ENV as string | undefined) ?? 'development',
  /** Panel de rendimiento F3 (inofensivo: sólo lectura). */
  debugEnabled: (import.meta.env?.VITE_ENABLE_DEBUG ?? 'true') === 'true',
  /**
   * Expone el motor en `window.__minigolf` para QA automatizado. Por defecto sólo
   * en desarrollo: en producción permitiría manipular la partida desde la consola.
   */
  exposeEngine: (import.meta.env?.VITE_EXPOSE_ENGINE ?? (import.meta.env?.DEV ? 'true' : 'false')) === 'true',
  serverUrl: (import.meta.env?.VITE_SERVER_URL as string | undefined) ?? '',
};
