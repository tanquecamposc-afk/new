/* NEXO ARCADE — motivos de portada B: puzles, mente y deportes. */
(function (global) {
  'use strict';
  const NX = global.NX, M = NX.M, GFX = NX.GFX;
  const { alpha, mix, shade } = GFX;
  const { TAU, clamp, clamp01, lerp } = M;
  const S = GFX.Sprites;

  /* Ficha cuadrada con relieve, reutilizada por varios motivos. */
  function tile(g, x, y, s, col, r) {
    g.rrect(x, y, s, s, r == null ? 7 : r, col);
    g.rrect(x, y, s, s * 0.36, r == null ? 7 : r, alpha('#ffffff', 0.16));
  }

  NX.Cover.add({
    /* ----------------------------------------------------------- PUZLES */
    numbers(g, W, H, P, rng, t) {
      const vals = [2, 8, 32, 4, 128, 16, 512, 64, 2048];
      const cols = [P.d, P.a, P.b, P.d, P.c, P.a, P.c, P.b, P.c];
      const s = 62, ox = W / 2 - s * 1.5 - 6, oy = H * 0.16;
      g.rrect(ox - 8, oy - 8, s * 3 + 28, s * 3 + 28, 12, alpha(P.deep, 0.6));
      for (let i = 0; i < 9; i++) {
        const r = (i / 3) | 0, c = i % 3;
        const pop = i === 8 ? 1 + Math.sin(t * 3) * 0.05 : 1;
        g.push(ox + c * (s + 6) + s / 2, oy + r * (s + 6) + s / 2, 0, pop);
        tile(g, -s / 2, -s / 2, s, cols[i], 9);
        g.text(String(vals[i]), 0, 7, {
          size: vals[i] > 999 ? 19 : vals[i] > 99 ? 23 : 27, align: 'center',
          color: i === 8 ? P.deep : '#0d1220', weight: 900,
        });
        g.pop();
      }
    },

    tetro(g, W, H, P, rng, t) {
      const s = 22, ox = W * 0.5 - s * 5, oy = 16;
      g.rrect(ox - 6, oy - 6, s * 10 + 12, H * 0.86, 10, alpha(P.deep, 0.55));
      const stack = [[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[0,6],[1,6],[2,6],[7,6],[8,6],[0,5],[1,5],[8,5]];
      stack.forEach((c, i) => tile(g, ox + c[0] * s, oy + c[1] * s + 30, s - 2, [P.a, P.b, P.d][i % 3], 4));
      const fall = ((t * 60) % 120);
      const piece = [[0,0],[1,0],[2,0],[1,1]];
      piece.forEach((c) => tile(g, ox + (c[0] + 3) * s, oy + c[1] * s + fall, s - 2, P.c, 4));
      g.ctx.globalCompositeOperation = 'lighter';
      g.rect(ox, oy + 7 * s + 30, s * 9, s - 2, alpha(P.ink, 0.15 + Math.sin(t * 6) * 0.1));
      g.ctx.globalCompositeOperation = 'source-over';
    },

    gems(g, W, H, P, rng, t) {
      const s = 42, cols = 7, rows = 4;
      const ox = W / 2 - cols * s / 2, oy = H * 0.16;
      const cs = [P.a, P.b, P.c, P.d, mix(P.a, P.c, 0.5)];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * 7 + c * 3) % 5;
          const x = ox + c * s + s / 2, y = oy + r * s + s / 2;
          const pop = (r === 1 && c > 1 && c < 5) ? 1 + Math.sin(t * 6) * 0.14 : 1;
          g.push(x, y, t * 0.2 + i, pop);
          g.ngon(0, 0, s * 0.36, i % 2 ? 6 : 4, 0, cs[i]);
          g.ngon(0, -2, s * 0.2, i % 2 ? 6 : 4, 0, alpha('#ffffff', 0.3));
          g.pop();
        }
      }
    },

    mines(g, W, H, P, rng, t) {
      const s = 34, cols = 9, rows = 5;
      const ox = W / 2 - cols * s / 2, oy = H * 0.14;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c, x = ox + c * s, y = oy + r * s;
          const open = (i * 7 % 11) > 4;
          if (open) {
            g.rrect(x + 1, y + 1, s - 2, s - 2, 4, alpha(P.deep, 0.7));
            const n = (i * 13) % 4;
            if (n) g.text(String(n), x + s / 2, y + s * 0.68, {
              size: 17, align: 'center', weight: 900, color: [P.a, P.c, P.b, P.d][n] });
          } else {
            tile(g, x + 1, y + 1, s - 2, mix(P.d, P.dim, 0.35), 4);
            if (i % 17 === 3) {
              g.poly([x + 11, y + 8, x + 24, y + 13, x + 11, y + 18], P.b);
              g.rect(x + 10, y + 8, 2, 18, P.ink);
            }
          }
        }
      }
      const bx = ox + s * 4.5, by = oy + s * 2.5;
      g.bloom(bx, by, 26, P.b, 0.5 + Math.sin(t * 4) * 0.2);
      g.circle(bx, by, 11, P.deep);
      g.circle(bx - 3, by - 3, 3, P.ink);
    },

    sudoku(g, W, H, P, rng, t) {
      const s = 26, N = 9, ox = W / 2 - N * s / 2, oy = H * 0.1;
      g.rrect(ox - 6, oy - 6, N * s + 12, N * s + 12, 8, alpha(P.deep, 0.62));
      const c = g.ctx;
      c.strokeStyle = alpha(P.ink, 0.14); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        c.moveTo(ox + i * s, oy); c.lineTo(ox + i * s, oy + N * s);
        c.moveTo(ox, oy + i * s); c.lineTo(ox + N * s, oy + i * s);
      }
      c.stroke();
      c.strokeStyle = alpha(P.a, 0.6); c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 3; i++) {
        c.moveTo(ox + i * 3 * s, oy); c.lineTo(ox + i * 3 * s, oy + N * s);
        c.moveTo(ox, oy + i * 3 * s); c.lineTo(ox + N * s, oy + i * 3 * s);
      }
      c.stroke();
      for (let i = 0; i < 26; i++) {
        const r = (i * 5) % N, cc = (i * 7) % N;
        const v = ((r * 3 + Math.floor(r / 3) + cc) % 9) + 1;
        g.text(String(v), ox + cc * s + s / 2, oy + r * s + s * 0.72, {
          size: 16, align: 'center', weight: 700, color: i % 4 ? alpha(P.ink, 0.8) : P.c });
      }
      const hr = Math.floor(t * 1.2) % N, hc = Math.floor(t * 0.7) % N;
      g.rect(ox + hc * s + 1, oy + hr * s + 1, s - 2, s - 2, alpha(P.a, 0.22));
    },

    slide(g, W, H, P, rng, t) {
      const s = 52, N = 4, ox = W / 2 - N * s / 2, oy = H * 0.1;
      g.rrect(ox - 7, oy - 7, N * s + 14, N * s + 14, 10, alpha(P.deep, 0.6));
      const order = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
      const shift = Math.sin(t * 1.6) * 0.5 + 0.5;
      order.forEach((v, i) => {
        if (!v) return;
        const r = (i / N) | 0, c = i % N;
        let x = ox + c * s, y = oy + r * s;
        if (i === 14) x += shift * s;
        tile(g, x + 2, y + 2, s - 4, mix(P.a, P.b, (v - 1) / 15), 8);
        g.text(String(v), x + s / 2, y + s * 0.66, { size: 22, align: 'center', weight: 900, color: '#0d1220' });
      });
    },

    pipes(g, W, H, P, rng, t) {
      const s = 46, cols = 7, rows = 4;
      const ox = W / 2 - cols * s / 2, oy = H * 0.14;
      const c = g.ctx;
      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const i = r * cols + cc, x = ox + cc * s + s / 2, y = oy + r * s + s / 2;
          g.rrect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4, 6, alpha(P.deep, 0.5));
          const kind = (i * 5) % 3;
          const rot = ((i * 3) % 4) * (Math.PI / 2) + (i === 10 ? t * 1.6 : 0);
          const lit = (i * 5) % 4 !== 0;
          const col = lit ? P.a : alpha(P.dim, 0.6);
          g.push(x, y, rot);
          c.lineCap = 'round';
          if (kind === 0) { g.line(-s * 0.36, 0, s * 0.36, 0, col, 7); }
          else if (kind === 1) { g.line(-s * 0.36, 0, 0, 0, col, 7); g.line(0, 0, 0, s * 0.36, col, 7); }
          else { g.line(-s * 0.36, 0, s * 0.36, 0, col, 7); g.line(0, 0, 0, s * 0.36, col, 7); }
          g.pop();
        }
      }
    },

    sokoban(g, W, H, P, rng, t) {
      const s = 40, cols = 8, rows = 4;
      const ox = W / 2 - cols * s / 2, oy = H * 0.16;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        g.rect(ox + c * s, oy + r * s, s - 1, s - 1, (r + c) % 2 ? alpha(P.deep, 0.5) : alpha(P.d, 0.28));
      }
      [[1, 1], [5, 0], [6, 3]].forEach((p) => {
        g.ring(ox + p[0] * s + s / 2, oy + p[1] * s + s / 2, 11, 3, P.c);
      });
      const off = Math.sin(t * 1.4) * s * 0.45;
      [[3, 1, off], [5, 2, 0]].forEach((p) => {
        const x = ox + p[0] * s + p[2], y = oy + p[1] * s;
        g.rrect(x + 4, y + 4, s - 8, s - 8, 5, mix(P.a, '#8a5a2a', 0.4));
        g.line(x + 6, y + 6, x + s - 6, y + s - 6, alpha('#000', 0.25), 2);
        g.line(x + s - 6, y + 6, x + 6, y + s - 6, alpha('#000', 0.25), 2);
      });
      const px = ox + 2 * s + s / 2 + off, py = oy + s * 1.5;
      S.blob(g, px, py, 13, P.b, t);
    },

    maze(g, W, H, P, rng, t) {
      const s = 24, cols = 15, rows = 8;
      const ox = W / 2 - cols * s / 2, oy = H * 0.12;
      const c = g.ctx;
      c.strokeStyle = alpha(P.a, 0.75); c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath();
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const h = (r * 31 + cc * 17) % 5;
        const x = ox + cc * s, y = oy + r * s;
        if (h < 2) { c.moveTo(x, y); c.lineTo(x + s, y); }
        if (h === 2 || h === 4) { c.moveTo(x, y); c.lineTo(x, y + s); }
      }
      c.stroke();
      const k = (t * 0.4) % 1;
      const px = ox + s * (1.5 + Math.floor(k * 12)), py = oy + s * (1.5 + (Math.floor(k * 12) % 3));
      g.bloom(px, py, 46, P.c, 0.5);
      g.circle(px, py, 8, P.c);
    },

    hanoi(g, W, H, P, rng, t) {
      const by = H * 0.76;
      g.rect(W * 0.08, by, W * 0.84, 10, mix(P.d, P.deep, 0.2));
      [0.26, 0.5, 0.74].forEach((p) => g.rect(W * p - 3, by - 90, 6, 90, mix(P.dim, P.deep, 0.4)));
      const discs = [[0.26, 0, 96], [0.26, 1, 78], [0.26, 2, 60], [0.74, 0, 42]];
      discs.forEach((d, i) => {
        const y = by - 14 - d[1] * 16;
        g.rrect(W * d[0] - d[2] / 2, y, d[2], 14, 7, [P.a, P.b, P.c, P.d][i]);
        g.rrect(W * d[0] - d[2] / 2, y, d[2], 5, 7, alpha('#ffffff', 0.25));
      });
      const k = (Math.sin(t * 1.4) + 1) / 2;
      const fx = lerp(W * 0.26, W * 0.5, k), fy = by - 100 - Math.sin(k * Math.PI) * 24;
      g.rrect(fx - 15, fy, 30, 14, 7, P.c);
    },

    nonogram(g, W, H, P, rng, t) {
      const s = 24, N = 8, ox = W / 2 - N * s / 2 + 20, oy = H * 0.2;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const on = ((r * 3 + c * 5) % 7) < 3;
        const x = ox + c * s, y = oy + r * s;
        g.rect(x + 1, y + 1, s - 2, s - 2, on ? P.a : alpha(P.deep, 0.55));
        if (!on && (r + c) % 5 === 0) {
          g.line(x + 7, y + 7, x + s - 7, y + s - 7, alpha(P.dim, 0.7), 2);
          g.line(x + s - 7, y + 7, x + 7, y + s - 7, alpha(P.dim, 0.7), 2);
        }
      }
      for (let r = 0; r < N; r++) g.text(String(((r * 3) % 4) + 1), ox - 10, oy + r * s + s * 0.7,
        { size: 13, align: 'right', color: P.dim, weight: 800 });
      for (let c = 0; c < N; c++) g.text(String(((c * 5) % 4) + 1), ox + c * s + s / 2, oy - 6,
        { size: 13, align: 'center', color: P.dim, weight: 800 });
    },

    lights(g, W, H, P, rng, t) {
      const s = 50, N = 5, ox = W / 2 - N * s / 2, oy = H * 0.14;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const i = r * N + c;
        const on = Math.sin(t * 1.2 + i * 0.9) > -0.1;
        const x = ox + c * s + s / 2, y = oy + r * s + s / 2;
        if (on) g.bloom(x, y, 30, P.c, 0.6);
        g.rrect(x - s / 2 + 4, y - s / 2 + 4, s - 8, s - 8, 10, on ? P.c : alpha(P.deep, 0.7));
        if (on) g.rrect(x - s / 2 + 4, y - s / 2 + 4, s - 8, (s - 8) * 0.4, 10, alpha('#ffffff', 0.28));
        else g.rrectStroke(x - s / 2 + 4, y - s / 2 + 4, s - 8, s - 8, 10, alpha(P.a, 0.25), 1.5);
      }
    },

    flow(g, W, H, P, rng, t) {
      const s = 40, N = 6, ox = W / 2 - N * s / 2, oy = H * 0.12;
      const c = g.ctx;
      c.strokeStyle = alpha(P.ink, 0.08); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        c.moveTo(ox + i * s, oy); c.lineTo(ox + i * s, oy + N * s * 0.8);
        c.moveTo(ox, oy + i * s * 0.8); c.lineTo(ox + N * s, oy + i * s * 0.8);
      }
      c.stroke();
      const paths = [
        { col: P.a, pts: [[0, 0], [0, 2], [3, 2], [3, 0]] },
        { col: P.b, pts: [[1, 1], [1, 4], [4, 4]] },
        { col: P.c, pts: [[5, 0], [5, 3], [2, 3]] },
      ];
      c.lineCap = 'round'; c.lineJoin = 'round';
      paths.forEach((p, k) => {
        const pts = [];
        p.pts.forEach((q) => pts.push(ox + q[0] * s + s / 2, oy + q[1] * s * 0.8 + s * 0.4));
        c.globalAlpha = 0.9;
        g.polyStroke(pts, p.col, 12);
        c.globalAlpha = 1;
        g.circle(pts[0], pts[1], 11, p.col);
        g.circle(pts[pts.length - 2], pts[pts.length - 1], 11, p.col);
      });
    },

    unblock(g, W, H, P, rng, t) {
      const s = 42, N = 6, ox = W / 2 - N * s / 2, oy = H * 0.12;
      g.rrect(ox - 8, oy - 8, N * s + 16, N * s * 0.78 + 16, 10, alpha(P.deep, 0.6));
      const cars = [
        [0, 0, 2, 1, P.a], [3, 0, 1, 2, P.b], [0, 2, 2, 1, P.c],
        [4, 1, 1, 3, P.d], [1, 3, 3, 1, P.a], [2, 1, 2, 1, P.b],
      ];
      cars.forEach((c2, i) => {
        const x = ox + c2[0] * s + 3, y = oy + c2[1] * s * 0.78 + 3;
        const w = c2[2] * s - 6, h = c2[3] * s * 0.78 - 6;
        g.rrect(x, y, w, h, 8, c2[4]);
        g.rrect(x + 4, y + 4, w - 8, h * 0.34, 6, alpha('#ffffff', 0.2));
      });
      const off = (Math.sin(t * 1.3) + 1) / 2 * s * 0.7;
      g.rrect(ox + 1 * s + 3 + off, oy + 1.56 * s + 3, 2 * s - 6, s * 0.78 - 6, 8, '#e8384f');
      g.rrect(ox + 1 * s + 7 + off, oy + 1.56 * s + 7, 2 * s - 14, 9, 5, alpha('#ffffff', 0.25));
    },

    draw(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.lineCap = 'round'; c.lineJoin = 'round';
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const x = 30 + (i / 40) * (W - 60);
        pts.push(x, H * 0.42 + Math.sin(i * 0.24 + 0.4) * 34 + i * 1.4);
      }
      g.polyStroke(pts, alpha(P.a, 0.25), 14);
      g.polyStroke(pts, P.a, 6);
      const k = (t * 0.35) % 1;
      const idx = Math.floor(k * 39) * 2;
      g.bloom(pts[idx], pts[idx + 1] - 12, 26, P.c, 0.6);
      g.circle(pts[idx], pts[idx + 1] - 12, 11, P.c);
      g.circle(W - 44, H * 0.78, 14, alpha(P.b, 0.4));
      g.ring(W - 44, H * 0.78, 14, 2.5, P.b);
    },

    chain(g, W, H, P, rng, t) {
      const s = 44, cols = 7, rows = 4;
      const ox = W / 2 - cols * s / 2, oy = H * 0.14;
      const path = [8, 9, 16, 17, 18, 11];
      const c = g.ctx;
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const i = r * cols + cc, x = ox + cc * s + s / 2, y = oy + r * s + s / 2;
        const on = path.indexOf(i) >= 0;
        g.circle(x, y, s * 0.38, on ? P.c : alpha(P.d, 0.55));
        g.text(String(((i * 7) % 9) + 1), x, y + 6, {
          size: 17, align: 'center', weight: 900, color: on ? '#0d1220' : alpha(P.ink, 0.75) });
      }
      c.lineCap = 'round';
      const pts = [];
      path.forEach((i) => pts.push(ox + (i % cols) * s + s / 2, oy + Math.floor(i / cols) * s + s / 2));
      c.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
      g.polyStroke(pts, P.a, 8);
      c.globalAlpha = 1;
    },

    /* ------------------------------------------------------------ MENTE */
    memory(g, W, H, P, rng, t) {
      const s = 58, cols = 5, rows = 3;
      const ox = W / 2 - cols * s / 2, oy = H * 0.14;
      const syms = ['★', '●', '▲', '◆', '✚'];
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const i = r * cols + cc, x = ox + cc * s + 3, y = oy + r * s + 3;
        const open = i === 3 || i === 11 || (Math.floor(t * 0.7) % 5) === (i % 5);
        const flip = open ? 1 : Math.abs(Math.cos(t + i));
        g.push(x + (s - 6) / 2, y + (s - 6) / 2, 0, Math.max(0.12, open ? 1 : flip), 1);
        if (open) {
          g.rrect(-(s - 6) / 2, -(s - 6) / 2, s - 6, s - 6, 8, alpha(P.ink, 0.92));
          g.text(syms[i % 5], 0, 8, { size: 24, align: 'center', color: [P.a, P.b, P.c, P.d, P.a][i % 5] });
        } else {
          g.rrect(-(s - 6) / 2, -(s - 6) / 2, s - 6, s - 6, 8, mix(P.d, P.deep, 0.25));
          g.rrectStroke(-(s - 6) / 2 + 5, -(s - 6) / 2 + 5, s - 16, s - 16, 5, alpha(P.a, 0.4), 1.5);
        }
        g.pop();
      }
    },

    simon(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.46, R = 92;
      const cols = [P.a, P.b, P.c, P.d];
      const active = Math.floor(t * 1.6) % 4;
      for (let i = 0; i < 4; i++) {
        const a0 = i * (TAU / 4) - Math.PI / 2 + 0.03, a1 = a0 + TAU / 4 - 0.06;
        const on = i === active;
        const c = g.ctx;
        if (on) { c.save(); c.shadowColor = cols[i]; c.shadowBlur = 30; }
        c.fillStyle = on ? cols[i] : alpha(cols[i], 0.32);
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath(); c.fill();
        if (on) c.restore();
      }
      g.circle(cx, cy, 34, mix(P.deep, '#000', 0.3));
      g.ring(cx, cy, 34, 2, alpha(P.ink, 0.3));
      g.text(String(Math.floor(t) % 30 + 4), cx, cy + 9, { size: 26, align: 'center', color: P.ink, weight: 900 });
    },

    letters(g, W, H, P, rng, t) {
      const s = 32, cols = 10, rows = 5;
      const ox = W / 2 - cols * s / 2, oy = H * 0.12;
      const A = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
      const c = g.ctx;
      c.lineCap = 'round';
      const hi = [12, 13, 14, 15, 16];
      c.globalAlpha = 0.28;
      g.capsule(ox + 2 * s + s / 2, oy + s * 1.5, ox + 6 * s + s / 2, oy + s * 1.5, 15, P.c);
      c.globalAlpha = 1;
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const i = r * cols + cc;
        g.text(A[(i * 7) % A.length], ox + cc * s + s / 2, oy + r * s + s * 0.7, {
          size: 20, align: 'center', weight: 800,
          color: hi.indexOf(i) >= 0 ? P.c : alpha(P.ink, 0.72) });
      }
    },

    hangman(g, W, H, P, rng, t) {
      const bx = W * 0.26, by = H * 0.78;
      g.rect(bx - 40, by, 100, 8, P.d);
      g.rect(bx - 4, by - 130, 8, 130, P.d);
      g.rect(bx - 4, by - 138, 78, 8, P.d);
      g.line(bx + 66, by - 130, bx + 66, by - 108, P.c, 3);
      g.circle(bx + 66, by - 96, 13, P.a);
      g.line(bx + 66, by - 83, bx + 66, by - 46, P.a, 4);
      g.line(bx + 66, by - 74, bx + 48, by - 58, P.a, 4);
      g.line(bx + 66, by - 74, bx + 84, by - 58, P.a, 4);
      const word = ['C', '_', 'B', '_', 'L', 'L', 'O'];
      word.forEach((ch, i) => {
        const x = W * 0.56 + i * 26;
        g.line(x - 9, H * 0.6, x + 9, H * 0.6, alpha(P.ink, 0.4), 2);
        if (ch !== '_') g.text(ch, x, H * 0.58, { size: 22, align: 'center', color: P.c, weight: 900 });
      });
    },

    wordle(g, W, H, P, rng, t) {
      const s = 46, cols = 5, rows = 4;
      const ox = W / 2 - cols * s / 2, oy = H * 0.1;
      const states = [
        [1, 0, 2, 0, 0], [0, 2, 1, 0, 1], [2, 2, 2, 1, 0], [3, 3, 3, 3, 3],
      ];
      const L = ['NEXO', 'ARCA', 'JUGA', 'GAMER'];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const st = states[r][c];
        const x = ox + c * s + 3, y = oy + r * s + 3;
        const col = st === 2 ? '#4ade80' : st === 1 ? '#facc15' : st === 0 ? alpha(P.dim, 0.28) : 'transparent';
        if (st === 3) g.rrectStroke(x, y, s - 6, s - 6, 6, alpha(P.ink, 0.22), 2);
        else {
          g.rrect(x, y, s - 6, s - 6, 6, col);
          const ch = (L[r] || 'NEXOS')[c] || 'S';
          g.text(ch, x + (s - 6) / 2, y + (s - 6) * 0.72, {
            size: 22, align: 'center', weight: 900, color: st === 0 ? P.ink : '#0d1220' });
        }
      }
    },

    anagram(g, W, H, P, rng, t) {
      const letters = 'AMIGOS'.split('');
      const R = 78, cx = W / 2, cy = H * 0.44;
      g.ring(cx, cy, R, 1.5, alpha(P.a, 0.25));
      letters.forEach((ch, i) => {
        const a = (i / letters.length) * TAU + t * 0.5 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        g.circle(x, y, 21, mix(P.a, P.b, i / letters.length));
        g.text(ch, x, y + 8, { size: 22, align: 'center', weight: 900, color: '#0d1220' });
      });
      g.circle(cx, cy, 30, alpha(P.deep, 0.75));
      g.text('?', cx, cy + 12, { size: 34, align: 'center', weight: 900, color: P.c });
    },

    mastermind(g, W, H, P, rng, t) {
      const cols = [P.a, P.b, P.c, P.d, mix(P.a, P.c, 0.5), mix(P.b, P.d, 0.5)];
      const s = 40, ox = W * 0.26, oy = H * 0.1;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const x = ox + c * s + s / 2, y = oy + r * s + s / 2;
          g.circle(x, y, 14, cols[(r * 3 + c * 2) % 6]);
          g.circle(x - 4, y - 5, 5, alpha('#ffffff', 0.28));
        }
        for (let k = 0; k < 4; k++) {
          const x = ox + 4 * s + 16 + (k % 2) * 12, y = oy + r * s + 12 + Math.floor(k / 2) * 12;
          g.circle(x, y, 4, (r + k) % 3 === 0 ? P.c : (r + k) % 3 === 1 ? P.ink : alpha(P.dim, 0.35));
        }
      }
      g.rrect(ox - 8, oy + 4 * s + 6, s * 4 + 16, 34, 10, alpha(P.deep, 0.7));
      for (let c = 0; c < 4; c++) {
        g.text('?', ox + c * s + s / 2, oy + 4 * s + 30, { size: 20, align: 'center', color: P.dim, weight: 900 });
      }
    },

    math(g, W, H, P, rng, t) {
      const ops = ['7 × 8', '96 ÷ 4', '17 + 25', '81 − 39'];
      const idx = Math.floor(t * 0.7) % ops.length;
      g.rrect(W * 0.16, H * 0.2, W * 0.68, 78, 16, alpha(P.deep, 0.66));
      g.rrectStroke(W * 0.16, H * 0.2, W * 0.68, 78, 16, alpha(P.a, 0.35), 1.5);
      g.text(ops[idx] + ' =', W / 2, H * 0.2 + 52, { size: 34, align: 'center', weight: 900, color: P.ink });
      for (let i = 0; i < 4; i++) {
        const x = W * (0.16 + i * 0.19) + 20, y = H * 0.62;
        g.rrect(x, y, 58, 44, 10, i === 1 ? P.a : alpha(P.d, 0.5));
        g.text(String([56, 24, 42, 42][i]), x + 29, y + 30, {
          size: 20, align: 'center', weight: 900, color: i === 1 ? '#0d1220' : P.ink });
      }
      g.ctx.globalCompositeOperation = 'lighter';
      g.rect(W * 0.16, H * 0.14, W * 0.68 * ((Math.sin(t * 0.6) + 1) / 2), 6, P.c);
      g.ctx.globalCompositeOperation = 'source-over';
    },

    typing(g, W, H, P, rng, t) {
      const words = ['neón', 'arcade', 'salto', 'récord', 'combo'];
      words.forEach((w, i) => {
        const x = 40 + ((i * 83) % (W - 120));
        const y = ((t * (34 + i * 9) + i * 66) % (H + 60)) - 20;
        const wd = g.textW(w, 20, 800) + 20;
        g.rrect(x, y, wd, 30, 8, i === 1 ? P.c : alpha(P.d, 0.55));
        g.text(w, x + wd / 2, y + 21, { size: 19, align: 'center', weight: 800, color: i === 1 ? '#0d1220' : P.ink });
      });
      g.rect(0, H * 0.82, W, 3, alpha(P.b, 0.7));
      g.rrect(W / 2 - 90, H * 0.86, 180, 30, 8, alpha(P.deep, 0.7));
      g.text('arcade' + (Math.sin(t * 6) > 0 ? '|' : ''), W / 2, H * 0.86 + 21,
        { size: 17, align: 'center', color: P.a, weight: 700, mono: true });
    },

    /* --------------------------------------------------------- DEPORTES */
    soccer(g, W, H, P, rng, t) {
      g.rect(0, H * 0.7, W, H * 0.3, mix('#2c7a3f', P.deep, 0.35));
      for (let i = 0; i < 6; i++) g.rect(0, H * 0.7 + i * 14, W, 7, alpha('#ffffff', 0.03));
      const gx = W * 0.5, gy = H * 0.36, gw = 210, gh = 96;
      g.rrectStroke(gx - gw / 2, gy, gw, gh, 4, '#f0f4ff', 5);
      const c = g.ctx;
      c.strokeStyle = alpha('#ffffff', 0.2); c.lineWidth = 1;
      c.beginPath();
      for (let x = gx - gw / 2; x <= gx + gw / 2; x += 12) { c.moveTo(x, gy); c.lineTo(x, gy + gh); }
      for (let y = gy; y <= gy + gh; y += 12) { c.moveTo(gx - gw / 2, y); c.lineTo(gx + gw / 2, y); }
      c.stroke();
      const kx = gx + Math.sin(t * 1.6) * 60;
      g.rrect(kx - 16, gy + 34, 32, 46, 8, P.a);
      g.circle(kx, gy + 26, 12, P.ink);
      const k = (t * 0.5) % 1;
      const bx = lerp(W * 0.5, gx + 74, k), by = lerp(H * 0.86, gy + 26, k) - Math.sin(k * Math.PI) * 30;
      g.circle(bx, by, 11, '#ffffff');
      g.ngon(bx, by, 5, 5, t * 4, '#1b2437');
    },

    basket(g, W, H, P, rng, t) {
      g.rect(W * 0.66, H * 0.1, 12, H * 0.6, mix(P.dim, P.deep, 0.4));
      g.rrect(W * 0.5, H * 0.16, 130, 84, 6, alpha(P.ink, 0.9));
      g.rrectStroke(W * 0.55, H * 0.26, 62, 46, 3, '#e8384f', 3);
      const hx = W * 0.5, hy = H * 0.36;
      g.ring(hx, hy, 30, 5, '#ff6b35');
      const c = g.ctx;
      c.strokeStyle = alpha('#ffffff', 0.65); c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        c.beginPath();
        c.moveTo(hx + Math.cos(a) * 30, hy + Math.sin(a) * 12);
        c.lineTo(hx + Math.cos(a) * 18, hy + 40);
        c.stroke();
      }
      const k = (t * 0.45) % 1;
      const bx = lerp(W * 0.16, hx, k), by = lerp(H * 0.78, hy, k) - Math.sin(k * Math.PI) * 90;
      g.circle(bx, by, 15, '#ff8a3d');
      c.strokeStyle = '#7c3a10'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(bx, by, 15, 0, TAU); c.moveTo(bx - 15, by); c.lineTo(bx + 15, by);
      c.moveTo(bx, by - 15); c.lineTo(bx, by + 15); c.stroke();
    },

    golf(g, W, H, P, rng, t) {
      g.rect(0, H * 0.55, W, H * 0.45, mix('#3fa35a', P.deep, 0.28));
      const c = g.ctx;
      c.fillStyle = mix('#4ec46c', P.deep, 0.12);
      c.beginPath(); c.ellipse(W * 0.62, H * 0.76, 120, 46, 0, 0, TAU); c.fill();
      g.circle(W * 0.72, H * 0.76, 10, '#0b1220');
      g.rect(W * 0.72 - 1.5, H * 0.76 - 66, 3, 66, '#e8eefc');
      g.poly([W * 0.72, H * 0.76 - 66, W * 0.72 + 34, H * 0.76 - 57, W * 0.72, H * 0.76 - 48], P.c);
      const k = (t * 0.5) % 1;
      const bx = lerp(W * 0.24, W * 0.72, Math.min(1, k * 1.1));
      const by = H * 0.78 - Math.sin(Math.min(1, k * 1.1) * Math.PI) * 46;
      c.setLineDash([5, 7]);
      g.line(W * 0.24, H * 0.78, bx, by, alpha('#ffffff', 0.4), 2);
      c.setLineDash([]);
      g.circle(bx, by, 8, '#ffffff');
      g.circle(bx - 2, by - 2, 3, '#c9d4e8');
    },

    pool(g, W, H, P, rng, t) {
      g.rrect(14, 20, W - 28, H * 0.74, 16, mix('#12603c', P.deep, 0.25));
      g.rrectStroke(14, 20, W - 28, H * 0.74, 16, '#6b4423', 8);
      const balls = [[0.62, 0.4, '#f2c14e', 1], [0.7, 0.3, '#e8384f', 3], [0.7, 0.5, '#3b82f6', 2],
                     [0.78, 0.24, '#8b5cf6', 4], [0.78, 0.4, '#f97316', 5], [0.78, 0.56, '#111827', 8]];
      balls.forEach((b) => {
        const x = W * b[0], y = H * b[1];
        g.circle(x, y, 15, b[2]);
        g.circle(x, y, 7, '#ffffff');
        g.text(String(b[3]), x, y + 4, { size: 10, align: 'center', color: '#111827', weight: 900 });
        g.circle(x - 5, y - 6, 4, alpha('#ffffff', 0.4));
      });
      const cx = W * 0.26 + Math.sin(t * 1.2) * 12, cy = H * 0.42;
      g.circle(cx, cy, 15, '#f8fafc');
      const c = g.ctx;
      c.setLineDash([6, 8]);
      g.line(cx, cy, W * 0.62, H * 0.4, alpha('#ffffff', 0.45), 2);
      c.setLineDash([]);
      g.push(cx, cy, 0.06);
      g.line(-40 - Math.abs(Math.sin(t * 1.2)) * 20, 0, -170, 0, '#c19a6b', 7);
      g.pop();
    },

    bowling(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.fillStyle = mix('#c98b46', P.deep, 0.4);
      c.beginPath(); c.moveTo(W * 0.3, H); c.lineTo(W * 0.42, H * 0.28);
      c.lineTo(W * 0.58, H * 0.28); c.lineTo(W * 0.7, H); c.closePath(); c.fill();
      const pins = [[0.5, 0.3], [0.46, 0.35], [0.54, 0.35], [0.42, 0.4], [0.5, 0.4], [0.58, 0.4]];
      pins.forEach((p, i) => {
        const x = W * p[0] + Math.sin(t * 3 + i) * (i === 1 ? 3 : 0), y = H * p[1];
        const s = 1 + (p[1] - 0.3) * 2.4;
        g.push(x, y, 0, s);
        g.rrect(-5, -18, 10, 26, 5, '#f5f7fb');
        g.rect(-5, -11, 10, 4, '#e8384f');
        g.pop();
      });
      const k = (t * 0.5) % 1;
      const bx = W * (0.5 + Math.sin(t * 0.8) * 0.06), by = lerp(H * 0.86, H * 0.46, k);
      const s = lerp(1.2, 0.6, k);
      g.circle(bx, by, 22 * s, mix(P.a, '#000', 0.25));
      g.circle(bx - 7 * s, by - 8 * s, 3.4 * s, P.deep);
      g.circle(bx + 1 * s, by - 10 * s, 3.4 * s, P.deep);
      g.circle(bx - 3 * s, by - 2 * s, 3.4 * s, P.deep);
    },

    tennis(g, W, H, P, rng, t) {
      g.rect(0, H * 0.2, W, H * 0.72, mix('#1f6f8b', P.deep, 0.42));
      const c = g.ctx;
      c.strokeStyle = alpha('#ffffff', 0.7); c.lineWidth = 2.5;
      c.strokeRect(W * 0.12, H * 0.24, W * 0.76, H * 0.64);
      c.beginPath(); c.moveTo(W * 0.12, H * 0.56); c.lineTo(W * 0.88, H * 0.56); c.stroke();
      c.setLineDash([4, 6]);
      c.beginPath(); c.moveTo(W * 0.5, H * 0.24); c.lineTo(W * 0.5, H * 0.88); c.stroke();
      c.setLineDash([]);
      const p1 = W * 0.3 + Math.sin(t * 1.4) * 46;
      const p2 = W * 0.62 + Math.cos(t * 1.1) * 40;
      g.rrect(p1 - 22, H * 0.84, 44, 10, 5, P.a);
      g.rrect(p2 - 22, H * 0.24, 44, 10, 5, P.b);
      const by = H * 0.3 + (Math.sin(t * 2.2) + 1) / 2 * H * 0.5;
      const bx = lerp(p2, p1, (Math.sin(t * 2.2) + 1) / 2);
      g.bloom(bx, by, 18, P.c, 0.5);
      g.circle(bx, by, 8, '#d8f34a');
    },

    archery(g, W, H, P, rng, t) {
      const cx = W * 0.72, cy = H * 0.44;
      const rings = [[52, '#f8fafc'], [42, '#111827'], [32, '#3b82f6'], [22, '#e8384f'], [12, '#facc15']];
      rings.forEach((r) => g.circle(cx, cy, r[0], r[1]));
      g.circle(cx, cy, 4, '#111827');
      const c = g.ctx;
      const pull = (Math.sin(t * 1.2) + 1) / 2;
      const ax = W * 0.16, ay = H * 0.5;
      c.strokeStyle = P.c; c.lineWidth = 4;
      c.beginPath(); c.arc(ax, ay, 44, -1.1, 1.1); c.stroke();
      g.line(ax + 19, ay - 39, ax - pull * 20, ay, alpha(P.ink, 0.8), 1.6);
      g.line(ax - pull * 20, ay, ax + 19, ay + 39, alpha(P.ink, 0.8), 1.6);
      S.arrow(g, ax - pull * 20, ay, 70, -0.12, P.ink, 2.5);
      const k = (t * 0.6) % 1;
      if (k > 0.5) {
        const px = lerp(ax + 50, cx - 14, (k - 0.5) * 2);
        S.arrow(g, px, ay - (k - 0.5) * 26, 40, -0.2, P.b, 2.5);
      }
    },

    ski(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.fillStyle = mix('#e8f4ff', P.deep, 0.15);
      c.beginPath(); c.moveTo(0, H);
      c.lineTo(0, H * 0.44);
      c.quadraticCurveTo(W * 0.3, H * 0.62, W * 0.44, H * 0.5);
      c.lineTo(W * 0.44, H); c.closePath(); c.fill();
      c.fillStyle = mix('#cfe6f7', P.deep, 0.28);
      c.beginPath(); c.moveTo(W, H); c.lineTo(W, H * 0.7);
      c.quadraticCurveTo(W * 0.7, H * 0.84, W * 0.4, H * 0.96);
      c.closePath(); c.fill();
      const k = (t * 0.5) % 1;
      const px = lerp(W * 0.46, W * 0.86, k), py = lerp(H * 0.42, H * 0.72, k * k);
      g.push(px, py, -0.45 + k * 0.5);
      g.rrect(-8, -18, 16, 24, 6, P.a);
      g.circle(0, -22, 8, P.c);
      g.rect(-24, 8, 48, 3, P.b); g.rect(-24, 14, 48, 3, P.b);
      g.pop();
      for (let i = 0; i < 12; i++) {
        g.circle((i * 71 + t * 40) % W, (i * 53 + t * 20) % (H * 0.5), 2, alpha('#ffffff', 0.6));
      }
    },

    sprint(g, W, H, P, rng, t) {
      g.rect(0, H * 0.42, W, H * 0.58, mix('#b23a2e', P.deep, 0.42));
      for (let i = 1; i < 5; i++) g.rect(0, H * 0.42 + i * (H * 0.58 / 5), W, 2, alpha('#ffffff', 0.35));
      const runner = (x, y, col, ph) => {
        const s = Math.sin(ph);
        g.push(x, y);
        g.circle(0, -30, 9, col);
        g.rrect(-6, -22, 12, 22, 5, col);
        g.line(0, -2, -10 * s, 16, col, 4);
        g.line(0, -2, 10 * s, 16, col, 4);
        g.line(0, -16, 12 * s, -24, col, 4);
        g.line(0, -16, -12 * s, -8, col, 4);
        g.pop();
      };
      runner(W * 0.3 + Math.sin(t) * 20, H * 0.62, P.a, t * 9);
      runner(W * 0.52 + Math.sin(t * 0.8) * 16, H * 0.76, P.b, t * 9 + 2);
      runner(W * 0.2 + Math.sin(t * 1.1) * 12, H * 0.9, P.c, t * 9 + 4);
      for (let i = 0; i < 12; i++) {
        g.rect(W - 30, H * 0.42 + i * 18, 14, 9, i % 2 ? '#ffffff' : '#111827');
        g.rect(W - 16, H * 0.42 + i * 18, 14, 9, i % 2 ? '#111827' : '#ffffff');
      }
    },

    darts(g, W, H, P, rng, t) {
      const cx = W / 2, cy = H * 0.44, R = 96;
      const c = g.ctx;
      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * TAU - Math.PI / 20, a1 = a0 + TAU / 20;
        c.fillStyle = i % 2 ? mix(P.deep, '#000', 0.3) : '#e8ddc4';
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath(); c.fill();
        c.fillStyle = i % 2 ? '#e8384f' : '#2f9e5f';
        c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, R * 0.86, a1, a0, true); c.closePath(); c.fill();
        c.beginPath(); c.arc(cx, cy, R * 0.54, a0, a1); c.arc(cx, cy, R * 0.46, a1, a0, true); c.closePath(); c.fill();
      }
      g.circle(cx, cy, 15, '#2f9e5f');
      g.circle(cx, cy, 7, '#e8384f');
      const a = t * 1.3;
      const dx = cx + Math.cos(a) * 40, dy = cy + Math.sin(a) * 40;
      g.line(dx, dy, dx + 42, dy - 30, P.ink, 3);
      g.poly([dx + 42, dy - 30, dx + 58, dy - 24, dx + 58, dy - 36], P.c);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
