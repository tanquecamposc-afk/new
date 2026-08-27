/* Nave Guardiana — shoot'em up vertical con tres armas, drones de apoyo y jefes. */
NX.game('nave-guardiana', {
  w: 720, h: 640, pal: 'neon',
  controls: { stick: true, buttons: [{ k: 'space', label: 'FUEGO' }, { k: 'shift', label: 'BOMBA' }] },
  music: { root: 40, scale: 'minor', bpm: 132, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let ship, foes, shots, bullets, drops, score, lives, weapon, power, bombs, wave, spawnT, alive, boss, iT, waveT;

  function reset() {
    ship = { x: W / 2, y: H - 90, cool: 0 };
    foes = []; shots = []; bullets = []; drops = [];
    score = 0; lives = 3; weapon = 0; power = 1; bombs = 2; wave = 1;
    spawnT = 0.8; alive = true; boss = null; iT = 1.5; waveT = 0;
    hud();
  }
  function hud() {
    E.api.hud({
      Puntos: M.fmtScore(score), Vidas: lives, Arma: ['Recta', 'Triple', 'Láser'][weapon] + ' ' + power,
      Bombas: bombs, Sector: wave,
    });
  }

  function spawnFoe(kind, x) {
    foes.push({
      x: x == null ? E.rng.float(50, W - 50) : x, y: -30, kind,
      hp: kind === 2 ? 8 + wave : kind === 1 ? 3 : 2,
      vy: kind === 1 ? 130 : kind === 2 ? 46 : 84, ph: E.rng.float(0, 6), cool: E.rng.float(0.6, 2),
      r: kind === 2 ? 26 : 17,
    });
  }

  function spawnBoss() {
    boss = { x: W / 2, y: -80, hp: 120 + wave * 40, max: 120 + wave * 40, vx: 110, fire: 1, phase: 0, t: 0 };
    E.sfx('alarm');
  }

  function hurt() {
    if (iT > 0) return;
    lives--; iT = 2.4; power = Math.max(1, power - 1);
    E.sfx('explode'); E.camera.kick(18); E.camera.flash('#ff4d6d', 0.45);
    E.particles.burst(ship.x, ship.y, 34, { col: [P.c, '#fff'], speed1: 320, add: true });
    bullets = [];
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Sector ' + wave, stats: { Sector: wave } }), 700);
    }
  }

  function useBomb() {
    if (bombs <= 0) return;
    bombs--;
    E.sfx('boom'); E.camera.kick(22); E.camera.flash('#ffffff', 0.6);
    bullets = [];
    foes.forEach((f) => { f.hp -= 6; });
    if (boss) boss.hp -= 40;
    E.particles.burst(ship.x, ship.y, 60, { col: [P.a, P.c, '#fff'], speed1: 520, life1: 1, add: true });
    hud();
  }

  function killFoe(f, i) {
    foes.splice(i, 1);
    score += f.kind === 2 ? 240 : f.kind === 1 ? 90 : 50;
    E.particles.burst(f.x, f.y, 14, { col: [P.a, P.b, P.c], speed1: 220, add: true });
    E.sfx('hit');
    if (E.rng.bool(0.18)) drops.push({ x: f.x, y: f.y, kind: E.rng.weighted([[0, 6], [1, 3], [2, 1]]), ph: 0 });
    hud();
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (iT > 0) iT -= dt;
      waveT += dt;

      const ax = E.input.axis();
      ship.x = M.clamp(ship.x + ax.x * 330 * dt, 22, W - 22);
      ship.y = M.clamp(ship.y + ax.y * 330 * dt, 40, H - 30);
      const p = E.input.pointer;
      if (p.down) { ship.x = M.damp(ship.x, p.x, 22, dt); ship.y = M.damp(ship.y, p.y, 22, dt); }

      if (E.input.pressed('shift')) useBomb();

      ship.cool -= dt;
      if (ship.cool <= 0) {
        ship.cool = weapon === 2 ? 0.1 : 0.14;
        if (weapon === 0) {
          for (let i = 0; i < power; i++) shots.push({ x: ship.x + (i - (power - 1) / 2) * 12, y: ship.y - 20, vx: 0, vy: -720, dmg: 1 });
        } else if (weapon === 1) {
          for (let i = 0; i < power + 1; i++) {
            const a = -Math.PI / 2 + (i - power / 2) * 0.2;
            shots.push({ x: ship.x, y: ship.y - 18, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg: 1 });
          }
        } else {
          shots.push({ x: ship.x, y: ship.y - 20, vx: 0, vy: -980, dmg: 0.6 * power, laser: true });
        }
        E.sfx('shoot');
      }

      /* generación */
      if (!boss) {
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = Math.max(0.32, 1.1 - wave * 0.05);
          const k = E.rng.weighted([[0, 10], [1, wave > 1 ? 5 : 0], [2, wave > 3 ? 2 : 0]]);
          spawnFoe(k);
        }
        if (waveT > 26) { waveT = 0; spawnBoss(); }
      }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y < -20 || s.x < -20 || s.x > W + 20) { shots.splice(i, 1); continue; }
        let done = false;
        for (let k = foes.length - 1; k >= 0; k--) {
          const f = foes[k];
          if (M.dist(s.x, s.y, f.x, f.y) < f.r) {
            f.hp -= s.dmg;
            if (!s.laser) { shots.splice(i, 1); done = true; }
            if (f.hp <= 0) killFoe(f, k);
            break;
          }
        }
        if (!done && boss && Math.abs(s.x - boss.x) < 68 && Math.abs(s.y - boss.y) < 34) {
          boss.hp -= s.dmg;
          if (!s.laser) shots.splice(i, 1);
          E.particles.burst(s.x, s.y, 2, { col: [P.c], speed1: 60 });
          if (boss.hp <= 0) {
            score += 2000 + wave * 500;
            E.particles.burst(boss.x, boss.y, 70, { col: [P.a, P.c, '#fff'], speed1: 460, life1: 1.4, add: true });
            E.camera.kick(24); E.sfx('boom');
            boss = null; wave++; bombs++; waveT = 0; hud();
          }
        }
      }

      foes.forEach((f) => {
        f.ph += dt * 3;
        f.y += f.vy * dt;
        f.x += Math.sin(f.ph) * (f.kind === 1 ? 90 : 40) * dt;
        f.cool -= dt;
        if (f.cool <= 0 && f.y > 0 && f.y < H * 0.75) {
          f.cool = E.rng.float(1.2, 3);
          const a = Math.atan2(ship.y - f.y, ship.x - f.x);
          bullets.push({ x: f.x, y: f.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210 });
        }
      });
      for (let i = foes.length - 1; i >= 0; i--) {
        if (foes[i].y > H + 40) foes.splice(i, 1);
        else if (iT <= 0 && M.dist(foes[i].x, foes[i].y, ship.x, ship.y) < foes[i].r + 12) { hurt(); }
      }

      if (boss) {
        boss.t += dt;
        boss.y = M.damp(boss.y, 110, 2, dt);
        boss.x += boss.vx * dt;
        if (boss.x < 90 || boss.x > W - 90) boss.vx *= -1;
        boss.fire -= dt;
        if (boss.fire <= 0 && boss.y > 60) {
          const ph = Math.floor((1 - boss.hp / boss.max) * 3);
          boss.fire = 0.5;
          if (ph === 0) {
            for (let i = -2; i <= 2; i++) bullets.push({ x: boss.x + i * 20, y: boss.y + 30, vx: i * 40, vy: 230 });
          } else if (ph === 1) {
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * M.TAU + boss.t;
              bullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 });
            }
          } else {
            const a = Math.atan2(ship.y - boss.y, ship.x - boss.x);
            for (let i = -3; i <= 3; i++) bullets.push({ x: boss.x, y: boss.y + 20, vx: Math.cos(a + i * 0.13) * 260, vy: Math.sin(a + i * 0.13) * 260 });
          }
          E.sfx('laser');
        }
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) { bullets.splice(i, 1); continue; }
        if (iT <= 0 && M.dist(b.x, b.y, ship.x, ship.y) < 11) { bullets.splice(i, 1); hurt(); }
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += 90 * dt; d.ph += dt * 5;
        if (d.y > H + 20) { drops.splice(i, 1); continue; }
        if (M.dist(d.x, d.y, ship.x, ship.y) < 24) {
          drops.splice(i, 1);
          if (d.kind === 2) { bombs++; E.floaters.add(ship.x, ship.y - 24, 'Bomba', { col: P.c }); }
          else if (d.kind === 1) { weapon = (weapon + 1) % 3; E.floaters.add(ship.x, ship.y - 24, ['Recta', 'Triple', 'Láser'][weapon], { col: P.b }); }
          else { power = Math.min(4, power + 1); E.floaters.add(ship.x, ship.y - 24, 'Potencia ' + power, { col: P.a }); }
          E.sfx('power'); hud();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      for (let i = 0; i < 60; i++) {
        const x = (i * 137.5) % W, y = (i * 89.3 + E.t * (60 + (i % 3) * 60)) % H;
        g.circle(x, y, 0.9 + (i % 3) * 0.5, alpha('#ffffff', 0.14 + (i % 3) * 0.08));
      }

      drops.forEach((d) => {
        const col = [P.a, P.b, P.c][d.kind];
        g.bloom(d.x, d.y, 22, col, 0.5);
        g.rrect(d.x - 10, d.y - 10, 20, 20, 6, col);
        g.text(['P', 'W', 'B'][d.kind], d.x, d.y + 5, { size: 13, align: 'center', color: '#0d1220', weight: 900 });
      });

      foes.forEach((f) => {
        const col = [P.b, P.c, P.d][f.kind];
        g.push(f.x, f.y, Math.PI);
        if (f.kind === 2) { g.ngon(0, 0, f.r, 6, f.ph * 0.2, mix(col, P.deep, 0.15)); g.ngon(0, 0, f.r * 0.5, 6, -f.ph, P.c); }
        else { g.poly([0, -f.r, f.r * 0.85, f.r * 0.7, 0, f.r * 0.3, -f.r * 0.85, f.r * 0.7], col);
               g.circle(0, 0, f.r * 0.28, P.deep); }
        g.pop();
      });

      if (boss) {
        g.bloom(boss.x, boss.y, 120, P.b, 0.35);
        g.rrect(boss.x - 66, boss.y - 30, 132, 58, 18, mix(P.b, P.deep, 0.25));
        g.rrect(boss.x - 40, boss.y - 12, 80, 24, 10, P.deep);
        for (let i = -1; i <= 1; i++) g.circle(boss.x + i * 26, boss.y, 8, i === 0 ? P.c : P.a);
        g.rrect(20, 14, W - 40, 8, 4, 'rgba(255,255,255,.14)');
        g.rrect(20, 14, (W - 40) * (boss.hp / boss.max), 8, 4, '#ff4d6d');
      }

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => {
        if (s.laser) g.capsule(s.x, s.y, s.x, s.y + 26, 4, alpha(P.b, 0.9));
        else g.capsule(s.x, s.y, s.x - s.vx * 0.02, s.y - s.vy * 0.02, 3, P.c);
      });
      bullets.forEach((b) => { g.circle(b.x, b.y, 6, alpha('#ff6b8a', 0.55)); g.circle(b.x, b.y, 3, '#fff'); });
      c.restore();

      if (iT <= 0 || Math.floor(E.t * 14) % 2) {
        G.Sprites.ship(g, ship.x, ship.y, 16, -Math.PI / 2, P.ink, P.a, 0.7);
      }

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('WASD · Espacio disparar · Shift bomba · recoge P/W/B', { bottom: 12 });
    },
  };
});
