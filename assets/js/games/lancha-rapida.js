/* Lancha Rápida — circuito marino con olas y boyas. */
NX.game('lancha-rapida', {
  w: 900, h: 600, pal: 'ocean',
  controls: { dpad: true },
  music: { root: 45, scale: 'dorian', bpm: 128, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let boat, buoys, next, lap, laps, t, alive, rivals, wake, msg, msgT;

  function reset() {
    buoys = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * M.TAU - Math.PI / 2;
      buoys.push({
        x: W / 2 + Math.cos(a) * W * 0.33, y: H / 2 + Math.sin(a) * H * 0.32, ph: E.rng.float(0, 6),
      });
    }
    boat = { x: buoys[0].x, y: buoys[0].y + 50, a: 0, vx: 0, vy: 0, sp: 0 };
    rivals = [];
    for (let i = 0; i < 3; i++) {
      rivals.push({ x: buoys[0].x + (i - 1) * 40, y: buoys[0].y + 90, a: 0, wp: 1, sp: 150 + i * 22, col: [P.a, P.b, P.c][i] });
    }
    next = 1; lap = 1; laps = 3; t = 0; alive = true; wake = []; msg = ''; msgT = 0;
    hud();
  }
  function hud() { E.api.hud({ Vuelta: lap + '/' + laps, Boya: next + 1, Tiempo: M.fmtMs(t) }); }

  function waveAt(x, y, tt) {
    return Math.sin(x * 0.012 + tt * 1.5) * 5 + Math.sin(y * 0.017 - tt * 1.1) * 4;
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      t += dt;

      const ax = E.input.axis();
      const accel = E.input.down('up') || ax.y < -0.3 || E.input.pointer.down ? 1 : (E.input.down('down') ? -0.4 : 0.15);
      boat.a += ax.x * (2.2 - Math.min(1.1, boat.sp / 200)) * dt;
      boat.sp = M.damp(boat.sp, accel * 300, 1.4, dt);
      const wv = waveAt(boat.x, boat.y, t);
      boat.vx = M.damp(boat.vx, Math.cos(boat.a) * boat.sp + wv * 2, 2.6, dt);
      boat.vy = M.damp(boat.vy, Math.sin(boat.a) * boat.sp + wv, 2.6, dt);
      boat.x = M.clamp(boat.x + boat.vx * dt, 30, W - 30);
      boat.y = M.clamp(boat.y + boat.vy * dt, 30, H - 30);

      if (boat.sp > 60 && Math.random() < 0.7) {
        wake.push({ x: boat.x - Math.cos(boat.a) * 20, y: boat.y - Math.sin(boat.a) * 20, t: 0, r: 5 });
      }
      wake.forEach((w) => { w.t += dt; w.r += dt * 22; });
      for (let i = wake.length - 1; i >= 0; i--) if (wake[i].t > 1.4) wake.splice(i, 1);

      rivals.forEach((r) => {
        const tg = buoys[r.wp];
        const ang = Math.atan2(tg.y - r.y, tg.x - r.x);
        r.a = M.dampAngle(r.a, ang, 3, dt);
        r.x += Math.cos(r.a) * r.sp * dt;
        r.y += Math.sin(r.a) * r.sp * dt;
        if (M.dist(r.x, r.y, tg.x, tg.y) < 60) r.wp = (r.wp + 1) % buoys.length;
      });

      const tg = buoys[next];
      buoys.forEach((b) => { b.ph += dt * 2; });
      if (M.dist(boat.x, boat.y, tg.x, tg.y) < 62) {
        E.sfx('blip', next);
        /* Espuma al rodear la boya y un anillo que se abre. */
        E.particles.burst(tg.x, tg.y, 22, {
          col: [P.c, '#ffffff', P.a], speed1: 220, life1: 0.7, add: true,
        });
        E.camera.kick(4);
        E.floaters.add(tg.x, tg.y - 34, String(next + 1), { col: P.c, size: 20 });
        next = (next + 1) % buoys.length;
        if (next === 1) {
          lap++;
          if (lap > laps) {
            alive = false;
            E.sfx('win');
            setTimeout(() => E.api.win({
              score: Math.round(t * 100), label: 'Centésimas', lower: true,
              fmt: (v) => M.fmtMs(v / 100),
              title: '¡Meta!', msg: laps + ' vueltas en ' + M.fmtMs(t),
              stats: { Tiempo: M.fmtMs(t) },
            }), 700);
            return;
          }
          msg = 'Vuelta ' + lap; msgT = 1.6;
          E.sfx('levelup');
          E.camera.kick(10); E.camera.flash(P.a, 0.22);
        }
        hud();
      }
      hud();
    },

    draw(g) {
      const c = g.ctx;
      c.fillStyle = g.linGrad(0, 0, 0, H, [[0, mix('#1c6ea4', P.deep, 0.35)], [1, mix('#0b3a5c', P.deep, 0.3)]]);
      c.fillRect(0, 0, W, H);
      c.save(); c.strokeStyle = alpha('#ffffff', 0.08); c.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const y = i * 46 + Math.sin(x * 0.02 + t * 1.4 + i) * 7;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      c.restore();

      c.save();
      wake.forEach((w) => {
        c.globalAlpha = 0.3 * (1 - w.t / 1.4);
        g.ring(w.x, w.y, w.r, 2, '#ffffff');
      });
      c.restore();

      buoys.forEach((b, i) => {
        const isNext = i === next;
        const y = b.y + Math.sin(b.ph) * 5;
        if (isNext) g.bloom(b.x, y, 60, P.c, 0.35);
        g.circle(b.x, y, 14, isNext ? P.c : '#ff8a3d');
        g.rect(b.x - 2, y - 34, 4, 22, alpha(P.ink, 0.7));
        g.circle(b.x, y - 36, 5, isNext ? P.c : alpha(P.ink, 0.6));
        g.text(String(i + 1), b.x, y + 5, { size: 12, align: 'center', weight: 900, color: '#0d1220' });
      });

      const drawBoat = (b, col) => {
        g.push(b.x, b.y, b.a);
        g.poly([26, 0, 6, -12, -20, -9, -20, 9, 6, 12], col);
        g.rrect(-10, -8, 18, 16, 5, alpha('#0b1220', 0.7));
        g.pop();
      };
      rivals.forEach((r) => drawBoat(r, r.col));
      drawBoat(boat, P.ink);

      /* guía */
      const tg = buoys[next];
      const ang = Math.atan2(tg.y - boat.y, tg.x - boat.x);
      c.save(); c.globalAlpha = 0.4;
      G.Sprites.arrow(g, boat.x + Math.cos(ang) * 40, boat.y + Math.sin(ang) * 40, 24, ang, P.c, 3);
      c.restore();

      E.particles.draw(g);
      g.text(M.fmtMs(t), W / 2, 42, {
        size: 24, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.4), shadowBlur: 12 });
      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.3, { size: 32 });
      E.ui.hint('↑ acelerar · ← → timón · rodea las boyas en orden', { bottom: 14 });
    },
  };
});
