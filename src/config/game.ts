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
} as const;

export const AppEnv = {
  env: (import.meta.env?.VITE_APP_ENV as string | undefined) ?? 'development',
  debugEnabled: (import.meta.env?.VITE_ENABLE_DEBUG ?? 'true') === 'true',
  serverUrl: (import.meta.env?.VITE_SERVER_URL as string | undefined) ?? '',
};
