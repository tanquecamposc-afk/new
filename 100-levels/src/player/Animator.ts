/**
 * Procedural animation system with smooth blending.
 *
 * - Locomotion clips (idle / walk / run / sprint / crouch / jump / fall / drive / aim)
 *   are procedural functions; their weights are damped every frame, so
 *   transitions always cross-fade.
 * - Actions (attacks, dodge, hit, interact, victory, death...) are keyframed
 *   partial poses layered on top with fade in/out; joints an action doesn't
 *   touch keep playing the locomotion underneath (e.g. run + slash).
 * - Final joint rotations are additionally damped toward the target, so no pose
 *   change is ever instantaneous.
 */
import { CharacterModel, JOINTS, JointName } from './CharacterModel';
import { dampT, smoothstep } from '../core/math';

const NJ = JOINTS.length;
const SIZE = NJ * 3 + 4;
const X_HIPY = NJ * 3, X_HIPZ = NJ * 3 + 1, X_PITCH = NJ * 3 + 2, X_SPIN = NJ * 3 + 3;
const JI: Record<JointName, number> = Object.fromEntries(JOINTS.map((j, i) => [j, i])) as Record<JointName, number>;

type Pose = Float32Array;
type Partial = { [K in JointName]?: [number, number, number] } & { hipY?: number; hipZ?: number; pitch?: number; spin?: number };

export interface AnimParams {
  speed: number;
  grounded: boolean;
  vy: number;
  crouch: boolean;
  sprint: boolean;
  drive?: boolean;
  aim?: boolean;
  /** -1..1 turning rate for leaning. */
  turn?: number;
  /** Carry pose for two-handed/heavy weapons. */
  heavyWeapon?: boolean;
  /** Stride multiplier (long-legged creatures). */
  stride?: number;
}

interface ActionDef {
  dur: number;
  keys: { t: number; p: Partial }[];
  hit?: number[];
  loop?: boolean;
  hold?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

const ACTIONS: Record<string, ActionDef> = {
  slash1: {
    dur: 0.42, hit: [0.42],
    keys: [
      { t: 0, p: {} },
      { t: 0.3, p: { shR: [-1.3, 0.2, -1.4], elR: [-0.9, 0, 0], chest: [0, 0.7, 0], spine: [0, 0.2, 0], shL: [-0.3, 0, 0.4] } },
      { t: 0.5, p: { shR: [-1.5, 0, 0.3], elR: [-0.2, 0, 0], chest: [0.1, -0.5, 0], spine: [0, -0.2, 0], shL: [0.2, 0, 0.5] } },
      { t: 0.75, p: { shR: [-1.1, 0, 1.0], elR: [-0.4, 0, 0], chest: [0.05, -0.8, 0], spine: [0, -0.2, 0], shL: [0.3, 0, 0.4] } },
      { t: 1, p: {} },
    ],
  },
  slash2: {
    dur: 0.42, hit: [0.45],
    keys: [
      { t: 0, p: {} },
      { t: 0.3, p: { shR: [-1.2, 0, 1.2], elR: [-1.4, 0, 0], chest: [0, -0.7, 0], spine: [0, -0.2, 0] } },
      { t: 0.52, p: { shR: [-1.5, 0, -0.6], elR: [-0.1, 0, 0], chest: [0.05, 0.6, 0], spine: [0, 0.2, 0] } },
      { t: 0.75, p: { shR: [-1.0, 0, -1.2], elR: [-0.3, 0, 0], chest: [0, 0.8, 0] } },
      { t: 1, p: {} },
    ],
  },
  slash3: {
    dur: 0.55, hit: [0.5],
    keys: [
      { t: 0, p: {} },
      { t: 0.35, p: { shR: [-2.9, 0, -0.2], elR: [-0.6, 0, 0], shL: [-2.6, 0, 0.3], elL: [-0.6, 0, 0], chest: [-0.25, 0, 0], hipY: 0.03 } },
      { t: 0.55, p: { shR: [-0.6, 0, -0.1], elR: [-0.1, 0, 0], shL: [-0.7, 0, 0.2], elL: [-0.1, 0, 0], chest: [0.45, 0, 0], spine: [0.2, 0, 0], hipY: -0.18, thL: [-0.6, 0, 0], knL: [0.7, 0, 0], thR: [0.3, 0, 0], knR: [0.4, 0, 0] } },
      { t: 0.8, p: { shR: [-0.5, 0, -0.1], chest: [0.35, 0, 0], hipY: -0.15, thL: [-0.5, 0, 0], knL: [0.6, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  heavy: {
    dur: 0.85, hit: [0.55],
    keys: [
      { t: 0, p: {} },
      { t: 0.4, p: { shR: [-3.0, 0, 0.3], elR: [-0.5, 0, 0], shL: [-3.0, 0, -0.3], elL: [-0.5, 0, 0], chest: [-0.35, 0, 0], spine: [-0.1, 0, 0], hipY: 0.05, thL: [-0.3, 0, 0], knL: [0.4, 0, 0] } },
      { t: 0.58, p: { shR: [-0.4, 0, 0.3], elR: [-0.1, 0, 0], shL: [-0.4, 0, -0.3], elL: [-0.1, 0, 0], chest: [0.6, 0, 0], spine: [0.3, 0, 0], hipY: -0.3, thL: [-0.9, 0, 0], knL: [1.2, 0, 0], thR: [0.5, 0, 0], knR: [0.8, 0, 0] } },
      { t: 0.8, p: { shR: [-0.4, 0, 0.3], shL: [-0.4, 0, -0.3], chest: [0.5, 0, 0], spine: [0.25, 0, 0], hipY: -0.28, thL: [-0.8, 0, 0], knL: [1.1, 0, 0], thR: [0.4, 0, 0], knR: [0.7, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  spin: {
    dur: 0.8, hit: [0.25, 0.5, 0.75],
    keys: [
      { t: 0, p: { spin: 0 } },
      { t: 0.1, p: { shR: [-1.5, 0, -1.4], shL: [-1.5, 0, 1.4], chest: [0.1, 0, 0], hipY: -0.12, spin: 0.5, thL: [-0.4, 0, 0.2], knL: [0.5, 0, 0], thR: [-0.4, 0, -0.2], knR: [0.5, 0, 0] } },
      { t: 0.9, p: { shR: [-1.5, 0, -1.4], shL: [-1.5, 0, 1.4], chest: [0.1, 0, 0], hipY: -0.12, spin: Math.PI * 4, thL: [-0.4, 0, 0.2], knL: [0.5, 0, 0], thR: [-0.4, 0, -0.2], knR: [0.5, 0, 0] } },
      { t: 1, p: { spin: Math.PI * 4 } },
    ],
  },
  thrust: {
    dur: 0.36, hit: [0.4],
    keys: [
      { t: 0, p: {} },
      { t: 0.3, p: { shR: [-0.6, 0, -0.2], elR: [-1.8, 0, 0], chest: [0, 0.4, 0] } },
      { t: 0.5, p: { shR: [-1.6, 0, 0.1], elR: [0, 0, 0], chest: [0.15, -0.3, 0], spine: [0.1, 0, 0], thL: [-0.6, 0, 0], knL: [0.5, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  stabL: {
    dur: 0.28, hit: [0.45],
    keys: [
      { t: 0, p: {} },
      { t: 0.25, p: { shL: [-0.5, 0, 0.2], elL: [-1.8, 0, 0], chest: [0, -0.4, 0] } },
      { t: 0.5, p: { shL: [-1.6, 0, -0.1], elL: [0, 0, 0], chest: [0.1, 0.35, 0] } },
      { t: 1, p: {} },
    ],
  },
  flurry: {
    dur: 0.9, hit: [0.15, 0.3, 0.45, 0.6, 0.75, 0.9],
    keys: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((t, i) => ({
      t,
      p: i === 0 || i === 7 ? {} : i % 2
        ? { shR: [-1.6, 0, 0.2] as [number, number, number], elR: [0, 0, 0] as [number, number, number], shL: [-0.6, 0, 0.2] as [number, number, number], elL: [-1.6, 0, 0] as [number, number, number], chest: [0.1, -0.4, 0] as [number, number, number] }
        : { shL: [-1.6, 0, -0.2] as [number, number, number], elL: [0, 0, 0] as [number, number, number], shR: [-0.6, 0, -0.2] as [number, number, number], elR: [-1.6, 0, 0] as [number, number, number], chest: [0.1, 0.4, 0] as [number, number, number] },
    })),
  },
  bowDraw: {
    dur: 0.35, hold: true,
    keys: [
      { t: 0, p: {} },
      { t: 1, p: { shL: [-1.55, 0, -0.05], elL: [0, 0, 0], shR: [-1.5, 0, 0.55], elR: [-2.3, 0, 0], chest: [0, 0.9, 0], head: [0, -0.8, 0], neck: [0, -0.1, 0] } },
    ],
  },
  bowRelease: {
    dur: 0.3,
    keys: [
      { t: 0, p: { shL: [-1.55, 0, -0.05], elL: [0, 0, 0], shR: [-1.5, 0, 0.55], elR: [-2.3, 0, 0], chest: [0, 0.9, 0], head: [0, -0.8, 0] } },
      { t: 0.3, p: { shL: [-1.55, 0, -0.05], elL: [0, 0, 0], shR: [-1.2, 0, 1.1], elR: [-0.8, 0, 0], chest: [0, 0.9, 0], head: [0, -0.8, 0] } },
      { t: 1, p: {} },
    ],
  },
  cast: {
    dur: 0.45, hit: [0.45],
    keys: [
      { t: 0, p: {} },
      { t: 0.35, p: { shR: [-2.2, 0, -0.3], elR: [-0.6, 0, 0], shL: [-0.8, 0, 0.6], chest: [-0.1, 0.3, 0] } },
      { t: 0.5, p: { shR: [-1.5, 0, 0.1], elR: [0, 0, 0], shL: [-1.2, 0, 0.4], elL: [-0.3, 0, 0], chest: [0.15, -0.2, 0] } },
      { t: 1, p: {} },
    ],
  },
  slam: {
    dur: 1.0, hit: [0.62],
    keys: [
      { t: 0, p: {} },
      { t: 0.2, p: { hipY: -0.25, thL: [-0.9, 0, 0], knL: [1.3, 0, 0], thR: [-0.9, 0, 0], knR: [1.3, 0, 0], shR: [0.4, 0, 0], shL: [0.4, 0, 0] } },
      { t: 0.45, p: { hipY: 0.6, shR: [-3.0, 0, 0.2], shL: [-3.0, 0, -0.2], thL: [-0.8, 0, 0], knL: [1.4, 0, 0], thR: [-0.2, 0, 0], knR: [1.2, 0, 0], chest: [-0.3, 0, 0] } },
      { t: 0.62, p: { hipY: -0.35, shR: [-0.3, 0, 0.3], shL: [-0.3, 0, -0.3], chest: [0.7, 0, 0], spine: [0.3, 0, 0], thL: [-1.1, 0, 0], knL: [1.5, 0, 0], thR: [0.6, 0, 0], knR: [1.1, 0, 0] } },
      { t: 0.85, p: { hipY: -0.3, shR: [-0.3, 0, 0.3], shL: [-0.3, 0, -0.3], chest: [0.6, 0, 0], thL: [-1, 0, 0], knL: [1.4, 0, 0], thR: [0.5, 0, 0], knR: [1, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  hit: {
    dur: 0.35, fadeIn: 0.03,
    keys: [
      { t: 0, p: {} },
      { t: 0.2, p: { chest: [-0.35, 0.2, 0.1], spine: [-0.15, 0, 0], head: [-0.4, 0.3, 0], shL: [-0.5, 0, 0.6], shR: [-0.5, 0, -0.6], elL: [-1, 0, 0], elR: [-1, 0, 0], hipZ: -0.08 } },
      { t: 1, p: {} },
    ],
  },
  interact: {
    dur: 0.5,
    keys: [
      { t: 0, p: {} },
      { t: 0.45, p: { shR: [-1.4, 0, 0.1], elR: [-0.2, 0, 0], chest: [0.2, -0.1, 0], head: [0.2, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  throw: {
    dur: 0.5, hit: [0.5],
    keys: [
      { t: 0, p: {} },
      { t: 0.35, p: { shR: [-2.6, 0, -0.5], elR: [-1.4, 0, 0], chest: [-0.2, 0.6, 0], shL: [-1.2, 0, 0.3] } },
      { t: 0.55, p: { shR: [-1.2, 0, 0.2], elR: [-0.1, 0, 0], chest: [0.3, -0.4, 0], shL: [-0.2, 0, 0.3] } },
      { t: 1, p: {} },
    ],
  },
  dodge: {
    dur: 0.5, fadeIn: 0.04, fadeOut: 0.12,
    keys: [
      { t: 0, p: { hipY: -0.2, pitch: 0 } },
      { t: 0.15, p: { hipY: -0.5, hips: [0.8, 0, 0], thL: [-1.8, 0, 0], knL: [2.2, 0, 0], thR: [-1.8, 0, 0], knR: [2.2, 0, 0], shL: [-1.2, 0, 0.2], shR: [-1.2, 0, -0.2], elL: [-1.6, 0, 0], elR: [-1.6, 0, 0], neck: [0.6, 0, 0] } },
      { t: 0.75, p: { hipY: -0.5, hips: [Math.PI * 2 - 0.3, 0, 0], thL: [-1.8, 0, 0], knL: [2.2, 0, 0], thR: [-1.8, 0, 0], knR: [2.2, 0, 0], shL: [-1.2, 0, 0.2], shR: [-1.2, 0, -0.2], elL: [-1.6, 0, 0], elR: [-1.6, 0, 0], neck: [0.6, 0, 0] } },
      { t: 1, p: { hipY: -0.15, hips: [Math.PI * 2, 0, 0], thL: [-0.6, 0, 0], knL: [0.8, 0, 0], thR: [-0.2, 0, 0], knR: [0.6, 0, 0] } },
    ],
  },
  victory: {
    dur: 1.2, loop: true,
    keys: [
      { t: 0, p: { shR: [-2.9, 0, -0.3], elR: [-0.3, 0, 0], shL: [-0.4, 0, 0.5], elL: [-1.8, 0, 0], chest: [-0.15, 0, 0], head: [-0.25, 0, 0] } },
      { t: 0.25, p: { shR: [-2.9, 0, -0.2], elR: [-0.9, 0, 0], shL: [-0.4, 0, 0.5], elL: [-1.8, 0, 0], chest: [-0.1, 0, 0], hipY: -0.08, thL: [-0.3, 0, 0], knL: [0.5, 0, 0], thR: [-0.3, 0, 0], knR: [0.5, 0, 0] } },
      { t: 0.5, p: { shR: [-3.0, 0, -0.3], elR: [-0.2, 0, 0], shL: [-2.9, 0, 0.3], elL: [-0.2, 0, 0], chest: [-0.2, 0, 0], head: [-0.3, 0, 0], hipY: 0.12 } },
      { t: 0.75, p: { shR: [-2.9, 0, -0.2], elR: [-0.9, 0, 0], shL: [-2.9, 0, 0.2], elL: [-0.9, 0, 0], chest: [-0.1, 0, 0], hipY: -0.05 } },
      { t: 1, p: { shR: [-2.9, 0, -0.3], elR: [-0.3, 0, 0], shL: [-0.4, 0, 0.5], elL: [-1.8, 0, 0], chest: [-0.15, 0, 0], head: [-0.25, 0, 0] } },
    ],
  },
  death: {
    dur: 1.1, hold: true, fadeIn: 0.05,
    keys: [
      { t: 0, p: {} },
      { t: 0.25, p: { chest: [-0.4, 0.3, 0], head: [-0.5, 0.2, 0], shL: [-1.2, 0, 1], shR: [-1.2, 0, -1], hipY: -0.1, pitch: -0.3, knL: [0.8, 0, 0], thL: [-0.5, 0, 0] } },
      { t: 0.7, p: { chest: [-0.2, 0.2, 0], head: [-0.3, 0.4, 0], shL: [-0.3, 0, 1.4], shR: [-0.2, 0, -1.3], elL: [-0.4, 0, 0], hipY: -0.55, pitch: -1.45, thL: [-0.3, 0, 0.2], knL: [0.4, 0, 0], thR: [0.1, 0, -0.15] } },
      { t: 0.85, p: { chest: [-0.15, 0.2, 0], head: [-0.1, 0.6, 0], shL: [-0.3, 0, 1.5], shR: [-0.2, 0, -1.4], elL: [-0.3, 0, 0], hipY: -0.7, pitch: -1.52, thL: [-0.25, 0, 0.2], knL: [0.35, 0, 0], thR: [0.1, 0, -0.15] } },
      { t: 1, p: { chest: [-0.15, 0.2, 0], head: [-0.1, 0.7, 0], shL: [-0.3, 0, 1.5], shR: [-0.2, 0, -1.4], elL: [-0.3, 0, 0], hipY: -0.72, pitch: -1.55, thL: [-0.25, 0, 0.2], knL: [0.35, 0, 0], thR: [0.1, 0, -0.15] } },
    ],
  },
  roar: {
    dur: 1.2,
    keys: [
      { t: 0, p: {} },
      { t: 0.25, p: { chest: [-0.5, 0, 0], head: [-0.6, 0, 0], shL: [-0.6, 0, 1.4], shR: [-0.6, 0, -1.4], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0], hipY: -0.1, thL: [-0.3, 0, 0.3], thR: [-0.3, 0, -0.3], knL: [0.4, 0, 0], knR: [0.4, 0, 0] } },
      { t: 0.8, p: { chest: [-0.5, 0, 0], head: [-0.6, 0, 0], shL: [-0.6, 0, 1.4], shR: [-0.6, 0, -1.4], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0], hipY: -0.1, thL: [-0.3, 0, 0.3], thR: [-0.3, 0, -0.3], knL: [0.4, 0, 0], knR: [0.4, 0, 0] } },
      { t: 1, p: {} },
    ],
  },
  windup: {
    dur: 0.5, hold: true,
    keys: [
      { t: 0, p: {} },
      { t: 1, p: { shR: [-2.6, 0, -0.6], elR: [-1.0, 0, 0], chest: [-0.2, 0.6, 0], hipY: -0.08, thL: [-0.5, 0, 0], knL: [0.5, 0, 0] } },
    ],
  },
  slide: {
    dur: 0.18, hold: true, fadeIn: 0.05, fadeOut: 0.15,
    keys: [
      { t: 0, p: { hipY: -0.3, pitch: -0.15, thL: [-1.0, 0, 0.1], knL: [0.6, 0, 0], thR: [-0.5, 0, -0.1], knR: [1.4, 0, 0] } },
      { t: 1, p: { hipY: -0.55, pitch: -0.32, thL: [-1.45, 0, 0.12], knL: [0.15, 0, 0], ftL: [0.3, 0, 0], thR: [-0.55, 0, -0.12], knR: [1.7, 0, 0], shL: [-0.9, 0, 0.9], elL: [-0.3, 0, 0], shR: [0.35, 0, -0.55], elR: [-0.2, 0, 0], chest: [0.12, 0, 0], head: [0.35, 0, 0] } },
    ],
  },
  vault: {
    dur: 0.34, fadeIn: 0.03, fadeOut: 0.1,
    keys: [
      { t: 0, p: { shL: [-1.4, 0, 0.2], thL: [-1.0, 0, 0.2], knL: [1.2, 0, 0] } },
      { t: 0.3, p: { shL: [-1.1, 0, 0.35], elL: [-0.15, 0, 0], shR: [-0.6, 0, -0.9], thL: [-1.6, 0, 0.45], knL: [1.5, 0, 0], thR: [-1.25, 0, -0.5], knR: [1.1, 0, 0], chest: [0.3, 0.35, 0.1], hipY: 0.06 } },
      { t: 0.7, p: { shL: [-0.4, 0, 0.7], shR: [-0.5, 0, -1.0], thL: [-1.0, 0, 0.55], knL: [0.6, 0, 0], thR: [-1.45, 0, -0.3], knR: [1.3, 0, 0], chest: [0.12, 0.2, 0] } },
      { t: 1, p: {} },
    ],
  },
  climb: {
    dur: 0.42, fadeIn: 0.03, fadeOut: 0.12,
    keys: [
      { t: 0, p: { shL: [-2.8, 0, 0.2], shR: [-2.8, 0, -0.2], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], thL: [-0.4, 0, 0], knL: [0.6, 0, 0], hipY: -0.1 } },
      { t: 0.45, p: { shL: [-1.4, 0, 0.4], shR: [-1.4, 0, -0.4], elL: [-1.6, 0, 0], elR: [-1.6, 0, 0], thL: [-1.8, 0, 0], knL: [2.0, 0, 0], thR: [-0.3, 0, 0], knR: [0.8, 0, 0], chest: [0.5, 0, 0] } },
      { t: 0.8, p: { shL: [-0.3, 0, 0.3], shR: [-0.3, 0, -0.3], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], thL: [-1.2, 0, 0], knL: [1.2, 0, 0], chest: [0.4, 0, 0], hipY: -0.2 } },
      { t: 1, p: {} },
    ],
  },
  land: {
    dur: 0.3, fadeIn: 0.02,
    keys: [
      { t: 0, p: {} },
      { t: 0.25, p: { hipY: -0.25, thL: [-0.8, 0, 0.05], knL: [1.2, 0, 0], thR: [-0.8, 0, -0.05], knR: [1.2, 0, 0], ftL: [-0.4, 0, 0], ftR: [-0.4, 0, 0], chest: [0.3, 0, 0], shL: [-0.3, 0, 0.5], shR: [-0.3, 0, -0.5] } },
      { t: 1, p: {} },
    ],
  },
  sit: {
    dur: 0.3, hold: true,
    keys: [
      { t: 0, p: {} },
      { t: 1, p: { hipY: -0.45, thL: [-1.5, 0, 0.1], knL: [1.5, 0, 0], thR: [-1.5, 0, -0.1], knR: [1.5, 0, 0], shL: [-1.1, 0, 0.1], elL: [-0.4, 0, 0], shR: [-1.1, 0, -0.1], elR: [-0.4, 0, 0] } },
    ],
  },
  hide: {
    dur: 0.4, hold: true,
    keys: [
      { t: 0, p: {} },
      { t: 1, p: { hipY: -0.5, thL: [-1.6, 0, 0.2], knL: [2.0, 0, 0], thR: [-1.6, 0, -0.2], knR: [2.0, 0, 0], shL: [-1.2, 0, 0.3], elL: [-1.8, 0, 0], shR: [-1.2, 0, -0.3], elR: [-1.8, 0, 0], chest: [0.5, 0, 0], head: [0.3, 0, 0] } },
    ],
  },
};

/** Build a compact per-joint track structure for fast sampling. */
interface Track {
  idx: number; // index in pose array (component)
  times: number[];
  vals: number[];
}
const compiled = new Map<string, { def: ActionDef; tracks: Track[] }>();
function compile(name: string) {
  let c = compiled.get(name);
  if (c) return c;
  const def = ACTIONS[name];
  const used = new Set<number>();
  for (const k of def.keys) {
    for (const [key, v] of Object.entries(k.p)) {
      if (key === 'hipY') used.add(X_HIPY);
      else if (key === 'hipZ') used.add(X_HIPZ);
      else if (key === 'pitch') used.add(X_PITCH);
      else if (key === 'spin') used.add(X_SPIN);
      else if (Array.isArray(v)) for (let a = 0; a < 3; a++) used.add(JI[key as JointName] * 3 + a);
    }
  }
  const tracks: Track[] = [];
  for (const idx of used) {
    const times: number[] = [], vals: number[] = [];
    for (const k of def.keys) {
      times.push(k.t);
      let v = 0;
      if (idx === X_HIPY) v = k.p.hipY ?? 0;
      else if (idx === X_HIPZ) v = k.p.hipZ ?? 0;
      else if (idx === X_PITCH) v = k.p.pitch ?? 0;
      else if (idx === X_SPIN) v = k.p.spin ?? 0;
      else {
        const j = JOINTS[Math.floor(idx / 3)];
        v = k.p[j]?.[idx % 3] ?? 0;
      }
      vals.push(v);
    }
    tracks.push({ idx, times, vals });
  }
  c = { def, tracks };
  compiled.set(name, c);
  return c;
}

const WRAPPED = new Set([X_SPIN, JI.hips * 3]);
function sampleTrack(tr: Track, t: number) {
  const v = sampleRaw(tr, t);
  if (!WRAPPED.has(tr.idx)) return v;
  // Full rotations (rolls, spins) wrap so fading out never unwinds them
  const T = Math.PI * 2;
  let w = ((v % T) + T) % T;
  if (w > Math.PI) w -= T;
  return w;
}

function sampleRaw(tr: Track, t: number) {
  const ts = tr.times;
  if (t <= ts[0]) return tr.vals[0];
  for (let i = 1; i < ts.length; i++) {
    if (t <= ts[i]) {
      const k = smoothstep(0, 1, (t - ts[i - 1]) / (ts[i] - ts[i - 1] || 1));
      return tr.vals[i - 1] + (tr.vals[i] - tr.vals[i - 1]) * k;
    }
  }
  return tr.vals[tr.vals.length - 1];
}

type Loco = 'idle' | 'walk' | 'run' | 'sprint' | 'crouch' | 'crouchWalk' | 'jump' | 'fall' | 'drive' | 'aim';
const LOCOS: Loco[] = ['idle', 'walk', 'run', 'sprint', 'crouch', 'crouchWalk', 'jump', 'fall', 'drive', 'aim'];

function setJ(p: Pose, j: JointName, x: number, y = 0, z = 0) {
  const i = JI[j] * 3;
  p[i] = x; p[i + 1] = y; p[i + 2] = z;
}

export class Animator {
  private target = new Float32Array(SIZE);
  private loco = new Float32Array(SIZE);
  private tmp = new Float32Array(SIZE);
  private cur = new Float32Array(SIZE);
  private weights: Record<Loco, number> = { idle: 1, walk: 0, run: 0, sprint: 0, crouch: 0, crouchWalk: 0, jump: 0, fall: 0, drive: 0, aim: 0 };
  private phase = 0;
  private time = Math.random() * 10;
  private action: { name: string; t: number; speed: number; w: number; fadingOut: boolean; hitsDone: number; onHit?: (i: number) => void; onEnd?: () => void } | null = null;
  private prevAction: { tracks: Track[]; t: number; w: number; def: ActionDef } | null = null;
  private landDip = 0;
  private landVel = 0;
  private lean = 0;
  private fwdLean = 0;
  /** Speed of joint smoothing (higher = snappier). */
  smoothing = 22;
  /** Footstep callback (for audio / dust). */
  onStep: ((foot: 0 | 1) => void) | null = null;
  private lastStepPhase = 0;

  constructor(private model: CharacterModel) {}

  /** Start an action; returns false if the same non-looping action is already mid-way. */
  play(name: string, speed = 1, onHit?: (i: number) => void, onEnd?: () => void) {
    if (!ACTIONS[name]) return false;
    if (this.action && !this.action.fadingOut) {
      const c = compile(this.action.name);
      this.prevAction = { tracks: c.tracks, t: this.action.t, w: this.action.w, def: c.def };
    }
    this.action = { name, t: 0, speed, w: 0, fadingOut: false, hitsDone: 0, onHit, onEnd };
    return true;
  }

  /** Release a held action (e.g. bow draw, sit) with a fade out. */
  release(name?: string) {
    if (this.action && (!name || this.action.name === name)) this.action.fadingOut = true;
  }

  stopAll() {
    this.action = null;
    this.prevAction = null;
  }

  get actionName() {
    return this.action && !this.action.fadingOut ? this.action.name : null;
  }
  /** Normalised progress of the current action. */
  get actionProgress() {
    if (!this.action) return 1;
    return Math.min(1, this.action.t / ACTIONS[this.action.name].dur);
  }

  land(impact: number) {
    this.landVel -= Math.min(2.5, impact * 0.12);
  }

  private locoPose(which: Loco, p: Pose, prm: AnimParams) {
    p.fill(0);
    const ph = this.phase;
    const s = Math.sin(ph), c = Math.cos(ph);
    const t = this.time;
    switch (which) {
      case 'idle': {
        const br = Math.sin(t * 1.8);
        setJ(p, 'chest', br * 0.025, 0, 0);
        setJ(p, 'head', -br * 0.02, Math.sin(t * 0.4) * 0.15, 0);
        setJ(p, 'shL', 0.05, 0, 0.12 + br * 0.02);
        setJ(p, 'shR', 0.05, 0, -0.12 - br * 0.02);
        setJ(p, 'elL', -0.25);
        setJ(p, 'elR', -0.25);
        setJ(p, 'thL', 0, 0, 0.04);
        setJ(p, 'thR', 0, 0, -0.04);
        if (prm.heavyWeapon) {
          setJ(p, 'shR', -0.4, 0, -0.2);
          setJ(p, 'elR', -1.1);
        }
        p[X_HIPY] = br * 0.008;
        break;
      }
      case 'walk': {
        setJ(p, 'thL', -s * 0.5, 0, 0.03);
        setJ(p, 'thR', s * 0.5, 0, -0.03);
        setJ(p, 'knL', Math.max(0, c) * 0.7 + 0.05);
        setJ(p, 'knR', Math.max(0, -c) * 0.7 + 0.05);
        setJ(p, 'ftL', s * 0.2);
        setJ(p, 'ftR', -s * 0.2);
        setJ(p, 'shL', s * 0.4, 0, 0.1);
        setJ(p, 'shR', -s * 0.4, 0, -0.1);
        setJ(p, 'elL', -0.35);
        setJ(p, 'elR', -0.35);
        setJ(p, 'chest', 0.04, -s * 0.12, 0);
        setJ(p, 'hips', 0, s * 0.1, 0);
        p[X_HIPY] = -Math.abs(c) * 0.035;
        break;
      }
      case 'run': {
        setJ(p, 'thL', -s * 0.9 - 0.15, 0, 0.03);
        setJ(p, 'thR', s * 0.9 - 0.15, 0, -0.03);
        setJ(p, 'knL', Math.max(0, c) * 1.4 + 0.2);
        setJ(p, 'knR', Math.max(0, -c) * 1.4 + 0.2);
        setJ(p, 'ftL', s * 0.3);
        setJ(p, 'ftR', -s * 0.3);
        setJ(p, 'shL', s * 0.85 - 0.1, 0, 0.12);
        setJ(p, 'shR', -s * 0.85 - 0.1, 0, -0.12);
        setJ(p, 'elL', -1.25);
        setJ(p, 'elR', -1.25);
        setJ(p, 'chest', 0.15, -s * 0.2, 0);
        setJ(p, 'spine', 0.08);
        setJ(p, 'head', -0.12);
        setJ(p, 'hips', 0, s * 0.15, 0);
        p[X_HIPY] = -Math.abs(c) * 0.08 + 0.02;
        break;
      }
      case 'sprint': {
        setJ(p, 'thL', -s * 1.15 - 0.25, 0, 0.03);
        setJ(p, 'thR', s * 1.15 - 0.25, 0, -0.03);
        setJ(p, 'knL', Math.max(0, c) * 1.8 + 0.25);
        setJ(p, 'knR', Math.max(0, -c) * 1.8 + 0.25);
        setJ(p, 'ftL', s * 0.4);
        setJ(p, 'ftR', -s * 0.4);
        setJ(p, 'shL', s * 1.2 - 0.2, 0, 0.12);
        setJ(p, 'shR', -s * 1.2 - 0.2, 0, -0.12);
        setJ(p, 'elL', -1.5);
        setJ(p, 'elR', -1.5);
        setJ(p, 'chest', 0.28, -s * 0.25, 0);
        setJ(p, 'spine', 0.15);
        setJ(p, 'head', -0.3);
        setJ(p, 'hips', 0, s * 0.18, 0);
        p[X_HIPY] = -Math.abs(c) * 0.1 + 0.02;
        break;
      }
      case 'crouch': {
        const br = Math.sin(t * 2);
        setJ(p, 'thL', -1.1, 0, 0.15);
        setJ(p, 'thR', -0.9, 0, -0.15);
        setJ(p, 'knL', 1.7);
        setJ(p, 'knR', 1.6);
        setJ(p, 'ftL', -0.6);
        setJ(p, 'ftR', -0.7);
        setJ(p, 'chest', 0.35 + br * 0.02);
        setJ(p, 'spine', 0.2);
        setJ(p, 'head', -0.45);
        setJ(p, 'shL', -0.6, 0, 0.2);
        setJ(p, 'shR', -0.6, 0, -0.2);
        setJ(p, 'elL', -1.2);
        setJ(p, 'elR', -1.2);
        p[X_HIPY] = -0.42;
        break;
      }
      case 'crouchWalk': {
        setJ(p, 'thL', -1.0 - s * 0.45, 0, 0.15);
        setJ(p, 'thR', -1.0 + s * 0.45, 0, -0.15);
        setJ(p, 'knL', 1.6 + Math.max(0, c) * 0.4);
        setJ(p, 'knR', 1.6 + Math.max(0, -c) * 0.4);
        setJ(p, 'ftL', -0.6);
        setJ(p, 'ftR', -0.6);
        setJ(p, 'chest', 0.4, -s * 0.1, 0);
        setJ(p, 'spine', 0.2);
        setJ(p, 'head', -0.5);
        setJ(p, 'shL', -0.6 + s * 0.3, 0, 0.2);
        setJ(p, 'shR', -0.6 - s * 0.3, 0, -0.2);
        setJ(p, 'elL', -1.2);
        setJ(p, 'elR', -1.2);
        p[X_HIPY] = -0.4 - Math.abs(c) * 0.03;
        break;
      }
      case 'jump': {
        setJ(p, 'thL', -1.0, 0, 0.1);
        setJ(p, 'knL', 1.4);
        setJ(p, 'thR', -0.2, 0, -0.1);
        setJ(p, 'knR', 0.9);
        setJ(p, 'ftL', 0.3);
        setJ(p, 'ftR', 0.4);
        setJ(p, 'shL', -2.3, 0, 0.3);
        setJ(p, 'shR', 0.6, 0, -0.4);
        setJ(p, 'elL', -0.4);
        setJ(p, 'elR', -0.6);
        setJ(p, 'chest', -0.08);
        setJ(p, 'head', -0.2);
        break;
      }
      case 'fall': {
        const f = Math.sin(t * 9) * 0.25;
        setJ(p, 'thL', -0.5 + f * 0.5, 0, 0.15);
        setJ(p, 'knL', 0.8);
        setJ(p, 'thR', -0.1 - f * 0.5, 0, -0.15);
        setJ(p, 'knR', 0.6);
        setJ(p, 'shL', -0.6 + f, 0, 1.3);
        setJ(p, 'shR', -0.6 - f, 0, -1.3);
        setJ(p, 'elL', -0.5);
        setJ(p, 'elR', -0.5);
        setJ(p, 'chest', 0.1);
        setJ(p, 'head', 0.15);
        break;
      }
      case 'drive': {
        setJ(p, 'thL', -1.45, 0, 0.12);
        setJ(p, 'thR', -1.45, 0, -0.12);
        setJ(p, 'knL', 1.3);
        setJ(p, 'knR', 1.3);
        setJ(p, 'shL', -1.1, 0, 0.15);
        setJ(p, 'shR', -1.1, 0, -0.15);
        setJ(p, 'elL', -0.5);
        setJ(p, 'elR', -0.5);
        setJ(p, 'chest', -0.1, (prm.turn ?? 0) * 0.2, 0);
        setJ(p, 'head', 0, (prm.turn ?? 0) * 0.3, 0);
        p[X_HIPY] = -0.5;
        break;
      }
      case 'aim': {
        setJ(p, 'shL', -1.55, 0, -0.05);
        setJ(p, 'shR', -1.5, 0, 0.5);
        setJ(p, 'elR', -2.2);
        setJ(p, 'chest', 0, 0.85, 0);
        setJ(p, 'head', 0, -0.75, 0);
        setJ(p, 'thL', -0.2, 0, 0.12);
        setJ(p, 'thR', 0.1, 0, -0.15);
        setJ(p, 'knL', 0.2);
        setJ(p, 'knR', 0.1);
        p[X_HIPY] = -0.03;
        break;
      }
    }
  }

  update(dt: number, prm: AnimParams) {
    this.time += dt;
    const sp = prm.speed;
    // Target locomotion weights
    const w: Record<Loco, number> = { idle: 0, walk: 0, run: 0, sprint: 0, crouch: 0, crouchWalk: 0, jump: 0, fall: 0, drive: 0, aim: 0 };
    if (prm.drive) w.drive = 1;
    else if (!prm.grounded) {
      if (prm.vy > 1.5) w.jump = 1;
      else w.fall = 1;
    } else if (prm.crouch) {
      const k = Math.min(1, sp / 1.5);
      w.crouch = 1 - k;
      w.crouchWalk = k;
    } else {
      if (sp < 0.2) w.idle = 1;
      else if (sp < 3) {
        const k = sp / 3;
        w.idle = 1 - k;
        w.walk = k;
      } else if (sp < 7) {
        const k = Math.min(1, (sp - 3) / 2.6);
        w.walk = 1 - k;
        w.run = k;
      } else {
        const k = Math.min(1, (sp - 7) / 2);
        w.run = 1 - k;
        w.sprint = k;
      }
    }
    if (prm.aim && !prm.drive) {
      for (const l of LOCOS) w[l] *= 0.35;
      w.aim = 0.65;
    }
    const wl = dampT(12, dt);
    let total = 0;
    for (const l of LOCOS) {
      this.weights[l] += (w[l] - this.weights[l]) * wl;
      total += this.weights[l];
    }

    // Phase advance: stride length depends on gait
    const stride = (prm.crouch ? 0.9 : sp > 7 ? 2.9 : sp > 3 ? 2.3 : 1.5) * (prm.stride ?? 1);
    if (prm.grounded) this.phase += (sp / stride) * Math.PI * dt;
    // Footstep detection
    const stepPh = Math.floor(this.phase / Math.PI);
    if (stepPh !== this.lastStepPhase) {
      this.lastStepPhase = stepPh;
      if (prm.grounded && sp > 1 && !prm.drive) this.onStep?.((stepPh & 1) as 0 | 1);
    }

    // Blend locomotion
    this.loco.fill(0);
    for (const l of LOCOS) {
      const wt = this.weights[l] / (total || 1);
      if (wt < 0.001) continue;
      this.locoPose(l, this.tmp, prm);
      for (let i = 0; i < SIZE; i++) this.loco[i] += this.tmp[i] * wt;
    }
    this.target.set(this.loco);

    // Lean into turns / acceleration
    this.lean += ((prm.turn ?? 0) * Math.min(1, sp / 6) - this.lean) * dampT(6, dt);
    const ci = JI.chest * 3;
    this.target[ci + 2] += -this.lean * 0.25;
    this.target[JI.hips * 3 + 2] += -this.lean * 0.12;
    // Whole-body forward lean that grows with running speed
    const fwd = prm.grounded && !prm.crouch && !prm.drive && !prm.aim ? Math.min(1, sp / 9.5) * 0.16 : 0;
    this.fwdLean += (fwd - this.fwdLean) * dampT(8, dt);
    this.target[X_PITCH] += this.fwdLean;

    // Previous action fade (cross-fade between actions)
    if (this.prevAction) {
      const pa = this.prevAction;
      pa.w -= dt / 0.12;
      pa.t += dt;
      if (pa.w <= 0) this.prevAction = null;
      else {
        const tn = Math.min(1, pa.t / pa.def.dur);
        for (const tr of pa.tracks) this.target[tr.idx] += (sampleTrack(tr, tn) - this.target[tr.idx]) * pa.w;
      }
    }

    // Current action layer
    if (this.action) {
      const a = this.action;
      const { def, tracks } = compile(a.name);
      a.t += dt * a.speed;
      let tn = a.t / def.dur;
      if (def.hit && a.onHit) {
        while (a.hitsDone < def.hit.length && tn >= def.hit[a.hitsDone]) {
          a.onHit(a.hitsDone);
          a.hitsDone++;
        }
      }
      if (tn >= 1) {
        if (def.loop) {
          a.t = 0;
          a.hitsDone = 0;
          tn = 0;
        } else if (def.hold && !a.fadingOut) tn = 1;
        else if (!a.fadingOut) {
          a.fadingOut = true;
          a.onEnd?.();
        }
      }
      const fi = def.fadeIn ?? 0.07, fo = def.fadeOut ?? 0.12;
      if (a.fadingOut) a.w -= dt / fo;
      else a.w = Math.min(1, a.w + dt / fi);
      if (a.fadingOut && a.w <= 0) this.action = null;
      else {
        const aw = smoothstep(0, 1, a.w);
        tn = Math.min(1, tn);
        for (const tr of tracks) this.target[tr.idx] += (sampleTrack(tr, tn) - this.target[tr.idx]) * aw;
      }
    }

    // Landing spring (additive)
    this.landVel += (-this.landDip * 180 - this.landVel * 16) * dt;
    this.landDip += this.landVel * dt;
    this.target[X_HIPY] += Math.min(0, this.landDip);
    const kl = Math.min(0, this.landDip) * -3;
    this.target[JI.thL * 3] -= kl;
    this.target[JI.thR * 3] -= kl;
    this.target[JI.knL * 3] += kl * 1.8;
    this.target[JI.knR * 3] += kl * 1.8;

    // Smooth towards target and apply
    const k = dampT(this.smoothing, dt);
    for (let i = 0; i < SIZE; i++) {
      // Spin/pitch/rotations with large jumps (roll, whirlwind) follow exactly
      if (i === X_SPIN || (i === JI.hips * 3 && Math.abs(this.target[i] - this.cur[i]) > 1.5)) this.cur[i] = this.target[i];
      else this.cur[i] += (this.target[i] - this.cur[i]) * k;
    }
    const J = this.model.joints;
    for (let j = 0; j < NJ; j++) {
      const o = J[JOINTS[j]];
      o.rotation.set(this.cur[j * 3], this.cur[j * 3 + 1], this.cur[j * 3 + 2]);
    }
    J.hips.position.y = 0.97 + this.cur[X_HIPY];
    J.hips.position.z = this.cur[X_HIPZ];
    J.hips.rotation.y += this.cur[X_SPIN];
    this.model.body.rotation.x = this.cur[X_PITCH];
  }
}

export const ACTION_DURATION = (name: string) => ACTIONS[name]?.dur ?? 0;
