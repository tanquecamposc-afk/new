/* Cadena Numérica — une números contiguos que sumen el objetivo. */
NX.game('cadena-numerica', {
  w: 640, h: 720, pal: 'toxic',
  music: { root: 47, scale: 'penta', bpm: 96, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 6;
  const cell = Math.floor(Math.min((W - 60) / N, (H - 260) / N));
  const OX = Math.round((W - cell * N) / 2), OY = 170;

  let grid, chain, target, score, timeLeft, alive, combo, best;

  function reset() {
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = { v: E.rng.range(1, 9), y: 0, pop: 0 }; }
    chain = []; score = 0; timeLeft = 90; alive = true; combo = 0; best = 0;
    newTarget();
    hud();
  }
  function newTarget() { target = E.rng.range(8, 20); }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Objetivo: target, Suma: sum(), Tiempo: Math.ceil(timeLeft) });
  }
  function sum() { return chain.reduce((a, p) => a + grid[p[0]][p[1]].v, 0); }

  function adjacent(a, b) {
    return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && !(a[0] === b[0] && a[1] === b[1]);
  }

  function commit() {
    const s = sum();
    if (s === target && chain.length >= 2) {
      combo++;
      best = Math.max(best, chain.length);
      const pts = chain.length * chain.length * 20 * Math.min(5, combo);
      score += pts;
      timeLeft = Math.min(120, timeLeft + chain.length * 1.4);
      E.sfx('combo', combo);
      E.camera.kick(3);
      chain.forEach((p) => {
        E.particles.burst(OX + p[1] * cell + cell / 2, OY + p[0] * cell + cell / 2, 6,
          { col: [P.a, P.c], speed1: 160, add: true });
        grid[p[0]][p[1]] = null;
      });
      E.floaters.add(W / 2, OY + cell * N / 2, '+' + pts + (combo > 1 ? ' ×' + combo : ''), { col: P.c, size: 22 });
      collapse();
      newTarget();
    } else if (chain.length) {
      combo = 0;
      E.sfx('error');
    }
    chain = [];
    hud();
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
      for (let r = write; r >= 0; r--) {
        grid[r][c] = { v: E.rng.range(1, 9), y: -(write - r + 1) - 1, pop: 0 };
      }
    }
  }

  reset();

  return {
    update(dt) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g2 = grid[r][c];
        if (g2) g2.y = M.damp(g2.y, 0, 16, dt);
      }
      if (!alive) return;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'Cadena más larga: ' + best, stats: { 'Mejor cadena': best } }), 500);
        return;
      }

      const p = E.input.pointer;
      const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
      const inside = c >= 0 && c < N && r >= 0 && r < N && grid[r][c];

      if (p.pressed && inside) { chain = [[r, c]]; E.sfx('tick'); }
      else if (p.down && inside && chain.length) {
        const last = chain[chain.length - 1];
        const back = chain.length > 1 && chain[chain.length - 2][0] === r && chain[chain.length - 2][1] === c;
        if (back) { chain.pop(); E.sfx('tick'); }
        else if (!chain.some((q) => q[0] === r && q[1] === c) && adjacent(last, [r, c])) {
          chain.push([r, c]);
          E.sfx('blip', chain.length);
          if (sum() > target) { /* aviso visual, no se corta */ }
        }
        hud();
      }
      if (p.released && chain.length) commit();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('CADENA NUMÉRICA', W / 2, 46, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });

      const s = sum();
      const okColor = s === target ? '#4ade80' : s > target ? '#ff4d6d' : P.ink;
      g.rrect(W / 2 - 130, 72, 260, 66, 14, alpha(P.deep, 0.7));
      g.text('OBJETIVO', W / 2, 92, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 2 });
      g.text(String(target), W / 2 - 50, 128, { size: 34, align: 'center', weight: 900, color: P.c, mono: true });
      g.text('→', W / 2, 124, { size: 20, align: 'center', color: P.dim });
      g.text(String(s), W / 2 + 50, 128, { size: 34, align: 'center', weight: 900, color: okColor, mono: true });

      g.rrect(OX - 8, OY - 8, cell * N + 16, cell * N + 16, 12, alpha(P.deep, 0.75));

      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      if (chain.length > 1) {
        const pts = [];
        chain.forEach((q) => pts.push(OX + q[1] * cell + cell / 2, OY + q[0] * cell + cell / 2));
        g.polyStroke(pts, alpha(okColor, 0.5), cell * 0.3);
      }
      c.restore();

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const g2 = grid[r][cc];
        if (!g2) continue;
        const x = OX + cc * cell + cell / 2, y = OY + (r + g2.y) * cell + cell / 2;
        const inChain = chain.some((q) => q[0] === r && q[1] === cc);
        const col = inChain ? okColor : mix(P.d, P.a, (g2.v - 1) / 8);
        g.circle(x, y, cell * 0.38, col);
        g.circle(x - cell * 0.1, y - cell * 0.12, cell * 0.12, alpha('#ffffff', 0.25));
        g.text(String(g2.v), x, y + cell * 0.14, {
          size: cell * 0.42, align: 'center', weight: 900, color: inChain ? '#0d1220' : P.ink,
        });
      }

      g.rrect(W / 2 - 140, H - 62, 280, 10, 5, 'rgba(255,255,255,.12)');
      g.rrect(W / 2 - 140, H - 62, 280 * M.clamp01(timeLeft / 90), 10, 5, timeLeft > 20 ? P.a : '#ff4d6d');

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Arrastra sobre números contiguos hasta sumar el objetivo', { bottom: 24 });
    },
  };
});
