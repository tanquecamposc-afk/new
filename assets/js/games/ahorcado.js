/* Ahorcado — adivina la palabra letra a letra, con pistas por categoría. */
NX.game('ahorcado', {
  w: 800, h: 620, pal: 'mono',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  const MAX = 7;

  let word, tema, used, wrong, state, wins, streak, revealT;

  function reset() {
    const temas = NX.LEX.temas();
    tema = E.rng.pick(temas);
    word = E.rng.pick(NX.LEX.TEMAS[tema]);
    used = {}; wrong = 0; state = 'play'; revealT = 0;
    if (wins == null) { wins = 0; streak = 0; }
    hud();
  }
  function hud() {
    E.api.hud({ Categoría: tema, Fallos: wrong + '/' + MAX, Aciertos: wins, Racha: streak });
  }

  function guess(ch) {
    if (state !== 'play' || used[ch]) return;
    used[ch] = true;
    if (word.indexOf(ch) >= 0) {
      E.sfx('select');
      if (word.split('').every((k) => k === ' ' || used[k])) {
        state = 'win'; wins++; streak++;
        E.sfx('win'); E.camera.kick(5);
        setTimeout(() => {
          E.api.win({
            score: wins * 500 + streak * 200,
            title: '¡Palabra resuelta!',
            msg: word + ' · racha de ' + streak,
            stats: { Racha: streak, Fallos: wrong },
          });
        }, 700);
      }
    } else {
      wrong++;
      E.sfx('error'); E.camera.kick(4);
      if (wrong >= MAX) {
        state = 'lose'; streak = 0;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score: wins * 500, msg: 'La palabra era ' + word, stats: { Aciertos: wins } }), 700);
      }
    }
    hud();
  }

  reset();

  return {
    update(dt) {
      if (revealT > 0) revealT -= dt;
      if (state !== 'play') return;
      E.input.chars().forEach((ch) => {
        const up = ch.toUpperCase();
        if (ABC.indexOf(up) >= 0) guess(up);
      });
      const p = E.input.pointer;
      if (p.pressed) {
        const cols = 9, kw = 52, kh = 46;
        const ox = W / 2 - (cols * (kw + 6)) / 2;
        const oy = H - 190;
        for (let i = 0; i < ABC.length; i++) {
          const x = ox + (i % cols) * (kw + 6), y = oy + Math.floor(i / cols) * (kh + 6);
          if (p.x > x && p.x < x + kw && p.y > y && p.y < y + kh) { guess(ABC[i]); return; }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 15);
      g.text('AHORCADO', W / 2, 42, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });
      g.text('Categoría: ' + tema, W / 2, 68, { size: 14, align: 'center', color: P.c, weight: 700 });

      /* patíbulo */
      const bx = 150, by = 330;
      g.rect(bx - 60, by, 150, 10, mix('#7a5a34', P.deep, 0.1));
      if (wrong > 0) g.rect(bx - 6, by - 190, 10, 190, mix('#7a5a34', P.deep, 0.1));
      if (wrong > 1) g.rect(bx - 6, by - 200, 110, 10, mix('#7a5a34', P.deep, 0.1));
      if (wrong > 2) g.line(bx + 94, by - 190, bx + 94, by - 162, P.c, 3);
      if (wrong > 3) { g.circle(bx + 94, by - 146, 17, P.a); g.circle(bx + 88, by - 150, 2.5, P.deep); g.circle(bx + 100, by - 150, 2.5, P.deep); }
      if (wrong > 4) g.line(bx + 94, by - 129, bx + 94, by - 74, P.a, 5);
      if (wrong > 5) { g.line(bx + 94, by - 118, bx + 70, by - 92, P.a, 4); g.line(bx + 94, by - 118, bx + 118, by - 92, P.a, 4); }
      if (wrong > 6) { g.line(bx + 94, by - 74, bx + 74, by - 40, P.a, 4); g.line(bx + 94, by - 74, bx + 114, by - 40, P.a, 4); }

      /* palabra */
      const letters = word.split('');
      const lw = Math.min(42, (W - 360) / letters.length);
      const startX = W * 0.62 - (letters.length * (lw + 6)) / 2;
      letters.forEach((ch, i) => {
        const x = startX + i * (lw + 6);
        const show = used[ch] || state !== 'play';
        g.line(x, 260, x + lw, 260, alpha(P.ink, 0.35), 2.5);
        if (show) {
          g.text(ch, x + lw / 2, 252, {
            size: lw * 0.85, align: 'center', weight: 900,
            color: used[ch] ? P.c : '#ff4d6d',
          });
        }
      });

      /* teclado */
      const cols = 9, kw = 52, kh = 46;
      const ox = W / 2 - (cols * (kw + 6)) / 2, oy = H - 190;
      for (let i = 0; i < ABC.length; i++) {
        const ch = ABC[i];
        const x = ox + (i % cols) * (kw + 6), y = oy + Math.floor(i / cols) * (kh + 6);
        const u = used[ch];
        const hit = u && word.indexOf(ch) >= 0;
        g.rrect(x, y, kw, kh, 8, u ? (hit ? '#4ade80' : 'rgba(255,77,109,.35)') : 'rgba(255,255,255,.08)');
        g.text(ch, x + kw / 2, y + kh * 0.68, {
          size: 19, align: 'center', weight: 800,
          color: u ? (hit ? '#0d1220' : alpha(P.ink, 0.4)) : P.ink,
        });
      }

      E.particles.draw(g);
      E.ui.hint('Escribe una letra o púlsala en el teclado', { bottom: 14 });
    },
  };
});
