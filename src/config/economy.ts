/**
 * EconomyConfig — progresión y moneda virtual (valores de tuning propios).
 * La economía es sólo cosmética: nada de lo que se compra afecta al juego.
 */
export const EconomyConfig = {
  currencyName: 'monedas',
  startingCoins: 150,
  /** XP necesaria para pasar del nivel n al n+1: base · n^exp. */
  xpBase: 120,
  xpExponent: 1.35,
  maxLevel: 99,
  rewards: {
    xpPerHolePlayed: 20,
    xpPerHoleCompleted: 25,
    /** XP por cada 100 puntos de puntuación total. */
    xpPer100Score: 4,
    xpHoleInOne: 60,
    coinsPerHoleCompleted: 10,
    coinsHoleInOne: 25,
    /** Monedas por puesto final (índice 0 = 1º). Sólo con 2+ jugadores. */
    placementCoins: [60, 35, 20],
    placementXp: [80, 50, 30],
    /** Multiplicador en práctica local (con bots se puede repetir sin límite). */
    practiceMultiplier: 0.5,
    levelUpCoins: 50,
  },
  /** Últimas partidas guardadas en el historial del perfil. */
  historySize: 20,
  /** Transacciones recordadas para garantizar idempotencia. */
  transactionMemory: 200,
} as const;
