/**
 * Short, skippable cinematics driven by camera shots + scripted beats.
 * Waking up · first Observer sighting · Core discovery · identity reveal · ending shots.
 */
import { G } from '../core/store';
import { setShot, view, type CinematicShot } from '../core/view';
import { sequence } from '../core/timeline';
import { world } from '../core/world';
import { Audio } from '../audio/AudioEngine';
import { say } from './Voice';
import { Flow } from './Flow';
import { morningLines } from './Progression';
import { Input } from '../core/input';
import { Memory } from './MemorySystem';

type Beat = { at: number; fn: () => void };

let onFinish: (() => void) | null = null;
let skippable = true;

function play(shots: CinematicShot[], beats: Beat[], finish: () => void, canSkip = true): void {
  G().setPhase('CUTSCENE');
  G().setOverlay({ letterbox: true });
  G().setPanel('none');
  onFinish = finish;
  skippable = canSkip;
  let t = 0;
  const steps: Beat[] = [];
  for (const s of shots) {
    const start = t;
    steps.push({ at: start, fn: () => setShot(s) });
    t += s.duration;
  }
  steps.push(...beats);
  steps.push({ at: t, fn: () => Cutscenes.end() });
  sequence.start(steps);
}

export const Cutscenes = {
  get active() { return G().phase === 'CUTSCENE'; },

  update(): void {
    if (G().phase !== 'CUTSCENE') return;
    if (skippable && (Input.consume('Space') || Input.consume('Enter') || Input.consume('Escape'))) {
      sequence.stop();
      Cutscenes.end();
    }
  },

  end(): void {
    setShot(null);
    G().setOverlay({ letterbox: false });
    const cb = onFinish;
    onFinish = null;
    if (G().phase === 'CUTSCENE') G().setPhase('PLAYING');
    cb?.();
  },

  /** Black screen → breathing → flicker → slow wake on the medical bed → 12:47 → "Good morning." */
  wake(first: boolean, done: () => void): void {
    const p = world.player.pos;
    const bed = { x: -8.65, z: 13.3 };
    G().setOverlay({ black: 1 });
    world.player.action = 'lying';
    world.player.actionDuration = 999;
    world.frozen = true;
    const lines = morningLines();
    const shots: CinematicShot[] = [
      { from: { pos: [bed.x + 0.2, 2.6, bed.z + 0.4], target: [bed.x - 0.2, 0.9, bed.z] }, to: { pos: [bed.x + 0.4, 2.2, bed.z + 0.8], target: [bed.x - 0.3, 0.9, bed.z] }, duration: first ? 6.5 : 3.2, fov: 40, dof: true },
      { from: { pos: [bed.x + 2.4, 1.7, bed.z + 2.2], target: [bed.x, 1.0, bed.z] }, to: { pos: [p.x + 1.8, 1.9, p.z + 2.6], target: [p.x, 1.2, p.z] }, duration: first ? 4.5 : 2.4, fov: 50 },
    ];
    const T0 = first ? 6.5 : 3.2;
    const beats: Beat[] = [
      { at: 0.2, fn: () => Audio.sfx('breath', { volume: 0.12 }) },
      { at: first ? 1.6 : 0.8, fn: () => { G().setOverlay({ black: 0.85 }); Audio.sfx('zap', { volume: 0.3 }); } },
      { at: first ? 1.8 : 0.9, fn: () => G().setOverlay({ black: 1 }) },
      { at: first ? 2.4 : 1.1, fn: () => Audio.sfx('breath', { volume: 0.14 }) },
      { at: first ? 2.9 : 1.3, fn: () => G().setOverlay({ black: 0.4 }) },
      { at: first ? 3.05 : 1.4, fn: () => G().setOverlay({ black: 0.95 }) },
      { at: first ? 3.6 : 1.7, fn: () => { G().setOverlay({ black: 0 }); } },
      { at: first ? 4.2 : 2.0, fn: () => { say('A-13', lines[0][0], lines[0][1]); } },
      { at: T0 - 0.4, fn: () => { world.player.action = null; world.player.pos.set(-7.05, 0, 13.3); } },
      { at: T0 + 0.8, fn: () => { let d = 0; for (const [line, dur] of lines.slice(1)) { setTimeout(() => say('A-13', line, dur), d * 1000); d += dur + 0.4; } } },
    ];
    play(shots, beats, () => {
      world.player.action = null;
      G().setOverlay({ black: 0 });
      world.frozen = false;
      Memory.discoverClue('A13_INTRO');
      done();
    }, !first);
  },

  /** Brief slow-motion focus the first time the Observer is seen in person. */
  firstObserver(pos: { x: number; y: number; z: number }): void {
    view.focus = { ...pos, until: performance.now() + 2600 };
    world.timeScale = 0.35;
    world.shake = 0.3;
    G().setOverlay({ glitch: 0.6 });
    setTimeout(() => { world.timeScale = 1; G().setOverlay({ glitch: 0 }); }, 2600);
  },

  coreDiscovery(done: () => void): void {
    const shots: CinematicShot[] = [
      { from: { pos: [5.5, 2.2, -15.2], target: [7.5, 3, -24.5] }, to: { pos: [3.5, 5.5, -18], target: [7.5, 2.5, -24.5] }, duration: 4.2, fov: 55, ease: 'inOut' },
      { from: { pos: [13.5, 6.5, -30], target: [7.5, 2, -24.5] }, to: { pos: [1.5, 6.5, -30], target: [7.5, 2, -24.5] }, duration: 3.6, fov: 50 },
    ];
    play(shots, [
      { at: 0.3, fn: () => Audio.sfx('swell') },
      { at: 1.2, fn: () => say('A-13', 'You are not authorized to see this.') },
      { at: 4.6, fn: () => say('A-13', 'You have never been authorized to see this. You come anyway.') },
    ], () => { Flow.resume(); done(); });
  },

  identityReveal(done: () => void): void {
    const o = { x: 31.2, z: -2.4 };
    const shots: CinematicShot[] = [
      { from: { pos: [o.x - 1.2, 1.2, o.z + 1.2], target: [o.x, 0.1, o.z] }, to: { pos: [o.x - 0.6, 0.8, o.z + 0.6], target: [o.x, 0.05, o.z] }, duration: 3.5, fov: 35, dof: true },
      { from: { pos: [29, 1.7, 2.5], target: [24.5, 1.5, -4] }, to: { pos: [28, 1.6, 1.5], target: [24.5, 1.5, -4] }, duration: 3.2, fov: 45 },
    ];
    play(shots, [
      { at: 0.4, fn: () => { Audio.silence(10); Audio.sfx('bell'); } },
      { at: 1.2, fn: () => say('YOU', 'SUBJECT 13 · ID 0413-A.', 2.6) },
      { at: 3.9, fn: () => say('YOU', 'That\'s my number. That thing is… me.', 3) },
    ], () => { Flow.resume(); done(); });
  },

  /** Generic cinematic used by endings. */
  shots(shots: CinematicShot[], beats: Beat[], done: () => void, canSkip = false): void {
    play(shots, beats, done, canSkip);
  },
};
