import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS } from '@/match/types';
import { LocalRoom } from './LocalRoom';
import { sanitizeName } from './Room';

describe('LocalRoom', () => {
  it('crea la sala con el jugador local como host y bots etiquetados', () => {
    const r = new LocalRoom('Ana', ['c01'], 3);
    const s = r.getState();
    expect(s.players.length).toBe(4);
    expect(s.players[0]).toMatchObject({ id: 'local', name: 'Ana', isHost: true, isBot: false, ready: false });
    expect(s.players.slice(1).every((p) => p.isBot && p.ready)).toBe(true);
    expect(new Set(s.players.map((p) => p.color)).size).toBe(4);
  });

  it('no deja empezar hasta que todos estén listos', () => {
    const r = new LocalRoom('Ana', ['c01'], 1);
    expect(r.start()).toEqual({ ok: false, error: 'not_all_ready' });
    r.setReady(true);
    expect(r.start()).toEqual({ ok: true });
    expect(r.start()).toEqual({ ok: false, error: 'match_in_progress' });
    r.reopen();
    expect(r.getState().players[0]!.ready).toBe(false);
  });

  it('respeta el máximo de 20 jugadores', () => {
    const r = new LocalRoom('Ana', ['c01'], 99);
    expect(r.getState().players.length).toBe(MAX_PLAYERS);
    r.setBotCount(0);
    expect(r.getState().players.length).toBe(1);
  });

  it('valida nombres y hoyos', () => {
    const r = new LocalRoom('Ana', ['c01']);
    expect(r.setName('x')).toEqual({ ok: false, error: 'invalid_name' });
    expect(r.setName('  Super   Golfista  ')).toEqual({ ok: true });
    expect(r.getState().players[0]!.name).toBe('Super Golfista');
    expect(r.setCourses([])).toEqual({ ok: false, error: 'no_courses' });
  });

  it('notifica cambios a los suscriptores', () => {
    const r = new LocalRoom('Ana', ['c01']);
    let calls = 0;
    const off = r.subscribe(() => calls++);
    r.setReady(true);
    off();
    r.setReady(false);
    expect(calls).toBe(1);
  });
});

it('sanitizeName', () => {
  expect(sanitizeName('a')).toBeNull();
  expect(sanitizeName('x'.repeat(17))).toBeNull();
  expect(sanitizeName('Ana\u0007 ')).toBe('Ana');
});
