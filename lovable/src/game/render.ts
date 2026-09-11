/**
 * Todo el dibujo del juego. Recibe el estado y lo pinta; nunca lo modifica, salvo
 * las partículas, que viven y mueren aquí porque son puro adorno.
 */
import { MATERIALS, MOBS } from "./data";
import { phaseOf } from "./engine";
import type { GameState, Particle } from "./types";

export const TILE = 48;

const stars = Array.from({ length: 90 }, () => ({
  x: Math.random(), y: Math.random(), size: Math.random() * 1.6 + 0.4, seed: Math.random(),
}));
const motes = Array.from({ length: 26 }, () => ({
  x: Math.random(), y: Math.random(), size: Math.random() * 2.5 + 1.5,
  speed: Math.random() * 0.3 + 0.1, seed: Math.random() * 9,
}));

export function burst(state: GameState, x: number, y: number, colors: string[], count = 10): void {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3.4,
      vy: -Math.random() * 3 - 0.6,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 3 + 2,
    });
  }
}

/** Posición en pantalla de una casilla del mundo. */
export const screenX = (state: GameState, gx: number, width: number): number =>
  width / 2 + (gx - state.drawX) * TILE;

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, id: string): void {
  const material = MATERIALS[id] ?? { colors: ["#888", "#555"] as [string, string], name: "" };
  ctx.fillStyle = material.colors[0];
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = material.colors[1];
  const step = TILE / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i * 7 + j * 13 + id.length * 5) % 5 < 2) ctx.fillRect(x + i * step, y + j * step, step, step);
    }
  }
  ctx.fillStyle = "#ffffff18";
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillStyle = "#00000030";
  ctx.fillRect(x, y + TILE - 3, TILE, 3);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number): void {
  const phase = phaseOf(state);
  const baseY = height * 0.58;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, phase.sky[0]);
  sky.addColorStop(1, phase.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  stars.forEach((star) => {
    ctx.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(state.time / 40 + star.seed * 9))) * 0.7;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((star.x * width + state.time * 0.05 * star.size) % width, star.y * height * 0.7, star.size, star.size);
  });
  ctx.restore();

  // Halo bajo el bloque: el único punto de luz del mundo.
  const cx = screenX(state, 0, width);
  const glow = ctx.createRadialGradient(cx, baseY + TILE / 2, 4, cx, baseY + TILE / 2, TILE * 4.5);
  glow.addColorStop(0, `${phase.accent}33`);
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - TILE * 4.5, baseY + TILE / 2 - TILE * 4.5, TILE * 9, TILE * 9);

  motes.forEach((mote) => {
    ctx.globalAlpha = 0.16 + 0.1 * Math.sin(state.time / 30 + mote.seed);
    ctx.fillStyle = phase.accent;
    ctx.fillRect((mote.x * width - state.drawX * 6 + width) % width,
      (mote.y * height + state.time * mote.speed) % height, mote.size, mote.size);
    ctx.globalAlpha = 1;
  });

  // Plataforma
  Object.keys(state.platform).forEach((key) => {
    const gx = Number(key);
    const x = screenX(state, gx, width) - TILE / 2;
    if (x < -TILE || x > width) return;
    drawTile(ctx, x, baseY, gx === 0 ? state.block : state.platform[gx]);
    ctx.fillStyle = "#00000055";
    ctx.fillRect(x, baseY + TILE, TILE, 6);
  });

  // Grietas y anillo de picado
  if (state.mining > 0) {
    const bx = cx - TILE / 2;
    ctx.strokeStyle = "#000000aa";
    ctx.lineWidth = 2;
    for (let i = 0; i < Math.floor(state.mining * 5); i++) {
      ctx.beginPath();
      ctx.moveTo(bx + 4 + i * 8, baseY + 4);
      ctx.lineTo(bx + 12 + i * 7, baseY + TILE - 5);
      ctx.stroke();
    }
    ctx.strokeStyle = phase.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, baseY + TILE / 2, TILE * 0.75, -Math.PI / 2, -Math.PI / 2 + state.mining * Math.PI * 2);
    ctx.stroke();
  }

  // Portal
  if (state.portalBuilt) {
    for (let i = -2; i <= 2; i++) {
      const x = screenX(state, i, width) - TILE / 2;
      ctx.fillStyle = "#1f302b";
      ctx.fillRect(x, baseY - TILE, TILE, TILE);
      ctx.fillStyle = "#0d3b33aa";
      ctx.fillRect(x + 4, baseY - TILE + 4, TILE - 8, TILE - 8);
    }
    ctx.fillStyle = `rgba(60,230,200,${0.25 + 0.15 * Math.sin(state.time / 8)})`;
    ctx.fillRect(screenX(state, -2, width) - TILE / 2, baseY - TILE, TILE * 5, TILE);
  }

  // Mobs
  state.mobs.forEach((mob) => {
    const def = MOBS[mob.kind];
    const x = screenX(state, mob.x, width) - 14;
    const y = baseY - 30 + Math.sin(state.time / 6 + mob.x) * 2;
    ctx.fillStyle = def.colors[0];
    ctx.fillRect(x, y, 28, 30);
    ctx.fillStyle = def.colors[1];
    ctx.fillRect(x, y + 18, 28, 12);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 5, y + 7, 5, 5);
    ctx.fillRect(x + 18, y + 7, 5, 5);
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 6, y + 8, 3, 3);
    ctx.fillRect(x + 19, y + 8, 3, 3);
    ctx.fillStyle = "#00000088";
    ctx.fillRect(x, y - 7, 28, 4);
    ctx.fillStyle = def.peaceful ? "#6fe08b" : "#ff3b4e";
    ctx.fillRect(x, y - 7, 28 * (mob.hp / def.hp), 4);
    if (mob.flash > 0) {
      ctx.fillStyle = "#ffffff99";
      ctx.fillRect(x, y, 28, 30);
    }
  });

  // Dragón
  if (state.dragon) {
    const dx = width / 2 + Math.sin(state.time / 22) * width * 0.3;
    const dy = height * 0.22 + Math.sin(state.time / 14) * 18;
    state.dragon.screenX = dx;
    state.dragon.screenY = dy;
    ctx.fillStyle = "#241033";
    ctx.fillRect(dx - 46, dy - 16, 92, 32);
    ctx.fillStyle = "#3d1a55";
    ctx.fillRect(dx - 70, dy - 6, 24, 12);
    ctx.fillRect(dx + 46, dy - 6, 24, 12);
    ctx.fillStyle = "#c07ad8";
    ctx.fillRect(dx + 28, dy - 8, 10, 7);
    ctx.fillStyle = "#000";
    ctx.fillRect(dx + 32, dy - 6, 4, 4);
    ctx.fillStyle = "#00000088";
    ctx.fillRect(dx - 46, dy - 28, 92, 7);
    ctx.fillStyle = "#ff3b4e";
    ctx.fillRect(dx - 46, dy - 28, 92 * (state.dragon.hp / state.dragon.max), 7);
  }

  // Jugador
  if (state.respawning <= 0) {
    const px = width / 2 - 9;
    const py = baseY - 34 + state.falling * 8;
    ctx.fillStyle = "#2f6ad8";
    ctx.fillRect(px, py + 18, 18, 16);
    ctx.fillStyle = "#d8a06a";
    ctx.fillRect(px + 1, py, 16, 18);
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(px + 1, py, 16, 6);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + (state.dir > 0 ? 9 : 3), py + 8, 4, 4);
    ctx.fillStyle = "#000";
    ctx.fillRect(px + (state.dir > 0 ? 10 : 4), py + 9, 2, 2);
  }

  // Partículas
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p: Particle = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22;
    p.life -= 0.028;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  // Viñeta
  const vignette = ctx.createRadialGradient(width / 2, baseY, height * 0.2, width / 2, baseY, height * 0.95);
  vignette.addColorStop(0, "#00000000");
  vignette.addColorStop(1, "#000000aa");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if (!state.platform[state.x] && state.respawning <= 0) {
    ctx.fillStyle = "#ff3b4ecc";
    ctx.font = "16px 'Pixelify Sans', monospace";
    ctx.textAlign = "center";
    ctx.fillText("¡EL VACÍO!", width / 2, baseY + 70);
  }
}
