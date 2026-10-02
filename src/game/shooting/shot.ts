import { InputConfig } from '@/config/input';
import { PhysicsConfig } from '@/config/physics';
import type { PlayerState } from '@/game/core/playerState';
import { clamp, type Vec3 } from '@/utils/math';

/** Intención de tiro: dirección unitaria en el plano XZ y potencia normalizada [0,1]. */
export interface ShotInput {
  direction: { x: number; z: number };
  power: number;
}

/**
 * Convierte un arrastre en un tiro. El jugador arrastra HACIA ATRÁS: la bola
 * sale en dirección opuesta al puntero (ball - pointer), como un tirachinas.
 * Devuelve null si el arrastre es demasiado corto para orientar el tiro.
 */
export function computeShotFromDrag(
  ball: Vec3,
  pointer: Vec3,
  maxDragDistance: number = InputConfig.maxDragDistance,
  sensitivity: number = InputConfig.sensitivity,
): ShotInput | null {
  const dx = ball.x - pointer.x;
  const dz = ball.z - pointer.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) return null;
  const power = clamp((dist * sensitivity) / maxDragDistance, 0, 1);
  return { direction: { x: dx / dist, z: dz / dist }, power };
}

export type ShotRejection =
  | 'invalid_state'
  | 'invalid_direction'
  | 'power_too_low'
  | 'power_out_of_range'
  | 'too_many_shots'
  | 'rate_limited';

export interface ShotValidationContext {
  state: PlayerState;
  ballMoving: boolean;
  shotsTaken: number;
  maxShots: number;
  /** Tiempo de simulación (s) desde el último tiro. */
  sinceLastShot: number;
  minShotInterval?: number;
}

/**
 * Validación de un tiro. Se usa en cliente y está pensada para ejecutarse en
 * el servidor autoritativo (Phase 5): nunca se confía en el cliente.
 */
export function validateShot(shot: ShotInput, ctx: ShotValidationContext): { ok: true } | { ok: false; reason: ShotRejection } {
  if (ctx.ballMoving || (ctx.state !== 'AIMING' && ctx.state !== 'IDLE')) return { ok: false, reason: 'invalid_state' };
  if (ctx.shotsTaken >= ctx.maxShots) return { ok: false, reason: 'too_many_shots' };
  if (ctx.sinceLastShot < (ctx.minShotInterval ?? 0.25)) return { ok: false, reason: 'rate_limited' };
  const { x, z } = shot.direction;
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(Math.hypot(x, z) - 1) > 1e-3) {
    return { ok: false, reason: 'invalid_direction' };
  }
  if (!Number.isFinite(shot.power) || shot.power > 1 || shot.power < 0) return { ok: false, reason: 'power_out_of_range' };
  if (shot.power < PhysicsConfig.shot.minPower) return { ok: false, reason: 'power_too_low' };
  return { ok: true };
}

/** Zona del indicador de potencia: segura → peligrosa (blanco → rojo). */
export function powerZone(power: number): 'safe' | 'danger' {
  return power >= PhysicsConfig.shot.dangerPower ? 'danger' : 'safe';
}

/**
 * Convierte un arrastre en píxeles de pantalla en un tiro, usando la base de
 * la cámara proyectada en el suelo. Arrastrar hacia abajo (hacia la cámara)
 * dispara hacia delante. La potencia depende sólo de la longitud del arrastre
 * en pantalla, así se siente igual con cualquier zoom, inclinación o dispositivo.
 */
export function computeShotFromScreenDrag(
  drag: { x: number; y: number },
  basis: { forward: { x: number; z: number }; right: { x: number; z: number } },
  maxDragPx: number,
  sensitivity: number = InputConfig.sensitivity,
): ShotInput | null {
  const len = Math.hypot(drag.x, drag.y);
  if (len < 1e-3 || maxDragPx <= 0) return null;
  // Vector de arrastre en el mundo: derecha·dx − adelante·dy. El tiro va en sentido contrario.
  const wx = basis.right.x * drag.x - basis.forward.x * drag.y;
  const wz = basis.right.z * drag.x - basis.forward.z * drag.y;
  const wl = Math.hypot(wx, wz);
  if (wl < 1e-6) return null;
  const power = clamp((len * sensitivity) / maxDragPx, 0, 1);
  return { direction: { x: -wx / wl, z: -wz / wl }, power };
}

/** Arrastre máximo en px según el tamaño de la pantalla (táctil y escritorio equivalentes). */
export function maxDragPixels(viewportW: number, viewportH: number): number {
  return Math.max(120, Math.min(viewportW, viewportH) * 0.38);
}
