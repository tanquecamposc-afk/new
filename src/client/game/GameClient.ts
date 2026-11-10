/**
 * Glue between the pure simulation (src/core) and the browser: runs the fixed-step loop, feeds
 * player intent in, and hands the results to the renderer, the audio engine and the HUD store.
 *
 * In this local build the client also hosts the simulation ("embedded server"): the same
 * Simulation class is meant to run on a real server once multiplayer exists.
 */
import { buildTrainingGrounds } from '../../core/maps/trainingGrounds.js';
import { recordCourseResult, formatTicks } from '../../core/meta/save.js';
import { defaultSettings, sanitizeSettings, type GameSettings } from '../../core/meta/settings.js';
import { computeCameraRig, makeCameraRig } from '../../core/sim/cameraRig.js';
import { eyeHeight } from '../../core/sim/character.js';
import { FixedStepper } from '../../core/sim/clock.js';
import { DEFAULT_CAMERA, DT, TICK_RATE } from '../../core/sim/config.js';
import { courseElapsedTicks } from '../../core/sim/course.js';
import { neutralInput, type InputFrame } from '../../core/sim/input.js';
import type { MapDefinition } from '../../core/sim/map.js';
import { angleDelta, yawToward } from '../../core/sim/math.js';
import { SIM_EVENTS, Simulation, type SimPlayer } from '../../core/sim/simulation.js';
import { makeGroundInfo, type SurfaceMaterial } from '../../core/sim/world.js';
import type { MatchEvent } from '../../core/types.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { activeSettings, appStore, initialHud, type Overlay } from '../app/appState.js';
import { translate } from '../app/i18n.js';
import { storeSave } from '../app/persistence.js';
import { InputManager } from '../input/InputManager.js';
import type { AvatarPose } from '../render/avatar.js';
import { SceneRenderer, WebGLUnavailableError, type FrameView } from '../render/SceneRenderer.js';

const LOCAL_PLAYER = 'local';
const HUD_INTERVAL = 0.1;
/** Where the avatar stands in the lobby: on top of the central pedestal. */
const LOBBY_STAGE = { x: 0, y: 2.4, z: 0 };

export class GameClient {
  readonly audio = new AudioEngine();

  private renderer: SceneRenderer | null = null;
  private readonly input: InputManager;
  private readonly map: MapDefinition = buildTrainingGrounds();
  private sim: Simulation | null = null;
  private player: SimPlayer | null = null;
  private readonly stepper = new FixedStepper(DT);
  private readonly inputFrame: InputFrame = neutralInput();
  private readonly provideInput = (): InputFrame => this.inputFrame;
  private seq = 0;
  private matchCounter = 0;
  private paused = true;

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

  private readonly pose: AvatarPose = {
    moveState: 'idle',
    grounded: true,
    speed: 0,
    forwardSpeed: 0,
    rightSpeed: 0,
    verticalSpeed: 0,
    pitch: 0,
    mantleProgress: -1,
    strideMeters: 0,
  };
  private readonly view: FrameView = {
    timeSeconds: 0,
    frameSeconds: 0,
    camera: { x: 0, y: 5, z: 10, yaw: 0, pitch: 0, fovDegrees: 75 },
    player: { x: 0, y: 0, z: 0, yaw: 0, pose: this.pose, groundOffset: 0, visible: true },
    nextAnchor: -1,
    reducedMotion: false,
    lobby: true,
  };

  constructor(private readonly host: HTMLElement) {
    const settings = activeSettings();
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
      this.renderer.loadMap(this.map, this.translator());
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

  /* ---- match flow -------------------------------------------------------------------------- */

  /** Lobby -> training match. The clock and the controls start on the first click. */
  startTraining(): void {
    if (!this.renderer) return;
    this.audio.unlock();
    this.audio.uiClick();
    this.sim = new Simulation({ matchId: `local-${++this.matchCounter}`, map: this.map });
    this.player = this.sim.addPlayer({ id: LOCAL_PLAYER, name: appStore.get().save.profile.alias });
    this.sim.drainEvents();
    this.stepper.reset();
    this.seq = 0;
    this.snapPresentation();
    this.paused = true;
    this.input.gameplayEnabled = false;
    const best = appStore.get().save.profile.bestCourseTicks[this.map.id];
    appStore.set({
      screen: 'match',
      overlay: 'clickToPlay',
      result: null,
      hud: { ...initialHud(), anchorsTotal: this.map.checkpoints.length, nextHintKey: this.map.checkpoints[0]?.hintKey ?? null },
      showHelp: best === undefined,
    });
    this.audio.setAmbience(1);
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

  /** Back to the start line with a fresh clock. */
  restartCourse(): void {
    if (!this.sim || !this.player) return;
    if (!this.sim.restartCourse(LOCAL_PLAYER)) return;
    this.sim.drainEvents();
    this.snapPresentation();
    appStore.set({
      result: null,
      hud: { ...initialHud(), anchorsTotal: this.map.checkpoints.length, nextHintKey: this.map.checkpoints[0]?.hintKey ?? null },
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
    appStore.set({ screen: 'lobby', overlay: 'none', result: null, draftSettings: null });
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

    if (this.sim && this.player && !this.paused) this.simulate(frameSeconds);
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
      this.input.sample(++this.seq, this.inputFrame);
      sim.step(this.provideInput);
      this.handleEvents(sim.drainEvents());
      this.footsteps(player);
      if (this.paused) break; // an event (course finished) paused the match
    }
    this.alpha = plan.alpha;
  }

  private handleEvents(events: MatchEvent[]): void {
    const renderer = this.renderer;
    const player = this.player;
    if (!player) return;
    const c = player.char;
    for (const event of events) {
      switch (event.type) {
        case SIM_EVENTS.playerJumped:
          this.audio.jump();
          break;
        case SIM_EVENTS.playerLanded: {
          const fall = (event.data?.['fallHeight'] as number | undefined) ?? 0;
          if (fall > 0.25) {
            this.audio.land(fall);
            renderer?.landingPuff(c.x, c.y, c.z, fall / 3);
          }
          break;
        }
        case SIM_EVENTS.slideStarted:
          this.audio.slideStart();
          break;
        case SIM_EVENTS.mantleStarted:
          this.audio.mantle();
          break;
        case SIM_EVENTS.checkpointReached: {
          const index = (event.data?.['index'] as number | undefined) ?? 0;
          const total = (event.data?.['total'] as number | undefined) ?? 0;
          const split = (event.data?.['splitTicks'] as number | undefined) ?? 0;
          const cp = this.map.checkpoints[index];
          if (cp) renderer?.anchorBurst(cp.x, cp.y, cp.z);
          this.audio.checkpoint(index);
          this.showToast(this.tr('hud.checkpoint', { n: index + 1, total, time: formatTicks(split, TICK_RATE) }));
          break;
        }
        case SIM_EVENTS.courseCompleted:
          this.finishCourse((event.data?.['ticks'] as number | undefined) ?? 0);
          break;
        case SIM_EVENTS.playerRespawned:
        case SIM_EVENTS.courseRestarted:
          this.snapPresentation();
          break;
        case SIM_EVENTS.simulationError:
          console.error('[E_SIMULATION]', event.data);
          this.showToast(this.tr('error.generic', { code: String(event.data?.['code'] ?? 'E_SIMULATION') }));
          break;
      }
    }
  }

  /** The simulation says the course is done: record it, persist it, show the results. */
  private finishCourse(ticks: number): void {
    const state = appStore.get();
    const course = this.player?.course;
    let result = { ticks, splits: course ? [...course.splits] : [], isNewBest: false, previousBestTicks: null as number | null };
    let save = state.save;
    let storageBlocked = state.storageBlocked;
    try {
      const record = recordCourseResult(state.save.profile, this.map.id, ticks);
      save = { ...state.save, profile: record.profile };
      storageBlocked = !storeSave(save);
      result = { ...result, isNewBest: record.isNewBest, previousBestTicks: record.previousBestTicks };
    } catch (error) {
      console.error('[E_COURSE_RESULT]', error);
    }
    this.audio.courseComplete();
    appStore.set({ save, storageBlocked, result });
    this.pause('results');
  }

  private footsteps(player: SimPlayer): void {
    const c = player.char;
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

  /* ---- composing what the renderer should draw --------------------------------------------- */

  private composeMatchView(frameSeconds: number, settings: GameSettings): void {
    const sim = this.sim!;
    const player = this.player!;
    const c = player.char;
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
    computeCameraRig(sim.world, x, this.smoothY, z, this.smoothEye, yaw, pitch, DEFAULT_CAMERA, 0, this.rig);
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

    const speed = Math.hypot(c.vx, c.vz);
    const kick = reducedMotion ? 0 : c.moveState === 'slide' ? 8 : c.moveState === 'sprint' ? 5 : 0;
    this.fov = blend(this.fov, settings.display.fov + kick, 7);

    // Velocity in the character's own frame, for strafing / back-pedalling animation.
    const sin = Math.sin(c.yaw);
    const cos = Math.cos(c.yaw);
    const pose = this.pose;
    pose.moveState = c.moveState;
    pose.grounded = c.grounded;
    pose.speed = this.paused ? 0 : speed;
    pose.forwardSpeed = -c.vx * sin - c.vz * cos;
    pose.rightSpeed = c.vx * cos - c.vz * sin;
    pose.verticalSpeed = c.vy;
    pose.pitch = pitch;
    pose.mantleProgress = c.mantle ? c.mantle.ticks / c.mantle.total : -1;
    pose.strideMeters = c.strideMeters;

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
    view.player.visible = true;
    view.nextAnchor = player.course ? player.course.nextIndex : -1;
    view.lobby = false;
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
    });
  }

  private showToast(text: string): void {
    appStore.set({ toast: { id: ++this.toastId, text } });
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => appStore.set({ toast: null }), 2600);
  }

  /* ---- helpers ----------------------------------------------------------------------------- */

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
        const c = this.player?.char;
        const course = this.player?.course;
        const app = appStore.get();
        return {
          screen: app.screen,
          overlay: app.overlay,
          paused: this.paused,
          lookMode: app.lookMode,
          tick: this.sim?.tick ?? 0,
          player: c
            ? { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, vz: c.vz, yaw: c.yaw, grounded: c.grounded, moveState: c.moveState, height: c.height }
            : null,
          look: { yaw: this.input.yaw, pitch: this.input.pitch },
          camera: { ...this.view.camera },
          course: course ? { nextIndex: course.nextIndex, total: course.checkpoints.length, started: course.startedAtTick !== null, finished: course.finishedAtTick !== null } : null,
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
