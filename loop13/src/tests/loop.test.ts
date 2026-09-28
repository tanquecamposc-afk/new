/**
 * Headless simulation of complete loops: verifies that time drives events,
 * NPCs follow their schedule, the reset really resets the world, and knowledge survives.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Game } from '../game/Game';
import { G } from '../game/core/store';
import { world } from '../game/core/world';
import { at, LOOP_SECONDS } from '../game/core/constants';
import { Memory } from '../game/systems/MemorySystem';
import { Puzzles } from '../game/systems/PuzzleSystem';
import { LoopSystem } from '../game/systems/LoopSystem';
import { Inventory } from '../game/systems/Inventory';
import { Endings } from '../game/systems/EndingSystem';
import { TRUE_ENDING_REQUIREMENTS } from '../game/data/clues';

const step = (seconds: number, dt = 1 / 30) => { for (let t = 0; t < seconds; t += dt) Game.update(dt); };
const runUntil = (pred: () => boolean, max = 2000, dt = 1 / 20) => { let n = 0; while (!pred() && n++ < max / dt) Game.update(dt); return pred(); };

describe('the loop', () => {
  beforeAll(() => {
    Game.newGame();
    step(15); // wake cutscene (unskippable on first run)
  });

  it('starts at 12:47 in PLAYING after waking up', () => {
    expect(G().phase).toBe('PLAYING');
    expect(world.t).toBeLessThan(10);
    expect(G().run.loop).toBe(1);
  });

  it('runs events at the right times and moves Kane on schedule', () => {
    runUntil(() => world.t >= at('12:48:30'));
    expect(['lab'].includes(world.kane.task)).toBe(true);
    runUntil(() => world.t >= at('12:50:05'));
    expect(world.doors.d_archives.unlocked).toBe(true);
    runUntil(() => world.t >= at('12:51:40'));
    expect(world.kane.task).toBe('security');
    expect(world.kane.pos.distanceTo({ x: 6.3, y: 0, z: 14.35 } as never)).toBeLessThan(1);
    runUntil(() => world.t >= at('12:52:05'));
    expect(world.flags.has('blackout')).toBe(true);
    expect(world.light.mode).toBe('blackout');
    runUntil(() => world.t >= at('12:53'));
    expect(world.flags.has('blackout')).toBe(false);
    runUntil(() => world.t >= at('12:55:40'));
    expect(world.kane.task).toBe('archives');
    expect(world.observer.cctvOnly).toBe(true);
    runUntil(() => world.t >= at('12:58'));
    expect(world.kane.present).toBe(false);
    expect(world.light.alarm).toBe(true);
  });

  it('resets at 13:00, keeps knowledge, rebuilds the world', () => {
    Memory.discoverClue('SECURITY_CODE');
    Puzzles.submitKeypad('7391');
    world.pickups.lab_tool = false;
    Inventory.add('tool');
    expect(world.keypadSolved).toBe(true);
    runUntil(() => G().phase === 'RESET');
    expect(world.t).toBeGreaterThanOrEqual(LOOP_SECONDS - 1);
    runUntil(() => G().phase === 'CUTSCENE' || G().phase === 'PLAYING', 20);
    expect(G().run.loop).toBe(2);
    expect(world.t).toBeLessThan(1);
    expect(world.keypadSolved).toBe(false);
    expect(world.inventory).toEqual([]);
    expect(world.pickups.lab_tool).toBe(true);
    expect(world.kane.present).toBe(true);
    expect(G().run.clues).toContain('SECURITY_CODE');
    expect(G().run.clues).toContain('LOOP_13MIN');
    expect(G().profile.achievements).toContain('FIRST_LOOP');
  });

  it('never duplicates rewards', () => {
    const n = G().run.clues.length;
    expect(Memory.discoverClue('SECURITY_CODE')).toBe(false);
    expect(G().run.clues.length).toBe(n);
    Memory.findSecret('POD');
    Memory.findSecret('POD');
    expect(G().run.secrets.filter((s) => s === 'POD').length).toBe(1);
  });

  it('death resets the loop without losing knowledge', () => {
    step(8);
    world.player.health = 0;
    step(0.2);
    expect(G().phase).toBe('DEATH');
    runUntil(() => G().phase === 'CUTSCENE' || G().phase === 'PLAYING', 20);
    expect(G().run.loop).toBe(3);
    expect(G().run.clues).toContain('FIRST_DEATH');
    expect(G().profile.achievements).toContain('NOT_THE_END');
  });

  it('timed relays only accept their window; all three unlock 13 MINUTES', () => {
    step(8);
    Puzzles.engageRelay('A');
    expect(world.relays.A).toBe(false);
    world.t = at('12:50:10'); Puzzles.engageRelay('A');
    world.t = at('12:54:10'); Puzzles.engageRelay('B');
    world.t = at('12:58:10'); Puzzles.engageRelay('C');
    expect(world.relays).toEqual({ A: true, B: true, C: true });
    expect(G().profile.achievements).toContain('THIRTEEN_MINUTES');
    expect(Puzzles.submitSymbols(['tri', 'circle', 'diamond', 'cross'])).toBe(true);
  });

  it('true ending: anchors in order stop the clock at 12:59:59', () => {
    for (const c of TRUE_ENDING_REQUIREMENTS) Memory.discoverClue(c, true);
    expect(Endings.missingForTrue()).toEqual([]);
    world.player.pos.set(7.5, 0, -18);
    Endings.beginFinal();
    Endings.anchor(0); // ◇ first is wrong
    expect(world.anchorOrder).toEqual([]);
    for (const i of [1, 3, 0, 2]) Endings.anchor(i);
    expect(world.final.stage).toBe(5);
    expect(world.frozen).toBe(true);
    const t = world.t;
    step(2);
    expect(world.t).toBe(t);
    Endings.breakLoop();
    runUntil(() => G().phase === 'ENDING', 30);
    expect(G().profile.endings).toContain('TRUE');
    expect(G().profile.ngPlusUnlocked).toBe(true);
    LoopSystem.quitToMenu();
    expect(G().phase).toBe('MENU');
  });
});
