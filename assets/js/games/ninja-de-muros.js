/* Ninja de Muros — rebota entre dos paredes esquivando sierras mientras subes. */
NX.game('ninja-de-muros', {
  w: 460, h: 720, pal: 'mono',
  controls: { buttons: [{ k: 'space', label: 'SALTAR' }] },
  music: { root: 40, scale: 'minor', bpm: 128, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const WALL = 52, GRAV = 1300;

  let hero, saws, coins, camY, height, score, alive, spawnY, speedUp, warm;

  function reset() {
    /* Pegado a la pared desde el principio: así resbala despacio en vez de
       caerse al vacío antes de que te dé tiempo a pulsar. */
    hero = { x: WALL + 8, y: H - 220, vx: 0, vy: 0, side: -1, r: 15, rot: 0 };
    saws = []; coins = []; camY = 0; height = 0; score = 0; alive = true; speedUp = 0;
    warm = 2.4;
    spawnY = H - 480;
    for (let i = 0; i < 10; i++) { spawnY -= E.rng.float(150, 210); addObstacle(spawnY); }
    hud();
  }
  function hud() { E.api.hud({ Altura: Math.round(height) + ' m', Puntos: M.fmtScore(score), Récord: M.fmtScore(E.api.best) }); }

  function addObstacle(y) {
    const kind = E.rng.weighted([[0, 8], [1, 3], [2, 2]]);
    if (kind === 0) saws.push({ x: E.rng.bool() ? WALL + 26 : W - WALL - 26, y, r: 24, rot: 0, move: 0 });
    else if (kind === 1) saws.push({ x: W / 2, y, r: 24, rot: 0, move: 1, ph: E.rng.float(0, 6) });
    else saws.push({ x: E.rng.bool() ? WALL + 26 : W - WALL - 26, y, r: 30, rot: 0, move: 2, ph: 0 });
    if (E.rng.bool(0.55)) coins.push({ x: E.rng.float(WALL + 30, W - WALL - 30), y: y - 70, ph: 0, got: false });
  }

  function jump() {
    /* El salto tenía que ser más fuerte: con los valores de antes el ninja
       caía más de lo que subía y perdías sin haber hecho nada mal. */
    hero.side *= -1;
    hero.vx = hero.side * 430;
    hero.vy = -560;
    E.sfx('hop');
    E.particles.burst(hero.x, hero.y, 8, { col: [P.a, P.c], speed1: 150, life1: 0.35, add: true });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (warm > 0) warm -= dt;
      speedUp += dt * 0.008;
      /* mientras dura el margen la pantalla no empuja hacia arriba */
      if (E.input.pressed('space') || E.input.pressed('up') || E.input.pointer.pressed) jump();

      hero.vy += GRAV * dt;
      hero.x += hero.vx * dt;
      hero.y += hero.vy * dt;
      hero.rot += hero.vx * dt * 0.02;

      /* Con tolerancia: si se ajustaba justo al borde, al fotograma siguiente
         dejaba de tocar la pared y caía al vacío. */
      if (hero.x <= WALL + hero.r + 1.5) {
        hero.x = WALL + hero.r; hero.vx = 0; hero.side = -1;
        hero.vy = Math.min(hero.vy, 110);          /* resbala despacio */
        hero.onWall = -1;
        if (Math.random() < 0.4) E.particles.trail(hero.x - 8, hero.y, { col: P.dim, r: 2, life: 0.3 });
      } else if (hero.x >= W - WALL - hero.r - 1.5) {
        hero.x = W - WALL - hero.r; hero.vx = 0; hero.side = 1;
        hero.vy = Math.min(hero.vy, 110);
        hero.onWall = 1;
        if (Math.random() < 0.4) E.particles.trail(hero.x + 8, hero.y, { col: P.dim, r: 2, life: 0.3 });
      } else hero.onWall = 0;

      if (warm <= 0) camY = Math.min(camY, hero.y - H * 0.55);
      height = Math.max(height, (H - 160 - hero.y) / 12);
      score = Math.max(score, Math.round(height * 10));

      while (spawnY > camY - 260) {
        spawnY -= E.rng.float(Math.max(84, 150 - speedUp * 40), 190);
        addObstacle(spawnY);
      }
      for (let i = saws.length - 1; i >= 0; i--) if (saws[i].y > camY + H + 80) saws.splice(i, 1);
      for (let i = coins.length - 1; i >= 0; i--) if (coins[i].y > camY + H + 80) coins.splice(i, 1);

      saws.forEach((s) => {
        s.rot += dt * 6;
        if (s.move === 1) { s.ph += dt * 1.6; s.x = W / 2 + Math.sin(s.ph) * (W / 2 - WALL - 40); }
        if (s.move === 2) { s.ph += dt * (1.2 + speedUp); s.y += Math.sin(s.ph) * 40 * dt; }
        if (M.dist(s.x, s.y, hero.x, hero.y) < s.r + hero.r - 4) {
          alive = false;
          E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.5);
          E.particles.burst(hero.x, hero.y, 32, { col: [P.a, '#ff4d6d'], speed1: 320, add: true });
          setTimeout(() => E.api.over({ score, msg: 'Subiste ' + Math.round(height) + ' metros', stats: { Altura: Math.round(height) + ' m' } }), 600);
        }
      });

      coins.forEach((cn) => {
        cn.ph += dt * 4;
        if (!cn.got && M.dist(cn.x, cn.y, hero.x, hero.y) < 26) {
          cn.got = true; score += 100;
          E.sfx('coin'); E.floaters.add(cn.x, cn.y, '+100', { col: P.c });
          hud();
        }
      });

      if (hero.y > camY + H + 150) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'Te quedaste atrás' }), 500);
      }
      if (Math.floor(height) !== Math.floor(height - 0.1)) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.2), P.deep);
      c.save(); c.translate(0, -camY);

      /* paredes */
      const y0 = camY - 40, y1 = camY + H + 40;
      g.rect(0, y0, WALL, y1 - y0, mix(P.dim, P.deep, 0.55));
      g.rect(W - WALL, y0, WALL, y1 - y0, mix(P.dim, P.deep, 0.55));
      for (let y = Math.floor(y0 / 44) * 44; y < y1; y += 44) {
        g.rect(0, y, WALL, 3, alpha('#000', 0.25));
        g.rect(W - WALL, y + 22, WALL, 3, alpha('#000', 0.25));
      }
      g.rect(WALL - 3, y0, 3, y1 - y0, alpha(P.c, 0.4));
      g.rect(W - WALL, y0, 3, y1 - y0, alpha(P.c, 0.4));

      coins.forEach((cn) => {
        if (cn.got) return;
        g.bloom(cn.x, cn.y, 20, P.c, 0.5);
        G.Sprites.coin(g, cn.x, cn.y, 11, cn.ph, P.c, mix(P.c, '#000', 0.3));
      });

      saws.forEach((s) => {
        g.push(s.x, s.y, s.rot);
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * M.TAU;
          g.poly([Math.cos(a) * s.r, Math.sin(a) * s.r,
                  Math.cos(a + 0.18) * s.r * 0.62, Math.sin(a + 0.18) * s.r * 0.62,
                  Math.cos(a - 0.18) * s.r * 0.62, Math.sin(a - 0.18) * s.r * 0.62], '#ff4d6d');
        }
        g.circle(0, 0, s.r * 0.62, mix('#ff4d6d', P.deep, 0.35));
        g.circle(0, 0, s.r * 0.2, P.ink);
        g.pop();
      });

      g.push(hero.x, hero.y, hero.rot);
      g.bloom(0, 0, 30, P.a, 0.35);
      g.rrect(-hero.r, -hero.r, hero.r * 2, hero.r * 2, 6, P.a);
      g.rect(-hero.r + 2, -5, hero.r * 2 - 4, 6, P.deep);
      g.pop();
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(height) + ' m', W / 2, 46, {
        size: 32, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.c, 0.4), shadowBlur: 14,
      });
      if (warm > 0) E.ui.title('Salta de pared en pared', W / 2, 108, { size: 28 });
      E.ui.hint('Espacio o toca para saltar de pared', { bottom: 16 });
    },
  };
});
