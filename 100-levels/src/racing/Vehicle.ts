/**
 * Arcade car physics + procedural car model, used by the player and AI rivals.
 * Acceleration, braking/reverse, speed-dependent steering, lateral grip with
 * handbrake drifting, boost, airborne jumps off ramps, barrier collisions.
 */
import * as THREE from 'three';
import { Track } from './Track';
import { boxGeo, cachedGeo, glowMat } from '../gfx/Materials';
import { clamp } from '../core/math';

export interface CarInput {
  throttle: number; // -1..1
  steer: number; // -1..1 (positive = right)
  drift: boolean;
  boost: boolean;
}

export class Car {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private wheels: THREE.Group[] = [];
  pos = new THREE.Vector3();
  yaw = 0;
  speed = 0;
  lateral = 0;
  vy = 0;
  airborne = false;
  idx = 0;
  lap = 0;
  lastIdx = 0;
  progress = 0;
  boost = 60;
  boosting = false;
  drifting = false;
  maxSpeed = 52;
  accel = 20;
  finished = false;
  finishTime = 0;
  eliminated = false;
  checkpoint = 0;
  private wheelSpin = 0;
  private steerVis = 0;
  onCrash: ((impact: number) => void) | null = null;
  private underglow: THREE.Mesh;
  private flames: THREE.Mesh[] = [];

  constructor(color: number, private track: Track, trim = 0x34d4ff) {
    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.25, envMapIntensity: 1.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.4, roughness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 1, roughness: 0.05, envMapIntensity: 2 });
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.body) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(boxGeo(1.9, 0.45, 4.2), paint, 0, 0.55, 0);
    add(boxGeo(1.7, 0.3, 1.2), paint, 0, 0.85, 1.4).rotation.x = -0.12;
    add(boxGeo(1.6, 0.5, 1.9), glass, 0, 1.0, -0.15);
    add(boxGeo(1.9, 0.12, 0.5), paint, 0, 1.2, -2.0);
    add(boxGeo(0.12, 0.35, 0.12), dark, 0.7, 1.0, -2.0);
    add(boxGeo(0.12, 0.35, 0.12), dark, -0.7, 1.0, -2.0);
    add(boxGeo(2.0, 0.2, 4.3), dark, 0, 0.3, 0);
    for (const x of [0.65, -0.65]) {
      add(boxGeo(0.45, 0.14, 0.05), glowMat(0xf4f8ff, 5), x, 0.62, 2.12);
      add(boxGeo(0.5, 0.12, 0.05), glowMat(0xff1020, 4), x, 0.66, -2.12);
    }
    add(boxGeo(1.92, 0.04, 2.8), glowMat(trim, 2.5), 0, 0.64, -0.1);
    this.underglow = add(cachedGeo('underglow', () => new THREE.PlaneGeometry(2.6, 5).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: trim, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, 0.08, 0);
    const wheelGeo = cachedGeo('wheel', () => new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16).rotateZ(Math.PI / 2));
    const rimGeo = cachedGeo('rim', () => new THREE.CylinderGeometry(0.22, 0.22, 0.34, 8).rotateZ(Math.PI / 2));
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 1, roughness: 0.2 });
    for (const [x, z] of [[0.95, 1.35], [-0.95, 1.35], [0.95, -1.35], [-0.95, -1.35]]) {
      const w = new THREE.Group();
      w.position.set(x, 0.38, z);
      add(wheelGeo, dark, 0, 0, 0, w);
      add(rimGeo, rimMat, 0, 0, 0, w);
      this.body.add(w);
      this.wheels.push(w);
    }
    for (const x of [0.4, -0.4]) {
      const f = add(cachedGeo('exhaust', () => new THREE.ConeGeometry(0.14, 0.9, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.45)), glowMat(0x40a0ff, 4, 0.9, true), x, 0.4, -2.15);
      f.visible = false;
      this.flames.push(f);
    }
    this.root.add(this.body);
  }

  place(i: number, lateral: number) {
    const s = this.track.sample(i);
    this.pos.copy(s.p).addScaledVector(s.r, lateral);
    this.yaw = Math.atan2(s.t.x, s.t.z);
    this.idx = this.lastIdx = i;
    this.speed = 0;
    this.lateral = 0;
    this.vy = 0;
    this.sync(0);
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  get right() {
    return new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }
  get kmh() {
    return Math.abs(this.speed) * 3.6;
  }

  update(dt: number, inp: CarInput) {
    const tr = this.track;
    // Boost
    this.boosting = inp.boost && this.boost > 0 && inp.throttle > 0;
    if (this.boosting) this.boost = Math.max(0, this.boost - 30 * dt);
    else this.boost = Math.min(100, this.boost + (this.drifting ? 14 : 3.5) * dt);
    const max = this.maxSpeed * (this.boosting ? 1.4 : 1);
    // Longitudinal
    if (!this.airborne) {
      if (inp.throttle > 0) this.speed += this.accel * (this.boosting ? 1.8 : 1) * inp.throttle * (1 - Math.max(0, this.speed) / (max * 1.05)) * dt;
      else if (inp.throttle < 0) this.speed += (this.speed > 0 ? -38 : -10) * -inp.throttle * dt;
      else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 6 * dt);
      this.speed = clamp(this.speed, -14, max);
      if (this.speed > max) this.speed -= 20 * dt;
    }
    // Steering (weaker at very low and very high speed)
    const sp = Math.abs(this.speed);
    const steerK = clamp(sp / 8, 0, 1) * (1 - clamp((sp - 30) / 60, 0, 0.45));
    this.drifting = inp.drift && sp > 12 && !this.airborne;
    const turn = inp.steer * (this.drifting ? 2.4 : 1.7) * steerK * Math.sign(this.speed || 1);
    if (!this.airborne) this.yaw -= turn * dt;
    // Lateral slide: drifting builds sideways velocity, grip removes it
    if (this.drifting) this.lateral += inp.steer * sp * 0.9 * dt;
    const grip = this.drifting ? 1.4 : 7;
    this.lateral *= Math.exp(-grip * dt);
    if (this.drifting) this.speed *= Math.exp(-0.15 * dt);
    // Integrate
    const f = this.forward, r = this.right;
    this.pos.addScaledVector(f, this.speed * dt).addScaledVector(r, this.lateral * dt);
    // Track frame
    this.idx = tr.nearest(this.pos, this.idx);
    const s = tr.sample(this.idx);
    const off = this.pos.clone().sub(s.p);
    const lat = off.dot(s.r);
    const along = off.dot(s.t);
    const n = tr.sample(this.idx + (along >= 0 ? 1 : -1));
    const k = Math.min(1, Math.abs(along) / Math.max(0.1, s.p.distanceTo(n.p)));
    const groundY = s.p.y + (n.p.y - s.p.y) * k;
    // Vertical: ramps launch the car, gravity pulls it back
    if (this.airborne) {
      this.vy -= 30 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= groundY) {
        this.pos.y = groundY;
        this.airborne = false;
        if (this.vy < -8) this.onCrash?.(-this.vy * 0.3);
        this.vy = 0;
      }
    } else {
      const dy = groundY - this.pos.y;
      if (dy < -0.4) {
        // Ground dropped away → we're flying
        this.airborne = true;
        this.vy = Math.max(0, this.lastSlope * this.speed);
      } else this.pos.y = groundY;
      this.lastSlope = clamp((n.p.y - s.p.y) / Math.max(0.1, s.p.distanceTo(n.p)) * (along >= 0 ? 1 : -1), -1, 1);
    }
    // Barriers
    const W = tr.width / 2 - 1.1;
    if (Math.abs(lat) > W) {
      const push = Math.sign(lat) * (Math.abs(lat) - W);
      this.pos.addScaledVector(s.r, -push);
      const impact = Math.abs(this.speed) * Math.abs(f.dot(s.r));
      this.speed *= 0.82;
      this.lateral = -Math.sign(lat) * 3;
      // Align with the track a bit
      const ty = Math.atan2(s.t.x, s.t.z);
      let d = ty - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * 0.25;
      if (impact > 3) this.onCrash?.(impact);
    }
    this.progress = this.lap * tr.length + s.s;
    this.sync(dt, inp.steer);
  }
  private lastSlope = 0;

  sync(dt: number, steer = 0) {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
    this.wheelSpin += this.speed * dt / 0.38;
    this.steerVis += (steer - this.steerVis) * Math.min(1, dt * 8);
    this.wheels.forEach((w, i) => {
      w.rotation.x = this.wheelSpin;
      if (i < 2) w.rotation.y = -this.steerVis * 0.45;
    });
    // Body roll & pitch
    this.body.rotation.z = this.steerVis * Math.min(1, Math.abs(this.speed) / 30) * 0.06 + (this.drifting ? this.steerVis * 0.05 : 0);
    this.body.rotation.x = this.airborne ? -this.vy * 0.015 : 0;
    this.body.rotation.y = this.drifting ? -this.lateral * 0.03 : 0;
    this.flames.forEach((f) => {
      f.visible = this.boosting;
      f.scale.z = 0.8 + Math.random() * 0.6;
    });
    (this.underglow.material as THREE.MeshBasicMaterial).opacity = 0.25 + (this.boosting ? 0.3 : 0);
  }

  dispose() {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.Material | undefined;
      if (mat && !mat.userData.cached) mat.dispose();
    });
  }
}
