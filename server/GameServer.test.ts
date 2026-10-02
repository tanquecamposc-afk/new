import { describe, expect, it } from 'vitest';
import { GameConfig } from '@/config/game';
import { NetworkConfig } from '@/config/network';
import { PhysicsConfig } from '@/config/physics';
import { course01 } from '@/game/courses/course01';
import type { ClientMessage, ServerMessage } from '@/multiplayer/protocol';
import { GameServer } from './GameServer';

type Msg = ServerMessage;

function harness() {
  let t = 1_000_000;
  const server = new GameServer({ now: () => t });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  async function advance(ms: number) {
    for (let x = 0; x < ms; x += 8) {
      t += 8;
      server.update();
      if (x % 400 === 0) await flush();
    }
    await flush();
  }
  function client(name: string, token?: string) {
    const sock = {
      readyState: 1,
      inbox: [] as Msg[],
      send(d: string) {
        this.inbox.push(JSON.parse(d));
      },
      close() {
        this.readyState = 3;
        h.onClose();
      },
    };
    const h = server.connect(sock);
    const c = {
      sock,
      send: (m: ClientMessage) => h.onMessage(JSON.stringify(m)),
      raw: (s: string) => h.onMessage(s),
      all: <T extends Msg['t']>(type: T) => sock.inbox.filter((m): m is Extract<Msg, { t: T }> => m.t === type),
      last: <T extends Msg['t']>(type: T) => c.all(type).at(-1),
      get id() {
        return c.last('welcome')!.playerId;
      },
      get token() {
        return c.last('welcome')!.token;
      },
    };
    c.send({ t: 'hello', v: 1, name, token });
    return c;
  }
  return { server, client, advance, flush, now: () => t };
}

/** Lleva una sala privada de 2 jugadores hasta el GO del primer hoyo. */
async function startedMatch(courses = [course01.id]) {
  const h = harness();
  const a = h.client('Ana');
  const b = h.client('Beto');
  a.send({ t: 'create_room' });
  const code = a.last('room')!.room.code!;
  b.send({ t: 'join_room', code });
  a.send({ t: 'set_courses', ids: courses });
  a.send({ t: 'set_ready', ready: true });
  b.send({ t: 'set_ready', ready: true });
  a.send({ t: 'start' });
  // La primera carga de Rapier (WASM) es asíncrona: esperar al mensaje, no un tiempo fijo.
  for (let i = 0; i < 100 && !a.last('hole'); i++) await h.advance(20);
  a.send({ t: 'hole_ready', hole: 0 });
  b.send({ t: 'hole_ready', hole: 0 });
  for (let i = 0; i < 100 && a.last('hole')!.hole.goTick === null; i++) await h.advance(20);
  const goTick = a.last('hole')!.hole.goTick!;
  return { ...h, a, b, code, goTick };
}

const towardHole = (x: number, z: number) => {
  const dx = course01.hole.position.x - x;
  const dz = course01.hole.position.z - z;
  const d = Math.hypot(dx, dz);
  const power = Math.min(1, (Math.sqrt(2 * 1.45 * (d + 0.3)) * 1.25) / PhysicsConfig.shot.maxSpeed);
  return { dx: dx / d, dz: dz / d, power };
};

describe('GameServer — salas', () => {
  it('saluda con id y token', () => {
    const { client } = harness();
    const a = client('Ana');
    expect(a.last('welcome')).toMatchObject({ resumed: false });
    expect(a.token.length).toBeGreaterThan(10);
  });

  it('rechaza versiones antiguas del protocolo', () => {
    const { server } = harness();
    const sock = { readyState: 1, sent: [] as string[], send(d: string) { this.sent.push(d); }, close() { this.readyState = 3; } };
    server.connect(sock).onMessage(JSON.stringify({ t: 'hello', v: 999, name: 'X' }));
    expect(sock.sent[0]).toContain('version');
    expect(sock.readyState).toBe(3);
  });

  it('partida rápida: dos jugadores acaban en la misma sala pública', () => {
    const { client } = harness();
    const a = client('Ana');
    const b = client('Beto');
    a.send({ t: 'quick_play' });
    b.send({ t: 'quick_play' });
    const room = b.last('room')!.room;
    expect(room.mode).toBe('quick');
    expect(room.players.map((p) => p.name)).toEqual(['Ana', 'Beto']);
    expect(room.autoStartAt).toBeGreaterThan(0);
  });

  it('sala privada: código visible, unirse, códigos inválidos o inexistentes', () => {
    const { client } = harness();
    const a = client('Ana');
    const b = client('Beto');
    a.send({ t: 'create_room' });
    const code = a.last('room')!.room.code!;
    expect(code).toMatch(/^[A-Z2-9]{5}$/);
    b.send({ t: 'join_room', code: 'zz' });
    expect(b.last('error')!.code).toBe('invalid_code');
    b.send({ t: 'join_room', code: 'ABCDE' === code ? 'ABCDF' : 'ABCDE' });
    expect(b.last('error')!.code).toBe('room_not_found');
    b.send({ t: 'join_room', code: code.toLowerCase() });
    expect(b.last('room')!.room.players.length).toBe(2);
  });

  it('sólo el host elige hoyos y empieza; todos deben estar listos', () => {
    const { client } = harness();
    const a = client('Ana');
    const b = client('Beto');
    a.send({ t: 'create_room' });
    b.send({ t: 'join_room', code: a.last('room')!.room.code! });
    b.send({ t: 'set_courses', ids: [course01.id] });
    expect(b.last('error')!.code).toBe('not_host');
    a.send({ t: 'set_ready', ready: true });
    a.send({ t: 'start' });
    expect(a.last('error')!.code).toBe('not_all_ready');
    b.send({ t: 'set_ready', ready: true });
    b.send({ t: 'start' });
    expect(b.last('error')!.code).toBe('not_host');
  });

  it('migración de host si el host sale del lobby', () => {
    const { client } = harness();
    const a = client('Ana');
    const b = client('Beto');
    a.send({ t: 'create_room' });
    b.send({ t: 'join_room', code: a.last('room')!.room.code! });
    a.send({ t: 'leave_room' });
    const room = b.last('room')!.room;
    expect(room.players.length).toBe(1);
    expect(room.players[0]).toMatchObject({ name: 'Beto', isHost: true });
  });

  it('máximo 20 jugadores por sala', () => {
    const { client } = harness();
    const host = client('Host');
    host.send({ t: 'create_room' });
    const code = host.last('room')!.room.code!;
    for (let i = 0; i < 19; i++) client(`J${i}`).send({ t: 'join_room', code });
    const extra = client('Extra');
    extra.send({ t: 'join_room', code });
    expect(extra.last('error')!.code).toBe('room_full');
  });

  it('mensajes inválidos y exceso de mensajes', () => {
    const { client } = harness();
    const a = client('Ana');
    a.raw('{"t":"shoot","power":"todo"}');
    expect(a.last('error')!.code).toBe('bad_message');
    for (let i = 0; i < NetworkConfig.maxMessagesPerSec + 5; i++) a.send({ t: 'ping', c: i });
    expect(a.last('error')!.code).toBe('rate_limited');
  });
});

describe('GameServer — partida', () => {
  it('cuenta atrás sincronizada: nadie puede tirar antes del GO', async () => {
    const { a, goTick } = await startedMatch();
    expect(a.all('match_start').length).toBe(1);
    expect(goTick).toBeGreaterThan(0);
    a.send({ t: 'shoot', shotId: 1, tick: 0, dx: 0, dz: -1, power: 0.5 });
    expect(a.last('shot_ack')).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('valida los tiros en el servidor (anti-trampas) y los difunde', async () => {
    const h = await startedMatch();
    await h.advance(GameConfig.countdownSec * 1000 + 500);
    const tick = h.a.last('snap')!.tick;
    h.a.send({ t: 'shoot', shotId: 1, tick, dx: 0, dz: -1, power: 5 });
    expect(h.a.last('shot_ack')).toMatchObject({ ok: false, reason: 'power_out_of_range' });
    h.a.send({ t: 'shoot', shotId: 2, tick, dx: 3, dz: -4, power: 0.5 });
    expect(h.a.last('shot_ack')).toMatchObject({ ok: false, reason: 'invalid_direction' });
    h.a.send({ t: 'shoot', shotId: 3, tick, dx: 0, dz: -1, power: 0.4 });
    expect(h.a.last('shot_ack')).toMatchObject({ ok: true });
    expect(h.b.last('shot')).toMatchObject({ playerId: h.a.id, shotId: 3 });
    h.a.send({ t: 'shoot', shotId: 4, tick, dx: 0, dz: -1, power: 0.4 });
    expect(h.a.last('shot_ack')).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('compensa la latencia: el tiro se aplica en el tick en que se hizo (acotado)', async () => {
    const h = await startedMatch();
    await h.advance(GameConfig.countdownSec * 1000 + 800);
    const room = h.server.roomOf(h.a.id)!;
    const now = room.debugState.tick;
    h.a.send({ t: 'shoot', shotId: 1, tick: now - 20, dx: 0, dz: -1, power: 0.3 });
    expect(h.a.last('shot_ack')).toMatchObject({ ok: true, tick: now - 20 });
    // Un tick demasiado antiguo se acota a la ventana máxima.
    h.b.send({ t: 'shoot', shotId: 1, tick: 0, dx: 0, dz: -1, power: 0.3 });
    const maxRewind = Math.round(NetworkConfig.maxRewindMs / 1000 / PhysicsConfig.fixedTimestep);
    expect(h.b.last('shot_ack')!.tick).toBeGreaterThanOrEqual(now - maxRewind);
  });

  it('partida completa: hoyo, resultados, clasificación y vuelta al lobby', { timeout: 60_000 }, async () => {
    const h = await startedMatch();
    await h.advance(GameConfig.countdownSec * 1000 + 500);
    for (let round = 0; round < 10 && !h.a.last('hole_end'); round++) {
      for (const c of [h.a, h.b]) {
        const me = h.a.last('snap')!.players.find((p) => p.id === c.id)!;
        if (me.finished) continue;
        const s = towardHole(me.x, me.z);
        c.send({ t: 'shoot', shotId: round + 10, tick: h.a.last('snap')!.tick, ...s });
      }
      await h.advance(6000);
    }
    const end = h.a.last('hole_end')!;
    expect(end.results.length).toBe(2);
    expect(end.results.every((r) => r.completed)).toBe(true);
    expect(end.standings.length).toBe(2);
    expect(h.b.all('event').some((e) => e.kind === 'holed' && e.playerId === h.a.id)).toBe(true);
    // Resultados → fin de partida (era el único hoyo) → lobby abierto.
    h.a.send({ t: 'next_ready' });
    h.b.send({ t: 'next_ready' });
    await h.advance(100);
    expect(h.a.last('match_end')!.standings.length).toBe(2);
    const room = h.a.last('room')!.room;
    expect(room.status).toBe('open');
    expect(room.players.every((p) => !p.ready)).toBe(true);
  });

  it('reconexión: se conserva la plaza y se recibe el estado completo', async () => {
    const h = await startedMatch();
    await h.advance(GameConfig.countdownSec * 1000 + 500);
    const token = h.b.token;
    const id = h.b.id;
    h.b.sock.close();
    expect(h.a.last('conn')).toMatchObject({ playerId: id, state: 'disconnected' });
    await h.advance(2000);
    expect(h.a.last('snap')!.players.find((p) => p.id === id)!.conn).toBe('disconnected');
    const b2 = h.client('Beto', token);
    expect(b2.last('welcome')).toMatchObject({ playerId: id, resumed: true });
    expect(b2.last('hole')!.hole.goTick).toBe(h.goTick);
    expect(b2.last('snap')!.players.length).toBe(2);
    expect(h.a.last('conn')).toMatchObject({ playerId: id, state: 'connected' });
    b2.send({ t: 'shoot', shotId: 1, tick: b2.last('snap')!.tick, dx: 0, dz: -1, power: 0.3 });
    expect(b2.last('shot_ack')!.ok).toBe(true);
  });

  it('si la ventana de reconexión expira, el jugador abandona y el hoyo termina sin él', { timeout: 60_000 }, async () => {
    const h = await startedMatch();
    await h.advance(GameConfig.countdownSec * 1000 + 500);
    const bId = h.b.id;
    h.b.sock.close();
    await h.advance(NetworkConfig.reconnectWindowSec * 1000 + 500);
    for (let round = 0; round < 8 && !h.a.last('hole_end'); round++) {
      const me = h.a.last('snap')!.players.find((p) => p.id === h.a.id)!;
      if (!me.finished) h.a.send({ t: 'shoot', shotId: round + 1, tick: h.a.last('snap')!.tick, ...towardHole(me.x, me.z) });
      await h.advance(6000);
    }
    const end = h.a.last('hole_end')!;
    expect(end.results.find((r) => r.playerId === bId)!.completed).toBe(false);
    expect(end.results.find((r) => r.playerId === h.a.id)!.completed).toBe(true);
  });
});
