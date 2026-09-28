/**
 * How the world changes between loops: Observer stage, mug state, terminal
 * messages, A-13 greetings, active anomalies. Pure functions of (loop, knowledge).
 */
import { G } from '../core/store';
import { mulberry32 } from '../core/rng';

export const has = (id: string) => G().run.clues.includes(id);
export const loopN = () => G().run.loop;
export const ngPlus = () => G().run.ngPlus > 0;

/** 0 cameras only · 1 distant · 2 follows · 3 hunts at 12:59 · 4 direct contact */
export function observerStage(): number {
  const l = loopN();
  if (has('OBSERVER_IDENTITY')) return 4;
  if (l >= 9 || has('NOT_FIRST_LOOP')) return 3;
  if (l >= 7 || has('SECTOR7')) return 2;
  if (l >= 4 || (has('OBSERVER_CCTV') && l >= 2)) return 1;
  return 0;
}

export type MugState = 'intact' | 'broken' | 'note' | 'gone';
export function mugState(): MugState {
  const l = loopN();
  if (l >= 12) return 'gone';
  if (l >= 8) return 'note';
  if (l >= 5) return 'broken';
  return 'intact';
}

export function terminalMessage(): string {
  if (ngPlus()) return 'WELCOME BACK';
  const l = loopN();
  if (l >= 12) return 'STOP RESETTING';
  if (l >= 10) return 'LOOK AT THE CAMERAS';
  if (l >= 7) return 'DO YOU REMEMBER ME';
  if (l >= 4) return 'HELLO?';
  return 'SYSTEM NOMINAL';
}

export function morningLines(): [string, number][] {
  const l = loopN();
  if (ngPlus()) return [['Good morning.', 2.4], ['…Again?', 2.4], ['You have 13 minutes.', 3]];
  if (has('A13_LIES')) return [['Good morning.', 2.4], ['Please stop reading my directives.', 3], ['You have 13 minutes.', 3]];
  if (l === 1 || l === 2) return [['Good morning.', 2.6], ['You have 13 minutes.', 3]];
  if (l === 6) return [['Good morning. Good morning. Good morning.', 3.4], ['You have 13 minutes.', 3]];
  if (l >= 10) return [['Good morning.', 2.4], ['You are early. You are always early now.', 3.4], ['You have 13 minutes.', 3]];
  const pool: [string, number][][] = [
    [['Good morning.', 2.4], ['You look tired.', 2.4], ['You have 13 minutes.', 3]],
    [['Good morning.', 2.4], ['Everything is normal.', 2.6], ['You have 13 minutes.', 3]],
    [['Good morning.', 2.4], ['Did you sleep well? You always sleep well.', 3.4], ['You have 13 minutes.', 3]],
  ];
  return pool[l % pool.length];
}

export const ANOMALY_POOL = [
  'FLOATING_CHAIR', 'IMPOSSIBLE_DOOR', 'WRONG_CLOCK', 'DUPLICATE_KANE', 'DOUBLE_MUG', 'FLOATING_PAPERS', 'SHADOW', 'LOCKERS_OPEN',
] as const;
export type AnomalyId = (typeof ANOMALY_POOL)[number];

export const ANOMALY_LABEL: Record<AnomalyId, string> = {
  FLOATING_CHAIR: 'A chair floating in the Hub',
  IMPOSSIBLE_DOOR: 'A door that leads nowhere',
  WRONG_CLOCK: 'A clock showing the wrong time',
  DUPLICATE_KANE: 'Kane, in two places at once',
  DOUBLE_MUG: 'Two identical mugs',
  FLOATING_PAPERS: 'Papers suspended in the Archives',
  SHADOW: 'A shadow with no one to cast it',
  LOCKERS_OPEN: 'Every locker open at once',
};

export const ANOMALY_POS: Record<AnomalyId, [number, number, number]> = {
  FLOATING_CHAIR: [2.6, 1.6, -2.2],
  IMPOSSIBLE_DOOR: [-9.7, 1.2, -5.8],
  WRONG_CLOCK: [3, 3.1, -7.7],
  DUPLICATE_KANE: [-22.9, 0.9, -1.8],
  DOUBLE_MUG: [0, 0.8, 0],
  FLOATING_PAPERS: [-6.5, 1.8, -13],
  SHADOW: [-9.7, 1.4, 12],
  LOCKERS_OPEN: [-23.4, 1, 0],
};

export function pickAnomalies(loop: number, ng: number): AnomalyId[] {
  const n = (loop < 3 ? 0 : loop < 6 ? 1 : loop < 9 ? 2 : 3) + (ng > 0 ? 1 : 0);
  const rng = mulberry32(loop * 7919 + ng * 131);
  const pool = [...ANOMALY_POOL];
  const out: AnomalyId[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function chaseThisLoop(): boolean {
  if (observerStage() !== 3) return false;
  const rng = mulberry32(loopN() * 104729);
  return rng() < 0.7;
}
