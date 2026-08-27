/* Grúa de Premios — la máquina de peluches, pero sin tragarse tus monedas. */
NX.game('grua-de-premios', {
  w: 700, h: 700, pal: 'candy',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'BAJAR' }] },
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const RAIL_Y = 90, FLOOR = H - 120, CHUTE_X = 92;

  let claw, toys, tries, score, won, phase, held, msg, msgT, alive;
  const COLS = ['#ff7ab6', '#7dd3fc', '#fde68a', '#c084fc', '#4ade80', '#ff8a3d'];

  function reset() {
    claw = { x: W / 2, y: RAIL_Y, open: 1, vy: 0 };
    toys = [];
    for (let i = 0; i < 16; i++) {
      toys.push({
        x: E.rng.float(160, W - 60), y: FLOOR - E.rng.float(0, 90),
        vx: 0, vy: 0, r: E.rng.float(20, 30), col: E.rng.pick(COLS),
        rare: E.rng.bool(0.15), ph: E.rng.float(0, 6), held: false, saved: false,
      });
    }
    tries = 8; score = 0; won = 0; phase = 'move'; held = null; msg = ''; msgT = 0; alive = true;
    hud();
  }
  function hud() { E.api.hud({ Intentos: tries, Premios: won, Puntos: M.fmtScore(score) }); }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      /* física básica de los peluches */
      toys.forEach((t2) => {
        if (t2.held || t2.saved) return;
        t2.vy += 900 * dt;
        t2.y += t2.vy * dt; t2.x += t2.vx * dt;
        t2.vx *= Math.exp(-3 * dt);
        if (t2.y > FLOOR) { t2.y = FLOOR; t2.vy *= -0.2; }
        toys.forEach((o) => {
          if (o === t2 || o.held || o.saved) return;
          const d = M.dist(t2.x, t2.y, o.x, o.y);
          if (d < t2.r + o.r && d > 0) {
            const nx = (t2.x - o.x) / d, ny = (t2.y - o.y) / d;
            const ov = (t2.r + o.r - d) / 2;
            t2.x += nx * ov; t2.y += ny * ov;
            o.x -= nx * ov; o.y -= ny * ov;
          }
        });
        t2.x = M.clamp(t2.x, 150, W - 40);
      });
      if (!alive) return;

      if (phase === 'move') {
        const ax = E.input.axis().x;
        claw.x = M.clamp(claw.x + ax * 260 * dt, 150, W - 50);
        const p = E.input.pointer;
        if (p.down && p.y < FLOOR - 40) claw.x = M.clamp(M.damp(claw.x, p.x, 12, dt), 150, W - 50);
        if (E.input.pressed('space') || E.input.pressed('down') || (p.pressed && p.y > FLOOR - 40)) {
          phase = 'down'; E.sfx('tick');
        }
      } else if (phase === 'down') {
        claw.y += 300 * dt;
        claw.open = 1;
        if (claw.y >= FLOOR - 20) { phase = 'grab'; claw.y = FLOOR - 20; E.sfx('thud'); }
      } else if (phase === 'grab') {
        claw.open = M.damp(claw.open, 0, 8, dt);
        if (claw.open < 0.15) {
          const t2 = toys.filter((q) => !q.saved && !q.held)
            .sort((a, b) => M.dist(a.x, a.y, claw.x, claw.y) - M.dist(b.x, b.y, claw.x, claw.y))[0];
          if (t2 && M.dist(t2.x, t2.y, claw.x, claw.y + 22) < t2.r + 22) {
            /* agarre con probabilidad: los raros resbalan más */
            const grip = t2.rare ? 0.45 : 0.72;
            if (E.rng.bool(grip)) { held = t2; t2.held = true; E.sfx('select'); }
            else { msg = 'Se te escapó'; msgT = 1.4; E.sfx('error'); }
          }
          phase = 'up';
          tries--;
          hud();
        }
      } else if (phase === 'up') {
        claw.y = M.damp(claw.y, RAIL_Y, 6, dt);
        if (held) { held.x = claw.x; held.y = claw.y + 40; }
        if (Math.abs(claw.y - RAIL_Y) < 2) { phase = 'carry'; }
      } else if (phase === 'carry') {
        claw.x = M.damp(claw.x, CHUTE_X, 4, dt);
        if (held) { held.x = claw.x; held.y = claw.y + 40; }
        if (Math.abs(claw.x - CHUTE_X) < 3) {
          claw.open = M.damp(claw.open, 1, 8, dt);
          if (claw.open > 0.8) {
            if (held) {
              held.saved = true; held.held = false;
              won++;
              const pts = held.rare ? 800 : 250;
              score += pts;
              E.sfx('coin');
              E.floaters.add(CHUTE_X, FLOOR - 60, '+' + pts, { col: P.c, size: 22 });
              held = null;
            }
            phase = 'move';
            hud();
            if (tries <= 0) {
              alive = false;
              setTimeout(() => E.api.over({
                score, msg: won + (won === 1 ? ' premio conseguido' : ' premios conseguidos'),
                stats: { Premios: won },
              }), 700);
            }
          }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      /* cabina */
      g.rrect(24, 40, W - 48, H - 70, 20, alpha('#7dd3fc', 0.06));
      g.rrectStroke(24, 40, W - 48, H - 70, 20, alpha(P.a, 0.4), 3);
      g.rect(24, FLOOR + 24, W - 48, 6, alpha(P.a, 0.3));

      /* rampa de salida */
      g.rrect(40, FLOOR - 60, 108, 84, 12, alpha(P.deep, 0.75));
      g.text('PREMIOS', 94, FLOOR - 34, { size: 12, align: 'center', color: P.c, weight: 800, letterSpacing: 1.4 });
      g.text(String(won), 94, FLOOR + 4, { size: 26, align: 'center', color: P.ink, weight: 900, mono: true });

      toys.forEach((t2) => {
        if (t2.saved) return;
        G.Sprites.blob(g, t2.x, t2.y - t2.r, t2.r, t2.col, E.t + t2.ph);
        if (t2.rare) g.star(t2.x, t2.y - t2.r * 2.1, 8, 4, 5, E.t * 2, P.c);
      });

      /* raíl y grúa */
      g.rect(40, RAIL_Y - 12, W - 80, 8, mix(P.dim, P.deep, 0.3));
      g.line(claw.x, RAIL_Y - 8, claw.x, claw.y, P.dim, 3);
      g.rrect(claw.x - 18, RAIL_Y - 18, 36, 18, 5, mix(P.dim, P.ink, 0.15));
      const open = claw.open;
      g.push(claw.x, claw.y);
      g.circle(0, 0, 9, P.c);
      g.line(0, 0, -16 * open - 6, 30, P.c, 5);
      g.line(0, 0, 16 * open + 6, 30, P.c, 5);
      g.line(-16 * open - 6, 30, -18 * open - 4, 42, P.c, 5);
      g.line(16 * open + 6, 30, 18 * open + 4, 42, P.c, 5);
      g.pop();

      for (let i = 0; i < tries; i++) {
        g.circle(W - 50 - i * 22, 62, 8, P.c);
      }
      g.text('INTENTOS', W - 50, 40, { size: 10, align: 'right', color: P.dim, weight: 800, letterSpacing: 1.2 });

      if (msgT > 0) E.ui.title(msg, W / 2, 140, { size: 24 });
      E.floaters.draw(g);
      E.ui.hint(phase === 'move' ? '← → mover · Espacio para bajar la garra' : 'Bajando…', { bottom: 14 });
    },
  };
});
