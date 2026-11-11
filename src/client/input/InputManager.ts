/**
 * Translates physical devices (keyboard, mouse, touch) into intent. Gameplay code never sees a
 * key code: it receives an `InputFrame` built from remappable action bindings.
 *
 * Camera look has several paths so the game stays playable everywhere:
 *   1. pointer lock (normal desktop play),
 *   2. click-and-drag when the browser refuses pointer lock (embedded previews, some frames),
 *   3. arrow keys (keyboard-only play and automated tests),
 *   4. touch: left side of the screen is a movement stick, the rest drags the camera.
 */
import { DEFAULT_CAMERA } from '../../core/sim/config.js';
import type { InputFrame } from '../../core/sim/input.js';
import { clamp, wrapAngle } from '../../core/sim/math.js';
import type { Bindings, GameSettings, InputAction } from '../../core/meta/settings.js';

const RADIANS_PER_PIXEL = 0.0022;
const KEY_LOOK_YAW_SPEED = 2.4;
const KEY_LOOK_PITCH_SPEED = 1.5;
const MAX_MOUSE_DELTA = 240;
/**
 * Browsers often report one huge movement right after the pointer is captured. It is filtered
 * two ways, because a busy page can deliver it late: everything in the first LOCK_SETTLE_MS is
 * dropped, and so are the first LOCK_SKIP_EVENTS movements within LOCK_SKIP_WINDOW_MS.
 */
const LOCK_SETTLE_MS = 150;
const LOCK_SKIP_EVENTS = 2;
const LOCK_SKIP_WINDOW_MS = 1500;
/** Dragging covers less distance than a captured mouse, so it turns faster. */
const DRAG_LOOK_GAIN = 1.6;
const TOUCH_LOOK_GAIN = 2.6;
/** Touch stick: travel in CSS pixels for full deflection, and the share of the screen it owns. */
const STICK_RADIUS = 56;
const STICK_ZONE = 0.45;
/** Pushing the stick (nearly) all the way forward sprints. */
const STICK_SPRINT_THRESHOLD = 0.92;

/** Actions that fire once per press and are handled by the app, not the simulation. */
const EDGE_ACTIONS: readonly InputAction[] = ['pause', 'restart', 'help'];

export type LookMode = 'locked' | 'drag';

export interface InputCallbacks {
  onAction(action: InputAction): void;
  /** Esc reached the page (it does not while the pointer is locked: the browser eats it). */
  onEscape(): void;
  /** Pointer lock was lost (Esc, alt-tab...) while it was active. */
  onPointerUnlock(): void;
  onLookModeChange(mode: LookMode): void;
  /** A touch screen is being used: the app shows on-screen controls. */
  onTouchDetected(): void;
}

export class InputManager {
  yaw = 0;
  pitch = 0;
  /** When false no gameplay intent is produced (menus, pause). */
  gameplayEnabled = false;
  lookMode: LookMode = 'locked';
  touchMode = false;

  private element: HTMLElement | null = null;
  private readonly down = new Set<string>();
  /** Actions held through on-screen buttons. */
  private readonly virtual = new Set<InputAction>();
  private bindings: Bindings;
  private sensitivity: number;
  private invertY: boolean;
  private toggleCrouch: boolean;
  private crouchLatched = false;
  private wasLocked = false;
  private lockedAt = 0;
  private lockMovesToSkip = 0;

  private lookPointerId: number | null = null;
  private lookIsTouch = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private stickPointerId: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickX = 0;
  private stickZ = 0;
  private stickBase: HTMLElement | null = null;
  private stickKnob: HTMLElement | null = null;

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
    const listen = (target: Document | HTMLElement | Window, type: string, handler: (event: never) => void): void => {
      target.addEventListener(type, handler as EventListener);
      this.disposers.push(() => target.removeEventListener(type, handler as EventListener));
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
    listen(window, 'pointerup', (event: PointerEvent) => this.onPointerEnd(event));
    listen(window, 'pointercancel', (event: PointerEvent) => this.onPointerEnd(event));
    listen(element, 'contextmenu', (event: Event) => event.preventDefault());

    // On-screen stick, positioned wherever the left thumb lands.
    const base = document.createElement('div');
    base.className = 'touch-stick';
    base.hidden = true;
    const knob = document.createElement('div');
    knob.className = 'touch-stick-knob';
    base.appendChild(knob);
    element.appendChild(base);
    this.stickBase = base;
    this.stickKnob = knob;
    this.disposers.push(() => base.remove());

    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) this.enableTouchMode();
  }

  detach(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    this.element = null;
    this.stickBase = null;
    this.stickKnob = null;
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
    if (this.touchMode || !element || typeof element.requestPointerLock !== 'function') {
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

  /** Presses or releases an action from an on-screen button. */
  setVirtualButton(action: InputAction, pressed: boolean): void {
    if (pressed) {
      if (EDGE_ACTIONS.includes(action)) {
        this.callbacks.onAction(action);
        return;
      }
      this.virtual.add(action);
    } else {
      this.virtual.delete(action);
    }
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
    const keyZ = (this.isActive('moveForward') ? 1 : 0) - (this.isActive('moveBack') ? 1 : 0);
    const keyX = (this.isActive('moveRight') ? 1 : 0) - (this.isActive('moveLeft') ? 1 : 0);
    out.moveZ = clamp(keyZ + this.stickZ, -1, 1);
    out.moveX = clamp(keyX + this.stickX, -1, 1);
    out.jump = this.isActive('jump');
    const stickSprint = this.stickZ > 0.3 && Math.hypot(this.stickX, this.stickZ) >= STICK_SPRINT_THRESHOLD;
    out.sprint = this.isActive('sprint') || stickSprint;
    out.crouch = this.toggleCrouch ? this.crouchLatched : this.isActive('crouch');
    return out;
  }

  /** Drops every held key, button and pointer (window lost focus, pause...). */
  releaseAll(): void {
    this.down.clear();
    this.virtual.clear();
    this.crouchLatched = false;
    this.lookPointerId = null;
    this.endStick();
  }

  /* ---------------------------------------------------------------------------------------- */

  private isActive(action: InputAction): boolean {
    if (this.virtual.has(action)) return true;
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

  private enableTouchMode(): void {
    if (this.touchMode) return;
    this.touchMode = true;
    this.setLookMode('drag');
    this.callbacks.onTouchDetected();
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
    const sinceLock = performance.now() - this.lockedAt;
    if (sinceLock < LOCK_SETTLE_MS) return;
    if (this.lockMovesToSkip > 0 && sinceLock < LOCK_SKIP_WINDOW_MS) {
      this.lockMovesToSkip--;
      return;
    }
    this.applyLookDelta(event.movementX, event.movementY);
  }

  private onPointerDown(event: PointerEvent): void {
    const touch = event.pointerType === 'touch';
    if (touch) this.enableTouchMode();
    if (!this.gameplayEnabled || this.pointerLocked) return;

    if (touch && this.stickPointerId === null && event.clientX < window.innerWidth * STICK_ZONE) {
      this.stickPointerId = event.pointerId;
      this.stickOriginX = event.clientX;
      this.stickOriginY = event.clientY;
      this.stickX = 0;
      this.stickZ = 0;
      this.showStick(0, 0);
      return;
    }
    if (this.lookPointerId === null) {
      this.lookPointerId = event.pointerId;
      this.lookIsTouch = touch;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.gameplayEnabled) return;
    if (event.pointerId === this.stickPointerId) {
      let dx = event.clientX - this.stickOriginX;
      let dy = event.clientY - this.stickOriginY;
      const length = Math.hypot(dx, dy);
      if (length > STICK_RADIUS) {
        dx = (dx / length) * STICK_RADIUS;
        dy = (dy / length) * STICK_RADIUS;
      }
      this.stickX = dx / STICK_RADIUS;
      this.stickZ = -dy / STICK_RADIUS;
      this.showStick(dx, dy);
      return;
    }
    if (event.pointerId !== this.lookPointerId || this.pointerLocked) return;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    const gain = this.lookIsTouch ? TOUCH_LOOK_GAIN : DRAG_LOOK_GAIN;
    this.applyLookDelta(dx * gain, dy * gain);
  }

  private onPointerEnd(event: PointerEvent): void {
    if (event.pointerId === this.stickPointerId) this.endStick();
    if (event.pointerId === this.lookPointerId) this.lookPointerId = null;
  }

  private showStick(dx: number, dy: number): void {
    const base = this.stickBase;
    const knob = this.stickKnob;
    if (!base || !knob) return;
    base.hidden = false;
    base.style.left = `${this.stickOriginX}px`;
    base.style.top = `${this.stickOriginY}px`;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private endStick(): void {
    this.stickPointerId = null;
    this.stickX = 0;
    this.stickZ = 0;
    if (this.stickBase) this.stickBase.hidden = true;
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
      this.lockedAt = performance.now();
      this.lockMovesToSkip = LOCK_SKIP_EVENTS;
      this.setLookMode('locked');
    } else if (this.wasLocked) {
      this.wasLocked = false;
      this.releaseAll();
      this.callbacks.onPointerUnlock();
    }
  }
}
