import { PhysicsConfig } from '@/config/physics';
import type { BlockDef, CourseData } from './types';

const top = (b: BlockDef) => b.center.y + b.size.y / 2;
const flat = (b: BlockDef) => !b.quat && !(b.rotation && (b.rotation.x || b.rotation.y || b.rotation.z));
const covers = (b: BlockDef, x: number, z: number) =>
  Math.abs(x - b.center.x) <= b.size.x / 2 && Math.abs(z - b.center.z) <= b.size.z / 2;

/**
 * Valida un curso definido por datos (útil para el futuro editor). Devuelve la
 * lista de problemas encontrados; vacía = curso válido.
 */
export function validateCourse(c: CourseData): string[] {
  const errors: string[] = [];
  const R = PhysicsConfig.ball.radius;
  if (!c.id || !c.name) errors.push('id y nombre obligatorios');
  if (c.par < 1 || c.par > 10) errors.push(`par fuera de rango: ${c.par}`);
  if (!c.spawnPoints.length) errors.push('sin puntos de salida');
  const playable = c.surfaces.filter((b) => b.surface !== 'water');

  for (const [i, s] of c.spawnPoints.entries()) {
    const under = playable.find((b) => flat(b) && covers(b, s.x, s.z) && Math.abs(top(b) + R - s.y) < 0.01);
    if (!under) errors.push(`salida ${i} no está apoyada sobre una superficie plana jugable`);
  }
  const h = c.hole.position;
  const holeBlocks = playable.filter((b) => flat(b) && covers(b, h.x, h.z) && Math.abs(top(b) - h.y) < 1e-3);
  if (holeBlocks.length !== 1) errors.push(`el hoyo debe estar sobre exactamente un bloque plano (encontrados: ${holeBlocks.length})`);
  else {
    const b = holeBlocks[0]!;
    const margin = PhysicsConfig.hole.radius + 0.05;
    if (Math.abs(h.x - b.center.x) > b.size.x / 2 - margin || Math.abs(h.z - b.center.z) > b.size.z / 2 - margin) {
      errors.push('el hoyo está demasiado cerca del borde de su bloque');
    }
  }
  const ids = new Set<string>();
  for (const o of c.obstacles) {
    if (ids.has(o.id)) errors.push(`id de obstáculo duplicado: ${o.id}`);
    ids.add(o.id);
    if (o.kind === 'slider' && o.period <= 0) errors.push(`${o.id}: periodo inválido`);
  }
  if (c.guide.length < 2) errors.push('la guía necesita al menos salida y hoyo');
  if (c.boundaries.killY >= Math.min(...c.surfaces.map(top))) errors.push('killY debe estar por debajo del recorrido');
  return errors;
}
