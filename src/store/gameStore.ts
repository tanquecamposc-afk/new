import { create } from 'zustand';
import type { AppState } from '@/game/core/appState';
import type { PlayerState } from '@/game/core/playerState';
import type { ScoreBreakdown } from '@/game/scoring/score';

export interface ShotSummary {
  index: number;
  power: number;
  distance: number;
  bounces: number;
  result: string;
}

/** Resumen del hoyo terminado (embocado o no). */
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
  overview: boolean;
  result: HoleSummary | null;
  lastEvent: { text: string; tone: 'info' | 'good' | 'bad'; id: number } | null;
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
}

interface GameStore {
  appState: AppState;
  loading: { progress: number; message: string };
  error: string | null;
  hud: HudState;
  debug: DebugStats;
  showDebug: boolean;
  setAppState: (s: AppState) => void;
  setLoading: (progress: number, message: string) => void;
  setError: (message: string) => void;
  patchHud: (patch: Partial<HudState>) => void;
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
  overview: false,
  result: null,
  lastEvent: null,
};

/** Estado de UI. La simulación es la fuente de verdad; aquí sólo se publica lo que la interfaz muestra. */
export const useGameStore = create<GameStore>((set) => ({
  appState: 'BOOT',
  loading: { progress: 0, message: 'Iniciando…' },
  error: null,
  hud: initialHud,
  debug: { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, bodies: 0, colliders: 0, memoryMb: null, predictionMs: 0 },
  showDebug: false,
  setAppState: (appState) => set({ appState }),
  setLoading: (progress, message) => set({ loading: { progress, message } }),
  setError: (error) => set({ error, appState: 'ERROR' }),
  patchHud: (patch) => set((s) => ({ hud: { ...s.hud, ...patch } })),
  setDebug: (debug) => set({ debug }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}));
