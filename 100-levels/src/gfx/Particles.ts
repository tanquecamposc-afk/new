/**
 * Pooled GPU point-sprite particle system. All particles live in two fixed-size
 * buffers (additive + alpha blended), so emitting never allocates.
 */
import * as THREE from 'three';
import { rand } from '../core/math';

export type Preset =
  | 'dust' | 'fire' | 'smoke' | 'ice' | 'electric' | 'sparks' | 'coin' | 'explosion'
  | 'magic' | 'hit' | 'heal' | 'leaves' | 'embers' | 'debris' | 'shadow' | 'water' | 'blood';

export interface EmitOpts {
  count?: number;
  spread?: number;
  spreadY?: number;
  vel?: THREE.Vector3;
  velSpread?: number;
  up?: number;
  life?: [number, number];
  size?: [number, number];
  color?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  gravity?: number;
  drag?: number;
  additive?: boolean;
  alpha?: number;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
uniform float uScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = max(0.1, -mv.z);
  gl_PointSize = min(aSize * uScale / z, uScale * 0.12);
  // Fade particles that get too close to the camera (avoids screen-filling blobs)
  vAlpha = aAlpha * smoothstep(0.6, 2.5, z);
  vColor = aColor;
}`;
const FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
uniform float uAdditive;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = mix(a, a * a, uAdditive * 0.5);
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor * mix(1.0, 1.6, uAdditive), a * vAlpha);
}`;

class Pool {
  readonly max: number;
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private s0: Float32Array;
  private s1: Float32Array;
  private c0: Float32Array;
  private c1: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private a0: Float32Array;
  private cursor = 0;
  alive = 0;
  private geo: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;

  constructor(max: number, additive: boolean) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uScale: { value: 300 }, uAdditive: { value: additive ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
  }

  spawn(
    x: number, y: number, z: number, vx: number, vy: number, vz: number,
    life: number, s0: number, s1: number, c0: THREE.Color, c1: THREE.Color, grav: number, drag: number, alpha: number,
  ) {
    // Ring buffer: overwrite oldest when full (keeps things bounded)
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    if (this.life[i] <= 0) this.alive++;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.s0[i] = s0; this.s1[i] = s1;
    this.c0[i3] = c0.r; this.c0[i3 + 1] = c0.g; this.c0[i3 + 2] = c0.b;
    this.c1[i3] = c1.r; this.c1[i3 + 1] = c1.g; this.c1[i3 + 2] = c1.b;
    this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = alpha;
  }

  update(dt: number) {
    if (this.alive <= 0) return;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        this.alpha[i] = 0;
        continue;
      }
      alive++;
      const t = 1 - this.life[i] / this.maxLife[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr;
      this.vel[i3 + 1] = this.vel[i3 + 1] * dr + this.grav[i] * dt;
      this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * (t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9);
      this.col[i3] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
      this.col[i3 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
      this.col[i3 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
    }
    this.alive = alive;
    const g = this.geo.attributes;
    (g.position as THREE.BufferAttribute).needsUpdate = true;
    (g.aColor as THREE.BufferAttribute).needsUpdate = true;
    (g.aSize as THREE.BufferAttribute).needsUpdate = true;
    (g.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.size.fill(0);
    this.alpha.fill(0);
    this.alive = 0;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}

const PRESETS: Record<Preset, EmitOpts> = {
  dust: { count: 10, spread: 0.4, spreadY: 0.05, velSpread: 1.6, up: 0.8, life: [0.5, 1.1], size: [0.35, 1.1], color: 0xb0a898, color2: 0x8a8478, gravity: 0.3, drag: 2.5, additive: false, alpha: 0.45 },
  fire: { count: 14, spread: 0.3, velSpread: 0.8, up: 3.2, life: [0.4, 0.9], size: [0.9, 0.1], color: 0xffc040, color2: 0xff3000, gravity: 1.5, drag: 1.5, additive: true, alpha: 0.9 },
  smoke: { count: 8, spread: 0.4, velSpread: 0.6, up: 1.6, life: [1.2, 2.4], size: [0.8, 2.6], color: 0x404040, color2: 0x202020, gravity: 0.4, drag: 1, additive: false, alpha: 0.4 },
  ice: { count: 16, spread: 0.3, velSpread: 3.5, up: 2, life: [0.5, 1], size: [0.35, 0.05], color: 0xe0ffff, color2: 0x60c0ff, gravity: -6, drag: 1.5, additive: true, alpha: 1 },
  electric: { count: 18, spread: 0.2, velSpread: 7, up: 0, life: [0.12, 0.3], size: [0.3, 0.05], color: 0xffffff, color2: 0x60a0ff, gravity: 0, drag: 6, additive: true, alpha: 1 },
  sparks: { count: 16, spread: 0.1, velSpread: 7, up: 3, life: [0.25, 0.6], size: [0.18, 0.02], color: 0xffffc0, color2: 0xff8020, gravity: -14, drag: 1.5, additive: true, alpha: 1 },
  coin: { count: 14, spread: 0.2, velSpread: 3, up: 2.5, life: [0.4, 0.8], size: [0.3, 0.02], color: 0xffffa0, color2: 0xffb000, gravity: -4, drag: 2, additive: true, alpha: 1 },
  explosion: { count: 50, spread: 0.5, velSpread: 11, up: 3, life: [0.35, 1], size: [2.2, 0.2], color: 0xffe080, color2: 0xff2000, gravity: -2, drag: 3, additive: true, alpha: 1 },
  magic: { count: 20, spread: 0.3, velSpread: 3, up: 1.5, life: [0.5, 1.2], size: [0.4, 0.02], color: 0xc080ff, color2: 0x4020ff, gravity: 0.5, drag: 2, additive: true, alpha: 1 },
  hit: { count: 12, spread: 0.1, velSpread: 6, up: 1.5, life: [0.15, 0.4], size: [0.4, 0.05], color: 0xffffff, color2: 0xffa040, gravity: -6, drag: 4, additive: true, alpha: 1 },
  heal: { count: 24, spread: 0.6, velSpread: 0.8, up: 2.5, life: [0.6, 1.2], size: [0.35, 0.05], color: 0x80ffa0, color2: 0x20ff60, gravity: 1, drag: 1, additive: true, alpha: 1 },
  leaves: { count: 6, spread: 2, velSpread: 1.2, up: -0.6, life: [2.5, 4.5], size: [0.25, 0.25], color: 0x8aa040, color2: 0xb08030, gravity: -0.4, drag: 0.6, additive: false, alpha: 0.9 },
  embers: { count: 6, spread: 1.5, velSpread: 0.8, up: 2.5, life: [1.2, 2.6], size: [0.2, 0.02], color: 0xffa040, color2: 0xff3000, gravity: 0.6, drag: 0.4, additive: true, alpha: 1 },
  debris: { count: 14, spread: 0.4, velSpread: 6, up: 6, life: [0.6, 1.3], size: [0.35, 0.3], color: 0x6a6258, color2: 0x4a4440, gravity: -20, drag: 0.5, additive: false, alpha: 1 },
  shadow: { count: 18, spread: 0.5, velSpread: 1.5, up: 1.2, life: [0.6, 1.4], size: [1, 0.2], color: 0x6020a0, color2: 0x000000, gravity: 0.8, drag: 1.5, additive: false, alpha: 0.7 },
  water: { count: 16, spread: 0.3, velSpread: 3, up: 4, life: [0.4, 0.9], size: [0.25, 0.1], color: 0xc0e8ff, color2: 0x4080c0, gravity: -14, drag: 0.8, additive: false, alpha: 0.8 },
  blood: { count: 10, spread: 0.1, velSpread: 4, up: 2.5, life: [0.3, 0.6], size: [0.25, 0.1], color: 0xff3030, color2: 0x600000, gravity: -14, drag: 1, additive: false, alpha: 0.9 },
};

const _c0 = new THREE.Color();
const _c1 = new THREE.Color();

export class Particles {
  readonly add: Pool;
  readonly norm: Pool;
  readonly group = new THREE.Group();
  quality = 1;
  camPos = new THREE.Vector3();

  constructor(max = 6000) {
    this.add = new Pool(max, true);
    this.norm = new Pool(Math.floor(max * 0.6), false);
    this.group.add(this.add.points, this.norm.points);
  }

  setViewport(height: number, fov: number) {
    const s = height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    this.add.material.uniforms.uScale.value = s;
    this.norm.material.uniforms.uScale.value = s;
  }

  emit(preset: Preset, pos: THREE.Vector3, o: EmitOpts = {}) {
    const p = { ...PRESETS[preset], ...o };
    const dist = pos.distanceTo(this.camPos);
    const lod = dist > 60 ? 0.25 : dist > 30 ? 0.55 : 1;
    const count = Math.max(1, Math.round((p.count ?? 10) * this.quality * lod));
    const pool = p.additive ? this.add : this.norm;
    _c0.set(p.color ?? 0xffffff);
    _c1.set(p.color2 ?? p.color ?? 0xffffff);
    const sp = p.spread ?? 0.2, spY = p.spreadY ?? sp, vs = p.velSpread ?? 1;
    const bv = p.vel;
    for (let i = 0; i < count; i++) {
      // Random direction in a sphere
      let dx = rand(-1, 1), dy = rand(-1, 1), dz = rand(-1, 1);
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      const sv = vs * rand(0.3, 1);
      pool.spawn(
        pos.x + rand(-sp, sp), pos.y + rand(-spY, spY), pos.z + rand(-sp, sp),
        (bv?.x ?? 0) + dx * sv, (bv?.y ?? 0) + dy * sv + (p.up ?? 0), (bv?.z ?? 0) + dz * sv,
        rand(p.life![0], p.life![1]), p.size![0] * rand(0.7, 1.3), p.size![1], _c0, _c1, p.gravity ?? 0, p.drag ?? 0, p.alpha ?? 1,
      );
    }
  }

  /** Emit a line of particles between two points (lightning, beams). */
  line(preset: Preset, a: THREE.Vector3, b: THREE.Vector3, n: number, o: EmitOpts = {}) {
    const t = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      t.lerpVectors(a, b, i / Math.max(1, n - 1));
      this.emit(preset, t, { count: 1, ...o });
    }
  }

  update(dt: number) {
    this.add.update(dt);
    this.norm.update(dt);
  }

  clear() {
    this.add.clear();
    this.norm.clear();
  }

  dispose() {
    this.add.dispose();
    this.norm.dispose();
  }
}

/**
 * Ambient emitter that keeps particles spawning in a volume around a target
 * (usually the camera) — dust motes, snow, rain, embers, falling leaves.
 */
export class AmbientEmitter {
  private acc = 0;
  constructor(
    private particles: Particles,
    public preset: Preset,
    public rate: number,
    public radius: number,
    public height: [number, number],
    public opts: EmitOpts = {},
  ) {}
  update(dt: number, center: THREE.Vector3) {
    this.acc += dt * this.rate * this.particles.quality;
    const p = new THREE.Vector3();
    while (this.acc >= 1) {
      this.acc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.sqrt(Math.random()) * Math.max(0, this.radius - 3);
      p.set(center.x + Math.cos(a) * r, center.y + rand(this.height[0], this.height[1]), center.z + Math.sin(a) * r);
      this.particles.emit(this.preset, p, { count: 1, spread: 0, ...this.opts });
    }
  }
}
