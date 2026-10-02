/**
 * SurfaceConfig — tabla central de superficies. Valores de tuning propios
 * (no son valores oficiales del juego de referencia).
 */
export type HazardType = 'none' | 'water' | 'out_of_bounds';

export interface SurfaceConfig {
  /** Fricción de contacto de Rapier (agarre bola-superficie). */
  friction: number;
  restitution: number;
  /** Deceleración por rodadura (m/s²) mientras la bola toca la superficie. */
  rollingResistance: number;
  /** Multiplicador de velocidad aplicado por segundo (aceleradores > 0). */
  accelerationModifier: number;
  /** Multiplicador del umbral de parada. */
  stopThreshold: number;
  hazardType: HazardType;
  /** Color base del render. */
  color: number;
}

export type SurfaceId = 'green' | 'fringe' | 'sand' | 'wall' | 'wood' | 'stone' | 'water' | 'rough' | 'booster' | 'bumper';

export const SURFACES: Record<SurfaceId, SurfaceConfig> = {
  green: { friction: 0.8, restitution: 0.1, rollingResistance: 1.45, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0x4cc35a },
  fringe: { friction: 0.9, restitution: 0.1, rollingResistance: 2.6, accelerationModifier: 0, stopThreshold: 1.2, hazardType: 'none', color: 0x3aa04a },
  sand: { friction: 1, restitution: 0.02, rollingResistance: 7.5, accelerationModifier: 0, stopThreshold: 1.6, hazardType: 'none', color: 0xe8cf8a },
  wall: { friction: 0.2, restitution: 0.72, rollingResistance: 0, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0xf4f1ea },
  wood: { friction: 0.4, restitution: 0.55, rollingResistance: 1.6, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0xb9814b },
  stone: { friction: 0.5, restitution: 0.4, rollingResistance: 1.5, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0x9aa3ad },
  /** Terreno fuera del recorrido: tocarlo es "fuera de límites". */
  rough: { friction: 0.9, restitution: 0.15, rollingResistance: 6, accelerationModifier: 0, stopThreshold: 1, hazardType: 'out_of_bounds', color: 0x6dbb4f },
  /** Acelerador: la dirección y la fuerza van en el bloque (BlockDef.boost). */
  booster: { friction: 0.7, restitution: 0.1, rollingResistance: 0.6, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0xff8a2a },
  /** Bumper: rebote vivo (restitución alta). */
  bumper: { friction: 0.2, restitution: 1.05, rollingResistance: 0, accelerationModifier: 0, stopThreshold: 1, hazardType: 'none', color: 0xff4f8b },
  water: { friction: 0, restitution: 0, rollingResistance: 0, accelerationModifier: 0, stopThreshold: 1, hazardType: 'water', color: 0x3fa7e0 },
};
