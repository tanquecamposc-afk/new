/** The four endings (+ the final "boss": the loop itself). */
import { G, useGame } from '../core/store';
import type { EndingId } from '../core/types';
import { world } from '../core/world';
import { at } from '../core/constants';
import { Audio } from '../audio/AudioEngine';
import { Achievements, Memory } from './MemorySystem';
import { SaveSystem } from './SaveSystem';
import { Cutscenes } from './Cutscenes';
import { say } from './Voice';
import { sequence } from '../core/timeline';
import { exitPointerLock } from '../core/input';
import { Dialogue } from './Dialogue';
import { Puzzles } from './PuzzleSystem';
import { TRUE_ENDING_REQUIREMENTS } from '../data/clues';

const ACH: Record<EndingId, string> = { ESCAPE: 'THE_EXIT', SACRIFICE: 'SEVERED', OBSERVER: 'MIRROR', TRUE: 'LOOP_BREAKER' };

export const Endings = {
  missingForTrue(): string[] {
    return TRUE_ENDING_REQUIREMENTS.filter((c) => !G().run.clues.includes(c));
  },

  /** Show the ending screen and record it (once). */
  show(id: EndingId): void {
    exitPointerLock();
    G().setPanel('none');
    G().setOverlay({ letterbox: false, glitch: 0 });
    G().setPhase('ENDING');
    useGame.setState({ ending: id });
    G().setOverlay({ black: 1 });
    Audio.setMood('ENDING');
    if (!G().profile.endings.includes(id)) G().setProfile((p) => ({ ...p, endings: [...p.endings, id] }));
    Achievements.unlock(ACH[id]);
    G().setRun((r) => ({ ...r, flags: r.flags.includes(`ENDING_${id}`) ? r.flags : [...r.flags, `ENDING_${id}`] }));
    if (id === 'TRUE') G().setProfile((p) => ({ ...p, ngPlusUnlocked: true }));
    SaveSystem.save();
  },

  escape(): void {
    world.frozen = true;
    Cutscenes.shots([
      { from: { pos: [0, 1.7, -4.5], target: [0, 1.4, -9] }, to: { pos: [0, 1.6, -6.2], target: [0, 1.4, -9.5] }, duration: 3.5, fov: 50 },
      { from: { pos: [0, 1.6, -6.2], target: [0, 1.4, -9.5] }, to: { pos: [0, 1.5, -7.2], target: [0, 1.4, -10] }, duration: 3, fov: 45 },
    ], [
      { at: 0.2, fn: () => { world.doors.d_elevator.target = 1; Audio.sfx('door', { pos: { x: 0, y: 1.3, z: -8 } }); say('A-13', 'Main exit… authorized?') } },
      { at: 1.5, fn: () => { world.player.pos.set(0, 0, -9.3); world.player.yaw = Math.PI; } },
      { at: 3.2, fn: () => { world.doors.d_elevator.target = 0; Audio.sfx('door', { pos: { x: 0, y: 1.3, z: -8 } }); } },
      { at: 4.6, fn: () => { Audio.sfx('generator'); world.shake = 0.3; } },
      { at: 5.8, fn: () => G().setOverlay({ flash: 1 }) },
    ], () => { G().setOverlay({ flash: 0, black: 1 }); Endings.show('ESCAPE'); });
  },

  sacrifice(): void {
    world.frozen = true;
    Cutscenes.shots([
      { from: { pos: [5.5, 2, -16.5], target: [7.5, 3, -24.5] }, to: { pos: [5.5, 3, -15.5], target: [7.5, 3, -24.5] }, duration: 3, fov: 50 },
      { from: { pos: [12, 4, -20], target: [7.5, 2.5, -24.5] }, to: { pos: [10, 2, -21.5], target: [7.5, 2.5, -24.5] }, duration: 3.5, fov: 60 },
    ], [
      { at: 0.1, fn: () => { say('A-13', 'Shutdown command received. Please do not do this.'); world.distortion = 0.5; } },
      { at: 1.5, fn: () => { Audio.sfx('powerDown'); world.shake = 0.8; } },
      { at: 3.0, fn: () => { Audio.sfx('resetBoom'); world.distortion = 1; G().setOverlay({ glitch: 1 }); } },
      { at: 5.8, fn: () => G().setOverlay({ flash: 1 }) },
    ], () => { G().setOverlay({ flash: 0, black: 1 }); Endings.show('SACRIFICE'); });
  },

  observer(): void {
    world.frozen = true;
    const o = world.observer;
    const p = world.player.pos;
    o.visible = true; o.cctvOnly = false; o.mode = 'WATCHING'; o.opacity = 1;
    const dx = Math.sin(world.player.yaw), dz = Math.cos(world.player.yaw);
    if (o.pos.y < -10 || Math.hypot(o.pos.x - p.x, o.pos.z - p.z) > 4) o.pos.set(p.x + dx * 1.4, 0, p.z + dz * 1.4);
    Cutscenes.shots([
      { from: { pos: [p.x - dz * 2.4, 1.6, p.z + dx * 2.4], target: [(p.x + o.pos.x) / 2, 1.5, (p.z + o.pos.z) / 2] }, to: { pos: [p.x - dz * 1.6, 1.5, p.z + dx * 1.6], target: [(p.x + o.pos.x) / 2, 1.4, (p.z + o.pos.z) / 2] }, duration: 5, fov: 42, dof: true },
    ], [
      { at: 0.2, fn: () => { Audio.silence(12); Audio.sfx('bell'); world.player.action = 'reach'; world.player.actionDuration = 99; } },
      { at: 1.2, fn: () => say('THE OBSERVER', 'Now you watch.', 3) },
      { at: 3.2, fn: () => { G().setOverlay({ glitch: 1 }); Audio.sfx('glitch'); } },
      { at: 4.6, fn: () => G().setOverlay({ black: 1 }) },
    ], () => { world.player.action = null; G().setOverlay({ glitch: 0 }); Endings.show('OBSERVER'); });
  },

  /** Begins THE LOOP ITSELF: the final interactive sequence in the Core. */
  beginFinal(): void {
    const f = world.final;
    if (f.active) return;
    f.active = true;
    f.stage = 0;
    f.timer = 0;
    world.anchors = [false, false, false, false];
    world.anchorOrder = [];
    if (world.t < at('12:58:30')) world.t = at('12:58:30');
    world.timeScale = 0.3;
    Audio.setMood('DANGER');
    Audio.sfx('resetBoom');
    world.shake = 0.6;
    say('A-13', 'Release sequence armed. This is not permitted. THIS IS NOT PERMITTED.');
    setTimeout(() => say('THE OBSERVER', 'Wake them. My order. Remember.', 3), 3500);
  },

  /** Per-frame update of the final sequence. */
  updateFinal(dt: number): void {
    const f = world.final;
    if (!f.active) return;
    f.timer += dt;
    world.distortion = Math.max(world.distortion * 0.97, 0.25 + f.stage * 0.12);
    world.shake = Math.max(world.shake, 0.08 + f.stage * 0.04);
    if (Math.random() < dt * 0.6) { Audio.sfx(Math.random() < 0.5 ? 'glitch' : 'metal', { volume: 0.4 }); }
    if (Math.random() < dt * 0.25) world.light.flicker = 0.4;
    // the clock is dragged forward in steps as anchors wake (12:59 → :30 → :45 → :55 → :59)
    if (f.stage >= 4 && !f.broken) {
      world.t = at('12:59:59');
      world.frozen = true;
    }
  },

  anchor(i: number): void {
    const r = Puzzles.activateAnchor(i);
    const f = world.final;
    if (r === 'inactive') return;
    if (r === 'wrong') {
      f.stage = 0;
      world.t = Math.min(at('12:59:58'), world.t + 6);
      say('A-13', 'Incorrect. The loop remembers what you forget.');
      return;
    }
    f.stage = world.anchorOrder.length;
    const marks = [at('12:59'), at('12:59:30'), at('12:59:45'), at('12:59:55'), at('12:59:59')];
    world.t = Math.max(world.t, marks[f.stage]);
    world.timeScale = f.stage >= 3 ? 0.18 : 0.3;
    world.shake = 0.7;
    if (r === 'done') Endings.trueEnding();
  },

  /** 12:59:59. The clock stops. Silence. The Observer. The truth. */
  trueEnding(): void {
    const f = world.final;
    f.stage = 5;
    world.frozen = true;
    world.t = at('12:59:59');
    Audio.silence(30);
    Audio.setDuck(0);
    Audio.sfx('bell');
    const o = world.observer;
    const p = world.player.pos;
    o.visible = true; o.opacity = 1; o.cctvOnly = false; o.mode = 'WATCHING';
    o.pos.set(7.5, 0, -19.6);
    o.yaw = Math.atan2(p.x - 7.5, p.z + 19.6);
    sequence.start([
      { at: 2.5, fn: () => {
        Dialogue.open({
          lines: [
            { speaker: 'THE OBSERVER', text: '…' },
            { speaker: 'THE OBSERVER', text: 'Loop four thousand, two hundred and eleven.' },
            { speaker: 'THE OBSERVER', text: 'I held on to the pieces so you could put them together.' },
            { speaker: 'YOU', text: 'Project 13. The anchor. Kane, Maya, A-13. The count. You. All of it.' },
            { speaker: 'THE OBSERVER', text: 'Then it cannot close around us anymore.' },
          ],
          choices: [{ id: 'remember', text: 'REMEMBER.' }],
          onChoice: () => Endings.breakLoop(),
        });
      } },
    ]);
  },

  breakLoop(): void {
    world.final.broken = true;
    G().setPhase('CUTSCENE');
    Cutscenes.shots([
      { from: { pos: [5.5, 1.8, -16], target: [7.5, 2.5, -24.5] }, to: { pos: [7.5, 12, -24.5 + 0.01], target: [7.5, 0, -24.5] }, duration: 6, fov: 60, ease: 'inOut' },
    ], [
      { at: 0.4, fn: () => { Audio.setDuck(1); Audio.sfx('swell', { rate: 0.5 }); world.frozen = false; world.timeScale = 1; } },
      { at: 2.6, fn: () => { G().setOverlay({ flash: 0.6 }); } },
      { at: 3.2, fn: () => { world.t = at('13:00'); G().setOverlay({ title: '13:00:00', subtitle: null }); Audio.sfx('bell'); } },
      { at: 5.2, fn: () => { G().setOverlay({ flash: 1, title: 'LOOP BROKEN' }); } },
    ], () => {
      G().setOverlay({ flash: 0, black: 1, title: null });
      Memory.discoverClue('BREAK_METHOD', true);
      Endings.show('TRUE');
    });
  },
};

