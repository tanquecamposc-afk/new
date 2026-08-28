/* Tirachinas — lanza proyectiles contra estructuras con destrucción real. */
NX.game('tirachinas', {
  w: 900, h: 600, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 70, GRAV = 950;
  const SX = 130, SY = GY - 90;

  let blocks, pigs, ammo, shot, drag, level, score, alive, msg, msgT, settle;

  function build() {
    blocks = []; pigs = [];
    const bx = W * 0.6 + Math.min(120, level * 12);
    const cfg = [
      [[0, 0, 24, 90], [90, 0, 24, 90], [0, 90, 114, 24]],
      [[0, 0, 24, 90], [90, 0, 24, 90], [0, 90, 114, 24], [20, 114, 24, 70], [70, 114, 24, 70], [10, 184, 100, 22]],
      [[0, 0, 100, 22], [10, 22, 22, 80], [70, 22, 22, 80], [0, 102, 100, 22], [20, 124, 22, 70], [60, 124, 22, 70]],
    ][Math.min(2, Math.floor((level - 1) / 2))];
    cfg.forEach((b, i) => {
      blocks.push({
        x: bx + b[0], y: GY - b[3] - b[1], w: b[2], h: b[3],
        vx: 0, vy: 0, rot: 0, vr: 0, hp: i % 3 === 0 ? 3 : 2, stone: i % 3 === 0,
      });
    });
    const n = 1 + Math.min(3, Math.floor(level / 2));
    for (let i = 0; i < n; i++) {
      pigs.push({ x: bx + 20 + i * 46, y: GY - 18, r: 17, vx: 0, vy: 0, hit: false, ph: E.rng.float(0, 6) });
    }
  }

  function reset(l) {
    level = l == null ? (level || 1) : l;
    build();
    ammo = 3 + Math.floor(level / 3);
    shot = null; drag = null; alive = true; msg = ''; msgT = 0; settle = 0;
    if (score == null) score = 0;
    hud();
  }
  function hud() { E.api.hud({ Nivel: level, Proyectiles: ammo, Objetivos: pigs.filter((p) => !p.hit).length, Puntos: M.fmtScore(score) }); }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      const p = E.input.pointer;
      if (!shot && ammo > 0) {
        if (p.pressed && M.dist(p.x, p.y, SX, SY) < 90) drag = { x: p.x, y: p.y };
        if (drag && p.down) {
          const dx = p.x - SX, dy = p.y - SY;
          const d = Math.hypot(dx, dy);
          const md = Math.min(d, 100);
          drag = { x: SX + (dx / (d || 1)) * md, y: SY + (dy / (d || 1)) * md };
        }
        if (drag && p.released) {
          const dx = SX - drag.x, dy = SY - drag.y;
          if (Math.hypot(dx, dy) > 14) {
            shot = { x: SX, y: SY, vx: dx * 7.4, vy: dy * 7.4, r: 13, t: 0, rot: 0 };
            ammo--;
            E.sfx('shoot'); E.camera.kick(3);
            hud();
          }
          drag = null;
        }
      }

      const sub = 3;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        if (shot) {
          shot.vy += GRAV * h;
          shot.x += shot.vx * h; shot.y += shot.vy * h;
          shot.rot += shot.vx * h * 0.05;
          shot.t += h;
          if (Math.random() < 0.3) E.particles.trail(shot.x, shot.y, { col: alpha('#ffffff', 0.4), r: 2.4, life: 0.4 });
          if (shot.y > GY - shot.r) { shot.y = GY - shot.r; shot.vy *= -0.35; shot.vx *= 0.65; }
          blocks.forEach((b) => {
            if (shot.x + shot.r > b.x && shot.x - shot.r < b.x + b.w &&
                shot.y + shot.r > b.y && shot.y - shot.r < b.y + b.h) {
              const pw = Math.hypot(shot.vx, shot.vy);
              if (pw > 130) {
                b.hp -= b.stone ? 0.7 : 1.3;
                b.vx += shot.vx * 0.2; b.vy += shot.vy * 0.2 - 40;
                b.vr += E.rng.float(-5, 5);
                shot.vx *= -0.3; shot.vy *= -0.3;
                E.sfx('thud'); E.camera.kick(4);
                E.particles.burst(shot.x, shot.y, 8, { col: [b.stone ? '#9aa8c0' : '#b98a4a'], speed1: 190, grav: 420 });
              }
            }
          });
          pigs.forEach((pg) => {
            if (pg.hit) return;
            if (M.dist(shot.x, shot.y, pg.x, pg.y) < pg.r + shot.r && Math.hypot(shot.vx, shot.vy) > 90) hitPig(pg);
          });
          if (Math.hypot(shot.vx, shot.vy) < 40 && shot.y > GY - 30) { settle += h; if (settle > 1.2) { shot = null; settle = 0; } }
          if (shot && (shot.x > W + 80 || shot.x < -80 || shot.t > 9)) { shot = null; settle = 0; }
        }

        blocks.forEach((b) => {
          b.vy += GRAV * h;
          b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vr * h;
          b.vx *= Math.exp(-0.6 * h); b.vr *= Math.exp(-1.4 * h);
          if (b.y + b.h > GY) {
            if (Math.abs(b.vy) > 280) b.hp -= 1;
            b.y = GY - b.h; b.vy *= -0.15; b.vx *= 0.5; b.vr *= 0.3;
          }
          blocks.forEach((o) => {
            if (o === b) return;
            if (b.x + b.w > o.x && b.x < o.x + o.w && b.y + b.h > o.y && b.y < o.y + o.h) {
              const ov = (b.y + b.h) - o.y;
              if (ov > 0 && ov < 20 && b.vy > 0) { b.y = o.y - b.h; b.vy = 0; b.vx *= 0.6; }
            }
          });
        });

        pigs.forEach((pg) => {
          if (pg.hit) return;
          pg.vy += GRAV * h;
          const sup = blocks.find((b) => pg.x > b.x - 8 && pg.x < b.x + b.w + 8 &&
            Math.abs(pg.y + pg.r - b.y) < 16 && b.hp > 0);
          if (sup) { pg.vy = 0; pg.y = sup.y - pg.r; }
          else pg.y += pg.vy * h;
          if (pg.y > GY - pg.r) { pg.y = GY - pg.r; if (pg.vy > 320) hitPig(pg); pg.vy = 0; }
          blocks.forEach((b) => {
            if (b.hp <= 0) return;
            if (Math.abs(b.vy) > 240 && M.dist(pg.x, pg.y, b.x + b.w / 2, b.y + b.h / 2) < 34) hitPig(pg);
          });
        });
      }

      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].hp <= 0) {
          E.particles.burst(blocks[i].x + blocks[i].w / 2, blocks[i].y + blocks[i].h / 2, 12,
            { col: [blocks[i].stone ? '#9aa8c0' : '#b98a4a'], speed1: 230, grav: 500 });
          score += 60;
          blocks.splice(i, 1);
          hud();
        }
      }

      if (!pigs.some((pg) => !pg.hit)) {
        alive = false;
        E.sfx('win');
        setTimeout(() => {
          level++;
          score += 600 + ammo * 250;
          E.api.win({ score, title: '¡Estructura derribada!', msg: 'Nivel ' + (level - 1) + ' superado',
            stats: { Munición: ammo } });
        }, 900);
      } else if (ammo <= 0 && !shot) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'Te quedaste sin proyectiles', stats: { Nivel: level } }), 800);
      }

      function hitPig(pg) {
        pg.hit = true;
        score += 400;
        E.sfx('pop'); E.camera.kick(7);
        E.particles.burst(pg.x, pg.y, 18, { col: [P.b, P.c], speed1: 260, add: true });
        E.floaters.add(pg.x, pg.y - 24, '+400', { col: P.c, size: 20 });
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgSky(E.t, 0, '#5aa9e6', '#a8d8f0');
      for (let i = 0; i < 5; i++) {
        G.Sprites.cloud(g, ((i * 240 + E.t * 6) % (W + 300)) - 100, 70 + (i % 3) * 44, 46, alpha('#ffffff', 0.12));
      }
      g.rect(0, GY, W, H - GY, mix('#5b8f3f', P.deep, 0.3));
      g.rect(0, GY, W, 4, alpha('#3f6b3a', 0.7));
      for (let i = 0; i < 20; i++) G.Sprites.tree(g, 40 + i * 60, GY, 26, alpha('#3f8f4f', 0.25), alpha('#6b4b2a', 0.25));

      blocks.forEach((b) => {
        c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.rotate(b.rot);
        g.rrect(-b.w / 2, -b.h / 2, b.w, b.h, 4, b.stone ? mix('#8f9dbd', P.deep, 0.25) : mix('#b98a4a', P.deep, 0.15));
        g.rrect(-b.w / 2, -b.h / 2, b.w, Math.min(8, b.h * 0.3), 4, alpha('#ffffff', 0.18));
        c.strokeStyle = alpha('#000', 0.28); c.lineWidth = 1.5;
        c.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        c.restore();
      });

      pigs.forEach((pg) => {
        if (pg.hit) return;
        G.Sprites.blob(g, pg.x, pg.y, pg.r, '#4ade80', E.t + pg.ph);
      });

      /* tirachinas */
      g.rect(SX - 5, SY, 10, GY - SY, mix('#7a5a34', P.deep, 0.05));
      g.line(SX - 5, SY, SX - 24, SY - 42, mix('#7a5a34', P.deep, 0.05), 8);
      g.line(SX + 5, SY, SX + 24, SY - 42, mix('#7a5a34', P.deep, 0.05), 8);
      const bx = drag ? drag.x : SX, by = drag ? drag.y : SY - 16;
      g.line(SX - 24, SY - 42, bx, by, '#8b5a2b', 3.5);
      g.line(SX + 24, SY - 42, bx, by, '#8b5a2b', 3.5);
      if (!shot && ammo > 0) g.circle(bx, by, 13, P.b);

      if (drag) {
        c.save(); c.setLineDash([4, 8]); c.strokeStyle = alpha(P.c, 0.45); c.lineWidth = 2;
        c.beginPath();
        let px = SX, py = SY, vx = (SX - drag.x) * 7.4, vy = (SY - drag.y) * 7.4;
        c.moveTo(px, py);
        for (let i = 0; i < 70; i++) {
          vy += GRAV * 0.018; px += vx * 0.018; py += vy * 0.018;
          if (py > GY) break;
          c.lineTo(px, py);
        }
        c.stroke(); c.restore();
      }

      if (shot) {
        g.push(shot.x, shot.y, shot.rot);
        g.circle(0, 0, shot.r, P.b);
        g.circle(4, -4, 3.5, P.deep);
        g.poly([shot.r - 2, 0, shot.r + 8, -4, shot.r + 8, 4], P.c);
        g.pop();
      }

      for (let i = 0; i < ammo; i++) g.circle(30 + i * 26, 40, 10, P.b);
      g.text('MUNICIÓN', 30, 20, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.2 });

      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Arrastra hacia atrás desde el tirachinas y suelta', { bottom: 12 });
    },
  };
});
