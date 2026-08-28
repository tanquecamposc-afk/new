/* Rompe Bloques — 30 niveles, ladrillos blindados, mejoras y láser. */
NX.game('rompe-bloques', {
  w: 880, h: 640, pal: 'neon',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'LANZAR' }] },
  music: { root: 45, scale: 'major', bpm: 108, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = 11, BW = (W - 60) / COLS, BH = 24, TOP = 74;

  const PATTERNS = [
    (c, r) => r < 4,
    (c, r) => (c + r) % 2 === 0 && r < 6,
    (c, r) => r < 6 && (c >= r && c < COLS - r),
    (c, r) => r < 5 && (c % 3 !== 1),
    (c, r) => r < 7 && Math.abs(c - 5) + r < 7,
    (c, r) => r < 6 && (r % 2 === 0 || c % 2 === 0),
  ];

  let paddle, balls, bricks, drops, lasers, score, lives, level, alive, stuck, wide, laserT, msgT, msg;

  function buildLevel() {
    bricks = [];
    const pat = PATTERNS[(level - 1) % PATTERNS.length];
    const rows = Math.min(8, 4 + Math.floor(level / 3));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!pat(c, r)) continue;
        const armored = level > 2 && (r + c) % 7 === 0;
        bricks.push({
          x: 30 + c * BW, y: TOP + r * (BH + 6), w: BW - 5, h: BH,
          hp: armored ? 3 : 1, max: armored ? 3 : 1, hue: r % 5,
        });
      }
    }
  }

  function newBall(x, y) {
    return { x, y, vx: E.rng.float(-140, 140), vy: -400, r: 8, trail: [] };
  }

  function reset() {
    paddle = { x: W / 2, w: 116, y: H - 46 };
    score = 0; lives = 3; level = 1; alive = true; stuck = true; wide = 0; laserT = 0;
    drops = []; lasers = []; msgT = 0; msg = '';
    balls = [newBall(W / 2, H - 70)];
    buildLevel();
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Vidas: lives, Nivel: level, Bolas: balls.length }); }

  function nextLevel() {
    level++;
    E.sfx('win');
    msg = 'Nivel ' + level; msgT = 1.6;
    buildLevel();
    balls = [newBall(paddle.x, H - 70)];
    stuck = true; wide = 0; laserT = 0; drops = [];
    hud();
  }

  function loseBall() {
    lives--;
    E.sfx('hurt'); E.camera.kick(12); E.camera.flash('#ff4d6d', 0.3);
    hud();
    if (lives <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Llegaste al nivel ' + level, stats: { Nivel: level } }), 600);
    } else {
      balls = [newBall(paddle.x, H - 70)];
      stuck = true; wide = 0; laserT = 0;
    }
  }

  function hitBrick(b, i) {
    b.hp--;
    if (b.hp > 0) {
      E.sfx('tap');
      E.particles.burst(b.x + b.w / 2, b.y + b.h / 2, 4, { col: [P.dim], speed1: 90 });
      return;
    }
    bricks.splice(i, 1);
    const pts = 10 * level * b.max;
    score += pts;
    E.sfx('pong');
    E.particles.burst(b.x + b.w / 2, b.y + b.h / 2, 10, {
      col: [[P.a, P.b, P.c, P.d, mix(P.a, P.c, .5)][b.hue], '#fff'], speed1: 170, life1: 0.6, shape: 1, add: true,
    });
    if (E.rng.bool(0.14)) drops.push({ x: b.x + b.w / 2, y: b.y, kind: E.rng.int(4), ph: 0 });
    hud();
    if (!bricks.length) setTimeout(nextLevel, 400);
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (msgT > 0) msgT -= dt;
      if (wide > 0) { wide -= dt; if (wide <= 0) paddle.w = 116; }
      if (laserT > 0) {
        laserT -= dt;
        if (Math.floor(laserT * 5) !== Math.floor((laserT + dt) * 5)) {
          lasers.push({ x: paddle.x - 40, y: paddle.y }, { x: paddle.x + 40, y: paddle.y });
          E.sfx('laser');
        }
      }

      const ax = E.input.axis().x;
      const p = E.input.pointer;
      if (p.inside || p.down) paddle.x = M.damp(paddle.x, p.x, 26, dt);
      paddle.x = M.clamp(paddle.x + ax * 620 * dt, paddle.w / 2, W - paddle.w / 2);

      if (stuck) {
        balls[0].x = paddle.x; balls[0].y = paddle.y - 16;
        if (E.input.pressed('space') || E.input.pressed('up') || p.pressed) {
          stuck = false;
          balls[0].vy = -420; balls[0].vx = E.rng.float(-120, 120);
          E.sfx('hop');
        }
      }

      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const b = balls[bi];
        if (stuck && bi === 0) continue;
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); E.sfx('pong'); }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); E.sfx('pong'); }
          if (b.y < b.r + 20) { b.y = b.r + 20; b.vy = Math.abs(b.vy); E.sfx('pong'); }

          if (b.vy > 0 && b.y + b.r > paddle.y && b.y - b.r < paddle.y + 14 &&
              Math.abs(b.x - paddle.x) < paddle.w / 2 + b.r) {
            b.y = paddle.y - b.r;
            const off = (b.x - paddle.x) / (paddle.w / 2);
            const sp = Math.min(700, Math.hypot(b.vx, b.vy) * 1.02);
            const a = -Math.PI / 2 + off * 1.05;
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
            E.sfx('bounce'); E.camera.kick(2);
          }

          for (let i = bricks.length - 1; i >= 0; i--) {
            const br = bricks[i];
            if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
              const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
              const oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
              if (ox < oy) b.vx *= -1; else b.vy *= -1;
              hitBrick(br, i);
              break;
            }
          }
        }
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 9) b.trail.shift();
        if (b.y > H + 30) {
          balls.splice(bi, 1);
          if (!balls.length) loseBall();
          else hud();
        }
      }

      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.y -= 700 * dt;
        if (l.y < 0) { lasers.splice(i, 1); continue; }
        for (let k = bricks.length - 1; k >= 0; k--) {
          const br = bricks[k];
          if (l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) {
            hitBrick(br, k); lasers.splice(i, 1); break;
          }
        }
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += 165 * dt; d.ph += dt * 5;
        if (d.y > H + 20) { drops.splice(i, 1); continue; }
        if (Math.abs(d.x - paddle.x) < paddle.w / 2 + 14 && Math.abs(d.y - paddle.y) < 20) {
          drops.splice(i, 1);
          E.sfx('power');
          if (d.kind === 0) { paddle.w = 168; wide = 14; E.floaters.add(paddle.x, paddle.y - 26, 'Pala ancha', { col: P.a }); }
          else if (d.kind === 1) {
            const src = balls[0] || newBall(paddle.x, paddle.y - 30);
            for (let k = 0; k < 2; k++) {
              const nb = newBall(src.x, src.y);
              const a = Math.atan2(src.vy, src.vx) + (k ? 0.5 : -0.5);
              const sp = Math.hypot(src.vx, src.vy) || 420;
              nb.vx = Math.cos(a) * sp; nb.vy = Math.sin(a) * sp;
              balls.push(nb);
            }
            E.floaters.add(paddle.x, paddle.y - 26, 'Multibola', { col: P.b });
          } else if (d.kind === 2) { laserT = 8; E.floaters.add(paddle.x, paddle.y - 26, 'Láser', { col: P.c }); }
          else { lives++; E.floaters.add(paddle.x, paddle.y - 26, 'Vida extra', { col: '#4ade80' }); }
          hud();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 4);
      g.rect(0, 18, W, 2, alpha(P.a, 0.35));

      bricks.forEach((b) => {
        const col = [P.a, P.b, P.c, P.d, mix(P.a, P.c, .5)][b.hue];
        const dark = b.max > 1 ? mix(col, '#8f9dbd', 0.55) : col;
        g.rrect(b.x, b.y, b.w, b.h, 5, mix(dark, '#000', (b.max - b.hp) * 0.22));
        g.rrect(b.x, b.y, b.w, b.h * 0.4, 5, alpha('#ffffff', 0.2));
        if (b.max > 1) g.rrectStroke(b.x, b.y, b.w, b.h, 5, alpha('#ffffff', 0.35), 1.5);
      });

      drops.forEach((d) => {
        const col = [P.a, P.b, P.c, '#4ade80'][d.kind];
        g.bloom(d.x, d.y, 20, col, 0.5);
        g.rrect(d.x - 12, d.y - 9, 24, 18, 5, col);
        g.text(['W', 'M', 'L', '+'][d.kind], d.x, d.y + 6, { size: 13, align: 'center', color: '#0d1220', weight: 900 });
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      lasers.forEach((l) => g.capsule(l.x, l.y, l.x, l.y + 18, 2.6, P.c));
      balls.forEach((b) => {
        b.trail.forEach((t, i) => g.circle(t.x, t.y, b.r * (i / b.trail.length) * 0.8, alpha(P.c, 0.14)));
      });
      c.restore();

      balls.forEach((b) => {
        g.bloom(b.x, b.y, 26, P.c, 0.5);
        g.circle(b.x, b.y, b.r, '#ffffff');
      });

      g.rrect(paddle.x - paddle.w / 2, paddle.y, paddle.w, 14, 7, laserT > 0 ? P.c : P.a);
      g.rrect(paddle.x - paddle.w / 2, paddle.y, paddle.w, 5, 7, alpha('#ffffff', 0.35));
      if (laserT > 0) { g.rect(paddle.x - 42, paddle.y - 6, 5, 8, P.c); g.rect(paddle.x + 37, paddle.y - 6, 5, 8, P.c); }

      E.particles.draw(g);
      E.floaters.draw(g);
      if (msgT > 0) E.ui.title(msg, W / 2, H / 2, { size: 44 });
      if (stuck) E.ui.hint('Espacio o clic para lanzar la bola', { bottom: 90 });
      E.ui.hint('Mueve con el ratón o ← →', { bottom: 14 });
    },
  };
});
