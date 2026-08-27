/* Gravedad Invertida — un toque cambia el suelo por el techo. */
NX.game('gravedad-invertida', {
  w: 900, h: 520, pal: 'royal',
  controls: { buttons: [{ k: 'space', label: 'INVERTIR' }] },
  music: { root: 43, scale: 'minor', bpm: 138, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const TOP = 40, BOT = H - 40, GRAV = 2500;

  let hero, spikes, gems, dist, speed, alive, spawnX, score, flipT;

  function reset() {
    hero = { x: 190, y: BOT - 20, vy: 0, dir: 1, r: 17, rot: 0 };
    spikes = []; gems = []; dist = 0; speed = 320; alive = true; spawnX = W + 150; score = 0; flipT = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Distancia: Math.round(dist) + ' m' }); }

  function spawn() {
    const pat = E.rng.int(4);
    const n = E.rng.range(2, 4);
    for (let i = 0; i < n; i++) {
      const top = pat === 0 ? true : pat === 1 ? false : (i % 2 === 0);
      spikes.push({ x: spawnX + i * 42, top, w: 34, h: 30 });
    }
    if (E.rng.bool(0.6)) {
      const top = E.rng.bool();
      for (let i = 0; i < 3; i++) {
        gems.push({ x: spawnX + 150 + i * 38, y: top ? TOP + 60 : BOT - 60, ph: 0 });
      }
    }
    spawnX += E.rng.float(240, 400) - Math.min(120, speed * 0.2);
  }

  function flip() {
    hero.dir *= -1; flipT = 1;
    E.sfx('swoosh');
    E.particles.burst(hero.x, hero.y, 10, { col: [P.a, P.c], speed1: 180, life1: 0.4, add: true });
  }

  function die() {
    alive = false;
    E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.5);
    E.particles.burst(hero.x, hero.y, 30, { col: [P.a, '#ff4d6d'], speed1: 300, add: true });
    setTimeout(() => E.api.over({ score, msg: Math.round(dist) + ' metros', stats: { Distancia: Math.round(dist) + ' m' } }), 600);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      speed = Math.min(720, speed + dt * 10);
      dist += speed * dt / 26;
      score += speed * dt * 0.05;
      if (flipT > 0) flipT -= dt * 3;

      if (E.input.pressed('space') || E.input.pressed('up') || E.input.pointer.pressed) flip();

      hero.vy += GRAV * hero.dir * dt;
      hero.y += hero.vy * dt;
      hero.rot += dt * hero.dir * 4;
      if (hero.dir > 0 && hero.y > BOT - hero.r) { hero.y = BOT - hero.r; hero.vy = 0; }
      if (hero.dir < 0 && hero.y < TOP + hero.r) { hero.y = TOP + hero.r; hero.vy = 0; }

      while (spawnX < W + 300) spawn();
      const dx = speed * dt;
      spawnX -= dx;

      for (let i = spikes.length - 1; i >= 0; i--) {
        const s = spikes[i];
        s.x -= dx;
        if (s.x < -60) { spikes.splice(i, 1); continue; }
        const sy = s.top ? TOP : BOT - s.h;
        if (hero.x + hero.r * 0.7 > s.x && hero.x - hero.r * 0.7 < s.x + s.w &&
            hero.y + hero.r * 0.7 > sy && hero.y - hero.r * 0.7 < sy + s.h) return die();
      }
      for (let i = gems.length - 1; i >= 0; i--) {
        const gm = gems[i];
        gm.x -= dx; gm.ph += dt * 5;
        if (gm.x < -30) { gems.splice(i, 1); continue; }
        if (M.dist(gm.x, gm.y, hero.x, hero.y) < 28) {
          gems.splice(i, 1); score += 80;
          E.sfx('gem'); E.floaters.add(gm.x, gm.y, '+80', { col: P.c });
        }
      }
      if (Math.floor(dist) % 4 === 0) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.4), P.deep);
      const off = (dist * 26) % 80;
      c.save(); c.globalAlpha = 0.16;
      for (let x = -off; x < W; x += 80) g.line(x, TOP, x, BOT, P.a, 1);
      c.restore();

      g.rect(0, 0, W, TOP, mix(P.d, P.deep, 0.35));
      g.rect(0, BOT, W, H - BOT, mix(P.d, P.deep, 0.35));
      g.rect(0, TOP - 3, W, 3, alpha(P.a, 0.7));
      g.rect(0, BOT, W, 3, alpha(P.a, 0.7));

      spikes.forEach((s) => {
        const sy = s.top ? TOP : BOT;
        const dir = s.top ? 1 : -1;
        for (let k = 0; k < 2; k++) {
          const x = s.x + k * 17;
          g.poly([x, sy, x + 17, sy, x + 8.5, sy + dir * s.h], '#ff4d6d');
        }
      });

      gems.forEach((gm) => {
        g.bloom(gm.x, gm.y, 20, P.c, 0.5);
        g.ngon(gm.x, gm.y, 10, 6, gm.ph * 0.5, P.c);
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      g.capsule(hero.x - 30, hero.y, hero.x, hero.y, 12, alpha(P.a, 0.18));
      c.restore();
      g.push(hero.x, hero.y, hero.rot);
      g.bloom(0, 0, 34, P.a, 0.35);
      g.rrect(-hero.r, -hero.r, hero.r * 2, hero.r * 2, 7, P.a);
      g.rect(-9, -4, 18, 6, P.deep);
      g.pop();
      /* flecha de gravedad */
      g.text(hero.dir > 0 ? '▼' : '▲', hero.x, hero.y - hero.dir * 40, {
        size: 20, align: 'center', color: alpha(P.c, 0.4 + Math.max(0, flipT) * 0.6),
      });

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(dist) + ' m', W / 2, 68, {
        size: 28, align: 'center', weight: 900, color: alpha(P.ink, 0.85), mono: true,
      });
      E.ui.hint('Espacio o toca para invertir la gravedad', { bottom: 12 });
    },
  };
});
