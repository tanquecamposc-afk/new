/* Topo Loco — topos que asoman cada vez más rápido; cuidado con los del casco. */
NX.game('topo-loco', {
  w: 820, h: 600, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = 4, ROWS = 3;

  let holes, score, lives, t, alive, spawnT, combo, hammer, best;

  function reset() {
    holes = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      holes.push({
        x: W / 2 + (c - (COLS - 1) / 2) * 170, y: 190 + r * 130,
        up: 0, target: 0, kind: 0, life: 0, hit: 0,
      });
    }
    score = 0; lives = 5; t = 0; alive = true; spawnT = 0.7; combo = 0; best = 0;
    hammer = { x: W / 2, y: H / 2, a: 0, swing: 0 };
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Combo: '×' + Math.max(1, combo), Tiempo: M.fmtTime(t) }); }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.22, 0.85 - t * 0.012);
        const free = holes.filter((h) => h.target === 0);
        if (free.length) {
          const h = E.rng.pick(free);
          h.kind = E.rng.weighted([[0, 10], [1, t > 10 ? 3 : 0], [2, t > 20 ? 2 : 1]]);
          h.target = 1;
          h.life = Math.max(0.6, 1.8 - t * 0.02);
        }
      }

      holes.forEach((h) => {
        h.up = M.damp(h.up, h.target, 14, dt);
        if (h.hit > 0) h.hit -= dt * 3;
        if (h.target === 1) {
          h.life -= dt;
          if (h.life <= 0) {
            h.target = 0;
            if (h.kind !== 1) {
              combo = 0;
              lives--;
              E.sfx('error');
              hud();
              if (lives <= 0) endGame();
            }
          }
        }
      });

      const p = E.input.pointer;
      hammer.x = M.damp(hammer.x, p.x, 26, dt);
      hammer.y = M.damp(hammer.y, p.y, 26, dt);
      hammer.swing = Math.max(0, hammer.swing - dt * 5);
      if (p.pressed) {
        hammer.swing = 1;
        E.sfx('swoosh');
        const h = holes.find((q) => q.up > 0.5 && M.dist(p.x, p.y, q.x, q.y - 34) < 52);
        if (h) {
          h.target = 0; h.hit = 1;
          E.camera.kick(4);
          if (h.kind === 1) {
            lives--; combo = 0;
            E.sfx('hurt'); E.camera.flash('#ff4d6d', 0.25);
            E.floaters.add(h.x, h.y - 60, '¡Casco!', { col: '#ff4d6d', size: 18 });
            if (lives <= 0) endGame();
          } else {
            combo++; best = Math.max(best, combo);
            const pts = (h.kind === 2 ? 250 : 100) * Math.min(8, combo);
            score += pts;
            E.sfx('hit');
            E.floaters.add(h.x, h.y - 60, '+' + pts, { col: P.c, size: 16 + Math.min(14, combo) });
            E.particles.burst(h.x, h.y - 30, 10, { col: [P.c, '#fff'], speed1: 200, add: true });
          }
          hud();
        }
      }

      function endGame() {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score, msg: 'Mejor racha ×' + best + ' en ' + M.fmtTime(t),
          stats: { 'Mejor racha': best, Tiempo: M.fmtTime(t) },
        }), 500);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#5b8f3f', P.deep, 0.35), mix('#2f5a28', P.deep, 0.35));
      for (let i = 0; i < 40; i++) {
        g.circle((i * 137) % W, 120 + ((i * 91) % (H - 140)), 30, alpha('#ffffff', 0.012));
      }

      holes.forEach((h) => {
        c.save();
        c.fillStyle = mix('#3a2a1a', P.deep, 0.3);
        c.beginPath(); c.ellipse(h.x, h.y, 62, 24, 0, 0, M.TAU); c.fill();
        c.restore();
        /* topo recortado dentro del agujero */
        if (h.up > 0.02) {
          c.save();
          c.beginPath();
          c.ellipse(h.x, h.y, 62, 24, 0, Math.PI, M.TAU);
          c.rect(h.x - 62, h.y - 160, 124, 160);
          c.clip();
          const y = h.y - h.up * 62;
          const col = h.kind === 1 ? '#8f9dbd' : h.kind === 2 ? P.c : mix('#8b6b4a', P.deep, 0.05);
          g.circle(h.x, y, 34, col);
          g.circle(h.x, y + 12, 18, mix(col, '#fff', 0.25));
          g.circle(h.x - 12, y - 6, 5.5, '#111');
          g.circle(h.x + 12, y - 6, 5.5, '#111');
          g.circle(h.x, y + 10, 8, '#e8a0a0');
          if (h.kind === 1) {
            c.fillStyle = '#5b8cff';
            c.beginPath(); c.arc(h.x, y - 8, 33, Math.PI, 0); c.fill();
          }
          if (h.kind === 2) g.star(h.x, y - 40, 11, 5, 5, E.t * 3, '#fff');
          if (h.hit > 0) {
            g.text('✦', h.x, y, { size: 40 * h.hit, align: 'center', color: alpha('#fff', h.hit) });
          }
          c.restore();
        }
        c.save();
        c.fillStyle = alpha('#000', 0.45);
        c.beginPath(); c.ellipse(h.x, h.y, 62, 24, 0, 0, Math.PI); c.fill();
        c.restore();
      });

      /* martillo */
      const sw = M.ease.outQuad(hammer.swing);
      g.push(hammer.x, hammer.y, -0.7 + sw * 1.5);
      g.rect(-5, 0, 10, 62, mix('#7a5a34', P.deep, 0.05));
      g.rrect(-30, -26, 60, 34, 8, '#e8384f');
      g.rrect(-30, -26, 60, 12, 8, alpha('#ffffff', 0.25));
      g.pop();

      for (let i = 0; i < lives; i++) G.Sprites.heart(g, 34 + i * 30, 42, 26, '#ff4d6d');

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Golpea a los topos · evita los del casco azul', { bottom: 14 });
    },
  };
});
