/* Triples Arcade — 60 segundos, canastas que se mueven y bonus por encestar limpio. */
NX.game('triples-arcade', {
  w: 860, h: 620, pal: 'ember',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1500;

  let ball, hoop, drag, score, timeLeft, alive, combo, shots, made, msg, msgT, swishT;

  function reset() {
    ball = { x: 130, y: H - 110, vx: 0, vy: 0, r: 17, rot: 0, flying: false, touched: false };
    hoop = { x: W - 190, y: 250, vx: 0, w: 74, ph: 0 };
    drag = null; score = 0; timeLeft = 60; alive = true; combo = 0; shots = 0; made = 0;
    msg = ''; msgT = 0; swishT = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Canastas: made + '/' + shots, Combo: '×' + Math.max(1, combo), Tiempo: Math.ceil(timeLeft) }); }

  function resetBall() {
    ball.x = 130; ball.y = H - 110; ball.vx = ball.vy = 0; ball.flying = false; ball.touched = false;
  }

  function scored() {
    made++;
    combo++;
    const base = ball.touched ? 200 : 350;
    const pts = base * Math.min(5, combo);
    score += pts;
    E.sfx(ball.touched ? 'coin' : 'chime');
    E.camera.kick(4);
    E.floaters.add(hoop.x, hoop.y - 30, '+' + pts + (ball.touched ? '' : ' ¡limpia!'), { col: P.c, size: 20 });
    E.particles.burst(hoop.x, hoop.y, 16, { col: [P.c, '#fff'], speed1: 220, add: true });
    if (!ball.touched) { swishT = 1.2; }
    timeLeft = Math.min(75, timeLeft + 1.5);
    hud();
    setTimeout(resetBall, 350);
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (swishT > 0) swishT -= dt;
      if (!alive) return;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score, msg: made + ' canastas de ' + shots + ' tiros',
          stats: { Canastas: made, Tiros: shots },
        }), 500);
        return;
      }

      /* la canasta se mueve más rápido con el tiempo */
      hoop.ph += dt * (0.7 + (60 - timeLeft) * 0.014);
      hoop.y = 250 + Math.sin(hoop.ph) * 90;
      hoop.x = W - 190 + Math.cos(hoop.ph * 0.6) * 60;

      const p = E.input.pointer;
      if (!ball.flying) {
        if (p.pressed && M.dist(p.x, p.y, ball.x, ball.y) < 80) drag = { x: p.x, y: p.y };
        if (drag && p.down) drag = { x: p.x, y: p.y };
        if (drag && p.released) {
          const dx = ball.x - drag.x, dy = ball.y - drag.y;
          const len = Math.hypot(dx, dy);
          if (len > 20) {
            ball.vx = dx * 4.2; ball.vy = dy * 4.2;
            ball.flying = true; shots++;
            E.sfx('swoosh');
            hud();
          }
          drag = null;
        }
      } else {
        ball.vy += GRAV * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.rot += ball.vx * dt * 0.02;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.7; ball.touched = true; E.sfx('bounce'); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.7; ball.touched = true; E.sfx('bounce'); }

        /* tablero */
        const bx = hoop.x + hoop.w / 2 + 12;
        if (ball.x + ball.r > bx && ball.x < bx + 14 && ball.y > hoop.y - 100 && ball.y < hoop.y + 20) {
          ball.x = bx - ball.r; ball.vx *= -0.72; ball.touched = true; E.sfx('thud');
        }
        /* aros */
        [[hoop.x - hoop.w / 2, hoop.y], [hoop.x + hoop.w / 2, hoop.y]].forEach((r) => {
          const d = M.dist(ball.x, ball.y, r[0], r[1]);
          if (d < ball.r + 5) {
            const nx = (ball.x - r[0]) / d, ny = (ball.y - r[1]) / d;
            ball.x = r[0] + nx * (ball.r + 5); ball.y = r[1] + ny * (ball.r + 5);
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 1.5 * dot * nx; ball.vy -= 1.5 * dot * ny;
            ball.vx *= 0.7; ball.vy *= 0.7;
            ball.touched = true;
            E.sfx('tap');
          }
        });

        if (ball.vy > 0 && Math.abs(ball.x - hoop.x) < hoop.w / 2 - 6 &&
            ball.y > hoop.y - 4 && ball.y < hoop.y + 16) {
          ball.flying = false;
          scored();
          return;
        }

        if (ball.y > H + 60) {
          combo = 0;
          E.sfx('error');
          hud();
          resetBall();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      /* pista */
      g.rect(0, H - 70, W, 70, mix('#b06a35', P.deep, 0.35));
      g.rect(0, H - 70, W, 3, alpha(P.c, 0.5));
      for (let i = 0; i < 22; i++) g.rect(i * 42, H - 70, 20, 70, alpha('#000', 0.05));

      /* público */
      for (let i = 0; i < 60; i++) {
        const x = (i * 97) % W, y = 30 + ((i * 53) % 90);
        g.circle(x, y, 7, alpha(['#ff8a3d', '#ffd45e', '#ff4d6d', '#22e0ff'][i % 4], 0.16));
      }

      /* poste y tablero */
      g.rect(hoop.x + hoop.w / 2 + 12, hoop.y - 100, 14, 130, mix(P.dim, P.deep, 0.35));
      g.rrect(hoop.x + hoop.w / 2 + 10, hoop.y - 100, 18, 96, 4, alpha('#f2f6ff', 0.92));
      g.rrectStroke(hoop.x + hoop.w / 2 - 6, hoop.y - 62, 34, 44, 3, '#e8384f', 3);

      /* aro y red */
      g.ring(hoop.x, hoop.y, hoop.w / 2, 5, '#ff6b35');
      c.save(); c.strokeStyle = alpha('#ffffff', 0.7); c.lineWidth = 1.4;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * M.TAU;
        c.beginPath();
        c.moveTo(hoop.x + Math.cos(a) * hoop.w / 2, hoop.y + Math.sin(a) * 6);
        c.lineTo(hoop.x + Math.cos(a) * hoop.w * 0.28, hoop.y + 44);
        c.stroke();
      }
      c.restore();

      /* trayectoria */
      if (drag && !ball.flying) {
        const dx = ball.x - drag.x, dy = ball.y - drag.y;
        c.save(); c.setLineDash([5, 8]);
        c.strokeStyle = alpha(P.c, 0.5); c.lineWidth = 2;
        c.beginPath();
        let px = ball.x, py = ball.y, vx = dx * 4.2, vy = dy * 4.2;
        c.moveTo(px, py);
        for (let i = 0; i < 40; i++) {
          vy += GRAV * 0.02; px += vx * 0.02; py += vy * 0.02;
          if (py > H) break;
          c.lineTo(px, py);
        }
        c.stroke(); c.restore();
        g.line(ball.x, ball.y, drag.x, drag.y, alpha('#ffffff', 0.35), 2);
      }

      /* balón */
      g.push(ball.x, ball.y, ball.rot);
      g.circle(0, 0, ball.r, '#ff8a3d');
      c.strokeStyle = '#7c3a10'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(0, 0, ball.r, 0, M.TAU);
      c.moveTo(-ball.r, 0); c.lineTo(ball.r, 0);
      c.moveTo(0, -ball.r); c.lineTo(0, ball.r);
      c.stroke();
      g.pop();

      g.rrect(W / 2 - 130, 22, 260, 12, 6, 'rgba(255,255,255,.14)');
      g.rrect(W / 2 - 130, 22, 260 * M.clamp01(timeLeft / 60), 12, 6, timeLeft > 15 ? P.c : '#ff4d6d');
      if (swishT > 0) E.ui.title('¡SIN TOCAR EL ARO!', W / 2, 110, { size: 28 });

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Arrastra desde el balón y suelta para lanzar', { bottom: 14 });
    },
  };
});
