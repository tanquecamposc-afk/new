/* Enjambre Letal — bullet hell puro: no disparas, solo esquivas y aguantas. */
NX.game('enjambre-letal', {
  w: 900, h: 620, pal: 'toxic',
  controls: { stick: true, buttons: [{ k: 'shift', label: 'LENTO' }] },
  music: { root: 38, scale: 'minor', bpm: 132, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let hero, bullets, emitters, t, best, alive, graze, lives, iT, patternT, pattern;

  function reset() {
    hero = { x: W / 2, y: H * 0.78, r: 4 };
    bullets = []; emitters = [];
    t = 0; alive = true; graze = 0; lives = 3; iT = 0; patternT = 0; pattern = 0;
    addEmitter();
    hud();
  }
  function hud() {
    E.api.hud({ Tiempo: M.fmtMs(t), Roces: graze, Vidas: lives, Récord: M.fmtMs(E.api.best || 0) });
  }

  function addEmitter() {
    emitters.push({
      x: E.rng.float(W * 0.2, W * 0.8), y: E.rng.float(60, H * 0.35),
      a: E.rng.float(0, M.TAU), t: 0, sp: E.rng.float(0.6, 1.4),
    });
  }

  function fire(x, y, a, sp, col) {
    bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, col: col || P.b, g: 0 });
  }

  function hit() {
    if (iT > 0) return;
    lives--; iT = 2;
    E.sfx('hurt'); E.camera.kick(16); E.camera.flash('#ff4d6d', 0.45);
    E.particles.burst(hero.x, hero.y, 30, { col: [P.c, '#fff'], speed1: 300, add: true });
    /* limpia la zona al ser alcanzado */
    bullets = bullets.filter((b) => M.dist(b.x, b.y, hero.x, hero.y) > 150);
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({
        score: Math.round(t * 100), label: 'Centésimas',
        fmt: (v) => M.fmtMs(v / 100),
        msg: 'Sobreviviste ' + M.fmtMs(t) + ' con ' + graze + ' roces',
        stats: { Roces: graze },
      }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      if (iT > 0) iT -= dt;
      if (Math.floor(t) !== Math.floor(t - dt)) hud();

      const slow = E.input.down('shift');
      const ax = E.input.axis();
      const sp = slow ? 130 : 300;
      hero.x = M.clamp(hero.x + ax.x * sp * dt, 10, W - 10);
      hero.y = M.clamp(hero.y + ax.y * sp * dt, 10, H - 10);
      const p = E.input.pointer;
      if (p.down) { hero.x = M.damp(hero.x, p.x, 22, dt); hero.y = M.damp(hero.y, p.y, 22, dt); }

      /* patrones que rotan cada 12 s */
      patternT += dt;
      if (patternT > 12) { patternT = 0; pattern = (pattern + 1) % 4; addEmitter(); E.sfx('alarm'); }

      const rate = 1 + t / 40;
      emitters.forEach((em, i) => {
        em.t += dt;
        em.a += dt * em.sp * (i % 2 ? 1 : -1);
        em.x += Math.sin(t * 0.5 + i) * 24 * dt;
        const period = Math.max(0.12, 0.34 / rate);
        if (em.t >= period) {
          em.t -= period;
          const col = [P.a, P.b, P.c, P.d][i % 4];
          if (pattern === 0) {
            for (let k = 0; k < 3; k++) fire(em.x, em.y, em.a + k * (M.TAU / 3), 110 + t, col);
          } else if (pattern === 1) {
            for (let k = 0; k < 5; k++) fire(em.x, em.y, em.a + (k - 2) * 0.22, 130 + t, col);
          } else if (pattern === 2) {
            const a = Math.atan2(hero.y - em.y, hero.x - em.x);
            for (let k = -1; k <= 1; k++) fire(em.x, em.y, a + k * 0.16, 165 + t, col);
          } else {
            for (let k = 0; k < 8; k++) fire(em.x, em.y, em.a + k * (M.TAU / 8), 95 + t * 0.8, col);
          }
        }
      });

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b) break;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { bullets.splice(i, 1); continue; }
        const d = M.dist(b.x, b.y, hero.x, hero.y);
        /* hit() rehace el array de balas: hay que cortar el recorrido. */
        if (d < b.r + hero.r) { hit(); break; }
        else if (d < b.r + 22 && !b.g) {
          b.g = 1; graze++;
          E.particles.trail(hero.x, hero.y, { col: P.c, r: 2, life: 0.3 });
          if (graze % 25 === 0) E.sfx('chime');
        }
      }
      if (bullets.length > 900) bullets.splice(0, bullets.length - 900);
    },

    draw(g) {
      const c = g.ctx;
      g.bgSpace(E.t, 29);
      g.bgGrid(40, alpha(P.a, 0.05), 1, 0, 0);

      emitters.forEach((em, i) => {
        g.bloom(em.x, em.y, 40, [P.a, P.b, P.c, P.d][i % 4], 0.4);
        g.ngon(em.x, em.y, 15, 6, em.a, mix(P.d, P.deep, 0.2));
        g.ngon(em.x, em.y, 7, 6, -em.a * 2, P.c);
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      bullets.forEach((b) => {
        g.circle(b.x, b.y, b.r, alpha(b.col, 0.5));
        g.circle(b.x, b.y, b.r * 0.5, '#ffffff');
      });
      c.restore();

      if (iT <= 0 || Math.floor(E.t * 14) % 2) {
        const slow = E.input.down('shift');
        g.bloom(hero.x, hero.y, 26, P.c, 0.5);
        g.ngon(hero.x, hero.y, 12, 3, -Math.PI / 2 + E.t * (slow ? 0.5 : 2), P.ink);
        g.circle(hero.x, hero.y, hero.r, '#ff4d6d');
        if (slow) g.ring(hero.x, hero.y, 22, 1.5, alpha(P.c, 0.7));
      }

      E.particles.draw(g);
      g.text(M.fmtMs(t), W / 2, 44, {
        size: 30, align: 'center', weight: 900, color: P.ink, mono: true,
        shadow: alpha(P.a, 0.5), shadowBlur: 16,
      });
      E.ui.hint('Mueve para esquivar · Shift para moverte despacio y rozar balas', { bottom: 16 });
    },
  };
});
