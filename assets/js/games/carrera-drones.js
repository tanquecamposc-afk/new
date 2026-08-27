/* Carrera de Drones — cruza todos los aros en orden; el dron tiene inercia. */
NX.game('carrera-drones', {
  w: 900, h: 600, pal: 'ice',
  controls: { stick: true },
  music: { root: 47, scale: 'penta', bpm: 132, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let drone, rings, next, t, alive, lap, laps, bestLap, lapStart, msg, msgT;

  function reset() {
    drone = { x: W / 2, y: H - 100, vx: 0, vy: 0, a: 0, tilt: 0 };
    rings = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * M.TAU - Math.PI / 2;
      rings.push({
        x: W / 2 + Math.cos(a) * (W * 0.32) + E.rng.float(-40, 40),
        y: H / 2 + Math.sin(a) * (H * 0.3) + E.rng.float(-30, 30),
        r: 44, ph: E.rng.float(0, 6), a: E.rng.float(0, M.TAU),
      });
    }
    next = 0; t = 0; alive = true; lap = 1; laps = 3; bestLap = 0; lapStart = 0; msg = ''; msgT = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Vuelta: lap + '/' + laps, Aro: (next + 1) + '/' + rings.length, Tiempo: M.fmtMs(t) });
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      t += dt;

      const ax = E.input.axis();
      const p = E.input.pointer;
      let tx = ax.x, ty = ax.y;
      if (p.down) {
        tx = M.clamp((p.x - drone.x) / 160, -1, 1);
        ty = M.clamp((p.y - drone.y) / 160, -1, 1);
      }
      drone.vx += tx * 700 * dt;
      drone.vy += ty * 700 * dt;
      drone.vx *= Math.exp(-1.5 * dt); drone.vy *= Math.exp(-1.5 * dt);
      drone.x = M.clamp(drone.x + drone.vx * dt, 24, W - 24);
      drone.y = M.clamp(drone.y + drone.vy * dt, 24, H - 24);
      drone.tilt = M.damp(drone.tilt, tx * 0.4, 8, dt);
      if (Math.hypot(drone.vx, drone.vy) > 120 && Math.random() < 0.5) {
        E.particles.trail(drone.x, drone.y + 8, { col: alpha(P.a, 0.6), r: 3, life: 0.3 });
      }

      rings.forEach((r) => { r.ph += dt * 1.4; });
      const target = rings[next];
      if (M.dist(drone.x, drone.y, target.x, target.y) < target.r * 0.8) {
        E.sfx('blip', next);
        E.particles.burst(target.x, target.y, 12, { col: [P.c, P.a], speed1: 200, add: true });
        E.camera.kick(3);
        next++;
        if (next >= rings.length) {
          next = 0;
          const lapTime = t - lapStart;
          if (!bestLap || lapTime < bestLap) bestLap = lapTime;
          lapStart = t;
          lap++;
          msg = 'Vuelta ' + (lap - 1) + ': ' + M.fmtMs(lapTime); msgT = 2;
          E.sfx('levelup');
          if (lap > laps) {
            alive = false;
            setTimeout(() => E.api.win({
              score: Math.round(t * 100), label: 'Centésimas', lower: true,
              fmt: (v) => M.fmtMs(v / 100),
              title: '¡Carrera completada!',
              msg: laps + ' vueltas en ' + M.fmtMs(t) + ' · mejor vuelta ' + M.fmtMs(bestLap),
              stats: { Total: M.fmtMs(t), 'Mejor vuelta': M.fmtMs(bestLap) },
            }), 700);
            return;
          }
        }
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.bgGrid(50, alpha(P.a, 0.06), 1, 0, 0);

      rings.forEach((r, i) => {
        const isNext = i === next;
        const after = (i - next + rings.length) % rings.length;
        const col = isNext ? P.c : after < 2 ? P.a : alpha(P.dim, 0.4);
        c.save();
        c.translate(r.x, r.y);
        c.scale(1, 0.72 + Math.sin(r.ph) * 0.12);
        if (isNext) g.bloom(0, 0, r.r * 2, P.c, 0.35);
        g.ring(0, 0, r.r, isNext ? 7 : 5, col);
        g.ring(0, 0, r.r - 7, 1.5, alpha(col, 0.4));
        c.restore();
        g.text(String(i + 1), r.x, r.y + 6, {
          size: 18, align: 'center', weight: 900, color: isNext ? P.c : alpha(P.ink, 0.4) });
      });

      /* guía al siguiente aro */
      const tg = rings[next];
      const ang = Math.atan2(tg.y - drone.y, tg.x - drone.x);
      c.save(); c.globalAlpha = 0.35;
      G.Sprites.arrow(g, drone.x + Math.cos(ang) * 44, drone.y + Math.sin(ang) * 44, 26, ang, P.c, 3);
      c.restore();

      g.push(drone.x, drone.y, drone.tilt);
      g.bloom(0, 0, 40, P.a, 0.3);
      g.rrect(-20, -7, 40, 14, 7, mix(P.d, P.ink, 0.2));
      [[-28, -14], [28, -14], [-28, 14], [28, 14]].forEach((q) => {
        c.save(); c.globalAlpha = 0.5;
        g.ring(q[0], q[1], 13, 2.5, P.a);
        c.restore();
        g.circle(q[0], q[1], 4, P.c);
      });
      g.circle(0, 0, 5, P.c);
      g.pop();

      E.particles.draw(g);
      g.text(M.fmtMs(t), W / 2, 42, {
        size: 26, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.4), shadowBlur: 12 });
      if (bestLap) g.text('Mejor vuelta ' + M.fmtMs(bestLap), W / 2, 66,
        { size: 13, align: 'center', color: P.dim, weight: 700 });
      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.3, { size: 30 });
      E.ui.hint('WASD o arrastra · cruza los aros en orden', { bottom: 14 });
    },
  };
});
