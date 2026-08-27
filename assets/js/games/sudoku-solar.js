/* Sudoku Solar — generador propio con solución única, notas y cuatro niveles. */
NX.game('sudoku-solar', {
  w: 700, h: 720, pal: 'ice',
  music: { root: 50, scale: 'major', bpm: 68, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CELL = Math.floor(Math.min((W - 60) / 9, (H - 250) / 9));
  const OX = Math.round((W - CELL * 9) / 2), OY = 100;
  const LEVELS = [['Fácil', 40], ['Media', 46], ['Difícil', 52], ['Experto', 56]];

  let sol, puz, board, notes, sel, lvl, errors, t, done, noteMode, hint;

  /* --- generador --- */
  function solve(b, count) {
    for (let i = 0; i < 81; i++) {
      if (b[i]) continue;
      const r = (i / 9) | 0, c = i % 9;
      let found = 0;
      const nums = E.rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (ok(b, r, c, n)) {
          b[i] = n;
          found += solve(b, count);
          b[i] = 0;
          if (!count && found) return 1;
          if (found > 1) return found;
        }
      }
      return found;
    }
    return 1;
  }
  function ok(b, r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (b[r * 9 + i] === n || b[i * 9 + c] === n) return false;
    }
    const br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (b[(br + i) * 9 + bc + j] === n) return false;
    return true;
  }
  function fill(b) {
    for (let i = 0; i < 81; i++) {
      if (b[i]) continue;
      const nums = E.rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (ok(b, (i / 9) | 0, i % 9, n)) {
          b[i] = n;
          if (fill(b)) return true;
          b[i] = 0;
        }
      }
      return false;
    }
    return true;
  }

  function generate(remove) {
    sol = new Array(81).fill(0);
    fill(sol);
    puz = sol.slice();
    const idx = E.rng.shuffle(Array.from({ length: 81 }, (_, i) => i));
    let removed = 0;
    for (const i of idx) {
      if (removed >= remove) break;
      const keep = puz[i];
      puz[i] = 0;
      const test = puz.slice();
      if (solve(test, true) !== 1) puz[i] = keep;
      else removed++;
    }
  }

  function reset(level) {
    lvl = level == null ? (lvl == null ? 0 : lvl) : level;
    generate(LEVELS[lvl][1]);
    board = puz.slice();
    notes = Array.from({ length: 81 }, () => new Set());
    sel = null; errors = 0; t = 0; done = false; noteMode = false; hint = 0;
    hud();
  }
  function hud() {
    const left = board.filter((v, i) => !v).length;
    E.api.hud({ Nivel: LEVELS[lvl][0], Faltan: left, Errores: errors, Tiempo: M.fmtTime(t) });
  }

  function place(n) {
    if (sel == null || puz[sel]) return;
    if (noteMode) {
      if (notes[sel].has(n)) notes[sel].delete(n); else notes[sel].add(n);
      E.sfx('tick');
      return;
    }
    if (n === 0) { board[sel] = 0; hud(); E.sfx('tap'); return; }
    board[sel] = n;
    notes[sel].clear();
    if (sol[sel] !== n) {
      errors++;
      E.sfx('error'); E.camera.kick(4);
      E.floaters.add(OX + (sel % 9) * CELL + CELL / 2, OY + ((sel / 9) | 0) * CELL, '✗', { col: '#ff4d6d', size: 22 });
    } else {
      E.sfx('select');
      /* limpia las notas afectadas */
      const r = (sel / 9) | 0, c = sel % 9;
      for (let i = 0; i < 9; i++) { notes[r * 9 + i].delete(n); notes[i * 9 + c].delete(n); }
    }
    hud();
    if (board.every((v, i) => v === sol[i])) {
      done = true;
      E.sfx('win');
      setTimeout(() => E.api.win({
        score: Math.max(0, 20000 + lvl * 5000 - Math.round(t * 20) - errors * 500),
        title: '¡Sudoku resuelto!',
        msg: LEVELS[lvl][0] + ' en ' + M.fmtTime(t) + ' con ' + errors + ' errores',
        stats: { Tiempo: M.fmtTime(t), Errores: errors },
      }), 400);
    }
  }

  reset(0);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 50 && p.y < 84) {
          for (let i = 0; i < 4; i++) {
            const x = W / 2 - 190 + i * 96;
            if (p.x > x && p.x < x + 88) { reset(i); E.sfx('select'); return; }
          }
        }
        const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < 9 && r >= 0 && r < 9) { sel = r * 9 + c; E.sfx('tap'); }
        /* teclado en pantalla */
        const ky = OY + CELL * 9 + 24;
        if (p.y > ky && p.y < ky + 46) {
          for (let i = 0; i < 9; i++) {
            const x = OX + i * (CELL * 9 / 9);
            if (p.x > x && p.x < x + CELL) { place(i + 1); return; }
          }
        }
        if (p.y > ky + 56 && p.y < ky + 96) {
          if (p.x > W / 2 - 150 && p.x < W / 2 - 10) { noteMode = !noteMode; E.sfx('tick'); }
          else if (p.x > W / 2 + 10 && p.x < W / 2 + 150) { place(0); }
        }
      }
      for (let i = 1; i <= 9; i++) if (E.input.pressed(String(i))) place(i);
      if (E.input.pressed('back') || E.input.pressed('0')) place(0);
      if (E.input.pressed('n')) noteMode = !noteMode;
      if (sel != null) {
        if (E.input.pressed('left')) sel = sel % 9 > 0 ? sel - 1 : sel;
        if (E.input.pressed('right')) sel = sel % 9 < 8 ? sel + 1 : sel;
        if (E.input.pressed('up')) sel = sel > 8 ? sel - 9 : sel;
        if (E.input.pressed('down')) sel = sel < 72 ? sel + 9 : sel;
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('SUDOKU SOLAR', W / 2, 34, { size: 20, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      for (let i = 0; i < 4; i++) {
        const x = W / 2 - 190 + i * 96;
        const on = i === lvl;
        g.rrect(x, 52, 88, 30, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(LEVELS[i][0], x + 44, 72, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      g.rrect(OX - 8, OY - 8, CELL * 9 + 16, CELL * 9 + 16, 10, alpha(P.deep, 0.8));

      const selV = sel != null ? board[sel] : 0;
      for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) {
        const i = r * 9 + cc;
        const x = OX + cc * CELL, y = OY + r * CELL;
        const isSel = sel === i;
        const sameRow = sel != null && (((sel / 9) | 0) === r || sel % 9 === cc ||
          (((sel / 9 | 0) / 3 | 0) === (r / 3 | 0) && ((sel % 9) / 3 | 0) === (cc / 3 | 0)));
        const sameNum = selV && board[i] === selV;
        if (isSel) g.rect(x, y, CELL, CELL, alpha(P.a, 0.3));
        else if (sameNum) g.rect(x, y, CELL, CELL, alpha(P.c, 0.16));
        else if (sameRow) g.rect(x, y, CELL, CELL, alpha(P.a, 0.07));
      }

      c.save();
      c.strokeStyle = alpha(P.ink, 0.16); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= 9; i++) {
        c.moveTo(OX + i * CELL, OY); c.lineTo(OX + i * CELL, OY + CELL * 9);
        c.moveTo(OX, OY + i * CELL); c.lineTo(OX + CELL * 9, OY + i * CELL);
      }
      c.stroke();
      c.strokeStyle = alpha(P.a, 0.7); c.lineWidth = 2.4;
      c.beginPath();
      for (let i = 0; i <= 3; i++) {
        c.moveTo(OX + i * 3 * CELL, OY); c.lineTo(OX + i * 3 * CELL, OY + CELL * 9);
        c.moveTo(OX, OY + i * 3 * CELL); c.lineTo(OX + CELL * 9, OY + i * 3 * CELL);
      }
      c.stroke(); c.restore();

      for (let i = 0; i < 81; i++) {
        const r = (i / 9) | 0, cc = i % 9;
        const x = OX + cc * CELL + CELL / 2, y = OY + r * CELL;
        if (board[i]) {
          const fixed = !!puz[i];
          const bad = board[i] !== sol[i];
          g.text(String(board[i]), x, y + CELL * 0.72, {
            size: CELL * 0.6, align: 'center', weight: fixed ? 900 : 700,
            color: bad ? '#ff4d6d' : fixed ? P.ink : P.c,
          });
        } else if (notes[i].size) {
          notes[i].forEach((n) => {
            const nx = x - CELL / 2 + ((n - 1) % 3) * (CELL / 3) + CELL / 6;
            const ny = y + (((n - 1) / 3) | 0) * (CELL / 3) + CELL / 4;
            g.text(String(n), nx, ny, { size: CELL * 0.22, align: 'center', color: P.dim, weight: 700 });
          });
        }
      }

      /* teclado */
      const ky = OY + CELL * 9 + 24;
      for (let i = 0; i < 9; i++) {
        const x = OX + i * CELL;
        g.rrect(x + 2, ky, CELL - 4, 42, 8, 'rgba(255,255,255,.06)');
        g.text(String(i + 1), x + CELL / 2, ky + 29, { size: 20, align: 'center', weight: 800, color: P.ink });
      }
      g.rrect(W / 2 - 150, ky + 56, 140, 38, 10, noteMode ? P.a : 'rgba(255,255,255,.06)');
      g.text('✎ Notas', W / 2 - 80, ky + 81, { size: 15, align: 'center', weight: 800, color: noteMode ? '#0d1220' : P.dim });
      g.rrect(W / 2 + 10, ky + 56, 140, 38, 10, 'rgba(255,255,255,.06)');
      g.text('⌫ Borrar', W / 2 + 80, ky + 81, { size: 15, align: 'center', weight: 800, color: P.dim });

      E.floaters.draw(g);
    },
  };
});
