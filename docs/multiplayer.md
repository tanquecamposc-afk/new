# Multijugador

Servidor Node + WebSocket (`ws`) en `server/`. Ejecuta **la misma `Simulation`** que el
cliente (TypeScript compartido). Elegido en lugar de Colyseus porque la física es
determinista: no hace falta sincronizar esquemas de estado, basta con eventos + snapshots.

```bash
npm run dev      # servidor (:2567, ws en /ws) + cliente Vite (:5173) a la vez
npm run server   # sólo el servidor
npm start        # producción: build + servidor que sirve también dist/
```

## Autoridad

| Servidor (autoritativo) | Cliente |
|---|---|
| Resultado de cada tiro (simulación) | Input, UI, cámara |
| Validación de tiros (potencia, dirección, estado, frecuencia) | Predicción inmediata del tiro propio |
| Golpes, penalizaciones, tiempo, fin de hoyo | Interpolación de bolas remotas |
| Puntuación y clasificación (`MatchController`) | Efectos y sonido |

El cliente **nunca envía posiciones**: sólo `shoot {dirección, potencia, tick}`.

## Un mundo físico por jugador

Las bolas no chocan entre sí, así que cada jugador tiene su propio mundo Rapier (en
servidor y cliente). Esto permite la **compensación de latencia** exacta: el servidor
aplica el tiro en el tick en que el jugador soltó (`Simulation.shootAtTick`, hasta
`maxRewindMs`) y re-simula hasta el presente. Los obstáculos son función pura del tick,
así que el resultado coincide con la predicción del cliente (medido: 0,0000 m).

## Tiempo, ticks y sincronización

- Simulación a 120 Hz en ambos lados. Cada hoyo tiene `t0` (hora de servidor del tick 0).
- El cliente estima el desfase de reloj con pings (tipo NTP, muestras de menor RTT) y
  calcula el tick actual del servidor; su simulación sigue ese tick.
- Cuenta atrás: el servidor fija `goTick` cuando todos han cargado el hoyo (o tras
  `holeLoadTimeoutSec`); todos empiezan exactamente en ese tick.
- Snapshots a 15 Hz con posición, rotación y estado de cada jugador.

## Interpolación, predicción y corrección

- **Bolas remotas:** buffer de snapshots, dibujadas `interpolationDelayMs` en el pasado e
  interpoladas (posición + cuaternión). Sin saltos.
- **Bola propia:** predicción local inmediata. Si al pararse difiere del servidor más de
  `correctionThreshold` durante > 0,6 s, se corrige (`Simulation.resyncPlayer`). Si el
  servidor rechaza un tiro, se deshace.

## Salas

- **Partida rápida:** se une a una sala pública abierta o crea una. Empieza sola tras
  `quickPlayLobbySec`, o antes si todos (≥ 2) están listos.
- **Sala privada:** código de 5 caracteres sin ambiguos (sin 0/O, 1/I/L), validado y
  copiable. El host elige hoyos y empieza cuando todos están listos.
- Hasta 20 jugadores. Nombres sin duplicados dentro de la sala. Migración de host.

## Reconexión

Cada sesión tiene un token (sessionStorage). Al desconectarse, el jugador conserva su
plaza `reconnectWindowSec` (su cronómetro sigue corriendo). Al volver (incluso recargando
la página) recibe sala, partida, hoyo y snapshot y continúa donde estaba. Si la ventana
expira, abandona: su hoyo queda sin completar y no juega los siguientes.

## Anti-trampas básico

Validación de todos los mensajes (`parseClientMessage`), tamaño máximo, límite de mensajes
por segundo (cierre tras abusos repetidos), versión de protocolo, potencia ≤ 1, dirección
normalizada, tiros sólo en estado válido y con intervalo mínimo, ventana de rebobinado
acotada, puntuación calculada sólo en el servidor.

## Mensajes

Ver `src/multiplayer/protocol.ts` (tipos compartidos y validadores).

## Alcance del reloj en equipos lentos (Phase 9)

El cliente simula hasta `NetworkConfig.maxStepsPerFrame` (40) pasos por frame para seguir
al servidor; antes del GO, hasta `maxCatchUpTicks` (240) para que el hoyo empiece en el
mismo tick que en el servidor. Con más retraso y la bola en reposo, salta al tick actual.
