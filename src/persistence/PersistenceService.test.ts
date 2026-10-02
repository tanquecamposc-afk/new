import { describe, expect, it, vi } from 'vitest';
import { defaultSettings, validateSettings } from '@/settings/settings';
import { PersistenceService, type StorageLike } from './PersistenceService';

const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('PersistenceService', () => {
  it('guarda y recupera datos validados', () => {
    const s = new PersistenceService(mem());
    s.save('settings', 1, { ...defaultSettings(), aimSensitivity: 1.7 });
    const r = s.load('settings', 1, validateSettings, defaultSettings);
    expect(r.value.aimSensitivity).toBe(1.7);
    expect(r.recovered).toBe(false);
  });
  it('sin datos devuelve los valores por defecto', () => {
    const r = new PersistenceService(mem()).load('settings', 1, validateSettings, defaultSettings);
    expect(r.value).toEqual(defaultSettings());
  });
  it('JSON corrupto → defaults, sin lanzar', () => {
    const st = mem();
    st.setItem('minigolf-party:settings', '{nope');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = new PersistenceService(st).load('settings', 1, validateSettings, defaultSettings);
    expect(r.recovered).toBe(true);
    expect(r.value).toEqual(defaultSettings());
    // Se reescriben datos sanos.
    expect(JSON.parse(st.data.get('minigolf-party:settings')!).data).toEqual(defaultSettings());
  });
  it('versión distinta → defaults', () => {
    const st = mem();
    st.setItem('minigolf-party:settings', JSON.stringify({ v: 99, data: {} }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(new PersistenceService(st).load('settings', 1, validateSettings, defaultSettings).recovered).toBe(true);
  });
  it('almacenamiento que lanza errores no rompe nada', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => {},
    };
    const s = new PersistenceService(broken);
    expect(s.save('x', 1, 1)).toBe(false);
    expect(s.load('x', 1, () => 1, () => 0).value).toBe(0);
  });
});

describe('validateSettings', () => {
  it('acota valores fuera de rango y corrige tipos', () => {
    const v = validateSettings({ aimSensitivity: 99, trajectory: 'trampa', masterVolume: -3, sfxVolume: 'x', invertCameraY: 'si' })!;
    expect(v.aimSensitivity).toBe(2.5);
    expect(v.trajectory).toBe('full');
    expect(v.masterVolume).toBe(0);
    expect(v.sfxVolume).toBe(defaultSettings().sfxVolume);
    expect(v.invertCameraY).toBe(false);
  });
  it('rechaza lo que no es un objeto', () => {
    expect(validateSettings(null)).toBeNull();
    expect(validateSettings([1])).toBeNull();
  });
});
