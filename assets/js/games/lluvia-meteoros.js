/* Lluvia de Meteoros — esquiva todo lo que cae y aguanta el máximo tiempo posible. */
NX.game('lluvia-meteoros', {
  w: 900, h: 620, pal: 'sunset',
  controls: { dpad: 'lr' },
  music: { root: 42, scale: 'minor', bpm: 124, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 54;

  let hero, rocks, gems, t, alive, spawnT, score, shieldT, mult;

  function reset() {
    hero = { x: W / 2, vx: 0, r: 15 };
    rocks = []; gems = [];
    t = 0; alive = true; spawnT = 0.6; score = 0; shieldT = 0; mult = 1;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Tiempo: M.fmtTime(t), Multi: '×' + mult });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      score += dt * 12 * mult;
      mult = 1 + Math.floor(t / 15);
      if (shieldT > 0) shieldT -= dt;
      if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) hud();

      const ax = E.input.axis().x;
      hero.vx = M.damp(hero.vx, ax * 380, 14, dt);
      const p = E.input.pointer;
      if (p.down) hero.x = M.damp(hero.x, p.x, 18, dt);
      else hero.x += hero.vx * dt;
      hero.x = M.clamp(hero.x, 24, W - 24);

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.1, 0.62 - t * 0.008);
        const big = E.rng.bool(Math.min(0.35, t / 120));
        rocks.push({
          x: E.rng.float(30, W - 30), y: -40,
          vy: E.rng.float(160, 260) + t * 2.4, vx: E.rng.float(-40, 40),
          r: big ? E.rng.float(26, 38) : E.rng.float(12, 22),
          rot: E.rng.float(0, 6), vr: E.rng.float(-2, 2), big,
        });
        if (E.rng.bool(0.1)) gems.push({ x: E.rng.float(40, W - 40), y: -30, vy: 150, kind: E.rng.bool(0.3) ? 1 : 0, ph: 0 });
      }

      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.y += r.vy * dt; r.x += r.vx * dt; r.rot += r.vr * dt;
        if (r.x < r.r || r.x > W - r.r) r.vx *= -1;
        if (r.y > GY - r.r) {
          E.particles.burst(r.x, GY, r.big ? 16 : 8, { col: [P.a, P.c], speed0: 40, speed1: 180, grav: 500, life1: 0.6, angle: -Math.PI / 2, spread: 1.2 });
          E.sfx(r.big ? 'thud' : 'tap');
          if (r.big) E.camera.kick(4);
          rocks.splice(i, 1); continue;
        }
        if (M.dist(r.x, r.y, hero.x, GY - 20) < r.r + hero.r) {
          if (shieldT > 0) {
            shieldT = 0; rocks.splice(i, 1);
            E.sfx('shield'); E.particles.burst(hero.x, GY - 20, 18, { col: [P.b], speed1: 220, add: true });
            continue;
          }
          alive = false;
          E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.5);
          E.particles.burst(hero.x, GY - 20, 34, { col: [P.c, '#fff'], speed1: 320, life1: 1, add: true });
          setTimeout(() => E.api.over({
            score: Math.round(score), msg: 'Aguantaste ' + M.fmtTime(t), stats: { Tiempo: M.fmtTime(t) },
          }), 650);
          return;
        }
      }

      for (let i = gems.length - 1; i >= 0; i--) {
        const gm = gems[i];
        gm.y += gm.vy * dt; gm.ph += dt * 5;
        if (gm.y > H + 20) { gems.splice(i, 1); continue; }
        if (M.dist(gm.x, gm.y, hero.x, GY - 20) < 26) {
          gems.splice(i, 1);
          if (gm.kind === 1) { shieldT = 8; E.sfx('shield'); E.floaters.add(hero.x, GY - 50, 'Escudo', { col: P.b }); }
          else { score += 120 * mult; E.sfx('coin'); E.floaters.add(gm.x, gm.y, '+' + (120 * mult), { col: P.c }); }
          hud();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      for (let i = 0; i < 50; i++) {
        const x = (i * 151.3) % W, y = (i * 91.7 + E.t * (10 + (i % 4) * 8)) % (GY);
        g.circle(x, y, 0.9 + (i % 3) * 0.4, alpha('#ffffff', 0.12 + (i % 3) * 0.06));
      }
      g.rect(0, GY, W, H - GY, mix(P.d, P.deep, 0.4));
      g.rect(0, GY, W, 3, alpha(P.c, 0.6));

      rocks.forEach((r) => {
        const pts = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * M.TAU + r.rot;
          const rr = r.r * (0.78 + ((i * 41) % 9) / 32);
          pts.push(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr);
        }
        c.save(); c.globalCompositeOperation = 'lighter';
        g.capsule(r.x, r.y, r.x - r.vx * 0.06, r.y - r.vy * 0.09, r.r * 0.5, alpha(P.a, 0.22));
        c.restore();
        g.poly(pts, r.big ? mix(P.b, P.deep, 0.25) : mix(P.dim, P.deep, 0.4));
        g.polyStroke(pts, alpha(P.c, 0.55), 1.5, true);
      });

      gems.forEach((gm) => {
        if (gm.kind === 1) {
          g.bloom(gm.x, gm.y, 26, P.b, 0.6);
          g.ngon(gm.x, gm.y, 12, 6, gm.ph * 0.4, P.b);
        } else {
          g.bloom(gm.x, gm.y, 22, P.c, 0.6);
          g.star(gm.x, gm.y, 12, 5, 5, gm.ph, P.c);
        }
      });

      const hy = GY - 20;
      g.bloom(hero.x, hy, 34, P.a, 0.35);
      g.push(hero.x, hy, hero.vx * 0.0006);
      g.rrect(-13, -15, 26, 30, 9, P.ink);
      g.rect(-7, -7, 14, 6, P.deep);
      g.pop();
      if (shieldT > 0) g.ring(hero.x, hy, 26 + Math.sin(E.t * 8) * 2, 2.5, alpha(P.b, M.clamp01(shieldT / 2)));

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('← → o arrastra · esquiva y recoge estrellas', { bottom: 12 });
    },
  };
});
