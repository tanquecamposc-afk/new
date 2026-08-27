/* Sopa de Letras — encuentra las palabras escondidas en cualquier dirección. */
NX.game('sopa-de-letras', {
  w: 860, h: 660, pal: 'forest',
  music: { root: 50, scale: 'major', bpm: 68, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 13;
  const cell = Math.floor(Math.min((W - 300) / N, (H - 160) / N));
  const OX = 30, OY = 120;
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];

  let grid, words, found, tema, sel, t, done;

  function place(word) {
    for (let tryN = 0; tryN < 200; tryN++) {
      const d = E.rng.pick(DIRS);
      const r = E.rng.int(N), c = E.rng.int(N);
      const er = r + d[1] * (word.length - 1), ec = c + d[0] * (word.length - 1);
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const rr = r + d[1] * i, cc = c + d[0] * i;
        if (grid[rr][cc] && grid[rr][cc] !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const rr = r + d[1] * i, cc = c + d[0] * i;
        grid[rr][cc] = word[i];
        cells.push([rr, cc]);
      }
      return cells;
    }
    return null;
  }

  function reset() {
    tema = E.rng.pick(NX.LEX.temas());
    const pool = NX.LEX.TEMAS[tema].filter((w) => w.length <= N);
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = ''; }
    words = [];
    E.rng.shuffle(pool.slice()).slice(0, 8).forEach((w) => {
      const cells = place(w);
      if (cells) words.push({ w, cells, found: false });
    });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) grid[r][c] = ABC[E.rng.int(26)];
    found = 0; sel = null; t = 0; done = false;
    hud();
  }
  function hud() { E.api.hud({ Tema: tema, Encontradas: found + '/' + words.length, Tiempo: M.fmtTime(t) }); }

  function cellAt(x, y) {
    const c = Math.floor((x - OX) / cell), r = Math.floor((y - OY) / cell);
    if (c < 0 || c >= N || r < 0 || r >= N) return null;
    return [r, c];
  }

  function lineCells(a, b) {
    const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
    const lenR = Math.abs(b[0] - a[0]), lenC = Math.abs(b[1] - a[1]);
    if (lenR && lenC && lenR !== lenC) return null;
    const len = Math.max(lenR, lenC) + 1;
    const out = [];
    for (let i = 0; i < len; i++) out.push([a[0] + dr * i, a[1] + dc * i]);
    return out;
  }

  function commit() {
    if (!sel || !sel.cells || sel.cells.length < 2) { sel = null; return; }
    const str = sel.cells.map(([r, c]) => grid[r][c]).join('');
    const rev = str.split('').reverse().join('');
    const hit = words.find((w) => !w.found && (w.w === str || w.w === rev));
    if (hit) {
      hit.found = true; found++;
      E.sfx('select'); E.camera.kick(2);
      hit.cells.forEach(([r, c]) => E.particles.burst(OX + c * cell + cell / 2, OY + r * cell + cell / 2, 4,
        { col: [P.c], speed1: 110, add: true }));
      hud();
      if (found === words.length) {
        done = true;
        E.sfx('win');
        setTimeout(() => E.api.win({
          score: Math.max(0, 8000 - Math.round(t * 20)),
          title: '¡Sopa completa!',
          msg: words.length + ' palabras de ' + tema + ' en ' + M.fmtTime(t),
          stats: { Tiempo: M.fmtTime(t) },
        }), 500);
      }
    } else E.sfx('error');
    sel = null;
  }

  reset();

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;
      if (p.pressed) {
        const a = cellAt(p.x, p.y);
        if (a) sel = { a, cells: [a] };
      } else if (p.down && sel) {
        const b = cellAt(p.x, p.y);
        if (b) {
          const line = lineCells(sel.a, b);
          if (line) sel.cells = line;
        }
      } else if (p.released && sel) commit();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('SOPA DE LETRAS', 30, 48, { size: 22, weight: 900, color: P.ink, letterSpacing: 2 });
      g.text('Tema: ' + tema, 30, 76, { size: 14, color: P.c, weight: 700 });

      g.rrect(OX - 8, OY - 8, cell * N + 16, cell * N + 16, 12, alpha(P.deep, 0.7));

      c.save(); c.lineCap = 'round';
      words.forEach((w) => {
        if (!w.found) return;
        const a = w.cells[0], b = w.cells[w.cells.length - 1];
        g.capsule(OX + a[1] * cell + cell / 2, OY + a[0] * cell + cell / 2,
          OX + b[1] * cell + cell / 2, OY + b[0] * cell + cell / 2, cell * 0.4, alpha(P.a, 0.28));
      });
      if (sel && sel.cells.length > 1) {
        const a = sel.cells[0], b = sel.cells[sel.cells.length - 1];
        g.capsule(OX + a[1] * cell + cell / 2, OY + a[0] * cell + cell / 2,
          OX + b[1] * cell + cell / 2, OY + b[0] * cell + cell / 2, cell * 0.4, alpha(P.c, 0.35));
      }
      c.restore();

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        g.text(grid[r][cc], OX + cc * cell + cell / 2, OY + r * cell + cell * 0.68, {
          size: cell * 0.5, align: 'center', weight: 700, color: P.ink,
        });
      }

      /* lista */
      const lx = OX + cell * N + 30;
      g.text('PALABRAS', lx, OY + 6, { size: 12, color: P.dim, weight: 800, letterSpacing: 2 });
      words.forEach((w, i) => {
        const y = OY + 34 + i * 34;
        g.text(w.w, lx, y, {
          size: 16, weight: 800,
          color: w.found ? P.c : P.ink,
        });
        if (w.found) g.line(lx - 2, y - 5, lx + g.textW(w.w, 16, 800) + 4, y - 5, P.c, 2);
      });

      E.particles.draw(g);
      E.ui.hint('Arrastra desde la primera letra hasta la última', { bottom: 16 });
    },
  };
});
