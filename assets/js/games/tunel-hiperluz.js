/* Túnel Hiperluz — corre por un túnel que acelera y busca el hueco de cada anillo. */
NX.game('tunel-hiperluz', {
  w: 900, h: 620, pal: 'candy',
  controls: { dpad: 'lr' },
  music: { root: 45, scale: 'penta', bpm: 138, mood: 'drive' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CX = W / 2, CY = H / 2;
  const SEG = 12;                        /* sectores de cada anillo */

  let ang, rings, z, speed, score, alive, spawnZ, combo;

  function reset() {
    ang = 0; rings = []; z = 0; speed = 260; score = 0; alive = true; spawnZ = 0; combo = 0;
    for (let i = 0; i < 8; i++) addRing(200 + i * 170);
    hud();
  }
  function hud() { E.api.hud({ Puntos: M.fmtScore(score), Velocidad: Math.round(speed), Anillos: combo }); }

  function addRing(zz) {
    const gap = Math.max(2, 4 - Math.floor(score / 3000));
    rings.push({ z: zz, hole: E.rng.int(SEG), gap, passed: false, hue: E.rng.int(4) });
  }

  const proj = (zz) => {
    const d = Math.max(1, zz - z);
    return { s: 22000 / (d + 90), d };
  };

  reset();

  return {
    update(dt) {
      if (!alive) return;
      speed += dt * 7;
      z += speed * dt;
      score += speed * dt * 0.06;

      let rot = 0;
      if (E.input.down('left')) rot -= 1;
      if (E.input.down('right')) rot += 1;
      const p = E.input.pointer;
      if (p.down) rot += M.clamp((p.x - CX) / 180, -1, 1);
      ang += rot * 3.6 * dt;

      spawnZ = Math.max(spawnZ, z);
      while (rings.length < 9) addRing((rings.length ? rings[rings.length - 1].z : z) + M.clamp(180 - speed * 0.05, 120, 190));

      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        if (!r.passed && r.z - z < 26) {
          r.passed = true;
          const sector = ((Math.round(-ang / (M.TAU / SEG)) % SEG) + SEG) % SEG;
          let ok = false;
          for (let k = 0; k < r.gap; k++) if ((r.hole + k) % SEG === sector) ok = true;
          if (ok) {
            combo++; score += 60 + combo * 4;
            E.sfx('blip', combo % 8);
            E.particles.burst(CX, CY, 8, { col: [P.a, P.c], speed1: 260, life1: 0.4, add: true });
            hud();
          } else {
            alive = false;
            E.sfx('explode'); E.camera.kick(20); E.camera.flash('#ff4d6d', 0.6);
            E.particles.burst(CX, CY, 40, { col: [P.b, P.c, '#fff'], speed1: 420, life1: 1, add: true });
            setTimeout(() => E.api.over({
              score: Math.round(score), msg: combo + ' anillos superados',
              stats: { Anillos: combo, Velocidad: Math.round(speed) },
            }), 650);
            return;
          }
        }
        if (r.z < z - 40) rings.splice(i, 1);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = g.radGrad(CX, CY, 0, 220, [[0, alpha(P.a, 0.18)], [1, alpha(P.a, 0)]]);
      c.fillRect(0, 0, W, H);
      c.restore();

      /* líneas de fuga */
      c.save(); c.strokeStyle = alpha(P.a, 0.12); c.lineWidth = 1;
      for (let i = 0; i < SEG; i++) {
        const a = ang + (i / SEG) * M.TAU;
        c.beginPath(); c.moveTo(CX + Math.cos(a) * 20, CY + Math.sin(a) * 20);
        c.lineTo(CX + Math.cos(a) * 700, CY + Math.sin(a) * 700); c.stroke();
      }
      c.restore();

      const sorted = rings.slice().sort((a, b) => b.z - a.z);
      sorted.forEach((r) => {
        const pr = proj(r.z);
        const rad = pr.s;
        if (rad < 4 || rad > 900) return;
        const alphaK = M.clamp01(1 - pr.d / 1600);
        const col = [P.a, P.b, P.c, P.d][r.hue];
        c.save();
        c.lineWidth = Math.max(2, rad * 0.14);
        c.lineCap = 'butt';
        for (let i = 0; i < SEG; i++) {
          let hole = false;
          for (let k = 0; k < r.gap; k++) if ((r.hole + k) % SEG === i) hole = true;
          if (hole) continue;
          const a0 = ang + (i / SEG) * M.TAU - M.TAU / SEG / 2 + 0.02;
          const a1 = a0 + M.TAU / SEG - 0.04;
          c.strokeStyle = alpha(col, 0.25 + alphaK * 0.75);
          c.beginPath(); c.arc(CX, CY, rad, a0, a1); c.stroke();
        }
        c.restore();
      });

      /* nave del jugador */
      const pa = ang;
      const px = CX + Math.cos(pa) * 0, py = CY;
      g.bloom(px, py, 40, P.c, 0.5);
      g.push(px, py, E.t * 4);
      g.ngon(0, 0, 13, 3, 0, P.ink);
      g.ngon(0, 0, 6, 3, Math.PI, P.c);
      g.pop();
      /* indicador del sector activo */
      const ind = ang;
      g.push(CX, CY, ind);
      g.poly([30, 0, 20, -8, 20, 8], alpha(P.c, 0.9));
      g.pop();

      E.particles.draw(g);
      g.text(M.fmtScore(Math.round(score)), W / 2, 46, {
        size: 30, align: 'center', weight: 900, color: P.ink, mono: true, shadow: alpha(P.a, 0.5), shadowBlur: 18,
      });
      E.ui.hint('← → girar el túnel y apuntar al hueco', { bottom: 16 });
    },
  };
});
