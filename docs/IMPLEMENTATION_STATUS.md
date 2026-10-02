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
| Menús, lobby, cuenta atrás, resultados, espectador | ⏳ Phase 4 |
| Multijugador real (servidor autoritativo, salas, reconexión, anti-cheat) | ⏳ Phase 5 |
| Perfil, progresión, moneda, tienda, inventario, cosméticos | ⏳ Phase 6 |
| Agua con shader, VFX, partículas, audio | ⏳ Phase 7 |
| Presets de calidad completos, optimización Chromebook | ⏳ Phase 8 |
| QA, seguridad, documentación completa, build de producción | ⏳ Phase 9 |

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

### Phase 4 — Bucle de juego + lobby + menús + HUD + resultados + espectador
### Phase 5 — Multijugador real (WebSocket/Colyseus, servidor autoritativo con la misma `Simulation`)
### Phase 6 — Perfil + progresión + moneda + tienda + inventario + cosméticos
### Phase 7 — Pulido gráfico + agua + VFX + partículas + audio
### Phase 8 — Optimización + móvil + tablet + Chromebook + ajustes gráficos
Incluye migrar a `@dimforge/rapier3d` (WASM como fichero aparte, no base64) para reducir
el bundle (~1,7 MB gzip actualmente).
### Phase 9 — QA + bugs + seguridad + casos límite + documentación + build de producción
