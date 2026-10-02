# Seguridad

Modelo de amenazas: juego público en el navegador, sin cuentas ni pagos reales. Lo que hay
que proteger es la **integridad de las partidas online**, la **disponibilidad del
servidor** y que **ningún dato de un jugador pueda inyectar contenido** en otro cliente.

## Servidor autoritativo

- Cada sala simula todas las bolas en el servidor (`server/ServerRoom.ts`). El cliente sólo
  envía la *intención* de tiro (dirección, potencia, tick); posición, golpes, tiempo,
  hoyo y puntuación los decide el servidor.
- `validateShot` comprueba estado, dirección unitaria, potencia en [mín, 1], número máximo
  de golpes e intervalo mínimo entre tiros. La compensación de latencia está acotada a
  `maxRewindMs` (350 ms): el cliente no puede elegir un tick arbitrario.
- El reset manual de bola se rechaza si el jugador ya terminó el hoyo.
- Los resultados que ve el cliente vienen de `hole_end` / `match_end` del servidor.

## Mensajes

- Todo mensaje entrante pasa por `parseClientMessage` (`src/multiplayer/protocol.ts`):
  JSON válido, tipo conocido, campos con tipo y longitud máxima, números finitos. Probado
  con 3000 mensajes aleatorios (`server/security.test.ts`).
- Tamaño máximo: 4 KB por mensaje (8 KB a nivel de transporte, que cierra con 1009).
- Límite de 40 mensajes/s por sesión; 3 abusos cierran la conexión.
- 20 mensajes inválidos, o cualquiera antes de `hello`, cierran la conexión (código 4004).
- Sin `hello` en 10 s → cierre (4003). Mensajes binarios: se ignoran.
- Nombres: sin caracteres de control, espacios normalizados, 2–16 caracteres, únicos por
  sala. React escapa todo el texto: no hay `dangerouslySetInnerHTML` en el proyecto.
- Cosméticos recibidos: se validan contra el catálogo (`sanitizeEquipped`); un id
  desconocido se sustituye por el predeterminado. Son sólo visuales.

## Conexiones

- Máximo 2000 conexiones totales y 12 por IP (429/503 en el *handshake*).
- `ALLOWED_ORIGINS` restringe qué webs pueden abrir el WebSocket (recomendado en producción).
- Latido de transporte cada 15 s: las conexiones medio abiertas se cierran y el jugador
  pasa a "desconectado" (ventana de reconexión de 45 s).
- Token de reconexión: 18 bytes aleatorios (`crypto.randomBytes`), guardado sólo en
  `sessionStorage`. Un token inventado crea una sesión nueva; no secuestra ninguna.
- Códigos de sala: 5 caracteres de un alfabeto de 31 (≈ 28,6 millones de combinaciones)
  generados con `crypto.randomInt`; con el límite de mensajes, adivinar uno por fuerza
  bruta es inviable.

## Robustez

- Una excepción dentro de una sala la cierra (los jugadores reciben un aviso y vuelven al
  menú) sin afectar a las demás salas ni al proceso.
- Una excepción procesando un mensaje se registra y se descarta.
- URLs mal codificadas → 400 (antes tiraban el proceso).
- Apagado ordenado con `SIGTERM`/`SIGINT`: cierra sockets con 1001 y termina.

## HTTP

| Cabecera | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'` (Rapier), `object-src 'none'`, `frame-ancestors 'self'`, `form-action 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Permissions-Policy` | cámara, micrófono, geolocalización y pagos desactivados |
| `Cross-Origin-Opener-Policy` | `same-origin` |

- Sólo `GET`/`HEAD` (405 en otro caso).
- Ficheros estáticos confinados a `dist/` (el prefijo incluye el separador, así que
  `dist-otro/` no es accesible); bytes nulos → 400. Probado con varias variantes de
  *path traversal*.
- Un asset con hash que no existe da 404 (no `index.html`).
- El juego antiguo de `/legacy/` es la única ruta sin CSP (usa scripts en línea).

## Cliente

- `window.__minigolf` (acceso al motor para QA) sólo existe en `npm run dev` o con
  `VITE_EXPOSE_ENGINE=true`. En producción no se expone.
- `localStorage`: todo lo que se lee está versionado y validado; datos corruptos o
  manipulados se sustituyen por los valores por defecto (verificado en el navegador).
  La moneda local no tiene valor real: en práctica local un jugador puede alterar su
  propio perfil, pero no afecta a nadie más.
- No hay secretos en el código ni en `.env.example`. `npm audit --omit=dev`: 0
  vulnerabilidades.

## Límites conocidos

- Sin cuentas: el servidor no puede verificar qué cosméticos posee un jugador (sólo que
  existen). No da ventaja de juego.
- Un mismo usuario puede abrir varias pestañas (hasta 12 conexiones por IP).
