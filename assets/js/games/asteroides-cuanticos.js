/* Asteroides Cuánticos — inercia real, rocas que se fragmentan y salto cuántico. */
NX.game('asteroides-cuanticos', {
  w: 900, h: 620, pal: 'ice',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'FUEGO' }, { k: 'shift', label: 'SALTO' }] },
  music: { root: 41, scale: 'minor', bpm: 96, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let ship, rocks, shots, score, lives, level, alive, jumpCd, invT, nextLifeAt;

  function wrap(o) {
    if (o.x < -30) o.x = W + 30; else if (o.x > W + 30) o.x = -30;
    if (o.y < -30) o.y = H + 30; else if (o.y > H + 30) o.y = -30;
  }

  function makeRock(x, y, size) {
    const n = 10;
    const shape = [];
    for (let i = 0; i < n; i++) shape.push(0.68 + E.rng.float(0, 0.42));
    const sp = 26 + level * 7 + (3 - size) * 22;
    const a = E.rng.float(0, M.TAU);
    return {
      x, y, size, r: size * 15,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      rot: E.rng.float(0, M.TAU), vr: E.rng.float(-1.2, 1.2), shape,
    };
  }

  function spawnLevel() {
    rocks = [];
    const n = 3 + level;
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = E.rng.float(0, W); y = E.rng.float(0, H); }
      while (M.dist(x, y, ship.x, ship.y) < 190);
      rocks.push(makeRock(x, y, 3));
    }
  }

  function reset() {
    ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, cool: 0, thrust: 0 };
    shots = []; score = 0; lives = 3; level = 1; alive = true; jumpCd = 0; invT = 2.5;
    nextLifeAt = 5000;
    spawnLevel();
    hud();
  }

  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Sector: level, Salto: jumpCd <= 0 ? 'listo' : jumpCd.toFixed(1) });
  }

  function split(rk, i) {
    rocks.splice(i, 1);
    const pts = rk.size === 3 ? 20 : rk.size === 2 ? 50 : 100;
    score += pts;
    E.floaters.add(rk.x, rk.y, '+' + pts, { col: P.c, size: 15 });
    E.particles.burst(rk.x, rk.y, 10 + rk.size * 5, {
      col: [P.a, P.ink, P.b], speed1: 150 + rk.size * 40, life1: 0.7, add: true, r1: 3,
    });
    E.sfx(rk.size === 1 ? 'tap' : 'hit');
    E.camera.kick(2 + rk.size * 1.6);
    if (rk.size > 1) {
      for (let k = 0; k < 2; k++) {
        const nr = makeRock(rk.x, rk.y, rk.size - 1);
        nr.vx += rk.vx * 0.4; nr.vy += rk.vy * 0.4;
        rocks.push(nr);
      }
    }
    if (score >= nextLifeAt) { nextLifeAt += 5000; lives++; E.sfx('power'); E.api.toast('Vida extra', '❤️'); }
    hud();
    if (!rocks.length) {
      level++;
      E.sfx('levelup');
      setTimeout(() => { if (alive) { spawnLevel(); hud(); } }, 700);
    }
  }

  function die() {
    lives--;
    invT = 3;
    E.sfx('explode');
    E.camera.kick(18);
    E.camera.flash('#ff4d6d', 0.35);
    E.particles.burst(ship.x, ship.y, 34, { col: [P.c, '#fff', P.a], speed1: 300, life1: 1.1, add: true });
    ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0;
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Sector alcanzado: ' + level, stats: { Sector: level } }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (invT > 0) invT -= dt;
      if (jumpCd > 0) { jumpCd -= dt; if (jumpCd <= 0) hud(); }

      if (E.input.down('left')) ship.a -= 3.6 * dt;
      if (E.input.down('right')) ship.a += 3.6 * dt;
      const th = E.input.down('up') || E.input.down('space') && false;
      ship.thrust = M.damp(ship.thrust, th ? 1 : 0, 10, dt);
      if (th) {
        ship.vx += Math.cos(ship.a) * 340 * dt;
        ship.vy += Math.sin(ship.a) * 340 * dt;
        if (Math.random() < 0.6) {
          E.particles.trail(ship.x - Math.cos(ship.a) * 16, ship.y - Math.sin(ship.a) * 16, {
            vx: -Math.cos(ship.a) * 90, vy: -Math.sin(ship.a) * 90, col: [P.c, P.a], r: 3, life: 0.4,
          });
        }
      }
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > 400) { ship.vx *= 400 / sp; ship.vy *= 400 / sp; }
      ship.vx *= Math.exp(-0.35 * dt); ship.vy *= Math.exp(-0.35 * dt);
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      wrap(ship);

      ship.cool -= dt;
      if ((E.input.down('space') || E.input.pointer.down) && ship.cool <= 0) {
        ship.cool = 0.2;
        shots.push({ x: ship.x + Math.cos(ship.a) * 18, y: ship.y + Math.sin(ship.a) * 18,
          vx: ship.vx + Math.cos(ship.a) * 520, vy: ship.vy + Math.sin(ship.a) * 520, life: 1.1 });
        ship.vx -= Math.cos(ship.a) * 22; ship.vy -= Math.sin(ship.a) * 22;
        E.sfx('laser');
      }
      if (E.input.pressed('shift') && jumpCd <= 0) {
        jumpCd = 6;
        E.particles.burst(ship.x, ship.y, 20, { col: [P.b], speed1: 200, add: true });
        ship.x = E.rng.float(60, W - 60); ship.y = E.rng.float(60, H - 60);
        ship.vx *= 0.3; ship.vy *= 0.3;
        E.particles.burst(ship.x, ship.y, 20, { col: [P.b, P.ink], speed1: 200, add: true });
        E.sfx('zap'); invT = Math.max(invT, 0.6); hud();
      }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        wrap(s);
        if (s.life <= 0) { shots.splice(i, 1); continue; }
        for (let k = rocks.length - 1; k >= 0; k--) {
          if (M.dist(s.x, s.y, rocks[k].x, rocks[k].y) < rocks[k].r) {
            shots.splice(i, 1); split(rocks[k], k); break;
          }
        }
      }

      rocks.forEach((r) => {
        r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
        wrap(r);
        if (invT <= 0 && M.dist(r.x, r.y, ship.x, ship.y) < r.r + 11) die();
      });
    },

    draw(g) {
      const c = g.ctx;
      g.bgSpace(E.t, 3);
      for (let i = 0; i < 60; i++) {
        const x = (i * 173.7) % W, y = (i * 97.1) % H;
        g.circle(x, y, 0.8 + (i % 4) * 0.35, alpha('#ffffff', 0.1 + (i % 4) * 0.06));
      }

      rocks.forEach((r) => {
        const pts = [];
        for (let i = 0; i < r.shape.length; i++) {
          const a = (i / r.shape.length) * M.TAU + r.rot;
          pts.push(r.x + Math.cos(a) * r.r * r.shape[i], r.y + Math.sin(a) * r.r * r.shape[i]);
        }
        g.poly(pts, mix(P.dim, P.deep, 0.5));
        g.polyStroke(pts, alpha(P.a, 0.75), 1.8, true);
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => { g.circle(s.x, s.y, 3.4, P.c); g.circle(s.x, s.y, 7, alpha(P.c, 0.25)); });
      c.restore();

      if (invT <= 0 || Math.floor(E.t * 12) % 2) {
        G.Sprites.ship(g, ship.x, ship.y, 13, ship.a, P.ink, P.c, ship.thrust);
      }
      if (invT > 0) g.ring(ship.x, ship.y, 22 + Math.sin(E.t * 8) * 2, 1.6, alpha(P.b, 0.6));

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('← → girar · ↑ propulsar · Espacio disparar · Shift salto cuántico', { bottom: 16 });
    },
  };
});
