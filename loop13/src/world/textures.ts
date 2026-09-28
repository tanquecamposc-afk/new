/**
 * Procedural PBR textures generated on canvas at load time (no external assets):
 * albedo + normal (from a height field via Sobel) + roughness.
 */
import * as THREE from 'three';
import { mulberry32 } from '../game/core/rng';

export interface PBRSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; }

type Painter = (ctx: CanvasRenderingContext2D, h: CanvasRenderingContext2D, size: number, rnd: () => number) => void;

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Tileable value noise, several octaves, written into an ImageData-like float array. */
function noiseField(size: number, rnd: () => number, octaves = 5, base = 4): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const grid = new Float32Array(cells * cells).map(() => rnd());
    const step = size / cells;
    for (let y = 0; y < size; y++) {
      const gy = y / step, y0 = Math.floor(gy), fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = x / step, x0 = Math.floor(gx), fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const a = grid[(y0 % cells) * cells + (x0 % cells)];
        const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)];
        const c = grid[((y0 + 1) % cells) * cells + (x0 % cells)];
        const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
        out[y * size + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function drawField(ctx: CanvasRenderingContext2D, f: Float32Array, size: number, col: (v: number, i: number) => [number, number, number]) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < f.length; i++) {
    const [r, g, b] = col(f[i], i);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function normalFromHeight(h: CanvasRenderingContext2D, size: number, strength: number): HTMLCanvasElement {
  const src = h.getImageData(0, 0, size, size).data;
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const H = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function roughFromHeight(h: CanvasRenderingContext2D, size: number, base: number, varr: number, invert = false): HTMLCanvasElement {
  const src = h.getImageData(0, 0, size, size).data;
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    let v = src[i * 4] / 255;
    if (invert) v = 1 - v;
    const r = Math.max(0, Math.min(1, base + (v - 0.5) * varr)) * 255;
    img.data[i * 4] = r; img.data[i * 4 + 1] = r; img.data[i * 4 + 2] = r; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(c: HTMLCanvasElement, srgb: boolean): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function make(size: number, seed: number, paint: Painter, normalStrength: number, rough: [number, number, boolean?]): PBRSet {
  const rnd = mulberry32(seed);
  const [cc, ctx] = canvas(size);
  const [hc, hctx] = canvas(size);
  paint(ctx, hctx, size, rnd);
  const n = normalFromHeight(hctx, size, normalStrength);
  const r = roughFromHeight(hctx, size, rough[0], rough[1], rough[2]);
  return { map: tex(cc, true), normalMap: tex(n, false), roughnessMap: tex(r, false) };
  void hc;
}

const grayCol = (base: [number, number, number], contrast: number) => (v: number): [number, number, number] =>
  [base[0] + (v - 0.5) * contrast, base[1] + (v - 0.5) * contrast, base[2] + (v - 0.5) * contrast];

// ─────────────────────────────── painters ───────────────────────────────
const concrete = (tint: [number, number, number], stains = true): Painter => (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 6, 4);
  drawField(ctx, f, s, grayCol(tint, 70));
  drawField(h, f, s, (v) => [v * 255, v * 255, v * 255]);
  // pits
  for (let i = 0; i < 900; i++) {
    const x = rnd() * s, y = rnd() * s, r = rnd() * 1.6 + 0.4;
    ctx.fillStyle = `rgba(20,20,20,${0.25 + rnd() * 0.3})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    h.fillStyle = 'rgba(0,0,0,0.6)'; h.beginPath(); h.arc(x, y, r, 0, 7); h.fill();
  }
  if (stains) {
    for (let i = 0; i < 7; i++) {
      const x = rnd() * s, y = rnd() * s, r = 30 + rnd() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(40,32,20,${0.12 + rnd() * 0.15})`);
      g.addColorStop(1, 'rgba(40,32,20,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }
  }
  // hairline cracks
  ctx.strokeStyle = 'rgba(15,15,15,0.35)';
  h.strokeStyle = 'rgba(0,0,0,0.8)';
  for (let i = 0; i < 5; i++) {
    let x = rnd() * s, y = rnd() * s;
    ctx.beginPath(); h.beginPath(); ctx.moveTo(x, y); h.moveTo(x, y);
    for (let k = 0; k < 14; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; ctx.lineTo(x, y); h.lineTo(x, y); }
    ctx.lineWidth = h.lineWidth = 1; ctx.stroke(); h.stroke();
  }
};

const tiles = (tint: [number, number, number], n: number, grout: string): Painter => (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 5, 8);
  drawField(ctx, f, s, grayCol(tint, 22));
  drawField(h, f, s, (v) => [150 + v * 40, 150 + v * 40, 150 + v * 40]);
  const cell = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = (rnd() - 0.5) * 18;
    ctx.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k) / 255})`;
    ctx.fillRect(i * cell, j * cell, cell, cell);
  }
  ctx.strokeStyle = grout; h.strokeStyle = '#000';
  ctx.lineWidth = h.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, s); ctx.moveTo(0, i * cell); ctx.lineTo(s, i * cell); ctx.stroke();
    h.beginPath(); h.moveTo(i * cell, 0); h.lineTo(i * cell, s); h.moveTo(0, i * cell); h.lineTo(s, i * cell); h.stroke();
  }
  // grime towards corners
  for (let i = 0; i < 12; i++) {
    const x = rnd() * s, y = rnd() * s, r = 20 + rnd() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(30,26,20,0.18)'); g.addColorStop(1, 'rgba(30,26,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }
};

const panels = (tint: [number, number, number], cols: number, rows: number, rivets: boolean): Painter => (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 5, 4);
  drawField(ctx, f, s, grayCol(tint, 26));
  drawField(h, f, s, (v) => [140 + v * 30, 140 + v * 30, 140 + v * 30]);
  const cw = s / cols, rh = s / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw, y = j * rh;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 4, cw - 8, rh - 8);
    h.strokeStyle = '#000'; h.lineWidth = 4; h.strokeRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
    if (rivets) {
      for (const [rx, ry] of [[8, 8], [cw - 8, 8], [8, rh - 8], [cw - 8, rh - 8]]) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(x + rx, y + ry, 3, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x + rx - 0.7, y + ry - 0.7, 1.5, 0, 7); ctx.fill();
        h.fillStyle = '#fff'; h.beginPath(); h.arc(x + rx, y + ry, 3, 0, 7); h.fill();
      }
    }
  }
  // vertical streaks / grime at the bottom
  for (let i = 0; i < 40; i++) {
    const x = rnd() * s, len = 20 + rnd() * 120;
    ctx.fillStyle = `rgba(40,30,20,${rnd() * 0.08})`;
    ctx.fillRect(x, rnd() * s, 1 + rnd() * 3, len);
  }
  const g = ctx.createLinearGradient(0, s * 0.75, 0, s);
  g.addColorStop(0, 'rgba(20,16,10,0)'); g.addColorStop(1, 'rgba(20,16,10,0.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
};

const grate: Painter = (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 4, 4);
  ctx.fillStyle = '#0b0c0d'; ctx.fillRect(0, 0, s, s);
  h.fillStyle = '#000'; h.fillRect(0, 0, s, s);
  const bars = 16, bw = s / bars;
  for (let i = 0; i < bars; i++) {
    const v = 55 + f[i * 13] * 30;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`; ctx.fillRect(i * bw + 3, 0, bw * 0.45, s);
    h.fillStyle = '#ddd'; h.fillRect(i * bw + 3, 0, bw * 0.45, s);
  }
  for (let j = 0; j < 4; j++) {
    ctx.fillStyle = '#4a4d50'; ctx.fillRect(0, j * (s / 4), s, 6);
    h.fillStyle = '#fff'; h.fillRect(0, j * (s / 4), s, 6);
  }
  // rust
  for (let i = 0; i < 25; i++) {
    const x = rnd() * s, y = rnd() * s, r = 8 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(90,45,15,0.35)'); g.addColorStop(1, 'rgba(90,45,15,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }
};

const diamondPlate: Painter = (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 5, 4);
  drawField(ctx, f, s, grayCol([72, 75, 78], 30));
  drawField(h, f, s, (v) => [100 + v * 20, 100 + v * 20, 100 + v * 20]);
  const n = 12, c = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * c + (j % 2 ? c / 2 : 0), y = j * c;
    ctx.save(); h.save();
    ctx.translate(x + c / 2, y + c / 2); h.translate(x + c / 2, y + c / 2);
    const a = (j % 2 ? 1 : -1) * 0.78;
    ctx.rotate(a); h.rotate(a);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-c * 0.32, -3, c * 0.64, 6);
    h.fillStyle = '#fff'; h.fillRect(-c * 0.32, -3, c * 0.64, 6);
    ctx.restore(); h.restore();
  }
};

const carpet = (tint: [number, number, number]): Painter => (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 6, 16);
  drawField(ctx, f, s, (v, i) => { const k = ((i * 2654435761) >>> 0) % 21 - 10; return [tint[0] + (v - 0.5) * 30 + k, tint[1] + (v - 0.5) * 30 + k, tint[2] + (v - 0.5) * 30 + k]; });
  drawField(h, f, s, (v, i) => { const k = (((i * 2246822519) >>> 0) % 255) * 0.5 + v * 120; return [k, k, k]; });
  for (let i = 0; i < 6; i++) {
    const x = rnd() * s, y = rnd() * s, r = 40 + rnd() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }
};

const wallpaper: Painter = (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 5, 4);
  drawField(ctx, f, s, grayCol([92, 80, 64], 30));
  drawField(h, f, s, (v) => [128 + v * 20, 128 + v * 20, 128 + v * 20]);
  for (let x = 0; x < s; x += 32) {
    ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.fillRect(x, 0, 6, s);
    ctx.fillStyle = 'rgba(255,235,200,0.05)'; ctx.fillRect(x + 12, 0, 3, s);
  }
  for (let i = 0; i < 18; i++) {
    const x = rnd() * s, y = rnd() * s * 0.2, len = 60 + rnd() * 200;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(60,40,20,0.2)'); g.addColorStop(1, 'rgba(60,40,20,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 4 + rnd() * 10, len);
  }
};

const tally: Painter = (ctx, h, s, rnd) => {
  concrete([70, 70, 68], true)(ctx, h, s, rnd);
  ctx.strokeStyle = 'rgba(20,18,16,0.85)';
  h.strokeStyle = '#000';
  ctx.lineWidth = h.lineWidth = 2;
  for (let gy = 10; gy < s - 20; gy += 26) {
    for (let gx = 6; gx < s - 30; gx += 34) {
      if (rnd() < 0.08) continue;
      for (let k = 0; k < 4; k++) {
        const x = gx + k * 6 + (rnd() - 0.5) * 2;
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + (rnd() - 0.5) * 3, gy + 18); ctx.stroke();
        h.beginPath(); h.moveTo(x, gy); h.lineTo(x, gy + 18); h.stroke();
      }
      ctx.beginPath(); ctx.moveTo(gx - 3, gy + 15); ctx.lineTo(gx + 24, gy + 3); ctx.stroke();
    }
  }
};

const wood: Painter = (ctx, h, s, rnd) => {
  const f = noiseField(s, rnd, 4, 4);
  drawField(ctx, f, s, (v, i) => {
    const y = Math.floor(i / s);
    const grain = Math.sin(y * 0.35 + v * 12) * 0.5 + 0.5;
    return [95 + grain * 40 + v * 30, 70 + grain * 28 + v * 20, 42 + grain * 15];
  });
  drawField(h, f, s, (v, i) => { const y = Math.floor(i / s); const g = Math.sin(y * 0.35 + v * 12) * 60 + 128; return [g, g, g]; });
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = 'rgba(30,20,10,0.7)'; ctx.fillRect(0, (k * s) / 4, s, 4);
    h.fillStyle = '#000'; h.fillRect(0, (k * s) / 4, s, 4);
  }
};

const ceiling: Painter = (ctx, h, s, rnd) => tiles([160, 160, 155], 4, 'rgba(60,60,60,0.9)')(ctx, h, s, rnd);

// ─────────────────────────────── library ───────────────────────────────
export type TexName = 'concrete' | 'concreteDark' | 'tile' | 'labTile' | 'panel' | 'labPanel' | 'darkPanel' | 'grate' | 'plate' | 'carpet' | 'wallpaper' | 'tally' | 'wood' | 'ceiling' | 'metal';

let cache: Record<TexName, PBRSet> | null = null;

export function buildTextures(q: 'low' | 'medium' | 'high'): Record<TexName, PBRSet> {
  if (cache) return cache;
  const S = q === 'low' ? 256 : 512;
  cache = {
    concrete: make(S, 11, concrete([118, 116, 110]), 3, [0.85, 0.3]),
    concreteDark: make(S, 12, concrete([62, 62, 64]), 3, [0.8, 0.3]),
    tile: make(S, 13, tiles([112, 116, 118], 4, 'rgba(40,40,40,0.9)'), 5, [0.35, 0.4]),
    labTile: make(S, 14, tiles([188, 194, 196], 6, 'rgba(90,95,100,0.9)'), 4, [0.25, 0.3]),
    panel: make(S, 15, panels([104, 110, 116], 2, 2, true), 5, [0.45, 0.35]),
    labPanel: make(S, 16, panels([196, 200, 202], 2, 3, false), 4, [0.3, 0.2]),
    darkPanel: make(S, 17, panels([54, 58, 62], 2, 2, true), 5, [0.55, 0.35]),
    grate: make(S, 18, grate, 8, [0.6, 0.4]),
    plate: make(S, 19, diamondPlate, 6, [0.45, 0.35]),
    carpet: make(S, 20, carpet([52, 58, 60]), 2, [0.95, 0.1]),
    wallpaper: make(S, 21, wallpaper, 2, [0.8, 0.2]),
    tally: make(S, 22, tally, 4, [0.9, 0.2]),
    wood: make(S, 23, wood, 3, [0.7, 0.3]),
    ceiling: make(S, 24, ceiling, 3, [0.8, 0.2]),
    metal: make(S, 25, panels([120, 124, 128], 1, 1, false), 2, [0.35, 0.3]),
  };
  return cache;
}

/** Canvas texture with text (signs, labels, notes). */
export function textTexture(lines: string[], opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; size?: number; align?: CanvasTextAlign; border?: string; stripes?: boolean } = {}): THREE.CanvasTexture {
  const w = opts.w ?? 512, h = opts.h ?? 128;
  const [c, ctx] = canvas(1);
  c.width = w; c.height = h;
  ctx.fillStyle = opts.bg ?? '#101418';
  ctx.fillRect(0, 0, w, h);
  if (opts.stripes) {
    for (let x = -h; x < w; x += 40) { ctx.fillStyle = '#d8a400'; ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 20, h); ctx.lineTo(x + 20 + h, 0); ctx.lineTo(x + h, 0); ctx.fill(); }
    ctx.fillStyle = opts.bg ?? '#101418'; ctx.fillRect(10, 10, w - 20, h - 20);
  }
  if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12); }
  ctx.fillStyle = opts.fg ?? '#e8eef2';
  const size = opts.size ?? Math.floor(h / (lines.length + 0.6));
  ctx.font = `${opts.font ?? '600'} ${size}px Rajdhani, 'Share Tech Mono', Arial, sans-serif`;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, opts.align === 'left' ? 24 : w / 2, (h / (lines.length + 1)) * (i + 1)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Soft round sprite for particles. */
export function dotTexture(): THREE.Texture {
  const [c, ctx] = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** Vertical gradient used by fake volumetric light cones. */
export function coneTexture(): THREE.Texture {
  const [c, ctx] = canvas(1);
  c.width = 4; c.height = 128;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.1, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}
