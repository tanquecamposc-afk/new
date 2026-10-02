import { create } from 'zustand';
import { APP_TRANSITIONS, type AppState } from '@/game/core/appState';
import type { PlayerState } from '@/game/core/playerState';
import type { ScoreBreakdown } from '@/game/scoring/score';
import type { Standing } from '@/match/MatchController';
import type { RoomState } from '@/multiplayer/Room';

export interface ShotSummary {
  index: number;
  power: number;
  distance: number;
  bounces: number;
  result: string;
}

/** Resumen del hoyo del jugador local (embocado o no). */
export interface HoleSummary {
  completed: boolean;
  title: string;
  strokes: number;
  penalties: number;
  par: number;
  timeMs: number;
  score: ScoreBreakdown;
  shots: ShotSummary[];
}

export interface HudState {
  courseName: string;
  par: number;
  shots: number;
  penalties: number;
  timeMs: number;
  playerState: PlayerState;
  aiming: boolean;
  power: number;
  holed: boolean;
  /** Tiempo restante del límite del hoyo (ms) o null si no hay límite. */
  remainingMs: number | null;
  timeLimitMs: number | null;
  overview: boolean;
  result: HoleSummary | null;
  lastEvent: { text: string; tone: 'info' | 'good' | 'bad'; id: number } | null;
}

/** Fila de la clasificación en vivo del hoyo. */
export interface LiveRow {
  id: string;
  name: string;
  color: number;
  isBot: boolean;
  isLocal: boolean;
  strokes: number;
  finished: boolean;
  completed: boolean;
  timeMs: number;
  position: number;
}

export interface HoleResultRow extends LiveRow {
  score: number;
}

export interface MatchView {
  mode: 'local' | 'quick' | 'private';
  holeIndex: number;
  holeCount: number;
  /** Fase del hoyo en curso. */
  phase: 'loading' | 'ready' | 'countdown' | 'playing' | 'ended';
  countdown: number | 'GO' | null;
  live: LiveRow[];
  playersRemaining: number;
  position: number;
  spectate: { targetId: string; name: string; strokes: number; position: number; color: number } | null;
  paused: boolean;
  /** Resultados del último hoyo terminado. */
  holeResults: HoleResultRow[] | null;
  standings: Standing[] | null;
}

export interface DebugStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  bodies: number;
  colliders: number;
  memoryMb: number | null;
  predictionMs: number;
  resolution: number;
  latencyMs: number | null;
  quality: string;
}

interface GameStore {
  appState: AppState;
  loading: { progress: number; message: string };
  error: string | null;
  hud: HudState;
  match: MatchView | null;
  lobby: RoomState | null;
  debug: DebugStats;
  showDebug: boolean;
  /** Estado de la conexión con el servidor (partidas online). */
  connection: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
  /** Aviso del servidor (errores de sala, etc.). */
  notice: { text: string; id: number } | null;
  /** Transición validada por la tabla de estados. Devuelve false si no está permitida. */
  transition: (to: AppState) => boolean;
  setLoading: (progress: number, message: string) => void;
  setError: (message: string) => void;
  patchHud: (patch: Partial<HudState>) => void;
  patchMatch: (patch: Partial<MatchView>) => void;
  setMatch: (m: MatchView | null) => void;
  setLobby: (l: RoomState | null) => void;
  setDebug: (d: DebugStats) => void;
  toggleDebug: () => void;
}

export const initialHud: HudState = {
  courseName: '',
  par: 0,
  shots: 0,
  penalties: 0,
  timeMs: 0,
  playerState: 'IDLE',
  aiming: false,
  power: 0,
  holed: false,
  remainingMs: null,
  timeLimitMs: null,
  overview: false,
  result: null,
  lastEvent: null,
};

/** Estado de UI. La simulación es la fuente de verdad; aquí sólo se publica lo que la interfaz muestra. */
export const useGameStore = create<GameStore>((set, get) => ({
  appState: 'BOOT',
  loading: { progress: 0, message: 'Iniciando…' },
  error: null,
  hud: initialHud,
  match: null,
  lobby: null,
  debug: { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, bodies: 0, colliders: 0, memoryMb: null, predictionMs: 0, resolution: 1, latencyMs: null, quality: '' },
  showDebug: false,
  connection: 'idle',
  notice: null,
  transition: (to) => {
    const from = get().appState;
    if (from === to) return true;
    if (!APP_TRANSITIONS[from].includes(to)) {
      console.warn(`[app] transición no permitida: ${from} → ${to}`);
      return false;
    }
    set({ appState: to });
    return true;
  },
  setLoading: (progress, message) => set({ loading: { progress, message } }),
  setError: (error) => set({ error, appState: 'ERROR' }),
  patchHud: (patch) => set((s) => ({ hud: { ...s.hud, ...patch } })),
  patchMatch: (patch) => set((s) => (s.match ? { match: { ...s.match, ...patch } } : {})),
  setMatch: (match) => set({ match }),
  setLobby: (lobby) => set({ lobby }),
  setDebug: (debug) => set({ debug }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}));
