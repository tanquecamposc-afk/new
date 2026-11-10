/**
 * One tick of player intent. The client (or a bot brain) fills this in; the simulation validates
 * and clamps everything before using it — an InputFrame never carries outcomes such as damage.
 */
import { clamp, isFiniteNumber, wrapAngle } from './math.js';
import { DEFAULT_CAMERA } from './config.js';

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
}

export function neutralInput(seq = 0, yaw = 0, pitch = 0): InputFrame {
  return { seq, moveX: 0, moveZ: 0, yaw, pitch, jump: false, sprint: false, crouch: false };
}

/** Returns a safe copy: finite numbers, clamped axes, wrapped yaw, clamped pitch. */
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
  return out;
}
