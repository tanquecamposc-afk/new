/* Cortar la Cuerda — corta en el orden correcto para que el caramelo llegue a su sitio. */
NX.game('cortar-la-cuerda', {
  w: 800, h: 640, pal: 'toxic',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 900;

  const LEVELS = [
    { candy: [400, 200], ropes: [[280, 90, 140], [520, 90, 140]], goal: [400, 540], stars: [[400, 330], [400, 430]] },
    { candy: [220, 180], ropes: [[220, 70, 120]], goal: [640, 500], stars: [[380, 300], [520, 380]], bumpers: [[420, 420, 34]] },
    { candy: [180, 160], ropes: [[180, 60, 110], [420, 120, 200]], goal: [660, 540], stars: [[300, 300], [480, 380], [600, 460]] },
    { candy: [400, 140], ropes: [[280, 60, 160], [520, 60, 160]], goal: [400, 560], stars: [[250, 380], [550, 380]], bumpers: [[400, 380, 40]] },
    { candy: [150, 200], ropes: [[150, 80, 130]], goal: [700, 520], stars: [[330, 260], [500, 340], [640, 440]], bumpers: [[300, 420, 30], [520, 470, 30]] },
  ];

  let candy, ropes, goal, stars, bumpers, level, cut, alive, won, score, tries, trail;

  function reset(l) {
    level = l == null ? (level || 0) : l;
    const L = LEVELS[level % LEVELS.length];
    candy = { x: L.candy[0], y: L.candy[1], vx: 0, vy: 0, r: 15 };
    ropes = L.ropes.map((r) => ({ ax: r[0], ay: r[1], len: r[2], cut: false }));
    goal = { x: L.goal[0], y: L.goal[1], r: 30 };
    stars = (L.stars || []).map((s) => ({ x: s[0], y: s[1], got: false, ph: 0 }));
    bumpers = (L.bumpers || []).map((b) => ({ x: b[0], y: b[1], r: b[2], hit: 0 }));
    cut = null; alive = true; won = false; trail = [];
    if (score == null) { score = 0; tries = 0; }
    hud();
  }
  function hud() { E.api.hud({ Nivel: (level % LEVELS.length) + 1 + '/' + LEVELS.length, Estrellas: stars.filter((s) => s.got).length + '/' + stars.length, Puntos: M.fmtScore(score) }); }

  reset(0);

  return {
    update(dt) {
      stars.forEach((s) => { s.ph += dt * 3; });
      bumpers.forEach((b) => { if (b.hit > 0) b.hit -= dt * 3; });
      if (!alive) return;

      const p = E.input.pointer;
      if (p.pressed) cut = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      if (cut && p.down) { cut.x1 = p.x; cut.y1 = p.y; }
      if (cut && p.released) {
        ropes.forEach((r) => {
          if (r.cut) return;
          const seg = M.segInter(cut.x0, cut.y0, cut.x1, cut.y1, r.ax, r.ay, candy.x, candy.y);
          if (seg) {
            r.cut = true;
            E.sfx('slide');
            E.particles.burst(seg.x, seg.y, 8, { col: [P.c], speed1: 160, add: true });
          }
        });
        cut = null;
      }

      const sub = 4;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        candy.vy += GRAV * h;
        candy.x += candy.vx * h; candy.y += candy.vy * h;
        candy.vx *= Math.exp(-0.4 * h); candy.vy *= Math.exp(-0.1 * h);

        ropes.forEach((r) => {
          if (r.cut) return;
          const dx = candy.x - r.ax, dy = candy.y - r.ay;
          const d = Math.hypot(dx, dy);
          if (d > r.len) {
            const nx = dx / d, ny = dy / d;
            candy.x = r.ax + nx * r.len;
            candy.y = r.ay + ny * r.len;
            const dot = candy.vx * nx + candy.vy * ny;
            candy.vx -= dot * nx * 1.2; candy.vy -= dot * ny * 1.2;
          }
        });

        bumpers.forEach((b) => {
          const d = M.dist(candy.x, candy.y, b.x, b.y);
          if (d < b.r + candy.r) {
            const nx = (candy.x - b.x) / d, ny = (candy.y - b.y) / d;
            candy.x = b.x + nx * (b.r + candy.r);
            candy.y = b.y + ny * (b.r + candy.r);
            const dot = candy.vx * nx + candy.vy * ny;
            candy.vx -= 1.7 * dot * nx; candy.vy -= 1.7 * dot * ny;
            b.hit = 1;
            E.sfx('bounce');
          }
        });

        if (candy.x < candy.r) { candy.x = candy.r; candy.vx = Math.abs(candy.vx) * 0.6; }
        if (candy.x > W - candy.r) { candy.x = W - candy.r; candy.vx = -Math.abs(candy.vx) * 0.6; }
      }

      trail.push({ x: candy.x, y: candy.y });
      if (trail.length > 20) trail.shift();

      stars.forEach((s) => {
        if (!s.got && M.dist(s.x, s.y, candy.x, candy.y) < 30) {
          s.got = true; score += 200;
          E.sfx('coin');
          E.particles.burst(s.x, s.y, 10, { col: [P.c], speed1: 180, add: true });
          hud();
        }
      });

      if (M.dist(candy.x, candy.y, goal.x, goal.y) < goal.r + candy.r) {
        alive = false; won = true;
        E.sfx('win'); E.camera.kick(5);
        E.particles.burst(goal.x, goal.y, 22, { col: [P.a, P.c], speed1: 240, add: true });
        setTimeout(() => {
          level++;
          score += 500 + stars.filter((s) => s.got).length * 300;
          E.api.win({
            score, title: '¡Caramelo entregado!',
            msg: stars.filter((s) => s.got).length + ' de ' + stars.length + ' estrellas',
            stats: { Estrellas: stars.filter((s) => s.got).length },
          });
        }, 800);
      }
      if (candy.y > H + 60) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'El caramelo se perdió', stats: { Nivel: (level % LEVELS.length) + 1 } }), 600);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.bgGrid(48, alpha(P.a, 0.045), 1, 0, 0);

      /* meta: criatura */
      g.bloom(goal.x, goal.y, goal.r * 2.4, P.a, 0.3);
      G.Sprites.blob(g, goal.x, goal.y, goal.r, P.a, E.t, true);
      g.ring(goal.x, goal.y, goal.r + 8, 2, alpha(P.a, 0.3));

      stars.forEach((s) => {
        if (s.got) return;
        g.bloom(s.x, s.y, 26, P.c, 0.4);
        g.star(s.x, s.y, 14, 6, 5, s.ph * 0.4, P.c);
      });

      bumpers.forEach((b) => {
        g.circle(b.x, b.y, b.r + b.hit * 4, mix(P.b, P.deep, 0.2));
        g.ring(b.x, b.y, b.r + b.hit * 4, 3, P.b);
      });

      ropes.forEach((r) => {
        g.circle(r.ax, r.ay, 8, P.dim);
        if (r.cut) return;
        c.strokeStyle = mix('#b98a4a', P.deep, 0.05); c.lineWidth = 3.5;
        c.beginPath();
        c.moveTo(r.ax, r.ay);
        const mx = (r.ax + candy.x) / 2, my = (r.ay + candy.y) / 2 + 8;
        c.quadraticCurveTo(mx, my, candy.x, candy.y);
        c.stroke();
      });

      c.save(); c.globalAlpha = 0.2;
      trail.forEach((q, i) => g.circle(q.x, q.y, candy.r * (i / trail.length) * 0.6, P.c));
      c.restore();

      g.rrect(candy.x - candy.r, candy.y - candy.r, candy.r * 2, candy.r * 2, 7, P.c);
      g.rrect(candy.x - candy.r, candy.y - candy.r, candy.r * 2, candy.r * 0.7, 7, alpha('#ffffff', 0.3));
      g.poly([candy.x - candy.r, candy.y, candy.x - candy.r - 9, candy.y - 7, candy.x - candy.r - 9, candy.y + 7], P.c);
      g.poly([candy.x + candy.r, candy.y, candy.x + candy.r + 9, candy.y - 7, candy.x + candy.r + 9, candy.y + 7], P.c);

      if (cut) {
        c.save(); c.strokeStyle = alpha(P.c, 0.9); c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cut.x0, cut.y0); c.lineTo(cut.x1, cut.y1); c.stroke();
        c.restore();
      }

      E.particles.draw(g);
      E.ui.hint('Traza un corte sobre las cuerdas · recoge las estrellas', { bottom: 14 });
    },
  };
});
