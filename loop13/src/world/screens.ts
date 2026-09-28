/** Animated monitor contents drawn on shared canvases (updated a few times per second). */
import * as THREE from 'three';
import { world } from '../game/core/world';
import { formatClock } from '../game/core/constants';
import { G } from '../game/core/store';

export type ScreenKind = 'terminal' | 'medical' | 'reactor' | 'core' | 'hub' | 'lab' | 'security';

interface Screen { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mat: THREE.MeshBasicMaterial; }
const screens = new Map<ScreenKind, Screen>();

export function screenMaterial(kind: ScreenKind): THREE.MeshBasicMaterial {
  let s = screens.get(kind);
  if (!s) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    s = { canvas, ctx, tex, mat };
    screens.set(kind, s);
    draw(kind, s, 0);
  }
  return s.mat;
}

const LINES = ['> A-13 MONITOR', '> fold integrity 99.99%', '> subject status: CALM', '> relay A .... OPEN', '> relay B .... OPEN', '> relay C .... OPEN', '> suppression: SCHEDULED 13:00:00', '> all personnel: 3', '> all personnel: 2', '> sector 7: N/A'];

function draw(kind: ScreenKind, s: Screen, time: number): void {
  const { ctx, canvas } = s;
  const W = canvas.width, H = canvas.height;
  const power = world.light.power;
  ctx.fillStyle = '#020507';
  ctx.fillRect(0, 0, W, H);
  if (power < 0.3) { s.mat.color.setScalar(0.05); s.tex.needsUpdate = true; return; }
  s.mat.color.setScalar(1);
  const msg = world.terminalMessage;
  if (msg && kind !== 'medical') {
    ctx.fillStyle = time % 1 < 0.5 ? '#ff3b30' : '#3a0000';
    ctx.font = 'bold 30px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, H / 2 + 10);
    s.tex.needsUpdate = true;
    return;
  }
  ctx.textAlign = 'left';
  ctx.font = '13px "Share Tech Mono", monospace';
  const green = '#5dffb0', amber = '#ffb347';
  switch (kind) {
    case 'medical': {
      ctx.strokeStyle = green; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const ph = ((x + time * 80) % 120) / 120;
        const y = ph > 0.42 && ph < 0.46 ? -40 : ph > 0.46 && ph < 0.5 ? 25 : Math.sin(ph * 30) * 2;
        ctx.lineTo(x, 70 + y);
      }
      ctx.stroke();
      ctx.fillStyle = green; ctx.fillText('HR 58   SpO2 97%   SUBJ 13', 10, 140);
      break;
    }
    case 'reactor': {
      const heat = world.t >= 720 ? 0.6 + (world.t - 720) / 150 : 0.35 + Math.sin(time) * 0.02;
      ctx.fillStyle = heat > 0.6 ? '#ff4040' : amber;
      ctx.fillText(`CORE TEMP ${(560 + heat * 700).toFixed(0)} K`, 10, 22);
      ctx.fillRect(10, 40, (W - 20) * Math.min(1, heat), 18);
      ctx.strokeStyle = '#555'; ctx.strokeRect(10, 40, W - 20, 18);
      for (let i = 0; i < 6; i++) ctx.fillText(`LOOP ${i} · ${(Math.random() * 99).toFixed(2)}`, 10, 80 + i * 13);
      break;
    }
    case 'core': {
      ctx.fillStyle = '#a996ff';
      ctx.fillText('TEMPORAL FOLD', 10, 20);
      ctx.fillText(`ITERATION ${G().run.loop > 0 ? '01' : '--'}`, 10, 40);
      ctx.fillText(`T-${(780 - world.t).toFixed(1)}s`, 10, 60);
      ctx.strokeStyle = '#a996ff'; ctx.beginPath(); ctx.arc(190, 90, 40, time, time + 5); ctx.stroke();
      break;
    }
    case 'hub': {
      ctx.fillStyle = green;
      ctx.font = 'bold 34px "Share Tech Mono", monospace';
      ctx.fillText(formatClock(world.t, true), 30, 70);
      ctx.font = '13px "Share Tech Mono", monospace';
      const loop = G().run.loop;
      ctx.fillText(loop >= 8 && Math.floor(time) % 7 === 0 ? 'I T E R A T I O N  4 2 1 1' : 'ORPHEUS · GOOD MORNING', 30, 110);
      break;
    }
    case 'security': {
      if (world.flags.has('selfTyping') && world.t < 470) {
        ctx.fillStyle = green;
        const txt = '> HELLO?\n> ARE YOU THERE\n> I CAN SEE YOU ON CAM-01';
        const n = Math.floor((world.t - 380) * 6);
        txt.slice(0, Math.max(0, n)).split('\n').forEach((l, i) => ctx.fillText(l + (i === 2 && time % 1 < 0.5 ? '_' : ''), 10, 24 + i * 16));
        break;
      }
      // fallthrough-like: security shows camera tiles
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * 128, y = Math.floor(i / 2) * 80;
        ctx.fillStyle = `rgb(${20 + Math.random() * 12},${26 + Math.random() * 12},${24 + Math.random() * 12})`;
        ctx.fillRect(x + 2, y + 2, 124, 76);
        ctx.fillStyle = '#9adbb8'; ctx.fillText(`CAM-0${i + 1}`, x + 6, y + 16);
        ctx.fillStyle = time % 1 < 0.5 ? '#ff3030' : '#300'; ctx.fillText('●', x + 108, y + 16);
      }
      break;
    }
    case 'lab': {
      ctx.fillStyle = '#7fd4ff';
      for (let i = 0; i < 9; i++) ctx.fillText(`${(Math.sin(time * 0.7 + i) * 50 + 50).toFixed(3)}  Δt ${(i * 0.013).toFixed(3)}`, 10, 18 + i * 15);
      break;
    }
    default: {
      ctx.fillStyle = green;
      const off = Math.floor(time * 2) % LINES.length;
      for (let i = 0; i < 9; i++) ctx.fillText(LINES[(i + off) % LINES.length], 8, 18 + i * 15);
      ctx.fillText(formatClock(world.t, true) + (time % 1 < 0.5 ? ' _' : ''), 8, 152);
    }
  }
  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  s.tex.needsUpdate = true;
}

export function updateScreens(time: number): void {
  screens.forEach((s, k) => draw(k, s, time));
}
