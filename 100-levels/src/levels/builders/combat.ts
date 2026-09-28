/**
 * WORLD 3 — COMBAT (levels 21-29) + reusable wave-arena kit.
 * A chain of stone arenas: entering one seals the door behind you and spawns
 * waves; clearing the last wave opens the way forward.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { M, glowMat, cachedGeo, mat } from '../../gfx/Materials';
import { Door } from '../../entities/Platforms';
import { Trigger, ObjectiveItem, BreakableWall } from '../../entities/Pickups';
import { Enemy, EnemyKind } from '../../enemies/Enemy';
import { Entity } from '../../entities/Entity';
import { Audio } from '../../audio/AudioManager';
import { buildWeapon } from '../../combat/Weapons';
import { Crowd, columns, rocks } from '../Decor';
import { rand } from '../../core/math';
import { useGame } from '../../store/gameStore';

export type Wave = EnemyKind[];

/** Torch with flickering fire particles and optional light. */
export class Torch extends Entity {
  private t = 0;
  constructor(private pos: THREE.Vector3, private light = false, private color = 0xff9040) {
    super();
    const pole = new THREE.Mesh(cachedGeo('torchPole', () => new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6).translate(0, 1.1, 0)), M.darkMetal());
    const bowl = new THREE.Mesh(cachedGeo('torchBowl', () => new THREE.CylinderGeometry(0.35, 0.15, 0.3, 8)), M.darkMetal());
    bowl.position.y = 2.3;
    const ember = new THREE.Mesh(cachedGeo('torchEmber', () => new THREE.SphereGeometry(0.2, 8, 6)), glowMat(color, 3));
    ember.position.y = 2.45;
    this.obj.add(pole, bowl, ember);
  }
  private pl: THREE.PointLight | null = null;
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (this.light) {
      this.pl = new THREE.PointLight(this.color, 12, 14, 2);
      this.pl.position.set(0, 2.8, 0);
      this.obj.add(this.pl);
    }
  }
  update(dt: number) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.06;
      this.session.particles.emit('fire', this.pos.clone().setY(this.pos.y + 2.5), { count: 2, size: [0.5, 0.05], up: 2, spread: 0.1 });
    }
    if (this.pl) this.pl.intensity = 10 + Math.sin(this.session.clock * 17) * 1.5 + Math.random() * 2;
  }
}

export interface ArenaRoom {
  center: THREE.Vector3;
  size: number;
  waves: Wave[];
  entry: Door | null;
  exit: Door | null;
}

/**
 * Manages arena rooms: seal, spawn waves, open exits, HUD progress.
 */
export class WaveDirector extends Entity {
  private rooms: ArenaRoom[] = [];
  private active: ArenaRoom | null = null;
  private waveIdx = 0;
  private living: Enemy[] = [];
  cleared = 0;
  private spawnQ: { kind: EnemyKind; pos: THREE.Vector3; t: number }[] = [];
  onAllCleared: (() => void) | null = null;
  hpMul = 1;
  constructor(private b: Builder) {
    super();
  }
  init(s: Session) {
    this.session = s;
  }
  addRoom(r: ArenaRoom) {
    this.rooms.push(r);
    const s = this.b.s;
    const h = r.size / 2 - 1.5;
    this.b.add(new Trigger(r.center.clone().add(new THREE.Vector3(-h, -1, -h)), r.center.clone().add(new THREE.Vector3(h, 4, h)), () => this.enter(r)));
    const extra = Math.max(1, s.diff.enemyCount * (s.muts.has('enemies') ? 2 : 1));
    s.enemiesTotal += Math.round(r.waves.reduce((a, w) => a + w.length, 0) * extra);
  }
  private enter(r: ArenaRoom) {
    if (this.active) return;
    this.active = r;
    this.waveIdx = 0;
    r.entry?.close();
    Audio.play('door');
    this.spawnWave();
  }
  private spawnWave() {
    const s = this.session;
    const r = this.active!;
    const wave = r.waves[this.waveIdx];
    const extra = s.diff.enemyCount * (s.muts.has('enemies') ? 2 : 1);
    const list: EnemyKind[] = [];
    for (let i = 0; i < Math.round(wave.length * extra); i++) list.push(wave[i % wave.length]);
    useGame.getState().showBanner({ title: `WAVE ${this.waveIdx + 1}/${r.waves.length}`, subtitle: `${list.length} enemies incoming`, color: '#ff6a3d' }, 1800);
    list.forEach((k, i) => {
      const a = (i / list.length) * Math.PI * 2 + rand(-0.3, 0.3);
      const d = r.size * 0.32;
      const pos = r.center.clone().add(new THREE.Vector3(Math.cos(a) * d, 0.2, Math.sin(a) * d));
      this.spawnQ.push({ kind: k, pos, t: 0.4 + i * 0.25 });
      s.fx.telegraph(pos, 1.2, 0.4 + i * 0.25, 0xff6020);
    });
  }
  update(dt: number) {
    const s = this.session;
    for (const q of this.spawnQ) {
      q.t -= dt;
      if (q.t <= 0) {
        const e = new Enemy(q.kind, q.pos, Math.atan2(s.player.pos.x - q.pos.x, s.player.pos.z - q.pos.z), this.hpMul);
        e.aware = true;
        s.add(e);
        this.living.push(e);
        s.particles.emit('magic', q.pos.clone().setY(q.pos.y + 1), { count: 30, color: 0xff6020, velSpread: 3 });
        s.particles.emit('smoke', q.pos, { count: 6 });
        Audio.play('whoosh', { pos: q.pos, pitch: 0.7 });
      }
    }
    this.spawnQ = this.spawnQ.filter((q) => q.t > 0);
    if (!this.active) return;
    this.living = this.living.filter((e) => e.state !== 'dead' && e.alive);
    if (!this.living.length && !this.spawnQ.length) {
      this.waveIdx++;
      if (this.waveIdx < this.active.waves.length) this.spawnWave();
      else {
        this.active.exit?.open();
        this.active.entry?.open();
        this.cleared++;
        Audio.play('checkpoint');
        s.toast('⚔️', 'ARENA CLEARED', this.cleared < this.rooms.length ? 'The gate opens.' : 'All arenas cleared!');
        this.active = null;
        if (this.cleared >= this.rooms.length) this.onAllCleared?.();
      }
    }
    s.progress = this.active ? `Wave ${this.waveIdx + 1}/${this.active.waves.length} · ${this.living.length + this.spawnQ.length} enemies` : `Arenas cleared: ${this.cleared}/${this.rooms.length}`;
  }
  get fighting() {
    return !!this.active;
  }
}

/** Build a walled square stone arena; returns the doors. */
export function buildRoom(b: Builder, c: THREE.Vector3, size: number, wallMat: THREE.Material, floorMat: THREE.Material, doors: { north?: boolean; south?: boolean }, deco = true) {
  const h = 5;
  b.plat(c.x, c.y, c.z, size, size, floorMat, 1, { tile: 4 });
  const half = size / 2;
  const doorW = 4;
  const seg = (half - doorW / 2);
  // East / West walls
  b.box(new THREE.Vector3(c.x + half + 0.5, c.y + h / 2, c.z), new THREE.Vector3(1, h, size + 2), wallMat, { tile: 3 });
  b.box(new THREE.Vector3(c.x - half - 0.5, c.y + h / 2, c.z), new THREE.Vector3(1, h, size + 2), wallMat, { tile: 3 });
  let north: Door | null = null, south: Door | null = null;
  for (const [side, has] of [[1, doors.north], [-1, doors.south]] as const) {
    const z = c.z + side * (half + 0.5);
    if (!has) b.box(new THREE.Vector3(c.x, c.y + h / 2, z), new THREE.Vector3(size, h, 1), wallMat, { tile: 3 });
    else {
      b.box(new THREE.Vector3(c.x - doorW / 2 - seg / 2, c.y + h / 2, z), new THREE.Vector3(seg, h, 1), wallMat, { tile: 3 });
      b.box(new THREE.Vector3(c.x + doorW / 2 + seg / 2, c.y + h / 2, z), new THREE.Vector3(seg, h, 1), wallMat, { tile: 3 });
      b.box(new THREE.Vector3(c.x, c.y + h - 0.6, z), new THREE.Vector3(doorW, 1.2, 1), wallMat, { tile: 3 });
      const d = b.add(new Door(new THREE.Vector3(c.x, c.y + (h - 1.2) / 2, z), new THREE.Vector3(doorW, h - 1.2, 0.5), M.darkMetal(), 0xff4020));
      if (side === 1) north = d;
      else south = d;
    }
  }
  if (deco) {
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.add(new Torch(new THREE.Vector3(c.x + dx * (half - 1.2), c.y, c.z + dz * (half - 1.2)), b.lights < 4));
  }
  return { north, south };
}

const PLANS: Record<string, { rooms: Wave[][]; weapon?: string; hint?: string }> = {
  intro: { rooms: [[['grunt'], ['grunt', 'grunt']], [['grunt', 'grunt'], ['grunt', 'grunt', 'grunt']]], hint: 'Left click: attack (combo) · Right click: heavy · F: dodge · Q: ability' },
  archers: { rooms: [[['grunt', 'archer'], ['archer', 'archer', 'grunt']], [['archer', 'archer', 'grunt', 'grunt'], ['archer', 'grunt', 'grunt', 'archer']]] },
  brutes: { rooms: [[['brute'], ['grunt', 'grunt', 'grunt']], [['brute', 'grunt'], ['brute', 'archer', 'archer']]], hint: 'Brutes are slow: dodge (F) their slam, then punish.' },
  bow: { rooms: [[['archer', 'grunt'], ['archer', 'archer', 'grunt']], [['grunt', 'grunt', 'archer'], ['brute', 'archer', 'archer']]], weapon: 'wpn_bow' },
  chargers: { rooms: [[['charger'], ['charger', 'grunt']], [['charger', 'charger'], ['charger', 'archer', 'archer']]], hint: 'Chargers telegraph a red line — sidestep it.' },
  waves: { rooms: [[['grunt', 'grunt'], ['grunt', 'archer', 'archer'], ['brute', 'grunt', 'grunt'], ['charger', 'archer', 'grunt'], ['brute', 'charger', 'archer', 'grunt']]] },
  staff: { rooms: [[['grunt', 'archer', 'grunt'], ['brute', 'archer']], [['charger', 'grunt', 'grunt'], ['shaman', 'grunt', 'brute']]], weapon: 'wpn_staff' },
  shamans: { rooms: [[['shaman', 'grunt', 'grunt'], ['shaman', 'brute']], [['shaman', 'shaman', 'grunt', 'archer'], ['shaman', 'charger', 'brute', 'grunt']]], hint: 'Shamans heal their allies. Kill them first.' },
  colosseum: { rooms: [[['knight', 'knight'], ['brute', 'archer', 'archer', 'shaman'], ['charger', 'charger', 'knight', 'grunt'], ['brute', 'brute', 'shaman', 'archer', 'knight']]] },
};

export function buildCombat(s: Session, variant: string): LevelLogic {
  const plan = PLANS[variant] ?? PLANS.intro;
  const b = new Builder(s, s.meta.num * 53 + 11);
  const wall = mat('arenaWall', { tex: 'brick', color: 0x8a8278, roughness: 0.9 });
  const floor = variant === 'colosseum' ? M.sand() : mat('arenaFloor', { tex: 'tiles', color: 0x8a7a6a, roughness: 0.85 });
  const director = s.add(new WaveDirector(b));
  const size = variant === 'colosseum' || variant === 'waves' ? 30 : 22;
  let z = 0;
  // Start hall
  b.plat(0, 0, -8, 8, 12, floor);
  b.box(new THREE.Vector3(4.5, 2.5, -8), new THREE.Vector3(1, 5, 12), wall);
  b.box(new THREE.Vector3(-4.5, 2.5, -8), new THREE.Vector3(1, 5, 12), wall);
  b.box(new THREE.Vector3(0, 2.5, -14.5), new THREE.Vector3(10, 5, 1), wall);
  b.add(new Torch(new THREE.Vector3(3, 0, -10), true));
  b.add(new Torch(new THREE.Vector3(-3, 0, -10)));
  let prevExit: Door | null = null;
  const roomsN = plan.rooms.length;
  for (let i = 0; i < roomsN; i++) {
    const c = new THREE.Vector3(0, 0, z + size / 2 + 1);
    const { north, south } = buildRoom(b, c, size, wall, floor, { north: true, south: true });
    south?.open();
    void prevExit;
    director.addRoom({ center: c, size, waves: plan.rooms[i], entry: south, exit: north });
    // Arena decoration
    if (variant === 'colosseum') {
      const crowd = s.add(new Crowd(b, size / 2 + 2, 5, 5));
      crowd.obj.position.set(c.x, 0, c.z);
      columns(b, [new THREE.Vector3(c.x - size / 4, 0, c.z), new THREE.Vector3(c.x + size / 4, 0, c.z)], 5, M.marble(), 0.8);
    } else {
      // Cover pillars
      for (const [dx, dz] of [[-0.25, 0.1], [0.25, -0.1]]) b.box(new THREE.Vector3(c.x + dx * size, 1.5, c.z + dz * size), new THREE.Vector3(1.6, 3, 1.6), wall);
    }
    b.coins.addLine(new THREE.Vector3(c.x - 3, 1, c.z), new THREE.Vector3(c.x + 3, 1, c.z), 4);
    // Corridor to next room
    const nz = c.z + size / 2 + 1;
    b.plat(0, 0, nz + 3, 5, 6, floor);
    b.box(new THREE.Vector3(3, 2.5, nz + 3), new THREE.Vector3(1, 5, 6), wall);
    b.box(new THREE.Vector3(-3, 2.5, nz + 3), new THREE.Vector3(1, 5, 6), wall);
    z = nz + 6 - 1;
    prevExit = north;
    // Weapon pickup in the first room
    if (i === 0 && plan.weapon) {
      const wmesh = buildWeapon(plan.weapon);
      const obj = (wmesh.right ?? wmesh.left)!;
      obj.rotation.set(0, 0, 0);
      const holder = new THREE.Group();
      holder.add(obj);
      holder.scale.setScalar(1.3);
      b.add(new ObjectiveItem(new THREE.Vector3(c.x, 1.3, c.z - size / 2 + 3), holder, () => {
        const p = s.player;
        if (!p.ownedWeapons.includes(plan.weapon!)) p.ownedWeapons.push(plan.weapon!);
        p.setWeapon(plan.weapon!);
        useGame.getState().showBanner({ title: plan.weapon === 'wpn_bow' ? 'HUNTER BOW ACQUIRED' : 'STORM STAFF ACQUIRED', subtitle: 'Hold right-click to aim · Left-click to fire · Keys 1-6 swap weapons', color: '#ffd23d' }, 4000);
      }, 'Take weapon', false));
    }
    // Secret: breakable wall in the second room's side leads to a relic nook
    if (i === Math.min(1, roomsN - 1) && (s.meta.hasSecret || b.rng.chance(0.5))) {
      const nook = new THREE.Vector3(c.x + size / 2 + 3, 0, c.z);
      b.plat(nook.x, 0, nook.z, 4, 4, floor);
      b.box(new THREE.Vector3(nook.x + 2.5, 2.5, nook.z), new THREE.Vector3(1, 5, 5), wall);
      b.box(new THREE.Vector3(nook.x, 2.5, nook.z + 2.5), new THREE.Vector3(5, 5, 1), wall);
      b.box(new THREE.Vector3(nook.x, 2.5, nook.z - 2.5), new THREE.Vector3(5, 5, 1), wall);
      b.add(new BreakableWall(new THREE.Vector3(c.x + size / 2 + 0.5, 2, c.z), new THREE.Vector3(1.2, 4, 3.6), M.brick()));
      if (s.meta.hasSecret) b.secret(nook.clone().setY(1.2));
      else b.chest('rare', nook.clone());
    }
  }
  // Exit hall with goal
  b.plat(0, 0, z + 5, 10, 10, floor);
  const goal = b.goal(new THREE.Vector3(0, 0, z + 6), true);
  director.onAllCleared = () => goal.setLocked(false);
  rocks(b, new THREE.Vector3(0, -2, z / 2), z / 2 + 25, z / 2 + 60, 40, M.darkRock(), [3, 9]);
  if (plan.hint) s.after(4, () => s.toast('💡', 'TIP', plan.hint!));
  b.finalize();
  return {
    spawn: new THREE.Vector3(0, 0.05, -10),
    spawnYaw: 0,
    theme: 'arena',
    music: 'combat',
    ambient: variant === 'colosseum' ? ['crowd', 'wind'] : ['wind', 'fire'],
    objective: 'Clear every arena and reach the exit',
    abilityMode: 'weapon',
    killY: -20,
  };
}
