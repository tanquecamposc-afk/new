export type Difficulty = 'normal' | 'hard' | 'insane' | 'nightmare';

export interface DifficultyMods {
  id: Difficulty;
  name: string;
  desc: string;
  color: string;
  enemyHp: number;
  enemyDmg: number;
  enemyCount: number;
  enemySpeed: number;
  /** Multiplier applied to time limits (lower = less time). */
  timeLimit: number;
  /** Stealth detection speed. */
  detection: number;
  rivalSpeed: number;
  reward: number;
  darkness: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyMods> = {
  normal: { id: 'normal', name: 'NORMAL', desc: 'The standard experience.', color: '#3dffa2', enemyHp: 1, enemyDmg: 1, enemyCount: 1, enemySpeed: 1, timeLimit: 1, detection: 1, rivalSpeed: 1, reward: 1, darkness: 0 },
  hard: { id: 'hard', name: 'HARD', desc: 'More enemies, less time, more damage.', color: '#ffd23d', enemyHp: 1.3, enemyDmg: 1.4, enemyCount: 1.4, enemySpeed: 1.1, timeLimit: 0.85, detection: 1.35, rivalSpeed: 1.06, reward: 1.5, darkness: 0 },
  insane: { id: 'insane', name: 'INSANE', desc: 'Punishing. Every mistake costs.', color: '#ff6a3d', enemyHp: 1.7, enemyDmg: 2, enemyCount: 1.8, enemySpeed: 1.2, timeLimit: 0.72, detection: 1.8, rivalSpeed: 1.12, reward: 2.2, darkness: 0.1 },
  nightmare: { id: 'nightmare', name: 'NIGHTMARE', desc: 'The levels have changed. Darker. Deadlier.', color: '#ff2d55', enemyHp: 2.2, enemyDmg: 2.6, enemyCount: 2.2, enemySpeed: 1.3, timeLimit: 0.6, detection: 2.2, rivalSpeed: 1.16, reward: 3, darkness: 0.35 },
};

export type Mutation = 'speed' | 'onelife' | 'darkness' | 'enemies' | 'lowgrav' | 'chaos';

export const MUTATIONS: { id: Mutation; name: string; desc: string; icon: string; bonus: number }[] = [
  { id: 'speed', name: 'SPEED', desc: 'Everything runs 35% faster.', icon: '⏩', bonus: 0.3 },
  { id: 'onelife', name: 'ONE LIFE', desc: 'Any damage kills you.', icon: '💀', bonus: 0.6 },
  { id: 'darkness', name: 'DARKNESS', desc: 'Visibility is severely limited.', icon: '🌑', bonus: 0.3 },
  { id: 'enemies', name: 'MORE ENEMIES', desc: 'Double the enemies.', icon: '👥', bonus: 0.4 },
  { id: 'lowgrav', name: 'LOW GRAVITY', desc: 'Floaty jumps, long falls.', icon: '🪐', bonus: 0.1 },
  { id: 'chaos', name: 'CHAOS', desc: 'Random mutations every run.', icon: '🌀', bonus: 0.8 },
];

/** Resolve the effective mutation set (CHAOS rolls random extras). */
export function resolveMutations(list: Mutation[], seed = Math.random()): Set<Mutation> {
  const set = new Set<Mutation>(list);
  if (set.has('chaos')) {
    const pool: Mutation[] = ['speed', 'darkness', 'enemies', 'lowgrav'];
    let s = seed;
    for (let i = 0; i < 2; i++) {
      s = (s * 9301 + 49297) % 233280 / 233280 || 0.37;
      set.add(pool[Math.floor(s * pool.length)]);
    }
  }
  return set;
}
