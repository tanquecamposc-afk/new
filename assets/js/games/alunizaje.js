/* Alunizaje — física de aterrizaje: poco combustible, mucha gravedad. */
NX.game('alunizaje', {
  w: 900, h: 620, pal: 'mono',
  controls: { dpad: true },
  music: { root: 41, scale: 'minor', bpm: 78, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 32;

  let lander, terrain, pads, fuel, score, level, alive, landed, msg, msgT, warm;

  function makeTerrain() {
    terrain = [];
    let y = H * 0.72;
    for (let x = 0; x <= W; x += 22) {
      y += E.rng.float(-24, 24);
      y = M.clamp(y, H * 0.5, H - 40);
      terrain.push({ x, y });
    }
    pads = [];
    const n = M.clamp(3 - Math.floor(level / 3), 1, 3);
    const used = [];
    for (let k = 0; k < n; k++) {
      let i;
      do { i = E.rng.range(2, terrain.length - 4); } while (used.some((u) => Math.abs(u - i) < 3));
      used.push(i);
      const yy = terrain[i].y;
      terrain[i + 1].y = yy;
      pads.push({ i, x0: terrain[i].x, x1: terrain[i + 1].x, y: yy, mult: k === 0 ? 2 : 1 });
    }
  }

  const groundAt = (x) => {
    for (let i = 0; i < terrain.length - 1; i++) {
      if (x >= terrain[i].x && x <= terrain[i + 1].x) {
        const t = (x - terrain[i].x) / (terrain[i + 1].x - terrain[i].x);
        return M.lerp(terrain[i].y, terrain[i + 1].y, t);
      }
    }
    return H;
  };

  function reset() {
    level = 1; score = 0;
    newLevel();
  }
  function newLevel() {
    makeTerrain();
    lander = { x: E.rng.float(120, W - 120), y: 58, vx: E.rng.float(-18, 18), vy: 0, a: 0, th: 0 };
    /* Segundo y medio flotando antes de que tire la gravedad: da tiempo a
       leer los controles en vez de estrellarte mirando el HUD. */
    warm = 1.6;
    fuel = 100; alive = true; landed = false; msg = ''; msgT = 0;
    hud();
  }
  function hud() {
    E.api.hud({
      Puntos: M.fmtScore(score), Combustible: Math.round(fuel) + '%',
      Vertical: Math.round(lander.vy) , Nivel: level,
    });
  }

  function crash(txt) {
    alive = false;
    E.sfx('explode'); E.camera.kick(20); E.camera.flash('#ff4d6d', 0.5);
    E.particles.burst(lander.x, lander.y, 40, { col: [P.c, P.a, '#fff'], speed1: 300, grav: 200, life1: 1.2, add: true });
    msg = txt; msgT = 2;
    setTimeout(() => E.api.over({ score, msg: txt + ' · nivel ' + level, stats: { Nivel: level } }), 900);
  }

  function success(pad) {
    landed = true;
    const bonus = Math.round(fuel * 6 * pad.mult + 300 * pad.mult);
    score += bonus;
    E.sfx('win');
    E.floaters.add(lander.x, lander.y - 30, '+' + bonus, { col: P.c, size: 26 });
    E.particles.burst(lander.x, lander.y + 10, 18, { col: [P.c], speed1: 130, add: true });
    msg = 'Alunizaje perfecto ×' + pad.mult; msgT = 2;
    hud();
    setTimeout(() => { level++; newLevel(); }, 1700);
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive || landed) return;

      const rot = (E.input.down('left') ? -1 : 0) + (E.input.down('right') ? 1 : 0);
      lander.a += rot * 2.2 * dt;
      lander.a = M.clamp(lander.a, -1.3, 1.3);
      const thrusting = (E.input.down('up') || E.input.down('space') || E.input.pointer.down) && fuel > 0;
      lander.th = M.damp(lander.th, thrusting ? 1 : 0, 12, dt);
      if (thrusting) {
        fuel = Math.max(0, fuel - 17 * dt);
        lander.vx += Math.sin(lander.a) * 76 * dt;
        lander.vy -= Math.cos(lander.a) * 76 * dt;
        if (Math.random() < 0.7) {
          E.particles.trail(lander.x - Math.sin(lander.a) * 16, lander.y + Math.cos(lander.a) * 16, {
            vx: -Math.sin(lander.a) * 90 + lander.vx, vy: Math.cos(lander.a) * 90 + lander.vy,
            col: [P.c, '#fff'], r: 3, life: 0.35,
          });
        }
        if (Math.floor(E.t * 8) % 2 === 0) E.sfx('engine', lander.th);
      }
      if (warm > 0) {
        warm -= dt;
        if (E.input.down('up') || E.input.down('space') || E.input.pointer.down) warm = 0;
      } else {
        lander.vy += GRAV * dt;
      }
      lander.x += lander.vx * dt; lander.y += lander.vy * dt;
      if (lander.x < 10) { lander.x = 10; lander.vx = Math.abs(lander.vx) * 0.4; }
      if (lander.x > W - 10) { lander.x = W - 10; lander.vx = -Math.abs(lander.vx) * 0.4; }
      if (Math.floor(E.t * 4) !== Math.floor((E.t - dt) * 4)) hud();

      const gy = groundAt(lander.x);
      if (lander.y + 16 >= gy) {
        const pad = pads.find((p) => lander.x > p.x0 - 4 && lander.x < p.x1 + 4);
        const soft = lander.vy < 42 && Math.abs(lander.vx) < 30 && Math.abs(lander.a) < 0.32;
        if (pad && soft) { lander.y = gy - 16; lander.vx = lander.vy = 0; success(pad); }
        else if (pad) crash('Aterrizaje demasiado brusco');
        else crash('Fuera de la plataforma');
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgSpace(E.t, 23);
      for (let i = 0; i < 70; i++) {
        const x = (i * 197.3) % W, y = (i * 113.7) % (H * 0.7);
        g.circle(x, y, 0.7 + (i % 4) * 0.3, alpha('#ffffff', 0.1 + (i % 4) * 0.07));
      }
      g.circle(W * 0.82, H * 0.16, 46, alpha('#3a4a66', 0.35));

      c.beginPath(); c.moveTo(0, H);
      terrain.forEach((t) => c.lineTo(t.x, t.y));
      c.lineTo(W, H); c.closePath();
      c.fillStyle = '#171d29'; c.fill();
      c.strokeStyle = alpha(P.ink, 0.55); c.lineWidth = 2;
      c.beginPath();
      terrain.forEach((t, i) => (i ? c.lineTo(t.x, t.y) : c.moveTo(t.x, t.y)));
      c.stroke();

      pads.forEach((p) => {
        g.rect(p.x0, p.y - 4, p.x1 - p.x0, 5, p.mult > 1 ? P.c : '#4ade80');
        g.text('×' + p.mult, (p.x0 + p.x1) / 2, p.y - 12, {
          size: 13, align: 'center', color: p.mult > 1 ? P.c : '#4ade80', weight: 900 });
        c.save(); c.globalCompositeOperation = 'lighter';
        g.rect(p.x0, p.y - 40, p.x1 - p.x0, 36, alpha(p.mult > 1 ? P.c : '#4ade80', 0.08));
        c.restore();
      });

      if (alive || landed) {
        g.push(lander.x, lander.y, lander.a);
        if (lander.th > 0.02) {
          c.save(); c.globalCompositeOperation = 'lighter';
          g.poly([-6, 14, 6, 14, 0, 14 + 26 * lander.th * (0.8 + Math.random() * 0.4)], alpha(P.c, 0.9));
          c.restore();
        }
        g.rrect(-13, -13, 26, 22, 7, '#dfe6f3');
        g.rect(-9, -8, 18, 9, mix('#22e0ff', '#0b0f1a', 0.35));
        g.line(-10, 9, -17, 20, '#9aa8c0', 3);
        g.line(10, 9, 17, 20, '#9aa8c0', 3);
        g.rect(-21, 19, 9, 3, '#9aa8c0'); g.rect(12, 19, 9, 3, '#9aa8c0');
        g.pop();
      }

      /* indicadores */
      const bad = lander.vy > 42;
      g.text('▼ ' + Math.round(lander.vy), 24, 34, { size: 16, color: bad ? '#ff4d6d' : '#4ade80', weight: 800, mono: true });
      g.text('◀▶ ' + Math.round(Math.abs(lander.vx)), 24, 56,
        { size: 16, color: Math.abs(lander.vx) > 24 ? '#ff4d6d' : '#4ade80', weight: 800, mono: true });
      g.rrect(W - 150, 26, 120, 10, 5, 'rgba(255,255,255,.12)');
      g.rrect(W - 150, 26, 120 * (fuel / 100), 10, 5, fuel > 25 ? P.c : '#ff4d6d');
      g.text('COMBUSTIBLE', W - 150, 20, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.4 });

      E.particles.draw(g);
      E.floaters.draw(g);
      if (msgT > 0) E.ui.title(msg, W / 2, H * 0.34, { size: 34 });
      E.ui.hint(warm > 0
        ? '↑ o Espacio para propulsar · la gravedad entra en ' + warm.toFixed(1) + ' s'
        : '↑ propulsar · ← → inclinar · posa suave sobre la plataforma', { bottom: 16 });
    },
  };
});
