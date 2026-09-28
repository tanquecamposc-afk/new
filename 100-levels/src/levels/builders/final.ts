/**
 * LEVEL 100 — THE 100TH. Five phases:
 *  1 WARRIOR    melee combos, charges, slams
 *  2 DESTROYER  destroys parts of the arena, meteors, twin beams
 *  3 NIGHTMARE  the arena goes dark, teleports, shadow clones, void strikes
 *  4 CHAOS      abilities from every world (lasers, glyph shield crystals,
 *               spectral cars, searchlights, meteors, homing orbs)
 *  5 FINAL      the arena collapses from the edges — win before time runs out
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Boss, BossDef, Co } from '../../bosses/Boss';
import { humanoidBoss } from '../../bosses/BossModels';
import * as A from '../../bosses/Attacks';
import { bossIntro, startBossWhenReady } from './bossArena';
import { Entity, Damageable, HitInfo } from '../../entities/Entity';
import { Laser } from '../../entities/Hazards';
import { Flashlight } from './horror';
import { makeCollider, Collider } from '../../physics/Physics';
import { M, glowMat, cachedGeo, mat } from '../../gfx/Materials';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import { rand } from '../../core/math';
import { columns } from '../Decor';

interface Tile {
  mesh: THREE.Mesh;
  col: Collider;
  c: THREE.Vector3;
  state: 'ok' | 'warn' | 'fall' | 'gone';
  t: number;
  permanent: boolean;
}

/** Floor made of tiles that can crumble. */
class TileFloor extends Entity {
  tiles: Tile[] = [];
  private warnMat = glowMat(0xff2020, 1.5);
  constructor(private center: THREE.Vector3, private R: number, private size = 4) {
    super();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    const n = Math.ceil(this.R / this.size);
    const geo = cachedGeo('finalTile' + this.size, () => new THREE.BoxGeometry(this.size - 0.08, 1.2, this.size - 0.08));
    const mats = [mat('finalTileA', { tex: 'marble', color: 0x2a2430, roughness: 0.25, metalness: 0.3 }), mat('finalTileB', { tex: 'marble', color: 0x3a3040, roughness: 0.25, metalness: 0.3 })];
    for (let x = -n; x < n; x++)
      for (let z = -n; z < n; z++) {
        const c = new THREE.Vector3(this.center.x + (x + 0.5) * this.size, this.center.y - 0.6, this.center.z + (z + 0.5) * this.size);
        if (Math.hypot(c.x - this.center.x, c.z - this.center.z) > this.R) continue;
        const m = new THREE.Mesh(geo, mats[(x + z) & 1]);
        m.position.copy(c);
        m.receiveShadow = true;
        this.obj.add(m);
        const col = makeCollider(c, new THREE.Vector3(this.size, 1.2, this.size));
        s.physics.add(col);
        this.colliders.push(col);
        this.tiles.push({ mesh: m, col, c, state: 'ok', t: 0, permanent: false });
      }
    // Golden inlay ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(this.R * 0.5, 0.1, 6, 64), glowMat(0xffd040, 2));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.center).setY(this.center.y + 0.03);
    this.obj.add(ring);
  }
  crumble(t: Tile, delay: number, permanent = false) {
    if (t.state !== 'ok') return;
    t.state = 'warn';
    t.t = delay;
    t.permanent = permanent;
    t.mesh.material = this.warnMat;
  }
  crumbleNear(p: THREE.Vector3, r: number, delay: number) {
    for (const t of this.tiles) if (Math.hypot(t.c.x - p.x, t.c.z - p.z) < r) this.crumble(t, delay + rand(0, 0.3));
  }
  update(dt: number) {
    const s = this.session;
    for (const t of this.tiles) {
      if (t.state === 'warn') {
        t.t -= dt;
        t.mesh.position.x = t.c.x + rand(-0.04, 0.04);
        if (t.t <= 0) {
          t.state = 'fall';
          t.t = t.permanent ? 999 : 7;
          t.col.enabled = false;
          s.particles.emit('debris', t.c.clone().setY(t.c.y + 0.6), { count: 6, spread: 1.5 });
        }
      } else if (t.state === 'fall') {
        t.mesh.position.y -= dt * 18;
        t.t -= dt;
        if (t.mesh.position.y < t.c.y - 40) t.mesh.visible = false;
        if (t.t <= 0) {
          // Rebuild
          t.state = 'ok';
          t.col.enabled = true;
          t.mesh.visible = true;
          t.mesh.position.copy(t.c);
          t.mesh.material = (t.mesh.userData.base as THREE.Material) ?? t.mesh.material;
          s.particles.emit('magic', t.c.clone().setY(t.c.y + 0.7), { count: 6, color: 0xffd040 });
        }
      }
      if (!t.mesh.userData.base && t.state === 'ok') t.mesh.userData.base = t.mesh.material;
      if (t.state === 'ok' && t.mesh.userData.base) t.mesh.material = t.mesh.userData.base;
    }
  }
}

/** Crystal that must be shattered to break the glyph shield (phase 4). */
class ShieldCrystal extends Entity implements Damageable {
  center: THREE.Vector3;
  radius = 0.9;
  halfHeight = 1.2;
  team: 'enemy' = 'enemy';
  onBreak: (() => void) | null = null;
  constructor(pos: THREE.Vector3) {
    super();
    this.center = pos.clone().setY(pos.y + 1.4);
    const m = new THREE.Mesh(cachedGeo('shieldCrystal', () => new THREE.OctahedronGeometry(0.9, 0).scale(1, 1.6, 1)), new THREE.MeshStandardMaterial({ color: 0xb48cff, emissive: 0x8060ff, emissiveIntensity: 3, roughness: 0.1 }));
    m.position.copy(this.center);
    this.obj.add(m);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    s.addDamageable(this);
  }
  takeDamage(_h: HitInfo) {
    const s = this.session;
    s.particles.emit('magic', this.center, { count: 40, color: 0xb48cff, velSpread: 5 });
    Audio.play('break', { pos: this.center });
    this.onBreak?.();
    this.destroy();
  }
  update(dt: number) {
    this.obj.children[0].rotation.y += dt * 2;
  }
  dispose() {
    this.session.removeDamageable(this);
    super.dispose();
  }
}

export function buildFinal(s: Session): LevelLogic {
  const b = new Builder(s, 100100);
  const R = 24;
  const c = new THREE.Vector3(0, 0, 0);
  const floor = s.add(new TileFloor(c, R));
  // Invisible ring wall + void kill
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    b.invisible(new THREE.Vector3(Math.cos(a) * (R + 1.5), 5, Math.sin(a) * (R + 1.5)), new THREE.Vector3(5, 12, 5)).blocksSight = false;
  }
  const ringPos = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * (R + 6), -10, Math.sin(a) * (R + 6));
  });
  columns(b, ringPos, 30, M.darkMarble(), 1.2, 0xffd040);
  // Floating "100" monolith far behind
  const mono = new THREE.Mesh(new THREE.TorusGeometry(40, 1, 8, 100), glowMat(0xffd040, 2));
  mono.position.set(0, 30, 90);
  b.deco(mono, false);

  const def: BossDef = {
    id: 'the100th', name: '👑 THE 100TH', subtitle: 'The End of All Levels', hp: 4200, phases: 5, radius: 1.8, height: 6.4, speed: 5.5,
    color: 0xffd040, deathColor: 0xffffff, arenaRadius: R,
    model: (ss) => humanoidBoss(ss, 'boss_100th', 3.2, { weapon: 'wpn_void', halo: 0xffd040, aura: 'magic', auraColor: 0xffd040 }),
    preferredDist: 5,
    attacks: [
      [A.combo(3, 26), A.charge(30, 28, 2), A.slam(32, 1)],
      [destroyArena, A.rain(12, 'meteor', 26), A.sweep(0xffd040, 3, 2.2, 26, 0.1, 2), A.slam(32, 2)],
      [A.sequence(A.teleport(), A.combo(3, 26)), A.summon('clone', 3), A.strikes('void', 10, 2.5, 0.9, 0.18, 24), A.homing(6, 0xa040ff, 16)],
      [lasersAttack, carsAttack, crystalShield, A.sweep(0xfff0c0, 4, 2.6, 24, 0.35, 3), A.rain(14, 'meteor', 26), A.homing(6, 0xffd040, 16, 'electric')],
      [A.combo(4, 28), destroyArena, carsAttack, A.rain(18, 'meteor', 28), A.sweep(0xffd040, 6.28, 2.6, 28, 0.1, 4), A.slam(34, 3)],
    ],
    rest: [1.1, 1, 0.9, 0.8, 0.5],
    onPhase: (bb, p) => onPhase(bb, p),
  };

  function* destroyArena(bb: Boss): Co {
    bb.model.action?.('slam');
    Audio.play('rumble');
    s.rig.shake(0.4);
    // Crumble a wedge of the arena away from the player (never under their feet instantly)
    const pa = Math.atan2(s.player.pos.z, s.player.pos.x);
    const a0 = pa + rand(0.8, 2.2) * (Math.random() < 0.5 ? 1 : -1);
    for (const t of floor.tiles) {
      const a = Math.atan2(t.c.z, t.c.x);
      let d = a - a0;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.55 && Math.hypot(t.c.x, t.c.z) > 5) floor.crumble(t, 1.2 + Math.hypot(t.c.x, t.c.z) * 0.02);
    }
    // And the ring under the player a bit later — keep moving!
    floor.crumbleNear(s.player.pos, 3.2, 1.6);
    yield 1.8;
  }

  function* lasersAttack(bb: Boss): Co {
    bb.model.action?.('cast');
    s.toast('🏃', 'PARKOUR', 'Jump the lasers!');
    const lasers: Laser[] = [];
    for (let i = 0; i < 3; i++) {
      const z = -12 + i * 12;
      lasers.push(s.add(new Laser(new THREE.Vector3(-R, 0.5 + (i % 2) * 0.9, z), new THREE.Vector3(R, 0.5 + (i % 2) * 0.9, z), { sweep: new THREE.Vector3(0, 0, 8), sweepSpeed: 0.8 + i * 0.2, color: 0xff2d55, damage: 22 })));
    }
    yield 6;
    lasers.forEach((l) => l.destroy());
  }

  function* carsAttack(bb: Boss): Co {
    bb.model.action?.('roar');
    s.toast('🏎️', 'RACING', 'Spectral cars incoming!');
    for (let k = 0; k < 5; k++) {
      const lane = rand(-R * 0.7, R * 0.7);
      const alongX = Math.random() < 0.5;
      const from = alongX ? new THREE.Vector3(-R, 0.8, lane) : new THREE.Vector3(lane, 0.8, -R);
      const dir = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
      s.fx.telegraphLine(from.clone().setY(0.05), Math.atan2(dir.x, dir.z), R * 2, 3.2, 0.9, 0x34d4ff);
      yield 0.3;
      s.after(0.6, () => {
        s.projectiles.spawn({ kind: 'bolt', pos: from, vel: dir.clone().multiplyScalar(40), team: 'enemy', damage: 28 * bb.dmgMul, color: 0x34d4ff, radius: 1.4, scale: 6, life: 2, ghost: true, knockback: 16 });
        Audio.play('boost', { pos: from });
      });
    }
    yield 1.5;
  }

  function* crystalShield(bb: Boss): Co {
    if (bb.data.shieldUp) return;
    bb.data.shieldUp = true;
    bb.invulnerable = true;
    bb.syncHud();
    s.toast('🔣', 'PUZZLE', 'Shatter the 3 crystals to break its shield!');
    Audio.play('shield');
    let left = 3;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rand(0, 1);
      const cr = s.add(new ShieldCrystal(new THREE.Vector3(Math.cos(a) * R * 0.65, 0, Math.sin(a) * R * 0.65)));
      cr.onBreak = () => {
        left--;
        if (left <= 0) {
          bb.invulnerable = false;
          bb.data.shieldUp = false;
          bb.syncHud();
          s.toast('💥', 'SHIELD BROKEN', 'Strike now!');
        }
      };
    }
    // Keep attacking while shielded
    yield* A.homing(4, 0xb48cff, 14)(bb);
    yield () => !bb.data.shieldUp;
  }

  let flash: Flashlight | null = null;
  let collapsing = false;
  let collapseT = 0;
  function onPhase(bb: Boss, p: number): Co | void {
    const g = useGame.getState();
    const names = ['WARRIOR', 'DESTROYER', 'NIGHTMARE', 'CHAOS', 'FINAL'];
    s.after(0.1, () => g.showBanner({ title: `PHASE ${p + 1} — ${names[p]}`, subtitle: '👑 THE 100TH', color: '#ffd040', big: true }, 2600));
    if (p === 2) {
      // Nightmare: darkness falls
      s.post.darkness = 0.55;
      (s.scene.fog as THREE.FogExp2).density = 0.05;
      s.env.sun.intensity = 0.2;
      s.env.hemi.intensity = 0.15;
      s.scene.environmentIntensity = 0.1;
      if (!flash) flash = s.add(new Flashlight(false));
      flash.drain = 0;
      Audio.play('jumpscare', { vol: 0.5 });
      s.post.flashScreen(0x300000, 0.6, 1.5);
    }
    if (p === 3) {
      s.post.darkness = 0.2;
      (s.scene.fog as THREE.FogExp2).density = 0.012;
      s.env.sun.intensity = 1.4;
      s.env.hemi.intensity = 0.5;
      s.post.setGrade({ bloom: 1.1, sat: 1.3, tint: 0xfff0ff, ca: 0.004 });
    }
    if (p === 4) {
      bb.enraged = true;
      bb.speedMul = 1.3;
      collapsing = true;
      s.timeLimit = s.time + Math.round(75 * s.diff.timeLimit);
      s.post.setGrade({ bloom: 1.2, sat: 1.2, tint: 0xffe8d0, contrast: 1.15 });
      s.toast('⏳', 'THE ARENA COLLAPSES', 'Defeat THE 100TH before the time runs out!');
    }
  }

  const boss = s.add(new Boss(def, new THREE.Vector3(0, 0, 10)));
  boss.yaw = Math.PI;
  boss.arenaRadius = R;
  s.addDamageable(boss);
  const starter = startBossWhenReady(s, boss);
  const spawn = new THREE.Vector3(0, 0.05, -14);
  b.finalize();
  return {
    spawn,
    spawnYaw: 0,
    theme: 'final',
    music: 'final_calm',
    ambient: ['wind', 'hum'],
    objective: 'Defeat THE 100TH',
    abilityMode: 'weapon',
    combat: true,
    killY: -30,
    intro: () => bossIntro(s, boss, spawn),
    update: (dt) => {
      starter();
      s.rig.frameTarget = boss.dead ? null : boss.center;
      if (collapsing && !boss.dead) {
        collapseT += dt;
        const left = (s.timeLimit ?? 0) - s.time;
        const total = 75 * s.diff.timeLimit;
        const k = Math.min(1, 1 - left / total);
        const rr = R * (1 - k * 0.72);
        for (const t of floor.tiles) if (Math.hypot(t.c.x, t.c.z) > rr && t.state === 'ok') floor.crumble(t, 0.8, true);
        if (Math.random() < dt * 2) s.rig.shake(0.1);
        s.progress = `Arena collapsing · ${Math.max(0, Math.ceil(left))}s`;
      } else s.progress = boss.data.shieldUp ? 'Shatter the crystals!' : '';
    },
    onPlayerFell: () => {
      s.player.hp -= 25;
      s.damageTaken += 25;
      if (s.player.hp <= 0) {
        s.player.die();
        return true;
      }
      // Respawn on a random intact tile near the centre
      const safe = floor.tiles.filter((t) => t.state === 'ok').sort((a, c2) => a.c.length() - c2.c.length())[0];
      s.player.spawn((safe ? safe.c.clone().setY(0.1) : new THREE.Vector3(0, 0.1, 0)), 0);
      s.player.invuln = 1.2;
      return true;
    },
    bossId: 'the100th',
  };
}
