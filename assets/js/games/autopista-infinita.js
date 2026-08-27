/* Autopista Infinita — adelanta a centímetros para sumar puntos. */
NX.game('autopista-infinita', {
  w: 620, h: 700, pal: 'mono',
  controls: { dpad: 'lr' },
  music: { root: 41, scale: 'minor', bpm: 134, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const LANES = 4, ROAD_X = 70, ROAD_W = W - 140;
  const laneX = (i) => ROAD_X + (i + 0.5) * (ROAD_W / LANES);

  let me, cars, speed, dist, score, alive, spawnT, near, msg, msgT, dashOff, fuel;

  function reset() {
    me = { lane: 1, x: laneX(1), y: H - 150 };
    cars = []; speed = 260; dist = 0; score = 0; alive = true; spawnT = 0.6; near = 0;
    msg = ''; msgT = 0; dashOff = 0; fuel = 1;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Distancia: Math.round(dist) + ' m', Velocidad: Math.round(speed) + ' km/h' });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      speed = Math.min(760, speed + dt * 7);
      dist += speed * dt / 22;
      score += speed * dt * 0.04;
      dashOff += speed * dt;

      const p = E.input.pointer;
      if (E.input.pressed('left')) me.lane = Math.max(0, me.lane - 1), E.sfx('slide');
      if (E.input.pressed('right')) me.lane = Math.min(LANES - 1, me.lane + 1), E.sfx('slide');
      const sw = E.input.swipe;
      if (sw) {
        if (sw.dir === 'left') me.lane = Math.max(0, me.lane - 1);
        if (sw.dir === 'right') me.lane = Math.min(LANES - 1, me.lane + 1);
      }
      if (p.down) me.lane = M.clamp(Math.floor((p.x - ROAD_X) / (ROAD_W / LANES)), 0, LANES - 1);
      me.x = M.damp(me.x, laneX(me.lane), 14, dt);

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.24, 0.9 - dist * 0.0006);
        const lane = E.rng.int(LANES);
        if (!cars.some((c2) => c2.lane === lane && c2.y < 120)) {
          cars.push({ lane, x: laneX(lane), y: -110, sp: E.rng.float(90, 190), col: E.rng.pick([P.a, P.b, P.d, '#ff8a3d']), passed: false, near: false });
        }
      }

      for (let i = cars.length - 1; i >= 0; i--) {
        const c2 = cars[i];
        c2.y += (speed - c2.sp) * dt;
        if (c2.y > H + 120) { cars.splice(i, 1); continue; }
        const dx = Math.abs(c2.x - me.x), dy = Math.abs(c2.y - me.y);
        if (dx < 40 && dy < 62) {
          alive = false;
          E.sfx('explode'); E.camera.kick(20); E.camera.flash('#ff4d6d', 0.55);
          E.particles.burst(me.x, me.y, 34, { col: [P.c, '#fff'], speed1: 320, add: true });
          setTimeout(() => E.api.over({
            score: Math.round(score), msg: Math.round(dist) + ' metros a ' + Math.round(speed) + ' km/h',
            stats: { Distancia: Math.round(dist) + ' m' },
          }), 600);
          return;
        }
        if (!c2.near && dx < 78 && dy < 70) { c2.near = true; }
        if (!c2.passed && c2.y > me.y + 40) {
          c2.passed = true;
          const bonus = c2.near ? 180 : 60;
          score += bonus;
          if (c2.near) {
            near++;
            E.sfx('swoosh');
            E.floaters.add(me.x, me.y - 40, '¡Rozando! +' + bonus, { col: P.c, size: 17 });
          }
          hud();
        }
      }
      if (Math.floor(dist) % 5 === 0) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.25), P.deep);
      /* paisaje */
      for (let i = 0; i < 14; i++) {
        const y = ((i * 90 + dashOff * 0.5) % (H + 120)) - 60;
        g.rect(10, y, 40, 60, alpha(mix(P.d, P.deep, 0.3), 0.6));
        g.rect(W - 50, y + 40, 40, 60, alpha(mix(P.d, P.deep, 0.3), 0.6));
      }
      g.rect(ROAD_X, 0, ROAD_W, H, mix('#2a3040', P.deep, 0.35));
      g.rect(ROAD_X - 6, 0, 6, H, P.c);
      g.rect(ROAD_X + ROAD_W, 0, 6, H, P.c);
      c.save(); c.setLineDash([30, 26]); c.lineDashOffset = -dashOff % 56;
      c.strokeStyle = alpha('#ffffff', 0.5); c.lineWidth = 4;
      for (let i = 1; i < LANES; i++) {
        const x = ROAD_X + i * (ROAD_W / LANES);
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      c.restore();

      const car = (x, y, col, mine) => {
        g.push(x, y);
        c.save(); c.globalAlpha = 0.35; g.rrect(-22, -40, 44, 82, 10, '#000'); c.restore();
        g.rrect(-22, -42, 44, 84, 10, col);
        g.rrect(-16, -30, 32, 26, 6, alpha('#0b1220', 0.75));
        g.rrect(-16, 6, 32, 20, 6, alpha('#0b1220', 0.6));
        g.rect(-24, -30, 6, 18, '#1b2437'); g.rect(18, -30, 6, 18, '#1b2437');
        g.rect(-24, 12, 6, 18, '#1b2437'); g.rect(18, 12, 6, 18, '#1b2437');
        if (mine) {
          g.rect(-14, 40, 8, 4, '#ff4d6d'); g.rect(6, 40, 8, 4, '#ff4d6d');
          c.save(); c.globalCompositeOperation = 'lighter';
          g.poly([-16, -42, -8, -42, -12, -74], alpha(P.c, 0.28));
          g.poly([8, -42, 16, -42, 12, -74], alpha(P.c, 0.28));
          c.restore();
        }
        g.pop();
      };
      cars.forEach((c2) => car(c2.x, c2.y, c2.col, false));
      car(me.x, me.y, P.c, true);

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(Math.round(speed) + ' km/h', W / 2, 46, {
        size: 26, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.c, 0.4), shadowBlur: 12 });
      E.ui.hint('← → cambiar de carril · pasa cerca para ganar más', { bottom: 14 });
    },
  };
});
