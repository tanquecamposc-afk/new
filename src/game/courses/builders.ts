import { PhysicsConfig } from '@/config/physics';
import type { SurfaceId } from '@/config/surfaces';
import type { WindmillDef } from '@/game/obstacles/types';
import { axisAngle, mulQuat, type Vec3 } from '@/utils/math';
import type { BlockDef, CourseData, DecorationDef } from './types';

/**
 * Ayudas para describir cursos de forma compacta. Generan datos puros
 * (BlockDef, ObstacleDef): son la base del editor de niveles — colocar suelos,
 * rampas, paredes, hoyos, obstáculos y puntos de salida sin tocar el motor.
 */
export const FLOOR_THICKNESS = 0.4;
export const WALL_HEIGHT = 0.42;
export const WALL_THICKNESS = 0.28;
export const BALL_Y = PhysicsConfig.ball.radius;

/** Suelo plano cuya cara superior queda a `topY`. Rectángulo [x0,x1]×[z0,z1]. */
export function floor(x0: number, z0: number, x1: number, z1: number, topY = 0, surface: SurfaceId = 'green'): BlockDef {
  return {
    center: { x: (x0 + x1) / 2, y: topY - FLOOR_THICKNESS / 2, z: (z0 + z1) / 2 },
    size: { x: Math.abs(x1 - x0), y: FLOOR_THICKNESS, z: Math.abs(z1 - z0) },
    surface,
  };
}

/** Zona aceleradora rectangular. */
export function booster(x0: number, z0: number, x1: number, z1: number, dir: { x: number; z: number }, accel = 6, maxSpeed = 7, topY = 0): BlockDef {
  const l = Math.hypot(dir.x, dir.z);
  return { ...floor(x0, z0, x1, z1, topY, 'booster'), boost: { direction: { x: dir.x / l, z: dir.z / l }, accel, maxSpeed } };
}

/** Pared recta entre dos puntos del plano XZ, apoyada sobre `baseY`. */
export function wall(ax: number, az: number, bx: number, bz: number, baseY = 0, height = WALL_HEIGHT, surface: SurfaceId = 'wall'): BlockDef {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) + WALL_THICKNESS;
  return {
    center: { x: (ax + bx) / 2, y: baseY + height / 2 - 0.05, z: (az + bz) / 2 },
    size: { x: WALL_THICKNESS, y: height + 0.1, z: len },
    rotation: { x: 0, y: Math.atan2(dx, dz), z: 0 },
    surface,
  };
}

/** Paredes siguiendo una polilínea [x, z][] (cerrada por defecto). */
export function polyWalls(points: [number, number][], closed = true, baseY = 0, height = WALL_HEIGHT): BlockDef[] {
  const out: BlockDef[] = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    out.push(wall(a[0], a[1], b[0], b[1], baseY, height));
  }
  return out;
}

/** Rodea un rectángulo con paredes. */
export function boxWalls(x0: number, z0: number, x1: number, z1: number, baseY = 0, height = WALL_HEIGHT): BlockDef[] {
  return polyWalls(
    [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ],
    true,
    baseY,
    height,
  );
}

/**
 * Rampa entre dos puntos (x, y, z) del eje central, de ancho `width`, en
 * cualquier dirección. Es un bloque inclinado: la pendiente la resuelve la
 * física (gravedad + contacto), no un script.
 */
export function ramp(from: Vec3, to: Vec3, width: number, surface: SurfaceId = 'green'): BlockDef {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const horiz = Math.hypot(dx, dz);
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, horiz);
  const yaw = Math.atan2(dx, dz);
  // Primero inclinación (eje X local), después orientación (eje Y).
  const quat = mulQuat(axisAngle(0, 1, 0, yaw), axisAngle(1, 0, 0, -angle));
  const normal = { x: -Math.sin(angle) * Math.sin(yaw), y: Math.cos(angle), z: -Math.sin(angle) * Math.cos(yaw) };
  const h = FLOOR_THICKNESS / 2;
  return {
    center: { x: (from.x + to.x) / 2 - normal.x * h, y: (from.y + to.y) / 2 - normal.y * h, z: (from.z + to.z) / 2 - normal.z * h },
    size: { x: width, y: FLOOR_THICKNESS, z: Math.hypot(horiz, dy) },
    quat,
    surface,
  };
}

/** Rampa a lo largo del eje Z (atajo de `ramp`). */
export function rampZ(x0: number, x1: number, zStart: number, yStart: number, zEnd: number, yEnd: number, surface: SurfaceId = 'green'): BlockDef {
  const cx = (x0 + x1) / 2;
  return ramp({ x: cx, y: yStart, z: zStart }, { x: cx, y: yEnd, z: zEnd }, Math.abs(x1 - x0), surface);
}

/**
 * Molino: edificio que cruza la calle con un túnel central y aspas giratorias
 * delante del túnel (lado +Z, hacia la salida). Devuelve las paredes del
 * edificio y el obstáculo dinámico de las aspas.
 */
export function windmill(
  id: string,
  cx: number,
  cz: number,
  laneX0: number,
  laneX1: number,
  opts: { tunnelWidth?: number; tunnelHeight?: number; angularSpeed?: number; blades?: number; phase?: number; baseY?: number } = {},
): { walls: BlockDef[]; obstacle: WindmillDef } {
  const tw = opts.tunnelWidth ?? 1;
  const th = opts.tunnelHeight ?? 0.65;
  const baseY = opts.baseY ?? 0;
  const depth = 1.6;
  const H = 2.4;
  const block = (x0: number, x1: number, y0: number, y1: number): BlockDef => ({
    center: { x: (x0 + x1) / 2, y: baseY + (y0 + y1) / 2, z: cz },
    size: { x: x1 - x0, y: y1 - y0, z: depth },
    surface: 'wood',
  });
  const walls = [block(laneX0, cx - tw / 2, -0.05, H), block(cx + tw / 2, laneX1, -0.05, H), block(cx - tw / 2, cx + tw / 2, th, H)];
  const bladeLength = 1.3;
  const hubY = baseY + 0.05 + bladeLength + 0.1;
  return {
    walls,
    obstacle: {
      id,
      kind: 'windmill',
      hub: { x: cx, y: hubY, z: cz + depth / 2 + 0.2 },
      yaw: 0,
      blades: opts.blades ?? 4,
      bladeLength,
      bladeWidth: 0.55,
      bladeThickness: 0.12,
      angularSpeed: opts.angularSpeed ?? 1.2,
      phase: opts.phase ?? 0,
    },
  };
}

/** Caja que contiene todos los bloques (aprox. por su semidiagonal en XZ). */
export function blocksBounds(blocks: BlockDef[]): { min: Vec3; max: Vec3 } {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const b of blocks) {
    const rx = b.rotation || b.quat ? Math.hypot(b.size.x, b.size.z) / 2 : b.size.x / 2;
    const rz = b.rotation || b.quat ? rx : b.size.z / 2;
    min.x = Math.min(min.x, b.center.x - rx);
    max.x = Math.max(max.x, b.center.x + rx);
    min.z = Math.min(min.z, b.center.z - rz);
    max.z = Math.max(max.z, b.center.z + rz);
    min.y = Math.min(min.y, b.center.y - b.size.y / 2);
    max.y = Math.max(max.y, b.center.y + b.size.y / 2);
  }
  return { min, max };
}

/** Decoración determinista alrededor del recorrido (fuera de los límites, nunca tapa la trayectoria). */
export function scatterDecorations(bounds: { min: Vec3; max: Vec3 }, seed: number, groundY = -0.6, count = 22): DecorationDef[] {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: DecorationDef[] = [];
  const kinds: DecorationDef['kind'][] = ['tree', 'tree', 'bush', 'rock', 'flower', 'tree', 'bush', 'flower'];
  const margin = 2.2;
  for (let i = 0; i < count * 4 && out.length < count; i++) {
    const x = bounds.min.x - 9 + rnd() * (bounds.max.x - bounds.min.x + 18);
    const z = bounds.min.z - 9 + rnd() * (bounds.max.z - bounds.min.z + 18);
    const inside = x > bounds.min.x - margin && x < bounds.max.x + margin && z > bounds.min.z - margin && z < bounds.max.z + margin;
    if (inside) continue;
    out.push({ kind: kinds[Math.floor(rnd() * kinds.length)]!, position: { x, y: groundY, z }, scale: 0.8 + rnd() * 0.6 });
  }
  return out;
}

type CourseInput = Omit<CourseData, 'boundaries' | 'outOfBounds' | 'lighting' | 'decorations' | 'obstacles'> &
  Partial<Pick<CourseData, 'outOfBounds' | 'lighting' | 'decorations' | 'obstacles'>> & { decorationSeed?: number };

/** Completa un curso con valores derivados: límites, terreno exterior, luz y decoración. */
export function defineCourse(input: CourseInput): CourseData {
  const { decorationSeed, ...c } = input;
  const bounds = blocksBounds([...c.surfaces, ...c.walls]);
  const lowest = Math.min(...c.surfaces.map((b) => b.center.y + b.size.y / 2));
  const roughY = lowest - 0.6;
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;
  const ext = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2 + 40;
  return {
    ...c,
    obstacles: c.obstacles ?? [],
    outOfBounds: c.outOfBounds ?? [floor(cx - ext, cz - ext, cx + ext, cz + ext, roughY, 'rough')],
    boundaries: { killY: roughY - 3, min: bounds.min, max: bounds.max },
    lighting: c.lighting ?? { sunDirection: { x: -0.5, y: 1, z: 0.35 }, sunIntensity: 2.4, ambientIntensity: 0.9 },
    decorations: c.decorations ?? scatterDecorations(bounds, decorationSeed ?? 7, roughY),
  };
}
