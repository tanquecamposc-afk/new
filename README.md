# NEXO Arcade 🎮

Una web de juegos con **95 juegos originales** que se ejecutan enteros en el navegador. Sin anuncios, sin cuentas, sin instalar nada y sin una sola imagen externa: todo el arte se dibuja por código.

![95 juegos](https://img.shields.io/badge/juegos-95-7c5cff) ![sin dependencias](https://img.shields.io/badge/dependencias-0-22e0ff) ![PWA](https://img.shields.io/badge/PWA-offline-4ade80)

## Cómo abrirlo

La forma corta: abre `index.html` en el navegador y ya está. Funciona incluso con `file://` porque los juegos se cargan con etiquetas `<script>` normales, no con módulos ES.

Si quieres que funcione el modo offline (service worker) hace falta un servidor. Cualquiera vale:

```bash
python3 -m http.server 8000
# o
npx http-server -p 8000
```

Luego entra a `http://localhost:8000`.

## Qué hay dentro

| Categoría | Juegos | Ejemplos |
|---|---|---|
| 💥 Acción | 13 | Invasores Neón, Asteroides Cuánticos, Doble Cañón, Enjambre Letal |
| 🕹️ Arcade | 6 | Serpiente Neón, Rompe Bloques, Pinball Neón, Pong Supernova |
| 🏃 Plataformas | 10 | Saltarín Neón, Ninja de Muros, Minero Profundo, Columpio Web |
| 🧩 Puzles | 16 | 2048 Nébula, Bloques Caídos, Sudoku Solar, Flujo de Color |
| 🧠 Mente | 9 | Palabra Oculta, Sopa de Letras, Código Secreto, Tecleo Veloz |
| ⚽ Deportes | 10 | Mini Golf, Billar 8, Penales Estelares, Bolos Espaciales |
| 🏎️ Carreras | 7 | Circuito Neón, Kart Retro, Moto Colinas, Derrape Total |
| 🏰 Estrategia | 7 | Nexo Defensa, Conquista Hexagonal, Fábrica Idle, Asedio al Castillo |
| ♟️ Mesa y cartas | 8 | Ajedrez Nexo, Damas, Reversi, Solitario Klondike, Mahjong |
| 🎈 Casual | 9 | Topo Loco, Tirachinas, Piano Ritmo, Cortar la Cuerda |

Los juegos de mesa tienen IA de verdad, no movimientos al azar: el ajedrez usa negamax con poda alfa-beta, quiescencia y tablas de posición; damas y reversi usan minimax con evaluación posicional; el cuatro en raya llega a profundidad 6.

## Lo que hace la plataforma

- **Portadas animadas.** Cada tarjeta dibuja su propia ilustración por código y cobra vida al pasar el cursor. 95 motivos distintos, ninguna imagen descargada.
- **Buscador instantáneo** con sugerencias, tolerante a tildes. Se abre con `/`.
- **Favoritos, historial y récords personales**, guardados en el navegador.
- **Progresión**: experiencia, niveles, rachas diarias y 24 logros.
- **Tema claro y oscuro**, ajustes de sonido y música, barra lateral compacta.
- **Mandos táctiles en pantalla** que aparecen solos en móvil (joystick, cruceta o botones según el juego).
- **Funciona sin conexión** una vez visitada, gracias al service worker.
- Exportar e importar tu progreso como archivo JSON.

## Cómo está montado

```
index.html                  el shell de la web
assets/css/                 base, layout, componentes, reproductor
assets/js/engine/           el motor compartido
  math.js                   RNG con semilla, easings, colisiones, ruido
  gfx.js                    primitivas, partículas, cámara, sprites vectoriales
  audio.js                  síntesis WebAudio (efectos y música generada)
  input.js                  teclado, ratón, táctil, gamepad y mandos virtuales
  ui.js                     widgets en lienzo, rejillas y baraja de cartas
  core.js                   registro de juegos, bucle, DPR y ciclo de vida
assets/js/platform/         catálogo, portadas, tienda local, vistas, reproductor
assets/js/games/            94 juegos, uno por archivo
games/legacy/nexo-td.html   NEXO: Tower Defense (el juego original del repo)
sw.js                       service worker
```

### Escribir un juego nuevo

Un juego es un archivo en `assets/js/games/<slug>.js` y una entrada en el catálogo. La forma mínima:

```js
NX.game('mi-juego', {
  w: 900, h: 600, pal: 'neon',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'A' }] },
}, function (E) {
  let x = 0, score = 0;
  E.api.hud({ Puntos: 0 });

  return {
    update(dt) {
      x += E.input.axis().x * 300 * dt;
      if (E.input.pressed('space')) {
        score += 10;
        E.sfx('coin');
        E.api.hud({ Puntos: score });
      }
    },
    draw(g) {
      g.circle(x, 300, 20, E.pal.a);
      E.particles.draw(g);
    },
  };
});
```

Y en `assets/js/platform/catalog.js`:

```js
G('mi-juego', 'Mi Juego', 'arcade', 'snake', 'neon', 2,
  ['etiqueta'], 'Descripción corta.', '⌨️ Flechas'),
```

El motor te da `E.input`, `E.sfx`, `E.particles`, `E.camera`, `E.floaters`, `E.tweens`, `E.rng`, `E.ui` y `E.api` (HUD, récords, guardado y pantallas de fin de partida). El campo `art` del catálogo apunta a uno de los motivos de portada de `motifs-a/b/c.js`.

## Atajos

| Tecla | Qué hace |
|---|---|
| `/` | Buscar |
| `Esc` o `P` | Pausa |
| `R` | Reiniciar la partida |
| `F` | Pantalla completa |
| `Shift`+`G` | Juego al azar |

## Detalles técnicos

- Cero dependencias. Ni frameworks, ni build, ni `node_modules`. Se sube tal cual a cualquier hosting estático.
- El motor corre con `requestAnimationFrame` y `dt` acotado, escala al DPI de la pantalla y ajusta la resolución al contenedor.
- Todo el sonido se sintetiza en tiempo real con WebAudio: no hay archivos de audio en el repo.
- Los datos se guardan solo en `localStorage`. Nada sale del navegador.
- Accesible: navegación por teclado, foco visible, `prefers-reduced-motion` y contraste cuidado en ambos temas.

## Licencia

Código y arte originales. Úsalo como quieras.
