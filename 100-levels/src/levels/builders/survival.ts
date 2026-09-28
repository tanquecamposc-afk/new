/**
 * WORLD 8 — SURVIVAL (levels 71-80). Island survival with gathering, needs
 * (hunger / thirst / warmth), crafting & building, a day/night cycle, beasts
 * at night, storms; plus VOLCANO (rising lava climb) and THE APOCALYPSE
 * (meteor storm, crumbling ground, race to the shelter).
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Entity, Damageable, HitInfo, Interactable } from '../../entities/Entity';
import { Beast } from '../../enemies/Creatures';
import { ObjectiveItem, ItemMeshes, GoalPortal } from '../../entities/Pickups';
import { VanishingPlatform } from '../../entities/Platforms';
import { Meteor, GroundStrike } from '../../entities/Hazards';
import { M, mat, glowMat, cachedGeo } from '../../gfx/Materials';
import { palms, rocks, grassTufts, Water } from '../Decor';
import { makeCollider } from '../../physics/Physics';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';
import { THEMES } from '../../gfx/Environment';
import { clamp, rand, lerp } from '../../core/math';
import { AmbientEmitter } from '../../gfx/Particles';

interface Inv {
  wood: number;
  stone: number;
  food: number;
  axe: boolean;
}

type ResKind = 'tree' | 'rock' | 'bush';

/** Harvestable resource node (hit it or hold E). */
class Resource extends Entity implements Damageable {
  center: THREE.Vector3;
  radius: number;
  halfHeight: number;
  team: 'neutral' = 'neutral';
  private left: number;
  private respawnT = 0;
  private mesh: THREE.Group;
  private it!: Interactable;
  private shake = 0;
  constructor(private kind: ResKind, private pos: THREE.Vector3, private inv: Inv, private onGather: () => void) {
    super();
    this.center = pos.clone().setY(pos.y + 1);
    this.radius = kind === 'tree' ? 0.7 : 0.9;
    this.halfHeight = 1;
    this.left = kind === 'tree' ? 4 : kind === 'rock' ? 3 : 3;
    this.mesh = new THREE.Group();
    if (kind === 'tree') {
      const trunk = new THREE.Mesh(cachedGeo('resTrunk', () => new THREE.CylinderGeometry(0.25, 0.4, 5, 8).translate(0, 2.5, 0)), mat('resBark', { tex: 'wood', color: 0x7a5a38 }));
      const top = new THREE.Mesh(cachedGeo('resLeaves', () => new THREE.IcosahedronGeometry(2, 1).translate(0, 5.6, 0)), mat('resLeaf', { tex: 'grass', color: 0x4a8a38, flatShading: true }));
      trunk.castShadow = top.castShadow = true;
      this.mesh.add(trunk, top);
    } else if (kind === 'rock') {
      const r = new THREE.Mesh(cachedGeo('resRock', () => new THREE.DodecahedronGeometry(1.1, 0).translate(0, 0.7, 0)), mat('resRockM', { tex: 'rock', color: 0x8a8480, flatShading: true }));
      r.castShadow = true;
      this.mesh.add(r);
    } else {
      const bush = new THREE.Mesh(cachedGeo('resBush', () => new THREE.IcosahedronGeometry(0.9, 1).translate(0, 0.7, 0)), mat('resBushM', { tex: 'grass', color: 0x2f6a2a }));
      bush.castShadow = true;
      this.mesh.add(bush);
      for (let i = 0; i < 6; i++) {
        const berry = new THREE.Mesh(cachedGeo('berry', () => new THREE.SphereGeometry(0.1, 6, 4)), glowMat(0xff2050, 1.2));
        const a = i * 1.1;
        berry.position.set(Math.cos(a) * 0.75, 0.6 + (i % 3) * 0.25, Math.sin(a) * 0.75);
        this.mesh.add(berry);
      }
    }
    this.obj.add(this.mesh);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = rand(0, 6);
    s.addDamageable(this);
    if (this.kind !== 'bush') this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 1), new THREE.Vector3(this.radius * 1.3, 2, this.radius * 1.3)));
    this.it = s.addInteractable({ pos: this.center, radius: 2.4, prompt: this.kind === 'tree' ? 'Chop wood' : this.kind === 'rock' ? 'Mine stone' : 'Pick berries', enabled: true, hold: this.kind === 'bush' ? 0.5 : this.inv.axe ? 0.6 : 1.1, onInteract: () => this.gather() });
  }
  takeDamage(h: HitInfo) {
    if (h.ranged) return;
    this.gather();
  }
  private gather() {
    if (this.left <= 0) return;
    const s = this.session;
    const amt = this.inv.axe && this.kind !== 'bush' ? 2 : 1;
    this.left--;
    if (this.kind === 'tree') this.inv.wood += amt;
    else if (this.kind === 'rock') this.inv.stone += amt;
    else this.inv.food += 1;
    this.shake = 0.3;
    this.it.hold = this.kind === 'bush' ? 0.5 : this.inv.axe ? 0.6 : 1.1;
    s.particles.emit(this.kind === 'rock' ? 'debris' : this.kind === 'tree' ? 'debris' : 'blood', this.center, { count: 8, color: this.kind === 'tree' ? 0x8a6a40 : undefined });
    Audio.play(this.kind === 'rock' ? 'hit' : this.kind === 'tree' ? 'break' : 'pickup', { pos: this.center, pitch: this.kind === 'rock' ? 1.5 : 1 });
    s.toast(this.kind === 'tree' ? '🪵' : this.kind === 'rock' ? '🪨' : '🍓', '+' + (this.kind === 'bush' ? 1 : amt), this.kind === 'tree' ? 'Wood' : this.kind === 'rock' ? 'Stone' : 'Food');
    this.onGather();
    if (this.left <= 0) {
      this.respawnT = 50;
      this.it.enabled = false;
      if (this.kind === 'tree') Audio.play('slam', { pos: this.center, vol: 0.5 });
    }
  }
  update(dt: number) {
    if (this.shake > 0) {
      this.shake -= dt;
      this.mesh.rotation.z = Math.sin(this.shake * 60) * this.shake * 0.2;
    }
    if (this.left <= 0) {
      if (this.kind === 'tree') this.mesh.rotation.x = Math.min(1.5, this.mesh.rotation.x + dt * 2);
      else this.mesh.scale.setScalar(Math.max(0.3, this.mesh.scale.x - dt));
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.left = this.kind === 'tree' ? 4 : 3;
        this.mesh.rotation.x = 0;
        this.mesh.scale.setScalar(1);
        this.it.enabled = true;
      }
    }
  }
  dispose() {
    this.session.removeDamageable(this);
    this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** Placed campfire: warmth, light, fear for beasts. */
class Campfire extends Entity {
  private t = 0;
  private pl: THREE.PointLight | null = null;
  fuel = 180;
  constructor(public pos: THREE.Vector3, private light: boolean, private scale = 1) {
    super();
    const logs = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const l = new THREE.Mesh(cachedGeo('fireLog', () => new THREE.CylinderGeometry(0.1, 0.12, 1.1, 6).rotateZ(Math.PI / 2)), mat('fireLogM', { tex: 'wood', color: 0x3a2818 }));
      l.rotation.y = (i / 4) * Math.PI;
      l.position.y = 0.12;
      logs.add(l);
    }
    const stones = new THREE.Mesh(cachedGeo('fireRing', () => new THREE.TorusGeometry(0.75, 0.15, 6, 12).rotateX(Math.PI / 2)), M.rock());
    const ember = new THREE.Mesh(cachedGeo('fireEmber', () => new THREE.SphereGeometry(0.3, 8, 6).scale(1, 0.4, 1)), glowMat(0xff6020, 3));
    ember.position.y = 0.15;
    this.obj.add(logs, stones, ember);
    this.obj.scale.setScalar(scale);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (this.light) {
      this.pl = new THREE.PointLight(0xff8a3a, 30 * this.scale, 16 * this.scale, 2);
      this.pl.position.set(0, 1.2, 0);
      this.pl.castShadow = false;
      this.obj.add(this.pl);
    }
    Audio.play('fire', { pos: this.pos });
  }
  update(dt: number) {
    this.t -= dt;
    this.fuel -= dt;
    if (this.t <= 0) {
      this.t = 0.05;
      this.session.particles.emit('fire', this.pos.clone().setY(this.pos.y + 0.3), { count: Math.round(2 * this.scale), spread: 0.25 * this.scale, size: [0.7 * this.scale, 0.05], up: 2.5 * this.scale });
      if (Math.random() < 0.3) this.session.particles.emit('smoke', this.pos.clone().setY(this.pos.y + 1.5 * this.scale), { count: 1 });
    }
    if (this.pl) this.pl.intensity = (26 + Math.sin(this.session.clock * 11) * 4 + Math.random() * 3) * this.scale;
  }
}

/** Rising lava plane that kills on contact. */
class RisingLava extends Entity {
  y: number;
  private mesh: THREE.Mesh;
  constructor(y0: number, private speed: number, size = 200) {
    super();
    this.y = y0;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), M.lava());
    this.mesh.rotation.x = -Math.PI / 2;
    const glow = new THREE.PointLight(0xff4010, 60, 30, 2);
    glow.position.y = 3;
    this.obj.add(this.mesh, glow);
  }
  active = false;
  init(s: Session) {
    s.scene.add(this.obj);
  }
  update(dt: number) {
    const s = this.session;
    if (this.active && s.state === 'playing') this.y += this.speed * dt;
    this.obj.position.y = this.y;
    const tex = (this.mesh.material as THREE.MeshStandardMaterial).map;
    if (tex) tex.offset.x += dt * 0.02;
    const p = s.player;
    this.obj.position.x = p.pos.x;
    this.obj.position.z = p.pos.z;
    if (Math.random() < 0.6) s.particles.emit('embers', new THREE.Vector3(p.pos.x + rand(-12, 12), this.y + 0.2, p.pos.z + rand(-12, 12)), { count: 1 });
    if (p.pos.y < this.y + 0.2 && !p.dead) {
      s.particles.emit('fire', p.pos, { count: 40 });
      s.fail('Consumed by lava');
    }
  }
}

interface SurvCfg {
  goal: 'gather' | 'fire' | 'shelter' | 'explore' | 'nights' | 'signal' | 'hunt' | 'storm' | 'chaos';
  dayLen: number;
  startPhase: number;
  nights: number;
  beasts: number;
  storm?: boolean;
  meteors?: boolean;
  timeLimit?: number;
}

const CFG: Record<string, SurvCfg> = {
  gather: { goal: 'gather', dayLen: 240, startPhase: 0.3, nights: 0, beasts: 0 },
  fire: { goal: 'fire', dayLen: 150, startPhase: 0.45, nights: 1, beasts: 3 },
  shelter: { goal: 'shelter', dayLen: 150, startPhase: 0.4, nights: 1, beasts: 5 },
  explore: { goal: 'explore', dayLen: 200, startPhase: 0.3, nights: 0, beasts: 2 },
  nights: { goal: 'nights', dayLen: 110, startPhase: 0.55, nights: 2, beasts: 5 },
  signal: { goal: 'signal', dayLen: 180, startPhase: 0.3, nights: 0, beasts: 3 },
  hunt: { goal: 'hunt', dayLen: 200, startPhase: 0.3, nights: 0, beasts: 6 },
  storm: { goal: 'storm', dayLen: 160, startPhase: 0.4, nights: 0, beasts: 4, storm: true, timeLimit: 150 },
  survival: { goal: 'chaos', dayLen: 120, startPhase: 0.6, nights: 1, beasts: 6, storm: true, meteors: true },
};

export function buildSurvival(s: Session, variant: string): LevelLogic {
  if (variant === 'volcano') return buildVolcano(s);
  if (variant === 'apocalypse') return buildApocalypse(s);
  const cfg = CFG[variant] ?? CFG.gather;
  const b = new Builder(s, s.meta.num * 83 + 19);
  const rng = b.rng;
  const R = 55;
  const inv: Inv = { wood: 0, stone: 0, food: 2, axe: false };
  let hunger = 100, thirst = 100, warmth = 100;
  const fires: Campfire[] = [];
  const walls: THREE.Vector3[] = [];
  let hasBeacon = false;
  // Island ground: sand ring + grass plateau + a small hill
  b.plat(0, 0, 0, R * 2 + 10, R * 2 + 10, M.sand(), 2, { tile: 5 });
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.75, R * 0.8, 0.3, 48), M.grass());
  grass.position.y = 0.05;
  grass.receiveShadow = true;
  b.deco(grass);
  b.plat(R * 0.35, 1.5, -R * 0.3, 12, 10, M.rock(), 2);
  b.plat(R * 0.35 + 5, 3, -R * 0.3 - 2, 5, 5, M.rock(), 2);
  s.add(new Water(-0.4, 900, 0x1a6a9a));
  // Invisible ring so you can't walk into the ocean forever
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    b.invisible(new THREE.Vector3(Math.cos(a) * (R + 6), 3, Math.sin(a) * (R + 6)), new THREE.Vector3(14, 8, 14)).blocksSight = false;
  }
  // Freshwater pond (drink)
  const pond = new THREE.Vector3(-R * 0.3, 0, R * 0.25);
  const pondMesh = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: 0x2a7ab0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
  pondMesh.rotation.x = -Math.PI / 2;
  pondMesh.position.copy(pond).setY(0.22);
  b.deco(pondMesh);
  s.addInteractable({ pos: pond.clone().setY(1), radius: 6, prompt: 'Drink water', enabled: true, hold: 0.6, onInteract: () => {
    thirst = Math.min(100, thirst + 45);
    Audio.play('drink');
    s.particles.emit('water', pond.clone().setY(0.4), { count: 16 });
  } });
  // Resources
  const avoid = (p: THREE.Vector3) => p.distanceTo(pond) < 7 || p.length() < 6;
  const place = (kind: ResKind, n: number, rMin: number, rMax: number) => {
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(rMin, rMax);
      const p = new THREE.Vector3(Math.cos(a) * r, 0.2, Math.sin(a) * r);
      if (avoid(p)) continue;
      s.add(new Resource(kind, p, inv, () => checkGoal()));
    }
  };
  place('tree', 26, 10, R * 0.72);
  place('rock', 14, 8, R * 0.8);
  place('bush', 12, 8, R * 0.7);
  palms(b, Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + rng.range(-0.1, 0.1);
    return new THREE.Vector3(Math.cos(a) * rng.range(R * 0.8, R * 0.95), 0, Math.sin(a) * rng.range(R * 0.8, R * 0.95));
  }));
  rocks(b, new THREE.Vector3(), R * 0.9, R + 4, 30, M.rock(), [0.6, 2]);
  grassTufts(b, new THREE.Vector3(), R * 0.7, 700, 0x5a9a40, avoid);
  for (let i = 0; i < 14; i++) b.coin(rng.range(-R * 0.6, R * 0.6), 1, rng.range(-R * 0.6, R * 0.6));

  // Objective state
  const relics: number[] = [];
  let hunted = 0;
  const huntTarget = 6;
  let nightsSurvived = 0;
  let wasNight = false;
  let goalPortal: GoalPortal | null = null;
  let won = false;
  const finish = () => {
    if (won) return;
    won = true;
    useGame.getState().showBanner({ title: 'SURVIVED', subtitle: 'The island lets you go... for now', color: '#7bd24a', big: true }, 2500);
    s.after(1.5, () => s.win());
  };
  const checkGoal = () => {
    if (cfg.goal === 'gather' && inv.wood >= 10 && inv.stone >= 6) finish();
    if (cfg.goal === 'explore' && relics.length >= 3 && goalPortal) goalPortal.setLocked(false);
  };
  if (cfg.goal === 'explore') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.6;
      const p = new THREE.Vector3(Math.cos(a) * R * 0.65, 1.2, Math.sin(a) * R * 0.65);
      b.add(new ObjectiveItem(p, ItemMeshes.orb(0x40e0ff), () => {
        relics.push(i);
        s.progress = `Relics: ${relics.length}/3`;
        checkGoal();
      }, 'Take relic', false, 0x40e0ff));
      const altar = new THREE.Mesh(cachedGeo('altar', () => new THREE.CylinderGeometry(0.8, 1, 0.6, 8)), M.darkMarble());
      altar.position.copy(p).setY(0.3);
      b.deco(altar);
    }
    goalPortal = b.goal(new THREE.Vector3(0, 0.2, -R * 0.55), true, 0x40e0ff);
  }
  if (s.meta.hasSecret) b.secret(new THREE.Vector3(R * 0.35 + 5, 4.4, -R * 0.3 - 2));
  else b.chest('common', new THREE.Vector3(R * 0.35 + 5, 3, -R * 0.3 - 2));

  // Beasts
  const beasts: Beast[] = [];
  const spawnBeast = () => {
    const a = rand(0, Math.PI * 2);
    const bs = s.add(new Beast(new THREE.Vector3(Math.cos(a) * R * 0.85, 0.3, Math.sin(a) * R * 0.85), variant === 'storm' ? 0x3a3a48 : 0x4a4038));
    bs.fearsFire = fires.map((f) => f.pos);
    bs.onDeath = () => {
      hunted++;
      inv.food += 2;
      if (cfg.goal === 'hunt') {
        s.progress = `Beasts hunted: ${hunted}/${huntTarget}`;
        if (hunted >= huntTarget) finish();
      }
    };
    beasts.push(bs);
  };
  if (cfg.goal === 'hunt') for (let i = 0; i < huntTarget; i++) spawnBeast();

  // Day / night
  let phase = cfg.startPhase;
  const day = THEMES.island, night = THEMES.night_island;
  const cDay = { sun: new THREE.Color(day.sunColor), hs: new THREE.Color(day.hemiSky), fog: new THREE.Color(day.fogColor) };
  const cNight = { sun: new THREE.Color(night.sunColor), hs: new THREE.Color(night.hemiSky), fog: new THREE.Color(night.fogColor) };
  const isNight = () => {
    const p = phase % 1;
    return p > 0.78 || p < 0.2;
  };
  const clock = () => {
    const h = ((phase % 1) * 24 + 6) % 24;
    return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  };
  const rain = cfg.storm ? new AmbientEmitter(s.particles, 'water', 90, 22, [8, 14], { vel: new THREE.Vector3(4, -24, 0), velSpread: 0.5, up: 0, gravity: -10, size: [0.08, 0.08], life: [0.5, 0.8], alpha: 0.5, count: 1 }) : null;
  let beastT = 6;
  let stormT = 5;
  let meteorT = 8;
  const recipes = () => [
    { id: 'fire', name: 'Campfire', icon: '🔥', cost: '5 wood · 2 stone', can: inv.wood >= 5 && inv.stone >= 2 },
    { id: 'wall', name: 'Wooden wall', icon: '🧱', cost: '4 wood', can: inv.wood >= 4 },
    { id: 'axe', name: 'Stone axe (faster gathering)', icon: '🪓', cost: '3 wood · 3 stone', can: !inv.axe && inv.wood >= 3 && inv.stone >= 3 },
    { id: 'meal', name: 'Eat (restore hunger)', icon: '🍖', cost: '1 food', can: inv.food >= 1 },
    { id: 'bandage', name: 'Bandage (+35 HP)', icon: '🩹', cost: '2 food · 1 wood', can: inv.food >= 2 && inv.wood >= 1 },
    ...(cfg.goal === 'signal' ? [{ id: 'beacon', name: 'Signal beacon', icon: '🗼', cost: '12 wood · 8 stone', can: !hasBeacon && inv.wood >= 12 && inv.stone >= 8 }] : []),
  ];
  const craft = (id: string) => {
    const p = s.player;
    const front = p.pos.clone().addScaledVector(p.facing, 2.5);
    front.y = Math.max(0.2, s.physics.heightAt(front.x, front.z, p.pos.y + 1));
    if (!isFinite(front.y)) front.y = 0.2;
    const r = recipes().find((x) => x.id === id);
    if (!r?.can) return;
    Audio.play('craft');
    switch (id) {
      case 'fire': {
        inv.wood -= 5;
        inv.stone -= 2;
        const f = s.add(new Campfire(front, fires.length < 2));
        fires.push(f);
        beasts.forEach((bs) => (bs.fearsFire = fires.map((x) => x.pos)));
        if (cfg.goal === 'fire') s.toast('🔥', 'CAMPFIRE BUILT', 'Now survive until dawn');
        break;
      }
      case 'wall': {
        inv.wood -= 4;
        const yaw = Math.round(p.yaw / (Math.PI / 2)) * (Math.PI / 2);
        const alongX = Math.abs(Math.cos(yaw)) > 0.5;
        const size = alongX ? new THREE.Vector3(3, 2.2, 0.4) : new THREE.Vector3(0.4, 2.2, 3);
        b.box(front.clone().setY(front.y + 1.1), size, mat('builtWall', { tex: 'wood', color: 0x9a7a50 }), { tile: 1 });
        walls.push(front);
        s.particles.emit('dust', front, { count: 12 });
        if (cfg.goal === 'shelter') s.progress = `Shelter: walls ${walls.length}/4 · fire ${fires.length ? '✔' : '✖'}`;
        break;
      }
      case 'axe':
        inv.wood -= 3;
        inv.stone -= 3;
        inv.axe = true;
        s.toast('🪓', 'STONE AXE', 'Gathering is twice as fast');
        break;
      case 'meal':
        inv.food -= 1;
        hunger = Math.min(100, hunger + 35);
        Audio.play('eat');
        break;
      case 'bandage':
        inv.food -= 2;
        inv.wood -= 1;
        p.heal(35);
        break;
      case 'beacon': {
        inv.wood -= 12;
        inv.stone -= 8;
        hasBeacon = true;
        const tower = new THREE.Group();
        const legs = new THREE.Mesh(cachedGeo('beaconTower', () => new THREE.CylinderGeometry(0.6, 1.4, 6, 4).translate(0, 3, 0)), mat('beaconWood', { tex: 'wood', color: 0x7a5a38 }));
        tower.add(legs);
        tower.position.copy(front);
        s.scene.add(tower);
        s.physics.add(makeCollider(front.clone().setY(front.y + 3), new THREE.Vector3(2, 6, 2)));
        const fire = s.add(new Campfire(front.clone().setY(front.y + 6.2), true, 2.2));
        fires.push(fire);
        Audio.play('powerup');
        useGame.getState().showBanner({ title: 'SIGNAL LIT', subtitle: 'A ship has seen the fire!', color: '#ffb627' }, 2600);
        s.after(3, finish);
        break;
      }
    }
  };

  b.finalize();
  const objective = {
    gather: 'Gather 10 wood and 6 stone',
    fire: 'Build a campfire (TAB) and survive the night',
    shelter: 'Build 4 walls and a campfire, then survive the night',
    explore: 'Find the 3 ancient relics, then reach the portal',
    nights: 'Survive two nights',
    signal: 'Gather resources and craft a signal beacon',
    hunt: 'Hunt the island\'s beasts',
    storm: 'Survive the storm',
    chaos: 'Survive the chaos storm until dawn',
  }[cfg.goal];
  if (cfg.goal === 'gather') s.progress = 'Wood 0/10 · Stone 0/6';
  s.after(3, () => s.toast('💡', 'SURVIVAL', 'Hit trees/rocks or hold E to gather · TAB to craft · Drink at the pond'));
  return {
    spawn: new THREE.Vector3(0, 0.3, R * 0.5),
    spawnYaw: Math.PI,
    theme: cfg.storm ? 'boss_storm' : 'island',
    music: 'survival',
    ambient: cfg.storm ? ['rain', 'wind', 'waves'] : ['waves', 'wind'],
    objective,
    abilityMode: 'weapon',
    combat: true,
    killY: -15,
    timeLimit: cfg.timeLimit,
    recipes,
    craft,
    update: (dt) => {
      if (s.state !== 'playing') return;
      phase += dt / cfg.dayLen;
      const night = isNight();
      // Lighting blend
      const p = phase % 1;
      const dayK = clamp(Math.sin((p - 0.2) / 0.58 * Math.PI) * 1.4, 0, 1) * (cfg.storm ? 0.55 : 1);
      s.env.sun.intensity = lerp(night ? 0.5 : 0.6, day.sunIntensity, dayK);
      s.env.sun.color.copy(cNight.sun).lerp(cDay.sun, dayK);
      s.env.hemi.intensity = lerp(0.3, day.hemiIntensity, dayK);
      s.env.hemi.color.copy(cNight.hs).lerp(cDay.hs, dayK);
      if (s.scene.fog) (s.scene.fog as THREE.FogExp2).color.copy(cNight.fog).lerp(cDay.fog, dayK);
      s.scene.environmentIntensity = lerp(0.15, 0.6, dayK);
      // Needs
      hunger = Math.max(0, hunger - dt * 0.55);
      thirst = Math.max(0, thirst - dt * 0.75);
      const nearFire = fires.some((f) => f.pos.distanceTo(s.player.pos) < 7);
      warmth = clamp(warmth + (nearFire ? 12 : night || cfg.storm ? -1.4 : 2) * dt, 0, 100);
      if ((hunger <= 0 || thirst <= 0 || warmth <= 0) && Math.random() < dt * 2) {
        s.player.hp -= 2;
        s.damageTaken += 2;
        s.post.flashScreen(0x400000, 0.15, 3);
        if (s.player.hp <= 0) s.fail(hunger <= 0 ? 'You starved' : thirst <= 0 ? 'You died of thirst' : 'You froze to death');
      }
      // Night spawns
      if (night) {
        beastT -= dt;
        if (beastT <= 0 && beasts.filter((x) => x.alive).length < cfg.beasts * s.diff.enemyCount) {
          beastT = rand(5, 9);
          spawnBeast();
          Audio.play('roar', { pitch: 2.2, vol: 0.4 });
        }
      } else if (cfg.goal !== 'hunt' && cfg.beasts && beasts.filter((x) => x.alive).length < Math.ceil(cfg.beasts / 3)) {
        beastT -= dt * 0.3;
        if (beastT <= 0) {
          beastT = 20;
          spawnBeast();
        }
      }
      if (wasNight && !night) {
        nightsSurvived++;
        useGame.getState().showBanner({ title: 'DAWN', subtitle: `Night ${nightsSurvived} survived`, color: '#ffd23d' }, 2200);
        if ((cfg.goal === 'fire' && fires.length) || (cfg.goal === 'shelter' && fires.length && walls.length >= 4) || (cfg.goal === 'nights' && nightsSurvived >= cfg.nights) || cfg.goal === 'chaos') finish();
      }
      if (!wasNight && night) useGame.getState().showBanner({ title: 'NIGHTFALL', subtitle: 'Stay near the fire', color: '#8090d0' }, 2200);
      wasNight = night;
      // Storm: lightning strikes near the player
      if (cfg.storm) {
        rain?.update(dt, s.camera.position);
        stormT -= dt;
        if (stormT <= 0) {
          stormT = rand(3, 7);
          const tgt = s.player.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6)));
          tgt.y = 0.2;
          s.add(new GroundStrike(tgt, 2.2, 1.1, 22, 'electric'));
        }
      }
      if (cfg.meteors) {
        meteorT -= dt;
        if (meteorT <= 0) {
          meteorT = rand(3, 6);
          s.add(new Meteor(s.player.pos.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(-8, 8))).setY(0.2), 1.4, 3, 25));
        }
      }
      if (cfg.goal === 'storm' && s.timeLimit && s.time > s.timeLimit - 1) finish();
      if (cfg.goal === 'gather') s.progress = `Wood ${inv.wood}/10 · Stone ${inv.stone}/6`;
      else if (cfg.goal === 'signal') s.progress = `Beacon: ${inv.wood}/12 wood · ${inv.stone}/8 stone`;
      else if (cfg.goal === 'storm') s.progress = `Survive: ${Math.max(0, Math.ceil((s.timeLimit ?? 0) - s.time))}s`;
      else if (cfg.goal === 'nights' || cfg.goal === 'fire' || cfg.goal === 'chaos') s.progress = `Nights survived: ${nightsSurvived}/${Math.max(1, cfg.nights)}${cfg.goal === 'fire' ? ` · fire ${fires.length ? '✔' : '✖'}` : ''}`;
    },
    hud: () => ({ survival: { hunger, thirst, warmth, wood: inv.wood, stone: inv.stone, food: inv.food, clock: clock(), night: isNight() } }),
  };
}

/** Level 75 — VOLCANO: climb the spiral of rock while lava rises. */
function buildVolcano(s: Session): LevelLogic {
  const b = new Builder(s, 7575);
  const rng = b.rng;
  // Base
  b.plat(0, 0, 0, 30, 30, M.darkRock(), 2);
  // Volcano cone visual
  const cone = new THREE.Mesh(new THREE.ConeGeometry(70, 90, 32, 1, true), M.darkRock());
  cone.position.set(0, 30, 40);
  b.deco(cone);
  const topY = 62;
  let y = 0;
  const pts: THREE.Vector3[] = [];
  const N = 44;
  for (let i = 1; i <= N; i++) {
    const a = i * 0.42;
    const r = 18 - (i / N) * 8;
    y += 1.4 + (i % 5 === 0 ? 0.6 : 0);
    const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r + 6);
    pts.push(p);
    if (i % 7 === 3) b.add(new VanishingPlatform(p.clone().setY(p.y - 0.3), new THREE.Vector3(3, 0.6, 3), M.darkRock(), 0.8));
    else b.plat(p.x, p.y, p.z, 3.4, 3.4, M.darkRock(), 1);
    if (i % 3 === 0) b.coin(p.x, p.y + 1, p.z);
    if (i % 11 === 0) b.checkpoint(p.clone(), 0);
  }
  const summit = pts[pts.length - 1].clone().add(new THREE.Vector3(0, 1.2, 0));
  b.plat(summit.x, summit.y, summit.z, 8, 8, M.rock(), 1);
  b.goal(summit.clone(), false, 0xffb627);
  void topY;
  if (s.meta.hasSecret) b.secret(pts[20].clone().add(new THREE.Vector3(0, 4, 0)));
  const lava = s.add(new RisingLava(-9, 0.5 * (2 - s.diff.timeLimit)));
  let rockT = 3;
  b.finalize();
  return {
    spawn: new THREE.Vector3(0, 0.05, -6),
    spawnYaw: 0,
    theme: 'volcano',
    music: 'apocalypse',
    ambient: ['lava', 'fire', 'wind'],
    objective: 'The volcano erupts! Climb above the rising lava',
    abilityMode: 'airdash',
    combat: false,
    killY: -30,
    intro: () => [
      { from: new THREE.Vector3(30, 20, -30), to: new THREE.Vector3(20, 70, -10), lookFrom: new THREE.Vector3(0, 20, 20), lookTo: new THREE.Vector3(0, 60, 20), duration: 2.6, fov: 55 },
      { from: new THREE.Vector3(20, 70, -10), to: new THREE.Vector3(0, 3, -11), lookFrom: new THREE.Vector3(0, 60, 20), lookTo: new THREE.Vector3(0, 1.5, 0), duration: 1.2, fov: 62 },
    ],
    onPlayerFell: () => {
      s.fail('You fell into the lava');
      return true;
    },
    update: (dt) => {
      if (s.state !== 'playing') return;
      if (!lava.active && s.time > 3) {
        lava.active = true;
        Audio.play('rumble');
        s.rig.shake(0.5);
        useGame.getState().showBanner({ title: 'ERUPTION!', subtitle: 'Climb!', color: '#ff5010', big: true }, 2000);
      }
      rockT -= dt;
      if (rockT <= 0) {
        rockT = rand(1.5, 3);
        const t = pts[Math.min(pts.length - 1, Math.max(0, pts.findIndex((p) => p.y > s.player.pos.y) + rng.int(0, 3)))];
        if (t) s.add(new Meteor(t.clone(), 1.3, 1.8, 22, 'meteor'));
      }
      if (Math.random() < dt) s.rig.shake(0.08);
      const gap = s.player.pos.y - lava.y;
      s.progress = `Height ${Math.round(s.player.pos.y)}m · lava ${gap.toFixed(1)}m below`;
      s.post.lowHp = gap < 4 ? 0.5 : 0;
    },
  };
}

/** Level 80 — THE APOCALYPSE: meteors rain, the ground crumbles; reach the shelter in time. */
function buildApocalypse(s: Session): LevelLogic {
  const b = new Builder(s, 8080);
  const rng = b.rng;
  const L = 220;
  // Ruined road of crumbling slabs with rubble and wrecked buildings
  for (let z = 0; z < L; z += 6) {
    for (let x = -12; x <= 12; x += 6) {
      const c = new THREE.Vector3(x, -0.4, z);
      if (z > 20 && rng.chance(0.28)) b.add(new VanishingPlatform(c, new THREE.Vector3(6, 0.8, 6), M.darkConcrete(), 1.2, 999));
      else b.box(c, new THREE.Vector3(6, 0.8, 6), rng.chance(0.5) ? M.asphalt() : M.darkConcrete(), { tile: 4 });
    }
    if (rng.chance(0.4)) b.box(new THREE.Vector3(rng.range(-10, 10), 0.8, z), new THREE.Vector3(rng.range(1, 3), rng.range(1, 2), rng.range(1, 3)), M.darkRock());
  }
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? 1 : -1;
    const h = rng.range(8, 35);
    const z = rng.range(0, L);
    b.box(new THREE.Vector3(side * rng.range(22, 40), h / 2 - 2, z), new THREE.Vector3(rng.range(8, 14), h, rng.range(8, 14)), M.darkConcrete(), { collide: false });
    if (rng.chance(0.5)) b.add(new Campfire(new THREE.Vector3(side * 17, 0, z), false, 2));
  }
  for (const x of [-15.5, 15.5]) b.invisible(new THREE.Vector3(x, 4, L / 2), new THREE.Vector3(1, 10, L + 20));
  // Shelter bunker
  const sh = new THREE.Vector3(0, 0, L + 8);
  b.plat(0, 0, L + 8, 16, 16, M.metal());
  b.box(new THREE.Vector3(0, 3.5, L + 14), new THREE.Vector3(16, 7, 2), M.darkMetal());
  b.goal(sh, false, 0x3dffa2);
  b.lamp(sh.clone().setY(6), 0x3dffa2, 0.4, true, 30);
  b.coins.addLine(new THREE.Vector3(0, 1, 10), new THREE.Vector3(0, 1, L - 10), 20);
  b.finalize();
  let meteorT = 1.5;
  return {
    spawn: new THREE.Vector3(0, 0.05, 2),
    spawnYaw: 0,
    theme: 'apocalypse',
    music: 'apocalypse',
    ambient: ['fire', 'wind', 'lava'],
    objective: 'Reach the shelter before the world ends',
    abilityMode: 'airdash',
    combat: false,
    killY: -25,
    timeLimit: 75,
    update: (dt) => {
      if (s.state !== 'playing') return;
      meteorT -= dt;
      if (meteorT <= 0) {
        meteorT = rand(0.35, 0.8) * (s.diff.timeLimit < 1 ? 0.7 : 1);
        const ahead = s.player.pos.clone().add(new THREE.Vector3(rand(-10, 10), 0, rand(-4, 22)));
        ahead.y = 0.05;
        s.add(new Meteor(ahead, 1.3, 3, 28, 'meteor', (p) => {
          // Impacts shatter nearby slabs
          for (const e of s.entities) if (e instanceof VanishingPlatform && (e.obj.position.distanceTo(p) < 5)) e.trigger();
        }));
      }
      if (Math.random() < dt * 2) s.rig.shake(0.06);
      s.progress = `Shelter: ${Math.max(0, Math.round(L + 8 - s.player.pos.z))}m`;
    },
  };
}

