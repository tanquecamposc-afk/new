/**
 * WORLD 10 — CHAOS (levels 91-99) and the SECRET levels. Chaos levels combine
 * the mechanics of previous worlds; the Final Trial chains parkour, a puzzle
 * chamber, a combat arena and a boss into one run.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { buildParkour } from './parkour';
import { buildPuzzleWorld, templeMats, buildPuzzle } from './puzzle';
import { buildRacing } from './racing';
import { buildHorror } from './horror';
import { buildStealth } from './stealth';
import { buildSurvival } from './survival';
import { buildCombat, buildRoom, WaveDirector } from './combat';
import { buildBossLevel, buildDiscArena } from './bossArena';
import { Course } from './parkourKit';
import { Enemy, EnemyKind } from '../../enemies/Enemy';
import { Boss } from '../../bosses/Boss';
import { BOSSES } from '../../bosses/BossDefs';
import { MovingPlatform, LaunchPad } from '../../entities/Platforms';
import { M, mat } from '../../gfx/Materials';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import { rand } from '../../core/math';

export function buildChaos(s: Session, variant: string): LevelLogic {
  switch (variant) {
    case 'parkour_combat': {
      const kinds: EnemyKind[] = ['grunt', 'archer', 'grunt', 'charger', 'knight', 'archer'];
      let k = 0;
      const logic = buildParkour(s, 'gauntlet', {
        diffBoost: 0.1,
        onPad: (c) => {
          const e = new Enemy(kinds[k++ % kinds.length], c.clone().add(new THREE.Vector3(rand(-2, 2), 0.1, rand(-1, 1))), 0, 0.8);
          e.aggressive = false;
          s.add(e);
          s.enemiesTotal++;
        },
      });
      return { ...logic, theme: 'chaos', music: 'chaos', combat: true, abilityMode: 'weapon', objective: 'Fight your way across the sky course' };
    }
    case 'puzzle_time': {
      const logic = buildPuzzleWorld(s, 'mixed');
      return { ...logic, theme: 'chaos', music: 'chaos', timeLimit: 240, objective: 'Solve every chamber before time runs out' };
    }
    case 'racing_obstacles':
      return { ...buildRacing(s, 'chaos'), theme: 'chaos', music: 'chaos' };
    case 'horror_chase':
      return { ...buildHorror(s, 'pursuit'), music: 'watcher' };
    case 'stealth_combat':
      return { ...buildStealth(s, 'stealth_combat'), theme: 'chaos', music: 'chaos' };
    case 'survival':
      return { ...buildSurvival(s, 'survival'), music: 'chaos' };
    case 'boss_parkour':
      return buildSkyDuel(s);
    case 'legion':
      return { ...buildCombat(s, 'legion'), theme: 'chaos', music: 'chaos', objective: 'Defeat every enemy you have ever fought' };
    case 'final_trial':
      return buildFinalTrial(s);
  }
  return buildParkour(s, 'gauntlet');
}

/** Level 97: boss fight on moving floating platforms. */
function buildSkyDuel(s: Session): LevelLogic {
  return {
    ...buildBossLevel(s, {
      bossId: 'skyduel',
      radius: 26,
      customFloor: (b, c) => {
        // Central island + ring of floating & moving platforms
        b.plat(c.x, c.y, c.z, 10, 10, M.tech(0x40e0ff));
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const r = 15;
          const p = new THREE.Vector3(Math.cos(a) * r, c.y + (i % 3) * 1.2, Math.sin(a) * r);
          if (i % 2) {
            const q = new THREE.Vector3(Math.cos(a + 0.4) * (r - 6), p.y, Math.sin(a + 0.4) * (r - 6));
            b.add(new MovingPlatform([p, q], new THREE.Vector3(4, 0.6, 4), M.metal(), 2.2, false, i * 0.1, 0.8));
          } else b.plat(p.x, p.y, p.z, 5, 5, M.tech(0x40e0ff));
        }
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.3;
          b.add(new LaunchPad(new THREE.Vector3(Math.cos(a) * 4, c.y + 0.06, Math.sin(a) * 4), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 13, 9, 0x40e0ff));
        }
        b.coins.addLine(new THREE.Vector3(-3, 1, 0), new THREE.Vector3(3, 1, 0), 4);
      },
    }),
    theme: 'chaos',
    killY: -25,
    spawn: new THREE.Vector3(0, 0.05, -3),
  };
}

/** Level 99: Parkour → puzzle chamber → combat arena → boss, in one continuous run. */
function buildFinalTrial(s: Session): LevelLogic {
  const b = new Builder(s, 9999);
  // Stage 1: parkour ascent from the start
  const course = new Course(b, new THREE.Vector3(0, 0, 0), 0.7, M.tech(0xff2d55), 0xff2d55);
  course.hints = false;
  course.plat(0, 0, 0, 10, 10);
  course.advance(5);
  course.seg('gaps', 3);
  course.pad(6, 7, true);
  course.seg('lasers', 3);
  course.pad(6, 7, true);
  course.seg('vanish', 2);
  course.pad(6, 7, true);
  course.seg('spinners', 1);
  // Stage 2: puzzle chamber (memory)
  const { wall, floor } = templeMats();
  course.advance(2);
  const pc = course.P(0, 0, 11);
  course.plat(0, 0, 1, 5, 2);
  const doors = buildRoom(b, pc, 20, wall, floor, { north: true, south: true }, false);
  doors.south?.open();
  buildPuzzle('memory', { s, b, c: pc, size: 20, done: () => doors.north?.open(), timeScale: s.diff.timeLimit });
  // Stage 3: combat arena
  const ac = pc.clone().add(new THREE.Vector3(0, 0, 25));
  b.plat(ac.x, ac.y, ac.z - 13, 5, 6, floor);
  const director = s.add(new WaveDirector(b));
  const rd = buildRoom(b, ac.clone().add(new THREE.Vector3(0, 0, 2)), 22, mat('arenaWall', { tex: 'brick', color: 0x8a8278, roughness: 0.9 }), M.sand(), { north: true, south: true });
  rd.south?.open();
  director.addRoom({ center: ac.clone().add(new THREE.Vector3(0, 0, 2)), size: 22, waves: [['knight', 'archer', 'grunt'], ['brute', 'charger', 'shaman', 'exploder']], entry: rd.south, exit: rd.north });
  // Stage 4: boss disc
  const bc = ac.clone().add(new THREE.Vector3(0, 0, 38));
  b.plat(bc.x, bc.y, bc.z - 20, 5, 8, floor);
  buildDiscArena(b, bc, 18, M.darkMarble(), 0xff2d55);
  const boss = s.add(new Boss(BOSSES.demon, bc.clone().add(new THREE.Vector3(0, 0, 8)), 0.55));
  boss.arenaRadius = 18;
  boss.noAutoWin = true;
  boss.yaw = Math.PI;
  s.addDamageable(boss);
  const goal = b.goal(bc.clone().add(new THREE.Vector3(0, 0, 12)), true, 0xffd23d);
  boss.onDefeated = () => {
    goal.setLocked(false);
    useGame.getState().showBanner({ title: 'TRIAL COMPLETE', subtitle: 'Only one level remains', color: '#ffd23d', big: true }, 3000);
  };
  let bossStarted = false;
  let stage = 1;
  b.finalize();
  return {
    spawn: new THREE.Vector3(0, 0.05, -2),
    spawnYaw: 0,
    theme: 'chaos',
    music: 'chaos',
    ambient: ['wind', 'hum'],
    objective: 'FINAL TRIAL: parkour, puzzle, arena, boss',
    abilityMode: 'weapon',
    combat: true,
    killY: -25,
    update: () => {
      const z = s.player.pos.z;
      const ns = z > bc.z - 20 ? 4 : z > ac.z - 13 ? 3 : z > pc.z - 11 ? 2 : 1;
      if (ns !== stage) {
        stage = ns;
        useGame.getState().showBanner({ title: `TRIAL ${stage}/4`, subtitle: ['', 'PARKOUR', 'PUZZLE', 'COMBAT', 'BOSS'][stage], color: '#ff2d55' }, 1800);
        s.setCheckpoint(s.player.pos.clone(), 0);
      }
      if (stage === 4 && !bossStarted && s.player.pos.z > bc.z - 16) {
        bossStarted = true;
        boss.start();
        Audio.playMusic('demon');
        boss.model.action?.('roar');
        Audio.play('roar');
      }
      if (stage === 4) s.rig.frameTarget = boss.dead ? null : boss.center;
      s.progress = `Stage ${stage}/4`;
    },
    onPlayerFell: () => {
      s.player.hp -= 15;
      s.damageTaken += 15;
      if (s.player.hp <= 0) {
        s.player.die();
        return true;
      }
      s.respawnAtCheckpoint();
      return true;
    },
  };
}

// ── Secret levels ─────────────────────────────────────────────────────────────
export function buildSecret(s: Session, variant: string): LevelLogic {
  switch (variant) {
    case 'classic': {
      const l = buildParkour(s, 'basics', { retro: true, theme: 'classic', music: 'classic', turns: false, plan: [['steps', 4], ['gaps', 5], ['moving', 2], ['gaps', 4]] });
      return { ...l, objective: 'Classic Mode — collect every coin!' };
    }
    case 'impossible':
      return { ...buildParkour(s, 'gauntlet', { diffBoost: 0.6, plan: [['gaps', 5], ['vanish', 4], ['spinners', 3], ['lasers', 5], ['crushers', 5], ['moving', 3], ['wind', 3], ['vanish', 4]] }), theme: 'chaos', music: 'chaos', objective: 'Impossible Parkour. Good luck.' };
    case 'speedrun':
      return { ...buildParkour(s, 'speed', { plan: [['speed', 3], ['gaps', 2], ['speed', 3], ['moving', 1], ['speed', 2]], turns: false }), objective: 'SPEEDRUN — beat 40 seconds!', theme: 'highway' };
    case 'tiny':
      return buildTiny(s);
    case 'infinite':
      return buildInfiniteBoss(s);
  }
  return buildParkour(s, 'basics');
}

/** You are tiny: a giant room of furniture to climb. */
function buildTiny(s: Session): LevelLogic {
  const b = new Builder(s, 555);
  const wood = M.wood();
  const floor = M.planks();
  b.plat(0, 0, 0, 160, 160, floor, 2, { tile: 12 });
  // Walls with wallpaper
  for (const [x, z, w, d] of [[0, 80, 160, 2], [0, -80, 160, 2], [80, 0, 2, 160], [-80, 0, 2, 160]]) b.box(new THREE.Vector3(x, 40, z), new THREE.Vector3(w, 80, d), M.wallpaper(), { tile: 16 });
  // A giant chair (seat 22 high), table (38 high), books, mug, pencils
  const leg = (x: number, z: number, h: number, t = 3) => b.box(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(t, h, t), wood, { tile: 4 });
  // Stack of books to start the climb
  const books = [[0, 2, 18, 12, 0x8a2020], [2, 5, 16, 11, 0x20408a], [-1, 8, 17, 12, 0x208a40], [1, 11, 15, 10, 0x8a7a20]];
  books.forEach(([x, y, w, d, c], i) => b.box(new THREE.Vector3(x - 20, y, 10 + i * 0.5), new THREE.Vector3(w, 3, d), mat('book' + c, { color: c as number, roughness: 0.7 }), { tile: 6 }));
  // Chair
  const cx = -20, cz = 30;
  for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) leg(cx + dx, cz + dz, 22);
  b.plat(cx, 23, cz, 22, 22, wood, 2);
  b.box(new THREE.Vector3(cx, 38, cz + 10), new THREE.Vector3(22, 30, 2), wood);
  // Table
  const tx = 15, tz = 40;
  for (const [dx, dz] of [[-22, -14], [22, -14], [-22, 14], [22, 14]]) leg(tx + dx, tz + dz, 38, 4);
  b.plat(tx, 39, tz, 50, 34, wood, 2);
  // Bridge from chair to table: pencils
  b.box(new THREE.Vector3(-4, 25, 32), new THREE.Vector3(14, 1.4, 1.4), mat('pencil', { color: 0xffc830, roughness: 0.5 }));
  b.box(new THREE.Vector3(2.5, 29, 36), new THREE.Vector3(1.4, 1.4, 12), mat('pencil', { color: 0xffc830, roughness: 0.5 }));
  b.plat(4, 31, 42, 6, 6, mat('eraser', { color: 0xff8090, roughness: 0.9 }), 4);
  b.plat(8, 35, 36, 5, 5, mat('eraser', { color: 0xff8090, roughness: 0.9 }), 4);
  // Mug on the table with the goal
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 11, 24, 1, true), mat('mug', { color: 0xf0f0f0, roughness: 0.2, side: THREE.DoubleSide }));
  mug.position.set(tx + 12, 45.5, tz + 6);
  b.deco(mug);
  b.box(new THREE.Vector3(tx + 12, 40.5, tz + 6), new THREE.Vector3(10, 1, 10), mat('coffee', { color: 0x3a2010 }), { collide: true });
  // Coins trail
  b.coins.addLine(new THREE.Vector3(-20, 14, 10), new THREE.Vector3(-20, 25, 26), 6);
  b.coins.addLine(new THREE.Vector3(-8, 27, 32), new THREE.Vector3(2, 31, 42), 6);
  b.coins.addLine(new THREE.Vector3(0, 41, 40), new THREE.Vector3(30, 41, 40), 8);
  b.goal(new THREE.Vector3(tx - 10, 40, tz), false, 0xffe066);
  b.light(new THREE.Vector3(0, 70, 20), 0xfff0d0, 300, 140);
  b.finalize();
  return {
    spawn: new THREE.Vector3(-20, 0.05, -5),
    spawnYaw: 0,
    theme: 'training',
    music: 'classic',
    ambient: ['hum'],
    objective: 'You are tiny. Climb to the top of the table.',
    abilityMode: 'airdash',
    combat: false,
    killY: -10,
  };
}

/** Endless boss gauntlet: defeat three bosses in a row to clear, then keep going for glory. */
function buildInfiniteBoss(s: Session): LevelLogic {
  const order = ['guardian', 'fire', 'ice', 'lightning', 'shadow', 'storm', 'earth', 'serpent', 'ancient', 'demon', 'destroyer'];
  let n = 0;
  let current: Boss | null = null;
  const logic = buildBossLevel(s, {
    bossId: order[0],
    radius: 22,
    hpMul: 0.5,
    onBossReady: (bb) => {
      current = bb;
      bb.noAutoWin = true;
      bb.onDefeated = () => next();
    },
    update: () => {
      s.progress = `Bosses defeated: ${n} · clear at 3`;
    },
  });
  const next = () => {
    n++;
    s.player.heal(40);
    if (n === 3) useGame.getState().showBanner({ title: 'INFINITE BOSS CLEARED', subtitle: 'Three gods have fallen', color: '#ffe066', big: true }, 3000);
    if (n === 3) s.after(0.5, () => s.win());
    s.after(3, () => {
      if (s.disposed || s.state !== 'playing') return;
      const def = BOSSES[order[n % order.length]];
      const bb = s.add(new Boss(def, new THREE.Vector3(0, 0, 9), 0.5 + n * 0.15));
      bb.noAutoWin = true;
      bb.arenaRadius = 22;
      bb.onDefeated = () => next();
      s.addDamageable(bb);
      current = bb;
      bb.start();
      Audio.playMusic(def.id);
      useGame.getState().showBanner({ title: def.name, subtitle: `Boss #${n + 1}`, color: '#ff4d4d', big: true }, 2000);
    });
  };
  void current;
  return { ...logic, objective: 'Defeat bosses back to back', theme: 'chaos' };
}
