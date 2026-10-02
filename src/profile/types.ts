import type { Equipped } from '@/cosmetics/catalog';

export interface PlayerStats {
  matches: number;
  wins: number;
  podiums: number;
  holesPlayed: number;
  holesCompleted: number;
  holeInOnes: number;
  totalStrokes: number;
  totalTimeMs: number;
  bestScore: number;
}

export interface MatchHistoryEntry {
  id: string;
  date: number;
  mode: 'local' | 'quick' | 'private';
  holes: number;
  position: number;
  players: number;
  score: number;
  strokes: number;
  xp: number;
  coins: number;
}

export interface Transaction {
  id: string;
  type: 'reward' | 'purchase' | 'grant';
  amount: number;
  item?: string;
  at: number;
}

export interface ProfileData {
  id: string;
  username: string;
  createdAt: number;
  xp: number;
  coins: number;
  owned: string[];
  equipped: Equipped;
  stats: PlayerStats;
  history: MatchHistoryEntry[];
  /** Ids de transacciones ya procesadas (idempotencia: compras, recompensas). */
  transactions: Transaction[];
}

export const EMPTY_STATS: PlayerStats = {
  matches: 0,
  wins: 0,
  podiums: 0,
  holesPlayed: 0,
  holesCompleted: 0,
  holeInOnes: 0,
  totalStrokes: 0,
  totalTimeMs: 0,
  bestScore: 0,
};
