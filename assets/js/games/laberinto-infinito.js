/* Laberinto Infinito — laberintos generados al vuelo, con niebla y linterna. */
NX.game('laberinto-infinito', {
  w: 720, h: 680, pal: 'forest',
  controls: { dpad: true },
  music: { root: 43, scale: 'dorian', bpm: 80, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let N, cells, hero, exit, keys, level, t, done, cell, OX, OY, seen, steps;

  function idx(c, r) { return r * N + c; }

  function generate() {
    cells = [];
    for (let i = 0; i < N * N; i++) cells.push({ w: [1, 1, 1, 1], v: false });  /* arriba, der, abajo, izq */
    const stack = [[0, 0]];
    cells[0].v = true;
    const DIRS = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const opts = [];
      DIRS.forEach((d) => {
        const nc = c + d[0], nr = r + d[1];
        if (nc >= 0 && nc < N && nr >= 0 && nr < N && !cells[idx(nc, nr)].v) opts.push([nc, nr, d]);
      });
      if (!opts.length) { stack.pop(); continue; }
      const [nc, nr, d] = E.rng.pick(opts);
      cells[idx(c, r)].w[d[2]] = 0;
      cells[idx(nc, nr)].w[d[3]] = 0;
      cells[idx(nc, nr)].v = true;
      stack.push([nc, nr]);
    }
    /* algunos atajos para que no sea un árbol puro */
    for (let i = 0; i < N; i++) {
      const c = E.rng.int(N - 1), r = E.rng.int(N);
      cells[idx(c, r)].w[1] = 0; cells[idx(c + 1, r)].w[3] = 0;
    }
  }

  function reset(lv) {
    level = lv == null ? (level || 1) : lv;
    N = Math.min(19, 7 + level * 2);
    const s = Math.min(W - 60, H - 170);
    cell = Math.floor(s / N);
    OX = Math.round((W - cell * N) / 2); OY = 110;
    generate();
    hero = { c: 0, r: 0, x: 0, y: 0 };
    exit = { c: N - 1, r: N - 1 };
    keys = [];
    for (let i = 0; i < Math.min(4, 1 + Math.floor(level / 2)); i++) {
      keys.push({ c: E.rng.range(1, N - 1), r: E.rng.range(1, N - 1), got: false, ph: 0 });
    }
    seen = new Set(['0,0']);
    t = 0; done = false; steps = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Nivel: level, Llaves: keys.filter((k) => k.got).length + '/' + keys.length, Pasos: steps, Tiempo: M.fmtTime(t) });
  }

  function move(dc, dr) {
    if (done) return;
    const w = dr < 0 ? 0 : dc > 0 ? 1 : dr > 0 ? 2 : 3;
    if (cells[idx(hero.c, hero.r)].w[w]) { E.sfx('error'); return; }
    hero.c += dc; hero.r += dr;
    steps++;
    E.sfx('step');
    E.particles.trail(OX + hero.c * cell + cell / 2, OY + hero.r * cell + cell / 2,
      { col: alpha(P.a, 0.5), r: 2.5, life: 0.35 });
    for (let dc2 = -2; dc2 <= 2; dc2++) for (let dr2 = -2; dr2 <= 2; dr2++) {
      seen.add((hero.c + dc2) + ',' + (hero.r + dr2));
    }
    keys.forEach((k) => {
      if (!k.got && k.c === hero.c && k.r === hero.r) {
        k.got = true; E.sfx('coin');
        E.floaters.add(OX + k.c * cell + cell / 2, OY + k.r * cell, '🔑', { col: P.c, size: 22 });
        E.particles.burst(OX + k.c * cell + cell / 2, OY + k.r * cell + cell / 2, 20, {
          col: [P.c, '#ffffff'], speed1: 190, life1: 0.6, add: true,
        });
        E.camera.kick(5);
      }
    });
    hud();
    if (hero.c === exit.c && hero.r === exit.r) {
      if (keys.every((k) => k.got)) {
        done = true;
        E.sfx('win');
        E.camera.kick(12); E.camera.flash(P.a, 0.35);
        E.particles.burst(OX + exit.c * cell + cell / 2, OY + exit.r * cell + cell / 2, 46, {
          col: [P.a, P.c, '#ffffff'], speed1: 330, life1: 1.1, add: true,
        });
        setTimeout(() => {
          level++;
          E.api.win({
            score: Math.max(0, level * 700 - steps * 3),
            title: 'Salida encontrada',
            msg: 'Nivel ' + (level - 1) + ' en ' + steps + ' pasos',
            stats: { Pasos: steps, Tiempo: M.fmtTime(t) },
          });
        }, 600);
      } else { E.sfx('error'); E.floaters.add(OX + exit.c * cell + cell / 2, OY + exit.r * cell, 'Faltan llaves', { col: '#ff4d6d', size: 15 }); }
    }
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      hero.x = M.damp(hero.x, hero.c, 18, dt);
      hero.y = M.damp(hero.y, hero.r, 18, dt);
      keys.forEach((k) => { k.ph += dt * 3; });

      if (E.input.pressed('left')) move(-1, 0);
      else if (E.input.pressed('right')) move(1, 0);
      else if (E.input.pressed('up')) move(0, -1);
      else if (E.input.pressed('down')) move(0, 1);
      const sw = E.input.swipe;
      if (sw) {
        if (sw.dir === 'left') move(-1, 0);
        else if (sw.dir === 'right') move(1, 0);
        else if (sw.dir === 'up') move(0, -1);
        else move(0, 1);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 13);
      g.text('LABERINTO', W / 2, 44, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Recoge todas las llaves y busca la salida', W / 2, 72,
        { size: 13, align: 'center', color: P.dim, weight: 600 });

      g.rrect(OX - 8, OY - 8, cell * N + 16, cell * N + 16, 10, alpha(P.deep, 0.8));

      const hx = OX + hero.x * cell + cell / 2, hy = OY + hero.y * cell + cell / 2;

      /* suelo visitado */
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        if (!seen.has(cc + ',' + r)) continue;
        const d = M.dist(cc, r, hero.c, hero.r);
        const vis = d < 2.6 ? 1 : 0.32;
        g.rect(OX + cc * cell, OY + r * cell, cell, cell, alpha(P.a, 0.06 * vis + 0.02));
      }

      /* salida y llaves */
      const ex = OX + exit.c * cell + cell / 2, ey = OY + exit.r * cell + cell / 2;
      const openable = keys.every((k) => k.got);
      g.bloom(ex, ey, cell * 1.4, openable ? P.c : P.dim, 0.4);
      g.rrect(ex - cell * 0.3, ey - cell * 0.34, cell * 0.6, cell * 0.68, 4, openable ? P.c : mix(P.dim, P.deep, 0.3));
      g.circle(ex + cell * 0.16, ey, cell * 0.06, P.deep);

      keys.forEach((k) => {
        if (k.got) return;
        const x = OX + k.c * cell + cell / 2, y = OY + k.r * cell + cell / 2 + Math.sin(k.ph) * 2;
        const d = M.dist(k.c, k.r, hero.c, hero.r);
        c.save(); c.globalAlpha = d < 3.2 ? 1 : 0.28;
        g.bloom(x, y, cell * 0.9, P.c, 0.4);
        G.Sprites.key(g, x, y, cell * 0.34, P.c);
        c.restore();
      });

      /* muros */
      c.save();
      c.strokeStyle = P.a; c.lineWidth = Math.max(2, cell * 0.14); c.lineCap = 'round';
      c.beginPath();
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const cel = cells[idx(cc, r)];
        const x = OX + cc * cell, y = OY + r * cell;
        if (cel.w[0]) { c.moveTo(x, y); c.lineTo(x + cell, y); }
        if (cel.w[1]) { c.moveTo(x + cell, y); c.lineTo(x + cell, y + cell); }
        if (cel.w[2]) { c.moveTo(x, y + cell); c.lineTo(x + cell, y + cell); }
        if (cel.w[3]) { c.moveTo(x, y); c.lineTo(x, y + cell); }
      }
      c.stroke(); c.restore();

      /* niebla: oscurece lo que está lejos */
      c.save();
      c.globalCompositeOperation = 'multiply';
      const grad = g.radGrad(hx, hy, cell * 1.6, cell * 5.2, [[0, '#ffffff'], [1, '#2a3040']]);
      c.fillStyle = grad;
      c.fillRect(OX - 8, OY - 8, cell * N + 16, cell * N + 16);
      c.restore();

      g.bloom(hx, hy, cell * 2, P.c, 0.25);
      G.Sprites.blob(g, hx, hy, cell * 0.3, P.c, t);

      E.floaters.draw(g);
      E.ui.hint('Flechas o desliza para moverte', { bottom: 18 });
    },
  };
});
