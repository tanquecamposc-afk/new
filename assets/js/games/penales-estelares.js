/* Penales Estelares — elige esquina, fuerza y efecto; el portero estudia tus tiros. */
NX.game('penales-estelares', {
  w: 900, h: 620, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GX = W / 2, GY = 190, GW = 420, GH = 190;

  let ball, keeper, state, aim, power, spin, shots, goals, saves, round, msg, msgT, history, alive, t;

  function reset() {
    resetBall();
    keeper = { x: GX, tx: GX, y: GY + GH - 34, dive: 0, diveDir: 0 };
    state = 'aim'; shots = 0; goals = 0; saves = 0; round = 1; msg = ''; msgT = 0;
    history = []; alive = true; t = 0;
    hud();
  }
  function resetBall() {
    ball = { x: W / 2, y: H - 120, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, r: 13, rot: 0 };
    aim = { x: GX, y: GY + GH * 0.5 }; power = 0; spin = 0;
  }
  function hud() { E.api.hud({ Goles: goals, Paradas: saves, Tiros: shots + '/10', Ronda: round }); }

  function shoot() {
    state = 'fly';
    shots++;
    const dx = aim.x - ball.x, dy = aim.y - ball.y;
    const sp = 0.55 + power * 0.7;
    ball.vx = dx * sp * 0.022;
    ball.vy = dy * sp * 0.022;
    ball.spin = spin;
    E.sfx('shoot');
    E.camera.kick(4);
    /* el portero adivina según el histórico y algo de azar */
    const left = history.filter((h) => h < GX).length;
    const right = history.length - left;
    let guess;
    if (history.length >= 2 && Math.abs(left - right) >= 2) guess = left > right ? -1 : 1;
    else guess = E.rng.pick([-1, 0, 1]);
    if (E.rng.bool(0.25)) guess = E.rng.pick([-1, 0, 1]);
    keeper.diveDir = guess;
    keeper.tx = GX + guess * GW * 0.32;
    history.push(aim.x);
    if (history.length > 5) history.shift();
  }

  function finish(scored) {
    if (scored) {
      goals++;
      E.sfx('win'); E.camera.kick(8);
      msg = '¡GOOOL!'; msgT = 1.6;
      E.particles.burst(ball.x, ball.y, 26, { col: [P.c, '#fff'], speed1: 280, add: true });
    } else {
      saves++;
      E.sfx('thud'); E.camera.kick(6);
      msg = 'Parada'; msgT = 1.4;
    }
    hud();
    setTimeout(() => {
      if (shots >= 10) {
        alive = false;
        const o = { score: goals * 1000 + (goals >= 8 ? 2000 : 0), label: 'Puntos',
          msg: goals + ' goles de 10 tiros', stats: { Goles: goals, Paradas: saves } };
        goals >= 6 ? E.api.win(o) : E.api.over(o);
      } else {
        round++;
        resetBall();
        keeper.x = keeper.tx = GX; keeper.dive = 0;
        state = 'aim';
        hud();
      }
    }, 1400);
  }

  reset();

  return {
    update(dt) {
      t += dt;
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      keeper.x = M.damp(keeper.x, keeper.tx, state === 'fly' ? 9 : 3, dt);
      if (state === 'fly') keeper.dive = M.damp(keeper.dive, 1, 8, dt);

      const p = E.input.pointer;
      if (state === 'aim') {
        if (p.inside || p.down) {
          aim.x = M.clamp(p.x, GX - GW / 2 + 16, GX + GW / 2 - 16);
          aim.y = M.clamp(p.y, GY + 14, GY + GH - 6);
        }
        if (p.down) { power = Math.min(1, power + dt * 1.2); }
        else if (power > 0.06) shoot();
        if (E.input.down('left')) spin = Math.max(-1, spin - dt * 1.5);
        if (E.input.down('right')) spin = Math.min(1, spin + dt * 1.5);
        if (E.input.down('space')) power = Math.min(1, power + dt * 1.2);
        else if (E.input.released('space') && power > 0.06) shoot();
      } else if (state === 'fly') {
        ball.vx += ball.spin * 130 * dt;
        ball.x += ball.vx; ball.y += ball.vy;
        ball.rot += 0.2;
        ball.z = M.clamp((H - 120 - ball.y) / (H - 120 - GY), 0, 1);
        if (Math.random() < 0.5) E.particles.trail(ball.x, ball.y, { col: alpha('#ffffff', 0.5), r: 3, life: 0.25 });

        const kx = keeper.x, ky = keeper.y - keeper.dive * 20;
        const reach = 62 + keeper.dive * 42;
        if (ball.y < GY + GH + 20 && Math.abs(ball.x - kx) < reach && Math.abs(ball.y - (ky - 40)) < 90) {
          state = 'done'; finish(false); return;
        }
        if (ball.y < GY + GH * 0.98) {
          const inGoal = ball.x > GX - GW / 2 && ball.x < GX + GW / 2 && ball.y > GY;
          state = 'done';
          finish(inGoal);
          return;
        }
        if (ball.x < -40 || ball.x > W + 40 || ball.y < 0) { state = 'done'; finish(false); }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#123b1e', P.deep, 0.35), mix('#0b2814', P.deep, 0.3));
      /* césped */
      for (let i = 0; i < 12; i++) {
        g.rect(0, GY + i * 40, W, 20, alpha('#ffffff', 0.018));
      }
      /* área */
      c.strokeStyle = alpha('#ffffff', 0.35); c.lineWidth = 3;
      c.strokeRect(GX - GW * 0.8, GY + GH - 6, GW * 1.6, 190);
      c.beginPath(); c.arc(GX, GY + GH + 184, 90, Math.PI, 0); c.stroke();
      g.circle(W / 2, H - 120, 4, alpha('#ffffff', 0.5));

      /* portería */
      g.rect(GX - GW / 2 - 8, GY, 8, GH, '#f2f6ff');
      g.rect(GX + GW / 2, GY, 8, GH, '#f2f6ff');
      g.rect(GX - GW / 2 - 8, GY - 8, GW + 16, 8, '#f2f6ff');
      c.save();
      c.strokeStyle = alpha('#ffffff', 0.18); c.lineWidth = 1;
      c.beginPath();
      for (let x = GX - GW / 2; x <= GX + GW / 2; x += 16) { c.moveTo(x, GY); c.lineTo(x, GY + GH); }
      for (let y = GY; y <= GY + GH; y += 16) { c.moveTo(GX - GW / 2, y); c.lineTo(GX + GW / 2, y); }
      c.stroke(); c.restore();

      /* portero */
      const kx = keeper.x, ky = keeper.y - keeper.dive * 16;
      g.push(kx, ky, keeper.dive * keeper.diveDir * 0.7);
      g.rrect(-20, -74, 40, 62, 12, P.a);
      g.circle(0, -84, 15, '#f0c49a');
      g.line(-18, -60, -18 - keeper.dive * 34, -66, P.a, 11);
      g.line(18, -60, 18 + keeper.dive * 34, -66, P.a, 11);
      g.line(-10, -12, -12, 16, '#2b3550', 10);
      g.line(10, -12, 12, 16, '#2b3550', 10);
      g.pop();

      /* mira */
      if (state === 'aim') {
        g.ring(aim.x, aim.y, 22, 2.5, alpha(P.c, 0.9));
        g.line(aim.x - 32, aim.y, aim.x - 10, aim.y, P.c, 2);
        g.line(aim.x + 10, aim.y, aim.x + 32, aim.y, P.c, 2);
        c.save(); c.setLineDash([6, 8]);
        g.line(ball.x, ball.y, aim.x, aim.y, alpha('#ffffff', 0.3), 2);
        c.restore();
        /* fuerza */
        g.rrect(W / 2 - 110, H - 54, 220, 14, 7, 'rgba(255,255,255,.14)');
        g.rrect(W / 2 - 110, H - 54, 220 * power, 14, 7, power > 0.8 ? '#ff4d6d' : P.c);
        g.text('FUERZA', W / 2 - 110, H - 62, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.4 });
        /* efecto */
        g.text('EFECTO ' + (spin < -0.1 ? '◀' : spin > 0.1 ? '▶' : '—'), W / 2 + 150, H - 42,
          { size: 13, color: P.c, weight: 800 });
      }

      /* balón */
      const s = 1 - ball.z * 0.45;
      g.push(ball.x, ball.y, ball.rot, s);
      g.circle(0, 0, ball.r, '#ffffff');
      g.ngon(0, 0, ball.r * 0.45, 5, ball.rot, '#1b2437');
      g.pop();

      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.42, { size: 46 });
      E.particles.draw(g);
      E.ui.hint('Apunta con el ratón · mantén pulsado para cargar · ← → efecto', { bottom: 14 });
    },
  };
});
