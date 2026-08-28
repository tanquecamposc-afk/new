/* Rompecabezas Deslizante — el clásico 15 con imágenes generadas por código. */
NX.game('rompecabezas-deslizante', {
  w: 640, h: 700, pal: 'ocean',
  music: { root: 50, scale: 'major', bpm: 76, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const SIZES = [3, 4, 5];

  let N, tiles, blank, moves, t, done, cell, OX, OY, sizeIdx, art, anim, showArt;

  function layout() {
    const s = Math.min(W - 70, H - 230);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2);
    OY = 120;
  }

  /* Arte procedural que sirve de "foto" del rompecabezas. */
  function makeArt(seed) {
    const rng = new M.RNG(seed);
    const shapes = [];
    for (let i = 0; i < 18; i++) {
      shapes.push({
        x: rng.float(0, 1), y: rng.float(0, 1), r: rng.float(0.06, 0.3),
        c: [P.a, P.b, P.c, P.d, P.ink][rng.int(5)], k: rng.int(3), rot: rng.float(0, 6),
      });
    }
    return shapes;
  }

  function drawArt(g, x, y, size) {
    const c = g.ctx;
    c.save();
    c.beginPath(); c.rect(x, y, size, size); c.clip();
    c.fillStyle = g.linGrad(x, y, x + size, y + size, [[0, mix(P.d, P.deep, 0.2)], [1, mix(P.a, P.deep, 0.55)]]);
    c.fillRect(x, y, size, size);
    art.forEach((s) => {
      const sx = x + s.x * size, sy = y + s.y * size, sr = s.r * size;
      c.globalAlpha = 0.75;
      if (s.k === 0) g.circle(sx, sy, sr, s.c);
      else if (s.k === 1) g.ngon(sx, sy, sr, 6, s.rot, s.c);
      else g.star(sx, sy, sr, sr * 0.45, 5, s.rot, s.c);
    });
    c.globalAlpha = 1;
    c.restore();
  }

  function reset(si) {
    sizeIdx = si == null ? (sizeIdx == null ? 1 : sizeIdx) : si;
    N = SIZES[sizeIdx];
    layout();
    art = makeArt('nexo-' + Date.now());
    tiles = [];
    for (let i = 0; i < N * N; i++) tiles.push(i);
    blank = N * N - 1;
    /* barajado por movimientos legales: siempre resoluble */
    let last = -1;
    for (let i = 0; i < N * N * 60; i++) {
      const opts = neighbors(blank).filter((n) => n !== last);
      const pick = E.rng.pick(opts);
      last = blank;
      tiles[blank] = tiles[pick]; tiles[pick] = N * N - 1;
      blank = pick;
    }
    moves = 0; t = 0; done = false; anim = {}; showArt = 0;
    hud();
  }
  function hud() { E.api.hud({ Movimientos: moves, Tiempo: M.fmtTime(t), Tamaño: N + '×' + N }); }

  function neighbors(i) {
    const r = (i / N) | 0, c = i % N, out = [];
    if (r > 0) out.push(i - N);
    if (r < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1);
    if (c < N - 1) out.push(i + 1);
    return out;
  }

  function tryMove(i) {
    if (done) return;
    if (neighbors(blank).indexOf(i) < 0) return;
    tiles[blank] = tiles[i]; tiles[i] = N * N - 1;
    anim[tiles[blank]] = { x: (i % N) - (blank % N), y: ((i / N) | 0) - ((blank / N) | 0) };
    blank = i;
    moves++;
    E.sfx('slide');
    /* Polvillo en el borde por donde entra la pieza. */
    E.particles.burst(OX + (i % N) * cell + cell / 2, OY + ((i / N) | 0) * cell + cell / 2, 5,
      { col: [P.a, '#ffffff'], speed1: 80, life1: 0.3, r1: 2.4, add: true });
    hud();
    if (tiles.every((v, k) => v === k)) {
      done = true;
      E.sfx('win');
      E.camera.kick(12); E.camera.flash(P.a, 0.28);
      /* Recorre el tablero encendiendo cada pieza al resolver. */
      for (let k = 0; k < N * N; k++) {
        setTimeout(() => E.particles.burst(OX + (k % N) * cell + cell / 2, OY + ((k / N) | 0) * cell + cell / 2, 14,
          { col: [P.a, P.c, '#ffffff'], speed1: 200, life1: 0.7, add: true }), k * 45);
      }
      setTimeout(() => E.api.win({
        score: Math.max(0, 30000 - moves * 40 - Math.round(t * 20) + N * 4000),
        title: '¡Rompecabezas resuelto!',
        msg: moves + ' movimientos en ' + M.fmtTime(t),
        stats: { Movimientos: moves, Tiempo: M.fmtTime(t) },
      }), 500);
    }
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      for (const k in anim) {
        anim[k].x = M.damp(anim[k].x, 0, 22, dt);
        anim[k].y = M.damp(anim[k].y, 0, 22, dt);
      }
      if (showArt > 0) showArt -= dt;

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 58 && p.y < 92) {
          for (let i = 0; i < SIZES.length; i++) {
            const x = W / 2 - 150 + i * 100;
            if (p.x > x && p.x < x + 92) { reset(i); E.sfx('select'); return; }
          }
        }
        const by = OY + cell * N + 20;
        if (p.y > by && p.y < by + 40 && Math.abs(p.x - W / 2) < 90) { showArt = 1.6; E.sfx('open'); return; }
        const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
        if (c >= 0 && c < N && r >= 0 && r < N) tryMove(r * N + c);
      }
      if (E.input.pressed('left')) { const t2 = blank + 1; if (blank % N < N - 1) tryMove(t2); }
      if (E.input.pressed('right')) { const t2 = blank - 1; if (blank % N > 0) tryMove(t2); }
      if (E.input.pressed('up')) { const t2 = blank + N; if (t2 < N * N) tryMove(t2); }
      if (E.input.pressed('down')) { const t2 = blank - N; if (t2 >= 0) tryMove(t2); }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('ROMPECABEZAS', W / 2, 40, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      for (let i = 0; i < SIZES.length; i++) {
        const x = W / 2 - 150 + i * 100;
        const on = i === sizeIdx;
        g.rrect(x, 58, 92, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(SIZES[i] + '×' + SIZES[i], x + 46, 79, { size: 14, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      const S = cell * N;
      g.rrect(OX - 8, OY - 8, S + 16, S + 16, 12, alpha(P.deep, 0.8));

      if (showArt > 0 || done) {
        c.save();
        c.globalAlpha = done ? 1 : M.clamp01(showArt);
        drawArt(g, OX, OY, S);
        c.restore();
        if (done) {
          g.rrectStroke(OX, OY, S, S, 4, P.c, 3);
          E.ui.hint('¡Completado!', { bottom: 40 });
        }
      }
      if (!done) {
        for (let i = 0; i < N * N; i++) {
          const v = tiles[i];
          if (v === N * N - 1) continue;
          const a = anim[v] || { x: 0, y: 0 };
          const x = OX + (i % N + a.x) * cell, y = OY + (((i / N) | 0) + a.y) * cell;
          c.save();
          c.beginPath();
          g.rrectPath(x + 2, y + 2, cell - 4, cell - 4, 6); c.clip();
          c.translate(x - (v % N) * cell, y - (((v / N) | 0)) * cell);
          drawArt(g, OX, OY, S);
          c.restore();
          g.rrectStroke(x + 2, y + 2, cell - 4, cell - 4, 6, alpha('#000', 0.35), 1.5);
          g.text(String(v + 1), x + cell - 12, y + cell - 8,
            { size: 12, align: 'right', color: alpha('#ffffff', 0.55), weight: 800 });
        }
      }

      const by = OY + S + 20;
      const hov = E.input.pointer.y > by && E.input.pointer.y < by + 40 && Math.abs(E.input.pointer.x - W / 2) < 90;
      g.rrect(W / 2 - 90, by, 180, 40, 11, hov ? alpha(P.a, 0.3) : 'rgba(255,255,255,.06)');
      g.text('👁 Ver imagen', W / 2, by + 26, { size: 15, align: 'center', weight: 800, color: P.ink });

      E.ui.hint('Toca una pieza junto al hueco · o usa las flechas', { bottom: 20 });
    },
  };
});
