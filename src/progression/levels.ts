import { EconomyConfig } from '@/config/economy';

/** XP necesaria para subir del nivel `level` al siguiente. */
export function xpToNext(level: number): number {
  return Math.round(EconomyConfig.xpBase * Math.pow(level, EconomyConfig.xpExponent));
}

/** Nivel y progreso a partir de la XP total acumulada. */
export function levelFromXp(totalXp: number): { level: number; intoLevel: number; needed: number; progress: number } {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp));
  while (level < EconomyConfig.maxLevel && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  const needed = level >= EconomyConfig.maxLevel ? 0 : xpToNext(level);
  return { level, intoLevel: rest, needed, progress: needed ? rest / needed : 1 };
}
