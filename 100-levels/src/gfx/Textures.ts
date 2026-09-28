/**
 * Procedural texture generation (no external assets needed).
 * Each texture set provides an albedo map and a bump map used for PBR detail.
 */
import * as THREE from 'three';

export type TexKind =
  | 'concrete' | 'metal' | 'tiles' | 'asphalt' | 'wood' | 'grass' | 'rock' | 'sand'
  | 'lava' | 'tech' | 'marble' | 'dirt' | 'brick' | 'wallpaper' | 'planks' | 'ice' | 'hex' | 'grid';

export interface TexSet {
  map: THREE.Texture;
  bump: THREE.Texture;
  emissive?: THREE.Texture;
}

const cache = new Map<string, TexSet>();
let maxAniso = 4;
export const setAnisotropy = (n: number) => (maxAniso = n);

// ── Noise ───────────────────────────────────────────────────────────────────
function hash(x: number, y: number, s: number) {
  let h = x * 374761393 + y * 668265263 + s * 982451653;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, y: number, s: number, period: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const w = (a: number) => ((a % period) + period) % period;
  const a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s);
  const c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Tileable fractal noise in [0,1]. */
function fbm(x: number, y: number, size: number, oct = 4, s = 1, base = 8) {
  let f = 0, amp = 0.5, freq = base;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise((x / size) * freq, (y / size) * freq, s + i, freq);
    amp *= 0.5;
    freq *= 2;
  }
  return f / (1 - Math.pow(0.5, oct));
}

type PixelFn = (x: number, y: number, size: number) => [number, number, number, number?];

function makeCanvas(size: number, fn: PixelFn, bumpFn?: (x: number, y: number, size: number) => number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const b = document.createElement('canvas');
  b.width = b.height = size;
  const bctx = b.getContext('2d')!;
  const bimg = bctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, bl, bv] = fn(x, y, size);
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = bl;
      img.data[i + 3] = 255;
      const h = bumpFn ? bumpFn(x, y, size) : bv ?? (r + g + bl) / 3;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = h;
      bimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  return { c, b, ctx };
}

function toTex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (v: number) => Math.max(0, Math.min(255, v));

function build(kind: TexKind): TexSet {
  const S = 256;
  let res: { c: HTMLCanvasElement; b: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  let emissive: HTMLCanvasElement | undefined;
  switch (kind) {
    case 'concrete':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 3, 6);
        const spots = fbm(x, y, s, 2, 9, 24) > 0.72 ? -18 : 0;
        const v = cl(118 + (n - 0.5) * 70 + spots);
        return [v, v, v * 1.02, v];
      });
      break;
    case 'metal':
      res = makeCanvas(S, (x, y, s) => {
        const panel = x % 128 < 2 || y % 128 < 2 ? -60 : 0;
        const rivet = ((x % 128) - 8) ** 2 + ((y % 128) - 8) ** 2 < 10 ? 50 : 0;
        const brushed = vnoise(x * 0.02, y * 0.9, 5, 1000) * 22;
        const n = fbm(x, y, s, 3, 7, 4) * 30;
        const v = cl(120 + brushed + n + panel + rivet);
        return [v * 0.95, v, v * 1.05, cl(128 + panel * 2 + rivet)];
      });
      break;
    case 'tiles':
      res = makeCanvas(S, (x, y, s) => {
        const t = 64;
        const edge = x % t < 3 || y % t < 3;
        const id = Math.floor(x / t) + Math.floor(y / t) * 7;
        const tone = hash(id, 3, 1) * 20;
        const n = fbm(x, y, s, 3, 11, 8) * 18;
        const v = edge ? 55 : cl(190 + tone + n);
        return [v, v, v, edge ? 40 : 170];
      });
      break;
    case 'asphalt':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 13, 16);
        const grit = hash(x, y, 4) > 0.93 ? 30 : 0;
        const v = cl(46 + n * 34 + grit);
        return [v, v, v * 1.05, cl(100 + n * 60 + grit)];
      });
      break;
    case 'wood':
    case 'planks':
      res = makeCanvas(S, (x, y, s) => {
        const plank = kind === 'planks' ? 32 : 64;
        const row = Math.floor(y / plank);
        const off = hash(row, 1, 2) * s;
        const seam = y % plank < 2 || ((x + off) % s) < 2;
        const grain = Math.sin((x / s) * 60 + fbm(x, y, s, 3, 5 + row, 4) * 8) * 0.5 + 0.5;
        const tone = hash(row, 9, 3) * 30;
        const v = seam ? 0.35 : 0.75 + grain * 0.25;
        return [cl((120 + tone) * v), cl((78 + tone * 0.6) * v), cl((46 + tone * 0.3) * v), seam ? 30 : cl(120 + grain * 80)];
      });
      break;
    case 'grass':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 17, 8);
        const blades = hash(x, y, 8) * 30;
        return [cl(48 + n * 40 + blades * 0.3), cl(96 + n * 60 + blades), cl(32 + n * 20), cl(100 + blades * 3)];
      });
      break;
    case 'rock':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 6, 19, 4);
        const crack = Math.abs(fbm(x, y, s, 3, 23, 6) - 0.5) < 0.02 ? -40 : 0;
        const v = cl(90 + n * 80 + crack);
        return [v * 1.02, v * 0.97, v * 0.92, cl(v + crack)];
      });
      break;
    case 'sand':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 4, 29, 6);
        const ripple = Math.sin((y / s) * 40 + n * 6) * 8;
        return [cl(200 + n * 30 + ripple), cl(176 + n * 26 + ripple), cl(128 + n * 20), cl(128 + ripple * 4)];
      });
      break;
    case 'dirt':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 31, 8);
        const peb = hash(x >> 2, y >> 2, 6) > 0.9 ? 25 : 0;
        return [cl(84 + n * 40 + peb), cl(64 + n * 30 + peb), cl(44 + n * 20 + peb), cl(90 + n * 80 + peb * 3)];
      });
      break;
    case 'lava': {
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 37, 4);
        const crust = n < 0.52;
        const v = crust ? 30 + n * 40 : 0;
        return [cl(v + 10), cl(v * 0.8), cl(v * 0.7), crust ? 200 : 40];
      });
      emissive = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 37, 4);
        const hot = Math.max(0, (n - 0.45) * 5);
        return [cl(255 * Math.min(1, hot)), cl(120 * Math.min(1, hot * hot)), cl(20 * hot * hot)];
      }).c;
      break;
    }
    case 'tech': {
      res = makeCanvas(S, (x, y, s) => {
        const g = 32;
        const line = x % g === 0 || y % g === 0;
        const n = fbm(x, y, s, 3, 41, 8) * 20;
        const panel = hash(Math.floor(x / 64), Math.floor(y / 64), 7);
        const v = cl(38 + n + panel * 18);
        return [v * 0.9, v, v * 1.15, line ? 60 : 130];
      });
      emissive = makeCanvas(S, (x, y) => {
        const g = 64;
        const on = (x % g === 0 || y % g === 0) && hash(Math.floor(x / g), Math.floor(y / g), 12) > 0.4;
        return on ? [60, 200, 255] : [0, 0, 0];
      }).c;
      break;
    }
    case 'hex': {
      res = makeCanvas(S, (x, y, s) => {
        const r = 16;
        const hy = y / (r * 1.732);
        const row = Math.floor(hy);
        const hx = x / (r * 2) + (row % 2) * 0.5;
        const fx = hx - Math.floor(hx) - 0.5, fy = hy - row - 0.5;
        const e = Math.max(Math.abs(fx) * 1.2 + Math.abs(fy) * 0.6, Math.abs(fy)) > 0.46;
        const n = fbm(x, y, s, 3, 43, 8) * 20;
        const v = e ? 30 : cl(60 + n);
        return [v * 0.9, v * 0.95, v * 1.2, e ? 40 : 160];
      });
      emissive = makeCanvas(S, (x, y) => {
        const r = 16;
        const hy = y / (r * 1.732);
        const row = Math.floor(hy);
        const hx = x / (r * 2) + (row % 2) * 0.5;
        const fx = hx - Math.floor(hx) - 0.5, fy = hy - row - 0.5;
        const e = Math.max(Math.abs(fx) * 1.2 + Math.abs(fy) * 0.6, Math.abs(fy)) > 0.46;
        return e ? [255, 255, 255] : [0, 0, 0];
      }).c;
      break;
    }
    case 'grid': {
      res = makeCanvas(S, (x, y, s) => {
        const major = x % 128 < 2 || y % 128 < 2;
        const minor = x % 32 < 1 || y % 32 < 1;
        const n = fbm(x, y, s, 3, 47, 8) * 14;
        const v = cl(200 + n - (major ? 90 : minor ? 40 : 0));
        return [v, v, v * 1.03, major ? 60 : 160];
      });
      break;
    }
    case 'marble':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 6, 53, 3);
        const vein = Math.pow(Math.abs(Math.sin((x / s) * 10 + n * 12)), 0.25);
        const v = mix(120, 232, vein);
        return [cl(v), cl(v * 0.98), cl(v * 1.02), cl(v)];
      });
      break;
    case 'brick':
      res = makeCanvas(S, (x, y, s) => {
        const bh = 32, bw = 64;
        const row = Math.floor(y / bh);
        const off = row % 2 ? bw / 2 : 0;
        const mortar = y % bh < 3 || (x + off) % bw < 3;
        const id = Math.floor((x + off) / bw) + row * 13;
        const tone = hash(id, 2, 4) * 40;
        const n = fbm(x, y, s, 4, 59, 8) * 30;
        if (mortar) return [cl(90 + n), cl(86 + n), cl(80 + n), 40];
        return [cl(120 + tone + n), cl(60 + tone * 0.4 + n * 0.5), cl(48 + n * 0.4), cl(150 + n)];
      });
      break;
    case 'wallpaper':
      res = makeCanvas(S, (x, y, s) => {
        const stripe = Math.sin((x / s) * Math.PI * 16) > 0.6;
        const damask = Math.sin((x / s) * Math.PI * 8) * Math.sin((y / s) * Math.PI * 8) > 0.5;
        const stain = fbm(x, y, s, 5, 61, 3);
        const base = stripe ? 70 : damask ? 60 : 52;
        const v = base * (0.6 + stain * 0.6);
        return [cl(v * 1.1), cl(v * 0.75), cl(v * 0.7), cl(100 + stain * 60)];
      });
      break;
    case 'ice':
      res = makeCanvas(S, (x, y, s) => {
        const n = fbm(x, y, s, 5, 67, 4);
        const crack = Math.abs(fbm(x, y, s, 4, 71, 5) - 0.5) < 0.015 ? 60 : 0;
        return [cl(170 + n * 50 + crack), cl(215 + n * 30 + crack), cl(240 + crack), cl(140 + n * 60 + crack)];
      });
      break;
  }
  const set: TexSet = { map: toTex(res.c, true), bump: toTex(res.b, false) };
  if (emissive) set.emissive = toTex(emissive, true);
  return set;
}

export function getTex(kind: TexKind): TexSet {
  let t = cache.get(kind);
  if (!t) {
    t = build(kind);
    cache.set(kind, t);
  }
  return t;
}

/** Radial gradient sprite texture used for glows, particles and fake lights. */
let glowTex: THREE.Texture | null = null;
export function getGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Text/symbol texture (for puzzle glyphs, signs, number plates). */
const textCache = new Map<string, THREE.Texture>();
export function getTextTexture(text: string, color = '#ffffff', bg = 'rgba(0,0,0,0)', size = 256, font = '900 150px Orbitron, Arial Black, sans-serif'): THREE.Texture {
  const key = text + color + bg + size + font;
  const hit = textCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillText(text, size / 2, size / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textCache.set(key, t);
  return t;
}
