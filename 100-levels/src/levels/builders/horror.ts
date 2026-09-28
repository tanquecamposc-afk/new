/**
 * WORLD 5 — HORROR (levels 41-50). Dark manors, cellars, chapels and black
 * woods. Flashlight with battery, stalkers that hunt by sight, wardrobes to
 * hide in, moderate jumpscares, whispers and heartbeats.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Entity, Interactable } from '../../entities/Entity';
import { Stalker } from '../../enemies/Creatures';
import { ObjectiveItem, ItemMeshes, Trigger, GoalPortal } from '../../entities/Pickups';
import { M, mat, glowMat, boxGeo, cachedGeo } from '../../gfx/Materials';
import { forest, grassTufts } from '../Decor';
import { Audio } from '../../audio/AudioManager';
import { makeCollider } from '../../physics/Physics';
import { useGame } from '../../store/gameStore';
import { RNG, rand } from '../../core/math';
import { Input } from '../../core/Input';
import { CharacterModel } from '../../player/CharacterModel';
import { Animator } from '../../player/Animator';

/** Player flashlight following the camera aim; battery drains slowly. */
export class Flashlight extends Entity {
  light: THREE.SpotLight;
  battery = 100;
  private flicker = 0;
  drain = 0.9;
  constructor(shadows: boolean) {
    super();
    this.light = new THREE.SpotLight(0xfff2d8, 320, 38, 0.55, 0.5, 1.3);
    this.light.castShadow = shadows;
    this.light.shadow.mapSize.set(512, 512);
    this.light.shadow.bias = -0.002;
  }
  init(s: Session) {
    s.scene.add(this.light, this.light.target);
  }
  recharge(n: number) {
    this.battery = Math.min(100, this.battery + n);
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    const cam = s.camera;
    const dir = s.rig.aimDir();
    this.light.position.copy(p.headPos).addScaledVector(s.rig.right(), 0.35).addScaledVector(dir, 0.3);
    this.light.target.position.copy(cam.position).addScaledVector(dir, 20);
    if (s.state === 'playing') this.battery = Math.max(0, this.battery - dt * this.drain);
    this.flicker -= dt;
    let k = this.battery > 25 ? 1 : 0.35 + (this.battery / 25) * 0.65;
    if (this.battery < 25 && Math.random() < 0.05) this.flicker = rand(0.05, 0.2);
    if (this.battery <= 0) k = 0.08;
    if (this.flicker > 0) k *= 0.15;
    this.light.intensity = 320 * k;
    this.light.visible = !p.hidden;
  }
}

/** Hide spot: step in with E, out with E. Stalkers can't see you inside. */
export class Wardrobe extends Entity {
  private it!: Interactable;
  private inside = false;
  private door: THREE.Mesh;
  constructor(private pos: THREE.Vector3, private yaw: number) {
    super();
    const wood = M.planks();
    const body = new THREE.Mesh(boxGeo(1.6, 2.6, 1), wood);
    body.position.y = 1.3;
    body.castShadow = true;
    this.door = new THREE.Mesh(boxGeo(1.5, 2.4, 0.08), mat('wardrobeDoor', { tex: 'wood', color: 0x5a3a28 }));
    this.door.position.set(0, 1.3, 0.52);
    const knob = new THREE.Mesh(cachedGeo('knob', () => new THREE.SphereGeometry(0.05, 6, 4)), M.metal());
    knob.position.set(0.55, 1.3, 0.58);
    this.obj.add(body, this.door, knob);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    const size = Math.abs(Math.sin(this.yaw)) > 0.5 ? new THREE.Vector3(1, 2.6, 1.6) : new THREE.Vector3(1.6, 2.6, 1);
    this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 1.3), size));
    const front = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.it = s.addInteractable({ pos: this.pos.clone().addScaledVector(front, 0.9).setY(this.pos.y + 1), radius: 1.6, prompt: 'Hide', enabled: true, onInteract: () => this.toggle() });
  }
  private toggle() {
    const s = this.session;
    const p = s.player;
    const front = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    Audio.play('door', { pos: this.pos, pitch: 1.5, vol: 0.5 });
    if (!this.inside) {
      this.inside = true;
      p.hidden = true;
      this.it.prompt = 'Leave';
      this.it.pos.copy(p.center);
      p.pos.copy(this.pos.clone().addScaledVector(front, 1.1));
      s.rig.yaw = this.yaw;
      s.rig.pitch = 0.05;
      s.emitNoise(this.pos, 2);
    } else {
      this.inside = false;
      p.hidden = false;
      this.it.prompt = 'Hide';
      this.it.pos.copy(this.pos.clone().addScaledVector(front, 0.9).setY(this.pos.y + 1));
    }
  }
  update() {
    this.door.rotation.y += ((this.inside ? 0.12 : 0) - this.door.rotation.y) * 0.2;
    if (this.inside) {
      const s = this.session;
      // Peek through the gap: camera inside the wardrobe
      const front = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      s.rig.distance = 0.6;
      s.player.pos.copy(this.pos.clone().addScaledVector(front, 1.1));
      if (s.state !== 'playing') return;
      if (Input.isDown('forward') || Input.isDown('back') || Input.isDown('left') || Input.isDown('right')) {
        // Walking cancels hiding
      }
    } else if (this.session.rig.distance < 2) this.session.rig.distance = 4.8;
  }
  dispose() {
    this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** A pale figure that appears for a moment when you enter a zone. */
export class Jumpscare extends Entity {
  private model: CharacterModel;
  private t = -1;
  constructor(private zoneMin: THREE.Vector3, private zoneMax: THREE.Vector3, private at: THREE.Vector3) {
    super();
    this.model = new CharacterModel('enemy_stalker', 1.3);
    this.model.root.visible = false;
    this.obj.add(this.model.root);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    s.add(new Trigger(this.zoneMin, this.zoneMax, () => this.fire()));
  }
  private fire() {
    const s = this.session;
    this.t = 0.9;
    this.model.root.visible = true;
    this.model.root.position.copy(this.at);
    this.model.root.lookAt(s.player.pos.clone().setY(this.at.y));
    this.model.joints.shL.rotation.x = -1.4;
    this.model.joints.shR.rotation.x = -1.4;
    Audio.play('jumpscare', { vol: 0.8 });
    s.post.flashScreen(0x300000, 0.35, 3);
    s.rig.shake(0.4);
    s.post.hit(1.5);
  }
  update(dt: number) {
    if (this.t < 0) return;
    this.t -= dt;
    this.model.joints.head.rotation.z = Math.sin(this.session.clock * 40) * 0.3;
    if (this.t <= 0) {
      this.model.root.visible = false;
      this.session.particles.emit('smoke', this.at.clone().setY(this.at.y + 1.5), { count: 20, color: 0x101010 });
      this.destroy();
    }
  }
}

/** Candle with a flickering flame (and optional real light). */
export class Candle extends Entity {
  lit: boolean;
  private flame: THREE.Mesh;
  private pl: THREE.PointLight | null = null;
  private it: Interactable | null = null;
  constructor(private pos: THREE.Vector3, lit = true, private light = false, private onLight?: () => void) {
    super();
    this.lit = lit;
    const c = new THREE.Mesh(cachedGeo('candleBody', () => new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8).translate(0, 0.175, 0)), mat('wax', { color: 0xf0e6d0, roughness: 0.6 }));
    this.flame = new THREE.Mesh(cachedGeo('flame', () => new THREE.SphereGeometry(0.05, 6, 6).scale(1, 2, 1)), glowMat(0xffa040, 4));
    this.flame.position.y = 0.42;
    this.flame.visible = lit;
    this.obj.add(c, this.flame);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (this.light) {
      this.pl = new THREE.PointLight(0xff9a40, this.lit ? 5 : 0, 9, 2);
      this.pl.position.set(0, 0.6, 0);
      this.obj.add(this.pl);
    }
    if (this.onLight) this.it = s.addInteractable({ pos: this.pos.clone().setY(this.pos.y + 0.5), radius: 1.6, prompt: 'Light candle', enabled: !this.lit, onInteract: () => this.ignite() });
  }
  ignite() {
    if (this.lit) return;
    this.lit = true;
    this.flame.visible = true;
    if (this.it) this.it.enabled = false;
    Audio.play('fire', { pos: this.pos, vol: 0.5 });
    this.session.particles.emit('fire', this.pos.clone().setY(this.pos.y + 0.45), { count: 12, size: [0.2, 0.02] });
    this.onLight?.();
  }
  update() {
    if (!this.lit) return;
    const t = this.session.clock;
    this.flame.scale.y = 1 + Math.sin(t * 20 + this.pos.x) * 0.15;
    if (this.pl) this.pl.intensity = 4 + Math.sin(t * 13) * 0.6 + Math.random() * 0.5;
  }
  dispose() {
    if (this.it) this.session.removeInteractable(this.it);
    super.dispose();
  }
}

// ── Maze generation ─────────────────────────────────────────────────────────
interface Maze {
  w: number;
  h: number;
  /** walls[y][x] = [north, east] walls exist */
  east: boolean[][];
  north: boolean[][];
  dist: number[][];
}

function genMaze(w: number, h: number, rng: RNG, loops = 0.15): Maze {
  const east = Array.from({ length: h }, () => Array(w).fill(true));
  const north = Array.from({ length: h }, () => Array(w).fill(true));
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb: [number, number, string][] = [];
    if (x > 0 && !seen[y][x - 1]) nb.push([x - 1, y, 'w']);
    if (x < w - 1 && !seen[y][x + 1]) nb.push([x + 1, y, 'e']);
    if (y > 0 && !seen[y - 1][x]) nb.push([x, y - 1, 's']);
    if (y < h - 1 && !seen[y + 1][x]) nb.push([x, y + 1, 'n']);
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const [nx, ny, d] = rng.pick(nb);
    if (d === 'e') east[y][x] = false;
    if (d === 'w') east[y][nx] = false;
    if (d === 'n') north[y][x] = false;
    if (d === 's') north[ny][x] = false;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  // Knock out extra walls for loops (multiple routes to escape stalkers)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (x < w - 1 && rng.chance(loops)) east[y][x] = false;
      if (y < h - 1 && rng.chance(loops)) north[y][x] = false;
    }
  // BFS distances from start
  const dist = Array.from({ length: h }, () => Array(w).fill(-1));
  const q: [number, number][] = [[0, 0]];
  dist[0][0] = 0;
  while (q.length) {
    const [x, y] = q.shift()!;
    const d = dist[y][x];
    const tryGo = (nx: number, ny: number, open: boolean) => {
      if (open && nx >= 0 && ny >= 0 && nx < w && ny < h && dist[ny][nx] < 0) {
        dist[ny][nx] = d + 1;
        q.push([nx, ny]);
      }
    };
    tryGo(x + 1, y, x < w - 1 && !east[y][x]);
    tryGo(x - 1, y, x > 0 && !east[y][x - 1]);
    tryGo(x, y + 1, y < h - 1 && !north[y][x]);
    tryGo(x, y - 1, y > 0 && !north[y - 1][x]);
  }
  return { w, h, east, north, dist };
}

interface HorrorCfg {
  kind: 'manor' | 'forest';
  size: number;
  items: number;
  item: 'key' | 'fuse' | 'spirit' | 'candle';
  stalkers: number;
  wardrobes: number;
  scares: number;
  dark: number;
}

const CFG: Record<string, HorrorCfg> = {
  manor: { kind: 'manor', size: 5, items: 1, item: 'key', stalkers: 1, wardrobes: 3, scares: 1, dark: 0 },
  fuses: { kind: 'manor', size: 6, items: 3, item: 'fuse', stalkers: 1, wardrobes: 4, scares: 2, dark: 0 },
  forest: { kind: 'forest', size: 60, items: 4, item: 'spirit', stalkers: 1, wardrobes: 0, scares: 1, dark: 0 },
  hide: { kind: 'manor', size: 6, items: 2, item: 'key', stalkers: 2, wardrobes: 8, scares: 1, dark: 0 },
  cellar: { kind: 'manor', size: 7, items: 3, item: 'key', stalkers: 2, wardrobes: 5, scares: 2, dark: 0.2 },
  figures: { kind: 'manor', size: 7, items: 3, item: 'fuse', stalkers: 3, wardrobes: 6, scares: 2, dark: 0.1 },
  chapel: { kind: 'manor', size: 6, items: 5, item: 'candle', stalkers: 2, wardrobes: 5, scares: 2, dark: 0.1 },
  hunt: { kind: 'forest', size: 75, items: 5, item: 'spirit', stalkers: 3, wardrobes: 0, scares: 2, dark: 0.1 },
  deep: { kind: 'manor', size: 8, items: 4, item: 'key', stalkers: 3, wardrobes: 8, scares: 3, dark: 0.2 },
  pursuit: { kind: 'forest', size: 70, items: 5, item: 'spirit', stalkers: 3, wardrobes: 0, scares: 2, dark: 0.15 },
};

export function buildHorror(s: Session, variant: string): LevelLogic {
  const cfg = CFG[variant] ?? CFG.manor;
  const b = new Builder(s, s.meta.num * 211 + 17);
  const rng = b.rng;
  const flash = s.add(new Flashlight(s.engine.quality === 'high'));
  let collected = 0;
  let goal!: GoalPortal;
  const stalkers: Stalker[] = [];
  const itemName = { key: 'keys', fuse: 'fuses', spirit: 'lantern spirits', candle: 'candles lit' }[cfg.item];
  const onItem = () => {
    collected++;
    s.progress = `${itemName}: ${collected}/${cfg.items}`;
    Audio.play('bell');
    if (collected >= cfg.items) {
      goal.setLocked(false);
      useGame.getState().showBanner({ title: cfg.item === 'candle' ? 'THE SEAL IS BROKEN' : 'THE WAY OUT IS OPEN', subtitle: 'Find the exit', color: '#c23b3b' }, 2600);
      // Everything wakes up
      stalkers.forEach((st) => (st.speed *= 1.1));
      Audio.play('roar', { pitch: 0.6, vol: 0.5 });
    }
  };
  const itemMesh = () => (cfg.item === 'key' ? ItemMeshes.key() : cfg.item === 'fuse' ? ItemMeshes.fuse() : ItemMeshes.orb(0xb0ffb0));
  let spawn = new THREE.Vector3();
  let spawnYaw = 0;
  let stalkerArea = { min: new THREE.Vector3(), max: new THREE.Vector3() };

  if (cfg.kind === 'manor') {
    const C = 7; // cell size
    const maze = genMaze(cfg.size, cfg.size, rng, variant === 'deep' ? 0.25 : 0.15);
    const wallM = variant === 'cellar' ? M.brick() : variant === 'chapel' ? M.darkMarble() : M.wallpaper();
    const floorM = variant === 'cellar' ? M.darkConcrete() : M.planks();
    const H = 4.2;
    const W = cfg.size * C;
    b.plat(W / 2, 0, W / 2, W + 2, W + 2, floorM, 1, { tile: 3 });
    // Ceiling (blocks the sky → claustrophobic)
    b.box(new THREE.Vector3(W / 2, H + 0.25, W / 2), new THREE.Vector3(W + 2, 0.5, W + 2), mat('ceiling', { tex: 'planks', color: 0x3a2a20 }), { tag: 'noCam', shadow: false });
    const cellC = (x: number, y: number) => new THREE.Vector3(x * C + C / 2, 0, y * C + C / 2);
    const wall = (c: THREE.Vector3, sx: number, sz: number) => b.box(c.clone().setY(H / 2), new THREE.Vector3(sx, H, sz), wallM, { tile: 3 });
    // Outer walls
    wall(new THREE.Vector3(W / 2, 0, -0.25), W + 1, 0.5);
    wall(new THREE.Vector3(W / 2, 0, W + 0.25), W + 1, 0.5);
    wall(new THREE.Vector3(-0.25, 0, W / 2), 0.5, W + 1);
    wall(new THREE.Vector3(W + 0.25, 0, W / 2), 0.5, W + 1);
    for (let y = 0; y < maze.h; y++)
      for (let x = 0; x < maze.w; x++) {
        const c = cellC(x, y);
        if (x < maze.w - 1 && maze.east[y][x]) wall(c.clone().add(new THREE.Vector3(C / 2, 0, 0)), 0.4, C + 0.4);
        if (y < maze.h - 1 && maze.north[y][x]) wall(c.clone().add(new THREE.Vector3(0, 0, C / 2)), C + 0.4, 0.4);
      }
    // Pick cells: items in far dead-ends, exit at the farthest cell
    const cells: { x: number; y: number; d: number; dead: boolean }[] = [];
    for (let y = 0; y < maze.h; y++)
      for (let x = 0; x < maze.w; x++) {
        let open = 0;
        if (x < maze.w - 1 && !maze.east[y][x]) open++;
        if (x > 0 && !maze.east[y][x - 1]) open++;
        if (y < maze.h - 1 && !maze.north[y][x]) open++;
        if (y > 0 && !maze.north[y - 1][x]) open++;
        cells.push({ x, y, d: maze.dist[y][x], dead: open <= 1 });
      }
    cells.sort((a, c) => c.d - a.d);
    const exitCell = cells[0];
    const used = new Set([`${exitCell.x},${exitCell.y}`, '0,0']);
    const pickCell = (preferDead: boolean) => {
      const pool = cells.filter((c) => !used.has(`${c.x},${c.y}`) && c.d > 2 && (!preferDead || c.dead));
      const c = pool.length ? pool[Math.floor(rng.next() * Math.min(pool.length, 8))] : cells.find((c2) => !used.has(`${c2.x},${c2.y}`))!;
      used.add(`${c.x},${c.y}`);
      return c;
    };
    goal = b.goal(cellC(exitCell.x, exitCell.y), true, 0xff4040);
    for (let i = 0; i < cfg.items; i++) {
      const c = pickCell(true);
      const p = cellC(c.x, c.y);
      if (cfg.item === 'candle') {
        b.add(new Candle(p.clone().setY(0.9), false, i < 2, onItem));
        b.box(p.clone().setY(0.45), new THREE.Vector3(1, 0.9, 1), M.darkMarble());
      } else b.add(new ObjectiveItem(p.clone().setY(1.1), itemMesh(), onItem, 'Pick up', false, cfg.item === 'key' ? 0xffc830 : 0x40ff90));
    }
    for (let i = 0; i < cfg.wardrobes; i++) {
      const c = pickCell(false);
      const p = cellC(c.x, c.y);
      // Against a wall that exists
      const side = maze.north[c.y]?.[c.x] || c.y === maze.h - 1 ? 0 : Math.PI;
      b.add(new Wardrobe(p.clone().add(new THREE.Vector3(0, 0, side === 0 ? C / 2 - 0.8 : -C / 2 + 0.8)), side === 0 ? Math.PI : 0));
    }
    // Furniture & candles for atmosphere
    for (let i = 0; i < cfg.size * 2; i++) {
      const c = cells[Math.floor(rng.next() * cells.length)];
      const p = cellC(c.x, c.y).add(new THREE.Vector3(rng.range(-2, 2), 0, rng.range(-2, 2)));
      if (rng.chance(0.5)) {
        b.box(p.clone().setY(0.4), new THREE.Vector3(1.6, 0.8, 0.9), M.planks(), { tile: 1 });
        b.add(new Candle(p.clone().setY(0.8), true, b.lights < 3 && rng.chance(0.4)));
      } else b.box(p.clone().setY(0.45), new THREE.Vector3(0.6, 0.9, 0.6), mat('chair', { tex: 'wood', color: 0x4a3020 }), { tile: 1 });
    }
    // Paintings on walls (eyes follow...)
    for (let i = 0; i < cfg.size; i++) {
      const c = cells[Math.floor(rng.next() * cells.length)];
      const p = cellC(c.x, c.y).add(new THREE.Vector3(0, 2.2, -C / 2 + 0.26));
      if (c.y === 0 || maze.north[c.y - 1]?.[c.x]) {
        const frame = new THREE.Mesh(boxGeo(1.4, 1.8, 0.1), mat('frame', { color: 0x6a4a20, metalness: 0.6, roughness: 0.4 }));
        frame.position.copy(p);
        b.deco(frame);
        const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), mat('painting', { color: 0x1a1210, roughness: 0.9 }));
        canvas.position.copy(p).setZ(p.z + 0.06);
        b.deco(canvas);
        const eyes = new THREE.Mesh(boxGeo(0.4, 0.05, 0.02), glowMat(0xff2020, 1.2));
        eyes.position.copy(p).add(new THREE.Vector3(0, 0.3, 0.08));
        b.deco(eyes);
      }
    }
    // Jumpscares on the way to the items
    for (let i = 0; i < cfg.scares; i++) {
      const c = cells[Math.min(cells.length - 1, Math.floor(cells.length * (0.3 + i * 0.2)))];
      const p = cellC(c.x, c.y);
      b.add(new Jumpscare(p.clone().add(new THREE.Vector3(-2, -1, -2)), p.clone().add(new THREE.Vector3(2, 3, 2)), p.clone().add(new THREE.Vector3(rng.range(-1.5, 1.5), 0, rng.range(-1.5, 1.5)))));
    }
    spawn = cellC(0, 0).setY(0.05);
    spawnYaw = maze.east[0][0] ? 0 : Math.PI / 2;
    stalkerArea = { min: new THREE.Vector3(1, 0, 1), max: new THREE.Vector3(W - 1, 0, W - 1) };
    const wp = cells.filter((c) => c.d > 3).map((c) => cellC(c.x, c.y));
    for (let i = 0; i < cfg.stalkers * s.diff.enemyCount * (s.muts.has('enemies') ? 2 : 1); i++) {
      const c = cells[Math.floor(cells.length * (0.1 + (i * 0.3) % 0.7))];
      stalkers.push(s.add(new Stalker(cellC(c.x, c.y).setY(0.1), stalkerArea, wp)));
    }
    // Secret: a relic in a sealed corner behind a painting-lit dead end
    if (s.meta.hasSecret) {
      const c = pickCell(true);
      b.secret(cellC(c.x, c.y).setY(1.2));
    } else if (rng.chance(0.6)) {
      const c = pickCell(true);
      b.chest('rare', cellC(c.x, c.y));
    }
    for (const c of cells.slice(0, 20)) if (rng.chance(0.3)) b.coin(cellC(c.x, c.y).x + 1, 1, cellC(c.x, c.y).z);
  } else {
    // ── Forest
    const R = cfg.size;
    b.plat(0, 0, 0, R * 2 + 20, R * 2 + 20, M.dirt(), 1, { tile: 6 });
    const trunks = forest(b, new THREE.Vector3(), 6, R, Math.round(R * 3.2), true);
    forest(b, new THREE.Vector3(), R + 2, R + 30, 160, true);
    for (const t of trunks) {
      const c = makeCollider(t.clone().setY(2), new THREE.Vector3(0.7, 4, 0.7), { blocksSight: true });
      s.physics.add(c);
    }
    grassTufts(b, new THREE.Vector3(), R, 400, 0x2a3a20);
    // Boundary
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      b.invisible(new THREE.Vector3(Math.cos(a) * (R + 3), 3, Math.sin(a) * (R + 3)), new THREE.Vector3(18, 6, 18)).blocksSight = false;
    }
    // Lantern path / items in a ring
    for (let i = 0; i < cfg.items; i++) {
      const a = (i / cfg.items) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const r = rng.range(R * 0.45, R * 0.85);
      const p = new THREE.Vector3(Math.cos(a) * r, 1.2, Math.sin(a) * r);
      b.add(new ObjectiveItem(p, itemMesh(), onItem, 'Collect', true, 0xb0ffb0));
      const post = new THREE.Mesh(cachedGeo('lanternPost', () => new THREE.CylinderGeometry(0.06, 0.08, 2, 6).translate(0, 1, 0)), M.darkMetal());
      post.position.copy(p).setY(0).add(new THREE.Vector3(1.2, 0, 0));
      b.deco(post);
      b.lamp(post.position.clone().setY(2.1), 0xffa040, 0.15, i < 4, 6);
    }
    goal = b.goal(new THREE.Vector3(0, 0, -R * 0.2), true, 0xff4040);
    spawn = new THREE.Vector3(0, 0.05, R * 0.2);
    spawnYaw = Math.PI;
    stalkerArea = { min: new THREE.Vector3(-R, 0, -R), max: new THREE.Vector3(R, 0, R) };
    for (let i = 0; i < cfg.stalkers * s.diff.enemyCount; i++) {
      const a = (i / cfg.stalkers) * Math.PI * 2 + 1;
      stalkers.push(s.add(new Stalker(new THREE.Vector3(Math.cos(a) * R * 0.7, 0.1, Math.sin(a) * R * 0.7), stalkerArea)));
    }
    // Hollow tree hiding spots
    for (let i = 0; i < 4; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(R * 0.3, R * 0.8);
      b.add(new Wardrobe(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), rng.range(0, Math.PI * 2)));
    }
    for (let i = 0; i < cfg.scares; i++) {
      const a = rng.range(0, Math.PI * 2), r = R * 0.5;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      b.add(new Jumpscare(p.clone().add(new THREE.Vector3(-4, -1, -4)), p.clone().add(new THREE.Vector3(4, 3, 4)), p.clone().add(new THREE.Vector3(2, 0, 2))));
    }
    if (s.meta.hasSecret) b.secret(new THREE.Vector3(R * 0.9, 1.2, 0));
    for (let i = 0; i < 10; i++) b.coin(rng.range(-R * 0.7, R * 0.7), 1, rng.range(-R * 0.7, R * 0.7));
  }

  // Battery pickups
  const batteries = cfg.kind === 'manor' ? 3 : 4;
  for (let i = 0; i < batteries; i++) {
    const p = cfg.kind === 'manor' ? new THREE.Vector3(rng.range(4, cfg.size * 7 - 4), 1, rng.range(4, cfg.size * 7 - 4)) : new THREE.Vector3(rng.range(-cfg.size * 0.6, cfg.size * 0.6), 1, rng.range(-cfg.size * 0.6, cfg.size * 0.6));
    const bat = new THREE.Mesh(boxGeo(0.2, 0.35, 0.2), glowMat(0x80ff60, 1.5));
    b.add(new ObjectiveItem(p, bat, () => {
      flash.recharge(50);
      s.toast('🔋', 'BATTERY', '+50% flashlight');
    }, 'Battery', true, 0x80ff60));
  }

  let whisperT = 8;
  let fear = 0;
  b.finalize();
  s.progress = `${itemName}: 0/${cfg.items}`;
  return {
    spawn,
    spawnYaw,
    theme: cfg.kind === 'forest' ? 'forest' : 'horror',
    music: 'horror',
    ambient: cfg.kind === 'forest' ? ['wind', 'drone'] : ['drone'],
    objective: cfg.item === 'candle' ? 'Light every candle to break the seal, then escape' : `Find the ${itemName} and escape`,
    abilityMode: 'flash',
    combat: false,
    killY: -20,
    update: (dt) => {
      whisperT -= dt;
      if (whisperT <= 0) {
        whisperT = rand(10, 22);
        Audio.play(Math.random() < 0.5 ? 'whisper' : 'door', { vol: 0.4, pos: s.player.pos.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(-8, 8))) });
      }
      const near = stalkers.reduce((m, st) => Math.min(m, st.distToPlayer), 99);
      const hunted = stalkers.some((st) => st.state === 'hunt');
      fear += ((hunted ? 100 : Math.max(0, 100 - near * 6)) - fear) * Math.min(1, dt * 2);
      s.post.darkness = cfg.dark + (fear / 100) * 0.25 + (s.muts.has('darkness') ? 0.4 : 0);
      if (hunted) Audio.setMusicIntensity(2);
      else Audio.setMusicIntensity(fear > 40 ? 1 : 0);
      s.post.motionTarget = hunted ? 0.2 : 0;
    },
    hud: () => ({ horror: { fear, battery: flash.battery } }),
  };
}

/** THE WATCHER (level 50): an unkillable giant chases you down a forest path. */
class Watcher extends Entity {
  model: CharacterModel;
  z: number;
  speed = 4.6;
  active = false;
  private t = 0;
  constructor(z0: number, private pathX: (z: number) => number) {
    super();
    this.z = z0;
    this.model = new CharacterModel('enemy_stalker', 3.3);
    this.obj.add(this.model.root);
    const eyes = new THREE.PointLight(0xff2020, 20, 16);
    eyes.position.set(0, 5.9, 0.6);
    this.obj.add(eyes);
  }
  private anim!: Animator;
  init(s: Session) {
    s.scene.add(this.obj);
    this.anim = new Animator(this.model);
  }
  get pos() {
    return new THREE.Vector3(this.pathX(this.z), 0, this.z);
  }
  update(dt: number) {
    const s = this.session;
    const p = s.player;
    this.t += dt;
    if (this.active && s.state === 'playing') {
      const gap = p.pos.z - this.z;
      // Relentless: speeds up when far, never stops
      const sp = this.speed * s.diff.enemySpeed + Math.max(0, gap - 18) * 0.35;
      this.z += sp * dt;
      if (gap < 2.2 && !p.dead) {
        Audio.play('jumpscare');
        Audio.play('roar', { pitch: 0.5 });
        s.post.flashScreen(0x600000, 0.9, 1);
        s.fail('The Watcher caught you');
      }
      if (Math.floor(this.t * 1.6) !== Math.floor((this.t - dt) * 1.6)) {
        Audio.play('slam', { pos: this.pos, vol: 0.9 });
        s.rig.shake(Math.max(0, 0.4 - gap * 0.012));
        s.particles.emit('dust', this.pos, { count: 12, spread: 2 });
      }
    }
    const pos = this.pos;
    this.obj.position.copy(pos);
    this.obj.rotation.y = Math.atan2(p.pos.x - pos.x, p.pos.z - pos.z);
    this.anim.update(dt, { speed: this.active ? 6 : 0, grounded: true, vy: 0, crouch: false, sprint: true, stride: 3.2 });
    this.model.joints.head.rotation.z = Math.sin(this.t * 17) * 0.15;
  }
}

export function buildWatcher(s: Session): LevelLogic {
  const b = new Builder(s, 5050);
  const L = 300;
  const pathX = (z: number) => Math.sin(z * 0.02) * 12 + Math.sin(z * 0.053) * 5;
  const W = 11;
  // Ground strip & tree walls following the path
  const seg = 10;
  for (let z = -20; z < L + 20; z += seg) {
    const x = pathX(z + seg / 2);
    b.plat(x, 0, z + seg / 2, W + 30, seg + 0.2, M.dirt(), 1, { tile: 6 });
    b.invisible(new THREE.Vector3(x - W / 2 - 1, 3, z + seg / 2), new THREE.Vector3(2, 6, seg + 2)).blocksSight = false;
    b.invisible(new THREE.Vector3(x + W / 2 + 1, 3, z + seg / 2), new THREE.Vector3(2, 6, seg + 2)).blocksSight = false;
  }
  const trees: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[] = [];
  for (let z = -20; z < L + 20; z += 2.2) {
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
      const x = pathX(z) + side * (W / 2 + 1.5 + k * 3 + b.rng.range(0, 2));
      const sc = b.rng.range(1, 1.8);
      trees.push({ pos: new THREE.Vector3(x, 0, z + b.rng.range(-1, 1)), rot: new THREE.Euler(0, b.rng.range(0, 6), 0), scale: new THREE.Vector3(sc, sc * b.rng.range(1, 1.5), sc) });
    }
  }
  const bark = mat('barkTrue', { tex: 'wood', color: 0x2a2018, roughness: 0.95 });
  const leaf = mat('leafTrue', { tex: 'grass', color: 0x1a2a1a, roughness: 0.9 });
  b.instanced(cachedGeo('trunk', () => new THREE.CylinderGeometry(0.18, 0.3, 4, 7).translate(0, 2, 0)), bark, trees);
  b.instanced(cachedGeo('leaves', () => new THREE.ConeGeometry(1.8, 4.5, 8).translate(0, 5.2, 0)), leaf, trees);
  // Obstacles every ~25m: logs (jump), low branches (crouch), gates (hold E)
  const flash = s.add(new Flashlight(s.engine.quality === 'high'));
  flash.drain = 0.25;
  for (let z = 30, i = 0; z < L - 20; z += 24 + b.rng.range(-4, 4), i++) {
    const x = pathX(z);
    const kind = i % 3;
    if (kind === 0) {
      b.box(new THREE.Vector3(x, 0.45, z), new THREE.Vector3(W, 0.9, 1), mat('log', { tex: 'wood', color: 0x5a3a24 }), { tile: 2 });
    } else if (kind === 1) {
      b.box(new THREE.Vector3(x, 2.3, z), new THREE.Vector3(W, 2, 1.6), mat('log', { tex: 'wood', color: 0x5a3a24 }), { tile: 2 });
      b.box(new THREE.Vector3(x - W / 4, 0.6, z - 0.2), new THREE.Vector3(W / 2 - 1.2, 1.2, 1.2), M.darkRock());
    } else {
      const gateC = new THREE.Vector3(x, 1.8, z);
      const gate = b.box(gateC, new THREE.Vector3(W, 3.6, 0.4), mat('gate', { tex: 'metal', color: 0x3a3028, roughness: 0.7, metalness: 0.7 }), { tile: 1 });
      const it: Interactable = s.addInteractable({
        pos: gateC.clone().setY(1).add(new THREE.Vector3(0, 0, -0.8)), radius: 6, prompt: 'Force the gate', enabled: true, hold: 1.3,
        onInteract: () => {
          it.enabled = false;
          if (gate.col) gate.col.enabled = false;
          gate.mesh.visible = false;
          Audio.play('break', { pos: gateC });
          s.particles.emit('debris', gateC, { count: 30, spread: 3 });
        },
      });
    }
    if (i % 2 === 0) b.lamp(new THREE.Vector3(x + W / 2 - 0.5, 2.2, z - 4), 0xff8030, 0.12, b.lights < 4, 8);
  }
  // Exit: a blinding light
  const exitZ = L;
  b.goal(new THREE.Vector3(pathX(exitZ), 0, exitZ), false, 0xfff0c0);
  b.light(new THREE.Vector3(pathX(exitZ), 4, exitZ), 0xfff0c0, 60, 40);
  const watcher = s.add(new Watcher(-14, pathX));
  b.finalize();
  let roared = false;
  return {
    spawn: new THREE.Vector3(pathX(4), 0.05, 4),
    spawnYaw: 0,
    theme: 'forest',
    music: 'watcher',
    ambient: ['wind', 'drone'],
    objective: 'RUN. Reach the light.',
    abilityMode: 'none',
    combat: false,
    killY: -20,
    intro: () => {
      const wp = new THREE.Vector3(pathX(-14), 6, -14);
      s.after(1.2, () => {
        Audio.play('roar', { pitch: 0.45 });
        s.rig.shake(0.6);
        useGame.getState().showBanner({ title: 'THE WATCHER', subtitle: 'It cannot die. Run.', color: '#ff2020', big: true }, 3000);
      });
      return [
        { from: new THREE.Vector3(pathX(4) + 3, 2, 10), to: new THREE.Vector3(pathX(0) + 2, 3, 2), lookFrom: wp.clone().setY(3), lookTo: wp, duration: 2.6, fov: 45 },
        { from: new THREE.Vector3(pathX(0) + 2, 3, 2), to: new THREE.Vector3(pathX(4), 3, -0.5), lookFrom: wp, lookTo: new THREE.Vector3(pathX(10), 1.5, 12), duration: 0.9, fov: 62 },
      ];
    },
    update: () => {
      if (s.state === 'playing' && !roared) {
        roared = true;
        watcher.active = true;
      }
      const gap = s.player.pos.z - watcher.z;
      s.progress = `Distance to the light: ${Math.max(0, Math.round(exitZ - s.player.pos.z))}m · It is ${Math.round(gap)}m behind`;
      s.post.darkness = Math.max(0, 0.45 - gap * 0.015);
      s.post.lowHp = gap < 10 ? 0.6 : 0;
      Audio.setMusicIntensity(gap < 12 ? 2 : 1);
    },
    hud: () => ({ horror: { fear: Math.max(0, 100 - (s.player.pos.z - watcher.z) * 4), battery: flash.battery } }),
  };
}
