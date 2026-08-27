/* Reversi — voltea las fichas del rival encerrándolas. */
NX.game('reversi', {
  w: 660, h: 720, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 8;
  const CELL = Math.floor(Math.min((W - 60) / N, (H - 220) / N));
  const OX = Math.round((W - CELL * N) / 2), OY = 140;
  const LEVELS = ['Fácil', 'Normal', 'Difícil', '2 jugadores'];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const WEIGHTS = [
    120, -20, 20, 5, 5, 20, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    20, -5, 15, 3, 3, 15, -5, 20,
    5, -5, 3, 3, 3, 3, -5, 5,
    5, -5, 3, 3, 3, 3, -5, 5,
    20, -5, 15, 3, 3, 15, -5, 20,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 20, 5, 5, 20, -20, 120,
  ];

  let board, turn, over, lvl, thinking, flips, msg, msgT, passes;

  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    board = new Array(N * N).fill(0);
    board[27] = board[36] = 1;
    board[28] = board[35] = 2;
    turn = 1; over = false; thinking = 0; flips = []; msg = ''; msgT = 0; passes = 0;
    hud();
  }
  function hud() {
    const b = count(board, 1), w = count(board, 2);
    E.api.hud({ Negras: b, Blancas: w, Turno: over ? '—' : (turn === 1 ? 'Tú' : lvl === 3 ? 'Blancas' : 'Máquina') });
  }
  function count(b, v) { let n = 0; for (let i = 0; i < b.length; i++) if (b[i] === v) n++; return n; }

  function gains(b, i, p) {
    if (b[i]) return [];
    const c = i % N, r = Math.floor(i / N);
    const out = [];
    DIRS.forEach((d) => {
      const line = [];
      let nc = c + d[0], nr = r + d[1];
      while (nc >= 0 && nc < N && nr >= 0 && nr < N) {
        const v = b[nr * N + nc];
        if (!v) return;
        if (v === p) { out.push.apply(out, line); return; }
        line.push(nr * N + nc);
        nc += d[0]; nr += d[1];
      }
    });
    return out;
  }
  function moves(b, p) {
    const out = [];
    for (let i = 0; i < N * N; i++) if (!b[i] && gains(b, i, p).length) out.push(i);
    return out;
  }
  function apply(b, i, p) {
    const g2 = gains(b, i, p);
    const nb = b.slice();
    nb[i] = p;
    g2.forEach((k) => { nb[k] = p; });
    return { b: nb, flips: g2 };
  }

  function evalBoard(b, me) {
    let s = 0;
    for (let i = 0; i < b.length; i++) {
      if (b[i] === me) s += WEIGHTS[i];
      else if (b[i]) s -= WEIGHTS[i];
    }
    s += (moves(b, me).length - moves(b, 3 - me).length) * 8;
    return s;
  }

  function search(b, p, depth, a, bb, me) {
    const mv = moves(b, p);
    if (depth === 0 || (!mv.length && !moves(b, 3 - p).length)) return { s: evalBoard(b, me) };
    if (!mv.length) return { s: -search(b, 3 - p, depth - 1, -bb, -a, 3 - me).s };
    let best = { s: -Infinity, i: mv[0] };
    for (const i of mv) {
      const nb = apply(b, i, p).b;
      const s = -search(nb, 3 - p, depth - 1, -bb, -a, 3 - me).s;
      if (s > best.s) best = { s, i };
      a = Math.max(a, s);
      if (a >= bb) break;
    }
    return best;
  }

  function aiMove() {
    const mv = moves(board, 2);
    if (!mv.length) { pass(); return; }
    let i;
    if (lvl === 0) i = E.rng.pick(mv);
    else i = search(board, 2, lvl === 1 ? 3 : 5, -Infinity, Infinity, 2).i;
    place(i);
  }

  function pass() {
    passes++;
    if (passes >= 2) return finish();
    turn = 3 - turn;
    msg = 'Sin jugadas: pasa turno'; msgT = 1.4;
    E.sfx('error');
    hud();
    if (turn === 2 && lvl !== 3) thinking = 0.4;
  }

  function finish() {
    over = true;
    const b = count(board, 1), w = count(board, 2);
    E.sfx(b > w ? 'win' : 'lose');
    setTimeout(() => {
      const won = b > w;
      const o = { score: b * 100, label: 'Fichas',
        title: b === w ? 'Empate' : won ? '¡Ganaste!' : 'Gana la máquina',
        msg: b + ' negras – ' + w + ' blancas', stats: { Negras: b, Blancas: w } };
      won ? E.api.win(o) : E.api.over(o);
    }, 900);
  }

  function place(i) {
    const res = apply(board, i, turn);
    board = res.b;
    flips = res.flips.map((k) => ({ i: k, t: 0 }));
    passes = 0;
    E.sfx('place'); E.camera.kick(2);
    if (!moves(board, 3 - turn).length) {
      if (!moves(board, turn).length) return finish();
      msg = (turn === 1 ? 'La máquina' : 'Tú') + ' pasa turno'; msgT = 1.4;
      hud();
      if (turn === 2 && lvl !== 3) thinking = 0.5;
      else if (turn === 1 && lvl !== 3) thinking = 0.5;
      return;
    }
    turn = 3 - turn;
    hud();
    if (turn === 2 && lvl !== 3) thinking = 0.45;
  }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      flips.forEach((f) => { f.t = Math.min(1, f.t + dt * 4); });
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiMove(); return; }
      if (over) return;
      if (turn === 2 && lvl !== 3) return;

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 66 && p.y < 100) {
          for (let i = 0; i < LEVELS.length; i++) {
            const x = W / 2 - 290 + i * 148;
            if (p.x > x && p.x < x + 140) { reset(i); E.sfx('select'); return; }
          }
        }
        const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < N && r >= 0 && r < N) {
          const i = r * N + c;
          if (gains(board, i, turn).length) place(i);
          else E.sfx('error');
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('REVERSI', W / 2, 42, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });
      LEVELS.forEach((L, i) => {
        const x = W / 2 - 290 + i * 148;
        const on = i === lvl;
        g.rrect(x, 66, 140, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(L, x + 70, 87, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      /* marcador */
      const b1 = count(board, 1), b2 = count(board, 2);
      g.circle(W / 2 - 90, 118, 12, '#0f172a');
      g.text(String(b1), W / 2 - 66, 124, { size: 20, weight: 900, color: P.ink, mono: true });
      g.circle(W / 2 + 60, 118, 12, '#f1f5f9');
      g.text(String(b2), W / 2 + 84, 124, { size: 20, weight: 900, color: P.ink, mono: true });

      g.rrect(OX - 8, OY - 8, CELL * N + 16, CELL * N + 16, 12, mix('#1c6b3f', P.deep, 0.3));
      c.save(); c.strokeStyle = alpha('#000', 0.35); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        c.moveTo(OX + i * CELL, OY); c.lineTo(OX + i * CELL, OY + N * CELL);
        c.moveTo(OX, OY + i * CELL); c.lineTo(OX + N * CELL, OY + i * CELL);
      }
      c.stroke(); c.restore();

      const legal = (!over && (turn === 1 || lvl === 3)) ? moves(board, turn) : [];
      legal.forEach((i) => {
        const x = OX + (i % N) * CELL + CELL / 2, y = OY + Math.floor(i / N) * CELL + CELL / 2;
        g.circle(x, y, CELL * 0.14, alpha(turn === 1 ? '#0f172a' : '#f1f5f9', 0.35));
        g.ring(x, y, CELL * 0.36, 1.5, alpha(P.c, 0.5));
      });

      for (let i = 0; i < N * N; i++) {
        if (!board[i]) continue;
        const x = OX + (i % N) * CELL + CELL / 2, y = OY + Math.floor(i / N) * CELL + CELL / 2;
        const f = flips.find((q) => q.i === i);
        const sc = f ? Math.abs(Math.cos(f.t * Math.PI)) : 1;
        g.push(x, y, 0, Math.max(0.06, sc), 1);
        g.circle(0, 0, CELL * 0.38, board[i] === 1 ? '#0f172a' : '#f1f5f9');
        g.circle(-CELL * 0.1, -CELL * 0.12, CELL * 0.12, alpha('#ffffff', board[i] === 1 ? 0.16 : 0.6));
        g.pop();
      }

      if (thinking > 0) g.text('Pensando…', W / 2, OY + CELL * N + 34, { size: 14, align: 'center', color: P.c, weight: 800 });
      if (msgT > 0) g.text(msg, W / 2, OY + CELL * N + 58, { size: 14, align: 'center', color: P.dim, weight: 700 });
      E.particles.draw(g);
    },
  };
});
