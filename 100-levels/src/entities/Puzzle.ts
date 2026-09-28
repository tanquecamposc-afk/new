/**
 * Puzzle entities: glyph tablets & code panels, memory tile grids, invisible
 * platforms revealed by the pulse ability, rotatable mirrors & light beams,
 * lights-out lamps.
 */
import * as THREE from 'three';
import { Entity, Interactable } from './Entity';
import { boxGeo, cachedGeo, glowMat, M } from '../gfx/Materials';
import { getTextTexture } from '../gfx/Textures';
import { makeCollider, Collider } from '../physics/Physics';
import { Audio } from '../audio/AudioManager';
import { playerOverlaps } from './Platforms';
import { rand } from '../core/math';
import type { Session } from '../levels/Session';

export const GLYPHS = ['Δ', 'Ω', 'Σ', 'Ψ', 'Φ', 'Λ', 'Ξ', 'Π'];
const glyphMat = (g: string, color = '#c8a8ff') => new THREE.MeshBasicMaterial({ map: getTextTexture(g, color, 'rgba(0,0,0,0)', 256, '900 170px Georgia, serif'), transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });

/** Wall tablet showing a glyph and its position in the code. */
export class GlyphTablet extends Entity {
  constructor(private pos: THREE.Vector3, private yaw: number, glyph: string, index: number) {
    super();
    const slab = new THREE.Mesh(boxGeo(1.4, 2, 0.25), M.darkMarble());
    slab.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), glyphMat(glyph));
    face.position.set(0, 0.25, 0.14);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glyphMat(String(index + 1), '#ffe066'));
    num.position.set(0, -0.65, 0.14);
    this.obj.add(slab, face, num);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
  }
}

/** Panel with glyph buttons; enter the right sequence. */
export class CodePanel extends Entity {
  private entered: number[] = [];
  solved = false;
  private buttons: { mesh: THREE.Mesh; it: Interactable; idx: number }[] = [];
  private display: THREE.Mesh[] = [];
  constructor(private pos: THREE.Vector3, private yaw: number, private code: number[], private options: number[], private onSolve: () => void) {
    super();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    const base = new THREE.Mesh(boxGeo(this.options.length * 1.2 + 1, 0.8, 1.6), M.darkMarble());
    base.position.y = 0.4;
    this.obj.add(base);
    this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 0.4), new THREE.Vector3(this.options.length * 1.2 + 1, 0.8, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0)));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.options.forEach((g, i) => {
      const x = (i - (this.options.length - 1) / 2) * 1.2;
      const m = new THREE.Mesh(boxGeo(0.9, 0.2, 0.9), glowMat(0x6040a0, 1.2));
      m.position.set(x, 0.9, 0);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), glyphMat(GLYPHS[g]));
      face.rotation.x = -Math.PI / 2;
      face.position.set(x, 1.01, 0);
      this.obj.add(m, face);
      const wp = this.pos.clone().addScaledVector(right, x).setY(this.pos.y + 1);
      const it = s.addInteractable({ pos: wp, radius: 1.1, prompt: `Press ${GLYPHS[g]}`, enabled: true, onInteract: () => this.press(i) });
      this.buttons.push({ mesh: m, it, idx: g });
    });
    // Code display above
    for (let i = 0; i < this.code.length; i++) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0x302040 }));
      d.position.set((i - (this.code.length - 1) / 2) * 0.8, 2.3, 0);
      this.obj.add(d);
      this.display.push(d);
    }
    const back = new THREE.Mesh(boxGeo(this.code.length * 0.8 + 0.6, 1.2, 0.1), M.darkMetal());
    back.position.set(0, 2.3, -0.08);
    this.obj.add(back);
  }
  private press(i: number) {
    if (this.solved) return;
    const s = this.session;
    const b = this.buttons[i];
    b.mesh.position.y = 0.82;
    s.after(0.2, () => (b.mesh.position.y = 0.9));
    const slot = this.entered.length;
    this.entered.push(b.idx);
    this.display[slot].material = glyphMat(GLYPHS[b.idx], '#ffe066');
    Audio.play('switch');
    if (this.entered[slot] !== this.code[slot]) {
      Audio.play('error');
      s.post.flashScreen(0xff2040, 0.2, 4);
      this.entered = [];
      s.after(0.4, () => this.display.forEach((d) => (d.material = new THREE.MeshBasicMaterial({ color: 0x401020 }))));
      s.after(1, () => this.display.forEach((d) => (d.material = new THREE.MeshBasicMaterial({ color: 0x302040 }))));
      s.toast('✖', 'WRONG CODE', 'Find the numbered glyph tablets');
      return;
    }
    if (this.entered.length === this.code.length) {
      this.solved = true;
      Audio.play('powerup');
      s.particles.emit('magic', this.pos.clone().setY(this.pos.y + 2), { count: 50, color: 0xb48cff, velSpread: 4 });
      this.buttons.forEach((bt) => (bt.it.enabled = false));
      this.onSolve();
    }
  }
  dispose() {
    this.buttons.forEach((b) => this.session.removeInteractable(b.it));
    super.dispose();
  }
}

/** Grid of floor tiles that flash a sequence; repeat it by stepping on them. */
export class MemoryTiles extends Entity {
  private tiles: { mesh: THREE.Mesh; min: THREE.Vector3; max: THREE.Vector3 }[] = [];
  private seq: number[] = [];
  private round = 0;
  private mode: 'idle' | 'show' | 'input' | 'done' = 'idle';
  private t = 0;
  private showIdx = 0;
  private inputIdx = 0;
  private current = -1;
  started = false;
  constructor(private center: THREE.Vector3, private n = 3, private rounds = [3, 4, 5], private onSolve: () => void, private tileSize = 2.4) {
    super();
  }
  init(s: Session) {
    s.scene.add(this.obj);
    const gap = this.tileSize + 0.4;
    for (let x = 0; x < this.n; x++)
      for (let z = 0; z < this.n; z++) {
        const p = this.center.clone().add(new THREE.Vector3((x - (this.n - 1) / 2) * gap, 0.03, (z - (this.n - 1) / 2) * gap));
        const m = new THREE.Mesh(boxGeo(this.tileSize, 0.1, this.tileSize), new THREE.MeshStandardMaterial({ color: 0x2a2440, emissive: 0x302060, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.4 }));
        m.position.copy(p);
        m.receiveShadow = true;
        this.obj.add(m);
        this.tiles.push({ mesh: m, min: p.clone().add(new THREE.Vector3(-this.tileSize / 2, -0.2, -this.tileSize / 2)), max: p.clone().add(new THREE.Vector3(this.tileSize / 2, 1, this.tileSize / 2)) });
      }
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.nextRound();
  }
  private nextRound() {
    const len = this.rounds[this.round];
    this.seq = [];
    for (let i = 0; i < len; i++) {
      let k = Math.floor(Math.random() * this.tiles.length);
      if (k === this.seq[i - 1]) k = (k + 1) % this.tiles.length;
      this.seq.push(k);
    }
    this.mode = 'show';
    this.showIdx = 0;
    this.t = 1.2;
    this.session.progress = `Memory round ${this.round + 1}/${this.rounds.length} — watch the sequence`;
  }
  private light(i: number, color: number, k = 2.5) {
    const m = this.tiles[i].mesh.material as THREE.MeshStandardMaterial;
    m.emissive.set(color);
    m.emissiveIntensity = k;
  }
  private resetLights() {
    this.tiles.forEach((_, i) => this.light(i, 0x302060, 0.3));
  }
  update(dt: number) {
    const s = this.session;
    this.t -= dt;
    if (this.mode === 'show') {
      if (this.t <= 0) {
        this.resetLights();
        if (this.showIdx < this.seq.length) {
          this.light(this.seq[this.showIdx], 0xb48cff, 4);
          Audio.play('bell', { pitch: 1 + this.seq[this.showIdx] * 0.1 });
          this.showIdx++;
          this.t = 0.75;
        } else {
          this.mode = 'input';
          this.inputIdx = 0;
          this.current = -1;
          s.progress = `Memory round ${this.round + 1}/${this.rounds.length} — repeat it!`;
          Audio.play('go');
        }
      }
    } else if (this.mode === 'input') {
      let on = -1;
      this.tiles.forEach((t, i) => {
        if (playerOverlaps(s, t.min, t.max) && s.player.grounded) on = i;
      });
      if (on !== this.current) {
        this.current = on;
        if (on >= 0) {
          if (on === this.seq[this.inputIdx]) {
            this.light(on, 0x40ff80, 3);
            Audio.play('target');
            const i = on;
            s.after(0.35, () => this.mode !== 'done' && this.light(i, 0x302060, 0.3));
            this.inputIdx++;
            if (this.inputIdx >= this.seq.length) {
              this.round++;
              Audio.play('checkpoint');
              if (this.round >= this.rounds.length) {
                this.mode = 'done';
                this.tiles.forEach((_, k) => this.light(k, 0x40ff80, 2));
                this.onSolve();
              } else {
                this.mode = 'idle';
                s.after(1.2, () => this.nextRound());
              }
            }
          } else {
            this.light(on, 0xff2040, 3);
            Audio.play('error');
            s.player.damage(5, s.player.pos.clone().add(new THREE.Vector3(0, -1, 0)), 3);
            s.particles.emit('electric', s.player.pos, { count: 12 });
            this.mode = 'idle';
            s.after(1, () => {
              this.seq = this.seq.slice();
              this.mode = 'show';
              this.showIdx = 0;
              this.t = 0.6;
            });
          }
        }
      }
    }
  }
}

/** Solid platform invisible until revealed by the Q pulse. */
export class InvisiblePlatform extends Entity {
  private mat: THREE.MeshStandardMaterial;
  private reveal = 0;
  private col!: Collider;
  constructor(private center: THREE.Vector3, private size: THREE.Vector3) {
    super();
    this.mat = new THREE.MeshStandardMaterial({ color: 0xb48cff, emissive: 0x8060ff, emissiveIntensity: 1.5, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(boxGeo(size.x, size.y, size.z), this.mat);
    this.obj.add(m);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
    this.col = this.addCollider(makeCollider(this.center, this.size, { blocksSight: false }));
    this.col.onLand = () => (this.reveal = Math.max(this.reveal, 1.2));
    s.bus.on<THREE.Vector3>('pulse', (p) => {
      if (p.distanceTo(this.center) < 30) this.reveal = 5;
    });
  }
  update(dt: number) {
    this.reveal = Math.max(0, this.reveal - dt);
    const target = this.reveal > 0 ? Math.min(0.75, this.reveal) : 0.03 + Math.max(0, Math.sin(this.session.clock * 2 + this.center.x)) * 0.04;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dt * 6);
    if (Math.random() < 0.02) this.session.particles.emit('magic', this.center.clone().add(new THREE.Vector3(rand(-1, 1) * this.size.x / 2, this.size.y / 2, rand(-1, 1) * this.size.z / 2)), { count: 1, color: 0xb48cff, velSpread: 0.2, up: 0.3 });
  }
}

/** Rotatable mirror; state 0 = '/', 1 = '\\'. */
export class Mirror extends Entity {
  state: number;
  private plate: THREE.Group;
  private it!: Interactable;
  onChange: (() => void) | null = null;
  constructor(public pos: THREE.Vector3, state = 0, public locked = false) {
    super();
    this.state = state;
    const base = new THREE.Mesh(cachedGeo('mirBase', () => new THREE.CylinderGeometry(0.5, 0.6, 0.6, 12)), M.darkMarble());
    base.position.y = 0.3;
    this.plate = new THREE.Group();
    const glass = new THREE.Mesh(boxGeo(1.6, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: 0xe0f0ff, metalness: 1, roughness: 0.02, envMapIntensity: 2 }));
    const frame = new THREE.Mesh(boxGeo(1.7, 1.5, 0.05), glowMat(locked ? 0x808080 : 0xb48cff, 2));
    frame.position.z = -0.05;
    this.plate.add(glass, frame);
    this.plate.position.y = 1.3;
    this.obj.add(base, this.plate);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 0.3), new THREE.Vector3(1, 0.6, 1), { tag: 'mirror', blocksSight: false }));
    this.it = s.addInteractable({ pos: this.pos.clone().setY(this.pos.y + 1), radius: 2, prompt: 'Rotate mirror', enabled: !this.locked, onInteract: () => this.rotate() });
    this.plate.rotation.y = this.targetYaw();
  }
  private targetYaw() {
    return this.state === 0 ? -Math.PI / 4 : Math.PI / 4;
  }
  rotate() {
    this.state = 1 - this.state;
    Audio.play('switch', { pos: this.pos });
    this.onChange?.();
  }
  /** Reflect a horizontal direction. */
  reflect(d: THREE.Vector3) {
    return this.state === 0 ? new THREE.Vector3(d.z, 0, d.x) : new THREE.Vector3(-d.z, 0, -d.x);
  }
  update(dt: number) {
    const t = this.targetYaw();
    this.plate.rotation.y += (t - this.plate.rotation.y) * Math.min(1, dt * 10);
  }
  dispose() {
    this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** Beam emitter that bounces off mirrors to a receptor. */
export class LightBeam extends Entity {
  private segs: THREE.Mesh[] = [];
  solved = false;
  private receptorMesh: THREE.Mesh;
  constructor(private origin: THREE.Vector3, private dir: THREE.Vector3, private mirrors: Mirror[], private receptor: THREE.Vector3, private onSolve: () => void, private color = 0xffe066) {
    super();
    this.receptorMesh = new THREE.Mesh(cachedGeo('receptor', () => new THREE.OctahedronGeometry(0.5, 0)), new THREE.MeshStandardMaterial({ color: 0x404040, emissive: 0x000000, metalness: 0.8, roughness: 0.3 }));
    const emitter = new THREE.Mesh(boxGeo(0.8, 0.8, 0.8), M.darkMetal());
    emitter.position.copy(origin).setY(origin.y);
    const lens = new THREE.Mesh(cachedGeo('lens', () => new THREE.SphereGeometry(0.25, 10, 8)), glowMat(color, 4));
    lens.position.copy(origin).addScaledVector(dir, 0.4);
    this.obj.add(emitter, lens);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.receptorMesh.position.copy(this.receptor);
    s.scene.add(this.receptorMesh);
    const stand = new THREE.Mesh(cachedGeo('recStand', () => new THREE.CylinderGeometry(0.3, 0.5, 1, 10)), M.darkMarble());
    stand.position.copy(this.receptor).setY(this.receptor.y - 0.9);
    this.obj.add(stand);
    this.addCollider(makeCollider(this.origin, new THREE.Vector3(0.8, 0.8, 0.8), { tag: 'mirror' }));
  }
  private trace(): { pts: THREE.Vector3[]; hit: boolean } {
    const s = this.session;
    const pts = [this.origin.clone()];
    let p = this.origin.clone().addScaledVector(this.dir, 0.5);
    let d = this.dir.clone();
    const used = new Set<Mirror>();
    for (let bounce = 0; bounce < 12; bounce++) {
      let best = 60;
      let bestM: Mirror | null = null;
      let hitRec = false;
      for (const m of this.mirrors) {
        if (used.has(m) && bounce > 0 && m === [...used].pop()) continue;
        const mp = m.pos.clone().setY(p.y);
        const rel = mp.clone().sub(p);
        const t = rel.dot(d);
        if (t < 0.2) continue;
        const perp = rel.clone().addScaledVector(d, -t).length();
        if (perp < 0.35 && t < best) {
          best = t;
          bestM = m;
        }
      }
      {
        const rel = this.receptor.clone().setY(p.y).sub(p);
        const t = rel.dot(d);
        const perp = rel.clone().addScaledVector(d, -t).length();
        if (t > 0.2 && perp < 0.5 && t < best) {
          best = t;
          bestM = null;
          hitRec = true;
        }
      }
      const wall = s.physics.raycast(p, d, best, (c) => c.tag !== 'mirror' && c.tag !== 'bound');
      if (wall && wall.dist < best) {
        pts.push(wall.point);
        return { pts, hit: false };
      }
      const end = p.clone().addScaledVector(d, best);
      pts.push(end);
      if (hitRec) return { pts, hit: true };
      if (!bestM) return { pts, hit: false };
      used.add(bestM);
      d = bestM.reflect(d);
      p = end;
    }
    return { pts, hit: false };
  }
  update() {
    const { pts, hit } = this.trace();
    // Render segments
    while (this.segs.length < pts.length - 1) {
      const m = new THREE.Mesh(cachedGeo('beamSeg', () => new THREE.CylinderGeometry(0.06, 0.06, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5)), glowMat(this.color, 5));
      this.segs.push(m);
      this.obj.add(m);
    }
    this.segs.forEach((m, i) => {
      if (i >= pts.length - 1) {
        m.visible = false;
        return;
      }
      m.visible = true;
      m.position.copy(pts[i]);
      m.lookAt(pts[i + 1]);
      m.scale.z = pts[i].distanceTo(pts[i + 1]);
    });
    if (Math.random() < 0.3) this.session.particles.emit('sparks', pts[pts.length - 1], { count: 1, color: this.color });
    const rm = this.receptorMesh.material as THREE.MeshStandardMaterial;
    rm.emissive.set(hit ? this.color : 0x000000);
    rm.emissiveIntensity = hit ? 3 : 0;
    this.receptorMesh.rotation.y += 0.02;
    if (hit && !this.solved) {
      this.solved = true;
      Audio.play('powerup');
      this.session.particles.emit('magic', this.receptor, { count: 50, color: this.color, velSpread: 4 });
      this.onSolve();
    }
  }
  dispose() {
    this.receptorMesh.removeFromParent();
    super.dispose();
  }
}

/** Lamp that can be toggled by levers (lights-out puzzle). */
export class Lamp extends Entity {
  on = false;
  private bulb: THREE.Mesh;
  constructor(private pos: THREE.Vector3) {
    super();
    const post = new THREE.Mesh(cachedGeo('lampPost', () => new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8).translate(0, 1.2, 0)), M.darkMarble());
    this.bulb = new THREE.Mesh(cachedGeo('lampBulb', () => new THREE.SphereGeometry(0.35, 12, 10)), glowMat(0x303040, 1));
    this.bulb.position.y = 2.6;
    this.obj.add(post, this.bulb);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
  }
  set(v: boolean) {
    this.on = v;
    this.bulb.material = glowMat(v ? 0xffe066 : 0x303040, v ? 4 : 1);
  }
  toggle() {
    this.set(!this.on);
  }
}
