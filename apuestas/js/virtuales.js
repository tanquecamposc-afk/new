/* ===========================================================
   virtuales.js — carreras virtuales
   Una carrera nueva cada minuto: 40 s de apuestas, 18 s de
   carrera y 8 s de resultado. El motor corre siempre, estés o
   no mirando la pestaña, y las apuestas se liquidan solas.
   =========================================================== */
K.Virtuales = (() => {
  const APUESTAS = 40000, CARRERA = 18000, RESULTADO = 9000;
  const MARGEN = 1.14;                       // los virtuales cargan más margen que el deporte real

  const DISCIPLINAS = [
    {
      id: 'caballos', nom: 'Hipódromo Kronos', ic: '🐎', unidad: 'cuerpos',
      pista: '#2f6b3a', nombres: ['Relámpago', 'Doña Vicky', 'Tornado', 'Halcón Negro', 'Pampero',
        'Estrella', 'Rey del Sur', 'Corazón', 'Vendaval', 'Cometa', 'Trueno', 'Amanecer']
    },
    {
      id: 'galgos', nom: 'Canódromo Nocturno', ic: '🐕', unidad: 'cuerpos',
      pista: '#3a3f6b', nombres: ['Flecha', 'Bala', 'Zafiro', 'Rayo', 'Duna', 'Nieve',
        'Chispa', 'Sombra', 'Turbo', 'Lira', 'Fugaz', 'Bora']
    },
    {
      id: 'motos', nom: 'Circuito Velocidad', ic: '🏍️', unidad: 'segundos',
      pista: '#4a4a52', nombres: ['Kawa 7', 'Ducat 3', 'Yama 12', 'Honda 21', 'Aprilia 5', 'KTM 9',
        'Suzu 14', 'BMW 2', 'Triumph 8', 'MV 11', 'Beta 4', 'GasGas 6']
    }
  ];
  const COLORES = ['#ff5500', '#38bdf8', '#22c55e', '#fbbf24', '#a78bfa', '#f43f5e', '#14b8a6', '#f97316'];

  let carrera = null, fase = 'apuestas', finFase = 0, numero = 1;
  let apuestas = [], historial = [], suscriptores = [];

  const t = () => Math.max(0, finFase - Date.now());
  const seg = ms => (ms / 1000).toFixed(ms < 10000 ? 1 : 0);

  /* ---------------- creación de la carrera ---------------- */
  function nueva() {
    const disc = DISCIPLINAS[(numero - 1) % DISCIPLINAS.length];
    const nombres = K.mezcla(disc.nombres.slice()).slice(0, 6);
    const corredores = nombres.map((n, i) => ({
      n, i, color: COLORES[i], fuerza: K.entero(72, 96), box: i + 1
    }));
    /* Probabilidades tipo Plackett-Luce: cada corredor pesa por su fuerza. */
    const pesos = corredores.map(c => Math.pow(c.fuerza / 70, 6));
    const suma = pesos.reduce((a, b) => a + b, 0);
    corredores.forEach((c, i) => {
      c.p = pesos[i] / suma;
      c.cuota = Math.max(1.05, Math.floor(1 / (c.p * MARGEN) * 100) / 100);
      // Top 2: probabilidad aproximada de entrar entre los dos primeros
      c.pTop2 = Math.min(0.95, c.p * 1.85);
      c.cuotaTop2 = Math.max(1.02, Math.floor(1 / (c.pTop2 * (MARGEN - 0.03)) * 100) / 100);
      c.avance = 0;
    });
    carrera = {
      id: numero, disc, corredores,
      distancia: disc.id === 'motos' ? 1200 : disc.id === 'galgos' ? 480 : 1600,
      orden: null, empezada: 0
    };
    numero++;
  }

  /* Resuelve el orden de llegada con las probabilidades reales. */
  function resolverOrden() {
    const restantes = carrera.corredores.slice();
    const orden = [];
    while (restantes.length) {
      const suma = restantes.reduce((a, c) => a + c.p, 0);
      let r = Math.random() * suma;
      let elegido = restantes[restantes.length - 1];
      for (const c of restantes) { r -= c.p; if (r <= 0) { elegido = c; break; } }
      orden.push(elegido);
      restantes.splice(restantes.indexOf(elegido), 1);
    }
    // A cada corredor se le asigna un tiempo de llegada coherente con su puesto.
    orden.forEach((c, pos) => {
      c.puesto = pos + 1;
      c.tiempoFin = 0.86 + pos * K.entero(9, 26) / 1000 + Math.random() * 0.012;
    });
    carrera.orden = orden;
  }

  /* ---------------- apuestas ---------------- */
  function apostar(idx, mercado, monto) {
    if (fase !== 'apuestas') { K.aviso('Las apuestas de esta carrera están cerradas.', 'warn'); return false; }
    const val = K.Wallet.puedeApostar(monto);
    if (!val.ok) { K.aviso(val.razon, 'err'); return false; }
    const c = carrera.corredores[idx];
    const cuota = mercado === 'ganador' ? c.cuota : c.cuotaTop2;
    K.Wallet.apostar(monto, 'Virtuales · ' + carrera.disc.nom + ' #' + carrera.id);
    apuestas.push({ carrera: carrera.id, idx, mercado, monto, cuota, nombre: c.n });
    if (K.Progreso) {
      K.Progreso.registrar('apuesta', { monto, deporte: 'virtuales' });
      K.Progreso.resultado(-monto);
    }
    K.aviso('Apuesta aceptada: ' + K.esc(c.n) + ' a ' + K.dec(cuota), 'ok');
    avisar();
    return true;
  }

  function liquidar() {
    const mias = apuestas.filter(a => a.carrera === carrera.id);
    if (!mias.length) return;
    let total = 0;
    for (const a of mias) {
      const c = carrera.corredores[a.idx];
      const gana = a.mercado === 'ganador' ? c.puesto === 1 : c.puesto <= 2;
      a.resultado = gana ? 'ganada' : 'perdida';
      a.pago = gana ? K.round2(a.monto * a.cuota) : 0;
      total += a.pago;
      if (gana && K.Progreso) K.Progreso.marcar('carreras');
    }
    if (total > 0) {
      K.Wallet.acreditar(total, 'Virtuales · carrera #' + carrera.id);
      if (K.Progreso) K.Progreso.resultado(total);
      K.aviso('Carrera #' + carrera.id + ': cobras ' + K.sol(total), 'ok');
      K.confeti(70);
    } else {
      K.aviso('Carrera #' + carrera.id + ': ganó ' + K.esc(carrera.orden[0].n), 'warn');
    }
  }

  /* ---------------- ciclo ---------------- */
  function ciclo() {
    if (Date.now() < finFase) return;
    if (fase === 'apuestas') {
      resolverOrden();
      carrera.empezada = Date.now();
      fase = 'carrera';
      finFase = Date.now() + CARRERA;
    } else if (fase === 'carrera') {
      carrera.corredores.forEach(c => c.avance = 1 - (c.puesto - 1) * 0.018);
      liquidar();
      historial.unshift({
        id: carrera.id, disc: carrera.disc.ic,
        podio: carrera.orden.slice(0, 3).map(c => c.n)
      });
      if (historial.length > 12) historial.pop();
      fase = 'resultado';
      finFase = Date.now() + RESULTADO;
    } else {
      apuestas = apuestas.filter(a => a.carrera === carrera.id ? false : true);
      nueva();
      fase = 'apuestas';
      finFase = Date.now() + APUESTAS;
    }
    avisar();
  }

  /* Avance de cada corredor durante la carrera, con adelantamientos. */
  function progreso() {
    if (fase !== 'carrera' || !carrera.orden) return;
    const transcurrido = (Date.now() - carrera.empezada) / CARRERA;
    carrera.corredores.forEach(c => {
      const ritmo = 1 / c.tiempoFin;
      // ruido suave para que las posiciones cambien durante la carrera
      const vaiven = Math.sin(transcurrido * 9 + c.i * 1.7) * 0.035 * (1 - transcurrido);
      c.avance = K.clamp(transcurrido * ritmo + vaiven, 0, 1);
    });
  }

  const estado = () => ({ carrera, fase, restante: t(), apuestas, historial });
  const suscribir = fn => { suscriptores.push(fn); return () => { suscriptores = suscriptores.filter(x => x !== fn); }; };
  const avisar = () => suscriptores.forEach(fn => { try { fn(estado()); } catch (e) { /* vista cerrada */ } });

  function iniciar() {
    nueva();
    fase = 'apuestas';
    finFase = Date.now() + APUESTAS;
    setInterval(() => { ciclo(); progreso(); avisar(); }, 250);
  }

  return { iniciar, estado, suscribir, apostar, seg, DISCIPLINAS };
})();

/* ===========================================================
   Vista de las carreras virtuales
   =========================================================== */
K.Virtuales.vista = function (root) {
  root.innerHTML = '';
  const cab = K.el('div', { class: 'barra-sec' });
  cab.innerHTML = `${K.ic('rayo')}<span>Carreras virtuales</span>`;
  const sub = K.el('span', { class: 'sub', text: 'una carrera nueva cada minuto, todo el día' });
  cab.appendChild(sub);
  root.appendChild(cab);

  const cabPista = K.el('div', { class: 'virt-cab' });
  const cv = K.el('canvas', { class: 'virt-lienzo' });
  const ctx = cv.getContext('2d');
  const pista = K.el('div', { class: 'virt-pista' }, [cv]);
  const barra = K.el('div', { class: 'virt-barra' }, [K.el('i')]);
  const panelApuestas = K.el('div', { class: 'virt-apuestas' });
  const misApuestas = K.el('div', { class: 'virt-mias' });
  const hist = K.el('div', { class: 'virt-hist' });

  const montoInp = K.el('input', { type: 'number', min: '1', step: '1', value: '20' });
  const controles = K.el('div', { class: 'virt-controles' }, [
    K.el('label', { text: 'Importe (S/)' }), montoInp,
    K.el('div', { class: 'fila-btns' }, [5, 10, 20, 50].map(v =>
      K.el('button', { text: v, onclick: () => montoInp.value = v })))
  ]);

  root.appendChild(K.el('div', { class: 'tarjeta' }, [
    K.el('h3', { text: 'Pista en directo' }),
    K.el('div', { class: 'cuerpo' }, [cabPista, pista, barra])
  ]));
  root.appendChild(K.el('div', { class: 'tarjeta', style: 'margin-top:14px' }, [
    K.el('h3', { text: 'Apuestas de la carrera' }),
    K.el('div', { class: 'cuerpo' }, [controles, panelApuestas, misApuestas])
  ]));
  root.appendChild(K.el('div', { class: 'tarjeta', style: 'margin-top:14px' }, [
    K.el('h3', { text: 'Últimos resultados' }),
    K.el('div', { class: 'cuerpo' }, [hist])
  ]));
  root.appendChild(K.el('div', {
    class: 'info-juego', html: `<h4>Qué son los virtuales</h4>
    No hay ningún caballo: cada corredor tiene una probabilidad y el resultado se sortea con ella antes
    de que arranque la animación. Por eso una carrera dura un minuto y no hay que esperar a que se juegue
    nada: es la forma más rápida de repetir la apuesta, y por eso las casas los ponen entre partido y
    partido. El margen acá es del <b>14%</b>, casi el triple que en fútbol; se paga por la inmediatez.` }));

  /* ---------------- dibujo ---------------- */
  function dimensionar() {
    const r = pista.getBoundingClientRect();
    cv.width = Math.max(320, r.width) * devicePixelRatio;
    cv.height = 260 * devicePixelRatio;
  }

  function pintar(est) {
    const c = est.carrera;
    if (!c) return;
    const p = devicePixelRatio, W = cv.width, H = cv.height;
    const izq = 40 * p, der = 34 * p;
    const ancho = W - izq - der;
    const carriles = c.corredores.length;
    const alto = (H - 26 * p) / carriles;

    ctx.clearRect(0, 0, W, H);
    const cielo = ctx.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, '#0d1524'); cielo.addColorStop(1, '#070b13');
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);

    // pista
    ctx.fillStyle = c.disc.pista;
    ctx.globalAlpha = .28;
    ctx.fillRect(izq, 12 * p, ancho, H - 26 * p);
    ctx.globalAlpha = 1;
    for (let i = 0; i <= carriles; i++) {
      const y = 12 * p + i * alto;
      ctx.strokeStyle = 'rgba(255,255,255,.09)';
      ctx.lineWidth = 1 * p;
      ctx.beginPath(); ctx.moveTo(izq, y); ctx.lineTo(izq + ancho, y); ctx.stroke();
    }
    // marcas de distancia
    ctx.fillStyle = 'rgba(226,232,240,.35)';
    ctx.font = (9 * p) + 'px Barlow, system-ui';
    ctx.textAlign = 'center';
    for (let i = 1; i < 4; i++) {
      const x = izq + ancho * i / 4;
      ctx.setLineDash([4 * p, 6 * p]);
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.moveTo(x, 12 * p); ctx.lineTo(x, H - 14 * p); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(Math.round(c.distancia * i / 4) + 'm', x, H - 3 * p);
    }
    // meta
    const meta = izq + ancho;
    for (let y = 12 * p; y < H - 14 * p; y += 8 * p) {
      ctx.fillStyle = ((y / (8 * p)) | 0) % 2 ? '#ffffff' : '#111827';
      ctx.fillRect(meta - 6 * p, y, 6 * p, 8 * p);
    }

    // corredores
    c.corredores.forEach((r, i) => {
      const y = 12 * p + i * alto + alto / 2;
      const x = izq + 10 * p + (ancho - 26 * p) * r.avance;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = '700 ' + (10 * p) + 'px Barlow, system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(String(r.box), izq - 6 * p, y + 3 * p);

      ctx.beginPath();
      ctx.ellipse(x - 10 * p, y + 7 * p, 12 * p, 3 * p, 0, 0, 7);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 9 * p, 0, 7);
      ctx.fillStyle = r.color; ctx.fill();
      ctx.font = (13 * p) + 'px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.disc.ic, x, y);
      ctx.textBaseline = 'alphabetic';
    });

    // marcador de puestos durante la carrera
    if (est.fase !== 'apuestas') {
      const orden = est.fase === 'resultado' && c.orden
        ? c.orden.slice()
        : c.corredores.slice().sort((a, b) => b.avance - a.avance);
      ctx.textAlign = 'left';
      ctx.font = '800 ' + (10 * p) + 'px Barlow, system-ui';
      orden.slice(0, 3).forEach((r, i) => {
        ctx.fillStyle = r.color;
        ctx.fillText(`${i + 1}º ${r.n}`, izq + 8 * p, 24 * p + i * 13 * p);
      });
    }
  }

  /* ---------------- interfaz ---------------- */
  function pintarPanel(est) {
    const c = est.carrera;
    if (!c) return;
    const abierto = est.fase === 'apuestas';
    cabPista.innerHTML = `
      <span class="disc">${c.disc.ic} ${K.esc(c.disc.nom)}</span>
      <span class="num">Carrera #${c.id} · ${c.distancia} m</span>
      <span class="estado ${est.fase}">${abierto ? 'Apuestas abiertas · cierran en ' + K.Virtuales.seg(est.restante) + ' s'
        : est.fase === 'carrera' ? 'EN CARRERA' : 'Resultado oficial'}</span>`;
    const total = abierto ? 40000 : est.fase === 'carrera' ? 18000 : 9000;
    barra.firstChild.style.width = (100 - est.restante / total * 100) + '%';
    barra.firstChild.className = est.fase;

    panelApuestas.innerHTML = '';
    c.corredores.forEach((r, i) => {
      const fila = K.el('div', { class: 'virt-fila' + (est.fase !== 'apuestas' && r.puesto === 1 ? ' gano' : '') });
      fila.innerHTML = `
        <span class="box" style="background:${r.color}">${r.box}</span>
        <span class="nom">${K.esc(r.n)}</span>
        <span class="forma">forma ${r.fuerza} · ${K.pct(r.p, 0)}</span>`;
      const bGana = K.el('button', { class: 'cuota' });
      bGana.innerHTML = `<span class="lab">Ganador</span><span class="val">${K.dec(r.cuota)}</span>`;
      bGana.disabled = !abierto;
      bGana.onclick = () => K.Virtuales.apostar(i, 'ganador', Number(montoInp.value) || 0);
      const bTop = K.el('button', { class: 'cuota' });
      bTop.innerHTML = `<span class="lab">Top 2</span><span class="val">${K.dec(r.cuotaTop2)}</span>`;
      bTop.disabled = !abierto;
      bTop.onclick = () => K.Virtuales.apostar(i, 'top2', Number(montoInp.value) || 0);
      fila.appendChild(K.el('div', { class: 'virt-cuotas' }, [bGana, bTop]));
      if (est.fase !== 'apuestas' && r.puesto) {
        fila.appendChild(K.el('span', { class: 'puesto', text: r.puesto + 'º' }));
      }
      panelApuestas.appendChild(fila);
    });

    const mias = est.apuestas.filter(a => a.carrera === c.id);
    misApuestas.innerHTML = mias.length
      ? '<div class="et">Tus apuestas en esta carrera</div>' + mias.map(a =>
          `<div class="virt-mia ${a.resultado || ''}">
            <span>${K.esc(a.nombre)} · ${a.mercado === 'ganador' ? 'ganador' : 'top 2'}</span>
            <span>${K.sol(a.monto)} a ${K.dec(a.cuota)}</span>
            <b>${a.resultado ? (a.pago ? '+' + K.sol(a.pago) : 'perdida') : 'pendiente'}</b>
          </div>`).join('')
      : '<div class="et">Todavía no apostaste en esta carrera.</div>';

    hist.innerHTML = est.historial.length
      ? est.historial.map(h => `<div class="virt-hfila">
          <span class="ic">${h.disc}</span><span class="id">#${h.id}</span>
          <span class="podio">🥇 ${K.esc(h.podio[0])} · 🥈 ${K.esc(h.podio[1])} · 🥉 ${K.esc(h.podio[2])}</span>
        </div>`).join('')
      : '<div class="et">Las carreras terminadas aparecerán acá.</div>';
  }

  const refrescar = est => {
    if (!document.body.contains(cv)) return;
    pintar(est);
    pintarPanel(est);
  };
  const desuscribir = K.Virtuales.suscribir(refrescar);
  dimensionar();
  refrescar(K.Virtuales.estado());
  const ro = new ResizeObserver(() => { dimensionar(); refrescar(K.Virtuales.estado()); });
  ro.observe(pista);
  return () => { desuscribir(); ro.disconnect(); };
};
