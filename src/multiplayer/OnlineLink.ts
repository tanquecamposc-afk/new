import { NetworkConfig } from '@/config/network';
import { PhysicsConfig } from '@/config/physics';
import type { ShotInput } from '@/game/shooting/shot';
import type { NetClient } from './NetClient';
import type { HoleInfo, PlayerNetState, ServerMessage } from './protocol';
import { RemoteBuffer } from './RemoteBuffer';

const DT_MS = PhysicsConfig.fixedTimestep * 1000;

type EventMsg = Extract<ServerMessage, { t: 'event' }>;
type ShotMsg = Extract<ServerMessage, { t: 'shot' }>;
type AckMsg = Extract<ServerMessage, { t: 'shot_ack' }>;

/**
 * Enlace de red de un hoyo: último estado autoritativo de cada jugador,
 * buffers de interpolación de bolas remotas, tick estimado del servidor y
 * envío de tiros. El motor lo consulta en modo online.
 */
export class OnlineLink {
  hole: HoleInfo | null = null;
  readonly states = new Map<string, PlayerNetState>();
  readonly buffers = new Map<string, RemoteBuffer>();
  lastSnapshotTick = -1;
  private shotSeq = 0;
  private offs: (() => void)[] = [];
  // Manejadores que instala el motor del hoyo actual.
  onSnapshot: ((self: PlayerNetState | undefined) => void) | null = null;
  onEvent: ((e: EventMsg) => void) | null = null;
  onShot: ((s: ShotMsg) => void) | null = null;
  onShotAck: ((a: AckMsg) => void) | null = null;

  constructor(
    readonly net: NetClient,
    readonly localId: string,
  ) {
    this.offs.push(
      net.on('snap', (m) => {
        if (m.tick < this.lastSnapshotTick) return;
        this.lastSnapshotTick = m.tick;
        for (const p of m.players) {
          this.states.set(p.id, p);
          let b = this.buffers.get(p.id);
          if (!b) this.buffers.set(p.id, (b = new RemoteBuffer()));
          b.push({ tick: m.tick, x: p.x, y: p.y, z: p.z, qx: p.qx, qy: p.qy, qz: p.qz, qw: p.qw });
        }
        this.onSnapshot?.(this.states.get(this.localId));
      }),
      net.on('event', (m) => this.onEvent?.(m)),
      net.on('shot', (m) => this.onShot?.(m)),
      net.on('shot_ack', (m) => this.onShotAck?.(m)),
    );
  }

  /** Nuevo hoyo (o actualización del mismo: p. ej. llega el tick de GO). */
  setHole(h: HoleInfo): void {
    if (!this.hole || this.hole.index !== h.index || this.hole.t0 !== h.t0) {
      this.states.clear();
      this.buffers.clear();
      this.lastSnapshotTick = -1;
    }
    this.hole = h;
  }

  /** Tick (fraccional) del servidor en este instante, según el reloj sincronizado. */
  estimatedTick(): number {
    if (!this.hole) return 0;
    return (this.net.clock.serverNow() - this.hole.t0) / DT_MS;
  }

  /** Tick al que se dibujan las bolas remotas (en el pasado, para interpolar). */
  renderTick(): number {
    return this.estimatedTick() - NetworkConfig.interpolationDelayMs / DT_MS;
  }

  get latencyMs(): number {
    return Math.round(this.net.clock.rtt);
  }

  sendHoleReady(index: number): void {
    this.net.send({ t: 'hole_ready', hole: index });
  }

  sendShot(shot: ShotInput, tick: number): number {
    const shotId = ++this.shotSeq;
    this.net.send({ t: 'shoot', shotId, tick, dx: shot.direction.x, dz: shot.direction.z, power: shot.power });
    return shotId;
  }

  sendReset(): void {
    this.net.send({ t: 'reset_ball' });
  }

  sendNextReady(): void {
    this.net.send({ t: 'next_ready' });
  }

  /** Motor que instaló los manejadores actuales. */
  private owner: object | null = null;

  /** El motor del hoyo actual se registra como dueño de los manejadores. */
  attachEngine(owner: object): void {
    this.owner = owner;
  }

  /**
   * Quita los manejadores sólo si pertenecen a `owner`. Un motor descartado (doble
   * montaje de React en desarrollo, hoyo que se desmonta tarde) no puede dejar sin
   * snapshots al motor activo.
   */
  detachEngine(owner?: object): void {
    if (owner && this.owner !== owner) return;
    this.owner = null;
    this.onSnapshot = this.onEvent = this.onShot = this.onShotAck = null;
  }

  dispose(): void {
    this.detachEngine();
    this.offs.forEach((o) => o());
  }
}
