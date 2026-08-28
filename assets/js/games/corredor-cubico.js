/* Corredor Cúbico — auto-runner: salta y deslízate al ritmo del nivel. */
NX.game('corredor-cubico', {
  w: 900, h: 520, pal: 'sunset',
  controls: { buttons: [{ k: 'up', label: 'SALTO' }, { k: 'down', label: 'AGACHA' }] },
  music: { root: 45, scale: 'dorian', bpm: 132, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 90, GRAV = 2400;

  let hero, obs, coins, dist, speed, alive, spawnX, score, combo, shieldT, warm;

  function reset() {
    hero = { x: 180, y: GY, vy: 0, h: 46, slide: 0, jumps: 0, rot: 0 };
    obs = []; coins = [];
    dist = 0; speed = 260; alive = true; spawnX = W + 760; score = 0; combo = 0; shieldT = 0;
    warm = 2.2;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Distancia: Math.round(dist) + ' m', Velocidad: Math.round(speed) });
  }

  function spawn() {
    const kind = E.rng.weighted([[0, 8], [1, 5], [2, 3], [3, dist > 300 ? 3 : 0]]);
    if (kind === 0) obs.push({ x: spawnX, y: GY - 40, w: 34, h: 40, kind: 0 });
    else if (kind === 1) obs.push({ x: spawnX, y: GY - 96, w: 60, h: 34, kind: 1 });
    else if (kind === 2) {
      obs.push({ x: spawnX, y: GY - 34, w: 30, h: 34, kind: 0 });
      obs.push({ x: spawnX + 52, y: GY - 34, w: 30, h: 34, kind: 0 });
    } else obs.push({ x: spawnX, y: GY - 70, w: 26, h: 70, kind: 2, ph: 0 });
    for (let i = 0; i < E.rng.range(0, 4); i++) {
      coins.push({ x: spawnX + 120 + i * 40, y: GY - 70 - E.rng.range(0, 2) * 40, ph: 0, got: false });
    }
    spawnX += E.rng.float(230, 380) - Math.min(120, speed * 0.15);
  }

  function die() {
    alive = false;
    E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.5);
    E.particles.burst(hero.x, hero.y - 20, 30, { col: [P.a, P.c], speed1: 300, add: true });
    setTimeout(() => E.api.over({
      score, msg: 'Recorriste ' + Math.round(dist) + ' metros', stats: { Distancia: Math.round(dist) + ' m' },
    }), 600);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (warm > 0) warm -= dt;
      speed = Math.min(760, speed + dt * (warm > 0 ? 22 : 9));
      dist += speed * dt / 26;
      score += speed * dt * 0.06;
      if (shieldT > 0) shieldT -= dt;

      const up = E.input.pressed('up') || E.input.pressed('space') ||
        (E.input.pointer.pressed && E.input.pointer.y < H * 0.6);
      const down = E.input.down('down') || (E.input.pointer.down && E.input.pointer.y >= H * 0.6);

      if (up && hero.jumps < 2) {
        hero.vy = hero.jumps === 0 ? -880 : -720;
        hero.jumps++;
        E.sfx('jump');
        E.particles.burst(hero.x, hero.y, 8, { col: [P.c], speed1: 130, angle: Math.PI / 2, spread: 0.9, add: true });
      }
      hero.slide = M.damp(hero.slide, down && hero.y >= GY - 1 ? 1 : 0, 18, dt);
      hero.h = M.lerp(46, 24, hero.slide);

      hero.vy += GRAV * dt;
      hero.y += hero.vy * dt;
      if (hero.y >= GY) { if (hero.jumps) E.sfx('land'); hero.y = GY; hero.vy = 0; hero.jumps = 0; }
      hero.rot = hero.y < GY ? hero.rot + dt * 6 : 0;

      while (spawnX < W + 300) spawn();
      const dx = speed * dt;
      spawnX -= dx;

      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        o.x -= dx;
        if (o.kind === 2) { o.ph = (o.ph || 0) + dt * 3; o.y = GY - 70 + Math.sin(o.ph) * 26; }
        if (o.x < -80) { obs.splice(i, 1); combo++; continue; }
        const hx = hero.x - 15, hy = hero.y - hero.h, hw = 30, hh = hero.h;
        if (hx < o.x + o.w && hx + hw > o.x && hy < o.y + o.h && hy + hh > o.y) {
          if (shieldT > 0) {
            shieldT = 0; obs.splice(i, 1);
            E.sfx('shield'); E.particles.burst(hero.x, hero.y - 20, 16, { col: [P.b], speed1: 220, add: true });
          } else return die();
        }
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        const cn = coins[i];
        cn.x -= dx; cn.ph += dt * 5;
        if (cn.x < -40) { coins.splice(i, 1); continue; }
        if (!cn.got && Math.abs(cn.x - hero.x) < 26 && Math.abs(cn.y - (hero.y - hero.h / 2)) < 34) {
          cn.got = true; coins.splice(i, 1);
          score += 50; E.sfx('coin');
          E.floaters.add(cn.x, cn.y, '+50', { col: P.c, size: 15 });
        }
      }
      if (Math.floor(dist) % 5 === 0) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.4), P.deep);
      /* parallax */
      for (let L = 0; L < 3; L++) {
        const sp = [0.16, 0.34, 0.6][L];
        const off = (dist * 26 * sp) % 240;
        for (let i = -1; i < W / 240 + 2; i++) {
          const x = i * 240 - off;
          const hh = [110, 76, 48][L];
          g.rrect(x + 20, GY - hh - L * 4, 90, hh, 6, alpha(mix(P.d, P.deep, 0.2 + L * 0.2), 0.85 - L * 0.2));
          g.rrect(x + 130, GY - hh * 0.6, 60, hh * 0.6, 5, alpha(mix(P.d, P.deep, 0.3 + L * 0.2), 0.8 - L * 0.2));
        }
      }

      g.rect(0, GY, W, H - GY, mix(P.d, P.deep, 0.55));
      g.rect(0, GY, W, 3, alpha(P.c, 0.7));
      const off = (dist * 26) % 60;
      for (let x = -off; x < W; x += 60) g.rect(x, GY + 18, 30, 3, alpha(P.ink, 0.14));

      coins.forEach((cn) => {
        g.bloom(cn.x, cn.y, 18, P.c, 0.45);
        G.Sprites.coin(g, cn.x, cn.y, 10, cn.ph, P.c, mix(P.c, '#000', 0.3));
      });

      obs.forEach((o) => {
        const col = o.kind === 2 ? '#ff4d6d' : o.kind === 1 ? P.b : P.a;
        g.rrect(o.x, o.y, o.w, o.h, 5, col);
        g.rrect(o.x, o.y, o.w, Math.min(8, o.h * 0.3), 5, alpha('#ffffff', 0.25));
        if (o.kind === 1) {
          for (let k = 0; k < 3; k++) g.poly([o.x + 8 + k * 20, o.y + o.h, o.x + 16 + k * 20, o.y + o.h + 12, o.x + 24 + k * 20, o.y + o.h], col);
        }
      });

      /* héroe */
      g.push(hero.x, hero.y - hero.h / 2, hero.rot * 0.3);
      g.bloom(0, 0, 36, P.c, 0.3);
      g.rrect(-16, -hero.h / 2, 32, hero.h, 8, P.c);
      g.rect(-9, -hero.h / 2 + 8, 18, 6, P.deep);
      g.pop();
      if (shieldT > 0) g.ring(hero.x, hero.y - 24, 30, 2.5, alpha(P.b, M.clamp01(shieldT / 2)));

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(M.fmtScore(Math.round(score)), W / 2, 46, {
        size: 30, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.c, 0.4), shadowBlur: 14,
      });
      if (warm > 0) E.ui.title('¡Prepárate!', W / 2, 120, { size: 34 });
      E.ui.hint('↑ saltar (doble salto) · ↓ deslizarte', { bottom: 14 });
    },
  };
});
