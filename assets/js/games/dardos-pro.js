/* Dardos Pro — partida a 501 con doble para cerrar y una mira que no se está quieta. */
NX.game('dardos-pro', {
  w: 720, h: 700, pal: 'royal',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CX = W / 2, CY = 300, R = 220;
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

  let cross, darts, remaining, throwsLeft, msg, msgT, alive, round, hist, needDouble;

  function reset() {
    cross = { x: CX, y: CY, ph: 0, sp: 1 };
    darts = []; remaining = 501; throwsLeft = 3; msg = ''; msgT = 0; alive = true; round = 1;
    hist = []; needDouble = false;
    hud();
  }
  function hud() { E.api.hud({ Restan: remaining, Dardos: throwsLeft, Ronda: round }); }

  function scoreAt(x, y) {
    const dx = x - CX, dy = y - CY;
    const d = Math.hypot(dx, dy);
    if (d > R) return { v: 0, label: 'Fuera', mult: 0 };
    if (d < R * 0.055) return { v: 50, label: 'Diana', mult: 2 };
    if (d < R * 0.11) return { v: 25, label: '25', mult: 1 };
    let a = Math.atan2(dy, dx) + Math.PI / 2 + Math.PI / 20;
    a = M.wrap(a, 0, M.TAU);
    const seg = ORDER[Math.floor(a / (M.TAU / 20)) % 20];
    let mult = 1;
    if (d > R * 0.86 && d < R) mult = 2;
    else if (d > R * 0.52 && d < R * 0.6) mult = 3;
    return { v: seg * mult, label: (mult === 3 ? 'T' : mult === 2 ? 'D' : '') + seg, mult };
  }

  function throwDart() {
    const jitter = 6;
    const x = cross.x + E.rng.float(-jitter, jitter);
    const y = cross.y + E.rng.float(-jitter, jitter);
    const s = scoreAt(x, y);
    darts.push({ x, y, t: 0, label: s.label });
    E.sfx(s.v > 0 ? 'hit' : 'error');
    E.camera.kick(3);
    throwsLeft--;

    const next = remaining - s.v;
    if (next === 0 && s.mult === 2) {
      remaining = 0;
      msg = '¡CIERRE!'; msgT = 2;
      alive = false;
      E.sfx('win');
      setTimeout(() => E.api.win({
        score: Math.max(0, 6000 - round * 200), label: 'Puntos',
        title: '¡501 cerrado!',
        msg: 'Cerrado en ' + round + ' rondas',
        stats: { Rondas: round },
      }), 900);
      hud();
      return;
    }
    if (next < 2) { msg = 'Te pasaste'; msgT = 1.4; E.sfx('error'); }
    else { remaining = next; msg = s.label + ' · ' + s.v; msgT = 1.2; }
    hud();

    if (throwsLeft <= 0) {
      setTimeout(() => {
        if (!alive) return;
        round++; throwsLeft = 3; darts = [];
        cross.sp = Math.min(2.6, 1 + round * 0.09);
        hud();
        if (round > 12) {
          alive = false;
          E.api.over({ score: Math.max(0, 501 - remaining) * 10, msg: 'Te quedaste en ' + remaining });
        }
      }, 1200);
    }
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      darts.forEach((d) => { d.t += dt; });
      if (!alive) return;
      cross.ph += dt * cross.sp;
      cross.x = CX + Math.sin(cross.ph * 1.7) * R * 0.72;
      cross.y = CY + Math.cos(cross.ph * 1.13) * R * 0.62;
      if (throwsLeft > 0 && (E.input.pressed('space') || E.input.pointer.pressed)) throwDart();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.32), P.deep);
      g.circle(CX, CY, R + 24, mix('#2a1f18', P.deep, 0.2));
      g.ring(CX, CY, R + 24, 6, mix(P.dim, P.deep, 0.3));

      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * M.TAU - Math.PI / 2 - Math.PI / 20;
        const a1 = a0 + M.TAU / 20;
        c.fillStyle = i % 2 ? '#efe4c8' : '#1b2029';
        c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, R, a0, a1); c.closePath(); c.fill();
        c.fillStyle = i % 2 ? '#e8384f' : '#2f9e5f';
        c.beginPath(); c.arc(CX, CY, R, a0, a1); c.arc(CX, CY, R * 0.86, a1, a0, true); c.closePath(); c.fill();
        c.beginPath(); c.arc(CX, CY, R * 0.6, a0, a1); c.arc(CX, CY, R * 0.52, a1, a0, true); c.closePath(); c.fill();
        const mid = (a0 + a1) / 2;
        g.text(String(ORDER[i]), CX + Math.cos(mid) * (R + 12), CY + Math.sin(mid) * (R + 12) + 5,
          { size: 13, align: 'center', color: alpha(P.ink, 0.75), weight: 800 });
      }
      g.circle(CX, CY, R * 0.11, '#2f9e5f');
      g.circle(CX, CY, R * 0.055, '#e8384f');

      darts.forEach((d) => {
        const k = Math.min(1, d.t * 6);
        g.line(d.x, d.y, d.x + 34 * k, d.y - 26 * k, P.ink, 3);
        g.poly([d.x + 34 * k, d.y - 26 * k, d.x + 48 * k, d.y - 20 * k, d.x + 48 * k, d.y - 32 * k], P.c);
        g.circle(d.x, d.y, 3, P.c);
      });

      if (alive && throwsLeft > 0) {
        g.ring(cross.x, cross.y, 18, 2, alpha(P.c, 0.9));
        g.line(cross.x - 28, cross.y, cross.x - 8, cross.y, P.c, 2);
        g.line(cross.x + 8, cross.y, cross.x + 28, cross.y, P.c, 2);
        g.line(cross.x, cross.y - 28, cross.x, cross.y - 8, P.c, 2);
        g.line(cross.x, cross.y + 8, cross.x, cross.y + 28, P.c, 2);
      }

      g.rrect(W / 2 - 140, H - 150, 280, 74, 16, alpha(P.deep, 0.8));
      g.text('RESTAN', W / 2, H - 124, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 2 });
      g.text(String(remaining), W / 2, H - 90, {
        size: 40, align: 'center', weight: 900, color: remaining <= 40 ? P.c : P.ink, mono: true });
      for (let i = 0; i < 3; i++) {
        g.circle(W / 2 - 30 + i * 30, H - 62, 7, i < throwsLeft ? P.c : 'rgba(255,255,255,.14)');
      }

      if (msgT > 0) E.ui.title(msg, W / 2, 66, { size: 32 });
      E.particles.draw(g);
      E.ui.hint('Pulsa Espacio o toca cuando la mira esté donde quieres', { bottom: 18 });
    },
  };
});
