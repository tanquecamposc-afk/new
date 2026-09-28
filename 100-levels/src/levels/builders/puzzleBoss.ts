/**
 * Level 20 — THE MASTER. An intellectual boss: its shield can only be broken by
 * solving the puzzles it conjures (memory, light beams, glyph codes) while it
 * attacks and reshapes the temple. Each solved puzzle drops the shield briefly.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { buildBossLevel } from './bossArena';
import { templeMats } from './puzzle';
import { MemoryTiles, Mirror, LightBeam, GlyphTablet, CodePanel, GLYPHS } from '../../entities/Puzzle';
import { MovingPlatform } from '../../entities/Platforms';
import { Entity } from '../../entities/Entity';
import { Boss } from '../../bosses/Boss';
import { M } from '../../gfx/Materials';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import { buildDiscArena } from './bossArena';

export function buildMaster(s: Session): LevelLogic {
  let boss!: Boss;
  const cleanup: Entity[] = [];
  let round = 0;
  let windowT = 0;
  let phaseAtWindow = 0;
  const { floor } = templeMats();
  const clear = () => {
    cleanup.forEach((e) => e.destroy());
    cleanup.length = 0;
  };
  const add = <T extends Entity>(e: T) => {
    s.add(e);
    cleanup.push(e);
    return e;
  };
  const shieldDown = () => {
    clear();
    boss.vulnerable = true;
    boss.syncHud();
    windowT = 10;
    phaseAtWindow = boss.phase;
    Audio.play('shield', { pitch: 0.5 });
    s.post.flashScreen(0xb48cff, 0.4, 2);
    useGame.getState().showBanner({ title: 'SHIELD DOWN', subtitle: 'Strike the core now!', color: '#b48cff' }, 2200);
  };
  const startRound = () => {
    const kind = round % 3;
    const c = new THREE.Vector3(0, 0, -6);
    if (kind === 0) {
      const t = add(new MemoryTiles(c, 3, [3 + Math.min(2, Math.floor(round / 3)), 4 + Math.min(2, Math.floor(round / 3))], shieldDown, 2.6));
      s.after(1.2, () => t.start());
      s.toast('🧠', 'THE MASTER', 'Repeat my sequence... if you can.');
    } else if (kind === 1) {
      const mirrors = [add(new Mirror(new THREE.Vector3(-6, 0, -8), 0)), add(new Mirror(new THREE.Vector3(6, 0, -8), 1)), add(new Mirror(new THREE.Vector3(6, 0, 2), 0)), add(new Mirror(new THREE.Vector3(-6, 0, 2), 1))];
      add(new LightBeam(new THREE.Vector3(-14, 1.3, -8), new THREE.Vector3(1, 0, 0), mirrors, new THREE.Vector3(0, 1.3, 2), shieldDown, 0xb48cff));
      s.toast('🔆', 'THE MASTER', 'Bend the light into my crystal.');
    } else {
      const code = [0, 1, 2].map(() => Math.floor(Math.random() * 6));
      const spots = [new THREE.Vector3(-14, 1.8, 6), new THREE.Vector3(14, 1.8, 6), new THREE.Vector3(0, 1.8, -17)];
      code.forEach((g, i) => add(new GlyphTablet(spots[i], i === 2 ? 0 : i === 0 ? Math.PI / 2 : -Math.PI / 2, GLYPHS[g], i)));
      add(new CodePanel(new THREE.Vector3(0, 0, -8), Math.PI, code, [0, 1, 2, 3, 4, 5], shieldDown));
      s.toast('🔣', 'THE MASTER', 'Read my glyphs. Enter the code.');
    }
    s.progress = `Puzzle ${round + 1}: ${['MEMORY', 'LIGHT', 'GLYPHS'][kind]}`;
  };
  const logic = buildBossLevel(s, {
    bossId: 'master',
    radius: 20,
    customFloor: (b, c, r) => {
      buildDiscArena(b, c, r, floor, 0xb48cff);
      // Rotating platform ring the Master uses to reshape the arena
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const p1 = new THREE.Vector3(Math.cos(a) * 12, 0.3, Math.sin(a) * 12);
        const p2 = new THREE.Vector3(Math.cos(a + Math.PI / 2) * 12, 0.3, Math.sin(a + Math.PI / 2) * 12);
        b.add(new MovingPlatform([p1, p2], new THREE.Vector3(3, 0.6, 3), M.hex(0xb48cff), 2, false, i * 0.25, 2));
      }
    },
    objective: 'Solve the Master\'s puzzles to break its shield',
    onBossReady: (bb) => {
      boss = bb;
      boss.pos.set(0, 0, 10);
    },
    update: (dt) => {
      if (!boss || boss.dead) return;
      if (s.state !== 'playing') return;
      if (!cleanup.length && !boss.vulnerable) startRound();
      if (boss.vulnerable) {
        windowT -= dt;
        s.progress = `Shield down: ${Math.ceil(windowT)}s`;
        if (windowT <= 0 || boss.phase > phaseAtWindow) {
          boss.vulnerable = false;
          boss.syncHud();
          round++;
          Audio.play('shield');
          if (boss.phase > phaseAtWindow) s.toast('🛡', 'THE MASTER', 'Impressive... but can you think faster?');
          else s.toast('🛡', 'SHIELD RESTORED', 'Solve another puzzle.');
        }
      }
    },
  });
  return { ...logic, theme: 'temple', ambient: ['hum', 'drone'] };
}
