/* Atrapa Estrellas — recoge lo bueno, esquiva lo malo y encadena capturas limpias. */
NX.game('atrapa-estrellas', {
  w: 880, h: 600, pal: 'candy',
  controls: { dpad: 'lr' },
  music: { root: 48, scale: 'major', bpm: 112, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const BY = H - 62;

  let basket, items, score, lives, combo, mult, t, alive, spawnT, magnetT;

  function reset() {
    basket = { x: W / 2, w: 96 };
    items = []; score = 0; lives = 3; combo = 0; mult = 1; t = 0; alive = true; spawnT = 0.5; magnetT = 0;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Combo: '×' + mult }); }

  const KINDS = [
    { id: 'star', col: P.c, pts: 50, r: 15 },
    { id: 'gem', col: P.b, pts: 120, r: 14 },
    { id: 'bomb', col: '#ff4d6d', pts: 0, r: 16 },
    { id: 'heart', col: '#4ade80', pts: 0, r: 15 },
    { id: 'magnet', col: P.d, pts: 0, r: 15 },
  ];

  function spawn() {
    const k = E.rng.weighted([[0, 12], [1, 4], [2, 5 + t / 12], [3, 1], [4, 1]]);
    items.push({
      x: E.rng.float(40, W - 40), y: -30, kind: k, ph: E.rng.float(0, 6),
      vy: E.rng.float(140, 220) + t * 2.6, vx: E.rng.float(-30, 30),
    });
  }

  function loseLife() {
    lives--; combo = 0; mult = 1;
    E.sfx('hurt'); E.camera.kick(13); E.camera.flash('#ff4d6d', 0.32);
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Sobreviviste ' + M.fmtTime(t), stats: { Tiempo: M.fmtTime(t) } }), 600);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      if (magnetT > 0) magnetT -= dt;

      const ax = E.input.axis().x;
      const p = E.input.pointer;
      if (p.inside || p.down) basket.x = M.damp(basket.x, p.x, 24, dt);
      basket.x = M.clamp(basket.x + ax * 560 * dt, basket.w / 2, W - basket.w / 2);

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.2, 0.72 - t * 0.007); spawn(); }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const K = KINDS[it.kind];
        it.ph += dt * 4;
        if (magnetT > 0 && it.kind !== 2) {
          const a = Math.atan2(BY - it.y, basket.x - it.x);
          it.x += Math.cos(a) * 220 * dt; it.y += Math.sin(a) * 90 * dt;
        }
        it.y += it.vy * dt; it.x += it.vx * dt;
        if (it.x < 20 || it.x > W - 20) it.vx *= -1;

        if (it.y > BY - 18 && it.y < BY + 24 && Math.abs(it.x - basket.x) < basket.w / 2 + K.r) {
          items.splice(i, 1);
          if (it.kind === 2) {
            E.particles.burst(it.x, it.y, 22, { col: ['#ff4d6d', P.c], speed1: 260, add: true });
            E.sfx('explode'); loseLife();
          } else if (it.kind === 3) {
            lives++; E.sfx('heal'); E.floaters.add(it.x, it.y, '+1 vida', { col: '#4ade80' }); hud();
          } else if (it.kind === 4) {
            magnetT = 7; E.sfx('power'); E.floaters.add(it.x, it.y, 'Imán', { col: P.d });
          } else {
            combo++;
            mult = 1 + Math.floor(combo / 5);
            const pts = K.pts * mult;
            score += pts;
            E.sfx(it.kind === 1 ? 'gem' : 'coin');
            E.floaters.add(it.x, it.y, '+' + pts, { col: K.col, size: 16 + mult * 2 });
            E.particles.burst(it.x, it.y, 10, { col: [K.col, '#fff'], speed1: 170, add: true });
            hud();
          }
          continue;
        }
        if (it.y > H + 30) {
          items.splice(i, 1);
          if (it.kind === 0 || it.kind === 1) {
            combo = 0; mult = 1;
            E.sfx('error'); hud();
          }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgSpace(E.t, 13);
      for (let i = 0; i < 40; i++) {
        const x = (i * 167.3) % W, y = (i * 97.7 + E.t * 14) % H;
        g.circle(x, y, 1 + (i % 3) * 0.4, alpha('#ffffff', 0.1));
      }
      g.rect(0, BY + 26, W, H - BY - 26, mix(P.d, P.deep, 0.4));

      items.forEach((it) => {
        const K = KINDS[it.kind];
        g.bloom(it.x, it.y, K.r * 2, K.col, 0.4);
        if (it.kind === 0) g.star(it.x, it.y, K.r, K.r * 0.45, 5, it.ph * 0.5, K.col);
        else if (it.kind === 1) g.ngon(it.x, it.y, K.r, 6, it.ph * 0.4, K.col);
        else if (it.kind === 2) {
          g.circle(it.x, it.y, K.r, '#2a2f3d');
          g.circle(it.x - 4, it.y - 4, 4, alpha('#fff', 0.4));
          g.line(it.x + 6, it.y - 12, it.x + 12, it.y - 20, '#ff4d6d', 3);
          g.circle(it.x + 13, it.y - 22, 3 + Math.sin(it.ph * 3), P.c);
        } else if (it.kind === 3) G.Sprites.heart(g, it.x, it.y, 30, K.col);
        else { g.rrect(it.x - 12, it.y - 12, 24, 16, 4, K.col); g.rect(it.x - 12, it.y + 4, 8, 9, '#ff4d6d'); g.rect(it.x + 4, it.y + 4, 8, 9, '#dfe7f5'); }
      });

      const bx = basket.x;
      g.bloom(bx, BY + 6, 42, magnetT > 0 ? P.d : P.a, 0.3);
      g.poly([bx - basket.w / 2, BY - 6, bx + basket.w / 2, BY - 6,
              bx + basket.w / 2 - 12, BY + 26, bx - basket.w / 2 + 12, BY + 26], mix(P.a, P.deep, 0.05));
      g.rrect(bx - basket.w / 2 - 4, BY - 12, basket.w + 8, 12, 6, P.c);
      if (magnetT > 0) g.ring(bx, BY, 60, 2, alpha(P.d, M.clamp01(magnetT / 2) * 0.7));

      E.particles.draw(g);
      E.floaters.draw(g);
      if (combo >= 5) g.text('COMBO ×' + mult, W / 2, 46, { size: 24, align: 'center', weight: 900, color: P.c, shadow: P.c, shadowBlur: 14 });
      E.ui.hint('Mueve la cesta · esquiva las bombas', { bottom: 14 });
    },
  };
});
