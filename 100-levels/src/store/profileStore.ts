/**
 * Persistent player profile. Every mutation goes through an action here, is
 * validated, applied atomically and saved. Guards prevent duplicated rewards.
 */
import { create } from 'zustand';
import { SaveData, SaveSystem, Settings, Equipped, LevelRecord, defaultSave } from '../save/SaveSystem';
import { CHESTS, ITEMS, Rarity, RARITY_COLOR, itemById, ItemDef } from '../data/items';
import { ACHIEVEMENTS } from '../data/achievements';
import { getLevel, LEVELS, SECRET_IDS, SECRET_UNLOCKS, TOTAL_SECRETS } from '../data/levels';
import { DIFFICULTIES, MUTATIONS } from '../data/modes';
import { useGame, LevelSummary } from './gameStore';

export const xpForLevel = (lvl: number) => 100 + (lvl - 1) * 60;

export interface LevelResult {
  runToken: string;
  levelId: string;
  time: number;
  coins: number;
  damageTaken: number;
  challengeMet: boolean;
  kills: number;
  bossDefeated?: string;
  accuracy?: number;
  secretsFound: string[];
  raceWon?: boolean;
  chestsFound: Rarity[];
}

export interface ChestReward {
  rarity: Rarity;
  coins: number;
  item: ItemDef | null;
  duplicate: boolean;
}

interface ProfileStore {
  data: SaveData;
  load: () => void;
  persist: () => void;
  completeLevel: (r: LevelResult) => LevelSummary | null;
  recordDeath: () => void;
  addXp: (n: number) => number;
  addCoins: (n: number) => void;
  buyItem: (id: string) => { ok: boolean; msg: string };
  buyChest: (r: Rarity) => { ok: boolean; msg: string };
  openChest: (r: Rarity) => ChestReward | null;
  equip: (slot: keyof Equipped, id: string | null) => void;
  findSecret: (id: string) => boolean;
  consumePotion: () => boolean;
  consumeRevive: () => boolean;
  setSettings: (p: Partial<Settings>) => void;
  setName: (n: string) => void;
  addKill: (n?: number) => void;
  recordJump: () => void;
  saveSpeedrun: (runId: string, total: number, splits: number[]) => boolean;
  checkAchievements: () => void;
  unlockAchievement: (id: string) => void;
  replaceData: (d: SaveData) => void;
  resetAll: () => void;
  isUnlocked: (id: string) => boolean;
  secretLevelUnlocked: (index: number) => boolean;
  totalStars: () => number;
}

const processedRuns = new Set<string>();
let saveTimer: number | null = null;

const clone = (d: SaveData): SaveData => ({
  ...d,
  profile: { ...d.profile },
  progress: { ...d.progress, records: { ...d.progress.records }, worldsSeen: [...d.progress.worldsSeen] },
  secrets: [...d.secrets],
  inventory: { ...d.inventory, owned: [...d.inventory.owned], equipped: { ...d.inventory.equipped }, chests: { ...d.inventory.chests } },
  achievements: { ...d.achievements },
  stats: { ...d.stats, bossesDefeated: [...d.stats.bossesDefeated] },
  speedrun: { ...d.speedrun, best: { ...d.speedrun.best }, bestSplits: { ...d.speedrun.bestSplits } },
  settings: { ...d.settings, mutations: [...d.settings.mutations] },
});

function rollChest(r: Rarity, owned: Set<string>): ChestReward {
  const def = CHESTS[r];
  const coins = Math.round(def.coins[0] + Math.random() * (def.coins[1] - def.coins[0]));
  let item: ItemDef | null = null;
  let duplicate = false;
  if (Math.random() < def.itemChance) {
    // Weighted towards the lower rarity in the pool
    const weights = def.pool.map((_, i) => Math.pow(0.45, i));
    const total = weights.reduce((a, b) => a + b, 0);
    let x = Math.random() * total;
    let rar = def.pool[0];
    for (let i = 0; i < def.pool.length; i++) {
      x -= weights[i];
      if (x <= 0) { rar = def.pool[i]; break; }
    }
    const candidates = ITEMS.filter((i) => i.rarity === rar && i.category !== 'object' && !(i.source === 'Default') && !i.source?.startsWith('Level') && !i.source?.startsWith('Secret') && !i.source?.startsWith('Complete'));
    const fresh = candidates.filter((i) => !owned.has(i.id));
    const poolItems = fresh.length ? fresh : candidates;
    if (poolItems.length) {
      item = poolItems[Math.floor(Math.random() * poolItems.length)];
      duplicate = owned.has(item.id);
    }
  }
  if (!item && Math.random() < 0.5) item = itemById('obj_potion')!;
  return { rarity: r, coins, item, duplicate };
}

export const useProfile = create<ProfileStore>((set, get) => {
  /** Apply a mutation to a cloned save, store it and schedule a save. */
  const mutate = (fn: (d: SaveData) => void) => {
    const d = clone(get().data);
    fn(d);
    set({ data: d });
    get().persist();
  };

  return {
    data: defaultSave(),

    load: () => set({ data: SaveSystem.load() }),

    persist: () => {
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        SaveSystem.save(get().data);
        saveTimer = null;
      }, 150);
    },

    completeLevel: (r) => {
      if (processedRuns.has(r.runToken)) return null; // anti-duplication
      processedRuns.add(r.runToken);
      const meta = getLevel(r.levelId);
      if (!meta) return null;
      const d = clone(get().data);
      const diff = DIFFICULTIES[d.settings.difficulty];
      const mutBonus = d.settings.mutations.reduce((a, m) => a + (MUTATIONS.find((x) => x.id === m)?.bonus ?? 0), 0);
      const mult = diff.reward * (1 + mutBonus);
      const prev: LevelRecord = d.progress.records[r.levelId] ?? { stars: [false, false, false], bestTime: Infinity, completions: 0 };
      const first = prev.completions === 0;
      const stars: [boolean, boolean, boolean] = [true, r.time <= meta.parTime, r.challengeMet];
      const merged: [boolean, boolean, boolean] = [true, prev.stars[1] || stars[1], prev.stars[2] || stars[2]];
      const newStars = merged.filter(Boolean).length - prev.stars.filter(Boolean).length;
      const newBest = r.time < prev.bestTime;
      d.progress.records[r.levelId] = { stars: merged, bestTime: Math.min(prev.bestTime, r.time), completions: prev.completions + 1 };

      const world = Math.max(1, meta.world);
      const rewards: string[] = [];
      const extra: string[] = [];
      let coins = r.coins + Math.round((20 + world * 8) * (meta.boss ? 3 : 1) * (first ? 1.5 : 0.6) * mult);
      let xp = Math.round((50 + world * 15) * (meta.boss ? 2.5 : 1) * (first ? 2 : 0.5) * mult);
      coins += newStars * 20;
      xp += newStars * 30 + r.secretsFound.length * 60;
      if (stars.every(Boolean)) extra.push('PERFECT CLEAR');

      // Unlock progression
      if (!r.levelId.startsWith('S')) {
        const n = Number(r.levelId);
        if (n + 1 > d.progress.unlocked && n < 100) d.progress.unlocked = n + 1;
        if (n === 100 && !d.progress.gameCompleted) {
          d.progress.gameCompleted = true;
          extra.push('NIGHTMARE DIFFICULTY UNLOCKED', 'LEVEL MUTATIONS UNLOCKED', 'SPEEDRUN MODE UNLOCKED');
        }
      }

      // Stats
      d.stats.levelsCompleted++;
      d.stats.kills += r.kills;
      if (r.damageTaken === 0) d.stats.noDamageClears++;
      if (r.raceWon) d.stats.racesWon++;
      if (r.accuracy !== undefined && r.accuracy >= 0.999) d.stats.perfectAccuracy++;
      if (r.bossDefeated && !d.stats.bossesDefeated.includes(r.bossDefeated)) {
        d.stats.bossesDefeated.push(r.bossDefeated);
      }

      // Secrets (dedup)
      for (const s of r.secretsFound) if (SECRET_IDS.includes(s) && !d.secrets.includes(s)) d.secrets.push(s);

      // Item rewards for specific levels (only granted once — ownership check)
      const grant = (id: string) => {
        if (!d.inventory.owned.includes(id)) {
          d.inventory.owned.push(id);
          const it = itemById(id);
          if (it) rewards.push(`${it.icon} ${it.name}`);
        }
      };
      if (r.levelId === '24') grant('wpn_bow');
      if (r.levelId === '27') grant('wpn_staff');
      if (r.levelId === 'S1') grant('skin_retro');
      if (r.levelId === '100') grant('skin_champion');

      // Boss chests on first clear
      if (meta.boss && first) {
        const rar: Rarity = meta.num === 100 ? 'mythic' : meta.num >= 81 ? 'epic' : meta.num % 10 === 0 ? 'rare' : 'common';
        d.inventory.chests[rar]++;
        rewards.push(`📦 ${CHESTS[rar].name}`);
      }
      for (const c of r.chestsFound) {
        d.inventory.chests[c]++;
        rewards.push(`📦 ${CHESTS[c].name}`);
      }

      coins = Math.round(coins);
      d.profile.coins += coins;
      d.stats.coinsEarned += coins;
      // XP / level ups
      const startLevel = d.profile.level;
      d.profile.xp += xp;
      while (d.profile.xp >= xpForLevel(d.profile.level)) {
        d.profile.xp -= xpForLevel(d.profile.level);
        d.profile.level++;
        d.profile.coins += 50;
        d.inventory.potions = Math.min(99, d.inventory.potions + 1);
      }
      const levelUps = d.profile.level - startLevel;
      if (levelUps > 0) rewards.push(`⬆ Level ${d.profile.level} (+${levelUps * 50} coins, +${levelUps} 🧪)`);

      set({ data: d });
      get().persist();
      get().checkAchievements();
      if (r.damageTaken === 0) get().unlockAchievement('untouchable');
      if (d.settings.difficulty === 'insane' || d.settings.difficulty === 'nightmare') get().unlockAchievement('hard_mode');
      if (d.settings.mutations.length) get().unlockAchievement('mutant');
      if (r.levelId.startsWith('S')) get().unlockAchievement('secret_finder');
      if (meta.genre === 'racing' && r.raceWon && stars[1]) get().unlockAchievement('speed_demon');
      if (meta.genre === 'stealth' && r.challengeMet) get().unlockAchievement('ghost');
      if (r.accuracy !== undefined && r.accuracy >= 0.999) get().unlockAchievement('sharpshooter');

      return {
        levelId: r.levelId,
        levelName: meta.name,
        stars,
        newStars,
        time: r.time,
        bestTime: Math.min(prev.bestTime, r.time),
        newBest: newBest && !first,
        xp,
        coins,
        rewards,
        levelUps,
        extra,
        isFinal: r.levelId === '100',
      };
    },

    recordDeath: () => {
      mutate((d) => { d.stats.deaths++; });
      get().checkAchievements();
    },

    addXp: (n) => {
      let ups = 0;
      mutate((d) => {
        d.profile.xp += n;
        while (d.profile.xp >= xpForLevel(d.profile.level)) {
          d.profile.xp -= xpForLevel(d.profile.level);
          d.profile.level++;
          ups++;
        }
      });
      return ups;
    },

    addCoins: (n) => {
      mutate((d) => {
        d.profile.coins = Math.max(0, d.profile.coins + n);
        if (n > 0) d.stats.coinsEarned += n;
      });
      get().checkAchievements();
    },

    buyItem: (id) => {
      const it = itemById(id);
      const d0 = get().data;
      if (!it || it.price <= 0) return { ok: false, msg: 'Not for sale' };
      const consumable = it.category === 'object';
      if (!consumable && d0.inventory.owned.includes(id)) return { ok: false, msg: 'Already owned' };
      if (d0.profile.coins < it.price) return { ok: false, msg: 'Not enough coins' };
      mutate((d) => {
        d.profile.coins -= it.price;
        if (id === 'obj_potion') d.inventory.potions = Math.min(99, d.inventory.potions + 1);
        else if (id === 'obj_revive') d.inventory.revives = Math.min(99, d.inventory.revives + 1);
        else d.inventory.owned.push(id);
      });
      get().checkAchievements();
      return { ok: true, msg: `${it.name} purchased!` };
    },

    buyChest: (r) => {
      const def = CHESTS[r];
      if (def.price <= 0) return { ok: false, msg: 'Not for sale' };
      if (get().data.profile.coins < def.price) return { ok: false, msg: 'Not enough coins' };
      mutate((d) => {
        d.profile.coins -= def.price;
        d.inventory.chests[r]++;
      });
      return { ok: true, msg: `${def.name} added to inventory` };
    },

    openChest: (r) => {
      if (get().data.inventory.chests[r] <= 0) return null;
      const owned = new Set(get().data.inventory.owned);
      const reward = rollChest(r, owned);
      mutate((d) => {
        d.inventory.chests[r]--; // consumed first: double-click can't open twice
        d.stats.chestsOpened++;
        let coins = reward.coins;
        if (reward.item) {
          if (reward.item.id === 'obj_potion') d.inventory.potions = Math.min(99, d.inventory.potions + 1);
          else if (reward.duplicate) coins += Math.round((reward.item.price || 400) * 0.4);
          else d.inventory.owned.push(reward.item.id);
        }
        reward.coins = coins;
        d.profile.coins += coins;
        d.stats.coinsEarned += coins;
      });
      if (r === 'legendary' || r === 'mythic') get().unlockAchievement('lucky');
      get().checkAchievements();
      return reward;
    },

    equip: (slot, id) => {
      const d0 = get().data;
      if (id !== null && !d0.inventory.owned.includes(id)) return;
      if ((slot === 'skin' || slot === 'weapon') && id === null) return;
      mutate((d) => {
        (d.inventory.equipped as unknown as Record<string, string | null>)[slot] = id;
      });
    },

    findSecret: (id) => {
      if (get().data.secrets.includes(id) || !SECRET_IDS.includes(id)) return false;
      const before = get().data.secrets.length;
      mutate((d) => {
        d.secrets.push(id);
        d.profile.coins += 100;
      });
      const after = before + 1;
      const idx = SECRET_UNLOCKS.findIndex((n) => n === after);
      if (idx >= 0) {
        useGame.getState().notify({ icon: '🔓', title: 'SECRET LEVEL UNLOCKED', text: `SECRET 0${idx + 1} is now available`, color: '#ffe066' });
      }
      get().checkAchievements();
      return true;
    },

    consumePotion: () => {
      if (get().data.inventory.potions <= 0) return false;
      mutate((d) => { d.inventory.potions--; });
      return true;
    },

    consumeRevive: () => {
      if (get().data.inventory.revives <= 0) return false;
      mutate((d) => { d.inventory.revives--; });
      return true;
    },

    setSettings: (p) => mutate((d) => { d.settings = { ...d.settings, ...p }; }),

    setName: (n) => mutate((d) => { d.profile.name = n.trim().slice(0, 16).toUpperCase() || 'PLAYER'; }),

    addKill: (n = 1) => {
      // kills are committed at level end; this is only for live achievements
      void n;
    },

    recordJump: () => {
      get().data.stats.jumps++; // cosmetic stat, saved with the next mutation
    },

    saveSpeedrun: (runId, total, splits) => {
      const prev = get().data.speedrun.best[runId] ?? Infinity;
      const record = total < prev;
      mutate((d) => {
        d.speedrun.runs++;
        if (record) {
          d.speedrun.best[runId] = total;
          d.speedrun.bestSplits[runId] = splits;
        }
      });
      get().unlockAchievement('speedrunner');
      return record;
    },

    unlockAchievement: (id) => {
      if (get().data.achievements[id]) return;
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      mutate((d) => {
        d.achievements[id] = Date.now();
        d.profile.coins += a.coins;
        d.profile.xp += a.xp;
        while (d.profile.xp >= xpForLevel(d.profile.level)) {
          d.profile.xp -= xpForLevel(d.profile.level);
          d.profile.level++;
        }
      });
      useGame.getState().notify({ icon: a.icon, title: 'ACHIEVEMENT UNLOCKED', text: `${a.name} — +${a.xp} XP${a.coins ? `, +${a.coins} coins` : ''}`, color: '#ffc94d' });
      window.dispatchEvent(new CustomEvent('achievement'));
    },

    checkAchievements: () => {
      const d = get().data;
      const u = get().unlockAchievement;
      const rec = d.progress.records;
      const done = (id: number) => (rec[String(id)]?.completions ?? 0) > 0;
      const worldDone = (w: number) => Array.from({ length: 10 }, (_, i) => (w - 1) * 10 + i + 1).every(done);
      if (done(1)) u('first_step');
      if (worldDone(1)) u('parkour_master');
      if (worldDone(2)) u('big_brain');
      if (worldDone(3)) u('gladiator');
      if (worldDone(4)) u('pole_position');
      if (worldDone(5)) u('nightmare_survivor');
      if (worldDone(6)) u('infiltrator');
      if (worldDone(8)) u('survivor');
      if (d.stats.bossesDefeated.length >= 1) u('first_boss');
      if (d.stats.bossesDefeated.length >= 10) u('boss_slayer');
      if (d.stats.kills >= 100) u('centurion');
      if (d.inventory.owned.length >= 10) u('collector');
      if (d.profile.coins >= 5000) u('rich');
      if (d.secrets.length >= 5) u('treasure_hunter');
      if (d.secrets.length >= TOTAL_SECRETS) u('archaeologist');
      if (d.progress.unlocked >= 99) u('almost_there');
      if (done(100)) u('the_100');
      if (d.stats.deaths >= 25) u('die_hard');
      const stars = get().totalStars();
      if (stars >= 100) u('star_hoarder');
      const perfect = Object.values(rec).filter((r) => r.stars.every(Boolean)).length;
      if (perfect >= 25) u('perfectionist');
    },

    replaceData: (d) => {
      set({ data: d });
      SaveSystem.save(d);
    },

    resetAll: () => {
      SaveSystem.wipe();
      processedRuns.clear();
      set({ data: defaultSave() });
      SaveSystem.save(get().data);
    },

    isUnlocked: (id) => {
      const d = get().data;
      if (id.startsWith('S')) return get().secretLevelUnlocked(Number(id.slice(1)) - 1);
      return Number(id) <= d.progress.unlocked;
    },

    secretLevelUnlocked: (index) => get().data.secrets.length >= SECRET_UNLOCKS[index],

    totalStars: () => Object.values(get().data.progress.records).reduce((a, r) => a + r.stars.filter(Boolean).length, 0),
  };
});

export const rarityColor = (r: Rarity) => RARITY_COLOR[r];
export const TOTAL_LEVEL_STARS = LEVELS.length * 3;
