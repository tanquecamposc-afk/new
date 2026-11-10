/**
 * Procedural surface textures drawn on a 2D canvas at start-up. They are greyscale detail maps:
 * the final colour comes from vertex colours, so one texture serves many differently tinted
 * pieces. Deterministic (seeded) so the game looks identical on every run.
 */
import * as THREE from 'three';
import { makeRng } from '../../core/rng.js';

export type DetailTexture = 'panel' | 'crate' | 'metal' | 'ground';

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

function speckle(ctx: CanvasRenderingContext2D, size: number, seed: number, count: number, alpha: number): void {
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    const shade = rng() < 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${(rng() * alpha).toFixed(3)})`;
    const s = 1 + Math.floor(rng() * 3);
    ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), s, s);
  }
}

function finish(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Cast panels: light base, a seam around each 2 m tile and a fine inner line. */
function panelTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 11, 2600, 0.07);
  ctx.strokeStyle = 'rgba(0,0,0,0.34)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, size - 10, size - 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, 6);
  ctx.lineTo(size / 2, size - 6);
  ctx.moveTo(6, size / 2);
  ctx.lineTo(size - 6, size / 2);
  ctx.stroke();
  return finish(canvas, anisotropy);
}

/** Wooden crate: planks, a frame and a diagonal brace. */
function crateTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#ededed';
  ctx.fillRect(0, 0, size, size);
  const rng = makeRng(23);
  for (let i = 0; i < 6; i++) {
    const shade = 215 + Math.floor(rng() * 34);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, (i * size) / 6, size, size / 6 - 3);
  }
  speckle(ctx, size, 29, 1800, 0.06);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i * size) / 6);
    ctx.lineTo(size, (i * size) / 6);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(40,40,40,0.55)';
  ctx.lineWidth = 26;
  ctx.strokeRect(13, 13, size - 26, size - 26);
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(26, 26);
  ctx.lineTo(size - 26, size - 26);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(27, 27, size - 54, size - 54);
  return finish(canvas, anisotropy);
}

/** Corrugated metal: vertical ribs with soft highlights. */
function metalTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const ribs = 8;
  for (let i = 0; i < ribs; i++) {
    const x = (i * size) / ribs;
    const gradient = ctx.createLinearGradient(x, 0, x + size / ribs, 0);
    gradient.addColorStop(0, '#bdbdbd');
    gradient.addColorStop(0.35, '#f7f7f7');
    gradient.addColorStop(0.7, '#dcdcdc');
    gradient.addColorStop(1, '#a9a9a9');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, size / ribs + 1, size);
  }
  speckle(ctx, size, 37, 1400, 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, size, size);
  return finish(canvas, anisotropy);
}

/** Ground detail: soft mottling plus a faint survey grid, so speed and distance read at a glance. */
function groundTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, size, size);
  const rng = makeRng(53);
  for (let i = 0; i < 140; i++) {
    const shade = rng() < 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${(0.008 + rng() * 0.02).toFixed(3)})`;
    const r = 10 + rng() * 34;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, size, 59, 2200, 0.09);
  ctx.strokeStyle = 'rgba(0,0,0,0.085)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
  return finish(canvas, anisotropy);
}

export function createDetailTextures(anisotropy: number): Record<DetailTexture, THREE.CanvasTexture> {
  return {
    panel: panelTexture(anisotropy),
    crate: crateTexture(anisotropy),
    metal: metalTexture(anisotropy),
    ground: groundTexture(anisotropy),
  };
}

/** Soft round sprite used by particles and glows. */
export function createGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A signpost label: bold text on a dark chamfered plate with an amber edge. */
export function createLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const height = 96;
  const probe = document.createElement('canvas').getContext('2d');
  const font = '800 54px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  let textWidth = text.length * 34;
  if (probe) {
    probe.font = font;
    textWidth = probe.measureText(text).width;
  }
  const width = Math.ceil(textWidth + 72);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const cut = 18;
  ctx.beginPath();
  ctx.moveTo(cut, 4);
  ctx.lineTo(width - 4, 4);
  ctx.lineTo(width - 4, height - cut);
  ctx.lineTo(width - cut, height - 4);
  ctx.lineTo(4, height - 4);
  ctx.lineTo(4, cut);
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,26,36,0.9)';
  ctx.fill();
  ctx.strokeStyle = '#ffb547';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4ead8';
  ctx.fillText(text, width / 2, height / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}
