/* Salto de Esquí — impulso en la rampa, ángulo en el aire y aterrizaje limpio. */
NX.game('salto-de-esqui', {
  w: 900, h: 560, pal: 'ice',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'IMPULSO' }] },
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let phase, skier, camX, speed, angle, dist, best, jump, scores, msg, msgT, alive, wind, style;

  const RAMP_END = 420;
  const rampY = (x) => x < RAMP_END ? 120 + Math.pow(x / RAMP_END, 1.7) * 240 : 360;
  const slopeY = (x) => 360 + Math.max(0, (x - RAMP_END)) * 0.34;

  function reset() {
    scores = []; jump = 1; alive = true; msg = ''; msgT = 0;
    startJump();
  }
  function startJump() {
    phase = 'ramp';
    skier = { x: 0, y: rampY(0), vx: 0, vy: 0, rot: 0.6, lean: 0 };
    camX = 0; speed = 0; angle = 0; dist = 0; style = 0;
    wind = E.rng.float(-25, 25);
    hud();
  }
  function hud() {
    E.api.hud({ Salto: jump + '/3', Distancia: Math.round(dist) + ' m', Total: scores.reduce((a, b) => a + b, 0), Viento: Math.round(wind) });
  }

  function land() {
    const perfect = Math.abs(skier.rot) < 0.28;
    const pts = Math.round(dist * 10 + (perfect ? 400 : 0) + style * 40);
    scores.push(pts);
    E.sfx(perfect ? 'win' : 'thud');
    E.camera.kick(perfect ? 10 : 14);
    /* Nieve levantada al tocar suelo, y destellos si el aterrizaje es limpio. */
    /* Las partículas se pintan fuera del desplazamiento de cámara, así que
       van en coordenadas de pantalla, no de mundo. */
    const sx = skier.x - camX;
    E.particles.burst(sx, skier.y + 12, perfect ? 34 : 20, {
      col: perfect ? ['#ffffff', P.c, P.a] : ['#ffffff', P.dim],
      speed1: perfect ? 300 : 200, life1: 0.8, grav: 260,
      angle: -Math.PI / 2, spread: 1.5, add: perfect,
    });
    if (perfect) E.camera.flash(P.c, 0.22);
    E.floaters.add(sx, skier.y - 40, '+' + pts, { col: perfect ? P.c : P.ink, size: perfect ? 26 : 20 });
    msg = perfect ? '¡Aterrizaje perfecto! +' + pts : 'Caída · +' + pts;
    msgT = 2;
    phase = 'done';
    hud();
    setTimeout(() => {
      if (jump >= 3) {
        alive = false;
        const total = scores.reduce((a, b) => a + b, 0);
        E.api.over({ score: total, msg: 'Mejor salto: ' + Math.max(...scores.map((s) => Math.round(s / 10))) + ' m',
          stats: { Saltos: scores.length } });
      } else { jump++; startJump(); }
    }, 2200);
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      const press = E.input.down('space') || E.input.pointer.down;

      if (phase === 'ramp') {
        speed += (700 + (press ? 260 : 0)) * dt;
        skier.x += speed * dt;
        skier.y = rampY(skier.x);
        skier.rot = Math.atan2(rampY(skier.x + 10) - rampY(skier.x - 10), 20);
        if (skier.x >= RAMP_END) {
          phase = 'fly';
          const boost = press ? 1.25 : 1;
          skier.vx = speed * 0.65 * boost;
          skier.vy = -speed * 0.34 * boost;
          E.sfx('jump');
        }
      } else if (phase === 'fly') {
        const ax = E.input.axis().y;
        skier.rot = M.clamp(skier.rot + ax * 1.6 * dt, -1.2, 1.2);
        /* mejor planeo cerca de la horizontal */
        const lift = Math.cos(skier.rot) * 130;
        skier.vy += (620 - lift) * dt;
        skier.vx += wind * dt;
        skier.x += skier.vx * dt;
        skier.y += skier.vy * dt;
        dist = (skier.x - RAMP_END) / 8;
        if (Math.abs(skier.rot) < 0.3) style += dt * 2;
        if (Math.random() < 0.4) E.particles.trail(skier.x, skier.y + 12, { col: alpha('#ffffff', 0.5), r: 2.4, life: 0.5 });
        if (skier.y >= slopeY(skier.x) - 14) { skier.y = slopeY(skier.x) - 14; land(); }
      }
      camX = M.damp(camX, Math.max(0, skier.x - W * 0.35), 6, dt);
      if (phase !== 'done') hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#bcdcf0', P.deep, 0.55), mix(P.bg, P.d, 0.25));
      for (let i = 0; i < 30; i++) {
        g.circle(((i * 97 - camX * 0.1) % (W + 200)) - 100, (i * 53) % 200, 2, alpha('#ffffff', 0.35));
      }
      /* montañas */
      c.fillStyle = alpha('#9fc3dd', 0.3);
      for (let i = 0; i < 6; i++) {
        const x = ((i * 320 - camX * 0.25) % (W + 700)) - 300;
        c.beginPath(); c.moveTo(x, 400); c.lineTo(x + 170, 120); c.lineTo(x + 340, 400); c.closePath(); c.fill();
      }

      c.save(); c.translate(-camX, 0);
      /* rampa y pista */
      c.fillStyle = '#eef6fd';
      c.beginPath(); c.moveTo(-20, H);
      for (let x = -20; x < RAMP_END; x += 10) c.lineTo(x, rampY(x));
      for (let x = RAMP_END; x < camX + W + 200; x += 20) c.lineTo(x, slopeY(x));
      c.lineTo(camX + W + 200, H); c.closePath(); c.fill();
      c.strokeStyle = alpha('#8fb6d0', 0.7); c.lineWidth = 2;
      c.beginPath();
      for (let x = -20; x < RAMP_END; x += 10) x === -20 ? c.moveTo(x, rampY(x)) : c.lineTo(x, rampY(x));
      c.stroke();

      /* marcas de distancia */
      for (let m = 20; m <= 160; m += 20) {
        const x = RAMP_END + m * 8;
        g.line(x, slopeY(x), x, slopeY(x) - 16, alpha('#5b8cff', 0.5), 2);
        g.text(m + 'm', x, slopeY(x) - 22, { size: 11, align: 'center', color: '#5b8cff', weight: 800 });
      }

      g.push(skier.x, skier.y, skier.rot);
      g.rect(-26, 8, 54, 3.5, P.a);
      g.rect(-26, 14, 54, 3.5, P.a);
      g.rrect(-9, -20, 18, 28, 7, P.b);
      g.circle(0, -26, 9, P.c);
      g.line(-6, -12, -22, -20, P.b, 3.5);
      g.line(6, -12, 22, -20, P.b, 3.5);
      g.pop();
      c.restore();

      if (phase === 'fly') {
        const good = Math.abs(skier.rot) < 0.3;
        g.text('ÁNGULO', W - 120, 40, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 1.5 });
        g.ring(W - 120, 82, 30, 6, 'rgba(255,255,255,.12)');
        g.ring(W - 120, 82, 30, 6, good ? '#4ade80' : '#ff8a3d', -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
        g.push(W - 120, 82, skier.rot);
        g.line(0, 0, 26, 0, P.ink, 3);
        g.pop();
        g.text(Math.round(dist) + ' m', W / 2, 60, {
          size: 34, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.4), shadowBlur: 14 });
      } else if (phase === 'ramp') {
        E.ui.hint('Mantén pulsado justo antes del borde para impulsarte', { bottom: 40 });
      }

      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.36, { size: 34 });
      E.particles.draw(g);
      if (phase === 'fly') E.ui.hint('↑ ↓ para controlar el ángulo del cuerpo', { bottom: 16 });
    },
  };
});
