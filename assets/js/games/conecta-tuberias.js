/* Conecta Tuberías — gira los tramos hasta cerrar el circuito antes de que se acabe el tiempo. */
NX.game('conecta-tuberias', {
  w: 700, h: 700, pal: 'toxic',
  music: { root: 45, scale: 'dorian', bpm: 90, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  /* Cada celda guarda sus conexiones como bits: 1 arriba, 2 derecha, 4 abajo, 8 izquierda. */
  const DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];

  let N, grid, cell, OX, OY, level, moves, t, done, filled, srcs;

  function layout() {
    const s = Math.min(W - 60, H - 210);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2); OY = 130;
  }

  function generate() {
    /* Árbol de expansión aleatorio: garantiza que hay solución. */
    grid = [];
    for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) grid[r][c] = { b: 0, rot: 0, tr: 0, on: false }; }
    const visited = new Set(['0,0']);
    const stack = [[0, 0]];
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [];
      DIRS.forEach((d, i) => {
        const nr = r + d[1], nc = c + d[0];
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(nr + ',' + nc)) opts.push([nr, nc, d]);
      });
      if (!opts.length) { stack.pop(); continue; }
      const [nr, nc, d] = E.rng.pick(opts);
      grid[r][c].b |= d[2];
      grid[nr][nc].b |= d[3];
      visited.add(nr + ',' + nc);
      stack.push([nr, nc]);
    }
    /* desordena las rotaciones */
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const k = E.rng.int(4);
      for (let i = 0; i < k; i++) grid[r][c].b = rotBits(grid[r][c].b);
      grid[r][c].rot = grid[r][c].tr = 0;
    }
    srcs = [[0, 0]];
  }

  const rotBits = (b) => ((b << 1) | (b >> 3)) & 15;

  function reset(lv) {
    level = lv == null ? (level || 1) : lv;
    N = Math.min(9, 4 + Math.floor(level / 2));
    layout();
    generate();
    moves = 0; t = 0; done = false;
    flood();
    hud();
  }
  function hud() {
    E.api.hud({ Nivel: level, Giros: moves, Conectado: filled + '/' + (N * N), Tiempo: M.fmtTime(t) });
  }

  function flood() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c].on = false;
    const q = srcs.slice();
    grid[0][0].on = true;
    filled = 1;
    while (q.length) {
      const [r, c] = q.shift();
      DIRS.forEach((d) => {
        if (!(grid[r][c].b & d[2])) return;
        const nr = r + d[1], nc = c + d[0];
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
        if (grid[nr][nc].on) return;
        if (!(grid[nr][nc].b & d[3])) return;
        grid[nr][nc].on = true;
        filled++;
        q.push([nr, nc]);
      });
    }
    if (filled === N * N && !done) {
      done = true;
      E.sfx('win'); E.camera.kick(6);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        E.particles.burst(OX + c * cell + cell / 2, OY + r * cell + cell / 2, 2,
          { col: [P.a], speed1: 90, life1: 0.6, add: true });
      }
      setTimeout(() => {
        level++;
        E.api.win({
          score: Math.max(0, level * 1000 - moves * 10),
          title: 'Circuito cerrado',
          msg: 'Nivel ' + (level - 1) + ' con ' + moves + ' giros',
          stats: { Giros: moves, Tiempo: M.fmtTime(t) },
        });
      }, 700);
    }
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g2 = grid[r][c];
        g2.rot = M.damp(g2.rot, g2.tr, 20, dt);
      }
      const p = E.input.pointer;
      if (p.pressed && !done) {
        const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
        if (c >= 0 && c < N && r >= 0 && r < N) {
          const dir = E.input.rightDown ? -1 : 1;
          grid[r][c].b = dir > 0 ? rotBits(grid[r][c].b) : rotBits(rotBits(rotBits(grid[r][c].b)));
          grid[r][c].tr += dir * Math.PI / 2;
          moves++;
          E.sfx('tick');
          flood();
          hud();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('CONECTA TUBERÍAS', W / 2, 46, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });
      g.text('Gira cada tramo hasta que el agua llegue a todas las casillas', W / 2, 74,
        { size: 13, align: 'center', color: P.dim, weight: 600 });
      g.rrect(W / 2 - 130, 88, 260, 8, 4, 'rgba(255,255,255,.1)');
      g.rrect(W / 2 - 130, 88, 260 * (filled / (N * N)), 8, 4, P.a);

      g.rrect(OX - 8, OY - 8, cell * N + 16, cell * N + 16, 12, alpha(P.deep, 0.75));

      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const cel = grid[r][cc];
        const x = OX + cc * cell + cell / 2, y = OY + r * cell + cell / 2;
        g.rrect(x - cell / 2 + 2, y - cell / 2 + 2, cell - 4, cell - 4, 6,
          cel.on ? alpha(P.a, 0.1) : 'rgba(255,255,255,.03)');
        c.save();
        c.translate(x, y);
        c.rotate(cel.rot);
        c.lineCap = 'round';
        const col = cel.on ? P.a : alpha(P.dim, 0.65);
        const lw = cell * 0.19;
        /* dibuja en la orientación base y deja que la rotación lo lleve al sitio */
        let bits = cel.b;
        const back = Math.round(cel.rot / (Math.PI / 2));
        for (let i = 0; i < ((back % 4) + 4) % 4; i++) {
          bits = ((bits >> 1) | (bits << 3)) & 15;
        }
        const half = cell * 0.42;
        if (bits & 1) g.line(0, 0, 0, -half, col, lw);
        if (bits & 2) g.line(0, 0, half, 0, col, lw);
        if (bits & 4) g.line(0, 0, 0, half, col, lw);
        if (bits & 8) g.line(0, 0, -half, 0, col, lw);
        g.circle(0, 0, lw * 0.62, col);
        if (cel.on) { c.globalAlpha = 0.5; g.circle(0, 0, lw * 0.4, '#ffffff'); }
        c.restore();
        if (r === 0 && cc === 0) {
          g.ring(x, y, cell * 0.4, 3, P.c);
          g.circle(x, y, cell * 0.16, P.c);
        }
      }

      E.particles.draw(g);
      E.ui.hint('Clic para girar · clic derecho gira al revés', { bottom: 22 });
    },
  };
});
