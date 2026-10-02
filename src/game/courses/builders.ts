import type { SurfaceId } from '@/config/surfaces';
import type { BlockDef } from './types';

/**
 * Ayudas para describir cursos de forma compacta. Generan BlockDef puros:
 * son la base del futuro editor de niveles (colocar suelos, paredes, rampas).
 */
export const FLOOR_THICKNESS = 0.4;
export const WALL_HEIGHT = 0.42;
export const WALL_THICKNESS = 0.28;

/** Suelo plano cuya cara superior queda a `topY`. Rectángulo [x0,x1]×[z0,z1]. */
export function floor(x0: number, z0: number, x1: number, z1: number, topY = 0, surface: SurfaceId = 'green'): BlockDef {
  return {
    center: { x: (x0 + x1) / 2, y: topY - FLOOR_THICKNESS / 2, z: (z0 + z1) / 2 },
    size: { x: Math.abs(x1 - x0), y: FLOOR_THICKNESS, z: Math.abs(z1 - z0) },
    surface,
  };
}

/** Pared recta entre dos puntos del plano XZ, apoyada sobre `baseY`. */
export function wall(ax: number, az: number, bx: number, bz: number, baseY = 0, height = WALL_HEIGHT): BlockDef {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) + WALL_THICKNESS;
  return {
    center: { x: (ax + bx) / 2, y: baseY + height / 2 - 0.05, z: (az + bz) / 2 },
    size: { x: WALL_THICKNESS, y: height + 0.1, z: len },
    rotation: { x: 0, y: Math.atan2(dx, dz), z: 0 },
    surface: 'wall',
  };
}

/** Rodea un rectángulo con paredes. */
export function boxWalls(x0: number, z0: number, x1: number, z1: number, baseY = 0): BlockDef[] {
  return [wall(x0, z0, x1, z0, baseY), wall(x1, z0, x1, z1, baseY), wall(x1, z1, x0, z1, baseY), wall(x0, z1, x0, z0, baseY)];
}

/**
 * Rampa a lo largo del eje Z entre zStart (altura yStart) y zEnd (altura yEnd).
 * Es un bloque inclinado: la pendiente la resuelve la física, no un script.
 */
export function rampZ(x0: number, x1: number, zStart: number, yStart: number, zEnd: number, yEnd: number, surface: SurfaceId = 'green'): BlockDef {
  const dz = zEnd - zStart;
  const dy = yEnd - yStart;
  const len = Math.hypot(dz, dy);
  const angle = Math.atan2(dy, dz);
  // Normal de la cara superior rotada: desplazamos el centro media altura hacia abajo.
  const ny = Math.cos(angle);
  const nz = -Math.sin(angle);
  return {
    center: {
      x: (x0 + x1) / 2,
      y: (yStart + yEnd) / 2 - (ny * FLOOR_THICKNESS) / 2,
      z: (zStart + zEnd) / 2 - (nz * FLOOR_THICKNESS) / 2,
    },
    size: { x: Math.abs(x1 - x0), y: FLOOR_THICKNESS, z: len },
    rotation: { x: -angle, y: 0, z: 0 },
    surface,
  };
}
