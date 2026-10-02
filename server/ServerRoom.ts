import { GameConfig } from '@/config/game';
import { NetworkConfig } from '@/config/network';
import { PhysicsConfig } from '@/config/physics';
import { Simulation } from '@/game/core/Simulation';
import { COURSES, getCourse } from '@/game/courses';
import type { CourseData } from '@/game/courses/types';
import { MatchController } from '@/match/MatchController';
import { BALL_COLORS, MAX_PLAYERS, type ConnectionState } from '@/match/types';
import type { HoleInfo, PlayerNetState, ServerMessage } from '@/multiplayer/protocol';
import { sanitizeName, type RoomState } from '@/multiplayer/Room';

const DT_MS = PhysicsConfig.fixedTimestep * 1000;
const ticks = (sec: number) => Math.round(sec / PhysicsConfig.fixedTimestep);

/** Lo que la sala necesita de una conexión (GameServer la implementa). */
export interface MemberLink {
  readonly id: string;
  name: string;
  send(msg: ServerMessage): void;
  readonly connected: boolean;
}

interface Member {
  link: MemberLink;
  color: number;
  ready: boolean;
  conn: ConnectionState;
  disconnectedAt: number | null;
  /** Abandonó la partida (o expiró su ventana de reconexión). */
  left: boolean;
}

type HolePhase = 'loading' | 'countdown' | 'playing' | 'results';

/**
 * Sala autoritativa: lobby, partida de varios hoyos y simulación.
 * Cada jugador tiene su propio mundo físico (las bolas no chocan entre sí),
 * lo que permite compensar la latencia rebobinando sólo su tiro.
 */
export class ServerRoom {
  readonly members = new Map<string, Member>();
  hostId: string | null = null;
  courseIds: string[] = COURSES.map((c) => c.id);
  status: 'open' | 'in_match' = 'open';
  private match: MatchController | null = null;
  private sims = new Map<string, Simulation>();
  private holeIndex = 0;
  private holePhase: HolePhase = 'loading';
  private t0 = 0;
  private tick = 0;
  private goTick: number | null = null;
  private loadDeadline = 0;
  private holeReady = new Set<string>();
  private nextReady = new Set<string>();
  private resultsUntil = 0;
  private lastSnapshot = 0;
  private autoStartAt: number | null = null;
  private building = false;
  private holeGen = 0;

  constructor(
    readonly id: string,
    readonly mode: 'quick' | 'private',
    readonly code: string | null,
    private readonly now: () => number,
    private readonly onEmpty: (room: ServerRoom) => void,
  ) {}

  get size(): number {
    return this.members.size;
  }

  get joinable(): boolean {
    return this.status === 'open' && this.members.size < MAX_PLAYERS;
  }

  // ---------------- Lobby ----------------

  join(link: MemberLink): { ok: true } | { ok: false; code: string } {
    if (this.members.has(link.id)) return { ok: true };
    if (this.status !== 'open') return { ok: false, code: 'match_in_progress' };
    if (this.members.size >= MAX_PLAYERS) return { ok: false, code: 'room_full' };
    const used = new Set([...this.members.values()].map((m) => m.color));
    const color = BALL_COLORS.find((c) => !used.has(c)) ?? BALL_COLORS[0];
    this.members.set(link.id, { link, color, ready: false, conn: 'connected', disconnectedAt: null, left: false });
    if (!this.hostId) this.hostId = link.id;
    if (this.mode === 'quick' && this.autoStartAt === null) this.autoStartAt = this.now() + NetworkConfig.quickPlayLobbySec * 1000;
    this.broadcastRoom();
    return { ok: true };
  }

  /** Salida voluntaria. En partida, el jugador abandona (resultado sin completar). */
  leave(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    if (this.status === 'in_match') {
      this.forfeit(id);
    } else {
      this.members.delete(id);
    }
    this.migrateHost();
    if (this.activeMembers().length === 0) {
      this.dispose();
      this.onEmpty(this);
      return;
    }
    this.broadcastRoom();
  }

  setReady(id: string, ready: boolean): void {
    const m = this.members.get(id);
    if (!m || this.status !== 'open') return;
    m.ready = ready;
    this.broadcastRoom();
  }

  setName(id: string, raw: string): boolean {
    const m = this.members.get(id);
    const name = sanitizeName(raw);
    if (!m || !name || this.status !== 'open') return false;
    m.link.name = name;
    this.broadcastRoom();
    return true;
  }

  setCourses(id: string, ids: string[]): string | null {
    if (id !== this.hostId || this.mode !== 'private') return 'not_host';
    if (this.status !== 'open') return 'match_in_progress';
    const valid = [...new Set(ids)].filter((c) => getCourse(c));
    if (!valid.length) return 'no_courses';
    this.courseIds = COURSES.map((c) => c.id).filter((c) => valid.includes(c));
    this.broadcastRoom();
    return null;
  }

  requestStart(id: string): string | null {
    if (this.status !== 'open') return 'match_in_progress';
    if (this.mode === 'private' && id !== this.hostId) return 'not_host';
    if (![...this.members.values()].every((m) => m.ready)) return 'not_all_ready';
    void this.startMatch();
    return null;
  }

  // ---------------- Conexión ----------------

  onDisconnect(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    if (this.status === 'open') {
      // En el lobby no se reserva plaza: sale de la sala.
      this.leave(id);
      return;
    }
    m.conn = 'disconnected';
    m.disconnectedAt = this.now();
    this.broadcast({ t: 'conn', playerId: id, state: 'disconnected' });
    this.migrateHost();
  }

  /** Reconexión dentro de la ventana: vuelve a recibir todo el estado actual. */
  onReconnect(link: MemberLink): void {
    const m = this.members.get(link.id);
    if (!m || m.left) return;
    m.link = link;
    m.conn = 'connected';
    m.disconnectedAt = null;
    this.broadcast({ t: 'conn', playerId: link.id, state: 'connected' });
    link.send({ t: 'room', room: this.roomState() });
    if (this.match) {
      link.send({ t: 'match_start', holes: this.match.holes.map((h) => h.id), players: this.match.players.map((p) => ({ id: p.id, name: p.name, color: p.color })) });
      if (this.holePhase === 'results') {
        const results = this.match.holeResults(this.holeIndex);
        link.send({ t: 'hole_end', hole: this.holeIndex, results: results.map((r) => ({ ...r })), standings: this.match.standings() });
      } else {
        link.send({ t: 'hole', hole: this.holeInfo() });
        link.send(this.snapshot());
      }
    }
  }

  hasMember(id: string): boolean {
    const m = this.members.get(id);
    return !!m && !m.left;
  }

  // ---------------- Partida ----------------

  private async startMatch(): Promise<void> {
    if (this.building) return;
    this.building = true;
    const holes = this.courseIds.map((id) => getCourse(id)).filter((c): c is CourseData => !!c);
    const players = [...this.members.values()].map((m) => ({ id: m.link.id, name: m.link.name, color: m.color, isBot: false }));
    this.match = new MatchController(holes, players);
    this.status = 'in_match';
    this.autoStartAt = null;
    this.broadcastRoom();
    this.broadcast({ t: 'match_start', holes: holes.map((h) => h.id), players: players.map(({ id, name, color }) => ({ id, name, color })) });
    this.holeIndex = 0;
    await this.loadHole();
    this.building = false;
  }

  private async loadHole(): Promise<void> {
    const match = this.match!;
    const course = match.holes[this.holeIndex]!;
    const gen = ++this.holeGen;
    this.disposeSims();
    const sims = new Map<string, Simulation>();
    for (const m of this.activeMembers()) {
      const sim = await Simulation.create(course, false);
      sim.addPlayer(m.link.id, m.link.name);
      this.bindSimEvents(sim, m.link.id);
      sims.set(m.link.id, sim);
    }
    if (gen !== this.holeGen) {
      for (const s of sims.values()) s.dispose();
      return;
    }
    this.sims = sims;
    this.t0 = this.now();
    this.tick = 0;
    this.goTick = null;
    this.holePhase = 'loading';
    this.holeReady.clear();
    this.nextReady.clear();
    this.loadDeadline = this.t0 + NetworkConfig.holeLoadTimeoutSec * 1000;
    this.broadcast({ t: 'hole', hole: this.holeInfo() });
  }

  private holeInfo(): HoleInfo {
    const match = this.match!;
    return { index: this.holeIndex, count: match.holes.length, courseId: match.holes[this.holeIndex]!.id, t0: this.t0, goTick: this.goTick };
  }

  onHoleReady(id: string, hole: number): void {
    if (!this.match || hole !== this.holeIndex || this.holePhase !== 'loading') return;
    this.holeReady.add(id);
  }

  onNextReady(id: string): void {
    if (this.holePhase === 'results') this.nextReady.add(id);
  }

  onShoot(id: string, msg: { shotId: number; tick: number; dx: number; dz: number; power: number }, send: (m: ServerMessage) => void): void {
    const sim = this.sims.get(id);
    const nack = (reason: string) => send({ t: 'shot_ack', shotId: msg.shotId, ok: false, reason, tick: this.tick });
    if (!sim || this.holePhase !== 'playing') return nack('invalid_state');
    const maxRewind = ticks(NetworkConfig.maxRewindMs / 1000);
    // El cliente no puede elegir un tick fuera de la ventana de compensación.
    const at = Math.max(this.goTick ?? 0, this.tick - maxRewind, Math.min(this.tick, Math.floor(msg.tick)));
    const r = sim.shootAtTick(id, { direction: { x: msg.dx, z: msg.dz }, power: msg.power }, at);
    if (!r.ok) return nack(r.reason);
    send({ t: 'shot_ack', shotId: msg.shotId, ok: true, tick: r.record.tick });
    this.broadcast({ t: 'shot', playerId: id, shotId: msg.shotId, tick: r.record.tick, power: r.record.power }, id);
  }

  onResetBall(id: string): void {
    if (this.holePhase === 'playing') this.sims.get(id)?.resetBall(id);
  }

  private bindSimEvents(sim: Simulation, id: string): void {
    sim.events.on('BALL_IN_HOLE', () => this.broadcast({ t: 'event', kind: 'holed', playerId: id }));
    sim.events.on('BALL_IN_WATER', () => this.broadcast({ t: 'event', kind: 'water', playerId: id }));
    sim.events.on('BALL_OUT_OF_BOUNDS', () => this.broadcast({ t: 'event', kind: 'out_of_bounds', playerId: id }));
    sim.events.on('TIME_UP', () => this.broadcast({ t: 'event', kind: 'time_up', playerId: id }));
    sim.events.on('PLAYER_FINISHED', () => this.broadcast({ t: 'event', kind: 'finished', playerId: id }));
  }

  /** Abandono: su hoyo actual termina sin completar y no juega los siguientes. */
  private forfeit(id: string): void {
    const m = this.members.get(id);
    if (!m || m.left) return;
    m.left = true;
    m.conn = 'disconnected';
    const sim = this.sims.get(id);
    if (sim) {
      const p = sim.getPlayer(id);
      if (p.finishTick === null) sim.resyncPlayer(id, { position: p.ball.position, finished: true, completed: false, holed: false });
    }
    this.broadcast({ t: 'conn', playerId: id, state: 'disconnected' });
  }

  // ---------------- Bucle ----------------

  update(): void {
    const now = this.now();
    if (this.status === 'open') {
      if (this.mode === 'quick' && this.autoStartAt !== null) {
        const members = [...this.members.values()];
        const early = members.length >= NetworkConfig.quickPlayMinPlayers && members.every((m) => m.ready);
        if (early || now >= this.autoStartAt) {
          for (const m of members) m.ready = true;
          void this.startMatch();
        }
      }
      return;
    }
    // Ventana de reconexión agotada → abandono.
    for (const [id, m] of this.members) {
      if (m.disconnectedAt !== null && !m.left && now - m.disconnectedAt > NetworkConfig.reconnectWindowSec * 1000) this.forfeit(id);
    }
    if (this.activeMembers().length === 0) {
      this.dispose();
      this.onEmpty(this);
      return;
    }
    if (!this.match || this.building || this.sims.size === 0) return;

    if (this.holePhase === 'results') {
      const humans = this.activeMembers().filter((m) => m.conn === 'connected');
      if (now >= this.resultsUntil || (humans.length > 0 && humans.every((m) => this.nextReady.has(m.link.id)))) void this.advanceHole();
      return;
    }

    // Simulación a paso fijo alineada con el reloj del servidor.
    const target = Math.floor((now - this.t0) / DT_MS);
    let steps = 0;
    while (this.tick < target && steps < 60) {
      if (this.goTick !== null && this.tick === this.goTick) for (const s of this.sims.values()) s.startHole();
      for (const s of this.sims.values()) s.step();
      this.tick++;
      steps++;
    }
    if (this.goTick !== null && this.tick >= this.goTick) this.holePhase = 'playing';

    if (this.holePhase === 'loading') {
      const waiting = this.activeMembers().filter((m) => m.conn === 'connected' && !this.holeReady.has(m.link.id));
      if (waiting.length === 0 || now >= this.loadDeadline) {
        this.goTick = this.tick + ticks(GameConfig.countdownSec) + ticks(0.3);
        this.holePhase = 'countdown';
        this.broadcast({ t: 'hole', hole: this.holeInfo() });
      }
    }

    if (now - this.lastSnapshot >= 1000 / NetworkConfig.snapshotHz) {
      this.lastSnapshot = now;
      this.broadcast(this.snapshot());
    }

    if (this.holePhase === 'playing' && [...this.sims.entries()].every(([id, s]) => s.getPlayer(id).finishTick !== null)) this.endHole();
  }

  private endHole(): void {
    const match = this.match!;
    for (const p of match.players) {
      const sim = this.sims.get(p.id);
      if (sim) {
        match.recordResult(this.holeIndex, p.id, { strokes: sim.strokes(p.id), timeMs: sim.elapsedMs(p.id), completed: sim.getPlayer(p.id).completed });
      } else {
        // No jugó este hoyo (abandonó antes): sin completar, máximo de golpes y tiempo.
        const course = match.holes[this.holeIndex]!;
        match.recordResult(this.holeIndex, p.id, {
          strokes: GameConfig.maxShotsPerHole,
          timeMs: (course.timeLimitSec ?? GameConfig.holeTimeLimitSec ?? 120) * 1000,
          completed: false,
        });
      }
    }
    this.broadcast(this.snapshot());
    this.holePhase = 'results';
    this.resultsUntil = this.now() + NetworkConfig.holeResultsSec * 1000;
    this.broadcast({ t: 'hole_end', hole: this.holeIndex, results: match.holeResults(this.holeIndex).map((r) => ({ ...r })), standings: match.standings() });
  }

  private async advanceHole(): Promise<void> {
    const match = this.match!;
    if (this.building) return;
    if (!match.nextHole()) {
      this.broadcast({ t: 'match_end', standings: match.standings() });
      this.endMatch();
      return;
    }
    this.building = true;
    this.holeIndex = match.holeIndex;
    await this.loadHole();
    this.building = false;
  }

  private endMatch(): void {
    this.disposeSims();
    this.match = null;
    this.status = 'open';
    for (const [id, m] of [...this.members]) {
      if (m.left || m.conn === 'disconnected') this.members.delete(id);
      else m.ready = false;
    }
    this.migrateHost();
    if (this.mode === 'quick' && this.members.size) this.autoStartAt = this.now() + NetworkConfig.quickPlayLobbySec * 1000;
    if (this.members.size === 0) {
      this.onEmpty(this);
      return;
    }
    this.broadcastRoom();
  }

  private snapshot(): ServerMessage {
    const players: PlayerNetState[] = [];
    for (const [id, sim] of this.sims) {
      const p = sim.getPlayer(id);
      const q = p.ball.body.rotation();
      players.push({
        id,
        x: round(p.ball.position.x),
        y: round(p.ball.position.y),
        z: round(p.ball.position.z),
        qx: round(q.x),
        qy: round(q.y),
        qz: round(q.z),
        qw: round(q.w),
        phase: p.ball.phase,
        state: p.fsm.state,
        strokes: sim.strokes(id),
        penalties: p.penalties,
        finished: p.finishTick !== null,
        completed: p.completed,
        holed: p.holed,
        timeMs: sim.elapsedMs(id),
        conn: this.members.get(id)?.conn ?? 'disconnected',
      });
    }
    return { t: 'snap', tick: this.tick, time: this.now(), players };
  }

  // ---------------- Utilidades ----------------

  private activeMembers(): Member[] {
    return [...this.members.values()].filter((m) => !m.left);
  }

  private migrateHost(): void {
    const host = this.hostId ? this.members.get(this.hostId) : undefined;
    if (host && !host.left && host.conn === 'connected') return;
    const next = this.activeMembers().find((m) => m.conn === 'connected');
    this.hostId = next?.link.id ?? null;
  }

  roomState(): RoomState {
    return {
      code: this.code,
      mode: this.mode,
      maxPlayers: MAX_PLAYERS,
      courseIds: [...this.courseIds],
      status: this.status === 'open' ? 'open' : 'in_match',
      players: [...this.members.values()].map((m) => ({
        id: m.link.id,
        name: m.link.name,
        color: m.color,
        isHost: m.link.id === this.hostId,
        isBot: false,
        ready: m.ready,
        connection: m.left ? 'disconnected' : m.conn,
      })),
      autoStartAt: this.autoStartAt,
    };
  }

  broadcastRoom(): void {
    this.broadcast({ t: 'room', room: this.roomState() });
  }

  broadcast(msg: ServerMessage, exceptId?: string): void {
    for (const m of this.members.values()) if (m.link.id !== exceptId && !m.left && m.link.connected) m.link.send(msg);
  }

  private disposeSims(): void {
    for (const s of this.sims.values()) s.dispose();
    this.sims.clear();
  }

  dispose(): void {
    this.holeGen++;
    this.disposeSims();
  }

  /** Para tests y QA. */
  get debugState() {
    return { holePhase: this.holePhase, tick: this.tick, goTick: this.goTick, holeIndex: this.holeIndex, sims: this.sims };
  }
}

const round = (v: number) => Math.round(v * 10000) / 10000;
