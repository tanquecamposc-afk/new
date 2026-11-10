/**
 * Local save file (offline prototype): versioned, validated on load, never trusted blindly.
 * Online play will keep progression on the server; this file only ever describes local progress.
 */
import { defaultSettings, sanitizeSettings, type GameSettings } from './settings.js';

export const SAVE_SCHEMA_VERSION = 1;

export interface PlayerProfile {
  alias: string;
  /** Best completion time per map id, in simulation ticks. */
  bestCourseTicks: Record<string, number>;
  coursesCompleted: number;
}

export interface SaveFile {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  settings: GameSettings;
  profile: PlayerProfile;
  /** Milliseconds since epoch, supplied by the caller (the core never reads the clock). */
  updatedAt: number;
}

export function defaultProfile(): PlayerProfile {
  return { alias: 'Corredor', bestCourseTicks: {}, coursesCompleted: 0 };
}

export function defaultSave(): SaveFile {
  return { schemaVersion: SAVE_SCHEMA_VERSION, settings: defaultSettings(), profile: defaultProfile(), updatedAt: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const MAP_ID_PATTERN = /^[a-z0-9_]{1,48}$/;
/** 24 h of ticks at 60 Hz: anything above is not a real course time. */
const MAX_COURSE_TICKS = 24 * 60 * 60 * 60;

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
  const completed = raw['coursesCompleted'];
  if (typeof completed === 'number' && Number.isInteger(completed) && completed >= 0 && completed < 1e9) {
    profile.coursesCompleted = completed;
  }
  return profile;
}

/** Turns whatever was in storage into a valid save. Unknown or newer versions start fresh. */
export function sanitizeSave(raw: unknown): SaveFile {
  if (!isRecord(raw) || raw['schemaVersion'] !== SAVE_SCHEMA_VERSION) return defaultSave();
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

/** mm:ss.cc for a tick count. */
export function formatTicks(ticks: number, tickRate = 60): string {
  const totalCentis = Math.max(0, Math.round((ticks / tickRate) * 100));
  const minutes = Math.floor(totalCentis / 6000);
  const seconds = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}
