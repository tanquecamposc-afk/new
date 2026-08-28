/* Puntería Diana — entrenador de puntería con dianas que se mueven y se encogen. */
NX.game('punteria-diana', {
  w: 880, h: 600, pal: 'ember', cursor: 'none',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const MODES = [['Estáticas', 0], ['Móviles', 1], ['Que huyen', 2]];

  let targets, score, hits, shots, timeLeft, alive, mode, spawnT, streak, best, ripples;

  function reset(m) {
    mode = m == null ? (mode == null ? 0 : mode) : m;
    targets = []; ripples = [];
    score = 0; hits = 0; shots = 0; timeLeft = 45; alive = true; spawnT = 0; streak = 0; best = 0;
    for (let i = 0; i < 4; i++) spawn();
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Precisión: shots ? Math.round(hits * 100 / shots) + '%' : '—',
      Racha: streak, Tiempo: Math.ceil(timeLeft) });
  }

  function spawn() {
    const r = E.rng.float(22, 44);
    targets.push({
      x: E.rng.float(r + 30, W - r - 30), y: E.rng.float(r + 90, H - r - 60),
      r, life: 0, max: E.rng.float(2.4, 4),
      vx: mode ? E.rng.float(-120, 120) : 0, vy: mode ? E.rng.float(-90, 90) : 0,
      ph: E.rng.float(0, 6),
    });
  }

  reset(0);

  return {
    update(dt) {
      ripples.forEach((r) => { r.t += dt; });
      for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].t > 0.4) ripples.splice(i, 1);
      if (!alive) return;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score, msg: hits + ' aciertos de ' + shots + ' disparos',
          stats: { Precisión: shots ? Math.round(hits * 100 / shots) + '%' : '0%', 'Mejor racha': best },
        }), 500);
        return;
      }

      const p = E.input.pointer;
      for (let i = targets.length - 1; i >= 0; i--) {
        const t2 = targets[i];
        t2.life += dt;
        t2.ph += dt * 3;
        if (mode === 2) {
          const d = M.dist(p.x, p.y, t2.x, t2.y);
          if (d < 170) {
            const a = Math.atan2(t2.y - p.y, t2.x - p.x);
            t2.vx += Math.cos(a) * 400 * dt;
            t2.vy += Math.sin(a) * 400 * dt;
          }
          t2.vx *= Math.exp(-1.4 * dt); t2.vy *= Math.exp(-1.4 * dt);
        }
        t2.x += t2.vx * dt; t2.y += t2.vy * dt;
        if (t2.x < t2.r + 20 || t2.x > W - t2.r - 20) t2.vx *= -1;
        if (t2.y < t2.r + 80 || t2.y > H - t2.r - 50) t2.vy *= -1;
        t2.x = M.clamp(t2.x, t2.r + 20, W - t2.r - 20);
        t2.y = M.clamp(t2.y, t2.r + 80, H - t2.r - 50);
        if (t2.life > t2.max) { targets.splice(i, 1); streak = 0; spawn(); hud(); }
      }

      if (p.pressed) {
        if (p.y < 74) {
          for (let i = 0; i < MODES.length; i++) {
            const x = W / 2 - 230 + i * 156;
            if (p.x > x && p.x < x + 148) { reset(i); E.sfx('select'); return; }
          }
        }
        shots++;
        ripples.push({ x: p.x, y: p.y, t: 0, hit: false });
        const i = targets.findIndex((t2) => M.dist(p.x, p.y, t2.x, t2.y) < t2.r);
        if (i >= 0) {
          const t2 = targets[i];
          hits++; streak++; best = Math.max(best, streak);
          const acc = 1 - M.dist(p.x, p.y, t2.x, t2.y) / t2.r;
          const pts = Math.round((60 + acc * 140) * (1 + streak * 0.1) * (mode + 1));
          score += pts;
          ripples[ripples.length - 1].hit = true;
          E.sfx(acc > 0.7 ? 'chime' : 'hit');
          E.camera.kick(2);
          E.floaters.add(t2.x, t2.y - 20, '+' + pts, { col: acc > 0.7 ? P.c : P.ink, size: 16 });
          E.particles.burst(t2.x, t2.y, 12, { col: [P.c, P.b], speed1: 220, add: true });
          targets.splice(i, 1);
          spawn();
        } else { streak = 0; E.sfx('shoot'); }
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 9);
      g.bgGrid(44, alpha(P.a, 0.05), 1, 0, 0);
      MODES.forEach((m, i) => {
        const x = W / 2 - 230 + i * 156;
        const on = i === mode;
        g.rrect(x, 20, 148, 34, 10, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(m[0], x + 74, 42, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      targets.forEach((t2) => {
        const k = 1 - t2.life / t2.max;
        const r = t2.r * (0.5 + k * 0.5);
        g.bloom(t2.x, t2.y, r * 2, P.b, 0.3);
        [[1, '#f8fafc'], [0.72, '#e8384f'], [0.44, '#f8fafc'], [0.2, '#e8384f']].forEach((ring) => {
          g.circle(t2.x, t2.y, r * ring[0], ring[1]);
        });
        g.ring(t2.x, t2.y, r + 6, 2, alpha(P.c, k));
      });

      ripples.forEach((r) => {
        const k = r.t / 0.4;
        c.save(); c.globalAlpha = 1 - k;
        g.ring(r.x, r.y, 8 + k * 34, 2.5, r.hit ? P.c : alpha(P.dim, 0.8));
        c.restore();
      });

      const p = E.input.pointer;
      g.ring(p.x, p.y, 17, 2, P.c);
      g.line(p.x - 28, p.y, p.x - 8, p.y, P.c, 2);
      g.line(p.x + 8, p.y, p.x + 28, p.y, P.c, 2);
      g.line(p.x, p.y - 28, p.x, p.y - 8, P.c, 2);
      g.line(p.x, p.y + 8, p.x, p.y + 28, P.c, 2);
      g.circle(p.x, p.y, 2, P.c);

      g.rrect(W / 2 - 120, 62, 240, 8, 4, 'rgba(255,255,255,.14)');
      g.rrect(W / 2 - 120, 62, 240 * M.clamp01(timeLeft / 45), 8, 4, timeLeft > 10 ? P.a : '#ff4d6d');

      E.particles.draw(g);
      E.floaters.draw(g);
    },
  };
});
