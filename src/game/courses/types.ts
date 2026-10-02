import type { SurfaceId } from '@/config/surfaces';
import type { Vec3 } from '@/utils/math';

/**
 * Bloque orientado (caja). Todo el campo se describe con bloques:
 * suelos planos, rampas (bloques inclinados), paredes y límites.
 */
export interface BlockDef {
  /** Centro de la caja en coordenadas de mundo (m). */
  center: Vec3;
  /** Tamaño completo (ancho X, alto Y, largo Z). */
  size: Vec3;
  /** Rotación Euler XYZ en radianes (rampas, paredes en diagonal). */
  rotation?: Vec3;
  surface: SurfaceId;
}

export interface HoleDef {
  /** Centro de la copa a la altura de la superficie del green. */
  position: Vec3;
}

export interface DecorationDef {
  kind: 'tree' | 'bush' | 'rock' | 'flower';
  position: Vec3;
  scale?: number;
}

export interface CourseLighting {
  sunDirection: Vec3;
  sunIntensity: number;
  ambientIntensity: number;
}

/** Definición de un hoyo/campo como datos puros: añadir mapas no requiere tocar el motor. */
export interface CourseData {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  par: number;
  /** Puntos de salida (centro de la bola apoyada). Hasta 20 jugadores comparten salida. */
  spawnPoints: Vec3[];
  hole: HoleDef;
  /** Superficies jugables (green, arena, rampas...). */
  surfaces: BlockDef[];
  walls: BlockDef[];
  /** Terreno fuera del recorrido (colisiona y cuenta como fuera de límites). */
  outOfBounds: BlockDef[];
  boundaries: {
    /** Altura absoluta bajo la cual la bola se considera perdida. */
    killY: number;
    /** Caja que encierra el recorrido (para cámara y validación). */
    min: Vec3;
    max: Vec3;
  };
  decorations: DecorationDef[];
  lighting: CourseLighting;
}
