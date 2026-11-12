/**
 * Hit zones of a character and the ray tests against them. A character is a body cylinder with a
 * head sphere on top; both scale with the current stance, so crouching really makes the target
 * smaller. The renderer draws the avatar inside these same volumes.
 */

export interface HitZoneConfig {
  bodyRadius: number;
  headRadius: number;
  /** The body cylinder ends this far above the bottom of the head sphere. */
  neckOverlap: number;
}

export const HIT_ZONES: Readonly<HitZoneConfig> = Object.freeze({
  bodyRadius: 0.34,
  headRadius: 0.2,
  neckOverlap: 0.04,
});

export type HitZone = 'head' | 'body';

export interface CharacterHit {
  t: number;
  zone: HitZone;
}

export function makeCharacterHit(): CharacterHit {
  return { t: 0, zone: 'body' };
}

/** Anything with a feet position and a collision height can be shot. */
export interface HitTarget {
  x: number;
  y: number;
  z: number;
  height: number;
}

/** Height above the feet of the centre of the head sphere. */
export function headCenterHeight(height: number, zones: HitZoneConfig = HIT_ZONES): number {
  return height - zones.headRadius;
}

/** Height above the feet at which the body cylinder ends. */
export function bodyTopHeight(height: number, zones: HitZoneConfig = HIT_ZONES): number {
  return height - zones.headRadius * 2 + zones.neckOverlap;
}

function raySphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  maxT: number,
): number {
  const px = ox - cx;
  const py = oy - cy;
  const pz = oz - cz;
  const b = px * dx + py * dy + pz * dz;
  const c = px * px + py * py + pz * pz - radius * radius;
  if (c <= 0) return 0; // origin inside
  if (b >= 0) return -1; // pointing away
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t >= 0 && t <= maxT ? t : -1;
}

function rayCappedCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  radius: number,
  minY: number,
  maxY: number,
  maxT: number,
): number {
  const px = ox - cx;
  const pz = oz - cz;
  const r2 = radius * radius;
  const insideRadius = px * px + pz * pz <= r2;
  if (insideRadius && oy >= minY && oy <= maxY) return 0;

  const a = dx * dx + dz * dz;
  if (a > 1e-12) {
    const b = px * dx + pz * dz;
    const disc = b * b - a * (px * px + pz * pz - r2);
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t0 = (-b - sq) / a;
    if ((-b + sq) / a < 0) return -1;
    if (t0 >= 0 && t0 <= maxT) {
      const y = oy + dy * t0;
      if (y >= minY && y <= maxY) return t0;
    }
  } else if (!insideRadius) {
    return -1;
  }

  // Caps: entering through the top (from above) or the bottom (from below).
  if (dy < -1e-12 && oy > maxY) {
    const t = (maxY - oy) / dy;
    const hx = px + dx * t;
    const hz = pz + dz * t;
    if (t <= maxT && hx * hx + hz * hz <= r2) return t;
  } else if (dy > 1e-12 && oy < minY) {
    const t = (minY - oy) / dy;
    const hx = px + dx * t;
    const hz = pz + dz * t;
    if (t <= maxT && hx * hx + hz * hz <= r2) return t;
  }
  return -1;
}

/**
 * Nearest intersection of a unit ray with a character. Returns false when the ray misses within
 * `maxT`. When the head and the body are hit at the same distance the head wins.
 */
export function rayCharacter(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  target: HitTarget,
  maxT: number,
  out: CharacterHit,
  zones: HitZoneConfig = HIT_ZONES,
): boolean {
  // Cheap rejection: closest approach of the ray to the character's vertical axis segment.
  const mx = target.x - ox;
  const my = target.y + target.height * 0.5 - oy;
  const mz = target.z - oz;
  const along = mx * dx + my * dy + mz * dz;
  const reach = target.height * 0.5 + zones.bodyRadius;
  if (along < -reach || along > maxT + reach) return false;
  const perp2 = mx * mx + my * my + mz * mz - along * along;
  if (perp2 > reach * reach) return false;

  const head = raySphere(ox, oy, oz, dx, dy, dz, target.x, target.y + headCenterHeight(target.height, zones), target.z, zones.headRadius, maxT);
  const body = rayCappedCylinder(
    ox,
    oy,
    oz,
    dx,
    dy,
    dz,
    target.x,
    target.z,
    zones.bodyRadius,
    target.y,
    target.y + bodyTopHeight(target.height, zones),
    maxT,
  );
  if (head < 0 && body < 0) return false;
  if (head >= 0 && (body < 0 || head <= body + 1e-6)) {
    out.t = head;
    out.zone = 'head';
  } else {
    out.t = body;
    out.zone = 'body';
  }
  return true;
}
