/**
 * Servidor de ficheros estáticos (dist/) con cabeceras de seguridad, gzip y
 * protección contra path traversal. Separado de index.ts para poder testearlo.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = /text|javascript|json|svg|wasm/;

/**
 * Política de contenido: sólo recursos propios. 'wasm-unsafe-eval' lo necesita
 * Rapier para compilar su WebAssembly; connect-src permite el WebSocket del
 * mismo origen (y VITE_WS_URL si el cliente se compiló apuntando a otro host).
 */
export function securityHeaders(extraConnect: string[] = []): Record<string, string> {
  const connect = ["'self'", 'ws:', 'wss:', ...extraConnect].join(' ');
  return {
    'content-security-policy': [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connect}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'none'",
    ].join('; '),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'SAMEORIGIN',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'cross-origin-opener-policy': 'same-origin',
  };
}

export interface StaticOptions {
  /** Carpeta absoluta del cliente compilado. */
  root: string;
  extraConnect?: string[];
}

/** Devuelve un manejador para ficheros estáticos con fallback SPA a index.html. */
export function createStaticHandler({ root, extraConnect = [] }: StaticOptions) {
  const gzCache = new Map<string, Buffer>();
  const headers = securityHeaders(extraConnect);
  const rootPrefix = root.endsWith(sep) ? root : root + sep;

  /** Comprime una vez y guarda en memoria (Rapier: 4,3 MB → 1,7 MB). */
  // La clave incluye mtime y tamaño: si se recompila con el servidor en marcha,
  // nunca se sirve un index.html antiguo que apunte a assets que ya no existen.
  const gzipped = (file: string): Buffer => {
    const st = statSync(file);
    const key = `${file}:${st.mtimeMs}:${st.size}`;
    let b = gzCache.get(key);
    if (!b) {
      for (const k of gzCache.keys()) if (k.startsWith(`${file}:`)) gzCache.delete(k);
      gzCache.set(key, (b = gzipSync(readFileSync(file), { level: 9 })));
    }
    return b;
  };

  return (req: IncomingMessage, res: ServerResponse, pathname: string): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD', ...headers }).end();
      return;
    }
    if (!existsSync(root)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...headers }).end('Cliente no compilado: ejecuta `npm run build` o usa `npm run dev`.');
      return;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      // %E0%A4%A sin terminar, etc.: antes tiraba el proceso entero.
      res.writeHead(400, headers).end();
      return;
    }
    if (decoded.includes('\0')) {
      res.writeHead(400, headers).end();
      return;
    }
    let file = normalize(join(root, decoded));
    // El prefijo incluye el separador: "dist-otro/" no cuenta como dentro de "dist/".
    if (file !== root && !file.startsWith(rootPrefix)) {
      res.writeHead(403, headers).end();
      return;
    }
    let isFile = false;
    try {
      isFile = statSync(file).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) {
      // Rutas de la SPA → index.html; un asset con hash inexistente → 404 real.
      if (file.startsWith(join(root, 'assets') + sep)) {
        res.writeHead(404, headers).end();
        return;
      }
      file = join(root, 'index.html');
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    // Los assets con hash no cambian nunca: caché de un año. index.html, siempre fresco.
    const cache = file.startsWith(join(root, 'assets') + sep) ? 'public, max-age=31536000, immutable' : 'no-cache';
    // El juego antiguo conservado en /legacy usa scripts en línea: sin CSP sólo ahí.
    const { 'content-security-policy': _csp, ...legacyHeaders } = headers;
    const pageHeaders = file.startsWith(join(root, 'legacy') + sep) ? legacyHeaders : headers;
    const gzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? '')) && COMPRESSIBLE.test(type);
    const body = gzip ? gzipped(file) : readFileSync(file);
    res.writeHead(200, {
      'content-type': type,
      'content-length': String(body.length),
      'cache-control': cache,
      ...pageHeaders,
      ...(gzip ? { 'content-encoding': 'gzip', vary: 'accept-encoding' } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
}
