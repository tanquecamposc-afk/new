/* Invasores Neón — oleadas descendentes, escudos destructibles, jefes y nave bonus. */
NX.game('invasores-neon', {
  w: 900, h: 640, pal: 'royal',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'FUEGO' }] },
  music: { root: 43, scale: 'minor', bpm: 112, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  const COLS = 9, ROWS = 4;
  let ship, aliens, shots, bombs, shields, ufo, wave, score, lives, dirX, dropT, fireT, alive, boss, freeze;

  function makeAliens() {
    aliens = [];
    const kinds = [2, 1, 1, 0];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        aliens.push({
          x: 120 + c * 74, y: 90 + r * 56, w: 40, h: 28,
          kind: kinds[r], hp: 1 + (wave > 6 ? 1 : 0), alive: true, ph: (r + c) * 0.4,
        });
      }
    }
  }

  function makeShields() {
    shields = [];
    for (let s = 0; s < 4; s++) {
      const bx = 120 + s * 190;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 3 && c > 1 && c < 5) continue;
          shields.push({ x: bx + c * 13, y: H - 190 + r * 13, hp: 3 });
        }
      }
    }
  }

  function reset() {
    ship = { x: W / 2, y: H - 74, w: 46, cool: 0, hitT: 0 };
    shots = []; bombs = []; ufo = null; boss = null;
    wave = 1; score = 0; lives = 3; dirX = 1; dropT = 0; fireT = 0; alive = true; freeze = 0;
    makeAliens(); makeShields();
    hud();
  }

  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Oleada: wave });
  }

  function nextWave() {
    wave++;
    E.sfx('levelup');
    E.camera.flash(P.a, 0.25);
    makeAliens();
    if (wave % 5 === 0) {
      boss = { x: W / 2, y: 110, hp: 26 + wave * 4, max: 26 + wave * 4, vx: 90, fire: 0 };
      E.sfx('alarm');
    }
    if (wave % 3 === 0) makeShields();
    hud();
  }

  function die() {
    lives--;
    E.sfx('hurt');
    E.camera.kick(14);
    E.camera.flash('#ff4d6d', 0.4);
    E.particles.burst(ship.x, ship.y, 30, { col: [P.c, '#fff', P.b], speed1: 260, life1: 0.9, add: true });
    ship.hitT = 1.4;
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Llegaste a la oleada ' + wave, stats: { Oleada: wave } }), 700);
    }
  }

  function hitShield(x, y) {
    for (let i = 0; i < shields.length; i++) {
      const s = shields[i];
      if (x > s.x - 7 && x < s.x + 7 && y > s.y - 7 && y < s.y + 7) {
        s.hp--;
        E.particles.burst(x, y, 5, { col: [P.a], speed1: 90, life1: 0.3 });
        if (s.hp <= 0) shields.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function killAlien(a) {
    a.alive = false;
    const pts = (3 - a.kind) * 10 + wave * 2;
    score += pts;
    E.sfx('hit');
    E.floaters.add(a.x, a.y, '+' + pts, { col: P.c, size: 16 });
    E.particles.burst(a.x, a.y, 12, { col: [P.a, P.b, P.c], speed1: 180, life1: 0.6, add: true });
    hud();
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (ship.hitT > 0) ship.hitT -= dt;

      /* nave */
      const ax = E.input.axis().x;
      ship.x += ax * 420 * dt;
      if (E.input.pointer.down && !E.input.pointer.inside === false) {
        ship.x = M.damp(ship.x, E.input.pointer.x, 12, dt);
      }
      ship.x = M.clamp(ship.x, 40, W - 40);
      ship.cool -= dt;
      const wantFire = E.input.down('space') || E.input.down('up') || (E.input.pointer.down && E.input.pointer.y < H - 120);
      if (wantFire && ship.cool <= 0) {
        ship.cool = 0.28;
        shots.push({ x: ship.x, y: ship.y - 22, vy: -640 });
        E.sfx('shoot');
      }

      /* disparos */
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.y += s.vy * dt;
        if (s.y < -20) { shots.splice(i, 1); continue; }
        if (hitShield(s.x, s.y)) { shots.splice(i, 1); continue; }
        let hit = false;
        for (const a of aliens) {
          if (!a.alive) continue;
          if (Math.abs(s.x - a.x) < a.w / 2 && Math.abs(s.y - a.y) < a.h / 2) {
            a.hp--;
            if (a.hp <= 0) killAlien(a); else E.sfx('tap');
            hit = true; break;
          }
        }
        if (!hit && ufo && Math.abs(s.x - ufo.x) < 34 && Math.abs(s.y - ufo.y) < 16) {
          score += 150; hit = true;
          E.floaters.add(ufo.x, ufo.y, '+150', { col: P.c, size: 24 });
          E.particles.burst(ufo.x, ufo.y, 22, { col: [P.c, P.b], speed1: 230, add: true });
          E.sfx('power'); ufo = null; hud();
        }
        if (!hit && boss && Math.abs(s.x - boss.x) < 76 && Math.abs(s.y - boss.y) < 30) {
          boss.hp--; hit = true;
          E.sfx('tap');
          E.particles.burst(s.x, s.y, 4, { col: [P.c], speed1: 90 });
          if (boss.hp <= 0) {
            score += 500 + wave * 40;
            E.particles.burst(boss.x, boss.y, 48, { col: [P.c, P.b, '#fff'], speed1: 340, life1: 1.2, add: true });
            E.camera.kick(20); E.sfx('boom'); boss = null; hud();
          }
        }
        if (hit) shots.splice(i, 1);
      }

      /* enjambre */
      const live = aliens.filter((a) => a.alive);
      if (!live.length && !boss) { nextWave(); return; }
      const speed = (34 + wave * 6) * (1 + (ROWS * COLS - live.length) / (ROWS * COLS) * 2.2);
      let edge = false;
      live.forEach((a) => {
        a.x += dirX * speed * dt;
        a.ph += dt * 3;
        if (a.x < 42 || a.x > W - 42) edge = true;
      });
      if (edge) { dirX *= -1; live.forEach((a) => { a.y += 26; }); E.sfx('tick'); }
      if (live.some((a) => a.y > H - 130)) { lives = 1; die(); }

      /* bombas */
      fireT -= dt;
      if (fireT <= 0 && live.length) {
        fireT = Math.max(0.24, 1.5 - wave * 0.09);
        const a = M.pick(live);
        bombs.push({ x: a.x, y: a.y + 16, vy: 190 + wave * 12, ph: 0 });
      }
      if (boss) {
        boss.x += boss.vx * dt;
        if (boss.x < 100 || boss.x > W - 100) boss.vx *= -1;
        boss.fire -= dt;
        if (boss.fire <= 0) {
          boss.fire = 0.55;
          for (let k = -1; k <= 1; k++) bombs.push({ x: boss.x + k * 26, y: boss.y + 30, vy: 250, ph: 0 });
          E.sfx('laser');
        }
      }
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        b.y += b.vy * dt; b.ph += dt * 12;
        if (b.y > H + 20) { bombs.splice(i, 1); continue; }
        if (hitShield(b.x, b.y)) { bombs.splice(i, 1); continue; }
        if (ship.hitT <= 0 && Math.abs(b.x - ship.x) < 22 && Math.abs(b.y - ship.y) < 18) {
          bombs.splice(i, 1); die();
        }
      }

      /* nave bonus */
      if (!ufo && Math.random() < dt * 0.09) {
        ufo = { x: -50, y: 56, vx: 150 * (Math.random() < 0.5 ? 1 : -1) };
        if (ufo.vx < 0) ufo.x = W + 50;
        E.sfx('charge');
      }
      if (ufo) { ufo.x += ufo.vx * dt; if (ufo.x < -70 || ufo.x > W + 70) ufo = null; }
    },

    draw(g) {
      const c = g.ctx;
      /* fondo estrellado */
      for (let i = 0; i < 40; i++) {
        const x = (i * 137.5) % W, y = (i * 89.3 + E.t * (8 + (i % 3) * 6)) % H;
        g.circle(x, y, 1 + (i % 3) * 0.5, alpha('#ffffff', 0.15 + (i % 3) * 0.1));
      }

      /* escudos */
      shields.forEach((s) => {
        g.rect(s.x - 6.5, s.y - 6.5, 13, 13, mix(P.a, P.deep, 1 - s.hp / 3 * 0.7));
      });

      /* invasores */
      aliens.forEach((a) => {
        if (!a.alive) return;
        const col = [P.a, P.b, P.c][a.kind];
        const bob = Math.sin(a.ph) * 3;
        g.push(a.x, a.y + bob);
        g.rect(-11, -7, 22, 12, col);
        g.rect(-16, -2, 6, 9, col); g.rect(10, -2, 6, 9, col);
        g.rect(-9, -13, 5, 6, col); g.rect(4, -13, 5, 6, col);
        g.rect(-13, 5, 5, 5, col); g.rect(8, 5, 5, 5, col);
        g.rect(-7, -3, 4, 4, P.deep); g.rect(3, -3, 4, 4, P.deep);
        g.pop();
      });

      /* jefe */
      if (boss) {
        g.bloom(boss.x, boss.y, 110, P.b, 0.4);
        g.rrect(boss.x - 74, boss.y - 26, 148, 52, 16, mix(P.b, P.deep, 0.25));
        g.rrect(boss.x - 52, boss.y - 12, 104, 22, 10, P.deep);
        for (let i = -2; i <= 2; i++) g.circle(boss.x + i * 24, boss.y, 6, i === 0 ? P.c : P.a);
        g.rrect(boss.x - 74, boss.y - 42, 148, 7, 4, 'rgba(255,255,255,.14)');
        g.rrect(boss.x - 74, boss.y - 42, 148 * (boss.hp / boss.max), 7, 4, '#ff4d6d');
      }

      /* nave bonus */
      if (ufo) {
        g.bloom(ufo.x, ufo.y, 46, P.c, 0.5);
        c.save(); c.translate(ufo.x, ufo.y);
        c.fillStyle = P.c; c.beginPath(); c.ellipse(0, 0, 32, 11, 0, 0, M.TAU); c.fill();
        c.fillStyle = mix(P.c, '#fff', 0.5); c.beginPath(); c.ellipse(0, -8, 15, 9, 0, Math.PI, 0); c.fill();
        c.restore();
      }

      /* proyectiles */
      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => { g.capsule(s.x, s.y, s.x, s.y + 16, 3, P.c); });
      bombs.forEach((b) => {
        const w = Math.sin(b.ph) * 4;
        g.capsule(b.x + w, b.y - 10, b.x - w, b.y + 6, 3, '#ff6b8a');
      });
      c.restore();

      /* nave */
      if (ship.hitT <= 0 || Math.floor(E.t * 14) % 2) {
        g.bloom(ship.x, ship.y + 6, 40, P.a, 0.4);
        g.poly([ship.x, ship.y - 22, ship.x + 24, ship.y + 14, ship.x + 14, ship.y + 14,
                ship.x + 10, ship.y + 6, ship.x - 10, ship.y + 6, ship.x - 14, ship.y + 14,
                ship.x - 24, ship.y + 14], P.ink);
        g.rect(ship.x - 3, ship.y - 30, 6, 10, P.c);
        c.save(); c.globalCompositeOperation = 'lighter';
        g.poly([ship.x - 7, ship.y + 14, ship.x + 7, ship.y + 14,
                ship.x, ship.y + 22 + Math.sin(E.t * 30) * 5], alpha(P.a, 0.8));
        c.restore();
      }

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('← → mover · Espacio disparar', { bottom: 16 });
    },
  };
});
