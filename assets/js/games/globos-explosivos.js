/* Globos Explosivos — explota globos antes de que se escapen. */
NX.game('globos-explosivos', {
  w: 820, h: 640, pal: 'candy',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = ['#ff7ab6', '#7dd3fc', '#fde68a', '#c084fc', '#4ade80', '#ff8a3d'];

  let balloons, score, lives, t, alive, spawnT, combo, best;

  function reset() {
    balloons = []; score = 0; lives = 5; t = 0; alive = true; spawnT = 0.4; combo = 0; best = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Combo: '×' + Math.max(1, combo) }); }

  function spawn() {
    const kind = E.rng.weighted([[0, 10], [1, 2], [2, t > 8 ? 3 : 0]]);
    balloons.push({
      x: E.rng.float(50, W - 50), y: H + 40,
      vy: -(46 + t * 1.6) * E.rng.float(0.8, 1.3),
      r: kind === 1 ? 22 : E.rng.float(22, 34),
      col: kind === 1 ? '#ffd45e' : kind === 2 ? '#1b2029' : E.rng.pick(COLS),
      kind, ph: E.rng.float(0, 6), pop: 0,
    });
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.16, 0.7 - t * 0.008); spawn(); }

      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.ph += dt * 2;
        b.y += b.vy * dt;
        b.x += Math.sin(b.ph) * 24 * dt;
        if (b.pop > 0) { b.pop -= dt * 4; if (b.pop <= 0) balloons.splice(i, 1); continue; }
        if (b.y < -50) {
          balloons.splice(i, 1);
          if (b.kind !== 2) {
            lives--; combo = 0;
            E.sfx('error');
            hud();
            if (lives <= 0) {
              alive = false;
              E.sfx('lose');
              setTimeout(() => E.api.over({
                score, msg: 'Mejor racha ×' + best, stats: { 'Mejor racha': best, Tiempo: M.fmtTime(t) },
              }), 500);
              return;
            }
          }
        }
      }

      const p = E.input.pointer;
      if (p.pressed) {
        const b = balloons.find((q) => q.pop <= 0 && M.dist(p.x, p.y, q.x, q.y) < q.r + 6);
        if (b) {
          b.pop = 1;
          E.camera.kick(2);
          if (b.kind === 2) {
            lives--; combo = 0;
            E.sfx('hurt'); E.camera.flash('#ff4d6d', 0.25);
            E.floaters.add(b.x, b.y, '−1 vida', { col: '#ff4d6d', size: 18 });
            if (lives <= 0) {
              alive = false;
              setTimeout(() => E.api.over({ score, msg: 'Explotaste un globo negro' }), 500);
            }
          } else {
            combo++; best = Math.max(best, combo);
            const pts = (b.kind === 1 ? 300 : 60) * Math.min(8, combo);
            score += pts;
            E.sfx('pop');
            E.floaters.add(b.x, b.y, '+' + pts, { col: b.col, size: 15 + Math.min(14, combo) });
            E.particles.burst(b.x, b.y, 14, { col: [b.col, '#fff'], speed1: 230, life1: 0.6, add: true });
          }
          hud();
        } else { combo = 0; hud(); }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgSky(E.t, 0, mix('#7cc7f5', P.deep, 0.45), mix(P.bg, P.d, 0.3));
      for (let i = 0; i < 6; i++) {
        G.Sprites.cloud(g, ((i * 210 + E.t * 8) % (W + 300)) - 100, 70 + (i % 3) * 60, 50, alpha('#ffffff', 0.1));
      }

      balloons.forEach((b) => {
        if (b.pop > 0) {
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * M.TAU;
            const d = (1 - b.pop) * 60;
            g.circle(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 5 * b.pop, b.col);
          }
          return;
        }
        c.strokeStyle = alpha('#ffffff', 0.4); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(b.x, b.y + b.r + 8);
        c.quadraticCurveTo(b.x + Math.sin(b.ph) * 12, b.y + b.r + 34, b.x, b.y + b.r + 56);
        c.stroke();
        c.save();
        c.fillStyle = b.col;
        c.beginPath(); c.ellipse(b.x, b.y, b.r * 0.86, b.r, 0, 0, M.TAU); c.fill();
        c.restore();
        g.poly([b.x - 5, b.y + b.r - 2, b.x + 5, b.y + b.r - 2, b.x, b.y + b.r + 9], b.col);
        g.circle(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.24, alpha('#ffffff', 0.45));
        if (b.kind === 1) g.star(b.x, b.y, b.r * 0.4, b.r * 0.18, 5, E.t * 2, '#fff');
        if (b.kind === 2) {
          g.line(b.x - 8, b.y - 4, b.x - 2, b.y + 2, '#ff4d6d', 3);
          g.line(b.x + 8, b.y - 4, b.x + 2, b.y + 2, '#ff4d6d', 3);
        }
      });

      for (let i = 0; i < lives; i++) G.Sprites.heart(g, 32 + i * 30, 40, 26, '#ff4d6d');

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Toca los globos · los dorados valen más · evita los negros', { bottom: 14 });
    },
  };
});
