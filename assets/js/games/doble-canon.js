/* Doble Cañón — twin-stick: mueves con WASD, apuntas con el ratón, mejoras al subir de nivel. */
NX.game('doble-canon', {
  w: 940, h: 620, pal: 'ember',
  controls: { stick: true, buttons: [{ k: 'space', label: 'FUEGO' }] },
  music: { root: 40, scale: 'minor', bpm: 128, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  const UPGRADES = [
    { id: 'fire', t: 'Cadencia +25%', ico: '⚡' },
    { id: 'dmg', t: 'Daño +1', ico: '💥' },
    { id: 'speed', t: 'Velocidad +15%', ico: '👟' },
    { id: 'multi', t: 'Un proyectil más', ico: '🔱' },
    { id: 'hp', t: 'Vida máxima +2', ico: '❤️' },
    { id: 'pierce', t: 'Los disparos atraviesan', ico: '🎯' },
  ];

  let hero, foes, shots, orbs, score, wave, spawnT, alive, choosing, choices, lvl, xp, xpNext;

  function reset() {
    hero = { x: W / 2, y: H / 2, hp: 6, max: 6, sp: 230, fire: 0.28, dmg: 1, multi: 1, pierce: 0, cool: 0, aim: 0, iT: 0 };
    foes = []; shots = []; orbs = [];
    score = 0; wave = 1; spawnT = 0.6; alive = true; choosing = false; choices = [];
    lvl = 1; xp = 0; xpNext = 8;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Vida: hero.hp + '/' + hero.max, Nivel: lvl, Oleada: wave });
  }

  function spawn() {
    const side = E.rng.int(4);
    let x, y;
    if (side === 0) { x = E.rng.float(0, W); y = -30; }
    else if (side === 1) { x = W + 30; y = E.rng.float(0, H); }
    else if (side === 2) { x = E.rng.float(0, W); y = H + 30; }
    else { x = -30; y = E.rng.float(0, H); }
    const kind = E.rng.weighted([[0, 10], [1, wave > 2 ? 5 : 0], [2, wave > 5 ? 3 : 0]]);
    foes.push({
      x, y, kind, ph: E.rng.float(0, 9),
      r: kind === 2 ? 24 : kind === 1 ? 11 : 15,
      hp: kind === 2 ? 9 + wave * 2 : kind === 1 ? 2 : 3 + Math.floor(wave / 3),
      sp: kind === 1 ? 175 : kind === 2 ? 58 : 96,
    });
  }

  function levelUp() {
    lvl++; xp = 0; xpNext = Math.round(xpNext * 1.45);
    choosing = true;
    choices = E.rng.shuffle(UPGRADES.slice()).slice(0, 3);
    E.sfx('levelup');
    hud();
  }

  function applyUp(u) {
    if (u.id === 'fire') hero.fire *= 0.75;
    else if (u.id === 'dmg') hero.dmg += 1;
    else if (u.id === 'speed') hero.sp *= 1.15;
    else if (u.id === 'multi') hero.multi++;
    else if (u.id === 'hp') { hero.max += 2; hero.hp += 2; }
    else if (u.id === 'pierce') hero.pierce++;
    choosing = false;
    E.sfx('power');
    hud();
  }

  function hurt(n) {
    if (hero.iT > 0) return;
    hero.hp -= n; hero.iT = 0.9;
    E.sfx('hurt'); E.camera.kick(11); E.camera.flash('#ff4d6d', 0.3);
    hud();
    if (hero.hp <= 0) {
      alive = false;
      E.particles.burst(hero.x, hero.y, 44, { col: [P.a, P.c], speed1: 340, life1: 1.2, add: true });
      setTimeout(() => E.api.over({ score, msg: 'Nivel ' + lvl + ' · oleada ' + wave, stats: { Nivel: lvl, Oleada: wave } }), 700);
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (choosing) {
        const p = E.input.pointer;
        if (p.released) {
          for (let i = 0; i < 3; i++) {
            const bx = W / 2 - 300 + i * 205;
            if (p.x > bx && p.x < bx + 190 && p.y > H / 2 - 60 && p.y < H / 2 + 90) applyUp(choices[i]);
          }
        }
        if (E.input.pressed('1')) applyUp(choices[0]);
        if (E.input.pressed('2')) applyUp(choices[1]);
        if (E.input.pressed('3')) applyUp(choices[2]);
        return;
      }
      if (hero.iT > 0) hero.iT -= dt;

      const ax = E.input.axis();
      hero.x = M.clamp(hero.x + ax.x * hero.sp * dt, 20, W - 20);
      hero.y = M.clamp(hero.y + ax.y * hero.sp * dt, 20, H - 20);
      const p = E.input.pointer;
      if (p.inside || p.down) hero.aim = Math.atan2(p.y - hero.y, p.x - hero.x);
      else if (ax.len > 0.1) hero.aim = Math.atan2(ax.y, ax.x);

      hero.cool -= dt;
      const firing = p.down || E.input.down('space') || p.inside;
      if (firing && hero.cool <= 0) {
        hero.cool = hero.fire;
        for (let i = 0; i < hero.multi; i++) {
          const spread = (i - (hero.multi - 1) / 2) * 0.14;
          shots.push({ x: hero.x, y: hero.y, a: hero.aim + spread, life: 1.1, pierce: hero.pierce, hit: [] });
        }
        E.sfx('shoot');
      }

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.22, 1.1 - wave * 0.05); spawn(); }
      if (E.t > wave * 14) { wave++; E.sfx('alarm'); hud(); }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += Math.cos(s.a) * 640 * dt; s.y += Math.sin(s.a) * 640 * dt; s.life -= dt;
        if (s.life <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) { shots.splice(i, 1); continue; }
        for (let k = foes.length - 1; k >= 0; k--) {
          const f = foes[k];
          if (s.hit.indexOf(f) >= 0) continue;
          if (M.dist(s.x, s.y, f.x, f.y) < f.r + 4) {
            f.hp -= hero.dmg;
            s.hit.push(f);
            E.particles.burst(s.x, s.y, 4, { col: [P.c], speed1: 100, life1: 0.3, add: true });
            if (f.hp <= 0) {
              const pts = f.kind === 2 ? 90 : f.kind === 1 ? 25 : 15;
              score += pts;
              xp += f.kind === 2 ? 4 : 1;
              E.particles.burst(f.x, f.y, 12, { col: [P.a, P.b, P.c], speed1: 210, add: true });
              E.sfx(f.kind === 2 ? 'explode' : 'hit');
              if (E.rng.bool(0.16)) orbs.push({ x: f.x, y: f.y, t: 0 });
              foes.splice(k, 1);
              hud();
              if (xp >= xpNext) levelUp();
            } else E.sfx('tap');
            if (s.pierce > 0) s.pierce--; else { shots.splice(i, 1); break; }
          }
        }
      }

      foes.forEach((f) => {
        f.ph += dt * 4;
        const a = Math.atan2(hero.y - f.y, hero.x - f.x);
        const wob = f.kind === 1 ? Math.sin(f.ph * 1.6) * 0.6 : 0;
        f.x += Math.cos(a + wob) * f.sp * dt;
        f.y += Math.sin(a + wob) * f.sp * dt;
        if (M.dist(f.x, f.y, hero.x, hero.y) < f.r + 13) hurt(f.kind === 2 ? 2 : 1);
      });

      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.t += dt;
        const d = M.dist(o.x, o.y, hero.x, hero.y);
        if (d < 130) {
          const a = Math.atan2(hero.y - o.y, hero.x - o.x);
          o.x += Math.cos(a) * 260 * dt; o.y += Math.sin(a) * 260 * dt;
        }
        if (d < 20) {
          orbs.splice(i, 1);
          hero.hp = Math.min(hero.max, hero.hp + 1);
          E.sfx('heal'); E.floaters.add(hero.x, hero.y - 20, '+1 vida', { col: '#4ade80' });
          hud();
        } else if (o.t > 12) orbs.splice(i, 1);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGrid(46, alpha(P.a, 0.055), 1, 0, 0);

      orbs.forEach((o) => {
        g.bloom(o.x, o.y, 22, '#4ade80', 0.5);
        G.Sprites.heart(g, o.x, o.y, 18 + Math.sin(o.t * 5) * 2, '#4ade80');
      });

      foes.forEach((f) => {
        if (f.kind === 2) {
          g.ngon(f.x, f.y, f.r, 5, f.ph * 0.2, mix(P.b, P.deep, 0.15));
          g.ngon(f.x, f.y, f.r * 0.5, 5, -f.ph * 0.3, P.c);
        } else if (f.kind === 1) {
          g.push(f.x, f.y, Math.atan2(hero.y - f.y, hero.x - f.x));
          g.poly([14, 0, -9, -9, -5, 0, -9, 9], P.c);
          g.pop();
        } else G.Sprites.blob(g, f.x, f.y, f.r, P.a, f.ph);
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => {
        g.capsule(s.x, s.y, s.x - Math.cos(s.a) * 14, s.y - Math.sin(s.a) * 14, 3.2, P.c);
      });
      c.restore();

      if (hero.iT <= 0 || Math.floor(E.t * 14) % 2) {
        g.bloom(hero.x, hero.y, 44, P.a, 0.35);
        g.push(hero.x, hero.y, hero.aim);
        g.rrect(-13, -13, 26, 26, 8, P.ink);
        g.rect(8, -5, 20, 10, P.c);
        g.circle(0, 0, 6, P.d);
        g.pop();
      }

      /* barra de experiencia */
      g.rrect(20, H - 24, W - 40, 6, 3, 'rgba(255,255,255,.1)');
      g.rrect(20, H - 24, (W - 40) * M.clamp01(xp / xpNext), 6, 3, P.c);

      E.particles.draw(g);
      E.floaters.draw(g);

      if (choosing) {
        E.ui.scrim(0.78);
        E.ui.title('Elige una mejora', W / 2, H / 2 - 110, { size: 36 });
        for (let i = 0; i < 3; i++) {
          const bx = W / 2 - 300 + i * 205;
          const hov = E.input.pointer.x > bx && E.input.pointer.x < bx + 190 &&
                      E.input.pointer.y > H / 2 - 60 && E.input.pointer.y < H / 2 + 90;
          g.rrect(bx, H / 2 - 60, 190, 150, 16, hov ? alpha(P.a, 0.25) : 'rgba(255,255,255,.06)');
          g.rrectStroke(bx, H / 2 - 60, 190, 150, 16, hov ? P.c : alpha(P.a, 0.35), 2);
          g.text(choices[i].ico, bx + 95, H / 2 + 5, { size: 44, align: 'center' });
          g.text(choices[i].t, bx + 95, H / 2 + 50, { size: 15, align: 'center', color: P.ink, weight: 800 });
          g.text('[' + (i + 1) + ']', bx + 95, H / 2 + 74, { size: 12, align: 'center', color: P.dim });
        }
      } else {
        E.ui.hint('WASD mover · ratón apuntar y disparar', { bottom: 34 });
      }
    },
  };
});
