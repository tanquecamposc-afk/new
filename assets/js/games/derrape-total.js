/* Derrape Total — encadena derrapes sin chocar y multiplica la puntuación. */
NX.game('derrape-total', {
  w: 880, h: 620, pal: 'sunset',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'FRENO' }] },
  music: { root: 43, scale: 'minor', bpm: 136, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let car, cones, marks, score, driftScore, mult, driftT, alive, t, timeLeft, best;

  function reset() {
    car = { x: W / 2, y: H / 2, a: 0, vx: 0, vy: 0, sp: 0, drift: 0 };
    cones = [];
    for (let i = 0; i < 14; i++) {
      cones.push({ x: E.rng.float(60, W - 60), y: E.rng.float(60, H - 60), hit: 0 });
    }
    marks = []; score = 0; driftScore = 0; mult = 1; driftT = 0; alive = true; t = 0; timeLeft = 75; best = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Combo: '×' + mult, Derrape: Math.round(driftScore), Tiempo: Math.ceil(timeLeft) });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score: Math.round(score), msg: 'Mejor combo ×' + best, stats: { 'Mejor combo': '×' + best } }), 500);
        return;
      }

      const ax = E.input.axis();
      const brake = E.input.down('space') || E.input.down('shift');
      const accel = E.input.down('up') || ax.y < -0.3 || E.input.pointer.down ? 1 : (E.input.down('down') ? -0.6 : 0.2);

      car.a += ax.x * (2.6 - Math.min(1.4, car.sp / 240)) * dt;
      car.sp = M.damp(car.sp, accel * 340, accel > 0 ? 1.5 : 2.6, dt);
      const fx = Math.cos(car.a) * car.sp, fy = Math.sin(car.a) * car.sp;
      const grip = brake ? 0.9 : 3.6;
      car.vx = M.damp(car.vx, fx, grip, dt);
      car.vy = M.damp(car.vy, fy, grip, dt);
      car.x += car.vx * dt; car.y += car.vy * dt;

      if (car.x < 30) { car.x = 30; car.vx = Math.abs(car.vx) * 0.4; }
      if (car.x > W - 30) { car.x = W - 30; car.vx = -Math.abs(car.vx) * 0.4; }
      if (car.y < 30) { car.y = 30; car.vy = Math.abs(car.vy) * 0.4; }
      if (car.y > H - 30) { car.y = H - 30; car.vy = -Math.abs(car.vy) * 0.4; }

      const side = Math.abs(Math.cos(car.a) * car.vy - Math.sin(car.a) * car.vx);
      car.drift = M.clamp01(side / 190);
      const speedK = Math.hypot(car.vx, car.vy);

      if (car.drift > 0.32 && speedK > 90) {
        driftT += dt;
        driftScore += car.drift * speedK * dt * 0.4;
        if (driftT > 1.2 && Math.floor(driftT) !== Math.floor(driftT - dt)) {
          mult = Math.min(10, mult + 1);
          best = Math.max(best, mult);
          E.sfx('combo', mult);
        }
        marks.push({ x: car.x, y: car.y, a: car.a, t: 0 });
        if (Math.random() < 0.4) E.particles.trail(car.x, car.y, { col: alpha('#c8d0dd', 0.5), r: 4, life: 0.7, add: false });
      } else if (driftT > 0) {
        if (driftScore > 30) {
          const pts = Math.round(driftScore * mult);
          score += pts;
          E.floaters.add(car.x, car.y - 30, '+' + pts, { col: P.c, size: 18 + Math.min(16, mult * 2) });
          E.sfx('coin');
        }
        driftScore = 0; driftT = 0; mult = 1;
        hud();
      }

      cones.forEach((cn) => {
        if (cn.hit > 0) { cn.hit -= dt; return; }
        if (M.dist(cn.x, cn.y, car.x, car.y) < 26) {
          cn.hit = 2.4;
          score = Math.max(0, score - 200);
          driftScore = 0; driftT = 0; mult = 1;
          E.sfx('hit'); E.camera.kick(8);
          E.particles.burst(cn.x, cn.y, 12, { col: ['#ff8a3d'], speed1: 200 });
          hud();
        }
      });

      marks.forEach((m) => { m.t += dt; });
      for (let i = marks.length - 1; i >= 0; i--) if (marks[i].t > 4) marks.splice(i, 1);
      if (marks.length > 400) marks.splice(0, marks.length - 400);
      hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgTurf(E.t, '#2b2f3d', 0.035, 58);
      g.bgGrid(60, alpha(P.a, 0.05), 1, 0, 0);
      g.rrectStroke(20, 20, W - 40, H - 40, 20, alpha(P.c, 0.35), 3);

      c.save();
      marks.forEach((m) => {
        c.globalAlpha = 0.28 * (1 - m.t / 4);
        g.push(m.x, m.y, m.a);
        g.rect(-12, -11, 22, 4, '#0a0d14');
        g.rect(-12, 7, 22, 4, '#0a0d14');
        g.pop();
      });
      c.restore();

      cones.forEach((cn) => {
        if (cn.hit > 0) {
          c.save(); c.globalAlpha = 0.35;
          g.push(cn.x, cn.y, cn.hit * 3);
          g.poly([0, -10, 9, 10, -9, 10], '#ff8a3d');
          g.pop(); c.restore();
          return;
        }
        g.poly([cn.x, cn.y - 14, cn.x + 11, cn.y + 12, cn.x - 11, cn.y + 12], '#ff8a3d');
        g.rect(cn.x - 8, cn.y + 1, 16, 4, '#f8fafc');
      });

      g.push(car.x, car.y, car.a);
      g.rrect(-22, -12, 44, 24, 7, P.c);
      g.rrect(-6, -9, 16, 18, 5, alpha('#0b1220', 0.8));
      g.rect(-18, -16, 10, 6, '#1b2437'); g.rect(-18, 10, 10, 6, '#1b2437');
      g.rect(9, -16, 10, 6, '#1b2437'); g.rect(9, 10, 10, 6, '#1b2437');
      g.pop();

      E.particles.draw(g);
      E.floaters.draw(g);

      if (driftT > 0.3) {
        g.text('¡DERRAPE! ×' + mult, W / 2, 60, {
          size: 26, align: 'center', weight: 900, color: P.c, shadow: P.c, shadowBlur: 18 });
        g.text('+' + Math.round(driftScore), W / 2, 90, { size: 20, align: 'center', weight: 800, color: P.ink, mono: true });
      }
      g.rrect(W / 2 - 130, H - 42, 260, 10, 5, 'rgba(255,255,255,.14)');
      g.rrect(W / 2 - 130, H - 42, 260 * M.clamp01(timeLeft / 75), 10, 5, timeLeft > 20 ? P.a : '#ff4d6d');
      E.ui.hint('↑ acelerar · ← → girar · Espacio freno de mano', { bottom: 14 });
    },
  };
});
