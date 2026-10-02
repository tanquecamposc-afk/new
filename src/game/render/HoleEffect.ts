import * as THREE from 'three';
import type { Vec3 } from '@/utils/math';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
}

const COLORS = [0xffcf3f, 0xff5e7a, 0x4fd1ff, 0x7dff8a, 0xffffff, 0xb48cff];

/** Efecto al embocar: onda expansiva en la copa + confeti (InstancedMesh, 1 draw call). */
export class HoleEffect {
  readonly group = new THREE.Group();
  private readonly confetti: THREE.InstancedMesh;
  private readonly ring: THREE.Mesh;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private particles: Particle[] = [];
  private ringTime = -1;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);

  constructor(private readonly maxParticles = 90) {
    this.confetti = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.09, 0.05),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      maxParticles,
    );
    this.confetti.frustumCulled = false;
    this.confetti.count = 0;
    const c = new THREE.Color();
    for (let i = 0; i < maxParticles; i++) this.confetti.setColorAt(i, c.setHex(COLORS[i % COLORS.length]!));

    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.RingGeometry(0.85, 1, 48);
    g.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(g, this.ringMat);
    this.ring.visible = false;
    this.group.add(this.confetti, this.ring);
  }

  trigger(at: Vec3, palette?: number[]): void {
    const c = new THREE.Color();
    const colors = palette ?? COLORS;
    for (let i = 0; i < this.maxParticles; i++) this.confetti.setColorAt(i, c.setHex(colors[i % colors.length]!));
    if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = true;
    this.ring.position.set(at.x, at.y + 0.02, at.z);
    this.ring.visible = true;
    this.ringTime = 0;
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 4 + Math.random() * 3.5;
      const out = 0.8 + Math.random() * 1.8;
      this.particles.push({
        pos: new THREE.Vector3(at.x, at.y + 0.1, at.z),
        vel: new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out),
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6),
        life: 2.2 + Math.random() * 0.8,
      });
    }
  }

  update(dt: number): void {
    if (this.ringTime >= 0) {
      this.ringTime += dt;
      const t = this.ringTime / 0.9;
      const s = 0.3 + t * 2.4;
      this.ring.scale.set(s, 1, s);
      this.ringMat.opacity = Math.max(0, 0.9 * (1 - t));
      if (t >= 1) {
        this.ringTime = -1;
        this.ring.visible = false;
      }
    }
    if (!this.particles.length) return;
    let n = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vel.y -= 9.81 * dt * 0.55;
      p.vel.multiplyScalar(1 - dt * 1.4); // arrastre del aire: caída tipo confeti
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt;
      p.rot.y += p.spin.y * dt;
      p.rot.z += p.spin.z * dt;
      this.q.setFromEuler(p.rot);
      this.m.compose(p.pos, this.q, this.one);
      this.confetti.setMatrixAt(n++, this.m);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.confetti.count = n;
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.confetti.geometry.dispose();
    (this.confetti.material as THREE.Material).dispose();
    this.confetti.dispose();
    this.ring.geometry.dispose();
    this.ringMat.dispose();
  }
}
