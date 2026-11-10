/**
 * Translates physical devices (keyboard, mouse, pointer) into intent. Gameplay code never sees a
 * key code: it receives an `InputFrame` built from remappable action bindings.
 *
 * Camera look has three paths so the game stays playable everywhere:
 *   1. pointer lock (normal desktop play),
 *   2. click-and-drag when the browser refuses pointer lock (embedded previews, some frames),
 *   3. arrow keys (keyboard-only play and automated tests).
 */
import { DEFAULT_CAMERA } from '../../core/sim/config.js';
import type { InputFrame } from '../../core/sim/input.js';
import { clamp, wrapAngle } from '../../core/sim/math.js';
import type { Bindings, GameSettings, InputAction } from '../../core/meta/settings.js';

const RADIANS_PER_PIXEL = 0.0022;
const KEY_LOOK_YAW_SPEED = 2.4;
const KEY_LOOK_PITCH_SPEED = 1.5;
const MAX_MOUSE_DELTA = 240;
/** Browsers often report one huge movement right after the pointer is captured: skip that window. */
const LOCK_SETTLE_MS = 150;

/** Actions that fire once per key press and are handled by the app, not the simulation. */
const EDGE_ACTIONS: readonly InputAction[] = ['pause', 'restart', 'help'];

export type LookMode = 'locked' | 'drag';

export interface InputCallbacks {
  onAction(action: InputAction): void;
  /** Esc reached the page (it does not while the pointer is locked: the browser eats it). */
  onEscape(): void;
  /** Pointer lock was lost (Esc, alt-tab...) while it was active. */
  onPointerUnlock(): void;
  onLookModeChange(mode: LookMode): void;
}

export class InputManager {
  yaw = 0;
  pitch = 0;
  /** When false no gameplay intent is produced (menus, pause). */
  gameplayEnabled = false;
  lookMode: LookMode = 'locked';

  private element: HTMLElement | null = null;
  private readonly down = new Set<string>();
  private bindings: Bindings;
  private sensitivity: number;
  private invertY: boolean;
  private toggleCrouch: boolean;
  private crouchLatched = false;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private wasLocked = false;
  private ignoreMouseUntil = 0;
  private readonly disposers: Array<() => void> = [];

  constructor(
    settings: GameSettings,
    private readonly callbacks: InputCallbacks,
  ) {
    this.bindings = settings.controls.bindings;
    this.sensitivity = settings.controls.mouseSensitivity;
    this.invertY = settings.controls.invertY;
    this.toggleCrouch = settings.controls.toggleCrouch;
  }

  applySettings(settings: GameSettings): void {
    this.bindings = settings.controls.bindings;
    this.sensitivity = settings.controls.mouseSensitivity;
    this.invertY = settings.controls.invertY;
    if (this.toggleCrouch !== settings.controls.toggleCrouch) this.crouchLatched = false;
    this.toggleCrouch = settings.controls.toggleCrouch;
  }

  /** Starts listening. `element` is the surface that captures the pointer (the canvas host). */
  attach(element: HTMLElement): void {
    this.detach();
    this.element = element;
    const listen = <K extends keyof DocumentEventMap>(
      target: Document | HTMLElement | Window,
      type: K | string,
      handler: (event: never) => void,
      options?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type, handler as EventListener, options);
      this.disposers.push(() => target.removeEventListener(type, handler as EventListener, options));
    };

    listen(window, 'keydown', (event: KeyboardEvent) => this.onKeyDown(event));
    listen(window, 'keyup', (event: KeyboardEvent) => this.onKeyUp(event));
    listen(window, 'blur', () => this.releaseAll());
    listen(document, 'visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    listen(document, 'mousemove', (event: MouseEvent) => this.onMouseMove(event));
    listen(document, 'pointerlockchange', () => this.onPointerLockChange());
    listen(document, 'pointerlockerror', () => this.setLookMode('drag'));
    listen(element, 'pointerdown', (event: PointerEvent) => this.onPointerDown(event));
    listen(window, 'pointermove', (event: PointerEvent) => this.onPointerMove(event));
    listen(window, 'pointerup', () => {
      this.dragging = false;
    });
    listen(element, 'contextmenu', (event: Event) => event.preventDefault());
  }

  detach(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    this.element = null;
    this.releaseAll();
  }

  get pointerLocked(): boolean {
    return this.element !== null && document.pointerLockElement === this.element;
  }

  /**
   * Asks the browser to capture the mouse. Must be called from a user gesture. Resolves to the
   * look mode that will be used (falls back to drag when capture is not available).
   */
  async requestPointerLock(): Promise<LookMode> {
    const element = this.element;
    if (!element || typeof element.requestPointerLock !== 'function') {
      this.setLookMode('drag');
      return this.lookMode;
    }
    try {
      // Returns a promise in current browsers and undefined in older ones.
      await (element.requestPointerLock() as unknown as Promise<void> | undefined);
      if (document.pointerLockElement === element) this.setLookMode('locked');
    } catch {
      this.setLookMode('drag');
    }
    return this.lookMode;
  }

  releasePointerLock(): void {
    this.wasLocked = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setLook(yaw: number, pitch: number): void {
    this.yaw = wrapAngle(yaw);
    this.pitch = clamp(pitch, DEFAULT_CAMERA.minPitch, DEFAULT_CAMERA.maxPitch);
  }

  /** Keyboard look; call once per rendered frame. */
  update(frameSeconds: number): void {
    if (!this.gameplayEnabled) return;
    const yawInput = (this.down.has('ArrowLeft') ? 1 : 0) - (this.down.has('ArrowRight') ? 1 : 0);
    const pitchInput = (this.down.has('ArrowUp') ? 1 : 0) - (this.down.has('ArrowDown') ? 1 : 0);
    if (yawInput !== 0 || pitchInput !== 0) {
      this.setLook(this.yaw + yawInput * KEY_LOOK_YAW_SPEED * frameSeconds, this.pitch + pitchInput * KEY_LOOK_PITCH_SPEED * frameSeconds);
    }
  }

  /** Fills `out` with the intent for the next simulation tick. */
  sample(seq: number, out: InputFrame): InputFrame {
    out.seq = seq;
    out.yaw = this.yaw;
    out.pitch = this.pitch;
    if (!this.gameplayEnabled) {
      out.moveX = 0;
      out.moveZ = 0;
      out.jump = false;
      out.sprint = false;
      out.crouch = false;
      return out;
    }
    out.moveZ = (this.isActive('moveForward') ? 1 : 0) - (this.isActive('moveBack') ? 1 : 0);
    out.moveX = (this.isActive('moveRight') ? 1 : 0) - (this.isActive('moveLeft') ? 1 : 0);
    out.jump = this.isActive('jump');
    out.sprint = this.isActive('sprint');
    out.crouch = this.toggleCrouch ? this.crouchLatched : this.isActive('crouch');
    return out;
  }

  /** Drops every held key (window lost focus, pause...). */
  releaseAll(): void {
    this.down.clear();
    this.dragging = false;
    this.crouchLatched = false;
  }

  /* ---------------------------------------------------------------------------------------- */

  private isActive(action: InputAction): boolean {
    const codes = this.bindings[action];
    for (let i = 0; i < codes.length; i++) if (this.down.has(codes[i]!)) return true;
    return false;
  }

  private actionsFor(code: string): InputAction[] {
    const actions: InputAction[] = [];
    for (const action of Object.keys(this.bindings) as InputAction[]) {
      if (this.bindings[action].includes(code)) actions.push(action);
    }
    return actions;
  }

  private setLookMode(mode: LookMode): void {
    if (this.lookMode === mode) return;
    this.lookMode = mode;
    this.callbacks.onLookModeChange(mode);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
    const actions = this.actionsFor(event.code);
    const isLookKey = event.code.startsWith('Arrow');

    // Keep the page from scrolling or navigating while playing.
    if (this.gameplayEnabled && !typing && (actions.length > 0 || isLookKey)) event.preventDefault();
    if (event.repeat) return;

    for (const action of actions) {
      if (EDGE_ACTIONS.includes(action) && !typing) this.callbacks.onAction(action);
    }
    if (event.code === 'Escape') this.callbacks.onEscape();
    if (typing) return;

    if (this.toggleCrouch && this.gameplayEnabled && actions.includes('crouch')) this.crouchLatched = !this.crouchLatched;
    this.down.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.down.delete(event.code);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.gameplayEnabled || !this.pointerLocked) return;
    if (performance.now() < this.ignoreMouseUntil) return;
    this.applyLookDelta(event.movementX, event.movementY);
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.gameplayEnabled || this.pointerLocked) return;
    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.gameplayEnabled || this.pointerLocked) return;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    // Dragging covers less distance than a locked mouse, so it turns a little faster.
    this.applyLookDelta(dx * 1.6, dy * 1.6);
  }

  private applyLookDelta(dx: number, dy: number): void {
    const x = clamp(dx, -MAX_MOUSE_DELTA, MAX_MOUSE_DELTA);
    const y = clamp(dy, -MAX_MOUSE_DELTA, MAX_MOUSE_DELTA);
    const scale = RADIANS_PER_PIXEL * this.sensitivity;
    this.setLook(this.yaw - x * scale, this.pitch + (this.invertY ? y : -y) * scale);
  }

  private onPointerLockChange(): void {
    const locked = this.pointerLocked;
    if (locked) {
      this.wasLocked = true;
      this.ignoreMouseUntil = performance.now() + LOCK_SETTLE_MS;
      this.setLookMode('locked');
    } else if (this.wasLocked) {
      this.wasLocked = false;
      this.releaseAll();
      this.callbacks.onPointerUnlock();
    }
  }
}
