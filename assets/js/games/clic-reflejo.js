/* Clic Reflejo — mide tu tiempo de reacción con cinco pruebas distintas. */
NX.game('clic-reflejo', {
  w: 820, h: 560, pal: 'neon',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let state, waitT, startT, results, round, msg, target, best;
  const ROUNDS = 5;

  function reset() {
    state = 'idle'; waitT = 0; startT = 0; results = []; round = 0; msg = 'Toca para empezar';
    target = null; best = E.api.best || 0;
    hud();
  }
  function hud() {
    const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    E.api.hud({ Intento: Math.min(round + 1, ROUNDS) + '/' + ROUNDS, Media: avg ? avg + ' ms' : '—',
      Última: results.length ? results[results.length - 1] + ' ms' : '—' });
  }

  function nextRound() {
    if (round >= ROUNDS) return finish();
    state = 'wait';
    waitT = E.rng.float(1.2, 3.4);
    msg = 'Espera al verde…';
  }

  function finish() {
    state = 'done';
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
    E.sfx('win');
    setTimeout(() => E.api.over({
      score: avg, label: 'Milisegundos', lower: true, fmt: (v) => v + ' ms',
      title: 'Reflejos medidos',
      msg: 'Media de ' + avg + ' ms en ' + ROUNDS + ' intentos',
      stats: { Media: avg + ' ms', Mejor: Math.min.apply(null, results) + ' ms' },
    }), 400);
  }

  reset();

  return {
    update(dt) {
      const p = E.input.pointer;
      if (state === 'wait') {
        waitT -= dt;
        if (waitT <= 0) {
          state = 'go';
          startT = performance.now();
          target = { x: E.rng.float(W * 0.25, W * 0.75), y: E.rng.float(H * 0.3, H * 0.72), r: E.rng.float(48, 90) };
          E.sfx('blip');
          msg = '¡YA!';
        }
      }
      if (!p.pressed) return;

      if (state === 'idle' || state === 'early' || state === 'result') { round = state === 'result' ? round : round; nextRound(); return; }
      if (state === 'wait') {
        state = 'early';
        msg = 'Demasiado pronto · toca para repetir';
        E.sfx('error'); E.camera.kick(6);
        return;
      }
      if (state === 'go') {
        if (M.dist(p.x, p.y, target.x, target.y) > target.r) { E.sfx('error'); return; }
        const ms = Math.round(performance.now() - startT);
        results.push(ms);
        round++;
        state = 'result';
        msg = ms + ' ms · toca para seguir';
        E.sfx(ms < 250 ? 'chime' : 'tap');
        E.particles.burst(target.x, target.y, 14, { col: [P.a, P.c], speed1: 220, add: true });
        hud();
        if (round >= ROUNDS) setTimeout(finish, 700);
      }
    },

    draw(g) {
      const c = g.ctx;
      const bg = state === 'go' ? '#12351f' : state === 'wait' ? '#3a1220' : mix(P.bg, P.d, 0.3);
      g.bgGradient(bg, P.deep);
      g.text('CLIC REFLEJO', W / 2, 56, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });

      if (state === 'go' && target) {
        g.bloom(target.x, target.y, target.r * 2.2, '#4ade80', 0.5);
        g.circle(target.x, target.y, target.r, '#4ade80');
        g.ring(target.x, target.y, target.r, 4, alpha('#ffffff', 0.4));
        g.text('¡YA!', target.x, target.y + 12, { size: 32, align: 'center', weight: 900, color: '#0d1220' });
      } else {
        const col = state === 'wait' ? '#ff4d6d' : P.a;
        g.circle(W / 2, H * 0.5, 92, alpha(col, 0.25));
        g.ring(W / 2, H * 0.5, 92, 4, col);
        g.text(state === 'wait' ? '…' : '▶', W / 2, H * 0.5 + 16, { size: 44, align: 'center', color: col, weight: 900 });
      }

      g.text(msg, W / 2, H * 0.78, { size: 20, align: 'center', weight: 800, color: P.ink });

      /* histórico */
      results.forEach((r, i) => {
        const x = W / 2 - (ROUNDS - 1) * 60 / 2 + i * 60;
        g.rrect(x - 26, H - 74, 52, 40, 9, 'rgba(255,255,255,.07)');
        g.text(String(r), x, H - 48, { size: 14, align: 'center', weight: 800, color: r < 250 ? '#4ade80' : P.ink, mono: true });
      });

      E.particles.draw(g);
      E.ui.hint('Espera a que el círculo se ponga verde y tócalo lo antes posible', { bottom: 14 });
    },
  };
});
