import { course01 } from './course01';
import type { CourseData } from './types';

/** Registro de cursos. Añadir un mapa = añadir un objeto de datos aquí. */
export const COURSES: readonly CourseData[] = [course01];

export function getCourse(id: string): CourseData | undefined {
  return COURSES.find((c) => c.id === id);
}

export type { CourseData, BlockDef, HoleDef, DecorationDef } from './types';
