import { EconomyConfig } from '@/config/economy';

/** Lo necesario para calcular las recompensas de una partida terminada. */
export interface MatchOutcome {
  mode: 'local' | 'quick' | 'private';
  position: number;
  players: number;
  totalScore: number;
  holesPlayed: number;
  holesCompleted: number;
  holeInOnes: number;
}

export interface RewardLine {
  label: string;
  xp: number;
  coins: number;
}

export interface Rewards {
  xp: number;
  coins: number;
  lines: RewardLine[];
}

/** Recompensas (fórmula interna documentada en config/economy.ts). */
export function computeRewards(o: MatchOutcome): Rewards {
  const R = EconomyConfig.rewards;
  const lines: RewardLine[] = [];
  lines.push({ label: `Hoyos jugados (${o.holesPlayed})`, xp: o.holesPlayed * R.xpPerHolePlayed, coins: 0 });
  if (o.holesCompleted) lines.push({ label: `Hoyos completados (${o.holesCompleted})`, xp: o.holesCompleted * R.xpPerHoleCompleted, coins: o.holesCompleted * R.coinsPerHoleCompleted });
  const scoreXp = Math.floor(Math.max(0, o.totalScore) / 100) * R.xpPer100Score;
  if (scoreXp) lines.push({ label: 'Puntuación', xp: scoreXp, coins: 0 });
  if (o.holeInOnes) lines.push({ label: `Hoyos en uno (${o.holeInOnes})`, xp: o.holeInOnes * R.xpHoleInOne, coins: o.holeInOnes * R.coinsHoleInOne });
  if (o.players >= 2 && o.position >= 1 && o.position <= R.placementCoins.length) {
    lines.push({ label: `Puesto ${o.position}º`, xp: R.placementXp[o.position - 1]!, coins: R.placementCoins[o.position - 1]! });
  }
  let xp = lines.reduce((s, l) => s + l.xp, 0);
  let coins = lines.reduce((s, l) => s + l.coins, 0);
  if (o.mode === 'local') {
    const m = R.practiceMultiplier;
    lines.push({ label: `Práctica local (×${m})`, xp: Math.round(xp * m) - xp, coins: Math.round(coins * m) - coins });
    xp = Math.round(xp * m);
    coins = Math.round(coins * m);
  }
  return { xp, coins, lines };
}
