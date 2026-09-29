/**
 * Cinematic third-person camera: smooth follow with lag, mouse orbit, dynamic
 * zoom, wall collision, trauma-based shake, FOV kicks, over-the-shoulder aim,
 * vehicle chase mode and scripted cinematic shots.
 */
import * as THREE from 'three';
import { Input } from '../core/Input';
import { clamp, damp, dampAngle, noise1 } from '../core/math';
import type { PhysicsWorld } from '../physics/Physics';

export type CamMode = 'follow' | 'aim' | 'vehicle' | 'orbit' | 'fixed';

export interface Shot {
  from: THREE.Vector3;
  to: THREE.Vector3;
  lookFrom: THREE.Vector3;
  lookTo: THREE.Vector3;
  duration: number;
  fov?: number;
  ease?: boolean;
}

export class CameraRig {
  yaw = 0;
  pitch = 0.24;
  distance = 4.1;
  private zoom = 4.1;
  private curDist = 4.1;
  /** Collision-limited distance: snaps in when blocked, eases back out. */
  private colDist = 4.1;
  /** Seconds since the player last moved the mouse (auto-align kicks in after a moment). */
  private idleLook = 10;
  private lastTarget = new THREE.Vector3();
  private targetVel = new THREE.Vector3();
  /** Auto-rotate behind the direction of travel (follow mode). */
  autoAlign = true;
  defaultPitch = 0.24;
  pivot = new THREE.Vector3();
  private pivotInit = false;
  private trauma = 0;
  private shakeT = 0;
  fovBase = 62;
  fovKick = 0;
  private fov = 62;
  mode: CamMode = 'follow';
  sensitivity = 1;
  invertY = false;
  shakeScale = 1;
  /** Vehicle chase params */
  vehicleYaw = 0;
  vehicleSpeed = 0;
  private shots: Shot[] = [];
  private shotT = 0;
  onShotsDone: (() => void) | null = null;
  /** Extra zoom offset (special attacks, boss framing). */
  zoomOffset = 0;
  private zoomOffsetCur = 0;
  /** Point to keep framed together with the player (boss). */
  frameTarget: THREE.Vector3 | null = null;
  private shoulder = 0;
  minPitch = -0.6;
  maxPitch = 1.15;
  private lookAt = new THREE.Vector3();

  constructor(public camera: THREE.PerspectiveCamera, private physics: PhysicsWorld | null) {}

  reset(target: THREE.Vector3, yaw: number) {
    this.yaw = yaw;
    this.pitch = this.defaultPitch;
    this.pivot.copy(target);
    this.lastTarget.copy(target);
    this.targetVel.set(0, 0, 0);
    this.pivotInit = true;
    this.curDist = this.distance;
    this.colDist = this.distance;
    this.zoom = this.distance;
    this.trauma = 0;
    this.shots = [];
  }

  /** Add camera shake (trauma accumulates, decays over time). */
  shake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale);
  }

  playShots(shots: Shot[], onDone?: () => void) {
    this.shots = shots;
    this.shotT = 0;
    this.onShotsDone = onDone ?? null;
  }
  get inCinematic() {
    return this.shots.length > 0;
  }
  skipShots() {
    if (!this.shots.length) return;
    this.shots = [];
    const cb = this.onShotsDone;
    this.onShotsDone = null;
    cb?.();
  }

  /** Horizontal forward vector of the camera. */
  forward(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  right(out = new THREE.Vector3()) {
    return out.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }
  /** Direction the camera actually looks (with pitch). */
  aimDir(out = new THREE.Vector3()) {
    return this.camera.getWorldDirection(out);
  }

  update(dt: number, rawDt: number, target: THREE.Vector3, allowInput = true) {
    const cam = this.camera;

    // ── Scripted cinematic shots
    if (this.shots.length) {
      const s = this.shots[0];
      this.shotT += rawDt;
      let k = Math.min(1, this.shotT / s.duration);
      if (s.ease !== false) k = k * k * (3 - 2 * k);
      cam.position.lerpVectors(s.from, s.to, k);
      this.lookAt.lerpVectors(s.lookFrom, s.lookTo, k);
      cam.lookAt(this.lookAt);
      if (s.fov) {
        cam.fov = damp(cam.fov, s.fov, 4, rawDt);
        cam.updateProjectionMatrix();
      }
      if (this.shotT >= s.duration) {
        this.shots.shift();
        this.shotT = 0;
        if (!this.shots.length) {
          const cb = this.onShotsDone;
          this.onShotsDone = null;
          cb?.();
          this.pivot.copy(target);
        }
      }
      this.applyShake(rawDt);
      return;
    }

    // ── Input
    this.idleLook += rawDt;
    if (allowInput && this.mode !== 'vehicle') {
      const s = 0.0024 * this.sensitivity * (this.mode === 'aim' ? 0.55 : 1);
      if (Input.mouseDX || Input.mouseDY) this.idleLook = 0;
      this.yaw -= Input.mouseDX * s;
      this.pitch += Input.mouseDY * s * (this.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch);
      if (Input.wheel) this.distance = clamp(this.distance + Input.wheel * 0.6, 2.4, 9);
    }

    if (!this.pivotInit) {
      this.pivot.copy(target);
      this.lastTarget.copy(target);
      this.pivotInit = true;
    }
    // Target velocity (for auto-align), smoothed; teleports are ignored
    if (dt > 0) {
      const v = new THREE.Vector3().subVectors(target, this.lastTarget).divideScalar(dt);
      if (v.lengthSq() < 40 * 40) this.targetVel.lerp(v, Math.min(1, dt * 10));
      else this.targetVel.set(0, 0, 0);
    }
    this.lastTarget.copy(target);

    if (this.mode === 'vehicle') {
      // Chase cam: follow vehicle heading, pull back with speed
      this.yaw = dampAngle(this.yaw, this.vehicleYaw, 5, dt);
      this.pitch = damp(this.pitch, 0.22, 3, dt);
      this.pivot.x = damp(this.pivot.x, target.x, 14, dt);
      this.pivot.z = damp(this.pivot.z, target.z, 14, dt);
      this.pivot.y = damp(this.pivot.y, target.y, 8, dt);
      const d = 6.5 + Math.min(4, this.vehicleSpeed * 0.06);
      this.curDist = damp(this.curDist, d, 4, dt);
    } else {
      // Tight horizontal follow (character stays centred), softer vertical so
      // jumps don't bob the whole view — but never let it lag more than ~1m.
      this.pivot.x = damp(this.pivot.x, target.x, 28, rawDt);
      this.pivot.z = damp(this.pivot.z, target.z, 28, rawDt);
      this.pivot.y = damp(this.pivot.y, target.y, target.y < this.pivot.y ? 14 : 9, rawDt);
      this.pivot.y = clamp(this.pivot.y, target.y - 1, target.y + 1);
      // Auto-align behind the direction of travel when the mouse is idle
      const hs = Math.hypot(this.targetVel.x, this.targetVel.z);
      if (this.autoAlign && this.mode === 'follow' && !this.frameTarget && allowInput && this.idleLook > 0.6 && hs > 2.5) {
        const travel = Math.atan2(this.targetVel.x, this.targetVel.z);
        let d = travel - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        // Don't swing round when running towards the camera
        if (Math.abs(d) < 2.1) {
          const rate = 1.8 * Math.min(1, hs / 8) * Math.min(1, (this.idleLook - 0.6) * 2);
          this.yaw = dampAngle(this.yaw, travel, rate, rawDt);
          this.pitch = damp(this.pitch, this.defaultPitch, rate * 0.6, rawDt);
        }
      }
      this.zoomOffsetCur = damp(this.zoomOffsetCur, this.zoomOffset, 4, rawDt);
      let want = this.mode === 'aim' ? 1.9 : this.distance + this.zoomOffsetCur;
      if (this.frameTarget && this.mode === 'follow') {
        const d = this.frameTarget.distanceTo(target);
        want += clamp(d * 0.12, 0, 4);
      }
      this.zoom = damp(this.zoom, want, 6, rawDt);
      this.curDist = this.zoom;
    }

    this.shoulder = damp(this.shoulder, this.mode === 'aim' ? 0.65 : 0, 10, rawDt);

    // Desired camera position
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const off = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const right = this.right();
    const piv = this.pivot.clone().addScaledVector(right, this.shoulder);
    let allowed = this.curDist;
    // Wall collision: snap in front of obstacles, ease back out when clear
    if (this.physics) {
      const hit = this.physics.raycast(piv, off, allowed + 0.3, (c) => c.blocksSight !== false && c.tag !== 'noCam');
      if (hit) allowed = Math.max(0.6, hit.dist - 0.3);
    }
    this.colDist = allowed < this.colDist ? allowed : damp(this.colDist, allowed, 5, rawDt);
    const dist = Math.min(this.colDist, allowed);
    cam.position.copy(piv).addScaledVector(off, dist);
    this.lookAt.copy(piv);
    // Look slightly above the head: the runner sits in the lower third and the course ahead is visible
    this.lookAt.y += this.mode === 'vehicle' ? 0.6 : this.mode === 'follow' ? 0.35 : 0;
    cam.lookAt(this.lookAt);

    // FOV kick (sprint / boost / aim)
    const fovT = (this.mode === 'aim' ? 46 : this.fovBase) + this.fovKick;
    this.fov = damp(this.fov, fovT, 6, rawDt);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
    this.applyShake(rawDt);
  }

  private applyShake(dt: number) {
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    if (this.trauma <= 0) return;
    this.shakeT += dt * 28;
    const s = this.trauma * this.trauma;
    const cam = this.camera;
    cam.position.x += noise1(this.shakeT) * 0.35 * s;
    cam.position.y += noise1(this.shakeT + 37) * 0.35 * s;
    cam.rotateZ(noise1(this.shakeT + 91) * 0.05 * s);
  }
}
