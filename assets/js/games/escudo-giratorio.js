/* Escudo Giratorio — gira el escudo para desviar los proyectiles del color correcto. */
NX.game('escudo-giratorio', {
  w: 900, h: 620, pal: 'ocean',
  controls: { dpad: 'lr' },
  music: { root: 45, scale: 'lydian', bpm: 116, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CX = W / 2, CY = H / 2, RAD = 78;

  const COLORS = [P.a, P.c, P.b];
  let ang, targetAng, arcs, shots, score, hp, spawnT, alive, combo, comboT, wave;

  function reset() {
    ang = 0; targetAng = 0;
    arcs = 2;
    shots = []; score = 0; hp = 3; spawnT = 1; alive = true; combo = 0; comboT = 0; wave = 1;
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Núcleo: hp, Combo: '×' + Math.max(1, combo) }); }

  function spawn() {
    const a = E.rng.float(0, M.TAU);
    const d = 400;
    shots.push({
      a, d, sp: 105 + wave * 9, col: E.rng.int(Math.min(COLORS.length, 1 + Math.floor(wave / 3))),
      r: 9,
    });
  }

  function hurt() {
    hp--; combo = 0;
    E.sfx('hurt'); E.camera.kick(14); E.camera.flash('#ff4d6d', 0.35);
    hud();
    if (hp <= 0) {
      alive = false;
      E.particles.burst(CX, CY, 44, { col: [P.a, P.b, P.c], speed1: 340, add: true });
      setTimeout(() => E.api.over({ score, msg: 'Oleada ' + wave, stats: { Oleada: wave } }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; hud(); } }

      let rot = 0;
      if (E.input.down('left')) rot -= 1;
      if (E.input.down('right')) rot += 1;
      if (E.input.pointer.down) {
        targetAng = Math.atan2(E.input.pointer.y - CY, E.input.pointer.x - CX);
        ang = M.dampAngle(ang, targetAng, 18, dt);
      }
      ang += rot * 4.2 * dt;

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.3, 1.25 - wave * 0.05); spawn(); }
      if (score > wave * wave * 180) { wave++; E.sfx('levelup'); if (wave % 3 === 0 && arcs < 3) arcs++; }

      const arcW = 0.62;
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.d -= s.sp * dt;
        if (s.d <= RAD + 6 && s.d > RAD - 14) {
          /* ¿el sector correcto está delante? */
          let blocked = -1;
          for (let k = 0; k < arcs; k++) {
            const ca = ang + k * (M.TAU / arcs);
            if (Math.abs(M.angleDiff(ca, s.a)) < arcW / 2) blocked = k;
          }
          if (blocked >= 0 && blocked % COLORS.length === s.col % Math.max(1, Math.min(arcs, COLORS.length))) {
            combo = Math.min(20, combo + 1); comboT = 2.4;
            const pts = 20 * combo;
            score += pts;
            E.floaters.add(CX + Math.cos(s.a) * RAD, CY + Math.sin(s.a) * RAD, '+' + pts, { col: COLORS[s.col], size: 15 + combo });
            E.particles.burst(CX + Math.cos(s.a) * RAD, CY + Math.sin(s.a) * RAD, 10,
              { col: [COLORS[s.col], '#fff'], speed1: 200, add: true });
            E.sfx('shield'); E.camera.kick(3);
            shots.splice(i, 1); hud(); continue;
          }
          if (blocked >= 0) {
            /* color equivocado: rebota pero no puntúa */
            E.sfx('error');
            E.particles.burst(CX + Math.cos(s.a) * RAD, CY + Math.sin(s.a) * RAD, 6, { col: ['#ff6b8a'], speed1: 130 });
            shots.splice(i, 1); combo = 0; hud(); continue;
          }
        }
        if (s.d <= 26) { shots.splice(i, 1); hurt(); }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgSpace(E.t, 5);
      for (let i = 1; i <= 6; i++) g.ring(CX, CY, i * 58, 1, alpha(P.a, 0.06));

      g.bloom(CX, CY, 110, P.b, 0.3);
      g.circle(CX, CY, 24, mix(P.d, P.deep, 0.2));
      g.ring(CX, CY, 24, 3, hp > 1 ? P.b : '#ff4d6d');
      for (let i = 0; i < hp; i++) {
        G.Sprites.heart(g, CX - (hp - 1) * 12 + i * 24, CY + 1, 16, '#ff4d6d');
      }

      c.save(); c.lineCap = 'round';
      for (let k = 0; k < arcs; k++) {
        const ca = ang + k * (M.TAU / arcs);
        const col = COLORS[k % COLORS.length];
        g.ring(CX, CY, RAD, 14, alpha(col, 0.9), ca - 0.31, ca + 0.31);
        g.ring(CX, CY, RAD, 4, alpha('#ffffff', 0.4), ca - 0.31, ca + 0.31);
      }
      c.restore();
      g.ring(CX, CY, RAD, 1.5, alpha(P.ink, 0.16));

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => {
        const x = CX + Math.cos(s.a) * s.d, y = CY + Math.sin(s.a) * s.d;
        g.capsule(x, y, CX + Math.cos(s.a) * (s.d + 20), CY + Math.sin(s.a) * (s.d + 20), 4, alpha(COLORS[s.col], 0.5));
        g.circle(x, y, s.r, COLORS[s.col]);
        g.circle(x, y, s.r * 0.45, '#ffffff');
      });
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      if (combo > 2) g.text('×' + combo, CX, CY - 60, { size: 28, align: 'center', weight: 900, color: P.c });
      E.ui.hint('← → girar el escudo · cada sector solo para su color', { bottom: 16 });
    },
  };
});
