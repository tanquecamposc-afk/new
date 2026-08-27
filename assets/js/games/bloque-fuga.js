/* Bloque Fuga — saca el bloque rojo del aparcamiento moviendo los demás. */
NX.game('bloque-fuga', {
  w: 640, h: 700, pal: 'sunset',
  music: { root: 45, scale: 'dorian', bpm: 72, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 6;
  const cell = Math.floor(Math.min((W - 70) / N, (H - 240) / N));
  const OX = Math.round((W - cell * N) / 2), OY = 160;
  const EXIT_ROW = 2;

  /* [c, r, largo, horizontal] — el primero siempre es el bloque rojo. */
  const LEVELS = [
    [[1, 2, 2, 1], [0, 0, 3, 1], [3, 1, 2, 0], [4, 4, 2, 1]],
    [[0, 2, 2, 1], [2, 0, 2, 0], [3, 1, 3, 1], [0, 4, 2, 1], [4, 3, 3, 0], [2, 5, 3, 1]],
    [[1, 2, 2, 1], [0, 0, 2, 1], [0, 1, 3, 0], [3, 0, 3, 0], [4, 1, 2, 1], [2, 4, 3, 1], [5, 3, 3, 0]],
    [[0, 2, 2, 1], [2, 2, 2, 0], [3, 0, 2, 1], [5, 0, 3, 0], [0, 3, 3, 1], [1, 4, 2, 0], [3, 4, 3, 1], [0, 0, 2, 0]],
    [[3, 2, 2, 1], [0, 0, 2, 1], [2, 0, 2, 0], [0, 1, 2, 0], [1, 1, 2, 1], [0, 3, 3, 1], [4, 3, 3, 0], [1, 5, 3, 1]],
    [[0, 2, 2, 1], [0, 0, 3, 1], [3, 0, 2, 0], [4, 0, 2, 0], [5, 2, 3, 0], [0, 3, 2, 0], [1, 3, 2, 1], [2, 4, 2, 0], [3, 5, 3, 1]],
  ];

  let lvl, blocks, sel, moves, t, done, dragOff;

  function reset(i) {
    lvl = i == null ? (lvl || 0) : i;
    blocks = LEVELS[lvl % LEVELS.length].map((b, k) => ({
      c: b[0], r: b[1], len: b[2], h: !!b[3], k, x: b[0], y: b[1],
    }));
    sel = null; moves = 0; t = 0; done = false; dragOff = 0;
    hud();
  }
  function hud() { E.api.hud({ Nivel: (lvl % LEVELS.length) + 1 + '/' + LEVELS.length, Movimientos: moves, Tiempo: M.fmtTime(t) }); }

  function occupied(ignore) {
    const grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = -1; }
    blocks.forEach((b) => {
      if (b === ignore) return;
      for (let i = 0; i < b.len; i++) {
        const r = b.r + (b.h ? 0 : i), c = b.c + (b.h ? i : 0);
        if (r >= 0 && r < N && c >= 0 && c < N) grid[r][c] = b.k;
      }
    });
    return grid;
  }

  function canPlace(b, nc, nr) {
    const grid = occupied(b);
    for (let i = 0; i < b.len; i++) {
      const r = nr + (b.h ? 0 : i), c = nc + (b.h ? i : 0);
      if (b.k === 0 && b.h && r === EXIT_ROW && c >= N) continue;   /* salida */
      if (r < 0 || r >= N || c < 0 || c >= N) return false;
      if (grid[r][c] >= 0) return false;
    }
    return true;
  }

  function tryMove(b, nc, nr) {
    if (nc === b.c && nr === b.r) return false;
    if (!canPlace(b, nc, nr)) return false;
    b.c = nc; b.r = nr;
    return true;
  }

  reset(0);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      blocks.forEach((b) => { b.x = M.damp(b.x, b.c, 20, dt); b.y = M.damp(b.y, b.r, 20, dt); });

      const p = E.input.pointer;
      const gc = (p.x - OX) / cell, gr = (p.y - OY) / cell;

      if (p.pressed && !done) {
        if (p.y > 82 && p.y < 116) {
          for (let i = 0; i < LEVELS.length; i++) {
            const x = W / 2 - 174 + i * 60;
            if (p.x > x && p.x < x + 52) { reset(i); E.sfx('select'); return; }
          }
        }
        sel = null;
        blocks.forEach((b) => {
          const c0 = b.c, r0 = b.r, c1 = b.c + (b.h ? b.len : 1), r1 = b.r + (b.h ? 1 : b.len);
          if (gc >= c0 && gc < c1 && gr >= r0 && gr < r1) {
            sel = b;
            dragOff = b.h ? gc - b.c : gr - b.r;
            E.sfx('tap');
          }
        });
      }
      if (sel && p.down) {
        const want = sel.h ? Math.round(gc - dragOff) : Math.round(gr - dragOff);
        const cur = sel.h ? sel.c : sel.r;
        const step = Math.sign(want - cur);
        if (step) {
          for (let k = cur; k !== want; k += step) {
            const nc = sel.h ? k + step : sel.c;
            const nr = sel.h ? sel.r : k + step;
            if (!tryMove(sel, nc, nr)) break;
            E.sfx('tick');
          }
        }
      }
      if (p.released && sel) {
        moves++;
        sel = null;
        hud();
        /* ¿el bloque rojo puede salir? */
        const red = blocks[0];
        if (red.r === EXIT_ROW && red.h) {
          const grid = occupied(red);
          let clear = true;
          for (let c = red.c + red.len; c < N; c++) if (grid[EXIT_ROW][c] >= 0) clear = false;
          if (clear && !done) {
            done = true;
            E.sfx('win');
            const anim = setInterval(() => {
              red.c += 0.5;
              if (red.c > N + 2) clearInterval(anim);
            }, 40);
            setTimeout(() => {
              lvl++;
              E.api.win({
                score: Math.max(0, 3000 + lvl * 500 - moves * 30),
                title: '¡Escapaste!',
                msg: 'Nivel ' + ((lvl - 1) % LEVELS.length + 1) + ' en ' + moves + ' movimientos',
                stats: { Movimientos: moves, Tiempo: M.fmtTime(t) },
              });
            }, 900);
          }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('BLOQUE FUGA', W / 2, 48, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Saca el bloque rojo por la salida de la derecha', W / 2, 140,
        { size: 13, align: 'center', color: P.dim, weight: 600 });
      for (let i = 0; i < LEVELS.length; i++) {
        const x = W / 2 - 174 + i * 60;
        const on = i === lvl % LEVELS.length;
        g.rrect(x, 84, 52, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(String(i + 1), x + 26, 105, { size: 14, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      g.rrect(OX - 10, OY - 10, cell * N + 20, cell * N + 20, 14, mix(P.d, P.deep, 0.35));
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        g.rrect(OX + cc * cell + 2, OY + r * cell + 2, cell - 4, cell - 4, 5, 'rgba(255,255,255,.04)');
      }
      /* salida */
      g.rect(OX + cell * N + 2, OY + EXIT_ROW * cell + 6, 14, cell - 12, P.c);
      g.text('SALIDA', OX + cell * N + 34, OY + EXIT_ROW * cell + cell / 2 + 4,
        { size: 11, color: P.c, weight: 900, letterSpacing: 1.2 });

      blocks.forEach((b) => {
        const x = OX + b.x * cell + 3, y = OY + b.y * cell + 3;
        const w = (b.h ? b.len : 1) * cell - 6, h = (b.h ? 1 : b.len) * cell - 6;
        const col = b.k === 0 ? '#e8384f' : mix(P.a, P.b, (b.k % 5) / 5);
        c.save();
        if (sel === b) { c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 5; }
        g.rrect(x, y, w, h, 9, col);
        c.restore();
        g.rrect(x + 4, y + 4, w - 8, Math.min(12, h * 0.3), 6, alpha('#ffffff', 0.22));
        if (b.k === 0) {
          g.circle(x + w - 14, y + h / 2, 4, alpha('#ffffff', 0.7));
          g.circle(x + 14, y + h / 2, 4, alpha('#ffffff', 0.35));
        }
      });

      E.ui.hint('Arrastra los bloques · solo se mueven en su dirección', { bottom: 22 });
    },
  };
});
