# Un Bloque en el Vacío — versión para Lovable

Port de [`../oneblock.html`](../oneblock.html) al stack que usa Lovable: **Vite + React +
TypeScript + Tailwind**. Mismo juego, pero partido en piezas para que la IA de Lovable pueda
tocar una sin romper las otras.

Verificado con `tsc --noEmit` en modo estricto: 0 errores.

---

## 1. Cómo montarlo en Lovable

1. Crea un proyecto nuevo en Lovable (React + Tailwind, que es lo que da por defecto).
2. Pega el **prompt maestro** de abajo en el chat.
3. Sube o pega los archivos de `src/` respetando las rutas. El orden importa: primero
   `src/index.css` y `tailwind.config.ts`, luego `src/game/`, luego `src/hooks/`, luego
   `src/components/` y por último `src/pages/Index.tsx`.
4. En `src/App.tsx`, la ruta `/` tiene que renderizar `Index`.

### Prompt maestro

> Voy a montar un juego tipo OneBlock de Minecraft en canvas 2D. Te paso los archivos ya escritos;
> tu trabajo es integrarlos tal cual, sin reescribirlos.
>
> Arquitectura, y quiero que la respetes en todo lo que hagas después:
> - `src/game/` es lógica pura de TypeScript. No importa React, no toca el DOM y no hace fetch.
>   `data.ts` son los números del juego, `engine.ts` las reglas, `render.ts` el dibujo en canvas,
>   `audio.ts` el sonido sintetizado.
> - `src/hooks/useGame.ts` es el puente con React. El estado del juego vive en un `useRef` y se
>   muta 60 veces por segundo; **nunca** lo metas en `useState`, eso provocaría un render por frame.
> - `src/components/` son solo interfaz: HUD, inventario, paneles. Leen el estado y disparan acciones.
> - Todos los colores salen de las variables HSL de `src/index.css` a través de Tailwind
>   (`bg-void`, `text-dim`, `border-line`, `text-amber`...). No quiero hex sueltos ni `text-white`
>   dentro de los componentes.
>
> El juego va a pantalla completa, es oscuro siempre (es un juego, no una web) y tiene que
> funcionar con teclado y con dedos.

### Reglas del proyecto (pégalas en Knowledge)

> - El estado del juego vive en un ref, no en useState. La interfaz se entera por el contador `tick`.
> - `src/game/` no puede importar nada de React ni de `src/components/`.
> - El equilibrio del juego (probabilidades, vidas, costes, umbrales de fase) solo se cambia en
>   `src/game/data.ts`. Si te pido "que sea más fácil", toca esa tabla, no el motor.
> - Colores siempre por token de Tailwind. Fuentes: `font-pixel` para el juego, `font-display`
>   para títulos.
> - No añadas librerías de físicas, de estado global ni de canvas. Lo que hay es suficiente.
> - Textos de la interfaz en español, de tú.

---

## 2. Qué hace cada archivo

| Archivo | Qué contiene | Cuándo tocarlo |
|---|---|---|
| `game/types.ts` | Tipos del juego | Al añadir un concepto nuevo (encantamientos, logros…) |
| `game/data.ts` | Materiales, 10 fases, mobs, picos, espadas, probabilidades | Para reequilibrar o añadir contenido |
| `game/engine.ts` | Reglas: picar, cofres, mobs, muerte, portal, tick | Al cambiar cómo funciona algo |
| `game/render.ts` | Todo el dibujo en canvas | Para cambiar el aspecto |
| `game/audio.ts` | Sonidos sintetizados con WebAudio | Para añadir sonidos |
| `hooks/useGame.ts` | Bucle, eventos, guardado en localStorage | Casi nunca |
| `components/*` | HUD, inventario, controles táctiles, paneles | Para cambiar la interfaz |
| `pages/Index.tsx` | Monta todo y escucha el teclado | Al añadir un panel nuevo |

El motor devuelve **eventos** (`toast`, `banner`, `sound`, `phase`) y la interfaz decide cómo
enseñarlos. Si añades una mecánica, devuelve un evento en vez de llamar a un `setState` desde
`game/`: es lo que mantiene la lógica separada de la pantalla.

---

## 3. Mejoras, en el orden en que las haría

Cada una es un prompt listo para pegar. Van de menos a más riesgo: las primeras son contenido,
las últimas tocan arquitectura.

### 3.1 Logros (fácil, mucho retorno)

> Añade `src/game/achievements.ts` con una lista de logros: primer bloque, 100 bloques, llegar a
> cada fase, primer cofre épico, matar 10 mobs, morir por primera vez, construir el portal, matar al
> dragón. Cada logro tiene id, nombre, descripción y una función `check(state)`. Guarda los
> conseguidos en el estado y enséñalos con un toast dorado al desbloquearlos, más un panel que se
> abre desde el HUD con los que faltan en gris. No cambies el motor: comprueba los logros en el
> hook, después de cada tick.

### 3.2 Crafteo mínimo

> Añade una mesa de crafteo: un panel con recetas definidas en `data.ts` (por ejemplo, 4 roble → 4
> tablas; 3 tablas + 2 palos → escalera; 8 piedra → horno). Las recetas son datos, no código.
> Añade también la función `craft(state, recipeId)` en `engine.ts` que devuelva eventos.

### 3.3 Hambre

> Añade una barra de hambre que baje despacio al picar y al moverte. A cero, empieza a quitar vida.
> La comida ya existe en `MATERIALS` con su campo `food`. Enséñala en el HUD junto a los corazones,
> con el mismo estilo, y que el ayuno se guarde en la partida.

### 3.4 Encantamientos y durabilidad

> Dale durabilidad a picos y espadas, y una mesa de encantamientos que gaste esmeraldas y
> diamantes para dar bonus (eficiencia, filo, irrompibilidad). Todo en `data.ts` + `engine.ts`.

### 3.5 Aspecto: fases con más personalidad

> En `render.ts`, dale a cada fase un fondo propio: partículas de nieve en la Tundra, burbujas y un
> filtro azulado en el Océano, brasas subiendo en el Nether, estrellas moradas en El End. Usa el
> `accent` de cada fase y respeta el estilo de píxel: nada de degradados suaves ni de blur.

### 3.6 Top 10 en la nube (necesita Supabase)

> Conecta Supabase. Crea una tabla `scores` con columnas `id`, `name`, `blocks`, `phase`,
> `created_at`. Al morir o al matar al dragón, ofrece guardar la puntuación con un nombre. Añade un
> panel de Top 10 que lea los mejores por `blocks`. Activa RLS: lectura para todos, inserción para
> todos pero solo de la propia fila, y valida en el servidor que `blocks` no sea absurdo.

Esto es lo mismo que hace el plugin de Minecraft de este repo con su tabla SQLite `ob_islands`,
por si quieres que los dos rankings acaben en el mismo sitio.

### 3.7 Multijugador por turnos (lo más ambicioso)

> Con Supabase Realtime, deja que dos personas piquen el mismo bloque desde navegadores distintos:
> el estado del bloque y el contador viven en la base de datos, el inventario es de cada quien.

---

## 4. Cosas que le pasan a Lovable con este código

- **Si te dice que el juego va lento**: casi seguro ha metido el estado en `useState`. Dile que el
  estado va en un ref y que el canvas se dibuja en su propio `requestAnimationFrame`.
- **Si el canvas sale borroso**: es el `devicePixelRatio`. Ya está resuelto en `GameCanvas.tsx`; que
  no lo "simplifique".
- **Si al añadir un panel se pierde el foco del teclado**: el listener está en `Index.tsx` sobre
  `window`. Que no lo mueva a un componente que se desmonta.
- **Si cambia colores a hex**: recuérdale las reglas del proyecto de arriba.
- **Antes de cada cambio grande**, usa el historial de versiones de Lovable. El juego es un sistema
  con muchas piezas encajadas y es fácil dejarlo injugable con un cambio bienintencionado.

---

## 5. Referencia rápida del equilibrio

| Qué | Dónde | Valor |
|---|---|---|
| Probabilidades al picar | `data.ts` → `CHANCES` | 2 % especial, 12 % cofre, 15 % mob, 8 % fase anterior |
| Rarezas de cofre | `data.ts` → `RARITY_WEIGHTS` | 60 / 25 / 12 / 3 |
| Umbrales de fase | `data.ts` → `PHASES[].at` | 0, 25, 60, 110, 175, 250, 340, 450, 580, 730 |
| Fase Infinita | `data.ts` → `INFINITE_AT` | a los 900 bloques |
| Coste del portal | `data.ts` → `PORTAL_COST` | 12 marcos + 12 ojos |
| Castigo al morir | `engine.ts` → `die()` | pierdes el 25 % de cada montón |
| Velocidad de picado | `data.ts` → `PICKS[].power` | 1 → 5 (un bloque por segundo con el de madera) |

`tsconfig.json` está solo como referencia del alias `@/` → `src/`; Lovable ya trae el suyo.
