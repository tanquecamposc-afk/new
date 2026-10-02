/**
 * NetworkConfig — parámetros del multijugador (valores de tuning propios).
 * Los usan cliente y servidor.
 */
export const NetworkConfig = {
  /** Frecuencia de simulación (Hz) — debe coincidir con PhysicsConfig.fixedTimestep. */
  tickRate: 120,
  /** Snapshots de estado por segundo enviados a cada cliente. */
  snapshotHz: 15,
  /** Retardo de interpolación de bolas remotas (ms): ≈ 2 snapshots. */
  interpolationDelayMs: 140,
  /** Máximo que el servidor rebobina un tiro para compensar la latencia (ms). */
  maxRewindMs: 350,
  /** Ventana de reconexión: el jugador se conserva este tiempo tras desconectarse (s). */
  reconnectWindowSec: 45,
  /** Espera máxima a que todos carguen el hoyo antes de la cuenta atrás (s). */
  holeLoadTimeoutSec: 10,
  /** Duración de la pantalla de resultados de hoyo en el servidor (s). */
  holeResultsSec: 12,
  /** Partida rápida: segundos de lobby antes de empezar automáticamente. */
  quickPlayLobbySec: 20,
  /** Mínimo de jugadores para empezar antes de tiempo si todos están listos. */
  quickPlayMinPlayers: 2,
  /** Ping para medir latencia y sincronizar el reloj (ms). */
  pingIntervalMs: 2000,
  /** Límite de mensajes por segundo y tamaño máximo por mensaje (anti-abuso). */
  maxMessagesPerSec: 40,
  maxMessageBytes: 4096,
  /** Servidor: conexiones simultáneas totales y por IP (anti-abuso). */
  maxConnections: 2000,
  maxConnectionsPerIp: 12,
  /** Servidor: sin `hello` en este tiempo se cierra la conexión (ms). */
  helloTimeoutMs: 10_000,
  /** Servidor: ping de transporte; sin respuesta en un intervalo, la conexión se da por muerta (ms). */
  heartbeatMs: 15_000,
  /** Servidor: mensajes inválidos tolerados antes de cerrar la conexión. */
  maxBadMessages: 20,
  /** Reintentos de reconexión del cliente (backoff exponencial). */
  reconnectAttempts: 6,
  reconnectBaseDelayMs: 600,
  /** Corrección: distancia (m) a partir de la cual se corrige la bola local. */
  correctionThreshold: 0.04,
  /** Cliente: pasos de simulación máximos por frame para alcanzar al servidor (40 = 1/3 s, cubre ~6 FPS). */
  maxStepsPerFrame: 40,
  /** Cliente: retraso (ticks) a partir del cual se salta al tick del servidor con la bola en reposo. */
  maxCatchUpTicks: 240,
  defaultPort: 2567,
} as const;

/** URL del servidor WebSocket: VITE_WS_URL o, por defecto, el mismo origen en /ws. */
export function resolveWsUrl(): string {
  const env = (import.meta.env?.VITE_WS_URL as string | undefined) ?? '';
  if (env) return env;
  if (typeof location === 'undefined') return `ws://localhost:${NetworkConfig.defaultPort}/ws`;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
