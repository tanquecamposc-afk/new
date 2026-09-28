/**
 * Versioned, validated save system backed by localStorage.
 * Every field is sanitised on load so a corrupted or tampered save can never
 * crash the game; unknown fields are dropped and missing ones get defaults.
 */
import { DEFAULT_OWNED, ITEMS, Rarity, RARITY_ORDER } from '../data/items';
import { ACHIEVEMENTS } from '../data/achievements';
import { SECRET_IDS } from '../data/levels';
import type { Difficulty, Mutation } from '../data/modes';

export const SAVE_KEY = '100levels.save.v1';
const BACKUP_KEY = '100levels.save.backup';
export const SAVE_VERSION = 1;

export interface LevelRecord {
  stars: [boolean, boolean, boolean];
  bestTime: number; // seconds, Infinity if never
  completions: number;
}

export interface Equipped {
  skin: string;
  weapon: string;
  aura: string | null;
  trail: string | null;
  jump: string | null;
  attack: string | null;
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  sensitivity: number;
  invertY: boolean;
  quality: 'low' | 'medium' | 'high';
  shake: number;
  showFps: boolean;
  difficulty: Difficulty;
  mutations: Mutation[];
  touchControls: boolean;
}

export interface SaveData {
  version: number;
  profile: { name: string; xp: number; level: number; coins: number; createdAt: number; playTime: number };
  progress: { unlocked: number; records: Record<string, LevelRecord>; gameCompleted: boolean; worldsSeen: number[] };
  secrets: string[];
  inventory: { owned: string[]; equipped: Equipped; potions: number; revives: number; chests: Record<Rarity, number> };
  achievements: Record<string, number>;
  stats: {
    kills: number; bossesDefeated: string[]; deaths: number; coinsEarned: number; jumps: number;
    racesWon: number; levelsCompleted: number; noDamageClears: number; chestsOpened: number; perfectAccuracy: number;
  };
  speedrun: { best: Record<string, number>; bestSplits: Record<string, number[]>; runs: number };
  settings: Settings;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: { name: 'PLAYER', xp: 0, level: 1, coins: 250, createdAt: Date.now(), playTime: 0 },
    progress: { unlocked: 1, records: {}, gameCompleted: false, worldsSeen: [] },
    secrets: [],
    inventory: {
      owned: [...DEFAULT_OWNED],
      equipped: { skin: 'skin_runner', weapon: 'wpn_sword', aura: null, trail: null, jump: null, attack: null },
      potions: 1,
      revives: 0,
      chests: { common: 1, rare: 0, epic: 0, legendary: 0, mythic: 0 },
    },
    achievements: {},
    stats: { kills: 0, bossesDefeated: [], deaths: 0, coinsEarned: 0, jumps: 0, racesWon: 0, levelsCompleted: 0, noDamageClears: 0, chestsOpened: 0, perfectAccuracy: 0 },
    speedrun: { best: {}, bestSplits: {}, runs: 0 },
    settings: {
      master: 0.8, music: 0.55, sfx: 0.8, sensitivity: 1, invertY: false, quality: 'high',
      shake: 1, showFps: false, difficulty: 'normal', mutations: [], touchControls: false,
    },
  };
}

// ── Validation helpers ──────────────────────────────────────────────────────
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d: string, max = 32) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);

const ITEM_IDS = new Set(ITEMS.map((i) => i.id));
const ACH_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));
const SECRET_SET = new Set(SECRET_IDS);
const MUTS: Mutation[] = ['speed', 'onelife', 'darkness', 'enemies', 'lowgrav', 'chaos'];

function validLevelKey(k: string) {
  if (/^S[1-5]$/.test(k)) return true;
  const n = Number(k);
  return Number.isInteger(n) && n >= 1 && n <= 100;
}

export function sanitize(raw: unknown): SaveData {
  const d = defaultSave();
  const r = obj(raw);

  const p = obj(r.profile);
  d.profile = {
    name: str(p.name, d.profile.name, 16),
    xp: num(p.xp, 0, 0),
    level: Math.floor(num(p.level, 1, 1, 999)),
    coins: Math.floor(num(p.coins, d.profile.coins, 0, 1e9)),
    createdAt: num(p.createdAt, d.profile.createdAt),
    playTime: num(p.playTime, 0, 0),
  };

  const pr = obj(r.progress);
  const recs: Record<string, LevelRecord> = {};
  for (const [k, v] of Object.entries(obj(pr.records))) {
    if (!validLevelKey(k)) continue;
    const o = obj(v);
    const s = arr(o.stars);
    recs[k] = {
      stars: [bool(s[0], false), bool(s[1], false), bool(s[2], false)],
      bestTime: o.bestTime === null ? Infinity : num(o.bestTime, Infinity, 0),
      completions: Math.floor(num(o.completions, 0, 0)),
    };
  }
  d.progress = {
    unlocked: Math.floor(num(pr.unlocked, 1, 1, 100)),
    records: recs,
    gameCompleted: bool(pr.gameCompleted, false),
    worldsSeen: arr(pr.worldsSeen).filter((x): x is number => typeof x === 'number' && x >= 1 && x <= 10),
  };
  // Unlocked can never be lower than the highest completed level + 1
  for (const k of Object.keys(recs)) {
    const n = Number(k);
    if (Number.isInteger(n) && recs[k].completions > 0) d.progress.unlocked = Math.max(d.progress.unlocked, Math.min(100, n + 1));
  }

  d.secrets = [...new Set(arr(r.secrets).filter((x): x is string => typeof x === 'string' && SECRET_SET.has(x)))];

  const inv = obj(r.inventory);
  const owned = new Set(arr(inv.owned).filter((x): x is string => typeof x === 'string' && ITEM_IDS.has(x)));
  DEFAULT_OWNED.forEach((i) => owned.add(i));
  const eq = obj(inv.equipped);
  const ownedOr = (v: unknown, d0: string | null) => (typeof v === 'string' && owned.has(v) ? v : d0);
  const ch = obj(inv.chests);
  d.inventory = {
    owned: [...owned],
    equipped: {
      skin: ownedOr(eq.skin, 'skin_runner')!,
      weapon: ownedOr(eq.weapon, 'wpn_sword')!,
      aura: ownedOr(eq.aura, null),
      trail: ownedOr(eq.trail, null),
      jump: ownedOr(eq.jump, null),
      attack: ownedOr(eq.attack, null),
    },
    potions: Math.floor(num(inv.potions, 1, 0, 99)),
    revives: Math.floor(num(inv.revives, 0, 0, 99)),
    chests: Object.fromEntries(RARITY_ORDER.map((ra) => [ra, Math.floor(num(ch[ra], 0, 0, 999))])) as Record<Rarity, number>,
  };

  const ach: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(r.achievements))) if (ACH_IDS.has(k)) ach[k] = num(v, Date.now());
  d.achievements = ach;

  const st = obj(r.stats);
  d.stats = {
    kills: Math.floor(num(st.kills, 0, 0)),
    bossesDefeated: [...new Set(arr(st.bossesDefeated).filter((x): x is string => typeof x === 'string'))],
    deaths: Math.floor(num(st.deaths, 0, 0)),
    coinsEarned: Math.floor(num(st.coinsEarned, 0, 0)),
    jumps: Math.floor(num(st.jumps, 0, 0)),
    racesWon: Math.floor(num(st.racesWon, 0, 0)),
    levelsCompleted: Math.floor(num(st.levelsCompleted, 0, 0)),
    noDamageClears: Math.floor(num(st.noDamageClears, 0, 0)),
    chestsOpened: Math.floor(num(st.chestsOpened, 0, 0)),
    perfectAccuracy: Math.floor(num(st.perfectAccuracy, 0, 0)),
  };

  const sr = obj(r.speedrun);
  const best: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(sr.best))) best[k.slice(0, 24)] = num(v, Infinity, 0);
  const splits: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(obj(sr.bestSplits))) splits[k.slice(0, 24)] = arr(v).map((x) => num(x, 0, 0)).slice(0, 100);
  d.speedrun = { best, bestSplits: splits, runs: Math.floor(num(sr.runs, 0, 0)) };

  const se = obj(r.settings);
  d.settings = {
    master: num(se.master, d.settings.master, 0, 1),
    music: num(se.music, d.settings.music, 0, 1),
    sfx: num(se.sfx, d.settings.sfx, 0, 1),
    sensitivity: num(se.sensitivity, 1, 0.2, 3),
    invertY: bool(se.invertY, false),
    quality: oneOf(se.quality, ['low', 'medium', 'high'] as const, 'high'),
    shake: num(se.shake, 1, 0, 1),
    showFps: bool(se.showFps, false),
    difficulty: oneOf(se.difficulty, ['normal', 'hard', 'insane', 'nightmare'] as const, 'normal'),
    mutations: arr(se.mutations).filter((m): m is Mutation => MUTS.includes(m as Mutation)),
    touchControls: bool(se.touchControls, false),
  };
  // Locked options fall back
  if (!d.progress.gameCompleted) {
    if (d.settings.difficulty === 'nightmare') d.settings.difficulty = 'insane';
    d.settings.mutations = [];
  }
  return d;
}

/** JSON can't hold Infinity — encode it as null. */
function serialize(data: SaveData): string {
  return JSON.stringify(data, (_k, v) => (v === Infinity ? null : v));
}

export const SaveSystem = {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(BACKUP_KEY);
      if (!raw) return defaultSave();
      return sanitize(JSON.parse(raw));
    } catch {
      try {
        const b = localStorage.getItem(BACKUP_KEY);
        if (b) return sanitize(JSON.parse(b));
      } catch {
        /* fall through */
      }
      return defaultSave();
    }
  },
  save(data: SaveData) {
    try {
      const s = serialize(data);
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(SAVE_KEY, s);
    } catch {
      /* storage full / unavailable: game still works this session */
    }
  },
  export(data: SaveData) {
    return btoa(unescape(encodeURIComponent(serialize(data))));
  },
  import(code: string): SaveData | null {
    try {
      return sanitize(JSON.parse(decodeURIComponent(escape(atob(code.trim())))));
    } catch {
      return null;
    }
  },
  wipe() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
  },
};
