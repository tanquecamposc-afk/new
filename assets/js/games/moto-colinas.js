/* Moto Colinas — terreno generado, suspensión y equilibrio en el aire. */
NX.game('moto-colinas', {
  w: 900, h: 560, pal: 'forest',
  controls: { dpad: true },
  music: { root: 45, scale: 'dorian', bpm: 120, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 1250;

  let bike, camX, dist, fuel, coins, alive, score, flips, air, lastA, msg, msgT;
  const noise = M.makeNoise(Math.floor(Math.random() * 9999));

  const ground = (x) =>
    H * 0.68 + noise(x * 0.0022, 0) * 190 + noise(x * 0.0075, 5) * 60 + noise(x * 0.02, 9) * 16;

  function reset() {
    bike = { x: 120, y: ground(120) - 40, vx: 0, vy: 0, a: 0, va: 0, wheel: 0, onGround: true };
    camX = 0; dist = 0; fuel = 1; coins = []; alive = true; score = 0; flips = 0; air = 0; lastA = 0;
    msg = ''; msgT = 0;
    for (let i = 1; i < 200; i++) {
      const x = i * 220 + E.rng.float(-50, 50);
      coins.push({ x, y: ground(x) - E.rng.float(40, 120), got: false, ph: E.rng.float(0, 6) });
    }
    hud();
  }
  function hud() {
    E.api.hud({ Distancia: Math.round(dist) + ' m', Puntos: M.fmtScore(score), Combustible: Math.round(fuel * 100) + '%', Volteretas: flips });
  }

  function die(txt) {
    alive = false;
    E.sfx('explode'); E.camera.kick(16);
    setTimeout(() => E.api.over({
      score: Math.round(score + dist * 10), msg: txt + ' a ' + Math.round(dist) + ' m',
      stats: { Distancia: Math.round(dist) + ' m', Volteretas: flips },
    }), 600);
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      const gas = E.input.down('up') || E.input.down('right') ||
        (E.input.pointer.down && E.input.pointer.x > W / 2);
      const brake = E.input.down('down') || E.input.down('left') ||
        (E.input.pointer.down && E.input.pointer.x <= W / 2);

      if (gas && fuel > 0) { fuel = Math.max(0, fuel - dt * 0.026); }
      const gy = ground(bike.x);
      const slope = Math.atan2(ground(bike.x + 12) - ground(bike.x - 12), 24);
      bike.onGround = bike.y >= gy - 42;

      if (bike.onGround) {
        bike.y = gy - 40;
        bike.a = M.dampAngle(bike.a, slope, 12, dt);
        bike.va = 0;
        const accel = (gas && fuel > 0 ? 320 : 0) - (brake ? 260 : 0);
        bike.vx = M.damp(bike.vx, M.clamp(bike.vx + accel * dt, -120, 520), 1.6, dt);
        bike.vx -= Math.sin(slope) * 420 * dt;
        bike.vx *= Math.exp(-0.32 * dt);
        bike.vy = 0;
        if (gas) bike.a -= dt * 0.9;
        if (air > 0.5) {
          const landed = Math.abs(M.angleDiff(bike.a, slope));
          if (landed > 1.4) return die('Aterrizaje fatal');
          score += Math.round(air * 60);
          E.sfx('land');
          E.particles.burst(bike.x - camX, bike.y + 22, 8, { col: [P.dim], speed1: 130, angle: -Math.PI / 2, spread: 1 });
        }
        air = 0;
        bike.y = gy - 40;
        /* vuelca si el ángulo es imposible */
        if (Math.abs(M.angleDiff(bike.a, slope)) > 1.5) return die('Te caíste');
      } else {
        air += dt;
        bike.vy += GRAV * dt;
        const rot = (E.input.down('left') ? -1 : 0) + (E.input.down('right') ? 1 : 0);
        bike.va = M.damp(bike.va, rot * 4.2, 4, dt);
        bike.a += bike.va * dt;
        const da = bike.a - lastA;
        if (Math.abs(bike.a) > M.TAU * (flips + 1) - 0.2) { }
      }
      lastA = bike.a;
      bike.x += bike.vx * dt;
      bike.y += bike.vy * dt;
      bike.wheel += bike.vx * dt * 0.06;
      if (bike.y < gy - 42) bike.onGround = false;
      if (bike.y > gy - 40 && !bike.onGround) { bike.y = gy - 40; bike.vy = 0; }

      dist = Math.max(dist, (bike.x - 120) / 12);
      score = Math.max(score, dist * 10);
      camX = M.damp(camX, bike.x - W * 0.32, 6, dt);

      coins.forEach((cn) => {
        cn.ph += dt * 4;
        if (!cn.got && M.dist(cn.x, cn.y, bike.x, bike.y) < 34) {
          cn.got = true; score += 200; fuel = Math.min(1, fuel + 0.08);
          E.sfx('coin');
          E.floaters.add(cn.x - camX, cn.y, '+200', { col: P.c });
          hud();
        }
      });

      if (fuel <= 0 && Math.abs(bike.vx) < 20) return die('Sin combustible');
      hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#4a7fb5', P.deep, 0.35), mix(P.bg, P.d, 0.3));
      for (let i = 0; i < 6; i++) {
        G.Sprites.cloud(g, ((i * 260 - camX * 0.12) % (W + 400)) - 120, 60 + (i % 3) * 46, 48, alpha('#ffffff', 0.09));
      }
      /* montañas de fondo */
      c.fillStyle = alpha(mix(P.d, P.deep, 0.4), 0.6);
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) c.lineTo(x, ground(x + camX * 0.45) * 0.85 + 50);
      c.lineTo(W, H); c.closePath(); c.fill();

      /* terreno */
      c.fillStyle = mix('#3f8f4f', P.deep, 0.28);
      c.beginPath(); c.moveTo(-10, H);
      for (let x = -10; x <= W + 10; x += 8) c.lineTo(x, ground(x + camX));
      c.lineTo(W + 10, H); c.closePath(); c.fill();
      c.strokeStyle = alpha(P.c, 0.6); c.lineWidth = 3;
      c.beginPath();
      for (let x = -10; x <= W + 10; x += 8) x === -10 ? c.moveTo(x, ground(x + camX)) : c.lineTo(x, ground(x + camX));
      c.stroke();

      coins.forEach((cn) => {
        if (cn.got) return;
        const x = cn.x - camX;
        if (x < -40 || x > W + 40) return;
        g.bloom(x, cn.y, 20, P.c, 0.4);
        G.Sprites.coin(g, x, cn.y, 12, cn.ph, P.c, mix(P.c, '#000', 0.3));
      });

      const bx = bike.x - camX;
      g.push(bx, bike.y, bike.a);
      g.circle(-22, 20, 17, '#1b2437'); g.ring(-22, 20, 17, 3.5, P.dim);
      g.circle(24, 20, 17, '#1b2437'); g.ring(24, 20, 17, 3.5, P.dim);
      g.push(-22, 20, bike.wheel); g.line(-10, 0, 10, 0, alpha(P.ink, 0.5), 2); g.pop();
      g.push(24, 20, bike.wheel); g.line(-10, 0, 10, 0, alpha(P.ink, 0.5), 2); g.pop();
      g.rrect(-24, -4, 50, 18, 7, P.a);
      g.rrect(2, -22, 14, 20, 5, P.b);
      g.circle(6, -34, 11, P.c);
      g.line(-8, -14, -16, -30, P.b, 4);
      g.pop();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.rrect(20, 22, 200, 14, 7, 'rgba(255,255,255,.14)');
      g.rrect(20, 22, 200 * fuel, 14, 7, fuel > 0.25 ? P.c : '#ff4d6d');
      g.text('COMBUSTIBLE', 20, 16, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.4 });
      g.text(Math.round(dist) + ' m', W - 24, 44, { size: 26, align: 'right', weight: 900, color: P.ink, mono: true });
      E.ui.hint('↑ / derecha acelerar · ↓ / izquierda frenar · en el aire, equilibra', { bottom: 14 });
    },
  };
});
