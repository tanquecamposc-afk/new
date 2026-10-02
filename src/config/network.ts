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
  /** Reintentos de reconexión del cliente (backoff exponencial). */
  reconnectAttempts: 6,
  reconnectBaseDelayMs: 600,
  /** Corrección: distancia (m) a partir de la cual se corrige la bola local. */
  correctionThreshold: 0.04,
  defaultPort: 2567,
} as const;

/** URL del servidor WebSocket: VITE_WS_URL o, por defecto, el mismo origen en /ws. */
export function resolveWsUrl(): string {
  const env = (import.meta.env?.VITE_WS_URL as string | undefined) ?? '';
  if (env) return env;
  if (typeof location === 'undefined') return `ws://localhost:${NetworkConfig.defaultPort}/ws`;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
