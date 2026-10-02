import { randomBytes, randomInt } from 'node:crypto';
import { NetworkConfig } from '@/config/network';
import { MAX_PLAYERS } from '@/match/types';
import { normalizeRoomCode, parseClientMessage, PROTOCOL_VERSION, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_CODE_RE, type ServerMessage } from '@/multiplayer/protocol';
import { sanitizeName } from '@/multiplayer/Room';
import { ServerRoom, type MemberLink } from './ServerRoom';

/** Mínimo que el servidor necesita de un socket (ws real o doble de test). */
export interface SocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

const OPEN = 1;

interface Session extends MemberLink {
  token: string;
  socket: SocketLike | null;
  roomId: string | null;
  msgWindowStart: number;
  msgCount: number;
  strikes: number;
  lastSeen: number;
}

export interface GameServerOptions {
  now?: () => number;
  log?: (...args: unknown[]) => void;
}

/**
 * Servidor de juego: sesiones (con token para reconectar), matchmaking de
 * partida rápida, salas privadas con código y enrutado de mensajes a la sala.
 * No usa temporizadores propios: el bucle llama a update() (tests: reloj manual).
 */
export class GameServer {
  private sessions = new Map<string, Session>();
  private byToken = new Map<string, Session>();
  private rooms = new Map<string, ServerRoom>();
  private codes = new Map<string, ServerRoom>();
  private readonly now: () => number;
  private readonly log: (...args: unknown[]) => void;
  private seq = 0;

  constructor(opts: GameServerOptions = {}) {
    this.now = opts.now ?? (() => performance.timeOrigin + performance.now());
    this.log = opts.log ?? (() => {});
  }

  /** Nueva conexión. Devuelve los manejadores que el transporte debe llamar. */
  connect(socket: SocketLike): { onMessage: (raw: string) => void; onClose: () => void } {
    let session: Session | null = null;
    const sendRaw = (m: ServerMessage) => socket.readyState === OPEN && socket.send(JSON.stringify(m));

    const onMessage = (raw: string) => {
      if (raw.length > NetworkConfig.maxMessageBytes) return;
      const msg = parseClientMessage(raw);
      if (!msg) {
        sendRaw({ t: 'error', code: 'bad_message', message: 'Mensaje no válido.' });
        return;
      }
      if (!session) {
        if (msg.t !== 'hello') return;
        if (msg.v !== PROTOCOL_VERSION) {
          sendRaw({ t: 'error', code: 'version', message: 'Versión del juego desactualizada: recarga la página.' });
          socket.close(4000, 'version');
          return;
        }
        session = this.hello(socket, msg.name, msg.token);
        return;
      }
      if (!this.rateOk(session)) return;
      session.lastSeen = this.now();
      this.route(session, msg);
    };

    const onClose = () => {
      if (!session || session.socket !== socket) return;
      session.socket = null;
      const room = session.roomId ? this.rooms.get(session.roomId) : undefined;
      room?.onDisconnect(session.id);
      if (room && !room.hasMember(session.id)) session.roomId = null;
      if (!session.roomId) this.forget(session);
    };
    return { onMessage, onClose };
  }

  private hello(socket: SocketLike, rawName: string, token?: string): Session {
    const existing = token ? this.byToken.get(token) : undefined;
    if (existing) {
      // Reconexión: el socket anterior (si sigue abierto) se cierra.
      if (existing.socket && existing.socket !== socket) existing.socket.close(4001, 'replaced');
      existing.socket = socket;
      existing.lastSeen = this.now();
      const room = existing.roomId ? this.rooms.get(existing.roomId) : undefined;
      const resumed = !!room?.hasMember(existing.id);
      existing.send({ t: 'welcome', playerId: existing.id, token: existing.token, serverTime: this.now(), resumed });
      if (resumed) room!.onReconnect(existing);
      else existing.roomId = null;
      this.log(`[server] reconexión ${existing.id} (sala: ${resumed ? room!.id : '—'})`);
      return existing;
    }
    const id = `p${++this.seq}-${randomBytes(3).toString('hex')}`;
    const s: Session = {
      id,
      name: sanitizeName(rawName) ?? `Jugador ${this.seq}`,
      token: randomBytes(18).toString('base64url'),
      socket,
      roomId: null,
      msgWindowStart: this.now(),
      msgCount: 0,
      strikes: 0,
      lastSeen: this.now(),
      get connected() {
        return !!this.socket && this.socket.readyState === OPEN;
      },
      send(m: ServerMessage) {
        if (this.socket && this.socket.readyState === OPEN) this.socket.send(JSON.stringify(m));
      },
    };
    this.sessions.set(id, s);
    this.byToken.set(s.token, s);
    s.send({ t: 'welcome', playerId: id, token: s.token, serverTime: this.now(), resumed: false });
    return s;
  }

  /** Límite de mensajes por segundo; los abusos repetidos cierran la conexión. */
  private rateOk(s: Session): boolean {
    const now = this.now();
    if (now - s.msgWindowStart >= 1000) {
      s.msgWindowStart = now;
      s.msgCount = 0;
    }
    if (++s.msgCount <= NetworkConfig.maxMessagesPerSec) return true;
    if (s.msgCount === NetworkConfig.maxMessagesPerSec + 1) {
      s.strikes++;
      s.send({ t: 'error', code: 'rate_limited', message: 'Demasiados mensajes.' });
      if (s.strikes >= 3) s.socket?.close(4002, 'rate_limited');
    }
    return false;
  }

  private route(s: Session, msg: NonNullable<ReturnType<typeof parseClientMessage>>): void {
    const room = s.roomId ? this.rooms.get(s.roomId) : undefined;
    const err = (code: string, message: string) => s.send({ t: 'error', code, message });
    switch (msg.t) {
      case 'ping':
        s.send({ t: 'pong', c: msg.c, s: this.now() });
        return;
      case 'quick_play': {
        if (room) return err('already_in_room', 'Ya estás en una sala.');
        const target = [...this.rooms.values()].find((r) => r.mode === 'quick' && r.joinable) ?? this.createRoom('quick');
        this.enter(s, target);
        return;
      }
      case 'create_room':
        if (room) return err('already_in_room', 'Ya estás en una sala.');
        this.enter(s, this.createRoom('private'));
        return;
      case 'join_room': {
        if (room) return err('already_in_room', 'Ya estás en una sala.');
        const code = normalizeRoomCode(msg.code);
        if (!ROOM_CODE_RE.test(code)) return err('invalid_code', 'El código no es válido.');
        const target = this.codes.get(code);
        if (!target) return err('room_not_found', 'No existe ninguna sala con ese código.');
        if (target.size >= MAX_PLAYERS) return err('room_full', 'La sala está llena.');
        if (!target.joinable) return err('match_in_progress', 'La partida de esa sala ya ha empezado.');
        this.enter(s, target);
        return;
      }
      case 'leave_room':
        if (room) {
          room.leave(s.id);
          s.roomId = null;
          s.send({ t: 'left_room' });
        }
        return;
      case 'set_name': {
        const name = sanitizeName(msg.name);
        if (!name) return err('invalid_name', 'El nombre debe tener entre 2 y 16 caracteres.');
        s.name = name;
        room?.setName(s.id, name);
        return;
      }
      case 'set_ready':
        room?.setReady(s.id, msg.ready);
        return;
      case 'set_courses': {
        const e = room?.setCourses(s.id, msg.ids);
        if (e) err(e, e === 'not_host' ? 'Sólo el host puede elegir los hoyos.' : 'Selección de hoyos no válida.');
        return;
      }
      case 'start': {
        const e = room?.requestStart(s.id);
        if (e) err(e, e === 'not_host' ? 'Sólo el host puede empezar.' : e === 'not_all_ready' ? 'Todos deben estar listos.' : 'No se puede empezar ahora.');
        return;
      }
      case 'hole_ready':
        room?.onHoleReady(s.id, msg.hole);
        return;
      case 'next_ready':
        room?.onNextReady(s.id);
        return;
      case 'shoot':
        room?.onShoot(s.id, msg, (m) => s.send(m));
        return;
      case 'reset_ball':
        room?.onResetBall(s.id);
        return;
      case 'hello':
        return;
    }
  }

  private enter(s: Session, room: ServerRoom): void {
    const r = room.join(s);
    if (!r.ok) {
      s.send({ t: 'error', code: r.code, message: r.code === 'room_full' ? 'La sala está llena.' : 'No se puede entrar en la sala.' });
      return;
    }
    s.roomId = room.id;
  }

  private createRoom(mode: 'quick' | 'private'): ServerRoom {
    const id = `r${++this.seq}`;
    let code: string | null = null;
    if (mode === 'private') {
      do {
        code = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('');
      } while (this.codes.has(code));
    }
    const room = new ServerRoom(id, mode, code, this.now, (r) => this.removeRoom(r));
    this.rooms.set(id, room);
    if (code) this.codes.set(code, room);
    this.log(`[server] sala ${id} (${mode}${code ? ` ${code}` : ''})`);
    return room;
  }

  private removeRoom(room: ServerRoom): void {
    this.rooms.delete(room.id);
    if (room.code) this.codes.delete(room.code);
    for (const s of this.sessions.values()) {
      if (s.roomId === room.id) {
        s.roomId = null;
        if (!s.socket) this.forget(s);
      }
    }
    this.log(`[server] sala ${room.id} cerrada`);
  }

  private forget(s: Session): void {
    this.sessions.delete(s.id);
    this.byToken.delete(s.token);
  }

  /** Avanza todas las salas. Llamar con frecuencia (≥ 60 Hz). */
  update(): void {
    for (const r of [...this.rooms.values()]) r.update();
  }

  get stats() {
    return { sessions: this.sessions.size, rooms: this.rooms.size };
  }

  /** Acceso para tests/QA. */
  roomOf(playerId: string): ServerRoom | undefined {
    const s = this.sessions.get(playerId);
    return s?.roomId ? this.rooms.get(s.roomId) : undefined;
  }
}
