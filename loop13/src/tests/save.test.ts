import { describe, it, expect } from 'vitest';
import { sanitizeProfile, sanitizeRun, sanitizeSettings } from '../game/systems/SaveSystem';

describe('save validation', () => {
  it('drops unknown ids, duplicates and garbage', () => {
    const p = sanitizeProfile({ achievements: ['FIRST_LOOP', 'FIRST_LOOP', 'HACKED'], endings: ['TRUE', 'NOPE'], totalLoops: -5, deaths: 'x' });
    expect(p.achievements).toEqual(['FIRST_LOOP']);
    expect(p.endings).toEqual(['TRUE']);
    expect(p.totalLoops).toBe(0);
    expect(p.deaths).toBe(0);
  });
  it('run survives nonsense', () => {
    const r = sanitizeRun({ loop: 'banana', clues: ['SECURITY_CODE', 42, 'FAKE'], started: 'yes' });
    expect(r.loop).toBe(1);
    expect(r.clues).toEqual(['SECURITY_CODE']);
    expect(r.started).toBe(false);
  });
  it('settings are clamped', () => {
    const s = sanitizeSettings({ master: 7, fov: 500, graphics: 'ultra' });
    expect(s.master).toBe(1);
    expect(s.fov).toBe(90);
    expect(s.graphics).toBe('high');
  });
  it('null input yields defaults', () => {
    expect(sanitizeRun(null).loop).toBe(1);
    expect(sanitizeProfile(undefined).achievements).toEqual([]);
  });
});
