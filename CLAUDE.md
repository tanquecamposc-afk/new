# Proyecto: NEXUS ROYALE (nombre provisional)
Desarrolla un videojuego shooter 3D original, inspirado en la amplitud funcional de Battle Royale modernos. NO copies assets, interfaz pixel a pixel, marcas, personajes, mapas o música de Fortnite. Responde al usuario en español, código/documentación técnica con nombres ingleses.

## Prioridades
1. Producto **jugable** > demo visual > cantidad de funciones.
2. Todo código nuevo debe compilar, tener un flujo jugable verificable y no romper la fase anterior.
3. Primero inspecciona el repositorio y ejecuta pruebas existentes. No sobrescribas módulos existentes sin comprobar impactos.
4. El núcleo de dominio (`src/core/`) no depende del renderizador, React, plataforma ni base de datos.
5. Inicia tareas de más de un archivo con un plan breve; implementa vertical slices comprobables.
6. No declares «completo» lo que solo sea botón, mock, dato estático, bot no funcional o una simulación de servidor.
7. Si no puedes ejecutar la app, registra explícitamente la limitación y provee comandos de verificación.
8. Antes de añadir una dependencia, comprueba API/versión/compatibilidad. Congela versiones y elige un solo stack.
9. Datos y reglas configurables por modo; no copies/pegues motores distintos para BR, Recarga, Ranked y Pillars.
10. No almacenes secretos en repositorio ni uses permisos irrestrictos por defecto.

## Comandos
- `npm run check`: comprobar tipos del núcleo, las pruebas y el cliente.
- `npm test`: compilar y ejecutar tests del núcleo (`node:test`).
- `npm run dev`: cliente web en desarrollo (Vite).
- `npm run build`: tipos + build de producción en `dist-web/`.
- `npm run test:e2e`: build + prueba en Chromium real (teclado, ratón y táctil; circuito, galería de tiro y escaramuza). `--filter=<regex>` ejecuta solo algunos pasos; `--evidence` copia capturas a `docs/evidence/`. Tarda varios minutos: no reconstruir (`vite build`) mientras corre.
- `npm run build:artifact`: el juego en un único HTML autocontenido (`dist-artifact/`).
- `node tests/e2e/perf.mjs`: tiempo de cuadro por preset gráfico en la máquina actual.

## Stack y estructura (decididos en la fase 1; no cambiar sin migración explícita)
- TypeScript estricto + Vite + Three.js (render) + React (solo menús y HUD). Sin React Three Fiber ni Rapier.
- `src/core/sim`: simulación determinista a 60 Hz (mundo de colisiones, personaje, cámara, armas en `gunplay.ts`, inventario, botín, navegación en `nav.ts`, bots en `bot.ts`, reglas por modo en `rules.ts`, partidas listas en `matchSetup.ts`). `src/core/maps`: mapas como datos, con `builder.ts` para edificios. `src/core/meta`: ajustes y guardado validados (el guardado va por la versión 2; añadir campos exige migración y prueba).
- Un modo nuevo es un `MatchRules` nuevo, no un motor nuevo. Los bots solo producen `InputFrame`: nunca leen ni escriben estado de otro jugador fuera de su percepción.
- Las puertas de los mapas van centradas en medio metro (…, 24.5, 25.5) y miden al menos 1,6 m: la navegación de los bots usa una rejilla de 1 m.
- `src/client`: `game/` (bucle e integración), `render/`, `input/`, `audio/`, `ui/`, `app/` (estado, textos es-PE/en, persistencia).
- La simulación es la única fuente de verdad; el cliente solo envía `InputFrame` y dibuja. Los efectos visuales y sonoros reaccionan a eventos de la simulación.
- Todo el arte y el audio se generan por código. No añadir assets externos sin registrarlos en `assets/LICENSES.md`.
- En navegador, agacharse es `C`: `Ctrl+W` cierra la pestaña y no se puede bloquear.
- En las pruebas de navegador los botones del ratón y la rueda se envían como eventos del DOM (como los movimientos): con el puntero capturado, el Chromium sin cabeza convierte un clic sintético en un movimiento enorme.

## Archivos importantes
- `README_EMPIEZA_AQUI.md`: instalación y límites de este kit.
- `docs/00-PLAN_MAESTRO.md`: fases, dependencias y entregables.
- `docs/01-ARQUITECTURA.md`: organización técnica y single-source-of-truth.
- `docs/02-CONTRATOS_Y_ESTADOS.md`: eventos, invariantes y máquinas de estado.
- `docs/03-GAMEPLAY_NUMEROS.md`: valores de prueba originales, modificables.
- `docs/04-MODOS_Y_PILLARS.md`: mecánicas diferenciadas por experiencia.
- `docs/05-MULTIJUGADOR.md`: autoridad del servidor, netcode y persistencia.
- `docs/06-ARTE_Y_RENDIMIENTO.md`: gráficos, pipeline 3D y presupuestos.
- `docs/07-UX_CONFIG.md`: todos los menús/controles con acciones reales.
- `docs/08-CRITERIOS_QA.md`: pruebas y definición de completitud.
- `docs/09-PROMPTS_PARA_SESIONES.md`: prompts listos.
- `docs/10-DATOS_SEGURIDAD_ECONOMIA.md`: cuentas, XP, tienda, recompensas.
- `docs/11-CREATIVO.md`: editor de mapas y aislamiento del sandbox.
- `docs/12-REFERENCIAS.md`: fuentes y fechas.
- `docs/13-GUIA_VISUAL.md`: guía visual de 18 paneles del proyecto y decisiones de identidad propia.
- `docs/PROGRESO.md`: estado real con evidencias. `ROADMAP.md`: fases y dependencias.
- `src/core`: dominio (reglas del kit + simulación). `tests`: unitarias y `tests/e2e`.

## Entregable al cerrar cada iteración
- Qué está **jugable** realmente y cómo se prueba.
- Archivos editados y por qué.
- Salida exacta de comandos que ejecutaste (sin inventar resultados).
- Captura o evidencia visual si hay navegador disponible; si no, decirlo.
- Deudas, errores conocidos y siguiente tarea mínima.
- Actualiza `docs/PROGRESO.md` y guarda commit descriptivo si el usuario lo autoriza.

## Normas de calidad
- TypeScript en modo strict. Nada de `any` innecesario.
- Simulación lógica a pasos fijos; separar red, simulación, render y UI.
- Backend autoritativo para daño, eliminaciones, recompensas, moneda y rangos una vez habilitado multijugador real.
- Tests con semillas fijas y sin depender de FPS.
- Interfaces documentadas; esquemas/validadores para red, guardados y contenido externo.
- Etiquetar datos de Fortnite como referencia histórica, no código de producto ni contenido licenciado.
