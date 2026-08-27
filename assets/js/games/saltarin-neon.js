/* Saltarín Neón — sube saltando de plataforma en plataforma sin caer al vacío. */
NX.game('saltarin-neon', {
  w: 480, h: 720, pal: 'candy',
  controls: { dpad: 'lr' },
  music: { root: 48, scale: 'major', bpm: 118, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1500, JUMP = -690;

  let hero, plats, items, camY, best, score, alive, spawnY, jetT;

  function makePlat(y, force) {
    const kind = force != null ? force : E.rng.weighted([
      [0, 12], [1, score > 800 ? 4 : 1], [2, score > 400 ? 3 : 0], [3, 2],
    ]);
    return {
      x: E.rng.float(40, W - 100), y, w: 62, kind,
      vx: kind === 2 ? E.rng.sign() * E.rng.float(50, 110) : 0,
      used: false, t: 0,
    };
  }

  function reset() {
    hero = { x: W / 2, y: H - 140, vx: 0, vy: 0, r: 17, face: 1 };
    plats = [{ x: W / 2 - 31, y: H - 100, w: 62, kind: 0, vx: 0, used: false, t: 0 }];
    items = []; camY = 0; best = H - 140; score = 0; alive = true; jetT = 0;
    spawnY = H - 100;
    for (let i = 0; i < 16; i++) { spawnY -= E.rng.float(62, 96); plats.push(makePlat(spawnY)); }
    hud();
  }
  function hud() { E.api.hud({ Altura: M.fmtScore(score) + ' m', Récord: M.fmtScore(E.api.best) }); }

  function jump(power) {
    hero.vy = power || JUMP;
    E.sfx('hop');
    E.particles.burst(hero.x, hero.y + hero.r, 6, {
      col: [P.a, P.c], speed0: 30, speed1: 110, life1: 0.4, angle: Math.PI / 2, spread: 0.8, add: true,
    });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (jetT > 0) { jetT -= dt; hero.vy = -520; E.particles.trail(hero.x, hero.y + 16, { col: [P.c, P.b], r: 4 }); }

      const ax = E.input.axis().x;
      const p = E.input.pointer;
      if (p.down) hero.vx = M.damp(hero.vx, (p.x - hero.x) * 6, 12, dt);
      else hero.vx = M.damp(hero.vx, ax * 330, 14, dt);
      if (Math.abs(hero.vx) > 20) hero.face = Math.sign(hero.vx);
      hero.x += hero.vx * dt;
      if (hero.x < -20) hero.x = W + 20;
      if (hero.x > W + 20) hero.x = -20;

      hero.vy += GRAV * dt;
      hero.y += hero.vy * dt;

      /* colisión solo bajando */
      if (hero.vy > 0) {
        for (const pl of plats) {
          if (pl.kind === 3 && pl.used) continue;
          if (hero.x + 12 > pl.x && hero.x - 12 < pl.x + pl.w &&
              hero.y + hero.r > pl.y && hero.y + hero.r < pl.y + 22) {
            if (pl.kind === 1) { jump(-980); E.sfx('power'); pl.t = 1; }
            else if (pl.kind === 3) { pl.used = true; jump(); E.sfx('land'); }
            else jump();
            break;
          }
        }
      }

      plats.forEach((pl) => {
        if (pl.vx) {
          pl.x += pl.vx * dt;
          if (pl.x < 6 || pl.x + pl.w > W - 6) pl.vx *= -1;
        }
        if (pl.t > 0) pl.t -= dt * 3;
      });

      /* cámara y puntuación */
      if (hero.y < best) { best = hero.y; score = Math.max(score, Math.round((H - 140 - best) / 10)); hud(); }
      const targetCam = Math.min(0, hero.y - H * 0.42);
      camY = Math.min(camY, targetCam);

      /* generar y limpiar */
      while (spawnY > camY - 200) {
        spawnY -= E.rng.float(58, 92 + Math.min(38, score / 22));
        plats.push(makePlat(spawnY));
        if (E.rng.bool(0.09)) items.push({ x: E.rng.float(40, W - 40), y: spawnY - 32, kind: E.rng.bool(0.35) ? 1 : 0, ph: 0 });
      }
      for (let i = plats.length - 1; i >= 0; i--) if (plats[i].y > camY + H + 60) plats.splice(i, 1);

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.ph += dt * 4;
        if (it.y > camY + H + 40) { items.splice(i, 1); continue; }
        if (M.dist(it.x, it.y, hero.x, hero.y) < 26) {
          items.splice(i, 1);
          if (it.kind === 1) { jetT = 1.4; E.sfx('charge'); E.floaters.add(hero.x, hero.y - 24, 'Propulsor', { col: P.c }); }
          else { score += 60; E.sfx('coin'); E.floaters.add(it.x, it.y, '+60', { col: P.c }); hud(); }
        }
      }

      if (hero.y > camY + H + 50) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, label: 'Metros', msg: 'Caíste desde ' + score + ' m' }), 500);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      c.save();
      c.translate(0, -camY);

      for (let i = 0; i < 40; i++) {
        const y = ((i * 137) % 2000) - Math.floor(camY / 2000) * 2000 + camY * 0.3;
        g.circle((i * 91.3) % W, y, 1.4, alpha('#ffffff', 0.1));
      }

      plats.forEach((pl) => {
        const col = [P.a, P.c, P.b, P.d][pl.kind];
        if (pl.kind === 3 && pl.used) {
          c.save(); c.globalAlpha = 0.2;
          g.rrect(pl.x, pl.y, pl.w, 13, 6, col); c.restore();
          return;
        }
        const sq = pl.t > 0 ? 1 + pl.t * 0.3 : 1;
        g.rrect(pl.x, pl.y, pl.w, 13 * sq, 6, col);
        g.rrect(pl.x, pl.y, pl.w, 5, 6, alpha('#ffffff', 0.3));
        if (pl.kind === 1) { g.rrect(pl.x + pl.w / 2 - 12, pl.y - 7, 24, 8, 4, P.c); }
        if (pl.kind === 3) g.rrectStroke(pl.x, pl.y, pl.w, 13, 6, alpha('#000', 0.3), 1.5);
      });

      items.forEach((it) => {
        g.bloom(it.x, it.y, 22, it.kind ? P.c : P.b, 0.5);
        if (it.kind) { g.rrect(it.x - 9, it.y - 12, 18, 24, 6, P.c); g.poly([it.x - 6, it.y + 12, it.x + 6, it.y + 12, it.x, it.y + 22], alpha(P.b, 0.9)); }
        else g.star(it.x, it.y, 11, 5, 5, it.ph * 0.4, P.b);
      });

      /* héroe */
      const squash = M.clamp(1 + hero.vy / 3000, 0.82, 1.2);
      g.push(hero.x, hero.y, 0, 1 / squash, squash);
      g.bloom(0, 0, 34, P.a, 0.35);
      g.circle(0, 0, hero.r, P.a);
      g.circle(-hero.r * 0.3, -hero.r * 0.3, hero.r * 0.35, alpha('#fff', 0.3));
      g.circle(hero.face * 5, -3, 5, '#fff');
      g.circle(hero.face * 6.5, -3, 2.5, P.deep);
      g.pop();
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(M.fmtScore(score) + ' m', W / 2, 48, {
        size: 34, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.5), shadowBlur: 16,
      });
      E.ui.hint('← → o arrastra · los bordes conectan', { bottom: 16 });
    },
  };
});
