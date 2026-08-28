/* Duelo de Tanques — proyectiles que rebotan en los muros y una IA que calcula ángulos. */
NX.game('duelo-tanques', {
  w: 900, h: 620, pal: 'forest',
  controls: { stick: true, buttons: [{ k: 'space', label: 'FUEGO' }] },
  music: { root: 40, scale: 'dorian', bpm: 104, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let walls, me, foes, shells, score, round, alive, respawnT;

  function buildArena() {
    walls = [
      { x: 0, y: 0, w: W, h: 18 }, { x: 0, y: H - 18, w: W, h: 18 },
      { x: 0, y: 0, w: 18, h: H }, { x: W - 18, y: 0, w: 18, h: H },
    ];
    const n = 5 + Math.min(5, round);
    for (let i = 0; i < n; i++) {
      const vert = E.rng.bool();
      const w = vert ? 20 : E.rng.range(80, 190);
      const hh = vert ? E.rng.range(80, 190) : 20;
      walls.push({
        x: E.rng.range(60, W - 80 - w), y: E.rng.range(60, H - 80 - hh), w, h: hh,
      });
    }
  }

  function freeSpot() {
    for (let i = 0; i < 200; i++) {
      const x = E.rng.float(60, W - 60), y = E.rng.float(60, H - 60);
      if (!walls.some((w) => M.circleRect(x, y, 26, w.x, w.y, w.w, w.h))) return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  }

  function tank(col, ai) {
    const s = freeSpot();
    return { x: s.x, y: s.y, a: E.rng.float(0, M.TAU), ta: 0, col, ai, cool: 0, hp: ai ? 1 : 3, think: 0, mv: 0 };
  }

  function reset() {
    score = 0; round = 1; alive = true; respawnT = 0;
    buildArena();
    me = tank(P.a, false); me.hp = 3;
    foes = [tank(P.b, true), tank(P.c, true)];
    shells = [];
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Blindaje: me.hp, Ronda: round }); }

  function hitsWall(x, y, r) {
    return walls.some((w) => M.circleRect(x, y, r, w.x, w.y, w.w, w.h));
  }

  function fire(t) {
    if (t.cool > 0) return;
    t.cool = t.ai ? 1.5 : 0.55;
    shells.push({
      x: t.x + Math.cos(t.a) * 26, y: t.y + Math.sin(t.a) * 26,
      vx: Math.cos(t.a) * 330, vy: Math.sin(t.a) * 330,
      owner: t, bounces: 3, life: 5,
    });
    E.sfx('shoot');
    E.camera.kick(t.ai ? 1 : 3);
  }

  function boom(x, y) {
    E.particles.burst(x, y, 20, { col: [P.c, '#fff', P.a], speed1: 240, life1: 0.7, add: true });
    E.sfx('explode'); E.camera.kick(9);
  }

  function killFoe(i) {
    const f = foes[i];
    boom(f.x, f.y);
    foes.splice(i, 1);
    score += 100 * round;
    E.floaters.add(f.x, f.y, '+' + (100 * round), { col: P.c, size: 20 });
    hud();
    if (!foes.length) {
      round++;
      E.sfx('levelup');
      respawnT = 1.2;
    }
  }

  function meDie() {
    me.hp--;
    boom(me.x, me.y);
    E.camera.flash('#ff4d6d', 0.4);
    hud();
    if (me.hp <= 0) {
      alive = false;
      setTimeout(() => E.api.over({ score, msg: 'Superaste ' + (round - 1) + ' rondas', stats: { Ronda: round } }), 700);
    } else {
      const s = freeSpot(); me.x = s.x; me.y = s.y;
    }
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (respawnT > 0) {
        respawnT -= dt;
        if (respawnT <= 0) {
          buildArena();
          const s = freeSpot(); me.x = s.x; me.y = s.y;
          const n = Math.min(4, 1 + Math.floor(round / 2));
          foes = []; for (let i = 0; i < n; i++) foes.push(tank([P.b, P.c, P.d, P.a][i % 4], true));
          shells = [];
        }
        return;
      }

      /* jugador */
      me.cool -= dt;
      const ax = E.input.axis();
      const nx = me.x + ax.x * 190 * dt, ny = me.y + ax.y * 190 * dt;
      if (!hitsWall(nx, me.y, 15)) me.x = nx;
      if (!hitsWall(me.x, ny, 15)) me.y = ny;
      if (ax.len > 0.1) me.ta = Math.atan2(ax.y, ax.x);
      const p = E.input.pointer;
      me.a = (p.inside || p.down) ? Math.atan2(p.y - me.y, p.x - me.x) : me.ta;
      if (E.input.down('space') || p.down) fire(me);

      /* enemigos */
      foes.forEach((f) => {
        f.cool -= dt;
        f.think -= dt;
        const d = M.dist(f.x, f.y, me.x, me.y);
        const toMe = Math.atan2(me.y - f.y, me.x - f.x);
        f.a = M.dampAngle(f.a, toMe, 3.4, dt);
        if (f.think <= 0) { f.think = E.rng.float(0.5, 1.6); f.mv = E.rng.float(0, M.TAU); }
        const move = d > 240 ? toMe : d < 130 ? toMe + Math.PI : f.mv;
        const sp = 78 + round * 6;
        const fx = f.x + Math.cos(move) * sp * dt, fy = f.y + Math.sin(move) * sp * dt;
        if (!hitsWall(fx, f.y, 15)) f.x = fx; else f.mv = Math.PI - f.mv;
        if (!hitsWall(f.x, fy, 15)) f.y = fy; else f.mv = -f.mv;
        /* dispara si tiene línea despejada */
        if (Math.abs(M.angleDiff(f.a, toMe)) < 0.22 && d < 420) {
          let clear = true;
          for (let s = 20; s < d; s += 14) {
            if (hitsWall(f.x + Math.cos(toMe) * s, f.y + Math.sin(toMe) * s, 4)) { clear = false; break; }
          }
          if (clear) fire(f);
        }
      });

      /* proyectiles con rebote */
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        s.life -= dt;
        if (s.life <= 0) { shells.splice(i, 1); continue; }
        let nxs = s.x + s.vx * dt, nys = s.y + s.vy * dt;
        if (hitsWall(nxs, s.y, 4)) { s.vx *= -1; s.bounces--; E.sfx('pong'); nxs = s.x; }
        if (hitsWall(s.x, nys, 4)) { s.vy *= -1; s.bounces--; E.sfx('pong'); nys = s.y; }
        s.x = nxs; s.y = nys;
        if (s.bounces < 0) { shells.splice(i, 1); E.particles.burst(s.x, s.y, 6, { col: [P.dim], speed1: 80 }); continue; }
        if (Math.random() < 0.5) E.particles.trail(s.x, s.y, { col: s.owner === me ? P.a : P.b, r: 2, life: 0.25 });

        if (s.owner !== me && M.dist(s.x, s.y, me.x, me.y) < 16) { shells.splice(i, 1); meDie(); continue; }
        for (let k = foes.length - 1; k >= 0; k--) {
          if (M.dist(s.x, s.y, foes[k].x, foes[k].y) < 16) {
            shells.splice(i, 1);
            if (s.owner === me) killFoe(k);
            else { boom(foes[k].x, foes[k].y); foes.splice(k, 1); }
            break;
          }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgTurf(E.t, mix(P.deep, P.d, 0.30), 0.035, 46);
      g.bgGrid(34, alpha(P.a, 0.05), 1, 0, 0);
      walls.forEach((w) => {
        g.rrect(w.x, w.y, w.w, w.h, 4, mix(P.dim, P.deep, 0.35));
        g.rrect(w.x, w.y, w.w, Math.min(6, w.h), 4, alpha(P.a, 0.28));
      });

      const drawTank = (t) => {
        g.push(t.x, t.y, t.a);
        g.rrect(-17, -13, 34, 26, 6, t.col);
        g.rect(-17, -16, 34, 5, mix(t.col, '#000', 0.4));
        g.rect(-17, 11, 34, 5, mix(t.col, '#000', 0.4));
        g.circle(0, 0, 10, mix(t.col, '#fff', 0.22));
        g.rect(6, -3.5, 26, 7, mix(t.col, '#000', 0.25));
        g.pop();
      };
      foes.forEach(drawTank);
      drawTank(me);
      g.ring(me.x, me.y, 22, 1.5, alpha(P.c, 0.4));

      c.save(); c.globalCompositeOperation = 'lighter';
      shells.forEach((s) => {
        g.circle(s.x, s.y, 4.5, s.owner === me ? P.c : '#ff6b8a');
        g.circle(s.x, s.y, 9, alpha(s.owner === me ? P.c : '#ff6b8a', 0.28));
      });
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      if (respawnT > 0) E.ui.title('Ronda ' + round, W / 2, H / 2, { size: 46 });
      E.ui.hint('WASD mover · ratón apuntar · los disparos rebotan', { bottom: 30 });
    },
  };
});
