/**
 * Local save file (offline prototype): versioned, validated on load, never trusted blindly.
 * Online play will keep progression on the server; this file only ever describes local progress.
 *
 * Version history:
 *   1  settings + course records
 *   2  adds skirmish statistics, the last skirmish options and the last mode played
 * A version 1 file is migrated on load; unknown or newer versions start fresh.
 */
import { defaultSettings, sanitizeSettings, type GameSettings } from './settings.js';

export const SAVE_SCHEMA_VERSION = 2;

/** Experiences that can be started from the lobby today. */
export type PlayableMode = 'course' | 'range' | 'skirmish';
export const PLAYABLE_MODES: readonly PlayableMode[] = ['course', 'range', 'skirmish'];

export type SkirmishDifficulty = 'easy' | 'normal' | 'hard';
export const SKIRMISH_DIFFICULTIES: readonly SkirmishDifficulty[] = ['easy', 'normal', 'hard'];
/** Bot counts offered by the lobby. */
export const SKIRMISH_BOT_OPTIONS: readonly number[] = [3, 5, 7, 11];

export interface SkirmishStats {
  played: number;
  wins: number;
  eliminations: number;
  /** Best final position reached (1 = a win); null before the first match. */
  bestPlacement: number | null;
}

export interface SkirmishPreference {
  bots: number;
  difficulty: SkirmishDifficulty;
}

export interface PlayerProfile {
  alias: string;
  /** Best completion time per map id, in simulation ticks. */
  bestCourseTicks: Record<string, number>;
  coursesCompleted: number;
  skirmish: SkirmishStats;
  skirmishOptions: SkirmishPreference;
  lastMode: PlayableMode;
}

export interface SaveFile {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  settings: GameSettings;
  profile: PlayerProfile;
  /** Milliseconds since epoch, supplied by the caller (the core never reads the clock). */
  updatedAt: number;
}

export function defaultProfile(): PlayerProfile {
  return {
    alias: 'Corredor',
    bestCourseTicks: {},
    coursesCompleted: 0,
    skirmish: { played: 0, wins: 0, eliminations: 0, bestPlacement: null },
    skirmishOptions: { bots: 5, difficulty: 'easy' },
    lastMode: 'course',
  };
}

export function defaultSave(): SaveFile {
  return { schemaVersion: SAVE_SCHEMA_VERSION, settings: defaultSettings(), profile: defaultProfile(), updatedAt: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function counter(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1e9 ? value : fallback;
}

const MAP_ID_PATTERN = /^[a-z0-9_]{1,48}$/;
/** 24 h of ticks at 60 Hz: anything above is not a real course time. */
const MAX_COURSE_TICKS = 24 * 60 * 60 * 60;
const MAX_PLACEMENT = 200;

function sanitizeProfile(raw: unknown): PlayerProfile {
  const profile = defaultProfile();
  if (!isRecord(raw)) return profile;
  if (typeof raw['alias'] === 'string') {
    const alias = raw['alias'].replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 16);
    if (alias.length > 0) profile.alias = alias;
  }
  if (isRecord(raw['bestCourseTicks'])) {
    for (const [mapId, ticks] of Object.entries(raw['bestCourseTicks'])) {
      if (!MAP_ID_PATTERN.test(mapId)) continue;
      if (typeof ticks === 'number' && Number.isInteger(ticks) && ticks > 0 && ticks <= MAX_COURSE_TICKS) {
        profile.bestCourseTicks[mapId] = ticks;
      }
    }
  }
  profile.coursesCompleted = counter(raw['coursesCompleted'], 0);

  const skirmish = raw['skirmish'];
  if (isRecord(skirmish)) {
    const played = counter(skirmish['played'], 0);
    // A save cannot claim more wins than matches.
    const wins = Math.min(played, counter(skirmish['wins'], 0));
    const best = skirmish['bestPlacement'];
    profile.skirmish = {
      played,
      wins,
      eliminations: counter(skirmish['eliminations'], 0),
      bestPlacement: typeof best === 'number' && Number.isInteger(best) && best >= 1 && best <= MAX_PLACEMENT && played > 0 ? best : null,
    };
  }
  const options = raw['skirmishOptions'];
  if (isRecord(options)) {
    const bots = options['bots'];
    const difficulty = options['difficulty'];
    profile.skirmishOptions = {
      bots: SKIRMISH_BOT_OPTIONS.includes(bots as number) ? (bots as number) : profile.skirmishOptions.bots,
      difficulty: SKIRMISH_DIFFICULTIES.includes(difficulty as SkirmishDifficulty) ? (difficulty as SkirmishDifficulty) : profile.skirmishOptions.difficulty,
    };
  }
  if (PLAYABLE_MODES.includes(raw['lastMode'] as PlayableMode)) profile.lastMode = raw['lastMode'] as PlayableMode;
  return profile;
}

/**
 * Turns whatever was in storage into a valid save. Version 1 files are migrated (their settings
 * and course records are kept, the new fields start at their defaults); unknown or newer versions
 * start fresh.
 */
export function sanitizeSave(raw: unknown): SaveFile {
  if (!isRecord(raw)) return defaultSave();
  const version = raw['schemaVersion'];
  if (version !== 1 && version !== SAVE_SCHEMA_VERSION) return defaultSave();
  const updatedAt = raw['updatedAt'];
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    settings: sanitizeSettings(raw['settings']),
    profile: sanitizeProfile(raw['profile']),
    updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0,
  };
}

/** Parses a JSON string from storage; malformed text yields a fresh default save. */
export function parseSave(text: string | null): SaveFile {
  if (!text) return defaultSave();
  try {
    return sanitizeSave(JSON.parse(text) as unknown);
  } catch {
    return defaultSave();
  }
}

export interface CourseRecordResult {
  profile: PlayerProfile;
  isNewBest: boolean;
  previousBestTicks: number | null;
}

/** Records a finished course run. Returns a new profile; the input is not modified. */
export function recordCourseResult(profile: PlayerProfile, mapId: string, ticks: number): CourseRecordResult {
  if (!MAP_ID_PATTERN.test(mapId)) throw new Error('invalid map id');
  if (!Number.isInteger(ticks) || ticks <= 0 || ticks > MAX_COURSE_TICKS) throw new Error('invalid course time');
  const previous = profile.bestCourseTicks[mapId] ?? null;
  const isNewBest = previous === null || ticks < previous;
  return {
    profile: {
      ...profile,
      bestCourseTicks: isNewBest ? { ...profile.bestCourseTicks, [mapId]: ticks } : { ...profile.bestCourseTicks },
      coursesCompleted: profile.coursesCompleted + 1,
    },
    isNewBest,
    previousBestTicks: previous,
  };
}

export interface SkirmishOutcome {
  /** Final position, 1 = winner. */
  placement: number;
  eliminations: number;
}

export interface SkirmishRecordResult {
  profile: PlayerProfile;
  isBestPlacement: boolean;
}

/**
 * Records a finished skirmish. Returns a new profile; the input is not modified. The outcome
 * must come from the simulation's result — never from what the interface believes happened.
 */
export function recordSkirmishResult(profile: PlayerProfile, outcome: SkirmishOutcome): SkirmishRecordResult {
  const { placement, eliminations } = outcome;
  if (!Number.isInteger(placement) || placement < 1 || placement > MAX_PLACEMENT) throw new Error('invalid placement');
  if (!Number.isInteger(eliminations) || eliminations < 0 || eliminations > MAX_PLACEMENT) throw new Error('invalid elimination count');
  const before = profile.skirmish;
  const isBestPlacement = before.bestPlacement === null || placement < before.bestPlacement;
  return {
    profile: {
      ...profile,
      skirmish: {
        played: before.played + 1,
        wins: before.wins + (placement === 1 ? 1 : 0),
        eliminations: before.eliminations + eliminations,
        bestPlacement: isBestPlacement ? placement : before.bestPlacement,
      },
    },
    isBestPlacement,
  };
}

/** mm:ss.cc for a tick count. */
export function formatTicks(ticks: number, tickRate = 60): string {
  const totalCentis = Math.max(0, Math.round((ticks / tickRate) * 100));
  const minutes = Math.floor(totalCentis / 6000);
  const seconds = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}
