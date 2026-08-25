/* ===========================================================
   app.js — navegación, menú lateral, cuenta y arranque
   =========================================================== */

/* ---------- modal genérico ---------- */
K.modal = (titulo, nodo, sub = '', limpiar = null) => {
  const fondo = K.el('div', { class: 'modal-fondo' });
  const cerrar = () => {
    if (typeof limpiar === 'function') limpiar();
    fondo.remove();
    document.body.style.overflow = '';
  };
  const x = K.el('button', { class: 'x', 'aria-label': 'Cerrar', onclick: cerrar });
  x.innerHTML = K.ic('cerrar');
  const cab = K.el('div', { class: 'modal-cab' }, [
    K.el('h3', { text: titulo }),
    sub ? K.el('span', { class: 'prov', text: sub }) : null,
    x
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
    { id: 'deportes', nom: 'Deportes', ic: 'futbol', slip: true, lateral: 'deportes' },
    { id: 'vivo', nom: 'En vivo', ic: 'rayo', slip: true, lateral: 'deportes' },
    { id: 'casino', nom: 'Casino', ic: 'casino', lateral: 'casino' },
    { id: 'virtuales', nom: 'Virtuales', ic: 'objetivo' },
    { id: 'recompensas', nom: 'Recompensas', ic: 'copa' },
    { id: 'apuestas', nom: 'Mis apuestas', ic: 'recibo', lateral: 'deportes' },
    { id: 'cuenta', nom: 'Cuenta', ic: 'usuario' },
    { id: 'como', nom: 'Cómo funciona', ic: 'grafico' }
  ];

  /* =========================================================
     CABECERA Y NAVEGACIÓN
     ========================================================= */
  function pintarNav() {
    const nav = K.$('#nav');
    nav.innerHTML = '';
    const vivos = K.EVENTOS.filter(e => e.vivo).length;
    const pend = K.Wallet.est().apuestas.filter(a => a.estado === 'pendiente').length;
    VISTAS.forEach(v => {
      const b = K.el('button', { class: vista === v.id ? 'on' : '', onclick: () => ir(v.id) });
      const listas = K.Progreso ? K.Progreso.misionesListas() : 0;
      b.innerHTML = K.ic(v.ic) + '<span>' + v.nom + '</span>' +
        (v.id === 'vivo' && vivos ? `<span class="pip vivo">${vivos}</span>` : '') +
        (v.id === 'apuestas' && pend ? `<span class="pip">${pend}</span>` : '') +
        (v.id === 'recompensas' && listas ? `<span class="pip">${listas}</span>` : '');
      nav.appendChild(b);
    });
    const logo = K.$('#logo');
    if (logo && !logo.querySelector('svg')) logo.insertAdjacentHTML('afterbegin', K.ic('rayo'));
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
    const izq = K.$('#lat-izq');
    const der = K.$('#lat-der');
    const conf = VISTAS.find(v => v.id === vista);

    cont.classList.toggle('ancho', !conf.lateral);
    cont.classList.toggle('sin-slip', !!conf.lateral && !conf.slip);
    izq.style.display = conf.lateral ? '' : 'none';
    der.style.display = conf.slip ? '' : 'none';
    main.innerHTML = '';

    if (conf.lateral) pintarLateral(conf.lateral);

    if (vista === 'deportes' || vista === 'vivo') {
      K.Sportsbook.setVivo(vista === 'vivo');
      K.Sportsbook.vista(main);
      K.Sportsbook.pintarBoleto();
    } else if (vista === 'casino') K.Casino.vista(main);
    else if (vista === 'apuestas') K.Sportsbook.vistaApuestas(main);
    else if (vista === 'virtuales') K.Virtuales.vista(main);
    else if (vista === 'recompensas') vistaRecompensas(main);
    else if (vista === 'cuenta') vistaCuenta(main);
    else if (vista === 'como') vistaComoFunciona(main);
  }

  /* =========================================================
     MENÚ LATERAL
     ========================================================= */
  const ICONO_LIGA = liga =>
    /champions|libertadores|uefa/i.test(liga) ? 'escudo' :
    /perú|peru|liga 1/i.test(liga) ? 'trofeo' :
    /nba|acb/i.test(liga) ? 'basket' :
    /atp|wta/i.test(liga) ? 'tenis' :
    /cs2|lol|dota|valorant|vct|iem|esl|blast/i.test(liga) ? 'esports' : 'globo';

  function pintarLateral(tipo) {
    const izq = K.$('#lat-izq');
    izq.innerHTML = '';
    const panel = K.el('div', { class: 'panel-lat' });

    const grupo = (titulo) => {
      const g = K.el('div', { class: 'grupo' });
      if (titulo) g.appendChild(K.el('h4', { text: titulo }));
      panel.appendChild(g);
      return g;
    };

    if (tipo === 'deportes') {
      const gDep = grupo('Deportes');
      const cuenta = K.Sportsbook.porDeporte();
      K.DEPORTES.forEach(d => {
        const b = K.el('button', {
          class: (!K.Sportsbook.liga && K.Sportsbook.deporte === d.id && vista === 'deportes') ? 'on' : '',
          onclick: () => { K.Sportsbook.setDeporte(d.id); ir('deportes'); }
        });
        b.innerHTML = K.ic(K.icDeporte(d.id)) + `<span>${d.nom}</span><span class="cuenta">${cuenta[d.id] || 0}</span>`;
        gDep.appendChild(b);
      });

      const gLigas = grupo('Ligas populares');
      const ligas = K.Sportsbook.ligas();
      const tope = izq.dataset.todas ? ligas.length : 6;
      ligas.slice(0, tope).forEach(([liga, n]) => {
        const b = K.el('button', {
          class: K.Sportsbook.liga === liga ? 'on' : '',
          onclick: () => { K.Sportsbook.setLiga(K.Sportsbook.liga === liga ? null : liga); ir('deportes'); }
        });
        b.innerHTML = K.ic(ICONO_LIGA(liga)) + `<span>${K.esc(liga)}</span><span class="cuenta">${n}</span>`;
        gLigas.appendChild(b);
      });
      if (ligas.length > 6) {
        const ver = K.el('button', { style: 'color:var(--naranja);font-weight:700' });
        ver.innerHTML = K.ic('chevron') + '<span>' + (izq.dataset.todas ? 'Ver menos' : 'Ver las ' + ligas.length + ' competiciones') + '</span>';
        ver.onclick = () => {
          if (izq.dataset.todas) delete izq.dataset.todas; else izq.dataset.todas = '1';
          pintarLateral(tipo);
        };
        gLigas.appendChild(ver);
      }
    }

    if (tipo === 'casino') {
      const gCat = grupo('Categorías');
      K.CATEGORIAS.forEach(cat => {
        const n = cat.id === 'todos' ? K.JUEGOS.length : K.JUEGOS.filter(j => j.cat === cat.id).length;
        const b = K.el('button', {
          class: K.Casino.categoria === cat.id ? 'on' : '',
          onclick: () => { K.Casino.setCategoria(cat.id); pintar(); }
        });
        b.innerHTML = K.ic(cat.icono) + `<span>${cat.nom}</span><span class="cuenta">${n}</span>`;
        gCat.appendChild(b);
      });

      const gTop = grupo('Los más jugados');
      ['aviator', 'mines', 'limbo', 'dados', 'lightning', 'crazytime'].forEach(id => {
        const j = K.juego(id);
        if (!j) return;
        const b = K.el('button', { onclick: () => K.Casino.abrir(id) });
        b.innerHTML = `<span style="font-size:15px">${j.ic}</span><span>${K.esc(j.nom)}</span>`;
        gTop.appendChild(b);
      });
    }

    /* Bloque común: progreso del día y herramientas de sesión. */
    const w = K.Wallet.est();
    const min = Math.floor(K.Wallet.tiempoSesion() / 60000);
    const listas = K.Progreso.misionesListas();
    const gJuego = grupo('Tu día');

    const mis = K.Progreso.misionLista();
    if (mis.length) {
      const caja = K.el('div', { class: 'mision-mini' });
      mis.forEach(m => {
        const pc = Math.min(100, m.progreso / m.meta * 100);
        const l = K.el('div', { class: 'l' });
        l.innerHTML = K.ic(K.Progreso.misionCompleta(m) ? 'copa' : 'objetivo') +
          `<span style="flex:1">${K.esc(m.txt)}</span>`;
        if (m.cobrada) l.style.opacity = '.45';
        caja.appendChild(l);
        const barra = K.el('div', { class: 'barra' });
        barra.innerHTML = `<i style="width:${pc}%"></i>`;
        caja.appendChild(barra);
      });
      gJuego.appendChild(caja);
      const bMis = K.el('button', { onclick: () => ir('recompensas') });
      bMis.innerHTML = K.ic('copa') + '<span>Misiones y premios</span>' +
        (listas ? `<span class="cuenta" style="background:var(--naranja);color:#fff">${listas}</span>` : '');
      gJuego.appendChild(bMis);
    }

    const bDiaria = K.el('button', {
      class: K.Diaria.disponible() ? 'on' : '',
      onclick: () => K.Diaria.abrir()
    });
    bDiaria.innerHTML = K.ic('regalo') + '<span>Ruleta diaria</span>' +
      (K.Diaria.disponible() ? '<span class="cuenta" style="background:var(--naranja);color:#fff">libre</span>' : '');
    gJuego.appendChild(bDiaria);

    const gSesion = grupo('Tu sesión');
    gSesion.insertAdjacentHTML('beforeend',
      `<div class="pie-grupo">${K.ic('reloj')} ${min} min jugando ·
       límite ${K.sol(Math.min(w.limites.apuestaMax, w.perfil.limiteApuesta))} por apuesta</div>`);
    const bPausa = K.el('button', { onclick: () => { K.Wallet.pausar(15); K.aviso('Pausa de 15 minutos activada.', 'warn'); pintar(); } });
    bPausa.innerHTML = K.ic('pausa') + '<span>Pausar 15 minutos</span>';
    gSesion.appendChild(bPausa);

    izq.appendChild(panel);
  }

  /* =========================================================
     CUENTA
     ========================================================= */
  const barraSec = (titulo, sub, icono) => {
    const c = K.el('div', { class: 'sec-cab' });
    const h = K.el('h2');
    h.innerHTML = K.ic(icono) + '<span>' + K.esc(titulo) + '</span>';
    c.appendChild(h);
    const der = K.el('div', { class: 'der' });
    if (sub) der.appendChild(K.el('span', { class: 'nota', text: sub }));
    c.appendChild(der);
    return c;
  };
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
    inp.onchange = () => { const v = Math.max(1, Number(inp.value) || 1); onCambio(v); K.aviso('Límite actualizado.', 'ok'); };
    return K.el('div', { class: 'campo' }, [K.el('label', { text: etiqueta }), inp]);
  }

  function vistaCuenta(root) {
    const w = K.Wallet.est();
    root.innerHTML = '';
    root.appendChild(barraSec('Mi cuenta', 'saldo de demostración · nada de esto es dinero real', 'usuario'));

    const apostadoDep = w.apuestas.reduce((a, b) => a + b.stake, 0);
    const pagadoDep = w.apuestas.reduce((a, b) => a + b.pago, 0);
    const neto = K.round2(w.saldo - w.depositado);
    const rtpCasino = w.casino.apostado > 0 ? w.casino.devuelto / w.casino.apostado : null;

    root.appendChild(caja('Resumen', K.el('div', { class: 'grid2' }, [
      kpi('Saldo actual', K.sol(w.saldo)),
      kpi('Resultado neto', K.sol(neto), neto >= 0 ? 'pos' : 'neg'),
      kpi('Apostado en deportes', K.sol(apostadoDep)),
      kpi('Devuelto en deportes', K.sol(pagadoDep)),
      kpi('Apostado en casino', K.sol(w.casino.apostado)),
      kpi('RTP observado en casino', rtpCasino === null ? '—' : K.pct(rtpCasino))
    ])));

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
        El motor compara la cuota que tomaste contra la cuota con la que cerró el mercado justo antes
        del pitazo inicial. Si ganas valor de forma sistemática (<b>CLV positivo</b>) te clasifica como
        <i>sharp</i> y te recorta el límite: así funciona el <i>limiting</i> en las casas reales.
        ${w.perfil.marcas.length ? '<br><br><b>Marcas activas:</b><br>· ' + w.perfil.marcas.map(K.esc).join('<br>· ') : ''}
        ${clv.length < 8 ? '<br><br>Hacen falta al menos 8 apuestas prepartido liquidadas para que el perfil se calcule.' : ''}
      </div>`;
    const filaRiesgo = K.el('div', { class: 'dos-col' });
    filaRiesgo.appendChild(caja('Motor de riesgo y perfilado', perfil));
    filaRiesgo.appendChild(caja('Libro de la casa · responsabilidad abierta',
      K.el('div', { class: 'tabla-scroll' }, [K.Sportsbook.panelRiesgo()])));
    root.appendChild(filaRiesgo);

    /* --- pagos --- */
    const pagos = K.el('div');
    const rollBarra = w.depositado > 0 ? 1 - w.rollover / Math.max(w.depositado, 1) : 1;
    pagos.innerHTML = `
      <div class="info-bloque" style="margin-bottom:12px">
        <h4>Verificación de identidad (KYC)</h4>
        Estado: <b style="color:${w.kyc.verificado ? 'var(--verde-2)' : 'var(--ambar)'}">${w.kyc.verificado ? 'verificada' : 'pendiente'}</b>.
        En una plataforma real acá se cruzarían tus datos con RENIEC y una prueba de vida biométrica antes
        del primer retiro. Esta demo no pide ni guarda ningún dato personal: el botón solo simula el trámite.
      </div>
      <div class="info-bloque">
        <h4>Rollover pendiente</h4>
        Falta apostar <b>${K.sol(w.rollover)}</b> para liberar el retiro (regla 1× sobre lo depositado).
        <div class="barra"><i style="width:${K.clamp(rollBarra * 100, 0, 100)}%"></i></div>
      </div>`;
    pagos.appendChild(K.el('div', { class: 'acciones', style: 'margin-top:12px' }, [
      K.el('button', { class: 'btn', text: 'Depositar fichas demo', onclick: modalDeposito }),
      K.el('button', { class: 'btn sec', text: 'Retirar', onclick: modalRetiro }),
      K.el('button', {
        class: 'btn sec', text: w.kyc.verificado ? 'KYC verificado' : 'Simular verificación',
        onclick: () => { K.Wallet.verificarKYC(); K.aviso('Identidad verificada (simulación).', 'ok'); pintar(); }
      })
    ]));
    const filaPagos = K.el('div', { class: 'dos-col' });
    filaPagos.appendChild(caja('Pagos y cumplimiento', pagos));

    /* --- juego responsable --- */
    const jr = K.el('div');
    const min = Math.floor(K.Wallet.tiempoSesion() / 60000);
    jr.innerHTML = `<div class="info-bloque" style="margin-bottom:12px">
      Llevas <b>${min} minuto${min === 1 ? '' : 's'}</b> en esta sesión. Las herramientas de abajo
      funcionan igual que en una casa regulada: los límites se pueden bajar al instante y subir recién
      después de un período de espera.</div>`;
    const campos = K.el('div', { class: 'grid2' });
    campos.appendChild(campoNumero('Límite de depósito diario (S/)', w.limites.depositoDiario, v => { w.limites.depositoDiario = v; K.Wallet.persistir(); }));
    campos.appendChild(campoNumero('Apuesta máxima (S/)', w.limites.apuestaMax, v => { w.limites.apuestaMax = v; K.Wallet.persistir(); }));
    jr.appendChild(campos);
    jr.appendChild(K.el('div', { class: 'acciones', style: 'margin-top:12px' }, [
      K.el('button', { class: 'btn sec', text: 'Pausa de 15 min', onclick: () => { K.Wallet.pausar(15); K.aviso('Pausa activada por 15 minutos.', 'warn'); pintar(); } }),
      K.el('button', { class: 'btn sec', text: 'Pausa de 1 hora', onclick: () => { K.Wallet.pausar(60); K.aviso('Pausa activada por 1 hora.', 'warn'); pintar(); } }),
      K.el('button', {
        class: 'btn peligro', text: 'Reiniciar la demo', onclick: () => {
          if (confirm('Esto borra saldo, apuestas e historial de esta demo. ¿Continuar?')) {
            K.Wallet.reiniciar(); K.aviso('Demo reiniciada.', 'ok'); actualizarSaldo(); pintar();
          }
        }
      })
    ]));
    if (Date.now() < w.limites.autoexcluidoHasta) {
      jr.appendChild(K.el('div', {
        class: 'info-bloque', style: 'margin-top:12px;border-color:var(--ambar);color:var(--ambar)',
        html: 'Tienes una pausa activa hasta las ' + K.hora(w.limites.autoexcluidoHasta) + '. No puedes apostar hasta entonces.'
      }));
    }
    filaPagos.appendChild(caja('Juego responsable', jr));
    root.appendChild(filaPagos);

    /* --- movimientos --- */
    const t = K.el('table', { class: 'tabla' });
    t.innerHTML = '<tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th><th>Monto</th><th>Saldo</th></tr>' +
      w.ledger.slice(0, 40).map(l => `<tr>
        <td>${K.fechaHora(l.t)}</td><td>${K.esc(l.tipo)}</td><td>${K.esc(l.det)}</td>
        <td class="${l.monto >= 0 ? 'pos' : 'neg'}">${l.monto >= 0 ? '+' : ''}${K.sol(l.monto)}</td>
        <td>${K.sol(l.saldo)}</td></tr>`).join('');
    root.appendChild(caja('Libro mayor de la cuenta', K.el('div', { class: 'tabla-scroll' }, [t])));
  }

  /* =========================================================
     RECOMPENSAS
     ========================================================= */
  function vistaRecompensas(root) {
    const p = K.Progreso.est();
    root.innerHTML = '';
    root.appendChild(barraSec('Recompensas', 'niveles, misiones, torneo y jackpot', 'copa'));

    /* --- nivel --- */
    const falta = K.Progreso.xpNivel(p.nivel) - p.xp;
    const pct = p.xp / K.Progreso.xpNivel(p.nivel) * 100;
    const nivel = K.el('div');
    nivel.innerHTML = `
      <div class="grid2" style="margin-bottom:12px">
        <div class="kpi"><span class="et">Nivel actual</span><span class="vl">${p.nivel} · ${K.Progreso.nombreNivel(p.nivel)}</span></div>
        <div class="kpi"><span class="et">XP para el próximo</span><span class="vl">${falta}</span></div>
        <div class="kpi"><span class="et">Premio del próximo nivel</span><span class="vl pos">${K.sol(K.Progreso.premioNivel(p.nivel + 1))}</span></div>
        <div class="kpi"><span class="et">Giros gratis</span><span class="vl">${p.girosGratis}</span></div>
      </div>
      <div class="barra" style="height:10px"><i style="width:${pct}%"></i></div>
      <div style="margin-top:6px;font-size:11.5px;color:var(--tenue-2)">
        Ganas 1 XP por cada S/ 5 que apuestes, en deportes o en casino. Cada tres niveles caen además 5 giros gratis.
      </div>`;
    const filaArriba = K.el('div', { class: 'dos-col' });
    filaArriba.appendChild(caja('Tu nivel', nivel));

    /* --- misiones --- */
    const cont = K.el('div', { class: 'grid2' });
    K.Progreso.misionLista().forEach((m, i) => {
      const listo = K.Progreso.misionCompleta(m);
      const pc = Math.min(100, m.progreso / m.meta * 100);
      const nodo = K.el('div', { class: 'mision' + (listo ? ' lista' : '') });
      const prog = m.id === 'volumen' ? K.sol(m.progreso) + ' de ' + K.sol(m.meta)
        : Math.min(m.progreso, m.meta) + ' de ' + m.meta;
      nodo.innerHTML = `
        <span class="txt">${K.esc(m.txt)}</span>
        <span class="prog"><span class="barra"><i style="width:${pc}%"></i></span>${prog}</span>`;
      const pie = K.el('div', { class: 'pie' });
      pie.appendChild(K.el('span', { class: 'premio', text: K.sol(m.premio) + ' + 40 XP' }));
      if (m.cobrada) pie.appendChild(K.el('span', { style: 'margin-left:auto;color:var(--verde-2);font-weight:700;font-size:12px', text: 'cobrada' }));
      else {
        const btn = K.el('button', {
          class: 'btn chico' + (listo ? '' : ' sec'), text: listo ? 'Cobrar' : 'En progreso',
          onclick: () => { if (K.Progreso.cobrarMision(i)) { pintar(); actualizarSaldo(); } }
        });
        btn.disabled = !listo;
        pie.appendChild(btn);
      }
      nodo.appendChild(pie);
      cont.appendChild(nodo);
    });
    root.appendChild(filaArriba);
    root.appendChild(caja('Misiones de hoy · se renuevan a medianoche', cont));

    /* --- jackpot --- */
    const jp = K.el('div');
    jp.innerHTML = `
      <div class="jackpot-caja">
        <div class="et">Jackpot progresivo</div>
        <div class="monto" id="jackpot-monto">${K.sol(K.Progreso.jackpot())}</div>
        <div class="nota">Crece con el ${(K.Progreso.APORTE * 100).toFixed(1)}% de cada apuesta del casino
        y puede caer en cualquier giro de tragamonedas. Cuanto mayor la apuesta, más chances por giro.</div>
      </div>`;
    filaArriba.appendChild(caja('Bote y bonos', jp));

    /* --- diaria y cashback --- */
    const bonos = K.el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    const cbDisp = K.Progreso.cashbackDisponible();
    const cajaDiaria = K.el('div', { class: 'mision' });
    cajaDiaria.innerHTML = `<span class="txt">Ruleta diaria</span>
      <span class="prog">${K.Diaria.disponible() ? 'Tu giro está disponible' : 'Vuelve en ' + K.Diaria.reloj(K.Diaria.restante())}</span>`;
    const bd = K.el('div', { class: 'pie' }, [
      K.el('span', { class: 'premio', text: 'hasta ' + K.sol(1500) }),
      K.el('button', { class: 'btn chico', text: 'Abrir', onclick: () => K.Diaria.abrir() })
    ]);
    cajaDiaria.appendChild(bd);
    bonos.appendChild(cajaDiaria);

    const cajaCb = K.el('div', { class: 'mision' + (cbDisp >= 1 ? ' lista' : '') });
    cajaCb.innerHTML = `<span class="txt">Cashback semanal del ${(K.Progreso.CASHBACK * 100)}%</span>
      <span class="prog">Pérdidas netas de la semana: ${K.sol(p.cashback.perdidas)}</span>`;
    const bcb = K.el('div', { class: 'pie' }, [
      K.el('span', { class: 'premio', text: K.sol(cbDisp) })
    ]);
    const btnCb = K.el('button', {
      class: 'btn chico' + (cbDisp >= 1 ? '' : ' sec'), text: 'Cobrar',
      onclick: () => { K.Progreso.cobrarCashback(); pintar(); actualizarSaldo(); }
    });
    btnCb.disabled = cbDisp < 1;
    bcb.appendChild(btnCb);
    cajaCb.appendChild(bcb);
    bonos.appendChild(cajaCb);
    jp.appendChild(K.el('div', { style: 'height:12px' }));
    jp.appendChild(bonos);

    /* --- torneo --- */
    const t = K.el('div');
    const filas = K.Progreso.tabla();
    const miPos = filas.findIndex(f => f.yo) + 1;
    t.innerHTML = `<div class="info-bloque" style="margin-bottom:10px">
      Ranking de la semana <b>${K.Progreso.semana()}</b> por volumen apostado. Vas <b>${miPos}º</b> de ${filas.length}.
      Premios: ${K.Progreso.PREMIOS_TORNEO.map((x, i) => (i + 1) + 'º ' + K.sol(x)).join(' · ')}.
      Los rivales son simulados: nadie está jugando contra ti de verdad.</div>`;
    filas.forEach((f, i) => {
      const fila = K.el('div', { class: 'fila-torneo' + (f.yo ? ' yo' : '') });
      fila.innerHTML = `<span class="pos">${i + 1}º</span>
        <span class="medalla">${i < 3 ? ['🥇', '🥈', '🥉'][i] : ''}</span>
        <span>${K.esc(f.n)}</span><span class="pts">${f.p.toLocaleString('es-PE')} pts</span>`;
      t.appendChild(fila);
    });
    const filaAbajo = K.el('div', { class: 'dos-col' });
    filaAbajo.appendChild(caja('Torneo semanal', t));

    /* --- logros --- */
    const logros = K.Progreso.logros();
    const hechos = logros.filter(l => l.hecho).length;
    const gl = K.el('div', { class: 'logros-grid una-col' });
    logros.forEach(l => {
      const nodo = K.el('div', { class: 'logro' + (l.hecho ? ' hecho' : '') });
      const pc = Math.min(100, l.progreso / l.meta * 100);
      nodo.innerHTML = `
        <span class="ins">${l.hecho ? K.ic('copa') : K.ic('candado')}</span>
        <span class="cuerpo">
          <span class="nom">${K.esc(l.nom)}</span>
          <span class="desc">${K.esc(l.desc)}</span>
          ${l.hecho ? '<span class="cobrado">cobrado · ' + K.sol(l.premio) + '</span>'
            : `<span class="barra"><i style="width:${pc}%"></i></span>
               <span class="desc">${l.progreso} de ${l.meta} · premio ${K.sol(l.premio)}</span>`}
        </span>`;
      gl.appendChild(nodo);
    });
    filaAbajo.appendChild(caja('Logros · ' + hechos + ' de ' + logros.length, gl));
    root.appendChild(filaAbajo);

    /* --- transparencia --- */
    const tr = K.el('div', { class: 'info-bloque' });
    tr.innerHTML = `
      <h4>Por qué todo esto engancha</h4>
      Cada cosa de esta página tiene un motivo de diseño, y no es que la pases bien:
      <div class="tabla-scroll"><table class="tabla" style="margin-top:6px">
        <tr><th>Mecánica</th><th>Qué activa</th></tr>
        <tr><td>Misiones diarias</td><td>Te dan una razón para entrar hoy aunque no tuvieras ganas</td></tr>
        <tr><td>Racha de la ruleta diaria</td><td>Miedo a perder lo acumulado: cortar la racha “duele” más que el premio</td></tr>
        <tr><td>Niveles y XP</td><td>Progreso visible que sigue avanzando aunque estés perdiendo dinero</td></tr>
        <tr><td>Jackpot progresivo</td><td>Un premio enorme e improbable que hace que cada giro “podría ser el bueno”</td></tr>
        <tr><td>Cashback</td><td>Convierte una pérdida en una recompensa y empuja a seguir jugando</td></tr>
        <tr><td>Torneo</td><td>Compara tu volumen con otros: premia apostar más, no apostar mejor</td></tr>
        <tr><td>Cuotas que se mueven y cuentas atrás</td><td>Urgencia: decidir rápido y sin pensarlo</td></tr>
      </table></div>
      <p style="margin-top:8px">Nada de esto cambia el RTP: los premios que ves acá salen del mismo margen
      que la casa te cobra en cada apuesta. En una plataforma real, un bono nunca es un regalo,
      es una inversión en que sigas jugando. Acá está a la vista para que lo reconozcas cuando lo veas afuera.</p>`;
    root.appendChild(caja('La letra chica de las recompensas', tr));
  }

  /* ---------- depósito y retiro ---------- */
  function modalDeposito() {
    const cuerpo = K.el('div');
    const inp = K.el('input', { type: 'number', min: '10', step: '10', value: '2000' });
    cuerpo.appendChild(K.el('div', {
      class: 'info-bloque',
      html: 'Método simulado: <b>Yape · Plin · tarjeta</b>. No se pide ningún dato real y las fichas no tienen valor.'
    }));
    cuerpo.appendChild(K.el('div', { class: 'campo', style: 'margin-top:12px' }, [
      K.el('label', { text: 'Monto a recargar (S/)' }), inp,
      K.el('div', { class: 'fila-btns' }, [500, 1000, 2500, 5000].map(v =>
        K.el('button', { text: v, onclick: () => inp.value = v })))
    ]));
    const btn = K.el('button', { class: 'btn bloque', style: 'margin-top:12px', text: 'Confirmar recarga' });
    cuerpo.appendChild(btn);

    /* --- puerta al panel de administración --- */
    const puerta = K.el('div', { class: 'puerta-admin' });
    const pintarPuerta = () => {
      puerta.innerHTML = '';
      if (K.Admin.desbloqueado()) {
        puerta.appendChild(K.el('button', {
          class: 'btn sec bloque', text: 'Abrir panel de administración',
          onclick: () => { cerrar(); modalAdmin(); }
        }));
        return;
      }
      const codigo = K.el('input', { type: 'password', inputmode: 'numeric', placeholder: 'Código', maxlength: '12' });
      const entrar = () => {
        if (!K.Admin.desbloquear(codigo.value)) {
          codigo.value = '';
          codigo.classList.add('mal');
          setTimeout(() => codigo.classList.remove('mal'), 600);
          K.aviso('Código incorrecto.', 'err');
          return;
        }
        K.aviso('Panel de administración desbloqueado.', 'ok');
        cerrar(); modalAdmin();
      };
      codigo.onkeydown = e => { if (e.key === 'Enter') entrar(); };
      puerta.appendChild(K.el('label', { text: 'Acceso de administrador' }));
      puerta.appendChild(K.el('div', { class: 'fila-codigo' }, [
        codigo, K.el('button', { class: 'btn sec', text: 'Entrar', onclick: entrar })
      ]));
    };
    pintarPuerta();
    cuerpo.appendChild(puerta);

    const cerrar = K.modal('Depositar fichas demo', cuerpo, 'simulación');
    btn.onclick = () => {
      const r = K.Wallet.depositar(K.round2(Number(inp.value) || 0));
      if (!r.ok) { K.aviso(r.razon, 'err'); return; }
      K.aviso('Recarga acreditada.', 'ok');
      cerrar(); actualizarSaldo(); if (vista === 'cuenta') pintar();
    };
  }

  /* ---------- panel de administración ---------- */
  function modalAdmin() {
    const cuerpo = K.el('div', { class: 'admin' });
    let cerrar = null;

    const refrescar = () => {
      actualizarSaldo();
      if (vista === 'cuenta' || vista === 'recompensas') pintar();
      K.$('.admin-saldo', cuerpo).textContent = K.sol(K.Wallet.est().saldo);
    };

    cuerpo.appendChild(K.el('div', {
      class: 'info-bloque',
      html: 'Atajo para probar la página sin tener que juntar saldo jugando. Las fichas siguen sin ' +
        'valer nada: lo que cambia acá no sale del límite diario ni suma rollover.'
    }));

    cuerpo.appendChild(K.el('div', { class: 'admin-cifra' }, [
      K.el('span', { text: 'Saldo actual' }),
      K.el('b', { class: 'admin-saldo', text: K.sol(K.Wallet.est().saldo) })
    ]));

    /* --- añadir fichas --- */
    const monto = K.el('input', { type: 'number', step: '100', value: '10000' });
    const aplicar = (fn, ok) => {
      const r = fn();
      if (r && !r.ok) { K.aviso(r.razon, 'err'); return; }
      K.aviso(ok, 'ok');
      refrescar();
    };
    const bloqueMonto = K.el('div', { class: 'campo' }, [
      K.el('label', { text: 'Monto (S/)' }), monto,
      K.el('div', { class: 'fila-btns' }, [
        ['1 mil', 1000], ['10 mil', 10000], ['100 mil', 100000], ['1 millón', 1000000]
      ].map(([etiqueta, v]) => K.el('button', { text: etiqueta, onclick: () => monto.value = v })))
    ]);
    bloqueMonto.appendChild(K.el('div', { class: 'acciones', style: 'margin-top:10px' }, [
      K.el('button', { class: 'btn', text: 'Añadir al saldo', onclick: () => aplicar(() => K.Admin.acreditar(monto.value), 'Fichas acreditadas.') }),
      K.el('button', { class: 'btn sec', text: 'Fijar como saldo', onclick: () => aplicar(() => K.Admin.fijarSaldo(monto.value), 'Saldo actualizado.') }),
      K.el('button', { class: 'btn sec', text: 'Descontar', onclick: () => aplicar(() => K.Admin.acreditar(-Math.abs(Number(monto.value) || 0)), 'Fichas descontadas.') })
    ]));
    cuerpo.appendChild(seccionAdmin('Fichas', bloqueMonto));

    /* --- desbloqueos --- */
    const extras = K.el('div', { class: 'acciones' }, [
      K.el('button', {
        class: 'btn sec', text: 'Liberar el retiro',
        onclick: () => aplicar(() => K.Admin.liberarRetiro(), 'KYC verificado y rollover en cero.')
      }),
      K.el('button', {
        class: 'btn sec', text: 'Soltar los límites',
        onclick: () => aplicar(() => K.Admin.soltarLimites(), 'Límite diario y apuesta máxima al tope.')
      }),
      K.el('button', {
        class: 'btn sec', text: 'Subir 5 niveles',
        onclick: () => aplicar(() => K.Admin.subirNiveles(5), 'Cinco niveles arriba.')
      })
    ]);
    cuerpo.appendChild(seccionAdmin('Desbloqueos', extras));

    /* --- reinicio --- */
    const peligro = K.el('div', { class: 'acciones' }, [
      K.el('button', {
        class: 'btn peligro', text: 'Reiniciar la demo', onclick: () => {
          if (!confirm('Esto borra saldo, apuestas e historial de esta demo. ¿Continuar?')) return;
          K.Wallet.reiniciar();
          K.aviso('Demo reiniciada.', 'ok');
          cerrar(); actualizarSaldo(); pintar();
        }
      })
    ]);
    cuerpo.appendChild(seccionAdmin('Zona de peligro', peligro));

    cerrar = K.modal('Panel de administración', cuerpo, 'solo demo');
  }

  function seccionAdmin(titulo, nodo) {
    return K.el('div', { class: 'admin-seccion' }, [
      K.el('h4', { text: titulo }), nodo
    ]);
  }

  function modalRetiro() {
    const w = K.Wallet.est();
    const cuerpo = K.el('div');
    const inp = K.el('input', { type: 'number', min: '10', step: '10', value: Math.min(100, Math.floor(w.saldo)) });
    cuerpo.appendChild(K.el('div', {
      class: 'info-bloque',
      html: `Para retirar hacen falta dos cosas, igual que en una casa regulada: identidad verificada y
        rollover cumplido. Ahora mismo: KYC <b>${w.kyc.verificado ? 'ok' : 'pendiente'}</b>,
        rollover pendiente <b>${K.sol(w.rollover)}</b>.`
    }));
    cuerpo.appendChild(K.el('div', { class: 'campo', style: 'margin-top:12px' }, [
      K.el('label', { text: 'Monto a retirar (S/)' }), inp]));
    const btn = K.el('button', { class: 'btn bloque', style: 'margin-top:12px', text: 'Solicitar retiro' });
    cuerpo.appendChild(btn);
    const cerrar = K.modal('Retirar', cuerpo, 'simulación');
    btn.onclick = () => {
      const r = K.Wallet.retirar(K.round2(Number(inp.value) || 0));
      if (!r.ok) { K.aviso(r.razon, 'err'); return; }
      K.aviso('Retiro simulado procesado.', 'ok');
      cerrar(); actualizarSaldo(); if (vista === 'cuenta') pintar();
    };
  }

  /* =========================================================
     CÓMO FUNCIONA
     ========================================================= */
  function vistaComoFunciona(root) {
    root.innerHTML = '';
    root.appendChild(barraSec('Cómo funciona por dentro', 'la misma matemática que corre en el sitio', 'grafico'));

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
      Con M = 1.05 el libro suma 105% en vez de 100%. Ese 5% es la ganancia estructural de la casa.
      <br><br><b>Ejemplo en vivo — ${K.esc(ejemplo.local)} vs ${K.esc(ejemplo.visita)}:</b>
      <div class="tabla-scroll"><table class="tabla" style="margin-top:6px">
        <tr><th>Resultado</th><th>Cuota</th><th>Prob. implícita</th></tr>${filas}</table></div>
      <p style="margin-top:8px">Suma de implícitas: <b>${K.pct(merc.overround)}</b> → margen de
      <b>${K.pct(merc.overround - 1)}</b>. Si apuestas S/ 100 a la primera opción cobras
      ${K.sol(100 * merc.sel[0].cuota)}: ${K.sol(100 * merc.sel[0].cuota - 100)} de ganancia neta más tu inversión.</p>`;
    root.appendChild(caja('Cuotas, probabilidad implícita y overround', b1));

    const b2 = K.el('div', { class: 'info-bloque' });
    b2.innerHTML = `
      <h4>2. Por qué la cuota se mueve sola</h4>
      Cada apuesta que aceptas carga el libro de un lado. El motor reparte el margen según ese
      desbalance, así que el lado que recibe dinero paga menos y el otro paga más. Se ve en el sitio:
      apuesta fuerte a un mercado y mira cómo baja su cuota en la lista.
      <div class="formula">P'ᵢ = Pᵢ × (1 + 0.9 × (pesoᵢ − 1/n))     pesoᵢ = responsabilidad del resultado i</div>
      Cuando el desbalance es grande, una casa real suma otra herramienta: cubrirse comprando la
      posición contraria en un exchange o en otra casa (<i>hedging</i>).`;
    const filaB = K.el('div', { class: 'dos-col' });
    filaB.appendChild(caja('Gestión de riesgo del libro', b2));

    const b3 = K.el('div', { class: 'info-bloque' });
    b3.innerHTML = `
      <h4>3. En vivo: latencia y suspensión</h4>
      <div class="formula">[Cancha] → 1-2 s → [Scout] → 100 ms → [Proveedor de datos]
        → 50 ms → [Motor de riesgo] → 3-8 s de delay → [Tu pantalla]</div>
      El retardo de 3 a 8 segundos al aceptar una apuesta en vivo no es lentitud: frena el
      <i>courtsiding</i>, que es apostar desde el estadio con información que todavía no llegó a la
      transmisión. Acá está implementado tal cual: al apostar a un partido en vivo aparece la cuenta
      regresiva, y si en ese lapso cae un gol la apuesta se rechaza porque el mercado entra en
      <code>SUSPENDED</code> mientras se recalcula el modelo con el marcador nuevo.
      <br><br>El margen en vivo también sube: acá se le suman 2.5 puntos al de prepartido, porque la
      información envejece en segundos.`;
    filaB.appendChild(caja('Motor en vivo', b3));
    root.appendChild(filaB);

    const b4 = K.el('div', { class: 'info-bloque' });
    b4.innerHTML = `
      <h4>4. El cashout no cancela nada</h4>
      Cobrar antes de tiempo es vender tu apuesta al precio actual del mercado:
      <div class="formula">Cashout = (Apuesta × Cuota bloqueada / Cuota actual) × (1 − margen)</div>
      Con S/ 100 a cuota 3.00, si el partido se pone de tu lado y la cuota vive ahora en 1.50 y la casa
      retiene un 5%: <b>100 × 3.00 / 1.50 × 0.95 = S/ 190</b>. Te aseguras 190 y la casa se libera del
      riesgo de pagarte 300. Esa retención del 5% es la comisión del servicio.`;
    const filaC = K.el('div', { class: 'dos-col' });
    filaC.appendChild(caja('Cashout', b4));

    const b5 = K.el('div', { class: 'info-bloque' });
    b5.innerHTML = `
      <h4>5. Ciclo de vida de una apuesta</h4>
      <div class="tabla-scroll"><table class="tabla">
        <tr><th>Etapa</th><th>Qué pasa por dentro</th></tr>
        <tr><td>Depósito</td><td>La pasarela acredita saldo y se abre el rollover 1×</td></tr>
        <tr><td>Selección</td><td>Se arma el boleto y se calcula el retorno potencial</td></tr>
        <tr><td>Validación</td><td>Límites de cuenta, saldo y delay de aceptación; si pasa, el importe se congela</td></tr>
        <tr><td>Evento</td><td>Cuotas vivas, cashout disponible, suspensiones por incidencias</td></tr>
        <tr><td>Liquidación</td><td>Con el resultado confirmado se paga o se pierde, y se registra el CLV</td></tr>
      </table></div>`;
    filaC.appendChild(caja('Del depósito a la liquidación', b5));
    root.appendChild(filaC);

    const b6 = K.el('div', { class: 'info-bloque' });
    b6.innerHTML = `
      <h4>6. Casino: dónde está la ventaja</h4>
      <div class="tabla-scroll"><table class="tabla">
        <tr><th>Juego</th><th>Retorno teórico</th><th>De dónde sale la ventaja</th></tr>
        <tr><td>Crash (Aviator, Spaceman…)</td><td>97%</td><td>3% de rondas que mueren en 1.00×</td></tr>
        <tr><td>Limbo</td><td>99%</td><td>P(x ≥ objetivo) = 0.99 / objetivo</td></tr>
        <tr><td>Mines</td><td>97%</td><td>El multiplicador vale 0.97 del pago justo</td></tr>
        <tr><td>Ruleta europea</td><td>97.3%</td><td>El cero: 37 casillas pagando como 36</td></tr>
        <tr><td>Ruedas de game show</td><td>96%</td><td>Pago = 0.96 × casillas totales / casillas del resultado</td></tr>
        <tr><td>Tragamonedas</td><td>95-97%</td><td>Frecuencia de símbolos contra tabla de pagos</td></tr>
        <tr><td>Blackjack</td><td>~99.5%</td><td>El jugador actúa primero y se pasa antes</td></tr>
        <tr><td>Video póker 9/6</td><td>99.5%</td><td>Tabla de pagos ajustada a las manos posibles</td></tr>
      </table></div>
      <p style="margin-top:8px">Ninguno de estos números depende de la suerte ni de rachas: son el
      promedio al que converge cualquier jugador con volumen suficiente. Cuanto más juegas, más se
      parece tu resultado al RTP, y el RTP siempre es menor que 100%.</p>`;
    root.appendChild(caja('Matemática del casino', b6));

    const b7 = K.el('div', { class: 'info-bloque' });
    const pr = K.Diaria.PREMIOS;
    const pesoTotal = pr.reduce((x, y) => x + y.peso, 0);
    const ev = pr.reduce((x, y) => x + y.monto * y.peso / pesoTotal, 0);
    b7.innerHTML = `
      <h4>7. Las promociones también son matemática</h4>
      Las dos promos del sitio están calculadas, no puestas al azar:
      <div class="tabla-scroll"><table class="tabla">
        <tr><th>Promoción</th><th>Qué hace</th><th>Costo para la casa</th></tr>
        <tr><td>SuperCuota</td><td>Vende una combinación por encima de su precio justo</td>
          <td>Margen negativo: paga un 24% más que la cuota justa</td></tr>
        <tr><td>Ruleta diaria</td><td>Un giro gratis cada 20 horas, con bonus de racha</td>
          <td>Valor esperado de <b>${K.sol(ev)}</b> por giro, hasta ${K.sol(ev * 1.5)} con racha máxima</td></tr>
      </table></div>
      <p style="margin-top:8px">Una casa real hace exactamente esto: regala valor medido a cambio de que
      vuelvas, sabiendo que el margen del resto del catálogo lo recupera con creces. La racha de la
      ruleta diaria no está para premiarte, está para que entres todos los días.</p>
      <p style="margin-top:8px">El sitio suma además niveles, misiones diarias, logros, torneo semanal,
      cashback y jackpot progresivo. En la pestaña <b>Recompensas</b> está el desglose de qué palanca
      psicológica mueve cada uno: es la parte que ninguna casa real te va a explicar.</p>
      <p style="margin-top:8px">Los <b>virtuales</b> son el caso extremo: una carrera cada minuto, margen
      del 14% y resultado sorteado antes de que arranque la animación. No existen para que veas una
      carrera, existen para que no tengas que esperar a que se juegue un partido.</p>`;
    root.appendChild(caja('Promociones y bonos', b7));
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function actualizarSaldo() {
    K.$('#saldo').textContent = K.sol(K.Wallet.est().saldo);
  }

  function actualizarNivel() {
    const chip = K.$('#nivel-chip');
    if (!chip || !K.Progreso) return;
    const p = K.Progreso.est();
    K.$('.n', chip).textContent = p.nivel;
    K.$('.et', chip).textContent = K.Progreso.nombreNivel(p.nivel);
    K.$('.barra i', chip).style.width = (p.xp / K.Progreso.xpNivel(p.nivel) * 100) + '%';
    chip.title = `Nivel ${p.nivel} · ${p.xp} de ${K.Progreso.xpNivel(p.nivel)} XP`;
  }

  function iniciar() {
    K.Wallet.init();
    K.Progreso.init();
    actualizarSaldo();
    actualizarNivel();
    pintarNav();
    pintar();
    K.Sportsbook.iniciar();
    K.Virtuales.iniciar();

    K.bus.on('saldo', actualizarSaldo);
    K.bus.on('xp', actualizarNivel);
    K.bus.on('progreso', () => {
      actualizarNivel();
      pintarNav();
      if (vista === 'recompensas') pintar();
      if (K.$('#lat-izq').style.display !== 'none') {
        const conf = VISTAS.find(v => v.id === vista);
        if (conf && conf.lateral) pintarLateral(conf.lateral);
      }
    });
    K.$('#nivel-chip').onclick = () => ir('recompensas');
    K.bus.on('apuestas', () => { pintarNav(); if (vista === 'apuestas') pintar(); });
    K.bus.on('lista', () => {
      pintarNav();
      if (vista === 'deportes' || vista === 'vivo') {
        K.Sportsbook.vista(K.$('#main'));
        pintarLateral('deportes');
      }
    });

    K.$('#btn-deposito').onclick = modalDeposito;

    const btnDiaria = K.$('#btn-diaria');
    K.$('.ic-diaria', btnDiaria).innerHTML = K.ic('regalo');
    btnDiaria.onclick = () => K.Diaria.abrir();
    const refrescarDiaria = () => {
      const libre = K.Diaria.disponible();
      btnDiaria.classList.toggle('lista', libre);
      btnDiaria.title = libre ? 'Tu giro diario está disponible' : 'Próximo giro en ' + K.Diaria.reloj(K.Diaria.restante());
    };
    refrescarDiaria();
    setInterval(refrescarDiaria, 20000);
    K.bus.on('diaria', () => { refrescarDiaria(); if (vista === 'cuenta') pintar(); });

    // Recordatorio de sesión, como exige el juego responsable.
    setInterval(() => {
      const min = Math.floor(K.Wallet.tiempoSesion() / 60000);
      const w = K.Wallet.est();
      if (min > 0 && min % w.limites.recordatorioMin === 0 && w.sesion.avisado !== min) {
        w.sesion.avisado = min;
        K.aviso(`Llevas ${min} minutos jugando. Buen momento para una pausa.`, 'warn');
      }
    }, 30000);
  }

  return { iniciar, ir, pintar, vistaActual: () => vista };
})();

document.addEventListener('DOMContentLoaded', K.App.iniciar);
