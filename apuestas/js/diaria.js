/* ===========================================================
   diaria.js — ruleta diaria de recompensas
   Un giro gratis cada 20 horas. La racha de días seguidos
   suma un bonus, hasta +50%.
   =========================================================== */
K.Diaria = (() => {
  const ESPERA = 20 * 3600 * 1000;          // 20 horas entre giros
  const PREMIOS = [
    { monto: 25, peso: 26, color: '#3b82f6' },
    { monto: 50, peso: 22, color: '#22c55e' },
    { monto: 75, peso: 16, color: '#f59e0b' },
    { monto: 100, peso: 14, color: '#ec4899' },
    { monto: 200, peso: 10, color: '#8b5cf6' },
    { monto: 350, peso: 6, color: '#14b8a6' },
    { monto: 600, peso: 4, color: '#ef4444' },
    { monto: 1500, peso: 2, color: '#fbbf24' }
  ];
  const PESO_TOTAL = PREMIOS.reduce((a, p) => a + p.peso, 0);

  const estado = () => K.Wallet.est().diaria || (K.Wallet.est().diaria = { ultimo: 0, racha: 0, total: 0 });
  const restante = () => Math.max(0, estado().ultimo + ESPERA - Date.now());
  const disponible = () => restante() === 0;
  const bonusRacha = () => Math.min(0.5, Math.max(0, estado().racha - 1) * 0.1);

  const reloj = ms => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms % 3600000 / 60000);
    const s = Math.floor(ms % 60000 / 1000);
    return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min ${s} s` : `${s} s`;
  };

  function sortear() {
    let r = Math.random() * PESO_TOTAL;
    for (let i = 0; i < PREMIOS.length; i++) { r -= PREMIOS[i].peso; if (r <= 0) return i; }
    return 0;
  }

  /* ---------------- interfaz ---------------- */
  function abrir() {
    const cuerpo = K.el('div', { class: 'diaria' });
    const d = estado();

    const cv = K.el('canvas');
    const lienzo = K.el('div', { class: 'diaria-lienzo' }, [cv]);
    const ctx = cv.getContext('2d');
    let angulo = 0, girando = false;

    const info = K.el('div', { class: 'diaria-info' });
    const btn = K.el('button', { class: 'btn bloque grande' });
    const mensaje = K.el('div', { class: 'diaria-mensaje' });

    const tabla = K.el('div', { class: 'diaria-tabla' });
    PREMIOS.forEach(p => tabla.appendChild(K.el('div', {
      class: 'premio-pill',
      html: `<span class="punto-color" style="background:${p.color}"></span>
             <b>${K.sol(p.monto)}</b><i>${(p.peso / PESO_TOTAL * 100).toFixed(0)}%</i>`
    })));

    function refrescarInfo() {
      const dd = estado();
      info.innerHTML = `
        <div class="kpi"><span class="et">Racha de días</span><span class="vl">${dd.racha}</span></div>
        <div class="kpi"><span class="et">Bonus por racha</span><span class="vl pos">+${(bonusRacha() * 100).toFixed(0)}%</span></div>
        <div class="kpi"><span class="et">Cobrado en total</span><span class="vl">${K.sol(dd.total)}</span></div>`;
      if (disponible()) {
        btn.disabled = false;
        btn.textContent = 'Girar la ruleta diaria';
      } else {
        btn.disabled = true;
        btn.textContent = 'Vuelve en ' + reloj(restante());
      }
    }

    function dimensionar() {
      const r = lienzo.getBoundingClientRect();
      const lado = Math.max(240, Math.min(r.width, 330));
      cv.width = lado * devicePixelRatio;
      cv.height = lado * devicePixelRatio;
    }

    function pintar() {
      const W = cv.width, H = cv.height, p = devicePixelRatio;
      const cx = W / 2, cy = H / 2, R = W / 2 - 10 * p;
      const paso = Math.PI * 2 / PREMIOS.length;
      ctx.clearRect(0, 0, W, H);

      // aro
      ctx.beginPath(); ctx.arc(cx, cy, R + 5 * p, 0, 7);
      const aro = ctx.createLinearGradient(0, cy - R, 0, cy + R);
      aro.addColorStop(0, '#4a3410'); aro.addColorStop(.5, '#c08a2e'); aro.addColorStop(1, '#3a2810');
      ctx.fillStyle = aro; ctx.fill();

      PREMIOS.forEach((pr, i) => {
        const a0 = angulo + i * paso - Math.PI / 2, a1 = a0 + paso;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a0, a1);
        ctx.closePath();
        ctx.fillStyle = pr.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,12,20,.5)';
        ctx.lineWidth = 1.5 * p;
        ctx.stroke();

        const am = a0 + paso / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(am) * R * 0.66, cy + Math.sin(am) * R * 0.66);
        // El texto se gira con la casilla, pero nunca queda cabeza abajo.
        const dir = ((am % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        ctx.rotate(am + Math.PI / 2 + (dir > Math.PI / 2 && dir < Math.PI * 1.5 ? Math.PI : 0));
        ctx.fillStyle = 'rgba(9,12,18,.92)';
        ctx.font = '900 ' + (13 * p) + 'px Archivo, system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pr.monto, 0, 0);
        ctx.font = '700 ' + (8.5 * p) + 'px Barlow, system-ui';
        ctx.fillText('soles', 0, 12 * p);
        ctx.restore();
      });

      // centro
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.24, 0, 7);
      const hub = ctx.createRadialGradient(cx - R * .06, cy - R * .07, R * .03, cx, cy, R * .24);
      hub.addColorStop(0, '#2a3550'); hub.addColorStop(1, '#0b1220');
      ctx.fillStyle = hub; ctx.fill();
      ctx.strokeStyle = '#c08a2e'; ctx.lineWidth = 2 * p; ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 ' + (11 * p) + 'px Archivo, system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('DIARIA', cx, cy);

      // aguja
      ctx.beginPath();
      ctx.moveTo(cx - 9 * p, cy - R - 8 * p);
      ctx.lineTo(cx + 9 * p, cy - R - 8 * p);
      ctx.lineTo(cx, cy - R + 14 * p);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8 * p;
      ctx.fill(); ctx.shadowBlur = 0;
    }

    const suave = t => 1 - Math.pow(1 - t, 3.5);

    async function girar() {
      if (girando || !disponible()) return;
      girando = true;
      btn.disabled = true;
      btn.textContent = 'Girando…';
      mensaje.textContent = '';

      const idx = sortear();
      const paso = Math.PI * 2 / PREMIOS.length;
      const objetivo = -(idx + 0.5) * paso + Math.PI * 2 * 6;
      const inicio = angulo % (Math.PI * 2);
      const DUR = 4300, t0 = performance.now();

      await new Promise(fin => {
        const paso2 = ahora => {
          const t = Math.min(1, (ahora - t0) / DUR);
          angulo = inicio + (objetivo - inicio) * suave(t);
          pintar();
          if (t < 1) requestAnimationFrame(paso2); else fin();
        };
        requestAnimationFrame(paso2);
      });

      const dd = estado();
      const seguido = dd.ultimo > 0 && Date.now() - dd.ultimo < ESPERA * 2.4;
      dd.racha = seguido ? dd.racha + 1 : 1;
      dd.ultimo = Date.now();

      const base = PREMIOS[idx].monto;
      const bonus = K.round2(base * bonusRacha());
      const total = K.round2(base + bonus);
      dd.total = K.round2(dd.total + total);

      K.Wallet.mover(total, 'premio', 'Ruleta diaria' + (bonus > 0 ? ' (racha +' + (bonusRacha() * 100).toFixed(0) + '%)' : ''));
      K.Wallet.persistir();

      mensaje.innerHTML = `<span class="ganado">${K.sol(total)}</span>
        <span class="detalle">Premio ${K.sol(base)}${bonus > 0 ? ' + ' + K.sol(bonus) + ' de racha' : ''} ·
        vuelve mañana para no cortar la racha</span>`;
      K.aviso('Ruleta diaria: ganaste ' + K.sol(total), 'ok');
      girando = false;
      refrescarInfo();
      K.bus.emit('diaria');
    }

    btn.onclick = girar;

    cuerpo.appendChild(K.el('div', { class: 'diaria-layout' }, [
      lienzo,
      K.el('div', { class: 'diaria-panel' }, [
        K.el('p', {
          class: 'diaria-texto',
          text: 'Un giro gratis cada 20 horas. Cada día seguido que vuelvas suma un 10% extra al premio, hasta un máximo de +50%.'
        }),
        info, btn, mensaje, tabla
      ])
    ]));

    K.modal('Ruleta diaria', cuerpo, 'recompensa gratuita');
    refrescarInfo();
    dimensionar(); pintar();
    const it = setInterval(() => {
      if (!document.body.contains(cuerpo)) { clearInterval(it); return; }
      if (!girando) refrescarInfo();
    }, 1000);
    const ro = new ResizeObserver(() => { dimensionar(); pintar(); });
    ro.observe(lienzo);
  }

  return { abrir, disponible, restante, reloj, PREMIOS };
})();
