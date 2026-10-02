import * as THREE from 'three';
import { PhysicsConfig } from '@/config/physics';
import { TrajectoryConfig } from '@/config/trajectory';
import type { Vec3 } from '@/utils/math';

const MAX_BOUNCES = 8;

/**
 * Dibuja la trayectoria prevista: puntos equiespaciados que avanzan hacia el
 * destino (InstancedMesh: 1 draw call), anillos en los rebotes y una diana en
 * el punto probable de llegada.
 */
export class TrajectoryView {
  readonly group = new THREE.Group();
  private readonly dots: THREE.InstancedMesh;
  private readonly bounceRings: THREE.InstancedMesh;
  private readonly endMarker: THREE.Mesh;
  private readonly dotMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private path: Vec3[] = [];
  private cumulative: number[] = [];
  private totalLength = 0;
  private flow = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly color = new THREE.Color();

  constructor() {
    this.dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    this.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), this.dotMat, TrajectoryConfig.maxDots);
    this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    this.dots.count = 0;

    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const ringGeo = new THREE.RingGeometry(0.16, 0.22, 24);
    ringGeo.rotateX(-Math.PI / 2);
    this.bounceRings = new THREE.InstancedMesh(ringGeo, this.ringMat, MAX_BOUNCES);
    this.bounceRings.frustumCulled = false;
    this.bounceRings.count = 0;

    const endGeo = new THREE.RingGeometry(0.2, 0.3, 32);
    endGeo.rotateX(-Math.PI / 2);
    this.endMarker = new THREE.Mesh(endGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));

    for (const o of [this.dots, this.bounceRings, this.endMarker]) o.renderOrder = 9;
    this.group.add(this.dots, this.bounceRings, this.endMarker);
    this.group.visible = false;
  }

  /** `end` null = sin diana (modo corto). */
  setPath(points: Vec3[], bounces: Vec3[], end: Vec3 | null): void {
    this.path = points;
    this.cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      this.cumulative.push(this.cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }
    this.totalLength = this.cumulative.at(-1) ?? 0;

    const groundOffset = -PhysicsConfig.ball.radius + 0.03;
    const n = Math.min(bounces.length, MAX_BOUNCES);
    for (let i = 0; i < n; i++) {
      const b = bounces[i]!;
      this.m.makeTranslation(b.x, b.y + groundOffset, b.z);
      this.bounceRings.setMatrixAt(i, this.m);
    }
    this.bounceRings.count = n;
    this.bounceRings.instanceMatrix.needsUpdate = true;

    this.endMarker.visible = !!end;
    if (end) this.endMarker.position.set(end.x, end.y + groundOffset + 0.005, end.z);
    this.group.visible = points.length > 1;
  }

  hide(): void {
    this.group.visible = false;
  }

  /** Anima los puntos avanzando por la trayectoria. */
  update(dt: number, time: number): void {
    if (!this.group.visible || this.totalLength <= 0) return;
    const spacing = TrajectoryConfig.dotSpacing;
    this.flow = (this.flow + dt * 1.2) % spacing;
    const radius = PhysicsConfig.ball.radius;
    let count = 0;
    let seg = 1;
    for (let d = this.flow + radius * 1.6; d < this.totalLength && count < TrajectoryConfig.maxDots; d += spacing) {
      while (seg < this.cumulative.length - 1 && this.cumulative[seg]! < d) seg++;
      const a = this.path[seg - 1]!;
      const b = this.path[seg]!;
      const l0 = this.cumulative[seg - 1]!;
      const l1 = this.cumulative[seg]!;
      const t = l1 > l0 ? (d - l0) / (l1 - l0) : 0;
      this.p.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - radius * 0.65, a.z + (b.z - a.z) * t);
      // Los puntos se hacen más pequeños al alejarse: transmite "aproximado".
      const k = 1 - (d / this.totalLength) * 0.55;
      this.s.setScalar(k);
      this.m.compose(this.p, this.q, this.s);
      this.dots.setMatrixAt(count, this.m);
      this.dots.setColorAt(count, this.color.setScalar(0.75 + 0.25 * k));
      count++;
    }
    this.dots.count = count;
    this.dots.instanceMatrix.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
    const pulse = 1 + Math.sin(time * 6) * 0.08;
    this.endMarker.scale.set(pulse, 1, pulse);
  }

  dispose(): void {
    this.dots.geometry.dispose();
    this.bounceRings.geometry.dispose();
    this.endMarker.geometry.dispose();
    (this.endMarker.material as THREE.Material).dispose();
    this.dotMat.dispose();
    this.ringMat.dispose();
    this.dots.dispose();
    this.bounceRings.dispose();
  }
}
