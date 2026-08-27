/* Kart Retro — carretera pseudo-3D con proyección de cámara, curvas y colinas. */
NX.game('kart-retro', {
  w: 900, h: 560, pal: 'candy',
  controls: { dpad: true },
  music: { root: 45, scale: 'major', bpm: 142, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  const SEG_LEN = 200;          /* longitud de cada tramo en unidades de mundo */
  const ROAD_W = 2200;          /* semiancho de la calzada */
  const CAM_H = 1100;           /* altura de cámara */
  const CAM_D = 1 / Math.tan((100 / 2) * Math.PI / 180);
  const DRAW = 260;             /* tramos visibles */
  const LANES = 3;

  let segs, total, pos, playerX, speed, maxSpeed, t, lap, alive, rivals, msg, msgT, countdown, timeLeft, skew;

  function addSegment(curve, y) {
    const n = segs.length;
    segs.push({
      i: n, curve,
      p1: { world: { y: lastY(), z: n * SEG_LEN }, cam: {}, scr: {} },
      p2: { world: { y }, cam: {}, scr: {} },
      color: Math.floor(n / 3) % 2,
    });
    segs[n].p2.world.z = (n + 1) * SEG_LEN;
  }
  function lastY() { return segs.length === 0 ? 0 : segs[segs.length - 1].p2.world.y; }

  function addRoad(enter, hold, leave, curve, y) {
    const startY = lastY(), endY = startY + y * SEG_LEN;
    const totalN = enter + hold + leave;
    for (let i = 0; i < enter; i++) addSegment(curve * M.ease.inOutQuad(i / enter), M.lerp(startY, endY, M.ease.inOutQuad(i / totalN)));
    for (let i = 0; i < hold; i++) addSegment(curve, M.lerp(startY, endY, M.ease.inOutQuad((enter + i) / totalN)));
    for (let i = 0; i < leave; i++) addSegment(curve * (1 - M.ease.inOutQuad(i / leave)), M.lerp(startY, endY, M.ease.inOutQuad((enter + hold + i) / totalN)));
  }

  function buildRoad() {
    segs = [];
    addRoad(30, 40, 30, 0, 0);
    addRoad(30, 50, 30, 3.4, 24);
    addRoad(24, 40, 24, -3.8, -18);
    addRoad(30, 30, 30, 0, 34);
    addRoad(30, 60, 30, 5.2, -22);
    addRoad(24, 30, 24, -2.4, 12);
    addRoad(40, 60, 40, 2.2, -18);
    addRoad(30, 40, 30, -5.4, 26);
    addRoad(30, 50, 30, 0, -14);
    total = segs.length * SEG_LEN;
  }

  function segAt(z) { return segs[Math.floor(z / SEG_LEN) % segs.length]; }

  function project(p, camX, camY, camZ) {
    p.cam.x = (p.world.x || 0) - camX;
    p.cam.y = p.world.y - camY;
    p.cam.z = p.world.z - camZ;
    if (p.cam.z < 1) p.cam.z = 1;
    const s = CAM_D / p.cam.z;
    p.scr.s = s;
    p.scr.x = Math.round(W / 2 + s * p.cam.x * W / 2);
    p.scr.y = Math.round(H / 2 - s * p.cam.y * H / 2);
    p.scr.w = Math.round(s * ROAD_W * W / 2);
  }

  function reset() {
    buildRoad();
    pos = 0; playerX = 0; speed = 0; maxSpeed = SEG_LEN * 62; t = 0; lap = 1; alive = true;
    msg = ''; msgT = 0; countdown = 3.2; timeLeft = 70; skew = 0;
    rivals = [];
    for (let i = 0; i < 8; i++) {
      rivals.push({
        z: (i + 2) * 700 + E.rng.float(0, 400),
        x: E.rng.float(-0.7, 0.7), sp: maxSpeed * E.rng.float(0.36, 0.62),
        col: E.rng.pick([P.a, P.b, P.d, '#4ade80', '#ff4d6d']),
      });
    }
    hud();
  }
  function hud() {
    E.api.hud({ Vuelta: lap, Velocidad: Math.round(speed / SEG_LEN * 22) + ' km/h', Tiempo: Math.ceil(timeLeft) });
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      if (countdown > 0) {
        countdown -= dt;
        if (Math.ceil(countdown) !== Math.ceil(countdown + dt)) E.sfx(countdown > 0.4 ? 'tick' : 'alarm');
        return;
      }
      t += dt;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score: Math.round(pos / 40 + lap * 3000), label: 'Puntos',
          msg: lap + (lap === 1 ? ' vuelta' : ' vueltas') + ' completadas',
          stats: { Vueltas: lap },
        }), 500);
        return;
      }

      const ax = E.input.axis();
      const accel = E.input.down('up') || ax.y < -0.3 || E.input.pointer.down;
      const brake = E.input.down('down');
      const off = Math.abs(playerX) > 1;
      const target = accel ? maxSpeed : brake ? 0 : speed * 0.82;
      speed = M.damp(speed, off ? Math.min(target, maxSpeed * 0.34) : target, accel ? 0.9 : 2.2, dt);

      const sp = speed / maxSpeed;
      playerX += ax.x * dt * 2.4 * (0.4 + sp * 0.6);
      const cur = segAt(pos).curve;
      playerX -= cur * dt * sp * 0.52;
      skew = M.damp(skew, ax.x, 8, dt);

      if (off) {
        playerX = M.clamp(playerX, -1.6, 1.6);
        if (Math.random() < 0.5) {
          E.particles.spawn({
            x: W / 2 + playerX * 90, y: H - 60, vx: E.rng.float(-60, 60), vy: -E.rng.float(20, 90),
            life: 0.5, r: 4, col: alpha('#d8c8a0', 0.7), grav: 260,
          });
        }
      }

      const prev = pos;
      pos = (pos + speed * dt) % total;
      if (pos < prev) { lap++; timeLeft += 24; msg = '¡Vuelta ' + lap + '!'; msgT = 1.8; E.sfx('levelup'); }

      rivals.forEach((r) => {
        r.z = (r.z + r.sp * dt) % total;
        let rel = r.z - pos;
        if (rel < -total / 2) rel += total;
        if (rel > total / 2) rel -= total;
        if (rel > -SEG_LEN && rel < SEG_LEN * 2.4 && Math.abs(r.x - playerX) < 0.42) {
          speed = Math.max(maxSpeed * 0.18, speed * 0.5);
          r.z = (r.z + SEG_LEN * 3) % total;
          E.sfx('hit'); E.camera.kick(10);
        }
      });
      hud();
    },

    draw(g) {
      const c = g.ctx;
      const base = segAt(pos);
      const basePct = (pos % SEG_LEN) / SEG_LEN;
      const camY = CAM_H + base.p1.world.y;

      /* cielo */
      c.fillStyle = g.linGrad(0, 0, 0, H * 0.6, [[0, mix(P.b, P.deep, 0.4)], [1, mix(P.c, P.deep, 0.25)]]);
      c.fillRect(0, 0, W, H);
      g.circle(W * 0.7 - base.curve * 30, H * 0.22, 46, alpha(P.c, 0.55));
      /* montañas parallax */
      c.fillStyle = alpha(mix(P.d, P.deep, 0.45), 0.65);
      c.beginPath(); c.moveTo(-100, H * 0.55);
      for (let i = 0; i <= 14; i++) {
        const x = i * (W / 12) - ((pos * 0.02 + base.curve * 20) % (W / 6));
        c.lineTo(x, H * 0.55 - 40 - Math.abs(Math.sin(i * 1.9)) * 90);
      }
      c.lineTo(W + 100, H * 0.6); c.closePath(); c.fill();

      let x = 0, dx = -(base.curve * basePct);
      let maxY = H;
      const drawn = [];

      for (let n = 0; n < DRAW; n++) {
        const seg = segs[(base.i + n) % segs.length];
        const looped = seg.i < base.i;
        const camZ = pos - (looped ? total : 0);
        project(seg.p1, playerX * ROAD_W - x, camY, camZ);
        project(seg.p2, playerX * ROAD_W - x - dx, camY, camZ);
        x += dx; dx += seg.curve;
        seg.clip = maxY;
        if (seg.p1.cam.z <= CAM_D || seg.p2.scr.y >= seg.p1.scr.y || seg.p2.scr.y >= maxY) continue;
        maxY = seg.p2.scr.y;
        drawn.push(seg);

        const p1 = seg.p1.scr, p2 = seg.p2.scr;
        const dark = seg.color;
        /* hierba */
        c.fillStyle = dark ? mix('#2e7d43', P.deep, 0.32) : mix('#35914d', P.deep, 0.3);
        c.fillRect(0, p2.y, W, p1.y - p2.y + 1);
        /* arcenes */
        const rumble1 = p1.w / 5, rumble2 = p2.w / 5;
        c.fillStyle = dark ? '#f8fafc' : '#e8384f';
        poly(c, p1.x - p1.w - rumble1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - rumble2, p2.y);
        poly(c, p1.x + p1.w + rumble1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + rumble2, p2.y);
        /* asfalto */
        c.fillStyle = dark ? mix('#3a4152', P.deep, 0.18) : mix('#434b5e', P.deep, 0.18);
        poly(c, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y);
        /* líneas de carril */
        if (dark) {
          c.fillStyle = alpha('#ffffff', 0.55);
          const lw1 = p1.w / 26, lw2 = p2.w / 26;
          for (let l = 1; l < LANES; l++) {
            const lx1 = p1.x - p1.w + (p1.w * 2) * l / LANES;
            const lx2 = p2.x - p2.w + (p2.w * 2) * l / LANES;
            poly(c, lx1 - lw1, p1.y, lx1 + lw1, p1.y, lx2 + lw2, p2.y, lx2 - lw2, p2.y);
          }
        }
      }

      /* rivales: de lejos a cerca */
      const list = rivals.map((r) => {
        let rel = r.z - pos;
        if (rel < 0) rel += total;
        return { r, rel };
      }).filter((o) => o.rel < DRAW * SEG_LEN * 0.45).sort((a, b) => b.rel - a.rel);

      list.forEach((o) => {
        if (o.rel < SEG_LEN * 1.6) return;          /* demasiado cerca: quedaría deforme */
        const seg = segs[(base.i + Math.floor(o.rel / SEG_LEN)) % segs.length];
        if (!seg || !seg.p1.scr.s) return;
        const s = seg.p1.scr;
        const size = Math.min(230, s.s * 1500 * W / 2);
        if (size < 3) return;
        const sx = s.x + s.w * o.r.x;
        const sy = s.y;
        if (sy > seg.clip) return;
        drawKart(g, sx, sy, size, o.r.col, 0);
      });

      /* kart del jugador */
      const bob = Math.sin(t * 24) * (speed / maxSpeed) * 2.4;
      drawKart(g, W / 2 + skew * 16, H - 56 + bob, 190, P.c, skew, true);

      /* HUD */
      g.text(Math.round(speed / SEG_LEN * 22) + ' km/h', W - 30, 46, {
        size: 24, align: 'right', weight: 900, color: P.ink, mono: true });
      g.text('VUELTA ' + lap, 30, 46, { size: 20, weight: 900, color: P.ink, letterSpacing: 2 });
      g.rrect(W / 2 - 110, 24, 220, 10, 5, 'rgba(255,255,255,.18)');
      g.rrect(W / 2 - 110, 24, 220 * M.clamp01(timeLeft / 70), 10, 5, timeLeft > 12 ? P.a : '#ff4d6d');

      if (countdown > 0) E.ui.title(countdown > 1 ? String(Math.ceil(countdown - 0.2)) : '¡YA!', W / 2, H / 2, { size: 68 });
      if (msgT > 0) E.ui.title(msg, W / 2, 130, { size: 32 });
      E.particles.draw(g);
      E.ui.hint('↑ acelerar · ↓ frenar · ← → girar', { bottom: 12 });

      function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4) {
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
        ctx.closePath(); ctx.fill();
      }
    },
  };

  function drawKart(g, x, y, size, col, tilt, mine) {
    const c = g.ctx;
    const w = size * 0.62, h = size * 0.4;
    c.save();
    c.translate(x, y);
    c.globalAlpha = 0.3;
    g.ctx.beginPath();
    g.ctx.ellipse(0, 0, w * 0.55, h * 0.14, 0, 0, M.TAU);
    g.ctx.fillStyle = '#000'; g.ctx.fill();
    c.globalAlpha = 1;
    c.rotate((tilt || 0) * 0.06);
    g.rect(-w * 0.56, -h * 0.5, w * 0.2, h * 0.55, '#1b2437');
    g.rect(w * 0.36, -h * 0.5, w * 0.2, h * 0.55, '#1b2437');
    g.rrect(-w / 2, -h, w, h, h * 0.28, col);
    g.rrect(-w * 0.3, -h * 0.9, w * 0.6, h * 0.5, h * 0.2, alpha('#0b1220', 0.72));
    if (mine) {
      g.rrect(-w * 0.16, -h * 1.35, w * 0.32, h * 0.45, h * 0.2, '#ff7ab6');
      g.rect(-w * 0.42, -h * 0.14, w * 0.16, h * 0.1, '#ff4d6d');
      g.rect(w * 0.26, -h * 0.14, w * 0.16, h * 0.1, '#ff4d6d');
    }
    c.restore();
  }
});
