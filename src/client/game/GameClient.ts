/**
 * Glue between the pure simulation (src/core) and the browser: runs the fixed-step loop, feeds
 * player intent in, and hands the results to the renderer, the audio engine and the HUD store.
 *
 * In this local build the client also hosts the simulation ("embedded server"): the same
 * Simulation class is meant to run on a real server once multiplayer exists. Everything shown or
 * played here is a reaction to the simulation's state and events — nothing is decided here.
 */
import { buildFiringRange } from '../../core/maps/firingRange.js';
import { buildQuarryArena } from '../../core/maps/quarryArena.js';
import { buildTrainingGrounds } from '../../core/maps/trainingGrounds.js';
import {
  formatTicks,
  recordCourseResult,
  recordSkirmishResult,
  type PlayableMode,
  type SaveFile,
  type SkirmishPreference,
} from '../../core/meta/save.js';
import { defaultSettings, sanitizeSettings, type GameSettings, type InputAction } from '../../core/meta/settings.js';
import { computeCameraRig, makeCameraRig } from '../../core/sim/cameraRig.js';
import { eyeHeight } from '../../core/sim/character.js';
import { FixedStepper } from '../../core/sim/clock.js';
import { DEFAULT_CAMERA, DT, TICK_RATE } from '../../core/sim/config.js';
import { courseElapsedTicks } from '../../core/sim/course.js';
import { currentSpreadDegrees, findPickupCandidate, makeAimTrace, traceAim, SHOT_END } from '../../core/sim/gunplay.js';
import { neutralInput, type InputFrame } from '../../core/sim/input.js';
import { INVENTORY_SLOTS, activeItem, countFreeSlots, cycleSlot } from '../../core/sim/inventory.js';
import { getConsumableDef } from '../../core/sim/items.js';
import type { MapDefinition } from '../../core/sim/map.js';
import { createFiringRange, createSkirmish, createTrainingCourse, type MatchSetup } from '../../core/sim/matchSetup.js';
import { angleDelta, lerp, yawToward } from '../../core/sim/math.js';
import { SIM_EVENTS, Simulation, type SimPlayer } from '../../core/sim/simulation.js';
import { getWeaponDef } from '../../core/sim/weapons.js';
import { makeGroundInfo, type SurfaceMaterial } from '../../core/sim/world.js';
import type { MatchEvent } from '../../core/types.js';
import { AudioEngine, type GunSound } from '../audio/AudioEngine.js';
import {
  activeSettings,
  appStore,
  initialCombat,
  initialHud,
  type Banner,
  type CombatHud,
  type DamageArc,
  type DamageNumber,
  type FeedEntry,
  type Overlay,
  type PickupHud,
  type PlacementRow,
  type SkirmishResult,
  type SlotHud,
  type TargetHud,
} from '../app/appState.js';
import { translate } from '../app/i18n.js';
import { storeSave } from '../app/persistence.js';
import { InputManager } from '../input/InputManager.js';
import { neutralPose, type AvatarPose } from '../render/avatar.js';
import { SceneRenderer, WebGLUnavailableError, type FrameView, type RemoteView, type ScreenPoint } from '../render/SceneRenderer.js';

const HUD_INTERVAL = 0.1;
/** Where the avatar stands in the lobby: on top of the central pedestal of the training map. */
const LOBBY_STAGE = { x: 0, y: 2.4, z: 0 };
const DISSOLVE_SECONDS = 0.45;
const RESULTS_DELAY_DEFEAT = 2.4;
const RESULTS_DELAY_VICTORY = 2.2;
const PING_SECONDS = 4.5;
const AIM_TRACE_DISTANCE = 250;
const FEED_SECONDS = 6;
const FEED_MAX = 5;
const DAMAGE_NUMBER_SECONDS = 0.9;
const DAMAGE_ARC_SECONDS = 1.6;
const BANNER_SECONDS = 2.6;
const REMOTE_FOOTSTEP_STRIDE = 1.1;

/** Presentation-only state kept for every other participant. */
interface RemoteTrack {
  prevX: number;
  prevY: number;
  prevZ: number;
  /** Client time at which the participant was eliminated, or -1 while alive. */
  eliminatedAt: number;
  nextFootstepAt: number;
  view: RemoteView;
}

interface TimedArc {
  id: number;
  x: number;
  z: number;
  expires: number;
}

export class GameClient {
  readonly audio = new AudioEngine();

  private renderer: SceneRenderer | null = null;
  private readonly input: InputManager;
  private readonly maps = new Map<PlayableMode, MapDefinition>();
  private sim: Simulation | null = null;
  private player: SimPlayer | null = null;
  private mode: PlayableMode = 'course';
  private readonly stepper = new FixedStepper(DT);
  private readonly inputFrame: InputFrame = neutralInput();
  private readonly provideInput = (id: string): InputFrame | undefined => (this.player && id === this.player.id ? this.inputFrame : undefined);
  private seq = 0;
  private matchCounter = 0;
  private paused = true;
  /** Optional fixed seed from the page address (?seed=123), for reproducing a match. */
  private readonly baseSeed: number | null;

  // Presentation-only smoothing state.
  private prevX = 0;
  private prevY = 0;
  private prevZ = 0;
  private alpha = 1;
  private smoothY = 0;
  private smoothEye = 1.6;
  private cameraDistance: number = DEFAULT_CAMERA.distance;
  private fov = 75;
  private nextFootstepAt = 0;
  private slideSprayTimer = 0;
  private readonly rig = makeCameraRig();
  private readonly ground = makeGroundInfo();
  private readonly aimTrace = makeAimTrace();
  private readonly muzzle = { x: 0, y: 0, z: 0 };
  private readonly screenPoint: ScreenPoint = { x: 0, y: 0, visible: false };
  private readonly remotes = new Map<string, RemoteTrack>();
  private localEliminatedAt = -1;

  // Match flow.
  private finishAt = -1;
  private resultRecorded = false;
  private lastCountdown = 0;

  // Transient HUD items and their expiry times (client clock).
  private effectId = 0;
  private readonly feedExpiry = new Map<number, number>();
  private readonly numberExpiry = new Map<number, number>();
  private arcs: TimedArc[] = [];
  private pings: Array<{ x: number; z: number }> = [];
  private pingsUntil = 0;
  private bannerTimer: number | undefined;

  private raf = 0;
  private lastFrameTime = 0;
  private time = 0;
  private hudTimer = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fps = 0;
  private frameMs = 0;
  private toastId = 0;
  private toastTimer: number | undefined;

  private readonly pose: AvatarPose = neutralPose();
  private readonly view: FrameView = {
    timeSeconds: 0,
    frameSeconds: 0,
    camera: { x: 0, y: 5, z: 10, yaw: 0, pitch: 0, fovDegrees: 75 },
    player: { x: 0, y: 0, z: 0, yaw: 0, pose: this.pose, groundOffset: 0, visible: true, dissolve: 0 },
    others: [],
    otherCount: 0,
    loot: null,
    nextAnchor: -1,
    reducedMotion: false,
    lobby: true,
  };

  constructor(private readonly host: HTMLElement) {
    const settings = activeSettings();
    this.baseSeed = readSeedFromAddress();
    this.mode = appStore.get().mode;
    this.input = new InputManager(settings, {
      onAction: (action) => {
        if (action === 'pause') this.togglePause();
        else if (action === 'restart') this.restartCourse();
        else if (action === 'help') appStore.set((s) => ({ showHelp: !s.showHelp }));
      },
      onEscape: () => this.handleEscape(),
      onPointerUnlock: () => {
        if (this.sim && !this.paused) this.pause();
      },
      onLookModeChange: (mode) => appStore.set({ lookMode: mode }),
      onTouchDetected: () => appStore.set({ touch: true, showHelp: false }),
      onWheel: (direction) => {
        if (this.player) this.input.requestSlot(cycleSlot(this.player.combat.inventory, direction));
      },
    });

    try {
      this.renderer = new SceneRenderer(
        host,
        {
          onContextLost: () => {
            appStore.set({ contextLost: true });
            if (this.sim && !this.paused) this.pause();
          },
          onContextRestored: () => appStore.set({ contextLost: false }),
        },
        settings.display.qualityPreset,
        settings.display.renderScale,
      );
      this.renderer.loadMap(this.mapFor('course'), this.translator());
    } catch (error) {
      if (!(error instanceof WebGLUnavailableError)) console.error('[E_RENDER_INIT]', error);
      appStore.set({ fatalError: 'webgl' });
      this.renderer = null;
    }

    this.input.attach(host);
    this.applySettings(settings);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.exposeDebugHandle();
  }

  start(): void {
    if (this.raf !== 0) return;
    this.lastFrameTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.input.detach();
    this.renderer?.dispose();
    this.renderer = null;
  }

  /* ---- lobby choices ----------------------------------------------------------------------- */

  /** Highlights a mode in the lobby and remembers it for the next visit. */
  selectMode(mode: PlayableMode): void {
    if (appStore.get().mode === mode) return;
    this.audio.unlock();
    this.audio.uiHover();
    appStore.set({ mode });
    this.updateProfile((profile) => ({ ...profile, lastMode: mode }));
  }

  setSkirmishOptions(options: Partial<SkirmishPreference>): void {
    this.audio.unlock();
    this.audio.uiClick();
    this.updateProfile((profile) => ({ ...profile, skirmishOptions: { ...profile.skirmishOptions, ...options } }));
  }

  /* ---- match flow -------------------------------------------------------------------------- */

  /** Lobby -> match in the given mode. The controls start on the first click. */
  startMode(mode: PlayableMode = appStore.get().mode): void {
    if (!this.renderer) return;
    this.audio.unlock();
    this.audio.uiClick();
    this.updateProfile((profile) => (profile.lastMode === mode ? profile : { ...profile, lastMode: mode }));
    this.beginMatch(mode);
  }

  /** Kept for callers of phase 1: starts the checkpoint course. */
  startTraining(): void {
    this.startMode('course');
  }

  /** Takes control (from the click-to-play prompt or the pause menu). Needs a user gesture. */
  resume(): void {
    if (!this.sim || appStore.get().contextLost) return;
    this.audio.unlock();
    this.paused = false;
    this.input.gameplayEnabled = true;
    this.stepper.reset();
    this.lastFrameTime = performance.now();
    appStore.set({ overlay: 'none' });
    void this.input.requestPointerLock();
  }

  pause(overlay: Overlay = 'pause'): void {
    if (!this.sim) return;
    this.paused = true;
    this.input.gameplayEnabled = false;
    this.input.releaseAll();
    this.input.releasePointerLock();
    this.audio.setSlide(0);
    appStore.set({ overlay });
  }

  togglePause(): void {
    if (!this.sim) return;
    const { overlay } = appStore.get();
    if (overlay === 'none') this.pause();
    else if (overlay === 'pause' || overlay === 'clickToPlay') this.resume();
  }

  /** Starts the current mode over: back to the start line, or a brand new match. */
  restart(): void {
    if (!this.sim) return;
    if (this.mode === 'course') {
      this.restartCourse();
      return;
    }
    this.audio.uiClick();
    this.beginMatch(this.mode);
    this.resume();
  }

  /** Course only: back to the start line with a fresh clock. */
  restartCourse(): void {
    if (!this.sim || !this.player || this.mode !== 'course') return;
    if (!this.sim.restartCourse(this.player.id)) return;
    this.sim.drainEvents();
    this.snapPresentation();
    const map = this.sim.map;
    appStore.set({
      result: null,
      hud: { ...initialHud(), anchorsTotal: map.checkpoints.length, nextHintKey: map.checkpoints[0]?.hintKey ?? null },
    });
    const { overlay } = appStore.get();
    if (overlay === 'results' || overlay === 'pause') this.resume();
  }

  exitToLobby(): void {
    this.audio.uiBack();
    this.paused = true;
    this.input.gameplayEnabled = false;
    this.input.releaseAll();
    this.input.releasePointerLock();
    this.audio.setSlide(0);
    this.audio.setAmbience(0.5);
    this.sim = null;
    this.player = null;
    this.remotes.clear();
    this.finishAt = -1;
    window.clearTimeout(this.bannerTimer);
    // The lobby stage lives on the training map.
    const lobbyMap = this.mapFor('course');
    if (this.renderer) {
      if (this.renderer.mapId !== lobbyMap.id) this.renderer.loadMap(lobbyMap, this.translator());
      else this.renderer.clearRemotes();
    }
    appStore.set({ screen: 'lobby', overlay: 'none', result: null, draftSettings: null, banner: null, feed: [], damageArcs: [], damageNumbers: [] });
  }

  /** On-screen buttons (touch) press and release actions through the same input layer. */
  setTouchButton(action: InputAction, pressed: boolean): void {
    this.audio.unlock();
    this.input.setVirtualButton(action, pressed);
  }

  /** Selects an inventory slot from the HUD (touch or click). The simulation validates it. */
  selectSlot(slot: number): void {
    this.input.requestSlot(slot);
  }

  /* ---- settings ---------------------------------------------------------------------------- */

  openSettings(): void {
    const state = appStore.get();
    if (state.overlay === 'settings') return;
    if (this.sim && !this.paused) this.pause();
    this.audio.uiClick();
    const current = appStore.get();
    appStore.set({ settingsReturn: current.overlay, overlay: 'settings', draftSettings: structuredClone(current.save.settings) });
  }

  /** Live preview: every edit is applied immediately but only saved by `closeSettings(true)`. */
  updateDraft(mutate: (draft: GameSettings) => void): void {
    const state = appStore.get();
    if (!state.draftSettings) return;
    const draft = structuredClone(state.draftSettings);
    mutate(draft);
    const clean = sanitizeSettings(draft);
    appStore.set({ draftSettings: clean });
    this.applySettings(clean);
  }

  resetDraft(): void {
    if (!appStore.get().draftSettings) return;
    const defaults = defaultSettings();
    appStore.set({ draftSettings: defaults });
    this.applySettings(defaults);
    this.audio.uiBack();
  }

  closeSettings(apply: boolean): void {
    const state = appStore.get();
    if (state.overlay !== 'settings') return;
    let save = state.save;
    let storageBlocked = state.storageBlocked;
    if (apply && state.draftSettings) {
      save = { ...state.save, settings: state.draftSettings };
      storageBlocked = !storeSave(save);
      this.audio.uiClick();
    } else {
      this.audio.uiBack();
    }
    appStore.set({ save, storageBlocked, draftSettings: null, overlay: state.settingsReturn, settingsReturn: 'none' });
    this.applySettings(save.settings);
  }

  /** Pushes a settings object into every subsystem that depends on it. */
  applySettings(settings: GameSettings): void {
    this.renderer?.setQuality(settings.display.qualityPreset, settings.display.renderScale);
    this.renderer?.setTranslator(this.translator(settings));
    this.input.applySettings(settings);
    this.audio.applySettings(settings);
    document.documentElement.style.setProperty('--ui-scale', String(settings.accessibility.uiScale));
    document.documentElement.lang = settings.locale === 'en' ? 'en' : 'es';
  }

  /* ---- starting a match -------------------------------------------------------------------- */

  private mapFor(mode: PlayableMode): MapDefinition {
    let map = this.maps.get(mode);
    if (!map) {
      map = mode === 'course' ? buildTrainingGrounds() : mode === 'range' ? buildFiringRange() : buildQuarryArena();
      this.maps.set(mode, map);
    }
    return map;
  }

  private newSeed(): number {
    if (this.baseSeed !== null) return (this.baseSeed + this.matchCounter) >>> 0;
    return (Math.floor(Math.random() * 0x100000000) ^ Date.now()) >>> 0;
  }

  private beginMatch(mode: PlayableMode): void {
    const renderer = this.renderer;
    if (!renderer) return;
    const profile = appStore.get().save.profile;
    const matchId = `local-${++this.matchCounter}`;
    const map = this.mapFor(mode);
    let setup: MatchSetup;
    try {
      if (mode === 'course') {
        setup = createTrainingCourse({ matchId, alias: profile.alias, map });
      } else if (mode === 'range') {
        setup = createFiringRange({ matchId, alias: profile.alias, map, seed: this.newSeed() });
      } else {
        setup = createSkirmish({
          matchId,
          alias: profile.alias,
          map,
          seed: this.newSeed(),
          bots: profile.skirmishOptions.bots,
          difficulty: profile.skirmishOptions.difficulty,
        });
      }
    } catch (error) {
      console.error('[E_MATCH_START]', error);
      this.showToast(this.tr('error.generic', { code: 'E_MATCH_START' }));
      return;
    }

    this.mode = mode;
    this.sim = setup.sim;
    this.player = setup.sim.getPlayer(setup.localId) ?? null;
    setup.sim.drainEvents();
    if (renderer.mapId !== map.id) renderer.loadMap(map, this.translator());
    else renderer.clearRemotes();

    // One presentation track per other participant; bots get a look each, dummies their own.
    this.remotes.clear();
    let botIndex = 0;
    for (const other of setup.sim.roster) {
      if (other === this.player) continue;
      this.remotes.set(other.id, {
        prevX: other.char.x,
        prevY: other.char.y,
        prevZ: other.char.z,
        eliminatedAt: -1,
        nextFootstepAt: other.char.strideMeters + REMOTE_FOOTSTEP_STRIDE,
        view: {
          id: other.id,
          look: other.contender ? botIndex++ : -1,
          x: other.char.x,
          y: other.char.y,
          z: other.char.z,
          yaw: other.char.yaw,
          pose: neutralPose(),
          groundOffset: 0,
          visible: true,
          dissolve: 0,
        },
      });
    }

    this.stepper.reset();
    this.seq = 0;
    this.finishAt = -1;
    this.resultRecorded = false;
    this.localEliminatedAt = -1;
    this.lastCountdown = 0;
    this.feedExpiry.clear();
    this.numberExpiry.clear();
    this.arcs = [];
    this.pings = [];
    this.pingsUntil = 0;
    window.clearTimeout(this.bannerTimer);
    this.snapPresentation();
    this.paused = true;
    this.input.gameplayEnabled = false;

    const state = appStore.get();
    const firstTime = mode === 'course' ? profile.bestCourseTicks[map.id] === undefined : profile.skirmish.played === 0;
    appStore.set({
      screen: 'match',
      overlay: 'clickToPlay',
      mode,
      result: null,
      hud: { ...initialHud(), anchorsTotal: map.checkpoints.length, nextHintKey: mode === 'course' ? (map.checkpoints[0]?.hintKey ?? null) : null },
      combat: this.buildCombatHud(),
      hitMarker: null,
      damageArcs: [],
      damageNumbers: [],
      feed: [],
      banner: null,
      showHelp: firstTime && !state.touch,
    });
    this.audio.setAmbience(1);
  }

  /* ---- main loop --------------------------------------------------------------------------- */

  private readonly frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const settings = activeSettings();
    const cap = settings.display.maxFps;
    const elapsedMs = now - this.lastFrameTime;
    // Frame limiter: skip this callback when it arrives earlier than the cap allows.
    if (cap > 0 && elapsedMs < 1000 / cap - 1) return;
    this.lastFrameTime = now;
    const frameSeconds = Math.min(0.25, Math.max(0, elapsedMs / 1000));
    this.time += frameSeconds;

    if (this.sim && this.player && !this.paused) {
      this.simulate(frameSeconds);
      if (this.finishAt >= 0 && this.time >= this.finishAt) this.finishSkirmish();
    }
    if (this.renderer && !appStore.get().contextLost) {
      if (this.sim && this.player) this.composeMatchView(frameSeconds, settings);
      else this.composeLobbyView(frameSeconds, settings);
      this.renderer.render(this.view);
    }
    this.updateHud(frameSeconds, settings);
  };

  private simulate(frameSeconds: number): void {
    const sim = this.sim!;
    const player = this.player!;
    this.input.update(frameSeconds);
    const plan = this.stepper.advance(frameSeconds);
    for (let i = 0; i < plan.steps; i++) {
      const c = player.char;
      this.prevX = c.x;
      this.prevY = c.y;
      this.prevZ = c.z;
      for (const other of sim.roster) {
        const track = this.remotes.get(other.id);
        if (!track) continue;
        track.prevX = other.char.x;
        track.prevY = other.char.y;
        track.prevZ = other.char.z;
      }
      this.input.sample(++this.seq, this.inputFrame);
      sim.step(this.provideInput);
      this.handleEvents(sim.drainEvents());
      this.footsteps(player);
      this.remoteFootsteps(sim);
      this.countdownBeeps(sim);
      if (this.paused) break; // an event (course finished) paused the match
    }
    this.alpha = plan.alpha;
  }

  private countdownBeeps(sim: Simulation): void {
    if (sim.phase !== 'warmup') return;
    const seconds = Math.ceil(sim.warmupTicksLeft / TICK_RATE);
    if (seconds !== this.lastCountdown && seconds > 0) this.audio.countdownBeep(false);
    this.lastCountdown = seconds;
  }

  /* ---- reacting to what the simulation reports ---------------------------------------------- */

  private handleEvents(events: MatchEvent[]): void {
    const renderer = this.renderer;
    const sim = this.sim;
    const player = this.player;
    if (!player || !sim) return;
    const c = player.char;
    const localId = player.id;
    for (const event of events) {
      const own = event.playerId === localId;
      const data = event.data;
      switch (event.type) {
        case SIM_EVENTS.playerJumped:
          if (own) this.audio.jump();
          break;
        case SIM_EVENTS.playerLanded: {
          if (!own) break;
          const fall = num(data, 'fallHeight');
          if (fall > 0.25) {
            this.audio.land(fall);
            renderer?.landingPuff(c.x, c.y, c.z, fall / 3);
          }
          break;
        }
        case SIM_EVENTS.slideStarted:
          if (own) this.audio.slideStart();
          break;
        case SIM_EVENTS.mantleStarted:
          if (own) this.audio.mantle();
          break;
        case SIM_EVENTS.checkpointReached: {
          if (!own) break;
          const index = num(data, 'index');
          const cp = sim.map.checkpoints[index];
          if (cp) renderer?.anchorBurst(cp.x, cp.y, cp.z);
          this.audio.checkpoint(index);
          this.showToast(this.tr('hud.checkpoint', { n: index + 1, total: num(data, 'total'), time: formatTicks(num(data, 'splitTicks'), TICK_RATE) }));
          break;
        }
        case SIM_EVENTS.courseCompleted:
          if (own) this.finishCourse(num(data, 'ticks'));
          break;
        case SIM_EVENTS.playerRespawned: {
          if (own) {
            this.localEliminatedAt = -1;
            this.snapPresentation();
          } else {
            const track = this.remotes.get(event.playerId);
            const other = sim.getPlayer(event.playerId);
            if (track && other) {
              track.eliminatedAt = -1;
              track.prevX = other.char.x;
              track.prevY = other.char.y;
              track.prevZ = other.char.z;
            }
          }
          break;
        }
        case SIM_EVENTS.courseRestarted:
          if (own) this.snapPresentation();
          break;
        case SIM_EVENTS.simulationError:
          console.error('[E_SIMULATION]', data);
          this.showToast(this.tr('error.generic', { code: String(data?.['code'] ?? 'E_SIMULATION') }));
          break;

        case SIM_EVENTS.matchPhaseChanged:
          if (data?.['phase'] === 'active' && sim.rules.warmupTicks > 0) {
            this.audio.countdownBeep(true);
            this.showBanner('go', this.tr('banner.go'));
          }
          break;
        case SIM_EVENTS.matchEnded: {
          const winners = data?.['winnerIds'];
          if (Array.isArray(winners) && winners.includes(localId)) {
            this.showBanner('victory', this.tr('banner.victory'));
            this.finishAt = this.time + RESULTS_DELAY_VICTORY;
          }
          break;
        }
        case SIM_EVENTS.showdownPing:
          this.onShowdownPing(data, localId);
          break;

        case SIM_EVENTS.shotFired:
          this.onShotFired(event, own);
          break;
        case SIM_EVENTS.dryFire:
          if (own) {
            this.audio.dryFire();
            this.showToast(this.tr('hud.noAmmo'));
          }
          break;
        case SIM_EVENTS.damageDealt:
          this.onDamage(event, localId);
          break;
        case SIM_EVENTS.playerEliminated:
          this.onEliminated(event, localId);
          break;
        case SIM_EVENTS.reloadStarted:
          if (own) this.audio.reloadStart();
          break;
        case SIM_EVENTS.reloadFinished:
          if (own) this.audio.reloadFinish();
          break;
        case SIM_EVENTS.slotSelected:
          if (own) this.audio.switchItem();
          break;
        case SIM_EVENTS.itemPickedUp: {
          if (!own) break;
          const kind = str(data, 'kind');
          const defId = str(data, 'defId');
          this.audio.pickup(kind === 'weapon' || kind === 'ammo' ? kind : 'consumable');
          renderer?.pickupSparkle(c.x, c.y, c.z);
          const count = num(data, 'count');
          this.showToast(this.tr('hud.picked', { item: this.itemName(kind, defId), n: kind === 'weapon' ? '' : `× ${count}` }).trim());
          break;
        }
        case SIM_EVENTS.itemUseStarted:
          if (own) this.audio.useStart();
          break;
        case SIM_EVENTS.itemUsed:
          if (own) {
            this.audio.useFinish(data?.['restores'] === 'shield');
            renderer?.healSparkle(c.x, c.y, c.z);
          }
          break;
        case SIM_EVENTS.itemUseRejected:
          if (own) this.showToast(this.tr('hud.alreadyFull'));
          break;
      }
    }
    // Anything above may have changed what the combat HUD shows: refresh it right away.
    if (events.length > 0 && sim.rules.combat) appStore.set({ combat: this.buildCombatHud() });
  }

  private onShotFired(event: MatchEvent, own: boolean): void {
    const renderer = this.renderer;
    const data = event.data;
    if (!data) return;
    const ox = num(data, 'ox');
    const oy = num(data, 'oy');
    const oz = num(data, 'oz');
    const def = getWeaponDef(str(data, 'weaponId'));
    const sound: GunSound = def ? def.category : 'pistol';
    if (own) {
      this.audio.gunshot(sound);
      // Recoil is computed by the simulation; the client only applies it to the view.
      const scale = activeSettings().accessibility.reducedMotion ? 0.5 : 1;
      this.input.addLook(num(data, 'kickYaw') * scale, num(data, 'kickPitch') * scale);
    } else {
      this.audio.gunshot(sound, ox, oy, oz);
    }
    if (!renderer) return;

    // Streaks start at the weapon the shooter is seen holding, and end where the simulation says.
    const muzzle = this.muzzle;
    if (!renderer.muzzleOf(own ? null : event.playerId, muzzle)) {
      muzzle.x = ox;
      muzzle.y = oy;
      muzzle.z = oz;
    }
    renderer.muzzleFlash(muzzle.x, muzzle.y, muzzle.z, own);
    const ends = data['ends'];
    const kinds = data['kinds'];
    const materials = data['materials'];
    if (!Array.isArray(ends) || !Array.isArray(kinds)) return;
    for (let p = 0; p < kinds.length; p++) {
      const ex = ends[p * 3] as number;
      const ey = ends[p * 3 + 1] as number;
      const ez = ends[p * 3 + 2] as number;
      renderer.tracer(muzzle.x, muzzle.y, muzzle.z, ex, ey, ez, own);
      if (kinds[p] === SHOT_END.world && Array.isArray(materials)) renderer.impact(ex, ey, ez, materials[p] as SurfaceMaterial);
    }
  }

  private onDamage(event: MatchEvent, localId: string): void {
    const data = event.data;
    if (!data) return;
    const targetId = str(data, 'targetId');
    const shieldDamage = num(data, 'shieldDamage');
    const healthDamage = num(data, 'healthDamage');
    const shieldOnly = shieldDamage > 0 && healthDamage === 0;
    const x = num(data, 'x');
    const y = num(data, 'y');
    const z = num(data, 'z');
    const weapon = data['cause'] === 'weapon';
    if (weapon) this.renderer?.runnerHit(x, y, z, shieldOnly);

    if (event.playerId === localId && targetId !== localId) {
      // The simulation confirmed the hit: only now does the crosshair show it.
      const headshot = data['headshot'] === true;
      const kind = data['eliminated'] === true ? 'kill' : headshot ? 'head' : shieldOnly ? 'shield' : 'body';
      this.audio.hitMarker(headshot, shieldOnly);
      const patch: { hitMarker: { id: number; kind: typeof kind }; damageNumbers?: DamageNumber[] } = { hitMarker: { id: ++this.effectId, kind } };
      const point = this.renderer?.project(x, y + 0.25, z, this.screenPoint);
      if (point && point.visible) {
        const id = ++this.effectId;
        this.numberExpiry.set(id, this.time + DAMAGE_NUMBER_SECONDS);
        const entry: DamageNumber = { id, x: point.x, y: point.y, amount: num(data, 'amount'), kind: headshot ? 'head' : shieldOnly ? 'shield' : 'body' };
        patch.damageNumbers = [...appStore.get().damageNumbers.slice(-7), entry];
      }
      appStore.set(patch);
    }
    if (targetId === localId) {
      this.audio.hurt(shieldOnly);
      if (data['shieldBroken'] === true) this.audio.shieldBreak();
      if (weapon) this.arcs.push({ id: ++this.effectId, x: num(data, 'fromX'), z: num(data, 'fromZ'), expires: this.time + DAMAGE_ARC_SECONDS });
      appStore.set((s) => ({ hurtPulse: s.hurtPulse + 1, damageArcs: this.currentArcs() }));
    }
  }

  private onEliminated(event: MatchEvent, localId: string): void {
    const sim = this.sim;
    const data = event.data;
    if (!sim || !data) return;
    const victim = sim.getPlayer(event.playerId);
    if (!victim) return;
    const byId = data['byId'];
    const killer = typeof byId === 'string' ? sim.getPlayer(byId) : undefined;
    const x = num(data, 'x');
    const y = num(data, 'y');
    const z = num(data, 'z');
    this.renderer?.eliminationBurst(x, y, z);

    const track = this.remotes.get(victim.id);
    if (track) track.eliminatedAt = this.time;

    // Target dummies are not news; everything else goes to the feed.
    if (victim.contender) {
      const id = ++this.effectId;
      this.feedExpiry.set(id, this.time + FEED_SECONDS);
      const entry: FeedEntry = {
        id,
        killer: killer ? killer.name : null,
        killerBot: killer ? killer.isBot : false,
        victim: victim.name,
        victimBot: victim.isBot,
        weaponId: typeof data['weaponId'] === 'string' ? data['weaponId'] : null,
        cause: str(data, 'cause'),
        headshot: data['headshot'] === true,
        own: victim.id === localId ? 'victim' : killer && killer.id === localId ? 'killer' : null,
      };
      appStore.set((s) => ({ feed: [...s.feed.slice(-(FEED_MAX - 1)), entry] }));
    }

    if (victim.id === localId) {
      this.localEliminatedAt = this.time;
      this.audio.setSlide(0);
      const text = killer ? this.tr('banner.eliminatedBy', { name: killer.name }) : this.tr('banner.eliminated');
      this.showBanner('eliminated', text);
      // In a match with a winner the player is out for good: show the results after a moment.
      if (sim.rules.win !== 'none' && sim.rules.respawn === 'none') this.finishAt = this.time + RESULTS_DELAY_DEFEAT;
    } else if (killer && killer.id === localId) {
      this.audio.eliminationConfirm();
      this.showBanner('elimination', this.tr(victim.contender ? 'banner.elimination' : 'banner.targetDown', { name: victim.name }));
    } else {
      this.audio.remoteElimination(x, y, z);
    }
  }

  private onShowdownPing(data: Record<string, unknown> | undefined, localId: string): void {
    const positions = data?.['positions'];
    if (!Array.isArray(positions)) return;
    this.pings = [];
    for (const entry of positions as Array<{ id: string; x: number; z: number }>) {
      if (entry.id !== localId) this.pings.push({ x: entry.x, z: entry.z });
    }
    if (this.pings.length === 0 || this.player?.combat.aliveState !== 'alive') return;
    this.pingsUntil = this.time + PING_SECONDS;
    this.audio.showdownPing();
    this.showToast(this.tr('hud.showdown'));
  }

  /** The simulation says the course is done: record it, persist it, show the results. */
  private finishCourse(ticks: number): void {
    const state = appStore.get();
    const sim = this.sim;
    const course = this.player?.course;
    if (!sim) return;
    let isNewBest = false;
    let previousBestTicks: number | null = null;
    let save = state.save;
    let storageBlocked = state.storageBlocked;
    try {
      const record = recordCourseResult(state.save.profile, sim.map.id, ticks);
      save = { ...state.save, profile: record.profile };
      storageBlocked = !storeSave(save);
      isNewBest = record.isNewBest;
      previousBestTicks = record.previousBestTicks;
    } catch (error) {
      console.error('[E_COURSE_RESULT]', error);
    }
    this.audio.courseComplete();
    appStore.set({ save, storageBlocked, result: { kind: 'course', ticks, splits: course ? [...course.splits] : [], isNewBest, previousBestTicks } });
    this.pause('results');
  }

  /**
   * The player's skirmish is over (won, or eliminated): build the summary from the simulation's
   * own records, save the statistics once, and show the results.
   */
  private finishSkirmish(): void {
    const sim = this.sim;
    const player = this.player;
    this.finishAt = -1;
    if (!sim || !player || this.resultRecorded) return;
    this.resultRecorded = true;
    const combat = player.combat;
    const totals = combat.totals;
    const won = sim.result !== null && sim.result.winnerIds.includes(player.id);
    const contenders = sim.roster.filter((p) => p.contender);
    const placement = won ? 1 : (combat.placement ?? Math.max(1, sim.aliveContenders()));

    // Standings: those still fighting first (no position yet), then the fallen in order.
    const standings: PlacementRow[] = contenders
      .map((p) => ({
        name: p.name,
        isBot: p.isBot,
        placement: p.id === player.id ? placement : (p.combat.placement ?? 0),
        eliminations: p.combat.totals.eliminations,
        local: p.id === player.id,
      }))
      .sort((a, b) => (a.placement === 0 ? -1 : a.placement) - (b.placement === 0 ? -1 : b.placement) || a.name.localeCompare(b.name));

    const state = appStore.get();
    let save: SaveFile = state.save;
    let storageBlocked = state.storageBlocked;
    let isBestPlacement = false;
    try {
      const record = recordSkirmishResult(state.save.profile, { placement, eliminations: totals.eliminations });
      save = { ...state.save, profile: record.profile };
      storageBlocked = !storeSave(save);
      isBestPlacement = record.isBestPlacement;
    } catch (error) {
      console.error('[E_SKIRMISH_RESULT]', error);
    }

    const endTick = combat.eliminatedAtTick ?? sim.result?.endedAtTick ?? sim.tick;
    const eliminatedBy = combat.eliminatedBy !== null ? (sim.getPlayer(combat.eliminatedBy)?.name ?? null) : null;
    const result: SkirmishResult = {
      kind: 'skirmish',
      won,
      placement,
      total: contenders.length,
      eliminations: totals.eliminations,
      damageDealt: Math.round(totals.damageDealt),
      accuracy: totals.shotsFired > 0 ? totals.shotsHit / totals.shotsFired : 0,
      headshots: totals.headshots,
      activeTicks: Math.max(0, endTick - sim.activeSinceTick),
      eliminatedBy,
      isBestPlacement,
      standings,
    };
    if (won) this.audio.victory();
    else this.audio.defeat();
    appStore.set({ save, storageBlocked, result, banner: null });
    this.pause('results');
  }

  private footsteps(player: SimPlayer): void {
    const c = player.char;
    if (player.combat.aliveState !== 'alive') return;
    if (c.moveState === 'slide') {
      this.audio.setSlide(1);
      return;
    }
    this.audio.setSlide(0);
    if (!c.grounded || c.moveState === 'idle' || c.moveState === 'mantle') {
      this.nextFootstepAt = c.strideMeters + 0.4;
      return;
    }
    if (c.strideMeters < this.nextFootstepAt) return;
    const sprinting = c.moveState === 'sprint';
    this.nextFootstepAt = c.strideMeters + (sprinting ? 1.25 : c.moveState === 'crouch' ? 0.62 : 0.78);
    const material: SurfaceMaterial = c.groundMaterial;
    this.audio.footstep(material, c.moveState === 'crouch' ? 0.35 : sprinting ? 1 : 0.7);
    if (sprinting && (material === 'dirt' || material === 'sand' || material === 'grass')) this.renderer?.footDust(c.x, c.y, c.z);
  }

  /** Other runners can be heard coming: their steps are placed in the world. */
  private remoteFootsteps(sim: Simulation): void {
    for (const other of sim.roster) {
      const track = this.remotes.get(other.id);
      if (!track || other.combat.aliveState !== 'alive') continue;
      const c = other.char;
      if (!c.grounded || c.moveState === 'idle' || c.moveState === 'crouch') {
        track.nextFootstepAt = c.strideMeters + REMOTE_FOOTSTEP_STRIDE * 0.5;
        continue;
      }
      if (c.strideMeters < track.nextFootstepAt) continue;
      track.nextFootstepAt = c.strideMeters + REMOTE_FOOTSTEP_STRIDE;
      this.audio.remoteFootstep(c.x, c.y, c.z, c.moveState === 'sprint' ? 1 : 0.6);
    }
  }

  /* ---- composing what the renderer should draw --------------------------------------------- */

  /** Copies what the simulation knows about a participant into an animation pose. */
  private fillPose(pose: AvatarPose, p: SimPlayer, pitch: number, frozen: boolean): void {
    const sim = this.sim!;
    const c = p.char;
    const combat = p.combat;
    // Velocity in the character's own frame, for strafing / back-pedalling animation.
    const sin = Math.sin(c.yaw);
    const cos = Math.cos(c.yaw);
    pose.moveState = c.moveState;
    pose.grounded = c.grounded;
    pose.speed = frozen ? 0 : Math.hypot(c.vx, c.vz);
    pose.forwardSpeed = -c.vx * sin - c.vz * cos;
    pose.rightSpeed = c.vx * cos - c.vz * sin;
    pose.verticalSpeed = c.vy;
    pose.pitch = pitch;
    pose.mantleProgress = c.mantle ? c.mantle.ticks / c.mantle.total : -1;
    pose.strideMeters = c.strideMeters;

    const item = sim.rules.combat ? activeItem(combat.inventory) : null;
    pose.heldKind = item ? item.kind : null;
    pose.heldId = item ? (item.kind === 'weapon' ? item.weaponId : item.itemId) : null;
    pose.aim = combat.adsBlend;
    pose.shotAge = Math.min(99, (sim.tick - combat.lastShotTick) / TICK_RATE);
    pose.reload = combat.reload ? progress(sim.tick, combat.reload.startTick, combat.reload.finishTick) : -1;
    pose.use = combat.use ? progress(sim.tick, combat.use.startTick, combat.use.finishTick) : -1;
  }

  private composeMatchView(frameSeconds: number, settings: GameSettings): void {
    const sim = this.sim!;
    const player = this.player!;
    const c = player.char;
    const combat = player.combat;
    const reducedMotion = settings.accessibility.reducedMotion;
    const blend = (current: number, target: number, rate: number): number => current + (target - current) * (1 - Math.exp(-rate * frameSeconds));

    const a = this.paused ? 1 : this.alpha;
    const x = this.prevX + (c.x - this.prevX) * a;
    const y = this.prevY + (c.y - this.prevY) * a;
    const z = this.prevZ + (c.z - this.prevZ) * a;

    // Steps are instant in the simulation; visually the body and camera glide over them.
    if (c.grounded && Math.abs(y - this.smoothY) < 0.7) this.smoothY = blend(this.smoothY, y, 22);
    else this.smoothY = y;
    this.smoothEye = blend(this.smoothEye, eyeHeight(c, sim.movement), 14);

    const yaw = this.input.yaw;
    const pitch = this.input.pitch;
    const aim = combat.adsBlend;
    computeCameraRig(sim.world, x, this.smoothY, z, this.smoothEye, yaw, pitch, DEFAULT_CAMERA, aim, this.rig);
    // Pull in instantly when blocked, ease back out when the view clears.
    if (this.rig.distance < this.cameraDistance) this.cameraDistance = this.rig.distance;
    else this.cameraDistance = Math.min(this.rig.distance, this.cameraDistance + 7 * frameSeconds);
    let camX = this.rig.pivotX - this.rig.fx * this.cameraDistance;
    let camY = this.rig.pivotY - this.rig.fy * this.cameraDistance;
    let camZ = this.rig.pivotZ - this.rig.fz * this.cameraDistance;
    const floor = sim.world.terrainHeight(camX, camZ) + 0.12;
    if (camY < floor) camY = floor;
    const bounds = sim.world.bounds;
    camX = Math.min(bounds.maxX, Math.max(bounds.minX, camX));
    camZ = Math.min(bounds.maxZ, Math.max(bounds.minZ, camZ));

    // Field of view: a little wider at speed, narrower while aiming (per weapon).
    const held = sim.rules.combat ? activeItem(combat.inventory) : null;
    const weapon = held && held.kind === 'weapon' ? getWeaponDef(held.weaponId) : undefined;
    const kick = reducedMotion ? 0 : c.moveState === 'slide' ? 8 : c.moveState === 'sprint' ? 5 : 0;
    const aimFov = Math.min(settings.display.fov, weapon ? weapon.adsFovDegrees : DEFAULT_CAMERA.adsFovDegrees);
    this.fov = blend(this.fov, lerp(settings.display.fov + kick, aimFov, aim), aim > 0.02 ? 16 : 7);
    const scoped = weapon !== undefined && weapon.category === 'sniper' && aim > 0.85;

    this.fillPose(this.pose, player, pitch, this.paused);
    let groundOffset = 0;
    if (!c.grounded && sim.world.groundAt(x, z, y + 0.05, 0.2, this.ground)) groundOffset = Math.max(0, y - this.ground.y);

    if (c.moveState === 'slide' && !this.paused) {
      this.slideSprayTimer -= frameSeconds;
      if (this.slideSprayTimer <= 0) {
        this.slideSprayTimer = 0.05;
        this.renderer?.slideSpray(x, y, z);
      }
    }

    const view = this.view;
    view.timeSeconds = this.time;
    view.frameSeconds = frameSeconds;
    view.reducedMotion = reducedMotion;
    view.camera.x = camX;
    view.camera.y = camY;
    view.camera.z = camZ;
    view.camera.yaw = yaw;
    view.camera.pitch = pitch;
    view.camera.fovDegrees = this.fov;
    view.player.x = x;
    view.player.y = this.smoothY;
    view.player.z = z;
    view.player.yaw = c.yaw;
    view.player.groundOffset = groundOffset;
    const localDissolve = this.localEliminatedAt >= 0 ? Math.min(1, (this.time - this.localEliminatedAt) / DISSOLVE_SECONDS) : 0;
    view.player.dissolve = localDissolve;
    // Through a scope the runner's own shoulder would fill the picture: hide it.
    view.player.visible = localDissolve < 1 && !scoped;
    view.nextAnchor = player.course ? player.course.nextIndex : -1;
    view.lobby = false;
    view.loot = sim.rules.combat ? sim.loot.values() : null;

    let count = 0;
    for (const other of sim.roster) {
      const track = this.remotes.get(other.id);
      if (!track) continue;
      const oc = other.char;
      const remote = track.view;
      remote.x = track.prevX + (oc.x - track.prevX) * a;
      remote.y = track.prevY + (oc.y - track.prevY) * a;
      remote.z = track.prevZ + (oc.z - track.prevZ) * a;
      remote.yaw = oc.yaw;
      remote.dissolve = track.eliminatedAt >= 0 ? Math.min(1, (this.time - track.eliminatedAt) / DISSOLVE_SECONDS) : 0;
      remote.visible = remote.dissolve < 1;
      this.fillPose(remote.pose, other, other.input.pitch, this.paused);
      view.others[count++] = remote;
    }
    view.otherCount = count;

    this.audio.setListener(camX, camY, camZ, yaw);
  }

  /** Lobby: the avatar idles on the central pedestal while the camera drifts in front of it. */
  private composeLobbyView(frameSeconds: number, settings: GameSettings): void {
    const reducedMotion = settings.accessibility.reducedMotion;
    const sway = reducedMotion ? 0.35 : 0.35 + Math.sin(this.time * 0.22) * 0.28;
    const radius = 4.6;
    const camX = LOBBY_STAGE.x + Math.sin(sway) * radius;
    const camZ = LOBBY_STAGE.z + Math.cos(sway) * radius;
    const camY = LOBBY_STAGE.y + 1.45;
    const lookY = LOBBY_STAGE.y + 1.05;
    // Aim a little to the left of the character so it sits right of centre, clear of the menu.
    const yaw = yawToward(camX, camZ, LOBBY_STAGE.x, LOBBY_STAGE.z) + 0.3;
    const pitch = Math.atan2(lookY - camY, radius);

    const pose = this.pose;
    pose.moveState = 'idle';
    pose.grounded = true;
    pose.speed = 0;
    pose.forwardSpeed = 0;
    pose.rightSpeed = 0;
    pose.verticalSpeed = 0;
    pose.pitch = 0;
    pose.mantleProgress = -1;
    pose.heldKind = null;
    pose.heldId = null;
    pose.aim = 0;
    pose.shotAge = 99;
    pose.reload = -1;
    pose.use = -1;

    this.fov = 50;
    const view = this.view;
    view.timeSeconds = this.time;
    view.frameSeconds = frameSeconds;
    view.reducedMotion = reducedMotion;
    view.camera.x = camX;
    view.camera.y = camY;
    view.camera.z = camZ;
    view.camera.yaw = yaw;
    view.camera.pitch = pitch;
    view.camera.fovDegrees = this.fov;
    view.player.x = LOBBY_STAGE.x;
    view.player.y = LOBBY_STAGE.y;
    view.player.z = LOBBY_STAGE.z;
    view.player.yaw = Math.PI + 0.25;
    view.player.groundOffset = 0;
    view.player.visible = true;
    view.player.dissolve = 0;
    view.otherCount = 0;
    view.loot = null;
    view.nextAnchor = -1;
    view.lobby = true;
  }

  /* ---- HUD --------------------------------------------------------------------------------- */

  private updateHud(frameSeconds: number, settings: GameSettings): void {
    this.fpsFrames++;
    this.fpsTime += frameSeconds;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.frameMs = Math.round((this.fpsTime / this.fpsFrames) * 1000 * 10) / 10;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    this.hudTimer += frameSeconds;
    if (this.hudTimer < HUD_INTERVAL) return;
    this.hudTimer = 0;

    const sim = this.sim;
    const player = this.player;
    if (!sim || !player) {
      const hud = appStore.get().hud;
      if (hud.fps !== this.fps && settings.display.showFps) appStore.set({ hud: { ...hud, fps: this.fps, frameMs: this.frameMs } });
      return;
    }
    const c = player.char;
    const course = player.course;
    const next = course ? course.checkpoints[course.nextIndex] : undefined;
    const yaw = this.input.yaw;
    let nextBearing: number | null = null;
    let nextDistance: number | null = null;
    if (next) {
      nextBearing = Math.round((-angleDelta(yaw, yawToward(c.x, c.z, next.x, next.z)) * 180) / Math.PI);
      nextDistance = Math.round(Math.hypot(next.x - c.x, next.z - c.z));
    }
    const heading = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;

    // Drop the transient items whose time is up.
    const state = appStore.get();
    const feed = state.feed.filter((entry) => (this.feedExpiry.get(entry.id) ?? 0) > this.time);
    const damageNumbers = state.damageNumbers.filter((entry) => (this.numberExpiry.get(entry.id) ?? 0) > this.time);
    for (const id of this.feedExpiry.keys()) if ((this.feedExpiry.get(id) ?? 0) <= this.time) this.feedExpiry.delete(id);
    for (const id of this.numberExpiry.keys()) if ((this.numberExpiry.get(id) ?? 0) <= this.time) this.numberExpiry.delete(id);
    const hadArcs = this.arcs.length > 0;
    this.arcs = this.arcs.filter((arc) => arc.expires > this.time);

    appStore.set({
      hud: {
        moveState: c.moveState,
        speed: Math.round(Math.hypot(c.vx, c.vz) * 10) / 10,
        heading: Math.round(heading),
        anchorsReached: course ? course.nextIndex : 0,
        anchorsTotal: course ? course.checkpoints.length : 0,
        timerTicks: course ? courseElapsedTicks(course, sim.tick) : 0,
        timerRunning: course ? course.startedAtTick !== null && course.finishedAtTick === null : false,
        nextHintKey: next ? next.hintKey : null,
        nextBearing,
        nextDistance,
        fps: this.fps,
        frameMs: this.frameMs,
      },
      ...(sim.rules.combat ? { combat: this.buildCombatHud() } : {}),
      ...(feed.length !== state.feed.length ? { feed } : {}),
      ...(damageNumbers.length !== state.damageNumbers.length ? { damageNumbers } : {}),
      ...(hadArcs || state.damageArcs.length > 0 ? { damageArcs: this.currentArcs() } : {}),
    });
  }

  private currentArcs(): DamageArc[] {
    const c = this.player?.char;
    if (!c) return [];
    const yaw = this.input.yaw;
    return this.arcs.map((arc) => ({ id: arc.id, bearing: Math.round((-angleDelta(yaw, yawToward(c.x, c.z, arc.x, arc.z)) * 180) / Math.PI) }));
  }

  /** Snapshot of everything the combat HUD shows, read from the simulation. */
  private buildCombatHud(): CombatHud {
    const sim = this.sim;
    const player = this.player;
    if (!sim || !player || !sim.rules.combat) return initialCombat();
    const combat = player.combat;
    const inventory = combat.inventory;
    const stats = combat.stats;
    const alive = combat.aliveState === 'alive';

    const slots: SlotHud[] = [];
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const item = inventory.slots[i];
      if (!item) slots.push({ kind: 'empty', id: null, count: 0 });
      else if (item.kind === 'weapon') slots.push({ kind: 'weapon', id: item.weaponId, count: item.ammoInMag });
      else slots.push({ kind: 'consumable', id: item.itemId, count: item.count });
    }

    const held = activeItem(inventory);
    const weapon = held && held.kind === 'weapon' ? getWeaponDef(held.weaponId) : undefined;
    let spread = 0;
    if (weapon) {
      const degrees = currentSpreadDegrees(sim, player, weapon);
      spread = (Math.tan((degrees * Math.PI) / 180) / Math.tan((this.fov * Math.PI) / 360)) * 50;
    }

    let pickup: PickupHud | null = null;
    let target: TargetHud | null = null;
    if (alive) {
      const candidate = findPickupCandidate(sim, player);
      if (candidate && candidate.kind !== 'ammo') {
        let swap = countFreeSlots(inventory) === 0;
        if (swap && candidate.kind === 'consumable') {
          const def = getConsumableDef(candidate.defId);
          // A stack with room left takes it without dropping anything.
          swap = !inventory.slots.some((item) => item?.kind === 'consumable' && item.itemId === candidate.defId && def !== undefined && item.count < def.maxStack);
        }
        pickup = { kind: candidate.kind, defId: candidate.defId, count: candidate.count, swap };
      }
      const trace = traceAim(sim, player, AIM_TRACE_DISTANCE, this.aimTrace);
      const aimed = trace.kind === 'player' && trace.targetId !== null ? sim.getPlayer(trace.targetId) : undefined;
      if (aimed) {
        const s = aimed.combat.stats;
        target = {
          name: aimed.name,
          isBot: aimed.isBot,
          dummy: !aimed.contender,
          distance: Math.round(trace.distance),
          showBars: !aimed.contender,
          health: Math.ceil(s.health),
          maxHealth: s.maxHealth,
          shield: Math.ceil(s.shield),
          maxShield: s.maxShield,
        };
      }
    }

    let pings: number[] = [];
    if (this.time < this.pingsUntil && alive) {
      const c = player.char;
      const yaw = this.input.yaw;
      pings = this.pings.map((ping) => Math.round((-angleDelta(yaw, yawToward(c.x, c.z, ping.x, ping.z)) * 180) / Math.PI));
    }

    return {
      enabled: true,
      alive,
      health: Math.ceil(stats.health),
      maxHealth: stats.maxHealth,
      shield: Math.ceil(stats.shield),
      maxShield: stats.maxShield,
      slots,
      active: inventory.active,
      weaponId: weapon ? weapon.id : null,
      ammoInMag: held && held.kind === 'weapon' ? held.ammoInMag : 0,
      magazine: weapon ? weapon.magazine : 0,
      reserve: weapon ? inventory.ammo[weapon.ammoType] : 0,
      reload: combat.reload ? progress(sim.tick, combat.reload.startTick, combat.reload.finishTick) : -1,
      use: combat.use ? progress(sim.tick, combat.use.startTick, combat.use.finishTick) : -1,
      useItemId: combat.use ? combat.use.itemId : null,
      spread,
      scope: weapon !== undefined && weapon.category === 'sniper' && combat.adsBlend > 0.85,
      pickup,
      target,
      aliveCount: sim.aliveContenders(),
      totalCount: sim.roster.reduce((n, p) => n + (p.contender ? 1 : 0), 0),
      eliminations: combat.totals.eliminations,
      phase: sim.phase === 'warmup' ? 'warmup' : sim.phase === 'results' ? 'results' : 'active',
      countdown: sim.phase === 'warmup' ? Math.ceil(sim.warmupTicksLeft / TICK_RATE) : 0,
      pings,
    };
  }

  private itemName(kind: string, defId: string): string {
    if (kind === 'weapon') return this.tr(`weapon.${defId}`);
    if (kind === 'ammo') return this.tr(`ammo.${defId}`);
    return this.tr(`item.${defId}`);
  }

  private showToast(text: string): void {
    appStore.set({ toast: { id: ++this.toastId, text } });
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => appStore.set({ toast: null }), 2600);
  }

  private showBanner(kind: Banner['kind'], text: string): void {
    const id = ++this.effectId;
    appStore.set({ banner: { id, kind, text } });
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      if (appStore.get().banner?.id === id) appStore.set({ banner: null });
    }, BANNER_SECONDS * 1000);
  }

  /* ---- helpers ----------------------------------------------------------------------------- */

  /** Changes the profile and persists it. */
  private updateProfile(change: (profile: SaveFile['profile']) => SaveFile['profile']): void {
    const state = appStore.get();
    const profile = change(state.save.profile);
    if (profile === state.save.profile) return;
    const save = { ...state.save, profile };
    appStore.set({ save, storageBlocked: !storeSave(save) });
  }

  private handleEscape(): void {
    const { overlay, screen } = appStore.get();
    if (overlay === 'settings') this.closeSettings(false);
    else if (screen === 'match' && overlay === 'none') this.pause();
  }

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      if (this.sim && !this.paused) this.pause();
      this.audio.suspend();
    } else {
      this.lastFrameTime = performance.now();
    }
  };

  /** After a teleport: no interpolation or smoothing across the jump. */
  private snapPresentation(): void {
    const player = this.player;
    if (!player) return;
    const c = player.char;
    this.prevX = c.x;
    this.prevY = c.y;
    this.prevZ = c.z;
    this.alpha = 1;
    this.smoothY = c.y;
    this.cameraDistance = DEFAULT_CAMERA.distance;
    this.nextFootstepAt = c.strideMeters + 0.4;
    this.input.setLook(player.spawn.yaw, -0.12);
    this.input.releaseAll();
  }

  private translator(settings: GameSettings = activeSettings()): (key: string) => string {
    return (key) => translate(settings.locale, key);
  }

  private tr(key: string, vars?: Record<string, string | number>): string {
    return translate(activeSettings().locale, key, vars);
  }

  /** Read-only state for automated browser tests and bug reports. Exposes nothing writable. */
  private exposeDebugHandle(): void {
    const handle = {
      getState: () => {
        const sim = this.sim;
        const player = this.player;
        const c = player?.char;
        const course = player?.course;
        const app = appStore.get();
        const combat = player && sim?.rules.combat ? player.combat : null;
        const held = combat ? activeItem(combat.inventory) : null;
        const trace = sim && player && combat ? traceAim(sim, player, AIM_TRACE_DISTANCE, this.aimTrace) : null;
        return {
          screen: app.screen,
          overlay: app.overlay,
          mode: app.mode,
          paused: this.paused,
          lookMode: app.lookMode,
          touch: app.touch,
          tick: sim?.tick ?? 0,
          phase: sim?.phase ?? null,
          player: c
            ? { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, vz: c.vz, yaw: c.yaw, grounded: c.grounded, moveState: c.moveState, height: c.height }
            : null,
          look: { yaw: this.input.yaw, pitch: this.input.pitch },
          camera: { ...this.view.camera },
          course: course ? { nextIndex: course.nextIndex, total: course.checkpoints.length, started: course.startedAtTick !== null, finished: course.finishedAtTick !== null } : null,
          combat: combat
            ? {
                alive: combat.aliveState === 'alive',
                health: combat.stats.health,
                shield: combat.stats.shield,
                active: combat.inventory.active,
                slots: combat.inventory.slots.map((item) => (item === null ? null : item.kind === 'weapon' ? { kind: 'weapon', id: item.weaponId, count: item.ammoInMag } : { kind: 'consumable', id: item.itemId, count: item.count })),
                ammo: { ...combat.inventory.ammo },
                weaponId: held && held.kind === 'weapon' ? held.weaponId : null,
                ammoInMag: held && held.kind === 'weapon' ? held.ammoInMag : 0,
                reloading: combat.reload !== null,
                using: combat.use !== null,
                ads: combat.adsBlend,
                totals: { ...combat.totals },
                placement: combat.placement,
              }
            : null,
          // What is under the crosshair, as the simulation would resolve a perfectly accurate shot.
          aim: trace ? { kind: trace.kind, targetId: trace.targetId, zone: trace.zone, distance: trace.distance, originX: this.rig.pivotX, originY: this.rig.pivotY, originZ: this.rig.pivotZ } : null,
          others: sim
            ? sim.roster
                .filter((p) => p !== player)
                .map((p) => ({
                  id: p.id,
                  name: p.name,
                  isBot: p.isBot,
                  contender: p.contender,
                  alive: p.combat.aliveState === 'alive',
                  x: p.char.x,
                  y: p.char.y,
                  z: p.char.z,
                  height: p.char.height,
                  health: p.combat.stats.health,
                  shield: p.combat.stats.shield,
                  state: p.brain ? p.brain.state : null,
                }))
            : [],
          loot: sim ? [...sim.loot.values()].map((item) => ({ id: item.id, kind: item.kind, defId: item.defId, count: item.count, x: item.x, y: item.y, z: item.z })) : [],
          aliveContenders: sim ? sim.aliveContenders() : 0,
          result: app.result,
          render: this.renderer ? { ...this.renderer.stats } : null,
          fps: this.fps,
          frameMs: this.frameMs,
          quality: activeSettings(app).display.qualityPreset,
          fatalError: app.fatalError,
        };
      },
    };
    (window as unknown as { __NEXUS__?: typeof handle }).__NEXUS__ = handle;
  }
}

function num(data: Record<string, unknown> | undefined, key: string): number {
  const value = data?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function str(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === 'string' ? value : '';
}

function progress(tick: number, start: number, finish: number): number {
  return finish > start ? Math.min(1, Math.max(0, (tick - start) / (finish - start))) : 1;
}

/** `?seed=123` in the page address fixes the match seeds (bug reports, automated tests). */
function readSeedFromAddress(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed');
    if (raw === null || !/^\d{1,10}$/.test(raw)) return null;
    return Number(raw) >>> 0;
  } catch {
    return null;
  }
}
