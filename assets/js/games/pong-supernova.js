/* Pong Supernova — la bola coge efecto según cómo la golpees y la IA se adapta. */
NX.game('pong-supernova', {
  w: 900, h: 560, pal: 'ocean',
  controls: { dpad: true },
  music: { root: 45, scale: 'penta', bpm: 100, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const PH = 96, PW = 14, GOAL = 7;

  let me, cpu, ball, sMe, sCpu, alive, serveT, rally, bestRally, aiSkill, trail;

  function serve(dir) {
    ball = { x: W / 2, y: H / 2, vx: dir * 340, vy: E.rng.float(-160, 160), spin: 0, r: 9 };
    serveT = 0.9; rally = 0;
    trail = [];
  }
  function reset() {
    me = { y: H / 2, vy: 0 }; cpu = { y: H / 2, vy: 0, target: H / 2, react: 0 };
    sMe = 0; sCpu = 0; alive = true; bestRally = 0; aiSkill = 0.62;
    serve(E.rng.sign());
    hud();
  }
  function hud() { E.api.hud({ Tú: sMe, Máquina: sCpu, Peloteo: rally, Mejor: bestRally }); }

  function point(who) {
    if (who === 'me') { sMe++; E.sfx('win'); E.camera.flash(P.a, 0.2); }
    else { sCpu++; E.sfx('lose'); E.camera.flash('#ff4d6d', 0.25); aiSkill = Math.max(0.5, aiSkill - 0.03); }
    bestRally = Math.max(bestRally, rally);
    hud();
    if (sMe >= GOAL || sCpu >= GOAL) {
      alive = false;
      const won = sMe >= GOAL;
      setTimeout(() => {
        const o = { score: sMe * 100 + bestRally * 10, msg: won ? 'Ganaste ' + sMe + '-' + sCpu : 'Perdiste ' + sMe + '-' + sCpu,
          stats: { Marcador: sMe + ' – ' + sCpu, 'Mejor peloteo': bestRally } };
        won ? E.api.win(o) : E.api.over(o);
      }, 700);
      return;
    }
    serve(who === 'me' ? -1 : 1);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (serveT > 0) { serveT -= dt; }

      const ax = E.input.axis().y;
      const p = E.input.pointer;
      if (p.down || p.inside) me.y = M.damp(me.y, p.y, 22, dt);
      me.y = M.clamp(me.y + ax * 520 * dt, PH / 2, H - PH / 2);

      /* la IA predice el rebote, pero con error */
      cpu.react -= dt;
      if (cpu.react <= 0) {
        cpu.react = M.lerp(0.22, 0.06, aiSkill);
        if (ball.vx > 0) {
          let py = ball.y, pvy = ball.vy, px = ball.x;
          for (let i = 0; i < 90 && px < W - 40; i++) {
            px += ball.vx * 0.016; py += pvy * 0.016;
            if (py < 12 || py > H - 12) pvy *= -1;
          }
          cpu.target = py + E.rng.float(-1, 1) * (1 - aiSkill) * 150;
        } else cpu.target = H / 2 + E.rng.float(-60, 60);
      }
      const cspeed = M.lerp(260, 520, aiSkill);
      cpu.y = M.clamp(M.approach(cpu.y, cpu.target, cspeed * dt), PH / 2, H - PH / 2);

      if (serveT > 0) return;

      const steps = 3;
      for (let s = 0; s < steps; s++) {
        ball.vy += ball.spin * 46 * dt / steps;
        ball.spin *= Math.exp(-0.7 * dt / steps);
        ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
        if (ball.y < ball.r + 8) { ball.y = ball.r + 8; ball.vy = Math.abs(ball.vy); ball.spin *= -0.5; E.sfx('pong'); }
        if (ball.y > H - ball.r - 8) { ball.y = H - ball.r - 8; ball.vy = -Math.abs(ball.vy); ball.spin *= -0.5; E.sfx('pong'); }

        if (ball.vx < 0 && ball.x - ball.r < 46 && ball.x > 20 && Math.abs(ball.y - me.y) < PH / 2 + ball.r) {
          ball.x = 46 + ball.r;
          hitPaddle(me, 1);
        }
        if (ball.vx > 0 && ball.x + ball.r > W - 46 && ball.x < W - 20 && Math.abs(ball.y - cpu.y) < PH / 2 + ball.r) {
          ball.x = W - 46 - ball.r;
          hitPaddle(cpu, -1);
        }
      }
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 12) trail.shift();

      if (ball.x < -30) point('cpu');
      else if (ball.x > W + 30) point('me');

      function hitPaddle(pad, dir) {
        rally++;
        const off = (ball.y - pad.y) / (PH / 2);
        const sp = Math.min(720, Math.abs(ball.vx) * 1.06 + 14);
        ball.vx = dir * sp;
        ball.vy += off * 190;
        ball.spin = off * 3.4 + (pad === me ? (E.input.axis().y * 2) : 0);
        E.sfx('bounce'); E.camera.kick(3);
        E.particles.burst(ball.x, ball.y, 8, { col: [dir > 0 ? P.a : P.b, '#fff'], speed1: 180, life1: 0.4, add: true });
        if (pad === cpu) aiSkill = Math.min(0.95, aiSkill + 0.004);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 10);
      c.save(); c.setLineDash([10, 14]);
      g.line(W / 2, 16, W / 2, H - 16, alpha(P.ink, 0.2), 3);
      c.restore();
      g.rect(0, 6, W, 3, alpha(P.a, 0.3));
      g.rect(0, H - 9, W, 3, alpha(P.a, 0.3));

      g.text(String(sMe), W / 2 - 70, 74, { size: 56, align: 'center', weight: 900, color: alpha(P.a, 0.45) });
      g.text(String(sCpu), W / 2 + 70, 74, { size: 56, align: 'center', weight: 900, color: alpha(P.b, 0.45) });

      c.save(); c.globalCompositeOperation = 'lighter';
      trail.forEach((t, i) => g.circle(t.x, t.y, ball.r * (i / trail.length), alpha(P.c, 0.12)));
      c.restore();

      g.bloom(32, me.y, 60, P.a, 0.3);
      g.rrect(24, me.y - PH / 2, PW, PH, 7, P.a);
      g.bloom(W - 32, cpu.y, 60, P.b, 0.3);
      g.rrect(W - 24 - PW, cpu.y - PH / 2, PW, PH, 7, P.b);

      g.bloom(ball.x, ball.y, 32, P.c, 0.6);
      g.circle(ball.x, ball.y, ball.r, '#ffffff');
      if (Math.abs(ball.spin) > 0.5) {
        g.ring(ball.x, ball.y, ball.r + 5, 1.6, alpha(P.c, M.clamp01(Math.abs(ball.spin) / 4)),
          E.t * ball.spin, E.t * ball.spin + 2.4);
      }

      E.particles.draw(g);
      if (serveT > 0) {
        E.ui.title(Math.ceil(serveT) > 0 ? '¡Preparado!' : '', W / 2, H / 2 - 40, { size: 34 });
      }
      E.ui.hint('W/S o arrastra · el golpe lateral da efecto · primero a ' + GOAL, { bottom: 16 });
    },
  };
});
