import { course01 } from './course01';
import { course02 } from './course02';
import { course03 } from './course03';
import { course04 } from './course04';
import { course05 } from './course05';
import { course06 } from './course06';
import type { CourseData } from './types';

/** Registro de cursos. Añadir un mapa = añadir un objeto de datos aquí. */
export const COURSES: readonly CourseData[] = [course01, course02, course03, course04, course05, course06];

export function getCourse(id: string): CourseData | undefined {
  return COURSES.find((c) => c.id === id);
}

export type { CourseData, BlockDef, HoleDef, DecorationDef } from './types';
