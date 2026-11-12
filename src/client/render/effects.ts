/**
 * Bullet streaks. Shots are instantaneous in the simulation; this only draws a short bright
 * streak along the path the simulation reported so the player can read where fire comes from and
 * where it lands. Purely cosmetic and pooled.
 */
import * as THREE from 'three';

const CAPACITY = 48;
/** How fast the streak travels along the shot, in metres per second. */
const STREAK_SPEED = 320;
const STREAK_LENGTH = 9;
const MIN_LIFE = 0.05;

export class Tracers {
  readonly mesh: THREE.InstancedMesh;

  private readonly geometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  private readonly start = new Float32Array(CAPACITY * 3);
  private readonly direction = new Float32Array(CAPACITY * 3);
  private readonly length = new Float32Array(CAPACITY);
  private readonly age = new Float32Array(CAPACITY);
  private readonly life = new Float32Array(CAPACITY);
  private readonly colors = new Float32Array(CAPACITY * 3);
  private readonly width = new Float32Array(CAPACITY);
  private cursor = 0;
  private active = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly forward = new THREE.Vector3(0, 0, 1);
  private readonly dir = new THREE.Vector3();
  private readonly color = new THREE.Color();

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CAPACITY);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.count = CAPACITY;
    this.mesh.name = 'tracers';
    this.scale.set(0, 0, 0);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    for (let i = 0; i < CAPACITY; i++) {
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, this.color.setRGB(0, 0, 0));
      this.life[i] = 0;
    }
  }

  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, color: number, width = 0.035): void {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const length = Math.hypot(dx, dy, dz);
    if (length < 0.4) return;
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % CAPACITY;
    this.start[i * 3] = ax;
    this.start[i * 3 + 1] = ay;
    this.start[i * 3 + 2] = az;
    this.direction[i * 3] = dx / length;
    this.direction[i * 3 + 1] = dy / length;
    this.direction[i * 3 + 2] = dz / length;
    this.length[i] = length;
    this.age[i] = 0;
    this.life[i] = Math.max(MIN_LIFE, (length + STREAK_LENGTH * 0.5) / STREAK_SPEED);
    this.width[i] = width;
    this.color.setHex(color);
    this.colors[i * 3] = this.color.r;
    this.colors[i * 3 + 1] = this.color.g;
    this.colors[i * 3 + 2] = this.color.b;
    this.active = CAPACITY;
  }

  update(frameSeconds: number): void {
    if (this.active === 0) return;
    let active = 0;
    for (let i = 0; i < CAPACITY; i++) {
      const life = this.life[i]!;
      if (life <= 0) continue;
      const age = this.age[i]! + frameSeconds;
      this.age[i] = age;
      if (age >= life) {
        this.life[i] = 0;
        this.scale.set(0, 0, 0);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.mesh.setMatrixAt(i, this.matrix);
        continue;
      }
      active++;
      const total = this.length[i]!;
      const head = Math.min(total, age * STREAK_SPEED);
      const tail = Math.max(0, head - STREAK_LENGTH);
      const span = Math.max(0.05, head - tail);
      const mid = (head + tail) * 0.5;
      this.dir.set(this.direction[i * 3]!, this.direction[i * 3 + 1]!, this.direction[i * 3 + 2]!);
      this.position.set(this.start[i * 3]! + this.dir.x * mid, this.start[i * 3 + 1]! + this.dir.y * mid, this.start[i * 3 + 2]! + this.dir.z * mid);
      this.quaternion.setFromUnitVectors(this.forward, this.dir);
      const w = this.width[i]!;
      this.scale.set(w, w, span);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
      // Additive blending: fading the colour to black fades the streak out.
      const fade = 1 - age / life;
      this.mesh.setColorAt(i, this.color.setRGB(this.colors[i * 3]! * fade, this.colors[i * 3 + 1]! * fade, this.colors[i * 3 + 2]! * fade));
    }
    this.active = active;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
