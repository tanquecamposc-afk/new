/* Tecleo Veloz — escribe las palabras antes de que toquen el suelo. */
NX.game('tecleo-veloz', {
  w: 860, h: 600, pal: 'sunset',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 80;

  let words, cur, score, lives, typed, hits, misses, t, alive, spawnT, speedK;

  function reset() {
    words = []; cur = ''; score = 0; lives = 5; typed = 0; hits = 0; misses = 0;
    t = 0; alive = true; spawnT = 0.5; speedK = 1;
    hud();
  }
  function hud() {
    const ppm = t > 1 ? Math.round(hits / (t / 60)) : 0;
    E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, 'Pal/min': ppm, Precisión: typed ? Math.round(hits * 100 / Math.max(1, hits + misses)) + '%' : '—' });
  }

  function spawn() {
    const pool = NX.LEX.RAPIDAS;
    const w = pool[E.rng.int(pool.length)];
    words.push({
      w, x: E.rng.float(60, W - 160), y: -20,
      vy: (26 + t * 0.9) * E.rng.float(0.8, 1.25), typedN: 0, ph: E.rng.float(0, 6),
    });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      speedK = 1 + t / 60;

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.5, 1.9 - t * 0.014); spawn(); }

      E.input.chars().forEach((ch) => {
        if (ch === '\b') { cur = cur.slice(0, -1); return; }
        if (ch === '\n') { cur = ''; return; }
        if (!/[a-zA-ZáéíóúñüÁÉÍÓÚÑ]/.test(ch)) return;
        cur += ch.toLowerCase();
        typed++;
        /* ¿alguna palabra empieza por lo tecleado? */
        const match = words.filter((w) => w.w.indexOf(cur) === 0);
        if (!match.length) {
          misses++;
          E.sfx('error');
          cur = '';
          return;
        }
        E.sfx('typewriter');
        const done = match.find((w) => w.w === cur);
        if (done) {
          hits++;
          const pts = done.w.length * 25 * Math.max(1, Math.floor(speedK));
          score += pts;
          E.sfx('coin');
          E.floaters.add(done.x + 20, done.y, '+' + pts, { col: P.c, size: 17 });
          E.particles.burst(done.x + 20, done.y, 10, { col: [P.c, P.a], speed1: 180, add: true });
          words.splice(words.indexOf(done), 1);
          cur = '';
          hud();
        }
      });

      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        w.y += w.vy * dt;
        w.ph += dt * 3;
        w.typedN = w.w.indexOf(cur) === 0 ? cur.length : 0;
        if (w.y > GY) {
          words.splice(i, 1);
          lives--;
          E.sfx('hurt'); E.camera.kick(9); E.camera.flash('#ff4d6d', 0.25);
          hud();
          if (lives <= 0) {
            alive = false;
            const ppm = Math.round(hits / (t / 60));
            setTimeout(() => E.api.over({
              score, msg: ppm + ' palabras por minuto',
              stats: { 'Pal/min': ppm, Palabras: hits },
            }), 500);
            return;
          }
        }
      }
      if (Math.floor(t) !== Math.floor(t - dt)) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(t, 8);
      g.bgGrid(50, alpha(P.a, 0.04), 1, 0, t * 12);
      g.rect(0, GY, W, H - GY, mix(P.d, P.deep, 0.45));
      g.rect(0, GY, W, 3, alpha(P.c, 0.7));

      words.forEach((w) => {
        const wd = g.textW(w.w, 22, 800) + 24;
        const active = w.typedN > 0;
        g.rrect(w.x, w.y - 20, wd, 34, 9, active ? alpha(P.c, 0.9) : alpha(P.d, 0.75));
        if (active) g.bloom(w.x + wd / 2, w.y - 3, 40, P.c, 0.3);
        const done = w.w.slice(0, w.typedN), rest = w.w.slice(w.typedN);
        const fullW = g.textW(w.w, 22, 800);
        const x0 = w.x + 12;
        if (done) g.text(done, x0, w.y + 5, { size: 22, weight: 900, color: '#0d1220' });
        g.text(rest, x0 + g.textW(done, 22, 900), w.y + 5, {
          size: 22, weight: 800, color: active ? alpha('#0d1220', 0.55) : P.ink,
        });
      });

      g.rrect(W / 2 - 180, H - 56, 360, 40, 11, alpha(P.deep, 0.8));
      g.text(cur + (Math.sin(t * 6) > 0 ? '|' : ''), W / 2, H - 28, {
        size: 20, align: 'center', weight: 800, color: P.c, mono: true,
      });

      for (let i = 0; i < lives; i++) G.Sprites.heart(g, 30 + i * 28, 34, 22, '#ff4d6d');

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Escribe la palabra completa · retroceso para corregir', { bottom: 74 });
    },
  };
});
