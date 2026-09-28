/**
 * Global reactive store (UI-facing, low frequency).
 * Per-frame simulation data lives in `world.ts` instead, to avoid React re-renders.
 */
import { create } from 'zustand';
import type { EndingId, GamePhase, Notification, Panel, Profile, RunState, Settings, Subtitle } from './types';

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  graphics: 'high',
  shadows: 'low',
  particles: 'medium',
  postprocessing: true,
  cameraSensitivity: 1,
  mouseSensitivity: 1,
  fov: 62,
  subtitles: true,
  aiVoice: true,
  invertY: false,
};

export const emptyProfile = (): Profile => ({
  achievements: [], endings: [], cluesEver: [], docsEver: [], secretsEver: [],
  totalLoops: 0, deaths: 0, ngPlusUnlocked: false, playTime: 0,
});

export const emptyRun = (ngPlus = 0): RunState => ({
  started: false, loop: 1, ngPlus, clues: [], docs: [], secrets: [], areas: [], camsSeen: [],
  anomalies: [], mugStates: [], itemsFound: [], flags: [], deaths: 0, loopsCompleted: 0,
});

export interface HudState {
  clock: string;
  seconds: string;
  prompt: string | null;
  promptKey: string;
  promptDisabled: boolean;
  hold: number;
  anomalyUntil: number;
  danger: string | null;
  health: number;
  battery: number;
  hasFlashlight: boolean;
  flashlight: boolean;
  stamina: number;
  area: string;
  timeFrozen: boolean;
  fastForward: boolean;
}

export interface OverlayState {
  /** 0..1 white flash */
  flash: number;
  /** 0..1 black fade */
  black: number;
  title: string | null;
  subtitle: string | null;
  letterbox: boolean;
  glitch: number;
}

export interface PanelData {
  docId?: string;
  terminalId?: string;
  inspect?: { title: string; text: string };
  dialogue?: { speaker: string; lines: { speaker: string; text: string }[]; index: number; choices?: { text: string; id: string; disabled?: boolean }[]; onChoice?: (id: string) => void; onEnd?: () => void };
  keypadTarget?: string;
}

interface Store {
  phase: GamePhase;
  panel: Panel;
  panelData: PanelData;
  settings: Settings;
  profile: Profile;
  run: RunState;
  hud: HudState;
  overlay: OverlayState;
  notifications: Notification[];
  subtitles: Subtitle[];
  loading: { progress: number; label: string };
  ending: EndingId | null;
  menuScreen: 'main' | 'memory' | 'achievements' | 'settings' | 'confirm-new' | 'confirm-ngp' | 'credits';
  hasSave: boolean;

  setPhase: (p: GamePhase) => void;
  setPanel: (p: Panel, data?: PanelData) => void;
  setSettings: (s: Partial<Settings>) => void;
  setHud: (h: Partial<HudState>) => void;
  setOverlay: (o: Partial<OverlayState>) => void;
  setRun: (fn: (r: RunState) => RunState) => void;
  setProfile: (fn: (p: Profile) => Profile) => void;
  pushNotification: (n: Omit<Notification, 'id' | 'time'>) => void;
  dismissNotification: (id: number) => void;
  pushSubtitle: (speaker: string, text: string, seconds: number) => void;
  pruneSubtitles: () => void;
}

let nid = 1;

export const useGame = create<Store>((set) => ({
  phase: 'LOADING',
  panel: 'none',
  panelData: {},
  settings: { ...DEFAULT_SETTINGS },
  profile: emptyProfile(),
  run: emptyRun(),
  hud: {
    clock: '12:47', seconds: '00', prompt: null, promptKey: 'E', promptDisabled: false, hold: 0, anomalyUntil: 0,
    danger: null, health: 100, battery: 100, hasFlashlight: false, flashlight: false, stamina: 1, area: '',
    timeFrozen: false, fastForward: false,
  },
  overlay: { flash: 0, black: 1, title: null, subtitle: null, letterbox: false, glitch: 0 },
  notifications: [],
  subtitles: [],
  loading: { progress: 0, label: 'LOADING ORPHEUS...' },
  ending: null,
  menuScreen: 'main',
  hasSave: false,

  setPhase: (phase) => set({ phase }),
  setPanel: (panel, data = {}) => set({ panel, panelData: data }),
  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  setHud: (h) => set((st) => ({ hud: { ...st.hud, ...h } })),
  setOverlay: (o) => set((st) => ({ overlay: { ...st.overlay, ...o } })),
  setRun: (fn) => set((st) => ({ run: fn(st.run) })),
  setProfile: (fn) => set((st) => ({ profile: fn(st.profile) })),
  pushNotification: (n) =>
    set((st) => ({ notifications: [...st.notifications.slice(-4), { ...n, id: nid++, time: performance.now() }] })),
  dismissNotification: (id) => set((st) => ({ notifications: st.notifications.filter((n) => n.id !== id) })),
  pushSubtitle: (speaker, text, seconds) =>
    set((st) => ({
      subtitles: [...st.subtitles.filter((s) => s.until > performance.now()).slice(-2), { id: nid++, speaker, text, until: performance.now() + seconds * 1000 }],
    })),
  pruneSubtitles: () => set((st) => ({ subtitles: st.subtitles.filter((s) => s.until > performance.now()) })),
}));

export const G = () => useGame.getState();
