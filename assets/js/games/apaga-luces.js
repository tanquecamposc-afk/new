/* Apaga Luces — cada pulsación cambia la casilla y sus vecinas. Apágalas todas. */
NX.game('apaga-luces', {
  w: 620, h: 660, pal: 'royal',
  music: { root: 48, scale: 'penta', bpm: 78, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const SIZES = [3, 4, 5, 6];

  let N, grid, cell, OX, OY, moves, level, sizeIdx, t, done, anim, minMoves;

  function layout() {
    const s = Math.min(W - 80, H - 240);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2); OY = 150;
  }

  function toggle(r, c, arr) {
    const set = (rr, cc) => { if (rr >= 0 && rr < N && cc >= 0 && cc < N) arr[rr][cc] = !arr[rr][cc]; };
    set(r, c); set(r - 1, c); set(r + 1, c); set(r, c - 1); set(r, c + 1);
  }

  function reset(si) {
    sizeIdx = si == null ? (sizeIdx == null ? 2 : sizeIdx) : si;
    N = SIZES[sizeIdx];
    layout();
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = false; }
    /* Barajado desde la solución: siempre resoluble. */
    minMoves = 0;
    const shuffles = N * N;
    const used = new Set();
    for (let i = 0; i < shuffles; i++) {
      const r = E.rng.int(N), c = E.rng.int(N);
      const k = r + ',' + c;
      if (used.has(k)) used.delete(k); else used.add(k);
      toggle(r, c, grid);
    }
    minMoves = used.size;
    if (grid.every((row) => row.every((v) => !v))) { toggle(0, 0, grid); minMoves = 1; }
    moves = 0; t = 0; done = false;
    anim = [];
    for (let r = 0; r < N; r++) { anim.push([]); for (let c = 0; c < N; c++) anim[r][c] = 0; }
    hud();
  }
  function hud() {
    let on = 0;
    grid.forEach((row) => row.forEach((v) => { if (v) on++; }));
    E.api.hud({ Tamaño: N + '×' + N, Encendidas: on, Toques: moves, Tiempo: M.fmtTime(t) });
  }

  reset(2);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (anim[r][c] > 0) anim[r][c] -= dt * 4;

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 70 && p.y < 104) {
          for (let i = 0; i < SIZES.length; i++) {
            const x = W / 2 - 148 + i * 76;
            if (p.x > x && p.x < x + 68) { reset(i); E.sfx('select'); return; }
          }
        }
        if (done) return;
        const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
        if (c >= 0 && c < N && r >= 0 && r < N) {
          toggle(r, c, grid);
          [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach((d) => {
            const rr = r + d[0], cc = c + d[1];
            if (rr >= 0 && rr < N && cc >= 0 && cc < N) anim[rr][cc] = 1;
          });
          moves++;
          E.sfx('tap');
          hud();
          if (grid.every((row) => row.every((v) => !v))) {
            done = true;
            E.sfx('win'); E.camera.kick(5);
            setTimeout(() => E.api.win({
              score: Math.max(0, N * 900 - moves * 25 - Math.round(t * 4)),
              title: '¡Todo apagado!',
              msg: moves + ' toques (mínimo estimado ' + minMoves + ')',
              stats: { Toques: moves, Tiempo: M.fmtTime(t) },
            }), 500);
          }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('APAGA LUCES', W / 2, 46, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Cada toque cambia la casilla y sus cuatro vecinas', W / 2, 126,
        { size: 13, align: 'center', color: P.dim, weight: 600 });
      for (let i = 0; i < SIZES.length; i++) {
        const x = W / 2 - 148 + i * 76;
        const on = i === sizeIdx;
        g.rrect(x, 72, 68, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(SIZES[i] + '×' + SIZES[i], x + 34, 93, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      g.rrect(OX - 10, OY - 10, cell * N + 20, cell * N + 20, 14, alpha(P.deep, 0.75));

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const x = OX + cc * cell + cell / 2, y = OY + r * cell + cell / 2;
        const on = grid[r][cc];
        const pop = 1 + Math.max(0, anim[r][cc]) * 0.1;
        if (on) g.bloom(x, y, cell * 0.9, P.c, 0.5);
        g.push(x, y, 0, pop);
        g.rrect(-cell / 2 + 5, -cell / 2 + 5, cell - 10, cell - 10, cell * 0.22,
          on ? P.c : 'rgba(255,255,255,.05)');
        if (on) g.rrect(-cell / 2 + 5, -cell / 2 + 5, cell - 10, (cell - 10) * 0.4, cell * 0.22, alpha('#ffffff', 0.3));
        else g.rrectStroke(-cell / 2 + 5, -cell / 2 + 5, cell - 10, cell - 10, cell * 0.22, alpha(P.a, 0.22), 1.5);
        g.pop();
      }

      E.ui.hint('Toca las casillas para apagarlas todas', { bottom: 22 });
    },
  };
});
