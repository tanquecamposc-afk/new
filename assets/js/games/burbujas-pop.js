/* Burbujas Pop — toca una burbuja y provoca una reacción en cadena. */
NX.game('burbujas-pop', {
  w: 860, h: 640, pal: 'ocean',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const COLS = ['#7dd3fc', '#a78bfa', '#5eead4', '#fca5a5', '#fde68a'];

  let bubbles, chain, level, target, popped, score, alive, shots, msg, msgT;

  function reset(l) {
    level = l == null ? (level || 1) : l;
    bubbles = [];
    const n = 34 + level * 4;
    for (let i = 0; i < n; i++) {
      bubbles.push({
        x: E.rng.float(50, W - 50), y: E.rng.float(110, H - 60),
        vx: E.rng.float(-40, 40), vy: E.rng.float(-40, 40),
        r: E.rng.float(16, 30), col: E.rng.pick(COLS), popped: false, t: 0, ph: E.rng.float(0, 6),
      });
    }
    target = Math.round(n * 0.42);
    /* Tres toques por nivel: con uno solo, un clic flojo te dejaba fuera
       antes de entender de qué iba el juego. */
    chain = []; popped = 0; alive = true; shots = 3; msg = ''; msgT = 0;
    if (score == null) score = 0;
    hud();
  }
  function hud() { E.api.hud({ Nivel: level, Reventadas: popped + '/' + target, Toques: shots, Puntos: M.fmtScore(score) }); }

  function popAt(x, y, r, depth) {
    bubbles.forEach((b) => {
      if (b.popped) return;
      if (M.dist(b.x, b.y, x, y) < r + b.r) {
        b.popped = true; b.t = 0;
        popped++;
        const pts = 40 * (1 + depth);
        score += pts;
        E.sfx('pop');
        E.particles.burst(b.x, b.y, 8, { col: [b.col, '#fff'], speed1: 180, life1: 0.5, add: true });
        chain.push({ x: b.x, y: b.y, r: b.r * 2.6, t: 0, depth: depth + 1 });
      }
    });
    hud();
  }

  reset(1);

  return {
    update(dt) {
      bubbles.forEach((b) => {
        if (b.popped) { b.t += dt; return; }
        b.ph += dt * 2;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r + 20 || b.x > W - b.r - 20) b.vx *= -1;
        if (b.y < b.r + 100 || b.y > H - b.r - 40) b.vy *= -1;
      });

      for (let i = chain.length - 1; i >= 0; i--) {
        const c2 = chain[i];
        c2.t += dt;
        if (c2.t > 0.16) {
          popAt(c2.x, c2.y, c2.r, c2.depth);
          chain.splice(i, 1);
        }
      }

      if (!alive) return;
      if (!chain.length && popped >= target) {
        alive = false;
        E.sfx('win');
        setTimeout(() => {
          level++;
          score += 300 + shots * 100;
          const usados = 3 - shots;
          E.api.win({ score, title: '¡Nivel superado!',
            msg: popped + ' burbujas en ' + usados + (usados === 1 ? ' toque' : ' toques'),
            stats: { Reventadas: popped, Toques: usados } });
        }, 800);
        return;
      }
      if (!chain.length && shots <= 0 && popped < target) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'Faltaron ' + (target - popped) + ' burbujas', stats: { Nivel: level } }), 700);
        return;
      }

      const p = E.input.pointer;
      if (p.pressed && shots > 0 && !chain.length) {
        shots--;
        E.camera.kick(3);
        popAt(p.x, p.y, 26, 0);
        if (!chain.length) { E.sfx('error'); msg = 'Ese toque no pilló nada'; msgT = 1.4; }
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      c.fillStyle = g.linGrad(0, 0, 0, H, [[0, mix('#1c6ea4', P.deep, 0.4)], [1, mix('#082744', P.deep, 0.25)]]);
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        const x = (i * 137) % W;
        const y = (H - (E.t * (12 + i % 5 * 6) + i * 51) % (H + 60));
        g.circle(x, y, 3 + (i % 3), alpha('#ffffff', 0.06));
      }

      bubbles.forEach((b) => {
        if (b.popped) {
          if (b.t > 0.4) return;
          const k = b.t / 0.4;
          c.save(); c.globalAlpha = 1 - k;
          g.ring(b.x, b.y, b.r * (1 + k * 1.6), 2.5, b.col);
          c.restore();
          return;
        }
        const r = b.r + Math.sin(b.ph) * 1.5;
        c.fillStyle = g.radGrad(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, r,
          [[0, alpha('#ffffff', 0.7)], [0.4, alpha(b.col, 0.55)], [1, alpha(b.col, 0.14)]]);
        c.beginPath(); c.arc(b.x, b.y, r, 0, M.TAU); c.fill();
        c.strokeStyle = alpha('#ffffff', 0.35); c.lineWidth = 1.4; c.stroke();
        g.circle(b.x - r * 0.32, b.y - r * 0.34, r * 0.16, alpha('#ffffff', 0.7));
      });

      chain.forEach((c2) => {
        c.save(); c.globalAlpha = 0.5;
        g.ring(c2.x, c2.y, c2.r * (c2.t / 0.16), 3, P.c);
        c.restore();
      });

      g.rrect(W / 2 - 150, 34, 300, 12, 6, 'rgba(255,255,255,.14)');
      g.rrect(W / 2 - 150, 34, 300 * M.clamp01(popped / target), 12, 6, P.c);
      g.text(popped + ' / ' + target, W / 2, 26, { size: 14, align: 'center', color: P.ink, weight: 800 });

      /* Toques que te quedan, bien visibles: es el recurso del nivel. */
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 30 + i * 30;
        g.circle(x, 66, 9, i < shots ? P.c : alpha('#ffffff', 0.14));
        if (i < shots) g.ring(x, 66, 12, 1.5, alpha(P.c, 0.5));
      }
      if (msgT > 0) {
        msgT -= 1 / 60;
        g.text(msg, W / 2, 96, { size: 15, align: 'center', weight: 800, color: alpha(P.b, M.clamp01(msgT)) });
      }

      E.particles.draw(g);
      E.ui.hint(shots > 0
        ? 'Toca una burbuja para iniciar la reacción · te quedan ' + shots
        : 'Reacción en marcha…', { bottom: 14 });
    },
  };
});
