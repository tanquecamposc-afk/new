/* Columpio Web — lanza la cuerda, coge impulso y suéltala en el momento justo. */
NX.game('columpio-web', {
  w: 900, h: 560, pal: 'ocean',
  controls: { buttons: [{ k: 'space', label: 'CUERDA' }] },
  music: { root: 45, scale: 'lydian', bpm: 110, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1200;

  let hero, anchors, rope, camX, dist, alive, score, rings, bestX;

  function reset() {
    hero = { x: 150, y: 200, vx: 260, vy: 0, r: 15 };
    anchors = []; rings = [];
    for (let i = 0; i < 24; i++) addAnchor(200 + i * E.rng.float(180, 280));
    rope = null; camX = 0; dist = 0; alive = true; score = 0; bestX = 150;
    hud();
  }
  function hud() { E.api.hud({ Distancia: Math.round(dist) + ' m', Puntos: M.fmtScore(score) }); }

  function addAnchor(x) {
    anchors.push({ x, y: E.rng.float(50, 140) });
    if (E.rng.bool(0.6)) rings.push({ x: x + E.rng.float(-70, 70), y: E.rng.float(220, H - 130), got: false, ph: 0 });
  }

  function die() {
    alive = false;
    E.sfx('lose'); E.camera.kick(12);
    E.particles.burst(hero.x - camX, hero.y, 24, { col: [P.a, P.c], speed1: 260, add: true });
    setTimeout(() => E.api.over({ score, msg: Math.round(dist) + ' metros recorridos', stats: { Distancia: Math.round(dist) + ' m' } }), 600);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      const press = E.input.down('space') || E.input.pointer.down;

      if (press && !rope) {
        /* engancha al punto delantero más cercano */
        let best = null, bd = 1e9;
        anchors.forEach((a) => {
          const d = M.dist(a.x, a.y, hero.x, hero.y);
          if (a.x > hero.x - 40 && d < 340 && d < bd) { bd = d; best = a; }
        });
        if (best) {
          rope = { a: best, len: bd };
          E.sfx('swoosh');
        }
      }
      if (!press && rope) {
        rope = null;
        E.sfx('hop');
        E.particles.burst(hero.x - camX, hero.y, 6, { col: [P.c], speed1: 130, add: true });
      }

      hero.vy += GRAV * dt;
      hero.x += hero.vx * dt;
      hero.y += hero.vy * dt;

      if (rope) {
        const dx = hero.x - rope.a.x, dy = hero.y - rope.a.y;
        const d = Math.hypot(dx, dy);
        if (d > rope.len) {
          const nx = dx / d, ny = dy / d;
          hero.x = rope.a.x + nx * rope.len;
          hero.y = rope.a.y + ny * rope.len;
          const dot = hero.vx * nx + hero.vy * ny;
          hero.vx -= dot * nx; hero.vy -= dot * ny;
          hero.vx *= 1.001;
        }
      }
      hero.vx = M.clamp(hero.vx, -400, 900);

      if (hero.x > bestX) { dist += (hero.x - bestX) / 24; bestX = hero.x; score = Math.round(dist * 10); hud(); }
      camX = M.damp(camX, hero.x - W * 0.32, 8, dt);

      while (anchors[anchors.length - 1].x < hero.x + W * 2) addAnchor(anchors[anchors.length - 1].x + E.rng.float(180, 300));
      anchors = anchors.filter((a) => a.x > camX - 300);

      rings.forEach((r) => {
        r.ph += dt * 4;
        if (!r.got && M.dist(r.x, r.y, hero.x, hero.y) < 30) {
          r.got = true; score += 150;
          E.sfx('gem'); E.floaters.add(r.x - camX, r.y, '+150', { col: P.c });
          hud();
        }
      });
      rings = rings.filter((r) => r.x > camX - 200);

      if (hero.y > H + 60) die();
      if (Math.random() < 0.4) E.particles.trail(hero.x - camX, hero.y, { col: alpha(P.a, 0.6), r: 3, life: 0.35 });
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      for (let i = 0; i < 8; i++) {
        G.Sprites.cloud(g, ((i * 230 - camX * 0.18) % (W + 400)) - 100, 70 + (i % 3) * 60, 50, alpha(P.ink, 0.05));
      }
      /* edificios de fondo */
      for (let i = 0; i < 14; i++) {
        const x = ((i * 170 - camX * 0.45) % (W + 340)) - 120;
        const hgt = 120 + ((i * 53) % 5) * 46;
        g.rect(x, H - hgt, 110, hgt, alpha(mix(P.d, P.deep, 0.35), 0.75));
        for (let k = 0; k < 6; k++) {
          for (let j = 0; j < 3; j++) {
            if ((i + k + j) % 3 === 0) g.rect(x + 14 + j * 30, H - hgt + 18 + k * 28, 16, 16, alpha(P.c, 0.16));
          }
        }
      }

      anchors.forEach((a) => {
        const x = a.x - camX;
        if (x < -60 || x > W + 60) return;
        g.line(x, 0, x, a.y, alpha(P.dim, 0.35), 2);
        g.circle(x, a.y, 8, P.c);
        g.ring(x, a.y, 13, 1.5, alpha(P.c, 0.4));
      });

      rings.forEach((r) => {
        if (r.got) return;
        const x = r.x - camX;
        g.bloom(x, r.y, 26, P.b, 0.4);
        g.ring(x, r.y, 18, 4, P.b);
        g.ring(x, r.y, 11 + Math.sin(r.ph) * 2, 2, alpha(P.c, 0.7));
      });

      const hx = hero.x - camX;
      if (rope) {
        g.line(rope.a.x - camX, rope.a.y, hx, hero.y, P.c, 2.5);
      }
      g.bloom(hx, hero.y, 32, P.a, 0.35);
      g.circle(hx, hero.y, hero.r, P.a);
      g.circle(hx + 5, hero.y - 3, 4.5, '#fff');
      g.circle(hx + 6.5, hero.y - 3, 2.4, P.deep);

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(dist) + ' m', W / 2, 44, {
        size: 28, align: 'center', weight: 900, color: alpha(P.ink, 0.9), mono: true,
      });
      E.ui.hint('Mantén pulsado para lanzar la cuerda · suelta para volar', { bottom: 14 });
    },
  };
});
