/* Gato Supremo — tres en raya dentro de tres en raya. */
NX.game('gato-supremo', {
  w: 660, h: 720, pal: 'mono',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const SIZE = Math.min(W - 60, H - 200);
  const BIG = SIZE / 3, SMALL = BIG / 3;
  const OX = (W - SIZE) / 2, OY = 130;
  const MODES = ['vs Máquina', '2 jugadores'];

  let cells, boards, turn, active, over, winner, mode, thinking, lastMove;

  function reset(m) {
    mode = m == null ? (mode == null ? 0 : mode) : m;
    cells = new Array(81).fill(0);
    boards = new Array(9).fill(0);
    turn = 1; active = -1; over = false; winner = 0; thinking = 0; lastMove = -1;
    hud();
  }
  function hud() {
    E.api.hud({ Modo: MODES[mode], Turno: over ? '—' : (turn === 1 ? '✕ Tú' : mode ? '○ J2' : '○ Máquina'),
      Tableros: boards.filter((b) => b).length + '/9' });
  }

  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function win3(arr, off) {
    for (const L of LINES) {
      const a = arr[off + L[0]], b = arr[off + L[1]], c = arr[off + L[2]];
      if (a && a === b && b === c) return a;
    }
    return 0;
  }

  function legal(i) {
    if (over) return false;
    const b = Math.floor(i / 9);
    if (cells[i]) return false;
    if (boards[b]) return false;
    if (active >= 0 && b !== active) return false;
    return true;
  }

  function play(i) {
    if (!legal(i)) { E.sfx('error'); return; }
    cells[i] = turn;
    lastMove = i;
    E.sfx(turn === 1 ? 'tap' : 'place');
    const b = Math.floor(i / 9);
    const w = win3(cells, b * 9);
    if (w) {
      boards[b] = w;
      E.sfx('select'); E.camera.kick(4);
      const bw = win3(boards, 0);
      if (bw) {
        over = true; winner = bw;
        E.sfx('win');
        setTimeout(() => {
          const won = bw === 1;
          const o = { score: won ? 2500 : 0, title: won ? '¡Ganaste!' : 'Perdiste',
            msg: 'Gato Supremo · ' + MODES[mode] };
          won ? E.api.win(o) : E.api.over(o);
        }, 900);
        return;
      }
    } else if (cells.slice(b * 9, b * 9 + 9).every((v) => v)) boards[b] = 3;
    const nb = i % 9;
    active = boards[nb] ? -1 : nb;
    turn = 3 - turn;
    hud();
    if (turn === 2 && mode === 0) thinking = 0.4;
  }

  function aiMove() {
    const opts = [];
    for (let i = 0; i < 81; i++) if (legal(i)) opts.push(i);
    if (!opts.length) { over = true; return; }
    /* heurística: gana el mini tablero, si no bloquea, si no centro */
    let best = null, bestScore = -1e9;
    opts.forEach((i) => {
      let s = E.rng.float(0, 1);
      const b = Math.floor(i / 9), c = i % 9;
      cells[i] = 2;
      if (win3(cells, b * 9) === 2) s += 60;
      cells[i] = 1;
      if (win3(cells, b * 9) === 1) s += 40;
      cells[i] = 0;
      if (c === 4) s += 6;
      if (c % 2 === 0) s += 3;
      /* evita enviar al rival a un tablero libre y ventajoso */
      if (boards[c]) s -= 12;
      const sent = c;
      cells[i] = 2;
      const wouldWin = win3(cells, b * 9) === 2;
      cells[i] = 0;
      if (!wouldWin) {
        /* ¿el rival podría ganar ese tablero al instante? */
        for (let k = 0; k < 9; k++) {
          const idx = sent * 9 + k;
          if (cells[idx]) continue;
          cells[idx] = 1;
          if (win3(cells, sent * 9) === 1) s -= 25;
          cells[idx] = 0;
        }
      }
      if (s > bestScore) { bestScore = s; best = i; }
    });
    play(best);
  }

  reset(0);

  return {
    update(dt) {
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiMove(); return; }
      if (over) return;
      if (turn === 2 && mode === 0) return;
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 66 && p.y < 100) {
          for (let i = 0; i < 2; i++) {
            const x = W / 2 - 160 + i * 164;
            if (p.x > x && p.x < x + 156) { reset(i); E.sfx('select'); return; }
          }
        }
        const bx = Math.floor((p.x - OX) / BIG), by = Math.floor((p.y - OY) / BIG);
        if (bx < 0 || bx > 2 || by < 0 || by > 2) return;
        const sx = Math.floor((p.x - OX - bx * BIG) / SMALL), sy = Math.floor((p.y - OY - by * BIG) / SMALL);
        const b = by * 3 + bx, c = sy * 3 + sx;
        play(b * 9 + c);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 14);
      g.text('GATO SUPREMO', W / 2, 42, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      MODES.forEach((m, i) => {
        const x = W / 2 - 160 + i * 164;
        const on = i === mode;
        g.rrect(x, 66, 156, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(m, x + 78, 87, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      for (let b = 0; b < 9; b++) {
        const bx = OX + (b % 3) * BIG, by = OY + Math.floor(b / 3) * BIG;
        const isActive = !over && (active === b || (active < 0 && !boards[b]));
        g.rrect(bx + 3, by + 3, BIG - 6, BIG - 6, 10,
          isActive ? alpha(P.a, 0.14) : boards[b] ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.045)');
        if (isActive) g.rrectStroke(bx + 3, by + 3, BIG - 6, BIG - 6, 10, alpha(P.c, 0.7), 2);

        c.save(); c.strokeStyle = alpha(P.ink, 0.1); c.lineWidth = 1;
        c.beginPath();
        for (let i = 1; i < 3; i++) {
          c.moveTo(bx + i * SMALL, by + 8); c.lineTo(bx + i * SMALL, by + BIG - 8);
          c.moveTo(bx + 8, by + i * SMALL); c.lineTo(bx + BIG - 8, by + i * SMALL);
        }
        c.stroke(); c.restore();

        for (let k = 0; k < 9; k++) {
          const v = cells[b * 9 + k];
          if (!v) continue;
          const x = bx + (k % 3) * SMALL + SMALL / 2, y = by + Math.floor(k / 3) * SMALL + SMALL / 2;
          const r = SMALL * 0.26;
          const last = lastMove === b * 9 + k;
          if (v === 1) {
            g.line(x - r, y - r, x + r, y + r, last ? P.c : P.b, 3);
            g.line(x + r, y - r, x - r, y + r, last ? P.c : P.b, 3);
          } else g.ring(x, y, r, 3, last ? P.c : P.a);
        }

        if (boards[b]) {
          c.save(); c.globalAlpha = 0.85;
          g.rrect(bx + 3, by + 3, BIG - 6, BIG - 6, 10, alpha(P.deep, 0.72));
          const r = BIG * 0.26;
          const x = bx + BIG / 2, y = by + BIG / 2;
          if (boards[b] === 1) {
            g.line(x - r, y - r, x + r, y + r, P.b, 9);
            g.line(x + r, y - r, x - r, y + r, P.b, 9);
          } else if (boards[b] === 2) g.ring(x, y, r, 9, P.a);
          else g.text('—', x, y + 12, { size: 34, align: 'center', color: P.dim, weight: 900 });
          c.restore();
        }
      }

      c.save(); c.strokeStyle = alpha(P.a, 0.5); c.lineWidth = 3;
      c.beginPath();
      for (let i = 1; i < 3; i++) {
        c.moveTo(OX + i * BIG, OY); c.lineTo(OX + i * BIG, OY + SIZE);
        c.moveTo(OX, OY + i * BIG); c.lineTo(OX + SIZE, OY + i * BIG);
      }
      c.stroke(); c.restore();

      g.text(active >= 0 ? 'Debes jugar en el tablero resaltado' : 'Puedes jugar en cualquier tablero libre',
        W / 2, OY + SIZE + 34, { size: 13.5, align: 'center', color: P.dim, weight: 700 });
      if (thinking > 0) g.text('Pensando…', W / 2, OY + SIZE + 58, { size: 14, align: 'center', color: P.c, weight: 800 });
    },
  };
});
