/**
 * Parkour course kit: a cursor walks forward through the level and segment
 * functions build gaps, moving platforms, laser corridors, vanishing tiles,
 * speed pads, towers, crushers, spinners, spikes and wind bridges.
 * Also reused by chaos and secret levels.
 */
import * as THREE from 'three';
import { Builder } from '../Builder';
import { M, glowMat, mat } from '../../gfx/Materials';
import { MovingPlatform, VanishingPlatform, Crusher, LaunchPad } from '../../entities/Platforms';
import { Laser, SpinBeam, Spikes, ForceZone } from '../../entities/Hazards';
import { Trigger } from '../../entities/Pickups';

export type SegKind = 'gaps' | 'moving' | 'lasers' | 'vanish' | 'speed' | 'tower' | 'crushers' | 'spinners' | 'spikes' | 'wind' | 'steps' | 'elevator';

export class Course {
  pos: THREE.Vector3;
  f = new THREE.Vector3(0, 0, 1);
  r = new THREE.Vector3(-1, 0, 0);
  /** Difficulty scalar 0..1 */
  diff: number;
  platMat: THREE.Material;
  /** Optional colour palette: each segment gets the next material, pads use padMat. */
  palette: THREE.Material[] | null = null;
  padMat: THREE.Material | null = null;
  trimColor: number;
  segCount = 0;
  hints = true;
  scale = 1;
  /** Called with the centre of each landing pad (used to place enemies in chaos levels). */
  onPad: ((center: THREE.Vector3) => void) | null = null;

  constructor(public b: Builder, start: THREE.Vector3, diff: number, platMat?: THREE.Material, trimColor = 0x34d4ff) {
    this.pos = start.clone();
    this.diff = diff;
    this.platMat = platMat ?? M.concrete();
    this.trimColor = trimColor;
  }

  /** Local → world point. x = right, z = forward from the cursor. */
  P(x: number, y: number, z: number) {
    return this.pos.clone().addScaledVector(this.r, x).addScaledVector(this.f, z).setY(this.pos.y + y);
  }
  /** Local size → world size (axis aligned). */
  S(w: number, h: number, d: number) {
    return Math.abs(this.f.z) > 0.5 ? new THREE.Vector3(w, h, d) : new THREE.Vector3(d, h, w);
  }
  get yaw() {
    return Math.atan2(this.f.x, this.f.z);
  }

  /** Add a platform with top at local (x, y, z) centre. */
  plat(x: number, y: number, z: number, w: number, d: number, m = this.platMat, h = 1.2, trim = true) {
    const c = this.P(x, y - h / 2, z);
    const r = this.b.box(c, this.S(w, h, d), m);
    if (trim) {
      // Neon edge trims on the front and back edges (visual only)
      const tm = glowMat(this.trimColor, 2.2);
      for (const e of [-d / 2, d / 2]) this.b.box(this.P(x, y - 0.04, z + e), this.S(w + 0.04, 0.08, 0.08), tm, { collide: false, shadow: false });
    }
    return r;
  }

  /** Move the cursor forward (local z) and up. */
  advance(z: number, y = 0) {
    this.pos.addScaledVector(this.f, z);
    this.pos.y += y;
  }

  turn(dir: 1 | -1) {
    // Rotate 90° around Y
    const nf = dir === 1 ? this.r.clone() : this.r.clone().negate();
    this.r.copy(dir === 1 ? this.f.clone().negate() : this.f.clone());
    this.f.copy(nf);
  }

  hint(text: string, z = 2) {
    if (!this.hints) return;
    const c = this.P(0, 0, z);
    this.b.add(new Trigger(c.clone().add(new THREE.Vector3(-4, -1, -4)), c.clone().add(new THREE.Vector3(4, 4, 4)), () => this.b.s.toast('💡', 'TIP', text)));
  }

  /** Landing / checkpoint pad of length L; cursor ends at its far edge. */
  pad(L = 8, W = 8, checkpoint = false) {
    this.plat(0, 0, L / 2, W, L, this.padMat ?? this.platMat);
    this.onPad?.(this.P(0, 0.05, L / 2));
    if (checkpoint) this.b.checkpoint(this.P(W / 2 - 1.2, 0, L / 2), this.yaw);
    this.advance(L);
  }

  seg(kind: SegKind, n = 3) {
    if (this.palette) this.platMat = this.palette[this.segCount % this.palette.length];
    this.segCount++;
    const d = this.diff;
    const b = this.b;
    switch (kind) {
      case 'steps': {
        for (let i = 0; i < n; i++) {
          const gap = 1.5 + d * 1.2;
          const h = (i % 2 ? 0.8 : 1.2) * (0.6 + d * 0.5);
          this.advance(gap, h);
          this.plat(0, 0, 1.5, 4, 3);
          b.coin(this.P(0, 1, 1.5).x, this.P(0, 1, 1.5).y, this.P(0, 1, 1.5).z);
          this.advance(3);
        }
        break;
      }
      case 'gaps': {
        for (let i = 0; i < n; i++) {
          const gap = 2.6 + d * 2.2 + b.rng.range(-0.4, 0.4);
          const dy = b.rng.range(-0.8, 1.0) * (0.5 + d);
          const w = Math.max(1.6, 4 - d * 2.2);
          const x = b.rng.range(-2, 2) * d;
          const a = this.P(0, 1.2, -0.5);
          this.advance(gap, dy);
          this.plat(x, 0, 1.4, w, 2.8);
          b.coins.addArc(a, this.P(x, 1.2, 1.4), 1.2, 3);
          this.pos.addScaledVector(this.r, x);
          this.advance(2.8);
        }
        break;
      }
      case 'moving': {
        for (let i = 0; i < n; i++) {
          const gap = 9 + d * 3;
          const mode = (i + this.segCount) % 3;
          const size = this.S(3.2 - d * 0.8, 0.6, 3.2 - d * 0.8);
          const speed = 3 + d * 2.5;
          let pts: THREE.Vector3[];
          if (mode === 0) pts = [this.P(-5, -0.3, gap / 2), this.P(5, -0.3, gap / 2)];
          else if (mode === 1) pts = [this.P(0, -0.3, 2.2), this.P(0, -0.3, gap - 2.2)];
          else pts = [this.P(0, -3.3, gap / 2), this.P(0, 1.2, gap / 2)];
          b.add(new MovingPlatform(pts, size, M.metal(), speed, false, b.rng.next()));
          b.coin(pts[0].x, pts[0].y + 1.2, pts[0].z);
          this.advance(gap, mode === 2 ? 1.2 : 0);
          this.plat(0, 0, 1.5, 4, 3);
          this.advance(3);
        }
        break;
      }
      case 'lasers': {
        const L = 10 + n * 5;
        this.plat(0, 0, L / 2, 5, L, M.darkMetal());
        // Side walls
        for (const sx of [-2.8, 2.8]) b.box(this.P(sx, 1.6, L / 2), this.S(0.6, 3.2, L), M.darkMetal(), { tile: 2 });
        for (let i = 0; i < n; i++) {
          const z = 4 + i * 5;
          const type = (i + this.segCount) % 3;
          if (type === 0) b.add(new Laser(this.P(-2.5, 0.45, z), this.P(2.5, 0.45, z), { blink: [1.3 - d * 0.4, 1.1], phase: i * 0.3 })); // jump over
          else if (type === 1) b.add(new Laser(this.P(-2.5, 1.35, z), this.P(2.5, 1.35, z), {})); // crouch under
          else b.add(new Laser(this.P(0, 0.1, z), this.P(0, 3, z), { sweep: this.r.clone().multiplyScalar(2.3), sweepSpeed: 1.2 + d, color: 0xff2080 }));
          b.coin(this.P(0, 1.2, z + 2.5).x, this.P(0, 1.2, z + 2.5).y, this.P(0, 1.2, z + 2.5).z);
        }
        this.advance(L);
        break;
      }
      case 'vanish': {
        for (let i = 0; i < n * 2; i++) {
          const gap = 1.6 + d * 1.2;
          this.advance(gap, b.rng.range(-0.3, 0.5));
          const x = (i % 2 ? 1 : -1) * b.rng.range(0.5, 1.8) * (0.4 + d);
          b.add(new VanishingPlatform(this.P(x, -0.3, 1.2), this.S(2.4, 0.6, 2.4), mat('vanish', { tex: 'tiles', color: 0xffb080, roughness: 0.4 }), 0.55 - d * 0.2));
          b.coin(this.P(x, 1, 1.2).x, this.P(x, 1, 1.2).y, this.P(x, 1, 1.2).z);
          this.pos.addScaledVector(this.r, x);
          this.advance(2.4);
        }
        this.advance(1.5);
        this.plat(0, 0, 1.5, 5, 3);
        this.advance(3);
        break;
      }
      case 'speed': {
        for (let i = 0; i < n; i++) {
          this.plat(0, 0, 3, 5, 6);
          b.add(new LaunchPad(this.P(0, 0.06, 4.5), this.f.clone(), 22, 9, 0x40ff90));
          const gap = 16 + d * 4;
          b.coins.addArc(this.P(0, 1.5, 6), this.P(0, 1.5, 6 + gap), 6, 7);
          this.advance(6 + gap, b.rng.range(-1, 1));
          this.plat(0, 0, 3, 7, 6);
          this.advance(6);
        }
        break;
      }
      case 'tower': {
        // Spiral climb around a central pillar with jump pads
        const cx = 0, cz = 8;
        const radius = 6;
        const pillarH = n * 9 + 6;
        b.box(this.P(cx, pillarH / 2 - 2, cz), this.S(4, pillarH, 4), M.darkConcrete(), { tile: 4 });
        let y = 0;
        const steps = n * 6;
        for (let i = 0; i < steps; i++) {
          const a = (i / 6) * Math.PI * 2;
          y += 1.5 + d * 0.3;
          const px = cx + Math.cos(a) * radius, pz = cz + Math.sin(a) * radius;
          if (i % 6 === 5) {
            this.plat(px, y, pz, 3, 3, M.metal());
            b.add(new LaunchPad(this.P(px, y + 0.06, pz), new THREE.Vector3(), 0, 14, 0x40c0ff, 1.8));
            y += 0.0;
          } else if (i % 4 === 2 && d > 0.3) {
            b.add(new VanishingPlatform(this.P(px, y - 0.3, pz), this.S(2.6, 0.6, 2.6), mat('vanish', { tex: 'tiles', color: 0xffb080, roughness: 0.4 }), 0.8));
          } else this.plat(px, y, pz, 2.8, 2.8);
          b.coin(this.P(px, y + 1, pz).x, this.P(px, y + 1, pz).y, this.P(px, y + 1, pz).z);
        }
        // Wind gusts near the top
        const top = this.P(0, y, 0);
        b.add(new ForceZone(top.clone().add(new THREE.Vector3(-12, -10, -12)), top.clone().add(new THREE.Vector3(12, 4, 12)).add(this.f.clone().multiplyScalar(16)), this.r.clone().multiplyScalar(1.4), 'wind'));
        const endA = (steps / 6) * Math.PI * 2;
        const ex = cx + Math.cos(endA) * radius, ez = cz + Math.sin(endA) * radius;
        this.pos.copy(this.P(ex, y, ez));
        this.advance(3);
        this.plat(0, 0, 3, 6, 6);
        this.advance(6);
        break;
      }
      case 'crushers': {
        const L = 8 + n * 6;
        this.plat(0, 0, L / 2, 6, L, M.darkMetal());
        for (let i = 0; i < n; i++) {
          const z = 5 + i * 6;
          const c = this.P(0, 0, z);
          b.add(new Crusher(c.x, c.z, this.pos.y, this.S(5.6, 2.2, 3), M.metal(), 2.8 - d * 0.8, i * 0.33));
          b.coin(c.x, this.pos.y + 1, c.z);
        }
        this.advance(L);
        break;
      }
      case 'spinners': {
        for (let i = 0; i < n; i++) {
          this.advance(2.5);
          this.plat(0, 0, 6, 12, 12, M.metal());
          b.add(new SpinBeam(this.P(0, 0, 6), 5.6, (1.4 + d * 1.4) * (i % 2 ? -1 : 1), 0.55, 25, i));
          if (d > 0.5) b.add(new SpinBeam(this.P(0, 0, 6), 5.6, (1.1 + d) * (i % 2 ? 1 : -1), 1.55, 25, i + 1.5, 0xff2080));
          b.coins.addLine(this.P(-4, 1, 6), this.P(4, 1, 6), 4);
          this.advance(12);
        }
        break;
      }
      case 'spikes': {
        const L = 6 + n * 5;
        this.plat(0, 0, L / 2, 5, L);
        for (let i = 0; i < n; i++) {
          const c = this.P(0, 0.05, 4 + i * 5);
          b.add(new Spikes(c, Math.abs(this.f.z) > 0.5 ? 5 : 2.2, Math.abs(this.f.z) > 0.5 ? 2.2 : 5, 2.2 - d * 0.6, i * 0.5));
        }
        this.advance(L);
        break;
      }
      case 'wind': {
        // Narrow beam with crosswind
        const L = 12 + n * 4;
        this.plat(0, 0, L / 2, 1.4 - d * 0.3, L, M.metal(), 0.6);
        const a = this.P(-8, -2, 0), c = this.P(8, 5, L);
        const min = new THREE.Vector3(Math.min(a.x, c.x), a.y, Math.min(a.z, c.z));
        const max = new THREE.Vector3(Math.max(a.x, c.x), c.y, Math.max(a.z, c.z));
        b.add(new ForceZone(min, max, this.r.clone().multiplyScalar(2 + d * 2.5), 'wind'));
        b.coins.addLine(this.P(0, 1, 2), this.P(0, 1, L - 2), 6);
        this.advance(L);
        break;
      }
      case 'elevator': {
        const h = 6 + n * 2;
        b.add(new MovingPlatform([this.P(0, -0.3, 2.5), this.P(0, h - 0.3, 2.5)], this.S(3.5, 0.6, 3.5), M.metal(), 2.5, false, 0, 1));
        b.box(this.P(0, h / 2 - 1, 5.4), this.S(6, h + 2, 0.8), M.darkConcrete());
        this.advance(4.5, h);
        this.plat(0, 0, 3, 6, 6);
        this.advance(6);
        break;
      }
    }
  }
}

/** Distant decorative platform glow floor below the course (depth cue). */
export function voidGlow(b: Builder, center: THREE.Vector3, size: number, color: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(center);
  b.deco(m);
}
