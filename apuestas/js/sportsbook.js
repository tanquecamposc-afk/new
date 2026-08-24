/* ===========================================================
   sportsbook.js — libro deportivo: mercados, boleto,
   liquidación, cashout y motor en vivo
   =========================================================== */
K.Sportsbook = (() => {

  /* Reloj virtual: 1 segundo real = 30 segundos de partido.
     Sin esto un evento prepartido nunca llegaría a jugarse. */
  const VEL = 30;
  const arranque = Date.now();
  const ahora = () => arranque + (Date.now() - arranque) * VEL;

  const DUR = { futbol: 90, basket: 48, tenis: 110, esports: 75, volley: 95 };
  const SETS_PARA = { tenis: 2, esports: 2, volley: 3 };

  const boleto = { lineas: [], modo: 'simple', stake: 20, aceptarCambios: true, procesando: false };
  let filtroDeporte = 'futbol';
  let soloVivo = false;
  let contenedorLista = null;
  const nodos = {};        // cuotas y marcadores vivos, para no repintar todo

  /* =========================================================
     1. LIQUIDACIÓN — qué pasó con cada selección
     ========================================================= */
  function resolver(ev, mercId, selId, linea) {
    const l = ev.marcador.l, v = ev.marcador.v, tot = l + v;
    const G = 'ganada', P = 'perdida', A = 'anulada';
    const ou = (pick, ln, valor) => {
      if (valor === ln) return A;
      const over = valor > ln;
      return (pick === 'O') === over ? G : P;
    };

    if (ev.deporte === 'futbol') {
      switch (mercId) {
        case '1x2': return (selId === '1' && l > v) || (selId === 'X' && l === v) || (selId === '2' && l < v) ? G : P;
        case 'dobleop': {
          const r = l > v ? '1' : l === v ? 'X' : '2';
          return selId.includes(r) ? G : P;
        }
        case 'ou15': return ou(selId[0], 1.5, tot);
        case 'ou25': return ou(selId[0], 2.5, tot);
        case 'ou35': return ou(selId[0], 3.5, tot);
        case 'btts': { const ambos = l > 0 && v > 0; return (selId === 'BTTS-S') === ambos ? G : P; }
        case 'hcp': {
          const d = l - 1 - v;
          const r = d > 0 ? 'H1' : d === 0 ? 'HX' : 'H2';
          return selId === r ? G : P;
        }
      }
    }
    if (ev.deporte === 'basket') {
      switch (mercId) {
        case 'ml': return (selId === '1') === (l > v) ? G : P;
        case 'hcp': { const d = (l - linea) - v; if (d === 0) return A; return (selId === 'H1') === (d > 0) ? G : P; }
        case 'tot': return ou(selId[0], linea, tot);
      }
    }
    if (ev.deporte === 'tenis') {
      switch (mercId) {
        case 'ml': return (selId === '1') === (l > v) ? G : P;
        case 'sets': return ou(selId.startsWith('O') ? 'O' : 'U', 2.5, tot);
        case 'hcps': { const gana20 = (l === 2 && v === 0); return (selId === 'H1') === gana20 ? G : P; }
      }
    }
    // eSports y vóley (series al mejor de N)
    switch (mercId) {
      case 'ml': return (selId === '1') === (l > v) ? G : P;
      case 'barrida': { const limpio = v === 0 || l === 0; return (selId === 'SI') === limpio ? G : P; }
      case 'hcp': { const gana = l > v && (l - v) >= 2; return (selId === 'H1') === gana ? G : P; }
    }
    return A;
  }

  /* =========================================================
     2. BOLETO
     ========================================================= */
  const clave = (evId, mercId, selId) => evId + '|' + mercId + '|' + selId;

  function alternarSeleccion(ev, merc, sel) {
    const k = clave(ev.id, merc.id, sel.id);
    const i = boleto.lineas.findIndex(l => l.k === k);
    if (i >= 0) { boleto.lineas.splice(i, 1); pintarBoleto(); repintarSeleccionadas(); return; }
    // Una sola selección por evento y mercado dentro del mismo boleto.
    const choque = boleto.lineas.findIndex(l => l.evId === ev.id && l.mercId === merc.id);
    if (choque >= 0) boleto.lineas.splice(choque, 1);
    boleto.lineas.push({
      k, evId: ev.id, mercId: merc.id, selId: sel.id,
      pick: sel.extra || sel.lab, merc: merc.nombre, linea: merc.linea ?? null,
      partido: ev.local + ' vs ' + ev.visita, deporte: ev.deporte,
      cuota: sel.cuota, cuotaInicial: sel.cuota, cambio: 0
    });
    if (boleto.lineas.length > 1 && boleto.modo === 'simple') boleto.modo = 'combinada';
    pintarBoleto(); repintarSeleccionadas();
  }

  const cuotaActualDe = (evId, mercId, selId) => {
    const ev = K.evento(evId);
    if (!ev) return null;
    const m = K.Odds.construir(ev).find(x => x.id === mercId);
    const s = m && m.sel.find(x => x.id === selId);
    return s ? s.cuota : null;
  };

  const cuotaTotal = () => boleto.lineas.reduce((a, l) => a * l.cuota, 1);

  function pintarBoleto() {
    const cont = K.$('#boleto');
    if (!cont) return;
    const n = boleto.lineas.length;
    if (!n) {
      cont.innerHTML = `<div class="boleto-vacio"><span class="ic">🎫</span>
        Tu boleto está vacío.<br>Toca una cuota para agregarla.</div>`;
      return;
    }
    // Refrescar cuotas vivas antes de pintar
    boleto.lineas.forEach(l => {
      const c = cuotaActualDe(l.evId, l.mercId, l.selId);
      if (c && c !== l.cuota) { l.cambio = c - l.cuota; l.cuota = c; }
    });

    const total = cuotaTotal();
    const stake = boleto.stake || 0;
    const modo = n === 1 ? 'simple' : boleto.modo;
    const retorno = modo === 'combinada' ? stake * total : stake * boleto.lineas[0].cuota * n;
    const apostadoReal = modo === 'combinada' ? stake : stake * n;
    const overround = boleto.lineas.reduce((a, l) => a + 1 / l.cuota, 0) / n;

    let html = '';
    if (n > 1) {
      html += `<div class="tabs-boleto">
        <button class="${modo === 'simple' ? 'on' : ''}" data-modo="simple">Simples (${n})</button>
        <button class="${modo === 'combinada' ? 'on' : ''}" data-modo="combinada">Combinada</button>
      </div>`;
    }
    for (const l of boleto.lineas) {
      html += `<div class="seleccion">
        <button class="cerrar" data-quita="${l.k}">×</button>
        <div class="pick"><span>${K.esc(l.pick)}</span><span class="c">${K.dec(l.cuota)}</span></div>
        <div class="merc">${K.esc(l.merc)}</div>
        <div class="part">${K.esc(l.partido)}</div>
        ${Math.abs(l.cuota - l.cuotaInicial) > 0.001
          ? `<div class="aviso-cambio">La cuota se movió de ${K.dec(l.cuotaInicial)} a ${K.dec(l.cuota)}</div>` : ''}
      </div>`;
    }
    html += `<div class="stake-fila"><span class="sol">S/</span>
      <input id="stake" type="number" min="1" step="1" value="${stake}"></div>
      <div class="rapidos">
        ${[5, 10, 20, 50, 100].map(v => `<button data-stake="${v}">+${v}</button>`).join('')}
        <button data-stake="max">Máx</button><button data-stake="0">Borrar</button>
      </div>
      <div class="resumen">
        <div class="fila"><span>Cuota ${modo === 'combinada' ? 'combinada' : 'promedio'}</span><b>${K.dec(modo === 'combinada' ? total : total ** (1 / n))}</b></div>
        <div class="fila"><span>Total apostado</span><b>${K.sol(apostadoReal)}</b></div>
        <div class="fila"><span>Prob. implícita</span><b>${K.pct(modo === 'combinada' ? 1 / total : overround)}</b></div>
        <div class="fila total"><span>Retorno potencial</span><b>${K.sol(retorno)}</b></div>
      </div>
      <div class="pie-boleto">
        <label style="display:flex;gap:7px;align-items:center;font-size:12px;color:var(--tenue);margin-bottom:8px">
          <input type="checkbox" id="aceptar-cambios" ${boleto.aceptarCambios ? 'checked' : ''}>
          Aceptar cambios de cuota automáticamente
        </label>
        <button class="btn" id="apostar" ${boleto.procesando ? 'disabled' : ''}>
          ${boleto.procesando ? 'Validando…' : 'Apostar ' + K.sol(apostadoReal)}
        </button>
      </div>
      <div class="nota-margen">Margen de la casa en esta selección:
        <b>${K.pct(overround - 1)}</b> · el retorno ya viene descontado del <i>overround</i>.</div>`;

    cont.innerHTML = html;

    K.$$('[data-quita]', cont).forEach(b => b.onclick = () => {
      boleto.lineas = boleto.lineas.filter(l => l.k !== b.dataset.quita);
      pintarBoleto(); repintarSeleccionadas();
    });
    K.$$('[data-modo]', cont).forEach(b => b.onclick = () => { boleto.modo = b.dataset.modo; pintarBoleto(); });
    K.$$('[data-stake]', cont).forEach(b => b.onclick = () => {
      const v = b.dataset.stake;
      if (v === 'max') boleto.stake = Math.floor(Math.min(K.Wallet.est().saldo, K.Wallet.est().perfil.limiteApuesta));
      else if (v === '0') boleto.stake = 0;
      else boleto.stake = K.round2((boleto.stake || 0) + Number(v));
      pintarBoleto();
    });
    const inp = K.$('#stake', cont);
    if (inp) inp.oninput = () => { boleto.stake = Number(inp.value) || 0; actualizarResumen(); };
    const chk = K.$('#aceptar-cambios', cont);
    if (chk) chk.onchange = () => boleto.aceptarCambios = chk.checked;
    const btn = K.$('#apostar', cont);
    if (btn) btn.onclick = colocar;
  }

  /* Solo refresca los números del resumen, para no perder el foco del input. */
  function actualizarResumen() {
    const cont = K.$('#boleto');
    const n = boleto.lineas.length;
    if (!cont || !n) return;
    const modo = n === 1 ? 'simple' : boleto.modo;
    const total = cuotaTotal();
    const apostado = modo === 'combinada' ? boleto.stake : boleto.stake * n;
    const retorno = modo === 'combinada' ? boleto.stake * total : boleto.stake * boleto.lineas[0].cuota * n;
    const filas = K.$$('.resumen .fila b', cont);
    if (filas[1]) filas[1].textContent = K.sol(apostado);
    if (filas[3]) filas[3].textContent = K.sol(retorno);
    const b = K.$('#apostar', cont);
    if (b && !boleto.procesando) b.textContent = 'Apostar ' + K.sol(apostado);
  }

  /* =========================================================
     3. COLOCAR LA APUESTA (con retardo de aceptación)
     ========================================================= */
  async function colocar() {
    if (boleto.procesando || !boleto.lineas.length) return;
    const n = boleto.lineas.length;
    const modo = n === 1 ? 'simple' : boleto.modo;
    const apostado = modo === 'combinada' ? boleto.stake : boleto.stake * n;

    const val = K.Wallet.puedeApostar(apostado);
    if (!val.ok) { K.aviso(val.razon, 'err'); return; }

    const hayVivo = boleto.lineas.some(l => (K.evento(l.evId) || {}).vivo);
    const cuotasAntes = boleto.lineas.map(l => l.cuota);

    boleto.procesando = true;
    pintarBoleto();
    const btn = K.$('#apostar');

    /* Bet delay: 3-8 s en vivo para frenar el courtsiding. */
    const delay = hayVivo ? K.entero(3, 8) : 1;
    for (let t = delay; t > 0; t--) {
      if (btn) btn.textContent = hayVivo ? `Aceptando apuesta… ${t}s` : 'Validando…';
      await K.enEspera(1000);
      const susp = boleto.lineas.find(l => (K.evento(l.evId) || {}).suspendido);
      if (susp) {
        boleto.procesando = false;
        K.aviso('❌ Apuesta rechazada: el mercado se suspendió durante la validación.', 'err');
        pintarBoleto();
        return;
      }
    }

    // Revisión de cuota al momento de aceptar
    let movida = false;
    boleto.lineas.forEach((l, i) => {
      const c = cuotaActualDe(l.evId, l.mercId, l.selId);
      if (c && Math.abs(c - cuotasAntes[i]) > 0.001) { l.cuota = c; movida = true; }
    });
    if (movida && !boleto.aceptarCambios) {
      boleto.procesando = false;
      K.aviso('⚠️ La cuota cambió y no aceptas cambios automáticos. Revisa el boleto.', 'warn');
      pintarBoleto();
      return;
    }

    const w = K.Wallet.est();
    const apuestas = [];
    if (modo === 'combinada') {
      apuestas.push(crearApuesta(boleto.lineas.slice(), boleto.stake, 'combinada'));
    } else {
      boleto.lineas.forEach(l => apuestas.push(crearApuesta([l], boleto.stake, 'simple')));
    }
    K.Wallet.apostar(apostado, (modo === 'combinada' ? 'Combinada de ' + n : n + ' apuesta(s) simple(s)'));
    apuestas.forEach(a => w.apuestas.unshift(a));
    K.Wallet.persistir();

    boleto.lineas = [];
    boleto.procesando = false;
    pintarBoleto();
    repintarSeleccionadas();
    K.bus.emit('apuestas');
    K.aviso('✅ Apuesta aceptada por ' + K.sol(apostado) + '. Revisa <b>Mis apuestas</b>.');
  }

  function crearApuesta(lineas, stake, tipo) {
    const ev0 = K.evento(lineas[0].evId);
    const antelacion = ev0 ? Math.max(0, (ev0.inicio - ahora()) / 60000) : 0;
    // Cada sol apostado carga el libro del lado elegido: eso mueve la cuota.
    lineas.forEach(l => {
      const ev = K.evento(l.evId);
      if (!ev) return;
      const k = l.mercId + '|' + l.selId;
      ev.exposicion[k] = (ev.exposicion[k] || 0) + stake * (l.cuota - 1);
    });
    return {
      id: 'b' + Date.now().toString(36) + K.entero(100, 999),
      t: Date.now(), tipo, stake, estado: 'pendiente',
      cuotaTotal: K.round2(lineas.reduce((a, l) => a * l.cuota, 1)),
      antelacionMin: Math.round(antelacion),
      lineas: lineas.map(l => ({ ...l, estado: 'pendiente', enVivo: !!(K.evento(l.evId) || {}).vivo })),
      pago: 0
    };
  }

  /* =========================================================
     4. CASHOUT
     ========================================================= */
  function valorCashout(ap) {
    if (ap.estado !== 'pendiente') return null;
    let cuotaViva = 1, hayVivo = false;
    for (const l of ap.lineas) {
      if (l.estado === 'ganada') continue;
      if (l.estado === 'perdida') return null;
      const ev = K.evento(l.evId);
      if (!ev || !ev.vivo) return null;         // solo con el partido en curso
      hayVivo = true;
      const c = cuotaActualDe(l.evId, l.mercId, l.selId);
      if (!c) return null;
      cuotaViva *= c;
    }
    if (!hayVivo) return null;
    return K.Odds.cashout(ap.stake, ap.cuotaTotal, cuotaViva, 0.05);
  }

  function cobrar(ap) {
    const v = valorCashout(ap);
    if (v === null) { K.aviso('El cashout no está disponible ahora mismo.', 'warn'); return; }
    ap.estado = 'cobrada';
    ap.pago = v;
    K.Wallet.acreditar(v, 'Cashout de apuesta ' + ap.id, 'cashout');
    K.bus.emit('apuestas');
    K.aviso('💸 Cashout cobrado: ' + K.sol(v));
  }

  /* =========================================================
     5. MOTOR EN VIVO
     ========================================================= */
  function tick() {
    const t = ahora();
    let cambioEstructural = false;

    for (const ev of K.EVENTOS) {
      if (ev.terminado) continue;
      if (!ev.vivo && t >= ev.inicio) {
        // La cuota de cierre es la que había justo antes del pitazo inicial.
        ev.cierre = {};
        K.Odds.construir(ev).forEach(m => m.sel.forEach(x => ev.cierre[m.id + '|' + x.id] = x.cuota));
        ev.vivo = true; ev.minuto = 0; cambioEstructural = true;
      }
      if (!ev.vivo) continue;

      ev.minuto = Math.round((ev.minuto + 0.5) * 10) / 10;
      if (ev.suspendido && t > ev.suspendidoHasta) { ev.suspendido = false; cambioEstructural = true; }

      if (ev.deporte === 'futbol') {
        const pGol = 0.5 / 90;
        if (!ev.suspendido && Math.random() < ev.modelo.lh * pGol) marcar(ev, 'l');
        if (!ev.suspendido && Math.random() < ev.modelo.la * pGol) marcar(ev, 'v');
      } else if (ev.deporte === 'basket') {
        const ritmo = ev.modelo.total / 48 * 0.5;
        const sesgo = 0.5 + ev.modelo.spread / 60;
        if (Math.random() < ritmo / 2.4) ev.marcador.l += K.elige([2, 2, 3]) * (Math.random() < sesgo ? 1 : 0);
        if (Math.random() < ritmo / 2.4) ev.marcador.v += K.elige([2, 2, 3]) * (Math.random() < 1 - sesgo ? 1 : 0);
      } else {
        const pSet = ev.deporte === 'tenis' ? 0.0125 : ev.deporte === 'volley' ? 0.02 : 0.017;
        if (Math.random() < pSet) {
          const q = ev.deporte === 'tenis' ? ev.modelo.p1 : ev.modelo.q;
          if (Math.random() < q) ev.marcador.l++; else ev.marcador.v++;
          suspender(ev, 3);
          cambioEstructural = true;
        }
      }

      const meta = SETS_PARA[ev.deporte];
      const fin = meta ? (ev.marcador.l >= meta || ev.marcador.v >= meta) : ev.minuto >= DUR[ev.deporte];
      if (fin || ev.minuto >= DUR[ev.deporte] * 1.4) { finalizar(ev); cambioEstructural = true; }
    }

    if (cambioEstructural) K.bus.emit('lista');
    else patchVivo();
    pintarBoleto();
  }

  function marcar(ev, lado) {
    ev.marcador[lado]++;
    suspender(ev, 4);
    const quien = lado === 'l' ? ev.local : ev.visita;
    K.aviso(`⚽ ¡Gol de <b>${K.esc(quien)}</b>! ${K.esc(ev.local)} ${ev.marcador.l}-${ev.marcador.v} ${K.esc(ev.visita)}`, 'warn');
    K.bus.emit('lista');
  }

  /* El proveedor manda SUSPENDED: se congelan los mercados
     hasta recalcular el modelo con el nuevo marcador. */
  function suspender(ev, seg) {
    ev.suspendido = true;
    ev.suspendidoHasta = ahora() + seg * 1000 * VEL;   // seg reales en escala virtual
  }

  function finalizar(ev) {
    ev.terminado = true;
    ev.vivo = false;
    liquidar(ev);
    K.aviso(`🏁 Final: ${K.esc(ev.local)} ${ev.marcador.l}-${ev.marcador.v} ${K.esc(ev.visita)}`);
  }

  function liquidar(ev) {
    const w = K.Wallet.est();
    let hubo = false;
    for (const ap of w.apuestas) {
      if (ap.estado !== 'pendiente') continue;
      let toco = false;
      for (const l of ap.lineas) {
        if (l.evId !== ev.id || l.estado !== 'pendiente') continue;
        l.estado = resolver(ev, l.mercId, l.selId, l.linea);
        l.marcadorFinal = ev.marcador.l + '-' + ev.marcador.v;
        toco = true;
        // CLV: solo tiene sentido contra la línea de cierre de un mercado prepartido.
        const cierre = !l.enVivo && ev.cierre && ev.cierre[l.mercId + '|' + l.selId];
        if (cierre) K.Wallet.registrarCLV(l.cuota, cierre);
      }
      if (!toco) continue;
      hubo = true;
      if (ap.lineas.some(l => l.estado === 'perdida')) {
        ap.estado = 'perdida'; ap.pago = 0;
      } else if (ap.lineas.every(l => l.estado !== 'pendiente')) {
        // Las anuladas salen del cálculo con cuota 1.00 (devolución).
        const cuota = ap.lineas.reduce((a, l) => a * (l.estado === 'anulada' ? 1 : l.cuota), 1);
        ap.estado = 'ganada';
        ap.pago = K.round2(ap.stake * cuota);
        K.Wallet.acreditar(ap.pago, 'Apuesta ganada ' + ap.id);
      }
    }
    if (hubo) { K.Wallet.persistir(); K.bus.emit('apuestas'); }
  }

  /* =========================================================
     6. RENDER
     ========================================================= */
  function estaEnBoleto(evId, mercId, selId) {
    return boleto.lineas.some(l => l.k === clave(evId, mercId, selId));
  }

  function botonCuota(ev, merc, sel) {
    const k = clave(ev.id, merc.id, sel.id);
    const previa = ev.historialCuotas[k];
    let cls = 'cuota';
    if (estaEnBoleto(ev.id, merc.id, sel.id)) cls += ' on';
    if (previa && Math.abs(previa - sel.cuota) > 0.001) cls += sel.cuota > previa ? ' sube' : ' baja';
    ev.historialCuotas[k] = sel.cuota;
    const b = K.el('button', {
      class: cls, 'data-k': k,
      title: 'Prob. implícita ' + K.pct(sel.impl),
      onclick: () => {
        if (ev.suspendido) { K.aviso('Mercado suspendido, espera unos segundos.', 'warn'); return; }
        alternarSeleccion(ev, merc, sel);
      }
    }, [
      K.el('span', { class: 'lab', text: sel.lab }),
      K.el('span', { class: 'num', text: K.dec(sel.cuota) })
    ]);
    b.disabled = !!ev.suspendido || !!ev.terminado;
    nodos[k] = b;
    return b;
  }

  function tarjetaEvento(ev, opts = {}) {
    const mercados = K.Odds.construir(ev);
    const principal = mercados[0];
    const card = K.el('div', { class: 'evento' });

    const cab = K.el('div', { class: 'ev-cab' });
    const dep = K.DEPORTES.find(d => d.id === ev.deporte);
    cab.appendChild(K.el('span', { text: dep ? dep.ic : '•' }));
    cab.appendChild(K.el('span', { class: 'liga', text: ev.liga }));
    if (ev.vivo) {
      const badge = K.el('span', { class: 'badge-vivo' }, [K.el('span', { class: 'punto' })]);
      badge.appendChild(document.createTextNode('EN VIVO'));
      cab.appendChild(badge);
    }
    const hora = K.el('span', { class: 'hora', text: ev.terminado ? 'Finalizado' : ev.vivo ? minutoTexto(ev) : K.hora(ev.inicio) });
    nodos['min|' + ev.id] = hora;
    cab.appendChild(hora);
    card.appendChild(cab);

    const cuerpo = K.el('div', { class: 'ev-cuerpo' });
    const equipos = K.el('div', { class: 'equipos' });
    [['l', ev.local, ev.escL], ['v', ev.visita, ev.escV]].forEach(([lado, nom, esc]) => {
      const fila = K.el('div', { class: 'equipo' }, [
        K.el('span', { class: 'esc', text: esc }),
        K.el('span', { class: 'nom', text: nom })
      ]);
      if (ev.vivo || ev.terminado) {
        const m = K.el('span', { class: 'marc', text: ev.marcador[lado] });
        nodos['marc|' + ev.id + '|' + lado] = m;
        fila.appendChild(m);
      }
      equipos.appendChild(fila);
    });
    cuerpo.appendChild(equipos);

    if (ev.suspendido) {
      cuerpo.appendChild(K.el('div', { class: 'suspendido', html: '🔒 Mercado suspendido · recalculando cuotas' }));
    } else {
      const merc = K.el('div', { class: 'mercado g' + principal.cols });
      principal.sel.forEach(s => merc.appendChild(botonCuota(ev, principal, s)));
      cuerpo.appendChild(merc);
    }
    card.appendChild(cuerpo);

    const pie = K.el('div', { class: 'ev-pie' });
    pie.appendChild(K.el('span', { text: 'Margen ' + K.pct(principal.overround - 1) }));
    pie.appendChild(K.el('span', { text: '·' }));
    pie.appendChild(K.el('span', { text: 'Suma implícita ' + K.pct(principal.overround) }));
    if (!opts.sinMas) {
      pie.appendChild(K.el('button', {
        class: 'mas', text: '+' + (mercados.length - 1) + ' mercados',
        onclick: () => abrirEvento(ev.id)
      }));
    }
    card.appendChild(pie);
    return card;
  }

  const minutoTexto = ev => {
    if (ev.deporte === 'tenis' || ev.deporte === 'volley' || ev.deporte === 'esports')
      return Math.floor(ev.minuto) + "' · en juego";
    return Math.floor(ev.minuto) + "'";
  };

  /* Repinta solo lo que cambia cada segundo. */
  function patchVivo() {
    for (const ev of K.EVENTOS) {
      if (!ev.vivo) continue;
      const nm = nodos['min|' + ev.id];
      if (nm) nm.textContent = minutoTexto(ev);
      ['l', 'v'].forEach(lado => {
        const n = nodos['marc|' + ev.id + '|' + lado];
        if (n) n.textContent = ev.marcador[lado];
      });
      K.Odds.construir(ev).forEach(m => m.sel.forEach(s => {
        const k = clave(ev.id, m.id, s.id);
        const b = nodos[k];
        if (!b || !b.isConnected) return;
        const previa = ev.historialCuotas[k];
        if (previa && Math.abs(previa - s.cuota) > 0.001) {
          b.classList.remove('sube', 'baja');
          void b.offsetWidth;
          b.classList.add(s.cuota > previa ? 'sube' : 'baja');
          const num = b.querySelector('.num');
          if (num) num.textContent = K.dec(s.cuota);
        }
        ev.historialCuotas[k] = s.cuota;
      }));
    }
  }

  function repintarSeleccionadas() {
    Object.entries(nodos).forEach(([k, n]) => {
      if (!n || !n.classList || !n.classList.contains) return;
      if (k.startsWith('min|') || k.startsWith('marc|')) return;
      n.classList.toggle('on', boleto.lineas.some(l => l.k === k));
    });
  }

  /* ---- vista de lista ---- */
  function vista(root) {
    contenedorLista = root;
    root.innerHTML = '';
    const chips = K.el('div', { class: 'chips' });
    chips.appendChild(K.el('button', {
      class: 'chip' + (soloVivo ? ' on' : ''), html: '🔴 En vivo',
      onclick: () => { soloVivo = !soloVivo; vista(root); }
    }));
    K.DEPORTES.forEach(d => chips.appendChild(K.el('button', {
      class: 'chip' + (!soloVivo && filtroDeporte === d.id ? ' on' : ''),
      html: d.ic + ' ' + d.nom,
      onclick: () => { soloVivo = false; filtroDeporte = d.id; vista(root); }
    })));
    root.appendChild(chips);

    let lista = K.EVENTOS.filter(e => !e.terminado);
    lista = soloVivo ? lista.filter(e => e.vivo) : lista.filter(e => e.deporte === filtroDeporte);
    lista.sort((a, b) => (b.vivo - a.vivo) || (a.inicio - b.inicio));

    if (!lista.length) {
      root.appendChild(K.el('div', { class: 'vacio', html: '<span class="ic">📭</span>No hay eventos abiertos en esta categoría.' }));
    }
    const vivos = lista.filter(e => e.vivo);
    const luego = lista.filter(e => !e.vivo);
    if (vivos.length) {
      root.appendChild(cabecera('🔴 En vivo', vivos.length + ' eventos con cuotas moviéndose'));
      vivos.forEach(e => root.appendChild(tarjetaEvento(e)));
    }
    if (luego.length) {
      root.appendChild(cabecera('📅 Próximos', 'El reloj corre a 30x para que puedas ver la liquidación'));
      luego.forEach(e => root.appendChild(tarjetaEvento(e)));
    }
    const term = K.EVENTOS.filter(e => e.terminado);
    if (term.length) {
      root.appendChild(cabecera('🏁 Finalizados', term.length + ' eventos ya liquidados'));
      term.slice(0, 6).forEach(e => root.appendChild(tarjetaEvento(e, { sinMas: true })));
    }
  }

  const cabecera = (t, sub) => K.el('div', { class: 'titulo-sec' }, [
    K.el('h2', { text: t }), K.el('span', { class: 'sub', text: sub })
  ]);

  /* ---- ficha completa del evento ---- */
  function abrirEvento(id) {
    const ev = K.evento(id);
    if (!ev) return;
    const cuerpo = K.el('div');
    const pintar = () => {
      cuerpo.innerHTML = '';
      const mercados = K.Odds.construir(ev);
      cuerpo.appendChild(K.el('div', {
        class: 'info-bloque', html:
          `<h4>${K.esc(ev.local)} vs ${K.esc(ev.visita)} · ${K.esc(ev.liga)}</h4>
       ${ev.vivo ? `En juego · minuto ${Math.floor(ev.minuto)} · marcador ${ev.marcador.l}-${ev.marcador.v}`
              : ev.terminado ? `Finalizado ${ev.marcador.l}-${ev.marcador.v}` : 'Comienza ' + K.fechaHora(ev.inicio)}
       · margen base <b>${K.pct(ev.margen - 1)}</b>${ev.vivo ? ' + 2.5% por riesgo en vivo' : ''}`
      }));
      mercados.forEach(m => {
        const caja = K.el('div', { class: 'tarjeta', style: 'margin-top:12px' });
        caja.appendChild(K.el('h3', {
          html: `${K.esc(m.nombre)} <span style="font-weight:600;text-transform:none;letter-spacing:0">
            margen ${K.pct(m.overround - 1)}</span>`
        }));
        const c = K.el('div', { class: 'cuerpo' });
        const g = K.el('div', { class: 'mercado g' + m.cols });
        m.sel.forEach(s => g.appendChild(botonCuota(ev, m, s)));
        c.appendChild(g);
        c.appendChild(K.el('div', {
          style: 'margin-top:8px;font-size:11.5px;color:var(--tenue2)',
          text: 'Probabilidades implícitas: ' + m.sel.map(s => s.lab + ' ' + K.pct(s.impl)).join(' · ')
        }));
        caja.appendChild(c);
        cuerpo.appendChild(caja);
      });
    };
    pintar();
    K.modal(ev.local + ' vs ' + ev.visita, cuerpo, ev.liga);
    const it = setInterval(() => {
      if (!document.body.contains(cuerpo)) { clearInterval(it); return; }
      if (ev.vivo) pintar();
    }, 1500);
  }

  /* ---- vista Mis apuestas ---- */
  function vistaApuestas(root) {
    const w = K.Wallet.est();
    root.innerHTML = '';
    root.appendChild(cabecera('🎫 Mis apuestas', w.apuestas.length + ' registradas'));
    if (!w.apuestas.length) {
      root.appendChild(K.el('div', { class: 'vacio', html: '<span class="ic">🎫</span>Todavía no hiciste ninguna apuesta.' }));
      return;
    }
    for (const ap of w.apuestas) {
      const card = K.el('div', { class: 'apuesta' });
      card.appendChild(K.el('div', {
        class: 'ap-cab', html:
          `<span class="tipo">${ap.tipo === 'combinada' ? 'Combinada ×' + ap.lineas.length : 'Simple'}</span>
       <span>${K.fechaHora(ap.t)}</span>
       <span class="est ${ap.estado}">${ap.estado.toUpperCase()}</span>`
      }));
      ap.lineas.forEach(l => card.appendChild(K.el('div', {
        class: 'ap-linea', html:
          `<div class="top"><span>${K.esc(l.pick)}</span><span>${K.dec(l.cuota)}</span></div>
       <div class="bajo">${K.esc(l.merc)} · ${K.esc(l.partido)}
       ${l.marcadorFinal ? ' · final ' + l.marcadorFinal : ''}
       ${l.estado !== 'pendiente' ? ' · <b style="color:var(--' + (l.estado === 'ganada' ? 'acento' : l.estado === 'perdida' ? 'rojo' : 'tenue') + ')">' + l.estado + '</b>' : ''}</div>`
      })));
      const pie = K.el('div', { class: 'ap-pie' });
      pie.appendChild(K.el('div', { class: 'dato', html: 'Apostado<b>' + K.sol(ap.stake) + '</b>' }));
      pie.appendChild(K.el('div', { class: 'dato', html: 'Cuota<b>' + K.dec(ap.cuotaTotal) + '</b>' }));
      pie.appendChild(K.el('div', {
        class: 'dato', html: (ap.estado === 'pendiente' ? 'Retorno potencial' : 'Pagado')
          + '<b>' + K.sol(ap.estado === 'pendiente' ? ap.stake * ap.cuotaTotal : ap.pago) + '</b>'
      }));
      const v = valorCashout(ap);
      if (v !== null && v > 0) {
        pie.appendChild(K.el('button', {
          class: 'btn chico', html: 'Cashout ' + K.sol(v),
          onclick: () => { cobrar(ap); vistaApuestas(root); }
        }));
      }
      card.appendChild(pie);
      root.appendChild(card);
    }
  }

  /* ---- panel de riesgo del libro ---- */
  function panelRiesgo() {
    const filas = [];
    for (const ev of K.EVENTOS) {
      for (const [k, monto] of Object.entries(ev.exposicion)) {
        if (monto > 0) filas.push({ ev, k, monto });
      }
    }
    filas.sort((a, b) => b.monto - a.monto);
    if (!filas.length) return K.el('div', {
      class: 'info-bloque',
      html: 'Todavía no cargaste el libro. Apuesta a un mercado y mira cómo se mueve su cuota: cada sol de responsabilidad empuja el precio hacia abajo del lado que recibe dinero.'
    });
    const t = K.el('table', { class: 'tabla' });
    t.innerHTML = '<tr><th>Evento</th><th>Selección</th><th>Responsabilidad</th></tr>' +
      filas.slice(0, 12).map(f => `<tr><td>${K.esc(f.ev.local)} vs ${K.esc(f.ev.visita)}</td>
        <td>${K.esc(f.k.replace('|', ' · '))}</td><td class="neg">${K.sol(f.monto)}</td></tr>`).join('');
    return t;
  }

  function iniciar() {
    setInterval(tick, 1000);
  }

  const setVivo = v => { soloVivo = v; };

  return { vista, vistaApuestas, pintarBoleto, iniciar, abrirEvento, panelRiesgo, boleto, valorCashout, ahora, setVivo };
})();
