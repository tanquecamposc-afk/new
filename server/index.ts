/**
 * Servidor de Minigolf Party: WebSocket en /ws y, si existe dist/, sirve el
 * juego compilado en el mismo puerto (un único despliegue).
 *
 *   npm run server          (desarrollo, junto a `npm run dev`)
 *   npm run start           (producción: build + servidor)
 *
 * Variables de entorno (todas opcionales, ver docs/deployment.md):
 *   PORT, HOST, STATIC_DIR, ALLOWED_ORIGINS, TRUST_PROXY, WS_CONNECT_SRC
 */
import { createServer, type IncomingMessage } from 'node:http';
import { resolve } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { NetworkConfig } from '@/config/network';
import { GameServer } from './GameServer';
import { createStaticHandler, securityHeaders } from './http';

const PORT = Number(process.env.PORT ?? NetworkConfig.defaultPort);
const HOST = process.env.HOST ?? '0.0.0.0';
const DIST = resolve(process.env.STATIC_DIR ?? 'dist');
/** Orígenes permitidos para el WebSocket, separados por comas. Vacío = cualquiera. */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
/** Detrás de un proxy (nginx, Render, Fly…): usar X-Forwarded-For para la IP. */
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const EXTRA_CONNECT = (process.env.WS_CONNECT_SRC ?? '').split(/\s+/).filter(Boolean);

const game = new GameServer({ log: (...a) => console.log(...a) });
const serveStatic = createStaticHandler({ root: DIST, extraConnect: EXTRA_CONNECT });
const baseHeaders = securityHeaders(EXTRA_CONNECT);

const http = createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    res.writeHead(400, baseHeaders).end();
    return;
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', ...baseHeaders });
    res.end(JSON.stringify({ ok: true, ...game.stats, connections: wss.clients.size }));
    return;
  }
  try {
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error('[server] error sirviendo', pathname, e);
    if (!res.headersSent) res.writeHead(500, baseHeaders);
    res.end();
  }
});

function clientIp(req: IncomingMessage): string {
  if (TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

const perIp = new Map<string, number>();

const wss = new WebSocketServer({
  server: http,
  path: '/ws',
  maxPayload: NetworkConfig.maxMessageBytes * 2,
  perMessageDeflate: false,
  verifyClient: ({ req, origin }, done) => {
    if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) return done(false, 403, 'Origin not allowed');
    if (wss.clients.size >= NetworkConfig.maxConnections) return done(false, 503, 'Server full');
    if ((perIp.get(clientIp(req)) ?? 0) >= NetworkConfig.maxConnectionsPerIp) return done(false, 429, 'Too many connections');
    done(true);
  },
});

const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));

  const h = game.connect(ws);
  // Sin `hello` a tiempo: conexión ociosa que sólo ocupa una plaza.
  const helloTimer = setTimeout(() => {
    if (!h.identified()) ws.close(4003, 'hello_timeout');
  }, NetworkConfig.helloTimeoutMs);

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    try {
      h.onMessage(data.toString());
    } catch (e) {
      // Un mensaje que provoque una excepción no debe tumbar el proceso.
      console.error('[server] error procesando mensaje', e);
    }
  });
  ws.on('close', () => {
    clearTimeout(helloTimer);
    const n = (perIp.get(ip) ?? 1) - 1;
    if (n <= 0) perIp.delete(ip);
    else perIp.set(ip, n);
    h.onClose();
  });
  ws.on('error', () => ws.terminate());
});

// Latido de transporte: detecta conexiones medio abiertas (móvil sin cobertura,
// portátil suspendido) para que la sala las marque como desconectadas.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.get(ws)) {
      ws.terminate();
      continue;
    }
    alive.set(ws, false);
    ws.ping();
  }
}, NetworkConfig.heartbeatMs);

// Bucle del servidor: 120 Hz de simulación alineados con el reloj (ServerRoom).
const loop = setInterval(() => game.update(), 1000 / 120);

http.listen(PORT, HOST, () => console.log(`[server] Minigolf Party en http://localhost:${PORT} (ws: /ws)`));

function shutdown(signal: string): void {
  console.log(`[server] ${signal}: cerrando`);
  clearInterval(loop);
  clearInterval(heartbeat);
  for (const ws of wss.clients) ws.close(1001, 'server_shutdown');
  wss.close();
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
