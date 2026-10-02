# Tests

`npm test` (Vitest, entorno Node; Rapier funciona igual que en el navegador).

| Área | Fichero |
|---|---|
| Física de la bola, hoyo, hazards, estadísticas, límite de tiempo | `src/game/core/Simulation.test.ts` |
| Máquinas de estado y bucle de paso fijo | `src/game/core/StateMachine.test.ts` |
| Arrastre → tiro, validación anti-trampas | `src/game/shooting/shot.test.ts` |
| Trayectoria predictiva y determinismo | `src/game/shooting/TrajectoryPredictor.test.ts` |
| Puntuación y clasificación | `src/game/scoring/score.test.ts` |
| Cámara | `src/game/camera/CameraRig.test.ts` |
| Persistencia y validación de ajustes | `src/persistence/PersistenceService.test.ts` |

Además, cada fase se verifica en Chromium real con Playwright (escritorio y móvil táctil):
cargar, apuntar, comprobar la predicción contra el tiro real, disparar, embocar, resumen,
ajustes y recarga. Con `VITE_ENABLE_DEBUG=true` el motor se expone en `window.__minigolf`.
