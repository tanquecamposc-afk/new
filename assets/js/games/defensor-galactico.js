/* Defensor Galáctico — patrulla lateral rescatando colonos antes de que se los lleven. */
NX.game('defensor-galactico', {
  w: 940, h: 560, pal: 'royal',
  controls: { stick: true, buttons: [{ k: 'space', label: 'FUEGO' }] },
  music: { root: 43, scale: 'minor', bpm: 126, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const WORLD = 2600, GY = H - 60;

  let ship, camX, foes, shots, colonos, score, lives, wave, alive, spawnT, terrain;

  function makeTerrain() {
    terrain = [];
    for (let x = 0; x <= WORLD; x += 40) {
      terrain.push(GY - 20 - Math.sin(x * 0.007) * 22 - Math.sin(x * 0.021) * 12);
    }
  }
  const ground = (x) => {
    const i = M.clamp(Math.floor(x / 40), 0, terrain.length - 2);
    const t = (x - i * 40) / 40;
    return M.lerp(terrain[i], terrain[i + 1], t);
  };

  function reset() {
    makeTerrain();
    ship = { x: 200, y: H / 2, vx: 0, vy: 0, dir: 1, cool: 0, iT: 0 };
    camX = 0; foes = []; shots = []; colonos = [];
    score = 0; lives = 3; wave = 1; alive = true; spawnT = 0;
    for (let i = 0; i < 8; i++) {
      const x = 200 + i * 280;
      colonos.push({ x, y: ground(x) - 12, held: null, saved: false, ph: E.rng.float(0, 6) });
    }
    spawnWave();
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Naves: lives, Colonos: colonos.filter((c) => !c.saved).length, Oleada: wave });
  }

  function spawnWave() {
    const n = 4 + wave;
    for (let i = 0; i < n; i++) {
      foes.push({
        x: E.rng.float(0, WORLD), y: E.rng.float(60, GY - 120),
        vx: E.rng.sign() * (52 + wave * 6), vy: 0, kind: 0, cool: E.rng.float(1, 4), grab: null, ph: E.rng.float(0, 6),
      });
    }
  }

  function hurt() {
    lives--; ship.iT = 2;
    E.sfx('explode'); E.camera.kick(16); E.camera.flash('#ff4d6d', 0.4);
    E.particles.burst(ship.x - camX, ship.y, 30, { col: [P.c, '#fff'], speed1: 300, add: true });
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Oleada ' + wave, stats: { Oleada: wave } }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (ship.iT > 0) ship.iT -= dt;
      const ax = E.input.axis();
      ship.vx = M.damp(ship.vx, ax.x * 330, 6, dt);
      ship.vy = M.damp(ship.vy, ax.y * 250, 8, dt);
      if (Math.abs(ship.vx) > 12) ship.dir = Math.sign(ship.vx);
      ship.x = M.wrap(ship.x + ship.vx * dt, 0, WORLD);
      ship.y = M.clamp(ship.y + ship.vy * dt, 34, GY - 26);
      camX = M.damp(camX, M.clamp(ship.x - W / 2 - ship.dir * 90, 0, WORLD - W), 6, dt);

      ship.cool -= dt;
      if ((E.input.down('space') || E.input.pointer.down) && ship.cool <= 0) {
        ship.cool = 0.16;
        shots.push({ x: ship.x, y: ship.y, vx: ship.dir * 780, life: 0.9 });
        E.sfx('laser');
      }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * dt; s.life -= dt;
        if (s.life <= 0) { shots.splice(i, 1); continue; }
        for (let k = foes.length - 1; k >= 0; k--) {
          const f = foes[k];
          if (Math.abs(f.x - s.x) < 20 && Math.abs(f.y - s.y) < 16) {
            if (f.grab) f.grab.held = null;
            E.particles.burst(f.x - camX, f.y, 14, { col: [P.a, P.c], speed1: 220, add: true });
            E.sfx('hit');
            foes.splice(k, 1); shots.splice(i, 1);
            score += 80; hud();
            break;
          }
        }
      }

      foes.forEach((f) => {
        f.ph += dt * 3;
        if (f.grab) {
          f.vy = -60;
          f.y += f.vy * dt;
          f.grab.x = f.x; f.grab.y = f.y + 26;
          if (f.y < 30) {
            f.grab.saved = true;                 /* colono perdido */
            colonos.splice(colonos.indexOf(f.grab), 1);
            f.grab = null; f.vy = 0;
            E.sfx('error'); hud();
            if (!colonos.length) { lives = 1; hurt(); }
          }
        } else {
          f.x = M.wrap(f.x + f.vx * dt, 0, WORLD);
          f.y += Math.sin(f.ph) * 34 * dt;
          f.cool -= dt;
          if (f.cool <= 0) {
            f.cool = E.rng.float(2.5, 6);
            const near = colonos.filter((c) => Math.abs(c.x - f.x) < 120 && !c.held);
            if (near.length) { f.grab = near[0]; near[0].held = f; }
          }
        }
        if (ship.iT <= 0 && Math.abs(f.x - ship.x) < 24 && Math.abs(f.y - ship.y) < 20) hurt();
      });

      /* rescate: toca a un colono cautivo y llévalo al suelo */
      colonos.forEach((c2) => {
        if (c2.held && Math.abs(c2.x - ship.x) < 28 && Math.abs(c2.y - ship.y) < 26) {
          c2.held.grab = null; c2.held = null;
          score += 250;
          E.floaters.add(ship.x - camX, ship.y - 24, '+250', { col: P.c, size: 22 });
          E.sfx('power'); hud();
        }
        if (!c2.held) {
          const gy = ground(c2.x) - 12;
          if (c2.y < gy) c2.y = Math.min(gy, c2.y + 210 * dt);
        }
      });

      if (!foes.length) { wave++; spawnWave(); E.sfx('levelup'); hud(); }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      for (let i = 0; i < 60; i++) {
        const x = ((i * 173.3 - camX * 0.3) % W + W) % W;
        g.circle(x, (i * 91.7) % (GY - 40), 1 + (i % 3) * 0.4, alpha('#ffffff', 0.14));
      }

      c.beginPath(); c.moveTo(-10, H);
      for (let x = 0; x <= W + 40; x += 20) c.lineTo(x, ground(x + camX));
      c.lineTo(W + 10, H); c.closePath();
      c.fillStyle = mix(P.d, P.deep, 0.45); c.fill();
      c.strokeStyle = alpha(P.a, 0.7); c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x <= W + 40; x += 20) x ? c.lineTo(x, ground(x + camX)) : c.moveTo(x, ground(x + camX));
      c.stroke();

      colonos.forEach((c2) => {
        const x = c2.x - camX;
        if (x < -40 || x > W + 40) return;
        G.Sprites.bot(g, x, c2.y, 9, c2.held ? '#ff6b8a' : P.c, P.ink, c2.ph + E.t);
      });

      foes.forEach((f) => {
        const x = f.x - camX;
        if (x < -50 || x > W + 50) return;
        c.save(); c.translate(x, f.y);
        c.fillStyle = mix(P.b, P.deep, 0.1);
        c.beginPath(); c.ellipse(0, 0, 20, 9, 0, 0, M.TAU); c.fill();
        c.fillStyle = alpha(P.a, 0.8);
        c.beginPath(); c.ellipse(0, -7, 10, 7, 0, Math.PI, 0); c.fill();
        c.restore();
        if (f.grab) g.line(x, f.y + 8, x, f.y + 24, alpha(P.c, 0.6), 2);
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => g.capsule(s.x - camX, s.y, s.x - camX - Math.sign(s.vx) * 26, s.y, 2.5, P.c));
      c.restore();

      if (ship.iT <= 0 || Math.floor(E.t * 14) % 2) {
        const x = ship.x - camX;
        g.push(x, ship.y, 0, ship.dir, 1);
        g.poly([26, 0, -12, -11, -20, 0, -12, 11], P.ink);
        g.poly([8, 0, -12, -6, -12, 6], P.a);
        g.pop();
      }

      /* minimapa */
      const mw = W - 120, mh = 22, mx = 60, my = 10;
      g.rrect(mx, my, mw, mh, 6, alpha(P.deep, 0.6));
      colonos.forEach((c2) => g.circle(mx + c2.x / WORLD * mw, my + mh / 2, 2, P.c));
      foes.forEach((f) => g.circle(mx + f.x / WORLD * mw, my + mh / 2, 2, '#ff6b8a'));
      g.rect(mx + ship.x / WORLD * mw - 1.5, my + 4, 3, mh - 8, P.ink);

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('WASD volar · Espacio disparar · toca a los colonos cautivos para liberarlos', { bottom: 12 });
    },
  };
});
