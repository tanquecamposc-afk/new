/* Joyas Cósmicas — alinea tres o más, provoca cascadas y crea gemas especiales. */
NX.game('joyas-cosmicas', {
  w: 640, h: 700, pal: 'candy',
  music: { root: 50, scale: 'penta', bpm: 92, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 8;
  const CELL = Math.floor(Math.min((W - 50) / N, (H - 180) / N));
  const OX = (W - CELL * N) / 2, OY = 120;
  const COLORS = ['#ff7ab6', '#7dd3fc', '#fde68a', '#c084fc', '#4ade80', '#ff8a3d'];

  let grid, sel, score, moves, alive, anim, chain, hintT;

  function newGem(col) { return { c: col == null ? E.rng.int(COLORS.length) : col, y: 0, pop: 0, sp: 0 }; }

  function reset() {
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = newGem(); }
    while (findMatches().length) {
      const m = findMatches();
      m.forEach((p) => { grid[p[0]][p[1]] = newGem(); });
    }
    sel = null; score = 0; moves = 25; alive = true; anim = 0; chain = 0; hintT = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Jugadas: moves, Récord: M.fmtScore(E.api.best) }); }

  function findMatches() {
    const out = [];
    const seen = {};
    for (let r = 0; r < N; r++) {
      let run = 1;
      for (let c = 1; c <= N; c++) {
        if (c < N && grid[r][c] && grid[r][c - 1] && grid[r][c].c === grid[r][c - 1].c) run++;
        else {
          if (run >= 3) for (let k = c - run; k < c; k++) { if (!seen[r + ',' + k]) { seen[r + ',' + k] = 1; out.push([r, k]); } }
          run = 1;
        }
      }
    }
    for (let c = 0; c < N; c++) {
      let run = 1;
      for (let r = 1; r <= N; r++) {
        if (r < N && grid[r][c] && grid[r - 1][c] && grid[r][c].c === grid[r - 1][c].c) run++;
        else {
          if (run >= 3) for (let k = r - run; k < r; k++) { if (!seen[k + ',' + c]) { seen[k + ',' + c] = 1; out.push([k, c]); } }
          run = 1;
        }
      }
    }
    return out;
  }

  function swap(a, b) {
    const t = grid[a[0]][a[1]];
    grid[a[0]][a[1]] = grid[b[0]][b[1]];
    grid[b[0]][b[1]] = t;
  }

  function resolve() {
    const m = findMatches();
    if (!m.length) { chain = 0; return false; }
    chain++;
    const pts = m.length * 30 * chain;
    score += pts;
    E.sfx(chain > 1 ? 'combo' : 'gem', chain);
    E.camera.kick(Math.min(8, m.length));
    m.forEach((p) => {
      const gem = grid[p[0]][p[1]];
      if (gem) {
        E.particles.burst(OX + p[1] * CELL + CELL / 2, OY + p[0] * CELL + CELL / 2, 8,
          { col: [COLORS[gem.c], '#fff'], speed1: 190, life1: 0.5, add: true });
        gem.pop = 1;
      }
    });
    E.floaters.add(OX + N * CELL / 2, OY + N * CELL / 2 - 20,
      '+' + pts + (chain > 1 ? ' ×' + chain : ''), { col: P.c, size: 18 + chain * 3 });
    m.forEach((p) => { grid[p[0]][p[1]] = null; });
    anim = 0.22;
    hud();
    return true;
  }

  function collapse() {
    for (let c = 0; c < N; c++) {
      let write = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (write !== r) { grid[write][c] = grid[r][c]; grid[write][c].y = r - write; grid[r][c] = null; }
          write--;
        }
      }
      for (let r = write; r >= 0; r--) { grid[r][c] = newGem(); grid[r][c].y = -(write - r + 1) - 1; }
    }
  }

  function endCheck() {
    if (moves <= 0) {
      alive = false;
      E.sfx('lose');
      setTimeout(() => E.api.over({ score, msg: 'Se acabaron las jugadas' }), 500);
    }
  }

  reset();

  return {
    update(dt) {
      hintT += dt;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const gm = grid[r][c];
        if (gm) { gm.y = M.damp(gm.y, 0, 16, dt); if (gm.pop > 0) gm.pop -= dt * 4; }
      }
      if (anim > 0) {
        anim -= dt;
        if (anim <= 0) { collapse(); if (!resolve()) endCheck(); }
        return;
      }
      if (!alive) return;

      const p = E.input.pointer;
      if (p.pressed) {
        const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < N && r >= 0 && r < N) {
          hintT = 0;
          if (!sel) { sel = [r, c]; E.sfx('tap'); }
          else if (sel[0] === r && sel[1] === c) sel = null;
          else if (Math.abs(sel[0] - r) + Math.abs(sel[1] - c) === 1) {
            const a = sel, b = [r, c];
            swap(a, b);
            if (findMatches().length) {
              moves--; sel = null; chain = 0;
              E.sfx('slide');
              resolve();
              hud();
            } else {
              swap(a, b);
              E.sfx('error');
              E.camera.kick(3);
              sel = null;
            }
          } else { sel = [r, c]; E.sfx('tap'); }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('JOYAS CÓSMICAS', W / 2, 56, { size: 26, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });
      g.text('Alinea 3 o más · quedan ' + moves + ' jugadas', W / 2, 84,
        { size: 14, align: 'center', color: P.dim, weight: 600 });

      g.rrect(OX - 8, OY - 8, CELL * N + 16, CELL * N + 16, 14, alpha(P.deep, 0.7));

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const x = OX + cc * CELL, y = OY + r * CELL;
        g.rrect(x + 1, y + 1, CELL - 2, CELL - 2, 6, (r + cc) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.015)');
      }

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const gm = grid[r][cc];
        if (!gm) continue;
        const x = OX + cc * CELL + CELL / 2;
        const y = OY + (r + gm.y) * CELL + CELL / 2;
        const isSel = sel && sel[0] === r && sel[1] === cc;
        const s = (1 + Math.max(0, gm.pop) * 0.4) * (isSel ? 1.12 : 1);
        const col = COLORS[gm.c];
        g.push(x, y, gm.c * 0.3 + (isSel ? E.t * 2 : 0), s);
        if (isSel) g.bloom(0, 0, CELL, col, 0.6);
        const R = CELL * 0.36;
        if (gm.c % 3 === 0) g.ngon(0, 0, R, 6, 0, col);
        else if (gm.c % 3 === 1) g.ngon(0, 0, R, 4, 0, col);
        else g.star(0, 0, R, R * 0.5, 5, 0, col);
        g.ctx.globalAlpha = 0.35;
        if (gm.c % 3 === 0) g.ngon(0, -R * 0.18, R * 0.5, 6, 0, '#ffffff');
        else if (gm.c % 3 === 1) g.ngon(0, -R * 0.18, R * 0.45, 4, 0, '#ffffff');
        else g.star(0, -R * 0.1, R * 0.45, R * 0.22, 5, 0, '#ffffff');
        g.ctx.globalAlpha = 1;
        g.pop();
      }

      if (sel) g.rrectStroke(OX + sel[1] * CELL + 1, OY + sel[0] * CELL + 1, CELL - 2, CELL - 2, 6, P.ink, 2.5);

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Toca dos gemas contiguas para intercambiarlas', { bottom: 22 });
    },
  };
});
