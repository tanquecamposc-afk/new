/**
 * Persistent save in localStorage: versioned, validated, checksummed, with a
 * backup slot. Corrupt data never overwrites good data; unknown ids are dropped.
 */
import { DEFAULT_SETTINGS, emptyProfile, emptyRun, G, useGame } from '../core/store';
import type { EndingId, Profile, RunState, Settings } from '../core/types';
import { CLUES } from '../data/clues';
import { DOCUMENTS } from '../data/documents';
import { ACHIEVEMENTS, SECRETS } from '../data/progress';

const KEY = 'loop13.save.v1';
const BACKUP = 'loop13.save.v1.bak';
const VERSION = 1;

interface SaveFile { version: number; savedAt: number; profile: Profile; run: RunState; settings: Settings; checksum: string; }

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

const ids = {
  clues: new Set(CLUES.map((c) => c.id)),
  docs: new Set(DOCUMENTS.map((d) => d.id)),
  secrets: new Set(SECRETS.map((s) => s.id)),
  ach: new Set(ACHIEVEMENTS.map((a) => a.id)),
  endings: new Set<EndingId>(['ESCAPE', 'SACRIFICE', 'OBSERVER', 'TRUE']),
};

const strArr = (v: unknown, allow?: Set<string>): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (!allow || allow.has(x))))] : [];
const num = (v: unknown, d: number, min = 0, max = 1e9): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);

export function sanitizeProfile(p: unknown): Profile {
  const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
  const base = emptyProfile();
  return {
    achievements: strArr(o.achievements, ids.ach),
    endings: strArr(o.endings, ids.endings as Set<string>) as EndingId[],
    cluesEver: strArr(o.cluesEver, ids.clues),
    docsEver: strArr(o.docsEver, ids.docs),
    secretsEver: strArr(o.secretsEver, ids.secrets),
    totalLoops: num(o.totalLoops, base.totalLoops),
    deaths: num(o.deaths, base.deaths),
    ngPlusUnlocked: bool(o.ngPlusUnlocked, false),
    playTime: num(o.playTime, 0),
  };
}

export function sanitizeRun(r: unknown): RunState {
  const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
  const base = emptyRun();
  return {
    started: bool(o.started, false),
    loop: Math.floor(num(o.loop, 1, 1, 99999)),
    ngPlus: Math.floor(num(o.ngPlus, 0, 0, 99)),
    clues: strArr(o.clues, ids.clues),
    docs: strArr(o.docs, ids.docs),
    secrets: strArr(o.secrets, ids.secrets),
    areas: strArr(o.areas),
    camsSeen: strArr(o.camsSeen),
    anomalies: strArr(o.anomalies),
    mugStates: strArr(o.mugStates),
    itemsFound: strArr(o.itemsFound),
    flags: strArr(o.flags),
    deaths: Math.floor(num(o.deaths, base.deaths)),
    loopsCompleted: Math.floor(num(o.loopsCompleted, 0)),
  };
}

export function sanitizeSettings(s: unknown): Settings {
  const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    master: num(o.master, d.master, 0, 1),
    music: num(o.music, d.music, 0, 1),
    sfx: num(o.sfx, d.sfx, 0, 1),
    graphics: oneOf(o.graphics, ['low', 'medium', 'high'] as const, d.graphics),
    shadows: oneOf(o.shadows, ['off', 'low', 'high'] as const, d.shadows),
    particles: oneOf(o.particles, ['low', 'medium', 'high'] as const, d.particles),
    postprocessing: bool(o.postprocessing, d.postprocessing),
    cameraSensitivity: num(o.cameraSensitivity, d.cameraSensitivity, 0.2, 3),
    mouseSensitivity: num(o.mouseSensitivity, d.mouseSensitivity, 0.2, 3),
    fov: num(o.fov, d.fov, 45, 90),
    subtitles: bool(o.subtitles, d.subtitles),
    aiVoice: bool(o.aiVoice, d.aiVoice),
    invertY: bool(o.invertY, d.invertY),
  };
}

function parse(raw: string | null): SaveFile | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveFile;
    if (!data || typeof data !== 'object' || data.version !== VERSION) return null;
    const body = JSON.stringify({ profile: data.profile, run: data.run, settings: data.settings });
    if (hash(body) !== data.checksum) return null;
    return { ...data, profile: sanitizeProfile(data.profile), run: sanitizeRun(data.run), settings: sanitizeSettings(data.settings) };
  } catch {
    return null;
  }
}

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export const SaveSystem = {
  load(): boolean {
    const ls = storage();
    if (!ls) return false;
    const main = parse(ls.getItem(KEY));
    const data = main ?? parse(ls.getItem(BACKUP));
    if (!data) return false;
    useGame.setState({ profile: data.profile, run: data.run, settings: data.settings, hasSave: data.run.started });
    return true;
  },

  save(): void {
    const ls = storage();
    if (!ls) return;
    const { profile, run, settings } = G();
    const body = JSON.stringify({ profile, run, settings });
    const file: SaveFile = { version: VERSION, savedAt: Date.now(), profile, run, settings, checksum: hash(body) };
    try {
      const prev = ls.getItem(KEY);
      if (prev && parse(prev)) ls.setItem(BACKUP, prev);
      ls.setItem(KEY, JSON.stringify(file));
      useGame.setState({ hasSave: run.started });
    } catch { /* quota or privacy mode: keep playing */ }
  },

  /** Debounced save for frequent discoveries. */
  saveSoon(): void {
    if (pending) return;
    pending = setTimeout(() => { pending = null; SaveSystem.save(); }, 400);
  },

  wipeAll(): void {
    const ls = storage();
    ls?.removeItem(KEY);
    ls?.removeItem(BACKUP);
  },
};

let pending: ReturnType<typeof setTimeout> | null = null;
