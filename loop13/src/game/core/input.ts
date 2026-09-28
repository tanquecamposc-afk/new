/**
 * Keyboard + mouse input. Continuous state (held keys, mouse delta) plus
 * edge-triggered "pressed" events consumed once per frame.
 */
const held = new Set<string>();
const pressed = new Set<string>();
let mouseDX = 0;
let mouseDY = 0;
let wheel = 0;
let mouseDown = false;
let installed = false;

type KeyListener = (code: string, e: KeyboardEvent) => void;
const keyListeners = new Set<KeyListener>();

/** Keys whose default browser behaviour we block while in-game. */
const BLOCK = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ControlLeft', 'ControlRight', 'KeyF']);

export function installInput(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (BLOCK.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    keyListeners.forEach((l) => l(e.code, e));
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      mouseDX += e.movementX;
      mouseDY += e.movementY;
    }
  });
  window.addEventListener('mousedown', (e) => { if (e.button === 0) { mouseDown = true; if (document.pointerLockElement) pressed.add('Mouse0'); } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
  window.addEventListener('wheel', (e) => { if (document.pointerLockElement) wheel += Math.sign(e.deltaY); }, { passive: true });
}

export const Input = {
  down: (code: string) => held.has(code),
  /** Edge-triggered: true once per key press (consumed). */
  consume(code: string): boolean {
    if (pressed.has(code)) { pressed.delete(code); return true; }
    return false;
  },
  peek: (code: string) => pressed.has(code),
  clearPressed: () => pressed.clear(),
  takeMouse(): [number, number] { const r: [number, number] = [mouseDX, mouseDY]; mouseDX = 0; mouseDY = 0; return r; },
  takeWheel(): number { const w = wheel; wheel = 0; return w; },
  mouseHeld: () => mouseDown,
  onKey(l: KeyListener): () => void { keyListeners.add(l); return () => keyListeners.delete(l); },
  axis(): { x: number; z: number } {
    let x = 0, z = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) z -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) z += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    return { x, z };
  },
  /** Simulated key presses for automated testing / debug. */
  simulate(code: string, down: boolean) { if (down) { held.add(code); pressed.add(code); } else held.delete(code); },
};

export function requestPointerLock(): void {
  if (typeof document === 'undefined') return;
  const canvas = document.querySelector('canvas');
  if (canvas && !document.pointerLockElement) {
    try {
      const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } catch { /* pointer lock unavailable (e.g. iframe) */ }
  }
}

export function exitPointerLock(): void {
  if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
}
