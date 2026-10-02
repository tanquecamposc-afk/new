import type { NetClient } from './NetClient';
import type { Room, RoomResult, RoomState } from './Room';

/** Sala de red: misma interfaz que LocalRoom; el estado lo dicta el servidor. */
export class NetworkRoom implements Room {
  private state: RoomState;
  private listeners = new Set<(s: RoomState) => void>();
  private off: () => void;

  constructor(
    private readonly net: NetClient,
    initial: RoomState,
  ) {
    this.state = initial;
    this.off = net.on('room', (m) => {
      this.state = m.room;
      this.listeners.forEach((l) => l(this.state));
    });
  }

  get localPlayerId(): string {
    return this.net.playerId ?? '';
  }

  getState(): RoomState {
    return this.state;
  }

  subscribe(l: (s: RoomState) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private sent(ok: boolean): RoomResult {
    return ok ? { ok: true } : { ok: false, error: 'unknown_player' };
  }

  setReady(ready: boolean): RoomResult {
    return this.sent(this.net.send({ t: 'set_ready', ready }));
  }

  setName(name: string): RoomResult {
    return this.sent(this.net.send({ t: 'set_name', name }));
  }

  setCourses(ids: string[]): RoomResult {
    if (!ids.length) return { ok: false, error: 'no_courses' };
    return this.sent(this.net.send({ t: 'set_courses', ids }));
  }

  start(): RoomResult {
    return this.sent(this.net.send({ t: 'start' }));
  }

  leave(): void {
    this.net.send({ t: 'leave_room' });
    this.off();
    this.listeners.clear();
  }
}
