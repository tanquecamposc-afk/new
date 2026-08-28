/* Buscaminas Neón — tres tamaños, primera casilla segura y apertura automática. */
NX.game('buscaminas-neon', {
  w: 760, h: 660, pal: 'mono',
  music: { root: 45, scale: 'minor', bpm: 72, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const NUMCOL = ['', '#22e0ff', '#4ade80', '#ffd45e', '#ff8a3d', '#ff4d6d', '#c084fc', '#f0abfc', '#94a3b8'];

  const LEVELS = [
    { n: 'Fácil', c: 9, r: 9, m: 10 },
    { n: 'Media', c: 14, r: 11, m: 26 },
    { n: 'Difícil', c: 18, r: 13, m: 48 },
  ];

  let lvl, cols, rows, mines, grid, started, over, won, flags, opened, t, cell, OX, OY, firstClick;

  function layout() {
    const availW = W - 60, availH = H - 170;
    cell = Math.floor(Math.min(availW / cols, availH / rows));
    OX = Math.round((W - cell * cols) / 2);
    OY = 120;
  }

  function reset(level) {
    lvl = level == null ? (lvl == null ? 0 : lvl) : level;
    const L = LEVELS[lvl];
    cols = L.c; rows = L.r; mines = L.m;
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) grid[r][c] = { m: false, o: false, f: false, n: 0, t: 0 };
    }
    started = false; over = false; won = false; flags = 0; opened = 0; t = 0; firstClick = true;
    layout();
    hud();
  }
  function hud() {
    E.api.hud({ Minas: mines - flags, Tiempo: M.fmtTime(t), Nivel: LEVELS[lvl].n });
  }

  function place(sr, sc) {
    let put = 0;
    while (put < mines) {
      const r = E.rng.int(rows), c = E.rng.int(cols);
      if (grid[r][c].m) continue;
      if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
      grid[r][c].m = true; put++;
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc].m) n++;
      }
      grid[r][c].n = n;
    }
    started = true;
  }

  function open(r, c) {
    const cel = grid[r][c];
    if (cel.o || cel.f) return;
    cel.o = true; cel.t = 1; opened++;
    if (cel.m) { lose(); return; }
    E.sfx('tap');
    /* Chispas al destapar: sin esto abrir casillas no daba ninguna sensación. */
    E.particles.burst(OX + c * cell + cell / 2, OY + r * cell + cell / 2, cel.n ? 5 : 3, {
      col: [cel.n ? P.a : P.dim, '#ffffff'], speed1: cel.n ? 90 : 60, life1: 0.32, r0: 1.6, add: true,
    });
    if (cel.n === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && !grid[rr][cc].o) open(rr, cc);
      }
    }
    checkWin();
  }

  function chord(r, c) {
    const cel = grid[r][c];
    if (!cel.o || !cel.n) return;
    let f = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc].f) f++;
    }
    if (f !== cel.n) return;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && !grid[rr][cc].f) open(rr, cc);
    }
  }

  function lose() {
    over = true;
    E.sfx('explode'); E.camera.kick(16); E.camera.flash('#ff4d6d', 0.4);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c].m) {
      grid[r][c].o = true;
      E.particles.burst(OX + c * cell + cell / 2, OY + r * cell + cell / 2, 10, {
        col: ['#ff4d6d', '#ffd45e'], speed1: 200, life1: 0.7, add: true,
      });
    }
    setTimeout(() => E.api.over({
      score: Math.round(t * 100), label: 'Centésimas', fmt: (v) => M.fmtTime(v / 100), lower: true,
      msg: 'Pisaste una mina en ' + LEVELS[lvl].n,
    }), 700);
  }

  function checkWin() {
    if (over) return;
    if (opened >= rows * cols - mines) {
      over = true; won = true;
      E.sfx('win');
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c].m) grid[r][c].f = true;
      setTimeout(() => E.api.win({
        score: Math.max(0, Math.round(9999 - t * 10 + lvl * 2000)),
        title: '¡Campo despejado!',
        msg: LEVELS[lvl].n + ' en ' + M.fmtTime(t),
        stats: { Tiempo: M.fmtTime(t), Nivel: LEVELS[lvl].n },
      }), 500);
    }
  }

  reset(0);

  return {
    update(dt) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c].t > 0) grid[r][c].t -= dt * 4;
      if (started && !over) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }

      const p = E.input.pointer;
      /* selector de dificultad */
      if (p.pressed && p.y > 62 && p.y < 100) {
        for (let i = 0; i < 3; i++) {
          const x = W / 2 - 165 + i * 112;
          if (p.x > x && p.x < x + 104) { reset(i); E.sfx('select'); return; }
        }
      }
      if (over) return;

      const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
      const inside = c >= 0 && c < cols && r >= 0 && r < rows;
      if (!inside) return;

      if (p.pressed) {
        if (E.input.rightDown || E.input.down('shift')) {
          const cel = grid[r][c];
          if (!cel.o) { cel.f = !cel.f; flags += cel.f ? 1 : -1; E.sfx(cel.f ? 'place' : 'tap'); hud(); }
        } else {
          if (!started) place(r, c);
          if (grid[r][c].o) chord(r, c); else open(r, c);
        }
      }
      /* clic derecho: banderas */
      if (E.input.rightDown && !this._rd) {
        this._rd = true;
        const cel = grid[r][c];
        if (!cel.o) { cel.f = !cel.f; flags += cel.f ? 1 : -1; E.sfx(cel.f ? 'place' : 'tap'); hud(); }
      }
      if (!E.input.rightDown) this._rd = false;
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.25), P.deep);
      g.text('BUSCAMINAS', W / 2, 44, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });

      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 165 + i * 112;
        const on = i === lvl;
        g.rrect(x, 66, 104, 32, 10, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(LEVELS[i].n, x + 52, 88, { size: 14, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      g.rrect(OX - 6, OY - 6, cell * cols + 12, cell * rows + 12, 10, alpha(P.deep, 0.75));

      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const cel = grid[r][cc];
        const x = OX + cc * cell, y = OY + r * cell;
        if (cel.o) {
          g.rrect(x + 1, y + 1, cell - 2, cell - 2, 3, 'rgba(0,0,0,.35)');
          if (cel.m) {
            g.circle(x + cell / 2, y + cell / 2, cell * 0.26, '#ff4d6d');
            g.circle(x + cell / 2 - cell * 0.08, y + cell / 2 - cell * 0.08, cell * 0.07, alpha('#fff', 0.6));
          } else if (cel.n) {
            g.text(String(cel.n), x + cell / 2, y + cell * 0.7,
              { size: cell * 0.55, align: 'center', weight: 900, color: NUMCOL[cel.n] });
          }
        } else {
          const s = cel.t > 0 ? 1 - cel.t * 0.1 : 1;
          g.push(x + cell / 2, y + cell / 2, 0, s);
          g.rrect(-cell / 2 + 1, -cell / 2 + 1, cell - 2, cell - 2, 4, mix(P.dim, P.deep, 0.5));
          g.rrect(-cell / 2 + 1, -cell / 2 + 1, cell - 2, (cell - 2) * 0.4, 4, alpha('#ffffff', 0.1));
          g.pop();
          if (cel.f) {
            g.poly([x + cell * 0.3, y + cell * 0.22, x + cell * 0.72, y + cell * 0.36,
                    x + cell * 0.3, y + cell * 0.5], '#ff4d6d');
            g.rect(x + cell * 0.28, y + cell * 0.2, cell * 0.06, cell * 0.6, P.ink);
          }
        }
      }

      E.particles.draw(g);
      E.ui.hint('Clic abrir · clic derecho (o Shift) bandera · clic en número para despejar', { bottom: 18 });
    },
  };
});
