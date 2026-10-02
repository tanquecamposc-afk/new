import { EconomyConfig } from '@/config/economy';
import { getCosmetic, sanitizeEquipped, STARTER_ITEMS } from '@/cosmetics/catalog';
import { sanitizeName } from '@/multiplayer/Room';
import { isRecord } from '@/persistence/PersistenceService';
import { EMPTY_STATS, type MatchHistoryEntry, type PlayerStats, type ProfileData, type Transaction } from './types';

const nonNegInt = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);

export function newProfileId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function defaultProfile(username = 'Jugador'): ProfileData {
  return {
    id: newProfileId(),
    username: sanitizeName(username) ?? 'Jugador',
    createdAt: Date.now(),
    xp: 0,
    coins: EconomyConfig.startingCoins,
    owned: [...STARTER_ITEMS],
    equipped: sanitizeEquipped(undefined),
    stats: { ...EMPTY_STATS },
    history: [],
    transactions: [],
  };
}

/**
 * Valida un perfil cargado. Corrige lo recuperable (valores negativos, ids de
 * objetos inexistentes, equipados no poseídos) y devuelve null si no es un perfil.
 */
export function validateProfile(raw: unknown): ProfileData | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  const d = defaultProfile();
  const owned = Array.isArray(raw.owned) ? raw.owned.filter((i): i is string => typeof i === 'string' && !!getCosmetic(i)) : [];
  const ownedSet = new Set([...STARTER_ITEMS, ...owned]);
  const equipped = sanitizeEquipped(isRecord(raw.equipped) ? raw.equipped : undefined);
  for (const k of Object.keys(equipped) as (keyof typeof equipped)[]) if (!ownedSet.has(equipped[k])) equipped[k] = d.equipped[k];
  const st = isRecord(raw.stats) ? raw.stats : {};
  const stats = Object.fromEntries(Object.keys(EMPTY_STATS).map((k) => [k, nonNegInt(st[k])])) as unknown as PlayerStats;
  const history = Array.isArray(raw.history)
    ? (raw.history.filter((h) => isRecord(h) && typeof h.id === 'string' && typeof h.date === 'number') as unknown as MatchHistoryEntry[]).slice(0, EconomyConfig.historySize)
    : [];
  const transactions = Array.isArray(raw.transactions)
    ? (raw.transactions.filter((t) => isRecord(t) && typeof t.id === 'string') as unknown as Transaction[]).slice(-EconomyConfig.transactionMemory)
    : [];
  return {
    id: raw.id,
    username: typeof raw.username === 'string' ? (sanitizeName(raw.username) ?? d.username) : d.username,
    createdAt: nonNegInt(raw.createdAt, d.createdAt),
    xp: nonNegInt(raw.xp),
    coins: nonNegInt(raw.coins, d.coins),
    owned: [...ownedSet],
    equipped,
    stats,
    history,
    transactions,
  };
}
