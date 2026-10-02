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

Pendiente (Phase 8): presets de calidad completos, pasar a `@dimforge/rapier3d` con el WASM
como fichero separado (el paquete compat lo incluye en base64: ~1,7 MB gzip), sombras
estáticas horneadas.

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

Pendiente para Phase 8: fusionar la decoración estática (cada árbol son varias llamadas de
dibujo; medido: ~64–91 draw calls según el hoyo) y ajustar presets por dispositivo.
