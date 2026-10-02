# Minigolf Party ⛳

Minigolf arcade 3D multijugador para el navegador: hasta 20 jugadores compiten **a la vez
en el mismo hoyo**, con apuntado de arrastrar y soltar, física real y cosméticos sin
ventajas de juego. Inspirado en las mecánicas de los minigolf *.io*; código, geometría,
texturas y sonidos 100 % propios (todo se genera en tiempo real, sin assets externos).

**Stack:** React 19 · TypeScript 7 · Vite 8 · Tailwind 4 · Three.js · Rapier (WASM) ·
Zustand · Node + `ws` · Vitest · oxlint.

## Empezar

```bash
npm install
npm start        # compila y arranca el servidor: http://localhost:2567
```

Desarrollo con recarga en caliente: `npm run server` en una terminal y `npm run dev` en otra.

| Script | Qué hace |
|---|---|
| `npm run dev` | Cliente de desarrollo (Vite) |
| `npm run server` | Servidor de juego (WebSocket) en :2567 |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` (sólo práctica local) |
| `npm start` | Build + servidor que sirve juego y WebSocket en el mismo puerto |
| `npm test` | 162 tests (física, cursos, partidas, servidor, seguridad, tienda…) |
| `npm run lint` | oxlint |
| `npm run check` | Typecheck + lint + tests |

## Qué incluye

- **Modos:** partida rápida (matchmaking), sala privada con código y práctica local sin
  conexión (con bots opcionales, sólo en local).
- **6 hoyos** definidos por datos: rampas, agua, arena, aceleradores, bumpers, molino,
  barreras móviles y spinner.
- **Física determinista** a 120 Hz, idéntica en cliente, servidor y tests; trayectoria
  predictiva con rebotes.
- **Online autoritativo:** el servidor simula todas las bolas, compensa la latencia,
  interpola las bolas remotas y permite reconectar (incluso recargando la página).
- **Progresión:** perfil, XP, niveles, monedas, tienda, inventario y cosméticos.
- **Gráficos:** 4 calidades + detección automática, sombras, agua con shader,
  partículas, resolución dinámica. Música y efectos sintetizados.
- **Dispositivos:** escritorio, Chromebook, tablet y móvil (controles táctiles).

## Controles

Arrastra **hacia atrás** desde cualquier punto y suelta para golpear (como un tirachinas).
Esc cancela / pausa · R reinicia la bola · V vista general · Q/E o botón derecho giran la
cámara · rueda para zoom · F3 panel de rendimiento. Lista completa en
[docs/development.md](docs/development.md).

## Documentación

| | |
|---|---|
| [Estado y resultado final](docs/IMPLEMENTATION_STATUS.md) | Fases, sistemas, errores corregidos |
| [Arquitectura](docs/architecture.md) | Módulos y flujo de datos |
| [Física](docs/physics.md) · [Cursos](docs/courses.md) · [Puntuación](docs/scoring.md) | Reglas y parámetros de tuning |
| [Multijugador](docs/multiplayer.md) | Protocolo, sincronización, reconexión |
| [Cosméticos](docs/cosmetics.md) · [Persistencia](docs/persistence.md) | Economía y guardado |
| [Rendimiento](docs/performance.md) | Calidades, optimizaciones, mediciones |
| [Seguridad](docs/security.md) · [Despliegue](docs/deployment.md) | Producción |
| [Desarrollo](docs/development.md) · [Testing](docs/testing.md) | Para contribuir |

Todos los valores numéricos (velocidades, fricciones, puntuación, precios) son
**parámetros de tuning propios** documentados, no valores del juego de referencia.

> El tower defense anterior (*NEXO*) se conserva en `public/legacy/nexo-tower-defense.html`.
