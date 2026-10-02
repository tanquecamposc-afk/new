/**
 * Protocolo cliente ↔ servidor (JSON sobre WebSocket). Tipos compartidos y
 * validación estricta de todo lo que llega del cliente: el servidor nunca
 * confía en datos sin validar.
 */
import type { ConnectionState } from '@/match/types';
import type { Standing } from '@/match/MatchController';
import type { RoomState } from './Room';

export const PROTOCOL_VERSION = 1;

// ---------- Cliente → servidor ----------

export type ClientMessage =
  | { t: 'hello'; v: number; name: string; token?: string }
  | { t: 'quick_play' }
  | { t: 'create_room' }
  | { t: 'join_room'; code: string }
  | { t: 'leave_room' }
  | { t: 'set_ready'; ready: boolean }
  | { t: 'set_name'; name: string }
  | { t: 'set_courses'; ids: string[] }
  | { t: 'start' }
  | { t: 'hole_ready'; hole: number }
  | { t: 'next_ready' }
  | { t: 'shoot'; shotId: number; tick: number; dx: number; dz: number; power: number }
  | { t: 'reset_ball' }
  | { t: 'ping'; c: number };

// ---------- Servidor → cliente ----------

export interface PlayerNetState {
  id: string;
  /** Posición de la bola. */
  x: number;
  y: number;
  z: number;
  /** Rotación (cuaternión) para que el giro de las bolas remotas se vea. */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  /** Fase de la bola (rest | moving | captured | in_hole | hazard). */
  phase: string;
  state: string;
  strokes: number;
  penalties: number;
  finished: boolean;
  completed: boolean;
  holed: boolean;
  timeMs: number;
  conn: ConnectionState;
}

export interface HoleInfo {
  index: number;
  count: number;
  courseId: string;
  /** Hora de servidor (ms) a la que corresponde el tick 0 de este hoyo. */
  t0: number;
  /** Tick en el que empieza el juego (fin de la cuenta atrás) o null si aún se carga. */
  goTick: number | null;
}

export interface NetHoleResult {
  playerId: string;
  strokes: number;
  timeMs: number;
  completed: boolean;
  score: number;
}

export type ServerMessage =
  | { t: 'welcome'; playerId: string; token: string; serverTime: number; resumed: boolean }
  | { t: 'error'; code: string; message: string }
  | { t: 'room'; room: RoomState }
  | { t: 'left_room' }
  | { t: 'match_start'; holes: string[]; players: { id: string; name: string; color: number }[] }
  | { t: 'hole'; hole: HoleInfo }
  | { t: 'snap'; tick: number; time: number; players: PlayerNetState[] }
  | { t: 'shot'; playerId: string; shotId: number; tick: number; power: number }
  | { t: 'shot_ack'; shotId: number; ok: boolean; reason?: string; tick: number }
  | { t: 'event'; kind: 'holed' | 'water' | 'out_of_bounds' | 'time_up' | 'finished'; playerId: string }
  | { t: 'hole_end'; hole: number; results: NetHoleResult[]; standings: Standing[] }
  | { t: 'match_end'; standings: Standing[] }
  | { t: 'conn'; playerId: string; state: ConnectionState }
  | { t: 'pong'; c: number; s: number };

// ---------- Validación ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** Formato de código de sala: 5 caracteres sin ambiguos (sin 0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Valida y tipa un mensaje del cliente. Devuelve null si es inválido. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m) || typeof m.t !== 'string') return null;
  switch (m.t) {
    case 'hello':
      return finite(m.v) && str(m.name, 64) && (m.token === undefined || str(m.token, 128))
        ? { t: 'hello', v: m.v, name: m.name, token: m.token as string | undefined }
        : null;
    case 'quick_play':
    case 'create_room':
    case 'leave_room':
    case 'start':
    case 'next_ready':
    case 'reset_ball':
      return { t: m.t };
    case 'join_room':
      return str(m.code, 16) ? { t: 'join_room', code: m.code } : null;
    case 'set_ready':
      return typeof m.ready === 'boolean' ? { t: 'set_ready', ready: m.ready } : null;
    case 'set_name':
      return str(m.name, 64) ? { t: 'set_name', name: m.name } : null;
    case 'set_courses':
      return Array.isArray(m.ids) && m.ids.length <= 32 && m.ids.every((i) => str(i, 64)) ? { t: 'set_courses', ids: m.ids as string[] } : null;
    case 'hole_ready':
      return finite(m.hole) ? { t: 'hole_ready', hole: m.hole } : null;
    case 'shoot':
      return finite(m.shotId) && finite(m.tick) && finite(m.dx) && finite(m.dz) && finite(m.power)
        ? { t: 'shoot', shotId: m.shotId, tick: m.tick, dx: m.dx, dz: m.dz, power: m.power }
        : null;
    case 'ping':
      return finite(m.c) ? { t: 'ping', c: m.c } : null;
    default:
      return null;
  }
}
