/** Hora "de pared" en ms con resolución alta (misma base en cliente y servidor). */
export const wallNow = () => performance.timeOrigin + performance.now();

/**
 * Estimación del desfase de reloj cliente→servidor a partir de pings
 * (algoritmo tipo NTP): se queda con las muestras de menor RTT, que son las
 * más fiables, y suaviza para evitar saltos.
 */
export class ClockSync {
  private samples: { rtt: number; offset: number }[] = [];
  offset = 0;
  rtt = 0;
  private synced = false;

  /** `clientSent`: hora local al enviar; `server`: hora del servidor en la respuesta; `clientRecv`: hora local al recibir. */
  addSample(clientSent: number, server: number, clientRecv: number): void {
    const rtt = Math.max(0, clientRecv - clientSent);
    const offset = server + rtt / 2 - clientRecv;
    this.samples.push({ rtt, offset });
    if (this.samples.length > 8) this.samples.shift();
    const best = [...this.samples].sort((a, b) => a.rtt - b.rtt).slice(0, 3);
    const target = best.reduce((s, x) => s + x.offset, 0) / best.length;
    this.offset = this.synced ? this.offset + (target - this.offset) * 0.3 : target;
    this.rtt = this.synced ? this.rtt * 0.7 + rtt * 0.3 : rtt;
    this.synced = true;
  }

  /** Primera aproximación con el `serverTime` del mensaje de bienvenida. */
  seed(serverTime: number, clientRecv: number): void {
    if (this.synced) return;
    this.offset = serverTime - clientRecv;
  }

  serverNow(local = wallNow()): number {
    return local + this.offset;
  }
}
