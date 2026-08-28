/* Plataformas Precisas — 20 salas cortas y exigentes con pinchos y plataformas móviles. */
NX.game('plataformas-precisas', {
  w: 800, h: 520, pal: 'toxic',
  controls: { dpad: 'lr', buttons: [{ k: 'space', label: 'SALTO' }] },
  music: { root: 45, scale: 'dorian', bpm: 118, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GRAV = 2100, JUMP = -700, SP = 250;

  /* Cada sala: bloques [x,y,w,h], pinchos, móviles y meta. */
  const ROOMS = [
    { s: [40, 420], blocks: [[0, 470, 800, 50], [300, 380, 120, 20], [560, 300, 140, 20]], spikes: [[200, 450, 80]], goal: [620, 250] },
    { s: [40, 420], blocks: [[0, 470, 200, 50], [280, 470, 160, 50], [520, 470, 280, 50], [360, 360, 90, 18]], spikes: [[200, 450, 80], [440, 450, 80]], goal: [700, 410] },
    { s: [40, 200], blocks: [[0, 250, 160, 20], [240, 330, 120, 20], [440, 240, 120, 20], [640, 160, 160, 20], [0, 480, 800, 40]], spikes: [[0, 460, 800]], goal: [700, 120] },
    { s: [40, 420], blocks: [[0, 470, 800, 50], [180, 390, 60, 18], [340, 320, 60, 18], [500, 250, 60, 18], [660, 180, 120, 18]], spikes: [[250, 450, 380]], goal: [710, 140] },
    { s: [40, 420], blocks: [[0, 470, 240, 50], [560, 470, 240, 50]], movers: [[280, 400, 90, 18, 260, 0, 60]], spikes: [[240, 500, 320]], goal: [720, 410] },
    { s: [40, 120], blocks: [[0, 170, 140, 20], [660, 170, 140, 20], [0, 470, 800, 50], [330, 330, 140, 20]], spikes: [[150, 450, 500]], goal: [720, 130] },
    { s: [40, 420], blocks: [[0, 470, 800, 50], [140, 380, 70, 18], [300, 300, 70, 18], [460, 380, 70, 18], [620, 300, 70, 18]], spikes: [[210, 450, 90], [370, 450, 90], [530, 450, 90]], goal: [660, 260] },
    { s: [40, 420], blocks: [[0, 470, 800, 50], [0, 300, 260, 20], [540, 300, 260, 20]], movers: [[300, 380, 100, 18, 0, 200, 90]], spikes: [[280, 450, 240]], goal: [700, 260] },
    { s: [40, 150], blocks: [[0, 200, 180, 20], [620, 200, 180, 20], [0, 470, 800, 50], [280, 340, 60, 18], [460, 340, 60, 18]], spikes: [[190, 450, 420], [200, 180, 60], [540, 180, 60]], goal: [720, 160] },
    { s: [40, 420], blocks: [[0, 470, 800, 50]], movers: [[180, 380, 80, 18, 0, 160, 110], [420, 300, 80, 18, 0, 200, 140], [640, 220, 90, 18, 60, 0, 70]], spikes: [[60, 450, 700]], goal: [700, 170] },
  ];

  let room, hero, blocks, spikes, movers, goal, deaths, timeT, alive, done, msgT, coyote, jumpBuf;

  function loadRoom(i) {
    room = i % ROOMS.length;
    const R = ROOMS[room];
    hero = { x: R.s[0], y: R.s[1], vx: 0, vy: 0, w: 22, h: 28, onGround: false, face: 1 };
    blocks = R.blocks.map((b) => ({ x: b[0], y: b[1], w: b[2], h: b[3] }));
    spikes = (R.spikes || []).map((s) => ({ x: s[0], y: s[1], w: s[2] }));
    movers = (R.movers || []).map((m) => ({
      x0: m[0], y0: m[1], w: m[2], h: m[3], ax: m[4], ay: m[5], sp: m[6], t: 0, x: m[0], y: m[1], px: m[0], py: m[1],
    }));
    goal = { x: R.goal[0], y: R.goal[1] };
    coyote = 0; jumpBuf = 0;
    hud();
  }
  function reset() { deaths = 0; timeT = 0; alive = true; done = false; msgT = 0; loadRoom(0); }
  function hud() { E.api.hud({ Sala: (room + 1) + '/' + ROOMS.length, Muertes: deaths, Tiempo: M.fmtTime(timeT) }); }

  function die() {
    deaths++;
    E.sfx('hurt'); E.camera.kick(12); E.camera.flash('#ff4d6d', 0.35);
    E.particles.burst(hero.x + 11, hero.y + 14, 20, { col: [P.c, '#ff4d6d'], speed1: 240, add: true });
    loadRoom(room);
  }

  reset();

  return {
    update(dt) {
      if (done) return;
      timeT += dt;
      if (msgT > 0) msgT -= dt;

      movers.forEach((m) => {
        m.px = m.x; m.py = m.y;
        m.t += dt * m.sp / 100;
        const k = (Math.sin(m.t) + 1) / 2;
        m.x = m.x0 + m.ax * k;
        m.y = m.y0 + m.ay * k;
      });

      const ax = E.input.axis().x;
      hero.vx = M.damp(hero.vx, ax * SP, hero.onGround ? 22 : 10, dt);
      if (Math.abs(ax) > 0.1) hero.face = Math.sign(ax);

      if (E.input.pressed('space') || E.input.pressed('up') || E.input.pointer.pressed) jumpBuf = 0.14;
      jumpBuf -= dt;
      if (hero.onGround) coyote = 0.1; else coyote -= dt;
      if (jumpBuf > 0 && coyote > 0) {
        hero.vy = JUMP; jumpBuf = 0; coyote = 0;
        E.sfx('jump');
        E.particles.burst(hero.x + 11, hero.y + hero.h, 6, { col: [P.a], speed1: 110, angle: Math.PI / 2, spread: 0.7 });
      }
      if (!(E.input.down('space') || E.input.down('up')) && hero.vy < -220) hero.vy = -220;

      hero.vy = Math.min(hero.vy + GRAV * dt, 900);

      const solids = blocks.concat(movers);
      /* eje X */
      hero.x += hero.vx * dt;
      solids.forEach((b) => {
        if (hero.x < b.x + b.w && hero.x + hero.w > b.x && hero.y < b.y + b.h && hero.y + hero.h > b.y) {
          if (hero.vx > 0) hero.x = b.x - hero.w; else if (hero.vx < 0) hero.x = b.x + b.w;
          hero.vx = 0;
        }
      });
      /* eje Y */
      hero.onGround = false;
      hero.y += hero.vy * dt;
      solids.forEach((b) => {
        if (hero.x < b.x + b.w && hero.x + hero.w > b.x && hero.y < b.y + b.h && hero.y + hero.h > b.y) {
          if (hero.vy > 0) {
            hero.y = b.y - hero.h; hero.onGround = true;
            if (b.px !== undefined) { hero.x += b.x - b.px; hero.y += b.y - b.py; }
          } else hero.y = b.y + b.h;
          hero.vy = 0;
        }
      });

      hero.x = M.clamp(hero.x, 0, W - hero.w);
      if (hero.y > H + 60) return die();
      for (const s of spikes) {
        if (hero.x + hero.w > s.x + 4 && hero.x < s.x + s.w - 4 &&
            hero.y + hero.h > s.y + 6 && hero.y < s.y + 24) return die();
      }

      if (M.dist(hero.x + 11, hero.y + 14, goal.x, goal.y) < 30) {
        E.sfx('win');
        E.particles.burst(goal.x, goal.y, 24, { col: [P.c, '#fff'], speed1: 260, add: true });
        if (room + 1 >= ROOMS.length) {
          done = true;
          setTimeout(() => E.api.win({
            score: Math.max(0, 20000 - Math.round(timeT * 60) - deaths * 200),
            title: '¡Todas las salas superadas!',
            msg: M.fmtTime(timeT) + ' con ' + deaths + ' muertes',
            stats: { Tiempo: M.fmtTime(timeT), Muertes: deaths },
          }), 400);
        } else { msgT = 1; loadRoom(room + 1); }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgArena(E.t, 11);
      g.bgGrid(40, alpha(P.a, 0.05), 1, 0, 0);

      blocks.forEach((b) => {
        g.rrect(b.x, b.y, b.w, b.h, 4, mix(P.d, P.deep, 0.1));
        g.rrect(b.x, b.y, b.w, Math.min(5, b.h), 4, alpha(P.a, 0.5));
      });
      movers.forEach((m) => {
        g.rrect(m.x, m.y, m.w, m.h, 4, P.d);
        g.rrect(m.x, m.y, m.w, 5, 4, alpha(P.c, 0.7));
      });
      spikes.forEach((s) => {
        for (let x = s.x; x < s.x + s.w - 8; x += 16) {
          g.poly([x, s.y + 22, x + 8, s.y, x + 16, s.y + 22], '#ff4d6d');
        }
      });

      g.bloom(goal.x, goal.y, 40, P.c, 0.5);
      g.star(goal.x, goal.y, 16, 7, 5, E.t * 1.4, P.c);

      g.push(hero.x + hero.w / 2, hero.y + hero.h / 2);
      g.rrect(-hero.w / 2, -hero.h / 2, hero.w, hero.h, 6, P.a);
      g.rect(-6 + hero.face * 2, -6, 4, 5, P.deep);
      g.rect(2 + hero.face * 2, -6, 4, 5, P.deep);
      g.pop();

      E.particles.draw(g);
      E.floaters.draw(g);
      if (msgT > 0) E.ui.title('Sala ' + (room + 1), W / 2, 90, { size: 34 });
      E.ui.hint('← → mover · Espacio saltar (salto corto si sueltas antes)', { bottom: 14 });
    },
  };
});
