/* Mahjong Solitario — retira parejas de fichas libres en un tablero de varias capas. */
NX.game('mahjong-solitario', {
  w: 900, h: 640, pal: 'royal',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const TW = 54, TH = 70, DZ = 7;

  const FACES = ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏',
                 '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘',
                 '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡',
                 '🀀', '🀁', '🀂', '🀃', '🀄', '🀅', '🀆', '🀫', '🀢'];

  let tiles, sel, left, t, over, hints, shuffles, msg, msgT;

  /* Distribución tipo "tortuga" simplificada por capas. */
  const LAYOUT = [
    { z: 0, rows: [[0, 12], [1, 10], [2, 8], [3, 8], [4, 10], [5, 12]] },
    { z: 1, rows: [[1, 6], [2, 6], [3, 6], [4, 6]] },
    { z: 2, rows: [[2, 4], [3, 4]] },
    { z: 3, rows: [[2, 2], [3, 2]] },
  ];

  function build() {
    const slots = [];
    LAYOUT.forEach((L) => {
      L.rows.forEach(([r, n]) => {
        for (let i = 0; i < n; i++) {
          slots.push({ x: i - n / 2, y: r - 2.5, z: L.z });
        }
      });
    });
    /* nº par de fichas */
    if (slots.length % 2) slots.pop();
    const pairs = slots.length / 2;
    const faces = [];
    for (let i = 0; i < pairs; i++) faces.push(i % FACES.length, i % FACES.length);
    E.rng.shuffle(faces);
    tiles = slots.map((s, i) => Object.assign({}, s, { face: faces[i], gone: false, i, pop: 0 }));
  }

  function reset() {
    build();
    sel = null; left = tiles.length; t = 0; over = false; hints = 3; shuffles = 3;
    msg = ''; msgT = 0;
    hud();
  }
  function hud() { E.api.hud({ Fichas: left, Pistas: hints, Barajar: shuffles, Tiempo: M.fmtTime(t) }); }

  function px(tile) { return W / 2 + tile.x * TW + tile.z * DZ; }
  function py(tile) { return H * 0.46 + tile.y * TH * 0.72 - tile.z * DZ; }

  function free(tile) {
    if (tile.gone) return false;
    /* bloqueada si hay una ficha encima */
    const above = tiles.some((o) => !o.gone && o.z === tile.z + 1 &&
      Math.abs(o.x - tile.x) < 1 && Math.abs(o.y - tile.y) < 1);
    if (above) return false;
    const leftB = tiles.some((o) => !o.gone && o.z === tile.z && Math.abs(o.y - tile.y) < 0.6 &&
      Math.abs(o.x - (tile.x - 1)) < 0.4);
    const rightB = tiles.some((o) => !o.gone && o.z === tile.z && Math.abs(o.y - tile.y) < 0.6 &&
      Math.abs(o.x - (tile.x + 1)) < 0.4);
    return !leftB || !rightB;
  }

  function findPair() {
    const fr = tiles.filter(free);
    for (let i = 0; i < fr.length; i++) {
      for (let j = i + 1; j < fr.length; j++) {
        if (fr[i].face === fr[j].face) return [fr[i], fr[j]];
      }
    }
    return null;
  }

  function shuffleRest() {
    if (shuffles <= 0) { E.sfx('error'); return; }
    shuffles--;
    const alive2 = tiles.filter((q) => !q.gone);
    const faces = alive2.map((q) => q.face);
    E.rng.shuffle(faces);
    alive2.forEach((q, i) => { q.face = faces[i]; });
    E.sfx('swoosh');
    msg = 'Fichas barajadas'; msgT = 1.4;
    hud();
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      tiles.forEach((q) => { if (q.pop > 0) q.pop -= dt * 3; });
      if (!over) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }

      const p = E.input.pointer;
      if (!p.pressed || over) return;
      if (p.y > H - 56) {
        if (Math.abs(p.x - 90) < 60) {
          if (hints > 0) {
            const pair = findPair();
            if (pair) { hints--; pair.forEach((q) => { q.pop = 1.6; }); E.sfx('chime'); hud(); }
            else { msg = 'No quedan parejas'; msgT = 1.6; E.sfx('error'); }
          } else E.sfx('error');
          return;
        }
        if (Math.abs(p.x - 220) < 60) { shuffleRest(); return; }
      }

      /* de arriba hacia abajo para respetar las capas */
      const sorted = tiles.filter((q) => !q.gone).sort((a, b) => b.z - a.z || b.y - a.y);
      const hitT = sorted.find((q) => p.x > px(q) - TW / 2 && p.x < px(q) + TW / 2 &&
        p.y > py(q) - TH / 2 && p.y < py(q) + TH / 2);
      if (!hitT) return;
      if (!free(hitT)) { E.sfx('error'); msg = 'Esa ficha está bloqueada'; msgT = 1.2; return; }
      if (sel === hitT) { sel = null; E.sfx('tap'); return; }
      if (!sel) { sel = hitT; E.sfx('tap'); return; }
      if (sel.face === hitT.face) {
        sel.gone = hitT.gone = true;
        left -= 2;
        E.sfx('coin'); E.camera.kick(2);
        [sel, hitT].forEach((q) => E.particles.burst(px(q), py(q), 8, { col: [P.c], speed1: 140, add: true }));
        sel = null;
        hud();
        if (left === 0) {
          over = true;
          E.sfx('win');
          setTimeout(() => E.api.win({
            score: Math.max(0, 20000 - Math.round(t * 20) + hints * 500),
            title: '¡Tablero despejado!',
            msg: M.fmtTime(t) + ' con ' + hints + ' pistas sin usar',
            stats: { Tiempo: M.fmtTime(t) },
          }), 600);
        } else if (!findPair()) {
          msg = 'Sin parejas posibles: baraja'; msgT = 2.4;
          E.sfx('alarm');
        }
      } else { sel = hitT; E.sfx('tap'); }
    },

    draw(g) {
      const c = g.ctx;
      g.bgTurf(E.t, mix(P.bg, P.d, 0.5), 0.03, 50);
      g.text('MAHJONG SOLITARIO', W / 2, 40, { size: 20, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });

      const sorted = tiles.filter((q) => !q.gone).sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
      sorted.forEach((q) => {
        const x = px(q) - TW / 2, y = py(q) - TH / 2;
        const isFree = free(q);
        const isSel = sel === q;
        const hint = q.pop > 0;
        c.save();
        c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
        g.rrect(x + 4, y + 4, TW, TH, 7, mix('#8f9dbd', P.deep, 0.5));
        g.rrect(x, y, TW, TH, 7, isSel ? P.c : hint ? mix(P.c, '#fff', 0.4) : '#eef2fa');
        c.restore();
        g.rrect(x, y, TW, TH * 0.28, 7, alpha('#ffffff', 0.55));
        if (!isFree) { c.save(); c.globalAlpha = 0.35; g.rrect(x, y, TW, TH, 7, '#0b1220'); c.restore(); }
        g.text(FACES[q.face % FACES.length], x + TW / 2, y + TH * 0.68, {
          size: 30, align: 'center', color: isSel ? '#0d1220' : '#2b3a55',
        });
        if (isSel) g.rrectStroke(x, y, TW, TH, 7, P.ink, 2.5);
      });

      const btn = (x, label, on) => {
        const hov = E.input.pointer.y > H - 56 && Math.abs(E.input.pointer.x - x) < 60;
        g.rrect(x - 60, H - 52, 120, 40, 11, hov && on ? alpha(P.a, 0.35) : 'rgba(255,255,255,.08)');
        g.text(label, x, H - 26, { size: 14, align: 'center', weight: 800, color: on ? P.ink : alpha(P.ink, 0.35) });
      };
      btn(90, '💡 Pista (' + hints + ')', hints > 0);
      btn(220, '🔀 Barajar (' + shuffles + ')', shuffles > 0);

      if (msgT > 0) E.ui.title(msg, W / 2, 76, { size: 22 });
      E.particles.draw(g);
    },
  };
});
