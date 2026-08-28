/* Cuatro en Raya — IA por minimax en tres niveles o partida local. */
NX.game('cuatro-en-raya', {
  w: 700, h: 660, pal: 'candy',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = 7, ROWS = 6;
  const CELL = Math.floor(Math.min((W - 80) / COLS, (H - 220) / ROWS));
  const OX = Math.round((W - CELL * COLS) / 2), OY = 150;
  const LEVELS = ['Fácil', 'Normal', 'Difícil', '2 jugadores'];

  let board, turn, over, winner, winLine, drop, lvl, thinking, msg, msgT, wins, losses;

  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    board = new Array(COLS * ROWS).fill(0);
    turn = 1; over = false; winner = 0; winLine = null; drop = null; thinking = 0;
    msg = ''; msgT = 0;
    if (wins == null) { wins = 0; losses = 0; }
    hud();
  }
  function hud() {
    E.api.hud({ Nivel: LEVELS[lvl], Turno: over ? '—' : (turn === 1 ? 'Tú' : lvl === 3 ? 'Jugador 2' : 'Máquina'), Ganadas: wins });
  }

  const at = (c, r) => board[r * COLS + c];
  function dropRow(b, c) {
    for (let r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + c]) return r;
    return -1;
  }
  function winner4(b) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = b[r * COLS + c];
      if (!v) continue;
      for (const d of dirs) {
        const line = [[c, r]];
        for (let k = 1; k < 4; k++) {
          const nc = c + d[0] * k, nr = r + d[1] * k;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || b[nr * COLS + nc] !== v) break;
          line.push([nc, nr]);
        }
        if (line.length === 4) return { v, line };
      }
    }
    return null;
  }

  function score(b, me) {
    const w = winner4(b);
    if (w) return w.v === me ? 10000 : -10000;
    let s = 0;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      for (const d of dirs) {
        let mine = 0, his = 0, ok = true;
        for (let k = 0; k < 4; k++) {
          const nc = c + d[0] * k, nr = r + d[1] * k;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) { ok = false; break; }
          const v = b[nr * COLS + nc];
          if (v === me) mine++; else if (v) his++;
        }
        if (!ok) continue;
        if (mine && !his) s += mine * mine;
        if (his && !mine) s -= his * his * 1.15;
      }
    }
    for (let r = 0; r < ROWS; r++) s += b[r * COLS + 3] === me ? 3 : b[r * COLS + 3] ? -3 : 0;
    return s;
  }

  function minimax(b, depth, a, bb, maxing, me) {
    const w = winner4(b);
    if (w) return { s: (w.v === me ? 10000 : -10000) - (maxing ? depth : -depth) };
    if (depth === 0 || b.every((v) => v)) return { s: score(b, me) };
    let best = { s: maxing ? -Infinity : Infinity, c: -1 };
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const c of order) {
      const r = dropRow(b, c);
      if (r < 0) continue;
      b[r * COLS + c] = maxing ? me : 3 - me;
      const res = minimax(b, depth - 1, a, bb, !maxing, me);
      b[r * COLS + c] = 0;
      if (maxing) {
        if (res.s > best.s) best = { s: res.s, c };
        a = Math.max(a, res.s);
      } else {
        if (res.s < best.s) best = { s: res.s, c };
        bb = Math.min(bb, res.s);
      }
      if (bb <= a) break;
    }
    return best;
  }

  function aiMove() {
    const depths = [1, 4, 6];
    const d = depths[lvl];
    let c;
    if (lvl === 0 && E.rng.bool(0.4)) {
      const opts = [];
      for (let i = 0; i < COLS; i++) if (dropRow(board, i) >= 0) opts.push(i);
      c = E.rng.pick(opts);
    } else c = minimax(board.slice(), d, -Infinity, Infinity, true, 2).c;
    if (c == null || c < 0 || dropRow(board, c) < 0) {
      for (let i = 0; i < COLS; i++) if (dropRow(board, i) >= 0) { c = i; break; }
    }
    play(c);
  }

  function play(c) {
    const r = dropRow(board, c);
    if (r < 0 || over) return;
    board[r * COLS + c] = turn;
    drop = { c, r, y: -1, v: turn };
    E.sfx('drop');
    const w = winner4(board);
    if (w) {
      over = true; winner = w.v; winLine = w.line;
      E.sfx('win'); E.camera.kick(6);
      if (w.v === 1) wins++; else losses++;
      hud();
      setTimeout(() => {
        const won = w.v === 1;
        const o = { score: wins * 1000, label: 'Puntos',
          title: won ? '¡Cuatro en raya!' : (lvl === 3 ? 'Gana el jugador 2' : 'Gana la máquina'),
          msg: 'Nivel ' + LEVELS[lvl], stats: { Ganadas: wins, Perdidas: losses } };
        won ? E.api.win(o) : E.api.over(o);
      }, 1200);
      return;
    }
    if (board.every((v) => v)) {
      over = true;
      E.sfx('error');
      setTimeout(() => E.api.over({ score: wins * 1000, title: 'Empate', msg: 'Tablero completo' }), 900);
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
      if (drop) {
        drop.y = M.damp(drop.y, drop.r, 18, dt);
        if (Math.abs(drop.y - drop.r) < 0.03) {
          /* Impacto al tocar fondo: polvo, sacudida y golpe seco. */
          const x = OX + drop.c * CELL + CELL / 2, y = OY + drop.r * CELL + CELL / 2;
          E.particles.burst(x, y + CELL * 0.35, 12, {
            col: [drop.v === 1 ? P.c : P.a, '#ffffff'], speed1: 170, life1: 0.4,
            angle: -Math.PI / 2, spread: 2.2, add: true,
          });
          E.camera.kick(4);
          E.sfx('place');
          drop = null;
        }
      }
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiMove(); return; }
      if (over) return;
      if (turn === 2 && lvl !== 3) return;

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 74 && p.y < 108) {
          for (let i = 0; i < LEVELS.length; i++) {
            const x = W / 2 - 300 + i * 152;
            if (p.x > x && p.x < x + 144) { reset(i); E.sfx('select'); return; }
          }
        }
        const c = Math.floor((p.x - OX) / CELL);
        if (c >= 0 && c < COLS) play(c);
      }
      for (let i = 1; i <= 7; i++) if (E.input.pressed(String(i))) play(i - 1);
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('CUATRO EN RAYA', W / 2, 46, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      LEVELS.forEach((L, i) => {
        const x = W / 2 - 300 + i * 152;
        const on = i === lvl;
        g.rrect(x, 74, 144, 34, 10, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(L, x + 72, 96, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      /* columna resaltada */
      const p = E.input.pointer;
      const hc = Math.floor((p.x - OX) / CELL);
      if (!over && hc >= 0 && hc < COLS && dropRow(board, hc) >= 0 && (turn === 1 || lvl === 3)) {
        g.rect(OX + hc * CELL, OY - 34, CELL, CELL * ROWS + 34, alpha(turn === 1 ? P.c : P.b, 0.1));
        g.circle(OX + hc * CELL + CELL / 2, OY - 18, CELL * 0.28, alpha(turn === 1 ? P.c : P.b, 0.6));
      }

      g.rrect(OX - 10, OY - 10, CELL * COLS + 20, CELL * ROWS + 20, 16, mix('#1d4ed8', P.deep, 0.4));
      for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
        const x = OX + cc * CELL + CELL / 2, y = OY + r * CELL + CELL / 2;
        const v = at(cc, r);
        const isDrop = drop && drop.c === cc && drop.r === r;
        if (!v || isDrop) g.circle(x, y, CELL * 0.4, alpha(P.deep, 0.9));
        else {
          const win = winLine && winLine.some((q) => q[0] === cc && q[1] === r);
          const col = v === 1 ? P.c : P.b;
          if (win) g.bloom(x, y, CELL * 0.9, col, 0.6);
          g.circle(x, y, CELL * 0.4, col);
          g.circle(x - CELL * 0.12, y - CELL * 0.14, CELL * 0.13, alpha('#ffffff', 0.3));
        }
      }
      if (drop) {
        const x = OX + drop.c * CELL + CELL / 2, y = OY + drop.y * CELL + CELL / 2;
        const col = drop.v === 1 ? P.c : P.b;
        g.circle(x, y, CELL * 0.4, col);
        g.circle(x - CELL * 0.12, y - CELL * 0.14, CELL * 0.13, alpha('#ffffff', 0.3));
      }

      if (thinking > 0) g.text('Pensando…', W / 2, H - 44, { size: 15, align: 'center', color: P.dim, weight: 700 });
      else if (!over) {
        g.text(turn === 1 ? 'Te toca' : (lvl === 3 ? 'Turno del jugador 2' : 'Turno de la máquina'),
          W / 2, H - 44, { size: 16, align: 'center', weight: 800, color: turn === 1 ? P.c : P.b });
      }
      E.particles.draw(g);
    },
  };
});
