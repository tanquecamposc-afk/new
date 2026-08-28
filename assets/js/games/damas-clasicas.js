/* Damas Clásicas — captura obligatoria, cadenas múltiples y coronación. */
NX.game('damas-clasicas', {
  w: 660, h: 720, pal: 'ember',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 8;
  const CELL = Math.floor(Math.min((W - 60) / N, (H - 200) / N));
  const OX = Math.round((W - CELL * N) / 2), OY = 130;
  const LEVELS = ['Fácil', 'Normal', 'Difícil'];

  let board, turn, sel, over, lvl, thinking, chain, msg, msgT;

  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    board = new Array(64).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 1) board[r * N + c] = 2;
    for (let r = 5; r < 8; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 1) board[r * N + c] = 1;
    turn = 1; sel = null; over = false; thinking = 0; chain = null; msg = ''; msgT = 0;
    hud();
  }
  function hud() {
    const me = board.filter((v) => v === 1 || v === 3).length;
    const ai = board.filter((v) => v === 2 || v === 4).length;
    E.api.hud({ Tuyas: me, Rival: ai, Turno: over ? '—' : (turn === 1 ? 'Tú' : 'Máquina'), Nivel: LEVELS[lvl] });
  }

  const own = (v, p) => p === 1 ? (v === 1 || v === 3) : (v === 2 || v === 4);
  const king = (v) => v === 3 || v === 4;

  function pieceMoves(b, i, p, capturesOnly) {
    const r = Math.floor(i / N), c = i % N;
    const v = b[i];
    const dirs = king(v) ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      : p === 1 ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
    const out = [];
    dirs.forEach((d) => {
      const nr = r + d[0], nc = c + d[1];
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
      const ni = nr * N + nc;
      if (!b[ni] && !capturesOnly) out.push({ to: ni, cap: -1 });
      else if (b[ni] && !own(b[ni], p)) {
        const jr = nr + d[0], jc = nc + d[1];
        if (jr < 0 || jr >= N || jc < 0 || jc >= N) return;
        const ji = jr * N + jc;
        if (!b[ji]) out.push({ to: ji, cap: ni });
      }
    });
    return out;
  }

  function allMoves(b, p) {
    let caps = [], plain = [];
    for (let i = 0; i < 64; i++) {
      if (!own(b[i], p)) continue;
      pieceMoves(b, i, p).forEach((m) => {
        const mm = { from: i, to: m.to, cap: m.cap };
        if (m.cap >= 0) caps.push(mm); else plain.push(mm);
      });
    }
    return caps.length ? caps : plain;
  }

  function doMove(b, m, p) {
    const nb = b.slice();
    nb[m.to] = nb[m.from];
    nb[m.from] = 0;
    if (m.cap >= 0) nb[m.cap] = 0;
    const r = Math.floor(m.to / N);
    if (p === 1 && r === 0 && nb[m.to] === 1) nb[m.to] = 3;
    if (p === 2 && r === N - 1 && nb[m.to] === 2) nb[m.to] = 4;
    return nb;
  }

  function evalB(b, me) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const v = b[i];
      if (!v) continue;
      const r = Math.floor(i / N);
      const val = king(v) ? 34 : 12 + (v === 1 ? (7 - r) : r);
      s += own(v, me) ? val : -val;
    }
    return s;
  }

  function search(b, p, depth, a, bb, me) {
    const mv = allMoves(b, p);
    if (!mv.length) return { s: p === me ? -9000 : 9000 };
    if (depth === 0) return { s: evalB(b, me) };
    let best = { s: -Infinity, m: mv[0] };
    for (const m of mv) {
      const nb = doMove(b, m, p);
      let s;
      /* cadena de capturas: sigue el mismo jugador */
      if (m.cap >= 0 && pieceMoves(nb, m.to, p, true).length) {
        s = search(nb, p, depth - 1, a, bb, me).s * (p === me ? 1 : 1);
        if (p !== me) s = -Math.abs(s) * 0 + search(nb, p, depth - 1, -bb, -a, me).s;
      } else s = -search(nb, 3 - p, depth - 1, -bb, -a, 3 - me).s;
      if (s > best.s) best = { s, m };
      a = Math.max(a, s);
      if (a >= bb) break;
    }
    return best;
  }

  /* Una captura se ve: chispas, sacudida y la ficha saltando. */
  function comida(idx, col) {
    const x = OX + (idx % N) * CELL + CELL / 2, y = OY + Math.floor(idx / N) * CELL + CELL / 2;
    E.particles.burst(x, y, 22, { col: [col, '#ffffff'], speed1: 230, life1: 0.6, add: true });
    E.camera.kick(6);
    E.floaters.add(x, y - CELL * 0.35, '×', { col, size: 24 });
  }

  function aiMove() {
    const mv = allMoves(board, 2);
    if (!mv.length) return finish(1);
    let m;
    if (lvl === 0) m = E.rng.pick(mv);
    else m = search(board, 2, lvl === 1 ? 4 : 6, -Infinity, Infinity, 2).m || E.rng.pick(mv);
    board = doMove(board, m, 2);
    E.sfx(m.cap >= 0 ? 'hit' : 'place');
    if (m.cap >= 0) comida(m.cap, P.a);
    if (m.cap >= 0 && pieceMoves(board, m.to, 2, true).length) { thinking = 0.4; return; }
    turn = 1;
    hud();
    if (!allMoves(board, 1).length) finish(2);
  }

  function finish(w) {
    over = true;
    E.sfx(w === 1 ? 'win' : 'lose');
    setTimeout(() => {
      const o = { score: board.filter((v) => own(v, 1)).length * 200,
        title: w === 1 ? '¡Ganaste!' : 'Gana la máquina', msg: 'Damas · ' + LEVELS[lvl] };
      w === 1 ? E.api.win(o) : E.api.over(o);
    }, 900);
  }

  function playerMove(i) {
    const mv = allMoves(board, 1);
    if (sel == null) {
      if (own(board[i], 1) && mv.some((m) => m.from === i)) { sel = i; E.sfx('tap'); }
      else E.sfx('error');
      return;
    }
    if (i === sel) { sel = null; return; }
    const m = mv.find((q) => q.from === sel && q.to === i);
    if (!m) {
      if (own(board[i], 1) && mv.some((q) => q.from === i) && !chain) { sel = i; E.sfx('tap'); }
      else E.sfx('error');
      return;
    }
    board = doMove(board, m, 1);
    E.sfx(m.cap >= 0 ? 'hit' : 'place');
    if (m.cap >= 0) {
      comida(m.cap, P.b);
      if (pieceMoves(board, m.to, 1, true).length) {
        sel = m.to; chain = m.to;
        msg = '¡Sigue capturando!'; msgT = 1.4;
        hud();
        return;
      }
    }
    sel = null; chain = null;
    turn = 2;
    hud();
    if (!allMoves(board, 2).length) return finish(1);
    thinking = 0.5;
  }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiMove(); return; }
      if (over || turn !== 1) return;
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 66 && p.y < 100) {
          for (let i = 0; i < LEVELS.length; i++) {
            const x = W / 2 - 220 + i * 148;
            if (p.x > x && p.x < x + 140) { reset(i); E.sfx('select'); return; }
          }
        }
        const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < N && r >= 0 && r < N) playerMove(r * N + c);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('DAMAS', W / 2, 42, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 5 });
      LEVELS.forEach((L, i) => {
        const x = W / 2 - 220 + i * 148;
        const on = i === lvl;
        g.rrect(x, 66, 140, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(L, x + 70, 87, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        g.rect(OX + cc * CELL, OY + r * CELL, CELL, CELL,
          (r + cc) % 2 ? mix('#8b5a2b', P.deep, 0.28) : mix('#e8ddc4', P.deep, 0.12));
      }
      g.rrectStroke(OX - 4, OY - 4, CELL * N + 8, CELL * N + 8, 6, mix('#5b3a1b', P.deep, 0.1), 8);

      const mv = (!over && turn === 1) ? allMoves(board, 1) : [];
      if (sel != null) {
        g.rect(OX + (sel % N) * CELL, OY + Math.floor(sel / N) * CELL, CELL, CELL, alpha(P.c, 0.35));
        mv.filter((m) => m.from === sel).forEach((m) => {
          const x = OX + (m.to % N) * CELL + CELL / 2, y = OY + Math.floor(m.to / N) * CELL + CELL / 2;
          g.circle(x, y, CELL * 0.16, alpha(P.c, 0.6));
        });
      } else {
        mv.forEach((m) => {
          g.rrectStroke(OX + (m.from % N) * CELL + 3, OY + Math.floor(m.from / N) * CELL + 3,
            CELL - 6, CELL - 6, 6, alpha(P.c, 0.3), 1.5);
        });
      }

      for (let i = 0; i < 64; i++) {
        const v = board[i];
        if (!v) continue;
        const x = OX + (i % N) * CELL + CELL / 2, y = OY + Math.floor(i / N) * CELL + CELL / 2;
        const col = own(v, 1) ? P.a : '#e8e4de';
        c.save(); c.globalAlpha = 0.35; g.circle(x, y + 3, CELL * 0.34, '#000'); c.restore();
        g.circle(x, y, CELL * 0.34, col);
        g.ring(x, y, CELL * 0.24, 2, alpha('#000', 0.18));
        if (king(v)) g.star(x, y, CELL * 0.17, CELL * 0.08, 5, 0, P.c);
      }

      if (thinking > 0) g.text('Pensando…', W / 2, OY + CELL * N + 34, { size: 14, align: 'center', color: P.c, weight: 800 });
      if (msgT > 0) g.text(msg, W / 2, OY + CELL * N + 58, { size: 14, align: 'center', color: P.c, weight: 800 });
      E.particles.draw(g);
      E.ui.hint('Captura obligatoria · corona al llegar al fondo', { bottom: 16 });
    },
  };
});
