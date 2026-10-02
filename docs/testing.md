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
| Cursos: datos válidos, reposo estable, completables por el bot de prueba | `src/game/courses/courses.test.ts` |
| Molino, barreras, agua, arena, acelerador, rampa | `src/game/obstacles/mechanics.test.ts` |
| Partida de varios hoyos y clasificación | `src/match/MatchController.test.ts` |
| Clasificación en vivo | `src/match/liveRanking.test.ts` |
| Sala local (listo, host, máximo 20, nombres) | `src/multiplayer/LocalRoom.test.ts` |
| Bots de práctica (reglas, no tiran antes del GO) | `src/game/bots/PracticeBot.test.ts` |
| Servidor: salas, partida, anti-trampas, latencia, reconexión, abandono | `server/GameServer.test.ts` |
| Protocolo, reloj e interpolación | `src/multiplayer/protocol.test.ts`, `src/multiplayer/net.test.ts` |

El bot (`src/game/testing/solver.ts`) es exclusivamente de testing: prueba un abanico de
tiros con el predictor y avanza por la guía del curso. Nunca participa en partidas.

Además, cada fase se verifica en Chromium real con Playwright (escritorio y móvil táctil):
cargar, apuntar, comprobar la predicción contra el tiro real, disparar, embocar, resumen,
ajustes y recarga. Con `VITE_ENABLE_DEBUG=true` el motor se expone en `window.__minigolf`.
