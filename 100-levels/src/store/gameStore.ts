/**
 * Runtime (non-persistent) game state shared between the 3D engine and the React UI.
 */
import { create } from 'zustand';

export type Screen =
  | 'boot' | 'menu' | 'levels' | 'shop' | 'inventory' | 'profile' | 'achievements'
  | 'settings' | 'speedrun' | 'mutations'
  | 'loading' | 'playing' | 'paused' | 'victory' | 'dead' | 'ending';

export interface BossHud {
  name: string;
  hp: number;
  maxHp: number;
  phase: number;
  phases: number;
  subtitle?: string;
  shield?: boolean;
}

export interface HudState {
  hp: number;
  maxHp: number;
  stamina: number;
  energy: number;
  coins: number;
  totalCoins: number;
  time: number;
  timeLimit: number | null;
  objective: string;
  progress: string;
  prompt: string | null;
  boss: BossHud | null;
  weapon: string;
  weapons: string[];
  potions: number;
  abilityName: string;
  abilityCost: number;
  mode: 'foot' | 'vehicle' | 'aim';
  race: { lap: number; laps: number; pos: number; total: number; speed: number; boost: number; checkpoint: number; checkpoints: number } | null;
  stealth: { detection: number; state: string; alarm: boolean } | null;
  survival: { hunger: number; thirst: number; warmth: number; wood: number; stone: number; food: number; clock: string; night: boolean } | null;
  precision: { score: number; hits: number; shots: number; streak: number; stage: string } | null;
  horror: { fear: number; battery: number } | null;
  crosshair: boolean;
  damageDir: number | null;
  secretsInLevel: number;
  secretsFoundInLevel: number;
  noDamage: boolean;
  combo: number;
}

export const emptyHud = (): HudState => ({
  hp: 100, maxHp: 100, stamina: 100, energy: 0, coins: 0, totalCoins: 0, time: 0, timeLimit: null,
  objective: '', progress: '', prompt: null, boss: null, weapon: 'wpn_sword', weapons: [], potions: 0,
  abilityName: '', abilityCost: 0, mode: 'foot', race: null, stealth: null, survival: null, precision: null,
  horror: null, crosshair: false, damageDir: null, secretsInLevel: 0, secretsFoundInLevel: 0, noDamage: true, combo: 0,
});

export interface Toast {
  id: number;
  icon: string;
  title: string;
  text: string;
  color?: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  big?: boolean;
}

export interface LevelSummary {
  levelId: string;
  levelName: string;
  stars: [boolean, boolean, boolean];
  newStars: number;
  time: number;
  bestTime: number;
  newBest: boolean;
  xp: number;
  coins: number;
  rewards: string[];
  levelUps: number;
  extra: string[];
  isFinal: boolean;
  speedrun?: { total: number; best: number; split: number; nextId: string | null; finished: boolean; newRecord: boolean };
}

export interface DeathSummary {
  levelId: string;
  levelName: string;
  time: number;
  coins: number;
  reason: string;
}

export interface CraftMenu {
  open: boolean;
}

interface GameStore {
  screen: Screen;
  prevScreen: Screen;
  /** Where to return when leaving settings opened from pause. */
  settingsReturn: Screen;
  currentLevel: string | null;
  loading: { progress: number; label: string; tip: string };
  hud: HudState;
  toasts: Toast[];
  banner: Banner | null;
  summary: LevelSummary | null;
  death: DeathSummary | null;
  craftOpen: boolean;
  fps: number;
  cinematic: boolean;
  subtitle: string | null;
  speedrun: { active: boolean; runId: string; ids: string[]; index: number; splits: number[]; total: number } | null;
  setScreen: (s: Screen) => void;
  setHud: (h: HudState) => void;
  notify: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  showBanner: (b: Omit<Banner, 'id'>, ms?: number) => void;
  setSubtitle: (s: string | null) => void;
  set: (p: Partial<GameStore>) => void;
}

let toastId = 1;

export const useGame = create<GameStore>((set, get) => ({
  screen: 'boot',
  prevScreen: 'boot',
  settingsReturn: 'menu',
  currentLevel: null,
  loading: { progress: 0, label: '', tip: '' },
  hud: emptyHud(),
  toasts: [],
  banner: null,
  summary: null,
  death: null,
  craftOpen: false,
  fps: 0,
  cinematic: false,
  subtitle: null,
  speedrun: null,
  setScreen: (s) => set({ prevScreen: get().screen, screen: s }),
  setHud: (h) => set({ hud: h }),
  notify: (t) => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  showBanner: (b, ms = 3200) => {
    const id = toastId++;
    set({ banner: { ...b, id } });
    setTimeout(() => {
      if (get().banner?.id === id) set({ banner: null });
    }, ms);
  },
  setSubtitle: (s) => set({ subtitle: s }),
  set: (p) => set(p),
}));
