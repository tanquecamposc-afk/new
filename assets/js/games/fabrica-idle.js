/* Fábrica Idle — empieza con un tornillo y acaba con una cadena que produce sola. */
NX.game('fabrica-idle', {
  w: 860, h: 640, pal: 'mono',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  const UPGR = [
    { id: 'click', n: 'Destornillador', d: '+1 por clic', base: 15, gain: 1, ico: '🔧' },
    { id: 'belt', n: 'Cinta', d: '+0,5/s', base: 60, rate: 0.5, ico: '🎞️' },
    { id: 'arm', n: 'Brazo robótico', d: '+3/s', base: 420, rate: 3, ico: '🦾' },
    { id: 'press', n: 'Prensa', d: '+14/s', base: 2600, rate: 14, ico: '⚙️' },
    { id: 'line', n: 'Línea de montaje', d: '+70/s', base: 18000, rate: 70, ico: '🏭' },
    { id: 'ai', n: 'Control neuronal', d: '+400/s', base: 140000, rate: 400, ico: '🧠' },
    { id: 'orbit', n: 'Planta orbital', d: '+2.400/s', base: 1200000, rate: 2400, ico: '🛰️' },
  ];

  let parts, total, owned, clickPow, rate, t, pops, gears, prestige, msg, msgT, best;

  function reset() {
    parts = 0; total = 0; owned = {}; clickPow = 1; rate = 0; t = 0; pops = [];
    prestige = E.api.load('prestige', 0);
    gears = [];
    for (let i = 0; i < 8; i++) gears.push({ x: E.rng.float(60, W - 60), y: E.rng.float(120, H - 200), r: E.rng.float(18, 44), sp: E.rng.float(-1, 1) });
    msg = ''; msgT = 0; best = E.api.load('best', 0);
    hud();
  }
  function hud() {
    E.api.hud({ Piezas: fmt(parts), 'Por segundo': fmt(rate), Prestigio: prestige, Clic: '+' + fmt(clickPow) });
  }
  function fmt(n) {
    if (n < 1000) return n.toFixed(n < 10 ? 1 : 0);
    const u = ['K', 'M', 'B', 'T', 'Qa'];
    let i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return n.toFixed(1) + u[i];
  }
  function cost(u) { return Math.round(u.base * Math.pow(1.16, owned[u.id] || 0)); }

  function buy(u) {
    const cst = cost(u);
    if (parts < cst) { E.sfx('error'); msg = 'Te faltan piezas'; msgT = 1.2; return; }
    parts -= cst;
    owned[u.id] = (owned[u.id] || 0) + 1;
    if (u.gain) clickPow += u.gain;
    if (u.rate) rate += u.rate;
    E.sfx('power');
    hud();
  }

  function doPrestige() {
    const gain = Math.floor(Math.sqrt(total / 50000));
    if (gain < 1) { E.sfx('error'); msg = 'Necesitas producir mucho más'; msgT = 1.8; return; }
    prestige += gain;
    E.api.save('prestige', prestige);
    E.sfx('levelup');
    msg = '+' + gain + ' de prestigio'; msgT = 2.4;
    parts = 0; total = 0; owned = {}; clickPow = 1 + prestige; rate = 0;
    hud();
  }

  reset();

  return {
    update(dt) {
      t += dt;
      if (msgT > 0) msgT -= dt;
      const mult = 1 + prestige * 0.25;
      parts += rate * mult * dt;
      total += rate * mult * dt;
      if (total > best) { best = total; E.api.save('best', Math.round(best)); }
      gears.forEach((gr) => { gr.a = (gr.a || 0) + gr.sp * dt * (0.4 + Math.min(3, rate / 40)); });
      pops.forEach((q) => { q.t += dt; q.y -= 40 * dt; });
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 0.9) pops.splice(i, 1);
      if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) hud();

      const p = E.input.pointer;
      if (p.pressed) {
        /* botón grande */
        if (M.dist(p.x, p.y, W * 0.26, H * 0.42) < 96) {
          const gain = clickPow * mult;
          parts += gain; total += gain;
          pops.push({ x: p.x, y: p.y, t: 0, v: '+' + fmt(gain) });
          E.sfx('tap'); E.camera.kick(1.5);
          hud();
          return;
        }
        /* mejoras */
        UPGR.forEach((u, i) => {
          const x = W * 0.52, y = 110 + i * 66;
          if (p.x > x && p.x < x + 380 && p.y > y && p.y < y + 58) buy(u);
        });
        if (p.y > H - 60 && Math.abs(p.x - W * 0.26) < 110) doPrestige();
      }
      if (E.input.pressed('space')) {
        const gain = clickPow * mult;
        parts += gain; total += gain;
        pops.push({ x: W * 0.26, y: H * 0.42, t: 0, v: '+' + fmt(gain) });
        E.sfx('tap');
        hud();
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.25), P.deep);
      c.save(); c.globalAlpha = 0.07;
      gears.forEach((gr) => {
        g.push(gr.x, gr.y, gr.a || 0);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * M.TAU;
          g.push(Math.cos(a) * gr.r, Math.sin(a) * gr.r, a);
          g.rect(-gr.r * 0.13, -gr.r * 0.13, gr.r * 0.3, gr.r * 0.26, P.a);
          g.pop();
        }
        g.circle(0, 0, gr.r, P.a);
        g.circle(0, 0, gr.r * 0.35, P.deep);
        g.pop();
      });
      c.restore();

      g.text('FÁBRICA IDLE', W * 0.26, 54, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text(fmt(parts), W * 0.26, 106, {
        size: 46, align: 'center', weight: 900, color: P.c, mono: true, shadow: alpha(P.c, 0.35), shadowBlur: 18 });
      g.text('piezas · ' + fmt(rate * (1 + prestige * 0.25)) + '/s', W * 0.26, 134,
        { size: 14, align: 'center', color: P.dim, weight: 700 });

      /* botón */
      const p = E.input.pointer;
      const hov = M.dist(p.x, p.y, W * 0.26, H * 0.42) < 96;
      g.bloom(W * 0.26, H * 0.42, 150, P.a, hov ? 0.35 : 0.2);
      g.circle(W * 0.26, H * 0.42, 96 + (hov ? 3 : 0), mix(P.a, P.deep, 0.25));
      g.ring(W * 0.26, H * 0.42, 96, 4, P.a);
      g.push(W * 0.26, H * 0.42, t * 0.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * M.TAU;
        g.push(Math.cos(a) * 56, Math.sin(a) * 56, a);
        g.rect(-8, -8, 18, 16, alpha(P.c, 0.85));
        g.pop();
      }
      g.circle(0, 0, 40, P.c);
      g.circle(0, 0, 16, mix(P.a, P.deep, 0.3));
      g.pop();
      g.text('¡PRODUCE!', W * 0.26, H * 0.42 + 130, { size: 15, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });

      pops.forEach((q) => {
        c.save(); c.globalAlpha = 1 - q.t / 0.9;
        g.text(q.v, q.x, q.y, { size: 20, align: 'center', weight: 900, color: P.c });
        c.restore();
      });

      /* mejoras */
      g.text('MEJORAS', W * 0.52, 92, { size: 12, color: P.dim, weight: 800, letterSpacing: 2 });
      UPGR.forEach((u, i) => {
        const x = W * 0.52, y = 110 + i * 66;
        const cst = cost(u);
        const can = parts >= cst;
        const hov2 = p.x > x && p.x < x + 380 && p.y > y && p.y < y + 58;
        g.rrect(x, y, 380, 58, 12, hov2 && can ? alpha(P.a, 0.22) : 'rgba(255,255,255,.05)');
        g.rrectStroke(x, y, 380, 58, 12, can ? alpha(P.a, 0.45) : alpha(P.ink, 0.08), 1.5);
        g.text(u.ico, x + 28, y + 38, { size: 24, align: 'center' });
        g.text(u.n, x + 54, y + 26, { size: 15, weight: 800, color: can ? P.ink : alpha(P.ink, 0.45) });
        g.text(u.d + (owned[u.id] ? '  ·  ×' + owned[u.id] : ''), x + 54, y + 45,
          { size: 12.5, color: P.dim, weight: 600 });
        g.text(fmt(cst), x + 360, y + 36, { size: 15, align: 'right', weight: 900, color: can ? P.c : '#ff4d6d', mono: true });
      });

      const hovP = p.y > H - 60 && Math.abs(p.x - W * 0.26) < 110;
      const gain = Math.floor(Math.sqrt(total / 50000));
      g.rrect(W * 0.26 - 110, H - 56, 220, 42, 12, hovP && gain > 0 ? alpha(P.c, 0.4) : 'rgba(255,255,255,.07)');
      g.text('⭐ Prestigio +' + gain, W * 0.26, H - 29, {
        size: 15, align: 'center', weight: 800, color: gain > 0 ? P.ink : alpha(P.ink, 0.4) });

      if (msgT > 0) E.ui.title(msg, W * 0.26, H * 0.72, { size: 22 });
    },
  };
});
