/* 2048 Nébula — fusiona potencias de dos hasta llegar a la ficha 2048. */
NX.game('2048-nebula', {
  w: 620, h: 700, pal: 'royal',
  controls: { dpad: true },
  music: { root: 48, scale: 'lydian', bpm: 84, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 4, PAD = 12;
  /* Deja hueco abajo para el botón de deshacer y la ayuda: antes se
     montaban uno encima del otro. */
  const SIZE = Math.min(W - 60, H - 250);
  const CELL = (SIZE - PAD * (N + 1)) / N;
  const OX = (W - SIZE) / 2, OY = 130;

  const COLORS = {
    2: '#3c4a7a', 4: '#4a5fa0', 8: '#6d5cff', 16: '#8b5cf6', 32: '#b45cff',
    64: '#e05cff', 128: '#ff5cc8', 256: '#ff5c8a', 512: '#ff8a3d',
    1024: '#ffb703', 2048: '#ffd45e', 4096: '#4ade80', 8192: '#22e0ff',
  };

  let grid, tiles, score, best, alive, won, history, moved, animT;

  function reset() {
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = 0; }
    tiles = []; score = 0; alive = true; won = false; history = []; animT = 0;
    addTile(); addTile();
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Récord: M.fmtScore(Math.max(E.api.best, score)), Fichas: tiles.length }); }

  function addTile() {
    const free = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = E.rng.pick(free);
    const v = E.rng.bool(0.9) ? 2 : 4;
    grid[r][c] = v;
    tiles.push({ r, c, v, x: c, y: r, pop: 0, born: 1 });
  }

  function tileAt(r, c) { return tiles.find((t) => t.r === r && t.c === c && !t.dead); }

  function snapshot() {
    history.push({
      grid: grid.map((row) => row.slice()), score,
      tiles: tiles.map((t) => ({ r: t.r, c: t.c, v: t.v })),
    });
    if (history.length > 12) history.shift();
  }

  function undo() {
    if (!history.length) return;
    const h = history.pop();
    grid = h.grid.map((r) => r.slice());
    score = h.score;
    tiles = h.tiles.map((t) => ({ r: t.r, c: t.c, v: t.v, x: t.c, y: t.r, pop: 0, born: 0 }));
    alive = true;
    E.sfx('close');
    hud();
  }

  function move(dr, dc) {
    snapshot();
    moved = false;
    const order = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
    if (dr > 0) order.sort((a, b) => b[0] - a[0]);
    if (dc > 0) order.sort((a, b) => b[1] - a[1]);
    const merged = {};
    order.forEach(([r, c]) => {
      if (!grid[r][c]) return;
      let nr = r, nc = c;
      while (true) {
        const tr = nr + dr, tc = nc + dc;
        if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
        if (!grid[tr][tc]) { nr = tr; nc = tc; }
        else if (grid[tr][tc] === grid[nr][nc] && !merged[tr + ',' + tc]) {
          nr = tr; nc = tc; merged[nr + ',' + nc] = true;
          break;
        } else break;
      }
      if (nr !== r || nc !== c) {
        moved = true;
        const t = tileAt(r, c);
        const target = tileAt(nr, nc);
        if (target && grid[nr][nc] === grid[r][c] && merged[nr + ',' + nc]) {
          grid[nr][nc] *= 2;
          grid[r][c] = 0;
          score += grid[nr][nc];
          if (t) { t.r = nr; t.c = nc; t.dead = true; }
          target.v = grid[nr][nc];
          target.pop = 1;
          if (grid[nr][nc] === 2048 && !won) {
            won = true;
            E.sfx('win');
            setTimeout(() => E.api.win({ score, title: '¡2048!', msg: 'Puedes seguir jugando para superar tu marca.' }), 400);
          }
        } else {
          grid[nr][nc] = grid[r][c];
          grid[r][c] = 0;
          if (t) { t.r = nr; t.c = nc; }
        }
      }
    });

    if (moved) {
      E.sfx('slide');
      animT = 0.12;
      setTimeout(() => {
        tiles = tiles.filter((t) => !t.dead);
        addTile();
        hud();
        if (!canMove()) {
          alive = false;
          E.sfx('lose');
          setTimeout(() => E.api.over({ score, msg: 'Sin movimientos posibles', stats: { 'Ficha mayor': maxTile() } }), 500);
        }
      }, 130);
    } else history.pop();
  }

  function maxTile() { let m = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) m = Math.max(m, grid[r][c]); return m; }
  function canMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!grid[r][c]) return true;
      if (c + 1 < N && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < N && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
  }

  reset();

  return {
    update(dt) {
      if (animT > 0) animT -= dt;
      tiles.forEach((t) => {
        t.x = M.damp(t.x, t.c, 22, dt);
        t.y = M.damp(t.y, t.r, 22, dt);
        if (t.pop > 0) t.pop -= dt * 5;
        if (t.born > 0) t.born -= dt * 6;
      });
      if (!alive) return;
      if (E.input.pressed('left')) move(0, -1);
      else if (E.input.pressed('right')) move(0, 1);
      else if (E.input.pressed('up')) move(-1, 0);
      else if (E.input.pressed('down')) move(1, 0);
      else if (E.input.pressed('z')) undo();
      const sw = E.input.swipe;
      if (sw) {
        if (sw.dir === 'left') move(0, -1);
        else if (sw.dir === 'right') move(0, 1);
        else if (sw.dir === 'up') move(-1, 0);
        else move(1, 0);
      }
      const p = E.input.pointer;
      if (p.released && p.y > OY + SIZE + 10 && p.y < OY + SIZE + 56 && Math.abs(p.x - W / 2) < 70) undo();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('2048', W / 2, 60, { size: 44, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });
      g.text('NÉBULA', W / 2, 84, { size: 14, align: 'center', weight: 800, color: P.a, letterSpacing: 8 });

      g.rrect(OX, OY, SIZE, SIZE, 14, alpha(P.deep, 0.75));
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        g.rrect(OX + PAD + cc * (CELL + PAD), OY + PAD + r * (CELL + PAD), CELL, CELL, 9, 'rgba(255,255,255,.045)');
      }

      tiles.forEach((t) => {
        const x = OX + PAD + t.x * (CELL + PAD);
        const y = OY + PAD + t.y * (CELL + PAD);
        const s = 1 + Math.max(0, t.pop) * 0.14 - Math.max(0, t.born) * 0.35;
        const col = COLORS[t.v] || '#22e0ff';
        g.push(x + CELL / 2, y + CELL / 2, 0, s);
        if (t.v >= 128) g.bloom(0, 0, CELL * 0.8, col, 0.35);
        g.rrect(-CELL / 2, -CELL / 2, CELL, CELL, 9, col);
        g.rrect(-CELL / 2, -CELL / 2, CELL, CELL * 0.34, 9, alpha('#ffffff', 0.16));
        const digits = String(t.v).length;
        g.text(String(t.v), 0, CELL * 0.13, {
          size: CELL * (digits > 3 ? 0.3 : digits > 2 ? 0.36 : 0.44),
          align: 'center', weight: 900, color: t.v <= 4 ? alpha('#ffffff', 0.9) : '#0d1220',
        });
        g.pop();
      });

      const by = OY + SIZE + 16;
      const hov = E.input.pointer.y > by && E.input.pointer.y < by + 42 && Math.abs(E.input.pointer.x - W / 2) < 70;
      g.rrect(W / 2 - 70, by, 140, 42, 12, hov ? alpha(P.a, 0.3) : 'rgba(255,255,255,.07)');
      g.rrectStroke(W / 2 - 70, by, 140, 42, 12, alpha(P.a, 0.4), 1.5);
      g.text('↶ Deshacer', W / 2, by + 27, { size: 16, align: 'center', weight: 800, color: P.ink });

      E.ui.hint('Flechas o desliza · Z para deshacer', { bottom: 16 });
    },
  };
});
