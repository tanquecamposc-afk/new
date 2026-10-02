import { readDeviceInfo, recommendQuality } from '@/config/deviceProfile';
import type { QualityPreset } from '@/config/graphics';
import type { TrajectoryMode } from '@/config/trajectory';
import { sanitizeName } from '@/multiplayer/Room';
import { bool, isRecord, num, oneOf } from '@/persistence/PersistenceService';

export interface Settings {
  /** Multiplicador de sensibilidad del apuntado (potencia por píxel arrastrado). */
  aimSensitivity: number;
  trajectory: TrajectoryMode;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  invertCameraY: boolean;
  playerName: string;
  /** 'auto' = según el dispositivo (recomendado). */
  quality: QualityPreset | 'auto';
  /** Bots de práctica por defecto en la sala local. */
  practiceBots: number;
}

export const SETTINGS_KEY = 'settings';
export const SETTINGS_VERSION = 1;

export const defaultSettings = (): Settings => ({
  aimSensitivity: 1,
  trajectory: 'full',
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5,
  invertCameraY: false,
  playerName: 'Jugador',
  quality: 'auto',
  practiceBots: 3,
});

export const QUALITY_PRESETS = ['auto', 'low', 'medium', 'high', 'ultra'] as const;

export const TRAJECTORY_MODES = ['off', 'short', 'full'] as const;

/** Valida y sanea ajustes cargados (valores fuera de rango se acotan). */
export function validateSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null;
  const d = defaultSettings();
  return {
    aimSensitivity: num(raw.aimSensitivity, 0.4, 2.5, d.aimSensitivity),
    trajectory: oneOf(raw.trajectory, TRAJECTORY_MODES, d.trajectory),
    masterVolume: num(raw.masterVolume, 0, 1, d.masterVolume),
    sfxVolume: num(raw.sfxVolume, 0, 1, d.sfxVolume),
    musicVolume: num(raw.musicVolume, 0, 1, d.musicVolume),
    invertCameraY: bool(raw.invertCameraY, d.invertCameraY),
    playerName: typeof raw.playerName === 'string' && sanitizeName(raw.playerName) ? sanitizeName(raw.playerName)! : d.playerName,
    quality: oneOf(raw.quality, QUALITY_PRESETS, d.quality),
    practiceBots: Math.round(num(raw.practiceBots, 0, 7, d.practiceBots)),
  };
}

let detected: { quality: QualityPreset; reason: string } | null = null;

/** Calidad efectiva: la elegida o, en 'auto', la recomendada para este dispositivo. */
export function effectiveQuality(q: Settings['quality']): { quality: QualityPreset; reason: string; auto: boolean } {
  if (q !== 'auto') return { quality: q, reason: 'elegida por el jugador', auto: false };
  detected ??= recommendQuality(readDeviceInfo());
  return { ...detected, auto: true };
}
