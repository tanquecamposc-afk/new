/* NEXO ARCADE — motivos de portada A: acción, arcade y plataformas. */
(function (global) {
  'use strict';
  const NX = global.NX, M = NX.M, GFX = NX.GFX;
  const { alpha, mix, shade } = GFX;
  const { TAU, clamp, clamp01, lerp } = M;
  const S = GFX.Sprites;

  NX.Cover.add({
    /* ---------------------------------------------------------- ACCIÓN */
    invaders(g, W, H, P, rng, t) {
      const cols = 7, rows = 3, sx = W * 0.5 - (cols - 1) * 21, sy = H * 0.2;
      const wob = Math.sin(t * 1.6) * 8;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = sx + c * 42 + wob, y = sy + r * 34;
          const col = [P.a, P.b, P.c][r];
          g.push(x, y, 0, 1 + Math.sin(t * 3 + c) * 0.05);
          g.rect(-11, -7, 22, 12, col);
          g.rect(-15, -2, 6, 9, col); g.rect(9, -2, 6, 9, col);
          g.rect(-8, -13, 5, 6, col); g.rect(3, -13, 5, 6, col);
          g.rect(-7, -3, 4, 4, P.deep); g.rect(3, -3, 4, 4, P.deep);
          g.pop();
        }
      }
      const px = W * 0.5 + Math.sin(t * 0.9) * 60;
      g.poly([px, H * 0.62, px + 20, H * 0.72, px - 20, H * 0.72], P.c);
      g.rect(px - 3, H * 0.56, 6, 8, P.c);
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const y = H * 0.56 - ((t * 220 + i * 90) % 180);
        if (y > H * 0.16) g.rect(px - 2, y, 4, 14, P.ink);
      }
      g.ctx.globalCompositeOperation = 'source-over';
    },

    asteroid(g, W, H, P, rng, t) {
      for (let i = 0; i < 5; i++) {
        const r = rng.float(16, 40);
        const x = (rng.float(0, W) + t * rng.float(6, 18)) % (W + 90) - 45;
        const y = rng.float(H * 0.12, H * 0.68);
        const rot = t * rng.float(-0.5, 0.5) + i;
        const pts = [];
        const n = 9;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + rot;
          const rr = r * (0.72 + ((k * 37 + i * 11) % 10) / 24);
          pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.poly(pts, mix(P.dim, P.deep, 0.45));
        g.polyStroke(pts, alpha(P.a, 0.6), 1.6, true);
      }
      const px = W * 0.5, py = H * 0.5;
      g.bloom(px, py, 46, P.a, 0.5);
      S.ship(g, px, py, 15, Math.sin(t * 0.7) * 0.8 - Math.PI / 2, P.ink, P.c, 0.5 + Math.sin(t * 8) * 0.3);
    },

    orbit(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.46;
      g.bloom(cx, cy, 70, P.b, 0.7);
      g.circle(cx, cy, 26, mix(P.d, '#000', 0.2));
      g.ring(cx, cy, 26, 3, P.b);
      g.ring(cx, cy, 62, 1.5, alpha(P.a, 0.3));
      for (let i = 0; i < 3; i++) {
        const a = t * 1.1 + i * (TAU / 3);
        g.push(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62, a + Math.PI / 2);
        g.poly([0, -11, 8, 8, -8, 8], P.c);
        g.pop();
      }
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const a = i * (TAU / 7) + t * 0.5;
        const d = 74 + ((t * 130 + i * 40) % 90);
        g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, P.a);
      }
      g.ctx.globalCompositeOperation = 'source-over';
    },

    twin(g, W, H, P, rng, t) {
      const cx = W * 0.42, cy = H * 0.5;
      g.ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 2; s++) {
        const base = s ? -0.5 : 0.35;
        for (let i = 0; i < 12; i++) {
          const a = base + Math.sin(t * 0.8 + s) * 0.25;
          const d = ((t * 300 + i * 34) % 300);
          g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4.5 - d / 120, s ? P.c : P.a);
        }
      }
      g.ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) {
        const a = t * 0.6 + i * 1.7;
        S.blob(g, W * 0.78 + Math.cos(a) * 40, H * 0.34 + Math.sin(a) * 34, 13, P.b, t + i);
      }
      g.circle(cx, cy, 15, P.ink);
      g.circle(cx, cy, 9, P.d);
      g.ring(cx, cy, 22, 2, alpha(P.a, 0.5));
    },

    swarm(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.44;
      g.ctx.globalCompositeOperation = 'lighter';
      for (let ring = 0; ring < 4; ring++) {
        const n = 14 + ring * 4;
        const rad = 34 + ring * 30 + Math.sin(t * 1.2 + ring) * 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + t * (ring % 2 ? 0.5 : -0.5) + ring;
          g.circle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8, 4.5, [P.a, P.b, P.c, P.d][ring]);
        }
      }
      g.ctx.globalCompositeOperation = 'source-over';
      g.circle(cx, cy, 9, P.ink);
      g.ring(cx, cy, 15, 2, alpha(P.ink, 0.5));
    },

    tank(g, W, H, P, rng, t) {
      g.rect(0, H * 0.62, W, H * 0.38, mix(P.deep, P.d, 0.3));
      for (let i = 0; i < 6; i++) g.rrect(20 + i * 66, H * 0.5 + (i % 2) * 22, 34, 40, 6, alpha(P.dim, 0.25));
      const tank = (x, y, col, dir) => {
        g.rrect(x - 26, y - 12, 52, 20, 6, col);
        g.rrect(x - 14, y - 24, 28, 14, 5, shade(col, -0.15));
        g.rect(x + (dir > 0 ? 12 : -34), y - 20, 22, 5, shade(col, -0.25));
        for (let i = 0; i < 4; i++) g.circle(x - 18 + i * 12, y + 9, 6, mix(col, '#000', 0.5));
      };
      tank(W * 0.24, H * 0.62, P.a, 1);
      tank(W * 0.76, H * 0.62, P.b, -1);
      g.ctx.globalCompositeOperation = 'lighter';
      const k = (t * 0.55) % 1;
      const bx = lerp(W * 0.32, W * 0.68, k), by = H * 0.55 - Math.sin(k * Math.PI) * 60;
      g.circle(bx, by, 5, P.c);
      g.bloom(bx, by, 22, P.c, 0.7);
      g.ctx.globalCompositeOperation = 'source-over';
    },

    dodge(g, W, H, P, rng, t) {
      for (let i = 0; i < 12; i++) {
        const x = rng.float(-40, W), sp = rng.float(80, 190);
        const y = ((t * sp + i * 90) % (H + 160)) - 80;
        const l = 34 + sp * 0.16;
        g.ctx.globalCompositeOperation = 'lighter';
        g.capsule(x, y, x - l * 0.45, y - l, 4, alpha([P.a, P.b, P.c][i % 3], 0.75));
        g.circle(x, y, 6, P.ink);
        g.ctx.globalCompositeOperation = 'source-over';
      }
      const px = W / 2 + Math.sin(t * 1.4) * 74;
      g.bloom(px, H * 0.72, 34, P.c, 0.6);
      S.ship(g, px, H * 0.72, 15, -Math.PI / 2, P.ink, P.c, 0.7);
    },

    shield(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.46;
      g.circle(cx, cy, 24, mix(P.d, '#000', 0.25));
      g.ring(cx, cy, 24, 2.5, P.a);
      const a0 = t * 1.5;
      const c = g.ctx;
      c.save(); c.lineCap = 'round';
      g.ring(cx, cy, 54, 12, alpha(P.c, 0.9), a0 - 0.7, a0 + 0.7);
      g.ring(cx, cy, 54, 4, alpha(P.ink, 0.5), a0 - 0.7, a0 + 0.7);
      c.restore();
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const a = i * (TAU / 6) + t * 0.4;
        const d = 130 - ((t * 90 + i * 30) % 90);
        g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 5, P.b);
      }
      g.ctx.globalCompositeOperation = 'source-over';
    },

    defender(g, W, H, P, rng, t) {
      const hy = H * 0.72;
      const c = g.ctx;
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) {
        c.lineTo(x, hy + Math.sin(x * 0.03 + 1) * 12 + Math.sin(x * 0.011) * 16);
      }
      c.lineTo(W, H); c.closePath();
      c.fillStyle = mix(P.deep, P.d, 0.35); c.fill();
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 96;
        S.bot(g, x, hy - 8 + Math.sin(t * 2 + i) * 3, 9, P.c, P.ink, t + i);
      }
      const px = ((t * 90) % (W + 120)) - 60;
      g.push(px, H * 0.4);
      g.poly([26, 0, -14, -11, -22, 0, -14, 11], P.a);
      g.poly([6, 0, -12, -6, -12, 6], P.ink);
      g.pop();
      g.ctx.globalCompositeOperation = 'lighter';
      g.rect(px + 26, H * 0.4 - 2, 90, 4, alpha(P.b, 0.8));
      g.ctx.globalCompositeOperation = 'source-over';
    },

    tunnel(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.44;
      const c = g.ctx;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const k = ((i / 12) + (t * 0.4) % (1 / 12)) % 1;
        const r = Math.pow(k, 2.1) * 250 + 8;
        const rot = k * 1.6 + t * 0.4;
        c.globalAlpha = 0.15 + k * 0.5;
        c.strokeStyle = mix(P.a, P.b, k);
        c.lineWidth = 2 + k * 5;
        c.beginPath();
        for (let s = 0; s <= 6; s++) {
          const a = (s / 6) * TAU + rot;
          const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.86;
          s ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.stroke();
      }
      c.restore();
      g.bloom(cx, cy, 40, P.c, 0.8);
      g.circle(cx, cy + 60, 7, P.ink);
    },

    lander(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.beginPath(); c.moveTo(0, H);
      let y = H * 0.78;
      for (let x = 0; x <= W; x += 26) {
        y = H * 0.74 + Math.sin(x * 0.05) * 16 + (x > W * 0.55 && x < W * 0.72 ? -6 : 0);
        c.lineTo(x, y);
      }
      c.lineTo(W, H); c.closePath();
      c.fillStyle = mix(P.dim, P.deep, 0.55); c.fill();
      c.strokeStyle = alpha(P.ink, 0.35); c.lineWidth = 1.5; c.stroke();
      g.rect(W * 0.55, H * 0.74 - 3, W * 0.17, 4, P.c);
      const px = W * 0.36 + Math.sin(t * 0.7) * 18, py = H * 0.4 + Math.sin(t * 1.3) * 10;
      g.push(px, py, Math.sin(t * 0.7) * 0.2);
      g.rrect(-13, -11, 26, 20, 6, P.ink);
      g.rect(-9, -6, 18, 8, mix(P.a, '#000', 0.3));
      g.line(-10, 9, -16, 20, P.dim, 2.5); g.line(10, 9, 16, 20, P.dim, 2.5);
      g.ctx.globalCompositeOperation = 'lighter';
      const th = 0.5 + Math.sin(t * 14) * 0.3;
      g.poly([-6, 10, 6, 10, 0, 10 + 26 * th], alpha(P.c, 0.9));
      g.ctx.globalCompositeOperation = 'source-over';
      g.pop();
    },

    drone(g, W, H, P, rng, t) {
      for (let i = 0; i < 5; i++) {
        const x = W * (0.16 + i * 0.17) + Math.sin(t * 1.2 + i) * 16;
        const y = H * 0.34 + Math.cos(t * 1.5 + i * 1.3) * 26;
        g.push(x, y);
        g.rrect(-14, -5, 28, 10, 5, mix(P.d, P.ink, 0.15));
        g.ctx.globalAlpha = 0.5;
        g.ring(-16, -8, 9, 2, P.a); g.ring(16, -8, 9, 2, P.a);
        g.ctx.globalAlpha = 1;
        g.circle(0, 0, 3.5, P.b);
        g.pop();
      }
      const mx = W * 0.5 + Math.sin(t) * 60, my = H * 0.56;
      g.ring(mx, my, 22, 2, alpha(P.c, 0.9));
      g.line(mx - 32, my, mx - 12, my, P.c, 2);
      g.line(mx + 12, my, mx + 32, my, P.c, 2);
      g.line(mx, my - 32, mx, my - 12, P.c, 2);
      g.line(mx, my + 12, mx, my + 32, P.c, 2);
    },

    guard(g, W, H, P, rng, t) {
      for (let i = 0; i < 8; i++) {
        const x = ((i * 53 + t * 20) % (W + 40)) - 20;
        const y = ((i * 71 + t * 130) % (H + 40)) - 20;
        g.circle(x, y, 1.6, alpha(P.ink, 0.5));
      }
      const px = W * 0.5 + Math.sin(t * 1.1) * 40, py = H * 0.62;
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const yy = py - 30 - ((t * 380 + i * 55) % 220);
        g.capsule(px, yy, px, yy - 16, 3, P.c);
        g.capsule(px - 14, yy + 20, px - 14, yy + 6, 2, alpha(P.a, 0.8));
        g.capsule(px + 14, yy + 20, px + 14, yy + 6, 2, alpha(P.a, 0.8));
      }
      g.ctx.globalCompositeOperation = 'source-over';
      S.ship(g, px, py, 19, -Math.PI / 2, P.ink, P.a, 0.8);
      for (let i = 0; i < 3; i++) {
        const x = W * (0.2 + i * 0.3), y = H * 0.2 + Math.sin(t * 2 + i) * 10;
        S.blob(g, x, y, 15, [P.b, P.d, P.b][i], t + i);
      }
    },

    /* ---------------------------------------------------------- ARCADE */
    snake(g, W, H, P, rng, t) {
      const cell = 26, n = 16;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const k = t * 2.2 - i * 0.36;
        pts.push(W * 0.5 + Math.cos(k * 0.8) * 118, H * 0.44 + Math.sin(k) * 58);
      }
      const c = g.ctx;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round'; c.lineJoin = 'round';
      g.polyStroke(pts, alpha(P.a, 0.22), 30);
      c.restore();
      for (let i = n - 1; i >= 0; i--) {
        const r = 12 - i * 0.36;
        g.circle(pts[i * 2], pts[i * 2 + 1], r, mix(P.a, P.b, i / n));
      }
      g.circle(pts[0], pts[1], 13, P.ink);
      g.circle(pts[0] - 4, pts[1] - 3, 3, P.deep);
      g.circle(pts[0] + 4, pts[1] - 3, 3, P.deep);
      const fx = W * 0.24, fy = H * 0.3;
      g.bloom(fx, fy, 24, P.c, 0.8);
      g.circle(fx, fy, 9 + Math.sin(t * 5) * 1.2, P.c);
    },

    bricks(g, W, H, P, rng, t) {
      const cols = 8, bw = (W - 40) / cols, bh = 16;
      for (let r = 0; r < 4; r++) {
        for (let cI = 0; cI < cols; cI++) {
          if ((r * cols + cI) % 11 === 3) continue;
          const x = 20 + cI * bw, y = 26 + r * (bh + 7);
          const col = [P.a, P.b, P.c, P.d][r];
          g.rrect(x + 2, y, bw - 4, bh, 4, col);
          g.rrect(x + 2, y, bw - 4, bh * 0.42, 4, alpha('#ffffff', 0.22));
        }
      }
      const bx = W * 0.5 + Math.sin(t * 1.7) * 110, by = H * 0.56 + Math.cos(t * 2.3) * 26;
      g.bloom(bx, by, 26, P.ink, 0.7);
      g.circle(bx, by, 8, P.ink);
      const px = clamp(bx, 60, W - 60);
      g.rrect(px - 40, H * 0.75, 80, 12, 6, P.c);
      g.rrect(px - 40, H * 0.75, 80, 5, 6, alpha('#ffffff', 0.35));
    },

    paddle(g, W, H, P, rng, t) {
      g.ctx.setLineDash([8, 10]);
      g.line(W / 2, 14, W / 2, H * 0.8, alpha(P.ink, 0.28), 3);
      g.ctx.setLineDash([]);
      const by = H * 0.44 + Math.sin(t * 2.1) * 60;
      const bx = W / 2 + Math.sin(t * 1.35) * 130;
      g.rrect(24, by - 30 + Math.sin(t * 1.35) * 10, 12, 60, 6, P.a);
      g.rrect(W - 36, H * 0.44 - 30 + Math.cos(t * 1.1) * 26, 12, 60, 6, P.b);
      g.ctx.globalCompositeOperation = 'lighter';
      g.capsule(bx - 26, by - 10, bx, by, 6, alpha(P.c, 0.35));
      g.ctx.globalCompositeOperation = 'source-over';
      g.circle(bx, by, 9, P.c);
      g.text('3', W * 0.36, 44, { size: 30, color: alpha(P.ink, 0.35), align: 'center', weight: 900 });
      g.text('2', W * 0.64, 44, { size: 30, color: alpha(P.ink, 0.35), align: 'center', weight: 900 });
    },

    catch(g, W, H, P, rng, t) {
      for (let i = 0; i < 9; i++) {
        const x = 24 + ((i * 47) % (W - 48));
        const y = ((t * (70 + i * 12) + i * 60) % (H + 60)) - 30;
        const col = i % 4 === 0 ? P.c : i % 3 === 0 ? P.b : P.a;
        g.ctx.globalCompositeOperation = 'lighter';
        g.bloom(x, y, 16, col, 0.5);
        g.ctx.globalCompositeOperation = 'source-over';
        g.star(x, y, 9, 4, 5, t * 2 + i, col);
      }
      const px = W / 2 + Math.sin(t * 1.6) * 100;
      g.rrect(px - 34, H * 0.78, 68, 18, 9, P.d);
      g.rrect(px - 34, H * 0.78, 68, 7, 9, alpha('#ffffff', 0.25));
      g.circle(px, H * 0.78 - 8, 5, P.c);
    },

    pinball(g, W, H, P, rng, t) {
      g.rrect(W * 0.2, 12, W * 0.6, H * 0.8, 40, alpha(P.deep, 0.55));
      g.rrectStroke(W * 0.2, 12, W * 0.6, H * 0.8, 40, alpha(P.a, 0.4), 2);
      [[0.36, 0.26], [0.64, 0.26], [0.5, 0.42]].forEach((p, i) => {
        const x = W * p[0], y = H * p[1];
        g.bloom(x, y, 24, P.b, 0.5);
        g.circle(x, y, 14, mix(P.b, '#000', 0.2));
        g.ring(x, y, 14, 2.5, P.ink);
        g.circle(x, y, 6 + Math.sin(t * 4 + i) * 1.6, P.c);
      });
      const bx = W * 0.5 + Math.sin(t * 2) * 60, by = H * 0.55 + Math.cos(t * 2.6) * 40;
      g.circle(bx, by, 8, '#dfe7f5');
      g.circle(bx - 2, by - 3, 3, '#fff');
      g.push(W * 0.37, H * 0.74, 0.5 + Math.sin(t * 4) * 0.35);
      g.capsule(0, 0, 34, 0, 7, P.c); g.pop();
      g.push(W * 0.63, H * 0.74, Math.PI - 0.5 - Math.sin(t * 4) * 0.35);
      g.capsule(0, 0, 34, 0, 7, P.c); g.pop();
    },

    stack(g, W, H, P, rng, t) {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const w = 130 - i * 5;
        const off = Math.sin(t * 1.2 + i * 0.5) * (i > n - 3 ? 26 : 4);
        const y = H * 0.82 - i * 17;
        g.rrect(W / 2 - w / 2 + off, y, w, 15, 4, mix(P.a, P.b, i / n));
        g.rrect(W / 2 - w / 2 + off, y, w, 5, 4, alpha('#ffffff', 0.22));
      }
      const fw = 110, fo = Math.sin(t * 2.4) * 80;
      g.ctx.globalAlpha = 0.9;
      g.rrect(W / 2 - fw / 2 + fo, H * 0.82 - n * 17, fw, 15, 4, P.c);
      g.ctx.globalAlpha = 1;
    },

    /* ------------------------------------------------------ PLATAFORMAS */
    jump(g, W, H, P, rng, t) {
      const plats = [[0.2, 0.78], [0.58, 0.66], [0.3, 0.5], [0.7, 0.36], [0.42, 0.22]];
      plats.forEach((p, i) => {
        const x = W * p[0] + Math.sin(t * 0.8 + i) * 6, y = H * p[1];
        g.rrect(x - 34, y, 68, 12, 6, i === 3 ? P.c : P.d);
        g.rrect(x - 34, y, 68, 4, 6, alpha('#ffffff', 0.25));
      });
      const k = (Math.sin(t * 2.4) + 1) / 2;
      const hx = W * 0.44, hy = lerp(H * 0.5, H * 0.28, k);
      g.bloom(hx, hy, 26, P.a, 0.5);
      S.blob(g, hx, hy, 15, P.a, t);
    },

    wall(g, W, H, P, rng, t) {
      g.rect(0, 0, 54, H, mix(P.deep, P.dim, 0.28));
      g.rect(W - 54, 0, 54, H, mix(P.deep, P.dim, 0.28));
      for (let i = 0; i < 8; i++) {
        g.rect(0, i * 34 + 6, 54, 3, alpha(P.ink, 0.07));
        g.rect(W - 54, i * 34 + 18, 54, 3, alpha(P.ink, 0.07));
      }
      for (let i = 0; i < 3; i++) {
        const y = H * (0.2 + i * 0.27), a = t * 3 + i;
        const x = i % 2 ? W - 84 : 84;
        g.push(x, y, a);
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * TAU;
          g.poly([Math.cos(ang) * 20, Math.sin(ang) * 20,
                  Math.cos(ang + 0.2) * 13, Math.sin(ang + 0.2) * 13,
                  Math.cos(ang - 0.2) * 13, Math.sin(ang - 0.2) * 13], P.b);
        }
        g.circle(0, 0, 12, mix(P.b, '#000', 0.3));
        g.pop();
      }
      const k2 = (Math.sin(t * 1.8) + 1) / 2;
      const hx = lerp(72, W - 72, k2), hy = H * 0.55 - Math.abs(Math.sin(t * 1.8)) * 10;
      g.push(hx, hy, (k2 - 0.5) * 0.6);
      g.rrect(-11, -14, 22, 28, 7, P.a);
      g.rect(-6, -8, 12, 5, P.deep);
      g.pop();
    },

    runner(g, W, H, P, rng, t) {
      const gy = H * 0.72;
      g.rect(0, gy, W, H - gy, mix(P.deep, P.d, 0.4));
      for (let i = 0; i < 5; i++) {
        const x = ((i * 110 - t * 90) % (W + 120)) - 60;
        g.rrect(x, gy - 46, 26, 46, 5, alpha(P.dim, 0.35));
      }
      for (let i = 0; i < 3; i++) {
        const x = ((i * 170 - t * 190) % (W + 200)) - 80;
        g.rrect(x, gy - 34, 30, 34, 6, P.b);
        g.poly([x, gy - 34, x + 15, gy - 52, x + 30, gy - 34], P.c);
      }
      const jump = Math.max(0, Math.sin(t * 3.1)) * 54;
      const hx = W * 0.3, hy = gy - 20 - jump;
      g.ctx.globalCompositeOperation = 'lighter';
      g.rrect(hx - 34, hy - 12, 30, 24, 12, alpha(P.a, 0.25));
      g.ctx.globalCompositeOperation = 'source-over';
      g.rrect(hx - 14, hy - 16, 28, 32, 9, P.a);
      g.rect(hx - 7, hy - 8, 14, 6, P.deep);
    },

    gravity(g, W, H, P, rng, t) {
      const flip = Math.sin(t * 1.1) > 0;
      g.rect(0, 0, W, 26, mix(P.d, P.deep, 0.35));
      g.rect(0, H - 26, W, 26, mix(P.d, P.deep, 0.35));
      for (let i = 0; i < 6; i++) {
        const x = ((i * 92 - t * 110) % (W + 100)) - 50;
        g.poly([x, 26, x + 12, 46, x + 24, 26], P.b);
        g.poly([x + 46, H - 26, x + 58, H - 46, x + 70, H - 26], P.b);
      }
      const hy = flip ? 52 : H - 52;
      const hx = W * 0.34;
      g.ctx.globalCompositeOperation = 'lighter';
      g.capsule(hx, hy, hx, flip ? hy + 40 : hy - 40, 8, alpha(P.a, 0.22));
      g.ctx.globalCompositeOperation = 'source-over';
      g.push(hx, hy, flip ? Math.PI : 0);
      g.rrect(-13, -15, 26, 30, 8, P.a);
      g.rect(-7, -6, 14, 5, P.deep);
      g.pop();
      g.text(flip ? '▲' : '▼', W * 0.72, H * 0.5, { size: 44, color: alpha(P.c, 0.7), align: 'center', weight: 900 });
    },

    cave(g, W, H, P, rng, t) {
      const c = g.ctx;
      const top = (x) => 30 + Math.sin((x + t * 60) * 0.014) * 24 + Math.sin((x + t * 60) * 0.037) * 12;
      const bot = (x) => H - 30 + Math.sin((x + t * 60) * 0.016 + 2) * 26 + Math.sin((x + t * 60) * 0.04) * 10;
      c.fillStyle = mix(P.deep, P.d, 0.42);
      c.beginPath(); c.moveTo(0, 0);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, top(x));
      c.lineTo(W, 0); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, bot(x));
      c.lineTo(W, H); c.closePath(); c.fill();
      c.strokeStyle = alpha(P.c, 0.5); c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) x ? c.lineTo(x, top(x)) : c.moveTo(x, top(x));
      c.stroke();
      const px = W * 0.33, py = H * 0.5 + Math.sin(t * 2.6) * 26;
      g.bloom(px, py, 30, P.a, 0.6);
      g.push(px, py, Math.sin(t * 2.6) * 0.35);
      g.circle(0, 0, 13, P.a);
      g.poly([-4, -2, -20, -8, -18, 4], alpha(P.c, 0.9));
      g.circle(5, -3, 3.5, P.deep);
      g.pop();
    },

    bridge(g, W, H, P, rng, t) {
      const gy = H * 0.74;
      g.rect(0, gy, 96, H - gy, mix(P.d, P.deep, 0.3));
      g.rect(W - 130, gy, 130, H - gy, mix(P.d, P.deep, 0.3));
      const L = 90 + Math.sin(t * 1.3) * 60;
      const c = g.ctx;
      c.save(); c.translate(96, gy);
      c.rotate(lerp(-Math.PI / 2, 0, clamp01((Math.sin(t * 1.3 - 1) + 1) / 2)));
      g.rect(0, -4, L, 8, P.c);
      c.restore();
      const hx = 60 + Math.sin(t * 0.9) * 20;
      g.rrect(hx - 10, gy - 30, 20, 30, 7, P.a);
      g.circle(hx, gy - 36, 9, P.a);
      g.circle(W - 66, gy - 14, 10, P.b);
      g.star(W - 66, gy - 40, 8, 4, 5, t * 2, P.c);
    },

    swing(g, W, H, P, rng, t) {
      const ax = W * 0.62, ay = 24;
      const a = Math.sin(t * 1.5) * 0.7;
      const len = 120;
      const px = ax + Math.sin(a) * len, py = ay + Math.cos(a) * len;
      for (let i = 0; i < 5; i++) {
        const x = ((i * 100 - t * 40) % (W + 120)) - 60;
        g.rrect(x, H * 0.8, 70, 40, 8, alpha(P.dim, 0.22));
      }
      g.line(ax, ay, px, py, P.c, 2.5);
      g.circle(ax, ay, 6, P.c);
      g.ctx.globalCompositeOperation = 'lighter';
      g.bloom(px, py, 26, P.a, 0.5);
      g.ctx.globalCompositeOperation = 'source-over';
      g.circle(px, py, 15, P.a);
      g.circle(px - 5, py - 3, 3, P.deep); g.circle(px + 5, py - 3, 3, P.deep);
    },

    platform(g, W, H, P, rng, t) {
      const blocks = [[0.06, 0.82, 0.3], [0.46, 0.7, 0.2], [0.74, 0.56, 0.22], [0.2, 0.46, 0.16]];
      blocks.forEach((b) => {
        g.rrect(W * b[0], H * b[1], W * b[2], 16, 4, mix(P.d, P.ink, 0.1));
        g.rrect(W * b[0], H * b[1], W * b[2], 5, 4, alpha(P.a, 0.5));
      });
      for (let i = 0; i < 7; i++) {
        const x = W * 0.3 + i * 15;
        g.poly([x, H * 0.82, x + 7, H * 0.82 - 14, x + 14, H * 0.82], P.b);
      }
      const k = (Math.sin(t * 2) + 1) / 2;
      const hx = lerp(W * 0.14, W * 0.5, k), hy = H * 0.78 - Math.sin(k * Math.PI) * 56;
      g.rrect(hx - 11, hy - 13, 22, 26, 7, P.c);
      g.rect(hx - 6, hy - 6, 12, 5, P.deep);
      g.text('★', W * 0.83, H * 0.5, { size: 26, color: P.c, align: 'center' });
    },

    climb(g, W, H, P, rng, t) {
      g.rect(0, 0, W * 0.28, H, mix(P.deep, P.a, 0.18));
      g.rect(W * 0.72, 0, W * 0.28, H, mix(P.deep, P.a, 0.18));
      for (let i = 0; i < 9; i++) {
        const y = ((i * 44 + t * 40) % (H + 60)) - 30;
        const x = i % 2 ? W * 0.34 : W * 0.58;
        g.rrect(x, y, 46, 12, 6, i % 3 === 0 ? P.c : P.b);
      }
      const hy = H * 0.5, hx = W * 0.46 + Math.sin(t * 2) * 40;
      g.rrect(hx - 12, hy - 15, 24, 30, 8, P.ink);
      g.rect(hx - 6, hy - 7, 12, 5, P.deep);
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const x = ((i * 71 + t * 30) % W), y = ((i * 53 + t * 90) % H);
        g.circle(x, y, 1.8, alpha('#ffffff', 0.5));
      }
      g.ctx.globalCompositeOperation = 'source-over';
    },

    mine(g, W, H, P, rng, t) {
      const cell = 34;
      for (let r = 0; r < 5; r++) {
        for (let c2 = 0; c2 < 12; c2++) {
          const x = c2 * cell, y = H * 0.34 + r * cell;
          const seed = (r * 13 + c2 * 7) % 11;
          if (seed === 2 || (r === 0 && c2 > 3 && c2 < 8)) continue;
          g.rect(x, y, cell - 2, cell - 2, mix(P.deep, P.d, 0.3 + (seed % 3) * 0.08));
          if (seed === 5) g.circle(x + cell / 2 - 1, y + cell / 2 - 1, 7, P.c);
          if (seed === 7) g.circle(x + cell / 2 - 1, y + cell / 2 - 1, 6, P.a);
        }
      }
      const hx = W * 0.42, hy = H * 0.3;
      g.rrect(hx - 13, hy - 14, 26, 28, 7, P.b);
      g.rect(hx - 7, hy - 6, 14, 5, P.deep);
      g.push(hx + 16, hy + 6, Math.sin(t * 9) * 0.35);
      g.poly([0, -5, 22, -2, 22, 2, 0, 5], P.ink);
      g.pop();
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const a = t * 8 + i;
        g.circle(hx + 34 + Math.cos(a) * 8, hy + 8 + Math.sin(a) * 8, 2, P.c);
      }
      g.ctx.globalCompositeOperation = 'source-over';
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
