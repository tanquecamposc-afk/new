import { EconomyConfig } from '@/config/economy';
import { getCosmetic, type CosmeticCategory, type Equipped, DEFAULT_EQUIPPED } from '@/cosmetics/catalog';
import { sanitizeName } from '@/multiplayer/Room';
import { PersistenceService } from '@/persistence/PersistenceService';
import { levelFromXp } from '@/progression/levels';
import { computeRewards, type MatchOutcome, type Rewards } from '@/progression/rewards';
import type { MatchHistoryEntry, ProfileData, Transaction } from './types';
import { defaultProfile, validateProfile } from './validate';

export const PROFILE_KEY = 'profile';
export const PROFILE_VERSION = 1;

export type TxResult = { ok: true } | { ok: false; error: 'invalid_amount' | 'duplicate' | 'insufficient_funds' };
export type PurchaseResult =
  | { ok: true; item: string; balance: number }
  | { ok: false; error: 'unknown_item' | 'already_owned' | 'insufficient_funds' | 'level_required' | 'duplicate' | 'not_for_sale' };

export interface RewardGrant {
  rewards: Rewards;
  levelBefore: number;
  levelAfter: number;
  levelUpCoins: number;
  /** false si esa recompensa ya se había entregado (idempotencia). */
  granted: boolean;
}

/**
 * Perfil del jugador: única capa de guardado para perfil, moneda, inventario,
 * cosméticos equipados, XP, estadísticas e historial. Cada operación se aplica
 * sobre una copia, se valida y sólo entonces se confirma y se guarda.
 * Preparado para un backend de cuentas: la misma interfaz podría sincronizar
 * con un servidor.
 */
export class ProfileService {
  private data: ProfileData;
  private listeners = new Set<(p: ProfileData) => void>();

  constructor(private readonly store: PersistenceService = new PersistenceService()) {
    this.data = store.load(PROFILE_KEY, PROFILE_VERSION, validateProfile, () => defaultProfile()).value;
    this.save();
  }

  get profile(): Readonly<ProfileData> {
    return this.data;
  }

  get level() {
    return levelFromXp(this.data.xp);
  }

  subscribe(l: (p: ProfileData) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private commit(next: ProfileData): void {
    this.data = next;
    this.save();
    this.listeners.forEach((l) => l(this.data));
  }

  private save(): void {
    this.store.save(PROFILE_KEY, PROFILE_VERSION, this.data);
  }

  private draft(): ProfileData {
    return structuredClone(this.data);
  }

  private seen(txId: string): boolean {
    return this.data.transactions.some((t) => t.id === txId);
  }

  private pushTx(d: ProfileData, tx: Transaction): void {
    d.transactions.push(tx);
    if (d.transactions.length > EconomyConfig.transactionMemory) d.transactions.splice(0, d.transactions.length - EconomyConfig.transactionMemory);
  }

  // ---------------- CurrencyService ----------------

  getBalance(): number {
    return this.data.coins;
  }

  canAfford(amount: number): boolean {
    return Number.isInteger(amount) && amount >= 0 && this.data.coins >= amount;
  }

  /** Suma moneda. `txId` evita que la misma operación se procese dos veces. */
  addCurrency(amount: number, txId: string): TxResult {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'invalid_amount' };
    if (this.seen(txId)) return { ok: false, error: 'duplicate' };
    const d = this.draft();
    d.coins += amount;
    this.pushTx(d, { id: txId, type: 'grant', amount, at: Date.now() });
    this.commit(d);
    return { ok: true };
  }

  spendCurrency(amount: number, txId: string): TxResult {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'invalid_amount' };
    if (this.seen(txId)) return { ok: false, error: 'duplicate' };
    if (!this.canAfford(amount)) return { ok: false, error: 'insufficient_funds' };
    const d = this.draft();
    d.coins -= amount;
    this.pushTx(d, { id: txId, type: 'purchase', amount: -amount, at: Date.now() });
    this.commit(d);
    return { ok: true };
  }

  // ---------------- Tienda e inventario ----------------

  owns(itemId: string): boolean {
    return this.data.owned.includes(itemId);
  }

  /**
   * Compra: comprueba que exista, que no se tenga ya, el nivel y el saldo;
   * descuenta, guarda el objeto y notifica, todo en una única confirmación.
   * El mismo `txId` (p. ej. un doble clic) nunca se cobra dos veces.
   */
  purchase(itemId: string, txId: string): PurchaseResult {
    const item = getCosmetic(itemId);
    if (!item) return { ok: false, error: 'unknown_item' };
    if (this.seen(txId)) return { ok: false, error: 'duplicate' };
    if (this.owns(itemId)) return { ok: false, error: 'already_owned' };
    if (item.price <= 0) return { ok: false, error: 'not_for_sale' };
    if (item.level && this.level.level < item.level) return { ok: false, error: 'level_required' };
    if (!this.canAfford(item.price)) return { ok: false, error: 'insufficient_funds' };
    const d = this.draft();
    d.coins -= item.price;
    d.owned.push(itemId);
    this.pushTx(d, { id: txId, type: 'purchase', amount: -item.price, item: itemId, at: Date.now() });
    this.commit(d);
    return { ok: true, item: itemId, balance: d.coins };
  }

  equip(itemId: string): boolean {
    const item = getCosmetic(itemId);
    if (!item || !this.owns(itemId)) return false;
    const d = this.draft();
    d.equipped[item.category] = itemId;
    this.commit(d);
    return true;
  }

  /** Vuelve al objeto por defecto de la categoría. */
  unequip(category: CosmeticCategory): void {
    const d = this.draft();
    d.equipped[category] = DEFAULT_EQUIPPED[category];
    this.commit(d);
  }

  get equipped(): Equipped {
    return this.data.equipped;
  }

  setUsername(name: string): boolean {
    const clean = sanitizeName(name);
    if (!clean) return false;
    const d = this.draft();
    d.username = clean;
    this.commit(d);
    return true;
  }

  // ---------------- Progresión ----------------

  /**
   * Entrega las recompensas de una partida una sola vez (`matchId`), actualiza
   * XP, nivel, monedas, estadísticas e historial.
   */
  grantMatchRewards(
    matchId: string,
    outcome: MatchOutcome & { strokes: number; timeMs: number },
  ): RewardGrant {
    const levelBefore = this.level.level;
    const rewards = computeRewards(outcome);
    const txId = `reward:${matchId}`;
    if (this.seen(txId)) return { rewards, levelBefore, levelAfter: levelBefore, levelUpCoins: 0, granted: false };
    const d = this.draft();
    d.xp += rewards.xp;
    const levelAfter = levelFromXp(d.xp).level;
    const levelUpCoins = (levelAfter - levelBefore) * EconomyConfig.rewards.levelUpCoins;
    d.coins += rewards.coins + levelUpCoins;
    this.pushTx(d, { id: txId, type: 'reward', amount: rewards.coins + levelUpCoins, at: Date.now() });
    const s = d.stats;
    s.matches++;
    if (outcome.players >= 2 && outcome.position === 1) s.wins++;
    if (outcome.players >= 2 && outcome.position <= 3) s.podiums++;
    s.holesPlayed += outcome.holesPlayed;
    s.holesCompleted += outcome.holesCompleted;
    s.holeInOnes += outcome.holeInOnes;
    s.totalStrokes += outcome.strokes;
    s.totalTimeMs += outcome.timeMs;
    s.bestScore = Math.max(s.bestScore, outcome.totalScore);
    const entry: MatchHistoryEntry = {
      id: matchId,
      date: Date.now(),
      mode: outcome.mode,
      holes: outcome.holesPlayed,
      position: outcome.position,
      players: outcome.players,
      score: outcome.totalScore,
      strokes: outcome.strokes,
      xp: rewards.xp,
      coins: rewards.coins + levelUpCoins,
    };
    d.history = [entry, ...d.history].slice(0, EconomyConfig.historySize);
    this.commit(d);
    return { rewards, levelBefore, levelAfter, levelUpCoins, granted: true };
  }
}
