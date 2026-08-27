/* Torres de Hanói — mueve la pila entera cumpliendo la regla de los discos. */
NX.game('torres-de-hanoi', {
  w: 760, h: 560, pal: 'ember',
  music: { root: 45, scale: 'major', bpm: 70, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const BY = H - 110, PEG_X = [W * 0.22, W * 0.5, W * 0.78];

  let n, pegs, held, moves, best, t, done, hoverPeg;

  function reset(count) {
    n = count == null ? (n || 4) : count;
    pegs = [[], [], []];
    for (let i = n; i >= 1; i--) pegs[0].push(i);
    held = null; moves = 0; t = 0; done = false;
    best = Math.pow(2, n) - 1;
    hud();
  }
  function hud() { E.api.hud({ Discos: n, Movimientos: moves, Mínimo: best, Tiempo: M.fmtTime(t) }); }

  const dw = (d) => 46 + d * 26;
  const dy = (p, i) => BY - 14 - i * 22;

  function pick(p) {
    if (!pegs[p].length) { E.sfx('error'); return; }
    held = { d: pegs[p].pop(), from: p, x: PEG_X[p], y: dy(p, pegs[p].length) };
    E.sfx('tap');
  }
  function drop(p) {
    if (!held) return;
    const top = pegs[p][pegs[p].length - 1];
    if (top && top < held.d) {
      E.sfx('error'); E.camera.kick(3);
      pegs[held.from].push(held.d);
      held = null;
      return;
    }
    pegs[p].push(held.d);
    if (p !== held.from) { moves++; E.sfx('place'); }
    held = null;
    hud();
    if (pegs[2].length === n && !done) {
      done = true;
      E.sfx('win'); E.camera.kick(6);
      for (let i = 0; i < n; i++) {
        E.particles.burst(PEG_X[2], dy(2, i), 8, { col: [P.c, P.a], speed1: 180, add: true });
      }
      setTimeout(() => E.api.win({
        score: Math.max(0, n * 2000 - (moves - best) * 60 - Math.round(t * 5)),
        title: '¡Torre trasladada!',
        msg: moves + ' movimientos (el mínimo es ' + best + ')',
        stats: { Movimientos: moves, Mínimo: best },
      }), 600);
    }
  }

  reset(4);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;
      hoverPeg = -1;
      for (let i = 0; i < 3; i++) if (Math.abs(p.x - PEG_X[i]) < 110) hoverPeg = i;

      if (held) { held.x = M.damp(held.x, p.x, 24, dt); held.y = M.damp(held.y, p.y, 24, dt); }

      if (p.pressed) {
        if (p.y > 60 && p.y < 96) {
          for (let i = 0; i < 6; i++) {
            const x = W / 2 - 186 + i * 64;
            if (p.x > x && p.x < x + 56) { reset(i + 3); E.sfx('select'); return; }
          }
        }
        if (!held && hoverPeg >= 0) pick(hoverPeg);
      } else if (p.released && held) {
        drop(hoverPeg >= 0 ? hoverPeg : held.from);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('TORRES DE HANÓI', W / 2, 42, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      for (let i = 0; i < 6; i++) {
        const x = W / 2 - 186 + i * 64;
        const on = i + 3 === n;
        g.rrect(x, 62, 56, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(String(i + 3), x + 28, 84, { size: 15, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      g.rrect(W * 0.1, BY, W * 0.8, 16, 8, mix('#7a5a34', P.deep, 0.15));
      PEG_X.forEach((x, i) => {
        const hov = hoverPeg === i;
        if (hov) { c.save(); c.globalAlpha = 0.12; g.rrect(x - 100, BY - 250, 200, 262, 12, P.a); c.restore(); }
        g.rrect(x - 6, BY - 240, 12, 244, 6, mix(P.dim, P.deep, 0.3));
        g.circle(x, BY - 240, 9, P.c);
        g.text(['A', 'B', 'C'][i], x, BY + 46, { size: 16, align: 'center', color: P.dim, weight: 800 });
      });

      pegs.forEach((stack, pi) => {
        stack.forEach((d, i) => {
          const w = dw(d), x = PEG_X[pi] - w / 2, y = dy(pi, i);
          const col = mix(P.a, P.b, (d - 1) / Math.max(1, n - 1));
          g.rrect(x, y, w, 19, 8, col);
          g.rrect(x, y, w, 7, 8, alpha('#ffffff', 0.28));
          g.text(String(d), PEG_X[pi], y + 14, { size: 12, align: 'center', color: alpha('#0d1220', 0.6), weight: 900 });
        });
      });

      if (held) {
        const w = dw(held.d);
        const col = mix(P.a, P.b, (held.d - 1) / Math.max(1, n - 1));
        c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
        g.rrect(held.x - w / 2, held.y - 10, w, 19, 8, col);
        c.restore();
        g.rrect(held.x - w / 2, held.y - 10, w, 7, 8, alpha('#ffffff', 0.3));
      }

      E.particles.draw(g);
      E.ui.hint('Arrastra un disco de una torre a otra · nunca uno grande sobre uno pequeño', { bottom: 18 });
    },
  };
});
