import * as THREE from 'three';
import { CameraConfig } from '@/config/camera';
import { clamp, damp, type Vec3 } from '@/utils/math';

/**
 * Cámara orbital de seguimiento para minigolf: sigue la bola con suavizado
 * exponencial, permite rotar (yaw/pitch) y hacer zoom dentro de límites, y se
 * aleja automáticamente en pantallas verticales.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch: number = CameraConfig.pitch;
  distance: number = CameraConfig.distance;
  private cur = { yaw: 0, pitch: CameraConfig.pitch as number, distance: CameraConfig.distance as number };
  private target = new THREE.Vector3();
  private aspect = 1;
  private minY = -Infinity;
  private bounds: { min: Vec3; max: Vec3 } | null = null;
  private overview: { center: Vec3; distance: number; saved: { pitch: number; distance: number } } | null = null;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(CameraConfig.fov, 1, CameraConfig.near, CameraConfig.far);
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Coloca la cámara detrás de `from` mirando hacia `to`, sin transición. */
  snapBehind(from: Vec3, to: Vec3, groundY = from.y): void {
    this.yaw = Math.atan2(from.x - to.x, from.z - to.z);
    this.cur.yaw = this.yaw;
    this.cur.pitch = this.pitch;
    this.cur.distance = this.distance;
    this.target.set(from.x, from.y, from.z);
    this.minY = groundY + 0.4;
    this.apply();
  }

  /** Límites del curso: el foco nunca sale de ellos (más un margen). */
  setBounds(min: Vec3, max: Vec3): void {
    this.bounds = { min, max };
  }

  get isOverview(): boolean {
    return this.overview !== null;
  }

  /** Vista general del curso completo; al salir se recupera la vista anterior. */
  setOverview(on: boolean): void {
    if (on === this.isOverview) return;
    if (on) {
      if (!this.bounds) return;
      const { min, max } = this.bounds;
      const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
      const radius = Math.hypot(max.x - min.x, max.z - min.z) / 2;
      const halfFov = (CameraConfig.fov * Math.PI) / 360;
      const fitAspect = Math.min(1, this.aspect);
      const distance = ((radius / Math.tan(halfFov)) * CameraConfig.overviewPadding) / Math.max(0.5, fitAspect);
      this.overview = { center, distance, saved: { pitch: this.pitch, distance: this.distance } };
      this.pitch = CameraConfig.overviewPitch;
      this.distance = distance;
    } else {
      const saved = this.overview!.saved;
      this.overview = null;
      this.pitch = saved.pitch;
      this.distance = saved.distance;
    }
  }

  rotate(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = clamp(this.pitch + dPitch, CameraConfig.minPitch, CameraConfig.maxPitch);
  }

  zoom(factor: number): void {
    const max = this.overview ? this.overview.distance * 1.6 : CameraConfig.maxDistance;
    this.distance = clamp(this.distance * factor, CameraConfig.minDistance, max);
  }

  update(dt: number, rawFocus: Vec3): void {
    const focus = this.overview ? this.overview.center : this.clampToBounds(rawFocus);
    const k = CameraConfig.followSharpness;
    this.target.set(damp(this.target.x, focus.x, k, dt), damp(this.target.y, focus.y, k, dt), damp(this.target.z, focus.z, k, dt));
    const o = CameraConfig.orbitSharpness;
    this.cur.yaw = damp(this.cur.yaw, this.yaw, o, dt);
    this.cur.pitch = damp(this.cur.pitch, this.pitch, o, dt);
    this.cur.distance = damp(this.cur.distance, this.distance, o * 0.6, dt);
    this.apply();
  }

  private clampToBounds(p: Vec3): Vec3 {
    if (!this.bounds) return p;
    const m = CameraConfig.boundsMargin;
    const { min, max } = this.bounds;
    return { x: clamp(p.x, min.x - m, max.x + m), y: p.y, z: clamp(p.z, min.z - m, max.z + m) };
  }

  private apply(): void {
    const portrait = this.aspect < 1 ? CameraConfig.portraitDistanceFactor : 1;
    const d = this.cur.distance * portrait;
    const cp = Math.cos(this.cur.pitch);
    const x = this.target.x + Math.sin(this.cur.yaw) * cp * d;
    const z = this.target.z + Math.cos(this.cur.yaw) * cp * d;
    const y = Math.max(this.minY, this.target.y + Math.sin(this.cur.pitch) * d);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  /** Vectores de la cámara proyectados en el suelo (para convertir arrastres de pantalla). */
  groundBasis(): { forward: { x: number; z: number }; right: { x: number; z: number } } {
    const s = Math.sin(this.cur.yaw);
    const c = Math.cos(this.cur.yaw);
    return { forward: { x: -s, z: -c }, right: { x: c, z: -s } };
  }
}
