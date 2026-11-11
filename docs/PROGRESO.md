# Estado real del desarrollo (actualizar al cerrar cada fase)
**Fecha de referencia del dossier:** 2026-11-10. **Última actualización:** 2026-11-10 (cierre de la fase 1).

Todo lo que aparece como «hecho» se puede comprobar con los comandos de esta página. Lo que no
está implementado se dice tal cual.

| Entrega | Estado | Evidencia |
|---|---|---|
| Núcleo de reglas del kit (daño, tormenta, Pillars, Recarga, XP, moneda) | Incluido, sin cambios | `npm test` (8 pruebas originales siguen en verde) |
| F0 Fundamentos (repo, build, tests, lint de tipos) | **HECHO** | `npm run check`, `npm test`, `npm run build` |
| F1 Movimiento, cámara y colisiones | **HECHO y jugable** | 47 pruebas unitarias + 17 pasos en navegador real |
| Lobby mínimo, HUD, pausa, resultados, ajustes básicos | **HECHO** (alcance de F1) | `npm run test:e2e`, capturas en `docs/evidence/` |
| F2 Combate (armas, escudo, inventario) | NO implementado | Pendiente |
| F3 Bots | NO implementado | Pendiente |
| F4 Partida Battle Royale completa | NO implementada | Pendiente |
| F5 Construcción / Sin Construcción | NO implementado | Pendiente |
| F6 Recarga y F7 Pilares dentro del juego | NO implementados | Solo reglas del núcleo del kit |
| F8-F9 Lobby completo, taquilla, tienda, pase, misiones | NO implementados | El lobby los muestra bloqueados como «Próximamente» |
| F10 Multijugador real / servidor | NO implementado | La simulación ya es independiente del navegador |
| F11 Ranked, F12 Creativo, F13 Optimización | NO implementados | Pendiente |

## Qué se puede jugar hoy
Un modo de práctica en solitario, **Circuito de Anclas**, en el mapa **Campo de Pruebas**:
entras desde el lobby, tomas el control con un clic y recorres 8 anclas en orden contra un
cronómetro. El recorrido obliga a usar todas las mecánicas de movimiento: esprintar, subir
escalones, saltar, trepar un borde, subir una colina, cruzar una puerta, agacharte en un túnel,
tomar una rampa, saltar un hueco de 3 m y escalar el pedestal central. Al terminar ves tu tiempo
y parciales, se guarda tu mejor marca y puedes repetir o volver al lobby.

No hay enemigos, armas ni otros jugadores todavía: es práctica local, y así lo dice la interfaz.

### Cómo probarlo
```bash
npm install
```
```bash
npm run dev
```
Abre la dirección que imprime Vite (por defecto `http://localhost:5173`). Controles: `WASD`
moverse, ratón mirar, `Espacio` saltar y trepar, `Mayús` esprintar, `C` agacharse (deslizarse si
vas esprintando), `P` o `Esc` pausa, `Retroceso` reiniciar el circuito, `H` ayuda.
Si el navegador no permite capturar el ratón, se puede mirar arrastrando o con las flechas.

## Evidencia de la fase 1 (salidas reales del 2026-11-10)
Entorno: Node v22.23.4, npm 10.9.9, TypeScript 5.9.3, Vite 8.3.7, three 0.187.0, React 19.3.1,
Chromium headless (Playwright 1.63.0) con WebGL 2 por software (SwiftShader).

| Comando | Resultado |
|---|---|
| `npm run check` | Sin errores (núcleo + pruebas, y cliente con su propio `tsconfig`) |
| `npm test` | `tests 47`, `pass 47`, `fail 0` |
| `npm run build` | `dist-web/assets/index-*.js 906.12 kB (gzip 248.75 kB)`, CSS 14.18 kB |
| `npm run test:e2e` | `17/17 e2e steps passed`, circuito completado en `00:49.97` (2998 ticks) |

Capturas tomadas por la propia prueba de navegador (no son montajes): `docs/evidence/fase1-*.jpg`
(lobby, partida, contenedor tras trepar, pausa, ajustes y resultados, a 1280×720 y 1920×1080).

### Criterios de `docs/08-CRITERIOS_QA.md` que tocan a esta fase
| ID | Escenario | Estado | Evidencia |
|---|---|---|---|
| T01 | WASD relativo a cámara, sin atravesar paredes | PASS | `tests/movement.test.ts` (incluye 10 partidas de 30 s con entrada aleatoria sin penetrar geometría) y e2e «a wall stops the player» |
| T02 | Salto consistente a 30/120 FPS | PASS | `tests/movement.test.ts`: mismo estado final a 30, 60, 120, 144 FPS y con cuadros irregulares; ápice 1,0675 m |
| T20 | Ajustes: aplicar / cancelar / restablecer con efecto real | PASS (ajustes de F1) | e2e: FOV cambia la cámara, calidad cambia las llamadas de dibujo (63 vs 103), se guarda y sobrevive a recargar |
| T24 | Medir FPS en perfil definido | NO PROBADO en hardware real | Existe `node tests/e2e/perf.mjs`; aquí solo hay render por CPU (ver abajo) |
| T25 | Menús navegables por teclado, foco visible | PASS parcial | e2e: se inicia partida y se reanuda solo con teclado; no hay auditoría con lector de pantalla |
| T03-T19, T21-T23 | Combate, bots, BR, modos, economía, red, Creativo | NO IMPLEMENTADO | Fases 2 a 6 |

Tabla de movimiento de `docs/03` verificada por prueba: caminar 5,0 m/s, esprint 7,0, agachado
2,5, salto 6,2 m/s con gravedad −18, pendiente máxima 45° (60° no se sube y te desliza), escalón
0,30 m (0,50 m bloquea), cámara a 4,0 m que se acerca ante un muro, FOV 75 por defecto.

### Rendimiento: lo que se midió y lo que no
`node tests/e2e/perf.mjs` en este contenedor (4 núcleos, **sin GPU**, SwiftShader, 1280×720,
esprintando, tras 6 s de calentamiento):

| Preset | ms/cuadro | FPS | Llamadas de dibujo | Triángulos |
|---|---:|---:|---:|---:|
| Baja | 113,7 | 8,8 | 57 | 34 326 |
| Media | 410,4 | 2,4 | 107 | 55 364 |
| Alta | 328,1 | 3,0 | 107 | 55 524 |
| Épica | 653,8 | 1,5 | 107 | 55 524 |

Estas cifras son de **render por CPU** y no dicen nada de un equipo con tarjeta gráfica: la
escena tiene unos 55 000 triángulos y un centenar de llamadas de dibujo, que es poco para
cualquier GPU. **No está medido en hardware real**; el objetivo de 60 FPS queda sin comprobar
hasta ejecutar ese mismo script en el equipo de destino. La simulación no depende de los FPS:
si el render va lento, el juego se ralentiza pero las reglas dan el mismo resultado.

## Decisiones tomadas en esta fase
- **Stack:** TypeScript + Vite + Three.js para el render y React solo para menús y HUD. Sin
  React Three Fiber ni Rapier: la simulación (movimiento, colisiones, raycast) está escrita en
  `src/core/sim` sin dependencias, es determinista y corre igual en Node y en el navegador, que
  es lo que hará falta para el servidor autoritativo. El plan los daba como sugerencia «a validar».
- **Unity:** no se usó. En este entorno no hay editor de Unity, así que no se podría ejecutar ni
  verificar nada, y el kit define un único stack web.
- **Juego anterior:** el tower defense se conserva en `legacy/nexo-tower-defense/`.
- **Tecla de agacharse:** `C` y no `Ctrl`, porque en un navegador `Ctrl+W` cierra la pestaña.
- **Referencias binarias:** los PDF, DOCX y PNG del kit no se versionan (su texto es el de los
  `.md` incluidos). La guía visual de 18 paneles está descrita en `docs/13-GUIA_VISUAL.md`.

## Errores encontrados y corregidos durante la fase
- Cambiar de calidad recreaba el canvas y el evento «contexto perdido» del canvas retirado
  dejaba la partida bloqueada. Corregido y cubierto por la prueba de ajustes.
- Al capturarse el ratón llegaba un primer movimiento enorme que giraba la cámara. Se ignoran
  los primeros 150 ms tras la captura.
- El HUD usaba desenfoque de fondo y animaciones infinitas que obligaban a recomponer toda la
  interfaz en cada cuadro (unos 100 ms por cuadro en render por CPU). Eliminados.
- Los árboles se colocaban con la altura analítica y no con la del terreno muestreado.

## Deudas y límites conocidos
- Sin mando ni controles táctiles: solo teclado y ratón de escritorio.
- No hay reasignación de teclas en la interfaz (el modelo de datos y la detección de conflictos
  sí existen y están probados).
- Trepar solo funciona sobre piezas (cajas, muros, pilares), no sobre salientes del terreno.
- La caída ya informa su altura en los eventos, pero no hay daño porque aún no existe la vida.
- La cámara no colisiona con el follaje (solo con troncos, rocas y piezas).
- Sonido sintetizado sin música. Sin subtítulos ni indicadores visuales de audio.
- El paquete JavaScript pesa 906 kB (Three.js); sin división de código todavía.

## Siguiente tarea
**Fase 2 (F2-F3):** conectar `src/core/combat.ts` a la simulación — arma hitscan con raycast
real desde la cámara, munición y recarga, escudo antes que vida, eliminación, inventario de 5
casillas, HUD de vida/escudo/munición y bots con percepción (campo de visión + línea de visión)
y máquina de estados. Criterios T03 a T06.

### Registro de sesiones
- **Sesión 0** — Kit de referencia, documentación y dominio aislado (sin frontend ni online).
- **Sesión 1 (2026-11-10)** — Importación del kit, línea base (8/8), F0 y F1 completas:
  simulación determinista, cliente Three.js, lobby mínimo, HUD, ajustes, guardado local, 47
  pruebas unitarias y 17 pasos de navegador. Commits `2cee7b7`, `ae809fb`, `e28336e`, `417b3df`
  y el de cierre de documentación.

### Plantilla de próxima sesión
Fecha:
Objetivo:
Commit base:
Archivos tocados:
Evidencias de pruebas (comando + salida):
Qué quedó jugable:
Qué queda bloqueado:
Riesgos y siguiente tarea:
