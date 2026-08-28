/* Bolos Espaciales — diez frames con efecto lateral y bolos que salen volando. */
NX.game('bolos-espaciales', {
  w: 620, h: 720, pal: 'royal',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const LANE_X = W / 2, LANE_W = 300, PIN_Y = 150;

  let pins, ball, state, frame, roll, scores, aimX, power, spin, t, alive, msg, msgT, downThis, downFrame;

  const PIN_POS = [
    [0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-3, 3], [-1, 3], [1, 3], [3, 3],
  ];

  function setupPins() {
    pins = PIN_POS.map((p, i) => ({
      x: LANE_X + p[0] * 24, y: PIN_Y + p[1] * 26, vx: 0, vy: 0, down: false, r: 10, i, rot: 0,
    }));
  }

  function reset() {
    setupPins();
    ball = null;
    state = 'aim'; frame = 1; roll = 1; scores = []; aimX = LANE_X; power = 0; spin = 0;
    t = 0; alive = true; msg = ''; msgT = 0; downThis = 0; downFrame = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Frame: frame + '/10', Tirada: roll, Total: total(), Bolos: 10 - pins.filter((p) => !p.down).length });
  }
  function total() { return scores.reduce((a, b) => a + b, 0); }

  function throwBall() {
    ball = { x: aimX, y: H - 130, vx: spin * 60, vy: -520 - power * 380, r: 14, spin };
    state = 'roll';
    E.sfx('thud');
  }

  function endRoll() {
    const nowDown = pins.filter((p) => p.down).length;
    const knocked = nowDown - downFrame;
    downThis += knocked;
    scores.push(knocked);
    if (roll === 1 && nowDown === 10) {
      msg = '¡PLENO!'; msgT = 1.8;
      E.sfx('win'); E.camera.kick(8);
      nextFrame();
    } else if (roll === 2) {
      if (nowDown === 10) { msg = '¡Semipleno!'; msgT = 1.6; E.sfx('chime'); }
      nextFrame();
    } else {
      roll = 2;
      downFrame = nowDown;
      state = 'aim';
      ball = null;
      hud();
    }
  }

  function nextFrame() {
    if (frame >= 10) {
      alive = false;
      setTimeout(() => {
        const t2 = total();
        const o = { score: t2 * 100, label: 'Puntos', msg: t2 + ' bolos derribados en 10 frames',
          stats: { Bolos: t2 } };
        t2 >= 100 ? E.api.win(o) : E.api.over(o);
      }, 1400);
      return;
    }
    setTimeout(() => {
      frame++; roll = 1; downFrame = 0; downThis = 0;
      setupPins(); ball = null; state = 'aim'; power = 0; spin = 0; aimX = LANE_X;
      hud();
    }, 1400);
  }

  reset();

  return {
    update(dt) {
      t += dt;
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      const p = E.input.pointer;
      if (state === 'aim') {
        if (p.inside || p.down) aimX = M.clamp(p.x, LANE_X - LANE_W / 2 + 20, LANE_X + LANE_W / 2 - 20);
        if (E.input.down('left')) { aimX -= 200 * dt; spin = Math.max(-1, spin - dt); }
        if (E.input.down('right')) { aimX += 200 * dt; spin = Math.min(1, spin + dt); }
        if (p.down || E.input.down('space')) power = Math.min(1, power + dt * 0.85);
        else if (power > 0.06) throwBall();
      } else if (state === 'roll' && ball) {
        ball.vx += ball.spin * 120 * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < LANE_X - LANE_W / 2 || ball.x > LANE_X + LANE_W / 2) {
          state = 'wait';
          setTimeout(() => { if (alive) endRoll(); }, 900);
        }
        pins.forEach((pin) => {
          if (pin.down) return;
          if (M.dist(ball.x, ball.y, pin.x, pin.y) < ball.r + pin.r) {
            pin.down = true;
            pin.vx = (pin.x - ball.x) * 6 + E.rng.float(-60, 60);
            pin.vy = -180 + E.rng.float(-60, 60);
            E.sfx('hit'); E.camera.kick(3);
            /* cadena entre bolos */
            pins.forEach((o) => {
              if (o.down || M.dist(o.x, o.y, pin.x, pin.y) > 42) return;
              if (E.rng.bool(0.75)) {
                o.down = true;
                o.vx = (o.x - pin.x) * 4; o.vy = -140;
              }
            });
          }
        });
        if (ball.y < 40) {
          state = 'wait';
          setTimeout(() => { if (alive) endRoll(); }, 900);
        }
      }

      pins.forEach((pin) => {
        if (!pin.down) return;
        pin.x += pin.vx * dt; pin.y += pin.vy * dt;
        pin.vy += 420 * dt;
        pin.rot += pin.vx * dt * 0.05;
        pin.vx *= Math.exp(-1.4 * dt);
      });
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 2);
      /* pista */
      c.fillStyle = g.linGrad(0, PIN_Y - 60, 0, H, [[0, mix('#c98b46', P.deep, 0.35)], [1, mix('#e0a95c', P.deep, 0.2)]]);
      c.beginPath();
      c.moveTo(LANE_X - LANE_W / 2, PIN_Y - 60);
      c.lineTo(LANE_X + LANE_W / 2, PIN_Y - 60);
      c.lineTo(LANE_X + LANE_W / 2 + 40, H);
      c.lineTo(LANE_X - LANE_W / 2 - 40, H);
      c.closePath(); c.fill();
      for (let i = 0; i < 8; i++) {
        const y = PIN_Y - 60 + i * (H - PIN_Y + 60) / 8;
        g.line(LANE_X - LANE_W / 2, y, LANE_X + LANE_W / 2, y, alpha('#000', 0.05), 2);
      }
      g.rect(LANE_X - LANE_W / 2 - 40, PIN_Y - 70, LANE_W + 80, 14, mix(P.d, P.deep, 0.2));

      pins.forEach((pin) => {
        c.save(); c.translate(pin.x, pin.y); c.rotate(pin.rot + (pin.down ? 1.2 : 0));
        g.rrect(-7, -24, 14, 32, 7, '#f5f7fb');
        g.rect(-7, -16, 14, 5, '#e8384f');
        g.circle(0, -24, 5.5, '#f5f7fb');
        c.restore();
      });

      if (ball) {
        c.save(); c.globalAlpha = 0.3;
        g.circle(ball.x + 3, ball.y + 6, ball.r, '#000');
        c.restore();
        g.circle(ball.x, ball.y, ball.r, mix(P.a, '#000', 0.2));
        g.circle(ball.x - 5, ball.y - 4, 2.6, P.deep);
        g.circle(ball.x + 1, ball.y - 6, 2.6, P.deep);
        g.circle(ball.x - 2, ball.y + 1, 2.6, P.deep);
      }

      if (state === 'aim') {
        c.save(); c.setLineDash([6, 9]);
        g.line(aimX, H - 130, aimX + spin * 90, PIN_Y, alpha('#ffffff', 0.4), 2);
        c.restore();
        g.circle(aimX, H - 130, 14, mix(P.a, '#000', 0.2));
        g.rrect(W / 2 - 110, H - 60, 220, 12, 6, 'rgba(255,255,255,.14)');
        g.rrect(W / 2 - 110, H - 60, 220 * power, 12, 6, P.c);
        g.text('EFECTO ' + (spin < -0.15 ? '◀' : spin > 0.15 ? '▶' : '—'), W / 2, H - 70,
          { size: 12, align: 'center', color: P.dim, weight: 800 });
      }

      /* marcador */
      g.rrect(14, 14, W - 28, 40, 10, alpha(P.deep, 0.7));
      g.text('Frame ' + frame + '/10', 30, 40, { size: 15, weight: 800, color: P.ink });
      g.text('Total: ' + total(), W - 30, 40, { size: 16, align: 'right', weight: 900, color: P.c });

      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.42, { size: 42 });
      E.particles.draw(g);
      E.ui.hint('Coloca la bola, mantén pulsado para dar fuerza · ← → efecto', { bottom: 16 });
    },
  };
});
