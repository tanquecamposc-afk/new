/* Bloques Caídos — piezas que caen, pieza guardada, vista previa y giro con retroceso. */
NX.game('bloques-caidos', {
  w: 620, h: 700, pal: 'neon',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'CAÍDA' }, { k: 'c', label: 'GUARDAR' }] },
  music: { root: 45, scale: 'minor', bpm: 122, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = 10, ROWS = 20;
  const CELL = Math.floor(Math.min((W - 200) / COLS, (H - 90) / ROWS));
  const OX = 34, OY = 50;

  const SHAPES = {
    I: { c: '#22e0ff', r: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]] },
    J: { c: '#5b8cff', r: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]] },
    L: { c: '#ff8a3d', r: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]] },
    O: { c: '#ffd45e', r: [[[1,0],[2,0],[1,1],[2,1]]] },
    S: { c: '#4ade80', r: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]] },
    T: { c: '#b45cff', r: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]] },
    Z: { c: '#ff4d6d', r: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]] },
  };
  const KEYS = Object.keys(SHAPES);

  let board, cur, next, hold, canHold, score, lines, level, drop, dropT, alive, bag, clearing, clearT, combo;

  function newBag() { bag = E.rng.shuffle(KEYS.slice()); }
  function pull() { if (!bag || !bag.length) newBag(); return bag.pop(); }

  function spawn(k) {
    cur = { k: k || pull(), rot: 0, x: 3, y: -1 };
    canHold = true;
    if (collide(cur.x, cur.y, cur.rot)) {
      alive = false;
      E.sfx('lose');
      setTimeout(() => E.api.over({ score, msg: lines + ' líneas · nivel ' + level, stats: { Líneas: lines, Nivel: level } }), 500);
    }
  }

  function reset() {
    board = [];
    for (let r = 0; r < ROWS; r++) { board.push([]); for (let c = 0; c < COLS; c++) board[r][c] = null; }
    score = 0; lines = 0; level = 1; dropT = 0; alive = true; hold = null; canHold = true;
    clearing = null; clearT = 0; combo = 0;
    newBag();
    next = pull();
    spawn();
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Líneas: lines, Nivel: level }); }

  const cells = (k, rot) => SHAPES[k].r[rot % SHAPES[k].r.length];

  function collide(x, y, rot) {
    return cells(cur.k, rot).some(([cx, cy]) => {
      const nx = x + cx, ny = y + cy;
      return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
    });
  }

  function rotate(dir) {
    const nr = (cur.rot + dir + 4) % 4;
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collide(cur.x + k, cur.y, nr)) { cur.x += k; cur.rot = nr; E.sfx('tap'); return; }
    }
  }

  function lock() {
    cells(cur.k, cur.rot).forEach(([cx, cy]) => {
      const ny = cur.y + cy;
      if (ny >= 0) board[ny][cur.x + cx] = SHAPES[cur.k].c;
    });
    E.sfx('place');
    const full = [];
    for (let r = 0; r < ROWS; r++) if (board[r].every((v) => v)) full.push(r);
    if (full.length) {
      clearing = full; clearT = 0.3;
      const pts = [0, 100, 300, 500, 800][full.length] * level;
      combo++;
      score += pts + (combo > 1 ? combo * 50 : 0);
      lines += full.length;
      level = 1 + Math.floor(lines / 10);
      E.sfx('clearline');
      E.camera.kick(full.length * 3);
      full.forEach((r) => {
        for (let c = 0; c < COLS; c++) {
          E.particles.burst(OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2, 3,
            { col: [board[r][c]], speed1: 140, life1: 0.5, add: true });
        }
      });
      E.floaters.add(OX + COLS * CELL / 2, OY + full[0] * CELL, ['', 'SIMPLE', 'DOBLE', 'TRIPLE', '¡CUÁDRUPLE!'][full.length],
        { col: P.c, size: 20 + full.length * 4 });
      hud();
    } else { combo = 0; spawn(next); next = pull(); }
  }

  function finishClear() {
    clearing.sort((a, b) => a - b).forEach((r) => {
      board.splice(r, 1);
      const row = []; for (let c = 0; c < COLS; c++) row.push(null);
      board.unshift(row);
    });
    clearing = null;
    spawn(next); next = pull();
  }

  function hardDrop() {
    let d = 0;
    while (!collide(cur.x, cur.y + d + 1, cur.rot)) d++;
    cur.y += d;
    score += d * 2;
    E.sfx('drop'); E.camera.kick(4);
    lock();
    hud();
  }

  function holdPiece() {
    if (!canHold) return;
    const k = cur.k;
    if (hold) { spawn(hold); } else { spawn(next); next = pull(); }
    hold = k; canHold = false;
    E.sfx('swoosh');
  }

  function ghostY() {
    let d = 0;
    while (!collide(cur.x, cur.y + d + 1, cur.rot)) d++;
    return cur.y + d;
  }

  reset();

  return {
    update(dt) {
      if (clearing) { clearT -= dt; if (clearT <= 0) finishClear(); return; }
      if (!alive) return;

      if (E.input.pressed('left') && !collide(cur.x - 1, cur.y, cur.rot)) { cur.x--; E.sfx('tick'); }
      if (E.input.pressed('right') && !collide(cur.x + 1, cur.y, cur.rot)) { cur.x++; E.sfx('tick'); }
      if (E.input.pressed('up') || E.input.pressed('x')) rotate(1);
      if (E.input.pressed('z')) rotate(-1);
      if (E.input.pressed('space')) return hardDrop();
      if (E.input.pressed('c') || E.input.pressed('shift')) holdPiece();
      const sw = E.input.swipe;
      if (sw) {
        if (sw.dir === 'left' && !collide(cur.x - 1, cur.y, cur.rot)) cur.x--;
        else if (sw.dir === 'right' && !collide(cur.x + 1, cur.y, cur.rot)) cur.x++;
        else if (sw.dir === 'down') return hardDrop();
        else rotate(1);
      }

      const soft = E.input.down('down');
      const speed = Math.max(0.06, 0.8 - (level - 1) * 0.06);
      dropT += dt * (soft ? 12 : 1);
      if (dropT >= speed) {
        dropT = 0;
        if (!collide(cur.x, cur.y + 1, cur.rot)) { cur.y++; if (soft) score++; }
        else lock();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.25), P.deep);
      const BW = COLS * CELL, BH = ROWS * CELL;

      g.rrect(OX - 8, OY - 8, BW + 16, BH + 16, 10, alpha(P.deep, 0.8));
      g.rrectStroke(OX - 8, OY - 8, BW + 16, BH + 16, 10, alpha(P.a, 0.28), 2);
      c.save();
      c.strokeStyle = alpha(P.a, 0.06); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= COLS; i++) { c.moveTo(OX + i * CELL, OY); c.lineTo(OX + i * CELL, OY + BH); }
      for (let j = 0; j <= ROWS; j++) { c.moveTo(OX, OY + j * CELL); c.lineTo(OX + BW, OY + j * CELL); }
      c.stroke(); c.restore();

      const drawCell = (cx, cy, col, ghost) => {
        const x = OX + cx * CELL, y = OY + cy * CELL;
        if (ghost) { g.rrectStroke(x + 2, y + 2, CELL - 4, CELL - 4, 4, alpha(col, 0.4), 2); return; }
        g.rrect(x + 1, y + 1, CELL - 2, CELL - 2, 4, col);
        g.rrect(x + 1, y + 1, CELL - 2, (CELL - 2) * 0.35, 4, alpha('#ffffff', 0.22));
      };

      for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
        if (board[r][cc]) {
          const flash = clearing && clearing.indexOf(r) >= 0;
          drawCell(cc, r, flash ? '#ffffff' : board[r][cc]);
        }
      }

      if (alive && !clearing) {
        const gy = ghostY();
        cells(cur.k, cur.rot).forEach(([cx, cy]) => {
          if (gy + cy >= 0) drawCell(cur.x + cx, gy + cy, SHAPES[cur.k].c, true);
        });
        cells(cur.k, cur.rot).forEach(([cx, cy]) => {
          if (cur.y + cy >= 0) drawCell(cur.x + cx, cur.y + cy, SHAPES[cur.k].c);
        });
      }

      /* paneles laterales */
      const px = OX + BW + 22;
      const panel = (title, y, k) => {
        g.rrect(px, y, 128, 104, 10, alpha(P.deep, 0.7));
        g.text(title, px + 64, y + 22, { size: 12, align: 'center', color: P.dim, weight: 800, letterSpacing: 1.6 });
        if (!k) return;
        const cs = SHAPES[k].r[0];
        const minX = Math.min(...cs.map((q) => q[0])), maxX = Math.max(...cs.map((q) => q[0]));
        const minY = Math.min(...cs.map((q) => q[1])), maxY = Math.max(...cs.map((q) => q[1]));
        const s = 18;
        const ox = px + 64 - ((maxX - minX + 1) * s) / 2 - minX * s;
        const oy = y + 62 - ((maxY - minY + 1) * s) / 2 - minY * s;
        cs.forEach(([cx, cy]) => {
          g.rrect(ox + cx * s + 1, oy + cy * s + 1, s - 2, s - 2, 3, SHAPES[k].c);
        });
      };
      panel('SIGUIENTE', OY, next);
      panel('GUARDADA', OY + 120, hold);

      g.rrect(px, OY + 244, 128, 84, 10, alpha(P.deep, 0.7));
      g.text('NIVEL', px + 64, OY + 268, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 1.6 });
      g.text(String(level), px + 64, OY + 300, { size: 30, align: 'center', color: P.c, weight: 900, mono: true });

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('↑/X girar · Z girar al revés · Espacio caída · C guardar', { bottom: 16 });
    },
  };
});
