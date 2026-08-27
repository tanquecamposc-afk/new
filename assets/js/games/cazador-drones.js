/* Cazador de Drones — puntería pura: acierta sin fallar y encadena multiplicadores. */
NX.game('cazador-drones', {
  w: 900, h: 600, pal: 'ice', cursor: 'crosshair',
  music: { root: 45, scale: 'penta', bpm: 120, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let drones, score, misses, combo, best, wave, spawnT, alive, time, shots;

  function reset() {
    drones = []; shots = [];
    score = 0; misses = 0; combo = 0; best = 0; wave = 1; spawnT = 0.4; alive = true; time = 60;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Combo: '×' + Math.max(1, combo), Fallos: misses + '/5', Tiempo: Math.ceil(time) });
  }

  function spawn() {
    const side = E.rng.int(2);
    const y = E.rng.float(70, H - 140);
    const kind = E.rng.weighted([[0, 10], [1, wave > 2 ? 4 : 0], [2, wave > 4 ? 2 : 0]]);
    drones.push({
      x: side ? -40 : W + 40, y,
      vx: (side ? 1 : -1) * (80 + wave * 12) * (kind === 1 ? 1.8 : 1),
      base: y, amp: E.rng.float(10, 60), ph: E.rng.float(0, 6),
      r: kind === 2 ? 30 : kind === 1 ? 15 : 21, kind, hp: kind === 2 ? 3 : 1,
    });
  }

  function endGame(reason) {
    alive = false;
    E.sfx('lose');
    setTimeout(() => E.api.over({
      score, msg: reason + ' · mejor racha ×' + best,
      stats: { 'Mejor racha': '×' + best, Oleada: wave },
    }), 500);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      time -= dt;
      if (Math.ceil(time) !== Math.ceil(time + dt)) hud();
      if (time <= 0) return endGame('Se acabó el tiempo');

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.28, 1.15 - wave * 0.07); spawn(); }
      if (score > wave * wave * 340) { wave++; E.sfx('levelup'); time += 4; }

      for (let i = drones.length - 1; i >= 0; i--) {
        const d = drones[i];
        d.ph += dt * 2.4;
        d.x += d.vx * dt;
        d.y = d.base + Math.sin(d.ph) * d.amp;
        if (d.x < -70 || d.x > W + 70) {
          drones.splice(i, 1);
          if (d.kind !== 2) { misses++; combo = 0; E.sfx('error'); hud(); if (misses >= 5) return endGame('Se escaparon demasiados'); }
        }
      }

      const p = E.input.pointer;
      if (p.pressed) {
        let hit = null, hi = -1;
        for (let i = drones.length - 1; i >= 0; i--) {
          if (M.dist(p.x, p.y, drones[i].x, drones[i].y) < drones[i].r + 6) { hit = drones[i]; hi = i; break; }
        }
        shots.push({ x: p.x, y: p.y, t: 0, hit: !!hit });
        if (hit) {
          hit.hp--;
          if (hit.hp > 0) { E.sfx('tap'); E.particles.burst(p.x, p.y, 5, { col: [P.c], speed1: 90 }); }
          else {
            combo++; best = Math.max(best, combo);
            const pts = (hit.kind === 2 ? 120 : hit.kind === 1 ? 60 : 30) * Math.min(10, combo);
            score += pts;
            E.floaters.add(hit.x, hit.y, '+' + pts, { col: combo > 4 ? P.c : P.ink, size: 15 + Math.min(14, combo) });
            E.particles.burst(hit.x, hit.y, 14, { col: [P.a, P.b, P.c], speed1: 240, add: true });
            E.sfx('hit'); E.camera.kick(3);
            drones.splice(hi, 1);
          }
          hud();
        } else {
          combo = 0; E.sfx('shoot'); E.camera.kick(1);
          hud();
        }
      }

      for (let i = shots.length - 1; i >= 0; i--) {
        shots[i].t += dt;
        if (shots[i].t > 0.4) shots.splice(i, 1);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      for (let i = 0; i < 30; i++) {
        const x = (i * 211.7 - E.t * 12) % (W + 100) - 50;
        G.Sprites.cloud(g, x, 60 + (i % 4) * 90, 40 + (i % 3) * 14, alpha(P.ink, 0.045));
      }
      g.rect(0, H - 60, W, 60, mix(P.d, P.deep, 0.45));

      drones.forEach((d) => {
        const dir = Math.sign(d.vx);
        g.push(d.x, d.y, 0, dir, 1);
        const col = d.kind === 2 ? P.b : d.kind === 1 ? P.c : P.a;
        g.rrect(-d.r * 0.8, -d.r * 0.3, d.r * 1.6, d.r * 0.6, d.r * 0.25, mix(col, P.deep, 0.1));
        c.save(); c.globalAlpha = 0.45;
        g.ring(-d.r * 0.9, -d.r * 0.6, d.r * 0.5, 2.2, col);
        g.ring(d.r * 0.9, -d.r * 0.6, d.r * 0.5, 2.2, col);
        c.restore();
        g.circle(0, 0, d.r * 0.22, P.c);
        if (d.kind === 2) {
          g.rrect(-d.r * 0.8, -d.r * 0.62, d.r * 1.6, 4, 2, 'rgba(255,255,255,.2)');
          g.rrect(-d.r * 0.8, -d.r * 0.62, d.r * 1.6 * (d.hp / 3), 4, 2, '#ff4d6d');
        }
        g.pop();
      });

      shots.forEach((s) => {
        const k = 1 - s.t / 0.4;
        c.save(); c.globalAlpha = k;
        g.ring(s.x, s.y, (1 - k) * 30 + 6, 2, s.hit ? P.c : alpha(P.dim, 0.8));
        c.restore();
      });

      const p = E.input.pointer;
      if (p.inside) {
        g.ring(p.x, p.y, 18, 2, alpha(P.c, 0.85));
        g.line(p.x - 28, p.y, p.x - 8, p.y, P.c, 2);
        g.line(p.x + 8, p.y, p.x + 28, p.y, P.c, 2);
        g.line(p.x, p.y - 28, p.x, p.y - 8, P.c, 2);
        g.line(p.x, p.y + 8, p.x, p.y + 28, P.c, 2);
        g.circle(p.x, p.y, 2, P.c);
      }

      E.particles.draw(g);
      E.floaters.draw(g);
      g.rrect(W / 2 - 110, 16, 220, 8, 4, 'rgba(255,255,255,.12)');
      g.rrect(W / 2 - 110, 16, 220 * M.clamp01(time / 60), 8, 4, time > 15 ? P.a : '#ff4d6d');
      E.ui.hint('Clic para disparar · no dejes escapar más de 5', { bottom: 14 });
    },
  };
});
