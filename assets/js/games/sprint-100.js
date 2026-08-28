/* Sprint 100 — cien metros alternando teclas: salida, ritmo y remate. */
NX.game('sprint-100', {
  w: 900, h: 520, pal: 'ember',
  controls: { dpad: 'lr' },
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const TRACK_Y = 190;
  const laneY = (l) => TRACK_Y + (l + 0.5) * (H - TRACK_Y) / 5;
  const DIST = 100;

  let state, t, countdown, dist, speed, lastKey, cadence, rivals, alive, falseStart, camX, best, stride;

  function reset() {
    state = 'ready'; t = 0; countdown = 3.2; dist = 0; speed = 0; lastKey = null;
    cadence = 0; alive = true; falseStart = false; camX = 0; stride = 0;
    rivals = [
      { name: 'BOT-1', dist: 0, sp: 8.2 + E.rng.float(-0.4, 0.5), lane: 1 },
      { name: 'BOT-2', dist: 0, sp: 8.6 + E.rng.float(-0.4, 0.5), lane: 2 },
      { name: 'BOT-3', dist: 0, sp: 9.0 + E.rng.float(-0.5, 0.4), lane: 4 },
    ];
    hud();
  }
  function hud() {
    E.api.hud({ Metros: dist.toFixed(1), Tiempo: t.toFixed(2) + 's', Velocidad: speed.toFixed(1) + ' m/s' });
  }

  function step(key) {
    if (state === 'ready') {
      falseStart = true; state = 'false';
      E.sfx('error');
      setTimeout(() => { reset(); }, 1600);
      return;
    }
    if (state !== 'run') return;
    if (lastKey === key) { speed = Math.max(0, speed - 0.4); return; }
    lastKey = key;
    cadence = 1;
    speed = Math.min(12.5, speed + 0.85);
    E.sfx('step');
    stride++;
    /* Polvo bajo los pies: es lo único que da sensación de esfuerzo. */
    E.particles.burst(dist * 8, laneY(3) + 14, 4, {
      col: [P.dim, '#ffffff'], speed0: 30, speed1: 110, life1: 0.4,
      angle: Math.PI, spread: 0.8, r1: 3, grav: 220,
    });
    if (speed > 9) E.camera.kick(1.2);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (cadence > 0) cadence -= dt * 4;

      if (E.input.pressed('left') || E.input.pressed('a')) step('L');
      if (E.input.pressed('right') || E.input.pressed('d')) step('R');
      if (E.input.pointer.pressed) step(E.input.pointer.x < W / 2 ? 'L' : 'R');

      if (state === 'ready') {
        countdown -= dt;
        if (countdown <= 0) { state = 'run'; E.sfx('alarm'); }
        else if (Math.ceil(countdown) !== Math.ceil(countdown + dt)) E.sfx('tick');
        return;
      }
      if (state !== 'run') return;

      t += dt;
      speed = Math.max(0, speed - 2.6 * dt);
      dist += speed * dt;
      camX = M.damp(camX, Math.max(0, dist * 8 - W * 0.3), 6, dt);
      rivals.forEach((r) => { r.dist = Math.min(DIST, r.dist + r.sp * dt * (0.9 + Math.sin(t * 2 + r.lane) * 0.06)); });
      hud();

      if (dist >= DIST) {
        state = 'done';
        alive = false;
        const place = 1 + rivals.filter((r) => r.dist >= DIST).length;
        E.sfx(place === 1 ? 'win' : 'lose');
        setTimeout(() => {
          const o = {
            score: Math.round(t * 100), label: 'Centésimas', lower: true,
            fmt: (v) => (v / 100).toFixed(2) + ' s',
            title: place === 1 ? '¡Primero!' : 'Puesto ' + place,
            msg: '100 m en ' + t.toFixed(2) + ' segundos',
            stats: { Tiempo: t.toFixed(2) + ' s', Puesto: place },
          };
          place === 1 ? E.api.win(o) : E.api.over(o);
        }, 900);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.35), P.deep);
      /* gradas */
      for (let i = 0; i < 70; i++) {
        g.circle((i * 61) % W, 40 + ((i * 37) % 60), 6, alpha(['#ff8a3d', '#ffd45e', '#22e0ff'][i % 3], 0.12));
      }
      const trackY = TRACK_Y;
      g.rect(0, trackY, W, H - trackY, mix('#b23a2e', P.deep, 0.42));
      for (let i = 1; i < 5; i++) g.rect(0, trackY + i * (H - trackY) / 5, W, 2, alpha('#ffffff', 0.35));

      c.save(); c.translate(-camX, 0);
      /* líneas de meta y salida */
      for (let m = 0; m <= DIST; m += 10) {
        const x = m * 8;
        g.line(x, trackY, x, H, alpha('#ffffff', m % 50 === 0 ? 0.4 : 0.12), m % 50 === 0 ? 3 : 1.5);
        if (m % 20 === 0) g.text(m + 'm', x + 4, trackY - 8, { size: 12, color: alpha(P.ink, 0.6), weight: 800 });
      }
      for (let i = 0; i < 14; i++) {
        g.rect(DIST * 8, trackY + i * 24, 8, 12, i % 2 ? '#111827' : '#ffffff');
        g.rect(DIST * 8 + 8, trackY + i * 24, 8, 12, i % 2 ? '#ffffff' : '#111827');
      }

      const runner = (x, y, col, ph, lead) => {
        const s = Math.sin(ph);
        g.push(x, y);
        g.circle(0, -34, 10, '#f0c49a');
        g.rrect(-7, -26, 14, 26, 6, col);
        g.line(0, 0, -12 * s, 18, col, 4.5);
        g.line(0, 0, 12 * s, 18, col, 4.5);
        g.line(0, -20, 14 * s, -28, col, 4);
        g.line(0, -20, -14 * s, -12, col, 4);
        if (lead) g.text('▼', 0, -52, { size: 14, align: 'center', color: P.c });
        g.pop();
      };
      rivals.forEach((r) => runner(r.dist * 8, laneY(r.lane), P.b, t * 12 + r.lane, false));
      runner(dist * 8, laneY(3), P.a, stride * 1.6, true);
      c.restore();

      if (state === 'ready') {
        E.ui.title(countdown > 2 ? 'A sus puestos' : countdown > 1 ? 'Listos' : '¡Ya!', W / 2, 120, { size: 42 });
      } else if (state === 'false') {
        E.ui.title('Salida nula', W / 2, 120, { size: 38 });
      } else {
        g.text(t.toFixed(2) + ' s', W / 2, 70, {
          size: 38, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.c, 0.4), shadowBlur: 14 });
        g.rrect(W / 2 - 150, 92, 300, 10, 5, 'rgba(255,255,255,.14)');
        g.rrect(W / 2 - 150, 92, 300 * (speed / 12.5), 10, 5, P.c);
      }

      /* teclas */
      const kx = W / 2;
      ['◀ Izq', 'Der ▶'].forEach((label, i) => {
        const x = kx + (i ? 70 : -170);
        const on = lastKey === (i ? 'R' : 'L') && cadence > 0;
        g.rrect(x, H - 60, 100, 40, 10, on ? P.c : 'rgba(255,255,255,.08)');
        g.text(label, x + 50, H - 34, { size: 14, align: 'center', weight: 800, color: on ? '#0d1220' : P.ink });
      });

      E.ui.hint('Alterna ← y → lo más rápido que puedas', { bottom: 78 });
    },
  };
});
