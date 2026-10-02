import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EconomyConfig } from '@/config/economy';
import { COSMETICS, DEFAULT_EQUIPPED, getCosmetic, resolveLook, STARTER_ITEMS } from '@/cosmetics/catalog';
import { PersistenceService, type StorageLike } from '@/persistence/PersistenceService';
import { levelFromXp, xpToNext } from '@/progression/levels';
import { computeRewards } from '@/progression/rewards';
import { ProfileService } from './ProfileService';

const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

const outcome = { mode: 'quick' as const, position: 1, players: 4, totalScore: 3200, holesPlayed: 3, holesCompleted: 3, holeInOnes: 1, strokes: 7, timeMs: 60000 };

describe('niveles y recompensas', () => {
  it('la XP sube de nivel con una curva creciente', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpToNext(1)).level).toBe(2);
    expect(xpToNext(5)).toBeGreaterThan(xpToNext(2));
    const l = levelFromXp(xpToNext(1) + 10);
    expect(l.intoLevel).toBe(10);
    expect(l.progress).toBeGreaterThan(0);
  });
  it('recompensas: más por ganar; la práctica local da la mitad', () => {
    const win = computeRewards(outcome);
    const last = computeRewards({ ...outcome, position: 4 });
    expect(win.coins).toBeGreaterThan(last.coins);
    const local = computeRewards({ ...outcome, mode: 'local' });
    expect(local.coins).toBe(Math.round(win.coins * EconomyConfig.rewards.practiceMultiplier));
    expect(win.lines.reduce((s, l) => s + l.xp, 0)).toBe(win.xp);
  });
});

describe('ProfileService', () => {
  let storage: ReturnType<typeof mem>;
  let p: ProfileService;
  beforeEach(() => {
    storage = mem();
    p = new ProfileService(new PersistenceService(storage));
  });

  it('perfil nuevo con monedas iniciales y objetos de inicio', () => {
    expect(p.getBalance()).toBe(EconomyConfig.startingCoins);
    for (const id of STARTER_ITEMS) expect(p.owns(id)).toBe(true);
    expect(p.equipped).toEqual(DEFAULT_EQUIPPED);
  });

  it('CurrencyService: suma, gasta, valida importes e ignora duplicados', () => {
    expect(p.addCurrency(100, 'tx1')).toEqual({ ok: true });
    expect(p.addCurrency(100, 'tx1')).toEqual({ ok: false, error: 'duplicate' });
    expect(p.addCurrency(-5, 'tx2')).toEqual({ ok: false, error: 'invalid_amount' });
    expect(p.addCurrency(1.5, 'tx3')).toEqual({ ok: false, error: 'invalid_amount' });
    expect(p.getBalance()).toBe(EconomyConfig.startingCoins + 100);
    expect(p.spendCurrency(10_000, 'tx4')).toEqual({ ok: false, error: 'insufficient_funds' });
    expect(p.canAfford(50)).toBe(true);
    expect(p.spendCurrency(50, 'tx5')).toEqual({ ok: true });
    expect(p.getBalance()).toBe(EconomyConfig.startingCoins + 50);
  });

  it('tienda: compra, no duplica, saldo insuficiente y nivel requerido', () => {
    const cheap = COSMETICS.find((c) => c.price > 0 && c.price <= EconomyConfig.startingCoins && !c.level)!;
    const r = p.purchase(cheap.id, 'buy-1');
    expect(r).toMatchObject({ ok: true });
    expect(p.owns(cheap.id)).toBe(true);
    expect(p.getBalance()).toBe(EconomyConfig.startingCoins - cheap.price);
    // Doble clic (mismo txId) y recompra (otro txId): nunca se cobra dos veces.
    expect(p.purchase(cheap.id, 'buy-1')).toEqual({ ok: false, error: 'duplicate' });
    expect(p.purchase(cheap.id, 'buy-2')).toEqual({ ok: false, error: 'already_owned' });
    expect(p.getBalance()).toBe(EconomyConfig.startingCoins - cheap.price);
    const pricey = COSMETICS.find((c) => !c.level && !p.owns(c.id) && c.price > p.getBalance())!;
    expect(p.purchase(pricey.id, 'buy-3')).toEqual({ ok: false, error: 'insufficient_funds' });
    const locked = COSMETICS.find((c) => (c.level ?? 0) > 1)!;
    p.addCurrency(5000, 'gift');
    expect(p.purchase(locked.id, 'buy-4')).toEqual({ ok: false, error: 'level_required' });
    expect(p.purchase('no-existe', 'buy-5')).toEqual({ ok: false, error: 'unknown_item' });
  });

  it('inventario: sólo se equipa lo que se tiene; desequipar vuelve al defecto', () => {
    const item = COSMETICS.find((c) => c.category === 'skin' && c.price > 0 && !c.level && c.price <= EconomyConfig.startingCoins)!;
    expect(p.equip(item.id)).toBe(false);
    p.purchase(item.id, 'b');
    expect(p.equip(item.id)).toBe(true);
    expect(p.equipped.skin).toBe(item.id);
    p.unequip('skin');
    expect(p.equipped.skin).toBe(DEFAULT_EQUIPPED.skin);
  });

  it('recompensas de partida: una sola vez, sube de nivel, estadísticas e historial', () => {
    const before = p.getBalance();
    const g = p.grantMatchRewards('match-1', outcome);
    expect(g.granted).toBe(true);
    expect(p.getBalance()).toBe(before + g.rewards.coins + g.levelUpCoins);
    expect(p.profile.xp).toBe(g.rewards.xp);
    expect(g.levelAfter).toBeGreaterThanOrEqual(g.levelBefore);
    const again = p.grantMatchRewards('match-1', outcome);
    expect(again.granted).toBe(false);
    expect(p.profile.xp).toBe(g.rewards.xp);
    expect(p.profile.stats).toMatchObject({ matches: 1, wins: 1, podiums: 1, holeInOnes: 1, holesPlayed: 3 });
    expect(p.profile.history[0]).toMatchObject({ id: 'match-1', position: 1 });
  });

  it('persiste y se recupera; datos corruptos → perfil válido', () => {
    p.addCurrency(77, 'x');
    const again = new ProfileService(new PersistenceService(storage));
    expect(again.getBalance()).toBe(EconomyConfig.startingCoins + 77);
    // Corrupción: monedas negativas, objeto inexistente equipado, item falso en inventario.
    const raw = JSON.parse(storage.data.get('minigolf-party:profile')!);
    raw.data.coins = -999;
    raw.data.owned.push('trampa');
    raw.data.equipped.skin = 'skin-metal';
    storage.data.set('minigolf-party:profile', JSON.stringify(raw));
    const fixed = new ProfileService(new PersistenceService(storage));
    expect(fixed.getBalance()).toBe(EconomyConfig.startingCoins);
    expect(fixed.owns('trampa')).toBe(false);
    expect(fixed.equipped.skin).toBe(DEFAULT_EQUIPPED.skin);
    storage.data.set('minigolf-party:profile', '{basura');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(new ProfileService(new PersistenceService(storage)).getBalance()).toBe(EconomyConfig.startingCoins);
  });
});

describe('cosméticos', () => {
  it('son sólo visuales: el catálogo no contiene parámetros de juego', () => {
    for (const c of COSMETICS) {
      for (const k of Object.keys(c)) expect(['id', 'name', 'category', 'rarity', 'price', 'level', 'pattern', 'color', 'accent', 'effect']).toContain(k);
    }
  });
  it('resolveLook: color automático usa el color de la plaza', () => {
    expect(resolveLook(DEFAULT_EQUIPPED, 0x123456).color).toBe(0x123456);
    expect(resolveLook({ ...DEFAULT_EQUIPPED, color: 'color-sun' }, 0x123456).color).toBe(getCosmetic('color-sun')!.color);
    expect(resolveLook({ ...DEFAULT_EQUIPPED, trail: 'trail-fire' }, 0).trail).not.toBeNull();
  });
});
