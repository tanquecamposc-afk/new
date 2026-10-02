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

  rotate(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = clamp(this.pitch + dPitch, CameraConfig.minPitch, CameraConfig.maxPitch);
  }

  zoom(factor: number): void {
    this.distance = clamp(this.distance * factor, CameraConfig.minDistance, CameraConfig.maxDistance);
  }

  update(dt: number, focus: Vec3): void {
    const k = CameraConfig.followSharpness;
    this.target.set(damp(this.target.x, focus.x, k, dt), damp(this.target.y, focus.y, k, dt), damp(this.target.z, focus.z, k, dt));
    const o = CameraConfig.orbitSharpness;
    this.cur.yaw = damp(this.cur.yaw, this.yaw, o, dt);
    this.cur.pitch = damp(this.cur.pitch, this.pitch, o, dt);
    this.cur.distance = damp(this.cur.distance, this.distance, o * 0.6, dt);
    this.apply();
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
