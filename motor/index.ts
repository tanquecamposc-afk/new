/**
 * NEXO SPORTS — motor de apuestas y liquidación del ARCADE NEXO
 *
 * Los soles de aquí son del juego, como las fichas del resto del arcade: no hay
 * dinero real, ni pasarela, ni manera de retirar nada. Esto es un simulador.
 *
 * Todo el dinero se lleva en BigInt de céntimos. Una cuota de 3,50 sobre S/ 20
 * en coma flotante da 70.00000000000001, y ese céntimo fantasma acaba en un
 * saldo que no cuadra. Con enteros no hay nada que cuadrar.
 */

import { EventEmitter } from 'events';

// ==========================================
// TIPOS
// ==========================================

/**
 * Cómo acaba una selección. Las mitades son de los hándicaps asiáticos.
 *
 * Van como objeto `as const` y no como `enum` a propósito: Node ejecuta
 * TypeScript quitando los tipos, sin compilar, y un `enum` genera código en
 * tiempo de ejecución que ese modo no admite. Así `node motor/index.ts`
 * funciona tal cual, sin instalar nada.
 */
export const MarketResult = {
  WIN: 'WIN',
  LOSS: 'LOSS',
  VOID: 'VOID',
  HALF_WIN: 'HALF_WIN',
  HALF_LOSS: 'HALF_LOSS'
} as const;
export type MarketResult = typeof MarketResult[keyof typeof MarketResult];

export const CashoutMode = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
  AUTO: 'AUTO'
} as const;
export type CashoutMode = typeof CashoutMode[keyof typeof CashoutMode];

export interface PlayerBet {
  betId: string;
  userId: string;
  matchId: string;
  selectedPlayerId: string;
  stakeInCents: bigint;              // S/ 10,00 = 1000n céntimos
  lockedOdds: number;
  isGoldenSubEligible: boolean;
  createdAt: Date;
}

export interface SubstitutionEvent {
  matchId: string;
  playerOutId: string;
  playerInId: string;
  matchMinute: number;
}

export interface WalletMovement {
  movementId: string;
  idempotencyKey: string;
  userId: string;
  amountInCents: bigint;
  currency: 'PEN_SIMULADO';
  source: 'CAMBIO_NEXOCOINS' | 'PREMIO' | 'CASHOUT' | 'APUESTA';
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
}

// ==========================================
// MOTOR
// ==========================================

export class NexoSportsEngine extends EventEmitter {
  /** Escala de las cuotas: 3,50 se guarda como 35000n. */
  private static readonly ODDS_SCALE = 10000n;

  /** Cuánto se queda la casa al cobrar antes de tiempo. */
  public static readonly CASHOUT_FEE = 0.05;

  /** Un millón de NEXO-COINS es un sol del juego. */
  public static readonly NEXOCOINS_POR_SOL = 1_000_000;

  /** Lo que cuesta abrir la casa de apuestas. */
  public static readonly COSTE_DESBLOQUEO = 10_000_000_000;

  private readonly clavesVistas = new Set<string>();

  // ---------- Liquidación ----------

  /**
   * Lo que devuelve una selección, incluida la apuesta. Un WIN de S/ 20 a 3,50
   * devuelve S/ 70, no S/ 50: el premio y el importe vuelven juntos.
   */
  public calculatePayoutInCents(
    stakeInCents: bigint,
    odds: number,
    result: MarketResult
  ): bigint {
    if (stakeInCents <= 0n) throw new Error('El importe debe ser mayor que cero céntimos.');
    if (!Number.isFinite(odds) || odds < 1) throw new Error('La cuota tiene que ser 1,00 o más.');

    const oddsScaled = BigInt(Math.round(odds * 10000));
    const S = NexoSportsEngine.ODDS_SCALE;

    switch (result) {
      case MarketResult.WIN:
        return (stakeInCents * oddsScaled) / S;

      // Media ganada: la mitad va a cuota y la otra mitad se devuelve tal cual.
      case MarketResult.HALF_WIN: {
        const mitad = stakeInCents / 2n;
        // El céntimo impar se queda en la parte que va a cuota, a favor del jugador.
        const aCuota = stakeInCents - mitad;
        return (aCuota * oddsScaled) / S + mitad;
      }

      case MarketResult.VOID:
        return stakeInCents;

      case MarketResult.HALF_LOSS:
        return stakeInCents / 2n;

      case MarketResult.LOSS:
      default:
        return 0n;
    }
  }

  /**
   * Cuota de una combinada: el producto de todas. Se multiplica en enteros
   * escalados y se redondea una sola vez al final, porque encadenar redondeos
   * en cada pata desvía la cuota final varios céntimos.
   */
  public combinedOdds(legs: number[]): number {
    if (!legs.length) return 1;
    const S = NexoSportsEngine.ODDS_SCALE;
    let acumulado = S;
    for (const cuota of legs) {
      if (!Number.isFinite(cuota) || cuota < 1) throw new Error('Cuota inválida en la combinada.');
      acumulado = (acumulado * BigInt(Math.round(cuota * 10000))) / S;
    }
    return Number(acumulado) / 10000;
  }

  // ---------- Reglas de la casa ----------

  /**
   * SUPLENTE DE ORO — si tu goleador sale en la primera parte sin haber marcado,
   * la apuesta se pasa sola al que entra en su lugar. Sin esto, un cambio al
   * minuto 20 mataba la apuesta sin que el jugador pudiera hacer nada.
   */
  public processGoldenSubRule(
    bet: PlayerBet,
    event: SubstitutionEvent,
    hasPlayerScored: boolean
  ): PlayerBet {
    const aplica =
      bet.isGoldenSubEligible &&
      bet.matchId === event.matchId &&
      event.matchMinute <= 45 &&
      bet.selectedPlayerId === event.playerOutId &&
      !hasPlayerScored;

    if (!aplica) return bet;

    const transferida: PlayerBet = { ...bet, selectedPlayerId: event.playerInId };
    this.emit('GOLDEN_SUB_TRANSFERRED', {
      betId: bet.betId,
      fromPlayer: event.playerOutId,
      toPlayer: event.playerInId,
      minute: event.matchMinute,
      timestamp: new Date()
    });
    return transferida;
  }

  /**
   * BB BOOST — supercuota por combinar. Tres patas suben un 10 %, cuatro un
   * 15 % y cinco o más un 25 %, que es el tope del pliego.
   */
  public applyBBBoost(baseOdds: number, parlayLegsCount: number): number {
    if (parlayLegsCount < 3) return baseOdds;
    const factor = parlayLegsCount >= 5 ? 0.25 : parlayLegsCount === 4 ? 0.15 : 0.10;
    return Number((baseOdds * (1 + factor)).toFixed(2));
  }

  /**
   * Valor de cobrar antes de tiempo. Si la cuota actual bajó respecto a la que
   * bloqueaste, vas ganando y te ofrecen más; si subió, menos. Se descuenta la
   * comisión de la casa.
   */
  public cashoutValueInCents(
    stakeInCents: bigint,
    lockedOdds: number,
    currentOdds: number,
    mode: CashoutMode = CashoutMode.FULL,
    fraction = 1
  ): bigint {
    if (currentOdds < 1) throw new Error('La cuota actual tiene que ser 1,00 o más.');
    const parte = mode === CashoutMode.PARTIAL
      ? Math.max(0.05, Math.min(1, fraction))
      : 1;
    const bruto = Number(stakeInCents) * (lockedOdds / currentOdds) * parte;
    const neto = bruto * (1 - NexoSportsEngine.CASHOUT_FEE);
    return BigInt(Math.max(0, Math.floor(neto)));
  }

  // ---------- Cartera ----------

  /** Cuántos céntimos del juego dan esos NEXO-COINS. */
  public static nexocoinsACentimos(nexocoins: number): bigint {
    const soles = Math.floor(nexocoins / NexoSportsEngine.NEXOCOINS_POR_SOL);
    return BigInt(soles) * 100n;
  }

  /**
   * Movimiento de cartera con clave de idempotencia: la misma clave dos veces
   * no mueve el dinero dos veces. Es lo que evita que un doble clic ingrese el
   * doble, que es el fallo clásico de cualquier cartera.
   */
  public applyMovement(mov: WalletMovement): WalletMovement {
    if (this.clavesVistas.has(mov.idempotencyKey)) {
      const rechazado: WalletMovement = { ...mov, status: 'REJECTED' };
      this.emit('MOVEMENT_REJECTED', {
        idempotencyKey: mov.idempotencyKey,
        motivo: 'Movimiento duplicado'
      });
      return rechazado;
    }
    this.clavesVistas.add(mov.idempotencyKey);

    const completado: WalletMovement = { ...mov, status: 'COMPLETED' };
    this.emit('MOVEMENT_COMPLETED', {
      userId: mov.userId,
      soles: NexoSportsEngine.formatear(mov.amountInCents),
      source: mov.source,
      movementId: mov.movementId
    });
    return completado;
  }

  /** Céntimos a texto: 7050n → "70,50". */
  public static formatear(centimos: bigint): string {
    const negativo = centimos < 0n;
    const abs = negativo ? -centimos : centimos;
    const enteros = abs / 100n;
    const resto = abs % 100n;
    return (negativo ? '-' : '') +
      enteros.toLocaleString('es-PE') + ',' + resto.toString().padStart(2, '0');
  }
}

// ==========================================
// DEMO — node: npx ts-node motor/index.ts
// ==========================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const motor = new NexoSportsEngine();

  motor.on('GOLDEN_SUB_TRANSFERRED', d =>
    console.log('⚡ Suplente de Oro aplicado:', d));
  motor.on('MOVEMENT_COMPLETED', d =>
    console.log('💳 Movimiento:', d));
  motor.on('MOVEMENT_REJECTED', d =>
    console.log('🚫 Rechazado:', d));

  // 1. Cambio de NEXO-COINS a soles del juego
  const centimos = NexoSportsEngine.nexocoinsACentimos(50_000_000);
  motor.applyMovement({
    movementId: 'MOV-0001',
    idempotencyKey: 'IDEMP-0001',
    userId: 'USR-NEXO-007',
    amountInCents: centimos,
    currency: 'PEN_SIMULADO',
    source: 'CAMBIO_NEXOCOINS',
    status: 'PENDING'
  });
  // El mismo movimiento otra vez: la clave repetida lo rechaza
  motor.applyMovement({
    movementId: 'MOV-0001',
    idempotencyKey: 'IDEMP-0001',
    userId: 'USR-NEXO-007',
    amountInCents: centimos,
    currency: 'PEN_SIMULADO',
    source: 'CAMBIO_NEXOCOINS',
    status: 'PENDING'
  });

  // 2. Apuesta a goleador con Suplente de Oro
  const apuesta: PlayerBet = {
    betId: 'BET-88392',
    userId: 'USR-NEXO-007',
    matchId: 'PARTIDO-01',
    selectedPlayerId: 'JUGADOR-10',
    stakeInCents: 2000n,          // S/ 20,00
    lockedOdds: 3.50,
    isGoldenSubEligible: true,
    createdAt: new Date()
  };

  const traspasada = motor.processGoldenSubRule(apuesta, {
    matchId: 'PARTIDO-01',
    playerOutId: 'JUGADOR-10',
    playerInId: 'JUGADOR-18',
    matchMinute: 35
  }, false);

  console.log('✅ Apuesta ahora sobre:', traspasada.selectedPlayerId);

  // 3. Liquidación
  const cobro = motor.calculatePayoutInCents(
    traspasada.stakeInCents, traspasada.lockedOdds, MarketResult.WIN);
  console.log('💰 Pagado: S/', NexoSportsEngine.formatear(cobro));

  // 4. Combinada de cuatro con supercuota
  const patas = [1.85, 2.10, 1.60, 2.40];
  const base = motor.combinedOdds(patas);
  const conBoost = motor.applyBBBoost(base, patas.length);
  console.log(`🎟  Combinada de ${patas.length}: ${base.toFixed(2)} → ${conBoost.toFixed(2)} con BB Boost`);

  // 5. Cobro anticipado con el partido a favor
  const valor = motor.cashoutValueInCents(2000n, 3.50, 1.80, CashoutMode.FULL);
  console.log('🏳  Cash-out ahora: S/', NexoSportsEngine.formatear(valor));
}
