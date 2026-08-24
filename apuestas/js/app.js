/* ===========================================================
   app.js — navegación, cuenta, modales y arranque
   =========================================================== */

/* ---------- modal genérico ---------- */
K.modal = (titulo, nodo, sub = '', limpiar = null) => {
  const fondo = K.el('div', { class: 'modal-fondo' });
  const cerrar = () => { if (typeof limpiar === 'function') limpiar(); fondo.remove(); document.body.style.overflow = ''; };
  const cab = K.el('div', { class: 'modal-cab' }, [
    K.el('h3', { text: titulo }),
    sub ? K.el('span', { class: 'prov', text: sub }) : null,
    K.el('button', { class: 'x', text: '×', onclick: cerrar })
  ].filter(Boolean));
  const caja = K.el('div', { class: 'modal' }, [cab, K.el('div', { class: 'modal-cuerpo' }, [nodo])]);
  fondo.appendChild(caja);
  fondo.onclick = e => { if (e.target === fondo) cerrar(); };
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(fondo);
  document.body.style.overflow = 'hidden';
  return cerrar;
};

K.App = (() => {
  let vista = 'deportes';

  const VISTAS = [
    { id: 'deportes', nom: 'Deportes', ic: '⚽', slip: true },
    { id: 'vivo', nom: 'En vivo', ic: '🔴', slip: true },
    { id: 'casino', nom: 'Casino', ic: '🎰' },
    { id: 'apuestas', nom: 'Mis apuestas', ic: '🎫' },
    { id: 'cuenta', nom: 'Cuenta', ic: '👤' },
    { id: 'como', nom: 'Cómo funciona', ic: '📐' }
  ];

  function pintarNav() {
    const nav = K.$('#nav');
    nav.innerHTML = '';
    const vivos = K.EVENTOS.filter(e => e.vivo).length;
    const pend = K.Wallet.est().apuestas.filter(a => a.estado === 'pendiente').length;
    VISTAS.forEach(v => {
      const b = K.el('button', { class: vista === v.id ? 'on' : '', onclick: () => ir(v.id) });
      b.innerHTML = v.ic + ' ' + v.nom +
        (v.id === 'vivo' && vivos ? `<span class="pip vivo-pip">${vivos}</span>` : '') +
        (v.id === 'apuestas' && pend ? `<span class="pip">${pend}</span>` : '');
      nav.appendChild(b);
    });
  }

  function ir(v) {
    vista = v;
    pintarNav();
    pintar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pintar() {
    const cont = K.$('#contenedor');
    const main = K.$('#main');
    const lateral = K.$('#lateral');
    const conSlip = VISTAS.find(v => v.id === vista).slip;
    cont.classList.toggle('ancho', !conSlip);
    lateral.style.display = conSlip ? '' : 'none';
    main.innerHTML = '';

    if (vista === 'deportes' || vista === 'vivo') {
      K.Sportsbook.setVivo(vista === 'vivo');
      K.Sportsbook.vista(main);
      K.Sportsbook.pintarBoleto();
    } else if (vista === 'casino') K.Casino.vista(main);
    else if (vista === 'apuestas') K.Sportsbook.vistaApuestas(main);
    else if (vista === 'cuenta') vistaCuenta(main);
    else if (vista === 'como') vistaComoFunciona(main);
  }

  /* =========================================================
     CUENTA
     ========================================================= */
  function vistaCuenta(root) {
    const w = K.Wallet.est();
    root.innerHTML = '';
    root.appendChild(K.el('div', { class: 'titulo-sec' }, [
      K.el('h2', { text: '👤 Mi cuenta' }),
      K.el('span', { class: 'sub', text: 'Saldo de demostración · nada de esto es dinero real' })
    ]));

    const apostadoDep = w.apuestas.reduce((a, b) => a + b.stake, 0);
    const pagadoDep = w.apuestas.reduce((a, b) => a + b.pago, 0);
    const neto = K.round2(w.saldo - w.depositado);
    const rtpCasino = w.casino.apostado > 0 ? w.casino.devuelto / w.casino.apostado : null;

    const kpis = K.el('div', { class: 'grid2' }, [
      kpi('Saldo actual', K.sol(w.saldo)),
      kpi('Resultado neto', K.sol(neto), neto >= 0 ? 'pos' : 'neg'),
      kpi('Apostado en deportes', K.sol(apostadoDep)),
      kpi('Devuelto en deportes', K.sol(pagadoDep)),
      kpi('Apostado en casino', K.sol(w.casino.apostado)),
      kpi('RTP observado en casino', rtpCasino === null ? '—' : K.pct(rtpCasino))
    ]);
    root.appendChild(caja('Resumen', kpis));

    /* --- perfil de riesgo --- */
    const clv = w.perfil.clv;
    const clvMedio = clv.length ? clv.reduce((a, b) => a + b, 0) / clv.length : 0;
    const perfil = K.el('div');
    perfil.innerHTML = `
      <div class="grid2" style="margin-bottom:12px">
        <div class="kpi"><span class="et">Categoría asignada</span><span class="vl">${w.perfil.categoria}</span></div>
        <div class="kpi"><span class="et">CLV promedio</span><span class="vl ${clvMedio >= 0 ? 'pos' : 'neg'}">${clv.length ? (clvMedio >= 0 ? '+' : '') + clvMedio.toFixed(2) + '%' : '—'}</span></div>
        <div class="kpi"><span class="et">Límite por apuesta</span><span class="vl">${K.sol(w.perfil.limiteApuesta)}</span></div>
      </div>
      <div class="info-bloque">
        El motor compara la cuota que tomaste contra la cuota de cierre del mercado. Si ganas valor de
        forma sistemática (<b>CLV positivo</b>) te clasifica como <i>sharp</i> y te recorta el límite:
        así funciona el <i>limiting</i> en las casas reales.
        ${w.perfil.marcas.length ? '<br><br><b>Marcas activas:</b><br>· ' + w.perfil.marcas.map(K.esc).join('<br>· ') : ''}
        ${clv.length < 8 ? '<br><br>Necesitas al menos 8 apuestas liquidadas para que el perfil se calcule.' : ''}
      </div>`;
    root.appendChild(caja('Motor de riesgo y perfilado', perfil));

    /* --- libro de la casa --- */
    root.appendChild(caja('Libro de la casa · responsabilidad abierta', K.Sportsbook.panelRiesgo()));

    /* --- depósitos, KYC y rollover --- */
    const pagos = K.el('div');
    const rollBarra = w.depositado > 0 ? 1 - w.rollover / Math.max(w.depositado, 1) : 1;
    pagos.innerHTML = `
      <div class="info-bloque" style="margin-bottom:12px">
        <h4>Verificación de identidad (KYC)</h4>
        Estado: <b style="color:${w.kyc.verificado ? 'var(--acento)' : 'var(--ambar)'}">${w.kyc.verificado ? 'verificada' : 'pendiente'}</b>.
        En una plataforma real acá se cruzarían tus datos con RENIEC y una prueba de vida biométrica antes
        del primer retiro. Esta demo no pide ni guarda ningún dato personal: el botón solo simula el trámite.
      </div>
      <div class="info-bloque">
        <h4>Rollover pendiente</h4>
        Falta apostar <b>${K.sol(w.rollover)}</b> para liberar el retiro (regla 1× sobre lo depositado).
        <div class="barra"><i style="width:${K.clamp(rollBarra * 100, 0, 100)}%"></i></div>
      </div>`;
    const botonera = K.el('div', { class: 'acciones', style: 'margin-top:12px' }, [
      K.el('button', { class: 'btn', text: 'Depositar fichas demo', onclick: modalDeposito }),
      K.el('button', { class: 'btn sec', text: 'Retirar', onclick: modalRetiro }),
      K.el('button', { class: 'btn sec', text: w.kyc.verificado ? 'KYC verificado' : 'Simular verificación', onclick: () => { K.Wallet.verificarKYC(); K.aviso('Identidad verificada (simulación).'); pintar(); } })
    ]);
    pagos.appendChild(botonera);
    root.appendChild(caja('Pagos y cumplimiento', pagos));

    /* --- juego responsable --- */
    const jr = K.el('div');
    const min = Math.floor(K.Wallet.tiempoSesion() / 60000);
    jr.innerHTML = `<div class="info-bloque" style="margin-bottom:12px">
      Llevas <b>${min} minuto${min === 1 ? '' : 's'}</b> en esta sesión.
      Las herramientas de abajo funcionan igual que en una casa regulada: los límites se pueden bajar al
      instante y subir recién después de un período de espera.</div>`;
    const campos = K.el('div', { class: 'grid2' });
    campos.appendChild(campoNumero('Límite de depósito diario (S/)', w.limites.depositoDiario, v => { w.limites.depositoDiario = v; K.Wallet.persistir(); }));
    campos.appendChild(campoNumero('Apuesta máxima (S/)', w.limites.apuestaMax, v => { w.limites.apuestaMax = v; K.Wallet.persistir(); }));
    jr.appendChild(campos);
    const pausas = K.el('div', { class: 'acciones', style: 'margin-top:12px' }, [
      K.el('button', { class: 'btn sec', text: 'Pausa de 15 min', onclick: () => { K.Wallet.pausar(15); K.aviso('Pausa activada por 15 minutos.', 'warn'); pintar(); } }),
      K.el('button', { class: 'btn sec', text: 'Pausa de 1 hora', onclick: () => { K.Wallet.pausar(60); K.aviso('Pausa activada por 1 hora.', 'warn'); pintar(); } }),
      K.el('button', { class: 'btn peligro', text: 'Reiniciar la demo', onclick: () => {
        if (confirm('Esto borra saldo, apuestas e historial de esta demo. ¿Continuar?')) { K.Wallet.reiniciar(); K.aviso('Demo reiniciada.'); pintar(); actualizarSaldo(); }
      } })
    ]);
    jr.appendChild(pausas);
    if (Date.now() < w.limites.autoexcluidoHasta) {
      jr.appendChild(K.el('div', {
        class: 'info-bloque', style: 'margin-top:12px;border-color:var(--ambar);color:var(--ambar)',
        html: '⏸ Tienes una pausa activa hasta las ' + K.hora(w.limites.autoexcluidoHasta) + '. No puedes apostar hasta entonces.'
      }));
    }
    root.appendChild(caja('Juego responsable', jr));

    /* --- movimientos --- */
    const t = K.el('table', { class: 'tabla' });
    t.innerHTML = '<tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th><th>Monto</th><th>Saldo</th></tr>' +
      w.ledger.slice(0, 40).map(l => `<tr>
        <td>${K.fechaHora(l.t)}</td><td>${K.esc(l.tipo)}</td><td>${K.esc(l.det)}</td>
        <td class="${l.monto >= 0 ? 'pos' : 'neg'}">${l.monto >= 0 ? '+' : ''}${K.sol(l.monto)}</td>
        <td>${K.sol(l.saldo)}</td></tr>`).join('');
    root.appendChild(caja('Libro mayor de la cuenta', t));
  }

  const kpi = (et, vl, cls = '') => K.el('div', { class: 'kpi' }, [
    K.el('span', { class: 'et', text: et }), K.el('span', { class: 'vl ' + cls, text: vl })
  ]);
  const caja = (titulo, nodo) => {
    const c = K.el('div', { class: 'tarjeta', style: 'margin-bottom:14px' });
    c.appendChild(K.el('h3', { text: titulo }));
    c.appendChild(K.el('div', { class: 'cuerpo' }, [nodo]));
    return c;
  };
  function campoNumero(etiqueta, valor, onCambio) {
    const inp = K.el('input', { type: 'number', min: '1', value: valor });
    inp.onchange = () => { const v = Math.max(1, Number(inp.value) || 1); onCambio(v); K.aviso('Límite actualizado.'); };
    return K.el('div', { class: 'campo' }, [K.el('label', { text: etiqueta }), inp]);
  }

  function modalDeposito() {
    const cuerpo = K.el('div');
    const inp = K.el('input', { type: 'number', min: '10', step: '10', value: '200' });
    cuerpo.appendChild(K.el('div', { class: 'info-bloque', html:
      'Método simulado: <b>Yape · Plin · tarjeta</b>. No se pide ningún dato real y las fichas no tienen valor.' }));
    cuerpo.appendChild(K.el('div', { class: 'campo', style: 'margin-top:12px' }, [
      K.el('label', { text: 'Monto a recargar (S/)' }), inp,
      K.el('div', { class: 'fila-btns' }, [50, 100, 200, 500].map(v =>
        K.el('button', { text: v, onclick: () => inp.value = v })))
    ]));
    const btn = K.el('button', { class: 'btn', style: 'width:100%;margin-top:12px', text: 'Confirmar recarga' });
    cuerpo.appendChild(btn);
    const cerrar = K.modal('Depositar fichas demo', cuerpo, 'simulación');
    btn.onclick = () => {
      const r = K.Wallet.depositar(K.round2(Number(inp.value) || 0));
      if (!r.ok) { K.aviso(r.razon, 'err'); return; }
      K.aviso('Recarga acreditada.');
      cerrar(); actualizarSaldo(); if (vista === 'cuenta') pintar();
    };
  }

  function modalRetiro() {
    const w = K.Wallet.est();
    const cuerpo = K.el('div');
    const inp = K.el('input', { type: 'number', min: '10', step: '10', value: Math.min(100, Math.floor(w.saldo)) });
    cuerpo.appendChild(K.el('div', { class: 'info-bloque', html:
      `Para retirar hacen falta dos cosas, igual que en una casa regulada: identidad verificada y el
       rollover cumplido. Ahora mismo: KYC <b>${w.kyc.verificado ? 'ok' : 'pendiente'}</b>,
       rollover pendiente <b>${K.sol(w.rollover)}</b>.` }));
    cuerpo.appendChild(K.el('div', { class: 'campo', style: 'margin-top:12px' }, [
      K.el('label', { text: 'Monto a retirar (S/)' }), inp]));
    const btn = K.el('button', { class: 'btn', style: 'width:100%;margin-top:12px', text: 'Solicitar retiro' });
    cuerpo.appendChild(btn);
    const cerrar = K.modal('Retirar', cuerpo, 'simulación');
    btn.onclick = () => {
      const r = K.Wallet.retirar(K.round2(Number(inp.value) || 0));
      if (!r.ok) { K.aviso(r.razon, 'err'); return; }
      K.aviso('Retiro simulado procesado.');
      cerrar(); actualizarSaldo(); if (vista === 'cuenta') pintar();
    };
  }

  /* =========================================================
     CÓMO FUNCIONA — la parte teórica, con los números del sitio
     ========================================================= */
  function vistaComoFunciona(root) {
    root.innerHTML = '';
    root.appendChild(K.el('div', { class: 'titulo-sec' }, [
      K.el('h2', { text: '📐 Cómo funciona por dentro' }),
      K.el('span', { class: 'sub', text: 'La misma matemática que corre en el sitio, explicada' })
    ]));

    const ejemplo = K.EVENTOS.find(e => e.deporte === 'futbol' && !e.terminado) || K.EVENTOS[0];
    const merc = K.Odds.construir(ejemplo)[0];
    const filas = merc.sel.map(s =>
      `<tr><td>${K.esc(s.extra || s.lab)}</td><td>${K.dec(s.cuota)}</td><td>${K.pct(s.impl)}</td></tr>`).join('');

    const b1 = K.el('div', { class: 'info-bloque' });
    b1.innerHTML = `
      <h4>1. De la probabilidad a la cuota</h4>
      Para el fútbol el sitio usa un modelo de Poisson: con los goles esperados de cada equipo arma la
      matriz de todos los marcadores posibles y de ahí saca la probabilidad de cada mercado.
      <div class="formula">P(marcador i-j) = Poisson(λ_local, i) × Poisson(λ_visita, j)</div>
      Esas probabilidades suman 1.00 (cuotas justas). Después se les aplica el margen:
      <div class="formula">P'ᵢ = Pᵢ × M          Cuotaᵢ = 1 / P'ᵢ</div>
      Con M = 1.05 el libro suma 105% en vez de 100%: ese 5% es la ganancia estructural de la casa.
      <br><br><b>Ejemplo vivo — ${K.esc(ejemplo.local)} vs ${K.esc(ejemplo.visita)}:</b>
      <table class="tabla" style="margin-top:6px"><tr><th>Resultado</th><th>Cuota</th><th>Prob. implícita</th></tr>${filas}</table>
      <p style="margin-top:8px">Suma de implícitas: <b>${K.pct(merc.overround)}</b> → margen de
      <b>${K.pct(merc.overround - 1)}</b>. Si apuestas S/ 100 a la primera opción, cobras
      ${K.sol(100 * merc.sel[0].cuota)}: ${K.sol(100 * merc.sel[0].cuota - 100)} de ganancia neta más tu inversión.</p>`;
    root.appendChild(caja('Cuotas, probabilidad implícita y overround', b1));

    const b2 = K.el('div', { class: 'info-bloque' });
    b2.innerHTML = `
      <h4>2. Por qué la cuota se mueve sola</h4>
      Cada apuesta que aceptas carga el libro de un lado. El motor reparte el margen según ese
      desbalance, así que el lado que recibe dinero paga menos y el otro paga más. Puedes verlo en vivo:
      apuesta fuerte a un mercado y mira cómo baja su cuota en la lista.
      <div class="formula">P'ᵢ = Pᵢ × (1 + 0.9 × (pesoᵢ − 1/n))     con pesoᵢ = responsabilidad del resultado i</div>
      Cuando el desbalance es grande, una casa real suma dos herramientas más: mover la línea (esto) y
      cubrirse comprando la posición contraria en un exchange o en otra casa (<i>hedging</i>).`;
    root.appendChild(caja('Gestión de riesgo del libro', b2));

    const b3 = K.el('div', { class: 'info-bloque' });
    b3.innerHTML = `
      <h4>3. En vivo: latencia y suspensión</h4>
      <div class="formula">[Cancha] → 1-2 s → [Scout] → 100 ms → [Proveedor de datos]
        → 50 ms → [Motor de riesgo] → 3-8 s de delay → [Tu pantalla]</div>
      El retardo de 3 a 8 segundos al aceptar una apuesta en vivo no es lentitud: existe para frenar el
      <i>courtsiding</i>, que es apostar desde el estadio con información que todavía no llegó a la
      transmisión. Acá está implementado tal cual: cuando apuestas a un partido en vivo aparece la
      cuenta regresiva, y si en ese lapso cae un gol, tu apuesta se rechaza porque el mercado entra en
      <code>SUSPENDED</code> mientras se recalcula el modelo con el marcador nuevo.
      <br><br>El margen en vivo también sube: acá se le suman 2.5 puntos al margen de prepartido, porque
      la información envejece en segundos.`;
    root.appendChild(caja('Motor en vivo', b3));

    const b4 = K.el('div', { class: 'info-bloque' });
    b4.innerHTML = `
      <h4>4. El cashout no cancela nada</h4>
      Cobrar antes de tiempo es en realidad vender tu apuesta al precio actual del mercado:
      <div class="formula">Cashout = (Apuesta × Cuota bloqueada / Cuota actual) × (1 − margen)</div>
      Con S/ 100 a cuota 3.00, si el partido se pone de tu lado y la cuota vive ahora en 1.50 y la casa
      retiene un 5%: <b>100 × 3.00 / 1.50 × 0.95 = S/ 190</b>. Te aseguras 190 y la casa se libera del
      riesgo de pagarte 300. Esa retención del 5% es la comisión del servicio.`;
    root.appendChild(caja('Cashout', b4));

    const b5 = K.el('div', { class: 'info-bloque' });
    b5.innerHTML = `
      <h4>5. Ciclo de vida de una apuesta</h4>
      <table class="tabla">
        <tr><th>Etapa</th><th>Qué pasa por dentro</th></tr>
        <tr><td>Depósito</td><td>Pasarela acredita saldo y se abre el rollover 1×</td></tr>
        <tr><td>Selección</td><td>Se arma el boleto y se calcula el retorno potencial</td></tr>
        <tr><td>Validación</td><td>Límites de cuenta, saldo y delay de aceptación; si pasa, el importe se congela</td></tr>
        <tr><td>Evento</td><td>Cuotas vivas, cashout disponible, suspensiones por incidencias</td></tr>
        <tr><td>Liquidación</td><td>Con el resultado confirmado se paga o se pierde, y se registra el CLV</td></tr>
      </table>
      <p style="margin-top:8px">Sobre el perfilado: cada apuesta liquidada compara tu cuota contra la
      cuota de cierre. Si le ganas al mercado de forma sostenida, el sistema te baja el límite. Es
      incómodo pero es exactamente lo que hacen las casas reales, y por eso está acá.</p>`;
    root.appendChild(caja('Del depósito a la liquidación', b5));

    const b6 = K.el('div', { class: 'info-bloque' });
    b6.innerHTML = `
      <h4>6. Casino: dónde está la ventaja</h4>
      <table class="tabla">
        <tr><th>Juego</th><th>Retorno teórico</th><th>De dónde sale la ventaja</th></tr>
        <tr><td>Crash (Aviator, Spaceman…)</td><td>97%</td><td>3% de rondas que mueren en 1.00×</td></tr>
        <tr><td>Limbo</td><td>99%</td><td>P(x ≥ objetivo) = 0.99 / objetivo</td></tr>
        <tr><td>Mines</td><td>97%</td><td>El multiplicador vale 0.97 del pago justo</td></tr>
        <tr><td>Ruleta europea</td><td>97.3%</td><td>El cero: 37 casillas pagando como 36</td></tr>
        <tr><td>Tragamonedas</td><td>95-97%</td><td>Frecuencia de símbolos contra tabla de pagos</td></tr>
        <tr><td>Blackjack</td><td>~99.5%</td><td>El jugador actúa primero y se pasa antes</td></tr>
        <tr><td>Video póker 9/6</td><td>99.5%</td><td>Tabla de pagos ajustada a las manos posibles</td></tr>
      </table>
      <p style="margin-top:8px">Ninguno de estos números depende de la suerte ni de rachas: son el
      promedio al que converge cualquier jugador con volumen suficiente. Cuanto más juegas, más se
      parece tu resultado al RTP, y el RTP siempre es menor que 100%.</p>`;
    root.appendChild(caja('Matemática del casino', b6));
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function actualizarSaldo() {
    const w = K.Wallet.est();
    K.$('#saldo').textContent = K.sol(w.saldo);
  }

  function iniciar() {
    K.Wallet.init();
    actualizarSaldo();
    pintarNav();
    pintar();
    K.Sportsbook.iniciar();

    K.bus.on('saldo', actualizarSaldo);
    K.bus.on('apuestas', () => { pintarNav(); if (vista === 'apuestas') pintar(); });
    K.bus.on('lista', () => {
      pintarNav();
      if (vista === 'deportes' || vista === 'vivo') K.Sportsbook.vista(K.$('#main'));
    });

    K.$('#btn-deposito').onclick = modalDeposito;

    // Recordatorio de sesión cada 30 minutos, como exige el juego responsable.
    setInterval(() => {
      const min = Math.floor(K.Wallet.tiempoSesion() / 60000);
      const w = K.Wallet.est();
      if (min > 0 && min % w.limites.recordatorioMin === 0 && w.sesion.avisado !== min) {
        w.sesion.avisado = min;
        K.aviso(`⏱ Llevas ${min} minutos jugando. Buen momento para una pausa.`, 'warn');
      }
    }, 30000);

    // La vista "En vivo" comparte render con Deportes, solo cambia el filtro por defecto.
    K.bus.emit('lista');
  }

  return { iniciar, ir, pintar };
})();

document.addEventListener('DOMContentLoaded', K.App.iniciar);
