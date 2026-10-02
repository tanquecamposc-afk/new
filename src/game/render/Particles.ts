import * as THREE from 'three';
import type { Vec3 } from '@/utils/math';

interface BurstOpts {
  count: number;
  colors: number[];
  speed: number;
  up: number;
  spread?: number;
  gravity?: number;
  drag?: number;
  life: number;
  size: number;
}

/**
 * Sistema de partículas genérico en un único `THREE.Points` (1 draw call) con
 * tamaño y transparencia por partícula. Pool fijo, sin crear objetos en caliente.
 * El número de partículas escala con la calidad gráfica.
 */
export class Particles {
  readonly points: THREE.Points;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly alpha: Float32Array;
  private readonly size: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private next = 0;
  private active = 0;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.ShaderMaterial;
  private readonly rings: { mesh: THREE.Mesh; t: number; max: number }[] = [];

  constructor(
    private readonly scale: number,
    capacity = 700,
  ) {
    this.n = Math.max(32, Math.round(capacity * Math.max(0.3, scale)));
    this.pos = new Float32Array(this.n * 3).fill(-999);
    this.vel = new Float32Array(this.n * 3);
    this.col = new Float32Array(this.n * 3);
    this.alpha = new Float32Array(this.n);
    this.size = new Float32Array(this.n);
    this.life = new Float32Array(this.n);
    this.maxLife = new Float32Array(this.n);
    this.grav = new Float32Array(this.n);
    this.drag = new Float32Array(this.n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      uniforms: { pxScale: { value: 600 } },
      vertexShader: `attribute float alpha; attribute float psize; uniform float pxScale; varying float vA; varying vec3 vC;
        void main(){ vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = psize * pxScale / max(-mv.z, 0.1); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; varying vec3 vC;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(vC, vA * smoothstep(0.25, 0.08, r));
        #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
  }

  /** Escala del tamaño en píxeles según la altura del viewport. */
  setViewportHeight(h: number): void {
    this.mat.uniforms.pxScale!.value = h * 0.9;
  }

  burst(at: Vec3, o: BurstOpts): void {
    const count = Math.max(1, Math.round(o.count * this.scale));
    const c = new THREE.Color();
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const sp = o.speed * (0.4 + Math.random() * 0.8);
      const spread = o.spread ?? 0.1;
      this.pos[i * 3] = at.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = at.y + Math.random() * spread * 0.5;
      this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = o.up * (0.5 + Math.random() * 0.8);
      this.vel[i * 3 + 2] = Math.sin(a) * sp;
      c.setHex(o.colors[k % o.colors.length]!);
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
      this.life[i] = this.maxLife[i] = o.life * (0.7 + Math.random() * 0.6);
      this.size[i] = o.size * (0.7 + Math.random() * 0.6);
      this.grav[i] = o.gravity ?? 9.8;
      this.drag[i] = o.drag ?? 1.5;
      this.alpha[i] = 1;
    }
    this.active = this.n;
  }

  /** Onda expansiva en el suelo (salpicaduras, caídas). */
  ring(at: Vec3, color: number, maxScale = 1.6, duration = 0.7): void {
    let r = this.rings.find((x) => x.t >= x.max);
    if (!r) {
      if (this.rings.length >= 6) return;
      const geo = new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
      mesh.renderOrder = 7;
      this.points.parent?.add(mesh);
      r = { mesh, t: 0, max: duration };
      this.rings.push(r);
    }
    (r.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    r.mesh.position.set(at.x, at.y + 0.02, at.z);
    r.t = 0;
    r.max = duration;
    r.mesh.userData.maxScale = maxScale;
    r.mesh.visible = true;
  }

  // ---- Efectos con nombre ----

  dust(at: Vec3, strength = 1): void {
    this.burst(at, { count: 10 * strength, colors: [0xe9f2d8, 0xc9dcae], speed: 0.9 * strength, up: 0.7, gravity: 1.5, drag: 3, life: 0.6, size: 0.09 });
  }

  impact(at: Vec3, speed: number, wood = false): void {
    const k = Math.min(1.5, speed / 6);
    if (k < 0.15) return;
    this.burst(at, { count: 12 * k, colors: wood ? [0xc98f5a, 0x8a5a35] : [0xffffff, 0xfff1c4], speed: 2.4 * k, up: 1.6 * k, gravity: 9.8, drag: 2, life: 0.45, size: 0.06 });
  }

  splash(at: Vec3): void {
    this.burst(at, { count: 34, colors: [0xbfe9ff, 0xffffff, 0x7fd0ff], speed: 1.6, up: 3.6, gravity: 9.8, drag: 0.8, life: 0.9, size: 0.08 });
    this.ring({ x: at.x, y: at.y - 0.12, z: at.z }, 0xffffff, 2.2, 0.9);
  }

  sand(at: Vec3): void {
    this.burst(at, { count: 18, colors: [0xe8cf8a, 0xd8b766, 0xf3e2b0], speed: 1.3, up: 1.4, gravity: 6, drag: 2.2, life: 0.7, size: 0.08 });
  }

  poof(at: Vec3): void {
    this.burst(at, { count: 24, colors: [0xffffff, 0xd8d8d8], speed: 1.2, up: 1.2, gravity: -0.5, drag: 2.5, life: 0.9, size: 0.16 });
  }

  boost(at: Vec3): void {
    this.burst(at, { count: 8, colors: [0xffb347, 0xffe08a], speed: 0.6, up: 0.8, gravity: 0, drag: 2, life: 0.4, size: 0.07 });
  }

  fireworks(at: Vec3): void {
    const palette = [0xff5c5c, 0xffcf3f, 0x4fa3ff, 0x7ee081, 0xc77dff];
    for (let i = 0; i < 3; i++) {
      const p = { x: at.x + (Math.random() - 0.5) * 3, y: at.y + 2.5 + Math.random() * 1.5, z: at.z + (Math.random() - 0.5) * 3 };
      this.burst(p, { count: 40, colors: [palette[i % palette.length]!, 0xffffff], speed: 3.2, up: 0.8, spread: 0.05, gravity: 2.5, drag: 1.2, life: 1.3, size: 0.09 });
    }
  }

  update(dt: number): void {
    for (const r of this.rings) {
      if (r.t >= r.max) continue;
      r.t += dt;
      const k = Math.min(1, r.t / r.max);
      const s = 0.2 + k * (r.mesh.userData.maxScale as number);
      r.mesh.scale.set(s, 1, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      if (k >= 1) r.mesh.visible = false;
    }
    if (!this.active) return;
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i]! <= 0) continue;
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        this.alpha[i] = 0;
        this.pos[i * 3 + 1] = -999;
        continue;
      }
      alive++;
      const d = Math.max(0, 1 - this.drag[i]! * dt);
      this.vel[i * 3]! *= d;
      this.vel[i * 3 + 2]! *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1]! * d - this.grav[i]! * dt;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      this.alpha[i] = Math.min(1, (this.life[i]! / this.maxLife[i]!) * 1.6);
    }
    this.active = alive;
    for (const name of ['position', 'alpha'] as const) this.geo.getAttribute(name).needsUpdate = true;
    this.geo.getAttribute('color').needsUpdate = true;
    this.geo.getAttribute('psize').needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    for (const r of this.rings) {
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
      r.mesh.removeFromParent();
    }
  }
}
