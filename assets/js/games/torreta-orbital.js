/* Torreta Orbital — orbitas un núcleo y disparas hacia fuera mientras llegan enemigos. */
NX.game('torreta-orbital', {
  w: 900, h: 620, pal: 'candy',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'FUEGO' }] },
  music: { root: 45, scale: 'penta', bpm: 118, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CX = W / 2, CY = H / 2 - 10, RAD = 92;

  let ang, cool, shots, foes, score, coreHp, wave, spawnT, alive, shield, combo, comboT;

  function reset() {
    ang = -Math.PI / 2; cool = 0; shots = []; foes = [];
    score = 0; coreHp = 100; wave = 1; spawnT = 1; alive = true; shield = 0;
    combo = 0; comboT = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Núcleo: Math.max(0, Math.round(coreHp)) + '%', Oleada: wave });
  }

  function spawn() {
    const a = E.rng.float(0, M.TAU);
    const d = Math.max(W, H) * 0.62;
    const kind = E.rng.weighted([[0, 10], [1, wave > 2 ? 5 : 0], [2, wave > 4 ? 3 : 0]]);
    foes.push({
      x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, a,
      sp: (46 + wave * 5) * (kind === 1 ? 1.7 : kind === 2 ? 0.6 : 1),
      hp: kind === 2 ? 5 + wave : 1 + (kind === 1 ? 0 : Math.floor(wave / 4)),
      r: kind === 2 ? 22 : kind === 1 ? 10 : 14, kind, ph: E.rng.float(0, 9),
    });
  }

  function damageCore(n) {
    if (shield > 0) { shield = 0; E.sfx('shield'); return; }
    coreHp -= n;
    E.sfx('hurt');
    E.camera.kick(10);
    E.camera.flash('#ff4d6d', 0.3);
    combo = 0;
    hud();
    if (coreHp <= 0 && alive) {
      alive = false;
      E.particles.burst(CX, CY, 60, { col: [P.a, P.b, P.c], speed1: 420, life1: 1.4, add: true });
      setTimeout(() => E.api.over({ score, msg: 'Aguantaste ' + wave + ' oleadas', stats: { Oleada: wave } }), 800);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

      let rot = 0;
      if (E.input.down('left')) rot -= 1;
      if (E.input.down('right')) rot += 1;
      if (E.input.pointer.down || E.input.pointer.inside) {
        const target = Math.atan2(E.input.pointer.y - CY, E.input.pointer.x - CX);
        if (E.input.pointer.down) ang = M.dampAngle(ang, target, 16, dt);
      }
      ang += rot * 3.4 * dt;

      cool -= dt;
      if ((E.input.down('space') || E.input.down('up') || E.input.pointer.down) && cool <= 0) {
        cool = 0.16;
        shots.push({ x: CX + Math.cos(ang) * RAD, y: CY + Math.sin(ang) * RAD,
          vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 1.4 });
        E.sfx('shoot');
      }

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.34, 1.5 - wave * 0.06);
        spawn();
      }
      if (score > wave * wave * 220) { wave++; E.sfx('levelup'); shield = 1; hud(); }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        if (s.life <= 0 || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) { shots.splice(i, 1); continue; }
        for (let k = foes.length - 1; k >= 0; k--) {
          const f = foes[k];
          if (M.dist(s.x, s.y, f.x, f.y) < f.r + 4) {
            shots.splice(i, 1);
            f.hp--;
            E.particles.burst(s.x, s.y, 4, { col: [P.c], speed1: 90, life1: 0.3, add: true });
            if (f.hp <= 0) {
              combo = Math.min(12, combo + 1); comboT = 1.8;
              const pts = (f.kind === 2 ? 60 : f.kind === 1 ? 25 : 15) * combo;
              score += pts;
              E.floaters.add(f.x, f.y, '+' + pts, { col: combo > 3 ? P.c : P.ink, size: 14 + combo });
              E.particles.burst(f.x, f.y, 12, { col: [P.a, P.b, P.c], speed1: 200, add: true });
              E.sfx(f.kind === 2 ? 'explode' : 'hit');
              foes.splice(k, 1);
              hud();
            } else E.sfx('tap');
            break;
          }
        }
      }

      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i];
        f.ph += dt * 4;
        const a = Math.atan2(CY - f.y, CX - f.x);
        const wob = f.kind === 1 ? Math.sin(f.ph) * 0.5 : 0;
        f.x += Math.cos(a + wob) * f.sp * dt;
        f.y += Math.sin(a + wob) * f.sp * dt;
        if (M.dist(f.x, f.y, CX, CY) < 42) {
          foes.splice(i, 1);
          E.particles.burst(f.x, f.y, 14, { col: ['#ff6b8a'], speed1: 160, add: true });
          damageCore(f.kind === 2 ? 22 : 10);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      /* anillos de fondo */
      for (let i = 1; i <= 5; i++) g.ring(CX, CY, i * 62 + Math.sin(E.t + i) * 3, 1, alpha(P.a, 0.07));

      /* núcleo */
      const pulse = 1 + Math.sin(E.t * 3) * 0.03;
      g.bloom(CX, CY, 120, coreHp > 35 ? P.b : '#ff4d6d', 0.35);
      g.circle(CX, CY, 34 * pulse, mix(P.d, P.deep, 0.2));
      g.ring(CX, CY, 34 * pulse, 3, coreHp > 35 ? P.b : '#ff4d6d');
      g.arcFill(CX, CY, 27, -Math.PI / 2, -Math.PI / 2 + M.TAU * M.clamp01(coreHp / 100), alpha(P.a, 0.45));
      if (shield > 0) g.ring(CX, CY, 50 + Math.sin(E.t * 6) * 2, 2.5, alpha(P.c, 0.8));

      /* órbita y torreta */
      g.ring(CX, CY, RAD, 1.5, alpha(P.a, 0.22));
      const tx = CX + Math.cos(ang) * RAD, ty = CY + Math.sin(ang) * RAD;
      g.push(tx, ty, ang);
      g.rrect(-14, -11, 28, 22, 7, P.ink);
      g.rect(10, -4, 22, 8, P.c);
      g.circle(0, 0, 6, P.d);
      g.pop();

      /* enemigos */
      foes.forEach((f) => {
        if (f.kind === 2) {
          g.ngon(f.x, f.y, f.r, 6, f.ph * 0.3, mix(P.d, P.deep, 0.15));
          g.ngon(f.x, f.y, f.r * 0.55, 6, -f.ph * 0.4, P.b);
        } else if (f.kind === 1) {
          g.push(f.x, f.y, Math.atan2(CY - f.y, CX - f.x));
          g.poly([12, 0, -8, -8, -4, 0, -8, 8], P.c);
          g.pop();
        } else {
          G.Sprites.blob(g, f.x, f.y, f.r, P.a, f.ph);
        }
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => g.capsule(s.x, s.y, s.x - s.vx * 0.02, s.y - s.vy * 0.02, 3, P.c));
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      if (combo > 2) g.text('×' + combo, CX, CY + 8, { size: 26, align: 'center', weight: 900, color: P.c });
      E.ui.hint('← → orbitar · Espacio disparar · o apunta con el ratón', { bottom: 16 });
    },
  };
});
