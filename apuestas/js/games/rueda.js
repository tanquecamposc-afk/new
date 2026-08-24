/* ===========================================================
   games/rueda.js — game shows de rueda
   (Crazy Time, Monopoly Live, Mega Wheel, Candyland)
   Rueda con las casillas repartidas como en el estudio real,
   flapper que golpea cada casilla y apuestas múltiples.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.rueda = function (root, juego) {
  const segs = juego.cfg.segmentos;
  const total = segs.reduce((a, s) => a + s.p, 0);
  const RTP = 0.96;
  const pago = s => Math.round(RTP * total / s.p * 100) / 100;
  const COLORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

  /* Las casillas se reparten alternadas para que no queden bloques del mismo color. */
  const casillas = [];
  segs.forEach((s, i) => { for (let k = 0; k < s.p; k++) casillas.push(i); });
  const orden = repartir(casillas);
  function repartir(arr) {
    // Barajar y luego separar repetidos consecutivos, como una rueda real.
    const a = K.mezcla(arr);
    for (let i = 1; i < a.length; i++) {
      if (a[i] === a[i - 1]) {
        for (let j = 0; j < a.length; j++) {
          if (a[j] !== a[i] && a[(j + 1) % a.length] !== a[i] && a[(j - 1 + a.length) % a.length] !== a[i]) {
            [a[i], a[j]] = [a[j], a[i]];
            break;
          }
        }
      }
    }
    return a;
  }

  let fichaSel = 5, apuestas = {}, girando = false, angulo = 0;
  const puesto = () => Object.values(apuestas).reduce((a, b) => a + b, 0);

  /* ---------------- panel ---------------- */
  const sTotal = K.G.stat('Apostado', K.sol(0));
  const sUlt = K.G.stat('Última rueda', '—');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));
  let neto = 0;

  const fichas = K.el('div', { class: 'fichas' });
  [1, 5, 25, 100].forEach(v => {
    const f = K.el('button', { class: 'ficha c' + v + (v === fichaSel ? ' on' : ''), text: v });
    f.onclick = () => { fichaSel = v; K.$$('.ficha', fichas).forEach(x => x.classList.toggle('on', Number(x.textContent) === v)); };
    fichas.appendChild(f);
  });

  const btn = K.el('button', { class: 'btn bloque', text: 'Girar la rueda' });
  const btnLimpiar = K.el('button', { class: 'btn sec chico', text: 'Limpiar fichas' });
  const panel = K.el('div', { class: 'panel-apuesta' }, [
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Ficha' }), fichas]),
    btn, btnLimpiar,
    K.el('div', { class: 'separador' }),
    sTotal.fila, sUlt.fila, sNeto.fila
  ]);

  /* ---------------- rueda ---------------- */
  const cv = K.el('canvas');
  const lienzo = K.el('div', { class: 'rueda-lienzo' }, [cv]);
  const ctx = cv.getContext('2d');

  function dimensionar() {
    const r = lienzo.getBoundingClientRect();
    const lado = Math.max(260, Math.min(r.width, r.height || 330));
    cv.width = lado * devicePixelRatio;
    cv.height = lado * devicePixelRatio;
  }

  function pintar() {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    const cx = W / 2, cy = H / 2 + 8 * p, R = Math.min(W, H) / 2 - 16 * p;
    ctx.clearRect(0, 0, W, H);
    const paso = Math.PI * 2 / orden.length;

    // aro exterior
    ctx.beginPath(); ctx.arc(cx, cy, R + 6 * p, 0, 7);
    const aro = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    aro.addColorStop(0, '#3b2c14'); aro.addColorStop(.5, '#8a6a2e'); aro.addColorStop(1, '#2a1f0e');
    ctx.fillStyle = aro; ctx.fill();

    orden.forEach((idx, i) => {
      const a0 = angulo + i * paso - Math.PI / 2, a1 = a0 + paso;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      const base = COLORES[idx % COLORES.length];
      ctx.fillStyle = base;
      ctx.globalAlpha = apuestas[idx] ? 1 : .62;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(10,14,22,.55)';
      ctx.lineWidth = 1 * p;
      ctx.stroke();

      // etiqueta corta en el borde
      const am = a0 + paso / 2;
      const et = segs[idx].l;
      ctx.save();
      ctx.translate(cx + Math.cos(am) * (R - 16 * p), cy + Math.sin(am) * (R - 16 * p));
      ctx.rotate(am + Math.PI / 2);
      ctx.fillStyle = 'rgba(10,12,18,.9)';
      ctx.font = '900 ' + ((et.length > 3 ? 7.5 : 11) * p) + 'px Archivo, system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(et.length > 9 ? et.slice(0, 8) + '…' : et, 0, 0);
      ctx.restore();
    });

    // centro
    ctx.beginPath(); ctx.arc(cx, cy, R * .3, 0, 7);
    const hub = ctx.createRadialGradient(cx - R * .08, cy - R * .08, R * .04, cx, cy, R * .3);
    hub.addColorStop(0, '#26324a'); hub.addColorStop(1, '#0d1424');
    ctx.fillStyle = hub; ctx.fill();
    ctx.strokeStyle = '#8a6a2e'; ctx.lineWidth = 2 * p; ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 ' + (11 * p) + 'px Archivo, system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(juego.nom.length > 16 ? juego.nom.slice(0, 15) + '…' : juego.nom, cx, cy);

    // flapper: se dobla según lo cerca que esté del borde de la casilla
    const frac = ((angulo / paso) % 1 + 1) % 1;
    const dobla = Math.sin(frac * Math.PI) * 0.34;
    ctx.save();
    ctx.translate(cx, cy - R - 4 * p);
    ctx.rotate(dobla);
    ctx.beginPath();
    ctx.moveTo(-9 * p, -10 * p);
    ctx.lineTo(9 * p, -10 * p);
    ctx.lineTo(0, 20 * p);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8 * p;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  }

  /* ---------------- apuestas ---------------- */
  const opciones = K.el('div', { class: 'opciones' });
  const botones = segs.map((s, i) => {
    const b = K.el('button', {
      onclick: () => {
        if (girando) return;
        apuestas[i] = K.round2((apuestas[i] || 0) + fichaSel);
        refrescar();
      }
    }, [
      K.el('span', { html: `<span class="punto-color" style="background:${COLORES[i % COLORES.length]}"></span>${K.esc(s.l)}` }),
      K.el('i', { text: pago(s) + '× · ' + K.pct(s.p / total, 0) }),
      K.el('span', { class: 'puesto', style: 'display:none' })
    ]);
    opciones.appendChild(b);
    return b;
  });

  function refrescar() {
    botones.forEach((b, i) => {
      b.classList.toggle('on', !!apuestas[i]);
      const etq = b.querySelector('.puesto');
      if (etq) {
        etq.textContent = apuestas[i] ? 'S/ ' + apuestas[i] : '';
        etq.style.display = apuestas[i] ? '' : 'none';
      }
    });
    sTotal.set(K.sol(puesto()));
    btn.textContent = puesto() > 0 ? 'Girar por ' + K.sol(puesto()) : 'Girar la rueda';
    pintar();
  }

  const mensaje = K.el('div', { class: 'resultado' });
  const histBar = K.el('div', { class: 'historial-mult' });
  function pintarHist() {
    histBar.innerHTML = '';
    K.G.historial(juego.id).slice(0, 14).forEach(l =>
      histBar.appendChild(K.el('span', { class: 'pill ' + (l.length > 3 ? 'alto' : 'medio'), text: l })));
  }

  const suave = t => 1 - Math.pow(1 - t, 3.6);

  async function girar() {
    if (girando) return;
    const apostado = puesto();
    if (apostado <= 0) { K.aviso('Pon fichas en al menos un resultado.', 'warn'); return; }
    if (!K.G.apostar(apostado)) return;
    girando = true; btn.disabled = true; mensaje.textContent = '';

    const destino = K.entero(0, orden.length - 1);
    const paso = Math.PI * 2 / orden.length;
    // El flapper está arriba: la casilla ganadora tiene que quedar justo ahí.
    const objetivo = -(destino + 0.5) * paso + Math.PI * 2 * 7;
    const inicio = angulo % (Math.PI * 2);
    const DUR = 5000, t0 = performance.now();

    await new Promise(fin => {
      const paso2 = ahora => {
        const t = Math.min(1, (ahora - t0) / DUR);
        angulo = inicio + (objetivo - inicio) * suave(t);
        pintar();
        if (t < 1) requestAnimationFrame(paso2); else fin();
      };
      requestAnimationFrame(paso2);
    });

    const idx = orden[destino];
    const s = segs[idx];
    sUlt.set(s.l);
    const monto = apuestas[idx] || 0;
    let premio = 0;
    if (monto > 0) {
      premio = K.round2(monto * pago(s));
      K.G.pagar(premio, juego.nom + ' · ' + s.l);
      mensaje.innerHTML = `<span style="color:var(--verde-2)">Salió ${K.esc(s.l)} · cobras ${K.sol(premio)}</span>`;
      K.aviso(K.esc(juego.nom) + ': salió ' + K.esc(s.l) + ' · ' + K.sol(premio), 'ok');
    } else {
      mensaje.innerHTML = `<span style="color:var(--tenue)">Salió ${K.esc(s.l)} · no tenías fichas ahí</span>`;
    }
    neto = K.round2(neto + premio - apostado);
    sNeto.set(K.sol(neto));
    K.G.anotar(juego.id, s.l);
    pintarHist();
    girando = false; btn.disabled = false;
  }

  btn.onclick = girar;
  btnLimpiar.onclick = () => { if (!girando) { apuestas = {}; refrescar(); } };

  const zona = K.el('div', { class: 'zona-juego' }, [lienzo, histBar, mensaje, opciones]);
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.el('div', {
    class: 'info-juego', html: `<h4>De la frecuencia al pago</h4>
    La rueda tiene <b>${orden.length}</b> casillas repartidas entre ${segs.length} resultados, sin dos
    iguales pegadas. El pago de cada uno sale de <code>0.96 × ${orden.length} / casillas del resultado</code>,
    así que todas las opciones devuelven el mismo <b>96%</b> a la larga. Apostar al segmento raro solo
    cambia la varianza, nunca el valor esperado. Puedes cubrir varios resultados a la vez, como en el
    estudio real: eso baja la varianza pero no sube el retorno.` }));

  dimensionar(); refrescar(); pintarHist();
  const ro = new ResizeObserver(() => { dimensionar(); pintar(); });
  ro.observe(lienzo);
  return () => ro.disconnect();
};
