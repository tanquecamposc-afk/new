import { create } from 'zustand';
import { persistence } from '@/persistence/PersistenceService';
import { SETTINGS_KEY, SETTINGS_VERSION, defaultSettings, validateSettings, type Settings } from './settings';

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const initial = persistence.load(SETTINGS_KEY, SETTINGS_VERSION, validateSettings, defaultSettings).value;

export const useSettings = create<SettingsStore>((set, get) => ({
  ...initial,
  set: (patch) => {
    const next = validateSettings({ ...pick(get()), ...patch }) ?? defaultSettings();
    set(next);
    persistence.save(SETTINGS_KEY, SETTINGS_VERSION, next);
  },
  reset: () => {
    const d = defaultSettings();
    set(d);
    persistence.save(SETTINGS_KEY, SETTINGS_VERSION, d);
  },
}));

function pick(s: SettingsStore): Settings {
  const { aimSensitivity, trajectory, masterVolume, sfxVolume, musicVolume, invertCameraY, playerName, quality, practiceBots } = s;
  return { aimSensitivity, trajectory, masterVolume, sfxVolume, musicVolume, invertCameraY, playerName, quality, practiceBots };
}
