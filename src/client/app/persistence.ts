/** localStorage adapter for the save file. All validation lives in the core (`parseSave`). */
import { defaultSave, parseSave, type SaveFile } from '../../core/meta/save.js';

const STORAGE_KEY = 'nexus-royale.save.v1';

export function loadSave(): SaveFile {
  try {
    return parseSave(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode, sandboxed frame): play with defaults.
    return defaultSave();
  }
}

/** Returns false when the browser refused to store the data. */
export function storeSave(save: SaveFile): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...save, updatedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
