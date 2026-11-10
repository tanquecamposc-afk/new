/**
 * Procedural character: an original stylised "Corredor del Nexo" — helmet with a glowing visor,
 * backpack core and a scarf that trails with speed — assembled from primitives and animated
 * entirely in code from the simulation's movement state. There are no model or animation files.
 *
 * Local space: the character faces -Z; positive hip rotation swings a leg forward.
 */
import * as THREE from 'three';
import type { MoveState } from '../../core/sim/character.js';
import { PALETTE } from './palette.js';

export interface AvatarLook {
  primary: number;
  secondary: number;
  accent: number;
  skin: number;
  dark: number;
}

export const DEFAULT_LOOK: AvatarLook = Object.freeze({
  primary: 0xf2a33a,
  secondary: 0x21414f,
  accent: PALETTE.turquoise,
  skin: 0xc98e6b,
  dark: 0x16242e,
});

/** Everything the animation needs to know for one rendered frame. */
export interface AvatarPose {
  moveState: MoveState;
  grounded: boolean;
  /** Horizontal speed in m/s. */
  speed: number;
  /** Velocity in the character's own frame (m/s). */
  forwardSpeed: number;
  rightSpeed: number;
  verticalSpeed: number;
  /** Look pitch in radians (positive = up). */
  pitch: number;
  /** 0..1 progress of a ledge climb, or -1 when not climbing. */
  mantleProgress: number;
  /** Metres walked on foot, from the simulation; keeps feet and footsteps in sync. */
  strideMeters: number;
}

interface Limb {
  root: THREE.Group;
  joint: THREE.Group;
}

const PELVIS_HEIGHT = 0.92;
const THIGH = 0.42;
const SHIN = 0.42;
const UPPER_ARM = 0.28;
const FOREARM = 0.26;

let sharedGeometry: ReturnType<typeof createGeometry> | null = null;

function limbGeometry(radius: number, length: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 10).translate(0, -length / 2, 0);
}

function createGeometry() {
  return {
    pelvis: new THREE.SphereGeometry(1, 14, 10).scale(0.19, 0.13, 0.15),
    torso: new THREE.CapsuleGeometry(0.165, 0.24, 4, 12).scale(1.12, 1, 0.82).translate(0, 0.3, 0),
    chest: new THREE.BoxGeometry(0.3, 0.17, 0.06).translate(0, 0.4, -0.125),
    pack: new THREE.BoxGeometry(0.27, 0.34, 0.15).translate(0, 0.33, 0.185),
    packCore: new THREE.SphereGeometry(0.055, 10, 8).translate(0, 0.36, 0.265),
    head: new THREE.SphereGeometry(0.155, 16, 12).translate(0, 0.17, 0),
    helmet: new THREE.SphereGeometry(0.178, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).translate(0, 0.175, 0.008),
    visor: new THREE.BoxGeometry(0.25, 0.062, 0.1).translate(0, 0.17, -0.105),
    crest: new THREE.ConeGeometry(0.035, 0.2, 6).rotateX(-0.5).translate(0, 0.37, 0.05),
    scarf: new THREE.BoxGeometry(0.11, 0.34, 0.022).translate(0, -0.17, 0),
    upperArm: limbGeometry(0.06, UPPER_ARM),
    forearm: limbGeometry(0.052, FOREARM),
    hand: new THREE.SphereGeometry(0.058, 10, 8).translate(0, -FOREARM - 0.02, 0),
    thigh: limbGeometry(0.086, THIGH),
    shin: limbGeometry(0.07, SHIN),
    boot: new THREE.BoxGeometry(0.13, 0.11, 0.28).translate(0, -SHIN - 0.03, -0.05),
    blob: new THREE.CircleGeometry(0.46, 20).rotateX(-Math.PI / 2),
  };
}

export class Avatar {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly spine = new THREE.Group();
  private readonly neck = new THREE.Group();
  private readonly scarf = new THREE.Group();
  private readonly armL: Limb;
  private readonly armR: Limb;
  private readonly legL: Limb;
  private readonly legR: Limb;
  private readonly torsoMesh: THREE.Mesh;
  private readonly blob: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly materials: THREE.Material[] = [];

  private phase = 0;
  private lastStride = 0;
  private time = 0;
  private landSquash = 0;
  private wasGrounded = true;
  private lastFallSpeed = 0;
  // Smoothed blend weights.
  private crouchK = 0;
  private slideK = 0;
  private airK = 0;
  private mantleK = 0;
  private gaitK = 0;
  private hipsYaw = 0;

  constructor(look: AvatarLook = DEFAULT_LOOK) {
    sharedGeometry ??= createGeometry();
    const geo = sharedGeometry;
    const standard = (color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.materials.push(material);
      return material;
    };
    const primary = standard(look.primary, 0.62);
    const secondary = standard(look.secondary, 0.75);
    const dark = standard(look.dark, 0.85);
    const skin = standard(look.skin, 0.8);
    const accent = new THREE.MeshStandardMaterial({ color: look.accent, emissive: look.accent, emissiveIntensity: 1.4, roughness: 0.4 });
    this.materials.push(accent);

    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh => {
      const m = new THREE.Mesh(geometry, material);
      m.castShadow = true;
      m.receiveShadow = false;
      return m;
    };

    this.group.name = 'avatar';
    this.body.position.y = PELVIS_HEIGHT;
    this.group.add(this.body);

    this.body.add(mesh(geo.pelvis, secondary));
    this.spine.position.y = 0.05;
    this.body.add(this.spine);
    this.torsoMesh = mesh(geo.torso, primary);
    this.spine.add(this.torsoMesh, mesh(geo.chest, secondary), mesh(geo.pack, secondary), mesh(geo.packCore, accent));

    this.neck.position.y = 0.55;
    this.spine.add(this.neck);
    this.neck.add(mesh(geo.head, skin), mesh(geo.helmet, primary), mesh(geo.visor, accent), mesh(geo.crest, accent));

    this.scarf.position.set(0, 0.5, 0.13);
    this.scarf.add(mesh(geo.scarf, accent));
    this.spine.add(this.scarf);

    const makeLimb = (parent: THREE.Group, x: number, y: number, upper: THREE.BufferGeometry, lower: THREE.BufferGeometry, upperLength: number, end: THREE.BufferGeometry, upperMat: THREE.Material, lowerMat: THREE.Material, endMat: THREE.Material): Limb => {
      const root = new THREE.Group();
      root.position.set(x, y, 0);
      const joint = new THREE.Group();
      joint.position.y = -upperLength;
      root.add(mesh(upper, upperMat), joint);
      joint.add(mesh(lower, lowerMat), mesh(end, endMat));
      parent.add(root);
      return { root, joint };
    };
    this.armL = makeLimb(this.spine, -0.25, 0.47, geo.upperArm, geo.forearm, UPPER_ARM, geo.hand, primary, secondary, dark);
    this.armR = makeLimb(this.spine, 0.25, 0.47, geo.upperArm, geo.forearm, UPPER_ARM, geo.hand, primary, secondary, dark);
    this.legL = makeLimb(this.body, -0.1, -0.02, geo.thigh, geo.shin, THIGH, geo.boot, secondary, secondary, dark);
    this.legR = makeLimb(this.body, 0.1, -0.02, geo.thigh, geo.shin, THIGH, geo.boot, secondary, secondary, dark);

    const blobMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    this.materials.push(blobMaterial);
    this.blob = new THREE.Mesh(geo.blob, blobMaterial);
    this.blob.position.y = 0.03;
    this.blob.renderOrder = 1;
    this.group.add(this.blob);
  }

  /** Soft contact shadow for when real shadow maps are disabled. */
  setBlobShadow(visible: boolean): void {
    this.blob.visible = visible;
  }

  setShadowCasting(enabled: boolean): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh && object !== this.blob) object.castShadow = enabled;
    });
  }

  /** `groundOffset` = how far below the feet the ground is (keeps the blob on the floor mid-jump). */
  update(pose: AvatarPose, frameSeconds: number, reducedMotion: boolean, groundOffset = 0): void {
    const dt = Math.min(frameSeconds, 0.1);
    this.time += dt;
    const blend = (current: number, target: number, rate: number): number => current + (target - current) * (1 - Math.exp(-rate * dt));

    const climbing = pose.mantleProgress >= 0;
    const sliding = pose.moveState === 'slide';
    const crouching = pose.moveState === 'crouch';
    const airborne = !pose.grounded && !climbing;
    const moving = pose.grounded && !sliding && !climbing && pose.speed > 0.25;

    this.crouchK = blend(this.crouchK, crouching ? 1 : 0, 14);
    this.slideK = blend(this.slideK, sliding ? 1 : 0, 16);
    this.airK = blend(this.airK, airborne ? 1 : 0, 14);
    this.mantleK = blend(this.mantleK, climbing ? 1 : 0, 18);
    this.gaitK = blend(this.gaitK, moving ? 1 : 0, 12);

    // Landing squash, proportional to how hard the character came down.
    if (pose.grounded && !this.wasGrounded) this.landSquash = Math.min(1, Math.max(0.15, this.lastFallSpeed / 12));
    this.wasGrounded = pose.grounded;
    if (!pose.grounded) this.lastFallSpeed = Math.max(0, -pose.verticalSpeed);
    this.landSquash = blend(this.landSquash, 0, 9);

    /* ---- gait phase, driven by distance actually covered -------------------------------- */
    const travelled = Math.max(0, pose.strideMeters - this.lastStride);
    this.lastStride = pose.strideMeters;
    const intensity = THREE.MathUtils.clamp((pose.speed - 2) / 5, 0, 1);
    const strideLength = THREE.MathUtils.lerp(1.45, 2.5, intensity);
    const backwards = pose.forwardSpeed < -0.4 && Math.abs(pose.forwardSpeed) > Math.abs(pose.rightSpeed);
    this.phase += ((travelled < 1 ? travelled : 0) / strideLength) * Math.PI * 2 * (backwards ? -1 : 1);
    const p = this.phase;
    const amplitude = this.gaitK * (0.32 + 0.55 * intensity) * (1 - 0.45 * this.crouchK);

    // Hips turn toward the direction of travel; the torso keeps facing where the player looks.
    let travelYaw = 0;
    if (moving) {
      travelYaw = -Math.atan2(pose.rightSpeed, backwards ? -pose.forwardSpeed : pose.forwardSpeed);
      if (backwards) travelYaw = -travelYaw;
      travelYaw = THREE.MathUtils.clamp(travelYaw, -1.15, 1.15);
    }
    this.hipsYaw = blend(this.hipsYaw, travelYaw, 10);

    /* ---- base pose from blended states --------------------------------------------------- */
    const air = this.airK;
    const rising = THREE.MathUtils.clamp(pose.verticalSpeed / 6, -1, 1);
    const slide = this.slideK;
    const crouch = this.crouchK * (1 - slide);
    const climb = this.mantleK;
    const reach = climbing ? 1 - THREE.MathUtils.smoothstep(pose.mantleProgress, 0.55, 1) : 0;

    const bob = reducedMotion ? 0 : Math.abs(Math.sin(p)) * 0.05 * amplitude;
    const breathe = reducedMotion ? 0 : Math.sin(this.time * 1.7) * 0.012 * (1 - this.gaitK);
    const drop = crouch * 0.36 + slide * 0.5 + this.landSquash * 0.2;
    this.body.position.y = PELVIS_HEIGHT - drop + bob;
    this.body.rotation.set(slide * 0.32, this.hipsYaw, Math.sin(p) * 0.035 * amplitude);

    const lean = -(0.03 + 0.2 * intensity) * this.gaitK - crouch * 0.42 + slide * 0.35 - air * 0.1 * Math.max(0, -rising) - climb * 0.25;
    this.spine.rotation.set(lean + pose.pitch * 0.22, -this.hipsYaw * 0.85 - Math.sin(p) * 0.14 * amplitude, 0);
    this.torsoMesh.scale.y = 1 + breathe;
    this.neck.rotation.set(-lean * 0.7 + pose.pitch * 0.5, 0, 0);

    // Legs.
    const legSwing = (phase: number): [number, number] => {
      const hip = Math.sin(phase) * (0.42 + 0.5 * intensity) * this.gaitK * (1 - 0.3 * crouch);
      const knee = -(0.08 + Math.max(0, Math.cos(phase)) * (0.7 + 0.7 * intensity)) * this.gaitK;
      return [hip, knee];
    };
    const [hipL, kneeL] = legSwing(p);
    const [hipR, kneeR] = legSwing(p + Math.PI);
    const airHipL = 0.55 * Math.max(0, rising) + 0.12;
    const airHipR = 0.1 - 0.2 * Math.max(0, -rising);
    const idleStance = (1 - this.gaitK) * (1 - air) * (1 - crouch) * (1 - slide);
    this.setLimb(
      this.legL,
      hipL * (1 - air) + crouch * 1.05 + slide * 1.3 + air * airHipL + climb * 0.2 + idleStance * 0.03,
      kneeL * (1 - air) - crouch * 1.75 - slide * 0.2 - air * (0.35 + 0.55 * Math.max(0, rising)) - climb * 0.3 - this.landSquash * 0.5,
      -0.03 - slide * 0.08,
      blend,
    );
    this.setLimb(
      this.legR,
      hipR * (1 - air) + crouch * 1.05 + slide * 0.85 + air * airHipR + climb * (1.3 * (1 - reach)) - idleStance * 0.03,
      kneeR * (1 - air) - crouch * 1.75 - slide * 1.85 - air * 0.3 - climb * (1.5 * (1 - reach)) - this.landSquash * 0.5,
      0.03 + slide * 0.08,
      blend,
    );

    // Arms swing opposite to the legs; elbows bend more the faster the run.
    const armSwing = (0.35 + 0.6 * intensity) * this.gaitK;
    const elbow = 0.18 + (0.3 + 0.75 * intensity) * this.gaitK;
    const falling = air * Math.max(0, -rising);
    const armUp = air * Math.max(0, rising) * 0.9 + climb * (0.5 + 2.2 * reach);
    this.setLimb(
      this.armL,
      -Math.sin(p) * armSwing + armUp - slide * 0.9 + crouch * 0.3,
      elbow + air * 0.5 + climb * 0.4 + crouch * 0.5,
      -(0.1 + falling * 0.95 + idleStance * 0.05),
      blend,
    );
    this.setLimb(
      this.armR,
      Math.sin(p) * armSwing + armUp + slide * 0.55 + crouch * 0.3,
      elbow + air * 0.5 + climb * 0.4 + crouch * 0.5,
      0.1 + falling * 0.95 + idleStance * 0.05,
      blend,
    );

    // The scarf lifts with speed and flutters.
    const flutter = reducedMotion ? 0 : Math.sin(this.time * 11) * 0.09 + Math.sin(this.time * 17.3) * 0.05;
    const lift = Math.min(1.25, 0.18 + pose.speed * 0.14 + falling * 0.8);
    this.scarf.rotation.x = blend(this.scarf.rotation.x, -(lift + flutter * Math.min(1, pose.speed / 4 + falling)), 10);
    this.scarf.rotation.z = flutter * 0.4;

    this.blob.position.y = 0.03 - groundOffset;
    const fade = THREE.MathUtils.clamp(1 - groundOffset / 5, 0, 1);
    this.blob.material.opacity = 0.3 * fade;
    this.blob.scale.setScalar(0.75 + 0.25 * fade);
  }

  dispose(): void {
    for (const material of this.materials) material.dispose();
    this.group.removeFromParent();
  }

  private setLimb(limb: Limb, rootX: number, jointX: number, rootZ: number, blend: (c: number, t: number, r: number) => number): void {
    limb.root.rotation.x = blend(limb.root.rotation.x, rootX, 22);
    limb.root.rotation.z = blend(limb.root.rotation.z, rootZ, 16);
    limb.joint.rotation.x = blend(limb.joint.rotation.x, jointX, 22);
  }
}
