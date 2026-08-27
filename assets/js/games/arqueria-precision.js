/* Arquería — gravedad y viento cambiante; corrige la parábola tiro a tiro. */
NX.game('arqueria-precision', {
  w: 900, h: 560, pal: 'sunset',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 420;

  let bow, arrows, target, wind, score, shots, alive, pull, angle, msg, msgT, round, hits;

  function newTarget() {
    target = { x: E.rng.float(W * 0.6, W - 90), y: E.rng.float(120, H - 160), r: 54, vy: 0, move: 0 };
    if (round > 3) { target.move = E.rng.float(30, 70) * E.rng.sign(); }
    wind = E.rng.float(-70, 70);
  }

  function reset() {
    bow = { x: 110, y: H - 180 };
    arrows = []; score = 0; shots = 0; alive = true; pull = 0; angle = -0.35;
    msg = ''; msgT = 0; round = 1; hits = 0;
    newTarget();
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Flechas: (12 - shots) + '/12', Viento: (wind > 0 ? '→ ' : '← ') + Math.abs(Math.round(wind)) });
  }

  function shoot() {
    shots++;
    const sp = 260 + pull * 620;
    arrows.push({
      x: bow.x + Math.cos(angle) * 40, y: bow.y + Math.sin(angle) * 40,
      vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, a: angle, stuck: false, t: 0,
    });
    E.sfx('shoot');
    pull = 0;
    hud();
    if (shots >= 12) {
      setTimeout(() => {
        alive = false;
        E.api.over({ score, msg: hits + ' dianas de 12 flechas', stats: { Dianas: hits } });
      }, 2200);
    }
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (target.move) {
        target.y += target.move * dt;
        if (target.y < 110 || target.y > H - 150) target.move *= -1;
      }
      arrows.forEach((a) => {
        if (a.stuck) { a.t += dt; return; }
        a.vy += GRAV * dt;
        a.vx += wind * dt;
        a.x += a.vx * dt; a.y += a.vy * dt;
        a.a = Math.atan2(a.vy, a.vx);
        if (Math.random() < 0.3) E.particles.trail(a.x, a.y, { col: alpha(P.c, 0.5), r: 2, life: 0.2 });

        const d = M.dist(a.x, a.y, target.x, target.y);
        if (d < target.r) {
          a.stuck = true; a.t = 0;
          const ring = Math.floor(d / (target.r / 5));
          const pts = [100, 60, 40, 20, 10][ring] || 10;
          score += pts; hits++;
          E.sfx(ring === 0 ? 'chime' : 'hit');
          E.camera.kick(ring === 0 ? 6 : 3);
          E.floaters.add(a.x, a.y - 20, '+' + pts, { col: ring === 0 ? P.c : P.ink, size: 16 + (5 - ring) * 3 });
          msg = ring === 0 ? '¡DIANA!' : '+' + pts; msgT = 1.2;
          hud();
          round++;
          setTimeout(() => { if (alive) { newTarget(); hud(); } }, 700);
        }
        if (a.y > H - 40) {
          a.stuck = true; a.y = H - 40; a.t = 0;
          E.sfx('thud');
        }
        if (a.x > W + 40) a.stuck = true;
      });
      for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].stuck && arrows[i].t > 4) arrows.splice(i, 1);

      if (!alive || shots >= 12) return;
      const p = E.input.pointer;
      if (p.inside || p.down) angle = M.clamp(Math.atan2(p.y - bow.y, p.x - bow.x), -1.35, 0.6);
      if (E.input.down('up')) angle = Math.max(-1.35, angle - dt);
      if (E.input.down('down')) angle = Math.min(0.6, angle + dt);
      if (p.down || E.input.down('space')) pull = Math.min(1, pull + dt * 0.85);
      else if (pull > 0.05) shoot();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#3a2340', P.deep, 0.2), mix(P.bg, P.d, 0.3));
      g.circle(W * 0.78, 90, 44, alpha(P.c, 0.35));
      for (let i = 0; i < 5; i++) {
        G.Sprites.cloud(g, ((i * 260 + E.t * 6) % (W + 300)) - 100, 70 + (i % 3) * 40, 46, alpha(P.ink, 0.06));
      }
      /* colinas */
      c.fillStyle = mix('#3f6b3a', P.deep, 0.4);
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, H - 60 - Math.sin(x * 0.006) * 30);
      c.lineTo(W, H); c.closePath(); c.fill();
      g.rect(0, H - 40, W, 40, mix('#5b8f3f', P.deep, 0.35));

      /* viento */
      c.save(); c.globalAlpha = 0.25;
      for (let i = 0; i < 8; i++) {
        const y = 120 + i * 40;
        const x = ((E.t * wind * 2 + i * 130) % (W + 200)) - 100;
        g.line(x, y, x + Math.sign(wind) * 34, y, P.ink, 2);
      }
      c.restore();

      /* diana */
      const rings = [[54, '#f8fafc'], [43, '#111827'], [32, '#3b82f6'], [21, '#e8384f'], [10, '#facc15']];
      g.rect(target.x - 4, target.y + 40, 8, H - 40 - (target.y + 40), mix('#7a5a34', P.deep, 0.1));
      rings.forEach((r) => g.circle(target.x, target.y, r[0], r[1]));
      g.circle(target.x, target.y, 4, '#111827');

      arrows.forEach((a) => {
        g.push(a.x, a.y, a.a);
        g.line(-34, 0, 0, 0, '#c19a6b', 3);
        g.poly([0, 0, -9, -4.5, -9, 4.5], P.ink);
        g.poly([-34, 0, -42, -5, -42, 5], P.b);
        g.pop();
      });

      /* arco */
      c.save(); c.translate(bow.x, bow.y); c.rotate(angle);
      c.strokeStyle = P.c; c.lineWidth = 5;
      c.beginPath(); c.arc(0, 0, 42, -1.15, 1.15); c.stroke();
      const px = -pull * 26;
      g.line(17, -38, px, 0, alpha(P.ink, 0.85), 1.8);
      g.line(px, 0, 17, 38, alpha(P.ink, 0.85), 1.8);
      g.line(px, 0, px + 62, 0, '#c19a6b', 3);
      g.poly([px + 62, 0, px + 52, -5, px + 52, 5], P.ink);
      c.restore();

      /* trayectoria estimada */
      if (pull > 0.02) {
        c.save(); c.setLineDash([4, 8]); c.strokeStyle = alpha(P.c, 0.4); c.lineWidth = 2;
        c.beginPath();
        let px2 = bow.x, py = bow.y, vx = Math.cos(angle) * (260 + pull * 620), vy = Math.sin(angle) * (260 + pull * 620);
        c.moveTo(px2, py);
        for (let i = 0; i < 60; i++) {
          vy += GRAV * 0.02; vx += wind * 0.02; px2 += vx * 0.02; py += vy * 0.02;
          if (py > H) break;
          c.lineTo(px2, py);
        }
        c.stroke(); c.restore();
      }

      g.rrect(24, H - 34, 200, 12, 6, 'rgba(255,255,255,.14)');
      g.rrect(24, H - 34, 200 * pull, 12, 6, P.c);
      g.text('VIENTO ' + (wind > 0 ? '→' : '←') + ' ' + Math.abs(Math.round(wind)),
        W / 2, 40, { size: 16, align: 'center', weight: 800, color: P.c });

      if (msgT > 0) E.ui.title(msg, W / 2, 110, { size: 34 });
      E.particles.draw(g);
      E.floaters.draw(g);
      E.ui.hint('Apunta con el ratón y mantén pulsado para tensar', { bottom: 60 });
    },
  };
});
