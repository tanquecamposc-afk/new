import * as THREE from 'three';
import type { SkinPattern } from './catalog';

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Textura equirectangular procedural de la bola (256×128, sin assets). Se
 * cachea por combinación, así 20 bolas iguales comparten una sola textura.
 */
export function ballTexture(pattern: SkinPattern, color: number, accent: number): THREE.CanvasTexture | null {
  if (pattern === 'solid' || pattern === 'classic' || pattern === 'metal') return null;
  const key = `${pattern}:${color}:${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = hex(color);
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = hex(accent);
  switch (pattern) {
    case 'stripes':
      for (let y = 8; y < 128; y += 32) g.fillRect(0, y, 256, 14);
      break;
    case 'dots':
      for (let y = 16; y < 128; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < 256; x += 32) {
        g.beginPath();
        g.arc(x + 8, y, 8, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'checker':
      for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32);
      break;
    case 'stars': {
      const star = (cx: number, cy: number, r: number) => {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 ? r * 0.45 : r;
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.fill();
      };
      for (let y = 20; y < 128; y += 42) for (let x = (y / 42) % 2 ? 30 : 8; x < 256; x += 48) star(x, y, 11);
      break;
    }
    case 'planet': {
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, hex(color));
      grad.addColorStop(0.5, hex(accent));
      grad.addColorStop(1, hex(color));
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let y = 30; y < 110; y += 22) g.fillRect(0, y, 256, 5);
      break;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  cache.set(key, t);
  return t;
}

/** Textura radial suave (halos, sombras de contacto, partículas). */
let radial: THREE.CanvasTexture | null = null;
export function radialTexture(): THREE.CanvasTexture {
  if (radial) return radial;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  radial = new THREE.CanvasTexture(c);
  return radial;
}
