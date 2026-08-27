/* Flujo de Color — une cada par del mismo color sin cruzar caminos y llenando el tablero. */
NX.game('flujo-de-color', {
  w: 660, h: 700, pal: 'candy',
  music: { root: 50, scale: 'penta', bpm: 72, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLORS = ['#ff4d6d', '#22e0ff', '#ffd45e', '#4ade80', '#c084fc', '#ff8a3d', '#f0abfc', '#5b8cff'];

  let N, endpoints, paths, cell, OX, OY, level, drawing, t, done, moves;

  function layout() {
    const s = Math.min(W - 60, H - 210);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2); OY = 130;
  }

  /* Genera un tablero: recorre caminos aleatorios que cubren la cuadrícula. */
  function generate() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const occ = [];
      for (let r = 0; r < N; r++) { occ.push([]); for (let c = 0; c < N; c++) occ[r][c] = -1; }
      const routes = [];
      let ok = true;
      const nPaths = Math.min(COLORS.length, 3 + Math.floor(N / 2));
      for (let p = 0; p < nPaths; p++) {
        const free = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (occ[r][c] < 0) free.push([r, c]);
        if (!free.length) break;
        let [r, c] = E.rng.pick(free);
        const route = [[r, c]];
        occ[r][c] = p;
        const target = p === nPaths - 1 ? 999 : E.rng.range(3, Math.max(4, N + 2));
        while (route.length < target) {
          const opts = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([rr, cc]) =>
            rr >= 0 && rr < N && cc >= 0 && cc < N && occ[rr][cc] < 0);
          if (!opts.length) break;
          /* evita rutas que se peguen a sí mismas */
          const good = opts.filter(([rr, cc]) => {
            let touch = 0;
            [[rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]].forEach(([ar, ac]) => {
              if (ar >= 0 && ar < N && ac >= 0 && ac < N && occ[ar][ac] === p) touch++;
            });
            return touch <= 1;
          });
          const pick = (good.length ? good : opts)[E.rng.int((good.length ? good : opts).length)];
          r = pick[0]; c = pick[1];
          occ[r][c] = p;
          route.push([r, c]);
        }
        if (route.length < 2) { ok = false; break; }
        routes.push(route);
      }
      let full = true;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (occ[r][c] < 0) full = false;
      if (ok && full && routes.length >= 3) {
        endpoints = routes.map((rt, i) => ({ a: rt[0], b: rt[rt.length - 1], col: COLORS[i % COLORS.length] }));
        return true;
      }
    }
    /* plan B: pares sencillos */
    endpoints = [];
    for (let i = 0; i < 3; i++) {
      endpoints.push({ a: [i, 0], b: [i, N - 1], col: COLORS[i] });
    }
    return true;
  }

  function reset(lv) {
    level = lv == null ? (level || 1) : lv;
    N = Math.min(9, 4 + Math.floor(level / 2));
    layout();
    generate();
    paths = endpoints.map(() => []);
    drawing = null; t = 0; done = false; moves = 0;
    hud();
  }
  function hud() {
    const solved = paths.filter((p, i) => connected(i)).length;
    E.api.hud({ Nivel: level, Tuberías: solved + '/' + endpoints.length, Tiempo: M.fmtTime(t) });
  }

  function connected(i) {
    const p = paths[i], e = endpoints[i];
    if (p.length < 2) return false;
    const f = p[0], l = p[p.length - 1];
    const same = (x, y) => x[0] === y[0] && x[1] === y[1];
    return (same(f, e.a) && same(l, e.b)) || (same(f, e.b) && same(l, e.a));
  }

  function cellOwner(r, c) {
    for (let i = 0; i < paths.length; i++) {
      if (paths[i].some((p) => p[0] === r && p[1] === c)) return i;
    }
    return -1;
  }
  function endpointAt(r, c) {
    for (let i = 0; i < endpoints.length; i++) {
      const e = endpoints[i];
      if ((e.a[0] === r && e.a[1] === c) || (e.b[0] === r && e.b[1] === c)) return i;
    }
    return -1;
  }

  function checkWin() {
    if (!endpoints.every((e, i) => connected(i))) return;
    let filled = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cellOwner(r, c) >= 0) filled++;
    if (filled < N * N) return;
    done = true;
    E.sfx('win'); E.camera.kick(5);
    setTimeout(() => {
      level++;
      E.api.win({
        score: Math.max(0, level * 900 - Math.round(t * 6)),
        title: '¡Tablero completo!',
        msg: 'Nivel ' + (level - 1) + ' en ' + M.fmtTime(t),
        stats: { Tiempo: M.fmtTime(t) },
      });
    }, 600);
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;
      const c = Math.floor((p.x - OX) / cell), r = Math.floor((p.y - OY) / cell);
      const inside = c >= 0 && c < N && r >= 0 && r < N;

      if (p.pressed && inside && !done) {
        const ei = endpointAt(r, c);
        const oi = cellOwner(r, c);
        if (ei >= 0) { drawing = ei; paths[ei] = [[r, c]]; E.sfx('tap'); }
        else if (oi >= 0) {
          const k = paths[oi].findIndex((q) => q[0] === r && q[1] === c);
          paths[oi] = paths[oi].slice(0, k + 1);
          drawing = oi;
          E.sfx('tap');
        }
      }
      if (drawing != null && p.down && inside) {
        const path = paths[drawing];
        const last = path[path.length - 1];
        if (last && (Math.abs(last[0] - r) + Math.abs(last[1] - c)) === 1) {
          const back = path.findIndex((q) => q[0] === r && q[1] === c);
          if (back >= 0) paths[drawing] = path.slice(0, back + 1);
          else {
            const owner = cellOwner(r, c);
            if (owner >= 0 && owner !== drawing) {
              const k = paths[owner].findIndex((q) => q[0] === r && q[1] === c);
              paths[owner] = paths[owner].slice(0, k);
            }
            const ei = endpointAt(r, c);
            if (ei >= 0 && ei !== drawing) return;
            path.push([r, c]);
            E.sfx('tick');
            if (connected(drawing)) { E.sfx('select'); moves++; hud(); checkWin(); }
          }
        }
      }
      if (p.released && drawing != null) { drawing = null; hud(); checkWin(); }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('FLUJO DE COLOR', W / 2, 46, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Une cada par y llena todas las casillas', W / 2, 74,
        { size: 13, align: 'center', color: P.dim, weight: 600 });

      g.rrect(OX - 8, OY - 8, cell * N + 16, cell * N + 16, 12, alpha(P.deep, 0.8));
      c.save();
      c.strokeStyle = alpha(P.ink, 0.08); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        c.moveTo(OX + i * cell, OY); c.lineTo(OX + i * cell, OY + cell * N);
        c.moveTo(OX, OY + i * cell); c.lineTo(OX + cell * N, OY + i * cell);
      }
      c.stroke(); c.restore();

      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      paths.forEach((path, i) => {
        if (path.length < 2) return;
        const pts = [];
        path.forEach((q) => pts.push(OX + q[1] * cell + cell / 2, OY + q[0] * cell + cell / 2));
        c.globalAlpha = connected(i) ? 1 : 0.75;
        g.polyStroke(pts, endpoints[i].col, cell * 0.42);
      });
      c.restore();

      endpoints.forEach((e, i) => {
        [e.a, e.b].forEach((q) => {
          const x = OX + q[1] * cell + cell / 2, y = OY + q[0] * cell + cell / 2;
          if (connected(i)) g.bloom(x, y, cell * 0.8, e.col, 0.4);
          g.circle(x, y, cell * 0.31, e.col);
          g.circle(x - cell * 0.08, y - cell * 0.09, cell * 0.1, alpha('#ffffff', 0.4));
        });
      });

      E.ui.hint('Arrastra desde un punto hasta su pareja del mismo color', { bottom: 22 });
    },
  };
});
