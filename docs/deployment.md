# Despliegue

Un único proceso Node sirve el juego compilado y el WebSocket en el mismo puerto.

```bash
npm ci
npm run build                 # typecheck + dist/
NODE_ENV=production npx tsx server/index.ts
# o: npm start  (build + servidor)
```

Comprobación: `GET /health` → `{"ok":true,"sessions":0,"rooms":0,"connections":0}`.

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `2567` | Puerto HTTP + WebSocket |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `STATIC_DIR` | `dist` | Carpeta del cliente compilado |
| `ALLOWED_ORIGINS` | (vacío = cualquiera) | Orígenes permitidos para `/ws`, separados por comas. Recomendado: `https://tu-dominio` |
| `TRUST_PROXY` | (vacío) | `1` detrás de un proxy inverso: usa `X-Forwarded-For` para el límite por IP |
| `WS_CONNECT_SRC` | (vacío) | Orígenes extra para `connect-src` de la CSP (si el cliente usa `VITE_WS_URL` a otro host) |

Variables de compilación del cliente (`.env.local` o entorno al ejecutar `npm run build`):

| Variable | Uso |
|---|---|
| `VITE_WS_URL` | URL del WebSocket si el servidor de juego está en otro host |
| `VITE_ENABLE_DEBUG` | Panel de rendimiento F3 (por defecto `true`) |
| `VITE_EXPOSE_ENGINE` | `true` sólo para QA automatizado. **Nunca** en un despliegue público |

## Detrás de un proxy (nginx)

```nginx
location / {
  proxy_pass http://127.0.0.1:2567;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 120s;
}
```

Con HTTPS el cliente usa `wss://` automáticamente (mismo origen).

## Escalado

Cada sala vive en memoria en un proceso. Para varias instancias, el balanceador debe usar
afinidad de sesión (sticky) por conexión; las salas privadas sólo son visibles en la
instancia que las creó. Coste medido: una sala simula un mundo Rapier por jugador a 120 Hz.

## Ficheros generados

`dist/` incluye `assets/` con nombres con hash (caché de un año) e `index.html` (sin caché).
Rapier (física, WASM en base64) pesa ~1,7 MB con gzip y se descarga después del menú.
