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
