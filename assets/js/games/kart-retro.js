/* Kart Retro — carretera pseudo-3D al estilo de las recreativas de los ochenta. */
NX.game('kart-retro', {
  w: 900, h: 560, pal: 'candy',
  controls: { dpad: true },
  music: { root: 45, scale: 'major', bpm: 142, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const SEG = 200, SEG_LEN = 200, HORIZON = H * 0.38;

  let road, pos, playerX, speed, maxSpeed, t, lap, alive, rivals, msg, msgT, countdown, timeLeft;

  function buildRoad() {
    road = [];
    let curve = 0, hill = 0;
    for (let i = 0; i < SEG; i++) {
      if (i % 25 === 0) curve = E.rng.float(-3.2, 3.2);
      if (i % 18 === 0) hill = E.rng.float(-28, 28);
      road.push({ curve: curve * (i % 25 < 8 ? (i % 25) / 8 : 1), y: hill, i });
    }
  }

  function reset() {
    buildRoad();
    pos = 0; playerX = 0; speed = 0; maxSpeed = 520; t = 0; lap = 1; alive = true;
    msg = ''; msgT = 0; countdown = 3.2; timeLeft = 60;
    rivals = [];
    for (let i = 0; i < 6; i++) {
      rivals.push({ z: 600 + i * 900, x: E.rng.float(-0.6, 0.6), sp: E.rng.float(180, 300), col: E.rng.pick([P.a, P.b, P.d, '#4ade80']) });
    }
    hud();
  }
  function hud() {
    E.api.hud({ Vuelta: lap, Velocidad: Math.round(speed) + ' km/h', Tiempo: Math.ceil(timeLeft) });
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      if (countdown > 0) {
        countdown -= dt;
        if (Math.ceil(countdown) !== Math.ceil(countdown + dt)) E.sfx(countdown > 0.4 ? 'tick' : 'alarm');
        return;
      }
      t += dt;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score: Math.round(pos / 10 + lap * 4000), label: 'Puntos',
          msg: lap + ' vueltas completadas', stats: { Vueltas: lap },
        }), 500);
        return;
      }

      const ax = E.input.axis();
      const accel = E.input.down('up') || ax.y < -0.3 || E.input.pointer.down;
      const brake = E.input.down('down');
      speed = M.clamp(speed + (accel ? 260 : brake ? -560 : -90) * dt, 0, maxSpeed);
      playerX += ax.x * dt * 1.8;

      const segIdx = Math.floor(pos / SEG_LEN) % SEG;
      const curve = road[segIdx].curve;
      playerX -= curve * dt * speed * 0.0021;

      if (Math.abs(playerX) > 1) {
        playerX = M.clamp(playerX, -1.35, 1.35);
        speed = Math.max(60, speed - 460 * dt);
        if (Math.random() < 0.4) E.particles.trail(W / 2 + playerX * 140, H - 90, { col: alpha('#d8c8a0', 0.7), r: 4, life: 0.4, add: false });
      }

      const prev = pos;
      pos += speed * dt * 2.4;
      if (Math.floor(pos / (SEG * SEG_LEN)) > Math.floor(prev / (SEG * SEG_LEN))) {
        lap++; timeLeft += 22; E.sfx('levelup');
        msg = '¡Vuelta ' + lap + '!'; msgT = 1.6;
        hud();
      }

      rivals.forEach((r) => {
        r.z += (r.sp - speed) * dt * 2.4 * -1;
        if (r.z < -300) { r.z += SEG * SEG_LEN * 0.4; r.x = E.rng.float(-0.7, 0.7); }
        if (r.z > SEG * SEG_LEN) r.z -= SEG * SEG_LEN;
        if (r.z > -80 && r.z < 120 && Math.abs(r.x - playerX) < 0.34) {
          speed = Math.max(60, speed * 0.55);
          r.z = 260;
          E.sfx('hit'); E.camera.kick(9);
        }
      });
      hud();
    },

    draw(g) {
      const c = g.ctx;
      /* cielo */
      c.fillStyle = g.linGrad(0, 0, 0, HORIZON, [[0, mix(P.b, P.deep, 0.35)], [1, mix(P.c, P.deep, 0.3)]]);
      c.fillRect(0, 0, W, HORIZON);
      g.circle(W * 0.7, HORIZON - 60, 44, alpha(P.c, 0.6));
      /* montañas */
      const segIdx = Math.floor(pos / SEG_LEN) % SEG;
      const shift = road[segIdx].curve * 40;
      c.fillStyle = alpha(mix(P.d, P.deep, 0.4), 0.7);
      c.beginPath(); c.moveTo(0, HORIZON);
      for (let i = 0; i <= 12; i++) {
        const x = i * (W / 12) - shift * 2;
        c.lineTo(x, HORIZON - 40 - Math.abs(Math.sin(i * 1.7)) * 60);
      }
      c.lineTo(W, HORIZON); c.closePath(); c.fill();
      /* suelo */
      c.fillStyle = mix('#2e7d43', P.deep, 0.35);
      c.fillRect(0, HORIZON, W, H - HORIZON);

      let x = 0, dx = 0;
      const base = Math.floor(pos / SEG_LEN);
      let maxY = H;
      for (let n = 0; n < 90; n++) {
        const seg = road[(base + n) % SEG];
        dx += seg.curve * 0.0075;
        x += dx;
        const z = n * SEG_LEN + (SEG_LEN - pos % SEG_LEN);
        const scale = 260 / (z + 60);
        const sy = HORIZON + scale * (H * 1.6) * 0.55 - seg.y * scale * 2.4;
        const sw = scale * 6400;
        const sx = W / 2 + x * scale * 1400 - playerX * sw * 0.5;
        if (sy >= maxY) continue;
        const band = Math.floor((base + n) / 3) % 2;
        c.fillStyle = band ? mix('#3c4658', P.deep, 0.2) : mix('#333b4b', P.deep, 0.2);
        c.fillRect(sx - sw / 2, sy, sw, maxY - sy);
        c.fillStyle = band ? '#f8fafc' : '#e8384f';
        c.fillRect(sx - sw / 2 - sw * 0.06, sy, sw * 0.06, maxY - sy);
        c.fillRect(sx + sw / 2, sy, sw * 0.06, maxY - sy);
        if (band) {
          c.fillStyle = alpha('#ffffff', 0.5);
          c.fillRect(sx - sw * 0.012, sy, sw * 0.024, maxY - sy);
        }
        maxY = sy;
      }

      /* rivales */
      rivals.slice().sort((a, b) => b.z - a.z).forEach((r) => {
        if (r.z < 20 || r.z > 9000) return;
        const scale = 260 / (r.z + 60);
        const sy = HORIZON + scale * (H * 1.6) * 0.55;
        const sw = scale * 6400;
        const sx = W / 2 + (r.x - playerX) * sw * 0.5;
        const size = scale * 900;
        if (size < 4) return;
        g.rrect(sx - size / 2, sy - size * 0.7, size, size * 0.7, size * 0.16, r.col);
        g.rrect(sx - size * 0.32, sy - size * 0.6, size * 0.64, size * 0.3, size * 0.1, alpha('#0b1220', 0.7));
        g.rect(sx - size * 0.5, sy - size * 0.22, size * 0.18, size * 0.22, '#1b2437');
        g.rect(sx + size * 0.32, sy - size * 0.22, size * 0.18, size * 0.22, '#1b2437');
      });

      /* kart del jugador */
      const px = W / 2 + playerX * 40;
      const bob = Math.sin(t * 20) * (speed / maxSpeed) * 2;
      g.push(px, H - 70 + bob);
      g.rrect(-58, -34, 116, 46, 12, P.c);
      g.rrect(-34, -28, 68, 26, 8, alpha('#0b1220', 0.75));
      g.rect(-72, -12, 22, 30, '#1b2437');
      g.rect(50, -12, 22, 30, '#1b2437');
      g.rrect(-16, -52, 32, 22, 8, P.a);
      g.pop();

      /* HUD */
      g.text(Math.round(speed) + ' km/h', W - 30, 46, {
        size: 24, align: 'right', weight: 900, color: P.ink, mono: true });
      g.text('VUELTA ' + lap, 30, 46, { size: 20, weight: 900, color: P.ink, letterSpacing: 2 });
      g.rrect(W / 2 - 110, 24, 220, 10, 5, 'rgba(255,255,255,.16)');
      g.rrect(W / 2 - 110, 24, 220 * M.clamp01(timeLeft / 60), 10, 5, timeLeft > 12 ? P.a : '#ff4d6d');

      if (countdown > 0) E.ui.title(countdown > 1 ? String(Math.ceil(countdown - 0.2)) : '¡YA!', W / 2, H / 2, { size: 68 });
      if (msgT > 0) E.ui.title(msg, W / 2, 130, { size: 32 });
      E.particles.draw(g);
      E.ui.hint('↑ acelerar · ↓ frenar · ← → girar', { bottom: 12 });
    },
  };
});
