/* ===========================================================
   admin.js — panel de administración de la demo

   Se abre desde la ventana de depósito escribiendo el código.
   Sirve para acreditarse fichas sin pasar por el límite diario
   y para desbloquear cosas que en la demo cuestan tiempo (KYC,
   rollover, nivel). Todo esto sigue siendo dinero de mentira:
   el panel existe para probar la página sin tener que jugar
   media hora para juntar saldo.
   =========================================================== */
K.Admin = (() => {

  const CODIGO = '280878';

  const est = () => K.Wallet.est();
  const desbloqueado = () => !!est().admin;

  function desbloquear(codigo) {
    if (String(codigo || '').trim() !== CODIGO) return false;
    est().admin = true;
    K.Wallet.persistir();
    return true;
  }

  /* ---------- acciones ---------- */

  /* Acreditar salta el límite diario a propósito y no suma rollover:
     no es un depósito, es un ajuste de la cuenta. */
  function acreditar(monto) {
    monto = K.round2(Number(monto) || 0);
    if (!isFinite(monto) || monto === 0) return { ok: false, razon: 'Pon un monto distinto de cero.' };
    if (monto < 0 && est().saldo + monto < 0) return { ok: false, razon: 'No puedes dejar el saldo en negativo.' };
    K.Wallet.mover(monto, 'admin', monto > 0 ? 'Fichas acreditadas desde el panel' : 'Fichas retiradas desde el panel');
    return { ok: true };
  }

  function fijarSaldo(monto) {
    monto = K.round2(Number(monto) || 0);
    if (!isFinite(monto) || monto < 0) return { ok: false, razon: 'El saldo no puede ser negativo.' };
    const dif = K.round2(monto - est().saldo);
    if (dif === 0) return { ok: true };
    K.Wallet.mover(dif, 'admin', 'Saldo fijado en ' + K.sol(monto));
    return { ok: true };
  }

  function liberarRetiro() {
    const w = est();
    w.rollover = 0;
    w.kyc.verificado = true;
    w.kyc.nivel = 2;
    w.limites.autoexcluidoHasta = 0;
    K.Wallet.persistir();
  }

  function soltarLimites() {
    const w = est();
    w.limites.depositoDiario = 1000000;
    w.limites.apuestaMax = 100000;
    w.perfil.limiteApuesta = 100000;
    K.Wallet.persistir();
  }

  function subirNiveles(n) {
    const p = K.Progreso.est();
    let xp = 0;
    for (let i = 0; i < n; i++) xp += K.Progreso.xpNivel(p.nivel + i);
    K.Progreso.sumarXP(xp);
  }

  return { CODIGO, desbloqueado, desbloquear, acreditar, fijarSaldo, liberarRetiro, soltarLimites, subirNiveles };
})();
