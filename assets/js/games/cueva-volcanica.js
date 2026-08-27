/* Cueva Volcánica — vuela por una gruta que se estrecha sin rozar la roca. */
NX.game('cueva-volcanica', {
  w: 900, h: 540, pal: 'ember',
  controls: { buttons: [{ k: 'space', label: 'ALETEAR' }] },
  music: { root: 40, scale: 'minor', bpm: 122, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1450, FLAP = -430;

  let hero, cave, stal, gems, dist, speed, alive, score, seed, phase;

  function caveAt(x) {
    const n = Math.sin(x * 0.0032) * 0.6 + Math.sin(x * 0.0071 + 1.7) * 0.3 + Math.sin(x * 0.0135) * 0.12;
    const mid = H / 2 + n * (H * 0.24);
    const tight = M.clamp(H * 0.42 - dist * 0.22, H * 0.17, H * 0.42);
    return { top: mid - tight / 2, bot: mid + tight / 2 };
  }

  function reset() {
    hero = { x: 200, y: H / 2, vy: 0, rot: 0 };
    stal = []; gems = []; dist = 0; speed = 250; alive = true; score = 0; phase = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Distancia: Math.round(dist) + ' m' }); }

  function die() {
    alive = false;
    E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.5);
    E.particles.burst(hero.x, hero.y, 30, { col: [P.a, P.c], speed1: 300, add: true });
    setTimeout(() => E.api.over({ score, msg: Math.round(dist) + ' metros de cueva', stats: { Distancia: Math.round(dist) + ' m' } }), 600);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      speed = Math.min(560, speed + dt * 8);
      dist += speed * dt / 26;
      score += speed * dt * 0.05;
      phase += speed * dt;

      if (E.input.pressed('space') || E.input.pressed('up') || E.input.pointer.pressed) {
        hero.vy = FLAP;
        E.sfx('hop');
        E.particles.burst(hero.x - 10, hero.y + 6, 5, { col: [P.c, P.b], speed1: 110, angle: Math.PI * 0.75, spread: 0.7, add: true });
      }
      hero.vy += GRAV * dt;
      hero.y += hero.vy * dt;
      hero.rot = M.clamp(hero.vy / 900, -0.5, 0.8);

      const at = caveAt(phase + hero.x);
      if (hero.y - 13 < at.top || hero.y + 13 > at.bot) return die();

      /* estalactitas ocasionales */
      if (E.rng.bool(dt * 1.4)) {
        const x = phase + W + 60;
        const c = caveAt(x);
        const fromTop = E.rng.bool();
        const len = E.rng.float(30, (c.bot - c.top) * 0.45);
        stal.push({ wx: x, fromTop, len, w: 22 });
      }
      for (let i = stal.length - 1; i >= 0; i--) {
        const s = stal[i];
        if (s.wx < phase - 60) { stal.splice(i, 1); continue; }
        const sx = s.wx - phase;
        const c = caveAt(s.wx);
        const y0 = s.fromTop ? c.top : c.bot - s.len;
        if (Math.abs(sx - hero.x) < s.w / 2 + 10 && hero.y + 12 > y0 && hero.y - 12 < y0 + s.len) return die();
      }

      if (E.rng.bool(dt * 1.1)) {
        const x = phase + W + 40;
        const c = caveAt(x);
        gems.push({ wx: x, y: E.rng.float(c.top + 30, c.bot - 30), ph: 0 });
      }
      for (let i = gems.length - 1; i >= 0; i--) {
        const gm = gems[i];
        gm.ph += dt * 5;
        const gx = gm.wx - phase;
        if (gx < -30) { gems.splice(i, 1); continue; }
        if (M.dist(gx, gm.y, hero.x, hero.y) < 26) {
          gems.splice(i, 1); score += 90;
          E.sfx('gem'); E.floaters.add(gx, gm.y, '+90', { col: P.c });
        }
      }
      if (Math.random() < dt * 6) {
        E.particles.spawn({ x: E.rng.float(0, W), y: H + 10, vx: E.rng.float(-10, 10), vy: -E.rng.float(20, 60),
          life: 2.4, r: E.rng.float(1, 3), col: alpha(P.c, 0.6), add: true });
      }
      if (Math.floor(dist) % 4 === 0) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.a, 0.14), P.deep);

      const path = [];
      for (let x = -20; x <= W + 20; x += 10) path.push({ x, c: caveAt(phase + x) });

      c.fillStyle = mix(P.deep, P.d, 0.45);
      c.beginPath(); c.moveTo(-20, -10);
      path.forEach((p) => c.lineTo(p.x, p.c.top));
      c.lineTo(W + 20, -10); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-20, H + 10);
      path.forEach((p) => c.lineTo(p.x, p.c.bot));
      c.lineTo(W + 20, H + 10); c.closePath(); c.fill();

      c.strokeStyle = alpha(P.c, 0.75); c.lineWidth = 3;
      c.beginPath(); path.forEach((p, i) => (i ? c.lineTo(p.x, p.c.top) : c.moveTo(p.x, p.c.top))); c.stroke();
      c.beginPath(); path.forEach((p, i) => (i ? c.lineTo(p.x, p.c.bot) : c.moveTo(p.x, p.c.bot))); c.stroke();

      stal.forEach((s) => {
        const sx = s.wx - phase;
        if (sx < -40 || sx > W + 40) return;
        const cc = caveAt(s.wx);
        const y0 = s.fromTop ? cc.top : cc.bot;
        const dir = s.fromTop ? 1 : -1;
        g.poly([sx - s.w / 2, y0, sx + s.w / 2, y0, sx, y0 + dir * s.len], mix(P.dim, P.deep, 0.3));
        g.polyStroke([sx - s.w / 2, y0, sx + s.w / 2, y0, sx, y0 + dir * s.len], alpha(P.c, 0.5), 1.5, true);
      });

      gems.forEach((gm) => {
        const gx = gm.wx - phase;
        g.bloom(gx, gm.y, 20, P.b, 0.5);
        g.ngon(gx, gm.y, 10, 6, gm.ph * 0.4, P.b);
      });

      g.push(hero.x, hero.y, hero.rot);
      g.bloom(0, 0, 32, P.c, 0.35);
      g.circle(0, 0, 13, P.c);
      g.poly([-4, -2, -22, -9, -19, 5], alpha(P.b, 0.9));
      g.circle(5, -3, 3.5, P.deep);
      g.pop();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(dist) + ' m', W / 2, 46, {
        size: 28, align: 'center', weight: 900, color: alpha(P.ink, 0.9), mono: true,
      });
      E.ui.hint('Espacio o toca para aletear', { bottom: 14 });
    },
  };
});
