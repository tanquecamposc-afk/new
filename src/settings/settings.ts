import type { TrajectoryMode } from '@/config/trajectory';
import { bool, isRecord, num, oneOf } from '@/persistence/PersistenceService';

export interface Settings {
  /** Multiplicador de sensibilidad del apuntado (potencia por píxel arrastrado). */
  aimSensitivity: number;
  trajectory: TrajectoryMode;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  invertCameraY: boolean;
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
});

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
  };
}
