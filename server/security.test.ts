/**
 * Phase 9 — seguridad y casos límite del servidor: ficheros estáticos,
 * mensajes hostiles, conexiones sin identificar y aislamiento de fallos.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { NetworkConfig } from '@/config/network';
import { parseClientMessage } from '@/multiplayer/protocol';
import { GameServer } from './GameServer';
import { createStaticHandler } from './http';

// ---------- Ficheros estáticos ----------

function site() {
  const base = mkdtempSync(join(tmpdir(), 'mg-'));
  const root = join(base, 'dist');
  mkdirSync(join(root, 'assets'), { recursive: true });
  mkdirSync(join(root, 'legacy'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>x</title>');
  writeFileSync(join(root, 'assets', 'app-abc.js'), 'console.log(1)'.repeat(50));
  writeFileSync(join(root, 'legacy', 'old.html'), '<script>1</script>');
  // Carpeta hermana con prefijo común: no debe ser accesible.
  mkdirSync(join(base, 'dist-secret'));
  writeFileSync(join(base, 'dist-secret', 'key.txt'), 'SECRETO');
  writeFileSync(join(base, 'secret.txt'), 'SECRETO');
  return createStaticHandler({ root });
}

function request(handler: ReturnType<typeof createStaticHandler>, path: string, opts: { method?: string; gzip?: boolean } = {}) {
  const out = { status: 0, headers: {} as Record<string, string>, body: '', raw: Buffer.alloc(0) };
  const req = { method: opts.method ?? 'GET', headers: opts.gzip ? { 'accept-encoding': 'gzip' } : {} } as unknown as IncomingMessage;
  const res = {
    headersSent: false,
    writeHead(status: number, headers: Record<string, string> = {}) {
      out.status = status;
      out.headers = headers;
      return this;
    },
    end(body?: Buffer | string) {
      if (body) {
        out.body = body.toString();
        out.raw = Buffer.from(body);
      }
      return this;
    },
  } as unknown as ServerResponse;
  handler(req, res, path);
  return out;
}

describe('servidor estático', () => {
  const h = site();

  it('sirve index.html con cabeceras de seguridad y sin caché', () => {
    const r = request(h, '/');
    expect(r.status).toBe(200);
    expect(r.body).toContain('<title>');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
    expect(r.headers['content-security-policy']).toContain("object-src 'none'");
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['cache-control']).toBe('no-cache');
  });

  it('assets con hash: caché inmutable y gzip si el cliente lo acepta', () => {
    const r = request(h, '/assets/app-abc.js', { gzip: true });
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('immutable');
    expect(r.headers['content-encoding']).toBe('gzip');
  });

  it('el gzip en memoria se invalida si el fichero cambia (recompilar sin reiniciar)', () => {
    const base = mkdtempSync(join(tmpdir(), 'mg-'));
    const root = join(base, 'dist');
    mkdirSync(root);
    writeFileSync(join(root, 'index.html'), '<title>v1</title>');
    const handler = createStaticHandler({ root });
    const first = request(handler, '/', { gzip: true });
    expect(gunzipSync(Buffer.from(first.raw)).toString()).toContain('v1');
    writeFileSync(join(root, 'index.html'), '<title>version-2</title>');
    const second = request(handler, '/', { gzip: true });
    expect(gunzipSync(Buffer.from(second.raw)).toString()).toContain('version-2');
  });

  it('un asset inexistente es 404 (no index.html con tipo incorrecto)', () => {
    expect(request(h, '/assets/no-existe.js').status).toBe(404);
  });

  it('rutas de la SPA devuelven index.html', () => {
    expect(request(h, '/sala/ABCDE').body).toContain('<title>');
  });

  it.each([
    '/../secret.txt',
    '/..%2fsecret.txt',
    '/%2e%2e/secret.txt',
    '/../dist-secret/key.txt',
    '/..%2f..%2f..%2fetc%2fpasswd',
  ])('path traversal bloqueado: %s', (path) => {
    const r = request(h, path);
    expect(r.body).not.toContain('SECRETO');
    expect([200, 400, 403, 404]).toContain(r.status);
    if (r.status === 200) expect(r.body).toContain('<title>');
  });

  it('una URL mal codificada da 400 en vez de tirar el proceso', () => {
    expect(() => request(h, '/%E0%A4%A')).not.toThrow();
    expect(request(h, '/%E0%A4%A').status).toBe(400);
    expect(request(h, '/a%00b').status).toBe(400);
  });

  it('sólo GET y HEAD', () => {
    expect(request(h, '/', { method: 'POST' }).status).toBe(405);
    const head = request(h, '/', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.body).toBe('');
  });

  it('el juego antiguo de /legacy no lleva CSP (usa scripts en línea); el resto sí', () => {
    expect(request(h, '/legacy/old.html').headers['content-security-policy']).toBeUndefined();
    expect(request(h, '/legacy/old.html').headers['x-content-type-options']).toBe('nosniff');
  });
});

// ---------- Protocolo y conexiones ----------

function socket() {
  return {
    readyState: 1,
    closed: null as number | null,
    inbox: [] as { t: string; code?: string }[],
    send(d: string) {
      this.inbox.push(JSON.parse(d));
    },
    close(code?: number) {
      this.readyState = 3;
      this.closed = code ?? 1000;
    },
  };
}

describe('protocolo frente a datos hostiles', () => {
  it('parseClientMessage nunca lanza con entradas aleatorias', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
    const values = [null, true, Infinity, -0, NaN, '', 'x'.repeat(5000), [], {}, { t: 'hello' }, '__proto__', 42];
    const types = ['hello', 'shoot', 'join_room', 'set_courses', 'ping', 'set_name', 'constructor', '__proto__', 'nope'];
    for (let i = 0; i < 3000; i++) {
      const msg: Record<string, unknown> = { t: pick(types) };
      for (const k of ['v', 'name', 'token', 'code', 'ids', 'shotId', 'tick', 'dx', 'dz', 'power', 'c', 'hole', 'ready', 'cosmetics']) {
        if (rnd() < 0.5) msg[k] = pick(values);
      }
      expect(() => parseClientMessage(JSON.stringify(msg))).not.toThrow();
    }
    for (const raw of ['', '{', 'null', '[]', '"t"', '{"t":1}', '{"__proto__":{"t":"start"}}']) {
      expect(parseClientMessage(raw)).toBeNull();
    }
  });

  it('un tiro con valores no finitos o fuera de rango se rechaza', () => {
    expect(parseClientMessage('{"t":"shoot","shotId":1,"tick":1,"dx":1e999,"dz":0,"power":1}')).toBeNull();
    expect(parseClientMessage('{"t":"shoot","shotId":1,"tick":1,"dx":1,"dz":0,"power":"1"}')).toBeNull();
  });

  it('basura antes de identificarse cierra la conexión', () => {
    const server = new GameServer();
    const s = socket();
    const h = server.connect(s);
    h.onMessage('{"t":"create_room"}');
    expect(s.closed).toBe(4004);
    expect(h.identified()).toBe(false);
    expect(server.stats.rooms).toBe(0);
  });

  it('mensajes inválidos repetidos tras identificarse cierran la conexión', () => {
    const server = new GameServer();
    const s = socket();
    const h = server.connect(s);
    h.onMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Ana' }));
    expect(h.identified()).toBe(true);
    for (let i = 0; i < NetworkConfig.maxBadMessages - 1; i++) h.onMessage('no json');
    expect(s.closed).toBeNull();
    expect(s.inbox.filter((m) => m.code === 'bad_message')).toHaveLength(1);
    h.onMessage('no json');
    expect(s.closed).toBe(4004);
  });

  it('mensajes demasiado grandes se descartan', () => {
    const server = new GameServer();
    const s = socket();
    const h = server.connect(s);
    h.onMessage(JSON.stringify({ t: 'hello', v: 1, name: 'x'.repeat(NetworkConfig.maxMessageBytes) }));
    expect(h.identified()).toBe(false);
  });

  it('un nombre con caracteres de control o sólo espacios recibe un nombre por defecto', () => {
    const server = new GameServer();
    const s = socket();
    const h = server.connect(s);
    h.onMessage(JSON.stringify({ t: 'hello', v: 1, name: '\u0000\u0007   ' }));
    h.onMessage(JSON.stringify({ t: 'create_room' }));
    const room = s.inbox.find((m) => m.t === 'room') as unknown as { room: { players: { name: string }[] } };
    expect(room.room.players[0]!.name).toMatch(/^Jugador \d+$/);
  });

  it('un token inventado no secuestra ninguna sesión', () => {
    const server = new GameServer();
    const a = socket();
    server.connect(a).onMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Ana' }));
    const b = socket();
    server.connect(b).onMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Eve', token: 'AAAAAAAAAAAAAAAAAAAAAAAA' }));
    const wa = a.inbox.find((m) => m.t === 'welcome') as unknown as { playerId: string };
    const wb = b.inbox.find((m) => m.t === 'welcome') as unknown as { playerId: string; resumed: boolean };
    expect(wb.playerId).not.toBe(wa.playerId);
    expect(wb.resumed).toBe(false);
    expect(a.closed).toBeNull();
  });

  it('un fallo dentro de una sala la cierra sin afectar al resto del servidor', () => {
    const server = new GameServer();
    const mk = (name: string) => {
      const s = socket();
      const h = server.connect(s);
      h.onMessage(JSON.stringify({ t: 'hello', v: 1, name }));
      h.onMessage(JSON.stringify({ t: 'create_room' }));
      return s;
    };
    const a = mk('Ana');
    const b = mk('Beto');
    expect(server.stats.rooms).toBe(2);
    const roomA = server.roomOf((a.inbox[0] as unknown as { playerId: string }).playerId)!;
    roomA.update = () => {
      throw new Error('boom');
    };
    expect(() => server.update()).not.toThrow();
    expect(server.stats.rooms).toBe(1);
    expect(a.inbox.some((m) => m.code === 'server_error')).toBe(true);
    expect(b.inbox.some((m) => m.code === 'server_error')).toBe(false);
  });
});
