export interface RemoteSample {
  tick: number;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

/**
 * Buffer de snapshots de una bola remota. Se dibuja ligeramente en el pasado
 * (retardo de interpolación) para interpolar siempre entre dos estados reales:
 * sin saltos aunque los snapshots lleguen a 15 Hz o con jitter.
 */
export class RemoteBuffer {
  private samples: RemoteSample[] = [];

  push(s: RemoteSample): void {
    const last = this.samples.at(-1);
    if (last && s.tick <= last.tick) {
      if (s.tick === last.tick) this.samples[this.samples.length - 1] = s;
      return;
    }
    this.samples.push(s);
    if (this.samples.length > 40) this.samples.shift();
  }

  get latest(): RemoteSample | undefined {
    return this.samples.at(-1);
  }

  /** Estado interpolado en `tick` (fraccional). Fuera del rango: el extremo más cercano. */
  sample(tick: number): RemoteSample | undefined {
    const s = this.samples;
    if (!s.length) return undefined;
    if (tick <= s[0]!.tick) return s[0];
    const last = s.at(-1)!;
    if (tick >= last.tick) return last;
    let i = s.length - 2;
    while (i > 0 && s[i]!.tick > tick) i--;
    const a = s[i]!;
    const b = s[i + 1]!;
    const t = (tick - a.tick) / (b.tick - a.tick);
    // Interpolación de cuaternión por nlerp (suficiente para giros pequeños entre snapshots).
    const dot = a.qx * b.qx + a.qy * b.qy + a.qz * b.qz + a.qw * b.qw;
    const sgn = dot < 0 ? -1 : 1;
    let qx = a.qx + (b.qx * sgn - a.qx) * t;
    let qy = a.qy + (b.qy * sgn - a.qy) * t;
    let qz = a.qz + (b.qz * sgn - a.qz) * t;
    let qw = a.qw + (b.qw * sgn - a.qw) * t;
    const l = Math.hypot(qx, qy, qz, qw) || 1;
    qx /= l;
    qy /= l;
    qz /= l;
    qw /= l;
    return { tick, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, qx, qy, qz, qw };
  }

  clear(): void {
    this.samples = [];
  }
}
