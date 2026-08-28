/* Circuito Neón — carrera cenital a tres vueltas con derrapes y turbo. */
NX.game('circuito-neon', {
  w: 900, h: 620, pal: 'neon',
  controls: { dpad: true, buttons: [{ k: 'space', label: 'TURBO' }] },
  music: { root: 43, scale: 'minor', bpm: 140, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const TRACK_W = 96;

  /* Puntos de la línea central del circuito. */
  const PATH = [[180, 480], [140, 300], [220, 170], [400, 130], [560, 180], [640, 300],
                [760, 330], [790, 460], [660, 530], [420, 520], [300, 560]];

  let me, rivals, laps, checkpoint, t, best, alive, turbo, msg, msgT, countdown, place;

  function pathPoint(i) { return PATH[((i % PATH.length) + PATH.length) % PATH.length]; }

  function nearestSeg(x, y) {
    let bi = 0, bd = 1e9, bt = 0;
    for (let i = 0; i < PATH.length; i++) {
      const a = pathPoint(i), b = pathPoint(i + 1);
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy || 1;
      const tt = M.clamp01(((x - a[0]) * dx + (y - a[1]) * dy) / len2);
      const px = a[0] + dx * tt, py = a[1] + dy * tt;
      const d = M.dist(x, y, px, py);
      if (d < bd) { bd = d; bi = i; bt = tt; }
    }
    return { i: bi, d: bd, t: bt };
  }

  function makeCar(x, y, col, ai) {
    return { x, y, a: -1.4, vx: 0, vy: 0, sp: 0, col, ai, lap: 0, cp: 0, drift: 0, boost: 0, wp: 1, trail: [] };
  }

  function reset() {
    const s = pathPoint(0);
    me = makeCar(s[0], s[1] - 20, P.c, false);
    rivals = [
      makeCar(s[0] - 34, s[1] + 6, P.a, true),
      makeCar(s[0] + 34, s[1] + 6, P.b, true),
      makeCar(s[0], s[1] + 34, P.d, true),
    ];
    rivals.forEach((r, i) => { r.skill = 0.8 + i * 0.05; });
    laps = 3; t = 0; alive = true; turbo = 1; msg = ''; msgT = 0; countdown = 3.2; place = 1;
    hud();
  }
  function hud() {
    E.api.hud({ Vuelta: Math.min(laps, me.lap + 1) + '/' + laps, Puesto: place + '/4', Tiempo: M.fmtMs(t), Turbo: Math.round(turbo * 100) + '%' });
  }

  function updateCar(car, dt, steer, accel, boosting) {
    const grip = 3.4;
    car.a += steer * (2.4 - Math.min(1.2, car.sp / 260)) * dt;
    const target = accel * (boosting ? 460 : 330);
    car.sp = M.damp(car.sp, target, accel > 0 ? 1.6 : 3.2, dt);
    const fx = Math.cos(car.a) * car.sp, fy = Math.sin(car.a) * car.sp;
    car.vx = M.damp(car.vx, fx, grip, dt);
    car.vy = M.damp(car.vy, fy, grip, dt);
    car.x += car.vx * dt; car.y += car.vy * dt;
    const side = Math.abs(Math.cos(car.a) * car.vy - Math.sin(car.a) * car.vx);
    car.drift = M.damp(car.drift, M.clamp01(side / 160), 6, dt);

    const seg = nearestSeg(car.x, car.y);
    if (seg.d > TRACK_W / 2) {
      car.sp *= 0.965;
      const a = pathPoint(seg.i), b = pathPoint(seg.i + 1);
      const px = a[0] + (b[0] - a[0]) * seg.t, py = a[1] + (b[1] - a[1]) * seg.t;
      const ang = Math.atan2(car.y - py, car.x - px);
      car.x = px + Math.cos(ang) * (TRACK_W / 2);
      car.y = py + Math.sin(ang) * (TRACK_W / 2);
      /* Al salirte del asfalto saltan chispas contra el borde. */
      if (car === me && !car.off) { E.sfx('hit'); E.camera.kick(5); }
      if (car === me && Math.random() < 0.35) {
        E.particles.burst(car.x, car.y, 4, {
          col: ['#ffd45e', '#ff8a3d'], speed1: 130, life1: 0.35, add: true,
        });
      }
      car.off = true;
    } else car.off = false;

    /* progreso por checkpoints */
    if (seg.i === car.cp) {
      car.cp = (car.cp + 1) % PATH.length;
      if (car.cp === 0) {
        car.lap++;
        /* Solo el coche del jugador celebra la vuelta. */
        if (car === me) {
          E.sfx('levelup'); E.camera.kick(9); E.camera.flash(P.a, 0.2);
          E.particles.burst(car.x, car.y, 34, {
            col: [P.a, P.c, '#ffffff'], speed1: 300, life1: 0.9, add: true,
          });
          E.floaters.add(car.x, car.y - 26, 'Vuelta ' + car.lap, { col: P.c, size: 22 });
        }
      }
    }
    car.trail.push({ x: car.x, y: car.y, d: car.drift });
    if (car.trail.length > 26) car.trail.shift();
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (msgT > 0) msgT -= dt;
      if (countdown > 0) {
        countdown -= dt;
        if (Math.ceil(countdown) !== Math.ceil(countdown + dt)) E.sfx(countdown > 0.4 ? 'tick' : 'alarm');
        return;
      }
      t += dt;

      const ax = E.input.axis();
      const boosting = (E.input.down('space') || E.input.down('shift')) && turbo > 0.02;
      if (boosting) { turbo = Math.max(0, turbo - dt * 0.5); }
      else turbo = Math.min(1, turbo + dt * 0.09 + me.drift * dt * 0.4);
      const accel = E.input.down('up') || E.input.down('w') || ax.y < -0.3 ? 1 :
        (E.input.down('down') ? -0.5 : (E.input.pointer.down ? 1 : 0.25));
      updateCar(me, dt, ax.x, accel, boosting);
      if (me.drift > 0.4 && Math.random() < 0.5) {
        E.particles.trail(me.x, me.y, { col: alpha('#ffffff', 0.35), r: 3, life: 0.5, add: false });
      }
      if (boosting) E.particles.trail(me.x - Math.cos(me.a) * 16, me.y - Math.sin(me.a) * 16,
        { col: [P.c, P.a], r: 4, life: 0.35 });

      rivals.forEach((r) => {
        const tgt = pathPoint(r.wp);
        const ang = Math.atan2(tgt[1] - r.y, tgt[0] - r.x);
        const diff = M.angleDiff(r.a, ang);
        updateCar(r, dt, M.clamp(diff * 2.2, -1, 1), r.skill, false);
        if (M.dist(r.x, r.y, tgt[0], tgt[1]) < 70) r.wp = (r.wp + 1) % PATH.length;
      });

      const prog = (car) => car.lap * PATH.length + car.cp;
      const all = [me].concat(rivals).sort((a, b) => prog(b) - prog(a));
      place = all.indexOf(me) + 1;
      hud();

      if (me.lap >= laps) {
        alive = false;
        E.sfx(place === 1 ? 'win' : 'lose');
        setTimeout(() => {
          const o = { score: Math.round(t * 100), label: 'Centésimas', lower: true,
            fmt: (v) => M.fmtMs(v / 100),
            title: place === 1 ? '¡Victoria!' : 'Puesto ' + place,
            msg: laps + ' vueltas en ' + M.fmtMs(t),
            stats: { Puesto: place, Tiempo: M.fmtMs(t) } };
          place === 1 ? E.api.win(o) : E.api.over(o);
        }, 800);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.bgGrid(46, alpha(P.a, 0.05), 1, 0, 0);

      /* asfalto */
      c.save();
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = mix(P.deep, '#000', 0.3); c.lineWidth = TRACK_W;
      c.beginPath();
      PATH.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath(); c.stroke();
      c.strokeStyle = alpha(P.a, 0.55); c.lineWidth = TRACK_W + 6;
      c.globalCompositeOperation = 'destination-over';
      c.beginPath();
      PATH.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath(); c.stroke();
      c.restore();
      c.save();
      c.setLineDash([16, 22]); c.strokeStyle = alpha('#ffffff', 0.22); c.lineWidth = 2.5;
      c.beginPath();
      PATH.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath(); c.stroke(); c.restore();

      /* meta */
      const s0 = pathPoint(0), s1 = pathPoint(1);
      const fa = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]) + Math.PI / 2;
      for (let i = -3; i <= 3; i++) {
        g.push(s0[0] + Math.cos(fa) * i * 14, s0[1] + Math.sin(fa) * i * 14, fa);
        g.rect(-8, -7, 16, 14, i % 2 ? '#ffffff' : '#111827');
        g.pop();
      }

      const drawCar = (car) => {
        c.save(); c.globalAlpha = 0.22;
        car.trail.forEach((p, i) => {
          if (p.d < 0.25) return;
          g.circle(p.x, p.y, 4 * (i / car.trail.length), '#0a0d16');
        });
        c.restore();
        g.push(car.x, car.y, car.a);
        g.rrect(-19, -11, 38, 22, 6, car.col);
        g.rrect(-4, -8, 14, 16, 4, alpha('#0b1220', 0.75));
        g.rect(-16, -14, 9, 5, '#1b2437'); g.rect(-16, 9, 9, 5, '#1b2437');
        g.rect(8, -14, 9, 5, '#1b2437'); g.rect(8, 9, 9, 5, '#1b2437');
        g.pop();
      };
      rivals.forEach(drawCar);
      drawCar(me);
      g.ring(me.x, me.y, 24, 1.5, alpha(P.c, 0.45));

      E.particles.draw(g);

      /* HUD */
      g.rrect(20, H - 44, 200, 14, 7, 'rgba(255,255,255,.12)');
      g.rrect(20, H - 44, 200 * turbo, 14, 7, turbo > 0.2 ? P.c : '#ff4d6d');
      g.text('TURBO', 20, H - 52, { size: 10, color: P.dim, weight: 800, letterSpacing: 1.5 });
      g.text(Math.round(me.sp) + ' km/h', W - 24, H - 30, { size: 20, align: 'right', weight: 900, color: P.ink, mono: true });

      if (countdown > 0) {
        E.ui.title(countdown > 1 ? String(Math.ceil(countdown - 0.2)) : '¡YA!', W / 2, H / 2, { size: 72 });
      }
      E.ui.hint('↑ acelerar · ← → girar · Espacio turbo', { bottom: 12 });
    },
  };
});
