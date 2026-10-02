import * as THREE from 'three';
import { PhysicsConfig } from '@/config/physics';
import type { Ball } from '@/game/ball/Ball';

/** Representación visual de una bola: interpola entre pasos físicos. */
export class BallView {
  readonly mesh: THREE.Mesh;
  private readonly marker: THREE.Mesh;
  private readonly geo: THREE.SphereGeometry;
  private readonly mat: THREE.MeshStandardMaterial;

  /**
   * `ghost`: bola de otro jugador. Las bolas no chocan entre sí, así que las
   * rivales se dibujan semitransparentes y la propia siempre se ve.
   */
  constructor(color = 0xffffff, ghost = false) {
    const r = PhysicsConfig.ball.radius;
    this.geo = new THREE.SphereGeometry(r, ghost ? 18 : 28, ghost ? 12 : 20);
    this.mat = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.02, transparent: ghost, opacity: ghost ? 0.6 : 1 });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.castShadow = true;
    // Franja oscura para que se perciba el giro de la bola al rodar.
    this.marker = new THREE.Mesh(
      new THREE.TorusGeometry(r * 1.001, r * 0.08, 6, 28),
      new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.5 }),
    );
    this.mesh.add(this.marker);
  }

  update(ball: Ball, alpha: number): void {
    const a = ball.prevPosition;
    const b = ball.position;
    this.mesh.position.set(a.x + (b.x - a.x) * alpha, a.y + (b.y - a.y) * alpha, a.z + (b.z - a.z) * alpha);
    const q = ball.body.rotation();
    this.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }

  /** Pose directa (bolas remotas interpoladas desde snapshots). */
  setPose(x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number): void {
    this.mesh.position.set(x, y, z);
    this.mesh.quaternion.set(qx, qy, qz, qw);
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.marker.geometry.dispose();
    (this.marker.material as THREE.Material).dispose();
  }
}
