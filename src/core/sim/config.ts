/**
 * Tunable gameplay numbers. Every value here is an ORIGINAL prototype proposal taken from
 * docs/03-GAMEPLAY_NUMEROS.md (they are not the stats of any existing game) and is meant to be
 * overridden per mode / per ruleset version.
 */

/** Fixed simulation rate. Rendering interpolates between ticks. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const secondsToTicks = (seconds: number): number => Math.round(seconds * TICK_RATE);
export const ticksToSeconds = (ticks: number): number => ticks / TICK_RATE;

export interface MovementConfig {
  /** docs/03 §3.1 */
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;
  jumpVelocity: number;
  gravity: number;
  maxSlopeDegrees: number;
  stepHeight: number;
  fallDamageStartMeters: number;

  /** Feel parameters (original, tuned by playtest). */
  groundAcceleration: number;
  groundDeceleration: number;
  airAcceleration: number;
  /** Max horizontal speed that air control alone can build up. */
  airControlSpeed: number;
  terminalVelocity: number;
  snapDownDistance: number;
  coyoteTicks: number;
  jumpBufferTicks: number;

  radius: number;
  /** Radius used to decide whether a ledge still supports the character. */
  supportRadius: number;
  standHeight: number;
  crouchHeight: number;
  standEyeHeight: number;
  crouchEyeHeight: number;

  slideMinSpeed: number;
  slideStartSpeed: number;
  slideFriction: number;
  slideEndSpeed: number;
  slideMaxTicks: number;
  slideCooldownTicks: number;
  slideSteerRadiansPerSecond: number;

  /** Highest ledge (above the feet) that can be climbed while airborne. */
  mantleMaxReach: number;
  mantleTicks: number;
  /** How far past the wall face the character ends up standing after a climb. */
  mantleForward: number;
}

export const DEFAULT_MOVEMENT: Readonly<MovementConfig> = Object.freeze({
  walkSpeed: 5.0,
  sprintSpeed: 7.0,
  crouchSpeed: 2.5,
  jumpVelocity: 6.2,
  gravity: -18,
  maxSlopeDegrees: 45,
  stepHeight: 0.3,
  fallDamageStartMeters: 8,

  groundAcceleration: 55,
  groundDeceleration: 45,
  airAcceleration: 18,
  airControlSpeed: 5.0,
  terminalVelocity: 50,
  snapDownDistance: 0.35,
  coyoteTicks: 6,
  jumpBufferTicks: 6,

  radius: 0.4,
  supportRadius: 0.22,
  standHeight: 1.8,
  crouchHeight: 1.2,
  standEyeHeight: 1.6,
  crouchEyeHeight: 1.05,

  slideMinSpeed: 6.0,
  slideStartSpeed: 9.0,
  slideFriction: 6.0,
  slideEndSpeed: 3.5,
  slideMaxTicks: 66,
  slideCooldownTicks: 36,
  slideSteerRadiansPerSecond: 1.2,

  mantleMaxReach: 1.5,
  mantleTicks: 22,
  mantleForward: 0.35,
});

export interface CameraConfig {
  /** docs/03 §3.1: third-person distance, default FOV and ADS FOV. */
  distance: number;
  adsDistance: number;
  defaultFovDegrees: number;
  adsFovDegrees: number;
  shoulderOffset: number;
  /** The camera pivot sits this far above the eye so the crosshair clears the shoulder. */
  pivotRaise: number;
  minPitch: number;
  maxPitch: number;
  /** Keeps the camera this far from whatever blocked it. */
  collisionMargin: number;
  minDistance: number;
}

export const DEFAULT_CAMERA: Readonly<CameraConfig> = Object.freeze({
  distance: 4.0,
  adsDistance: 2.2,
  defaultFovDegrees: 75,
  adsFovDegrees: 55,
  shoulderOffset: 0.55,
  pivotRaise: 0.15,
  minPitch: -1.35,
  maxPitch: 1.35,
  collisionMargin: 0.22,
  minDistance: 0.3,
});
