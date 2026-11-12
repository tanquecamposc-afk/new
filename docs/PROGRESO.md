# Estado real del desarrollo (actualizar al cerrar cada fase)
**Fecha de referencia del dossier:** 2026-11-10. **Última actualización:** 2026-11-12 (cierre de la fase 2).

Todo lo que aparece como «hecho» se puede comprobar con los comandos de esta página. Lo que no
está implementado se dice tal cual.

| Entrega | Estado | Evidencia |
|---|---|---|
| Núcleo de reglas del kit (daño, tormenta, Pillars, Recarga, XP, moneda) | Incluido; `combat.ts` ya se usa en partida | `npm test` |
| F0 Fundamentos (repo, build, tests, lint de tipos) | **HECHO** | `npm run check`, `npm test`, `npm run build` |
| F1 Movimiento, cámara y colisiones | **HECHO y jugable** | Circuito de Anclas; pruebas de movimiento y 20 pasos de navegador |
| F2 Combate: armas, daño, escudo, munición, inventario, consumibles | **HECHO y jugable** | Galería de Tiro; `tests/combat.test.ts`, `tests/loot.test.ts`, pasos T03-T05 en navegador |
| F3 Bots: percepción, navegación, máquina de estados | **HECHO y jugable** | Escaramuza; `tests/bots.test.ts`, partida completa en navegador |
| Lobby con selección de modo, HUD de combate, resultados | **HECHO** (alcance de F2) | `npm run test:e2e`, capturas en `docs/evidence/` |
| F4 Partida Battle Royale completa (despliegue, botín por tablas, zona) | NO implementada | Fase 3 |
| F5 Construcción / Sin Construcción | NO implementado | Fase 3 |
| F6 Recarga y F7 Pilares dentro del juego | NO implementados | Solo reglas del núcleo del kit |
| F8-F9 Taquilla, tienda, pase, misiones | NO implementados | El lobby los muestra bloqueados como «Próximamente» |
| F10 Multijugador real / servidor | NO implementado | La simulación ya es independiente del navegador |
| F11 Ranked, F12 Creativo, F13 Optimización | NO implementados | Pendiente |

## Qué se puede jugar hoy
Tres experiencias en solitario, elegibles desde el lobby:

1. **Circuito de Anclas** (Campo de Pruebas). Contrarreloj de 8 anclas que obliga a usar todo el
   movimiento. Sin armas.
2. **Galería de Tiro**. Práctica libre: empiezas con rifle, escopeta y pistola; en los bancos hay
   subfusil, fusil de precisión, células y batería de escudo, vendajes y botiquín. Seis maniquíes
   a 10, 18 (se mueve de lado a lado), 25, 50 y 80 m, y uno detrás de un muro. Empiezas con 60 de
   vida para poder probar las curas. Los maniquíes muestran sus barras de escudo y vida y
   reaparecen a los 3 s; los objetos de los bancos, a los 12 s.
3. **Escaramuza** (Cantera Ámbar). Todos contra todos contra 3, 5, 7 u 11 bots en tres
   dificultades. Cuenta atrás de 3 s, empiezas con pistola, 100 de vida y 50 de escudo, y hay que
   buscar armas, munición y curas por el mapa. Quien cae suelta todo lo que lleva. Gana el último
   en pie; al final ves puesto, eliminaciones, daño, precisión y la clasificación, y se guardan
   tus estadísticas. Si la partida se alarga o quedan dos corredores, un «pulso» marca a los
   rivales en la brújula cada 6 s para que el final siempre se resuelva.

Los rivales son **bots de práctica** y la interfaz lo indica siempre (etiqueta BOT en el HUD, el
registro de eliminaciones y los resultados). No hay otros jugadores: no existe multijugador.

Versión publicada para jugar sin instalar nada (privada, se actualiza con cada fase):
<https://claude.ai/artifact/WwSRHF94gLVuTfzmAGApTr>

### Cómo probarlo
```bash
npm install
```
```bash
npm run dev
```
Abre la dirección que imprime Vite (por defecto `http://localhost:5173`).

| Acción | Teclado y ratón | Táctil |
|---|---|---|
| Moverse / mirar | `WASD` / ratón (o arrastrar, o flechas) | Stick a la izquierda / arrastrar |
| Saltar, esprintar, agacharse | `Espacio`, `Mayús`, `C` | Botones; stick a fondo esprinta |
| Disparar o usar objeto | Clic izquierdo | Botón de disparo |
| Apuntar | Clic derecho (o alternar, en Ajustes → Controles) | Botón de mira |
| Recargar / recoger | `R` / `E` | Botón de recarga / tocar el aviso |
| Casillas del inventario | `1`–`5` o rueda | Tocar la casilla |
| Pausa / ayuda | `P` o `Esc` / `H` | Botón de pausa |

`?seed=123` en la dirección repite exactamente la misma Escaramuza.

Para generar el juego como un único archivo HTML autocontenido:
```bash
npm run build:artifact
```

## Evidencia de la fase 2 (salidas reales del 2026-11-12)
Entorno: Node v22.23.4, npm 10.9.9, TypeScript 5.9.3, Vite 8.3.7, three 0.187.0, React 19.3.1,
Chromium headless (Playwright 1.63.0) con WebGL 2 por software (SwiftShader).

| Comando | Resultado |
|---|---|
| `npm run check` | Sin errores (núcleo + pruebas, y cliente con su propio `tsconfig`) |
| `npm test` | `tests @UNIT@`, `pass @UNIT@`, `fail 0` |
| `npm run build` | `dist-web/assets/index-*.js` @JS@ kB (@GZIP@ kB con gzip), CSS @CSS@ kB |
| `npm run build:artifact` | `dist-artifact/nexus-royale.html  @ARTIFACT@ kB (self-contained)` |
| `npm run test:e2e` | `@E2E@ e2e steps passed` |

Pruebas unitarias nuevas de esta fase (todas con semilla fija y sin depender de los FPS):
`tests/combat.test.ts` (19), `tests/loot.test.ts` (10), `tests/bots.test.ts` (12), más las de
guardado y textos ampliadas.

Capturas tomadas por la propia prueba de navegador (no son montajes), en `docs/evidence/`:
`fase2-lobby-1920x1080`, `fase2-galeria-1280x720`, `fase2-escaramuza-1280x720`,
`fase2-escaramuza-1920x1080`, `fase2-escaramuza-resultados` y `fase2-movil-galeria-844x390`,
además de las de la fase 1 (regeneradas con el lobby nuevo).

### Criterios de `docs/08-CRITERIOS_QA.md`
| ID | Escenario | Estado | Evidencia |
|---|---|---|---|
| T01 | WASD relativo a cámara, sin atravesar paredes | PASS | `tests/movement.test.ts`; e2e «a wall stops the player» |
| T02 | Salto consistente a 30/120 FPS | PASS | `tests/movement.test.ts` (30, 60, 120, 144 FPS y cuadros irregulares) |
| T03 | Disparo: munición −1, hit confirmado en collider visible | PASS | `tests/combat.test.ts` (el impacto cae sobre el cilindro del cuerpo; mirar a otro lado gasta la bala y no confirma nada); e2e en la Galería: 30 → 29, marcador de impacto solo tras el evento de la simulación |
| T04 | Escudo: se consume primero y nunca negativo | PASS | `tests/combat.test.ts` (incluye 1000 golpes aleatorios con NaN, infinito y negativos sin romper vida ni escudo); e2e: escudo 50 → 25 → 0, luego vida 100 → 75 |
| T05 | Recarga: no dispara durante la recarga, munición final correcta | PASS | `tests/combat.test.ts` (ticks exactos, reserva parcial, arma vacía sin reserva); e2e: gatillo apretado durante la recarga sin un solo disparo, reserva 120 → 114 |
| T06 | Bot: no atraviesa paredes ni ve a través de muros | PASS | `tests/bots.test.ts`: con un muro en medio ni detecta, ni dispara, ni daña en 600 ticks; deja de disparar al perder la línea de visión; en tres partidas de 11 bots ninguno termina un tick dentro de geometría |
| T08 | Resultado: un solo ganador y salida a lobby | PASS (Escaramuza) | `tests/combat.test.ts` y `tests/bots.test.ts`: `MatchEnded` exactamente una vez, puestos 1..N sin empates, también con dos caídas mortales en el mismo tick; e2e: resultados → lobby con estadísticas guardadas. Falta la partida Royale (fase 3) |
| T20 | Ajustes: aplicar / cancelar / restablecer con efecto real | PASS | e2e (incluye el nuevo «apuntar con un toque») |
| T24 | Medir FPS en perfil definido | NO PROBADO en hardware real | Ver «Rendimiento» |
| T25 | Menús navegables por teclado, foco visible | PASS parcial | e2e inicia y reanuda solo con teclado; sin auditoría con lector de pantalla |
| — | Compatibilidad táctil | PASS en emulación | e2e en 844×390: disparar manteniendo el botón, recargar, tocar casillas, alternar mira. **No probado en un teléfono físico** |
| T07, T09-T19, T21-T23 | Tormenta, construcción, modos, economía, red, Creativo | NO IMPLEMENTADO | Fases 3 a 6 |

Tabla de armas de `docs/03` verificada contra `data/weapons.example.json` por prueba: rifle 25
(×1,8 cabeza, 30 balas, 8/s, recarga 2,0 s), subfusil 18 (×1,5, 32, 11/s, 2,4 s), escopeta 10 × 8
perdigones (×1,5, 5, 0,85/s, 3,6 s), francotirador 90 (×2, 1, 0,65/s, 2,8 s) y pistola 32 (×1,75,
12, 4/s, 1,6 s). Las cadencias son exactas sobre el reloj de 60 Hz (8 disparos por segundo son 8,
no 7,5). Consumibles de `docs/03`: célula +25 hasta 50, batería +50 hasta 100, vendaje +15 hasta
75 y botiquín a vida completa, todos con tiempo de uso y cancelables al cambiar de casilla.

### Rendimiento: lo que se midió y lo que no
- **Simulación** (Node, este contenedor): 16 bots peleando sin parar cuestan **@SIM@ ms por tick**
  de un presupuesto de 16,67 ms (`tests/bots.test.ts`). Preparar una Escaramuza (mapa, navegación
  de unos 7 500 nodos y 12 participantes) tarda unos 0,2-0,6 s.
- **Render**: con 8 corredores en la Cantera Ámbar, calidad alta: @DRAW@ llamadas de dibujo y
  @TRIS@ triángulos. Lobby: 85 llamadas y 53 802 triángulos.
- **FPS**: este contenedor no tiene GPU; el render por CPU (SwiftShader) da entre 4 y 14 FPS según
  el preset y **no dice nada de un equipo con tarjeta gráfica**. El objetivo de 60 FPS sigue sin
  comprobarse en hardware real. Cada corredor son unas 30 mallas: hay margen claro de mejora
  fusionándolas (ver deudas).

## Decisiones tomadas en esta fase
- **El disparo sale del pivote de la cámara** (el «hombro» del corredor) siguiendo la mira, y lo
  resuelve la simulación con un raycast contra el mundo y contra las zonas de impacto. La bala cae
  donde está la mira, sin paralaje, y un servidor puede recalcularlo porque la cámara vive en
  `src/core`. Los bots disparan desde los ojos.
- **Los bots solo producen `InputFrame`**, igual que un jugador. No pueden atravesar ni disparar a
  través de nada porque no tienen otra forma de actuar. Ven con campo de visión más línea de
  visión, oyen disparos y carreras de forma aproximada y, si los hieren sin ver a quién, solo
  saben más o menos de dónde vino.
- **La navegación se genera sola** recorriendo el mundo de colisiones desde los puntos de
  aparición: rampas, pisos superiores y puertas salen sin marcarlos a mano.
- **Un modo es un conjunto de reglas** (`MatchRules`), no otro motor: Circuito, Galería y
  Escaramuza comparten simulación. La fase 3 añadirá reglas, no un motor nuevo.
- **Entre bots el daño se reduce al 40 %** en Escaramuza (regla configurable por modo), para que
  no se eliminen entre ellos antes de que el jugador haya tenido un combate. Contra el jugador y
  del jugador contra ellos el daño es el normal.
- **Guardado en versión 2** con migración desde la 1 (estadísticas de Escaramuza, opciones y
  último modo). Probado con un guardado antiguo real en la prueba de navegador.
- **Sin sangre**: los impactos desprenden luz (azul si aguanta el escudo) y un corredor eliminado
  se deshace en fragmentos. Es parte de la identidad propia del proyecto.

## Errores encontrados y corregidos durante la fase
- La cadencia perdía la fracción de tick al disparar seguido (un subfusil de 11/s disparaba 10).
  Lo detectó la prueba de cadencia; ahora el calendario de disparo conserva la fracción.
- Los bots intentaban patrullar por la ladera del borde del mapa y se quedaban resbalando, así
  que algunas partidas no terminaban. La navegación se mantiene 12° por debajo de la pendiente
  límite.
- Un bot sin munición se quedaba plantado frente a su objetivo. Ahora llevan pistola de reserva,
  eligen arma según la distancia y, si se quedan secos, van a por un arma o munición que vean.
- Una puerta de 1,4 m centrada en un metro entero dejaba el cobertizo fuera de la navegación
  (rejilla de 1 m). Las puertas pasan a 1,6 m centradas en medio metro y hay una prueba que exige
  que cada interior sea alcanzable.
- Un clic más corto que un cuadro podía perderse y, en equipos lentos, durar de más. Cada
  pulsación cuenta ahora como mínimo un tick.
- La cara inferior de techos y plataformas se veía negra desde abajo, y el techo de la galería
  tapaba media pantalla con la cámara en tercera persona. Corregido el sombreado y retirado el
  techo.
- A 1280×720 la tarjeta del modo se salía por encima de la cabecera del lobby. Ahora la columna
  se desplaza.

## Deudas y límites conocidos
- No hay arma cuerpo a cuerpo ni tecla para soltar objetos (se intercambia al recoger con el
  inventario lleno). Llegan con la recolección de la fase 3.
- Los bots no saquean para mejorar su equipo, no usan coberturas de forma táctica, no saltan ni
  trepan (su navegación solo camina) y no forman equipos.
- Tras caer eliminado se muestran los resultados; no hay modo espectador.
- Las zonas de impacto son cuerpo y cabeza; brazos y piernas no se distinguen.
- Sin mando. Sin reasignación de teclas en la interfaz (el modelo de datos sí existe).
- Táctil probado solo en emulación; rendimiento en móviles reales sin medir.
- Cada corredor son unas 30 mallas: con decenas de jugadores habrá que fusionar o usar LOD.
- El paquete JavaScript pesa algo más de 1 MB (Three.js); sin división de código todavía.
- Sonido sintetizado sin música. Sin subtítulos ni indicadores visuales de audio.
- **Escaneo de seguridad (HawkScan):** no se pudo ejecutar; en este entorno no está instalado el
  CLI `hawk` ni hay `HAWK_API_KEY`. Además, hoy el juego es un cliente estático sin servidor ni
  API, así que no hay superficie que un escáner dinámico pueda atacar. Tendrá sentido en la fase 6.

## Siguiente tarea
**Fase 3 (F4-F5):** partida Royale completa sobre un mapa de isla — despliegue, botín por tablas
con semilla, zona que se cierra con `src/core/storm.ts`, construcción en rejilla (y su variante
Sin Construcción), victoria y resultados. Criterios T07 a T10.

### Registro de sesiones
- **Sesión 0** — Kit de referencia, documentación y dominio aislado (sin frontend ni online).
- **Sesión 1 (2026-11-10)** — Importación del kit, línea base (8/8), F0 y F1 completas:
  simulación determinista, cliente Three.js, lobby mínimo, HUD, ajustes, guardado local, 47
  pruebas unitarias y 20 pasos de navegador, controles táctiles y build de un solo archivo.
  Commits `2cee7b7`, `ae809fb`, `e28336e`, `417b3df`, `8b8dec9`, `e4d4278`.
- **Sesión 2 (2026-11-11 y 12)** — F2 y F3: armas, daño, inventario, botín y consumibles
  (`99478e9`); bots, navegación y reglas por modo (`fd01789`); cliente con Galería de Tiro y
  Escaramuza, HUD de combate, sonido y pruebas de navegador (commit de cierre de la fase).

### Plantilla de próxima sesión
Fecha:
Objetivo:
Commit base:
Archivos tocados:
Evidencias de pruebas (comando + salida):
Qué quedó jugable:
Qué queda bloqueado:
Riesgos y siguiente tarea:
