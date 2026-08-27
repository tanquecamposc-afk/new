/* Escalada Vertical — la pared sube contigo y los agarres se rompen. */
NX.game('escalada-vertical', {
  w: 480, h: 720, pal: 'ice',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'SALTO' }] },
  music: { root: 47, scale: 'minor', bpm: 112, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1600;

  let hero, holds, camY, rise, height, alive, score, wind, windT, flakes;

  function makeHold(y) {
    const kind = E.rng.weighted([[0, 10], [1, height > 30 ? 4 : 1], [2, height > 60 ? 3 : 0]]);
    return { x: E.rng.float(50, W - 110), y, w: 60, kind, hp: kind === 1 ? 1 : 99, t: 0, vx: kind === 2 ? E.rng.sign() * 70 : 0 };
  }

  function reset() {
    hero = { x: W / 2, y: H - 120, vx: 0, vy: 0, r: 15, onGround: false };
    holds = [{ x: W / 2 - 40, y: H - 90, w: 80, kind: 0, hp: 99, t: 0, vx: 0 }];
    let y = H - 90;
    for (let i = 0; i < 16; i++) { y -= E.rng.float(74, 108); holds.push(makeHold(y)); }
    camY = 0; rise = 26; height = 0; alive = true; score = 0; wind = 0; windT = 2;
    flakes = [];
    for (let i = 0; i < 60; i++) flakes.push({ x: E.rng.float(0, W), y: E.rng.float(0, H), sp: E.rng.float(40, 120), r: E.rng.float(1, 2.6) });
    hud();
  }
  function hud() { E.api.hud({ Altura: Math.round(height) + ' m', Puntos: M.fmtScore(score), Viento: wind > 0 ? '→' : wind < 0 ? '←' : '—' }); }

  function die(txt) {
    alive = false;
    E.sfx('lose'); E.camera.kick(14);
    setTimeout(() => E.api.over({ score, msg: txt + ' · ' + Math.round(height) + ' m', stats: { Altura: Math.round(height) + ' m' } }), 500);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      rise = 26 + height * 0.25;
      camY -= rise * dt;
      height = Math.max(height, (H - 120 - hero.y) / 14);
      score = Math.round(height * 12);

      windT -= dt;
      if (windT <= 0) { windT = E.rng.float(3, 6); wind = E.rng.pick([-1, 0, 1]) * E.rng.float(40, 120); hud(); }

      const ax = E.input.axis().x;
      hero.vx = M.damp(hero.vx, ax * 250 + wind, hero.onGround ? 16 : 7, dt);
      hero.x = M.clamp(hero.x + hero.vx * dt, hero.r, W - hero.r);
      hero.vy += GRAV * dt;
      hero.y += hero.vy * dt;

      hero.onGround = false;
      holds.forEach((h2) => {
        if (h2.vx) { h2.x += h2.vx * dt; if (h2.x < 10 || h2.x + h2.w > W - 10) h2.vx *= -1; }
        if (h2.hp <= 0) return;
        if (hero.vy > 0 && hero.x + 10 > h2.x && hero.x - 10 < h2.x + h2.w &&
            hero.y + hero.r > h2.y && hero.y + hero.r < h2.y + 24) {
          hero.y = h2.y - hero.r; hero.vy = 0; hero.onGround = true;
          if (h2.kind === 1) { h2.t += dt; if (h2.t > 0.55) { h2.hp = 0; E.sfx('land'); E.particles.burst(h2.x + h2.w / 2, h2.y, 8, { col: [P.b], speed1: 120, grav: 400 }); } }
          if (h2.vx) hero.x += h2.vx * dt;
        }
      });

      if (hero.onGround && (E.input.pressed('space') || E.input.pressed('up') || E.input.pointer.pressed)) {
        hero.vy = -640;
        E.sfx('jump');
        E.particles.burst(hero.x, hero.y + hero.r, 6, { col: [P.a], speed1: 120, angle: Math.PI / 2, spread: 0.7 });
      }

      while (holds[holds.length - 1].y > camY - 200) {
        holds.push(makeHold(holds[holds.length - 1].y - E.rng.float(74, 112)));
      }
      holds = holds.filter((h2) => h2.y < camY + H + 80);

      flakes.forEach((f) => {
        f.y += f.sp * dt; f.x += wind * dt * 0.3;
        if (f.y > camY + H) { f.y = camY - 10; f.x = E.rng.float(0, W); }
        if (f.x < -10) f.x = W + 5; if (f.x > W + 10) f.x = -5;
      });

      if (hero.y > camY + H + 40) die('Te quedaste abajo');
      if (Math.floor(height) !== Math.floor(height - 0.05)) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      c.save(); c.translate(0, -camY);

      /* pared */
      g.rect(0, camY - 20, 30, H + 60, mix(P.dim, P.deep, 0.6));
      g.rect(W - 30, camY - 20, 30, H + 60, mix(P.dim, P.deep, 0.6));

      flakes.forEach((f) => g.circle(f.x, f.y, f.r, alpha('#ffffff', 0.45)));

      holds.forEach((h2) => {
        if (h2.hp <= 0) return;
        const col = h2.kind === 1 ? P.c : h2.kind === 2 ? P.b : P.a;
        const shake = h2.kind === 1 && h2.t > 0 ? Math.sin(h2.t * 40) * 3 : 0;
        g.rrect(h2.x + shake, h2.y, h2.w, 14, 6, col);
        g.rrect(h2.x + shake, h2.y, h2.w, 5, 6, alpha('#ffffff', 0.35));
        if (h2.kind === 1) {
          g.rrect(h2.x + shake, h2.y, h2.w * M.clamp01(1 - h2.t / 0.55), 3, 2, '#ff4d6d');
        }
      });

      g.push(hero.x, hero.y);
      g.bloom(0, 0, 30, P.a, 0.3);
      g.circle(0, 0, hero.r, P.ink);
      g.circle(0, -3, hero.r * 0.55, P.a);
      g.pop();
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(height) + ' m', W / 2, 48, {
        size: 32, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.4), shadowBlur: 14,
      });
      if (wind) {
        g.text(wind > 0 ? '→ viento' : 'viento ←', W / 2, 74, { size: 14, align: 'center', color: P.dim, weight: 700 });
      }
      E.ui.hint('← → moverte · Espacio saltar · los agarres amarillos se rompen', { bottom: 14 });
    },
  };
});
