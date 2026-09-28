/**
 * THE LOOP. Resets every physical thing in ORPHEUS while preserving knowledge.
 *  - beginLoop(): builds a fresh World (doors, items, NPCs, lights, puzzles, player…)
 *  - triggerReset(): the cinematic 13:00 collapse → next loop
 *  - die(): YOU DIED → RESETTING… → next loop (knowledge kept)
 */
import { LOOP_SECONDS } from '../core/constants';
import { createWorld, replaceWorld, world } from '../core/world';
import { G } from '../core/store';
import { sequence, clearLater } from '../core/timeline';
import { view, setShot } from '../core/view';
import { Audio } from '../audio/AudioEngine';
import { SaveSystem } from './SaveSystem';
import { Memory, Achievements } from './MemorySystem';
import { Cutscenes } from './Cutscenes';
import { placeNPCs } from '../ai/NPCs';
import { hideObserver } from '../ai/Observer';
import { pickAnomalies, loopN } from './Progression';
import { exitPointerLock, requestPointerLock } from '../core/input';
import { SPAWN } from '../data/level';
import { say } from './Voice';

/** Items physically present at the start of every loop. */
export const PICKUPS = [
  'med_flashlight', 'med_cabinet', 'lab_battery', 'lab_tool', 'lab_fridge', 'sec_keycard', 'dorm_battery',
  'arch_datadrive', 'res_accesscard', 'maint_battery', 'unk_strangekey', 'maint_medkit',
];

function freshWorld(): void {
  const loop = G().run.loop;
  replaceWorld(createWorld(loop * 31 + G().run.ngPlus));
  for (const id of PICKUPS) world.pickups[id] = true;
  world.anomalies = pickAnomalies(loop, G().run.ngPlus);
  if (loop >= 4) world.flags.add('lamp_broken');
  placeNPCs();
  hideObserver(35);
  // New Game+: the Observer watches you wake up
  if (G().run.ngPlus > 0) world.flags.add('ngpWake');
}

export const LoopSystem = {
  /** Start (or restart) a loop. `intro` = very first awakening of a run. */
  beginLoop(kind: 'intro' | 'reset' | 'death' | 'continue'): void {
    sequence.stop();
    clearLater();
    setShot(null);
    freshWorld();
    view.yaw = SPAWN.yaw + Math.PI;
    view.pitch = 0.2;
    view.menuOrbit = false;
    Audio.stopAllEmitters();
    Audio.setTimeWarp(1);
    Audio.setMuffle(false);
    Audio.setDuck(1);
    Audio.setZone('MEDICAL', true);
    Audio.setMood('EXPLORATION');
    G().setPanel('none');
    G().setOverlay({ flash: 0, title: null, subtitle: null, glitch: 0 });
    G().setRun((r) => ({ ...r, started: true }));
    SaveSystem.save();
    const first = kind === 'intro';
    Cutscenes.wake(first, () => {
      G().setPhase('PLAYING');
      requestPointerLock();
      if (first) G().pushNotification({ kind: 'info', title: 'ORPHEUS', text: 'WASD move · SHIFT run · SPACE jump · CTRL/C crouch · E interact · F flashlight · TAB memory' });
      if (kind === 'reset' && loopN() === 2) setTimeout(() => say('YOU', 'The same room. The same words. …It happened again.', 3.5), 1200);
    });
  },

  /** 13:00 — the cinematic collapse. */
  triggerReset(): void {
    if (G().phase === 'RESET' || G().phase === 'DEATH' || G().phase === 'ENDING') return;
    G().setPhase('RESET');
    G().setPanel('none');
    world.cctv.active = false;
    exitPointerLock();
    Audio.setMood('RESET');
    Audio.sfx('swell', { rate: 0.8 });
    const t0 = world.t;
    sequence.start([
      { at: 0.0, fn: () => { world.light.flicker = 3; } },
      { at: 0.9, fn: () => { world.frozen = true; Audio.setTimeWarp(0.55); Audio.sfx('glitch'); } },
      { at: 1.8, fn: () => { Audio.setTimeWarp(0.3); Audio.sfx('resetBoom'); } },
      { at: 2.9, fn: () => { G().setOverlay({ flash: 1 }); Audio.setDuck(0); Audio.silence(4); } },
      { at: 3.4, fn: () => G().setOverlay({ black: 1, flash: 0 }) },
      { at: 3.6, fn: () => { completeLoop(); G().setOverlay({ title: `LOOP ${String(G().run.loop).padStart(2, '0')}`, subtitle: 'RESET' }); } },
      { at: 5.8, fn: () => { G().setOverlay({ title: null, subtitle: null }); LoopSystem.beginLoop('reset'); } },
    ], (t) => {
      world.t = Math.min(LOOP_SECONDS, t0 + t * 0.2);
      world.distortion = Math.min(1, t / 2.6);
      world.shake = Math.min(1.2, 0.2 + t * 0.35);
      G().setOverlay({ glitch: Math.min(1, t / 2.5) });
    });
  },

  die(): void {
    if (G().phase === 'DEATH' || G().phase === 'RESET') return;
    world.player.dead = true;
    G().setPhase('DEATH');
    G().setPanel('none');
    exitPointerLock();
    Audio.sfx('death');
    Audio.silence(6);
    G().setRun((r) => ({ ...r, deaths: r.deaths + 1 }));
    G().setProfile((p) => ({ ...p, deaths: p.deaths + 1 }));
    Achievements.unlock('NOT_THE_END');
    sequence.start([
      { at: 0.1, fn: () => G().setOverlay({ glitch: 0.5 }) },
      { at: 1.4, fn: () => G().setOverlay({ black: 0.85, title: 'YOU DIED', subtitle: null }) },
      { at: 3.6, fn: () => G().setOverlay({ subtitle: 'RESETTING…' }) },
      { at: 4.2, fn: () => Memory.discoverClue('FIRST_DEATH') },
      { at: 5.6, fn: () => { G().setOverlay({ black: 1, title: null, subtitle: null, glitch: 0 }); completeLoop(); LoopSystem.beginLoop('death'); } },
    ]);
  },

  quitToMenu(): void {
    sequence.stop();
    clearLater();
    setShot(null);
    SaveSystem.save();
    Audio.stopAllEmitters();
    Audio.cancelSpeech();
    Audio.setMuffle(false);
    Audio.setZone('MENU', true);
    Audio.setMood('MYSTERY');
    freshWorld();
    world.frozen = true;
    view.menuOrbit = true;
    G().setPanel('none');
    G().setOverlay({ black: 0, flash: 0, title: null, subtitle: null, letterbox: false, glitch: 0 });
    G().setPhase('MENU');
  },
};

/** Book-keeping when a loop ends (by time or by death). */
function completeLoop(): void {
  G().setRun((r) => ({ ...r, loop: r.loop + 1, loopsCompleted: r.loopsCompleted + 1 }));
  G().setProfile((p) => ({ ...p, totalLoops: p.totalLoops + 1 }));
  Memory.discoverClue('LOOP_13MIN');
  Achievements.unlock('FIRST_LOOP');
  if (G().run.loopsCompleted >= 13) Achievements.unlock('PERSISTENT');
  SaveSystem.save();
}
