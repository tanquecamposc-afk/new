import { GameConfig } from '@/config/game';
import { resolveWsUrl } from '@/config/network';
import type { GameEngine, PlayerHoleOutcome } from '@/game/GameEngine';
import { COURSES, getCourse } from '@/game/courses';
import type { CourseData } from '@/game/courses/types';
import { loadRapier } from '@/game/physics/rapier';
import { MatchController, type Standing } from '@/match/MatchController';
import type { MatchPlayer } from '@/match/types';
import { LocalRoom } from '@/multiplayer/LocalRoom';
import { NetClient, sessionToken } from '@/multiplayer/NetClient';
import { NetworkRoom } from '@/multiplayer/NetworkRoom';
import { OnlineLink } from '@/multiplayer/OnlineLink';
import type { NetHoleResult, ServerMessage } from '@/multiplayer/protocol';
import type { Room } from '@/multiplayer/Room';
import { useSettings } from '@/settings/settingsStore';
import { initialHud, useGameStore, type HoleResultRow, type LiveRow } from '@/store/gameStore';

export interface HoleMount {
  key: string;
  course: CourseData;
  players: MatchPlayer[];
  localId: string;
  allowPause: boolean;
  online: OnlineLink | null;
}

const RESUME_KEY = 'minigolf-party:resume';

/**
 * Orquestador del flujo de la aplicación (fuera de React). Dos modos:
 * - local: LocalRoom + MatchController en el navegador (bots de práctica);
 * - online: NetworkRoom + servidor autoritativo (la partida la dirige el servidor).
 * Toda transición pasa por la tabla de estados del store.
 */
class GameSession {
  private room: Room | null = null;
  private unsubRoom: (() => void) | null = null;
  private controller: MatchController | null = null;
  private engine: GameEngine | null = null;
  private matchSeq = 0;
  private booted = false;
  private holeCache: HoleMount | null = null;
  // ---- online ----
  private net: NetClient | null = null;
  private link: OnlineLink | null = null;
  private netOffs: (() => void)[] = [];
  private onlineHoles: CourseData[] = [];
  private onlinePlayers: MatchPlayer[] = [];
  private onlineHoleIndex = -1;

  private get store() {
    return useGameStore.getState();
  }

  get isOnline(): boolean {
    return !!this.net;
  }

  /** Carga inicial: comprueba WebGL, prepara la física y reanuda una partida online si la había. */
  async boot(webgl: boolean): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    const s = this.store;
    s.transition('LOADING');
    if (!webgl) {
      s.setError('Tu navegador no soporta WebGL. Prueba con Chrome actualizado o activa la aceleración por hardware.');
      return;
    }
    try {
      s.setLoading(0.2, 'Cargando motor de física…');
      await loadRapier();
      s.setLoading(1, '¡Listo!');
      s.transition('MAIN_MENU');
    } catch (e) {
      console.error(e);
      this.booted = false;
      s.setError('No se pudo cargar el motor de física. Comprueba tu conexión y vuelve a intentarlo.');
      return;
    }
    if (sessionToken.get() && readResume()) {
      // Se recargó la página durante una partida online: reconectar con el mismo token.
      void this.connectOnline(null).catch(() => clearResume());
    }
  }

  // =================== Lobby local ===================

  openLocalLobby(): void {
    const settings = useSettings.getState();
    const room = new LocalRoom(settings.playerName, COURSES.map((c) => c.id), settings.practiceBots);
    this.attachRoom(room);
    this.store.transition('LOBBY');
  }

  private attachRoom(room: Room): void {
    this.unsubRoom?.();
    this.room = room;
    this.unsubRoom = room.subscribe((st) => this.store.setLobby(st));
    this.store.setLobby(room.getState());
  }

  get localPlayerId(): string {
    return this.room?.localPlayerId ?? 'local';
  }

  setReady(ready: boolean) {
    return this.room?.setReady(ready);
  }

  setName(name: string) {
    const r = this.room?.setName(name);
    if (r?.ok) {
      const clean = name.replace(/\s+/g, ' ').trim();
      useSettings.getState().set({ playerName: clean });
    }
    return r;
  }

  setBots(count: number) {
    if (!(this.room instanceof LocalRoom)) return undefined;
    const n = Math.max(0, Math.min(GameConfig.maxPracticeBots, count));
    useSettings.getState().set({ practiceBots: n });
    return this.room.setBotCount(n);
  }

  setCourses(ids: string[]) {
    return this.room?.setCourses(ids);
  }

  // =================== Online ===================

  /** Partida rápida: MAIN_MENU → QUICK_PLAY → MATCHMAKING → LOBBY. */
  async quickPlay(): Promise<void> {
    if (!this.store.transition('QUICK_PLAY')) return;
    this.store.transition('MATCHMAKING');
    try {
      await this.connectOnline({ t: 'quick_play' });
    } catch {
      this.failOnline('No se pudo conectar con el servidor de juego. Inténtalo de nuevo más tarde.');
    }
  }

  /** Sala privada: crear (code = null) o unirse con un código. */
  async privateRoom(code: string | null): Promise<string | null> {
    try {
      await this.connectOnline(code ? { t: 'join_room', code } : { t: 'create_room' });
      return null;
    } catch (e) {
      const msg = e instanceof Error && e.message !== 'connect_failed' && e.message !== 'timeout' ? e.message : 'No se pudo conectar con el servidor de juego.';
      this.disconnectOnline();
      return msg;
    }
  }

  openPrivateRoomScreen(): void {
    this.store.transition('PRIVATE_ROOM');
  }

  /**
   * Conecta (o reutiliza la conexión) y envía la petición de sala. Resuelve al
   * entrar en una sala; rechaza con el mensaje de error del servidor.
   */
  private connectOnline(request: { t: 'quick_play' } | { t: 'create_room' } | { t: 'join_room'; code: string } | null): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = async () => {
        if (!this.net) {
          this.net = new NetClient(resolveWsUrl());
          this.bindNet(this.net);
          const welcome = await this.net.connect(useSettings.getState().playerName);
          if (!welcome.resumed && !request) throw new Error('No hay partida que reanudar.');
        }
        const net = this.net;
        const offRoom = net.on('room', () => {
          cleanup();
          resolve();
        });
        const offErr = net.on('error', (m) => {
          if (m.code === 'rate_limited') return;
          cleanup();
          reject(new Error(m.message));
        });
        const cleanup = () => {
          offRoom();
          offErr();
        };
        if (request) net.send(request);
      };
      start().catch((e) => reject(e));
    });
  }

  private bindNet(net: NetClient): void {
    const on = <T extends ServerMessage['t']>(t: T, h: (m: Extract<ServerMessage, { t: T }>) => void) => this.netOffs.push(net.on(t, h));
    on('room', (m) => {
      if (!(this.room instanceof NetworkRoom)) {
        this.attachRoom(new NetworkRoom(net, m.room));
        this.store.setLobby(m.room);
      }
      writeResume();
      const st = this.store.appState;
      if (st === 'MATCHMAKING' || st === 'PRIVATE_ROOM' || st === 'MAIN_MENU') this.store.transition('LOBBY');
      // Fin de partida → la sala vuelve a estar abierta; si estábamos en resultados, seguimos ahí.
    });
    on('match_start', (m) => this.onMatchStart(m.holes, m.players));
    on('hole', (m) => this.onNetHole(m.hole));
    on('hole_end', (m) => this.onNetHoleEnd(m.hole, m.results, m.standings));
    on('match_end', (m) => this.onNetMatchEnd(m.standings));
    on('conn', (m) => {
      const p = this.onlinePlayers.find((x) => x.id === m.playerId);
      if (p && m.playerId !== net.playerId) {
        this.store.patchHud({ lastEvent: { text: `${p.name} ${m.state === 'connected' ? 'ha vuelto' : 'se ha desconectado'}`, tone: m.state === 'connected' ? 'info' : 'bad', id: Date.now() } });
      }
    });
    on('left_room', () => undefined);
    this.netOffs.push(
      net.onStatus((s) => {
        useGameStore.setState({ connection: s });
        if (s === 'closed' && this.net === net && this.store.appState !== 'MAIN_MENU') {
          this.failOnline('Se perdió la conexión con el servidor.');
        }
      }),
    );
  }

  private onMatchStart(holeIds: string[], players: { id: string; name: string; color: number }[]): void {
    const holes = holeIds.map((id) => getCourse(id)).filter((c): c is CourseData => !!c);
    const same = this.onlineHoles.length && holes.map((h) => h.id).join() === this.onlineHoles.map((h) => h.id).join() && this.store.match;
    if (same) return; // reconexión dentro de la misma partida
    this.onlineHoles = holes;
    this.onlinePlayers = players.map((p) => ({ ...p, isBot: false }));
    this.onlineHoleIndex = -1;
    this.link?.dispose();
    this.link = new OnlineLink(this.net!, this.net!.playerId!);
    this.matchSeq++;
    const lobby = this.store.lobby;
    this.store.setMatch({
      mode: lobby?.mode === 'private' ? 'private' : 'quick',
      holeIndex: 0,
      holeCount: holes.length,
      phase: 'loading',
      countdown: null,
      live: [],
      playersRemaining: players.length,
      position: 1,
      spectate: null,
      paused: false,
      holeResults: null,
      standings: null,
    });
    useGameStore.setState({ hud: initialHud });
  }

  private onNetHole(h: import('@/multiplayer/protocol').HoleInfo): void {
    if (!this.link) return;
    this.link.setHole(h);
    if (h.index !== this.onlineHoleIndex) {
      this.onlineHoleIndex = h.index;
      useGameStore.setState({ hud: initialHud });
      this.store.patchMatch({ holeIndex: h.index, phase: 'loading', countdown: null, holeResults: null, spectate: null, live: [] });
      const st = this.store.appState;
      if (st === 'LOBBY' || st === 'HOLE_RESULTS' || st === 'RESULTS' || st === 'MAIN_MENU') {
        if (st === 'MAIN_MENU') this.store.transition('LOBBY');
        this.store.transition('COUNTDOWN');
      }
    }
  }

  private onNetHoleEnd(hole: number, results: NetHoleResult[], standings: Standing[]): void {
    const live = this.store.match?.live ?? [];
    const byId = new Map(this.onlinePlayers.map((p) => [p.id, p]));
    const rows: HoleResultRow[] = results.map((r, i) => {
      const p = byId.get(r.playerId);
      const prev: Partial<LiveRow> = live.find((l) => l.id === r.playerId) ?? {};
      return {
        id: r.playerId,
        name: p?.name ?? prev.name ?? '?',
        color: p?.color ?? 0xffffff,
        isBot: false,
        isLocal: r.playerId === this.net?.playerId,
        strokes: r.strokes,
        finished: true,
        completed: r.completed,
        timeMs: r.timeMs,
        position: i + 1,
        score: r.score,
      };
    });
    this.store.patchMatch({ holeResults: rows, standings, holeIndex: hole, phase: 'ended', spectate: null });
    const st = this.store.appState;
    if (st === 'MAIN_MENU') this.store.transition('LOBBY');
    this.store.transition('HOLE_RESULTS');
  }

  private onNetMatchEnd(standings: Standing[]): void {
    this.store.patchMatch({ standings });
    this.store.transition('RESULTS');
  }

  get nextRequested(): boolean {
    return this.nextSent;
  }
  private nextSent = false;

  private failOnline(message: string): void {
    this.disconnectOnline();
    clearResume();
    useGameStore.setState({ error: null });
    this.store.setError(message);
  }

  private disconnectOnline(): void {
    this.netOffs.forEach((o) => o());
    this.netOffs = [];
    this.link?.dispose();
    this.link = null;
    this.net?.close(true);
    this.net = null;
    this.onlineHoles = [];
    this.onlinePlayers = [];
    this.onlineHoleIndex = -1;
    useGameStore.setState({ connection: 'idle' });
  }

  /** Hora del servidor estimada (ms): cuentas atrás del lobby online. */
  serverNow(): number {
    return this.net?.clock.serverNow() ?? Date.now();
  }

  get latencyMs(): number | null {
    return this.net ? Math.round(this.net.clock.rtt) : null;
  }

  /** Simula una caída de red (QA/debug). */
  dropConnectionForTesting(): void {
    this.net?.dropForTesting();
  }

  // =================== Partida ===================

  startMatch(): { ok: boolean; error?: string } {
    const room = this.room;
    if (!room) return { ok: false, error: 'no_room' };
    const r = room.start();
    if (!r.ok) return { ok: false, error: r.error };
    if (room instanceof NetworkRoom) return { ok: true }; // el servidor enviará match_start
    const st = room.getState();
    const holes = st.courseIds.map((id) => getCourse(id)).filter((c): c is CourseData => !!c);
    const players: MatchPlayer[] = st.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isBot: p.isBot,
      botSkill: p.isBot ? 0.55 + ((i * 37) % 40) / 100 : undefined,
    }));
    this.controller = new MatchController(holes, players);
    this.matchSeq++;
    this.store.setMatch({
      mode: st.mode,
      holeIndex: 0,
      holeCount: holes.length,
      phase: 'loading',
      countdown: null,
      live: [],
      playersRemaining: players.length,
      position: 1,
      spectate: null,
      paused: false,
      holeResults: null,
      standings: null,
    });
    useGameStore.setState({ hud: initialHud });
    this.store.transition('COUNTDOWN');
    return { ok: true };
  }

  /**
   * Datos para montar el motor del hoyo actual. Se cachean por hoyo: devolver
   * objetos nuevos en cada render reiniciaría el motor.
   */
  get currentHole(): HoleMount | null {
    let key: string;
    let course: CourseData | undefined;
    let players: MatchPlayer[];
    let localId: string;
    if (this.net && this.link) {
      if (this.onlineHoleIndex < 0) return null;
      key = `net-${this.matchSeq}-${this.onlineHoleIndex}`;
      course = this.onlineHoles[this.onlineHoleIndex];
      players = this.onlinePlayers;
      localId = this.net.playerId!;
    } else {
      const c = this.controller;
      if (!c || !this.room) return null;
      key = `${this.matchSeq}-${c.holeIndex}`;
      course = c.currentHole;
      players = [...c.players];
      localId = this.room.localPlayerId;
    }
    if (!course) return null;
    if (this.holeCache?.key !== key) {
      this.holeCache = { key, course, players, localId, allowPause: !this.net, online: this.net ? this.link : null };
    }
    return this.holeCache;
  }

  get standings() {
    return this.controller?.standings() ?? null;
  }

  onEngineReady(engine: GameEngine): void {
    this.engine = engine;
    this.store.patchMatch({ phase: 'ready' });
    if (!this.net) engine.startCountdown();
  }

  onEngineDisposed(engine: GameEngine): void {
    if (this.engine === engine) this.engine = null;
  }

  onHoleStarted(): void {
    this.store.transition('PLAYING');
  }

  onLocalFinished(): void {
    this.store.transition('FINISHED');
  }

  onLocalUnfinished(): void {
    this.store.transition('PLAYING');
  }

  onSpectate(): void {
    this.store.transition('SPECTATING');
  }

  /** Fin de hoyo en partidas locales (en online lo anuncia el servidor). */
  onHoleEnd(results: PlayerHoleOutcome[]): void {
    const c = this.controller;
    if (!c) return;
    for (const r of results) c.recordResult(c.holeIndex, r.playerId, r);
    const live = this.store.match?.live ?? [];
    const rows: HoleResultRow[] = c.holeResults().map((r, i) => {
      const row = live.find((l) => l.id === r.playerId)!;
      return { ...row, strokes: r.strokes, timeMs: r.timeMs, completed: r.completed, finished: true, position: i + 1, score: r.score };
    });
    this.store.patchMatch({ holeResults: rows, standings: c.standings() });
    this.store.transition('HOLE_RESULTS');
  }

  get isLastHole(): boolean {
    if (this.net) return this.onlineHoleIndex >= this.onlineHoles.length - 1;
    return this.controller?.isLastHole ?? true;
  }

  nextHole(): void {
    if (this.store.appState !== 'HOLE_RESULTS') return;
    if (this.net) {
      // Online: el servidor avanza cuando todos están listos o se acaba el tiempo.
      this.link?.sendNextReady();
      this.nextSent = true;
      return;
    }
    const c = this.controller;
    if (!c) return;
    if (!c.nextHole()) {
      this.showFinalResults();
      return;
    }
    useGameStore.setState({ hud: initialHud });
    this.store.patchMatch({ holeIndex: c.holeIndex, phase: 'loading', countdown: null, holeResults: null, spectate: null, paused: false, live: [] });
    this.store.transition('COUNTDOWN');
  }

  showFinalResults(): void {
    if (this.net) {
      this.nextHole();
      return;
    }
    if (!this.controller) return;
    this.store.patchMatch({ standings: this.controller.standings() });
    this.store.transition('RESULTS');
  }

  playAgain(): void {
    if (this.room instanceof LocalRoom) this.room.reopen();
    this.controller = null;
    this.nextSent = false;
    this.onlineHoles = [];
    this.onlineHoleIndex = -1;
    this.store.setMatch(null);
    this.store.transition('LOBBY');
  }

  exitToMenu(): void {
    this.unsubRoom?.();
    this.unsubRoom = null;
    this.room?.leave();
    this.room = null;
    this.controller = null;
    this.engine = null;
    this.nextSent = false;
    if (this.net) this.disconnectOnline();
    clearResume();
    this.store.setMatch(null);
    this.store.setLobby(null);
    useGameStore.setState({ hud: initialHud });
    this.store.transition('MAIN_MENU');
  }

  // Acciones del HUD sobre el motor
  resetBall = () => this.engine?.resetBall();
  toggleOverview = () => this.engine?.toggleOverview();
  spectateNext = (dir: 1 | -1) => this.engine?.spectateNext(dir);
  setPaused = (p: boolean) => this.engine?.setPaused(p);

  /** Tras un error: volver al menú con el estado limpio. */
  recover(): void {
    useGameStore.setState({ error: null, appState: 'ERROR' });
    this.exitToMenu();
  }
}

function writeResume() {
  try {
    sessionStorage.setItem(RESUME_KEY, '1');
  } catch {
    /* sin almacenamiento */
  }
}
function readResume(): boolean {
  try {
    return sessionStorage.getItem(RESUME_KEY) === '1';
  } catch {
    return false;
  }
}
function clearResume() {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export const session = new GameSession();
