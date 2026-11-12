/**
 * Small pooled particle system (dust puffs, sparks). Purely cosmetic: it reacts to events the
 * simulation already resolved and never feeds back into gameplay.
 */
import * as THREE from 'three';

const CAPACITY = 320;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying vec3 vColor;
  uniform sampler2D uMap;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface BurstOptions {
  count: number;
  color: number;
  /** Initial speed range in m/s. */
  speed: [number, number];
  /** Upward bias added to every particle. */
  lift: number;
  life: [number, number];
  size: [number, number];
  gravity: number;
  /** 0 = spread in the horizontal plane only, 1 = full sphere. */
  vertical: number;
  /** Peak opacity, 0..1. */
  opacity: number;
}

export class Particles {
  readonly points: THREE.Points;
  enabled = true;

  private readonly positions = new Float32Array(CAPACITY * 3);
  private readonly sizes = new Float32Array(CAPACITY);
  private readonly alphas = new Float32Array(CAPACITY);
  private readonly colors = new Float32Array(CAPACITY * 3);
  private readonly velocities = new Float32Array(CAPACITY * 3);
  private readonly life = new Float32Array(CAPACITY);
  private readonly maxLife = new Float32Array(CAPACITY);
  private readonly gravity = new Float32Array(CAPACITY);
  private readonly baseSize = new Float32Array(CAPACITY);
  private readonly baseAlpha = new Float32Array(CAPACITY);
  private cursor = 0;
  private alive = 0;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly color = new THREE.Color();

  constructor(glow: THREE.Texture) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: glow }, uScale: { value: 600 } },
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.points.name = 'particles';
  }

  /** `viewportHeight` in device pixels keeps particle size stable across resolutions. */
  setViewport(viewportHeight: number, fovDegrees: number): void {
    this.material.uniforms['uScale']!.value = viewportHeight / (2 * Math.tan((fovDegrees * Math.PI) / 360));
  }

  burst(x: number, y: number, z: number, options: BurstOptions): void {
    if (!this.enabled) return;
    this.color.setHex(options.color);
    for (let n = 0; n < options.count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % CAPACITY;
      const angle = Math.random() * Math.PI * 2;
      const up = (Math.random() * 2 - 1) * options.vertical;
      const flat = Math.sqrt(Math.max(0, 1 - up * up));
      const speed = options.speed[0] + Math.random() * (options.speed[1] - options.speed[0]);
      this.positions[i * 3] = x + (Math.random() - 0.5) * 0.25;
      this.positions[i * 3 + 1] = y + Math.random() * 0.1;
      this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.25;
      this.velocities[i * 3] = Math.cos(angle) * flat * speed;
      this.velocities[i * 3 + 1] = up * speed + options.lift;
      this.velocities[i * 3 + 2] = Math.sin(angle) * flat * speed;
      const life = options.life[0] + Math.random() * (options.life[1] - options.life[0]);
      this.life[i] = life;
      this.maxLife[i] = life;
      this.gravity[i] = options.gravity;
      this.baseSize[i] = options.size[0] + Math.random() * (options.size[1] - options.size[0]);
      this.baseAlpha[i] = options.opacity;
      const shade = 0.85 + Math.random() * 0.3;
      this.colors[i * 3] = this.color.r * shade;
      this.colors[i * 3 + 1] = this.color.g * shade;
      this.colors[i * 3 + 2] = this.color.b * shade;
    }
    this.alive = CAPACITY;
  }

  update(frameSeconds: number): void {
    if (this.alive === 0) return;
    const dt = Math.min(frameSeconds, 0.05);
    let alive = 0;
    for (let i = 0; i < CAPACITY; i++) {
      let life = this.life[i]!;
      if (life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      life -= dt;
      this.life[i] = life;
      if (life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      alive++;
      this.velocities[i * 3 + 1] = this.velocities[i * 3 + 1]! - this.gravity[i]! * dt;
      const drag = 1 - Math.min(1, dt * 2.2);
      this.velocities[i * 3] = this.velocities[i * 3]! * drag;
      this.velocities[i * 3 + 2] = this.velocities[i * 3 + 2]! * drag;
      this.positions[i * 3] = this.positions[i * 3]! + this.velocities[i * 3]! * dt;
      this.positions[i * 3 + 1] = this.positions[i * 3 + 1]! + this.velocities[i * 3 + 1]! * dt;
      this.positions[i * 3 + 2] = this.positions[i * 3 + 2]! + this.velocities[i * 3 + 2]! * dt;
      const t = life / this.maxLife[i]!;
      this.alphas[i] = Math.min(1, t * 2.2) * this.baseAlpha[i]!;
      this.sizes[i] = this.baseSize[i]! * (1.6 - 0.6 * t);
    }
    this.alive = alive;
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('aSize').needsUpdate = true;
    this.geometry.getAttribute('aAlpha').needsUpdate = true;
    this.geometry.getAttribute('aColor').needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.points.removeFromParent();
  }
}

export const DUST: BurstOptions = { count: 4, color: 0xdcc9a8, speed: [0.3, 1.1], lift: 0.4, life: [0.3, 0.6], size: [0.1, 0.22], gravity: -0.3, vertical: 0.1, opacity: 0.38 };
export const LANDING: BurstOptions = { count: 14, color: 0xdcc9a8, speed: [1.2, 3.2], lift: 0.6, life: [0.4, 0.8], size: [0.16, 0.36], gravity: 0.6, vertical: 0.12, opacity: 0.5 };
export const ANCHOR_BURST: BurstOptions = { count: 40, color: 0xffc766, speed: [2.5, 7], lift: 1.5, life: [0.5, 1.1], size: [0.1, 0.24], gravity: 4, vertical: 0.9, opacity: 0.95 };
export const SLIDE_SPRAY: BurstOptions = { count: 2, color: 0xe6d3b3, speed: [0.5, 1.6], lift: 0.7, life: [0.25, 0.5], size: [0.12, 0.26], gravity: 0.5, vertical: 0.1, opacity: 0.45 };

/* ---- combat ---------------------------------------------------------------------------------- */
export const MUZZLE_FLASH: BurstOptions = { count: 5, color: 0xffe2a3, speed: [0.4, 2.2], lift: 0, life: [0.04, 0.09], size: [0.22, 0.46], gravity: 0, vertical: 1, opacity: 0.95 };
export const IMPACT_DUST: BurstOptions = { count: 6, color: 0xdcc9a8, speed: [0.8, 2.6], lift: 0.9, life: [0.25, 0.5], size: [0.1, 0.22], gravity: 2, vertical: 0.5, opacity: 0.6 };
export const IMPACT_CHIPS: BurstOptions = { count: 7, color: 0xcfc8ba, speed: [1.5, 4], lift: 0.6, life: [0.2, 0.45], size: [0.06, 0.14], gravity: 6, vertical: 0.8, opacity: 0.9 };
export const IMPACT_WOOD: BurstOptions = { ...IMPACT_CHIPS, color: 0xc48a45 };
export const IMPACT_SPARKS: BurstOptions = { count: 8, color: 0xffd98a, speed: [2.5, 6], lift: 0.4, life: [0.12, 0.3], size: [0.05, 0.11], gravity: 5, vertical: 0.9, opacity: 1 };
/** Hits on a runner break off light, not blood: blue for shield, warm white for health. */
export const HIT_SHIELD: BurstOptions = { count: 9, color: 0x7fc4ff, speed: [1.5, 4.5], lift: 0.5, life: [0.2, 0.4], size: [0.07, 0.17], gravity: 1, vertical: 1, opacity: 0.95 };
export const HIT_BODY: BurstOptions = { count: 8, color: 0xfff0c4, speed: [1.5, 4], lift: 0.5, life: [0.18, 0.36], size: [0.07, 0.15], gravity: 2, vertical: 1, opacity: 0.95 };
export const ELIMINATION_SHARDS: BurstOptions = { count: 44, color: 0x2fd6c3, speed: [1.5, 6.5], lift: 2.4, life: [0.5, 1.2], size: [0.1, 0.26], gravity: -1.2, vertical: 0.9, opacity: 0.95 };
export const ELIMINATION_GLOW: BurstOptions = { count: 18, color: 0xffc766, speed: [0.5, 3], lift: 3, life: [0.6, 1.3], size: [0.14, 0.32], gravity: -2, vertical: 0.6, opacity: 0.9 };
export const PICKUP_SPARKLE: BurstOptions = { count: 8, color: 0xfff3d6, speed: [0.6, 2.2], lift: 1.6, life: [0.25, 0.5], size: [0.06, 0.13], gravity: 1, vertical: 0.6, opacity: 0.9 };
export const HEAL_SPARKLE: BurstOptions = { count: 12, color: 0x8ef0c8, speed: [0.4, 1.6], lift: 1.8, life: [0.4, 0.8], size: [0.08, 0.16], gravity: -0.6, vertical: 0.4, opacity: 0.9 };
