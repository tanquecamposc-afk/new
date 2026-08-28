/* Ciudad Cuadrícula — coloca edificios; cada uno puntúa según sus vecinos. */
NX.game('ciudad-cuadricula', {
  w: 840, h: 660, pal: 'ocean',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 8;
  const CELL = Math.floor(Math.min((W - 260) / N, (H - 200) / N));
  const OX = 40, OY = 130;

  const TYPES = [
    { id: 'casa', n: 'Casa', ico: '🏠', col: '#4ade80',
      d: '+1 por parque vecino, +1 por casa vecina' },
    { id: 'tienda', n: 'Comercio', ico: '🏬', col: '#22e0ff',
      d: '+2 por casa vecina' },
    { id: 'parque', n: 'Parque', ico: '🌳', col: '#a3e635',
      d: '+1 por cada vecino que no sea fábrica' },
    { id: 'fabrica', n: 'Fábrica', ico: '🏭', col: '#ff8a3d',
      d: '+3 fija, −2 por casa vecina' },
    { id: 'torre', n: 'Torre', ico: '🏢', col: '#c084fc',
      d: '+2 por comercio vecino' },
  ];

  let grid, hand, score, placed, over, sel, msg, msgT, anim;

  function reset() {
    grid = new Array(N * N).fill(null);
    hand = [];
    for (let i = 0; i < 3; i++) hand.push(E.rng.int(TYPES.length));
    score = 0; placed = 0; over = false; sel = 0; msg = ''; msgT = 0; anim = [];
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Edificios: placed + '/' + (N * N), Récord: M.fmtScore(E.api.best) }); }

  function neighbors(i) {
    const r = Math.floor(i / N), c = i % N;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([rr, cc]) => rr >= 0 && rr < N && cc >= 0 && cc < N)
      .map(([rr, cc]) => grid[rr * N + cc]);
  }

  function valueOf(t, i) {
    const nb = neighbors(i).filter(Boolean);
    const has = (id) => nb.filter((x) => x === id).length;
    switch (TYPES[t].id) {
      case 'casa': return 1 + has('parque') + has('casa');
      case 'tienda': return 1 + has('casa') * 2;
      case 'parque': return 1 + nb.filter((x) => x !== 'fabrica').length;
      case 'fabrica': return 3 - has('casa') * 2 + has('fabrica');
      case 'torre': return 1 + has('tienda') * 2;
    }
    return 0;
  }

  function place(i) {
    if (grid[i]) { E.sfx('error'); return; }
    const t = hand[sel];
    const v = valueOf(t, i);
    grid[i] = TYPES[t].id;
    score += v;
    placed++;
    anim.push({ i, t: 0, v });
    E.sfx(v > 3 ? 'coin' : 'place');
    E.floaters.add(OX + (i % N) * CELL + CELL / 2, OY + Math.floor(i / N) * CELL,
      (v >= 0 ? '+' : '') + v, { col: v >= 0 ? P.c : '#ff4d6d', size: 16 + Math.min(12, Math.abs(v) * 2) });
    hand[sel] = E.rng.int(TYPES.length);
    hud();
    if (placed >= N * N) {
      over = true;
      E.sfx('win');
      setTimeout(() => E.api.win({
        score, title: '¡Ciudad completa!', msg: 'Has llenado la cuadrícula',
        stats: { Puntos: score },
      }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      anim.forEach((a) => { a.t += dt * 3; });
      for (let i = anim.length - 1; i >= 0; i--) if (anim[i].t > 1) anim.splice(i, 1);
      if (over) return;

      for (let i = 1; i <= 3; i++) if (E.input.pressed(String(i))) { sel = i - 1; E.sfx('tick'); }
      const p = E.input.pointer;
      if (p.pressed) {
        const hx = W - 210;
        for (let i = 0; i < 3; i++) {
          const y = 180 + i * 96;
          if (p.x > hx && p.x < hx + 180 && p.y > y && p.y < y + 84) { sel = i; E.sfx('tick'); return; }
        }
        const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < N && r >= 0 && r < N) place(r * N + c);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 17);
      g.text('CIUDAD CUADRÍCULA', OX, 52, { size: 21, weight: 900, color: P.ink, letterSpacing: 2 });
      g.text('Cada edificio puntúa según lo que tenga al lado', OX, 78,
        { size: 13, color: P.dim, weight: 600 });

      g.rrect(OX - 8, OY - 8, CELL * N + 16, CELL * N + 16, 12, alpha(P.deep, 0.7));
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const i = r * N + cc;
        const x = OX + cc * CELL, y = OY + r * CELL;
        g.rect(x + 1, y + 1, CELL - 2, CELL - 2, (r + cc) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)');
        const v = grid[i];
        if (!v) continue;
        const T = TYPES.find((q) => q.id === v);
        const a = anim.find((q) => q.i === i);
        const s = a ? 1 + (1 - a.t) * 0.25 : 1;
        g.push(x + CELL / 2, y + CELL / 2, 0, s);
        g.rrect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 7, alpha(T.col, 0.75));
        g.text(T.ico, 0, CELL * 0.16, { size: CELL * 0.5, align: 'center' });
        g.pop();
      }

      /* previsualización */
      const p = E.input.pointer;
      const pc = Math.floor((p.x - OX) / CELL), pr = Math.floor((p.y - OY) / CELL);
      if (!over && pc >= 0 && pc < N && pr >= 0 && pr < N && !grid[pr * N + pc]) {
        const i = pr * N + pc;
        const v = valueOf(hand[sel], i);
        const T = TYPES[hand[sel]];
        c.save(); c.globalAlpha = 0.5;
        g.rrect(OX + pc * CELL + 3, OY + pr * CELL + 3, CELL - 6, CELL - 6, 7, T.col);
        c.restore();
        g.rrectStroke(OX + pc * CELL + 3, OY + pr * CELL + 3, CELL - 6, CELL - 6, 7, T.col, 2);
        g.text((v >= 0 ? '+' : '') + v, OX + pc * CELL + CELL / 2, OY + pr * CELL - 6,
          { size: 15, align: 'center', weight: 900, color: v >= 0 ? P.c : '#ff4d6d' });
      }

      /* mano */
      const hx = W - 210;
      g.text('TU MANO', hx, 158, { size: 12, color: P.dim, weight: 800, letterSpacing: 2 });
      hand.forEach((t, i) => {
        const y = 180 + i * 96;
        const T = TYPES[t];
        const on = sel === i;
        g.rrect(hx, y, 180, 84, 12, on ? alpha(T.col, 0.3) : 'rgba(255,255,255,.05)');
        g.rrectStroke(hx, y, 180, 84, 12, on ? T.col : alpha(P.ink, 0.1), on ? 2.5 : 1);
        g.text(T.ico, hx + 32, y + 50, { size: 30, align: 'center' });
        g.text(T.n, hx + 58, y + 30, { size: 15, weight: 800, color: P.ink });
        g.wrapText(T.d, hx + 58, y + 48, 112, 14, { size: 11, color: P.dim, weight: 600 });
        g.text('[' + (i + 1) + ']', hx + 168, y + 20, { size: 10, align: 'right', color: P.dim, weight: 800 });
      });

      g.text('PUNTOS', hx, 500, { size: 12, color: P.dim, weight: 800, letterSpacing: 2 });
      g.text(M.fmtScore(score), hx, 542, { size: 36, weight: 900, color: P.c, mono: true });

      E.floaters.draw(g);
      E.ui.hint('Elige un edificio (1-3) y colócalo en la cuadrícula', { bottom: 16 });
    },
  };
});
