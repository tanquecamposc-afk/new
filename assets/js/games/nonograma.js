/* Nonograma — deduce el dibujo oculto a partir de los números de cada fila y columna. */
NX.game('nonograma', {
  w: 720, h: 700, pal: 'mono',
  music: { root: 48, scale: 'major', bpm: 66, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const SIZES = [5, 8, 10, 12];

  let N, sol, board, rowHints, colHints, cell, OX, OY, sizeIdx, t, done, errors, drag;

  function layout() {
    const pad = N <= 8 ? 92 : 116;
    const s = Math.min(W - pad - 40, H - 230);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2) + pad / 2;
    OY = 150;
  }

  function hints(line) {
    const out = []; let run = 0;
    line.forEach((v) => { if (v) run++; else { if (run) out.push(run); run = 0; } });
    if (run) out.push(run);
    return out.length ? out : [0];
  }

  function reset(si) {
    sizeIdx = si == null ? (sizeIdx == null ? 1 : sizeIdx) : si;
    N = SIZES[sizeIdx];
    layout();
    /* dibujo con formas conectadas, más agradable que ruido puro */
    sol = [];
    for (let r = 0; r < N; r++) { sol.push([]); for (let c = 0; c < N; c++) sol[r][c] = 0; }
    const blobs = 2 + Math.floor(N / 3);
    for (let b = 0; b < blobs; b++) {
      let r = E.rng.int(N), c = E.rng.int(N);
      const len = E.rng.range(N, N * 2);
      for (let i = 0; i < len; i++) {
        sol[r][c] = 1;
        const d = E.rng.int(4);
        r = M.clamp(r + (d === 0 ? -1 : d === 2 ? 1 : 0), 0, N - 1);
        c = M.clamp(c + (d === 1 ? 1 : d === 3 ? -1 : 0), 0, N - 1);
      }
    }
    /* garantiza que no esté vacío ni lleno */
    let filled = 0;
    sol.forEach((row) => row.forEach((v) => { filled += v; }));
    if (filled < N) sol[E.rng.int(N)][E.rng.int(N)] = 1;

    board = [];
    for (let r = 0; r < N; r++) { board.push([]); for (let c = 0; c < N; c++) board[r][c] = 0; }
    rowHints = sol.map((row) => hints(row));
    colHints = [];
    for (let c = 0; c < N; c++) colHints.push(hints(sol.map((row) => row[c])));
    t = 0; done = false; errors = 0; drag = 0;
    hud();
  }
  function hud() {
    let ok = 0, need = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (sol[r][c]) { need++; if (board[r][c] === 1) ok++; }
    }
    E.api.hud({ Tamaño: N + '×' + N, Pintadas: ok + '/' + need, Errores: errors, Tiempo: M.fmtTime(t) });
  }

  function check() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (sol[r][c] && board[r][c] !== 1) return;
      if (!sol[r][c] && board[r][c] === 1) return;
    }
    done = true;
    E.sfx('win'); E.camera.kick(12); E.camera.flash(P.a, 0.25);
    /* El dibujo se enciende de arriba abajo al completarlo. */
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!sol[r][c]) continue;
      setTimeout(() => E.particles.burst(OX + c * cell + cell / 2, OY + r * cell + cell / 2, 8,
        { col: [P.c, P.a, '#ffffff'], speed1: 150, life1: 0.7, add: true }), r * 70);
    }
    setTimeout(() => E.api.win({
      score: Math.max(0, N * 1200 - Math.round(t * 8) - errors * 200),
      title: '¡Dibujo revelado!',
      msg: N + '×' + N + ' en ' + M.fmtTime(t),
      stats: { Tiempo: M.fmtTime(t), Errores: errors },
    }), 500);
  }

  function paint(r, c, mode) {
    if (done) return;
    const prev = board[r][c];
    if (mode === 1) board[r][c] = prev === 1 ? 0 : 1;
    else board[r][c] = prev === 2 ? 0 : 2;
    const cx = OX + c * cell + cell / 2, cy = OY + r * cell + cell / 2;
    if (board[r][c] === 1 && !sol[r][c]) {
      errors++;
      E.sfx('error'); E.camera.kick(3);
      E.particles.burst(cx, cy, 8, { col: ['#ff4d6d', '#ffffff'], speed1: 140, life1: 0.4, add: true });
    } else {
      E.sfx('tick');
      /* Confirmación silenciosa de que la casilla es correcta. */
      if (board[r][c] === 1) {
        E.particles.burst(cx, cy, 5, { col: [P.a, '#ffffff'], speed1: 75, life1: 0.28, r1: 2.2, add: true });
      }
    }
    hud();
    check();
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 66 && p.y < 100) {
          for (let i = 0; i < SIZES.length; i++) {
            const x = W / 2 - 174 + i * 88;
            if (p.x > x && p.x < x + 80) { reset(i); E.sfx('select'); return; }
          }
        }
        const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
        if (c >= 0 && c < N && r >= 0 && r < N) {
          paint(r, c, (E.input.rightDown || E.input.down('shift')) ? 2 : 1);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.22), P.deep);
      g.text('NONOGRAMA', W / 2, 44, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      for (let i = 0; i < SIZES.length; i++) {
        const x = W / 2 - 174 + i * 88;
        const on = i === sizeIdx;
        g.rrect(x, 68, 80, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(SIZES[i] + '×' + SIZES[i], x + 40, 89, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      const fs = Math.max(9, cell * 0.4);
      /* pistas */
      rowHints.forEach((hs, r) => {
        const y = OY + r * cell + cell * 0.68;
        hs.forEach((v, i) => {
          if (!v) return;
          g.text(String(v), OX - 8 - (hs.length - 1 - i) * (fs + 6), y,
            { size: fs, align: 'right', color: P.dim, weight: 800 });
        });
      });
      colHints.forEach((hs, cc) => {
        const x = OX + cc * cell + cell / 2;
        hs.forEach((v, i) => {
          if (!v) return;
          g.text(String(v), x, OY - 8 - (hs.length - 1 - i) * (fs + 5),
            { size: fs, align: 'center', color: P.dim, weight: 800 });
        });
      });

      g.rrect(OX - 4, OY - 4, cell * N + 8, cell * N + 8, 8, alpha(P.deep, 0.75));
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const x = OX + cc * cell, y = OY + r * cell;
        const v = board[r][cc];
        if (v === 1) g.rect(x + 1, y + 1, cell - 2, cell - 2, done ? P.c : P.a);
        else {
          g.rect(x + 1, y + 1, cell - 2, cell - 2, 'rgba(255,255,255,.05)');
          if (v === 2) {
            g.line(x + cell * 0.3, y + cell * 0.3, x + cell * 0.7, y + cell * 0.7, alpha(P.dim, 0.9), 2);
            g.line(x + cell * 0.7, y + cell * 0.3, x + cell * 0.3, y + cell * 0.7, alpha(P.dim, 0.9), 2);
          }
        }
      }
      c.save();
      c.strokeStyle = alpha(P.a, 0.5); c.lineWidth = 1.6;
      c.beginPath();
      for (let i = 0; i <= N; i += 5) {
        c.moveTo(OX + i * cell, OY); c.lineTo(OX + i * cell, OY + cell * N);
        c.moveTo(OX, OY + i * cell); c.lineTo(OX + cell * N, OY + i * cell);
      }
      c.stroke(); c.restore();

      E.ui.hint('Clic pintar · clic derecho o Shift para marcar con ✗', { bottom: 20 });
    },
  };
});
