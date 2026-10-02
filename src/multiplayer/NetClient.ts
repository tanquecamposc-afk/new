import { NetworkConfig } from '@/config/network';
import { ClockSync, wallNow } from './clock';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from './protocol';

export type NetStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

type Handler<T extends ServerMessage['t']> = (m: Extract<ServerMessage, { t: T }>) => void;

const TOKEN_KEY = 'minigolf-party:net-token';

/** Token de sesión por pestaña (sessionStorage): recargar la página permite reanudar la partida. */
export const sessionToken = {
  get(): string | undefined {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set(t: string | null): void {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

/**
 * Conexión WebSocket con el servidor de juego: saludo con token, reconexión
 * automática con backoff exponencial, ping periódico y sincronización de reloj.
 */
export class NetClient {
  status: NetStatus = 'idle';
  playerId: string | null = null;
  readonly clock = new ClockSync();
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<(m: ServerMessage) => void>>();
  private statusListeners = new Set<(s: NetStatus) => void>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private attempts = 0;
  private closedByUser = false;
  private name = 'Jugador';

  constructor(private readonly url: string) {}

  /** Conecta y espera al `welcome`. Rechaza si el servidor no responde. */
  connect(name: string): Promise<Extract<ServerMessage, { t: 'welcome' }>> {
    this.name = name;
    this.closedByUser = false;
    this.setStatus('connecting');
    return new Promise((resolve, reject) => {
      const off = this.on('welcome', (m) => {
        off();
        clearTimeout(timer);
        resolve(m);
      });
      const timer = setTimeout(() => {
        off();
        reject(new Error('timeout'));
        if (this.status === 'connecting') this.close();
      }, 8000);
      this.open((err) => {
        clearTimeout(timer);
        off();
        reject(err);
      });
    });
  }

  private open(onFail?: (e: Error) => void): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (e) {
      onFail?.(e as Error);
      return;
    }
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      this.sendNow({ t: 'hello', v: PROTOCOL_VERSION, name: this.name, token: sessionToken.get() });
    };
    ws.onmessage = (ev) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      if (m.t === 'welcome') {
        this.playerId = m.playerId;
        sessionToken.set(m.token);
        this.clock.seed(m.serverTime, wallNow());
        this.attempts = 0;
        this.setStatus('connected');
        this.startPing();
      } else if (m.t === 'pong') {
        this.clock.addSample(m.c, m.s, wallNow());
      }
      this.handlers.get(m.t)?.forEach((h) => h(m));
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.stopPing();
      if (!opened && this.status === 'connecting') {
        this.setStatus('closed');
        onFail?.(new Error('connect_failed'));
        return;
      }
      if (this.closedByUser || ev.code === 4000 || ev.code === 4001) {
        this.setStatus('closed');
        return;
      }
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      /* onclose gestiona el error */
    };
  }

  private scheduleReconnect(): void {
    if (this.attempts >= NetworkConfig.reconnectAttempts) {
      this.setStatus('closed');
      return;
    }
    this.setStatus('reconnecting');
    const delay = NetworkConfig.reconnectBaseDelayMs * 2 ** this.attempts++;
    setTimeout(() => {
      if (!this.closedByUser) this.open();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    const ping = () => this.send({ t: 'ping', c: wallNow() });
    ping();
    setTimeout(ping, 250);
    this.pingTimer = setInterval(ping, NetworkConfig.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  send(m: ClientMessage): boolean {
    if (this.status !== 'connected') return false;
    return this.sendNow(m);
  }

  private sendNow(m: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(m));
    return true;
  }

  on<T extends ServerMessage['t']>(type: T, h: Handler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(h as (m: ServerMessage) => void);
    return () => set!.delete(h as (m: ServerMessage) => void);
  }

  onStatus(l: (s: NetStatus) => void): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }

  private setStatus(s: NetStatus): void {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  /** Cierre voluntario: no reconecta y olvida el token (la plaza se libera). */
  close(forget = true): void {
    this.closedByUser = true;
    this.stopPing();
    if (forget) sessionToken.set(null);
    this.ws?.close(1000);
    this.ws = null;
    this.setStatus('closed');
  }

  /** Simula una caída de red (QA): cierra el socket sin marcarlo como voluntario. */
  dropForTesting(): void {
    this.ws?.close(4999);
  }
}
