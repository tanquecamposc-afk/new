/* Tenis Rally — peloteo que se acelera con cada golpe. */
NX.game('tenis-rally', {
  w: 640, h: 700, pal: 'toxic',
  controls: { dpad: 'lr' },
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COURT = { x: 60, y: 70, w: W - 120, h: H - 150 };

  let me, cpu, ball, rally, best, sMe, sCpu, alive, serveT, aiSkill;

  function serve(dir) {
    ball = { x: W / 2, y: H / 2, vx: E.rng.float(-120, 120), vy: dir * 320, r: 9, spin: 0 };
    serveT = 0.8; rally = 0;
  }
  function reset() {
    me = { x: W / 2, w: 90 }; cpu = { x: W / 2, w: 90, t: 0 };
    sMe = 0; sCpu = 0; best = 0; alive = true; aiSkill = 0.62;
    serve(-1);
    hud();
  }
  function hud() { E.api.hud({ Tú: sMe, Rival: sCpu, Peloteo: rally, Mejor: best }); }

  function point(who) {
    best = Math.max(best, rally);
    if (who === 'me') { sMe++; E.sfx('win'); }
    else { sCpu++; E.sfx('lose'); aiSkill = Math.max(0.5, aiSkill - 0.02); }
    hud();
    if (sMe >= 7 || sCpu >= 7) {
      alive = false;
      const won = sMe >= 7;
      setTimeout(() => {
        const o = { score: sMe * 400 + best * 60, msg: (won ? 'Ganaste ' : 'Perdiste ') + sMe + '-' + sCpu,
          stats: { Marcador: sMe + ' – ' + sCpu, 'Mejor peloteo': best } };
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
      if (serveT > 0) { serveT -= dt; return; }

      const ax = E.input.axis().x;
      const p = E.input.pointer;
      if (p.down || p.inside) me.x = M.damp(me.x, p.x, 20, dt);
      me.x = M.clamp(me.x + ax * 520 * dt, COURT.x + me.w / 2, COURT.x + COURT.w - me.w / 2);

      cpu.t -= dt;
      if (cpu.t <= 0) {
        cpu.t = M.lerp(0.24, 0.07, aiSkill);
        cpu.target = ball.vy < 0 ? ball.x + E.rng.float(-1, 1) * (1 - aiSkill) * 120 : W / 2;
      }
      cpu.x = M.clamp(M.approach(cpu.x, cpu.target || W / 2, M.lerp(240, 480, aiSkill) * dt),
        COURT.x + cpu.w / 2, COURT.x + COURT.w - cpu.w / 2);

      ball.vx += ball.spin * 40 * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < COURT.x + ball.r) { ball.x = COURT.x + ball.r; ball.vx = Math.abs(ball.vx); E.sfx('pong'); }
      if (ball.x > COURT.x + COURT.w - ball.r) { ball.x = COURT.x + COURT.w - ball.r; ball.vx = -Math.abs(ball.vx); E.sfx('pong'); }

      const myY = H - 90, cpuY = 110;
      if (ball.vy > 0 && ball.y > myY - 12 && ball.y < myY + 22 && Math.abs(ball.x - me.x) < me.w / 2 + ball.r) {
        rally++;
        const off = (ball.x - me.x) / (me.w / 2);
        const sp = Math.min(760, Math.abs(ball.vy) * 1.05 + 16);
        ball.vy = -sp; ball.vx += off * 230; ball.spin = off * 2.6;
        E.sfx('bounce'); E.camera.kick(2);
        E.particles.burst(ball.x, ball.y, 6, { col: [P.c], speed1: 150, add: true });
        aiSkill = Math.min(0.94, aiSkill + 0.004);
        hud();
      }
      if (ball.vy < 0 && ball.y < cpuY + 12 && ball.y > cpuY - 22 && Math.abs(ball.x - cpu.x) < cpu.w / 2 + ball.r) {
        rally++;
        const off = (ball.x - cpu.x) / (cpu.w / 2);
        const sp = Math.min(760, Math.abs(ball.vy) * 1.05 + 16);
        ball.vy = sp; ball.vx += off * 210 + E.rng.float(-40, 40); ball.spin = off * 2.2;
        E.sfx('pong');
        hud();
      }

      if (ball.y > H + 30) point('cpu');
      else if (ball.y < -30) point('me');
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.rrect(COURT.x - 10, COURT.y - 10, COURT.w + 20, COURT.h + 20, 8, mix('#1f6f8b', P.deep, 0.4));
      c.strokeStyle = alpha('#ffffff', 0.65); c.lineWidth = 2.5;
      c.strokeRect(COURT.x, COURT.y, COURT.w, COURT.h);
      c.beginPath();
      c.moveTo(COURT.x, H / 2); c.lineTo(COURT.x + COURT.w, H / 2);
      c.moveTo(COURT.x + COURT.w / 2, COURT.y + 90); c.lineTo(COURT.x + COURT.w / 2, COURT.y + COURT.h - 90);
      c.stroke();
      c.setLineDash([4, 7]);
      c.beginPath(); c.moveTo(COURT.x, COURT.y + 90); c.lineTo(COURT.x + COURT.w, COURT.y + 90);
      c.moveTo(COURT.x, COURT.y + COURT.h - 90); c.lineTo(COURT.x + COURT.w, COURT.y + COURT.h - 90);
      c.stroke(); c.setLineDash([]);
      /* red */
      for (let x = COURT.x; x < COURT.x + COURT.w; x += 9) g.line(x, H / 2 - 8, x, H / 2 + 8, alpha('#ffffff', 0.25), 1);
      g.line(COURT.x, H / 2 - 9, COURT.x + COURT.w, H / 2 - 9, '#f2f6ff', 3);

      g.rrect(cpu.x - cpu.w / 2, 100, cpu.w, 14, 7, P.b);
      g.rrect(me.x - me.w / 2, H - 100, me.w, 14, 7, P.a);

      g.bloom(ball.x, ball.y, 26, '#d8f34a', 0.5);
      g.circle(ball.x, ball.y, ball.r, '#d8f34a');
      c.strokeStyle = alpha('#ffffff', 0.6); c.lineWidth = 1.4;
      c.beginPath(); c.arc(ball.x, ball.y, ball.r * 0.7, -0.6, 1.2); c.stroke();

      g.text(String(sCpu), 34, 60, { size: 30, weight: 900, color: alpha(P.b, 0.6), mono: true });
      g.text(String(sMe), 34, H - 40, { size: 30, weight: 900, color: alpha(P.a, 0.6), mono: true });
      if (rally > 4) g.text('×' + rally, W - 40, H / 2 + 8, { size: 26, align: 'right', weight: 900, color: P.c });

      E.particles.draw(g);
      E.ui.hint('← → o arrastra · coloca la bola en las esquinas', { bottom: 14 });
    },
  };
});
