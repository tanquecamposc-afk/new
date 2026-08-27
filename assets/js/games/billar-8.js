/* Billar 8 — física de bolas con efecto y rebotes reales. */
NX.game('billar-8', {
  w: 880, h: 520, pal: 'ocean',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CUSH = 30, R = 13;
  const COLS = ['#f2c14e', '#3b82f6', '#e8384f', '#8b5cf6', '#f97316', '#16a34a', '#7c2d12',
                '#111827', '#f2c14e', '#3b82f6', '#e8384f', '#8b5cf6', '#f97316', '#16a34a', '#7c2d12'];

  let balls, cue, aim, power, shooting, potted, turn, msg, msgT, alive, foul, shots;
  const POCKETS = [[CUSH, CUSH], [W / 2, CUSH - 4], [W - CUSH, CUSH],
                   [CUSH, H - CUSH], [W / 2, H - CUSH + 4], [W - CUSH, H - CUSH]];

  function reset() {
    balls = [];
    cue = { x: W * 0.25, y: H / 2, vx: 0, vy: 0, r: R, id: -1, in: false };
    balls.push(cue);
    const ox = W * 0.66, oy = H / 2;
    let n = 0;
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i <= row; i++) {
        const id = n === 4 ? 8 : (n < 4 ? n + 1 : n);
        balls.push({
          x: ox + row * R * 1.78, y: oy + (i - row / 2) * R * 2.05,
          vx: 0, vy: 0, r: R, id: id > 15 ? 15 : id, in: false,
        });
        n++;
      }
    }
    aim = 0; power = 0; shooting = false; potted = 0; turn = 1; msg = ''; msgT = 0;
    alive = true; foul = false; shots = 0;
    hud();
  }
  function hud() { E.api.hud({ Bolas: potted + '/15', Tiros: shots, Turno: turn }); }

  function moving() { return balls.some((b) => !b.in && Math.hypot(b.vx, b.vy) > 4); }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      const p = E.input.pointer;
      if (!moving()) {
        if (cue.in) {
          cue.in = false; cue.x = W * 0.25; cue.y = H / 2; cue.vx = cue.vy = 0;
        }
        if (p.inside || p.down) aim = Math.atan2(p.y - cue.y, p.x - cue.x);
        if (E.input.down('left')) aim -= dt * 1.2;
        if (E.input.down('right')) aim += dt * 1.2;
        if (p.down || E.input.down('space')) power = Math.min(1, power + dt * 0.9);
        else if (power > 0.05) {
          cue.vx = Math.cos(aim) * power * 1500;
          cue.vy = Math.sin(aim) * power * 1500;
          power = 0; shots++; turn++;
          E.sfx('thud'); E.camera.kick(4);
          hud();
        }
      }

      const sub = 5;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        balls.forEach((b) => {
          if (b.in) return;
          b.x += b.vx * h; b.y += b.vy * h;
          const fr = Math.exp(-1.15 * h);
          b.vx *= fr; b.vy *= fr;
          if (Math.hypot(b.vx, b.vy) < 3) { b.vx = 0; b.vy = 0; }
          if (b.x < CUSH + b.r) { b.x = CUSH + b.r; b.vx = Math.abs(b.vx) * 0.9; E.sfx('pong'); }
          if (b.x > W - CUSH - b.r) { b.x = W - CUSH - b.r; b.vx = -Math.abs(b.vx) * 0.9; E.sfx('pong'); }
          if (b.y < CUSH + b.r) { b.y = CUSH + b.r; b.vy = Math.abs(b.vy) * 0.9; E.sfx('pong'); }
          if (b.y > H - CUSH - b.r) { b.y = H - CUSH - b.r; b.vy = -Math.abs(b.vy) * 0.9; E.sfx('pong'); }
        });
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          if (a.in) continue;
          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j];
            if (b.in) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d < a.r + b.r && d > 0) {
              const nx = dx / d, ny = dy / d;
              const overlap = a.r + b.r - d;
              a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
              b.x += nx * overlap / 2; b.y += ny * overlap / 2;
              const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
              const dot = rvx * nx + rvy * ny;
              if (dot < 0) {
                const imp = dot * 0.96;
                a.vx += imp * nx; a.vy += imp * ny;
                b.vx -= imp * nx; b.vy -= imp * ny;
                if (Math.abs(imp) > 60) E.sfx('tap');
              }
            }
          }
        }
        balls.forEach((b) => {
          if (b.in) return;
          POCKETS.forEach((q) => {
            if (M.dist(b.x, b.y, q[0], q[1]) < 22) {
              b.in = true; b.vx = b.vy = 0;
              if (b.id === -1) {
                foul = true; msg = 'Bola blanca dentro'; msgT = 1.6;
                E.sfx('error');
              } else {
                potted++;
                E.sfx('coin');
                E.particles.burst(q[0], q[1], 10, { col: [COLS[b.id - 1] || '#fff'], speed1: 140, add: true });
                if (b.id === 8 && potted < 15) { msg = '¡Has metido la 8 antes de tiempo!'; msgT = 2; }
                hud();
              }
            }
          });
        });
      }

      if (potted >= 15 && alive) {
        alive = false;
        E.sfx('win');
        setTimeout(() => E.api.win({
          score: Math.max(0, 12000 - shots * 250), label: 'Puntos',
          title: '¡Mesa despejada!',
          msg: shots + ' tiros',
          stats: { Tiros: shots },
        }), 600);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.rrect(6, 6, W - 12, H - 12, 22, mix('#6b4423', P.deep, 0.1));
      g.rrect(CUSH - 8, CUSH - 8, W - (CUSH - 8) * 2, H - (CUSH - 8) * 2, 8, mix('#12603c', P.deep, 0.12));
      POCKETS.forEach((q) => {
        g.circle(q[0], q[1], 21, '#0a0d12');
        g.ring(q[0], q[1], 21, 2, alpha('#000', 0.6));
      });

      /* línea de tiro */
      if (!moving()) {
        c.save(); c.setLineDash([6, 9]);
        g.line(cue.x, cue.y, cue.x + Math.cos(aim) * 260, cue.y + Math.sin(aim) * 260, alpha('#ffffff', 0.4), 2);
        c.restore();
        /* taco */
        const back = 30 + power * 60;
        g.line(cue.x - Math.cos(aim) * back, cue.y - Math.sin(aim) * back,
               cue.x - Math.cos(aim) * (back + 170), cue.y - Math.sin(aim) * (back + 170), '#c19a6b', 7);
        g.rrect(24, H - 22, 200, 10, 5, 'rgba(255,255,255,.14)');
        g.rrect(24, H - 22, 200 * power, 10, 5, power > 0.85 ? '#ff4d6d' : P.c);
      }

      balls.forEach((b) => {
        if (b.in) return;
        c.save(); c.globalAlpha = 0.3;
        g.circle(b.x + 3, b.y + 4, b.r, '#000');
        c.restore();
        if (b.id === -1) {
          g.circle(b.x, b.y, b.r, '#f8fafc');
          g.circle(b.x - 4, b.y - 5, 4, '#ffffff');
        } else {
          const col = COLS[b.id - 1] || '#888';
          if (b.id > 8) {
            g.circle(b.x, b.y, b.r, '#f8fafc');
            c.save();
            c.beginPath(); c.rect(b.x - b.r, b.y - b.r * 0.5, b.r * 2, b.r); c.clip();
            g.circle(b.x, b.y, b.r, col);
            c.restore();
          } else g.circle(b.x, b.y, b.r, col);
          g.circle(b.x, b.y, b.r * 0.5, '#f8fafc');
          g.text(String(b.id), b.x, b.y + 4, { size: 10, align: 'center', color: '#111827', weight: 900 });
          g.circle(b.x - 4, b.y - 5, 3.2, alpha('#ffffff', 0.4));
        }
      });

      if (msgT > 0) E.ui.title(msg, W / 2, 70, { size: 26 });
      E.particles.draw(g);
      E.ui.hint('Apunta con el ratón · mantén pulsado para dar fuerza', { bottom: 40 });
    },
  };
});
