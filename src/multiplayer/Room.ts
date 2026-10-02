import type { Equipped } from '@/cosmetics/catalog';
import type { ConnectionState } from '@/match/types';

export interface RoomPlayer {
  id: string;
  name: string;
  color: number;
  isHost: boolean;
  isBot: boolean;
  ready: boolean;
  connection: ConnectionState;
  cosmetics?: Equipped;
}

export interface RoomState {
  /** Código de sala (salas privadas) o null en práctica local / partida pública. */
  code: string | null;
  mode: 'local' | 'quick' | 'private';
  players: RoomPlayer[];
  maxPlayers: number;
  /** Hoyos seleccionados para la partida. */
  courseIds: string[];
  status: 'open' | 'starting' | 'in_match';
  /** Partida rápida: hora de servidor (ms) a la que empezará sola, o null. */
  autoStartAt?: number | null;
}

export type RoomError = 'room_full' | 'invalid_name' | 'not_host' | 'not_all_ready' | 'unknown_player' | 'no_courses' | 'match_in_progress';

export type RoomResult = { ok: true } | { ok: false; error: RoomError };

/**
 * Contrato de una sala. LocalRoom (práctica sin servidor) y la sala de red de
 * Phase 5 lo implementan igual: la UI del lobby no distingue entre ellas.
 */
export interface Room {
  readonly localPlayerId: string;
  getState(): RoomState;
  subscribe(listener: (state: RoomState) => void): () => void;
  setReady(ready: boolean): RoomResult;
  setName(name: string): RoomResult;
  setCourses(courseIds: string[]): RoomResult;
  start(): RoomResult;
  leave(): void;
}

/** Normaliza y valida nombres visibles (2–16 caracteres, sin controles). */
export function sanitizeName(raw: string): string | null {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= 16 ? name : null;
}
