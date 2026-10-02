export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const horizontalLength = (v: Vec3) => Math.hypot(v.x, v.z);
export const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
export const copyVec = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z });
/** Suavizado exponencial independiente del framerate. */
export const damp = (a: number, b: number, sharpness: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-sharpness * dt));
export const round = (v: number, decimals = 3) => {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
};

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Euler (rad, orden XYZ — igual que Three.js por defecto) a cuaternión. */
export function eulerToQuat(ex: number, ey: number, ez: number): Quat {
  const c1 = Math.cos(ex / 2), c2 = Math.cos(ey / 2), c3 = Math.cos(ez / 2);
  const s1 = Math.sin(ex / 2), s2 = Math.sin(ey / 2), s3 = Math.sin(ez / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

/** Multiplica cuaterniones a·b (aplica b y luego a). */
export function mulQuat(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export const axisAngle = (x: number, y: number, z: number, angle: number): Quat => {
  const s = Math.sin(angle / 2);
  return { x: x * s, y: y * s, z: z * s, w: Math.cos(angle / 2) };
};
