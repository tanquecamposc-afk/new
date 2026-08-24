/* ===========================================================
   wallet.js — saldo virtual, libro mayor, límites y perfilado
   Nada de esto toca dinero real: son fichas de demostración.
   =========================================================== */
K.Wallet = (() => {

  const INICIAL = 5000;
  const VERSION = 3;

  const base = () => ({
    v: VERSION,
    saldo: INICIAL,
    depositado: INICIAL,
    rollover: 0,                     // cuánto falta apostar para poder "retirar"
    ledger: [{ t: Date.now(), tipo: 'deposito', monto: INICIAL, det: 'Saldo de bienvenida (demo)', saldo: INICIAL }],
    apuestas: [],
    casino: { jugadas: 0, apostado: 0, devuelto: 0, historial: {} },
    perfil: { clv: [], categoria: 'recreativo', limiteApuesta: 2500, marcas: [] },
    limites: { depositoDiario: 10000, apuestaMax: 2500, autoexcluidoHasta: 0, recordatorioMin: 30 },
    diaria: { ultimo: 0, racha: 0, total: 0 },
    kyc: { verificado: false, nivel: 0 },
    sesion: { inicio: Date.now(), avisado: 0 }
  });

  let s = null;

  function init() {
    const guardado = K.cargar();
    const existe = !!(guardado && guardado.saldo !== undefined);
    s = existe ? { ...base(), ...guardado } : base();
    // Ojo: la versión hay que leerla del objeto guardado, no del mezclado,
    // porque el spread ya trae la versión nueva de base().
    if (existe && guardado.v !== VERSION) migrar();
    s.sesion = { inicio: Date.now(), avisado: 0 };
    persistir();
    return s;
  }

  /* Sube una cuenta guardada de una versión anterior a los valores
     actuales, sin borrar el historial que ya tenía. */
  function migrar() {
    s.v = VERSION;
    if (s.limites.depositoDiario <= 6000) s.limites.depositoDiario = 10000;
    if (s.limites.apuestaMax <= 1500) s.limites.apuestaMax = 2500;
    if (s.perfil.categoria === 'recreativo') s.perfil.limiteApuesta = 2500;
    if (s.saldo < INICIAL) {
      const falta = K.round2(INICIAL - s.saldo);
      s.depositado = K.round2(s.depositado + falta);
      mover(falta, 'deposito', 'Ajuste del saldo demo a ' + K.sol(INICIAL));
    }
  }
  const persistir = () => { K.guardar(s); K.bus.emit('saldo', s.saldo); };
  const est = () => s;

  /* ---------- movimientos ---------- */
  function mover(monto, tipo, det) {
    s.saldo = K.round2(s.saldo + monto);
    s.ledger.unshift({ t: Date.now(), tipo, monto: K.round2(monto), det, saldo: s.saldo });
    if (s.ledger.length > 300) s.ledger.length = 300;
    persistir();
  }

  function depositar(monto) {
    if (monto <= 0) return { ok: false, razon: 'Monto inválido' };
    const hoy = new Date().setHours(0, 0, 0, 0);
    const yaHoy = s.ledger.filter(l => l.tipo === 'deposito' && l.t >= hoy).reduce((a, l) => a + l.monto, 0);
    if (yaHoy + monto > s.limites.depositoDiario)
      return { ok: false, razon: `Superas tu límite diario de depósito (${K.sol(s.limites.depositoDiario)}). Llevas ${K.sol(yaHoy)} hoy.` };
    s.depositado = K.round2(s.depositado + monto);
    s.rollover = K.round2(s.rollover + monto);      // regla 1x antes de retirar
    mover(monto, 'deposito', 'Recarga demo');
    return { ok: true };
  }

  function retirar(monto) {
    if (!s.kyc.verificado) return { ok: false, razon: 'Necesitas completar la verificación de identidad (KYC) antes del primer retiro.' };
    if (s.rollover > 0) return { ok: false, razon: `Te falta apostar ${K.sol(s.rollover)} para liberar el retiro (regla de rollover 1x).` };
    if (monto > s.saldo) return { ok: false, razon: 'Saldo insuficiente' };
    mover(-monto, 'retiro', 'Retiro simulado');
    return { ok: true };
  }

  /* ---------- validación previa a apostar ---------- */
  function puedeApostar(monto) {
    if (Date.now() < s.limites.autoexcluidoHasta)
      return { ok: false, razon: 'Tienes una pausa de juego activa hasta ' + K.hora(s.limites.autoexcluidoHasta) + '.' };
    if (!(monto > 0)) return { ok: false, razon: 'Ingresa un monto válido' };
    if (monto > s.saldo) return { ok: false, razon: 'Saldo insuficiente' };
    const tope = Math.min(s.limites.apuestaMax, s.perfil.limiteApuesta);
    if (monto > tope) return { ok: false, razon: `El límite de esta cuenta es ${K.sol(tope)} por apuesta.` };
    return { ok: true };
  }

  /* Congela el importe: sale del saldo apenas se acepta la apuesta. */
  function apostar(monto, det) {
    mover(-monto, 'apuesta', det);
    s.rollover = K.round2(Math.max(0, s.rollover - monto));
    persistir();
  }
  function acreditar(monto, det, tipo = 'ganancia') {
    if (monto > 0) mover(monto, tipo, det);
  }

  /* ---------- perfilado del usuario (CLV) ---------- */
  /* Si el jugador consigue mejores cuotas que las de cierre de forma
     sistemática, el motor lo marca como sharp y le baja el límite. */
  function registrarCLV(cuotaTomada, cuotaCierre) {
    if (!cuotaCierre || !cuotaTomada) return;
    const valor = (cuotaTomada / cuotaCierre - 1);
    s.perfil.clv.unshift(K.round2(valor * 100));
    if (s.perfil.clv.length > 60) s.perfil.clv.length = 60;
    recalcularPerfil();
  }

  function recalcularPerfil() {
    const c = s.perfil.clv;
    if (c.length < 8) { persistir(); return; }
    const medio = c.reduce((a, b) => a + b, 0) / c.length;
    const marcas = [];
    if (medio > 3) marcas.push('CLV positivo sostenido (+' + medio.toFixed(1) + '%)');
    const simples = s.apuestas.filter(a => a.lineas.length === 1).length;
    const total = s.apuestas.length || 1;
    if (simples / total > 0.85 && total > 10) marcas.push('Casi solo apuestas simples de volumen');
    const antes = s.apuestas.filter(a => a.antelacionMin > 600).length;
    if (antes / total > 0.5 && total > 10) marcas.push('Apuesta con mucha antelación');

    const antesCat = s.perfil.categoria;
    if (medio > 3 && marcas.length >= 2) { s.perfil.categoria = 'sharp'; s.perfil.limiteApuesta = 300; }
    else if (medio > 1.5) { s.perfil.categoria = 'observado'; s.perfil.limiteApuesta = 1000; }
    else { s.perfil.categoria = 'recreativo'; s.perfil.limiteApuesta = 2500; }
    s.perfil.marcas = marcas;
    if (antesCat !== s.perfil.categoria && s.perfil.categoria === 'sharp')
      K.aviso('El motor de riesgo te clasificó como <b>sharp</b>. Límite por apuesta reducido a ' + K.sol(300) + '.', 'warn');
    persistir();
  }

  /* ---------- juego responsable ---------- */
  function pausar(minutos) {
    s.limites.autoexcluidoHasta = Date.now() + minutos * 60000;
    persistir();
  }
  function verificarKYC() {
    s.kyc = { verificado: true, nivel: 2 };
    persistir();
  }
  function reiniciar() {
    s = base();
    persistir();
  }
  function tiempoSesion() { return Date.now() - s.sesion.inicio; }

  return {
    init, est, persistir, mover, depositar, retirar, puedeApostar, apostar,
    acreditar, registrarCLV, recalcularPerfil, pausar, verificarKYC, reiniciar, tiempoSesion, INICIAL
  };
})();
