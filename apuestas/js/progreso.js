/* ===========================================================
   progreso.js — capa de enganche: niveles, misiones diarias,
   torneo semanal, cashback y jackpot progresivo.
   Todo esto existe para que vuelvas: está copiado de lo que
   hacen las casas reales y explicado en "Cómo funciona".
   =========================================================== */
K.Progreso = (() => {

  /* ---------------- niveles ---------------- */
  const xpNivel = n => Math.round(120 * Math.pow(n, 1.55));
  const NOMBRES = ['Novato', 'Aficionado', 'Habitual', 'Bronce', 'Plata', 'Oro',
    'Platino', 'Diamante', 'Élite', 'Leyenda'];
  const nombreNivel = n => NOMBRES[Math.min(NOMBRES.length - 1, Math.floor((n - 1) / 3))];
  const premioNivel = n => 50 + n * 25;

  /* ---------------- misiones ---------------- */
  const CATALOGO = [
    { id: 'giros', txt: 'Da {m} giros en tragamonedas', metas: [10, 15, 25], premio: [80, 120, 180] },
    { id: 'apuestas', txt: 'Coloca {m} apuestas deportivas', metas: [2, 3, 5], premio: [90, 140, 220] },
    { id: 'deportes', txt: 'Apuesta en {m} deportes distintos', metas: [2, 3], premio: [120, 200] },
    { id: 'juegos', txt: 'Prueba {m} juegos distintos del casino', metas: [3, 4], premio: [110, 170] },
    { id: 'ganadas', txt: 'Gana {m} rondas en el casino', metas: [3, 5, 8], premio: [100, 150, 240] },
    { id: 'volumen', txt: 'Apuesta S/ {m} en total', metas: [200, 400, 800], premio: [90, 160, 280] },
    { id: 'crash', txt: 'Cobra un crash en {m}× o más', metas: [2, 3], premio: [130, 210] },
    { id: 'ruleta', txt: 'Gana {m} giros en la ruleta', metas: [1, 2], premio: [120, 200] },
    { id: 'combinada', txt: 'Arma {m} apuesta combinada', metas: [1, 2], premio: [140, 230] }
  ];

  const hoy = () => new Date().toISOString().slice(0, 10);
  const semana = () => {
    const d = new Date();
    const ini = new Date(d.getFullYear(), 0, 1);
    const sem = Math.ceil(((d - ini) / 86400000 + ini.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + sem;
  };

  const base = () => ({
    xp: 0, nivel: 1, xpTotal: 0,
    misiones: { dia: '', lista: [] },
    cashback: { semana: '', perdidas: 0, cobrado: 0 },
    jackpot: 5000,
    torneo: { semana: '', puntos: 0, rivales: [] },
    girosGratis: 0,
    vistos: { juegos: [], deportes: [] }
  });

  const est = () => {
    const w = K.Wallet.est();
    if (!w.progreso) w.progreso = base();
    for (const [k, v] of Object.entries(base())) if (w.progreso[k] === undefined) w.progreso[k] = v;
    return w.progreso;
  };

  /* ---------------- arranque diario / semanal ---------------- */
  function init() {
    const p = est();
    if (p.misiones.dia !== hoy()) nuevasMisiones();
    if (p.torneo.semana !== semana()) nuevoTorneo();
    if (p.cashback.semana !== semana()) {
      p.cashback = { semana: semana(), perdidas: 0, cobrado: 0 };
    }
    K.Wallet.persistir();
  }

  function nuevasMisiones() {
    const p = est();
    const elegidas = K.mezcla(CATALOGO.slice()).slice(0, 3);
    p.misiones = {
      dia: hoy(),
      lista: elegidas.map(m => {
        const i = K.entero(0, m.metas.length - 1);
        return {
          id: m.id, meta: m.metas[i], premio: m.premio[i], progreso: 0, cobrada: false,
          txt: m.txt.replace('{m}', m.id === 'volumen' ? m.metas[i] : m.metas[i])
        };
      })
    };
    p.vistos = { juegos: [], deportes: [] };
  }

  /* Rivales simulados del torneo, con nombres neutros. */
  function nuevoTorneo() {
    const p = est();
    const nombres = ['Rojo42', 'Kata_9', 'ElTanque', 'MiaP', 'NicoZ', 'Lupe77', 'Drako', 'SaraV',
      'Pipe', 'ValenT', 'Choco', 'Runa', 'Mati_88', 'Kira', 'Zeta'];
    p.torneo = {
      semana: semana(),
      puntos: 0,
      rivales: K.mezcla(nombres).slice(0, 9).map(n => ({ n, p: K.entero(180, 2600) }))
    };
  }

  /* ---------------- XP y nivel ---------------- */
  function sumarXP(cantidad) {
    const p = est();
    p.xp += cantidad;
    p.xpTotal += cantidad;
    let subio = 0;
    while (p.xp >= xpNivel(p.nivel)) {
      p.xp -= xpNivel(p.nivel);
      p.nivel++;
      subio = p.nivel;
      const premio = premioNivel(p.nivel);
      K.Wallet.mover(premio, 'premio', 'Recompensa por llegar al nivel ' + p.nivel);
      if (p.nivel % 3 === 0) p.girosGratis += 5;
    }
    if (subio) {
      K.aviso(`¡Nivel ${subio} alcanzado! ${K.sol(premioNivel(subio))} de premio` +
        (subio % 3 === 0 ? ' y 5 giros gratis' : ''), 'ok');
      K.confeti();
      K.bus.emit('progreso');
    }
    K.bus.emit('xp');
  }

  /* ---------------- registro de actividad ---------------- */
  /* tipo: apuesta | casino | ganada | crash | ruleta | combinada */
  function registrar(tipo, datos = {}) {
    const p = est();
    if (p.misiones.dia !== hoy()) nuevasMisiones();
    if (p.torneo.semana !== semana()) nuevoTorneo();

    const monto = datos.monto || 0;
    if (monto > 0) {
      sumarXP(Math.max(1, Math.round(monto / 5)));
      p.torneo.puntos += Math.round(monto);
    }
    if (datos.juego && !p.vistos.juegos.includes(datos.juego)) p.vistos.juegos.push(datos.juego);
    if (datos.deporte && !p.vistos.deportes.includes(datos.deporte)) p.vistos.deportes.push(datos.deporte);

    for (const m of p.misiones.lista) {
      if (m.cobrada) continue;
      if (m.id === 'giros' && tipo === 'casino' && datos.motor === 'slot') m.progreso++;
      if (m.id === 'apuestas' && tipo === 'apuesta') m.progreso++;
      if (m.id === 'deportes') m.progreso = p.vistos.deportes.length;
      if (m.id === 'juegos') m.progreso = p.vistos.juegos.length;
      if (m.id === 'ganadas' && tipo === 'ganada') m.progreso++;
      if (m.id === 'volumen' && monto > 0) m.progreso = K.round2(m.progreso + monto);
      if (m.id === 'crash' && tipo === 'crash' && datos.mult >= m.meta) m.progreso = m.meta;
      if (m.id === 'ruleta' && tipo === 'ruleta') m.progreso++;
      if (m.id === 'combinada' && tipo === 'combinada') m.progreso++;
      if (m.progreso > m.meta) m.progreso = m.meta;
    }
    K.Wallet.persistir();
    K.bus.emit('progreso');
  }

  /* Resultado neto de una ronda, para alimentar el cashback. */
  function resultado(neto) {
    const p = est();
    p.cashback.perdidas = K.round2(Math.max(0, p.cashback.perdidas - neto));
    K.Wallet.persistir();
  }

  const misionLista = () => est().misiones.lista;
  const misionCompleta = m => m.progreso >= m.meta && !m.cobrada;
  const misionesListas = () => misionLista().filter(misionCompleta).length;

  function cobrarMision(idx) {
    const m = misionLista()[idx];
    if (!m || !misionCompleta(m)) return false;
    m.cobrada = true;
    K.Wallet.mover(m.premio, 'premio', 'Misión diaria: ' + m.txt);
    sumarXP(40);
    K.aviso('Misión completada: ' + K.sol(m.premio), 'ok');
    K.confeti();
    K.Wallet.persistir();
    K.bus.emit('progreso');
    return true;
  }

  /* ---------------- cashback ---------------- */
  const CASHBACK = 0.05;
  const cashbackDisponible = () => {
    const c = est().cashback;
    return K.round2(Math.max(0, c.perdidas * CASHBACK - c.cobrado));
  };
  function cobrarCashback() {
    const monto = cashbackDisponible();
    if (monto < 1) { K.aviso('Todavía no hay cashback acumulado esta semana.', 'warn'); return; }
    est().cashback.cobrado = K.round2(est().cashback.cobrado + monto);
    K.Wallet.mover(monto, 'premio', 'Cashback semanal del 5%');
    K.aviso('Cashback cobrado: ' + K.sol(monto), 'ok');
    K.Wallet.persistir();
    K.bus.emit('progreso');
  }

  /* ---------------- jackpot progresivo ---------------- */
  const APORTE = 0.005;                      // 0.5% de cada apuesta de casino
  const jackpot = () => est().jackpot;
  function aportarJackpot(monto) {
    const p = est();
    p.jackpot = K.round2(p.jackpot + monto * APORTE);
  }
  /* Probabilidad por giro, proporcional a la apuesta y muy baja. */
  function intentarJackpot(apuesta) {
    const p = est();
    const prob = Math.min(0.0006, apuesta * 0.00008);
    if (Math.random() < prob) {
      const premio = K.round2(p.jackpot);
      p.jackpot = 5000;
      K.Wallet.mover(premio, 'premio', '¡JACKPOT progresivo!');
      K.aviso('🎉 ¡JACKPOT! Ganaste ' + K.sol(premio), 'ok');
      K.confeti(140);
      K.Wallet.persistir();
      K.bus.emit('progreso');
      return premio;
    }
    return 0;
  }

  /* ---------------- torneo ---------------- */
  function tabla() {
    const t = est().torneo;
    const filas = t.rivales.map(r => ({ n: r.n, p: r.p, yo: false }));
    filas.push({ n: 'Tú', p: Math.round(t.puntos), yo: true });
    filas.sort((a, b) => b.p - a.p);
    return filas;
  }
  const PREMIOS_TORNEO = [2000, 1000, 500];

  return {
    init, registrar, resultado, sumarXP, est, xpNivel, nombreNivel, premioNivel,
    misionLista, misionCompleta, misionesListas, cobrarMision,
    cashbackDisponible, cobrarCashback, CASHBACK,
    jackpot, aportarJackpot, intentarJackpot, APORTE,
    tabla, PREMIOS_TORNEO, semana
  };
})();
