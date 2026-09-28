/**
 * Puzzles:
 *  1 SECURITY  – keypad code (7391)
 *  2 POWER     – restart three generators with the Tool (hold)
 *  3 MEMORY    – recall the four symbols at the antechamber panel
 *  4 CAMERAS   – the symbols are only visible on CAM-03 at 12:55
 *  5 TIME      – engage relays A/B/C inside their own windows, same loop
 *  6 CORE      – wake the four anchors in the Observer's order before 13:00
 */
import { RELAY_WINDOWS, SECURITY_CODE, SYMBOL_SEQUENCE, formatClock, type RelayId, type SymbolId } from '../core/constants';
import { world } from '../core/world';
import { G } from '../core/store';
import { Audio } from '../audio/AudioEngine';
import { Memory, Achievements } from './MemorySystem';
import { say } from './Voice';
import { backupPower } from './DoorSystem';
import { playAction } from './PlayerSystem';

export const GENERATOR_POS: [number, number, number][] = [[-11, 1, 20.1], [9, 1, 20.1], [29.6, 1, 23.9]];
export const RELAY_POS: Record<RelayId, [number, number, number]> = { A: [-2.7, 1.4, 16], B: [-2.3, 1.4, -13], C: [20, 1.4, 25.65] };
/** Glyph engraved on each Core anchor (anchor index → symbol). */
export const ANCHOR_GLYPH: SymbolId[] = ['diamond', 'tri', 'cross', 'circle'];

export const Puzzles = {
  submitKeypad(code: string): boolean {
    if (code === SECURITY_CODE) {
      world.keypadSolved = true;
      Audio.sfx('keypadOk', { pos: { x: 7, y: 1.4, z: 8 } });
      Memory.discoverClue('SECURITY_CODE', Memory.hasClue('SECURITY_CODE'));
      Achievements.unlock('CODEBREAKER');
      return true;
    }
    Audio.sfx('keypadBad', { pos: { x: 7, y: 1.4, z: 8 } });
    return false;
  },

  submitSymbols(seq: SymbolId[]): boolean {
    const ok = seq.length === 4 && seq.every((s, i) => s === SYMBOL_SEQUENCE[i]);
    if (ok) {
      world.symbolSolved = true;
      Audio.sfx('keypadOk', { pos: { x: 7.7, y: 1.4, z: -12.8 } });
      Memory.discoverClue('CORE_ACCESS');
      const relaysOk = world.relays.A && world.relays.B && world.relays.C;
      say('A-13', relaysOk ? 'Pattern accepted. Temporal sync confirmed. The Core is… open.' : 'Pattern accepted. Temporal sync incomplete: relays not engaged.');
    } else {
      Audio.sfx('keypadBad', { pos: { x: 7.7, y: 1.4, z: -12.8 } });
    }
    return ok;
  },

  engageRelay(id: RelayId): void {
    const w = RELAY_WINDOWS[id];
    const t = world.t;
    const pos = { x: RELAY_POS[id][0], y: 1.4, z: RELAY_POS[id][2] };
    if (world.relays[id]) { say('A-13', `Relay ${id} already synchronized.`); return; }
    playAction('interact', 0.8);
    if (t >= w.start && t < w.end) {
      world.relays[id] = true;
      Audio.sfx('relay', { pos });
      say('A-13', `Relay ${id} synchronized at ${formatClock(t, true)}.`);
      Memory.discoverClue('SYNC_PROTOCOL');
      if (world.relays.A && world.relays.B && world.relays.C) {
        Memory.discoverClue('RELAY_TIMES');
        Achievements.unlock('THIRTEEN_MINUTES');
        say('A-13', 'All relays synchronized. This has not happened in a very long time.');
      }
    } else {
      Audio.sfx('doorLocked', { pos });
      world.shake = 0.15;
      say('A-13', `Relay ${id}: synchronization rejected. Outside of window.`);
    }
  },

  restartGenerator(i: number): void {
    if (world.generators[i]) return;
    world.generators[i] = true;
    const [x, , z] = GENERATOR_POS[i];
    Audio.sfx('generator', { pos: { x, y: 1, z } });
    Memory.discoverClue('GENERATORS');
    const n = world.generators.filter(Boolean).length;
    G().pushNotification({ kind: 'info', title: 'AUXILIARY POWER', text: `Generator G${i + 1} online — ${n}/3` });
    if (backupPower()) {
      Audio.sfx('powerUp');
      Memory.discoverClue('BACKUP_POWER');
      Achievements.unlock('POWER_TRIP');
      say('A-13', 'Auxiliary power restored. That was… unnecessary.');
    }
  },

  /** Final sequence: anchors must be woken in the Observer's order. */
  activateAnchor(i: number): 'ok' | 'wrong' | 'done' | 'inactive' {
    if (!world.final.active) return 'inactive';
    if (world.anchors[i]) return 'ok';
    const expected = SYMBOL_SEQUENCE[world.anchorOrder.length];
    if (ANCHOR_GLYPH[i] === expected) {
      world.anchors[i] = true;
      world.anchorOrder.push(i);
      Audio.sfx('anchor', { rate: 1 + world.anchorOrder.length * 0.12 });
      return world.anchorOrder.length === 4 ? 'done' : 'ok';
    }
    // wrong: everything resets and the loop pushes back
    world.anchors = [false, false, false, false];
    world.anchorOrder = [];
    Audio.sfx('glitch');
    Audio.sfx('keypadBad');
    world.shake = 0.8;
    world.distortion = 1;
    return 'wrong';
  },
};
