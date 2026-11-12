/**
 * One tick of player intent. The client (or a bot brain) fills this in; the simulation validates
 * and clamps everything before using it — an InputFrame never carries outcomes such as damage,
 * ammunition or a hit: it only says what the player is trying to do.
 */
import { clamp, isFiniteNumber, wrapAngle } from './math.js';
import { DEFAULT_CAMERA } from './config.js';

/** Value of `InputFrame.slot` meaning "keep the current slot". */
export const NO_SLOT = -1;
/** Highest slot index an input may ask for (the inventory decides whether it is usable). */
const MAX_SLOT_INDEX = 4;

export interface InputFrame {
  /** Monotonic sequence number, used later for server reconciliation. */
  seq: number;
  /** Strafe, -1 (left) .. 1 (right), relative to `yaw`. */
  moveX: number;
  /** Forward, -1 (back) .. 1 (forward), relative to `yaw`. */
  moveZ: number;
  yaw: number;
  pitch: number;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  /** Trigger held: fires the weapon or starts using the selected consumable. */
  fire: boolean;
  /** Aim down sights. */
  ads: boolean;
  reload: boolean;
  /** Pick up the nearest item. */
  interact: boolean;
  /** Inventory slot to select (0-4), or NO_SLOT. */
  slot: number;
}

export function neutralInput(seq = 0, yaw = 0, pitch = 0): InputFrame {
  return {
    seq,
    moveX: 0,
    moveZ: 0,
    yaw,
    pitch,
    jump: false,
    sprint: false,
    crouch: false,
    fire: false,
    ads: false,
    reload: false,
    interact: false,
    slot: NO_SLOT,
  };
}

/** Releases every button and stick but keeps the look direction. */
export function releaseInput(input: InputFrame): void {
  input.moveX = 0;
  input.moveZ = 0;
  input.jump = false;
  input.sprint = false;
  input.crouch = false;
  input.fire = false;
  input.ads = false;
  input.reload = false;
  input.interact = false;
  input.slot = NO_SLOT;
}

/** Returns a safe copy: finite numbers, clamped axes, wrapped yaw, clamped pitch, real booleans. */
export function sanitizeInput(raw: InputFrame, out: InputFrame = neutralInput()): InputFrame {
  out.seq = isFiniteNumber(raw.seq) ? Math.max(0, Math.floor(raw.seq)) : 0;
  let moveX = isFiniteNumber(raw.moveX) ? clamp(raw.moveX, -1, 1) : 0;
  let moveZ = isFiniteNumber(raw.moveZ) ? clamp(raw.moveZ, -1, 1) : 0;
  const length = Math.hypot(moveX, moveZ);
  if (length > 1) {
    moveX /= length;
    moveZ /= length;
  }
  out.moveX = moveX;
  out.moveZ = moveZ;
  out.yaw = isFiniteNumber(raw.yaw) ? wrapAngle(raw.yaw) : 0;
  out.pitch = isFiniteNumber(raw.pitch) ? clamp(raw.pitch, DEFAULT_CAMERA.minPitch, DEFAULT_CAMERA.maxPitch) : 0;
  out.jump = raw.jump === true;
  out.sprint = raw.sprint === true;
  out.crouch = raw.crouch === true;
  out.fire = raw.fire === true;
  out.ads = raw.ads === true;
  out.reload = raw.reload === true;
  out.interact = raw.interact === true;
  out.slot = Number.isInteger(raw.slot) && raw.slot >= 0 && raw.slot <= MAX_SLOT_INDEX ? raw.slot : NO_SLOT;
  return out;
}
