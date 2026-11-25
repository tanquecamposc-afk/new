# Arquitectura de red

```
 Cliente (Godot)                                 Servidor dedicado (Godot --headless)
 ─────────────────                               ───────────────────────────────────
 PlayerInput → CarControls                       ServerHost (ENet, UDP 7777, 120 Hz)
 Net.client_tick()                                 └ RoomManager (sesiones, salas, cola)
   ├ ClientPrediction.step()  (predice YA)             └ MatchRoom (lobby / partida)
   └ s_input(últimas 4 entradas) ── canal 1 ──►           ├ InputBuffer por jugador
                                                          ├ SimWorld + MatchRules (autoridad)
 Net._dispatch("snapshot")  ◄── canal 1 ── c_snapshot (60 Hz, estado completo)
   └ ClientPrediction.on_snapshot():                     
       rebobina al tick T, re-simula T→ahora,       eventos fiables (goles, demoliciones,
       suaviza la corrección visual               ◄── canal 0 ── fin, prórroga, lobby, chat)
```

## Principios
- **Servidor autoritativo.** Posiciones, velocidades, balón, colisiones, turbo,
  pads, saltos/esquives, demoliciones, goles, reloj, prórroga y resultados se
  calculan solo en el servidor. Los clientes envían **solo entradas**.
- **Misma simulación en ambos lados** (`scripts/physics/`), pero **no** se asume
  que dé resultados idénticos en máquinas distintas: el snapshot siempre manda.
- **Un único punto RPC** (`NetEndpoint`), con el mismo script en cliente y servidor
  bajo la ruta relativa `Endpoint`. Cada nodo raíz tiene su propio
  `SceneMultiplayer`, así servidor y cliente conviven en un proceso (LAN/host).

## Canales ENet
| Canal | Modo | Contenido |
|---|---|---|
| 0 | fiable | hello/welcome, salas, equipos, listo, inicio, eventos de partida, chat, cola |
| 1 | no fiable ordenado | entradas del cliente, snapshots del servidor |
| 2 | no fiable | ping/pong |

## Formato
- **Entrada:** `u32 tick_más_reciente, u8 n, n × (5 ejes int8 + 1 byte de banderas)`.
  Se reenvían las 4 últimas → una pérdida aislada no pierde entradas. 29 bytes.
- **Snapshot:** tick, ack, estado del partido (fase, reloj, prórroga, marcador,
  congelados), balón (pos, vel, giro, homing), temporizadores de los 36 pads y por
  coche el estado completo necesario para re-simular (pos, rotación, velocidades,
  turbo, banderas y temporizadores de salto/esquive/flip reset, últimos controles).
  ≈ 315 bytes con 2 coches; los snapshots viejos (tick ≤ último) se descartan.

## Sincronización de ticks
El cliente simula por delante del servidor `RTT + 2·jitter + 3 ticks` respecto
al último snapshot, para que su entrada del tick *t* llegue antes de que el
servidor simule *t*. Ajusta suavemente (±1 paso por frame) y salta si la
diferencia supera 30 ticks. Medido: con 100 ms simulados en proceso, 23 entradas
tardías de 600, todas en el arranque, antes del primer snapshot.

## Predicción y reconciliación
1. Cada tick: aplica la entrada local, guarda `history[tick]`, simula el mundo.
2. Al recibir el snapshot T: guarda las posiciones dibujadas, aplica T a todo el
   mundo (coches remotos con sus últimos controles), re-simula T+1…ahora con las
   entradas guardadas (máx. 45 ticks) y convierte la diferencia en un
   desplazamiento visual que decae (≈70 ms). La colisión usa siempre el estado
   simulado, nunca el suavizado.
3. Los rivales se **extrapolan** con sus últimos controles (coherente con la
   predicción del balón). Los **espectadores** usan un búfer de interpolación
   con 8 ticks de retraso.

## Seguridad (lado servidor)
- Tipos y número de argumentos validados por método antes de procesar nada.
- Hay que saludar (`hello`) antes de cualquier otro mensaje; la versión del protocolo debe coincidir.
- Límites: 260 entradas/s, 40 mensajes fiables/s y 4 mensajes de chat cada 5 s por jugador.
  Nombres de hasta 16 caracteres sin controles, chat de 120 y contraseñas de 64.
- Entradas decodificadas con comprobación de tamaño y rango (ejes acotados a ±1); paquetes malformados contados y descartados.
- Permisos: solo el anfitrión cambia la configuración o inicia; el servidor recalcula el anfitrión al irse.
- Contraseñas de sala guardadas como SHA-256 con sal; el token de reconexión nunca se difunde.
- `allow_object_decoding = false`; los métodos de cliente solo aceptan llamadas del servidor (peer 1).
- Comandos de depuración solo con `--allow-debug` (pruebas).
- Límites conocidos: sin TLS en la capa de juego (ENet/UDP); sin cuentas persistentes;
  ningún sistema antitrampas es infalible.
