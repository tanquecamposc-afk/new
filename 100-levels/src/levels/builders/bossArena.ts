/**
 * Boss arenas (themed per boss) + the shared boss-level flow:
 * cinematic introduction → fight → slow-motion death → victory.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Boss, BossDef } from '../../bosses/Boss';
import { BOSSES } from '../../bosses/BossDefs';
import { M, glowMat, mat, cachedGeo } from '../../gfx/Materials';
import { columns, rocks, cityBackdrop, forest, Crowd, Water } from '../Decor';
import { KillZone } from '../../entities/Hazards';
import { Audio, AmbientName } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import type { Shot } from '../../camera/CameraRig';

interface ArenaStyle {
  theme: string;
  floor: THREE.Material;
  ambient: AmbientName[];
  deco: (b: Builder, c: THREE.Vector3, r: number) => void;
}

const ringPositions = (c: THREE.Vector3, r: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
  });

const STYLES: Record<string, ArenaStyle> = {
  guardian: { theme: 'city', floor: M.tech(0x34d4ff), ambient: ['wind', 'city'], deco: (b, c) => cityBackdrop(b, c.clone().setY(0), 60, 200, 70) },
  warrior: {
    theme: 'arena', floor: M.sand(), ambient: ['crowd', 'wind'],
    deco: (b, c, r) => {
      b.add(new Crowd(b, r + 2, 6, c.y));
      columns(b, ringPositions(c, r + 1, 12), 9, M.marble());
    },
  },
  fire: {
    theme: 'boss_fire', floor: M.darkRock(), ambient: ['lava', 'fire'],
    deco: (b, c, r) => {
      const lava = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.lava());
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(c.x, c.y - 3, c.z);
      b.deco(lava);
      rocks(b, c, r + 3, r + 30, 40, M.darkRock(), [1, 5]);
    },
  },
  ice: {
    theme: 'boss_ice', floor: M.ice(), ambient: ['wind'],
    deco: (b, c, r) => {
      const geo = cachedGeo('iceShard', () => new THREE.ConeGeometry(1, 6, 5).translate(0, 3, 0));
      b.instanced(geo, M.ice(), ringPositions(c, r + 4, 18).map((p, i) => ({ pos: p, rot: new THREE.Euler(0.2 * Math.sin(i), i, 0.2 * Math.cos(i)), scale: new THREE.Vector3(1 + (i % 3), 1 + (i % 4) * 0.8, 1 + (i % 2)) })));
      rocks(b, c, r + 8, r + 40, 30, M.ice(), [2, 6]);
    },
  },
  lightning: {
    theme: 'boss_lightning', floor: M.hex(0x6080ff), ambient: ['wind', 'hum'],
    deco: (b, c, r) => {
      columns(b, ringPositions(c, r + 1, 8), 12, M.darkMetal(), 0.5, 0x90a8ff);
      for (const p of ringPositions(c, r + 1, 8)) b.lamp(p.clone().setY(p.y + 12.6), 0x90a8ff, 0.6);
    },
  },
  shadow: {
    theme: 'boss_shadow', floor: M.darkMarble(), ambient: ['drone'],
    deco: (b, c, r) => {
      columns(b, ringPositions(c, r + 1, 10), 7, M.darkMarble(), 0.6, 0x9030ff);
    },
  },
  storm: {
    theme: 'boss_storm', floor: M.rock(), ambient: ['rain', 'wind'],
    deco: (b, c, r) => {
      rocks(b, c, r + 2, r + 30, 40, M.rock(), [1, 5]);
      b.add(new Water(c.y - 6, 600, 0x203040, c));
    },
  },
  earth: {
    theme: 'boss_earth', floor: M.dirt(), ambient: ['wind'],
    deco: (b, c, r) => {
      rocks(b, c, r + 1, r + 12, 50, M.rock(), [1.5, 5]);
      forest(b, c, r + 14, r + 50, 80);
    },
  },
  serpent: {
    theme: 'boss_serpent', floor: mat('serpFloor', { tex: 'tiles', color: 0x5a8a70, roughness: 0.6 }), ambient: ['waves', 'drone'],
    deco: (b, c, r) => {
      columns(b, ringPositions(c, r + 1, 10), 8, mat('jade', { tex: 'marble', color: 0x60a080, roughness: 0.3 }), 0.6, 0x40ff90);
      b.add(new Water(c.y - 2, 600, 0x1a5a4a, c));
    },
  },
  ancient: {
    theme: 'boss_ancient', floor: mat('goldFloor', { tex: 'tiles', color: 0xc0a878, roughness: 0.55, metalness: 0.1 }), ambient: ['wind', 'hum'],
    deco: (b, c, r) => {
      columns(b, ringPositions(c, r + 1, 14), 11, mat('sandstone', { tex: 'marble', color: 0xd8b880 }), 0.7, 0xffd040);
    },
  },
  demon: {
    theme: 'boss_demon', floor: M.darkRock(), ambient: ['lava', 'drone'],
    deco: (b, c, r) => {
      const lava = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.lava());
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(c.x, c.y - 4, c.z);
      b.deco(lava);
      const spike = cachedGeo('demonSpike', () => new THREE.ConeGeometry(1.2, 10, 6).translate(0, 5, 0));
      b.instanced(spike, M.darkRock(), ringPositions(c, r + 3, 16).map((p, i) => ({ pos: p, rot: new THREE.Euler(0.15 * Math.sin(i * 2), 0, 0.15 * Math.cos(i * 3)), scale: new THREE.Vector3(1, 0.6 + (i % 3) * 0.4, 1) })));
    },
  },
  destroyer: {
    theme: 'boss_destroyer', floor: M.tech(0xff2040), ambient: ['hum', 'wind'],
    deco: (b, c, r) => {
      cityBackdrop(b, c.clone().setY(c.y - 20), r + 30, 220, 60, 0xff8080);
      columns(b, ringPositions(c, r + 1, 8), 14, M.darkMetal(), 0.8, 0xff2040);
    },
  },
  skyduel: { theme: 'chaos', floor: M.tech(0x40e0ff), ambient: ['wind'], deco: () => {} },
};

export interface BossLevelOpts {
  bossId: string;
  hpMul?: number;
  radius?: number;
  y?: number;
  /** Build the arena floor (default: disc floor with invisible ring wall). */
  customFloor?: (b: Builder, c: THREE.Vector3, r: number) => void;
  onBossReady?: (boss: Boss) => void;
  objective?: string;
  update?: (dt: number, boss: Boss) => void;
}

export function buildBossLevel(s: Session, o: BossLevelOpts): LevelLogic {
  const def: BossDef = BOSSES[o.bossId];
  const style = STYLES[o.bossId] ?? STYLES.guardian;
  const b = new Builder(s, s.meta.num * 31 + 3);
  const R = o.radius ?? def.arenaRadius ?? 20;
  const c = new THREE.Vector3(0, o.y ?? 0, 0);
  if (o.customFloor) o.customFloor(b, c, R);
  else buildDiscArena(b, c, R, style.floor, def.color);
  style.deco(b, c, R);
  const boss = s.add(new Boss(def, c.clone().add(new THREE.Vector3(0, 0, 9)), o.hpMul ?? 1));
  boss.yaw = Math.PI;
  boss.arenaRadius = R;
  s.addDamageable(boss);
  o.onBossReady?.(boss);
  // A few coins around the arena and a potion chest early bosses
  for (const p of ringPositions(c, R * 0.7, 10)) b.coin(p.x, p.y + 1, p.z);
  b.finalize();
  const spawn = c.clone().add(new THREE.Vector3(0, 0.05, -R * 0.55));
  s.killY = c.y - 20;
  const starter = startBossWhenReady(s, boss);

  return {
    spawn,
    spawnYaw: 0,
    theme: style.theme,
    music: 'final_calm',
    ambient: style.ambient,
    objective: o.objective ?? `Defeat ${def.name}`,
    abilityMode: 'weapon',
    killY: c.y - 20,
    intro: () => bossIntro(s, boss, spawn),
    update: (dt) => {
      starter();
      o.update?.(dt, boss);
      s.rig.frameTarget = boss.dead ? null : boss.center;
    },
    onPlayerFell: () => {
      s.player.hp -= 20;
      s.damageTaken += 20;
      if (s.player.hp <= 0) {
        s.player.die();
        return true;
      }
      s.respawnAtCheckpoint();
      return true;
    },
    bossId: o.bossId,
  };
}

export function buildDiscArena(b: Builder, c: THREE.Vector3, R: number, floor: THREE.Material, color: number) {
  // Visual disc
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 1, 2, 64), floor);
  const uv = disc.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * R * 0.5, uv.getY(i) * R * 0.5);
  disc.position.set(c.x, c.y - 1, c.z);
  disc.receiveShadow = true;
  b.deco(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 96), glowMat(color, 2.5));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(c.x, c.y + 0.02, c.z);
  b.deco(rim);
  const inner = new THREE.Mesh(new THREE.RingGeometry(R * 0.3, R * 0.31, 64), glowMat(color, 1.5));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(c.x, c.y + 0.02, c.z);
  b.deco(inner);
  // Physics floor + invisible ring wall
  b.invisible(c.clone().setY(c.y - 1), new THREE.Vector3(R * 2 + 2, 2, R * 2 + 2), 'floor').blocksSight = true;
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = new THREE.Vector3(c.x + Math.cos(a) * (R + 0.8), c.y + 4, c.z + Math.sin(a) * (R + 0.8));
    const col = b.invisible(p, new THREE.Vector3(3.2, 10, 3.2));
    col.blocksSight = false;
  }
  // Void underneath (if something falls through)
  b.add(new KillZone(new THREE.Vector3(c.x - 500, c.y - 90, c.z - 500), new THREE.Vector3(c.x + 500, c.y - 50, c.z + 500), 999, true, 'void'));
}

/** Cinematic intro: sweep to the boss, roar + name card, back to the player. */
export function bossIntro(s: Session, boss: Boss, spawn: THREE.Vector3): Shot[] {
  const bc = boss.center.clone();
  const far = bc.clone().add(new THREE.Vector3(8, 4, -14));
  const near = bc.clone().add(new THREE.Vector3(boss.radius + 3, 0.5, -(boss.radius + 6)));
  const behind = spawn.clone().add(new THREE.Vector3(0, 3, -4.5));
  s.after(1.6, () => {
    boss.model.action?.('roar');
    Audio.play('roar', { pos: boss.pos });
    s.rig.shake(0.5);
    useGame.getState().showBanner({ title: boss.def.name, subtitle: boss.def.subtitle, color: '#' + new THREE.Color(boss.def.color).getHexString(), big: true }, 3000);
  });
  s.after(0.1, () => s.state === 'intro' && s.post.setDOF(true, 9, 0.003));
  return [
    { from: far, to: near, lookFrom: bc, lookTo: bc.clone().setY(bc.y + boss.halfHeight * 0.4), duration: 1.8, fov: 50 },
    { from: near, to: near.clone().add(new THREE.Vector3(-1, 0.3, -1)), lookFrom: bc.clone().setY(bc.y + boss.halfHeight * 0.4), lookTo: bc.clone().setY(bc.y + boss.halfHeight * 0.5), duration: 1.6, fov: 42 },
    {
      from: near, to: behind, lookFrom: bc, lookTo: spawn.clone().setY(spawn.y + 1.5).add(new THREE.Vector3(0, 0, 4)), duration: 1.0, fov: 62,
    },
  ];
}

/** Start the fight once the intro ends (called from level update). */
export function startBossWhenReady(s: Session, boss: Boss) {
  let started = false;
  return () => {
    if (!started && s.state === 'playing') {
      started = true;
      boss.start();
      s.post.setDOF(false);
      Audio.playMusic(boss.def.id === 'skyduel' ? 'skyduel' : boss.def.id);
    }
  };
}
