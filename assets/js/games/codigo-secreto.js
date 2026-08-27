/* Código Secreto — descifra la combinación con las pistas de aciertos y posiciones. */
NX.game('codigo-secreto', {
  w: 640, h: 720, pal: 'royal',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLORS = ['#ff4d6d', '#22e0ff', '#ffd45e', '#4ade80', '#c084fc', '#ff8a3d'];
  const SLOTS = 4, TRIES = 10;

  let secret, rows, cur, done, sel, t;

  function reset() {
    secret = [];
    for (let i = 0; i < SLOTS; i++) secret.push(E.rng.int(COLORS.length));
    rows = []; cur = [null, null, null, null]; done = false; sel = 0; t = 0;
    hud();
  }
  function hud() { E.api.hud({ Intento: rows.length + 1 + '/' + TRIES, Colores: COLORS.length, Tiempo: M.fmtTime(t) }); }

  function judge(guess) {
    let exact = 0, part = 0;
    const s = secret.slice(), g2 = guess.slice();
    for (let i = 0; i < SLOTS; i++) if (g2[i] === s[i]) { exact++; s[i] = -1; g2[i] = -2; }
    for (let i = 0; i < SLOTS; i++) {
      if (g2[i] < 0) continue;
      const k = s.indexOf(g2[i]);
      if (k >= 0) { part++; s[k] = -1; }
    }
    return { exact, part };
  }

  function submit() {
    if (cur.some((v) => v == null)) { E.sfx('error'); return; }
    const res = judge(cur);
    rows.push({ g: cur.slice(), res, t: 0 });
    E.sfx(res.exact === SLOTS ? 'win' : 'select');
    if (res.exact === SLOTS) {
      done = true;
      E.camera.kick(6);
      setTimeout(() => E.api.win({
        score: (TRIES - rows.length + 1) * 600,
        title: '¡Código descifrado!',
        msg: rows.length + ' intentos en ' + M.fmtTime(t),
        stats: { Intentos: rows.length, Tiempo: M.fmtTime(t) },
      }), 600);
    } else if (rows.length >= TRIES) {
      done = true;
      E.sfx('lose');
      setTimeout(() => E.api.over({ score: 0, msg: 'Se acabaron los intentos' }), 600);
    }
    cur = [null, null, null, null];
    sel = 0;
    hud();
  }

  reset();

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      rows.forEach((r) => { r.t = Math.min(1, r.t + dt * 3); });
      if (done) return;

      for (let i = 1; i <= COLORS.length; i++) {
        if (E.input.pressed(String(i))) {
          cur[sel] = i - 1;
          sel = Math.min(SLOTS - 1, sel + 1);
          E.sfx('tick');
        }
      }
      if (E.input.pressed('enter')) submit();
      if (E.input.pressed('back')) { cur[sel] = null; sel = Math.max(0, sel - 1); E.sfx('tap'); }

      const p = E.input.pointer;
      if (p.pressed) {
        /* fila activa */
        const ay = H - 210;
        for (let i = 0; i < SLOTS; i++) {
          const x = W / 2 - SLOTS * 34 + i * 68 + 34;
          if (M.dist(p.x, p.y, x, ay) < 28) { sel = i; E.sfx('tap'); }
        }
        /* paleta */
        const py = H - 130;
        for (let i = 0; i < COLORS.length; i++) {
          const x = W / 2 - COLORS.length * 30 + i * 60 + 30;
          if (M.dist(p.x, p.y, x, py) < 26) {
            cur[sel] = i;
            sel = Math.min(SLOTS - 1, sel + 1);
            E.sfx('tick');
          }
        }
        if (p.y > H - 66 && p.y < H - 22 && Math.abs(p.x - W / 2) < 90) submit();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('CÓDIGO SECRETO', W / 2, 42, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });

      /* código oculto */
      g.rrect(W / 2 - 140, 60, 280, 54, 12, alpha(P.deep, 0.8));
      for (let i = 0; i < SLOTS; i++) {
        const x = W / 2 - 105 + i * 70;
        if (done) {
          g.circle(x, 87, 20, COLORS[secret[i]]);
          g.circle(x - 6, 81, 7, alpha('#ffffff', 0.3));
        } else {
          g.circle(x, 87, 20, 'rgba(255,255,255,.08)');
          g.text('?', x, 95, { size: 22, align: 'center', color: P.dim, weight: 900 });
        }
      }

      /* historial */
      const rowH = 44, top = 132;
      for (let r = 0; r < TRIES; r++) {
        const y = top + r * rowH;
        const row = rows[r];
        g.rrect(W / 2 - 190, y, 380, rowH - 6, 10, row ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)');
        for (let i = 0; i < SLOTS; i++) {
          const x = W / 2 - 150 + i * 56;
          if (row) {
            g.circle(x, y + 19, 15, COLORS[row.g[i]]);
            g.circle(x - 4, y + 14, 5, alpha('#ffffff', 0.3));
          } else g.ring(x, y + 19, 14, 1.5, alpha(P.ink, 0.12));
        }
        if (row) {
          for (let k = 0; k < SLOTS; k++) {
            const x = W / 2 + 96 + (k % 2) * 20, yy = y + 10 + Math.floor(k / 2) * 18;
            const col = k < row.res.exact ? '#4ade80' : k < row.res.exact + row.res.part ? '#facc15' : 'rgba(255,255,255,.1)';
            g.circle(x, yy, 6, col);
          }
        }
      }

      /* fila activa */
      const ay = H - 210;
      g.text('TU JUGADA', W / 2, ay - 34, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 2 });
      for (let i = 0; i < SLOTS; i++) {
        const x = W / 2 - SLOTS * 34 + i * 68 + 34;
        if (i === sel) g.ring(x, ay, 27, 2.5, P.c);
        if (cur[i] != null) {
          g.circle(x, ay, 22, COLORS[cur[i]]);
          g.circle(x - 6, ay - 7, 7, alpha('#ffffff', 0.3));
        } else g.ring(x, ay, 22, 1.6, alpha(P.ink, 0.2));
      }

      /* paleta */
      const py = H - 130;
      COLORS.forEach((col, i) => {
        const x = W / 2 - COLORS.length * 30 + i * 60 + 30;
        g.circle(x, py, 22, col);
        g.circle(x - 6, py - 7, 7, alpha('#ffffff', 0.3));
        g.text(String(i + 1), x, py + 40, { size: 11, align: 'center', color: P.dim, weight: 800 });
      });

      const hov = E.input.pointer.y > H - 66 && E.input.pointer.y < H - 22 && Math.abs(E.input.pointer.x - W / 2) < 90;
      g.rrect(W / 2 - 90, H - 66, 180, 44, 12, hov ? P.a : alpha(P.a, 0.6));
      g.text('Comprobar', W / 2, H - 37, { size: 16, align: 'center', weight: 800, color: '#0d1220' });

      g.text('🟢 posición exacta   🟡 color correcto', W / 2, top - 12,
        { size: 11.5, align: 'center', color: P.dim, weight: 700 });
    },
  };
});
