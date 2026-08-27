/* Pinball Neón — mesa completa con física real de flippers, dianas y multibola. */
NX.game('pinball-neon', {
  w: 520, h: 720, pal: 'royal',
  controls: { buttons: [{ k: 'left', label: '◀' }, { k: 'right', label: '▶' }] },
  music: { root: 43, scale: 'minor', bpm: 118, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 900;

  let balls, flipL, flipR, bumpers, targets, score, ballsLeft, alive, mult, plunger, launching, msgT, msg;

  const WALLS = [
    [16, 60, 16, H - 150], [W - 16, 60, W - 16, H - 150],
    [16, 60, 90, 20], [W - 16, 60, W - 90, 20],
    [16, H - 150, 150, H - 60], [W - 16, H - 150, W - 150, H - 60],
    [90, 20, W - 90, 20],
    [W - 52, 100, W - 52, H - 130],
  ];

  function reset() {
    balls = [];
    flipL = { x: 152, y: H - 74, a: 0.5, len: 74, dir: 1, t: 0 };
    flipR = { x: W - 152, y: H - 74, a: Math.PI - 0.5, len: 74, dir: -1, t: 0 };
    bumpers = [
      { x: W * 0.32, y: 200, r: 26, hit: 0 },
      { x: W * 0.62, y: 175, r: 26, hit: 0 },
      { x: W * 0.47, y: 275, r: 26, hit: 0 },
    ];
    targets = [];
    for (let i = 0; i < 5; i++) targets.push({ x: 70 + i * 68, y: 380, w: 44, h: 12, on: true });
    score = 0; ballsLeft = 3; alive = true; mult = 1; plunger = 0; launching = true; msgT = 0; msg = '';
    newBall();
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Bolas: ballsLeft, Multi: '×' + mult }); }

  function newBall() {
    balls.push({ x: W - 34, y: H - 180, vx: 0, vy: 0, r: 9, held: true });
    launching = true; plunger = 0;
  }

  function addScore(n, x, y, txt) {
    score += n * mult;
    if (x != null) E.floaters.add(x, y, txt || ('+' + (n * mult)), { col: P.c, size: 15 });
    hud();
  }

  function segCollide(b, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = M.clamp01(((b.x - x1) * dx + (b.y - y1) * dy) / len2);
    const px = x1 + dx * t, py = y1 + dy * t;
    const d = M.dist(b.x, b.y, px, py);
    if (d < b.r && d > 0.001) {
      const nx = (b.x - px) / d, ny = (b.y - py) / d;
      b.x = px + nx * b.r; b.y = py + ny * b.r;
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= 1.7 * dot * nx; b.vy -= 1.7 * dot * ny;
      return true;
    }
    return false;
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (msgT > 0) msgT -= dt;
      const wantL = E.input.down('left') || E.input.down('a') ||
        (E.input.pointer.down && E.input.pointer.x < W / 2);
      const wantR = E.input.down('right') || E.input.down('d') ||
        (E.input.pointer.down && E.input.pointer.x >= W / 2);
      flipL.t = M.damp(flipL.t, wantL ? 1 : 0, 26, dt);
      flipR.t = M.damp(flipR.t, wantR ? 1 : 0, 26, dt);
      if (wantL && flipL.t < 0.5) E.sfx('tap');

      const la = M.lerp(0.55, -0.5, flipL.t);
      const ra = M.lerp(Math.PI - 0.55, Math.PI + 0.5, flipR.t);

      if (launching) {
        const b = balls[0];
        if (E.input.down('space') || E.input.pointer.down) plunger = Math.min(1, plunger + dt * 1.4);
        else if (plunger > 0.05) {
          b.held = false; b.vy = -(500 + plunger * 780); launching = false;
          E.sfx('charge'); plunger = 0;
        }
        if (b && b.held) { b.y = H - 180 + plunger * 30; }
      }

      const sub = 4;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          if (b.held) continue;
          b.vy += GRAV * h;
          b.x += b.vx * h; b.y += b.vy * h;
          b.vx *= Math.exp(-0.25 * h); b.vy *= Math.exp(-0.08 * h);

          WALLS.forEach((w) => {
            if (b.x > W - 60 && w[0] === W - 52 && b.y > H - 200) return;
            segCollide(b, w[0], w[1], w[2], w[3]);
          });
          /* canal del lanzador */
          if (b.y > H - 210 && b.x > W - 52) { if (b.x < W - 44) b.x = W - 44; }

          bumpers.forEach((bm) => {
            const d = M.dist(b.x, b.y, bm.x, bm.y);
            if (d < bm.r + b.r) {
              const nx = (b.x - bm.x) / d, ny = (b.y - bm.y) / d;
              b.x = bm.x + nx * (bm.r + b.r); b.y = bm.y + ny * (bm.r + b.r);
              const sp = Math.max(320, Math.hypot(b.vx, b.vy) * 1.05);
              b.vx = nx * sp; b.vy = ny * sp;
              bm.hit = 1;
              addScore(100, bm.x, bm.y - 30);
              E.sfx('pong'); E.camera.kick(3);
              E.particles.burst(bm.x, bm.y, 8, { col: [P.c, P.a], speed1: 200, add: true });
            }
          });

          targets.forEach((t) => {
            if (!t.on) return;
            if (b.x > t.x - t.w / 2 - b.r && b.x < t.x + t.w / 2 + b.r &&
                b.y > t.y - t.h / 2 - b.r && b.y < t.y + t.h / 2 + b.r) {
              t.on = false;
              b.vy = Math.abs(b.vy) * 0.85 + 120;
              addScore(250, t.x, t.y - 20);
              E.sfx('coin');
              if (targets.every((q) => !q.on)) {
                targets.forEach((q) => { q.on = true; });
                mult = Math.min(8, mult + 1);
                msg = 'Multiplicador ×' + mult; msgT = 2;
                E.sfx('levelup');
                if (mult >= 3 && balls.length < 3) {
                  balls.push({ x: W * 0.47, y: 300, vx: E.rng.float(-160, 160), vy: -260, r: 9 });
                  msg = '¡MULTIBOLA!'; msgT = 2.4;
                }
                hud();
              }
            }
          });

          /* flippers como segmentos móviles */
          const lx2 = flipL.x + Math.cos(la) * flipL.len, ly2 = flipL.y + Math.sin(la) * flipL.len;
          if (segCollide(b, flipL.x, flipL.y, lx2, ly2)) {
            const boost = flipL.t > 0.1 && wantL ? 560 : 190;
            b.vy = -Math.abs(b.vy) * 0.5 - boost;
            b.vx += (b.x - flipL.x) * 3.4;
            E.sfx('bounce');
          }
          const rx2 = flipR.x + Math.cos(ra) * flipR.len, ry2 = flipR.y + Math.sin(ra) * flipR.len;
          if (segCollide(b, flipR.x, flipR.y, rx2, ry2)) {
            const boost = flipR.t > 0.1 && wantR ? 560 : 190;
            b.vy = -Math.abs(b.vy) * 0.5 - boost;
            b.vx += (b.x - flipR.x) * 3.4;
            E.sfx('bounce');
          }

          if (b.y > H + 40) {
            balls.splice(i, 1);
            if (!balls.length) {
              ballsLeft--;
              mult = 1;
              E.sfx('lose'); E.camera.flash('#ff4d6d', 0.3);
              hud();
              if (ballsLeft <= 0) {
                alive = false;
                setTimeout(() => E.api.over({ score, msg: 'Se acabaron las bolas' }), 600);
              } else newBall();
            }
          }
        }
      }
      bumpers.forEach((bm) => { bm.hit = Math.max(0, bm.hit - dt * 3); });
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.rrect(10, 12, W - 20, H - 24, 40, alpha(P.deep, 0.5));
      g.rrectStroke(10, 12, W - 20, H - 24, 40, alpha(P.a, 0.3), 2);

      c.save(); c.strokeStyle = alpha(P.a, 0.55); c.lineWidth = 5; c.lineCap = 'round';
      WALLS.forEach((w) => { c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[2], w[3]); c.stroke(); });
      c.restore();

      targets.forEach((t) => {
        g.rrect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, 4, t.on ? P.c : alpha(P.dim, 0.3));
        if (t.on) g.bloom(t.x, t.y, 26, P.c, 0.35);
      });

      bumpers.forEach((bm) => {
        g.bloom(bm.x, bm.y, 46 + bm.hit * 30, P.b, 0.4 + bm.hit * 0.4);
        g.circle(bm.x, bm.y, bm.r + bm.hit * 3, mix(P.b, P.deep, 0.15));
        g.ring(bm.x, bm.y, bm.r + bm.hit * 3, 3, P.ink);
        g.circle(bm.x, bm.y, bm.r * 0.42, P.c);
      });

      const la = M.lerp(0.55, -0.5, flipL.t), ra = M.lerp(Math.PI - 0.55, Math.PI + 0.5, flipR.t);
      g.capsule(flipL.x, flipL.y, flipL.x + Math.cos(la) * flipL.len, flipL.y + Math.sin(la) * flipL.len, 9, P.a);
      g.capsule(flipR.x, flipR.y, flipR.x + Math.cos(ra) * flipR.len, flipR.y + Math.sin(ra) * flipR.len, 9, P.a);

      balls.forEach((b) => {
        g.bloom(b.x, b.y, 26, '#fff', 0.4);
        g.circle(b.x, b.y, b.r, '#dfe7f5');
        g.circle(b.x - 3, b.y - 3, 3, '#fff');
      });

      if (launching) {
        g.rrect(W - 42, H - 150 + (1 - plunger) * 6, 16, 60, 6, alpha(P.c, 0.6));
        g.rrect(W - 42, H - 96, 16, 8 + plunger * 26, 4, P.c);
      }

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(M.fmtScore(score), W / 2, 46, {
        size: 30, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.5), shadowBlur: 16,
      });
      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.42, { size: 32 });
      E.ui.hint(launching ? 'Mantén Espacio y suelta para lanzar' : '← → flippers', { bottom: 14 });
    },
  };
});
