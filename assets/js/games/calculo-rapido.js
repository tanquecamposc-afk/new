/* Cálculo Rápido — operaciones contrarreloj que se complican solas. */
NX.game('calculo-rapido', {
  w: 700, h: 640, pal: 'ice',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let q, options, score, streak, best, timeLeft, alive, level, feedback, fbT, answered, total, correct;

  function makeQ() {
    const lv = Math.min(6, 1 + Math.floor(correct / 5));
    level = lv;
    let a, b, op, res;
    const kinds = lv < 2 ? ['+', '-'] : lv < 4 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
    op = E.rng.pick(kinds);
    if (op === '+') { a = E.rng.range(5, 20 + lv * 18); b = E.rng.range(5, 20 + lv * 18); res = a + b; }
    else if (op === '-') { a = E.rng.range(10, 30 + lv * 20); b = E.rng.range(2, a - 1); res = a - b; }
    else if (op === '×') { a = E.rng.range(2, 4 + lv * 2); b = E.rng.range(2, 6 + lv * 2); res = a * b; }
    else { b = E.rng.range(2, 4 + lv); res = E.rng.range(2, 6 + lv); a = b * res; }
    q = { a, b, op, res };
    const set = new Set([res]);
    while (set.size < 4) {
      const delta = E.rng.range(1, Math.max(4, Math.round(res * 0.3)));
      const cand = res + (E.rng.bool() ? delta : -delta);
      if (cand >= 0) set.add(cand);
    }
    options = E.rng.shuffle(Array.from(set));
  }

  function reset() {
    score = 0; streak = 0; best = 0; timeLeft = 60; alive = true; feedback = 0; fbT = 0;
    answered = 0; total = 0; correct = 0;
    makeQ();
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Racha: streak, Nivel: level, Tiempo: Math.ceil(timeLeft) });
  }

  function answer(v) {
    total++;
    if (v === q.res) {
      correct++;
      streak++; best = Math.max(best, streak);
      const pts = 100 * Math.min(6, 1 + Math.floor(streak / 3));
      score += pts;
      timeLeft = Math.min(90, timeLeft + 2.2);
      E.sfx('coin');
      E.floaters.add(W / 2, H * 0.44, '+' + pts, { col: '#4ade80', size: 24 });
      feedback = 1; fbT = 0.4;
    } else {
      streak = 0;
      timeLeft -= 4;
      E.sfx('error'); E.camera.kick(6);
      feedback = -1; fbT = 0.4;
    }
    makeQ();
    hud();
  }

  reset();

  return {
    update(dt) {
      if (fbT > 0) fbT -= dt;
      if (!alive) return;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score, msg: correct + ' aciertos de ' + total + ' · mejor racha ' + best,
          stats: { Aciertos: correct + '/' + total, 'Mejor racha': best },
        }), 500);
        return;
      }

      for (let i = 1; i <= 4; i++) if (E.input.pressed(String(i))) answer(options[i - 1]);
      const p = E.input.pointer;
      if (p.pressed) {
        for (let i = 0; i < 4; i++) {
          const x = W / 2 - 290 + (i % 2) * 300, y = H * 0.6 + Math.floor(i / 2) * 96;
          if (p.x > x && p.x < x + 280 && p.y > y && p.y < y + 80) answer(options[i]);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('CÁLCULO RÁPIDO', W / 2, 46, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });

      g.rrect(W / 2 - 170, 74, 340, 12, 6, 'rgba(255,255,255,.12)');
      g.rrect(W / 2 - 170, 74, 340 * M.clamp01(timeLeft / 60), 12, 6, timeLeft > 15 ? P.a : '#ff4d6d');

      const flash = fbT > 0 ? fbT / 0.4 : 0;
      if (flash) {
        c.save(); c.globalAlpha = flash * 0.16;
        g.rect(0, 0, W, H, feedback > 0 ? '#4ade80' : '#ff4d6d');
        c.restore();
      }

      g.rrect(W / 2 - 250, H * 0.2, 500, 130, 20, alpha(P.deep, 0.72));
      g.rrectStroke(W / 2 - 250, H * 0.2, 500, 130, 20, alpha(P.a, 0.3), 1.5);
      g.text(q.a + ' ' + q.op + ' ' + q.b, W / 2, H * 0.2 + 84, {
        size: 52, align: 'center', weight: 900, color: P.ink, mono: true,
      });

      options.forEach((v, i) => {
        const x = W / 2 - 290 + (i % 2) * 300, y = H * 0.6 + Math.floor(i / 2) * 96;
        const p = E.input.pointer;
        const hov = p.x > x && p.x < x + 280 && p.y > y && p.y < y + 80;
        g.rrect(x, y, 280, 80, 16, hov ? alpha(P.a, 0.28) : 'rgba(255,255,255,.06)');
        g.rrectStroke(x, y, 280, 80, 16, hov ? P.a : alpha(P.ink, 0.14), 1.5);
        g.text(String(v), x + 140, y + 54, { size: 34, align: 'center', weight: 900, color: P.ink, mono: true });
        g.text('[' + (i + 1) + ']', x + 20, y + 26, { size: 12, color: P.dim, weight: 800 });
      });

      if (streak > 2) {
        g.text('🔥 Racha ×' + streak, W / 2, H * 0.53, { size: 18, align: 'center', weight: 900, color: P.c });
      }

      E.floaters.draw(g);
      E.ui.hint('Pulsa 1-4 o toca la respuesta correcta', { bottom: 16 });
    },
  };
});
