import type { CourseData } from '@/game/courses/types';
import type { Vec3 } from '@/utils/math';

/** Distancia restante por la guía desde p (proyección sobre la polilínea). */
export function guideCost(course: CourseData, p: Vec3): number {
  const g = course.guide;
  let best = Infinity;
  let tail = 0;
  const lens: number[] = [];
  for (let i = 0; i < g.length - 1; i++) lens.push(Math.hypot(g[i + 1]!.x - g[i]!.x, g[i + 1]!.z - g[i]!.z));
  for (let i = g.length - 2; i >= 0; i--) {
    const a = g[i]!;
    const b = g[i + 1]!;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const l2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2));
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const off = Math.hypot(p.x - px, p.z - pz);
    const cost = off * 1.5 + (1 - t) * lens[i]! + tail;
    best = Math.min(best, cost);
    tail += lens[i]!;
  }
  return best;
}


/** Siguientes puntos de la guía por delante de `p` (el último siempre es el hoyo). */
export function upcomingGuidePoints(course: CourseData, p: Vec3, count = 2): Vec3[] {
  const g = course.guide;
  let bestSeg = 0;
  let bestD = Infinity;
  for (let i = 0; i < g.length - 1; i++) {
    const a = g[i]!;
    const b = g[i + 1]!;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const l2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2));
    const d = Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
    if (d <= bestD + 1e-6) {
      bestD = d;
      bestSeg = i;
    }
  }
  return g.slice(bestSeg + 1, bestSeg + 1 + count);
}
