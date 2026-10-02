import type { Vec3 } from '@/utils/math';

/**
 * Obstáculos definidos como datos. Su estado es una FUNCIÓN PURA del tiempo de
 * simulación (ver poses.ts): servidor y clientes calculan exactamente la misma
 * posición para el mismo tick, sin necesidad de enviarla por red.
 */
export type ObstacleDef = WindmillDef | SliderDef | SpinnerDef | BumperDef;

interface Base {
  id: string;
}

/** Aspas de molino que giran en un plano vertical delante de un túnel. */
export interface WindmillDef extends Base {
  kind: 'windmill';
  /** Centro del eje de las aspas. */
  hub: Vec3;
  /** Orientación (rad, eje Y): las aspas giran en el plano perpendicular a esta dirección. */
  yaw: number;
  blades: number;
  bladeLength: number;
  bladeWidth: number;
  bladeThickness: number;
  /** rad/s (positivo = antihorario visto de frente). */
  angularSpeed: number;
  phase: number;
}

/** Barrera que se desliza de lado a lado (movimiento sinusoidal). */
export interface SliderDef extends Base {
  kind: 'slider';
  center: Vec3;
  /** Tamaño en el marco local, cuyo eje Z es `axis` (z = largo en la dirección del movimiento). */
  size: Vec3;
  /** Dirección de desplazamiento en XZ (unitaria). */
  axis: { x: number; z: number };
  amplitude: number;
  /** Periodo completo (s). */
  period: number;
  /** Desfase (0..1 del periodo). */
  phase: number;
}

/** Barra horizontal que gira sobre el eje Y. */
export interface SpinnerDef extends Base {
  kind: 'spinner';
  center: Vec3;
  length: number;
  height: number;
  thickness: number;
  angularSpeed: number;
  phase: number;
}

/** Seta/bumper estático que devuelve la bola con fuerza. */
export interface BumperDef extends Base {
  kind: 'bumper';
  center: Vec3;
  radius: number;
  height: number;
}

export interface Pose {
  position: Vec3;
  /** Cuaternión. */
  rotation: { x: number; y: number; z: number; w: number };
}
