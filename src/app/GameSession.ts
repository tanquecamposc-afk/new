import { GameConfig } from '@/config/game';
import type { GameEngine, PlayerHoleOutcome } from '@/game/GameEngine';
import { COURSES, getCourse } from '@/game/courses';
import type { CourseData } from '@/game/courses/types';
import { loadRapier } from '@/game/physics/rapier';
import { MatchController } from '@/match/MatchController';
import type { MatchPlayer } from '@/match/types';
import { LocalRoom } from '@/multiplayer/LocalRoom';
import { useSettings } from '@/settings/settingsStore';
import { initialHud, useGameStore, type HoleResultRow } from '@/store/gameStore';

export interface HoleMount {
  key: string;
  course: CourseData;
  players: MatchPlayer[];
  localId: string;
  allowPause: boolean;
}

/**
 * Orquestador del flujo de la aplicación (fuera de React):
 * BOOT → LOADING → MAIN_MENU → LOBBY → COUNTDOWN → PLAYING → FINISHED →
 * SPECTATING → HOLE_RESULTS → … → RESULTS → MAIN_MENU / LOBBY.
 * Toda transición pasa por la tabla de estados del store (no hay estados imposibles).
 */
class GameSession {
  private room: LocalRoom | null = null;
  private unsubRoom: (() => void) | null = null;
  private controller: MatchController | null = null;
  private engine: GameEngine | null = null;
  private matchSeq = 0;
  private booted = false;

  private get store() {
    return useGameStore.getState();
  }

  /** Carga inicial: comprueba WebGL y prepara el motor de física. */
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
      s.setLoading(0.8, `Preparando ${COURSES.length} hoyos…`);
      s.setLoading(1, '¡Listo!');
      s.transition('MAIN_MENU');
    } catch (e) {
      console.error(e);
      this.booted = false;
      s.setError('No se pudo cargar el motor de física. Comprueba tu conexión y vuelve a intentarlo.');
    }
  }

  // ---------- Lobby ----------

  openLocalLobby(): void {
    const settings = useSettings.getState();
    this.room = new LocalRoom(settings.playerName, COURSES.map((c) => c.id), settings.practiceBots);
    this.unsubRoom = this.room.subscribe((st) => this.store.setLobby(st));
    this.store.setLobby(this.room.getState());
    this.store.transition('LOBBY');
  }

  setReady(ready: boolean) {
    return this.room?.setReady(ready);
  }

  setName(name: string) {
    const r = this.room?.setName(name);
    if (r?.ok) useSettings.getState().set({ playerName: this.room!.getState().players[0]!.name });
    return r;
  }

  setBots(count: number) {
    const n = Math.max(0, Math.min(GameConfig.maxPracticeBots, count));
    useSettings.getState().set({ practiceBots: n });
    return this.room?.setBotCount(n);
  }

  setCourses(ids: string[]) {
    return this.room?.setCourses(ids);
  }

  // ---------- Partida ----------

  startMatch(): { ok: boolean; error?: string } {
    const room = this.room;
    if (!room) return { ok: false, error: 'no_room' };
    const r = room.start();
    if (!r.ok) return { ok: false, error: r.error };
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

  private holeCache: HoleMount | null = null;

  /**
   * Datos para montar el motor del hoyo actual. Se cachean por hoyo: devolver
   * objetos nuevos en cada render reiniciaría el motor.
   */
  get currentHole(): HoleMount | null {
    const c = this.controller;
    if (!c || !this.room) return null;
    const key = `${this.matchSeq}-${c.holeIndex}`;
    if (this.holeCache?.key !== key) {
      this.holeCache = {
        key,
        course: c.currentHole,
        players: [...c.players],
        localId: this.room.localPlayerId,
        allowPause: this.room.getState().mode === 'local',
      };
    }
    return this.holeCache;
  }

  get standings() {
    return this.controller?.standings() ?? null;
  }

  // Callbacks del motor
  onEngineReady(engine: GameEngine): void {
    this.engine = engine;
    this.store.patchMatch({ phase: 'ready' });
    engine.startCountdown();
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

  onSpectate(): void {
    this.store.transition('SPECTATING');
  }

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
    return this.controller?.isLastHole ?? true;
  }

  nextHole(): void {
    const c = this.controller;
    if (!c || this.store.appState !== 'HOLE_RESULTS') return;
    if (!c.nextHole()) {
      this.showFinalResults();
      return;
    }
    useGameStore.setState({ hud: initialHud });
    this.store.patchMatch({ holeIndex: c.holeIndex, phase: 'loading', countdown: null, holeResults: null, spectate: null, paused: false, live: [] });
    this.store.transition('COUNTDOWN');
  }

  showFinalResults(): void {
    if (!this.controller) return;
    this.store.patchMatch({ standings: this.controller.standings() });
    this.store.transition('RESULTS');
  }

  playAgain(): void {
    this.room?.reopen();
    this.controller = null;
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

export const session = new GameSession();
