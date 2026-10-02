import { BALL_COLORS, MAX_PLAYERS } from '@/match/types';
import { sanitizeName, type Room, type RoomPlayer, type RoomResult, type RoomState } from './Room';

const BOT_NAMES = ['Birdie', 'Bogey', 'Eagle', 'Putter', 'Caddie', 'Albatros', 'Hierro', 'Green', 'Bunker', 'Chip'];

/**
 * Sala de práctica local (sin servidor). Permite añadir BOTS DE PRÁCTICA para
 * probar el juego (lobby, espectador, clasificación) sin multijugador; siempre
 * aparecen etiquetados como bot.
 */
export class LocalRoom implements Room {
  readonly localPlayerId = 'local';
  private state: RoomState;
  private listeners = new Set<(s: RoomState) => void>();

  constructor(playerName: string, courseIds: string[], botCount = 0) {
    this.state = {
      code: null,
      mode: 'local',
      maxPlayers: MAX_PLAYERS,
      courseIds,
      status: 'open',
      players: [
        { id: this.localPlayerId, name: sanitizeName(playerName) ?? 'Jugador', color: BALL_COLORS[0], isHost: true, isBot: false, ready: false, connection: 'local' },
      ],
    };
    this.setBotCount(botCount);
  }

  getState(): RoomState {
    return this.state;
  }

  subscribe(listener: (s: RoomState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private update(patch: Partial<RoomState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  private nextColor(): number {
    const used = new Set(this.state.players.map((p) => p.color));
    return BALL_COLORS.find((c) => !used.has(c)) ?? BALL_COLORS[this.state.players.length % BALL_COLORS.length]!;
  }

  /** Ajusta el número de bots de práctica (0..maxPlayers-1). */
  setBotCount(count: number): RoomResult {
    if (this.state.status !== 'open') return { ok: false, error: 'match_in_progress' };
    const humans = this.state.players.filter((p) => !p.isBot);
    let bots = this.state.players.filter((p) => p.isBot);
    const target = Math.max(0, Math.min(this.state.maxPlayers - humans.length, Math.floor(count)));
    if (bots.length > target) bots = bots.slice(0, target);
    const players: RoomPlayer[] = [...humans, ...bots];
    this.state = { ...this.state, players };
    while (players.length - humans.length < target) {
      const n = players.length - humans.length;
      players.push({
        id: `bot-${n + 1}`,
        name: `${BOT_NAMES[n % BOT_NAMES.length]} ${n >= BOT_NAMES.length ? n + 1 : ''}`.trim(),
        color: this.nextColor(),
        isHost: false,
        isBot: true,
        ready: true,
        connection: 'local',
      });
      this.state = { ...this.state, players: [...players] };
    }
    this.update({ players: [...players] });
    return { ok: true };
  }

  setReady(ready: boolean): RoomResult {
    return this.patchPlayer(this.localPlayerId, { ready });
  }

  setName(name: string): RoomResult {
    const clean = sanitizeName(name);
    if (!clean) return { ok: false, error: 'invalid_name' };
    return this.patchPlayer(this.localPlayerId, { name: clean });
  }

  setCourses(courseIds: string[]): RoomResult {
    if (!courseIds.length) return { ok: false, error: 'no_courses' };
    if (this.state.status !== 'open') return { ok: false, error: 'match_in_progress' };
    this.update({ courseIds: [...courseIds] });
    return { ok: true };
  }

  start(): RoomResult {
    if (this.state.status !== 'open') return { ok: false, error: 'match_in_progress' };
    if (!this.state.players.every((p) => p.ready)) return { ok: false, error: 'not_all_ready' };
    if (!this.state.courseIds.length) return { ok: false, error: 'no_courses' };
    this.update({ status: 'in_match' });
    return { ok: true };
  }

  /** Tras la partida, la sala vuelve a estar abierta (jugar otra vez). */
  reopen(): void {
    this.update({ status: 'open', players: this.state.players.map((p) => (p.isBot ? p : { ...p, ready: false })) });
  }

  leave(): void {
    this.listeners.clear();
  }

  private patchPlayer(id: string, patch: Partial<RoomPlayer>): RoomResult {
    if (!this.state.players.some((p) => p.id === id)) return { ok: false, error: 'unknown_player' };
    this.update({ players: this.state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    return { ok: true };
  }
}
