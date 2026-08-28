/* Simón Neón — repite la secuencia de luces y notas; cada ronda añade un paso. */
NX.game('simon-neon', {
  w: 640, h: 640, pal: 'neon',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CX = W / 2, CY = H / 2 + 20, R = Math.min(W, H) * 0.34;
  const COLS = ['#22e0ff', '#ff4d6d', '#4ade80', '#ffd45e'];
  const NOTES = [61, 65, 68, 73];

  let seq, step, showing, showT, active, round, alive, best, msg, msgT, speed;

  function reset() {
    seq = []; step = 0; showing = true; showT = 0.8; active = -1; round = 0; alive = true;
    best = E.api.best || 0; msg = 'Observa'; msgT = 0; speed = 0.62;
    nextRound();
    hud();
  }
  function hud() { E.api.hud({ Ronda: round, Récord: Math.max(best, round), Paso: step + '/' + seq.length }); }

  function nextRound() {
    round++;
    seq.push(E.rng.int(4));
    step = 0; showing = true; showT = 0.5;
    speed = Math.max(0.24, 0.62 - round * 0.015);
    msg = 'Observa'; msgT = 1.2;
    hud();
  }

  function press(i) {
    active = i;
    E.audio.tone({ type: 'triangle', freq: E.audio.N(NOTES[i]), dur: 0.32, vol: 0.2 });
    E.particles.burst(CX + Math.cos(i * M.TAU / 4 - Math.PI / 4 + 0.4) * R * 0.7,
                      CY + Math.sin(i * M.TAU / 4 - Math.PI / 4 + 0.4) * R * 0.7, 8,
                      { col: [COLS[i]], speed1: 180, add: true });
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;

      if (showing) {
        showT -= dt;
        if (showT <= 0) {
          if (active >= 0) { active = -1; showT = speed * 0.35; }
          else if (step < seq.length) { press(seq[step]); step++; showT = speed; }
          else { showing = false; step = 0; msg = 'Tu turno'; msgT = 1; }
        }
        return;
      }

      const p = E.input.pointer;
      let idx = -1;
      if (p.pressed) {
        const d = M.dist(p.x, p.y, CX, CY);
        if (d > R * 0.3 && d < R) {
          const a = M.wrap(Math.atan2(p.y - CY, p.x - CX) + Math.PI / 2, 0, M.TAU);
          idx = Math.floor(a / (M.TAU / 4));
        }
      }
      ['1', '2', '3', '4'].forEach((k, i) => { if (E.input.pressed(k)) idx = i; });
      if (idx < 0) { if (active >= 0 && !p.down) active = -1; return; }

      press(idx);
      if (seq[step] === idx) {
        step++;
        if (step >= seq.length) {
          E.sfx('chime');
          /* Ronda superada: anillo de chispas alrededor del centro. */
          E.camera.kick(7);
          for (let k = 0; k < 4; k++) {
            const a2 = k * Math.PI / 2 + Math.PI / 4;
            E.particles.burst(CX + Math.cos(a2) * R * 0.7, CY + Math.sin(a2) * R * 0.7, 12,
              { col: [COLS[k], '#ffffff'], speed1: 190, life1: 0.6, add: true });
          }
          setTimeout(() => { if (alive) nextRound(); }, 500);
          showing = true; showT = 0.7; step = 0;
        }
        hud();
      } else {
        alive = false;
        E.sfx('lose'); E.camera.kick(14); E.camera.flash('#ff4d6d', 0.4);
        setTimeout(() => E.api.over({
          score: round - 1, label: 'Rondas',
          msg: 'Llegaste a la ronda ' + (round - 1),
        }), 700);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('SIMÓN NEÓN', W / 2, 52, { size: 26, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });

      for (let i = 0; i < 4; i++) {
        const a0 = i * (M.TAU / 4) - Math.PI / 2 + 0.03;
        const a1 = a0 + M.TAU / 4 - 0.06;
        const on = active === i;
        c.save();
        if (on) { c.shadowColor = COLS[i]; c.shadowBlur = 40; }
        c.fillStyle = on ? COLS[i] : alpha(COLS[i], 0.28);
        c.beginPath();
        c.arc(CX, CY, R, a0, a1);
        c.arc(CX, CY, R * 0.34, a1, a0, true);
        c.closePath(); c.fill();
        c.restore();
        const mid = (a0 + a1) / 2;
        g.text(String(i + 1), CX + Math.cos(mid) * R * 0.68, CY + Math.sin(mid) * R * 0.68 + 7,
          { size: 20, align: 'center', weight: 900, color: on ? '#0d1220' : alpha('#ffffff', 0.35) });
      }

      g.circle(CX, CY, R * 0.3, mix(P.deep, '#000', 0.35));
      g.ring(CX, CY, R * 0.3, 2, alpha(P.ink, 0.25));
      g.text(String(round), CX, CY + 12, { size: 38, align: 'center', weight: 900, color: P.ink, mono: true });
      g.text('RONDA', CX, CY - 18, { size: 10, align: 'center', color: P.dim, weight: 800, letterSpacing: 2 });

      if (msgT > 0) {
        g.text(msg, W / 2, H - 74, {
          size: 22, align: 'center', weight: 900,
          color: showing ? P.c : '#4ade80', shadow: showing ? P.c : '#4ade80', shadowBlur: 14,
        });
      }
      E.particles.draw(g);
      E.ui.hint('Toca los sectores o pulsa 1-4 para repetir la secuencia', { bottom: 22 });
    },
  };
});
