/* NEXO ARCADE — motivos de portada C: carreras, estrategia, mesa y casual. */
(function (global) {
  'use strict';
  const NX = global.NX, M = NX.M, GFX = NX.GFX;
  const { alpha, mix, shade } = GFX;
  const { TAU, clamp, clamp01, lerp } = M;
  const S = GFX.Sprites;

  function car(g, x, y, w, col, ang) {
    g.push(x, y, ang || 0);
    g.rrect(-w / 2, -w * 0.32, w, w * 0.64, w * 0.16, col);
    g.rrect(-w * 0.14, -w * 0.24, w * 0.4, w * 0.48, w * 0.1, alpha('#0b1220', 0.72));
    g.rect(-w * 0.42, -w * 0.4, w * 0.22, w * 0.12, '#1b2437');
    g.rect(-w * 0.42, w * 0.28, w * 0.22, w * 0.12, '#1b2437');
    g.rect(w * 0.2, -w * 0.4, w * 0.22, w * 0.12, '#1b2437');
    g.rect(w * 0.2, w * 0.28, w * 0.22, w * 0.12, '#1b2437');
    g.pop();
  }

  NX.Cover.add({
    /* --------------------------------------------------------- CARRERAS */
    race(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.save();
      c.strokeStyle = mix(P.deep, '#000', 0.35); c.lineWidth = 62; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(W * 0.2, H * 0.75); c.bezierCurveTo(W * 0.02, H * 0.3, W * 0.35, H * 0.1, W * 0.55, H * 0.3);
      c.bezierCurveTo(W * 0.75, H * 0.5, W * 0.62, H * 0.82, W * 0.85, H * 0.7);
      c.stroke();
      c.strokeStyle = alpha(P.a, 0.55); c.lineWidth = 2; c.setLineDash([10, 12]);
      c.stroke();
      c.setLineDash([]);
      c.restore();
      car(g, W * 0.36, H * 0.19, 40, P.c, 0.35);
      car(g, W * 0.6, H * 0.42, 40, P.a, 1.2);
      car(g, W * 0.24, H * 0.62, 40, P.b, -1.1);
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) g.circle(W * 0.6 - 26 - i * 8, H * 0.42 - i * 2, 4 - i * 0.5, alpha(P.c, 0.6));
      g.ctx.globalCompositeOperation = 'source-over';
    },

    highway(g, W, H, P, rng, t) {
      g.rect(W * 0.16, 0, W * 0.68, H, mix(P.deep, P.dim, 0.22));
      const c = g.ctx;
      c.strokeStyle = alpha('#ffffff', 0.6); c.lineWidth = 4;
      c.setLineDash([26, 26]); c.lineDashOffset = -(t * 260) % 52;
      [0.38, 0.62].forEach((p) => { c.beginPath(); c.moveTo(W * p, 0); c.lineTo(W * p, H); c.stroke(); });
      c.setLineDash([]);
      g.rect(W * 0.16, 0, 5, H, P.c); g.rect(W * 0.84 - 5, 0, 5, H, P.c);
      const lanes = [0.27, 0.5, 0.73];
      for (let i = 0; i < 5; i++) {
        const y = ((t * 150 + i * 120) % (H + 130)) - 65;
        const l = lanes[(i * 2) % 3];
        car(g, W * l, y, 44, [P.b, P.d, P.a][i % 3], Math.PI / 2);
      }
      const px = W * (0.5 + Math.sin(t * 1.2) * 0.2);
      g.ctx.globalCompositeOperation = 'lighter';
      g.bloom(px, H * 0.82, 40, P.c, 0.4);
      g.ctx.globalCompositeOperation = 'source-over';
      car(g, px, H * 0.82, 50, P.c, Math.PI / 2);
    },

    drift(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.save(); c.lineCap = 'round';
      for (let s = 0; s < 2; s++) {
        c.strokeStyle = alpha('#0a0d16', 0.55); c.lineWidth = 9;
        c.beginPath();
        for (let i = 0; i <= 60; i++) {
          const k = i / 60;
          const a = k * 5 + t * 0.6;
          const x = W / 2 + Math.cos(a) * (60 + k * 70) + (s ? 12 : -12);
          const y = H * 0.46 + Math.sin(a) * (34 + k * 34);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      c.restore();
      const a = 5 + t * 0.6;
      const x = W / 2 + Math.cos(a) * 130, y = H * 0.46 + Math.sin(a) * 68;
      g.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        g.circle(x - Math.cos(a) * i * 9, y - Math.sin(a) * i * 9, 12 - i, alpha(P.dim, 0.14));
      }
      g.ctx.globalCompositeOperation = 'source-over';
      car(g, x, y, 46, P.c, a + 1.9);
      g.text('×' + (3 + Math.floor(t) % 6), W * 0.82, H * 0.28,
        { size: 30, align: 'center', weight: 900, color: P.a, shadow: P.a, shadowBlur: 18 });
    },

    hill(g, W, H, P, rng, t) {
      const c = g.ctx;
      const terr = (x) => H * 0.68 + Math.sin((x + t * 90) * 0.011) * 40 + Math.sin((x + t * 90) * 0.03) * 12;
      c.fillStyle = mix('#3f8f4f', P.deep, 0.3);
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, terr(x));
      c.lineTo(W, H); c.closePath(); c.fill();
      c.strokeStyle = alpha(P.c, 0.7); c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) x ? c.lineTo(x, terr(x)) : c.moveTo(x, terr(x));
      c.stroke();
      const bx = W * 0.36, by = terr(bx);
      const slope = Math.atan2(terr(bx + 20) - terr(bx - 20), 40);
      g.push(bx, by - 20, slope - 0.25);
      g.circle(-20, 18, 15, '#1b2437'); g.ring(-20, 18, 15, 3, P.dim);
      g.circle(22, 18, 15, '#1b2437'); g.ring(22, 18, 15, 3, P.dim);
      g.rrect(-22, -4, 46, 16, 6, P.a);
      g.circle(4, -18, 10, P.b);
      g.rrect(-2, -12, 10, 14, 4, P.b);
      g.pop();
    },

    kart(g, W, H, P, rng, t) {
      const hy = H * 0.34;
      const c = g.ctx;
      c.fillStyle = g.linGrad(0, hy, 0, H, [[0, mix(P.d, P.deep, 0.4)], [1, mix(P.deep, '#000', 0.2)]]);
      c.fillRect(0, hy, W, H - hy);
      const curve = Math.sin(t * 0.7) * 90;
      for (let i = 0; i < 26; i++) {
        const k = i / 26;
        const y = hy + Math.pow(k, 1.9) * (H - hy);
        const w = 20 + Math.pow(k, 1.7) * 340;
        const cx = W / 2 + curve * Math.pow(k, 2.4);
        const band = (Math.floor(k * 16 + t * 4) % 2) === 0;
        c.fillStyle = band ? mix('#4b5563', P.deep, 0.35) : mix('#374151', P.deep, 0.35);
        c.fillRect(cx - w / 2, y, w, (H - hy) / 26 + 2);
        c.fillStyle = band ? '#f8fafc' : '#e8384f';
        c.fillRect(cx - w / 2 - 8, y, 9, (H - hy) / 26 + 2);
        c.fillRect(cx + w / 2 - 1, y, 9, (H - hy) / 26 + 2);
      }
      g.rect(0, 0, W, hy, mix(P.b, P.deep, 0.35));
      g.circle(W * 0.74, hy * 0.55, 26, P.c);
      car(g, W / 2 + curve * 0.28, H * 0.88, 78, P.a, Math.PI / 2);
    },

    dronerace(g, W, H, P, rng, t) {
      for (let i = 0; i < 5; i++) {
        const k = (i / 5 + t * 0.12) % 1;
        const r = 24 + Math.pow(k, 1.7) * 130;
        const x = W / 2 + Math.sin(i * 2.1 + t * 0.4) * 90 * k;
        const y = H * 0.42 + Math.cos(i * 1.7) * 40 * k;
        const c = g.ctx;
        c.save(); c.globalAlpha = 0.25 + k * 0.65;
        g.ring(x, y, r, 5, i % 2 ? P.a : P.c);
        g.ring(x, y, r - 5, 1.5, alpha(P.ink, 0.5));
        c.restore();
      }
      const px = W / 2 + Math.sin(t * 1.6) * 30, py = H * 0.6;
      g.push(px, py, Math.sin(t * 1.6) * 0.3);
      g.rrect(-18, -6, 36, 12, 6, mix(P.d, P.ink, 0.2));
      [[-24, -12], [24, -12], [-24, 12], [24, 12]].forEach((q) => {
        g.ctx.globalAlpha = 0.55; g.ring(q[0], q[1], 11, 2.5, P.b); g.ctx.globalAlpha = 1;
        g.circle(q[0], q[1], 3, P.c);
      });
      g.pop();
    },

    boat(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.fillStyle = g.linGrad(0, H * 0.3, 0, H, [[0, mix('#1c6ea4', P.deep, 0.25)], [1, mix('#0b3a5c', P.deep, 0.35)]]);
      c.fillRect(0, H * 0.3, W, H * 0.7);
      c.strokeStyle = alpha('#ffffff', 0.18); c.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = H * (0.4 + i * 0.1) + Math.sin(x * 0.03 + t * 1.5 + i) * 6;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      [[0.3, 0.5], [0.68, 0.62]].forEach((p, i) => {
        const x = W * p[0], y = H * p[1] + Math.sin(t * 2 + i) * 4;
        g.ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 6; k++) g.circle(x - 30 - k * 12, y + 6 + Math.sin(t * 6 + k) * 3, 8 - k, alpha('#ffffff', 0.2));
        g.ctx.globalCompositeOperation = 'source-over';
        g.push(x, y, -0.12 + Math.sin(t * 2 + i) * 0.06);
        g.poly([-30, 0, 34, -6, 30, 8, -26, 10], i ? P.b : P.c);
        g.rrect(-8, -16, 22, 14, 4, P.ink);
        g.pop();
      });
      [[0.5, 0.42], [0.85, 0.55]].forEach((p) => {
        g.circle(W * p[0], H * p[1], 9, P.a);
        g.rect(W * p[0] - 1.5, H * p[1] - 26, 3, 20, P.a);
      });
    },

    /* ------------------------------------------------------- ESTRATEGIA */
    td(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.strokeStyle = mix('#7a5a34', P.deep, 0.3); c.lineWidth = 30; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-10, H * 0.3); c.lineTo(W * 0.32, H * 0.3); c.lineTo(W * 0.32, H * 0.68);
      c.lineTo(W * 0.7, H * 0.68); c.lineTo(W * 0.7, H * 0.34); c.lineTo(W + 10, H * 0.34);
      c.stroke();
      const towers = [[0.18, 0.52], [0.5, 0.44], [0.84, 0.6]];
      towers.forEach((p, i) => {
        const x = W * p[0], y = H * p[1];
        g.ctx.globalAlpha = 0.14; g.circle(x, y, 52, P.a); g.ctx.globalAlpha = 1;
        g.rrect(x - 15, y - 8, 30, 26, 5, mix(P.dim, P.deep, 0.35));
        g.push(x, y - 12, Math.sin(t * 1.2 + i) * 0.6);
        g.rrect(-9, -9, 18, 18, 5, P.a);
        g.rect(6, -3, 18, 6, P.c);
        g.pop();
      });
      for (let i = 0; i < 5; i++) {
        const k = ((t * 0.12 + i * 0.2) % 1);
        let x, y;
        if (k < 0.32) { x = lerp(-10, W * 0.32, k / 0.32); y = H * 0.3; }
        else if (k < 0.5) { x = W * 0.32; y = lerp(H * 0.3, H * 0.68, (k - 0.32) / 0.18); }
        else if (k < 0.78) { x = lerp(W * 0.32, W * 0.7, (k - 0.5) / 0.28); y = H * 0.68; }
        else { x = W * 0.7; y = lerp(H * 0.68, H * 0.34, (k - 0.78) / 0.22); }
        S.blob(g, x, y, 11, P.b, t + i);
      }
    },

    hex(g, W, H, P, rng, t) {
      const r = 26, hs = r * Math.sqrt(3);
      const cols = [P.a, P.b, P.c, alpha(P.dim, 0.4)];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 8; col++) {
          const x = 40 + col * hs + (row % 2 ? hs / 2 : 0);
          const y = 40 + row * r * 1.5;
          if (x > W - 20) continue;
          const owner = (row * 3 + col * 5) % 4;
          const pulse = owner === 0 && (Math.floor(t * 1.5) % 8) === (col % 8) ? 1.12 : 1;
          g.push(x, y, 0, pulse);
          g.ngon(0, 0, r * 0.92, 6, Math.PI / 6, alpha(cols[owner], owner === 3 ? 0.35 : 0.85));
          g.ngon(0, 0, r * 0.92, 6, Math.PI / 6, 'transparent');
          if (owner !== 3) {
            g.text(String(((row * 3 + col) % 8) + 1), 0, 6,
              { size: 15, align: 'center', weight: 900, color: '#0d1220' });
          }
          g.pop();
        }
      }
    },

    idle(g, W, H, P, rng, t) {
      const gear = (x, y, r, teeth, col, rot) => {
        g.push(x, y, rot);
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * TAU;
          g.push(Math.cos(a) * r, Math.sin(a) * r, a);
          g.rect(-r * 0.13, -r * 0.13, r * 0.3, r * 0.26, col);
          g.pop();
        }
        g.circle(0, 0, r, col);
        g.circle(0, 0, r * 0.32, alpha(P.deep, 0.85));
        g.pop();
      };
      gear(W * 0.32, H * 0.4, 46, 10, P.a, t * 0.6);
      gear(W * 0.62, H * 0.34, 32, 8, P.b, -t * 0.86);
      gear(W * 0.54, H * 0.68, 26, 7, P.c, t * 1.06);
      g.rect(W * 0.1, H * 0.8, W * 0.8, 12, mix(P.dim, P.deep, 0.4));
      for (let i = 0; i < 7; i++) {
        const x = W * 0.1 + ((i * 56 + t * 60) % (W * 0.8));
        g.rrect(x, H * 0.8 - 14, 20, 14, 3, P.c);
      }
    },

    city(g, W, H, P, rng, t) {
      const tw = 46, th = 24;
      const ox = W * 0.5, oy = H * 0.3;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const x = ox + (c - r) * tw / 2, y = oy + (c + r) * th / 2;
          g.poly([x, y, x + tw / 2, y + th / 2, x, y + th, x - tw / 2, y + th / 2],
            (r + c) % 2 ? mix(P.d, P.deep, 0.35) : mix(P.d, P.deep, 0.5));
          const kind = (r * 3 + c * 7) % 5;
          if (kind < 3) {
            const hgt = 14 + kind * 12 + Math.sin(t + r + c) * 1.5;
            const col = [P.a, P.b, P.c][kind];
            g.poly([x - tw / 2 + 6, y + th / 2, x, y + th - 3, x, y + th - 3 - hgt, x - tw / 2 + 6, y + th / 2 - hgt],
              shade(col, -0.28));
            g.poly([x + tw / 2 - 6, y + th / 2, x, y + th - 3, x, y + th - 3 - hgt, x + tw / 2 - 6, y + th / 2 - hgt],
              shade(col, -0.05));
            g.poly([x, y + 3 - hgt, x + tw / 2 - 6, y + th / 2 - hgt, x, y + th - 3 - hgt, x - tw / 2 + 6, y + th / 2 - hgt],
              mix(col, '#ffffff', 0.18));
          }
        }
      }
    },

    naval(g, W, H, P, rng, t) {
      const s = 30, N = 6;
      [[0.06, P.a], [0.56, P.b]].forEach((bd, b) => {
        const ox = W * bd[0] + 20, oy = H * 0.16;
        g.rrect(ox - 6, oy - 6, N * s + 12, N * s + 12, 8, alpha(P.deep, 0.6));
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const x = ox + c * s, y = oy + r * s;
          g.rect(x + 1, y + 1, s - 2, s - 2, alpha(bd[1], 0.1));
          g.strokeRect(x + 1, y + 1, s - 2, s - 2, alpha(bd[1], 0.22), 1);
          const i = r * N + c;
          if (b === 1 && i % 7 === 2) {
            g.line(x + 8, y + 8, x + s - 8, y + s - 8, P.c, 2.5);
            g.line(x + s - 8, y + 8, x + 8, y + s - 8, P.c, 2.5);
          } else if (b === 1 && i % 11 === 5) g.circle(x + s / 2, y + s / 2, 4, alpha(P.ink, 0.4));
        }
        if (b === 0) {
          g.rrect(ox + 1 * s + 3, oy + 1 * s + 3, s * 3 - 6, s - 6, 6, mix(P.dim, P.ink, 0.15));
          g.rrect(ox + 4 * s + 3, oy + 2 * s + 3, s - 6, s * 2 - 6, 6, mix(P.dim, P.ink, 0.15));
        }
      });
      const bx = W * 0.5, by = H * 0.14 + Math.abs(Math.sin(t * 1.1)) * 10;
      g.bloom(bx, by, 20, P.c, 0.6);
      g.circle(bx, by, 6, P.c);
    },

    siege(g, W, H, P, rng, t) {
      g.rect(0, H * 0.78, W, H * 0.22, mix('#3f8f4f', P.deep, 0.42));
      const bx = W * 0.7;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3 - Math.floor(r / 2); c++) {
          const x = bx + c * 34 - r * 4, y = H * 0.78 - 30 - r * 30;
          g.rrect(x, y, 30, 28, 3, mix(P.dim, '#8b7355', 0.4));
          g.rrectStroke(x, y, 30, 28, 3, alpha('#000', 0.25), 1);
        }
      }
      const k = (t * 0.45) % 1;
      const px = lerp(W * 0.2, bx + 20, k), py = H * 0.7 - Math.sin(k * Math.PI) * 110;
      const c = g.ctx;
      c.setLineDash([4, 8]);
      c.strokeStyle = alpha(P.c, 0.5); c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const kk = i / 20;
        const x = lerp(W * 0.2, bx + 20, kk), y = H * 0.7 - Math.sin(kk * Math.PI) * 110;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke(); c.setLineDash([]);
      g.circle(px, py, 10, mix(P.dim, '#666', 0.4));
      g.push(W * 0.14, H * 0.72, -0.5 + Math.sin(t * 3) * 0.2);
      g.rect(0, -4, 60, 8, mix('#7a5a34', P.deep, 0.1));
      g.pop();
      g.rrect(W * 0.09, H * 0.72, 40, 24, 4, mix('#7a5a34', P.deep, 0.2));
    },

    /* ------------------------------------------------------ MESA/CARTAS */
    connect4(g, W, H, P, rng, t) {
      const s = 40, cols = 7, rows = 5;
      const ox = W / 2 - cols * s / 2, oy = H * 0.16;
      g.rrect(ox - 8, oy - 8, cols * s + 16, rows * s + 16, 12, mix(P.d, '#1d4ed8', 0.45));
      const board = [0,0,0,0,0,0,0, 0,0,0,0,0,0,0, 0,0,1,0,0,0,0, 0,0,2,1,0,0,0, 0,1,1,2,2,0,0];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const v = board[r * cols + c];
        const x = ox + c * s + s / 2, y = oy + r * s + s / 2;
        g.circle(x, y, s * 0.4, v === 1 ? P.c : v === 2 ? P.b : alpha(P.deep, 0.85));
        if (v) g.circle(x - s * 0.12, y - s * 0.14, s * 0.14, alpha('#ffffff', 0.28));
      }
      const dy = ((t * 130) % (oy + s * 2)) - 30;
      g.circle(ox + 3 * s + s / 2, Math.min(dy, oy + s * 1.5), s * 0.4, P.c);
    },

    tictac(g, W, H, P, rng, t) {
      const big = 62, ox = W / 2 - big * 1.5, oy = H * 0.12;
      const c = g.ctx;
      for (let R = 0; R < 3; R++) for (let C = 0; C < 3; C++) {
        const bx = ox + C * big, by = oy + R * big;
        const act = (Math.floor(t) % 9) === (R * 3 + C);
        g.rrect(bx + 2, by + 2, big - 4, big - 4, 8, act ? alpha(P.a, 0.16) : alpha(P.deep, 0.5));
        c.strokeStyle = alpha(P.ink, 0.13); c.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          c.beginPath();
          c.moveTo(bx + 4 + i * (big - 8) / 3, by + 5); c.lineTo(bx + 4 + i * (big - 8) / 3, by + big - 5);
          c.moveTo(bx + 5, by + 4 + i * (big - 8) / 3); c.lineTo(bx + big - 5, by + 4 + i * (big - 8) / 3);
          c.stroke();
        }
        const seed = R * 3 + C;
        for (let i = 0; i < 9; i++) {
          const v = (seed * 7 + i * 5) % 5;
          if (v > 2) continue;
          const cx = bx + 4 + ((i % 3) + 0.5) * (big - 8) / 3, cy = by + 4 + (Math.floor(i / 3) + 0.5) * (big - 8) / 3;
          if (v === 0) {
            g.line(cx - 6, cy - 6, cx + 6, cy + 6, P.b, 2.6);
            g.line(cx + 6, cy - 6, cx - 6, cy + 6, P.b, 2.6);
          } else if (v === 1) g.ring(cx, cy, 7, 2.6, P.c);
        }
      }
    },

    reversi(g, W, H, P, rng, t) {
      const s = 34, N = 6, ox = W / 2 - N * s / 2, oy = H * 0.14;
      g.rrect(ox - 8, oy - 8, N * s + 16, N * s + 16, 10, mix('#1c6b3f', P.deep, 0.3));
      const c = g.ctx;
      c.strokeStyle = alpha('#000', 0.35); c.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        c.beginPath();
        c.moveTo(ox + i * s, oy); c.lineTo(ox + i * s, oy + N * s);
        c.moveTo(ox, oy + i * s); c.lineTo(ox + N * s, oy + i * s); c.stroke();
      }
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const i = r * N + cc, v = (i * 5) % 7;
        if (v > 3) continue;
        const x = ox + cc * s + s / 2, y = oy + r * s + s / 2;
        const flip = i === 14 ? Math.abs(Math.cos(t * 2)) : 1;
        g.push(x, y, 0, Math.max(0.08, flip), 1);
        g.circle(0, 0, s * 0.38, v < 2 ? '#0f172a' : '#f1f5f9');
        g.circle(-s * 0.1, -s * 0.12, s * 0.12, alpha('#ffffff', v < 2 ? 0.18 : 0.55));
        g.pop();
      }
    },

    checkers(g, W, H, P, rng, t) {
      const s = 34, N = 6, ox = W / 2 - N * s / 2, oy = H * 0.14;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        g.rect(ox + c * s, oy + r * s, s, s, (r + c) % 2 ? mix('#8b5a2b', P.deep, 0.28) : mix('#e8ddc4', P.deep, 0.12));
      }
      const pieces = [[0, 1, 0], [2, 1, 0], [4, 1, 0], [1, 4, 1], [3, 4, 1], [5, 4, 1], [2, 3, 1]];
      pieces.forEach((p, i) => {
        const x = ox + p[0] * s + s / 2, y = oy + p[1] * s + s / 2 + (i === 6 ? Math.sin(t * 3) * 3 : 0);
        const col = p[2] ? P.a : P.b;
        g.circle(x, y + 2, s * 0.36, alpha('#000', 0.35));
        g.circle(x, y, s * 0.36, col);
        g.ring(x, y, s * 0.24, 2, alpha('#000', 0.2));
        if (i === 6) g.star(x, y, 7, 3, 5, t, P.c);
      });
    },

    chess(g, W, H, P, rng, t) {
      const s = 30, N = 8, ox = W / 2 - N * s / 2, oy = H * 0.08;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        g.rect(ox + c * s, oy + r * s, s, s, (r + c) % 2 ? mix('#6b7a99', P.deep, 0.3) : mix('#e6ecf7', P.deep, 0.08));
      }
      const glyph = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
      const layout = [
        ['r', 0, 0], ['n', 1, 0], ['q', 3, 0], ['k', 4, 0], ['b', 5, 0], ['r', 7, 0],
        ['p', 0, 1], ['p', 1, 1], ['p', 3, 1], ['p', 5, 1], ['p', 6, 1], ['p', 7, 1],
        ['p', 2, 3],
        ['p', 0, 6], ['p', 2, 6], ['p', 4, 6], ['p', 6, 6], ['p', 7, 6],
        ['r', 0, 7], ['k', 4, 7], ['q', 3, 7], ['n', 6, 7], ['r', 7, 7],
      ];
      layout.forEach((p, i) => {
        const dark = p[2] < 4;
        const y = oy + p[2] * s + s * 0.78 + (i === 12 ? Math.sin(t * 2) * 3 : 0);
        g.text(glyph[p[0]], ox + p[1] * s + s / 2, y, {
          size: s * 0.92, align: 'center',
          color: dark ? '#111827' : '#f8fafc',
          stroke: dark ? alpha('#fff', 0.35) : alpha('#000', 0.55), strokeWidth: 1.6,
        });
      });
      g.rrectStroke(ox + 2 * s, oy + 3 * s, s, s, 4, P.c, 2.5);
    },

    mancala(g, W, H, P, rng, t) {
      g.rrect(24, H * 0.24, W - 48, H * 0.48, 40, mix('#7a5a34', P.deep, 0.25));
      const seeds = (x, y, n, ph) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + ph;
          g.circle(x + Math.cos(a) * 8, y + Math.sin(a) * 6, 4, [P.a, P.c, P.b][i % 3]);
        }
      };
      for (let i = 0; i < 6; i++) {
        const x = 90 + i * 38;
        g.circle(x, H * 0.38, 17, alpha(P.deep, 0.7));
        g.circle(x, H * 0.58, 17, alpha(P.deep, 0.7));
        seeds(x, H * 0.38, 3 + (i % 3), t * 0.4 + i);
        seeds(x, H * 0.58, 2 + ((i + 1) % 4), -t * 0.4 + i);
      }
      g.rrect(38, H * 0.32, 34, H * 0.32, 17, alpha(P.deep, 0.7));
      g.rrect(W - 72, H * 0.32, 34, H * 0.32, 17, alpha(P.deep, 0.7));
      seeds(55, H * 0.42, 5, t * 0.3); seeds(55, H * 0.56, 4, -t * 0.3);
      seeds(W - 55, H * 0.42, 6, t * 0.3);
    },

    solitaire(g, W, H, P, rng, t) {
      const C = NX.Cards;
      const cw = 46, ch = 64;
      for (let i = 0; i < 4; i++) {
        C.draw(g, { s: i, r: 12 - i, up: true }, W * 0.52 + i * 52, 18, cw, ch, {});
      }
      C.draw(g, null, 24, 18, cw, ch, {});
      for (let i = 0; i < 5; i++) {
        const x = 24 + i * 54, y = H * 0.42;
        C.draw(g, null, x, y, cw, ch, {});
        C.draw(g, { s: (i * 3) % 4, r: (i * 5) % 13, up: true }, x, y + 20, cw, ch, {});
      }
      const k = (Math.sin(t * 1.2) + 1) / 2;
      C.draw(g, { s: 1, r: 11, up: true }, lerp(W * 0.2, W * 0.44, k), lerp(H * 0.62, H * 0.42, k), cw, ch, { lift: true, sel: true });
    },

    mahjong(g, W, H, P, rng, t) {
      const tw = 34, th = 44;
      const layers = [
        { n: 9, y: H * 0.5, off: 0, dep: 0 },
        { n: 7, y: H * 0.46, off: tw * 0.5, dep: 1 },
        { n: 5, y: H * 0.42, off: tw * 1.0, dep: 2 },
      ];
      const glyph = ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍'];
      layers.forEach((L, li) => {
        for (let i = 0; i < L.n; i++) {
          const x = W / 2 - L.n * tw / 2 + i * tw + (li ? 0 : 0);
          const y = L.y - li * 6;
          const hi = li === 2 && (Math.floor(t) % L.n) === i;
          g.rrect(x + 3, y + 4, tw - 4, th, 5, alpha('#000', 0.3));
          g.rrect(x, y, tw - 4, th, 5, hi ? P.c : '#eef2fa');
          g.rrect(x, y, tw - 4, th * 0.3, 5, alpha('#ffffff', 0.5));
          g.text(glyph[(li * 3 + i) % glyph.length], x + (tw - 4) / 2, y + th * 0.68,
            { size: 22, align: 'center', color: hi ? '#0d1220' : '#2b3a55' });
        }
      });
    },

    /* ----------------------------------------------------------- CASUAL */
    mole(g, W, H, P, rng, t) {
      g.rect(0, H * 0.34, W, H * 0.66, mix('#5b8f3f', P.deep, 0.34));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = W * (0.24 + c * 0.26), y = H * (0.5 + r * 0.24);
        const cctx = g.ctx;
        cctx.fillStyle = mix('#3a2a1a', P.deep, 0.3);
        cctx.beginPath(); cctx.ellipse(x, y, 40, 15, 0, 0, TAU); cctx.fill();
        const up = Math.sin(t * 2 + (r * 3 + c) * 1.7) > 0.35;
        if (up) {
          const h = 30;
          cctx.save();
          cctx.beginPath(); cctx.ellipse(x, y, 40, 16, 0, Math.PI, TAU * 1.0); cctx.rect(x - 40, y - 70, 80, 70); cctx.clip();
          g.circle(x, y - h * 0.6, 24, mix('#8b6b4a', P.deep, 0.1));
          g.circle(x - 9, y - h * 0.7, 4, '#111'); g.circle(x + 9, y - h * 0.7, 4, '#111');
          g.circle(x, y - h * 0.45, 6, '#e8a0a0');
          cctx.restore();
        }
        cctx.fillStyle = alpha('#000', 0.4);
        cctx.beginPath(); cctx.ellipse(x, y, 40, 15, 0, 0, Math.PI); cctx.fill();
      }
      g.circle(W * 0.76, H * 0.36, 16, alpha(P.c, 0.8));
      g.rect(W * 0.76 - 4, H * 0.36, 8, 34, mix('#7a5a34', P.deep, 0.1));
    },

    balloons(g, W, H, P, rng, t) {
      const cols = [P.a, P.b, P.c, P.d];
      for (let i = 0; i < 8; i++) {
        const x = 30 + ((i * 71) % (W - 60)) + Math.sin(t + i) * 12;
        const y = H * 1.05 - ((t * (24 + i * 6) + i * 70) % (H * 1.25));
        const col = cols[i % 4];
        const c = g.ctx;
        c.fillStyle = col;
        c.beginPath(); c.ellipse(x, y, 20, 25, 0, 0, TAU); c.fill();
        g.poly([x - 5, y + 23, x + 5, y + 23, x, y + 31], col);
        c.strokeStyle = alpha('#ffffff', 0.35); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y + 31);
        c.quadraticCurveTo(x + Math.sin(t * 2 + i) * 10, y + 48, x, y + 62); c.stroke();
        g.circle(x - 7, y - 9, 6, alpha('#ffffff', 0.35));
      }
    },

    reflex(g, W, H, P, rng, t) {
      const phase = (t * 0.6) % 1;
      const col = phase < 0.55 ? '#e8384f' : '#4ade80';
      g.bloom(W / 2, H * 0.44, 130, col, 0.35);
      g.circle(W / 2, H * 0.44, 78, alpha(col, 0.9));
      g.ring(W / 2, H * 0.44, 78, 4, alpha('#ffffff', 0.35));
      g.text(phase < 0.55 ? 'ESPERA' : '¡YA!', W / 2, H * 0.44 + 10,
        { size: 26, align: 'center', weight: 900, color: '#0d1220' });
      g.text('184 ms', W / 2, H * 0.78, { size: 22, align: 'center', weight: 800, color: P.a, mono: true });
    },

    aim(g, W, H, P, rng, t) {
      for (let i = 0; i < 6; i++) {
        const x = 50 + ((i * 97) % (W - 100)), y = H * 0.22 + ((i * 61) % Math.floor(H * 0.5));
        const s = 1 - ((t * 0.6 + i * 0.17) % 1);
        g.ctx.globalAlpha = 0.35 + s * 0.65;
        g.circle(x, y, 24 * s + 8, alpha(P.b, 0.35));
        g.ring(x, y, 24 * s + 8, 2.5, P.b);
        g.circle(x, y, 6 * s + 2, P.c);
        g.ctx.globalAlpha = 1;
      }
      const cx = W * 0.5 + Math.sin(t * 1.4) * 70, cy = H * 0.5 + Math.cos(t * 1.7) * 40;
      g.ring(cx, cy, 20, 2, P.a);
      g.line(cx - 30, cy, cx - 8, cy, P.a, 2);
      g.line(cx + 8, cy, cx + 30, cy, P.a, 2);
      g.line(cx, cy - 30, cx, cy - 8, P.a, 2);
      g.line(cx, cy + 8, cx, cy + 30, P.a, 2);
      g.circle(cx, cy, 2.5, P.c);
    },

    rhythm(g, W, H, P, rng, t) {
      const lanes = 4, lw = 62, ox = W / 2 - lanes * lw / 2;
      for (let i = 0; i < lanes; i++) {
        g.rect(ox + i * lw + 2, 0, lw - 4, H, alpha(P.deep, 0.5));
        g.rect(ox + i * lw + 2, 0, 2, H, alpha(P.a, 0.2));
      }
      const notes = [[0, 0.1], [1, 0.35], [3, 0.5], [2, 0.72], [1, 0.9], [0, 1.15], [3, 1.3]];
      notes.forEach((n) => {
        const y = ((n[1] + t * 0.5) % 1.4) / 1.4 * H;
        g.rrect(ox + n[0] * lw + 8, y, lw - 16, 22, 7, [P.a, P.b, P.c, P.d][n[0]]);
        g.rrect(ox + n[0] * lw + 8, y, lw - 16, 8, 7, alpha('#ffffff', 0.3));
      });
      g.rect(ox, H * 0.8, lanes * lw, 4, P.ink);
      for (let i = 0; i < lanes; i++) {
        const hit = Math.abs(Math.sin(t * 3 + i)) > 0.92;
        g.rrect(ox + i * lw + 8, H * 0.8 + 8, lw - 16, 26, 8,
          hit ? P.c : alpha(P.ink, 0.14));
      }
    },

    claw(g, W, H, P, rng, t) {
      g.rrect(20, 14, W - 40, H * 0.82, 14, alpha('#7dd3fc', 0.07));
      g.rrectStroke(20, 14, W - 40, H * 0.82, 14, alpha(P.a, 0.35), 2);
      const toys = [[0.32, '#ff7ab6'], [0.44, '#7dd3fc'], [0.56, '#fde68a'], [0.68, '#c084fc'], [0.38, '#4ade80'], [0.62, '#ff8a3d']];
      toys.forEach((q, i) => {
        const x = W * q[0] + (i > 3 ? 22 : 0), y = H * (0.66 + (i % 2) * 0.08);
        S.blob(g, x, y, 18, q[1], t + i);
      });
      const cx = W * 0.5 + Math.sin(t * 0.9) * 90;
      const cy = 30 + (Math.sin(t * 1.3) + 1) / 2 * H * 0.3;
      g.rect(20, 20, W - 40, 8, mix(P.dim, P.deep, 0.3));
      g.line(cx, 28, cx, cy, P.dim, 3);
      const open = 0.4 + Math.sin(t * 1.3) * 0.3;
      g.push(cx, cy);
      g.line(0, 0, -18 * open - 4, 24, P.c, 5);
      g.line(0, 0, 18 * open + 4, 24, P.c, 5);
      g.circle(0, 0, 7, P.c);
      g.pop();
    },

    sling(g, W, H, P, rng, t) {
      g.rect(0, H * 0.8, W, H * 0.2, mix('#5b8f3f', P.deep, 0.34));
      const bx = W * 0.68;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        g.rect(bx + c * 34, H * 0.8 - 30 - r * 30, 28, 28, mix('#b98a4a', P.deep, 0.25));
        g.strokeRect(bx + c * 34, H * 0.8 - 30 - r * 30, 28, 28, alpha('#000', 0.28), 1.5);
      }
      S.blob(g, bx + 34, H * 0.8 - 106, 14, P.b, t);
      const sx = W * 0.2, sy = H * 0.66;
      g.rect(sx - 4, sy, 8, H * 0.14, mix('#7a5a34', P.deep, 0.1));
      g.line(sx - 4, sy, sx - 20, sy - 34, mix('#7a5a34', P.deep, 0.1), 6);
      g.line(sx + 4, sy, sx + 20, sy - 34, mix('#7a5a34', P.deep, 0.1), 6);
      const pull = (Math.sin(t * 1.4) + 1) / 2 * 26;
      g.line(sx - 20, sy - 34, sx - pull, sy - 14, P.c, 2.5);
      g.line(sx + 20, sy - 34, sx - pull, sy - 14, P.c, 2.5);
      g.circle(sx - pull, sy - 14, 11, P.a);
      const c = g.ctx;
      c.setLineDash([4, 8]); c.strokeStyle = alpha(P.ink, 0.3); c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 16; i++) {
        const k = i / 16, x = lerp(sx, bx + 30, k), y = sy - 14 - Math.sin(k * Math.PI) * 100 + k * 40;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke(); c.setLineDash([]);
    },

    pop(g, W, H, P, rng, t) {
      for (let i = 0; i < 16; i++) {
        const x = 30 + ((i * 83) % (W - 60));
        const y = H * 0.15 + ((i * 47 + t * 14) % (H * 0.62));
        const r = 12 + (i % 4) * 5;
        const k = ((t * 0.5 + i * 0.12) % 1);
        const pop = k > 0.9;
        const c = g.ctx;
        if (pop) {
          for (let s = 0; s < 6; s++) {
            const a = (s / 6) * TAU;
            g.circle(x + Math.cos(a) * (r + (k - 0.9) * 180), y + Math.sin(a) * (r + (k - 0.9) * 180), 3, P.c);
          }
        } else {
          c.fillStyle = g.radGrad(x - r * 0.3, y - r * 0.3, r * 0.1, r,
            [[0, alpha('#ffffff', 0.7)], [0.4, alpha([P.a, P.b, P.c, P.d][i % 4], 0.55)], [1, alpha([P.a, P.b, P.c, P.d][i % 4], 0.12)]]);
          c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
          c.strokeStyle = alpha('#ffffff', 0.3); c.lineWidth = 1;
          c.stroke();
        }
      }
    },

    rope(g, W, H, P, rng, t) {
      const ax = W * 0.34, ay = 26, bx2 = W * 0.68, by2 = 26;
      const sw = Math.sin(t * 1.4) * 24;
      const cx = W * 0.5 + sw, cy = H * 0.5;
      const c = g.ctx;
      c.strokeStyle = mix('#b98a4a', P.deep, 0.1); c.lineWidth = 4;
      c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + cx) / 2 - 8, (ay + cy) / 2, cx, cy); c.stroke();
      c.beginPath(); c.moveTo(bx2, by2); c.quadraticCurveTo((bx2 + cx) / 2 + 8, (by2 + cy) / 2, cx, cy); c.stroke();
      g.circle(ax, ay, 6, P.dim); g.circle(bx2, by2, 6, P.dim);
      g.rrect(cx - 15, cy - 13, 30, 26, 8, P.c);
      g.rrect(cx - 15, cy - 13, 30, 9, 8, alpha('#ffffff', 0.3));
      const mx = W * 0.5, my = H * 0.82;
      S.blob(g, mx, my, 24, P.a, t, true);
      g.push(W * 0.24, H * 0.34, -0.6 + Math.sin(t * 3) * 0.5);
      g.line(0, 0, 40, 0, alpha(P.b, 0.9), 3);
      g.pop();
    },

    tdlegacy(g, W, H, P, rng, t) {
      const c = g.ctx;
      c.strokeStyle = mix('#6b7a5a', P.deep, 0.3); c.lineWidth = 26; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-10, H * 0.2); c.lineTo(W * 0.24, H * 0.2); c.lineTo(W * 0.24, H * 0.56);
      c.lineTo(W * 0.56, H * 0.56); c.lineTo(W * 0.56, H * 0.24); c.lineTo(W * 0.84, H * 0.24);
      c.lineTo(W * 0.84, H * 0.8); c.lineTo(W + 10, H * 0.8);
      c.stroke();
      const towers = [[0.12, 0.42], [0.4, 0.34], [0.4, 0.74], [0.7, 0.5], [0.94, 0.5]];
      towers.forEach((p, i) => {
        const x = W * p[0], y = H * p[1];
        g.ctx.globalAlpha = 0.1; g.circle(x, y, 46, P.a); g.ctx.globalAlpha = 1;
        g.circle(x, y + 3, 15, alpha('#000', 0.35));
        g.ngon(x, y, 15, 6, 0, [P.a, P.c, P.b, P.d, P.a][i]);
        g.push(x, y, t * (0.8 + i * 0.2));
        g.rect(0, -3.5, 24, 7, mix(P.ink, P.deep, 0.2));
        g.pop();
      });
      for (let i = 0; i < 6; i++) {
        const k = ((t * 0.1 + i * 0.16) % 1);
        let x, y;
        if (k < 0.24) { x = lerp(-10, W * 0.24, k / 0.24); y = H * 0.2; }
        else if (k < 0.42) { x = W * 0.24; y = lerp(H * 0.2, H * 0.56, (k - 0.24) / 0.18); }
        else if (k < 0.62) { x = lerp(W * 0.24, W * 0.56, (k - 0.42) / 0.2); y = H * 0.56; }
        else if (k < 0.78) { x = W * 0.56; y = lerp(H * 0.56, H * 0.24, (k - 0.62) / 0.16); }
        else { x = lerp(W * 0.56, W * 0.84, (k - 0.78) / 0.22); y = H * 0.24; }
        S.blob(g, x, y, 10 + (i % 3) * 2, i % 3 === 0 ? P.b : P.d, t + i);
      }
      g.text('40 OLEADAS', W * 0.5, H * 0.94, {
        size: 15, align: 'center', weight: 900, color: alpha(P.c, 0.9), letterSpacing: 3 });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
