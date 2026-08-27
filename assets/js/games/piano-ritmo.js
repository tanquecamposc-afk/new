/* Piano Ritmo — cuatro carriles y melodías generadas en tiempo real. */
NX.game('piano-ritmo', {
  w: 620, h: 700, pal: 'royal',
  controls: { buttons: [{ k: 'd', label: 'D' }, { k: 'f', label: 'F' }, { k: 'j', label: 'J' }, { k: 'k', label: 'K' }] },
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const LANES = 4, LW = Math.floor((W - 60) / LANES), OX = 30;
  const HIT_Y = H - 130;
  const KEYS = ['d', 'f', 'j', 'k'];
  const COLS = ['#22e0ff', '#4ade80', '#ffd45e', '#ff4d6d'];
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];

  let notes, spawnT, score, combo, best, miss, hitTxt, t, alive, speed, lanePulse, acc, hits, totalN, bpm;

  function reset() {
    notes = []; spawnT = 0.6; score = 0; combo = 0; best = 0; miss = 0; hitTxt = null;
    t = 0; alive = true; speed = 330; lanePulse = [0, 0, 0, 0]; hits = 0; totalN = 0; bpm = 110;
    hud();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Combo: combo, Fallos: miss + '/12',
      Precisión: totalN ? Math.round(hits * 100 / totalN) + '%' : '—' });
  }

  function spawn() {
    const n = E.rng.bool(0.22) ? 2 : 1;
    const lanes = E.rng.shuffle([0, 1, 2, 3]).slice(0, n);
    lanes.forEach((l) => {
      notes.push({ lane: l, y: -40, note: 60 + SCALE[E.rng.int(SCALE.length)], hit: false, t: 0 });
      totalN++;
    });
  }

  function judge(lane) {
    lanePulse[lane] = 1;
    let bestN = null, bd = 1e9;
    notes.forEach((n) => {
      if (n.lane !== lane || n.hit) return;
      const d = Math.abs(n.y - HIT_Y);
      if (d < bd) { bd = d; bestN = n; }
    });
    if (!bestN || bd > 72) {
      combo = 0;
      E.sfx('error');
      hitTxt = { txt: 'Fallo', col: '#ff4d6d', t: 0 };
      hud();
      return;
    }
    bestN.hit = true;
    hits++;
    const quality = bd < 20 ? 2 : bd < 44 ? 1 : 0;
    combo++;
    best = Math.max(best, combo);
    const pts = [80, 160, 300][quality] * Math.min(8, 1 + Math.floor(combo / 8));
    score += pts;
    E.audio.tone({ type: 'triangle', freq: E.audio.N(bestN.note), dur: 0.4, vol: 0.18 });
    E.audio.tone({ type: 'sine', freq: E.audio.N(bestN.note + 12), dur: 0.3, vol: 0.08, delay: 0.02 });
    hitTxt = { txt: ['Bien', 'Genial', '¡PERFECTO!'][quality], col: [P.dim, P.a, P.c][quality], t: 0 };
    E.particles.burst(OX + bestN.lane * LW + LW / 2, HIT_Y, 8 + quality * 6,
      { col: [COLS[bestN.lane], '#fff'], speed1: 200, add: true });
    if (quality === 2) E.camera.kick(2);
    hud();
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      speed = 330 + t * 3.4;
      bpm = 110 + t * 0.6;
      if (hitTxt) { hitTxt.t += dt; if (hitTxt.t > 0.7) hitTxt = null; }
      lanePulse = lanePulse.map((v) => Math.max(0, v - dt * 4));

      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.24, 60 / bpm * 0.8); spawn(); }

      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.y += speed * dt;
        if (n.hit) { n.t += dt; if (n.t > 0.3) notes.splice(i, 1); continue; }
        if (n.y > HIT_Y + 80) {
          notes.splice(i, 1);
          miss++; combo = 0;
          E.sfx('thud'); E.camera.flash('#ff4d6d', 0.14);
          hud();
          if (miss >= 12) {
            alive = false;
            E.sfx('lose');
            setTimeout(() => E.api.over({
              score, msg: 'Mejor combo ' + best + ' · precisión ' + (totalN ? Math.round(hits * 100 / totalN) : 0) + '%',
              stats: { 'Mejor combo': best, Notas: hits },
            }), 500);
            return;
          }
        }
      }

      KEYS.forEach((k, i) => { if (E.input.pressed(k)) judge(i); });
      if (E.input.pressed('1')) judge(0);
      if (E.input.pressed('2')) judge(1);
      if (E.input.pressed('3')) judge(2);
      if (E.input.pressed('4')) judge(3);
      const p = E.input.pointer;
      if (p.pressed) {
        const l = Math.floor((p.x - OX) / LW);
        if (l >= 0 && l < LANES) judge(l);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.32), P.deep);

      for (let i = 0; i < LANES; i++) {
        const x = OX + i * LW;
        g.rect(x + 2, 0, LW - 4, H, alpha(P.deep, 0.55));
        g.rect(x + 2, 0, 2, H, alpha(COLS[i], 0.16));
        if (lanePulse[i] > 0) {
          c.save(); c.globalAlpha = lanePulse[i] * 0.3;
          g.rect(x + 2, 0, LW - 4, H, COLS[i]);
          c.restore();
        }
      }

      g.rect(OX, HIT_Y - 3, LW * LANES, 3, alpha(P.ink, 0.6));

      notes.forEach((n) => {
        const x = OX + n.lane * LW + 8;
        const w = LW - 16;
        if (n.hit) {
          c.save(); c.globalAlpha = 1 - n.t / 0.3;
          g.rrect(x - n.t * 20, HIT_Y - 14, w + n.t * 40, 28, 9, COLS[n.lane]);
          c.restore();
          return;
        }
        g.rrect(x, n.y - 14, w, 28, 9, COLS[n.lane]);
        g.rrect(x, n.y - 14, w, 10, 9, alpha('#ffffff', 0.3));
      });

      for (let i = 0; i < LANES; i++) {
        const x = OX + i * LW + 8;
        const on = lanePulse[i] > 0;
        g.rrect(x, HIT_Y + 10, LW - 16, 62, 12, on ? COLS[i] : alpha(P.ink, 0.1));
        g.text(KEYS[i].toUpperCase(), x + (LW - 16) / 2, HIT_Y + 50, {
          size: 22, align: 'center', weight: 900, color: on ? '#0d1220' : P.dim });
      }

      if (hitTxt) {
        c.save(); c.globalAlpha = 1 - hitTxt.t / 0.7;
        g.text(hitTxt.txt, W / 2, HIT_Y - 60, { size: 26, align: 'center', weight: 900, color: hitTxt.col });
        c.restore();
      }
      if (combo > 3) {
        g.text(combo, W / 2, 90, { size: 44, align: 'center', weight: 900, color: P.c, mono: true,
          shadow: alpha(P.c, 0.4), shadowBlur: 16 });
        g.text('COMBO', W / 2, 112, { size: 11, align: 'center', color: P.dim, weight: 800, letterSpacing: 3 });
      }

      E.particles.draw(g);
      E.ui.hint('D F J K · o toca los carriles', { bottom: 14 });
    },
  };
});
