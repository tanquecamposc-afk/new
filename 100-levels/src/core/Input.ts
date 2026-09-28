/**
 * Centralised input: keyboard, mouse (pointer lock) and virtual touch controls
 * all write into the same state so gameplay code never cares about the source.
 */
export type Action =
  | 'forward' | 'back' | 'left' | 'right'
  | 'jump' | 'sprint' | 'crouch' | 'interact' | 'ability' | 'dodge'
  | 'attack' | 'heavy' | 'pause' | 'craft' | 'potion'
  | 'w1' | 'w2' | 'w3' | 'w4' | 'w5' | 'w6';

const KEYMAP: Record<string, Action> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  ControlLeft: 'crouch', ControlRight: 'crouch', KeyC: 'crouch',
  KeyE: 'interact',
  KeyQ: 'ability',
  KeyF: 'dodge', AltLeft: 'dodge',
  Escape: 'pause', KeyP: 'pause',
  Tab: 'craft', KeyB: 'craft',
  Digit1: 'w1', Digit2: 'w2', Digit3: 'w3', Digit4: 'w4', Digit5: 'w5', Digit6: 'w6',
  KeyJ: 'attack', KeyK: 'heavy',
  KeyR: 'potion',
};

class InputManager {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();
  private touchDown = new Set<Action>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  /** Analog move from touch joystick (-1..1). */
  touchMove = { x: 0, y: 0 };
  pointerLocked = false;
  enabled = true;
  private canvas: HTMLElement | null = null;
  onPause: (() => void) | null = null;

  attach(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  requestPointerLock() {
    if (!this.canvas || this.pointerLocked) return;
    try {
      const p = (this.canvas as HTMLCanvasElement).requestPointerLock?.() as unknown;
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
    } catch {
      /* pointer lock is optional */
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'AltLeft') e.preventDefault();
    if (a === 'pause' && !e.repeat) this.onPause?.();
    if (!this.down.has(a)) this.pressed.add(a);
    this.down.add(a);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    this.down.delete(a);
    this.released.add(a);
  };
  private onBlur = () => {
    this.down.clear();
    this.touchDown.clear();
  };
  private onMouseDown = (e: MouseEvent) => {
    const a: Action | null = e.button === 0 ? 'attack' : e.button === 2 ? 'heavy' : null;
    if (!a) return;
    if (!this.down.has(a)) this.pressed.add(a);
    this.down.add(a);
  };
  private onMouseUp = (e: MouseEvent) => {
    const a: Action | null = e.button === 0 ? 'attack' : e.button === 2 ? 'heavy' : null;
    if (!a) return;
    this.down.delete(a);
    this.released.add(a);
  };
  private onMouseMove = (e: MouseEvent) => {
    if (this.pointerLocked) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    } else if (e.buttons & 4) {
      // Middle-drag fallback camera when pointer lock is unavailable
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    }
  };
  private onWheel = (e: WheelEvent) => {
    this.wheel += Math.sign(e.deltaY);
  };

  /** Touch controls feed the same state. */
  setTouch(a: Action, on: boolean) {
    if (on) {
      if (!this.touchDown.has(a) && !this.down.has(a)) this.pressed.add(a);
      this.touchDown.add(a);
      if (a === 'pause') this.onPause?.();
    } else {
      this.touchDown.delete(a);
      this.released.add(a);
    }
  }
  addLook(dx: number, dy: number) {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  isDown(a: Action) {
    return this.enabled && (this.down.has(a) || this.touchDown.has(a));
  }
  wasPressed(a: Action) {
    return this.enabled && this.pressed.has(a);
  }
  wasReleased(a: Action) {
    return this.enabled && this.released.has(a);
  }
  /** Consume a press so that only one system reacts to it. */
  consume(a: Action) {
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return this.enabled && had;
  }

  /** Movement axis in local space: x = right, y = forward. */
  moveAxis(): { x: number; y: number } {
    let x = 0, y = 0;
    if (this.isDown('forward')) y += 1;
    if (this.isDown('back')) y -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('left')) x -= 1;
    if (this.enabled && (this.touchMove.x || this.touchMove.y)) {
      x += this.touchMove.x;
      y += this.touchMove.y;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  /** Called once at the end of every frame. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  /** Clears one-shot presses but keeps held keys (used by simulation). */
  endFrameKeepHeld() {
    this.pressed.clear();
    this.released.clear();
    this.mouseDX = this.mouseDY = this.wheel = 0;
  }

  /** Programmatic key state (testing / automation). */
  press(a: Action, down: boolean) {
    if (down) {
      if (!this.down.has(a)) this.pressed.add(a);
      this.down.add(a);
    } else {
      this.down.delete(a);
      this.released.add(a);
    }
  }

  reset() {
    this.down.clear();
    this.touchDown.clear();
    this.pressed.clear();
    this.released.clear();
    this.touchMove.x = this.touchMove.y = 0;
    this.endFrame();
  }
}

export const Input = new InputManager();
