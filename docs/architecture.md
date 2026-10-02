# Arquitectura

```
src/
  app/           App raíz (flujo de pantallas)
  components/    Componentes React que montan el motor (GameCanvas)
  ui/            HUD, carga, error, panel debug
  config/        Configuración central: Physics, Surfaces, Camera, Input, Game, Graphics
  store/         Estado de UI (Zustand)
  utils/         Matemáticas, formato, detección WebGL
  game/
    core/        Simulation, EventBus, eventos, máquinas de estado, bucle de paso fijo
    physics/     Carga de Rapier, PhysicsWorld (colliders desde datos), grupos de colisión
    ball/        Ball: rodadura, parada, captura en copa, hazards
    shooting/    Conversión arrastre → tiro y validación (cliente + futuro servidor)
    camera/      CameraRig (seguimiento, órbita, zoom)
    courses/     Datos de cursos y builders (base del futuro editor)
    input/       InputController (Pointer Events: ratón + táctil + teclado)
    render/      SceneRenderer, CourseView, BallView, AimView, texturas procedurales
    GameEngine.ts  Orquestador: sim + render + input + bucle rAF
```

## Decisiones

**Simulación separada del render.** `Simulation` no importa Three.js ni el DOM. Avanza a
paso fijo (`PhysicsConfig.fixedTimestep`, 120 Hz), con tiempo medido en *ticks*.
Esto la hace determinista, testeable en Node y reutilizable en el servidor autoritativo.

**Three.js imperativo en lugar de React Three Fiber.** El documento de diseño prefiere R3F,
pero un juego con física a paso fijo e interpolación necesita un único bucle controlado;
con un render imperativo evitamos reconciliación de React por frame y un segundo bucle.
React gestiona sólo la interfaz (HUD/menús). Si en el futuro se quiere R3F para escenas
de menú/preview de cosméticos, puede convivir sin tocar el motor.

**Autoridad (preparado para Phase 5).**
- Servidor: resultado del tiro (simulación), estado de partida, puntuación, finalización,
  validación (`validateShot`), resultados.
- Cliente: input, UI, cámara, efectos y feedback inmediato.

**Eventos.** `EventBus<GameEvents>` tipado (`SHOT_STARTED`, `BALL_IN_HOLE`, …) conecta
simulación con HUD, y conectará audio, VFX, red y progresión sin dependencias cruzadas.

**Estados.** `StateMachine` con tabla explícita de transiciones; las transiciones inválidas
se rechazan. Jugador: `IDLE → AIMING → SHOOTING → BALL_MOVING → BALL_STOPPED → IDLE`,
`FINISHED`, `SPECTATING`, `DISCONNECTED`, `RECONNECTED`. Aplicación: `BOOT → LOADING → …`.
