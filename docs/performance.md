# Rendimiento

Objetivo: Chrome en Chromebooks y portátiles escolares con GPU integrada.

- Un único bucle `requestAnimationFrame`; física a paso fijo con límite de subpasos.
- Texturas procedurales pequeñas (128 px), sin assets externos.
- Confeti, puntos de trayectoria y marcas de rebote con `InstancedMesh` (1 draw call cada uno).
- Trayectoria predictiva: incremental con presupuesto de CPU por frame (3 ms, adaptativo
  hasta 8 ms) y recálculo limitado (cambio mínimo de potencia/ángulo y 50 ms entre inicios).
  Coste total medido: 10–25 ms por predicción en el contenedor de pruebas.
- Panel de depuración (F3): FPS, frame time, draw calls, triángulos, cuerpos, colliders,
  memoria y coste de predicción.


## Gráficos por calidad (Phase 7)

| | Baja | Media | Alta | Ultra |
|---|---|---|---|---|
| Sombras | ninguna (blob + AO) | estáticas precalculadas + blob | dinámicas | dinámicas 4096 |
| Agua | simple | shader | shader | shader |
| Partículas | ×0,35 | ×0,6 | ×1 | ×1,4 |
| Nubes / montañas | no | sí | sí | sí |
| Estelas / chispas cosméticas | no | sí | sí | sí |

- Sombras estáticas: `shadowMap.autoUpdate = false` y un único cálculo tras montar el hoyo;
  los obstáculos móviles no proyectan sombra en ese modo (el mapa no se recalcula).
- AO de contacto: todas las franjas de las paredes en una sola geometría (1 draw call).
- Partículas: un único `THREE.Points` con pool fijo y shader de tamaño/alpha por partícula.
- Agua: shader analítico sin texturas ni render a textura.
- Música y sonidos sintetizados con WebAudio (sin ficheros de audio).

## Optimización y dispositivos (Phase 8)

### Draw calls
`mergeStaticMeshes` (`src/game/render/mergeStatic.ts`) fusiona al montar el hoyo todas las
mallas estáticas opacas que comparten material, flags de sombra y `renderOrder` (la
bandera, el agua y los materiales shader se excluyen). La decoración usa materiales
compartidos por color para que la fusión sea efectiva.

| Medido en un frame (hoyo 1) | Antes | Después |
|---|---|---|
| Baja | 22 | 22 |
| Alta | 62 | 36 |

### Calidad automática
`quality: 'auto'` (por defecto) llama a `recommendQuality` (`src/config/deviceProfile.ts`),
que usa la GPU (`WEBGL_debug_renderer_info`), núcleos, `deviceMemory`, puntero táctil y
ChromeOS. Reglas (parámetros de ajuste, no documentados en el análisis):

| Señal | Calidad |
|---|---|
| Renderizado por software (SwiftShader/llvmpipe) | baja |
| ≤2 núcleos o ≤2 GB | baja |
| GPU integrada Intel HD/UHD, Mali, Adreno 3xx–5xx, PowerVR, VideoCore | media |
| Chromebook / móvil / ≤4 núcleos o ≤4 GB | máximo media |
| GPU dedicada (RTX, Radeon RX, Apple M) con ≥8 núcleos | ultra |
| Resto | alta |

El panel de ajustes muestra la calidad detectada y el motivo; el jugador puede fijar una.

### Resolución dinámica
`GameEngine.adaptResolution`: mediana del frame time de los últimos 90 frames, evaluada
cada 2 s. Si supera 25 ms la escala de resolución baja ×0,85; si baja de 17 ms sube ×1,1.
Rango 0,5–1 sobre el `pixelRatio` del preset. Visible en el panel F3.

### Carga
- Rapier se importa dinámicamente: el menú aparece sin descargar ni compilar el WASM.
- El servidor sirve con gzip (caché en memoria) y `Cache-Control: immutable` en `/assets/`.

### Memoria y contexto WebGL
- Cada hoyo crea un motor nuevo; `dispose()` libera geometrías, materiales, texturas
  compartidas, el listener `webglcontextlost` y fuerza la pérdida del contexto.
- Medido (30 hoyos seguidos, Chromium + `gc()`): heap JS estable en 16–19 MB (antes crecía
  de 19 a 28 MB por motores retenidos desde el canvas desprendido); geometrías y texturas
  GPU vuelven al mismo valor por hoyo.
- Si el navegador pierde el contexto WebGL se muestra un error recuperable en vez de una
  pantalla congelada.

### Móvil, tablet y Chromebook
- Menús desplazables y compactos en alturas ≤500 px; HUD con márgenes de *safe area*.
- En táctil, botones ⟲/⟳ para girar la cámara; el tiro funciona con arrastre táctil.
- Pantalla completa desde el menú de pausa.
- Verificado con Playwright en móvil vertical/horizontal, tablet y Chromebook (sin
  desbordes ni controles fuera de pantalla).
