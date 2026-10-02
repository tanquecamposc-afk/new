/**
 * Servidor de Minigolf Party: WebSocket en /ws y, si existe dist/, sirve el
 * juego compilado en el mismo puerto (un único despliegue).
 *
 *   npm run server          (desarrollo, junto a `npm run dev`)
 *   npm run start           (producción: build + servidor)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import { NetworkConfig } from '@/config/network';
import { GameServer } from './GameServer';

const PORT = Number(process.env.PORT ?? NetworkConfig.defaultPort);
const DIST = resolve(process.env.STATIC_DIR ?? 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
};

const game = new GameServer({ log: (...a) => console.log(...a) });

const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...game.stats }));
    return;
  }
  if (!existsSync(DIST)) {
    res.writeHead(404).end('Cliente no compilado: ejecuta `npm run build` o usa `npm run dev`.');
    return;
  }
  // Ficheros estáticos sin salir de dist/ (protección contra path traversal).
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: NetworkConfig.maxMessageBytes * 2 });
wss.on('connection', (ws) => {
  const h = game.connect(ws);
  ws.on('message', (data) => h.onMessage(data.toString()));
  ws.on('close', h.onClose);
  ws.on('error', () => ws.close());
});

// Bucle del servidor: 120 Hz de simulación alineados con el reloj (ServerRoom).
setInterval(() => game.update(), 1000 / 120);

http.listen(PORT, () => console.log(`[server] Minigolf Party en http://localhost:${PORT} (ws: /ws)`));
