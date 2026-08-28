/* Dibuja la Línea — traza rampas y deja que la física haga el resto. */
NX.game('dibuja-la-linea', {
  w: 880, h: 600, pal: 'candy',
  music: { root: 50, scale: 'lydian', bpm: 76, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 900;

  const LEVELS = [
    { ball: [90, 90], goal: [780, 470], walls: [[380, 240, 24, 200]], stars: [[400, 180]], ink: 900 },
    { ball: [80, 80], goal: [800, 330], walls: [[300, 0, 24, 260], [560, 300, 24, 300]], stars: [[330, 330], [640, 160]], ink: 1000 },
    { ball: [70, 70], goal: [810, 520], walls: [[240, 160, 300, 22], [420, 330, 300, 22]], stars: [[200, 300], [700, 240]], ink: 1000 },
    { ball: [80, 60], goal: [780, 500], walls: [[300, 200, 22, 240], [520, 0, 22, 260], [640, 300, 22, 300]], stars: [[420, 120], [600, 420]], ink: 1200 },
    { ball: [70, 90], goal: [820, 180], walls: [[220, 260, 400, 22], [700, 240, 22, 200]], stars: [[400, 190], [560, 460]], ink: 1300 },
  ];

  let lvl, ball, goal, walls, stars, strokes, cur, ink, maxInk, running, done, t, tries;

  function reset(i) {
    lvl = i == null ? (lvl || 0) : i;
    const L = LEVELS[lvl % LEVELS.length];
    ball = { x: L.ball[0], y: L.ball[1], vx: 0, vy: 0, r: 13, rot: 0 };
    goal = { x: L.goal[0], y: L.goal[1], r: 26 };
    walls = L.walls.map((w) => ({ x: w[0], y: w[1], w: w[2], h: w[3] }));
    stars = L.stars.map((s) => ({ x: s[0], y: s[1], got: false, ph: 0 }));
    strokes = []; cur = null;
    maxInk = L.ink; ink = maxInk;
    running = false; done = false; t = 0; tries = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Nivel: (lvl % LEVELS.length) + 1 + '/' + LEVELS.length, Tinta: Math.round(ink), Estrellas: stars.filter((s) => s.got).length + '/' + stars.length });
  }

  function restartBall() {
    const L = LEVELS[lvl % LEVELS.length];
    ball.x = L.ball[0]; ball.y = L.ball[1]; ball.vx = 0; ball.vy = 0;
    running = false; tries++;
  }

  function segments() {
    const segs = [];
    strokes.forEach((s) => {
      for (let i = 1; i < s.length; i++) segs.push([s[i - 1].x, s[i - 1].y, s[i].x, s[i].y]);
    });
    walls.forEach((w) => {
      segs.push([w.x, w.y, w.x + w.w, w.y], [w.x + w.w, w.y, w.x + w.w, w.y + w.h],
                [w.x + w.w, w.y + w.h, w.x, w.y + w.h], [w.x, w.y + w.h, w.x, w.y]);
    });
    return segs;
  }

  reset(0);

  return {
    update(dt) {
      t += dt;
      stars.forEach((s) => { s.ph += dt * 4; });
      const p = E.input.pointer;

      if (p.pressed) {
        if (p.y > H - 56 && Math.abs(p.x - (W - 90)) < 66) { restartBall(); strokes = []; ink = maxInk; E.sfx('close'); hud(); return; }
        if (p.y > H - 56 && Math.abs(p.x - (W - 230)) < 66) { running = true; E.sfx('select'); return; }
      }
      if (!running && p.down && ink > 0 && p.y < H - 70) {
        if (!cur) { cur = [{ x: p.x, y: p.y }]; strokes.push(cur); }
        else {
          const last = cur[cur.length - 1];
          const d = M.dist(last.x, last.y, p.x, p.y);
          if (d > 6 && ink > 0) {
            cur.push({ x: p.x, y: p.y });
            ink -= d;
            if (ink <= 0) { ink = 0; cur = null; }
            hud();
          }
        }
      }
      if (!p.down && cur) { cur = null; E.sfx('tap'); }
      if (E.input.pressed('space')) running = true;
      if (E.input.pressed('r')) { restartBall(); strokes = []; ink = maxInk; hud(); }

      if (!running || done) return;

      const segs = segments();
      const sub = 4;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        ball.vy += GRAV * h;
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        ball.rot += ball.vx * h * 0.06;
        segs.forEach((sg) => {
          const d = M.distToSeg(ball.x, ball.y, sg[0], sg[1], sg[2], sg[3]);
          if (d < ball.r) {
            const dx = sg[2] - sg[0], dy = sg[3] - sg[1];
            const len2 = dx * dx + dy * dy || 1;
            const tt = M.clamp01(((ball.x - sg[0]) * dx + (ball.y - sg[1]) * dy) / len2);
            const px = sg[0] + dx * tt, py = sg[1] + dy * tt;
            let nx = ball.x - px, ny = ball.y - py;
            const nl = Math.hypot(nx, ny) || 1;
            nx /= nl; ny /= nl;
            ball.x = px + nx * ball.r; ball.y = py + ny * ball.r;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 1.45 * dot * nx; ball.vy -= 1.45 * dot * ny;
            ball.vx *= 0.985; ball.vy *= 0.985;
          }
        });
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
      }

      stars.forEach((s) => {
        if (!s.got && M.dist(s.x, s.y, ball.x, ball.y) < 28) {
          s.got = true; E.sfx('coin');
          E.particles.burst(s.x, s.y, 10, { col: [P.c], speed1: 160, add: true });
          hud();
        }
      });

      if (M.dist(ball.x, ball.y, goal.x, goal.y) < goal.r + ball.r) {
        done = true;
        E.sfx('win'); E.camera.kick(5);
        E.particles.burst(goal.x, goal.y, 24, { col: [P.c, P.a], speed1: 250, add: true });
        setTimeout(() => {
          lvl++;
          E.api.win({
            score: Math.round(1000 + ink * 0.5 + stars.filter((s) => s.got).length * 500 - tries * 50),
            title: '¡Llegó a la meta!',
            msg: 'Estrellas: ' + stars.filter((s) => s.got).length + '/' + stars.length,
            stats: { Tinta: Math.round(ink), Intentos: tries + 1 },
          });
        }, 700);
      }
      if (ball.y > H + 80) restartBall();
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 12);
      g.bgGrid(40, alpha(P.a, 0.05), 1, 0, 0);

      walls.forEach((w) => {
        g.rrect(w.x, w.y, w.w, w.h, 4, mix(P.dim, P.deep, 0.35));
        g.rrectStroke(w.x, w.y, w.w, w.h, 4, alpha(P.a, 0.35), 1.5);
      });

      g.bloom(goal.x, goal.y, goal.r * 2.4, P.c, 0.4);
      g.ring(goal.x, goal.y, goal.r, 4, P.c);
      g.circle(goal.x, goal.y, goal.r * 0.42 + Math.sin(t * 3) * 2, alpha(P.c, 0.5));

      stars.forEach((s) => {
        if (s.got) return;
        g.bloom(s.x, s.y, 24, P.b, 0.4);
        g.star(s.x, s.y, 13, 6, 5, s.ph * 0.4, P.b);
      });

      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      strokes.forEach((s) => {
        if (s.length < 2) return;
        const pts = [];
        s.forEach((q) => pts.push(q.x, q.y));
        g.curve(pts, P.a, 7);
      });
      c.restore();

      g.push(ball.x, ball.y, ball.rot);
      g.bloom(0, 0, 28, P.ink, 0.3);
      g.circle(0, 0, ball.r, P.ink);
      g.circle(0, -4, 4, P.deep);
      g.pop();

      /* barra de tinta */
      g.rrect(24, H - 46, 220, 12, 6, 'rgba(255,255,255,.12)');
      g.rrect(24, H - 46, 220 * (ink / maxInk), 12, 6, ink > maxInk * 0.2 ? P.a : '#ff4d6d');
      g.text('TINTA', 24, H - 54, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.4 });

      const btn = (x, label, col) => {
        const hov = E.input.pointer.y > H - 56 && Math.abs(E.input.pointer.x - x) < 66;
        g.rrect(x - 66, H - 58, 132, 40, 11, hov ? alpha(col, 0.35) : 'rgba(255,255,255,.07)');
        g.text(label, x, H - 32, { size: 15, align: 'center', weight: 800, color: P.ink });
      };
      btn(W - 230, '▶ Soltar', P.c);
      btn(W - 90, '↺ Borrar', P.a);

      E.particles.draw(g);
      E.ui.hint(running ? 'Rodando…' : 'Dibuja con el ratón y pulsa Soltar', { bottom: 76 });
    },
  };
});
