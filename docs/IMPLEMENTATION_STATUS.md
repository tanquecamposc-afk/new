# Estado de implementación

> Fuente principal de verdad: *Análisis Técnico, Mecánico y Estructural de Golfparty.io*.
> Todos los valores numéricos (velocidades, fricciones, tamaños, puntuación) son
> **parámetros de tuning propios**, no valores oficiales del juego de referencia.

## 1. Estado inicial del repositorio (auditoría)

| Punto | Resultado |
|---|---|
| Stack | Un único `index.html` con un tower defense (*NEXO*) en Canvas 2D + JS puro |
| package.json / scripts | No existían |
| Entry points | `index.html` |
| Three.js / física / backend | No existían |
| Código reutilizable | Ninguno aplicable a un juego 3D de minigolf |
| Errores | Ninguno relevante (juego autocontenido) |

**Decisión:** el tower defense se conserva intacto en `public/legacy/nexo-tower-defense.html`
(accesible en `/legacy/nexo-tower-defense.html`). Motivo técnico del traslado: Vite necesita
`index.html` como entrada de la nueva aplicación.

## 2. Arquitectura propuesta

Ver [architecture.md](./architecture.md). Resumen:

- **React + TypeScript + Vite + Tailwind** para la interfaz.
- **Three.js imperativo** para el render (un solo bucle `requestAnimationFrame`).
- **Rapier (WASM)** para la física, a paso fijo de 120 Hz.
- **Simulación sin dependencias de DOM/Three** (`src/game/core/Simulation.ts`): la misma
  lógica correrá en el servidor autoritativo (Phase 5) y ya corre en los tests de Node.
- **Zustand** para el estado de UI; **EventBus tipado** para desacoplar sistemas.

## 3. Sistemas

| Sistema | Estado |
|---|---|
| Proyecto Vite/React/TS/Tailwind, scripts `dev/build/preview/test` | ✅ Phase 1 |
| Configuración central (`src/config/*`) | ✅ Phase 1 |
| Escena 3D, cielo, niebla, luz hemisférica + sol con sombras | ✅ Phase 1 |
| Cursos definidos por datos (bloques: suelos, paredes, rampas, límites) | ✅ Phase 1 (1 curso) |
| Física Rapier: gravedad, fricción, restitución, colisiones, CCD | ✅ Phase 1 |
| Bola: impulso real, rodadura, resistencia por superficie, parada | ✅ Phase 1 |
| Hoyo: captura física (velocidad máxima de captura), caída, registro | ✅ Phase 1 |
| Fuera de límites: detección, penalización, devolución | ✅ Phase 1 |
| Reset manual de bola (R / botón) | ✅ Phase 1 |
| Máquinas de estado: jugador y aplicación | ✅ Phase 1 |
| Input ratón + táctil: arrastrar → apuntar → soltar | ✅ Phase 1 |
| Indicador de dirección/potencia (blanco → rojo) | ✅ Phase 1 (básico) |
| Cámara de seguimiento: suavizado, rotación, zoom, modo vertical | ✅ Phase 1 (básica) |
| Registro de tiros (posición, dirección, potencia, resultado) y temporizador | ✅ Phase 1 |
| HUD básico, carga, errores (WebGL no disponible), panel debug (F3) | ✅ Phase 1 |
| Trayectoria predictiva (misma física, rebotes, punto de llegada, incremental) | ✅ Phase 2 |
| Puntuación configurable (`calculateScore`) + ranking (`compareResults`) | ✅ Phase 2 |
| Límite de tiempo por hoyo, aviso en HUD, fin sin completar | ✅ Phase 2 |
| Estadísticas por tiro (distancia, rebotes, velocidad máx., duración) | ✅ Phase 2 |
| Efecto de hoyo (onda + confeti) y sonido (golpe, rebote, hoyo, hazard) | ✅ Phase 2 |
| Cámara: límites del curso, vista general (V), foco adelantado al apuntar, órbita al terminar | ✅ Phase 2 |
| Ajustes persistentes (sensibilidad, trayectoria, volúmenes, invertir eje) | ✅ Phase 2 |
| PersistenceService (versionado, validación, recuperación de datos corruptos) | ✅ Phase 2 |
| Resumen del hoyo con desglose de puntuación y tabla de tiros | ✅ Phase 2 |
| 6 cursos de prueba definidos por datos + validador (`validateCourse`) | ✅ Phase 3 |
| Superficies: green, arena, agua (hazard), acelerador, bumper | ✅ Phase 3 |
| Rampas en cualquier dirección y pendientes (la bola vuelve si no sube) | ✅ Phase 3 |
| Obstáculos dinámicos deterministas: molino, barreras móviles, spinner; bumpers | ✅ Phase 3 |
| Bola empujada por un obstáculo estando parada (sin consumir tiro) | ✅ Phase 3 |
| Predicción con obstáculos en movimiento (según el tick actual) | ✅ Phase 3 |
| Selector de hoyo y "Siguiente hoyo" (práctica local) | ✅ Phase 3 |
| Bot de prueba (sólo tests) que completa los 6 cursos con física real | ✅ Phase 3 |
| Máquina de estados de la app con transiciones validadas (BOOT → … → RESULTS) | ✅ Phase 4 |
| Menú principal, ayuda, ajustes (incl. calidad gráfica y nombre) | ✅ Phase 4 |
| Sala (`Room`) + `LocalRoom`: jugadores, host, listo, conexión, hasta 20, hoyos | ✅ Phase 4 |
| Partida de varios hoyos (`MatchController`): resultados idempotentes y clasificación | ✅ Phase 4 |
| Cuenta atrás 3-2-1-GO (animación + sonido); nadie tira ni corre el tiempo antes | ✅ Phase 4 |
| HUD: posición, clasificación en vivo, jugadores en juego, pausa/menú | ✅ Phase 4 |
| Modo espectador (cambiar jugador, nombre, golpes, posición, vista general) | ✅ Phase 4 |
| Resultados por hoyo (auto-avance) y resultados finales con podio | ✅ Phase 4 |
| Bots de práctica (sólo modo local, etiquetados) con la misma física y reglas | ✅ Phase 4 |
| Servidor autoritativo (Node + WebSocket) con la misma simulación | ✅ Phase 5 |
| Partida rápida (matchmaking) y salas privadas con código | ✅ Phase 5 |
| Sincronización: reloj, ticks, snapshots, cuenta atrás común | ✅ Phase 5 |
| Interpolación de bolas remotas, predicción y corrección de la propia | ✅ Phase 5 |
| Compensación de latencia (un mundo físico por jugador) | ✅ Phase 5 |
| Reconexión (también recargando la página) y abandono | ✅ Phase 5 |
| Anti-trampas básico y límite de mensajes | ✅ Phase 5 |
| Perfil (nombre, nivel, XP, monedas, estadísticas, historial) | ✅ Phase 6 |
| XP, niveles y recompensas por partida (idempotentes) + pantalla de recompensas | ✅ Phase 6 |
| CurrencyService y tienda con transacciones idempotentes | ✅ Phase 6 |
| Inventario y cosméticos (bolas, colores, estelas, efectos) visibles en juego y online | ✅ Phase 6 |
| Cielo con shader (degradado + sol), nubes y montañas lejanas | ✅ Phase 7 |
| Iluminación: hemisférica + sol + relleno; sombras dinámicas / estáticas precalculadas / ninguna según calidad | ✅ Phase 7 |
| AO de contacto horneado junto a las paredes y sombras blob bajo las bolas | ✅ Phase 7 |
| Agua con shader (ondas, fresnel, brillo del sol, espuma) | ✅ Phase 7 |
| Partículas (1 draw call): polvo, impactos, salpicadura, arena, nube, acelerador, fuegos | ✅ Phase 7 |
| Música generativa y efectos nuevos (agua, arena, madera, acelerador, UI, victoria, nivel, compra) | ✅ Phase 7 |
| Fusión de mallas estáticas (draw calls en alta 62 → 36) | ✅ Phase 8 |
| Calidad automática por dispositivo (GPU, núcleos, memoria, Chromebook, móvil) | ✅ Phase 8 |
| Resolución dinámica según el frame time | ✅ Phase 8 |
| Rapier cargado bajo demanda; gzip y caché inmutable en el servidor | ✅ Phase 8 |
| Pérdida de contexto WebGL controlada; sin fugas de memoria entre hoyos | ✅ Phase 8 |
| UI responsive (móvil vertical/horizontal, tablet, Chromebook), giro de cámara táctil, pantalla completa | ✅ Phase 8 |
| Servidor endurecido: CSP y cabeceras, límites de conexión, latido, timeout de `hello`, aislamiento de salas | ✅ Phase 9 |
| Lint (oxlint), `npm run check`, tests de seguridad y casos límite | ✅ Phase 9 |
| Documentación de seguridad y despliegue; build de producción verificado | ✅ Phase 9 |

## 4. Errores encontrados y corregidos (Phase 1)

- `FixedStepAccumulator` perdía un paso por error de coma flotante al restar `dt`
  (detectado por test). Corregido con épsilon.
- `PCFSoftShadowMap` ya no existe en Three r186 → `PCFShadowMap`.
- TypeScript 7 eliminó `baseUrl` → alias `@/*` con ruta relativa.

## 4b. Errores encontrados y corregidos (Phase 2)

- **No determinismo del primer paso de Rapier:** el primer `world.step()` de un mundo nuevo
  daba resultados distintos a los siguientes (hasta 1 m de diferencia tras un rebote).
  Solución: paso de calentamiento en `PhysicsWorld.buildCourse`. Test de regresión añadido.
- **Caché de contactos en el predictor:** se recrea la bola en cada predicción.
- **Predicción demasiado cara para un frame** (10–25 ms medidos): ahora es incremental con
  presupuesto por frame (3 ms, adaptativo hasta 8 ms) y se dibuja progresivamente.
- **Línea de trayectoria desfasada** con frames lentos (una predicción nueva reiniciaba la
  anterior antes de terminar): resuelto con el dibujo progresivo y el presupuesto adaptativo.

## 5. Fases

### Phase 1 — Foundation + Three.js + React + escena + física + bola ✅
Implementado y verificado (ver arriba). Pruebas: 33 tests unitarios/integración +
prueba E2E en Chromium (escritorio 1280×720 y móvil táctil 390×844): cargar, apuntar,
disparar, rodar, detenerse, embocar en 3 golpes, pantalla de hoyo.

### Phase 2 — Disparo + apuntado + trayectoria + cámara + hoyo + tiempo + tiros ✅
Implementado y verificado: 61 tests + E2E en Chromium (predicción = tiro real con error
0,000 m, vista general, ajustes guardados y recuperados tras recargar, hoyo con confeti,
resumen con puntuación, tiro táctil en móvil).

### Phase 3 — Cursos + superficies + hazards + paredes + rampas + obstáculos dinámicos ✅
Seis cursos (Primer Green, Carambola, Las Colinas, El Molino, Hora Punta, El Lago).
Obstáculos como cuerpos cinemáticos cuya pose es función pura del tiempo de simulación
(`obstaclePose`), compartida por física, render y predictor. Verificado: 88 tests (incluye
un bot de prueba que completa los 6 hoyos) + E2E en Chromium recorriendo los 6 hoyos.

### Phase 4 — Bucle de juego + lobby + menús + HUD + resultados + espectador ✅
Flujo completo verificado en Chromium: menú → sala con 3 bots → cuenta atrás → hoyo 1 →
espectador → resultados del hoyo → hoyo 2 → resultados finales → jugar otra vez → menú.
Pausa (sólo local) congela la simulación. 103 tests.


### Phase 5 — Multijugador real ✅
Ver [multiplayer.md](./multiplayer.md). Verificado con el servidor real y dos navegadores:
sala privada con código, selección de hoyos del host, cuenta atrás común, cada uno ve la
bola del otro, predicción = servidor (0,0000 m), recarga de página en mitad del hoyo con
reanudación, resultados idénticos en ambos, jugar otra vez; partida rápida con inicio
anticipado y abandono desde el menú. 15 tests de servidor + tests de protocolo/red.
### Phase 6 — Perfil + progresión + moneda + tienda + inventario + cosméticos ✅
Ver [cosmetics.md](./cosmetics.md). Verificado en Chromium: comprar (doble clic cobra una vez),
equipar, la bola equipada en partida, recompensas tras una partida, perfil e historial
persistentes tras recargar. 137 tests.
### Phase 7 — Pulido gráfico + agua + VFX + partículas + audio ✅
Verificado en Chromium con calidad alta, media y baja (Lago y Molino), sin errores ni avisos.
Todo el audio y las texturas se generan en tiempo real: cero descargas adicionales.
### Phase 8 — Optimización + móvil + tablet + Chromebook + ajustes gráficos ✅
Ver [performance.md](./performance.md). Verificado en Chromium: 30 hoyos seguidos con heap
estable (16–19 MB) y recursos GPU constantes; menús, sala y HUD sin desbordes en cuatro
dispositivos; tiro táctil. 141 tests.

Errores corregidos: los motores de cada hoyo quedaban retenidos por el listener
`webglcontextlost` del canvas desprendido (fuga ~0,3 MB/hoyo); `forceContextLoss()` en
`dispose` disparaba la pantalla de error de contexto perdido; la fusión de mallas no
reducía nada porque cada adorno tenía su propio material.

Decisión: Rapier sigue con el paquete `-compat` (WASM en base64, ~1,7 MB gzip) pero se
carga bajo demanda tras el menú, así que no retrasa la primera pantalla. Migrar al paquete
con WASM separado requiere un plugin de Vite adicional y no mejora el tiempo de juego.
### Phase 9 — QA + bugs + seguridad + casos límite + documentación + build de producción ✅
Ver [security.md](./security.md), [deployment.md](./deployment.md) y [testing.md](./testing.md).
QA final contra `npm start` (build de producción, CSP activa): flujo local completo,
multijugador con dos navegadores, tienda/perfil, gráficos, 4 pantallas y casos límite.
162 tests.

Errores corregidos:
- **Primer tiro ignorado online en equipos lentos:** la simulación local avanzaba como
  máximo 16 pasos por frame; con pocos FPS se quedaba por detrás del servidor y, al llegar
  el GO, la interfaz permitía apuntar pero el hoyo local aún no había empezado, así que el
  arrastre se perdía sin aviso (2 de 3 partidas en la prueba con dos navegadores). Ahora
  antes del GO se alcanza al servidor paso a paso (determinista: 0,0000 m de diferencia),
  después hasta 40 pasos por frame, y no se puede apuntar hasta que el hoyo ha empezado.
  Verificado 5/5.
- **"No se pudo conectar" al jugar online con `npm run dev`:** el script sólo arrancaba la
  página, no el servidor de juego. Ahora `npm run dev` arranca ambos, `npm run preview`
  usa el servidor real, y si aun así no hay servidor, el error explica el motivo y ofrece
  *Jugar práctica local* con un botón.
- **"La tarjeta gráfica ha reiniciado el juego" en desarrollo:** con el doble montaje de
  React (StrictMode) el motor descartado liberaba el contexto WebGL del mismo `<canvas>`
  que usaba el motor activo. Ahora cada montaje crea su propio canvas.
- **Online en desarrollo, bola congelada:** el motor descartado borraba los manejadores de
  red del motor activo al desecharse. Ahora sólo el motor que arranca (`start()`) se
  conecta a la red y cada uno sólo puede desconectar los suyos.
- **Caída del servidor** con una URL mal codificada (`/%E0%A4%A`): `decodeURIComponent`
  lanzaba fuera de cualquier `try` → 400.
- **Path traversal por prefijo:** `startsWith(dist)` aceptaba carpetas hermanas como
  `dist-otro/` → el prefijo incluye el separador.
- **Pantalla en blanco tras recompilar** con el servidor en marcha: el gzip de
  `index.html` se cacheaba para siempre → la caché se invalida por mtime y tamaño.
- **Motor expuesto en producción** (`window.__minigolf`, permitía alterar la partida local
  desde la consola) → sólo en desarrollo o con `VITE_EXPOSE_ENGINE=true`.
- **Conexiones fantasma:** un socket medio abierto (móvil sin cobertura) seguía contando
  como conectado y podía bloquear el lobby → latido de transporte cada 15 s.
- Conexiones sin `hello` o enviando basura ocupaban plaza indefinidamente → cierre.
- Una excepción en una sala detenía el bucle de todas → se cierra sólo esa sala.
- El reset manual movía la bola de un jugador que ya había terminado → rechazado.
- Un asset con hash inexistente devolvía `index.html` como JavaScript → 404.
- `Lobby`: `setState` dentro de un efecto (render en cascada) → ajuste durante el render.

## 6. Resultado final

| | |
|---|---|
| Modos | Partida rápida online, sala privada con código, práctica local con bots opcionales |
| Jugadores | Hasta 20 por sala, todos a la vez en el mismo hoyo |
| Hoyos | 6 cursos (rampas, agua, arena, aceleradores, bumpers, molino, barreras, spinner) |
| Física | Rapier a 120 Hz, determinista, la misma en cliente, servidor y tests |
| Online | Servidor autoritativo, compensación de latencia, reconexión, interpolación |
| Progresión | Perfil, XP, niveles, monedas, tienda, inventario, cosméticos visuales |
| Gráficos | 4 calidades + automática, sombras, agua, partículas, resolución dinámica |
| Audio | Música y efectos sintetizados (sin ficheros) |
| Dispositivos | Escritorio, Chromebook, tablet y móvil (táctil) |
| Calidad | 162 tests, typecheck estricto, lint, 0 vulnerabilidades en dependencias |

Limitaciones conocidas: sin cuentas de usuario (el perfil vive en el navegador y el
servidor no verifica la propiedad de cosméticos); las salas viven en memoria de un único
proceso; el rendimiento real en GPU se midió sólo con renderizado por software.
