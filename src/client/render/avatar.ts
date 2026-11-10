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
  scarf: number;
  skin: number;
  dark: number;
}

export const DEFAULT_LOOK: AvatarLook = Object.freeze({
  primary: 0xf2a33a,
  secondary: 0x2b6076,
  accent: PALETTE.turquoise,
  scarf: PALETTE.coral,
  skin: 0xc98e6b,
  dark: 0x17262f,
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
  // Sphere band facing -Z (the front): used for the glowing visor.
  const visor = new THREE.SphereGeometry(0.182, 20, 6, Math.PI * 1.5 - 1.05, 2.1, Math.PI * 0.4, Math.PI * 0.17).translate(0, 0.16, 0);
  return {
    pelvis: new THREE.SphereGeometry(1, 14, 10).scale(0.205, 0.14, 0.165),
    belt: new THREE.TorusGeometry(0.19, 0.036, 6, 20).rotateX(Math.PI / 2).scale(1.05, 1, 0.86).translate(0, 0.07, 0),
    torso: new THREE.CapsuleGeometry(0.19, 0.2, 5, 14).scale(1.16, 1, 0.84).translate(0, 0.3, 0),
    emblem: new THREE.OctahedronGeometry(0.075, 0).scale(1, 1.25, 0.35).translate(0, 0.36, -0.175),
    strapL: new THREE.BoxGeometry(0.05, 0.36, 0.03).rotateZ(0.16).translate(-0.12, 0.33, -0.158),
    strapR: new THREE.BoxGeometry(0.05, 0.36, 0.03).rotateZ(-0.16).translate(0.12, 0.33, -0.158),
    pack: new THREE.CapsuleGeometry(0.115, 0.16, 4, 10).scale(1.15, 1, 0.75).translate(0, 0.31, 0.205),
    packCore: new THREE.SphereGeometry(0.06, 12, 8).scale(1, 1, 0.6).translate(0, 0.34, 0.292),
    shoulder: new THREE.SphereGeometry(0.108, 12, 8).scale(1, 0.8, 1),
    head: new THREE.SphereGeometry(0.168, 18, 12).translate(0, 0.16, 0),
    helmet: new THREE.SphereGeometry(0.192, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56).translate(0, 0.165, 0.012),
    visor,
    crest: new THREE.BoxGeometry(0.03, 0.11, 0.26).rotateX(0.32).translate(0, 0.365, 0.03),
    scarf: new THREE.BoxGeometry(0.15, 0.26, 0.022).translate(0, -0.13, 0),
    scarfTip: new THREE.BoxGeometry(0.13, 0.22, 0.02).translate(0, -0.11, 0),
    upperArm: limbGeometry(0.07, UPPER_ARM),
    forearm: limbGeometry(0.072, FOREARM),
    hand: new THREE.SphereGeometry(0.078, 10, 8).translate(0, -FOREARM - 0.03, 0),
    thigh: limbGeometry(0.105, THIGH),
    shin: limbGeometry(0.088, SHIN),
    boot: new THREE.BoxGeometry(0.18, 0.13, 0.33).translate(0, -SHIN - 0.02, -0.06),
    sole: new THREE.BoxGeometry(0.19, 0.04, 0.35).translate(0, -SHIN - 0.075, -0.06),
    blob: new THREE.CircleGeometry(0.46, 20).rotateX(-Math.PI / 2),
  };
}

export class Avatar {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly spine = new THREE.Group();
  private readonly neck = new THREE.Group();
  private readonly scarf = new THREE.Group();
  private readonly scarfTip = new THREE.Group();
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
    const primary = standard(look.primary, 0.6);
    const secondary = standard(look.secondary, 0.72);
    const dark = standard(look.dark, 0.85);
    const skin = standard(look.skin, 0.8);
    const scarf = standard(look.scarf, 0.8);
    const accent = new THREE.MeshStandardMaterial({ color: look.accent, emissive: look.accent, emissiveIntensity: 1.6, roughness: 0.35 });
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

    this.body.add(mesh(geo.pelvis, secondary), mesh(geo.belt, dark));
    this.spine.position.y = 0.05;
    this.body.add(this.spine);
    this.torsoMesh = mesh(geo.torso, primary);
    this.spine.add(this.torsoMesh, mesh(geo.emblem, accent), mesh(geo.strapL, dark), mesh(geo.strapR, dark), mesh(geo.pack, secondary), mesh(geo.packCore, accent));

    this.neck.position.y = 0.5;
    this.spine.add(this.neck);
    this.neck.add(mesh(geo.head, skin), mesh(geo.helmet, primary), mesh(geo.visor, accent), mesh(geo.crest, secondary));

    // Scarf: two hinged ribbons hanging from the back of the neck.
    this.scarf.position.set(0, 0.5, 0.15);
    this.scarf.add(mesh(geo.scarf, scarf));
    this.scarfTip.position.y = -0.25;
    this.scarfTip.add(mesh(geo.scarfTip, scarf));
    this.scarf.add(this.scarfTip);
    this.spine.add(this.scarf);

    const makeLimb = (parent: THREE.Group, x: number, y: number, upperLength: number, upper: THREE.Mesh[], lower: THREE.Mesh[]): Limb => {
      const root = new THREE.Group();
      root.position.set(x, y, 0);
      const joint = new THREE.Group();
      joint.position.y = -upperLength;
      root.add(...upper, joint);
      joint.add(...lower);
      parent.add(root);
      return { root, joint };
    };
    const arm = (x: number): Limb =>
      makeLimb(this.spine, x, 0.46, UPPER_ARM, [mesh(geo.upperArm, primary), mesh(geo.shoulder, secondary)], [mesh(geo.forearm, dark), mesh(geo.hand, dark)]);
    const leg = (x: number): Limb =>
      makeLimb(this.body, x, -0.02, THIGH, [mesh(geo.thigh, secondary)], [mesh(geo.shin, secondary), mesh(geo.boot, primary), mesh(geo.sole, dark)]);
    this.armL = arm(-0.275);
    this.armR = arm(0.275);
    this.legL = leg(-0.105);
    this.legR = leg(0.105);

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
    // In the air the character holds a leap: lead knee driven up, trailing leg back.
    const airHipL = 0.7 + 0.25 * rising;
    const airHipR = -0.28 - 0.12 * rising;
    const idleStance = (1 - this.gaitK) * (1 - air) * (1 - crouch) * (1 - slide);
    this.setLimb(
      this.legL,
      hipL * (1 - air) + crouch * 1.05 + slide * 1.3 + air * airHipL + climb * 0.2 + idleStance * 0.03,
      kneeL * (1 - air) - crouch * 1.75 - slide * 0.2 - air * 1.1 - climb * 0.3 - this.landSquash * 0.5,
      -0.03 - slide * 0.08,
      blend,
    );
    this.setLimb(
      this.legR,
      hipR * (1 - air) + crouch * 1.05 + slide * 0.85 + air * airHipR + climb * (1.3 * (1 - reach)) - idleStance * 0.03,
      kneeR * (1 - air) - crouch * 1.75 - slide * 1.85 - air * 0.55 - climb * (1.5 * (1 - reach)) - this.landSquash * 0.5,
      0.03 + slide * 0.08,
      blend,
    );

    // Arms swing opposite to the legs; elbows bend more the faster the run.
    const armSwing = (0.35 + 0.6 * intensity) * this.gaitK;
    const elbow = 0.18 + (0.3 + 0.75 * intensity) * this.gaitK;
    const falling = air * Math.max(0, -rising);
    const armUp = climb * (0.5 + 2.2 * reach);
    // Airborne arms counter the legs and spread for balance, wider while falling.
    const airSpread = air * (0.42 + 0.6 * falling);
    this.setLimb(
      this.armL,
      -Math.sin(p) * armSwing * (1 - air) + armUp - air * (0.5 - 0.3 * rising) - slide * 0.9 + crouch * 0.3,
      elbow + air * 0.6 + climb * 0.4 + crouch * 0.5,
      -(0.1 + airSpread + idleStance * 0.05),
      blend,
    );
    this.setLimb(
      this.armR,
      Math.sin(p) * armSwing * (1 - air) + armUp + air * (0.75 + 0.25 * rising) + slide * 0.55 + crouch * 0.3,
      elbow + air * 0.6 + climb * 0.4 + crouch * 0.5,
      0.1 + airSpread + idleStance * 0.05,
      blend,
    );

    // The scarf lifts with speed and flutters.
    const flutter = reducedMotion ? 0 : Math.sin(this.time * 11) * 0.09 + Math.sin(this.time * 17.3) * 0.05;
    const lift = Math.min(1.25, 0.18 + pose.speed * 0.14 + falling * 0.8);
    this.scarf.rotation.x = blend(this.scarf.rotation.x, -(lift + flutter * Math.min(1, pose.speed / 4 + falling)), 10);
    this.scarf.rotation.z = flutter * 0.4;
    this.scarfTip.rotation.x = blend(this.scarfTip.rotation.x, -(lift * 0.35 + flutter * 1.4), 8);

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
