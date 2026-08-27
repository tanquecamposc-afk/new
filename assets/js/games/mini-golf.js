/* Mini Golf — 18 hoyos con rampas, muros y obstáculos móviles. */
NX.game('mini-golf', {
  w: 860, h: 620, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  /* Cada hoyo: inicio, agujero, muros [x,y,w,h], arena, obstáculos móviles. */
  const HOLES = [
    { s: [120, 310], h: [740, 310], w: [], par: 2 },
    { s: [110, 480], h: [750, 150], w: [[400, 220, 30, 300]], par: 3 },
    { s: [120, 310], h: [740, 310], w: [[300, 0, 30, 240], [300, 380, 30, 240]], par: 3 },
    { s: [110, 150], h: [750, 470], w: [[260, 150, 340, 30], [400, 340, 340, 30]], par: 4 },
    { s: [130, 310], h: [730, 310], w: [[430, 160, 30, 130], [430, 330, 30, 130]], sand: [[350, 260, 180, 100]], par: 3 },
    { s: [110, 500], h: [430, 130], w: [[240, 300, 400, 30], [640, 100, 30, 230]], par: 4 },
    { s: [120, 130], h: [740, 500], w: [[300, 100, 30, 320], [520, 220, 30, 320]], par: 4 },
    { s: [430, 540], h: [430, 110], w: [[260, 250, 340, 30]], mov: [[430, 380, 120, 22, 200, 0, 1.2]], par: 3 },
    { s: [110, 310], h: [760, 310], w: [[300, 210, 30, 200], [520, 0, 30, 250], [520, 380, 30, 250]], par: 4 },
    { s: [120, 500], h: [740, 140], w: [[250, 380, 320, 26], [430, 200, 320, 26]], sand: [[600, 380, 160, 120]], par: 4 },
  ];

  let hole, ball, cup, walls, sand, movers, strokes, total, drag, alive, par, msg, msgT, done;

  function loadHole(i) {
    hole = i;
    const Hh = HOLES[i % HOLES.length];
    ball = { x: Hh.s[0], y: Hh.s[1], vx: 0, vy: 0, r: 9 };
    cup = { x: Hh.h[0], y: Hh.h[1], r: 17 };
    walls = (Hh.w || []).map((w) => ({ x: w[0], y: w[1], w: w[2], h: w[3] }));
    sand = (Hh.sand || []).map((s) => ({ x: s[0], y: s[1], w: s[2], h: s[3] }));
    movers = (Hh.mov || []).map((m) => ({ x0: m[0], y0: m[1], w: m[2], h: m[3], amp: m[4], ay: m[5], sp: m[6], t: 0, x: m[0], y: m[1] }));
    par = Hh.par;
    strokes = 0; drag = null; done = false;
    hud();
  }

  function reset() {
    total = 0;
    alive = true; msg = ''; msgT = 0;
    loadHole(0);
  }
  function hud() {
    E.api.hud({ Hoyo: (hole % HOLES.length) + 1 + '/' + HOLES.length, Golpes: strokes, Par: par, Total: total });
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      movers.forEach((m) => {
        m.t += dt * m.sp;
        const k = (Math.sin(m.t) + 1) / 2;
        m.x = m.x0 + (m.amp || 0) * (k - 0.5);
        m.y = m.y0 + (m.ay || 0) * (k - 0.5);
      });

      const sp = Math.hypot(ball.vx, ball.vy);
      const p = E.input.pointer;
      if (sp < 6 && !done) {
        ball.vx = ball.vy = 0;
        if (p.pressed && M.dist(p.x, p.y, ball.x, ball.y) < 90) drag = { x: p.x, y: p.y };
        if (drag && p.down) drag = { x: p.x, y: p.y };
        if (drag && p.released) {
          const dx = ball.x - drag.x, dy = ball.y - drag.y;
          const len = Math.hypot(dx, dy);
          if (len > 12) {
            const power = Math.min(len, 190) / 190;
            ball.vx = dx / len * power * 900;
            ball.vy = dy / len * power * 900;
            strokes++;
            E.sfx('tap');
            hud();
          }
          drag = null;
        }
      }

      const sub = 4;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        const inSand = sand.some((q) => ball.x > q.x && ball.x < q.x + q.w && ball.y > q.y && ball.y < q.y + q.h);
        const fr = inSand ? 3.4 : 0.9;
        ball.vx *= Math.exp(-fr * h); ball.vy *= Math.exp(-fr * h);
        ball.x += ball.vx * h; ball.y += ball.vy * h;

        if (ball.x < ball.r + 16) { ball.x = ball.r + 16; ball.vx = Math.abs(ball.vx) * 0.75; E.sfx('pong'); }
        if (ball.x > W - ball.r - 16) { ball.x = W - ball.r - 16; ball.vx = -Math.abs(ball.vx) * 0.75; E.sfx('pong'); }
        if (ball.y < ball.r + 70) { ball.y = ball.r + 70; ball.vy = Math.abs(ball.vy) * 0.75; E.sfx('pong'); }
        if (ball.y > H - ball.r - 20) { ball.y = H - ball.r - 20; ball.vy = -Math.abs(ball.vy) * 0.75; E.sfx('pong'); }

        walls.concat(movers).forEach((w) => {
          if (ball.x + ball.r > w.x && ball.x - ball.r < w.x + w.w &&
              ball.y + ball.r > w.y && ball.y - ball.r < w.y + w.h) {
            const ox = Math.min(ball.x + ball.r - w.x, w.x + w.w - (ball.x - ball.r));
            const oy = Math.min(ball.y + ball.r - w.y, w.y + w.h - (ball.y - ball.r));
            if (ox < oy) { ball.vx *= -0.78; ball.x += ball.vx > 0 ? ox : -ox; }
            else { ball.vy *= -0.78; ball.y += ball.vy > 0 ? oy : -oy; }
            E.sfx('pong');
          }
        });

        const d = M.dist(ball.x, ball.y, cup.x, cup.y);
        if (d < cup.r && Math.hypot(ball.vx, ball.vy) < 420 && !done) {
          done = true;
          total += strokes;
          const diff = strokes - par;
          msg = diff <= -2 ? '¡Águila!' : diff === -1 ? '¡Birdie!' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : '+' + diff;
          msgT = 1.8;
          E.sfx('win'); E.camera.kick(4);
          E.particles.burst(cup.x, cup.y, 18, { col: [P.c, '#fff'], speed1: 200, add: true });
          hud();
          setTimeout(() => {
            if (hole + 1 >= HOLES.length) {
              alive = false;
              E.api.win({
                score: Math.max(0, 20000 - total * 300), label: 'Puntos',
                title: 'Recorrido completo',
                msg: total + ' golpes en ' + HOLES.length + ' hoyos',
                stats: { Golpes: total },
              });
            } else loadHole(hole + 1);
          }, 1500);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#1d5c30', P.deep, 0.4), mix('#123f21', P.deep, 0.35));
      g.rect(16, 70, W - 32, H - 90, mix('#2f8f45', P.deep, 0.15));
      for (let i = 0; i < 30; i++) g.rect(16, 70 + i * 18, W - 32, 9, alpha('#ffffff', 0.02));
      g.rrectStroke(16, 70, W - 32, H - 90, 6, mix('#7a5a34', P.deep, 0.1), 10);

      sand.forEach((s) => {
        g.rrect(s.x, s.y, s.w, s.h, 20, mix('#e0c48a', P.deep, 0.15));
      });

      /* hoyo */
      g.circle(cup.x, cup.y, cup.r, '#0a0f16');
      g.ring(cup.x, cup.y, cup.r, 2, alpha('#000', 0.5));
      g.rect(cup.x - 1.5, cup.y - 66, 3, 66, '#f2f6ff');
      g.poly([cup.x + 1, cup.y - 66, cup.x + 34, cup.y - 57, cup.x + 1, cup.y - 48], '#ff4d6d');

      walls.forEach((w) => {
        g.rrect(w.x, w.y, w.w, w.h, 5, mix('#7a5a34', P.deep, 0.15));
        g.rrect(w.x, w.y, w.w, Math.min(6, w.h), 5, alpha('#ffffff', 0.15));
      });
      movers.forEach((m) => {
        g.rrect(m.x, m.y, m.w, m.h, 5, P.c);
        g.rrect(m.x, m.y, m.w, 5, 5, alpha('#ffffff', 0.3));
      });

      if (drag) {
        const dx = ball.x - drag.x, dy = ball.y - drag.y;
        const len = Math.min(Math.hypot(dx, dy), 190);
        const a = Math.atan2(dy, dx);
        c.save(); c.setLineDash([5, 7]);
        g.line(ball.x, ball.y, ball.x + Math.cos(a) * len * 1.6, ball.y + Math.sin(a) * len * 1.6,
          alpha('#ffffff', 0.5), 2.5);
        c.restore();
        g.rrect(ball.x - 30, ball.y + 26, 60, 8, 4, 'rgba(0,0,0,.4)');
        g.rrect(ball.x - 30, ball.y + 26, 60 * (len / 190), 8, 4, len > 160 ? '#ff4d6d' : P.c);
      }

      c.save(); c.globalAlpha = 0.3;
      g.circle(ball.x + 3, ball.y + 4, ball.r, '#000');
      c.restore();
      g.circle(ball.x, ball.y, ball.r, '#ffffff');
      g.circle(ball.x - 3, ball.y - 3, 3, '#d7dfee');

      g.text('HOYO ' + ((hole % HOLES.length) + 1), 30, 46, { size: 20, weight: 900, color: P.ink, letterSpacing: 2 });
      g.text('Par ' + par + ' · golpes: ' + strokes, W - 30, 46, { size: 15, align: 'right', color: P.dim, weight: 700 });
      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.4, { size: 42 });

      E.particles.draw(g);
      E.ui.hint('Arrastra hacia atrás desde la bola y suelta', { bottom: 12 });
    },
  };
});
