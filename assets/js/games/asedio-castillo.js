/* Asedio al Castillo — calcula ángulo y fuerza; cada bloque cae con su propia física. */
NX.game('asedio-castillo', {
  w: 900, h: 600, pal: 'sunset',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 70, GRAV = 900;

  let blocks, ammo, shots, level, drag, alive, score, targets, msg, msgT, shotsUsed;

  function buildCastle() {
    blocks = []; targets = [];
    const bx = W * 0.62 + level * 8;
    const rows = 3 + Math.min(3, Math.floor(level / 2));
    for (let r = 0; r < rows; r++) {
      const n = Math.max(2, 4 - Math.floor(r / 2));
      for (let i = 0; i < n; i++) {
        blocks.push({
          x: bx + i * 42 + r * 6, y: GY - 40 - r * 40, w: 38, h: 38,
          vx: 0, vy: 0, rot: 0, vr: 0, hp: r === 0 ? 3 : 2, stone: r === 0,
        });
      }
    }
    const n = 1 + Math.min(3, Math.floor(level / 2));
    for (let i = 0; i < n; i++) {
      targets.push({ x: bx + 20 + i * 60, y: GY - 40 - rows * 40 - 14, r: 15, hit: false, vx: 0, vy: 0, ph: E.rng.float(0, 6) });
    }
  }

  function reset(l) {
    level = l == null ? (level || 1) : l;
    buildCastle();
    ammo = 3 + Math.floor(level / 2);
    shots = []; drag = null; alive = true; msg = ''; msgT = 0; shotsUsed = 0;
    if (score == null) score = 0;
    hud();
  }
  function hud() { E.api.hud({ Nivel: level, Munición: ammo, Objetivos: targets.filter((t) => !t.hit).length, Puntos: M.fmtScore(score) }); }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      const p = E.input.pointer;
      if (p.pressed && p.x < W * 0.35 && ammo > 0) drag = { x: p.x, y: p.y };
      if (drag && p.down) drag = { x: p.x, y: p.y };
      if (drag && p.released) {
        const ox = 110, oy = GY - 60;
        const dx = ox - drag.x, dy = oy - drag.y;
        const len = Math.hypot(dx, dy);
        if (len > 16) {
          shots.push({ x: ox, y: oy, vx: dx * 3.4, vy: dy * 3.4, r: 12, t: 0 });
          ammo--; shotsUsed++;
          E.sfx('shoot'); E.camera.kick(4);
          hud();
        }
        drag = null;
      }

      const sub = 3;
      for (let s = 0; s < sub; s++) {
        const h = dt / sub;
        shots.forEach((sh) => {
          sh.vy += GRAV * h;
          sh.x += sh.vx * h; sh.y += sh.vy * h;
          sh.t += h;
          if (sh.y > GY - sh.r) { sh.y = GY - sh.r; sh.vy *= -0.4; sh.vx *= 0.7; }
          blocks.forEach((b) => {
            if (sh.x + sh.r > b.x && sh.x - sh.r < b.x + b.w && sh.y + sh.r > b.y && sh.y - sh.r < b.y + b.h) {
              const power = Math.hypot(sh.vx, sh.vy);
              if (power > 120) {
                b.hp -= b.stone ? 0.6 : 1;
                b.vx += sh.vx * 0.24; b.vy += sh.vy * 0.24 - 60;
                b.vr += E.rng.float(-4, 4);
                sh.vx *= -0.28; sh.vy *= -0.28;
                E.sfx('thud'); E.camera.kick(4);
                E.particles.burst(sh.x, sh.y, 8, { col: [b.stone ? '#9aa8c0' : '#b98a4a'], speed1: 180, grav: 400 });
              }
            }
          });
          targets.forEach((t2) => {
            if (t2.hit) return;
            if (M.dist(sh.x, sh.y, t2.x, t2.y) < t2.r + sh.r && Math.hypot(sh.vx, sh.vy) > 80) hitTarget(t2);
          });
        });

        blocks.forEach((b) => {
          b.vy += GRAV * h;
          b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vr * h;
          b.vx *= Math.exp(-0.5 * h); b.vr *= Math.exp(-1.2 * h);
          if (b.y + b.h > GY) {
            if (Math.abs(b.vy) > 260) { b.hp -= 1; E.sfx('thud'); }
            b.y = GY - b.h; b.vy *= -0.2; b.vx *= 0.6; b.vr *= 0.4;
          }
          /* apoyo simple sobre otros bloques */
          blocks.forEach((o) => {
            if (o === b) return;
            if (b.x + b.w > o.x && b.x < o.x + o.w && b.y + b.h > o.y && b.y < o.y + o.h) {
              const ov = (b.y + b.h) - o.y;
              if (ov > 0 && ov < 22 && b.vy > 0) { b.y = o.y - b.h; b.vy = 0; b.vx *= 0.7; }
              else if (b.x + b.w / 2 < o.x + o.w / 2) b.x -= 1; else b.x += 1;
            }
          });
        });

        targets.forEach((t2) => {
          if (t2.hit) return;
          t2.vy += GRAV * h;
          const support = blocks.find((b) => t2.x > b.x - 6 && t2.x < b.x + b.w + 6 &&
            Math.abs(t2.y + t2.r - b.y) < 16 && b.hp > 0);
          if (support) { t2.vy = 0; t2.y = support.y - t2.r; }
          else t2.y += t2.vy * h;
          if (t2.y > GY - t2.r) { hitTarget(t2); }
        });
      }

      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].hp <= 0) {
          E.particles.burst(blocks[i].x + 19, blocks[i].y + 19, 12,
            { col: [blocks[i].stone ? '#9aa8c0' : '#b98a4a'], speed1: 220, grav: 500 });
          blocks.splice(i, 1);
          score += 40;
          hud();
        }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const sh = shots[i];
        if (sh.x > W + 60 || sh.x < -60 || sh.t > 8) shots.splice(i, 1);
      }

      if (!targets.some((t2) => !t2.hit)) {
        alive = false;
        E.sfx('win');
        setTimeout(() => {
          level++;
          score += 500 + ammo * 200;
          E.api.win({
            score, title: '¡Castillo derribado!',
            msg: 'Nivel ' + (level - 1) + ' con ' + shotsUsed + ' disparos',
            stats: { Disparos: shotsUsed, Munición: ammo },
          });
        }, 900);
      } else if (ammo <= 0 && !shots.some((s) => Math.hypot(s.vx, s.vy) > 40)) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({ score, msg: 'Te quedaste sin munición', stats: { Nivel: level } }), 800);
      }

      function hitTarget(t2) {
        t2.hit = true;
        score += 300;
        E.sfx('explode'); E.camera.kick(8);
        E.particles.burst(t2.x, t2.y, 20, { col: [P.c, P.b], speed1: 260, add: true });
        E.floaters.add(t2.x, t2.y - 20, '+300', { col: P.c, size: 22 });
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#3a2340', P.deep, 0.25), mix(P.bg, P.d, 0.3));
      g.circle(W * 0.78, 90, 42, alpha(P.c, 0.4));
      for (let i = 0; i < 5; i++) {
        G.Sprites.cloud(g, ((i * 250 + E.t * 5) % (W + 300)) - 100, 70 + (i % 3) * 42, 44, alpha(P.ink, 0.06));
      }
      g.rect(0, GY, W, H - GY, mix('#3f8f4f', P.deep, 0.4));
      g.rect(0, GY, W, 3, alpha(P.c, 0.5));

      /* catapulta */
      const ox = 110, oy = GY - 60;
      g.rect(ox - 30, GY - 34, 70, 22, mix('#7a5a34', P.deep, 0.1));
      g.circle(ox - 16, GY - 12, 13, '#4a3a2a');
      g.circle(ox + 24, GY - 12, 13, '#4a3a2a');
      const ang = drag ? Math.atan2(oy - drag.y, ox - drag.x) : -0.6;
      g.push(ox, GY - 34, ang - Math.PI);
      g.rect(0, -4, 62, 8, mix('#7a5a34', P.deep, 0.05));
      g.pop();
      g.circle(ox, oy, 12, ammo > 0 ? mix('#9aa8c0', P.deep, 0.1) : alpha(P.dim, 0.3));

      if (drag) {
        const dx = ox - drag.x, dy = oy - drag.y;
        c.save(); c.setLineDash([5, 8]); c.strokeStyle = alpha(P.c, 0.5); c.lineWidth = 2;
        c.beginPath();
        let px = ox, py = oy, vx = dx * 3.4, vy = dy * 3.4;
        c.moveTo(px, py);
        for (let i = 0; i < 60; i++) {
          vy += GRAV * 0.02; px += vx * 0.02; py += vy * 0.02;
          if (py > GY) break;
          c.lineTo(px, py);
        }
        c.stroke(); c.restore();
        g.line(ox, oy, drag.x, drag.y, alpha('#ffffff', 0.3), 2);
      }

      blocks.forEach((b) => {
        c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.rotate(b.rot);
        const col = b.stone ? mix('#8f9dbd', P.deep, 0.28) : mix('#b98a4a', P.deep, 0.2);
        g.rrect(-b.w / 2, -b.h / 2, b.w, b.h, 4, col);
        g.rrect(-b.w / 2, -b.h / 2, b.w, 7, 4, alpha('#ffffff', 0.16));
        c.strokeStyle = alpha('#000', 0.25); c.lineWidth = 1.5;
        c.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        c.restore();
      });

      targets.forEach((t2) => {
        if (t2.hit) return;
        G.Sprites.blob(g, t2.x, t2.y, t2.r, P.b, E.t + t2.ph);
      });

      shots.forEach((sh) => {
        g.circle(sh.x, sh.y, sh.r, mix('#9aa8c0', P.deep, 0.15));
        g.circle(sh.x - 3, sh.y - 4, 4, alpha('#ffffff', 0.35));
      });

      for (let i = 0; i < ammo; i++) g.circle(30 + i * 26, 40, 10, mix('#9aa8c0', P.deep, 0.1));
      g.text('MUNICIÓN', 30, 20, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.4 });

      E.particles.draw(g);
      E.floaters.draw(g);
      if (msgT > 0) E.ui.title(msg, W / 2, 100, { size: 26 });
      E.ui.hint('Arrastra desde la catapulta y suelta para disparar', { bottom: 12 });
    },
  };
});
