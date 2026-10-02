import * as THREE from 'three';
import { PhysicsConfig } from '@/config/physics';
import { ballTexture, radialTexture } from '@/cosmetics/ballTextures';
import type { BallLook } from '@/cosmetics/catalog';
import type { Ball } from '@/game/ball/Ball';

const TRAIL_POINTS = 36;

/**
 * Bola con su aspecto cosmético (patrón, color, estela y efecto). Todo es
 * visual: el cuerpo físico es idéntico para todos los jugadores.
 */
export class BallView {
  readonly mesh: THREE.Mesh;
  /** Objetos que viven en coordenadas de mundo (estela, chispas); se añaden a la escena. */
  readonly worldGroup = new THREE.Group();
  private readonly geo: THREE.SphereGeometry;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly extras: { dispose(): void }[] = [];
  private marker: THREE.Mesh | null = null;
  private trail: { mesh: THREE.Mesh; points: THREE.Vector3[]; geo: THREE.BufferGeometry; color: THREE.Color; accent: THREE.Color } | null = null;
  private glow: THREE.Sprite | null = null;
  private sparkles: { points: THREE.Points; life: Float32Array; vel: Float32Array; next: number; acc: number } | null = null;
  private lastPos = new THREE.Vector3();
  private speed = 0;
  private t = 0;

  /**
   * `ghost`: bola de otro jugador. Las bolas no chocan entre sí, así que las
   * rivales se dibujan semitransparentes y la propia siempre se ve.
   */
  constructor(
    readonly look: BallLook,
    ghost = false,
    detail: 'low' | 'high' = 'high',
  ) {
    const r = PhysicsConfig.ball.radius;
    this.geo = new THREE.SphereGeometry(r, ghost ? 18 : 28, ghost ? 12 : 20);
    const map = ballTexture(look.pattern, look.color, look.accent);
    const metal = look.pattern === 'metal';
    this.mat = new THREE.MeshStandardMaterial({
      color: map ? 0xffffff : look.color,
      map,
      roughness: metal ? 0.12 : 0.32,
      metalness: metal ? 0.9 : 0.02,
      transparent: ghost,
      opacity: ghost ? 0.6 : 1,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.castShadow = true;
    if (look.pattern === 'classic') {
      // Franja para que se perciba el giro de la bola al rodar.
      this.marker = new THREE.Mesh(new THREE.TorusGeometry(r * 1.001, r * 0.08, 6, 28), new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.5 }));
      this.mesh.add(this.marker);
    }
    if (look.trail && detail === 'high') this.createTrail(look.trail.color, look.trail.accent, ghost);
    if (look.effect === 'glow') this.createGlow(look.effectColor);
    if (look.effect === 'sparkles' && detail === 'high') this.createSparkles(look.effectColor);
  }

  private createTrail(color: number, accent: number, ghost: boolean): void {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 4), 4));
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: ghost ? 0.5 : 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    this.worldGroup.add(mesh);
    this.trail = { mesh, points: [], geo, color: new THREE.Color(color), accent: new THREE.Color(accent) };
    this.extras.push(geo, mat);
  }

  private createGlow(color: number): void {
    const mat = new THREE.SpriteMaterial({ map: radialTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
    this.glow = new THREE.Sprite(mat);
    this.glow.scale.setScalar(0.75);
    this.worldGroup.add(this.glow);
    this.extras.push(mat);
  }

  private createSparkles(color: number): void {
    const n = 40;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.09, map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.worldGroup.add(points);
    this.sparkles = { points, life: new Float32Array(n), vel: new Float32Array(n * 3), next: 0, acc: 0 };
    this.extras.push(geo, mat);
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

  /** Actualiza estela y efectos (una vez por frame, tras colocar la bola). */
  tick(dt: number, camera: THREE.Camera): void {
    this.t += dt;
    const p = this.mesh.position;
    const moved = this.lastPos.distanceTo(p);
    this.speed = dt > 0 ? moved / dt : 0;
    this.lastPos.copy(p);
    if (this.glow) {
      this.glow.position.copy(p);
      this.glow.scale.setScalar(0.7 + Math.sin(this.t * 4) * 0.05);
      this.glow.visible = this.mesh.visible;
    }
    if (this.trail) this.updateTrail(moved, camera);
    if (this.sparkles) this.updateSparkles(dt);
  }

  private updateTrail(moved: number, camera: THREE.Camera): void {
    const tr = this.trail!;
    const p = this.mesh.position;
    if (moved > 0.004 && moved < 2) {
      tr.points.unshift(p.clone());
      if (tr.points.length > TRAIL_POINTS) tr.points.pop();
    } else if (tr.points.length) {
      // Parada: la estela se recoge poco a poco.
      tr.points.pop();
    }
    const pos = tr.geo.getAttribute('position') as THREE.BufferAttribute;
    const col = tr.geo.getAttribute('color') as THREE.BufferAttribute;
    const n = tr.points.length;
    const width = PhysicsConfig.ball.radius * 0.9;
    const camDir = new THREE.Vector3();
    const side = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const pt = tr.points[Math.min(i, n - 1)] ?? p;
      const nxt = tr.points[Math.min(i + 1, n - 1)] ?? pt;
      camDir.subVectors(camera.position, pt).normalize();
      side.subVectors(pt, nxt).cross(camDir).normalize();
      const k = n > 1 ? i / (TRAIL_POINTS - 1) : 1;
      const w = width * (1 - k);
      pos.setXYZ(i * 2, pt.x + side.x * w, pt.y + side.y * w, pt.z + side.z * w);
      pos.setXYZ(i * 2 + 1, pt.x - side.x * w, pt.y - side.y * w, pt.z - side.z * w);
      c.copy(tr.color).lerp(tr.accent, k);
      const alpha = i < n ? (1 - k) * 0.85 : 0;
      col.setXYZW(i * 2, c.r, c.g, c.b, alpha);
      col.setXYZW(i * 2 + 1, c.r, c.g, c.b, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private updateSparkles(dt: number): void {
    const s = this.sparkles!;
    const pos = s.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = s.life.length;
    s.acc += dt * Math.min(60, this.speed * 12);
    while (s.acc >= 1) {
      s.acc -= 1;
      const i = s.next;
      s.next = (s.next + 1) % n;
      const p = this.mesh.position;
      pos.setXYZ(i, p.x + (Math.random() - 0.5) * 0.2, p.y + Math.random() * 0.1, p.z + (Math.random() - 0.5) * 0.2);
      s.vel[i * 3] = (Math.random() - 0.5) * 0.6;
      s.vel[i * 3 + 1] = 0.5 + Math.random() * 0.6;
      s.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      s.life[i] = 0.6;
    }
    for (let i = 0; i < n; i++) {
      if (s.life[i]! <= 0) continue;
      s.life[i]! -= dt;
      if (s.life[i]! <= 0) {
        pos.setXYZ(i, -999, -999, -999);
        continue;
      }
      pos.setXYZ(i, pos.getX(i) + s.vel[i * 3]! * dt, pos.getY(i) + s.vel[i * 3 + 1]! * dt, pos.getZ(i) + s.vel[i * 3 + 2]! * dt);
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    if (this.marker) {
      this.marker.geometry.dispose();
      (this.marker.material as THREE.Material).dispose();
    }
    this.extras.forEach((e) => e.dispose());
    this.worldGroup.removeFromParent();
  }
}
